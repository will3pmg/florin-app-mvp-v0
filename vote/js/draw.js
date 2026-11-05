/* Florin app vote: the pictures. Every option's frames, drawn live in the voter's browser from the prototype's own
   model and screens (loaded read only, in CLAUDE.md's order, without refresh-app.js), the way the modules page draws its
   cards. No screenshots and no typed figures. window.VOTE_DRAW

   Two frames:
     phone()   Part 1: the markup of refresh-app.js's Phone() (status bar, the tab's screen, the tab bar, an overlay as
               push() wraps it, a toast), with the decisions stamped on the .ap root as Phone()'s stamp() does, drawn at
               390 by 844 and scaled to its column by the page (vote.js)
     card()    Part 2: one data module's card on the app's ground at a phone card's width, as modules.js's apWrap and
               lookWrap draw it
   Every frame goes through still(), copied from modules.js: count-ups stripped, buttons disabled with role none and
   their acts removed, links unlinked, inputs disabled, tab stops removed, ids made unique with their references
   rewritten. The page marks each picture aria-hidden: its words are the app's, and the option's name, line and Why or
   why not carry it for a screen reader. Nothing in a picture takes a press or scrolls on the page, so the wheel and a
   swipe always move the page; a long screen scrolls only in the bigger view (vote.css).

   The model: Sarah, 12 weeks of logs, meals every day (L.build), and for Home's Day 5 control her logs on day 5. Part 2
   reads the data looks' one object (FLD.build over the same model). Both are built on the first question and kept.
   frames(q, optId, o) gives [{ cap, kind, html, at, focus }]; a frame that throws gives html null (the page says "This
   picture didn't draw.") and is logged. The month's two calendars are drawn on the last whole month. */
(function () {
  "use strict";
  const W = window;
  const FL = W.FL, L = W.FLORIN_LOGS, RU = W.FLORIN_RUI, AD = W.FLORIN_APP, FLD = W.FLD, EXT = W.FLORIN_EXT, Q = W.VOTE_Q;
  const ready = !!(FL && L && RU && AD && FLD && EXT && Q && RU.today && RU.history && RU.plus && RU.bm && RU.insights && RU.scoreHero && RU.idetail && RU.core && RU.core.weekCard && EXT.overlays && EXT.overlays.onb);
  if (!ready) { W.VOTE_DRAW = { ready: false }; return; }
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, ic = RU.icon;
  const n1 = (v) => Math.round(v * 10) / 10;
  const lin = (W.FLC && W.FLC.lin) || ((d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1));
  /* the looks' shared helpers, as the library page sets them; a still picture never counts up */
  if (!W.FLL) W.FLL = { esc, T, n1, lin, C: W.FLC, countUp() {}, reduced: () => true };
  const MODE = Q.BASE.form;
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const andJoin = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

  /* ---------- the page's theme, which every frame takes ---------- */
  let THEME = "light";
  const setTheme = (t) => { const v = t === "dark" ? "dark" : "light"; if (v !== THEME) { THEME = v; MEMO = {}; } };

  /* ---------- the models, built once ---------- */
  let X = null, MEMO = {}, UID = 0, PIC = 0;
  const V = (o) => Object.assign({}, Q.BASE, o || {}, { uid: ++UID });
  function models() {
    if (X) return X;
    const B = Q.BASE;
    const M = L.build(B.persona, B.data, { meals: B.meals });
    X = { M, Mn: null, D: null };
    return X;
  }
  const day5 = () => { const x = models(); if (!x.Mn) x.Mn = L.build(Q.BASE.persona, "new", { meals: Q.BASE.meals }); return x.Mn; };
  const looksData = () => { const x = models(); if (!x.D) x.D = FLD.build(Q.BASE.persona, { mode: MODE, data: Q.BASE.data, meals: Q.BASE.meals, M: x.M }); return x.D; };
  const personName = () => (FLD.PERSONAS.find((p) => p[0] === Q.BASE.persona) || [Q.BASE.persona, cap1(Q.BASE.persona)])[1];
  const weeks = () => { const M = models().M; return Math.floor((L.TODAY - M.start) / 7); };
  const learnDay = () => L.learnDay(day5());

  /* ---------- a picture is still ---------- */
  const box = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d; };
  const IDREF = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-details", "aria-activedescendant", "for", "list", "headers"];
  /* ids made unique, their references (and url(#id) in a drawing) rewritten: a picture drawn twice, or shown again in
     the bigger view, never repeats an id or a gradient */
  function reid(el, pfx) {
    const map = {};
    el.querySelectorAll("[id]").forEach((e) => { map[e.id] = `${pfx}-${e.id}`; e.id = map[e.id]; });
    const olds = Object.keys(map);
    if (!olds.length) return el;
    const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`#(${olds.map(reEsc).join("|")})(?![\\w-])`, "g");
    el.querySelectorAll("*").forEach((e) => {
      [...e.attributes].forEach((a) => {
        if (IDREF.includes(a.name)) { e.setAttribute(a.name, a.value.split(/\s+/).map((t) => map[t] || t).join(" ")); return; }
        if (a.value.indexOf("#") >= 0 && re.test(a.value)) { re.lastIndex = 0; e.setAttribute(a.name, a.value.replace(re, (s, id) => `#${map[id]}`)); }
        re.lastIndex = 0;
      });
    });
    return el;
  }
  function still(el) {
    const pfx = `vt${++PIC}`;
    el.querySelectorAll("[data-count]").forEach((e) => { e.removeAttribute("data-count"); e.removeAttribute("data-dur"); e.removeAttribute("data-dec"); });
    el.querySelectorAll("button").forEach((b) => { b.disabled = true; b.setAttribute("role", "none"); ["data-act", "aria-expanded", "aria-controls", "aria-haspopup", "aria-label", "title"].forEach((a) => b.removeAttribute(a)); });
    el.querySelectorAll("a[href]").forEach((a) => a.removeAttribute("href"));
    el.querySelectorAll("input, select, textarea").forEach((e) => { e.disabled = true; e.setAttribute("tabindex", "-1"); });
    el.querySelectorAll("[tabindex]").forEach((e) => { if (!/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) e.removeAttribute("tabindex"); });
    el.querySelectorAll("summary").forEach((s) => s.setAttribute("tabindex", "-1"));
    el.querySelectorAll("[autofocus], [data-autofocus]").forEach((e) => { e.removeAttribute("autofocus"); e.removeAttribute("data-autofocus"); });
    el.querySelectorAll("[role='dialog']").forEach((e) => { e.removeAttribute("role"); e.removeAttribute("aria-modal"); });
    el.querySelectorAll("[aria-live]").forEach((e) => e.removeAttribute("aria-live"));
    reid(el, pfx);
    /* every look and Easy box inside takes the page's theme (the modules read it from a phone this page doesn't have) */
    el.querySelectorAll("[data-theme]").forEach((e) => e.setAttribute("data-theme", THEME));
    return el;
  }

  /* ---------- the phone frame: Phone()'s markup, still ---------- */
  const statusIcons = `<span class="apx-status-r"><svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg> <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.2 6.6a6.8 6.8 0 0 1 9.6 0l-1.4 1.4a4.8 4.8 0 0 0-6.8 0zM.8 4.2a10.2 10.2 0 0 1 14.4 0l-1.4 1.4a8.2 8.2 0 0 0-11.6 0z"/></svg> <svg viewBox="0 0 27 12" aria-hidden="true"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="2"/><rect x="24" y="4" width="2" height="4" rx="1" opacity=".45"/></svg></span>`;
  const KIND = { plus: "sheet", earlier: "sheet", bm: "full", sym: "full", meal: "full", ck: "screen", onb: "screen" };
  const STAMP = ["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard", "plan"];
  const attrOf = (k) => "data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
  const TABS = [["today", "home", "Today"], ["insights", "chart", "Insights"], null, ["history", "list", "History"], ["ask", "chat", "Ask"]];
  /* f: { V, tab, screen, ovl: { type, html }, toast: { msg, more, undo } } */
  function phone(f) {
    const v = f.V, kind = f.ovl ? KIND[f.ovl.type] || "sheet" : null;
    const stamp = STAMP.map((k) => `${attrOf(k)}="${esc(String(v[k]))}"`).join(" ");
    const tb = TABS.map((t) => (t ? `<button type="button" class="ap-tb-b" data-tab="${t[0]}" aria-current="${t[0] === f.tab}">${ic(t[1])}<span>${t[2]}</span></button>` : `<button type="button" class="ap-tb-plus">${ic("plus")}${v.easy ? '<span class="ap-ez-tbl" aria-hidden="true">Add</span>' : ""}</button>`)).join("");
    const ovl = f.ovl ? `<div class="ap-o ap-o--${kind} ap-o--t-${esc(f.ovl.type)} is-now">${kind === "screen" ? "" : '<div class="ap-o-scrim" aria-hidden="true"></div>'}<div class="ap-o-p">${f.ovl.html}</div></div>` : "";
    const tst = f.toast ? `<div class="ap-tst is-on"><span>${esc(f.toast.msg)}</span>${f.toast.more ? `<button type="button" class="ap-tst-b">${esc(f.toast.more)}</button>` : ""}${f.toast.undo ? `<button type="button" class="ap-tst-b">${ic("undo")}Undo</button>` : ""}</div>` : "";
    const cls = ["ap", "ap-rx", "vt-phone"].concat(v.easy ? ["ap--easy"] : [], f.ovl ? ["has-ovl"] : [], f.ovl && kind !== "sheet" ? ["has-full"] : []).join(" ");
    const time = T(L.NOW).replace(/\s*[AP]M$/i, "");
    return `<div class="${cls}" data-theme="${THEME}" ${stamp}>
      <div class="apx-status"><span>${esc(time)}</span>${statusIcons}</div><div class="apx-island"></div>
      <div class="ap-stack"><div class="ap-layer">${f.screen || ""}</div></div>
      <nav class="ap-tb">${tb}</nav>
      <div class="ap-ovl">${ovl}</div>
      ${tst}
      <div class="apx-homebar"></div>
    </div>`;
  }
  /* a card on the app's ground, at a phone card's width (modules.js's apWrap and lookWrap) */
  const card = (inner, cls) => `<div class="ap ap-rx vt-card${cls ? ` ${cls}` : ""}" data-theme="${THEME}"><div class="vt-card-in">${inner}</div></div>`;
  const lookWrap = (id, inner) => card(`<div class="rlk-look lk-${esc(id)}" data-theme="${THEME}">${inner}</div>`);
  /* a screen with one element marked, so the page scrolls the frame to it */
  function mark(html, sel, pick) {
    const b = box(html);
    let el = b.querySelector(sel);
    if (el && pick) el = pick(el);
    if (el) el.setAttribute("data-vt-at", "1");
    return b.innerHTML;
  }
  /* focus: where a picture cut short on a phone keeps its view (vote.js): the top of the screen, or the top of a sheet
     that rises from the bottom (the plus menu), so the part the option is about is the part shown */
  const done = (o) => { const el = still(box(o.html)); return { cap: o.cap, kind: o.kind, html: el.innerHTML, at: !!el.querySelector("[data-vt-at]"), raw: o.raw || "", focus: o.focus || (el.querySelector(".ap-o--sheet") ? "sheet" : "top") }; };

  /* ---------- the logs a picture needs ---------- */
  const newBm = (o) => Object.assign({ d: L.TODAY, t: L.NOW, form: null, word: null, how: {}, dur: null, flags: {}, note: "", details: false }, o || {});
  const newCk = () => ({ step: 0, answers: [null, null, null, null].slice(0, L.CHECKIN.length), tags: [], note: "" });
  const blankQuick = () => ({ d: L.TODAY, t: L.NOW, meal: "day", text: "", note: "", quick: true, voice: "idle" });
  /* the meal sheet as refresh-app.js's blankMeal() opens it today, with mealTime() applied as there */
  function blankMeal(M) {
    const d = L.TODAY;
    const had = (m) => { const x = L.day(M, d); return !!x && x.entries.some((e) => e.kind === "meal" && e.meal === m); };
    let k = L.mealFor(L.NOW);
    if (k === "other" && L.NOW >= 15 && L.NOW < 17 && !had("lunch")) k = "lunch";
    if (k === "other" && L.NOW >= 22.5 && !had("dinner")) k = "dinner";
    const st = { d, t: L.NOW, meal: k, text: "", note: "", autoT: "" };
    if (k !== L.mealFor(L.NOW)) {
      const u = L.mealUsualTime(M, st.meal);
      st.t = Math.min(u, L.NOW);
      st.autoT = `Set to ${T(st.t)}, when you usually log ${st.meal === "other" ? "a snack or drink" : st.meal}. Change it if it was another time.`;
    }
    return st;
  }
  /* the latest of that meal in Sarah's own logs, before today: what "Filled in" types */
  function lastMealText(M, meal) {
    for (let i = M.days.length - 1; i >= 0; i--) {
      const x = M.days[i];
      if (!x.logged || x.d >= L.TODAY) continue;
      const e = x.entries.filter((y) => y.kind === "meal" && y.meal === meal && (y.text || "").trim()).pop();
      if (e) return e.text;
    }
    return "";
  }
  /* the onboarding answers as refresh-profile.js's newFlow() starts them */
  const ONB_FIELDS = ["name", "age", "sex", "periods", "brings", "goals", "usual", "sym", "eat", "stress", "foods", "meds", "medsText", "cond", "rchoice", "research", "rem"];
  function onbState(M, flow, step, a) {
    const ans = { skip: {} };
    ONB_FIELDS.forEach((f) => { ans[f] = null; });
    ans.medsText = ""; ans.research = false;
    ans.name = (M.P && M.P.name) || personName();
    ans.ckDay = Object.assign({}, M.ckDay);
    return { flow, step, a: Object.assign(ans, a || {}), form: null, word: null, varies: false };
  }
  /* the steps of a flow, by key: step i's data-step, data-at and data-of, and its title */
  function onbSteps(M, flow) {
    const k = `onb:${flow}`;
    if (MEMO[k]) return MEMO[k];
    const out = [];
    for (let i = 0; i < 30; i++) {
      const b = box(EXT.overlays.onb.render(M, V({ onboard: flow }), onbState(M, flow, i)));
      const el = b.querySelector("[data-step]");
      if (!el) break;
      const at = +el.dataset.at, of = +el.dataset.of;
      if (out.length && at <= out[out.length - 1].at) break;
      const h = b.querySelector(".ap-ck-b h3, .ap-ck-b h2");
      const sub = b.querySelector(".ap-fsh-t p");
      out.push({ i, key: el.dataset.step, at, of, title: h ? h.textContent.trim() : "", sub: sub ? sub.textContent.trim() : `Step ${at} of ${of}` });
      if (at >= of) break;
    }
    MEMO[k] = out;
    return out;
  }

  /* ---------- the words a line fills in, all from the model ---------- */
  function ctx() {
    if (MEMO.ctx) return MEMO.ctx;
    const M = models().M;
    const so = onbSteps(M, "short"), fu = onbSteps(M, "full");
    const shortN = so.length ? so[0].of : null, fullN = fu.length ? fu[0].of : null;
    MEMO.ctx = {
      ckN: cap1(Q.word(L.CHECKIN.length)),
      words5: andJoin(L.WORDS.map((w) => w.word)),
      words7: andJoin(L.TYPES.slice(1).map((t) => t.short)),
      shortN: shortN != null ? String(shortN) : null,
      fullN: fullN != null ? String(fullN) : null,
      blend: L.BLEND || 3,
      name: personName(), weeks: weeks(), day: learnDay()
    };
    /* the sheet's own figures, against the model: a step count or a word list that moved is a warning to fix the sheet */
    const sheetSays = (qid, oid) => (Q.optOf(qid, oid) || {}).sheet || [];
    const warn = (what) => console.warn(`Florin app vote: the decision sheet's words no longer match the app (${what}).`);
    const sm = /^\s*(\d+) steps/.exec(sheetSays("onboard", "short")[0] || "");
    if (shortN != null && (!sm || +sm[1] !== shortN)) warn("the short onboarding's steps");
    if (fullN != null && (sheetSays("onboard", "full")[0] || "").indexOf(`in ${fullN} steps`) < 0) warn("the full survey's steps");
    if ((sheetSays("words", "B")[0] || "").indexOf(MEMO.ctx.words5) < 0) warn("the five words");
    if ((sheetSays("words", "C")[0] || "").indexOf(MEMO.ctx.words7) < 0) warn("the seven words");
    return MEMO.ctx;
  }
  const demoLine = (o) => {
    const c = ctx();
    return o && o.day5 ? `Drawn from ${c.name}'s logs on day ${c.day}, before Florin knows her usual. ${c.name} is a demo person.` : `Drawn from ${c.name}'s logs after ${c.weeks} weeks. ${c.name} is a demo person.`;
  };
  const logsLabels = () => [`${weeks()} weeks`, `Day ${learnDay()}`];

  /* ================================ PART 1: the app ================================ */
  const today = (M, v) => RU.today(M, v);
  const P1 = {
    home(o, x) {
      const M = x.day5 ? day5() : models().M, v = V({ home: o.id, data: x.day5 ? "new" : Q.BASE.data });
      return [{ cap: "Today", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v) }) }];
    },
    history(o) {
      const M = models().M, v = V({ history: o.id });
      return [{ cap: "History", kind: "phone", html: phone({ V: v, tab: "history", screen: RU.history(M, v, { filter: "all", n: 14 }) }) }];
    },
    bm(o) {
      const M = models().M;
      if (o.id === "quick") {
        const v = V({ bmUI: "quick" });
        /* the tiles save at once from the fifth BM: RU.bmCount(M) against RU.QUICK_AFTER */
        const a = { cap: "Tap plus", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "plus", html: RU.plus(M, v, {}) } }) };
        /* after the tap: a copy of the model with the BM added as the quick-bm act adds it, and its toast */
        const Mq = L.build(Q.BASE.persona, Q.BASE.data, { meals: Q.BASE.meals });
        const e = { kind: "bm", d: L.TODAY, t: L.NOW, form: 4, word: null, how: {}, dur: null, flags: {}, note: "" };
        const res = L.add(Mq, e) || {};
        const v2 = V({ bmUI: "quick" });
        const b = { cap: "Tap a tile", kind: "phone", html: phone({ V: v2, tab: "today", screen: today(Mq, v2), toast: { msg: `BM saved. ${L.formName(e, MODE)} at ${T(e.t)}.${res.replacedNoBm ? " It replaces No BM today." : ""}`, more: "Add details", undo: true } }) };
        return [a, b];
      }
      const v = V({ bmUI: "full" });
      return [
        { cap: "Tap plus", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "plus", html: RU.plus(M, v, {}) } }) },
        { cap: "The form", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "bm", html: RU.bm(M, v, newBm()) } }) }
      ];
    },
    words(o) {
      const M = models().M, v = V({ form: o.id });
      const w = L.WORDS.find((x) => x.types.includes(4));
      const st = o.id === "B" ? newBm({ word: w ? w.k : null }) : newBm({ form: 4 });
      const ins = mark(RU.insights(M, v, { range: 30 }), '.ap-ic-h[data-k="form"]', (h) => h.closest("section") || h);
      return [
        { cap: "Log a BM", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "bm", html: RU.bm(M, v, st) } }) },
        { cap: "On Insights", kind: "phone", html: phone({ V: v, tab: "insights", screen: ins }) }
      ];
    },
    checkin(o) {
      const M = models().M;
      if (o.id === "on") {
        const v = V({ checkin: true });
        const t = mark(today(M, v), ".ap-ckc, .vr-cp-ck, [data-act=\"ck-start\"]");
        const ins = mark(RU.insights(M, v, { range: 30 }), '.ap-ic-h[data-k="ck"]', (h) => h.closest("section") || h);
        return [
          { cap: "Today", kind: "phone", html: phone({ V: v, tab: "today", screen: t }) },
          { cap: "The questions", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "ck", html: RU.ck(M, v, newCk()) } }) },
          { cap: "On Insights", kind: "phone", html: phone({ V: v, tab: "insights", screen: ins }) }
        ];
      }
      const v = V({ checkin: false });
      return [
        { cap: "Today, with no check-in card", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v) }) },
        { cap: "Plus, with no check-in in the menu", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "plus", html: RU.plus(M, v, {}) } }) }
      ];
    },
    meals(o) {
      const M = models().M;
      if (o.id === "quick") {
        const v = V({ mealUI: "quick" });
        const said = Object.assign(blankQuick(), { voice: "done", text: L.mealSay(M, L.TODAY) || "" });
        return [
          { cap: "The sheet", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "meal", html: RU.mealQuick(M, v, blankQuick()) } }) },
          { cap: "After speaking", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "meal", html: RU.mealQuick(M, v, said) } }) }
        ];
      }
      const v = V({ mealUI: "detailed" });
      const st = blankMeal(M);
      const filled = Object.assign({}, st, { text: lastMealText(M, st.meal) });
      return [
        { cap: "The sheet", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "meal", html: RU.meal(M, v, st) } }) },
        { cap: "Filled in", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "meal", html: RU.meal(M, v, filled) } }) }
      ];
    },
    easy(o) {
      const M = models().M, on = o.id === "easy", v = V({ easy: on });
      return [
        { cap: "Today", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v) }) },
        { cap: on ? "Log a BM, step 1 of 4" : "Log a BM", kind: "phone", html: phone({ V: v, tab: "today", screen: today(M, v), ovl: { type: "bm", html: RU.bm(M, v, newBm()) } }) },
        { cap: on ? "Your weeks" : "Insights", kind: "phone", html: phone({ V: v, tab: on ? "today" : "insights", screen: RU.insights(M, v, { range: 30 }) }) }
      ];
    },
    onboard(o) {
      const M = models().M, flow = o.id === "full" ? "full" : "short", v = V({ onboard: flow });
      const steps = onbSteps(M, flow);
      const keys = flow === "short" ? ["welcome", "brings", "isnt"] : ["welcome", "eat", "sym"];
      return keys.map((k) => {
        const s = steps.find((x) => x.key === k);
        if (!s) throw new Error(`the ${flow} flow has no ${k} step`);
        const a = k === "sym" ? { sym: ["bloating", "blood"] } : null;
        const html = EXT.overlays.onb.render(M, v, onbState(M, flow, s.i, a));
        const scr = k === "sym" ? mark(html, ".pf-alarm") : html;
        return { cap: `${s.sub}: ${s.title}${k === "sym" ? ", with blood picked" : ""}`, kind: "phone", html: phone({ V: v, tab: "today", screen: "", ovl: { type: "onb", html: scr } }) };
      });
    }
  };

  /* ================================ PART 2: the charts ================================ */
  const lookById = (id) => (W.FLOOKS || []).find((l) => l.id === id);
  const ctxOf = (look) => ({ uid: `vt${look.id}${++UID}`, theme: THEME, esc, T, n1, lin, C: W.FLC, motion: false });
  const insBox = (n) => { const k = `ins${n}`; if (!MEMO[k]) MEMO[k] = box(RU.insights(models().M, V(), { range: n })); return MEMO[k]; };
  const insSection = (n, k) => { const h = insBox(n).querySelector(`.ap-ic-h[data-k="${k}"]`); return h ? h.closest("section") : null; };
  const outer = (el) => (el ? el.outerHTML : null);
  /* the month question draws both calendars on the last whole month, so they show as many days as the other styles'
     30, never a month barely begun (the calendar's own month step, st.vrM, as its arrows set it) */
  const VAR = W.FLORIN_VARIANTS || {};
  const calMonth = () => {
    const M = models().M;
    if (!VAR.monthOf) return null;
    return Math.max(VAR.monthOf(M.start), VAR.monthOf(L.TODAY) - 1);
  };
  const calendar = () => box(RU.history(models().M, V({ history: "calendar" }), calMonth() != null ? { vrM: calMonth() } : {})).querySelector("section.vr-cal");
  /* Florin charts: each module as the app draws it now (modules.js's BUILT; its extra sub-figures left out) */
  const BUILT = {
    score: () => RU.scoreHero(models().M, V()),
    trend: () => outer(insSection(30, "score")),
    parts: () => {
      const b = box(RU.idetail(models().M, V(), { k: "score", range: 30 }));
      const f = [...b.querySelectorAll("figure.ap-fig")].find((x) => /^What moved it/.test((x.querySelector("figcaption") || {}).textContent || ""));
      if (f) return f.outerHTML;
      const h = b.querySelector(".ap-dhero");
      return h ? h.outerHTML + [...b.querySelectorAll(".ap-sect-p")].map((x) => x.outerHTML).join("") : null;
    },
    /* the core's card: refresh-looks.js turns RU.weekCard into the Rings week here, so the core's copy is drawn */
    week: () => RU.core.weekCard(models().M, MODE),
    month: () => outer(calendar()),
    timing: () => outer(insSection(30, "timing")),
    often: () => outer(insSection(30, "often")),
    form: () => outer(insSection(30, "form")),
    symptoms: () => outer(insSection(30, "sym")),
    checkin: () => outer(insSection(30, "ck")),
    pattern: () => outer(insSection(30, "pat"))
  };
  const CARD = { score: "score", trend: "trend", parts: "parts", week: "week", month: "month", timing: "timing", often: "often", form: "form", symptoms: "symptoms", checkin: "checkin", pattern: "pattern" };
  /* the week's ring for a day: the Rings look's own day ring (its marks.ring, drawn at its month card's size), from that
     day's facts, for any day of any month (modules.js's ringInto) */
  function ringFor(d) {
    const k = `ring:${d}`;
    if (k in MEMO) return MEMO[k];
    const look = lookById("rings"), M = models().M, x = L.day(M, d);
    let svg = null;
    if (look && look.marks && look.marks.ring && x) {
      const f = L.facts(M, x, MODE);
      svg = look.marks.ring({ logged: f.logged && !f.pending, pending: f.pending, state: f.state }, 34, 3.6);
    }
    MEMO[k] = svg;
    return svg;
  }
  const RINGED = ["usual", "shift", "quiet"];
  function ringInto(markEl) {
    const k = RINGED.find((c) => markEl.classList.contains(`ap-day--${c}`));
    const c = markEl.querySelector(".ap-day-c");
    const d = +markEl.dataset.day;
    const svg = k && c && ringFor(d);
    if (!svg) return false;
    const r = document.createElement("span");
    r.className = "vt-ringc rlk-look lk-rings";
    r.setAttribute("data-theme", THEME);
    r.setAttribute("aria-hidden", "true");
    r.innerHTML = `<span class="rg vt-rg0"><span class="rg-md${d === L.TODAY ? " is-today" : ""}">${svg}<b>${L.dateOf(d).getDate()}</b></span></span>`;
    c.replaceWith(r);
    return true;
  }
  function calRing() {
    const cal = calendar();
    if (!cal) return null;
    cal.querySelectorAll(".vr-cal-d .ap-day").forEach(ringInto);
    cal.classList.add("vt-ringcal");
    return cal.outerHTML;
  }
  /* one chart in one style: the card's html, unstilled (the week's Rings words read it) */
  function chartHtml(mod, style) {
    const k = `chart:${mod}:${style}`;
    if (k in MEMO) return MEMO[k];
    let h = null;
    if (style === "cal-ring") { const c = calRing(); h = c ? card(c) : null; }
    else if (style === "built") { const c = BUILT[mod](); h = c ? card(c) : null; }
    else {
      const look = lookById(style);
      if (!look || !look.components || !look.components[CARD[mod]]) throw new Error(`the ${style} style has no ${mod} card`);
      h = lookWrap(style, look.components[CARD[mod]](looksData(), ctxOf(look)));
    }
    MEMO[k] = h;
    return h;
  }

  /* the stretch a card counts, over it (modules.js's spanOf) */
  const dOf = (d) => L.dateOf(d);
  const fmtD = (d) => { const x = dOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const span2 = (a, b) => { if (a === b) return fmtD(a); const x = dOf(a), y = dOf(b); return x.getMonth() === y.getMonth() ? `${fmtD(a)} to ${y.getDate()}` : `${fmtD(a)} to ${fmtD(b)}`; };
  const rangeOf = (n) => span2(Math.max(L.TODAY - n + 1, models().M.start), L.TODAY);
  const SPAN = { score: "today", trend: 30, parts: "weeks", week: 7, month: "month", timing: 30, often: 30, form: 30, symptoms: 30, checkin: "checkin", pattern: 30 };
  function spanOf(mod, style) {
    const M = models().M, since = !M.usual && M.start > L.TODAY - 29;
    const last30 = () => (since ? `Since the person started, ${rangeOf(30)}` : `The last 30 days, ${rangeOf(30)}`);
    switch (SPAN[mod]) {
      case "today": return `Today, ${fmtD(L.TODAY)}`;
      case 7: return `The last 7 days, ${rangeOf(7)}`;
      case 30: return last30();
      case "weeks": return "This week against last";
      case "checkin": return "This week's answers, against the first weeks";
      case "month": {
        if (style === "built" || style === "cal-ring") {
          const m = calMonth();
          if (m == null) { const t = dOf(L.TODAY); return `${Ut.MONL[t.getMonth()]} so far, ${span2(Math.max(L.TODAY - t.getDate() + 1, M.start), L.TODAY)}`; }
          const ds = VAR.monthDays(m).filter((d) => d >= M.start && d <= L.TODAY);
          return `${Ut.MONL[m % 12]}, ${span2(ds[0], ds[ds.length - 1])}`;
        }
        return last30();
      }
      default: return "";
    }
  }

  /* ================================ the frames of one option ================================ */
  function frames(q, optId, o) {
    o = o || {};
    const opt = Q.optOf(q, optId);
    const key = `f:${q.id}:${optId}:${o.day5 ? 5 : 0}`;
    if (MEMO[key]) return MEMO[key];
    let out;
    try {
      models();
      if (q.part === 1) out = P1[q.id](opt, o).map(done);
      else {
        const h = chartHtml(q.mod, optId);
        if (!h) throw new Error(`${opt.name} drew nothing for ${q.label}`);
        out = [done({ cap: spanOf(q.mod, optId), kind: "card", html: h, raw: h })];
      }
    } catch (e) {
      console.error(`Florin app vote: ${q.label}, ${opt ? opt.name : optId} didn't draw`, e);
      out = [{ cap: "", kind: q.part === 1 ? "phone" : "card", html: null, at: false }];
    }
    MEMO[key] = out;
    return out;
  }
  /* an option's three sentences; the week's Rings reads its card */
  function sheet(q, optId) {
    const opt = Q.optOf(q, optId);
    if (!opt || !opt.sheet) return null;
    if (typeof opt.sheet !== "function") return opt.sheet;
    let fig = "";
    try { fig = q.part === 2 ? chartHtml(q.mod, optId) || "" : ""; } catch (e) { fig = ""; }
    return Q.sheetOf(opt, { fig, blend: L.BLEND || 3 });
  }
  /* a question's lede: what the screen is, or the stretch the cards count (the month's calendars say their own month
     over the picture, since it differs from the others' 30 days) */
  const lede = (q) => (q.part === 1 ? q.lede : spanOf(q.mod, "rings"));

  const again = (el) => reid(el, `vt${++PIC}`);
  W.VOTE_DRAW = { ready: true, setTheme, frames, sheet, lede, spanOf, ctx, demoLine, logsLabels, models, again };
})();
