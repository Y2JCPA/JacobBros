/*
 * Pixel art for the playable world, all drawn in code at 1 pixel = 1 game
 * pixel: Old City background layers, the Kotel, trees, tiles and blocks.
 */
(function () {
  const H = 224;          // game screen height in pixels
  const GROUND_Y = 192;   // top of the ground

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.ceil(h);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return { c: c, ctx: ctx };
  }

  // Small seeded random so the city looks the same on every visit
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = function (r, a, b) { return a + Math.floor(r() * (b - a + 1)); };
  const pick = function (r, arr) { return arr[Math.floor(r() * arr.length)]; };

  function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  // Filled pixel circle, drawn row by row
  function disc(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
    }
  }

  // ---------------- sky ----------------
  const SKY = [
    [0, "#4f90e0"], [44, "#5f9de6"], [84, "#76afeb"], [112, "#92c2ef"],
    [134, "#b2d4f0"], [152, "#d2e3ec"], [168, "#efe3c8"],
  ];
  function drawSky(ctx, w) {
    for (let i = 0; i < SKY.length; i++) {
      const y0 = SKY[i][0], y1 = i + 1 < SKY.length ? SKY[i + 1][0] : GROUND_Y;
      rect(ctx, 0, y0, w, y1 - y0, SKY[i][1]);
      if (i + 1 < SKY.length) { // dithered seam
        ctx.fillStyle = SKY[i + 1][1];
        for (let x = 0; x < w; x += 2) ctx.fillRect(x, y1 - 1, 1, 1);
      }
    }
  }

  function cloud(ctx, x, y, s) {
    const c = "#ffffff", sh = "#d8ebf7";
    rect(ctx, x + 4 * s, y, 8 * s, 2 * s, c);
    rect(ctx, x + 2 * s, y + 2 * s, 14 * s, 2 * s, c);
    rect(ctx, x + 12 * s, y + 1 * s, 6 * s, 3 * s, c);
    rect(ctx, x, y + 4 * s, 22 * s, 3 * s, c);
    rect(ctx, x + 1 * s, y + 7 * s, 20 * s, 1 * s, sh);
  }
  function makeClouds(width) {
    const { c, ctx } = canvas(width, 90);
    const r = rng(7);
    for (let x = 10; x < width; x += ri(r, 110, 190)) cloud(ctx, x, ri(r, 10, 60), pick(r, [1, 1, 2]));
    return c;
  }

  // ---------------- far hills (Har HaZeitim and the Judean hills) ----------------
  function makeHills(width) {
    const { c, ctx } = canvas(width, H);
    const r = rng(11);
    const ridge = function (base, a1, f1, a2, f2, color, dots) {
      for (let x = 0; x < width; x++) {
        const y = Math.round(base + a1 * Math.sin(x / f1) + a2 * Math.sin(x / f2 + 1.3));
        rect(ctx, x, y, 1, GROUND_Y - y, color);
        if (dots && r() < 0.18) rect(ctx, x, y + ri(r, 2, 14), 2, 2, dots);
      }
    };
    ridge(138, 9, 90, 5, 31, "#c3c29a", "#a3a77c");
    ridge(150, 7, 60, 4, 19, "#adb083", "#8b9466");
    return c;
  }

  // ---------------- trees ----------------
  function cypress(ctx, x, base, h) {
    const w = Math.max(6, Math.round(h / 6));
    for (let y = 0; y < h; y++) {
      const f = y / h;
      const half = Math.max(1, Math.round((w / 2) * Math.sin(Math.min(1, f * 1.25) * Math.PI * 0.62) + (f > 0.85 ? -1 : 0)));
      const yy = base - h + y;
      rect(ctx, x - half, yy, half * 2, 1, "#2e5a37");
      rect(ctx, x - half, yy, 1, 1, "#3f7448");
      rect(ctx, x + half - 1, yy, 1, 1, "#20422a");
      if (y % 5 === 2) rect(ctx, x - half + 1, yy, 1, 1, "#4a8253");
    }
    rect(ctx, x - 1, base - 2, 2, 2, "#5a4430");
  }
  function olive(ctx, x, base, s, r) {
    // gnarled trunk
    rect(ctx, x - 2, base - 14 * s, 4, 14 * s, "#6d5a45");
    rect(ctx, x - 3, base - 4, 6, 4, "#6d5a45");
    rect(ctx, x + 1, base - 14 * s, 1, 14 * s, "#4f4032");
    rect(ctx, x - 4, base - 12 * s, 3, 2, "#6d5a45");
    // silvery canopy
    const cy = base - 18 * s;
    const blobs = [[0, 0, 9], [-9, 3, 7], [9, 3, 7], [-5, -5, 7], [5, -5, 7], [0, -8, 6]];
    blobs.forEach(function (b) { disc(ctx, x + b[0] * s, cy + b[1] * s, Math.round(b[2] * s), "#8a9d66"); });
    blobs.forEach(function (b) { disc(ctx, x + b[0] * s - 1, cy + b[1] * s - 2, Math.max(1, Math.round(b[2] * s) - 4), "#a9b983"); });
    for (let i = 0; i < 26 * s; i++) rect(ctx, x + ri(r, -14, 14) * s, cy + ri(r, -12, 9) * s, 1, 1, pick(r, ["#6a7f4c", "#c3cf9f"]));
  }
  function pine(ctx, x, base, h, r) {
    rect(ctx, x - 1, base - h, 3, h, "#6a4a32");
    rect(ctx, x + 1, base - h, 1, h, "#4c3423");
    const top = base - h;
    [[0, 0, 16, 5], [-8, 4, 10, 4], [8, 3, 11, 4], [0, -4, 9, 3]].forEach(function (b) {
      for (let dy = -b[3]; dy <= b[3]; dy++) {
        const w = Math.round(b[2] * Math.sqrt(1 - (dy * dy) / (b[3] * b[3] + 0.01)));
        rect(ctx, x + b[0] - w, top + b[1] + dy, w * 2 + 1, 1, dy < 0 ? "#4b7c49" : "#3a663a");
      }
    });
    for (let i = 0; i < 14; i++) rect(ctx, x + ri(r, -18, 18), top + ri(r, -5, 6), 1, 1, "#2c522e");
  }

  // ---------------- the Old City ----------------
  const STONE = ["#e3d3a6", "#d9c696", "#cfba88", "#e8dab2"];

  function stoneWall(ctx, x0, y0, w, h, r, courseH) {
    rect(ctx, x0, y0, w, h, "#d6c08b");
    for (let y = y0; y < y0 + h; y += courseH) {
      let x = x0 - ri(r, 0, 10);
      while (x < x0 + w) {
        const sw = ri(r, courseH + 3, courseH * 3);
        const cx = Math.max(x, x0), cw = Math.min(x + sw, x0 + w) - cx;
        if (cw > 0) {
          rect(ctx, cx, y, cw, courseH - 1, pick(r, STONE));
          rect(ctx, cx, y, cw, 1, "#efe2bf");
          rect(ctx, cx + cw - 1, y, 1, courseH - 1, "#b9a172");
        }
        rect(ctx, cx, y + courseH - 1, Math.max(0, cw), 1, "#a68c5e");
        x += sw;
      }
    }
  }
  function crenellate(ctx, x0, y, w, color) {
    for (let x = x0; x < x0 + w - 4; x += 9) {
      rect(ctx, x, y - 6, 5, 6, color);
      rect(ctx, x, y - 6, 5, 1, "#f1e5c4");
      rect(ctx, x + 4, y - 5, 1, 5, "#b39b6c");
    }
  }
  function dome(ctx, cx, base, rad, color, shadeColor) {
    for (let dy = 0; dy <= rad; dy++) {
      const w = Math.round(Math.sqrt(rad * rad - dy * dy));
      const y = base - dy;
      rect(ctx, cx - w, y, w * 2 + 1, 1, color);
      rect(ctx, cx + Math.round(w * 0.35), y, Math.max(1, w - Math.round(w * 0.35)) + 1, 1, shadeColor);
    }
    rect(ctx, cx, base - rad - 3, 1, 3, "#8c7a5a");
  }
  function windows(ctx, x0, y0, w, h, r) {
    for (let y = y0 + 4; y < y0 + h - 6; y += 9) {
      for (let x = x0 + 3; x < x0 + w - 4; x += 7) {
        if (r() < 0.55) { rect(ctx, x, y + 1, 2, 4, "#6a573c"); rect(ctx, x, y, 2, 1, "#8c7550"); }
      }
    }
  }

  function towerOfDavid(ctx, x) {
    const r = rng(41);
    stoneWall(ctx, x, 58, 30, 110, r, 6);
    crenellate(ctx, x, 58, 30, "#d9c696");
    stoneWall(ctx, x + 30, 92, 22, 76, r, 6);
    crenellate(ctx, x + 30, 92, 22, "#d9c696");
    [[x + 8, 72], [x + 18, 72], [x + 8, 96], [x + 18, 96], [x + 38, 104]].forEach(function (p) {
      rect(ctx, p[0], p[1], 2, 6, "#5c4a32");
    });
  }
  function hurva(ctx, x) {
    const r = rng(53);
    // body
    stoneWall(ctx, x, 92, 64, 76, r, 7);
    // arched windows
    for (let i = 0; i < 4; i++) {
      rect(ctx, x + 8 + i * 14, 104, 6, 14, "#5f4d34");
      rect(ctx, x + 9 + i * 14, 102, 4, 2, "#5f4d34");
    }
    // drum and dome
    rect(ctx, x + 12, 70, 40, 22, "#e6d8b0");
    rect(ctx, x + 12, 70, 40, 1, "#f3e9cc");
    for (let i = 0; i < 5; i++) rect(ctx, x + 15 + i * 8, 74, 3, 9, "#5f4d34");
    dome(ctx, x + 32, 70, 22, "#efece4", "#cfc9bb");
    for (let i = -2; i <= 2; i++) rect(ctx, x + 32 + i * 7, 56 + Math.abs(i) * 3, 1, 12 - Math.abs(i) * 3, "#c2bcaf");
  }
  function house(ctx, x, top, w, r) {
    const color = pick(r, ["#e6d8b0", "#dccb9f", "#ece0be", "#d2bf90"]);
    rect(ctx, x, top, w, 168 - top, color);
    rect(ctx, x, top, w, 1, "#f4eacb");
    rect(ctx, x + w - 1, top, 1, 168 - top, "#b9a273");
    windows(ctx, x, top, w, 168 - top, r);
    if (r() < 0.55) dome(ctx, x + Math.floor(w / 2), top, Math.min(9, Math.floor(w / 3)), "#f3f0e8", "#d4cfc3");
  }

  function makeCity(width) {
    const { c, ctx } = canvas(width, H);
    const r = rng(23);
    // houses and landmarks behind the wall
    let x = -8;
    while (x < width) {
      const w = ri(r, 18, 34);
      house(ctx, x, ri(r, 112, 138), w, r);
      if (r() < 0.25) cypress(ctx, x + w + 3, 150, ri(r, 36, 52));
      x += w + ri(r, -2, 4);
    }
    towerOfDavid(ctx, 34);
    hurva(ctx, 230);
    for (let lx = 560; lx < width; lx += 520) { hurva(ctx, lx); towerOfDavid(ctx, lx + 260); }
    // the city wall, with towers every so often
    stoneWall(ctx, 0, 146, width, GROUND_Y - 146, r, 6);
    crenellate(ctx, 0, 146, width, "#d9c696");
    for (let tx = 120; tx < width; tx += ri(r, 170, 240)) {
      stoneWall(ctx, tx, 128, 26, GROUND_Y - 128, r, 6);
      crenellate(ctx, tx, 128, 26, "#d9c696");
      rect(ctx, tx + 11, 138, 2, 7, "#5c4a32");
      rect(ctx, tx + 11, 158, 2, 7, "#5c4a32");
    }
    return c;
  }

  // ---------------- near trees ----------------
  function makeTrees(width) {
    const { c, ctx } = canvas(width, H);
    const r = rng(31);
    for (let x = 30; x < width; x += ri(r, 60, 120)) {
      const kind = r();
      if (kind < 0.4) olive(ctx, x, GROUND_Y, pick(r, [1, 1, 1.3]), r);
      else if (kind < 0.75) cypress(ctx, x, GROUND_Y, ri(r, 54, 84));
      else pine(ctx, x, GROUND_Y, ri(r, 60, 82), r);
    }
    return c;
  }

  // ---------------- the Kotel ----------------
  function makeKotel() {
    const W = 300, top = 30;
    const { c, ctx } = canvas(W, GROUND_Y);
    const r = rng(613);
    let y = GROUND_Y;
    const courses = [];
    for (let i = 0; i < 6; i++) courses.push(14);   // great Herodian stones
    for (let i = 0; i < 5; i++) courses.push(10);
    while (y - courses.reduce(function (a, b) { return a + b; }, 0) > top + 6) courses.push(7);
    courses.forEach(function (ch, ci) {
      y -= ch;
      let x = -ri(r, 0, 30);
      while (x < W) {
        const sw = ch >= 14 ? ri(r, 26, 52) : ch >= 10 ? ri(r, 16, 30) : ri(r, 9, 16);
        const cx = Math.max(0, x), cw = Math.min(x + sw, W) - cx;
        if (cw > 1) {
          const base = pick(r, ["#d8c69b", "#cdb98c", "#e1d1a7", "#c4ae80"]);
          rect(ctx, cx, y, cw, ch, "#8f7a55");                // joint
          rect(ctx, cx, y, cw - 1, ch - 1, base);
          if (ch >= 10) {                                      // drafted margins
            rect(ctx, cx, y, cw - 1, 1, "#efe3c1");
            rect(ctx, cx, y, 1, ch - 1, "#efe3c1");
            rect(ctx, cx + 2, y + 2, cw - 5, ch - 5, base === "#e1d1a7" ? "#d6c597" : "#c9b585");
          }
          for (let s = 0; s < cw / 6; s++) rect(ctx, cx + ri(r, 1, cw - 2), y + ri(r, 1, ch - 2), 1, 1, "#b8a273");
          // notes tucked into the lower joints
          if (ci < 5 && r() < 0.5) rect(ctx, cx + cw - 1, y + ri(r, 2, ch - 3), 1, pick(r, [1, 2]), "#ffffff");
          // hyssop growing from the upper courses
          if (ci >= 5 && r() < 0.28) {
            const px = cx + ri(r, 0, cw - 4), py = y + ch - 2;
            rect(ctx, px, py, 4, 2, "#5f8a3a"); rect(ctx, px + 1, py - 1, 2, 1, "#86ad55"); rect(ctx, px + 3, py + 2, 1, 2, "#5f8a3a");
          }
        }
        x += sw;
      }
    });
    // ragged top with plants
    for (let x = 0; x < W; x += ri(r, 6, 16)) rect(ctx, x, y - 2, ri(r, 3, 8), 3, "#6f9442");
    // shade at the base
    ctx.fillStyle = "rgba(60,40,20,.18)";
    ctx.fillRect(0, GROUND_Y - 6, W, 6);
    return c;
  }

  // ---------------- tiles (16x16) ----------------
  function makeTiles() {
    const T = {};
    const tile = function (fn) { const { c, ctx } = canvas(16, 16); fn(ctx); return c; };

    T.groundTop = tile(function (ctx) {
      const r = rng(5);
      rect(ctx, 0, 0, 16, 16, "#d6bc86");
      rect(ctx, 0, 0, 16, 2, "#efdcae");
      rect(ctx, 0, 2, 16, 1, "#b59866");
      [[0, 3, 9, 6], [9, 3, 7, 6], [0, 9, 4, 7], [4, 9, 8, 7], [12, 9, 4, 7]].forEach(function (s) {
        rect(ctx, s[0], s[1], s[2], s[3], "#a88a58");
        rect(ctx, s[0], s[1], s[2] - 1, s[3] - 1, pick(r, ["#d6bc86", "#ccb07a", "#dcc490"]));
        rect(ctx, s[0], s[1], s[2] - 1, 1, "#e7d3a3");
      });
    });
    T.groundFill = tile(function (ctx) {
      const r = rng(6);
      rect(ctx, 0, 0, 16, 16, "#a88a58");
      [[0, 0, 6, 8], [6, 0, 10, 8], [0, 8, 10, 8], [10, 8, 6, 8]].forEach(function (s) {
        rect(ctx, s[0], s[1], s[2] - 1, s[3] - 1, pick(r, ["#c2a672", "#b99c68", "#c8ad7a"]));
      });
    });
    T.stone = tile(function (ctx) {
      rect(ctx, 0, 0, 16, 16, "#5e4a2e");
      rect(ctx, 1, 1, 14, 14, "#e4d1a2");
      rect(ctx, 1, 1, 14, 1, "#fbefcf");
      rect(ctx, 1, 1, 1, 14, "#fbefcf");
      rect(ctx, 14, 2, 1, 13, "#b99c68");
      rect(ctx, 2, 14, 13, 1, "#b99c68");
      rect(ctx, 4, 4, 8, 8, "#d8c392");
      rect(ctx, 4, 4, 8, 1, "#ecdcb4");
      rect(ctx, 6, 9, 1, 1, "#c4ab78"); rect(ctx, 9, 6, 1, 1, "#c4ab78");
    });
    T.brick = tile(function (ctx) {
      rect(ctx, 0, 0, 16, 16, "#4a2614");
      [[1, 1, 7, 6], [9, 1, 6, 6], [1, 8, 3, 7], [5, 8, 7, 7], [13, 8, 2, 7]].forEach(function (s) {
        rect(ctx, s[0], s[1], s[2], s[3], "#c76b3a");
        rect(ctx, s[0], s[1], s[2], 1, "#eba274");
        rect(ctx, s[0] + s[2] - 1, s[1] + 1, 1, s[3] - 1, "#9c4a22");
      });
    });

    // Pomegranate (rimon) icon, 10x11
    const RIMON = [
      "...c.c.c..",
      "...ccccc..",
      "..rrrrrr..",
      ".rrlrrrrr.",
      "rrllrrrrrd",
      "rrlrrrrrrd",
      "rrrrrrrrrd",
      "rrrrrrrrdd",
      ".rrrrrrdd.",
      "..rdddd...",
      "...ddd....",
    ];
    function rimon(ctx, ox, oy, gray) {
      const pal = gray
        ? { r: "#9a95a6", l: "#c9c5d2", d: "#6f6a7b", c: "#5d5868" }
        : { r: "#df2a40", l: "#ff8f9c", d: "#9a1428", c: "#7c0f1f" };
      RIMON.forEach(function (row, y) {
        for (let x = 0; x < row.length; x++) if (pal[row[x]]) rect(ctx, ox + x, oy + y, 1, 1, pal[row[x]]);
      });
    }
    function block(ctx, base, light, dark, gray) {
      rect(ctx, 0, 0, 16, 16, "#2a1a10");
      rect(ctx, 1, 1, 14, 14, base);
      rect(ctx, 1, 1, 14, 1, light); rect(ctx, 1, 1, 1, 14, light);
      rect(ctx, 14, 2, 1, 13, dark); rect(ctx, 2, 14, 13, 1, dark);
      [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(function (p) { rect(ctx, p[0], p[1], 1, 1, dark); });
      rimon(ctx, 3, 3, gray);
    }
    T.item = [
      tile(function (ctx) { block(ctx, "#f2b632", "#ffe08a", "#b07a14"); }),
      tile(function (ctx) { block(ctx, "#e7a526", "#ffd474", "#a06c0e"); }),
      tile(function (ctx) { block(ctx, "#d79318", "#f4c45e", "#8f5f08"); }),
    ];
    T.soon = tile(function (ctx) { block(ctx, "#b9b4c8", "#e2def0", "#7d7890", true); });
    T.rimon = (function () { const { c, ctx } = canvas(10, 11); rimon(ctx, 0, 0); return c; })();
    T.coin = (function () {
      const { c, ctx } = canvas(8, 12);
      rect(ctx, 1, 0, 6, 12, "#2a1a10"); rect(ctx, 0, 1, 8, 10, "#2a1a10");
      rect(ctx, 1, 1, 6, 10, "#f8c030"); rect(ctx, 2, 2, 1, 8, "#fff0b0"); rect(ctx, 5, 2, 1, 8, "#c08810");
      return c;
    })();
    return T;
  }

  // Zone gate: a stone arch, like the Old City gates
  function drawGate(ctx, x, cam) {
    const sx = Math.round(x - cam);
    const r = rng(x | 0);
    stoneWall(ctx, sx, 112, 12, 80, r, 8);
    stoneWall(ctx, sx + 36, 112, 12, 80, r, 8);
    stoneWall(ctx, sx, 100, 48, 14, r, 7);
    crenellate(ctx, sx, 100, 48, "#d9c696");
    // rounded arch under the lintel
    for (let dy = 0; dy < 8; dy++) {
      const inset = Math.round(12 - 12 * Math.sqrt(1 - Math.pow((8 - dy) / 8, 2)));
      rect(ctx, sx + 12, 114 + dy, inset, 1, "#d6c08b");
      rect(ctx, sx + 36 - inset, 114 + dy, inset, 1, "#d6c08b");
    }
    rect(ctx, sx + 12, 114, 24, 1, "#c9b27f");
    rect(ctx, sx + 12, 117, 1, 75, "#a68c5e");
    rect(ctx, sx + 35, 117, 1, 75, "#a68c5e");
  }

  // Wooden sign on a post
  function drawSign(ctx, x, cam, w) {
    const sx = Math.round(x - cam);
    rect(ctx, sx + Math.floor(w / 2) - 2, 150, 4, 42, "#6b4a2a");
    rect(ctx, sx + Math.floor(w / 2) + 1, 150, 1, 42, "#4e3420");
    rect(ctx, sx, 126, w, 28, "#3a2414");
    rect(ctx, sx + 1, 127, w - 2, 26, "#9c6b3c");
    rect(ctx, sx + 1, 127, w - 2, 1, "#c48d55");
    rect(ctx, sx + 1, 139, w - 2, 1, "#835731");
  }

  window.JB_ART = {
    H: H, GROUND_Y: GROUND_Y,
    drawSky: drawSky, makeClouds: makeClouds, makeHills: makeHills, makeCity: makeCity,
    makeTrees: makeTrees, makeKotel: makeKotel, makeTiles: makeTiles,
    drawGate: drawGate, drawSign: drawSign,
  };
})();
