/* Florin focus group test: the session, shared by both pages. window.FX
   - The flow (index.html) makes it; the app (app.html), framed by the flow, uses the flow's own FX, so there is one
     queue, one sequence and one comment composer per tab. app.html opened on its own makes its own.
   - A session: a long random id (sid), made at consent, and a short study code (5 random characters and a Luhn mod 21
     check character), which is only a lookup the script resolves to the sid. CONTRACT.md, section 5.
   - Every piece (an answer, a task, a comment, an event) carries sid, cid (this tab or app window, for this session)
     and seq, waits in localStorage, and is posted as JSON in text/plain with fetch mode no-cors, since the response
     can't be read. The script is then asked by JSONP what it holds, and the queue is cleared up to there. Retries every
     20 seconds, on every open and when the phone comes back online; after a post fails, nothing more is posted for 20
     seconds, so an outage isn't met with the whole queue on every new piece.
   - Words are scrubbed of email addresses and phone numbers before they're queued.
   Nothing is sent before consent, and nothing at all while config.js has no endpoint. */
(function () {
  try {
    if (window.parent !== window && window.parent.FX && window.parent.FX.isFX) {
      window.FX = window.parent.FX;
      window.FX_FRAMED = true;
      return;
    }
  } catch (e) { /* a frame of another origin: make our own */ }
  /* the app on its own is the team's demo (?demo=1); a participant who lands on it goes to the study */
  if (document.documentElement.getAttribute("data-page") === "app" && !/[?&]demo=1\b/.test(location.search)) {
    location.replace(`./${location.search}`);
  }

  const CFG = window.FOCUS_CONFIG || {};
  const BUILD = "dev"; /* build.js stamps the build here */
  const P = "florin-focus:";
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(P + k); } catch (e) { /* private window */ } }
  };
  const ss = {
    get(k, d) { try { const v = sessionStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* fine */ } }
  };
  const qs = new URLSearchParams(location.search);
  if (qs.get("test") === "1") ls.set("test", true);
  if (qs.get("test") === "0") ls.del("test");
  /* Will's own runs (?test=1) tag every row "-test". It's read each time, since the app on an iPhone's home screen
     learns it from the code lookup, after this file has run */
  const isTest = () => !!ls.get("test", false);
  const studyId = () => (CFG.study || "florin-fg") + (isTest() ? "-test" : "");
  const ENDPOINT = String(CFG.endpoint || "").trim();

  /* ---------- random ids ---------- */
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const LOWER = "abcdefghijklmnopqrstuvwxyz0123456789";
  function rand(n, alpha) {
    const out = [], a = new Uint8Array(n * 2);
    (window.crypto || window.msCrypto).getRandomValues(a);
    /* rejection keeps every character equally likely */
    const lim = 256 - (256 % alpha.length);
    for (let i = 0; out.length < n; i++) {
      if (i >= a.length) { (window.crypto || window.msCrypto).getRandomValues(a); i = 0; }
      if (a[i] < lim) out.push(alpha[a[i] % alpha.length]);
    }
    return out.join("");
  }

  /* ---------- the study code: CONTRACT.md, section 5 ---------- */
  const ALPHA = "ACDEFHJKMNPRTWXY34679";
  const N = ALPHA.length;
  const luhnSum = (s, f0) => {
    let factor = f0, sum = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const ix = ALPHA.indexOf(s[i]);
      if (ix < 0) return -1;
      const a = factor * ix;
      factor = factor === 2 ? 1 : 2;
      sum += Math.floor(a / N) + (a % N);
    }
    return sum;
  };
  const code = {
    ALPHA,
    check(payload) { const s = luhnSum(payload, 2); return s < 0 ? "" : ALPHA[(N - (s % N)) % N]; },
    make() { const p = rand(5, ALPHA); return p + code.check(p); },
    norm(t) { return String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); },
    ok(c) { c = code.norm(c); return c.length === 6 && luhnSum(c, 1) >= 0 && luhnSum(c, 1) % N === 0; },
    show(c) { c = code.norm(c); return c.length === 6 ? `${c.slice(0, 3)} ${c.slice(3)}` : c; }
  };

  /* ---------- the phone ---------- */
  const env = (() => {
    const ua = navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const inapp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Snapchat|TikTok|musical_ly|Bytedance|GSA\/|Twitter|Pinterest/.test(ua) || (android && /; wv\)/.test(ua));
    const browser = inapp ? "inapp" : /SamsungBrowser/.test(ua) ? "samsung" : /EdgiOS|EdgA|Edg\//.test(ua) ? "edge" : /FxiOS|Firefox\//.test(ua) ? "firefox" : /CriOS|Chrome\//.test(ua) ? "chrome" : /Safari\//.test(ua) && /Version\//.test(ua) ? "safari" : "other";
    /* iOS 26 keeps "OS 18_6" in the user agent; Safari's own Version token says 26 */
    let os = "";
    if (iOS) {
      const m = /OS (\d+)_/.exec(ua), v = /Version\/(\d+)/.exec(ua);
      os = String(Math.max(m ? +m[1] : 0, v && browser === "safari" ? +v[1] : 0) || "");
    } else if (android) { const m = /Android (\d+)/.exec(ua); os = m ? m[1] : ""; }
    const touch = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
    return { iOS, android, inapp, browser, os, touch, platform: iOS ? "iphone" : android ? "android" : "other" };
  })();
  const standalone = () => !!((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true);
  const dark = () => !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  /* the text size iPhone reports (Dynamic Type, through -apple-system-body); unknown elsewhere */
  function textReported() {
    if (!env.iOS) return "unknown";
    try {
      const el = document.createElement("span");
      el.style.font = "-apple-system-body";
      el.style.position = "absolute"; el.style.visibility = "hidden";
      el.textContent = "x";
      document.body.appendChild(el);
      const px = parseFloat(getComputedStyle(el).fontSize) || 0;
      el.remove();
      return !px ? "unknown" : px < 16.5 ? "smaller" : px > 17.5 ? "larger" : "standard";
    } catch (e) { return "unknown"; }
  }
  const iso = (t) => new Date(t == null ? Date.now() : t).toISOString().replace(/\.\d{3}Z$/, "Z");

  /* ---------- the session ---------- */
  const session = () => ls.get("session", null);
  /* one window writes the session at a time: on Android the browser tab and the app opened from the home screen
     share this storage, and a window that wrote from a stale copy would undo the other's answers. The one the person
     is using owns it; another goes quiet (FX.passive) until the person picks it up again */
  let passive = false;
  const patch = (o) => { if (passive) return session() || {}; const s = Object.assign(session() || {}, o); ls.set("session", s); return s; };
  /* this tab's or app window's own id (its queue and heartbeat), and, for the session it's running, two lanes, each its
     own cid and run of seq from 1: answers, tasks, comments and the session's row in one, the events in the other, so
     the events can wait behind the answers without leaving a gap in the answers' numbers (the script confirms each lane
     up to its first gap). A new session in the same tab (Start again, or Clear and open the link again) gets new lanes,
     so its numbers start at 1 too. A frame of the flow shares the flow's (one sessionStorage per tab) */
  const TAB = () => { let t = ss.get("tab", null); if (!t) { t = rand(6, LOWER); ss.set("tab", t); } return t; };
  function lanes() {
    const s = session(), sid = (s && s.sid) || "";
    let l = ss.get("lanes", null);
    if (!l || l.sid !== sid || !l.a || !l.e) { l = { sid, a: rand(6, LOWER), e: rand(6, LOWER), sa: 0, se: 0 }; ss.set("lanes", l); }
    return l;
  }
  function cid(lane) { return lanes()[lane === "e" ? "e" : "a"]; }
  function nextSeq(lane) { const l = lanes(), k = lane === "e" ? "se" : "sa"; l[k] = (l[k] || 0) + 1; ss.set("lanes", l); return l[k]; }

  /* ---------- words ---------- */
  const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}/g;
  /* 7 or more digits with spaces, dots, dashes or brackets between, a bracket before the first included: from the
     first digit (or its bracket) to the last digit, so "(555) 010-9999." keeps its full stop */
  const PHONE = /\+?\(?\d(?:[\s().-]{0,3}\d){6,}\)?/g;
  const scrub = (t) => String(t == null ? "" : t).replace(EMAIL, "[removed]").replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 7 ? "[removed]" : m)).replace(/\s+$/, "").slice(0, 1000);
  /* the app's own alarm net (L.alarmsIn), never a second one: the note shows when it hears a sign */
  const alarm = (t) => {
    const L = window.FLORIN_LOGS;
    try { return !!(L && L.alarmsIn && String(t || "").trim() && L.alarmsIn(String(t)).length); } catch (e) { return false; }
  };
  const ALARM_NOTE = "If this is about you: blood in a BM, a black or tar-like BM, a fever, vomiting that won't stop, weight loss you can't explain, or waking at night to go are worth a clinician's look soon. Your primary care doctor is the right first stop. If there's a lot of blood, or you feel faint or dizzy, get urgent care now.";
  const LEAVE_OUT = "Please leave out anything you wouldn't want a research team to read.";

  /* ---------- the queue ---------- */
  const MAXQ = 1500;
  /* each tab or app window keeps its own queue (queue.<tab>), so two never write one list: a window reading a stale
     copy of a shared list could drop the other's newest piece. A queue whose window has gone quiet for 90 seconds
     (its heartbeat, hb.<tab>) is taken over by the next window that runs */
  const qKey = () => `queue.${TAB()}`;
  const readQ = () => { const q = ls.get(qKey(), []); return Array.isArray(q) ? q : []; };
  /* an empty queue leaves nothing behind once there's no session (after Clear) */
  const writeQ = (q) => {
    if (!q.length && !session()) { ls.del(qKey()); ls.del(`hb.${TAB()}`); emit("queue", 0); return; }
    if (!ls.set(qKey(), q.slice(-MAXQ))) ls.set(qKey(), q.slice(-200));
    emit("queue", q.length);
  };
  const qKeys = () => { try { return Object.keys(localStorage).filter((k) => k === `${P}queue` || k.indexOf(`${P}queue.`) === 0).map((k) => k.slice(P.length)); } catch (e) { return []; } };
  /* the heartbeat says this window's queue is in use; a window with no session and nothing queued keeps none */
  const beat = () => { if (session() || readQ().length) ls.set(`hb.${TAB()}`, Date.now()); };
  function adopt() {
    const mine = qKey(), now = Date.now();
    qKeys().filter((k) => k !== mine).forEach((k) => {
      const tab = k === "queue" ? "" : k.slice(6), hb = tab ? +ls.get(`hb.${tab}`, 0) : 0;
      if (tab && now - hb < 90000) return;
      const theirs = ls.get(k, []);
      if (Array.isArray(theirs) && theirs.length) { const q = readQ(), have = new Set(q.map((x) => key(x.p))); theirs.forEach((x) => { if (x && x.p && !have.has(key(x.p))) q.push(Object.assign(x, { s: 0 })); }); writeQ(q); }
      ls.del(k);
      if (tab) ls.del(`hb.${tab}`);
    });
  }
  let flushT = 0, eventsT = 0;
  function enqueue(p, soon) {
    const q = readQ();
    q.push({ p, s: 0 });
    writeQ(q);
    if (soon === false) {
      const nEv = q.filter((x) => x.p.kind === "event" && !x.s).length;
      if (nEv >= 25) schedule(200);
      else if (!eventsT) eventsT = setTimeout(() => { eventsT = 0; schedule(0); }, 10000);
    } else schedule(300);
  }
  function schedule(ms) { clearTimeout(flushT); flushT = setTimeout(flush, ms); }
  const FIELDS_KEEP = (o) => { const out = {}; Object.keys(o || {}).forEach((k) => { const v = o[k]; if (v === undefined || typeof v === "function") return; out[k] = v; }); return out; };
  /* a session piece: CONTRACT.md, section 2.1 */
  function send(kind, fields, o = {}) {
    if (passive) return null;
    const s = session();
    if (!s || !s.sid || !s.consented || s.cleared) return null;
    const f = FIELDS_KEEP(fields);
    /* the envelope always wins over a field of the same name; a piece may name its own phase */
    const lane = kind === "event" ? "e" : "a";
    const p = Object.assign(f, { kind, study: studyId(), build: BUILD, sid: s.sid, cid: cid(lane), seq: nextSeq(lane), at: iso(), phase: f.phase != null ? f.phase : FX.phase || "", standalone: standalone() });
    ["words", "question", "answer", "target", "detail"].forEach((k) => { if (typeof p[k] === "string") p[k] = scrub(p[k]); });
    enqueue(p, o.soon);
    return p;
  }
  const ev = (type, name, detail, screen) => send("event", { type, name: String(name || "").slice(0, 60), detail: detail == null ? "" : String(detail).slice(0, 80), screen: screen || FX.screen || "" }, { soon: false });
  /* the unlinked pieces (the thank-you code, the follow-up contact): no sid, no seq, no time, each in a POST of its own */
  function sendUnlinked(p) { const wait = 4000 + Math.floor(Math.random() * 8000); const q = readQ(); q.push({ p: Object.assign({ study: studyId() }, p), s: 0, u: 1, due: Date.now() + wait }); writeQ(q); schedule(wait + 50); }

  let flushing = false, lastFail = 0, failUntil = 0, lastLinked = 0, lastAlone = 0;
  async function post(pieces) {
    const body = JSON.stringify({ v: 1, pieces });
    try {
      await fetch(ENDPOINT, { method: "POST", mode: "no-cors", cache: "no-store", credentials: "omit", keepalive: body.length < 60000, headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
      return true;
    } catch (e) { failUntil = Date.now() + 20000; return false; }
  }
  /* the back end takes 60 pieces a minute from one session: the phone sends at most sendPerMinute (50), answers first,
     then the thank-you code, then the events. Events never take more than 7 in 10 of a minute's budget, so an answer
     always has room (before the install steps, the phone waits for every answer to be confirmed) */
  const PER_MIN = Math.max(5, +CFG.sendPerMinute || 50);
  const EV_MAX = Math.max(1, Math.floor(PER_MIN * 0.7));
  /* a thank-you code is posted a few seconds apart from any session piece, either way (CONTRACT.md, section 6) */
  const APART = 3000;
  let sentAt = [];
  async function flush(o = {}) {
    if (!ENDPOINT || flushing) return;
    if (navigator.onLine === false) return;
    const now = Date.now();
    if (!o.force && now < failUntil) { schedule(failUntil - now + 100); return; }
    flushing = true;
    try {
      const q = readQ();
      sentAt = sentAt.filter((t) => now - t.t < 60000);
      const budget = PER_MIN - sentAt.length;
      const evRoom = Math.max(0, EV_MAX - sentAt.filter((t) => t.ev).length);
      const ready = q.filter((x) => (!x.s || now - x.s > 20000) && !(x.u && x.due && x.due > now));
      const rank = (x) => (x.u ? 1 : x.p.kind === "event" ? 2 : 0);
      let evN = 0;
      const due = ready.sort((a, b) => rank(a) - rank(b) || (a.p.seq || 0) - (b.p.seq || 0)).filter((x) => (x.u || x.p.kind !== "event" || ++evN <= evRoom)).slice(0, Math.max(0, budget));
      /* more than the budget allows, or a thank-you code still waiting: try again as the minute frees up */
      if (ready.length > due.length) schedule(sentAt.length ? Math.max(2000, 60500 - (now - sentAt[0].t)) : 5000);
      const later = q.filter((x) => x.u && !x.s && x.due && x.due > now);
      if (later.length) schedule(Math.max(500, Math.min(...later.map((x) => x.due)) - now + 50));
      if (!due.length) return;
      let linked = due.filter((x) => !x.u), alone = due.filter((x) => x.u);
      /* a thank-you code that's due goes first: the session's pieces wait until it's out, so a steady run of events
         can't keep it waiting */
      if (alone.length) { linked = []; if (Date.now() - lastLinked < APART) { alone = []; schedule(APART - (Date.now() - lastLinked) + 100); } }
      if (linked.length && Date.now() - lastAlone < APART) { linked = []; schedule(APART - (Date.now() - lastAlone) + 100); }
      let ok = true;
      for (let i = 0; i < linked.length; i += 25) {
        const part = linked.slice(i, i + 25);
        if (await post(part.map((x) => x.p))) { lastLinked = Date.now(); part.forEach((x) => { x.s = Date.now(); sentAt.push({ t: x.s, ev: x.p.kind === "event" }); }); } else { ok = false; break; }
      }
      /* the thank-you code: alone, and never right behind a session piece */
      if (ok && alone.length && Date.now() - lastLinked >= APART) {
        for (const x of alone) { if (await post([x.p])) { x.s = Date.now(); lastAlone = x.s; sentAt.push({ t: x.s }); } else { ok = false; break; } }
      } else if (alone.length) schedule(APART + 100);
      /* write back only the marks, onto what's there now (another piece may have joined meanwhile) */
      const sent = new Map(due.filter((x) => x.s).map((x) => [key(x.p), x.s]));
      const q2 = readQ();
      q2.forEach((x) => { const k = key(x.p); if (sent.has(k)) x.s = sent.get(k); });
      writeQ(q2);
      /* a note of it, only for answers (an event about sending events would send itself for ever), at most once a
         minute with the count since the last, and a failure at most once a minute */
      flushedN += linked.filter((x) => x.p.kind !== "event" && x.s).length;
      if (ok && flushedN && Date.now() - lastFlushedEv > 60000) { lastFlushedEv = Date.now(); ev("net", "flushed", String(flushedN)); flushedN = 0; }
      if (!ok && Date.now() - lastFail > 60000) { lastFail = Date.now(); ev("net", "failed"); }
      setTimeout(ack, 1800);
    } finally { flushing = false; }
  }
  let flushedN = 0, lastFlushedEv = 0;
  const key = (p) => (p.sid ? `${p.sid}/${p.cid}/${p.seq}` : `u/${p.kind}/${p.token || p.n || ""}`);

  /* ---------- JSONP ---------- */
  let cbN = 0;
  function jsonp(params, ms = 8000) {
    return new Promise((resolve, reject) => {
      if (!ENDPOINT) { reject(new Error("no endpoint")); return; }
      const cb = `__fx${Date.now().toString(36)}${(cbN++).toString(36)}`;
      const s = document.createElement("script");
      let done = false;
      const end = (err, data) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        /* a late answer after the timeout lands on a no-op, never on a missing function */
        window[cb] = () => {};
        s.remove();
        if (err) reject(err); else resolve(data);
      };
      const t = setTimeout(() => end(new Error("timeout")), ms);
      window[cb] = (data) => end(null, data);
      s.onerror = () => end(new Error("load"));
      const q = new URLSearchParams(Object.assign({ study: studyId() }, params, { callback: cb }));
      s.src = ENDPOINT + (ENDPOINT.indexOf("?") >= 0 ? "&" : "?") + q.toString();
      s.async = true;
      (document.head || document.documentElement).appendChild(s);
    });
  }

  /* ---------- confirming receipt ---------- */
  let acking = false, lastAck = null, lastAckOk = 0;
  async function ack() {
    if (!ENDPOINT || acking) return;
    acking = true;
    try {
      const q = readQ();
      const pairs = [...new Set(q.filter((x) => !x.u && x.s).map((x) => `${x.p.sid}/${x.p.cid}`))];
      for (const pr of pairs) {
        const [sid, c] = pr.split("/");
        try {
          const r = await jsonp({ op: "ack", sid, cid: c });
          if (r && r.ok) {
            lastAck = r; lastAckOk = Date.now();
            const upto = +r.upto || 0;
            writeQ(readQ().filter((x) => x.u || !(x.p.sid === sid && x.p.cid === c && x.p.seq <= upto)));
            if (r.installed) emit("installed", true);
          }
        } catch (e) { /* offline or slow: next round */ }
      }
      for (const x of readQ().filter((y) => y.u && y.s)) {
        try {
          const r = x.p.kind === "token" ? await jsonp({ op: "token", t: x.p.token }) : await jsonp({ op: "followup", n: x.p.n });
          if (r && r.ok && r.have) writeQ(readQ().filter((y) => key(y.p) !== key(x.p)));
        } catch (e) { /* next round */ }
      }
    } finally { acking = false; }
  }
  /* everything this session answered, confirmed (the events may follow later): before the install steps, and at
     Submit. o.events and o.unlinked: the events and the thank-you code too (before Clear, so nothing is left behind). o.patient: while the script is answering
     (its last confirmation came in the last 15 seconds), keep waiting past ms, up to this long in all: the answers are
     held by the phone's own pace, not lost, and the minute frees up */
  async function settle(ms, o = {}) {
    const t0 = Date.now(), until = t0 + ms, hard = t0 + Math.max(ms, o.patient || 0);
    const left = () => { const s = session(); return readQ().filter((x) => (x.u ? !!o.unlinked : s && x.p.sid === s.sid && (o.events || x.p.kind !== "event"))).length; };
    const more = () => Date.now() < until || (Date.now() < hard && Date.now() - lastAckOk < 15000);
    /* is the script answering? (nothing of ours may be out to confirm while the phone's pace holds the rest back) */
    const reach = async () => { const s = session(); if (!s || !s.sid || Date.now() - lastAckOk < 10000) return; try { const r = await jsonp({ op: "ack", sid: s.sid, cid: cid("a") }, 6000); if (r && r.ok) lastAckOk = Date.now(); } catch (e) { /* not answering */ } };
    while (more()) {
      if (!left()) return true;
      await flush({ force: true });
      await new Promise((r) => setTimeout(r, 1600));
      await ack();
      if (o.patient) await reach();
      if (!left()) return true;
      await new Promise((r) => setTimeout(r, 900));
    }
    return !left();
  }
  const pending = () => { const s = session(); return qKeys().reduce((n, k) => n + (ls.get(k, []) || []).filter((x) => x && x.p && !x.u && (!s || x.p.sid === s.sid)).length, 0); };

  /* the heartbeat, and queues left by closed windows taken over */
  /* (the heartbeat writes only for a window with a session or a queue) */
  beat(); setInterval(beat, 10000);
  setTimeout(adopt, 2500); setInterval(adopt, 30000);
  /* the window in use owns the session (own()); another one hears it and goes quiet */
  const own = () => { passive = false; ls.set("owner", TAB()); };
  window.addEventListener("storage", (e) => {
    if (e.key !== `${P}owner` || !e.newValue) return;
    let o = null; try { o = JSON.parse(e.newValue); } catch (x) { o = null; }
    if (o && o !== TAB() && !passive) { passive = true; emit("passive", true); }
  });
  /* every 20 seconds, on every open, and when the phone is back online */
  setInterval(() => { flush(); }, 20000);
  setTimeout(() => { flush().then(() => setTimeout(ack, 2000)); }, 1500);
  window.addEventListener("online", () => { failUntil = 0; ev("net", "online"); schedule(500); });
  window.addEventListener("offline", () => ev("net", "offline"));
  /* hidden: whatever is due goes as a beacon too, since a page in the background may never run again. A thank-you code
     still waiting goes alone, in a beacon of its own, and nothing else goes with it then: a person who closes the page
     straight after Submit still gets their code to the recruiter's sheet, and it stays apart from the session's pieces
     (those were confirmed at Submit, and any left go on the next open) */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !ENDPOINT || !navigator.sendBeacon) return;
    const tok = readQ().filter((x) => x.u && !x.s);
    if (tok.length) {
      try {
        const sentU = tok.filter((x) => navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify({ v: 1, pieces: [x.p] })], { type: "text/plain;charset=utf-8" })));
        if (sentU.length) { lastAlone = Date.now(); const ks = new Set(sentU.map((x) => key(x.p))); const q2 = readQ(); q2.forEach((x) => { if (ks.has(key(x.p))) x.s = Date.now(); }); writeQ(q2); }
      } catch (e) { /* the next open sends it */ }
      return;
    }
    const now = Date.now(); sentAt = sentAt.filter((t) => now - t.t < 60000);
    const q = readQ(), due = q.filter((x) => !x.u && !x.s).sort((a, b) => (a.p.kind === "event") - (b.p.kind === "event")).slice(0, Math.max(0, Math.min(25, PER_MIN - sentAt.length)));
    if (!due.length) return;
    try {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify({ v: 1, pieces: due.map((x) => x.p) })], { type: "text/plain;charset=utf-8" }));
      if (ok) { lastLinked = Date.now(); const ks = new Set(due.map((x) => key(x.p))); const q2 = readQ(); q2.forEach((x) => { if (ks.has(key(x.p))) { x.s = Date.now(); sentAt.push({ t: x.s, ev: x.p.kind === "event" }); } }); writeQ(q2); }
    } catch (e) { /* the next open sends them */ }
  });

  /* ---------- listeners: the flow hears the queue and the installed app ---------- */
  const subs = {};
  function on(k, f) { (subs[k] = subs[k] || []).push(f); }
  function emit(k, v) { (subs[k] || []).forEach((f) => { try { f(v); } catch (e) { console.error(e); } }); }

  /* ---------- the decisions, as one line ---------- */
  const stateLine = (V, o = {}) => {
    if (!V) return "";
    const b = (x) => (x ? "on" : "off");
    return [`form=${V.form}`, `bmUI=${V.bmUI}`, `home=${V.home}`, `history=${V.history}`, `checkin=${b(V.checkin !== false)}`, `mealUI=${V.mealUI}`, `look=${V.look}`, `easy=${b(!!V.easy)}`, `onboard=${V.onboard}`, `weekCard=${o.week || window.FOCUS_WEEK || "built"}`, `plan=${V.plan}`, `data=${V.data}`, `meals=${V.meals}`, `persona=${V.persona}`].join(" ");
  };

  /* ---------- clearing ---------- */
  /* the session, the comments, the stored decisions and this tab's lanes go; the queue goes once it's empty (the flow
     sends and confirms what's left first), and what's still unsent stays only until it's confirmed */
  function clearAll() {
    qKeys().filter((k) => k !== qKey()).forEach((k) => { if (!(ls.get(k, []) || []).length) { ls.del(k); ls.del(`hb.${k.slice(6)}`); } });
    ["session", "comments", "flow", "test", "owner"].forEach(ls.del);
    try { Object.keys(localStorage).filter((k) => k.indexOf("florin-refresh:") === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* fine */ }
    if (!readQ().length) { ls.del(qKey()); ls.del(`hb.${TAB()}`); }
    try { ["lanes", "active", "cid", "seq", "cide", "seqe"].forEach((k) => sessionStorage.removeItem(P + k)); } catch (e) { /* fine */ }
  }

  const FX = window.FX = {
    isFX: true, CFG, BUILD, ENDPOINT, ls, ss, rand, code, env, standalone, dark, textReported, iso, studyId, isTest,
    setTest(on) { if (on) ls.set("test", true); else ls.del("test"); },
    session, patch, cid, send, ev, sendUnlinked, flush, ack, settle, pending, jsonp, scrub, alarm, ALARM_NOTE, LEAVE_OUT,
    on, emit, stateLine, clearAll, lastAck: () => lastAck, own, isPassive: () => passive,
    newSid: () => rand(24, B64),
    TAB,
    newId: (n = 8) => rand(n, LOWER),
    /* where the person is, for every piece's phase, and the app's screen, for every event */
    phase: "", screen: ""
  };
  /* STUDY and TEST read the stored flag each time */
  Object.defineProperty(FX, "STUDY", { get: studyId, enumerable: true });
  Object.defineProperty(FX, "TEST", { get: isTest, enumerable: true });
  window.addEventListener("error", (e) => {
    try {
      const f = String(e.filename || "").split("/").pop().split("?")[0];
      if (f) ev("error", "error", `${f}:${e.lineno || 0}`);
    } catch (x) { /* never throw from the error handler */ }
  });
})();
