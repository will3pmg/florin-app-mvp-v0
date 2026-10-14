/* Screenshots of the data looks, card by card, with console errors and the claims check per card.
   NODE_PATH=$(npm root -g) node work/shots-library.js <out-dir> [look id] [persona]
   Writes <look>--<theme>--<component>.png at 2x, and prints a report. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const OUT = path.resolve(process.argv[2] || "shots-library");
const ONLY = process.argv[3] || null;
const WHO = process.argv[4] || "sarah";
const PAGE = "file://" + path.resolve(__dirname, "../library/_local.html");
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(PAGE);
  await p.waitForSelector(".lb-row");
  await p.evaluate(() => document.fonts && document.fonts.ready);
  const report = [];
  for (const theme of ["light", "dark"]) {
    await p.evaluate(([theme, who]) => { const S = window.FLLIB.state; S.theme = theme; S.persona = who; document.documentElement.setAttribute("data-theme", theme); window.FLLIB.render(); }, [theme, WHO]);
    await p.waitForTimeout(1600);
    const looks = await p.evaluate(() => (window.FLOOKS || []).map((l) => l.id));
    for (const look of looks) {
      if (ONLY && look !== ONLY) continue;
      const keys = await p.evaluate(() => window.FLLIB.COMPONENTS.map((c) => c[0]));
      for (const k of keys) {
        const sel = `.lb-cell[data-look="${look}"] .lb-phonecard[data-k="${k}"]`;
        const el = await p.$(sel);
        if (!el) { report.push(`${look} ${theme} ${k}: missing`); continue; }
        await el.screenshot({ path: path.join(OUT, `${look}--${theme}--${k}.png`) });
        const info = await p.evaluate((sel) => {
          const el = document.querySelector(sel), rules = (window.FLORIN || {}).claimsRules || [];
          const c = el.cloneNode(true); c.querySelectorAll(".ap-fine, [data-disclaimer]").forEach((n) => n.remove());
          const text = c.textContent.replace(/\s+/g, " ");
          const hits = rules.filter((r) => new RegExp(r.re, "i").test(text)).map((r) => r.id);
          const wide = el.scrollWidth > el.clientWidth + 1;
          return { hits, wide, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) };
        }, sel);
        if (info.hits.length || info.wide) report.push(`${look} ${theme} ${k}: ${info.hits.length ? "claims " + info.hits.join(",") : ""} ${info.wide ? "overflows its card" : ""}`);
      }
    }
  }
  await b.close();
  console.log(report.length ? report.join("\n") : "Every card passes the claims check and fits its width.");
  console.log(errs.length ? `${errs.length} console errors:\n` + [...new Set(errs)].slice(0, 8).join("\n") : "No console errors.");
})();
