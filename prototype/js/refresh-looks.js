/* Florin app refresh: the data style decision (V.look). When it isn't As built, the phone draws its data in one of the
   data looks library's looks (library/js/look-*.js, loaded before this file): Insights becomes that look's cards and
   Today's FloraScore and week become its score and week cards. Every card is drawn from the phone's live model
   (FLD.build with M), so a BM logged on the phone redraws it. The Easy version always draws Easy read.
   Registers into window.FLORIN_EXT and wraps RU functions; it never edits a core file (CLAUDE.md, Extension hooks).
   Every wrapper falls back to the renderer it wraps when it throws, with a console warning that names this module.
   What it adds:
   - RU.insights, RU.todayParts.hero and .week, wrapped; RU.idetail, wrapped for one detail page of its own ("days",
     the days behind the week and month cards), and RU.askContext, for that page's Ask about this
   - RU.lookOf(V), RU.lookCards(M, V, keys, o) and RU.lookAfter(el), so another module (the Easy version) can draw
     cards in a look through RU
   - EXT.built.look, EXT.decisions.look (the notes for Will), EXT.notes for its screens, EXT.screens, EXT.opens,
     EXT.keys, EXT.acts and EXT.onSet (theme, look, rebuilds). The acts: a voice meal from a card; idetail and iback,
     wrapped, so a detail opens on its card's range and Back lands on that card; rlk-week, Today's See the week on
     Insights; ck-start and ck-tag, wrapped, so tags set on an Oura card reach this week's check-in
   Copy rules hold here as everywhere: no em or en dashes, no exclamation points, everything read against the
   person's own usual. */
(function () {
  const MOD = "refresh-looks";
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, EXT = window.FLORIN_EXT;
  if (!FL || !L || !RU || !AD || !EXT) return;
  const C = window.FLC;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, ic = RU.icon;
  const warn = (what, e) => console.warn(`Florin ${MOD}: ${what}`, e);

  /* ---------- the helpers a look reads: the same set the library page gives it (library.js), which the prototype
     never loads ---------- */
  const n1 = (v) => Math.round(v * 10) / 10;
  const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1);
  const reduced = () => (FL.reduced ? FL.reduced() : !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  /* big numerals count up from zero as a screen draws in, honouring a look's decimals and duration. Each look writes
     the final value as the text, so with motion off (or a soft redraw) the number is simply there */
  function countUp(root) {
    if (!root || reduced()) return;
    root.querySelectorAll("[data-rlk-count]").forEach((el) => {
      const to = +el.dataset.rlkCount, dec = +(el.dataset.dec || 0);
      if (!isFinite(to)) return;
      const t0 = performance.now(), dur = +(el.dataset.dur || 900);
      const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
      el.textContent = (0).toFixed(dec);
      requestAnimationFrame(step);
    });
  }
  if (!window.FLL) window.FLL = { esc, T, n1, lin, C, countUp, reduced };

  /* ---------- which look, if any ---------- */
  const looks = () => (window.FLOOKS || []).filter((l) => l && l.id && l.components);
  const lookById = (id) => looks().find((l) => l.id === id) || null;
  const NAMES = { built: "As built", rings: "Rings", journal: "Field journal", bento: "Bento", oura: "Oura", easy: "Easy read" };
  const nameOf = (id) => (lookById(id) && lookById(id).name) || NAMES[id] || id;
  /* the look the phone draws in: Easy read whenever the Easy version is on, else the data style; As built draws none */
  const lookIdOf = (V) => (!V ? null : V.easy ? "easy" : V.look && V.look !== "built" ? V.look : null);
  const lookOf = (V) => { const id = lookIdOf(V); return id && window.FLD ? lookById(id) : null; };
  RU.lookOf = (V) => { const l = lookOf(V); return l ? l.id : null; };

  /* the phone's theme: the looks style themselves from data-theme on their own wrapper, as the library page does */
  const themeOf = () => { const r = EXT.api && EXT.api.root; return (r && r.dataset.theme) || "light"; };
  let UID = 0;
  const ctxOf = (look) => ({ uid: `rlk${++UID}${look.id}`, theme: themeOf(), esc, T, n1, lin, C, motion: !reduced() });

  /* ---------- the numbers: FLD.build over the phone's live model, once per draw ----------
     Today asks for two cards in one draw, so the build is kept until the draw ends (a microtask), never longer: the
     model changes in place when something is logged */
  let memo = null;
  function dataOf(M, V) {
    const mode = V.form || "C";
    if (memo && memo.M === M && memo.mode === mode) return memo.D;
    const D = window.FLD.build(V.persona || (M.P && M.P.id), { mode, data: V.data, meals: V.meals, M });
    memo = { M, mode, D };
    queueMicrotask(() => { memo = null; });
    return D;
  }

  /* ---------- per model: what the person did on the cards. Gone with a fresh model ----------
     dismissed: the Oura tag cards closed; tags: the tags put on this week's check-in from a card while it's due (kept
     here, because the core drops a check-in draft that's closed with nothing answered); touched: a card set a tag, so
     the check-in's own tag buttons keep this list in step; card: the Insights card a detail was opened from, so Back
     lands on it */
  let mem = { M: null, dismissed: {}, tags: [], touched: false, card: null };
  const memOf = (M) => { if (mem.M !== M) mem = { M, dismissed: {}, tags: [], touched: false, card: null }; return mem; };
  const resetMem = () => { mem = { M: null, dismissed: {}, tags: [], touched: false, card: null }; };

  /* the tags this week's check-in carries: the saved ones once it's done; while it's due, the ones set from a card
     and any already on the draft the check-in will open with */
  const ckTagsOn = (api) => {
    if (!api) return [];
    const M = api.M(), S = api.S;
    if (!M || !M.checkin) return [];
    if (M.checkin.status === "done") return M.checkin.tags || [];
    if (M.checkin.status !== "due") return [];
    const m = memOf(M), d = S.ckDraft && S.ckDraft.tags ? S.ckDraft.tags : [];
    return [...new Set([...m.tags, ...d])];
  };
  /* a tag pressed or unpressed on a card: on the saved check-in once it's done, else in this module's memory (and on
     the draft too, when there is one). False when there's no check-in for it to go on */
  const ckTagSet = (api, v, on) => {
    const M = api.M(), S = api.S;
    if (!M || !M.checkin) return false;
    const flip = (list) => { const i = list.indexOf(v); if (on && i < 0) list.push(v); if (!on && i >= 0) list.splice(i, 1); };
    if (M.checkin.status === "done") { flip(M.checkin.tags = M.checkin.tags || []); return true; }
    if (M.checkin.status !== "due") return false;
    const m = memOf(M);
    m.touched = true;
    flip(m.tags);
    if (S.ckDraft) flip(S.ckDraft.tags = S.ckDraft.tags || []);
    return true;
  };

  /* ---------- a look's card, made ready for the app ----------
     The library draws cards for a page; in the app each one has to work: its buttons do what they say (the check-in,
     a food check, a meal by voice), its count-ups use their decimals, and nothing names the check-in while it's off.
     A teaser (Free) keeps only the picture: no buttons, nothing to focus */
  const tpl = document.createElement("template");
  const FOOD_MSG = `A food check asks for one line a day for ${L.FOOD_CHECK_DAYS} days, good days too, then shows what tends to follow. It comes with the next pass.`;
  /* a heading one level up, same class and attributes: the library sets a look's cards under a row's h2, the app under
     the screen's h1, so a card's h3 is an h2 here and its h4 an h3 (refresh-looks.css keeps the few tag rules) */
  const promote = (h, tag) => {
    const n = document.createElement(tag);
    [...h.attributes].forEach((a) => n.setAttribute(a.name, a.value));
    while (h.firstChild) n.appendChild(h.firstChild);
    h.replaceWith(n);
  };
  function fit(html, o) {
    tpl.innerHTML = html;
    const r = tpl.content;
    r.querySelectorAll("[data-count]").forEach((n) => { n.setAttribute("data-rlk-count", n.getAttribute("data-count")); n.removeAttribute("data-count"); });
    r.querySelectorAll("h3").forEach((h) => promote(h, "h2"));
    r.querySelectorAll("h4").forEach((h) => promote(h, "h3"));
    /* the Oura week's tag card asks about a shifted day with the check-in's tags: only while there's a check-in to keep
       them, not once dismissed, and not on Today, where the core's check-in card already asks */
    const ck = o.V && RU.ckOn(o.V) ? o.M.checkin.status : "off";
    const dismissed = memOf(o.M).dismissed;
    r.querySelectorAll(".ou-tagcard").forEach((tc) => {
      if ((ck !== "due" && ck !== "done") || dismissed[tc.getAttribute("aria-label") || ""] || o.teaser || o.today) { tc.remove(); return; }
      const n = tc.querySelector(".ou-tc-n");
      if (n) n.textContent = ck === "done" ? "A tag goes on this week's saved check-in." : "A tag goes on this week's check-in, ready when you answer it.";
      const on = ckTagsOn(EXT.api);
      tc.querySelectorAll("[data-ou-tag]").forEach((b) => b.setAttribute("aria-pressed", String(on.includes(b.textContent.trim()))));
    });
    /* Field journal's pattern card links to more patterns "in Insights": in the app that's the card's own link under
       it, which says how many there are */
    if (!o.teaser) r.querySelectorAll(".jr-link").forEach((b) => b.remove());
    if (o.teaser) {
      r.querySelectorAll("button").forEach((b) => { const s = document.createElement("span"); s.className = b.className; s.innerHTML = b.innerHTML; b.replaceWith(s); });
      r.querySelectorAll("[tabindex]").forEach((n) => n.removeAttribute("tabindex"));
      r.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    } else {
      const free = o.V && o.V.plan === "free", detailed = o.V && o.V.mealUI === "detailed";
      r.querySelectorAll("button:not([data-act])").forEach((b) => {
        if (b.matches("[data-ou-span], [data-ou-tag], [data-ou-close], .ou-ct-top")) return;
        const t = `${b.textContent} ${b.getAttribute("aria-label") || ""}`.toLowerCase();
        /* a button's words, or the call to action it sits in (Bento's "Answer it" sits under "This week's check-in is
           ready") */
        const box = b.closest("[class$='-cta'], [class*='-cta ']");
        if (/check-in/.test(t) || (box && /check-in/i.test(box.textContent))) b.dataset.act = "ck-start";
        else if (/food check/.test(t)) { if (free) { b.dataset.act = "pay"; b.dataset.pay = "food"; } else { b.dataset.act = "toast"; b.dataset.msg = FOOD_MSG; } }
        else if (b.matches(".bt-mic") || /by voice/.test(t)) {
          /* with the one-meal sheet picked there's no voice box: the button says what it opens */
          if (detailed) { b.dataset.act = "open-meal"; if (b.matches(".bt-mic")) b.setAttribute("aria-label", "Log what you ate"); else b.lastChild.textContent = "Log a meal"; }
          else b.dataset.act = "rlk-voice";
        }
        else if (b.matches(".bt-field")) b.dataset.act = "open-meal";
      });
    }
    const out = document.createElement("div");
    out.appendChild(r);
    return out.innerHTML;
  }
  /* one component in a look, ready for the app, or "" when it fails (logged; the rest of the screen still draws) */
  function card(look, k, D, M, V, o = {}) {
    try {
      const f = look.components[k];
      if (!f) return "";
      const html = f(D, ctxOf(look));
      return html ? fit(html, Object.assign({ M, V }, o)) : "";
    } catch (e) { warn(`${look.id}.${k} failed to draw`, e); return ""; }
  }
  /* the wrapper every card sits in: the look's class and the phone's theme, so the look's CSS applies as on the
     library page. data-rlk-r marks a draw, so its after() runs once it's on screen */
  const wrap = (look, inner, extra = "") => `<div class="rlk-look lk-${esc(look.id)}" data-theme="${themeOf()}"${extra}>${inner}</div>`;

  /* ---------- after a draw: the look's own after() (Oura's 30 and 90 switch, scrubber, Contributors, chips), the
     count-ups, and the tag chips saving to the check-in ---------- */
  let RID = 0;
  function schedule(rid, tries = 0) {
    queueMicrotask(() => {
      const els = document.querySelectorAll(`[data-rlk-r="${rid}"]`);
      if (!els.length) { if (tries < 1) requestAnimationFrame(() => schedule(rid, tries + 1)); return; }
      els.forEach((el) => afterEl(el));
    });
  }
  function afterEl(el) {
    if (!el || el.__rlkDone) return;
    el.__rlkDone = true;
    /* a soft redraw (a log saved, a toggle) shows the cards as they are, without drawing them in again, as the core's
       screens do; a screen that draws in counts its numerals up */
    const layer = el.closest(".ap-layer");
    const fresh = !!layer && layer.classList.contains("ap-anim");
    if (layer && !fresh) el.setAttribute("data-still", "");
    if (fresh) countUp(el);
    const ids = [...new Set([...el.querySelectorAll(".rlk-look")].map((n) => (n.className.match(/\blk-([\w-]+)/) || [])[1]).filter(Boolean))];
    ids.forEach((id) => {
      const look = lookById(id);
      if (look && look.after) { try { look.after(el, ctxOf(look)); } catch (e) { warn(`${id}.after failed`, e); } }
    });
    wireMine(el);
  }
  RU.lookAfter = (el) => { if (el) { el.__rlkDone = false; afterEl(el); } };
  /* the Oura week's tag chips: the look presses them; this keeps them, on this week's check-in */
  function wireMine(el) {
    if (el.__rlkWired) return;
    el.__rlkWired = true;
    el.addEventListener("click", (e) => {
      const api = EXT.api;
      const tag = e.target.closest && e.target.closest("[data-ou-tag]");
      if (tag && el.contains(tag) && api) {
        try {
          const v = tag.textContent.trim(), on = tag.getAttribute("aria-pressed") === "true";
          if (!ckTagSet(api, v, on)) return;
          api.toast(on ? `${v} added to this week's check-in.` : `${v} taken off this week's check-in.`);
        } catch (err) { warn("a tag didn't save", err); }
        return;
      }
      const x = e.target.closest && e.target.closest("[data-ou-close]");
      if (x && el.contains(x) && api) { const tc = x.closest(".ou-tagcard"); if (tc) memOf(api.M()).dismissed[tc.getAttribute("aria-label") || ""] = true; }
    });
  }

  /* ---------- the detail behind each card ----------
     [detail key, its range, the link's words]. The week and the month open this module's days page; the parts and
     the trend open FloraScore, where what moved it and the line over time are */
  const DETAIL = {
    score: ["score", 30, "FloraScore in detail"],
    parts: ["score", 30, "What moved it"],
    trend: ["score", 30, "FloraScore over time"],
    week: ["days", 7, "Each day this week"],
    month: ["days", 30, "Each day this month"],
    timing: ["timing", 30, "Timing in detail"],
    often: ["often", 30, "How often in detail"],
    form: ["form", 30, "Form in detail"],
    symptoms: ["sym", 30, "Symptoms in detail"],
    checkin: ["ck", 30, "Your check-ins in detail"],
    pattern: ["pat", 30, "Possible patterns in detail"]
  };
  const PAY_FROM = { score: "score", parts: "score", trend: "score", pattern: "pat", checkin: "ck" };
  /* while Florin is learning, the score's detail is how FloraScore works, so the link says that; the pattern card
     shows one pattern, so with more found its link says how many the detail holds */
  const goLink = (k, V, D) => {
    const [dk, range, w0] = DETAIL[k];
    const nPat = k === "pattern" && D && D.patterns && !D.learning ? D.patterns.found.length : 0;
    const words = D && D.learning && (k === "score" || k === "parts") ? "How FloraScore works" : nPat > 1 ? `All ${nPat} possible patterns` : w0;
    if (V.plan === "free") return `<button type="button" class="ap-link rlk-go" data-act="pay" data-pay="${PAY_FROM[k] || dk}">${ic("lock")}<span>${esc(words)}</span><span class="sr">, with Florin membership</span></button>`;
    return `<button type="button" class="ap-link rlk-go" data-act="idetail" data-k="${dk}" data-range="${range}" data-rlk>${esc(words)}${ic("chev")}</button>`;
  };
  const cardBlock = (look, k, D, M, V) => {
    const html = card(look, k, D, M, V);
    return html ? `<section class="rlk-card" data-rlk-k="${k}" data-rlk-look="${esc(look.id)}">${wrap(look, html)}${goLink(k, V, D)}</section>` : "";
  };

  /* ---------- Insights in a look ----------
     The cards in the library's order, each with its tap target into the detail. The range tabs give way to one label:
     the cards draw 30 days (7 on the free plan, and the days so far while Florin is learning). Free keeps the score,
     the week and the check-in, then one card for the rest that opens the paywall, over a blur of the person's own
     numbers */
  const ORDER = ["score", "parts", "trend", "week", "month", "timing", "often", "form", "symptoms", "checkin", "pattern"];
  const FREE = ["score", "week", "checkin"];
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  const keysFor = (V) => (V.plan === "free" ? FREE : ORDER).filter((k) => k !== "checkin" || RU.ckOn(V));
  /* what the membership card holds, in the paywall's own words: the parts are on the free score card and FloraScore
     itself stays free, so the card names why it moved, never the parts or the score */
  const LOCKED = ["Why your FloraScore moved", "the month", "timing", "how often", "form", "symptoms", "possible patterns"];
  function lockCard(look, D, M, V) {
    const k = D.score && D.score.parts && D.score.parts.length ? "parts" : "month";
    const tease = card(look, k, D, M, V, { teaser: true });
    return `<section class="ap-card rlk-lock" data-rlk-k="lock">
        <span class="ap-k">With Florin membership</span>
        <h2 class="rlk-lock-h">The rest of your Insights</h2>
        <p class="rlk-lock-p">${esc(`${join(LOCKED)}, each with its detail page.`)}</p>
        <div class="ap-tease">${tease ? `<div class="ap-tease-in rlk-tease" aria-hidden="true" inert>${wrap(look, tease)}</div>` : ""}<button type="button" class="ap-btn ap-btn--2 ap-btn--c ap-tease-b" data-act="pay" data-pay="insights">${ic("lock")}See Florin membership</button></div>
      </section>`;
  }
  function insightsIn(look, M, V) {
    const D = dataOf(M, V), rid = ++RID, free = V.plan === "free";
    const label = D.learning ? `<span class="ap-chip ap-chip--usual">Day ${D.learning.day} of ${D.learning.of}</span>` : `<span class="ap-chip">${free ? "Last 7 days" : "Last 30 days"}</span>`;
    const cards = keysFor(V).map((k) => cardBlock(look, k, D, M, V)).join("");
    schedule(rid);
    return `<div class="ap-scr ap-ins rlk-ins" data-rlk-r="${rid}" data-rlk-look="${esc(look.id)}">
      <header class="ap-top ap-top--ins" data-a><div><p class="ap-date">${esc(M.P.name)}'s logs</p><h1 class="ap-h1" tabindex="-1">Insights</h1></div>${label}</header>
      ${cards}
      ${free ? lockCard(look, D, M, V) : ""}
      <p class="ap-fine">${esc(DISC)}</p>
    </div>`;
  }

  /* ---------- Today in a look: the score card and the week card ---------- */
  function todayPart(look, k, M, V) {
    const D = dataOf(M, V), rid = ++RID;
    const html = card(look, k, D, M, V, { today: true });
    if (!html) return null;
    const free = V.plan === "free";
    let go;
    if (k === "score") {
      /* while Florin is learning, the free plan's hero has nowhere to go, as the core's doesn't */
      go = D.learning && free ? "" : free ? `<button type="button" class="ap-link rlk-go" data-act="pay" data-pay="score">${ic("lock")}<span>Why it moved, with membership</span></button>`
        : `<button type="button" class="ap-link rlk-go" data-act="idetail" data-k="score" data-range="30" data-rlk>${D.learning ? "How FloraScore works" : "Why it moved"}${ic("chev")}</button>`;
    } else go = `<button type="button" class="ap-link rlk-go" data-act="rlk-week" data-tab="insights" data-range="7">See the week on Insights${ic("chev")}</button>`;
    schedule(rid);
    return `<section class="rlk-card rlk-today" data-rlk-k="${k}" data-rlk-look="${esc(look.id)}" data-rlk-r="${rid}" data-a>${wrap(look, html)}${go}</section>`;
  }

  /* ---------- for another module (the Easy version): any cards, in the look the phone draws or a named one ---------- */
  RU.lookCards = (M, V, keys, o = {}) => {
    const look = lookById(o.look || lookIdOf(V) || "");
    if (!look || !window.FLD) return "";
    try {
      const D = dataOf(M, V), rid = ++RID;
      const html = (keys || ORDER).filter((k) => k !== "checkin" || RU.ckOn(V)).map((k) => (o.links === false ? (() => { const h = card(look, k, D, M, V); return h ? `<section class="rlk-card" data-rlk-k="${k}" data-rlk-look="${esc(look.id)}">${wrap(look, h)}</section>` : ""; })() : cardBlock(look, k, D, M, V))).join("");
      schedule(rid);
      return `<div class="rlk-cards" data-rlk-r="${rid}">${html}</div>`;
    } catch (e) { warn("lookCards failed", e); return ""; }
  };

  /* ---------- the days page: the week and the month cards' detail ----------
     Which days sat within your usual, and why each other one didn't, in the app's standard parts. 7 days lists every
     day; 30 and 90 list the days that shifted or could be either */
  const plural = (k, one, many) => `${k} ${k === 1 ? one : many || one + "s"}`;
  const join = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const chip = (text, tone = "plain") => `<span class="ap-chip ap-chip--${tone}">${esc(text)}</span>`;
  const RANGE_NAME = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };
  const winText = (u) => `${T(u.tLo).replace(/ (AM|PM)$/, "")} to ${T(u.tHi)}`;
  /* which side of the usual forms a BM sits, the way the cards read it */
  const sideOf = (M, b, mode) => {
    const u = M.usual;
    if (mode === "B") { const k = L.wordKey(b); return k < u.wLo ? "firmer" : k > u.wHi ? "looser" : null; }
    const s = L.stepsOf(b);
    return Math.max(...s) < u.fLo ? "firmer" : Math.min(...s) > u.fHi ? "looser" : null;
  };
  const whyOf = (M, f, mode) => {
    const u = M.usual, out = [];
    if (f.first != null && f.inWin === false) out.push(f.first > u.tHi ? `first BM at ${T(f.first)}, later than your window` : `first BM at ${T(f.first)}, earlier than your window`);
    if (f.count != null && f.inCount === false) out.push(f.count === 0 ? "no BM" : f.count > u.nHi ? `${plural(f.count, "BM")}, more than usual` : `${plural(f.count, "BM")}, fewer than usual`);
    if (f.formsIn === false) {
      const sides = f.bms.filter((b) => L.inForms(M, b, mode) === false).map((b) => sideOf(M, b, mode)).filter(Boolean);
      const fi = sides.filter((s) => s === "firmer").length, lo = sides.filter((s) => s === "looser").length;
      out.push(join([fi ? `${plural(fi, "firmer BM")}` : "", lo ? `${plural(lo, "looser BM")}` : ""].filter(Boolean)) || "a form outside your usual");
    }
    return out;
  };
  const dayLabel = (d) => { const x = L.dateOf(d); return `${d === L.TODAY ? "Today" : Ut.DOW[x.getDay()]}, ${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  function dayRow(M, f, mode) {
    const u = M.usual;
    let tone = "plain", word, line = "";
    if (f.pending) { word = "Nothing yet"; line = "Today isn't over."; }
    else if (f.state === "none") { word = "Not logged"; line = "Left out, never counted as a zero."; }
    else if (f.state === "nocount") { word = "No BMs said"; line = "Symptoms or meals logged, nothing about BMs, so it isn't counted either way."; }
    else if (f.state === "logged") { word = "Logged"; line = !f.count ? "No BM, logged." : `${plural(f.count, "BM")}${f.first == null ? "" : f.count === 1 ? `, at ${T(f.first)}` : `, the first at ${T(f.first)}`}.`; }
    else if (f.state === "usual") { tone = "usual"; word = "Within your usual"; line = `First BM at ${T(f.first)}, ${plural(f.count, "BM")}, your usual forms.`; }
    else if (f.state === "unsure") { word = "Could be either"; line = "A BM logged as a word that sits either side of your usual forms, so it isn't counted either way."; }
    else { tone = "shift"; word = "Shifted"; const w = whyOf(M, f, mode); line = w.length ? `${w.join("; ").charAt(0).toUpperCase()}${w.join("; ").slice(1)}.` : "Something sat outside your usual."; }
    return `<li class="rlk-day"><div class="rlk-day-h"><b>${esc(dayLabel(f.d))}</b>${chip(word, tone)}</div><p>${esc(line)}</p></li>`;
  }
  /* the days behind the week and the month cards, counted once for the page and for Ask about this. While Florin is
     learning it's the week so far, counted the way the week card counts it: days with something logged, of every
     day in the stretch, today included */
  const dateText = (d) => { const x = L.dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  function daysOf(M, mode, range) {
    const u = M.usual, learning = !u;
    const n = learning ? 7 : L.RANGES.includes(+range) ? +range : 30;
    const F = L.span(M, n, mode), live = F.filter((f) => !f.pending);
    const from = Math.max(M.start, L.TODAY - n + 1);
    const span = from === L.TODAY ? dateText(L.TODAY) : RU.spanText(from, L.TODAY);
    const o = { u, learning, n, F, live, span, sinceStart: from === M.start };
    if (learning) {
      o.logged = F.filter((f) => f.logged).length;
      o.bms = F.reduce((s, f) => s + f.bms.length, 0);
      return o;
    }
    o.within = F.filter((f) => f.state === "usual"); o.sh = F.filter((f) => f.state === "shifted"); o.un = F.filter((f) => f.state === "unsure");
    o.noc = F.filter((f) => f.state === "nocount" && !f.today); o.none = live.filter((f) => f.state === "none");
    o.known = o.within.length + o.sh.length;
    return o;
  }
  function daysPage(M, V, st) {
    const mode = V.form;
    const X = daysOf(M, mode, st.range), { u, learning, n, F, span } = X;
    const nav = `<header class="ap-nav"><button type="button" class="ap-back" data-act="iback">${ic("back")}<span>Insights</span></button><span class="ap-nav-t" role="heading" aria-level="1" tabindex="-1">Your days</span><span class="ap-nav-sp"></span></header>`;
    const tabs = learning ? "" : `<div class="ap-det-range" data-a><div class="ap-seg ap-seg--range" role="group" aria-label="Time range">${L.RANGES.map((v) => `<button type="button" data-act="irange" data-v="${v}" aria-pressed="${n === v}">${v}D</button>`).join("")}</div></div>`;
    let hero, body = "";
    if (learning) {
      const { logged, bms } = X;
      const chips = `<div class="ap-chips">${chip(`Learning your usual · day ${L.learnDay(M)} of ${L.LEARN_DAYS}`, "usual")}</div>`;
      const after = `From day ${L.LEARN_DAYS}, each day is read against your usual: first BM in your window, a usual count, your usual forms.`;
      const k0 = `${X.sinceStart ? "So far" : RANGE_NAME[n]} · ${span}`;
      /* nothing logged yet (day 1, say): said in words, never "0 of 1 day" */
      hero = logged
        ? `<div class="ap-dhero" data-a><span class="ap-k">${esc(k0)}</span><b class="ap-big">${logged}<small>of ${plural(F.length, "day")} logged</small></b>${chips}<p class="ap-idt-lede">${esc(`Days with something logged, ${plural(bms, "BM")} in all. ${after}`)}</p></div>`
        : `<div class="ap-dhero" data-a><span class="ap-k">${esc(k0)}</span><h2 class="ap-idt-h">Nothing logged yet</h2>${chips}<p class="ap-idt-lede">${esc(`Each day you log shows here, BMs, symptoms and meals alike. ${after}`)}</p></div>`;
      body = `<section class="ap-sect" data-a><h3>Day by day</h3><ol class="rlk-days">${F.slice().reverse().map((f) => dayRow(M, f, mode)).join("")}</ol></section>`;
    } else {
      const { within, sh, un, noc, none, known } = X;
      const why = [[sh.filter((f) => f.inWin === false).length, "a first BM outside your window"], [sh.filter((f) => f.formsIn === false).length, "a form outside your usual"], [sh.filter((f) => f.inCount === false).length, "an unusual count"]].filter(([k]) => k);
      const note = sh.length ? `Shifted days: ${join(why.map(([k, t]) => `${k} with ${t}`))}. A day can have more than one.` : known ? "Every day you logged with a BM count sat within your usual." : "No day in this stretch has a BM count logged yet.";
      hero = `<div class="ap-dhero" data-a><span class="ap-k">${esc(`${RANGE_NAME[n]} · ${span}`)}</span><b class="ap-big">${within.length}<small>of ${known}</small></b><p class="ap-idt-lede">${esc(`Days within your usual: first BM in your window, ${winText(u)}; ${u.nLo === u.nHi ? u.nLo : `${u.nLo} to ${u.nHi}`} a day; your usual forms, ${L.usualFormsText(M, mode)}.`)}</p></div>`;
      const seg = C && C.seg ? C.seg([{ v: within.length, label: "Within your usual", cls: "is-usual" }, { v: sh.length, label: "Something shifted", cls: "is-shift" }, { v: none.length, label: "Not logged", cls: "is-none" }]) : "";
      const legend = `<div class="ap-legend"><span><i class="sw sw--usual"></i>${plural(within.length, "day")} within</span><span><i class="sw sw--shift"></i>${sh.length} shifted</span>${none.length ? `<span><i class="sw sw--none"></i>${none.length} not logged</span>` : ""}</div>`;
      const fig = `<figure class="ap-fig" data-a><figcaption class="ap-figcap"><b>${esc(`${within.length} of ${known} days within your usual`)}</b><span>${esc(RANGE_NAME[n])}</span></figcaption>${seg}${legend}<p class="ap-sum-note">${esc(note)}</p></figure>`;
      const listed = n <= 7 ? F.slice().reverse() : F.filter((f) => f.state === "shifted" || f.state === "unsure").reverse();
      const rest = n <= 7 ? "" : `<p class="rlk-days-rest">${esc(`${plural(within.length, "other day")} sat within your usual${none.length ? `, ${none.length} not logged` : ""}${noc.length ? `, and ${noc.length} had no BMs said` : ""}.`)}</p>`;
      body = `${fig}${tabs}<section class="ap-sect" data-a><h3>${esc(n <= 7 ? "Day by day" : un.length ? "The days that shifted or could be either" : "The days that shifted")}</h3>${listed.length ? `<ol class="rlk-days">${listed.map((f) => dayRow(M, f, mode)).join("")}</ol>` : `<p>${esc("No day in this stretch shifted.")}</p>`}${rest}</section>`;
      if (un.length) body += `<section class="ap-sect" data-a><h3>Could be either</h3><p>${esc(`${plural(un.length, "day")} had a BM logged as a word that covers two forms, one inside your usual and one outside, so ${un.length === 1 ? "it isn't" : "they aren't"} counted either way.`)}</p></section>`;
    }
    const how = `<section class="ap-sect" data-a><h3>How a day is read</h3><p>${esc("A day is within your usual when the first BM came in your usual window, the count was a usual one and every BM was one of your usual forms. Something outside any of the three makes it a shifted day, either way. A day with nothing logged is left out, and No BM counts as a zero.")}</p></section>`;
    const next = `<button type="button" class="ap-idt-next" data-act="idetail" data-k="timing" data-a><span><em>Next</em><b>Timing</b></span>${ic("chev")}</button>`;
    return `<div class="ap-scr ap-idt rlk-days-page">
      ${nav}
      ${hero}
      ${body}
      ${how}
      <button type="button" class="ap-btn ap-btn--line ap-btn--block ap-idt-ask" data-act="ask-about" data-k="days" data-a>${ic("chat")}Ask about this</button>
      ${next}
      <p class="ap-fine">${esc(DISC)}</p>
    </div>`;
  }

  /* ============================== THE WRAPPERS ============================== */
  const baseInsights = RU.insights;
  RU.insights = (M, V, st) => {
    const look = lookOf(V);
    if (!look) return baseInsights(M, V, st);
    try { return insightsIn(look, M, V); } catch (e) { warn("Insights in a look failed, drawing it as built", e); return baseInsights(M, V, st); }
  };
  const baseIdetail = RU.idetail;
  RU.idetail = (M, V, st) => {
    if (!st || st.k !== "days") return baseIdetail(M, V, st);
    try { return daysPage(M, V, st); } catch (e) { warn("the days page failed, drawing Insights instead", e); return (RU.core && RU.core.insights ? RU.core.insights : baseInsights)(M, V, st); }
  };
  const parts = RU.todayParts || {};
  const baseHero = parts.hero, baseWeek = parts.week;
  if (baseHero) parts.hero = (M, V) => {
    const look = lookOf(V);
    if (!look) return baseHero(M, V);
    try { const h = todayPart(look, "score", M, V); return h == null ? baseHero(M, V) : h; } catch (e) { warn("Today's score in a look failed, drawing it as built", e); return baseHero(M, V); }
  };
  if (baseWeek) parts.week = (M, V) => {
    const look = lookOf(V);
    if (!look) return baseWeek(M, V);
    try { const h = todayPart(look, "week", M, V); return h == null ? baseWeek(M, V) : h; } catch (e) { warn("Today's week in a look failed, drawing it as built", e); return baseWeek(M, V); }
  };

  /* Ask about this on Your days: the days' own counts come in with the question, as every core detail's do */
  const baseAskContext = RU.askContext;
  if (baseAskContext) RU.askContext = (M, V, ctx) => {
    if (!ctx || ctx.k !== "days") return baseAskContext(M, V, ctx);
    try {
      const X = daysOf(M, V.form, ctx.range);
      if (X.learning) return {
        title: `Your days · ${X.sinceStart ? "so far" : RANGE_NAME[X.n].toLowerCase()}`,
        facts: [`Day ${L.learnDay(M)} of ${L.LEARN_DAYS}`, X.logged ? `Something logged on ${X.logged} of ${plural(X.F.length, "day")}, ${plural(X.bms, "BM")} in all` : "Nothing logged yet"],
        qs: ["What should I log, and when?", "How does Florin learn my usual?", "Why does a gap not count as zero?"]
      };
      return {
        title: `Your days · ${RANGE_NAME[X.n].toLowerCase()}`,
        facts: [`${X.within.length} of ${plural(X.known, "day")} within your usual`, `${plural(X.sh.length, "day")} shifted`, X.none.length ? `${plural(X.none.length, "day")} not logged` : "Every day has something logged"],
        qs: ["Which days shifted, and why?", "Why does a gap not count as zero?", "How is my usual worked out?"]
      };
    } catch (e) { warn("Your days' Ask context failed, so Ask opens without it", e); return null; }
  };

  /* ============================== THE ACTS ============================== */
  /* a detail link carries its card's range, so the detail opens on the stretch the card drew, and says which card it
     sits under, so Back comes back to that card (the parts and the trend both open FloraScore, the week and the
     month both open Your days) */
  const prevDetail = EXT.acts.idetail;
  EXT.acts.idetail = (b, api, e) => {
    try {
      if (b && b.hasAttribute && b.hasAttribute("data-rlk") && b.dataset.range && api.S.plan !== "free") api.S.ins.range = +b.dataset.range;
      const c = b && b.closest ? b.closest(".rlk-ins [data-rlk-k]") : null;
      memOf(api.M()).card = c && api.S.plan !== "free" ? c.dataset.rlkK : null;
    } catch (err) { warn("a detail link's range didn't apply", err); }
    return prevDetail ? prevDetail(b, api, e) : api.core("idetail", b, e);
  };
  /* the phone's screen scrolled so el is in view, the way the core's focusSel does it (the phone may be scaled); with
     top, el's top sits 16px under the status bar that's drawn over the screen */
  const inView = (api, el, top) => {
    const lay = api.layer, r = el.getBoundingClientRect(), lr = lay.getBoundingClientRect(), k = lr.height / lay.clientHeight || 1;
    if (top) { const sb = api.root && api.root.querySelector(".apx-status"); lay.scrollTop += (r.top - lr.top) / k - (sb ? sb.getBoundingClientRect().height / k : 0) - 16; return; }
    if (r.top < lr.top || r.bottom > lr.bottom - 96) lay.scrollTop += ((r.top + r.bottom) / 2 - (lr.top + lr.bottom) / 2) / k;
  };
  /* Back from a detail: the core goes back to where Insights was and focuses the first link into that detail; in a
     style, the card the detail was opened from gets the focus instead, at the same place. Its frame is asked for after
     the core's, so the two run before the same paint */
  const prevBack = EXT.acts.iback;
  EXT.acts.iback = (b, api, e) => {
    let card = null, k = null;
    try { const m = memOf(api.M()); card = m.card; m.card = null; k = api.S.ins.k; } catch (err) { warn("Back couldn't read its card", err); }
    const r = prevBack ? prevBack(b, api, e) : api.core("iback", b, e);
    if (card && DETAIL[card] && DETAIL[card][0] === k) requestAnimationFrame(() => {
      try {
        if (api.top() || api.S.tab !== "insights" || api.S.ins.k) return;
        const go = api.layer.querySelector(`.rlk-ins [data-rlk-k="${CSS.escape(card)}"] .rlk-go`);
        if (!go) return;
        api.layer.scrollTop = api.S.ins.y || 0;
        go.focus({ preventScroll: true });
        inView(api, go);
      } catch (err) { warn("Back couldn't return to its card", err); }
    });
    return r;
  };
  /* See the week on Insights, from Today: Insights opens on the week card, not at the top */
  EXT.acts["rlk-week"] = (b, api) => {
    api.act("tab", b);
    requestAnimationFrame(() => {
      try {
        if (api.top() || api.S.tab !== "insights") return;
        /* focus on the card's heading, so the card is read from its top and its link isn't left under the tab bar; a
           look with no heading on its cards (Bento) focuses the card's link instead */
        const sec = api.layer.querySelector('.rlk-ins [data-rlk-k="week"]'), h = sec && sec.querySelector(".rlk-look h2"), go = sec && sec.querySelector(".rlk-go");
        if (!sec || !(h || go)) return;
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); inView(api, sec, true); }
        else { go.focus({ preventScroll: true }); inView(api, go); }
      } catch (err) { warn("See the week couldn't reach the week card", err); }
    });
  };
  /* the tags a card put on this week's check-in go into it when it opens, even after it was closed with nothing
     answered (the core keeps no draft then); and while it's open, its own tag buttons keep this module's list in step.
     Only once a card has set a tag, so the core's check-in is untouched otherwise */
  const prevCk = EXT.acts["ck-start"];
  EXT.acts["ck-start"] = (b, api, e) => {
    try {
      const M = api.M(), S = api.S, m = memOf(M);
      if (m.touched && M.checkin && M.checkin.status === "due") {
        if (!S.ckDraft) { if (m.tags.length) S.ckDraft = { step: 0, answers: L.CHECKIN.map(() => null), tags: m.tags.slice(), note: "" }; }
        else { S.ckDraft.tags = S.ckDraft.tags || []; m.tags.forEach((v) => { if (!S.ckDraft.tags.includes(v)) S.ckDraft.tags.push(v); }); }
      }
    } catch (err) { warn("the card's tags didn't reach the check-in", err); }
    return prevCk ? prevCk(b, api, e) : api.core("ck-start", b, e);
  };
  const prevTag = EXT.acts["ck-tag"];
  EXT.acts["ck-tag"] = (b, api, e) => {
    const r = prevTag ? prevTag(b, api, e) : api.core("ck-tag", b, e);
    try {
      const M = api.M(), m = memOf(M), t = api.top();
      if (m.touched && t && t.type === "ck" && t.st && !t.st.preview && M.checkin.status === "due") m.tags = (t.st.tags || []).slice();
    } catch (err) { warn("a check-in tag didn't reach the cards", err); }
    return r;
  };
  /* Log a meal by voice, from a card: the one-box sheet, with the pretend microphone on */
  EXT.acts["rlk-voice"] = (b, api) => {
    if (api.V().mealUI === "detailed") { api.core("open-meal", b); return; }
    api.core("open-meal", b);
    const t = api.top();
    if (t && t.type === "meal" && t.st && t.st.quick && t.st.voice !== "listening") api.act("mq-mic", b);
  };

  /* ============================== THE PAGE: screens, keys, notes ============================== */
  const active = (V) => !!lookOf(V);
  const builtToast = "The data style is As built. Pick Rings, Field journal, Bento, Oura or Easy read on the left to draw it here.";
  EXT.screens.push(["Data style", [["look-insights", "Data style: Insights"], ["look-today", "Data style: Today"], ["i-days", "Your days, the detail"]]]);
  EXT.opens["look-insights"] = (api) => {
    api.S.tab = "insights"; api.S.ins.k = null; api.renderTab(true); api.layer.scrollTop = 0;
    if (!active(api.V())) api.toast(builtToast);
  };
  EXT.opens["look-today"] = (api) => { api.layer.scrollTop = 0; if (!active(api.V())) api.toast(builtToast); };
  EXT.opens["i-days"] = (api) => {
    api.S.tab = "insights";
    if (api.S.plan === "free") { api.S.ins.k = null; api.renderTab(true); api.push("pay", { from: "" }, { instant: true }); return; }
    api.S.ins.k = "days"; api.S.ins.range = 7; api.renderTab(true); api.layer.scrollTop = 0;
  };
  const prevKeyIns = EXT.keys["tab:insights"], prevKeyToday = EXT.keys["tab:today"];
  EXT.keys["tab:insights"] = (o) => {
    const S = o && o.st;
    if (S && !S.ins.k && !S.easy && active(S)) return "look-insights";
    return prevKeyIns ? prevKeyIns(o) : null;
  };
  EXT.keys["tab:today"] = (o) => {
    const S = o && o.st;
    if (S && !S.easy && active(S)) return "look-today";
    return prevKeyToday ? prevKeyToday(o) : null;
  };
  /* every option this module draws, as long as its look loaded */
  EXT.built.look = ["rings", "journal", "bento", "oura", "easy"].filter((id) => !!lookById(id));

  /* the page follows the theme without a redraw; a new style draws in; a fresh model forgets the dismissed cards */
  EXT.onSet.push((k, v, api) => {
    if (k === "theme") api.root.querySelectorAll(".rlk-look").forEach((n) => n.setAttribute("data-theme", v));
    if ((k === "look" || k === "easy") && (api.S.tab === "today" || (api.S.tab === "insights" && !api.S.ins.k)) && !api.top()) api.renderTab();
    if (k === "persona" || k === "data" || k === "meals") resetMem();
  });

  /* ---------- the notes for Will: each style, what it's good and bad at, and our recommendation ---------- */
  const GOOD_BAD = {
    built: ["The studio's chart kit, as on the phone now: the Forest score card, bars from zero, morning strips and dot rows, with 7, 30 and 90 day tabs and Ask about this on every card.", "Proven on every detail page, and every card works the same way.", "Every card is the same shape, so nothing leads; dense for a first look."],
    rings: [null, "The one dark hero ring with your usual on its own track reads at a glance, and day rings make a week easy to count.", "Rings everywhere make values hard to compare across cards (an angle, not a length), and a ring a day gets small over 30 days."],
    journal: [null, "Straight axes, direct labels and a one-line caption under each figure: the most exact of the five, and a shift is explained in one sentence. Suits detail pages and a clinician report.", "The most reading, with small mono captions and hairlines that are hard for older eyes; it feels less like a home screen."],
    bento: [null, "Glanceable tiles, each answer split into a few numbers: the most like home-screen widgets, so it suits Today and a widget later.", "Splitting an answer into tiles hides how the parts relate, many small numbers compete, and tiles crowd at large text sizes."],
    oura: [null, "The open arc with your usual on its track, one Lora line about today and Contributors rows that open what each part is: the clearest score and parts.", "Dark first and the most to learn (a 30 and 90 day switch, a scrubber, rows to open). It reads as Oura's, so it needs Florin's own marks to stay ours."],
    easy: [null, "One big number and one plain sentence a card, in large type, with the words written on every picture: the easiest for anyone with reading glasses or little patience for charts.", "Leaves out most of the shape of the data (ranges, day by day), so it's thin as the only style for someone who wants depth."]
  };
  const low = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  /* ck: the check-in is on, so a note may name it; with it off, nothing in a note does */
  const optText = (id, ck) => {
    const g = GOOD_BAD[id];
    if (!g) return "";
    const what = g[0] || (lookById(id) && lookById(id).idea) || "";
    const good = id === "oura" && ck ? `${g[1]} On Insights, the week asks about a shifted day with the check-in's tags.` : g[1];
    return `${what} Good at: ${low(good)} Less good: ${low(g[2])}`;
  };
  const recOf = (ck) => `Ours, for Will to confirm: Oura's arc and Contributors for Today and FloraScore; Field journal's straight-axis figures for the detail pages; Easy read as the larger-text setting, which the Easy version uses whatever is picked here. One style for the data cards on a screen, never two; the timeline${ck ? ", the check-in card" : ""} and the next step stay the app's own. In every style Plum is your usual (Ray on dark), Gold a shift and Teal context; no red, no green.`;
  /* what the free plan keeps in a style, said with or without the check-in */
  const freeKeeps = (ck) => (ck ? "the score, the week and the check-in" : "the score and the week");
  EXT.decisions.look = (M, P) => {
    const ck = RU.ckOn(P);
    const drawnList = EXT.built.look.map(nameOf);
    return {
      t: "Data style",
      lede: `How the numbers are drawn on Today and Insights. In a style, Insights is that look's cards in order (the score, its parts, the trend, the week, the month, timing, how often, form, symptoms${ck ? ", the check-in" : ""} and patterns), each with a link to its detail, and Today's FloraScore and week are its score and week cards. Every card is drawn from the phone's own logs, so a BM logged here redraws it. Detail pages stay as built, with one new page, Your days, behind the week and the month cards. On the phone: As built, ${drawnList.join(", ")}.${P && P.easy ? " The Easy version is on, so the phone draws Easy read whatever is picked here." : ""}`,
      opts: ["built", "rings", "journal", "bento", "oura", "easy"].map((id) => [id, optText(id, ck)]),
      rec: recOf(ck),
      open: [
        "Oura on Today and the score, Field journal on the details: mix by surface like this, or one style everywhere?",
        ck ? "On Insights, the Oura week asks about a shifted day with the check-in's tags, and a tag goes on that week's check-in. Keep that, or a separate tag log?" : "",
        "Insights in a style shows the last 30 days without range tabs (the Oura trend keeps its 30 and 90 switch). Enough, or bring the tabs back?",
        `Free: ${freeKeeps(ck)} in the style, then one membership card for the rest. That's less than As built's free plan, which also keeps FloraScore's 30-day line, and timing, how often, form and symptoms at 7 days. Keep the style's cut, or match As built?`
      ].filter(Boolean),
      res: ["Oura's Vitals: one card per metric, the personal baseline, and a side arrow into the detail.", ck ? "Oura asks about a night when the score moved, with tags." : "", "Function opens on summary counts in plain terms."].filter(Boolean)
    };
  };
  /* the screens' own notes, while a style is drawn */
  const pickedLine = (P) => (P && P.easy ? "The Easy version is on, so this is Easy read." : `Drawn as ${nameOf(lookIdOf(P) || "built")}.`);
  EXT.notes["look-insights"] = (M, P) => {
    if (!active(P)) return null;
    const id = lookIdOf(P), g = GOOD_BAD[id] || [];
    const free = P.plan === "free";
    return {
      t: `Insights, in ${nameOf(id)}`,
      lede: `${pickedLine(P)} ${free ? `On the free plan: ${freeKeeps(RU.ckOn(P))}, then one card for the rest, over a blur of the person's own numbers, that opens the paywall.` : `The look's cards in order, each with a link into its detail (the week and the month open Your days).`} The range tabs give way to one label. Every card reads the phone's live logs.`,
      ba: [["7, 30 and 90 day tabs on every card", "One label, Last 30 days; the detail pages keep the tabs"], ["The studio's chart kit", `The ${nameOf(id)} look from the data looks library`]],
      open: [g[2] ? `${nameOf(id)}, less good: ${low(g[2])}` : "", "Should a card open its detail anywhere you tap it, or only from its link?"].filter(Boolean),
      res: ["Oura's Vitals: one card per metric, the personal baseline, and a side arrow into the detail."]
    };
  };
  EXT.notes["look-today"] = (M, P) => {
    if (!active(P)) return null;
    const id = lookIdOf(P);
    return {
      t: `Today, in ${nameOf(id)}`,
      lede: `${pickedLine(P)} FloraScore and the week are the look's score and week cards; the timeline${RU.ckOn(P) ? ", the check-in card" : ""} and the next step stay as built.${RU.ckOn(P) && lookIdOf(P) === "oura" ? " The Oura week's tag card stays on Insights, so Today asks for the check-in once." : ""} Why it moved opens FloraScore's detail${P.plan === "free" ? " (with membership)" : ""}, and See the week on Insights opens Insights at the week card.`,
      ba: [["The Forest score card with the ring", `${nameOf(id)}'s score card`], ["Three strips for the week", `${nameOf(id)}'s week card`]],
      open: ["Score first, then today's logs: or the day first and the score under it (the Home decision)?"],
      res: ["Oura opens on the day's score, with contributors a tap away."]
    };
  };
  EXT.notes["i-days"] = (M, P) => ({
    t: "Your days, the detail",
    lede: "Behind the week and the month cards: how many days sat within the usual, a bar for within, shifted and not logged, then the days themselves. Seven days lists every day; 30 and 90 list the days that shifted or could be either, each with what shifted. A day with nothing logged stays a gap. While Florin is learning, it counts the days logged the way the week card does, and Ask about this opens Ask Florin with these counts loaded.",
    ba: [["A summary card with no detail behind it", "Its own page, with the reason each day shifted"]],
    open: ["List every day at 30 and 90 too, or only the ones that shifted (built: only those)?"],
    res: ["Function opens on summary counts in plain terms."]
  });
})();
