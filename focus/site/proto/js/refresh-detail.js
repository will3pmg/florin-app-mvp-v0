/* Florin app refresh: the detail pages, with the depth Oura's detail pages have, drawn in the Florin app's own design
   and following the phone's theme (Will, Nov 7: "When you click in you get more OURA ring style data behind each
   insight, but in the current florin design (not fixed to dark mode)").
   Each detail page (RU.idetail: FloraScore, Timing, How often, Form, Symptoms, the weekly check-in and Possible
   patterns) keeps the core's page and adds Oura's pattern to it, sized to what each measure has:
   - the headline: the big reading, a state word for where it sits against the person's own usual (never a judgement),
     and one sentence in Lora that answers the page's question for the stretch picked
   - contributors: a row a part, each a short track with the person's usual as the band and a marker for now, with a
     word for where it sits (FloraScore's four parts each open their own page). Symptoms' rows are the core's "Each
     symptom", moved up; the check-in's are the core's four strips
   - a day by day chart with a scrubber: tap or drag across it (or the arrow keys on it) and the day picked shows its
     reading and its reasons (L.dayWhy) under the chart. 90 days is a column a week, as every 90-day chart is
   - What moved, and what stayed the same: two or three sentences against the stretch before (L.prevSpan), in counts
   - then the core's own figures, What shaped this, Ask about this, the table twin and Next
   Every page follows the range picked (7, 30 or 90 days; the range tabs stay in step with Insights through S.ins.range).
   Free keeps the core's paywall: a detail is membership, so this module draws nothing on Free. A flagged today is read
   against nothing: a Teal ring in no count, and RU.FLAG_DAY when it is picked. Before day 14 the charts draw every
   reading in Ink 3 and nothing is compared.
   It registers into window.FLORIN_EXT and wraps RU.idetail (CLAUDE.md, Extension hooks); it never edits a core file.
   If anything here throws, the core's page is drawn instead. Your days (k "days") and one pattern stay as they are.
   Copy rules hold: no em dashes, no exclamation points, no medical claims, every figure from the model. */
(function () {
  const MOD = "refresh-detail";
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, EXT = window.FLORIN_EXT, C = window.FLC;
  if (!FL || !L || !RU || !AD || !EXT || !C || !RU.idetail) return;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, TODAY = L.TODAY, lin = C.lin;
  const warn = (what, e) => console.warn(`Florin ${MOD}: ${what}`, e);

  /* ---------- small helpers ---------- */
  const n1 = (v) => Math.round(v * 10) / 10;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const join = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const upper1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const short = (d) => { const x = L.dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const dayLong = (d) => (d === TODAY ? "Today" : `${Ut.DOW[L.dateOf(d).getDay()]}, ${short(d)}`);
  const mins = (h) => Math.round(h * 60) / 60;
  const hourLbl = (h) => { const hh = ((Math.round(h) % 24) + 24) % 24; return `${hh % 12 || 12} ${hh >= 12 ? "PM" : "AM"}`; };
  const winText = (u) => `${T(u.tLo).replace(/ AM$/, "")} to ${T(u.tHi)}`;
  const nText = (a, b) => (a === b ? `${a}` : `${a} to ${b}`);
  const RANGE = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };
  const FLAG_REL = "Not read against your usual today";
  const NAME = { score: "FloraScore", timing: "Timing", often: "Frequency", form: "Form", sym: "Symptoms", ck: "Weekly check-in" };
  /* a usual share in words: rounding 0.96 to "10 in 10" would read as every day and hide the rate a word compares with */
  const usually = (p, noun) => { const r = Math.round(p * 10); return p >= 0.995 ? `Usually every ${noun}` : r >= 10 ? `Usually nearly every ${noun}` : r < 1 ? `Usually under 1 in 10 ${noun}s` : `Usually ${r} in 10 ${noun}s`; };
  const CKN = { pain: "Belly pain", way: "In the way", bloat: "Bloating", settled: "Habits" };
  const sw = (tone, text) => (text ? `<span class="dt-sw is-${tone}">${esc(text)}</span>` : "");
  const svg = (w, h, body, aria) => `<svg class="c-chart dv-chart dt-svg" viewBox="0 0 ${n1(w)} ${n1(h)}" role="img" aria-label="${esc(aria || "")}">${body}</svg>`;
  const tx = (x, y, t, cls, anchor) => `<text class="${cls}" x="${n1(x)}" y="${n1(y)}"${anchor ? ` text-anchor="${anchor}"` : ""}>${esc(t)}</text>`;
  const ringAt = (x, y, r) => `<circle class="dv-ring" cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}"/>`;
  const spacer = (x, y, r) => `<circle class="dv-sp" cx="${n1(x)}" cy="${n1(y)}" r="${n1(r + 1.5)}"/>`;
  /* a label above a point, kept inside the chart */
  const labelAt = (x, y, t, w) => {
    const lw = String(t).length * 11 * 0.52;
    let anchor = "middle", ax = x;
    if (x - lw / 2 < 2) { anchor = "start"; ax = Math.max(2, x - 6); } else if (x + lw / 2 > w - 2) { anchor = "end"; ax = Math.min(w - 2, x + 6); }
    return tx(ax, y, t, "dv-newlbl", anchor);
  };
  const lg = (cls, text) => `<span><i class="sw ${cls}"></i>${esc(text)}</span>`;
  const monOf = (d) => d - ((L.dateOf(d).getDay() + 6) % 7);
  /* the days a stretch covers, as Monday to Sunday weeks (the first and last cut to the stretch) */
  const weeksOf = (F) => {
    const out = [];
    F.forEach((f) => { const w = monOf(f.d); let g = out[out.length - 1]; if (!g || g.w !== w) out.push((g = { w, days: [] })); g.days.push(f); });
    return out.map((g) => Object.assign(g, { d0: g.days[0].d, d1: g.days[g.days.length - 1].d }));
  };
  const weekName = (g) => (g.d1 >= TODAY ? "This week" : RU.spanText(g.d0, g.d1));
  /* x ticks: every day up to 7, else the first, the middle and the last (Today when the last is today) */
  const ticks = (N, label) => (N <= 7 ? Array.from({ length: N }, (_, i) => i) : [0, Math.floor((N - 1) / 2), N - 1]).map((i, k, all) => ({ i, t: label(i), a: N <= 7 ? "middle" : k === 0 ? "start" : k === all.length - 1 ? "end" : "middle" }));
  const dayTick = (F) => (i) => (F[i].d === TODAY ? "Today" : F.length <= 7 ? Ut.DOW[L.dateOf(F[i].d).getDay()] : short(F[i].d));
  const wkTick = (G) => (i) => (G[i].d1 >= TODAY ? "This week" : short(G[i].d0));
  /* days against a usual share, in words: over a few days a day or two either way is chance, so only past one and a
     half standard deviations, and more than a day (the rule Symptoms uses) */
  const cmpShare = (p, k, m) => {
    if (p == null || !m) return null;
    const e = p * m, t = Math.max(1, 1.5 * Math.sqrt(m * p * (1 - p)));
    return k > e + t ? "more" : k < e - t ? "less" : "same";
  };
  /* the weeks the usual comes from (days 28 to 83), read the one way (L.facts) */
  const baseDays = (M, mode) => M.days.filter((x) => x.d >= 28 && x.d <= 83).map((x) => L.facts(M, x, mode));

  /* ============================== THE STRETCH ==============================
     One read of a stretch for every block on a page, through L.span and L.facts, so the headline, the contributors, the
     chart and the sentences count alike. A flagged today is in no count */
  function ctxOf(M, V, k, st) {
    const mode = V.form || "C", u = M.usual, learning = !u;
    const n = learning ? 7 : L.RANGES.includes(+st.range) ? +st.range : 7;
    const F = L.span(M, n, mode);
    return { M, V, mode, u, learning, n, F, k, flag: F.some((f) => f.flag) };
  }
  const timingRead = (X) => {
    const u = X.u, all = X.F.filter((f) => f.first != null), read = all.filter((f) => !f.flag);
    const later = u ? read.filter((f) => mins(f.first) > u.tHi) : [], earlier = u ? read.filter((f) => mins(f.first) < u.tLo) : [];
    const med = read.length ? Ut.median(read.map((f) => f.first)) : all.length ? Ut.median(all.map((f) => f.first)) : null;
    const by = (a, s) => a.slice().sort((x, y) => s * (x.first - y.first) || y.d - x.d)[0];
    return { all, read, later, earlier, within: u ? read.filter((f) => f.inWin).length : null, med, first: read.length ? by(read, 1) : null, last: read.length ? by(read, -1) : null };
  };
  const oftenRead = (X) => {
    const u = X.u, known = X.F.filter((f) => f.count != null), read = known.filter((f) => !f.flag);
    const total = read.reduce((s, f) => s + f.count, 0);
    const busiest = read.slice().sort((a, b) => b.count - a.count || b.d - a.d)[0] || null;
    return { known, read, total, avg: read.length ? total / read.length : null, within: u ? read.filter((f) => f.inCount).length : null, above: u ? read.filter((f) => f.count > u.nHi) : [], below: u ? read.filter((f) => f.count < u.nLo) : [], zero: read.filter((f) => f.count === 0), busiest, yMax: Math.max(3, u ? u.nHi + 1 : 0, ...known.map((f) => f.count)) };
  };
  const formRead = (X) => {
    const u = X.u, B = X.mode === "B";
    const bms = X.F.filter((f) => !f.flag).flatMap((f) => f.bms.map((b) => ({ f, b, s: u ? L.inForms(X.M, b, X.mode) : undefined })));
    const out = bms.filter((o) => o.s === false), unsure = bms.filter((o) => o.s === null).length;
    const firmer = out.filter((o) => (B ? L.wordKey(o.b) < u.wLo : Math.max(...L.stepsOf(o.b)) < u.fLo)).length;
    const tally = {};
    bms.forEach((o) => { const w = L.formKey(o.b, X.mode); (tally[w] = tally[w] || []).push(o); });
    const top = Object.entries(tally).sort((a, b) => b[1].length - a[1].length)[0] || null;
    return { bms, out, unsure, firmer, looser: out.length - firmer, within: u ? bms.length - out.length - unsure : null, top: top ? { label: top[0], list: top[1] } : null };
  };

  /* ============================== CONTRIBUTORS ==============================
     A row a part: its name and a word for where it sits, the reading big at the left, a track with the usual as the
     band and a marker for now (the reading colour within, Gold outside with its edge), the usual and a note under it.
     A count of days is a split track instead: Plum for the days within, Gold for the days outside. A row with an act
     is a button that opens that part's own page */
  const trackHtml = (o) => {
    if (!o) return `<i class="dt-trk dt-trk--none" aria-hidden="true"></i>`;
    if (o.seg) {
      const tot = Math.max(1, o.seg.reduce((s, p) => s + p.v, 0));
      return `<i class="dt-trk dt-trk--seg" aria-hidden="true">${o.seg.filter((p) => p.v).map((p) => `<b class="dt-seg is-${p.k}" style="--w:${n1((p.v / tot) * 100)}%"></b>`).join("")}${o.gate != null ? `<b class="dt-gate" style="left:${n1(o.gate * 100)}%"></b>` : ""}</i>`;
    }
    const p = (v) => Math.max(0, Math.min(100, ((v - o.lo) / (o.hi - o.lo || 1)) * 100));
    const band = o.band ? `<b class="dt-band" style="left:${n1(p(o.band[0]))}%;width:${n1(Math.max(1.5, p(o.band[1]) - p(o.band[0])))}%"></b>` : "";
    const mk = o.mark != null ? `<b class="dt-mk is-${o.tone || "read"}" style="left:${n1(p(o.mark))}%"></b>` : "";
    return `<i class="dt-trk" aria-hidden="true">${band}${mk}</i>`;
  };
  const conRow = (r) => {
    const tag = r.act ? "button" : "div";
    const attrs = r.act ? ` type="button" data-act="idetail" data-k="${esc(r.act)}"` : "";
    return `<li><${tag} class="dt-cr${r.act ? " dt-cr--go" : ""}"${attrs}${r.aria ? ` aria-label="${esc(r.aria)}"` : ""}>
        <span class="dt-cr-h"><span class="dt-cr-l">${esc(r.label)}</span>${sw(r.tone || "quiet", r.word)}${r.act ? RU.icon("chev", "dt-cr-go") : ""}</span>
        <span class="dt-cr-m"><b class="dt-cr-v">${r.value}</b>${trackHtml(r.track)}</span>
        ${r.foot ? `<span class="dt-cr-f"><span>${esc(r.foot[0] || "")}</span><span>${esc(r.foot[1] || "")}</span></span>` : ""}
      </${tag}></li>`;
  };
  const conBlock = (h, sub, rows) => (!rows.length ? "" : `<section class="ap-sect dt-con" data-a><h3>${esc(h)}</h3>${sub ? `<p class="dt-con-sub">${esc(sub)}</p>` : ""}<ul class="dt-con-l">${rows.map(conRow).join("")}</ul></section>`);

  /* FloraScore's four parts, each against its own usual range: the middle 70% of that part's daily values in the weeks
     the score's usual range comes from (L.scoreUsual's rule), so a part reads the way the score does (RU.scoreRel) */
  const partUsual = (M, mode) => {
    const by = { timing: [], often: [], form: [], comfort: [] };
    for (let d = Math.max(28, M.start); d <= 83; d++) { const s = L.score(M, d, mode); if (s && s.value != null) Object.keys(by).forEach((k) => by[k].push(s.parts[k])); }
    const out = {};
    Object.keys(by).forEach((k) => (out[k] = by[k].length >= 7 ? [Math.round(Ut.pct(by[k], 0.15)), Math.round(Ut.pct(by[k], 0.85))] : null));
    return out;
  };
  const PART_PAGE = { timing: "timing", often: "often", form: "form", comfort: "sym" };
  function scoreParts(X) {
    const M = X.M, mode = X.mode, s = L.score(M, TODAY, mode), mv = L.scoreMoved(M, mode), PU = partUsual(M, mode);
    const today = s && s.value != null, flag = today && RU.flagToday(M);
    if (!today && !mv) return null;
    /* when FloraScore sits above or below its own usual range while every part is in its own, the parts on that edge of
       their band say so, so the breakdown explains the headline (Nov 7). A part is never called good or bad */
    const su = L.scoreUsual(M, mode), rel = today && !flag && su ? RU.scoreRel(s.value, su) : null;
    const side = !rel || rel === "In its usual range" ? 0 : s.value > su[1] ? 1 : -1;
    const rows = L.SCORE_PARTS.map(([key, label]) => {
      const v = today ? Math.round(s.parts[key]) : mv.parts.find((p) => p.key === key).now, rg = PU[key];
      const edge = !!(side && rg && (side > 0 ? v >= rg[1] : v <= rg[0]));
      const word = flag ? "" : edge ? (side > 0 ? "At the top of its usual range" : "At the foot of its usual range") : rg ? RU.scoreRel(v, rg) : "";
      const lo = Math.min(50, Math.floor(Math.min(v, rg ? rg[0] : v) / 10) * 10);
      return { key, v, rg, label, word, edge, row: {
        label, act: PART_PAGE[key], value: String(v), word, tone: "read",
        track: { lo, hi: 100, band: rg, mark: flag ? null : v },
        foot: [rg ? `Usual ${nText(rg[0], rg[1])}` : "", ""],
        aria: `${label}, ${v}${word ? `, ${lower1(word)}` : ""}${rg ? `, usual ${nText(rg[0], rg[1])}` : ""}. Open ${label === "Comfort" ? "Symptoms" : label}`
      } };
    });
    const blend = `Today's FloraScore blends the days among your last ${L.BLEND} that have a BM, or No BM, logged.`;
    const edges = rows.filter((r) => r.edge).map((r, i) => (i ? r.label.toLowerCase() : r.label));
    const why = !side ? "" : edges.length ? ` ${join(edges)} ${edges.length === 1 ? "is" : "are"} at the ${side > 0 ? "top" : "foot"} of ${edges.length === 1 ? "its usual range" : "their usual ranges"}, so together the four parts put FloraScore ${lower1(rel)}.`
      : ` Each part is within its own usual range; together they put FloraScore ${lower1(rel)}.`;
    return { rows, today, flag, html: conBlock("Contributors", flag ? `${blend} Today has a log noted for a clinician, so its parts aren't read against their usual today.` : today ? `${blend} Each part against its own usual.${why}` : "No score today, so these are this week's averages, against each part's usual.", rows.map((r) => r.row)) };
  }

  const relWord = (v, lo, hi, a, b, c) => (v == null ? null : mins(v) < lo ? b : mins(v) > hi ? c : a);
  function timingCon(X, R) {
    const u = X.u, M = X.M;
    if (!R.read.length) return "";
    const base = baseDays(M, X.mode).filter((f) => f.first != null && f.inWin != null);
    const p = base.length ? base.filter((f) => f.inWin).length / base.length : null;
    const c = cmpShare(p, R.within, R.read.length);
    const vals = R.read.map((f) => f.first).concat([u.tLo, u.tHi]);
    const lo = Math.floor(Math.min(...vals) - 0.25), hi = Math.ceil(Math.max(...vals) + 0.25);
    const tw = (v) => relWord(v, u.tLo, u.tHi, "In your usual window", "Earlier than your window", "Later than your window");
    const tone = (v) => (tw(v) === "In your usual window" ? "usual" : "shift");
    const tk = (v) => ({ lo, hi, band: [u.tLo, u.tHi], mark: v, tone: tone(v) === "usual" ? "read" : "shift" });
    return conBlock("Your mornings", `${RANGE[X.n]}, against your usual window, ${winText(u)}.`, [
      { label: "Mornings in your window", value: `${R.within}<small>of ${R.read.length}</small>`, word: c ? { same: "About as often as usual", more: "More often than usual", less: "Less often than usual" }[c] : "", tone: c === "less" ? "shift" : "usual",
        track: { seg: [{ k: "usual", v: R.within }, { k: "shift", v: R.read.length - R.within }] }, foot: [p != null ? usually(p, "morning") : "", `${R.later.length} later, ${R.earlier.length} earlier`] },
      { label: "Earliest", value: esc(T(R.first.first)), word: tw(R.first.first), tone: tone(R.first.first), track: tk(R.first.first), foot: [dayLong(R.first.d), ""] },
      { label: "Latest", value: esc(T(R.last.first)), word: tw(R.last.first), tone: tone(R.last.first), track: tk(R.last.first), foot: [dayLong(R.last.d), ""] }
    ]);
  }
  function oftenCon(X, R) {
    const u = X.u, M = X.M;
    if (!R.read.length) return "";
    const base = baseDays(M, X.mode).filter((f) => f.inCount != null);
    const p = base.length ? base.filter((f) => f.inCount).length / base.length : null;
    const c = cmpShare(p, R.within, R.read.length);
    const cw = (v) => (v < u.nLo ? "Fewer than your usual" : v > u.nHi ? "More than your usual" : "A usual count");
    const tk = (v, own) => ({ lo: 0, hi: R.yMax, band: [Math.max(0, u.nLo - 0.5), u.nHi + 0.5], mark: v, tone: own ? (cw(v) === "A usual count" ? "read" : "shift") : "read" });
    const b = R.busiest, avgIn = R.avg >= u.nLo && R.avg <= u.nHi;
    return conBlock("Your counts", `${RANGE[X.n]}, against your usual count, ${nText(u.nLo, u.nHi)} a day.`, [
      { label: "BMs a day, on average", value: `${R.avg.toFixed(1)}<small>a day</small>`, word: avgIn ? "Within your usual count" : R.avg > u.nHi ? "Above your usual count" : "Below your usual count", tone: avgIn ? "usual" : "shift", track: tk(R.avg, false), foot: [`Usual ${nText(u.nLo, u.nHi)} a day`, `${plural(R.total, "BM")} on ${plural(R.read.length, "day")}`] },
      { label: "Days with a usual count", value: `${R.within}<small>of ${R.read.length}</small>`, word: c ? { same: "About as often as usual", more: "More often than usual", less: "Less often than usual" }[c] : "", tone: c === "less" ? "shift" : "usual",
        track: { seg: [{ k: "usual", v: R.within }, { k: "shift", v: R.read.length - R.within }] }, foot: [p != null ? usually(p, "day") : "", `${R.above.length} above, ${R.below.length} below`] },
      { label: "Busiest day", value: `${b.count}<small>${b.count === 1 ? "BM" : "BMs"}</small>`, word: cw(b.count), tone: cw(b.count) === "A usual count" ? "usual" : "shift", track: tk(b.count, true), foot: [dayLong(b.d), ""] },
      /* no state word: it would read as said of the count of No BM days, when it belongs to each day's count; the
         track's Gold already marks those days as outside the usual count */
      { label: "No BM days", value: String(R.zero.length), word: "", tone: "quiet", track: { seg: [{ k: u.nLo > 0 ? "shift" : "read", v: R.zero.length }, { k: "rest", v: R.read.length - R.zero.length }] }, foot: [R.zero.length ? `Last on ${dayLong(R.zero[R.zero.length - 1].d)}` : "None logged", `Of ${plural(R.read.length, "day")}`] }
    ]);
  }
  function formCon(X, R) {
    if (!R.bms.length) return "";
    const u = X.u, B = X.mode === "B", read = R.bms.length - R.unsure;
    /* the firmest and the loosest BM read, each on the scale of forms with the usual forms as the band; a word that
       covers two steps sits at their middle */
    const at = (b) => (B ? L.wordKey(b) : Ut.mean(L.stepsOf(b)));
    const lo = B ? -0.5 : 0.5, hi = B ? 4.5 : 7.5, band = B ? [u.wLo - 0.5, u.wHi + 0.5] : [u.fLo - 0.5, u.fHi + 0.5];
    const pickBy = (s) => R.bms.slice().sort((p, q) => s * (at(p.b) - at(q.b)) || q.f.d - p.f.d || q.b.t - p.b.t)[0];
    const row = (label, o) => {
      const w = o.s === true ? "In your usual forms" : o.s === null ? "Could be either" : at(o.b) < band[0] ? "Firmer than your usual forms" : "Looser than your usual forms";
      return { label, value: `<span class="dt-cr-w">${esc(L.formName(o.b, X.mode))}</span>`, word: w, tone: o.s === true ? "usual" : o.s === null ? "quiet" : "shift",
        track: { lo, hi, band, mark: at(o.b), tone: o.s === true ? "read" : o.s === null ? "maybe" : "shift" }, foot: [`${dayLong(o.f.d)}, ${T(o.b.t)}`, ""] };
    };
    return conBlock("Your forms", `${RANGE[X.n]}, ${plural(R.bms.length, "BM")} logged, against your usual forms, ${L.usualFormsText(X.M, X.mode)}.`, [
      { label: "BMs in your usual forms", value: `${R.within}<small>of ${read}</small>`, word: R.out.length ? "" : read ? "Every one read" : "", tone: "usual",
        track: { seg: [{ k: "read", v: R.within }, { k: "shift", v: R.out.length }, { k: "maybe", v: R.unsure }] }, foot: [`${R.firmer} firmer, ${R.looser} looser`, R.unsure ? `${R.unsure} could be either` : ""] },
      row("Firmest", pickBy(1)),
      row("Loosest", pickBy(-1))
    ]);
  }

  /* ============================== THE DAY BY DAY CHART ==============================
     One chart a page, a column a day (a column a week at 90 days), in the one set of marks (claude/Florin data viz.md,
     section 1): your usual as the band, a reading within it in the reading colour, outside it Gold with its edge, could
     be either and before day 14 in Ink 3, a flagged today a Teal ring in no count, today ringed in Ink and labelled,
     nothing drawn for nothing logged. A scrubber lies over it: the column picked carries a hairline, and its reading and
     reasons show under the chart. Each chart returns its svg and where its columns sit, as shares of its width */
  const W = 326;
  const colX = (N, left, right) => (N <= 1 ? () => (left + W - right) / 2 : lin(0, N - 1, left + 8, W - right - 8));
  const axisX = (N, x, y, label) => ticks(N, label).map((t) => tx(x(t.i), y, t.t, "dv-ax", N <= 7 ? "middle" : t.a)).join("");
  const bandRect = (left, right, y0, y1) => `<rect class="c-band" x="${left}" y="${n1(Math.min(y0, y1))}" width="${W - left - right}" height="${n1(Math.abs(y1 - y0))}"/><line class="dv-band-edge" x1="${left}" x2="${W - right}" y1="${n1(y0)}" y2="${n1(y0)}"/><line class="dv-band-edge" x1="${left}" x2="${W - right}" y1="${n1(y1)}" y2="${n1(y1)}"/>`;
  const dotCls = (X, f, out) => (f.flag ? "dv-dot is-flag" : X.learning ? "dv-dot is-learn" : out === false ? "dv-dot is-shift" : out === null ? "dv-dot is-maybe" : "dv-dot");

  function scoreChart(X) {
    const M = X.M, su = L.scoreUsual(M, X.mode);
    if (!su) return null;
    const fl = RU.flagToday(M);
    const ser = L.scoreSeries(M, X.n, X.mode).map((s) => ({ d: s.d, value: s.value, today: s.d === TODAY, flag: fl && s.d === TODAY && s.value != null }));
    const vals = ser.map((s) => s.value).filter((v) => v != null);
    if (!vals.length) return null;
    const lo = Math.max(0, Math.floor((Math.min(...vals, su[0]) - 5) / 5) * 5), hi = Math.min(100, Math.ceil((Math.max(...vals, su[1]) + 5) / 5) * 5);
    const step = [5, 10, 20, 25].find((s) => Math.floor(hi / s) - Math.ceil(lo / s) + 1 <= 5) || 25;
    const left = 28, right = 12, top = 22, plotH = 104, N = ser.length, H = top + plotH + 22;
    const x = colX(N, left, right), y = lin(lo, hi, top + plotH, top);
    let g = "", marks = "", lbl = "";
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { g += `<line class="dv-grid" x1="${left}" x2="${W - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`; lbl += tx(left - 6, y(v) + 3.5, String(v), "dv-ax", "end"); }
    g += bandRect(left, right, y(su[1]), y(su[0]));
    const runs = []; let cur = [];
    ser.forEach((s, i) => { if (s.value != null) cur.push([x(i), y(s.value)]); else if (cur.length) { runs.push(cur); cur = []; } });
    if (cur.length) runs.push(cur);
    marks += runs.map((r) => (r.length > 1 ? `<path class="dv-line" d="${C.path(r)}"/>` : "")).join("");
    let li = -1;
    ser.forEach((s, i) => { if (s.value != null) li = i; });
    ser.forEach((s, i) => {
      if (s.value == null) return;
      const show = N <= 7 || i === li || s.flag || runs.some((r) => r.length <= 2 && r.some((p) => p[0] === x(i)));
      if (show) marks += `<circle class="dv-dot dv-dot--line${s.flag ? " is-flag" : ""}" cx="${n1(x(i))}" cy="${n1(y(s.value))}" r="4"/>`;
    });
    if (li >= 0 && ser[li].today) {
      const s = ser[li], px = x(li), py = y(s.value);
      if (!s.flag) marks += ringAt(px, py, 7);
      /* the label only over a week: on a busy 30 or 90 days it sits on its neighbours, and the day picked says it */
      if (N <= 7) lbl += labelAt(px, py - 12 < 12 ? py + 22 : py - 12, `Today ${s.value}`, W);
    }
    lbl += axisX(N, x, top + plotH + 15, (i) => (ser[i].today ? "Today" : N <= 7 ? Ut.DOW[L.dateOf(ser[i].d).getDay()] : short(ser[i].d)));
    const sc = ser.filter((s) => s.value != null && !s.flag), k = sc.filter((s) => s.value >= su[0] && s.value <= su[1]).length;
    return {
      svg: svg(W, H, g + marks + lbl, `FloraScore, ${RANGE[X.n].toLowerCase()}, against your usual range ${su[0]} to ${su[1]}`),
      /* no hair dot on a flagged today, so its Teal ring shows when it is picked (the hairline still marks it) */
      N, xs: ser.map((s, i) => x(i) / W * 100), ys: ser.map((s) => (s.value == null || s.flag ? null : (y(s.value) - top) / plotH * 100)), top: top / H * 100, h: plotH / H * 100,
      cap: sc.length ? `In its usual range on ${k} of ${plural(sc.length, "day")}` : "Not scored in this stretch", right: `${ser.filter((s) => s.value != null).length} of ${ser.length} days scored`,
      legend: `${lg("sw--band", `Your usual range, ${su[0]} to ${su[1]}`)}${ser.some((s) => s.flag) ? lg("sw--clin", "Noted for a clinician") : ""}`,
      sel: li >= 0 ? li : N - 1, ser, su
    };
  }

  function timingChart(X) {
    const F = X.F, u = X.u, firsts = F.filter((f) => f.first != null);
    if (!firsts.length) return null;
    const vals = firsts.map((f) => f.first).concat(u ? [u.tLo, u.tHi] : []);
    let lo = Math.floor(Math.min(...vals) - 0.25), hi = Math.ceil(Math.max(...vals) + 0.25);
    if (hi - lo < 3) hi = lo + 3;
    const left = 40, right = 12, top = 22, plotH = 116, N = F.length, H = top + plotH + 22;
    const x = colX(N, left, right), y = lin(lo, hi, top, top + plotH), every = hi - lo > 6 ? 2 : 1;
    let g = "", marks = "", lbl = "";
    for (let h = lo; h <= hi; h += every) { g += `<line class="dv-grid" x1="${left}" x2="${W - right}" y1="${n1(y(h))}" y2="${n1(y(h))}"/>`; lbl += tx(left - 6, y(h) + 3.5, hourLbl(h), "dv-ax", "end"); }
    if (u) g += bandRect(left, right, y(u.tLo), y(u.tHi));
    F.forEach((f, i) => {
      if (f.first == null) return;
      if (N > 7) marks += spacer(x(i), y(f.first), 4);
      marks += `<circle class="${dotCls(X, f, f.inWin)}" cx="${n1(x(i))}" cy="${n1(y(f.first))}" r="4"/>`;
      if (f.today && !f.flag) { marks += ringAt(x(i), y(f.first), 7); if (N <= 7) lbl += labelAt(x(i), y(f.first) - 12 < 12 ? y(f.first) + 22 : y(f.first) - 12, `Today ${T(f.first)}`, W); }
    });
    lbl += axisX(N, x, top + plotH + 15, dayTick(F));
    const R = timingRead(X);
    return {
      svg: svg(W, H, g + marks + lbl, `First BM each day, ${X.learning ? "so far" : RANGE[X.n].toLowerCase()}${u ? `, against your usual window ${winText(u)}` : ""}`),
      N, xs: F.map((f, i) => x(i) / W * 100), top: top / H * 100, h: plotH / H * 100,
      cap: u ? `First BM in your window on ${R.within} of ${plural(R.read.length, "day")}` : "First BM, each day", right: X.learning ? "So far" : RANGE[X.n],
      legend: u ? `${lg("", "In your usual window")}${R.later.length || R.earlier.length ? lg("sw--shift", "Outside your usual window") : ""}${X.flag ? lg("sw--clin", "Noted for a clinician") : ""}` : lg("sw--learn", "A first BM"),
      sel: lastIdx(F, (f) => f.first != null)
    };
  }

  function oftenChart(X) {
    const F = X.F, u = X.u, R = oftenRead(X);
    if (!R.known.length) return null;
    const left = 28, right = 12, top = 22, plotH = 104, N = F.length, H = top + plotH + 22;
    const x = colX(N, left, right), y = lin(0, R.yMax, top + plotH, top), every = R.yMax > 6 ? 2 : 1;
    let g = "", marks = "", lbl = "";
    for (let v = 0; v <= R.yMax; v += every) { g += `<line class="dv-grid" x1="${left}" x2="${W - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`; lbl += tx(left - 6, y(v) + 3.5, String(v), "dv-ax", "end"); }
    if (u) g += bandRect(left, right, y(Math.min(R.yMax, u.nHi + 0.5)), y(Math.max(0, u.nLo - 0.5)));
    const busy = u && R.busiest && R.busiest.count > u.nHi ? R.busiest : null;
    F.forEach((f, i) => {
      if (f.count == null) return;
      if (N > 7) marks += spacer(x(i), y(f.count), 4);
      marks += `<circle class="${dotCls(X, f, f.inCount)}" cx="${n1(x(i))}" cy="${n1(y(f.count))}" r="4"/>`;
      if (f.today && !f.flag) { marks += ringAt(x(i), y(f.count), 7); if (N <= 7) lbl += labelAt(x(i), y(f.count) - 12 < 12 ? y(f.count) + 22 : y(f.count) - 12, `Today ${f.count === 0 ? "No BM" : f.count}`, W); }
      else if (busy && f.d === busy.d) lbl += labelAt(x(i), y(f.count) - 10, `Busiest, ${f.count}`, W);
    });
    lbl += axisX(N, x, top + plotH + 15, dayTick(F));
    return {
      svg: svg(W, H, g + marks + lbl, `BMs a day, ${X.learning ? "so far" : RANGE[X.n].toLowerCase()}${u ? `, against your usual ${u.nLo} to ${u.nHi}` : ""}`),
      N, xs: F.map((f, i) => x(i) / W * 100), top: top / H * 100, h: plotH / H * 100,
      cap: u ? `A usual count on ${R.within} of ${plural(R.read.length, "day")}` : "BMs each day", right: X.learning ? "So far" : RANGE[X.n],
      legend: u ? `${lg("", "A usual count")}${R.above.length || R.below.length ? lg("sw--shift", "Outside your usual count") : ""}${X.flag ? lg("sw--clin", "Noted for a clinician") : ""}` : lg("sw--learn", "BMs that day"),
      sel: lastIdx(F, (f) => f.count != null)
    };
  }

  function formChart(X) {
    const F = X.F, u = X.u, B = X.mode === "B", Cw = X.mode === "C";
    if (!F.some((f) => f.bms.length)) return null;
    const s0 = B ? 0 : 1, s1 = B ? 4 : 7, name = (s) => (B ? L.WORDS[s].word : Cw ? L.TYPES[s].short : `Type ${s}`);
    const left = B || Cw ? 52 : 46, right = 12, top = 22, plotH = 116, N = F.length, H = top + plotH + 22;
    const x = colX(N, left, right), y = lin(s0 - 0.5, s1 + 0.5, top + plotH, top);
    let g = "", marks = "", lbl = "";
    for (let s = s0; s <= s1; s++) { g += `<line class="dv-grid" x1="${left}" x2="${W - right}" y1="${n1(y(s))}" y2="${n1(y(s))}"/>`; lbl += tx(left - 6, y(s) + 3.5, name(s), "dv-ax", "end"); }
    if (u) g += bandRect(left, right, y((B ? u.wHi : u.fHi) + 0.5), y((B ? u.wLo : u.fLo) - 0.5));
    let maybe = false, out = false;
    F.forEach((f, i) => {
      if (!f.bms.length) return;
      const k = f.bms.length;
      f.bms.forEach((b, j) => {
        const dx = k > 1 ? (j - (k - 1) / 2) * Math.min(6, N > 7 ? 2.5 : 6) : 0, cx = x(i) + dx;
        const s = u ? L.inForms(X.M, b, X.mode) : undefined, cls = dotCls(X, f, s);
        if (s === null) maybe = true; if (s === false && !f.flag) out = true;
        const st = L.stepsOf(b);
        if (!B && st.length > 1) {
          const ya = y(Math.max(...st)), yb = y(Math.min(...st));
          marks += `<rect class="${cls.replace("dv-dot", "dt-span")}" x="${n1(cx - 4)}" y="${n1(ya - 4)}" width="8" height="${n1(yb - ya + 8)}" rx="2"/>`;
        } else {
          const cy = y(B ? L.wordKey(b) : st[0]);
          if (N > 7) marks += spacer(cx, cy, 4);
          marks += `<circle class="${cls}" cx="${n1(cx)}" cy="${n1(cy)}" r="4"/>`;
        }
      });
      if (f.today && !f.flag) {
        const lb = f.bms[k - 1], st = L.stepsOf(lb), cy = B ? y(L.wordKey(lb)) : y((Math.max(...st) + Math.min(...st)) / 2);
        const cx = x(i) + (k > 1 ? ((k - 1) / 2) * Math.min(6, N > 7 ? 2.5 : 6) : 0);
        if (B || st.length === 1) marks += ringAt(cx, cy, 7);
        lbl += labelAt(cx, Math.max(12, y(B ? s1 : 7) - 4), "Today", W);
      }
    });
    lbl += axisX(N, x, top + plotH + 15, dayTick(F));
    return {
      svg: svg(W, H, g + marks + lbl, `Each BM's form, ${RANGE[X.n].toLowerCase()}${u ? `, against your usual forms, ${L.usualFormsText(X.M, X.mode)}` : ""}`),
      N, xs: F.map((f, i) => x(i) / W * 100), top: top / H * 100, h: plotH / H * 100,
      cap: "Each BM, day by day", right: B ? "Hard at the bottom" : Cw ? "Pellets at the bottom" : "Type 1 at the bottom",
      legend: `${lg("", u ? "In your usual forms" : "A BM")}${out ? lg("sw--shift", "Outside your usual forms") : ""}${maybe ? lg("sw--maybe", "Could be either") : ""}${X.flag ? lg("sw--clin", "Noted for a clinician") : ""}`,
      sel: lastIdx(F, (f) => f.bms.length > 0)
    };
  }

  /* 90 days: a column a week, the days within at the base in Plum (it counts days), outside in Gold above, the bar's top
     at the days read; the latest labelled "5 of 6". Shared by Timing, How often and Form */
  const WK = {
    timing: { pool: (f) => f.first != null && !f.flag, hit: (f) => f.inWin === true, cap: "Days a week with the first BM in your window", lgIn: "Days in your window", lgOut: "Days outside your window" },
    often: { pool: (f) => f.count != null && !f.flag, hit: (f) => f.inCount === true, cap: "Days a week with a usual count", lgIn: "Days with a usual count", lgOut: "Days outside your usual count" },
    form: { pool: (f) => f.bms.length > 0 && f.formsIn != null, hit: (f) => f.formsIn === true, cap: "Days a week in your usual forms", lgIn: "Days with every BM in your usual forms", lgOut: "Days with a BM outside your usual forms" }
  };
  function weekChart(X) {
    const G = weeksOf(X.F), Wk = WK[X.k];
    G.forEach((g) => { const r = g.days.filter(Wk.pool); g.read = r.length; g.within = r.filter(Wk.hit).length; });
    if (!G.some((g) => g.read)) return null;
    const left = 28, right = 12, top = 22, plotH = 96, N = G.length, H = top + plotH + 22;
    const x = colX(N, left, right), y = lin(0, 7, top + plotH, top), bw = Math.max(8, Math.min(14, (W - left - right) / N - 8));
    let g = "", marks = "", lbl = "";
    [0, 7].forEach((v) => { g += `<line class="dv-grid" x1="${left}" x2="${W - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`; lbl += tx(left - 6, y(v) + 3.5, String(v), "dv-ax", "end"); });
    let li = -1;
    G.forEach((w, i) => {
      if (!w.read) return;
      li = i;
      const x0 = x(i) - bw / 2;
      if (w.within) marks += `<rect class="dv-wbar" x="${n1(x0)}" y="${n1(y(w.within))}" width="${n1(bw)}" height="${n1(y(0) - y(w.within))}" rx="2"/>`;
      if (w.read > w.within) marks += `<rect class="dv-wbar is-shift" x="${n1(x0)}" y="${n1(y(w.read))}" width="${n1(bw)}" height="${n1(y(w.within) - y(w.read) - (w.within ? 1 : 0))}" rx="2"/>`;
    });
    if (li >= 0) lbl += labelAt(x(li), y(G[li].read) - 8, `${G[li].within} of ${G[li].read}`, W);
    lbl += axisX(N, x, top + plotH + 15, wkTick(G));
    return {
      svg: svg(W, H, g + marks + lbl, `${Wk.cap}, ${plural(N, "week")}`),
      N, xs: G.map((w, i) => x(i) / W * 100), top: top / H * 100, h: plotH / H * 100, weeks: G,
      cap: Wk.cap, right: `${plural(N, "week")}`, legend: `${lg("sw--usual", Wk.lgIn)}${G.some((w) => w.read > w.within) ? lg("sw--shift", Wk.lgOut) : ""}`,
      sel: N - 1
    };
  }

  /* Symptoms: one mark a day, as the card draws it (a Teal square with symptoms, a small Ink 3 dot logged with none,
     nothing on a day with nothing logged; today ringed, a flagged today a Teal ring), at 90 days a grid of weeks
     (a column a week, Monday at the top), the scrubber picking a week */
  const symMark = (f, cx, cy, s) => {
    if (!f.logged) return "";
    if (f.flag) return `<circle class="dv-dot is-flag" data-d="${f.d}" cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Math.min(5, s / 2))}"/>`;
    const ring = f.today ? `<rect class="dv-ring" x="${n1(cx - s / 2 - 3)}" y="${n1(cy - s / 2 - 3)}" width="${n1(s + 6)}" height="${n1(s + 6)}" rx="4"/>` : "";
    return (f.nsym ? `<rect class="dv-sq" data-d="${f.d}" x="${n1(cx - s / 2)}" y="${n1(cy - s / 2)}" width="${n1(s)}" height="${n1(s)}" rx="2"/>` : `<circle class="dv-nosym" data-d="${f.d}" cx="${n1(cx)}" cy="${n1(cy)}" r="2"/>`) + ring;
  };
  function symChart(X) {
    const F = X.F;
    if (!F.some((f) => f.logged)) return null;
    const legend = [F.some((f) => f.logged && f.nsym && !f.flag) && lg("sw--sym", "Symptoms"), F.some((f) => f.logged && !f.nsym && !f.flag) && lg("sw--nosym", "Logged, no symptoms"), F.some((f) => !f.logged && !f.pending) && `<span>${esc("Blank: nothing logged")}</span>`, X.flag && lg("sw--clin", "Noted for a clinician")].filter(Boolean).join("");
    if (F.length <= 31) {
      const left = 4, right = 4, top = 8, N = F.length, cw = (W - left - right) / N, s = Math.max(8, Math.min(18, Math.floor(cw - 4))), cy = top + 6 + s / 2, H = cy + s / 2 + 26;
      const x = (i) => left + cw * i + cw / 2;
      const marks = F.map((f, i) => symMark(f, x(i), cy, s)).join("");
      return { svg: svg(W, H, marks + axisX(N, x, cy + s / 2 + 19, dayTick(F)), `Days with symptoms, ${RANGE[X.n].toLowerCase()}`), N, xs: F.map((f, i) => x(i) / W * 100), top: (top / H) * 100, h: ((s + 12) / H) * 100, cap: "Each day", right: X.learning ? "So far" : RANGE[X.n], legend, sel: lastIdx(F, (f) => f.logged) };
    }
    const G = weeksOf(F), left = 32, top = 6, N = G.length, pw = (W - left - 8) / N, s = Math.max(8, Math.min(14, Math.floor(pw - 6))), ph = s + 6;
    const xm = (c) => left + pw * c + pw / 2, ym = (r) => top + ph * r + ph / 2, base = top + ph * 7, H = base + 22;
    let marks = "";
    G.forEach((g, c) => g.days.forEach((f) => (marks += symMark(f, xm(c), ym((L.dateOf(f.d).getDay() + 6) % 7), s))));
    const lbl = [[0, "Mon"], [3, "Thu"], [6, "Sun"]].map(([r, t]) => tx(0, ym(r) + 3.5, t, "dv-ax")).join("") + axisX(N, xm, base + 15, wkTick(G));
    return { svg: svg(W, H, marks + lbl, "Days with symptoms, week by week, last 90 days"), N, xs: G.map((g, c) => xm(c) / W * 100), top: (top / H) * 100, h: ((ph * 7) / H) * 100, weeks: G, cap: "Each day, week by week", right: plural(N, "week"), legend, sel: N - 1 };
  }

  /* the check-in: a column a week, a row a question, each answer a dot: Plum when it sits within the range of your first
     weeks, Gold when it moved either way (its word says which), nothing for a skipped week */
  const ckWeeks = (M) => {
    const cur = M.checkin && M.checkin.status === "done" ? Object.assign({ w: 12, ws: 84 }, M.checkin) : null;
    return M.checkins.concat(cur ? [cur] : []);
  };
  function ckChart(X) {
    const M = X.M, b = L.baseline(M), G = ckWeeks(M);
    if (!b || !G.length) return null;
    const left = 76, right = 12, top = 12, rowH = 24, N = G.length, H = top + rowH * 4 + 24;
    const x = colX(N, left, right), y = (r) => top + rowH * r + rowH / 2;
    let g = "", marks = "", lbl = "";
    L.CHECKIN.forEach((q, r) => { g += `<line class="dv-grid" x1="${left}" x2="${W - right}" y1="${n1(y(r))}" y2="${n1(y(r))}"/>`; lbl += tx(0, y(r) + 3.5, CKN[q.k] || q.label, "dv-rowlbl"); });
    G.forEach((c, i) => {
      if (!c.answers) return;
      c.answers.forEach((a, r) => { const cm = L.compare(b, r, a); marks += `<circle class="dt-ckd${cm && cm.k !== "same" ? " is-shift" : ""}" cx="${n1(x(i))}" cy="${n1(y(r))}" r="4.5"/>`; });
    });
    lbl += axisX(N, x, top + rowH * 4 + 16, (i) => (G[i].ws >= 84 ? "This week" : short(G[i].ws)));
    return {
      svg: svg(W, H, g + marks + lbl, "Each week's answers against your first weeks"), N, xs: G.map((c, i) => x(i) / W * 100), top: (top / H) * 100, h: ((rowH * 4) / H) * 100, weeks: G,
      cap: "Week by week", right: plural(G.filter((c) => c.answers).length, "week") + " answered",
      legend: `${lg("sw--usual", "Within the range of your first weeks")}${G.some((c) => c.answers && c.answers.some((a, r) => { const cm = L.compare(b, r, a); return cm && cm.k !== "same"; })) ? lg("sw--shift", "Moved from your first weeks") : ""}`,
      sel: lastIdx(G, (c) => !!c.answers)
    };
  }
  const lastIdx = (a, f) => { for (let i = a.length - 1; i >= 0; i--) if (f(a[i])) return i; return a.length - 1; };

  function chartOf(X) {
    const k = X.k;
    if (k === "score") return scoreChart(X);
    if (k === "sym") return symChart(X);
    if (k === "ck") return ckChart(X);
    if (X.n >= 90 && X.u && WK[k]) return weekChart(X);
    return k === "timing" ? timingChart(X) : k === "often" ? oftenChart(X) : k === "form" ? formChart(X) : null;
  }

  /* ============================== THE DAY PICKED ==============================
     Under the chart: the day (or week) picked, its reading with a word for where it sits, and its reasons in the words
     every screen uses (L.dayWhy). Returns { title, word, tone, value, why, sr } */
  const dayWhy = (X, f) => L.dayWhy(X.M, f, X.mode, { name: dayLong(f.d) });
  const reasonOf = (X, f) => (f.pending ? "Nothing logged yet today." : dayWhy(X, f).say || "Logged.");
  function pickOf(X, ch, i) {
    const k = X.k, u = X.u;
    if (k === "ck") {
      const c = ch.weeks[i], b = L.baseline(X.M), done = X.M.checkins.filter((w) => w.answers), first = done.slice(0, L.BASE_WEEKS).includes(c);
      const title = c.ws >= 84 ? "This week" : `Week of ${short(c.ws)}`;
      if (!c.answers) return { title, word: "Skipped", tone: "quiet", value: "", why: "A skipped week stays a gap, never a week without symptoms.", sr: `${title}, skipped` };
      const rows = L.CHECKIN.map((q, r) => { const cm = L.compare(b, r, c.answers[r]); return { q: CKN[q.k] || q.label, a: q.opts[c.answers[r]], w: cm.text, t: cm.k === "same" ? "usual" : "shift" }; });
      return { title, word: first ? "One of your first weeks" : "", tone: "quiet", list: rows, why: first ? `Your first ${plural(L.BASE_WEEKS, "check-in")} are the starting point every week is compared with.` : "", sr: `${title}: ${rows.map((r) => `${r.q} ${r.a}, ${lower1(r.w)}`).join("; ")}` };
    }
    if (ch.weeks) {
      const g = ch.weeks[i], title = weekName(g);
      if (k === "sym") {
        const lg = g.days.filter((f) => f.logged && !f.flag), line = L.symLine(lg, { named: false, of: lg.length });
        const value = !lg.length ? "Nothing logged that week." : line || `No symptoms on the ${plural(lg.length, "day")} you logged.`;
        return { title, word: "", tone: "quiet", value, why: g.days.some((f) => f.flag) ? L.FLAG_DAY : "", sr: `${title}: ${value}` };
      }
      const Wk = WK[k], r = g.days.filter(Wk.pool);
      let value = "";
      if (!r.length) value = k === "timing" ? "No first BM logged that week." : k === "often" ? "Nothing about BMs logged that week." : "No BM logged that week.";
      else if (k === "timing") value = `First BM in your window on ${g.within} of ${plural(g.read, "morning")}. Typical first BM ${T(Ut.median(r.map((f) => f.first)))}.`;
      else if (k === "often") value = `A usual count on ${g.within} of ${plural(g.read, "day")}, ${plural(r.reduce((s, f) => s + f.count, 0), "BM")} in all.`;
      else value = `Every BM in your usual forms on ${g.within} of ${plural(g.read, "day")}.`;
      return { title, word: "", tone: "quiet", value, why: g.days.some((f) => f.flag) ? L.FLAG_DAY : "", sr: `${title}: ${value}` };
    }
    if (k === "score") {
      const s = ch.ser[i], f = X.F.find((x) => x.d === s.d), title = dayLong(s.d);
      const sc = L.score(X.M, s.d, X.mode);
      let word = "", value = "";
      if (s.value != null) {
        word = s.flag ? FLAG_REL : RU.scoreRel(s.value, ch.su);
        value = `FloraScore ${s.value}. ${L.SCORE_PARTS.map(([pk, pl]) => `${pl} ${Math.round(sc.parts[pk])}`).join(", ")}.`;
      } else value = sc && sc.learning ? `No FloraScore in your first ${L.LEARN_DAYS - 1} days of logging, while Florin learned your usual.` : f && f.logged && f.count != null ? `No FloraScore: ${L.NO_SCORE}.` : "No FloraScore: nothing about BMs was logged that day, so it has no score of its own.";
      const why = f ? reasonOf(X, f) : "";
      return { title, word, tone: "read", value, why, day: true, sr: `${title}: ${value}${word ? ` ${word}.` : ""}` };
    }
    const f = X.F[i], title = dayLong(f.d), why = reasonOf(X, f);
    let word = "", tone = "quiet", value = "";
    const none = f.pending ? "Nothing logged yet" : !f.logged ? "Nothing logged" : f.count == null ? "Nothing about BMs" : f.count === 0 ? "No BM" : "";
    if (k === "timing") {
      value = f.first != null ? `First BM ${T(f.first)}${f.bms.length > 1 ? `, then ${join(f.bms.slice(1).map((b) => T(b.t)))}` : ""}.` : `${none || "No BM"}.`;
      if (f.flag) { word = "Noted for a clinician"; tone = "info"; }
      else if (f.first != null && u) { word = f.inWin ? "In your usual window" : mins(f.first) > u.tHi ? "Later than your window" : "Earlier than your window"; tone = f.inWin ? "usual" : "shift"; }
      if (u && f.first != null && !L.patterns(X.M, X.mode).sparse && L.lateDinner(X.M, f.d - 1)) value += " Dinner after 8 PM the night before.";
    } else if (k === "often") {
      value = f.count != null && f.count > 0 ? `${plural(f.count, "BM")}${f.today ? " so far" : ""}.` : `${none}.`;
      if (f.flag) { word = "Noted for a clinician"; tone = "info"; }
      else if (f.count != null && u) { word = f.inCount ? "A usual count" : f.count > u.nHi ? "More than your usual" : "Fewer than your usual"; tone = f.inCount ? "usual" : "shift"; }
    } else if (k === "form") {
      value = f.bms.length ? `${f.bms.map((b) => `${T(b.t)} ${L.formName(b, X.mode)}`).join(", ")}.` : `${none || "No BM"}.`;
      if (f.flag) { word = "Noted for a clinician"; tone = "info"; }
      else if (f.bms.length && u) { word = f.formsIn ? "In your usual forms" : f.formsIn === false ? "Outside your usual forms" : "Could be either"; tone = f.formsIn ? "usual" : f.formsIn === false ? "shift" : "quiet"; }
    } else if (k === "sym") {
      /* a flagged today keeps its reading, named as any day's, and is read against nothing */
      if (!f.logged) value = `${none}.`;
      else if (f.nsym) { value = `${upper1(join(Object.keys(f.sym).map((nm) => { const s = f.unrated && f.unrated[nm] ? 0 : f.sym[nm]; return `${nm.toLowerCase()}, ${s ? L.STRENGTH[s - 1].toLowerCase() : "strength not said"}`; })))}.`; word = "Symptoms"; tone = "info"; }
      else { value = "No symptoms logged."; word = "Logged"; }
      if (f.flag) { word = "Noted for a clinician"; tone = "info"; }
    }
    return { title, word, tone, value, why: f.flag ? L.FLAG_DAY : why, day: !f.flag, sr: `${title}: ${value}${word ? ` ${word}.` : ""}` };
  }
  const pickHtml = (P) => `<div class="dt-pick-h"><b>${esc(P.title)}</b>${sw(P.tone, P.word)}</div>`
    + (P.list ? `<ul class="dt-pick-l">${P.list.map((r) => `<li><span>${esc(r.q)}</span><b>${esc(r.a)}</b>${sw(r.t, r.w)}</li>`).join("")}</ul>` : P.value ? `<p class="dt-pick-v">${esc(P.value)}</p>` : "")
    + (P.why && P.why !== P.value ? `<p class="dt-pick-w">${P.day ? "<em>The day</em>" : ""}<span>${esc(P.why)}</span></p>` : "");

  /* the picked column, remembered per model, range and page, so a redraw keeps it */
  const SEL = new WeakMap();
  const selOf = (M, key) => { const m = SEL.get(M); return m && m[key] != null ? m[key] : null; };
  const setSel = (M, key, i) => { let m = SEL.get(M); if (!m) SEL.set(M, (m = {})); m[key] = i; };

  function chartFig(X) {
    const ch = chartOf(X);
    if (!ch) return { html: "", ch: null };
    const key = `${X.k}:${X.n}`, saved = selOf(X.M, key), i = saved != null && saved < ch.N ? saved : Math.max(0, ch.sel);
    const P = pickOf(X, ch, i);
    const unit = ch.weeks && X.k !== "ck" ? "week" : X.k === "ck" ? "week" : "day";
    const yp = ch.ys && ch.ys[i] != null ? ch.ys[i] : null;
    const html = `<figure class="ap-fig dt-fig" data-a data-dt-k="${esc(X.k)}" data-dt-n="${X.n}" data-dt-xs="${ch.xs.map(n1).join(",")}"${ch.ys ? ` data-dt-ys="${ch.ys.map((v) => (v == null ? "" : n1(v))).join(",")}"` : ""}>
        <figcaption class="ap-figcap"><b>${esc(ch.cap)}</b><span>${esc(ch.right)}</span></figcaption>
        <div class="dt-plot">${ch.svg}
          <div class="dt-hair" aria-hidden="true" style="left:${n1(ch.xs[i])}%;top:${n1(ch.top)}%;height:${n1(ch.h)}%"><i class="dt-hair-dot"${yp == null ? " hidden" : ""} style="top:${yp == null ? 0 : n1(yp)}%"></i></div>
          <div class="dt-scrub" role="slider" tabindex="0" aria-label="Pick a ${unit} on the chart" aria-valuemin="1" aria-valuemax="${ch.N}" aria-valuenow="${i + 1}" aria-valuetext="${esc(P.sr)}"></div>
        </div>
        ${ch.legend ? `<div class="ap-legend">${ch.legend}</div>` : ""}
        <div class="dt-pick" aria-live="polite">${pickHtml(P)}</div>
        <p class="dt-hint">Tap or drag across the chart to pick a ${unit}.</p>
      </figure>`;
    return { html, ch };
  }

  /* ============================== WHAT MOVED, AND WHAT STAYED THE SAME ==============================
     Two or three sentences against the stretch before (L.prevSpan: the week before, the 30 days before, or at 90 days
     your first 30 days against your last 30), in counts and the person's own times, never better or worse */
  const before = (X) => {
    const P = L.prevSpan(X.M, X.n, X.mode), Y = (F) => Object.assign({}, X, { F });
    return { P, cur: Y(P.cur), prev: Y(P.prev), was: P.cur30 ? "in your first 30 days" : `in ${P.label}`, now: P.cur30 ? "In your last 30 days" : `In the ${RANGE[X.n].toLowerCase()}` };
  };
  const minsSaid = (a, b) => { const d = Math.round((a - b) * 60 / 5) * 5; return Math.abs(d) < 10 ? "about the same time of day" : `about ${Math.abs(d)} minutes ${d > 0 ? "later" : "earlier"}`; };
  function moved(X) {
    const k = X.k, u = X.u, B = before(X), lines = [];
    if (k === "score") {
      /* the averages keep a flagged today (FloraScore keeps its number, as the hero and What moved it do); the counts in
         and out of the usual range leave it out, since it is read against nothing */
      const su = L.scoreUsual(X.M, X.mode), all = (F) => F.map((f) => L.score(X.M, f.d, X.mode)).filter((s) => s && s.value != null);
      const sc = (F) => all(F).filter((s) => !(s.d === TODAY && RU.flagToday(X.M)));
      const a = all(B.cur.F), b = all(B.prev.F);
      if (!a.length) return "";
      const av = Math.round(Ut.mean(a.map((s) => s.value))), bv = b.length ? Math.round(Ut.mean(b.map((s) => s.value))) : null;
      lines.push(`${B.now}, FloraScore averaged ${av}${bv != null ? `, against ${bv} ${B.was}` : ""}.`);
      const S = sc(X.F), inR = S.filter((s) => s.value >= su[0] && s.value <= su[1]).length, ab = S.filter((s) => s.value > su[1]).length, be = S.filter((s) => s.value < su[0]).length;
      const tail = [ab && `above it on ${ab}`, be && `below it on ${be}`].filter(Boolean).join(" and ");
      if (S.length) lines.push(`Over the ${RANGE[X.n].toLowerCase()} it sat in its usual range on ${inR} of ${plural(S.length, "day")}${tail ? `, ${tail}` : ""}.`);
      if (S.length > 1) { const lo = S.slice().sort((p, q) => p.value - q.value || q.d - p.d)[0], hi = S.slice().sort((p, q) => q.value - p.value || q.d - p.d)[0]; lines.push(`Lowest ${lo.value} on ${dayLong(lo.d)}, highest ${hi.value} on ${dayLong(hi.d)}.`); }
    } else if (k === "timing") {
      const a = timingRead(B.cur), b = timingRead(B.prev), R = timingRead(X);
      if (!R.read.length) return "";
      lines.push(`${B.now}, your first BM came in your window on ${a.within} of ${plural(a.read.length, "morning")}${b.read.length ? `, against ${b.within} of ${b.read.length} ${B.was}` : ""}.`);
      if (b.read.length && a.med != null && b.med != null) lines.push(`Your typical first BM was ${T(a.med)}, against ${T(b.med)} ${B.was}: ${minsSaid(a.med, b.med)}.`);
      /* days of the week, only when each weekday has 3 or more mornings and they sit 20 minutes or more apart */
      const byD = {};
      R.read.forEach((f) => (byD[f.dow] = byD[f.dow] || []).push(f.first));
      const ds = Object.keys(byD).filter((d) => byD[d].length >= 3).map((d) => ({ d: +d, m: Ut.median(byD[d]) }));
      if (ds.length >= 5) {
        const late = ds.slice().sort((p, q) => q.m - p.m)[0], early = ds.slice().sort((p, q) => p.m - q.m)[0];
        /* at 90 days the sentences before read the last 30, so this one names its own stretch */
        const ov = X.n >= 90 ? `Over the ${RANGE[X.n].toLowerCase()}, ` : "";
        lines.push(late.m - early.m >= 1 / 3 ? `${ov ? `${ov}by` : "By"} day of the week, it came latest on ${Ut.DOWL[late.d]}s (typically ${T(late.m)}) and earliest on ${Ut.DOWL[early.d]}s (${T(early.m)}).` : `${ov ? `${ov}no` : "No"} day of the week stood apart: every weekday's typical first BM was within 20 minutes of the others.`);
      }
    } else if (k === "often") {
      const a = oftenRead(B.cur), b = oftenRead(B.prev), R = oftenRead(X);
      if (!R.read.length) return "";
      lines.push(`${B.now}, a usual count on ${a.within} of ${plural(a.read.length, "day")}${b.read.length ? `, against ${b.within} of ${b.read.length} ${B.was}` : ""}.`);
      if (b.avg != null && a.avg != null) lines.push(`On average ${a.avg.toFixed(1)} a day, against ${b.avg.toFixed(1)}.`);
      const ov = X.n >= 90 ? `Over the ${RANGE[X.n].toLowerCase()}, ` : "";
      if (R.above.length) { const t = R.busiest; lines.push(`${ov ? `${ov}the` : "The"} busiest day was ${dayLong(t.d)}, with ${plural(t.count, "BM")}, more than your usual ${nText(u.nLo, u.nHi)}.`); }
      else lines.push(`${ov ? `${ov}no` : "No"} day went above your usual ${nText(u.nLo, u.nHi)}.`);
    } else if (k === "form") {
      const a = formRead(B.cur), b = formRead(B.prev), R = formRead(X);
      if (!R.bms.length) return "";
      lines.push(`${B.now}, ${a.within} of ${plural(a.bms.length - a.unsure, "BM")} were in your usual forms${b.bms.length ? `, against ${b.within} of ${b.bms.length - b.unsure} ${B.was}` : ""}.`.replace(/^(.*?), 1 of 1 BM were/, "$1, 1 of 1 BM was"));
      /* the stretch the sentence before names (B.cur), against the one before it, never the 90 days against the first 30 */
      if (a.top && b.top) lines.push(a.top.label === b.top.label ? `${upper1(a.top.label)} was the most common form in both.` : `The most common form was ${a.top.label}, against ${b.top.label} before.`);
    }
    if (X.flag) lines.push(L.FLAG_DAY);
    /* the heading names the stretch it compares with, so it can't be read as the core's What moved it this week */
    return lines.length ? `<section class="ap-sect dt-moved" data-a><h3>${esc(`Against ${B.was.replace(/^in /, "")}`)}</h3><p>${esc(lines.join(" "))}</p></section>` : "";
  }

  /* ============================== THE HEADLINE ==============================
     The core's hero keeps its big reading and its today row; it gains a state word for where the stretch sits against
     the person's own usual, and one sentence in Lora that answers the page */
  function headline(X) {
    const u = X.u, k = X.k;
    if (k === "timing") {
      const R = timingRead(X);
      if (!R.read.length) return null;
      const w = relWord(R.med, u.tLo, u.tHi, "In your usual window", "Earlier than your window", "Later than your window");
      const out = [R.later.length && `${R.later.length} later`, R.earlier.length && `${R.earlier.length} earlier`].filter(Boolean);
      return { word: w, tone: w === "In your usual window" ? "usual" : "shift", line: out.length ? `${R.within} of ${plural(R.read.length, "morning")} came in your usual window; ${join(out)}.` : `Every first BM you logged came in your usual window, ${winText(u)}.` };
    }
    if (k === "often") {
      const R = oftenRead(X);
      if (!R.read.length) return null;
      const inn = R.avg >= u.nLo && R.avg <= u.nHi;
      return { word: inn ? "Within your usual count" : R.avg > u.nHi ? "Above your usual count" : "Below your usual count", tone: inn ? "usual" : "shift",
        line: R.above.length ? `${R.within} of ${plural(R.read.length, "day")} had a usual count. The busiest was ${dayLong(R.busiest.d)}, with ${plural(R.busiest.count, "BM")}.` : `${R.within} of ${plural(R.read.length, "day")} had a usual count, and no day went above ${u.nHi}.` };
    }
    if (k === "form") {
      const R = formRead(X);
      if (!R.bms.length || !R.top) return null;
      const st = R.top.list.map((o) => o.s), w = st.every((s) => s === true) ? "In your usual forms" : st.every((s) => s === false) ? "Outside your usual forms" : "Could be either";
      const said = [R.firmer && `${R.firmer} firmer`, R.looser && `${R.looser} looser`].filter(Boolean);
      return { word: w, tone: w === "In your usual forms" ? "usual" : w === "Outside your usual forms" ? "shift" : "quiet", line: said.length ? `${R.within} of ${plural(R.bms.length - R.unsure, "BM")} sat in your usual forms; ${join(said)}.` : `Every BM read sat in your usual forms, ${L.usualFormsText(X.M, X.mode)}.` };
    }
    return null;
  }

  /* ============================== THE PAGE ==============================
     The core's page, parsed, with the blocks above put in their places */
  const frag = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };
  const insertAfter = (el, html) => { if (el && html) el.after(frag(html)); };
  const figBy = (root, re) => [...root.querySelectorAll(":scope > figure.ap-fig")].find((f) => { const b = f.querySelector(".ap-figcap b"); return b && re.test(b.textContent); }) || null;
  /* the place under the range tabs (or the hero, before day 14, when there are none) */
  const anchorOf = (root) => root.querySelector(":scope > .ap-det-range") || root.querySelector(":scope > .ap-dhero") || root.querySelector(":scope > .ap-nav");

  function compose(M, V, st, baseHtml) {
    const k = st.k;
    const X = ctxOf(M, V, k, st);
    const t = document.createElement("template");
    t.innerHTML = baseHtml.trim();
    const root = t.content.firstElementChild;
    if (!root || !root.classList.contains("ap-idt")) return null;
    root.classList.add("dt-page");
    root.setAttribute("data-dt", k);
    /* the page's title is its card's plain head (Nov 7: FREQUENCY on Insights), where the core names it otherwise */
    const navT = k === "often" ? root.querySelector(":scope > .ap-nav .ap-nav-t") : null;
    if (navT) navT.textContent = NAME[k];
    const hero = root.querySelector(":scope > .ap-dhero");
    const at = anchorOf(root);

    if (k === "score") {
      if (X.learning) return null;
      const mv = L.scoreMoved(M, X.mode), tops = mv && RU.topParts ? RU.topParts(mv) : [];
      const line = hero && hero.querySelector(".ap-dhero-line");
      if (line && mv) {
        const nm = (p, i) => { const s = (L.SCORE_PARTS.find((x) => x[0] === p.key) || [])[1] || p.key; return i ? s.toLowerCase() : s; };
        const most = !tops.length ? "No one part moved it this week." : `${join(tops.map(nm))} moved it most this week, ${tops[0].pts > 0 ? "adding" : "taking off"} ${plural(Math.abs(tops[0].pts), "point")}${tops.length > 1 ? " each" : ""}.`;
        const same = tops.length > 1 && !(tops.every((p) => p.pts > 0) || tops.every((p) => p.pts < 0));
        /* the week's change itself is the core's chip and What moved it, under this; the line says only which part */
        if (!same) insertAfter(line, `<p class="dt-hl">${esc(most)}</p>`);
      }
      const SP = scoreParts(X);
      const cf = chartFig(X);
      const old = figBy(root, /usual range on|Not scored in this stretch/);
      if (old && cf.html) { old.before(frag(SP ? SP.html : "")); old.replaceWith(frag(cf.html + moved(X))); }
      else insertAfter(at, (SP ? SP.html : "") + cf.html + (cf.html ? moved(X) : ""));
      root.querySelectorAll(":scope > .ap-compl").forEach((n) => n.remove());
    } else if (k === "timing" || k === "often" || k === "form") {
      if (!X.learning && hero) {
        const H = headline(X), big = hero.querySelector(".ap-big");
        if (H && big) insertAfter(big, `${sw(H.tone, H.word).replace("dt-sw", "dt-sw dt-sw--hero")}<p class="dt-hl">${esc(H.line)}</p>`);
        const chips = hero.querySelectorAll(":scope > .ap-chips .ap-chip");
        if (H) chips.forEach((c, i) => { if (i > 0) c.remove(); });
      }
      const con = X.learning ? "" : k === "timing" ? timingCon(X, timingRead(X)) : k === "often" ? oftenCon(X, oftenRead(X)) : formCon(X, formRead(X));
      const cf = chartFig(X);
      const figs = [...root.querySelectorAll(":scope > figure.ap-fig")];
      /* Timing: the chart takes the first figure's place (the card's morning strip); How often: the count line; Form:
         the day by day (the mix stays, first, with its bars) */
      const old = k === "form" ? figBy(root, /^Each BM, day by day$|^Days a week in your usual forms$/) : k === "timing" ? figBy(root, /First BM in your window|Days a week with the first BM|First BM, each day/) : figBy(root, /usual count|BMs each day/);
      insertAfter(at, con);
      const rest = cf.html ? cf.html + (X.learning ? "" : moved(X)) : "";
      if (old && rest) old.replaceWith(frag(rest));
      else if (rest) { const ref = k === "form" && figs[0] ? figs[0] : root.querySelector(":scope > .dt-con") || at; insertAfter(ref, rest); }
    } else if (k === "sym") {
      const each = figBy(root, /^Each symptom$/), day = figBy(root, /^Each day$/);
      if (each && at) at.after(each);
      const cf = chartFig(X);
      if (cf.html) { if (day) day.replaceWith(frag(cf.html)); else insertAfter(each || at, cf.html); }
    } else if (k === "ck") {
      const cf = chartFig(X);
      const leg = root.querySelector(":scope > .ap-legend");
      if (cf.html && leg) insertAfter(leg, cf.html);
    } else if (k === "pat") {
      if (X.learning) return null;
      const PR = L.patterns(M, X.mode);
      const rows = [{ label: "Days with a meal logged", value: `${PR.mealDays}<small>of ${PR.loggedDays}</small>`, word: PR.sparse ? "Too few to read" : "Enough to read", tone: "quiet",
        track: { seg: [{ k: "ctx", v: PR.mealDays }, { k: "rest", v: Math.max(0, PR.loggedDays - PR.mealDays) }], gate: L.MEAL_COVER }, foot: [`Days you logged, last ${L.PATTERN_DAYS} days`, `The line: ${Math.round(L.MEAL_COVER * 10)} in 10`] }];
      if (!PR.sparse) rows.push({ label: "Foods checked", value: String(PR.checked.length), word: PR.found.length ? `${plural(PR.found.length, "possible pattern")}` : "Nothing stands out yet", tone: "quiet", track: null, foot: [`Each logged ${L.PATTERN_BAR.n} times or more`, PR.waiting.length ? `${PR.waiting.length} waiting for more logs` : ""] });
      const list = root.querySelector(":scope > .ap-ipats");
      if (list || hero) insertAfter(list || hero, conBlock("What Florin read", "Patterns are read only when meals are logged on most days you log, so ordinary days are there to compare with.", rows));
    } else return null;
    return root.outerHTML;
  }

  /* ============================== THE WRAP ============================== */
  const KEYS = ["score", "timing", "often", "form", "sym", "ck", "pat"];
  const baseIdetail = RU.idetail;
  RU.idetail = (M, V, st) => {
    const base = baseIdetail(M, V, st);
    try {
      if (!st || !KEYS.includes(st.k) || !V || V.plan === "free" || V.easy || typeof document === "undefined") return base;
      if (st.k === "ck" && RU.ckOn && !RU.ckOn(V)) return base;
      const html = compose(M, V, Object.assign({}, st, { range: st.range != null ? st.range : 7 }), base);
      return html || base;
    } catch (e) { warn("a detail page's added blocks failed, drawing the core's page", e); return base; }
  };
  RU.core = Object.assign(RU.core || {}, { idetailPlain: baseIdetail });

  /* ============================== THE SCRUBBER ==============================
     Tap, or drag across a chart, and the day under the finger is picked; the arrow keys step a day (Page keys a week),
     Home and End go to the ends. Only the hairline and the words under the chart change, so a drag never redraws the
     chart under it */
  const api = () => EXT.api;
  function pick(fig, i) {
    const a = api();
    if (!a || !fig) return;
    const k = fig.dataset.dtK, n = +fig.dataset.dtN, xs = fig.dataset.dtXs.split(",").map(Number), N = xs.length;
    i = Math.max(0, Math.min(N - 1, i));
    const M = a.M(), V = a.V(), X = ctxOf(M, V, k, { range: n });
    const ch = chartOf(X);
    if (!ch || ch.N !== N) return;
    setSel(M, `${k}:${X.n}`, i);
    const P = pickOf(X, ch, i), hair = fig.querySelector(".dt-hair"), dot = fig.querySelector(".dt-hair-dot"), sc = fig.querySelector(".dt-scrub"), out = fig.querySelector(".dt-pick");
    if (hair) hair.style.left = `${xs[i]}%`;
    if (dot) { const y = ch.ys ? ch.ys[i] : null; dot.hidden = y == null; if (y != null) dot.style.top = `${n1(y)}%`; }
    if (sc) { sc.setAttribute("aria-valuenow", String(i + 1)); sc.setAttribute("aria-valuetext", P.sr); }
    if (out) out.innerHTML = pickHtml(P);
  }
  const nearest = (fig, el, clientX) => {
    const r = el.getBoundingClientRect(), p = ((clientX - r.left) / (r.width || 1)) * 100;
    const xs = fig.dataset.dtXs.split(",").map(Number);
    let best = 0;
    xs.forEach((x, i) => { if (Math.abs(x - p) < Math.abs(xs[best] - p)) best = i; });
    return best;
  };
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    const s = e.target && e.target.closest ? e.target.closest(".dt-scrub") : null;
    if (!s) return;
    try {
      drag = { s, id: e.pointerId, x: e.clientX, y: e.clientY, on: e.pointerType === "mouse" };
      if (drag.on) { s.setPointerCapture(e.pointerId); pick(s.closest(".dt-fig"), nearest(s.closest(".dt-fig"), s, e.clientX)); }
    } catch (err) { warn("the scrubber couldn't pick a day", err); }
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    try {
      /* on touch, a sideways move scrubs and an upward one scrolls the screen as usual */
      if (!drag.on && Math.abs(e.clientX - drag.x) > 6 && Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y)) { drag.on = true; drag.s.setPointerCapture(e.pointerId); }
      if (drag.on) pick(drag.s.closest(".dt-fig"), nearest(drag.s.closest(".dt-fig"), drag.s, e.clientX));
    } catch (err) { warn("the scrubber couldn't follow the drag", err); }
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    try { if (!drag.on && e.type === "pointerup") pick(drag.s.closest(".dt-fig"), nearest(drag.s.closest(".dt-fig"), drag.s, e.clientX)); } catch (err) { warn("the scrubber couldn't pick a day", err); }
    drag = null;
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
  document.addEventListener("keydown", (e) => {
    const s = e.target && e.target.closest ? e.target.closest(".dt-scrub") : null;
    if (!s) return;
    const fig = s.closest(".dt-fig"), i = (+s.getAttribute("aria-valuenow") || 1) - 1, N = +s.getAttribute("aria-valuemax") || 1;
    const to = { ArrowLeft: i - 1, ArrowDown: i - 1, ArrowRight: i + 1, ArrowUp: i + 1, Home: 0, End: N - 1, PageUp: i + 7, PageDown: i - 7 }[e.key];
    if (to == null) return;
    e.preventDefault(); e.stopPropagation();
    try { pick(fig, to); } catch (err) { warn("the scrubber couldn't step", err); }
  }, true);

  /* ============================== THE NOTES ============================== */
  const notes = {
    "i-score": {
      t: "FloraScore, the detail",
      lede: "Today's score against its usual range, then its four parts as contributors, each against its own usual and opening its page. FloraScore by day on the usual band, with a scrubber: a picked day shows its score, its parts and why the day sat where it did. Then the stretch against the one before it, and what moved it this week in whole points. A day with no BM logged is left out."
    },
    "i-timing": {
      t: "Timing, the detail",
      lede: "The typical first BM, a word for where it sits against the usual window and one sentence on the stretch. Your mornings: the mornings in the window, the earliest and the latest, each on a track with the window as the band. The first BM by day, with a scrubber for any day's times and reasons; a bar a week at 90 days. Then the stretch before, and every BM by day."
    },
    "i-often": {
      t: "How often, the detail",
      lede: "BMs a day on average with a word against the usual count, then the days with a usual count, the busiest day and the No BM days. One dot a day on a count line from zero, with a scrubber for any day's count and reasons; a bar a week at 90 days. A day with nothing logged stays a gap, never a zero."
    },
    "i-form": {
      t: "Form, the detail",
      lede: "The most common form with a word against the usual forms, then how many BMs sat in them, firmer or looser. The mix as bars, then each BM by day with a scrubber for any day's forms and reasons; a bar a week at 90 days. A word that covers steps on both sides of the usual reads as could be either, counted neither way."
    },
    "i-sym": {
      t: "Symptoms, the detail",
      lede: "The answer first: days with symptoms of the days logged, against the usual in words. Each symptom with its days and strength, against its own usual. One mark a day with a scrubber, so a picked day names its symptoms and how its BMs sat; a grid of weeks at 90 days. What came with them is seen together, never cause.",
      open: ["Should a picked day also show what was eaten the day before?"]
    },
    "i-ck": {
      t: "Weekly check-in, the detail",
      lede: `The latest week next to the person's first ${plural(L.BASE_WEEKS, "check-in")}, each question with its trend. Week by week, a dot an answer: Plum within the range of the first weeks, Gold when it moved either way, nothing for a skipped week. A picked week lists its four answers in their own words.`
    },
    "i-pat": {
      t: "Possible patterns",
      lede: `What Florin read first: the days with a meal logged against the days logged, with the line patterns need, and the foods checked. Then each pattern, said as seen together, never cause. A food is checked once it's logged ${L.PATTERN_BAR.n} times, and a pattern has to stand out against other days.`
    }
  };
  Object.keys(notes).forEach((id) => {
    const prev = EXT.notes[id];
    EXT.notes[id] = (M, P) => {
      try {
        if (P && (P.plan === "free" || P.easy)) return prev ? prev(M, P) : null;
        if (id === "i-pat" && M && L.patterns(M, (P && P.form) || "C").sparse) return prev ? prev(M, P) : null;
        if (id === "i-score" && M && !M.usual) return prev ? prev(M, P) : null;
        return notes[id];
      } catch (e) { warn("a detail note failed", e); return prev ? prev(M, P) : null; }
    };
  });
})();
