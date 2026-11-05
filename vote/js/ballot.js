/* Florin app vote: the ballot, made and read one way everywhere. UMD: window.VOTE_BALLOT in a browser (after
   questions.js), module.exports in node (it requires ./questions.js). Used by the voting page, the results page,
   vote/tools/aggregate.js and focus/apps-script/test.js.

   One ballot, three forms:
     the Slack text   for people: a header with the marker phrase "Florin app vote", the picks in canonical order, a
                      "Why: ..." line under each pick with a note, and last the machine line in backticks
     the machine line FLORIN-VOTE <format> <vote> key=value ...   b ballot id, n name (percent-encoded), r role id, ro
                      the typed role when r=other, at (UTC, to the second), s seed, p qid:option pairs, w the qids with a
                      note, part k/n when split, and x: FNV-1a 32-bit over the line's UTF-8 up to the space before x=,
                      in base 36, 7 characters. Unknown keys are ignored
     the JSON         { type: "vote", v, vote, bid, vid, name, role, role_other, at, build, seed, picks: [{ q, p, note }] }
   API
     nameKey(name)                     the identity: NFKD, marks removed, lower case, runs of non-letters and non-digits to
                                       one space, trimmed. "  sam   LEE " and "Sam Lee" are one voter
     newBid(), newVid(), newSeed()     ids (the bid from the focus test's code alphabet)
     make(o)                           a ballot from the page's answers ({ qid: { p, note } }), picks in canonical order
     toJSON(b)                         the endpoint's JSON
     text(b, { max, date })            { text, parts }: parts is [text] or, over max characters, the ballot split
     machine(b, part)                  one machine line, without backticks
     parse(text, { source, file })     every ballot in a blob of Slack text (any number of ballots, parts and other
                                       messages): [{ ...ballot, picks: { qid: { p, note } }, ok, flags, line, text }]
     fromJSON(o, { source })           a posted ballot (array picks) or a results.json one (object picks), read alike
     latest(ballots)                   { counted, replaced, flags }: the latest ballot per name counts, whole
     tally(ballots)                    { qid: { n, none, opts: { id: count } } }
   Flags: read_from_text, line_damaged, note_lost, note_extra, check_failed, part_missing, unknown_pick, two_browsers.
   A last line that fails its check (cut short, wrapped past mending, or changed) is line_damaged when the numbered lines
   agree with what's left of it on every pick and the name, and the ballot counts from them; any disagreement is
   check_failed: ok false, held out of the counts. The numbered lines are read by each question's label first (so a
   list Slack turned into bullets keeps its picks and its Why lines), then by number. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./questions.js"));
  else root.VOTE_BALLOT = factory(root.VOTE_Q);
})(typeof self !== "undefined" ? self : this, function (Q) {
  "use strict";
  if (!Q) throw new Error("ballot.js needs questions.js loaded first");

  const FORMAT = 1;
  const MARK = "Florin app vote";
  const ALPHA = "ACDEFHJKMNPRTWXY34679";
  const NOTE_MAX = 280, NAME_MAX = 60, ROLE_MAX = 40;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ROLE_IDS = Q.ROLES.map((r) => r[0]);

  /* ---------- small helpers ---------- */
  const rnd = (n) => {
    try {
      const c = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto : (typeof require === "function" ? require("crypto").webcrypto : null);
      if (c && c.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] % n; }
    } catch (e) { /* Math.random below */ }
    return Math.floor(Math.random() * n);
  };
  const randStr = (len, abc) => { let s = ""; for (let i = 0; i < len; i++) s += abc[rnd(abc.length)]; return s; };
  const newBid = () => randStr(6, ALPHA);
  const newVid = () => randStr(12, "abcdefghijklmnopqrstuvwxyz0123456789");
  const newSeed = () => 1 + rnd(999999);
  const oneLine = (s) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  const noteOf = (s) => oneLine(s).slice(0, NOTE_MAX);
  const nameOf = (s) => oneLine(s).slice(0, NAME_MAX);
  const isoNow = (d) => (d || new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  function nameKey(name) {
    return String(name == null ? "" : name).normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }
  /* UTF-8 bytes, then FNV-1a 32-bit, in base 36 padded to 7 */
  function utf8(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    const out = [], e = unescape(encodeURIComponent(s));
    for (let i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }
  function fnv(s) {
    let h = 0x811c9dc5;
    const b = utf8(s);
    for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  const check = (s) => ("000000" + fnv(s).toString(36)).slice(-7);
  const plural = (n, one, many) => `${n === 0 ? "no" : n} ${n === 1 ? one : many || one + "s"}`;
  /* the voter's local time, for the header: "Nov 5, 2026, 3:04 PM" */
  function local(d) {
    const h = d.getHours(), m = d.getMinutes();
    return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h % 12 || 12}:${m < 10 ? "0" : ""}${m} ${h < 12 ? "AM" : "PM"}`;
  }
  const roleWords = (b) => (b.role ? Q.roleName(b.role, b.role_other) : "");

  /* ---------- making one ---------- */
  /* o: { vote, bid?, vid, name, role, role_other, at?, build, seed, answers: { qid: { p, note } } } */
  function make(o) {
    const picks = [];
    Q.QS.forEach((q) => {
      const a = o.answers && o.answers[q.id];
      if (!a || !a.p || !Q.optOf(q, a.p)) return;
      picks.push({ q: q.id, p: a.p, note: noteOf(a.note) });
    });
    const role = ROLE_IDS.includes(o.role) ? o.role : "";
    return {
      type: "vote", v: FORMAT, vote: String(o.vote || ""), bid: o.bid || newBid(), vid: o.vid || "",
      name: nameOf(o.name), role, role_other: role === "other" ? oneLine(o.role_other).slice(0, ROLE_MAX) : "",
      at: o.at || isoNow(), build: o.build || "dev", seed: Math.floor(+o.seed || 0), picks
    };
  }
  const toJSON = (b) => ({ type: "vote", v: FORMAT, vote: b.vote, bid: b.bid, vid: b.vid || "", name: b.name, role: b.role || "", role_other: b.role_other || "", at: b.at, build: b.build || "dev", seed: b.seed, picks: pickList(b).map((x) => ({ q: x.q, p: x.p, note: x.note || "" })) });
  /* picks as a list in canonical order, from either shape */
  function pickList(b) {
    if (Array.isArray(b.picks)) return b.picks.slice();
    return Q.QS.filter((q) => b.picks && b.picks[q.id]).map((q) => ({ q: q.id, p: b.picks[q.id].p, note: b.picks[q.id].note || "" }));
  }

  /* ---------- the machine line ---------- */
  function machine(b, part) {
    const L = pickList(b);
    const last = !part || part.k === part.n;
    const kv = [["b", b.bid], ["n", encodeURIComponent(b.name)]];
    if (last) {
      kv.push(["r", b.role || ""]);
      if (b.role === "other" && b.role_other) kv.push(["ro", encodeURIComponent(b.role_other)]);
      kv.push(["at", b.at], ["s", String(b.seed)], ["p", L.map((x) => `${x.q}:${x.p}`).join(",")], ["w", L.filter((x) => x.note).map((x) => x.q).join(",")]);
    }
    if (part && part.n > 1) kv.push(["part", `${part.k}/${part.n}`]);
    const head = `FLORIN-VOTE ${FORMAT} ${b.vote} ${kv.map(([k, v]) => `${k}=${v}`).join(" ")}`;
    return `${head} x=${check(head)}`;
  }

  /* ---------- the Slack text ---------- */
  function blocks(b) {
    const L = pickList(b), by = {};
    L.forEach((x) => { by[x.q] = x; });
    const out = [];
    Q.PARTS.forEach((P) => {
      out.push({ head: true, lines: [P.name] });
      Q.inPart(P.n).forEach((q) => {
        const x = by[q.id];
        const lines = [`${q.n}. ${q.label}: ${x ? Q.optName(q, x.p) : "Not answered"}`];
        if (x && x.note) lines.push(`   Why: ${x.note}`);
        out.push({ q: q.id, lines });
      });
    });
    return out;
  }
  function headLines(b, date, part) {
    const L = pickList(b), notes = L.filter((x) => x.note).length, rw = roleWords(b);
    return [
      `${MARK}: ${b.name}${rw ? `, ${rw}` : ""}${part && part.n > 1 ? ` (part ${part.k} of ${part.n})` : ""}`,
      `${L.length} of ${Q.QS.length} answered, ${plural(notes, "note")}. Ballot ${b.bid}, ${local(date)}`
    ];
  }
  /* o: { max (characters, a part's limit), date (the voter's clock; defaults to the ballot's at) } */
  function text(b, o) {
    o = o || {};
    const date = o.date || new Date(b.at);
    const bl = blocks(b);
    const body = (bs) => { const out = []; bs.forEach((x) => { if (x.head && out.length) out.push(""); x.lines.forEach((l) => out.push(l)); }); return out; };
    const whole = headLines(b, date).concat("", body(bl), "", "`" + machine(b) + "`").join("\n");
    const max = +o.max || 0;
    if (!max || whole.length <= max) return { text: whole, parts: [whole] };
    /* split by question blocks, a Why line staying with its pick; every part has the header and its own machine line */
    const reserve = headLines(b, date, { k: 9, n: 9 }).join("\n").length + machine(b, { k: 9, n: 9 }).length + 12;
    const room = Math.max(200, max - reserve);
    const groups = [];
    let cur = [], len = 0;
    bl.forEach((x, i) => {
      /* a part's heading travels with the first pick under it */
      const lines = x.head ? x.lines : x.lines;
      const l = lines.join("\n").length + 1 + (x.head ? 1 : 0);
      const nextIsLast = i === bl.length - 1;
      if (cur.length && len + l > room && !(x.head && nextIsLast)) { groups.push(cur); cur = []; len = 0; }
      cur.push(x); len += l;
    });
    if (cur.length) groups.push(cur);
    /* never end a part on a bare heading */
    for (let g = 0; g < groups.length - 1; g++) {
      const G = groups[g];
      if (G.length > 1 && G[G.length - 1].head) groups[g + 1].unshift(G.pop());
    }
    const n = groups.length;
    const parts = groups.map((G, k) => headLines(b, date, { k: k + 1, n }).concat("", body(G), "", "`" + machine(b, { k: k + 1, n }) + "`").join("\n"));
    return { text: parts.join("\n\n"), parts };
  }

  /* ---------- reading ---------- */
  /* Slack's escaping undone: <url|label> to the label, <url> to the url (mentions and channels left as they are), then
     &lt; &gt; &amp; */
  function unslack(s) {
    return String(s || "")
      .replace(/<((?:https?|mailto|tel):[^>|]*)\|([^>]*)>/g, "$2")
      .replace(/<((?:https?|mailto|tel):[^>]*)>/g, "$1")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  const squash = (s) => String(s || "").toLowerCase().replace(/[\s ]+/g, " ").trim();
  const HEAD_RE = /^\s*(?:[*_~]+\s*)?Florin app vote\s*:\s*(.+?)\s*(?:\(part\s+(\d+)\s+of\s+(\d+)\))?\s*(?:[*_~]+)?\s*$/i;
  const LINE2_RE = /Ballot\s+([A-Z0-9]{6})\b(?:\s*,\s*(.+?))?\s*$/i;
  /* a pick's line: its number ("12." or "12)"), a bullet Slack may have put in its place, or nothing, then the
     question's label, a colon and the option. The label says which question it is, so a list Slack turned into bullets
     or numbered again from 1 still reads right; the number is the fallback for a label that isn't one of ours */
  const ROW_RE = /^\s*(?:(\d{1,2})\s*[.)]|[-*•◦▪‣·∙])?\s*(.+?)\s*:\s+(.+?)\s*$/;
  const WHY_RE = /^\s*(?:[-*•◦▪‣·∙]\s*)?Why\s*:\s?(.*)$/i;
  const byLabel = {};
  Q.QS.forEach((q) => { byLabel[squash(q.label)] = q; });
  /* a line to the question it answers, or null: by its label, else by its number */
  function rowOf(l) {
    const m = ROW_RE.exec(l);
    if (!m) return null;
    const q = byLabel[squash(m[2].replace(/^[*_~]+|[*_~]+$/g, ""))] || (m[1] ? Q.QS[+m[1] - 1] || null : null);
    if (!q) return m[1] ? { n: +m[1], label: m[2], pick: m[3], q: null } : null;
    return { n: q.n, label: m[2], pick: m[3], q };
  }
  const MACH_RE = /FLORIN-VOTE\s+(\d+)\s+(\S+)((?:\s+[a-z]+=[^\s`]*)*)/;
  const unquote = (l) => l.replace(/^(\s*&gt;\s?|\s*>\s?)+/, "");

  function readMachine(raw) {
    const m = MACH_RE.exec(raw);
    if (!m) return null;
    const line = m[0].trim();
    const xi = line.lastIndexOf(" x=");
    const kv = {};
    m[3].trim().split(/\s+/).filter(Boolean).forEach((t) => { const i = t.indexOf("="); if (i > 0) kv[t.slice(0, i)] = t.slice(i + 1); });
    const ok = xi > 0 && kv.x != null && check(line.slice(0, xi)) === kv.x;
    const dec = (v) => { try { return decodeURIComponent(v || ""); } catch (e) { return String(v || ""); } };
    const part = kv.part && /^(\d+)\/(\d+)$/.exec(kv.part);
    return {
      format: +m[1], vote: m[2], ok, line, kv,
      bid: (kv.b || "").toUpperCase(), name: dec(kv.n), role: kv.r != null ? kv.r : null, role_other: dec(kv.ro),
      at: kv.at || "", seed: kv.s != null ? Math.floor(+kv.s || 0) : null,
      p: kv.p != null ? kv.p.split(",").filter(Boolean).map((t) => { const i = t.indexOf(":"); return [t.slice(0, i), t.slice(i + 1)]; }) : null,
      w: kv.w != null ? kv.w.split(",").filter(Boolean) : null,
      part: part ? { k: +part[1], n: +part[2] } : null
    };
  }
  /* "Sam Lee, Design" to a name and a role: the last part is a role when it's one of the roles' words; otherwise it is
     a role typed under Other. Only for ballots read without a machine line */
  function readHead(s) {
    const t = oneLine(s);
    const i = t.lastIndexOf(",");
    if (i < 0) return { name: t, role: "", role_other: "" };
    const tail = t.slice(i + 1).trim(), name = t.slice(0, i).trim();
    const hit = Q.ROLES.find((r) => squash(r[1]) === squash(tail));
    if (hit && hit[0] !== "other") return { name, role: hit[0], role_other: "" };
    return { name, role: "other", role_other: hit ? "" : tail.slice(0, ROLE_MAX) };
  }
  /* "Nov 5, 2026, 3:04 PM", as the voter's clock showed it, to a time (read in this machine's time zone) */
  function readLocal(s) {
    const m = /([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(s || "");
    if (!m) return "";
    const mo = MON.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
    if (mo < 0) return "";
    const h = (+m[4] % 12) + (m[6].toUpperCase() === "PM" ? 12 : 0);
    const d = new Date(+m[3], mo, +m[2], h, +m[5], 0);
    return isNaN(d) ? "" : isoNow(d);
  }
  const qByNum = (n) => Q.QS[n - 1] || null;
  function optByName(q, name) {
    const s = squash(name);
    if (s === squash(Q.NONE.name)) return Q.NONE.id;
    if (s === "not answered") return null;
    const o = q.opts.find((x) => squash(x.name) === s);
    return o ? o.id : undefined;
  }

  /* a machine line cut by a line break (an email client or a narrow paste can wrap it): the next lines joined on, with
     nothing or with a space between, until the check passes. Only a line with no check of its own is mended this way,
     and only a join the check confirms is kept */
  function mend(m, l, lines, i) {
    if (!m || m.ok || m.kv.x != null) return { m, used: 0 };
    let tail = "";
    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
      const next = lines[i + j].replace(/`/g, "").trim();
      if (!next || HEAD_RE.test(next)) break;
      for (const sep of ["", " "]) {
        const m2 = readMachine(l.replace(/\s+$/, "") + sep + tail + next);
        if (m2 && m2.ok) return { m: m2, used: j };
      }
      tail += next;
    }
    return { m, used: 0 };
  }

  /* one blob of Slack text to ballots */
  function parse(blob, o) {
    o = o || {};
    const lines = unslack(blob).split(/\r?\n/).map(unquote);
    /* segments: from a header to the next header; a machine line closes one */
    const segs = [];
    let cur = null;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const l = raw.replace(/`/g, "");
      const h = HEAD_RE.exec(l);
      if (h) { cur = { line: i + 1, head: h[1], part: h[2] ? { k: +h[2], n: +h[3] } : null, rows: [], whys: {}, lastN: null, mach: null, line2: null, raw: [raw] }; segs.push(cur); continue; }
      if (!cur) continue;
      cur.raw.push(raw);
      const m0 = l.indexOf("FLORIN-VOTE") >= 0 ? readMachine(l) : null;
      if (m0) {
        const fixed = mend(m0, l, lines, i);
        for (let j = 1; j <= fixed.used; j++) cur.raw.push(lines[i + j]);
        i += fixed.used;
        cur.mach = fixed.m;
        cur = null;
        continue;
      }
      if (!cur.line2) { const l2 = LINE2_RE.exec(l); if (l2) { cur.line2 = { bid: l2[1].toUpperCase(), when: l2[2] || "" }; continue; } }
      const w = WHY_RE.exec(l);
      if (w && cur.lastN != null) { cur.whys[cur.lastN] = (cur.whys[cur.lastN] ? cur.whys[cur.lastN] + " " : "") + w[1]; continue; }
      const r = rowOf(l);
      if (r) { cur.rows.push(r); cur.lastN = r.n; }
    }
    /* a segment counts only with a header and a list or a machine line */
    const good = segs.filter((s) => s.rows.length || s.mach);
    /* parts of one ballot join by vote and ballot id */
    const groups = [], byKey = {};
    good.forEach((s) => {
      const bid = (s.mach && s.mach.bid) || (s.line2 && s.line2.bid) || "";
      const vote = (s.mach && s.mach.vote) || "";
      const part = (s.mach && s.mach.part) || s.part;
      if (part && part.n > 1 && bid) {
        const k = `${bid}`;
        if (!byKey[k]) { byKey[k] = { parts: [], n: part.n, bid, vote }; groups.push(byKey[k]); }
        byKey[k].parts.push(Object.assign(s, { pk: part.k }));
        if (vote && !byKey[k].vote) byKey[k].vote = vote;
      } else groups.push({ parts: [Object.assign(s, { pk: 1 })], n: 1, bid, vote });
    });
    return groups.map((g) => build(g, o));
  }
  function build(g, o) {
    const flags = [];
    const parts = g.parts.slice().sort((a, b) => a.pk - b.pk);
    const have = new Set(parts.map((p) => p.pk));
    for (let k = 1; k <= g.n; k++) if (!have.has(k)) flags.push("part_missing");
    const last = parts.find((p) => p.pk === g.n && p.mach && p.mach.p) || parts.find((p) => p.mach && p.mach.p) || null;
    const M = last ? last.mach : null;
    const first = parts[0];
    const rows = [], whys = {};
    parts.forEach((p) => { p.rows.forEach((r) => rows.push(r)); Object.keys(p.whys).forEach((n) => { whys[n] = p.whys[n]; }); });
    const anyMach = parts.find((p) => p.mach);
    const okAll = parts.every((p) => !p.mach || p.mach.ok);
    const head = readHead(first.head);
    const b = {
      vote: (M && M.vote) || (anyMach && anyMach.mach.vote) || g.vote || "",
      bid: (M && M.bid) || (anyMach && anyMach.mach.bid) || (first.line2 && first.line2.bid) || "",
      vid: "", name: "", key: "", role: "", role_other: "", at: "", build: "", seed: null,
      picks: {}, source: o.source || "slack", file: o.file || "", line: first.line,
      text: parts.map((p) => p.raw.join("\n")).join("\n"), ok: true, flags
    };
    /* the picks the readable lines give: { qid: option id }, and what couldn't be read */
    const fromText = () => {
      const out = {}, bad = [];
      rows.forEach((r) => {
        const q = r.q || qByNum(r.n);
        if (!q) { bad.push("unknown_pick"); return; }
        const p = optByName(q, r.pick);
        if (p === null) return;
        if (p === undefined || out[q.id]) { bad.push("unknown_pick"); return; }
        out[q.id] = p;
      });
      return { out, bad };
    };
    const fromHead = () => {
      b.name = nameOf(head.name); b.role = head.role; b.role_other = head.role_other;
      b.at = readLocal(first.line2 && first.line2.when);
    };
    if (M && okAll) {
      b.name = nameOf(M.name); b.role = ROLE_IDS.includes(M.role) ? M.role : ""; b.role_other = b.role === "other" ? oneLine(M.role_other).slice(0, ROLE_MAX) : "";
      b.at = M.at; b.seed = M.seed;
      M.p.forEach(([q, p]) => {
        const Qq = Q.qOf(q);
        if (!Qq || !Q.optOf(Qq, p) || b.picks[q]) { flags.push("unknown_pick"); return; }
        b.picks[q] = { p, note: "" };
      });
    } else if (anyMach && !okAll) {
      /* a last line that fails its check. Cut short (no check left) or changed, it can't be trusted alone, but the
         numbered lines can be: the ballot counts from them, flagged, when they and what's left of the last line agree
         on every pick both name, and on the name. Any pick or name they disagree on holds the ballot out */
      const T = fromText();
      const mp = {};
      const ML = M || anyMach.mach;
      (ML && ML.p ? ML.p : []).forEach(([q, p]) => { if (Q.qOf(q) && Q.optOf(q, p) && !(q in mp)) mp[q] = p; });
      const clash = Object.keys(mp).some((q) => q in T.out && T.out[q] !== mp[q]) || Object.keys(mp).some((q) => !(q in T.out));
      const nameClash = ML && ML.kv && ML.kv.n != null && ML.kv.x != null && nameKey(ML.name) !== nameKey(head.name);
      if (!Object.keys(T.out).length || clash || nameClash) {
        b.ok = false; flags.push("check_failed");
        /* what the last line says, so the held-out ballot still names who and what */
        if (ML) { b.name = nameOf(ML.name || head.name); b.at = ML.at || ""; (ML.p || []).forEach(([q, p]) => { if (Q.qOf(q) && Q.optOf(q, p) && !b.picks[q]) b.picks[q] = { p, note: "" }; }); }
        else fromHead();
      } else {
        flags.push("line_damaged");
        fromHead();
        if (ML && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(ML.at || "")) b.at = ML.at;
        if (ML && ML.seed != null) b.seed = ML.seed;
        T.bad.forEach((f) => flags.push(f));
        Object.keys(T.out).forEach((q) => { b.picks[q] = { p: T.out[q], note: "" }; });
      }
    } else {
      flags.push("read_from_text");
      fromHead();
      const T = fromText();
      T.bad.forEach((f) => flags.push(f));
      Object.keys(T.out).forEach((q) => { b.picks[q] = { p: T.out[q], note: "" }; });
    }
    /* the notes, from the readable lines */
    const w = M && M.w ? M.w : null;
    Object.keys(whys).forEach((n) => {
      const q = qByNum(+n);
      if (!q) return;
      const note = noteOf(whys[n]);
      if (!note) return;
      if (b.picks[q.id]) b.picks[q.id].note = note;
      if (w && !w.includes(q.id)) flags.push("note_extra");
    });
    if (w) w.forEach((q) => { if (b.picks[q] && !b.picks[q].note) flags.push("note_lost"); });
    b.key = nameKey(b.name);
    if (!b.key) { b.ok = false; flags.push("no_name"); }
    b.flags = flags.filter((f, i, a) => a.indexOf(f) === i);
    return b;
  }

  /* a posted ballot (picks a list) or a results.json one (picks an object), cleaned the same way */
  function fromJSON(x, o) {
    o = o || {};
    const flags = [];
    const picks = {};
    const list = Array.isArray(x.picks) ? x.picks : Object.keys(x.picks || {}).map((q) => ({ q, p: x.picks[q] && x.picks[q].p, note: x.picks[q] && x.picks[q].note }));
    list.forEach((y) => {
      const q = Q.qOf(y && y.q);
      if (!q || !Q.optOf(q, y.p) || picks[q.id]) { flags.push("unknown_pick"); return; }
      picks[q.id] = { p: y.p, note: noteOf(y.note) };
    });
    const role = ROLE_IDS.includes(x.role) ? x.role : "";
    const b = {
      vote: String(x.vote || ""), bid: String(x.bid || "").toUpperCase(), vid: String(x.vid || ""), name: nameOf(x.name),
      key: "", role, role_other: role === "other" ? oneLine(x.role_other).slice(0, ROLE_MAX) : "", at: String(x.at || ""),
      build: String(x.build || ""), seed: x.seed == null ? null : Math.floor(+x.seed || 0), picks,
      source: o.source || x.source || "sheet", file: o.file || "", ok: true, flags: (Array.isArray(x.flags) ? x.flags.slice() : []).concat(flags)
    };
    b.key = nameKey(b.name);
    if (!b.key) { b.ok = false; b.flags.push("no_name"); }
    b.flags = b.flags.filter((f, i, a) => a.indexOf(f) === i);
    return b;
  }

  /* ---------- counting ---------- */
  /* the latest ballot per name counts, whole: the latest at (the voter's clock), a tie to the one received or read later
     (its place in the list). One ballot seen twice (one bid) is one ballot. Ballots held out (ok false) never count */
  function latest(list) {
    const seen = {}, uniq = [];
    (list || []).forEach((b, i) => {
      if (!b || b.ok === false) return;
      const k = `${b.vote}|${b.bid}`;
      if (b.bid && seen[k]) {
        /* the same ballot from two places: keep the first, fill a note or a vid it lacked */
        const a = seen[k];
        if (!a.vid && b.vid) a.vid = b.vid;
        Object.keys(b.picks).forEach((q) => { if (a.picks[q] && !a.picks[q].note && b.picks[q].note) a.picks[q].note = b.picks[q].note; });
        return;
      }
      const c = Object.assign({}, b, { i });
      if (b.bid) seen[k] = c;
      uniq.push(c);
    });
    const byName = {};
    uniq.forEach((b) => { (byName[b.key] = byName[b.key] || []).push(b); });
    const counted = [], replaced = [], flags = [];
    Object.keys(byName).forEach((k) => {
      const G = byName[k].slice().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.i - b.i));
      const win = G[G.length - 1];
      counted.push(win);
      G.slice(0, -1).forEach((b) => replaced.push({ name: b.name, bid: b.bid, at: b.at, by: win.bid }));
      const vids = G.map((b) => b.vid).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      if (vids.length > 1) flags.push({ name: win.name, bid: win.bid, what: "two_browsers" });
    });
    counted.sort((a, b) => a.i - b.i);
    counted.forEach((b) => { delete b.i; });
    return { counted, replaced, flags };
  }
  function tally(list) {
    const out = {};
    Q.QS.forEach((q) => {
      const opts = {};
      q.opts.forEach((o) => { opts[o.id] = 0; });
      out[q.id] = { n: 0, none: 0, opts };
    });
    (list || []).forEach((b) => {
      Object.keys(b.picks || {}).forEach((q) => {
        const t = out[q], p = b.picks[q] && b.picks[q].p;
        if (!t || !p) return;
        if (p === Q.NONE.id) { t.none++; t.n++; return; }
        if (p in t.opts) { t.opts[p]++; t.n++; }
      });
    });
    return out;
  }

  return { FORMAT, MARK, ALPHA, NOTE_MAX, NAME_MAX, ROLE_MAX, nameKey, newBid, newVid, newSeed, check, fnv, isoNow, local, make, toJSON, pickList, machine, text, unslack, parse, fromJSON, latest, tally, roleWords };
});
