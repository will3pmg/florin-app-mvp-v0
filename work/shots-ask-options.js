/* the pictures for options/ask (Ask button options): Insights in Will's picks, 30 days, each Ask button style, light and dark,
   at 390 wide and deviceScaleFactor 2, as PNGs in the directory given (convert them to WebP under options/ask/img) */
const { chromium } = require("playwright");
const path = require("path");
const RAW = process.argv[2] || require("os").tmpdir() + "/ask-options-raw";
require("fs").mkdirSync(RAW, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const theme of ["light", "dark"]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
    p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await p.goto("file:///home/user/florin-app-mvp-v0/prototype/_local.html"); await p.waitForSelector(".ap-rx");
    for (const ui of ["pill", "compact", "link", "icon", "chip", "bar"]) {
      await p.evaluate(([ui, theme]) => { const api = window.FLORIN_EXT.api; api.set("theme", theme); api.set("look", "picks"); api.set("askUI", ui); api.open("insights"); }, [ui, theme]);
      await p.waitForTimeout(1800);
      await p.evaluate(() => document.querySelector(".rx-stage .ap-rx").classList.add("is-full"));
      for (const [card, sel] of [["score", '.ap-ins .ap-ic:has(.ap-askw[data-k="score"])'], ["timing", '[data-rlk-k="timing"]']]) {
        const el = await p.$(`.rx-stage .ap-rx ${sel}`);
        if (!el) { errs.push(`no ${card} for ${ui}`); continue; }
        await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
        const r = await el.boundingBox();
        const pad = 12, x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
        const f = `${RAW}/${ui}-${card}-${theme}.png`;
        await p.screenshot({ path: f, clip: { x, y, width: Math.min(390 - x, r.width + 2 * pad), height: r.height + 2 * pad } });
      }
    }
    await p.close();
  }
  console.log("errs", errs);
  await b.close();
})();
