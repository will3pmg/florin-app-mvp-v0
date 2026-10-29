/* Home: how should Today show the week? The comparison page for the week on Today (options/home).
   Two questions, each laid out the same way: every option with what it is, why do it and why not, then what we
   recommend.
     1  What the week shows    four weeks side by side, the same logs, the same size, the week alone
          1 Days and reasons      a card: one count, a row of day circles, a line for each thing that was different
          2 Week strip            no card: a count, a row of days you can tap, one short line
          3 Words only            the week in sentences, no chart
          4 Morning times chart   each day's first BM against the usual window
     2  Where it sits          Today on a 390 by 844 phone, drawn to its end, with the app's tab bar on the first screen
          A At the top            B Under FloraScore (and the check-in)            C After today's logs (now)
   Everything comes from the prototype's own model and screens, loaded read-only: L.build, L.span (with an end day, for a
   person's hardest week), L.tally, L.dayWhy, L.symLine and RU.week for every figure; RU.todayParts for the rest of
   Today; RU.dayMark for every day; RU.historyDay for a tapped day. Nothing under prototype/ or library/ is changed.
   What the texts say about the screens (what shows on the first screen, which card is shortest) is measured from the
   drawings, never typed. window.FLORIN_HOME */
(function () {
  const mount = document.getElementById("ho");
  if (!mount) return;
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP;
  if (!FL || !L || !RU || !AD || !RU.scoreHero || !RU.dayMark || !RU.historyDay) {
    mount.innerHTML = `<p class="ho-err">The prototype's files didn't load, so the options can't be drawn. Open the page from its own folder, with the prototype beside it.</p>`;
    return;
  }
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime;
  /* Consistency C (seven of our own words), Florin membership, meals every day, Home's Score first: the options are
     compared on the recommended settings, so only the week differs */
  const MODE = "C";
  /* the phone the texts measure: 390 by 844 */
  const PHONE_W = 390, PHONE_H = 844;

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const andJoin = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const textOfHtml = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " ").trim(); };

  /* ============ the week a drawing reads ============
     W: the person's model, the last day (today, or the last day of their hardest week) and L.span's facts to it. A past
     week is drawn as it read on its last evening: its last day is today, with the ring and the word */
  const weekOf = (M, end) => {
    const e = end == null ? L.TODAY : end;
    const F = L.span(M, 7, MODE, e).map((f) => (e === L.TODAY ? f : Object.assign({}, f, { today: f.d === e })));
    return { M, u: M.usual, end: e, F, T7: L.tally(F, true), past: e !== L.TODAY };
  };
  /* the 7 days in the person's logs with the most days outside their usual (the later one on a tie) */
  const hardEnd = (M) => {
    if (!M.usual) return null;
    let best = null;
    for (let e = M.start + 6; e < L.TODAY; e++) {
      const t = L.tally(L.span(M, 7, MODE, e), false);
      if (!best || t.shifted >= best.n) best = { e, n: t.shifted, known: t.known, within: t.within };
    }
    return best;
  };
  /* a day in a sentence: today, or its weekday */
  const nm = (W, d) => (d === W.end ? "today" : L.dayName(d));
  const Nm = (W, d) => cap1(nm(W, d));
  const why = (W, f) => L.dayWhy(W.M, f, MODE, { name: Nm(W, f.d) });
  /* a line under a row of days, starting with the mark it explains, so the lines are the legend */
  const line = (k, text) => (k ? `<li>${RU.dayKey(k)}<span>${esc(text)}</span></li>` : `<li class="is-plain"><span>${esc(text)}</span></li>`);
  const cnt = (u) => (u.nLo === u.nHi ? `${u.nLo}` : `${u.nLo} to ${u.nHi}`);
  /* the person's own symptom usual, in Insights' words */
  const symUsual = (u) => (!u || !u.sym ? "" : u.sym.every == null ? "Your usual: rarely." : u.sym.every <= 1 ? "Your usual is most days." : `Your usual is about 1 day in ${u.sym.every}.`);
  /* symptoms over the days logged, so the count can be set against the usual: "Symptoms on 2 of 6 days you logged:
     mild bloating both days. Your usual is about 1 day in 3." (L.symLine's own head, as Insights' words) */
  const symFull = (W, usual) => {
    const sl = L.symLine(W.F, { of: W.F.filter((f) => f.logged).length });
    return sl ? `${sl}${usual && W.u ? ` ${symUsual(W.u)}` : ""}` : "";
  };
  /* "at 8:55 AM", or "between 9:05 and 9:20 AM" for days that share a reason */
  const timeRange = (fs) => {
    const ts = fs.map((f) => f.first).sort((a, b) => a - b), a = T(ts[0]), b = T(ts[ts.length - 1]);
    return a === b ? `at ${a}` : `between ${a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a} and ${b}`;
  };
  const outNames = (W, fs) => [...new Set(fs.flatMap((f) => f.bms.filter((b) => L.inForms(W.M, b, MODE) === false).map((b) => L.formName(b, MODE))))];
  /* the dates the week counts: from the day the person started, when that's inside the 7 */
  const spanOf = (W) => RU.spanText(Math.min(W.end, Math.max(W.end - 6, W.M.start)), W.end);
  /* a day before the person started: the date alone, in Ink 3 (data viz.md, section 1) */
  const beforeMarks = (W) => {
    const out = [];
    for (let d = W.end - 6; d < Math.max(W.end - 6, W.M.start); d++) out.push(`<li>${RU.dayMark({ d, today: false }, { before: true, dow: true })}</li>`);
    return out;
  };
  /* before day 14: how many BMs over how many days, and any No BM, over every day logged (a flagged today too) */
  const learnFacts = (W) => {
    const F = W.F, nBm = F.reduce((s, f) => s + f.bms.length, 0), bmDays = F.filter((f) => f.bms.length).length, noBm = F.filter((f) => f.count === 0);
    const on = andJoin(noBm.map((f, i) => (f.today ? "today" : i ? L.dayName(f.d) : `on ${L.dayName(f.d)}`)));
    if (nBm) return `${plural(nBm, "BM")} over ${plural(bmDays, "day")}${noBm.length ? `, and No BM ${on}` : ""}.`;
    return noBm.length ? `No BM logged ${on}.` : "";
  };
  const noneLine = (W) => { const none = W.F.filter((f) => !f.logged && !f.pending); return none.length ? `Nothing logged on ${andJoin(none.map((f) => L.dayName(f.d)))}.` : ""; };
  const quietLines = (W) => W.F.filter((f) => f.logged && (f.state === "unsure" || f.state === "nocount")).map((f) => why(W, f).line);
  const hasFlag = (F) => F.some((f) => f.state === "flag");
  const insightsLink = () => `<button type="button" class="ap-link ap-wk-go">See these days on Insights ${RU.icon("chev")}</button>`;

  /* the days outside the usual, grouped by what was different, one group per reason (a day with two reasons sits in
     both), in day order (data viz.md, section 3) */
  const groupsOf = (W) => {
    const by = {};
    W.F.filter((f) => f.state === "shifted").forEach((f) => {
      const rs = why(W, f).reasons;
      (rs.length ? rs : [{ k: "other", text: "outside your usual", short: "" }]).forEach((r) => {
        const key = r.k === "form" ? `form:${r.short}` : r.k;
        (by[key] = by[key] || { key, k: r.k, r, fs: [] }).fs.push(f);
      });
    });
    return Object.values(by).sort((a, b) => a.fs[0].d - b.fs[0].d || b.fs.length - a.fs.length);
  };
  /* one line a group: "Monday and Wednesday: your first BM came later than usual, between 9:05 and 9:20 AM." */
  const groupLine = (W, g) => {
    const u = W.u, fs = g.fs;
    if (fs.length === 1) return `${Nm(W, fs[0].d)}: ${g.r.text}.`;
    const days = cap1(andJoin(fs.map((f) => nm(W, f.d))));
    if (g.k === "late" || g.k === "early") return `${days}: your first BM came ${g.k === "late" ? "later" : "earlier"} than usual, ${timeRange(fs)}.`;
    if (g.k === "form") { const ns = outNames(W, fs); return `${days}: ${ns.length === 1 ? "a BM was" : "BMs were"} ${andJoin(ns)}, ${g.r.short}.`; }
    if (g.k === "none") return `${days}: No BM, fewer than your usual ${cnt(u)} a day.`;
    if (g.k === "more" || g.k === "fewer") return `${days}: ${g.k} BMs than your usual ${cnt(u)} a day.`;
    return `${days}: outside your usual.`;
  };
  /* at most three lines for the days outside: past three groups, the two that cover the most days (said in day order)
     and an "Also outside your usual" naming the rest */
  const capGroups = (W) => {
    const G = groupsOf(W);
    if (G.length <= 3) return { own: G, rest: [] };
    const own = G.slice().sort((a, b) => b.fs.length - a.fs.length || a.fs[0].d - b.fs[0].d).slice(0, 2).sort((a, b) => a.fs[0].d - b.fs[0].d);
    const named = new Set(own.flatMap((g) => g.fs.map((f) => f.d)));
    return { own, rest: W.F.filter((f) => f.state === "shifted" && !named.has(f.d)) };
  };
  const alsoLine = (W, rest) => (rest.length ? `Also outside your usual: ${andJoin(rest.map((f) => nm(W, f.d)))}.` : "");
  const groupLines = (W) => {
    const { own, rest } = capGroups(W);
    return own.map((g) => groupLine(W, g)).concat(alsoLine(W, rest) || []);
  };

  /* ============ 1 Days and reasons ============ */
  const opt1 = (W) => {
    const { u, F, T7 } = W, logged = F.filter((f) => f.logged), lines = [];
    let answer, row = true;
    /* a flagged today first, so the Teal ring is explained before anything else */
    if (hasFlag(F)) lines.push(line("flag", L.FLAG_DAY));
    if (u) {
      answer = T7.known ? `${RU.dayKey("usual")}<span><b>${T7.within} of ${plural(T7.known, "day")}</b> within your usual</span>`
        : `<span>${logged.length ? "None of the last 7 days can be read against your usual." : "Nothing logged in the last 7 days."}</span>`;
      groupLines(W).forEach((t) => lines.push(line("shift", t)));
      quietLines(W).forEach((t) => lines.push(line("quiet", t)));
      const nl = noneLine(W);
      if (nl) lines.push(line("none", nl));
    } else if (logged.length) {
      answer = `${RU.dayKey("quiet")}<span><b>${plural(logged.length, "day")}</b> logged</span>`;
      lines.push(line("none", `${learnFacts(W)} Florin reads each day against your usual from day ${L.LEARN_DAYS}.`.trim()));
      const nl = noneLine(W);
      if (nl) lines.push(line("none", nl));
    } else {
      answer = "<span>No days logged yet.</span>";
      row = false;
      lines.push(line(null, "Your days show here as you log them."));
    }
    const sl = symFull(W, true);
    if (sl) lines.push(line("sym", sl));
    const span = spanOf(W);
    const days = row ? `<ol class="ap-days" aria-label="${esc(`Your last 7 days, ${span}`)}">${beforeMarks(W).join("")}${F.map((f) => `<li>${RU.dayMark(f, { M: W.M, mode: MODE, dow: true })}</li>`).join("")}</ol>` : "";
    return `<section class="ap-card ap-wk" data-week>
        <div class="ap-card-h"><h2>Your last 7 days</h2><span class="ap-k">${esc(span)}</span></div>
        <p class="ap-wk-a" data-answer>${answer}</p>
        ${days}
        <ul class="ap-wk-ls">${lines.join("")}</ul>
        ${insightsLink()}
      </section>`;
  };

  /* ============ 2 Week strip ============ */
  const SHORT = { none: "No BM", more: "more BMs", fewer: "fewer BMs", late: "first BM later", early: "first BM earlier" };
  const shortOf = (r) => (r.k === "form" ? (/firmer/.test(r.short) ? "firmer" : /looser/.test(r.short) ? "looser" : "a form outside your usual") : SHORT[r.k] || "");
  /* one line naming the days outside the usual, each with its reason in a word or two; days that share their reasons
     share the words in brackets. Past three different reasons, the line names the days only */
  const goldParts = (W) => {
    const sh = W.F.filter((f) => f.state === "shifted"), by = [];
    sh.forEach((f) => {
      const p = why(W, f).reasons.map(shortOf).filter(Boolean).join(", ");
      const g = by.find((x) => x.p === p);
      if (g) g.fs.push(f); else by.push({ p, fs: [f] });
    });
    return { sh, by };
  };
  const goldLine = (W) => {
    const { sh, by } = goldParts(W);
    if (!sh.length) return "";
    if (by.length > 3) return `Outside your usual: ${andJoin(sh.map((f) => nm(W, f.d)))}.`;
    const parts = by.map((g) => `${andJoin(g.fs.map((f) => nm(W, f.d)))}${g.p ? ` (${g.p})` : ""}`);
    return `Outside your usual: ${by.length > 1 && by.some((g) => g.fs.length > 1) ? parts.join("; ") : andJoin(parts)}.`;
  };
  const opt2 = (W, live) => {
    const { u, F, T7 } = W, logged = F.filter((f) => f.logged);
    const cells = F.map((f) => {
      const m = RU.dayMark(f, { M: W.M, mode: MODE, dow: true });
      /* every day but today is a button with a 44px hit area, as the calendar's days are */
      return f.today ? `<li>${m}</li>` : `<li><button type="button" class="ho-d"${live ? " data-live" : ""} data-day="${f.d}" aria-haspopup="dialog">${m}</button></li>`;
    });
    const span = spanOf(W), lines = [];
    let words;
    if (logged.length) {
      words = u ? (T7.known ? `${RU.dayKey("usual")}<span><b>${T7.within} of ${plural(T7.known, "day")}</b> within your usual</span>` : "<span>None of the last 7 days can be read against your usual.</span>") : `${RU.dayKey("quiet")}<span><b>${plural(logged.length, "day")}</b> logged</span>`;
      if (hasFlag(F)) lines.push(line("flag", L.FLAG_DAY));
      if (u) {
        const gl = goldLine(W);
        if (gl) lines.push(line("shift", gl));
        quietLines(W).forEach((t) => lines.push(line("quiet", t)));
      }
      const sl = symFull(W, false);
      if (sl) lines.push(line("sym", sl));
    } else {
      words = "<span>No days logged yet.</span>";
      lines.push(line(null, "Your days show here as you log them."));
    }
    return `<section class="ho-strip" data-week aria-label="${esc(`Your last 7 days, ${span}`)}">
        <p class="ho-strip-k"><span class="ap-k">Your last 7 days</span><span class="ap-k">${esc(span)}</span></p>
        <button type="button" class="ho-sa" data-answer><span>${words}</span>${logged.length ? RU.icon("chev") : ""}</button>
        <ol class="ap-days">${beforeMarks(W).join("")}${cells.join("")}</ol>
        <ul class="ho-sl">${lines.join("")}</ul>
      </section>`;
  };

  /* ============ 3 Words only ============ */
  const groupSentence = (W, g) => {
    const u = W.u, fs = g.fs, one = fs.length === 1, d0 = fs[0].d;
    const On = (d) => (d === W.end ? "Today" : `On ${L.dayName(d)}`);
    const onDays = andJoin(fs.map((f, i) => (f.d === W.end ? "today" : i ? L.dayName(f.d) : `on ${L.dayName(f.d)}`)));
    if (g.k === "late" || g.k === "early") {
      const w = g.k === "late" ? "later" : "earlier";
      return one ? `${On(d0)} your first BM came ${w} than usual, at ${T(fs[0].first)}.` : `Your first BM came ${w} than usual ${onDays}, ${timeRange(fs)}.`;
    }
    if (g.k === "form") {
      if (one) return `${On(d0)} ${g.r.text}.`;
      const ns = outNames(W, fs);
      return `${cap1(onDays)} a BM was ${ns.length === 1 ? `${ns[0]}, ` : ""}${g.r.short}.`;
    }
    if (g.k === "more" || g.k === "fewer") return one ? `${On(d0)} you logged ${plural(fs[0].count, "BM")}, ${g.k} than your usual ${cnt(u)} a day.` : `You logged ${g.k} BMs than your usual ${cnt(u)} a day ${onDays}.`;
    if (g.k === "none") return one ? `${On(d0)} you logged No BM; your usual is ${cnt(u)} a day.` : `You logged No BM ${onDays}; your usual is ${cnt(u)} a day.`;
    return one ? `${On(d0)} was outside your usual.` : `${cap1(onDays)} were outside your usual.`;
  };
  const opt3Parts = (W) => {
    const { u, F, T7: t } = W, logged = F.filter((f) => f.logged), body = [], ctx = [];
    if (!logged.length) return null;
    let lead;
    if (u) {
      lead = t.known ? `${t.within} of ${plural(t.known, "day")} within your usual.` : "None of the last 7 days can be read against your usual.";
      const { own, rest } = capGroups(W);
      own.forEach((g) => body.push(groupSentence(W, g)));
      if (rest.length) body.push(alsoLine(W, rest));
      quietLines(W).forEach((s) => body.push(s));
      const sl = symFull(W, true);
      ctx.push(sl || `No symptoms logged. ${symUsual(u)}`);
    } else {
      lead = `${plural(logged.length, "day")} logged so far.`;
      const lf = learnFacts(W);
      body.push(`${lf ? `${lf} ` : ""}From day ${L.LEARN_DAYS}, Florin reads each day against your usual.`);
      const sl = symFull(W, false);
      if (sl) ctx.push(sl);
    }
    const nl = noneLine(W);
    if (nl) ctx.push(nl);
    return { lead, body, ctx };
  };
  const opt3 = (W) => {
    const P = opt3Parts(W);
    /* nothing logged: no card. FloraScore's day count and the next step already say it */
    if (!P) return "";
    const span = spanOf(W);
    return `<section class="ap-card ho-note" data-week aria-label="${esc(`Your last 7 days, ${span}`)}">
        <div class="ap-card-h"><h2>Your last 7 days</h2><span class="ap-k">${esc(span)}</span></div>
        ${hasFlag(W.F) ? `<p class="ho-note-flag">${RU.icon("info")}<span>${esc(L.FLAG_DAY)}</span></p>` : ""}
        <p class="ho-note-lead" data-answer>${esc(P.lead)}</p>
        ${P.body.length ? `<p class="ho-note-body">${esc(P.body.join(" "))}</p>` : ""}
        ${P.ctx.length ? `<p class="ho-note-ctx">${esc(P.ctx.join(" "))}</p>` : ""}
        ${insightsLink()}
      </section>`;
  };

  /* ============ 4 Morning times chart ============
     The first BM of each day on a time axis, earlier at the top, the usual window as the band (named in words under
     it). A flagged today is a Teal ring at its place with nothing inside, labelled Noted for a clinician, in no count
     (data viz.md, section 1). The axis says every time the same way ("7 AM", "7:15 AM"), and an hour that would crowd a
     band edge's label is left unlabelled */
  const n1 = (v) => Math.round(v * 10) / 10;
  const opt4 = (W) => {
    const { M, u, F, end } = W, by = {};
    F.forEach((f) => (by[f.d] = f));
    const cols = [];
    for (let d = end - 6; d <= end; d++) cols.push({ d, f: by[d] || null });
    const logged = F.filter((f) => f.logged), plotted = F.filter((f) => f.first != null);
    const span = spanOf(W), sl = symFull(W, true);
    const head = `<div class="ap-card-h"><h2>Your last 7 days</h2><span class="ap-k">${esc(span)}</span></div>`;
    const ls = [];
    if (hasFlag(F)) ls.push(line("flag", L.FLAG_DAY));
    if (plotted.length < 2) {
      /* nothing to chart until two days have a first BM */
      ls.push(line(null, plotted.length ? `Your first BM so far came at ${T(plotted[0].first)}. The chart starts once two days have a first BM.` : `Your first BM each day shows here as you log it${u ? ", against your usual window" : `, against your usual window from day ${L.LEARN_DAYS}`}.`));
      const lf = !u && learnFacts(W);
      if (lf) ls.push(line("none", lf));
      if (sl) ls.push(line("sym", sl));
      return `<section class="ap-card ap-wk ho-mo" data-week>${head}<p class="ap-wk-a" data-answer><span>${logged.length ? `${plural(logged.length, "day")} logged` : "No days logged yet."}</span></p><ul class="ap-wk-ls">${ls.join("")}</ul>${insightsLink()}</section>`;
    }
    const flagF = plotted.find((f) => f.flag);
    const w = 318, left = 56, right = 10, top = flagF ? 26 : 10, plotH = 108;
    const ts = plotted.map((f) => f.first).concat(u ? [u.tLo, u.tHi] : []);
    const lo = Math.floor(Math.min(...ts));
    let hi = Math.ceil(Math.max(...ts) + 0.001);
    if (hi - lo < 2) hi = lo + 2;
    const y = (t) => top + ((t - lo) / (hi - lo)) * plotH;
    const slot = (w - left - right) / 7, x = (i) => left + slot * i + slot / 2, base = top + plotH + 12;
    let g = "", marks = "", labels = "";
    if (u) g += `<rect class="c-band" x="${left}" y="${n1(y(u.tLo))}" width="${w - left - right}" height="${n1(y(u.tHi) - y(u.tLo))}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(y(u.tLo))}" y2="${n1(y(u.tLo))}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(y(u.tHi))}" y2="${n1(y(u.tHi))}"/>`;
    /* the axis: the band's two edges named in Plum, the hours in Ink 3, every time written the same way */
    const edge = u ? [u.tLo, u.tHi] : [];
    const every = Math.max(1, Math.ceil((hi - lo) / 4)), said = edge.map(y);
    for (let h = lo; h <= hi; h++) {
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(y(h))}" y2="${n1(y(h))}"/>`;
      if (said.some((v) => Math.abs(v - y(h)) < 16) || ((h - lo) % every && h !== hi)) continue;
      said.push(y(h));
      labels += `<text class="dv-ax" x="${left - 6}" y="${n1(y(h) + 3.5)}" text-anchor="end">${esc(T(h, { short: true }))}</text>`;
    }
    edge.forEach((e) => (labels += `<text class="dv-ax is-usual" x="${left - 6}" y="${n1(y(e) + 3.5)}" text-anchor="end">${esc(T(e))}</text>`));
    g += `<line class="dv-base" x1="${left}" x2="${w - right}" y1="${base}" y2="${base}"/>`;
    const r = 5;
    let flagAt = null;
    /* every mark and label takes a box, so a Gold dot's label goes where it crowds nothing: right, left, above, then
       below; with no room, the line under the chart says it */
    const boxes = [], gold = [];
    const hit = (q) => boxes.some((o) => q.x0 < o.x1 && q.x1 > o.x0 && q.y0 < o.y1 && q.y1 > o.y0);
    cols.forEach((c, i) => {
      const f = c.f;
      if (!f || !f.logged) return;
      if (f.first == null) {
        if (f.count === 0) { labels += `<text class="ho-mo-nobm" x="${n1(x(i))}" y="${base - 6}" text-anchor="middle">No BM</text>`; boxes.push({ x0: x(i) - 16, x1: x(i) + 16, y0: base - 15, y1: base - 3 }); }
        return;
      }
      const px = x(i), py = y(f.first), rr = f.today && !f.flag ? r + 4 : r + 2;
      boxes.push({ x0: px - rr, x1: px + rr, y0: py - rr, y1: py + rr });
      if (f.flag) { marks += `<circle class="dv-dot is-flag" cx="${n1(px)}" cy="${n1(py)}" r="${r}"/>`; flagAt = { px, py }; return; }
      marks += `<circle class="dv-dot${!u ? " is-learn" : f.inWin === false ? " is-shift" : ""}" cx="${n1(px)}" cy="${n1(py)}" r="${r}"/>`;
      if (f.today) marks += `<circle class="dv-ring" cx="${n1(px)}" cy="${n1(py)}" r="${r + 3}"/>`;
      if (u && f.inWin === false) gold.push({ f, px, py, rr });
    });
    gold.forEach(({ f, px, py, rr }) => {
      const late = Math.round(f.first * 60) / 60 > u.tHi, txt = `${T(f.first).replace(/ AM| PM/, "")} ${late ? "later" : "earlier"}`, lw = txt.length * 6.2;
      const mid = Math.max(left + 2 + lw / 2, Math.min(w - 2 - lw / 2, px));
      const cands = [
        { a: "start", tx: px + rr + 3, ty: py + 3.5, q: { x0: px + rr + 3, x1: px + rr + 3 + lw, y0: py - 6, y1: py + 6 } },
        { a: "end", tx: px - rr - 3, ty: py + 3.5, q: { x0: px - rr - 3 - lw, x1: px - rr - 3, y0: py - 6, y1: py + 6 } },
        { a: "middle", tx: mid, ty: py - rr - 4, q: { x0: mid - lw / 2, x1: mid + lw / 2, y0: py - rr - 14, y1: py - rr - 2 } },
        { a: "middle", tx: mid, ty: py + rr + 11, q: { x0: mid - lw / 2, x1: mid + lw / 2, y0: py + rr + 1, y1: py + rr + 13 } }
      ];
      const k = cands.find((cd) => cd.q.x0 >= left + 2 && cd.q.x1 <= w - 2 && cd.q.y0 >= 0 && cd.q.y1 <= base - 1 && !hit(cd.q));
      if (!k) return;
      boxes.push(k.q);
      labels += `<text class="ho-mo-dl" x="${n1(k.tx)}" y="${n1(k.ty)}" text-anchor="${k.a}">${esc(txt)}</text>`;
    });
    /* a flagged today's label sits above the plot, with a lead down to its ring */
    if (flagAt) {
      labels += `<text class="dv-newlbl ho-mo-flag" x="${n1(Math.min(w - 2, flagAt.px + 6))}" y="12" text-anchor="end">Noted for a clinician</text>`;
      if (flagAt.py - r - 4 > 18) g += `<line class="dv-lead" x1="${n1(flagAt.px)}" x2="${n1(flagAt.px)}" y1="17" y2="${n1(flagAt.py - r - 4)}"/>`;
    }
    /* the days under the axis: the weekday (Today for the last day) and the date, Ink 3 for a day with nothing logged or
       before the person started; a Teal square for a day with symptoms, explained by the symptom line */
    const ax = base + 15, ctxY = base + 38, anySym = cols.some((c) => c.f && c.f.logged && c.f.nsym);
    cols.forEach((c, i) => {
      const dt = L.dateOf(c.d), last = c.d === end, quiet = !c.f || (!c.f.logged && !last);
      labels += `<text class="dv-ax ho-mo-dow${last && c.f ? " is-today" : ""}${quiet ? " is-quiet" : ""}" x="${n1(x(i))}" y="${ax}" text-anchor="middle">${last && c.f ? "Today" : Ut.DOW[dt.getDay()]}</text>`;
      labels += `<text class="dv-ax ho-mo-date${quiet ? " is-quiet" : ""}" x="${n1(x(i))}" y="${ax + 14}" text-anchor="middle">${dt.getDate()}</text>`;
      if (c.f && c.f.logged && c.f.nsym) labels += `<rect class="dv-sq" x="${n1(x(i) - 4)}" y="${ctxY - 4}" width="8" height="8" rx="2"/>`;
    });
    const H = anySym ? ctxY + 6 : base + 34;
    const chart = `<svg class="dv-chart ho-mo-svg" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(`First BM each day, ${span}${u ? `, against your usual window, ${T(u.tLo)} to ${T(u.tHi)}` : ""}`)}">${g}${marks}${labels}</svg>`;
    const band = u ? `<p class="ho-mo-band">The band is your usual window, ${esc(T(u.tLo).replace(/ AM$/, ""))} to ${esc(T(u.tHi))}.</p>` : `<p class="ho-mo-band is-learn">Your usual window shows here as a band from day ${L.LEARN_DAYS}.</p>`;
    /* the answer, in the Timing card's words, over the mornings read (never a flagged today): RU.week's count */
    let answer;
    if (u) {
      const wk = RU.week(M, MODE, end);
      answer = wk.rmornings.length ? `<span>First BM in your window on <b>${wk.inWin} of ${plural(wk.rmornings.length, "day")}</b></span>` : "<span>No first BM to read in the last 7 days.</span>";
    } else {
      const lo1 = Math.min(...plotted.map((f) => f.first)), hi1 = Math.max(...plotted.map((f) => f.first));
      answer = `<span>First BM logged on <b>${plural(plotted.length, "day")}</b>, ${lo1 === hi1 ? `at ${T(lo1)}` : `from ${T(lo1)} to ${T(hi1)}`}</span>`;
    }
    if (u) {
      groupLines(W).forEach((t) => ls.push(line("shift", t)));
      quietLines(W).forEach((t) => ls.push(line("quiet", t)));
    } else {
      const lf = learnFacts(W);
      if (lf) ls.push(line("none", lf));
    }
    const nl = noneLine(W);
    if (nl) ls.push(line("none", nl));
    if (sl) ls.push(line("sym", sl));
    return `<section class="ap-card ap-wk ho-mo" data-week>${head}
        <p class="ap-wk-a" data-answer>${answer}</p>
        <div class="ho-mo-chart">${chart}${band}</div>
        <ul class="ap-wk-ls">${ls.join("")}</ul>
        ${insightsLink()}
      </section>`;
  };

  /* ============ question 1: what the week shows ============
     C: { W (the week drawn), Wh (the person's hardest week, or null), hard (its numbers), name, H (each week's height,
     measured) }. Every figure a text states comes from one of these */
  const shortest = (C, id) => { const hs = Object.entries(C.H || {}).filter(([, h]) => h > 0); return hs.length > 1 && hs.every(([k, h]) => k === id || h > C.H[id]); };
  const tallest = (C, id) => { const hs = Object.entries(C.H || {}).filter(([, h]) => h > 0); return hs.length > 1 && hs.every(([k, h]) => k === id || h < C.H[id]); };
  const hardName = (C) => `${C.name}'s hardest week (${spanOf(C.Wh)})`;
  const CARDS = [
    {
      id: "card", n: 1, name: "Days and reasons", rec: true, draw: (W) => opt1(W),
      what: () => "A card with one count, a row of seven day circles ending on today, and a line for each thing that was different. Days that differed the same way share a line.",
      why: () => "You get the answer first, then see where in the week the different days fell, drawn with the circle History's calendar and Easy already use, then why each one was different in plain words.",
      not: (C) => {
        const box = document.createElement("div");
        if (C.Wh) box.innerHTML = opt1(C.Wh);
        const n = box.querySelectorAll(".ap-wk-ls li").length;
        return `It asks you to take in three parts: a count, a row of circles and the lines under it${C.Wh ? `. On ${hardName(C)}, the lines run to ${n}` : ""}.`;
      }
    },
    {
      id: "strip", n: 2, name: "Week strip", draw: (W, live) => opt2(W, live),
      what: () => "The week with no card: a count, a row of day circles you can tap, and one line naming the days outside your usual, each with its reason in a word or two. Its days are buttons, which changes the data viz rule that the week's circles are not.",
      why: (C) => `${shortest(C, "strip") ? "It is the shortest of the four, and a" : "A"} tap on a day opens it as History draws it, so the full reasons are one tap away.`,
      not: (C) => {
        const p = C.Wh ? goldParts(C.Wh) : null;
        const hard = p && p.sh.length ? `, and on ${hardName(C)} its one line has to name ${plural(p.sh.length, "day")} with ${plural(p.by.length, "different reason")}` : "";
        return `The reasons shrink to a word or two, so "first BM later" says less than a time${hard}.`;
      },
      try: "Tap a day to open it as History draws it."
    },
    {
      id: "note", n: 3, name: "Words only", draw: (W) => opt3(W),
      what: () => "The week in sentences, with no chart: the count, what was different grouped by what it was, then symptoms against your usual and any day with nothing logged.",
      why: () => "There is nothing to decode, and a screen reader reads it as written. Whether it tells someone faster than a row of days how their week went is what the focus group will test.",
      not: (C) => {
        const P = C.Wh ? opt3Parts(C.Wh) : null;
        return `Home stops showing the day circles that History's calendar and Easy draw, so people meet them somewhere else first${P && P.body.length > 1 ? `, and on ${hardName(C)} its middle runs to ${plural(P.body.length, "sentence")}` : ""}.`;
      }
    },
    {
      id: "chart", n: 4, name: "Morning times chart", draw: (W) => opt4(W),
      what: () => "Each day's first BM on a time chart, against your usual window drawn as a band, then a line for anything else that was different.",
      why: (C) => {
        const u = C.W.u;
        if (!u) return `It is the only option that will show your own usual window, once Florin knows it on day ${L.LEARN_DAYS}, and how far a day moved from it.`;
        const moved = C.W.F.filter((f) => f.logged && !f.flag && f.inWin === false && f.first != null).map((f) => { const m = Math.round(f.first * 60) / 60; return { f, mins: Math.round((m > u.tHi ? m - u.tHi : u.tLo - m) * 60), late: m > u.tHi }; });
        const far = moved.sort((a, b) => b.mins - a.mins)[0];
        return `It is the only option that shows your own usual window and how far a day moved from it${far ? `: ${nm(C.W, far.f.d)}'s first BM came ${plural(far.mins, "minute")} ${far.late ? "after the window closed" : "before the window opened"}` : ""}.`;
      },
      not: (C) => {
        const u = C.W.u, tall = tallest(C, "chart") ? " It is also the tallest of the four." : "";
        if (!u) return `Until day ${L.LEARN_DAYS} there is no band, so the dots say only when each first BM came.${tall}`;
        const hid = C.W.F.find((f) => f.state === "shifted" && f.inWin === true && (f.formsIn === false || f.inCount === false));
        const what = hid ? (hid.formsIn === false ? `a BM logged as ${andJoin(outNames(C.W, [hid]))}` : `its ${plural(hid.count, "BM")}`) : "";
        const s1 = hid ? `The chart shows one measure. Form and count are words only, so ${nm(C.W, hid.d)} gets a Gold line for ${what} while its dot sits inside the band.` : "The chart shows one measure. Form and count are words only, so a day outside your usual forms or count gets a Gold line while its dot sits inside the band.";
        const s2 = C.W.T7.known ? ` Home also stops saying "${C.W.T7.within} of ${plural(C.W.T7.known, "day")} within your usual", the count Insights gives.` : "";
        return `${s1}${s2}${tall}`;
      }
    }
  ];
  const REC = CARDS.find((c) => c.rec);
  const REC1_WHY = "Against the card you flagged, it gives one count where that card gave three, draws each day once where that card drew it in four places, names each day that was different in a sentence, and needs no legend. It keeps the day circle History's calendar and Easy already draw.";
  const OPEN1 = "Do people read the row of days, or only the words? Show Days and reasons and Words only to the focus group in the same place, under FloraScore, with the same week, and ask which tells them faster how their week went.";

  /* ============ question 2: where it sits ============
     The three places, each drawn as the whole of Today; m is a phone's measurements: tab (the top of the tab bar, where
     the first screen ends), week, answer (the count), hero, num (FloraScore's number or Day 5 of 14), flag (today's note
     to primary care) */
  const POS = [
    { id: "top", n: "A", name: "At the top", where: "Under the greeting, above FloraScore", order: ["top", "week", "hero", "checkin", "entries", "next", "fine"] },
    { id: "under", n: "B", name: "Under FloraScore", where: "After FloraScore and the check-in, before today's logs", order: ["top", "hero", "checkin", "week", "entries", "next", "fine"], rec: true },
    { id: "after", n: "C", name: "After today's logs", where: "Where the app has it now", order: ["top", "hero", "checkin", "entries", "week", "next", "fine"] }
  ];
  const REC2 = POS.find((p) => p.rec);
  /* what of the week shows on the first screen */
  const SEEN = { all: "the whole week shows on the first screen", count: "its count shows on the first screen and the rest just below it", title: "only its title shows on the first screen", below: "it starts below the first screen" };
  const seenK = (m) => (!m || !m.week ? "" : m.week.bottom <= m.tab ? "all" : m.answer && m.answer.bottom <= m.tab ? "count" : m.week.top + 24 <= m.tab ? "title" : "below");
  const seen = (m) => SEEN[seenK(m)] || "";
  /* the parts of Today above the week, by name */
  const above = (p, m, nLogs) => {
    const ks = p.order.slice(0, p.order.indexOf("week"));
    return ks.map((k) => (k === "hero" ? "FloraScore" : k === "checkin" ? (m && m.ck ? "the check-in" : "") : k === "entries" ? (nLogs ? `today's ${plural(nLogs, "log")}` : "today's logs") : "")).filter(Boolean);
  };
  const posText = (p, C) => {
    const P = C.P, due = P[`${p.id}:1`], not = P[`${p.id}:0`], ckDue = C.ckDue;
    const none = !due || !due.week;
    if (p.id === "top") return {
      what: "The week right under the greeting, before FloraScore.",
      why: none ? "The week is the first thing Today says, whatever else the day holds." : `${cap1(seen(due))}, whatever else today holds.`,
      not: (() => {
        const u = P["under:1"];
        const numOff = due && due.num && due.num.bottom > due.tab, flagOff = C.flag && due && due.flag && due.flag.bottom > due.tab && u && u.flag && u.flag.bottom <= u.tab;
        return `FloraScore, which Score first puts first, comes second${numOff ? ", and its number drops below the first screen" : ""}.${flagOff ? ` Today's note to primary care drops below the first screen${numOff ? " too" : ""}.` : ""}`;
      })()
    };
    if (p.id === "under") return {
      what: ckDue ? "The week after FloraScore and, on the evening it's due, the weekly check-in, before today's logs." : "The week right after FloraScore, before today's logs.",
      why: `FloraScore stays first, and the week no longer moves down as the day fills.${none ? "" : ckDue ? ` On evenings the check-in isn't due, ${seen(not)}.` : ` ${cap1(seen(due))}.`}`,
      not: none ? "Today's own logs come after a summary of the week." : ckDue ? `On the evening the check-in is due, its card comes between FloraScore and the week, and ${seen(due)}.` : "Today's own logs come after a summary of the week, one scroll further down."
    };
    const n = C.nLogs;
    return {
      what: "The week at the end of Today, after FloraScore, the check-in when it's due, and today's logs.",
      why: "Today stays about today: FloraScore and today's own logs come first, and the week sums up after them.",
      not: none ? "It moves down as the day fills." : (() => {
        const m = ckDue ? not : due, k = seenK(m), s = seen(m), ab = andJoin(above(p, m, n));
        const now = n ? `with ${plural(n, "log")} today` : "with nothing logged yet today";
        if (k === "all" || k === "count") return `It moves down as the day fills: ${now}, ${s}, and each log added pushes it lower.`;
        return `It moves down as the day fills. ${cap1(now)}${ckDue ? ", even on evenings the check-in isn't due," : ","} ${s}${k === "below" && ab ? `: you scroll past ${ab} to reach it` : ""}.`;
      })()
    };
  };
  const rec2Why = (C) => {
    const P = C.P1, not = P && P["under:0"], due = P && P["under:1"];
    const w = C.card === REC.id ? "" : `With ${REC.name}, `;
    const s = C.ckDue ? (not && not.week ? ` ${w ? `${w}on` : "On"} evenings the check-in isn't due, ${seen(not)}.` : "") : due && due.week ? ` ${w}${w ? seen(due) : cap1(seen(due))}.` : "";
    return `FloraScore stays first, as Score first says, and the week comes before today's logs, so it stops sliding down the screen as the day fills.${s}`;
  };

  /* ============ state ============ */
  const PEOPLE = [["sarah", "Sarah"], ["marcus", "Marcus"], ["alex", "Alex"]];
  const LOGS = [["est", "12 weeks"], ["new", "Day 5"], ["fresh", "Just joined"]];
  const root = document.documentElement;
  const sysDark = () => !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const viewerTheme = () => root.getAttribute("data-theme") || (sysDark() ? "dark" : "light");
  const S = { persona: "marcus", data: "est", flag: false, theme: null, week: "now", card: "card", ck: "due", phones: null, ctl: false };
  const KEY = "florin-home-options";
  try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); if (s && typeof s === "object") ["persona", "data", "flag", "theme", "week", "card", "ck"].forEach((k) => { if (k in s) S[k] = s[k]; }); } catch (e) {}
  if (!PEOPLE.some(([v]) => v === S.persona)) S.persona = "marcus";
  if (!LOGS.some(([v]) => v === S.data)) S.data = "est";
  if (!CARDS.some((c) => c.id === S.card)) S.card = "card";
  S.flag = S.flag === true;
  if (S.week !== "hard") S.week = "now";
  if (S.ck !== "not") S.ck = "due";
  if (S.theme !== "light" && S.theme !== "dark") S.theme = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ persona: S.persona, data: S.data, flag: S.flag, theme: S.theme, week: S.week, card: S.card, ck: S.ck })); } catch (e) {} };
  const themeNow = () => S.theme || viewerTheme();
  const wide = () => !window.matchMedia || window.matchMedia("(min-width: 820px)").matches;

  /* a demo person's model, with a 7:30 PM BM with blood noted added to today when the note is on */
  const build = (persona) => {
    const M = L.build(persona, S.data, { meals: "all" });
    if (S.flag) L.add(M, { kind: "bm", d: L.TODAY, t: 19.5, form: 4, how: {}, dur: null, flags: { blood: true }, note: "" });
    return M;
  };
  const V0 = { form: MODE, mealUI: "quick", plan: "member", bmUI: "quick", home: "score", history: "list", checkin: true, look: "built", easy: false, onboard: "short", meals: "all" };
  let uid = 0, CUR = null;

  /* ============ the page ============ */
  const seg = (key, label, opts, cur, o = {}) => `<div class="ho-ctl"><span class="ho-ctl-l" id="ho-l-${key}">${esc(label)}</span><div class="ho-seg" role="group" aria-labelledby="ho-l-${key}">${opts.map(([v, l, dis]) => `<button type="button" id="ho-${key}-${v}" data-k="${key}" data-v="${v}" aria-pressed="${cur === v}"${dis ? " disabled" : ""}>${esc(l)}</button>`).join("")}</div>${o.after || ""}</div>`;
  const TABS = [["home", "Today", true], ["chart", "Insights"], null, ["list", "History"], ["chat", "Ask"]];
  /* one phone: Today drawn to its end, the week in place p; the app's tab bar floats at the foot of the first screen,
     and two ticks at the phone's edges mark the top of it: the last line someone reads before they scroll */
  const phone = (p, cardId, W, V, ck, o = {}) => {
    const card = CARDS.find((c) => c.id === cardId), Vp = Object.assign({}, V, { checkin: ck });
    const parts = p.order.map((k) => {
      if (k === "week") { try { return card.draw(W, false); } catch (e) { console.error(cardId, e); return `<p class="ho-err">This week failed to draw.</p>`; } }
      try { return RU.todayParts[k](W.M, Vp) || ""; } catch (e) { console.error(k, e); return ""; }
    });
    const tb = TABS.map((t) => (t ? `<span class="ap-tb-b"${t[2] ? ' aria-current="true"' : ""}>${RU.icon(t[0])}<span>${t[1]}</span></span>` : `<span class="ap-tb-plus">${RU.icon("plus")}</span>`)).join("");
    return `<div class="ap ap-rx ho-phone" data-theme="${themeNow()}" data-pos="${p.id}" data-card="${cardId}" data-ck="${ck ? 1 : 0}"${o.measure ? ' aria-hidden="true"' : ` role="group" aria-label="${esc(`${p.name}: Today on a phone, with ${card.name}`)}"`}>
        <div class="ap-scr ap-today">${parts.join("\n")}</div>
        <div class="ho-scr1" aria-hidden="true"><nav class="ap-tb">${tb}</nav><i class="ho-tick ho-tick--l"></i><i class="ho-tick ho-tick--r"></i></div>
      </div>`;
  };
  /* the week alone, on Today's ground, at the width it has on a 390 phone */
  const weekBox = (c, W) => {
    let html;
    try { html = c.draw(W, true); } catch (e) { console.error(c.id, e); html = `<p class="ho-err">This week failed to draw.</p>`; }
    return `<div class="ap ap-rx ho-wk" data-theme="${themeNow()}" data-card="${c.id}"><div class="ap-scr ap-today ho-wk-scr">${html || `<p class="ho-wk-none">${esc(c.name)} draws nothing until something is logged.</p>`}</div></div>`;
  };
  const dl = (rows) => `<dl>${rows.filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  const cardText = (c, C) => dl([["What it is", c.what(C)], ["Why do it", c.why(C)], ["Why not", c.not(C)], ["Try it", c.try || ""]]);
  const posTextHtml = (p, C) => { const t = posText(p, C); return dl([["What it is", t.what], ["Why do it", t.why], ["Why not", t.not]]); };

  /* the people whose week reads word for word the same as this one, option by option */
  const sameWeek = (C) => {
    if (S.week === "hard" && C.Wh) return "";
    const draw = (M) => { const W = weekOf(M); return CARDS.map((c) => textOfHtml(c.draw(W, false))); };
    const mine = draw(C.M), me = PEOPLE.find(([p]) => p === S.persona)[1];
    const others = PEOPLE.filter(([p]) => p !== S.persona).map(([p, n]) => ({ n, same: draw(build(p)).map((t, i) => t === mine[i]) }));
    if (others.every((o) => o.same.every(Boolean))) return `In this demo, all three people have the same logs over these days, so every option reads the same for each.`;
    return others.filter((o) => o.same.some(Boolean)).map((o) => {
      if (o.same.every(Boolean)) return `${o.n}'s last 7 days read the same as ${me}'s in every option.`;
      const s = CARDS.filter((c, i) => o.same[i]).map((c) => c.name), d = CARDS.filter((c, i) => !o.same[i]).map((c) => c.name);
      return `${o.n}'s last 7 days read the same as ${me}'s in ${andJoin(s)}; ${andJoin(d)} ${d.length === 1 ? "differs" : "differ"}.`;
    }).join(" ");
  };
  /* the week's count, checked against Insights' 7 days (drawn off screen) and the data looks (FLD) */
  const agree = (C) => {
    const box = document.createElement("div"), W = C.Wnow, T7 = W.T7;
    let ins = null;
    try { box.innerHTML = RU.insights(C.M, C.V, { range: 7 }); ins = box; } catch (e) { console.error(e); }
    const fld = window.FLD ? (() => { try { return window.FLD.build(S.persona, { mode: MODE, M: C.M }).tally[7]; } catch (e) { console.error(e); return null; } })() : null;
    if (C.M.usual) {
      if (!T7.known) return "None of these 7 days can be read against the usual, here as on Insights.";
      const big = ins && ins.querySelector(".ap-sum-top .ap-big"), m = big ? /^(\d+)\s*of\s*(\d+)/.exec(big.textContent.trim()) : null;
      const okIns = !!m && +m[1] === T7.within && +m[2] === T7.known, okFld = !fld || (fld.within === T7.within && fld.known === T7.known);
      const said = `${T7.within} of ${plural(T7.known, "day")} within your usual`;
      return okIns && okFld ? `The count for the last 7 days, ${said}, is the one Insights' 7 days${fld ? " and the data looks" : ""} give.` : `The count here, ${said}, doesn't match ${!okIns ? `Insights' 7 days (${m ? `${m[1]} of ${m[2]}` : "not found"})` : "the data looks"}.`;
    }
    const lg = T7.logged, li = ins && ins.querySelector(".ap-sum-counts li b"), n = li ? +li.textContent : null;
    return n === lg ? `Before day ${L.LEARN_DAYS} the screens count days logged: ${lg}, as Insights does.` : `Days logged here (${lg}) and on Insights (${n == null ? "not found" : n}) don't match.`;
  };

  function render() {
    const M = build(S.persona), V = Object.assign({}, V0, { persona: S.persona, data: S.data, uid: ++uid });
    const name = PEOPLE.find(([p]) => p === S.persona)[1];
    const hard = hardEnd(M), Wnow = weekOf(M), Wh = hard ? weekOf(M, hard.e) : null;
    const W = S.week === "hard" && Wh ? Wh : Wnow;
    const ckDue = !!(M.checkin && M.checkin.status === "due");
    const nLogs = ((L.day(M, L.TODAY) || {}).entries || []).length;
    const C = (CUR = { M, V, W, Wnow, Wh, hard, name, H: {}, card: S.card, ckDue, flag: S.flag, nLogs, P: {}, P1: {} });
    if (S.phones == null) S.phones = wide();
    const t0 = L.dateOf(L.TODAY), part = L.NOW < 12 ? "morning" : L.NOW < 17 ? "afternoon" : "evening";
    const when = `${Ut.DOWL[t0.getDay()]} ${part}`;
    const sumParts = [name, LOGS.find(([v]) => v === S.data)[1], S.flag ? "clinician note today" : "", themeNow() === "dark" ? "Dark" : "Light"].filter(Boolean);
    mount.innerHTML = `
      <header class="ho-head">
        <div class="ho-head-t">
          <p class="ho-eyebrow">Florin app refresh · Home · October 29</p>
          <h1>Home: how should Today show the week?</h1>
          <p class="ho-lede"><b>We recommend ${esc(REC.name)}, placed under FloraScore and the check-in.</b> The week should tell someone, against their own usual, how their last 7 days went and what was different, so they can decide whether to look closer on Insights or tell a clinician.</p>
        </div>
        <figure class="ho-was">
          <img src="img/flagged-week-card.png" width="220" height="337" alt="The week card Will flagged: This week so far, Oct 5 to 11, three strips of dots for BMs, first BM and symptoms, with hatched cells for Thursday, a meals count and a four-line legend.">
          <figcaption>
            <p class="ho-k">The card you flagged</p>
            <ul>
              <li>It never said how the week went. Three strips gave three counts, in BMs, mornings and days, and none said which one mattered.</li>
              <li>One dot meant two things: a BM in one strip, a morning in the next. Wednesday was Plum in one and Gold in the other, with nothing saying why.</li>
              <li>An empty Thursday was drawn four times, as a struck date and three hatched cells, and the legend ran to four lines.</li>
            </ul>
          </figcaption>
        </figure>
      </header>
      <div class="ho-ctls" role="group" aria-label="The demo person in every drawing">
        <p class="ho-ctls-sum"><span>${esc(sumParts.join(" · "))}</span><button type="button" class="ho-ctls-b" data-ctl aria-expanded="${S.ctl}" aria-controls="ho-ctls-body">${S.ctl ? "Done" : "Change"}</button></p>
        <div class="ho-ctls-body" id="ho-ctls-body"${!S.ctl ? ' data-closed' : ""}>
          ${seg("persona", "Person", PEOPLE, S.persona)}
          ${seg("data", "Logs", LOGS, S.data)}
          <div class="ho-ctl"><span class="ho-ctl-l" id="ho-l-flag">Clinician note</span><button type="button" class="ho-sw" id="ho-flag" role="switch" aria-checked="${S.flag}" data-k="flag" aria-labelledby="ho-l-flag ho-flag-t"><i aria-hidden="true"></i><span id="ho-flag-t">A BM with blood noted today</span></button></div>
          ${seg("theme", "Theme", [["light", "Light"], ["dark", "Dark"]], themeNow())}
        </div>
      </div>

      <section class="ho-q" id="ho-q1" aria-labelledby="ho-q1-h">
        <div class="ho-q-h">
          <p class="ho-k">Question 1 of 2</p>
          <h2 id="ho-q1-h">What should the week show?</h2>
          <p class="ho-q-lede">Four ways to draw the same days, side by side at the same size, each as it would sit under FloraScore. Each one answers with one count and explains its marks in the lines under it.</p>
          ${seg("week", "Week", [["now", "Last 7 days"], ["hard", `${name}'s hardest week`, !hard]], S.week === "hard" && Wh ? "hard" : "now", { after: `<p class="ho-ctl-note">${esc(S.week === "hard" && Wh ? `${spanOf(Wh)}: the 7 days in ${name}'s 12 weeks with the most days outside the usual, ${hard.n} of ${hard.known}. Drawn as the week read on its last evening.${S.flag ? " The clinician note is on today's logs, so it doesn't change this week." : ""}` : !hard ? `${sameWeek(C)} A hardest week needs a usual, so it comes with 12 weeks of logs.`.trim() : sameWeek(C))}</p>` })}
        </div>
        <div class="ho-cols ho-cols--4">
          ${CARDS.map((c) => `<article class="ho-col" data-card="${c.id}" aria-labelledby="ho-h-${c.id}"${c.rec ? " data-rec" : ""}>
              <p class="ho-col-k" id="ho-h-${c.id}"><span class="ho-col-n">${c.n}</span><span class="ho-col-name">${esc(c.name)}</span>${c.rec ? `<span class="ho-tag">Recommended</span>` : ""}</p>
              <div class="ho-col-fig">${weekBox(c, W)}</div>
              <div class="ho-txt" data-txt="${c.id}">${cardText(c, C)}</div>
            </article>`).join("")}
        </div>
        <section class="ho-rec" aria-label="What we recommend for question 1">
          <p class="ho-k">We recommend</p>
          <p class="ho-rec-say"><b>${esc(REC.name)}.</b> ${esc(REC1_WHY)}</p>
          <div class="ho-rec-open"><p class="ho-k">Still open</p><p>${esc(OPEN1)}</p></div>
        </section>
      </section>

      <section class="ho-q" id="ho-q2" aria-labelledby="ho-q2-h">
        <div class="ho-q-h">
          <p class="ho-k">Question 2 of 2</p>
          <h2 id="ho-q2-h">Where should it sit on Today?</h2>
          <p class="ho-q-lede">${esc(`Three places, each drawn as the whole of Today on a ${PHONE_W} by ${PHONE_H} phone on ${when}. The app's tab bar floats at the foot of the first screen, and the ticks at each phone's edges mark its top: what someone sees before they scroll.`)}</p>
          <div class="ho-q-ctls">
            ${seg("card", "Week in these phones", CARDS.map((c) => [c.id, `${c.n} ${c.name}`]), S.card, { after: `<p class="ho-ctl-note">${esc(S.card === REC.id ? "The texts under the phones are measured with this week in them." : `The texts under the phones are measured with ${CARDS.find((c) => c.id === S.card).name} in them; what we recommend, with ${REC.name}.`)}</p>` })}
            ${seg("ck", "Weekly check-in", [["due", "Due tonight", !ckDue], ["not", "Not due", !ckDue]], ckDue ? S.ck : "not", { after: ckDue ? "" : `<p class="ho-ctl-note">No check-in is due for this demo person tonight.</p>` })}
          </div>
          <button type="button" class="ho-show" data-phones aria-expanded="${S.phones}" aria-controls="ho-pos-cols">${S.phones ? "Hide the phones" : "Show where it sits on Today"}</button>
        </div>
        <div class="ho-cols ho-cols--3${S.phones ? "" : " is-text"}" id="ho-pos-cols">
          ${POS.map((p) => `<article class="ho-col ho-col--pos" data-pos="${p.id}" aria-labelledby="ho-h-${p.id}"${p.rec ? " data-rec" : ""}>
              <p class="ho-col-k" id="ho-h-${p.id}"><span class="ho-col-n">${p.n}</span><span class="ho-col-name">${esc(p.name)}<em>${esc(p.where)}</em></span>${p.rec ? `<span class="ho-tag">Recommended</span>` : ""}</p>
              ${S.phones ? `<div class="ho-col-fig">${phone(p, S.card, Wnow, V, ckDue && S.ck === "due")}</div>` : ""}
              <div class="ho-txt" data-pos-txt="${p.id}"></div>
            </article>`).join("")}
        </div>
        <section class="ho-rec" aria-label="What we recommend for question 2">
          <p class="ho-k">We recommend</p>
          <p class="ho-rec-say"><b>${esc(REC2.name)}${ckDue ? " and the check-in" : ""}.</b> <span data-rec2></span></p>
        </section>
      </section>

      <footer class="ho-foot">
        <p>${esc(agree(C))} Every figure in the drawings and the texts comes from the demo person's logs in the prototype's model, with Consistency C, Florin membership, meals logged every day and Home's Score first. What the texts say shows on the first screen is measured from the phones as drawn, at ${PHONE_W} by ${PHONE_H}.</p>
        <p>Prototype only. Not for patients.</p>
      </footer>
      <dialog class="ho-dlg" aria-labelledby="ho-dlg-h"></dialog>`;
    wire();
    measurePositions();
    measure();
  }

  /* the phones the texts measure, drawn off screen at 390 wide: each place, with the check-in due and not, for the card
     in the phones and for the recommended card */
  const metricsOf = (ph) => {
    const t0 = ph.getBoundingClientRect().top;
    const at = (sel) => { const el = ph.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return r.height ? { top: Math.round(r.top - t0), bottom: Math.round(r.bottom - t0) } : null; };
    const tb = at(".ap-tb");
    return { tab: tb ? tb.top : PHONE_H, week: at("[data-week]"), answer: at("[data-week] [data-answer]"), hero: at(".ap-hero"), num: at(".ap-hero-n, .ap-hero-day"), flag: at(".ap-hero-flag"), ck: !!ph.querySelector(".ap-ckc") };
  };
  const measureSet = (cardId) => {
    const C = CUR, box = document.createElement("div");
    box.className = "ho-measure";
    box.setAttribute("aria-hidden", "true");
    box.innerHTML = POS.flatMap((p) => [true, false].map((ck) => phone(p, cardId, C.Wnow, C.V, ck, { measure: true }))).join("");
    mount.appendChild(box);
    const out = {};
    box.querySelectorAll(".ho-phone").forEach((ph) => (out[`${ph.dataset.pos}:${ph.dataset.ck}`] = metricsOf(ph)));
    box.remove();
    return out;
  };
  function measurePositions() {
    if (!CUR) return;
    CUR.P = measureSet(S.card);
    CUR.P1 = S.card === REC.id ? CUR.P : measureSet(REC.id);
    POS.forEach((p) => { const el = mount.querySelector(`[data-pos-txt="${p.id}"]`); if (el) el.innerHTML = posTextHtml(p, CUR); });
    const r2 = mount.querySelector("[data-rec2]");
    if (r2) r2.textContent = rec2Why(CUR);
    /* the ticks sit at the top of the tab bar */
    mount.querySelectorAll(".ho-phone").forEach((ph) => {
      const tb = ph.querySelector(".ap-tb"), s1 = ph.querySelector(".ho-scr1");
      if (tb && s1) s1.style.setProperty("--ho-fold", `${Math.round(tb.getBoundingClientRect().top - s1.getBoundingClientRect().top)}px`);
    });
  }
  /* on a wide screen each week is drawn at its phone width and scaled to its column; the sticky labels sit under the
     controls; each week's height, for the texts that compare them */
  function measure() {
    if (!CUR) return;
    /* a screen that grew wide: the phones' button is gone, so the phones show */
    if (wide() && !S.phones) { S.phones = true; render(); return; }
    const ctl = mount.querySelector(".ho-ctls");
    if (ctl) mount.style.setProperty("--ho-stick", `${Math.round(ctl.getBoundingClientRect().height)}px`);
    const isWide = wide();
    mount.querySelectorAll(".ho-cols--4 .ho-col").forEach((col) => {
      const box = col.querySelector(".ho-wk");
      if (!box) return;
      box.style.zoom = "";
      if (isWide) { const z = Math.min(1, col.clientWidth / box.offsetWidth); if (z < 0.999) box.style.zoom = String(Math.round(z * 1000) / 1000); }
      const w = box.querySelector("[data-week]");
      CUR.H[col.dataset.card] = w ? w.getBoundingClientRect().height : 0;
    });
    CARDS.forEach((c) => { const el = mount.querySelector(`[data-txt="${c.id}"]`); if (el) el.innerHTML = cardText(c, CUR); });
    alignRows(".ho-cols--4 > .ho-col", isWide);
    alignRows(".ho-cols--3 > .ho-col", isWide);
  }
  /* columns side by side start their drawings, and their words, at the same height */
  function alignRows(sel, isWide) {
    const cols = [...mount.querySelectorAll(sel)];
    cols.forEach((c) => c.querySelectorAll(".ho-col-k, .ho-col-fig").forEach((el) => (el.style.minHeight = "")));
    if (!isWide) return;
    const rows = {};
    cols.forEach((c) => (rows[c.offsetTop] = rows[c.offsetTop] || []).push(c));
    Object.values(rows).filter((r) => r.length > 1).forEach((r) => ["ho-col-k", "ho-col-fig"].forEach((k) => {
      const els = r.map((c) => c.querySelector(`.${k}`)).filter(Boolean);
      const h = Math.max(...els.map((el) => el.getBoundingClientRect().height));
      els.forEach((el) => (el.style.minHeight = `${Math.ceil(h)}px`));
    }));
  }

  /* ============ wiring ============ */
  function applyTheme() {
    const t = themeNow();
    if (S.theme) root.setAttribute("data-theme", S.theme); else root.removeAttribute("data-theme");
    mount.querySelectorAll(".ap-rx").forEach((p) => p.setAttribute("data-theme", t));
    mount.querySelectorAll('[data-k="theme"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === t)));
  }
  /* the drawings are pictures of the app: their buttons do nothing here, so they take no focus. Only the strip's days
     (and the day they open) are live */
  function inert(el) {
    el.querySelectorAll("button, a, [tabindex]").forEach((b) => {
      if (b.hasAttribute("data-live") || b.hasAttribute("data-dlg")) return;
      b.setAttribute("tabindex", "-1");
      b.setAttribute("aria-disabled", "true");
      b.classList.add("ho-inert");
    });
  }
  function wire() {
    mount.querySelectorAll(".ho-wk, .ho-phone").forEach(inert);
    const dlg = mount.querySelector(".ho-dlg");
    if (dlg) {
      dlg.addEventListener("close", () => { const d = openDay; openDay = null; mount.querySelectorAll(".ho-d[aria-expanded]").forEach((b) => b.removeAttribute("aria-expanded")); const b = d != null && mount.querySelector(`.ho-wk .ho-d[data-day="${d}"]`); if (b) b.focus({ preventScroll: true }); });
      /* a click on the backdrop closes it */
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    }
  }
  /* the day a strip day opens: as History draws it, in a sheet over the page, with Previous and Next day */
  let openDay = null;
  const stripDays = () => [...mount.querySelectorAll(".ho-wk .ho-d")].map((b) => +b.dataset.day);
  function openSheet(d) {
    const dlg = mount.querySelector(".ho-dlg");
    if (!dlg || !CUR) return;
    const days = stripDays(), i = days.indexOf(d), x = L.dateOf(d);
    const nameD = `${Ut.DOWL[x.getDay()]}, ${Ut.MONL[x.getMonth()]} ${x.getDate()}`;
    let day = "";
    try { day = RU.historyDay(CUR.M, CUR.V, d); } catch (e) { console.error(e); day = `<p class="ho-err">This day failed to draw.</p>`; }
    dlg.innerHTML = `<div class="ap ap-rx ho-dlg-ap" data-theme="${themeNow()}">
        <div class="ho-sheet-h">
          <button type="button" class="ho-sb" data-dlg="prev"${i <= 0 ? " disabled" : ""}>${RU.icon("back")}Previous day</button>
          <button type="button" class="ho-sb" data-dlg="next"${i >= days.length - 1 ? " disabled" : ""}>Next day${RU.icon("chev")}</button>
          <button type="button" class="ho-sb ho-sb--x" data-dlg="close" aria-label="Close">${RU.icon("close")}</button>
        </div>
        <h2 class="sr" id="ho-dlg-h">${esc(nameD)}</h2>
        ${day}
      </div>`;
    inert(dlg);
    openDay = d;
    mount.querySelectorAll(".ho-wk .ho-d").forEach((b) => { if (+b.dataset.day === d) b.setAttribute("aria-expanded", "true"); else b.removeAttribute("aria-expanded"); });
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
  }
  mount.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t || !mount.contains(t)) return;
    if (t.dataset.dlg) {
      e.preventDefault();
      const dlg = mount.querySelector(".ho-dlg");
      if (t.dataset.dlg === "close") { dlg.close(); return; }
      const days = stripDays(), j = days.indexOf(openDay) + (t.dataset.dlg === "next" ? 1 : -1);
      if (j >= 0 && j < days.length) {
        openSheet(days[j]);
        const nb = dlg.querySelector(`[data-dlg="${t.dataset.dlg}"]:not(:disabled)`) || dlg.querySelector('[data-dlg="close"]');
        if (nb) nb.focus({ preventScroll: true });
      }
      return;
    }
    if (t.classList.contains("ho-d") && t.hasAttribute("data-live")) { e.preventDefault(); openSheet(+t.dataset.day); return; }
    if (t.classList.contains("ho-inert")) { e.preventDefault(); return; }
    if (t.hasAttribute("data-ctl")) {
      S.ctl = !S.ctl;
      t.setAttribute("aria-expanded", String(S.ctl));
      t.textContent = S.ctl ? "Done" : "Change";
      const body = mount.querySelector(".ho-ctls-body");
      if (body) body.toggleAttribute("data-closed", !S.ctl);
      measure();
      return;
    }
    if (t.hasAttribute("data-phones")) {
      S.phones = !S.phones;
      const y = t.getBoundingClientRect().top;
      render();
      const nb = mount.querySelector("[data-phones]");
      if (nb) { window.scrollBy(0, nb.getBoundingClientRect().top - y); nb.focus({ preventScroll: true }); }
      return;
    }
    const k = t.dataset.k;
    if (!k) return;
    if (k === "flag") { S.flag = !S.flag; save(); rerender("#ho-flag"); return; }
    if (k === "theme") { S.theme = t.dataset.v; save(); applyTheme(); rerender(`#ho-theme-${t.dataset.v}`); return; }
    if (S[k] === t.dataset.v) return;
    S[k] = t.dataset.v;
    save();
    rerender(`#ho-${k}-${t.dataset.v}`);
  });
  /* redraw, keeping the pressed control where it was on the screen and focused */
  function rerender(sel) {
    const b0 = mount.querySelector(sel), y = b0 ? b0.getBoundingClientRect().top : null;
    render();
    const nb = mount.querySelector(sel);
    if (nb) {
      if (y != null && !nb.closest(".ho-ctls")) window.scrollBy(0, nb.getBoundingClientRect().top - y);
      nb.focus({ preventScroll: true });
    }
  }
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => { if (!S.theme) { applyTheme(); render(); } };
    if (mq.addEventListener) mq.addEventListener("change", on); else if (mq.addListener) mq.addListener(on);
  }
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(measure, 120); }, { passive: true });

  render();
  applyTheme();
  /* the heights change once the fonts arrive: measure again then */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measurePositions(); measure(); }).catch(() => {});
  window.FLORIN_HOME = { S, render, measure, measurePositions, cards: CARDS, pos: POS, cur: () => CUR, draw: { card: opt1, strip: opt2, note: opt3, chart: opt4 }, weekOf, hardEnd, build };
})();
