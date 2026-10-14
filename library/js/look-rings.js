/* Look: Rings. The closest of the three to Oura: one ring up front, parts you can see as rings, calm charts that draw
   themselves. FloraScore sits on a dark hero card (Forest on light, Card 2 on dark) as a Ray ring with the usual range
   drawn as a band on its own outer track. Every other card reads a day, a part or an answer as a ring or a dot.
   Every number is read from D; nothing is typed. Colours: the reading is --ap-chart (Ray on the hero), your usual is
   Plum on light and Ray on dark, a shift either way is Gold, context is Teal. Every rule in look-rings.css sits under
   .lk-rings. */
(function () {
  const TAU = Math.PI * 2;
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* a point on a circle: f is the share of a full turn, clockwise from 12 o'clock */
  const pol = (cx, cy, r, f) => [r1(cx + r * Math.sin(f * TAU)), r1(cy - r * Math.cos(f * TAU))];
  /* an arc path, clockwise from share a to share b of a turn (a full turn draws as two halves) */
  const arc = (cx, cy, r, a, b) => {
    const span = b - a;
    if (span <= 0) return "";
    if (span >= 0.9999) {
      const [x0, y0] = pol(cx, cy, r, a), [xm, ym] = pol(cx, cy, r, a + 0.5);
      return `M${x0},${y0}A${r},${r} 0 1 1 ${xm},${ym}A${r},${r} 0 1 1 ${x0},${y0}`;
    }
    const [x0, y0] = pol(cx, cy, r, a), [x1, y1] = pol(cx, cy, r, b);
    return `M${x0},${y0}A${r},${r} 0 ${span > 0.5 ? 1 : 0} 1 ${x1},${y1}`;
  };
  /* n equal segments round a ring (or round a 270° gauge), with a small gap between them */
  const segs = (cx, cy, r, n, gapPx, a0 = 0, sweep = 1) => {
    const g = Math.min(0.45, gapPx / (TAU * r) * n) / n; /* the gap as a share of a turn */
    return Array.from({ length: n }, (_, i) => arc(cx, cy, r, a0 + (sweep * i) / n + g / 2, a0 + (sweep * (i + 1)) / n - g / 2));
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const sign = (v, dec = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dec)}`;
  const hourLbl = (h, edge) => { const hh = Math.round(h) % 24, ap = hh >= 12 ? "PM" : "AM", n = hh % 12 || 12; return edge ? `${n} ${ap}` : `${n}`; };
  const DOWI = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const DOWL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const lower1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

  /* ---------- shared card parts ---------- */
  const card = (x, cls, label, inner) => `<article class="rg ${cls}" aria-label="${x.esc(label)}">${inner}</article>`;
  const head = (x, k, side) => `<header class="rg-h"><span class="rg-k">${x.esc(k)}</span>${side || ""}</header>`;
  const chip = (x, kind, t) => `<span class="rg-chip rg-chip--${kind}">${x.esc(t)}</span>`;
  const num = (v, dec, dur) => `<b class="rg-n" data-count="${v}"${dec ? ` data-dec="${dec}"` : ""} data-dur="${dur || 1000}">${dec ? Number(v).toFixed(dec) : v}</b>`;
  /* the lead: a big light numeral, its unit, then the answer as a sentence */
  const lead = (x, n, of, ans) => `<div class="rg-lead"><p class="rg-big">${n}${of ? `<span class="rg-of">${x.esc(of)}</span>` : ""}</p>${ans ? `<p class="rg-ans">${x.esc(ans)}</p>` : ""}</div>`;
  const legend = (x, items) => `<ul class="rg-legend">${items.filter(Boolean).map(([sw, t]) => `<li><i class="rg-sw rg-sw--${sw}"></i>${x.esc(t)}</li>`).join("")}</ul>`;
  /* the learning ring: one segment per day until Florin knows your usual */
  const learnRing = (x, L, size, cls) => {
    const c = size / 2, r = c - 8;
    const s = segs(c, c, r, L.of, 4);
    return `<svg class="rg-svg rg-learn ${cls || ""}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${x.esc(`Day ${L.day} of ${L.of}. Florin is still learning your usual.`)}">
      ${s.map((d, i) => `<path class="rg-seg${i < L.day ? " is-on" : ""}" d="${d}" style="--i:${i}"/>`).join("")}
    </svg>`;
  };
  const learnNote = (x, D, what) => `<p class="rg-note">${x.esc(`${what} Day ${D.learning.day} of ${D.learning.of}.`)}</p>`;

  /* the state of one day, in words and as a class */
  const STATE = {
    usual: ["is-usual", "Within your usual"],
    shifted: ["is-shift", "Shifted"],
    unsure: ["is-unsure", "Could be either"],
    logged: ["is-logged", "Logged"],
    nocount: ["is-nocount", "Logged, no BMs said"],
    none: ["is-none", "No logs"]
  };
  const stateOf = (d) => (d.pending ? ["is-pending", "Not logged yet"] : STATE[d.state] || STATE.none);
  /* a small day ring: the arc is that day's FloraScore, its colour the day's state */
  const dayRing = (x, d, size, sw) => {
    const c = size / 2, r = c - sw / 2 - 1;
    const [cls] = stateOf(d);
    const hasArc = d.logged && d.state !== "nocount";
    const v = d.score != null ? clamp(d.score, 0, 100) / 100 : 1;
    return `<svg class="rg-day ${cls}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      ${cls === "is-shift" ? `<circle class="rg-day-fill" cx="${c}" cy="${c}" r="${r1(r - sw / 2)}"/>` : ""}
      <circle class="rg-day-trk" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>
      ${hasArc ? `<path class="rg-day-arc rg-draw" d="${arc(c, c, r, 0, v)}" stroke-width="${sw}" pathLength="1"/>` : ""}
    </svg>`;
  };

  /* ---------- FloraScore ---------- */
  function score(D, x) {
    const S = D.score, esc = x.esc;
    if (!S.usual) {
      const L = S.learning || { day: D.learning ? D.learning.day : 0, of: D.learning ? D.learning.of : 14, line: "" };
      return card(x, "rg--hero rg-score", "FloraScore, still learning your usual", `
        ${head(x, "FloraScore", `<span class="rg-k rg-k--date">${esc(D.todayLabel)}</span>`)}
        <div class="rg-dial">
          ${learnRing(x, L, 280, "rg-learn--hero")}
          <div class="rg-dial-c"><span class="rg-dial-k">Learning</span><b class="rg-dial-n rg-dial-n--sm">Day ${num(L.day, 0, 700)}</b><span class="rg-dial-s">of ${L.of}</span></div>
        </div>
        <p class="rg-rel">${esc(L.line)}</p>
        <p class="rg-how" data-disclaimer>${esc("FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.")}</p>`);
    }
    const v = S.value, u = S.usual;
    const C = 140, R = 94, RU = 115, SW = 15;
    const shift = v != null && (v < u[0] || v > u[1]);
    const ticks = Array.from({ length: 50 }, (_, i) => { const [a, b] = pol(C, C, R - 15, i / 50), [c2, d2] = pol(C, C, R - (i % 5 ? 18 : 21), i / 50); return `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}" class="${i % 5 ? "" : "is-major"}"/>`; }).join("");
    const lbl = (val, f) => { const [lx, ly] = pol(C, C, RU + 17, f); return `<text x="${lx}" y="${r1(ly + 4)}" text-anchor="middle">${val}</text>`; };
    const ends = [u[0], u[1]].map((val) => { const [a, b] = pol(C, C, RU - 7, val / 100), [c2, d2] = pol(C, C, RU + 7, val / 100); return `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/>`; }).join("");
    const labels = u[1] - u[0] < 7 ? "" : lbl(u[0], u[0] / 100) + lbl(u[1], u[1] / 100);
    const [ex, ey] = v != null ? pol(C, C, R, v / 100) : [0, 0];
    const aria = v == null ? `No FloraScore today: not enough logs yet. Your usual range is ${u[0]} to ${u[1]}.` : `FloraScore today ${v}. ${S.relation}, ${u[0]} to ${u[1]}.`;
    const dial = `<svg class="rg-svg" viewBox="0 0 280 280" role="img" aria-label="${esc(aria)}">
        <g class="rg-bezel">${ticks}</g>
        <circle class="rg-trk" cx="${C}" cy="${C}" r="${R}" stroke-width="${SW}"/>
        <circle class="rg-utrk" cx="${C}" cy="${C}" r="${RU}"/>
        <path class="rg-uband rg-draw rg-draw--fast" d="${arc(C, C, RU, u[0] / 100, u[1] / 100)}" pathLength="1"/>
        <g class="rg-uend">${ends}</g>
        <g class="rg-ulbl">${labels}</g>
        ${v != null ? `<path class="rg-arc rg-draw rg-draw--slow" d="${arc(C, C, R, 0, v / 100)}" stroke-width="${SW}" pathLength="1"/>
        <circle class="rg-end${shift ? " is-shift" : ""}" cx="${ex}" cy="${ey}" r="8.5"/>` : ""}
      </svg>`;
    const centre = v != null
      ? `<span class="rg-dial-k">Today</span><b class="rg-dial-n">${num(v, 0, 1300)}</b><span class="rg-dial-s">Your usual ${u[0]} to ${u[1]}</span>`
      : `<span class="rg-dial-k">Today</span><b class="rg-dial-n rg-dial-n--sm">Not yet</b><span class="rg-dial-s">Your usual ${u[0]} to ${u[1]}</span>`;
    const rel = v != null ? S.relation : "Not enough logs yet for a FloraScore today. Log a BM and it fills in.";
    const stats = S.weekAvg != null ? `<dl class="rg-stats">
        <div><dt>This week</dt><dd>${num(S.weekAvg, 0, 1100)}</dd></div>
        <div><dt>Last week</dt><dd>${num(S.lastWeekAvg, 0, 1100)}</dd></div>
        <div><dt>Change</dt><dd>${S.delta ? `<span class="rg-sign">${S.delta > 0 ? "+" : "−"}</span>${num(Math.abs(S.delta), 0, 900)}` : "0"}</dd></div>
      </dl>` : "";
    return card(x, "rg--hero rg-score", `FloraScore today${v != null ? `, ${v}` : ""}`, `
      ${head(x, "FloraScore", `<span class="rg-k rg-k--date">${esc(D.todayLabel)}</span>`)}
      <div class="rg-dial">${dial}<div class="rg-dial-c">${centre}</div></div>
      <p class="rg-rel${shift ? " is-shift" : ""}">${v != null ? '<i aria-hidden="true"></i>' : ""}${esc(rel)}</p>
      <ul class="rg-legend rg-legend--hero rg-legend--c">${v != null ? `<li><i class="rg-sw rg-sw--ring"></i>Today, ${v}</li>` : ""}<li><i class="rg-sw rg-sw--uband"></i>Your usual, ${u[0]} to ${u[1]}</li>${shift ? `<li><i class="rg-sw rg-sw--shiftdot"></i>Outside your usual</li>` : ""}</ul>
      ${stats}
      <p class="rg-how" data-disclaimer>${esc(S.how)}</p>`);
  }

  /* ---------- the four parts ---------- */
  function parts(D, x) {
    const S = D.score, esc = x.esc, P = S.parts || [];
    const RADII = [90, 71, 52, 33], SW = 12, C = 100;
    if (!P.length) {
      const rings = RADII.map((r) => `<circle class="rg-trk" cx="${C}" cy="${C}" r="${r}" stroke-width="${SW}"/>`).join("");
      return card(x, "rg--hero rg-parts", "The four parts of FloraScore, not started yet", `
        ${head(x, "What makes up the score")}
        <div class="rg-parts-top">
          <svg class="rg-svg rg-conc" viewBox="0 0 200 200" role="img" aria-label="${esc("The four parts start with your FloraScore.")}">${rings}</svg>
          <div class="rg-parts-sum"><p class="rg-ans rg-ans--hero">${esc("Timing, How often, Form and Comfort fill in with your FloraScore.")}</p></div>
        </div>
        ${D.learning ? learnNote(x, D, `Florin is learning your usual first.`) : ""}`);
    }
    const rings = P.map((p, i) => `<circle class="rg-trk" cx="${C}" cy="${C}" r="${RADII[i]}" stroke-width="${SW}"/>
      <path class="rg-arc rg-draw" style="--i:${i}" d="${arc(C, C, RADII[i], 0, clamp(p.now, 0, 100) / 100)}" stroke-width="${SW}" pathLength="1"/>`).join("");
    const befores = P.map((p, i) => { const [a, b] = pol(C, C, RADII[i] - SW / 2 - 1, clamp(p.before, 0, 100) / 100), [c2, d2] = pol(C, C, RADII[i] + SW / 2 + 1, clamp(p.before, 0, 100) / 100); return `<line class="rg-before-halo" style="--i:${i}" x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/><line class="rg-before" style="--i:${i}" x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/>`; }).join("");
    const icon = (i) => `<svg class="rg-picon" viewBox="0 0 24 24" aria-hidden="true">${[11, 8.4, 5.8, 3.2].map((r, k) => `<circle cx="12" cy="12" r="${r}"${k === i ? ' class="is-on"' : ""}/>`).join("")}</svg>`;
    const wordOf = (p) => (p.delta >= 0.5 ? ["is-up", "Higher than last week"] : p.delta <= -0.5 ? ["is-down", "Lower than last week"] : ["is-same", "About the same"]);
    const rows = P.map((p, i) => {
      const [wc, w] = wordOf(p);
      return `<li class="rg-part">
        ${icon(i)}
        <div class="rg-part-main">
          <p class="rg-part-top"><b>${esc(p.label)}</b><span class="rg-part-wt">${Math.round(p.weight * 100)}%</span><em class="${wc}">${esc(w)}<span>${sign(p.delta, 1)}</span></em></p>
          <p class="rg-part-bar"><i role="img" aria-label="${esc(`${p.label}: ${p.now} this week, ${p.before} last week`)}"><b style="--w:${clamp(p.now, 0, 100)}%;--i:${i}"></b><u style="left:${clamp(p.before, 0, 100)}%"></u></i><span>${p.now}</span></p>
        </div>
      </li>`;
    }).join("");
    const moved = P.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const ans = S.delta ? `${Math.abs(S.delta)} ${Math.abs(S.delta) === 1 ? "point" : "points"} ${S.delta > 0 ? "higher" : "lower"} than last week. ${moved.label} moved it most.` : `About the same as last week. ${moved.label} moved most.`;
    const aria = `This week ${S.weekAvg}, last week ${S.lastWeekAvg}. ${P.map((p) => `${p.label} ${p.now}, last week ${p.before}`).join(". ")}.`;
    return card(x, "rg--hero rg-parts", "The four parts of FloraScore, this week against last", `
      ${head(x, "What makes up the score", `<span class="rg-k rg-k--date">This week</span>`)}
      <div class="rg-parts-top">
        <svg class="rg-svg rg-conc" viewBox="0 0 200 200" role="img" aria-label="${esc(aria)}">${rings}${befores}</svg>
        <div class="rg-parts-sum">
          <p class="rg-big rg-big--hero">${num(S.weekAvg, 0, 1100)}<span class="rg-of">this week</span></p>
          <p class="rg-ans rg-ans--hero">${esc(ans)}</p>
        </div>
      </div>
      <ul class="rg-partlist">${rows}</ul>
      <ul class="rg-legend rg-legend--hero"><li><i class="rg-sw rg-sw--ring"></i>This week</li><li><i class="rg-sw rg-sw--tick"></i>Last week</li><li><span class="rg-mono">%</span>Share of the score</li></ul>
      <p class="rg-how" data-disclaimer>Each part reads you against your own usual, weighted as shown. FloraScore isn't a medical score, and a lower number isn't a diagnosis.</p>`);
  }

  /* ---------- FloraScore over 30 days ---------- */
  function trend(D, x) {
    const S = D.score, esc = x.esc;
    if (!S.usual || !S.series || !S.series[30].some((s) => s.value != null)) {
      return card(x, "rg-trend", "FloraScore over 30 days, not started yet", `
        ${head(x, "FloraScore · 30 days")}
        ${lead(x, "Not yet", "", "Your 30-day line starts with your FloraScore, once Florin knows your usual.")}
        <div class="rg-empty-plot" role="img" aria-label="${esc("No FloraScore yet.")}"><span></span><span></span><span></span></div>
        ${D.learning ? learnNote(x, D, "Florin is learning your usual.") : ""}`);
    }
    const ser = S.series[30], u = S.usual;
    const vals = ser.map((s) => s.value);
    const nums = vals.filter((v) => v != null);
    const W = 318, top = 24, left = 28, right = 12, plotH = 132, bottom = 26, H = top + plotH + bottom;
    const lo = Math.floor((Math.min(...nums, u[0]) - 4) / 5) * 5, hi = Math.ceil((Math.max(...nums, u[1]) + 3) / 5) * 5;
    const xs = x.lin(0, ser.length - 1, left + 6, W - right - 6), ys = x.lin(lo, hi, top + plotH, top);
    const pts = vals.map((v, i) => (v == null ? null : [xs(i), ys(v)]));
    const runs = []; let cur = [];
    pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { runs.push(cur); cur = []; } });
    if (cur.length) runs.push(cur);
    const gid = `rg-g-${x.uid}`;
    const step = (hi - lo) / 10 >= 2 ? 10 : 5;
    const yt = []; for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) yt.push(t);
    const ytl = [lo, hi].filter((t) => Math.abs(t - u[0]) >= 4 && Math.abs(t - u[1]) >= 4);
    const within = nums.filter((v) => v >= u[0] && v <= u[1]).length, above = nums.filter((v) => v > u[1]).length, below = nums.filter((v) => v < u[0]).length;
    const li = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
    const last = ser[li];
    const mid = Math.floor((ser.length - 1) / 2);
    const xticks = [[0, ser[0].label, "start"], [mid, ser[mid].label, "middle"], [ser.length - 1, ser[ser.length - 1].today ? "Today" : ser[ser.length - 1].label, "end"]];
    const dots = vals.map((v, i) => (v == null || i === li || (v >= u[0] && v <= u[1]) ? "" : `<circle class="rg-tdot is-shift" style="--i:${i}" cx="${r1(xs(i))}" cy="${r1(ys(v))}" r="3.6"><title>${esc(`${ser[i].label}: ${v}, ${v > u[1] ? "above" : "below"} your usual range`)}</title></circle>`)).join("");
    const lx = xs(li), ly = ys(last.value);
    const parts2 = [above && `above your usual range on ${plural(above, "day")}`, below && `${above ? "below it" : "below your usual range"} on ${plural(below, "day")}`].filter(Boolean);
    const rel = last.today && last.value === S.value && S.relation ? lower1(S.relation) : last.value < u[0] ? "below your usual range" : last.value > u[1] ? "above your usual range" : "within your usual range";
    const ans = `${parts2.length ? cap(parts2.join(" and ")) : "Every day sat within your usual range"}. ${last.today ? "Today" : `Latest, ${last.label}`}: ${last.value}, ${rel}.`;
    const svg = `<svg class="rg-svg rg-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`FloraScore over 30 days. ${ans} Your usual range is ${u[0]} to ${u[1]}. Latest ${last.value}.`)}">
      <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="rg-ga"/><stop offset=".6" class="rg-gm"/><stop offset="1" class="rg-gb"/></linearGradient></defs>
      ${yt.map((t) => `<g class="rg-yt"><line x1="${left}" x2="${W - right}" y1="${r1(ys(t))}" y2="${r1(ys(t))}"/></g>`).join("")}
      ${ytl.map((t) => `<text class="rg-yl" x="${left - 8}" y="${r1(ys(t) + 3.5)}" text-anchor="end">${t}</text>`).join("")}
      <text class="rg-yl is-usual" x="${left - 8}" y="${r1(ys(u[1]) + 3.5)}" text-anchor="end">${u[1]}</text><text class="rg-yl is-usual" x="${left - 8}" y="${r1(ys(u[0]) + 3.5)}" text-anchor="end">${u[0]}</text>
      <rect class="rg-band" x="${left}" y="${r1(ys(u[1]))}" width="${W - left - right}" height="${r1(ys(u[0]) - ys(u[1]))}" rx="4"/>
      <line class="rg-band-edge" x1="${left}" x2="${W - right}" y1="${r1(ys(u[1]))}" y2="${r1(ys(u[1]))}"/><line class="rg-band-edge" x1="${left}" x2="${W - right}" y1="${r1(ys(u[0]))}" y2="${r1(ys(u[0]))}"/>
      ${runs.map((s) => `<path class="rg-area" fill="url(#${gid})" d="${x.C.path(s)}L${r1(s[s.length - 1][0])},${top + plotH}L${r1(s[0][0])},${top + plotH}Z"/>`).join("")}
      ${runs.map((s) => `<path class="rg-line rg-draw rg-draw--slow" pathLength="1" d="${x.C.path(s)}"/>`).join("")}
      ${dots}
      <circle class="rg-now-halo" cx="${r1(lx)}" cy="${r1(ly)}" r="9"/>
      <circle class="rg-now" cx="${r1(lx)}" cy="${r1(ly)}" r="4.5"/>
      <text class="rg-now-lbl" x="${r1(lx)}" y="${r1(ly - 14)}" text-anchor="end">${last.value}</text>
      ${xticks.map(([i, t, a]) => `<text class="rg-xt${t === "Today" ? " is-today" : ""}" x="${r1(i === 0 ? left : i === ser.length - 1 ? W - right : xs(i))}" y="${H - 6}" text-anchor="${a}">${esc(t)}</text>`).join("")}
    </svg>`;
    return card(x, "rg-trend", "FloraScore over 30 days", `
      ${head(x, "FloraScore · 30 days", chip(x, "usual", `Usual ${u[0]} to ${u[1]}`))}
      ${lead(x, num(within), `of ${nums.length} days within your usual range`, ans)}
      ${svg}
      ${legend(x, [["line", "FloraScore"], ["band", `Your usual, ${u[0]} to ${u[1]}`], (above || below) && ["shift", "Outside your usual"], ["now", last.today ? "Today" : "Latest"]])}`);
  }

  /* ---------- this week ---------- */
  function week(D, x) {
    const esc = x.esc, days = D.days[7];
    const slots = Array(Math.max(0, 7 - days.length)).fill(null).concat(days);
    const logged = days.filter((d) => d.logged);
    const n = (s) => days.filter((d) => d.logged && d.state === s).length;
    const within = n("usual"), shifted = n("shifted"), unsure = n("unsure"), nocount = n("nocount");
    const learning = !!D.learning;
    const cols = slots.map((d, i) => {
      if (!d) return `<li class="rg-wd is-before" aria-hidden="true"><span class="rg-wd-k">&nbsp;</span><span class="rg-wd-ring"><svg class="rg-day is-none" viewBox="0 0 40 40"><circle class="rg-day-trk is-faint" cx="20" cy="20" r="17" stroke-width="4.5"/></svg></span><span class="rg-wd-s">&nbsp;</span><span class="rg-wd-sym"></span></li>`;
      const [, word] = stateOf(d);
      const showScore = d.logged && d.state !== "nocount" && d.score != null;
      const tip = `${d.dow} ${d.label}: ${word}${showScore ? `, FloraScore ${d.score}` : ""}${d.firstText ? `, first BM ${d.firstText}` : ""}${d.sym.length ? `, ${d.sym.map((s) => s.name.toLowerCase()).join(", ")}` : ""}`;
      return `<li class="rg-wd${d.today ? " is-today" : ""}" style="--i:${i}" title="${esc(tip)}">
        <span class="rg-wd-k">${d.today ? "Today" : esc(d.dow)}</span>
        <span class="rg-wd-ring">${dayRing(x, d, 40, 4.5)}<b>${d.date}</b></span>
        <span class="rg-wd-s">${showScore ? d.score : d.pending ? "Not yet" : "&nbsp;"}</span>
        <span class="rg-wd-sym">${d.sym.length ? `<i title="${esc("Symptoms logged")}"></i>` : ""}</span>
      </li>`;
    }).join("");
    const which = (st) => andList(days.filter((d) => (st === "none" ? !d.logged && !d.pending : d.logged && d.state === st)).map((d) => (d.today ? "today" : DOWL[d.dow] || d.dow)));
    const bits = [shifted && `Shifted on ${which("shifted")}`, unsure && `${cap(which("unsure"))} could be either`, nocount && `No BMs said on ${which("nocount")}`, days.some((d) => !d.logged && !d.pending) && `No logs on ${which("none")}`].filter(Boolean);
    const symDays = days.filter((d) => d.sym.length).length;
    const ans = learning ? `Florin is learning your usual, so days show as logged for now. ${bits.length ? bits.join(". ") + "." : ""}`.trim()
      : `${bits.length ? bits.join(". ") : "Every day you logged sat within your usual"}.${symDays ? ` Symptoms on ${plural(symDays, "day")}.` : ""}`;
    const aria = `This week. ${ans} ${days.map((d) => `${d.dow}: ${stateOf(d)[1]}${d.logged && d.score != null && d.state !== "nocount" ? `, ${d.score}` : ""}`).join(". ")}.`;
    const has = (c) => days.some((d) => stateOf(d)[0] === c);
    return card(x, "rg-week", "This week at a glance", `
      ${head(x, "This week", `<span class="rg-k rg-k--date">${esc(days[0].label)} to ${esc(days[days.length - 1].label)}</span>`)}
      ${learning ? lead(x, num(logged.length), `of ${days.length} days logged`, ans) : lead(x, num(within), `of ${logged.length} days within your usual`, ans)}
      <ol class="rg-weekrow" role="img" aria-label="${esc(aria)}">${cols}</ol>
      ${legend(x, [has("is-usual") && ["usual", "Within your usual"], has("is-shift") && ["shiftring", "Shifted"], has("is-unsure") && ["unsure", "Could be either"], has("is-logged") && ["usual-ring", "Logged"], has("is-nocount") && ["hollow", "No BMs said"], (has("is-none") || has("is-pending")) && ["hollow", "No logs"], days.some((d) => d.sym.length) && ["sym", "Symptoms"], !learning && ["arcnote", "Ring: that day's FloraScore"]])}`);
  }

  /* ---------- the last 30 days ---------- */
  function month(D, x) {
    const esc = x.esc, days = D.days[30];
    const off = DOWI[days[0].dow] || 0;
    const cells = Array(off).fill(null).concat(days);
    const n = (s) => days.filter((d) => d.logged && d.state === s).length;
    const logged = days.filter((d) => d.logged).length;
    const within = n("usual"), shifted = n("shifted"), unsure = n("unsure");
    const gaps = days.filter((d) => !d.logged && !d.pending).length;
    const learning = !!D.learning;
    const grid = cells.map((d, i) => {
      if (!d) return `<li class="rg-md is-pad" aria-hidden="true"></li>`;
      const [, word] = stateOf(d);
      return `<li class="rg-md${d.today ? " is-today" : ""}" style="--i:${i}" title="${esc(`${d.dow} ${d.label}: ${word}${d.logged && d.score != null && d.state !== "nocount" ? `, FloraScore ${d.score}` : ""}`)}">${dayRing(x, d, 34, 3.6)}<b>${d.date}</b></li>`;
    }).join("");
    let run = null, cur = null;
    days.forEach((d) => { if (d.logged && d.state === "usual") { cur = cur ? { ...cur, to: d, n: cur.n + 1 } : { from: d, to: d, n: 1 }; if (!run || cur.n > run.n) run = cur; } else cur = null; });
    const extra = [shifted && `${plural(shifted, "day")} shifted`, unsure && `${unsure} could be either`, gaps && `${gaps} had no logs, left as ${gaps === 1 ? "a gap" : "gaps"}`].filter(Boolean);
    const ans = learning ? `${plural(logged, "day")} logged since you started. Days fill in against your usual once Florin knows it.`
      : `${extra.length ? cap(andList(extra)) + "." : ""}${run && run.n > 1 ? ` Your longest run within your usual: ${run.n} days, ${run.from.label} to ${run.to.label}.` : ""}`.trim();
    const has = (c) => days.some((d) => stateOf(d)[0] === c);
    return card(x, "rg-month", "The last 30 days at a glance", `
      ${head(x, learning ? "Since you started" : "Last 30 days", `<span class="rg-k rg-k--date">${esc(days[0].label)} to ${esc(days[days.length - 1].label)}</span>`)}
      ${learning ? lead(x, num(logged), `of ${days.length} days logged`, ans) : lead(x, num(within), `of ${logged} days within your usual`, ans)}
      <div class="rg-cal" role="img" aria-label="${esc(`${learning ? "Since you started" : "The last 30 days"}. ${ans}`)}">
        <ol class="rg-cal-h" aria-hidden="true"><li>M</li><li>T</li><li>W</li><li>T</li><li>F</li><li>S</li><li>S</li></ol>
        <ol class="rg-cal-g">${grid}</ol>
      </div>
      ${legend(x, [has("is-usual") && ["usual", "Within your usual"], has("is-shift") && ["shiftring", "Shifted"], has("is-unsure") && ["unsure", "Could be either"], has("is-logged") && ["usual-ring", "Logged"], (has("is-none") || has("is-pending") || has("is-nocount")) && ["hollow", has("is-nocount") ? "No logs, or no BMs said" : "No logs"], ["todayring", "Today"]])}`);
  }

  /* ---------- timing: the first BM each morning on a morning timeline ---------- */
  function timing(D, x) {
    const esc = x.esc, days = D.days[30], tm = D.timing, u = tm.usual;
    const pts = days.map((d, i) => ({ d, i })).filter((p) => p.d.first != null);
    if (!pts.length) return card(x, "rg-timing", "Timing", `${head(x, "Timing")}${lead(x, "No BMs yet", "", "Your first BM each morning will show here.")}`);
    const firsts = pts.map((p) => p.d.first);
    const t0 = Math.floor(Math.min(...firsts, u ? u[0] : 24) - 0.25), t1 = Math.ceil(Math.max(...firsts, u ? u[1] : 0) + 0.25);
    const W = 318, left = 8, right = 8, binH = 1 / 6; /* 10-minute bins */
    const xs = x.lin(t0, t1, left, W - right);
    const binW = xs(t0 + binH) - xs(t0), R = clamp(binW / 2 - 1.2, 3, 5.2), dy = R * 2 + 2;
    const stack = {};
    const placed = pts.map((p) => { const b = Math.floor((p.d.first - t0) / binH + 1e-6); const k = (stack[b] = (stack[b] || 0) + 1); return { ...p, b, k }; });
    const maxK = Math.max(...placed.map((p) => p.k));
    const newest = placed[placed.length - 1];
    const top = 40, plotH = Math.max(64, maxK * dy + 36), base = top + plotH, H = base + 28;
    const cx = (b) => xs(t0 + (b + 0.5) * binH);
    const later = u ? firsts.filter((f) => f > u[1]).length : 0, earlier = u ? firsts.filter((f) => f < u[0]).length : 0;
    const dots = placed.map((p, j) => {
      const cls = p.d.inWin === false ? " is-shift" : u ? "" : "";
      return `<circle class="rg-mdot${cls}${p === newest ? " is-new" : ""}" style="--i:${j}" cx="${r1(cx(p.b))}" cy="${r1(base - 6 - (p.k - 0.5) * dy)}" r="${r1(R)}"><title>${esc(`${p.d.dow} ${p.d.label}: ${p.d.firstText}${p.d.inWin === false ? ", outside your usual window" : p.d.inWin ? ", in your usual window" : ""}`)}</title></circle>`;
    }).join("");
    const nx = cx(newest.b), ny = base - 6 - (newest.k - 0.5) * dy;
    const hours = []; for (let h = Math.ceil(t0); h <= t1; h++) hours.push(h);
    const nlabel = `${newest.d.today ? "Today" : newest.d.label} ${newest.d.firstText}`;
    const nAnchor = nx > W - 70 ? "end" : nx < 70 ? "start" : "middle";
    const band = u ? `<rect class="rg-band" x="${r1(xs(u[0]))}" y="${top}" width="${r1(xs(u[1]) - xs(u[0]))}" height="${plotH - 6}" rx="8"/>
      <line class="rg-band-edge" x1="${r1(xs(u[0]))}" x2="${r1(xs(u[0]))}" y1="${top}" y2="${base - 6}"/><line class="rg-band-edge" x1="${r1(xs(u[1]))}" x2="${r1(xs(u[1]))}" y1="${top}" y2="${base - 6}"/>
      <text class="rg-band-lbl" x="${r1((xs(u[0]) + xs(u[1])) / 2)}" y="${top - 8}" text-anchor="middle">Your usual ${esc(tm.usualText)}</text>` : "";
    const nWhere = newest.d.inWin === true ? "inside your window" : newest.d.inWin === false ? (newest.d.first > u[1] ? "later than your window" : "earlier than your window") : "";
    const ans = u ? `${later || earlier ? `${cap(andList([later && `${later} came later than your window`, earlier && `${earlier} earlier`].filter(Boolean)))}. ` : "Every first BM came in your window. "}${newest.d.today ? "Today" : `Latest, ${newest.d.label}`}: ${newest.d.firstText}${nWhere ? `, ${nWhere}` : ""}.` : `${plural(pts.length, "morning")} with a first BM so far. Florin learns your usual window by day ${D.learning ? D.learning.of : ""}.`;
    const svg = `<svg class="rg-svg rg-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`First BM each morning, last 30 days. ${ans}${u ? ` Your usual window is ${tm.usualText}.` : ""}`)}">
      ${band}
      ${hours.map((h) => `<line class="rg-vt" x1="${r1(xs(h))}" x2="${r1(xs(h))}" y1="${base - 2}" y2="${base + 4}"/><text class="rg-xt" x="${r1(xs(h))}" y="${base + 18}" text-anchor="middle">${hourLbl(h, h === hours[0] || h === hours[hours.length - 1])}</text>`).join("")}
      <line class="rg-axis" x1="${left}" x2="${W - right}" y1="${base - 2}" y2="${base - 2}"/>
      ${dots}
      <circle class="rg-now-halo" cx="${r1(nx)}" cy="${r1(ny)}" r="${r1(R + 4)}"/>
      <text class="rg-now-lbl" x="${r1(nx)}" y="${r1(ny - R - 9)}" text-anchor="${nAnchor}">${esc(nlabel)}</text>
    </svg>`;
    return card(x, "rg-timing", "Timing of the first BM", `
      ${head(x, "Timing · first BM", u ? chip(x, "usual", tm.usualText) : chip(x, "neutral", "Learning"))}
      ${u ? lead(x, num(tm.inWin30), `of ${tm.mornings30} mornings in your window`, ans) : lead(x, num(pts.length), `${pts.length === 1 ? "morning" : "mornings"} logged`, ans)}
      ${svg}
      ${legend(x, [u ? ["read", "In your window"] : ["read", "First BM"], (later || earlier) && ["shift", "Outside your window"], u && ["band", `Your usual, ${tm.usualText}`], ["now", newest.d.today ? "Today" : "Latest"]])}`);
  }

  /* ---------- how often: beads per day against the usual count ---------- */
  function often(D, x) {
    const esc = x.esc, days = D.days[30], o = D.often, u = o.usual;
    const known = days.filter((d) => d.count != null);
    const inRange = u ? known.filter((d) => d.count >= u[0] && d.count <= u[1]).length : null;
    const maxC = Math.max(3, ...known.map((d) => d.count), u ? u[1] + 1 : 0);
    const W = 318, left = 22, right = 4, top = 16;
    const colW = (W - left - right) / days.length, R = clamp(colW / 2 - 1, 2.6, 4.6), dy = R * 2 + 6;
    const plotH = maxC * dy + 6, base = top + plotH, H = base + 24;
    const cx = (i) => left + colW * (i + 0.5);
    const slotY = (k) => base - 3 - (k - 0.5) * dy; /* centre of the k-th bead, k from 1 */
    const li = days.map((d, i) => (d.count != null ? i : -1)).filter((i) => i >= 0).pop();
    const beads = days.map((d, i) => {
      if (d.count == null) return "";
      const out = u && (d.count < u[0] || d.count > u[1]);
      const tip = `${d.dow} ${d.label}: ${d.count === 0 ? "No BM logged" : plural(d.count, "BM")}${u ? (out ? ", outside your usual" : ", within your usual") : ""}`;
      if (d.count === 0) return `<g style="--i:${i}"><circle class="rg-bead is-zero${out ? " is-shift" : ""}" cx="${r1(cx(i))}" cy="${r1(slotY(1))}" r="${r1(R - 0.6)}"><title>${esc(tip)}</title></circle></g>`;
      return `<g class="rg-beads" style="--i:${i}"><title>${esc(tip)}</title>${Array.from({ length: d.count }, (_, k) => `<circle class="rg-bead${out ? " is-shift" : ""}" style="--k:${k}" cx="${r1(cx(i))}" cy="${r1(slotY(k + 1))}" r="${r1(R)}"/>`).join("")}</g>`;
    }).join("");
    const band = u ? `<rect class="rg-band" x="${left - 2}" y="${r1(base - 3 - u[1] * dy)}" width="${W - left - right + 4}" height="${r1((u[1] - u[0] + 1) * dy)}" rx="4"/>` : "";
    const yl = Array.from({ length: maxC }, (_, k) => `<text class="rg-yl" x="${left - 8}" y="${r1(slotY(k + 1) + 3.5)}" text-anchor="end">${k + 1}</text>`).join("");
    const hl = li != null ? `<circle class="rg-now-halo" cx="${r1(cx(li))}" cy="${r1(slotY(Math.max(1, days[li].count)))}" r="${r1(R + 3.5)}"/>` : "";
    const gaps = days.filter((d) => d.count == null && !d.pending).length;
    const zeros = known.filter((d) => d.count === 0).length;
    const avgWord = !u || o.avg30 == null ? "" : o.avg30 < u[0] ? "below your usual" : o.avg30 > u[1] ? "above your usual" : "within your usual";
    const ans = u ? `${inRange} of ${known.length} days sat within your usual ${o.usualText}. ${zeros ? `${plural(zeros, "day")} with no BM. ` : ""}${gaps ? `${plural(gaps, "day")} not logged, left as a gap.` : ""}`.trim()
      : `${plural(known.length, "day")} with BMs logged so far. Florin learns your usual count by day ${D.learning ? D.learning.of : ""}.`;
    const svg = `<svg class="rg-svg rg-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`BMs a day, last 30 days. Average ${o.avg30} a day${avgWord ? `, ${avgWord}` : ""}. ${ans}`)}">
      ${band}${yl}
      <line class="rg-axis" x1="${left}" x2="${W - right}" y1="${base}" y2="${base}"/>
      ${beads}${hl}
      <text class="rg-xt" x="${left}" y="${H - 6}">${esc(days[0].label)}</text>
      <text class="rg-xt${days[days.length - 1].today ? " is-today" : ""}" x="${W - right}" y="${H - 6}" text-anchor="end">${days[days.length - 1].today ? "Today" : esc(days[days.length - 1].label)}</text>
    </svg>`;
    return card(x, "rg-often", "How often", `
      ${head(x, "How often", u ? chip(x, "usual", o.usualText) : chip(x, "neutral", "Learning"))}
      ${o.avg30 != null ? lead(x, num(o.avg30, 1), `a day on average${avgWord ? `, ${avgWord}` : ""}`, ans) : lead(x, "No BMs yet", "", ans)}
      ${svg}
      ${legend(x, [["read", "One BM"], u && ["band", `Your usual, ${o.usualText}`], known.some((d) => u && (d.count < u[0] || d.count > u[1])) && ["shift", "Outside your usual"], zeros && ["zero", "No BM logged"]])}`);
  }

  /* ---------- form: one ring per form on this option's own scale ---------- */
  function form(D, x) {
    const esc = x.esc, F = D.form, u = F.usual;
    const binned = F.bins.reduce((s, b) => s + b.count, 0);
    const total = F.total30;
    const unbinned = total - binned;
    const either = D.days[30].reduce((s, d) => s + d.forms.filter((f) => f.within == null && u).length, 0);
    const firmer = u ? F.bins.filter((b) => b.k < u[0]).reduce((s, b) => s + b.count, 0) : 0;
    const looser = u ? F.bins.filter((b) => b.k > u[1]).reduce((s, b) => s + b.count, 0) : 0;
    const n = F.bins.length, W = 318, colW = W / n;
    const size = Math.min(42, colW - 6), sw = 4.2, c = size / 2, r = c - sw / 2 - 1;
    const mono = D.mode === "A";
    const firstU = u ? F.bins.findIndex((b) => b.inUsual) : -1, lastU = u ? F.bins.length - 1 - F.bins.slice().reverse().findIndex((b) => b.inUsual) : -1;
    const cols = F.bins.map((b, i) => {
      const cls = b.count ? (u ? (b.inUsual ? "is-in" : "is-shift") : "is-read") : "is-zero";
      return `<li class="rg-fc ${cls}" style="--i:${i}" title="${esc(`${b.label}: ${plural(b.count, "BM")}`)}">
        <span class="rg-fc-ring"><svg class="rg-day" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="rg-day-trk" cx="${c}" cy="${c}" r="${r1(r)}" stroke-width="${sw}"/>${b.count ? `<path class="rg-day-arc rg-draw" pathLength="1" stroke-width="${sw}" d="${arc(c, c, r1(r), 0, Math.max(0.04, b.count / Math.max(1, total)))}"/>` : ""}</svg><b>${b.count}</b></span>
        <span class="rg-fc-l${mono ? " is-mono" : ""}">${esc(b.label)}</span>
      </li>`;
    }).join("");
    const usualBand = u && firstU >= 0 ? `<span class="rg-fband" style="left:${r1((firstU / n) * 100)}%;width:${r1(((lastU - firstU + 1) / n) * 100)}%" aria-hidden="true"><em>Your usual</em></span>` : "";
    const rest = [firmer && `${firmer} firmer`, looser && `${looser} looser`, either && `${either} could be either`].filter(Boolean);
    const topB = F.bins.slice().sort((a, b) => b.count - a.count)[0];
    const nameOf = (b) => (mono ? `Type ${b.label}` : b.label);
    const ans = !total ? "No BMs logged in the last 30 days." : u ? `Your usual forms are ${F.usualText}.${rest.length ? ` ${cap(andList(rest))}.` : " Every BM sat within them."}${topB && topB.count ? ` ${nameOf(topB)} came up most, ${plural(topB.count, "time")}.` : ""}` : `${plural(total, "BM")} logged so far. Florin learns your usual forms by day ${D.learning ? D.learning.of : ""}.`;
    const aria = `Forms, last 30 days. ${ans} ${F.bins.map((b) => `${b.label}: ${b.count}`).join(", ")}.`;
    return card(x, "rg-form", "Form", `
      ${head(x, `Form · ${mono ? "1 to 7" : D.mode === "B" ? "five words" : "seven words"}`, u ? chip(x, "usual", F.usualText) : chip(x, "neutral", "Learning"))}
      ${u ? lead(x, num(F.within30), `of ${total} within your usual forms`, ans) : lead(x, num(total), "BMs logged", ans)}
      <div class="rg-forms" role="img" aria-label="${esc(aria)}">
        ${usualBand}
        <ol class="rg-fcols" style="--n:${n}">${cols}</ol>
        <p class="rg-fscale" aria-hidden="true"><span>Firmer</span><span>Looser</span></p>
      </div>
      ${unbinned > 0 ? `<p class="rg-note">${esc(`${plural(unbinned, "BM")} logged as a word that covers two forms, so not drawn on a single ring.`)}</p>` : ""}
      ${legend(x, [["read", "BMs of that form"], u && ["band", `Your usual, ${F.usualText}`], (firmer || looser) && ["shift", "Outside your usual forms"], ["arcnote", "Ring: share of all BMs"]])}`);
  }

  /* ---------- symptoms: which came up, day by day ---------- */
  function symptoms(D, x) {
    const esc = x.esc, S = D.symptoms, days = D.days[30];
    const rows = S.rows;
    const W = 318, ring = 36;
    const strip = (cells, ri) => {
      const sw = W - ring - 12, cw = sw / cells.length;
      return `<svg class="rg-svg rg-strip" viewBox="0 0 ${r1(sw)} 14" aria-hidden="true">${cells.map((c, i) => {
        const cx = r1(cw * (i + 0.5));
        if (c == null) return "";
        if (c === false) return `<circle class="rg-sd is-none" cx="${cx}" cy="7" r="1.2"/>`;
        if (c === 0) return `<circle class="rg-sd is-unsaid" style="--i:${i}" cx="${cx}" cy="7" r="2.8"/>`;
        return `<circle class="rg-sd is-s${c}" style="--i:${i}" cx="${cx}" cy="7" r="${[0, 2.6, 3.6, 4.8][c]}"/>`;
      }).join("")}${days[cells.length - 1] && days[cells.length - 1].today ? `<line class="rg-sd-today" x1="${r1(cw * (cells.length - 0.5))}" x2="${r1(cw * (cells.length - 0.5))}" y1="0" y2="14"/>` : ""}</svg>`;
    };
    const most = (r) => {
      const s = r.cells.filter((c) => c > 0);
      if (!s.length) return "strength not said";
      const k = [1, 2, 3].map((v) => s.filter((c) => c === v).length);
      const top = k.indexOf(Math.max(...k));
      return `mostly ${["mild", "moderate", "strong"][top]}`;
    };
    const list = rows.map((r, i) => {
      const c = ring / 2, rr = c - 3.5;
      return `<li class="rg-sym" style="--i:${i}">
        <span class="rg-sym-ring"><svg class="rg-day" viewBox="0 0 ${ring} ${ring}" aria-hidden="true"><circle class="rg-day-trk" cx="${c}" cy="${c}" r="${rr}" stroke-width="4"/><path class="rg-day-arc rg-draw" pathLength="1" stroke-width="4" d="${arc(c, c, rr, 0, Math.max(0.03, r.days / Math.max(1, S.logged30)))}"/></svg><b>${r.days}</b></span>
        <div class="rg-sym-main"><p><b>${esc(r.name)}</b><span>${esc(`${r.days} of ${S.logged30} days, ${most(r)}`)}</span></p>${strip(r.cells, i)}</div>
      </li>`;
    }).join("");
    const top = rows[0];
    const ans = rows.length ? `${top.name} came up most, on ${plural(top.days, "day")}.${S.usualText ? ` Your usual: ${lower1(S.usualText)}.` : ""}` : `No symptoms on the ${plural(S.logged30, "day")} you logged.`;
    const aria = `Symptoms, last 30 days. ${ans} ${rows.map((r) => `${r.name}: ${r.days} days`).join(", ")}.`;
    const strengths = new Set(rows.flatMap((r) => r.cells.filter((c) => c != null && c !== false)));
    return card(x, "rg-symptoms", "Symptoms", `
      ${head(x, "Symptoms · 30 days", S.usualText ? chip(x, "usual", `Usual: ${S.usualText.toLowerCase()}`) : chip(x, "neutral", "Learning"))}
      ${lead(x, num(S.withSym30), `of ${S.logged30} logged days with symptoms`, ans)}
      ${rows.length ? `<ul class="rg-symlist" role="img" aria-label="${esc(aria)}">${list}</ul>
      <p class="rg-symaxis" aria-hidden="true"><span>${esc(days[0].label)}</span><span${days[days.length - 1].today ? ' class="is-today"' : ""}>${days[days.length - 1].today ? "Today" : esc(days[days.length - 1].label)}</span></p>` : ""}
      ${rows.length ? legend(x, [strengths.has(1) && ["s1", "Mild"], strengths.has(2) && ["s2", "Moderate"], strengths.has(3) && ["s3", "Strong"], strengths.has(0) && ["unsaid", "Strength not said"], ["sdnone", "Logged, none"], ["arcnote", "Ring: share of logged days"]]) : ""}
      <p class="rg-care">${esc("A symptom that is new, strong or won't settle is worth raising with your clinician.")}</p>`);
  }

  /* ---------- weekly check-in: four gauges against the first weeks ---------- */
  function checkin(D, x) {
    const esc = x.esc, CK = D.checkin, Q = CK.questions;
    const started = Q.some((q) => q.latest);
    const size = 112, c = size / 2, R = 40, sw = 9, RU = R + sw / 2 + 6;
    const A0 = 0.625, SWEEP = 0.75; /* a 270° gauge, open at the bottom */
    const f = (v) => A0 + SWEEP * (v / 3);
    const tiles = Q.map((q, qi) => {
      const L = q.latest, b = q.band;
      const shift = q.cmp && q.cmp.k !== "same";
      const band = b ? `<path class="rg-uband rg-draw rg-draw--fast" pathLength="1" d="${arc(c, c, RU, f(b.lo) - (b.lo === b.hi ? 0.03 : 0), f(b.hi) + (b.lo === b.hi ? 0.03 : 0))}"/>` : "";
      const ticks = [0, 1, 2, 3].map((v) => { const [a1, b1] = pol(c, c, R - sw / 2 - 3, f(v)), [a2, b2] = pol(c, c, R - sw / 2 - 7, f(v)); return `<line class="rg-gtick" x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}"/>`; }).join("");
      const read = L ? (L.v > 0 ? `<path class="rg-arc rg-draw${shift ? " is-shift" : ""}" style="--i:${qi}" pathLength="1" stroke-width="${sw}" d="${arc(c, c, R, A0, f(L.v))}"/>` : "") + (() => { const [ex, ey] = pol(c, c, R, f(L.v)); return `<circle class="rg-gend${shift ? " is-shift" : ""}" style="--i:${qi}" cx="${ex}" cy="${ey}" r="${sw / 2 + 1.5}"/>`; })() : "";
      const [l0x, l0y] = pol(c, c, R, A0), [l1x, l1y] = pol(c, c, R, A0 + SWEEP);
      const hist = q.weeks.length ? (() => {
        const hw = 96, hh = 22, n = q.weeks.length, xx = (i) => r1(4 + (i * (hw - 8)) / Math.max(1, n - 1)), yy = (v) => r1(hh - 3 - (v / 3) * (hh - 6));
        const bandR = b ? `<rect class="rg-band" x="0" y="${r1(yy(b.hi) - 3)}" width="${hw}" height="${r1(yy(b.lo) - yy(b.hi) + 6)}" rx="3"/>` : "";
        return `<svg class="rg-hist" viewBox="0 0 ${hw} ${hh}" aria-hidden="true">${bandR}${q.weeks.map((w, i) => (w.v == null ? "" : `<circle class="rg-hd${w === L ? " is-new" : ""}${w === L && shift ? " is-shift" : ""}" style="--i:${i}" cx="${xx(i)}" cy="${yy(w.v)}" r="${w === L ? 3 : 2}"/>`)).join("")}</svg>`;
      })() : "";
      const aria = L ? `${q.label}: ${q.opts[L.v]} in the ${L.label.toLowerCase()}. ${q.cmp ? q.cmp.text : ""}${b ? `. Your first weeks: ${q.ticks[b.lo]}${b.hi !== b.lo ? ` to ${q.ticks[b.hi]}` : ""}` : ""}.` : `${q.label}: not answered yet.`;
      return `<li class="rg-ck">
        <span class="rg-ck-g"><svg class="rg-svg" viewBox="0 0 ${size} ${size - 8}" role="img" aria-label="${esc(aria)}">
          <path class="rg-trk" stroke-width="${sw}" d="${arc(c, c, R, A0, A0 + SWEEP)}"/>
          <path class="rg-utrk" d="${arc(c, c, RU, A0, A0 + SWEEP)}"/>
          ${band}${ticks}${read}
          <text class="rg-gl" x="${l0x - 2}" y="${r1(l0y + 18)}" text-anchor="middle">${esc(q.ticks[0])}</text>
          <text class="rg-gl" x="${l1x + 2}" y="${r1(l1y + 18)}" text-anchor="middle">${esc(q.ticks[3])}</text>
        </svg><b class="rg-ck-v">${L ? esc(q.ticks[L.v]) : "Not yet"}</b></span>
        <p class="rg-ck-l">${esc(q.label)}</p>
        ${q.cmp ? chip(x, shift ? "shift" : "usual", q.cmp.text) : chip(x, "neutral", "No answer yet")}
        ${hist}
      </li>`;
    }).join("");
    const same = Q.filter((q) => q.cmp && q.cmp.k === "same").length, answered = Q.filter((q) => q.cmp).length;
    const latest = (Q.find((q) => q.latest) || {}).latest;
    const ans = !started ? "Your weekly check-in is four short questions. Florin compares each week with your first weeks."
      : answered && same === answered ? "Every answer sits within the range of your first weeks." : `${Q.filter((q) => q.cmp && q.cmp.k !== "same").map((q) => `${q.label}: ${lower1(q.cmp.text)}`).join(". ")}.`;
    return card(x, "rg-checkin", "Weekly check-in", `
      ${head(x, "Weekly check-in", latest ? `<span class="rg-k rg-k--date">${esc(latest.label)}</span>` : "")}
      ${started && answered ? lead(x, num(same), `of ${answered} like your first weeks`, ans) : lead(x, "Not started", "", ans)}
      <ul class="rg-cks">${tiles}</ul>
      ${started ? legend(x, [["ring", "Latest answer"], ["uband-l", "Your first weeks"], Q.some((q) => q.cmp && q.cmp.k !== "same") && ["shift", "Different from your first weeks"], ["hist", "Each week, newest ringed"]]) : ""}
      ${CK.due ? `<div class="rg-cta"><button type="button" class="rg-btn">Answer this week's check-in</button></div>` : ""}`);
  }

  /* ---------- a possible pattern: two segmented rings, one bead per time ---------- */
  function pattern(D, x) {
    const esc = x.esc, PT = D.patterns, p = PT.found[0];
    const note = `<p class="rg-pnote">${esc(PT.note)}</p>`;
    if (!p) {
      if (D.learning) {
        return card(x, "rg-pattern rg-pattern--empty", "Possible patterns, not started yet", `
          ${head(x, "Possible patterns")}
          <div class="rg-pempty">${learnRing(x, D.learning, 120, "rg-learn--light")}<div><p class="rg-ptitle">Patterns come later</p><p class="rg-ans">${esc(`Florin starts looking once it knows your usual, from day ${D.learning.of}. You're on day ${D.learning.day}.`)}</p></div></div>
          ${note}`);
      }
      if (PT.sparse) {
        const cov = Math.round((PT.coverage || 0) * 100);
        const daysN = ((PT.sparseLine || "").match(/(\d+)-day/) || [])[1];
        const line = cov ? PT.sparseLine : `No meals are logged, so there are no days to compare.${daysN ? ` A ${daysN}-day food check would let Florin look.` : ""}`;
        const c = 60, r = 50;
        return card(x, "rg-pattern rg-pattern--empty", "Possible patterns: not enough meals to compare", `
          ${head(x, "Possible patterns", chip(x, "info", "Meals"))}
          <div class="rg-pempty">
            <span class="rg-pring"><svg class="rg-svg" viewBox="0 0 120 120" role="img" aria-label="${esc(`Meals logged on ${cov}% of days.`)}"><circle class="rg-trk" cx="${c}" cy="${c}" r="${r}" stroke-width="10"/>${cov ? `<path class="rg-arc is-ctx rg-draw" pathLength="1" stroke-width="10" d="${arc(c, c, r, 0, cov / 100)}"/>` : ""}</svg><b><span class="rg-pct">${num(cov, 0, 900)}<small>%</small></span><em>days with meals</em></b></span>
            <div><p class="rg-ptitle">${cov ? "Not enough ordinary days to compare" : "No meal logs to compare"}</p><p class="rg-ans">${esc(line)}</p></div>
          </div>
          <div class="rg-cta"><button type="button" class="rg-btn">Start a food check</button></div>
          ${note}`);
      }
      return card(x, "rg-pattern rg-pattern--empty", "Possible patterns: nothing stands out", `
        ${head(x, "Possible patterns")}
        <div class="rg-pempty"><span class="rg-pring"><svg class="rg-svg" viewBox="0 0 120 120" aria-hidden="true"><circle class="rg-trk" cx="60" cy="60" r="50" stroke-width="10"/></svg></span><div><p class="rg-ptitle">Nothing stands out right now</p><p class="rg-ans">Florin compared what you logged with the days after, and nothing repeats often enough to show. It keeps looking as you log.</p></div></div>
        ${note}`);
    }
    const what = p.kind === "late" ? ["After a dinner past 8 PM", "After an earlier dinner"] : p.kind === "loose" ? [`The morning after ${p.food.toLowerCase()}`, "Other mornings"] : [`The day after ${p.food.toLowerCase()}`, "Other days"];
    const ringOf = (hits, cls, label, n, hit, i0) => {
      const c = 64, r = 54, s = segs(c, c, r, hits.length, hits.length > 40 ? 2 : 3);
      return `<figure class="rg-pr ${cls}">
        <span class="rg-pr-ring"><svg class="rg-svg" viewBox="0 0 128 128" role="img" aria-label="${esc(`${label}: ${hit} of ${n} times.`)}">${s.map((d, i) => `<path class="rg-pseg${hits[i] ? " is-on" : ""}" style="--i:${i0 + i}" d="${d}"/>`).join("")}</svg>
        <b><span>${num(hit, 0, 1000)}</span><small>of ${n}</small></b></span>
        <figcaption>${esc(label)}</figcaption>
      </figure>`;
    };
    const tiers = ["Early signal", "Showing up often", "Consistent"];
    return card(x, "rg-pattern", `A possible pattern: ${p.title}`, `
      ${head(x, "A possible pattern", p.food ? chip(x, "info", p.food) : chip(x, "info", "Dinner time"))}
      <p class="rg-ptitle">${esc(p.title)}</p>
      <div class="rg-prs">${ringOf(p.occ, "is-a", what[0], p.n, p.hit, 0)}${ringOf(p.oth, "is-b", what[1], p.on, p.oh, 8)}</div>
      <p class="rg-ans">${esc(p.line)}</p>
      ${legend(x, [["pshift", p.kind === "late" ? "Later than your usual window" : p.kind === "loose" ? "A looser first BM" : "Bloating"], ["pusual", "The same, on other days"], ["pseg", "Each bead is one time"]])}
      <div class="rg-sure"><span class="rg-k">How sure</span><p class="rg-tiers" aria-label="${esc(`How sure: ${p.tier}`)}">${tiers.map((t, i) => `<span${i + 1 === p.tierK ? ' class="is-on"' : ""}>${esc(t)}</span>`).join("")}</p></div>
      ${note}`);
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "rings",
    name: "Rings",
    idea: "One calm ring up front: FloraScore on a dark hero card with your usual drawn on the ring, and every day, part and answer below read as a ring or a bead that draws itself in.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }
  });
})();
