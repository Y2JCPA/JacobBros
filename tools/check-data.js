#!/usr/bin/env node
// Checks data/games.js and data/brothers.js for mistakes. Run: node tools/check-data.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { window: {} };
for (const file of ["data/games.js", "data/brothers.js"]) {
  try {
    vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
  } catch (e) {
    console.error(`✗ ${file} has a syntax error:\n  ${e.message}`);
    process.exit(1);
  }
}

const { JB_TAGS: tags, JB_GAMES: games, JB_BROTHERS: bros } = sandbox.window;
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const isHex = (c) => typeof c === "string" && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c);

if (!tags || !Array.isArray(games) || !Array.isArray(bros)) {
  console.error("✗ Expected window.JB_TAGS, window.JB_GAMES and window.JB_BROTHERS to be defined.");
  process.exit(1);
}

const broIds = new Set();
bros.forEach((b, i) => {
  const where = `brothers[${i}] (${b.id || "no id"})`;
  if (!/^[a-z0-9-]+$/.test(b.id || "")) err(where, "id must be lowercase letters, numbers or dashes");
  if (broIds.has(b.id)) err(where, "duplicate id");
  broIds.add(b.id);
  for (const f of ["name", "title", "bio"]) if (!b[f]) err(where, `missing ${f}`);
  if (b.github && !/^[A-Za-z0-9-]+$/.test(b.github)) err(where, "github should be just the username, e.g. \"y2jcpa\"");
  if (!b.sprite) err(where, "missing sprite (e.g. \"assets/bros/" + b.id + ".png\")");
  else if (!fs.existsSync(path.join(root, b.sprite))) err(where, `sprite ${b.sprite} does not exist. Run: node tools/make-bros.js ${b.id}`);
  const look = b.look || {};
  const oneOf = (field, options) => {
    if (look[field] !== undefined && !options.includes(look[field])) err(where, `look.${field} must be one of: ${options.join(", ")}`);
  };
  oneOf("body", ["short", "tall"]);
  oneOf("hat", ["cap", "kippah", "fedora"]);
  oneOf("facial", ["clean", "mustache", "beard", "full"]);
  oneOf("hairStyle", ["short", "long", "curly"]);
  if (look.letter !== undefined && !/^[A-Z1-5]$/i.test(String(look.letter))) err(where, "look.letter must be one letter A-Z (or 1-5)");
  if (!look.handDrawn) {
    const colors = look.colors || {};
    for (const c of ["cap", "shirt", "overalls", "shoes", "skin", "hair"]) {
      if (!isHex(colors[c])) err(where, `look.colors.${c} must be a hex color like "#e52521"`);
    }
    for (const c of ["beard", "buttons", "glasses", "hat", "band"]) {
      if (colors[c] !== undefined && !isHex(colors[c])) err(where, `look.colors.${c} must be a hex color like "#e52521"`);
    }
  }
});

const gameIds = new Set();
games.forEach((g, i) => {
  const where = `games[${i}] (${g.id || "no id"})`;
  if (!/^[a-z0-9-]+$/.test(g.id || "")) err(where, "id must be lowercase letters, numbers or dashes");
  if (gameIds.has(g.id)) err(where, "duplicate id");
  gameIds.add(g.id);
  for (const f of ["title", "blurb", "emoji"]) if (!g[f]) err(where, `missing ${f}`);
  if (!["live", "soon"].includes(g.status)) err(where, 'status must be "live" or "soon"');
  if (g.status === "live" && !/^https?:\/\//.test(g.url || "")) err(where, "a live game needs a url starting with https://");
  if (!tags.types[g.type]) err(where, `type "${g.type}" is not in JB_TAGS.types`);
  for (const [field, list] of [["holidays", tags.holidays], ["ages", tags.ages]]) {
    if (!Array.isArray(g[field]) || g[field].length === 0) err(where, `${field} needs at least one tag`);
    else g[field].forEach((t) => { if (!list[t]) err(where, `${field} tag "${t}" is not in JB_TAGS.${field}`); });
  }
  (g.by || []).forEach((id) => { if (!broIds.has(id)) err(where, `by: "${id}" is not a brother id`); });
  if (g.image && !fs.existsSync(path.join(root, g.image))) err(where, `image ${g.image} does not exist`);
});

if (errors.length) {
  console.error(`✗ Found ${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log(`✓ ${games.length} games and ${bros.length} brothers look good.`);
