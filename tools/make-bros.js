#!/usr/bin/env node
/*
 * Draws each brother's pixel sprites from his `look` in data/brothers.js:
 *
 *   assets/bros/<id>.png        front-facing portrait (menus, cards)
 *   assets/bros/<id>-side.png   side-view game frames: stand | walk | jump
 *
 *   node tools/make-bros.js                 all brothers
 *   node tools/make-bros.js levi            just one
 *   node tools/make-bros.js --preview f.png also save a big preview sheet
 *
 * No dependencies. A brother who draws his own sprites (Aseprite, Piskel…)
 * sets `look.handDrawn: true` and this tool leaves his files alone.
 *
 * Grid letters (the tool adds right-edge shading and a dark outline):
 *   C cap  c cap brim  w badge  L badge letter  K kippah/hat  k hat dent  R hat band
 *   H hair  S skin  s ear  N nose  E eye  e eye shine / teeth  g lens shine  G glasses
 *   M mustache/beard  D mouth  T shirt  O overalls  Y buttons
 *   W tzitzit  x tzitzit (second strand)  B shoes  . empty
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const W = 21;

// ===================== FRONT VIEW =====================

const FRONT_HATS = {
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

const FRONT_FACE = [
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

const LEGS_FRONT_SHORT = [
  "....WOOOOOOOOOOOW....",
  "...xWOOOOO.OOOOOWx...",
  "...xWOOOO...OOOOWx...",
  "...xW.OOO...OOO.Wx...",
  "...BBBBB.....BBBBB...",
  "..BBBBBB.....BBBBBB..",
];

const FRONT_BODIES = {
  short: [
    ".....TTTTTTTTTTT.....",
    "...TTTOTTTTTTTOTTT...",
    "..TTTTOTTTTTTTOTTTT..",
    ".TTTTTOYTTTTTYOTTTTT.",
    ".TTTTOOOOOOOOOOOTTTT.",
    ".SSTTOOOOOOOOOOOTTSS.",
    ".SSS.OOOOOOOOOOO.SSS.",
  ].concat(LEGS_FRONT_SHORT),
  muscular: [
    ".....TTTTTTTTTTT.....",
    ".TTTTTOTTTTTTTOTTTTT.",
    "TTTTTTOTTTTTTTOTTTTTT",
    "SSSTTTOYTTTTTYOTTTSSS",
    "SSSSTOOOOOOOOOOOTSSSS",
    ".SSS.OOOOOOOOOOO.SSS.",
    ".SSS.OOOOOOOOOOO.SSS.",
  ].concat(LEGS_FRONT_SHORT),
  wide: [
    "....TTTTTTTTTTTTT....",
    "..TTTTTOTTTTTOTTTTT..",
    ".TTTTTTOTTTTTOTTTTTT.",
    "TTTTTTOYOOOOOYOTTTTTT",
    "TTTTOOOOOOOOOOOOOTTTT",
    "SSSOOOOOOOOOOOOOOOSSS",
    "SSSOOOOOOOOOOOOOOOSSS",
    "..WOOOOOOOOOOOOOOOW..",
    "..xWOOOOOOOOOOOOOWx..",
    "..xW.OOOOO.OOOOO.Wx..",
    "..x..OOOO...OOOO..x..",
    "..BBBBBBB...BBBBBBB..",
    ".BBBBBBBB...BBBBBBBB.",
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
  lanky: [
    "......TTTTTTTTT......",
    ".....TTOTTTTTOTT.....",
    "....TTTOTTTTTOTTT....",
    "....TTTOTTTTTOTTT....",
    "....TTTOYTTTYOTTT....",
    "....TT.OOOOOOO.TT....",
    "....TT.OOOOOOO.TT....",
    "....TT.OOOOOOO.TT....",
    "....SS.OOOOOOO.SS....",
    "....SS.WOOOOOW.SS....",
    ".....xxWOO.OOWxx.....",
    "......xWOO.OOWx......",
    "......x.OO.OO.x......",
    "........OO.OO........",
    "........OO.OO........",
    "........OO.OO........",
    "........OO.OO........",
    "........OO.OO........",
    "........OO.OO........",
    "........OO.OO........",
    ".....BBBBB.BBBBB.....",
    "....BBBBBB.BBBBBB....",
  ],
};

// ===================== SIDE VIEW (facing right) =====================

const SIDE_HATS = {
  cap: [
    "......CCCCCCC........",
    "....CCCCCCCCCCC......",
    "...CCCCCCCCwwwCC.....",
    "..CCCCCCCCwwwwwC.....",
    "..CCCCCCCCwwwwwCC....",
    "..CCCCCCCCwwwwwCC....",
    "..CCCCCCCCwwwwwCC....",
    "..CCCCCCCCCwwwCCCC...",
    "..HHHcccccccccccccccc",
  ],
  kippah: [
    ".....................",
    "......KKKKK..........",
    "....KKKKKKKKK........",
    "...HHHHHHHHHHH.......",
    "..HHHHHHHHHHHHH......",
    "..HHHHHHHHHHHHHH.....",
    "..HHHHHHHHHHHHHH.....",
    "..HHHHHHSSSSSSSS.....",
    "..HHHHHSSSSSSSSS.....",
  ],
  fedora: [
    "......KKKKkKKK.......",
    ".....KKKKKKKKKK......",
    ".....KKKKKKKKKK......",
    ".....KKKKKKKKKK......",
    ".....RRRRRRRRRR......",
    "..KKKKKKKKKKKKKKKKK..",
    "..HHHHHHHHHHHHHH.....",
    "..HHHHHHSSSSSSSS.....",
    "..HHHHHSSSSSSSSS.....",
  ],
};

const SIDE_FACE = [
  "..HHHHHSSSSSSHHS.....", //  9 brow
  "..HHHHssSSSSSeESS....", // 10 eye
  "..HHHHsSsSSSSeENNN...", // 11 ear, nose
  "..HHHHssSSSSSEENNNN..", // 12
  "...HHHSSSSSSSSNNNNN..", // 13
  "...HHSSSSSMMMMMMMM...", // 14 mustache
  "....SSSSSSSMMMMMM....", // 15
  "....SSSSSSSSSDDS.....", // 16 mouth
  ".....SSSSSSSSSS......", // 17 chin
];

const SIDE_TORSOS = {
  short: [
    ".....TTTTTTTTT.......",
    "....TTTTTTOTTTT......",
    "....TTTTTTOTTTT......",
    "....OOTTTTTYOOO......",
    "....OOOTTTTOOOO......",
    "....OOOOSSSOOOO......",
    "...WOOOOOOOOOOO......",
  ],
  muscular: [
    "....TTTTTTTTTTT......",
    "...TTTTTTTOTTTTT.....",
    "...TTSSSSTOTTTTT.....",
    "...OSSSSSSYOOOO......",
    "...OOSSSSSOOOOO......",
    "...OOOSSSSOOOOO......",
    "...WOOOOOOOOOOO......",
  ],
  wide: [
    ".....TTTTTTTTTT......",
    "...TTTTTTTOTTTTT.....",
    "...TTTTTTTOOOOOOO....",
    "...OOTTTTTOOOYOOOO...",
    "...OOOTTTTOOOOOOOOO..",
    "...OOOOSSSOOOOOOOOO..",
    "..WOOOOOOOOOOOOOOO...",
  ],
  tall: [
    ".....TTTTTTTTT.......",
    "....TTTTTTOTTTT......",
    "....TTTTTTOTTTT......",
    "....TTTTTTOTTTT......",
    "....OOTTTTTYOOO......",
    "....OOOTTTTOOOO......",
    "....OOOTTTTOOOO......",
    "....OOOOSSSOOOO......",
    "...WOOOOOOOOOOO......",
  ],
  lanky: [
    "......TTTTTTT........",
    ".....TTTTTOTTT.......",
    ".....TTTTTOTTT.......",
    ".....TTTTTOTTT.......",
    ".....OTTTTYOOO.......",
    ".....OOTTTOOOO.......",
    ".....OOTTTOOOO.......",
    ".....OOSSSOOOO.......",
    "....WOOOOOOOOO.......",
  ],
};

const SIDE_LEGS = {
  short: {
    stand: [
      "..xWOOOOOOOOOOO......",
      "..xW.OOOO.OOOO.......",
      "..x..OOOO.OOOO.......",
      ".....OOOO.OOOO.......",
      ".....BBBB.BBBBBB.....",
      ".....BBBB.BBBBBBB....",
    ],
    walk: [
      "..xWOOOOOOOOOOO......",
      "..xWOOOO..OOOOO......",
      "..xOOOO....OOOO......",
      "..OOOO......OOOO.....",
      ".BBBB........BBBBB...",
      "BBBB.........BBBBBB..",
    ],
    jump: [
      "..xWOOOOOOOOOOO......",
      "..xWOOOOOOOOOOOO.....",
      "..x.OOOO....OOOOO....",
      "...OOOO......BBBBB...",
      "..BBBB.......BBBBBB..",
      ".BBBB................",
    ],
  },
  tall: {
    stand: [
      "..xWOOOOOOOOOOO......",
      "..xW.OOOO.OOOO.......",
      "..xW.OOOO.OOOO.......",
      "..x..OOOO.OOOO.......",
      ".....OOOO.OOOO.......",
      ".....OOOO.OOOO.......",
      ".....OOOO.OOOO.......",
      ".....OOOO.OOOO.......",
      ".....BBBB.BBBBBB.....",
      ".....BBBB.BBBBBBB....",
    ],
    walk: [
      "..xWOOOOOOOOOOO......",
      "..xWOOOOO.OOOOO......",
      "..xWOOOO...OOOO......",
      "..xOOOO.....OOOO.....",
      "..OOOO.......OOOO....",
      ".OOOO.........OOOO...",
      ".OOO...........OOO...",
      "OOO.............OOO..",
      "BBBB............BBBBB",
      "BBB.............BBBBB",
    ],
    jump: [
      "..xWOOOOOOOOOOO......",
      "..xWOOOOOOOOOOOO.....",
      "..x.OOOOOOOOOOOOO....",
      "....OOOO.....OOOO....",
      "...OOOO......OOOO....",
      "...OOOO......BBBBBB..",
      "..OOOO.......BBBBBB..",
      "..OOOO...............",
      ".BBBB................",
      "BBBB.................",
    ],
  },
  lanky: {
    stand: [
      "...xWOOOOOOOOO.......",
      "...xW.OOO.OOO........",
      "...xW.OOO.OOO........",
      "...x..OOO.OOO........",
      "......OOO.OOO........",
      "......OOO.OOO........",
      "......OOO.OOO........",
      "......OOO.OOO........",
      "......OOO.OOO........",
      "......OOO.OOO........",
      "......OOO.OOO........",
      "......BBBB.BBBBBB....",
      ".....BBBBB.BBBBBBB...",
    ],
    walk: [
      "...xWOOOOOOOOO.......",
      "...xWOOOO.OOOO.......",
      "...xOOOO...OOOO......",
      "...OOOO.....OOO......",
      "..OOO.......OOOO.....",
      "..OOO........OOO.....",
      ".OOO.........OOOO....",
      ".OOO..........OOO....",
      "OOO...........OOOO...",
      "OOO............OOO...",
      "OOO............OOO...",
      "BBBB...........BBBBBB",
      "BBB............BBBBBB",
    ],
    jump: [
      "...xWOOOOOOOOO.......",
      "...xWOOOOOOOOOO......",
      "...x.OOOOOOOOOOO.....",
      ".....OOO....OOOO.....",
      "....OOO......OOO.....",
      "....OOO......OOO.....",
      "...OOO.......BBBBBB..",
      "...OOO.......BBBBBB..",
      "..OOO................",
      "..OOO................",
      ".OOO.................",
      "BBBB.................",
      "BBB..................",
    ],
  },
};

// Body type → which front body, side torso and leg set to use
const BODY_TYPES = {
  short:    { front: "short",    torso: "short",    legs: "short" },
  muscular: { front: "muscular", torso: "muscular", legs: "short" },
  wide:     { front: "wide",     torso: "wide",     legs: "short" },
  tall:     { front: "tall",     torso: "tall",     legs: "tall" },
  lanky:    { front: "lanky",    torso: "lanky",    legs: "lanky" },
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

// ===================== composing =====================

function grid(rows) { return rows.map((r) => r.split("")); }
function setter(g) {
  return function set(x, y, ch) { if (g[y] && x >= 0 && x < W) g[y][x] = ch; };
}
function badge(set, look, x0) {
  if ((look.hat || "cap") !== "cap" || !look.letter) return;
  const bits = FONT[String(look.letter).toUpperCase()];
  if (bits) for (let i = 0; i < 15; i++) if (bits[i] === "1") set(x0 + (i % 3), 2 + Math.floor(i / 3), "L");
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function composeFront(look) {
  const type = BODY_TYPES[look.body] || BODY_TYPES.short;
  const g = grid((FRONT_HATS[look.hat] || FRONT_HATS.cap).concat(FRONT_FACE, FRONT_BODIES[type.front]));
  const set = setter(g);
  badge(set, look, 9);

  const facial = look.facial || "mustache";
  if (facial === "clean") {
    range(4, 16).forEach((x) => { set(x, 14, "S"); set(x, 15, "S"); set(x, 16, "S"); });
    set(8, 15, "D"); set(12, 15, "D");
    range(9, 11).forEach((x) => set(x, 16, "D"));
  }
  if (facial === "zigzag") {
    range(4, 16).forEach((x) => set(x, 15, [4, 6, 8, 12, 14, 16].includes(x) ? "M" : "S"));
    set(4, 14, "M"); set(16, 14, "M");
    set(7, 16, "D"); set(13, 16, "D");
    range(8, 12).forEach((x) => set(x, 16, "e"));
  }
  if (facial === "pointy") {
    range(4, 16).forEach((x) => { set(x, 14, "S"); set(x, 15, "S"); });
    range(6, 14).forEach((x) => set(x, 14, "M"));
    set(5, 14, "M"); set(15, 14, "M"); set(4, 13, "M"); set(16, 13, "M");
  }
  if (facial === "beard" || facial === "full") {
    [3, 17].forEach((x) => { set(x, 13, "M"); set(x, 14, "M"); });
    set(4, 14, "M"); set(16, 14, "M");
    range(4, 16).forEach((x) => {
      if (x < 9 || x > 11) { set(x, 15, "M"); set(x, 16, "M"); } else { set(x, 15, "D"); set(x, 16, "M"); }
    });
    range(5, 15).forEach((x) => set(x, 17, "M"));
    range(7, 13).forEach((x) => set(x, 18, "M"));
    if (facial === "full") {
      range(6, 14).forEach((x) => { set(x, 18, "M"); set(x, 19, "M"); });
      range(7, 13).forEach((x) => set(x, 20, "M"));
      range(8, 12).forEach((x) => set(x, 21, "M"));
    }
  }

  if (look.chin === "big") {
    set(3, 16, "S"); set(17, 16, "S");
    range(4, 16).forEach((x) => set(x, 17, "S"));
    range(6, 14).forEach((x) => set(x, 18, "S"));
  }
  if (look.chin === "pointy") {
    set(4, 15, "."); set(16, 15, ".");
    [4, 5, 15, 16].forEach((x) => set(x, 16, "."));
    [5, 6, 14, 15].forEach((x) => set(x, 17, "."));
    range(9, 11).forEach((x) => set(x, 18, "S"));
  }

  if (look.hairStyle === "long" || look.hairStyle === "curly") {
    range(9, 13).forEach((y) => [2, 3, 17, 18].forEach((x) => set(x, y, "H")));
    if (look.hairStyle === "curly") [9, 11, 13].forEach((y) => { set(1, y, "H"); set(19, y, "H"); });
  }
  if (look.peyos) range(13, 17).forEach((y) => { const x = y % 2 ? 2 : 3; set(x, y, "H"); set(20 - x, y, "H"); });
  if (look.glasses) {
    range(10, 12).forEach((y) => [5, 8, 12, 15].forEach((x) => set(x, y, "G")));
    [5, 6, 7, 8, 12, 13, 14, 15].forEach((x) => { set(x, 9, "G"); set(x, 13, "G"); });
    range(9, 11).forEach((x) => set(x, 10, "G"));
    [6, 13].forEach((x) => set(x, 10, "g"));
  }
  return g;
}

function composeSide(look, frame) {
  const type = BODY_TYPES[look.body] || BODY_TYPES.short;
  const torso = SIDE_TORSOS[type.torso].slice();
  const g = grid((SIDE_HATS[look.hat] || SIDE_HATS.cap).concat(SIDE_FACE, torso, SIDE_LEGS[type.legs][frame]));
  const set = setter(g);
  badge(set, look, 11);

  const facial = look.facial || "mustache";
  if (facial === "clean") {
    range(10, 15).forEach((x) => set(x, 14, "S")); set(16, 14, "."); set(17, 14, ".");
    range(11, 15).forEach((x) => set(x, 15, "S")); set(16, 15, ".");
  }
  if (facial === "zigzag") {
    [11, 13, 15].forEach((x) => set(x, 15, "M")); [12, 14].forEach((x) => set(x, 15, "S")); set(16, 15, ".");
    set(12, 16, "D"); set(13, 16, "e"); set(14, 16, "e"); set(15, 16, "D");
  }
  if (facial === "pointy") {
    range(10, 17).forEach((x) => set(x, 14, x <= 15 ? "M" : "."));
    range(11, 15).forEach((x) => set(x, 15, "S")); set(16, 15, ".");
    set(16, 14, "M"); set(17, 14, "M"); set(18, 13, "M"); set(19, 12, "M");
  }
  if (facial === "beard" || facial === "full") {
    range(14, 17).forEach((y) => range(6, 16).forEach((x) => { if (g[y][x] !== ".") set(x, y, "M"); }));
    set(13, 16, "D"); set(14, 16, "D");
    range(8, 14).forEach((x) => set(x, 18, "M"));
    if (facial === "full") { range(9, 14).forEach((x) => set(x, 19, "M")); range(10, 13).forEach((x) => set(x, 20, "M")); }
  }
  if (look.chin === "big") {
    set(16, 16, "S"); set(15, 17, "S"); set(16, 17, "S");
    range(10, 16).forEach((x) => set(x, 18, "S"));
  }
  if (look.chin === "pointy") {
    set(5, 17, ".");
    range(12, 15).forEach((x) => set(x, 18, "S"));
    set(14, 19, "S");
  }
  if (look.hairStyle === "long" || look.hairStyle === "curly") range(13, 16).forEach((y) => range(2, 5).forEach((x) => set(x, y, "H")));
  if (look.peyos) range(13, 17).forEach((y) => set(y % 2 ? 6 : 7, y, "H"));
  if (look.glasses) {
    range(8, 15).forEach((x) => set(x, 10, "G"));
    [11, 12].forEach((y) => { set(12, y, "G"); set(15, y, "G"); });
    set(13, 11, "g");
  }

  // Jump: tuck the hanging arm away and raise a fist
  if (frame === "jump") {
    const top = 18;
    for (let y = top + 2; y < top + torso.length; y++) {
      for (let x = 0; x < W; x++) {
        if (g[y][x] === "S") g[y][x] = y === top + 2 ? "T" : "O";
        else if (g[y][x] === "T" && y >= top + 3) g[y][x] = "O";
      }
    }
    [[14, 18], [15, 18], [16, 17], [17, 17], [17, 16], [18, 16], [18, 15], [19, 15]].forEach(([x, y]) => set(x, y, "T"));
    [[19, 13], [20, 13], [19, 14], [20, 14]].forEach(([x, y]) => set(x, y, "S"));
  }
  return g;
}

// ===================== colors & rendering =====================

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
  const cap = hex(c.cap);
  const p = {
    C: cap, w: [255, 255, 255], L: c.letter ? hex(c.letter) : cap,
    K: hex(c.hat || c.cap), R: hex(c.band || "#3a3a3a"),
    H: hex(c.hair), M: hex(c.beard || c.hair),
    S: hex(c.skin), E: [24, 16, 28], e: [255, 255, 255], D: [140, 40, 40],
    T: hex(c.shirt), O: hex(c.overalls), Y: hex(c.buttons || "#f8d030"),
    W: [246, 246, 246], x: [212, 212, 218], B: hex(c.shoes),
    G: hex(c.glasses || "#5d6678"), g: [200, 236, 255],
  };
  p.c = shade(p.C, 0.72);
  p.k = shade(p.K, 0.72);
  p.s = shade(p.S, 0.82);
  p.N = c.nose ? hex(c.nose) : shade(p.S, 0.93);
  return p;
}

const SHADED = new Set("CKHSTOBMN".split(""));
const OUTLINE = [26, 16, 22];

function render(g, look) {
  const pal = palette(look);
  const w = W + 2, h = g.length + 2;
  const px = new Uint8Array(w * h * 4);
  const at = (x, y) => (g[y] && g[y][x]) || ".";
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < W; x++) {
      const ch = g[y][x];
      if (ch === ".") continue;
      let rgb = pal[ch];
      if (!rgb) throw new Error("no color for " + ch);
      if (SHADED.has(ch) && at(x + 1, y) !== ch && at(x - 1, y) !== ".") rgb = shade(rgb, 0.78);
      const i = ((y + 1) * w + (x + 1)) * 4;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
    }
  }
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

const FRAMES = ["stand", "walk", "jump"];
function renderFront(look) { return render(composeFront(look), look); }
function renderSide(look) {
  const frames = FRAMES.map((f) => render(composeSide(look, f), look));
  return hstack(frames, 0);
}

// Places images side by side, bottom-aligned
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
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ===================== main =====================

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "data/brothers.js"), "utf8"), sandbox);
  const args = process.argv.slice(2);
  const pi = args.indexOf("--preview");
  const preview = pi !== -1 ? args.splice(pi, 2)[1] : null;
  const bros = sandbox.window.JB_BROTHERS.filter((b) => !args.length || args.includes(b.id));

  const rows = [];
  for (const b of bros) {
    if (b.look.handDrawn) { console.log("· " + b.id + " is hand-drawn, skipped"); continue; }
    const front = renderFront(b.look);
    const side = renderSide(b.look);
    const sideFile = b.sprite.replace(/\.png$/, "-side.png");
    for (const [file, img] of [[b.sprite, front], [sideFile, side]]) {
      const out = path.join(root, file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, png(img));
    }
    rows.push(hstack([front, side], 4));
    console.log("✓ " + b.id + ": " + b.sprite + " (" + front.w + "×" + front.h + "), " + sideFile);
  }
  if (preview && rows.length) {
    const sky = [92, 148, 252];
    fs.writeFileSync(preview, png(scaleUp(pad(hstack(rows, 8, sky), 4, sky), 6)));
    console.log("✓ preview " + preview);
  }
}

module.exports = { composeFront, composeSide, renderFront, renderSide, png, FRAMES };
