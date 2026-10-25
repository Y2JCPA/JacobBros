#!/usr/bin/env node
/*
 * Draws each brother's pixel sprites from his `look` in data/brothers.js:
 *
 *   assets/bros/<id>.png        front-facing portrait (menus, cards)
 *   assets/bros/<id>-side.png   side-view game frames, facing right:
 *                               stand | walk 1-4 | jump
 *   data/sprites.js             sizes of every sprite, read by the site
 *
 *   node tools/make-bros.js                 all brothers
 *   node tools/make-bros.js levi            just one
 *   node tools/make-bros.js --preview f.png also save a big preview sheet
 *
 * No dependencies. Each bro is built from rounded shapes (head, cap, belly,
 * limbs) that are shaded with a light from the top left, SNES style: four
 * tones per material, soft shadows where parts overlap, and colored outlines.
 * A brother who draws his own sprites sets `look.handDrawn: true` and this
 * tool leaves his PNGs alone.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const FW = 32;          // frame width
const CH = 56;          // working canvas height (cropped afterwards)
const SIDE_FRAMES = ["stand", "walk1", "walk2", "walk3", "walk4", "jump"];

// ===================== color =====================

function hex(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c || "");
  if (!m) throw new Error("bad color " + c);
  let h = m[1];
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb([h, s, l]) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v + m)) * 255));
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// Shift hue toward a target by up to `amt` degrees
function towards(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180;
  return h + Math.max(-amt, Math.min(amt, d));
}
// Four tones (highlight, base, shade, deep) plus an outline color.
// Highlights lean warm, shadows lean cool, as in SNES-era sprites.
function ramp(base) {
  const [h, s, l] = rgb2hsl(hex(base));
  const grey = s < 0.08;
  if (!grey && (h < 55 || h > 330)) {
    return [
      hsl2rgb([h + 4, clamp01(s * 0.9), clamp01(l + (1 - l) * 0.38)]),
      hex(base),
      hsl2rgb([h - 7, clamp01(s * 1.05), clamp01(l * 0.8)]),
      hsl2rgb([h - 12, clamp01(s * 1.05), clamp01(l * 0.62)]),
      hsl2rgb([h - 16, clamp01(s * 0.75), clamp01(l * 0.3)]),
    ];
  }
  return [
    hsl2rgb([grey ? h : towards(h, 50, 14), clamp01(s * 0.95), clamp01(l + (1 - l) * 0.34)]),
    hex(base),
    hsl2rgb([grey ? h : towards(h, 250, 10), clamp01(s * 1.05 + 0.03), clamp01(l * 0.74)]),
    hsl2rgb([grey ? h : towards(h, 260, 18), clamp01(s * 1.1 + 0.05), clamp01(l * 0.5)]),
    hsl2rgb([grey ? h : towards(h, 270, 24), clamp01(s * 0.9 + 0.1), clamp01(l * 0.26 + 0.04)]),
  ];
}

// ===================== raster canvas =====================

function Canvas(w, h) {
  const n = w * h;
  return {
    w, h,
    mat: new Array(n).fill(null),   // material name or null
    tone: new Int8Array(n),         // 0..3
    z: new Int16Array(n),           // draw order of the part that owns the pixel
    flat: new Array(n).fill(null),  // fixed RGB for stamped details
    part: 0,
  };
}
const LIGHT = (() => { const v = [-0.45, -0.6, 0.66]; const m = Math.hypot(...v); return v.map((x) => x / m); })();

// Normal → tone: 0 highlight, 1 base, 2 shade, 3 deep
function toneFor(nx, ny, nz, bias) {
  const d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + (bias || 0);
  return d > 0.86 ? 0 : d > 0.12 ? 1 : d > -0.32 ? 2 : 3;
}

function put(cv, x, y, mat, tone, flat) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = y * cv.w + x;
  cv.mat[i] = mat; cv.tone[i] = tone; cv.z[i] = cv.part; cv.flat[i] = flat || null;
}

// Filled ellipse with a dome normal
function ellipse(cv, cx, cy, rx, ry, mat, o) {
  o = o || {};
  cv.part++;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const px = x + 0.5, py = y + 0.5;
      const dx = (px - cx) / rx, dy = (py - cy) / ry;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      if (o.clip && !o.clip(px, py)) continue;
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      put(cv, x, y, mat, o.tone != null ? o.tone : toneFor(dx, dy, nz, o.bias));
    }
  }
}

// Capsule (thick line with round ends) with a cylinder normal
function capsule(cv, x1, y1, x2, y2, r, mat, o) {
  o = o || {};
  cv.part++;
  const minx = Math.floor(Math.min(x1, x2) - r - 1), maxx = Math.ceil(Math.max(x1, x2) + r + 1);
  const miny = Math.floor(Math.min(y1, y2) - r - 1), maxy = Math.ceil(Math.max(y1, y2) + r + 1);
  const vx = x2 - x1, vy = y2 - y1, len2 = vx * vx + vy * vy || 1e-6;
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len2));
      const qx = x1 + vx * t, qy = y1 + vy * t;
      const dx = (px - qx) / r, dy = (py - qy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      if (o.clip && !o.clip(px, py)) continue;
      put(cv, x, y, mat, o.tone != null ? o.tone : toneFor(dx, dy, Math.sqrt(1 - d2), o.bias));
    }
  }
}

// Rounded box, shaded like a cylinder across its width (a torso, a bib)
function box(cv, x0, y0, x1, y1, rad, mat, o) {
  o = o || {};
  cv.part++;
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5;
      if (px < x0 || px > x1 || py < y0 || py > y1) continue;
      // round the corners
      const ix = Math.max(x0 + rad - px, 0, px - (x1 - rad)), iy = Math.max(y0 + rad - py, 0, py - (y1 - rad));
      if (rad > 0 && ix * ix + iy * iy > rad * rad) continue;
      if (o.clip && !o.clip(px, py)) continue;
      const nx = (px - cx) / (hw + 0.5);
      const ny = py < y0 + 1.5 ? -0.6 : py > y1 - 1.5 ? 0.5 : 0;
      put(cv, x, y, mat, o.tone != null ? o.tone : toneFor(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx)), o.bias));
    }
  }
}

// Small hand-drawn details (eyes, mouths, letters): rows of characters
function stamp(cv, rows, x0, y0, colors) {
  cv.part++;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = colors[row[x]];
      if (!c) continue;
      if (c.mat) put(cv, x0 + x, y0 + y, c.mat, c.tone || 1);
      else put(cv, x0 + x, y0 + y, "flat", 1, c);
    }
  });
}

// ===================== the bro =====================

// Body builds. All sizes in pixels.
const BUILDS = {
  short:    { torso: 9,  legs: 7,  girth: 13, shoulder: 15, belly: 0,   arm: 1.7, leg: 2.1, head: 1 },
  muscular: { torso: 9,  legs: 7,  girth: 14, shoulder: 19, belly: 0,   arm: 2.4, leg: 2.4, head: 1, muscles: true },
  wide:     { torso: 9,  legs: 6,  girth: 17, shoulder: 18, belly: 2.2, arm: 2.1, leg: 2.5, head: 1.05 },
  slim:     { torso: 12, legs: 13, girth: 9,  shoulder: 12, belly: 0,   arm: 1.3, leg: 1.6, head: 0.95 },
  rounded:  { torso: 13, legs: 14, girth: 14, shoulder: 15, belly: 1.6, arm: 1.9, leg: 2.2, head: 1 },
};
// Older names still work
BUILDS.tall = BUILDS.slim;
BUILDS.lanky = BUILDS.rounded;

const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
};

function materials(look) {
  const c = look.colors;
  return {
    skin: ramp(c.skin),
    hair: ramp(c.hair),
    beard: ramp(c.beard || c.hair),
    cap: ramp(c.cap),
    shirt: ramp(c.shirt),
    overalls: ramp(c.overalls),
    shoes: ramp(c.shoes),
    nose: ramp(c.nose || c.skin),
    hat: ramp(c.hat || c.cap),
    white: ramp("#f2f2f6"),
    button: ramp(c.buttons || "#f8d030"),
    glasses: ramp(c.glasses || "#4a5266"),
  };
}

const EYE = { w: [255, 255, 255], d: [28, 30, 64], g: [205, 230, 255] };

// Shared geometry for both views: where the head, torso and hips go
function frameOf(look) {
  const b = BUILDS[look.body] || BUILDS.short;
  const headR = 7.2 * b.head;
  const feet = CH - 2;                   // bottom row of the shoes
  const legTop = feet - 2 - b.legs;      // hips
  const torsoTop = legTop - b.torso;     // shoulders
  const headCy = torsoTop - headR + 1.5; // head overlaps the collar a little
  return { b, headR, feet, legTop, torsoTop, headCy };
}

// ---------- head (front) ----------
function headFront(cv, look, cx, f) {
  const r = f.headR, cy = f.headCy;
  const facial = look.facial || "mustache";
  // ears and the hair behind them
  ellipse(cv, cx, cy - 0.5, r + 1.1, r * 0.92, "hair", { clip: (x, y) => y < cy + 3.5 });
  ellipse(cv, cx - r - 0.2, cy + 1, 1.6, 2.1, "skin");
  ellipse(cv, cx + r + 0.2, cy + 1, 1.6, 2.1, "skin");
  // face
  ellipse(cv, cx, cy + 0.5, r, r * 0.95, "skin");
  if (look.chin === "big") ellipse(cv, cx, cy + 5.2, r * 0.72, 3.2, "skin");
  // beard covers the jaw
  if (facial === "beard" || facial === "full") {
    const long = facial === "full" ? 2.5 : 0;
    ellipse(cv, cx, cy + 3.6 + long / 2, r + 0.4, 4.6 + long, "beard", { clip: (x, y) => y > cy + 1.2 });
    capsule(cv, cx - r + 0.2, cy - 0.5, cx - r + 0.6, cy + 3, 1.2, "beard");
    capsule(cv, cx + r - 0.2, cy - 0.5, cx + r - 0.6, cy + 3, 1.2, "beard");
  }
  // eyes and brows
  const ex = Math.round(2.6 * f.b.head);
  const eyeRows = [".w.", "wdw", "wdw", ".w."];
  stamp(cv, eyeRows, Math.round(cx - ex - 1.5), Math.round(cy - 1.6), EYE);
  stamp(cv, eyeRows, Math.round(cx + ex - 1.5), Math.round(cy - 1.6), EYE);
  stamp(cv, ["hhh"], Math.round(cx - ex - 1.5), Math.round(cy - 3), { h: { mat: "hair", tone: 2 } });
  stamp(cv, ["hhh"], Math.round(cx + ex - 1.5), Math.round(cy - 3), { h: { mat: "hair", tone: 2 } });
  if (look.glasses) {
    stamp(cv, ["ggggg.ggggg", "g...g.g...g", "g...ggg...g", "g...g.g...g", "ggggg.ggggg"],
      Math.round(cx - 5.5), Math.round(cy - 2.5), { g: { mat: "glasses", tone: 1 } });
  }
  // nose
  ellipse(cv, cx, cy + 2.6, 2.3, 1.9, "nose", { bias: 0.1 });
  // mouth
  const my = Math.round(cy + 5.2);
  if (facial === "zigzag") {
    stamp(cv, ["dwwwwwd", ".ddddd."], Math.round(cx - 3.5), my, { d: [120, 30, 40], w: [250, 250, 245] });
  } else if (facial === "clean") {
    stamp(cv, ["d...d", ".ddd."], Math.round(cx - 2.5), my - 1, { d: [140, 50, 50] });
  } else {
    stamp(cv, ["ddd"], Math.round(cx - 1.5), my, { d: [130, 40, 45] });
  }
  // mustaches
  if (facial === "mustache" || facial === "beard" || facial === "full") {
    ellipse(cv, cx - 2.3, cy + 4.1, 3.1, 1.4, "beard");
    ellipse(cv, cx + 2.3, cy + 4.1, 3.1, 1.4, "beard");
  } else if (facial === "zigzag") {
    ellipse(cv, cx, cy + 4.0, 5.2, 1.4, "beard");
    stamp(cv, ["m.m.m...m.m.m"], Math.round(cx - 6.5), Math.round(cy + 5.1), { m: { mat: "beard", tone: 2 } });
  } else if (facial === "pointy") {
    capsule(cv, cx - 4.5, cy + 3.3, cx + 4.5, cy + 3.3, 0.9, "beard");
    capsule(cv, cx - 4.5, cy + 3.3, cx - 6.4, cy + 1.6, 0.7, "beard");
    capsule(cv, cx + 4.5, cy + 3.3, cx + 6.4, cy + 1.6, 0.7, "beard");
  }
  // headwear
  hatFront(cv, look, cx, cy, r);
  // peyos
  if (look.peyos) {
    capsule(cv, cx - r - 0.4, cy + 1, cx - r - 0.9, cy + 6, 0.9, "hair");
    capsule(cv, cx + r + 0.4, cy + 1, cx + r + 0.9, cy + 6, 0.9, "hair");
  }
}

function hatFront(cv, look, cx, cy, r) {
  const hat = look.hat || "cap";
  if (hat === "cap") {
    ellipse(cv, cx, cy - 5, r + 1.1, r * 0.92, "cap", { clip: (x, y) => y < cy - 4 });
    ellipse(cv, cx, cy - 4.6, r + 1.7, 1.4, "cap", { bias: -0.35 });
    // badge with the letter
    ellipse(cv, cx, cy - 8.4, 3.4, 3.4, "white", { bias: 0.25 });
    const bits = FONT[String(look.letter || "").toUpperCase()];
    if (bits) {
      const rows = [0, 1, 2, 3, 4].map((i) => bits.slice(i * 3, i * 3 + 3).replace(/1/g, "L").replace(/0/g, "."));
      stamp(cv, rows, Math.round(cx - 1.5), Math.round(cy - 10.9), { L: hex(look.colors.letter || look.colors.cap) });
    }
  } else if (hat === "kippah") {
    ellipse(cv, cx, cy - 3, r + 0.6, r * 0.7, "hair", { clip: (x, y) => y < cy - 1.5 });
    ellipse(cv, cx, cy - r + 0.6, 4, 2.2, "hat", { clip: (x, y) => y < cy - r + 1.4 });
  } else if (hat === "fedora") {
    box(cv, cx - r + 0.5, cy - r - 4, cx + r - 0.5, cy - 2.5, 2, "hat");
    box(cv, cx - r + 0.5, cy - 4.5, cx + r - 0.5, cy - 2.8, 0, "hat", { tone: 3 });
    ellipse(cv, cx, cy - 2.4, r + 3.2, 1.5, "hat", { bias: -0.3 });
  }
}

// ---------- body (front) ----------
function bodyFront(cv, look, cx, f) {
  const b = f.b;
  const top = f.torsoTop, hip = f.legTop, feet = f.feet;
  const half = b.girth / 2, sh = b.shoulder / 2;
  // legs and shoes
  [-1, 1].forEach((s) => {
    const lx = cx + s * (half * 0.42 + 0.3);
    capsule(cv, lx, hip - 1, lx + s * 0.3, feet - 2.2, b.leg, "overalls");
    ellipse(cv, lx + s * 1.3, feet - 0.9, b.leg + 1.6, 1.8, "shoes");
  });
  // arms hang behind the hands
  [-1, 1].forEach((s) => {
    const ax = cx + s * (sh - b.arm * 0.6);
    const handY = hip + 1.5;
    if (b.muscles) {
      ellipse(cv, ax + s * 0.6, top + 3.6, b.arm + 0.9, 3.4, "skin");
      capsule(cv, ax + s * 0.6, top + 5, ax + s * 0.9, handY - 1, b.arm - 0.2, "skin");
      capsule(cv, ax, top + 1.2, ax + s * 0.3, top + 2.4, b.arm + 0.6, "shirt");
    } else {
      capsule(cv, ax, top + 1.5, ax + s * 0.8, handY - 1.5, b.arm, "shirt");
    }
    ellipse(cv, ax + s * 0.9, handY, b.arm + 0.5, b.arm + 0.4, "skin");
  });
  // shirt
  box(cv, cx - half, top, cx + half, hip + 1, 3, "shirt");
  box(cv, cx - sh + 1, top, cx + sh - 1, top + 3.5, 2.5, "shirt");
  // overalls: bib, belly, straps, buttons
  box(cv, cx - half + 1.3, hip - 3.5, cx + half - 1.3, hip + 2.5, 2, "overalls");
  if (b.belly) ellipse(cv, cx, hip - 2.6, half - 0.8, 3 + b.belly, "overalls", { bias: 0.05 });
  box(cv, cx - half * 0.55, top + 3.4, cx + half * 0.55, hip - 1, 1.5, "overalls");
  [-1, 1].forEach((s) => {
    capsule(cv, cx + s * half * 0.45, top + 4, cx + s * (sh - 2.6), top + 0.4, 0.8, "overalls");
    ellipse(cv, cx + s * half * 0.42, top + 4.3, 1, 1, "button", { bias: 0.3 });
  });
  // tzitzit hanging out at the hips
  [-1, 1].forEach((s) => {
    const tx = cx + s * (half - 2.3);
    capsule(cv, tx, hip + 0.5, tx, hip + 4.5, 0.45, "white");
    capsule(cv, tx + s * 1.1, hip + 1, tx + s * 1.1, hip + 5, 0.45, "white", { bias: -0.3 });
  });
}

function front(look) {
  const cv = Canvas(FW, CH);
  const f = frameOf(look);
  const cx = FW / 2;
  bodyFront(cv, look, cx, f);
  headFront(cv, look, cx, f);
  return cv;
}

// ---------- side view (facing right) ----------
function pose(name) {
  // thigh/shin angles in degrees (+ = forward), arm angles, body lift
  const P = {
    stand: { near: [4, 0], far: [-4, 0], armN: 6, armF: -6, lift: 0 },
    walk1: { near: [28, 8], far: [-24, -4], armN: -26, armF: 24, lift: 0 },
    walk2: { near: [6, -18], far: [-6, 20], armN: -6, armF: 6, lift: 1 },
    walk3: { near: [-24, -4], far: [28, 8], armN: 24, armF: -26, lift: 0 },
    walk4: { near: [-6, 20], far: [6, -18], armN: 6, armF: -6, lift: 1 },
    jump:  { near: [62, -30], far: [-18, -6], armN: 118, armF: -40, lift: 0 },
  };
  return P[name];
}

function leg(cv, hx, hy, len, ang, r, mat, shoeMat, o) {
  const a1 = (ang[0] * Math.PI) / 180, a2 = ((ang[0] + ang[1]) * Math.PI) / 180;
  const l1 = len * 0.52, l2 = len * 0.48;
  const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
  const ax = kx + Math.sin(a2) * l2, ay = ky + Math.cos(a2) * l2;
  capsule(cv, hx, hy, kx, ky, r, mat, o);
  capsule(cv, kx, ky, ax, ay, r * 0.92, mat, o);
  ellipse(cv, ax + 1.6, ay + 0.6, r + 1.7, 1.8, shoeMat, o);
  return ay + 2.4;
}

function side(look, frameName) {
  const cv = Canvas(FW, CH + 8);
  const f = frameOf(look);
  const b = f.b, p = pose(frameName);
  const cx = 14;
  const lift = p.lift;
  const hip = f.legTop - lift, top = f.torsoTop - lift, hcy = f.headCy - lift;
  const depth = b.girth * 0.38 + 2;
  const legLen = b.legs + 2.2;
  const far = { bias: -0.45 };

  // far arm and far leg, behind the body
  arm(cv, cx - 0.5, top + 1.6, hip, b, p.armF, far);
  leg(cv, cx - 0.6, hip, legLen, p.far, b.leg, "overalls", "shoes", far);
  if (frameName !== "jump") {
    capsule(cv, cx - depth + 0.4, hip + 0.5, cx - depth + 0.4, hip + 4.5, 0.45, "white", { bias: -0.2 });
  }
  // torso
  box(cv, cx - depth, top, cx + depth, hip + 1, 3, "shirt");
  box(cv, cx - depth + 0.6, hip - 3.2, cx + depth, hip + 2.5, 2, "overalls");
  if (b.belly) ellipse(cv, cx + depth * 0.45, hip - 2.4, depth * 0.85, 3 + b.belly, "overalls", { bias: 0.05 });
  box(cv, cx + depth * 0.05, top + 3.4, cx + depth - 0.2, hip - 1, 1.2, "overalls");
  capsule(cv, cx + depth * 0.4, top + 4, cx - depth * 0.3, top + 0.3, 0.8, "overalls");
  ellipse(cv, cx + depth * 0.45, top + 4.3, 1, 1, "button", { bias: 0.3 });
  // near leg
  leg(cv, cx + 0.4, hip, legLen, p.near, b.leg, "overalls", "shoes");
  // tzitzit at the back hip
  capsule(cv, cx - depth - 0.3, hip + 0.8, cx - depth - 0.6 - lift * 0.3, hip + 5, 0.45, "white");
  // head
  headSide(cv, look, cx + 1, hcy, f);
  // near arm on top
  arm(cv, cx + 0.5, top + 1.8, hip, b, p.armN);

  // put the feet on the ground: shift so the lowest pixel sits at CH-2
  let low = 0;
  for (let i = 0; i < cv.mat.length; i++) if (cv.mat[i]) low = Math.max(low, Math.floor(i / cv.w));
  const shift = frameName === "jump" ? f.feet - 1 - low + 0 : f.feet - low;
  return shiftCanvas(cv, shift, CH);
}

function arm(cv, sx, sy, hip, b, angDeg, o) {
  const a = (angDeg * Math.PI) / 180;
  const len = Math.max(6, hip - sy + 0.5);
  const ex = sx + Math.sin(a) * len, ey = sy + Math.cos(a) * len;
  if (b.muscles) {
    ellipse(cv, sx + Math.sin(a) * 2.6, sy + Math.cos(a) * 2.6, b.arm + 0.8, 3, "skin", o);
    capsule(cv, sx, sy, sx + Math.sin(a) * 1.2, sy + Math.cos(a) * 1.2, b.arm + 0.6, "shirt", o);
    capsule(cv, sx + Math.sin(a) * 4, sy + Math.cos(a) * 4, ex, ey, b.arm - 0.2, "skin", o);
  } else {
    capsule(cv, sx, sy, ex, ey, b.arm, "shirt", o);
  }
  ellipse(cv, ex + Math.sin(a) * 0.6, ey + Math.cos(a) * 0.6, b.arm + 0.5, b.arm + 0.4, "skin", o);
}

function headSide(cv, look, cx, cy, f) {
  const r = f.headR;
  const facial = look.facial || "mustache";
  // hair at the back, then the face
  ellipse(cv, cx - 1.6, cy - 0.3, r * 0.92, r * 0.9, "hair", { clip: (x, y) => y < cy + 4 && x < cx + 1 });
  ellipse(cv, cx + 0.4, cy + 0.6, r * 0.92, r * 0.92, "skin");
  if (look.chin === "big") ellipse(cv, cx + 2.5, cy + 5.3, 4, 3, "skin");
  if (facial === "beard" || facial === "full") {
    const long = facial === "full" ? 2.5 : 0;
    ellipse(cv, cx + 1, cy + 3.8 + long / 2, r * 0.9, 4.4 + long, "beard", { clip: (x, y) => y > cy + 1.6 && x > cx - 4.5 });
    capsule(cv, cx - 2.6, cy - 0.5, cx - 2.6, cy + 3.4, 1.2, "beard");
  }
  ellipse(cv, cx - 2.2, cy + 1.2, 1.7, 2.2, "skin");                 // ear
  stamp(cv, ["hh.", ".w.", "wd.", "wd.", ".w."], Math.round(cx + 2.5), Math.round(cy - 3), Object.assign({ h: { mat: "hair", tone: 2 } }, EYE));
  if (look.glasses) stamp(cv, ["gggg", "g..g", "g..g", "gggg"], Math.round(cx + 2), Math.round(cy - 2.4), { g: { mat: "glasses", tone: 1 } });
  ellipse(cv, cx + r - 0.2, cy + 2.4, 2.5, 2, "nose", { bias: 0.1 });  // nose
  const my = Math.round(cy + 5.1);
  if (facial === "zigzag") stamp(cv, ["dwwd", ".dd."], Math.round(cx + 2.5), my, { d: [120, 30, 40], w: [250, 250, 245] });
  else stamp(cv, ["dd"], Math.round(cx + 3.5), my, { d: [130, 40, 45] });
  if (facial === "mustache" || facial === "beard" || facial === "full") ellipse(cv, cx + r - 1.4, cy + 4, 3.2, 1.4, "beard");
  else if (facial === "zigzag") {
    ellipse(cv, cx + r - 1.2, cy + 4, 3.6, 1.4, "beard");
    stamp(cv, ["m.m.m"], Math.round(cx + r - 4), Math.round(cy + 5), { m: { mat: "beard", tone: 2 } });
  } else if (facial === "pointy") {
    capsule(cv, cx + 2.5, cy + 3.6, cx + r + 1.5, cy + 3.6, 0.85, "beard");
    capsule(cv, cx + r + 1.5, cy + 3.6, cx + r + 3, cy + 1.8, 0.7, "beard");
  }
  if (look.peyos) capsule(cv, cx - 1.2, cy + 2, cx - 1.6, cy + 6.5, 0.9, "hair");
  // headwear
  const hat = look.hat || "cap";
  if (hat === "cap") {
    ellipse(cv, cx - 0.4, cy - 4.6, r + 0.9, r * 0.9, "cap", { clip: (x, y) => y < cy - 3.6 });
    capsule(cv, cx + 1, cy - 4, cx + r + 4, cy - 3.8, 1.2, "cap", { bias: -0.35 });
    ellipse(cv, cx + 2.6, cy - 8, 3, 3.4, "white", { bias: 0.25 });
    const bits = FONT[String(look.letter || "").toUpperCase()];
    if (bits) {
      const rows = [0, 1, 2, 3, 4].map((i) => bits.slice(i * 3, i * 3 + 3).replace(/1/g, "L").replace(/0/g, "."));
      stamp(cv, rows, Math.round(cx + 1.1), Math.round(cy - 10.2), { L: hex(look.colors.letter || look.colors.cap) });
    }
  } else if (hat === "kippah") {
    ellipse(cv, cx - 0.6, cy - 3, r * 0.95, r * 0.7, "hair", { clip: (x, y) => y < cy - 1.5 });
    ellipse(cv, cx - 1, cy - r + 0.6, 3.6, 2, "hat", { clip: (x, y) => y < cy - r + 1.4 });
  } else if (hat === "fedora") {
    box(cv, cx - r + 0.5, cy - r - 4, cx + r - 1, cy - 2.5, 2, "hat");
    box(cv, cx - r + 0.5, cy - 4.5, cx + r - 1, cy - 2.8, 0, "hat", { tone: 3 });
    capsule(cv, cx - r - 1.5, cy - 2.4, cx + r + 2.5, cy - 2.4, 1, "hat", { bias: -0.3 });
  }
}

function shiftCanvas(cv, dy, h) {
  const out = Canvas(cv.w, h);
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const ny = y + dy;
    if (ny < 0 || ny >= h) continue;
    const i = y * cv.w + x, j = ny * cv.w + x;
    out.mat[j] = cv.mat[i]; out.tone[j] = cv.tone[i]; out.z[j] = cv.z[i]; out.flat[j] = cv.flat[i];
  }
  return out;
}

// ===================== shading + outline → RGBA =====================

function paint(cv, mats) {
  const { w, h } = cv;
  const px = new Uint8Array(w * h * 4);
  const tone = Int8Array.from(cv.tone);
  // soft shadow where a part sits behind another one
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!cv.mat[i] || cv.flat[i]) continue;
    for (const [dx, dy] of [[1, 0], [0, -1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (cv.mat[j] && cv.mat[j] !== cv.mat[i] && cv.z[j] > cv.z[i] && !cv.flat[j]) { tone[i] = Math.min(3, tone[i] + 1); break; }
    }
  }
  for (let i = 0; i < w * h; i++) {
    if (!cv.mat[i]) continue;
    const c = cv.flat[i] || mats[cv.mat[i]][tone[i]];
    px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255;
  }
  // colored outline: each edge takes the darkest tone of the part it borders
  const copy = Uint8Array.from(px);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (copy[i * 4 + 3]) continue;
    let best = null, bestZ = -1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (copy[j * 4 + 3] && cv.z[j] > bestZ) { bestZ = cv.z[j]; best = j; }
    }
    if (best == null) continue;
    const m = cv.flat[best] ? null : mats[cv.mat[best]];
    const c = m ? m[4] : [24, 18, 26];
    px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255;
  }
  return { w, h, px };
}

// Trim empty rows top and bottom (keeping the same crop across a set of frames)
function cropRows(images, top, bottom) {
  return images.map((img) => {
    const h = bottom - top + 1;
    const px = new Uint8Array(img.w * h * 4);
    px.set(img.px.subarray(top * img.w * 4, (bottom + 1) * img.w * 4));
    return { w: img.w, h, px };
  });
}
function rowsUsed(img) {
  let top = img.h, bottom = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.px[(y * img.w + x) * 4 + 3]) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  return [top, bottom];
}
function hstack(images, gap, bg) {
  const h = Math.max(...images.map((i) => i.h));
  const w = images.reduce((s, i) => s + i.w, 0) + gap * (images.length - 1);
  const px = new Uint8Array(w * h * 4);
  if (bg) for (let i = 0; i < px.length; i += 4) { px[i] = bg[0]; px[i + 1] = bg[1]; px[i + 2] = bg[2]; px[i + 3] = 255; }
  let ox = 0;
  for (const img of images) {
    const oy = h - img.h;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const s = (y * img.w + x) * 4;
      if (!img.px[s + 3]) continue;
      const d = ((oy + y) * w + ox + x) * 4;
      px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2]; px[d + 3] = 255;
    }
    ox += img.w + gap;
  }
  return { w, h, px };
}
function scaleUp(img, k) {
  const w = img.w * k, h = img.h * k, px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (Math.floor(y / k) * img.w + Math.floor(x / k)) * 4, d = (y * w + x) * 4;
    px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2]; px[d + 3] = img.px[s + 3];
  }
  return { w, h, px };
}
function pad(img, n, bg) {
  const w = img.w + n * 2, h = img.h + n * 2, px = new Uint8Array(w * h * 4);
  for (let i = 0; i < px.length; i += 4) { px[i] = bg[0]; px[i + 1] = bg[1]; px[i + 2] = bg[2]; px[i + 3] = 255; }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const s = (y * img.w + x) * 4;
    if (!img.px[s + 3]) continue;
    const d = ((y + n) * w + x + n) * 4;
    px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2]; px[d + 3] = 255;
  }
  return { w, h, px };
}

// Renders one brother: { front, frames[] } as RGBA images, cropped to his height
function renderBro(look) {
  const mats = materials(look);
  const f = paint(front(look), mats);
  const frames = SIDE_FRAMES.map((n) => paint(side(look, n), mats));
  const all = [f].concat(frames);
  let top = Infinity, bottom = 0;
  all.forEach((img) => { const [t, b] = rowsUsed(img); top = Math.min(top, t); bottom = Math.max(bottom, b); });
  const [fc, ...fr] = cropRows(all, top, bottom);
  return { front: fc, frames: fr };
}

// ===================== PNG =====================

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png({ w, h, px }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, px.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}
function pngSize(file) {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// ===================== main =====================

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "data/brothers.js"), "utf8"), sandbox);
  const args = process.argv.slice(2);
  const pi = args.indexOf("--preview");
  const preview = pi !== -1 ? args.splice(pi, 2)[1] : null;
  const all = sandbox.window.JB_BROTHERS;
  const bros = all.filter((b) => !args.length || args.includes(b.id));

  const rows = [];
  for (const b of bros) {
    if (b.look.handDrawn) { console.log("· " + b.id + " is hand-drawn, skipped"); continue; }
    const { front: fimg, frames } = renderBro(b.look);
    const sheet = hstack(frames, 0);
    const sideFile = b.sprite.replace(/\.png$/, "-side.png");
    for (const [file, img] of [[b.sprite, fimg], [sideFile, sheet]]) {
      const out = path.join(root, file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, png(img));
    }
    rows.push(hstack([fimg, sheet], 6));
    console.log("✓ " + b.id + ": " + fimg.w + "×" + fimg.h + " portrait, " + frames.length + " game frames");
  }

  // Sizes for the site (every brother, generated or hand-drawn)
  const sizes = {};
  for (const b of all) {
    const fp = path.join(root, b.sprite), sp = path.join(root, b.sprite.replace(/\.png$/, "-side.png"));
    if (!fs.existsSync(fp) || !fs.existsSync(sp)) continue;
    const [fw, fh] = pngSize(fp), [sw, sh] = pngSize(sp);
    const count = b.look.handDrawn ? (b.look.frames || 3) : SIDE_FRAMES.length;
    sizes[b.id] = { front: [fw, fh], side: [Math.round(sw / count), sh, count] };
  }
  fs.writeFileSync(path.join(root, "data/sprites.js"),
    "/* Generated by tools/make-bros.js. Sprite sizes in pixels; side frames are\n" +
    " * stand, walk 1-4, jump (hand-drawn sheets may have stand, walk, jump). */\n" +
    "window.JB_SPRITES = " + JSON.stringify(sizes, null, 2) + ";\n");

  if (preview && rows.length) {
    const sky = [92, 148, 252];
    fs.writeFileSync(preview, png(scaleUp(pad(hstack(rows, 10, sky), 4, sky), 5)));
    console.log("✓ preview " + preview);
  }
}

module.exports = { renderBro, png, SIDE_FRAMES };
