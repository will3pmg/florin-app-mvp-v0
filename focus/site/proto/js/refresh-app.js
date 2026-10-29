/* Florin app refresh: the prototype page. Will, Oct 27: the open decisions are toggles in the demo, not separate demos.
   The left bar holds the Decisions, the Demo controls and the Screens to jump to; the middle is one phone, live; the
   right is the notes for whatever the phone shows, or for the decision just changed. On a phone the app fills the
   screen and a slim bar at the top opens the Toggles and the Notes as sheets, so the app keeps its own tab bar.
   The phone is one working copy of the app. Every change to it goes through phone.set(key, value), and feature modules
   (loaded between refresh-insights.js and this file) plug in through window.FLORIN_EXT: see CLAUDE.md, Extension hooks. */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, B = window.FLORIN || {};
  const mount = document.getElementById("rx");
  if (!FL || !L || !RU || !AD || !mount) return;
  const esc = FL.esc, T = AD.util.fmtTime, ic = RU.icon;
  const EXT = window.FLORIN_EXT;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  /* a module's hook that throws is reported, never allowed to take the page down */
  const safe = (f, ...a) => { try { return f(...a); } catch (e) { console.error(e); return undefined; } };
  /* a screen, by its RU name. A module's wrapper that throws is reported, and the core's own screen (RU.core, kept
     before any module loaded) is drawn in its place, so a module can't blank the phone */
  const draw = (name, ...a) => {
    try { return RU[name](...a); } catch (e) {
      console.error(e);
      const base = RU.core && RU.core[name];
      if (base && base !== RU[name]) { try { return base(...a); } catch (e2) { console.error(e2); } }
      return "";
    }
  };
  const reduced = () => FL.reduced();
  const store = {
    get(k, d) { try { const v = localStorage.getItem("florin-refresh:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("florin-refresh:" + k, JSON.stringify(v)); } catch (e) { /* private window: fine */ } }
  };

  /* ---------- the claims check, from the studio's 22 rules ---------- */
  const RULES = (B.claimsRules || []).map((r) => Object.assign({}, r, { rx: new RegExp(r.re, r.id === "emdash" || r.id === "bang" ? "g" : "gi") }));
  const checkClaims = (text) => {
    const hits = [];
    RULES.forEach((r) => { r.rx.lastIndex = 0; let m; while ((m = r.rx.exec(text))) { if (!m[0].length) { r.rx.lastIndex++; continue; } hits.push({ text: m[0], rule: r }); } });
    return hits;
  };
  window.FLORIN_REFRESH_CHECK = checkClaims;

  /* ====================================================================== */
  /* ONE PHONE                                                               */
  /* ====================================================================== */
  let UID = 0;
  const statusIcons = `<span class="apx-status-r"><svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg> <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.2 6.6a6.8 6.8 0 0 1 9.6 0l-1.4 1.4a4.8 4.8 0 0 0-6.8 0zM.8 4.2a10.2 10.2 0 0 1 14.4 0l-1.4 1.4a8.2 8.2 0 0 0-11.6 0z"/></svg> <svg viewBox="0 0 27 12" aria-hidden="true"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="2"/><rect x="24" y="4" width="2" height="4" rx="1" opacity=".45"/></svg></span>`;
  const KIND = { pay: "sheet", plus: "sheet", earlier: "sheet", guide: "sheet", flag: "sheet", ckday: "sheet", nobm: "sheet", bm: "full", sym: "full", meal: "full", ck: "screen" };
  /* a module's overlay brings its own kind; it wins over a core one of the same name */
  const kindOf = (type) => (EXT.overlays[type] && EXT.overlays[type].kind) || KIND[type] || "sheet";
  /* the decisions the phone carries, each stamped on the app's root as a data attribute (data-bm-ui="full", say) so a
     module's CSS can follow it */
  const STAMP = ["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard", "plan"];
  const attrOf = (k) => "data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
  /* the screens that exist only with the weekly check-in on */
  const CK_SCREENS = ["ck-card", "ck", "ck-last", "ckdone", "ckday", "i-ck"];

  function Phone(host, cfg) {
    const S = {
      form: cfg.form, persona: cfg.persona, data: cfg.data, meals: cfg.meals || "all", mealUI: cfg.mealUI || "quick", plan: cfg.plan || "member",
      bmUI: cfg.bmUI || "quick", home: cfg.home || "score", history: cfg.history || "list", checkin: cfg.checkin !== false, look: cfg.look || "built", easy: !!cfg.easy, onboard: cfg.onboard || "short",
      tab: "today", ovl: [], hist: { filter: "all", n: 14 }, ins: { range: 30, k: null, y: 0 }, askCtx: null, uid: ++UID, undo: null, drafts: {}
    };
    S.M = L.build(S.persona, S.data, { meals: S.meals });
    host.innerHTML = `<div class="ap ap-rx" data-theme="${cfg.theme}">
        <div class="apx-status" aria-hidden="true"><span>7:40</span>${statusIcons}</div>
        <div class="apx-island" aria-hidden="true"></div>
        <div class="ap-stack"><div class="ap-layer" role="region" aria-label="App screen"></div></div>
        <nav class="ap-tb" aria-label="App tabs">
          <button type="button" class="ap-tb-b" data-act="tab" data-tab="today">${ic("home")}<span>Today</span></button>
          <button type="button" class="ap-tb-b" data-act="tab" data-tab="insights">${ic("chart")}<span>Insights</span></button>
          <button type="button" class="ap-tb-plus" data-act="plus" aria-label="Log something">${ic("plus")}</button>
          <button type="button" class="ap-tb-b" data-act="tab" data-tab="history">${ic("list")}<span>History</span></button>
          <button type="button" class="ap-tb-b" data-act="tab" data-tab="ask">${ic("chat")}<span>Ask</span></button>
        </nav>
        <div class="ap-ovl"></div>
        <div class="ap-tst" role="status" aria-live="polite"></div>
        <div class="sr" role="status" aria-live="polite" data-say></div>
        <div class="apx-homebar" aria-hidden="true"></div>
      </div>`;
    const root = host.querySelector(".ap"), layer = root.querySelector(".ap-layer"), tb = root.querySelector(".ap-tb");
    const ovlEl = root.querySelector(".ap-ovl"), tst = root.querySelector(".ap-tst");
    /* what every render function is told: the decisions, the plan and who this is */
    const V = () => ({ form: S.form, uid: S.uid, mealUI: S.mealUI, plan: S.plan, bmUI: S.bmUI, home: S.home, history: S.history, checkin: S.checkin, look: S.look, easy: S.easy, onboard: S.onboard, persona: S.persona, data: S.data, meals: S.meals });
    const stamp = () => STAMP.forEach((k) => root.setAttribute(attrOf(k), String(S[k])));
    stamp();
    const top = () => S.ovl[S.ovl.length - 1];

    /* ---------- the tab underneath ---------- */
    function renderTab(soft) {
      const y = layer.scrollTop;
      S.M.ckDraft = S.ckDraft || null;
      const html = S.tab === "today" ? draw("today", S.M, V()) : S.tab === "history" ? draw("history", S.M, V(), S.hist)
        : S.tab === "insights" ? (S.ins.k ? draw("idetail", S.M, V(), S.ins) : draw("insights", S.M, V(), S.ins)) : draw("ask", S.M, V(), S.askCtx);
      layer.classList.remove("ap-anim");
      layer.innerHTML = html;
      if (!soft && !reduced()) {
        void layer.offsetWidth;
        layer.classList.add("ap-anim");
        clearTimeout(layer._t);
        layer._t = setTimeout(() => layer.classList.remove("ap-anim"), 1400);
        countUp(layer);
      }
      layer.scrollTop = soft ? y : 0;
      tb.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === S.tab)));
      /* the page reads what's drawn (its claims check, the demo time line) */
      if (cfg.onDraw) cfg.onDraw();
    }
    /* big numerals (data-count) count up as a screen draws in; with reduced motion they're simply there */
    function countUp(el) {
      if (reduced()) return;
      el.querySelectorAll("[data-count]").forEach((n) => {
        const to = +n.dataset.count;
        if (!isFinite(to)) return;
        const t0 = performance.now(), dur = 1100;
        const step = (t) => { const k = Math.min(1, (t - t0) / dur); n.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
        n.textContent = "0";
        requestAnimationFrame(step);
      });
    }
    /* when the screen under the tab bar is replaced, focus lands on what the person moved to, or its heading */
    function focusSel(sel) {
      requestAnimationFrame(() => {
        if (top()) return;
        const el = (sel && layer.querySelector(sel)) || layer.querySelector(".ap-nav-t, .ap-h1");
        if (!el) return;
        el.focus({ preventScroll: true });
        const r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
        /* scroll the phone's screen only (scrollIntoView would move the page around it too); the phone may be scaled */
        if (r.top < lr.top || r.bottom > lr.bottom - 96) { const k = lr.height / layer.clientHeight || 1; layer.scrollTop += ((r.top + r.bottom) / 2 - (lr.top + lr.bottom) / 2) / k; }
      });
    }

    /* ---------- overlays: the plus menu, the log forms, the check-in ---------- */
    function ovlHTML(o) {
      if (EXT.overlays[o.type]) return safe(EXT.overlays[o.type].render, S.M, V(), o.st, api) || "";
      switch (o.type) {
        case "pay": return draw("paywall", S.M, V(), o.st);
        case "plus": return draw("plus", S.M, V(), o.st);
        case "earlier": return draw("earlier", S.M, V());
        case "bm": return draw("bm", S.M, V(), o.st);
        case "sym": return draw("sym", S.M, V(), o.st);
        case "meal": return o.st.quick ? draw("mealQuick", S.M, V(), o.st) : draw("meal", S.M, V(), o.st);
        case "guide": return draw("guide", V());
        case "flag": return draw("flagNote", o.st);
        case "ck": return draw("ck", S.M, V(), o.st);
        case "ckday": return draw("ckDay", S.M, o.st);
        case "nobm": return draw("nobmSheet", o.st);
        default: return "";
      }
    }
    const scroller = (el) => el.querySelector("[data-scroll], .ap-fsh-b, .ap-ck-b") || el.querySelector(".ap-psh");
    const keyOf = (el) => (el && el.dataset ? [el.dataset.act || "", el.dataset.v || "", el.dataset.form || "", el.dataset.word || ""].join("|") : "");
    /* focus goes to the thing the screen is for: the question, the answer, the tile, then anything */
    function focusIn(ov) {
      if (!ov) return;
      requestAnimationFrame(() => {
        if (ov.el.contains(document.activeElement)) return;
        /* Add details from the toast lands on the extras, scrolled into view */
        const xt = !!(ov.st && ov.st.details);
        const t = ov.el.querySelector("[data-autofocus]") || [xt && ".ap-xt .ap-ch", ".ap-ck-q h3", ".ap-ck-opt.is-on", ".ap-ck-opt", ".ap-fm-b.is-on", ".ap-fm-b", ".ap-ch", ".ap-pbm-h", "textarea", "input", "button:not(.ap-o-scrim)"].filter(Boolean).map((s) => ov.el.querySelector(s)).find(Boolean);
        if (t) t.focus({ preventScroll: !xt });
      });
    }
    /* what opened an overlay, as a key, so focus can find it again after the screen under it re-renders */
    const keyFor = (el) => (el && el !== document.body && root.contains(el) && el.dataset ? { act: el.dataset.act, id: el.dataset.id, tab: el.dataset.tab } : null);
    function refocus(k, id) {
      requestAnimationFrame(() => {
        if (top()) return;
        const a = document.activeElement;
        if (!id && a && a !== document.body && root.contains(a) && !a.closest(".ap-o.is-out, [inert]")) return;
        const q = [id && `[data-act="edit"][data-id="${CSS.escape(id)}"]`, k && k.id && `[data-act="edit"][data-id="${CSS.escape(k.id)}"]`, k && k.act && !k.id && `[data-act="${CSS.escape(k.act)}"]${k.tab ? `[data-tab="${CSS.escape(k.tab)}"]` : ""}`].filter(Boolean);
        /* a finished check-in replaces Start: land on what took its place before falling back to plus */
        if (k && k.act === "ck-start") q.push('[data-act="ck-result"]', '.ap-ic-h[data-k="ck"]');
        const el = q.map((s) => root.querySelector(s)).find(Boolean) || root.querySelector(".ap-tb-plus");
        if (el) el.focus({ preventScroll: true });
      });
    }
    /* a half-filled log is kept for next time, never thrown away by a close */
    const dirty = (k, st) => (k === "bm" ? st.form != null || st.word != null || !!(st.note || "").trim() || Object.values(st.how || {}).some(Boolean) || Object.values(st.flags || {}).some(Boolean) || st.dur != null
      : k === "sym" ? st.items.length > 0 || !!(st.note || "").trim() || !!(st.newName || "").trim()
      : k === "meal" ? !!(st.text || "").trim() : false);
    const sayEl = root.querySelector("[data-say]");
    const say = (t) => { sayEl.textContent = ""; setTimeout(() => (sayEl.textContent = t), 60); };
    /* opens an overlay and returns it, or null when it draws nothing (a module's render that threw, an unknown type):
       an empty sheet would leave the app inert behind it with no way out */
    function push(type, st = {}, o = {}) {
      const ov = { type, st, el: document.createElement("div"), opener: document.activeElement, okey: keyFor(document.activeElement), t0: performance.now() };
      const html = ovlHTML(ov);
      if (!html) { console.error(`Florin prototype: the "${type}" overlay drew nothing, so it wasn't opened.`); return null; }
      const kind = kindOf(type);
      ov.el.className = `ap-o ap-o--${kind} ap-o--t-${type}${o.instant || reduced() ? " is-now" : ""}`;
      /* a short sheet closes on a tap outside it; a log form doesn't, so a stray tap can't lose what's on it */
      ov.el.innerHTML = `${kind === "screen" ? "" : `<div class="ap-o-scrim"${kind === "sheet" ? ' data-act="close"' : ""} aria-hidden="true"></div>`}<div class="ap-o-p"></div>`;
      ov.el.querySelector(".ap-o-p").innerHTML = html;
      tst.classList.remove("is-on");
      clearTimeout(S.tT);
      S.undo = null;
      S.ovl.push(ov);
      ovlEl.appendChild(ov.el);
      if (!o.instant) focusIn(ov);
      nav();
      return ov;
    }
    function rerender(ov = top(), o = {}) {
      if (!ov) return;
      const p = ov.el.querySelector(".ap-o-p");
      const sc = scroller(p), y = sc ? sc.scrollTop : 0;
      const a = document.activeElement, inside = a && ov.el.contains(a);
      const fid = inside ? a.id : null, fkey = inside && !a.id ? keyOf(a) : null;
      /* a module's render that throws on a redraw leaves the last good one up */
      const html = ovlHTML(ov);
      if (!html) return;
      p.innerHTML = html;
      const sc2 = scroller(p);
      if (sc2) sc2.scrollTop = y;
      if (o.noRestore) return;
      if (fid) { const f = p.querySelector("#" + CSS.escape(fid)); if (f) f.focus({ preventScroll: true }); }
      else if (fkey) { const f = [...p.querySelectorAll("[data-act]")].find((el) => keyOf(el) === fkey); if (f) f.focus({ preventScroll: true }); }
    }
    function pop(o = {}) {
      const ov = S.ovl.pop();
      if (!ov) return;
      clearInterval(S.vT);
      if (ov.st && ov.st.voice === "listening") ov.st.voice = ov.st.text ? "done" : "idle";
      ov.el.inert = true;
      /* leaving the check-in part way keeps the answers, so the Today card can say Continue (a preview from the list doesn't) */
      if (ov.type === "ck" && !ov.st.preview && ov.st.step <= L.CHECKIN.length && S.M.checkin.status !== "done") S.ckDraft = ov.st.step > 0 || ov.st.answers.some((v) => v != null) ? ov.st : null;
      const kept = ["bm", "sym", "meal"].includes(ov.type) && !ov.st.edit && !ov.st.saved && dirty(ov.type, ov.st);
      if (kept) S.drafts[ov.type] = ov.st;
      if (o.instant || reduced()) ov.el.remove();
      else { ov.el.classList.add("is-out"); setTimeout(() => ov.el.remove(), 320); }
      if (ov.type === "ck") renderTab(true);
      nav();
      if (!o.instant && ov.opener && document.contains(ov.opener) && root.contains(ov.opener)) ov.opener.focus({ preventScroll: true });
      if (S.ovl.length) focusIn(top()); else refocus(ov.okey, o.focusId);
      if (kept) toast(`Not saved yet. ${ov.type === "bm" ? "This BM" : ov.type === "sym" ? "These symptoms" : "This meal"} will be here when you open it again.`);
    }
    function closeAll() { while (S.ovl.length) pop({ instant: true }); }
    /* swap the top overlay for another (the plus menu hands off to a log form) */
    function swap(type, st) { const opener = top() && top().opener; pop({ instant: true }); const ov = push(type, st); if (ov) ov.opener = opener; return ov; }

    /* ---------- toast, with undo ---------- */
    function toast(msg, undo, more) {
      S.undo = undo || null;
      tst.innerHTML = `<span>${esc(msg)}</span>${more ? `<button type="button" class="ap-tst-b" data-act="${more.act}" data-id="${esc(more.id)}"${more.details ? ' data-details="1"' : ""}>${esc(more.label)}</button>` : ""}${undo ? `<button type="button" class="ap-tst-b" data-act="undo">${ic("undo")}Undo</button>` : ""}`;
      tst.classList.add("is-on");
      clearTimeout(S.tT);
      S.tT = setTimeout(hideToast, undo ? 10000 : 4000);
    }
    /* an Undo toast waits while a finger or the keyboard is on it */
    const hideToast = () => { tst.classList.remove("is-on"); S.undo = null; };
    const holdToast = () => clearTimeout(S.tT);
    const resumeToast = () => { if (tst.classList.contains("is-on")) { clearTimeout(S.tT); S.tT = setTimeout(hideToast, 4000); } };
    tst.addEventListener("pointerenter", holdToast); tst.addEventListener("focusin", holdToast);
    tst.addEventListener("pointerleave", resumeToast); tst.addEventListener("focusout", resumeToast);
    /* everything a save can change, so undo puts it back */
    function snapshot() {
      const s = JSON.stringify({ days: S.M.days.map((x) => ({ d: x.d, logged: x.logged, entries: x.entries })), checkin: S.M.checkin, draft: S.ckDraft || null });
      return () => {
        const o = JSON.parse(s);
        o.days.forEach((y) => { const x = L.day(S.M, y.d); if (x) { x.logged = y.logged; x.entries = y.entries; } });
        S.M.checkin = o.checkin;
        S.ckDraft = o.draft;
        renderTab(true);
        toast("Undone.");
      };
    }
    function commit(st, kind, fields) {
      const restore = snapshot();
      let e, res = {};
      if (st.edit) {
        e = L.find(S.M, st.edit);
        Object.assign(e, fields);
        if (e.d !== st.d) res = L.move(S.M, e, st.d);
        else L.day(S.M, e.d).entries.sort((a, b) => a.t - b.t);
      } else {
        e = Object.assign({ kind, d: st.d }, fields);
        res = L.add(S.M, e);
      }
      return { e, res, restore };
    }
    const whenTxt = (e) => (e.d === L.TODAY ? "" : e.d === L.TODAY - 1 ? ", yesterday" : `, ${RU.dayName(e.d)}`);

    /* ---------- new and existing entries ---------- */
    /* a new log goes on today, or on the day the plus menu is catching up. An earlier day starts at a likely time */
    const logDay = () => { const t = top(); return t && (t.type === "plus" || t.type === "nobm") && t.st.d != null ? t.st.d : L.TODAY; };
    const usualFirst = () => (S.M.usual ? Math.round(((S.M.usual.tLo + S.M.usual.tHi) / 2) * 4) / 4 : 8);
    const fromDraft = (k, d) => { const s = S.drafts[k]; if (s && s.d === d) { delete S.drafts[k]; return s; } return null; };
    /* a BM's consistency is a step (A, C) or, logged in B, a word */
    const newBm = (form, d = L.TODAY, word = null) => { const s = fromDraft("bm", d); if (s) { if (form != null || word != null) { s.form = form; s.word = word; } return s; } return { d, t: d === L.TODAY ? L.NOW : usualFirst(), form: form == null ? null : form, word, how: {}, dur: null, flags: {}, note: "", details: false }; };
    /* the person's own symptoms (added with Something else) stay one tap away: the last three, newest first */
    const ownSyms = () => {
      const out = [];
      for (let i = S.M.days.length - 1; i >= 0 && out.length < 3; i--) S.M.days[i].entries.filter((e) => e.kind === "sym").slice().reverse().forEach((e) => e.items.forEach((it) => { if (out.length < 3 && !L.SYMPTOMS.includes(it.name) && !out.includes(it.name)) out.push(it.name); }));
      return out;
    };
    const newSym = (d = L.TODAY) => fromDraft("sym", d) || { d, t: d === L.TODAY ? L.NOW : 12, items: [], s: 0, last: null, note: "", custom: ownSyms() };
    /* a meal opens on the one that fits the hour, preferring one not logged yet today; on an earlier day the time
       follows the meal (the person's usual time for it). Until the person sets the time, picking a meal moves it */
    const mealTime = (st) => {
      if (st.tTouched) return;
      if (st.d === L.TODAY && st.meal === L.mealFor(L.NOW)) { st.t = L.NOW; st.autoT = ""; return; }
      const u = L.mealUsualTime(S.M, st.meal);
      st.t = st.d === L.TODAY ? Math.min(u, L.NOW) : u;
      st.autoT = `Set to ${T(st.t)}, when you usually log ${st.meal === "other" ? "a snack or drink" : st.meal}. Change it if it was another time.`;
    };
    const blankMeal = (d) => {
      const had = (m) => { const x = L.day(S.M, d); return !!x && x.entries.some((e) => e.kind === "meal" && e.meal === m); };
      let k = L.mealFor(d === L.TODAY ? L.NOW : 12.5);
      if (d === L.TODAY && k === "other" && L.NOW >= 15 && L.NOW < 17 && !had("lunch")) k = "lunch";
      if (d === L.TODAY && k === "other" && L.NOW >= 22.5 && !had("dinner")) k = "dinner";
      const st = { d, t: L.NOW, meal: k, text: "", note: "", autoT: "" };
      if (d !== L.TODAY || k !== L.mealFor(L.NOW)) mealTime(st);
      return st;
    };
    const blankQuick = (d) => ({ d, t: d === L.TODAY ? L.NOW : L.MEAL_DEFAULT_T.day, meal: "day", text: "", note: "", quick: true, voice: "idle" });
    /* a meal written on one sheet and opened on the other (the Meal sheet decision changed in between) keeps its words:
       the text and the note move into a fresh state of the right shape */
    const reshape = (st, quick) => (!!st.quick === quick ? st : Object.assign(quick ? blankQuick(st.d) : blankMeal(st.d), { text: st.text || "", note: st.note || "" }));
    const newMeal = (d = L.TODAY) => { const kept = fromDraft("meal", d); return kept ? reshape(kept, false) : blankMeal(d); };
    const newMealQuick = (d = L.TODAY) => { const kept = fromDraft("meal", d); return kept ? reshape(kept, true) : blankQuick(d); };
    const newCk = () => ({ step: 0, answers: [null, null, null, null], tags: [], note: "" });
    /* the pretend dictation: the words of a sample land in the box one at a time, with the counted foods following */
    function voiceStop(ov, said) {
      clearInterval(S.vT);
      const st = ov.st;
      st.voice = (st.text || "").trim() ? "done" : "idle";
      rerender(ov);
      const ta = ov.el.querySelector(".ap-mq-text");
      if (ta) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
      if (said) say(`Added: ${st.text.trim()}`);
    }
    function voiceStart(ov) {
      const st = ov.st;
      const words = L.mealSay(S.M, st.d).split(" ");
      st.text = (st.text || "").trim() ? `${st.text.trim()} ` : "";
      st.voice = "listening";
      rerender(ov);
      const mic = ov.el.querySelector(".ap-mq-mic"); if (mic) mic.focus({ preventScroll: true });
      if (reduced()) { st.text += words.join(" "); voiceStop(ov, true); return; }
      let i = 0;
      clearInterval(S.vT);
      S.vT = setInterval(() => {
        if (top() !== ov) { clearInterval(S.vT); return; }
        st.text += (i ? " " : "") + words[i++];
        const ta = ov.el.querySelector(".ap-mq-text"); if (ta) ta.value = st.text;
        const c = ov.el.querySelector(".ap-ml-count"); if (c && i % 3 === 0) c.innerHTML = RU.mealCount(S.M, st);
        const btn = ov.el.querySelector('[data-act="save-meal"]'); if (btn) btn.removeAttribute("aria-disabled");
        const hint = ov.el.querySelector(".ap-fsh-hint"); if (hint) hint.hidden = true;
        if (i >= words.length) voiceStop(ov, true);
      }, 150);
    }
    function openEntry(id, o = {}) {
      const e = L.find(S.M, id);
      if (!e) return;
      if (e.kind === "bm") push("bm", { edit: id, d: e.d, t: e.t, form: e.form, word: e.word == null ? null : e.word, how: Object.assign({}, e.how), dur: e.dur, flags: Object.assign({}, e.flags), note: e.note || "", details: !!o.details });
      else if (e.kind === "sym") { const own = e.items.map((i) => i.name).filter((n) => !L.SYMPTOMS.includes(n)); push("sym", { edit: id, d: e.d, t: e.t, items: e.items.map((i) => Object.assign({}, i)), s: Math.max(0, ...e.items.map((i) => i.s || 0)), last: e.last, note: e.note || "", custom: own.concat(ownSyms().filter((n) => !own.includes(n))) }); }
      else if (e.kind === "meal") push("meal", { edit: id, d: e.d, t: e.t, meal: e.meal, text: e.text, note: e.note || "", quick: e.meal === "day", voice: "idle" });
      else push("nobm", { edit: id, d: e.d, t: e.t });
    }
    function logNoBm(d = L.TODAY) {
      const restore = snapshot();
      L.add(S.M, { kind: "nobm", d, t: d === L.TODAY ? L.NOW : 21 });
      if (top() && top().type === "plus") pop({ instant: true });
      renderTab(true);
      toast(d === L.TODAY ? "Logged: no BM today. The day won't read as a gap." : `Logged: no BM ${d === L.TODAY - 1 ? "yesterday" : "on " + RU.dayName(d)}. It won't read as a gap.`, restore);
    }
    function blocked(b) {
      const f = b.closest(".ap-fsh-f, .ap-ck-fin");
      const h = f && f.querySelector(".ap-fsh-hint");
      if (h) { h.classList.remove("is-flash"); void h.offsetWidth; h.classList.add("is-flash"); }
      /* then lead the person to what's missing: the tiles on a BM, the list on symptoms, the text on a meal */
      const ov = top(), q = ov && { bm: ".ap-fm-b", sym: ".ap-fsh-b .ap-chs .ap-ch", meal: "[data-in='text']" }[ov.type];
      const want = q && ov.el.querySelector(q);
      if (want) { want.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }); want.focus({ preventScroll: true }); }
      if (h) say(h.textContent);
    }
    /* the check-in moves a step: focus goes to the new question, never onto the same answer of the next one */
    function stepTo(ov) {
      rerender(ov, { noRestore: true });
      const sc = ov.el.querySelector(".ap-ck-b"); if (sc) sc.scrollTop = 0;
      const h = ov.el.querySelector(".ap-ck-q h3, .ap-ckr h3"); if (h) h.focus({ preventScroll: true });
    }

    /* ---------- every tap inside the phone ---------- */
    const ACT = {
      tab(b) {
        closeAll();
        const inLayer = layer.contains(b);
        if (b.dataset.range) S.ins.range = +b.dataset.range;
        /* tapping the tab you're on goes back to its top: out of an Insights detail, or up the page */
        if (S.tab === b.dataset.tab) {
          if (S.tab === "insights" && S.ins.k) { S.ins.k = null; renderTab(); nav(); focusSel(); return; }
          if (b.dataset.range) { renderTab(true); nav(); return; }
          layer.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }); return;
        }
        if (b.dataset.tab === "insights" && b.dataset.range) S.ins.k = null;
        S.tab = b.dataset.tab; renderTab(); nav();
        if (inLayer) focusSel();
      },
      pay(b) { push("pay", { from: b.dataset.pay || b.dataset.k || "" }); },
      "pay-start"() {
        closeAll();
        if (cfg.onPlan) cfg.onPlan("member"); else set("plan", "member");
        toast("Membership is on in this demo. Insights and Ask Florin are open.");
      },
      irange(b) { S.ins.range = +b.dataset.v; renderTab(true); nav(); focusSel(`[data-act="irange"][data-v="${CSS.escape(b.dataset.v)}"]`); },
      idetail(b) {
        if (b.dataset.k === "ck" && !S.checkin) return;
        if (S.plan === "free") { push("pay", { from: b.dataset.k || "" }); return; }
        closeAll();
        if (S.tab === "insights" && !S.ins.k) S.ins.y = layer.scrollTop;
        S.tab = "insights"; S.ins.k = b.dataset.k; renderTab(); nav(); focusSel(".ap-nav-t");
      },
      iback() { const k = S.ins.k; S.ins.k = null; renderTab(true); layer.scrollTop = S.ins.y || 0; nav(); focusSel(k ? `[data-act="idetail"][data-k="${CSS.escape(k)}"]` : null); },
      "ask-about"(b) { if (S.plan === "free") { push("pay", { from: "ask" }); return; } closeAll(); S.askCtx = { k: b.dataset.k, range: S.ins.range }; S.tab = "ask"; renderTab(); nav(); focusSel(); },
      "ask-clear"() { S.askCtx = null; renderTab(true); nav(); focusSel(); },
      plus() { push("plus"); },
      close() { pop(); },
      "open-bm"(b) { const st = newBm(b.dataset.form ? +b.dataset.form : null, logDay(), b.dataset.word ? +b.dataset.word : null); if (top() && (top().type === "plus" || b.dataset.swap)) swap("bm", st); else push("bm", st); },
      "open-sym"() { const st = newSym(logDay()); if (top() && top().type === "plus") swap("sym", st); else push("sym", st); },
      "mq-mic"() { const ov = top(); if (!ov || !ov.st.quick) return; if (ov.st.voice === "listening") voiceStop(ov, true); else voiceStart(ov); },
      "open-meal"(b) {
        if (S.mealUI !== "detailed") { const st = newMealQuick(logDay()); if (top() && top().type === "plus") swap("meal", st); else push("meal", st); return; }
        const st = newMeal(logDay()); if (b && b.dataset.meal) { st.meal = b.dataset.meal; st.mealTouched = true; mealTime(st); } if (top() && top().type === "plus") swap("meal", st); else push("meal", st); },
      "plus-earlier"() { push("earlier"); },
      "plus-day"(b) {
        const d = +b.dataset.v;
        if (top() && top().type === "earlier") pop({ instant: true });
        const t = top();
        if (t && t.type === "plus") { t.st = d === L.TODAY ? {} : { d }; rerender(t); const h = t.el.querySelector(".ap-pbm-h"); if (h) h.focus({ preventScroll: true }); }
        else push("plus", d === L.TODAY ? {} : { d });
      },
      form(b) {
        const st = top().st;
        if (b.dataset.word != null) { st.word = +b.dataset.word; st.form = null; } else { st.form = +b.dataset.form; st.word = null; }
        const x = st.form != null ? st.form : { form: null, word: st.word };
        rerender();
        say(`${L.formName(x, S.form)} picked. ${L.formLine(x, S.form)}.`);
      },
      /* a tile on the plus card logs the BM now; the toast offers Add details and Undo */
      "quick-bm"(b) {
        const d = logDay();
        /* BM logging, Full form only: there is no one-tap save, so a tile (from a module, say) opens the form */
        if (d !== L.TODAY || S.bmUI === "full") return ACT["open-bm"](b);
        const restore = snapshot();
        const e = { kind: "bm", d, t: L.NOW, form: b.dataset.form ? +b.dataset.form : null, word: b.dataset.word ? +b.dataset.word : null, how: {}, dur: null, flags: {}, note: "" };
        const res = L.add(S.M, e);
        pop({ instant: true, focusId: e.id });
        renderTab(true);
        toast(`BM saved. ${L.formName(e, S.form)} at ${T(e.t)}.${res.replacedNoBm ? " It replaces No BM today." : ""}`, restore, { act: "edit", id: e.id, details: 1, label: "Add details" });
      },
      how(b) { const st = top().st; st.how[b.dataset.v] = !st.how[b.dataset.v]; rerender(); },
      dur(b) { const st = top().st, v = +b.dataset.v; st.dur = st.dur === v ? null : v; rerender(); },
      flag(b) { const st = top().st; st.flags[b.dataset.v] = !st.flags[b.dataset.v]; rerender(); },
      guide() { push("guide"); },
      "save-bm"(b) {
        const st = top().st;
        if (st.form == null && st.word == null) return blocked(b);
        const { e, res, restore } = commit(st, "bm", { t: st.t, form: st.form, word: st.form != null ? null : st.word, how: Object.assign({}, st.how), dur: st.dur, flags: Object.assign({}, st.flags), note: (st.note || "").trim() });
        const edit = !!st.edit;
        st.saved = true;
        pop({ instant: true, focusId: e.id });
        renderTab(true);
        /* the BM is the stool, so its note is read with the BM net: "It looked like tar" names the sign */
        const signs = L.alarmsIn(e.note, { bm: true }), sign = signs.length ? L.signText(signs) : null, flagged = L.FLAGS.some(([k]) => e.flags[k]);
        if (flagged || sign) { const fo = push("flag", { flags: Object.assign({}, e.flags), sign: flagged ? null : sign, signs: flagged ? [] : signs, restore }); if (fo) fo.okey = { act: "edit", id: e.id }; }
        else toast(`${edit ? "Saved" : "BM saved"}. ${L.formName(e, S.form)} at ${T(e.t)}${whenTxt(e)}.${res.replacedNoBm ? ` It replaces No BM ${e.d === L.TODAY ? "today" : "for that day"}.` : ""}`, restore);
      },
      delete() {
        const ov = top(), id = ov.st.edit;
        const restore = snapshot();
        const gone = L.remove(S.M, id);
        pop({ instant: true });
        renderTab(true);
        toast(gone ? `Deleted: ${RU.deletedText(gone.e)}${whenTxt(gone.e)}.` : "Deleted.", restore);
      },
      nobm() { logNoBm(logDay()); },
      "flag-undo"() { const r = top().st.restore; pop({ instant: true }); if (r) r(); },
      sym(b) {
        const st = top().st, n = b.dataset.v;
        const i = st.items.findIndex((x) => x.name === n);
        if (i >= 0) st.items.splice(i, 1); else st.items.push({ name: n, s: 0 });
        rerender();
      },
      "sym-other"() { const st = top().st; st.adding = true; rerender(); const inp = top().el.querySelector('[data-in="newsym"]'); if (inp) inp.focus(); },
      "sym-add"() {
        const st = top().st, n = (st.newName || "").trim();
        if (n) {
          /* the same name, whatever the case, reuses the one already there */
          const known = L.SYMPTOMS.concat(st.custom).find((x) => x.toLowerCase() === n.toLowerCase());
          const name = known || n.charAt(0).toUpperCase() + n.slice(1);
          if (!known) st.custom.push(name);
          if (!st.items.some((x) => x.name === name)) st.items.push({ name, s: 0 });
        }
        st.adding = false; st.newName = "";
        rerender();
      },
      str(b) { const st = top().st, v = +b.dataset.v; st.s = st.s === v ? 0 : v; rerender(); },
      last(b) { const st = top().st, v = +b.dataset.v; st.last = st.last === v ? null : v; rerender(); },
      "save-sym"(b) {
        const st = top().st;
        /* a name typed into Something else counts, without a second tap on Add */
        if (st.adding && (st.newName || "").trim()) ACT["sym-add"]();
        if (!st.items.length) return blocked(b);
        const { e, restore } = commit(st, "sym", { t: st.t, items: st.items.map((i) => ({ name: i.name, s: st.s || 0 })), last: st.last, note: (st.note || "").trim() });
        const edit = !!st.edit;
        st.saved = true;
        pop({ instant: true, focusId: e.id });
        renderTab(true);
        /* an alarm feature typed in goes to primary care, the same sheet as a flagged BM */
        const signs = L.alarmsIn(e.items.map((i) => i.name).join(". ") + ". " + e.note), sign = signs.length ? L.signText(signs) : null;
        if (sign) { const fo = push("flag", { sign, signs, restore }); if (fo) fo.okey = { act: "edit", id: e.id }; }
        else toast(`${edit ? "Saved" : "Symptoms saved"}. ${RU.entryText(e, S.form).title} at ${T(e.t)}${whenTxt(e)}.`, restore);
      },
      meal(b) { const st = top().st; st.meal = b.dataset.v; st.mealTouched = true; mealTime(st); rerender(); },
      "meal-same"(b) { const st = top().st; st.text = b.dataset.v; rerender(); },
      /* a recent food adds to what's typed; tapped again, it takes out the part that was only that food */
      "meal-food"(b) {
        const st = top().st, k = b.dataset.v, text = (st.text || "").trim();
        if (L.matchFoods(text).includes(k)) {
          const parts = text.split(/\s*,\s*/).filter((p) => !(L.matchFoods(p).length === 1 && L.matchFoods(p)[0] === k));
          st.text = parts.join(", ");
        } else {
          const name = L.FOOD_NAMES[k][0];
          st.text = text ? `${text}, ${name.toLowerCase()}` : name;
        }
        rerender();
      },
      "save-meal"(b) {
        const st = top().st, text = (st.text || "").trim();
        if (!text) return blocked(b);
        const foods = L.matchFoods(text);
        const { e, restore } = commit(st, "meal", { t: st.t, meal: st.meal, text, foods, note: (st.note || "").trim() });
        const edit = !!st.edit;
        st.saved = true;
        pop({ instant: true, focusId: e.id });
        renderTab(true);
        if (e.meal === "day") toast(`${edit ? "Saved" : "Saved what you ate"}${whenTxt(e) || (e.d === L.TODAY ? " today" : "")}. ${e.foods.length ? `${e.foods.length} ${e.foods.length === 1 ? "food" : "foods"} counted.` : "No foods counted from it."}`, restore);
        else toast(`${edit ? "Saved" : `${L.mealLabel(e.meal)} saved`}. ${T(e.t)}${whenTxt(e)}.${e.foods.length ? "" : " No foods counted from it."}`, restore);
      },
      "ck-start"() {
        if (!S.checkin) return;
        const st = S.ckDraft || newCk();
        if (top() && top().type === "plus") swap("ck", st); else push("ck", st);
      },
      "ck-ans"(b) {
        const ov = top(), st = ov.st, v = +b.dataset.v;
        st.answers[st.step] = v;
        rerender();
        clearTimeout(S.ckT);
        /* a short pause shows the pick before moving on, with or without motion */
        S.ckT = setTimeout(() => { if (top() === ov && st.step < L.CHECKIN.length) { st.step++; stepTo(ov); } }, 400);
      },
      "ck-next"() {
        const ov = top(), st = ov.st;
        clearTimeout(S.ckT);
        if (st.step < L.CHECKIN.length) st.step++;
        stepTo(ov);
      },
      /* a mis-tap after Finish: back to question 1 with the answers kept, until next week's opens */
      "ck-edit"() { const st = top().st; st.step = 0; stepTo(top()); },
      "ck-back"() { const st = top().st; clearTimeout(S.ckT); st.step = Math.max(0, st.step - 1); stepTo(top()); },
      "ck-tag"(b) { const st = top().st, v = b.dataset.v; const i = st.tags.indexOf(v); if (i >= 0) st.tags.splice(i, 1); else st.tags.push(v); rerender(); },
      "ck-finish"() {
        const st = top().st;
        Object.assign(S.M.checkin, { status: "done", answers: st.answers.slice(), tags: st.tags.slice(), note: (st.note || "").trim() });
        S.ckDraft = null;
        st.step = L.CHECKIN.length + 1;
        stepTo(top());
        renderTab(true);
        nav();
      },
      "ck-skip"() {
        if (!S.checkin) return;
        const restore = snapshot();
        S.M.checkin.status = "skipped";
        S.ckDraft = null;
        renderTab(true);
        toast("Skipped for this week. It's still in the plus menu if you change your mind.", restore);
        /* the button that was pressed is gone: Undo in the toast is the next thing to do */
        requestAnimationFrame(() => { const u = tst.querySelector('[data-act="undo"]'); if (u) u.focus({ preventScroll: true }); });
      },
      "ck-result"() {
        if (!S.checkin) return;
        const c = S.M.checkin, st = { step: L.CHECKIN.length + 1, answers: c.answers.slice(), tags: (c.tags || []).slice(), note: c.note || "" };
        if (top() && top().type === "plus") swap("ck", st); else push("ck", st);
      },
      "ck-day"() { if (S.checkin) push("ckday", Object.assign({}, S.M.ckDay)); },
      "ckd-dow"(b) { top().st.dow = +b.dataset.v; rerender(); },
      "ckd-when"(b) { top().st.when = b.dataset.v; rerender(); },
      "ckd-save"() {
        const st = top().st, was = S.M.ckDay;
        S.M.ckDay = { dow: st.dow, when: st.when };
        pop({ instant: true });
        renderTab(true);
        toast(was.dow === st.dow && was.when === st.when ? `No change. It's due ${AD.util.DOWL[st.dow]} ${st.when}s.` : `Saved. From next week it's due ${AD.util.DOWL[st.dow]} ${st.when}s.`);
      },
      edit(b) { if (b.closest(".ap-tst")) { tst.classList.remove("is-on"); S.undo = null; } openEntry(b.dataset.id, { details: !!b.dataset.details }); },
      toast(b) { if (b.dataset.close) closeAll(); toast(b.dataset.msg); },
      /* Make a report on the flag note: Ask Florin's module asks its clinician question (data-q); without it, a toast */
      "flag-report"(b) { closeAll(); toast(b.dataset.msg); },
      hfilter(b) { S.hist.filter = b.dataset.v; renderTab(true); },
      hmore() { S.hist.n = (S.hist.n || 14) + 14; renderTab(true); },
      undo() { const u = S.undo; S.undo = null; tst.classList.remove("is-on"); if (u) u(); refocus(null); },
      /* the avatar on Today. The profile module registers its own "profile" act, which wins over this one */
      profile() { toast("Profile isn't in this version of the demo."); }
    };
    /* a module's act wins over a core act of the same name; looked up on every tap, so an act registered late works */
    const actOf = (name) => (EXT.acts[name] ? (b, e) => safe(EXT.acts[name], b, api, e) : ACT[name]);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b || !root.contains(b)) return;
      const f = actOf(b.dataset.act);
      if (!f) return;
      if (b.getAttribute("aria-disabled") === "true" && !/^save-/.test(b.dataset.act)) return;
      /* a second tap that lands on a sheet in its first 400ms is the same tap repeated, not a choice */
      if (top() && top().el.contains(b) && performance.now() - top().t0 < 400 && e.detail > 0) return;
      if (b.dataset.close && b.dataset.act === "tab") closeAll();
      f(b, e);
    });
    /* typing never re-renders: it updates the draft and the Save button's state in place */
    root.addEventListener("input", (e) => {
      const el = e.target.closest("[data-in]"), ov = top();
      if (!el || !ov) return;
      const st = ov.st, k = el.dataset.in;
      if (k === "note") st.note = el.value;
      else if (k === "text") {
        st.text = el.value;
        const btn = ov.el.querySelector('[data-act="save-meal"]'), hint = ov.el.querySelector(".ap-fsh-hint");
        const ok = el.value.trim().length > 0;
        if (btn) { if (ok) btn.removeAttribute("aria-disabled"); else btn.setAttribute("aria-disabled", "true"); }
        if (hint) hint.hidden = ok;
        /* the counted line follows the typing, without touching the field */
        clearTimeout(S.mT);
        S.mT = setTimeout(() => {
          if (top() !== ov) return;
          const c = ov.el.querySelector(".ap-ml-count");
          if (c) c.innerHTML = RU.mealCount(S.M, st);
          const fs = L.matchFoods(st.text);
          ov.el.querySelectorAll('[data-act="meal-food"]').forEach((b) => { const on = fs.includes(b.dataset.v); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
        }, 250);
      } else if (k === "newsym") {
        st.newName = el.value;
        const btn = ov.el.querySelector('[data-act="save-sym"]'), hint = ov.el.querySelector(".ap-fsh-hint");
        const ok = st.items.length > 0 || el.value.trim().length > 0;
        if (btn) { if (ok) btn.removeAttribute("aria-disabled"); else btn.setAttribute("aria-disabled", "true"); }
        if (hint) hint.hidden = ok;
      }
      else if (k === "cknote") st.note = el.value;
      else if (k === "time") { const h = RU.fromInput(el.value); if (h != null) { st.t = h; st.tTouched = true; } }
      else if (k === "day") st.d = +el.value;
    });
    root.addEventListener("change", (e) => {
      const el = e.target.closest("[data-in]"), ov = top();
      if (!el || !ov) return;
      if (el.dataset.in === "day") ov.st.d = +el.value;
      if (el.dataset.in === "time") {
        const h = RU.fromInput(el.value);
        if (h != null) { ov.st.t = h; ov.st.tTouched = true; }
        /* on a meal, a new time picks the meal that fits it, until the person picks one */
        if (ov.type === "meal" && h != null && (ov.st.autoT || !ov.st.mealTouched)) { if (!ov.st.mealTouched) ov.st.meal = L.mealFor(h); ov.st.autoT = ""; rerender(ov); }
      }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && top()) { e.preventDefault(); pop(); }
      /* arrows move between the options of a one-choice group; Space or Enter picks */
      const r = e.target.closest && e.target.closest('[role="radio"]');
      if (r && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
        const all = [...r.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]')];
        const i = all.indexOf(r) + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault();
        all[(i + all.length) % all.length].focus();
      }
      if (e.key === "Enter" && e.target.matches && e.target.matches('[data-in="newsym"]')) { e.preventDefault(); ACT["sym-add"](); }
    });
    /* a sheet closes with a drag down on its handle or header, as its handle promises */
    let drag = null;
    root.addEventListener("pointerdown", (e) => {
      const ov = top();
      const h = e.target.closest(".ap-sheet-grab, .ap-psh-h");
      if (!ov || kindOf(ov.type) !== "sheet" || !h || !ov.el.contains(h) || e.target.closest("button")) return;
      const p = ov.el.querySelector(".ap-o-p");
      drag = { ov, p, id: e.pointerId, y0: e.clientY, dy: 0, k: root.getBoundingClientRect().height / root.offsetHeight || 1 };
      try { h.setPointerCapture(e.pointerId); } catch (err) { /* fine without capture */ }
      p.style.transition = "none";
    });
    root.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dy = Math.max(0, (e.clientY - drag.y0) / drag.k);
      drag.p.style.transform = `translateY(${drag.dy}px)`;
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const g = drag;
      drag = null;
      if (g.dy > 96 && top() === g.ov) { g.p.style.transition = ""; pop(); return; }
      g.p.style.transition = "transform .25s var(--ap-ease)";
      g.p.style.transform = "";
    };
    /* Escape still closes the top sheet when focus has fallen out to the page */
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && top() && document.activeElement === document.body) { e.preventDefault(); pop(); } });
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);

    /* ---------- what the page needs to know ---------- */
    /* the screen the phone shows, as an id the page's notes and Screens list know. A module names its own overlay's
       screen (EXT.keys, or the overlay's key), and can name a tab's state through EXT.keys["tab:<tab>"] */
    function key() {
      const t = top();
      if (t) {
        if (EXT.keys[t.type]) { const k = safe(EXT.keys[t.type], t); if (k) return k; }
        const ov = EXT.overlays[t.type];
        if (ov) return (ov.key && safe(ov.key, t.st)) || t.type;
        if (t.type === "ck") return t.st.step > L.CHECKIN.length ? "ckdone" : "ck";
        return t.type;
      }
      const tk = EXT.keys["tab:" + S.tab];
      if (tk) { const k = safe(tk, { type: "tab:" + S.tab, st: S }); if (k) return k; }
      if (S.tab === "insights" && S.ins.k) return S.ins.k.indexOf("pattern:") === 0 ? "i-pattern" : `i-${S.ins.k}`;
      if (S.tab === "ask" && S.askCtx) return "ask-about";
      return S.tab;
    }
    function nav() {
      /* under an overlay, nothing behind it can take focus: the screen, the tab bar, a lower sheet */
      const any = S.ovl.length > 0;
      root.querySelector(".ap-stack").inert = any;
      tb.inert = any;
      S.ovl.forEach((o, i) => { o.el.inert = i < S.ovl.length - 1; });
      root.classList.toggle("has-full", S.ovl.some((o) => kindOf(o.type) !== "sheet"));
      root.classList.toggle("has-ovl", S.ovl.length > 0);
      if (cfg.onNav) cfg.onNav(key(), api);
    }

    /* jump straight to a screen in a known state (the list beside the phone uses this) */
    function open(id) {
      closeAll();
      clearTimeout(S.ckT);
      const go = (tab) => { S.tab = tab; renderTab(true); layer.scrollTop = 0; };
      /* with the check-in off, its screens don't exist: Today (or Insights) instead */
      if (!S.checkin && CK_SCREENS.includes(id)) id = id === "i-ck" ? "insights" : "today";
      const ins = (k) => { if (S.plan === "free" && k) { S.ins.k = null; go("insights"); push("pay", { from: k.indexOf("pattern:") === 0 ? "pat" : k }, now); return; } S.ins.k = k; go("insights"); };
      const now = { instant: true };
      switch (id) {
        case "plus": go("today"); push("plus", {}, now); break;
        case "earlier": go("today"); push("plus", {}, now); push("earlier", {}, now); break;
        case "bm": go("today"); push("bm", newBm(null), now); break;
        case "bm-details": go("today"); push("bm", Object.assign(newBm(6), { how: { rush: true }, dur: 1 }), now); break;
        case "guide": go("today"); push("bm", newBm(null), now); push("guide", {}, now); break;
        case "flag": go("today"); push("flag", { flags: { blood: true } }, now); break;
        case "sym": go("today"); push("sym", Object.assign(newSym(), { items: [{ name: "Bloating", s: 0 }], s: 2, last: 1 }), now); break;
        case "meal": go("today"); push("meal", S.mealUI === "detailed" ? newMeal() : newMealQuick(), now); break;
        case "meal-voice": go("today"); { const st = newMealQuick(); st.text = L.mealSay(S.M, L.TODAY); st.voice = "done"; push("meal", st, now); } break;
        case "ck": go("today"); push("ck", newCk(), now); break;
        case "ck-last": go("today"); push("ck", { step: 4, answers: [1, 0, 1, 1], tags: [], note: "", preview: true }, now); break;
        case "ckdone": go("today"); push("ck", { step: L.CHECKIN.length + 1, answers: [1, 0, 1, 1], tags: ["Eating out"], note: "", preview: true }, now); break;
        case "ckday": go("today"); push("ckday", Object.assign({}, S.M.ckDay), now); break;
        /* History: List sets the History decision, as History: Calendar does (the demo opens on Calendar, Will's pick) */
        case "history": if (S.history !== "list") set("history", "list"); go("history"); break;
        case "insights": ins(null); break;
        case "pay": go("insights"); push("pay", { from: "" }, now); break;
        case "free-insights": if (cfg.onPlan && S.plan !== "free") { cfg.onPlan("free", "free-insights"); return; } S.ins.k = null; go("insights"); break;
        case "free-ask": if (cfg.onPlan && S.plan !== "free") { cfg.onPlan("free", "free-ask"); return; } S.askCtx = null; go("ask"); break;
        case "i-score": ins("score"); break;
        case "i-timing": ins("timing"); break;
        case "i-often": ins("often"); break;
        case "i-form": ins("form"); break;
        case "i-sym": ins("sym"); break;
        case "i-ck": ins("ck"); break;
        case "i-pat": ins("pat"); break;
        case "i-pattern": { const f = L.patterns(S.M, S.form).found; ins(f.length ? `pattern:${(f.find((p) => p.kind !== "late") || f[0]).id}` : "pat"); break; }
        /* a module that keeps a chat says how a fresh one opens (the Ask module: no chat left over from a seeded screen) */
        case "ask": S.askCtx = null; go("ask"); if (EXT.opens.ask) safe(EXT.opens.ask, api); break;
        case "ask-about": S.askCtx = { k: "timing", range: S.ins.range }; go("ask"); break;
        case "ck-card": go("today"); { const c = layer.querySelector(".ap-ckc"); if (c) layer.scrollTop = Math.max(0, c.offsetTop - 64); } break;
        case "today": go("today"); break;
        /* a screen a module added: it says how to get there */
        default: if (EXT.opens[id]) { go("today"); safe(EXT.opens[id], api); } else go("today");
      }
      nav();
    }
    /* a fresh model for the person and logs, every draft and overlay gone. It doesn't draw: follow it with open(id), or
       call reset(), which rebuilds and opens Today */
    function rebuild() { clearTimeout(S.ckT); S.ovl.forEach((o) => o.el.remove()); S.ovl = []; S.M = L.build(S.persona, S.data, { meals: S.meals }); S.ckDraft = null; S.drafts = {}; S.hist = { filter: "all", n: 14 }; S.ins = { range: 30, k: null, y: 0 }; S.askCtx = null; tst.classList.remove("is-on"); S.undo = null; }
    /* redraw everything in place: the tab under the overlays, then each overlay */
    const refresh = () => { renderTab(true); S.ovl.forEach((o) => rerender(o)); nav(); };
    /* the one way to change the phone: a decision, a demo control, the theme or full screen. The page hears every
       change first (its toggles, the stored decisions, the notes and the Screens list follow, whoever made it), then the
       modules, through EXT.onSet, after the phone has redrawn */
    function set(k, v) {
      switch (k) {
        case "theme": root.dataset.theme = v; break;
        case "full": root.classList.toggle("is-full", !!v); break;
        case "persona": case "data": case "meals": S[k] = v; rebuild(); open("today"); break;
        case "mealUI": {
          S.mealUI = v;
          /* an open meal sheet becomes the other sheet in place, with what's typed carried over (an edit keeps its own) */
          const t = top();
          if (t && t.type === "meal" && !t.st.edit && !!t.st.quick !== (v !== "detailed")) {
            clearInterval(S.vT); clearTimeout(S.mT);
            t.st = reshape(t.st, v !== "detailed");
            renderTab(true); rerender(t); nav();
          } else refresh();
          break;
        }
        case "checkin":
          S.checkin = v !== false;
          if (!S.checkin) {
            /* off takes the check-in out of the whole app: close it if it's open, and leave its detail */
            clearTimeout(S.ckT);
            if (S.ovl.some((o) => o.type === "ck" || o.type === "ckday")) closeAll();
            if (S.ins.k === "ck") S.ins.k = null;
            if (S.askCtx && S.askCtx.k === "ck") S.askCtx = null;
          }
          refresh();
          break;
        default: S[k] = v; refresh();
      }
      if (STAMP.includes(k)) root.setAttribute(attrOf(k), String(S[k]));
      if (cfg.onSet) safe(cfg.onSet, k, S[k] === undefined ? v : S[k]);
      EXT.onSet.forEach((f) => safe(f, k, v, api));
    }
    /* go to a tab's top, closing whatever is open */
    const go = (tab) => { closeAll(); S.tab = tab; if (tab === "insights") S.ins.k = null; if (tab === "ask") S.askCtx = null; renderTab(); nav(); focusSel(); };
    /* everything a module needs to drive the phone (CLAUDE.md, Extension hooks) */
    const api = {
      S, V, M: () => S.M,
      push, pop, swap, rerender, top, closeAll, toast, say, renderTab, go, nav, focusSel, open, rebuild, set, countUp, layer, root,
      snapshot, commit, key,
      /* an act by name: a module's if it has one, else the core's. core() always runs the core's, for a module that
         wraps one */
      act: (name, b, e) => { const f = actOf(name); return f ? f(b || root, e) : undefined; },
      core: (name, b, e) => (ACT[name] ? ACT[name](b || root, e) : undefined),
      /* the page uses these */
      el: root,
      model: () => S.M,
      form: () => S.form,
      reset() { rebuild(); open("today"); }
    };
    /* a module can reach the phone from the first draw on (a wrapped RU.today, say) */
    EXT.api = api;
    renderTab();
    nav();
    return api;
  }

  /* ====================================================================== */
  /* NOTES FOR EACH SCREEN                                                   */
  /* ====================================================================== */
  /* Will, Oct 28: "Make it simple." A screen's note says what the screen does and why, in about 80 words or fewer,
     with at most one open question: { t, lede, open? }. No was and now, no research list, no build status, no persona
     names or scores as evidence. Every figure is read from the model. ba and res still draw if a note gives them */
  const NUMW = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"];
  const num = (n) => (n >= 0 && n < NUMW.length ? NUMW[n] : String(n));
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  const listOf = (xs, w = "and") => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${w} ${xs[xs.length - 1]}`);
  /* a stretch of days, said as weeks when it's whole weeks: the learning days, the food check */
  const daysSpan = (n) => (n % 7 === 0 ? `${num(n / 7)} weeks` : `${n} days`);
  const learnSpan = () => daysSpan(L.LEARN_DAYS), foodSpan = () => daysSpan(L.FOOD_CHECK_DAYS);
  /* the share of logged days that need a meal before food patterns are read, said as "6 in 10" */
  const coverText = () => `${Math.round(L.MEAL_COVER * 10)} in 10`;
  /* what the Meals demo control is called, here and on the page */
  const MEALS_LABEL = "Demo person's meals";
  const ckOn = () => P.checkin !== false;

  const MEAL_QUICK = () => ({
    t: "What you ate, said or typed",
    lede: "One big microphone button and one box for the whole day: say or type what you ate, and Florin picks out the foods. It has to be quick enough for ordinary days too, since meals written down only on days with symptoms make everyday foods look linked to them. The demo plays a sample for the microphone."
  });
  const BM_OPEN = "Which details stay under the tiles: a sudden urge, straining, not feeling finished, burning, how long? The flag for blood, mucus or a black stool stays.";
  const NOTES = {
    today: (M) => ({
      t: "Today",
      lede: M.usual
        ? `Today opens on FloraScore, read against the person's own usual range, with one sentence on what stood out today. Then ${ckOn() ? "the weekly check-in when it's due, " : ""}today's logs, the last 7 days with a line for each day that wasn't within the usual, and one next step.`
        : `Florin is still learning this person's usual, so FloraScore shows the day it's on, Day ${L.learnDay(M)} of ${L.LEARN_DAYS}, instead of a number until day ${L.LEARN_DAYS}. Then ${ckOn() ? "the weekly check-in when it's due, " : ""}today's logs, the last 7 days as they're logged, and one next step.`
    }),
    plus: () => P.bmUI === "full" ? ({
      t: "The plus menu, full form only",
      lede: `One place to log anything. Log a BM opens the form every time: when, consistency, details and a note. Then symptoms, a meal${ckOn() ? ", the weekly check-in" : ""}, No BM today (from ${T(L.LATE, { short: true })}) and an earlier day.`
    }) : ({
      t: "The plus menu",
      lede: `One place to log anything. A BM comes first, with its tiles right on the menu: after the first ${RU.QUICK_AFTER} BMs, one tap on a tile saves it, with Add details and Undo. Then symptoms, a meal${ckOn() ? ", the weekly check-in" : ""}, No BM today (from ${T(L.LATE, { short: true })}) and an earlier day.`
    }),
    earlier: () => ({
      t: "Log for an earlier day",
      lede: "Pick a day from the past week, then log as usual. Days with nothing logged are marked, so the gaps are easy to find. History offers the same on any gap."
    }),
    bm: (M, f) => {
      const n = L.TYPES.length - 1, w = L.WORDS.map((x) => x.word), two = L.WORDS.filter((x) => x.types.length > 1).map((x) => x.word);
      return f === "B" ? ({
        t: `Log a BM, B: ${num(w.length)} words`,
        lede: `${cap(num(w.length))} tiles in the current app's words. ${listOf(two)} each cover two kinds of stool, so a log in B keeps its word and Florin can't say which kind it was. When it was, the details and a note sit under the tiles, all optional.`,
        open: [BM_OPEN]
      }) : f === "A" ? ({
        t: `Log a BM, A: numbers 1 to ${n}`,
        lede: `${cap(num(n))} tiles, each a number with a short word. When it was, the details and a note sit under the tiles, all optional. The words are stand-ins until we have the licensed wording.`,
        open: [BM_OPEN]
      }) : ({
        t: `Log a BM, C: ${num(n)} words`,
        lede: `${cap(num(n))} tiles in our own words, with no numbers. Each word has a number from 1 to ${n} behind it, so a clinician report can show it once we have a licence. When it was, the details and a note sit under the tiles, all optional.`,
        open: [BM_OPEN]
      });
    },
    guide: (M, f) => ({
      t: "How to pick",
      lede: `Every option with one plain line, one tap from the form, so the tiles can stay small.${f === "A" ? " In A, these lines are stand-ins until we have the licensed wording." : ""}`
    }),
    flag: () => ({
      t: "After a flagged log",
      lede: "A BM saved with blood, mucus or a black stool, or a note that names a warning sign, gets this note: see primary care first, with a report to bring. Florin names the sign and never reads anything into it.",
      open: ["What should the report hold for a first visit?"]
    }),
    nobm: () => ({
      t: "No BM today",
      lede: `A person can log that no BM came, so an empty day isn't read as a day with nothing logged. A BM logged later replaces it. It shows from ${T(L.LATE, { short: true })}, or any time for an earlier day.`
    }),
    sym: () => ({
      t: "Log symptoms",
      lede: `Pick any of the ${num(L.SYMPTOMS.length)} symptoms or add your own, then how strong it was at its worst and how long it lasted. Both are optional. A warning sign typed into the note opens the primary care note.`,
      open: [`Are these the right ${num(L.SYMPTOMS.length)}: ${listOf(L.SYMPTOMS.map((s, i) => (i ? s.toLowerCase() : s)))}?`]
    }),
    meal: () => P.mealUI !== "detailed" ? MEAL_QUICK() : ({
      t: "Log a meal",
      lede: "Pick Breakfast, Lunch, Dinner or Other, type what you had, and set the time. Florin shows the foods it counted as you type, so a missed word is easy to see. Same as yesterday and recent foods are one tap each."
    }),
    ck: () => ({
      t: "Weekly check-in",
      lede: `${cap(num(L.CHECKIN.length))} questions about the past 7 days, each one tap: ${listOf(L.CHECKIN.map((c) => c.label.toLowerCase()))}. Then optional tags and a note. About a minute, and it never blocks logging or Insights.`
    }),
    ckdone: () => ({
      t: "Check-in saved",
      lede: `Each answer sits next to the person's first ${num(L.BASE_WEEKS)} weeks and reads as about the same, more, or less than at first. No score, and the answers are never added up into one. Your logs this week counts the days within the usual, with the symptom sentence.`
    }),
    ckday: (M) => ({
      t: "When it's due",
      lede: `${AD.util.DOWL[M.ckDay.dow]} ${M.ckDay.when} to start. The person picks the day and morning or evening, and gets one reminder. The questions cover the 7 days up to that day.`
    }),
    history: (M) => ({
      t: "History",
      lede: `Every log, newest day first, each day opening with its mark and one line on how it sat against the usual. A day with nothing logged stays a gap, with Add to this day for catching up. Filters show BMs, symptoms, meals or notes, and the report for a clinician sits at the top.${P.plan === "free" && M.usual ? ` On Free, days before the last ${RU.FREE_DAYS} show as logged, not read against the usual.` : ""}`
    }),
    insights: (M, f) => {
      const PR = L.patterns(M, f);
      return {
        t: "Insights",
        lede: !M.usual
          ? `Florin is still learning this person's usual, so the cards show counts only until day ${L.LEARN_DAYS}. A food is checked once it's logged ${L.PATTERN_BAR.n} times.`
          : P.plan === "free"
            ? `On Free, Insights covers the last ${L.RANGES[0]} days. Longer ranges, the details and possible patterns come with membership, shown as the person's own counts, blurred.`
            : `One card per question: FloraScore, timing, how often, form, symptoms${ckOn() ? ", the weekly check-in" : ""} and possible patterns. Each says the person's usual in words, gives a count, then the chart. A card opens its detail, and Ask about this opens Ask Florin with that card's numbers.${PR.sparse ? ` Meals are logged on too few days here, so food patterns are held back and a ${L.FOOD_CHECK_DAYS}-day food check is offered.` : ""}`
      };
    },
    pay: () => ({
      t: "Florin membership",
      lede: `Opens from any member feature, titled for it, with what membership adds. Logging, Today, FloraScore${ckOn() ? ", the weekly check-in" : ""}, History and ${L.RANGES[0]} days of Insights stay free. A teaser shows the person's own counts, blurred, never made-up content.`,
      open: ["Should a basic report for a clinician be free?"]
    }),
    "i-score": () => ({
      t: "FloraScore, the detail",
      lede: "Today's score on a bar with the person's usual range, then each day's score against that range, what moved it this week in whole points, and its four parts: when the first BM came, how often, form and comfort. A day with no BM logged is left out, never scored as zero. It never uses meals."
    }),
    "i-timing": () => ({
      t: "Timing, the detail",
      lede: `When the first BM came each day, on a straight time axis, with the person's usual window marked, then every BM day by day, the last 14 days at most; over 90 days, a bar a week for the mornings in the window and outside it. Tabs switch between ${listOf(L.RANGES.map(String))} days. What shaped this is folded away, and Next moves to the next card.`
    }),
    "i-often": () => ({
      t: "How often, the detail",
      lede: "BMs a day, one dot a day on a count line from zero, with the person's usual count as a band. A day logged as No BM is a dot on zero; a day with nothing logged stays a gap, never a zero. Over 90 days, a bar a week for the days with a usual count."
    }),
    "i-form": () => ({
      t: "Form, the detail",
      lede: "How many BMs came in each form, counts on the bars, with the person's usual forms marked, then each BM by day; over 90 days, a bar a week for the days in the usual forms. A word from B that covers two kinds of stool sits between them by day, spans both on today's bar, and stays out of the bars, with a line that says so."
    }),
    "i-sym": () => ({
      t: "Symptoms, the detail",
      lede: "A row per symptom, with a Teal square on each day it came up, and an Any symptom row with the usual written at its end; how strong is said in words, and one logged without a strength reads as strength not said. Over 90 days, Teal bars of the days a week with any symptom. Then each symptom against the weeks before, and when to see a clinician."
    }),
    "i-ck": (M) => ({
      t: "Weekly check-in, the detail",
      lede: `The latest week next to the person's first ${num(L.BASE_WEEKS)} check-ins, each question with its trend over the weeks.${M.checkin.status === "due" ? " This week's is due tonight, so the button starts it." : ""}`
    }),
    "i-pat": (M, f) => ({
      t: "Possible patterns",
      lede: L.patterns(M, f).sparse
        ? `Meals are logged on too few days here, so food patterns are held back: with meals written down mostly on days with symptoms, everyday foods would look linked to them. A ${L.FOOD_CHECK_DAYS}-day food check is offered instead.`
        : `Foods and late dinners that tend to come before a symptom or a looser BM. A food is checked once it's logged ${L.PATTERN_BAR.n} times, and a pattern has to stand out against other days. Each is said as seen together, not proof.`
    }),
    "i-pattern": () => ({
      t: "One possible pattern",
      lede: "Two bars: how often the change followed the food, and how often it came on other days, with the counts written on. Late dinners add the first BM times after each kind of dinner. Then a way to test it. What you could try never says avoid."
    }),
    ask: () => P.plan === "free" ? ({
      t: "Ask Florin, free plan",
      lede: "On Free, the Ask tab says what Ask Florin does and the questions people ask, and offers membership. There's no sample answer, since it would have to be made up.",
      open: ["Give Free one answer a week, with questions about seeing a doctor always answered?"]
    }) : ({
      t: "Ask Florin",
      lede: "A chat on the person's own logs. Questions to start come from the logs, and every answer is read against the person's own usual."
    }),
    "ask-about": () => ({
      t: "Ask about this",
      lede: "Every Insights card and detail has Ask about this. It opens Ask Florin with that card's numbers loaded, so the chat starts from the same figures as the chart."
    })
  };

  /* the list of screens beside the phone. A module adds its own through EXT.screens */
  const SCREENS = [
    ["Logging", [["plus", "Plus menu"], ["earlier", "Log for an earlier day"], ["bm", "Log a BM"], ["bm-details", "Log a BM, details filled in"], ["guide", "How to pick (i)"], ["flag", "After a flagged BM"], ["sym", "Log symptoms"], ["meal", "Log what you ate"], ["meal-voice", "What you ate, said"]]],
    ["Weekly check-in", [["ck-card", "The card on Today"], ["ck", "First question"], ["ck-last", "Last question"], ["ckdone", "Saved"], ["ckday", "When it's due"]]],
    ["Insights", [["insights", "Insights"], ["i-score", "FloraScore"], ["i-timing", "Timing"], ["i-often", "How often"], ["i-form", "Form"], ["i-sym", "Symptoms"], ["i-ck", "Check-in trend"], ["i-pat", "Possible patterns"], ["i-pattern", "One pattern"], ["ask-about", "Ask about this"]]],
    ["Membership", [["pay", "The paywall"], ["free-insights", "Insights, free"], ["free-ask", "Ask Florin, free"]]],
    ["Tabs", [["today", "Today"], ["history", "History: List"], ["ask", "Ask Florin"]]]
  ];
  /* the core list with every module's groups merged in: items join a group of the same name, or a new group goes
     before the one it names (or last) */
  const screenGroups = () => {
    const G = SCREENS.map(([g, items]) => [g, items.slice()]);
    (EXT.screens || []).forEach((row) => {
      const [g, items, o] = row || [];
      if (!g || !Array.isArray(items)) return;
      const have = G.find((x) => x[0] === g);
      if (have) { items.forEach((it) => { if (!have[1].some((x) => x[0] === it[0])) have[1].push(it); }); return; }
      const at = o && o.before ? G.findIndex((x) => x[0] === o.before) : -1;
      if (at >= 0) G.splice(at, 0, [g, items.slice()]); else G.push([g, items.slice()]);
    });
    return G;
  };
  /* a phone screen id (key()) to the row that lights up in the list, or null for a screen the list doesn't have (a
     module's overlay with no row of its own): then no row lights up */
  /* Easy's Your weeks stands in for Insights, so it lights the Insights row */
  const KEY_SCREEN = { "meal-voice": "meal", nobm: "today", "ez-weeks": "insights" };
  const keyToScreen = (k) => {
    const ids = screenGroups().flatMap(([, items]) => items.map(([id]) => id));
    if (ids.includes(k)) return k;
    return KEY_SCREEN[k] && ids.includes(KEY_SCREEN[k]) ? KEY_SCREEN[k] : null;
  };
  const screenLabel = (id) => { for (const [, items] of screenGroups()) { const it = items.find(([x]) => x === id); if (it) return it[1]; } return ""; };

  /* ====================================================================== */
  /* THE DECISIONS                                                           */
  /* ====================================================================== */
  /* Will, Oct 27: the open decisions are toggles in the one demo. Each one is stored and goes to the phone through
     phone.set(key, value). Will, Oct 28: every decision's note takes the decision sheet's shape (claude/Florin
     decisions.md), in its words:
       q      the question, plainly, in ten words or fewer
       what   one sentence on what part of the app it decides
       opts   each option as a block: { v, name, is, why, not } (what it is, why do it, why not)
       rec    { v, text, why }: "We recommend <option>", then one sentence of why. v may list two options
       open   at most one open question
       try    where to try it in the demo
     plus, rarely, aside (a line under the lede) and about ({ h, items, foot }: what the thing itself is).
     q and what live here for all nine; the note gives the rest. The core writes the notes for the options it draws
     (Consistency, BM logging, Weekly check-in, Meal sheet); a module that draws a decision's options writes its note
     through EXT.decisions[key] (variants: home and history; looks: look; easy: easy; profile: onboard). If one throws,
     the note falls back to the question, the sentence and the options' names.
     opts are [value, label, short]: the label is the option's name, the short one (when there is one) is on the toggle. */
  const DECISIONS = [
    {
      k: "form", label: "Consistency", def: "C", wide: true, opts: [["A", L.MODES_SHORT.A], ["B", L.MODES_SHORT.B], ["C", L.MODES_SHORT.C]],
      q: "How does a person describe a BM's consistency?",
      what: "The words on the BM tiles, and how Today, History and Insights name each BM.",
      note: () => {
        const n = L.TYPES.length - 1, words = L.WORDS.map((w) => w.word), two = L.WORDS.filter((w) => w.types.length > 1).map((w) => w.word);
        const cw = L.TYPES.slice(1).map((x) => x.short), fresh = cw.filter((w) => !words.includes(w)).length;
        return {
          opts: [
            { v: "A", name: `A: numbers 1 to ${n}`, is: `${cap(num(n))} tiles, each a number from 1 to ${n} with a short word, from the scale clinicians use.`, why: "Clinicians and other gut apps use these numbers, so a log reads straight across at a visit.", not: "The Rome Foundation licenses the scale, so we need a licence and must use its exact wording." },
            { v: "B", name: `B: ${num(words.length)} words`, is: `The ${num(words.length)} words the current app uses, as tiles: ${listOf(words)}.`, why: "People who use the current app already know them, and they need no licence.", not: `${listOf(two)} each cover two kinds of stool, so Florin can't always tell when a BM has shifted from the person's usual.` },
            { v: "C", name: `C: ${num(n)} words`, is: `${cap(num(n))} tiles in our own words, with no numbers: ${listOf(cw)}.`, why: `All ${num(n)} kinds in plain words, each with a number from 1 to ${n} behind it that a clinician report can show once we have a licence.`, not: `Counsel must clear the words first, since they follow the licensed scale's ${num(n)} kinds, and people who use the current app learn ${num(fresh)} new words.` }
          ],
          rec: { v: "C", text: "We recommend C, once counsel has read its words, and dropping B.", why: "It keeps the detail a clinician needs and the plain words a first-timer can pick, without waiting for a licence." },
          open: `Do we ask the Rome Foundation now for one licence covering the 1 to ${n} numbers in clinician reports and a questionnaire for the pilot study?`,
          try: "Switch between A, B and C, then tap plus to see the tiles. Today, History and Insights change with it. In A, the words under the numbers are stand-ins until we have the licensed wording."
        };
      }
    },
    {
      k: "bmUI", label: "BM logging", def: "quick", opts: [["quick", "Quick tiles and form", "Quick tiles"], ["full", "Full form only", "Full form"]],
      q: "Should one tap on a tile save a BM?",
      what: "What happens when a person taps plus to log a BM.",
      note: () => ({
        opts: [
          { v: "quick", is: "Tap plus, then a tile, and the BM is saved, with a message that offers Add details and Undo.", why: "A usual BM takes two taps, so logging every day stays easy.", not: "A BM logged an hour late gets the wrong time, and details like urgency get skipped." },
          { v: "full", is: "The plus menu has one Log a BM row, and every BM goes through the form: when, consistency, details and a note.", why: "Every BM shows its time before saving, with room for details.", not: "It takes more taps every time, and people who find logging slow log less." }
        ],
        rec: { v: "quick", text: "We recommend Quick tiles and form, and adding time buttons to the \"BM saved\" message: Just now, 30 min ago, 1 hr ago, Earlier.", why: "It keeps the two-tap log and fixes the wrong time without opening the form." },
        open: `Should every BM open the form for the first ${learnSpan()}, while Florin learns the person's usual? In the demo, only the first ${RU.QUICK_AFTER} do.`,
        try: "Switch it, then tap plus. The time buttons aren't in the demo yet."
      })
    },
    {
      k: "home", label: "Home", def: "score", opts: [["score", "Score first"], ["day", "Day first"]],
      q: "What does Today show first?",
      what: "The top of the Today tab, the screen the app opens on."
    },
    {
      k: "history", label: "History", def: "calendar", opts: [["list", "List"], ["calendar", "Calendar"]],
      q: "How should History show past days?",
      what: "The History tab, where people look back and fill in a day they missed."
    },
    {
      k: "checkin", label: "Weekly check-in", def: true, opts: [[true, "On"], [false, "Off"]],
      q: "Should the app ask how the week felt?",
      what: "Whether the app has a weekly check-in: a few questions about the past week.",
      note: (M) => ({
        answer: ["Our answer: keep it.", `${cap(num(L.CHECKIN.length))} one-tap questions a week, in our own words, not a licensed questionnaire. Free for everyone.`],
        about: {
          h: "What the check-in is",
          lede: `${cap(num(L.CHECKIN.length))} questions about the last 7 days, each answered with one tap, in about a minute:`,
          items: L.CHECKIN.map((c) => [c.q, c.opts.join(", ")]),
          more: [
            `Then an optional line: tags such as ${listOf(L.CHECKIN_TAGS.slice(0, 3), "or")}, and a note.`,
            `Florin compares each answer with the person's first ${num(L.BASE_WEEKS)} weeks and says About the same, More than at first, or Less than at first. No score.`,
            `It's due once a week, on a day the person picks (${AD.util.DOWL[M.ckDay.dow]} ${M.ckDay.when} to start). It shows as a card on Today and an item in the plus menu, with one reminder. A person can skip a week, and it never blocks logging or Insights.`
          ]
        },
        opts: [
          { v: true, is: "The check-in card on Today when it's due, an item in the plus menu every week, and its trend on Insights.", why: "It's the one place Florin asks how the week felt, not just what happened, and it gives people a reason to come back each week.", not: "It's one more task a week, and in a steady week the answers add little that the logs didn't show." },
          { v: false, is: "No check-in anywhere: no Today card, no plus item, no Insights card and no reminder.", why: "The app asks less of people, and the week's logs already show what happened.", not: "Nothing asks how the week felt, so a hard week shows only as logs." }
        ],
        rec: { v: true, text: "We recommend On, free on both plans.", why: "It takes a minute and is the app's one weekly reason to come back." },
        open: "Should a person be able to turn it off themselves, in Profile?",
        try: "With it on, tap Start on the Today card. With it off, it leaves every screen."
      })
    },
    {
      k: "mealUI", label: "Meal sheet", def: "quick", opts: [["quick", "Quick, voice or text", "Quick"], ["detailed", "One meal at a time", "One meal"]],
      q: "How does a person log what they ate?",
      what: "The meal row in the plus menu and the sheet it opens.",
      note: () => ({
        aside: `Not the same as “${MEALS_LABEL}” under Demo, which only changes how often the demo person wrote meals down. Its note explains the trap.`,
        opts: [
          { v: "quick", is: "One big microphone button and one box for the whole day: say or type what you ate, and Florin picks out the foods.", why: "It's the least effort, so logging meals on ordinary days, not only on days with symptoms, stays easy.", not: "The day has no meal times, so Florin can't look at what tends to follow a late dinner." },
          { v: "detailed", is: "Pick Breakfast, Lunch, Dinner or Other, type what you had, and set the time.", why: "Each meal keeps its time, so Florin can look at what tends to follow a late dinner.", not: "It's more steps for every meal, so people log fewer of them." }
        ],
        rec: { v: "quick", text: `We recommend Quick, with a one-tap "Dinner after 8 PM?" button when the person mentions dinner, and a free ${L.FOOD_CHECK_DAYS}-day food check: log every meal for ${foodSpan()}, ordinary days included.`, why: "People tend to write meals down only on days with symptoms, which can make everyday foods look linked to them, so logging has to be easy enough for every day." },
        try: "Switch it, then tap plus and the meal row. The microphone plays a sample, since the demo can't use one. The dinner button isn't in the demo yet."
      })
    },
    {
      k: "look", label: "Data style", def: "built", chips: true,
      opts: [["built", "Florin charts"], ["rings", "Rings"], ["journal", "Field journal"], ["bento", "Bento"], ["oura", "Oura"], ["easy", "Easy read"]],
      q: "How should Florin draw the numbers?",
      what: "How FloraScore, the week and the Insights cards look, with the same numbers from the same logs in every style."
    },
    {
      k: "easy", label: "Version", def: false, opts: [[false, "Standard"], [true, "Easy"]],
      q: "Should the app offer larger text and simpler screens?",
      what: "Whether there's an easier version of the whole app, and how a person gets it."
    },
    {
      k: "onboard", label: "Onboarding", def: "short", opts: [["short", "Short"], ["full", "Full survey"]],
      q: "How much do we ask a new person?",
      what: "The set-up steps a new person goes through before they first see Today."
    }
  ];
  const DEC = {};
  DECISIONS.forEach((D) => (DEC[D.k] = D));
  /* a decision another one draws over: with the Easy version on, the phone draws Easy's own Today and charts, so Home
     and Data style don't change it. One plain line says so under the row in the left bar, and at the top of the note.
     (Easy keeps BM logging, Meal sheet and History.) */
  const SHADOWED = {
    home: { on: () => P.easy === true, line: "Easy has its own Today. Turn Easy off to see this choice." },
    look: { on: () => P.easy === true, line: "Easy has its own charts. Turn Easy off to see this choice." }
  };
  const shadowOf = (k) => (SHADOWED[k] && SHADOWED[k].on() ? SHADOWED[k] : null);
  /* where each decision shows on the phone, for the note's Show it on the phone: the decisions that show on most
     screens (Consistency, the check-in, Data style, Version) have none */
  const SHOWN_ON = {
    home: { open: "today", here: (S, t) => !t && S.tab === "today" },
    /* the row for the option picked: History: List sets List, so Calendar opens the calendar's own row (a module's) */
    history: { open: () => (P.history === "calendar" && EXT.opens["hist-cal"] ? "hist-cal" : "history"), here: (S, t) => !t && S.tab === "history" },
    bmUI: { open: "plus", here: (S, t) => !!t && ["plus", "bm", "earlier"].includes(t.type) },
    mealUI: { open: "meal", here: (S, t) => !!t && t.type === "meal" }
  };
  const showFor = (k) => {
    const w = SHOWN_ON[k];
    if (!w || !P.ph || shadowOf(k)) return null;
    return w.here(P.ph.S, P.ph.top()) ? null : typeof w.open === "function" ? w.open() : w.open;
  };

  /* ---------- the demo controls: each with a note, in the sheet's words. They change the demo person, never the app */
  /* a demo person's logs, built once each, for the notes that describe them: their usual (from 12 weeks) and the day
     the New logs start on */
  const demoModels = {};
  const demoModel = (id, mode) => demoModels[`${id}/${mode}`] || (demoModels[`${id}/${mode}`] = L.build(id, mode, { meals: "all" }));
  /* one line per person, from their own 12 weeks: when their first BM usually comes, their usual forms (in the words
     the Consistency decision has picked), how often symptoms come up, and the food pattern Insights finds in their logs */
  const usualLine = (id) => {
    const M = demoModel(id, "est"), u = M.usual;
    if (!u) return "Their own logs and their own usual.";
    const PR = L.patterns(M, P.form), f = PR.found.find((x) => x.food) || PR.found[0];
    const food = (k) => (L.FOOD_NAMES[k] || [k])[0];
    const pat = !f ? "" : f.kind === "late" ? " Possible pattern: later dinners, then later first BMs." : ` Possible pattern: ${food(f.food)}, then ${f.kind === "loose" ? "a looser first BM" : "bloating the next day"}.`;
    const sym = u.sym && u.sym.every ? `, symptoms on about 1 day in ${u.sym.every}` : "";
    return `First BM usually ${T(u.tLo)} to ${T(u.tHi)}, usual forms ${L.usualFormsText(M, P.form)}${sym}.${pat}`;
  };
  const DEMO = {
    persona: {
      label: "Person",
      note: () => ({
        t: "Person",
        lede: `Switches between ${num(Object.keys(AD.personas).length)} demo people. Each has their own logs and their own usual, so you can see the app on different patterns.`,
        items: Object.values(AD.personas).map((x) => [x.name, usualLine(x.id)])
      })
    },
    data: {
      label: "Logs",
      note: () => ({
        t: "Logs",
        lede: "How long the demo person has used Florin.",
        items: L.DATA.map(([v, l]) => [l, v === "est" ? "A person who has used Florin for a while."
          : v === "new" ? `Day ${L.learnDay(demoModel(P.persona, "new"))}. Florin is still learning their usual, so there's no FloraScore until day ${L.LEARN_DAYS}.`
          : "Day 1, right after set-up, with nothing logged."])
      })
    },
    meals: {
      label: MEALS_LABEL,
      note: () => ({
        t: MEALS_LABEL,
        lede: "How often the demo person wrote meals down. It changes their history, not the app.",
        items: L.MEAL_LOGS.map(([v, l]) => [l, v === "all" ? "Meals written down every day." : v === "rough" ? "Meals written down only on days they also logged a symptom." : "No meals written down."]),
        why: [
          "It shows a trap. If someone writes meals down only on days with symptoms, every meal they log is on a day with symptoms. There are no ordinary days to compare with, so everyday foods can look linked to symptoms.",
          `So Insights holds food patterns back until meals are logged on at least ${coverText()} of the days a person logs anything, and offers a ${L.FOOD_CHECK_DAYS}-day food check instead: log what you ate every day for ${foodSpan()}, ordinary days included. FloraScore never uses meals, so it doesn't change.`,
          `What this means for the app: the meal sheet (decision ${DECISIONS.findIndex((D) => D.k === "mealUI") + 1}) and the food check are our answer to this habit.`
        ],
        try: `Pick ${(L.MEAL_LOGS.find(([v]) => v === "rough") || [, ""])[1]}, then open the Insights tab. The patterns card holds food patterns back and offers the food check. In the demo, Start only describes the check, and on Free it opens membership.`
      })
    },
    plan: {
      label: "Plan",
      note: () => ({
        t: "Plan",
        lede: "Member or Free, to show what each plan gets.",
        items: [
          ["Member", "Everything, including why the score moved, 30 and 90 days, possible patterns, Ask Florin and the report for a clinician."],
          ["Free", `Logging, Today, FloraScore${ckOn() ? ", the weekly check-in" : ""}, History and ${L.RANGES[0]} days of Insights. A locked part opens the membership page.`]
        ]
      })
    },
    theme: { label: "Theme", note: () => ({ t: "Theme", lede: "Light or dark, for the app on the phone. The phone follows your device until you pick one here. The Oura data style turns it dark, unless you've picked one." }) },
    reset: { label: "Reset the demo", note: () => ({ t: "Reset the demo", lede: "Puts the demo person back as they were, and clears anything you logged. Your decisions stay as you set them." }) }
  };

  /* ====================================================================== */
  /* THE PAGE                                                                */
  /* ====================================================================== */
  const sysDark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const pageTheme = () => { const a = document.documentElement.getAttribute("data-theme"); return a === "dark" || a === "light" ? a : sysDark() ? "dark" : "light"; };
  /* the compare mode is gone (Oct 27): its stored switch goes too */
  try { localStorage.removeItem("florin-refresh:compare"); } catch (e) { /* private window: fine */ }
  const P = { persona: "sarah", data: "est", meals: "all", plan: "member", themeSet: null, key: "today", dec: null, ph: null, demoOpen: !!store.get("demoOpen", false) };
  DECISIONS.forEach((D) => { const v = store.get(D.k, D.def); P[D.k] = D.opts.some(([o]) => o === v) ? v : D.def; });
  const appTheme = () => P.themeSet || pageTheme();
  /* what a module's notes see: every decision, the demo controls and the screen */
  const pageState = () => {
    const o = { persona: P.persona, data: P.data, meals: P.meals, plan: P.plan, theme: appTheme(), key: P.key };
    DECISIONS.forEach((D) => (o[D.k] = P[D.k]));
    return o;
  };

  /* "A · 1 to 7" sets as two lines on purpose, the letter over its words, so the three fit side by side; read out as
     "A, 1 to 7". A short label on the toggle keeps the option's full label as its name, which starts with the words
     on screen */
  const optLabel = (l) => { const i = l.indexOf(" · "); return i < 0 ? esc(l) : `<span class="rx-o1">${esc(l.slice(0, i))}</span> <span class="rx-o2">${esc(l.slice(i + 3))}</span>`; };
  const btns = (k, opts, cur) => opts.map(([v, l, sh]) => {
    const name = l.indexOf(" · ") >= 0 ? l.replace(" · ", ", ") : sh && sh !== l ? l : "";
    return `<button type="button" data-rx="${esc(k)}" data-v="${esc(String(v))}" aria-pressed="${v === cur}"${name ? ` aria-label="${esc(name)}"` : ""}>${optLabel(sh || l)}</button>`;
  }).join("");
  const seg = (k, label, opts, cur) => `<div class="rx-seg" role="group" aria-label="${esc(label)}">${btns(k, opts, cur)}</div>`;
  /* one line each: the name, the options, and the info button at the end. A decision Easy draws over gets its line */
  const decHTML = (D) => `<div class="rx-dec${D.chips || D.wide ? " rx-dec--wide" : ""}" data-dec="${D.k}">
      <span class="rx-ctl-l" id="rxd-${D.k}">${esc(D.label)}</span>
      <div class="${D.chips ? "rx-chips" : "rx-seg"}" role="group" aria-labelledby="rxd-${D.k}">${btns(D.k, D.opts, P[D.k])}</div>
      <button type="button" class="rx-info" data-rx="dinfo" data-v="${D.k}" aria-pressed="false" aria-label="About ${esc(D.label)}">${ic("info")}</button>
      ${SHADOWED[D.k] ? `<p class="rx-small rx-dec-shadow" data-shadow="${D.k}" hidden></p>` : ""}
    </div>`;
  /* a demo control's info button: its note says what it changes about the demo person */
  const xinfo = (k) => `<button type="button" class="rx-info" data-rx="xinfo" data-v="${k}" aria-pressed="false" aria-label="About ${esc(DEMO[k].label)}">${ic("info")}</button>`;
  /* a demo row: the name, the options, the info button, as a decision's row is laid out */
  const demoRow = (k, opts, cur, wide) => `<div class="rx-dec${wide ? " rx-dec--wide" : ""}" data-demo="${k}">
      <span class="rx-ctl-l" id="rxx-${k}">${esc(DEMO[k].label)}</span>
      <div class="rx-seg" role="group" aria-labelledby="rxx-${k}">${btns(k, opts, cur)}</div>
      ${xinfo(k)}
    </div>`;
  const demoHTML = () => `
      ${demoRow("persona", Object.values(AD.personas).map((p) => [p.id, p.name]), P.persona)}
      ${demoRow("data", L.DATA, P.data, true)}
      ${demoRow("meals", L.MEAL_LOGS, P.meals, true)}
      ${demoRow("plan", [["member", "Member"], ["free", "Free"]], P.plan)}
      ${demoRow("theme", [["light", "Light"], ["dark", "Dark"]], appTheme())}
      <div class="rx-demo-f"><p class="rx-small" data-time></p><div class="rx-demo-r"><button type="button" class="rx-btn rx-btn--line" data-rx="reset">${ic("undo")}Reset the demo</button>${xinfo("reset")}</div></div>`;
  /* the demo's clock and where the person is, from the model */
  const timeLine = () => {
    const M = P.ph && P.ph.model();
    if (!M) return "";
    const t = L.dateOf(L.TODAY), U = AD.util;
    /* what's logged so far, counted, so the line keeps up as the person logs */
    const n = M.days.reduce((a, x) => a + x.entries.length, 0);
    const who = M.mode === "fresh" ? ` ${M.P.name} just joined: onboarding finished this evening, so today is day ${L.learnDay(M)} of ${L.LEARN_DAYS}${n ? `, with ${plural(n, "log")} so far` : " and nothing is logged yet"}.` : !M.usual ? ` ${M.P.name} is on day ${L.learnDay(M)} of ${L.LEARN_DAYS}, so Florin is still learning their usual.` : "";
    const ck = RU.ckOn(P.ph.V()) && M.checkin.status === "due" ? " The weekly check-in is due tonight." : "";
    return `Demo time is ${U.DOWL[t.getDay()]}, ${U.MONL[t.getMonth()]} ${t.getDate()}, ${T(L.NOW)}.${who}${ck} Logs you add stay until you reset or reload.`;
  };
  const offScreen = (id) => !P.checkin && CK_SCREENS.includes(id);
  const screensHTML = () => screenGroups().map(([g, items]) => `<li class="rx-nav-g"><span class="rx-eyebrow">${esc(g)}</span><ol>${items.map(([id, l]) => offScreen(id)
    ? `<li><button type="button" class="rx-nav-b" data-rx="screen" data-v="${esc(id)}" disabled><span>${esc(l)}</span><em>Check-in is off</em></button></li>`
    : `<li><button type="button" class="rx-nav-b" data-rx="screen" data-v="${esc(id)}">${esc(l)}</button></li>`).join("")}</ol></li>`).join("");

  /* the page's companions: the decisions deck and every data style side by side (the data looks library), each its own artifact */
  const DECK_URL = "https://claude.ai/artifact/2h5ikADR2eFCY1DZYbJEJU", LOOKS_URL = "https://claude.ai/artifact/FdsxDLSQqETo3HRCVmUZzL";
  mount.innerHTML = `
    <a class="rx-skip" href="#rxStage" data-rx="skip">Skip to the phone</a>
    <nav class="rx-mbar" aria-label="Prototype">
      <button type="button" class="rx-mbar-b" data-rx="sheet" data-v="toggles" aria-haspopup="dialog">${ic("sliders")}<span>Toggles</span></button>
      <span class="rx-mbar-t" data-now></span>
      <button type="button" class="rx-mbar-b" data-rx="sheet" data-v="notes" aria-haspopup="dialog">${ic("info")}<span>Notes</span></button>
    </nav>
    <header class="rx-head">
      <div class="rx-head-t"><p class="rx-eyebrow">Florin app refresh · Oct 28</p><h1>The app, with the open decisions as toggles</h1></div>
      <div class="rx-head-r"><p class="rx-lede">Today's app, the one that ships without the sensor. Decisions on the left change the app, and the phone changes with them. Demo changes the demo person, not the app. Every row has a note.</p>
      <p class="rx-head-links"><a href="${DECK_URL}" target="_blank" rel="noopener">The decisions, as slides</a><a href="${LOOKS_URL}" target="_blank" rel="noopener">Every data style, side by side</a></p></div>
    </header>
    <div class="rx-main">
      <aside class="rx-side rx-side--l" id="rxLeft" aria-label="Toggles"></aside>
      <div class="rx-center"><div class="rx-stage" id="rxStage"></div></div>
      <aside class="rx-side rx-side--r" id="rxRight" aria-label="Notes"></aside>
    </div>
    <button type="button" class="rx-jump" data-rx="jump" hidden></button>
    <footer class="rx-foot"><span>Prototype only. Not for patients.</span></footer>
    ${["toggles", "notes"].map((w) => `<div class="rx-sheet" id="rxSheet-${w}" hidden>
      <div class="rx-sheet-scrim" data-rx="sheet-close"></div>
      <div class="rx-sheet-p" role="dialog" aria-modal="true" aria-labelledby="rxSheet-${w}-h">
        <div class="rx-sheet-h"><b id="rxSheet-${w}-h">${w === "toggles" ? "Toggles" : "Notes"}</b><button type="button" class="rx-x" data-rx="sheet-close" aria-label="Close">${ic("close")}</button>${w === "toggles" ? '<div class="rx-sheet-now" data-sheet-now role="status" hidden></div>' : ""}</div>
        <div class="rx-sheet-b" data-slot></div>
      </div>
    </div>`).join("")}`;

  const $ = (s) => mount.querySelector(s);
  const main = $(".rx-main"), stage = $("#rxStage"), left = $("#rxLeft"), right = $("#rxRight"), mbar = $(".rx-mbar"), jump = $(".rx-jump");
  const sheets = { toggles: $("#rxSheet-toggles"), notes: $("#rxSheet-notes") };
  const make = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  /* the panels exist once, and move between the side bars (wide) and the sheets (phone), so nothing is doubled */
  const decPanel = make(`<section class="rx-panel rx-panel--dec" aria-labelledby="rxDecH"><h2 class="rx-h" id="rxDecH">Decisions</h2><p class="rx-small rx-dec-lede">Each one changes the app on the phone.</p><div class="rx-decs">${DECISIONS.map(decHTML).join("")}</div></section>`);
  /* the demo controls fold away to one line, so the Screens list is near the top of the bar. Open or folded is
     remembered for this viewer */
  const demoPanel = make(`<section class="rx-panel rx-panel--demo" aria-labelledby="rxDemoH"><h2 class="rx-h" id="rxDemoH">Demo</h2><button type="button" class="rx-fold" data-rx="fold" aria-controls="rxDemoB" aria-expanded="false"><span></span>${ic("chev")}</button><p class="rx-small rx-demo-lede">These change the demo person, not the app.</p><p class="rx-small rx-demo-sum" data-sum></p><div class="rx-demo" id="rxDemoB">${demoHTML()}</div></section>`);
  const navPanel = make(`<nav class="rx-panel rx-panel--nav" aria-labelledby="rxScrH"><h2 class="rx-h" id="rxScrH">Screens</h2><ol class="rx-nav">${screensHTML()}</ol></nav>`);
  const notesPanel = make(`<div class="rx-panel rx-notes" id="rxNotes"></div>`);
  const mq = window.matchMedia("(max-width: 759px)");
  const isM = () => mq.matches;

  /* ---------- the phone ---------- */
  function phoneShell() {
    const w = document.createElement("div");
    w.className = "rx-ph";
    w.innerHTML = `<div class="rx-fit"><div class="apx-device rx-dev"><div class="apx-phone" aria-hidden="true"></div><div class="apx-screen"><div class="rx-mount"></div></div></div></div>`;
    return w;
  }
  function onNav(k) {
    if (!P.ph) return; /* still being built */
    /* a decision's note stays up until the phone moves to another screen (but not when the note itself showed it) */
    if (k !== P.key && !P.keepDec) P.dec = null;
    P.key = k;
    notes();
    syncNav();
  }
  /* each side bar is as tall as the window below where it sits now, wherever the page is scrolled, so its end is never
     out of reach (a sticky bar starts under the header and rises to the top as the page scrolls) */
  function sizeSides() {
    [left, right].forEach((el) => {
      if (isM() || getComputedStyle(el).position !== "sticky") { el.style.maxHeight = ""; return; }
      const t = Math.max(0, el.getBoundingClientRect().top);
      /* while Read the note shows at the foot of the toggles, the toggles end above it, so it never covers a row */
      const foot = el === left && jump && !jump.hidden ? Math.max(16, Math.ceil(window.innerHeight - jump.getBoundingClientRect().top) + 12) : 16;
      el.style.maxHeight = `${Math.max(240, Math.floor(window.innerHeight - t - foot))}px`;
    });
  }
  /* the button shows and hides from many places: the toggles follow it */
  try { new MutationObserver(() => sizeSides()).observe(jump, { attributes: true, attributeFilter: ["hidden"] }); } catch (e) { /* no observer: the next scroll or resize sizes them */ }
  /* scale the phone to the space it has, never above 1: the whole phone fits under the header, tab bar included */
  function fit() {
    const f = stage.querySelector(".rx-fit");
    if (!f) return;
    if (isM()) { f.style.width = ""; f.style.height = ""; f.firstElementChild.style.transform = ""; return; }
    const top0 = Math.min(240, stage.getBoundingClientRect().top + window.scrollY);
    const avW = stage.clientWidth - 1, avH = Math.max(560, window.innerHeight - top0 - 24);
    const s = Math.min(1, avW / 414, avH / 868);
    f.style.width = `${Math.round(414 * s)}px`;
    f.style.height = `${Math.round(868 * s)}px`;
    f.firstElementChild.style.transform = s < 1 ? `scale(${s.toFixed(4)})` : "";
    sizeSides();
  }
  /* wide: the toggles on the left, the notes on the right. Phone: both in sheets, from the bar at the top */
  /* the header's two links (the deck, every data style side by side) move to the top of the Toggles sheet on a phone,
     where the header is hidden, and back under the header's lede when it's wide: moved, never doubled */
  const links = $(".rx-head-links"), linksHome = links ? links.parentNode : null;
  function place() {
    const m = isM();
    const tSlot = m ? sheets.toggles.querySelector("[data-slot]") : left;
    [decPanel, demoPanel, navPanel].forEach((el) => tSlot.appendChild(el));
    if (links) { if (m) tSlot.insertBefore(links, decPanel); else if (links.parentNode !== linksHome) linksHome.appendChild(links); }
    const nSlot = m ? sheets.notes.querySelector("[data-slot]") : right;
    nSlot.appendChild(notesPanel);
    mount.classList.toggle("rx--m", m);
    if (!m) closeSheet();
    P.ph.set("full", m);
    fit();
  }

  /* ---------- notes: the screen's, a decision's, or a demo control's ---------- */
  /* P.dec names the decision (or the demo control) whose note is up, until the phone moves to another screen */
  const noteFor = () => {
    const M = P.ph.model(), S = pageState();
    if (P.dec && DEMO[P.dec]) return { kind: "demo", N: DEMO[P.dec].note(M) };
    if (P.dec && DEC[P.dec]) {
      const D = DEC[P.dec], f = EXT.decisions[P.dec];
      const own = (f && safe(f, M, S)) || (D.note ? safe(D.note, M) : null) || {};
      return { kind: "dec", D, N: Object.assign({ q: D.q, what: D.what }, own) };
    }
    const f = EXT.notes[P.key];
    const N = (f && safe(f, M, S)) || (NOTES[P.key] ? NOTES[P.key](M, P.form) : { t: screenLabel(keyToScreen(P.key)) || "This screen", lede: "No note for this screen yet." });
    return { kind: "screen", N };
  };
  /* a screen's note: { t, lede, open? }. A note's ba (was and now) and res (research) are gone for good (Will, Oct 28) */
  const list = (h, cls, items) => (items && items.length ? `<h3 class="rx-h3">${esc(h)}</h3><ul class="${cls}">${items.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "");
  const para = (h, t, cls = "rx-line") => (t ? `<h3 class="rx-h3">${esc(h)}</h3><p class="${cls}">${esc(t)}</p>` : "");
  /* a name and its line, for the check-in's questions and a demo control's options */
  const pairs = (items) => (items && items.length ? `<ul class="rx-pairs">${items.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join("")}</ul>` : "");
  /* an option's name for the top label and the phone's line: the toggle's letter for Consistency ("C"), else its name */
  const optName = (D, v) => { const o = D.opts.find(([x]) => x === v); if (!o) return String(v); const l = o[1], i = l.indexOf(" · "); return i < 0 ? l : l.slice(0, i); };
  /* a decision, in the sheet's shape: the question, what it decides, a block per option (What it is, Why do it, Why
     not), the recommendation, at most one open question, and where to try it. The top label numbers it as the deck
     does and says what we recommend, so the answer is in view before the options */
  function decNote(D, N) {
    const recV = N.rec ? [].concat(N.rec.v) : [];
    /* a module's note that fails leaves the options as names, so the note still lists them */
    const opts = N.opts && N.opts.length ? N.opts : D.opts.map(([v]) => ({ v }));
    const row = (h, t) => (t ? `<dt>${h}</dt><dd>${esc(t)}</dd>` : "");
    const blocks = opts.map((o) => {
      const rec = recV.some((v) => v === o.v), name = o.name || (D.opts.find(([x]) => x === o.v) || [])[1] || String(o.v);
      return `<li class="rx-opt${rec ? " is-rec" : ""}"><p class="rx-opt-h"><b>${esc(name)}</b>${rec ? '<span class="rx-tag">Recommended</span>' : ""}</p>${o.is || o.why || o.not ? `<dl>${row("What it is", o.is)}${row("Why do it", o.why)}${row("Why not", o.not)}</dl>` : ""}</li>`;
    }).join("");
    const sh = shadowOf(D.k), show = showFor(D.k);
    const A = N.about;
    const recName = N.rec && N.rec.short ? `We recommend ${N.rec.short}` : recV.length ? `We recommend ${listOf(recV.map((v) => optName(D, v)))}` : "";
    return `<p class="rx-eyebrow">Decision ${DECISIONS.indexOf(D) + 1} of ${DECISIONS.length} · ${esc(D.label)}${recName ? `<span class="rx-eb-sep"> · </span><span class="rx-eb-rec">${esc(recName)}</span>` : ""}</p>
        <h2 id="rxNoteH" tabindex="-1">${esc(N.q || D.label)}</h2>
        ${N.what ? `<p class="rx-note-lede">${esc(N.what)}</p>` : ""}
        ${N.answer ? `<p class="rx-answer"><b>${esc(N.answer[0])}</b> ${esc(N.answer[1])}</p>` : ""}
        ${sh ? `<p class="rx-note-easy">${esc(sh.line)}</p>` : ""}
        ${N.aside ? `<p class="rx-aside">${esc(N.aside)}</p>` : ""}
        ${A ? `<h3 class="rx-h3">${esc(A.h)}</h3>${A.lede ? `<p class="rx-line rx-about-l">${esc(A.lede)}</p>` : ""}${pairs(A.items)}${A.more && A.more.length ? `<ul class="rx-q rx-about-m">${A.more.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}` : ""}
        <h3 class="rx-h3">The options</h3><ul class="rx-opts">${blocks}</ul>
        ${N.rec ? `<p class="rx-rec"><b>${esc(N.rec.text)}</b>${N.rec.why ? ` ${esc(N.rec.why)}` : ""}</p>` : ""}
        ${para("Still open", N.open)}
        ${para("Try it", N.try)}
        ${show ? `<button type="button" class="rx-btn rx-note-show" data-rx="show" data-v="${esc(show)}">${ic("chev")}Show it on the phone</button>` : ""}`;
  }
  /* a demo control: what it changes about the demo person, never the app */
  const demoNote = (N) => `<p class="rx-eyebrow">Demo setting</p>
        <h2 id="rxNoteH" tabindex="-1">${esc(N.t)}</h2>
        ${N.lede ? `<p class="rx-note-lede">${esc(N.lede)}</p>` : ""}
        ${pairs(N.items)}
        ${N.why && N.why.length ? `<h3 class="rx-h3">Why it's here</h3>${N.why.map((t) => `<p class="rx-line">${esc(t)}</p>`).join("")}` : ""}
        ${para("Try it", N.try)}`;
  function notes() {
    if (!P.ph) return;
    const { kind, N, D } = noteFor();
    let body;
    if (kind === "dec") body = decNote(D, N);
    else if (kind === "demo") body = demoNote(N);
    else {
      /* disclaimers are left out of the scan, as in the studio: they name what Florin doesn't do on purpose */
      const src = P.ph.el.querySelector(".ap-o:not(.is-out):last-child .ap-o-p") || P.ph.el.querySelector(".ap-layer");
      const clone = src.cloneNode(true);
      clone.querySelectorAll(".ap-fine, [data-disclaimer], svg").forEach((n) => n.remove());
      const hits = checkClaims(clone.textContent.replace(/\s+/g, " "));
      body = `<p class="rx-eyebrow">This screen</p>
        <h2 id="rxNoteH" tabindex="-1">${esc(N.t || "")}</h2>
        ${N.lede ? `<p class="rx-note-lede">${esc(N.lede)}</p>` : ""}
        ${list("Still open", "rx-q", N.open)}
        ${hits.length ? `<p class="rx-lint is-hit">${ic("info")}<span>Claims check: ${hits.length} to look at on this screen: ${esc(hits.map((h) => `"${h.text}" (${h.rule.why})`).join("; "))}</span></p>` : ""}`;
    }
    /* a note about something else opens at its top, wherever the last one was scrolled to */
    const id = `${kind}:${kind === "screen" ? P.key : P.dec}`;
    if (id !== P.noteId) {
      P.noteId = id;
      right.scrollTop = 0;
      const sp = sheets.notes.querySelector(".rx-sheet-p");
      if (sp) sp.scrollTop = 0;
    }
    notesPanel.innerHTML = `<article class="rx-note${kind === "screen" ? "" : ` rx-note--${kind}`}">
        ${body}
        ${kind === "screen" ? "" : `<button type="button" class="rx-btn rx-btn--line rx-note-back" data-rx="dclose">${ic("back")}Notes for this screen</button>`}
      </article>`;
    mount.querySelectorAll('[data-rx="dinfo"], [data-rx="xinfo"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P.dec)));
    const now = mount.querySelector("[data-now]");
    if (now) now.textContent = kind === "dec" ? D.label : kind === "demo" ? N.t : screenLabel(keyToScreen(P.key)) || N.t || "";
    const tl = mount.querySelector("[data-time]");
    if (tl) tl.textContent = timeLine();
  }
  /* the lit row names what the phone draws (it matches the note, which reads P.key); a screen the list has no row for
     lights the row the page opened, while the phone is still on it */
  function syncNav() {
    const cur = keyToScreen(P.key) || (P.row && P.key === P.rowKey ? P.row : null);
    /* the row the page opened last, for the checks (behave.js walks the list with the arrow keys) */
    navPanel.dataset.row = P.row || "";
    mount.querySelectorAll('[data-rx="screen"]').forEach((b) => b.setAttribute("aria-current", String(b.dataset.v === cur)));
  }
  function renderNav() { navPanel.querySelector(".rx-nav").innerHTML = screensHTML(); syncNav(); }
  const MEAL_SUM = { all: "Meals every day", rough: "Meals only with symptoms", none: "No meals" };
  const demoSum = () => [AD.personas[P.persona] ? AD.personas[P.persona].name : P.persona, (L.DATA.find(([v]) => v === P.data) || [, ""])[1], MEAL_SUM[P.meals], P.plan === "free" ? "Free" : "Member", appTheme() === "dark" ? "Dark" : "Light"].filter(Boolean).join(" · ");
  function syncFold() {
    const b = demoPanel.querySelector('[data-rx="fold"]'), body = demoPanel.querySelector("#rxDemoB"), sum = demoPanel.querySelector("[data-sum]");
    b.setAttribute("aria-expanded", String(P.demoOpen));
    b.setAttribute("aria-label", P.demoOpen ? "Hide the demo controls" : "Show the demo controls");
    b.querySelector("span").textContent = P.demoOpen ? "Hide" : "Show";
    body.hidden = !P.demoOpen;
    sum.hidden = P.demoOpen;
    sum.textContent = demoSum();
  }
  function syncControls() {
    DECISIONS.forEach((D) => mount.querySelectorAll(`[data-rx="${D.k}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(P[D.k])))));
    ["persona", "data", "meals", "plan"].forEach((k) => mount.querySelectorAll(`[data-rx="${k}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P[k]))));
    mount.querySelectorAll('[data-rx="theme"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === appTheme())));
    mount.querySelectorAll("[data-shadow]").forEach((el) => { const sh = shadowOf(el.dataset.shadow); el.hidden = !sh; el.textContent = sh ? sh.line : ""; });
    syncFold();
  }

  /* ---------- the controls ---------- */
  /* every phone.set lands here first, whoever made it (a toggle on the left, Start membership, a module's profile
     screen), so the toggles, the stored decisions, the Screens list and the notes always match the phone */
  function onSet(k, v) {
    if (!P.ph || k === "full") return;
    /* a theme the same as the page's own (the system's, or the page's toggle) is no pick: the phone goes on following
       the page. So the Oura style turning the phone dark and giving the theme back leaves nothing stored */
    if (k === "theme") P.themeSet = v === pageTheme() ? null : v;
    else if (DEC[k]) {
      if (DEC[k].opts.some(([o]) => o === v)) { P[k] = v; store.set(k, v); }
      if (k === "checkin") renderNav();
    } else if (["persona", "data", "meals", "plan"].includes(k)) P[k] = v;
    syncControls(); notes(); syncNav();
  }
  /* the notes sit under the phone between 760 and 1019px: a decision changed up in the bar points down to its note */
  const notesOut = () => { if (isM()) return false; const r = notesPanel.getBoundingClientRect(); return r.top > window.innerHeight - 48 || r.bottom < 48; };
  const toNotes = () => { notesPanel.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); const h = notesPanel.querySelector("#rxNoteH"); if (h) h.focus({ preventScroll: true }); };
  /* the button sits at the foot of the toggles column, never over the phone or its tab bar */
  const placeJump = () => { const r = left.getBoundingClientRect(); jump.style.left = `${Math.round(r.left + r.width / 2)}px`; };
  function pointAtNote(D) {
    clearTimeout(jump._t);
    if (!D || !notesOut()) { jump.hidden = true; return; }
    jump.textContent = `Read the note on ${D.label}`;
    placeJump();
    jump.hidden = false;
    jump._t = setTimeout(() => (jump.hidden = true), 8000);
  }
  /* a decision: stored, sent to the phone (onSet does the rest), and its note shown until the phone moves on */
  function decide(k, v) {
    P.ph.set(k, v);
    P.dec = k;
    notes();
    pointAtNote(DEC[k]);
    sheetNow(k);
  }
  /* on a phone the Toggles sheet stays over the app: one line at its top says what changed, with See it (closing the
     sheet, on the screen the option shows on) and Read the note */
  const nowEl = () => sheets.toggles.querySelector("[data-sheet-now]");
  function sheetNow(k) {
    const el = nowEl();
    if (!el) return;
    if (!k || !isM() || sheets.toggles.hidden || !DEC[k]) { el.hidden = true; el.innerHTML = ""; return; }
    const D = DEC[k], sh = shadowOf(k), show = showFor(k);
    const see = sh ? "" : show ? `<button type="button" class="rx-btn" data-rx="show" data-v="${esc(show)}">See it</button>` : '<button type="button" class="rx-btn" data-rx="sheet-close">See it</button>';
    el.innerHTML = `<p class="rx-small">${esc(D.label)} is now ${esc(optName(D, P[k]))}.${sh ? ` ${esc(sh.line)}` : ""}</p><div class="rx-sheet-now-b">${see}<button type="button" class="rx-btn rx-btn--line" data-rx="now-note" data-v="${esc(k)}">Read the note</button></div>`;
    el.hidden = false;
  }
  /* the plan for the phone: the switch, Start membership, or a free screen from the list */
  function setPlan(v, then) {
    P.ph.set("plan", v);
    if (then) P.ph.open(then);
  }
  function scrollToStage() {
    if (isM()) return;
    const r = stage.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.5) stage.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }
  function openSheet(w) {
    if (w === "toggles") sheetNow(null);
    Object.entries(sheets).forEach(([k, el]) => (el.hidden = k !== w));
    main.inert = true; mbar.inert = true;
    const el = sheets[w];
    el.querySelector(".rx-sheet-p").scrollTop = 0;
    requestAnimationFrame(() => { const x = el.querySelector(".rx-x"); if (x) x.focus(); });
  }
  function closeSheet() {
    const was = Object.keys(sheets).find((k) => !sheets[k].hidden);
    Object.values(sheets).forEach((el) => (el.hidden = true));
    main.inert = false; mbar.inert = false;
    if (was && isM()) { const b = mbar.querySelector(`[data-v="${was}"]`); if (b) b.focus({ preventScroll: true }); }
  }
  mount.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rx]");
    if (!b || !mount.contains(b) || b.disabled) return;
    const k = b.dataset.rx, v = b.dataset.v;
    if (DEC[k]) { const o = DEC[k].opts.find(([x]) => String(x) === v); if (o) decide(k, o[0]); return; }
    switch (k) {
      /* a decision's info button, or a demo control's: its note, until the phone moves on */
      case "dinfo": case "xinfo":
        P.dec = P.dec === v && !isM() ? null : v;
        notes();
        jump.hidden = true;
        if (isM()) openSheet("notes");
        /* asked for, so a note under the phone comes into view */
        else if (P.dec && notesOut()) toNotes();
        break;
      case "dclose": P.dec = null; notes(); break;
      /* the skip link: focus goes to the phone's first control (the top sheet's, when one is open) */
      case "skip": {
        e.preventDefault();
        const all = [...P.ph.el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
        const first = all.find((x) => !x.closest("[inert]") && x.getClientRects().length);
        if (first) first.focus();
        break;
      }
      case "show": closeSheet(); jump.hidden = true; P.keepDec = true; try { P.ph.open(v); } finally { P.keepDec = false; } notes(); syncNav(); break;
      case "jump": jump.hidden = true; toNotes(); break;
      /* the phone's Toggles sheet: Read the note, for the decision just changed */
      case "now-note": P.dec = v; notes(); openSheet("notes"); break;
      case "fold": P.demoOpen = !P.demoOpen; store.set("demoOpen", P.demoOpen); syncFold(); sizeSides(); break;
      /* a row picked from the list always shows that screen's note, even when the phone is already on it */
      case "screen": closeSheet(); jump.hidden = true; P.dec = null; P.row = v; P.ph.open(v); P.rowKey = P.key; notes(); syncNav(); scrollToStage(); break;
      case "persona": case "data": P.ph.set(k, v); break;
      /* the meals control reads like a design option, so changing it shows its note: it's the demo person's history */
      case "meals": P.ph.set(k, v); P.dec = "meals"; notes(); if (isM()) openSheet("notes"); else pointAtNote(DEMO.meals); break;
      case "plan": setPlan(v); break;
      case "theme": P.themeSet = v; P.ph.set("theme", v); break;
      case "reset": P.ph.reset(); notes(); break;
      case "sheet": openSheet(v); break;
      case "sheet-close": closeSheet(); break;
      default: break;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && Object.values(sheets).some((el) => !el.hidden)) { e.preventDefault(); closeSheet(); return; }
    /* the arrow keys step through the screens list, from the list itself or with nothing focused; never from a toggle,
       a field or the phone, where the arrows mean something else */
    const from = e.target, free = from === document.body || from === document.documentElement || (from.closest && from.closest(".rx-panel--nav"));
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !isM() && free && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      const flat = screenGroups().flatMap(([, items]) => items.map(([id]) => id)).filter((id) => !offScreen(id));
      /* step from the row the page opened while the phone is still on it ("Log a BM, details filled in" draws the bm
         screen, which would step back to it), else from the row the phone's screen lights */
      const at = P.row && P.key === P.rowKey && flat.includes(P.row) ? P.row : keyToScreen(P.key);
      const i = Math.max(0, flat.indexOf(at));
      const next = flat[(i + (e.key === "ArrowRight" ? 1 : -1) + flat.length) % flat.length];
      e.preventDefault();
      P.dec = null; P.row = next;
      P.ph.open(next);
      P.rowKey = P.key;
      notes(); syncNav();
      /* a screen that puts focus in the phone (a sheet, a chat) would end the walk there: focus goes back to the lit row */
      const back = () => {
        if (!P.ph.el.contains(document.activeElement)) return;
        const lit = navPanel.querySelector('[data-rx="screen"][aria-current="true"]');
        if (lit) lit.focus({ preventScroll: true });
      };
      requestAnimationFrame(() => requestAnimationFrame(back));
      setTimeout(back, 300);
    }
  });

  /* follow the viewer's theme unless the demo picks one */
  /* EXT.themeAuto marks the set as the page following, not the viewer picking, so a module (the Oura style's dark first)
     can tell the two apart */
  const followTheme = () => { if (!P.themeSet && P.ph) { EXT.themeAuto = true; try { P.ph.set("theme", pageTheme()); } finally { EXT.themeAuto = false; } syncControls(); } };
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", followTheme);
  new MutationObserver(followTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- build ---------- */
  const shell = phoneShell();
  stage.appendChild(shell);
  /* the page redraws its notes (the claims check, the time line) once a frame at most, after the phone draws */
  let notesQ = 0;
  const notesSoon = () => { if (!notesQ) notesQ = requestAnimationFrame(() => { notesQ = 0; notes(); }); };
  const cfg = { persona: P.persona, data: P.data, meals: P.meals, plan: P.plan, theme: appTheme(), onNav: (k) => onNav(k), onPlan: (v, then) => setPlan(v, then), onSet: (k, v) => onSet(k, v), onDraw: notesSoon };
  DECISIONS.forEach((D) => (cfg[D.k] = P[D.k]));
  P.ph = Phone(shell.querySelector(".rx-mount"), cfg);
  P.ph.el.setAttribute("aria-label", "Florin app prototype");
  P.key = P.ph.key();
  place();
  notes();
  syncNav();
  syncControls();
  /* the header settles once the fonts are in, and the phone's room with it */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  let wasM = isM();
  window.addEventListener("resize", FL.debounce(() => { if (isM() !== wasM) { wasM = isM(); place(); } else fit(); if (!jump.hidden) placeJump(); }, 120));
  let sideQ = 0;
  window.addEventListener("scroll", () => { if (!sideQ) sideQ = requestAnimationFrame(() => { sideQ = 0; sizeSides(); if (!jump.hidden && !notesOut()) jump.hidden = true; }); }, { passive: true });
})();
