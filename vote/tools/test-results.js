/* Checks for the results side of the Florin app vote:
     NODE_PATH=$(npm root -g) node vote/tools/test-results.js [--node] [--shots <dir>]
   The ballots are the test sample in vote/tools/fixtures/ (made by make-fixtures.js): six made-up voters, "Test voter 1"
   to "Test voter 6", plus a held-out one and a test one. A sample, never real results.

   In node: the fixtures are current; every sample ballot goes to Slack text and back unchanged; Slack's escaping, a
   quoted message, two parts and a deleted machine line are read; a changed pick fails its check and is held out; the
   latest ballot per name counts, two browsers are flagged; the name keys; aggregate.js on the fixtures gives the counts
   worked out here straight from the sample's picks, exits 1 on nothing, and takes --include-test and --since; JSON,
   CSV and a results.json read back the same; recs.js still says what decisions.md and modules.js say.
   In the browser (skipped with --node): vote/results/_local.html over http, with the sample as results.json, at 1440
   and 390 in both themes: each bar's count, the Design filter, We recommend on the right option, every note, the table
   at a glance and Who picked what against the bars, pasted Slack ballots merged under the latest-per-name rule, the
   Sheet's reply by JSONP from Code.gs (in the stand-in), and the page's words (no dashes, no exclamation points, the
   claims rules), no sideways scroll, no console errors, 44px targets. The CSS is checked against DESIGN.md's scale.
   --shots <dir> keeps screenshots. Exits 1 on any failure. */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const vm = require("vm");
const assert = require("assert");
const os = require("os");

const ROOT = path.join(__dirname, "..", "..");
const Q = require(path.join(ROOT, "vote/js/questions.js"));
const B = require(path.join(ROOT, "vote/js/ballot.js"));
const C = require(path.join(ROOT, "vote/js/count.js"));
const RECS = require(path.join(ROOT, "vote/results/js/recs.js"));
const FX = require("./make-fixtures.js");
const AGG = require("./aggregate.js");
const FIX = path.join(__dirname, "fixtures");
const VOTE = FX.VOTE;

const argv = process.argv.slice(2);
const NODE_ONLY = argv.includes("--node");
const SHOTS = argv.includes("--shots") ? path.resolve(argv[argv.indexOf("--shots") + 1]) : null;

const fails = [];
let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const read = (f) => fs.readFileSync(path.join(FIX, f), "utf8");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vote-results-"));

/* the sample's counted ballots, and their tallies worked out straight from the picks in make-fixtures.js */
const COUNTED = { v1b: "H7KC4X", v2: "KM4TRA", v3b: "RYJ9F3", v4: "DFH3MN", v5: "WX69AE", v6: "NT4K7C" };
function expected(keys) {
  const t = {};
  Q.QS.forEach((q) => { const opts = {}; q.opts.forEach((o) => { opts[o.id] = 0; }); t[q.id] = { n: 0, none: 0, opts }; });
  keys.forEach((k) => Object.keys(FX.V[k].a).forEach((q) => {
    const p = FX.V[k].a[q][0];
    t[q].n++;
    if (p === "none") t[q].none++; else t[q].opts[p]++;
  }));
  return t;
}
const notesOf = (keys) => {
  const out = [];
  keys.forEach((k) => Object.keys(FX.V[k].a).forEach((q) => { const n = FX.V[k].a[q][1]; if (n) out.push({ k, q, note: B.pickList({ picks: [{ q, p: "x", note: n }] })[0].note }); }));
  return out;
};
const run = (args) => { const lines = []; const r = AGG.run(args, (s) => lines.push(s)); return Object.assign(r, { out: lines.join("\n") }); };

/* ---------------------------------------------------------------- node */

test("the fixtures are what make-fixtures.js makes now", () => {
  Object.keys(FX.files).forEach((f) => {
    const disk = read(f);
    if (f === "sheet.json") {
      const a = JSON.parse(disk), b = JSON.parse(FX.files[f]);
      /* received times come from the stand-in's clock; everything else must match */
      const strip = (x) => JSON.stringify(x, (k, v) => (k === "received" ? undefined : v));
      assert.strictEqual(strip(a), strip(b), "sheet.json is stale: run node vote/tools/make-fixtures.js");
    } else assert.strictEqual(disk, FX.files[f], `${f} is stale: run node vote/tools/make-fixtures.js`);
  });
});

test("every sample ballot goes to Slack text and back unchanged, whole and in parts", () => {
  Object.keys(FX.V).forEach((k) => {
    const b = FX.ballot(k);
    [0, 1200].forEach((max) => {
      const t = B.text(b, { max });
      const got = B.parse(t.parts.join("\n\nanother message\n\n"));
      assert.strictEqual(got.length, 1, `${k} max ${max}: ${got.length} ballots`);
      const g = got[0];
      assert.ok(g.ok, `${k}: ${g.flags}`);
      assert.deepStrictEqual(g.flags, [], `${k} max ${max}: ${g.flags}`);
      ["vote", "bid", "name", "role", "role_other", "at", "seed"].forEach((f) => assert.strictEqual(g[f], b[f], `${k}.${f}`));
      const want = {};
      b.picks.forEach((x) => { want[x.q] = { p: x.p, note: x.note }; });
      assert.deepStrictEqual(g.picks, want, k);
    });
  });
});

test("Slack's escaping and a quoted message: notes come back with & < > and the link's words", () => {
  const got = B.parse(read("slack-2-escaped.txt"));
  assert.strictEqual(got.length, 1);
  const b = got[0];
  assert.strictEqual(b.name, "Test voter 4");
  assert.strictEqual(b.role, "other");
  assert.strictEqual(b.role_other, "Patient advocate");
  assert.strictEqual(b.picks.home.note, "Today's logs first & the score small <it reads calmer>.");
  assert.strictEqual(b.picks.bm.note, "Two taps is right, see example.com for how others do it.");
  assert.deepStrictEqual(b.flags, []);
});

test("a ballot in two parts is joined, every note kept", () => {
  const got = B.parse(read("slack-3-parts.txt"));
  assert.strictEqual(got.length, 1);
  assert.strictEqual(got[0].bid, "WX69AE");
  assert.strictEqual(Object.keys(got[0].picks).length, 19);
  assert.strictEqual(Object.values(got[0].picks).filter((x) => x.note).length, notesOf(["v5"]).length);
  assert.deepStrictEqual(got[0].flags, []);
  /* the first part alone: what's there, flagged */
  const first = read("slack-3-parts.txt").split("\nTest voter 5, 5:46 PM\n")[1];
  const one = B.parse(first);
  assert.ok(one.length === 1 && one[0].flags.indexOf("part_missing") >= 0, JSON.stringify(one.map((x) => x.flags)));
});

test("a ballot with its machine line deleted is read from the text and flagged", () => {
  const got = B.parse(read("slack-4-no-machine-line.txt"));
  assert.strictEqual(got.length, 1);
  assert.ok(got[0].flags.indexOf("read_from_text") >= 0);
  const want = {};
  Object.keys(FX.V.v6.a).forEach((q) => { want[q] = { p: FX.V.v6.a[q][0], note: FX.V.v6.a[q][1] }; });
  assert.deepStrictEqual(got[0].picks, want);
  assert.strictEqual(got[0].name, "Test voter 6");
  assert.strictEqual(got[0].role, "");
});

test("a pick changed in the machine line fails its check and is held out; Will's own message is passed over", () => {
  const got = B.parse(read("slack-1-clean.txt"));
  assert.deepStrictEqual(got.map((b) => b.name), ["Test voter 1", "Test voter 2", "Test voter 7"]);
  const v7 = got[2];
  assert.strictEqual(v7.ok, false);
  assert.ok(v7.flags.indexOf("check_failed") >= 0);
  const res = C.build(got, { vote: VOTE });
  assert.deepStrictEqual(res.dropped.map((d) => [d.name, d.why]), [["Test voter 7", "check_failed"]]);
  assert.ok(res.dropped[0].text.indexOf("FLORIN-VOTE") >= 0, "the held-out ballot keeps its text for the page");
});

test("a damaged last line: mended when wrapped, counted from the numbered lines when cut, held out when they disagree", () => {
  const b = FX.ballot("v5");
  const whole = B.text(b).text;
  const line = whole.split("\n").pop();
  /* wrapped in the middle of a word, and at a space: mended exactly, no flag */
  const at = line.indexOf("p=") + 20;
  [[line.slice(0, at) + "\n" + line.slice(at)], [line.replace(" w=", "\nw=")]].forEach(([l]) => {
    const g = B.parse(whole.replace(line, l))[0];
    assert.ok(g.ok, g.flags.join());
    assert.deepStrictEqual(g.flags, []);
    assert.strictEqual(Object.keys(g.picks).length, b.picks.length);
  });
  /* cut short (no check left): counted from the numbered lines, every note kept, flagged */
  const cut = B.parse(whole.replace(line, line.slice(0, line.indexOf(" w=") - 30) + "`"))[0];
  assert.ok(cut.ok, cut.flags.join());
  assert.deepStrictEqual(cut.flags, ["line_damaged"]);
  const want = {};
  b.picks.forEach((x) => { want[x.q] = { p: x.p, note: x.note }; });
  assert.deepStrictEqual(cut.picks, want);
  assert.strictEqual(cut.name, b.name);
  assert.strictEqual(cut.at, b.at);
  /* cut short, and a numbered line changed: held out */
  const first = b.picks[0], q = Q.qOf(first.q);
  const other = q.opts.find((o) => o.id !== first.p);
  const bad = B.parse(whole.replace(`${q.n}. ${q.label}: ${Q.optName(q, first.p)}`, `${q.n}. ${q.label}: ${other.name}`).replace(line, line.slice(0, line.indexOf(" w=") - 30) + "`"))[0];
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.flags.indexOf("check_failed") >= 0);
  /* a results.json says why */
  const res = C.build([cut], { vote: VOTE });
  assert.deepStrictEqual(res.flags.map((f) => f.what), ["line_damaged"]);
  assert.ok(/damaged/.test(C.why("line_damaged")));
});

test("numbered lines Slack turned into bullets, or numbered again from 1: picks and notes kept by each question's label", () => {
  const b = FX.ballot("v5");
  const whole = B.text(b).text;
  const bullets = whole.replace(/^(\d{1,2})\. /gm, "• ");
  const g = B.parse(bullets)[0];
  assert.deepStrictEqual(g.flags, []);
  assert.strictEqual(Object.values(g.picks).filter((x) => x.note).length, b.picks.filter((x) => x.note).length);
  /* with the last line gone too, the picks come from the labels */
  const noLine = B.parse(bullets.split("\n").slice(0, -1).join("\n"))[0];
  assert.ok(noLine.flags.indexOf("read_from_text") >= 0);
  assert.strictEqual(Object.keys(noLine.picks).length, b.picks.length);
  let n = 0;
  const again = B.parse(whole.replace(/^(\d{1,2})\. /gm, () => `${++n > 8 ? n - 8 : n}. `).split("\n").slice(0, -1).join("\n"))[0];
  assert.deepStrictEqual(Object.keys(again.picks).sort(), b.picks.map((x) => x.q).sort(), "Part 2 numbered again from 1 still reads by label");
  assert.ok(!again.flags.includes("unknown_pick"), again.flags.join());
});

test("one voter, one spelling: the first ballot's, in the ballots, the replaced list and the flags", () => {
  const a = B.parse(B.text(FX.ballot("v1")).text)[0], z = B.parse(B.text(FX.ballot("v1b")).text)[0];
  const res = C.build([z, a], { vote: VOTE });
  assert.strictEqual(res.ballots[0].name, "Test voter 1");
  assert.strictEqual(res.replaced[0].name, "Test voter 1");
  assert.ok(res.flags.every((f) => f.name === "Test voter 1"));
});

test("name keys: case, spaces, accents and symbols", () => {
  assert.strictEqual(B.nameKey("  sam   LEE "), B.nameKey("Sam Lee"));
  assert.strictEqual(B.nameKey("José"), B.nameKey("Jose"));
  assert.strictEqual(B.nameKey("Ana-María O'Neil"), "ana maria o neil");
  assert.strictEqual(B.nameKey("!!! ..."), "");
  assert.strictEqual(B.nameKey("test  VOTER 1"), B.nameKey("Test voter 1"));
});

test("aggregate.js on the fixtures: six voters, the latest ballot each, and the counts from the sample's own picks", () => {
  const dir = tmp();
  const r = run([FIX, "--out", path.join(dir, "results.json")]);
  assert.strictEqual(r.code, 0, r.out);
  const res = JSON.parse(fs.readFileSync(path.join(dir, "results.json"), "utf8"));
  assert.ok(fs.readFileSync(path.join(dir, "results-data.js"), "utf8").indexOf("window.VOTE_RESULTS = {") >= 0);
  assert.deepStrictEqual(res.ballots.map((b) => b.bid).sort(), Object.values(COUNTED).sort());
  assert.deepStrictEqual(res.tallies, expected(Object.keys(COUNTED)));
  assert.deepStrictEqual(res.replaced.map((x) => [x.bid, x.by]).sort(), [["C4NM7P", "H7KC4X"], ["PEX7WD", "RYJ9F3"]]);
  assert.deepStrictEqual(res.flags.map((f) => [f.bid, f.what]).sort(), [["NT4K7C", "read_from_text"], ["RYJ9F3", "two_browsers"]]);
  assert.deepStrictEqual(res.dropped.map((d) => [d.bid, d.why]).sort(), [["JA7MF4", "check_failed"], ["Y3ATCD", "test"]]);
  /* one ballot seen in Slack, the Sheet's reply and the CSV is one ballot, with the vid the Sheet had */
  const v4 = res.ballots.find((b) => b.bid === "DFH3MN");
  assert.strictEqual(v4.vid, FX.V.v4.vid);
  assert.ok(/1 Home screen: Compact 3, Score first 2, Day first 1, No preference 0 \(6\)/.test(r.out), r.out);
  assert.ok(/Test voter 7, ballot JA7MF4 .*held out/.test(r.out));
  /* every note in the sample's counted ballots is in results.json */
  const have = [];
  res.ballots.forEach((b) => Object.keys(b.picks).forEach((q) => { if (b.picks[q].note) have.push(q + "|" + b.picks[q].note); }));
  assert.deepStrictEqual(have.sort(), notesOf(Object.keys(COUNTED)).map((n) => n.q + "|" + n.note).sort());
});

test("aggregate.js: exit 1 on nothing, --include-test, --since, and the Slack ballots read before the Sheet's", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "notes.txt"), "Florin app vote: please send your picks.\nThanks all.\n");
  assert.strictEqual(run([dir, "--out", path.join(dir, "r.json"), "--quiet"]).code, 1);
  assert.strictEqual(run([path.join(dir, "missing"), "--quiet"]).code, 1);
  const t = run([FIX, "--out", path.join(dir, "t.json"), "--include-test", "--quiet"]);
  const rt = JSON.parse(fs.readFileSync(path.join(dir, "t.json"), "utf8"));
  assert.strictEqual(t.code, 0);
  assert.ok(rt.ballots.some((b) => b.bid === "Y3ATCD"), "the test ballot counts with --include-test");
  run([FIX, "--out", path.join(dir, "s.json"), "--since", "2026-11-05T17:00:00Z", "--quiet"]);
  const rs = JSON.parse(fs.readFileSync(path.join(dir, "s.json"), "utf8"));
  assert.ok(!rs.ballots.some((b) => b.bid === "KM4TRA"), "Test voter 2's 15:30 ballot is before --since");
  assert.ok(rs.dropped.some((d) => d.bid === "KM4TRA" && d.why === "before_since"));
  assert.deepStrictEqual(rs.sources.map((s) => path.basename(s.file)), ["slack-1-clean.txt", "slack-2-escaped.txt", "slack-3-parts.txt", "slack-4-no-machine-line.txt", "slack-5-revote.txt", "sheet.json", "votes.csv"]);
});

test("the Sheet's reply, the Votes CSV and a results.json read back the same", () => {
  const sheet = C.readJSON(read("sheet.json"), { file: "sheet.json" });
  assert.deepStrictEqual(sheet.ballots.map((b) => b.bid), ["KM4TRA", "PEX7WD", "RYJ9F3", "DFH3MN"]);
  assert.ok(sheet.ballots.every((b) => b.source === "sheet" && b.ok));
  const csv = C.readCSV(read("votes.csv"), { file: "votes.csv" });
  assert.deepStrictEqual(csv.ballots.map((b) => [b.bid, b.vote]), [["DFH3MN", VOTE], ["Y3ATCD", VOTE + "-test"]]);
  assert.deepStrictEqual(csv.ballots[0].picks, sheet.ballots[3].picks, "the CSV and the reply hold the same ballot");
  /* quoted CSV fields: a comma, a quote, a new line */
  const q = C.csv('a,b\n"x, y","say ""hi""\nthere"\n');
  assert.deepStrictEqual(q, [["a", "b"], ["x, y", 'say "hi"\nthere']]);
  /* a results.json read again keeps its counts, its replaced list and its flags' ballots */
  const dir = tmp();
  run([FIX, "--out", path.join(dir, "results.json"), "--quiet"]);
  const first = JSON.parse(fs.readFileSync(path.join(dir, "results.json"), "utf8"));
  const again = C.readJSON(first, { file: "results.json" });
  const res = C.build(again.ballots, { vote: VOTE, replaced: again.replaced, dropped: again.dropped });
  assert.deepStrictEqual(res.tallies, first.tallies);
  assert.strictEqual(res.replaced.length, first.replaced.length);
});

test("recs.js says what decisions.md and modules.js say, on options the questions have", () => {
  const sheet = fs.readFileSync(path.join(ROOT, "claude/Florin decisions.md"), "utf8").replace(/\*\*/g, "").replace(/\s+/g, " ");
  const mods = fs.readFileSync(path.join(ROOT, "modules/js/modules.js"), "utf8");
  assert.deepStrictEqual(Object.keys(RECS).sort(), Q.QS.map((q) => q.id).sort());
  const stale = [];
  Q.QS.forEach((q) => {
    const r = RECS[q.id];
    (Array.isArray(r.v) ? r.v : [r.v]).forEach((v) => { if (!Q.optOf(q, v) || v === "none") stale.push(`${q.id}: ${v} isn't an option`); });
    if (!/^We recommend /.test(r.say)) stale.push(`${q.id}: say starts "${r.say.slice(0, 20)}"`);
    if (r.from.src === "decisions") {
      if (sheet.indexOf(r.from.anchor) < 0) stale.push(`${q.id}: decisions.md no longer says "${r.from.anchor}"`);
      r.why.concat(r.open ? [r.open] : []).forEach((w) => { if (sheet.indexOf(w) < 0) stale.push(`${q.id}: decisions.md no longer says "${w.slice(0, 60)}..."`); });
    } else {
      const at = mods.indexOf(`key: "${r.from.key}"`);
      if (at < 0) { stale.push(`${q.id}: modules.js has no module ${r.from.key}`); return; }
      const block = mods.slice(at, at + 4000);
      /* recs.js's declared edits (the source's "your pick" as "Will's pick"), applied to the source's words first */
      const edit = (t) => (t == null ? t : (RECS.EDITS || []).reduce((s, [a, b]) => s.split(a).join(b), t));
      const field = (f) => { const m = new RegExp(`\\b${f}: "((?:[^"\\\\]|\\\\.)*)"`).exec(block); return m ? edit(JSON.parse(`"${m[1]}"`)) : null; };
      if (field("rec") !== r.v) stale.push(`${q.id}: modules.js recommends ${field("rec")}, recs.js ${r.v}`);
      if (field("say") !== r.say) stale.push(`${q.id}: modules.js says "${field("say")}"`);
      if (field("why") !== r.why[0]) stale.push(`${q.id}: modules.js's why is "${field("why")}"`);
    }
  });
  assert.deepStrictEqual(stale, []);
});

test("the results side's own words: no em or en dashes, no exclamation points, FloraScore one word", () => {
  const files = ["vote/js/count.js", "vote/results/js/results.js", "vote/results/js/recs.js", "vote/results/index.html", "vote/tools/aggregate.js", "vote/SETUP.md"];
  const bad = [];
  files.forEach((f) => {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) return;
    const s = fs.readFileSync(p, "utf8");
    s.split("\n").forEach((l, i) => {
      if (/[–—]/.test(l)) bad.push(`${f}:${i + 1} a dash`);
      if (/Flora Score|Flora-Score|Florascore/.test(l)) bad.push(`${f}:${i + 1} FloraScore split`);
      /* an exclamation point in words, not code (!==, !x, <!--) */
      const words = l.match(/"[^"]*"|`[^`]*`/g) || [];
      words.forEach((w) => { if (/[A-Za-z]!(\s|"|`|$)/.test(w)) bad.push(`${f}:${i + 1} an exclamation point`); });
    });
  });
  assert.deepStrictEqual(bad, []);
});

test("results.css: every padding, margin, gap, inset and radius on DESIGN.md's scale", () => {
  const walk = require(path.join(ROOT, "work/css-walk.js"));
  const md = fs.readFileSync(path.join(ROOT, "claude/Florin DESIGN.md"), "utf8");
  const fm = md.split(/^---\s*$/m)[1] || "";
  const block = (name) => { const m = fm.match(new RegExp("^" + name + ":[^\\n]*\\n((?:[ ]{2}.*\\n)+)", "m")); const out = []; if (m) m[1].split("\n").forEach((l) => { const kv = l.match(/^\s{2}([\w-]+):\s*"?([\d.]+)px/); if (kv) out.push(parseFloat(kv[2])); }); return out; };
  const SPACE = new Set([0].concat(block("spacing")));
  const RAD = new Set(block("rounded").concat([999]));
  const bad = [];
  const css = fs.readFileSync(path.join(ROOT, "vote/results/css/results.css"), "utf8");
  walk(css, (rule) => rule.decls.forEach((d) => {
    const sp = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)/.test(d.prop);
    const rd = /^border(-[a-z]+)*-radius$/.test(d.prop);
    if (!sp && !rd) return;
    (d.value.match(/-?[\d.]+px/g) || []).forEach((v) => {
      const n = Math.abs(parseFloat(v));
      if (sp && !SPACE.has(n) && !(/^(inset|top|right|bottom|left)/.test(d.prop) && n <= 3)) bad.push(`${rule.sel} { ${d.prop}: ${d.value} } line ${d.line}`);
      if (rd && !RAD.has(n)) bad.push(`${rule.sel} { ${d.prop}: ${d.value} } line ${d.line}`);
    });
  }));
  assert.deepStrictEqual(bad, []);
});

/* ---------------------------------------------------------------- the browser */

function stubSheet() {
  /* Code.gs in the stand-in, with the sample's Sheet ballots posted to it the way the voting page posts them */
  const { makeGas, loadScript } = require(path.join(ROOT, "focus/apps-script/gas-stub.js"));
  let clock = Date.UTC(2026, 10, 5, 20, 0, 0);
  const g = makeGas({ now: () => clock, properties: { VOTE_KEY: "testkey" } });
  const c = loadScript(g);
  c.setup();
  ["v2", "v3a", "v3b", "v4"].forEach((k) => { clock += 60000; c.doPost({ parameter: { op: "vote" }, postData: { contents: JSON.stringify(B.toJSON(FX.ballot(k))) } }); });
  return c;
}

function serve(over) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const hit = over(u);
    if (hit) { res.writeHead(hit.status || 200, { "content-type": hit.type || "text/plain; charset=utf-8", "cache-control": "no-store" }); res.end(hit.body || ""); return; }
    const p = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname)));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function browser() {
  const { chromium } = require("playwright");
  const dir = tmp();
  run([FIX, "--out", path.join(dir, "results.json"), "--quiet"]);
  const SAMPLE = fs.readFileSync(path.join(dir, "results.json"), "utf8");
  const sample = JSON.parse(SAMPLE);
  const sheetOnly = (() => { const d2 = tmp(); run([path.join(FIX, "sheet.json"), "--out", path.join(d2, "r.json"), "--quiet"]); return fs.readFileSync(path.join(d2, "r.json"), "utf8"); })();
  const SH = stubSheet();
  const mode = { results: SAMPLE, endpoint: "" };
  let port = 0;
  const server = await serve((u) => {
    if (u.pathname === "/vote/results/results.json") return mode.results ? { body: mode.results, type: "application/json" } : { status: 404, body: "not found" };
    if (u.pathname === "/vote/config.js" && mode.endpoint) {
      const src = fs.readFileSync(path.join(ROOT, "vote/config.js"), "utf8").replace(/endpoint:\s*""/, `endpoint: "http://127.0.0.1:${port}/mock-exec"`);
      return { body: src, type: "text/javascript; charset=utf-8" };
    }
    if (u.pathname === "/mock-exec") {
      const p = {};
      u.searchParams.forEach((v, k) => { p[k] = v; });
      const out = SH.doGet({ parameter: p });
      return { body: out.getContent(), type: "text/javascript; charset=utf-8" };
    }
    return null;
  });
  port = server.address().port;
  const URL0 = `http://127.0.0.1:${port}/vote/results/_local.html`;
  const br = await chromium.launch();
  const claims = (() => { const box = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "prototype/js/claims-rules.js"), "utf8"), box); return box.window.FLORIN.claimsRules; })();
  const errors = [];
  const open = async (w, h, theme, hash) => {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, colorScheme: theme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${w} ${theme}: ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`${w} ${theme}: ${e.message}`));
    await page.goto(URL0 + (hash || ""));
    await page.waitForFunction(() => window.VOTE_RESULTS_PAGE && !window.VOTE_RESULTS_PAGE.state.loading, null, { timeout: 15000 });
    return { ctx, page };
  };
  const step = async (name, fn) => {
    try { await fn(); passed++; console.log(`ok    ${name}`); }
    catch (e) { fails.push(name); console.log(`FAIL  ${name}\n      ${String(e && e.stack || e).split("\n").slice(0, 6).join("\n      ")}`); }
  };
  const bars = (page) => page.$$eval(".vr-q", (secs) => secs.map((s) => ({ q: s.getAttribute("data-q"),
    bars: [...s.querySelectorAll(".vr-bar")].map((b) => ({ id: b.getAttribute("data-opt"), n: Number(b.getAttribute("data-count")), rec: b.classList.contains("vr-bar--rec"), text: b.querySelector(".vr-bar-n").textContent, who: (b.querySelector(".vr-who") || { textContent: "" }).textContent })) })));
  const words = (page) => page.evaluate(() => {
    const clone = document.getElementById("vr").cloneNode(true);
    clone.querySelectorAll(".vr-notes-l, .vr-pre, textarea, .vr-who, .vr-grid tbody, .vr-who-list").forEach((n) => n.remove());
    return clone.innerText;
  });

  try {
    await step("the sample at 1440, light: every bar's count, and We recommend on the right option", async () => {
      const { ctx, page } = await open(1440, 900, "light");
      const got = await bars(page);
      assert.strictEqual(got.length, 19);
      got.forEach((s) => {
        const t = sample.tallies[s.q];
        s.bars.forEach((b) => assert.strictEqual(b.n, b.id === "none" ? t.none : t.opts[b.id], `${s.q} ${b.id}`));
        s.bars.forEach((b) => assert.strictEqual(b.text, `${b.n} of ${t.n}`));
        const rec = RECS[s.q].v;
        assert.deepStrictEqual(s.bars.filter((b) => b.rec).map((b) => b.id), Array.isArray(rec) ? rec : [rec], s.q);
        /* most picked first, No preference last */
        assert.strictEqual(s.bars[s.bars.length - 1].id, "none");
        for (let i = 1; i < s.bars.length - 1; i++) assert.ok(s.bars[i - 1].n >= s.bars[i].n, `${s.q} order`);
      });
      const lede = await page.textContent(".vr-lede");
      assert.strictEqual(lede, "6 people voted. The latest ballot from each name counts.");
      assert.ok(/From results\.json, made /.test(await page.textContent(".vr-src")));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "results-1440-light.png"), fullPage: true });
      await ctx.close();
    });

    await step("every note is listed under its option, and the table at a glance and Who picked what agree with the bars", async () => {
      const { ctx, page } = await open(1440, 900, "light");
      const notes = await page.$$eval(".vr-notes-g li", (ls) => ls.map((l) => l.textContent));
      const want = notesOf(Object.keys(COUNTED));
      assert.strictEqual(notes.length, want.length);
      want.forEach((n) => assert.ok(notes.some((t) => t.endsWith(n.note)), n.note));
      const glance = await page.$$eval(".vr-glance tbody tr", (rs) => rs.map((r) => ({ q: r.querySelector(".vr-jump").getAttribute("data-q"), lead: r.querySelector('[data-k="lead"]').textContent, rec: r.querySelector('[data-k="rec"] .vr-rec-t').textContent, diff: !!r.querySelector('[data-k="rec"] .vr-tag'), split: r.querySelector(".vr-stack") ? r.querySelector(".vr-stack").getAttribute("aria-label") : "", none: r.querySelector('[data-k="none"]').textContent })));
      assert.strictEqual(glance.length, 19);
      glance.forEach((g) => {
        const q = Q.qOf(g.q), t = sample.tallies[g.q];
        const L = C.lead(q, t);
        const names = L.ids.map((id) => Q.optName(q, id));
        assert.ok(g.lead.startsWith(names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0]), `${g.q}: ${g.lead}`);
        assert.ok(g.lead.endsWith(`${L.count} of ${t.n}${L.ids.length > 1 ? " each" : ""}`), g.lead);
        const r = RECS[g.q].v;
        assert.strictEqual(g.rec, `${Q.optName(q, r)}, ${t.opts[r]} of ${t.n}`);
        assert.strictEqual(g.none, `${t.none} of ${t.n}`);
        /* the split bar says each option's count, and the tag marks a row where the most picked isn't ours */
        C.ranked(q, t).filter((o) => o.count).forEach((o) => assert.ok(g.split.indexOf(`${o.name} ${o.count}`) >= 0, `${g.q}: ${g.split}`));
        assert.strictEqual(g.diff, L.ids.indexOf(r) < 0, `${g.q}: Not the most picked`);
      });
      assert.strictEqual(glance.find((g) => g.q === "home").lead, "Compact, 3 of 6");
      const grid = await page.$$eval(".vr-grid tbody tr", (rs) => rs.map((r) => ({ bid: r.getAttribute("data-bid"), cells: [...r.querySelectorAll("td[data-q]")].map((c) => [c.getAttribute("data-q"), c.textContent]) })));
      assert.strictEqual(grid.length, 6);
      const short = await page.evaluate(() => 1);
      void short;
      /* each voter's cells count up to the bars */
      const count = {};
      grid.forEach((r) => r.cells.forEach(([q, t]) => { if (t !== "Not answered") count[q] = (count[q] || 0) + 1; }));
      Q.QS.forEach((q) => assert.strictEqual(count[q.id] || 0, sample.tallies[q.id].n, q.id));
      await ctx.close();
    });

    await step("the Design filter changes the counts and the names, and stays in the address", async () => {
      const { ctx, page } = await open(1440, 900, "dark");
      await page.click('.vr-chip[data-v="design"]');
      assert.ok((await page.evaluate(() => location.hash)).indexOf("role=design") >= 0);
      const got = await bars(page);
      const t = expected(["v1b"]);
      got.forEach((s) => s.bars.forEach((b) => assert.strictEqual(b.n, b.id === "none" ? t[s.q].none : t[s.q].opts[b.id], `${s.q} ${b.id}`)));
      const home = got.find((s) => s.q === "home");
      /* one voter, one spelling: the first ballot's */
      assert.strictEqual(home.bars.find((b) => b.id === "score").who, "Test voter 1");
      assert.strictEqual(await page.$$eval(".vr-grid tbody tr", (r) => r.length), 1);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "results-1440-dark-design.png"), fullPage: true });
      /* the charts only */
      await page.click('.vr-seg-b[data-act="part"][data-v="2"]');
      assert.strictEqual(await page.$$eval(".vr-q", (s) => s.length), 11);
      await page.reload();
      await page.waitForFunction(() => window.VOTE_RESULTS_PAGE && !window.VOTE_RESULTS_PAGE.state.loading);
      assert.strictEqual(await page.$$eval(".vr-q", (s) => s.length), 11, "the filters come back from the address");
      await ctx.close();
    });

    await step("at 390 in both themes: no sideways scroll, 44px targets, Who picked what as a list", async () => {
      for (const theme of ["light", "dark"]) {
        const { ctx, page } = await open(390, 844, theme);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(over <= 0, `${theme}: ${over}px sideways`);
        const small = await page.$$eval("button, a.vr-jump, summary, label.vr-btn", (els) => els.filter((e) => e.offsetParent !== null && !e.closest("table")).map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 30), Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 44 || h < 44));
        assert.deepStrictEqual(small, [], theme);
        assert.ok(await page.isVisible(".vr-who-list") && !(await page.isVisible(".vr-who-table")));
        if (SHOTS) {
          await page.screenshot({ path: path.join(SHOTS, `results-390-${theme}.png`), fullPage: true });
          await page.screenshot({ path: path.join(SHOTS, `results-390-${theme}-top.png`) });
        }
        await ctx.close();
      }
    });

    await step("the page's words: no dashes, no exclamation points, FloraScore one word, the claims rules", async () => {
      const { ctx, page } = await open(1440, 900, "light");
      const text = await words(page);
      const bad = [];
      if (/[–—]/.test(text)) bad.push("a dash");
      if (/!/.test(text)) bad.push("an exclamation point");
      if (/Flora Score|Florascore/.test(text)) bad.push("FloraScore split");
      claims.forEach((r) => { const m = new RegExp(r.re, "i").exec(text); if (m) bad.push(`claims rule ${r.id}: "${m[0]}"`); });
      assert.deepStrictEqual(bad, []);
      await ctx.close();
    });

    await step("Check these lists the replaced ballot, two browsers, the one read from the text and the one held out with its text", async () => {
      const { ctx, page } = await open(1440, 900, "light");
      const items = await page.$$eval(".vr-check-list > li", (ls) => ls.map((l) => l.textContent));
      assert.ok(items.some((t) => /^Test voter 1: an earlier ballot \(C4NM7P/.test(t)), items.join("\n"));
      assert.ok(items.some((t) => /Test voter 3, ballot RYJ9F3: Two browsers/.test(t)), "the first ballot's spelling");
      /* folded under the table at a glance, to one line */
      assert.strictEqual(await page.$eval(".vr-check", (d) => d.open), false);
      assert.ok(/^\d+ things to check, 1 ballot held out until you look$/.test(await page.textContent(".vr-check-n")), await page.textContent(".vr-check-n"));
      assert.ok(await page.evaluate(() => document.querySelector(".vr-glance").compareDocumentPosition(document.querySelector(".vr-check")) & Node.DOCUMENT_POSITION_FOLLOWING), "Check these comes after At a glance");
      assert.ok(items.some((t) => /Test voter 6, ballot NT4K7C: Read from the text/.test(t)));
      assert.ok(items.some((t) => /Test voter 7, ballot JA7MF4: The last line doesn't match/.test(t)));
      assert.ok(items.some((t) => /Test voter 8, ballot Y3ATCD: A test ballot/.test(t)));
      await ctx.close();
    });

    await step("no results.json: Load the votes; pasted Slack ballots count under the latest-per-name rule and stay after a reload", async () => {
      mode.results = "";
      const { ctx, page } = await open(1440, 900, "light");
      assert.strictEqual(await page.textContent("#vr-add-h"), "Load the votes");
      assert.strictEqual(await page.textContent(".vr-lede"), "No votes yet.");
      await page.fill("#vr-paste", read("slack-1-clean.txt"));
      await page.click('[data-act="paste"]');
      assert.ok(/Read 2 ballots, and 1 that can't count/.test(await page.textContent("#vr-paste-say")), await page.textContent("#vr-paste-say"));
      assert.strictEqual(await page.textContent(".vr-lede"), "2 people voted. The latest ballot from each name counts.");
      await page.fill("#vr-paste", read("slack-5-revote.txt"));
      await page.click('[data-act="paste"]');
      assert.strictEqual(await page.textContent(".vr-lede"), "2 people voted. The latest ballot from each name counts.");
      const home = (await bars(page)).find((s) => s.q === "home");
      assert.strictEqual(home.bars.find((b) => b.id === "score").n, 1, "the re-vote's Score first counts, not the first ballot's Compact");
      assert.strictEqual(home.bars.find((b) => b.id === "compact").n, 1, "Test voter 2's Compact");
      await page.reload();
      await page.waitForFunction(() => window.VOTE_RESULTS_PAGE && !window.VOTE_RESULTS_PAGE.state.loading);
      assert.strictEqual(await page.textContent(".vr-lede"), "2 people voted. The latest ballot from each name counts.", "kept in this browser");
      await page.click('[data-act="clear"]');
      assert.strictEqual(await page.textContent(".vr-lede"), "No votes yet.");
      await ctx.close();
      /* with a results.json from the Sheet only, Slack ballots join it: Test voter 2 is in both, one voter */
      mode.results = sheetOnly;
      const o2 = await open(1440, 900, "light");
      assert.strictEqual(await o2.page.textContent(".vr-lede"), "3 people voted. The latest ballot from each name counts.");
      await o2.page.fill("#vr-paste", read("slack-1-clean.txt"));
      await o2.page.click('[data-act="paste"]');
      assert.strictEqual(await o2.page.textContent(".vr-lede"), "4 people voted. The latest ballot from each name counts.");
      await o2.ctx.close();
      mode.results = SAMPLE;
    });

    await step("the hosted Sheet: the results by JSONP from Code.gs with the key, Refresh, and a wrong key said plainly", async () => {
      mode.endpoint = "on";
      mode.results = "";
      const { ctx, page } = await open(1440, 900, "light", "#key=testkey");
      assert.ok(/^From the Sheet, updated /.test(await page.textContent(".vr-src")));
      assert.strictEqual(await page.textContent(".vr-lede"), "3 people voted. The latest ballot from each name counts.");
      const want = C.build(C.readJSON(SH.doGet({ parameter: { op: "results", vote: VOTE, key: "testkey" } }).getContent()).ballots, { vote: VOTE });
      const got = await bars(page);
      got.forEach((s) => s.bars.forEach((b) => assert.strictEqual(b.n, b.id === "none" ? want.tallies[s.q].none : want.tallies[s.q].opts[b.id])));
      await page.click('[data-act="refresh"]');
      await page.waitForFunction(() => !window.VOTE_RESULTS_PAGE.state.loading);
      assert.ok(/^From the Sheet/.test(await page.textContent(".vr-src")));
      await ctx.close();
      const o2 = await open(1440, 900, "light", "#key=wrong");
      assert.ok(/The results key in the address doesn't match/.test(await o2.page.textContent(".vr-head")));
      await o2.ctx.close();
      mode.endpoint = "";
      mode.results = SAMPLE;
    });

    await step("Copy a summary: counts, the most picked and We recommend, no names or notes; the fallback box when the clipboard refuses", async () => {
      const { ctx, page } = await open(1440, 900, "light");
      await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.click('[data-act="copy"]');
      await page.waitForFunction(() => /Copied/.test(document.getElementById("vr-copy-say").textContent));
      const text = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(text.startsWith("Florin app vote results: 6 people voted"), text.slice(0, 80));
      assert.ok(text.indexOf("1. Home screen (6 answered): Compact 3, Score first 2, Day first 1, No preference 0. Most picked: Compact, 3 of 6. We recommend Compact.") >= 0, text);
      ["Test voter", "I can get to any day"].forEach((w) => assert.ok(text.indexOf(w) < 0, w));
      await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error("no")); });
      await page.click('[data-act="copy"]');
      await page.waitForSelector("#vr-copied");
      assert.ok((await page.inputValue("#vr-copied")).startsWith("Florin app vote results"));
      await ctx.close();
    });

    await step("no console errors or warnings in any of the runs", async () => {
      assert.deepStrictEqual(errors.filter((e) => !/results\.json.*404|404 \(Not Found\)/.test(e)), []);
    });
  } finally {
    await br.close();
    server.close();
  }
}

(async () => {
  for (const [name, fn] of tests) {
    try { fn(); passed++; console.log(`ok    ${name}`); }
    catch (e) { fails.push(name); console.log(`FAIL  ${name}\n      ${String(e && e.stack || e).split("\n").slice(0, 8).join("\n      ")}`); }
  }
  if (!NODE_ONLY) {
    if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
    await browser();
  }
  console.log(fails.length ? `\n${fails.length} failed, ${passed} passed` : `\nall ${passed} passed`);
  process.exit(fails.length ? 1 : 0);
})();
