/* Florin app refresh: Insights, from manual logs. A summary, one card per question (timing, how often, form,
   symptoms, the weekly check-in, possible patterns), a detail page behind each card, and the hand-off to Ask Florin.
   Charts follow the data vis board (board-dataviz.html): your usual as a named Plum band, Gold for a shift either
   way, the newest point ringed and labelled, gaps left as gaps, quiet axes, a title that says the answer.
   The drawing functions are the board's (dvMorning, dvBars, dvHist, dvFelt, dvStrip, countDots), ported to logs.
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
  const pctOf = (a, b) => Math.round((a / Math.max(1, b)) * 100);
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
  const join = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const joinMore = (a, max) => (a.length <= max ? join(a) : `${a.slice(0, max).join(", ")} and ${a.length - max} more`);
  const svg = (w, h, body, o = {}) => `<svg class="c-chart dv-chart${o.cls ? " " + o.cls : ""}" viewBox="0 0 ${n1(w)} ${n1(h)}" role="img" aria-label="${esc(o.aria || "")}">${body}</svg>`;
  const hourLbl = (h, end) => (end ? T(h, { short: true }) : String(h % 12 === 0 ? 12 : h % 12));
  const tip = (t) => `<title>${esc(t)}</title>`;
  const lg = (sw, text) => `<span><i class="sw ${sw}"></i>${esc(text)}</span>`;
  /* a symptom's strength in words; 0 is a symptom logged without one */
  const sWord = (s) => (s ? L.STRENGTH[s - 1].toLowerCase() : "strength not said");
  const has = (f, name) => f.sym[name] != null;
  /* the bars' legend, from the bars themselves: only what's drawn gets named */
  const barLegend = (vals, u, shiftText) => `${lg("sw--bar", "BMs")}${u ? lg("sw--band", "Your usual") : ""}${vals.some((v) => v.shift && v.v > 0) ? lg("sw--shift sw--bar", shiftText) : ""}${vals.some((v) => v.v === 0) ? lg("sw--zero", "No BM") : ""}${vals.some((v) => v.gap) ? lg("sw--nock", "Not logged") : ""}`;

  /* icons the refresh adds to the studio's set */
  const IC = {
    moon: '<path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5 6.5 6.5 0 1 0 15.5 12.6z"/>',
    pat: '<circle cx="5.5" cy="14" r="2.3"/><circle cx="14.5" cy="6" r="2.3"/><path d="M7.3 12.4l5.4-4.8"/>',
    send: '<path d="M10 16V4.5M5 9.5l5-5 5 5"/>'
  };
  const icon = (k, cls = "") => (IC[k] ? `<svg class="ic ${cls}" viewBox="0 0 20 20" aria-hidden="true">${IC[k]}</svg>` : RU.icon(k, cls));

  const RANGE_NAME = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" };
  const d0Of = (M, n) => Math.max(M.start, TODAY - n + 1);
  const spanOf = (M, n) => RU.spanText(d0Of(M, n), TODAY);
  /* three ticks: the first day, the middle and Today (seven days: every day) */
  const ticks = (F) => {
    const n = F.length;
    if (n <= 7) return F.map((f, i) => ({ i, label: f.today ? "Today" : Ut.DOW[f.dow], anchor: i === 0 ? "start" : i === n - 1 ? "end" : "middle" }));
    return [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => ({ i, label: i === n - 1 ? "Today" : short(F[i].d), anchor: k === 0 ? "start" : k === 2 ? "end" : "middle" }));
  };
  const rangeTabs = (n) => `<div class="ap-seg ap-seg--range" role="group" aria-label="Time range">${L.RANGES.map((v) => `<button type="button" data-act="irange" data-v="${v}" aria-pressed="${n === v}">${v}D</button>`).join("")}</div>`;

  /* ============================== DRAWINGS ============================== */

  /* Morning strip: one dot per morning's first BM on a straight time axis, stacked in 10-minute columns, oldest
     at the bottom. Your usual window is the band; a morning outside it is Gold; the newest is ringed and labelled.
     The bracket under the axis names the window when the card's title doesn't. */
  function morning(o) {
    const w = o.w || 318, left = 10, right = 10;
    const r = o.r || 4.2, step = r * 2 + (o.gap != null ? o.gap : 1.6);
    const lo = o.domain[0], hi = o.domain[1], bin = 1 / 6, nb = Math.round((hi - lo) / bin);
    const x = lin(lo, hi, left, w - right);
    const u = o.usual;
    const days = o.days.filter((f) => f.first != null);
    const newest = days[days.length - 1];
    const cols = {};
    days.forEach((f) => { const k = Math.max(0, Math.min(nb - 1, Math.floor((f.first - lo) / bin))); (cols[k] = cols[k] || []).push(f); });
    const maxStack = Math.max(3, ...Object.values(cols).map((c) => c.length));
    const top = 22, base = top + maxStack * step + 4;
    const cx = (k) => x(lo + (k + 0.5) * bin);
    let g = "", marks = "", labels = "", np = null;
    if (u) g += `<rect class="c-band dv-bandbox" x="${n1(x(u.tLo))}" y="${top - 4}" width="${n1(x(u.tHi) - x(u.tLo))}" height="${n1(base - top + 4)}" rx="4"/>`;
    Object.keys(cols).forEach((k) => cols[k].forEach((f, j) => {
      const px = cx(+k), py = base - 2 - r - j * step, isNew = f === newest;
      marks += `<circle class="dv-dot${u && !f.inWin ? " is-shift" : ""}${isNew ? " is-new" : ""}" cx="${n1(px)}" cy="${n1(py)}" r="${n1(isNew ? r + 0.4 : r)}">${tip(`${short(f.d)} · first BM ${T(f.first)}`)}</circle>`;
      if (isNew) np = { px, py };
    }));
    if (np && o.label !== false) {
      const txt = `${newest.today ? "Today" : dayShort(newest.d)} ${T(newest.first)}`, lw = tw(txt, 11);
      let ax = np.px, anchor = "middle";
      if (ax - lw / 2 < 2) { ax = 2; anchor = "start"; } else if (ax + lw / 2 > w - 2) { ax = w - 2; anchor = "end"; }
      const x0 = anchor === "middle" ? ax - lw / 2 : anchor === "start" ? ax : ax - lw, x1 = x0 + lw;
      let tallest = 0;
      Object.keys(cols).forEach((k) => { const c = cx(+k); if (c + r >= x0 - 2 && c - r <= x1 + 2) tallest = Math.max(tallest, cols[k].length); });
      const ly = Math.min(np.py - r - 7, base - 2 - (tallest - 1) * step - 2 * r - 6);
      labels += `<text class="dv-newlbl" x="${n1(ax)}" y="${n1(Math.max(10, ly))}" text-anchor="${anchor}">${esc(txt)}</text>`;
    }
    g += `<line class="dv-base" x1="${left}" x2="${w - right}" y1="${n1(base)}" y2="${n1(base)}"/>`;
    for (let h = Math.ceil(lo); h <= Math.floor(hi); h++) {
      g += `<line class="dv-tick" x1="${n1(x(h))}" x2="${n1(x(h))}" y1="${n1(base)}" y2="${n1(base + 4)}"/>`;
      labels += `<text class="dv-ax" x="${n1(x(h))}" y="${n1(base + 15)}" text-anchor="${h === lo ? "start" : h === hi ? "end" : "middle"}">${esc(hourLbl(h, h === Math.ceil(lo) || h === Math.floor(hi)))}</text>`;
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
  const morningDomain = (F, u) => {
    const ts = F.filter((f) => f.first != null).map((f) => f.first).concat(u ? [u.tLo, u.tHi] : []);
    if (!ts.length) return [6, 10];
    return [Math.max(4, Math.min(6, Math.floor(Math.min(...ts)))), Math.min(16, Math.max(10, Math.ceil(Math.max(...ts) + 0.01)))];
  };

  /* Bars from zero over your usual. A day outside your usual is Gold; a day logged as No BM gets a Gold ring on the
     baseline; a day with nothing logged gets a faint column, so a gap never reads as a zero. */
  function bars(o) {
    const w = o.w || 318, top = o.top != null ? o.top : 18, left = o.left != null ? o.left : 20, right = 8, plotH = o.h || 92, axisH = 20;
    const n = o.values.length, H = top + plotH + axisH;
    const slot = (w - left - right) / n, bw = Math.min(22, Math.max(2.4, slot * 0.62)), r = Math.min(3, bw / 2);
    const y = lin(0, o.yMax, top + plotH, top), base = top + plotH, xc = (i) => left + slot * i + slot / 2;
    let g = "", marks = "", labels = "";
    const boxes = [];
    (o.yTicks || []).forEach((v) => {
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
      labels += `<text class="dv-ax" x="${left - 6}" y="${n1(y(v) + 3.5)}" text-anchor="end">${esc(o.yFmt ? o.yFmt(v) : v)}</text>`;
    });
    if (o.band) {
      const bt = y(o.band[1]), bb = y(o.band[0]);
      g += `<rect class="c-band" x="${left}" y="${n1(bt)}" width="${w - left - right}" height="${n1(bb - bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bt)}" y2="${n1(bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bb)}" y2="${n1(bb)}"/>`;
    }
    let lastI = -1;
    o.values.forEach((b, i) => { if (!b.gap && b.v != null) lastI = i; });
    o.values.forEach((b, i) => {
      const cx = xc(i);
      if (b.gap) { const pad = Math.min(1, slot * 0.15); g += `<rect class="dv-nock" x="${n1(left + slot * i + pad)}" y="${top}" width="${n1(Math.max(1, slot - 2 * pad))}" height="${plotH}" rx="${slot > 6 ? 2 : 1}">${b.tip ? tip(b.tip) : ""}</rect>`; return; }
      if (b.v == null) return;
      if (b.v > 0) {
        const yt = y(Math.min(o.yMax, b.v)), x0 = cx - bw / 2, x1 = cx + bw / 2, rr = Math.min(r, (base - yt) / 2);
        marks += `<path class="dv-bar${b.shift ? " is-shift" : ""}" d="M${n1(x0)},${n1(base)}V${n1(yt + rr)}A${n1(rr)},${n1(rr)} 0 0 1 ${n1(x0 + rr)},${n1(yt)}H${n1(x1 - rr)}A${n1(rr)},${n1(rr)} 0 0 1 ${n1(x1)},${n1(yt + rr)}V${n1(base)}Z">${b.tip ? tip(b.tip) : ""}</path>`;
        boxes.push([x0 - 1, x1 + 1, yt, base]);
        if (o.labels) { labels += `<text class="dv-val" x="${n1(cx)}" y="${n1(yt - 5)}" text-anchor="middle">${esc(b.label != null ? b.label : b.v)}</text>`; boxes.push([cx - 10, cx + 10, yt - 16, yt - 2]); }
        else if (o.labelLast && i === lastI) {
          /* the newest bar's value, set above whichever bars it spans, ending on its bar */
          const txt = String(b.label != null ? b.label : b.v), lw = tw(txt, 11), x0 = i === n - 1 ? cx - lw : cx - lw / 2;
          const over = o.values.map((v, j) => (v.v > 0 && xc(j) + bw / 2 >= x0 && xc(j) - bw / 2 <= x0 + lw ? y(Math.min(o.yMax, v.v)) : base)).reduce((a, v) => Math.min(a, v), yt);
          labels += `<text class="dv-newlbl" x="${n1(i === n - 1 ? cx + bw / 2 : cx)}" y="${n1(over - 5)}" text-anchor="${i === n - 1 ? "end" : "middle"}">${esc(txt)}</text>`;
          boxes.push([x0 - 2, x0 + lw + 2, over - 16, over - 2]);
        }
      } else {
        marks += `<circle class="dv-zero" cx="${n1(cx)}" cy="${n1(base - 4.2)}" r="${Math.min(3.2, slot / 2 - 0.4)}">${b.tip ? tip(b.tip) : ""}</circle>`;
        boxes.push([cx - 5, cx + 5, base - 9, base]);
      }
    });
    if (o.band && o.bandLabel) {
      const lw = tw(o.bandLabel, 10.5), bt = y(o.band[1]);
      const cands = [{ x: w - right - 2, y: bt - 6, a: "end" }, { x: left + 4, y: bt - 6, a: "start" }, { x: w - right - 2, y: top - 6, a: "end" }, { x: left + 4, y: top - 6, a: "start" }]
        .map((c) => Object.assign(c, { x0: c.a === "end" ? c.x - lw : c.x, x1: c.a === "end" ? c.x : c.x + lw }));
      const c = cands.find((q) => q.y - 11 >= 0 && !boxes.some((b) => b[0] < q.x1 + 3 && b[1] > q.x0 - 3 && b[2] < q.y + 3 && b[3] > q.y - 11));
      if (c) labels += `<text class="dv-bandlbl" x="${n1(c.x)}" y="${n1(c.y)}" text-anchor="${c.a}">${esc(o.bandLabel)}</text>`;
    }
    g += `<line class="dv-base" x1="${left}" x2="${w - right}" y1="${base}" y2="${base}"/>`;
    /* up to two weeks of bars, a label sits under its bar; past that, the end labels align with the plot's edges */
    (o.xTicks || []).forEach((t) => { labels += `<text class="dv-ax" x="${n1(n <= 14 || t.anchor === "middle" || !t.anchor ? xc(t.i) : t.anchor === "start" ? left + slot * t.i : left + slot * (t.i + 1))}" y="${base + 15}" text-anchor="${n <= 7 ? "middle" : t.anchor || "middle"}">${esc(t.label)}</text>`; });
    return svg(w, H, g + marks + labels, o);
  }

  /* Histogram with your usual as a bracket under the axis, so its name never runs into a bar's label. Bins outside
     your usual are muted; with no usual yet, every bin is the reading. */
  function hist(o) {
    const w = o.w || 318, top = 18, left = 4, right = 4, plotH = o.h || 72;
    const n = o.bins.length, slot = (w - left - right) / n, bw = Math.min(40, slot - 8);
    const max = Math.max(1, ...o.bins.map((b) => b.count)), total = o.bins.reduce((s, b) => s + b.count, 0) || 1;
    const y = lin(0, max, top + plotH, top + 4), base = top + plotH;
    let g = "", marks = "", labels = "";
    o.bins.forEach((b, i) => {
      const cx = left + slot * i + slot / 2;
      if (b.count) {
        const yt = y(b.count), x0 = cx - bw / 2, x1 = cx + bw / 2, r = Math.min(3, (base - yt) / 2);
        marks += `<path class="dv-bar${b.inUsual === false ? " is-out" : ""}" d="M${n1(x0)},${base}V${n1(yt + r)}A${r},${r} 0 0 1 ${n1(x0 + r)},${n1(yt)}H${n1(x1 - r)}A${r},${r} 0 0 1 ${n1(x1)},${n1(yt + r)}V${base}Z">${tip(`${b.label}: ${plural(b.count, "BM")}, ${pctOf(b.count, total)}%`)}</path>`;
        labels += `<text class="dv-val" x="${n1(cx)}" y="${n1(yt - 5)}" text-anchor="middle">${pctOf(b.count, total)}%</text>`;
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

  /* Symptom dot rows: a dot only on the days a symptom came up (bigger and darker is stronger), a faint column for
     days with nothing logged, the count under each name. Context goes in Teal rows under the axis. */
  function symRows(o) {
    const w = o.w || 318, left = 86, right = 4, top = 4, rowH = 30;
    const F = o.days, n = F.length, cw = (w - left - right) / n;
    const rMax = Math.min(4.4, Math.max(1.6, cw * 0.55)), R = [0, rMax * 0.72, rMax * 0.86, rMax];
    const xm = (i) => left + cw * i + cw / 2;
    const rows = o.rows, bottom = top + rows.length * rowH;
    const ctx = o.ctx || [];
    let g = "", marks = "", labels = "";
    F.forEach((f, i) => { if (!f.logged && !f.pending) { const pad = Math.min(0.7, cw * 0.15); g += `<rect class="dv-nock" x="${n1(left + cw * i + pad)}" y="${top}" width="${n1(Math.max(1, cw - 2 * pad))}" height="${rows.length * rowH}" rx="${cw > 6 ? 2 : 1}">${tip(`${short(f.d)}: nothing logged`)}</rect>`; } });
    rows.forEach((row, ri) => {
      const cy = top + ri * rowH + rowH / 2;
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(cy)}" y2="${n1(cy)}"/>`;
      labels += `<text class="dv-rowlbl" x="0" y="${n1(cy - 3)}">${esc(row.name)}</text><text class="dv-ax" x="0" y="${n1(cy + 11)}">${esc(plural(row.n, "day"))}</text>`;
      F.forEach((f, i) => { if (!has(f, row.name)) return; const s = f.sym[row.name]; marks += `<circle class="dv-sym s${s || 1}" cx="${n1(xm(i))}" cy="${n1(cy)}" r="${n1(R[s || 1])}">${tip(`${short(f.d)} · ${row.name.toLowerCase()}, ${sWord(s)}`)}</circle>`; });
    });
    ticks(F).forEach((t) => { labels += `<text class="dv-ax" x="${n1(n <= 7 ? xm(t.i) : t.anchor === "start" ? left + cw * t.i : t.anchor === "end" ? left + cw * (t.i + 1) : xm(t.i))}" y="${bottom + 15}" text-anchor="${n <= 7 ? "middle" : t.anchor}">${esc(t.label)}</text>`; });
    ctx.forEach((row, ri) => {
      const yy = bottom + 22 + ri * 24;
      labels += `<text class="dv-ctxlbl" x="${left}" y="${yy + 8}">${esc(row.label)}</text>`;
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${yy + 16.5}" y2="${yy + 16.5}"/>`;
      marks += row.idx.map((i) => `<rect class="dv-ctx" x="${n1(xm(i) - Math.max(1, cw / 2 - 0.6))}" y="${yy + 12}" width="${n1(Math.max(2, cw - 1.2))}" height="9" rx="${cw > 6 ? 2 : 1}"/>`).join("");
    });
    return svg(w, bottom + 20 + ctx.length * 24 + (ctx.length ? 4 : 0), g + marks + labels, o);
  }

  /* Seven days of symptoms as cells, one Forest step per strength. */
  function symCells(o) {
    const w = o.w || 318, left = 86, right = 4, top = 4, rowH = 30;
    const F = o.days, n = F.length, cw = (w - left - right) / n, cs = Math.min(20, cw - 8);
    const rows = o.rows, bottom = top + rows.length * rowH;
    let g = "", marks = "", labels = "";
    F.forEach((f, i) => { if (!f.logged && !f.pending) g += `<rect class="dv-nock" x="${n1(left + cw * i + 2)}" y="${top}" width="${n1(cw - 4)}" height="${rows.length * rowH}" rx="4">${tip(`${short(f.d)}: nothing logged`)}</rect>`; });
    rows.forEach((row, ri) => {
      const cy = top + ri * rowH + rowH / 2;
      labels += `<text class="dv-rowlbl" x="0" y="${n1(cy - 3)}">${esc(row.name)}</text><text class="dv-ax" x="0" y="${n1(cy + 11)}">${esc(plural(row.n, "day"))}</text>`;
      F.forEach((f, i) => {
        const s = f.sym[row.name], cx = left + cw * i + cw / 2;
        if (s != null) marks += `<rect class="dv-cell s${s || 1}" x="${n1(cx - cs / 2)}" y="${n1(cy - cs / 2)}" width="${n1(cs)}" height="${n1(cs)}" rx="4">${tip(`${short(f.d)} · ${row.name.toLowerCase()}, ${sWord(s)}`)}</rect>`;
        else if (f.logged) marks += `<circle class="dv-cell-none" cx="${n1(cx)}" cy="${n1(cy)}" r="1.6"/>`;
      });
    });
    F.forEach((f, i) => { labels += `<text class="dv-ax" x="${n1(left + cw * i + cw / 2)}" y="${bottom + 15}" text-anchor="middle">${esc(f.today ? "Today" : Ut.DOW[f.dow])}</text>`; });
    return svg(w, bottom + 20, g + marks + labels, o);
  }

  /* Thirteen weeks of symptoms as cells: one Forest step for 1 day in the week, 2 or 3, 4 or more. */
  function symWeeks(o) {
    const w = o.w || 318, left = 86, right = 4, top = 4, rowH = 30;
    const Wk = o.weeks, n = Wk.length, cw = (w - left - right) / n, cs = Math.min(18, cw - 4);
    const rows = o.rows, bottom = top + rows.length * rowH;
    let g = "", marks = "", labels = "";
    Wk.forEach((wk, i) => { if (!wk.some((f) => f.logged)) g += `<rect class="dv-nock" x="${n1(left + cw * i + 1)}" y="${top}" width="${n1(cw - 2)}" height="${rows.length * rowH}" rx="3"/>`; });
    rows.forEach((row, ri) => {
      const cy = top + ri * rowH + rowH / 2;
      labels += `<text class="dv-rowlbl" x="0" y="${n1(cy - 3)}">${esc(row.name)}</text><text class="dv-ax" x="0" y="${n1(cy + 11)}">${esc(plural(row.n, "day"))}</text>`;
      Wk.forEach((wk, i) => {
        const logged = wk.filter((f) => f.logged), c = logged.filter((f) => has(f, row.name)).length, lv = !c ? 0 : c === 1 ? 1 : c <= 3 ? 2 : 3, cx = left + cw * i + cw / 2;
        if (lv) marks += `<rect class="dv-cell s${lv}" x="${n1(cx - cs / 2)}" y="${n1(cy - cs / 2)}" width="${n1(cs)}" height="${n1(cs)}" rx="4">${tip(`Week of ${short(wk[0].d)}: ${row.name.toLowerCase()} on ${plural(c, "day")}`)}</rect>`;
        else if (logged.length) marks += `<circle class="dv-cell-none" cx="${n1(cx)}" cy="${n1(cy)}" r="1.6"/>`;
      });
    });
    labels += `<text class="dv-ax" x="${n1(left + cw / 2 - cs / 2)}" y="${bottom + 15}">${esc(short(Wk[0][0].d))}</text><text class="dv-ax" x="${n1(w - right - cw / 2 + cs / 2)}" y="${bottom + 15}" text-anchor="end">This week</text>`;
    return svg(w, bottom + 20, g + marks + labels, o);
  }
  const symChart = (M, mode, F, n, rows, w) => (n <= 7 ? symCells({ w, days: F, rows, aria: "Symptoms by day" }) : n <= 30 ? symRows({ w, days: F, rows, aria: "Symptoms by day, last 30 days" }) : symWeeks({ w, weeks: weeksOf(M, mode), rows, aria: "Symptoms by week, last 13 weeks" }));
  const symLegend = (n, gaps) => `${n <= 7 ? `${lg("sw--c1", "Mild")}${lg("sw--c2", "Moderate")}${lg("sw--c3", "Strong")}` : n <= 30 ? `${lg("sw--sym1", "Mild")}${lg("sw--sym2", "Moderate")}${lg("sw--sym3", "Strong")}` : `${lg("sw--c1", "1 day a week")}${lg("sw--c2", "2 or 3")}${lg("sw--c3", "4 or more")}`}${gaps ? lg("sw--nock", "Not logged") : ""}`;

  /* Forms over time: one dot per BM, your usual forms as the band, a form outside it Gold, the newest ringed.
     B plots words; A and C plot steps. A word logged in B sits between the steps it covers, and when those steps
     fall on both sides of the usual it's a hollow dot, never Gold. */
  function formDots(o) {
    const B = o.mode === "B", Cw = o.mode === "C", u = o.usual;
    const w = o.w || 326, top = 20, left = B || Cw ? 50 : 26, right = 10, plotH = o.h || 120, axisH = 26;
    const F = o.days, n = F.length;
    const ctx = o.ctx || [];
    const lvl = (b) => (B ? L.wordKey(b) : Ut.mean(L.stepsOf(b)));
    const lo = B ? 0 : 1, hi = B ? 4 : 7;
    const x = lin(0, Math.max(1, n - 1), left + 4, w - right - 4), y = lin(lo - 0.5, hi + 0.5, top + plotH, top);
    const H = top + plotH + axisH + ctx.length * 24 + (ctx.length ? 4 : 0) - 6;
    let g = "", marks = "", labels = "";
    if (u) {
      const bl = B ? u.wLo : u.fLo, bh = B ? u.wHi : u.fHi, bt = y(bh + 0.5), bb = y(bl - 0.5);
      g += `<rect class="c-band" x="${left}" y="${n1(bt)}" width="${w - left - right}" height="${n1(bb - bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bt)}" y2="${n1(bt)}"/><line class="dv-band-edge" x1="${left}" x2="${w - right}" y1="${n1(bb)}" y2="${n1(bb)}"/>`;
    }
    (B ? [0, 2, 4] : [1, 4, 7]).forEach((v) => {
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
      labels += `<text class="dv-ax" x="${left - 6}" y="${n1(y(v) + 3.5)}" text-anchor="end">${esc(B ? L.WORDS[v].word : Cw ? L.TYPES[v].short : String(v))}</text>`;
    });
    let newest = null;
    F.forEach((f, i) => (o.firstOnly ? f.bms.slice(0, 1) : f.bms).forEach((b, j, arr) => {
      const px = x(i) + (arr.length > 1 ? (j - (arr.length - 1) / 2) * Math.min(3, (w - left - right) / Math.max(1, n) / 2) : 0);
      const st = u ? L.inForms({ usual: u }, b, o.mode) : true, out = st === false;
      newest = { px, py: y(lvl(b)), out, f, b };
      marks += `<circle class="dv-dot${out ? " is-shift" : st === null ? " is-maybe" : ""}" cx="${n1(px)}" cy="${n1(y(lvl(b)))}" r="${n <= 7 ? 4.4 : n <= 30 ? 3.4 : 2.6}">${tip(`${short(f.d)} · ${T(b.t)} · ${L.formName(b, o.mode)}${st === null ? ", could be either" : ""}`)}</circle>`;
    }));
    if (newest) {
      marks += `<circle class="dv-new${newest.out ? " is-shift" : ""}" cx="${n1(newest.px)}" cy="${n1(newest.py)}" r="${n <= 7 ? 5.4 : 4.6}"/>`;
      const txt = `${newest.f.today ? "Today" : dayShort(newest.f.d)} ${L.formName(newest.b, o.mode)}`;
      labels += `<text class="dv-newlbl" x="${n1(Math.min(w - right, newest.px + 4))}" y="${top - 8}" text-anchor="end">${esc(txt)}</text>`;
      g += `<line class="dv-lead" x1="${n1(newest.px)}" x2="${n1(newest.px)}" y1="${top - 4}" y2="${n1(newest.py - (n <= 7 ? 6 : 5.2))}"/>`;
    }
    ticks(F).forEach((t) => { labels += `<text class="dv-ax" x="${n1(x(t.i))}" y="${top + plotH + 15}" text-anchor="${n <= 7 ? "middle" : t.anchor}">${esc(t.label)}</text>`; });
    ctx.forEach((row, ri) => {
      const yy = top + plotH + axisH + ri * 24, cw = Math.max(2, (w - left - right - 8) / Math.max(1, n - 1) - 1.2);
      labels += `<text class="dv-ctxlbl" x="${left}" y="${yy + 8}">${esc(row.label)}</text>`;
      g += `<line class="dv-grid" x1="${left}" x2="${w - right}" y1="${yy + 16.5}" y2="${yy + 16.5}"/>`;
      marks += row.idx.map((i) => `<rect class="dv-ctx" x="${n1(x(i) - cw / 2)}" y="${yy + 12}" width="${n1(cw)}" height="9" rx="${cw > 6 ? 2 : 1}"/>`).join("");
    });
    return svg(w, H, g + marks + labels, o);
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
      if (o.band) g += `<rect class="c-band dv-bandbox" x="${n1(x(o.band[0]))}" y="${n1(d0)}" width="${n1(x(o.band[1]) - x(o.band[0]))}" height="${n1(d1 - d0)}" rx="4"/>`;
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

  /* Count dots: one per time a pattern's condition came up, filled when it held. */
  function countDots(hits, o = {}) {
    const r = o.r || 3.2, gap = o.gap != null ? o.gap : 2.4, d = r * 2 + gap;
    const per = o.per || hits.length, rows = Math.ceil(hits.length / per) || 1;
    const w = Math.min(hits.length, per) * d - gap + 2, h = rows * d - gap + 2;
    return `<svg class="dv-cdots" viewBox="0 0 ${n1(w)} ${n1(h)}" width="${n1(w)}" height="${n1(h)}" role="img" aria-label="${esc(o.aria || "")}">${hits.map((hit, i) => `<circle class="dv-cd ${hit ? "is-hit" : "is-miss"}" cx="${n1(1 + r + (i % per) * d)}" cy="${n1(1 + r + Math.floor(i / per) * d)}" r="${hit ? r : r - 0.6}"/>`).join("")}</svg>`;
  }

  /* the weekly check-in, one question, compact: dots on four steps, your first weeks as the band */
  function ckMini(M, qi, cur) {
    const weeks = M.checkins.concat(cur != null ? [{ w: 12, answers: Object.assign([], { [qi]: cur }) }] : []);
    const b = L.baseline(M);
    const W = 318, H = 30, left = 6, right = 6, top = 5, bot = 25;
    const X = (i) => +(left + 4 + (i / 12) * (W - left - right - 8)).toFixed(1);
    const Y = (v) => +(bot - (v / 3) * (bot - top)).toFixed(1);
    const answered = weeks.filter((c) => c.answers && c.answers[qi] != null);
    const last = answered[answered.length - 1];
    const band = b ? `<rect class="c-band" x="${left}" y="${n1(Y(b[qi].hi) - 4)}" width="${W - left - right}" height="${n1(Y(b[qi].lo) - Y(b[qi].hi) + 8)}" rx="4"/>` : "";
    const grid = [0, 3].map((v) => `<line class="ap-ckt-grid" x1="${left}" x2="${W - right}" y1="${Y(v)}" y2="${Y(v)}"/>`).join("");
    const dots = answered.map((c) => `<circle class="ap-ckt-dot${c === last ? " is-now" : ""}" cx="${X(c.w)}" cy="${Y(c.answers[qi])}" r="${c === last ? 4 : 2.6}">${tip(`${c.w === 12 ? "This week" : `Week of ${short(c.w * 7)}`}: ${L.CHECKIN[qi].opts[c.answers[qi]]}`)}</circle>`).join("");
    return `<svg class="ap-ckt ap-ckt--mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${L.CHECKIN[qi].label}, each week. The band is your first three weeks.`)}">${band}${grid}${dots}</svg>`;
  }

  /* ============================== READING THE LOGS ============================== */
  const timingOf = (M, F) => {
    const u = M.usual;
    const mornings = F.filter((f) => f.first != null);
    const later = u ? mornings.filter((f) => f.first > u.tHi) : [], earlier = u ? mornings.filter((f) => f.first < u.tLo) : [];
    const we = mornings.filter((f) => f.dow === 0 || f.dow === 6), wd = mornings.filter((f) => f.dow > 0 && f.dow < 6);
    return {
      mornings, later, earlier,
      inW: u ? mornings.filter((f) => f.inWin).length : null,
      laterAfterLate: later.filter((f) => L.lateDinner(M, f.d - 1)).length,
      med: mornings.length ? Ut.median(mornings.map((f) => f.first)) : null,
      weDiff: we.length >= 3 && wd.length >= 3 ? Ut.median(we.map((f) => f.first)) - Ut.median(wd.map((f) => f.first)) : null
    };
  };
  const oftenOf = (M, F) => {
    const known = F.filter((f) => f.count != null), u = M.usual;
    const total = known.reduce((s, f) => s + f.count, 0);
    return {
      known, total, avg: known.length ? total / known.length : null,
      inC: u ? known.filter((f) => f.inCount).length : null,
      zero: known.filter((f) => f.count === 0).length,
      busy: u ? known.filter((f) => f.count > u.nHi).length : 0,
      gaps: F.filter((f) => !f.logged && !f.pending).length,
      split: [0, 1, 2, 3].map((k) => known.filter((f) => (k === 3 ? f.count >= 3 : f.count === k)).length)
    };
  };
  /* the mix: B bins by word; A and C by step, and a word logged in B that covers two steps goes in neither (split) */
  const formOf = (M, F, mode) => {
    const u = M.usual, B = mode === "B";
    const bms = F.flatMap((f) => f.bms.map((b) => ({ f, b })));
    const one = (o) => L.stepsOf(o.b).length === 1;
    const bins = B ? L.WORDS.map((w) => ({ short: w.word, label: w.word, count: bms.filter((o) => L.wordKey(o.b) === w.k).length, inUsual: u ? w.k >= u.wLo && w.k <= u.wHi : null }))
      : L.TYPES.slice(1).map((t) => ({ short: mode === "C" ? t.short : String(t.k), label: mode === "C" ? t.short : `Type ${t.k}`, count: bms.filter((o) => one(o) && L.stepsOf(o.b)[0] === t.k).length, inUsual: u ? t.k >= u.fLo && t.k <= u.fHi : null }));
    const split = B ? [] : bms.filter((o) => !one(o));
    const top = bins.slice().sort((a, b) => b.count - a.count)[0];
    const st = u ? bms.map((o) => L.inForms(M, o.b, mode)) : [];
    const out = u ? bms.filter((o, i) => st[i] === false) : [];
    const unsure = st.filter((s) => s === null).length;
    const firmer = out.filter((o) => (B ? L.wordKey(o.b) < u.wLo : Math.max(...L.stepsOf(o.b)) < u.fLo)).length;
    return { bms, bins, split, top, out, unsure, firmer, looser: out.length - firmer, inF: u ? bms.length - out.length - unsure : null };
  };
  const formSplit = (fm) => (fm.split.length ? `${plural(fm.split.length, "BM")} logged as a word that covers two steps ${fm.split.length === 1 ? "isn't" : "aren't"} in the chart.` : "");
  const symOf = (M, F) => {
    const logged = F.filter((f) => f.logged), withSym = logged.filter((f) => f.nsym);
    const names = {};
    withSym.forEach((f) => Object.keys(f.sym).forEach((k) => (names[k] = (names[k] || 0) + 1)));
    const rows = Object.entries(names).sort((a, b) => b[1] - a[1] || L.SYMPTOMS.indexOf(a[0]) - L.SYMPTOMS.indexOf(b[0])).map(([name, n]) => ({ name, n }));
    const ss = withSym.flatMap((f) => Object.values(f.sym)).filter((s) => s > 0);
    /* the strength people logged most, as one word */
    const how = !ss.length ? "" : L.STRENGTH[Math.round(Ut.median(ss)) - 1].toLowerCase();
    return { logged, withSym, rows, how };
  };
  const symUsualText = (u) => (!u || !u.sym ? null : u.sym.every == null ? "Rarely" : u.sym.every <= 1 ? "Most days" : `About 1 day in ${u.sym.every}`);
  const trendWord = (c, p) => (c + 1 < p ? { text: "Less often", tone: "shift" } : c > p + 1 ? { text: "More often", tone: "shift" } : { text: "About the same", tone: "usual" });
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
  /* the 13 Monday to Sunday weeks since day 0 */
  const weeksOf = (M, mode) => Array.from({ length: 13 }, (_, i) => M.days.filter((x) => x.d >= i * 7 && x.d < i * 7 + 7).map((x) => L.facts(M, x, mode))).filter((wk) => wk.length);

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

  /* ============================== THE INSIGHTS TAB ============================== */
  const card = (V, o) => `<section class="ap-card ap-ic" data-a aria-labelledby="ic-${o.k}-${V.uid}">
      <button type="button" class="ap-ic-h" data-act="idetail" data-k="${o.k}">
        <span class="ap-ic-ic">${o.glyph || icon(o.icon)}</span>
        <span class="ap-ic-t"><span class="ap-k">${esc(o.kicker)}</span><b id="ic-${o.k}-${V.uid}">${esc(o.head)}</b></span>
        ${icon("chev", "ap-ic-go")}
      </button>
      ${o.sum ? `<p class="ap-ic-sum">${o.sum}</p>` : ""}
      ${o.body || ""}
      ${o.chart ? `<div class="ap-ic-fig">${o.chart}</div>` : ""}
      ${o.legend ? `<div class="ap-legend">${o.legend}</div>` : ""}
      <div class="ap-ic-f">${o.foot || ""}<button type="button" class="ap-ask-b" data-act="ask-about" data-k="${o.k}">${icon("chat")}Ask about this</button></div>
    </section>`;

  RU.insights = (M, V, st) => {
    const mode = V.form, u = M.usual, learning = !u;
    const n = learning ? 7 : st.range;
    const F = L.span(M, n, mode);
    const live = F.filter((f) => !f.pending);

    /* the summary: Function's counts, in the person's terms */
    let summary;
    if (learning) {
      const bms = F.reduce((s, f) => s + f.bms.length, 0), logged = live.filter((f) => f.logged).length;
      const symDays = F.filter((f) => f.nsym).length, meals = F.reduce((s, f) => s + f.meals.length, 0);
      summary = `<section class="ap-card ap-sum ap-sum--learn" data-a>
          <span class="ap-k">Learning your usual · day ${L.learnDay(M)} of ${L.LEARN_DAYS}</span>
          <div class="ap-learn-bar" role="img" aria-label="${esc(`Day ${L.learnDay(M)} of ${L.LEARN_DAYS}`)}"><i style="--w:${((L.learnDay(M) / L.LEARN_DAYS) * 100).toFixed(1)}%"></i></div>
          <p class="ap-sum-lede">Counts only for now. From day ${L.LEARN_DAYS}, each card shows your usual, and how each day sits next to it.</p>
          <ul class="ap-sum-counts"><li><b>${logged}</b>${logged === 1 ? "day" : "days"} logged</li><li><b>${bms}</b>${bms === 1 ? "BM" : "BMs"}</li><li><b>${symDays}</b>${symDays === 1 ? "day" : "days"} with symptoms</li><li><b>${meals}</b>${meals === 1 ? "meal" : "meals"}</li></ul>
        </section>`;
    } else {
      const within = F.filter((f) => f.state === "usual").length, sh = F.filter((f) => f.state === "shifted"), none = live.filter((f) => f.state === "none").length;
      const un = F.filter((f) => f.state === "unsure").length;
      const known = within + sh.length;
      const why = [[sh.filter((f) => f.inWin === false).length, "a first BM outside your window"], [sh.filter((f) => f.formsIn === false).length, "a form outside your usual"], [sh.filter((f) => f.inCount === false).length, "an unusual count"]].filter(([k]) => k);
      const afterLate = sh.filter((f) => L.lateDinner(M, f.d - 1)).length;
      const unTxt = un ? ` ${plural(un, "day")} had a BM logged as a word that could sit either side of your usual forms, so ${un === 1 ? "it isn't" : "they aren't"} counted either way.` : "";
      const note = (sh.length ? `Shifted days: ${join(why.map(([k, t]) => `${k} with ${t}`))}.${afterLate ? ` ${afterLate} of the ${sh.length} came after a dinner past 8 PM.` : ""}` : un ? "No day you logged shifted." : "Every day you logged sat within your usual.") + unTxt;
      summary = `<section class="ap-card ap-sum" data-a>
          <span class="ap-k">${esc(RANGE_NAME[n])} · ${esc(spanOf(M, n))}</span>
          <div class="ap-sum-top"><b class="ap-big">${within}<small>of ${known}</small></b><p>days within your usual: first BM in your window, a usual count, usual forms.</p></div>
          ${C.seg([{ v: within, label: "Within your usual", cls: "is-usual" }, { v: sh.length, label: "Something shifted", cls: "is-shift" }, { v: none, label: "Not logged", cls: "is-none" }])}
          <div class="ap-legend"><span><i class="sw sw--usual"></i>${plural(within, "day")} within</span><span><i class="sw sw--shift"></i>${sh.length} shifted</span>${none ? `<span><i class="sw sw--none"></i>${none} not logged</span>` : ""}</div>
          <p class="ap-sum-note">${esc(note)}</p>
        </section>`;
    }

    /* timing */
    const tm = timingOf(M, F);
    const dom = morningDomain(F, u);
    const timing = card(V, {
      k: "timing", icon: "clock", kicker: "Timing · first BM",
      head: u ? `Usually ${winText(u)}` : "Learning your usual window",
      sum: u ? (tm.mornings.length ? `<b>${tm.inW} of ${plural(tm.mornings.length, "morning")}</b> in that window${tm.later.length || tm.earlier.length ? `: ${join([tm.later.length ? `${tm.later.length} later` : "", tm.earlier.length ? `${tm.earlier.length} earlier` : ""].filter(Boolean))}` : ""}.` : "No first BM logged in this stretch.")
        : tm.mornings.length ? `First BM on <b>${plural(tm.mornings.length, "morning")}</b> so far, from ${esc(T(Math.min(...tm.mornings.map((f) => f.first))))} to ${esc(T(Math.max(...tm.mornings.map((f) => f.first))))}.` : "No BMs logged yet.",
      chart: tm.mornings.length ? morning({ days: F, usual: u, domain: dom, r: n >= 90 ? 2.8 : n >= 30 ? 4 : 5, gap: n >= 90 ? 1.2 : 1.6, aria: `First BM each morning, ${RANGE_NAME[n].toLowerCase()}${u ? `, against your usual window ${winText(u)}` : ""}` }) : "",
      legend: u ? `${lg("", "In your window")}${lg("sw--shift", "Outside it")}${lg("sw--band", "Your usual window")}` : lg("", "First BM")
    });

    /* how often */
    const of = oftenOf(M, F);
    let oftenChart, oftenVals;
    if (n >= 90) {
      const wks = weeksOf(M, mode).slice(-13);
      const vals = wks.map((wk) => { const k = wk.filter((f) => f.count != null); const v = k.length ? Ut.mean(k.map((f) => f.count)) : null; return v == null ? { gap: true, tip: `Week of ${short(wk[0].d)}: nothing logged` } : { v, label: wk[0].d >= 84 ? `This week ${v.toFixed(1)}` : v.toFixed(1), shift: !!u && (v < u.nLo || v > u.nHi), tip: `Week of ${short(wk[0].d)}: ${v.toFixed(1)} a day` }; });
      oftenVals = vals;
      oftenChart = bars({ values: vals, yMax: 3, yTicks: [1, 2, 3], band: u ? [u.nLo, u.nHi] : null, labelLast: true, h: 80, xTicks: [{ i: 0, label: short(wks[0][0].d), anchor: "start" }, { i: vals.length - 1, label: "This week", anchor: "end" }], aria: "Average BMs a day, by week" });
    } else {
      const vals = F.map((f) => (f.pending ? { v: null } : !f.logged || f.count == null ? { gap: true, tip: `${short(f.d)}: nothing logged` } : { v: f.count, shift: !!u && !f.inCount, tip: `${short(f.d)} · ${f.count === 0 ? "No BM" : plural(f.count, "BM")}${f.today ? " so far" : ""}` }));
      oftenVals = vals;
      oftenChart = bars({ values: vals, yMax: Math.max(3, ...F.map((f) => f.count || 0)), yTicks: [1, 2, 3], band: u ? [u.nLo, u.nHi] : null, labels: n <= 7, h: 80, xTicks: ticks(F), aria: `BMs a day, ${RANGE_NAME[n].toLowerCase()}` });
    }
    const often = card(V, {
      k: "often", icon: "bars", kicker: "How often",
      head: u ? `Usually ${u.nLo} to ${u.nHi} a day` : "Learning your usual count",
      sum: of.known.length ? (u ? `<b>${of.avg.toFixed(1)} a day</b> on average. ${of.inC} of ${plural(of.known.length, "day")} within your usual.` : `<b>${plural(of.total, "BM")}</b> over ${plural(of.known.length, "day")}.`) : "No BMs logged in this stretch.",
      chart: oftenChart,
      legend: barLegend(oftenVals, u, "Outside it")
    });

    /* form */
    const fm = formOf(M, F, mode);
    const form = card(V, {
      k: "form", glyph: RU.glyph(4, "ap-ic-gl"), kicker: "Form",
      head: u ? `Usually ${L.usualFormsText(M, mode)}` : "Learning your usual forms",
      sum: fm.bms.length ? (u ? `<b>${fm.inF} of ${plural(fm.bms.length, "BM")}</b> within your usual forms${fm.out.length || fm.unsure ? `: ${join([fm.firmer ? `${fm.firmer} firmer` : "", fm.looser ? `${fm.looser} looser` : "", fm.unsure ? `${fm.unsure} could be either` : ""].filter(Boolean))}` : ""}.` : `<b>${plural(fm.bms.length, "BM")}</b>, mostly ${esc(fm.top.label)}.`) : "No BMs logged in this stretch.",
      chart: fm.bms.length ? hist({ bins: fm.bins, h: 64, usualLabel: u ? `Your usual, ${L.usualFormsText(M, mode)}` : null, aria: `Forms, ${RANGE_NAME[n].toLowerCase()}` }) : "",
      legend: u && fm.out.length ? `${lg("sw--bar", "Within your usual")}${lg("sw--bar sw--out", "Outside it")}` : "",
      body: formSplit(fm) ? `<p class="ap-ic-note">${esc(formSplit(fm))}</p>` : ""
    });

    /* symptoms */
    const sy = symOf(M, F);
    const symRowsTop = sy.rows.slice(0, 4);
    const symptoms = card(V, {
      k: "sym", icon: "sym", kicker: "Symptoms",
      head: u ? `Usually ${lower1(symUsualText(u))}` : "Symptoms so far",
      sum: sy.withSym.length ? `<b>${sy.withSym.length} of ${plural(sy.logged.length, "day")}</b> you logged. Mostly ${esc(sy.rows[0].name.toLowerCase())}${sy.how ? `, usually ${esc(sy.how)}` : ""}.` : `None logged on the ${plural(sy.logged.length, "day")} you logged.`,
      chart: symRowsTop.length ? symChart(M, mode, F, n, symRowsTop, 318) : "",
      legend: symRowsTop.length ? symLegend(n, live.some((f) => !f.logged)) : ""
    });

    /* the weekly check-in */
    const K = ckOf(M);
    const ckDue = M.checkin.status === "due";
    const ckFoot = ckDue ? `<button type="button" class="ap-btn ap-btn--c" data-act="ck-start">${M.ckDraft && M.ckDraft.step > 0 ? "Continue" : "Check in"}</button>` : "";
    const ckBody = K.b ? `<ul class="ap-ic-ck">${L.CHECKIN.map((q, i) => `<li><div class="ap-ckr-top"><span class="ap-k">${esc(q.label)}</span>${chip(K.cmp[i].text, K.cmp[i].k === "same" ? "usual" : "shift")}</div>${ckMini(M, i, K.cur ? K.cur.answers[i] : null)}</li>`).join("")}</ul>`
      : `<p class="ap-ic-note">${K.done.length ? `${plural(K.done.length, "check-in")} so far. After three, each week is compared with them.` : "Your first three check-ins become the starting point for every week after."}</p>`;
    const checkin = card(V, {
      k: "ck", icon: "ck", kicker: K.b ? `Weekly check-in · ${K.cur ? "this week" : `week of ${short(K.latest.ws)}`}` : "Weekly check-in",
      head: K.b ? ckHead(K) : ckDue ? (K.done.length ? "This week's check-in is due tonight" : "Your first check-in is due tonight") : "Your first check-in is saved",
      sum: K.b ? `Each week next to your first three, ${esc(RU.spanText(K.done[0].ws, K.done[2].ws + 6))}.${ckDue ? " This week's is due tonight." : ""}` : "",
      body: ckBody,
      legend: K.b ? `${lg("sw--band", "Your first three weeks")}${lg("ap-ckt-sw--now", K.cur ? "This week" : "Latest week")}` : "",
      foot: ckFoot
    });

    /* possible patterns, from meals */
    const PR = L.patterns(M, mode);
    const patRows = PR.found.map((p) => `<li><button type="button" class="ap-ipat" data-act="idetail" data-k="pattern:${esc(p.id)}">
        <span class="ap-pat-ic">${icon(p.kind === "late" ? "moon" : "meal")}</span>
        <span class="ap-ipat-m"><b>${esc(patTitle(p))}</b>${countDots(p.occ.map((o) => o.hit), { per: 26, r: 3, gap: 2.2, aria: `${p.hit} of ${p.n} times` })}<em>${esc(p.tier.label)} · ${p.hit} of ${p.n} times</em></span>
        ${icon("chev", "ap-ic-go")}</button></li>`).join("");
    const quietTxt = PR.quiet.length ? `Checked, nothing stands out yet: ${joinMore(PR.quiet.map((f) => lower1(foodName(f)[0])), 4)}.` : "";
    const waitTxt = PR.waiting.length ? `Needs more logs: ${joinMore(PR.waiting.map((f) => `${lower1(foodName(f)[0])} (${PR.counts[f]} of 5)`), 3)}.` : "";
    const patterns = card(V, {
      k: "pat", icon: "pat", kicker: learning ? "Possible patterns" : `Possible patterns · ${L.PATTERN_DAYS} days`,
      head: PR.found.length ? `${WORDS[PR.found.length] || PR.found.length} possible ${PR.found.length === 1 ? "pattern" : "patterns"}` : learning ? "Not enough logs yet" : "Nothing stands out yet",
      sum: PR.found.length ? "" : learning ? "Florin starts checking a food once you've logged it 5 times." : "",
      body: `${patRows ? `<ul class="ap-ipats">${patRows}</ul>` : ""}${quietTxt || waitTxt ? `<p class="ap-ic-note">${esc([quietTxt, waitTxt].filter(Boolean).join(" "))}</p>` : ""}<p class="ap-ic-note">Patterns show what tends to happen together. They don't prove cause.</p>`
    });

    return `<div class="ap-scr ap-ins">
      <header class="ap-top ap-top--ins" data-a><div><p class="ap-date">${esc(M.P.name)}'s logs</p><h1 class="ap-h1" tabindex="-1">Insights</h1></div>${learning ? chip(`Day ${L.learnDay(M)} of ${L.LEARN_DAYS}`, "usual") : rangeTabs(n)}</header>
      ${summary}
      ${timing}${often}${form}${symptoms}${checkin}${patterns}
      ${fine(DISC)}
    </div>`;
  };

  /* ============================== DETAIL PAGES ============================== */
  const NEXT = { timing: ["often", "How often"], often: ["form", "Form"], form: ["sym", "Symptoms"], sym: ["ck", "Weekly check-in"], ck: ["pat", "Possible patterns"] };
  const nav = (title) => `<header class="ap-nav"><button type="button" class="ap-back" data-act="iback">${RU.icon("back")}<span>Insights</span></button><span class="ap-nav-t" role="heading" aria-level="1" tabindex="-1">${esc(title)}</span><span class="ap-nav-sp"></span></header>`;
  const sect = (h, body, cls = "") => `<section class="ap-sect ${cls}" data-a><h3>${esc(h)}</h3>${body}</section>`;
  const fig = (cap, right, body, legend) => `<figure class="ap-fig" data-a>${cap ? `<figcaption class="ap-figcap"><b>${esc(cap)}</b>${right ? `<span>${esc(right)}</span>` : ""}</figcaption>` : ""}${body}${legend ? `<div class="ap-legend">${legend}</div>` : ""}</figure>`;
  const shaped = (lines) => (lines.filter(Boolean).length ? `<details class="ap-shaped" data-a><summary><span>What shaped this</span>${RU.icon("down")}</summary><div class="ap-shaped-b">${lines.filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join("")}</div></details>` : "");
  const tableOf = (head, rows) => `<details class="ap-table" data-a><summary>View as table</summary><div class="ap-table-in"><table><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
  const askBtn = (k) => `<button type="button" class="ap-btn ap-btn--line ap-btn--block ap-idt-ask" data-act="ask-about" data-k="${esc(k)}" data-a>${icon("chat")}Ask about this</button>`;
  const nextBtn = (k) => (NEXT[k] ? `<button type="button" class="ap-idt-next" data-act="idetail" data-k="${NEXT[k][0]}" data-a><span><em>Next</em><b>${esc(NEXT[k][1])}</b></span>${RU.icon("chev")}</button>` : "");
  const hero = (k, big, chips, now) => `<div class="ap-dhero" data-a><span class="ap-k">${esc(k)}</span><b class="ap-big">${big}</b>${chips ? `<div class="ap-chips">${chips}</div>` : ""}${now || ""}</div>`;
  const nowRow = (label, value, tone, text, range) => `<div class="ap-idt-now"><div class="ap-idt-now-h"><span><em>${esc(label)}</em><b>${esc(value)}</b></span>${text ? chip(text, tone) : ""}</div>${range || ""}</div>`;
  const learnChip = (M) => chip(`Learning your usual · day ${L.learnDay(M)} of ${L.LEARN_DAYS}`, "usual");
  const page = (M, V, st, title, body) => `<div class="ap-scr ap-idt">
      ${nav(title)}
      ${body}
      ${fine(DISC)}
    </div>`;

  RU.idetail = (M, V, st) => {
    const mode = V.form, u = M.usual, learning = !u;
    const n = learning ? 7 : st.range;
    const F = L.span(M, n, mode);
    const k = st.k || "timing";
    const tabs = learning ? "" : `<div class="ap-det-range" data-a>${rangeTabs(n)}</div>`;
    const rn = RANGE_NAME[n].toLowerCase();
    const today = F.find((f) => f.today);

    if (k === "timing") {
      const tm = timingOf(M, F), dom = morningDomain(F, u);
      const tf = today && today.first != null ? today : null;
      const now = tf ? nowRow("Today", T(tf.first), tf.inWin ? "usual" : "shift", u ? (tf.inWin ? "In your window" : tf.first > u.tHi ? "Later than your window" : "Earlier than your window") : "", u ? C.range({ min: dom[0], max: dom[1], lo: u.tLo, hi: u.tHi, value: tf.first, fmt: hm, state: tf.inWin ? "usual" : "shift", aria: `Today ${T(tf.first)}, usual window ${winText(u)}` }) : "") : "";
      let second;
      if (n <= 30) {
        const rows = F.slice().reverse().filter((f) => !f.pending).map((f, i) => ({
          label: n <= 7 || i % 2 === 0 ? dayShort(f.d) : "",
          flag: L.lateDinner(M, f.d - 1) ? "After a dinner past 8 PM" : "",
          cls: f.logged ? "" : "is-gap",
          points: f.bms.map((b, j) => ({ t: b.t, dur: 6, first: j === 0, cls: j === 0 && u && !f.inWin ? "is-shift" : "", tip: `${short(f.d)} · ${T(b.t)}${j === 0 ? " · first BM" : ""}` }))
        }));
        second = fig("Every BM, day by day", "Newest at the top", C.dayRows({ w: 326, left: 52, rowH: n <= 7 ? 28 : 13, t0: 5, t1: 23, window: u ? [u.tLo, u.tHi] : null, durScale: n <= 7 ? 3 : 2.2, rows, aria: "Every BM by day on a time axis" }),
          `${lg("sw--first", "First BM")}${lg("sw--later", "Later BMs")}${u ? lg("sw--band", "Your usual window") : ""}${lg("sw--flag", "After a dinner past 8 PM")}${F.some((f) => !f.logged && !f.pending) ? lg("sw--gapline", "Not logged") : ""}`);
      } else {
        const wks = weeksOf(M, mode);
        const vals = wks.map((wk) => { const w = wk.filter((f) => f.first != null), kk = w.filter((f) => f.inWin).length; return w.length ? { v: pctOf(kk, w.length), label: wk[0].d >= 84 ? `This week ${pctOf(kk, w.length)}%` : `${pctOf(kk, w.length)}%`, tip: `Week of ${short(wk[0].d)}: ${kk} of ${w.length} mornings in your window` } : { gap: true }; });
        second = fig("Mornings in your window, by week", "13 weeks", bars({ w: 326, h: 96, left: 30, values: vals, yMax: 100, yTicks: [50, 100], yFmt: (v) => v + "%", labelLast: true, xTicks: [{ i: 0, label: short(wks[0][0].d), anchor: "start" }, { i: vals.length - 1, label: "This week", anchor: "end" }], aria: "Share of mornings in your usual window, by week" }));
      }
      const lines = u ? [
        tm.later.length ? `${tm.laterAfterLate} of your ${plural(tm.later.length, "later morning")} came after a dinner past 8 PM.` : "No mornings later than your window.",
        tm.earlier.length ? `${plural(tm.earlier.length, "morning")} came earlier than your window.` : "",
        tm.weDiff != null && Math.abs(tm.weDiff) >= 1 / 6 ? `Weekend mornings ran about ${Math.round(Math.abs(tm.weDiff) * 12) * 5} minutes ${tm.weDiff > 0 ? "later" : "earlier"} than weekdays.` : "",
        `Your usual window is where most first BMs landed in your weeks from ${short(28)} to ${short(83)}. It updates as you log.`
      ] : [`Florin needs ${L.LEARN_DAYS} days of logs to set your usual window. Day ${L.learnDay(M)} so far.`];
      return page(M, V, st, "Timing", `
        ${hero("Typical first BM", tm.med != null ? esc(T(tm.med)) : "None yet", learning ? learnChip(M) : `${chip(`Your usual ${winText(u)}`, "plain")}${chip(`${tm.inW} of ${plural(tm.mornings.length, "morning")} in it`, "usual")}`, now)}
        ${tabs}
        ${fig(u ? `${tm.inW} of ${tm.mornings.length} mornings in your window` : "First BM, each morning", RANGE_NAME[n], tm.mornings.length ? morning({ w: 326, days: F, usual: u, domain: dom, r: n >= 90 ? 3 : n >= 30 ? 4.2 : 5.4, gap: n >= 90 ? 1.2 : 1.6, bracket: true, aria: `First BM each morning, ${rn}` }) : `<p class="ap-ic-note">No first BM logged in this stretch.</p>`,
          u ? `${lg("", "In your window")}${lg("sw--shift", "Outside it")}${lg("sw--ring", "Newest")}` : lg("", "First BM"))}
        ${second}
        ${shaped(lines)}
        ${askBtn("timing")}
        ${tableOf(["Day", "First BM", "BMs", "In window"], F.slice().reverse().filter((f) => !f.pending).map((f) => [short(f.d), f.first != null ? T(f.first) : f.logged ? (f.nobm ? "No BM" : "None logged") : "Not logged", f.count != null ? String(f.count) : "", f.inWin == null ? "" : f.inWin ? "Yes" : "No"]))}
        ${nextBtn("timing")}`);
    }

    if (k === "often") {
      const of = oftenOf(M, F);
      const tc = today && today.count != null ? today : null;
      const now = tc ? nowRow("Today so far", tc.count === 0 ? "No BM" : plural(tc.count, "BM"), tc.inCount ? "usual" : "shift", u ? (tc.inCount ? "Within your usual" : tc.count > u.nHi ? "More than usual" : "Fewer than usual") : "", u ? C.range({ min: 0, max: 4, lo: u.nLo, hi: u.nHi, value: tc.count, state: tc.inCount ? "usual" : "shift", unit: "a day", aria: `Today ${tc.count}, usual ${u.nLo} to ${u.nHi}` }) : "") : "";
      let chart, cvals;
      if (n >= 90) {
        const wks = weeksOf(M, mode);
        const vals = wks.map((wk) => { const kk = wk.filter((f) => f.count != null); const v = kk.length ? Ut.mean(kk.map((f) => f.count)) : null; return v == null ? { gap: true } : { v, label: wk[0].d >= 84 ? `This week ${v.toFixed(1)}` : v.toFixed(1), shift: !!u && (v < u.nLo || v > u.nHi), tip: `Week of ${short(wk[0].d)}: ${v.toFixed(1)} a day` }; });
        cvals = vals;
        chart = bars({ w: 326, h: 120, values: vals, yMax: 3, yTicks: [1, 2, 3], band: u ? [u.nLo, u.nHi] : null, bandLabel: u ? `Your usual ${u.nLo} to ${u.nHi}` : null, labelLast: true, xTicks: [{ i: 0, label: short(wks[0][0].d), anchor: "start" }, { i: vals.length - 1, label: "This week", anchor: "end" }], aria: "Average BMs a day, by week" });
      } else {
        const vals = F.map((f) => (f.pending ? { v: null } : !f.logged || f.count == null ? { gap: true, tip: `${short(f.d)}: nothing logged` } : { v: f.count, shift: !!u && !f.inCount, tip: `${short(f.d)} · ${f.count === 0 ? "No BM" : plural(f.count, "BM")}${f.today ? " so far" : ""}` }));
        cvals = vals;
        chart = bars({ w: 326, h: 120, values: vals, yMax: Math.max(3, ...F.map((f) => f.count || 0)), yTicks: [1, 2, 3], band: u ? [u.nLo, u.nHi] : null, bandLabel: u ? `Your usual ${u.nLo} to ${u.nHi}` : null, labels: n <= 7, xTicks: ticks(F), aria: `BMs a day, ${rn}` });
      }
      const splitN = of.known.length;
      const split = `<div class="ap-hbars">${of.split.map((c, i) => `<div class="ap-hbar"><span>${esc(["No BM", "1", "2", "3 or more"][i])}</span><i><b style="--w:${pctOf(c, splitN)}%"></b></i><strong>${pctOf(c, splitN)}%</strong></div>`).join("")}</div>${of.gaps ? `<p class="ap-figcap-note">${esc(`${plural(of.gaps, "day")} not logged, left out rather than counted as zero.`)}</p>` : ""}`;
      const lines = [
        u ? `${of.inC} of ${plural(of.known.length, "day")} had ${u.nLo} to ${u.nHi} BMs, your usual.` : "",
        of.busy ? `${plural(of.busy, "day")} had more than ${u.nHi}.` : u ? `No days had more than ${u.nHi}.` : "",
        of.zero ? `${plural(of.zero, "day")} logged as No BM.` : "",
        of.gaps ? `${plural(of.gaps, "day")} with nothing logged stay gaps. A gap never counts as a day with no BM.` : "",
        today && !today.pending ? "Today counts as far as it has gone." : ""
      ];
      return page(M, V, st, "How often", `
        ${hero("BMs a day, on average", of.avg != null ? `${of.avg.toFixed(1)}<small>a day</small>` : "None yet", learning ? learnChip(M) : `${chip(`Your usual ${u.nLo} to ${u.nHi} a day`, "plain")}${chip(`${of.inC} of ${plural(of.known.length, "day")} within`, "usual")}`, now)}
        ${tabs}
        ${fig(n >= 90 ? "Average a day, by week" : u ? `${of.inC} of ${of.known.length} days within your usual` : "BMs each day", n >= 90 ? "13 weeks" : RANGE_NAME[n], chart, barLegend(cvals, null, "Outside your usual"))}
        ${fig("How your days split", plural(splitN, "day"), split)}
        ${shaped(lines)}
        ${askBtn("often")}
        ${tableOf(["Day", "BMs"], F.slice().reverse().filter((f) => !f.pending).map((f) => [short(f.d), f.count != null ? (f.count === 0 ? "No BM" : String(f.count) + (f.today ? " so far" : "")) : "Not logged"]))}
        ${nextBtn("often")}`);
    }

    if (k === "form") {
      const fm = formOf(M, F, mode), B = mode === "B", Cw = mode === "C";
      const lastBm = today && today.bms.length ? today.bms[today.bms.length - 1] : null;
      const inLast = lastBm && u ? L.inForms(M, lastBm, mode) : null;
      const said = inLast ? "Within your usual" : inLast === false ? "Outside your usual" : "Could be either";
      const now = lastBm ? nowRow("Today", L.formName(lastBm, mode), inLast ? "usual" : inLast === false ? "shift" : "plain", u ? said : "",
        u ? C.range({ min: B ? 0 : 1, max: B ? 4 : 7, lo: B ? u.wLo : u.fLo, hi: B ? u.wHi : u.fHi, value: B ? L.wordKey(lastBm) : Ut.mean(L.stepsOf(lastBm)), fmt: B ? (v) => L.WORDS[v].word : Cw ? (v) => L.TYPES[v].short : (v) => `Type ${v}`, state: inLast ? "usual" : inLast === false ? "shift" : "", aria: `Today ${L.formName(lastBm, mode)}, usual ${L.usualFormsText(M, mode)}` }) : "") : "";
      const PR = L.patterns(M, mode);
      const loose = PR.found.filter((p) => p.kind === "loose");
      const lines = [
        u && fm.out.length ? `Of the ${plural(fm.out.length, "BM")} outside your usual, ${join([fm.firmer ? `${fm.firmer} ${fm.firmer === 1 ? "was" : "were"} firmer` : "", fm.looser ? `${fm.looser} ${fm.looser === 1 ? "was" : "were"} looser` : ""].filter(Boolean))}.` : u && !fm.unsure ? "Every BM was within your usual forms." : "",
        fm.unsure ? `${plural(fm.unsure, "BM")} logged as a word that covers steps on both sides of your usual could be either, so ${fm.unsure === 1 ? "it isn't" : "they aren't"} counted as within or outside.` : "",
        formSplit(fm),
        ...loose.map((p) => `The morning after ${lower1(foodName(p.food)[0])}, your first BM was ${looseText(mode)} ${p.hit} of ${p.n} times in the last ${L.PATTERN_DAYS} days. It's on Possible patterns.`),
        B ? "Five words, hardest to loosest: Hard covers the two hardest steps and Loose the two just before Watery." : Cw ? "Seven words, from Pellets, the hardest, to Watery, the loosest." : "Types run from 1, hardest, to 7, loosest. It's the scale clinicians use."
      ];
      return page(M, V, st, "Form", `
        ${hero("Most common form", fm.bms.length ? esc(fm.top.label) : "None yet", learning ? learnChip(M) : `${chip(`Your usual ${L.usualFormsText(M, mode)}`, "plain")}${fm.bms.length ? chip(`${fm.inF} of ${plural(fm.bms.length, "BM")} within`, "usual") : ""}`, now)}
        ${tabs}
        ${fig(u ? `${fm.inF} of ${fm.bms.length} BMs within your usual forms` : "Forms so far", plural(fm.bms.length, "BM"), fm.bms.length ? hist({ w: 326, bins: fm.bins, h: 100, usualLabel: u ? `Your usual, ${L.usualFormsText(M, mode)}` : null, aria: `Forms, ${rn}` }) : "", u && fm.out.length ? `${lg("sw--bar", "Within your usual")}${lg("sw--bar sw--out", "Outside it")}` : "")}
        ${fig("Each BM, day by day", B ? "Hard at the bottom" : Cw ? "Pellets at the bottom" : "Type 1 at the bottom", formDots({ days: F.filter((f) => !f.pending), mode, usual: u, h: 110, aria: `Each BM's form, ${rn}` }), `${lg("", "Within your usual")}${u ? lg("sw--shift", "Outside it") + lg("sw--band", "Your usual") : ""}${fm.unsure ? lg("sw--maybe", "Could be either") : ""}${lg("sw--ring", "Newest")}`)}
        ${shaped(lines)}
        ${askBtn("form")}
        ${tableOf(["Day", "Time", "Form", "Within"], F.slice().reverse().flatMap((f) => f.bms.slice().reverse().map((b) => { const s = u ? L.inForms(M, b, mode) : undefined; return [short(f.d), T(b.t), L.formName(b, mode), s === undefined ? "" : s ? "Yes" : s === false ? "No" : "Could be either"]; })))}
        ${nextBtn("form")}`);
    }

    if (k === "sym") {
      const sy = symOf(M, F);
      const P2 = L.prevSpan(M, n, mode);
      const cur = symOf(M, P2.cur), prev = symOf(M, P2.prev);
      const names = [...new Set(cur.rows.map((r) => r.name).concat(prev.rows.map((r) => r.name)))];
      const trows = names.map((name) => { const c = (cur.rows.find((r) => r.name === name) || { n: 0 }).n, p = (prev.rows.find((r) => r.name === name) || { n: 0 }).n; return { name, c, p, w: trendWord(c, p) }; });
      const all = trendWord(cur.withSym.length, prev.withSym.length);
      const ts = today && today.nsym ? today : null;
      const tsName = ts ? Object.entries(ts.sym).sort((a, b) => b[1] - a[1])[0] : null;
      const now = ts ? nowRow("Today", tsName[1] ? `${L.STRENGTH[tsName[1] - 1]} ${tsName[0].toLowerCase()}` : tsName[0], "plain", "", "") : "";
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
        ${fig(sy.withSym.length ? `Symptoms on ${sy.withSym.length} of ${sy.logged.length} days` : "No symptoms logged", n >= 90 ? "By week" : RANGE_NAME[n], sy.rows.length ? symChart(M, mode, F, n, sy.rows, 326) : "", sy.rows.length ? symLegend(n, F.some((f) => !f.logged && !f.pending)) : "")}
        ${trows.length && P2.prev.length ? `<div class="ap-trows" data-a>${trows.map((r) => `<div class="ap-trow"><b>${esc(r.name)}</b><span>${esc(plural(r.c, "day"))}<em>${esc(`${r.p} before`)}</em></span>${chip(r.w.text, r.w.tone)}</div>`).join("")}</div>` : ""}
        <section class="ap-sect ap-sect--care" data-a><h3>When to talk to a clinician</h3><p>Some changes need a person, not an app. Blood, a black stool, a fever, vomiting that won't stop, weight loss you can't explain, or pain that wakes you up: contact your healthcare provider.</p></section>
        ${shaped(lines)}
        ${askBtn("sym")}
        ${tableOf(["Day", "Symptoms"], F.slice().reverse().filter((f) => f.nsym).map((f) => [short(f.d), Object.entries(f.sym).map(([nm, s]) => `${nm}, ${sWord(s)}`).join("; ")]))}
        ${nextBtn("sym")}`);
    }

    if (k === "ck") {
      const K = ckOf(M);
      const due = M.checkin.status === "due";
      const rows = K.b ? L.CHECKIN.map((q, i) => `<li class="ap-ckr-row"><div class="ap-ckr-top"><span class="ap-k">${esc(q.label)}</span>${chip(K.cmp[i].text, K.cmp[i].k === "same" ? "usual" : "shift")}</div><b>${esc(q.opts[K.latest.answers[i]])}</b>${RU.ckTrend(M, i, K.cur ? K.cur.answers[i] : null)}</li>`).join("") : "";
      const lines = K.b ? [
        `Your starting point is your first three check-ins, ${RU.spanText(K.done[0].ws, K.done[2].ws + 6)}. Each week sits next to them. No score and no bands.`,
        K.skipped.length ? `You skipped the week of ${join(K.skipped.map((c) => short(c.ws)))}. A skipped week stays a gap.` : "",
        "About the same means inside the range of your first three weeks. Moved means outside it, in either direction."
      ] : [];
      return page(M, V, st, "Weekly check-in", `
        <div class="ap-dhero" data-a><span class="ap-k">${esc(K.latest ? (K.cur ? `This week · ${RU.spanText(84, 90)}` : `Week of ${short(K.latest.ws)}`) : "Weekly check-in")}</span><h2 class="ap-idt-h">${esc(K.b ? ckHead(K) : due ? "Your first check-in is due tonight" : "Your first check-in is saved")}</h2>${due ? `<div class="ap-idt-cta"><button type="button" class="ap-btn" data-act="ck-start">${M.ckDraft && M.ckDraft.step > 0 ? "Continue this week's" : "Check in for this week"}</button></div>` : ""}</div>
        ${K.b ? `<ul class="ap-ckr-list" data-a>${rows}</ul><div class="ap-legend" data-a>${lg("sw--band", "Your first three weeks")}${lg("ap-ckt-sw--past", "Each week")}${lg("ap-ckt-sw--now", K.cur ? "This week" : "Latest week")}</div>` : `<p class="ap-sect-p" data-a>Your first three check-ins become the starting point. After that, each week is compared with them, and the trend shows here.</p>`}
        ${shaped(lines)}
        ${askBtn("ck")}
        ${K.done.length ? tableOf(["Week of", "Belly pain", "In the way", "Bloating", "Habits"], M.checkins.concat(K.cur ? [K.cur] : []).slice().reverse().map((c) => [short(c.ws), ...(c.answers ? c.answers.map((a, i) => L.CHECKIN[i].opts[a]) : ["Skipped", "", "", ""])])) : ""}
        ${nextBtn("ck")}`);
    }

    if (k === "pat") {
      const PR = L.patterns(M, mode);
      const rows = PR.found.map((p) => `<li><button type="button" class="ap-ipat" data-act="idetail" data-k="pattern:${esc(p.id)}">
          <span class="ap-pat-ic">${icon(p.kind === "late" ? "moon" : "meal")}</span>
          <span class="ap-ipat-m"><b>${esc(patTitle(p))}</b>${countDots(p.occ.map((o) => o.hit), { per: 26, r: 3, gap: 2.2, aria: `${p.hit} of ${p.n} times` })}<em>${esc(p.tier.label)} · ${p.hit} of ${p.n} times</em></span>
          ${icon("chev", "ap-ic-go")}</button></li>`).join("");
      const waiting = PR.waiting.slice(0, 6).map((f) => `<div class="ap-wait"><span>${esc(foodName(f)[0])}</span><i><b style="--w:${pctOf(PR.counts[f], 5)}%"></b></i><strong>${PR.counts[f]} of 5</strong></div>`).join("");
      return page(M, V, st, "Possible patterns", `
        <div class="ap-dhero" data-a><span class="ap-k">Meals · last ${L.PATTERN_DAYS} days</span><h2 class="ap-idt-h">${esc(PR.found.length ? `${WORDS[PR.found.length] || PR.found.length} possible ${PR.found.length === 1 ? "pattern" : "patterns"}` : learning ? "Not enough logs yet" : "Nothing stands out yet")}</h2><p class="ap-idt-lede">What tends to come the morning or the day after something you logged. Seen together, never proof of cause.</p></div>
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
      let chart = "";
      if (p.kind === "late") {
        const dom = morningDomain(p.occ.map((o) => ({ first: o.v })).concat(p.oth.map((o) => ({ first: o.v }))), u);
        chart = fig("First BM after each dinner", `Your usual window ${winText(u)}`, strip({ domain: dom, band: [u.tLo, u.tHi], ticks: Array.from({ length: dom[1] - dom[0] + 1 }, (_, i) => ({ v: dom[0] + i, label: hourLbl(dom[0] + i, i === 0 || i === dom[1] - dom[0]) })), groups: [
          { label: patCond(p), vals: p.occ.map((o) => ({ v: o.v, shift: o.v < u.tLo || o.v > u.tHi, tip: `${short(o.d)} · first BM ${T(o.v)}` })), median: Ut.median(p.occ.map((o) => o.v)), medLabel: T(Ut.median(p.occ.map((o) => o.v))) },
          { label: patOther(p), dim: true, vals: p.oth.map((o) => ({ v: o.v, shift: o.v < u.tLo || o.v > u.tHi, tip: `${short(o.d)} · first BM ${T(o.v)}` })), median: Ut.median(p.oth.map((o) => o.v)), medLabel: T(Ut.median(p.oth.map((o) => o.v))) }
        ], aria: "First BM times after dinners past 8 PM and after earlier dinners" }), `${lg("", "In your window")}${lg("sw--shift", "Outside it")}${lg("sw--band", "Your usual window")}`);
      } else {
        const F90 = L.span(M, L.PATTERN_DAYS, mode).filter((f) => !f.pending);
        const after = F90.map((f, i) => (p.occ.some((o) => o.d === f.d) ? i : -1)).filter((i) => i >= 0);
        const ctx = [{ label: `${foodName(p.food)[0]} the day before`, idx: after }];
        chart = p.kind === "loose"
          ? fig("First BM each morning", RANGE_NAME[L.PATTERN_DAYS], formDots({ days: F90, mode, usual: u, firstOnly: true, h: 100, ctx, aria: `First BM form each morning, with ${lower1(foodName(p.food)[0])} the day before marked` }), `${lg("", "Within your usual")}${lg("sw--shift", "Outside it")}${lg("sw--ctxbar", `${foodName(p.food)[0]} the day before`)}`)
          : fig("Bloating, day by day", RANGE_NAME[L.PATTERN_DAYS], symRows({ w: 326, days: F90, rows: [{ name: "Bloating", n: F90.filter((f) => has(f, "Bloating")).length }], ctx, aria: `Bloating by day, with ${lower1(foodName(p.food)[0])} the day before marked` }), `${lg("sw--sym1", "Mild")}${lg("sw--sym3", "Stronger")}${lg("sw--ctxbar", `${foodName(p.food)[0]} the day before`)}`);
      }
      const unit = `<div class="ap-units">
          <div class="ap-unit"><div class="ap-unit-h"><b>${esc(patCond(p))}</b><span>${p.hit} of ${p.n}</span></div>${countDots(p.occ.map((o) => o.hit), { per: 26, r: 3.6, aria: `${p.hit} of ${p.n}` })}</div>
          <div class="ap-unit ap-unit--other"><div class="ap-unit-h"><b>${esc(patOther(p))}</b><span>${p.oh} of ${p.on}</span></div>${countDots(p.oth.map((o) => o.hit), { per: 26, r: 3.6, aria: `${p.oh} of ${p.on}` })}</div>
        </div>`;
      const what = p.kind === "late" ? `a first BM after ${T(u.tHi)}` : p.kind === "loose" ? `a first BM ${looseText(mode)}` : "bloating logged";
      const tryLine = p.kind === "late" ? "To see whether it holds for you, try a few evenings with dinner before 8 PM and compare the mornings after. One change at a time shows what matters." : `To see whether it holds, keep logging ${lower1(foodName(p.food)[0])} as you usually would, with a word on when you had it and how much. Florin keeps checking as more days come in.`;
      return page(M, V, st, "Possible pattern", `
        <div class="ap-dhero ap-dhero--pat" data-a><span class="ap-pat-ic ap-pat-ic--lg">${icon(p.kind === "late" ? "moon" : "meal")}</span><span class="ap-k">Possible pattern · last ${L.PATTERN_DAYS} days</span><h2 class="ap-pat-title">${esc(patTitle(p))}</h2><div class="ap-chips">${shown ? meter(p.tier.k, p.tier.label) : chip("Below the bar", "plain")}${chip(`${p.hit} of ${p.n} times`, "plain")}</div></div>
        ${fig(`${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise`, "", unit, `${lg("sw--held", `Held: ${what}`)}${lg("sw--miss", "Didn't")}`)}
        ${chart}
        ${sect("What Florin noticed", `<p>${esc(patLine(M, p, mode))}</p>`)}
        <section class="ap-sect ap-sect--proof" data-a><h3>Seen together, not proof</h3><p>Patterns show what tends to happen together in your logs. They don't prove one thing causes another, and other things you didn't log may be part of it.</p>
          <div class="ap-sure"><span><b>Needs more logs</b><em>Under 5 times</em></span><span class="${shown && p.tier.k === 2 ? "is-on" : ""}"><b>Showing up often</b><em>5 or more, most of the time</em></span><span class="${shown && p.tier.k === 3 ? "is-on" : ""}"><b>Consistent</b><em>8 or more, nearly every time</em></span></div>
        </section>
        ${sect("What you could try", `<p>${esc(tryLine)}</p>`, "ap-sect--try")}
        ${sect("Where this comes from", `<p>${esc(p.kind === "late" ? "Dinner times you logged, and the first BM you logged the next morning." : p.kind === "loose" ? "Meals you logged, and the first BM you logged the next morning." : "Meals you logged, and the symptoms you logged the next day.")}</p>`)}
        ${askBtn(`pattern:${p.id}`)}
        ${tableOf([p.kind === "late" ? "Dinner" : "Day before", "Next day", "Held"], p.occ.slice().reverse().map((o) => [short(o.d - 1), p.kind === "late" ? `First BM ${T(o.v)}` : p.kind === "loose" ? L.formName(o.v, mode) : o.v != null ? `Bloating, ${sWord(o.v)}` : "No bloating", o.hit ? "Yes" : "No"]))}`);
    }
    return page(M, V, st, "Insights", "");
  };

  /* ============================== ASK FLORIN: THE HAND-OFF ==============================
     Ask about this opens the Ask tab with that card's numbers loaded and three questions to start. The chat itself
     is the next pass; it keeps the coach test bench rules. */
  RU.askContext = (M, V, ctx) => {
    if (!ctx) return null;
    const mode = V.form, u = M.usual, n = u ? ctx.range : 7, k = ctx.k;
    const F = L.span(M, n, mode), rn = u ? RANGE_NAME[n].toLowerCase() : "so far";
    if (k === "timing") { const tm = timingOf(M, F); return { title: `Timing · ${rn}`, facts: u ? [`Your usual window: ${winText(u)}`, `${tm.inW} of ${plural(tm.mornings.length, "morning")} in it`, tm.later.length ? `${tm.laterAfterLate} of ${plural(tm.later.length, "later morning")} came after a dinner past 8 PM` : "No later mornings"] : [`First BM on ${plural(tm.mornings.length, "morning")}`], qs: ["Why do some mornings run later?", "What sets my usual window?", "What could I try this week?"] }; }
    if (k === "often") { const of = oftenOf(M, F); return { title: `How often · ${rn}`, facts: u ? [`Your usual: ${u.nLo} to ${u.nHi} a day`, `${of.avg != null ? of.avg.toFixed(1) : 0} a day on average`, `${of.inC} of ${plural(of.known.length, "day")} within`] : [`${plural(of.total, "BM")} over ${plural(of.known.length, "day")}`], qs: ["What made my busier days different?", "Why does a gap not count as zero?", "How is my usual worked out?"] }; }
    if (k === "form") { const fm = formOf(M, F, mode); return { title: `Form · ${rn}`, facts: u ? [`Your usual: ${L.usualFormsText(M, mode)}`, `${fm.inF} of ${plural(fm.bms.length, "BM")} within`, `Most common: ${fm.top.label}`] : [`${plural(fm.bms.length, "BM")} so far`], qs: ["What do the forms mean?", "Why were some BMs looser?", "When should I mention a change to a clinician?"] }; }
    if (k === "sym") { const sy = symOf(M, F); return { title: `Symptoms · ${rn}`, facts: [u ? `Your usual: ${lower1(symUsualText(u))}` : "Learning your usual", `Symptoms on ${sy.withSym.length} of ${plural(sy.logged.length, "day")}`, sy.rows.length ? `Mostly ${sy.rows[0].name.toLowerCase()}${sy.how ? `, usually ${sy.how}` : ""}` : "None logged"], qs: ["What tends to come before my bloating?", "When should I talk to a clinician?", "How do I log symptoms well?"] }; }
    if (k === "ck") { const K = ckOf(M); return { title: "Weekly check-in", facts: K.b ? [ckHead(K), `Compared with ${RU.spanText(K.done[0].ws, K.done[2].ws + 6)}`, `${plural(K.done.length + (K.cur ? 1 : 0), "check-in")} so far`] : ["Your first check-ins set your starting point"], qs: ["What changed since I started?", "How is my starting point set?", "What should I note this week?"] }; }
    if (k === "pat") { const PR = L.patterns(M, mode); return { title: `Possible patterns · last ${L.PATTERN_DAYS} days`, facts: PR.found.length ? PR.found.slice(0, 3).map((p) => `${patTitle(p)}: ${p.hit} of ${p.n} times`) : ["Nothing stands out yet"], qs: ["How sure are these patterns?", "How do I test one?", "Why does a food need 5 logs?"] }; }
    if (k.indexOf("pattern:") === 0) { const PR = L.patterns(M, mode); const p = PR.tests.find((x) => x.id === k.slice(8)); if (p) return { title: patTitle(p), facts: [`${p.hit} of ${p.n} times`, `${p.oh} of ${p.on} otherwise`, p.show ? p.tier.label : "Below the bar"], qs: ["How sure is this pattern?", "How do I test it?", "What else could be part of it?"] }; }
    return null;
  };

  RU.ask = (M, V, ctx) => {
    const c = RU.askContext(M, V, ctx);
    const qs = c ? c.qs : ["What changed this week?", "What tends to come before my rougher days?", "How do I bring my logs to a clinician?"];
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
})();
