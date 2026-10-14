/* Florin app refresh: the prototype page. One phone, or A and B side by side, with the screens to jump to, the demo
   controls and notes for whatever the phone is showing. Each phone is a full working copy of the app with its own
   logs, so logging in A never changes B. On a phone the app fills the screen and the notes move into a sheet. */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, B = window.FLORIN || {};
  const mount = document.getElementById("rx");
  if (!FL || !L || !RU || !AD || !mount) return;
  const esc = FL.esc, T = AD.util.fmtTime, ic = RU.icon;
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

  function Phone(host, cfg) {
    const S = { form: cfg.form, persona: cfg.persona, data: cfg.data, meals: cfg.meals || "all", mealUI: cfg.mealUI || "quick", plan: cfg.plan || "member", tab: "today", ovl: [], hist: { filter: "all", n: 14 }, ins: { range: 30, k: null, y: 0 }, askCtx: null, uid: ++UID, undo: null, drafts: {} };
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
    const V = () => ({ form: S.form, uid: S.uid, mealUI: S.mealUI, plan: S.plan });
    const top = () => S.ovl[S.ovl.length - 1];

    /* ---------- the tab underneath ---------- */
    function renderTab(soft) {
      const y = layer.scrollTop;
      S.M.ckDraft = S.ckDraft || null;
      const html = S.tab === "today" ? RU.today(S.M, V()) : S.tab === "history" ? RU.history(S.M, V(), S.hist)
        : S.tab === "insights" ? (S.ins.k ? RU.idetail(S.M, V(), S.ins) : RU.insights(S.M, V(), S.ins)) : RU.ask(S.M, V(), S.askCtx);
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
      switch (o.type) {
        case "pay": return RU.paywall(S.M, V(), o.st);
        case "plus": return RU.plus(S.M, V(), o.st);
        case "earlier": return RU.earlier(S.M, V());
        case "bm": return RU.bm(S.M, V(), o.st);
        case "sym": return RU.sym(S.M, V(), o.st);
        case "meal": return o.st.quick ? RU.mealQuick(S.M, V(), o.st) : RU.meal(S.M, V(), o.st);
        case "guide": return RU.guide(V());
        case "flag": return RU.flagNote(o.st);
        case "ck": return RU.ck(S.M, V(), o.st);
        case "ckday": return RU.ckDay(S.M, o.st);
        case "nobm": return RU.nobmSheet(o.st);
        default: return "";
      }
    }
    const scroller = (el) => el.querySelector(".ap-fsh-b, .ap-ck-b") || el.querySelector(".ap-psh");
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
    function push(type, st = {}, o = {}) {
      const ov = { type, st, el: document.createElement("div"), opener: document.activeElement, okey: keyFor(document.activeElement), t0: performance.now() };
      ov.el.className = `ap-o ap-o--${KIND[type]}${o.instant || reduced() ? " is-now" : ""}`;
      /* a short sheet closes on a tap outside it; a log form doesn't, so a stray tap can't lose what's on it */
      ov.el.innerHTML = `${KIND[type] === "screen" ? "" : `<div class="ap-o-scrim"${KIND[type] === "sheet" ? ' data-act="close"' : ""} aria-hidden="true"></div>`}<div class="ap-o-p"></div>`;
      ov.el.querySelector(".ap-o-p").innerHTML = ovlHTML(ov);
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
      p.innerHTML = ovlHTML(ov);
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
    function swap(type, st) { const opener = top() && top().opener; pop({ instant: true }); const ov = push(type, st); ov.opener = opener; }

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
    const newMeal = (d = L.TODAY) => {
      const kept = fromDraft("meal", d);
      if (kept) return kept;
      const had = (m) => { const x = L.day(S.M, d); return !!x && x.entries.some((e) => e.kind === "meal" && e.meal === m); };
      let k = L.mealFor(d === L.TODAY ? L.NOW : 12.5);
      if (d === L.TODAY && k === "other" && L.NOW >= 15 && L.NOW < 17 && !had("lunch")) k = "lunch";
      if (d === L.TODAY && k === "other" && L.NOW >= 22.5 && !had("dinner")) k = "dinner";
      const st = { d, t: L.NOW, meal: k, text: "", note: "", autoT: "" };
      if (d !== L.TODAY || k !== L.mealFor(L.NOW)) mealTime(st);
      return st;
    };
    const newCk = () => ({ step: 0, answers: [null, null, null, null], tags: [], note: "" });
    const newMealQuick = (d = L.TODAY) => {
      const kept = fromDraft("meal", d);
      if (kept && kept.quick) return kept;
      return { d, t: d === L.TODAY ? L.NOW : L.MEAL_DEFAULT_T.day, meal: "day", text: "", note: "", quick: true, voice: "idle" };
    };
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
        if (cfg.onPlan) cfg.onPlan("member"); else { S.plan = "member"; renderTab(true); nav(); }
        toast("Membership is on in this demo. Insights and Ask Florin are open.");
      },
      irange(b) { S.ins.range = +b.dataset.v; renderTab(true); nav(); focusSel(`[data-act="irange"][data-v="${CSS.escape(b.dataset.v)}"]`); },
      idetail(b) {
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
        if (d !== L.TODAY) return ACT["open-bm"](b);
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
        const signs = L.alarmsIn(e.note), sign = signs.length ? L.signText(signs) : null, flagged = L.FLAGS.some(([k]) => e.flags[k]);
        if (flagged || sign) push("flag", { flags: Object.assign({}, e.flags), sign: flagged ? null : sign, signs: flagged ? [] : signs, restore }).okey = { act: "edit", id: e.id };
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
        if (sign) push("flag", { sign, signs, restore }).okey = { act: "edit", id: e.id };
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
        const restore = snapshot();
        S.M.checkin.status = "skipped";
        S.ckDraft = null;
        renderTab(true);
        toast("Skipped for this week. It's still in the plus menu if you change your mind.", restore);
        /* the button that was pressed is gone: Undo in the toast is the next thing to do */
        requestAnimationFrame(() => { const u = tst.querySelector('[data-act="undo"]'); if (u) u.focus({ preventScroll: true }); });
      },
      "ck-result"() {
        const c = S.M.checkin, st = { step: L.CHECKIN.length + 1, answers: c.answers.slice(), tags: (c.tags || []).slice(), note: c.note || "" };
        if (top() && top().type === "plus") swap("ck", st); else push("ck", st);
      },
      "ck-day"() { push("ckday", Object.assign({}, S.M.ckDay)); },
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
      hfilter(b) { S.hist.filter = b.dataset.v; renderTab(true); },
      hmore() { S.hist.n = (S.hist.n || 14) + 14; renderTab(true); },
      undo() { const u = S.undo; S.undo = null; tst.classList.remove("is-on"); if (u) u(); refocus(null); }
    };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b || !root.contains(b)) return;
      const f = ACT[b.dataset.act];
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
      if (!ov || KIND[ov.type] !== "sheet" || !h || !ov.el.contains(h) || e.target.closest("button")) return;
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
    function key() {
      const t = top();
      if (!t && S.tab === "insights" && S.ins.k) return S.ins.k.indexOf("pattern:") === 0 ? "i-pattern" : `i-${S.ins.k}`;
      if (!t && S.tab === "ask" && S.askCtx) return "ask-about";
      if (!t) return S.tab;
      if (t.type === "ck") return t.st.step > L.CHECKIN.length ? "ckdone" : "ck";
      return t.type;
    }
    function nav() {
      /* under an overlay, nothing behind it can take focus: the screen, the tab bar, a lower sheet */
      const any = S.ovl.length > 0;
      root.querySelector(".ap-stack").inert = any;
      tb.inert = any;
      S.ovl.forEach((o, i) => { o.el.inert = i < S.ovl.length - 1; });
      root.classList.toggle("has-full", S.ovl.some((o) => KIND[o.type] !== "sheet"));
      root.classList.toggle("has-ovl", S.ovl.length > 0);
      if (cfg.onNav) cfg.onNav(key(), api);
    }

    /* jump straight to a screen in a known state (the list beside the phone uses this) */
    function open(id) {
      closeAll();
      clearTimeout(S.ckT);
      const go = (tab) => { S.tab = tab; renderTab(true); layer.scrollTop = 0; };
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
        case "history": go("history"); break;
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
        case "ask": S.askCtx = null; go("ask"); break;
        case "ask-about": S.askCtx = { k: "timing", range: S.ins.range }; go("ask"); break;
        case "ck-card": go("today"); { const c = layer.querySelector(".ap-ckc"); if (c) layer.scrollTop = Math.max(0, c.offsetTop - 64); } break;
        default: go("today");
      }
      nav();
    }
    function rebuild() { clearTimeout(S.ckT); S.ovl.forEach((o) => o.el.remove()); S.ovl = []; S.M = L.build(S.persona, S.data, { meals: S.meals }); S.ckDraft = null; S.drafts = {}; S.hist = { filter: "all", n: 14 }; S.ins = { range: 30, k: null, y: 0 }; S.askCtx = null; tst.classList.remove("is-on"); S.undo = null; }
    const api = {
      el: root,
      open,
      key,
      model: () => S.M,
      form: () => S.form,
      setForm(f) { S.form = f; renderTab(true); S.ovl.forEach((o) => rerender(o)); },
      setPersona(p) { S.persona = p; rebuild(); open("today"); },
      setData(d) { S.data = d; rebuild(); open("today"); },
      setMeals(m) { S.meals = m; rebuild(); open("today"); },
      setMealUI(m) { S.mealUI = m; if (top() && top().type === "meal") open("meal"); else { renderTab(true); S.ovl.forEach((o) => rerender(o)); nav(); } },
      setPlan(p) { S.plan = p; renderTab(true); S.ovl.forEach((o) => rerender(o)); nav(); },
      setTheme(t) { root.dataset.theme = t; },
      setFull(b) { root.classList.toggle("is-full", !!b); },
      reset() { rebuild(); open("today"); }
    };
    renderTab();
    nav();
    return api;
  }

  /* ====================================================================== */
  /* NOTES FOR EACH SCREEN                                                   */
  /* ====================================================================== */
  /* the week, read three ways, so the notes can say what B hides */
  const abWeek = (M) => {
    if (!M.usual) return null;
    const W = { A: RU.week(M, "A"), B: RU.week(M, "B"), C: RU.week(M, "C") };
    const diff = W.A.bms.filter((b) => L.inForms(M, b, "A") !== L.inForms(M, b, "B"));
    return { W, diff, n: W.A.bms.length };
  };
  const abLine = (M, f = "C") => {
    const m = f === "B" ? "C" : f;
    const ab = abWeek(M);
    if (!ab) return "With a new person there's no usual yet, so all three read the same until day 14.";
    if (!ab.diff.length) return `This week all three read the same: ${ab.W.A.inForms} of ${ab.n} BMs within ${M.P.name}'s usual.`;
    const ac = ab.W.A.inForms === ab.W.C.inForms ? `A and C put ${ab.W[m].inForms} of ${ab.n}` : `A puts ${ab.W.A.inForms} of ${ab.n} and C ${ab.W.C.inForms}`;
    /* one BM, said the way B reads it: the word, the other step it covers if any, and whether B's usual takes it */
    const say = (b) => {
      const dn = RU.dayName(b.d), day = dn === "Today" ? "today's" : dn === "Yesterday" ? "yesterday's" : dn.split(",")[0] + "'s";
      const w = L.WORDS[L.wordKey(b)], other = b.form != null ? w.types.find((k) => k !== b.form) : null, inB = L.inForms(M, b, "B");
      return `${day} ${T(b.t)} BM, ${b.form != null ? `step ${b.form}, which B calls ${w.word}${other != null ? `, a word that also covers step ${other}` : ""}` : `logged in B as ${w.word}`}, ${inB ? "inside" : "outside"} B's usual`;
    };
    const k = ab.diff.length, lead = ab.W.A.inForms === ab.W.B.inForms ? `The totals match, but ${k === 1 ? "one BM reads" : `${k} BMs read`} differently: ` : k === 1 ? "The difference is " : "The differences are ";
    return `This week ${ac} BMs within ${M.P.name}'s usual (${L.usualFormsText(M, m)}), and B puts ${ab.W.B.inForms} of ${ab.n} (${L.usualFormsText(M, "B")}). ${lead}${ab.diff.slice(0, 3).map(say).join("; ")}${k > 3 ? `, and ${k - 3} more` : ""}.`;
  };

  /* Will, Oct 14: show the extras, then decide which ones earn their place */
  const EXTRAS_Q = "Which extras stay? Shown under the form now (Will, Oct 14), so each one costs height, not a tap: Sudden urge to go, Had to strain, Didn't feel finished, Burning, How long (three steps), and the flag for blood, mucus or black. The flag stays for safety and urgency matters most for IBS-D; the rest are a call.";
  /* the patterns, said the way the notes need them */
  const patSay = (M, f) => {
    const R = L.patterns(M, f);
    if (!R.found.length) return "No possible patterns clear the bar for this person yet.";
    return `${M.P.name}: ${R.found.map((p) => `${p.kind === "late" ? "later dinners, later first BMs" : `${L.FOOD_NAMES[p.food][0].toLowerCase()}, then ${p.kind === "loose" ? "a looser first BM" : "bloating the next day"}`} (${p.hit} of ${p.n})`).join("; ")}.`;
  };
  /* a found food that clears the bar only with another found food's days in it */
  const rideAlong = (M, f) => {
    const fp = L.patterns(M, f).found.filter((p) => p.food);
    const ate = (d, food) => { const x = L.day(M, d); return !!x && x.entries.some((e) => e.kind === "meal" && (e.foods || []).includes(food)); };
    for (const p of fp) for (const q of fp) {
      if (p.kind !== q.kind || p.food === q.food) continue;
      const rest = p.occ.filter((o) => !ate(o.d - 1, q.food)), shared = p.n - rest.length, h = rest.filter((o) => o.hit).length;
      /* enough days without the other food to judge, and the pattern falls under the bar on those days */
      if (shared / p.n >= 0.3 && rest.length >= L.PATTERN_BAR.n && h / rest.length < L.PATTERN_BAR.rate) {
        const pn = L.FOOD_NAMES[p.food][0], qn = L.FOOD_NAMES[q.food][0].toLowerCase();
        return `${pn} clears the bar partly through ${qn}: they came together ${shared} of ${p.n} times, and without ${qn} the ${p.kind === "loose" ? "looser mornings" : "bloating"} came ${h} of ${rest.length} times. Hold back a food like this, or show it with a note?`;
      }
    }
    return "";
  };
  /* the summary's day count, read all three ways */
  const abDays = (M) => {
    if (!M.usual) return "";
    const k = (m) => { const F = L.span(M, 30, m); return { w: F.filter((x) => x.state === "usual").length, n: F.filter((x) => x.state === "usual" || x.state === "shifted").length }; };
    const r = { A: k("A"), B: k("B"), C: k("C") };
    const ac = r.A.w === r.C.w && r.A.n === r.C.n ? `A and C put ${r.A.w} of ${r.A.n}` : `A puts ${r.A.w} of ${r.A.n}, C ${r.C.w} of ${r.C.n},`;
    if (r.A.w === r.B.w && r.B.w === r.C.w && r.A.n === r.B.n && r.B.n === r.C.n) return `Over 30 days all three count ${r.A.w} of ${r.A.n} days within ${M.P.name}'s usual.`;
    return `The option moves the summary: over 30 days, ${ac} days within ${M.P.name}'s usual, and B ${r.B.w} of ${r.B.n}. A day with one BM outside the usual forms counts as shifted, and B's usual (${L.usualFormsText(M, "B")}) doesn't cover the same steps as A's (${L.usualFormsText(M, "A")}), so a day can sit inside one and outside the other.`;
  };
  const abMonthN = (M) => L.span(M, 30, "A").reduce((s, x) => s + x.bms.length, 0);
  const abMonthK = (M, m) => L.span(M, 30, m).reduce((s, x) => s + x.bms.filter((b) => L.inForms(M, b, m) === true).length, 0);
  const abMonth = (M) => {
    if (!M.usual) return "With a new person there's no usual yet.";
    const n = abMonthN(M), k = { A: abMonthK(M, "A"), B: abMonthK(M, "B"), C: abMonthK(M, "C") };
    /* the most common form, read each way: B's words can flip it */
    const top = (m) => { const c = {}; L.span(M, 30, m).forEach((x) => x.bms.forEach((b) => { const w = L.formKey(b, m); c[w] = (c[w] || 0) + 1; })); return (Object.entries(c).sort((a, b) => b[1] - a[1])[0] || [""])[0]; };
    const tA = top("A"), tB = top("B"), tC = top("C");
    const same = k.A === k.B && k.B === k.C, ac = k.A === k.C ? `A and C put ${k.A}` : `A puts ${k.A}, C ${k.C},`;
    const flip = tB && tC && tB !== tC ? ` The most common form reads differently${same ? "" : " too"}: ${tC} in C (${tA} in A), ${tB} in B, because B counts two steps as one word.` : "";
    const counts = same ? `Over 30 days all three put ${k.A} of ${n} BMs within ${M.P.name}'s usual.` : `Over 30 days, ${ac} of ${n} BMs within ${M.P.name}'s usual (${L.usualFormsText(M, "C")}), and B puts ${k.B} (${L.usualFormsText(M, "B")}).`;
    return `${same && !flip ? "A, B and C read this month the same." : "A, B and C read this month differently."} ${counts}${flip}`;
  };

  /* ---------- the Oct 14 workshop: what changed, and the calls ---------- */
  const WORKSHOP = {
    changed: [
      ["Plus menu", ["A close button, and a drag down closes it", "Tiles 44px wide with How to pick on the card, and a tile now logs the BM in one tap, with Add details and Undo", "Log for an earlier day, a week back, and Add to this day on a gap in History", "Log no BM today from 5 PM on the day"]],
      ["Log a BM", ["A third option, C: seven steps in our own words, no numbers. A and B stay to compare", "Our own words and marks for the seven steps. The first pass followed the scale's own descriptions", "B saves its word, never a step the person didn't pick, and each B word sits on the step C gives the same word", "The extras show under the form, all optional, as Will asked; blood, mucus and black stools are named on the flag", "The flag note offers a report for a clinician, an urgent care line and Undo"]],
      ["Log symptoms", ["One strength for the entry, how long it lasted, and when it started", "Low energy back, Burning moved to the BM, your own symptoms come back next time", "A symptom without a strength no longer reads as mild", "Fever, vomiting or blood typed into a note opens the primary care note"]],
      ["Log a meal", ["One food matcher for the seeded meals and for typing, with plurals and drinks", "The foods Florin counted show as you type", "Same as yesterday, and recent foods that add to the text", "The time follows the meal you pick; Other reads as Snack or drink"]],
      ["Weekly check-in", ["The chip and the band use one rule, so they can't disagree", "A taller trend with all four steps labelled, the first weeks named in words, and a table for screen readers", "The recall window in words, Next after an answer, and Change an answer", "Your logs this week above the answers; the clinician line and disclaimer at the end"]],
      ["Today", ["One sentence against the person's usual; the day chart is gone", "The week as three counts over seven-day strips, shifts as hollow Gold rings", "A next step from what today is missing", "The clinician line wherever symptoms show"]],
      ["Throughout", ["Sheets hold focus, a half-filled log is kept when closed, and focus returns after saving", "44px targets, Ink 2 for anything to read, no colour meaning more than one thing in dark", "No sideways scroll at any width"]]
    ],
    calls: [
      ["Types 1 to 7 (A), five words (B), or seven words (C)?", "C. Seven steps, one word each in our own words, no numbers or scale name in the app. The step is stored, so a clinician report can add the number once licensed. Send the Rome Foundation one request covering that export and IBS-SSS for the NSF study arm, and ship C once counsel has read its words and marks next to the scale.", "Built as C, A and B kept to compare; counsel to read C"],
      ["Tiles on the plus card?", "Yes, and a tile logs the BM in one tap, as Will's note asks. Undo and Add details sit in the toast. Catching up an earlier day, or a person's first few BMs, still open the form. Easy to switch back if you'd rather the form always opens.", "Built; needs your OK"],
      ["Check-in in plus every week, or only when due?", "Every week, last in the menu, with the dot only when it's due.", "Built"],
      ["A skipped check-in: stay skipped, or move to the next day?", "Stays skipped. One reminder only. One left alone (not skipped) stays on Today through Tuesday evening, then the week closes as a gap.", "Skip built; the Tuesday rule needs your OK"],
      ["The six symptoms?", "Bloating, Belly pain, Cramping, Gas, Nausea and Low energy, plus the person's own. Burning moves to the BM, where today's app used it.", "Built; needs your OK"],
      ["Black or tar-like on the flag?", "Yes, with its own line. Built with one more line for a lot of blood or feeling faint: get urgent care now. It goes beyond primary care first, so it needs the regulatory pass before it ships.", "Built; regulatory pass"],
      ["A FloraScore from manual logs?", "Yes, as Will asked on Oct 14: it ties Florin to the score people know from Oura. Built from four things people log (timing, how often, form, symptoms), blended over the last 3 logged days, so a day not logged is left out rather than scored as zero, and always read against the person's own usual range. When Florin One ships, gas readings join as a fifth part.", "Built; needs your OK on the four parts"],
      ["Check-in baseline: the first three answered check-ins?", "Yes. Later, offer a way to start fresh from the next three.", "Built"],
      ["BM or visit?", "BM. It's what today's app says. Keep visit for what Florin One detects. The studio's claims rule should suggest BM, not visits.", "Built here; the studio rule to change"],
      ["Which BM extras stay?", "All of them show under the form now, as Will asked on Oct 14, so each costs height, not a tap. Keep the flag for safety and Sudden urge to go for IBS-D. Burning and Didn't feel finished are the first to cut if the form feels long.", "Inline now; needs your call on which stay"],
      ["Fever, vomiting or blood typed into a note?", "It opens the same primary care note as a flagged BM, the way Ask Florin's alarm banner works. Florin never reads past naming the sign. Common phrases like blood pressure are left out.", "Built"],
      ["History: a tab, or under Today?", "A tab for now, doing what Today can't: catching up, and the report for a clinician. Revisit after Insights.", "Built"],
      ["A weekly report beyond the check-in?", "No. The saved check-in shows the week's logs above the answers.", "Built"]
    ]
  };
  const workshopHTML = () => `<div class="rx-ws-h"><p class="rx-eyebrow">Workshop · Oct 14</p><h2>What changed, and the calls</h2><p>Nine reviews of the first pass, by screen, brand and claims, accessibility and the open questions. Everything below is in the prototype now, except where a call says it needs your OK. Insights and the Ask hand-off came in from the second pass the same day; their questions sit in the notes beside each Insights screen. The report for a clinician is still a placeholder.</p></div>
      <div class="rx-ws-cols">
        <section aria-label="Calls"><h3 class="rx-h3">The calls</h3><ol class="rx-ws-calls">${WORKSHOP.calls.map(([q, r, s]) => `<li><b>${esc(q)}</b><p>${esc(r)}</p><span class="rx-ws-st${/OK|needs|counsel|regulatory|studio/i.test(s) ? " is-you" : ""}">${esc(s)}</span></li>`).join("")}</ol></section>
        <section aria-label="What changed"><h3 class="rx-h3">What changed</h3>${WORKSHOP.changed.map(([g, items]) => `<div class="rx-ws-g"><b>${esc(g)}</b><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}</section>
      </div>`;

  /* the quick meal log's notes */
  const MEAL_QUICK = (M) => {
    const PR = L.patterns(M, "C");
    return {
      t: "What you ate, said or typed",
      lede: "Will, Oct 14: meal logging happens when things feel off, so it has to be as quick as saying it. One big voice button and one box for the whole day. Florin picks out the foods as the words land. The prototype plays a sample in place of the microphone; in the app it's the phone's own dictation.",
      ba: [
        ["Pick a meal, type it, set a time", "Say the whole day in one go, or type it in one box. The day is enough; no times"],
        ["A dinner nudge every evening", "No nudge for a missing meal. A symptom logged today invites what you ate"],
        ["Patterns read from rough days only", `Under ${Math.round(L.MEAL_COVER * 100)}% of days with a meal, patterns are held back and a ${L.FOOD_CHECK_DAYS}-day food check is offered`]
      ],
      open: [
        "One line for the day loses meal times, so the later-dinner pattern can't be read from it. Keep the one-meal sheet a tap away for people who want times, or drop times altogether?",
        M.usual ? (PR.sparse ? `With these meal logs ${M.P.name} has meals on ${PR.withMeal} of ${PR.logged} days, so Insights holds patterns back and offers the food check.` : `With meals every day, ${M.P.name}'s logs find ${PR.found.length} possible ${PR.found.length === 1 ? "pattern" : "patterns"}. Switch Meal logs to Rough days only to see what happens when people log only when things feel off.`) : "",
        "Food check: 14 days, one line a day, good days too, then Insights reads it. Membership, or for everyone?"
      ].filter(Boolean),
      res: ["Oura shows a Discovery only after a tag is used about 5 to 40 times.", "Logging only on rough days can make ordinary foods look like triggers: every meal day is a rough day. In testing, Sarah's logs named toast this way."]
    };
  };
  const NOTES = {
    today: (M) => ({
      t: "Today",
      lede: "Today opens on FloraScore: the studio's Forest card with the Ray ring, the usual range drawn on the ring, 30 days under it, and the day's one sentence. Then the check-in when it's due, the day's entries, and the week as three plain counts.",
      ba: [
        ["A FloraScore over a lake photo, with a progress bar", "FloraScore from the logs, on the ring with the person's usual range, and one sentence read against their usual window"],
        ["A week strip with a ring for each day you logged", "Three counts in plain words (BMs, first BM, symptoms), each over a seven-day strip. A gap is marked on its day, never as a zero"],
        ["A generic daily tip about 8 glasses of water", "No tips. One next step from what today is missing, like a dinner not logged yet"],
        ["First pass: a 6 AM to midnight chart above the list", "Cut. It repeated the list, and the list is the one timeline"]
      ],
      open: [M.usual ? `FloraScore is back (Will, Oct 14), built from four things people log: timing, how often, form and symptoms. ${M.P.name} is at ${(L.score(M, L.TODAY, "C") || {}).value} today against a usual range of ${(L.scoreUsual(M, "C") || []).join(" to ")}. A day not logged is left out, never scored as zero. Are those the right four?` : `New people see the ring fill by day until day ${L.LEARN_DAYS}, then their first FloraScore. Right wait?`, "The check-in card sits second on the evening it's due, then folds to one line once done. Right place?", "Does History stay a tab, or move under Today?"],
      res: ["Oura's Today: one daily highlight, then a timeline you can add to.", "Function leads with summary counts in plain terms. Each row here leads with its count.", "Oura waits up to 2 weeks before judging anything. Switch Logs to New, day 5 to see the learning state."]
    }),
    plus: () => ({
      t: "The plus menu",
      lede: "Plus opens a short menu. BM comes first and largest, with the tiles right on it: a usual BM is plus, then a tile, saved at once with Add details and Undo in the toast. A person's first few BMs, or a catch-up day, open the form instead.",
      ba: [
        ["Plus opened one long BM form with symptoms attached", "A menu: BM, Symptoms, Meal, and the weekly check-in"],
        ["Logging a symptom meant logging a BM", "Symptoms log on their own"],
        ["An empty day read as missing data", "Log no BM today, from 5 PM on the day, or any time for an earlier day"],
        ["A missed day stayed missed", "Log for an earlier day: pick the day, then log as usual. History offers the same on a gap"]
      ],
      open: ["Tiles on the menu card (built here), or only inside Log a BM?", "The check-in sits in the menu every week, with a dot only when it's due. The brief had it there only when due."],
      res: ["Bellyx claims 2 taps; Stool Log, a few.", "CareClinic records several entries in one catch-up session.", "Throne's guidance: log the days with no BM.", "Logging from a widget or the watch without opening the app is a good next step after this."]
    }),
    earlier: () => ({
      t: "Log for an earlier day",
      lede: "Catching up: pick the day, and plus logs everything there. A day with nothing logged is tagged, so the gaps are easy to find.",
      ba: [["Three days back, inside each form", "A week back from plus, a week back in each form's day picker, and Add to this day on any gap in History"]],
      open: [],
      res: ["CareClinic records several BMs and symptoms in one catch-up session."]
    }),
    bm: (M, f) => f === "B" ? ({
      t: "Log a BM · B, five words",
      lede: "Today's five words as tiles, without the slider. Each word sits on the step C gives it, so Hard covers steps 1 and 2 and Loose covers 5 and 6. A B log keeps its word and can't say which step.",
      ba: [
        ["A slider from Hard to Watery", "Five tiles: Hard, Firm, Formed, Loose, Watery"],
        ["First pass: B saved a step the person never picked", "B saves its word. Seen through A it reads Loose (Type 5 or 6); through C, Loose (Soft or loose)"],
        ["Ten symptom pills on every BM", "Moved to Log symptoms. Urgency, straining, how long and blood or mucus show under the form, all optional"],
        ["Bloody and Mucus as symptom pills", "A flag that shows a clinician note after saving, never a reading of it"]
      ],
      open: ["B has no licensing question, but its five words merge 1 with 2 and 5 with 6. The line between 5 and 6 is the one that matters most for IBS-D.", abLine(M, f), EXTRAS_Q],
      res: ["A clinical reviewer criticised Bowelle's own 1 to 5 scale for not matching the 1 to 7.", "Throne: record the type number, not a description."]
    }) : f === "A" ? ({
      t: "Log a BM · A, types 1 to 7",
      lede: "Seven tiles, harder to looser, each with its number and a word. Shipping A means licensing the scale and using its own wording; the words here are stand-ins.",
      ba: [
        ["Four sliders: consistency, duration, odor, completeness", "Seven tiles, then the extras right under them, all optional"],
        ["Odor", "Dropped. It was a sensor-era field"],
        ["Ten symptom pills on every BM", "Moved to Log symptoms. The BM keeps a note"],
        ["First pass: lines that followed the scale's own descriptions, and bare numbers on the tiles", "Our own words from two cues, how firm and how many pieces, our own marks, and a word on every tile"]
      ],
      open: ["A means licensing the scale from the Rome Foundation, then its own wording, word for word, in place of these.", abLine(M, f), EXTRAS_Q],
      res: ["Throne: record the type number. Urgency, straining and not feeling finished as three separate items.", "GutLog keeps its visual guide behind an (i) instead of crowding the picker."]
    }) : ({
      t: "Log a BM · C, seven words (proposed)",
      lede: "C keeps A's seven steps and B's plain words: one word per step, no numbers and no scale name in the app. The step is stored, so a clinician report can add the number once it's licensed.",
      ba: [
        ["A: numbers a first-timer has to learn", "A word on every tile"],
        ["B: five words that merge two pairs of steps", "Seven words, one per step, so the loose end can be counted"],
        ["Today's five-word logs", "Carry over as one or two steps: Hard is 1 or 2, Loose is 5 or 6"],
        ["Four sliders, odor and ten pills", "Seven tiles, the extras under them, symptoms on their own"]
      ],
      open: ["Recommended. Send the Rome Foundation one request covering a licensed export and IBS-SSS for the NSF study arm.", "Ask counsel to read C's words, lines and marks next to the scale before it ships. They describe the same seven forms in our own words; whether that needs the licence is their call.", abLine(M, f), EXTRAS_Q],
      res: ["Throne: record the type number. C stores it, and shows a word.", "A clinical reviewer criticised Bowelle's own 1 to 5 scale for not matching the 1 to 7. C matches it step for step."]
    }),
    guide: (M, f) => ({
      t: "How to pick",
      lede: "The tiles stay small because the full lines live here, one tap from the form.",
      ba: [["A slider with five labels and no explanation", "Every option with one plain line, in our own words"]],
      open: f === "A" ? ["Shipping A means the scale's own wording, word for word, under licence. These lines are stand-ins."] : [],
      res: ["GutLog keeps its visual guide behind an (i)."]
    }),
    flag: () => ({
      t: "After a flagged log",
      lede: "Saved with blood, mucus or a black stool, or with an alarm word typed into a note, the log gets a note: primary care first, with a report to bring. Florin never reads it.",
      ba: [
        ["Bloody and Mucus as symptom pills, with nothing after", "Primary care first, a report to bring, and Undo for a mis-tap. Teal, never red"],
        ["Fever or vomiting typed into a note went unnoticed", "The same note opens when a log names an alarm feature, on a BM or a symptom"]
      ],
      open: ["Make a report opens Ask Florin on the clinician path with this log loaded. That lands with the chat, in the next pass."],
      res: ["DESIGN.md: the alarm banner names the sign, sends the person to primary care first and never uses red.", "Throne: flag blood or mucus every time."]
    }),
    nobm: () => ({ t: "No BM today", lede: "Logged on purpose, so an empty day isn't read as missing data. Logging a BM later replaces it.", ba: [["No way to say nothing happened", "From 5 PM on the day (plus, or Today), or any time for an earlier day"]], open: [], res: ["Throne's guidance says to log no-BM days explicitly. GutLog has a journal for them."] }),
    sym: () => ({
      t: "Log symptoms",
      lede: "Symptoms log on their own: pick any, then one strength for the entry and how long it lasted. Both are optional. The time is when it started.",
      ba: [
        ["Ten pills on every BM, stool words mixed in", "Six body symptoms, plus your own, which stay one tap away next time"],
        ["No strength or duration", "How strong at its worst, and how long it lasted, as chips"],
        ["First pass: a strength row for every symptom", "One strength for the entry. Will asked for one or two follow-ups"],
        ["No word on when to see someone", "The clinician line at the bottom, and an alarm word typed in opens the primary care note"]
      ],
      open: ["Is this the right six? Bloating, Belly pain, Cramping, Gas, Nausea and Low energy. Gas and Nausea are new. Burning moved to the BM's details, where today's app used it. Urgency is a BM detail. Greasy or oily is dropped for now."],
      res: ["Stool Log keeps every extra optional.", "The only slider found was research grade, and people found it heavy."]
    }),
    meal: (M) => P.mealUI !== "detailed" ? MEAL_QUICK(M) : ({
      t: "Log a meal",
      lede: "Pick the meal, then type what you had. Florin shows the foods it counted as you type, so a missed word is visible. Recent foods add to the text, and the time follows the meal you pick.",
      ba: [
        ["Meal times only, as context", "Breakfast, Lunch, Dinner or Other, then free text"],
        ["First pass: recent meals replaced what you typed", "Same as yesterday in one tap, and recent foods that add to the text"],
        ["First pass: two ways of counting foods that disagreed", "One matcher for the seeded meals and for what you type, plurals and drinks included"],
        ["First pass: a breakfast logged at 7:40 PM kept 7:40 PM", "Picking a meal moves the time to when you usually have it, until you set it"]
      ],
      open: ["Other stays Other on its chip, as Will wrote it, and reads as Snack or drink everywhere else. OK?"],
      res: ["Oura shows a Discovery only after a tag is used about 5 to 40 times.", "Manual logs are sparse: gate patterns on repeats and say possible pattern."]
    }),
    ck: () => ({
      t: "Weekly check-in",
      lede: "Four questions and an optional note, in our own words, answered with chips. About a minute. It never blocks logging or Insights.",
      ba: [
        ["The weekly report forced through symptom tracking, and on every Insights visit", "A card on Today when it's due, one reminder, and an item in plus"],
        ["Sliders", "Four answers per question. A tap moves on, and Next appears once you've answered"],
        ["Clinical wording and a score", "Compared only with the person's own first three check-ins. No score, no severity labels"]
      ],
      open: ["A skipped check-in stays skipped, and stays in plus. Or should it move to the next day?", "If the NSF pilot needs a validated measure, license IBS-SSS from the Rome Foundation and use it word for word in the study arm only."],
      res: ["IBS-SSS recalls about 10 days on 0 to 100 lines and is on the Rome Foundation's licence list, so nothing here borrows its wording, its lines or its sum.", "Nerva checks in at the start, weekly and at the end."]
    }),
    ckdone: () => ({
      t: "Check-in saved",
      lede: "Each answer next to the person's first three weeks, with a 13-week trend. Plum means about the same; Gold means it moved, either way, and the chip's words say which.",
      ba: [
        ["Improving, Worsening, Resolved", "Less than, more than, or about the same as your first weeks"],
        ["First pass: a chip and a band that could disagree", "One rule for both: inside the first weeks' range reads as about the same"],
        ["A mis-tap was final", "Change an answer, until next week's check-in opens"]
      ],
      open: ["Is a weekly report, Oura style, worth having beyond this?", "Never add the four answers into one weekly number: a composite would read as a scored scale."],
      res: ["No red, no pass or fail. Function's out of range and Oura's red Pay attention can alarm people."]
    }),
    ckday: () => ({ t: "When it's due", lede: "Sunday evening by default. The person picks the day and morning or evening, and gets one reminder. The questions always cover the 7 days that end on that day.", ba: [["Due whenever you opened Insights", "Due once a week, on a day you choose"]], open: [], res: ["Oura's Advisor: opt-in check-ins at a frequency and time the person picks."] }),
    history: () => ({ t: "History (basic)", lede: "Every kind of entry in one list, newest day first. A gap stays a gap, with Add to this day for catching up. Not workshopped yet.", ba: [["Consistency in green, brown and yellow, with odor", "The same rows as Today, in neutral ink"]], open: ["Does History stay a tab, or move under Today?"], res: ["CareClinic lets people catch up on several entries in one go."] }),
    insights: (M, f) => ({
      t: "Insights",
      lede: M.usual ? "A summary in the person's terms, then one card per question: timing, how often, form, symptoms, the weekly check-in and possible patterns. Each card says the usual in words, then a count, then the chart. The chevron opens the detail; Ask about this opens chat with the card's numbers." : "The learning state: counts only, no band and no Gold, until day 14. Patterns wait for 5 logs of a food.",
      ba: [
        ["Insights forced the weekly report on every visit", "The check-in is one card with its trend. It never blocks Insights"],
        ["FloraScore, VOC and duration tiles from the sensor", "Only what the person logs: timing, how often, form, symptoms, check-ins and meals"],
        ["The studio's 24-hour clock for timing", "A morning strip from the data vis board: one dot per morning on a straight time axis"],
        ["Patterns from synced sleep and workouts", "Patterns from logged meals, only after a food comes up 5 times"]
      ],
      open: [
        "A day counts as within your usual when the first BM landed in the window, the count was usual and every form was within the usual. A word logged in B that could sit either side counts on neither, and so does a day with only symptoms or meals logged. Symptoms are counted on their own card. Right definition?",
        M.usual ? `Symptoms have no band: their usual is how often they came up in the same weeks as the other usuals, ${RU.spanText(28, 83)}${M.usual.sym.every ? ` (about 1 day in ${M.usual.sym.every} for ${M.P.name})` : ""}. Enough, or no usual for symptoms at all?` : `Symptoms have no band: their usual will be how often they come up in the person's first ${L.LEARN_DAYS} days of logs. Enough, or no usual for symptoms at all?`,
        "Patterns use the last 90 days whatever the range. 30 days of manual logs named a food by chance in testing (Alex, pasta, 5 of 5), so the bar is a binomial test at 1 in 100 against other days.",
        patSay(M, f),
        rideAlong(M, f),
        abDays(M)
      ].filter(Boolean),
      res: ["Function opens on summary counts, in range and out of range, with a pending state. The summary card does the same, in the person's terms.", "Oura's Vitals: one card per metric with the personal baseline, a down-arrow for what shaped it, a side-arrow into the detail.", "Oura waits up to 2 weeks before judging anything. Switch Logs to New, day 5 to see the learning state.", "Oura shows a Discovery only after a tag is used about 5 to 40 times, as one plain sentence."]
    }),
    pay: (M) => ({
      t: "Florin membership",
      lede: "The paywall, from wherever a member feature was tapped: a title for that feature, what membership adds in five lines, and the price as the studio has it, set at launch. Logging, Today, FloraScore, the weekly check-in and 7 days of Insights stay free.",
      ba: [
        ["Everything free, with no plan for paying", "A free app that logs and shows today, and a membership that explains"],
        ["A paywall in front of logging", "Logging is never behind the paywall: without logs there's nothing to explain"],
        ["Sample answers and fake data as a teaser", "Teasers show the person's own counts (how many patterns, the score's parts) blurred, never made-up content"]
      ],
      open: [
        "Where's the line? Built: FloraScore today and its 30-day line are free; why it moved is membership. Insights is free at 7 days; 30 and 90 days, the detail pages, possible patterns, the food check, Ask Florin and the clinician report are membership.",
        "Is the clinician report membership? It's the thing a person with alarm features most needs. Consider keeping a basic report free.",
        "The studio's membership page lists app features without membership as to be decided. This is a first proposal for it."
      ],
      res: ["Studio membership page: a daily FloraScore, patterns, guided food trials, doctor reports and Apple Health sync. Price set at launch.", "Oura: a score up front, with contributors and trends you can open."]
    }),
    "i-score": (M, f) => ({
      t: "FloraScore, the detail",
      lede: "The studio's FloraScore detail on manual logs: today on the ring with the usual range, where today sits in the last 90 days, the trend, what moved it this week, the four parts, and how it works, with the line that it isn't a medical score.",
      ba: [
        ["A score from gas readings only, or no score at all", "Four parts from what people log: timing 30%, how often 25%, form 25%, comfort 20%, the studio's weights"],
        ["A day without logs scored as zero", "Left out. Fewer than 2 logged days in the last 3 means no score that day, said in words"],
        ["Optimal, Good, Fair, Pay attention", "Within, a little above, or below your usual range. No grades, no red"]
      ],
      open: [M.usual ? `The option changes the score through Form: ${["A", "B", "C"].map((m) => `${m} ${(L.score(M, L.TODAY, m) || {}).value}`).join(", ")} today for ${M.P.name}. Fine, or score Form on steps only?` : "", "Comfort counts a symptom logged without a strength like the lightest one. Right?", "When Florin One ships, gas readings join as a fifth part. Keep the four weights as they are, or rebalance then?"].filter(Boolean),
      res: ["FloraScore was a must-have for 44% of people spending $200+ a year on gut health, and for 40% of women (studio research).", "Oura: a score up front, contributors you can open, and up to 2 weeks of learning before it judges anything."]
    }),
    "i-timing": (M) => ({
      t: "Timing, the detail",
      lede: "The detail template: the typical value and today against the usual, range tabs, the main chart, a second chart, What shaped this folded away, Ask about this, the table, and Next to move on.",
      ba: [["A 24-hour clock with visits spiralling out", "The morning strip, with the window named under the axis, and every BM by day below it"], ["Visit duration from the sensor", "Not logged by hand any more, so not charted"]],
      open: ["Next steps through the cards like Oura's swipe. Is a Next button enough, or should detail pages swipe?", M.usual ? "Late-dinner days are flagged in Teal (context), not Plum: on the board, Plum is reserved for your usual." : "No window until day 14."],
      res: ["Oura's detail: the current value large, the average beside it, a Day, Week, Month toggle.", "Function's detail page got called a wall of text, so What shaped this is folded by default."]
    }),
    "i-often": (M) => ({
      t: "How often, the detail",
      lede: "Bars from zero over the usual band. Gold for a day outside it, a Gold ring for a day logged as No BM, a faint column for a day with nothing logged.",
      ba: [["An empty day read as zero", "A gap stays a gap. Only No BM counts as zero"]],
      open: [(() => {
        const f = L.facts(M, L.day(M, L.TODAY), "C");
        if (f.pending) return "Nothing is logged today yet, so today stays out of the averages until it has a log. Once it does, it counts as far as it has gone. Fine, or leave today out until it ends?";
        if (f.count === 0) return `Today is logged as No BM so far, so it counts as a zero until a BM is logged. Fine, or leave today out of averages until it ends?`;
        if (f.count == null) return "Today has logs, but nothing about BMs yet, so it's left out of the averages, never counted as zero. Fine?";
        return `Today counts as far as it has gone (${f.count === 1 ? "one BM" : `${f.count} BMs`} by ${T(L.NOW)}). Fine, or leave today out of averages until it ends?`;
      })()],
      res: ["Throne's guidance: log the days with no BM, so they're not read as missing."]
    }),
    "i-form": (M, f) => ({
      t: `Form, the detail · ${L.MODES[f]}`,
      lede: "The mix as a histogram with the usual as a bracket under the axis, then each BM by day with the usual forms as the band. A and C chart steps; B charts words.",
      ba: [["A consistency slider average", "The mix, and every BM, against the person's own usual forms"], ["First take: a B log forced onto one type", "A word logged in B sits between its two steps, hollow when it could be either"]],
      open: [abMonth(M), "Should Form show the first BM of the day only, or every BM (built: every BM)?"],
      res: ["GI apps chart stool type over 7, 30 and 90 days.", "Throne: record the type number, not a description. C stores it and shows a word."]
    }),
    "i-sym": () => ({
      t: "Symptoms, the detail",
      lede: "Dot rows: a dot only on the days a symptom came up, bigger and darker when stronger, faint columns for days with nothing logged. Then each symptom against the stretch before, and when to see a clinician.",
      ba: [["A heat map of four check-in feelings", "Dot rows for the symptoms the person logged, with a count under each name"], ["Improving or worsening", "More often, less often or about the same. Gold either way"], ["A symptom logged without a strength read as mild", "Its dot is the smallest, and its label says strength not said"]],
      open: ["Seven days switch to cells (one Forest step per strength). Keep both, or dot rows everywhere?"],
      res: ["The data vis board's symptom rows.", "DESIGN.md: the clinician note is Teal, primary care first, never red."]
    }),
    "i-ck": (M) => ({
      t: "Weekly check-in, the detail",
      lede: `The latest week next to the first three check-ins, each question with its 13-week trend.${M.checkin.status === "due" ? " This week's is due tonight, so the button starts it." : ""}`,
      ba: [["The weekly report forced through symptom tracking", "Its own card and trend. Answered from Today, the plus menu or here"]],
      open: ["Is a weekly report, Oura style, worth having beyond this?"],
      res: ["Oura's weekly report is a dismissible Today card, archived under Reports."]
    }),
    "i-pat": (M, f) => ({
      t: "Possible patterns",
      lede: "Every pattern that clears the bar, the foods checked with nothing standing out, and the foods still short of 5 logs, with how the bar works.",
      ba: [["Patterns from sensor reads, synced sleep and workouts", "From meals and dinner times the person logged"], ["Early signal, from a few examples", "Dropped: with the 5-log gate a pattern starts at Showing up often"]],
      open: [patSay(M, f), rideAlong(M, f), "Name a food on Showing up often (5 or more), or wait for Consistent (8 or more)?"].filter(Boolean),
      res: ["Oura's Discoveries: only after 5 to 40 uses of a tag, with a caveat that one may not hold for you.", "Manual logs are sparse: gate on repeats and say possible pattern, or the coach overclaims."]
    }),
    "i-pattern": () => ({
      t: "One possible pattern",
      lede: "One dot per time the condition came up, filled when it held, next to the same count for every other day. Then the pattern over time, seen together not proof, and a way to test it.",
      ba: [["A strength meter and a sentence", "Count dots for both groups, so the comparison is the picture"]],
      open: ["What you could try never says avoid. Right tone for a food the person enjoys?", "Late-dinner patterns use dinner times, so they need dinner logged on both kinds of evening."],
      res: ["Oura frames Discoveries as yours, and says one may not hold for you. Florin says seen together, not proof."]
    }),
    ask: () => P.plan === "free" ? ({
      t: "Ask Florin, free plan",
      lede: "On the free plan Ask Florin is a page about what it does, the questions people ask, and the way into membership. No sample answer: it would have to be made up.",
      ba: [["A chat open to everyone, or hidden entirely", "Its own tab either way; on the free plan, the tab explains it"]],
      open: ["Offer one free question a week, so people see an answer from their own numbers before paying?"],
      res: ["Oura Advisor sits inside the membership."]
    }) : ({
      t: "Ask Florin",
      lede: "Its own tab. Chat is the next pass; this pass builds the way in: questions to start, and the composer.",
      ba: [["A coach with a doctor's title", "Ask Florin, never a doctor's title"]],
      open: ["Which starting questions on the plain tab?"],
      res: ["Oura Advisor: memories the person can see and delete, opt-in check-ins, charts in answers."]
    }),
    "ask-about": () => ({
      t: "Ask about this",
      lede: "Every Insights card and detail has Ask about this. It opens the Ask tab with that card's numbers loaded, so chat starts from the same figures as the chart, plus three questions to start.",
      ba: [["Chat that may not match the screen", "The same numbers as the chart, loaded with it"]],
      open: ["The answers come next. The coach test bench rules carry over: answer first, one bold question per turn, options about one turn in three, an alarm feature routes to primary care."],
      res: ["Oura admits Advisor's data may not always match the app. Loading the card's numbers avoids that."]
    })
  };

  /* the list of screens beside the phone */
  const SCREENS = [
    ["Logging", [["plus", "Plus menu"], ["earlier", "Log for an earlier day"], ["bm", "Log a BM"], ["compare-bm", "Log a BM, A, B and C side by side"], ["bm-details", "Log a BM, details filled in"], ["guide", "How to pick (i)"], ["flag", "After a flagged BM"], ["sym", "Log symptoms"], ["meal", "Log what you ate"], ["meal-voice", "What you ate, said"]]],
    ["Weekly check-in", [["ck-card", "The card on Today"], ["ck", "First question"], ["ck-last", "Last question"], ["ckdone", "Saved"], ["ckday", "When it's due"]]],
    ["Insights", [["insights", "Insights"], ["i-score", "FloraScore"], ["i-timing", "Timing"], ["i-often", "How often"], ["i-form", "Form"], ["i-sym", "Symptoms"], ["i-ck", "Check-in trend"], ["i-pat", "Possible patterns"], ["i-pattern", "One pattern"], ["ask-about", "Ask about this"]]],
    ["Membership", [["pay", "The paywall"], ["free-insights", "Insights, free"], ["free-ask", "Ask Florin, free"]]],
    ["Tabs", [["today", "Today"], ["history", "History, basic"], ["ask", "Ask Florin"]]]
  ];
  const keyToScreen = (k) => ({ today: "today", plus: "plus", earlier: "earlier", bm: "bm", guide: "guide", flag: "flag", sym: "sym", meal: "meal", "meal-voice": "meal", ck: "ck", ckdone: "ckdone", ckday: "ckday", history: "history", insights: "insights", ask: "ask", "ask-about": "ask-about", nobm: "today", "i-score": "i-score", pay: "pay", "i-timing": "i-timing", "i-often": "i-often", "i-form": "i-form", "i-sym": "i-sym", "i-ck": "i-ck", "i-pat": "i-pat", "i-pattern": "i-pattern" }[k] || "today");

  /* ====================================================================== */
  /* THE PAGE                                                                */
  /* ====================================================================== */
  const sysDark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const pageTheme = () => { const a = document.documentElement.getAttribute("data-theme"); return a === "dark" || a === "light" ? a : sysDark() ? "dark" : "light"; };
  const P = {
    form: ["A", "B", "C"].includes(store.get("form", "C")) ? store.get("form", "C") : "C",
    compare: !!store.get("compare", false),
    persona: "sarah",
    data: "est",
    meals: "all",
    mealUI: "quick",
    plan: "member",
    themeSet: null,
    key: "today",
    phones: []
  };
  const appTheme = () => P.themeSet || pageTheme();

  const seg = (name, opts, cur) => `<div class="rx-seg" role="group" aria-label="${esc(name)}">${opts.map(([v, l]) => `<button type="button" data-rx="${esc(name)}" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join("")}</div>`;
  const demoControls = () => `
      <div class="rx-ctl"><span class="rx-ctl-l">Person</span>${seg("persona", Object.values(AD.personas).map((p) => [p.id, p.name]), P.persona)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">Logs</span>${seg("data", [["est", "12 weeks"], ["new", "New, day 5"]], P.data)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">Meal logs</span>${seg("meals", L.MEAL_LOGS, P.meals)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">Meal sheet</span>${seg("mealUI", [["quick", "Quick, voice or text"], ["detailed", "One meal at a time"]], P.mealUI)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">Plan</span>${seg("plan", [["member", "Member"], ["free", "Free"]], P.plan)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">App theme</span>${seg("theme", [["light", "Light"], ["dark", "Dark"]], appTheme())}</div>
      <button type="button" class="rx-btn rx-btn--line" data-rx="reset">${ic("undo")}Reset the demo</button>
      <p class="rx-small">Demo time is Sunday, October 11, 7:40 PM: the check-in is due tonight. Logs you add stay until you reset or reload.</p>`;
  const screenList = () => SCREENS.map(([g, items]) => `<li class="rx-nav-g"><span class="rx-eyebrow">${esc(g)}</span><ol>${items.map(([id, l]) => `<li><button type="button" class="rx-nav-b" data-rx="screen" data-v="${id}">${esc(l)}</button></li>`).join("")}</ol></li>`).join("");

  mount.innerHTML = `
    <header class="rx-head">
      <div class="rx-head-l">
        <p class="rx-eyebrow">Florin app refresh · Second pass · Oct 14</p>
        <h1>Logging, Today and Insights</h1>
        <p class="rx-lede">Today's app, the one that ships without hardware. Tap through it like the app: plus logs a BM, symptoms or a meal, the weekly check-in never blocks anything, and Insights reads it all against the person's own usual. Consistency comes three ways: A and B as briefed, and C, the seven words the workshop proposes.</p>
      </div>
      <div class="rx-head-r" role="group" aria-label="Consistency">
        <span class="rx-ctl-l">Consistency</span>
        <div class="rx-ab">${seg("form", [["A", L.MODES.A], ["B", L.MODES.B], ["C", L.MODES.C]], P.form)}<button type="button" class="rx-btn rx-cmp" data-rx="compare" aria-pressed="${P.compare}">${ic("bars")}Compare all three</button></div>
      </div>
    </header>
    <div class="rx-main">
      <aside class="rx-side rx-side--l" aria-label="Screens and demo">
        <nav class="rx-panel" aria-label="Screens"><h2 class="rx-h">Screens</h2><ol class="rx-nav">${screenList()}</ol></nav>
        <div class="rx-panel"><h2 class="rx-h">Demo</h2><div class="rx-demo">${demoControls()}</div></div>
      </aside>
      <div class="rx-center">
        <div class="rx-stage" id="rxStage"></div>
        <section class="rx-cmpt" id="rxCmp" hidden aria-label="A, B and C compared"></section>
        <section class="rx-ws" id="rxWs" aria-label="The Oct 14 workshop">${workshopHTML()}</section>
      </div>
      <aside class="rx-side rx-side--r" aria-label="Notes for this screen"><div class="rx-panel rx-notes" id="rxNotes"></div></aside>
    </div>
    <footer class="rx-foot"><span>Built on the brand studio: DESIGN.md v1.1 tokens, the chart kit and the seeded demo data.</span><span>Prototype only. Not for patients.</span></footer>
    <div class="rx-mbar" role="group" aria-label="Prototype">
      <span class="rx-mbar-t">Florin refresh</span>
      ${seg("form", [["A", L.MODES_SHORT.A], ["B", L.MODES_SHORT.B], ["C", L.MODES_SHORT.C]], P.form)}
      <button type="button" class="rx-mbar-b" data-rx="msheet" aria-label="Screens and notes">${ic("list")}<span>Notes</span></button>
    </div>
    <div class="rx-msheet" id="rxMsheet" hidden>
      <div class="rx-msheet-scrim" data-rx="msheet-close"></div>
      <div class="rx-msheet-p" role="dialog" aria-modal="true" aria-label="Screens and notes">
        <div class="rx-msheet-h"><b>Florin app refresh</b><button type="button" class="rx-x" data-rx="msheet-close" aria-label="Close">${ic("close")}</button></div>
        <div class="rx-panel rx-notes" id="rxNotesM"></div>
        <div class="rx-panel rx-ws rx-ws--m">${workshopHTML()}</div>
        <div class="rx-panel"><h2 class="rx-h">Screens</h2><ol class="rx-nav">${screenList()}</ol></div>
        <div class="rx-panel"><h2 class="rx-h">Demo</h2><div class="rx-demo">${demoControls()}</div></div>
      </div>
    </div>`;

  const stage = mount.querySelector("#rxStage"), cmp = mount.querySelector("#rxCmp");
  const mq = window.matchMedia("(max-width: 759px)");
  const isM = () => mq.matches;

  /* ---------- the phones ---------- */
  function phoneShell(tag) {
    const w = document.createElement("div");
    w.className = "rx-ph";
    w.innerHTML = `${tag ? `<p class="rx-ph-tag"><b>${esc(tag.split(" · ")[0])}</b>${esc(tag.split(" · ")[1] || "")}</p>` : ""}<div class="rx-fit"><div class="apx-device rx-dev"><div class="apx-phone" aria-hidden="true"></div><div class="apx-screen"><div class="rx-mount"></div></div></div></div>`;
    return w;
  }
  function onNav(k, ph) {
    if (!P.phones.includes(ph)) return; /* still being built; build() catches up */
    if (ph !== P.phones[0]) { if (P.compare) compareTable(); return; }
    P.key = k;
    notes();
    syncNav();
    if (P.compare) compareTable();
  }
  function build() {
    stage.innerHTML = "";
    P.phones = [];
    const compare = P.compare && !isM();
    const forms = compare ? ["A", "B", "C"] : [P.form];
    forms.forEach((f, i) => {
      const sh = phoneShell(compare ? L.MODES[f] : null);
      stage.appendChild(sh);
      const ph = Phone(sh.querySelector(".rx-mount"), { form: f, persona: P.persona, data: P.data, meals: P.meals, mealUI: P.mealUI, plan: P.plan, theme: appTheme(), onNav: (k, p) => onNav(k, p), onPlan: (v, then) => setPlanAll(v, then) });
      P.phones.push(ph);
      ph.setFull(isM());
      ph.el.setAttribute("aria-label", compare ? `Option ${f}` : "Florin app prototype");
    });
    mount.classList.toggle("is-compare", compare);
    mount.classList.toggle("rx--m", isM());
    cmp.hidden = !compare;
    if (compare) P.phones.forEach((p) => p.open("bm"));
    fit();
    P.key = P.phones[0].key();
    notes();
    syncNav();
    if (compare) compareTable();
    syncControls();
  }

  /* scale the phone to the space it has, never above 1 */
  function fit() {
    const devs = [...stage.querySelectorAll(".rx-fit")];
    if (isM()) { devs.forEach((f) => { f.style.width = ""; f.style.height = ""; f.firstElementChild.style.transform = ""; }); return; }
    const n = devs.length;
    const avW = (stage.clientWidth - (n - 1) * 32 - n) / n; /* a pixel of slack per phone, so rounding never wraps one */
    const avH = Math.max(560, window.innerHeight - (P.compare ? 72 : 40));
    /* never below 0.78 in compare: past that the tile words get too small to compare, so the third phone wraps */
    const s = n > 1 ? Math.max(0.78, Math.min(1, avW / 414, avH / 868)) : Math.min(1, avW / 414, avH / 868);
    devs.forEach((f) => {
      f.style.width = `${Math.round(414 * s)}px`;
      f.style.height = `${Math.round(868 * s)}px`;
      f.firstElementChild.style.transform = s < 1 ? `scale(${s.toFixed(4)})` : "";
    });
  }

  /* ---------- notes, the screen list and the compare table ---------- */
  function notes() {
    const ph = P.phones[0];
    if (!ph) return;
    const k = P.key, f = ph.form(), M = ph.model();
    const N = (NOTES[k] || NOTES.today)(M, f);
    /* disclaimers are left out of the scan, as in the studio: they name what Florin doesn't do on purpose */
    const src = ph.el.querySelector(".ap-o:not(.is-out):last-child .ap-o-p") || ph.el.querySelector(".ap-layer");
    const clone = src.cloneNode(true);
    clone.querySelectorAll(".ap-fine, [data-disclaimer], svg").forEach((n) => n.remove());
    const text = clone.textContent.replace(/\s+/g, " ");
    const hits = checkClaims(text);
    const html = `<article class="rx-note">
        <p class="rx-eyebrow">On the phone now</p>
        <h2>${esc(N.t)}</h2>
        <p class="rx-note-lede">${esc(N.lede)}</p>
        ${N.ba.length ? `<h3 class="rx-h3">Was, now</h3><ul class="rx-ba">${N.ba.map(([a, b]) => `<li><s>${esc(a)}</s><b>${esc(b)}</b></li>`).join("")}</ul>` : ""}
        ${N.open.length ? `<h3 class="rx-h3">To decide</h3><ul class="rx-q">${N.open.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
        ${N.res.length ? `<h3 class="rx-h3">From the research</h3><ul class="rx-res">${N.res.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
        <p class="rx-lint${hits.length ? " is-hit" : ""}">${ic(hits.length ? "info" : "check")}<span>${hits.length ? `Claims check: ${hits.length} to look at on this screen: ${esc(hits.map((h) => `"${h.text}" (${h.rule.why})`).join("; "))}` : `Claims check: this screen passes all ${RULES.length} rules.`}</span></p>
      </article>`;
    mount.querySelector("#rxNotes").innerHTML = html;
    mount.querySelector("#rxNotesM").innerHTML = html;
  }
  function syncNav() {
    const cur = P.compare && !isM() && P.key === "bm" ? "compare-bm" : keyToScreen(P.key);
    mount.querySelectorAll('[data-rx="screen"]').forEach((b) => b.setAttribute("aria-current", String(b.dataset.v === cur)));
  }
  function compareTable() {
    const M = P.phones[0].model();
    const ab = abWeek(M);
    /* each column from its own phone, so a log on phone B shows in B's column */
    const wk = (m) => { const ph = P.phones.find((p) => p.form() === m) || P.phones[0], Mi = ph.model(), Wi = RU.week(Mi, m); return Mi.usual ? `${Wi.inForms} of ${Wi.bms.length - Wi.unsure} BMs within the usual, ${L.usualFormsText(Mi, m)}` : `Still learning the usual, day ${L.learnDay(Mi)}`; };
    const mo = (m) => { const ph = P.phones.find((p) => p.form() === m) || P.phones[0], Mi = ph.model(); return Mi.usual ? `${abMonthK(Mi, m)} of ${abMonthN(Mi)} BMs within the usual` : `Still learning the usual, day ${L.learnDay(Mi)}`; };
    const rows = [
      ["On each tile", "A number and a word", "One of five words", "One of seven words"],
      ["To log a usual BM", "Plus, then a tile. Saved, with Undo", "Plus, then a tile. Saved, with Undo", "Plus, then a tile. Saved, with Undo"],
      ["Steps the log keeps", "Seven", "Five. Hard covers 1 and 2, Loose covers 5 and 6", "Seven"],
      [`This week, ${M.P.name}`, wk("A"), wk("B"), wk("C")],
      [`Last 30 days on Insights, ${M.P.name}`, mo("A"), mo("B"), mo("C")],
      ["With a clinician", "The numbers they know", "Words that cover one or two steps", "The step is stored, so a report can carry the number once licensed"],
      ["Licensing", "The Rome Foundation's licence, then the scale's own wording, word for word. The words here are stand-ins", "None for the words", "Pending counsel's read: the words, lines and marks are ours but describe the same seven forms. License the report's numbers"],
      ["Today's five-word logs", "Can't become one number each", "Carry over as they are", "Carry over as one or two steps"],
      ["First few logs", "A number to learn, with a word beside it", "Plain words, little to learn", "Plain words, little to learn"]
    ];
    cmp.innerHTML = `<div class="rx-cmpt-h"><p class="rx-eyebrow">A, B and C, compared</p><h2>Same flow, three ways to name it</h2><p>${esc(abLine(M))} Recommended: C. It keeps the seven steps a clinician can read and the plain words a first-timer can pick, pending counsel's read on its words and marks.</p></div>
      <div class="rx-tbl-wrap"><table class="rx-tbl"><thead><tr><th scope="col"><span class="sr">Question</span></th>${["A", "B", "C"].map((m) => `<th scope="col">${esc(L.MODES[m])}${m === "C" ? " · proposed" : ""}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(([q, a, b, c]) => `<tr><th scope="row">${esc(q)}</th><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table></div>
      <p class="rx-small">Each phone is its own copy of the app, so you can log in one without changing the others. The list on the left moves all three.</p>`;
  }
  /* the plan for every phone at once: the switch, Start membership, or a free screen from the list */
  function setPlanAll(v, then) {
    P.plan = v;
    P.phones.forEach((p) => p.setPlan(v));
    if (then) P.phones.forEach((p) => p.open(then));
    syncControls(); notes();
  }
  function syncControls() {
    mount.querySelectorAll('[data-rx="form"]').forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.v === P.form)); b.disabled = P.compare && !isM(); });
    mount.querySelectorAll('[data-rx="compare"]').forEach((b) => b.setAttribute("aria-pressed", String(P.compare)));
    mount.querySelectorAll('[data-rx="persona"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P.persona)));
    mount.querySelectorAll('[data-rx="data"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P.data)));
    ["meals", "mealUI", "plan"].forEach((k) => mount.querySelectorAll(`[data-rx="${k}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P[k]))));
    mount.querySelectorAll('[data-rx="theme"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === appTheme())));
  }

  /* ---------- page controls ---------- */
  mount.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rx]");
    if (!b) return;
    const k = b.dataset.rx, v = b.dataset.v;
    if (k === "form") {
      if (P.compare && !isM()) return;
      P.form = v; store.set("form", v);
      P.phones.forEach((p) => p.setForm(v));
      notes(); syncControls();
    } else if (k === "compare") {
      P.compare = !P.compare; store.set("compare", P.compare);
      build();
    } else if (k === "screen" && v === "compare-bm") {
      closeMsheet();
      if (isM()) { P.phones.forEach((p) => p.open("bm")); return; }
      if (!P.compare) { P.compare = true; store.set("compare", true); build(); } else P.phones.forEach((p) => p.open("bm"));
      const r = stage.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.5) stage.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    } else if (k === "screen") {
      P.phones.forEach((p) => p.open(v));
      closeMsheet();
      if (!isM()) { const r = stage.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.5) stage.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); }
    } else if (k === "persona") {
      P.persona = v; P.phones.forEach((p) => p.setPersona(v)); syncControls(); notes(); if (P.compare) compareTable();
    } else if (k === "data") {
      P.data = v; P.phones.forEach((p) => p.setData(v)); syncControls(); notes(); if (P.compare) compareTable();
    } else if (k === "meals") {
      P.meals = v; P.phones.forEach((p) => p.setMeals(v)); syncControls(); notes(); if (P.compare) compareTable();
    } else if (k === "mealUI") {
      P.mealUI = v; P.phones.forEach((p) => p.setMealUI(v)); syncControls(); notes();
    } else if (k === "plan") {
      setPlanAll(v);
    } else if (k === "theme") {
      P.themeSet = v; P.phones.forEach((p) => p.setTheme(v)); syncControls();
    } else if (k === "reset") {
      P.phones.forEach((p) => p.reset()); notes();
      if (P.compare) P.phones.forEach((p) => p.open("bm"));
    } else if (k === "msheet") {
      const m = mount.querySelector("#rxMsheet"); m.hidden = false;
      requestAnimationFrame(() => { const x = m.querySelector(".rx-x"); if (x) x.focus(); });
    } else if (k === "msheet-close") closeMsheet();
  });
  function closeMsheet() { const m = mount.querySelector("#rxMsheet"); if (!m.hidden) { m.hidden = true; const t = mount.querySelector('.rx-mbar [data-rx="msheet"]'); if (t && isM()) t.focus({ preventScroll: true }); } }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMsheet();
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !isM() && !e.target.closest("input, textarea, select, .ap")) {
      const flat = SCREENS.flatMap(([, items]) => items.map(([id]) => id)).filter((id) => id !== "compare-bm");
      const i = Math.max(0, flat.indexOf(keyToScreen(P.key)));
      const next = flat[(i + (e.key === "ArrowRight" ? 1 : -1) + flat.length) % flat.length];
      P.phones.forEach((p) => p.open(next));
    }
  });

  /* follow the viewer's theme unless the demo picks one */
  const followTheme = () => { if (!P.themeSet) { P.phones.forEach((p) => p.setTheme(pageTheme())); syncControls(); } };
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", followTheme);
  new MutationObserver(followTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  let wasM = isM();
  window.addEventListener("resize", FL.debounce(() => { if (isM() !== wasM) { wasM = isM(); build(); } else fit(); }, 120));
  /* the notes follow the phone's screen even when the change came from inside it */
  build();
})();
