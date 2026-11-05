/* Florin Vote Results: the page Will reads. For Will, private, so it shows our recommendation beside the votes (the
   voting page never does).

   Where the votes come from, tried in this order and named on the page:
     1. the hosted Sheet: config.js's endpoint and #key=<VOTE_KEY> in the address, by JSONP (op=results), with Refresh;
     2. results.json beside the page (made by vote/tools/aggregate.js); from a file, results-data.js, the same data.
        The hosted site (config.js's hosted, stamped by vote/build.js) never has either, so it never asks for them;
     3. neither: a panel to open a results.json or paste Slack ballots.
   What we recommend comes from js/recs.js where the page is Will's own (the claude.ai artifact, a file), or from the
   Sheet's reply, which needs the key: the hosted site doesn't carry recs.js, so a voter who finds the page sees no
   recommendation. With neither, the page shows the votes without it.
   Slack ballots pasted into "Add Slack ballots" are read here by ballot.js, kept in this browser only, and counted with
   the rest under the same rule: the latest ballot from each name counts.

   Every count is made in the browser by count.js and ballot.js from the ballots, for every filter, so the page and
   aggregate.js can't disagree. The role and part filters live in the address's hash (with the key, when there is one).
   window.VOTE_RESULTS_PAGE exposes the state for the checks. */
(function () {
  "use strict";
  const Q = window.VOTE_Q, B = window.VOTE_BALLOT, C = window.VOTE_COUNT;
  const CFG = window.VOTE_CONFIG || {};
  const HOSTED = CFG.hosted === true;
  const VOTE = String(CFG.vote || "florin-app-vote-1");
  const mount = document.getElementById("vr");
  if (!mount || !Q || !B || !C) {
    if (mount) mount.innerHTML = '<p class="vr-empty">The results page couldn\'t load its scripts. Check that js/questions.js, js/ballot.js and js/count.js are beside it.</p>';
    return;
  }
  const root = document.documentElement;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* fine without it */ } },
  };
  const PKEY = `florin-vote-results:pasted:${VOTE}`;
  const TKEY = "florin-vote-results:theme";

  /* ---------------------------------------------------------------- the address: key and filters */
  const hashParams = () => { try { return new URLSearchParams(location.hash.replace(/^#/, "")); } catch (e) { return new URLSearchParams(); } };
  const H = hashParams();
  const KEY = H.get("key") || "";
  const S = {
    role: H.get("role") || "all",
    part: ["1", "2"].indexOf(H.get("part")) >= 0 ? H.get("part") : "both",
    theme: null,
    base: null,          // what the source gave: a results.json or the Sheet's reply
    src: null,           // { kind: "sheet" | "json" | "file" | "none", at, error }
    pasted: [],          // the raw texts pasted, oldest first
    note: "",            // the line under Add Slack ballots
    copied: "",          // the summary text, when the clipboard refused it
    loading: true,
  };
  const saveHash = () => {
    const p = new URLSearchParams();
    if (KEY) p.set("key", KEY);
    if (S.role !== "all") p.set("role", S.role);
    if (S.part !== "both") p.set("part", S.part);
    const h = p.toString();
    try { history.replaceState(null, "", h ? `#${h}` : location.pathname + location.search); } catch (e) { /* the filters still work */ }
  };
  try { const raw = JSON.parse(store.get(PKEY) || "[]"); if (Array.isArray(raw)) S.pasted = raw.filter((x) => typeof x === "string"); } catch (e) { S.pasted = []; }

  /* ---------------------------------------------------------------- theme: Auto, Light, Dark */
  const t0 = store.get(TKEY);
  if (t0 === "light" || t0 === "dark") { S.theme = t0; root.setAttribute("data-theme", t0); }
  const setTheme = (t) => {
    S.theme = t === "light" || t === "dark" ? t : null;
    if (S.theme) { root.setAttribute("data-theme", S.theme); store.set(TKEY, S.theme); }
    else { root.removeAttribute("data-theme"); store.del(TKEY); }
  };

  /* ---------------------------------------------------------------- words */
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const clock = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
  const when = (iso, withDay) => {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return "";
    return withDay === false ? clock(d) : `${MON[d.getMonth()]} ${d.getDate()}, ${clock(d)}`;
  };
  const roleWords = (b) => B.roleWords(b);
  const people = (n) => `${n} ${n === 1 ? "person" : "people"}`;
  const and = (list) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);
  const optName = (q, id) => Q.optName(q, id) || id;
  /* the short names, for the table of who picked what */
  const SHORT = {
    "bm.quick": "Quick tiles", "bm.full": "Full form", "words.A": "Numbers", "checkin.on": "With it", "checkin.off": "Without it",
    "meals.quick": "Quick", "meals.detailed": "One meal", "easy.standard": "Standard", "easy.easy": "Add Easy",
    "cal-ring": "Charts, ring", built: "Florin charts", journal: "Journal", easy: "Easy read", none: "No pref.",
  };
  const shortName = (q, id) => SHORT[`${q.id}.${id}`] || (q.part === 2 ? SHORT[id] : null) || (id === "none" ? SHORT.none : optName(q, id));
  /* what we recommend: the Sheet's reply's (with the key), else recs.js's, else nothing */
  const recs = () => (S.base && S.base.recs && typeof S.base.recs === "object" ? S.base.recs : window.VOTE_RECS || {});
  const hasRecs = () => Object.keys(recs()).length > 0;
  const recOf = (q) => recs()[q.id] || null;
  const recIds = (q) => { const r = recOf(q); return !r ? [] : Array.isArray(r.v) ? r.v : [r.v]; };

  /* ---------------------------------------------------------------- the model: every ballot, counted once */
  function model() {
    const list = [], dropped = [], replaced = [], sources = [];
    let baseFlags = [];
    if (S.base) {
      const r = C.readJSON(S.base, { file: S.src && S.src.kind === "sheet" ? "" : "results.json" });
      list.push(...r.ballots);
      dropped.push(...r.dropped);
      replaced.push(...r.replaced);
      (S.base.sources || []).forEach((s) => sources.push(Object.assign({}, s)));
      baseFlags = Array.isArray(S.base.flags) ? S.base.flags : [];
    }
    let pastedN = 0;
    S.pasted.forEach((t, i) => {
      const r = C.readText(t, { file: `pasted ${i + 1}` });
      pastedN += r.ballots.length;
      list.push(...r.ballots);
      dropped.push(...r.dropped);
    });
    if (S.pasted.length) sources.push({ kind: "slack", file: "pasted here", ballots: pastedN });
    const res = C.build(list, { vote: VOTE, dropped, replaced, sources, generated: S.base && S.base.generated });
    /* a results.json keeps only the ballots that counted, so a flag that needed the replaced ones (two browsers) comes
       from its own list, while that ballot still counts */
    const still = {};
    res.ballots.forEach((b) => { still[b.bid] = 1; });
    baseFlags.forEach((f) => {
      if (f.what === "two_browsers" && still[f.bid] && !res.flags.some((g) => g.bid === f.bid && g.what === f.what)) res.flags.push(Object.assign({}, f));
    });
    return res;
  }

  /* the role chips: every role that voted, with its count, in the questions' order, No role given last */
  const roleKey = (b) => b.role || "none";
  function roleChips(all) {
    const n = {};
    all.forEach((b) => { n[roleKey(b)] = (n[roleKey(b)] || 0) + 1; });
    const chips = [{ id: "all", name: "Everyone", count: all.length }];
    Q.ROLES.forEach((r) => { if (n[r[0]]) chips.push({ id: r[0], name: r[1], count: n[r[0]] }); });
    if (n.none) chips.push({ id: "none", name: "No role given", count: n.none });
    return chips;
  }
  const inView = (all) => (S.role === "all" ? all : all.filter((b) => roleKey(b) === S.role));
  const partsShown = () => Q.PARTS.filter((p) => S.part === "both" || String(p.n) === S.part);

  /* ---------------------------------------------------------------- drawing */
  const seg = (name, label, opts, cur) => `<div class="vr-seg" role="group" aria-label="${esc(label)}">${opts.map(([v, t]) =>
    `<button type="button" class="vr-seg-b" data-act="${esc(name)}" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(t)}</button>`).join("")}</div>`;

  function head(res, all) {
    const n = all.length;
    const src = S.src || { kind: "none" };
    let line = "";
    if (src.kind === "sheet") line = `From the Sheet, updated ${esc(when(src.at, false))}.`;
    else if (src.kind === "json" || src.kind === "file") line = `From results.json, made ${esc(when(S.base && S.base.generated))}.`;
    else if (src.kind === "opened") line = `From the results.json you opened, made ${esc(when(S.base && S.base.generated))}.`;
    const pn = res.sources.filter((s) => s.file === "pasted here").reduce((t, s) => t + s.ballots, 0);
    const pw = `${pn} ${pn === 1 ? "ballot" : "ballots"} pasted here.`;
    const pasted = S.pasted.length ? (line ? ` Plus ${pw}` : `From ${pw}`) : "";
    const err = src.error ? `<p class="vr-src vr-src--err">${esc(src.error)}</p>` : "";
    return `<header class="vr-head">
      <div class="vr-head-top">
        <p class="vr-eyebrow">Florin app vote</p>
        ${seg("theme", "Theme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], S.theme || "auto")}
      </div>
      <h1 class="vr-h1">The results</h1>
      <p class="vr-lede">${n ? `${esc(people(n))} voted. The latest ballot from each name counts.` : "No votes yet."}</p>
      ${line || pasted ? `<p class="vr-src">${line}${esc(pasted)}${src.kind === "sheet" ? ' <button type="button" class="vr-link" data-act="refresh">Refresh</button>' : ""}</p>` : ""}
      ${err}
    </header>`;
  }

  function filters(all) {
    if (!all.length) return "";
    const chips = roleChips(all);
    return `<section class="vr-filters" aria-label="Filters">
      <div class="vr-filter">
        <p class="vr-filter-h" id="vr-role-h">Role</p>
        <div class="vr-chips" role="group" aria-labelledby="vr-role-h">${chips.map((c) =>
          `<button type="button" class="vr-chip" data-act="role" data-v="${esc(c.id)}" aria-pressed="${S.role === c.id}">${esc(c.name)} <span class="vr-num">${c.count}</span></button>`).join("")}</div>
      </div>
      <div class="vr-filter">
        <p class="vr-filter-h">Part</p>
        ${seg("part", "Part", [["both", "Both"], ["1", "The app"], ["2", "The charts"]], S.part)}
      </div>
      ${S.role !== "all" ? `<p class="vr-showing" role="status">Showing ${inView(all).length} of ${all.length}: ${esc((chips.find((c) => c.id === S.role) || { name: "" }).name)}.</p>` : ""}
    </section>`;
  }

  /* what needs Will's eye: replaced ballots, two browsers, ballots read from the text, notes lost, ballots held out */
  function check(res) {
    const items = [];
    const byWhat = (w) => res.flags.filter((f) => f.what === w);
    res.replaced.forEach((r) => items.push(`<li><b>${esc(r.name)}</b>: an earlier ballot (${esc(r.bid)}${r.at ? `, ${esc(when(r.at))}` : ""}) was replaced by a later one (${esc(r.by)}) and isn't counted.</li>`));
    ["two_browsers", "read_from_text", "line_damaged", "note_lost", "note_extra", "part_missing", "unknown_pick"].forEach((w) => byWhat(w).forEach((f) =>
      items.push(`<li><b>${esc(f.name)}</b>, ballot ${esc(f.bid)}: ${esc(C.why(w))}</li>`)));
    res.dropped.forEach((d) => {
      const t = d.why === "check_failed" && d.text ? `<details class="vr-held"><summary>See the ballot as it came</summary><pre class="vr-pre">${esc(d.text)}</pre></details>` : "";
      items.push(`<li><b>${esc(d.name || "No name")}</b>${d.bid ? `, ballot ${esc(d.bid)}` : ""}: ${esc(C.why(d.why))}${t}</li>`);
    });
    if (!items.length) return "";
    /* folded to one line under the table at a glance: housekeeping, not the results */
    const held = res.dropped.filter((d) => d.why === "check_failed").length;
    const sum = `${items.length} ${items.length === 1 ? "thing" : "things"} to check${held ? `, ${held === 1 ? "1 ballot" : `${held} ballots`} held out until you look` : ""}`;
    return `<details class="vr-card vr-check">
      <summary class="vr-check-s"><span class="vr-h2" id="vr-check-h">Check these</span><span class="vr-check-n">${esc(sum)}</span></summary>
      <ul class="vr-check-list" aria-labelledby="vr-check-h">${items.join("")}</ul>
    </details>`;
  }

  const leadText = (q, t) => {
    const L = C.lead(q, t);
    if (!L.count) return "No votes yet";
    const names = L.ids.map((id) => optName(q, id));
    return `${and(names)}, ${L.count} of ${t.n}${L.ids.length > 1 ? " each" : ""}`;
  };
  const recText = (q, t) => {
    const ids = recIds(q);
    if (!ids.length) return "";
    return ids.map((id) => `${optName(q, id)}, ${(t.opts[id] || 0)} of ${t.n}`).join("; ");
  };

  /* how one question's votes split: a segment per option, most picked first and darkest, No preference last and
     lightest, one colour at falling strengths. Its words are the row's */
  const split = (q, t) => {
    const r = C.ranked(q, t);
    if (!t.n) return '<span class="vr-dim">No votes yet</span>';
    const words = r.filter((o) => o.count).map((o) => `${o.name} ${o.count}`).join(", ");
    let k = 0;
    const segs = r.filter((o) => o.count).map((o) => `<i class="vr-seg-${o.none ? "none" : Math.min(3, k++)}" style="flex-grow:${o.count}" title="${esc(`${o.name}: ${o.count}`)}"></i>`).join("");
    return `<span class="vr-stack" role="img" aria-label="${esc(`The votes: ${words}`)}">${segs}</span>`;
  };
  function glance(view, T) {
    const withRecs = hasRecs();
    const rows = partsShown().map((P) => Q.inPart(P.n).map((q) => {
      const t = T[q.id];
      const L = C.lead(q, t), ids = recIds(q);
      /* our recommendation isn't (or isn't alone) the most picked: said in a tag, not a colour */
      const differs = withRecs && L.count && ids.length && !ids.some((id) => L.ids.indexOf(id) >= 0);
      return `<tr${differs ? ' class="is-diff"' : ""}>
        <td class="vr-num">${q.n}</td>
        <th scope="row"><a class="vr-jump" href="#q-${esc(q.id)}" data-q="${esc(q.id)}">${esc(q.label)}</a></th>
        <td class="vr-split" data-k="split" data-label="The votes">${split(q, t)}</td>
        <td data-k="lead" data-label="Most picked">${esc(leadText(q, t))}</td>
        ${withRecs ? `<td data-k="rec" data-label="We recommend"><span class="vr-rec-t">${esc(recText(q, t))}</span>${differs ? '<span class="vr-tag">Not the most picked</span>' : ""}</td>` : ""}
        <td class="vr-tab" data-k="none" data-label="No preference">${t.none} of ${t.n}</td>
      </tr>`;
    }).join("")).join("");
    const nDiff = withRecs ? partsShown().reduce((a, P) => a + Q.inPart(P.n).filter((q) => { const t = T[q.id], L = C.lead(q, t), ids = recIds(q); return L.count && ids.length && !ids.some((id) => L.ids.indexOf(id) >= 0); }).length, 0) : 0;
    return `<section class="vr-card" aria-labelledby="vr-glance-h">
      <h2 class="vr-h2" id="vr-glance-h">At a glance</h2>
      ${withRecs ? `<p class="vr-p">${nDiff ? `On ${nDiff} of ${partsShown().reduce((a, P) => a + Q.inPart(P.n).length, 0)} questions, the most picked isn't what we recommend: those rows say so.` : "On every question with votes, what we recommend is the most picked, or tied for it."}</p>` : ""}
      <div class="vr-scroll" tabindex="0" role="region" aria-label="At a glance, scrolls sideways">
        <table class="vr-table vr-glance">
          <thead><tr><th scope="col">#</th><th scope="col">Question</th><th scope="col">The votes</th><th scope="col">Most picked</th>${withRecs ? '<th scope="col">We recommend</th>' : ""}<th scope="col">No preference</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }

  function question(q, view, T, voters) {
    const t = T[q.id];
    const rec = recOf(q);
    const recSet = recIds(q);
    const who = {};
    view.forEach((b) => { const x = b.picks[q.id]; if (x) (who[x.p] = who[x.p] || []).push(b); });
    const ranked = C.ranked(q, t);
    const scale = Math.max(1, voters);
    const bars = ranked.map((o) => {
      const isRec = recSet.indexOf(o.id) >= 0;
      const names = (who[o.id] || []).map((b) => b.name);
      const w = (100 * o.count) / scale;
      /* the option's line, as the voting page said it (plain where the voting page filled a figure from the model) */
      const op = o.none ? null : Q.optOf(q, o.id);
      const line = op ? op.plain || op.line || "" : "";
      return `<li class="vr-bar${o.none ? " vr-bar--none" : ""}${isRec ? " vr-bar--rec" : ""}" data-opt="${esc(o.id)}" data-count="${o.count}">
        <div class="vr-bar-top">
          <span class="vr-bar-name">${esc(o.name)}${line && !/\{\w+\}/.test(line) ? `<span class="vr-bar-line">${esc(line)}</span>` : ""}</span>
          ${isRec ? '<span class="vr-tag">We recommend</span>' : ""}
          <span class="vr-bar-n vr-num">${o.count} of ${t.n}</span>
        </div>
        <div class="vr-track" aria-hidden="true"><span class="vr-fill" style="width:${w.toFixed(2)}%"></span></div>
        ${names.length ? `<p class="vr-who">${esc(names.join(", "))}</p>` : ""}
      </li>`;
    }).join("");
    const notes = ranked.map((o) => {
      const list = (who[o.id] || []).filter((b) => b.picks[q.id].note);
      if (!list.length) return "";
      return `<div class="vr-notes-g" data-opt="${esc(o.id)}"><h4 class="vr-h4">${esc(o.name)}</h4><ul class="vr-notes-l">${list.map((b) => {
        const rw = roleWords(b);
        return `<li><span class="vr-note-who">${esc(b.name)}${rw ? `, ${esc(rw)}` : ""}:</span> ${esc(b.picks[q.id].note)}</li>`;
      }).join("")}</ul></div>`;
    }).join("");
    const answered = t.n < voters ? `<p class="vr-q-meta">${t.n} of ${voters} answered this one.</p>` : "";
    return `<section class="vr-card vr-q" id="q-${esc(q.id)}" data-q="${esc(q.id)}" aria-labelledby="q-${esc(q.id)}-h">
      <div class="vr-q-head">
        <p class="vr-q-n vr-num">${q.n}</p>
        <div class="vr-q-t">
          <h3 class="vr-h3" id="q-${esc(q.id)}-h" tabindex="-1">${esc(q.label)}</h3>
          <p class="vr-q-title">${esc(q.title || "")}</p>
          ${answered}
        </div>
      </div>
      <div class="vr-q-body">
        <ol class="vr-bars" aria-label="${esc(q.label)}: the votes per option">${bars}</ol>
        ${rec ? `<aside class="vr-rec" aria-label="What we recommend"><p class="vr-rec-say">${esc(rec.say)}</p>${rec.why.map((w) => `<p class="vr-rec-why">${esc(w)}</p>`).join("")}${rec.open ? `<p class="vr-rec-why">Still open: ${esc(rec.open)}</p>` : ""}</aside>` : ""}
      </div>
      <div class="vr-notes">
        <h4 class="vr-notes-h">Why they picked it</h4>
        ${notes || '<p class="vr-none">No notes</p>'}
      </div>
    </section>`;
  }

  function whoPicked(view) {
    if (!view.length) return "";
    const qs = [].concat(...partsShown().map((P) => Q.inPart(P.n)));
    const sorted = view.slice().sort((a, b) => a.name.localeCompare(b.name));
    const cell = (b, q) => { const x = b.picks[q.id]; return x ? esc(shortName(q, x.p)) : '<span class="vr-dim">Not answered</span>'; };
    const table = `<div class="vr-scroll vr-who-table" tabindex="0" role="region" aria-label="Who picked what, scrolls sideways">
      <table class="vr-table vr-grid">
        <thead><tr><th scope="col" class="vr-stick">Voter</th><th scope="col">Role</th><th scope="col">When</th>${qs.map((q) => `<th scope="col"><span class="vr-num">${q.n}</span> ${esc(q.label)}</th>`).join("")}</tr></thead>
        <tbody>${sorted.map((b) => `<tr data-bid="${esc(b.bid)}"><th scope="row" class="vr-stick">${esc(b.name)}</th><td>${esc(roleWords(b)) || '<span class="vr-dim">None given</span>'}</td><td class="vr-num">${esc(when(b.at)) || '<span class="vr-dim">Not known</span>'}</td>${qs.map((q) => `<td data-q="${esc(q.id)}">${cell(b, q)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;
    const list = `<ul class="vr-who-list">${sorted.map((b) => `<li><details class="vr-voter"><summary><b>${esc(b.name)}</b>${roleWords(b) ? `, ${esc(roleWords(b))}` : ""}<span class="vr-dim">${b.at ? `, ${esc(when(b.at))}` : ""}</span></summary>
      <ol class="vr-voter-l">${qs.map((q) => `<li><span class="vr-num">${q.n}</span> ${esc(q.label)}: ${cell(b, q)}</li>`).join("")}</ol></details></li>`).join("")}</ul>`;
    return `<section class="vr-card" aria-labelledby="vr-who-h">
      <h2 class="vr-h2" id="vr-who-h">Who picked what</h2>
      ${table}${list}
    </section>`;
  }

  /* the plain summary for Slack: counts, the most picked and what we recommend. No notes, no names */
  function summary(view, T) {
    const chip = roleChips(lastAll).find((c) => c.id === S.role);
    const who = S.role === "all" ? "" : ` Role: ${chip ? chip.name : S.role}.`;
    const lines = [`Florin app vote results: ${people(view.length)} voted, the latest ballot from each name.${who}`];
    partsShown().forEach((P) => {
      lines.push("", P.name);
      Q.inPart(P.n).forEach((q) => {
        const t = T[q.id];
        const counts = C.ranked(q, t).map((o) => `${o.name} ${o.count}`).join(", ");
        const rec = recOf(q);
        lines.push(`${q.n}. ${q.label} (${t.n} answered): ${counts}. Most picked: ${leadText(q, t)}.${rec ? ` We recommend ${and(recIds(q).map((id) => optName(q, id)))}.` : ""}`);
      });
    });
    lines.push("", "Prototype only. Not for patients.");
    return lines.join("\n");
  }

  function copyBox() {
    return `<section class="vr-card" aria-labelledby="vr-copy-h">
      <h2 class="vr-h2" id="vr-copy-h">Copy a summary</h2>
      <p class="vr-p">Each question's counts, the most picked${hasRecs() ? " and what we recommend" : ""}, as plain text for Slack, for the filters above. No names and no notes.</p>
      <div class="vr-row"><button type="button" class="vr-btn" data-act="copy">Copy a summary</button><span class="vr-say" role="status" id="vr-copy-say"></span></div>
      ${S.copied ? `<label class="vr-label" for="vr-copied">Select all and copy.</label><textarea id="vr-copied" class="vr-text" readonly rows="8">${esc(S.copied)}</textarea>` : ""}
    </section>`;
  }

  function addBox(empty) {
    return `<section class="vr-card vr-add" aria-labelledby="vr-add-h">
      <h2 class="vr-h2" id="vr-add-h">${empty ? "Load the votes" : "Add Slack ballots"}</h2>
      ${empty ? `<p class="vr-p">${HOSTED ? (KEY ? "The Sheet didn't send the votes. Check the key in the address, or open a results.json made by vote/tools/aggregate.js." : "This page reads the votes from the Sheet with the results key in its address: add #key= and the key setup printed to the end of the address. Or open a results.json made by vote/tools/aggregate.js.") : "There's no results.json beside this page yet. Open one made by vote/tools/aggregate.js, or paste ballots from Slack."}</p>
        <div class="vr-row"><label class="vr-btn vr-btn--file" for="vr-file">Open a results.json</label><input type="file" id="vr-file" class="vr-file" accept=".json,application/json"></div>` : ""}
      <p class="vr-p">Paste whole Slack messages, from "Florin app vote:" to the last line. Ballots you paste are counted with the rest, the latest from each name, and stay in this browser only.</p>
      <label class="vr-label" for="vr-paste">Slack ballots</label>
      <textarea id="vr-paste" class="vr-text" rows="6" spellcheck="false"></textarea>
      <div class="vr-row">
        <button type="button" class="vr-btn" data-act="paste">Add these ballots</button>
        ${S.pasted.length ? `<button type="button" class="vr-btn vr-btn--quiet" data-act="clear">Clear what I pasted (${S.pasted.length})</button>` : ""}
        <span class="vr-say" role="status" id="vr-paste-say">${esc(S.note)}</span>
      </div>
    </section>`;
  }

  const foot = () => '<footer class="vr-foot"><p>Names, roles and notes are what voters typed. Share this page only with the team.</p><p>Prototype only. Not for patients.</p></footer>';

  let lastAll = [], lastView = [], lastT = null, lastRes = null;
  function render() {
    if (S.loading) { mount.innerHTML = `${head({ sources: [] }, [])}<p class="vr-empty">Loading the votes.</p>${foot()}`; return; }
    const res = model();
    const all = res.ballots;
    if (S.role !== "all" && !all.some((b) => roleKey(b) === S.role)) S.role = "all";
    const view = inView(all);
    const T = B.tally(view);
    lastAll = all; lastView = view; lastT = T; lastRes = res;
    const empty = !all.length && !S.base;
    const sections = view.length ? partsShown().map((P) => `<div class="vr-part"><h2 class="vr-h2 vr-part-h">${esc(P.name)}</h2>${Q.inPart(P.n).map((q) => question(q, view, T, view.length)).join("")}</div>`).join("") : "";
    mount.innerHTML = [
      head(res, all),
      filters(all),
      view.length ? glance(view, T) : "",
      check(res),
      sections,
      whoPicked(view),
      view.length ? copyBox() : "",
      addBox(empty),
      foot(),
    ].join("");
    window.VOTE_RESULTS_PAGE = { state: S, results: res, view, tallies: T, summary: () => summary(lastView, lastT) };
  }

  /* ---------------------------------------------------------------- loading */
  let cbN = 0;
  function jsonp(url, ms) {
    return new Promise((resolve, reject) => {
      const cb = `__vr${Date.now().toString(36)}${(cbN++).toString(36)}`;
      const s = document.createElement("script");
      let done = false;
      const end = (err, data) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        window[cb] = () => {};
        s.remove();
        if (err) reject(err); else resolve(data);
      };
      const t = setTimeout(() => end(new Error("timeout")), ms);
      window[cb] = (data) => end(null, data);
      s.onerror = () => end(new Error("load"));
      s.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + `callback=${cb}`;
      s.async = true;
      document.head.appendChild(s);
    });
  }
  function fromSheet() {
    const ep = String(CFG.endpoint || "");
    const q = new URLSearchParams({ op: "results", vote: VOTE, key: KEY });
    return jsonp(`${ep}${ep.indexOf("?") >= 0 ? "&" : "?"}${q.toString()}`, 15000).then((r) => {
      if (!r || !r.ok) throw new Error(r && r.error === "key" ? "The results key in the address doesn't match the script's." : r && r.error === "no_key_set" ? "The script has no results key yet: run setup in the script editor." : "The Sheet didn't answer as expected.");
      S.base = r; S.src = { kind: "sheet", at: new Date().toISOString() };
    });
  }
  function fromFile() {
    if (window.VOTE_RESULTS) { S.base = window.VOTE_RESULTS; S.src = { kind: "file" }; return Promise.resolve(); }
    /* the hosted site never carries results.json or results-data.js (vote/build.js keeps voters' names off it), so
       asking for them would only log a 404 */
    if (HOSTED) return Promise.reject(new Error("none"));
    if (/^https?:$/.test(location.protocol)) {
      return fetch("results.json", { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("none");
        return r.json();
      }).then((j) => { S.base = j; S.src = { kind: "json" }; });
    }
    /* from a file, the browser won't fetch: results-data.js carries the same data */
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "results-data.js";
      s.onload = () => { if (window.VOTE_RESULTS) { S.base = window.VOTE_RESULTS; S.src = { kind: "file" }; resolve(); } else reject(new Error("none")); };
      s.onerror = () => reject(new Error("none"));
      document.head.appendChild(s);
    });
  }
  function load() {
    S.loading = true;
    render();
    const sheet = CFG.endpoint && KEY;
    const first = sheet ? fromSheet().catch((e) => {
      S.src = { kind: "none", error: `${e && e.message && e.message !== "timeout" && e.message !== "load" ? e.message : "The Sheet didn't answer in 15 seconds."}${HOSTED ? "" : " Showing results.json instead, if there is one."}` };
      const err = S.src.error;
      return fromFile().then(() => { S.src.error = err; });
    }) : fromFile();
    return first.catch(() => { if (!S.base) S.src = Object.assign({ kind: "none" }, S.src && S.src.error ? { error: S.src.error } : {}); })
      .then(() => { S.loading = false; render(); });
  }

  /* ---------------------------------------------------------------- acting */
  const say = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  mount.addEventListener("click", (ev) => {
    const jump = ev.target.closest(".vr-jump");
    if (jump) {
      ev.preventDefault();
      const sec = document.getElementById(`q-${jump.getAttribute("data-q")}`);
      if (sec) {
        sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        const h = sec.querySelector(".vr-h3");
        if (h) h.focus({ preventScroll: true });
      }
      return;
    }
    const b = ev.target.closest("[data-act]");
    if (!b) return;
    const act = b.getAttribute("data-act"), v = b.getAttribute("data-v");
    if (act === "theme") { setTheme(v); render(); focusAct(act, v); return; }
    if (act === "role") { S.role = v; saveHash(); render(); focusAct(act, v); return; }
    if (act === "part") { S.part = v; saveHash(); render(); focusAct(act, v); return; }
    if (act === "refresh") { load(); return; }
    if (act === "paste") {
      const ta = document.getElementById("vr-paste");
      const text = ta ? ta.value : "";
      if (!text.trim()) { S.note = "Paste a ballot first."; say("vr-paste-say", S.note); return; }
      const r = C.readText(text, { file: "pasted" });
      const n = r.ballots.filter((x) => x.ok !== false && Object.keys(x.picks).length).length;
      if (!r.ballots.length) { S.note = "No ballots in what you pasted. Paste the whole message, from \"Florin app vote:\" to the last line."; say("vr-paste-say", S.note); return; }
      S.pasted.push(text);
      if (!store.set(PKEY, JSON.stringify(S.pasted))) S.note = "Read here, but this browser won't keep them after you leave.";
      else S.note = "";
      S.note = `${n === 1 ? "Read 1 ballot" : `Read ${n} ballots`}${r.ballots.length > n ? `, and ${r.ballots.length - n} that can't count (see Check these)` : ""}. ${S.note}`.trim();
      render();
      focusAct("paste");
      return;
    }
    if (act === "clear") { S.pasted = []; store.del(PKEY); S.note = "Cleared what you pasted."; render(); focusAct("paste"); return; }
    if (act === "copy") {
      const text = summary(lastView, lastT);
      const done = () => { S.copied = ""; render(); say("vr-copy-say", "Copied. Paste it in Slack."); focusAct("copy"); };
      const fallback = () => {
        S.copied = text;
        render();
        const ta = document.getElementById("vr-copied");
        if (ta) { ta.focus(); ta.select(); }
        say("vr-copy-say", "This browser didn't let the page copy. Select all and copy.");
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
      } catch (e) { fallback(); }
    }
  });
  const focusAct = (act, v) => {
    const el = mount.querySelector(`[data-act="${act}"]${v != null ? `[data-v="${v}"]` : ""}`);
    if (el) el.focus();
  };
  mount.addEventListener("change", (ev) => {
    if (ev.target.id !== "vr-file") return;
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try { S.base = JSON.parse(String(fr.result)); S.src = { kind: "opened" }; S.note = ""; }
      catch (e) { S.note = "That file isn't a results.json."; }
      render();
    };
    fr.readAsText(f);
  });
  /* the system's theme, while Auto */
  if (window.matchMedia) {
    const mm = matchMedia("(prefers-color-scheme: dark)");
    const on = () => { if (!S.theme) render(); };
    if (mm.addEventListener) mm.addEventListener("change", on);
  }
  window.addEventListener("hashchange", () => {
    const p = hashParams();
    S.role = p.get("role") || "all";
    S.part = ["1", "2"].indexOf(p.get("part")) >= 0 ? p.get("part") : "both";
    render();
  });
  load();
})();
