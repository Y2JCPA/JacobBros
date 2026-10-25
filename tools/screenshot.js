#!/usr/bin/env node
// Takes card thumbnails of live games into assets/shots/<id>.jpg.
// Run: node tools/screenshot.js            (all live games)
//      node tools/screenshot.js dreidel    (just one)
// Needs Playwright (npm i -g playwright && npx playwright install chromium).
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/games.js"), "utf8"), sandbox);
const only = process.argv.slice(2);
const games = sandbox.window.JB_GAMES.filter((g) => g.status === "live" && g.url && (!only.length || only.includes(g.id)));

(async () => {
  const outDir = path.join(root, "assets/shots");
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
  for (const g of games) {
    try {
      await page.goto(g.url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(3000);
      const file = path.join(outDir, g.id + ".jpg");
      await page.screenshot({ path: file, type: "jpeg", quality: 72 });
      console.log("✓", g.id);
    } catch (e) {
      console.log("✗", g.id, e.message.split("\n")[0]);
    }
  }
  await browser.close();
})();
