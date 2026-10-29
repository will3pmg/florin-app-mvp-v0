/* Florin focus group test: the phone app, full screen, for the study. A feature module (CLAUDE.md, Extension hooks):
   it registers into window.FLORIN_EXT before refresh-app.js runs and wraps, never edits. Loaded by focus/app.html.
   - The demo page's chrome (the left bar, the notes, the header, the footer, the phone's top bar) is hidden by
     css/focus-app.css, and the phone runs full screen at every width (phone.set("full", true), kept there).
   - The decisions come from config.js and the session's arms, written as florin-refresh:<key> before refresh-app.js
     reads them; the demo person, logs, meals and plan are set through api.set after the phone's first draw.
   - It watches the phone for the flow: the screen key, every act, every set, what's in view and how far down a screen
     people went, and reports them as events (never what a log says). window.FOCUS_APP is what the flow calls.
   - Comments: the Comment button (in the flow's strip, or the demo bar) asks for one tap: that tap says what the
     comment is about, at that spot, and presses nothing. A double tap on a card or some words (anything that isn't a
     control) opens the box too. A quick second tap on a control is caught, so the control acts once, and no box opens:
     its first tap may have changed the screen, and the comment would land on the wrong thing. The box is drawn by the
     page that owns FX: the flow, when it frames the app.
   Nothing here reads or sends what a person logs: the forms, symptoms, meals, notes, check-in answers and Ask Florin's
   questions stay on the phone. */
(function () {
  const FX = window.FX, EXT = window.FLORIN_EXT, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, FL = window.FL;
  if (!FX || !EXT || !L || !RU) return;
  const CFG = FX.CFG || {};
  const FRAMED = !!window.FX_FRAMED;
  const DEMO = !FRAMED;
  const listeners = {};
  const on = (k, f) => { (listeners[k] = listeners[k] || []).push(f); return () => { listeners[k] = listeners[k].filter((g) => g !== f); }; };
  const emit = (k, v) => (listeners[k] || []).forEach((f) => { try { f(v); } catch (e) { console.error(e); } });
  const safe = (f) => { try { return f(); } catch (e) { console.error(e); return undefined; } };
  window.addEventListener("error", (e) => { try { const f = String(e.filename || "").split("/").pop().split("?")[0]; if (f) FX.ev("error", "error", `${f}:${e.lineno || 0}`); } catch (x) { /* never throw here */ } });

  /* ---------- the decisions, before refresh-app.js reads them ---------- */
  const DEC_KEYS = ["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard"];
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  function wanted() {
    const s = FX.session() || {}, D = CFG.decisions || {}, arms = s.arms || {}, own = s.prof || {};
    const w = {
      form: D.form || "C", bmUI: D.bmUI || "quick", home: arms.home || first(D.home) || "score", history: arms.history || first(D.history) || "calendar",
      checkin: D.checkin !== false, mealUI: D.mealUI || "quick", look: D.look || "built", easy: s.version === "easy", onboard: D.onboard || "short"
    };
    /* what the person changed in Profile stays theirs, on a reload too */
    DEC_KEYS.forEach((k) => { if (own[k] !== undefined) w[k] = own[k]; });
    return w;
  }
  const W0 = wanted();
  DEC_KEYS.forEach((k) => { try { localStorage.setItem(`florin-refresh:${k}`, JSON.stringify(W0[k])); } catch (e) { /* private window: the defaults */ } });
  window.FOCUS_WEEK = (FX.session() && FX.session().arms && FX.session().arms.week) || first(CFG.weekCard) || "built";
  window.FOCUS_WEEK_PLACE = CFG.weekPlace || "";

  /* the study's own sets (the arms, a comparison and its way back) aren't the person's changes */
  let studyDepth = 0;
  const study = (f) => { studyDepth++; try { return f(); } finally { studyDepth--; } };

  /* ---------- hooks ---------- */
  EXT.onSet.push((k, v, api) => {
    /* full screen at every width: the page asks for it only under 760px */
    if (k === "full") { if (!v) api.set("full", true); return; }
    if (k === "theme") return;
    if (DEC_KEYS.includes(k) || ["plan", "persona", "data", "meals"].includes(k)) {
      FX.ev("set", k, String(v));
      if (!studyDepth && DEC_KEYS.includes(k)) {
        const s = FX.session();
        if (s && s.sid) {
          const prof = Object.assign({}, s.prof || {}, { [k]: v });
          FX.patch(k === "easy" ? { prof, version: v ? "easy" : "standard" } : { prof });
          if (k === "easy") FX.send("session", { version: v ? "easy" : "standard" });
        }
      }
      emit("set", { k, v, study: !!studyDepth });
    }
  });
  /* the membership page's Start membership: recorded, and nothing changes */
  EXT.acts["pay-start"] = (b, api) => {
    api.closeAll();
    api.toast("This is a test, so nothing is charged.");
    FX.ev("flow", "pay_start");
    emit("paystart", true);
  };

  /* ---------- screen keys, acts and titles, in the contract's lists (CONTRACT.md, section 7) ---------- */
  const SCREENS = ["today", "home-day", "ez-today", "plus", "earlier", "bm", "ez-bm", "sym", "meal", "ck", "ckdone", "ckday", "insights", "ez-weeks", "i-score", "i-timing", "i-often", "i-form", "i-sym", "i-ck", "i-pat", "i-pattern", "i-days", "history", "hist-cal", "ask", "ask-about", "pay", "pf", "profile"];
  const SHEETS = ["flag", "nobm", "guide", "fx-day", "a sheet", "pf-rem", "pf-info", "pf-del", "onb"];
  const mapKey = (k) => (SCREENS.includes(k) ? k : k === "ask-alarm" || k === "ask-chat" ? "ask" : SHEETS.includes(k) || /^pf-/.test(k || "") ? "a sheet" : "other");
  const ACTS = ["tab", "plus", "profile", "idetail", "iback", "edit", "undo", "quick-bm", "vr-quick", "open-bm", "save-bm", "open-sym", "open-meal", "ck-start", "ck-finish", "ck-skip", "vr-cal-day", "vr-cal-m", "ask-about", "askx-ask", "askx-send", "pay", "pay-start", "hmore", "hfilter", "irange", "close", "fx-wkday"];
  const actName = (n) => (ACTS.includes(n) ? n : n === "flag-report" || n === "flag-undo" ? "a sheet" : n === "nobm" ? "a log" : "other");
  /* an act's detail: only values from fixed lists (a tab, a card's key, a range, a filter), never what a log says */
  const actDetail = (b) => {
    const n = b.dataset.act, d = b.dataset;
    if (n === "tab") return d.tab || "";
    if (n === "idetail" || n === "ask-about" || n === "pay") return /^pattern:/.test(d.k || "") ? "pattern" : /^[a-z]{1,12}$/.test(d.k || d.pay || "") ? d.k || d.pay : "";
    if (n === "irange" || n === "vr-cal-m") return /^-?\d{1,3}$/.test(d.v || "") ? d.v : "";
    if (n === "hfilter") return /^[a-z]{1,8}$/.test(d.v || "") ? d.v : "";
    return "";
  };
  /* a card or module's title, in the app's interface words */
  function titleOf(el) {
    if (!el || !el.matches) return "";
    const txt = (s) => { const x = el.querySelector(s); return x ? x.textContent.replace(/\s+/g, " ").trim() : ""; };
    if (el.matches(".ap-hero, .vr-sc-row")) return "FloraScore";
    if (el.matches("[data-week], .ap-wk, .ho-strip")) return "Your last 7 days";
    if (el.matches(".ap-ic")) { const k = txt(".ap-ic-t .ap-k"); return k.split(" · ")[0] || ""; }
    if (el.matches(".ez")) return txt(".ez-t");
    if (el.matches(".ap-ckc")) return "Weekly check-in";
    if (el.matches(".ap-tlw, .vr-hl, .vr-log, .ap-ez-sec")) return txt("h2");
    if (el.matches(".ap-nx")) return "Next step";
    if (el.matches(".vr-cal")) return "Calendar";
    if (el.matches(".ap-hd")) return "A day in History";
    return "";
  }
  const CARD_SEL = ".ap-hero, .vr-sc-row, [data-week], .ap-wk, .ho-strip, .ap-ic, .ez, .ap-ckc, .ap-tlw, .vr-hl, .vr-log, .ap-nx, .vr-cal, .ap-ez-sec";
  const SAFE_TITLE = /^[A-Za-z0-9 ,.'’:()/&+-]{1,60}$/;
  const cleanTitle = (t) => (SAFE_TITLE.test(t || "") ? t : "");
  const ACT_LABEL = {
    tab: (b) => ({ today: "Today tab", insights: "Insights tab", history: "History tab", ask: "Ask tab" })[b.dataset.tab] || "A tab",
    plus: "Plus button", profile: "Profile", "ck-start": "Start", "ck-skip": "Skip this week", "ck-day": "When it's due", "ck-result": "Check-in saved",
    "save-bm": "Save BM", "save-sym": "Save symptoms", "save-meal": "Save what you ate", "open-bm": "Log a BM", "open-sym": "Log symptoms", "open-meal": "Log what you ate",
    "quick-bm": "A BM tile", "vr-quick": "A BM tile", form: "A BM tile", pay: "Membership", "pay-start": "Start membership", "ask-about": "Ask about this",
    iback: "Back", close: "Close", irange: "Range tabs", hmore: "Show more days", hfilter: "History filters", "vr-cal-day": "A day on the calendar",
    "vr-cal-m": "Month buttons", nobm: "No BM today", edit: "a log entry", undo: "Undo", "askx-ask": "A suggested question", "askx-send": "Send",
    "fx-wkday": "A day on the week strip", guide: "How to pick", "mq-mic": "Microphone", "plus-earlier": "An earlier day", "ask-clear": "Clear",
    /* a card's own title, or for a control that opens a detail, the detail's name (Day first's FloraScore chip) */
    idetail: (b) => { const c = b.closest(".ap-ic"); if (c) return cleanTitle(titleOf(c)) || "A card"; if (b.closest(".ap-hero, .vr-sc, .vr-sc-row") || b.dataset.k === "score") return "FloraScore"; return IDETAIL_NAME[b.dataset.k] || "A card"; }
  };
  const IDETAIL_NAME = { timing: "Timing", often: "How often", form: "Form", sym: "Symptoms", ck: "Weekly check-in", pat: "Possible patterns", days: "Your days" };
  const SCREEN_NAME = { today: "Today", "home-day": "Today", "ez-today": "Today", insights: "Insights", "ez-weeks": "Your weeks", history: "History", "hist-cal": "History", ask: "Ask Florin", "ask-about": "Ask Florin", "i-score": "FloraScore page", "i-timing": "Timing page", "i-often": "How often page", "i-form": "Form page", "i-sym": "Symptoms page", "i-ck": "Check-in page", "i-pat": "Possible patterns page", "i-pattern": "A pattern's page", "i-days": "Your days page", plus: "Plus menu", pay: "Membership page", pf: "Profile", ck: "Weekly check-in", ckdone: "Check-in saved", ckday: "When it's due", bm: "a log sheet", "ez-bm": "a log sheet", sym: "a log sheet", meal: "a log sheet", earlier: "An earlier day" };
  /* what a tap landed on: a named control, a card, else a neutral name. Never the words of a log, a note or a chat */
  function labelFor(t, api) {
    if (!t || !t.closest) return { label: "the screen", el: null };
    if (t.closest("input, textarea, select, [contenteditable]")) return { label: "a text box", el: t.closest("input, textarea, select, [contenteditable]") };
    const b = t.closest("[data-act]");
    if (b && api.root.contains(b) && ACT_LABEL[b.dataset.act]) {
      const l = ACT_LABEL[b.dataset.act];
      const label = typeof l === "function" ? l(b) : l;
      if (label === "a log entry") return { label, el: b };
      if (!b.closest(".ap-askx-a, .ap-ask-me")) return { label, el: b };
    }
    if (t.closest(".ap-askx-a, .ap-ask-me, .ap-askx")) return { label: "the chat", el: t.closest(".ap-askx-a, .ap-ask-me") || t.closest(".ap-askx") };
    if (t.closest(".ap-tl li, .ap-tl")) return { label: "a log entry", el: t.closest(".ap-tl li") || t.closest(".ap-tl") };
    const ov = t.closest(".ap-o");
    if (ov) {
      const type = (/ap-o--t-([\w-]+)/.exec(ov.className) || [])[1] || "";
      const lab = type === "pay" ? "Membership page" : type === "plus" ? "Plus menu" : type === "ck" ? "Weekly check-in" : ["bm", "sym", "meal"].includes(type) ? "a log sheet" : type === "pf" ? "Profile" : "a sheet";
      return { label: lab, el: ov.querySelector(".ap-o-p") || ov };
    }
    if (t.closest(".ap-tb")) return { label: "Tab bar", el: t.closest(".ap-tb") };
    const card = t.closest(CARD_SEL);
    if (card) { const ti = cleanTitle(titleOf(card)); if (ti) return { label: ti, el: card }; }
    return { label: SCREEN_NAME[api.key()] || "the screen", el: api.layer };
  }

  /* ---------- the app API, for the flow ---------- */
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  let commentsOn = DEMO;
  let marker = null;
  const r2 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
  function scrollerNow(api) {
    const t = api.top();
    if (t) { const p = t.el.querySelector(".ap-o-p"); const sc = p && (p.querySelector("[data-scroll], .ap-fsh-b, .ap-ck-b") || p.querySelector(".ap-psh")); return sc || p; }
    return api.layer;
  }
  function openComment(o) {
    const api = EXT.api;
    if (!api || !FX.comments) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const lab = o.target ? labelFor(o.target, api) : { label: SCREEN_NAME[api.key()] || "This screen", el: null };
    let tx = "", ty = "";
    if (lab.el && o.x != null) { const r = lab.el.getBoundingClientRect(); if (r.width && r.height) { tx = r2((o.x - r.left) / r.width); ty = r2((o.y - r.top) / r.height); } }
    const sc = scrollerNow(api);
    const d = {
      how: o.how, phase: FX.phase || "", screen: mapKey(api.key()), state: FX.stateLine(api.V(), { week: window.FOCUS_WEEK }),
      target: lab.label, where: lab.label === "the screen" ? SCREEN_NAME[api.key()] || "This screen" : lab.label,
      x: o.x == null ? null : r2(o.x / vw), y: o.y == null ? null : r2(o.y / vh), tx, ty, vw, vh, scroll: Math.round(sc ? sc.scrollTop : 0)
    };
    if (o.x != null) showMarker(o.x, o.y);
    FX.comments.open(d, { onClose: (sent) => { hideMarker(); emit("comment", { sent }); } });
  }
  function showMarker(x, y) {
    hideMarker();
    marker = document.createElement("div");
    marker.className = "fx-mark";
    marker.style.left = `${Math.round(x)}px`;
    marker.style.top = `${Math.round(y)}px`;
    marker.setAttribute("aria-hidden", "true");
    document.body.appendChild(marker);
  }
  function hideMarker() { if (marker) { marker.remove(); marker = null; } }

  /* the double tap. On a card or some words (nothing that acts), a second tap within 24px and 500ms opens the comment
     box there: a slow double tap still counts, and a tap on words does nothing anyway. On a control, the first tap acts
     as usual and a second within 450ms is caught, with no box. Keyboard presses (detail 0) and taps in a text box are
     never caught */
  const CONTROL = "button, a, input, textarea, select, label, summary, [data-act], [role='button'], [contenteditable]";
  const DT_MS = 500, SWALLOW_MS = 450, NEAR = 24;
  let last = null;
  /* Comment, then one tap: it says what the comment is about, and presses nothing */
  let picking = false;
  function pick(on) {
    picking = !!on;
    document.documentElement.classList.toggle("fx-picking", picking);
    if (DEMO) demoPick(picking);
    if (!picking) emit("pickend", true);
  }
  document.addEventListener("mousedown", (e) => { if ((commentsOn && e.detail > 1 && !e.target.closest("input, textarea, select")) || (picking && !e.target.closest(".fx-demobar"))) e.preventDefault(); }, true);
  document.addEventListener("click", (e) => {
    const api = EXT.api;
    if (picking && api && !e.target.closest(".fx-demobar, .fx-demo-list")) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!api.root.contains(e.target)) return;
      const x = e.detail === 0 && e.target.getBoundingClientRect ? (() => { const r = e.target.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : { x: e.clientX, y: e.clientY };
      pick(false);
      last = null;
      openComment({ how: "button", x: x.x, y: x.y, target: e.target });
      return;
    }
    if (!api || !api.root.contains(e.target)) return;
    if (commentsOn && e.detail > 0 && !(FX.comments && FX.comments.isOpen())) {
      const inField = !!e.target.closest("input, textarea, select, [contenteditable]");
      const ctl = !!e.target.closest(CONTROL);
      const now = performance.now();
      const near = !inField && last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < NEAR && now - last.t < (last.ctl ? SWALLOW_MS : DT_MS);
      if (near && last.ctl) { e.preventDefault(); e.stopImmediatePropagation(); last = null; return; }
      if (near && !ctl) {
        e.preventDefault(); e.stopImmediatePropagation();
        last = null;
        openComment({ how: "double tap", x: e.clientX, y: e.clientY, target: e.target });
        return;
      }
      last = inField ? null : { t: now, x: e.clientX, y: e.clientY, ctl };
    }
    const b = e.target.closest("[data-act]");
    if (!b || !api.root.contains(b)) return;
    const name = b.dataset.act;
    const info = { name, key: api.key(), overlay: api.top() ? api.top().type : "", inLayer: api.layer.contains(b), k: b.dataset.k || "", tab: b.dataset.tab || "", v: b.dataset.v || "", disabled: b.getAttribute("aria-disabled") === "true", el: b };
    FX.ev("act", actName(name), actDetail(b), mapKey(info.key));
    emit("act", info);
  }, true);

  /* ---------- watching: the screen, how far down, and what's in view ---------- */
  let lastKey = null, depth = 0;
  function watch() {
    const api = EXT.api;
    if (!api) return;
    const k = api.key();
    const sc = scrollerNow(api);
    if (sc && sc.scrollHeight > 0) depth = Math.max(depth, Math.min(1, (sc.scrollTop + sc.clientHeight) / sc.scrollHeight));
    if (k !== lastKey) {
      if (lastKey != null) FX.ev("depth", mapKey(lastKey), String(Math.round(depth * 100) / 100), mapKey(lastKey));
      depth = 0;
      const prev = lastKey;
      lastKey = k;
      FX.screen = mapKey(k);
      if (prev != null) FX.ev("screen", mapKey(k), "", mapKey(k));
      seen.clear();
      emit("screen", { key: k, screen: mapKey(k), prev });
    }
    views();
  }
  /* a card counts as seen once half of it has been in view for a second, once per visit to a screen */
  const seen = new Set(), since = new Map();
  function views() {
    const api = EXT.api;
    if (!api || api.top()) { since.clear(); return; }
    const lr = api.layer.getBoundingClientRect(), now = performance.now();
    api.layer.querySelectorAll(CARD_SEL).forEach((el) => {
      const t = cleanTitle(titleOf(el));
      if (!t || seen.has(t)) return;
      const r = el.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, lr.bottom - insetB) - Math.max(r.top, lr.top));
      const half = r.height > 0 && vis >= Math.min(r.height, lr.height) * 0.5;
      if (!half) { since.delete(t); return; }
      if (!since.has(t)) since.set(t, now);
      else if (now - since.get(t) >= 1000) { seen.add(t); since.delete(t); FX.ev("view", t, "", mapKey(api.key())); }
    });
  }

  /* is every selector's element on screen, in the app's visible part (above the flow's sheet), and not under a sheet
     of the app's own? share: how much of each must show */
  let insetB = 0;
  function inView(sels, o = {}) {
    const api = EXT.api;
    if (!api) return false;
    const share = o.share == null ? 0.9 : o.share;
    const t = api.top();
    const box = (t ? t.el.querySelector(".ap-o-p") : api.layer).getBoundingClientRect();
    const bottom = Math.min(box.bottom, window.innerHeight - insetB);
    return [].concat(sels).every((s) => {
      const el = (t ? t.el : api.layer).querySelector(s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!r.height) return false;
      const vis = Math.max(0, Math.min(r.bottom, bottom) - Math.max(r.top, box.top));
      return vis >= Math.min(r.height, bottom - box.top) * share;
    });
  }
  /* scroll the screen so el sits in the part the flow's sheet leaves showing */
  function reveal(sel, bottom) {
    const api = EXT.api;
    if (!api) return false;
    const el = api.layer.querySelector(sel);
    if (!el) return false;
    const lr = api.layer.getBoundingClientRect(), r = el.getBoundingClientRect();
    const room = Math.max(120, lr.height - (bottom || 0));
    const want = r.height < room ? (room - r.height) / 2 : 12;
    api.layer.scrollTop += r.top - lr.top - want;
    return true;
  }
  /* a hint points at what to tap: a ring round it for a few seconds */
  function pulse(sel) {
    const api = EXT.api;
    if (!api) return false;
    const el = [].concat(sel).map((s) => api.root.querySelector(s)).find((x) => x && x.getClientRects().length);
    if (!el) return false;
    el.classList.remove("fx-pulse"); void el.offsetWidth; el.classList.add("fx-pulse");
    setTimeout(() => el.classList.remove("fx-pulse"), 4200);
    return true;
  }
  /* the cards a person sees on Insights (or Your weeks, in Easy), by title, from a draw of that screen */
  function cardTitles() {
    const api = EXT.api;
    if (!api) return [];
    const box = document.createElement("div");
    try { box.innerHTML = RU.insights(api.M(), api.V(), { range: 30, k: null, y: 0 }); } catch (e) { console.error(e); return []; }
    const out = [];
    box.querySelectorAll(api.V().easy ? ".ez" : ".ap-ic").forEach((el) => { const t = cleanTitle(titleOf(el)); if (t && !out.includes(t)) out.push(t); });
    return out;
  }
  /* the logs as they are now, to put back later (Start this task again), without a toast */
  function snapshot() {
    const api = EXT.api, S = api.S;
    return JSON.stringify({ days: S.M.days.map((x) => ({ d: x.d, logged: x.logged, entries: x.entries })), checkin: S.M.checkin, draft: S.ckDraft || null });
  }
  function restore(snap) {
    const api = EXT.api, S = api.S;
    if (!snap) return;
    const o = JSON.parse(snap);
    api.closeAll();
    o.days.forEach((y) => { const x = L.day(S.M, y.d); if (x) { x.logged = y.logged; x.entries = y.entries; } });
    S.M.checkin = o.checkin;
    S.ckDraft = o.draft;
    S.drafts = {};
    S.askx = null; S.askCtx = null;
    S.hist = { filter: "all", n: 14 };
    S.ins = { range: 30, k: null, y: 0 };
    api.go("today");
  }
  function setInsets(o) {
    const st = document.documentElement.style;
    if (o.bottom != null) st.setProperty("--rx-sab", `${Math.max(0, Math.round(o.bottom))}px`);
    if (o.top != null) st.setProperty("--rx-sat", `${Math.max(0, Math.round(o.top))}px`);
  }

  window.FOCUS_APP = {
    ready, on, mapKey, labelFor, titleOf, inView, reveal, pulse, cardTitles, snapshot, restore, setInsets,
    api: () => EXT.api, L, RU, AD: window.FLORIN_APP,
    key: () => (EXT.api ? EXT.api.key() : ""),
    screen: () => (EXT.api ? mapKey(EXT.api.key()) : ""),
    V: () => EXT.api.V(), M: () => EXT.api.M(),
    set: (k, v) => study(() => EXT.api.set(k, v)),
    open: (id) => EXT.api.open(id),
    go: (tab) => EXT.api.go(tab),
    closeAll: () => EXT.api.closeAll(),
    pop: () => EXT.api.pop(),
    top: () => EXT.api.top(),
    setWeek(id) { window.FOCUS_WEEK = id || "built"; if (EXT.api) EXT.api.renderTab(true); },
    setBottom(px) { insetB = Math.max(0, px || 0); },
    comments(on) { commentsOn = !!on; if (!on && picking) pick(false); },
    comment() { openComment({ how: "button" }); },
    pick,
    pay() { const api = EXT.api; api.closeAll(); return api.push("pay", { from: "" }); },
    /* the arms and the demo, from the session: on load, and again when intake ends */
    apply() {
      const api = EXT.api;
      if (!api) return;
      const s = FX.session() || {};
      const w = wanted();
      study(() => {
        DEC_KEYS.forEach((k) => { if (api.S[k] !== w[k]) api.set(k, w[k]); });
        const demo = Object.assign({ data: "est", meals: "all", plan: "member" }, CFG.demo || {});
        const person = s.person || "sarah";
        if (api.S.persona !== person) api.set("persona", person);
        if (api.S.data !== demo.data) api.set("data", demo.data);
        if (api.S.meals !== demo.meals) api.set("meals", demo.meals);
        if (api.S.plan !== demo.plan) api.set("plan", demo.plan);
      });
      window.FOCUS_WEEK = (s.arms && s.arms.week) || first(CFG.weekCard) || "built";
      api.renderTab(true);
    },
    reset() { const api = EXT.api; api.closeAll(); api.reset(); },
    /* a task starts on Today, with every tab back at its top: no Insights detail, no History month or filter, no card
       loaded into Ask, left over from the task before */
    home() { const api = EXT.api, S = api.S; api.closeAll(); S.ins = { range: 30, k: null, y: 0 }; S.hist = { filter: "all", n: 14 }; S.askCtx = null; api.go("today"); },
    framed: FRAMED
  };

  /* ---------- after refresh-app.js has built the phone ---------- */
  function init() {
    const api = EXT.api;
    if (!api) { console.error("Florin focus: the phone didn't build."); return; }
    api.set("full", true);
    window.FOCUS_APP.apply();
    document.documentElement.classList.add("fx-app-on");
    if (DEMO) demoBar();
    setInterval(watch, 250);
    watch();
    resolveReady(window.FOCUS_APP);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);

  /* ---------- app.html on its own (?demo=1): a slim bar with Comment and Your comments ---------- */
  let demoPick = () => {};
  function demoBar() {
    const bar = document.createElement("nav");
    bar.className = "fx-demobar";
    bar.setAttribute("aria-label", "Comments");
    const idle = `<span class="fx-demobar-t">Florin app, prototype</span><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fxd="list">Your comments</button><button type="button" class="fx-btn fx-btn--s" data-fxd="comment">Comment</button>`;
    const asking = `<span class="fx-demobar-t" role="status">Tap the part you mean</span><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fxd="screen">Whole screen</button><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fxd="cancel">Cancel</button>`;
    bar.innerHTML = idle;
    demoPick = (on) => { bar.innerHTML = on ? asking : idle; };
    document.body.appendChild(bar);
    document.documentElement.classList.add("fx-has-demobar");
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-fxd]");
      if (!b) return;
      if (b.dataset.fxd === "comment") pick(true);
      else if (b.dataset.fxd === "screen") { pick(false); openComment({ how: "button" }); }
      else if (b.dataset.fxd === "cancel") pick(false);
      else {
        let sh = document.querySelector(".fx-demo-list");
        if (sh) { sh.remove(); return; }
        sh = document.createElement("section");
        sh.className = "ap fx-demo-list";
        sh.setAttribute("data-theme", FX.dark() ? "dark" : "light");
        sh.innerHTML = `<div class="fx-demo-list-h"><h2>Your comments</h2><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fxd-x>Close</button></div><p class="fx-p fx-muted">${FX.session() && FX.session().consented ? "These go to the Florin Health team with your study answers." : "These stay on this phone. They go to the team only as part of the study."}</p><div data-fxd-list></div>`;
        document.body.appendChild(sh);
        FX.comments.review(sh.querySelector("[data-fxd-list]"));
        sh.querySelector("[data-fxd-x]").addEventListener("click", () => sh.remove());
      }
    });
  }
  /* the arrow keys step through the demo page's Screens list when nothing has focus: not here */
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && (t === document.body || t === document.documentElement)) e.stopImmediatePropagation();
  }, true);
})();
