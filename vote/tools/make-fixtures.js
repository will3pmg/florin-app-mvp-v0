/* Makes vote/tools/fixtures/: made-up ballots for the tests, never real results. The voters are "Test voter 1" to
   "Test voter 8"; six of them count, which is the test sample. Run it again when the ballot format or the questions
   change:
     node vote/tools/make-fixtures.js
   It writes, in the order aggregate.js reads them (Slack text first, by name, then the Sheet):
     slack-1-clean.txt          a channel as pasted: Will's own message, Test voters 1 and 2, and Test voter 7 with a
                                pick changed in the machine line (its check fails, so it is held out)
     slack-2-escaped.txt        Test voter 4 as Slack's API gives it: a quoted message, &amp; &lt; &gt; and a link
     slack-3-parts.txt          Test voter 5, split in two messages
     slack-4-no-machine-line.txt  Test voter 6 with the last line deleted (read from the text)
     slack-5-revote.txt         Test voter 1 again, later, typed "test  VOTER 1", with new picks
     sheet.json                 the script's op=results reply, made by Code.gs in the stand-in: Test voters 2 and 4's
                                ballots again (each one ballot), Test voter 3 from two browsers
     votes.csv                  the Votes tab as Sheets downloads it: Test voter 4's ballot again, and Test voter 8's
                                test ballot (left out)
   The times are fixed, in UTC, and the Slack headers read in New York time. */
"use strict";
const fs = require("fs");
const path = require("path");
process.env.TZ = process.env.TZ || "America/New_York";

const ROOT = path.join(__dirname, "..", "..");
const Q = require(path.join(ROOT, "vote/js/questions.js"));
const B = require(path.join(ROOT, "vote/js/ballot.js"));
const { makeGas, loadScript } = require(path.join(ROOT, "focus/apps-script/gas-stub.js"));
const OUT = path.join(__dirname, "fixtures");
const VOTE = "florin-app-vote-1";

/* the sample: who, when, and what they picked (qid: [option, note]) */
const SIX = ["c-score", "c-trend", "c-parts", "c-week", "c-month", "c-timing", "c-often", "c-form", "c-symptoms", "c-checkin", "c-pattern"];
const charts = (list) => { const o = {}; SIX.forEach((q, i) => { if (list[i] !== undefined && list[i] !== null) o[q] = Array.isArray(list[i]) ? list[i] : [list[i], ""]; }); return o; };
const V = {
  v1: { bid: "C4NM7P", vid: "a1b2c3d4e5f6", name: "Test voter 1", role: "design", at: "2026-11-05T15:10:00Z", seed: 4821,
    a: Object.assign({
      home: ["compact", "I can get to any day in one tap."], history: ["calendar", ""], bm: ["quick", ""], words: ["C", "Plain words, and no numbers to explain."],
      checkin: ["on", ""], meals: ["quick", "Nobody types a whole meal at dinner."], easy: ["easy", ""], onboard: ["short", ""],
    }, charts(["rings", "built", "built", ["rings", "The rings read at a glance."], "cal-ring", "built", "built", "bento", "built", "journal", "none"])) },
  v1b: { bid: "H7KC4X", vid: "a1b2c3d4e5f6", name: "test  VOTER 1", role: "design", at: "2026-11-05T19:40:00Z", seed: 4821,
    a: Object.assign({
      home: ["score", "On a second look, the score first is what people open the app for."], history: ["calendar", ""], bm: ["quick", ""], words: ["C", ""],
      checkin: ["on", ""], meals: ["quick", ""], easy: ["easy", ""], onboard: ["short", ""],
    }, charts(["rings", "built", "built", ["rings", "Still the rings for the week."], "cal-ring", "built", "built", "bento", "built", "journal", "built"])) },
  v2: { bid: "KM4TRA", vid: "k2m9x0a1b2c3", name: "Test voter 2", role: "product", at: "2026-11-05T15:30:00Z", seed: 1207,
    a: { home: ["compact", ""], history: ["list", "A list is what people expect from a log."], bm: ["full", ""], words: ["A", ""],
      checkin: ["on", ""], meals: ["detailed", "One meal at a time keeps the times right."], easy: ["standard", ""], onboard: ["full", ""] } },
  v3a: { bid: "PEX7WD", vid: "m3n4p5q6r7s8", name: "Test voter 3", role: "clinical", at: "2026-11-05T16:00:00Z", seed: 330,
    a: Object.assign({ home: ["score", ""], history: ["calendar", ""], bm: ["quick", ""], words: ["A", "Clinicians read the numbers straight across."],
      checkin: ["on", ""], meals: ["quick", ""], easy: ["standard", ""], onboard: ["full", ""] },
    charts(["built", "built", "journal", "built", "built", "built", "built", "journal", "built", "built", "built"])) },
  v3b: { bid: "RYJ9F3", vid: "t9u8v7w6x5y4", name: "Test Voter 3", role: "clinical", at: "2026-11-05T18:30:00Z", seed: 9112,
    a: Object.assign({ home: ["score", "The score with its sentence is what a clinician would ask about."], history: ["calendar", ""], bm: ["quick", ""], words: ["A", "Clinicians read the numbers straight across."],
      checkin: ["on", ""], meals: ["quick", ""], easy: ["easy", ""], onboard: ["full", ""] },
    charts(["built", "built", "journal", "rings", "cal-ring", "built", "built", ["journal", "Counts written out are easy to check."], "built", "built", "built"])) },
  v4: { bid: "DFH3MN", vid: "c3d4e5f6g7h8", name: "Test voter 4", role: "other", role_other: "Patient advocate", at: "2026-11-05T17:05:00Z", seed: 77,
    a: Object.assign({ home: ["day", "Today's logs first & the score small <it reads calmer>."], history: ["calendar", ""], bm: ["quick", "Two taps is right, see example.com for how others do it."],
      words: ["C", ""], checkin: ["off", "A weekly quiz feels like homework."], meals: ["quick", ""], easy: ["easy", "My parents would turn this on."], onboard: ["short", ""] },
    charts(["easy", "easy", "none", "rings", "cal-ring", "easy", "easy", "easy", "easy", "none", "none"])) },
  v5: { bid: "WX69AE", vid: "e5f6g7h8i9j0", name: "Test voter 5", role: "engineering", at: "2026-11-05T17:45:00Z", seed: 5150,
    a: Object.assign({ home: ["compact", "The week of day buttons is the fastest way around, and it matches the current app's home, so nobody has to learn a new map. The strip keeps FloraScore in view without taking the whole first screen."],
      history: ["list", "The list is simpler to build and test, and every day reads the same way as on Today."],
      bm: ["quick", "Quick tiles save a tap for the people who log most often, and the form is still one tap away."],
      words: ["C", "Seven of our own words avoid the licence question and still map to steps for a report later."],
      checkin: ["on", "Four questions a week is light enough, and it is the one reason to come back each week."],
      meals: ["quick", "Voice is the only way most people will log a meal every day, and the food check needs every day."],
      easy: ["easy", "One setting is cheaper to keep than a second app, and the logs stay the same underneath."],
      onboard: ["short", "Asking later, when the answer changes something, keeps day 1 short and every question earns its place."] },
    charts([["oura", "The dark gauge stands out on Today, and it is the look people already know from rings and watches."],
      ["oura", "The same gauge over time keeps the two cards alike."], "built", ["rings", "Rings for the week, as Will picked, read in one glance."],
      ["rings", "The month as rings matches the week."], "built", "built", "built", "built", "built", ["oura", "The same dark card for patterns, so Insights reads as one set."]])) },
  v6: { bid: "NT4K7C", vid: "g7h8i9j0k1l2", name: "Test voter 6", role: "", at: "2026-11-05T18:05:00Z", seed: 640,
    a: Object.assign({ home: ["compact", ""], history: ["calendar", ""], bm: ["quick", ""], words: ["B", "Five words are enough for most people."],
      checkin: ["on", ""], meals: ["quick", ""], easy: ["standard", ""], onboard: ["short", ""] },
    charts(["rings", "rings", "built", "rings", "rings", "rings", "rings", "built", "built", "built", "none"])) },
  v7: { bid: "JA7MF4", vid: "j0k1l2m3n4o5", name: "Test voter 7", role: "marketing", at: "2026-11-05T16:20:00Z", seed: 2,
    a: { home: ["day", ""], history: ["list", ""], bm: ["full", ""], words: ["B", ""], checkin: ["off", ""], meals: ["detailed", ""], easy: ["standard", ""], onboard: ["full", ""] } },
  v8: { bid: "Y3ATCD", vid: "n4o5p6q7r8s9", name: "Test voter 8", role: "leadership", at: "2026-11-05T19:00:00Z", seed: 8, vote: VOTE + "-test",
    a: { home: ["compact", "Will's own test run."], history: ["calendar", ""] } },
};
const ballot = (k) => {
  const v = V[k];
  const answers = {};
  Object.keys(v.a).forEach((q) => { answers[q] = { p: v.a[q][0], note: v.a[q][1] }; });
  return B.make({ vote: v.vote || VOTE, bid: v.bid, vid: v.vid, name: v.name, role: v.role, role_other: v.role_other || "", at: v.at, build: "vote.20261105.test01", seed: v.seed, answers });
};
const slack = (k, o) => B.text(ballot(k), o).parts;

/* Slack's API escaping, as a message's text comes back from a search */
const escaped = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\bexample\.com\b/g, "<http://example.com|example.com>");
const quoted = (s) => s.split("\n").map((l) => "&gt; " + l).join("\n");

const files = {};
const will = "Will, 2:58 PM\nFlorin app vote: please send your picks by Friday.\nOpen the link, pick through the 19 questions, then paste what the page copies here.\n";
const v7 = slack("v7")[0].replace(/p=home:day,/, "p=home:compact,");
files["slack-1-clean.txt"] = [will, "Test voter 1, 3:11 PM", slack("v1")[0], "", "Test voter 2, 3:31 PM", slack("v2")[0], "", "Test voter 7, 4:21 PM", v7, ""].join("\n");
files["slack-2-escaped.txt"] = "Test voter 4, 5:06 PM\n" + quoted(escaped(slack("v4")[0])) + "\n";
const parts = slack("v5", { max: 1800 });
if (parts.length !== 2) throw new Error("Test voter 5 should split in two parts at 1,800 characters, not " + parts.length);
files["slack-3-parts.txt"] = ["Test voter 5, 5:46 PM", parts[0], "", "Test voter 5, 5:46 PM", parts[1], ""].join("\n");
files["slack-4-no-machine-line.txt"] = "Test voter 6, 6:06 PM\n" + slack("v6")[0].split("\n").filter((l) => l.indexOf("FLORIN-VOTE") < 0).join("\n").trim() + "\n";
files["slack-5-revote.txt"] = "Test voter 1, 7:41 PM\nChanged my mind on Home.\n" + slack("v1b")[0] + "\n";

/* the Sheet: the ballots posted to Code.gs as the voting page posts them, then its op=results reply */
let clock = Date.UTC(2026, 10, 5, 20, 0, 0);
const g = makeGas({ now: () => clock, properties: { VOTE_KEY: "fixturekey" } });
const c = loadScript(g);
c.setup();
const post = (k) => { clock += 60000; return JSON.parse(c.doPost({ parameter: { op: "vote" }, postData: { contents: JSON.stringify(B.toJSON(ballot(k))) } }).getContent()); };
["v2", "v3a", "v3b", "v4", "v8"].forEach((k) => { const r = post(k); if (!r.ok) throw new Error(k + " " + JSON.stringify(r)); });
const reply = JSON.parse(c.doGet({ parameter: { op: "results", vote: VOTE, key: "fixturekey" } }).getContent());
if (!reply.ok) throw new Error(JSON.stringify(reply));
/* the reply holds only this vote's ballots: v2, v3a, v3b and v4 (v8 is a test ballot, under its own vote id) */
reply.generated = "2026-11-05T20:10:00Z";
files["sheet.json"] = JSON.stringify(reply, null, 2) + "\n";
/* the Votes tab as CSV: Test voter 4's rows and Test voter 8's test rows */
const rows = g.rowsOf("Votes").filter((r) => r.name === "Test voter 4" || r.name === "Test voter 8");
const head = c.VOTE_HEAD;
const cellOut = (v) => { const s = v instanceof Date ? v.toISOString().slice(0, 19).replace("T", " ") : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
files["votes.csv"] = [head.join(",")].concat(rows.map((r) => head.map((h) => cellOut(r[h] === undefined ? "" : r[h])).join(","))).join("\n") + "\n";

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  Object.keys(files).forEach((f) => fs.writeFileSync(path.join(OUT, f), files[f]));
  console.log("wrote " + Object.keys(files).map((f) => `${f} (${files[f].length})`).join(", "));
}
module.exports = { V, VOTE, ballot, files };
