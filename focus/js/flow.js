/* Florin focus group test: the flow, self-guided, on the participant's own phone (claude/Florin focus group plan.md,
   section 3). Welcome, consent, intake, the tour's tasks with their questions, the comparisons, putting Florin on the
   phone, free use with comments, the exit survey, submit and thanks. The app runs in a frame (app.html) under a task
   strip; the flow talks to it through window.FOCUS_APP and sends every piece through FX (focus.js) as it happens.
   Every word a person reads is in questions.js or here, under Florin's rules: no medical claims, never normal, healthy,
   improving or worsening, no em or en dashes, no exclamation points, no humour, FloraScore one word, Ask Florin.
   The step a person is on is kept in the session (localStorage), so a reload, or the app opened from the home screen,
   picks up where they were. */
(function () {
  const FX = window.FX, Q = window.FXQ;
  if (!FX || !Q) return;
  const CFG = FX.CFG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
  const NUMW = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const PROTO = "Prototype only. Not for patients.";
  const ICON = {
    more: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="4.5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15.5" cy="10" r="1.4"/></svg>',
    chat: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12v8H9l-3.5 3v-3H4z"/></svg>',
    back: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4.5 6.5 10l5.5 5.5"/></svg>',
    check: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8"/></svg>',
    down: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg>'
  };

  /* ---------- the page ---------- */
  const root = $("#fx"), page = $("#fxPage"), view = $("#fxAppView"), strip = $("#fxStrip"), sheet = $("#fxSheet"), more = $("#fxMore");
  let frame = $("#fxFrame");
  const theme = () => root.setAttribute("data-theme", FX.dark() ? "dark" : "light");
  theme();
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

  /* ---------- the study's names, from config.js, worded without them while they're empty ---------- */
  const team = () => CFG.team || "";
  const contact = () => CFG.contact || "";
  const recruiter = () => CFG.recruiter || "";
  const contactOr = () => contact() || "the address in your invitation";
  const keepMonths = () => +CFG.keepMonths || 6;

  /* ---------- the session ---------- */
  const S = () => FX.session() || {};
  const save = (o) => FX.patch(o);
  const A = () => S().A || {};
  const setA = (qid, v) => { const a = Object.assign({}, A(), { [qid]: v }); save({ A: a }); };
  const STAGE_OF = { intake: "intake", setup: "intake", easynote: "tour", tourintro: "tour", task: "tour", compare: "compare", tw: "compare", install: "install", code: "install", is: "install", freeintro: "free", free: "free", exitintro: "exit", exit: "exit", pay: "exit", submit: "exit", thanks: "done", stopped: "stopped" };
  const STAGE_RANK = ["consent", "intake", "tour", "compare", "install", "free", "exit", "done"];
  function stageTo(st) {
    const s = S(), cur = s.stage || "consent";
    /* each stage reached also carries this window's visible minutes so far */
    if (st === "stopped" || STAGE_RANK.indexOf(st) > STAGE_RANK.indexOf(cur)) { save({ stage: st }); FX.send("session", { stage: st, active_minutes: activeMin() }); }
  }
  const PHASE_OF = { intake: "intake", setup: "intake", easynote: "tour", tourintro: "tour", tw: "tour", install: "install", code: "install", is: "install", freeintro: "free", free: "free", exitintro: "exit", exit: "exit", pay: "exit", submit: "exit", thanks: "done" };

  /* ---------- active time: minutes with the page visible ----------
     Each tab or app window counts its own (in sessionStorage, so a reload keeps it), and sends its own count; the
     script adds the windows up. Safari and the app on the home screen each count only their own part */
  let visSince = document.visibilityState === "visible" ? Date.now() : 0;
  const activeMs = () => (+FX.ss.get("active", 0) || 0) + (visSince ? Date.now() - visSince : 0);
  const keepActive = () => { FX.ss.set("active", activeMs()); visSince = document.visibilityState === "visible" ? Date.now() : 0; };
  const resetActive = () => { FX.ss.set("active", 0); visSince = document.visibilityState === "visible" ? Date.now() : 0; };
  const activeMin = () => Math.round(activeMs() / 6000) / 10;
  document.addEventListener("visibilitychange", () => {
    const s = S();
    if (document.visibilityState === "hidden") { if (visSince) FX.ss.set("active", activeMs()); visSince = 0; }
    else visSince = Date.now();
    if (s.sid && s.consented) FX.ev("vis", document.visibilityState === "hidden" ? "hidden" : "visible");
    if (document.visibilityState === "hidden" && s.sid && s.consented) FX.send("session", { active_minutes: activeMin() }, { soon: false });
  });
  setInterval(() => { if (S().sid && visSince) keepActive(); }, 15000);

  /* ---------- the app, in its frame ---------- */
  let appP = null;
  function app() {
    if (appP) return appP;
    appP = new Promise((resolve) => {
      const go = () => {
        const w = frame.contentWindow;
        const tryIt = () => { const fa = w && w.FOCUS_APP; if (fa && fa.ready) fa.ready.then((x) => { setInsets(x); resolve(x); }); else setTimeout(tryIt, 60); };
        tryIt();
      };
      frame.addEventListener("load", go, { once: true });
      frame.src = `app.html${FX.TEST ? "?test=1" : ""}`;
    });
    appP.then((fa) => wireApp(fa));
    return appP;
  }
  function reloadApp() {
    const fresh = document.createElement("iframe");
    fresh.id = "fxFrame"; fresh.className = frame.className; fresh.title = frame.title;
    frame.replaceWith(fresh);
    frame = fresh;
    appP = null;
    return app();
  }
  /* a frame gets no safe areas of its own: the page passes its bottom one in (the strip at the top takes the top) */
  const probe = (() => { const p = document.createElement("div"); p.style.cssText = "position:fixed;left:0;bottom:0;width:1px;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none"; document.body.appendChild(p); return p; })();
  const sab = () => parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  function setInsets(fa) { try { fa.setInsets({ top: 0, bottom: sab() }); } catch (e) { /* the frame went away */ } }
  window.addEventListener("resize", () => { if (appP) appP.then(setInsets); });

  /* the app tells the flow what happens on it */
  const appSubs = [];
  function wireApp(fa) {
    fa.on("act", (a) => appSubs.forEach((f) => f("act", a)));
    fa.on("screen", (s) => appSubs.forEach((f) => f("screen", s)));
    fa.on("set", (s) => appSubs.forEach((f) => f("set", s)));
    fa.on("paystart", () => appSubs.forEach((f) => f("paystart")));
    fa.on("comment", () => countComments());
    fa.on("pickend", () => endPick());
    fa.apply();
  }
  const listenApp = (f) => { appSubs.push(f); return () => { const i = appSubs.indexOf(f); if (i >= 0) appSubs.splice(i, 1); }; };

  /* ---------- the two layouts: a page, or the app under a strip ---------- */
  const notConnected = () => (!FX.ENDPOINT ? `<p class="fx-note">This copy of the study isn't connected yet, so your answers are saved on this phone and not sent.</p>` : "");
  const topBar = (o = {}) => `<header class="fx-top">
      <span class="fx-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg></span><span class="fx-top-t">Florin study</span>
      ${o.more === false || !S().consented ? "" : `<button type="button" class="fx-btn fx-btn--line fx-btn--s fx-top-more" data-fx="more" aria-haspopup="dialog">${ICON.more}<span>More</span></button>`}
    </header>`;
  let resumeLine = "";
  /* Android's back gesture on a question goes to the question before (runQs sets this while a question shows) */
  let backFn = null;
  function showPage(html, o = {}) {
    closeMore();
    backFn = null;
    view.hidden = true;
    page.hidden = false;
    document.documentElement.classList.remove("fx-in-app");
    const back = resumeLine ? `<p class="fx-resume" role="status">${esc(resumeLine)}</p>` : "";
    resumeLine = "";
    page.innerHTML = `${topBar(o)}<div class="fx-body${o.wide ? " fx-body--wide" : ""}">${back}${notConnected()}${html}</div>`;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => { const h = page.querySelector("[data-autofocus]") || page.querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } });
  }
  function showApp() {
    closeMore();
    backFn = null;
    page.hidden = true;
    view.hidden = false;
    document.documentElement.classList.add("fx-in-app");
  }

  /* ---------- the strip over the app ----------
     One row of buttons. The task's words fold to two lines once the person is using the app (st.short), and open again
     when tapped. While Comment waits for the tap that says what a comment is about, the strip says so instead, and the
     task's strip comes back when that ends */
  let stripState = null, picking = false;
  function drawStrip(st) {
    stripState = st;
    if (picking) return;
    const b = (k, label, cls = "", extra = "") => `<button type="button" class="fx-btn fx-btn--s ${cls}" data-fx="${k}"${extra}>${label}</button>`;
    const resume = resumeLine ? `<p class="fx-strip-resume" role="status">${esc(resumeLine)}</p>` : "";
    resumeLine = "";
    const text = st.short && !st.open
      ? `<button type="button" class="fx-strip-t fx-strip-t--short" data-fx="strip-open" data-fx-say aria-expanded="false">${esc(st.text)}</button>`
      : `<p class="fx-strip-t" data-fx-say>${esc(st.text)}</p>`;
    /* Hint sits on the first line, beside "Task 2 of 8", so the buttons keep to one row */
    const hint = (st.buttons || []).find(([k]) => k === "hint");
    strip.innerHTML = `<div class="fx-strip-in">
        ${resume}
        <div class="fx-strip-top"><p class="fx-strip-k">${esc(st.kick)}${st.timer ? ` <span data-fx-timer>${esc(st.timer)}</span>` : ""}</p>${hint ? b("hint", hint[1], "fx-btn--line fx-btn--hint") : ""}</div>
        ${text}
        ${st.hintText ? `<p class="fx-strip-hint">${esc(st.hintText)}</p>` : ""}
        <div class="fx-strip-b">
          ${(st.buttons || []).filter(([k]) => k !== "hint").map(([k, label, cls, extra]) => b(k, label, cls, extra)).join("")}
          ${st.comment === false ? "" : b("comment", `${ICON.chat}<span>Comment</span>`, "fx-btn--line fx-btn--cm", ' aria-label="Comment"')}
          ${b("more", `${ICON.more}<span class="sr">More</span>`, "fx-btn--line fx-btn--icon", ' aria-haspopup="dialog" aria-label="More"')}
        </div>
      </div>`;
  }
  function drawPick() {
    strip.innerHTML = `<div class="fx-strip-in fx-strip-in--pick">
        <p class="fx-strip-k">Comment</p>
        <p class="fx-strip-t" role="status" data-fx-say>Tap the part of the app you mean.</p>
        <div class="fx-strip-b">
          <button type="button" class="fx-btn fx-btn--s fx-btn--line" data-fx="pick-screen">This whole screen</button>
          <button type="button" class="fx-btn fx-btn--s fx-btn--line" data-fx="pick-x">Cancel</button>
        </div>
      </div>`;
  }
  async function startPick() {
    const fa = await app();
    if (view.hidden) return;
    picking = true;
    drawPick();
    fa.pick(true);
  }
  function endPick() { if (!picking) return; picking = false; if (stripState) drawStrip(stripState); }

  /* ---------- More ---------- */
  function openMore() {
    const s = S(), inTask = !!(curTask && curTask.part === "do"), inApp = !view.hidden && !(curTask && curTask.part === "q") && sheet.hidden;
    more.innerHTML = `<div class="fx-more-scrim" data-fx="more-x"></div>
      <div class="fx-more-p" role="dialog" aria-modal="true" aria-labelledby="fxMoreH">
        <div class="fx-more-h"><h2 id="fxMoreH" tabindex="-1">More</h2><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fx="more-x">Close</button></div>
        ${s.code ? `<p class="fx-more-code"><span>Your study code</span><b>${esc(FX.code.show(s.code))}</b></p>` : ""}
        <div class="fx-more-list">
          <button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="comments">Your comments (${FX.comments ? FX.comments.count() : 0})</button>
          ${inApp ? `<button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="reload">Reload the app</button>` : ""}
          ${inTask ? `<button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="again">Start this task again</button>` : ""}
          ${s.consented && s.stage !== "done" ? `<button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="restart">Start the study again</button>` : ""}
          ${s.consented && s.stage !== "done" ? `<button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="stop">Stop the study</button>` : ""}
        </div>
        <div class="fx-more-confirm" data-fx-confirm hidden></div>
        <p class="fx-fine">${PROTO}</p>
      </div>`;
    more.hidden = false;
    guardOpen("more");
    requestAnimationFrame(() => { const h = $("#fxMoreH"); if (h) h.focus(); });
  }
  function closeMore() { if (!more.hidden) { more.hidden = true; more.innerHTML = ""; } }
  function confirmIn(html) { const c = more.querySelector("[data-fx-confirm]"); if (!c) return; c.innerHTML = html; c.hidden = false; const f = c.querySelector("button"); if (f) f.focus(); }

  /* ---------- Android's back gesture closes what's open (a sheet in the app, the comment box, More), never the study ---------- */
  let guarded = false;
  function guardOpen() { if (!guarded) { try { history.pushState({ fx: 1 }, "", location.href); guarded = true; } catch (e) { /* fine */ } } }
  window.addEventListener("popstate", () => {
    guarded = false;
    /* the entry under the guard may predate the code: the address keeps it, for the home screen */
    const c0 = S().code;
    if (c0) { try { const u = new URL(location.href); if (u.searchParams.get("c") !== c0) { u.searchParams.set("c", c0); history.replaceState(history.state, "", u.toString()); } } catch (e) { /* fine */ } }
    if (FX.comments && FX.comments.isOpen()) { FX.comments.close(false); guardOpen(); return; }
    if (!more.hidden) { closeMore(); guardOpen(); return; }
    if (picking) { appP.then((fa) => fa.pick(false)); endPick(); guardOpen(); return; }
    if (backFn && backFn()) { guardOpen(); return; }
    if (appP && !view.hidden) {
      appP.then((fa) => { if (fa.top()) { fa.pop(); FX.ev("act", "close", "back"); } });
    }
    guardOpen();
  });

  /* ======================================================================= */
  /* QUESTIONS: one a screen (a page), or in the sheet over the app            */
  /* ======================================================================= */
  /* q: a question from questions.js, with its words filled in. run: { section, task, list, i, mode, onDone } */
  function optList(q, st) {
    if (!q.opts) return [];
    if (!q.shuffle) return q.opts;
    if (!st.order || st.order.qid !== q.id) {
      const last = q.last || [], keep = q.opts.filter(([k]) => !last.includes(k)), tail = q.opts.filter(([k]) => last.includes(k));
      st.order = { qid: q.id, opts: shuffle(keep).concat(tail) };
    }
    return st.order.opts;
  }
  function qHTML(q, st, o) {
    const opts = optList(q, st);
    const sel = st.sel || [];
    const many = q.type === "many";
    const kick = (o.kick ? `<p class="fx-kick">${esc(o.kick)}</p>` : "") + (o.lead ? `<p class="fx-lead">${esc(o.lead)}</p>` : "");
    const head = q.head ? `<p class="fx-head">${esc(q.head)}</p>` : "";
    let body = "";
    if (q.type === "scale") {
      body = `<div class="fx-scale" role="radiogroup" aria-labelledby="fxQ">${Array.from({ length: q.n }, (_, i) => { const v = String(i + 1), on = sel.includes(v); return `<button type="button" class="fx-sc${on ? " is-on" : ""}" role="radio" aria-checked="${on}" data-v="${v}" aria-label="${v}${i === 0 ? `, ${q.lo}` : i === q.n - 1 ? `, ${q.hi}` : ""}">${v}</button>`; }).join("")}</div>
        <div class="fx-scale-l" aria-hidden="true"><span>${esc(q.lo)}</span><span>${esc(q.hi)}</span></div>`;
    } else if (q.type === "chips") {
      body = `<div class="fx-pairs" role="group" aria-labelledby="fxQ">${q.pairs.map((pr) => `<div class="fx-pair">${pr.map(([k, w]) => { const on = sel.includes(k); return `<button type="button" class="fx-ch${on ? " is-on" : ""}" data-v="${k}" aria-pressed="${on}">${esc(w)}</button>`; }).join("")}</div>`).join("")}</div>`;
    } else if (q.type === "box") {
      body = "";
    } else {
      const atMax = many && q.max && sel.length >= q.max;
      /* q.grid: the first n options (WK2's seven days) in two columns, so the list fits above the screen's edge */
      body = `<div class="fx-opts${q.grid ? " fx-opts--grid" : ""}" role="${many ? "group" : "radiogroup"}" aria-labelledby="fxQ"${q.grid ? ` style="--fx-grid-n:${q.grid}"` : ""}>${opts.map(([k, w]) => {
        const on = sel.includes(k), dis = atMax && !on;
        return `<button type="button" class="fx-opt${on ? " is-on" : ""}" role="${many ? "checkbox" : "radio"}" aria-checked="${on}" data-v="${esc(k)}"${dis ? ' aria-disabled="true"' : ""}><span class="fx-opt-m" aria-hidden="true">${on ? ICON.check : ""}</span><span>${esc(w)}</span></button>`;
      }).join("")}</div>${many && q.max ? `<p class="fx-hintline">${q.max === 2 ? (q.id === "IV1" ? "Pick two." : "Pick up to two.") : `Pick up to ${q.max}.`}</p>` : ""}`;
    }
    if (q.pics) body = `<div class="fx-pics" aria-hidden="true">${picStandard()}${picEasy()}</div>${body}`;
    const boxOn = q.type === "box" || (q.box && sel.includes(q.box));
    const box = boxOn ? `<label class="fx-box-l" for="fxBox">${q.type === "box" ? "Your words" : "Tell us in a few words (optional)"}</label>
        <textarea id="fxBox" class="fx-ta" rows="4" maxlength="1000" autocomplete="off">${esc(st.words || "")}</textarea>
        <p class="fx-leave">${esc(FX.LEAVE_OUT)}</p>
        <p class="fx-alarm" data-fx-alarm${FX.alarm(st.words) ? "" : " hidden"} role="note">${esc(FX.ALARM_NOTE)}</p>` : "";
    const auto = (q.type === "one" || q.type === "scale") && !boxOn;
    const canNext = q.type === "box" || sel.length > 0 || (q.type === "chips");
    return `${kick}${head}<h1 class="fx-q" id="fxQ" data-qid="${esc(q.id)}">${esc(q.qText)}</h1>${body}${box}
      ${q.credit ? `<p class="fx-credit">${esc(q.credit)}</p>` : ""}
      <div class="fx-qnav">
        ${o.back ? `<button type="button" class="fx-btn fx-btn--line fx-btn--s" data-q="back">${ICON.back}<span>Back</span></button>` : "<span></span>"}
        <span class="fx-qnav-r">
          ${q.noSkip ? "" : `<button type="button" class="fx-btn fx-btn--line fx-btn--s" data-q="skip">Skip</button>`}
          ${auto && !sel.length ? "" : `<button type="button" class="fx-btn fx-btn--s" data-q="next"${canNext ? "" : ' aria-disabled="true"'}>Next</button>`}
        </span>
      </div>`;
  }
  /* two small pictures of Today for IN9: the standard version and the one with larger text and simpler screens */
  const picStandard = () => `<figure class="fx-pic"><svg viewBox="0 0 120 200"><rect class="p-ph" x="4" y="4" width="112" height="192" rx="16"/><rect class="p-ln" x="16" y="20" width="44" height="5" rx="2"/><rect class="p-ln" x="16" y="30" width="64" height="7" rx="3"/><rect class="p-card p-dark" x="14" y="46" width="92" height="52" rx="10"/><rect class="p-on" x="22" y="56" width="26" height="14" rx="3"/><rect class="p-on2" x="22" y="78" width="68" height="4" rx="2"/><rect class="p-card" x="14" y="106" width="92" height="40" rx="10"/><rect class="p-ln" x="22" y="116" width="50" height="4" rx="2"/><rect class="p-ln" x="22" y="126" width="70" height="4" rx="2"/><rect class="p-card" x="14" y="154" width="92" height="30" rx="10"/></svg><figcaption>Standard</figcaption></figure>`;
  const picEasy = () => `<figure class="fx-pic"><svg viewBox="0 0 120 200"><rect class="p-ph" x="4" y="4" width="112" height="192" rx="16"/><rect class="p-ln" x="16" y="20" width="80" height="10" rx="4"/><rect class="p-card" x="14" y="40" width="92" height="48" rx="10"/><rect class="p-big" x="22" y="50" width="34" height="22" rx="4"/><rect class="p-btn" x="14" y="98" width="92" height="26" rx="13"/><rect class="p-btn2" x="14" y="130" width="92" height="26" rx="13"/><rect class="p-btn2" x="14" y="162" width="92" height="26" rx="13"/></svg><figcaption>Larger text and simpler screens</figcaption></figure>`;

  /* an answer, sent as it's given (CONTRACT.md, section 2.3) */
  function sendAnswer(q, st, run, skipped) {
    const opts = optList(q, st);
    const words = (st.words || "").trim();
    const sel = skipped ? [] : (st.sel || []);
    const wordsOf = (k) => { const o = (q.opts || (q.pairs ? q.pairs.flat() : [])).find(([c]) => c === k); return o ? o[1] : k; };
    const ans = q.type === "box" ? "" : sel.map(wordsOf).join(" | ");
    let correct = "";
    if (!skipped && q.right) {
      if (q.rightExact) correct = sel.slice().sort().join("|") === q.right.slice().sort().join("|") ? "yes" : "no";
      else correct = sel.some((v) => q.right.includes(v)) ? "yes" : "no";
    }
    const rightWords = q.right ? (q.rightWords || q.right.map(wordsOf).join(" | ")) : "";
    FX.send("answer", {
      section: run.section, task: run.task || "", qid: q.id, question: q.qText, answer: ans, value: sel.join("|"),
      correct, right: rightWords, words: skipped ? "" : (q.type === "box" || (q.box && sel.includes(q.box)) ? words : ""),
      alarm_note: !skipped && words && FX.alarm(words) ? "yes" : "no", skipped: skipped || (!sel.length && !words) ? "yes" : "no"
    });
    if (!skipped && q.id && q.type !== "box") setA(q.id, sel.join("|"));
    if (!skipped && q.type === "box" && words) setA(q.id, "words");
    if (correct) run.checks = (run.checks || { right: 0, n: 0 }), run.checks.n++, correct === "yes" && run.checks.right++;
    if (run.onAnswer) run.onAnswer(q, sel, words, skipped);
  }

  /* runs a list of questions in a container (the page, or the sheet). Questions are made when they show (q(i)), so a
     right answer is worked out from the live logs then */
  function runQs(run) {
    const host = run.mode === "sheet" ? $(".fx-sheet-b", sheet) : null;
    let st = {};
    const total = () => run.list.length;
    const qAt = (i) => { const q = run.list[i]; return typeof q === "function" ? q() : q; };
    let q = null;
    function paint(focus) {
      if (run.i >= total()) { backFn = null; run.onDone(run); return; }
      q = run.noCache ? qAt(run.i) : run.cache[run.i] || (run.cache[run.i] = qAt(run.i));
      if (!q) { run.i++; paint(focus); return; }
      if (q.when && !q.when(A())) { run.i++; paint(focus); return; }
      /* answered already, in another window (the code lookup says which): not asked twice */
      if (run.skipIds && run.skipIds.has(q.id)) { run.i++; paint(focus); return; }
      if (run.onShow) run.onShow(q, run);
      const kick = run.kick ? run.kick(run.i, total(), q) : "";
      const html = qHTML(q, st, { kick, lead: run.lead ? run.lead(run.i) : "", back: run.i > (run.min || 0) });
      if (run.mode === "sheet") { host.innerHTML = html; sizeSheet(); if (run.reveal) run.reveal(q); }
      else showPage(`<section class="fx-qwrap">${html}</section>`, { wide: q.pics });
      const c = run.mode === "sheet" ? host : page;
      wire(c);
      if (focus !== false) requestAnimationFrame(() => { const h = c.querySelector("#fxQ"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: run.mode === "sheet" }); } });
      if (run.persist) run.persist(run.i);
      backFn = () => { if (run.i <= (run.min || 0)) return false; back(); return true; };
    }
    function back() {
      clearTimeout(autoT);
      st = {};
      run.i = Math.max(run.min || 0, run.i - 1);
      while (run.i > (run.min || 0) && ((run.cache[run.i] && run.cache[run.i].when && !run.cache[run.i].when(A())) || (run.skipIds && run.cache[run.i] && run.skipIds.has(run.cache[run.i].id)))) run.i--;
      paint();
    }
    function next(skipped) {
      sendAnswer(q, st, run, skipped);
      st = {};
      run.i++;
      paint();
    }
    let autoT = 0;
    function wire(c) {
      c.onclick = (e) => {
        const o = e.target.closest("[data-v]"), n = e.target.closest("[data-q]");
        if (o && c.contains(o) && !o.closest("[aria-disabled='true']")) {
          if (o.getAttribute("aria-disabled") === "true") return;
          const v = o.dataset.v;
          st.sel = st.sel || [];
          if (q.type === "many" || q.type === "chips") {
            const i = st.sel.indexOf(v);
            if (i >= 0) st.sel.splice(i, 1);
            else {
              const ex = [].concat(q.excl || []);
              if (ex.includes(v)) st.sel = [v];
              else { st.sel = st.sel.filter((x) => !ex.includes(x)); if (!q.max || st.sel.length < q.max) st.sel.push(v); }
            }
          } else st.sel = [v];
          const boxWas = !!c.querySelector("#fxBox");
          const y = window.scrollY, hy = host ? host.scrollTop : 0;
          const html = qHTML(q, st, { kick: run.kick ? run.kick(run.i, total(), q) : "", lead: run.lead ? run.lead(run.i) : "", back: run.i > (run.min || 0) });
          if (run.mode === "sheet") { host.innerHTML = html; host.scrollTop = hy; sizeSheet(); } else { page.querySelector(".fx-qwrap").innerHTML = html; window.scrollTo(0, y); }
          wire(c);
          const same = c.querySelector(`[data-v="${CSS.escape(v)}"]`); if (same) same.focus({ preventScroll: true });
          const boxOn = q.box && st.sel.includes(q.box);
          /* Something else: its box comes into view, above the Back and Next bar, with the cursor in it */
          if (boxOn && !boxWas) { const ta = c.querySelector("#fxBox"); if (ta) { ta.scrollIntoView({ block: "center" }); ta.focus({ preventScroll: true }); } }
          if ((q.type === "one" || q.type === "scale") && !boxOn) { clearTimeout(autoT); autoT = setTimeout(() => next(false), 380); }
          return;
        }
        if (!n) return;
        clearTimeout(autoT);
        if (n.dataset.q === "next") { if (n.getAttribute("aria-disabled") === "true") return; next(false); }
        else if (n.dataset.q === "skip") next(true);
        else if (n.dataset.q === "back") back();
      };
      const ta = c.querySelector("#fxBox");
      if (ta) ta.oninput = () => {
        st.words = ta.value;
        const al = c.querySelector("[data-fx-alarm]"); if (al) al.hidden = !FX.alarm(st.words);
        const nb = c.querySelector('[data-q="next"]'); if (nb && q.type !== "box") nb.removeAttribute("aria-disabled");
      };
    }
    run.cache = run.cache || [];
    run.i = run.i || 0;
    paint(run.focus);
    return { repaint: () => paint(false) };
  }

  /* ---------- the sheet over the app ---------- */
  function openSheet(o = {}) {
    sheet.innerHTML = `<button type="button" class="fx-sheet-grab" data-fx="lower" aria-expanded="true"><span class="fx-sheet-bar" aria-hidden="true"></span><span data-fx-lower-t>Show the screen</span></button>
      <div class="fx-sheet-b" role="region" aria-label="${esc(o.label || "Questions")}"></div>`;
    sheet.hidden = false;
    sheet.classList.remove("is-low");
    return sheet;
  }
  function closeSheet() { backFn = null; sheet.hidden = true; sheet.innerHTML = ""; sheet.classList.remove("is-low"); if (appP) appP.then((fa) => fa.setBottom(0)); }
  function sizeSheet() {
    requestAnimationFrame(() => {
      const h = sheet.hidden ? 0 : sheet.getBoundingClientRect().height;
      const fr = frame.getBoundingClientRect();
      const covered = Math.max(0, fr.bottom - (window.innerHeight - h));
      if (appP) appP.then((fa) => fa.setBottom(covered));
    });
  }
  function toggleLow() {
    const low = !sheet.classList.contains("is-low");
    sheet.classList.toggle("is-low", low);
    const g = $(".fx-sheet-grab", sheet);
    if (g) { g.setAttribute("aria-expanded", String(!low)); const t = g.querySelector("[data-fx-lower-t]"); if (t) t.textContent = low ? "Show the question" : "Show the screen"; }
    sizeSheet();
  }

  /* ======================================================================= */
  /* THE STEPS                                                                */
  /* ======================================================================= */
  const steps = {};
  function go(step, o = {}) {
    const s = S();
    if (s.sid) save({ step });
    const st = STAGE_OF[step.at];
    if (st && s.sid) stageTo(st);
    if (PHASE_OF[step.at]) FX.phase = PHASE_OF[step.at];
    closeSheet();
    (steps[step.at] || steps.welcome)(step, o);
  }

  /* ---------- before the welcome ---------- */
  const isDesktop = () => !FX.env.touch && window.innerWidth >= 900;
  steps.closed = () => showPage(`<h1>This study has closed.</h1><p class="fx-lede">Thank you for your interest.</p><p class="fx-fine">${PROTO}</p>`, { more: false });
  steps.desktop = () => {
    const url = location.href;
    let qr = "";
    try { qr = window.FXQR ? window.FXQR.svg(url, { label: "QR code of this study's link" }) : ""; } catch (e) { qr = ""; }
    showPage(`<h1>This study runs on a phone.</h1>
      <p class="fx-lede">Scan this code with your phone's camera to open it there.</p>
      <div class="fx-qr-box">${qr}</div>
      <p class="fx-link-out"><span>Or type this into your phone's browser:</span> <b>${esc(url)}</b></p>
      <p><button type="button" class="fx-btn fx-btn--line" data-fx="here">Continue on this computer</button></p>
      <p class="fx-fine">${PROTO}</p>`, { more: false, wide: true });
  };
  steps.welcome = () => {
    showPage(`<p class="fx-kick">Florin Health</p>
      <h1>Help shape the Florin app</h1>
      <p class="fx-lede">Florin Health is testing an early version of the Florin app, and we'd like your view. It takes 30 to 45 minutes on this phone. You'll answer a few questions, try the app with a sample person's logs, then tell us what you thought.</p>
      <p class="fx-p">If you stop partway, your place is saved on this phone.</p>
      <p class="fx-proto">${PROTO}</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="to-consent">Next</button></div>`, { more: false });
  };
  function consentHTML() {
    const t = team(), c = contactOr(), r = recruiter();
    const how = CFG.thanksHow ? `, ${CFG.thanksHow}` : "";
    /* the summary and the never-sold line are for Will and counsel to confirm (plan, Calls for Will) */
    const sum = [
      "30 to 45 minutes, trying the app with a sample person's logs, not your own.",
      "No account and no name. Your answers go to Florin Health's research team under a random code, and are never sold.",
      "You can stop at any time."
    ];
    const li = [
      "This is research to improve an app, not a medical study. The Florin app here is a prototype. It isn't ready to use for your own care, and it can't give medical advice. You're welcome to take part.",
      `There's no account. We don't ask your name or contact details${CFG.followUp ? ", unless you choose to leave them at the end, kept apart from your answers" : ""}.`,
      `Your answers, ratings and comments go to ${t ? `${t}, Florin Health's research team` : "Florin Health's research team"}, under a random code. We also see which parts of the app you tap and how long you spend on each screen, never what you log or type in the app itself. Everything is kept in a private Google Sheet that only the research team can open. This site is hosted by Netlify.`,
      "We also send a few details about your phone: its type, its system version, its browser, its screen width, its text size setting, and whether it's set to light or dark. Not its location, and not your contacts.",
      `We use all of this only to improve the app. We never sell your answers or use them for ads, and we delete them ${keepMonths()} months after the study closes.`,
      "The app shows a sample person's logs. You don't need to log anything real. Anything you log or type in the Florin app itself, such as a BM, a note or a question to Ask Florin, stays on this phone, is never sent to us, and is cleared when you close the app.",
      "Please don't type anything you wouldn't want a research team to read, such as your name, or details about your health you'd rather keep private.",
      `You can stop at any time. To have your answers removed later, email ${c} with your study code, which shows on the last screen. That email links your address to your code, so we delete it once your answers are removed.`,
      `Questions about the study: ${c}. Your thank-you comes from ${r || "the study's recruiter"}${how}. They never see your answers.`,
      "If you're worried about your gut, talk to a clinician. If you see blood in a BM, have a black or tar-like BM, a fever, vomiting that won't stop, weight loss you can't explain, or you wake at night to go, contact your primary care doctor."
    ];
    return `<h1>Before you start</h1>
      <section class="fx-sum" aria-labelledby="fxSumH"><h2 id="fxSumH" class="fx-sum-h">In short</h2><ul>${sum.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
      <h2 class="fx-sum-h">In full</h2>
      <ul class="fx-consent">${li.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="fx-checks">
        <label class="fx-check"><input type="checkbox" data-fx-c="age"><span>I'm 18 or over.</span></label>
        <label class="fx-check"><input type="checkbox" data-fx-c="agree"><span>I've read this, and I agree to take part.</span></label>
      </div>
      <div class="fx-act">
        <p class="fx-err" data-fx-tick role="alert" hidden>Tick both boxes to start.</p>
        <button type="button" class="fx-btn fx-btn--block" data-fx="start" aria-disabled="true">Start</button>
        <button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="nothanks">No thanks</button>
      </div>
      <p class="fx-fine">${PROTO}</p>`;
  }
  steps.consent = () => {
    showPage(consentHTML(), { more: false });
    const sync = () => { const ok = $$("[data-fx-c]", page).every((x) => x.checked); const b = $('[data-fx="start"]', page); if (ok) { b.removeAttribute("aria-disabled"); const t = $("[data-fx-tick]", page); if (t) t.hidden = true; } else b.setAttribute("aria-disabled", "true"); };
    $$("[data-fx-c]", page).forEach((x) => x.addEventListener("change", sync));
  };
  steps.nothanks = () => showPage(`<h1>Thanks for your time.</h1><p class="fx-lede">You can close this page.</p><p class="fx-fine">${PROTO}</p>`, { more: false });

  function consent() {
    const old = S();
    const restartOf = old && old.restartOf ? old.restartOf : "";
    const sid = FX.newSid();
    FX.ls.set("session", { sid, consented: true, consentAt: FX.iso(), stage: "consent", A: {}, restartOf, trOrder: trOrder() });
    FX.ls.set("comments", []);
    resetActive();
    FX.phase = "consent";
    const e = FX.env;
    FX.send("session", { stage: "consent", platform: e.platform, os: e.os, browser: e.browser, width: Math.round(screen.width || innerWidth), theme: FX.dark() ? "dark" : "light", text_reported: FX.textReported(), submitted: "no", restart_of: restartOf || undefined });
    FX.ev("flow", "consent");
    if (restartOf) FX.ev("flow", "restart", "");
    app();
    go({ at: "intake", i: 0 });
  }
  /* the reaction chips' pairs: their order, and which side of each comes first, once per person */
  function trOrder() { return shuffle([0, 1, 2, 3]).map((i) => ({ i, flip: Math.random() < 0.5 })); }

  /* ---------- intake ---------- */
  steps.intake = (step) => {
    const list = Q.intake.map((q) => () => {
      const o = Object.assign({}, q, { qText: q.q });
      if (q.q65 && A().IN7 === "65" && CFG.easyFromAge !== false) { o.qText = q.q65; o.head = q.head65; }
      return o;
    });
    runQs({
      section: "intake", list, i: step.i || 0, mode: "page", noCache: true,
      kick: (i, n) => `About you · ${i + 1} of ${n}`,
      lead: (i) => (i === 0 ? "First, a little about you. Every question can be skipped." : ""),
      persist: (i) => save({ step: { at: "intake", i } }),
      onDone: () => go({ at: "setup" })
    });
  };
  /* the end of intake: the version, the demo person, the study code and the arms */
  steps.setup = async () => {
    showPage(`<h1 data-autofocus>Setting up your session...</h1><p class="fx-lede">This takes a few seconds.</p>`);
    const a = A(), s = S();
    const age65 = a.IN7 === "65";
    const picked = a.IN9 === "easy" ? "easy" : a.IN9 === "standard" ? "standard" : "";
    const version = CFG.easyFromAge !== false && age65 ? "easy" : picked === "easy" ? "easy" : "standard";
    const segment = ["pattern", "simple", "stack", "tracker", "record", "unsure"].includes(a.IN1) ? a.IN1 : "";
    const people = CFG.people || {};
    const person = people[segment || "none"] || people.none || "sarah";
    const D = CFG.decisions || {};
    const homes = [].concat(D.home || "score"), hists = [].concat(D.history || "calendar"), weeks = [].concat(CFG.weekCard || "built");
    let arms = s.arms, code = s.code, assigned = s.assigned;
    if (!arms) {
      let got = null;
      if (FX.ENDPOINT) {
        for (let k = 0; k < 6 && !got; k++) {
          const c = FX.code.make();
          try {
            const r = await FX.jsonp({ op: "claim", sid: s.sid, code: c, platform: FX.env.platform, version, homes: homes.join(","), histories: hists.join(","), weeks: weeks.join(","), orders: 5 }, 8000);
            if (r && r.ok) got = { code: r.code || c, home: r.home, history: r.history, week: r.week, order: +r.order || 1 };
            else if (r && r.error === "closed") { go({ at: "closed" }); return; }
            else if (!r || r.error !== "code_taken") break;
          } catch (e) { break; }
        }
      }
      const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
      if (got) { assigned = "script"; code = got.code; arms = { home: got.home || homes[0], history: got.history || hists[0], week: got.week || weeks[0], order: got.order }; }
      else { assigned = "phone"; code = FX.code.make(); arms = { home: pick(homes), history: pick(hists), week: pick(weeks), order: 1 + Math.floor(Math.random() * 5) }; }
      if (version === "easy") { arms.home = arms.home || homes[0]; arms.week = arms.week || weeks[0]; }
      /* Will's own runs (?test=1) can pick the arms: &home=day&history=list&week=strip */
      if (FX.TEST) { const q = new URLSearchParams(location.search); [["home", ["score", "day"]], ["history", ["calendar", "list"]], ["week", ["built", "card", "strip", "note", "chart"]]].forEach(([k, ok]) => { if (ok.includes(q.get(k))) arms[k] = q.get(k); }); }
    }
    save({ arms, code, assigned, version, version_picked: picked, segment, person, age65 });
    putCode(code);
    const fa = await app();
    fa.apply();
    save({ personName: fa.M().P.name });
    const V = fa.V();
    FX.send("session", {
      code, segment, person, version, version_picked: picked, home: version === "easy" ? "" : arms.home, history: arms.history,
      week: version === "easy" ? "" : arms.week, order: arms.order, assigned, decisions: FX.stateLine(V, { week: arms.week })
    });
    FX.ev("flow", "intake_done");
    /* 65 or over, IN9 already said this test uses the version with larger text (the easynote step is kept for a
       session saved on it) */
    go({ at: "tourintro" });
  };
  /* the code goes into the address, so the home screen or another browser carries the session */
  function putCode(code) {
    try {
      const u = new URL(location.href);
      u.searchParams.set("c", code);
      history.replaceState(history.state, "", u.toString());
      swapManifest(code);
    } catch (e) { /* an old browser: the code screen covers it */ }
  }
  /* iPhone: in case iOS opens the manifest's start_url from the home screen, that address carries the code too */
  function swapManifest(code) {
    if (!FX.env.iOS) return;
    const l = $('link[rel="manifest"]');
    if (!l) return;
    const base = new URL("./", location.href).toString();
    const m = { name: "Florin", short_name: "Florin", start_url: `${base}?c=${code}${FX.TEST ? "&test=1" : ""}&src=home`, scope: base, display: "standalone", background_color: "#F9F7F2", theme_color: "#F9F7F2", icons: [192, 512].map((n) => ({ src: `${base}icons/icon-${n}.png`, sizes: `${n}x${n}`, type: "image/png" })) };
    l.setAttribute("href", `data:application/manifest+json,${encodeURIComponent(JSON.stringify(m))}`);
    FX.ev("install", "manifest_swapped");
  }
  steps.easynote = () => {
    showPage(`<h1>For this test, you'll try the version with larger text and simpler screens.</h1>
      <p class="fx-lede">You can switch in Profile at any time.</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="to-tour">Next</button></div>`);
  };

  /* ---------- the tour ---------- */
  const LATIN = [["score", "patterns", "checkin", "history", "ask"], ["patterns", "checkin", "history", "ask", "score"], ["checkin", "history", "ask", "score", "patterns"], ["history", "ask", "score", "patterns", "checkin"], ["ask", "score", "patterns", "checkin", "history"]];
  /* what the tasks and their questions read from the live logs */
  function figures(fa) {
    const L = fa.L, M = fa.M(), V = fa.V(), Ut = fa.AD.util, mode = V.form;
    const t0 = L.dateOf(L.TODAY);
    const prevMonth = (t0.getMonth() + 11) % 12;
    const inPrev = M.days.filter((x) => x.d >= M.start && L.dateOf(x.d).getMonth() === prevMonth && x.d < L.TODAY);
    const gaps = inPrev.filter((x) => L.facts(M, x, mode).state === "none").map((x) => x.d);
    const PR = L.patterns(M, mode);
    return {
      name: M.P.name, weekday: Ut.DOWL[t0.getDay()], date: `${Ut.MONL[t0.getMonth()]} ${t0.getDate()}`, weeks: Math.floor((L.TODAY - M.start) / 7),
      month: Ut.MONL[prevMonth], gapDays: gaps, logDays: inPrev.filter((x) => x.logged && x.entries.length).map((x) => x.d),
      foodPattern: PR.sparse ? null : PR.found.find((p) => p.food) || null, PR, checkin: V.checkin !== false, easy: !!V.easy, home: V.home, history: V.history
    };
  }
  async function tasksFor() {
    const fa = await app(), s = S(), F = figures(fa);
    const want = CFG.tasks || ["bm", "time", "week", "score", "patterns", "checkin", "history", "ask"];
    const row = LATIN[((s.arms && s.arms.order) || 1) - 1] || LATIN[0];
    return ["bm", "time", "week"].concat(row).filter((t) => want.includes(t))
      .filter((t) => t !== "checkin" || F.checkin)
      .filter((t) => t !== "patterns" || !!F.foodPattern)
      .filter((t) => t !== "history" || F.gapDays.length > 0)
      .filter((t) => t !== "time" || want.includes("bm"));
  }
  steps.tourintro = async () => {
    const fa = await app();
    const s = S();
    if (!s.tasks) save({ tasks: await tasksFor() });
    const F = figures(fa), n = S().tasks.length;
    showPage(`<h1>${esc(cap(NUMW[n] || String(n)))} short tasks</h1>
      <p class="fx-lede">You'll try the app as ${esc(F.name)}, with ${esc(F.name)}'s last ${F.weeks} weeks of logs. The app is set to ${esc(F.weekday)} evening, ${esc(F.date)}, and talks to ${esc(F.name)} as "you".</p>
      <p class="fx-p">Each task takes a minute or two. Afterwards, tap how easy it was, and answer a few quick questions.</p>
      <p class="fx-p">Some questions check whether the app is clear. If something's hard to tell, that's the app's problem, not yours.</p>
      <p class="fx-p">To comment on anything in the app, at any time, tap Comment at the top, then tap the part you mean. You can also double-tap a card or some words.</p>
      <p class="fx-proto">${PROTO}</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="tour-go">Start the first task</button></div>`);
  };

  /* ---------- a task ---------- */
  let curTask = null, goalT = 0, hintT = 0, unlisten = null;
  function taskCtx(fa, task) {
    const F = figures(fa), s = S(), V = fa.V();
    const t1 = s.t1 && fa.L.find(fa.M(), s.t1.id) ? s.t1 : null;
    let place = "after";
    try { const w = frame.contentWindow; place = w.FOCUS_WEEK_PLACE_OF ? w.FOCUS_WEEK_PLACE_OF() : "after"; } catch (e) { /* the frame's own: after */ }
    /* the time task's times, in the app's own words: the BM from task 1, and an hour before it */
    const tm = (h) => fa.AD.util.fmtTime(((h % 24) + 24) % 24);
    return Object.assign(F, { t1: !!t1, t1e: t1, t1time: t1 ? tm(t1.t) : "", target: t1 ? tm(t1.t - 1) : "", easy: !!V.easy, home: V.home, history: V.history, week: (s.arms && s.arms.week) || "built", place, gaps: F.gapDays.length, task });
  }
  const todayBms = (fa) => { const x = fa.L.day(fa.M(), fa.L.TODAY); return x ? x.entries.filter((e) => e.kind === "bm") : []; };
  steps.task = async (step) => {
    const fa = await app();
    const s = S(), tasks = s.tasks || [];
    const id = tasks[step.i];
    if (!id) { go({ at: "compare", i: 0 }); return; }
    FX.phase = id;
    showApp();
    fa.comments(true);
    fa.home();
    const c = taskCtx(fa, id);
    const T = curTask = {
      id, i: step.i, n: step.i + 1, N: tasks.length, part: "do", t0: Date.now(), a0: activeMs(), startedAt: FX.iso(), snap: fa.snapshot(),
      seen: false, hint: false, screens: 0, backs: 0, path: new Set(), acts: [], months: 0, bm0: fa.RU.bmCount(fa.M()), since: 0,
      ref: c.t1e ? c.t1e.t : fa.L.NOW, mine: c.t1e ? c.t1e.id : null, before: new Set(todayBms(fa).map((e) => e.id).filter((x) => !c.t1e || x !== c.t1e.id)), c
    };
    FX.ev("flow", "task_start", id);
    drawTask();
    if (unlisten) unlisten();
    unlisten = listenApp((k, a) => onAppEvent(k, a));
    clearInterval(goalT);
    goalT = setInterval(checkGoal, 250);
    clearTimeout(hintT);
    /* the Hint comes sooner in the version with larger text (hintAfterEasy) */
    const hintS = c.easy ? +CFG.hintAfterEasy || Math.min(25, +CFG.hintAfter || 45) : +CFG.hintAfter || 45;
    hintT = setTimeout(() => { if (curTask === T && T.part === "do") { T.hintReady = true; drawTask(); } }, hintS * 1000);
  };
  function drawTask() {
    const T = curTask;
    if (!T) return;
    const def = Q.tasks[T.id];
    const done = T.seen;
    drawStrip({
      kick: `Task ${T.n} of ${T.N}`,
      text: done ? "Done. Tap Next for a few quick questions." : def.title(T.c),
      short: !done && !!T.short, open: !!T.open,
      hintText: !done && T.hintShown ? def.hint(T.c) : "",
      buttons: done ? [["done", "Next", ""]] : [["done", "Done", ""], ["skip", "Skip", "fx-btn--line"]].concat(T.hintReady && !T.hintShown ? [["hint", "Hint", "fx-btn--line"]] : [])
    });
  }
  function onAppEvent(k, a) {
    const T = curTask;
    if (!T || T.part !== "do") return;
    if (k === "screen") T.screens++;
    if (k === "act") {
      T.acts.push(a.name);
      /* once the person is using the app, the task's words fold to two lines (tap them to read them all) */
      if (!T.short) { T.short = true; drawTask(); }
      if (["close", "iback", "ck-back", "ez-back"].includes(a.name)) T.backs++;
      const P = T.path;
      if (T.id === "bm") {
        if (a.name === "quick-bm") P.add(a.overlay === "plus" ? "plus tile" : "plus tile");
        if (a.name === "vr-quick") P.add("today row");
        if (a.name === "save-bm") P.add(T.c.easy ? "easy steps" : "form");
        if (a.name === "edit") P.add("details yes");
        if (["how", "dur", "flag"].includes(a.name)) P.add("details yes");
        if (a.name === "undo") P.add("undo yes");
      }
      if (T.id === "time") {
        if (a.name === "edit") T.edited = true;
        if (a.name === "undo") T.undid = true;
      }
      if (T.id === "score" && a.name === "idetail" && a.k === "score") P.add(a.el && a.el.classList && a.el.classList.contains("vr-sc") ? "chip" : "details");
      if (T.id === "checkin" && a.name === "ck-start") P.add(a.overlay === "plus" ? "plus" : "today card");
      if (T.id === "history") {
        if (a.name === "vr-cal-m") T.months++;
        if (a.name === "vr-cal-day" && T.c.gapDays.includes(+a.v)) T.calHit = true;
      }
      if (T.id === "ask") {
        if (a.name === "askx-ask") P.add("suggested");
        if (a.name === "askx-send") P.add("typed");
        if (a.name === "ask-about") P.add("ask about this");
      }
    }
  }
  /* is the goal reached? (plan 3.5) "in view" goals count once the thing has been in view for 2 seconds */
  function held(T, ok) { if (!ok) { T.since = 0; return false; } if (!T.since) T.since = Date.now(); return Date.now() - T.since >= 2000; }
  function weekSels(fa) {
    const d = frame.contentDocument;
    if (!d) return null;
    if (fa.V().easy) return [".ap-ez-today .ez-week .ez-ans", ".ap-ez-today .ez-week .ez-days"];
    const w = d.querySelector(".ap-layer [data-week]");
    if (w) return ["[data-week] [data-answer]"].concat(w.querySelector(".ap-days") ? ["[data-week] .ap-days"] : w.querySelector("svg") ? ["[data-week] svg"] : []);
    return [".ap-wk .ap-wk-a", ".ap-wk .ap-days"];
  }
  async function checkGoal() {
    const T = curTask;
    if (!T || T.part !== "do" || T.seen) return;
    const fa = await app();
    let ok = false;
    try {
      const k = fa.key(), top = fa.top(), easy = !!fa.V().easy;
      switch (T.id) {
        case "bm": ok = fa.RU.bmCount(fa.M()) > T.bm0; break;
        case "time": {
          /* only the BM from task 1, or one logged in its place now (after a reload, task 1's BM is gone with the logs
             in memory): another of today's BMs moved to that time isn't the task */
          if (!T.c.t1) {
            const fresh = todayBms(fa).filter((e) => !T.before.has(e.id)).sort((x, y) => y.t - x.t)[0];
            if (fresh) { save({ t1: { id: fresh.id, t: fresh.t } }); T.ref = fresh.t; T.mine = fresh.id; T.c = taskCtx(fa, T.id); drawTask(); }
            break;
          }
          const lo = easy ? 0.5 : 0.75, hi = easy ? 2 : 1.25;
          const mine = (e) => e.id === T.mine || !T.before.has(e.id);
          ok = todayBms(fa).some((e) => { if (!mine(e)) return false; const dt = T.ref - e.t; return dt >= lo - 1e-6 && dt <= hi + 1e-6; });
          break;
        }
        case "week": ok = held(T, !top && ["today", "home-day", "ez-today"].includes(k) && fa.inView(weekSels(fa) || [])); break;
        case "score": ok = easy ? held(T, k === "ez-weeks" && fa.inView([".ap-ez-weeks .ez-score"], { share: 0.6 })) : k === "i-score"; break;
        /* the pattern's own line in view (the food and its count), not the whole card: a tall card never fits a short
           screen under the strip */
        case "patterns": {
          const fp = T.c.foodPattern;
          const row = fp ? `.ap-ic:has(.ap-ic-h[data-k="pat"]) .ap-ipat[data-k="pattern:${CSS.escape(String(fp.id))}"]` : '.ap-ic:has(.ap-ic-h[data-k="pat"]) .ap-ipat';
          ok = held(T, easy ? k === "ez-weeks" && fa.inView([".ap-ez-weeks .ez-pattern .ez-lead"], { share: 0.9 }) : (k === "insights" && fa.inView([row], { share: 0.9 })) || k === "i-pat" || k === "i-pattern");
          break;
        }
        case "checkin": ok = k === "ckdone"; break;
        /* the list: that day's header (its date and "Nothing logged") in view */
        case "history": ok = fa.V().history === "calendar" ? !!T.calHit : held(T, !top && k === "history" && T.c.gapDays.some((d) => fa.inView([`.ap-hd:has([data-act="plus-day"][data-v="${d}"]) .ap-hd-h`], { share: 0.9 }))); break;
        case "ask": { const A2 = fa.api().S.askx; ok = !!(A2 && A2.msgs && A2.msgs.some((m) => m.role !== "user" && m.state !== "thinking" && m.state !== "streaming")); break; }
        default: break;
      }
    } catch (e) { console.error(e); }
    if (ok && !T.seen && curTask === T) {
      T.seen = true; T.tGoal = Date.now(); T.aGoal = activeMs();
      if (T.id === "bm") {
        const e = todayBms(fa).find((x) => !T.before.has(x.id));
        if (e) save({ t1: { id: e.id, t: e.t } });
      }
      FX.ev("flow", "task_goal", T.id);
      drawTask();
      const b = $('[data-fx="done"]', strip); if (b) b.focus({ preventScroll: true });
    }
  }
  /* Done (or Next), or Skip: the task's questions in the sheet */
  async function endTask(skipped) {
    const T = curTask;
    if (!T || T.part !== "do") return;
    T.part = "q";
    clearInterval(goalT); clearTimeout(hintT);
    const fa = await app();
    fa.comments(false);
    fa.closeAll && !["week", "score", "patterns", "history", "ask"].includes(T.id) && fa.closeAll();
    const end = T.tGoal && !skipped ? T.tGoal : Date.now();
    T.seconds = Math.round((end - T.t0) / 1000);
    T.active = Math.round(((T.tGoal && !skipped ? T.aGoal : activeMs()) - T.a0) / 1000);
    T.outcome = skipped ? null : T.seen ? "seen" : "said";
    FX.ev("flow", "task_end", T.id);
    const qs = [];
    if (skipped) qs.push(() => Object.assign({}, Q.SKIP, { qText: Q.SKIP.q }));
    else (Q.ownFor[T.id] || []).forEach((qid) => qs.push(() => ownQ(fa, qid, T)));
    qs.push(() => Object.assign({}, Q.TE, { qText: Q.TE.q }));
    qs.push(() => trQ(T));
    openSheet({ label: "Questions about the task" });
    drawStrip({ kick: `Task ${T.n} of ${T.N}`, text: "A few quick questions.", buttons: [], comment: false });
    runQs({
      section: "task", task: T.id, list: qs, i: 0, mode: "sheet",
      /* the week's questions ask about its row of days: that row (not the card's top) sits in the part of the screen the
         sheet leaves showing */
      reveal: (q) => {
        if (q.id === "IV1") { fa.closeAll(); fa.go("insights"); }
        if (T.id === "week" && /^WK/.test(q.id)) {
          const sels = weekSels(fa) || [];
          const sel = sels[1] || sels[0];
          if (sel) requestAnimationFrame(() => requestAnimationFrame(() => { if (!fa.reveal(sel, sheet.getBoundingClientRect().height)) fa.reveal(sels[0], sheet.getBoundingClientRect().height); }));
        }
      },
      onAnswer: (q, sel, words, sk) => {
        if (q.id === "SKIP") T.outcome = sk ? "stuck" : sel[0] || "stuck";
        if (q.id === "TE") T.ease = sk ? "" : +sel[0];
        if (q.id === "TR") T.chips = sk ? [] : sel.map((v) => (Q.TR_PAIRS.flat().find(([k]) => k === v) || [, v])[1]);
      },
      onDone: (run) => finishTask(fa, T, run, skipped)
    });
  }
  function finishTask(fa, T, run, skipped) {
    const P = [...T.path];
    if (T.id === "bm") { if (!P.some((p) => p === "details yes")) P.push("details no"); if (!P.includes("undo yes")) P.push("undo no"); }
    if (T.id === "time") P.push(skipped ? "gave up" : T.undid && !T.edited ? "undo and log again" : T.edited ? "edit" : T.undid ? "undo and log again" : "edit");
    if (T.id === "score" && T.c.easy) P.splice(0, P.length, "your weeks");
    if (T.id === "history") P.push(T.c.history === "calendar" ? "calendar" : "list", `months moved ${Math.min(6, T.months)}`);
    const s = S();
    const seenN = (s.tasksSeen || 0) + (T.outcome === "seen" ? 1 : 0);
    save({ tasksSeen: seenN });
    /* tasks_seen on the session's row is the script's own count, from these rows */
    FX.send("task", {
      task: T.id, n: T.n, version: T.c.easy ? "easy" : "standard", state: FX.stateLine(fa.V(), { week: (s.arms || {}).week }), started_at: T.startedAt,
      seconds: T.seconds, active_seconds: Math.max(0, T.active), outcome: T.outcome || "stuck", hint: T.hint ? "yes" : "no", path: P.join(" | "),
      screens: T.screens, backs: T.backs, ease: T.ease == null ? "" : T.ease, chips: (T.chips || []).join(" | "), checks: run.checks && run.checks.n ? `${run.checks.right} of ${run.checks.n} right` : ""
    });
    curTask = null;
    if (unlisten) { unlisten(); unlisten = null; }
    closeSheet();
    go({ at: "task", i: T.i + 1 });
  }
  /* the reaction chips, as pairs; Reassuring and Worrying on the week, FloraScore, patterns and Ask tasks */
  function trQ(T) {
    const s = S(), order = s.trOrder || trOrder();
    const pairs = order.filter((o) => o.i < 3 || Q.TR_FOUR.includes(T.id)).map((o) => { const p = Q.TR_PAIRS[o.i]; return o.flip ? [p[1], p[0]] : p; });
    return { id: "TR", qText: "Which words fit? Pick any.", type: "chips", pairs, opts: pairs.flat() };
  }
  /* a task's own question, with its right answer worked out from the live logs now */
  function ownQ(fa, qid, T) {
    const L = fa.L, RU = fa.RU, M = fa.M(), V = fa.V(), mode = V.form, Ut = fa.AD.util;
    const c = taskCtx(fa, T.id);
    const dayLabel = (d) => { const x = L.dateOf(d); return `${Ut.DOWL[x.getDay()]}, ${Ut.MONL[x.getMonth()]} ${x.getDate()}`; };
    const mk = (base, extra = {}) => { if (!base) return null; const q = Object.assign({}, base, extra); q.qText = q.q; return q; };
    switch (qid) {
      case "BM1": case "BM2": {
        const words = mode === "B" ? L.WORDS.map((w) => [`w${w.k}`, w.word]) : L.TYPES.slice(1).map((t) => [`f${t.k}`, mode === "A" ? `${t.k} ${t.short}` : t.short]);
        return mk(Q.own[qid](Object.assign({}, c, { words })));
      }
      case "WK1": case "WK2": case "WK3": {
        const F = L.span(M, 7, mode), T7 = L.tally(F, true), flag = F.some((f) => f.state === "flag");
        if (qid === "WK1") {
          const gaps = F.filter((f) => !f.logged && !f.pending).length;
          if (T7.known >= 7 || flag || !gaps || gaps !== 7 - T7.known) return null;
          return mk(Q.own.WK1(Object.assign({}, c, { known: T7.known, gapWord: gaps === 1 ? "One day" : gaps === 2 ? "Two days" : `${cap(NUMW[gaps] || String(gaps))} days` })), { right: ["gap"] });
        }
        if (qid === "WK2") {
          const days = []; for (let d = L.TODAY - 6; d <= L.TODAY; d++) days.push([`d${d}`, d === L.TODAY ? "Today" : Ut.DOWL[L.dateOf(d).getDay()]]);
          const sh = F.filter((f) => f.state === "shifted").map((f) => `d${f.d}`);
          return mk(Q.own.WK2(Object.assign({}, c, { days })), { right: sh.length ? sh : ["none"], rightExact: true });
        }
        const week = c.easy ? "easy" : c.week;
        if (week === "note") return null;
        return mk(Q.own.WK3(c), { right: ["outside"] });
      }
      case "SC1": return mk(Q.own.SC1(c), { right: ["own"] });
      case "SC2": {
        const sc = L.score(M, L.TODAY, mode), su = L.scoreUsual(M, mode), v = sc ? sc.value : null;
        if (v == null || !su || (L.flagToday && L.flagToday(M))) return null;
        const rel = RU.scoreRel(v, su) || "";
        const r = /above/i.test(rel) ? "above" : /below/i.test(rel) ? "below" : "in";
        return mk(Q.own.SC2(c), { right: [r] });
      }
      case "PT1": {
        const PR = L.patterns(M, mode), fp = PR.sparse ? null : PR.found.find((p) => p.food);
        if (!fp) return null;
        const nameOf = (k) => (L.FOOD_NAMES[k] ? L.FOOD_NAMES[k][0] : cap(k));
        const quiet = shuffle(PR.quiet.filter((k) => k !== fp.food)).slice(0, 3);
        const foods = [[`f-${slug(fp.food)}`, nameOf(fp.food)]].concat(quiet.map((k) => [`f-${slug(k)}`, nameOf(k)]));
        /* one food can come before two kinds of change: it's one right answer */
        const right = [...new Set(PR.found.filter((p) => p.food).map((p) => `f-${slug(p.food)}`))];
        return mk(Q.own.PT1(Object.assign({}, c, { foods })), { right, rightWords: [...new Set(PR.found.filter((p) => p.food).map((p) => nameOf(p.food)))].join(" | ") });
      }
      case "IV1": case "IV2": {
        const cards = fa.cardTitles().map((t) => [`c-${slug(t)}`, t]);
        if (cards.length < 3) return null;
        return mk(Q.own[qid](Object.assign({}, c, { cards })));
      }
      case "CK1": return mk(Q.own.CK1(c));
      case "HI1": {
        if (!c.gapDays.length) return null;
        const g = c.gapDays[0], others = shuffle(c.logDays.filter((d) => d !== g)).slice(0, 3);
        const histDays = [g].concat(others).sort((a, b) => a - b).map((d) => [`d${d}`, dayLabel(d)]);
        return mk(Q.own.HI1(Object.assign({}, c, { histDays })), { right: c.gapDays.map((d) => `d${d}`), rightWords: c.gapDays.map(dayLabel).join(" | ") });
      }
      case "AS1": return mk(Q.own.AS1(c));
      default: return null;
    }
  }

  /* ---------- the comparisons (plan 3.6) ---------- */
  async function compareList() {
    const fa = await app(), s = S(), V = fa.V(), cmp = CFG.compare || {};
    const order = (s.arms && s.arms.order) || 1;
    const two = (order % 2 ? ["home", "history"] : ["history", "home"]).filter((k) => cmp[k] !== false).filter((k) => k !== "home" || !V.easy);
    const oura = cmp.oura !== false && !V.easy && /(^|\|)oura(\||$)/.test(A().IN6 || "");
    return two.concat(oura ? ["oura"] : []);
  }
  let curCmp = null;
  steps.compare = async (step) => {
    const fa = await app();
    const s = S();
    if (!s.cmps) save({ cmps: await compareList() });
    const k = S().cmps[step.i];
    if (!k) { go({ at: "tw" }); return; }
    const def = Q.compare[k], V = fa.V();
    FX.phase = k === "home" ? "cp1" : k === "history" ? "cp2" : "cp3";
    showApp();
    fa.closeAll();
    const was = k === "home" ? V.home : k === "history" ? V.history : V.look;
    const other = k === "home" ? (was === "score" ? "day" : "score") : k === "history" ? (was === "calendar" ? "list" : "calendar") : "oura";
    curCmp = { k, i: step.i, was, other };
    fa.set(k === "oura" ? "look" : k, other);
    fa.go(k === "history" ? "history" : "today");
    fa.comments(true);
    /* CP2's day: the latest day in the last 7, before today, with a BM logged */
    let cpDay = "";
    if (k === "history") {
      const L = fa.L, M = fa.M(), Ut = fa.AD.util;
      /* in the list, yesterday is labelled Yesterday: the task says both */
      for (let d = L.TODAY - 1; d >= L.TODAY - 6; d--) { const x = L.day(M, d); if (x && x.entries.some((e) => e.kind === "bm")) { const t = L.dateOf(d); cpDay = `${d === L.TODAY - 1 ? "yesterday, " : "on "}${Ut.DOWL[t.getDay()]}, ${Ut.MONL[t.getMonth()]} ${t.getDate()}`; break; } }
    }
    FX.ev("flow", "cp_shown", k);
    drawStrip({ kick: "Another way", text: def.text({ name: fa.M().P.name, cpDay }), buttons: [["cmp-next", "Next", ""]] });
  };
  async function endCompare() {
    const C = curCmp;
    if (!C) return;
    const fa = await app();
    fa.comments(false);
    const def = Q.compare[C.k];
    const qs = [() => Object.assign({}, def.q, { qText: def.q.q })];
    if (def.more) qs.push(() => Object.assign({}, def.more, { qText: def.more.q }));
    openSheet({ label: "A question" });
    drawStrip({ kick: "Another way", text: "One quick question.", buttons: [], comment: false });
    runQs({
      section: "compare", list: qs, i: 0, mode: "sheet",
      onDone: () => {
        fa.closeAll();
        fa.set(C.k === "oura" ? "look" : C.k, C.was);
        fa.go("today");
        curCmp = null;
        go({ at: "compare", i: C.i + 1 });
      }
    });
  }
  steps.tw = () => {
    runQs({ section: "tour", list: [() => Object.assign({}, Q.TW, { qText: Q.TW.q })], i: 0, mode: "page", onDone: () => go({ at: "install" }) });
  };

  /* ---------- putting Florin on the phone (plan 3.7) ---------- */
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); installPrompt = e;
    if (S().consented) FX.ev("install", "prompt_shown");
    /* Chrome offered it while the steps show: the steps for the Install button */
    if ($("[data-fx-android]")) drawAndroid();
  });
  window.addEventListener("appinstalled", () => { if (S().consented) { FX.ev("install", "appinstalled"); save({ installed: true }); } });
  /* small pictures of what to look for, marked as pictures so they don't read as buttons */
  const picShare = () => '<svg class="fx-ipic" viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="15" width="22" height="19" rx="4"/><path d="M20 5v19M14 11l6-6 6 6"/></svg>';
  const picDots = () => '<svg class="fx-ipic" viewBox="0 0 40 40" aria-hidden="true"><circle cx="11" cy="20" r="2.4" class="f"/><circle cx="20" cy="20" r="2.4" class="f"/><circle cx="29" cy="20" r="2.4" class="f"/></svg>';
  const picAdd = () => '<svg class="fx-ipic" viewBox="0 0 40 40" aria-hidden="true"><rect x="8" y="8" width="24" height="24" rx="6"/><path d="M20 14v12M14 20h12"/></svg>';
  const picHome = () => '<svg class="fx-ipic" viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/><rect x="22" y="6" width="12" height="12" rx="3"/><rect x="6" y="22" width="12" height="12" rx="3"/><rect x="22" y="22" width="12" height="12" rx="3" class="f"/></svg>';
  const picMenu = () => '<svg class="fx-ipic" viewBox="0 0 40 40" aria-hidden="true"><path d="M10 13h20M10 20h20M10 27h20"/></svg>';
  const picVdots = () => '<svg class="fx-ipic" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="11" r="2.4" class="f"/><circle cx="20" cy="20" r="2.4" class="f"/><circle cx="20" cy="29" r="2.4" class="f"/></svg>';
  const stepsList = (items) => `<ol class="fx-isteps">${items.map(([pics, t]) => `<li><span class="fx-ipics"${pics ? "" : " hidden"}>${pics ? `<span class="fx-ipics-k">Look for</span>${pics}` : ""}</span><span>${esc(t)}</span></li>`).join("")}</ol>`;
  const installHead = `<h1>Put Florin on your phone</h1><p class="fx-lede">So it opens from your home screen, full screen, like an app. This takes a few minutes. If it doesn't work, you can finish here instead.</p>`;
  const finishBtn = `<button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="i-here">Finish here instead</button>`;
  /* the study code, large, with the words to write it down: the person switches apps before they need it */
  const codeBox = (code, lead) => `<div class="fx-codebox fx-codebox--big"><p class="fx-codebox-k">${esc(lead || "Your study code")}</p><p class="fx-code-big">${esc(FX.code.show(code || ""))}</p><p>Write this code down. You may need it once, when you open Florin from your home screen.</p><div class="fx-act fx-act--row"><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fx="copy" data-copy="${esc(FX.code.norm(code || ""))}">Copy the code</button></div></div>`;
  /* Florin is open from the home screen (the script has seen it, or, on Android, this storage says so): this tab is
     done, whatever step it was left on */
  function showOpenHere() {
    showPage(`<h1>Florin is open from your home screen.</h1><p class="fx-lede">You can close this tab. If Florin closed, open it from your home screen again.</p><p class="fx-fine">${PROTO}</p>`, { more: false });
  }
  const atInstall = () => { const st = (S().step || {}).at; return ["install", "is", "code"].includes(st); };
  FX.on("installed", () => { if (!FX.standalone() && atInstall() && !S().installSent) showOpenHere(); });
  async function seenInstalled() {
    const s = S();
    if (s.appOpened) return true;
    if (!FX.ENDPOINT || !s.sid) return false;
    try { const r = await FX.jsonp({ op: "ack", sid: s.sid, cid: FX.cid() }, 6000); return !!(r && r.installed); } catch (e) { return false; }
  }
  steps.install = async () => {
    const s = S();
    if (FX.standalone()) { go({ at: "is" }); return; }
    showPage(`<h1 data-autofocus>Sending your answers...</h1><p class="fx-lede">This takes a few seconds.</p>`);
    /* a Safari tab opened again after Florin was put on the home screen and opened there */
    if (!s.installSent && await seenInstalled()) { showOpenHere(); return; }
    FX.ev("flow", "install_shown");
    if (!s.installAt) {
      const at = FX.iso();
      save({ installAt: at, installActive: activeMs(), installTab: FX.TAB() });
      FX.send("session", { install_at: at });
    } else if (s.installTab !== FX.TAB()) save({ installActive: activeMs(), installTab: FX.TAB() });
    let ok = true;
    if (FX.ENDPOINT) ok = await FX.settle(20000, { patient: 65000 });
    const e = FX.env;
    if (!ok) {
      showPage(`<h1>Your phone hasn't sent your answers yet.</h1><p class="fx-lede">Check that you're online, then try again. Or finish here, so nothing is lost.</p><div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="i-retry">Try again</button><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="i-here">Finish here</button></div>`);
      return;
    }
    if (e.iOS && !FX.ENDPOINT) {
      showPage(`${installHead}<p class="fx-note">This copy of the study isn't connected yet, so your answers can't follow you to the home screen. Please finish here.</p><div class="fx-act">${finishBtn}</div>`);
      return;
    }
    if (e.inapp) {
      showPage(`${installHead}<p class="fx-p">To add Florin to your home screen, open this page in your phone's browser first: tap the menu (often three dots), then Open in browser.</p>${e.iOS ? codeBox(s.code) : ""}<div class="fx-act">${finishBtn}</div>`);
      return;
    }
    if (e.iOS && e.browser === "safari") {
      const new26 = +e.os >= 26;
      showPage(`${installHead}${codeBox(s.code)}${stepsList([
        [new26 ? picDots() + picShare() : picShare(), new26 ? "Find the Share button. If you see three dots beside the address, tap them, then tap Share. If you see a square with an arrow pointing up, tap that." : "Tap the Share button at the bottom of the screen: a square with an arrow pointing up."],
        [picAdd(), "Scroll down and tap Add to Home Screen."],
        ["", "If you see Open as Web App, leave it on. Tap Add."],
        [picHome(), "Go to your home screen and open Florin. It may be on your last home screen page: swipe left, or swipe down and type Florin."]
      ])}<p class="fx-p fx-muted">No Add to Home Screen? This page may be open inside another app. Tap the compass at the bottom to open it in Safari, then start again.</p>
        <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="i-added">I've added it</button>${finishBtn}</div>`);
      return;
    }
    if (e.iOS) {
      showPage(`${installHead}${codeBox(s.code)}${stepsList([
        [picShare(), "Tap the Share button in the address bar, then Add to Home Screen. If you don't see it, open this page in Safari: tap Copy the address, paste it into Safari's address bar, and follow the steps there."],
        ["", "If you see Open as Web App, leave it on. Tap Add."],
        [picHome(), "Go to your home screen and open Florin. It may be on your last home screen page: swipe left, or swipe down and type Florin."]
      ])}<div class="fx-act"><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="i-copy">Copy the address</button><button type="button" class="fx-btn fx-btn--block" data-fx="i-added">I've added it</button>${finishBtn}</div>`);
      return;
    }
    if (e.android) { drawAndroid(); return; }
    showPage(`${installHead}<p class="fx-p">Putting Florin on a home screen works on a phone. On this computer, finish here.</p><div class="fx-act">${finishBtn}</div>`);
  };
  /* Android: the steps follow what Chrome offers. Until it offers its Install prompt, the menu's way; once it has, the
     Install button. Samsung Internet has its own menu */
  function drawAndroid() {
    const samsung = FX.env.browser === "samsung";
    const items = samsung
      ? [[picMenu(), "Tap the menu (three lines) at the bottom, then Add page to, then Home screen."], [picHome(), "Open Florin from your home screen or your list of apps. It may be on your last home screen page."]]
      : installPrompt
        ? [[picAdd(), "Tap Install below, then Install again in the box that opens."], [picHome(), "Open Florin from your home screen or your list of apps. It may be on your last home screen page."]]
        : [[picVdots(), "Tap the three dots at the top right, then Add to Home screen or Install app."], ["", "Tap Install."], [picHome(), "Open Florin from your home screen or your list of apps. It may be on your last home screen page."]];
    showPage(`<div data-fx-android>${installHead}${stepsList(items)}
      <div class="fx-act">${!samsung && installPrompt ? `<button type="button" class="fx-btn fx-btn--block" data-fx="a-install">Install</button>` : ""}<button type="button" class="fx-btn${!samsung && installPrompt ? " fx-btn--line" : ""} fx-btn--block" data-fx="i-added">I've added it</button>${finishBtn}</div></div>`);
  }
  /* after I've added it: wait for the app to open from the home screen */
  function waitForApp() {
    const s = S();
    showPage(`<h1>Now open Florin from your home screen.</h1>
      ${FX.env.iOS ? `<div class="fx-codebox fx-codebox--big"><p class="fx-codebox-k">If it asks for your study code</p><p class="fx-code-big">${esc(FX.code.show(s.code || ""))}</p></div>` : `<p class="fx-lede">It picks up where you are now.</p>`}
      <p class="fx-p" data-fx-wait>When Florin is open from your home screen, you can close this tab.</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="i-said">It didn't open. Continue here.</button></div>`);
    save({ install: "said" });
    const tick = setInterval(async () => {
      if ($("[data-fx-wait]") == null) { clearInterval(tick); return; }
      if (await seenInstalled()) { clearInterval(tick); showOpenHere(); }
    }, 5000);
  }
  /* IS1, and IS2 first for anyone who finished here (IS1 left out after "I'd rather not add it") */
  steps.is = (step) => {
    const s = S();
    const here = step.here || (!FX.standalone() && s.install !== "seen");
    const list = [];
    if (here) list.push(() => Object.assign({}, Q.install.IS2, { qText: Q.install.IS2.q }));
    list.push(() => (here && A().IS2 === "rather" ? null : Object.assign({}, Q.install.IS1, { qText: Q.install.IS1.q })));
    let ease = "", outcome = FX.standalone() ? "seen" : here ? "browser" : s.install || "said";
    runQs({
      section: "install", task: "install", list, i: 0, mode: "page", skipIds: new Set(S().qidsDone || []),
      onAnswer: (q, sel) => { if (q.id === "IS1") ease = sel[0] ? +sel[0] : ""; if (q.id === "IS2" && ["find", "match"].includes(sel[0])) outcome = "couldnt"; },
      onDone: async () => {
        const s2 = S();
        if (!s2.installSent) {
          const path = FX.standalone() ? (s2.codeHow || (FX.env.iOS ? "code from the address" : "no code needed")) : "";
          /* its place is after the tour's tasks, however many this session had */
          let nT = (s2.tasks || []).length;
          if (!nT) { try { nT = (await tasksFor()).length; } catch (e) { nT = (CFG.tasks || []).length || 8; } }
          const secs = s2.installAt ? Math.max(0, Math.round((Date.now() - Date.parse(s2.installAt)) / 1000)) : 0;
          /* the visible part: this window's own time since the steps showed, or, in the app on the home screen, since
             it opened */
          const act = Math.min(secs, Math.max(0, Math.round((activeMs() - (s2.installTab === FX.TAB() ? s2.installActive || 0 : 0)) / 1000)));
          FX.send("task", { task: "install", n: Math.min(9, nT + 1), version: s2.version || "standard", state: "", started_at: s2.installAt || FX.iso(), seconds: secs, active_seconds: act, outcome, hint: "no", path: [FX.standalone() ? "added" : "", path].filter(Boolean).join(" | "), screens: 0, backs: 0, ease, chips: "", checks: "" });
          FX.send("session", { install: outcome });
          save({ installSent: true, install: outcome });
        }
        go({ at: "freeintro" });
      }
    });
  };

  /* ---------- the installed app on iPhone: the code (plan 3.7) ---------- */
  steps.code = (step, o = {}) => {
    showPage(`<h1>Enter your study code</h1>
      <p class="fx-lede">It's the 6 characters on the screen where you added Florin.</p>
      <label class="fx-box-l" for="fxCode">Study code</label>
      <input id="fxCode" class="fx-code-in" inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="9" value="${esc(o.value || "")}">
      <p class="fx-err" data-fx-err role="alert"${o.err ? "" : " hidden"}>${esc(o.err || "")}</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="code-go">${o.retry ? "Try again" : "Continue"}</button></div>
      <p><button type="button" class="fx-link" data-fx="nocode">I don't have my code</button></p>
      <p class="fx-p" data-fx-nocode hidden>Go back to Safari: your code is on the screen there. You can also finish in Safari instead.</p>
      <p><button type="button" class="fx-link" data-fx="fresh">I haven't started the study yet</button></p>`, { more: false });
  };
  const NET = "Florin needs a connection to pick up where you were. Check your connection and tap Try again.";
  const BUSY = "Florin couldn't check your code just now. Wait a minute and try again.";
  async function tryCode(raw) {
    const c = FX.code.norm(raw);
    if (!FX.code.ok(c)) { FX.ev("install", "code_bad"); steps.code({}, { value: raw, err: "That code doesn't look right. Check it and try again." }); return; }
    if (!FX.ENDPOINT) { steps.code({}, { value: raw, err: NET, retry: true }); return; }
    let r = null;
    try { r = await FX.jsonp({ op: "lookup", code: c }, 9000); } catch (e) { steps.code({}, { value: raw, err: NET, retry: true }); return; }
    if (r && !r.ok && (r.error === "rate" || r.error === "server")) { steps.code({}, { value: raw, err: BUSY, retry: true }); return; }
    if (!r || !r.ok || !r.sid) { FX.ev("install", "code_unknown"); steps.code({}, { value: raw, err: r && r.error === "bad_code" ? "That code doesn't look right. Check it and try again." : "We couldn't find that code. Check it and try again." }); return; }
    adopt(r, "code typed");
  }
  /* a session found by its code becomes this window's own: the app on an iPhone's home screen, or another browser (from
     an app's own browser to Safari, say). It carries on where the person was, from what the script holds */
  async function adopt(r, how) {
    const standalone = FX.standalone();
    if (r.study && /-test$/.test(r.study)) FX.setTest(true);
    const a = Object.assign({}, r.a || {});
    const kinds = Q.comment.kinds;
    FX.ls.set("session", Object.assign({
      sid: r.sid, code: r.code, consented: true, stage: r.stage || "install", A: a, version: r.version || "standard", person: r.person || "sarah",
      age65: a.IN7 === "65", arms: { home: r.home || "score", history: r.history || "calendar", week: r.week || "built", order: +r.order || 1 }, trOrder: trOrder(),
      codeHow: how, installAt: r.install_at || "", done: r.done || [], qidsDone: r.qids || [], adopted: standalone ? "app" : "browser",
      /* the comments sent from the other window: listed at Submit, and deletable there, never their words */
      before: (r.comments || []).map((x) => ({ cmid: x.cmid, label: x.target || "This screen", kinds: String(x.kind || "").split(" | ").map((w) => (kinds.find(([, t]) => t === w) || [])[0]).filter(Boolean) })),
      personName: cap(r.person || "sarah")
    }, standalone ? { install: "seen", appOpened: true } : {}));
    FX.ls.set("comments", []);
    resetActive();
    FX.ev("install", "code_ok");
    if (standalone) FX.ev("install", "standalone");
    putCode(r.code);
    showPage(`<h1 data-autofocus>Picking up where you were...</h1>`, { more: false });
    const fa = await app();
    fa.apply(); fa.reset();
    save({ personName: fa.M().P.name });
    const step = await resumeStep(r, standalone);
    if (!standalone && step.at !== "thanks" && step.at !== "stopped") resumeLine = "Welcome back. You can carry on here.";
    go(step);
  }
  /* where to carry on: the first task with no row, then the first comparison not answered, then the box, then install;
     after install, its stage */
  async function resumeStep(r, standalone) {
    const st = r.stage || "";
    if (st === "done") return { at: "thanks" };
    if (st === "stopped") return { at: "stopped" };
    if (st === "exit") return { at: "exitintro" };
    if (st === "free") return { at: "freeintro" };
    if (st === "install") return standalone ? { at: "is" } : { at: "install" };
    const tasks = await tasksFor();
    save({ tasks });
    const done = r.done || [], qd = r.qids || [];
    const i = tasks.findIndex((t) => !done.includes(t));
    if (i === 0) return { at: "tourintro" };
    if (i > 0) return { at: "task", i };
    const cmps = await compareList();
    save({ cmps });
    const QID = { home: "CP1", history: "CP2", oura: "CP3" };
    const j = cmps.findIndex((k) => !qd.includes(QID[k]));
    if (j >= 0) return { at: "compare", i: j };
    if (!qd.includes("TW")) return { at: "tw" };
    return standalone ? { at: "is" } : { at: "install" };
  }

  /* ---------- free use (plan 3.8) ---------- */
  steps.freeintro = () => {
    showPage(`<h1>Look around</h1>
      <p class="fx-lede">Find one thing you like and one thing you'd change. For each, tap Comment at the top, then tap the thing, and tell us.</p>
      <p class="fx-p">The microphone in the app plays a sample; it doesn't listen.</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="free-go">Start looking around</button></div>`);
  };
  let freeT = 0;
  steps.free = async () => {
    const fa = await app();
    showApp();
    fa.home(); fa.comments(true);
    FX.phase = "free";
    const s = S();
    const until = s.freeUntil || Date.now() + (+CFG.freeMinutes || 2) * 60000;
    save({ freeUntil: until });
    FX.ev("flow", "free_start");
    const fmt = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} left`; };
    const draw = () => {
      const left = until - Date.now();
      drawStrip({ kick: "Look around", timer: left > 0 ? fmt(left) : "", text: left > 0 ? "Find one thing you like and one thing you'd change. Tap Comment, then tap each one, and tell us." : "Time's up. Tap Next when you're ready.", buttons: [["free-done", left > 0 ? "I'm done" : "Next", ""]] });
    };
    draw();
    clearInterval(freeT);
    let wasUp = false;
    freeT = setInterval(() => {
      if (view.hidden || !stripState || stripState.kick !== "Look around") { clearInterval(freeT); return; }
      const left = until - Date.now();
      const el = $("[data-fx-timer]", strip);
      if (left > 0 && el) el.textContent = fmt(left);
      if (left <= 0 && !wasUp) { wasUp = true; draw(); }
    }, 1000);
  };

  /* ---------- the exit survey (plan 3.9) ---------- */
  steps.exitintro = () => {
    showPage(`<p class="fx-kick">Last part</p><h1>What you thought</h1><p class="fx-lede">About 8 minutes. Every question can be skipped.</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="exit-go">Start</button></div>`);
  };
  function exitCtx() { const s = S(); return { name: s.personName || cap(s.person || "sarah"), easy: s.version === "easy", checkin: (CFG.decisions || {}).checkin !== false }; }
  const FR_PART = { bm: "logging a BM", time: "changing a BM's time", today: "Today", score: "FloraScore", insights: "Insights", checkin: "the weekly check-in", history: "History", ask: "Ask Florin", install: "putting it on your phone", else: "something else" };
  function exitList() {
    const c = exitCtx();
    const base = Q.exit(c);
    const out = [];
    base.forEach((q) => {
      if (q.id === "FR2") {
        for (let j = 0; j < 3; j++) out.push(() => {
          const parts = (A().FR1 || "").split("|").filter((x) => x && x !== "nothing");
          const p = parts[j];
          if (!p) return null;
          return { id: "FR2", type: "box", qText: Q.FR2(FR_PART[p] || p), part: p };
        });
      } else if (q.id === "PAY") out.push({ pay: true });
      else out.push(() => Object.assign({}, q, { qText: q.q }));
    });
    return out;
  }
  steps.exit = (step) => {
    const list = exitList();
    const payAt = list.findIndex((x) => x && x.pay);
    const i = step.i || 0;
    if (i === payAt) { go({ at: "pay", i }); return; }
    const sub = i < payAt ? list.slice(0, payAt) : list;
    runQs({
      section: "exit", list: sub.map((x) => (x && x.pay ? null : x)), i, mode: "page", min: i > payAt ? payAt + 1 : 0, skipIds: new Set(S().qidsDone || []),
      kick: () => "What you thought",
      persist: (k) => save({ step: { at: "exit", i: k } }),
      onAnswer: (q) => { if (/^SUS\d+$/.test(q.id)) susUpdate(); },
      onDone: (run) => { if (i < payAt && run.i >= payAt) go({ at: "pay", i: payAt }); else go({ at: "submit" }); }
    });
  };
  function susUpdate() {
    const a = A(), v = [];
    for (let k = 1; k <= 10; k++) { const x = +a[`SUS${k}`]; if (!(x >= 1 && x <= 5)) return; v.push(k % 2 ? x - 1 : 5 - x); }
    const sus = v.reduce((p, q) => p + q, 0) * 2.5;
    save({ sus });
    FX.send("session", { sus });
  }
  steps.pay = async (step) => {
    /* the membership page was shown in another window already (its question is answered) */
    if ((S().qidsDone || []).includes("VA2")) { go({ at: "exit", i: step.i + 1 }); return; }
    const fa = await app();
    showApp();
    fa.comments(true);
    FX.phase = "exit";
    fa.go("today");
    fa.pay();
    FX.ev("flow", "pay_shown");
    drawStrip({ kick: "Membership", text: "The app has a free plan and a membership. Here's the page that explains what membership adds. Have a look, then tap Next.", buttons: [["pay-next", "Next", ""]] });
    payNextI = step.i + 1;
  };
  let payNextI = 0;

  /* ---------- submit and thanks (plan 3.10) ---------- */
  steps.submit = () => {
    const n = FX.comments ? FX.comments.count() : 0;
    showPage(`<h1>That's everything</h1>
      <p class="fx-lede">Tap Submit to finish. Your answers were sent as you went; this sends the last of them.</p>
      <section class="fx-review"><h2>Your comments (<span data-fx-cmn>${n}</span>)</h2><p class="fx-p fx-muted">You can change or delete any of them before you submit.${FX.comments && FX.comments.before().length ? " The ones you left before you added Florin to your home screen are with the team already: you can delete them here." : ""}</p><div data-fx-review></div></section>
      <p class="fx-err" data-fx-err role="alert" hidden></p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="submit">Submit</button></div>`);
    if (FX.comments) FX.comments.review($("[data-fx-review]", page));
  };
  FX.on("comments", (n) => { const el = $("[data-fx-cmn]"); if (el) el.textContent = String(n); });
  async function submit() {
    const s = S();
    const btn = $('[data-fx="submit"]', page);
    if (btn) { btn.setAttribute("aria-disabled", "true"); btn.textContent = "Sending..."; }
    if (!s.token) save({ token: FX.rand(8, FX.code.ALPHA) });
    if (!s.submitted) {
      /* minutes and comments are the script's own count; this window's visible minutes go with it */
      FX.send("session", { submitted: "yes", stage: "done", active_minutes: activeMin() });
      FX.ev("flow", "submit");
      FX.sendUnlinked({ kind: "token", token: S().token });
      save({ submitted: true });
    }
    if (FX.ENDPOINT && navigator.onLine === false) {
      const e = $("[data-fx-err]", page);
      if (e) { e.hidden = false; e.textContent = "Your phone is offline. Your answers are saved on this phone and will send when it's back online. Open Florin again later to send them."; }
      if (btn) { btn.removeAttribute("aria-disabled"); btn.textContent = "Submit"; }
      return;
    }
    if (FX.ENDPOINT) await FX.settle(12000);
    go({ at: "thanks" });
  }
  /* the thank-you code in two groups of four, as the study code is shown in two groups of three */
  const showToken = (t) => (String(t || "").length === 8 ? `${t.slice(0, 4)} ${t.slice(4)}` : String(t || ""));
  const tokenHow = () => CFG.tokenHow || "reply to the message your study link came in, with this code";
  steps.thanks = () => {
    const s = S();
    const r = recruiter();
    const copy = (v, what) => `<div class="fx-act fx-act--row"><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-fx="copy" data-copy="${esc(v)}">Copy ${what}</button></div>`;
    showPage(`<h1>Thank you</h1>
      <p class="fx-lede">Your answers are in.</p>
      <p class="fx-p"><b>Write these codes down</b>, or copy them somewhere safe. They stay on this phone until you clear this session.</p>
      <div class="fx-codebox fx-codebox--big"><p class="fx-codebox-k">Your study code</p><p class="fx-code-big">${esc(FX.code.show(s.code || ""))}</p><p>Keep it if you may want your answers removed: email ${esc(contactOr())} with it.</p>${copy(FX.code.norm(s.code || ""), "the study code")}</div>
      ${s.token ? `<div class="fx-codebox fx-codebox--big"><p class="fx-codebox-k">Your thank-you code</p><p class="fx-code-big">${esc(showToken(s.token))}</p><p>To get your thank-you, ${esc(tokenHow())}. ${esc(r || "The study's recruiter")} uses it to send your thank-you, and never sees your answers.</p>${copy(s.token, "the thank-you code")}</div>` : ""}
      <p class="fx-p">If you're worried about your gut, talk to a clinician. If you see blood in a BM, have a black or tar-like BM, a fever, vomiting that won't stop, weight loss you can't explain, or you wake at night to go, contact your primary care doctor. If there's a lot of blood, or you feel faint or dizzy, get urgent care now.</p>
      <p class="fx-proto">${PROTO}</p>
      <p class="fx-p">To take Florin off your home screen, press and hold its icon, then follow the steps to remove it.</p>
      ${CFG.followUp && !s.followSent ? `<section class="fx-review"><h2>Could we contact you about a follow-up?</h2><p class="fx-p fx-muted">Optional. What you give here is kept apart from your code and your answers.</p><label class="fx-box-l" for="fxFollow">An email address or phone number</label><input id="fxFollow" class="fx-code-in fx-follow-in" autocomplete="off" maxlength="200"><div class="fx-act"><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="follow">Send</button></div></section>` : ""}
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="clear">Clear this session from this phone</button></div>
      <div class="fx-more-confirm" data-fx-clear hidden></div>`, { more: false });
  };
  /* Clear asks first, with both codes in view, since once it's done this phone can't show them again */
  function askClear() {
    const s = S(), box = $("[data-fx-clear]", page);
    if (!box) return;
    const codes = [s.code ? `your study code, ${FX.code.show(s.code)}` : "", s.token ? `your thank-you code, ${showToken(s.token)}` : ""].filter(Boolean);
    box.innerHTML = `<p>Clear this session from this phone? ${codes.length ? `This phone won't show ${codes.join(", or ")}, again. Write ${codes.length > 1 ? "them" : "it"} down first.` : "Nothing you sent is changed."}</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="clear-y">Clear it</button><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="clear-n">Keep it</button></div>`;
    box.hidden = false;
    const y = box.querySelector("button"); if (y) { y.focus({ preventScroll: true }); box.scrollIntoView({ block: "center" }); }
  }
  /* what's still queued is sent and confirmed first, the events too, so nothing is left behind on the phone */
  async function doClear() {
    FX.ev("flow", "cleared");
    showPage(`<h1 data-autofocus>Clearing...</h1><p class="fx-lede">Sending the last of your answers first. This can take a few seconds.</p>`, { more: false });
    if (FX.ENDPOINT && navigator.onLine !== false) { try { await FX.settle(20000, { events: true, unlinked: true }); } catch (e) { /* what's left stays until it's confirmed */ } }
    FX.clearAll();
    go({ at: "cleared" });
  }
  steps.stopped = () => {
    const s = S();
    showPage(`<h1>You've stopped the study.</h1>
      <p class="fx-lede">Thank you for your time. What you answered so far stays with the team, under your code.</p>
      ${s.code ? `<div class="fx-codebox"><p>Your study code: <b>${esc(FX.code.show(s.code))}</b>. To have your answers removed, email ${esc(contactOr())} with it.</p></div>` : ""}
      <p class="fx-p">If you're worried about your gut, talk to a clinician. If you see blood in a BM, have a black or tar-like BM, a fever, vomiting that won't stop, weight loss you can't explain, or you wake at night to go, contact your primary care doctor.</p>
      <p class="fx-proto">${PROTO}</p>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="clear">Clear this session from this phone</button></div>
      <div class="fx-more-confirm" data-fx-clear hidden></div>`, { more: false });
  };
  steps.cleared = () => showPage(`<h1>Cleared.</h1><p class="fx-lede">This session is gone from this phone. You can close this page.</p><p class="fx-fine">${PROTO}</p>`, { more: false });

  /* the session's comment count is the script's own, from the comments it holds */
  function countComments() { /* nothing to send */ }

  /* ======================================================================= */
  /* TAPS                                                                     */
  /* ======================================================================= */
  /* a quick second tap where a button was just pressed (a double tap, after "double-tap to comment") is caught: the
     button acts once, and nothing that has since moved under the finger is pressed. A tap in a text box never is */
  let lastTap = null;
  document.addEventListener("click", (e) => {
    if (!e.isTrusted || e.detail === 0) return;
    const t = e.target;
    if (!t || !t.closest || t.closest("textarea, input, label, select")) { lastTap = null; return; }
    const now = performance.now();
    if (lastTap && now - lastTap.t < 450 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24) {
      e.preventDefault(); e.stopImmediatePropagation(); lastTap = null; return;
    }
    lastTap = t.closest("button, a, [data-fx], [data-v], [data-q], [data-cm], [data-cmk], [data-cme], [data-cmd]") ? { t: now, x: e.clientX, y: e.clientY } : null;
  }, true);
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-fx]");
    if (b && b.dataset.fx === "start" && b.getAttribute("aria-disabled") === "true") { const t = $("[data-fx-tick]", page); if (t) t.hidden = false; return; }
    if (!b || b.getAttribute("aria-disabled") === "true") return;
    const k = b.dataset.fx, s = S();
    switch (k) {
      case "here": go({ at: "welcome" }); break;
      case "to-consent": go({ at: "consent" }); break;
      case "start": consent(); break;
      case "nothanks": go({ at: "nothanks" }); break;
      case "to-tour": go({ at: "tourintro" }); break;
      case "tour-go": FX.ev("flow", "tour_start"); go({ at: "task", i: 0 }); break;
      case "done": endTask(false); break;
      case "skip": endTask(true); break;
      case "hint": if (curTask) { curTask.hint = true; curTask.hintShown = true; drawTask(); pulseHint(); } break;
      /* Comment: the next tap in the app says what it's about, without pressing it */
      case "comment": startPick(); break;
      case "pick-screen": { const fa = await app(); fa.pick(false); endPick(); fa.comment(); break; }
      case "pick-x": { const fa = await app(); fa.pick(false); endPick(); break; }
      case "strip-open": if (stripState) { stripState.open = true; if (curTask) curTask.open = true; drawStrip(stripState); } break;
      case "more": openMore(); break;
      case "more-x": closeMore(); break;
      case "comments": closeMore(); showComments(); break;
      case "reload": closeMore(); await reloadApp(); if (curTask) { const st = { at: "task", i: curTask.i }; curTask = null; go(st); } else go(S().step || { at: "welcome" }); break;
      case "again": closeMore(); if (curTask) { const fa = await app(); fa.restore(curTask.snap); FX.ev("flow", "restart", curTask.id); const st = { at: "task", i: curTask.i }; curTask = null; go(st); } break;
      case "restart": confirmIn(`<p>Start the study again from the beginning? Your answers so far stay with the team, under your code.</p><div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="restart-y">Start again</button><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="more-x">Keep going</button></div>`); break;
      /* the new session gets new lanes (its numbers start at 1) when its sid is made at consent */
      case "restart-y": { closeMore(); const old = S(); FX.send("session", { stage: "stopped" }); FX.ev("flow", "stopped", "restart"); FX.ls.set("session", { restartOf: old.code || "" }); curTask = null; clearInterval(goalT); clearTimeout(hintT); clearInterval(freeT); closeSheet(); go({ at: "consent" }); break; }
      case "stop": confirmIn(`<p>Stop here? What you've answered so far stays with the team, under your code.</p><div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx="stop-y">Stop</button><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="more-x">Keep going</button></div>`); break;
      case "stop-y": closeMore(); FX.ev("flow", "stopped"); stageTo("stopped"); curTask = null; clearInterval(goalT); go({ at: "stopped" }); break;
      case "lower": toggleLow(); break;
      case "cmp-next": endCompare(); break;
      case "free-go": go({ at: "free" }); break;
      case "free-done": FX.ev("flow", "free_end"); { const fa = await app(); fa.comments(false); fa.closeAll(); } save({ freeUntil: null }); go({ at: "exitintro" }); break;
      case "exit-go": FX.ev("flow", "exit_start"); go({ at: "exit", i: 0 }); break;
      case "pay-next": { const fa = await app(); fa.closeAll(); fa.comments(false); go({ at: "exit", i: payNextI }); break; }
      case "submit": submit(); break;
      case "i-here": save({ install: "browser" }); go({ at: "is", here: true }); break;
      case "i-added": save({ install: "said" }); FX.send("session", { install: "said", active_minutes: activeMin() }); waitForApp(); break;
      case "i-said": save({ install: "said" }); go({ at: "is" }); break;
      case "i-copy": { try { await navigator.clipboard.writeText(location.href); FX.comments.toast("Address copied."); } catch (err) { FX.comments.toast("Press and hold the address bar to copy it."); } break; }
      case "copy": { try { await navigator.clipboard.writeText(b.dataset.copy || ""); FX.comments.toast("Copied."); } catch (err) { FX.comments.toast("Press and hold the code to copy it, or write it down."); } break; }
      case "i-retry": go({ at: "install" }); break;
      case "a-install": if (installPrompt) { installPrompt.prompt(); const r = await installPrompt.userChoice.catch(() => null); FX.ev("install", r && r.outcome === "accepted" ? "prompt_accepted" : "prompt_dismissed"); installPrompt = null; b.hidden = true; if (r && r.outcome === "accepted") waitForApp(); } break;
      case "code-go": tryCode(($("#fxCode") || {}).value || ""); break;
      case "nocode": { const p = $("[data-fx-nocode]"); if (p) p.hidden = false; break; }
      case "take": FX.own(); location.reload(); break;
      case "fresh": FX.ls.del("session"); go({ at: isDesktop() ? "desktop" : "welcome" }); break;
      case "follow": {
        const v = (($("#fxFollow") || {}).value || "").trim();
        if (!v) break;
        const d = new Date(); const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
        FX.sendUnlinked({ kind: "followup", n: FX.newId(8), contact: v.slice(0, 200), week: `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}` });
        save({ followSent: true });
        FX.comments.toast("Thank you. It's kept apart from your answers.");
        steps.thanks();
        break;
      }
      case "clear": askClear(); break;
      case "clear-y": doClear(); break;
      case "clear-n": { const c = $("[data-fx-clear]", page); if (c) { c.hidden = true; c.innerHTML = ""; } const cb = $('[data-fx="clear"]', page); if (cb) cb.focus(); break; }
      default: break;
    }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "fxCode") { e.preventDefault(); tryCode(e.target.value); } if (e.key === "Escape" && !more.hidden) closeMore(); });

  async function pulseHint() {
    const T = curTask, fa = await app();
    if (!T) return;
    const easy = !!fa.V().easy, day = fa.V().home === "day" && !easy;
    const sel = {
      bm: easy ? [".ap-ez-big--bm"] : day ? [".vr-log", ".ap-tb-plus"] : [".ap-tb-plus"],
      time: [S().t1 ? `[data-act="edit"][data-id="${S().t1.id}"]` : ".ap-tl", ".ap-tl"],
      week: ["[data-week]", ".ap-wk", ".ez-week"],
      score: easy ? ['.ap-layer [data-act="tab"][data-tab="insights"]'] : day ? [".vr-sc"] : [".ap-hero"],
      patterns: easy ? ['.ap-layer [data-act="tab"][data-tab="insights"]'] : ['.ap-tb [data-tab="insights"]'],
      checkin: ['[data-act="ck-start"]'],
      history: ['.ap-tb [data-tab="history"]'],
      ask: ['.ap-tb [data-tab="ask"]']
    }[T.id];
    if (sel) fa.pulse(sel);
  }
  function showComments() {
    const back = S().step || { at: "welcome" };
    const wasApp = !view.hidden;
    showPage(`<h1>Your comments</h1><p class="fx-p fx-muted">You can change or delete any of them before you submit.</p><div data-fx-review></div>
      <div class="fx-act"><button type="button" class="fx-btn fx-btn--block" data-fx-back>Back</button></div>`);
    FX.comments.review($("[data-fx-review]", page));
    $("[data-fx-back]", page).addEventListener("click", () => {
      if (wasApp) { page.hidden = true; view.hidden = false; document.documentElement.classList.add("fx-in-app"); }
      else go(back);
    });
  }

  /* ======================================================================= */
  /* START                                                                    */
  /* ======================================================================= */
  /* another window took the study over (on Android, the app opened from the home screen): this one goes quiet */
  FX.on("passive", () => {
    clearInterval(goalT); clearTimeout(hintT); clearInterval(freeT);
    curTask = null;
    closeSheet();
    const app2 = S().appOpened && !FX.standalone();
    showPage(app2 ? `<h1>Florin is open from your home screen.</h1><p class="fx-lede">You can close this tab.</p><p class="fx-fine">${PROTO}</p>`
      : `<h1>The study is open in another window.</h1><p class="fx-lede">You can close this one, or carry on here instead.</p><div class="fx-act"><button type="button" class="fx-btn fx-btn--line fx-btn--block" data-fx="take">Carry on here</button></div><p class="fx-fine">${PROTO}</p>`, { more: false });
  });
  function start() {
    if (CFG.open === false) { go({ at: "closed" }); return; }
    const qs = new URLSearchParams(location.search);
    const c = FX.code.norm(qs.get("c") || "");
    let s = S();
    const standalone = FX.standalone();
    /* opened from the home screen with this storage (Android): say so first, then take the session over, so the
       browser tab knows why it goes quiet */
    if (standalone && s.consented) save({ appOpened: true });
    FX.own();
    if (standalone && s.consented) { FX.ev("install", "standalone"); FX.send("session", {}); }
    /* a session here, or one to look up by the code in the address (the installed app on iPhone) */
    if (s.consented && s.sid && (!c || !s.code || s.code === c)) {
      if (s.stage === "done" && s.step && s.step.at === "thanks") { go({ at: "thanks" }); return; }
      if (s.stage === "stopped") { go({ at: "stopped" }); return; }
      app();
      const step = s.step || { at: "intake", i: 0 };
      const name = { intake: "the questions about you", setup: "the questions about you", tourintro: "the tasks", task: "the tasks", compare: "the tasks", tw: "the tasks", install: "putting Florin on your phone", is: "putting Florin on your phone", freeintro: "looking around", free: "looking around", exitintro: "the last questions", exit: "the last questions", pay: "the last questions", submit: "the last step" }[step.at];
      /* a reload puts the logs in memory back, so the time task's BM from task 1 is gone: the strip says to log one */
      if (name) { resumeLine = step.at === "task" && (s.tasks || [])[step.i] === "time" ? `Welcome back. Log a BM for ${s.personName || cap(s.person || "sarah")} first, then change its time.` : `Welcome back. You were on ${name}.`; FX.ev("flow", "resume", step.at); }
      if (standalone && ["install", "is"].includes(step.at)) { save({ install: "seen" }); go({ at: "is" }); return; }
      go(step);
      return;
    }
    if (c && FX.code.ok(c)) {
      if (!FX.ENDPOINT) { if (standalone) { go({ at: "code" }); return; } }
      else {
        showPage(`<h1 data-autofocus>Picking up where you were...</h1>`, { more: false });
        FX.jsonp({ op: "lookup", code: c }, 9000).then((r) => {
          if (r && r.ok && r.sid) adopt(r, "code from the address");
          else if (r && !r.ok && (r.error === "rate" || r.error === "server")) (standalone ? steps.code({}, { value: FX.code.show(c), err: BUSY, retry: true }) : go({ at: isDesktop() ? "desktop" : "welcome" }));
          else if (standalone) steps.code({}, { value: FX.code.show(c), err: "We couldn't find that code. Check it and try again." });
          else go({ at: isDesktop() ? "desktop" : "welcome" });
        }).catch(() => (standalone ? steps.code({}, { value: FX.code.show(c), err: NET, retry: true }) : go({ at: "welcome" })));
        return;
      }
    }
    if (standalone) { go({ at: "code" }); return; }
    /* nothing is sent, and nothing asked of the script, before consent: closing the study is config.js's open: false,
       and the script refuses a claim once it's closed */
    go({ at: isDesktop() ? "desktop" : "welcome" });
  }
  /* Android: the installed app and the browser share storage; the tab hears the app open */
  window.addEventListener("storage", (e) => {
    if (e.key !== "florin-focus:session" || FX.standalone()) return;
    const s = S();
    if (s.appOpened && ($("[data-fx-wait]") || (FX.isPassive() && $('[data-fx="take"]')))) showPage(`<h1>Florin is open from your home screen.</h1><p class="fx-lede">You can close this tab.</p><p class="fx-fine">${PROTO}</p>`);
  });
  /* Android: no pull to refresh (a reload puts the app's logs back) */
  document.documentElement.style.overscrollBehaviorY = "contain";
  guardOpen();
  /* the service worker, on the built site only, so Android offers Install and the app opens offline */
  if ("serviceWorker" in navigator && FX.BUILD !== "dev") navigator.serviceWorker.register("sw.js").catch(() => {});
  window.FXFLOW = { go, S, app, steps, task: () => curTask };
  start();
})();
