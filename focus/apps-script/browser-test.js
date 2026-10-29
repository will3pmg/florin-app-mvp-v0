/* The transport, in a real browser: a page on one origin posts to the local endpoint (focus/mock-endpoint.js, which
   runs Code.gs) on another, the way the participant app does: fetch with mode "no-cors" and text/plain, sendBeacon,
   and JSONP by script tag, following the 302 as Apps Script makes it. It also shows that a POST sent as
   application/json is stopped by the preflight, as it would be by Google.
     NODE_PATH=$(npm root -g) node focus/apps-script/browser-test.js
   On an emulated iPhone (390 by 844, touch, mobile Safari's user agent) and an Android phone (Pixel 7). */
"use strict";
const { chromium, devices } = require("playwright");
const http = require("http");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");

const EP_PORT = 8798, PAGE_PORT = 8797;
const EP = `http://localhost:${EP_PORT}/exec`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "florin-browser-test-"));

const page = `<!doctype html><meta charset="utf-8"><title>transport</title><script>
const EP = ${JSON.stringify(EP)}, STUDY = "florin-fg-1";
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const rid = (alpha, n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => alpha[b % alpha.length]).join("");
const sid = rid(A, 24), cid = rid("abcdefghijklmnopqrstuvwxyz0123456789", 6);
let seq = 0;
const at = () => new Date().toISOString().slice(0, 19) + "Z";
const env = (kind, f) => Object.assign({ kind, study: STUDY, build: "0.0.1", sid, cid, seq: ++seq, at: at(), phase: "intake", standalone: matchMedia("(display-mode: standalone)").matches }, f);
const jsonp = (params) => new Promise((resolve, reject) => {
  const cb = "cb" + rid("abcdefghij", 8);
  const s = document.createElement("script");
  const t = setTimeout(() => { delete window[cb]; s.remove(); reject(new Error("jsonp timeout")); }, 8000);
  window[cb] = (x) => { clearTimeout(t); delete window[cb]; s.remove(); resolve(x); };
  s.onerror = () => { clearTimeout(t); reject(new Error("jsonp error")); };
  s.src = EP + "?" + new URLSearchParams(Object.assign({ study: STUDY, callback: cb }, params));
  document.head.appendChild(s);
});
const post = (pieces) => fetch(EP, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ v: 1, pieces }) });
window.run = async () => {
  const out = {};
  const r1 = await post([env("event", { type: "flow", screen: "", name: "consent", detail: "" }), env("answer", { section: "intake", task: "", qid: "IN1", question: "What would you most want from an app for your gut? Pick one.", answer: "To see what tends to come before a rough day", value: "pattern", correct: "", right: "", words: "It’s fine \u{1F44D} call 555 123 4567", alarm_note: "no", skipped: "no" })]);
  out.postType = r1.type;                       // opaque: no-cors never shows the reply
  out.ack1 = await jsonp({ op: "ack", sid, cid });
  out.beacon = navigator.sendBeacon(EP, JSON.stringify({ v: 1, pieces: [env("event", { type: "vis", screen: "today", name: "hidden", detail: "" })] }));
  await new Promise((r) => setTimeout(r, 500));
  out.ack2 = await jsonp({ op: "ack", sid, cid });
  try {
    await fetch(EP, { method: "POST", mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ v: 1, pieces: [env("event", { type: "flow", screen: "", name: "resume", detail: "" })] }) });
    out.preflight = "went through";
  } catch (err) { out.preflight = "stopped"; }
  seq--;                                        // that piece never arrived, so its seq is free again
  const A21 = "ACDEFHJKMNPRTWXY34679";
  const chk = (p) => { const n = 21; let f = 2, s = 0; for (let i = 4; i >= 0; i--) { const a = f * A21.indexOf(p[i]); f = f === 2 ? 1 : 2; s += Math.floor(a / n) + (a % n); } return A21[(n - (s % n)) % n]; };
  const p5 = rid(A21, 5), code = p5 + chk(p5);
  out.claim = await jsonp({ op: "claim", sid, code, platform: /iPhone/.test(navigator.userAgent) ? "iphone" : "android", version: "standard", homes: "score,day", histories: "calendar,list", weeks: "card,strip", orders: "5" });
  out.lookup = await jsonp({ op: "lookup", code: code.slice(0, 3).toLowerCase() + " " + code.slice(3) });
  out.ping = await jsonp({ op: "ping" });
  out.sid = sid; out.code = code;
  return out;
};
</script><p>transport test</p>`;

function startPage() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(page); });
    s.listen(PAGE_PORT, () => resolve(s));
  });
}
function startEndpoint() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "mock-endpoint.js"), "--port", String(EP_PORT), "--dir", dir, "--fresh", "--quiet"], { stdio: ["ignore", "pipe", "inherit"] });
    child.stdout.on("data", (d) => { if (String(d).includes("/exec")) resolve(child); });
    child.on("exit", (code) => reject(new Error("endpoint exited " + code)));
  });
}
const rows = (tab) => new Promise((resolve) => http.get(`http://localhost:${EP_PORT}/__mock/rows/${tab}`, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(JSON.parse(b))); }));

(async () => {
  const ep = await startEndpoint();
  const srv = await startPage();
  const browser = await chromium.launch();
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"}  ${what}`); if (!ok) failed++; };
  try {
    for (const name of ["iPhone 13", "Pixel 7"]) {
      const ctx = await browser.newContext(Object.assign({}, devices[name], name.startsWith("iPhone") ? { viewport: { width: 390, height: 844 } } : {}));
      const pg = await ctx.newPage();
      const errors = [];
      pg.on("pageerror", (e) => errors.push(e.message));
      await pg.goto(`http://localhost:${PAGE_PORT}/`);
      const vp = pg.viewportSize();
      const out = await pg.evaluate(() => window.run());
      console.log(`\n${name} (${vp.width} by ${vp.height}, touch ${devices[name].hasTouch}):`);
      check(out.postType === "opaque", "a no-cors POST goes, and its reply can't be read (opaque)");
      check(out.ack1 && out.ack1.ok && out.ack1.upto === 2, `JSONP ack after the post: upto ${out.ack1 && out.ack1.upto}`);
      check(out.beacon === true && out.ack2.upto === 3, `sendBeacon is taken too: upto ${out.ack2.upto}`);
      check(out.preflight === "stopped", "a POST as application/json is stopped by the preflight, as Google would stop it");
      check(out.claim.ok && out.claim.code === out.code && ["score", "day"].includes(out.claim.home), `claim: ${JSON.stringify(out.claim)}`);
      check(out.lookup.ok && out.lookup.sid === out.sid, "lookup by the code, typed in lower case with a space, finds the session");
      check(out.ping.ok && out.ping.open === true, "ping");
      const answers = (await rows("Answers")).filter((r) => r.sid === out.sid);
      check(answers.length === 1 && answers[0].words === "It’s fine \u{1F44D} call [removed]", `the answer's words arrive whole, the phone number removed: ${answers[0] && answers[0].words}`);
      const events = (await rows("Events")).filter((r) => r.sid === out.sid);
      check(events.length === 2 && events.every((e) => e.at.endsWith("Z")), `two events (the preflighted one never arrived): ${events.length}`);
      const ses = (await rows("Sessions")).find((r) => r.sid === out.sid);
      check(ses && ses.code === out.code && ses.assigned === "script", "the sessions row has the code and the arms");
      check(errors.length === 0, `no errors on the page${errors.length ? ": " + errors.join("; ") : ""}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
    ep.kill();
  }
  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
