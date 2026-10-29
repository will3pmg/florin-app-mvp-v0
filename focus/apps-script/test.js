/* Tests for Code.gs, run in node under the Apps Script stand-in (gas-stub.js):
     node focus/apps-script/test.js
   Each test makes a fresh Sheet, runs setup(), and drives doPost and doGet the way the phone does: JSON as text in a
   POST body, JSONP for the GETs, evaluated as the script tag would. Besides what each test checks, every test checks
   that nothing was written outside the script lock, that no cell became a formula, and that no text cell would be read
   by Sheets as a number, a date or TRUE/FALSE. Exits 1 on any failure. */
"use strict";
const assert = require("assert");
const vm = require("vm");
const path = require("path");
const fs = require("fs");
const { makeGas, loadScript } = require("./gas-stub.js");

const STUDY = "florin-fg-1";
const A21 = "ACDEFHJKMNPRTWXY34679";
let clock = Date.UTC(2026, 10, 3, 15, 0, 0);       // Tuesday, November 3, 2026, 15:00 UTC
const iso = (t) => new Date(t).toISOString().slice(0, 19) + "Z";

const made = [];   // every stand-in a test makes, for the shared checks after it
function fresh(opts) {
  const g = makeGas(Object.assign({ now: () => clock }, opts || {}));
  made.push(g);
  const c = loadScript(g);
  c.setup();
  return { g, c };
}
const post = (c, pieces, raw) => JSON.parse(c.doPost({ postData: { contents: raw !== undefined ? raw : JSON.stringify({ v: 1, pieces }), type: "text/plain" } }).getContent());
function jsonp(c, params) {
  const out = c.doGet({ parameter: Object.assign({ callback: "cb", study: STUDY }, params) });
  assert.strictEqual(out.getMimeType(), "JAVASCRIPT");
  let got;
  vm.runInNewContext(out.getContent(), { cb: (x) => { got = JSON.parse(JSON.stringify(x)); } });
  return got;
}
const crypto = require("crypto");
const rand = (alpha, n) => { let s = ""; for (let i = 0; i < n; i++) s += alpha[crypto.randomInt(alpha.length)]; return s; };
const newSid = () => rand("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-", 24);
const newCid = () => rand("abcdefghijklmnopqrstuvwxyz0123456789", 6);
/* the code as CONTRACT.md section 5 spells it out, written apart from Code.gs */
function contractCheck(payload) {
  const n = 21; let factor = 2, sum = 0;
  for (let i = 4; i >= 0; i--) { const a = factor * A21.indexOf(payload[i]); factor = factor === 2 ? 1 : 2; sum += Math.floor(a / n) + (a % n); }
  return A21[(n - (sum % n)) % n];
}
function contractOk(code) {
  const n = 21; let factor = 1, sum = 0;
  for (let i = code.length - 1; i >= 0; i--) { const a = factor * A21.indexOf(code[i]); factor = factor === 2 ? 1 : 2; sum += Math.floor(a / n) + (a % n); }
  return sum % n === 0;
}
const newCode = () => { const p = rand(A21, 5); return p + contractCheck(p); };

/* one session's pieces, numbered as the phone numbers them */
function session(over) {
  const s = Object.assign({ sid: newSid(), cid: newCid(), seq: 0, phase: "intake" }, over || {});
  s.piece = (kind, fields, env) => Object.assign({ kind, study: STUDY, build: "0.3.1", sid: s.sid, cid: s.cid, seq: ++s.seq, at: iso(clock), phase: s.phase, standalone: false }, env || {}, fields || {});
  return s;
}
const answer = (s, qid, extra) => s.piece("answer", Object.assign({ section: "intake", task: "", qid, question: "Your age range", answer: "35 to 44", value: "35to44", correct: "", right: "", words: "", alarm_note: "no", skipped: "no" }, extra || {}));
const event = (s, type, name, extra) => s.piece("event", Object.assign({ type, screen: "today", name, detail: "" }, extra || {}));

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ------------------------------------------------------------------ setup and the GETs */

test("setup makes the tabs, the headers, the README and the recruiter's spreadsheet, and can run again", () => {
  const { g, c } = fresh();
  const names = g.book().getSheets().map((s) => s.getName());
  assert.deepStrictEqual(names, ["README", "Sessions", "Answers", "Tasks", "Comments", "Events", "_index", "_log"]);
  assert.ok(g.book().getSheetByName("_index").isSheetHidden() && g.book().getSheetByName("_log").isSheetHidden());
  const head = g.book().getSheetByName("Answers").getRange(1, 1, 1, 18).getValues()[0];
  assert.deepStrictEqual(head.slice(0, 7), ["received", "sid", "cid", "seq", "at", "study", "build"]);
  assert.ok(head.includes("qid") && head.includes("alarm_note"));
  const rid = g.props.RECRUITER_SHEET_ID;
  assert.ok(rid && rid !== g.activeId, "the recruiter's spreadsheet is a separate one");
  assert.deepStrictEqual(g.book(rid).getSheets().map((s) => s.getName()), ["tokens", "followup"]);
  const readme = g.rowsOf("README");
  assert.ok(g.book().getSheetByName("README").getRange(2, 1).getValue() === "Prototype only. Not for patients.");
  c.setup();
  assert.strictEqual(g.book().getSheets().length, 8);
  assert.strictEqual(g.props.RECRUITER_SHEET_ID, rid, "a second run keeps the same recruiter's spreadsheet");
  void readme;
});

test("setup on a standalone script makes a Sheet and keeps its id in SHEET_ID", () => {
  const g = makeGas({ bound: false, now: () => clock });
  made.push(g);
  const c = loadScript(g);
  c.setup();
  assert.ok(g.props.SHEET_ID);
  assert.ok(g.book(g.props.SHEET_ID).getSheetByName("Sessions"));
  const s = session();
  const r = post(c, [s.piece("session", { platform: "iphone" })]);
  assert.strictEqual(r.accepted, 1);
  assert.strictEqual(g.rowsOf("Sessions", g.props.SHEET_ID).length, 1);
});

test("GETs: the plain check, ping, a bad callback, an unknown study, a test study", () => {
  const { c } = fresh();
  const plain = c.doGet({ parameter: {} });
  assert.strictEqual(plain.getMimeType(), "TEXT");
  assert.strictEqual(plain.getContent(), "The Florin focus group endpoint is running.");
  assert.deepStrictEqual(jsonp(c, { op: "ping" }), { ok: true, open: true });
  const txt = c.doGet({ parameter: { op: "ping", study: STUDY, callback: "cb" } }).getContent();
  assert.ok(/^\/\*\*\/cb\(\{.*\}\);$/.test(txt), txt);
  for (const bad of ["alert(1)//", "a.b", "1abc", "x".repeat(65), ""]) {
    const out = c.doGet({ parameter: { op: "ping", study: STUDY, callback: bad } });
    assert.strictEqual(out.getContent(), "/* bad callback */", bad);
    assert.strictEqual(out.getMimeType(), "JAVASCRIPT");
  }
  assert.deepStrictEqual(jsonp(c, { op: "ping", study: "someone-else" }), { ok: false, error: "unknown_study" });
  assert.deepStrictEqual(jsonp(c, { op: "ping", study: STUDY + "-test" }), { ok: true, open: true });
  assert.deepStrictEqual(jsonp(c, { op: "nope" }), { ok: false, error: "bad_request" });
  const json = c.doGet({ parameter: { op: "ping", study: STUDY } });
  assert.strictEqual(json.getMimeType(), "JSON");
  assert.deepStrictEqual(JSON.parse(json.getContent()), { ok: true, open: true });
});

test("the study code: Code.gs and the contract's algorithm agree; how many one-character slips and swaps the check misses", () => {
  const { c } = fresh();
  assert.strictEqual(c.CODE_ALPHABET, A21, "the alphabet is the contract's");
  let slips = 0, slipsMissed = 0, swaps = 0, swapsMissed = 0;
  for (let k = 0; k < 2000; k++) {
    const p = rand(A21, 5);
    assert.strictEqual(c.checkChar_(p), contractCheck(p));
    const code = p + c.checkChar_(p);
    assert.ok(c.codeOk_(code) && contractOk(code));
    for (let i = 0; i < 6; i++) for (const ch of A21) {
      if (ch === code[i]) continue;
      slips++;
      if (c.codeOk_(code.slice(0, i) + ch + code.slice(i + 1))) slipsMissed++;
    }
    for (let i = 0; i < 5; i++) {
      if (code[i] === code[i + 1]) continue;
      swaps++;
      if (c.codeOk_(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2))) swapsMissed++;
    }
  }
  /* Luhn mod n catches every one-character slip only when n is even: with 21 characters, 10 pairs (C and R, D and T,
     and so on) look the same to it in the doubled places. See the back end asks in CONTRACT.md. */
  if (A21.length % 2 === 0) assert.strictEqual(slipsMissed, 0);
  else assert.ok(slipsMissed > 0 && slipsMissed / slips < 0.03, `${slipsMissed} of ${slips}`);
  assert.ok(swapsMissed / swaps < 0.02, `swaps missed ${swapsMissed} of ${swaps}`);
  test.note = `slips missed ${(100 * slipsMissed / slips).toFixed(1)}%, swaps missed ${(100 * swapsMissed / swaps).toFixed(1)}%`;
  assert.ok(c.codeOk_(c.normCode_(" k7m 4px ".replace("k7m 4p", "k7m4p"))) === c.codeOk_("K7M4PX"));
  assert.ok(!c.codeOk_("K7M4P0"), "0 isn't in the alphabet");
});

/* ------------------------------------------------------------------ pieces and rows */

test("a session's pieces land on their tabs, by header name, with received as a date and text kept as text", () => {
  const { g, c } = fresh();
  const s = session();
  const code = newCode();
  const r = post(c, [
    s.piece("session", { code, platform: "iphone", os: "26", browser: "safari", width: 390, theme: "light", text_reported: "standard", stage: "consent" }),
    answer(s, "IN7"),
    s.piece("task", { task: "bm", n: 1, version: "standard", state: "form=C bmUI=quick", started_at: iso(clock - 60000), seconds: 48, active_seconds: 45, outcome: "seen", hint: "no", path: "plus tile | details no | undo no", screens: 3, backs: 0, ease: 6, chips: "Clear | Useful", checks: "" }, { phase: "bm" }),
    s.piece("comment", { cmid: "ab12cd34", op: "add", screen: "today", state: "form=C", target: "Your last 7 days", x: 0.5, y: 0.31, tx: 0.2, ty: 0.75, vw: 390, vh: 844, scroll: 120, cm_kind: "I like it | I have an idea", words: "Clear enough", alarm_note: "no", how: "double tap" }, { phase: "week" }),
    event(s, "screen", "plus"),
    event(s, "act", "save-bm", { detail: "tile" }),
  ]);
  assert.deepStrictEqual([r.accepted, r.duplicate, r.refused], [6, 0, 0], JSON.stringify(r));
  const ses = g.rowsOf("Sessions")[0];
  assert.strictEqual(ses.sid, s.sid);
  assert.strictEqual(ses.code, code);
  assert.strictEqual(ses.os, "26", "the os stays text");
  assert.strictEqual(ses.installed, "no");
  assert.strictEqual(ses.first_at, iso(clock));
  const a = g.rowsOf("Answers")[0];
  assert.ok(a.received instanceof Date);
  assert.strictEqual(a.at, iso(clock));
  assert.strictEqual(a.seq, 2);
  assert.strictEqual(a.qid, "IN7");
  const t = g.rowsOf("Tasks")[0];
  assert.strictEqual(t.path, "plus tile | details no | undo no");
  assert.strictEqual(t.ease, 6);
  const cm = g.rowsOf("Comments")[0];
  assert.strictEqual(cm.kind, "I like it | I have an idea", "cm_kind goes to the kind column");
  assert.strictEqual(cm.phase, "week");
  assert.strictEqual(cm.x, 0.5);
  assert.strictEqual(g.rowsOf("Events").length, 2);
  assert.strictEqual(g.rowsOf("Events")[1].detail, "tile");
});

test("a repeated post writes nothing twice, out-of-order seqs are kept, and ack says what's held", () => {
  const { g, c } = fresh();
  const s = session();
  const p1 = answer(s, "IN1"), p2 = answer(s, "IN2"), p3 = answer(s, "IN3"), p4 = answer(s, "IN4");
  let r = post(c, [p3, p1]);
  assert.strictEqual(r.accepted, 2);
  let ack = jsonp(c, { op: "ack", sid: s.sid, cid: s.cid });
  assert.strictEqual(ack.ok, true);
  assert.strictEqual(ack.upto, 1, "2 is missing, so upto stops at 1");
  assert.strictEqual(ack.have, "1,3");
  r = post(c, [p1, p2, p3]);
  assert.deepStrictEqual([r.accepted, r.duplicate], [1, 2]);
  ack = jsonp(c, { op: "ack", sid: s.sid, cid: s.cid });
  assert.strictEqual(ack.upto, 3);
  assert.strictEqual(ack.installed, false);
  post(c, [p4, p4, p4]);
  assert.strictEqual(g.rowsOf("Answers").length, 4, "the same piece three times in one post is kept once");
  assert.deepStrictEqual(g.rowsOf("Answers").map((x) => x.qid), ["IN3", "IN1", "IN2", "IN4"]);
  /* a second tab of the same session counts its own seqs */
  const t2 = Object.assign({}, s, { cid: newCid(), seq: 0 });
  t2.piece = session({ sid: s.sid, cid: t2.cid }).piece;
  post(c, [answer(t2, "IN5")]);
  assert.strictEqual(jsonp(c, { op: "ack", sid: s.sid, cid: t2.cid }).upto, 1);
  assert.strictEqual(jsonp(c, { op: "ack", sid: s.sid, cid: s.cid }).upto, 4);
  assert.deepStrictEqual(jsonp(c, { op: "ack", sid: "short", cid: s.cid }), { ok: false, error: "bad_request" });
  assert.strictEqual(jsonp(c, { op: "ack", sid: newSid(), cid: newCid() }).upto, 0);
});

test("each piece is checked on its own: a bad one is refused and logged by reason and field, the rest are kept", () => {
  const { g, c } = fresh();
  const s = session();
  const ok = answer(s, "IN1");
  const bad = [
    Object.assign(answer(s, "IN2"), { study: "other-study" }),
    Object.assign(answer(s, "IN2"), { sid: "too-short" }),
    Object.assign(answer(s, "IN2"), { cid: "ABCDEF" }),
    Object.assign(answer(s, "IN2"), { seq: 0 }),
    Object.assign(answer(s, "IN2"), { seq: 2.5 }),
    Object.assign(answer(s, "IN2"), { at: "2026-11-03T15:00:00.123Z" }),
    Object.assign(answer(s, "IN2"), { at: "2026-13-45T25:61:00Z" }),
    Object.assign(answer(s, "IN2"), { at: iso(clock + 400 * 86400000) }),
    Object.assign(answer(s, "IN2"), { kind: "secret" }),
    Object.assign(answer(s, "IN2"), { qid: "IN99" }),
    Object.assign(answer(s, "IN2"), { phase: "elsewhere" }),
    Object.assign(answer(s, "IN2"), { skipped: true }),
    event(s, "screen", "not-a-screen"),
    event(s, "act", "delete-everything"),
    event(s, "flow", "consent", { screen: "nowhere" }),
    event(s, "view", "<img src=x>"),
    s.piece("task", { task: "bm", path: "plus tile | teleport" }),
    s.piece("task", { task: "bm", ease: 9 }),
    s.piece("comment", { cmid: "ab12cd34", op: "add", screen: "today", cm_kind: "I hate it" }),
    s.piece("session", { platform: "windows" }),
    s.piece("session", { code: "K7M4P0" }),
    Object.assign(answer(s, "IN2"), { standalone: "yes" }),
    "a string",
    [1, 2],
  ];
  const r = post(c, [ok].concat(bad));
  assert.strictEqual(r.accepted, 1);
  assert.strictEqual(r.refused, bad.length);
  assert.strictEqual(g.rowsOf("Answers").length, 1);
  const log = g.rowsOf("_log");
  assert.strictEqual(log.length, bad.length);
  assert.ok(log.some((l) => l.what === "field" && l.field === "qid"));
  assert.ok(log.some((l) => l.what === "field" && l.field === "name"));
  assert.ok(log.some((l) => l.what === "field" && l.field === "path"));
  assert.ok(log.some((l) => l.what === "study"));
  const all = JSON.stringify(g.dump());
  assert.ok(!all.includes("<img") && !all.includes("teleport") && !all.includes("I hate it"), "a refused value is never stored");
});

test("blank values the app sends are taken: a box left empty, a comment with no state, a skipped question", () => {
  const { g, c } = fresh();
  const s = session();
  const r = post(c, [
    answer(s, "TW", { section: "tour", value: "", answer: "", words: "" }),
    answer(s, "IN3", { value: "", answer: "", skipped: "yes" }),
    s.piece("comment", { cmid: "bl12cd34", op: "add", screen: "today", state: "", target: "", x: "", y: "", tx: "", ty: "", vw: 390, vh: 844, scroll: 0, cm_kind: "", words: "", alarm_note: "no", how: "button" }),
    s.piece("task", { task: "time", path: "", chips: "", checks: "", ease: "" }),
    event(s, "flow", "task_start", { screen: "", detail: "" }),
    s.piece("session", { os: "", segment: "", version_picked: "", home: "", week: "" }),
  ]);
  assert.strictEqual(r.accepted, 6, JSON.stringify(g.rowsOf("_log")));
});

test("a phone whose clock is days out still gets its pieces in, with its own at", () => {
  const { g, c } = fresh();
  const s = session();
  const ahead = iso(clock + 10 * 86400000), behind = iso(Date.UTC(2019, 0, 1));
  assert.strictEqual(post(c, [answer(s, "IN1", {}, { at: ahead }), answer(s, "IN2", {}, { at: behind })].map((p, i) => Object.assign(p, { at: i ? behind : ahead }))).accepted, 2);
  assert.deepStrictEqual(g.rowsOf("Answers").map((r) => r.at), [ahead, behind]);
});

test("unknown fields are dropped, long words are cut, emails and phone numbers are removed, formulas stay text", () => {
  const { g, c } = fresh();
  const s = session();
  const words = "Email me at jane.doe@example.com or call (555) 123-4567, or +1 555 987 6543. I log at 7:30, 3 to 4 times. =HYPERLINK(\"http://x\")";
  post(c, [
    answer(s, "LS1", { section: "exit", words, question: "Anything else? call 555-123-4567", answer: "=1+1", ip: "1.2.3.4", userAgent: "Mozilla" }),
    answer(s, "MS1", { words: "x".repeat(1500) }),
    s.piece("comment", { cmid: "zz12cd34", op: "add", screen: "today", target: "Card for bob@example.org", how: "button" }),
  ]);
  const [a, b] = g.rowsOf("Answers");
  assert.ok(!("ip" in a) && !JSON.stringify(g.dump()).includes("1.2.3.4") && !JSON.stringify(g.dump()).includes("Mozilla"));
  assert.ok(!a.words.includes("example.com") && !a.words.includes("123-4567") && !a.words.includes("987 6543"), a.words);
  assert.ok(a.words.includes("7:30") && a.words.includes("3 to 4"), "times and small figures stay");
  assert.strictEqual(a.question, "Anything else? call [removed]");
  assert.strictEqual(a.answer, "=1+1", "kept as the text it was");
  assert.strictEqual(b.words.length, 1000);
  assert.strictEqual(g.rowsOf("Comments")[0].target, "Card for [removed]");
  assert.deepStrictEqual(g.log.formulas, [], "nothing became a formula");
});

test("a fraction where a whole number is asked is rounded, and an event's name and detail over their length are cut", () => {
  const { g, c } = fresh();
  const s = session();
  const r = post(c, [
    s.piece("comment", { cmid: "rr12cd34", op: "add", screen: "today", target: "T".repeat(120), vw: 390.4, vh: 843.6, scroll: 120.5, x: 0.4567, how: "button" }),
    event(s, "view", "A card with a long title that goes on " + "and on ".repeat(5), { detail: "d".repeat(100) }),
    s.piece("task", { task: "bm", seconds: 12.7, ease: 5.2 }),
  ]);
  assert.strictEqual(r.accepted, 3, JSON.stringify(g.rowsOf("_log")));
  const cm = g.rowsOf("Comments")[0];
  assert.deepStrictEqual([cm.vw, cm.vh, cm.scroll, cm.x, cm.target.length], [390, 844, 121, 0.46, 80]);
  const ev = g.rowsOf("Events")[0];
  assert.deepStrictEqual([ev.name.length, ev.detail.length], [60, 80]);
  assert.deepStrictEqual([g.rowsOf("Tasks")[0].seconds, g.rowsOf("Tasks")[0].ease], [13, 5]);
});

test("a body that isn't JSON, has no pieces, or is too big is refused whole; piece 26 and on are refused one by one", () => {
  const { g, c } = fresh();
  assert.deepStrictEqual(post(c, null, "not json"), { ok: false, error: "bad_request" });
  assert.deepStrictEqual(post(c, null, JSON.stringify({ v: 1 })), { ok: false, error: "bad_request" });
  assert.deepStrictEqual(post(c, null, ""), { ok: false, error: "bad_request" });
  assert.deepStrictEqual(post(c, null, JSON.stringify({ v: 1, pieces: [], pad: "x".repeat(200001) })), { ok: false, error: "bad_request" });
  const s = session();
  const many = [];
  for (let i = 0; i < 30; i++) many.push(event(s, "vis", i % 2 ? "hidden" : "visible"));
  const r = post(c, many);
  assert.deepStrictEqual([r.accepted, r.refused], [25, 5]);
  assert.strictEqual(jsonp(c, { op: "ack", sid: s.sid, cid: s.cid }).upto, 25);
  const again = post(c, many.slice(25));
  assert.strictEqual(again.accepted, 5);
  assert.strictEqual(g.rowsOf("Events").length, 30);
  assert.ok(g.rowsOf("_log").some((l) => l.what === "too_many"));
});

test("a session is limited to 60 new pieces a minute and 1,500 in all; held-back pieces arrive on a later retry", () => {
  const { g, c } = fresh();
  const s = session();
  const ps = [];
  for (let i = 0; i < 70; i++) ps.push(event(s, "vis", "visible"));
  let acc = 0;
  for (let i = 0; i < 70; i += 25) acc += post(c, ps.slice(i, i + 25)).accepted;
  assert.strictEqual(acc, 60);
  let ack = jsonp(c, { op: "ack", sid: s.sid, cid: s.cid });
  assert.strictEqual(ack.upto, 60);
  assert.strictEqual(ack.limit, "minute");
  clock += 60000;
  assert.strictEqual(post(c, ps.slice(60)).accepted, 10);
  ack = jsonp(c, { op: "ack", sid: s.sid, cid: s.cid });
  assert.strictEqual(ack.upto, 70);
  assert.strictEqual(ack.limit, undefined);
  /* to 1,500: 60 a minute */
  let sent = 70;
  while (sent < 1520) {
    clock += 60000;
    const batch = [];
    for (let i = 0; i < 60; i++) batch.push(event(s, "vis", "visible"));
    sent += 60;
    post(c, batch.slice(0, 25)); post(c, batch.slice(25, 50)); post(c, batch.slice(50));
  }
  ack = jsonp(c, { op: "ack", sid: s.sid, cid: s.cid });
  assert.strictEqual(ack.upto, 1500);
  assert.strictEqual(ack.limit, "session");
  assert.strictEqual(g.rowsOf("Events").length, 1500);
  /* another session is not held back by this one */
  const t = session();
  assert.strictEqual(post(c, [event(t, "vis", "visible")]).accepted, 1);
});

test("the sessions row: fields overwrite only what they carry, the stage keeps the furthest, the times and installed are worked out", () => {
  const { g, c } = fresh();
  const s = session();
  const t0 = clock;
  post(c, [s.piece("session", { stage: "consent", platform: "android", browser: "chrome", theme: "dark" })]);
  clock += 120000;
  post(c, [s.piece("session", { stage: "tour", segment: "pattern" })]);
  let row = g.rowsOf("Sessions")[0];
  assert.deepStrictEqual([row.stage, row.platform, row.theme, row.segment], ["tour", "android", "dark", "pattern"]);
  clock += 60000;
  post(c, [s.piece("session", { stage: "intake" })]);
  assert.strictEqual(g.rowsOf("Sessions")[0].stage, "tour", "a stage never moves back");
  post(c, [s.piece("session", { stage: "stopped" })]);
  post(c, [s.piece("session", { stage: "exit" })]);
  assert.strictEqual(g.rowsOf("Sessions")[0].stage, "stopped", "stopped wins over every stage but done");
  post(c, [s.piece("session", { stage: "done", submitted: "yes", sus: 72.5, minutes: 31.4, active_minutes: 29.0, tasks_seen: 8, comments: 3 })]);
  post(c, [s.piece("session", { stage: "stopped" })]);
  row = g.rowsOf("Sessions")[0];
  /* minutes, tasks_seen and comments are the script's own count, whatever the phone says: 3 minutes from the first
     piece to Submit, no task rows and no comments here */
  assert.deepStrictEqual([row.stage, row.submitted, row.sus, row.minutes, row.tasks_seen, row.comments, row.active_minutes], ["done", "yes", 72.5, 3, 0, 0, 29]);
  /* an earlier piece arriving late moves first_at back */
  post(c, [s.piece("answer", { section: "intake", qid: "IN1", value: "pattern", answer: "x", skipped: "no", alarm_note: "no" }, { at: iso(t0 - 30000) })]);
  row = g.rowsOf("Sessions")[0];
  assert.strictEqual(row.first_at, iso(t0 - 30000));
  assert.strictEqual(row.last_at, iso(clock));
  assert.strictEqual(row.installed, "no");
  post(c, [event(s, "install", "standalone", { screen: "today" }, { standalone: true })].map((p) => Object.assign(p, { standalone: true })));
  row = g.rowsOf("Sessions")[0];
  assert.strictEqual(row.installed, "yes");
  assert.strictEqual(jsonp(c, { op: "ack", sid: s.sid, cid: s.cid }).installed, true);
  assert.strictEqual(g.rowsOf("Sessions").length, 1);
});

test("a session piece's code that another session holds isn't written", () => {
  const { g, c } = fresh();
  const s = session(), t = session(), code = newCode();
  post(c, [s.piece("session", { code })]);
  post(c, [t.piece("session", { code, platform: "iphone" })]);
  const rows = g.rowsOf("Sessions");
  assert.strictEqual(rows.find((r) => r.sid === s.sid).code, code);
  assert.strictEqual(rows.find((r) => r.sid === t.sid).code, "");
  assert.strictEqual(rows.find((r) => r.sid === t.sid).platform, "iphone", "the rest of the piece is kept");
  assert.ok(g.rowsOf("_log").some((l) => l.what === "code_taken"));
});

/* ------------------------------------------------------------------ claim, lookup */

const claimQ = (sid, code, over) => Object.assign({ op: "claim", sid, code, platform: "iphone", version: "standard", homes: "score,day", histories: "calendar,list", weeks: "card,strip", orders: "5" }, over || {});

test("claim takes a code once, gives the same sid back what it holds, and refuses a taken or broken code", () => {
  const { g, c } = fresh();
  const s = session(), code = newCode();
  const r = jsonp(c, claimQ(s.sid, code));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.code, code);
  assert.ok(["score", "day"].includes(r.home) && ["calendar", "list"].includes(r.history) && ["card", "strip"].includes(r.week));
  assert.ok(r.order >= 1 && r.order <= 5);
  const again = jsonp(c, claimQ(s.sid, newCode()));
  assert.deepStrictEqual(again, r, "a retry with a new code gets the first code and arms");
  const t = session();
  assert.deepStrictEqual(jsonp(c, claimQ(t.sid, code)), { ok: false, error: "code_taken" });
  assert.deepStrictEqual(jsonp(c, claimQ(t.sid, code.slice(0, 5) + (code[5] === "A" ? "C" : "A"))), { ok: false, error: "bad_code" });
  assert.deepStrictEqual(jsonp(c, claimQ("x", newCode())), { ok: false, error: "bad_request" });
  const row = g.rowsOf("Sessions").find((x) => x.sid === s.sid);
  assert.deepStrictEqual([row.code, row.platform, row.assigned, row.home, row.order], [code, "iphone", "script", r.home, r.order]);
  /* the session piece that follows doesn't undo the claim */
  post(c, [s.piece("session", { stage: "tour", version: "standard" })]);
  assert.strictEqual(g.rowsOf("Sessions").find((x) => x.sid === s.sid).code, code);
  assert.strictEqual(g.rowsOf("Sessions").length, 1);
});

test("claim balances the arms per platform: each block of 4 sees every option twice, crossed, and each block of 5 every order", () => {
  const { c } = fresh();
  const by = { iphone: [], android: [] };
  for (const plat of ["iphone", "android", "other"]) {
    for (let i = 0; i < (plat === "other" ? 4 : 8); i++) {
      const r = jsonp(c, claimQ(newSid(), newCode(), { platform: plat }));
      by[plat === "iphone" ? "iphone" : "android"].push(r);
    }
  }
  for (const plat of ["iphone", "android"]) {
    const list = by[plat];
    for (let b = 0; b + 4 <= list.length; b += 4) {
      const blk = list.slice(b, b + 4);
      const count = (k, v) => blk.filter((r) => r[k] === v).length;
      for (const [k, v] of [["home", "score"], ["home", "day"], ["history", "calendar"], ["history", "list"], ["week", "card"], ["week", "strip"]]) {
        assert.strictEqual(count(k, v), 2, `${plat} block ${b / 4}: ${k}=${v}`);
      }
      const pairs = new Set(blk.map((r) => r.home + "/" + r.history));
      assert.strictEqual(pairs.size, 4, "Home and History cross: each pair once in a block of 4");
      const pairs2 = new Set(blk.map((r) => r.home + "/" + r.week));
      assert.strictEqual(pairs2.size, 4, "Home and the week card cross");
    }
  }
  /* order: 10 iPhone sessions in all (8 above + 2 more) make two blocks of 5 */
  for (let i = 0; i < 2; i++) by.iphone.push(jsonp(c, claimQ(newSid(), newCode())));
  for (let b = 0; b < 10; b += 5) {
    const orders = by.iphone.slice(b, b + 5).map((r) => r.order).sort();
    assert.deepStrictEqual(orders, [1, 2, 3, 4, 5]);
  }
});

test("claim for Easy gives no Home and no week card, and keeps History balanced in its own blocks; test runs count apart", () => {
  const { g, c } = fresh();
  const easy = [];
  for (let i = 0; i < 6; i++) easy.push(jsonp(c, claimQ(newSid(), newCode(), { version: "easy" })));
  assert.ok(easy.every((r) => r.home === "" && r.week === ""));
  for (let b = 0; b < 6; b += 2) assert.deepStrictEqual(easy.slice(b, b + 2).map((r) => r.history).sort(), ["calendar", "list"]);
  /* the standard blocks weren't touched by the Easy sessions */
  const std = [];
  for (let i = 0; i < 4; i++) std.push(jsonp(c, claimQ(newSid(), newCode())));
  assert.strictEqual(std.filter((r) => r.home === "score").length, 2);
  /* -test sessions draw from their own counters */
  const keys = Object.keys(g.props).filter((k) => k.startsWith("arms|"));
  jsonp(c, claimQ(newSid(), newCode(), { study: STUDY + "-test" }));
  const testKeys = Object.keys(g.props).filter((k) => k.startsWith("arms|" + STUDY + "-test|"));
  assert.ok(testKeys.length > 0 && keys.every((k) => !k.includes("-test")));
  /* one week card for everyone: always that one */
  const one = jsonp(c, claimQ(newSid(), newCode(), { weeks: "note" }));
  assert.strictEqual(one.week, "note");
  /* options the script doesn't know are left out; none left means the first known option */
  const odd = jsonp(c, claimQ(newSid(), newCode(), { homes: "score,evil", weeks: "nope" }));
  assert.strictEqual(odd.home, "score");
  assert.strictEqual(odd.week, "built");
});

test("lookup finds a session by its code, refuses a broken code, and slows down after 20 misses a minute", () => {
  const { c } = fresh();
  const s = session(), code = newCode();
  const cl = jsonp(c, claimQ(s.sid, code));
  post(c, [s.piece("session", { stage: "install", person: "sarah", version: "standard" })]);
  const r = jsonp(c, { op: "lookup", code: code.toLowerCase().slice(0, 3) + " " + code.slice(3).toLowerCase() });
  assert.deepStrictEqual(r, { ok: true, sid: s.sid, code, stage: "install", version: "standard", person: "sarah", home: cl.home, history: cl.history, week: cl.week, order: cl.order, study: STUDY, install_at: "", done: [], qids: [], a: {}, comments: [] });
  assert.deepStrictEqual(jsonp(c, { op: "lookup", code: code.slice(0, 5) + (code[5] === "A" ? "C" : "A") }), { ok: false, error: "bad_code" });
  for (let i = 0; i < 20; i++) assert.deepStrictEqual(jsonp(c, { op: "lookup", code: newCode() }), { ok: false, error: "unknown" });
  assert.deepStrictEqual(jsonp(c, { op: "lookup", code: newCode() }), { ok: false, error: "rate" });
  assert.deepStrictEqual(jsonp(c, { op: "lookup", code }), { ok: false, error: "rate" }, "a real code waits too, so guessing is slow");
  clock += 60000;
  assert.strictEqual(jsonp(c, { op: "lookup", code }).ok, true);
});

test("the sessions row keeps each field's newest value: a late piece never undoes a newer one, seen and submitted never go back", () => {
  const { g, c } = fresh();
  const safari = session(), app = session({ sid: safari.sid });
  /* Safari says "I've added it" first, but its piece arrives after the installed app's */
  const said = safari.piece("session", { install: "said" });
  clock += 30000;
  post(c, [app.piece("session", { install: "seen", version: "easy" }, { standalone: true })]);
  post(c, [said]);
  let row = g.rowsOf("Sessions")[0];
  assert.deepStrictEqual([row.install, row.installed, row.version], ["seen", "yes", "easy"]);
  /* a newer piece does change it, except back from seen */
  clock += 1000;
  post(c, [safari.piece("session", { install: "browser", version: "standard" })]);
  row = g.rowsOf("Sessions")[0];
  assert.deepStrictEqual([row.install, row.version], ["seen", "standard"]);
  /* submitted: a late "no" (the consent piece, from a queue taken over) never undoes "yes" */
  const early = safari.piece("session", { submitted: "no" }, { at: iso(clock - 600000) });
  post(c, [app.piece("session", { submitted: "yes" })]);
  post(c, [early]);
  assert.strictEqual(g.rowsOf("Sessions")[0].submitted, "yes");
});

test("the sessions row's counts are the script's: each window's active minutes summed, comments and tasks seen from the rows", () => {
  const { g, c } = fresh();
  const tabA = session(), tabB = session({ sid: tabA.sid }), app = session({ sid: tabA.sid });
  const t0 = clock;
  post(c, [tabA.piece("session", { stage: "consent", active_minutes: 0.2 })]);
  clock += 120000;
  post(c, [tabB.piece("session", { active_minutes: 2.6 })]);
  /* the closed tab's last count, taken over and sent late, is still its own window's, so it adds, never replaces */
  post(c, [tabA.piece("session", { active_minutes: 0.8 })]);
  post(c, [tabA.piece("session", { active_minutes: 0.5 }, { at: iso(t0) })]);
  assert.strictEqual(g.rowsOf("Sessions")[0].active_minutes, 3.4);
  /* comments: two added in Safari, one in the installed app, one of Safari's deleted there */
  const add = (s, id) => s.piece("comment", { cmid: id, op: "add", screen: "today", state: "form=C", target: "FloraScore", x: 0.4, y: 0.2, tx: 0.5, ty: 0.5, vw: 390, vh: 844, scroll: 0, cm_kind: "I like it", words: "w", alarm_note: "no", how: "double tap" });
  post(c, [add(tabB, "aaaaaaa1"), add(tabB, "aaaaaaa2"), tabB.piece("session", { comments: 2 })]);
  post(c, [add(app, "aaaaaaa3"), app.piece("comment", { cmid: "aaaaaaa1", op: "delete", screen: "today", how: "double tap" }), app.piece("session", { comments: 1 })]);
  let row = g.rowsOf("Sessions")[0];
  assert.strictEqual(row.comments, 2, "the phone's own count (1) is not what the row holds");
  /* tasks seen: each task once, install never */
  const task = (s, id, outcome) => s.piece("task", { task: id, n: 1, version: "standard", state: "", started_at: iso(clock), seconds: 5, active_seconds: 5, outcome, hint: "no", path: "", screens: 0, backs: 0, ease: 5, chips: "", checks: "" });
  post(c, [task(tabB, "bm", "seen"), task(tabB, "time", "said"), task(tabB, "bm", "seen"), task(app, "install", "seen"), tabB.piece("session", { tasks_seen: 0 })]);
  row = g.rowsOf("Sessions")[0];
  assert.strictEqual(row.tasks_seen, 1);
  /* minutes: from the first piece to the earliest Submit, whichever window sent it */
  clock = t0 + 30 * 60000;
  post(c, [app.piece("session", { submitted: "yes", stage: "done" })]);
  clock += 60000;
  post(c, [tabB.piece("session", { submitted: "yes", stage: "done", minutes: 1.1 })]);
  row = g.rowsOf("Sessions")[0];
  assert.strictEqual(row.minutes, 30);
});

test("lookup gives another window what it needs to carry on: the study id, install_at, tasks done, questions answered, a few codes and the comments (never words)", () => {
  const { c } = fresh();
  const s = session(), code = newCode();
  jsonp(c, claimQ(s.sid, code, { study: STUDY + "-test" }));
  const ts = s.piece("session", { stage: "install", install_at: iso(clock) }, { study: STUDY + "-test" });
  const ans = (qid, value, extra) => s.piece("answer", Object.assign({ section: "intake", task: "", qid, question: "q", answer: "a", value, correct: "", right: "", words: "my words", alarm_note: "no", skipped: "no" }, extra || {}), { study: STUDY + "-test" });
  const task = (id) => s.piece("task", { task: id, n: 1, version: "standard", state: "", started_at: iso(clock), seconds: 5, active_seconds: 5, outcome: "seen", hint: "no", path: "", screens: 0, backs: 0, ease: 5, chips: "", checks: "" }, { study: STUDY + "-test" });
  const add = s.piece("comment", { cmid: "bbbbbbb1", op: "add", screen: "today", state: "form=C", target: "FloraScore", x: 0.4, y: 0.2, tx: 0.5, ty: 0.5, vw: 390, vh: 844, scroll: 0, cm_kind: "It's confusing", words: "private words", alarm_note: "no", how: "double tap" }, { study: STUDY + "-test" });
  post(c, [ts, ans("IN6", "oura|watch"), ans("IN2", "foods"), ans("TW", "", { section: "tour" }), task("bm"), task("time"), add]);
  const r = jsonp(c, { op: "lookup", code });
  assert.strictEqual(r.study, STUDY + "-test");
  assert.strictEqual(r.install_at, iso(clock));
  assert.deepStrictEqual(r.done, ["bm", "time"]);
  assert.deepStrictEqual(r.qids.sort(), ["IN2", "IN6", "TW"]);
  assert.deepStrictEqual(r.a, { IN6: "oura|watch" }, "only the codes later steps depend on");
  assert.deepStrictEqual(r.comments, [{ cmid: "bbbbbbb1", target: "FloraScore", kind: "It's confusing" }]);
  assert.ok(JSON.stringify(r).indexOf("words") < 0, "no typed words travel back");
});

/* ------------------------------------------------------------------ comments */

const cm = (s, cmid, op, fields, env) => s.piece("comment", Object.assign({ cmid, op }, op === "add" ? { screen: "today", state: "form=C", target: "FloraScore", x: 0.4, y: 0.2, tx: 0.5, ty: 0.5, vw: 390, vh: 844, scroll: 0, cm_kind: "I like it", words: "first", alarm_note: "no", how: "double tap" } : {}, fields || {}), env);

test("comments: an edit changes the words, a delete removes the row, words and all", () => {
  const { g, c } = fresh();
  const s = session();
  post(c, [cm(s, "aaaa1111", "add"), cm(s, "bbbb2222", "add", { words: "zebra crossing" })]);
  post(c, [cm(s, "aaaa1111", "edit", { cm_kind: "It's confusing", words: "changed my mind", alarm_note: "no" })]);
  let rows = g.rowsOf("Comments");
  assert.deepStrictEqual(rows.map((r) => [r.cmid, r.kind, r.words]), [["aaaa1111", "It's confusing", "changed my mind"], ["bbbb2222", "I like it", "zebra crossing"]]);
  assert.strictEqual(rows[0].target, "FloraScore", "an edit keeps the rest of the row");
  post(c, [cm(s, "bbbb2222", "delete")]);
  rows = g.rowsOf("Comments");
  assert.deepStrictEqual(rows.map((r) => r.cmid), ["aaaa1111"]);
  assert.ok(!JSON.stringify(g.dump()).includes("zebra"), "the deleted words are gone from every tab");
});

test("comments: an edit or a delete that arrives before its add is applied when the add lands, and an older edit never wins", () => {
  const { g, c } = fresh();
  const s = session();
  const add1 = cm(s, "cccc3333", "add", { words: "original" });
  clock += 1000;
  const e1 = cm(s, "cccc3333", "edit", { words: "edit one", cm_kind: "I have an idea" });
  clock += 1000;
  const e2 = cm(s, "cccc3333", "edit", { words: "edit two" });
  post(c, [e2]);
  post(c, [e1]);
  assert.strictEqual(g.rowsOf("Comments").length, 0);
  post(c, [add1]);
  let rows = g.rowsOf("Comments");
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].words, "edit two", "the newest edit wins, whatever order they came in");
  /* a delete before its add: the add is never written */
  const add2 = cm(s, "dddd4444", "add", { words: "taken back" });
  const del2 = cm(s, "dddd4444", "delete");
  post(c, [del2]);
  post(c, [add2]);
  rows = g.rowsOf("Comments");
  assert.deepStrictEqual(rows.map((r) => r.cmid), ["cccc3333"]);
  assert.ok(!JSON.stringify(g.dump()).includes("taken back"));
  /* the same in one post, out of order */
  const add3 = cm(s, "eeee5555", "add", { words: "three" });
  const ed3 = cm(s, "eeee5555", "edit", { words: "three edited" });
  const del4add = cm(s, "ffff6666", "add", { words: "four" });
  const del4 = cm(s, "ffff6666", "delete");
  post(c, [ed3, del4, add3, del4add]);
  rows = g.rowsOf("Comments");
  assert.deepStrictEqual(rows.map((r) => [r.cmid, r.words]), [["cccc3333", "edit two"], ["eeee5555", "three edited"]]);
  /* the pending words left the ledger once used */
  assert.ok(!JSON.stringify(g.rowsOf("_index")).includes("edit one"));
});

test("comments of two sessions with the same cmid stay apart", () => {
  const { g, c } = fresh();
  const s = session(), t = session();
  post(c, [cm(s, "gggg7777", "add", { words: "mine" }), cm(t, "gggg7777", "add", { words: "theirs" })]);
  post(c, [cm(t, "gggg7777", "delete")]);
  assert.deepStrictEqual(g.rowsOf("Comments").map((r) => [r.sid === s.sid, r.words]), [[true, "mine"]]);
});

/* ------------------------------------------------------------------ the recruiter's sheet */

test("thank-you codes go to the recruiter's spreadsheet only, once each, at random rows, with nothing to join them by", () => {
  const { g, c } = fresh();
  const rid = g.props.RECRUITER_SHEET_ID;
  const s = session();
  post(c, [s.piece("session", { stage: "done", submitted: "yes" })]);
  const tokens = [];
  for (let i = 0; i < 25; i++) {
    const t = rand(A21, 8);
    tokens.push(t);
    post(c, [{ kind: "token", study: STUDY, token: t }]);
  }
  post(c, [{ kind: "token", study: STUDY, token: tokens[0] }]);
  const held = g.rowsOf("tokens", rid).map((r) => r.token);
  assert.strictEqual(held.length, 25, "a repeat is kept once");
  assert.deepStrictEqual(held.slice().sort(), tokens.slice().sort());
  assert.notDeepStrictEqual(held, tokens, "not in the order they came");
  assert.deepStrictEqual(g.book(rid).getSheetByName("tokens").getRange(1, 1, 1, 3).getValues()[0], ["token", "", ""], "one column only");
  assert.ok(!JSON.stringify(g.dump().books[g.activeId]).includes(tokens[3]), "no token in the answers Sheet");
  assert.deepStrictEqual(jsonp(c, { op: "token", t: tokens[3] }), { ok: true, have: true });
  assert.deepStrictEqual(jsonp(c, { op: "token", t: rand(A21, 8) }), { ok: true, have: false });
  assert.deepStrictEqual(jsonp(c, { op: "token", t: "short" }), { ok: false, error: "bad_request" });
  /* a token sent with a sid by mistake: the sid goes nowhere */
  const t2 = rand(A21, 8);
  post(c, [{ kind: "token", study: STUDY, token: t2, sid: s.sid, seq: 9, at: iso(clock) }]);
  assert.ok(g.rowsOf("tokens", rid).some((r) => r.token === t2));
  assert.ok(!JSON.stringify(g.dump().books[rid]).includes(s.sid));
  const logged = g.rowsOf("_log").find((l) => l.what === "linked_fields_ignored");
  assert.ok(logged && logged.sid === "", "the log doesn't keep the sid either");
});

test("a follow-up contact goes to the recruiter's followup tab with its week, once, and its nonce is in no sheet", () => {
  const { g, c } = fresh();
  const rid = g.props.RECRUITER_SHEET_ID;
  const piece = { kind: "followup", study: STUDY, n: "k3j9x2mq", contact: "call me on 555 123 4567 " + "y".repeat(300), week: "2026-11-02" };
  post(c, [piece]);
  post(c, [piece]);
  const rows = g.rowsOf("followup", rid);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].week, "2026-11-02");
  assert.ok(rows[0].contact.startsWith("call me on 555 123 4567"), "the contact is kept as typed");
  assert.strictEqual(rows[0].contact.length, 200);
  assert.ok(!JSON.stringify(g.dump().books).includes("k3j9x2mq"));
  assert.deepStrictEqual(jsonp(c, { op: "followup", n: "k3j9x2mq" }), { ok: true, have: true });
  assert.deepStrictEqual(jsonp(c, { op: "followup", n: "zzzzzzzz" }), { ok: true, have: false });
  post(c, [{ kind: "followup", study: STUDY, n: "m4m4m4m4", contact: "x@example.com" }]);
  assert.strictEqual(g.rowsOf("followup", rid).find((r) => r.contact === "x@example.com").week, "2026-11-02", "the script works out the Monday when it's missing");
  assert.strictEqual(g.rowsOf("Sessions").length + g.rowsOf("Answers").length, 0);
});

test("thank-you codes are limited to 30 a minute from everyone, and the rest come on a retry", () => {
  const { g, c } = fresh();
  const rid = g.props.RECRUITER_SHEET_ID;
  const ts = [];
  for (let i = 0; i < 35; i++) { ts.push(rand(A21, 8)); post(c, [{ kind: "token", study: STUDY, token: ts[i] }]); }
  assert.strictEqual(g.rowsOf("tokens", rid).length, 30);
  clock += 60000;
  for (const t of ts) post(c, [{ kind: "token", study: STUDY, token: t }]);
  assert.strictEqual(g.rowsOf("tokens", rid).length, 35);
});

/* ------------------------------------------------------------------ Will's tools, robustness */

test("removing a session by its code deletes its rows on every tab and leaves everyone else's", () => {
  const { g, c } = fresh();
  const s = session(), t = session(), code = newCode();
  jsonp(c, claimQ(s.sid, code));
  jsonp(c, claimQ(t.sid, newCode()));
  for (const x of [s, t]) post(c, [answer(x, "IN1"), answer(x, "IN2"), event(x, "flow", "consent"), cm(x, "hhhh8888", "add")]);
  const before = { a: g.rowsOf("Answers").length, e: g.rowsOf("Events").length };
  const msg = c.removeSessionByCode(code.toLowerCase());
  assert.ok(/^Removed \d+ rows for the code /.test(msg), msg);
  for (const tab of ["Sessions", "Answers", "Tasks", "Comments", "Events", "_index"]) {
    assert.ok(!g.rowsOf(tab).some((r) => r.sid === s.sid), tab);
  }
  assert.strictEqual(g.rowsOf("Answers").length, before.a - 2);
  assert.strictEqual(g.rowsOf("Events").length, before.e - 1);
  assert.strictEqual(g.rowsOf("Sessions").length, 1);
  assert.strictEqual(jsonp(c, { op: "ack", sid: t.sid, cid: t.cid }).upto, 4, "the other session's index is intact");
  assert.ok(/^No session has the code/.test(c.removeSessionByCode(newCode())));
  assert.ok(/^That code doesn't look right/.test(c.removeSessionByCode("ABC")));
  /* the menu's prompt */
  g.ui.promptReply = { button: "OK", text: newCode() };
  c.removeByCodePrompt();
  assert.ok(g.ui.calls.some((x) => x[0] === "alert"));
  g.props.REMOVE_CODE = newCode();
  assert.ok(/^No session/.test(c.removeByCodeProperty()));
  assert.ok(!g.props.REMOVE_CODE);
});

test("columns moved or added in the Sheet by hand don't break the writes; a deleted column comes back at the end", () => {
  const { g, c } = fresh();
  const sh = g.book().getSheetByName("Answers");
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const moved = ["qid", "my notes"].concat(head.filter((h) => h !== "qid" && h !== "words"));
  sh.getRange(1, 1, 1, head.length).clearContent();
  sh.getRange(1, 1, 1, moved.length).setValues([moved]);
  g.log.unlocked.length = 0;   // the hand edits above stand for Will's, which aren't the script's
  const s = session();
  post(c, [answer(s, "TW", { section: "tour", words: "fine" })]);
  const row = g.rowsOf("Answers")[0];
  assert.strictEqual(row.qid, "TW");
  assert.strictEqual(row["my notes"], "");
  assert.strictEqual(row.words, "fine");
  const newHead = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  assert.strictEqual(newHead[0], "qid");
  assert.strictEqual(newHead[newHead.length - 1], "words");
});

test("a missing tab is made again with its header row when the next piece arrives", () => {
  const { g, c } = fresh();
  g.book().deleteSheet(g.book().getSheetByName("Events"));
  const s = session();
  post(c, [event(s, "flow", "consent")]);
  assert.strictEqual(g.rowsOf("Events").length, 1);
});

test("closed: posts and claims are refused, ping says closed, acks still answer", () => {
  const { g, c } = fresh();
  const s = session();
  post(c, [answer(s, "IN1")]);
  g.props.CLOSED = "yes";
  assert.deepStrictEqual(post(c, [answer(s, "IN2")]), { ok: false, error: "closed" });
  assert.deepStrictEqual(jsonp(c, claimQ(s.sid, newCode())), { ok: false, error: "closed" });
  assert.deepStrictEqual(jsonp(c, { op: "ping" }), { ok: true, open: false });
  assert.strictEqual(jsonp(c, { op: "ack", sid: s.sid, cid: s.cid }).upto, 1);
});

test("the study ids can come from the STUDIES script property", () => {
  const { g, c } = fresh();
  g.props.STUDIES = "florin-fg-2, florin-pilot";
  assert.deepStrictEqual(jsonp(c, { op: "ping", study: "florin-fg-2" }), { ok: true, open: true });
  assert.deepStrictEqual(jsonp(c, { op: "ping", study: "florin-pilot-test" }), { ok: true, open: true });
  assert.deepStrictEqual(jsonp(c, { op: "ping", study: STUDY }), { ok: false, error: "unknown_study" });
});

test("an error inside is caught, logged by line only, and answered as server", () => {
  const { g, c } = fresh();
  const s = session();
  const real = c.SpreadsheetApp.getActiveSpreadsheet;
  let n = 0;
  c.SpreadsheetApp.getActiveSpreadsheet = () => { if (n++ === 0) throw new Error("boom with secret words"); return real(); };
  const r = post(c, [answer(s, "IN1", { words: "private" })]);
  c.SpreadsheetApp.getActiveSpreadsheet = real;
  assert.deepStrictEqual(r, { ok: false, error: "server" });
  const err = g.rowsOf("_log").find((l) => l.what === "error");
  assert.ok(err, "logged");
  assert.ok(!JSON.stringify(g.dump()).includes("secret words") && !JSON.stringify(g.dump()).includes("private"));
  assert.strictEqual(post(c, [answer(s, "IN1")]).accepted, 1, "the retry goes in");
});

test("a whole session, about 560 pieces in posts of 25, lands once, with a rough count of Sheets calls per post", () => {
  const { g, c } = fresh();
  const s = session();
  const code = newCode();
  jsonp(c, claimQ(s.sid, code));
  const all = [s.piece("session", { code, platform: "iphone", os: "26", browser: "safari", width: 390, theme: "light", text_reported: "standard", stage: "consent", person: "sarah", version: "standard", decisions: "form=C bmUI=quick home=score history=calendar checkin=on mealUI=quick look=built easy=off onboard=short weekCard=card plan=member data=est meals=all persona=sarah" })];
  const qids = ["IN1", "IN2", "IN3", "IN4", "IN5", "IN6", "IN7", "IN8", "IN9"];
  for (const q of qids) all.push(answer(s, q));
  for (const task of ["bm", "time", "week", "score", "patterns", "checkin", "history", "ask"]) {
    for (let i = 0; i < 40; i++) all.push(event(s, ["screen", "act", "view", "depth"][i % 4], ["today", "tab", "FloraScore", "today"][i % 4], { phase: task }));
    for (const q of ["TE", "TR"]) all.push(answer(s, q, { section: "task", task, value: "6" }));
    all.push(s.piece("task", { task, n: 1, version: "standard", outcome: "seen", seconds: 60, ease: 6 }, { phase: task }));
  }
  for (let i = 1; i <= 10; i++) all.push(answer(s, "SUS" + i, { section: "exit", value: "4" }));
  for (let i = 0; i < 5; i++) all.push(cm(s, "cm" + i + "xxxxx", "add"));
  for (let i = 0; i < 160; i++) all.push(event(s, "vis", i % 2 ? "hidden" : "visible", { phase: "free" }));
  all.push(s.piece("session", { stage: "done", submitted: "yes", sus: 75 }));
  let calls = 0, writes = 0, posts = 0, accepted = 0, most = 0;
  for (let i = 0; i < all.length; i += 25) {
    clock += 30000;   // a post of 25 every 30 seconds: 50 pieces a minute, under the limit of 60
    const before = g.log.calls, wb = g.log.writes;
    const r = post(c, all.slice(i, i + 25));
    calls += g.log.calls - before; writes += g.log.writes - wb; posts++; accepted += r.accepted;
    most = Math.max(most, g.log.calls - before);
  }
  for (let i = 0; i < all.length; i += 25) post(c, all.slice(i, i + 25));   // the whole queue again: all duplicates
  assert.strictEqual(accepted, all.length);
  assert.strictEqual(jsonp(c, { op: "ack", sid: s.sid, cid: s.cid }).upto, all.length);
  const rows = ["Answers", "Tasks", "Comments", "Events"].reduce((n, t) => n + g.rowsOf(t).length, 0);
  assert.strictEqual(rows + 2, all.length, "every piece but the two session pieces is one row");
  const ses = g.rowsOf("Sessions")[0];
  assert.deepStrictEqual([ses.stage, ses.submitted, ses.sus, ses.code], ["done", "yes", 75, code]);
  /* the whole queue once more, as a phone that lost every ack would send it: every piece a duplicate */
  test.note = `${all.length} pieces in ${posts} posts: about ${Math.round(calls / posts)} reads and ${Math.round(writes / posts)} writes to Sheets a post, at most ${most} reads`;
});

/* ------------------------------------------------------------------ run */

let failed = 0;
for (const [name, fn] of tests) {
  const before = Date.now();
  try {
    test.note = "";
    made.length = 0;
    fn();
    for (const g of made) {
      assert.deepStrictEqual(g.log.unlocked, [], "a write outside the lock");
      assert.deepStrictEqual(g.log.formulas, [], "a cell became a formula");
      assert.deepStrictEqual(g.log.autoParsed, [], "text Sheets would read as a number, a date or TRUE/FALSE");
    }
    console.log(`ok    ${name}${test.note ? ` (${test.note})` : ""} ${Date.now() - before}ms`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}\n      ${String(err && err.stack || err).split("\n").slice(0, 4).join("\n      ")}`);
  }
}
/* the checks every test shares: run once more over a fresh full pass, reading the stub's own log */
(function invariants() {
  const g = makeGas({ now: () => clock });
  const c = loadScript(g);
  c.setup();
  const s = session();
  const code = "4E3" + "67";   // a code Sheets would read as a number, made valid below
  const real = code + contractCheck(code);
  jsonp(c, claimQ(s.sid, real));
  post(c, [s.piece("session", { code: real, os: "26", decisions: "form=C home=score" }), answer(s, "IN7", { value: "1", answer: "TRUE", words: "1-12" }), s.piece("task", { task: "bm", checks: "2 of 3 right", seconds: 12 })]);
  post(c, [answer(s, "IN8")]);
  jsonp(c, { op: "ack", sid: s.sid, cid: s.cid });
  jsonp(c, { op: "lookup", code: real });
  c.removeSessionByCode(real);
  const bad = [];
  if (g.log.unlocked.length) bad.push("writes outside the lock: " + g.log.unlocked.slice(0, 5).join(", "));
  if (g.log.formulas.length) bad.push("formulas: " + JSON.stringify(g.log.formulas.slice(0, 3)));
  if (g.log.autoParsed.length) bad.push("text Sheets would parse: " + JSON.stringify(g.log.autoParsed.slice(0, 3)));
  if (bad.length) { failed++; console.log("FAIL  invariants\n      " + bad.join("\n      ")); }
  else console.log("ok    invariants: no write outside the lock, no formula, no text Sheets would turn into a number or a date");
})();
console.log(failed ? `\n${failed} failed of ${tests.length + 1}` : `\nall ${tests.length + 1} passed`);
process.exit(failed ? 1 : 0);
