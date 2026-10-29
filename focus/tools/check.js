/* Florin focus group test: the whole flow, end to end, on an emulated phone, against the local back end.
     NODE_PATH=$(npm root -g) node focus/tools/check.js [--device iphone|android|laptop] [--easy] [--home score|day]
       [--history calendar|list] [--week built|card|strip|note|chart] [--theme light|dark] [--out <folder>] [--keep]
   It builds the site into <out>/site with the local endpoint stamped in (focus/build.js --endpoint), starts the
   back end (focus/mock-endpoint.js, which runs Code.gs itself) and a static server that applies the site's _headers
   (so the content security policy is live), then walks a participant through everything: welcome, consent, intake,
   every task with its questions, the comparisons, install (finish here), free use with a double tap and the Comment
   button, the exit survey with the membership page, the comment review (an edit and a delete), submit and thanks.
   It checks, at every screen: console errors (the page and the app's frame, CSP included), sideways scroll, 44px tap
   targets on the study's own screens, and every word the study shows against the claims rules (claims-rules.js) and
   the house rules (no em or en dashes, no exclamation points, never normal, healthy, improving or worsening, IBD,
   Bristol or IBS-SSS; FloraScore one word). At the end it reads the Sheet the back end wrote: every tab filled as the
   contract says, nothing refused (_log), the right answers counted right, the thank-you code alone in the recruiter's
   sheet. Screenshots go to <out>/shots. Prints a JSON summary; exits 1 on any failure. Default <out>: a folder in
   the system's temp folder. */
"use strict";
const { chromium, devices } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os"), http = require("http");
const { spawn, execFileSync } = require("child_process");

const FOCUS = path.resolve(__dirname, ".."), REPO = path.dirname(FOCUS);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true; };
const PATH_ = opt("path", "here");
const DEVICE = opt("device", "iphone"), EASY = args.includes("--easy"), HOME = opt("home", "score"), HIST = opt("history", "calendar"), WEEK = opt("week", "card"), THEME = opt("theme", "light");
const OUT = path.resolve(opt("out", path.join(os.tmpdir(), "florin-focus-check")));
const TAG = `${DEVICE}-${EASY ? "easy" : "std"}-${HOME}-${HIST}-${WEEK}-${THEME}${PATH_ === "installed" ? "-installed" : ""}`;
const PE = 9300 + Math.floor(Math.random() * 200), PS = PE + 400;
const SHOTS = path.join(OUT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
fs.readdirSync(SHOTS).filter((f) => f.startsWith(`${TAG}-`)).forEach((f) => fs.unlinkSync(path.join(SHOTS, f)));

/* ---------- the rules every word is checked against ---------- */
global.window = {};
require(path.join(REPO, "prototype/js/claims-rules.js"));
const RULES = window.FLORIN.claimsRules.map((r) => ({ id: r.id, why: r.why, rx: new RegExp(r.re, r.id === "emdash" || r.id === "bang" ? "g" : "gi") }));
const HOUSE = [["en dash", /–/g], ["normal", /\bnormal\b/gi], ["healthy", /\bhealthy\b/gi], ["improving", /\bimproving\b|\bgetting better\b/gi], ["worsening", /\bworsening\b|\bgetting worse\b/gi], ["Bristol", /\bBristol\b/gi], ["IBS-SSS", /IBS-SSS/gi], ["FloraScore", /\bFlora ?score\b|\bFlora Score\b/g]];
const texts = new Set();
const claimHits = [];
const appHits = new Set();
function checkText(where, t) {
  t.split(/\n+/).map((x) => x.trim()).filter(Boolean).forEach((line) => {
    if (texts.has(line)) return;
    texts.add(line);
    RULES.forEach((r) => { r.rx.lastIndex = 0; if (r.rx.test(line)) claimHits.push({ where, rule: r.id, line }); });
    HOUSE.forEach(([id, rx]) => { rx.lastIndex = 0; if (rx.test(line) && !(id === "FloraScore" && /FloraScore/.test(line) && !/Flora Score|Florascore/.test(line))) claimHits.push({ where, rule: id, line }); });
  });
}

/* ---------- the site, the back end, a static server ---------- */
/* the phone's send budget raised, and the back end's clock stepped a minute every few seconds, so a run of a few
   minutes isn't held to 60 pieces a minute (a person's session is 30 minutes) */
execFileSync(process.execPath, [path.join(FOCUS, "build.js"), "--out", path.join(OUT, "site"), "--endpoint", `http://localhost:${PE}/exec`, "--config", "sendPerMinute=400", "--config", "hintAfter=3", "--config", "hintAfterEasy=3"], { stdio: "inherit" });
const mock = spawn(process.execPath, [path.join(FOCUS, "mock-endpoint.js"), "--port", String(PE), "--fresh", "--dir", path.join(OUT, `mock-${TAG}`), "--quiet"], { stdio: ["ignore", "pipe", "inherit"] });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const SITE = path.join(OUT, "site");
const headersFor = (u) => {
  const out = {}; let on = false;
  fs.readFileSync(path.join(SITE, "_headers"), "utf8").split("\n").forEach((line) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    if (!/^\s/.test(line)) { const re = new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`); on = re.test(u); return; }
    if (on) { const i = line.indexOf(":"); out[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  });
  return out;
};
const site = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0]), p = path.join(SITE, u);
  if (!p.startsWith(SITE)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, Object.assign({ "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" }, headersFor(u)));
  fs.createReadStream(p).pipe(res);
}).listen(PS);
const getJSON = (u) => new Promise((ok, no) => http.get(u, (r) => { let b = ""; r.on("data", (d) => (b += d)); r.on("end", () => { try { ok(JSON.parse(b)); } catch (e) { no(e); } }); }).on("error", no));

(async () => {
  const fails = [], notes = [];
  const fail = (m) => { fails.push(m); console.log(`  FAIL ${m}`); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(900);
  let clock = 0;
  const tick = setInterval(() => { clock += 61000; const r = http.request({ host: "localhost", port: PE, path: "/__mock/clock?offset=61000", method: "POST" }); r.on("error", () => {}); r.end(); }, 3000);
  const browser = await chromium.launch();
  const dev = DEVICE === "android" ? devices["Pixel 7"] : DEVICE === "laptop" ? { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false } : devices["iPhone 13"];
  const ctx = await browser.newContext(Object.assign({}, dev, DEVICE === "iphone" ? { viewport: { width: 390, height: 844 } } : {}, { colorScheme: THEME }));
  let page = await ctx.newPage();
  const errors = [];
  const attach = (pg) => {
    pg.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && !/Florin/.test(m.text()))) errors.push(`${m.type()}: ${m.text()}`); });
    pg.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    pg.on("response", (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  };
  attach(page);
  /* the app opened from the home screen: display-mode standalone, and navigator.standalone on iPhone */
  const STANDALONE = () => {
    try { Object.defineProperty(navigator, "standalone", { get: () => true, configurable: true }); } catch (e) { /* fine */ }
    const mm = window.matchMedia.bind(window);
    window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } } : mm(q));
  };
  let shotN = 0;
  const shot = async (name) => { shotN++; const f = path.join(SHOTS, `${TAG}-${String(shotN).padStart(2, "0")}-${name}.png`); await page.screenshot({ path: f }); return f; };
  const frame = () => page.frames().find((f) => /app\.html/.test(f.url()));
  /* every screen: words, sideways scroll, tap targets */
  const look = async (where) => {
    const r = await page.evaluate(() => {
      const fx = document.querySelector("#fx");
      const vis = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && !el.closest("[hidden]"); };
      const small = [...document.querySelectorAll("#fx button, #fx input, #fx textarea, #fx a, .fx-cm-root button")].filter(vis).filter((el) => !el.closest(".fx-frame-wrap")).map((el) => { const b = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute("aria-label") || el.type || "").trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) }; }).filter((x) => (x.h < 44 || x.w < 44) && !/checkbox/.test(x.t));
      const cm = document.querySelector(".fx-cm-root");
      return { text: (fx ? fx.innerText : "") + "\n" + (cm ? cm.innerText : ""), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, small };
    });
    checkText(where, r.text);
    if (r.sw > r.cw + 1) fail(`${where}: sideways scroll on the page (${r.sw} > ${r.cw})`);
    r.small.forEach((x) => fail(`${where}: tap target under 44px: "${x.t}" ${x.w}x${x.h}`));
    const f = frame();
    if (f && await page.evaluate(() => !document.querySelector("#fxAppView").hidden)) {
      const a = await f.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, lw: (document.querySelector(".ap-layer") || {}).scrollWidth, lc: (document.querySelector(".ap-layer") || {}).clientWidth })).catch(() => null);
      if (a && (a.sw > a.cw + 1 || a.lw > a.lc + 1)) fail(`${where}: sideways scroll in the app (${a.sw}/${a.cw}, layer ${a.lw}/${a.lc})`);
      /* the app's own words, as the prototype's page checks them: disclaimers (.ap-fine, [data-disclaimer]) left out */
      const hits = await f.evaluate(() => {
        const src = document.querySelector(".ap-o:not(.is-out):last-child .ap-o-p") || document.querySelector(".ap-layer");
        if (!src || !window.FLORIN_REFRESH_CHECK) return [];
        const c = src.cloneNode(true);
        c.querySelectorAll(".ap-fine, [data-disclaimer], svg").forEach((n) => n.remove());
        return window.FLORIN_REFRESH_CHECK(c.textContent.replace(/\s+/g, " ")).map((h) => `${h.rule.id}: "${h.text}"`);
      }).catch(() => []);
      hits.forEach((h) => { const k = `app ${h}`; if (!appHits.has(k)) { appHits.add(k); fail(`${where}: app words, ${h}`); } });
    }
  };
  const S = () => page.evaluate(() => window.FXFLOW.S());
  const click = async (sel, o = {}) => { await page.click(sel, o); await wait(480); };
  const fclick = async (sel) => { const f = frame(); await f.click(sel); await wait(480); };

  /* ---------- answering ---------- */
  const right = {};
  async function chooser(qid) {
    const f = frame(), A = await S();
    switch (qid) {
      case "IN1": return ["pattern"];
      case "IN2": return ["foods", "other"];
      case "IN6": return EASY ? ["none"] : ["oura", "watch"];
      case "IN7": return [EASY ? "65" : "35"];
      case "IN9": return ["standard"];
      case "WK1": return ["gap"];
      case "WK2": return f.evaluate(() => { const L = FOCUS_APP.L; return L.span(FOCUS_APP.M(), 7, FOCUS_APP.V().form).filter((x) => x.state === "shifted").map((x) => `d${x.d}`); });
      case "WK3": return ["outside"];
      case "SC1": return ["own"];
      case "SC2": return f.evaluate(() => { const L = FOCUS_APP.L, M = FOCUS_APP.M(), m = FOCUS_APP.V().form; const r = FOCUS_APP.RU.scoreRel(L.score(M, L.TODAY, m).value, L.scoreUsual(M, m)); return [/above/i.test(r) ? "above" : /below/i.test(r) ? "below" : "in"]; });
      case "PT1": return ["f-pizza"];
      case "HI1": return A.tasks && f ? f.evaluate(() => { const L = FOCUS_APP.L, M = FOCUS_APP.M(); const t = L.dateOf(L.TODAY), pm = (t.getMonth() + 11) % 12; const g = M.days.find((x) => L.dateOf(x.d).getMonth() === pm && L.facts(M, x, FOCUS_APP.V().form).state === "none"); return [`d${g.d}`]; }) : null;
      case "IS2": return ["find"];
      case "TR2": return ["yes"];
      case "FR1": return ["today", "ask"];
      case "MG1": return ["usual"];
      default: return null;
    }
  }
  const BOX = { MS1: "I looked for a place to note blood in a BM.", TR2b: "Nowhere really. My name is Sam, sam@example.com, 555 123 4567.", LS1: "The week was easy to read.", TW: "The tasks were clear.", IN2: "My stomach gets upset after big meals." };
  async function answerAll(where, max = 80) {
    let n = 0;
    for (; n < max; n++) {
      const q = await page.evaluate(() => {
        const h = [...document.querySelectorAll("#fxQ")].find((x) => x.getClientRects().length && !x.closest("[hidden]"));
        if (!h) return null;
        const c = h.closest(".fx-sheet-b, .fx-qwrap");
        return { qid: h.dataset.qid, sheet: !!h.closest(".fx-sheet"), opts: [...c.querySelectorAll(".fx-opt")].map((b) => b.dataset.v), many: !!c.querySelector('.fx-opt[role="checkbox"]'), scale: !!c.querySelector(".fx-sc"), chips: [...c.querySelectorAll(".fx-pair .fx-ch")].map((b) => b.dataset.v), box: !!c.querySelector("#fxBox"), next: !!c.querySelector('[data-q="next"]') };
      });
      if (!q) break;
      const scope = q.sheet ? ".fx-sheet " : ".fx-qwrap ";
      if (n === 0 || /^(BM1|WK2|SC1|IV1|IN9|EX1|SUS1|FV1|MS2|VA2|MG1|TR2b|IS2|CP1|CP2|CP3)$/.test(q.qid)) { await look(`${where} ${q.qid}`); await shot(`${where}-${q.qid}`); }
      else await look(`${where} ${q.qid}`);
      const want = await chooser(q.qid);
      if (want && !q.box) right[q.qid] = want;
      if (q.scale) { await click(`${scope}.fx-sc[data-v="${EASY ? 5 : 6}"]`); continue; }
      if (q.chips.length) { await click(`${scope}.fx-ch[data-v="${q.chips[0]}"]`); await click(`${scope}[data-q="next"]`); continue; }
      if (q.opts.length) {
        const pick = (want || [q.opts[0]]).filter((v) => q.opts.includes(v));
        if (!pick.length) pick.push(q.opts[0]);
        for (const v of q.many ? pick : pick.slice(0, 1)) await click(`${scope}.fx-opt[data-v="${v}"]`);
        if (await page.$(`${scope}#fxBox`)) {
          await page.fill(`${scope}#fxBox`, BOX[q.qid] || "Something else.");
          await wait(150);
        }
        if (q.many || await page.$(`${scope}#fxBox`)) { if (await page.$(`${scope}[data-q="next"]`)) await click(`${scope}[data-q="next"]`); }
        continue;
      }
      if (q.box) {
        await page.fill(`${scope}#fxBox`, BOX[q.qid] || "");
        await wait(150);
        if (q.qid === "MS1" && !(await page.isVisible("[data-fx-alarm]"))) fail("MS1: the primary care note didn't show for a box that names blood in a BM");
        if (q.qid === "MS1") await shot("exit-MS1-alarm");
        await click(`${scope}[data-q="next"]`);
        continue;
      }
      await click(`${scope}[data-q="skip"]`);
    }
    return n;
  }

  /* ---------- the tasks, done as a person would ---------- */
  async function doTask(id) {
    const f = frame();
    const easy = await f.evaluate(() => !!FOCUS_APP.V().easy), home = await f.evaluate(() => FOCUS_APP.V().home), hist = await f.evaluate(() => FOCUS_APP.V().history);
    const lay = async (sel) => f.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "center" }); return !!el; }, sel);
    switch (id) {
      case "bm":
        if (easy) {
          await fclick(".ap-layer .ap-ez-big--bm");
          for (let i = 0; i < 6; i++) {
            const acts = await f.evaluate(() => [...document.querySelectorAll(".ap-o:last-child [data-act]")].map((b) => b.dataset.act + (b.dataset.v ? `=${b.dataset.v}` : "")).join(" "));
            if (/save-bm/.test(acts)) { await fclick('.ap-o:last-child [data-act="save-bm"]'); break; }
            if (/ez-form/.test(acts) && i === 0) { await fclick('.ap-o:last-child [data-act="ez-form"]'); continue; }
            if (/ez-when=now/.test(acts)) { await fclick('.ap-o:last-child [data-act="ez-when"][data-v="now"]'); continue; }
            if (/ez-next/.test(acts)) { await fclick('.ap-o:last-child [data-act="ez-next"]'); continue; }
          }
        } else if (home === "day") await fclick('.ap-layer [data-act="vr-quick"]');
        else { await fclick(".ap-tb-plus"); await fclick('.ap-o:last-child [data-act="quick-bm"]'); }
        break;
      case "time": {
        const t1 = (await S()).t1;
        await lay(`.ap-layer [data-act="edit"][data-id="${t1.id}"]`);
        await fclick(`.ap-layer [data-act="edit"][data-id="${t1.id}"]`);
        if (easy) {
          const goto = await f.evaluate(() => { const b = [...document.querySelectorAll('.ap-o:last-child [data-act="ez-goto"]')].find((x) => /when/i.test(x.closest("li") ? x.closest("li").textContent : "")); return b ? b.dataset.v : "2"; });
          await fclick(`.ap-o:last-child [data-act="ez-goto"][data-v="${goto}"]`);
          if (await f.$('.ap-o:last-child [data-act="ez-when"][data-v="today"]')) await fclick('.ap-o:last-child [data-act="ez-when"][data-v="today"]');
          const hv = await f.evaluate((ref) => { const hs = [...document.querySelectorAll('.ap-o:last-child [data-act="ez-hour"]')].map((b) => +b.dataset.v); return hs.sort((a, b) => Math.abs(ref - 1 - a) - Math.abs(ref - 1 - b))[0]; }, t1.t);
          await fclick(`.ap-o:last-child [data-act="ez-hour"][data-v="${hv}"]`);
          for (let i = 0; i < 4 && !(await f.$('.ap-o:last-child [data-act="save-bm"]')); i++) if (await f.$('.ap-o:last-child [data-act="ez-next"]')) await fclick('.ap-o:last-child [data-act="ez-next"]');
          await fclick('.ap-o:last-child [data-act="save-bm"]');
        } else {
          const hh = Math.floor(t1.t - 1), mm = Math.round((t1.t - 1 - hh) * 60);
          await f.fill('.ap-o:last-child [data-in="time"]', `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
          await f.dispatchEvent('.ap-o:last-child [data-in="time"]', "change");
          await wait(200);
          await fclick('.ap-o:last-child [data-act="save-bm"]');
        }
        break;
      }
      case "week": await lay(easy ? ".ez-week" : "[data-week], .ap-wk"); await wait(2600); break;
      case "score":
        if (easy) { await lay('.ap-layer [data-act="tab"][data-tab="insights"]'); await fclick('.ap-layer [data-act="tab"][data-tab="insights"]'); await wait(2400); }
        else if (home === "day") await fclick(".ap-layer .vr-sc");
        else await fclick('.ap-layer .ap-hero');
        break;
      case "patterns":
        if (easy) { await lay('.ap-layer [data-act="tab"][data-tab="insights"]'); await fclick('.ap-layer [data-act="tab"][data-tab="insights"]'); await lay(".ez-pattern"); }
        else { await fclick('.ap-tb [data-tab="insights"]'); await lay('.ap-ic:has(.ap-ic-h[data-k="pat"])'); }
        await wait(2600);
        break;
      case "checkin":
        await lay('.ap-layer [data-act="ck-start"]');
        await fclick('.ap-layer [data-act="ck-start"]');
        for (let i = 0; i < 12 && (await f.evaluate(() => FOCUS_APP.key())) !== "ckdone"; i++) {
          const acts = await f.evaluate(() => [...document.querySelectorAll(".ap-o:last-child [data-act]")].map((b) => b.dataset.act).join(" "));
          if (/ck-finish/.test(acts)) await fclick('.ap-o:last-child [data-act="ck-finish"]');
          else if (/ck-ans/.test(acts)) await fclick('.ap-o:last-child [data-act="ck-ans"]');
          else if (/ck-next/.test(acts)) await fclick('.ap-o:last-child [data-act="ck-next"]');
          else await wait(300);
        }
        break;
      case "history": {
        const gap = await f.evaluate(() => { const L = FOCUS_APP.L, M = FOCUS_APP.M(); const t = L.dateOf(L.TODAY), pm = (t.getMonth() + 11) % 12; return M.days.find((x) => L.dateOf(x.d).getMonth() === pm && L.facts(M, x, FOCUS_APP.V().form).state === "none").d; });
        await fclick('.ap-tb [data-tab="history"]');
        if (hist === "calendar") { await fclick('.ap-layer [data-act="vr-cal-m"][data-v="-1"]'); await fclick(`.ap-layer .vr-cal-d[data-v="${gap}"]`); }
        else {
          for (let i = 0; i < 6 && !(await f.$(`.ap-layer [data-act="plus-day"][data-v="${gap}"]`)); i++) { await lay('.ap-layer [data-act="hmore"]'); await fclick('.ap-layer [data-act="hmore"]'); }
          await lay(`.ap-layer [data-act="plus-day"][data-v="${gap}"]`);
          await wait(2600);
        }
        break;
      }
      case "ask":
        await fclick('.ap-tb [data-tab="ask"]');
        await fclick(".ap-layer .ap-askq");
        await wait(1500);
        break;
      default: break;
    }
  }

  /* ======================= the walk ======================= */
  const url = `http://localhost:${PS}/?test=1&home=${HOME}&history=${HIST}&week=${WEEK}`;
  await page.goto(url, { waitUntil: "load" });
  await wait(700);
  if (DEVICE === "laptop") { await look("laptop QR"); await shot("laptop-qr"); await click('[data-fx="here"]'); }
  await look("welcome"); await shot("welcome");
  await click('[data-fx="to-consent"]');
  await look("consent"); await shot("consent");
  await page.check('[data-fx-c="age"]'); await page.check('[data-fx-c="agree"]');
  await click('[data-fx="start"]');
  const nIntake = await answerAll("intake");
  await page.waitForFunction(() => /tasks/.test(document.querySelector("#fx").innerText) || !!document.querySelector('[data-fx="to-tour"]'), null, { timeout: 20000 });
  if (await page.$('[data-fx="to-tour"]')) { await look("easy note"); await shot("easy-note"); await click('[data-fx="to-tour"]'); }
  await page.waitForSelector('[data-fx="tour-go"]', { timeout: 15000 });
  await look("tour intro"); await shot("tour-intro");
  await click('[data-fx="tour-go"]');
  const s0 = await S();
  notes.push(`tasks: ${s0.tasks.join(", ")}; arms: ${JSON.stringify(s0.arms)}; code ${s0.code}; version ${s0.version}`);
  const results = {};
  for (let i = 0; i < s0.tasks.length; i++) {
    const id = s0.tasks[i];
    await page.waitForSelector('[data-fx="done"]', { timeout: 15000 });
    await wait(500);
    await look(`task ${id}`); await shot(`task-${id}`);
    if (id === "bm") {
      /* More, from the strip */
      await click('#fxStrip [data-fx="more"]');
      await look("more"); await shot("more");
      await click('.fx-more-h [data-fx="more-x"]');
      /* Android's back gesture closes a sheet in the app, and never leaves the study */
      await frame().click(".ap-tb-plus"); await wait(500);
      const u0 = page.url();
      await page.goBack().catch(() => null); await wait(700);
      const shut = await frame().evaluate(() => !FOCUS_APP.top());
      if (!shut) fail("back: the plus sheet stayed open");
      if (page.url().split("#")[0] !== u0.split("#")[0] || !(await page.isVisible("#fxStrip"))) fail(`back: it left the study (${page.url()})`);
      await page.goBack().catch(() => null); await wait(500);
      if (!(await page.isVisible("#fxStrip"))) fail("back, twice: it left the task");
    }
    if (id === "week") {
      /* the hint, after hintAfter (3 seconds in this build): its words in the strip, and a ring on the app */
      /* (a week already in view is seen in 2 seconds, before the hint is due: then there's no hint to give) */
      await page.waitForFunction(() => !!document.querySelector('#fxStrip [data-fx="hint"]') || /Done\. Tap Next/.test(document.querySelector("#fxStrip").innerText), null, { timeout: 8000 }).catch(() => fail("hint: no Hint button"));
      if (await page.$('#fxStrip [data-fx="hint"]')) { await click('#fxStrip [data-fx="hint"]'); await look("task week hint"); await shot("task-week-hint"); }
    }
    await doTask(id);
    const seen = await page.waitForFunction(() => /Done\. Tap Next/.test(document.querySelector("#fxStrip").innerText), null, { timeout: 9000 }).then(() => true).catch(() => false);
    results[id] = seen;
    if (!seen) {
      const dbg = await frame().evaluate(() => ({ key: FOCUS_APP.key(), top: !!FOCUS_APP.top(), y: FOCUS_APP.api().layer.scrollTop, pat: FOCUS_APP.inView(['.ap-ic:has(.ap-ic-h[data-k="pat"])'], { share: 0.6 }) }));
      const t = await page.evaluate(() => { const x = window.FXFLOW.task(); return x && { since: x.since, seen: x.seen, part: x.part }; });
      fail(`task ${id}: the app didn't see the goal ${JSON.stringify(dbg)} ${JSON.stringify(t)}`);
    }
    await shot(`task-${id}-done`);
    await click('[data-fx="done"]');
    await answerAll(`task ${id}`);
  }
  /* the comparisons */
  for (let k = 0; k < 3; k++) {
    const there = await page.waitForSelector('[data-fx="cmp-next"]', { timeout: 6000 }).then(() => true).catch(() => false);
    if (!there) break;
    await wait(600);
    await look(`compare ${k}`); await shot(`compare-${k}`);
    await click('[data-fx="cmp-next"]');
    await answerAll(`compare ${k}`);
  }
  await answerAll("tour TW");
  /* install: finish here, or put it on the home screen and go on from there */
  await page.waitForSelector('[data-fx="i-here"]', { timeout: 30000 });
  await look("install"); await shot("install");
  let safari = null;
  if (PATH_ === "installed") {
    const code = (await S()).code;
    await click('[data-fx="i-added"]');
    await look("install wait"); await shot("install-wait");
    safari = page;
    if (DEVICE === "iphone") {
      /* the home screen app on iPhone keeps its own storage: a new context, the code typed */
      const ctx2 = await browser.newContext(Object.assign({}, dev, { viewport: { width: 390, height: 844 }, colorScheme: THEME }));
      await ctx2.addInitScript(STANDALONE);
      page = await ctx2.newPage();
      attach(page);
      await page.goto(`http://localhost:${PS}/?src=home`, { waitUntil: "load" });
      await page.waitForSelector("#fxCode", { timeout: 10000 });
      await look("installed code"); await shot("installed-code");
      await page.fill("#fxCode", "zzz zzz");
      await click('[data-fx="code-go"]');
      if (!(await page.isVisible("[data-fx-err]"))) fail("code screen: a code that fails its check showed no error");
      await shot("installed-code-bad");
      await page.fill("#fxCode", `${code.slice(0, 3).toLowerCase()} ${code.slice(3).toLowerCase()}`);
      await click('[data-fx="code-go"]');
    } else {
      /* Android: the installed app shares the browser's storage */
      await ctx.addInitScript(STANDALONE);
      page = await ctx.newPage();
      attach(page);
      await page.goto(`http://localhost:${PS}/?src=home`, { waitUntil: "load" });
    }
    await page.waitForFunction(() => !!document.querySelector("#fxQ"), null, { timeout: 15000 });
    const s2 = await S();
    notes.push(`installed app: session ${s2.sid === (await safari.evaluate(() => window.FXFLOW.S().sid)) ? "the same sid" : "a different sid"}, code ${s2.code}, step ${JSON.stringify(s2.step)}`);
  } else await click('[data-fx="i-here"]');
  await answerAll("install");
  /* free use: a double tap on a button (it acts once, and no box opens), then Comment and a tap on that button (the
     box opens about it, and the button isn't pressed), then Comment and This whole screen */
  await page.waitForSelector('[data-fx="free-go"]', { timeout: 10000 });
  await look("free intro"); await shot("free-intro");
  await click('[data-fx="free-go"]');
  await page.waitForSelector('[data-fx="free-done"]');
  await wait(600);
  await look("free use"); await shot("free-use");
  const f = frame();
  /* the Insights tab (Easy folds Insights into Today, so History there) */
  const tab = (await f.$('.ap-tb [data-tab="insights"]:visible')) || (await f.$('.ap-tb [data-tab="history"]'));
  const fb = await page.$("#fxFrame");
  const fbox = await fb.boundingBox(), tbox = await tab.boundingBox();
  /* a frame's element box is already in the page's coordinates */
  const tx = tbox.x + tbox.width / 2, ty = tbox.y + tbox.height / 2;
  const before = await f.evaluate(() => FOCUS_APP.key());
  if (dev.hasTouch) { await page.touchscreen.tap(tx, ty); await wait(140); await page.touchscreen.tap(tx + 3, ty + 2); }
  else { await page.mouse.dblclick(tx, ty); }
  await wait(600);
  const afterKey = await f.evaluate(() => FOCUS_APP.key());
  const open0 = await page.isVisible(".fx-cm");
  if (open0) { fail("double tap on a tab: a comment box opened (a control acts once, and no box opens)"); await click('.fx-cm [data-cm="cancel"]'); }
  if (before === afterKey) fail(`double tap: the first tap didn't act (still on ${afterKey})`);
  /* Comment, then a tap on the same tab: the box names it, and the screen stays */
  await click('[data-fx="comment"]');
  if (!/Tap the part of the app you mean/.test(await page.evaluate(() => document.querySelector("#fxStrip").innerText))) fail("Comment: the strip didn't ask for a tap");
  await shot("comment-pick");
  const tbox2 = await (await f.$('.ap-tb [data-tab="insights"]:visible') || await f.$('.ap-tb [data-tab="history"]')).boundingBox();
  if (dev.hasTouch) await page.touchscreen.tap(tbox2.x + tbox2.width / 2, tbox2.y + tbox2.height / 2); else await page.mouse.click(tbox2.x + tbox2.width / 2, tbox2.y + tbox2.height / 2);
  await wait(600);
  const open1 = await page.isVisible(".fx-cm");
  const pickedKey = await f.evaluate(() => FOCUS_APP.key());
  if (!open1) fail("Comment, then a tap: the comment box didn't open");
  if (pickedKey !== afterKey) fail(`Comment, then a tap: the tap pressed the tab (${afterKey} to ${pickedKey})`);
  const where1 = await page.evaluate(() => (document.querySelector(".fx-cm-where") || {}).textContent || "");
  if (!/tab/i.test(where1)) fail(`Comment, then a tap on a tab: the box says "${where1}"`);
  await look("comment box"); await shot("comment-picked");
  await click('.fx-cm [data-cmk="like"]');
  await page.fill("#fxCmW", "The cards are easy to scan.");
  await click('.fx-cm [data-cm="send"]');
  notes.push(`double tap on a tab: ${before} to ${afterKey}, no box; Comment then the tab: "${where1}"`);
  await click('[data-fx="comment"]');
  await click('[data-fx="pick-screen"]');
  if (!(await page.isVisible(".fx-cm"))) fail("Comment, then This whole screen: the box didn't open");
  await click('.fx-cm [data-cmk="idea"]');
  await page.fill("#fxCmW", "A way to compare two weeks. Call me on 555 010 9999.");
  await shot("comment-button");
  await click('.fx-cm [data-cm="send"]');
  await click('[data-fx="free-done"]');
  /* the exit survey, with the membership page */
  await page.waitForSelector('[data-fx="exit-go"]');
  await look("exit intro"); await shot("exit-intro");
  await click('[data-fx="exit-go"]');
  await answerAll("exit");
  const pay = await page.waitForSelector('[data-fx="pay-next"]', { timeout: 8000 }).then(() => true).catch(() => false);
  if (pay) {
    await wait(700);
    await look("membership"); await shot("membership");
    const ps = await frame().$('.ap-o:last-child [data-act="pay-start"]');
    if (ps) { await ps.scrollIntoViewIfNeeded(); await ps.click(); await wait(500); await shot("membership-start"); } else fail("membership page: no Start membership");
    await click('[data-fx="pay-next"]');
    await answerAll("exit after pay");
  } else fail("exit: the membership page never showed");
  /* submit: review the comments, edit one, delete one */
  await page.waitForSelector('[data-fx="submit"]', { timeout: 8000 });
  await look("submit"); await shot("submit");
  const ids = await page.$$eval("[data-cme]", (bs) => bs.map((b) => b.dataset.cme));
  if (ids.length !== 2) fail(`review: ${ids.length} comments listed, not 2`);
  await click(`[data-cme="${ids[0]}"]`);
  await page.fill("#fxCmW", "The cards are easy to scan, and the colours help.");
  await click('.fx-cm [data-cm="send"]');
  await click(`[data-cmd="${ids[1]}"]`);
  await click(`[data-cmdy="${ids[1]}"]`);
  await shot("submit-reviewed");
  await click('[data-fx="submit"]');
  await page.waitForSelector('[data-fx="clear"]', { timeout: 20000 });
  await wait(500);
  await look("thanks"); await shot("thanks");
  if (safari) {
    const said = await safari.waitForFunction(() => /open from your home screen/.test(document.querySelector("#fx").innerText), null, { timeout: 20000 }).then(() => true).catch(() => false);
    if (!said) fail("the browser tab never said Florin is open from the home screen");
    await safari.screenshot({ path: path.join(SHOTS, `${TAG}-99-browser-tab-after-install.png`) });
  }
  const fin = await S();
  /* the queue drains: every piece confirmed by the back end */
  let queueLeft = 1;
  for (let k = 0; k < 12 && queueLeft; k++) {
    await wait(3000);
    await page.evaluate(() => window.FX.flush().then(() => new Promise((r) => setTimeout(r, 1500))).then(() => window.FX.ack()));
    queueLeft = await page.evaluate(() => window.FX.pending());
  }

  /* and the thank-you code, which goes on its own 4 to 12 seconds after Submit, never right behind a session piece */
  for (let k = 0; k < 15; k++) {
    const u = await page.evaluate(() => Object.keys(localStorage).filter((x) => x.indexOf("florin-focus:queue") === 0).flatMap((x) => JSON.parse(localStorage.getItem(x) || "[]")).filter((x) => x.u).length);
    if (!u) break;
    await wait(3000);
    await page.evaluate(() => window.FX.flush().then(() => new Promise((r) => setTimeout(r, 1500))).then(() => window.FX.ack()));
  }

  /* ---------- the Sheet ---------- */
  const st = await getJSON(`http://localhost:${PE}/__mock/state`);
  const T = st.tabs;
  const sess = T.Sessions[0] || {};
  const expectTasks = s0.tasks.length + 1;
  if (T.Sessions.length !== 1) fail(`Sessions: ${T.Sessions.length} rows`);
  if (sess.submitted !== "yes") fail(`Sessions: submitted is ${sess.submitted}`);
  if (sess.stage !== "done") fail(`Sessions: stage is ${sess.stage}`);
  if (String(sess.code) !== fin.code) fail(`Sessions: code ${sess.code}, phone ${fin.code}`);
  if (T.Tasks.length !== expectTasks) fail(`Tasks: ${T.Tasks.length} rows, expected ${expectTasks}`);
  const seenRows = T.Tasks.filter((r) => r.outcome === "seen").length;
  if (T.Comments.length !== 1) fail(`Comments: ${T.Comments.length} rows (2 sent, 1 deleted)`);
  if (PATH_ === "installed") {
    if (sess.installed !== "yes") fail(`Sessions: installed is ${sess.installed}`);
    if (sess.install !== "seen") fail(`Sessions: install is ${sess.install}`);
    const it = T.Tasks.find((r) => r.task === "install") || {};
    if (it.outcome !== "seen") fail(`Tasks: install outcome ${it.outcome}`);
    notes.push(`install row: ${it.outcome}, path ${it.path}`);
  }
  const cm = T.Comments[0] || {};
  if (cm.words && /555|example\.com/.test(cm.words)) fail("Comments: a phone number or email reached the Sheet");
  if (!/colours help/.test(cm.words || "")) fail("Comments: the edit didn't land");
  if (T._log.length) fail(`_log: ${T._log.length} pieces refused: ${JSON.stringify(T._log.slice(0, 5))}`);
  if (T.tokens.length !== 1 || T.tokens[0].token !== fin.token) fail(`tokens: ${JSON.stringify(T.tokens)} (phone ${fin.token})`);
  const tokenRow = JSON.stringify(T.tokens[0] || {});
  if (/sid|Qx|at/.test(Object.keys(T.tokens[0] || {}).join(","))) fail(`tokens: more than the token: ${tokenRow}`);
  const wrong = T.Answers.filter((r) => r.correct === "no").map((r) => `${r.qid}: ${r.answer} (right: ${r.right})`);
  if (wrong.length) fail(`Answers marked wrong where the test picked the right one: ${wrong.join("; ")}`);
  const pii = T.Answers.filter((r) => /555|example\.com/.test(`${r.words}`));
  if (pii.length) fail(`Answers: an email or phone number reached the Sheet: ${pii.map((r) => r.qid).join(", ")}`);
  const alarmRows = T.Answers.filter((r) => r.alarm_note === "yes").map((r) => r.qid);
  if (!alarmRows.includes("MS1")) fail("Answers: MS1's alarm_note isn't yes");
  if (!(sess.sus >= 0)) fail(`Sessions: no SUS (${sess.sus})`);
  if (queueLeft) {
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf("florin-focus:queue") === 0).flatMap((k) => JSON.parse(localStorage.getItem(k) || "[]")).map((x) => ({ s: x.s, u: x.u, p: Object.assign({}, x.p, { words: undefined }) })));
    fail(`the phone's queue still holds ${queueLeft} pieces: ${JSON.stringify(left).slice(0, 600)}`);
  }
  const evTypes = [...new Set(T.Events.map((r) => r.type))];
  ["flow", "screen", "act", "view", "depth"].forEach((t) => { if (!evTypes.includes(t)) fail(`Events: no ${t} events`); });
  if (errors.length) errors.forEach((e) => fail(`console: ${e}`));
  if (claimHits.length) claimHits.forEach((h) => fail(`words: ${h.rule} in ${h.where}: "${h.line}"`));

  const summary = {
    tag: TAG, url, fails: fails.length, notes, goalsSeen: results, intakeQuestions: nIntake,
    sheet: { sessions: T.Sessions.length, answers: T.Answers.length, tasks: T.Tasks.length, tasksSeen: seenRows, comments: T.Comments.length, events: T.Events.length, refused: T._log.length, tokens: T.tokens.length, sus: sess.sus, minutes: sess.minutes, install: sess.install, decisions: sess.decisions },
    wordsChecked: texts.size, shots: SHOTS, failures: fails
  };
  console.log(JSON.stringify(summary, null, 1));
  await browser.close();
  clearInterval(tick);
  mock.kill(); site.close();
  if (!args.includes("--keep")) { /* the build stays for a look; the mock's rows too */ }
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { mock.kill(); site.close(); } catch (x) { /* fine */ } process.exit(2); });
