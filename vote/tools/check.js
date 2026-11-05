/* Checks for the voting page of the Florin app vote:
     NODE_PATH=$(npm root -g) node vote/tools/check.js [--url <page>] [--shots <dir>] [--only phone|desk]

   It walks the whole vote as a voter would, at 390 by 664 (a phone, touch) and at 1440 by 900, in light and dark: the
   start, every question (a pick, a note on some), Part 2's opening, the review, Copy for Slack and the last screen.
   The page is vote/_local.html from the file system, or --url (the hosted build over http, for one). It fails on:
     console errors or warnings, and script errors;
     a picture that didn't draw, and sideways page scroll;
     the page's own words (outside the pictures, whose words are the app's): an em or en dash, an exclamation point,
       FloraScore split, a claims rule (prototype/js/claims-rules.js);
     a page control under 44 by 44;
     a question whose picks aren't one group of radios in a fieldset, or a Pick that isn't right under its picture;
     on a phone, a Part 1 picture taller than its cut (vote.js's CROP of 844, scaled), a marked part of a screen (the
       check-in card, an Insights card) outside the cut, or an option card whose name, picture and Pick don't fit the
       screen above the bar at its foot;
     on a wide screen, frames side by side under 300px each, or a mouse wheel over a picture that doesn't move the page;
     Part 2's lines: a style with the same line on every chart, or a line that isn't that chart's own;
     the month: either calendar not on the last whole month, or a calendar with fewer days than the month has;
     the review without its send action in the bar at the foot, the last screen thanking before the picks reached Will;
     the copied ballot not reading back (ballot.js parse) with every pick and note;
     vote.css off DESIGN.md's spacing and radius scales.
   --shots <dir> keeps screenshots (each question's first screen, and on a phone each option's card). Exits 1 on any
   failure. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const Q = require(path.join(ROOT, "vote/js/questions.js"));
const B = require(path.join(ROOT, "vote/js/ballot.js"));
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
const URL0 = arg("url") || `file://${path.join(ROOT, "vote/_local.html")}`;
const SHOTS = arg("shots") ? path.resolve(arg("shots")) : null;
const ONLY = arg("only");
const fails = [];
const fail = (where, what) => { fails.push(`${where}: ${what}`); console.log(`FAIL  ${where}: ${what}`); };
const claims = (() => { const box = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "prototype/js/claims-rules.js"), "utf8"), box); return box.window.FLORIN.claimsRules; })();

/* ---------------------------------------------------------------- vote.css on the scale */
(function spacing() {
  const walk = require(path.join(ROOT, "work/css-walk.js"));
  const md = fs.readFileSync(path.join(ROOT, "claude/Florin DESIGN.md"), "utf8");
  const fm = md.split(/^---\s*$/m)[1] || "";
  const block = (name) => { const m = fm.match(new RegExp("^" + name + ":[^\\n]*\\n((?:[ ]{2}.*\\n)+)", "m")); const out = []; if (m) m[1].split("\n").forEach((l) => { const kv = l.match(/^\s{2}([\w-]+):\s*"?([\d.]+)px/); if (kv) out.push(parseFloat(kv[2])); }); return out; };
  const SPACE = new Set([0].concat(block("spacing"))), RAD = new Set(block("rounded").concat([999]));
  const css = fs.readFileSync(path.join(ROOT, "vote/css/vote.css"), "utf8");
  let n = 0;
  walk(css, (rule) => rule.decls.forEach((d) => {
    const sp = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-padding)(-|$)/.test(d.prop);
    const rd = /^border(-[a-z]+)*-radius$/.test(d.prop);
    if (!sp && !rd) return;
    (d.value.match(/-?[\d.]+px/g) || []).forEach((v) => {
      const x = Math.abs(parseFloat(v));
      if ((sp && !SPACE.has(x) && !(/^(inset|top|right|bottom|left)/.test(d.prop) && x <= 3)) || (rd && !RAD.has(x))) { n++; fail("vote.css", `${rule.sel} { ${d.prop}: ${d.value} } line ${d.line}`); }
    });
  }));
  if (!n) console.log("ok    vote.css: every padding, margin, gap, inset and radius on DESIGN.md's scale");
})();

/* ---------------------------------------------------------------- the page */
async function walkVote(br, size, theme) {
  const phone = size.w < 640;
  const tag = `${size.w} ${theme}`;
  const ctx = await br.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone, colorScheme: theme });
  await ctx.addInitScript(() => { window.__copied = []; try { Object.defineProperty(navigator, "clipboard", { value: { writeText: (t) => { window.__copied.push(t); return Promise.resolve(); } }, configurable: true }); } catch (e) { /* the page's fallback */ } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`script error: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(`${m.type()}: ${m.text().slice(0, 240)}`); });
  const dir = SHOTS ? path.join(SHOTS, `${size.w}-${theme}`) : null;
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const shot = async (name, o) => { if (dir) await page.screenshot(Object.assign({ path: path.join(dir, `${name}.png`) }, o || {})); };
  const press = async (sel) => { if (phone) await page.tap(sel); else await page.click(sel); };

  /* the page's own words, its controls and its width, on whatever screen is up */
  const screenCheck = (where) => page.evaluate(() => {
    const root = document.getElementById("vt");
    const clone = root.cloneNode(true);
    clone.querySelectorAll(".vt-fit, .vt-pre, textarea, .vt-vh").forEach((n) => n.remove());
    const text = clone.innerText || clone.textContent;
    const small = [...root.querySelectorAll("button, a[href], summary, label.vt-pick, label.vt-none, input:not(.vt-radio), textarea")]
      .filter((e) => !e.closest(".vt-fit, .vt-big-cover") && !e.classList.contains("vt-big-cover") && e.offsetParent !== null && e.getAttribute("tabindex") !== "-1")
      .map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 28) || e.id || e.tagName, Math.round(r.width), Math.round(r.height)]; })
      .filter(([, w, h]) => w < 44 || h < 44);
    return { text, small, over: document.documentElement.scrollWidth - document.documentElement.clientWidth, missing: root.querySelectorAll(".vt-missing").length };
  }).then((r) => {
    if (/[–—]/.test(r.text)) fail(`${tag} ${where}`, "an em or en dash in the page's words");
    if (/!/.test(r.text)) fail(`${tag} ${where}`, "an exclamation point in the page's words");
    if (/Flora Score|Florascore|Flora-Score/.test(r.text)) fail(`${tag} ${where}`, "FloraScore split");
    claims.forEach((c) => { const m = new RegExp(c.re, "i").exec(r.text); if (m) fail(`${tag} ${where}`, `claims rule ${c.id}: "${m[0]}"`); });
    if (r.small.length) fail(`${tag} ${where}`, `under 44px: ${JSON.stringify(r.small.slice(0, 4))}`);
    if (r.over > 0) fail(`${tag} ${where}`, `${r.over}px of sideways scroll`);
    if (r.missing) fail(`${tag} ${where}`, `${r.missing} picture(s) didn't draw`);
  });

  await page.goto(URL0);
  await page.waitForSelector("#vt h1");
  await page.waitForTimeout(300);
  await shot("00-start");
  await screenCheck("start");
  const start = await page.textContent(".vt-col");
  const [m0, m1] = Q.minutes();
  if (start.indexOf(`About ${m0} to ${m1} minutes`) < 0) fail(`${tag} start`, "the time isn't the computed range");
  if (/and nothing else/.test(start)) fail(`${tag} start`, "the privacy line says nothing else goes to Will");
  await page.fill("#vt-name", "Check Voter");
  await press("[data-x='role'][data-v='design']");
  await press("button[type=submit]");
  await page.waitForSelector(".vt-q");

  const picked = {};
  const lines = {};
  const CROP = await page.evaluate(() => window.VOTE_PAGE.CROP);
  for (let i = 0; i < Q.QS.length; i++) {
    if (await page.$("[data-x='p2-go']")) {
      await shot("p2-open");
      await screenCheck("Part 2's opening");
      const styles = await page.$$eval(".vt-styles li", (ls) => ls.length);
      if (styles !== Q.STYLES.length) fail(`${tag} Part 2's opening`, `${styles} styles listed`);
      await press("[data-x='p2-go']");
    }
    await page.waitForSelector(".vt-q");
    await page.waitForTimeout(phone ? 250 : 350);
    const q = Q.QS[i];
    const where = `${q.n} ${q.id}`;
    const got = await page.evaluate(() => {
      const sec = document.querySelector(".vt-q");
      const opts = [...sec.querySelectorAll(".vt-opt")];
      const r = (e) => e.getBoundingClientRect();
      const fs = sec.querySelector("fieldset.vt-opts");
      const radios = fs ? [...fs.querySelectorAll("input.vt-radio")] : [];
      const bar = sec.querySelector(".vt-actions");
      return {
        q: sec.dataset.q,
        /* the app's own markup inside a picture (aria-hidden, still) may hold radios of its own: those aren't the page's */
        group: !!fs && radios.length === opts.length + 1 && radios.every((x) => x.type === "radio" && x.name === radios[0].name) && ![...sec.querySelectorAll("[role='radiogroup'], [role='radio']")].some((e) => !e.closest(".vt-fit")),
        under: opts.every((o) => { const pic = o.querySelector(".vt-pic"), pk = o.querySelector("label.vt-pick"); return pic && pk && pic.nextElementSibling === pk; }),
        lines: opts.map((o) => [o.dataset.opt, o.querySelector(".vt-line").textContent]),
        spans: opts.map((o) => [o.dataset.opt, (o.querySelector(".vt-fr.is-on .vt-span") || { textContent: "" }).textContent]),
        cards: opts.map((o) => {
          const f = o.querySelector(".vt-fr.is-on .vt-fit"), z = f && f.querySelector(".vt-zoom");
          /* a frame drawn to show one part of a screen (data-vt-at): that part's top is inside the frame as cut */
          const at = o.querySelector(".vt-fr.is-on [data-vt-at]");
          const atIn = !at || !f || (r(at).top >= r(f).top - 1 && r(at).top + Math.min(48, r(at).height) <= r(f).bottom + 1);
          return { id: o.dataset.opt, atIn, h: Math.round(r(o).height), name: Math.round(r(o.querySelector("h2")).top), pickBottom: Math.round(r(o.querySelector("label.vt-pick")).bottom), fitH: f ? Math.round(r(f).height) : 0, crop: f ? f.classList.contains("is-crop") : false, zoom: z ? +z.style.zoom || 1 : 1, side: o.querySelector(".vt-pic").classList.contains("is-side"), phoneW: [...o.querySelectorAll(".vt-pic.is-side .vt-phone, .vt-fr.is-on .vt-phone")].map((p) => Math.round(r(p).width)) };
        }),
        barTop: bar ? Math.round(r(bar).top) : innerHeight,
        sub: (sec.querySelector(".vt-sub") || { textContent: "" }).textContent,
        cal: opts.filter((o) => /^(built|cal-ring)$/.test(o.dataset.opt)).map((o) => [o.dataset.opt, o.querySelectorAll(".vr-cal-d:not(.is-out)").length + o.querySelectorAll(".vr-cal-d.is-out:not(.is-later)").length, (o.querySelector(".vr-cal-t") || { textContent: "" }).textContent])
      };
    });
    if (got.q !== q.id) { fail(tag, `expected ${q.id}, on ${got.q}`); break; }
    if (!got.group) fail(`${tag} ${where}`, "the picks aren't one group of radios in a fieldset");
    if (!got.under) fail(`${tag} ${where}`, "a Pick isn't right under its picture");
    if (q.part === 2 && !/^It answers: “.+”$/.test(got.sub)) fail(`${tag} ${where}`, `the chart's question isn't labelled: "${got.sub}"`);
    got.lines.forEach(([id, l]) => { (lines[id] = lines[id] || new Set()).add(l); if (q.part === 2 && l !== Q.optOf(q, id).line) fail(`${tag} ${where}`, `${id}'s line isn't this chart's`); });
    if (phone && q.part === 1) {
      got.cards.forEach((c) => {
        if (!c.crop) fail(`${tag} ${where}`, `${c.id}'s picture isn't cut on a phone`);
        if (c.fitH > Math.round(CROP * c.zoom) + 1) fail(`${tag} ${where}`, `${c.id}'s picture is ${c.fitH}px, over its cut`);
        if (!c.atIn) fail(`${tag} ${where}`, `${c.id}: the part of the screen the picture is about is outside its cut`);
        if (c.pickBottom - c.name > got.barTop) fail(`${tag} ${where}`, `${c.id}: name to Pick is ${c.pickBottom - c.name}px, more than the screen above the bar (${got.barTop})`);
      });
    }
    if (!phone) got.cards.forEach((c) => { if (c.side && c.phoneW.some((w) => w < 300)) fail(`${tag} ${where}`, `${c.id}: frames side by side at ${c.phoneW.join("/")}px`); });
    if (q.id === "c-month") {
      got.spans.filter(([id]) => /^(built|cal-ring)$/.test(id)).forEach(([id, sp]) => { if (/so far/.test(sp)) fail(`${tag} ${where}`, `${id} draws a month barely begun: "${sp}"`); });
      got.cal.forEach(([id, n, t]) => { if (n < 28) fail(`${tag} ${where}`, `${id}'s calendar (${t}) has ${n} days`); });
    }
    await shot(`${String(q.n).padStart(2, "0")}-${q.id}`);
    await screenCheck(where);
    /* on a phone: each option's card in turn, by the arrow */
    if (phone && dir && i < 8) {
      for (let k = 1; k < got.cards.length; k++) {
        await press("[data-x='nav'][data-d='1']");
        await page.waitForTimeout(450);
      }
      const card = await page.$(".vt-opt");
      if (card) {
        await page.evaluate(() => document.querySelector(".vt-row").scrollTo({ left: 0 }));
        await page.waitForTimeout(250);
        await page.evaluate(() => { const o = document.querySelector(".vt-opt"); scrollTo(0, o.getBoundingClientRect().top + scrollY - 8); });
        await page.waitForTimeout(150);
        await shot(`${String(q.n).padStart(2, "0")}-${q.id}-card`);
        await page.evaluate(() => scrollTo(0, 0));
      }
    }
    /* on a wide screen: the wheel over a picture moves the page */
    if (!phone && i === 0) {
      const box = await (await page.$(".vt-opt .vt-fit")).boundingBox();
      const y0 = await page.evaluate(() => scrollY);
      await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 200, 800));
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => scrollY);
      if (y1 - y0 < 200) fail(`${tag} ${where}`, `a wheel over the picture moved the page ${y1 - y0}px`);
      await page.evaluate(() => scrollTo(0, 0));
    }
    /* the pick: the second option shown (the first when there's one), by its label; a note on every fourth */
    const ids = got.cards.map((c) => c.id);
    const pk = ids[1] || ids[0];
    await page.evaluate((id) => document.querySelector(`.vt-opt[data-opt='${id}'] label.vt-pick`).scrollIntoView({ block: "center" }), pk);
    await press(`.vt-opt[data-opt='${pk}'] label.vt-pick`);
    const on = await page.evaluate((id) => ({ checked: document.querySelector(`.vt-opt[data-opt='${id}'] input.vt-radio`).checked, card: document.querySelector(`.vt-opt[data-opt='${id}']`).classList.contains("is-on") }), pk);
    if (!on.checked || !on.card) fail(`${tag} ${where}`, "a press on Pick didn't pick");
    picked[q.id] = { p: pk, note: "" };
    if (i % 4 === 0) {
      const note = `Option ${pk} reads fastest for me, & it's < busy.`;
      await page.fill("#vt-note", note);
      picked[q.id].note = note;
    }
    await press("[data-x='next']");
    await page.waitForTimeout(200);
  }

  /* Part 2's lines differ chart to chart */
  Q.STYLES.forEach((s) => { if (lines[s.id] && lines[s.id].size < 2) fail(tag, `${s.name} has one line on every chart`); });

  await page.waitForSelector(".vt-send");
  await shot("90-review");
  await screenCheck("review");
  const barBtn = await page.$(".vt-actions [data-x='copy'], .vt-actions [data-x='send']");
  if (!barBtn) fail(`${tag} review`, "no send action in the bar at the foot");
  else {
    const bb = await barBtn.boundingBox();
    if (bb.y + bb.height > size.h + 1) fail(`${tag} review`, "the bar's send action is off the screen");
  }
  await page.click(".vt-actions [data-x='copy'], .vt-actions [data-x='send']");
  await page.waitForSelector(".vt-col h1");
  await page.waitForTimeout(300);
  await shot("91-last");
  await screenCheck("last screen");
  const head = await page.textContent(".vt-col h1");
  if (/^Thanks/.test(head)) fail(`${tag} last screen`, `"${head}" before the picks reached Will`);
  const lead = await page.textContent(".vt-col .vt-lead");
  if ((lead.match(/Slack/g) || []).length > 1 || (await page.$$eval(".vt-col p", (ps) => ps.filter((p) => /Paste/.test(p.textContent)).length)) > 1) fail(`${tag} last screen`, "the instruction is said twice");
  const copied = await page.evaluate(() => window.__copied);
  if (copied.length !== 1) fail(`${tag} copy`, `${copied.length} messages copied`);
  else {
    const back = B.parse(copied[0]);
    if (back.length !== 1 || !back[0].ok || back[0].flags.length) fail(`${tag} copy`, `the copied ballot reads back as ${JSON.stringify(back.map((b) => [b.ok, b.flags]))}`);
    else {
      const want = {};
      Object.keys(picked).forEach((k) => { want[k] = { p: picked[k].p, note: picked[k].note.replace(/\s+/g, " ").trim() }; });
      if (JSON.stringify(back[0].picks) !== JSON.stringify(Object.fromEntries(Q.QS.filter((qq) => want[qq.id]).map((qq) => [qq.id, want[qq.id]])))) fail(`${tag} copy`, "the copied ballot's picks or notes differ from what was picked");
      if (back[0].name !== "Check Voter" || back[0].role !== "design") fail(`${tag} copy`, "the copied ballot's name or role");
    }
    if (dir) fs.writeFileSync(path.join(dir, "copied.txt"), copied[0]);
  }
  errs.forEach((e) => fail(tag, e));
  await ctx.close();
  console.log(`${fails.length ? "done " : "ok   "} ${tag}: the whole vote walked`);
}

(async () => {
  const { chromium } = require("playwright");
  const br = await chromium.launch();
  try {
    const sizes = [{ w: 390, h: 664 }, { w: 1440, h: 900 }].filter((s) => !ONLY || (ONLY === "phone" ? s.w < 640 : s.w >= 640));
    for (const size of sizes) for (const theme of ["light", "dark"]) await walkVote(br, size, theme);
  } finally { await br.close(); }
  console.log(fails.length ? `\n${fails.length} failed` : "\nall clean");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
