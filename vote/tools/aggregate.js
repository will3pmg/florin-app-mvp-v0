/* Florin app vote: every ballot Will has, counted into results.json for the results page.

     node vote/tools/aggregate.js <file or folder> ... [--out vote/results/results.json] [--vote florin-app-vote-1]
                                  [--include-test] [--since 2026-11-05] [--quiet]

   Inputs, by extension (a folder is read in name order, its own files only):
     .txt   Slack text, as Slack gives it or as pasted: any number of ballots, parts and other messages. Anything that
            isn't a ballot (no header with numbered lines, and no machine line) is passed over
     .json  the script's op=results reply, a results.json, a ballot, or an array of ballots
     .csv   the Votes tab, downloaded from Sheets
   Slack text is read before the Sheet's files, each kind in name order: that order breaks a tie between two ballots of
   one name made in the same second (the later read wins).

   Writes results.json (vote/BALLOT.md) and, beside it, results.js (the same data for a page opened from a file, where
   the browser won't fetch). Prints what it read, who counted, every ballot replaced, flagged or left out and why, and
   each question's counts. Exits 1 when nothing could be read. No network: fetch the Sheet's reply by hand first
   (vote/SETUP.md). The counting is vote/js/count.js on vote/js/ballot.js, the same code the results page runs. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const Q = require(path.join(ROOT, "vote/js/questions.js"));
const B = require(path.join(ROOT, "vote/js/ballot.js"));
const C = require(path.join(ROOT, "vote/js/count.js"));

function args(argv) {
  const o = { inputs: [], out: path.join(ROOT, "vote/results/results.json"), vote: "", includeTest: false, since: "", quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") o.out = argv[++i];
    else if (a === "--vote") o.vote = argv[++i];
    else if (a === "--since") o.since = argv[++i];
    else if (a === "--include-test") o.includeTest = true;
    else if (a === "--quiet") o.quiet = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else o.inputs.push(a);
  }
  return o;
}

/* the vote id from vote/config.js (window.VOTE_CONFIG.vote), else the first vote's */
function configVote() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "vote/config.js"), "utf8");
    const box = { window: {} };
    box.self = box.window;
    vm.runInNewContext(src, box, { timeout: 500 });
    const cfg = box.window.VOTE_CONFIG || box.VOTE_CONFIG;
    if (cfg && cfg.vote) return String(cfg.vote);
  } catch (e) { /* the default below */ }
  return "florin-app-vote-1";
}

/* the files to read: Slack text first, then the Sheet's, each in name order */
function files(inputs) {
  const out = [], missing = [];
  inputs.forEach((p) => {
    let st;
    try { st = fs.statSync(p); } catch (e) { missing.push(p); return; }
    if (st.isDirectory()) {
      fs.readdirSync(p).sort().forEach((f) => {
        const full = path.join(p, f);
        if (/\.(txt|json|csv)$/i.test(f) && fs.statSync(full).isFile() && path.resolve(full) !== path.resolve(OUTFILE)) out.push(full);
      });
    } else out.push(p);
  });
  const slack = out.filter((f) => !/\.(json|csv)$/i.test(f)), sheet = out.filter((f) => /\.(json|csv)$/i.test(f));
  return { list: slack.concat(sheet), missing };
}

let OUTFILE = "";
function run(argv, log) {
  const o = args(argv);
  log = log || ((s) => process.stdout.write(s + "\n"));
  if (o.help || !o.inputs.length) {
    log("node vote/tools/aggregate.js <file or folder> ... [--out vote/results/results.json] [--vote id] [--include-test] [--since YYYY-MM-DD] [--quiet]");
    return { code: o.help ? 0 : 1 };
  }
  OUTFILE = o.out;
  const vote = o.vote || configVote();
  const F = files(o.inputs);
  F.missing.forEach((p) => log(`Not found: ${p}`));
  const all = [], sources = [], dropped = [], replaced = [];
  const rel = (f) => path.relative(process.cwd(), f) || f;
  F.list.forEach((f) => {
    let text;
    try { text = fs.readFileSync(f, "utf8"); } catch (e) { log(`Couldn't read ${rel(f)}: ${e.message}`); return; }
    const r = C.readFile(rel(f), text);
    sources.push({ kind: r.kind, file: rel(f), ballots: r.ballots.length });
    all.push(...r.ballots);
    dropped.push(...r.dropped);
    replaced.push(...(r.replaced || []));
  });
  if (!all.length) {
    log(F.list.length ? "No ballots in " + F.list.map(rel).join(", ") + "." : "Nothing to read.");
    return { code: 1 };
  }
  const res = C.build(all, { vote, includeTest: o.includeTest, since: o.since, sources, dropped, replaced });
  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  const json = JSON.stringify(res, null, 2) + "\n";
  fs.writeFileSync(o.out, json);
  fs.writeFileSync(o.out.replace(/\.json$/i, "") + ".js", "/* made by vote/tools/aggregate.js: the same data as results.json, for a page opened from a file */\nwindow.VOTE_RESULTS = " + json.trim() + ";\n");

  if (!o.quiet) {
    log(`Florin app vote ${vote}: ${res.ballots.length} ${res.ballots.length === 1 ? "voter" : "voters"} counted, the latest ballot from each name.`);
    log("");
    log("Read:");
    sources.forEach((s) => log(`  ${s.file} (${s.kind}): ${s.ballots} ${s.ballots === 1 ? "ballot" : "ballots"}`));
    log("");
    log("Counted:");
    res.ballots.forEach((b) => {
      const role = B.roleWords(b);
      log(`  ${b.name}${role ? `, ${role}` : ""}: ballot ${b.bid}, ${b.at || "no time"}, ${Object.keys(b.picks).length} of ${Q.QS.length} answered (${b.source}${b.file ? `, ${b.file}` : ""})`);
    });
    if (res.replaced.length) {
      log("");
      log("Replaced by a later ballot from the same name (not counted):");
      res.replaced.forEach((r) => log(`  ${r.name}: ballot ${r.bid}, ${r.at || "no time"}, replaced by ${r.by}`));
    }
    if (res.flags.length) {
      log("");
      log("Flagged (counted, but look):");
      res.flags.forEach((f) => log(`  ${f.name}, ballot ${f.bid}: ${C.why(f.what)}`));
    }
    if (res.dropped.length) {
      log("");
      log("Left out:");
      res.dropped.forEach((d) => log(`  ${d.name || "no name"}${d.bid ? `, ballot ${d.bid}` : ""}${d.file ? ` (${d.file}${d.line ? ` line ${d.line}` : ""})` : ""}: ${C.why(d.why)}`));
    }
    log("");
    log("Counts (each option, then the number who answered):");
    Q.QS.forEach((q) => log("  " + C.line(q, res.tallies[q.id])));
    log("");
    log(`Wrote ${rel(o.out)} and ${rel(o.out.replace(/\.json$/i, "") + ".js")}.`);
  }
  return { code: 0, results: res };
}

if (require.main === module) process.exit(run(process.argv.slice(2)).code);
module.exports = { run, args };
