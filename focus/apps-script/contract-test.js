/* The two halves of the contract, together: the participant app's own focus/js/focus.js builds pieces in a stand-in
   window, and its real queue is posted to Code.gs under the Apps Script stand-in. Every piece the app makes has to be
   accepted, and every JSONP call the app makes has to come back the way the app reads it.
     node focus/apps-script/contract-test.js
   It reads the app's files as they are now, so it shows at once when one side changes and the other doesn't. */
"use strict";
const assert = require("assert");
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { makeGas, loadScript } = require("./gas-stub.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* a window just big enough for focus.js: storage, crypto, a clock, timers that wait for us */
function makeWindow(cfg) {
  const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i], get length() { return m.size; }, _m: m }; };
  const local = store(), session = store();
  const timers = [];
  const listeners = {};
  const win = {
    FOCUS_CONFIG: cfg,
    localStorage: local, sessionStorage: session,
    crypto: { getRandomValues: (a) => crypto.randomFillSync(a) },
    navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1", onLine: true, maxTouchPoints: 5, platform: "iPhone", sendBeacon: () => true },
    location: { search: "", replace: () => {} },
    matchMedia: (q) => ({ matches: false, media: q }),
    setTimeout: (f, ms) => { timers.push(f); return timers.length; }, clearTimeout: () => {}, setInterval: () => 0,
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    document: { documentElement: { getAttribute: () => "flow" }, addEventListener: () => {}, createElement: () => ({ style: {}, remove() {} }), body: { appendChild() {} }, head: { appendChild() {} }, visibilityState: "visible" },
    console,
    _timers: timers,
  };
  win.window = win; win.parent = win; win.self = win;
  Object.keys(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(local))).forEach(() => {});
  win.Object = Object; win.Array = Array; win.JSON = JSON; win.Math = Math; win.Date = Date; win.String = String; win.Number = Number;
  win.Map = Map; win.Set = Set; win.Promise = Promise; win.Uint8Array = Uint8Array; win.URLSearchParams = URLSearchParams; win.RegExp = RegExp;
  return win;
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("every piece focus.js builds is accepted by Code.gs, and nothing it carries is refused", () => {
  const gas = makeGas();
  const gs = loadScript(gas);
  gs.setup();
  const cfgSrc = read("config.js");
  const cfgWin = {}; vm.runInNewContext(cfgSrc, { window: cfgWin });
  const cfg = Object.assign({}, cfgWin.FOCUS_CONFIG, { endpoint: "http://localhost/exec" });
  const win = makeWindow(cfg);
  vm.createContext(win);
  vm.runInContext(read("js/focus.js"), win, { filename: "focus.js" });
  const FX = win.FX;
  assert.ok(FX && FX.isFX, "focus.js made FX");
  assert.strictEqual(FX.STUDY, cfg.study);

  /* consent, then a piece of each kind as the flow and the app make them */
  FX.patch({ sid: FX.newSid(), consented: true });
  const code = FX.code.make();
  assert.ok(FX.code.ok(code) && gs.codeOk_(code), "the app's code passes the script's check");
  assert.strictEqual(gs.checkChar_(code.slice(0, 5)), code[5]);
  FX.phase = "intake";
  FX.send("session", { code, platform: FX.env.platform, os: FX.env.os, browser: FX.env.browser, width: 390, theme: "light", text_reported: "unknown", stage: "consent" });
  FX.send("answer", { section: "intake", task: "", qid: "IN1", question: "What would you most want from an app for your gut? Pick one.", answer: "I'm not sure yet", value: "unsure", correct: "", right: "", words: "", alarm_note: "no", skipped: "no" });
  FX.send("answer", { section: "intake", task: "", qid: "IN2", question: "What brings you to an app like this? Pick any that fit.", answer: "Something else", value: "other", correct: "", right: "", words: "my email is jo@example.com and my number 555 010 9999", alarm_note: "no", skipped: "no" });
  FX.phase = "bm";
  FX.ev("act", "tab", "today", "today");
  FX.ev("screen", "plus", "", "plus");
  FX.ev("view", "Your last 7 days", "", "today");
  FX.ev("depth", "today", "0.62", "today");
  FX.ev("set", "bmUI", "quick");
  FX.ev("flow", "task_start", "bm");
  FX.send("task", { task: "bm", n: 1, version: "standard", state: FX.stateLine({ form: "C", bmUI: "quick", home: "score", history: "calendar", checkin: true, mealUI: "quick", look: "built", easy: false, onboard: "short", plan: "member", data: "est", meals: "all", persona: "sarah" }, { week: "card" }), started_at: FX.iso(Date.now() - 50000), seconds: 50, active_seconds: 48, outcome: "seen", hint: "no", path: "plus tile | details no | undo no", screens: 3, backs: 0, ease: 6, chips: "Clear | Useful", checks: "" });
  FX.send("comment", { cmid: FX.newId(8), op: "add", phase: "bm", screen: "today", state: "form=C", target: "Your last 7 days", x: 0.41, y: 0.33, tx: 0.5, ty: 0.12, vw: 390, vh: 844, scroll: 120, cm_kind: "It's confusing | I have an idea", words: "Hard to read", alarm_note: "no", how: "double tap" });
  FX.sendUnlinked({ kind: "token", token: FX.rand(8, FX.code.ALPHA) });

  /* each tab or app window keeps its own queue, florin-focus:queue.<tab> */
  const qkeys = [...win.localStorage._m.keys()].filter((k) => k.indexOf("florin-focus:queue") === 0);
  assert.strictEqual(qkeys.length, 1, `one queue for this window (${qkeys.join(", ")})`);
  const queue = JSON.parse(win.localStorage.getItem(qkeys[0]));
  const linked = queue.filter((x) => !x.u).map((x) => x.p), alone = queue.filter((x) => x.u).map((x) => x.p);
  assert.strictEqual(linked.length, 11, `${linked.length} pieces queued: ${linked.map((p) => p.kind + ":" + (p.type || "")).join(",")}`);
  const r = JSON.parse(gs.doPost({ postData: { contents: JSON.stringify({ v: 1, pieces: linked }) } }).getContent());
  const log = gas.rowsOf("_log");
  assert.deepStrictEqual({ accepted: r.accepted, refused: r.refused }, { accepted: linked.length, refused: 0 }, `refused: ${JSON.stringify(log)}`);
  const r2 = JSON.parse(gs.doPost({ postData: { contents: JSON.stringify({ v: 1, pieces: alone }) } }).getContent());
  assert.strictEqual(r2.accepted, 1, "the thank-you code is taken");
  assert.ok(gas.rowsOf("Answers")[1].words.indexOf("example.com") < 0);
  assert.strictEqual(gas.rowsOf("Comments")[0].kind, "It's confusing | I have an idea");
  assert.strictEqual(gas.rowsOf("Sessions")[0].code, code);

  /* the JSONP replies, read the way focus.js reads them: ack's upto, and token's have */
  const sid = linked[0].sid, cid = linked[0].cid;
  const call = (params) => {
    const out = gs.doGet({ parameter: Object.assign({ study: FX.STUDY, callback: "__fx1" }, params) }).getContent();
    let got; vm.runInNewContext(out, { __fx1: (x) => { got = JSON.parse(JSON.stringify(x)); } }); return got;
  };
  /* two lanes: the answers' and the events', each confirmed up to its own count */
  const ack = call({ op: "ack", sid, cid });
  assert.strictEqual(ack.upto, linked.filter((p) => p.cid === cid).length);
  const ecid = linked.find((p) => p.kind === "event").cid;
  assert.notStrictEqual(ecid, cid);
  assert.strictEqual(call({ op: "ack", sid, cid: ecid }).upto, linked.filter((p) => p.kind === "event").length);
  assert.strictEqual(ack.installed, false);
  assert.deepStrictEqual(call({ op: "token", t: alone[0].token }), { ok: true, have: true });
  /* a new session in the same tab (Start again) numbers its lanes from 1, under new cids, so the script can confirm it */
  const sid1 = linked[0].sid;
  FX.ls.set("session", { sid: FX.newSid(), consented: true });
  FX.send("session", { stage: "consent" });
  FX.ev("flow", "consent");
  const q2 = JSON.parse(win.localStorage.getItem(qkeys[0])).map((x) => x.p).filter((p) => p.sid && p.sid !== sid1);
  assert.deepStrictEqual(q2.map((p) => p.seq), [1, 1], "both lanes of the new session start at 1");
  assert.ok(q2.every((p) => p.cid !== linked[0].cid && p.cid !== linked.find((x) => x.kind === "event").cid), "under new cids");
  const r3 = JSON.parse(gs.doPost({ postData: { contents: JSON.stringify({ v: 1, pieces: q2 }) } }).getContent());
  assert.strictEqual(r3.accepted, 2);
  q2.forEach((p) => assert.strictEqual(call({ op: "ack", sid: p.sid, cid: p.cid }).upto, 1));
  /* a phone number in a bracket, then a full stop: the bracket goes with it, the full stop stays */
  assert.strictEqual(FX.scrub("Call (555) 010-9999. Or 07700 900123, thanks"), "Call [removed]. Or [removed], thanks");
  test.note = `${linked.length} pieces from focus.js, all accepted; the app's build is "${linked[0].build}", its at ${linked[0].at}`;
});

test("the app's study code and the script's agree on every code, both ways", () => {
  const gas = makeGas();
  const gs = loadScript(gas);
  const win = makeWindow({ study: "florin-fg-1", endpoint: "" });
  vm.createContext(win);
  vm.runInContext(read("js/focus.js"), win, { filename: "focus.js" });
  const FX = win.FX;
  assert.strictEqual(FX.code.ALPHA, gs.CODE_ALPHABET, "one alphabet, in the same order");
  for (let i = 0; i < 3000; i++) {
    const c = FX.code.make();
    assert.ok(gs.codeOk_(c), c);
    const bad = c.slice(0, 2) + FX.code.ALPHA[(FX.code.ALPHA.indexOf(c[2]) + 1 + (i % 19)) % FX.code.ALPHA.length] + c.slice(3);
    assert.strictEqual(gs.codeOk_(bad), FX.code.ok(bad), bad);
  }
  assert.strictEqual(FX.code.norm("k7m 4px"), gs.normCode_("k7m 4px"));
});

let failed = 0;
for (const [name, fn] of tests) {
  try { test.note = ""; fn(); console.log(`ok    ${name}${test.note ? ` (${test.note})` : ""}`); }
  catch (err) { failed++; console.log(`FAIL  ${name}\n      ${String(err && err.stack || err).split("\n").slice(0, 8).join("\n      ")}`); }
}
console.log(failed ? `\n${failed} failed` : `\nall ${tests.length} passed`);
process.exit(failed ? 1 : 0);
