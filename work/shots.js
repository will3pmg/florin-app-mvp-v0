/* Screenshots of every prototype screen, in each state that matters.
   NODE_PATH=$(npm root -g) node work/shots.js <out-dir> [screen ids, comma separated]
   Captures the phone only (the .rx-dev frame) at 1440 wide, plus console errors and the notes panel's claims line. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.resolve(process.argv[2] || "shots");
const ONLY = process.argv[3] ? process.argv[3].split(",") : null;
const PAGE = "file://" + path.resolve(__dirname, "../prototype/_local.html");
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = ["today", "ck-card", "plus", "earlier", "bm", "bm-details", "guide", "flag", "sym", "meal", "ck", "ck-last", "ckdone", "ckday", "history", "insights", "i-timing", "i-often", "i-form", "i-sym", "i-ck", "i-pat", "i-pattern", "ask-about", "ask"];
const STATES = [
  { id: "C-light-est", form: "C", theme: "light", data: "est" },
  { id: "A-light-est", form: "A", theme: "light", data: "est" },
  { id: "B-light-est", form: "B", theme: "light", data: "est" },
  { id: "C-dark-est", form: "C", theme: "dark", data: "est" },
  { id: "C-light-new", form: "C", theme: "light", data: "new" }
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForSelector(".ap-rx");
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const report = [];
  for (const s of STATES) {
    await page.click(`.rx-head [data-rx="form"][data-v="${s.form}"]`).catch(() => {});
    await page.click(`.rx-side [data-rx="theme"][data-v="${s.theme}"]`);
    await page.click(`.rx-side [data-rx="data"][data-v="${s.data}"]`);
    for (const id of SCREENS) {
      if (ONLY && !ONLY.includes(id)) continue;
      await page.click(`.rx-side [data-rx="screen"][data-v="${id}"]`);
      await page.waitForTimeout(450);
      const el = await page.$(".rx-stage");
      const file = path.join(OUT, `${s.id}--${id}.png`);
      await el.screenshot({ path: file });
      /* the rest of a long screen, a phone-height at a time */
      const segs = await page.evaluate(() => {
        const ph = document.querySelector(".rx-stage .ap-rx");
        const ovs = ph.querySelectorAll(".ap-o:not(.is-out)");
        const ov = ovs[ovs.length - 1];
        const sc = ov ? ov.querySelector(".ap-fsh-b, .ap-ck-b") || ov.querySelector(".ap-psh") : ph.querySelector(".ap-layer");
        if (!sc) return 0;
        sc.setAttribute("data-shot", "1");
        return Math.min(4, Math.ceil((sc.scrollHeight - sc.clientHeight) / (sc.clientHeight * 0.75)));
      });
      for (let i = 1; i <= segs; i++) {
        await page.evaluate((i) => { const sc = document.querySelector("[data-shot]"); sc.scrollTop = sc.clientHeight * 0.75 * i; }, i);
        await page.waitForTimeout(120);
        await el.screenshot({ path: file.replace(/\.png$/, `--s${i}.png`) });
      }
      await page.evaluate(() => { const sc = document.querySelector("[data-shot]"); if (sc) { sc.scrollTop = 0; sc.removeAttribute("data-shot"); } });
      const lint = await page.$eval("#rxNotes .rx-lint", (n) => n.textContent.trim()).catch(() => "");
      report.push({ state: s.id, screen: id, file, lint });
    }
  }
  /* the A and B comparison */
  if (!ONLY || ONLY.includes("compare")) {
    await page.click(`.rx-side [data-rx="theme"][data-v="light"]`);
    await page.click(`.rx-side [data-rx="data"][data-v="est"]`);
    await page.click(`.rx-side [data-rx="screen"][data-v="compare-bm"]`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "compare-full.png"), fullPage: true });
    await page.click(`[data-rx="compare"]`);
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ errors, report }, null, 2));
  console.log(`${report.length} shots, ${errors.length} console errors`);
  errors.forEach((e) => console.log("ERR", e));
  report.filter((r) => !/passes all/.test(r.lint)).forEach((r) => console.log("LINT", r.state, r.screen, r.lint));
  await browser.close();
})();
