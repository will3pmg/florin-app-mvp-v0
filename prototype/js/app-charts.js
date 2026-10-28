/* Florin app prototype: a small SVG chart kit. Every function returns markup (no DOM), so charts render
   the same in the studio, the homepage build and the deck. Colors come from CSS classes (themeable). */
(function () {
  const FL = window.FL;
  const esc = FL.esc;
  const C = (window.FLC = {});
  const n1 = (v) => Math.round(v * 10) / 10;
  const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1);
  C.lin = lin;
  let uid = 0;
  const id = (p) => `${p}${++uid}`;

  /* Smooth-ish path through points (monotone cubic keeps shape honest: no overshoot) */
  function path(pts) {
    if (!pts.length) return "";
    if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${n1(p[0])},${n1(p[1])}`).join("");
    const n = pts.length, dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / (dx[i] || 1); }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    let d = `M${n1(pts[0][0])},${n1(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${n1(pts[i][0] + h)},${n1(pts[i][1] + t[i] * h)} ${n1(pts[i + 1][0] - h)},${n1(pts[i + 1][1] - t[i + 1] * h)} ${n1(pts[i + 1][0])},${n1(pts[i + 1][1])}`;
    }
    return d;
  }
  C.path = path;

  /* Runs of consecutive non-null points so gaps stay gaps */
  const runs = (pts) => {
    const out = [];
    let cur = [];
    pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { out.push(cur); cur = []; } });
    if (cur.length) out.push(cur);
    return out;
  };

  /* ---------- Ring ----------
     o.glyph: the FloraScore glyph, a plain circle that names FloraScore and holds no value: no arc, no band, nothing
     filling toward 100 (Oct 28, the refresh: a ring filling toward 100 reads as a grade). For the studio to take back */
  C.ring = (o) => {
    if (o.glyph) {
      const z = o.size || 16, w = o.stroke || 1.6, rr = n1(z / 2 - w / 2);
      return `<svg class="c-ring c-ring--glyph ${o.cls || ""}" viewBox="0 0 ${z} ${z}" width="${z}" height="${z}" aria-hidden="true"><circle class="c-ring-glyph" cx="${z / 2}" cy="${z / 2}" r="${rr}" stroke-width="${w}"/></svg>`;
    }
    const size = o.size || 132, sw = o.stroke || 11, r = (size - sw) / 2 - (o.band ? 8 : 1), c = size / 2;
    return `<svg class="c-ring ${o.cls || ""}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(o.aria || `Score ${o.value} out of 100`)}">
      <circle class="c-ring-trk" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>
      ${o.band ? `<circle class="c-ring-band" cx="${c}" cy="${c}" r="${n1(r + sw / 2 + 4)}" stroke-width="3" pathLength="100" stroke-dasharray="${o.band[1] - o.band[0]} 100" stroke-dashoffset="${-o.band[0]}" transform="rotate(-90 ${c} ${c})"><title>Your usual range</title></circle>` : ""}
      <circle class="c-ring-arc" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}" pathLength="100" style="--v:${o.value}" transform="rotate(-90 ${c} ${c})"/>
    </svg>`;
  };

  /* ---------- Sparkline with a usual band ---------- */
  C.spark = (vals, o = {}) => {
    const w = o.w || 300, h = o.h || 56, pad = o.pad == null ? 5 : o.pad;
    const nums = vals.filter((v) => v != null);
    const min = o.min != null ? o.min : Math.min(...nums, o.band ? o.band[0] : Infinity) - 2;
    const max = o.max != null ? o.max : Math.max(...nums, o.band ? o.band[1] : -Infinity) + 2;
    const x = lin(0, vals.length - 1, pad, w - pad), y = lin(min, max, h - pad, pad);
    const pts = vals.map((v, i) => (v == null ? null : [x(i), y(v)]));
    const last = pts.filter(Boolean).slice(-1)[0];
    const segs = runs(pts);
    return `<svg class="c-spark ${o.cls || ""}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(o.aria || "Trend")}">
      ${o.band ? `<rect class="c-band" x="0" y="${n1(y(o.band[1]))}" width="${w}" height="${n1(y(o.band[0]) - y(o.band[1]))}" rx="2"/>` : ""}
      ${o.area && segs.length ? segs.map((s) => `<path class="c-area" d="${path(s)}L${n1(s[s.length - 1][0])},${h}L${n1(s[0][0])},${h}Z"/>`).join("") : ""}
      ${segs.map((s) => `<path class="c-line c-draw" pathLength="1" d="${path(s)}"/>`).join("")}
      ${last ? `<circle class="c-end" cx="${n1(last[0])}" cy="${n1(last[1])}" r="${o.r || 3.6}"/>` : ""}
    </svg>`;
  };

  /* ---------- Range bar (HTML): where a value sits against a usual range ----------
     A null value draws the band with no dot (no score today, or a flagged today read against nothing) */
  C.range = (o) => {
    const p = (v) => Math.max(0, Math.min(100, ((v - o.min) / (o.max - o.min)) * 100));
    const lo = p(o.lo), hi = p(o.hi), has = o.value != null, v = has ? p(o.value) : 0;
    return `<div class="c-range ${o.state ? "is-" + o.state : ""}" role="img" aria-label="${esc(o.aria || "")}">
      <div class="c-range-trk"><i class="c-range-band" style="left:${n1(lo)}%;width:${n1(hi - lo)}%"></i>${has ? `<i class="c-range-dot" style="left:${n1(v)}%"></i>` : ""}</div>
      ${o.ticks === false ? "" : `<div class="c-range-lbl"><span class="c-range-mid" style="left:${n1(Math.max(28, Math.min(72, (lo + hi) / 2)))}%">${esc(o.fmt ? o.fmt(o.lo) : o.lo)} to ${esc(o.fmt ? o.fmt(o.hi) : o.hi)}${o.unit ? " " + esc(o.unit) : ""}</span></div>`}
    </div>`;
  };

  /* ---------- Line chart with band, highlighted points, x ticks and optional event rows ---------- */
  C.line = (o) => {
    const w = o.w || 342, top = 14, left = o.left == null ? 30 : o.left, right = 10;
    const evRows = o.events || [];
    const plotH = o.h || 170, axisH = 20, evH = evRows.length ? evRows.length * 16 + 8 : 0;
    const H = top + plotH + axisH + evH;
    const n = o.points.length;
    const x = lin(0, Math.max(1, n - 1), left + 4, w - right - 4), y = lin(o.yMin, o.yMax, top + plotH, top);
    const gid = id("g");
    const pts = o.points.map((p, i) => (p.y == null ? null : [x(i), y(p.y)]));
    const segs = runs(pts);
    const yT = (o.yTicks || []).map((v) => `<g class="c-ytick"><line x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/><text x="${left - 6}" y="${n1(y(v)) + 3.5}" text-anchor="end">${esc(o.yFmt ? o.yFmt(v) : v)}</text></g>`).join("");
    const xT = (o.xTicks || []).map((t) => `<text class="c-xtick" x="${n1(x(t.i))}" y="${top + plotH + 15}" text-anchor="${t.anchor || "middle"}">${esc(t.label)}</text>`).join("");
    const band = o.band ? `<rect class="c-band" x="${left}" y="${n1(y(o.band[1]))}" width="${w - left - right}" height="${n1(y(o.band[0]) - y(o.band[1]))}"/>${o.bandLabel ? `<text class="c-band-lbl" x="${w - right - 4}" y="${n1(y(o.band[1])) + 11}" text-anchor="end">${esc(o.bandLabel)}</text>` : ""}` : "";
    const dotR = n > 60 ? 2.2 : n > 20 ? 3 : 4.2;
    const dots = o.points.map((p, i) => {
      if (p.y == null) return "";
      const cls = p.cls || "";
      const show = o.dots === "all" || cls || i === n - 1;
      return `<g class="c-pt ${cls}" data-tip="${esc(p.tip || "")}" style="--i:${i}">${show ? `<circle class="c-dot" cx="${n1(x(i))}" cy="${n1(y(p.y))}" r="${i === n - 1 ? dotR + 1.4 : dotR}"/>` : ""}<rect class="c-hit" x="${n1(x(i) - (w - left) / n / 2)}" y="${top}" width="${n1((w - left) / n)}" height="${plotH}"/></g>`;
    }).join("");
    const ev = evRows.map((row, ri) => {
      const yy = top + plotH + axisH + 6 + ri * 16;
      return `<g class="c-ev c-ev--${row.key}"><text class="c-ev-lbl" x="${left - 6}" y="${yy + 8}" text-anchor="end">${esc(row.short || "")}</text><line class="c-ev-base" x1="${left}" x2="${w - right}" y1="${yy + 5}" y2="${yy + 5}"/>${row.idx.map((i) => `<rect class="c-ev-mark" x="${n1(x(i) - Math.max(1.5, (w - left) / n / 2 - 1))}" y="${yy}" width="${n1(Math.max(3, (w - left) / n - 2))}" height="10" rx="2" data-tip="${esc(row.tip ? row.tip(i) : row.label)}"/>`).join("")}</g>`;
    }).join("");
    return `<svg class="c-chart c-linechart ${o.cls || ""}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(o.aria || "")}">
      <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="c-grad-a"/><stop offset="1" class="c-grad-b"/></linearGradient></defs>
      ${yT}${band}
      ${o.area ? segs.map((s) => `<path class="c-area" fill="url(#${gid})" d="${path(s)}L${n1(s[s.length - 1][0])},${top + plotH}L${n1(s[0][0])},${top + plotH}Z"/>`).join("") : ""}
      ${segs.map((s) => `<path class="c-line c-draw" pathLength="1" d="${path(s)}"/>`).join("")}
      ${o.avg != null ? `<line class="c-avg" x1="${left}" x2="${w - right}" y1="${n1(y(o.avg))}" y2="${n1(y(o.avg))}"/>` : ""}
      ${dots}${xT}${ev}
    </svg>`;
  };

  /* ---------- Bars with usual band and optional rolling average ---------- */
  C.bars = (o) => {
    const w = o.w || 342, top = 16, left = o.left == null ? 24 : o.left, right = 8, plotH = o.h || 150, axisH = 20;
    const n = o.values.length, H = top + plotH + axisH;
    const slot = (w - left - right) / n, bw = Math.min(24, Math.max(3, slot * 0.62));
    const y = lin(0, o.yMax, top + plotH, top);
    const xc = (i) => left + slot * i + slot / 2;
    const band = o.band ? `<rect class="c-band" x="${left}" y="${n1(y(o.band[1]))}" width="${w - left - right}" height="${n1(y(o.band[0]) - y(o.band[1]))}"/>` : "";
    const shade = (o.shade || []).map((i) => `<rect class="c-shade" x="${n1(left + slot * i)}" y="${top}" width="${n1(slot)}" height="${plotH}"/>`).join("");
    const yT = (o.yTicks || []).map((v) => `<g class="c-ytick"><line x1="${left}" x2="${w - right}" y1="${n1(y(v))}" y2="${n1(y(v))}"/><text x="${left - 6}" y="${n1(y(v)) + 3.5}" text-anchor="end">${esc(o.yFmt ? o.yFmt(v) : v)}</text></g>`).join("");
    const bars = o.values.map((b, i) => {
      const hgt = Math.max(b.v > 0 ? 2 : 0, y(0) - y(b.v));
      return `<g class="c-barg ${b.cls || ""}" data-tip="${esc(b.tip || "")}" style="--i:${i}"><rect class="c-hit" x="${n1(left + slot * i)}" y="${top}" width="${n1(slot)}" height="${plotH}"/>${b.v > 0 ? `<rect class="c-bar" x="${n1(xc(i) - bw / 2)}" y="${n1(y(0) - hgt)}" width="${n1(bw)}" height="${n1(hgt)}" rx="${Math.min(3, bw / 2)}"/>` : `<rect class="c-bar c-bar--zero" x="${n1(xc(i) - bw / 2)}" y="${n1(y(0) - 1.5)}" width="${n1(bw)}" height="1.5"/>`}${o.labels ? `<text class="c-barval" x="${n1(xc(i))}" y="${n1(y(0) - hgt - 5)}" text-anchor="middle">${esc(b.label != null ? b.label : b.v)}</text>` : ""}</g>`;
    }).join("");
    const avg = o.avg ? `<path class="c-avgline c-draw" pathLength="1" d="${path(o.avg.map((v, i) => (v == null ? null : [xc(i), y(v)])).filter(Boolean))}"/>` : "";
    const xT = (o.xTicks || []).map((t) => `<text class="c-xtick" x="${n1(xc(t.i))}" y="${top + plotH + 15}" text-anchor="${t.anchor || "middle"}">${esc(t.label)}</text>`).join("");
    return `<svg class="c-chart c-barchart ${o.cls || ""}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(o.aria || "")}">${shade}${yT}${band}${bars}${avg}<line class="c-base" x1="${left}" x2="${w - right}" y1="${top + plotH}" y2="${top + plotH}"/>${xT}</svg>`;
  };

  /* ---------- Histogram (bins with a bracketed usual range) ---------- */
  C.hist = (o) => {
    const w = o.w || 342, top = 22, left = 8, right = 8, plotH = o.h || 130, axisH = 22, H = top + plotH + axisH;
    const n = o.bins.length, slot = (w - left - right) / n, bw = Math.min(40, slot - 6);
    const max = Math.max(1, ...o.bins.map((b) => b.count));
    const y = lin(0, max, top + plotH, top + 4);
    const total = o.bins.reduce((s, b) => s + b.count, 0) || 1;
    const bars = o.bins.map((b, i) => {
      const hgt = Math.max(b.count ? 3 : 0, y(0) - y(b.count));
      const cx = left + slot * i + slot / 2;
      return `<g class="c-barg ${b.inUsual ? "is-usual" : ""}" data-tip="${esc(`${b.label}: ${b.count} visit${b.count === 1 ? "" : "s"} (${Math.round((b.count / total) * 100)}%)`)}" style="--i:${i}"><rect class="c-hit" x="${n1(left + slot * i)}" y="${top}" width="${n1(slot)}" height="${plotH}"/>${hgt ? `<rect class="c-bar" x="${n1(cx - bw / 2)}" y="${n1(y(0) - hgt)}" width="${n1(bw)}" height="${n1(hgt)}" rx="3"/>` : ""}<text class="c-barval" x="${n1(cx)}" y="${n1(y(0) - hgt - 5)}" text-anchor="middle">${Math.round((b.count / total) * 100)}%</text><text class="c-xtick" x="${n1(cx)}" y="${top + plotH + 15}" text-anchor="middle">${esc(b.short || b.label)}</text></g>`;
    }).join("");
    const ui = o.bins.map((b, i) => (b.inUsual ? i : -1)).filter((i) => i >= 0);
    const bracket = ui.length ? `<g class="c-bracket"><path d="M${n1(left + slot * ui[0] + 3)},${top - 2} v-6 H${n1(left + slot * (ui[ui.length - 1] + 1) - 3)} v6"/><text x="${n1(left + (slot * (ui[0] + ui[ui.length - 1] + 1)) / 2)}" y="${top - 11}" text-anchor="middle">${esc(o.usualLabel || "Your usual")}</text></g>` : "";
    return `<svg class="c-chart c-hist ${o.cls || ""}" viewBox="0 0 ${w} ${H + 8}" role="img" aria-label="${esc(o.aria || "")}"><g transform="translate(0 8)">${bracket}${bars}<line class="c-base" x1="${left}" x2="${w - right}" y1="${top + plotH}" y2="${top + plotH}"/></g></svg>`;
  };

  /* ---------- 24-hour clock: visits spiral outward from oldest (inner) to newest (outer) ---------- */
  C.clock = (o) => {
    const size = o.size || 300, c = size / 2, R = size / 2 - (o.pad != null ? o.pad : 26), r0 = R * (o.hub || 0.38);
    const ang = (h) => (h / 24) * Math.PI * 2 - Math.PI / 2;
    const pt = (h, rr) => [c + Math.cos(ang(h)) * rr, c + Math.sin(ang(h)) * rr];
    const arc = (h0, h1, rr) => {
      const [x0, y0] = pt(h0, rr), [x1, y1] = pt(h1, rr);
      const large = (h1 - h0) / 24 > 0.5 ? 1 : 0;
      return `M${n1(x0)},${n1(y0)} A${rr},${rr} 0 ${large} 1 ${n1(x1)},${n1(y1)}`;
    };
    const ticks = Array.from({ length: 24 }, (_, h) => {
      const [x0, y0] = pt(h, R + 4), [x1, y1] = pt(h, R + (h % 6 === 0 ? 11 : 7));
      return `<line class="c-clock-tick${h % 6 === 0 ? " is-major" : ""}" x1="${n1(x0)}" y1="${n1(y0)}" x2="${n1(x1)}" y2="${n1(y1)}"/>`;
    }).join("");
    const labels = [[0, "12 AM"], [6, "6 AM"], [12, "12 PM"], [18, "6 PM"]].map(([h, l]) => {
      const [x, y] = pt(h, R + 20);
      return `<text class="c-clock-lbl" x="${n1(x)}" y="${n1(y + 3.5)}" text-anchor="middle">${l}</text>`;
    }).join("");
    const win = o.window ? `<path class="c-clock-win" d="${arc(o.window[0], o.window[1], (R + r0) / 2)}" stroke-width="${n1(R - r0 + 8)}"/>` : "";
    const rings = [0.33, 0.66, 1].map((k) => `<circle class="c-clock-ring" cx="${c}" cy="${c}" r="${n1(r0 + (R - r0) * k)}"/>`).join("");
    const dots = o.points.map((p, i) => {
      const [x, y] = pt(p.t, r0 + (R - r0) * p.age);
      return `<circle class="c-clock-dot ${p.cls || ""}" cx="${n1(x)}" cy="${n1(y)}" r="${p.r || 3.2}" data-tip="${esc(p.tip || "")}" style="--i:${i}"/>`;
    }).join("");
    const hand = o.hand != null ? (() => { const [x, y] = pt(o.hand, R); return `<line class="c-clock-hand" x1="${c}" y1="${c}" x2="${n1(x)}" y2="${n1(y)}"/>`; })() : "";
    return `<svg class="c-chart c-clock ${o.cls || ""}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(o.aria || "")}">
      <circle class="c-clock-face" cx="${c}" cy="${c}" r="${R + 2}"/>${rings}${win}${ticks}${labels}${hand}${dots}
      <circle class="c-clock-hub" cx="${c}" cy="${c}" r="${n1(r0 - 6)}"/>
      ${o.center ? `<text class="c-clock-big" x="${c}" y="${c + 4}" text-anchor="middle">${esc(o.center)}</text><text class="c-clock-sub" x="${c}" y="${c + 20}" text-anchor="middle">${esc(o.sub || "")}</text>` : ""}
    </svg>`;
  };

  /* ---------- Day rows on a 24h axis (the calendar, reimagined as a timeline) ---------- */
  C.dayRows = (o) => {
    const w = o.w || 342, left = o.left == null ? 52 : o.left, right = 10, top = 8, rowH = o.rowH || 20, axisH = 20;
    const t0 = o.t0 != null ? o.t0 : 5, t1 = o.t1 != null ? o.t1 : 23;
    const x = lin(t0, t1, left, w - right);
    const H = top + o.rows.length * rowH + axisH;
    const win = o.window ? `<rect class="c-band" x="${n1(x(o.window[0]))}" y="${top - 4}" width="${n1(x(o.window[1]) - x(o.window[0]))}" height="${o.rows.length * rowH + 4}" rx="4"/>` : "";
    const grid = (o.grid || [6, 9, 12, 15, 18, 21]).filter((h) => h > t0 && h < t1).map((h) => `<line class="c-vgrid" x1="${n1(x(h))}" x2="${n1(x(h))}" y1="${top - 4}" y2="${top + o.rows.length * rowH}"/><text class="c-xtick" x="${n1(x(h))}" y="${top + o.rows.length * rowH + 14}" text-anchor="middle">${h === 12 ? "12p" : h > 12 ? h - 12 + "p" : h + "a"}</text>`).join("");
    const rows = o.rows.map((r, ri) => {
      const yy = top + ri * rowH + rowH / 2;
      const marks = r.points.map((p, pi) => {
        const px = x(Math.max(t0, Math.min(t1, p.t)));
        const len = Math.max(4, (x(t0 + p.dur / 60) - x(t0)) * (o.durScale || 6));
        return `<rect class="c-visit ${p.first ? "is-first" : ""} ${p.cls || ""}" x="${n1(px - len / 2)}" y="${n1(yy - (rowH * 0.28))}" width="${n1(len)}" height="${n1(rowH * 0.56)}" rx="${n1(rowH * 0.28)}" data-tip="${esc(p.tip || "")}" style="--i:${ri}"/>`;
      }).join("");
      return `<g class="c-row ${r.cls || ""}"><text class="c-row-lbl" x="${left - 8}" y="${yy + 3.5}" text-anchor="end">${esc(r.label)}</text>${r.flag ? `<circle class="c-row-flag" cx="${left - 3}" cy="${n1(yy)}" r="2.4"><title>${esc(r.flag)}</title></circle>` : ""}<line class="c-row-base" x1="${left}" x2="${w - right}" y1="${n1(yy)}" y2="${n1(yy)}"/>${marks}</g>`;
    }).join("");
    return `<svg class="c-chart c-dayrows ${o.cls || ""}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(o.aria || "")}">${win}${grid}${rows}</svg>`;
  };

  /* ---------- Heat grid (rows × columns) ---------- */
  C.heat = (o) => {
    const w = o.w || 342, left = o.left == null ? 78 : o.left, right = 4, top = 4, gap = o.gap == null ? 2 : o.gap;
    const cols = o.rows[0] ? o.rows[0].cells.length : 0;
    const cw = (w - left - right - gap * (cols - 1)) / Math.max(1, cols), ch = o.cellH || Math.min(18, Math.max(10, cw));
    const H = top + o.rows.length * (ch + gap) + (o.colLabels ? 16 : 0);
    const rows = o.rows.map((r, ri) => {
      const yy = top + ri * (ch + gap);
      return `<g class="c-heat-row"><text class="c-row-lbl" x="${left - 8}" y="${n1(yy + ch / 2 + 3.5)}" text-anchor="end">${esc(r.label)}</text>${r.cells.map((cell, ci) => `<rect class="c-heat l${cell.v == null ? "x" : cell.v}" x="${n1(left + ci * (cw + gap))}" y="${n1(yy)}" width="${n1(cw)}" height="${n1(ch)}" rx="${n1(Math.min(3, cw / 3))}" data-tip="${esc(cell.tip || "")}" style="--i:${ci}"/>`).join("")}</g>`;
    }).join("");
    const cl = (o.colLabels || []).map((t) => `<text class="c-xtick" x="${n1(left + t.i * (cw + gap) + cw / 2)}" y="${n1(H - 3)}" text-anchor="${t.anchor || "middle"}">${esc(t.label)}</text>`).join("");
    return `<svg class="c-chart c-heatgrid ${o.cls || ""}" viewBox="0 0 ${w} ${n1(H)}" role="img" aria-label="${esc(o.aria || "")}">${rows}${cl}</svg>`;
  };

  /* ---------- Strip plot: two groups compared on one axis, medians marked ---------- */
  C.strip = (o) => {
    const w = o.w || 342, left = 12, right = 12, top = 6, rowH = o.rowH || 58, axisH = o.ticks && o.ticks.length ? 22 : 4;
    const H = top + o.groups.length * rowH + axisH;
    const x = lin(o.domain[0], o.domain[1], left, w - right);
    const dotY = (yy) => yy + rowH * 0.62;
    const rows = o.groups.map((g, gi) => {
      const yy = top + gi * rowH;
      const jit = (i) => ((i * 37) % 11) / 10 - 0.5;
      const band = o.band ? `<rect class="c-band" x="${n1(x(o.band[0]))}" y="${n1(yy + rowH * 0.34)}" width="${n1(x(o.band[1]) - x(o.band[0]))}" height="${n1(rowH * 0.56)}" rx="4"/>` : "";
      const mx = g.median != null ? x(g.median) : 0;
      const right2 = mx > w - right - 70;
      return `<g class="c-strip-g ${g.cls || ""}">${band}<text class="c-strip-lbl" x="${left}" y="${n1(yy + rowH * 0.22)}">${esc(g.label)}</text>
        ${g.vals.map((v, i) => `<circle class="c-strip-dot" cx="${n1(x(v.v))}" cy="${n1(dotY(yy) + jit(i) * rowH * 0.22)}" r="${o.r || 4.2}" data-tip="${esc(v.tip || "")}" style="--i:${i}"/>`).join("")}
        ${g.median != null ? `<line class="c-strip-med" x1="${n1(mx)}" x2="${n1(mx)}" y1="${n1(yy + rowH * 0.36)}" y2="${n1(yy + rowH * 0.88)}"/><text class="c-strip-medlbl" x="${n1(right2 ? mx - 7 : mx + 7)}" y="${n1(yy + rowH * 0.22)}" text-anchor="${right2 ? "end" : "start"}">${esc(g.medLabel || "")}</text>` : ""}
      </g>`;
    }).join("");
    const ticks = (o.ticks || []).map((t) => `<text class="c-xtick" x="${n1(x(t.v))}" y="${top + o.groups.length * rowH + 15}" text-anchor="middle">${esc(t.label)}</text><line class="c-vgrid" x1="${n1(x(t.v))}" x2="${n1(x(t.v))}" y1="${top + rowH * 0.3}" y2="${top + o.groups.length * rowH}"/>`).join("");
    return `<svg class="c-chart c-strip ${o.cls || ""}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(o.aria || "")}">${ticks}${rows}</svg>`;
  };

  /* ---------- Waterfall: last week → components → this week ---------- */
  C.waterfall = (o) => {
    const w = o.w || 342, left = 8, right = 8, top = 22, plotH = o.h || 130, axisH = 34, H = top + plotH + axisH;
    const steps = [{ label: o.startLabel, value: o.start, total: true }];
    let run = o.start;
    o.items.forEach((it) => { steps.push({ label: it.label, from: run, to: run + it.delta, delta: it.delta }); run += it.delta; });
    steps.push({ label: o.endLabel, value: o.end, total: true });
    const all = steps.flatMap((s) => (s.total ? [s.value] : [s.from, s.to]));
    const lo = Math.floor(Math.min(...all) - 3), hi = Math.ceil(Math.max(...all) + 2);
    const y = lin(lo, hi, top + plotH, top);
    const slot = (w - left - right) / steps.length, bw = Math.min(34, slot * 0.6);
    const bars = steps.map((s, i) => {
      const cx = left + slot * i + slot / 2;
      if (s.total) {
        return `<g class="c-wf is-total" style="--i:${i}" data-tip="${esc(`${s.label}: ${Math.round(s.value)}`)}"><rect class="c-bar" x="${n1(cx - bw / 2)}" y="${n1(y(s.value))}" width="${n1(bw)}" height="${n1(y(lo) - y(s.value))}" rx="3"/><text class="c-barval" x="${n1(cx)}" y="${n1(y(s.value) - 6)}" text-anchor="middle">${Math.round(s.value)}</text><text class="c-xtick" x="${n1(cx)}" y="${top + plotH + 15}" text-anchor="middle">${esc(s.label)}</text></g>`;
      }
      const a = Math.max(s.from, s.to), b = Math.min(s.from, s.to);
      const hgt = Math.max(1.5, y(b) - y(a));
      const sign = s.delta >= 0 ? "+" : "−";
      return `<g class="c-wf ${s.delta >= 0 ? "is-up" : "is-down"}" style="--i:${i}" data-tip="${esc(`${s.label}: ${sign}${Math.abs(s.delta).toFixed(1)} points`)}"><rect class="c-bar" x="${n1(cx - bw / 2)}" y="${n1(y(a))}" width="${n1(bw)}" height="${n1(hgt)}" rx="2"/><text class="c-barval" x="${n1(cx)}" y="${n1(y(a) - 6)}" text-anchor="middle">${sign}${Math.abs(s.delta).toFixed(1)}</text><text class="c-xtick" x="${n1(cx)}" y="${top + plotH + 15}" text-anchor="middle">${esc(s.label)}</text></g>`;
    }).join("");
    const conn = steps.slice(0, -1).map((s, i) => {
      const v = s.total ? s.value : s.to;
      const x0 = left + slot * i + slot / 2 + bw / 2, x1 = left + slot * (i + 1) + slot / 2 - bw / 2;
      return `<line class="c-wf-conn" x1="${n1(x0)}" x2="${n1(x1)}" y1="${n1(y(v))}" y2="${n1(y(v))}"/>`;
    }).join("");
    return `<svg class="c-chart c-waterfall ${o.cls || ""}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(o.aria || "")}">${conn}${bars}<line class="c-base" x1="${left}" x2="${w - right}" y1="${top + plotH}" y2="${top + plotH}"/></svg>`;
  };

  /* ---------- Segmented bar (HTML) ----------
     The tooltip gives the count a person logged, never a percent of it (the refresh, Oct 28) */
  C.seg = (parts, o = {}) => {
    const total = parts.reduce((s, p) => s + p.v, 0) || 1;
    return `<div class="c-seg ${o.cls || ""}" role="img" aria-label="${esc(o.aria || parts.map((p) => `${p.label} ${p.v}`).join(", "))}">${parts.map((p, i) => (p.v ? `<i class="c-seg-part ${p.cls || ""}" style="--w:${n1((p.v / total) * 100)}%;--i:${i}" data-tip="${esc(`${p.label}: ${p.v}`)}" title="${esc(`${p.label}: ${p.v}`)}"></i>` : "")).join("")}</div>`;
  };

  /* ---------- Strength meter (HTML) ---------- */
  C.meter = (k, label) => `<span class="c-meter" data-k="${k}" aria-label="${esc(label)}"><i></i><i></i><i></i><em>${esc(label)}</em></span>`;
})();
