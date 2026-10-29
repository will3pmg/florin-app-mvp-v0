/* Florin app refresh: Insights, from manual logs. A summary, one card per question (timing, how often, form,
   symptoms, the weekly check-in, possible patterns), a detail page behind each card, and the hand-off to Ask Florin.
   Charts follow the data vis board (board-dataviz.html): your usual as a named Plum band, Gold for a shift either
   way, the newest point ringed and labelled, gaps left as gaps, quiet axes, a title that says the answer.
   The drawing functions started as the board's (dvMorning, dvBars, dvHist, dvFelt, dvStrip), ported to logs; build-core
   (Oct 28) redrew them in one set of marks (claude/Florin data viz.md).
   Consistency reads three ways, like the rest of the refresh: A as types 1 to 7, B as five words, C as seven words.
   A BM is passed around as its entry, never as a bare number, so a word logged in B reads right in A and C.
   Pure render functions, like refresh-ui.js. Extends window.FLORIN_RUI. */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, AD = window.FLORIN_APP, RU = window.FLORIN_RUI, C = window.FLC;
  if (!FL || !L || !AD || !RU || !C) return;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, lin = C.lin;
  const TODAY = L.TODAY;

  /* ---------- small helpers ---------- */
  const n1 = (v) => Math.round(v * 10) / 10;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const chip = (text, tone = "plain") => `<span class="ap-chip ap-chip--${tone}">${esc(text)}</span>`;
  const fine = (t) => `<p class="ap-fine">${esc(t)}</p>`;
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  const short = (d) => { const x = L.dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const dayShort = (d) => (d === TODAY ? "Today" : `${Ut.DOW[L.dateOf(d).getDay()]} ${L.dateOf(d).getDate()}`);
  const hm = (h) => T(h).replace(/ (AM|PM)$/, "");
  const winText = (u) => `${hm(u.tLo)} to ${T(u.tHi)}`;
  /* rough text width for label placement: DM Sans runs about half an em a character, Space Mono 0.6 */
  const tw = (s, size, mono) => String(s).length * size * (mono ? 0.6 : 0.52);
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const upper1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const join = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const joinMore = (a, max) => (a.length <= max ? join(a) : `${a.slice(0, max).join(", ")} and ${a.length - max} more`);
  const svg = (w, h, body, o = {}) => `<svg class="c-chart dv-chart${o.cls ? " " + o.cls : ""}" viewBox="0 0 ${n1(w)} ${n1(h)}" role="img" aria-label="${esc(o.aria || "")}">${body}</svg>`;
  const hourLbl = (h, end) => (end ? T(h, { short: true }) : String(h % 12 === 0 ? 12 : h % 12));
  const tip = (t) => `<title>${esc(t)}</title>`;
  const lg = (sw, text) => `<span><i class="sw ${sw}"></i>${esc(text)}</span>`;
  /* a symptom's strength in words; 0 is a symptom logged without one */
  const sWord = (s) => (s ? L.STRENGTH[s - 1].toLowerCase() : "strength not said");
  const has = (f, name) => f.sym[name] != null;
  /* a flagged today's mark, named only when it's drawn */
  const clinLg = (on) => (on ? lg("sw--clin", "Noted for a clinician") : "");

  /* icons the refresh adds to the studio's set */
  const IC = {
    moon: '<path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5 6.5 6.5 0 1 0 15.5 12.6z"/>',
    pat: '<circle cx="5.5" cy="14" r="2.3"/><circle cx="14.5" cy="6" r="2.3"/><path d="M7.3 12.4l5.4-4.8"/>',
    send: '<path d="M10 16V4.5M5 9.5l5-5 5 5"/>',
    ring: '<circle cx="10" cy="10" r="6.5" opacity=".35"/><path d="M10 3.5a6.5 6.5 0 1 1-6.2 4.6"/>',
    lock: '<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>'
  };
  const icon = (k, cls = "") => (IC[k] ? `<svg class="ic ${cls}" viewBox="0 0 20 20" aria-hidden="true">${IC[k]}</svg>` : RU.icon(k, cls));

  const RANGE_NAME = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };
  const d0Of = (M, n) => Math.max(M.start, TODAY - n + 1);
  const spanOf = (M, n) => RU.spanText(d0Of(M, n), TODAY);
  /* three ticks: the first day, the middle and Today (seven days: every day). "Today" sits under today alone: a chart
     whose days stop before today names its last day by its date (finish-viz, Oct 28: the Form detail's day by day
     called yesterday Today when nothing was logged yet) */
  const ticks = (F) => {
    const n = F.length;
    if (n <= 7) return F.map((f, i) => ({ i, label: f.today ? "Today" : Ut.DOW[f.dow], anchor: i === 0 ? "start" : i === n - 1 ? "end" : "middle" }));
    return [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => ({ i, label: F[i].today || F[i].d === TODAY ? "Today" : short(F[i].d), anchor: k === 0 ? "start" : k === 2 ? "end" : "middle" }));
  };
  const rangeTabs = (n, free) => `<div class="ap-seg ap-seg--range" role="group" aria-label="Time range">${L.RANGES.map((v) => (free && v !== 7 ? `<button type="button" data-act="pay" data-pay="range" aria-pressed="false" aria-label="${v} days, with Florin membership">${icon("lock", "ap-seg-lock")}${v}D</button>` : `<button type="button" data-act="irange" data-v="${v}" aria-pressed="${n === v}">${v}D</button>`)).join("")}</div>`;

  /* ============================== DRAWINGS ==============================
     build-core, Oct 28 (claude/Florin data viz.md, sections 1 and 2): one set of marks on every chart. Your usual is
     the band, drawn first and named in words. A reading within it is the reading colour (--ap-chart); a reading outside
     it is Gold with the Shift Ink edge (light), and its legend word says so; FloraScore is always the reading colour.
     Could be either, or logged before day 14, is Ink 3. A flagged today is a Teal ring with nothing inside, in no count.
     The newest point is ringed in Ink and labelled; the x axis ends on Today. Nothing logged is nothing drawn: no dot,
     no bar, no hatch, no strike. Marks are 8px or more. A count axis runs from 0 to the largest of 3, the usual's top
     plus 1 and the highest day; FloraScore's runs from the data (scoreAxis). One form at 90 days for every measure:
     a bar a week (weekBars) */

  /* today's ring: Ink, 2px, around whatever mark is there. fix-viz (Oct 28): a ring means today (or, Teal, a flagged
     today) and nothing else, so a chart rings and labels its newest point only when that point is today; with no
     reading today there's no ring, and the x axis still ends on Today */
  const ringAt = (x, y, r) => `<circle class="dv-ring" cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}"/>`;
  /* a card-colour disc under a dot, so neighbouring dots at 30 days stay apart instead of running into bars */
  const spacer = (x, y, r) => `<circle class="dv-sp" cx="${n1(x)}" cy="${n1(y)}" r="${n1(r + 1.5)}"/>`;
  /* a label above a point, kept inside the chart: anchored at the point, flipped to end near the right edge */
  const labelAt = (x, y, txt, w, o = {}) => {
    const lw = tw(txt, 11);
    let anchor = "middle", ax = x;
    if (x - lw / 2 < 2) { anchor = "start"; ax = Math.max(2, x - 6); } else if (x + lw / 2 > w - 2) { anchor = "end"; ax = Math.min(w - 2, x + 6); }
    return `<text class="dv-newlbl${o.cls ? " " + o.cls : ""}" x="${n1(ax)}" y="${n1(y)}" text-anchor="${anchor}">${esc(txt)}</text>`;
  };
  /* x ticks for a row of days, under each point's x */
  const xTicks = (F, x, y, n) => ticks(F).map((t) => `<text class="dv-ax" x="${n1(x(t.i))}" y="${n1(y)}" text-anchor="${n <= 7 ? "middle" : t.anchor}">${esc(t.label)}</text>`).join("");

  /* Morning strip: one dot per morning's first BM on a straight time axis, stacked in 10-minute columns, oldest at the
     bottom. Your usual window is the band; a morning outside it Gold; a flagged today a Teal ring; the newest ringed
     and labelled with its time. The bracket under the axis names the window when the card's head doesn't */
  function morning(o) {
    const w = o.w || 318, left = 10, right = 10;
    const r = o.r || 4.4, step = r * 2 + (o.gap != null ? o.gap : 1.6);
    const lo = o.domain[0], hi = o.domain[1], bin = 1 / 6, nb = Math.round((hi - lo) / bin);
    const x = lin(lo, hi, left, w - right);
    const u = o.usual;
    const days = o.days.filter((f) => f.first != null);
    const newest = days[days.length - 1];
    const cols = {};
    days.forEach((f) => { const k = Math.max(0, Math.min(nb - 1, Math.floor((f.first - lo) / bin))); (cols[k] = cols[k] || []).push(f); });
    const maxStack = Math.max(3, ...Object.values(cols).map((c) => c.length));
    const top = 24, base = top + maxStack * step + 4;
    const cx = (k) => x(lo + (k + 0.5) * bin);
    let g = "", marks = "", labels = "", np = null;
    if (u) g += `<rect class="c-band dv-bandbox" x="${n1(x(u.tLo))}" y="${top - 4}" width="${n1(x(u.tHi) - x(u.tLo))}" height="${n1(base - top + 4)}" rx="2"/>`;
    Object.keys(cols).forEach((k) => cols[k].forEach((f, j) => {
      const px = cx(+k), py = base - 2 - r - j * step;
      /* before day 14 there's no usual to read against: every morning is Ink 3, as the week card draws those days */
      marks += `<circle class="dv-dot${f.flag ? " is-flag" : !u ? " is-learn" : !f.inWin ? " is-shift" : ""}" cx="${n1(px)}" cy="${n1(py)}" r="${n1(r)}">${tip(`${short(f.d)} · first BM ${T(f.first)}${f.flag ? ", noted for a clinician" : u ? (f.inWin ? ", in your usual window" : ", outside your usual window") : ""}`)}</circle>`;
      if (f === newest) np = { px, py };
    }));
    if (np && newest.today) {
      /* a flagged today is its Teal ring alone: no Ink ring around it */
      if (!newest.flag) marks += ringAt(np.px, np.py, r + 3);
      if (o.label !== false) {
        /* the label sits above the band and every stack, never on the band's edge, with a lead down to its dot */
        const ly = top - 9;
        labels += labelAt(np.px, ly, `Today ${T(newest.first)}`, w);
        if (np.py - r - 4 > top) g += `<line class="dv-lead" x1="${n1(np.px)}" x2="${n1(np.px)}" y1="${top - 5}" y2="${n1(np.py - r - 4)}"/>`;
      }
    }
    g += `<line class="dv-base" x1="${left}" x2="${w - right}" y1="${n1(base)}" y2="${n1(base)}"/>`;
    /* past ten hours, every other hour is labelled (always the two ends), so the labels never crowd */
    const h0 = Math.ceil(lo), h1 = Math.floor(hi), every = h1 - h0 > 10 ? 2 : 1;
    for (let h = h0; h <= h1; h++) {
      g += `<line class="dv-tick" x1="${n1(x(h))}" x2="${n1(x(h))}" y1="${n1(base)}" y2="${n1(base + 4)}"/>`;
      if (h !== h0 && h !== h1 && ((h - h0) % every || h1 - h < every)) continue;
      labels += `<text class="dv-ax" x="${n1(x(h))}" y="${n1(base + 15)}" text-anchor="${h === lo ? "start" : h === hi ? "end" : "middle"}">${esc(hourLbl(h, h === h0 || h === h1))}</text>`;
    }
    let H = base + 20;
    if (o.bracket && u) {
      const bx0 = x(u.tLo), bx1 = x(u.tHi), by = base + 26;
      marks += `<path class="dv-brk" d="M${n1(bx0)},${by - 5}V${by}H${n1(bx1)}V${by - 5}"/>`;
      const txt = `Your usual window ${winText(u)}`, lw = tw(txt, 10.5);
      const lx = Math.max(left + lw / 2, Math.min(w - right - lw / 2, (bx0 + bx1) / 2));
      labels += `<text class="dv-bandlbl" x="${n1(lx)}" y="${by + 14}" text-anchor="middle">${esc(txt)}</text>`;
      H = by + 20;
    }
    return svg(w, H, g + marks + labels, o);
  }
  /* the axis runs 6 AM to 10 AM at least, and out to whatever first BM was logged, so a dot never sits past its end
     (a person's first BM on the day they join can be an evening one) */
  const morningDomain = (F, u) => {
    const ts = F.filter((f) => f.first != null).map((f) => f.first).concat(u ? [u.tLo, u.tHi] : []);
    if (!ts.length) return [6, 10];
    return [Math.max(0, Math.min(6, Math.floor(Math.min(...ts)))), Math.min(24, Math.max(10, Math.ceil(Math.max(...ts) + 0.01)))];
  };

  /* Count line (How often): one dot a day on a count axis from 0, your usual count as the band. No BM is a dot on the
     0 line, which the axis names No BM; a day with nothing about BMs is nothing drawn. Outside your usual count is
     Gold; a flagged today a Teal ring. The axis runs to the largest of 3, the usual's top plus 1 and the highest day,
     so nobody's day is clipped. The newest point is ringed and labelled */
  function countLine(o) {
    /* today stays on the axis with nothing logged yet (nothing drawn above it), so the axis always ends on Today */
    const w = o.w || 318, F = o.days, u = o.usual, n = F.length;
    const left = 40, right = 12, top = 22, plotH = o.h || 92, axisH = 20;
    const yMax = Math.max(3, u ? u.nHi + 1 : 0, ...F.map((f) => f.count || 0));
    const step = yMax > 6 ? 2 : 1;
    const x = lin(0, Math.max(1, n - 1), left + 8, w - right - 8), y = lin(0, yMax, top + plotH, top), base = top + plotH;
    const r = 4;
    let g = "", marks = "", labels = "";
    for (let v = 0; v <= yMax; v += step) {
      g += `<line class="${v ? "dv-grid" : "dv-base"}" x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
      labels += `<text class="dv-ax" x="${left - 6}" y="${n1(y(v) + 3.5)}" text-anchor="end">${v === 0 ? "No BM" : v}</text>`;
    }
    if (u) {
      const bt = y(u.nHi + 0.4), bb = y(Math.max(0, u.nLo - 0.4));
      g = `<rect class="c-band" x="${left}" y="${n1(bt)}" width="${w - left - right}" height="${n1(bb - bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bt)}" y2="${n1(bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bb)}" y2="${n1(bb)}"/>` + g;
    }
    let newest = null;
    F.forEach((f, i) => {
      if (f.count == null) return;
      const cls = f.flag ? " is-flag" : !u ? " is-learn" : f.inCount === false ? " is-shift" : "";
      if (n > 7) marks += spacer(x(i), y(f.count), r);
      marks += `<circle class="dv-dot${cls}" cx="${n1(x(i))}" cy="${n1(y(f.count))}" r="${r}">${tip(`${short(f.d)} · ${f.count === 0 ? "No BM" : plural(f.count, "BM")}${f.today ? " so far" : ""}${f.flag ? ", noted for a clinician" : u ? (f.inCount ? ", a usual count" : ", outside your usual count") : ""}`)}</circle>`;
      newest = { i, f };
    });
    if (newest && newest.f.today) {
      const px = x(newest.i), py = y(newest.f.count);
      if (!newest.f.flag) marks += ringAt(px, py, r + 3);
      labels += labelAt(px, py - r - 8 < 10 ? py + r + 16 : py - r - 8, `Today ${newest.f.count === 0 ? "No BM" : newest.f.count}`, w);
    }
    labels += xTicks(F, x, base + 15, n);
    return svg(w, top + plotH + axisH, g + marks + labels, o);
  }

  /* A bar a week, for 90 days of any measure: the days (or mornings) within your usual at the base in the reading
     colour, those outside it in Gold above, so the bar's top is the days read; a week with none read is nothing drawn.
     The latest bar is labelled "5 of 6". o.ctx draws one Teal series instead (symptoms: days a week with any) */
  function weekBars(o) {
    const w = o.w || 318, left = 24, right = 8, top = 22, plotH = o.h || 84, axisH = 20;
    const W = o.weeks, n = W.length, yMax = 7;
    const slot = (w - left - right) / n, bw = Math.min(16, slot * 0.62), y = lin(0, yMax, top + plotH, top), base = top + plotH, xc = (i) => left + slot * i + slot / 2;
    let g = "", marks = "", labels = "";
    [0, 7].forEach((v) => {
      g += `<line class="${v ? "dv-grid" : "dv-base"}" x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
      labels += `<text class="dv-ax" x="${left - 6}" y="${n1(y(v) + 3.5)}" text-anchor="end">${v}</text>`;
    });
    /* a segment with its top corners round at 2px (radius xs), square at its foot */
    const seg = (x0, y0, y1, cls, round, t) => {
      const rr = round ? Math.min(2, (y1 - y0) / 2) : 0, x1 = x0 + bw;
      return `<path class="${cls}" d="M${n1(x0)},${n1(y1)}V${n1(y0 + rr)}${rr ? `A${rr},${rr} 0 0 1 ${n1(x0 + rr)},${n1(y0)}` : ""}H${n1(x1 - rr)}${rr ? `A${rr},${rr} 0 0 1 ${n1(x1)},${n1(y0 + rr)}` : ""}V${n1(y1)}Z">${tip(t)}</path>`;
    };
    let lastI = -1;
    W.forEach((wk, i) => {
      const read = wk.read || 0;
      if (!read) return;
      lastI = i;
      const x0 = xc(i) - bw / 2, yi = y(wk.within), yt = y(read);
      const t = o.tip ? o.tip(wk) : `Week of ${short(wk.d0)}: ${wk.within} of ${read}`;
      if (o.ctx) { marks += seg(x0, yt, base, "dv-wbar is-ctx", true, t); return; }
      /* within at the base; outside above, with a 2px surface gap between the two */
      if (wk.within) marks += seg(x0, yi, base, "dv-wbar", !wk.outside, t);
      if (wk.outside) marks += seg(x0, yt, wk.within ? yi - 2 : base, "dv-wbar is-shift", true, t);
    });
    if (lastI >= 0) {
      /* the latest bar's label, set above every bar it spans, so it never sits on a neighbour */
      const wk = W[lastI], txt = o.lastLabel ? o.lastLabel(wk) : `${wk.within} of ${wk.read}`, lw = tw(txt, 11), end = lastI === n - 1;
      const lx1 = end ? xc(lastI) + bw / 2 : xc(lastI) + lw / 2, lx0 = lx1 - lw;
      const over = Math.max(...W.map((v, j) => (xc(j) + bw / 2 >= lx0 && xc(j) - bw / 2 <= lx1 ? v.read || 0 : 0)));
      labels += `<text class="dv-newlbl" x="${n1(end ? lx1 : xc(lastI))}" y="${n1(y(over) - 6)}" text-anchor="${end ? "end" : "middle"}">${esc(txt)}</text>`;
    }
    labels += `<text class="dv-ax" x="${n1(left)}" y="${base + 15}">${esc(short(W[0].d0))}</text><text class="dv-ax" x="${n1(w - right)}" y="${base + 15}" text-anchor="end">This week</text>`;
    return svg(w, top + plotH + axisH, g + marks + labels, o);
  }
  /* the 13 weeks behind the 90 days, each with what weekBars draws: within, outside and read, for one measure */
  const weekCounts = (M, mode, pick) => weeksOf(M, mode).map((wk) => {
    const c = pick(wk.filter((f) => !f.pending && !f.flag));
    return { d0: wk[0].d, within: c.within, outside: c.read - c.within, read: c.read };
  });

  /* Form bars: how many BMs came in each form (counts, never percents), your usual forms bracketed under the axis, a
     form outside your usual Gold. With no usual yet, every bar is the reading colour */
  function formBars(o) {
    const w = o.w || 318, top = 18, left = 4, right = 4, plotH = o.h || 72;
    const n = o.bins.length, slot = (w - left - right) / n, bw = Math.min(24, slot - 8);
    const max = Math.max(1, ...o.bins.map((b) => b.count));
    const y = lin(0, max, top + plotH, top + 4), base = top + plotH;
    let g = "", marks = "", labels = "";
    o.bins.forEach((b, i) => {
      const cx = left + slot * i + slot / 2;
      if (b.count) {
        const yt = y(b.count), x0 = cx - bw / 2, x1 = cx + bw / 2, r = Math.min(2, (base - yt) / 2);
        marks += `<path class="dv-bar${b.inUsual === false ? " is-shift" : b.inUsual == null ? " is-learn" : ""}" d="M${n1(x0)},${base}V${n1(yt + r)}A${r},${r} 0 0 1 ${n1(x0 + r)},${n1(yt)}H${n1(x1 - r)}A${r},${r} 0 0 1 ${n1(x1)},${n1(yt + r)}V${base}Z">${tip(`${b.label}: ${plural(b.count, "BM")}${b.inUsual === false ? ", outside your usual forms" : b.inUsual ? ", in your usual forms" : ""}`)}</path>`;
        labels += `<text class="dv-val" x="${n1(cx)}" y="${n1(yt - 5)}" text-anchor="middle">${b.count}</text>`;
      }
      labels += `<text class="dv-ax" x="${n1(cx)}" y="${base + 14}" text-anchor="middle">${esc(b.short)}</text>`;
    });
    g += `<line class="dv-base" x1="${left}" x2="${w - right}" y1="${base}" y2="${base}"/>`;
    const ui = o.bins.map((b, i) => (b.inUsual ? i : -1)).filter((i) => i >= 0);
    let H = base + 20;
    if (ui.length && o.usualLabel) {
      const bx0 = left + slot * ui[0] + 4, bx1 = left + slot * (ui[ui.length - 1] + 1) - 4, by = base + 25;
      marks += `<path class="dv-brk" d="M${n1(bx0)},${by - 5}V${by}H${n1(bx1)}V${by - 5}"/>`;
      const lw = tw(o.usualLabel, 10.5), lx = Math.max(left + lw / 2, Math.min(w - right - lw / 2, (bx0 + bx1) / 2));
      labels += `<text class="dv-bandlbl" x="${n1(lx)}" y="${by + 14}" text-anchor="middle">${esc(o.usualLabel)}</text>`;
      H = by + 20;
    }
    return svg(w, H, g + marks + labels, o);
  }

  /* Symptom rows: one Teal square on each day a symptom came up, whatever its strength (strength is said in words and in
     the table), then an Any symptom row with your usual written on it. Nothing logged is nothing drawn */
  function symSquares(o) {
    const w = o.w || 318, left = 92, right = 4, top = 4, rowH = 32;
    const F = o.days, n = F.length, cw = (w - left - right) / n, s = 8;
    const rows = o.rows.concat(o.any ? [Object.assign({ any: true }, o.any)] : []), bottom = top + rows.length * rowH;
    const xm = (i) => left + cw * i + cw / 2;
    let g = "", marks = "", labels = "";
    rows.forEach((row, ri) => {
      const cy = top + ri * rowH + rowH / 2;
      if (row.any && ri) g += `<line class="dv-base" x1="0" x2="${w - right}" y1="${n1(cy - rowH / 2)}" y2="${n1(cy - rowH / 2)}"/>`;
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(cy)}" y2="${n1(cy)}"/>`;
      labels += `<text class="dv-rowlbl" x="0" y="${n1(cy - 2)}">${esc(row.name)}</text><text class="dv-ax" x="0" y="${n1(cy + 11)}">${esc(row.sub || plural(row.n, "day"))}</text>`;
      F.forEach((f, i) => {
        const on = row.any ? f.logged && f.nsym > 0 : has(f, row.name);
        if (!on) return;
        const what = row.any ? Object.entries(f.sym).map(([nm, v]) => `${nm.toLowerCase()}, ${sWord(v)}`).join("; ") : `${row.name.toLowerCase()}, ${sWord(f.sym[row.name])}`;
        marks += `<rect class="dv-sq" x="${n1(xm(i) - s / 2)}" y="${n1(cy - s / 2)}" width="${s}" height="${s}" rx="2">${tip(`${short(f.d)} · ${what}`)}</rect>`;
      });
    });
    labels += xTicks(F, xm, bottom + 15, n);
    return svg(w, bottom + 20, g + marks + labels, o);
  }

  /* Each BM, day by day, newest at the top: the first BM in the reading colour (Gold outside your usual window, a
     Teal ring on a flagged today), later BMs in Ink 3, all round dots on one time axis, your usual window as the
     band. A dinner after 8 PM the day before is a Teal tick in its own column, before the axis. A day with nothing
     logged is its date alone */
  function dayDots(o) {
    const w = o.w || 326, left = 52, col = 16, right = 10, top = 8, rowH = o.rowH || 24, axisH = 20;
    const t0 = 5, t1 = 23, x = lin(t0, t1, left + col + 4, w - right), u = o.usual;
    const rows = o.rows, H = top + rows.length * rowH + axisH, r = 4;
    let g = "", marks = "", labels = "";
    if (u) g += `<rect class="c-band dv-bandbox" x="${n1(x(u.tLo))}" y="${top - 4}" width="${n1(x(u.tHi) - x(u.tLo))}" height="${rows.length * rowH + 4}" rx="2"/>`;
    [6, 9, 12, 15, 18, 21].forEach((h) => {
      g += `<line class="dv-grid" x1="${n1(x(h))}" x2="${n1(x(h))}" y1="${top - 4}" y2="${top + rows.length * rowH}"/>`;
      labels += `<text class="dv-ax" x="${n1(x(h))}" y="${top + rows.length * rowH + 14}" text-anchor="middle">${h === 12 ? "12p" : h > 12 ? h - 12 + "p" : h + "a"}</text>`;
    });
    rows.forEach((row, ri) => {
      const f = row.f, cy = top + ri * rowH + rowH / 2;
      if (row.label) labels += `<text class="dv-rowlbl${f.logged ? "" : " is-gap"}" x="${left - 8}" y="${n1(cy + 3.5)}" text-anchor="end">${esc(row.label)}</text>`;
      if (row.late) marks += `<rect class="dv-tick-ctx" x="${left + col / 2 - 1}" y="${n1(cy - 5)}" width="2" height="10" rx="1">${tip(`${short(f.d - 1)}: dinner after 8 PM`)}</rect>`;
      if (!f.logged) return;
      g += `<line class="dv-grid" x1="${n1(x(t0))}" x2="${w - right}" y1="${n1(cy)}" y2="${n1(cy)}"/>`;
      f.bms.forEach((b, j) => {
        const cls = j ? " is-later" : f.flag ? " is-flag" : !u ? " is-learn" : f.inWin === false ? " is-shift" : "";
        marks += `<circle class="dv-dot${cls}" cx="${n1(x(Math.max(t0, Math.min(t1, b.t))))}" cy="${n1(cy)}" r="${r}">${tip(`${short(f.d)} · ${T(b.t)}${j ? "" : " · first BM"}`)}</circle>`;
      });
    });
    return svg(w, H, g + marks + labels, o);
  }

  /* Form dots: one dot per BM by day, your usual forms as the band with its two edges named on the axis, a form
     outside it Gold, a word that could be either Ink 3, a flagged today a Teal ring; the newest ringed and labelled.
     B plots words; A and C plot steps. Up to 30 days: past that, the weekly bars */
  function formDots(o) {
    const B = o.mode === "B", Cw = o.mode === "C", u = o.usual;
    const w = o.w || 326, top = 22, left = B || Cw ? 52 : 28, right = 10, plotH = o.h || 120, axisH = 20;
    const F = o.days, n = F.length;
    const lvl = (b) => (B ? L.wordKey(b) : Ut.mean(L.stepsOf(b)));
    const lo = B ? 0 : 1, hi = B ? 4 : 7;
    const x = lin(0, Math.max(1, n - 1), left + 8, w - right - 8), y = lin(lo - 0.5, hi + 0.5, top + plotH, top);
    const name = (v) => (B ? L.WORDS[v].word : Cw ? L.TYPES[v].short : String(v));
    let g = "", marks = "", labels = "";
    const bl = u ? (B ? u.wLo : u.fLo) : null, bh = u ? (B ? u.wHi : u.fHi) : null;
    if (u) {
      const bt = y(bh + 0.5), bb = y(bl - 0.5);
      g += `<rect class="c-band" x="${left}" y="${n1(bt)}" width="${w - left - right}" height="${n1(bb - bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bt)}" y2="${n1(bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bb)}" y2="${n1(bb)}"/>`;
    }
    /* the axis names the two ends and, with a usual, the band's two edges */
    [...new Set([lo, hi].concat(u ? [bl, bh] : [Math.round((lo + hi) / 2)]))].sort((a, b) => a - b).forEach((v) => {
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
      labels += `<text class="dv-ax${u && (v === bl || v === bh) ? " is-usual" : ""}" x="${left - 6}" y="${n1(y(v) + 3.5)}" text-anchor="end">${esc(name(v))}</text>`;
    });
    let newest = null;
    const r = 4;
    F.forEach((f, i) => (o.firstOnly ? f.bms.slice(0, 1) : f.bms).forEach((b, j, arr) => {
      const px = x(i) + (arr.length > 1 ? (j - (arr.length - 1) / 2) * Math.min(4, (w - left - right) / Math.max(1, n) / 2) : 0);
      const st = f.flag ? undefined : u ? L.inForms({ usual: u }, b, o.mode) : "learn";
      newest = { px, py: y(lvl(b)), f, b };
      if (n > 7) marks += spacer(px, y(lvl(b)), r);
      marks += `<circle class="dv-dot${f.flag ? " is-flag" : st === "learn" ? " is-learn" : st === false ? " is-shift" : st === null ? " is-maybe" : ""}" cx="${n1(px)}" cy="${n1(y(lvl(b)))}" r="${r}">${tip(`${short(f.d)} · ${T(b.t)} · ${L.formName(b, o.mode)}${f.flag ? ", noted for a clinician" : st === null ? ", could be either" : st === false ? ", outside your usual forms" : ""}`)}</circle>`;
    }));
    if (newest && newest.f.today) {
      if (!newest.f.flag) marks += ringAt(newest.px, newest.py, r + 3);
      labels += labelAt(newest.px, top - 8, `Today ${L.formName(newest.b, o.mode)}`, w);
      g += `<line class="dv-lead" x1="${n1(newest.px)}" x2="${n1(newest.px)}" y1="${top - 4}" y2="${n1(newest.py - r - 4)}"/>`;
    }
    labels += xTicks(F, x, top + plotH + 15, n);
    return svg(w, top + plotH + axisH, g + marks + labels, o);
  }

  /* Two groups on one axis: the mornings after something, and the rest at half strength. Medians marked. */
  function strip(o) {
    const w = o.w || 326, left = 10, right = 10, top = 4, rowH = o.rowH || 58, axisH = o.ticks && o.ticks.length ? 22 : 4;
    const H = top + o.groups.length * rowH + axisH;
    const x = lin(o.domain[0], o.domain[1], left, w - right);
    const r = o.r || 4;
    let g = "", marks = "", labels = "";
    o.groups.forEach((gr, gi) => {
      const yy = top + gi * rowH, d0 = yy + rowH * 0.34, d1 = yy + rowH * 0.9;
      (o.ticks || []).forEach((t) => { g += `<line class="dv-grid" x1="${n1(x(t.v))}" x2="${n1(x(t.v))}" y1="${n1(d0)}" y2="${n1(d1)}"/>`; });
      if (o.band) g += `<rect class="c-band dv-bandbox" x="${n1(x(o.band[0]))}" y="${n1(d0)}" width="${n1(x(o.band[1]) - x(o.band[0]))}" height="${n1(d1 - d0)}" rx="2"/>`;
      const ly = yy + rowH * 0.22;
      labels += `<text class="dv-glbl" x="${left}" y="${n1(ly)}">${esc(gr.label)}</text>`;
      const jit = (i) => ((i * 37) % 11) / 10 - 0.5;
      gr.vals.forEach((v, i) => { marks += `<circle class="dv-dot${v.shift ? " is-shift" : ""}${gr.dim ? " is-dim" : ""}" cx="${n1(x(v.v + (o.xJit ? jit(i * 7 + 3) * o.xJit : 0)))}" cy="${n1(yy + rowH * 0.62 + jit(i) * rowH * 0.22)}" r="${r}">${v.tip ? tip(v.tip) : ""}</circle>`; });
      if (gr.median != null) {
        const mx = x(gr.median);
        marks += `<line class="dv-med" x1="${n1(mx)}" x2="${n1(mx)}" y1="${n1(yy + rowH * 0.36)}" y2="${n1(yy + rowH * 0.88)}"/>`;
        const mw = tw(gr.medLabel, 10.5), lw = tw(gr.label, 11) * 0.95;
        let mxl = mx + 7, anchor = "start";
        if (mxl + mw > w - right) { mxl = mx - 7; anchor = "end"; }
        if (anchor === "start" && mxl < left + lw + 10) mxl = left + lw + 10;
        labels += `<text class="dv-medlbl" x="${n1(mxl)}" y="${n1(ly)}" text-anchor="${anchor}">${esc(gr.medLabel)}</text>`;
      }
    });
    (o.ticks || []).forEach((t, i, a) => { labels += `<text class="dv-ax" x="${n1(x(t.v))}" y="${top + o.groups.length * rowH + 15}" text-anchor="${i === 0 ? "start" : i === a.length - 1 ? "end" : "middle"}">${esc(t.label)}</text>`; });
    return svg(w, H, g + marks + labels, o);
  }

  /* Two shares (a pattern): how often the change followed, against how often it came on other days. Each bar's
     length is the share, from none to every time, so 20 of 22 draws longer than 26 of 52; the counts are written on
     them, in the reading colour */
  const shareBars = (rows) => `<div class="ap-share" role="list">${rows.map((r) => `<div class="ap-share-r" role="listitem"><div class="ap-share-h"><b>${esc(r.label)}</b><span>${esc(`${r.k} of ${r.n} ${r.n === 1 ? "time" : "times"}`)}</span></div><i class="ap-share-t"><b style="--w:${n1((r.k / Math.max(1, r.n)) * 100)}%"></b></i></div>`).join("")}<div class="ap-share-ax" aria-hidden="true"><span>None</span><span>Every time</span></div></div>`;

  /* FloraScore over time: a line in the reading colour on your usual range, the y axis from the data, gaps left as
     breaks, the newest ringed and labelled Today; a flagged today a Teal ring with nothing inside. No area, no average
     line (claude/Florin data viz.md, C6 and C12) */
  const scoreAxis = (vals, su) => {
    const lo = Math.max(0, Math.floor((Math.min(...vals, su[0]) - 5) / 5) * 5), hi = Math.min(100, Math.ceil((Math.max(...vals, su[1]) + 5) / 5) * 5);
    const step = [5, 10, 20, 25].find((s) => Math.floor(hi / s) - Math.ceil(lo / s) + 1 <= 5) || 25;
    const ts = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ts.push(v);
    return { lo, hi, ticks: ts };
  };
  function scoreLine(o) {
    const w = o.w || 318, left = 28, right = 12, top = 22, plotH = o.h || 92, axisH = 20;
    const ser = o.ser, n = ser.length, su = o.su;
    const vals = ser.map((s) => s.value).filter((v) => v != null);
    if (!vals.length) return "";
    const ax = scoreAxis(vals, su);
    const x = lin(0, Math.max(1, n - 1), left + 8, w - right - 8), y = lin(ax.lo, ax.hi, top + plotH, top), base = top + plotH;
    let g = "", marks = "", labels = "";
    ax.ticks.forEach((v) => {
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
      labels += `<text class="dv-ax" x="${left - 6}" y="${n1(y(v) + 3.5)}" text-anchor="end">${v}</text>`;
    });
    const bt = y(su[1]), bb = y(su[0]);
    g += `<rect class="c-band" x="${left}" y="${n1(bt)}" width="${w - left - right}" height="${n1(bb - bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bt)}" y2="${n1(bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bb)}" y2="${n1(bb)}"/>`;
    const pts = ser.map((s, i) => (s.value == null ? null : [x(i), y(s.value)]));
    const runs = []; let cur = [];
    pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { runs.push(cur); cur = []; } });
    if (cur.length) runs.push(cur);
    marks += runs.map((s) => (s.length > 1 ? `<path class="dv-line" d="${C.path(s)}"/>` : "")).join("");
    let li = -1;
    ser.forEach((s, i) => { if (s.value != null) li = i; });
    ser.forEach((s, i) => {
      if (s.value == null) return;
      /* a run of 1 or 2 scored days between gaps gets its dots, so a short stub never reads as a dashed line */
      const flag = s.flag, show = n <= 7 || i === li || runs.some((r) => r.length <= 2 && r.some((p) => p[0] === x(i)));
      marks += `<circle class="dv-dot dv-dot--line${flag ? " is-flag" : ""}${show ? "" : " is-hit"}" cx="${n1(x(i))}" cy="${n1(y(s.value))}" r="4">${tip(`${short(s.d)} · FloraScore ${s.value}${flag ? ", noted for a clinician" : ""}`)}</circle>`;
    });
    if (li >= 0 && ser[li].today) {
      const s = ser[li], px = x(li), py = y(s.value);
      if (!s.flag) marks += ringAt(px, py, 7);
      labels += labelAt(px, py - 12 < 12 ? py + 22 : py - 12, `Today ${s.value}`, w);
    }
    labels += xTicks(ser, x, base + 15, n);
    return svg(w, top + plotH + axisH, g + marks + labels, o);
  }

  /* FloraScore today against its usual range (HTML): the band labelled with its two numbers, today's dot, the axis
     from the last 90 days widened to 10 points past each end of the range and rounded out to 5, so one point above the
     range is a visible step. No dot with no score or on a flagged today; the dot is never Gold. o.lowest and o.highest
     name the last 90 days' ends on the bar (the FloraScore detail) */
  const scoreBar = (o) => {
    const p = (v) => Math.max(0, Math.min(100, ((v - o.lo) / (o.hi - o.lo)) * 100));
    const b0 = p(o.su[0]), b1 = p(o.su[1]), mid = Math.max(22, Math.min(78, (b0 + b1) / 2));
    const tick = (v, cls) => `<i class="ap-sbar-tick ${cls}" style="left:${n1(p(v))}%"></i>`;
    /* only the detail names the ends, as the last 90 days' Lowest and Highest; the hero names the band alone, so its
       axis ends (60, 95) never read as the lowest and highest scores (fix-viz, Oct 28) */
    const ends = o.lowest != null
      ? `<span class="ap-sbar-lo" style="left:${n1(p(o.lowest))}%">Lowest ${o.lowest}</span><span class="ap-sbar-hi" style="left:${n1(p(o.highest))}%">Highest ${o.highest}</span>`
      : "";
    return `<div class="ap-sbar${o.hero ? " ap-sbar--hero" : ""}" role="img" aria-label="${esc(o.aria || "")}">
        <div class="ap-sbar-u"><span style="left:${n1(mid)}%">Your usual ${o.su[0]} to ${o.su[1]}</span></div>
        <div class="ap-sbar-trk"><i class="ap-sbar-band" style="left:${n1(b0)}%;width:${n1(b1 - b0)}%"></i>${o.lowest != null ? tick(o.lowest, "") + tick(o.highest, "") : ""}${o.value != null ? `<i class="ap-sbar-dot" style="left:${n1(p(o.value))}%"></i>` : ""}</div>
        ${ends ? `<div class="ap-sbar-ax">${ends}</div>` : ""}
      </div>`;
  };
  const scoreBarAxis = (M, mode, su) => {
    const all = L.scoreSeries(M, 90, mode).map((s) => s.value).filter((v) => v != null);
    const lo = Math.max(0, Math.floor(Math.min(...all, su[0] - 10) / 5) * 5), hi = Math.min(100, Math.ceil(Math.max(...all, su[1] + 10) / 5) * 5);
    return { lo, hi, lowest: all.length ? Math.min(...all) : null, highest: all.length ? Math.max(...all) : null };
  };

  /* What moved FloraScore this week (HTML): one row a part, a bar from a centre line in whole points (L.scoreMoved's
     pts, which add up to the change shown), in the reading colour either way, each with its words; a part that didn't
     move is words alone */
  const movedRows = (mv) => {
    const max = Math.max(3, ...mv.parts.map((p) => Math.abs(p.pts)));
    return `<div class="ap-moved" role="list">${mv.parts.map((p) => {
      const nm = PARTN[p.key][0], words = p.pts > 0 ? `${nm} added ${plural(p.pts, "point")}` : p.pts < 0 ? `${nm} took off ${plural(-p.pts, "point")}` : `${nm} didn't move`;
      const wv = n1((Math.abs(p.pts) / max) * 50);
      return `<div class="ap-moved-r" role="listitem"><span class="ap-moved-n">${esc(nm)}</span><i class="ap-moved-t">${p.pts ? `<b class="${p.pts > 0 ? "is-up" : "is-down"}" style="--w:${wv}%"></b>` : ""}</i><strong>${p.pts ? `${p.pts > 0 ? "+" : "−"}${Math.abs(p.pts)}` : "0"}</strong><em>${esc(words)}</em></div>`;
    }).join("")}</div>`;
  };

  /* ============================== READING THE LOGS ============================== */
  /* the first BMs' times in words: "at 7:40 PM" for one time, "from 6:50 AM to 8:10 AM" for a spread */
  const timesText = (tm) => { const fs = tm.mornings.map((f) => f.first), lo = Math.min(...fs), hi = Math.max(...fs); return lo === hi ? `at ${T(lo)}` : `from ${T(lo)} to ${T(hi)}`; };
  /* every reading against the usual is over the mornings read: a flagged today (L.facts' "flag") is in neither count */
  const timingOf = (M, F) => {
    const u = M.usual;
    const mornings = F.filter((f) => f.first != null), read = mornings.filter((f) => !f.flag);
    const later = u ? read.filter((f) => Math.round(f.first * 60) / 60 > u.tHi) : [], earlier = u ? read.filter((f) => Math.round(f.first * 60) / 60 < u.tLo) : [];
    const we = mornings.filter((f) => f.dow === 0 || f.dow === 6), wd = mornings.filter((f) => f.dow > 0 && f.dow < 6);
    return {
      mornings, read, later, earlier,
      inW: u ? read.filter((f) => f.inWin).length : null,
      laterAfterLate: later.filter((f) => L.lateDinner(M, f.d - 1)).length,
      /* the typical first BM is over the mornings read, as every count is (a flagged today is in none), and over every
         morning only when a flagged today is the one there is */
      med: read.length ? Ut.median(read.map((f) => f.first)) : mornings.length ? Ut.median(mornings.map((f) => f.first)) : null,
      weDiff: we.length >= 3 && wd.length >= 3 ? Ut.median(we.map((f) => f.first)) - Ut.median(wd.map((f) => f.first)) : null
    };
  };
  /* the days with something said about BMs; every reading, the average too, is over the days read (never a flagged
     today, so the average here and Ask Florin's agree) */
  const oftenOf = (M, F) => {
    const known = F.filter((f) => f.count != null), u = M.usual, read = known.filter((f) => !f.flag);
    const total = known.reduce((s, f) => s + f.count, 0), rtotal = read.reduce((s, f) => s + f.count, 0);
    return {
      known, read, total, avg: read.length ? rtotal / read.length : null,
      inC: u ? read.filter((f) => f.inCount).length : null,
      zero: known.filter((f) => f.count === 0).length,
      busy: u ? read.filter((f) => f.count > u.nHi).length : 0,
      fewer: u ? read.filter((f) => f.count < u.nLo).length : 0,
      gaps: F.filter((f) => f.count == null && !f.pending).length,
      split: [0, 1, 2, 3].map((k) => known.filter((f) => (k === 3 ? f.count >= 3 : f.count === k)).length)
    };
  };
  /* the mix: B bins by word; A and C by step, and a word logged in B that covers two steps goes in neither (split) */
  /* the BMs of the days read: a flagged today's are noted for a clinician, and in none of these counts */
  const formOf = (M, F, mode) => {
    const u = M.usual, B = mode === "B";
    const bms = F.filter((f) => !f.flag).flatMap((f) => f.bms.map((b) => ({ f, b })));
    const one = (o) => L.stepsOf(o.b).length === 1;
    const bins = B ? L.WORDS.map((w) => ({ short: w.word, label: w.word, count: bms.filter((o) => L.wordKey(o.b) === w.k).length, inUsual: u ? w.k >= u.wLo && w.k <= u.wHi : null }))
      : L.TYPES.slice(1).map((t) => ({ short: mode === "C" ? t.short : String(t.k), label: mode === "C" ? t.short : `Type ${t.k}`, count: bms.filter((o) => one(o) && L.stepsOf(o.b)[0] === t.k).length, inUsual: u ? t.k >= u.fLo && t.k <= u.fHi : null }));
    const split = B ? [] : bms.filter((o) => !one(o));
    const tally = {};
    bms.forEach((o) => { const w = L.formKey(o.b, mode); tally[w] = (tally[w] || 0) + 1; });
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const top = ranked[0] ? { label: ranked[0][0], count: ranked[0][1] } : null;
    const st = u ? bms.map((o) => L.inForms(M, o.b, mode)) : [];
    const out = u ? bms.filter((o, i) => st[i] === false) : [];
    const unsure = st.filter((s) => s === null).length;
    const firmer = out.filter((o) => (B ? L.wordKey(o.b) < u.wLo : Math.max(...L.stepsOf(o.b)) < u.fLo)).length;
    return { bms, bins, split, top, ranked, out, unsure, firmer, looser: out.length - firmer, inF: u ? bms.length - out.length - unsure : null };
  };
  /* the forms logged so far, in words: "mostly" only for more than half, else the counts ("2 Formed, 1 Soft and 1
     Firm"), never "most often" on a tie */
  const formsSaid = (fm) => (!fm.top ? "" : fm.top.count * 2 > fm.bms.length ? (fm.top.count === fm.bms.length ? `all ${fm.top.label}` : `mostly ${fm.top.label}`) : join(fm.ranked.map(([k, c]) => `${c} ${k}`)));
  /* a BM logged in B as a word that covers two steps sits in no A or C bar: said under the bars, by its word, so the bars
     and the count above them add up (fix-viz, Oct 28) */
  const formSplit = (fm) => {
    if (!fm.split.length) return "";
    const ws = join([...new Set(fm.split.map((o) => L.WORDS[L.wordKey(o.b)].word))]), k = fm.split.length;
    return `${plural(k, "BM")} logged as ${ws} ${k === 1 ? "covers" : "cover"} two steps, so ${k === 1 ? "it isn't" : "they aren't"} in the bars.`;
  };
  const symOf = (M, F) => {
    const logged = F.filter((f) => f.logged), withSym = logged.filter((f) => f.nsym);
    const names = {};
    withSym.forEach((f) => Object.keys(f.sym).forEach((k) => (names[k] = (names[k] || 0) + 1)));
    const rows = Object.entries(names).sort((a, b) => b[1] - a[1] || L.SYMPTOMS.indexOf(a[0]) - L.SYMPTOMS.indexOf(b[0])).map(([name, n]) => ({ name, n }));
    return { logged, withSym, rows };
  };
  const symUsualText = (u) => (!u || !u.sym ? null : u.sym.every == null ? "Rarely" : u.sym.every <= 1 ? "Most days" : `About 1 day in ${u.sym.every}`);
  /* the usual, short enough for a chart row's label */
  const symUsualShort = (u) => (!u || !u.sym ? "" : u.sym.every == null ? "usually rare" : u.sym.every <= 1 ? "usually most days" : `usually 1 in ${u.sym.every}`);
  /* against the stretch before, never against the usual: a plain chip, since Plum means your usual and Gold outside it */
  const trendWord = (c, p) => (c + 1 < p ? { text: "Less often", tone: "plain" } : c > p + 1 ? { text: "More often", tone: "plain" } : { text: "About the same", tone: "plain" });
  const ckOf = (M) => {
    const b = L.baseline(M), done = M.checkins.filter((c) => c.answers);
    const cur = M.checkin.status === "done" ? Object.assign({ w: 12, ws: 84 }, M.checkin) : null;
    const latest = cur || done[done.length - 1] || null;
    const cmp = latest && b ? L.CHECKIN.map((q, i) => L.compare(b, i, latest.answers[i])) : null;
    return { b, done, cur, latest, cmp, skipped: M.checkins.filter((c) => c.skipped) };
  };
  const ckHead = (K) => {
    if (!K.cmp) return null;
    const moved = K.cmp.map((c, i) => ({ c, i })).filter((o) => o.c.k !== "same");
    if (!moved.length) return "About the same as your first weeks";
    const word = (o) => ({ pain: o.c.k === "less" ? "less belly pain" : "more belly pain", way: o.c.k === "less" ? "fewer days in the way" : "more days in the way", bloat: o.c.k === "less" ? "less bloating" : "more bloating", settled: o.c.k === "less" ? "more settled" : "less settled" }[L.CHECKIN[o.i].k]);
    const s = join(moved.slice(0, 2).map(word));
    return `${s.charAt(0).toUpperCase() + s.slice(1)} than at first`;
  };
  /* ---------- FloraScore, from the logs (L.score). Words for where it sits, never a grade ---------- */
  /* FloraScore's own words (RU.scoreRel, refresh-ui.js): "in its usual range", never a day's "within your usual" */
  const relOf = RU.scoreRel;
  /* a flag or an alarm feature today (RU.flagToday): the score keeps its number but is read against nothing, on
     Insights' card and the detail as on Today's hero */
  const FLAG_REL = "Not read against your usual today";
  const scoreOf = (M, mode) => {
    if (!M.usual) return null;
    const s = L.score(M, L.TODAY, mode), su = L.scoreUsual(M, mode), mv = L.scoreMoved(M, mode);
    const v = s ? s.value : null, flag = v != null && RU.flagToday(M);
    return { s, v, su, mv, flag, rel: flag ? FLAG_REL : relOf(v, su) };
  };
  /* this week's average against last week's, in points, never a judgement of the week */
  const weekLine = (mv) => (mv.delta === 0 ? "The same as last week, on average." : `${Math.abs(mv.delta)} ${Math.abs(mv.delta) === 1 ? "point" : "points"} ${mv.delta > 0 ? "above" : "below"} last week, on average.`);
  const PARTN = Object.fromEntries(L.SCORE_PARTS.map(([k, l, d]) => [k, [l, d]]));
  /* the week as averages, a neutral chip: never Gold, which means outside your usual */
  const weekAvgs = (mv) => `This week ${mv.wkR} on average, last week ${mv.lwR}`;
  /* the part that moved FloraScore most this week, in whole points (L.scoreMoved's pts) */
  /* every part tied for the most is named: "Timing and Form moved it most this week, adding 2 points each" */
  const topParts = (mv) => { const m = Math.max(0, ...mv.parts.map((p) => Math.abs(p.pts))); return m ? mv.parts.filter((p) => Math.abs(p.pts) === m) : []; };
  RU.topParts = topParts;
  const movedMost = (mv) => {
    if (!mv) return "";
    const tops = topParts(mv);
    if (!tops.length) return "No one part moved it this week.";
    const k = Math.abs(tops[0].pts), names = join(tops.map((p, i) => (i ? PARTN[p.key][0].toLowerCase() : PARTN[p.key][0])));
    if (tops.length === 1) return `${names} moved it most this week, ${tops[0].pts > 0 ? "adding" : "taking off"} ${plural(k, "point")}.`;
    if (tops.every((p) => p.pts > 0) || tops.every((p) => p.pts < 0)) return `${names} moved it most this week, ${tops[0].pts > 0 ? "adding" : "taking off"} ${plural(k, "point")} each.`;
    return `${upper1(join(tops.map((p) => `${PARTN[p.key][0].toLowerCase()} ${p.pts > 0 ? "added" : "took off"} ${plural(k, "point")}`)))}, the most any part moved this week.`;
  };
  /* FloraScore by day, with a flagged today marked, for scoreLine */
  const scoreSer = (M, n, mode) => { const fl = RU.flagToday(M) && !!M.usual; return L.scoreSeries(M, n, mode).map((s) => ({ d: s.d, value: s.value, today: s.d === L.TODAY, dow: L.dateOf(s.d).getDay(), flag: fl && s.d === L.TODAY && s.value != null })); };
  /* how many days FloraScore sat in its usual range, of the days it was scored (a flagged today is in no count) */
  const inRange = (ser, su) => { const sc = ser.filter((s) => s.value != null && !s.flag); return { k: sc.filter((s) => s.value >= su[0] && s.value <= su[1]).length, of: sc.length }; };
  const SCORE_HOW = "FloraScore blends the days among your last 3 that have a BM, or No BM, logged, so one odd morning, or a day you didn't log, doesn't swing it. It's built from four things you log: when your first BM comes, how many, their form, and any symptoms. It compares you with you, never with anyone else.";
  const SCORE_NOT = "It isn't a medical score, and a lower number isn't a diagnosis. It's a way to see your week at a glance.";

  /* ---------- Today's hero (claude/Florin data viz.md, section 4) ----------
     The label with the FloraScore glyph (a plain circle that holds no value), the number with no count-up, your usual
     range as a bar with today's dot, and the day's one sentence. No ring filling toward 100, no 30-day line, no pill:
     the trend lives on Insights. Learning: "Day 5 of 14" over 14 steps */
  const heroSub = (H, tag) => (H.alarm
    ? `<${tag} class="ap-hero-sub ap-hero-flag">${icon("info")}<span>${esc(H.text)}</span></${tag}>`
    : `<${tag} class="ap-hero-sub">${esc(H.text)}</${tag}>`);
  const glyph = (size) => C.ring({ glyph: true, size: size || 16, stroke: 1.6 });
  RU.scoreHero = (M, V) => {
    const mode = V.form, S = scoreOf(M, mode), H = Object.assign({}, RU.highlightOf(M, mode));
    const free = V.plan === "free";
    const go = free ? `<span class="ap-hero-go">${icon("lock")}With membership</span>` : `<span class="ap-hero-go">Details ${RU.icon("chev")}</span>`;
    if (!S) {
      const d = L.learnDay(M);
      return `<section class="ap-hero ap-hero--learn" data-a aria-label="FloraScore">
          <div class="ap-hero-top"><span class="ap-hero-name">${glyph()}<span class="ap-k ap-k--ray">FloraScore</span></span><span class="ap-k ap-k--ray">Learning</span></div>
          <p class="ap-hero-day">Day ${d} of ${L.LEARN_DAYS}</p>
          <div class="ap-hero-steps" role="img" aria-label="${esc(`Day ${d} of ${L.LEARN_DAYS}`)}">${Array.from({ length: L.LEARN_DAYS }, (_, i) => `<i${i < d ? ' class="is-on"' : ""}></i>`).join("")}</div>
          <div class="ap-hero-copy"><p class="ap-hero-line">FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual.</p>${heroSub(H, "p")}</div>
        </section>`;
    }
    const v = S.v;
    /* a day with a flag or an alarm feature: the score keeps its number but is read against nothing (the bar has no
       dot), and the Teal note under it names the sign (Day first's chip says the same) */
    const line = v == null ? `${upper1(L.NO_SCORE)}.` : H.alarm ? "Not read against your usual today." : `${S.rel}.`;
    /* with membership, the sentence goes on to say what the log that stood out did to the score, as Day first's does */
    const fx = free || H.alarm ? "" : RU.scoreEffect(M, mode, H.N);
    if (fx) H.text = `${H.text} ${fx}`;
    const ax = scoreBarAxis(M, mode, S.su);
    const bar = scoreBar({ hero: true, lo: ax.lo, hi: ax.hi, su: S.su, value: v == null || H.alarm ? null : v, aria: `${v == null ? "No FloraScore today" : `FloraScore ${v}`}${H.alarm ? ", not read against your usual today" : ""}. Your usual range ${S.su[0]} to ${S.su[1]}.` });
    return `<button type="button" class="ap-hero" ${free ? 'data-act="pay" data-pay="score"' : 'data-act="idetail"'} data-k="score" data-a aria-label="${esc(`FloraScore ${v == null ? "not scored today" : v}. ${line} ${H.alarm ? "" : `Your usual range ${S.su[0]} to ${S.su[1]}. `}${H.text} Open the detail`)}">
        <span class="ap-hero-top"><span class="ap-hero-name">${glyph()}<span class="ap-k ap-k--ray">FloraScore</span></span><span class="ap-k ap-k--ray">Today</span></span>
        <b class="ap-hero-n${v == null ? " ap-hero-none" : ""}">${v == null ? "No score" : v}</b>
        ${bar}
        <span class="ap-hero-copy"><span class="ap-hero-line">${esc(line)}</span>${heroSub(H, "span")}</span>
        ${go}
      </button>`;
  };

  /* the 13 Monday to Sunday weeks since day 0 */
  const weeksOf = (M, mode) => { const d0 = d0Of(M, 90); return Array.from({ length: 13 }, (_, i) => M.days.filter((x) => x.d >= Math.max(d0, i * 7) && x.d < i * 7 + 7).map((x) => L.facts(M, x, mode))).filter((wk) => wk.length); };

  /* meals logged on few days: what the patterns card says instead, and the food check it offers */
  const sparseHead = (PR) => (PR.withMeal ? "Not enough ordinary days yet" : "No meals logged");
  const sparseLine = (PR) => (PR.withMeal
    ? `Meals are logged on ${PR.mealDays} of the ${PR.loggedDays === 1 ? "1 day" : `${PR.loggedDays} days`} you logged in the last ${PR.window} days${PR.roughShare >= 1 ? ", all of them days with symptoms" : PR.roughShare >= 0.6 ? ", most of them days with symptoms" : ""}, so there are few ordinary days to compare with. A ${L.FOOD_CHECK_DAYS}-day food check, ordinary days too, lets Florin look.`
    : `Florin looks for what tends to follow a food once meals are logged on most days. When a day feels off, say what you ate, and Florin starts from there.`);
  const foodCheckBtn = (free) => free ? `<button type="button" class="ap-btn ap-btn--2 ap-btn--c" data-act="pay" data-pay="food">${icon("lock")}Start a ${L.FOOD_CHECK_DAYS}-day food check</button>` : `<button type="button" class="ap-btn ap-btn--2 ap-btn--c" data-act="toast" data-msg="${esc(`A food check asks for one line a day for ${L.FOOD_CHECK_DAYS} days, ordinary days too, then shows what tends to follow. It comes with the next pass.`)}">Start a ${L.FOOD_CHECK_DAYS}-day food check</button>`;

  /* the patterns, and how each one reads */
  const foodName = (f) => L.FOOD_NAMES[f] || [f.charAt(0).toUpperCase() + f.slice(1), false];
  const looseText = (mode) => (mode === "B" ? "Loose or Watery" : mode === "C" ? `${L.TYPES[L.LOOSE_AT].short} or looser` : `Type ${L.LOOSE_AT} or looser`);
  const patTitle = (p) => (p.kind === "late" ? "Later dinners, later first BMs" : p.kind === "loose" ? `${foodName(p.food)[0]}, then a looser first BM` : `${foodName(p.food)[0]}, then bloating the next day`);
  const patCond = (p) => (p.kind === "late" ? "After a dinner past 8 PM" : p.kind === "loose" ? `The morning after ${lower1(foodName(p.food)[0])}` : `The day after ${lower1(foodName(p.food)[0])}`);
  const patOther = (p) => (p.kind === "late" ? "After an earlier dinner" : p.kind === "loose" ? "Other mornings" : "Other days");
  const patLine = (M, p, mode) => {
    const f = p.food ? lower1(foodName(p.food)[0]) : "";
    if (p.kind === "late") return `After ${p.hit} of ${p.n} dinners past 8 PM, your first BM came after ${T(M.usual.tHi)}, later than your usual window. After an earlier dinner, that happened ${p.oh} ${p.oh === 1 ? "time" : "times"} in ${p.on}.`;
    if (p.kind === "loose") return `The morning after ${f}, your first BM was ${looseText(mode)} ${p.hit} of ${p.n} times. On other mornings, ${p.oh} of ${p.on}.`;
    return `You logged bloating the day after ${f} ${p.hit} of ${p.n} times, and on ${p.oh} of ${p.on} other days.`;
  };
  const meter = (k, label) => C.meter(k, label);
  /* a pattern's two shares, for its detail and for Ask Florin */
  const patShares = (p) => shareBars([{ label: patCond(p), k: p.hit, n: p.n }, { label: patOther(p), k: p.oh, n: p.on }]);

  /* ============================== ONE CARD'S CHART ==============================
     Each Insights card's picture for a range, with its legend: the card draws it, the detail pages draw the same
     marks, and Ask Florin draws it in the chat (RU.cardChart), so a chart is the same chart wherever it shows.
     Returns { chart, legend } ("" when there's nothing to draw) */
  const sw = { in: (t) => lg("", t), out: (t) => lg("sw--shift", t), maybe: (t) => lg("sw--maybe", t) };
  /* the weekly bars' legend: square swatches, as the bars are. The bars count days, so within is Plum (Ray on dark), the
     colour of a day within your usual, as on the summary bar and Your days; the reading colour stays for measured values
     (a time, a count, a form) (fix-viz, Oct 28) */
  const barLg = (a, b) => `${lg("sw--bar sw--usual", a)}${lg("sw--bar sw--shift", b)}`;
  const chartOf = (M, V, key, n, w) => {
    const mode = V.form, u = M.usual, F = L.span(M, n, mode), live = F.filter((f) => !f.pending);
    const rn = RANGE_NAME[n].toLowerCase();
    if (key === "week") {
      const T7 = L.tally(F, n <= 7);
      if (!u || !T7.known) return { chart: "", legend: "" };
      return {
        chart: C.seg([{ v: T7.within, label: "Within your usual", cls: "is-usual" }, { v: T7.shifted, label: "Outside your usual", cls: "is-shift" }], { aria: `${T7.within} of ${plural(T7.known, "day")} within your usual, ${T7.shifted} outside your usual` }),
        /* a day count, in Plum: the legend says days, so it never reads as the Forest readings below it (Will's read, Oct 29) */
        legend: `${T7.within ? `<span><i class="sw sw--usual"></i>${plural(T7.within, "day")} within your usual</span>` : ""}${T7.shifted ? `<span><i class="sw sw--shift"></i>${plural(T7.shifted, "day")} outside your usual</span>` : ""}`
      };
    }
    if (key === "score") {
      const SC = scoreOf(M, mode);
      if (!SC) return { chart: "", legend: "" };
      const ser = scoreSer(M, n, mode);
      return { chart: scoreLine({ w, ser, su: SC.su, aria: `FloraScore, ${rn}, against your usual range ${SC.su[0]} to ${SC.su[1]}` }), legend: `${lg("sw--band", `Your usual range, ${SC.su[0]} to ${SC.su[1]}`)}${clinLg(ser.some((s) => s.flag))}` };
    }
    if (key === "timing") {
      const tm = timingOf(M, F);
      if (!tm.mornings.length) return { chart: "", legend: "" };
      const leg = u ? `${sw.in("In your usual window")}${tm.later.length || tm.earlier.length ? sw.out("Outside your usual window") : ""}${clinLg(tm.mornings.length > tm.read.length)}` : "";
      if (n >= 90 && u) return { legend: barLg("Days in your window", "Days outside your window"), chart: weekBars({ w, weeks: weekCounts(M, mode, (wk) => { const r = wk.filter((f) => f.first != null); return { within: r.filter((f) => f.inWin).length, read: r.length }; }), tip: (wk) => `Week of ${short(wk.d0)}: first BM in your window on ${wk.within} of ${plural(wk.read, "day")}`, aria: "Days a week with the first BM in your usual window" }) };
      return { chart: morning({ w, days: F, usual: u, domain: morningDomain(F, u), r: 4.4, gap: n >= 30 ? 1.2 : 1.6, bracket: w > 320, aria: `First BM each day, ${rn}${u ? `, against your usual window ${winText(u)}` : ""}` }), legend: leg };
    }
    if (key === "often") {
      const of = oftenOf(M, F);
      if (!live.some((f) => f.logged)) return { chart: "", legend: "" };
      const leg = u ? `${sw.in("A usual count")}${of.busy || of.fewer || of.zero ? sw.out("Outside your usual count") : ""}${clinLg(of.known.length > of.read.length)}` : "";
      if (n >= 90 && u) return { legend: barLg("Days with a usual count", "Days outside your usual count"), chart: weekBars({ w, weeks: weekCounts(M, mode, (wk) => { const r = wk.filter((f) => f.count != null); return { within: r.filter((f) => f.inCount).length, read: r.length }; }), tip: (wk) => `Week of ${short(wk.d0)}: a usual count on ${wk.within} of ${plural(wk.read, "day")}`, aria: "Days a week with a usual count" }) };
      return { chart: countLine({ w, days: F, usual: u, aria: `BMs a day, ${rn}${u ? `, against your usual ${u.nLo} to ${u.nHi}` : ""}` }), legend: leg };
    }
    if (key === "form") {
      const fm = formOf(M, F, mode);
      if (!fm.bms.length) return { chart: "", legend: "" };
      return { chart: formBars({ w, bins: fm.bins, h: w > 320 ? 96 : 64, usualLabel: u ? `Your usual, ${L.usualFormsText(M, mode)}` : null, aria: `Forms, ${rn}: ${fm.bins.filter((b) => b.count).map((b) => `${b.label} ${b.count}`).join(", ")}` }), legend: u && fm.out.length ? `${lg("sw--bar", "In your usual forms")}${lg("sw--bar sw--shift", "Outside your usual forms")}` : "" };
    }
    if (key === "sym") {
      const sy = symOf(M, F);
      if (!sy.rows.length) return { chart: "", legend: "" };
      if (n >= 90) return { chart: weekBars({ w, ctx: true, weeks: weeksOf(M, mode).map((wk) => ({ d0: wk[0].d, within: 0, outside: 0, read: wk.filter((f) => f.logged && f.nsym).length })), lastLabel: (wk) => plural(wk.read, "day"), tip: (wk) => `Week of ${short(wk.d0)}: symptoms on ${plural(wk.read, "day")}`, aria: "Days a week with any symptom" }), legend: u ? `<span>${esc(`Your usual: ${lower1(symUsualText(u))}.`)}</span>` : "" };
      const rows = w > 320 ? sy.rows : sy.rows.slice(0, 4), more = sy.rows.slice(rows.length);
      return { chart: symSquares({ w, days: F, rows, any: { name: "Any symptom", n: sy.withSym.length, sub: u ? symUsualShort(u) : plural(sy.withSym.length, "day") }, aria: `Symptoms by day, ${rn}` }), legend: more.length ? `<span>${esc(`Also logged: ${join(more.map((r) => `${r.name.toLowerCase()} on ${plural(r.n, "day")}`))}.`)}</span>` : "" };
    }
    if (key.indexOf("pattern:") === 0) {
      const p = L.patterns(M, mode).tests.find((x) => x.id === key.slice(8));
      return p ? { chart: patShares(p), legend: "" } : { chart: "", legend: "" };
    }
    return { chart: "", legend: "" };
  };
  /* a card's chart and legend for a range, for Ask Florin to draw the card's own picture (claude/Florin data viz.md,
     C15): key is score, week, timing, often, form, sym or pattern:<id> */
  RU.cardChart = (M, V, key, n) => chartOf(M, V, key, M.usual ? n || 7 : 7, 318);

  /* ============================== THE INSIGHTS TAB ============================== */
  const card = (V, o) => `<section class="ap-card ap-ic" data-a aria-labelledby="ic-${o.k}-${V.uid}">
      <button type="button" class="ap-ic-h" ${V.plan === "free" ? `data-act="pay" data-pay="${o.k}"` : `data-act="idetail"`} data-k="${o.k}"${V.plan === "free" ? ` aria-describedby="ic-${o.k}-${V.uid}-m"` : ""}>
        <span class="ap-ic-ic">${o.glyph || icon(o.icon)}</span>
        <span class="ap-ic-t"><span class="ap-k">${esc(o.kicker)}</span><b id="ic-${o.k}-${V.uid}">${esc(o.head)}</b></span>
        ${V.plan === "free" ? `<span class="ap-lockp" id="ic-${o.k}-${V.uid}-m">${icon("lock")}<span class="sr">The detail comes with Florin membership</span></span>` : icon("chev", "ap-ic-go")}
      </button>
      ${o.sum ? `<p class="ap-ic-sum">${o.sum}</p>` : ""}
      ${o.body || ""}
      ${o.chart ? `<div class="ap-ic-fig">${o.chart}</div>` : ""}
      ${o.legend ? `<div class="ap-legend">${o.legend}</div>` : ""}
      ${o.after || ""}
      <div class="ap-ic-f">${o.foot || ""}<button type="button" class="ap-ask-b" ${V.plan === "free" ? `data-act="pay" data-pay="ask"` : `data-act="ask-about"`} data-k="${o.k}">${icon(V.plan === "free" ? "lock" : "chat")}Ask about this</button></div>
    </section>`;

  /* the days a stretch read, said the one way: "Of the 2 days outside your usual, 1 had a first BM outside your window
     and 1 had a form outside your usual forms", then the days counted neither way (L.tally's left) and the days with
     nothing logged */
  const daysNote = (M, F, n, sparse) => {
    const T7 = L.tally(F, n <= 7), sh = F.filter((f) => f.state === "shifted");
    const why = [[sh.filter((f) => f.inWin === false).length, "a first BM outside your window"], [sh.filter((f) => f.formsIn === false).length, "a form outside your usual forms"], [sh.filter((f) => f.count === 0).length, "No BM"], [sh.filter((f) => f.inCount === false && f.count > 0).length, "more or fewer BMs than usual"]].filter(([k]) => k);
    /* dinners are read only when meals are logged on most days: with meals on few days (L.patterns' sparse), the count
       of late dinners is too low to mean anything, and the Patterns card on the same page says so (fix-viz, Oct 28) */
    const afterLate = sparse ? 0 : sh.filter((f) => L.lateDinner(M, f.d - 1)).length;
    const none = F.filter((f) => !f.logged && !f.pending);
    return [
      sh.length ? `Of the ${plural(sh.length, "day")} outside your usual, ${join(why.map(([k, t]) => `${k} had ${t}`))}.${afterLate ? ` ${afterLate} of the ${sh.length} came after a dinner past 8 PM.` : ""}` : "",
      T7.left,
      none.length ? (n <= 7 ? `Nothing logged on ${join(none.map((f) => L.dayName(f.d)))}.` : `${plural(none.length, "day")} with nothing logged.`) : ""
    ].filter(Boolean).join(" ");
  };

  RU.insights = (M, V, st) => {
    const mode = V.form, u = M.usual, learning = !u, free = V.plan === "free";
    const n = learning || free ? 7 : st.range;
    const F = L.span(M, n, mode);
    const live = F.filter((f) => !f.pending);

    /* the summary: how many days sat within your usual, counted as Today's card counts them (L.tally), over a bar of the
       days read; not counted and nothing logged in words under it */
    let summary;
    if (learning) {
      const bms = F.reduce((s, f) => s + f.bms.length, 0), logged = live.filter((f) => f.logged).length;
      const symDays = F.filter((f) => f.nsym).length, meals = F.reduce((s, f) => s + f.meals.length, 0);
      summary = `<section class="ap-card ap-sum ap-sum--learn" data-a>
          <span class="ap-k">Learning your usual · day ${L.learnDay(M)} of ${L.LEARN_DAYS}</span>
          <p class="ap-sum-lede">Counts only for now. From day ${L.LEARN_DAYS}, each card shows your usual, and how each day sits next to it.</p>
          <ul class="ap-sum-counts"><li><b>${logged}</b>${logged === 1 ? "day" : "days"} logged</li><li><b>${bms}</b>${bms === 1 ? "BM" : "BMs"}</li><li><b>${symDays}</b>${symDays === 1 ? "day" : "days"} with symptoms</li><li><b>${meals}</b>${meals === 1 ? "meal" : "meals"}</li></ul>
        </section>`;
    } else {
      const T7 = L.tally(F, n <= 7), Wc = chartOf(M, V, "week", n, 318), note = daysNote(M, F, n, L.patterns(M, mode).sparse);
      summary = `<section class="ap-card ap-sum" data-a>
          <span class="ap-k">${esc(RANGE_NAME[n])} · ${esc(spanOf(M, n))}</span>
          <div class="ap-sum-top">${T7.known ? `<b class="ap-big">${T7.within}<small>of ${plural(T7.known, "day")}</small></b><p>within your usual: a first BM in your window, a usual count and usual forms.</p>` : `<p>None of these days can be read against your usual.</p>`}</div>
          ${Wc.chart}${Wc.legend ? `<div class="ap-legend">${Wc.legend}</div>` : ""}
          ${note ? `<p class="ap-sum-note">${esc(note)}</p>` : ""}
        </section>`;
    }

    /* FloraScore: has it stayed in its usual range? A line on the band, then the part that moved it most this week */
    const SC = scoreOf(M, mode);
    const Sc = chartOf(M, V, "score", n, 318), mm = SC && SC.mv ? movedMost(SC.mv) : "";
    const scoreCard = SC ? card(V, {
      k: "score", glyph: glyph(18), kicker: "FloraScore · today",
      head: SC.v == null ? "Not scored today" : `${SC.v}, ${lower1(SC.rel)}`,
      sum: `Your usual range is <b>${SC.su[0]} to ${SC.su[1]}</b>.${SC.mv ? ` ${esc(weekLine(SC.mv))}` : ""}${SC.flag ? ` ${esc(RU.FLAG_DAY)}` : ""}`,
      chart: Sc.chart, legend: Sc.legend,
      after: mm ? (free ? `<div class="ap-tease"><p class="ap-ic-note ap-tease-in" aria-hidden="true">${esc(mm)}</p><button type="button" class="ap-btn ap-btn--2 ap-btn--c ap-tease-b" data-act="pay" data-pay="score">${icon("lock")}See what moved it</button></div>` : `<p class="ap-ic-note ap-ic-moved">${esc(mm)}</p>`) : ""
    }) : card(V, {
      k: "score", glyph: glyph(18), kicker: "FloraScore",
      head: `Starts on day ${L.LEARN_DAYS}`,
      sum: `Day ${L.learnDay(M)} of ${L.LEARN_DAYS}. Once Florin knows your usual, FloraScore reads each day against it.`
    });

    /* timing: did my first BM come in my usual window? */
    const tm = timingOf(M, F), Tc = chartOf(M, V, "timing", n, 318);
    const timing = card(V, {
      k: "timing", icon: "clock", kicker: "Timing · first BM",
      head: u ? `Usually ${winText(u)}` : "Learning your usual window",
      sum: u ? (tm.read.length ? `First BM in your window on <b>${tm.inW} of ${plural(tm.read.length, "day")}</b>${tm.later.length || tm.earlier.length ? `: ${join([tm.later.length ? `${tm.later.length} later` : "", tm.earlier.length ? `${tm.earlier.length} earlier` : ""].filter(Boolean))}` : ""}.` : tm.mornings.length ? esc(RU.FLAG_DAY) : "No first BM logged in this stretch.")
        : tm.mornings.length ? `First BM logged on <b>${plural(tm.mornings.length, "day")}</b> so far, ${esc(timesText(tm))}.` : "No BMs logged yet.",
      chart: Tc.chart, legend: Tc.legend
    });

    /* how often: did I go my usual number of times? */
    const of = oftenOf(M, F), Oc = chartOf(M, V, "often", n, 318);
    const often = card(V, {
      k: "often", icon: "bars", kicker: "How often",
      head: u ? `Usually ${u.nLo} to ${u.nHi} a day` : "Learning your usual count",
      sum: of.known.length ? (u ? (of.read.length ? `<b>${of.inC} of ${plural(of.read.length, "day")}</b> with a usual count${of.busy || of.fewer ? `: ${join([of.busy ? `${of.busy} with more` : "", of.fewer ? `${of.fewer} with fewer` : ""].filter(Boolean))}` : ""}.` : esc(RU.FLAG_DAY)) : `<b>${plural(of.total, "BM")}</b> over ${plural(of.known.length, "day")}.`) : u ? "No BMs logged in this stretch." : "No BMs logged yet.",
      chart: Oc.chart, legend: Oc.legend
    });

    /* form: were my BMs my usual forms? */
    const fm = formOf(M, F, mode), Fc = chartOf(M, V, "form", n, 318), fs = formsSaid(fm);
    const form = card(V, {
      k: "form", glyph: RU.glyph(4, "ap-ic-gl"), kicker: "Form",
      head: u ? `Usually ${L.usualFormsText(M, mode)}` : "Learning your usual forms",
      sum: fm.bms.length ? (u ? `<b>${fm.inF} of ${plural(fm.bms.length - fm.unsure, "BM")}</b> in your usual forms${fm.out.length ? `: ${join([fm.firmer ? `${fm.firmer} firmer` : "", fm.looser ? `${fm.looser} looser` : ""].filter(Boolean))}` : ""}${fm.unsure ? `, and ${fm.unsure} that could be either` : ""}.` : `<b>${plural(fm.bms.length, "BM")}</b> so far${/^\d/.test(fs) ? ": " : ", "}${esc(fs)}.`) : u ? "No BMs logged in this stretch." : "No BMs logged yet.",
      chart: Fc.chart, legend: Fc.legend,
      body: formSplit(fm) ? `<p class="ap-ic-note">${esc(formSplit(fm))}</p>` : ""
    });

    /* symptoms: how often did they come up? Strength in words, never in the mark */
    const sy = symOf(M, F), Yc = chartOf(M, V, "sym", n, 318);
    const symptoms = card(V, {
      k: "sym", icon: "sym", kicker: "Symptoms",
      head: u ? `Usually ${lower1(symUsualText(u))}` : "Symptoms so far",
      sum: sy.withSym.length ? esc(L.symLine(F, { named: n <= 7, of: sy.logged.length })) : sy.logged.length ? `None logged on the ${plural(sy.logged.length, "day")} you logged.` : "Nothing logged yet.",
      chart: Yc.chart, legend: Yc.legend
    });

    /* the weekly check-in, unless it's off for the whole app: each question with this week's answer and one chip (the
       trends stay on the detail) */
    const ckOn = RU.ckOn(V);
    const K = ckOf(M);
    const ckDue = M.checkin.status === "due";
    const ckFoot = ckDue ? `<button type="button" class="ap-btn ap-btn--2 ap-btn--c" data-act="ck-start">${M.ckDraft && M.ckDraft.step > 0 ? "Continue" : "Check in"}</button>` : "";
    const ckBody = K.b ? `<ul class="ap-ic-ck">${L.CHECKIN.map((q, i) => `<li><span class="ap-ic-ck-m"><span class="ap-k">${esc(q.label)}</span><b>${esc(q.opts[K.latest.answers[i]])}</b></span>${chip(K.cmp[i].text, K.cmp[i].k === "same" ? "usual" : "shift")}</li>`).join("")}</ul>`
      : `<p class="ap-ic-note">${K.done.length ? `${plural(K.done.length, "check-in")} so far. After three, each week is compared with them.` : "Your first three check-ins become the starting point for every week after."}</p>`;
    const checkin = !ckOn ? "" : card(V, {
      k: "ck", icon: "ck", kicker: K.b ? `Weekly check-in · ${K.cur ? "this week" : `week of ${short(K.latest.ws)}`}` : "Weekly check-in",
      head: K.b ? ckHead(K) : ckDue ? (K.done.length ? "This week's check-in is due tonight" : "Your first check-in is due tonight") : "Your first check-in is saved",
      sum: K.b ? `Each answer next to your first three weeks, ${esc(RU.spanText(K.done[0].ws, K.done[2].ws + 6))}.${ckDue ? " This week's is due tonight." : ""}` : "",
      body: ckBody,
      foot: ckFoot
    });

    /* possible patterns, from meals: each with its tier and "20 of 22 times", no count dots */
    const PR = L.patterns(M, mode);
    const patRows = PR.found.map((p) => `<li><button type="button" class="ap-ipat" data-act="idetail" data-k="pattern:${esc(p.id)}">
        <span class="ap-pat-ic">${icon(p.kind === "late" ? "moon" : "meal")}</span>
        <span class="ap-ipat-m"><b>${esc(patTitle(p))}</b><em>${esc(p.tier.label)} · ${p.hit} of ${p.n} times</em></span>
        ${icon("chev", "ap-ic-go")}</button></li>`).join("");
    const quietTxt = PR.quiet.length ? `Checked, nothing stands out yet: ${joinMore(PR.quiet.map((f) => lower1(foodName(f)[0])), 4)}.` : "";
    const waitTxt = PR.waiting.length ? `Needs more logs: ${joinMore(PR.waiting.map((f) => `${lower1(foodName(f)[0])} (${PR.counts[f]} of 5)`), 3)}.` : "";
    const patterns = free && PR.found.length ? card(V, {
      k: "pat", icon: "pat", kicker: `Possible patterns · ${L.PATTERN_DAYS} days`,
      head: `${WORDS[PR.found.length] || PR.found.length} possible ${PR.found.length === 1 ? "pattern" : "patterns"} found`,
      sum: "Florin membership shows which foods and dinner times tend to come before a change, and how often.",
      body: `<div class="ap-tease"><ul class="ap-ipats ap-tease-in" aria-hidden="true">${PR.found.map((p) => `<li><span class="ap-ipat"><span class="ap-pat-ic">${icon(p.kind === "late" ? "moon" : "meal")}</span><span class="ap-ipat-m"><b>${esc(patTitle(p))}</b><em>${esc(p.tier.label)}</em></span></span></li>`).join("")}</ul><button type="button" class="ap-btn ap-btn--2 ap-btn--c ap-tease-b" data-act="pay" data-pay="pat">${icon("lock")}See your patterns</button></div><p class="ap-ic-note">Patterns show what tends to happen together. They don't prove cause.</p>`
    }) : card(V, {
      k: "pat", icon: "pat", kicker: learning ? "Possible patterns" : `Possible patterns · ${L.PATTERN_DAYS} days`,
      head: PR.found.length ? `${WORDS[PR.found.length] || PR.found.length} possible ${PR.found.length === 1 ? "pattern" : "patterns"}` : learning ? "Not enough logs yet" : PR.sparse ? sparseHead(PR) : "Nothing stands out yet",
      sum: PR.found.length ? "" : learning ? "Florin starts checking a food once you've logged it 5 times." : PR.sparse ? esc(sparseLine(PR)) : "",
      foot: !learning && PR.sparse && PR.withMeal ? foodCheckBtn(free) : "",
      body: `${patRows ? `<ul class="ap-ipats">${patRows}</ul>` : ""}${quietTxt || waitTxt ? `<p class="ap-ic-note">${esc([quietTxt, waitTxt].filter(Boolean).join(" "))}</p>` : ""}<p class="ap-ic-note">Patterns show what tends to happen together. They don't prove cause.</p>`
    });

    return `<div class="ap-scr ap-ins">
      <header class="ap-top ap-top--ins" data-a><div><p class="ap-date">${esc(M.P.name)}'s logs</p><h1 class="ap-h1" tabindex="-1">Insights</h1></div>${learning ? chip(`Day ${L.learnDay(M)} of ${L.LEARN_DAYS}`, "plain") : rangeTabs(n, free)}</header>
      ${scoreCard}${summary}
      ${timing}${often}${form}${symptoms}${checkin}${patterns}
      ${fine(DISC)}
    </div>`;
  };

  /* ============================== DETAIL PAGES ============================== */
  const NEXT = { score: ["timing", "Timing"], timing: ["often", "How often"], often: ["form", "Form"], form: ["sym", "Symptoms"], sym: ["ck", "Weekly check-in"], ck: ["pat", "Possible patterns"] };
  /* with the check-in off, Symptoms goes straight on to Possible patterns */
  const nextOf = (k, V) => (NEXT[k] && NEXT[k][0] === "ck" && !RU.ckOn(V) ? NEXT.ck : NEXT[k]);
  const nav = (title) => `<header class="ap-nav"><button type="button" class="ap-back" data-act="iback">${RU.icon("back")}<span>Insights</span></button><span class="ap-nav-t" role="heading" aria-level="1" tabindex="-1">${esc(title)}</span><span class="ap-nav-sp"></span></header>`;
  const sect = (h, body, cls = "") => `<section class="ap-sect ${cls}" data-a><h3>${esc(h)}</h3>${body}</section>`;
  const fig = (cap, right, body, legend) => `<figure class="ap-fig" data-a>${cap ? `<figcaption class="ap-figcap"><b>${esc(cap)}</b>${right ? `<span>${esc(right)}</span>` : ""}</figcaption>` : ""}${body}${legend ? `<div class="ap-legend">${legend}</div>` : ""}</figure>`;
  const shaped = (lines) => (lines.filter(Boolean).length ? `<details class="ap-shaped" data-a><summary><span>What shaped this</span>${RU.icon("down")}</summary><div class="ap-shaped-b">${lines.filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join("")}</div></details>` : "");
  const tableOf = (head, rows) => (!rows.length ? "" : `<details class="ap-table" data-a><summary>View as table</summary><div class="ap-table-in"><table><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`);
  const askBtn = (k) => `<button type="button" class="ap-btn ap-btn--line ap-btn--block ap-idt-ask" data-act="ask-about" data-k="${esc(k)}" data-a>${icon("chat")}Ask about this</button>`;
  const nextBtn = (k, V) => { const nx = nextOf(k, V); return nx ? `<button type="button" class="ap-idt-next" data-act="idetail" data-k="${nx[0]}" data-a><span><em>Next</em><b>${esc(nx[1])}</b></span>${RU.icon("chev")}</button>` : ""; };
  const hero = (k, big, chips, now) => `<div class="ap-dhero" data-a><span class="ap-k">${esc(k)}</span><b class="ap-big">${big}</b>${chips ? `<div class="ap-chips">${chips}</div>` : ""}${now || ""}</div>`;
  const nowRow = (label, value, tone, text, range) => `<div class="ap-idt-now"><div class="ap-idt-now-h"><span><em>${esc(label)}</em><b>${esc(value)}</b></span>${text ? chip(text, tone) : ""}</div>${range || ""}</div>`;
  const learnChip = (M) => chip(`Learning your usual · day ${L.learnDay(M)} of ${L.LEARN_DAYS}`, "plain");
  const page = (M, V, st, title, body) => `<div class="ap-scr ap-idt">
      ${nav(title)}
      ${body}
      ${fine(DISC)}
    </div>`;

  RU.idetail = (M, V, st) => {
    /* the check-in's detail doesn't exist while the check-in is off: back to the cards */
    if (st.k === "ck" && !RU.ckOn(V)) return RU.insights(M, V, st);
    const mode = V.form, u = M.usual, learning = !u;
    const n = learning ? 7 : st.range;
    const F = L.span(M, n, mode);
    const k = st.k || "timing";
    const tabs = learning ? "" : `<div class="ap-det-range" data-a>${rangeTabs(n)}</div>`;
    const rn = RANGE_NAME[n].toLowerCase();
    const today = F.find((f) => f.today);
    const W = 326;

    if (k === "score") {
      const SC = scoreOf(M, mode);
      if (!SC) return page(M, V, st, "FloraScore", `
        <div class="ap-dhero" data-a><span class="ap-hero-name">${glyph()}<span class="ap-k">FloraScore</span></span><p class="ap-dhero-day">Day ${L.learnDay(M)} of ${L.LEARN_DAYS}</p>${learnChip(M)}</div>
        <p class="ap-sect-p" data-a>Your FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual.</p>
        ${sect("How FloraScore works", `<p>${esc(SCORE_HOW)}</p><p class="ap-callout" data-disclaimer>${esc(SCORE_NOT)}</p>`)}`);
      const v = SC.v, su = SC.su, mv = SC.mv;
      const ser = scoreSer(M, n, mode), R = inRange(ser, su), ax = scoreBarAxis(M, mode, su);
      /* a flag today: the bar has no dot and reads nothing, and the Teal note under it names the sign, as Today's hero does */
      const H = SC.flag ? RU.highlightOf(M, mode) : null;
      const flagNote = H && H.alarm ? `<p class="ap-info ap-dhero-flag" data-a>${icon("info")}<span>${esc(H.text)}</span></p>` : "";
      const room = mv ? mv.parts.slice().sort((a, b) => a.now - b.now)[0] : null;
      const lateP = L.patterns(M, mode).found.find((p) => p.kind === "late");
      const tryLine = !room ? "" : room.key === "timing" ? (lateP ? `Timing has the most room this week. Your first BM came later than your window after ${lateP.hit} of ${lateP.n} dinners past 8 PM, so earlier dinners are a good place to start.` : "Timing has the most room this week. Logging your first BM when it happens keeps this part accurate.") : room.key === "often" ? "How often has the most room this week. Logging a No BM day, when there is one, keeps it accurate." : room.key === "form" ? "Form has the most room this week. A note on what you ate on those days helps Florin look for what tends to follow." : "Comfort has the most room this week. Logging on ordinary days helps as much as rough ones.";
      const Sc = chartOf(M, V, "score", n, W);
      return page(M, V, st, "FloraScore", `
        <div class="ap-dhero ap-dhero--sc" data-a>
          <span class="ap-hero-name">${glyph()}<span class="ap-k">FloraScore · today</span></span>
          <b class="ap-big">${v == null ? "No score" : v}</b>
          <p class="ap-dhero-line">${esc(v == null ? `${upper1(L.NO_SCORE)}.` : `${SC.rel}.`)}</p>
          ${mv ? `<div class="ap-chips">${chip(weekAvgs(mv), "plain")}</div>` : ""}
        </div>
        ${flagNote}
        ${fig("Where today sits", "Your last 90 days", scoreBar({ lo: ax.lo, hi: ax.hi, su, value: v == null || SC.flag ? null : v, lowest: ax.lowest, highest: ax.highest, aria: `${v == null ? "No FloraScore today" : `Today ${v}`}${SC.flag ? `, ${lower1(FLAG_REL)}` : ""}. Your usual range ${su[0]} to ${su[1]}. Your last 90 days ran from ${ax.lowest} to ${ax.highest}.` }))}
        ${tabs}
        ${fig(R.of ? `In its usual range on ${R.k} of ${plural(R.of, "day")}` : "Not scored in this stretch", `${R.of} of ${ser.length} days scored`, Sc.chart, Sc.legend)}
        ${mv ? fig("What moved it this week", `${mv.lwR} last week to ${mv.wkR}, in points`, `<p class="ap-moved-sum">${esc(weekLine(mv))}</p>` + movedRows(mv) + tableOf(["Part", "Last week, out of 100", "This week, out of 100", "Moved, in points"], mv.parts.map((p) => [PARTN[p.key][0], String(p.before), String(p.now), p.pts > 0 ? `+${p.pts}` : p.pts < 0 ? `−${-p.pts}` : "0"]))) : ""}
        ${mv ? `<div class="ap-compl" data-a>${mv.parts.map((p) => `<div class="ap-comp"><div class="ap-comp-h"><b>${esc(PARTN[p.key][0])}</b><span class="ap-k">${Math.round(p.weight * 100)}% of the score</span></div><p>${esc(PARTN[p.key][1])}</p><p class="ap-comp-v">This week ${p.now} out of 100, last week ${p.before}.</p></div>`).join("")}</div>` : ""}
        ${sect("How FloraScore works", `<p>${esc(SCORE_HOW)}</p><p class="ap-callout" data-disclaimer>${esc(SCORE_NOT)}</p>`)}
        ${tryLine ? sect("What you could try", `<p>${esc(tryLine)}</p>`, "ap-sect--try") : ""}
        ${askBtn("score")}
        ${tableOf(["Day", "FloraScore"], ser.slice().reverse().map((x) => [short(x.d), x.value == null ? "Not scored" : `${x.value}${x.flag ? ", noted for a clinician" : ""}`]))}
        ${nextBtn("score", V)}`);
    }

    if (k === "timing") {
      const tm = timingOf(M, F), dom = morningDomain(F, u);
      const tf = today && today.first != null ? today : null;
      /* a flagged today: its time, noted for a clinician, with no reading and no range */
      const now = tf && tf.flag ? nowRow("Today", T(tf.first), "info", "Noted for a clinician", "") : tf ? nowRow("Today", T(tf.first), tf.inWin ? "usual" : "shift", u ? (tf.inWin ? "In your usual window" : Math.round(tf.first * 60) / 60 > u.tHi ? "Later than your window" : "Earlier than your window") : "", u ? C.range({ min: dom[0], max: dom[1], lo: u.tLo, hi: u.tHi, value: tf.first, fmt: hm, state: tf.inWin ? "usual" : "shift", aria: `Today ${T(tf.first)}, usual window ${winText(u)}` }) : "") : "";
      const Tc = chartOf(M, V, "timing", n, W);
      let second = "";
      const sparse = L.patterns(M, mode).sparse;
      if (n <= 30) {
        /* every row labelled; past a week, the last 14 days (30 rows ran to about 1000px of unlabelled rows: the table
           under the page lists all 30). Dinner ticks only when meals are logged on enough days to read */
        const rows = F.slice().reverse().filter((f) => !f.pending).slice(0, 14).map((f) => ({ f, label: dayShort(f.d), late: !sparse && L.lateDinner(M, f.d - 1) }));
        const firstIn = rows.some((r) => r.f.bms.length && r.f.inWin), firstOut = rows.some((r) => r.f.bms.length && r.f.inWin === false && !r.f.flag);
        const leg = !u ? lg("sw--learn", "A BM") : `${firstIn ? lg("", "First BM, in your usual window") : ""}${firstOut ? lg("sw--shift", "First BM, outside your usual window") : ""}${rows.some((r) => r.f.bms.length > 1) ? lg("sw--later", "Later BMs") : ""}`;
        second = !rows.length ? "" : fig("Every BM, day by day", n <= 7 ? "Newest at the top" : "Last 14 days, newest at the top", dayDots({ w: W, rowH: n <= 7 ? 28 : 20, usual: u, rows, aria: "Every BM by day on a time axis" }),
          `${leg}${clinLg(rows.some((r) => r.f.flag && r.f.bms.length))}${rows.some((r) => r.late) ? lg("sw--tick", "Dinner after 8 PM the day before") : ""}`);
      }
      const PRt = L.patterns(M, mode);
      const lines = u ? [
        tm.later.length ? (sparse ? `${plural(tm.later.length, "morning")} came later than your window. Meals are logged on ${PRt.mealDays} of the ${plural(PRt.loggedDays, "day")} you logged, too few to compare dinner times.` : `${tm.laterAfterLate} of your ${plural(tm.later.length, "later morning")} came after a dinner past 8 PM.`) : "No mornings later than your window.",
        tm.earlier.length ? `${plural(tm.earlier.length, "morning")} came earlier than your window.` : "",
        tm.weDiff != null && Math.abs(tm.weDiff) >= 1 / 6 ? `Weekend mornings ran about ${Math.round(Math.abs(tm.weDiff) * 12) * 5} minutes ${tm.weDiff > 0 ? "later" : "earlier"} than weekdays.` : "",
        `Your usual window is where most first BMs landed in your weeks from ${short(28)} to ${short(83)}. It updates as you log.`
      ] : [`Florin needs ${L.LEARN_DAYS} days of logs to set your usual window. Day ${L.learnDay(M)} so far.`];
      return page(M, V, st, "Timing", `
        ${hero("Typical first BM", tm.med != null ? esc(T(tm.med)) : "None yet", learning ? learnChip(M) : `${chip(`Your usual ${winText(u)}`, "plain")}${chip(`In it on ${tm.inW} of ${plural(tm.read.length, "day")}`, "plain")}`, now)}
        ${tabs}
        ${fig(u ? (n >= 90 ? "Days a week with the first BM in your window" : `First BM in your window on ${tm.inW} of ${plural(tm.read.length, "day")}`) : "First BM, each day", RANGE_NAME[n], Tc.chart || `<p class="ap-ic-note">${u ? "No first BM logged in this stretch." : "No first BM logged yet."}</p>`, Tc.legend)}
        ${second}
        ${shaped(lines)}
        ${askBtn("timing")}
        ${tableOf(["Day", "First BM", "BMs", "In your usual window"], F.slice().reverse().filter((f) => !f.pending).map((f) => [short(f.d), f.first != null ? T(f.first) : f.logged ? (f.nobm ? "No BM" : "Nothing about BMs") : "Nothing logged", f.count != null ? String(f.count) : "", f.flag ? "Noted for a clinician" : f.inWin == null ? "" : f.inWin ? "Yes" : "No"]))}
        ${nextBtn("timing", V)}`);
    }

    if (k === "often") {
      const of = oftenOf(M, F), Oc = chartOf(M, V, "often", n, W);
      const yMax = Math.max(3, u ? u.nHi + 1 : 0, ...F.map((f) => f.count || 0));
      const tc = today && today.count != null ? today : null;
      const now = tc && tc.flag ? nowRow("Today so far", tc.count === 0 ? "No BM" : plural(tc.count, "BM"), "info", "Noted for a clinician", "") : tc ? nowRow("Today so far", tc.count === 0 ? "No BM" : plural(tc.count, "BM"), tc.inCount ? "usual" : "shift", u ? (tc.inCount ? "A usual count" : tc.count > u.nHi ? "More than usual" : "Fewer than usual") : "", u ? C.range({ min: 0, max: yMax, pad: 0.5, lo: u.nLo, hi: u.nHi, value: tc.count, state: tc.inCount ? "usual" : "shift", unit: "a day", aria: `Today ${tc.count}, usual ${u.nLo} to ${u.nHi}` }) : "") : "";
      const lines = [
        u ? `${of.inC} of ${plural(of.read.length, "day")} had ${u.nLo} to ${u.nHi} BMs, your usual.` : "",
        of.busy ? `${plural(of.busy, "day")} had more than ${u.nHi}.` : u ? `No days had more than ${u.nHi}.` : "",
        of.zero ? `${plural(of.zero, "day")} logged as No BM.` : "",
        of.gaps ? `${plural(of.gaps, "day")} with nothing about BMs ${of.gaps === 1 ? "stays a gap" : "stay gaps"}. A gap never counts as a day with no BM.` : "",
        today && today.count != null ? "Today counts as far as it has gone." : ""
      ];
      return page(M, V, st, "How often", `
        ${hero("BMs a day, on average", of.avg != null ? `${of.avg.toFixed(1)}<small>a day</small>` : "None yet", learning ? learnChip(M) : `${chip(`Your usual ${u.nLo} to ${u.nHi} a day`, "plain")}${chip(`A usual count on ${of.inC} of ${plural(of.read.length, "day")}`, "plain")}`, now)}
        ${tabs}
        ${Oc.chart ? fig(n >= 90 ? "Days a week with a usual count" : u ? `${of.inC} of ${plural(of.read.length, "day")} with a usual count` : "BMs each day", RANGE_NAME[n], Oc.chart, Oc.legend) : `<p class="ap-sect-p" data-a>No BMs logged yet. Each day you log shows here.</p>`}
        ${shaped(lines)}
        ${askBtn("often")}
        ${tableOf(["Day", "BMs", "A usual count"], F.slice().reverse().filter((f) => !f.pending).map((f) => [short(f.d), f.count != null ? (f.count === 0 ? "No BM" : String(f.count) + (f.today ? " so far" : "")) : f.logged ? "Nothing about BMs" : "Nothing logged", f.flag ? "Noted for a clinician" : f.inCount == null ? "" : f.inCount ? "Yes" : "No"]))}
        ${nextBtn("often", V)}`);
    }

    if (k === "form") {
      const fm = formOf(M, F, mode), B = mode === "B", Cw = mode === "C", Fc = chartOf(M, V, "form", n, W);
      const lastBm = today && today.bms.length ? today.bms[today.bms.length - 1] : null;
      const inLast = lastBm && u ? L.inForms(M, lastBm, mode) : null;
      const said = inLast ? "In your usual forms" : inLast === false ? "Outside your usual forms" : "Could be either";
      const now = lastBm && today.flag ? nowRow("Today", L.formName(lastBm, mode), "info", "Noted for a clinician", "") : lastBm ? nowRow("Today", L.formName(lastBm, mode), inLast ? "usual" : inLast === false ? "shift" : "plain", u ? said : "",
        /* a word logged in B that covers two steps is drawn as a span over both, never a dot between them: Ink 3 when it
           could be either side of the usual (fix-viz, Oct 28). Steps pad half a step either side, as the dot plot does */
        u ? (() => { const st = L.stepsOf(lastBm), two = !B && st.length > 1; return C.range({ min: B ? 0 : 1, max: B ? 4 : 7, pad: 0.5, lo: B ? u.wLo : u.fLo, hi: B ? u.wHi : u.fHi, value: two ? null : B ? L.wordKey(lastBm) : st[0], span: two ? [Math.min(...st), Math.max(...st)] : null, fmt: B ? (v) => L.WORDS[v].word : Cw ? (v) => L.TYPES[v].short : (v) => `Type ${v}`, state: inLast ? "usual" : inLast === false ? "shift" : "maybe", aria: `Today ${L.formName(lastBm, mode)}, ${lower1(said)}, usual ${L.usualFormsText(M, mode)}` }); })() : "") : "";
      const PR = L.patterns(M, mode);
      const loose = PR.found.filter((p) => p.kind === "loose");
      const lines = [
        u && fm.out.length ? `Of the ${plural(fm.out.length, "BM")} outside your usual, ${join([fm.firmer ? `${fm.firmer} ${fm.firmer === 1 ? "was" : "were"} firmer` : "", fm.looser ? `${fm.looser} ${fm.looser === 1 ? "was" : "were"} looser` : ""].filter(Boolean))}.` : u && !fm.unsure ? "Every BM was in your usual forms." : "",
        fm.unsure ? `${plural(fm.unsure, "BM")} logged as a word that covers steps on both sides of your usual could be either, so ${fm.unsure === 1 ? "it isn't" : "they aren't"} counted as in or outside.` : "",
        ...loose.map((p) => `The morning after ${lower1(foodName(p.food)[0])}, your first BM was ${looseText(mode)} ${p.hit} of ${p.n} times in the last ${L.PATTERN_DAYS} days. It's on Possible patterns.`),
        B ? "Five words, hardest to loosest: Hard covers the two hardest steps and Loose the two just before Watery." : Cw ? "Seven words, from Pellets, the hardest, to Watery, the loosest." : "Types run from 1, hardest, to 7, loosest."
      ];
      /* each BM by day, up to 30 days; at 90, the days a week in your usual forms. Today stays on the axis with nothing
         logged yet (nothing drawn above it), so the axis always ends on Today, as the count line's does */
      const days = F;
      const second = !fm.bms.length ? "" : n >= 90 && u
        ? fig("Days a week in your usual forms", "13 weeks", weekBars({ w: W, weeks: weekCounts(M, mode, (wk) => { const r = wk.filter((f) => f.bms.length && f.formsIn != null); return { within: r.filter((f) => f.formsIn).length, read: r.length }; }), tip: (wk) => `Week of ${short(wk.d0)}: usual forms on ${wk.within} of ${plural(wk.read, "day")}`, aria: "Days a week with every BM in your usual forms" }), barLg("Days with every BM in your usual forms", "Days with a BM outside them"))
        : fig("Each BM, day by day", B ? "Hard at the bottom" : Cw ? "Pellets at the bottom" : "Type 1 at the bottom", formDots({ w: W, days, mode, usual: u, h: 110, aria: `Each BM's form, ${rn}` }), `${lg("", u ? "In your usual forms" : "A BM")}${u && fm.out.length ? lg("sw--shift", "Outside your usual forms") : ""}${fm.unsure ? lg("sw--maybe", "Could be either") : ""}${clinLg(F.some((f) => f.flag && f.bms.length))}`);
      return page(M, V, st, "Form", `
        ${hero("Most common form", fm.bms.length ? esc(fm.top.label) : "None yet", learning ? learnChip(M) : `${chip(`Your usual ${L.usualFormsText(M, mode)}`, "plain")}${fm.bms.length ? chip(`${fm.inF} of ${plural(fm.bms.length - fm.unsure, "BM")} in them`, "plain") : ""}`, now)}
        ${tabs}
        ${!fm.bms.length ? `<p class="ap-sect-p" data-a>No BMs logged yet. Each one you log shows here, by its form.</p>` : fig(u ? `${fm.inF} of ${plural(fm.bms.length - fm.unsure, "BM")} in your usual forms` : "Forms so far", plural(fm.bms.length, "BM"), Fc.chart + (formSplit(fm) ? `<p class="ap-figcap-note">${esc(formSplit(fm))}</p>` : ""), Fc.legend)}
        ${second}
        ${shaped(lines)}
        ${askBtn("form")}
        ${tableOf(["Day", "Time", "Form", "In your usual forms"], F.slice().reverse().flatMap((f) => f.bms.slice().reverse().map((b) => { const s = u ? L.inForms(M, b, mode) : undefined; return [short(f.d), T(b.t), L.formName(b, mode), f.flag ? "Noted for a clinician" : s === undefined ? "" : s ? "Yes" : s === false ? "No" : "Could be either"]; })))}
        ${nextBtn("form", V)}`);
    }

    if (k === "sym") {
      const sy = symOf(M, F), Yc = chartOf(M, V, "sym", n, W);
      const P2 = L.prevSpan(M, n, mode);
      const cur = symOf(M, P2.cur), prev = symOf(M, P2.prev);
      const names = [...new Set(cur.rows.map((r) => r.name).concat(prev.rows.map((r) => r.name)))];
      const trows = names.map((name) => { const c = (cur.rows.find((r) => r.name === name) || { n: 0 }).n, p = (prev.rows.find((r) => r.name === name) || { n: 0 }).n; return { name, c, p, w: trendWord(c, p) }; });
      const all = trendWord(cur.withSym.length, prev.withSym.length);
      const ts = today && today.nsym ? today : null;
      const now = ts ? nowRow("Today", L.symLine([ts]).replace(/^Symptoms today: /, "").replace(/\.$/, "").replace(/^./, (c) => c.toUpperCase()), "plain", "", "") : "";
      const PR = L.patterns(M, mode);
      const bloatP = PR.found.filter((p) => p.kind === "bloat");
      const lines = [
        sy.rows.length ? `${sy.rows[0].name} came up most, on ${plural(sy.rows[0].n, "day")}.` : "",
        ...bloatP.map((p) => `Bloating came the day after ${lower1(foodName(p.food)[0])} ${p.hit} of ${p.n} times in the last ${L.PATTERN_DAYS} days. It's on Possible patterns.`),
        u ? `Your usual comes from your weeks from ${short(28)} to ${short(83)}: symptoms on ${u.sym.n} of the ${u.sym.of} days you logged.` : "",
        P2.prev.length && !learning ? `Compared with ${P2.label}${P2.cur30 ? ", using your last 30" : ""}.` : ""
      ];
      return page(M, V, st, "Symptoms", `
        ${hero("Days with symptoms", sy.logged.length ? `${sy.withSym.length}<small>of ${plural(sy.logged.length, "day")}</small>` : "None yet", learning ? learnChip(M) : `${chip(`Your usual: ${lower1(symUsualText(u))}`, "plain")}${P2.prev.length ? chip(`${all.text} than ${P2.label}`.replace("About the same than", "About the same as"), all.tone) : ""}`, now)}
        ${tabs}
        ${fig(sy.withSym.length ? (n >= 90 ? "Days a week with any symptom" : L.symLine(F, { named: n <= 7, of: sy.logged.length })) : "No symptoms logged", n >= 90 ? "13 weeks" : RANGE_NAME[n], Yc.chart, Yc.legend)}
        ${trows.length && P2.prev.length ? `<div class="ap-trows" data-a>${trows.map((r) => `<div class="ap-trow"><b>${esc(r.name)}</b><span>${esc(plural(r.c, "day"))}<em>${esc(`${r.p} before`)}</em></span>${chip(r.w.text, r.w.tone)}</div>`).join("")}</div>` : ""}
        <section class="ap-sect ap-sect--care" data-a><h3>When to talk to a clinician</h3><p>Some changes need a person, not an app. Blood, a black stool, a fever, vomiting that won't stop, weight loss you can't explain or waking at night to go: start with primary care soon.</p></section>
        ${shaped(lines)}
        ${askBtn("sym")}
        ${tableOf(["Day", "Symptom", "Strength"], F.slice().reverse().filter((f) => f.nsym).flatMap((f) => Object.entries(f.sym).map(([nm, s]) => [short(f.d), nm, upper1(sWord(s))])))}
        ${nextBtn("sym", V)}`);
    }

    if (k === "ck") {
      const K = ckOf(M);
      const due = M.checkin.status === "due";
      const rows = K.b ? L.CHECKIN.map((q, i) => `<li class="ap-ckr-row"><div class="ap-ckr-top"><span class="ap-k">${esc(q.label)}</span>${chip(K.cmp[i].text, K.cmp[i].k === "same" ? "usual" : "shift")}</div><b>${esc(q.opts[K.latest.answers[i]])}</b>${RU.ckTrend(M, i, K.cur ? K.cur.answers[i] : null)}</li>`).join("") : "";
      const lines = K.b ? [
        `Your starting point is your first three check-ins, ${RU.spanText(K.done[0].ws, K.done[2].ws + 6)}. Each week sits next to them. No score and no severity labels.`,
        K.skipped.length ? `You skipped the week of ${join(K.skipped.map((c) => short(c.ws)))}. A skipped week stays a gap.` : "",
        "About the same means inside the range of your first three weeks. Moved means outside that range, in either direction."
      ] : [];
      return page(M, V, st, "Weekly check-in", `
        <div class="ap-dhero" data-a><span class="ap-k">${esc(K.latest ? (K.cur ? `This week · ${RU.spanText(84, 90)}` : `Week of ${short(K.latest.ws)}`) : "Weekly check-in")}</span><h2 class="ap-idt-h">${esc(K.b ? ckHead(K) : due ? "Your first check-in is due tonight" : "Your first check-in is saved")}</h2>${due ? `<div class="ap-idt-cta"><button type="button" class="ap-btn ap-btn--2" data-act="ck-start">${M.ckDraft && M.ckDraft.step > 0 ? "Continue this week's" : "Check in for this week"}</button></div>` : ""}</div>
        ${K.b ? `<ul class="ap-ckr-list" data-a>${rows}</ul><div class="ap-legend" data-a>${lg("sw--band", "Your first three weeks")}${lg("ap-ckt-sw--now", K.cur ? "This week" : "Latest week")}</div>` : `<p class="ap-sect-p" data-a>Your first three check-ins become the starting point. After that, each week is compared with them, and the trend shows here.</p>`}
        ${shaped(lines)}
        ${askBtn("ck")}
        ${K.done.length ? tableOf(["Week of", "Belly pain", "In the way", "Bloating", "Habits"], M.checkins.concat(K.cur ? [K.cur] : []).slice().reverse().map((c) => [short(c.ws), ...(c.answers ? c.answers.map((a, i) => L.CHECKIN[i].opts[a]) : ["Skipped", "", "", ""])])) : ""}
        ${nextBtn("ck", V)}`);
    }

    if (k === "pat") {
      const PR = L.patterns(M, mode);
      const rows = PR.found.map((p) => `<li><button type="button" class="ap-ipat" data-act="idetail" data-k="pattern:${esc(p.id)}">
          <span class="ap-pat-ic">${icon(p.kind === "late" ? "moon" : "meal")}</span>
          <span class="ap-ipat-m"><b>${esc(patTitle(p))}</b><em>${esc(p.tier.label)} · ${p.hit} of ${p.n} times</em></span>
          ${icon("chev", "ap-ic-go")}</button></li>`).join("");
      const waiting = PR.waiting.slice(0, 6).map((f) => `<div class="ap-wait"><span>${esc(foodName(f)[0])}</span><i><b style="--w:${n1((PR.counts[f] / 5) * 100)}%"></b></i><strong>${PR.counts[f]} of 5</strong></div>`).join("");
      return page(M, V, st, "Possible patterns", `
        <div class="ap-dhero" data-a><span class="ap-k">Meals · last ${L.PATTERN_DAYS} days</span><h2 class="ap-idt-h">${esc(PR.found.length ? `${WORDS[PR.found.length] || PR.found.length} possible ${PR.found.length === 1 ? "pattern" : "patterns"}` : learning ? "Not enough logs yet" : PR.sparse ? sparseHead(PR) : "Nothing stands out yet")}</h2><p class="ap-idt-lede">${esc(!learning && PR.sparse ? sparseLine(PR) : "What tends to come the morning or the day after something you logged. Seen together, never proof of cause.")}</p>${!learning && PR.sparse && PR.withMeal ? `<div class="ap-idt-cta">${foodCheckBtn()}</div>` : ""}</div>
        ${rows ? `<ul class="ap-ipats" data-a>${rows}</ul>` : ""}
        ${PR.quiet.length ? sect("Checked, nothing stands out yet", `<p>${esc(join(PR.quiet.map((f) => `${lower1(foodName(f)[0])} (${PR.counts[f]})`)))}.</p>`) : ""}
        ${waiting ? `<section class="ap-sect" data-a><h3>Needs more logs</h3><p>Florin checks a food once you've logged it 5 times.</p><div class="ap-waits">${waiting}</div></section>` : ""}
        <section class="ap-sect ap-sect--proof" data-a><h3>How a pattern makes the list</h3><p>It has to hold 5 or more times, most of the time, and far more often than on other days. Florin checks every food you log against every morning after, so the bar is high on purpose: chance alone would name a food now and then.</p>
          <div class="ap-sure"><span class="${PR.found.length ? "" : "is-on"}"><b>Needs more logs</b><em>Under 5 times</em></span><span class="${PR.found.some((p) => p.tier.k === 2) ? "is-on" : ""}"><b>Showing up often</b><em>5 or more, most of the time</em></span><span class="${PR.found.some((p) => p.tier.k === 3) ? "is-on" : ""}"><b>Consistent</b><em>8 or more, nearly every time</em></span></div>
        </section>
        ${askBtn("pat")}`);
    }

    if (k.indexOf("pattern:") === 0) {
      const id = k.slice(8);
      const PR = L.patterns(M, mode);
      const p = PR.found.find((x) => x.id === id) || PR.tests.find((x) => x.id === id);
      if (!p) return page(M, V, st, "Possible pattern", `<div class="ap-dhero" data-a><span class="ap-k">Possible pattern</span><h2 class="ap-idt-h">This pattern isn't showing any more</h2><p class="ap-idt-lede">Your logs changed, and it no longer clears the bar.</p></div>`);
      const shown = p.show;
      /* late dinners keep the two-group strip of first BM times; a food's 90 days of mornings don't fit a phone's width,
         so its table lists every day instead */
      let chart = "";
      if (p.kind === "late") {
        const dom = morningDomain(p.occ.map((o) => ({ first: o.v })).concat(p.oth.map((o) => ({ first: o.v }))), u);
        chart = fig("First BM after each dinner", `Your usual window ${winText(u)}`, strip({ domain: dom, band: [u.tLo, u.tHi], ticks: Array.from({ length: dom[1] - dom[0] + 1 }, (_, i) => ({ v: dom[0] + i, label: hourLbl(dom[0] + i, i === 0 || i === dom[1] - dom[0]) })), groups: [
          { label: patCond(p), vals: p.occ.map((o) => ({ v: o.v, shift: o.v < u.tLo || o.v > u.tHi, tip: `${short(o.d)} · first BM ${T(o.v)}` })), median: Ut.median(p.occ.map((o) => o.v)), medLabel: T(Ut.median(p.occ.map((o) => o.v))) },
          { label: patOther(p), dim: true, vals: p.oth.map((o) => ({ v: o.v, shift: o.v < u.tLo || o.v > u.tHi, tip: `${short(o.d)} · first BM ${T(o.v)}` })), median: Ut.median(p.oth.map((o) => o.v)), medLabel: T(Ut.median(p.oth.map((o) => o.v))) }
        ], aria: "First BM times after dinners past 8 PM and after earlier dinners" }), `${lg("", "In your usual window")}${lg("sw--shift", "Outside your usual window")}`);
      }
      const what = p.kind === "late" ? `a first BM after ${T(u.tHi)}` : p.kind === "loose" ? `a first BM ${looseText(mode)}` : "bloating logged";
      const tryLine = p.kind === "late" ? "To see whether it holds for you, try a few evenings with dinner before 8 PM and compare the mornings after. One change at a time shows what matters." : `To see whether it holds, keep logging ${lower1(foodName(p.food)[0])} as you usually would, with a word on when you had it and how much. Florin keeps checking as more days come in.`;
      return page(M, V, st, "Possible pattern", `
        <div class="ap-dhero ap-dhero--pat" data-a><span class="ap-pat-ic ap-pat-ic--lg">${icon(p.kind === "late" ? "moon" : "meal")}</span><span class="ap-k">Possible pattern · last ${L.PATTERN_DAYS} days</span><h2 class="ap-pat-title">${esc(patTitle(p))}</h2><div class="ap-chips">${shown ? meter(p.tier.k, p.tier.label) : chip("Below the bar", "plain")}${chip(`${p.hit} of ${p.n} times`, "plain")}</div></div>
        ${fig(`How often ${what} followed`, "", patShares(p))}
        ${chart}
        ${sect("What Florin noticed", `<p>${esc(patLine(M, p, mode))}</p>`)}
        <section class="ap-sect ap-sect--proof" data-a><h3>Seen together, not proof</h3><p>Patterns show what tends to happen together in your logs. They don't prove one thing causes another, and other things you didn't log may be part of it.</p>
          <div class="ap-sure"><span><b>Needs more logs</b><em>Under 5 times</em></span><span class="${shown && p.tier.k === 2 ? "is-on" : ""}"><b>Showing up often</b><em>5 or more, most of the time</em></span><span class="${shown && p.tier.k === 3 ? "is-on" : ""}"><b>Consistent</b><em>8 or more, nearly every time</em></span></div>
        </section>
        ${sect("What you could try", `<p>${esc(tryLine)}</p>`, "ap-sect--try")}
        ${sect("Where this comes from", `<p>${esc(p.kind === "late" ? "Dinner times you logged, and the first BM you logged the next morning." : p.kind === "loose" ? "Meals you logged, and the first BM you logged the next morning." : "Meals you logged, and the symptoms you logged the next day.")}</p>`)}
        ${askBtn(`pattern:${p.id}`)}
        ${tableOf([p.kind === "late" ? "Dinner" : "Day before", "Next day", "Followed"], p.occ.slice().reverse().map((o) => [short(o.d - 1), p.kind === "late" ? `First BM ${T(o.v)}` : p.kind === "loose" ? L.formName(o.v, mode) : o.v != null ? `Bloating, ${sWord(o.v)}` : "No bloating", o.hit ? "Yes" : "No"]))}`);
    }
    return page(M, V, st, "Insights", "");
  };

  /* ============================== ASK FLORIN: THE HAND-OFF ==============================
     Ask about this opens the Ask tab with that card's numbers loaded and three questions to start. A question is offered
     only when the logs have something for it (looser BMs to ask about, busier days), else a neutral one. The chat
     itself is refresh-ask.js; RU.cardChart gives it the card's own chart */
  RU.askContext = (M, V, ctx) => {
    if (!ctx) return null;
    const mode = V.form, u = M.usual, n = u ? ctx.range : 7, k = ctx.k;
    const F = L.span(M, n, mode), rn = u ? RANGE_NAME[n].toLowerCase() : "so far";
    /* while Florin is learning: the day it's on; with nothing counted yet, questions about getting started, never ones
       that assume weeks of logs */
    const dayN = `Day ${L.learnDay(M)} of ${L.LEARN_DAYS}`;
    const START = ["What should I log, and when?", "How does Florin learn my usual?", "When should I talk to a clinician?"];
    if (k === "score") {
      const SC = scoreOf(M, mode);
      if (!SC) return { title: "FloraScore", facts: [`Starts on day ${L.LEARN_DAYS}`, `Day ${L.learnDay(M)} so far`], qs: ["How is FloraScore worked out?", "What do I need to log?", `Why does it wait ${L.LEARN_DAYS} days?`] };
      const tops = SC.mv ? topParts(SC.mv) : null;
      return { title: "FloraScore · today", facts: [SC.v == null ? "Not scored today" : `Today ${SC.v}, ${lower1(SC.rel)}`, `Your usual range ${SC.su[0]} to ${SC.su[1]}`, !tops ? "Not enough weeks to compare" : tops.length ? lower1(movedMost(SC.mv)).replace(/^./, (c) => c.toUpperCase()).replace(/\.$/, "") : "No one part moved it this week"], qs: ["What moved my FloraScore this week?", "How is FloraScore worked out?", "What could I try this week?"] };
    }
    if (k === "timing") {
      const tm = timingOf(M, F), any = tm.mornings.length > 0;
      const sp = L.patterns(M, mode).sparse;
      if (u) return { title: `Timing · ${rn}`, facts: any ? [`Your usual window: ${winText(u)}`, `First BM in it on ${tm.inW} of ${plural(tm.read.length, "day")}`, tm.later.length ? (sp ? `${plural(tm.later.length, "morning")} later than your window` : `${tm.laterAfterLate} of ${plural(tm.later.length, "later morning")} came after a dinner past 8 PM`) : "No later mornings"] : [`Your usual window: ${winText(u)}`, "No first BM logged in this stretch"], qs: [tm.later.length ? "Why do some mornings run later?" : tm.earlier.length ? "Why do some mornings run earlier?" : "How has my timing been?", "What sets my usual window?", "What could I try this week?"] };
      return { title: `Timing · ${rn}`, facts: any ? [dayN, `First BM logged on ${plural(tm.mornings.length, "day")}, ${timesText(tm)}`] : [dayN, "No BMs logged yet"], qs: any ? ["What sets my usual window?", `Why does Florin wait ${L.LEARN_DAYS} days?`, "What should I log, and when?"] : START };
    }
    if (k === "often") {
      const of = oftenOf(M, F), any = of.known.length > 0;
      if (u) return { title: `How often · ${rn}`, facts: any ? [`Your usual: ${u.nLo} to ${u.nHi} a day`, `${of.avg != null ? of.avg.toFixed(1) : 0} a day on average`, `A usual count on ${of.inC} of ${plural(of.read.length, "day")}`] : [`Your usual: ${u.nLo} to ${u.nHi} a day`, "No BMs logged in this stretch"], qs: [of.busy > 0 ? "What made my busier days different?" : "How often do I go?", "Why does a gap not count as zero?", "How is my usual worked out?"] };
      return { title: `How often · ${rn}`, facts: any ? [dayN, `${plural(of.total, "BM")} over ${plural(of.known.length, "day")}`] : [dayN, "No BMs logged yet"], qs: any ? ["How is my usual worked out?", "Why does a gap not count as zero?", "What should I log, and when?"] : START };
    }
    if (k === "form") {
      const fm = formOf(M, F, mode), any = fm.bms.length > 0;
      if (u) return { title: `Form · ${rn}`, facts: any ? [`Your usual: ${L.usualFormsText(M, mode)}`, `${fm.inF} of ${plural(fm.bms.length - fm.unsure, "BM")} in your usual forms`, fm.top ? `Most common: ${fm.top.label}` : "No BMs yet"] : [`Your usual: ${L.usualFormsText(M, mode)}`, "No BMs logged in this stretch"], qs: ["What do the forms mean?", fm.looser > 0 ? "Why were some BMs looser?" : fm.firmer > 0 ? "Why were some BMs firmer?" : "How is my usual worked out?", "When should I mention a change to a clinician?"] };
      return { title: `Form · ${rn}`, facts: any ? [dayN, `${plural(fm.bms.length, "BM")} so far${fm.top ? `, ${formsSaid(fm)}` : ""}`] : [dayN, "No BMs logged yet"], qs: any ? ["What do the forms mean?", "How does Florin learn my usual?", "When should I mention a change to a clinician?"] : START };
    }
    if (k === "sym") {
      const sy = symOf(M, F);
      if (!u && !sy.logged.length) return { title: `Symptoms · ${rn}`, facts: [dayN, "Nothing logged yet"], qs: ["How do I log symptoms well?", "How does Florin learn my usual?", "When should I talk to a clinician?"] };
      return { title: `Symptoms · ${rn}`, facts: [u ? `Your usual: ${lower1(symUsualText(u))}` : dayN, sy.logged.length ? `Symptoms on ${sy.withSym.length} of ${plural(sy.logged.length, "day")} you logged` : "No days logged in this stretch", sy.rows.length ? L.symLine(F, { named: n <= 7 }) : "None logged"], qs: [sy.rows.length ? `What tends to come before my ${sy.rows[0].name.toLowerCase()}?` : "What should I note when a symptom comes up?", "When should I talk to a clinician?", "How do I log symptoms well?"] };
    }
    if (k === "ck" && !RU.ckOn(V)) return null;
    if (k === "ck") { const K = ckOf(M); return { title: "Weekly check-in", facts: K.b ? [ckHead(K), `Compared with ${RU.spanText(K.done[0].ws, K.done[2].ws + 6)}`, `${plural(K.done.length + (K.cur ? 1 : 0), "check-in")} so far`] : ["Your first check-ins set your starting point"], qs: ["What changed since I started?", "How is my starting point set?", "What should I note this week?"] }; }
    if (k === "pat") { const PR = L.patterns(M, mode); return { title: `Possible patterns · last ${L.PATTERN_DAYS} days`, facts: PR.found.length ? PR.found.slice(0, 3).map((p) => `${patTitle(p)}: ${p.hit} of ${p.n} times`) : ["Nothing stands out yet"], qs: ["How sure are these patterns?", "How do I test one?", "Why does a food need 5 logs?"] }; }
    if (k.indexOf("pattern:") === 0) { const PR = L.patterns(M, mode); const p = PR.tests.find((x) => x.id === k.slice(8)); if (p) return { title: patTitle(p), facts: [`${p.hit} of ${p.n} times`, `${p.oh} of ${p.on} otherwise`, p.show ? p.tier.label : "Below the bar"], qs: ["How sure is this pattern?", "How do I test it?", "What else could be part of it?"] }; }
    return null;
  };

  /* Ask Florin on the free plan: what it is and what to ask, with the way in. No sample answer: it would be made up */
  RU.askFree = (M, V) => {
    const qs = ["What changed this week?", "What tends to come before my rougher days?", "How do I bring my logs to a clinician?"];
    return `<div class="ap-scr ap-ask">
      <header class="ap-hist-top" data-a><h1 class="ap-h1" tabindex="-1">Ask Florin</h1><p class="ap-hi-sub">Answers from your own logs.</p></header>
      <section class="ap-card ap-askc ap-askc--lock" data-a>
        <span class="ap-k">Florin membership</span>
        <b>Ask about your own numbers</b>
        <p class="ap-askc-note">Ask Florin reads your logs, your FloraScore and your patterns, and answers in plain words. Every Insights card can open it with its numbers loaded. It isn't a clinician, and it sends anything worrying to primary care.</p>
        <button type="button" class="ap-btn ap-btn--block" data-act="pay" data-pay="ask">See Florin membership</button>
      </section>
      <div class="ap-asks" data-a><span class="ap-k">What people ask</span>${qs.map((q) => `<button type="button" class="ap-askq" data-act="pay" data-pay="ask">${icon("lock")}${esc(q)}</button>`).join("")}</div>
      ${fine(DISC)}
    </div>`;
  };

  /* ---------- the paywall: Florin membership ----------
     What membership adds, said plainly, from wherever the person tapped. No hype, no countdowns, no made-up price. The
     FloraScore glyph names it: a plain circle with no value (a ring filled to a typed number would be made up) */
  const PAY_TITLE = { score: "See what moves your FloraScore", range: "See 30 and 90 days", pat: "See your possible patterns", ask: "Ask Florin about your own numbers", report: "Bring your logs to a clinician", food: "Run a 14-day food check" };
  RU.paywall = (M, V, st) => {
    const id = `pay${V.uid}`, from = st.from || "";
    const title = PAY_TITLE[from] || "See the detail behind every card";
    const rows = [
      ["ring", "Why your FloraScore moved", "The four parts, week by week, and what to try"],
      ["bars", "30 and 90 days on every card", "And the detail page behind each one"],
      ["pat", "Possible patterns", `From what you eat and when, with a ${L.FOOD_CHECK_DAYS}-day food check`],
      ["chat", "Ask Florin", "With your own numbers loaded"],
      ["report", "A report for your clinician", "Your logs, so you don't have to remember dates"]
    ];
    return `<div class="ap-psh ap-pay" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      <div class="ap-psh-h"><span class="ap-fsh-sp"></span><button type="button" class="ap-lg-x" data-act="close" aria-label="Not now">${RU.icon("close")}</button></div>
      <div class="ap-pay-hero">
        <span class="ap-pay-ring" aria-hidden="true">${C.ring({ glyph: true, size: 56, stroke: 3 })}</span>
        <span class="ap-k ap-k--ray">Florin membership</span>
        <h2 id="${id}-h" tabindex="-1" data-autofocus>${esc(title)}</h2>
        <p>${RU.ckOn(V) ? "Logging, Today, your FloraScore, the weekly check-in and 7 days of Insights stay free." : "Logging, Today, your FloraScore and 7 days of Insights stay free."} Membership adds the explaining.</p>
      </div>
      <ul class="ap-pay-list">${rows.map(([ic2, b, e], i) => `<li style="--i:${i}"><span class="ap-pay-ic">${ic2 === "ring" ? glyph(18) : icon(ic2)}</span><span><b>${esc(b)}</b><em>${esc(e)}</em></span></li>`).join("")}</ul>
      <p class="ap-pay-price">Membership price set at launch</p>
      <div class="ap-pay-act"><button type="button" class="ap-btn ap-btn--block" data-act="pay-start">Start membership</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">Not now</button></div>
      ${fine(DISC)}
    </div>`;
  };

  RU.ask = (M, V, ctx) => {
    if (V.plan === "free") return RU.askFree(M, V);
    const c = RU.askContext(M, V, ctx);
    /* before Florin knows the person's usual (day 1 to 13), the starting questions are about getting started */
    const qs = c ? c.qs : M.usual ? ["What changed this week?", "What tends to come before my rougher days?", "How do I bring my logs to a clinician?"] : ["What should I log, and when?", "How does Florin learn my usual?", "When should I talk to a clinician?"];
    const soon = "Answers come in the next pass, with the coach test bench rules: answer first, one bold question per turn.";
    return `<div class="ap-scr ap-ask">
      <header class="ap-hist-top" data-a><h1 class="ap-h1" tabindex="-1">Ask Florin</h1><p class="ap-hi-sub">Answers from your own logs.</p></header>
      ${c ? `<section class="ap-card ap-askc" data-a>
          <div class="ap-askc-h"><span class="ap-k">Asking about</span><button type="button" class="ap-askc-x" data-act="ask-clear" aria-label="Clear">${RU.icon("close")}</button></div>
          <b>${esc(c.title)}</b>
          <ul>${c.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <p class="ap-askc-note">Loaded from the chart, so the chat starts from the same numbers.</p>
        </section>` : `<section class="ap-card ap-askc ap-askc--intro" data-a><b>Ask about your logs</b><p class="ap-askc-note">Or tap Ask about this on any Insights card, and the chat opens with that card's numbers loaded.</p></section>`}
      <div class="ap-asks" data-a><span class="ap-k">Try asking</span>${qs.map((q) => `<button type="button" class="ap-askq" data-act="toast" data-msg="${esc(soon)}">${esc(q)}</button>`).join("")}</div>
      <div class="ap-askbar" data-a><span class="ap-askbar-in">Ask anything about your logs</span><button type="button" class="ap-askbar-b" data-act="toast" data-msg="${esc(soon)}" aria-label="Send">${icon("send")}</button></div>
      ${fine("Ask Florin answers from your logs and general guidance. It isn't a clinician. " + DISC)}
    </div>`;
  };

  /* the core's own screens, for the phone to fall back to when a module's wrapper throws (refresh-ui.js has the rest) */
  RU.core = Object.assign(RU.core || {}, { insights: RU.insights, idetail: RU.idetail, ask: RU.ask, paywall: RU.paywall });
})();
