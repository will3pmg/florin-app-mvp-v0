/* Screenshots of every prototype screen, in each state that matters, and of the page itself.
   NODE_PATH=$(npm root -g) node work/shots.js <out-dir> [screen ids, comma separated]
   Captures the phone only (the .rx-stage) at 1440 wide, plus console errors and the notes panel's claims line, then the
   whole page at 1440 and 1100 wide and the phone layout at 390 (with its Toggles and Notes sheets open). */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = path.resolve(process.argv[2] || "shots");
const ONLY = process.argv[3] ? process.argv[3].split(",") : null;
const PAGE = "file://" + path.resolve(__dirname, "../prototype/_local.html");
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = ["today", "ck-card", "plus", "earlier", "bm", "bm-details", "guide", "flag", "sym", "meal", "ck", "ck-last", "ckdone", "ckday", "history", "insights", "i-score", "i-timing", "i-often", "i-form", "i-sym", "i-ck", "i-pat", "i-pattern", "ask-about", "ask"];
/* each state sets these page controls (the rest stay at their defaults: Sarah, check-in on, quick tiles) */
const STATES = [
  { id: "C-light-est", form: "C", theme: "light", data: "est" },
  { id: "A-light-est", form: "A", theme: "light", data: "est" },
  { id: "B-light-est", form: "B", theme: "light", data: "est" },
  { id: "C-dark-est", form: "C", theme: "dark", data: "est" },
  { id: "C-light-new", form: "C", theme: "light", data: "new" },
  { id: "C-light-fresh", form: "C", theme: "light", data: "fresh" },
  { id: "C-dark-ckoff", form: "C", theme: "dark", data: "est", checkin: "false", persona: "marcus" },
  { id: "C-light-full", form: "C", theme: "light", data: "est", bmUI: "full", persona: "alex" }
];
const DEFAULTS = { persona: "sarah", checkin: "true", bmUI: "quick" };
const pick = (page, k, v) => page.evaluate(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (b && !b.disabled) b.click(); }, [k, v]);

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
  for (const s0 of STATES) {
    const s = Object.assign({}, DEFAULTS, s0);
    for (const k of ["persona", "data", "form", "theme", "checkin", "bmUI"]) await pick(page, k, s[k]);
    await pick(page, "plan", "member");
    for (const id of SCREENS) {
      if (ONLY && !ONLY.includes(id)) continue;
      /* a screen the decisions switched off (the check-in's, with it off) is skipped */
      if (await page.$eval(`[data-rx="screen"][data-v="${id}"]`, (b) => b.disabled).catch(() => true)) continue;
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
  for (const k of ["persona", "data", "form", "theme", "checkin", "bmUI"]) await pick(page, k, Object.assign({ data: "est", form: "C", theme: "light" }, DEFAULTS)[k]);
  await ctx.close();

  /* the page: 1440 and 1100 wide, and the phone layout at 390 with each sheet */
  if (!ONLY || ONLY.includes("page")) {
    for (const [w, h] of [[1440, 1000], [1100, 900], [390, 844]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await c.newPage();
      p.on("pageerror", (e) => errors.push(`${w}: ${e}`));
      await p.goto(PAGE);
      await p.waitForSelector(".ap-rx");
      await p.evaluate(() => document.fonts && document.fonts.ready);
      await p.waitForTimeout(1200);
      await p.screenshot({ path: path.join(OUT, `page-${w}.png`) });
      if (w < 760) {
        for (const sh of ["toggles", "notes"]) {
          await p.click(`.rx-mbar [data-v="${sh}"]`);
          await p.waitForTimeout(600);
          await p.screenshot({ path: path.join(OUT, `page-${w}-${sh}.png`) });
          await p.keyboard.press("Escape");
          await p.waitForTimeout(300);
        }
      } else {
        await p.screenshot({ path: path.join(OUT, `page-${w}-full.png`), fullPage: true });
      }
      await c.close();
    }
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ errors, report }, null, 2));
  console.log(`${report.length} shots, ${errors.length} console errors`);
  errors.forEach((e) => console.log("ERR", e));
  report.filter((r) => !/passes all/.test(r.lint)).forEach((r) => console.log("LINT", r.state, r.screen, r.lint));
  await browser.close();
})();
