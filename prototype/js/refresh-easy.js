/* Florin app refresh: the Easy version (V.easy), an elderly-friendly app. Will, Oct 27: "a version that's the most
   Elderly user friendly". Made for a 70-year-old with reading glasses, a mild tremor and little patience for charts.
   Registers into window.FLORIN_EXT and wraps RU render functions (CLAUDE.md, Extension hooks); it never edits a core
   file. Every wrapper draws the core's own screen when this file's throws, and says so with a console.warn.

   What it does, with V.easy on:
   - the phone root gets .ap--easy, and css/refresh-easy.css restyles the app's standard components under it (type about
     1.35x, controls 56px or more, text in Ink, labels on every icon, larger toasts and sheets, a tab bar of Today, Add,
     History and Ask with their words);
   - Today (RU.today): a greeting, one plain sentence about today, FloraScore as a big number with its words, three big
     buttons (I had a BM, Something feels off, What I ate), the check-in when it's on and due, This week as the library's
     Easy read week card, and today's logs as big rows;
   - Insights folds into Today: the tab leaves the tab bar, and This week leads to "Your weeks" (RU.insights), the
     Easy read cards for a member, each with Ask about this where Insights has its twin, the week and the membership
     card on Free;
   - plus (RU.plus): big labelled buttons in one column, I had a BM first and focused; with quick tiles, the BM words
     sit under it and still save in one tap;
   - Log a BM (RU.bm): one question per screen, four steps, with a step counter and a big Back. Save is the core's
     save-bm, so the flag and the primary care note work as they always do;
   - symptoms (RU.sym): big chips and strength as three big buttons, on the core's own acts, and about when for a day
     being caught up;
   - History and Ask keep their content and get bigger through the CSS; Ask's intro points to Your weeks.
   Every number comes from the model (L, RU.week) or from FLD.build over the live model; nothing is typed. */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, EXT = window.FLORIN_EXT;
  if (!FL || !L || !RU || !AD || !EXT) return;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, ic = RU.icon;
  const MOD = "Florin Easy version (refresh-easy.js)";
  const warn = (where, e) => { try { console.warn(`${MOD}: ${where} failed; the standard version is drawn instead.`, e); } catch (x) { /* no console */ } };
  const reduced = () => (FL.reduced ? FL.reduced() : false);

  /* ---------- words and small helpers ---------- */
  const N = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const num = (n) => (n >= 0 && n <= 10 ? N[n] : String(n));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  const SCORE_NOTE = "FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.";
  const CLIN = "If a symptom is new for you or keeps showing up, talk to a clinician.";
  const ALARM_LINE = "New for you, or getting stronger? Talk to a clinician. Blood, a black stool, a fever, vomiting that won't stop, weight loss you can't explain or waking at night to go: start with primary care soon.";
  const STEPS = 4;
  const todayOf = (M) => { const x = L.day(M, L.TODAY); return x && x.logged ? x.entries : []; };
  const dayIn = (d) => (d === L.TODAY ? "today" : d === L.TODAY - 1 ? "yesterday" : RU.dayName(d));
  const winBetween = (u) => { const a = T(u.tLo), b = T(u.tHi); return `${/AM$/.test(a) && /AM$/.test(b) ? a.replace(/ AM$/, "") : a} and ${b}`; };
  const on = (V) => !!(V && V.easy);
  const api = () => EXT.api || null;

  /* the library's Easy read look, and the one data object every card draws from, built on the phone's live model */
  const look = () => (window.FLOOKS || []).find((k) => k && k.id === "easy") || null;
  const dataOf = (M, V) => {
    if (!window.FLD || typeof window.FLD.build !== "function") throw new Error("FLD.build is missing");
    return window.FLD.build(V.persona || (M.P && M.P.id), { mode: V.form, data: V.data, meals: V.meals, M });
  };
  let seq = 0;
  const themeNow = () => { const a = api(); return (a && a.root && a.root.dataset.theme) || "light"; };
  const ctx = (V) => ({ uid: `ez${V.uid}-${++seq}`, theme: themeNow(), esc, T, C: window.FLC, motion: !reduced() });
  /* a card's title is a heading under the screen's own: h2, not the library's h3 */
  const asH2 = (h) => String(h || "").replace(/<h3 class="ez-t">([^<]*)<\/h3>/g, '<h2 class="ez-t">$1</h2>');
  const card = (D, V, k, post) => {
    const Lk = look();
    if (!Lk || !Lk.components || typeof Lk.components[k] !== "function") return "";
    try { const h = asH2(Lk.components[k](D, ctx(V))); return post ? post(h) : h; } catch (e) { warn(`the Easy read ${k} card`, e); return ""; }
  };
  /* the look's cards sit in a .lk-easy box carrying the phone's theme, so its dark rules apply */
  const box = (inner, cls = "") => `<div class="lk-easy${cls ? ` ${cls}` : ""}" data-theme="${esc(themeNow())}">${inner}</div>`;

  /* ---------- the phone root: the class, the tab bar's words, the theme on the look's boxes ---------- */
  const watched = new WeakSet();
  function themes(a) {
    if (!a || !a.root) return;
    const t = a.root.dataset.theme || "light";
    a.root.querySelectorAll(".lk-easy").forEach((el) => { if (el !== a.root) el.dataset.theme = t; });
  }
  function sync(a = api()) {
    if (!a || !a.root || !a.S) return;
    const root = a.root, easy = !!a.S.easy;
    root.classList.toggle("ap--easy", easy);
    /* plus gets its word (Add) while Easy is on; its own name comes back when it's off */
    const plus = root.querySelector(".ap-tb-plus");
    if (plus) {
      if (easy) {
        if (plus.dataset.ezName == null) plus.dataset.ezName = plus.getAttribute("aria-label") || "";
        plus.setAttribute("aria-label", "Add a log");
        if (!plus.querySelector(".ap-ez-tbl")) plus.insertAdjacentHTML("beforeend", '<span class="ap-ez-tbl" aria-hidden="true">Add</span>');
      } else if (plus.dataset.ezName != null) {
        plus.setAttribute("aria-label", plus.dataset.ezName);
        delete plus.dataset.ezName;
        const s = plus.querySelector(".ap-ez-tbl"); if (s) s.remove();
      }
    }
    if (!watched.has(root)) {
      watched.add(root);
      /* the theme changes on the root without a redraw: the look's boxes follow it */
      try { new MutationObserver(() => themes(a)).observe(root, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) { /* no observer: onSet still follows */ }
    }
    /* after a redraw, the boxes just drawn carry the theme */
    requestAnimationFrame(() => themes(a));
  }

  /* ---------- the Screens list: a preview that gives the version back ----------
     "Easy version: Today" in the list turns Easy on, so the phone can show it, and the page's toggle follows. Picking
     another screen in the list puts the version back as it was, unless someone picked a version in the meantime (on
     the left, or in Profile): that choice stays. The page's own sweep of every screen relies on this, so the screens
     after Easy's are drawn as they'd be without it.
     It listens to the list's buttons (capture, before the page opens the screen) rather than wrapping api.open: there
     is no documented "leaving this screen" hook yet, and this patches nothing of the core's. A reload while previewing
     keeps Easy on, as the page stores it, and the toggle shows it */
  const MY_SCREENS = ["ez-today", "ez-bm"];
  let auto = null, selfSet = false;
  const setEasy = (a, v) => { selfSet = true; try { a.set("easy", v); } finally { selfSet = false; } };
  const preview = (a) => { if (!a || a.S.easy) return; auto = { prev: false }; setEasy(a, true); };
  try {
    document.addEventListener("click", (e) => {
      try {
        const b = e.target && e.target.closest ? e.target.closest('[data-rx="screen"]') : null, a = api();
        if (!b || !auto || !a || MY_SCREENS.includes(b.dataset.v)) return;
        const prev = auto.prev; auto = null;
        if (!!a.S.easy !== prev) setEasy(a, prev);
      } catch (err) { warn("giving the version back", err); }
    }, true);
  } catch (e) { warn("listening to the Screens list", e); }

  /* ====================================================================== */
  /* TODAY                                                                    */
  /* ====================================================================== */
  /* the one plain sentence about today, from today's logs and the person's usual time */
  function sentence(M) {
    const es = todayOf(M), bms = es.filter((e) => e.kind === "bm"), no = es.some((e) => e.kind === "nobm"), u = M.usual;
    if (bms.length) {
      const f = bms[0], n = bms.length;
      const lead = `You've logged ${n === 1 ? "one BM" : `${num(n)} BMs`} today, ${n === 1 ? "at" : "the first at"} ${T(f.t)}`;
      if (!u) return `${lead}.`;
      const where = L.inWindow(M, f.t) ? "within your usual time" : f.t > u.tHi ? "later than your usual time" : "earlier than your usual time";
      return `${lead}, ${where}.`;
    }
    if (no) return "You've noted that there was no BM today.";
    if (!u) return es.length ? "No BM logged yet today." : "Nothing logged yet today.";
    return `${es.length ? "No BM logged yet today" : "Nothing logged yet today"}, and your first BM usually comes between ${winBetween(u)}.`;
  }
  RU.easySentence = sentence;

  const topPart = (M) => {
    const t = L.dateOf(L.TODAY), hello = L.NOW < 12 ? "Good morning" : L.NOW < 17 ? "Good afternoon" : "Good evening";
    return `<header class="ap-ez-top" data-a>
        <p class="ap-ez-date">${esc(Ut.DOWL[t.getDay()])}, ${esc(Ut.MONL[t.getMonth()])} ${t.getDate()}</p>
        <button type="button" class="ap-ez-prof" data-act="profile"><span class="ap-ez-av" aria-hidden="true">${esc(M.P.initial)}</span><span>Profile</span></button>
        <h1 class="ap-h1 ap-ez-hello" tabindex="-1">${esc(hello)}, ${esc(M.P.name)}</h1>
      </header>`;
  };

  /* FloraScore as a big number with its words, in the Easy read card's parts (title, big number, one sentence). Its
     note (not a medical score) sits in the fine print at the end of Today, so the three buttons come up sooner. While
     Florin is learning, the big line says Day, so the count of days never reads as a score */
  function scorePart(D, M) {
    const S = D.score || {};
    let n = null, unit = "", ans, body = "", shift = false, label;
    if (!M.usual) {
      const lr = S.learning || D.learning || { day: L.learnDay(M), of: L.LEARN_DAYS };
      n = `Day ${lr.day}`; unit = `of ${lr.of}`;
      ans = `Your FloraScore starts on day ${lr.of}.`;
      body = "Florin is learning your usual first.";
      label = `FloraScore, day ${lr.day} of ${lr.of}`;
    } else if (S.value == null) {
      ans = "No FloraScore today yet.";
      body = "It needs a BM, or No BM, logged on two of your last three days.";
      label = "FloraScore, not scored today";
    } else {
      n = S.value;
      shift = !!S.usual && (S.value < S.usual[0] || S.value > S.usual[1]);
      ans = S.usual && S.relation ? `${S.relation}, ${S.usual[0]} to ${S.usual[1]}.` : "Florin is still learning your usual range.";
      label = `FloraScore today, ${S.value}`;
    }
    return box(`<article class="ez ez-score ap-ez-score" aria-label="${esc(label)}">
        <header class="ez-h"><h2 class="ez-t">FloraScore</h2><p class="ez-side">Today</p></header>
        <div class="ez-lead">
          ${n != null ? `<p class="ez-big"><b class="ez-n"${M.usual && typeof n === "number" ? ` data-count="${n}"` : ""}>${esc(String(n))}</b>${unit ? `<span class="ez-unit">${esc(unit)}</span>` : ""}</p>` : ""}
          <p class="ez-ans">${shift ? '<i class="ez-dot is-shift" aria-hidden="true"></i>' : ""}${esc(ans)}</p>
        </div>
        ${body ? `<p class="ez-body">${esc(body)}</p>` : ""}
      </article>`, "ap-ez-lk");
  }

  /* the three big buttons: the core's own acts, so the BM steps, the symptoms and the meal sheet open as usual */
  const bigBtn = (act, iconHtml, title, sub, o = {}) => `<button type="button" class="ap-ez-big${o.cls ? ` ${o.cls}` : ""}" data-act="${act}"${o.attrs || ""}><span class="ap-ez-ic" aria-hidden="true">${iconHtml}</span><span class="ap-ez-big-t"><b>${esc(title)}</b>${sub ? `<em>${esc(sub)}</em>` : ""}</span>${o.chev ? ic("chev", "ap-ez-go") : ""}</button>`;
  const doPart = () => `<div class="ap-ez-do" data-a role="group" aria-label="Add to today">
      ${bigBtn("open-bm", RU.glyph(4), "I had a BM", "", { cls: "ap-ez-big--bm" })}
      ${bigBtn("open-sym", ic("sym"), "Something feels off", "")}
      ${bigBtn("open-meal", ic("meal"), "What I ate", "")}
    </div>`;

  /* the weekly check-in: only when it's on, and only when it's due or just saved */
  function checkinPart(M, V) {
    if (!RU.ckOn(V)) return "";
    const ck = M.checkin, q = L.CHECKIN.length;
    const k = M.ckDraft ? M.ckDraft.answers.filter((v) => v != null).length : 0;
    if (ck.status === "due") {
      return `<section class="ap-ez-card ap-ez-ck" data-a aria-labelledby="ezck${V.uid}">
          <p class="ap-ez-kick">${ic("ck")}<span>${esc(`Weekly check-in. ${RU.dueText(M)}.`)}</span></p>
          <h2 class="ap-ez-h2" id="ezck${V.uid}">How did this week go?</h2>
          <p class="ap-ez-p">${esc(k ? `${cap(num(k))} of ${num(q)} answered. Pick up where you left off.` : `${cap(num(q))} short questions, about a minute.`)}</p>
          <div class="ap-ez-acts"><button type="button" class="ap-btn ap-btn--2 ap-btn--block" data-act="ck-start">${k ? "Continue" : "Start"}</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="ck-skip">Not this week</button></div>
        </section>`;
    }
    if (ck.status === "done") return bigBtn("ck-result", ic("check"), "Check-in saved", "See your answers", { cls: "ap-ez-big--card", chev: true, attrs: " data-a" });
    return "";
  }

  /* the library's Easy read week card. On a person's first day it covers one day, so its side says Today rather than
     "Oct 11 to today" */
  const weekDays = (D) => (D && D.days && D.days[7] ? D.days[7] : []);
  const weekCard = (D, V) => card(D, V, "week", (h) => {
    const ds = weekDays(D);
    return ds.length === 1 && ds[0].today ? h.replace(/<p class="ez-side">[^<]*<\/p>/, '<p class="ez-side">Today</p>') : h;
  });
  /* This week: the library's Easy read week card, then the way to the rest of Insights. Until the week has two days
     the card would only repeat today's logs, with a second big count under the FloraScore's, so Today leaves it off */
  function weekPart(D, M, V) {
    const wk = weekDays(D).length >= 2 ? weekCard(D, V) : "";
    const more = V.plan === "free"
      ? bigBtn("pay", ic("lock"), "More weeks", "With Florin membership", { cls: "ap-ez-big--line", attrs: ' data-pay="range"' })
      : bigBtn("tab", ic("bars"), "More about your weeks", `Your score, timing, form, symptoms${RU.ckOn(V) ? ", the check-in" : ""} and patterns`, { cls: "ap-ez-big--line", chev: true, attrs: ' data-tab="insights" data-range="30"' });
    return `<section class="ap-ez-sec" data-a aria-label="This week">${wk ? box(wk, "ap-ez-lk") : ""}${more}</section>`;
  }

  /* today's logs: the app's own rows (RU.entryRow), drawn big by the CSS */
  function entriesPart(M, V) {
    const es = todayOf(M);
    const hasBm = es.some((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
    const list = es.length ? `<ol class="ap-card ap-tl ap-ez-tl">${es.map((e) => RU.entryRow(e, M, V)).join("")}</ol>` : `<p class="ap-ez-none">Nothing logged yet today. What you add shows here, in time order.</p>`;
    const nob = !hasBm && !hasNo && L.isLate() ? bigBtn("nobm", ic("nobm"), "No BM today", "Note it, so the day doesn't read as a gap", { cls: "ap-ez-big--line" }) : "";
    return `<section class="ap-ez-sec" data-a aria-labelledby="ezlog${V.uid}">
        <div class="ap-ez-sec-h"><h2 class="ap-ez-h2" id="ezlog${V.uid}">Today's logs</h2><p class="ap-ez-count">${esc(es.length ? plural(es.length, "entry", "entries") : "None yet")}</p></div>
        ${list}${nob}
      </section>`;
  }

  function today(M, V) {
    const D = dataOf(M, V);
    const symOn = todayOf(M).some((e) => e.kind === "sym") || RU.week(M, V.form).symDays.length > 0;
    return `<div class="ap-scr ap-ez ap-ez-today">
        ${topPart(M)}
        <p class="ap-ez-say" data-a>${esc(sentence(M))}</p>
        ${scorePart(D, M)}
        ${doPart()}
        ${checkinPart(M, V)}
        ${weekPart(D, M, V)}
        ${entriesPart(M, V)}
        <p class="ap-fine">${esc(`${SCORE_NOTE} ${DISC}${symOn ? ` ${CLIN}` : ""}`)}</p>
      </div>`;
  }

  /* ====================================================================== */
  /* YOUR WEEKS: Insights, folded under Today                                 */
  /* ====================================================================== */
  const FOOD_MSG = () => `A food check asks for one line a day for ${L.FOOD_CHECK_DAYS} days, good days too, then shows what tends to follow. It comes with the next pass.`;
  function weeks(M, V) {
    if (!look()) throw new Error("the Easy read look isn't loaded");
    const D = dataOf(M, V), ck = RU.ckOn(V);
    const ckCard = () => card(D, V, "checkin", (h) => h.replace(/<button type="button" class="ez-btn">/g, '<button type="button" class="ez-btn" data-act="ck-start">'));
    const patCard = () => card(D, V, "pattern", (h) => h.replace(/<button type="button" class="ez-btn">/g, `<button type="button" class="ez-btn" data-act="toast" data-msg="${esc(FOOD_MSG())}">`));
    const lock = `<section class="ap-ez-card ap-ez-lock" aria-labelledby="ezlock${V.uid}">
        <p class="ap-ez-kick">${ic("lock")}<span>Florin membership</span></p>
        <h2 class="ap-ez-h2" id="ezlock${V.uid}">The last 30 days, and what moved your score</h2>
        <p class="ap-ez-p">Membership adds 30 and 90 days, what moved your FloraScore, possible patterns, Ask Florin and a report for your clinician.</p>
        <button type="button" class="ap-btn ap-btn--block" data-act="pay" data-pay="range">See Florin membership</button>
      </section>`;
    /* a member's card that has an Insights twin carries Ask about this, as an Insights card does, so Ask opens with
       that card's numbers loaded */
    const ASK = { score: "score", timing: "timing", often: "often", form: "form", symptoms: "sym", checkin: "ck", pattern: "pat" };
    /* it goes above the card's closing note (the disclaimer), or at its foot */
    const withAsk = (k, h) => {
      if (V.plan === "free" || !ASK[k] || !h) return h;
      const btn = `<button type="button" class="ap-ez-link ap-ez-ask" data-act="ask-about" data-k="${ASK[k]}">${ic("chat")}<span>Ask about this</span></button>`;
      const tail = /(<p class="ez-note"[^>]*>[^<]*<\/p>\s*<\/article>\s*)$/;
      return tail.test(h) ? h.replace(tail, `${btn}$1`) : h.replace(/<\/article>\s*$/, `${btn}</article>`);
    };
    const cards = V.plan === "free"
      ? [weekCard(D, V), ck ? ckCard() : ""]
      : [["score", card(D, V, "score")], ["parts", card(D, V, "parts")], ["trend", card(D, V, "trend")], ["month", card(D, V, "month")], ["timing", card(D, V, "timing")], ["often", card(D, V, "often")], ["form", card(D, V, "form")], ["symptoms", card(D, V, "symptoms")], ["checkin", ck ? ckCard() : ""], ["pattern", patCard()]].map(([k, h]) => withAsk(k, h));
    return `<div class="ap-scr ap-ez ap-ez-weeks">
        <button type="button" class="ap-ez-nav" data-act="tab" data-tab="today">${ic("back")}<span>Back to Today</span></button>
        <header class="ap-hist-top" data-a><h1 class="ap-h1" tabindex="-1">Your weeks</h1><p class="ap-hi-sub">${esc(V.plan === "free" ? "This week, from your own logs." : "Every card reads you against your own usual.")}</p></header>
        ${box(cards.filter(Boolean).join(""), "ap-ez-cards")}
        ${V.plan === "free" ? lock : ""}
        <p class="ap-fine">${esc(`${DISC} ${CLIN}`)}</p>
      </div>`;
  }

  /* ====================================================================== */
  /* PLUS                                                                     */
  /* ====================================================================== */
  /* the words of the current option (A, B or C), hardest first, with their marks */
  const wordsOf = (mode) => (mode === "B"
    ? L.WORDS.map((w) => ({ attr: `data-word="${w.k}"`, g: w.glyph, name: w.word, sub: "", line: w.line, aria: `${w.word}: ${w.line}`, form: null, word: w.k }))
    : L.TYPES.slice(1).map((t) => ({ attr: `data-form="${t.k}"`, g: t.k, name: mode === "A" ? `Type ${t.k}` : t.short, sub: mode === "A" ? t.short : "", line: t.line, aria: `${mode === "A" ? `Type ${t.k}, ` : ""}${t.short}: ${t.line}`, form: t.k, word: null })));

  function plus(M, V, st = {}) {
    const mode = V.form, d = st.d != null ? st.d : L.TODAY, isToday = d === L.TODAY;
    const x = L.day(M, d), es = x && x.logged ? x.entries : [];
    const bms = es.filter((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
    const full = V.bmUI === "full";
    /* the core's rule: a word saves at once only today, with quick tiles, after the first few BMs */
    const quick = isToday && !full && RU.bmCount(M) >= RU.QUICK_AFTER;
    const hid = `ezp${V.uid}`;
    const ws = wordsOf(mode);
    /* I had a BM is always a big button into the four steps, and takes focus when plus opens, so a stray Enter never
       saves a BM. With quick tiles the words sit under it, each one tap */
    const bm = full
      ? bigBtn("open-bm", RU.glyph(4), "I had a BM", "A few short questions, one at a time", { cls: "ap-ez-big--bm", chev: true, attrs: " data-autofocus" })
      : `<section class="ap-ez-pbm" aria-label="I had a BM">
          ${bigBtn("open-bm", RU.glyph(4), "I had a BM", "A few short questions, one at a time", { cls: "ap-ez-big--bm ap-ez-pbm-h", chev: true, attrs: " data-autofocus" })}
          <p class="ap-ez-pbm-p" id="${hid}-w">${esc(quick ? "Or tap the closest one to save it now. Hardest first." : "Or start with the closest one. Hardest first.")}</p>
          <div class="ap-ez-words" role="group" aria-labelledby="${hid}-w">${ws.map((w) => `<button type="button" class="ap-ez-word" data-act="${quick ? "quick-bm" : "open-bm"}" ${w.attr} aria-label="${esc(`${w.aria}. ${quick ? "Saves it now" : "Opens the BM steps"}`)}">${RU.glyph(w.g)}<span><b>${esc(w.name)}</b>${w.sub ? `<em>${esc(w.sub)}</em>` : ""}</span></button>`).join("")}<button type="button" class="ap-ez-word ap-ez-word--guide" data-act="guide">${ic("info")}<span><b>What the words mean</b></span></button></div>
        </section>`;
    const last = bms.length ? `<p class="ap-ez-last">${esc(`Last BM ${isToday ? "today" : "that day"}: ${T(bms[bms.length - 1].t)}`)}</p>` : hasNo ? `<p class="ap-ez-last">${esc(`You noted no BM ${isToday ? "today" : "that day"}.`)}</p>` : "";
    const ck = M.checkin, q = L.CHECKIN.length, k = M.ckDraft ? M.ckDraft.answers.filter((v) => v != null).length : 0;
    const ckSub = ck.status === "due" ? (k ? `${cap(num(k))} of ${num(q)} answered` : `${RU.dueText(M)}, about a minute`) : ck.status === "done" ? "Saved. See your answers" : "Skipped this week. You can still do it";
    const rows = [
      bigBtn("open-sym", ic("sym"), "Something feels off", "Bloating, pain, cramping and more", { chev: true }),
      bigBtn("open-meal", ic(V.mealUI === "detailed" ? "meal" : "mic"), "What I ate", V.mealUI === "detailed" ? "One meal at a time" : "Say it or type it", { chev: true }),
      isToday && RU.ckOn(V) ? bigBtn(ck.status === "done" ? "ck-result" : "ck-start", ic("ck"), "Weekly check-in", ckSub, { chev: true }) : "",
      !bms.length && !hasNo && (!isToday || L.isLate()) ? bigBtn("nobm", ic("nobm"), `No BM ${isToday ? "today" : "that day"}`, "So the day doesn't read as a gap", { cls: "ap-ez-big--line" }) : "",
      isToday ? (M.start < L.TODAY ? bigBtn("plus-earlier", ic("cal"), "Add to an earlier day", "Up to a week back", { cls: "ap-ez-big--line", chev: true }) : "")
        : bigBtn("plus-day", ic("back"), "Back to today", "", { cls: "ap-ez-big--line", attrs: ` data-v="${L.TODAY}"` })
    ].filter(Boolean).join("");
    return `<div class="ap-psh ap-ez ap-ez-plus" role="dialog" aria-modal="true" aria-labelledby="${hid}">
        <div class="ap-sheet-grab" aria-hidden="true"></div>
        <div class="ap-psh-h ap-ez-sh-h"><h2 id="${hid}">${esc(isToday ? "What would you like to add?" : `Add to ${dayIn(d)}`)}</h2><button type="button" class="ap-ez-nav" data-act="close">${ic("close")}<span>Close</span></button></div>
        ${isToday ? "" : `<p class="ap-ez-info">${ic("cal")}<span>${esc(`Catching up. Everything here is logged for ${dayIn(d)}.`)}</span></p>`}
        ${bm}${last}
        <div class="ap-ez-col">${rows}</div>
      </div>`;
  }

  /* ====================================================================== */
  /* LOG A BM: one question per screen                                        */
  /* ====================================================================== */
  /* the step state lives on the BM's own draft (st.ez), so a half-done log keeps its place */
  const usualFirst = (M) => (M.usual ? Math.round(((M.usual.tLo + M.usual.tHi) / 2) * 4) / 4 : 8);
  /* a day already chosen (catching up from plus, or an older entry): step 2 asks only the hour */
  const fixedDay = (st) => (st.edit ? (st.d < L.TODAY - 1 ? st.d : null) : st.d !== L.TODAY ? st.d : null);
  const whenOf = (st) => (st.d === L.TODAY ? (Math.abs(st.t - L.NOW) < 1 / 60 ? "now" : "today") : st.d === L.TODAY - 1 ? "yesterday" : "day");
  function ezOf(st) {
    if (!st.ez || typeof st.ez !== "object") {
      const has = st.form != null || st.word != null;
      st.ez = { step: st.edit ? (st.details ? 3 : 4) : has ? 2 : 1, when: st.edit ? whenOf(st) : null, pick: null, ret: !!(st.edit && st.details), day: fixedDay(st), tm: 0 };
      /* Add details (from the toast) has landed on step 3, at its top: the core's focus then has nothing to scroll to,
         so Back, Close and the step counter stay in view */
      st.details = false;
    }
    return st.ez;
  }
  /* yesterday, only when the person had joined by then */
  const hasYesterday = (M) => !!M && L.TODAY - 1 >= M.start;
  /* every hour of the day, midnight on: waking at night to go is an alarm feature, so its time has to be loggable */
  const hoursFor = (which) => {
    const top = which === "today" ? Math.floor(L.NOW + 1e-6) : 23, hs = [];
    for (let h = 0; h <= top; h++) hs.push(h);
    return hs;
  };
  const PARTS = [["Night", 0, 4], ["Morning", 5, 11], ["Afternoon", 12, 16], ["Evening", 17, 23]];
  const whenText = (st, z) => {
    const t = T(st.t);
    if (st.d === L.TODAY) return z.when === "now" ? `Just now, ${t}` : `Today, ${t}`;
    if (st.d === L.TODAY - 1) return `Yesterday, ${t}`;
    return `${RU.dayName(st.d)}, ${t}`;
  };
  const xtPicked = (st) => [st.how && st.how.rush ? L.HOW.find(([k]) => k === "rush")[1] : null].concat(L.FLAGS.filter(([k]) => st.flags && st.flags[k]).map(([, l]) => l)).filter(Boolean);
  const optBtn = (act, attrs, mark, title, sub, isOn, o = {}) => `<button type="button" class="ap-ez-opt${o.cls ? ` ${o.cls}` : ""}${isOn ? " is-on" : o.maybe ? " is-maybe" : ""}" data-act="${act}" ${attrs} ${o.multi ? `aria-pressed="${isOn}"` : `role="radio" aria-checked="${isOn}"`}${o.aria ? ` aria-label="${esc(o.aria)}"` : ""}>${o.multi ? `<span class="ap-ez-box" aria-hidden="true">${isOn ? ic("check") : ""}</span>` : `<span class="ap-ez-mark" aria-hidden="true">${mark}</span>`}<span class="ap-ez-opt-t">${!isOn && o.maybe && o.maybeT ? `<span class="ap-ez-maybe">${esc(o.maybeT)}</span>` : ""}<b>${esc(title)}</b>${sub ? `<em>${esc(sub)}</em>` : ""}</span>${!o.multi && isOn ? ic("check", "ap-ez-tick") : ""}</button>`;

  function bm(M, V, st) {
    const z = ezOf(st), mode = V.form, id = `ezb${V.uid}`;
    const n = z.step, hourScreen = n === 2 && (z.pick || z.day != null);
    /* Back: out of the hour list, back to the answer list (or the review, after a Change), else a step back; the first
       step, and the review of a saved entry, close */
    const closes = (n === 1 && !z.ret) || (st.edit && n === 4);
    const bar = `<div class="ap-ez-bar">
        <button type="button" class="ap-ez-nav" data-act="${closes ? "close" : "ez-back"}">${ic(closes ? "close" : "back")}<span>${closes ? "Close" : "Back"}</span></button>
        <p class="ap-ez-step" id="${id}-st">Step ${n} of ${STEPS}</p>
      </div>
      <div class="ap-ez-prog" aria-hidden="true">${Array.from({ length: STEPS }, (_, i) => `<i class="${i + 1 < n ? "is-done" : i + 1 === n ? "is-on" : ""}"></i>`).join("")}</div>`;
    const q = (text) => `<h2 class="ap-ez-q" id="${id}-q" tabindex="-1" data-autofocus aria-describedby="${id}-st">${esc(text)}</h2>`;
    let body = "", foot = "";
    if (n === 1) {
      const sel = st.form != null || st.word != null;
      /* a BM logged as a word in B, seen in A or C: its steps are marked in words, not by an outline alone */
      const wl = mode !== "B" && st.form == null && st.word != null ? L.WORDS[st.word] : null;
      const maybeT = wl ? (wl.types.length > 1 ? "Could be this one" : "The same as your word") : "";
      const rows = wordsOf(mode).map((w) => {
        const isOn = mode === "B" ? st.word === w.word || (st.form != null && L.wordOf(st.form) === w.word) : st.form === w.form;
        const maybe = !!wl && wl.types.includes(w.form);
        return optBtn("ez-form", w.attr, RU.glyph(w.g), mode === "A" ? `${w.name}: ${w.sub}` : w.name, w.line, isOn, { maybe, maybeT });
      }).join("");
      const wlLine = wl ? (wl.types.length > 1 ? `You logged ${wl.word}, which could be either of the ${num(wl.types.length)} marked "Could be this one". Tap one to be exact, or tap Next to keep ${wl.word}.` : `You logged ${wl.word}, the one marked "The same as your word". Tap Next to keep it.`) : "";
      body = `${q("What did it look like?")}<p class="ap-ez-sub">Tap the closest one. It doesn't need to be exact.</p>
        ${wlLine ? `<p class="ap-ez-info">${ic("info")}<span>${esc(wlLine)}</span></p>` : ""}
        <div class="ap-ez-opts" role="radiogroup" aria-labelledby="${id}-q">${rows}</div>
        <button type="button" class="ap-ez-link" data-act="guide">${ic("info")}<span>What the words mean</span></button>`;
      if (sel) foot = `<button type="button" class="ap-btn ap-btn--block" data-act="ez-next">Next</button>`;
    } else if (n === 2 && !hourScreen) {
      const opts = [["now", "Just now", T(L.NOW)], ["today", "Earlier today", z.when === "today" ? T(st.t) : "Pick the hour"], hasYesterday(M) ? ["yesterday", "Yesterday", z.when === "yesterday" ? T(st.t) : "Pick the hour"] : null].filter(Boolean);
      body = `${q("When was it?")}
        <div class="ap-ez-opts" role="radiogroup" aria-labelledby="${id}-q">${opts.map(([v, t, s]) => optBtn("ez-when", `data-v="${v}"`, ic(v === "now" ? "clock" : "cal"), t, s, z.when === v)).join("")}</div>`;
      if (z.when) foot = `<button type="button" class="ap-btn ap-btn--block" data-act="ez-next">Next</button>`;
    } else if (n === 2) {
      const which = z.day != null ? "day" : z.pick;
      const d = which === "today" ? L.TODAY : which === "yesterday" ? L.TODAY - 1 : z.day;
      const hs = hoursFor(which === "today" ? "today" : "other");
      const isOn = (h) => z.when === which && st.d === d && Math.floor(st.t + 1e-6) === h;
      const title = d === L.TODAY ? "About what time today?" : d === L.TODAY - 1 ? "About what time yesterday?" : `About what time on ${RU.dayName(d)}?`;
      const groups = PARTS.map(([nm, a, b]) => {
        const in1 = hs.filter((h) => h >= a && h <= b);
        return in1.length ? `<div class="ap-ez-hgrp"><p class="ap-ez-hgrp-l" id="${id}-${nm}">${nm}</p><div class="ap-ez-hrs" role="radiogroup" aria-labelledby="${id}-${nm}">${in1.map((h) => `<button type="button" class="ap-ez-hr${isOn(h) ? " is-on" : ""}" data-act="ez-hour" data-v="${h}" role="radio" aria-checked="${isOn(h)}">${isOn(h) ? ic("check") : ""}${esc(T(h))}</button>`).join("")}</div></div>` : "";
      }).join("");
      body = `${q(title)}<p class="ap-ez-sub">The nearest hour is close enough.</p>${groups}`;
      if (z.when === which && which !== null) foot = `<button type="button" class="ap-btn ap-btn--block" data-act="ez-next">Next</button>`;
    } else if (n === 3) {
      const rush = L.HOW.find(([k]) => k === "rush");
      const anyFlag = L.FLAGS.some(([k]) => st.flags && st.flags[k]);
      const any = (st.how && st.how.rush) || anyFlag;
      body = `${q("Anything else?")}<p class="ap-ez-sub">Tap any that fit. It's fine to skip this.</p>
        <div class="ap-ez-opts" role="group" aria-labelledby="${id}-q">${optBtn("ez-xt", `data-v="${rush[0]}"`, "", rush[1], "", !!(st.how && st.how.rush), { multi: true })}</div>
        <h3 class="ap-ez-h3" id="${id}-fl">Did you notice any of these?</h3>
        <div class="ap-ez-opts" role="group" aria-labelledby="${id}-fl">${L.FLAGS.map(([k, l]) => optBtn("ez-xt", `data-v="${k}"`, "", l, "", !!(st.flags && st.flags[k]), { multi: true, cls: "ap-ez-opt--flag" })).join("")}</div>
        ${anyFlag ? `<p class="ap-info">${ic("info")}<span>After you save, Florin shows when to talk to a clinician. It won't try to read this.</span></p>` : ""}`;
      foot = `<button type="button" class="ap-btn ap-btn--block" data-act="ez-next">${any ? "Next" : "Nothing else, next"}</button>`;
    } else {
      const x = st.form != null ? st.form : st.word != null ? { form: null, word: st.word } : null;
      const picked = xtPicked(st);
      const also = [...L.HOW.filter(([k]) => k !== "rush" && st.how && st.how[k]).map(([, l]) => l), st.dur != null ? L.DURATION[st.dur] : null].filter(Boolean);
      const anyFlag = L.FLAGS.some(([k]) => st.flags && st.flags[k]);
      const row = (k, v, step) => `<li><span class="ap-ez-rev-k">${esc(k)}</span><b>${esc(v)}</b><button type="button" class="ap-ez-chg" data-act="ez-goto" data-v="${step}">Change<span class="sr"> ${esc(lower1(k))}</span></button></li>`;
      body = `${q(st.edit ? "This BM" : "Ready to save")}<p class="ap-ez-sub">${esc(st.edit ? "Tap Change to fix anything, then save." : "Check it, then tap Save. Tap Change to fix anything.")}</p>
        <ul class="ap-ez-rev">
          ${row("What it looked like", x == null ? "Not picked yet" : mode === "A" && typeof x === "number" ? `${L.formName(x, mode)}, ${L.TYPES[x].short}` : L.formName(x, mode), 1)}
          ${row("When", whenText(st, z), 2)}
          ${row("Anything else", picked.length ? cap(andList(picked.map((p, i) => (i ? lower1(p) : p)))) : "Nothing else", 3)}
        </ul>
        ${also.length || (st.note || "").trim() ? `<p class="ap-ez-p">${esc([also.length ? `Also noted: ${andList(also.map((a, i) => (i ? lower1(a) : a)))}.` : "", (st.note || "").trim() ? `Note: ${st.note.trim()}` : ""].filter(Boolean).join(" "))}</p>` : ""}
        ${anyFlag ? `<p class="ap-info">${ic("info")}<span>After you save, Florin shows when to talk to a clinician. It won't try to read this.</span></p>` : ""}`;
      foot = `<button type="button" class="ap-btn ap-btn--block" data-act="save-bm">${st.edit ? "Save changes" : "Save BM"}</button>${st.edit ? `<button type="button" class="ap-ez-del" data-act="delete">${ic("trash")}<span>Delete this BM</span></button>` : ""}`;
    }
    return `<div class="ap-fsh ap-ez ap-ezb" role="dialog" aria-modal="true" aria-label="${st.edit ? "Change this BM" : "Log a BM"}">
        ${bar}
        <div class="ap-fsh-b ap-ez-b" data-scroll>${body}</div>
        ${foot ? `<div class="ap-fsh-f ap-ez-foot">${foot}</div>` : ""}
      </div>`;
  }

  /* moving between steps: the new question takes focus, so a screen reader hears it with its step */
  function goStep(a, ov, step) {
    const z = ov.st.ez;
    clearTimeout(z.tm);
    z.step = step; z.pick = null;
    if (step === STEPS) z.ret = false;
    a.rerender(ov, { noRestore: true });
    const sc = ov.el.querySelector("[data-scroll]"); if (sc) sc.scrollTop = 0;
    const h = ov.el.querySelector(".ap-ez-q"); if (h) h.focus({ preventScroll: true });
  }
  /* a pick shows for a moment, then the next question comes, as the check-in does; after a Change, the review */
  function advance(a, ov, to) {
    const z = ov.st.ez;
    clearTimeout(z.tm);
    z.tm = setTimeout(() => { try { if (a.top() === ov && ov.st.ez === z) goStep(a, ov, z.ret ? STEPS : to); } catch (e) { warn("moving to the next step", e); } }, 400);
  }
  const bmTop = (a) => { const ov = a && a.top(); return ov && ov.type === "bm" && ov.st && ov.st.ez ? ov : null; };
  const ACTS = {
    "ez-form"(b, a) {
      const ov = bmTop(a); if (!ov) return;
      const st = ov.st;
      if (b.dataset.word != null) { st.word = +b.dataset.word; st.form = null; } else { st.form = +b.dataset.form; st.word = null; }
      const x = st.form != null ? st.form : { form: null, word: st.word };
      a.rerender(ov);
      a.say(`${L.formName(x, a.S.form)} picked.`);
      advance(a, ov, 2);
    },
    "ez-when"(b, a) {
      const ov = bmTop(a); if (!ov) return;
      const st = ov.st, z = st.ez, v = b.dataset.v;
      clearTimeout(z.tm);
      /* a day before the person joined has nowhere to keep a log */
      if (v === "yesterday" && !hasYesterday(a.M())) return;
      if (v === "now") {
        st.d = L.TODAY; st.t = L.NOW; st.tTouched = false; z.when = "now";
        a.rerender(ov);
        a.say(`Just now, ${T(L.NOW)}.`);
        advance(a, ov, 3);
        return;
      }
      z.pick = v;
      a.rerender(ov, { noRestore: true });
      const h = ov.el.querySelector(".ap-ez-q"); if (h) h.focus({ preventScroll: true });
    },
    "ez-hour"(b, a) {
      const ov = bmTop(a); if (!ov) return;
      const st = ov.st, z = st.ez, h = +b.dataset.v;
      const which = z.day != null ? "day" : z.pick || "today";
      if (which === "yesterday" && !hasYesterday(a.M())) return;
      st.d = which === "today" ? L.TODAY : which === "yesterday" ? L.TODAY - 1 : z.day;
      st.t = h; st.tTouched = true; z.when = which;
      a.rerender(ov);
      a.say(`${T(h)} picked.`);
      advance(a, ov, 3);
    },
    "ez-xt"(b, a) {
      const ov = bmTop(a); if (!ov) return;
      const st = ov.st, v = b.dataset.v;
      if (v === "rush") { st.how = st.how || {}; st.how.rush = !st.how.rush; } else { st.flags = st.flags || {}; st.flags[v] = !st.flags[v]; }
      a.rerender(ov);
    },
    "ez-next"(b, a) { const ov = bmTop(a); if (ov) goStep(a, ov, ov.st.ez.ret ? STEPS : Math.min(STEPS, ov.st.ez.step + 1)); },
    "ez-back"(b, a) {
      const ov = bmTop(a); if (!ov) return a.pop();
      const z = ov.st.ez;
      clearTimeout(z.tm);
      if (z.step === 2 && z.pick && z.day == null) { z.pick = null; a.rerender(ov, { noRestore: true }); const h = ov.el.querySelector(".ap-ez-q"); if (h) h.focus({ preventScroll: true }); return; }
      if (z.ret) return goStep(a, ov, STEPS);
      if (z.step > 1) return goStep(a, ov, z.step - 1);
      a.pop();
    },
    "ez-goto"(b, a) { const ov = bmTop(a); if (!ov) return; ov.st.ez.ret = true; goStep(a, ov, +b.dataset.v); },
    "ez-sym-t"(b, a) {
      const ov = a.top(); if (!ov || ov.type !== "sym" || !ov.st) return;
      const h = +b.dataset.v;
      ov.st.t = h; ov.st.tTouched = true;
      a.rerender(ov);
      a.say(`About ${T(h)} picked.`);
    }
  };
  Object.entries(ACTS).forEach(([k, f]) => { EXT.acts[k] = (b, a, e) => { try { return f(b, a || api(), e); } catch (err) { warn(`the ${k} tap`, err); } }; });
  /* catching up: plus moves to another day and the core focuses its BM header, which Easy's plus doesn't have. The
     core's act runs as it is; Easy then puts focus on the first BM control */
  const corePlusDay = EXT.acts["plus-day"];
  EXT.acts["plus-day"] = (b, a, e) => {
    const r = corePlusDay ? corePlusDay(b, a, e) : a.core("plus-day", b, e);
    try {
      if (a && a.S && a.S.easy) requestAnimationFrame(() => { const t = a.top(); const el = t && t.type === "plus" && t.el.querySelector("[data-autofocus]"); if (el) el.focus({ preventScroll: true }); });
    } catch (err) { warn("focus after a day change", err); }
    return r;
  };

  /* ====================================================================== */
  /* SYMPTOMS: big chips, and strength as three big buttons                   */
  /* ====================================================================== */
  /* catching up a symptom for an earlier day: about when, as the part of the day with its hour written on it. Midday is
     what the app keeps when nothing is picked, so it shows as picked and is never a time the person didn't see */
  const POD = [["Morning", 9], ["Midday", 12], ["Afternoon", 15], ["Evening", 19], ["Night", 22]];
  const podPart = (st, id) => {
    if (st.d === L.TODAY || st.edit) return "";
    const isOn = (h) => Math.abs(st.t - h) < 1 / 120;
    return `<h3 class="ap-ez-h3" id="${id}-t">${esc(st.d === L.TODAY - 1 ? "About when yesterday?" : `About when on ${RU.dayName(st.d)}?`)}</h3>
      <div class="ap-ez-hrs ap-ez-pod" role="radiogroup" aria-labelledby="${id}-t">${POD.map(([nm, h]) => `<button type="button" class="ap-ez-hr${isOn(h) ? " is-on" : ""}" data-act="ez-sym-t" data-v="${h}" role="radio" aria-checked="${isOn(h)}"><span><b>${isOn(h) ? ic("check") : ""}${esc(nm)}</b><em>${esc(`about ${T(h)}`)}</em></span></button>`).join("")}</div>`;
  };
  function sym(M, V, st) {
    const id = `ezs${V.uid}`, names = L.SYMPTOMS.concat(st.custom || []), has = (n) => st.items.some((i) => i.name === n), picked = st.items.length > 0;
    return `<div class="ap-fsh ap-ez ap-ezs" role="dialog" aria-modal="true" aria-labelledby="${id}-q">
        <div class="ap-ez-bar"><button type="button" class="ap-ez-nav" data-act="close">${ic("close")}<span>Close</span></button>${st.d !== L.TODAY ? `<p class="ap-ez-step">${esc(RU.dayName(st.d))}</p>` : ""}</div>
        <div class="ap-fsh-b ap-ez-b" data-scroll>
          <h2 class="ap-ez-q" id="${id}-q" tabindex="-1" data-autofocus>${st.edit ? "These symptoms" : "What feels off?"}</h2>
          <p class="ap-ez-sub">Tap any that fit.</p>
          <div class="ap-chs ap-chs--wrap ap-ez-chips" role="group" aria-labelledby="${id}-q">${names.map((n) => `<button type="button" class="ap-ch${has(n) ? " is-on" : ""}" data-act="sym" data-v="${esc(n)}" aria-pressed="${has(n)}">${has(n) ? ic("check") : ""}${esc(n)}</button>`).join("")}</div>
          ${st.adding ? `<div class="ap-ez-add"><label class="ap-ez-l" for="${id}-new">Name it</label><div class="ap-sy-add"><input id="${id}-new" class="ap-in" data-in="newsym" type="text" enterkeyhint="done" value="${esc(st.newName || "")}" autocomplete="off"><button type="button" class="ap-btn" data-act="sym-add">Add</button></div></div>`
            : bigBtn("sym-other", ic("plus"), "Something else", "", { cls: "ap-ez-big--line" })}
          ${picked ? `<h3 class="ap-ez-h3" id="${id}-s">How strong is it?</h3><div class="ap-chs ap-chs--wrap ap-ez-str" role="radiogroup" aria-labelledby="${id}-s">${L.STRENGTH.map((l, i) => `<button type="button" class="ap-ch${st.s === i + 1 ? " is-on" : ""}" data-act="str" data-v="${i + 1}" role="radio" aria-checked="${st.s === i + 1}">${st.s === i + 1 ? ic("check") : ""}${esc(l)}</button>`).join("")}</div><p class="ap-ez-sub">At its worst. It's fine to leave this.</p>` : ""}
          ${podPart(st, id)}
          <p class="ap-info">${ic("info")}<span>${esc(ALARM_LINE)}</span></p>
        </div>
        <div class="ap-fsh-f ap-ez-foot">
          ${picked ? "" : `<p class="ap-fsh-hint" id="${id}-hint" aria-live="polite">Tap at least one to save</p>`}
          <button type="button" class="ap-btn ap-btn--block" data-act="save-sym"${picked ? "" : ` aria-disabled="true" aria-describedby="${id}-hint"`}>${st.edit ? "Save changes" : "Save symptoms"}</button>
          ${st.edit ? `<button type="button" class="ap-ez-del" data-act="delete">${ic("trash")}<span>Delete this entry</span></button>` : ""}
        </div>
      </div>`;
  }

  /* ====================================================================== */
  /* THE WRAPPERS                                                             */
  /* ====================================================================== */
  /* each one draws the Easy screen when V.easy is on, and the screen it wraps (another module's, or the core's) when
     it's off or when the Easy one throws */
  const wrap = (name, mine, vAt = 1) => {
    const base = RU[name];
    if (typeof base !== "function") return;
    RU[name] = function (...args) {
      const V = args[vAt];
      try { sync(); } catch (e) { warn("syncing the phone", e); }
      if (on(V) && mine) {
        try { const html = mine(...args); if (html) return html; } catch (e) { warn(`RU.${name}`, e); }
      }
      return base.apply(this, args);
    };
  };
  wrap("today", today);
  wrap("insights", (M, V) => weeks(M, V));
  wrap("plus", plus);
  wrap("bm", bm);
  wrap("sym", sym);
  /* History, Ask and the Insights details keep their content: the CSS draws them bigger. Their wrappers only keep the
     root in step, and an Insights detail's Back says where it goes in Easy */
  wrap("history", null);
  /* Ask: the same content. Easy has no Insights tab, so its intro points to the cards in Your weeks, which carry Ask
     about this for a member; on Free those cards don't, so the line goes */
  {
    const base = RU.ask;
    if (typeof base === "function") {
      RU.ask = function (...args) {
        const html = base.apply(this, args);
        try {
          sync();
          const V = args[1];
          if (on(V) && typeof html === "string") {
            const h = html.replace(/Every Insights card can open it/g, "Every card in Your weeks can open it");
            return V.plan === "free"
              ? h.replace(/\s*Or tap Ask about this on any Insights card[^.<]*\./g, "").replace(/<p class="ap-askc-note">\s*<\/p>/g, "")
              : h.replace(/Or tap Ask about this on any Insights card/g, "Or tap Ask about this on a card in Your weeks");
          }
        } catch (e) { warn("RU.ask", e); }
        return html;
      };
    }
  }
  {
    const base = RU.idetail;
    if (typeof base === "function") {
      RU.idetail = function (...args) {
        const html = base.apply(this, args);
        try { sync(); if (on(args[1]) && typeof html === "string") return html.replace(/(<button type="button" class="ap-back" data-act="iback">[\s\S]*?<span>)Insights(<\/span>)/, "$1Your weeks$2"); } catch (e) { warn("RU.idetail", e); }
        return html;
      };
    }
  }

  /* ====================================================================== */
  /* WHAT THE PAGE KNOWS: screens, keys, notes, the decision                  */
  /* ====================================================================== */
  EXT.built.easy = [true];
  EXT.screens.push(["Easy version", [["ez-today", "Easy version: Today"], ["ez-bm", "Easy version: log a BM"]]]);
  EXT.opens["ez-today"] = (a) => { preview(a); };
  EXT.opens["ez-bm"] = (a) => {
    preview(a);
    a.act("open-bm", document.createElement("button"));
    const ov = a.top();
    if (ov && ov.type === "bm" && ov.st) { ov.st.ez = null; a.rerender(ov, { noRestore: true }); const h = ov.el.querySelector(".ap-ez-q"); if (h) h.focus({ preventScroll: true }); }
  };
  const chainKey = (name, f) => {
    const prev = EXT.keys[name];
    EXT.keys[name] = (o) => { let k = null; try { k = f(o); } catch (e) { warn(`the ${name} key`, e); } return k || (typeof prev === "function" ? prev(o) : undefined); };
  };
  const easyNow = () => { const a = api(); return !!(a && a.S && a.S.easy); };
  chainKey("tab:today", (o) => (o && o.st && o.st.easy ? "ez-today" : null));
  chainKey("tab:insights", (o) => (o && o.st && o.st.easy && !(o.st.ins && o.st.ins.k) ? "ez-weeks" : null));
  chainKey("bm", () => (easyNow() ? "ez-bm" : null));
  EXT.onSet.push((k, v, a) => {
    if (k === "easy") { if (!selfSet) auto = null; sync(a); }
    if (k === "theme") themes(a);
  });

  /* ---------- the notes ---------- */
  const BASIS = [
    "Guidance for older adults (W3C WAI's notes on older users, and the stricter WCAG 2.2 criteria it points to): body text 16px or more, contrast of 7:1 where possible (WCAG 1.4.6), targets of 44px or more (WCAG 2.5.5), one task per screen, a label on every icon, and no meaning carried by colour alone (WCAG 1.4.1).",
    "Here: body 18 to 20px, answers 28 to 32px, text in Ink (Forest on Cream is 12.7:1, and nothing is in Ink 3), every control 56px or more for a mild tremor, a word on every icon, and every colour paired with its word. The one exception is History as a calendar: its days are 64px tall but about 49px wide, since seven columns can't be wider on a phone; a day only shows its logs, so a tap on its neighbour costs one more tap and changes nothing.",
    "Apple asks for 44pt targets and Google for 48dp; 56px leaves room for an unsteady hand."
  ];
  const REC = "A setting, not a separate version: \"Larger text and simpler screens\" in Profile, offered once in onboarding. One app to build, test and clear with counsel, the same logs underneath, and a person, or someone helping them, can switch either way without losing anything.";
  const words = (mode) => (mode === "B" ? "five words" : "seven words");
  const quickLine = (M, P) => {
    const n = RU.bmCount(M), k = RU.QUICK_AFTER;
    if (P.bmUI === "full") return "With BM logging on Full form only, I had a BM is one button into the four steps, and no word saves on its own.";
    return n >= k ? `With quick tiles on, the ${words(P.form)} sit under I had a BM on the plus menu and one tap saves the BM, since ${M.P.name} has ${plural(n, "BM")} logged.` : `With quick tiles on, the ${words(P.form)} sit under I had a BM on the plus menu; a tap opens the steps with that word picked until ${plural(k - n, "more BM")} ${k - n === 1 ? "is" : "are"} logged.`;
  };
  EXT.decisions.easy = (M, P) => ({
    t: "Version: standard, or easy",
    lede: `An easier version of the whole app, for a 70-year-old with reading glasses, a mild tremor and little patience for charts, or anyone who wants less on screen. The same logs and the same numbers, said more simply and bigger: type about a third larger, every control 56px or more with its words on it, a BM logged one question at a time, and Insights folded into Today as This week. Easy has its own Today, so Home doesn't change it, and it always draws the Easy read data style.`,
    opts: [
      [false, "As built: Today with the FloraScore card and the week as strips, Insights as its own tab, and a BM on one form."],
      [true, `Larger text and simpler screens. Today: a greeting, one sentence about the day, FloraScore as a big number, three big buttons (I had a BM, Something feels off, What I ate), ${P.checkin ? "the check-in when it's due, " : ""}this week as day circles, and today's logs. A BM in four short steps, symptoms as big chips, History and Ask bigger with the same content.`]
    ],
    rec: REC,
    open: [
      "A setting in Profile, or a version of its own? A setting is recommended.",
      "Offer it in onboarding as one question (\"Would you like larger text and simpler screens?\"), or turn it on when the phone's own text size is set large?",
      `${quickLine(M, P)} Keep the one-tap save in Easy, or always go through the steps, since a tremor brings mis-taps?`,
      "Insights folds into Today here: This week on Today, the rest one button away. Or keep it a tab?",
      `${P.history === "calendar" ? "History is the calendar on the phone now. " : ""}With History as a calendar, Easy keeps it, days 64px tall and about 49px wide. Keep it, or show Easy the list, one big row a day?`
    ],
    res: BASIS
  });
  EXT.notes["ez-today"] = (M, P) => {
    const n = RU.week(M, P.form), wd = Math.min(7, L.TODAY - M.start + 1);
    const wkText = wd >= 2 ? `this week as ${num(wd)} day circles` : "this week once there's a second day to show (on day one it would only repeat today's logs)";
    return {
      t: "Easy version: Today",
      lede: `One screen, read top to bottom: a greeting, one plain sentence about today, FloraScore as a big number with its words${M.usual ? "" : " (while Florin is learning, the day it's on, with Day written in)"}, three big buttons, ${P.checkin ? "the weekly check-in when it's due, " : ""}${wkText}, and today's logs as big rows. Here the sentence reads: "${sentence(M)}" This week has ${n.loggedDays ? plural(n.loggedDays, "day") : "no days"} logged so far.`,
      ba: [
        ["A score card with a 30-day line, today's timeline, the week as three strips of dots, and a next step", "One sentence, the score as one number, three big buttons, the week as day circles, and today's logs"],
        ["Insights as its own tab", "This week on Today, and the rest one tap away under More about your weeks"],
        ["Labels from 10.5 to 15px, some in mono capitals", "18px and up, no mono and no capitals, text in Ink"],
        ["A tab bar of 44px targets, and plus with no word", "Today, Add, History and Ask, each 64px tall with its word"]
      ],
      rec: `${REC} Insights folds into Today because one place to look reads better than a tab named for what it does: This week answers the question a person opens the app with, and the deeper cards stay one tap away for a member.`,
      open: [
        "Does Today need the FloraScore in Easy at all, or only the sentence and the week?",
        "Is \"Something feels off\" the right words for symptoms, and \"What I ate\" for meals?",
        "Should Easy drop the next step card, as here, since the three buttons are the next step?"
      ],
      res: BASIS
    };
  };
  EXT.notes["ez-bm"] = (M, P) => ({
    t: "Easy version: log a BM",
    lede: `One question per screen, four steps: what it looked like, when, anything else, then Save. Each step says where it is (Step 2 of 4) and has a big Back. A pick moves on by itself after a short pause, as the check-in does, and Back undoes it. When offers Just now, Earlier today${M.start < L.TODAY ? " or Yesterday" : ` (no Yesterday on ${M.P.name}'s first day, since there's no day before to keep it)`}, then the hour, from midnight on, so waking at night to go can be logged. Save shows every answer on one screen, with Change beside each. With a flag, Save opens the same primary care note as the standard form.`,
    ba: [
      ["One tall form: when, consistency, four details, how long, the flag and a note", "Four short steps; a sudden urge and the flag stay, the rest is left to the standard form"],
      [`${P.form === "B" ? "Five" : "Seven"} tiles about 44px wide`, `${P.form === "B" ? "Five" : "Seven"} rows, 72px tall, each with its mark, its word and its line`],
      ["A day menu and a time field", `Just now, Earlier today or Yesterday, then the hour as one big button, ${PARTS[0][0]} (${T(PARTS[0][1])} to ${T(PARTS[0][2])}) to ${PARTS[PARTS.length - 1][0]}`],
      ["The flag among the chips", "Blood, mucus and black or tar-like on rows of their own, each with a box that ticks"]
    ],
    rec: REC,
    open: [
      "Auto-advance after a pick, or always a Next button? With a tremor a mis-tap moves on; Back is one tap away either way.",
      "Is the nearest hour close enough, or does Easy need minutes?",
      "Easy leaves out straining, didn't feel finished, burning, how long and the note. Enough, or keep the note?"
    ],
    res: BASIS.slice(0, 2)
  });
  EXT.notes["ez-weeks"] = (M, P) => ({
    t: "Easy version: your weeks",
    lede: P.plan === "free"
      ? `Insights, folded under Today. On Free it's this week's card${P.checkin ? " and the check-in" : ""}, then what membership adds, said plainly.`
      : "Insights, folded under Today: the library's Easy read cards, one question each, the number big and one plain sentence, with at most one simple picture that has its words written on it.",
    ba: [["Insights as a tab of charts, with 7, 30 and 90 days", "Your weeks, reached from This week on Today, in the Easy read look"]],
    rec: "Keep the deeper cards one tap from Today rather than a tab of their own.",
    open: ["Which cards earn a place here for an older person: all of them, or the score, the week, timing and symptoms?"],
    res: []
  });
  const prevNote = (k) => EXT.notes[k];
  const plusNote = prevNote("plus"), symNote = prevNote("sym");
  EXT.notes.plus = (M, P) => {
    if (!P.easy) return typeof plusNote === "function" ? plusNote(M, P) : null;
    return {
      t: "Easy version: the plus menu",
      lede: `Big labelled buttons in one column: I had a BM first, then Something feels off, What I ate${P.checkin ? ", the weekly check-in" : ""}, No BM today (from ${T(L.LATE)}), and an earlier day${M.start < L.TODAY ? "" : ` (not on ${M.P.name}'s first day, with no earlier day to catch up)`}. I had a BM is a button of its own and takes focus when plus opens, so a stray Enter never saves a BM. ${quickLine(M, P)}`,
      ba: [["A BM card with a row of small form tiles, then two tiles side by side", "One column of buttons 72px tall, each with its words"]],
      rec: REC,
      open: ["Does the plus menu need the earlier day at all in Easy, or is History's Add to this day enough?"],
      res: BASIS.slice(0, 1)
    };
  };
  EXT.notes.sym = (M, P) => {
    if (!P.easy) return typeof symNote === "function" ? symNote(M, P) : null;
    return {
      t: "Easy version: log symptoms",
      lede: `The same ${num(L.SYMPTOMS.length)} symptoms and Something else, as big chips, and how strong as three big buttons. How long and when it started are left out, so it's one screen; the time is when it's logged. Catching up an earlier day adds About when, as five big buttons from Morning to Night, each with its hour written on it; Midday (${T(12)}, what the standard form keeps) shows as picked until another is tapped. The primary care line stays.`,
      ba: [["Chips 36px tall, then how strong, how long, when it started and a note", "Chips 64px tall, then how strong as three big buttons"]],
      rec: REC,
      open: ["Keep the note field in Easy? An alarm word typed into it is the only way a note routes to primary care."],
      res: BASIS.slice(0, 1)
    };
  };
})();
