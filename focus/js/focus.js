/* Florin focus group test: the session, shared by both pages. window.FX
   - The flow (index.html) makes it; the app (app.html), framed by the flow, uses the flow's own FX, so there is one
     queue, one sequence and one comment composer per tab. app.html opened on its own makes its own.
   - A session: a long random id (sid), made at consent, and a short study code (5 random characters and a Luhn mod 21
     check character), which is only a lookup the script resolves to the sid. CONTRACT.md, section 5.
   - Every piece (an answer, a task, a comment, an event) carries sid, cid (this tab or app window) and seq, waits in
     localStorage, and is posted as JSON in text/plain with fetch mode no-cors, since the response can't be read. The
     script is then asked by JSONP what it holds, and the queue is cleared up to there. Retries every 20 seconds, on
     every open and when the phone comes back online.
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
  const TEST = !!ls.get("test", false);
  const STUDY = (CFG.study || "florin-fg") + (TEST ? "-test" : "");
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
  const patch = (o) => { const s = Object.assign(session() || {}, o); ls.set("session", s); return s; };
  /* this tab's or app window's id, and its piece numbers. A frame of the flow shares the flow's (one sessionStorage
     per tab) */
  function cid() { let c = ss.get("cid", null); if (!c) { c = rand(6, LOWER); ss.set("cid", c); ss.set("seq", 0); } return c; }
  function nextSeq() { cid(); const n = (ss.get("seq", 0) || 0) + 1; ss.set("seq", n); return n; }

  /* ---------- words ---------- */
  const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}/g;
  const PHONE = /(?:\+?\d[\s().-]{0,3}){7,}/g;
  const scrub = (t) => String(t == null ? "" : t).replace(EMAIL, "[removed]").replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 7 ? "[removed] " : m)).replace(/\s+$/, "").slice(0, 1000);
  /* the app's own alarm net (L.alarmsIn), never a second one: the note shows when it hears a sign */
  const alarm = (t) => {
    const L = window.FLORIN_LOGS;
    try { return !!(L && L.alarmsIn && String(t || "").trim() && L.alarmsIn(String(t)).length); } catch (e) { return false; }
  };
  const ALARM_NOTE = "If this is about you: blood in a BM, a black or tar-like BM, a fever, vomiting that won't stop, weight loss you can't explain, or waking at night to go are worth a clinician's look soon. Your primary care doctor is the right first stop. If there's a lot of blood, or you feel faint or dizzy, get urgent care now.";
  const LEAVE_OUT = "Please leave out anything you wouldn't want a research team to read.";

  /* ---------- the queue ---------- */
  const MAXQ = 1500;
  const readQ = () => { const q = ls.get("queue", []); return Array.isArray(q) ? q : []; };
  const writeQ = (q) => { if (!ls.set("queue", q.slice(-MAXQ))) ls.set("queue", q.slice(-200)); emit("queue", q.length); };
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
    const s = session();
    if (!s || !s.sid || !s.consented || s.cleared) return null;
    const f = FIELDS_KEEP(fields);
    /* the envelope always wins over a field of the same name; a piece may name its own phase */
    const p = Object.assign(f, { kind, study: STUDY, build: BUILD, sid: s.sid, cid: cid(), seq: nextSeq(), at: iso(), phase: f.phase != null ? f.phase : FX.phase || "", standalone: standalone() });
    ["words", "question", "answer", "target", "detail"].forEach((k) => { if (typeof p[k] === "string") p[k] = scrub(p[k]); });
    enqueue(p, o.soon);
    return p;
  }
  const ev = (type, name, detail, screen) => send("event", { type, name: String(name || "").slice(0, 60), detail: detail == null ? "" : String(detail).slice(0, 80), screen: screen || FX.screen || "" }, { soon: false });
  /* the unlinked pieces (the thank-you code, the follow-up contact): no sid, no seq, no time, each in a POST of its own */
  function sendUnlinked(p) { const q = readQ(); q.push({ p: Object.assign({ study: STUDY }, p), s: 0, u: 1 }); writeQ(q); schedule(4000 + Math.floor(Math.random() * 8000)); }

  let flushing = false;
  async function post(pieces) {
    const body = JSON.stringify({ v: 1, pieces });
    try {
      await fetch(ENDPOINT, { method: "POST", mode: "no-cors", cache: "no-store", credentials: "omit", keepalive: body.length < 60000, headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
      return true;
    } catch (e) { return false; }
  }
  async function flush() {
    if (!ENDPOINT || flushing) return;
    if (navigator.onLine === false) return;
    flushing = true;
    try {
      const now = Date.now(), q = readQ();
      const due = q.filter((x) => !x.s || now - x.s > 15000);
      if (!due.length) return;
      const linked = due.filter((x) => !x.u), alone = due.filter((x) => x.u);
      let ok = true;
      for (let i = 0; i < linked.length; i += 25) {
        const part = linked.slice(i, i + 25);
        if (await post(part.map((x) => x.p))) part.forEach((x) => (x.s = Date.now())); else { ok = false; break; }
      }
      for (const x of alone) { if (await post([x.p])) x.s = Date.now(); else ok = false; }
      /* write back only the marks, onto what's there now (another piece may have joined meanwhile) */
      const sent = new Map(due.filter((x) => x.s).map((x) => [key(x.p), x.s]));
      const q2 = readQ();
      q2.forEach((x) => { const k = key(x.p); if (sent.has(k)) x.s = sent.get(k); });
      writeQ(q2);
      if (ok) { if (linked.length) ev("net", "flushed", String(linked.length)); }
      setTimeout(ack, 1800);
    } finally { flushing = false; }
  }
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
      const q = new URLSearchParams(Object.assign({ study: STUDY }, params, { callback: cb }));
      s.src = ENDPOINT + (ENDPOINT.indexOf("?") >= 0 ? "&" : "?") + q.toString();
      s.async = true;
      (document.head || document.documentElement).appendChild(s);
    });
  }

  /* ---------- confirming receipt ---------- */
  let acking = false, lastAck = null;
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
            lastAck = r;
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
  /* everything this session sent, confirmed: before the install steps, and at Submit */
  async function settle(ms) {
    const until = Date.now() + ms;
    const left = () => { const s = session(); return readQ().filter((x) => !x.u && s && x.p.sid === s.sid).length; };
    while (Date.now() < until) {
      if (!left()) return true;
      await flush();
      await new Promise((r) => setTimeout(r, 1600));
      await ack();
      if (!left()) return true;
      await new Promise((r) => setTimeout(r, 900));
    }
    return !left();
  }
  const pending = () => { const s = session(); return readQ().filter((x) => !x.u && (!s || x.p.sid === s.sid)).length; };

  /* every 20 seconds, on every open, and when the phone is back online */
  setInterval(() => { flush(); }, 20000);
  setTimeout(() => { flush().then(() => setTimeout(ack, 2000)); }, 1500);
  window.addEventListener("online", () => { ev("net", "online"); schedule(500); });
  window.addEventListener("offline", () => ev("net", "offline"));
  /* hidden: whatever is due goes as a beacon too, since a page in the background may never run again */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !ENDPOINT || !navigator.sendBeacon) return;
    const q = readQ(), due = q.filter((x) => !x.u && !x.s).slice(0, 25);
    if (!due.length) return;
    try {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify({ v: 1, pieces: due.map((x) => x.p) })], { type: "text/plain;charset=utf-8" }));
      if (ok) { const ks = new Set(due.map((x) => key(x.p))); const q2 = readQ(); q2.forEach((x) => { if (ks.has(key(x.p))) x.s = Date.now(); }); writeQ(q2); }
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
  function clearAll() {
    const keep = readQ().filter((x) => x.u);
    ["session", "comments", "flow", "test"].forEach(ls.del);
    try { Object.keys(localStorage).filter((k) => k.indexOf("florin-refresh:") === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* fine */ }
    /* the queue goes once it's empty; what's still unsent stays only until it's confirmed */
    if (!readQ().filter((x) => !x.u).length && !keep.length) ls.del("queue");
    try { sessionStorage.removeItem(P + "cid"); sessionStorage.removeItem(P + "seq"); } catch (e) { /* fine */ }
  }

  const FX = window.FX = {
    isFX: true, CFG, BUILD, STUDY, TEST, ENDPOINT, ls, ss, rand, code, env, standalone, dark, textReported, iso,
    session, patch, cid, send, ev, sendUnlinked, flush, ack, settle, pending, jsonp, scrub, alarm, ALARM_NOTE, LEAVE_OUT,
    on, emit, stateLine, clearAll, lastAck: () => lastAck,
    newSid: () => rand(24, B64),
    newId: (n = 8) => rand(n, LOWER),
    /* where the person is, for every piece's phase, and the app's screen, for every event */
    phase: "", screen: ""
  };
  window.addEventListener("error", (e) => {
    try {
      const f = String(e.filename || "").split("/").pop().split("?")[0];
      if (f) ev("error", "error", `${f}:${e.lineno || 0}`);
    } catch (x) { /* never throw from the error handler */ }
  });
})();
