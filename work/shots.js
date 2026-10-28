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

/* every screen in the Screens list, the modules' included, read from the page. The Membership screens switch the demo
   to Free, so they're taken once, in the first state */
const FREE = ["pay", "free-insights", "free-ask"];
/* each state sets these page controls (the rest stay at their defaults: Sarah, check-in on, quick tiles, and the
   module decisions as built) */
const STATES = [
  { id: "C-light-est", form: "C", theme: "light", data: "est" },
  { id: "A-light-est", form: "A", theme: "light", data: "est" },
  { id: "B-light-est", form: "B", theme: "light", data: "est" },
  { id: "C-dark-est", form: "C", theme: "dark", data: "est" },
  { id: "C-light-new", form: "C", theme: "light", data: "new" },
  { id: "C-light-fresh", form: "C", theme: "light", data: "fresh" },
  { id: "C-dark-ckoff", form: "C", theme: "dark", data: "est", checkin: "false", persona: "marcus" },
  { id: "C-light-full", form: "C", theme: "light", data: "est", bmUI: "full", persona: "alex" },
  { id: "C-dark-modules", form: "C", theme: "dark", data: "est", home: "day", history: "calendar", look: "oura", onboard: "full" },
  { id: "C-light-easy", form: "C", theme: "light", data: "est", easy: "true" },
  { id: "C-light-fresh-easy", form: "C", theme: "light", data: "fresh", easy: "true", look: "rings" }
];
const DEFAULTS = { persona: "sarah", checkin: "true", bmUI: "quick", mealUI: "quick", home: "score", history: "list", look: "built", easy: "false", onboard: "short" };
/* the controls a state sets. A module's screen sets its own decision (Home: Day first, Easy version, the onboarding
   screens), so each shot puts the state back first, and the screen sets only its own */
const SET = ["persona", "data", "form", "theme", "checkin", "bmUI", "mealUI", "home", "history", "look", "easy", "onboard"];
const pick = (page, k, v) => page.evaluate(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (b && !b.disabled && b.getAttribute("aria-pressed") !== "true") b.click(); }, [k, v]);

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
  const SCREENS = await page.$$eval('[data-rx="screen"]', (bs) => bs.map((b) => b.dataset.v));
  for (const [si, s0] of STATES.entries()) {
    const s = Object.assign({}, DEFAULTS, s0);
    for (const id of SCREENS) {
      if (ONLY && !ONLY.includes(id)) continue;
      if (FREE.includes(id) && si > 0) continue;
      for (const k of SET) await pick(page, k, s[k]);
      await pick(page, "plan", "member");
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
  for (const k of SET) await pick(page, k, Object.assign({ data: "est", form: "C", theme: "light" }, DEFAULTS)[k]);
  await pick(page, "plan", "member");
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
  /* the notes' claims line shows only when a screen fails a rule: no line is a pass */
  report.filter((r) => r.lint).forEach((r) => console.log("LINT", r.state, r.screen, r.lint));
  await browser.close();
})();
