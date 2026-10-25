#!/usr/bin/env node
/*
 * Draws each brother's pixel sprite from his `look` in data/brothers.js and
 * saves it as assets/bros/<id>.png. No dependencies.
 *
 *   node tools/make-bros.js                 all brothers
 *   node tools/make-bros.js yaakov          just one
 *   node tools/make-bros.js --preview f.png also save a big preview sheet
 *
 * A brother who draws his own sprite (Aseprite, Piskel…) sets
 * `look.handDrawn: true` and saves it at his `sprite` path; this tool then
 * leaves it alone.
 *
 * Grid letters (uppercase = base color; the tool adds right-edge shading
 * and a dark outline automatically):
 *   C cap   c cap brim   w cap badge   K kippah/hat   R hat band
 *   H hair  S skin  s ear  E eye  e eye shine  N nose  M mustache/beard
 *   D mouth T shirt  O overalls  Y buttons  W tzitzit  w2 → "x" tassel end
 *   B shoes . empty
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const W = 21;

// ---------- heads (rows 0-8 change with the hat; rows 9-17 are the face) ----------
const HATS = {
  cap: [
    ".......CCCCCCC.......",
    ".....CCCCwwwCCCC.....",
    "....CCCCwwwwwCCCC....",
    "...CCCCCwwwwwCCCCC...",
    "...CCCCCwwwwwCCCCC...",
    "...CCCCCwwwwwCCCCC...",
    "...CCCCCwwwwwCCCCC...",
    "...CCCCCCwwwCCCCCC...",
    "..ccccccccccccccccc..",
  ],
  kippah: [
    ".....................",
    "........KKKKK........",
    "......KKKKKKKKK......",
    ".....HHHHHHHHHHH.....",
    "....HHHHHHHHHHHHH....",
    "...HHHHHHHHHHHHHHH...",
    "...HHHHHHHHHHHHHHH...",
    "...HHHSSSSSSSSSHHH...",
    "...HHSSSSSSSSSSSHH...",
  ],
  fedora: [
    "......KKKKkKKKK......",
    ".....KKKKKKKKKKK.....",
    ".....KKKKKKKKKKK.....",
    ".....KKKKKKKKKKK.....",
    ".....RRRRRRRRRRR.....",
    ".KKKKKKKKKKKKKKKKKKK.",
    "...HHHHHHHHHHHHHHH...",
    "...HHHSSSSSSSSSHHH...",
    "...HHSSSSSSSSSSSHH...",
  ],
};

const FACE = [
  "...HHSHHSSSSSHHSHH...", //  9 brows
  "..sHSSeESSSSSeESSHs..", // 10 eyes
  "..sHSSEESNNNSEESSHs..", // 11
  "..sHSSEENNNNNEESSHs..", // 12
  "...HSSSNNNNNNNSSSH...", // 13 nose
  "...HSMMMMMMMMMMMSH...", // 14 mustache
  "....SSMMMSSSMMMSS....", // 15
  "....SSSSSDDDSSSSS....", // 16 mouth
  ".....SSSSSSSSSSS.....", // 17 chin
];

// ---------- bodies ----------
const BODIES = {
  short: [
    ".....TTTTTTTTTTT.....",
    "...TTTOTTTTTTTOTTT...",
    "..TTTTOTTTTTTTOTTTT..",
    ".TTTTTOYTTTTTYOTTTTT.",
    ".TTTTOOOOOOOOOOOTTTT.",
    ".SSTTOOOOOOOOOOOTTSS.",
    ".SSS.OOOOOOOOOOO.SSS.",
    "....WOOOOOOOOOOOW....",
    "...xWOOOOO.OOOOOWx...",
    "...xWOOOO...OOOOWx...",
    "...xW.OOO...OOO.Wx...",
    "...BBBBB.....BBBBB...",
    "..BBBBBB.....BBBBBB..",
  ],
  tall: [
    ".....TTTTTTTTTTT.....",
    "....TTOTTTTTTTOTT....",
    "...TTTOTTTTTTTOTTT...",
    "...TTTOTTTTTTTOTTT...",
    "..TTTTOYTTTTTYOTTTT..",
    "..TTTOOOOOOOOOOOTTT..",
    "..TTTOOOOOOOOOOOTTT..",
    "..SS.OOOOOOOOOOO.SS..",
    "..SS.WOOOOOOOOOW.SS..",
    "....xWOOOO.OOOOWx....",
    "....xWOOOO.OOOOWx....",
    "....xWOOO...OOOWx....",
    ".....x.OOO.OOO.x.....",
    ".......OOO.OOO.......",
    ".......OOO.OOO.......",
    ".......OOO.OOO.......",
    ".......OOO.OOO.......",
    "....BBBBBB.BBBBBB....",
    "...BBBBBBB.BBBBBBB...",
  ],
};

// 3x5 letters for the cap badge
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111", 1: "010110010010111", 2: "110001010100111",
  3: "110001010001110", 4: "101101111001001", 5: "111100110001110",
};

// ---------- composing ----------
function set(grid, x, y, ch) {
  if (grid[y] && x >= 0 && x < W) grid[y][x] = ch;
}

function compose(look) {
  const grid = (HATS[look.hat] || HATS.cap).concat(FACE, BODIES[look.body] || BODIES.short)
    .map((row) => row.split(""));

  // Badge letter on the cap
  if ((look.hat || "cap") === "cap" && look.letter) {
    const bits = FONT[String(look.letter).toUpperCase()];
    if (bits) for (let i = 0; i < 15; i++) if (bits[i] === "1") set(grid, 9 + (i % 3), 2 + Math.floor(i / 3), "L");
  }

  // Facial hair
  const facial = look.facial || "mustache";
  if (facial === "clean") {
    for (let x = 4; x <= 16; x++) { set(grid, x, 14, "S"); set(grid, x, 15, "S"); set(grid, x, 16, "S"); }
    set(grid, 4, 14, "S"); set(grid, 16, 14, "S");
    [8, 12].forEach((x) => set(grid, x, 15, "D"));
    for (let x = 9; x <= 11; x++) set(grid, x, 16, "D");
  }
  if (facial === "beard" || facial === "full") {
    set(grid, 3, 13, "M"); set(grid, 17, 13, "M");
    set(grid, 3, 14, "M"); set(grid, 4, 14, "M"); set(grid, 16, 14, "M"); set(grid, 17, 14, "M");
    for (let x = 4; x <= 16; x++) {
      if (x < 9 || x > 11) { set(grid, x, 15, "M"); set(grid, x, 16, "M"); }
      else set(grid, x, 15, "D");
    }
    for (let x = 9; x <= 11; x++) set(grid, x, 16, "M");
    for (let x = 5; x <= 15; x++) set(grid, x, 17, "M");
    for (let x = 7; x <= 13; x++) set(grid, x, 18, "M");
  }
  if (facial === "full") {
    for (let x = 6; x <= 14; x++) set(grid, x, 18, "M");
    for (let x = 6; x <= 14; x++) set(grid, x, 19, "M");
    for (let x = 7; x <= 13; x++) set(grid, x, 20, "M");
    for (let x = 8; x <= 12; x++) set(grid, x, 21, "M");
  }

  // Longer hair covers the ears
  if (look.hairStyle === "long" || look.hairStyle === "curly") {
    for (let y = 9; y <= 13; y++) { set(grid, 2, y, "H"); set(grid, 18, y, "H"); set(grid, 3, y, "H"); set(grid, 17, y, "H"); }
    if (look.hairStyle === "curly") [9, 11, 13].forEach((y) => { set(grid, 1, y, "H"); set(grid, 19, y, "H"); });
  }

  // Peyos curl down past the ears
  if (look.peyos) {
    for (let y = 13; y <= 17; y++) {
      const x = y % 2 ? 2 : 3;
      set(grid, x, y, "H"); set(grid, 20 - x, y, "H");
    }
  }

  // Glasses
  if (look.glasses) {
    for (let y = 10; y <= 12; y++) [5, 8, 12, 15].forEach((x) => set(grid, x, y, "G"));
    [5, 6, 7, 8, 12, 13, 14, 15].forEach((x) => { set(grid, x, 9, "G"); set(grid, x, 13, "G"); });
    for (let x = 9; x <= 11; x++) set(grid, x, 10, "G");
    [6, 13].forEach((x) => set(grid, x, 10, "g"));
  }

  return grid;
}

// ---------- colors ----------
function hex(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c || "");
  if (!m) throw new Error("bad color " + c);
  let h = m[1];
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const shade = (rgb, f) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));

function palette(look) {
  const c = look.colors;
  const p = {
    C: hex(c.cap), L: hex(c.cap), w: [255, 255, 255],
    K: hex(c.hat || c.cap), R: hex(c.band || "#3a3a3a"),
    H: hex(c.hair), M: hex(c.beard || c.hair),
    S: hex(c.skin), E: [24, 16, 28], e: [255, 255, 255], D: [140, 40, 40],
    T: hex(c.shirt), O: hex(c.overalls), Y: hex(c.buttons || "#f8d030"),
    W: [244, 244, 244], x: [214, 214, 214], B: hex(c.shoes),
    G: hex(c.glasses || "#5d6678"), g: [200, 236, 255],
  };
  p.c = shade(p.C, 0.72);
  p.k = shade(p.K, 0.72);
  p.s = shade(p.S, 0.82);
  p.N = shade(p.S, 0.93);
  return p;
}

// Letters that get a darker column on their right edge
const SHADED = new Set("CKHSTOBMN".split(""));
const OUTLINE = [26, 16, 22];

function render(look) {
  const grid = compose(look);
  const pal = palette(look);
  const w = W + 2, h = grid.length + 2;
  const px = new Uint8Array(w * h * 4);
  const filled = (x, y) => grid[y] && grid[y][x] && grid[y][x] !== ".";

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      if (ch === ".") continue;
      let rgb = pal[ch];
      if (!rgb) throw new Error("no color for " + ch);
      if (SHADED.has(ch) && !(filled(x + 1, y) && grid[y][x + 1] === ch) && filled(x - 1, y)) rgb = shade(rgb, 0.78);
      const i = ((y + 1) * w + (x + 1)) * 4;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
    }
  }
  // 1px outline around the whole figure
  const copy = Uint8Array.from(px);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (copy[i + 3]) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && copy[(ny * w + nx) * 4 + 3];
    });
    if (near) { px[i] = OUTLINE[0]; px[i + 1] = OUTLINE[1]; px[i + 2] = OUTLINE[2]; px[i + 3] = 255; }
  }
  return { w, h, px };
}

// ---------- PNG ----------
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
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Lines sprites up, bottom-aligned, scaled up, on a sky background.
function sheet(images, scale) {
  const gap = 6;
  const h = Math.max(...images.map((i) => i.h)) + gap * 2;
  const w = images.reduce((s, i) => s + i.w + gap, gap);
  const px = new Uint8Array(w * scale * h * scale * 4);
  for (let i = 0; i < px.length; i += 4) { px[i] = 92; px[i + 1] = 148; px[i + 2] = 252; px[i + 3] = 255; }
  let ox = gap;
  for (const img of images) {
    const oy = h - gap - img.h;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const s = (y * img.w + x) * 4;
      if (!img.px[s + 3]) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const d = (((oy + y) * scale + dy) * w * scale + (ox + x) * scale + dx) * 4;
        px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2]; px[d + 3] = 255;
      }
    }
    ox += img.w + gap;
  }
  return { w: w * scale, h: h * scale, px };
}

// ---------- main ----------
if (require.main === module) {
  const root = path.join(__dirname, "..");
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "data/brothers.js"), "utf8"), sandbox);
  const args = process.argv.slice(2);
  const pi = args.indexOf("--preview");
  const preview = pi !== -1 ? args.splice(pi, 2)[1] : null;
  const bros = sandbox.window.JB_BROTHERS.filter((b) => !args.length || args.includes(b.id));

  const images = [];
  for (const b of bros) {
    if (b.look.handDrawn) { console.log("· " + b.id + " is hand-drawn, skipped"); continue; }
    const img = render(b.look);
    const out = path.join(root, b.sprite);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, png(img));
    images.push(img);
    console.log("✓ " + b.sprite + " (" + img.w + "×" + img.h + ")");
  }
  if (preview && images.length) {
    fs.writeFileSync(preview, png(sheet(images, 8)));
    console.log("✓ preview " + preview);
  }
}

module.exports = { compose, render, png, HATS, BODIES };
