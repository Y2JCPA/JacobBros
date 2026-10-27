#!/usr/bin/env node
/*
 * Stamps every local script and stylesheet link in index.html with a short
 * hash of the file's contents (css/style.css?v=1a2b3c4d), so browsers load
 * the new file as soon as it changes instead of using a cached copy for up
 * to 10 minutes (GitHub Pages caches every file that long).
 *
 *   node tools/stamp.js           update index.html
 *   node tools/stamp.js --check   fail if any stamp is out of date (CI runs this)
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const page = path.join(root, "index.html");
const check = process.argv.includes("--check");

const hashOf = (file) => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8);

const html = fs.readFileSync(page, "utf8");
const stale = [];
const out = html.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")((?:js|css|data)\/[^"?]+\.(?:js|css))(?:\?v=([0-9a-f]+))?(")/g,
  (all, before, file, current, after) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) return all;
    const v = hashOf(full);
    if (v !== current) stale.push(file);
    return before + file + "?v=" + v + after;
  });

if (check) {
  if (stale.length) {
    console.error("✗ index.html has out-of-date version stamps for: " + stale.join(", "));
    console.error("  Run: node tools/stamp.js");
    process.exit(1);
  }
  console.log("✓ index.html version stamps are up to date");
} else {
  fs.writeFileSync(page, out);
  console.log(stale.length ? "✓ stamped " + stale.join(", ") : "✓ all stamps already up to date");
}
