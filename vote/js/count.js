/* Florin app vote: the counting. Reads ballots from what Will has (Slack text, the Sheet's reply, a results.json, the
   Votes tab as CSV) and makes results.json (vote/BALLOT.md), all on ballot.js, so tools/aggregate.js and the results
   page count one way: the same reading, the same latest ballot per name (ballot.js latest()), the same tallies.

   UMD: window.VOTE_COUNT in the browser (after questions.js and ballot.js), module.exports in node.

     readFile(name, text)      by the file's extension: .txt Slack text, .json, .csv -> { ballots, dropped }
     readText(text, o)         Slack text -> { ballots, dropped }
     readJSON(value, o)        a ballot, an array of them, a results.json or the script's op=results reply
     readCSV(text, o)          the Votes tab downloaded from Sheets: one row per question answered
     build(list, o)            every ballot read, in read order -> results.json. o: vote, includeTest, since, sources,
                               dropped, replaced, generated
     ranked(q, t)              a question's options by votes, most first, ties in canonical order, No preference last
     lead(q, t)                the most picked: { ids, count } (No preference never leads)
     line(q, t)                "1 Home screen: Compact 5, Score first 2, Day first 1, No preference 1 (9)"
     why(what)                 a flag or a reason a ballot was left out, in words */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./questions.js"), require("./ballot.js"));
  else root.VOTE_COUNT = factory(root.VOTE_Q, root.VOTE_BALLOT);
})(typeof self !== "undefined" ? self : this, function (Q, B) {
  "use strict";
  if (!Q || !B) throw new Error("count.js needs questions.js and ballot.js loaded first");

  /* ---------------------------------------------------------------- reading */

  const readText = (text, o) => {
    o = o || {};
    return { ballots: B.parse(String(text || ""), { source: o.source || "slack", file: o.file || "" }), dropped: [] };
  };

  const readJSON = (value, o) => {
    o = o || {};
    let v = value;
    const out = { ballots: [], dropped: [], replaced: [] };
    if (typeof v === "string") {
      try { v = JSON.parse(v); } catch (e) { out.dropped.push({ why: "not_json", file: o.file || "", line: 0, name: "", bid: "", text: "" }); return out; }
    }
    if (!v || typeof v !== "object") return out;
    if (Array.isArray(v)) {
      v.forEach((x) => { const r = readJSON(x, o); out.ballots.push(...r.ballots); out.dropped.push(...r.dropped); out.replaced.push(...r.replaced); });
      return out;
    }
    if (v.type === "vote") { out.ballots.push(B.fromJSON(v, { source: o.source || "json", file: o.file || "" })); return out; }
    const all = Array.isArray(v.ballots_all) ? v.ballots_all : null;
    const list = all || (Array.isArray(v.ballots) ? v.ballots : null);
    if (!list) return out;
    const sheet = v.source === "sheet";
    list.forEach((x) => {
      const b = B.fromJSON(Object.assign({ vote: v.vote }, x), { source: sheet ? "sheet" : (o.source || x.source || "json"), file: o.file || x.file || "" });
      out.ballots.push(b);
    });
    (Array.isArray(v.dropped) ? v.dropped : []).forEach((d) => out.dropped.push(Object.assign({}, d)));
    /* a results.json holds only the ballots that counted: the ones they replaced travel as its list */
    if (!all && Array.isArray(v.replaced)) v.replaced.forEach((r) => out.replaced.push(Object.assign({}, r)));
    return out;
  };

  /* CSV as Sheets downloads it: quoted fields, doubled quotes, new lines inside quotes */
  const csv = (text) => {
    const rows = [];
    const s = String(text || "").replace(/^﻿/, "");
    let row = [], f = "", q = false;
    const end = () => { row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; };
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) {
        if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(f); f = ""; }
      else if (ch === "\n") end();
      else if (ch === "\r") { if (s[i + 1] === "\n") i++; end(); }
      else f += ch;
    }
    if (f !== "" || row.length) end();
    return rows;
  };

  const readCSV = (text, o) => {
    o = o || {};
    const rows = csv(text);
    const out = { ballots: [], dropped: [], replaced: [] };
    if (rows.length < 2) return out;
    const head = rows[0].map((h) => h.trim());
    if (head.indexOf("bid") < 0 || head.indexOf("qid") < 0) return out;
    const get = (r, h) => { const i = head.indexOf(h); return i < 0 || r[i] == null ? "" : String(r[i]); };
    const by = {}, order = [];
    rows.slice(1).forEach((r) => {
      const k = get(r, "vote") + "|" + get(r, "bid");
      if (!by[k]) {
        by[k] = { vote: get(r, "vote"), bid: get(r, "bid"), vid: get(r, "vid"), name: get(r, "name"), role: get(r, "role"),
          role_other: get(r, "role_other"), at: get(r, "at"), build: get(r, "build"), seed: get(r, "seed") === "" ? null : get(r, "seed"), picks: [] };
        order.push(k);
      }
      by[k].picks.push({ q: get(r, "qid"), p: get(r, "pick"), note: get(r, "note") });
    });
    order.forEach((k) => out.ballots.push(B.fromJSON(by[k], { source: "sheet", file: o.file || "" })));
    return out;
  };

  const readFile = (name, text) => {
    const ext = (String(name).match(/\.([a-z0-9]+)$/i) || [])[1];
    const e = ext ? ext.toLowerCase() : "txt";
    if (e === "json") return Object.assign({ kind: "json" }, readJSON(text, { file: name }));
    if (e === "csv") return Object.assign({ kind: "sheet" }, readCSV(text, { file: name }));
    return Object.assign({ kind: "slack", replaced: [] }, readText(text, { file: name }));
  };

  /* ---------------------------------------------------------------- results.json */

  const nPicks = (b) => Object.keys(b.picks || {}).length;
  const slim = (b) => {
    const picks = {};
    Q.QS.forEach((q) => { const x = b.picks && b.picks[q.id]; if (x) picks[q.id] = { p: x.p, note: x.note || "" }; });
    const o = { bid: b.bid, name: b.name, key: b.key || B.nameKey(b.name), role: b.role || "", role_other: b.role_other || "",
      at: b.at || "", source: b.source || "", vid: b.vid || "", flags: (b.flags || []).slice(), picks };
    if (b.file) o.file = b.file;
    return o;
  };

  const build = (list, o) => {
    o = o || {};
    const vote = o.vote || "";
    const dropped = (o.dropped || []).map((d) => Object.assign({}, d));
    const keep = [];
    (list || []).forEach((b0) => {
      /* a ballot read from the text carries no vote id: it is this vote's */
      const b = b0.vote ? b0 : Object.assign({}, b0, { vote });
      const where = { name: b.name || "", bid: b.bid || "", file: b.file || "", line: b.line || 0, text: b.text || "" };
      if (b.ok === false) { dropped.push(Object.assign(where, { why: (b.flags || []).indexOf("check_failed") >= 0 ? "check_failed" : "no_name" })); return; }
      if (!nPicks(b)) { dropped.push(Object.assign(where, { why: "empty" })); return; }
      if (vote && b.vote !== vote) {
        if (o.includeTest && b.vote === vote + "-test") { keep.push(b); return; }
        dropped.push(Object.assign(where, { why: /-test$/.test(b.vote) ? "test" : "other_vote", vote: b.vote }));
        return;
      }
      if (o.since && b.at && b.at < o.since) { dropped.push(Object.assign(where, { why: "before_since" })); return; }
      keep.push(b);
    });
    const L = B.latest(keep);
    const flags = [];
    L.counted.forEach((b) => (b.flags || []).forEach((f) => flags.push({ name: b.name, bid: b.bid, what: f })));
    L.flags.forEach((f) => flags.push(Object.assign({}, f)));
    return {
      v: 1, vote, generated: o.generated || B.isoNow(),
      sources: (o.sources || []).map((s) => Object.assign({}, s)),
      ballots: L.counted.map(slim),
      replaced: (o.replaced || []).map((r) => Object.assign({}, r)).concat(L.replaced),
      flags, dropped,
      tallies: B.tally(L.counted),
    };
  };

  /* ---------------------------------------------------------------- reading the counts */

  const ranked = (q, t) => {
    const idx = {};
    q.opts.forEach((x, i) => { idx[x.id] = i; });
    const opts = q.opts.map((x) => ({ id: x.id, name: x.name, count: (t && t.opts && t.opts[x.id]) || 0 }))
      .sort((a, b) => b.count - a.count || idx[a.id] - idx[b.id]);
    opts.push({ id: Q.NONE.id, name: Q.NONE.name, count: (t && t.none) || 0, none: true });
    return opts;
  };
  const lead = (q, t) => {
    const r = ranked(q, t).filter((x) => !x.none);
    const top = r.length ? r[0].count : 0;
    if (!top) return { ids: [], count: 0 };
    return { ids: r.filter((x) => x.count === top).map((x) => x.id), count: top };
  };
  const line = (q, t) => `${q.n} ${q.label}: ${ranked(q, t).map((x) => `${x.name} ${x.count}`).join(", ")} (${(t && t.n) || 0})`;

  const WHY = {
    two_browsers: "Two browsers sent ballots under this name; the latest counts. If they're two people, ask one to add a last name.",
    read_from_text: "Read from the text: the ballot's last line was missing, so its picks were read from the numbered lines.",
    note_lost: "A note named in the ballot's last line wasn't in the text.",
    note_extra: "A note the ballot's last line didn't name was kept.",
    part_missing: "A part of a ballot sent in parts wasn't found; what was there counts.",
    unknown_pick: "A pick the questions don't know was left out; the rest of the ballot counts.",
    check_failed: "The last line doesn't match its check, so the ballot is held out until you look.",
    no_name: "No name, so it can't be counted.",
    empty: "No picks, so it isn't a ballot.",
    test: "A test ballot, left out.",
    other_vote: "A ballot for another vote, left out.",
    before_since: "Made before the date asked for, left out.",
    not_json: "Not readable as JSON.",
  };
  const why = (what) => WHY[what] || String(what || "");

  return { readText, readJSON, readCSV, readFile, csv, build, slim, ranked, lead, line, why, WHY };
});
