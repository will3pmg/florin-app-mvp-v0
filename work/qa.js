/* QA for the refresh prototype. Run before every publish.
   NODE_PATH=$(npm root -g) node work/qa.js
   - console errors and page errors, at 1440, 1100, 900, 390, 375 and 360 wide
   - sideways scroll on the page, at every width
   - every screen through the 22 claims rules (the notes panel's own check), in A, B and C, established and new, and
     with the decisions toggled (check-in off, full BM form only, Just joined, Day first, Calendar, each data style,
     the full survey, the Easy version), across the three people and both themes
   - with the check-in off, no screen may mention it
   - tap targets under 44px inside the phone, at 390 wide where the app fills the screen at full size
   - the BM tiles' words on one line at 360, 375 and 390, and Read the note clear of the phone from 760 to 1019 wide
   - em dashes and exclamation points in any user-facing string in the source, modules included */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const PAGE = "file://" + path.resolve(__dirname, "../prototype/_local.html");
const problems = [];
const note = (s) => { problems.push(s); console.log("  ✗ " + s); };
/* a run: a consistency option, the logs, and any decisions or demo controls to set first (the rest stay at default) */
const BASE = { persona: "sarah", data: "est", form: "C", theme: "light", checkin: "true", bmUI: "quick", mealUI: "quick", home: "score", history: "list", look: "built", easy: "false", onboard: "short" };
/* every control a run sets, the module decisions included: a sweep of the Screens list sets the decisions its screens
   belong to (Home: Day first, History: Calendar, the onboarding screens, Easy version), so each run puts them back */
const SET = ["persona", "data", "form", "theme", "checkin", "bmUI", "mealUI", "home", "history", "look", "easy", "onboard"];
const WIDE = [
  { form: "A" }, { form: "B" }, { form: "C" }, { form: "A", data: "new" }, { form: "C", data: "new" }
];
/* the decisions, each toggle across the three people and both themes */
const TOGGLES = [
  { checkin: "false", persona: "sarah" }, { checkin: "false", persona: "marcus", theme: "dark", form: "B" }, { checkin: "false", persona: "alex", data: "new" },
  { bmUI: "full", persona: "sarah", theme: "dark" }, { bmUI: "full", persona: "marcus", form: "A" }, { bmUI: "full", persona: "alex", theme: "dark" },
  { data: "fresh", persona: "sarah" }, { data: "fresh", persona: "marcus", theme: "dark" }, { data: "fresh", persona: "alex", form: "A" },
  { data: "fresh", checkin: "false", bmUI: "full", persona: "sarah", theme: "dark", form: "B" },
  /* the module decisions: Day first and Calendar, each data style, the full survey and the Easy version */
  { home: "day", history: "calendar", persona: "marcus", theme: "dark" }, { look: "rings", data: "fresh" }, { look: "journal", form: "B", checkin: "false" },
  { look: "bento", persona: "alex", theme: "dark" }, { look: "oura", home: "day" }, { look: "easy", onboard: "full", persona: "marcus" },
  { easy: "true", persona: "alex", theme: "dark" }, { easy: "true", data: "fresh", checkin: "false", bmUI: "full" }
];
const NARROW = [{ form: "A" }, { data: "fresh", checkin: "false", bmUI: "full", theme: "dark" }, { bmUI: "full", persona: "marcus", data: "new" }, { easy: "true", history: "calendar" }, { home: "day", look: "oura", theme: "dark" }];

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[1440, 1000], [1100, 900], [900, 900], [390, 844], [375, 812], [360, 780]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    p.on("console", (m) => { if (m.type() === "error") note(`${w}: console: ${m.text()}`); });
    p.on("pageerror", (e) => note(`${w}: pageerror: ${e.message}`));
    await p.goto(PAGE);
    await p.waitForSelector(".ap-rx");
    const mobile = w < 760;
    const runs = (w === 1440 ? WIDE.concat(TOGGLES) : w === 390 ? NARROW : w < 760 ? NARROW.slice(0, 1) : WIDE.slice(0, 3).concat(TOGGLES.slice(0, 1), TOGGLES.slice(3, 4), TOGGLES.slice(6, 7))).map((r) => Object.assign({}, BASE, r));
    for (const r of runs) {
      /* the controls exist once: in the side bar, or in the Toggles sheet on a phone; a click reaches them either way */
      for (const k of SET) {
        await p.evaluate(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (b && b.getAttribute("aria-pressed") !== "true") b.click(); }, [k, r[k]]);
      }
      /* a free screen in the list switches the demo to Free; each run starts on Member */
      await p.evaluate(() => { const b = document.querySelector('[data-rx="plan"][data-v="member"]'); if (b) b.click(); });
      await p.waitForTimeout(200);
      const ids = await p.$$eval('[data-rx="screen"]:not([disabled])', (bs) => bs.map((b) => b.dataset.v));
      const tagR = `${w} ${r.persona}/${r.form}/${r.data}/${r.theme}${r.checkin === "false" ? "/check-in off" : ""}${r.bmUI === "full" ? "/full form" : ""}${["mealUI", "home", "history", "look", "easy", "onboard"].filter((k) => r[k] !== BASE[k]).map((k) => `/${k} ${r[k]}`).join("")}`;
      if (r.checkin === "false" && ids.some((id) => ["ck", "ck-card", "ck-last", "ckdone", "ckday", "i-ck"].includes(id))) note(`${tagR}: check-in screens still open from the list`);
      for (const id of ids) {
        await p.evaluate((id) => { const b = document.querySelector(`[data-rx="screen"][data-v="${id}"]`); b && b.click(); }, id);
        await p.waitForTimeout(mobile ? 380 : 300);
        const o = await p.evaluate(() => {
          const out = { overflow: document.documentElement.scrollWidth > window.innerWidth + 1, lint: (document.querySelector("#rxNotes .rx-lint") || {}).textContent || "" };
          const ph = document.querySelector(".rx-stage .ap-rx");
          const live = [...ph.querySelectorAll(".ap-o:not(.is-out)")].pop() || ph.querySelector(".ap-layer");
          out.text = live.textContent + " " + [...live.querySelectorAll("[data-msg]")].map((x) => x.dataset.msg).join(" ");
          out.tabs = ph.querySelector(".ap-layer").textContent;
          /* small tap targets inside the phone, at full scale only */
          const scale = ph.getBoundingClientRect().width / ph.offsetWidth;
          out.small = [];
          if (Math.abs(scale - 1) < 0.01) {
            ph.querySelectorAll(".ap-o:not(.is-out):last-child button, .ap-o:not(.is-out):last-child [role=button], .ap-o:not(.is-out):last-child input, .ap-o:not(.is-out):last-child select, .ap-o:not(.is-out):last-child summary" + (ph.querySelector(".ap-o:not(.is-out)") ? "" : ", .ap-layer button, .ap-layer summary, .ap-tb button")).forEach((b) => {
              const r = b.getBoundingClientRect();
              if (!r.width || !r.height || b.closest("[hidden]")) return;
              if (b.matches(".ap-o-scrim")) return;
              /* the real target: probe outward from the centre with elementFromPoint, so a ::before or ::after hit area
                 counts, and one clipped by a scrolling parent doesn't. Off screen, add the pseudo insets instead */
              let w = r.width, h = r.height;
              const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
              const hit = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === b || b.contains(e)); };
              /* probe only when the target and a margin round it are on screen, and its own box isn't covered or scrolled
                 out of its container (a sheet's footer, say); elementFromPoint can't see past the window */
              const whole = hit(cx, r.top + 1) && hit(cx, r.bottom - 1) && hit(r.left + 1, cy) && hit(r.right - 1, cy);
              /* the target's own box plus its ::before or ::after hit area, as the CSS draws it */
              let ew = 0, eh = 0;
              for (const pe of ["::before", "::after"]) {
                const a = getComputedStyle(b, pe);
                if (a.content === "none" || a.position !== "absolute") continue;
                const px = (v) => Math.max(0, -(parseFloat(v) || 0));
                ew = Math.max(ew, px(a.left) + px(a.right)); eh = Math.max(eh, px(a.top) + px(a.bottom));
              }
              if (r.left > 12 && r.top > 12 && r.right < innerWidth - 12 && r.bottom < innerHeight - 12 && whole) {
                /* the app's fixed chrome (the tab bar, a sheet's header or Save bar) passing over a hit area is where the
                   screen happens to be scrolled, not the target's size: a probe that stops there falls back to the CSS */
                const chrome = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest(".ap-tb, .ap-fsh-f, .ap-fsh-h, .ap-ck-h, .ap-nav, .ap-psh-h"); };
                let byChromeW = false, byChromeH = false;
                const reach = (dx, dy, half) => { let k = 0; while (k < 32 && hit(cx + dx * (half + k + 0.5), cy + dy * (half + k + 0.5))) k++; if (k < 32 && chrome(cx + dx * (half + k + 0.5), cy + dy * (half + k + 0.5))) { if (dx) byChromeW = true; else byChromeH = true; } return k; };
                w = (r.width + reach(-1, 0, r.width / 2) + reach(1, 0, r.width / 2)) / scale;
                h = (r.height + reach(0, -1, r.height / 2) + reach(0, 1, r.height / 2)) / scale;
                if (byChromeW) w = Math.max(w, r.width / scale + ew);
                if (byChromeH) h = Math.max(h, r.height / scale + eh);
              } else {
                w += ew; h += eh;
              }
              w = Math.round(w); h = Math.round(h);
              if (Math.min(h, w) < 44) out.small.push(`${(b.className || b.tagName).toString().split(" ")[0]} "${(b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(w)}x${Math.round(h)}`);
            });
          }
          return out;
        });
        const tag = `${tagR} ${id}`;
        if (o.overflow) note(`${tag}: page scrolls sideways`);
        /* the notes' claims line shows only when a screen fails a rule: no line is a pass */
        if (o.lint) note(`${tag}: ${o.lint.trim()}`);
        if (/\bundefined\b|\bNaN\b/.test(o.text)) note(`${tag}: reads undefined or NaN`);
        if (r.checkin === "false" && /check-in|check in\b(?! with a clinician)/i.test(o.text + " " + o.tabs)) note(`${tag}: mentions the check-in while it's off`);
        if (o.small.length) note(`${tag}: small targets: ${[...new Set(o.small)].slice(0, 6).join("; ")}`);
      }
    }
    await ctx.close();
  }

  /* ===== fix-core: the BM tiles' words stay one line at 360, 375 and 390 (plus and Day first's Log a BM card, A and C),
     and the Read the note button never covers the phone between 760 and 1019 wide ===== */
  for (const [w, h] of [[360, 780], [375, 812], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => note(`${w} tiles: pageerror: ${e.message}`));
    await p.goto(PAGE); await p.waitForSelector(".ap-rx"); await p.waitForTimeout(300);
    for (const form of ["A", "C"]) {
      for (const home of ["score", "day"]) {
        await p.evaluate(([f, hm]) => { const api = window.FLORIN_EXT.api; api.set("form", f); api.set("home", hm); api.open(hm === "day" ? "today" : "plus"); }, [form, home]);
        await p.waitForTimeout(350);
        const two = await p.evaluate(() => {
          const ph = document.querySelector(".rx-stage .ap-rx");
          const host = ph.querySelector(".ap-o:not(.is-out):last-child") || ph.querySelector(".ap-layer");
          return [...host.querySelectorAll(".ap-fm--A .ap-fm-w")].filter((x) => { const lh = parseFloat(getComputedStyle(x).lineHeight) || parseFloat(getComputedStyle(x).fontSize) * 1.15; return x.getBoundingClientRect().height > lh * 1.5; }).map((x) => `${x.textContent} ${Math.round(x.getBoundingClientRect().width)}px`);
        });
        if (two.length) note(`${w} ${form} ${home === "day" ? "Day first's Log a BM" : "plus"}: a tile's word breaks onto two lines: ${two.join(", ")}`);
      }
    }
    await p.evaluate(() => { const api = window.FLORIN_EXT.api; api.set("home", "score"); api.set("form", "C"); });
    await ctx.close();
  }
  for (const [w, h] of [[1000, 800], [780, 700], [900, 900], [1010, 1000]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto(PAGE); await p.waitForSelector(".ap-rx"); await p.waitForTimeout(400);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.evaluate(() => document.querySelector('[data-rx="home"][data-v="day"]').click()); await p.waitForTimeout(400);
    const j = await p.evaluate(() => {
      const b = document.querySelector(".rx-jump"), s = document.querySelector(".rx-stage");
      if (!b || b.hidden) return { shown: false };
      const r = b.getBoundingClientRect(), q = s.getBoundingClientRect();
      return { shown: true, hit: !(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom), r: [Math.round(r.left), Math.round(r.right)], q: [Math.round(q.left), Math.round(q.right)] };
    });
    if (j.shown && j.hit) note(`${w}x${h}: Read the note covers the phone (button ${j.r.join(" to ")}, stage ${j.q.join(" to ")})`);
    /* final-fix: nor any toggle: the toggles column ends above it, so the last row, brought into view, is its own */
    const cov = await p.evaluate(() => {
      const jb = document.querySelector(".rx-jump"), rows = [...document.querySelectorAll(".rx-side--l [data-rx][data-v]")].filter((x) => x.dataset.rx !== "screen" && x.offsetParent);
      if (!jb || jb.hidden || !rows.length) return null;
      const last = rows[rows.length - 1];
      last.scrollIntoView({ block: "nearest" });
      const q = last.getBoundingClientRect(), hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return hit && hit.closest(".rx-jump") ? `${last.dataset.rx}=${last.dataset.v}` : null;
    });
    if (cov) note(`${w}x${h}: Read the note covers the toggle ${cov}`);
    await p.evaluate(() => document.querySelector('[data-rx="home"][data-v="score"]').click());
    await ctx.close();
  }
  /* ===== end fix-core ===== */

  /* em dashes and exclamation points in the source strings: the core files and every module */
  const files = fs.readdirSync(path.resolve(__dirname, "../prototype/js")).filter((f) => /^refresh-.*\.js$/.test(f));
  for (const f of files) {
    const src = fs.readFileSync(path.resolve(__dirname, "../prototype/js", f), "utf8");
    src.split("\n").forEach((line, i) => {
      if (/[—–]/.test(line)) note(`${f}:${i + 1}: em or en dash`);
      const strs = line.match(/(["'`])(?:(?!\1).)*!(?:(?!\1).)*\1/g) || [];
      strs.filter((s) => /[A-Za-z]!(\s|$|["'`])/.test(s) && !/!==?|!\w|\(!/.test(s)).forEach((s) => note(`${f}:${i + 1}: exclamation point in ${s.slice(0, 40)}`));
    });
  }
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problems` : "\nQA clean: no console errors, no sideways scroll, every screen passes the claims check in every toggle run, nothing names the check-in while it's off, tap targets fine.");
  process.exitCode = problems.length ? 1 : 0;
})();
