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
  const FORM_NAME = { A: "A · Types 1 to 7", B: "B · Five words" };

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
  const KIND = { plus: "sheet", guide: "sheet", flag: "sheet", ckday: "sheet", nobm: "sheet", bm: "full", sym: "full", meal: "full", ck: "screen" };

  function Phone(host, cfg) {
    const S = { form: cfg.form, persona: cfg.persona, data: cfg.data, tab: "today", ovl: [], hist: { filter: "all", n: 14 }, uid: ++UID, undo: null };
    S.M = L.build(S.persona, S.data);
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
        <div class="apx-homebar" aria-hidden="true"></div>
      </div>`;
    const root = host.querySelector(".ap"), layer = root.querySelector(".ap-layer"), tb = root.querySelector(".ap-tb");
    const ovlEl = root.querySelector(".ap-ovl"), tst = root.querySelector(".ap-tst");
    const V = () => ({ form: S.form, uid: S.uid });
    const top = () => S.ovl[S.ovl.length - 1];

    /* ---------- the tab underneath ---------- */
    function renderTab(soft) {
      const y = layer.scrollTop;
      S.M.ckDraft = S.ckDraft || null;
      const html = S.tab === "today" ? RU.today(S.M, V()) : S.tab === "history" ? RU.history(S.M, V(), S.hist) : RU.soon(S.tab);
      layer.classList.remove("ap-anim");
      layer.innerHTML = html;
      if (!soft && !reduced()) {
        void layer.offsetWidth;
        layer.classList.add("ap-anim");
        clearTimeout(layer._t);
        layer._t = setTimeout(() => layer.classList.remove("ap-anim"), 1400);
      }
      layer.scrollTop = soft ? y : 0;
      tb.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === S.tab)));
    }

    /* ---------- overlays: the plus menu, the log forms, the check-in ---------- */
    function ovlHTML(o) {
      switch (o.type) {
        case "plus": return RU.plus(S.M, V());
        case "bm": return RU.bm(S.M, V(), o.st);
        case "sym": return RU.sym(S.M, V(), o.st);
        case "meal": return RU.meal(S.M, V(), o.st);
        case "guide": return RU.guide(V());
        case "flag": return RU.flagNote(o.st);
        case "ck": return RU.ck(S.M, V(), o.st);
        case "ckday": return RU.ckDay(S.M, o.st);
        case "nobm": return RU.nobmSheet(o.st);
        default: return "";
      }
    }
    const scroller = (el) => el.querySelector(".ap-fsh-b, .ap-ck-b") || el.querySelector(".ap-psh");
    const keyOf = (el) => (el && el.dataset ? [el.dataset.act || "", el.dataset.v || "", el.dataset.form || ""].join("|") : "");
    function focusIn(ov) {
      if (!ov) return;
      requestAnimationFrame(() => {
        const t = ov.el.querySelector(".ap-ck-opt, .ap-fm-b, .ap-ch, .ap-pbm-h, textarea, input, button:not(.ap-o-scrim)");
        if (t && !ov.el.contains(document.activeElement)) t.focus({ preventScroll: true });
      });
    }
    function push(type, st = {}, o = {}) {
      const ov = { type, st, el: document.createElement("div"), opener: document.activeElement };
      ov.el.className = `ap-o ap-o--${KIND[type]}${o.instant || reduced() ? " is-now" : ""}`;
      ov.el.innerHTML = `${KIND[type] === "screen" ? "" : '<div class="ap-o-scrim" data-act="close" aria-hidden="true"></div>'}<div class="ap-o-p"></div>`;
      ov.el.querySelector(".ap-o-p").innerHTML = ovlHTML(ov);
      tst.classList.remove("is-on");
      S.ovl.push(ov);
      ovlEl.appendChild(ov.el);
      if (!o.instant) focusIn(ov);
      nav();
      return ov;
    }
    function rerender(ov = top()) {
      if (!ov) return;
      const p = ov.el.querySelector(".ap-o-p");
      const sc = scroller(p), y = sc ? sc.scrollTop : 0;
      const a = document.activeElement, inside = a && ov.el.contains(a);
      const fid = inside ? a.id : null, fkey = inside && !a.id ? keyOf(a) : null;
      p.innerHTML = ovlHTML(ov);
      const sc2 = scroller(p);
      if (sc2) sc2.scrollTop = y;
      if (fid) { const f = p.querySelector("#" + CSS.escape(fid)); if (f) f.focus({ preventScroll: true }); }
      else if (fkey) { const f = [...p.querySelectorAll("[data-act]")].find((el) => keyOf(el) === fkey); if (f) f.focus({ preventScroll: true }); }
    }
    function pop(o = {}) {
      const ov = S.ovl.pop();
      if (!ov) return;
      /* leaving the check-in part way keeps the answers, so the Today card can say Continue (a preview from the list doesn't) */
      if (ov.type === "ck" && !ov.st.preview && ov.st.step <= L.CHECKIN.length && S.M.checkin.status === "due") S.ckDraft = ov.st.step > 0 || ov.st.answers.some((v) => v != null) ? ov.st : null;
      if (o.instant || reduced()) ov.el.remove();
      else { ov.el.classList.add("is-out"); setTimeout(() => ov.el.remove(), 320); }
      if (!o.instant && ov.opener && document.contains(ov.opener) && root.contains(ov.opener)) ov.opener.focus({ preventScroll: true });
      if (ov.type === "ck") renderTab(true);
      nav();
    }
    function closeAll() { while (S.ovl.length) pop({ instant: true }); }
    /* swap the top overlay for another (the plus menu hands off to a log form) */
    function swap(type, st) { const opener = top() && top().opener; pop({ instant: true }); const ov = push(type, st); ov.opener = opener; }

    /* ---------- toast, with undo ---------- */
    function toast(msg, undo) {
      S.undo = undo || null;
      tst.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button" class="ap-tst-b" data-act="undo">${ic("undo")}Undo</button>` : ""}`;
      tst.classList.add("is-on");
      clearTimeout(S.tT);
      S.tT = setTimeout(() => { tst.classList.remove("is-on"); S.undo = null; }, undo ? 5600 : 3000);
    }
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
    const newBm = (form) => ({ d: L.TODAY, t: L.NOW, form: form == null ? null : form, how: {}, dur: null, flags: {}, note: "", details: false });
    const newSym = () => ({ d: L.TODAY, t: L.NOW, items: [], last: null, note: "", custom: [] });
    const newMeal = () => ({ d: L.TODAY, t: L.NOW, meal: L.mealFor(L.NOW), text: "", note: "" });
    const newCk = () => ({ step: 0, answers: [null, null, null, null], tags: [], note: "" });
    function openEntry(id) {
      const e = L.find(S.M, id);
      if (!e) return;
      if (e.kind === "bm") push("bm", { edit: id, d: e.d, t: e.t, form: e.form, how: Object.assign({}, e.how), dur: e.dur, flags: Object.assign({}, e.flags), note: e.note || "", details: Object.values(e.how || {}).some(Boolean) || e.dur != null || Object.values(e.flags || {}).some(Boolean) });
      else if (e.kind === "sym") push("sym", { edit: id, d: e.d, t: e.t, items: e.items.map((i) => Object.assign({}, i)), last: e.last, note: e.note || "", custom: e.items.map((i) => i.name).filter((n) => !L.SYMPTOMS.includes(n)) });
      else if (e.kind === "meal") push("meal", { edit: id, d: e.d, t: e.t, meal: e.meal, text: e.text, note: e.note || "" });
      else push("nobm", { edit: id, t: e.t });
    }
    function logNoBm() {
      const restore = snapshot();
      L.add(S.M, { kind: "nobm", d: L.TODAY, t: L.NOW });
      if (top() && top().type === "plus") pop({ instant: true });
      renderTab(true);
      toast("Logged: no BM today. The day won't read as a gap.", restore);
    }
    function blocked(b) {
      const f = b.closest(".ap-fsh-f, .ap-ck-fin");
      const h = f && f.querySelector(".ap-fsh-hint");
      if (h) { h.classList.remove("is-flash"); void h.offsetWidth; h.classList.add("is-flash"); }
    }

    /* ---------- every tap inside the phone ---------- */
    const ACT = {
      tab(b) { closeAll(); if (S.tab === b.dataset.tab) { layer.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }); return; } S.tab = b.dataset.tab; renderTab(); nav(); },
      plus() { push("plus"); },
      close() { pop(); },
      "open-bm"(b) { const st = newBm(b.dataset.form ? +b.dataset.form : null); if (top() && (top().type === "plus" || b.dataset.swap)) swap("bm", st); else push("bm", st); },
      "open-sym"() { if (top() && top().type === "plus") swap("sym", newSym()); else push("sym", newSym()); },
      "open-meal"() { if (top() && top().type === "plus") swap("meal", newMeal()); else push("meal", newMeal()); },
      form(b) { const st = top().st; st.form = +b.dataset.form; rerender(); },
      details() { const st = top().st; st.details = !st.details; rerender(); },
      how(b) { const st = top().st; st.how[b.dataset.v] = !st.how[b.dataset.v]; rerender(); },
      dur(b) { const st = top().st, v = +b.dataset.v; st.dur = st.dur === v ? null : v; rerender(); },
      flag(b) { const st = top().st; st.flags[b.dataset.v] = !st.flags[b.dataset.v]; rerender(); },
      guide() { push("guide"); },
      "save-bm"(b) {
        const st = top().st;
        if (st.form == null) return blocked(b);
        const { e, res, restore } = commit(st, "bm", { t: st.t, form: st.form, how: Object.assign({}, st.how), dur: st.dur, flags: Object.assign({}, st.flags), note: (st.note || "").trim() });
        const edit = !!st.edit;
        pop({ instant: true });
        renderTab(true);
        if (L.FLAGS.some(([k]) => e.flags[k])) push("flag", { flags: Object.assign({}, e.flags) });
        else toast(`${edit ? "Saved" : "BM saved"}. ${L.formName(e.form, S.form)} at ${T(e.t)}${whenTxt(e)}.${res.replacedNoBm ? " It replaces No BM today." : ""}`, restore);
      },
      delete() {
        const ov = top(), id = ov.st.edit;
        const restore = snapshot();
        L.remove(S.M, id);
        pop({ instant: true });
        renderTab(true);
        toast("Deleted.", restore);
      },
      nobm() { logNoBm(); },
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
          const name = n.charAt(0).toUpperCase() + n.slice(1);
          if (!L.SYMPTOMS.includes(name) && !st.custom.includes(name)) st.custom.push(name);
          if (!st.items.some((x) => x.name === name)) st.items.push({ name, s: 0 });
        }
        st.adding = false; st.newName = "";
        rerender();
      },
      str(b) { const st = top().st, [n, s] = b.dataset.v.split("|"); const it = st.items.find((x) => x.name === n); if (it) it.s = it.s === +s ? 0 : +s; rerender(); },
      last(b) { const st = top().st, v = +b.dataset.v; st.last = st.last === v ? null : v; rerender(); },
      "save-sym"(b) {
        const st = top().st;
        if (!st.items.length) return blocked(b);
        const { e, restore } = commit(st, "sym", { t: st.t, items: st.items.map((i) => ({ name: i.name, s: i.s })), last: st.last, note: (st.note || "").trim() });
        const edit = !!st.edit;
        pop({ instant: true });
        renderTab(true);
        toast(`${edit ? "Saved" : "Symptoms saved"}. ${RU.entryText(e, S.form).title} at ${T(e.t)}${whenTxt(e)}.`, restore);
      },
      meal(b) { const st = top().st; st.meal = b.dataset.v; rerender(); },
      recent(b) { const st = top().st; st.text = b.dataset.v; rerender(); },
      "save-meal"(b) {
        const st = top().st, text = (st.text || "").trim();
        if (!text) return blocked(b);
        const foods = Object.keys(L.FOOD_NAMES).filter((f) => new RegExp(`\\b${f}`, "i").test(text));
        const { e, restore } = commit(st, "meal", { t: st.t, meal: st.meal, text, foods, note: (st.note || "").trim() });
        const edit = !!st.edit;
        pop({ instant: true });
        renderTab(true);
        toast(`${edit ? "Saved" : `${L.mealLabel(e.meal)} saved`}. ${T(e.t)}${whenTxt(e)}.`, restore);
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
        S.ckT = setTimeout(() => { if (top() === ov && st.step < L.CHECKIN.length) { st.step++; rerender(); focusIn(ov); const sc = ov.el.querySelector(".ap-ck-b"); if (sc) sc.scrollTop = 0; } }, reduced() ? 0 : 280);
      },
      "ck-back"() { const st = top().st; clearTimeout(S.ckT); st.step = Math.max(0, st.step - 1); rerender(); },
      "ck-tag"(b) { const st = top().st, v = b.dataset.v; const i = st.tags.indexOf(v); if (i >= 0) st.tags.splice(i, 1); else st.tags.push(v); rerender(); },
      "ck-finish"() {
        const st = top().st;
        Object.assign(S.M.checkin, { status: "done", answers: st.answers.slice(), tags: st.tags.slice(), note: (st.note || "").trim() });
        S.ckDraft = null;
        st.step = L.CHECKIN.length + 1;
        rerender();
        const sc = top().el.querySelector(".ap-ck-b");
        if (sc) sc.scrollTop = 0;
        renderTab(true);
        nav();
      },
      "ck-skip"() {
        const restore = snapshot();
        S.M.checkin.status = "skipped";
        S.ckDraft = null;
        renderTab(true);
        toast("Skipped for this week. It's still in the plus menu if you change your mind.", restore);
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
        toast(was.dow === st.dow && was.when === st.when ? "No change. It's due Sunday evenings." : `Saved. From next week it's due ${AD.util.DOWL[st.dow]} ${st.when}s.`);
      },
      edit(b) { openEntry(b.dataset.id); },
      toast(b) { if (b.dataset.close) closeAll(); toast(b.dataset.msg); },
      hfilter(b) { S.hist.filter = b.dataset.v; renderTab(true); },
      hmore() { S.hist.n = (S.hist.n || 14) + 14; renderTab(true); },
      undo() { const u = S.undo; S.undo = null; tst.classList.remove("is-on"); if (u) u(); }
    };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b || !root.contains(b)) return;
      const f = ACT[b.dataset.act];
      if (!f) return;
      if (b.getAttribute("aria-disabled") === "true" && !/^save-/.test(b.dataset.act)) return;
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
      } else if (k === "newsym") st.newName = el.value;
      else if (k === "cknote") st.note = el.value;
      else if (k === "time") { const h = RU.fromInput(el.value); if (h != null) st.t = h; }
      else if (k === "day") st.d = +el.value;
    });
    root.addEventListener("change", (e) => {
      const el = e.target.closest("[data-in]"), ov = top();
      if (!el || !ov) return;
      if (el.dataset.in === "day") ov.st.d = +el.value;
      if (el.dataset.in === "time") { const h = RU.fromInput(el.value); if (h != null) ov.st.t = h; }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && top()) { e.preventDefault(); pop(); }
      if (e.key === "Enter" && e.target.matches && e.target.matches('[data-in="newsym"]')) { e.preventDefault(); ACT["sym-add"](); }
    });

    /* ---------- what the page needs to know ---------- */
    function key() {
      const t = top();
      if (!t) return S.tab;
      if (t.type === "ck") return t.st.step > L.CHECKIN.length ? "ckdone" : "ck";
      return t.type;
    }
    function nav() {
      root.classList.toggle("has-full", S.ovl.some((o) => KIND[o.type] !== "sheet"));
      root.classList.toggle("has-ovl", S.ovl.length > 0);
      if (cfg.onNav) cfg.onNav(key(), api);
    }

    /* jump straight to a screen in a known state (the list beside the phone uses this) */
    function open(id) {
      closeAll();
      clearTimeout(S.ckT);
      const go = (tab) => { S.tab = tab; renderTab(true); layer.scrollTop = 0; };
      const now = { instant: true };
      switch (id) {
        case "plus": go("today"); push("plus", {}, now); break;
        case "bm": go("today"); push("bm", newBm(null), now); break;
        case "bm-details": go("today"); push("bm", Object.assign(newBm(6), { details: true, how: { rush: true }, dur: 1 }), now); break;
        case "guide": go("today"); push("bm", newBm(null), now); push("guide", {}, now); break;
        case "flag": go("today"); push("flag", { flags: { blood: true } }, now); break;
        case "sym": go("today"); push("sym", Object.assign(newSym(), { items: [{ name: "Bloating", s: 2 }], last: 1 }), now); break;
        case "meal": go("today"); push("meal", newMeal(), now); break;
        case "ck": go("today"); push("ck", newCk(), now); break;
        case "ck-last": go("today"); push("ck", { step: 4, answers: [1, 0, 1, 1], tags: [], note: "", preview: true }, now); break;
        case "ckdone": go("today"); push("ck", { step: L.CHECKIN.length + 1, answers: [1, 0, 1, 1], tags: ["Eating out"], note: "", preview: true }, now); break;
        case "ckday": go("today"); push("ckday", Object.assign({}, S.M.ckDay), now); break;
        case "history": go("history"); break;
        case "insights": go("insights"); break;
        case "ask": go("ask"); break;
        case "ck-card": go("today"); { const c = layer.querySelector(".ap-ckc"); if (c) layer.scrollTop = Math.max(0, c.offsetTop - 64); } break;
        default: go("today");
      }
      nav();
    }
    function rebuild() { S.M = L.build(S.persona, S.data); S.ckDraft = null; S.hist = { filter: "all", n: 14 }; tst.classList.remove("is-on"); S.undo = null; }
    const api = {
      el: root,
      open,
      key,
      model: () => S.M,
      form: () => S.form,
      setForm(f) { S.form = f; renderTab(true); S.ovl.forEach((o) => rerender(o)); },
      setPersona(p) { S.persona = p; rebuild(); open("today"); },
      setData(d) { S.data = d; rebuild(); open("today"); },
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
  /* the week, read both ways, so the notes can say what B hides */
  const abWeek = (M) => {
    if (!M.usual) return null;
    const W = { A: RU.week(M, "A"), B: RU.week(M, "B") };
    const diff = W.A.bms.filter((b) => L.inForms(M, b.form, "A") !== L.inForms(M, b.form, "B"));
    return { W, diff, n: W.A.bms.length };
  };
  const abLine = (M) => {
    const ab = abWeek(M);
    if (!ab) return "With a new person there's no usual yet, so both read the same until day 14.";
    if (!ab.diff.length) return `This week both read the same: ${ab.W.A.inForms} of ${ab.n} BMs within ${M.P.name}'s usual.`;
    const b = ab.diff[0];
    return `This week A puts ${ab.W.A.inForms} of ${ab.n} BMs within ${M.P.name}'s usual (${L.usualFormsText(M, "A")}) and B puts ${ab.W.B.inForms} of ${ab.n} (${L.usualFormsText(M, "B")}). The difference is ${RU.dayName(b.d) === "Today" ? "today's" : RU.dayName(b.d).split(",")[0] + "'s"} ${T(b.t)} BM: a Type ${b.form}, which B calls ${L.formName(b.form, "B")}.`;
  };
  const NOTES = {
    today: (M) => ({
      t: "Today",
      lede: "Today opens on one sentence from the person's own logs, then the day on a line, the check-in when it's due, today's entries and the week so far.",
      ba: [
        ["A FloraScore over a lake photo, with a progress bar", "One plain sentence from today's logs, read against the person's usual window"],
        ["A week strip with a ring for each day you logged", "A week grid: forms, first BM, symptoms and meals by day. A gap stays a gap"],
        ["A generic daily tip about 8 glasses of water", "No tips for now. One next step from the person's own logs"]
      ],
      open: ["FloraScore is gone from Today until the sensor ships. Right call, or does a score built from manual logs come back?", "The check-in card sits second, above the timeline, so the one reminder gets seen. Right place?", "Does History stay a tab, or move under Today?"],
      res: ["Oura's Today (October 2025): one daily highlight, then a timeline you can add to.", "Function leads with counts in plain terms. The week card does the same, under the grid.", "Oura waits up to 2 weeks before judging anything. Switch Demo to New, day 5 to see the learning state."]
    }),
    plus: () => ({
      t: "The plus menu",
      lede: "Plus opens a short menu. BM comes first and largest, with the form tiles right on it, so a usual BM is plus, a tile, then Save.",
      ba: [
        ["Plus opened one long BM form with symptoms attached", "A menu: BM, Symptoms, Meal, and the weekly check-in with a dot when it's due"],
        ["Logging a symptom meant logging a BM", "Symptoms log on their own"],
        ["An empty day read as missing data", "No BM today is one tap, here and on Today"]
      ],
      open: ["Tiles on the menu itself (built here), or only inside Log a BM?", "The check-in sits in the menu every week, with the dot only when it's due. The brief had it there only when due."],
      res: ["Bellyx claims 2 taps; Stool Log, a few.", "Stool Log, Bellyx and GutLog also log from a widget or the watch without opening the app. A good next step after this.", "Throne's guidance: log the days with no BM."]
    }),
    bm: (M, f) => f === "B" ? ({
      t: "Log a BM · B, five words",
      lede: "Today's five words as tiles, without the slider. Time defaults to now; the only required tap is the form.",
      ba: [
        ["A slider from Hard to Watery", "Five tiles: Hard, Firm, Formed, Loose, Watery"],
        ["Duration, odor and completeness sliders", "Odor is dropped. Rushing, straining, not finished and how long sit under Add details"],
        ["Ten symptom pills on every BM", "Moved to Log symptoms. The BM keeps a note"],
        ["Bloody and Mucus as symptom pills", "A flag that shows a clinician note after saving, never a reading of it"]
      ],
      open: ["A or B? B has no licensing question, but five words group the seven types unevenly: 3 and 4 are both Formed, 5 and 6 both Loose.", abLine(M)],
      res: ["A clinical reviewer criticised Bowelle's own 1 to 5 scale for not matching the 1 to 7.", "Throne: record the type number, not a description."]
    }) : ({
      t: "Log a BM · A, types 1 to 7",
      lede: "Seven tiles in a row, harder to looser, with the number big and the full lines behind (i). Time defaults to now; the only required tap is the form.",
      ba: [
        ["Four sliders: consistency, duration, odor, completeness", "Seven tiles for the form. Rushing, straining, not finished and how long sit under Add details"],
        ["Odor", "Dropped. It was a sensor-era field"],
        ["Ten symptom pills on every BM", "Moved to Log symptoms. The BM keeps a note"],
        ["Bloody and Mucus as symptom pills", "A flag that shows a clinician note after saving, never a reading of it"]
      ],
      open: ["A or B? A is what clinicians expect, but it needs the licence confirmed with the Rome Foundation before the scale's wording or imagery ships. The icons and lines here are our own.", abLine(M), "Black or tar-like joins the flag: it's on the alarm list with blood."],
      res: ["Throne: record the type number. Urgency, straining and not feeling finished as three separate items.", "GutLog keeps its visual guide behind an (i) instead of crowding the picker."]
    }),
    guide: (M, f) => ({
      t: f === "B" ? "How to pick · five words" : "How to pick · types 1 to 7",
      lede: "The tiles stay small because the full lines live here, one tap away from the form.",
      ba: [["A slider with five labels and no explanation", "Every option with one plain line, in our own words"]],
      open: f === "B" ? [] : ["The lines and icons are ours, not the scale's. Confirm the licence before any of the scale's own wording or pictures go in."],
      res: ["GutLog keeps its visual guide behind an (i)."]
    }),
    flag: () => ({
      t: "After a flagged BM",
      lede: "Saved with blood, mucus or a black stool, the BM gets a note: when to see a clinician, and that Florin won't try to read it.",
      ba: [["Bloody and Mucus as symptom pills, with nothing after", "Primary care first, with a report to bring. Teal, never red"]],
      open: ["Talk it through with Ask Florin opens the chat on the clinician path with this log loaded. That lands in the second pass."],
      res: ["DESIGN.md: the alarm banner names the sign, sends the person to primary care first and never uses red.", "Throne: flag blood or mucus every time."]
    }),
    nobm: () => ({ t: "No BM today", lede: "Logged on purpose, so an empty day isn't read as missing data. Logging a BM later replaces it.", ba: [["No way to say nothing happened", "One tap from the plus menu or from Today in the evening"]], open: [], res: ["Throne's guidance says to log no-BM days explicitly. GutLog has a journal for them."] }),
    sym: () => ({
      t: "Log symptoms",
      lede: "Symptoms log on their own now: pick any, then how strong and how long. Both follow-ups are chips, and both are optional.",
      ba: [
        ["Ten pills on every BM, stool words mixed in", "Six body symptoms, plus Something else"],
        ["No strength or duration", "Mild, moderate or strong for each, then how long it has lasted"],
        ["No word on when to see someone", "The alarm list in one line at the bottom"]
      ],
      open: ["Is this the right six? Bloating, Belly pain, Cramping, Gas, Nausea and Burning. Urgency moved to the BM; Loose or watery and Hard or pellet-like are the form; Bloody and Mucus became the BM flag; Greasy or oily is dropped for now."],
      res: ["Stool Log keeps every extra optional, added only when you want to.", "The only slider found was research grade (100 points, 4 times a day), and people found it heavy."]
    }),
    meal: () => ({
      t: "Log a meal",
      lede: "Pick the meal, then type what you had. Recent meals come back as one tap, which keeps repeats spelled the same.",
      ba: [["Meal times only, as context", "Breakfast, Lunch, Dinner or Other, then free text. It defaults to the meal that fits the time"]],
      open: ["Free text only, as asked. Florin matches plain food names, and a food needs 5 or more logs before Insights looks at what tends to follow it."],
      res: ["Oura shows a Discovery only after a tag is used about 5 to 40 times.", "Manual logs are sparse, so gate patterns on repeats and say possible pattern."]
    }),
    ck: () => ({
      t: "Weekly check-in",
      lede: "Four questions and a note, in our own words, answered with chips. About a minute, and a tap moves you on. It never blocks logging or Insights.",
      ba: [
        ["The weekly report forced through symptom tracking, and again on every Insights visit", "A card on Today when it's due, one reminder, and an item in the plus menu"],
        ["Sliders", "Four chips per question"],
        ["Clinical wording and a score", "Compared only with the person's own first three check-ins. No score, no bands"]
      ],
      open: ["Should a skipped check-in stay skipped (built here), or move to the next day?", "Later keeps the answers so far; the card then says Continue.", "If the NSF pilot needs a validated measure, license IBS-SSS from the Rome Foundation and use it word for word in the study arm only."],
      res: ["IBS-SSS recalls about 10 days on 0 to 100 scales and is on the Rome Foundation's licence list, so nothing here borrows its wording.", "Oura's weekly report is a dismissible card on Today, archived under Reports."]
    }),
    ckdone: () => ({
      t: "Check-in saved",
      lede: "Each answer next to the person's first weeks, with a 13-week trend. Plum means about the same; Gold means it moved, in either direction.",
      ba: [["Improving, Worsening, Resolved", "Less than, more than, or about the same as your first weeks"]],
      open: ["Is a weekly report, Oura style, worth having beyond this?", "On Insights this becomes the weekly card with the trend (second pass)."],
      res: ["No red, no pass or fail. Function's out of range and Oura's red Pay attention can alarm people."]
    }),
    ckday: () => ({ t: "When it's due", lede: "Sunday evening by default. The person picks the day and morning or evening, and gets one reminder.", ba: [["Due whenever you opened Insights", "Due once a week, on a day you choose"]], open: [], res: ["Oura's Advisor: opt-in check-ins at a frequency and time the person picks."] }),
    history: () => ({ t: "History (basic)", lede: "Every kind of entry in one list, newest day first, gaps left as gaps. Built so logs have somewhere to land; not workshopped yet.", ba: [["Consistency in green, brown and yellow, with odor", "The same rows as Today, in neutral ink"]], open: ["Does History stay a tab, or move under Today?"], res: ["CareClinic lets people catch up on several entries in one go. A candidate for later."] }),
    insights: () => ({ t: "Insights", lede: "Second pass. Placeholder so the tab bar works.", ba: [], open: [], res: [] }),
    ask: () => ({ t: "Ask Florin", lede: "Second pass. Placeholder so the tab bar works.", ba: [], open: [], res: [] })
  };

  /* the list of screens beside the phone */
  const SCREENS = [
    ["Logging", [["plus", "Plus menu"], ["bm", "Log a BM"], ["compare-bm", "Log a BM, A and B side by side"], ["bm-details", "Log a BM, details open"], ["guide", "How to pick (i)"], ["flag", "After a flagged BM"], ["sym", "Log symptoms"], ["meal", "Log a meal"]]],
    ["Weekly check-in", [["ck-card", "The card on Today"], ["ck", "First question"], ["ck-last", "Last question"], ["ckdone", "Saved"], ["ckday", "When it's due"]]],
    ["Tabs", [["today", "Today"], ["history", "History, basic"], ["insights", "Insights, second pass"], ["ask", "Ask, second pass"]]]
  ];
  const keyToScreen = (k) => ({ today: "today", plus: "plus", bm: "bm", guide: "guide", flag: "flag", sym: "sym", meal: "meal", ck: "ck", ckdone: "ckdone", ckday: "ckday", history: "history", insights: "insights", ask: "ask", nobm: "today" }[k] || "today");

  /* ====================================================================== */
  /* THE PAGE                                                                */
  /* ====================================================================== */
  const sysDark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const pageTheme = () => { const a = document.documentElement.getAttribute("data-theme"); return a === "dark" || a === "light" ? a : sysDark() ? "dark" : "light"; };
  const P = {
    form: store.get("form", "A") === "B" ? "B" : "A",
    compare: !!store.get("compare", false),
    persona: "sarah",
    data: "est",
    themeSet: null,
    key: "today",
    phones: []
  };
  const appTheme = () => P.themeSet || pageTheme();

  const seg = (name, opts, cur) => `<div class="rx-seg" role="group" aria-label="${esc(name)}">${opts.map(([v, l]) => `<button type="button" data-rx="${esc(name)}" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join("")}</div>`;
  const demoControls = () => `
      <div class="rx-ctl"><span class="rx-ctl-l">Person</span>${seg("persona", Object.values(AD.personas).map((p) => [p.id, p.name]), P.persona)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">Logs</span>${seg("data", [["est", "12 weeks"], ["new", "New, day 5"]], P.data)}</div>
      <div class="rx-ctl"><span class="rx-ctl-l">App theme</span>${seg("theme", [["light", "Light"], ["dark", "Dark"]], appTheme())}</div>
      <button type="button" class="rx-btn rx-btn--line" data-rx="reset">${ic("undo")}Reset the demo</button>
      <p class="rx-small">Demo time is Sunday, October 11, 7:40 PM: the check-in is due tonight. Logs you add stay until you reset or reload.</p>`;
  const screenList = () => SCREENS.map(([g, items]) => `<li class="rx-nav-g"><span class="rx-eyebrow">${esc(g)}</span><ol>${items.map(([id, l]) => `<li><button type="button" class="rx-nav-b" data-rx="screen" data-v="${id}">${esc(l)}</button></li>`).join("")}</ol></li>`).join("");

  mount.innerHTML = `
    <header class="rx-head">
      <div class="rx-head-l">
        <p class="rx-eyebrow">Florin app refresh · First pass · Oct 13</p>
        <h1>Logging, the check-in and Today</h1>
        <p class="rx-lede">Today's app, the one that ships without hardware. Tap through it like the app: plus logs a BM, symptoms or a meal, and the weekly check-in no longer blocks anything. The two ways to pick a stool form sit side by side.</p>
      </div>
      <div class="rx-head-r" role="group" aria-label="Stool form">
        <span class="rx-ctl-l">Stool form</span>
        <div class="rx-ab">${seg("form", [["A", FORM_NAME.A], ["B", FORM_NAME.B]], P.form)}<button type="button" class="rx-btn rx-cmp" data-rx="compare" aria-pressed="${P.compare}">${ic("bars")}Compare side by side</button></div>
      </div>
    </header>
    <div class="rx-main">
      <aside class="rx-side rx-side--l" aria-label="Screens and demo">
        <nav class="rx-panel" aria-label="Screens"><h2 class="rx-h">Screens</h2><ol class="rx-nav">${screenList()}</ol></nav>
        <div class="rx-panel"><h2 class="rx-h">Demo</h2><div class="rx-demo">${demoControls()}</div></div>
      </aside>
      <div class="rx-center">
        <div class="rx-stage" id="rxStage"></div>
        <section class="rx-cmpt" id="rxCmp" hidden aria-label="A and B compared"></section>
      </div>
      <aside class="rx-side rx-side--r" aria-label="Notes for this screen"><div class="rx-panel rx-notes" id="rxNotes"></div></aside>
    </div>
    <footer class="rx-foot"><span>Built on the brand studio: DESIGN.md v1.1 tokens, the chart kit and the seeded demo data.</span><span>Prototype only. Not for patients.</span></footer>
    <div class="rx-mbar" role="group" aria-label="Prototype">
      <span class="rx-mbar-t">Florin refresh</span>
      ${seg("form", [["A", "A · 1 to 7"], ["B", "B · Words"]], P.form)}
      <button type="button" class="rx-mbar-b" data-rx="msheet" aria-label="Screens and notes">${ic("list")}<span>Notes</span></button>
    </div>
    <div class="rx-msheet" id="rxMsheet" hidden>
      <div class="rx-msheet-scrim" data-rx="msheet-close"></div>
      <div class="rx-msheet-p" role="dialog" aria-modal="true" aria-label="Screens and notes">
        <div class="rx-msheet-h"><b>Florin app refresh</b><button type="button" class="rx-x" data-rx="msheet-close" aria-label="Close">${ic("close")}</button></div>
        <div class="rx-panel rx-notes" id="rxNotesM"></div>
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
    if (ph !== P.phones[0]) return;
    P.key = k;
    notes();
    syncNav();
    if (P.compare) compareTable();
  }
  function build() {
    stage.innerHTML = "";
    P.phones = [];
    const compare = P.compare && !isM();
    const forms = compare ? ["A", "B"] : [P.form];
    forms.forEach((f, i) => {
      const sh = phoneShell(compare ? FORM_NAME[f] : null);
      stage.appendChild(sh);
      const ph = Phone(sh.querySelector(".rx-mount"), { form: f, persona: P.persona, data: P.data, theme: appTheme(), onNav: (k, p) => onNav(k, p) });
      P.phones.push(ph);
      ph.setFull(isM());
      if (!i) ph.el.setAttribute("aria-label", compare ? "Option A" : "Florin app prototype");
    });
    if (P.phones[1]) P.phones[1].el.setAttribute("aria-label", "Option B");
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
    const avW = (stage.clientWidth - (n - 1) * 32) / n;
    const avH = Math.max(560, window.innerHeight - (P.compare ? 72 : 40));
    const s = Math.min(1, avW / 414, avH / 868);
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
    clone.querySelectorAll(".ap-fine, svg").forEach((n) => n.remove());
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
    const rows = [
      ["To log a usual BM", "Plus, a tile, Save", "Plus, a tile, Save"],
      ["Steps", "Seven", "Five. Types 3 and 4 are both Formed, 5 and 6 both Loose"],
      [`This week, ${M.P.name}`, ab ? `${ab.W.A.inForms} of ${ab.n} BMs within the usual, ${L.usualFormsText(M, "A")}` : `Still learning the usual, day ${L.learnDay(M)}`, ab ? `${ab.W.B.inForms} of ${ab.n} BMs within the usual, ${L.usualFormsText(M, "B")}` : `Still learning the usual, day ${L.learnDay(M)}`],
      ["With a clinician", "The scale they already use", "Needs translating to types"],
      ["Licensing", "Confirm with the Rome Foundation first. Icons and lines here are ours", "None"],
      ["First few logs", "Leans on the (i) guide", "Plain words, little to learn"]
    ];
    cmp.innerHTML = `<div class="rx-cmpt-h"><p class="rx-eyebrow">A and B, compared</p><h2>Same flow, different scale</h2><p>${esc(abLine(M))}</p></div>
      <div class="rx-tbl-wrap"><table class="rx-tbl"><thead><tr><th scope="col"><span class="sr">Question</span></th><th scope="col">${esc(FORM_NAME.A)}</th><th scope="col">${esc(FORM_NAME.B)}</th></tr></thead>
      <tbody>${rows.map(([q, a, b]) => `<tr><th scope="row">${esc(q)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>
      <p class="rx-small">Each phone is its own copy of the app, so you can log in one without changing the other. The list on the left moves both.</p>`;
  }
  function syncControls() {
    mount.querySelectorAll('[data-rx="form"]').forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.v === P.form)); b.disabled = P.compare && !isM(); });
    mount.querySelectorAll('[data-rx="compare"]').forEach((b) => b.setAttribute("aria-pressed", String(P.compare)));
    mount.querySelectorAll('[data-rx="persona"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P.persona)));
    mount.querySelectorAll('[data-rx="data"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === P.data)));
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
