/* The combination sweep: every pair of decision toggles on the left bar, set against each other, for Sarah, in both
   themes, with 12 weeks of logs and Just joined. In each, it opens Today, Insights, History, Ask, the plus menu, Log a
   BM, symptoms, the meal sheet, FloraScore's detail, Profile and the onboarding the decision picks, and every
   decision's note, and looks for:
   - console errors, page errors, and a module's console.warn (a module that threw, so the core drew in its place)
   - undefined, NaN, null or [object Object] in the phone's text or the notes
   - em or en dashes in the phone's text or the notes
   - a claims-rule hit (the page's own 22-rule check, run on everything the phone shows)
   - sideways overflow: the page, the phone's live screen, or anything drawn past the phone's edge
   - a mention of the check-in while it's off (the phone and the demo time line)
   - a screen that renders blank, or a sheet that doesn't open
   NODE_PATH=$(npm root -g) node work/sweep.js [out.json] [--workers 4] [--only form,look] [--limit 20] [--plan free] [--width 390]
   Pairs that set the same decisions are run once (95 settings, 380 runs with the themes and logs). */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PAGE = "file://" + path.resolve(flag("--page", path.resolve(__dirname, "../prototype/_local.html")));
const OUT = args[0] && !args[0].startsWith("--") ? path.resolve(args[0]) : null;
const WORKERS = +flag("--workers", 4);
const ONLY = flag("--only", null);
const LIMIT = +flag("--limit", 0);
/* the defaults are the sweep as asked (Member, 1440 wide); --plan free and --width 390 run the same pairs on the free
   plan, or with the app full screen on a phone */
const PLAN = flag("--plan", "member");
const WIDTH = +flag("--width", 1440);

/* the decisions on the left bar, default first, as the toggles carry them (data-v) */
const DECS = {
  form: ["C", "A", "B"], bmUI: ["quick", "full"], home: ["score", "day"], history: ["list", "calendar"], checkin: ["true", "false"],
  mealUI: ["quick", "detailed"], look: ["built", "rings", "journal", "bento", "oura", "easy"], easy: ["false", "true"], onboard: ["short", "full"]
};
const KEYS = Object.keys(DECS);
const pairs = [];
const seen = new Set();
const keyOf = (c) => KEYS.map((k) => c[k]).join("|");
const base = Object.fromEntries(KEYS.map((k) => [k, DECS[k][0]]));
const want = ONLY ? ONLY.split(",") : null;
for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++) {
  if (want && !(want.includes(KEYS[i]) || want.includes(KEYS[j]))) continue;
  for (const a of DECS[KEYS[i]]) for (const b of DECS[KEYS[j]]) {
    const c = Object.assign({}, base, { [KEYS[i]]: a, [KEYS[j]]: b });
    const k = keyOf(c);
    if (!seen.has(k)) { seen.add(k); pairs.push(c); }
  }
}
const RUNS = [];
for (const c of pairs) for (const theme of ["light", "dark"]) for (const data of ["est", "fresh"]) RUNS.push(Object.assign({ theme, data }, c));
if (LIMIT) RUNS.splice(LIMIT);

/* the screens, by the list's ids; onboarding is the one the decision picks, so opening it changes nothing */
const SCREENS = ["today", "insights", "i-score", "history", "ask", "plus", "bm", "sym", "meal", "profile", "onb"];
const SHEET = { plus: "plus", bm: "bm", sym: "sym", meal: "meal", profile: "pf", onb: "onb" };
const tagOf = (r) => KEYS.filter((k) => r[k] !== DECS[k][0]).map((k) => `${k}=${r[k]}`).join(",") || "defaults";

async function worker(browser, runs, wi, problems, counts) {
  const ctx = await browser.newContext({ viewport: WIDTH < 760 ? { width: WIDTH, height: 844 } : { width: WIDTH, height: 1000 } });
  const p = await ctx.newPage();
  let where = "load";
  p.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") problems.push({ where, kind: "console error", what: t.slice(0, 300) });
    if (m.type() === "warning" && /module|refresh-|drew nothing|threw|failed/i.test(t)) problems.push({ where, kind: "module warning", what: t.slice(0, 300) });
  });
  p.on("pageerror", (e) => problems.push({ where, kind: "page error", what: String(e.message).slice(0, 300) }));
  await p.goto(PAGE);
  await p.waitForSelector(".rx-stage .ap-rx");
  await p.evaluate(() => document.fonts && document.fonts.ready);
  const click = (k, v) => p.evaluate(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (!b) return "missing"; if (b.disabled) return "disabled"; if (b.getAttribute("aria-pressed") !== "true") b.click(); return "ok"; }, [k, v]);
  for (const r of runs) {
    const tag = `${tagOf(r)} / ${r.theme} / ${r.data === "est" ? "12 weeks" : "fresh"}`;
    where = `${tag} (setting up)`;
    await click("persona", "sarah"); await click("plan", PLAN);
    await click("data", r.data); await click("theme", r.theme);
    for (const k of KEYS) { const s = await click(k, r[k]); if (s !== "ok") problems.push({ where: tag, kind: "toggle", what: `${k}=${r[k]} is ${s}` }); }
    await p.waitForTimeout(150);
    /* the toggles hold what was set (a screen never moves another decision) */
    const held = await p.evaluate((ks) => ks.map((k) => [k, (document.querySelector(`[data-rx="${k}"][aria-pressed="true"]`) || {}).dataset?.v]), KEYS);
    held.forEach(([k, v]) => { if (v !== r[k]) problems.push({ where: tag, kind: "toggle", what: `${k} reads ${v}, set ${r[k]}` }); });
    /* every decision's note, as this setting writes it: no junk, no dashes, nothing said to come later */
    where = `${tag} (decision notes)`;
    const dn = await p.evaluate(() => {
      const out = [];
      for (const b of document.querySelectorAll('[data-rx="dinfo"]')) {
        /* an info button toggles its note: one already showing (the decision just set) is read as it is */
        if (b.getAttribute("aria-pressed") !== "true") b.click();
        const t = (document.querySelector("#rxNotes .rx-note") || {}).textContent || "";
        if (/\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]/.test(t)) out.push(`${b.dataset.v}: junk text`);
        if (/[—–]/.test(t)) out.push(`${b.dataset.v}: a dash`);
        if (/next pass|still to be drawn/i.test(t)) out.push(`${b.dataset.v}: says it comes later`);
        /* fix-core: with the Easy version on, Home and Data style are picked but Easy draws its own Today, so their
           notes say so; every other picked option reads On the phone */
        const badge = (document.querySelector("#rxNotes .rx-opts .is-on .rx-on") || {}).textContent || "";
        const easyOn = (document.querySelector('[data-rx="easy"][data-v="true"]') || {}).getAttribute && document.querySelector('[data-rx="easy"][data-v="true"]').getAttribute("aria-pressed") === "true";
        if (easyOn && ["home", "look"].includes(b.dataset.v)) { if (badge !== "Picked; Easy draws its own") out.push(`${b.dataset.v}: with Easy on, the picked option doesn't say Easy draws its own`); }
        else if (!/On the phone/.test(badge)) out.push(`${b.dataset.v}: the picked option doesn't read On the phone`);
      }
      return out;
    });
    dn.forEach((w) => problems.push({ where, kind: "decision note", what: w }));
    for (const s of SCREENS) {
      const id = s === "onb" ? (r.onboard === "full" ? "onb-full" : "onb-short") : s;
      where = `${tag} ${id}`;
      const opened = await p.evaluate((id) => { const b = document.querySelector(`[data-rx="screen"][data-v="${id}"]`); if (!b || b.disabled) return false; b.click(); return true; }, id);
      if (!opened) { problems.push({ where, kind: "screen", what: "no row in the Screens list, or it's disabled" }); continue; }
      await p.waitForTimeout(320);
      const o = await p.evaluate(([sheet, ckOff]) => {
        const ph = document.querySelector(".rx-stage .ap-rx");
        const ovs = [...ph.querySelectorAll(".ap-o:not(.is-out)")];
        const top = ovs[ovs.length - 1] || null;
        const live = top || ph.querySelector(".ap-layer");
        const out = { issues: [] };
        const bad = (kind, what) => out.issues.push({ kind, what });
        /* everything the phone shows, its toasts and data-msg strings included, and its labels for the screen reader */
        const texts = (el) => el.textContent + " " + [...el.querySelectorAll("[data-msg]")].map((x) => x.dataset.msg).join(" ") + " " + [...el.querySelectorAll("[aria-label]")].map((x) => x.getAttribute("aria-label")).join(" ");
        const phoneText = texts(live) + " " + (top ? "" : texts(ph.querySelector(".ap-tb") || ph));
        const notes = (document.querySelector("#rxNotes") || {}).textContent || "";
        const timeLine = (document.querySelector("[data-time]") || {}).textContent || "";
        const sumLine = (document.querySelector("[data-sum]") || {}).textContent || "";
        const junk = /\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]|\bInfinity\b/;
        const snip = (t, m) => { const i = t.search(m); return i < 0 ? "" : t.slice(Math.max(0, i - 50), i + 60).replace(/\s+/g, " "); };
        if (junk.test(phoneText)) bad("junk text", `phone: ...${snip(phoneText, junk)}...`);
        if (junk.test(notes + " " + timeLine + " " + sumLine)) bad("junk text", `notes: ...${snip(notes + " " + timeLine + " " + sumLine, junk)}...`);
        if (/[—–]/.test(phoneText)) bad("dash", `phone: ...${snip(phoneText, /[—–]/)}...`);
        if (/[—–]/.test(notes + timeLine)) bad("dash", `notes: ...${snip(notes + timeLine, /[—–]/)}...`);
        /* the claims check, on what the phone shows minus the disclaimers (as the notes' check reads it) */
        const clone = live.cloneNode(true);
        clone.querySelectorAll(".ap-fine, [data-disclaimer], svg").forEach((n) => n.remove());
        const hits = (window.FLORIN_REFRESH_CHECK || (() => []))(clone.textContent.replace(/\s+/g, " "));
        hits.forEach((h) => bad("claims", `"${h.text}" (${h.rule.id}: ${h.rule.why})`));
        const lint = (document.querySelector("#rxNotes .rx-lint") || {}).textContent || "";
        if (!/passes all/.test(lint)) bad("claims", `the notes' check: ${lint.trim().slice(0, 200) || "no claims line"}`);
        if (ckOff) {
          const CK = /check-in|check in\b(?! with a clinician)|\bcheckin\b/i;
          const tabs = ph.querySelector(".ap-layer").textContent;
          if (CK.test(phoneText + " " + tabs)) bad("check-in while off", `phone: ...${snip(phoneText + " " + tabs, CK)}...`);
          if (CK.test(timeLine)) bad("check-in while off", `time line: ${timeLine.trim()}`);
        }
        /* overflow: the page, the live screen's scroller, and anything drawn past the phone's screen */
        if (document.documentElement.scrollWidth > window.innerWidth + 1) bad("overflow", `the page scrolls sideways (${document.documentElement.scrollWidth} > ${window.innerWidth})`);
        const box = ph.getBoundingClientRect();
        const scrollers = [live, ...live.querySelectorAll("*")].filter((el) => { const cs = getComputedStyle(el); return /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight; });
        scrollers.forEach((sc) => { const cs = getComputedStyle(sc); if (!/auto|scroll|hidden|clip/.test(cs.overflowX) || cs.overflowX === "visible") return; if (/auto|scroll/.test(cs.overflowX) && sc.scrollWidth > sc.clientWidth + 1 && !sc.matches("[data-hscroll], .ap-chips--scroll")) bad("overflow", `${sc.className.toString().split(" ")[0] || sc.tagName} scrolls sideways (${sc.scrollWidth} > ${sc.clientWidth})`); });
        const past = [];
        /* inside a sideways scroller (a chip row, say) running past the edge is the design; clipped by a box that hides
           its overflow is a cut-off, unless it's a decoration (aria-hidden, or no text and nothing to tap) */
        const sideways = (el) => { for (let a = el.parentElement; a && a !== ph; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true; } return false; };
        const decor = (el) => !!el.closest("[aria-hidden='true']") || (!(el.textContent || "").trim() && !el.matches("button, a, input, select, textarea, [role=button], img, svg"));
        live.querySelectorAll("*").forEach((el) => {
          if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.position === "fixed") return;
          if (r.right > box.right + 1 || r.left < box.left - 1) { if (!sideways(el) && !decor(el)) past.push(`${(el.className && el.className.toString().split(" ")[0]) || el.tagName} "${(el.textContent || "").trim().slice(0, 30)}" ${Math.round(r.left - box.left)}..${Math.round(r.right - box.left)} of ${Math.round(box.width)}`); }
        });
        if (past.length) bad("overflow", `drawn past the phone: ${[...new Set(past)].slice(0, 4).join("; ")}`);
        /* text clipped inside its own box, sideways: a word cut off rather than wrapped */
        const cut = [];
        live.querySelectorAll("button, a, p, h1, h2, h3, h4, span, b, strong, label, li, dt, dd, em").forEach((el) => {
          const cs = getComputedStyle(el);
          if (!(cs.overflowX === "hidden" || cs.overflow === "hidden" || cs.overflowX === "clip")) return;
          if (cs.textOverflow === "ellipsis" || el.clientWidth < 4 || el.querySelector("div, svg, ul, ol, section, article, img, canvas, table")) return;
          if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && el.textContent.trim()) cut.push(`${el.className.toString().split(" ")[0] || el.tagName} "${el.textContent.trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`);
        });
        if (cut.length) bad("overflow", `text cut off: ${[...new Set(cut)].slice(0, 4).join("; ")}`);
        /* blank: the sheet asked for is open, and the screen draws something with height */
        if (sheet && !(top && top.matches(`.ap-o--t-${sheet}`))) bad("blank", `the ${sheet} sheet isn't open (top: ${top ? top.className : "none"})`);
        const vis = [...live.querySelectorAll("h1, h2, h3, p, button, svg, img, li")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > box.top && r.top < box.bottom; });
        if (live.textContent.trim().length < 40 || vis.length < 3) bad("blank", `the screen draws ${vis.length} things and ${live.textContent.trim().length} characters`);
        out.len = live.textContent.trim().length;
        return out;
      }, [SHEET[s] || null, r.checkin === "false"]);
      counts.screens++;
      o.issues.forEach((x) => problems.push(Object.assign({ where }, x)));
    }
    counts.runs++;
    if (counts.runs % 20 === 0) console.log(`  ${counts.runs} of ${RUNS.length} runs, ${problems.length} problems so far`);
  }
  await ctx.close();
}

(async () => {
  const t0 = Date.now();
  console.log(`${pairs.length} settings from every pair of ${KEYS.length} decisions, ${RUNS.length} runs, ${SCREENS.length} screens each, ${WORKERS} at a time (${PLAN}, ${WIDTH} wide)`);
  const browser = await chromium.launch();
  const problems = [], counts = { runs: 0, screens: 0 };
  const slices = Array.from({ length: WORKERS }, (_, i) => RUNS.filter((_, j) => j % WORKERS === i));
  await Promise.all(slices.map((s, i) => worker(browser, s, i, problems, counts)));
  await browser.close();
  /* group what was found: one line per kind and message, with how many places and the first few */
  const groups = {};
  problems.forEach((x) => { const k = `${x.kind}: ${x.what.replace(/\d+(\.\d+)?/g, "#")}`; (groups[k] = groups[k] || { kind: x.kind, what: x.what, n: 0, where: [] }).n++; if (groups[k].where.length < 5) groups[k].where.push(x.where); });
  const list = Object.values(groups).sort((a, b) => b.n - a.n);
  list.forEach((g) => { console.log(`  ✗ [${g.kind}] ${g.what}  (${g.n}x)`); g.where.forEach((w) => console.log(`      at ${w}`)); });
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ runs: RUNS.length, screens: counts.screens, problems, groups: list }, null, 2));
  const secs = Math.round((Date.now() - t0) / 1000);
  console.log(problems.length ? `\n${problems.length} problems in ${list.length} kinds, over ${counts.runs} runs and ${counts.screens} screens (${secs}s)` : `\nSweep clean: ${counts.runs} runs, ${counts.screens} screens, every pair of decisions in both themes, 12 weeks and Just joined (${secs}s).`);
  process.exitCode = problems.length ? 1 : 0;
})();
