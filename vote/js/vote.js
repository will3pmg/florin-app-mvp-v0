/* Florin app vote: the flow. Start (a name and a role), 19 questions in two parts (Part 2 opens with its own screen),
   the review of the picks, sending, and the thanks. Will's note of Nov 5: "pick your preferred flow for home screen ...
   3 actual visuals to choose from ... capture some notes with their selection ... aggregate the results for me".

   Where the page runs decides how a ballot leaves (vote/config.js):
     endpoint empty (the claude.ai artifact)  Copy for Slack: a plain, readable ballot with a machine line, pasted to Will
     endpoint set (the hosted site)            Send to Will: the JSON posted as text/plain with fetch no-cors, confirmed
                                               by JSONP after 2, 6 and 15 seconds; Copy for Slack instead stays offered.
                                               A post or a check that can't load at all turns this ballot to Slack
   Nothing here marks a recommendation or a default: the options are shuffled per voter (the seed), Part 2's six styles
   once for all eleven charts, and No preference is always last. One line says what the app does now, on purpose: the
   week's Florin charts card is the filled-circle week Today no longer shows, so a vote for it isn't read as a vote for
   Today's week card (questions.js LINES).
   A pick is a native radio in a fieldset (one Tab stop a question; the arrow keys move and pick), drawn as a button
   right under its picture. On a phone a Part 1 picture is cut to the part of its screen the option is about. The
   review's send action sits in the bar at the foot of the screen, and the last screen says what's left to do.
   The voter's place is kept in localStorage under florin-vote:<vote id> ({ v, vid, name, role, roleOther, seed, at, a,
   sent, cur }); every read and write is guarded, so without storage the vote still works and just doesn't resume. */
(function () {
  "use strict";
  const W = window, doc = document;
  const mount = doc.getElementById("vt");
  if (!mount) return;
  const CFG = W.VOTE_CONFIG || {}, Q = W.VOTE_Q, B = W.VOTE_BALLOT, D = W.VOTE_DRAW || { ready: false };
  if (!Q || !B) { mount.innerHTML = '<div class="vt-wrap"><p class="vt-missing">The vote\'s own files didn\'t load. Open the page from its own folder.</p></div>'; return; }
  const BUILD = "dev";
  const root = doc.documentElement;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TO = String(CFG.to || "Will");
  const NOTE_MAX = B.NOTE_MAX;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;

  /* ---------- storage, always guarded ---------- */
  const store = {
    get(k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { W.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { W.localStorage.removeItem(k); } catch (e) { /* nothing kept */ } }
  };
  /* ?test=1 makes this browser's ballots test ballots (the vote id gets -test) until ?test=0 */
  try {
    const t = new URLSearchParams(W.location.search).get("test");
    if (t === "1") store.set("florin-vote:test", "1");
    else if (t === "0") store.del("florin-vote:test");
  } catch (e) { /* no query string */ }
  const TEST = store.get("florin-vote:test") === "1";
  const VOTE = String(CFG.vote || "florin-app-vote-1") + (TEST ? "-test" : "");
  const KEY = `florin-vote:${VOTE}`;
  const ENDPOINT = String(CFG.endpoint || "").trim();
  const OPEN = CFG.open !== false;
  const SLACK_MAX = Math.max(800, +CFG.slackMax || 3500);
  const SLACK_OPEN = /^https:\/\//.test(String(CFG.slackOpen || "")) ? String(CFG.slackOpen) : "";

  /* ---------- the voter's state ---------- */
  const fresh = (vid) => ({ v: 1, vid: vid || B.newVid(), name: "", role: "", roleOther: "", seed: 0, at: "start", a: {}, sent: [], cur: null });
  function cleanA(a) {
    const out = {};
    if (!a || typeof a !== "object") return out;
    Q.QS.forEach((q) => {
      const x = a[q.id];
      if (!x || typeof x !== "object") return;
      const p = x.p && Q.optOf(q, x.p) ? x.p : null;
      const note = typeof x.note === "string" ? x.note.slice(0, NOTE_MAX) : "";
      if (p || note) out[q.id] = { p, note };
    });
    return out;
  }
  function load() {
    try {
      const x = JSON.parse(store.get(KEY) || "null");
      if (x && typeof x === "object" && x.v === 1) {
        const s = Object.assign(fresh(typeof x.vid === "string" && /^[a-z0-9]{12}$/.test(x.vid) ? x.vid : null), {
          name: typeof x.name === "string" ? x.name.slice(0, B.NAME_MAX) : "",
          role: Q.ROLES.some((r) => r[0] === x.role) ? x.role : "",
          roleOther: typeof x.roleOther === "string" ? x.roleOther.slice(0, B.ROLE_MAX) : "",
          seed: Math.floor(+x.seed || 0), at: typeof x.at === "string" ? x.at : "start", a: cleanA(x.a),
          sent: Array.isArray(x.sent) ? x.sent.filter((y) => y && typeof y.bid === "string").slice(-20) : [],
          cur: x.cur && typeof x.cur === "object" && typeof x.cur.bid === "string" ? x.cur : null
        });
        return s;
      }
    } catch (e) { /* a fresh start */ }
    return fresh();
  }
  let S = load();
  const save = () => { store.set(KEY, JSON.stringify(S)); };
  const pickOf = (qid) => (S.a[qid] && S.a[qid].p) || null;
  const answeredN = () => Q.QS.filter((q) => pickOf(q.id)).length;
  const notesN = () => Q.QS.filter((q) => pickOf(q.id) && (S.a[q.id].note || "").trim()).length;
  const firstName = () => (S.name.trim().split(/\s+/)[0] || S.name.trim());

  /* ---------- the page's theme: Auto, Light or Dark, kept for this viewer ---------- */
  const TKEY = "florin-vote:theme";
  let THEME = store.get(TKEY);
  if (THEME !== "light" && THEME !== "dark") THEME = "auto";
  const sysDark = () => !!(W.matchMedia && W.matchMedia("(prefers-color-scheme: dark)").matches);
  const themeNow = () => (THEME === "auto" ? (sysDark() ? "dark" : "light") : THEME);
  function applyTheme() {
    if (THEME === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", THEME);
    if (D.ready) D.setTheme(themeNow());
    doc.querySelectorAll("[data-x='theme']").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === THEME)));
  }

  /* ---------- order, so nobody is steered: shuffled by the voter's seed ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, seed) {
    const a = arr.slice(), r = rng(seed);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function orderOf(q) {
    if (q.part === 1) return shuffle(q.opts, (S.seed ^ B.fnv(q.id)) >>> 0);
    /* the six styles once for every chart; the month's seventh sits right after Florin charts */
    const six = shuffle(Q.STYLES.map((s) => s.id), S.seed >>> 0);
    const ids = [];
    six.forEach((id) => { ids.push(id); if (id === "built" && q.opts.some((o) => o.id === Q.CAL_RING.id)) ids.push(Q.CAL_RING.id); });
    return ids.map((id) => q.opts.find((o) => o.id === id)).filter(Boolean);
  }

  /* ---------- small pieces of markup ---------- */
  const svg = (d, w) => `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="${w || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    check: svg('<path d="M4.5 10.5l3.5 3.5 7.5-8"/>', 2.2),
    left: svg('<path d="M12.5 4.5L7 10l5.5 5.5"/>', 2),
    right: svg('<path d="M7.5 4.5L13 10l-5.5 5.5"/>', 2),
    big: svg('<path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5l-5.5 5.5M3.5 16.5L9 11"/>'),
    close: svg('<path d="M5 5l10 10M15 5L5 15"/>', 2),
    copy: svg('<rect x="6.5" y="6.5" width="10" height="10" rx="2"/><path d="M13.5 6.5V4.5a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2"/>')
  };
  const optLabel = (q, p) => Q.optName(q, p) || p;
  const ballotTotal = Q.QS.length;
  const P1N = Q.inPart(1).length, P2N = Q.inPart(2).length;
  const foot = `<footer class="vt-foot"><div class="vt-wrap"><p>Prototype only. Not for patients.</p></div></footer>`;

  /* ---------- the screens ---------- */
  const U = { screen: "start", back: null, day5: false, fr: {}, idx: {}, warn: false, confirm: null, copyFail: null, msg: "", sending: null, err: "" };
  function shell(inner) {
    return `<div class="vt-page">
      <header class="vt-head"><div class="vt-wrap">
        <p class="vt-brand"><b>Florin app vote</b><span>${TEST ? "Test run" : "Florin Health"}</span></p>
        <div class="vt-theme" role="group" aria-label="Theme">${[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<button type="button" data-x="theme" data-v="${v}" aria-pressed="${THEME === v}">${l}</button>`).join("")}</div>
      </div></header>
      <main class="vt"><div class="vt-wrap">${inner}</div></main>
      ${foot}
    </div>`;
  }
  function render(o) {
    o = o || {};
    const s = U.screen;
    let html;
    if (!OPEN) html = closedHtml();
    else if (s === "start") html = startHtml();
    else if (s === "p2") html = p2Html();
    else if (s === "review") html = reviewHtml();
    else if (s === "thanks") html = thanksHtml();
    else if (s.indexOf("q:") === 0 && Q.qOf(s.slice(2))) html = questionHtml(Q.qOf(s.slice(2)));
    else { U.screen = "start"; html = startHtml(); }
    mount.innerHTML = shell(html);
    if (s.indexOf("q:") === 0) wireQuestion(Q.qOf(s.slice(2)));
    if (o.keepY != null) W.scrollTo(0, o.keepY); else if (!o.stay) W.scrollTo(0, 0);
    if (o.focus !== false) {
      const t = (o.focus && mount.querySelector(o.focus)) || mount.querySelector("h1");
      if (t) t.focus({ preventScroll: o.keepY != null });
    }
    fitSoon();
  }
  function go(screen, o) {
    U.screen = screen;
    U.warn = false; U.copyFail = null; U.msg = ""; U.confirm = null; U.err = "";
    if (screen !== "thanks") S.at = screen; else S.at = "thanks";
    save();
    render(o);
    if (screen.indexOf("q:") === 0) warmNext(Q.qOf(screen.slice(2)));
  }

  /* ---------- closed ---------- */
  const closedHtml = () => `<div class="vt-col"><h1 tabindex="-1">Voting has closed.</h1><p class="vt-lead">This vote on the Florin app's screens and charts isn't taking picks any more.</p></div>`;

  /* ---------- start ---------- */
  function whereLine() {
    const at = S.at || "start";
    if (at.indexOf("q:") === 0 && Q.qOf(at.slice(2))) return `You're on question ${Q.qOf(at.slice(2)).n} of ${ballotTotal}.`;
    if (at === "p2") return `You're at the start of Part 2, question ${P1N + 1} of ${ballotTotal}.`;
    if (at === "review") return "You're on your picks, ready to send.";
    return `You've answered ${answeredN()} of ${ballotTotal}.`;
  }
  function startHtml() {
    const back = S.name && (answeredN() > 0 || /^q:|^p2$|^review$/.test(S.at || "")) && S.at !== "thanks" && S.at !== "start";
    const [m0, m1] = Q.minutes();
    const roleChips = Q.ROLES.map(([id, w]) => `<button type="button" class="vt-chip" role="radio" data-x="role" data-v="${id}" aria-checked="${S.role === id}">${esc(w)}</button>`).join("");
    const conf = U.confirm === "over" ? `<div class="vt-confirm" role="group" aria-labelledby="vt-over-h"><p id="vt-over-h">This clears your picks and notes in this browser.</p><div class="vt-row-btns"><button type="button" class="vt-btn" data-x="over-yes">Clear my picks</button><button type="button" class="vt-btn vt-btn--line" data-x="over-no">Keep them</button></div></div>` : "";
    const welcome = back ? `<section class="vt-panel" aria-labelledby="vt-wb-h">
        <p id="vt-wb-h" class="vt-lead">Welcome back, ${esc(firstName())}. ${esc(whereLine())}</p>
        <div class="vt-row-btns"><button type="button" class="vt-btn" data-x="resume">Pick up where I was</button><button type="button" class="vt-btn vt-btn--line" data-x="over">Start over</button></div>${conf}
      </section>` : "";
    const form = back ? "" : `<form class="vt-form" id="vt-start" novalidate>
        <div class="vt-field">
          <label for="vt-name">Your name</label>
          <p class="vt-hint" id="vt-name-hint">First and last, so ${esc(TO)} knows whose picks are whose.</p>
          <input class="vt-in" id="vt-name" name="name" type="text" autocomplete="name" maxlength="${B.NAME_MAX}" value="${esc(S.name)}" aria-describedby="vt-name-hint${U.err ? " vt-name-err" : ""}"${U.err ? ' aria-invalid="true"' : ""}>
          ${U.err ? `<p class="vt-err" id="vt-name-err">${esc(U.err)}</p>` : ""}
        </div>
        <div class="vt-field">
          <p class="vt-flabel" id="vt-role-l">Your role <span class="vt-hint">(optional)</span></p>
          <div class="vt-chips" role="radiogroup" aria-labelledby="vt-role-l">${roleChips}</div>
          ${S.role === "other" ? `<label for="vt-role-o" class="vt-hint">Your role, in a few words</label><input class="vt-in" id="vt-role-o" type="text" maxlength="${B.ROLE_MAX}" value="${esc(S.roleOther)}">` : ""}
        </div>
        <p class="vt-hint">${esc(TO)} gets your name, role, picks and notes, when you voted, and the order this page showed you the options in${ENDPOINT ? ", with a random id for this browser" : ""}.</p>
        <div class="vt-start-go"><button type="submit" class="vt-btn">Start</button></div>
      </form>`;
    return `<div class="vt-col">
      <p class="vt-k">Florin Health · Prototype</p>
      <h1 tabindex="-1">Pick your Florin app</h1>
      <p class="vt-lead">${esc(TO)} is asking which screens and charts the Florin app should have. Each question shows the options, drawn from the same demo logs. Pick the one you'd want, and say why if you like.</p>
      <p class="vt-p">${ballotTotal} questions in two parts: ${P1N} about the app and ${P2N} about the charts. About ${m0 === m1 ? m0 : `${m0} to ${m1}`} minutes. No preference is a fine answer to any of them. This browser keeps your place if you stop.</p>
      ${welcome}${form}
      <details class="vt-disc"><summary>What's not here</summary><div class="vt-disc-b"><ul>
        <li>One data style for the whole app. Part 2 asks chart by chart instead.</li>
        <li>Ask Florin on Free, membership and price, and FloraScore's weights. These are business calls rather than screens to look at.</li>
      </ul></div></details>
    </div>`;
  }
  function startSubmit() {
    const inp = doc.getElementById("vt-name");
    const name = inp ? inp.value.replace(/\s+/g, " ").trim().slice(0, B.NAME_MAX) : S.name;
    S.name = name;
    const ro = doc.getElementById("vt-role-o");
    if (ro) S.roleOther = ro.value.replace(/\s+/g, " ").trim().slice(0, B.ROLE_MAX);
    if (!name || !B.nameKey(name)) { U.err = "Add your name to start."; save(); render({ focus: "#vt-name", stay: true }); return; }
    U.err = "";
    if (!S.seed) S.seed = B.newSeed();
    save();
    go(`q:${Q.QS[0].id}`);
  }

  /* ---------- a question ---------- */
  const qIndex = (q) => Q.QS.indexOf(q);
  function frameIdx(q, o, n) { const k = `${q.id}:${o.id}`; const i = U.fr[k] || 0; return Math.max(0, Math.min(n - 1, i)); }
  function picHtml(q, o) {
    const fs = D.ready ? D.frames(q, o.id, { day5: q.id === "home" && U.day5 }) : [{ html: null, cap: "", kind: q.part === 1 ? "phone" : "card" }];
    const n = fs.length, i = frameIdx(q, o, n);
    const lede = q.part === 2 && D.ready ? D.lede(q) : "";
    const frames = fs.map((f, k) => `<figure class="vt-fr${k === i ? " is-on" : ""}" data-i="${k}">${f.html
      ? `${q.part === 2 && f.cap && f.cap !== lede ? `<p class="vt-span">${esc(f.cap)}</p>` : ""}<div class="vt-fit vt-fit--${f.kind}" data-focus="${esc(f.focus || "top")}" aria-hidden="true"><div class="vt-zoom">${f.html}</div></div>${f.kind === "phone" ? '<div class="vt-fade" aria-hidden="true"></div>' : ""}`
      : '<p class="vt-missing">This picture didn\'t draw.</p>'}${q.part === 1 && n > 1 ? `<figcaption>${esc(f.cap)}</figcaption>` : ""}</figure>`).join("");
    const strip = n > 1 ? `<div class="vt-strip"><p aria-live="polite"><b>${i + 1} of ${n}</b><span>${esc(fs[i].cap)}</span></p><div class="vt-arrows">
        <button type="button" class="vt-arrow" data-x="fr" data-d="-1" data-o="${esc(o.id)}" aria-label="Previous picture of ${esc(o.name)}"${i === 0 ? " disabled" : ""}>${IC.left}</button>
        <button type="button" class="vt-arrow" data-x="fr" data-d="1" data-o="${esc(o.id)}" aria-label="Next picture of ${esc(o.name)}"${i === n - 1 ? " disabled" : ""}>${IC.right}</button></div></div>` : "";
    const drew = fs.some((f) => f.html);
    const cover = drew ? `<button type="button" class="vt-big-cover" data-x="big" data-o="${esc(o.id)}" tabindex="-1" aria-hidden="true"></button>` : "";
    return `<div class="vt-pic" data-n="${n}" style="--vt-n:${n}">${strip}<div class="vt-frames">${frames}${cover}</div></div>`;
  }
  const bigBtn = (q, o) => (D.ready ? `<button type="button" class="vt-big" data-x="big" data-o="${esc(o.id)}" aria-haspopup="dialog">${IC.big}See it bigger<span class="vt-vh">: ${esc(o.name)}</span></button>` : "");
  function whyHtml(q, o) {
    const s = D.ready ? D.sheet(q, o.id) : (typeof o.sheet === "function" ? null : o.sheet);
    if (!s) return "";
    const ctx = D.ready ? D.ctx() : {};
    return `<details class="vt-why"><summary>Why or why not</summary><dl>
      <div><dt>What it is</dt><dd>${esc(Q.fill(s[0], ctx))}</dd></div>
      <div><dt>Why do it</dt><dd>${esc(Q.fill(s[1], ctx))}</dd></div>
      <div><dt>Why not</dt><dd>${esc(Q.fill(s[2], ctx))}</dd></div>
    </dl></details>`;
  }
  /* a pick is a native radio in a fieldset: one Tab stop for the question, the arrow keys move and pick, and the
     group holds anything else in the cards without breaking it. Its label is drawn as a button */
  const pickText = (o, on) => (on ? `${IC.check}Picked<span class="vt-vh">: ${esc(o.name)}</span>` : `Pick ${esc(o.name)}`);
  const radio = (q, id, on, label, cls) => `<label class="${cls}${on ? " is-on" : ""}" data-p="${esc(id)}"><input type="radio" class="vt-radio" name="vt-pick" value="${esc(id)}"${on ? " checked" : ""}><span class="vt-pick-t">${label}</span></label>`;
  function optHtml(q, o, k, n) {
    const on = pickOf(q.id) === o.id;
    const ctx = D.ready ? D.ctx() : {};
    return `<article class="vt-opt${on ? " is-on" : ""}" data-opt="${esc(o.id)}" aria-labelledby="vt-o-${esc(o.id)}">
      <div class="vt-opt-h"><h2 id="vt-o-${esc(o.id)}">${esc(o.name)}</h2><p class="vt-line">${esc(Q.fill(o.line, ctx))}</p>${o.sub ? `<p class="vt-tag">${esc(o.sub)}</p>` : ""}<p class="vt-vh">Option ${k + 1} of ${n}</p></div>
      ${picHtml(q, o)}
      ${radio(q, o.id, on, pickText(o, on), "vt-pick")}
      <div class="vt-opt-f">${bigBtn(q, o)}${whyHtml(q, o)}</div>
    </article>`;
  }
  function questionHtml(q) {
    const i = qIndex(q), part = Q.PARTS[q.part - 1];
    const opts = orderOf(q);
    const a = S.a[q.id] || {};
    const none = a.p === Q.NONE.id;
    const last = i === Q.QS.length - 1;
    const nextLabel = U.back === "review" || last ? "Review my picks" : "Next";
    const demo = D.ready ? D.demoLine({ day5: q.id === "home" && U.day5 }) : "";
    const lede = D.ready ? D.lede(q) : q.lede || "";
    const logs = q.id === "home" && D.ready ? (() => { const [a1, a2] = D.logsLabels(); return `<div class="vt-ctl"><span class="vt-k" id="vt-logs-l">Logs</span><div class="vt-seg" role="group" aria-labelledby="vt-logs-l"><button type="button" data-x="logs" data-v="est" aria-pressed="${!U.day5}">${esc(a1)}</button><button type="button" data-x="logs" data-v="new" aria-pressed="${U.day5}">${esc(a2)}</button></div></div>`; })() : "";
    const also = q.id === "c-checkin" && pickOf("checkin") === "off" ? '<p class="vt-also">You picked the app without a check-in. Pick a style in case it stays, or No preference.</p>' : "";
    const drawErr = !D.ready ? '<p class="vt-missing">The app\'s files didn\'t load, so the pictures can\'t be drawn. You can still pick from the names and the Why or why not.</p>' : "";
    return `<section class="vt-q" data-q="${esc(q.id)}" data-part="${q.part}">
      <div class="vt-prog">
        <div class="vt-track" role="progressbar" aria-label="Progress" aria-valuemin="1" aria-valuemax="${ballotTotal}" aria-valuenow="${i + 1}" aria-valuetext="Question ${i + 1} of ${ballotTotal}"><i style="width:${Math.round(((i + 1) / ballotTotal) * 100)}%"></i></div>
        <p>${esc(part.name)}. Question ${i + 1} of ${ballotTotal}</p>
      </div>
      <header class="vt-qh">
        <h1 tabindex="-1" id="vt-qt">${esc(q.title)}</h1>
        ${q.sub ? `<p class="vt-sub"><span class="vt-sub-k">It answers:</span> “${esc(q.sub)}”</p>` : ""}
        <p class="vt-lede">${esc(lede)}${/[.?]$/.test(lede) ? "" : "."}<span class="vt-demo"> ${esc(demo)}</span></p>
        ${also}${logs}${drawErr}
      </header>
      <div class="vt-nav" aria-hidden="true"><p>Option <b data-nav-i>1</b> of ${opts.length}</p><div class="vt-arrows"><button type="button" class="vt-arrow" data-x="nav" data-d="-1" tabindex="-1">${IC.left}</button><button type="button" class="vt-arrow" data-x="nav" data-d="1" tabindex="-1">${IC.right}</button></div></div>
      <fieldset class="vt-opts">
        <legend class="vt-vh">${esc(q.title)}</legend>
        <div class="vt-row${opts.length === 1 ? " vt-row--one" : ""}" style="--vt-cols:${opts.length}">${opts.map((o, k) => optHtml(q, o, k, opts.length)).join("")}</div>
        ${radio(q, Q.NONE.id, none, `${none ? IC.check : ""}${esc(Q.NONE.name)}`, "vt-none")}
      </fieldset>
      <div class="vt-note">
        <label for="vt-note" id="vt-note-l">${none ? "Anything to add? (optional)" : "Why this one? (optional)"}</label>
        <textarea class="vt-ta" id="vt-note" maxlength="${NOTE_MAX}" rows="3" aria-describedby="vt-note-n">${esc(a.note || "")}</textarea>
        <p class="vt-count" id="vt-note-n">${(a.note || "").length} of ${NOTE_MAX}</p>
      </div>
      <div class="vt-actions${U.warn ? " is-warn" : ""}">
        <button type="button" class="vt-btn vt-btn--line" data-x="back">Back</button>
        <div class="vt-next">${a.p ? "" : `<p class="vt-hint" id="vt-next-h">Pick one, or No preference.</p>`}<button type="button" class="vt-btn" data-x="next"${a.p ? "" : ' aria-disabled="true" aria-describedby="vt-next-h"'}>${nextLabel}</button></div>
      </div>
    </section>`;
  }
  /* after a pick: the radios, the card's edge, the note's label and Next, without redrawing the pictures */
  function showPick(q) {
    const sec = mount.querySelector(".vt-q");
    if (!sec) return;
    const p = pickOf(q.id);
    sec.querySelectorAll(".vt-opt").forEach((c) => {
      const on = c.dataset.opt === p;
      c.classList.toggle("is-on", on);
      const b = c.querySelector(".vt-pick");
      const o = Q.optOf(q, c.dataset.opt);
      if (b && o) { b.classList.toggle("is-on", on); b.querySelector(".vt-pick-t").innerHTML = pickText(o, on); const r = b.querySelector("input"); if (r && r.checked !== on) r.checked = on; }
    });
    const nb = sec.querySelector(".vt-none");
    if (nb) { const on = p === Q.NONE.id; nb.classList.toggle("is-on", on); nb.querySelector(".vt-pick-t").innerHTML = `${on ? IC.check : ""}${esc(Q.NONE.name)}`; const r = nb.querySelector("input"); if (r && r.checked !== on) r.checked = on; }
    const l = doc.getElementById("vt-note-l");
    if (l) l.textContent = p === Q.NONE.id ? "Anything to add? (optional)" : "Why this one? (optional)";
    const next = sec.querySelector("[data-x='next']"), h = doc.getElementById("vt-next-h");
    if (p && next) { next.removeAttribute("aria-disabled"); next.removeAttribute("aria-describedby"); if (h) h.remove(); }
    const bar = sec.querySelector(".vt-actions");
    if (bar) bar.classList.remove("is-warn");
  }
  function setPick(q, p) {
    const a = S.a[q.id] || { p: null, note: "" };
    a.p = p;
    S.a[q.id] = a;
    save();
    showPick(q);
  }
  function radios() { return [...mount.querySelectorAll(".vt-opts input.vt-radio")]; }
  function next(q) {
    if (!pickOf(q.id)) {
      U.warn = true;
      const bar = mount.querySelector(".vt-actions");
      if (bar) bar.classList.add("is-warn");
      const r = radios()[0];
      if (r) { r.focus({ preventScroll: true }); r.closest("label").scrollIntoView({ block: "nearest", inline: "nearest" }); }
      return;
    }
    if (U.back === "review") { U.back = null; go("review"); return; }
    const i = qIndex(q);
    if (i === Q.QS.length - 1) { go("review"); return; }
    const nq = Q.QS[i + 1];
    if (q.part === 1 && nq.part === 2) { go("p2"); return; }
    go(`q:${nq.id}`);
  }
  function back(q) {
    U.back = null;
    const i = qIndex(q);
    if (i === 0) { go("start"); return; }
    const pq = Q.QS[i - 1];
    if (q.part === 2 && pq.part === 1) { go("p2"); return; }
    go(`q:${pq.id}`);
  }
  /* the options row on a phone: which one is in view, and the arrows over it */
  function wireQuestion(q) {
    const row = mount.querySelector(".vt-row");
    const ta = doc.getElementById("vt-note");
    if (ta) ta.addEventListener("input", () => {
      const a = S.a[q.id] || { p: null, note: "" };
      a.note = ta.value.slice(0, NOTE_MAX);
      S.a[q.id] = a;
      save();
      const c = doc.getElementById("vt-note-n");
      if (c) c.textContent = `${ta.value.length} of ${NOTE_MAX}`;
    });
    if (!row) return;
    const cards = [...row.querySelectorAll(".vt-opt")];
    const navI = mount.querySelector("[data-nav-i]");
    const navB = [...mount.querySelectorAll("[data-x='nav']")];
    const seen = () => {
      const r = row.getBoundingClientRect();
      let best = 0, bd = Infinity;
      cards.forEach((c, k) => { const d = Math.abs(c.getBoundingClientRect().left - r.left - parseFloat(getComputedStyle(row).paddingLeft || 0)); if (d < bd) { bd = d; best = k; } });
      return best;
    };
    const sync = () => {
      const k = seen();
      U.idx[q.id] = k;
      if (navI) navI.textContent = String(k + 1);
      if (navB[0]) navB[0].disabled = k === 0;
      if (navB[1]) navB[1].disabled = k === cards.length - 1;
    };
    let t = 0;
    row.addEventListener("scroll", () => { cancelAnimationFrame(t); t = requestAnimationFrame(sync); }, { passive: true });
    /* come back to the option this voter last looked at, or the one picked */
    const p = pickOf(q.id);
    const start = U.idx[q.id] != null ? U.idx[q.id] : Math.max(0, cards.findIndex((c) => c.dataset.opt === p));
    if (start > 0 && cards[start]) requestAnimationFrame(() => { row.scrollLeft = cards[start].offsetLeft - cards[0].offsetLeft; sync(); });
    else sync();
  }
  function navTo(d) {
    const row = mount.querySelector(".vt-row");
    if (!row) return;
    const cards = [...row.querySelectorAll(".vt-opt")];
    const qid = (mount.querySelector(".vt-q") || {}).dataset.q;
    const k = Math.max(0, Math.min(cards.length - 1, (U.idx[qid] || 0) + d));
    const reduce = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: cards[k].offsetLeft - cards[0].offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }
  /* one picture of an option to the next, in its card */
  function frameTo(q, oid, d, scope) {
    const fs = D.ready ? D.frames(q, oid, { day5: q.id === "home" && U.day5 }) : [];
    const n = fs.length;
    if (n < 2) return;
    const k = `${q.id}:${oid}`;
    const i = Math.max(0, Math.min(n - 1, (U.fr[k] || 0) + d));
    U.fr[k] = i;
    const cardEl = scope || mount.querySelector(`.vt-opt[data-opt="${CSS.escape(oid)}"]`);
    if (!cardEl) return;
    cardEl.querySelectorAll(".vt-fr").forEach((f) => f.classList.toggle("is-on", +f.dataset.i === i));
    const st = cardEl.querySelector(".vt-strip");
    if (st) {
      st.querySelector("p").innerHTML = `<b>${i + 1} of ${n}</b><span>${esc(fs[i].cap)}</span>`;
      const [a, b] = st.querySelectorAll(".vt-arrow");
      if (a) a.disabled = i === 0;
      if (b) b.disabled = i === n - 1;
      const f = doc.activeElement;
      if (f && f.disabled) (i === 0 ? b : a).focus();
    }
    fit(cardEl);
  }
  /* the next question's pictures, drawn while this one is read */
  function warmNext(q) {
    if (!q || !D.ready) return;
    const nq = Q.QS[qIndex(q) + 1];
    if (!nq) return;
    const go2 = () => { try { nq.opts.forEach((o) => D.frames(nq, o.id, {})); } catch (e) { /* drawn when opened */ } };
    if (W.requestIdleCallback) W.requestIdleCallback(go2, { timeout: 1500 }); else setTimeout(go2, 300);
  }

  /* ---------- fitting the pictures to their columns ---------- */
  let fitT = 0;
  const fitSoon = () => { cancelAnimationFrame(fitT); fitT = requestAnimationFrame(() => { fit(mount); fit(dlg); }); };
  /* frames side by side only when each still gets a phone big enough to read (300px of its 390); otherwise one at a
     time with arrows. On a phone (under 640px) a Part 1 picture shows the part of its screen the option is about,
     CROP of its 844px (the top, or from the top of a sheet that rises from the bottom), ending in a fade; See it
     bigger and a tap on the picture show the whole screen */
  const SIDE_MIN = 300, CROP = 450;
  function fit(scope) {
    if (!scope) return;
    scope.querySelectorAll(".vt-pic").forEach((pic) => {
      const n = +pic.dataset.n || 1;
      const side = n > 1 && W.innerWidth >= 1100 && (pic.clientWidth - 12 * (n - 1)) / n >= SIDE_MIN && !pic.closest(".vt-dlg");
      pic.classList.toggle("is-side", side);
    });
    const phone = W.innerWidth < 640;
    scope.querySelectorAll(".vt-fit").forEach((f) => {
      const z = f.querySelector(".vt-zoom");
      const w = f.clientWidth;
      if (!z || !w) return;
      const k = Math.floor(Math.min(1, w / 390) * 1000) / 1000;
      z.style.zoom = String(k);
      const crop = phone && f.classList.contains("vt-fit--phone") && !f.closest(".vt-dlg");
      f.classList.toggle("is-crop", crop);
      f.style.height = crop ? `${Math.round(CROP * k)}px` : "";
      /* a sheet's frame starts at the sheet's top (or as low as the screen goes), and fades at whichever end is cut */
      let top = 0;
      if (crop && f.dataset.focus === "sheet" && f.offsetParent) {
        const panel = f.querySelector(".ap-o--sheet .ap-o-p");
        if (panel) top = Math.max(0, panel.getBoundingClientRect().top - z.getBoundingClientRect().top - Math.round(12 * k));
      }
      if (crop) f.scrollTop = top;
      f.classList.toggle("is-end", crop && f.scrollTop > 0 && f.scrollTop + f.clientHeight >= f.scrollHeight - 1);
    });
    /* a frame drawn to show one part of a screen (the check-in card, a card on Insights, the clinician note) scrolls to it */
    scope.querySelectorAll(".vt-fr.is-on [data-vt-at]:not([data-vt-done]), .vt-pic.is-side [data-vt-at]:not([data-vt-done])").forEach((t) => {
      const sc = t.closest(".ap-ck-b, .ap-fsh-b, [data-scroll], .ap-layer");
      if (!sc || !sc.clientHeight) return;
      const r = sc.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const k = r.height / sc.clientHeight || 1;
      /* already in the first screen, above the tab bar (or, in a picture cut short on a phone, above the cut and its
         fade): left where it is */
      const top = (tr.top - r.top) / k, h = tr.height / k;
      const fitEl = t.closest(".vt-fit");
      const seen = fitEl && fitEl.classList.contains("is-crop") ? Math.min(sc.clientHeight - 112, CROP - 64 - (r.top - fitEl.querySelector(".vt-zoom").getBoundingClientRect().top) / k) : sc.clientHeight - 112;
      if (top + h > seen) sc.scrollTop += top - 72;
      t.setAttribute("data-vt-done", "1");
    });
  }
  W.addEventListener("resize", fitSoon);

  /* ---------- the bigger view ---------- */
  const dlg = doc.createElement("dialog");
  dlg.className = "vt-dlg";
  dlg.setAttribute("aria-labelledby", "vt-dlg-h");
  doc.body.appendChild(dlg);
  let dlgFrom = null, dlgQ = null, dlgO = null;
  function bigHtml(q, o) {
    const fs = D.frames(q, o.id, { day5: q.id === "home" && U.day5 });
    const n = fs.length, i = frameIdx(q, o, n);
    const on = pickOf(q.id) === o.id;
    const frames = fs.map((f, k) => `<figure class="vt-fr${k === i ? " is-on" : ""}" data-i="${k}">${f.html ? `${q.part === 2 && f.cap ? `<p class="vt-span">${esc(f.cap)}</p>` : ""}<div class="vt-fit vt-fit--${f.kind}" aria-hidden="true"><div class="vt-zoom">${f.html}</div></div>` : '<p class="vt-missing">This picture didn\'t draw.</p>'}</figure>`).join("");
    const strip = n > 1 ? `<div class="vt-strip"><p aria-live="polite"><b>${i + 1} of ${n}</b><span>${esc(fs[i].cap)}</span></p><div class="vt-arrows">
        <button type="button" class="vt-arrow" data-x="fr" data-d="-1" data-o="${esc(o.id)}" aria-label="Previous picture"${i === 0 ? " disabled" : ""}>${IC.left}</button>
        <button type="button" class="vt-arrow" data-x="fr" data-d="1" data-o="${esc(o.id)}" aria-label="Next picture"${i === n - 1 ? " disabled" : ""}>${IC.right}</button></div></div>` : "";
    return `<div class="vt-dlg-in">
      <div class="vt-dlg-h"><h2 id="vt-dlg-h">${esc(o.name)}</h2><button type="button" class="vt-btn vt-btn--line vt-btn--sm" data-x="dlg-close">${IC.close}Close</button></div>
      <div class="vt-dlg-b"><div class="vt-pic" data-opt="${esc(o.id)}" data-n="${n}"><div class="vt-frames">${frames}</div></div></div>
      <div class="vt-dlg-f">${strip || `<p class="vt-hint">${esc(q.part === 1 ? fs[0].cap : "")}</p>`}<button type="button" class="vt-pick${on ? " is-on" : ""}" data-x="dlg-pick" data-p="${esc(o.id)}">${on ? `${IC.check}Picked: ${esc(o.name)}. Close` : `Pick ${esc(o.name)}`}</button></div>
    </div>`;
  }
  function openBig(q, oid, from) {
    const o = Q.optOf(q, oid);
    if (!o || !D.ready) return;
    dlgFrom = from; dlgQ = q; dlgO = o;
    dlg.innerHTML = bigHtml(q, o);
    if (D.again) D.again(dlg);
    try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
    const c = dlg.querySelector("[data-x='dlg-close']");
    if (c) c.focus();
    requestAnimationFrame(() => fit(dlg));
  }
  function closeBig() { if (dlg.open) { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } } }
  dlg.addEventListener("close", () => {
    dlg.innerHTML = "";
    const q = dlgQ;
    dlgQ = null; dlgO = null;
    /* the card's picture follows the one last looked at */
    if (q && mount.querySelector(".vt-q")) mount.querySelectorAll(".vt-opt").forEach((c) => { const fs = D.frames(q, c.dataset.opt, { day5: q.id === "home" && U.day5 }); if (fs.length > 1) frameTo(q, c.dataset.opt, 0, c); });
    if (dlgFrom && doc.contains(dlgFrom)) dlgFrom.focus();
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) { closeBig(); return; }
    const b = e.target.closest("[data-x]");
    if (!b || !dlgQ) return;
    if (b.dataset.x === "dlg-close") closeBig();
    else if (b.dataset.x === "fr") frameTo(dlgQ, b.dataset.o, +b.dataset.d, dlg.querySelector(".vt-dlg-in"));
    else if (b.dataset.x === "dlg-pick") { setPick(dlgQ, b.dataset.p); closeBig(); }
  });

  /* ---------- Part 2 ---------- */
  function p2Html() {
    const six = Q.STYLES.length;
    return `<div class="vt-col">
      <div class="vt-prog"><div class="vt-track" role="progressbar" aria-label="Progress" aria-valuemin="1" aria-valuemax="${ballotTotal}" aria-valuenow="${P1N}" aria-valuetext="${P1N} of ${ballotTotal} done"><i style="width:${Math.round((P1N / ballotTotal) * 100)}%"></i></div><p>${esc(Q.PARTS[1].name)}</p></div>
      <h1 tabindex="-1">Part 2: the charts</h1>
      <p class="vt-lead">${P2N} charts, each drawn in ${six} styles from the same logs. Pick the style you'd want for each one. No preference is a fine answer for any chart.</p>
      <p class="vt-p">The styles keep this order on every chart, so you can compare as you go. Each chart also says what its own card shows.</p>
      <ul class="vt-styles">${orderOf(Q.inPart(2)[0]).map((o) => `<li><b>${esc(o.name)}</b><span>${esc(o.style || o.line)}</span></li>`).join("")}</ul>
      <div class="vt-row-btns"><button type="button" class="vt-btn vt-btn--quiet" data-x="p2-skip" aria-describedby="vt-skip-h">Skip to my picks</button><p class="vt-hint" id="vt-skip-h">Part 2 will show as not answered, and you can come back to it.</p></div>
      <div class="vt-actions"><button type="button" class="vt-btn vt-btn--line" data-x="p2-back">Back</button><button type="button" class="vt-btn" data-x="p2-go">Start Part 2</button></div>
    </div>`;
  }

  /* ---------- the ballot ---------- */
  const noteOf = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
  function fingerprint() {
    return JSON.stringify([S.name.trim(), S.role, S.role === "other" ? S.roleOther.trim() : "", Q.QS.map((q) => (pickOf(q.id) ? [q.id, pickOf(q.id), noteOf(S.a[q.id].note)] : 0))]);
  }
  /* the same answers keep the same ballot (its id and time), so a retry or Copy again sends it again; a change makes a
     new one, and the latest counts */
  function ballot() {
    const fp = fingerprint();
    if (!S.cur || S.cur.fp !== fp) { S.cur = { bid: B.newBid(), at: B.isoNow(), fp, via: null, state: null, part: 0 }; save(); }
    const answers = {};
    Q.QS.forEach((q) => { if (pickOf(q.id)) answers[q.id] = { p: pickOf(q.id), note: noteOf(S.a[q.id].note) }; });
    return B.make({ vote: VOTE, bid: S.cur.bid, vid: S.vid, name: S.name, role: S.role, role_other: S.roleOther, at: S.cur.at, build: BUILD, seed: S.seed, answers });
  }
  const slackOf = (b) => B.text(b, { max: SLACK_MAX });

  /* ---------- review ---------- */
  function reviewHtml() {
    const n = answeredN(), notes = notesN();
    const rows = Q.PARTS.map((P) => `<section class="vt-slip" aria-labelledby="vt-rp-${P.n}">
        <div class="vt-slip-h"><h2 id="vt-rp-${P.n}">${esc(P.name)}</h2></div>
        <ol class="vt-list" role="list">${Q.inPart(P.n).map((q) => {
          const p = pickOf(q.id), note = p ? noteOf(S.a[q.id].note) : "";
          return `<li${p ? "" : ' class="is-skip"'}><p class="vt-li-t"><b>${q.n}.</b><span>${esc(q.label)}:</span> <strong>${p ? esc(optLabel(q, p)) : "Not answered"}</strong></p>${note ? `<p class="vt-li-n">${esc(note)}</p>` : ""}<button type="button" class="vt-btn vt-btn--line vt-btn--sm vt-li-x" data-x="change" data-q="${esc(q.id)}">${p ? "Change" : "Answer it"}<span class="vt-vh">: ${esc(q.label)}</span></button></li>`;
        }).join("")}</ol>
      </section>`).join("");
    return `<div class="vt-col">
      <h1 tabindex="-1">Your picks</h1>
      <p class="vt-p">${n} of ${ballotTotal} answered, ${notes === 0 ? "no notes" : plural(notes, "note")}.</p>
      ${rows}
      ${sendHtml()}
      <div class="vt-actions"><button type="button" class="vt-btn vt-btn--line" data-x="rv-back">Back</button>${barSend()}</div>
    </div>`;
  }
  /* the review's main action, in the bar at the foot of the screen, so it's in reach from the first row: Send to Will
     (the hosted site) or Copy for Slack. The section under the list says more and keeps the other way */
  function barSend() {
    if (!answeredN()) return "<span></span>";
    const b = ballot(), parts = slackOf(b).parts.length;
    const k = S.cur && S.cur.part && S.cur.part < parts ? S.cur.part : 0;
    if (ENDPOINT && !(S.cur && S.cur.state === "fallback")) return `<button type="button" class="vt-btn" data-x="send">Send to ${esc(TO)}</button>`;
    return `<button type="button" class="vt-btn" data-x="copy" data-k="${k}">${IC.copy}${parts > 1 ? `Copy part ${k + 1} of ${parts}` : "Copy for Slack"}</button>`;
  }
  function copyBoxHtml(text, k, n) {
    return `<div class="vt-copybox"><label for="vt-copy-ta">${n > 1 ? `Part ${k + 1} of ${n}, ready to copy. ` : "Your picks, ready to copy. "}Select all and copy.</label><textarea id="vt-copy-ta" readonly rows="12">${esc(text)}</textarea><div class="vt-row-btns"><button type="button" class="vt-btn" data-x="copied" data-k="${k}">I've copied it</button></div></div>`;
  }
  function sendHtml() {
    const n = answeredN();
    if (!n) return `<section class="vt-send" aria-labelledby="vt-send-h"><h2 id="vt-send-h">Send your picks to ${esc(TO)}</h2><p class="vt-hint">Answer at least one question to send your picks.</p></section>`;
    const b = ballot(), t = slackOf(b), parts = t.parts.length;
    const k = S.cur && S.cur.part && S.cur.part < parts ? S.cur.part : 0;
    const post = !!ENDPOINT && !(S.cur && S.cur.state === "fallback");
    const copyLabel = parts > 1 ? `Copy part ${k + 1} of ${parts}` : post ? "Copy for Slack instead" : "Copy for Slack";
    const how = post
      ? `<p>Send them straight to ${esc(TO)}, or copy them as a Slack message.</p>`
      : `<p>The page copies your picks as ${parts > 1 ? `${parts} Slack messages` : "one Slack message"}. Paste ${parts > 1 ? "each one" : "it"} in a message to ${esc(TO)}.</p>`;
    const fb = U.copyFail ? copyBoxHtml(t.parts[U.copyFail.k], U.copyFail.k, parts) : "";
    return `<section class="vt-send" aria-labelledby="vt-send-h">
      <h2 id="vt-send-h">Send your picks to ${esc(TO)}</h2>
      ${S.cur && S.cur.state === "fallback" ? `<p class="vt-status">This page couldn't reach ${esc(TO)}'s sheet, so this ballot goes by Slack instead.</p>` : ""}
      ${how}
      <div class="vt-row-btns">${post ? `<button type="button" class="vt-btn" data-x="send">Send to ${esc(TO)}</button><button type="button" class="vt-btn vt-btn--quiet" data-x="copy" data-k="${k}">${esc(copyLabel)}</button>` : `<button type="button" class="vt-btn" data-x="copy" data-k="${k}">${IC.copy}${esc(copyLabel)}</button>`}</div>
      <p class="vt-status" role="status">${esc(U.msg)}</p>
      ${fb}
      <details class="vt-disc"><summary>See what you'll send</summary><div class="vt-disc-b"><pre class="vt-pre">${esc(t.text)}</pre></div></details>
    </section>`;
  }

  /* ---------- copying ---------- */
  async function copyText(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* the frame may not allow it */ }
    try {
      const ta = doc.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.setAttribute("aria-hidden", "true");
      ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0";
      doc.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      const ok = doc.execCommand && doc.execCommand("copy");
      ta.remove();
      if (ok) return true;
    } catch (e) { /* the last way: the text, selected, for the voter to copy */ }
    return false;
  }
  async function doCopy(kWanted) {
    const b = ballot(), t = slackOf(b), n = t.parts.length;
    const k = Math.max(0, Math.min(n - 1, kWanted == null ? 0 : kWanted));
    const ok = await copyText(t.parts[k]);
    if (!ok) {
      U.copyFail = { k };
      render({ stay: true, keepY: W.scrollY, focus: "#vt-copy-ta" });
      const ta = doc.getElementById("vt-copy-ta");
      if (ta) { ta.focus(); ta.select(); }
      return;
    }
    copied(k, n);
  }
  function copied(k, n) {
    U.copyFail = null;
    if (k + 1 < n) {
      S.cur.part = k + 1;
      save();
      U.msg = `Part ${k + 1} of ${n} copied. Paste it to ${TO} in Slack, then copy part ${k + 2}.`;
      render({ stay: true, keepY: W.scrollY, focus: U.screen === "thanks" ? `[data-x='copy'][data-k='${k + 1}']` : "[data-x='copy']" });
      return;
    }
    S.cur.part = 0;
    S.cur.via = "slack";
    S.cur.state = "copied";
    if (!S.sent.some((x) => x.bid === S.cur.bid && x.via === "slack")) S.sent.push({ bid: S.cur.bid, at: B.isoNow(), via: "slack", ok: null });
    save();
    if (U.screen === "thanks") { U.msg = n > 1 ? `All ${n} parts copied.` : "Copied again."; render({ stay: true, keepY: W.scrollY, focus: false }); return; }
    go("thanks");
  }

  /* ---------- sending to the script (the hosted site) ---------- */
  let cbN = 0;
  function jsonp(params, ms) {
    return new Promise((resolve, reject) => {
      const cb = `__vt${Date.now().toString(36)}${(cbN++).toString(36)}`;
      const s = doc.createElement("script");
      let done = false;
      const end = (err, data) => { if (done) return; done = true; clearTimeout(t); W[cb] = () => {}; s.remove(); if (err) reject(err); else resolve(data); };
      const t = setTimeout(() => end(new Error("timeout")), ms);
      W[cb] = (data) => end(null, data);
      s.onerror = () => end(new Error("load"));
      const q = new URLSearchParams(Object.assign({}, params, { callback: cb }));
      s.src = ENDPOINT + (ENDPOINT.indexOf("?") >= 0 ? "&" : "?") + q.toString();
      s.async = true;
      (doc.head || doc.documentElement).appendChild(s);
    });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
  function setSend(bid, state) {
    if (!S.cur || S.cur.bid !== bid) return;
    S.cur.state = state;
    if (state === "sent") {
      const x = S.sent.find((y) => y.bid === bid && y.via === "post");
      if (x) x.ok = true; else S.sent.push({ bid, at: B.isoNow(), via: "post", ok: true });
    }
    save();
    if (U.screen === "thanks" || U.screen === "review") render({ stay: true, keepY: W.scrollY, focus: false });
    const live = doc.getElementById("vt-live");
    if (live) live.textContent = statusText();
  }
  async function post(json) {
    const bid = json.bid;
    const t0 = Date.now();
    try {
      await fetch(ENDPOINT + (ENDPOINT.indexOf("?") >= 0 ? "&" : "?") + "op=vote", { method: "POST", mode: "no-cors", cache: "no-store", credentials: "omit", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(json) });
    } catch (e) {
      /* the connection dropped (or the address is blocked): kept as pending, sent again on the next open */
      setSend(bid, "unsent");
      return;
    }
    let loadErr = 0;
    const at = [2000, 6000, 15000];
    for (let i = 0; i < at.length; i++) {
      await sleep(at[i] - (Date.now() - t0));
      if (!S.cur || S.cur.bid !== bid) return;
      try {
        const r = await jsonp({ op: "voted", vote: VOTE, bid }, 10000);
        if (r && r.ok && r.have) { setSend(bid, "sent"); return; }
      } catch (e) { if (e && e.message === "load") loadErr++; }
    }
    setSend(bid, loadErr === at.length ? "fallback" : "unsent");
  }
  function doSend() {
    const b = ballot();
    S.cur.via = "post";
    S.cur.state = "sending";
    S.cur.json = B.toJSON(b);
    if (!S.sent.some((x) => x.bid === b.bid && x.via === "post")) S.sent.push({ bid: b.bid, at: B.isoNow(), via: "post", ok: false });
    save();
    go("thanks");
    post(S.cur.json);
  }

  /* ---------- thanks ---------- */
  function statusText() {
    const c = S.cur || {};
    if (c.via === "post" && c.state === "sending") return `Sending your picks to ${TO}.`;
    if (c.via === "post" && c.state === "sent") return `Sent. ${TO} has your picks.`;
    if (c.via === "post" && c.state === "unsent") return `This didn't reach ${TO} yet. Try again, or copy it for Slack.`;
    if (c.state === "fallback") return `This page couldn't reach ${TO}'s sheet. Copy your picks and paste them in a message to ${TO} in Slack.`;
    return `Your picks are copied. Paste them in a message to ${TO} in Slack, and keep the last line as it is: it's how the votes are counted.`;
  }
  /* the heading says what's left to do: thanks only once the picks have reached Will */
  function thanksHead() {
    const c = S.cur || {};
    if (c.via === "post" && c.state === "sent") return `Thanks, ${firstName()}.`;
    if (c.via === "post" && c.state === "sending") return `Sending your picks to ${TO}`;
    if (c.via === "post" && c.state === "unsent") return `Your picks haven't reached ${TO} yet`;
    if (c.state === "fallback") return `One last step: copy your picks for ${TO}`;
    return `One last step: paste it to ${TO}`;
  }
  function thanksHtml() {
    const c = S.cur || {};
    const b = answeredN() ? ballot() : null;
    const t = b ? slackOf(b) : { parts: [], text: "" };
    const n = t.parts.length;
    const slack = c.via !== "post" || c.state === "fallback";
    const k = c.part && c.part < n ? c.part : 0;
    const copyBtns = !b ? "" : slack
      ? (n > 1 ? t.parts.map((x, i) => `<button type="button" class="vt-btn${i === k && c.state !== "copied" ? "" : " vt-btn--line"}" data-x="copy" data-k="${i}">${IC.copy}Copy part ${i + 1} of ${n}${c.state === "copied" ? " again" : ""}</button>`).join("") : `<button type="button" class="vt-btn${c.state === "copied" ? " vt-btn--line" : ""}" data-x="copy" data-k="0">${IC.copy}${c.state === "copied" ? "Copy it again" : "Copy for Slack"}</button>`)
      : c.state === "unsent" ? `<button type="button" class="vt-btn" data-x="resend">Try again</button><button type="button" class="vt-btn vt-btn--line" data-x="copy" data-k="0">Copy for Slack</button>`
      : c.state === "sent" ? "" : `<button type="button" class="vt-btn vt-btn--quiet" data-x="copy" data-k="0">Copy for Slack instead</button>`;
    const conf = U.confirm === "other" ? `<div class="vt-confirm" role="group" aria-labelledby="vt-oth-h"><p id="vt-oth-h">This clears ${esc(firstName())}'s picks from this browser, so someone else can vote here. A ballot already sent still counts.</p><div class="vt-row-btns"><button type="button" class="vt-btn" data-x="other-yes">Clear and start again</button><button type="button" class="vt-btn vt-btn--line" data-x="other-no">Keep my picks</button></div></div>` : "";
    return `<div class="vt-col">
      <h1 tabindex="-1">${esc(thanksHead())}</h1>
      <p class="vt-lead" role="status">${esc(statusText())}</p>
      ${slack && SLACK_OPEN && c.state === "copied" ? `<div class="vt-row-btns"><a class="vt-btn" href="${esc(SLACK_OPEN)}" target="_blank" rel="noopener">Open Slack</a></div>` : ""}
      ${copyBtns ? `<div class="vt-row-btns">${copyBtns}</div>` : ""}
      <p class="vt-status">${esc(U.msg)}</p>
      ${U.copyFail ? copyBoxHtml(t.parts[U.copyFail.k], U.copyFail.k, n) : ""}
      ${b ? `<p class="vt-bid">Ballot ${esc(b.bid)}. ${answeredN()} of ${ballotTotal} answered.</p><details class="vt-disc"><summary>See your ballot</summary><div class="vt-disc-b"><pre class="vt-pre">${esc(t.text)}</pre></div></details>` : ""}
      <div class="vt-row-btns"><button type="button" class="vt-btn vt-btn--line" data-x="change-vote">Change my vote</button><button type="button" class="vt-btn vt-btn--quiet" data-x="other">Vote as someone else</button></div>
      ${conf}
    </div>`;
  }

  /* ---------- presses ---------- */
  mount.addEventListener("submit", (e) => { if (e.target && e.target.id === "vt-start") { e.preventDefault(); startSubmit(); } });
  mount.addEventListener("input", (e) => {
    if (e.target.id === "vt-name") { S.name = e.target.value.slice(0, B.NAME_MAX); save(); }
    if (e.target.id === "vt-role-o") { S.roleOther = e.target.value.slice(0, B.ROLE_MAX); save(); }
  });
  /* a pick: a radio's change (a click on its label, Space, or an arrow key) */
  mount.addEventListener("change", (e) => {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains("vt-radio") || !t.checked) return;
    const qEl = mount.querySelector(".vt-q");
    const q = qEl ? Q.qOf(qEl.dataset.q) : null;
    if (q) setPick(q, t.value);
  });
  mount.addEventListener("click", (e) => {
    const b = e.target.closest("[data-x]");
    if (!b || !mount.contains(b)) return;
    const x = b.dataset.x;
    const qEl = mount.querySelector(".vt-q");
    const q = qEl ? Q.qOf(qEl.dataset.q) : null;
    switch (x) {
      case "theme": THEME = b.dataset.v; if (THEME === "auto") store.del(TKEY); else store.set(TKEY, THEME); applyTheme(); render({ keepY: W.scrollY, focus: `[data-x='theme'][data-v='${THEME}']` }); break;
      case "role": {
        const inp = doc.getElementById("vt-name");
        if (inp) S.name = inp.value.slice(0, B.NAME_MAX);
        S.role = S.role === b.dataset.v ? "" : b.dataset.v;
        if (S.role !== "other") S.roleOther = "";
        save();
        render({ stay: true, keepY: W.scrollY, focus: S.role === "other" ? "#vt-role-o" : `[data-x='role'][data-v='${b.dataset.v}']` });
        break;
      }
      case "resume": { U.back = null; const at = S.at && S.at !== "start" ? S.at : `q:${Q.QS[0].id}`; if (!S.seed) { S.seed = B.newSeed(); save(); } go(at); break; }
      case "over": U.confirm = "over"; render({ stay: true, keepY: W.scrollY, focus: "[data-x='over-yes']" }); break;
      case "over-no": U.confirm = null; render({ stay: true, keepY: W.scrollY, focus: "[data-x='resume']" }); break;
      case "over-yes": { const name = S.name, role = S.role, ro = S.roleOther; S = fresh(S.vid); S.name = name; S.role = role; S.roleOther = ro; save(); U.fr = {}; U.idx = {}; go("start", { focus: "#vt-name" }); break; }
      case "next": if (q) next(q); break;
      case "back": if (q) back(q); break;
      case "fr": if (q) frameTo(q, b.dataset.o, +b.dataset.d); break;
      case "nav": navTo(+b.dataset.d); break;
      case "big": if (q) openBig(q, b.dataset.o, b.classList.contains("vt-big-cover") ? b.closest(".vt-pic").querySelector(".vt-big") : b); break;
      case "logs": U.day5 = b.dataset.v === "new"; render({ keepY: W.scrollY, focus: `[data-x='logs'][data-v='${b.dataset.v}']` }); break;
      case "p2-go": go(`q:${Q.inPart(2)[0].id}`); break;
      case "p2-skip": go("review"); break;
      case "p2-back": go(`q:${Q.inPart(1)[P1N - 1].id}`); break;
      case "change": U.back = "review"; go(`q:${b.dataset.q}`); break;
      case "rv-back": go(`q:${Q.QS[Q.QS.length - 1].id}`); break;
      case "copy": doCopy(+b.dataset.k || 0); break;
      case "copied": copied(+b.dataset.k || 0, slackOf(ballot()).parts.length); break;
      case "send": doSend(); break;
      case "resend": if (S.cur && S.cur.json) { S.cur.state = "sending"; save(); render({ stay: true, keepY: W.scrollY, focus: false }); post(S.cur.json); } break;
      case "change-vote": go("review"); break;
      case "other": U.confirm = "other"; render({ stay: true, keepY: W.scrollY, focus: "[data-x='other-yes']" }); break;
      case "other-no": U.confirm = null; render({ stay: true, keepY: W.scrollY, focus: "[data-x='other']" }); break;
      case "other-yes": S = fresh(S.vid); save(); U.fr = {}; U.idx = {}; U.day5 = false; go("start", { focus: "#vt-name" }); break;
      default: break;
    }
  });
  /* the role chips on the start screen: the arrow keys move between them and pick as they go */
  mount.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!t || t.getAttribute("role") !== "radio") return;
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    const group = t.closest("[role='radiogroup']");
    if (!group) return;
    const list = [...group.querySelectorAll("[role='radio']")];
    const i = list.indexOf(t);
    if (i < 0) return;
    e.preventDefault();
    const n = list[(i + keys[e.key] + list.length) % list.length];
    n.focus();
    n.click();
  });
  /* the arrow keys move within a question's picks (each option, then No preference) and pick as they go: the browser
     does it for the radios. On a phone, the card of the radio arrowed to scrolls into view */
  mount.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains("vt-radio")) return;
    const card = t.closest(".vt-opt"), row = mount.querySelector(".vt-row");
    if (card && row && row.scrollWidth > row.clientWidth + 1) row.scrollTo({ left: card.offsetLeft - row.firstElementChild.offsetLeft, behavior: "auto" });
  });
  if (W.matchMedia) {
    const mm = W.matchMedia("(prefers-color-scheme: dark)");
    const on = () => { if (THEME === "auto") { applyTheme(); render({ keepY: W.scrollY, focus: false }); } };
    if (mm.addEventListener) mm.addEventListener("change", on); else if (mm.addListener) mm.addListener(on);
  }

  /* ---------- open ---------- */
  const live = doc.createElement("p");
  live.id = "vt-live"; live.className = "vt-vh"; live.setAttribute("aria-live", "polite");
  doc.body.appendChild(live);
  applyTheme();
  if (S.at === "thanks" && S.cur && (S.cur.via || S.sent.length)) U.screen = "thanks";
  else U.screen = "start";
  render({ focus: false });
  /* a ballot posted but not confirmed goes again, with the same id */
  if (ENDPOINT && S.cur && S.cur.via === "post" && (S.cur.state === "sending" || S.cur.state === "unsent") && S.cur.json) {
    S.cur.state = "sending"; save();
    if (U.screen !== "thanks") { U.screen = "thanks"; render({ focus: false }); }
    post(S.cur.json);
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitSoon).catch(() => {});
  W.VOTE_PAGE = { state: () => S, ui: U, go, CROP, SIDE_MIN, ballot, slackOf, orderOf: (q, seed) => { const k = S.seed; if (seed != null) S.seed = seed; try { return orderOf(q).map((o) => o.id); } finally { S.seed = k; } }, VOTE, KEY, mode: () => (ENDPOINT ? "post" : "slack") };
})();
