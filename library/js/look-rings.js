/* Look: Rings. The closest of the three to Oura: one ring up front, parts you can see as rings, calm charts that draw
   themselves. FloraScore sits on the one dark hero card (Forest on light, Card 2 on dark) as a Ray ring with the usual
   range drawn as a band on its own outer track. Every other card is a standard card and reads a day, a part, a morning
   or an answer as a ring, a segment or a dot. Every number is read from D; nothing is typed.
   Colours: the reading is --ap-chart (Ray on the hero), your usual is Plum on light and Ray on dark, a shift either way
   is Gold, context is Teal. A colour means one thing per card: a day ring's colour is the day's state, never its score.
   Every rule in look-rings.css sits under .lk-rings. */
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
  /* a ring sector between two radii, from share a to share b */
  const sector = (cx, cy, ri, ro, a, b) => {
    const lg = b - a > 0.5 ? 1 : 0;
    const [x0, y0] = pol(cx, cy, ro, a), [x1, y1] = pol(cx, cy, ro, b), [x2, y2] = pol(cx, cy, ri, b), [x3, y3] = pol(cx, cy, ri, a);
    return `M${x0},${y0}A${ro},${ro} 0 ${lg} 1 ${x1},${y1}L${x2},${y2}A${ri},${ri} 0 ${lg} 0 ${x3},${y3}Z`;
  };
  /* n equal segments round a ring (or round a gauge), with a small gap between them */
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
  /* a direct label that must stay inside the plot: anchor by side, then keep it in [pad, W - pad] */
  const placeLabel = (x0, sinA, text, W, pad = 2) => {
    const w = text.length * 6.6;
    const anchor = Math.abs(sinA) < 0.22 ? "middle" : sinA > 0 ? "start" : "end";
    let x = x0;
    if (anchor === "start") x = Math.min(x, W - pad - w);
    else if (anchor === "end") x = Math.max(x, pad + w);
    else x = clamp(x, pad + w / 2, W - pad - w / 2);
    return [r1(x), anchor];
  };

  /* ---------- shared card parts ---------- */
  const card = (x, cls, label, inner) => `<article class="rg ${cls}" aria-label="${x.esc(label)}">${inner}</article>`;
  /* the card title is a heading, so a screen reader can jump card to card */
  const head = (x, k, side) => `<header class="rg-h"><h3 class="rg-k">${x.esc(k)}</h3>${side || ""}</header>`;
  const dateK = (x, t) => `<span class="rg-k rg-k--date">${x.esc(t)}</span>`;
  const chip = (x, kind, t) => `<span class="rg-chip rg-chip--${kind}">${x.esc(t)}</span>`;
  const num = (v, dec, dur) => `<b class="rg-n" data-count="${v}"${dec ? ` data-dec="${dec}"` : ""} data-dur="${dur || 1000}">${dec ? Number(v).toFixed(dec) : v}</b>`;
  /* the lead: a big light numeral and its unit, then at most one short sentence */
  const lead = (x, n, of, ans) => `<div class="rg-lead"><p class="rg-big">${n}${of ? `<span class="rg-of">${x.esc(of)}</span>` : ""}</p>${ans ? `<p class="rg-ans">${x.esc(ans)}</p>` : ""}</div>`;
  /* legend swatches: CSS dots and lines, plus two small SVG glyphs */
  const GLYPH = {
    arcnote: `<svg class="rg-glyph" viewBox="0 0 12 12" aria-hidden="true"><circle class="rg-glyph-t" cx="6" cy="6" r="4.5"/><path class="rg-glyph-a" d="${arc(6, 6, 4.5, 0, 0.7)}"/></svg>`,
    ctxring: `<svg class="rg-glyph" viewBox="0 0 12 12" aria-hidden="true"><circle class="rg-glyph-ctx" cx="6" cy="6" r="5"/></svg>`
  };
  const sw = (k) => (k == null ? "" : GLYPH[k] || `<i class="rg-sw rg-sw--${k}"></i>`);
  const legend = (x, items) => `<ul class="rg-legend">${items.filter(Boolean).map(([k, t]) => `<li>${sw(k)}${x.esc(t)}</li>`).join("")}</ul>`;
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
    none: ["is-none", "Not logged"]
  };
  const stateOf = (d) => (d.pending ? ["is-pending", "Not logged yet"] : STATE[d.state] || STATE.none);
  /* a small day ring. Its colour is the day's state and nothing else: a closed ring for a day read against your usual,
     an empty ring for a day logged with no BMs said, a 1px hairline for a day not logged (a gap, never a zero) */
  const dayRing = (x, d, size, swd) => {
    const c = size / 2, r = r1(c - swd / 2 - 1);
    const [cls] = stateOf(d);
    const closed = d.logged && d.state !== "nocount" && d.state !== "none";
    const mark = closed ? `<path class="rg-day-ring rg-draw" d="${arc(c, c, r, 0, 1)}" stroke-width="${swd}" pathLength="1"/>`
      : cls === "is-nocount" ? `<circle class="rg-day-empty" cx="${c}" cy="${c}" r="${r}" stroke-width="${swd}"/>`
      : `<circle class="rg-day-gap" cx="${c}" cy="${c}" r="${r}"/>`;
    return `<svg class="rg-day ${cls}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      ${cls === "is-shift" ? `<circle class="rg-day-fill" cx="${c}" cy="${c}" r="${r1(r - swd / 2)}"/>` : ""}${mark}
    </svg>`;
  };
  /* the legend items for day rings, only for the states on show */
  const dayLegend = (has) => [
    has("is-usual") && ["usual", "Within your usual"], has("is-shift") && ["shiftring", "Shifted"], has("is-unsure") && ["unsure", "Could be either"],
    has("is-logged") && ["logged", "Logged"], has("is-nocount") && ["empty", "Logged, no BMs said"], (has("is-none") || has("is-pending")) && ["gap", "Not logged"]
  ];

  /* ---------- FloraScore ---------- */
  function score(D, x) {
    const S = D.score, esc = x.esc;
    const DISC = "FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.";
    if (!S.usual) {
      const L = S.learning || { day: D.learning ? D.learning.day : 0, of: D.learning ? D.learning.of : 14, line: "" };
      return card(x, "rg--hero rg-score", "FloraScore, still learning your usual", `
        ${head(x, "FloraScore", dateK(x, D.todayLabel))}
        <div class="rg-dial">
          ${learnRing(x, L, 280, "rg-learn--hero")}
          <div class="rg-dial-c" aria-hidden="true"><span class="rg-dial-k">Learning</span><b class="rg-dial-n rg-dial-n--sm">Day ${num(L.day, 0, 700)}</b><span class="rg-dial-s">of ${L.of}</span></div>
        </div>
        <p class="rg-rel">${esc(L.line)}</p>
        <p class="rg-how" data-disclaimer>${esc(DISC)}</p>`);
    }
    const v = S.value, u = S.usual;
    const C = 140, R = 94, RU = 115, SW = 15;
    const shift = v != null && (v < u[0] || v > u[1]);
    /* four quarter ticks, so the ring reads as a score and not a clock face */
    const ticks = [0, 0.25, 0.5, 0.75].map((f) => { const [a, b] = pol(C, C, R - 14, f), [c2, d2] = pol(C, C, R - 21, f); return `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/>`; }).join("");
    const ends = [u[0], u[1]].map((val) => { const [a, b] = pol(C, C, RU - 7, val / 100), [c2, d2] = pol(C, C, RU + 7, val / 100); return `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/>`; }).join("");
    const [ex, ey] = v != null ? pol(C, C, R, v / 100) : [0, 0];
    const aria = v == null ? `No FloraScore today: not enough logs yet. Your usual range is ${u[0]} to ${u[1]}.` : `FloraScore today ${v}. ${S.relation}, ${u[0]} to ${u[1]}.`;
    const dial = `<svg class="rg-svg" viewBox="0 0 280 280" role="img" aria-label="${esc(aria)}">
        <g class="rg-bezel">${ticks}</g>
        <circle class="rg-trk" cx="${C}" cy="${C}" r="${R}" stroke-width="${SW}"/>
        <circle class="rg-utrk" cx="${C}" cy="${C}" r="${RU}"/>
        <path class="rg-uband rg-draw rg-draw--fast" d="${arc(C, C, RU, u[0] / 100, u[1] / 100)}" pathLength="1"/>
        <g class="rg-uend">${ends}</g>
        ${v != null ? `<path class="rg-arc rg-draw rg-draw--slow" d="${arc(C, C, R, 0, v / 100)}" stroke-width="${SW}" pathLength="1"/>
        <circle class="rg-end${shift ? " is-shift" : ""}" cx="${ex}" cy="${ey}" r="8.5"/>` : ""}
      </svg>`;
    const centre = v != null
      ? `<span class="rg-dial-k">Today</span><b class="rg-dial-n">${num(v, 0, 1300)}</b><span class="rg-dial-s">Your usual ${u[0]} to ${u[1]}</span>`
      : `<span class="rg-dial-k">Today</span><b class="rg-dial-n rg-dial-n--sm">Not yet</b><span class="rg-dial-s">Your usual ${u[0]} to ${u[1]}</span>`;
    const rel = v != null ? S.relation : "Not enough logs yet for a FloraScore today. Log a BM and it fills in.";
    return card(x, "rg--hero rg-score", `FloraScore today${v != null ? `, ${v}` : ""}`, `
      ${head(x, "FloraScore", dateK(x, D.todayLabel))}
      <div class="rg-dial">${dial}<div class="rg-dial-c" aria-hidden="true">${centre}</div></div>
      <p class="rg-rel${shift ? " is-shift" : ""}">${v != null ? '<i aria-hidden="true"></i>' : ""}${esc(rel)}</p>
      <p class="rg-how" data-disclaimer>${esc(S.how)}</p>`);
  }

  /* ---------- the four parts: a standard card, so the hero stays the one dark card ---------- */
  function parts(D, x) {
    const S = D.score, esc = x.esc, P = S.parts || [];
    const RADII = [86, 68, 50, 32], SW = 10, C = 100;
    const caption = `<p class="rg-conc-cap">Each part, out of 100</p>`;
    if (!P.length) {
      const rings = RADII.map((r) => `<circle class="rg-trk" cx="${C}" cy="${C}" r="${r}" stroke-width="${SW}"/>`).join("");
      return card(x, "rg-parts", "The four parts of FloraScore, not started yet", `
        ${head(x, "What makes up the score")}
        <div class="rg-parts-top">
          <svg class="rg-svg rg-conc" viewBox="0 0 200 200" role="img" aria-label="${esc("The four parts start with your FloraScore.")}">${rings}</svg>
          <div class="rg-parts-sum"><p class="rg-ans">${esc("Timing, How often, Form and Comfort fill in with your FloraScore.")}</p></div>
        </div>
        ${D.learning ? learnNote(x, D, "Florin is learning your usual first.") : ""}`);
    }
    const rings = P.map((p, i) => `<circle class="rg-trk" cx="${C}" cy="${C}" r="${RADII[i]}" stroke-width="${SW}"/>
      <path class="rg-arc rg-draw" style="--i:${i}" d="${arc(C, C, RADII[i], 0, clamp(p.now, 0, 100) / 100)}" stroke-width="${SW}" pathLength="1"/>`).join("");
    const befores = P.map((p, i) => { const f = clamp(p.before, 0, 100) / 100, [a, b] = pol(C, C, RADII[i] - SW / 2 - 1, f), [c2, d2] = pol(C, C, RADII[i] + SW / 2 + 1, f); return `<line class="rg-before-halo" style="--i:${i}" x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/><line class="rg-before" style="--i:${i}" x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/>`; }).join("");
    const icon = (i) => `<svg class="rg-picon" viewBox="0 0 24 24" aria-hidden="true">${[11, 8.4, 5.8, 3.2].map((r, k) => `<circle cx="12" cy="12" r="${r}"${k === i ? ' class="is-on"' : ""}/>`).join("")}</svg>`;
    /* the score moves in whole points, so a change that rounds to 0 is about the same */
    const wordOf = (p) => (Math.round(p.delta) === 0 ? ["is-same", "About the same"] : p.delta > 0 ? ["is-up", "Higher"] : ["is-down", "Lower"]);
    const maxA = Math.max(1, ...P.map((p) => Math.abs(p.delta)));
    const rows = P.map((p, i) => {
      const [wc, w] = wordOf(p);
      const wPct = r1((Math.abs(p.delta) / maxA) * 50);
      const pts = `${sign(p.delta, 1)} pts`;
      return `<li class="rg-part" style="--i:${i}">
        ${icon(i)}
        <div class="rg-part-main">
          <p class="rg-part-top"><b>${esc(p.label)}</b><span class="rg-part-wt">${Math.round(p.weight * 100)}%</span><em class="${wc}">${esc(w)}</em></p>
          <p class="rg-part-bar"><span class="rg-div" role="img" aria-label="${esc(`${p.label}: ${pts} on your FloraScore against last week. ${p.now} of 100 this week, ${p.before} last week.`)}"><u></u>${p.delta ? `<b class="${p.delta > 0 ? "is-pos" : "is-neg"}" style="--w:${wPct}%"></b>` : ""}</span><span class="rg-div-v">${pts}</span></p>
        </div>
      </li>`;
    }).join("");
    const moved = P.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const still = P.every((p) => Math.round(p.delta) === 0); /* the score moves in whole points */
    const aria = `Each part out of 100, this week against last. ${P.map((p) => `${p.label} ${p.now}, last week ${p.before}`).join(". ")}.`;
    return card(x, "rg-parts", "The four parts of FloraScore, this week against last", `
      ${head(x, "What makes up the score", dateK(x, "This week"))}
      <div class="rg-parts-top">
        <figure class="rg-conc-f"><svg class="rg-svg rg-conc" viewBox="0 0 200 200" role="img" aria-label="${esc(aria)}">${rings}${befores}</svg>${caption}</figure>
        <div class="rg-parts-sum">
          ${still ? `<p class="rg-ans">${esc("Every part is about the same as last week.")}</p>` : `<p class="rg-big">${esc(sign(moved.delta, 1))}<span class="rg-of">pts</span></p>
          <p class="rg-ans">${esc(`${moved.label} moved your FloraScore most since last week.`)}</p>`}
        </div>
      </div>
      <ul class="rg-partlist">${rows}</ul>
      ${legend(x, [["ring", "This week"], ["tick", "Last week"], ["div", "Change, from zero"], ["pct", "Share of the score"]])}
      <p class="rg-how" data-disclaimer>Each part reads you against your own usual, weighted as shown. Changes are in FloraScore points. FloraScore isn't a medical score, and a lower number isn't a diagnosis.</p>`);
  }

  /* ---------- FloraScore over 30 days ---------- */
  function trend(D, x) {
    const S = D.score, esc = x.esc;
    if (!S.usual || !S.series || !S.series[30].some((s) => s.value != null)) {
      return card(x, "rg-trend", "FloraScore over 30 days, not started yet", `
        ${head(x, "FloraScore · 30 days")}
        ${lead(x, "Not yet", "", "Your 30-day line starts with your FloraScore.")}
        <div class="rg-empty-plot" role="img" aria-label="${esc("No FloraScore yet.")}"><span></span><span></span><span></span></div>
        ${D.learning ? learnNote(x, D, "Florin is learning your usual.") : ""}`);
    }
    const ser = S.series[30], u = S.usual;
    /* a day with no logs is a gap in the line, even when the blended score carries a value */
    const byD = {};
    D.days[30].forEach((d) => (byD[d.d] = d));
    const gapDay = (s) => { const d = byD[s.d]; return !!d && !d.logged && !d.pending; };
    const vals = ser.map((s) => (s.value == null || gapDay(s) ? null : s.value));
    /* every day with no FloraScore of its own breaks the line: a day not logged, or a day logged with no BMs said */
    const noScore = vals.filter((v, i) => v == null && !(byD[ser[i].d] || {}).pending).length;
    const nums = vals.filter((v) => v != null);
    if (!nums.length) return card(x, "rg-trend", "FloraScore over 30 days", `${head(x, "FloraScore · 30 days")}${lead(x, "Not yet", "", "No logged days with a FloraScore yet.")}`);
    const W = 326, top = 24, left = 28, right = 12, plotH = 132, bottom = 26, H = top + plotH + bottom;
    const lo = Math.floor((Math.min(...nums, u[0]) - 4) / 5) * 5, hi = Math.ceil((Math.max(...nums, u[1]) + 3) / 5) * 5;
    const xs = x.lin(0, ser.length - 1, left + 6, W - right - 6), ys = x.lin(lo, hi, top + plotH, top);
    const out = (v) => v < u[0] || v > u[1];
    const runs = []; let cur = [];
    vals.forEach((v, i) => { if (v != null) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } });
    if (cur.length) runs.push(cur);
    const solo = new Set(runs.filter((r) => r.length === 1).map((r) => r[0]));
    const pathOf = (r) => x.C.path(r.map((i) => [xs(i), ys(vals[i])]));
    const gid = `rg-g-${x.uid}`;
    const step = (hi - lo) / 10 >= 2 ? 10 : 5;
    const yt = []; for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) yt.push(t);
    /* every label sits on a gridline (the plot bottom stays unlabelled), and gives way to your usual's two edges */
    const ytl = yt.filter((t) => Math.abs(t - u[0]) >= 4 && Math.abs(t - u[1]) >= 4);
    const within = nums.filter((v) => !out(v)).length, above = nums.filter((v) => v > u[1]).length, below = nums.filter((v) => v < u[0]).length;
    const li = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
    const last = ser[li], lv = vals[li];
    const mid = Math.floor((ser.length - 1) / 2);
    const xticks = [[0, ser[0].label, "start"], [mid, ser[mid].label, "middle"], [ser.length - 1, ser[ser.length - 1].today ? "Today" : ser[ser.length - 1].label, "end"]];
    /* a dot for every point outside your usual, and for a lone point between two gaps, which has no line */
    const dots = vals.map((v, i) => (v == null || i === li || (!out(v) && !solo.has(i)) ? "" : `<circle class="rg-tdot${out(v) ? " is-shift" : ""}" style="--i:${i}" cx="${r1(xs(i))}" cy="${r1(ys(v))}" r="3.6"><title>${esc(`${ser[i].label}: ${v}${out(v) ? `, ${v > u[1] ? "above" : "below"} your usual range` : ""}`)}</title></circle>`)).join("");
    const lx = xs(li), ly = ys(lv);
    const rel = last.today && lv === S.value && S.relation ? lower1(S.relation) : lv < u[0] ? "below your usual range" : lv > u[1] ? "above your usual range" : "within your usual range";
    const ans = `${last.today ? "Today" : `Latest, ${last.label},`} ${lv}, ${rel}.`;
    const spread = [above && `above it on ${plural(above, "day")}`, below && `below it on ${plural(below, "day")}`].filter(Boolean);
    const aria = `FloraScore over 30 days. ${within} of ${nums.length} days within your usual range, ${u[0]} to ${u[1]}${spread.length ? `, ${andList(spread)}` : ""}. ${ans}${noScore ? ` No FloraScore on ${plural(noScore, "day")}, left as ${noScore === 1 ? "a break" : "breaks"} in the line.` : ""}`;
    /* the area fades out by the top of your usual band, so it never greys the band */
    const svg = `<svg class="rg-svg rg-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
      <defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top}" y2="${r1(ys(u[1]))}"><stop offset="0" class="rg-ga"/><stop offset="1" class="rg-gb"/></linearGradient></defs>
      ${yt.map((t) => `<line class="rg-yt" x1="${left}" x2="${W - right}" y1="${r1(ys(t))}" y2="${r1(ys(t))}"/>`).join("")}
      ${ytl.map((t) => `<text class="rg-yl" x="${left - 8}" y="${r1(ys(t) + 3.5)}" text-anchor="end">${t}</text>`).join("")}
      <text class="rg-yl is-usual" x="${left - 8}" y="${r1(ys(u[1]) + 3.5)}" text-anchor="end">${u[1]}</text><text class="rg-yl is-usual" x="${left - 8}" y="${r1(ys(u[0]) + 3.5)}" text-anchor="end">${u[0]}</text>
      <rect class="rg-band" x="${left}" y="${r1(ys(u[1]))}" width="${W - left - right}" height="${r1(ys(u[0]) - ys(u[1]))}" rx="4"/>
      <line class="rg-band-edge" x1="${left}" x2="${W - right}" y1="${r1(ys(u[1]))}" y2="${r1(ys(u[1]))}"/><line class="rg-band-edge" x1="${left}" x2="${W - right}" y1="${r1(ys(u[0]))}" y2="${r1(ys(u[0]))}"/>
      ${runs.filter((r) => r.length > 1).map((r) => `<path class="rg-area" fill="url(#${gid})" d="${pathOf(r)}L${r1(xs(r[r.length - 1]))},${top + plotH}L${r1(xs(r[0]))},${top + plotH}Z"/>`).join("")}
      ${runs.filter((r) => r.length > 1).map((r) => `<path class="rg-line rg-draw rg-draw--slow" pathLength="1" d="${pathOf(r)}"/>`).join("")}
      ${dots}
      <circle class="rg-now-halo${out(lv) ? " is-shift" : ""}" cx="${r1(lx)}" cy="${r1(ly)}" r="9"/>
      <circle class="rg-now${out(lv) ? " is-shift" : ""}" cx="${r1(lx)}" cy="${r1(ly)}" r="4.5"/>
      <text class="rg-now-lbl" x="${r1(lx)}" y="${r1(ly - 14)}" text-anchor="end">${lv}</text>
      ${xticks.map(([i, t, a]) => `<text class="rg-xt${t === "Today" ? " is-today" : ""}" x="${r1(i === 0 ? left : i === ser.length - 1 ? W - right : xs(i))}" y="${H - 6}" text-anchor="${a}">${esc(t)}</text>`).join("")}
    </svg>`;
    return card(x, "rg-trend", "FloraScore over 30 days", `
      ${head(x, "FloraScore · 30 days", chip(x, "usual", `Usual ${u[0]} to ${u[1]}`))}
      ${lead(x, num(within), `of ${nums.length} days within your usual range`, ans)}
      ${svg}
      ${legend(x, [["line", "FloraScore"], ["band", `Your usual, ${u[0]} to ${u[1]}`], (above || below) && ["shift", "Outside your usual"], noScore && [null, "A break in the line: no FloraScore that day"], [out(lv) ? "now-shift" : "now", last.today ? "Today" : "Latest"]])}`);
  }

  /* ---------- this week: seven day rings, the score as a number under each ---------- */
  function week(D, x) {
    const esc = x.esc, days = D.days[7];
    const slots = Array(Math.max(0, 7 - days.length)).fill(null).concat(days);
    const logged = days.filter((d) => d.logged);
    const n = (s) => days.filter((d) => d.logged && d.state === s).length;
    const within = n("usual"), shifted = n("shifted"), unsure = n("unsure");
    const learning = !!D.learning;
    const showScore = (d) => !learning && d.logged && d.state !== "nocount" && d.score != null;
    const cols = slots.map((d, i) => {
      if (!d) return `<li class="rg-wd is-before" aria-hidden="true"><span class="rg-wd-k">&nbsp;</span><span class="rg-wd-ring"></span><span class="rg-wd-s">&nbsp;</span><span class="rg-wd-sym"></span></li>`;
      const [, word] = stateOf(d);
      const tip = `${d.dow} ${d.label}: ${word}${showScore(d) ? `, FloraScore ${d.score}` : ""}${d.firstText ? `, first BM ${d.firstText}` : ""}${d.sym.length ? `, ${d.sym.map((s) => s.name.toLowerCase()).join(", ")}` : ""}`;
      return `<li class="rg-wd${d.today ? " is-today" : ""}" style="--i:${i}" title="${esc(tip)}">
        <span class="rg-wd-k">${d.today ? "Today" : esc(d.dow)}</span>
        <span class="rg-wd-ring">${dayRing(x, d, 40, 4.5)}<b>${d.date}</b></span>
        <span class="rg-wd-s">${showScore(d) ? d.score : d.pending ? "Not yet" : "&nbsp;"}</span>
        <span class="rg-wd-sym">${d.sym.length ? `<i title="${esc("Symptoms logged")}"></i>` : ""}</span>
      </li>`;
    }).join("");
    const which = (st) => andList(days.filter((d) => d.logged && d.state === st).map((d) => (d.today ? "today" : DOWL[d.dow] || d.dow)));
    const ans = learning ? "Days show as logged while Florin learns your usual."
      : shifted ? `Shifted on ${which("shifted")}.` : unsure ? `${cap(which("unsure"))} could be either.` : "Every day you logged sat within your usual.";
    const gaps = days.filter((d) => !d.logged && !d.pending);
    const symDays = days.filter((d) => d.sym.length).length;
    const aria = `This week. ${ans}${!learning && unsure && shifted ? ` ${cap(which("unsure"))} could be either.` : ""}${gaps.length ? ` Not logged on ${andList(gaps.map((d) => DOWL[d.dow] || d.dow))}.` : ""}${symDays ? ` Symptoms on ${plural(symDays, "day")}.` : ""} ${days.map((d) => `${d.dow}: ${stateOf(d)[1]}${showScore(d) ? `, FloraScore ${d.score}` : ""}`).join(". ")}.`;
    const has = (c) => days.some((d) => stateOf(d)[0] === c);
    return card(x, "rg-week", "This week at a glance", `
      ${head(x, "This week", dateK(x, `${days[0].label} to ${days[days.length - 1].label}`))}
      ${learning ? lead(x, num(logged.length), `of ${days.length} days logged`, ans) : lead(x, num(within), `of ${logged.length} days within your usual`, ans)}
      <ol class="rg-weekrow" role="img" aria-label="${esc(aria)}">${cols}</ol>
      ${legend(x, [...dayLegend(has), days.some((d) => d.sym.length) && ["sym", "Symptoms"], days.some(showScore) && [null, "Number under a ring: that day's FloraScore"]])}`);
  }

  /* ---------- the last 30 days: a calendar of day rings ---------- */
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
      /* the first of a month carries the month's name, so the calendar shows where one month turns into the next */
      const turn = d.date === 1 && i > off ? ` data-mon="${esc(d.label.split(" ")[0])}"` : "";
      return `<li class="rg-md${d.today ? " is-today" : ""}${turn ? " is-first" : ""}"${turn} style="--i:${i}" title="${esc(`${d.dow} ${d.label}: ${word}`)}">${dayRing(x, d, 34, 3.6)}<b>${d.date}</b></li>`;
    }).join("");
    const parts2 = [shifted && `${plural(shifted, "day")} shifted`, unsure && `${unsure} could be either`, gaps && `${gaps} not logged, left as ${gaps === 1 ? "a gap" : "gaps"}`].filter(Boolean);
    const aria = learning ? `Since you started. ${plural(logged, "day")} logged. Days fill in against your usual once Florin knows it.`
      : `The last 30 days. ${within} of ${logged} days within your usual.${parts2.length ? ` ${cap(andList(parts2))}.` : ""}`;
    const has = (c) => days.some((d) => stateOf(d)[0] === c);
    return card(x, "rg-month", learning ? "Since you started, at a glance" : "The last 30 days at a glance", `
      ${head(x, learning ? "Since you started" : "Last 30 days", dateK(x, `${days[0].label} to ${days[days.length - 1].label}`))}
      ${learning ? lead(x, num(logged), `of ${days.length} days logged`, "") : lead(x, num(within), `of ${logged} days within your usual`, "")}
      <div class="rg-cal" role="img" aria-label="${esc(aria)}">
        <ol class="rg-cal-h" aria-hidden="true"><li>M</li><li>T</li><li>W</li><li>T</li><li>F</li><li>S</li><li>S</li></ol>
        <ol class="rg-cal-g">${grid}</ol>
      </div>
      ${legend(x, [...dayLegend(has), ["todayring", "Today"]])}`);
  }

  /* ---------- timing: a morning dial. 240° open at the bottom, your usual window as a band on the outer track,
     each first BM a dot stacked outward in its 15-minute slot ---------- */
  function timing(D, x) {
    const esc = x.esc, days = D.days[30], tm = D.timing, u = tm.usual;
    const pts = days.map((d, i) => ({ d, i })).filter((p) => p.d.first != null);
    if (!pts.length) return card(x, "rg-timing", "Timing", `${head(x, "Timing · first BM")}${lead(x, "No BMs yet", "", "Your first BM each morning will show here.")}`);
    const firsts = pts.map((p) => p.d.first);
    const t0 = Math.floor(Math.min(...firsts, u ? u[0] : 24) - 0.25), t1 = Math.ceil(Math.max(...firsts, u ? u[1] : 0) + 0.25);
    /* slots start on the hour and every quarter hour is a slot edge, so your window's edges (always quarter hours)
       never fall inside a slot. A morning is placed at the minute shown, the minute the model reads it at */
    const SLOT = 15, binH = SLOT / 60, nb = Math.round((t1 - t0) / binH);
    const minOf = (t) => Math.round(t * 60);
    const slotOf = (d) => {
      const m = minOf(d.first) - t0 * 60;
      /* a morning at the window's closing minute is inside the window, so it keeps the slot inside the window */
      const b = Math.floor(m / SLOT) - (u && d.inWin === true && minOf(d.first) === minOf(u[1]) ? 1 : 0);
      return clamp(b, 0, nb - 1);
    };
    const HALF = 1 / 3; /* 120° each side of 12 o'clock */
    const fa = (t) => -HALF + (2 * HALF * (t - t0)) / (t1 - t0);
    const W = 326, cx = W / 2, rAx = 64;
    const stack = {};
    const placed = pts.map((p) => { const b = slotOf(p.d); const k = (stack[b] = (stack[b] || 0) + 1); return { ...p, b, k }; });
    const maxK = Math.max(...placed.map((p) => p.k));
    const binArc = ((rAx + 10) * 2 * HALF * TAU) / nb;
    let R = clamp(binArc / 2 - 1.2, 2.4, 4.4), dy = 2 * R + 1.8;
    const room = 52;
    if ((maxK - 1) * dy > room) { dy = room / (maxK - 1); R = clamp(dy / 2 - 0.6, 2, R); }
    const r0 = rAx + 6 + R;
    const rOf = (k) => r0 + (k - 1) * dy;
    const rb = r1(rOf(maxK) + R + 9), rL = rb + 19; /* the outer track, then the bezel of hour labels */
    const cy = r1(rL + 12), H = r1(cy + rL / 2 + (u ? 30 : 14));
    const fb = (b) => fa(t0 + (b + 0.5) * binH);
    const newest = placed[placed.length - 1];
    /* outside your window as the model reads it (at the minute shown), so the count, the dots and the legend agree */
    const off = u ? pts.filter((p) => p.d.inWin === false) : [];
    const later = off.filter((p) => p.d.first > u[1]).length, earlier = off.length - later;
    const dots = placed.map((p, j) => {
      const [px, py] = pol(cx, cy, rOf(p.k), fb(p.b));
      return `<circle class="rg-mdot${p.d.inWin === false ? " is-shift" : ""}${p === newest ? " is-new" : ""}" style="--i:${j}" cx="${px}" cy="${py}" r="${r1(R)}"><title>${esc(`${p.d.dow} ${p.d.label}: ${p.d.firstText}${p.d.inWin === false ? ", outside your usual window" : p.d.inWin ? ", in your usual window" : ""}`)}</title></circle>`;
    }).join("");
    /* the newest morning is the outermost dot of its slot: ring it, and label it on the bezel at its own angle */
    const nf = fb(newest.b), [nx, ny] = pol(cx, cy, rOf(newest.k), nf);
    const nText = newest.d.today ? "Today" : newest.d.label;
    const [lxRaw, lyRaw] = pol(cx, cy, rL, nf);
    const [lx, la] = placeLabel(lxRaw, Math.sin(nf * TAU), nText, W);
    const boxOf = (x0, anchor, t) => { const w = t.length * 6.6; return anchor === "start" ? [x0, x0 + w] : anchor === "end" ? [x0 - w, x0] : [x0 - w / 2, x0 + w / 2]; };
    const nBox = boxOf(lx, la, nText);
    const hours = []; for (let h = Math.ceil(t0); h <= t1; h++) hours.push(h);
    const hourMarks = hours.map((h) => {
      const f = fa(h), [a1, b1] = pol(cx, cy, rb + 5, f), [a2, b2] = pol(cx, cy, rb + 9, f), [tx0, ty] = pol(cx, cy, rL, f);
      const t = hourLbl(h, h === hours[0] || h === hours[hours.length - 1]);
      const [tx, ta] = placeLabel(tx0, Math.sin(f * TAU), t, W);
      const box = boxOf(tx, ta, t);
      /* an hour label gives way to the newest morning's label when the two would touch */
      const clash = Math.abs(ty - lyRaw) < 14 && box[0] < nBox[1] + 4 && nBox[0] < box[1] + 4;
      return `<line class="rg-vt" x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}"/>${clash ? "" : `<text class="rg-xt" x="${tx}" y="${r1(ty + 3.5)}" text-anchor="${ta}">${t}</text>`}`;
    }).join("");
    /* your usual, drawn first: a soft sector behind the dots, and a band on the outer track */
    const band = u ? (() => {
      const a = fa(u[0]), b = fa(u[1]);
      const [e0x, e0y] = pol(cx, cy, rAx, a), [e0X, e0Y] = pol(cx, cy, rb, a), [e1x, e1y] = pol(cx, cy, rAx, b), [e1X, e1Y] = pol(cx, cy, rb, b);
      return `<path class="rg-band" d="${sector(cx, cy, rAx, rb, a, b)}"/>
        <line class="rg-band-edge" x1="${e0x}" y1="${e0y}" x2="${e0X}" y2="${e0Y}"/><line class="rg-band-edge" x1="${e1x}" y1="${e1y}" x2="${e1X}" y2="${e1Y}"/>
        <path class="rg-uband rg-draw rg-draw--fast" pathLength="1" d="${arc(cx, cy, rb, a, b)}"/>`;
    })() : "";
    const nWhere = newest.d.inWin === true ? "inside your window" : newest.d.inWin === false ? (newest.d.first > u[1] ? "later than your window" : "earlier than your window") : "";
    const ans = `${newest.d.today ? "Today" : `Latest, ${newest.d.label},`} ${newest.d.firstText}${nWhere ? `, ${nWhere}` : ""}.`;
    const spread = [later && `${later} came later than your window`, earlier && `${earlier} earlier`].filter(Boolean);
    const aria = u ? `First BM each morning, last 30 days. ${tm.inWin30} of ${tm.mornings30} mornings in your usual window, ${tm.usualText}.${spread.length ? ` ${cap(andList(spread))}.` : ""} ${ans}`
      : `First BM each morning so far. ${plural(pts.length, "morning")} logged. ${ans} Florin learns your usual window by day ${D.learning ? D.learning.of : ""}.`;
    const svg = `<svg class="rg-svg rg-chart rg-mdial" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
      <path class="rg-utrk" d="${arc(cx, cy, rb, -HALF, HALF)}"/>
      ${band}
      <path class="rg-axis" d="${arc(cx, cy, rAx, -HALF, HALF)}"/>
      ${hourMarks}
      ${dots}
      <circle class="rg-now-halo${newest.d.inWin === false ? " is-shift" : ""}" cx="${nx}" cy="${ny}" r="${r1(R + 3.5)}"/>
      <text class="rg-now-lbl" x="${lx}" y="${r1(lyRaw + 4)}" text-anchor="${la}">${esc(nText)}</text>
      <text class="rg-mdial-n" x="${cx}" y="${r1(cy - 6)}" text-anchor="middle"><tspan data-count="${u ? tm.inWin30 : pts.length}" data-dur="1000">${u ? tm.inWin30 : pts.length}</tspan></text>
      <text class="rg-mdial-s" x="${cx}" y="${r1(cy + 14)}" text-anchor="middle">${esc(u ? `of ${tm.mornings30} mornings` : pts.length === 1 ? "morning logged" : "mornings logged")}</text>
      ${u ? `<text class="rg-mdial-s" x="${cx}" y="${r1(cy + 27)}" text-anchor="middle">in your window</text>
      <text class="rg-band-lbl" x="${cx}" y="${r1(cy + rL / 2 + 22)}" text-anchor="middle">${esc(`Your usual ${tm.usualText}`)}</text>` : ""}
    </svg>`;
    return card(x, "rg-timing", "Timing of the first BM", `
      ${head(x, "Timing · first BM", u ? chip(x, "usual", tm.usualText) : chip(x, "neutral", "Learning"))}
      ${svg}
      <p class="rg-ans">${esc(ans)}</p>
      ${legend(x, [["read", u ? "One morning, in your window" : "One morning"], (later || earlier) && ["shift", "Outside your window"], [newest.d.inWin === false ? "now-shift" : "now", newest.d.today ? "Today" : "Latest"]])}`);
  }

  /* ---------- how often: a 30-day ring. One segment per day, clockwise to today at 12 o'clock; lanes 1, 2 and 3+
     from the inside out; your usual count is a band across its lanes. While Florin is learning, the ring holds the
     learning days instead: day 1 just after 12 o'clock, the days still to come a quiet hairline ---------- */
  function often(D, x) {
    const esc = x.esc, days = D.days[30], o = D.often, u = o.usual;
    const learning = !!D.learning;
    const N = learning ? Math.max(D.learning.of, days.length) : 30;
    const slots = learning ? days.concat(Array(N - days.length).fill(null)) : Array(Math.max(0, N - days.length)).fill(null).concat(days.slice(-N));
    const known = days.filter((d) => d.count != null);
    const outOf = (c) => !!u && (c < u[0] || c > u[1]);
    const inRange = u ? known.filter((d) => !outOf(d.count)).length : null;
    const W = 326, cx = W / 2;
    const A0 = 0.045, A1 = 0.955, per = (A1 - A0) / N;
    const RL = [50, 64, 80, 96], LW = 12; /* the lanes: 0, 1, 2, 3+ */
    const cy = 126;
    const segOf = (r, i) => { const g = 1.8 / (TAU * r); return arc(cx, cy, r, A0 + i * per + g / 2, A0 + (i + 1) * per - g / 2); };
    const li = slots.map((d, i) => (d && d.count != null ? i : -1)).filter((i) => i >= 0).pop();
    const marks = slots.map((d, i) => {
      if (!d) return "";
      if (d.count == null) return d.pending ? "" : `<path class="rg-ogap" d="${segOf(RL[2], i)}"><title>${esc(`${d.dow} ${d.label}: not logged`)}</title></path>`;
      const out = outOf(d.count);
      const tip = `${d.dow} ${d.label}: ${d.count === 0 ? "No BM logged" : plural(d.count, "BM")}${u ? (out ? ", outside your usual" : ", within your usual") : ""}`;
      /* the 1 lane keeps an empty slot on a logged day, so a day with no BM still shows as logged; lanes 2 and 3+ draw only when filled */
      const lanes = [1, 2, 3].map((L) => {
        const on = d.count >= L;
        if (!on && L > 1) return "";
        return `<path class="rg-oseg${on ? ` is-on rg-draw${out ? " is-shift" : ""}` : ""}" style="--i:${i};--k:${L}" pathLength="1" stroke-width="${LW}" d="${segOf(RL[L], i)}"/>`;
      }).join("");
      const zero = d.count === 0 ? (() => { const [zx, zy] = pol(cx, cy, RL[0], A0 + (i + 0.5) * per); return `<circle class="rg-ozero${out ? " is-shift" : ""}" style="--i:${i}" cx="${zx}" cy="${zy}" r="3.4"/>`; })() : "";
      return `<g class="rg-oday"><title>${esc(tip)}</title>${lanes}${zero}</g>`;
    }).join("");
    const lo = u ? clamp(u[0], 0, 3) : 0, hi = u ? clamp(u[1], 0, 3) : 0;
    const ri = lo === 0 ? RL[0] - 7 : RL[lo] - LW / 2 - 2, ro = hi === 0 ? RL[0] + 7 : RL[hi] + LW / 2 + 2;
    const band = u ? `<path class="rg-band" d="${sector(cx, cy, ri, ro, A0 - 0.006, A1 + 0.006)}"/>
        <path class="rg-band-edge" d="${arc(cx, cy, ri, A0 - 0.006, A1 + 0.006)}"/><path class="rg-band-edge" d="${arc(cx, cy, ro, A0 - 0.006, A1 + 0.006)}"/>` : "";
    const laneLbl = ["0", "1", "2", "3+"].map((t, L) => `<text class="rg-yl${u && L >= u[0] && L <= u[1] ? " is-usual" : ""}" x="${cx}" y="${r1(cy - RL[L] + 3.5)}" text-anchor="middle">${t}</text>`).join("");
    const first = slots.findIndex((d) => !!d);
    /* the slots with no day drawn, as a quiet hairline so the ring keeps its shape: before you started (the last 30
       days), or the days still to come (learning, where today counts as to come until it is logged) */
    const drawn = days.length - (days.length && days[days.length - 1].pending ? 1 : 0);
    const before = !learning && first > 0 ? `<path class="rg-ofuture" d="${arc(cx, cy, RL[1], A0, A0 + first * per)}"/>` : "";
    const after = learning && drawn < N ? `<path class="rg-ofuture" d="${arc(cx, cy, RL[1], A0 + drawn * per, A1)}"/>` : "";
    const startA = A0 + (first + 0.5) * per, [sx0, sy] = pol(cx, cy, RL[3] + LW / 2 + 12, startA);
    const startT = slots[first].label;
    const [sx, sa] = placeLabel(sx0, Math.sin(startA * TAU), startT, W);
    let now = "", nowY = 0, nowBox = null;
    if (li != null) {
      const dl = slots[li], na = A0 + (li + 0.5) * per, top = Math.cos(na * TAU) > 0;
      const [mx, my] = pol(cx, cy, RL[3] + LW / 2 + 6, na), [tx0, ty] = pol(cx, cy, RL[3] + LW / 2 + 14, na);
      const t = `${dl.today ? "Today" : dl.label}, ${dl.count === 0 ? "no BM" : dl.count}`, w = t.length * 6.6;
      /* in the top half (always, once Florin knows your usual) the label leans left of the dot; in the bottom half
         (only while learning) it sits by side, and under the dot near 6 o'clock */
      let [tx, ta] = placeLabel(tx0, Math.sin(na * TAU) - (top ? 0.3 : 0), t, W);
      let tyl = r1(top ? ty + 2 : ty + 3.5 - 6 * Math.cos(na * TAU));
      /* near 3 or 9 o'clock the card's edge can push the label back over its own dot: centre it on the dot instead,
         just above it in the ring's top half and just below it in the bottom half */
      if (Math.abs(tx - tx0) > 1 && ta !== "middle") {
        tx = r1(clamp(mx, 2 + w / 2, W - 2 - w / 2)); ta = "middle";
        tyl = r1(top ? my - 9 : my + 16);
      }
      nowY = Math.max(my + 3.2, tyl + 3);
      nowBox = [ta === "start" ? tx : ta === "end" ? tx - w : tx - w / 2, tyl - 10, w, 13];
      now = `<circle class="rg-now${outOf(dl.count) ? " is-shift" : ""}" cx="${mx}" cy="${my}" r="3.2"/><text class="rg-now-lbl" x="${tx}" y="${tyl}" text-anchor="${ta}">${esc(t)}</text>`;
    }
    /* the first day's label gives way to the latest day's label when the two would touch (on day 1 they name the same day) */
    const sw2 = startT.length * 6.6, sBox = [sa === "start" ? sx : sa === "end" ? sx - sw2 : sx - sw2 / 2, sy - 6, sw2, 11];
    const touch = (a, b) => !!a && a[0] < b[0] + b[2] + 4 && b[0] < a[0] + a[2] + 4 && a[1] < b[1] + b[3] + 2 && b[1] < a[1] + a[3] + 2;
    const startLbl = touch(nowBox, sBox) ? "" : `<text class="rg-xt" x="${sx}" y="${r1(sy + 3.5)}" text-anchor="${sa}">${esc(startT)}</text>`;
    /* the ring's height is the lowest point drawn: each day's outermost filled lane, a gap's hairline, the quiet
       hairline, the band, and the labels, each at its own angle (the ring only reaches 6 o'clock where something is) */
    let bot = Math.max(cy + 26, nowY, sy + 7); /* the centre numeral and its unit, and the two labels */
    const reach = (r, a, b) => { bot = Math.max(bot, cy + r * (a <= 0.5 && b >= 0.5 ? 1 : Math.max(-Math.cos(a * TAU), -Math.cos(b * TAU)))); };
    slots.forEach((d, i) => {
      if (!d || d.pending) return;
      reach(d.count == null ? RL[2] + 1 : RL[clamp(d.count, 1, 3)] + LW / 2, A0 + i * per, A0 + (i + 1) * per);
    });
    if (before) reach(RL[1] + 1, A0, A0 + first * per);
    if (after) reach(RL[1] + 1, A0 + drawn * per, A1);
    if (u) reach(ro, A0, A1);
    const H = Math.ceil(bot + 8);
    const gaps = days.filter((d) => d.count == null && !d.pending).length;
    const zeros = known.filter((d) => d.count === 0).length;
    /* a day with no BM is ringed Gold when that is outside your usual, and in the reading colour while learning */
    const zeroOut = known.some((d) => d.count === 0 && outOf(0)), zeroIn = known.some((d) => d.count === 0 && !outOf(0));
    const outPos = known.some((d) => d.count > 0 && outOf(d.count));
    const avgWord = !u || o.avg30 == null ? "" : o.avg30 < u[0] ? "below your usual" : o.avg30 > u[1] ? "above your usual" : "within your usual";
    const extra = [zeros && `${zeros} with no BM`, gaps && `${gaps} not logged`].filter(Boolean);
    const ans = u ? `${inRange} of ${known.length} days within your usual${extra.length ? `, ${andList(extra)}` : ""}.`
      : `${plural(known.length, "day")} logged so far. Florin learns your usual count by day ${D.learning ? D.learning.of : ""}.`;
    const aria = `BMs a day${learning ? ` so far, one ring segment for each of your first ${N} days` : ", last 30 days, one ring segment per day"}. Average ${o.avg30} a day${avgWord ? `, ${avgWord}` : ""}${u ? ` of ${o.usualText}` : ""}. ${ans}${gaps ? ` Days not logged are left as ${gaps === 1 ? "a gap" : "gaps"}.` : ""}`;
    const svg = `<svg class="rg-svg rg-chart rg-oring" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
      ${band}${before}${after}${marks}${laneLbl}${now}
      ${startLbl}
      ${o.avg30 != null ? `<text class="rg-mdial-n rg-mdial-n--sm" x="${cx}" y="${cy + 6}" text-anchor="middle"><tspan data-count="${o.avg30}" data-dec="1" data-dur="1000">${Number(o.avg30).toFixed(1)}</tspan></text>
      <text class="rg-mdial-s" x="${cx}" y="${cy + 22}" text-anchor="middle">a day</text>` : ""}
    </svg>`;
    return card(x, "rg-often", "How often", `
      ${head(x, "How often", u ? chip(x, "usual", o.usualText) : chip(x, "neutral", "Learning"))}
      ${svg}
      <p class="rg-ans">${esc(ans)}</p>
      ${legend(x, [["read", "BMs that day, one lane each"], u && ["band", `Your usual, ${o.usualText}`], outPos && ["shift", "Outside your usual"], zeroOut && ["zero", "No BM logged"], zeroIn && ["zeroread", "No BM logged"], gaps && ["gapline", "Not logged"]])}`);
  }

  /* ---------- form: one ring per form on this option's own scale ---------- */
  function form(D, x) {
    const esc = x.esc, F = D.form, u = F.usual;
    const total = F.total30;
    /* a word log in options A and C covers two steps: draw it as a bracket between those two rings */
    const pairs = {};
    if (D.mode !== "B") D.days[30].forEach((d) => d.forms.forEach((f) => { if (f.level != null && Math.abs(f.level - Math.round(f.level)) > 0.01) { const lo = Math.floor(f.level); pairs[lo] = (pairs[lo] || 0) + 1; } }));
    const firmer = u ? F.bins.filter((b) => b.k < u[0]).reduce((s, b) => s + b.count, 0) : 0;
    const looser = u ? F.bins.filter((b) => b.k > u[1]).reduce((s, b) => s + b.count, 0) : 0;
    const either = u ? D.days[30].reduce((s, d) => s + d.forms.filter((f) => f.within == null).length, 0) : 0;
    const n = F.bins.length;
    const size = 40, swd = 4.2, c = size / 2, r = r1(c - swd / 2 - 1);
    const mono = D.mode === "A";
    const firstU = u ? F.bins.findIndex((b) => b.inUsual) : -1, lastU = u ? F.bins.length - 1 - F.bins.slice().reverse().findIndex((b) => b.inUsual) : -1;
    const cols = F.bins.map((b, i) => {
      const cls = b.count ? (u ? (b.inUsual ? "is-in" : "is-shift") : "is-read") : "is-zero";
      return `<li class="rg-fc ${cls}" style="--i:${i}" title="${esc(`${b.label}: ${plural(b.count, "BM")}`)}">
        <span class="rg-fc-ring"><svg class="rg-day" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="rg-day-trk" cx="${c}" cy="${c}" r="${r}" stroke-width="${swd}"/>${b.count ? `<path class="rg-day-arc rg-draw" pathLength="1" stroke-width="${swd}" d="${arc(c, c, r, 0, Math.max(0.04, b.count / Math.max(1, total)))}"/>` : ""}</svg><b>${b.count}</b></span>
        <span class="rg-fc-l${mono ? " is-mono" : ""}">${esc(b.label)}</span>
      </li>`;
    }).join("");
    const pairList = Object.entries(pairs).map(([lo, cnt]) => ({ i: F.bins.findIndex((b) => b.k === +lo), cnt })).filter((p) => p.i >= 0 && p.i < n - 1);
    const pairRow = pairList.length ? `<div class="rg-fpairs" aria-hidden="true">${pairList.map((p) => `<span class="rg-fpair" style="left:${r1(((p.i + 0.5) / n) * 100)}%;width:${r1((1 / n) * 100)}%"><em>${p.cnt}</em></span>`).join("")}</div>` : "";
    const pairN = pairList.reduce((s, p) => s + p.cnt, 0);
    const usualBand = u && firstU >= 0 ? `<span class="rg-fband" style="left:${r1((firstU / n) * 100)}%;width:${r1(((lastU - firstU + 1) / n) * 100)}%" aria-hidden="true"><em>Your usual</em></span>` : "";
    const was = (k) => (k === 1 ? "was" : "were");
    const ans = !total ? (D.learning ? "No BMs logged so far." : "No BMs logged in the last 30 days.")
      : !u ? `Florin learns your usual forms by day ${D.learning ? D.learning.of : ""}.`
      : firmer && looser ? `${firmer} ${was(firmer)} firmer and ${looser} looser than your usual forms.`
      : firmer ? `${firmer} ${was(firmer)} firmer than your usual forms.`
      : looser ? `${looser} ${was(looser)} looser than your usual forms.`
      : either ? `${either} could be either, the rest sat within your usual forms.` : "Every BM sat within your usual forms.";
    const topB = F.bins.slice().sort((a, b) => b.count - a.count)[0];
    const nameOf = (b) => (mono ? `Type ${b.label}` : b.label);
    const aria = `Forms, ${D.learning ? "so far" : "last 30 days"}. ${u ? `${F.within30} of ${total} within your usual forms, ${F.usualText}. ` : ""}${ans}${either && (firmer || looser) ? ` ${either} could be either.` : ""}${topB && topB.count ? ` ${nameOf(topB)} came up most, ${plural(topB.count, "time")}.` : ""} ${F.bins.map((b) => `${b.label}: ${b.count}`).join(", ")}.${pairN ? ` ${plural(pairN, "BM")} logged as a word covering two forms.` : ""}`;
    return card(x, "rg-form", "Form", `
      ${head(x, `Form · ${mono ? "1 to 7" : D.mode === "B" ? "five words" : "seven words"}`, u ? chip(x, "usual", F.usualText) : chip(x, "neutral", "Learning"))}
      ${u ? lead(x, num(F.within30), `of ${total} within your usual forms`, ans) : lead(x, num(total), "BMs logged", ans)}
      <div class="rg-forms" role="img" aria-label="${esc(aria)}">
        <div class="rg-fbox">${usualBand}<ol class="rg-fcols" style="--n:${n}">${cols}</ol></div>
        ${pairRow}
        <p class="rg-fscale" aria-hidden="true"><span>Firmer</span><span>Looser</span></p>
      </div>
      ${legend(x, [[null, "Number in a ring: BMs of that form"], u && ["band", `Your usual, ${F.usualText}`], (firmer || looser) && ["shift", "Outside your usual forms"], ["arcnote", "Ring: share of all BMs"], pairN && ["pair", "Logged as a word covering both"]])}`);
  }

  /* ---------- symptoms: which came up, day by day ---------- */
  function symptoms(D, x) {
    const esc = x.esc, S = D.symptoms, days = D.days[30];
    const rows = S.rows;
    const W = 326, ring = 36;
    const strip = (cells) => {
      const sw2 = W - ring - 12, cw = sw2 / cells.length;
      return `<svg class="rg-svg rg-strip" viewBox="0 0 ${r1(sw2)} 14" aria-hidden="true">${cells.map((cl, i) => {
        const cx = r1(cw * (i + 0.5));
        if (cl == null) return "";
        if (cl === false) return `<circle class="rg-sd is-none" cx="${cx}" cy="7" r="1.4"/>`;
        if (cl === 0) return `<circle class="rg-sd is-unsaid" style="--i:${i}" cx="${cx}" cy="7" r="2.8"/>`;
        return `<circle class="rg-sd is-s${cl}" style="--i:${i}" cx="${cx}" cy="7" r="${[0, 2.6, 3.6, 4.8][cl]}"/>`;
      }).join("")}${days[cells.length - 1] && days[cells.length - 1].today ? `<line class="rg-sd-today" x1="${r1(cw * (cells.length - 0.5))}" x2="${r1(cw * (cells.length - 0.5))}" y1="0" y2="14"/>` : ""}</svg>`;
    };
    const WORDS = ["mild", "moderate", "strong"];
    /* the strengths in words: "mostly" only when one strength is logged more often than each of the others; a tie names
       the counts. A day logged without a strength is never read as mild, so it is named too */
    const most = (row) => {
      const s = row.cells.filter((cl) => cl > 0), unsaid = row.cells.filter((cl) => cl === 0).length;
      if (!s.length) return "strength not said";
      const k = [1, 2, 3].map((v) => s.filter((cl) => cl === v).length);
      const top = Math.max(...k), kinds = k.filter(Boolean).length;
      /* a count keeps its word on a wrap (a no-break space), so a line never ends on a bare number */
      const counts = () => [...k.map((c, i) => c && `${c}\u00a0${WORDS[i]}`), unsaid && `${unsaid}\u00a0strength not said`].filter(Boolean).join(", ");
      if (unsaid) return counts();
      if (s.length === 1) return WORDS[s[0] - 1];
      if (kinds === 1) return `all ${WORDS[s[0] - 1]}`;
      return k.filter((c) => c === top).length === 1 ? `mostly ${WORDS[k.indexOf(top)]}` : counts();
    };
    const list = rows.map((row, i) => {
      const c = ring / 2, rr = c - 3.5;
      return `<li class="rg-sym" style="--i:${i}">
        <span class="rg-sym-ring"><svg class="rg-day" viewBox="0 0 ${ring} ${ring}" aria-hidden="true"><circle class="rg-day-trk" cx="${c}" cy="${c}" r="${rr}" stroke-width="4"/><path class="rg-day-arc rg-draw" pathLength="1" stroke-width="4" d="${arc(c, c, rr, 0, Math.max(0.03, row.days / Math.max(1, S.logged30)))}"/></svg><b>${row.days}</b></span>
        <div class="rg-sym-main"><p><b>${esc(row.name)}</b><span>${esc(`${row.days} of ${S.logged30} days, ${most(row)}`)}</span></p>${strip(row.cells)}</div>
      </li>`;
    }).join("");
    const top = rows[0];
    const ans = rows.length ? `${top.name} came up most, on ${plural(top.days, "day")}.` : `No symptoms on the ${plural(S.logged30, "day")} you logged.`;
    const aria = `Symptoms, ${D.learning ? "so far" : "last 30 days"}. ${S.withSym30} of ${S.logged30} logged days with symptoms.${S.usualText ? ` Your usual: ${lower1(S.usualText)}.` : ""} ${ans} ${rows.map((row) => `${row.name}: ${plural(row.days, "day")}, ${most(row)}`).join(", ")}.`;
    const strengths = new Set(rows.flatMap((row) => row.cells.filter((cl) => cl != null && cl !== false)));
    return card(x, "rg-symptoms", "Symptoms", `
      ${head(x, D.learning ? "Symptoms · so far" : "Symptoms · 30 days", S.usualText ? chip(x, "usual", `Usual: ${S.usualText.toLowerCase()}`) : chip(x, "neutral", "Learning"))}
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
    const A0 = 0.625, SWEEP = 0.75; /* a 270° gauge, open at the bottom */
    const cta = CK.due ? `<div class="rg-cta"><button type="button" class="rg-btn">Answer this week's check-in</button></div>` : "";
    if (!started) {
      /* not started: one quiet row of four empty gauges, then the next step */
      const mini = Q.map((q) => `<li class="rg-ckm"><svg class="rg-svg" viewBox="0 0 56 56" aria-hidden="true"><path class="rg-trk" stroke-width="6" d="${arc(28, 28, 22, A0, A0 + SWEEP)}"/></svg><span>${esc(q.label)}</span></li>`).join("");
      return card(x, "rg-checkin", "Weekly check-in, not started yet", `
        ${head(x, "Weekly check-in")}
        ${lead(x, "Not started", "", "Four short questions, once a week. Florin compares each week with your first weeks.")}
        <ul class="rg-ckms">${mini}</ul>
        ${cta}`);
    }
    const size = 112, c = size / 2, R = 40, sw2 = 9, RU = R + sw2 / 2 + 6;
    const f = (v) => A0 + SWEEP * (v / 3);
    const nW = Math.max(...Q.map((q) => q.weeks.length));
    const tiles = Q.map((q, qi) => {
      const L = q.latest, b = q.band;
      const shift = q.cmp && q.cmp.k !== "same";
      const band = b ? `<path class="rg-uband rg-draw rg-draw--fast" pathLength="1" d="${arc(c, c, RU, f(b.lo) - (b.lo === b.hi ? 0.03 : 0), f(b.hi) + (b.lo === b.hi ? 0.03 : 0))}"/>` : "";
      const ticks = [0, 1, 2, 3].map((v) => { const [a1, b1] = pol(c, c, R - sw2 / 2 - 3, f(v)), [a2, b2] = pol(c, c, R - sw2 / 2 - 7, f(v)); return `<line class="rg-gtick" x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}"/>`; }).join("");
      const read = L ? (L.v > 0 ? `<path class="rg-arc rg-draw${shift ? " is-shift" : ""}" style="--i:${qi}" pathLength="1" stroke-width="${sw2}" d="${arc(c, c, R, A0, f(L.v))}"/>` : "") + (() => { const [ex, ey] = pol(c, c, R, f(L.v)); return `<circle class="rg-gend${shift ? " is-shift" : ""}" style="--i:${qi}" cx="${ex}" cy="${ey}" r="${sw2 / 2 + 1.5}"/>`; })() : "";
      const [l0x, l0y] = pol(c, c, R, A0), [l1x, l1y] = pol(c, c, R, A0 + SWEEP);
      const hist = q.weeks.length ? (() => {
        const hw = 96, hh = 22, nn = q.weeks.length, xx = (i) => r1(4 + (i * (hw - 8)) / Math.max(1, nn - 1)), yy = (v) => r1(hh - 3 - (v / 3) * (hh - 6));
        const bandR = b ? `<rect class="rg-band" x="0" y="${r1(yy(b.hi) - 3)}" width="${hw}" height="${r1(yy(b.lo) - yy(b.hi) + 6)}" rx="4"/>` : "";
        return `<svg class="rg-hist" viewBox="0 0 ${hw} ${hh}" aria-hidden="true">${bandR}${q.weeks.map((w, i) => (w.v == null ? "" : `<circle class="rg-hd${w === L ? " is-new" : ""}${w === L && shift ? " is-shift" : ""}" style="--i:${i}" cx="${xx(i)}" cy="${yy(w.v)}" r="${w === L ? 3 : 2}"/>`)).join("")}</svg>`;
      })() : "";
      const aria = L ? `${q.label}: ${q.opts[L.v]} in the ${lower1(L.label)}. ${q.cmp ? q.cmp.text : ""}${b ? `. Your first weeks: ${q.ticks[b.lo]}${b.hi !== b.lo ? ` to ${q.ticks[b.hi]}` : ""}` : ""}.` : `${q.label}: not answered yet.`;
      return `<li class="rg-ck">
        <span class="rg-ck-g"><svg class="rg-svg" viewBox="0 0 ${size} ${size - 8}" role="img" aria-label="${esc(aria)}">
          <path class="rg-trk" stroke-width="${sw2}" d="${arc(c, c, R, A0, A0 + SWEEP)}"/>
          <path class="rg-utrk" d="${arc(c, c, RU, A0, A0 + SWEEP)}"/>
          ${band}${ticks}${read}
          <text class="rg-gl" x="${l0x - 2}" y="${r1(l0y + 18)}" text-anchor="middle">${esc(q.ticks[0])}</text>
          <text class="rg-gl" x="${l1x + 2}" y="${r1(l1y + 18)}" text-anchor="middle">${esc(q.ticks[3])}</text>
        </svg><b class="rg-ck-v" aria-hidden="true">${L ? esc(q.ticks[L.v]) : "Not yet"}</b></span>
        <p class="rg-ck-l">${esc(q.label)}</p>
        ${q.cmp ? chip(x, shift ? "shift" : "usual", q.cmp.text) : chip(x, "neutral", "No answer yet")}
        ${hist}
      </li>`;
    }).join("");
    const same = Q.filter((q) => q.cmp && q.cmp.k === "same").length, answered = Q.filter((q) => q.cmp).length;
    const latest = (Q.find((q) => q.latest) || {}).latest;
    const diff = Q.filter((q) => q.cmp && q.cmp.k !== "same");
    const ans = answered && !diff.length ? "Every answer sits within the range of your first weeks."
      : diff.length === 1 ? `${diff[0].label}: ${lower1(diff[0].cmp.text)}.` : `${plural(diff.length, "answer")} moved from your first weeks.`;
    return card(x, "rg-checkin", "Weekly check-in", `
      ${head(x, "Weekly check-in", latest ? dateK(x, latest.label) : "")}
      ${answered ? lead(x, num(same), `of ${answered} like your first weeks`, ans) : lead(x, "Not yet", "", ans)}
      <ul class="rg-cks">${tiles}</ul>
      ${legend(x, [["arcnote", "Latest answer"], ["uband-l", "Your first weeks"], diff.length && ["shift", "Different from your first weeks"], ["hist", `Last ${nW} weeks, newest ringed`]])}
      ${cta}`);
  }

  /* ---------- a possible pattern: two segmented rings, one segment per time ---------- */
  function pattern(D, x) {
    const esc = x.esc, PT = D.patterns, p = PT.found[0];
    const note = `<p class="rg-pnote">${esc(PT.note)}</p>`;
    if (!p) {
      if (D.learning) {
        return card(x, "rg-pattern rg-pattern--empty", "Possible patterns, not started yet", `
          ${head(x, "Possible patterns")}
          <div class="rg-pempty">${learnRing(x, D.learning, 96, "rg-learn--light")}<p class="rg-ptitle">Patterns come later</p></div>
          <p class="rg-ans">${esc(`Florin starts looking once it knows your usual, from day ${D.learning.of}. You're on day ${D.learning.day}.`)}</p>
          ${note}`);
      }
      if (PT.sparse) {
        const cov = Math.round((PT.coverage || 0) * 100);
        const cta = `<div class="rg-cta"><button type="button" class="rg-btn">Start a food check</button></div>`;
        if (!cov) {
          /* no meal logs at all is a choice, not a shortfall: no ring and no 0% */
          const nDays = PT.foodCheckDays;
          return card(x, "rg-pattern rg-pattern--empty", "Possible patterns: food, when you want it", `
            ${head(x, "Possible patterns", chip(x, "info", "Meals"))}
            <p class="rg-ptitle">Florin can look at food when you want it to</p>
            <p class="rg-ans">${esc(nDays ? `Log meals for ${nDays} days and Florin compares them with the days after.` : "Log meals during a food check and Florin compares them with the days after.")}</p>
            ${cta}
            ${note}`);
        }
        const c = 48, r = 40;
        return card(x, "rg-pattern rg-pattern--empty", "Possible patterns: not enough other days to compare", `
          ${head(x, "Possible patterns", chip(x, "info", "Meals"))}
          <div class="rg-pempty">
            <span class="rg-pring"><svg class="rg-svg" viewBox="0 0 96 96" role="img" aria-label="${esc(`Meals logged on ${cov}% of days.`)}"><circle class="rg-trk" cx="${c}" cy="${c}" r="${r}" stroke-width="8"/><path class="rg-arc is-ctx rg-draw" pathLength="1" stroke-width="8" d="${arc(c, c, r, 0, cov / 100)}"/></svg><b><span class="rg-pct">${num(cov, 0, 900)}<small>%</small></span><em>days with meals</em></b></span>
            <p class="rg-ptitle">Not enough other days to compare</p>
          </div>
          <p class="rg-ans">${esc(PT.sparseLine || "")}</p>
          ${cta}
          ${note}`);
      }
      return card(x, "rg-pattern rg-pattern--empty", "Possible patterns: nothing stands out", `
        ${head(x, "Possible patterns")}
        <div class="rg-pempty"><span class="rg-pring"><svg class="rg-svg" viewBox="0 0 96 96" aria-hidden="true"><circle class="rg-trk" cx="48" cy="48" r="40" stroke-width="8"/></svg></span><p class="rg-ptitle">Nothing stands out right now</p></div>
        <p class="rg-ans">Florin compared what you logged with the days after, and nothing repeats often enough to show. It keeps looking as you log.</p>
        ${note}`);
    }
    const what = p.kind === "late" ? ["After a dinner past 8 PM", "After an earlier dinner"] : p.kind === "loose" ? [`The morning after ${p.food.toLowerCase()}`, "Other mornings"] : [`The day after ${p.food.toLowerCase()}`, "Other days"];
    /* a later first BM is a shift from your window, so Gold. A looser first BM or bloating is a reading, not a shift */
    const hitCls = p.kind === "late" ? "is-shift" : "is-on";
    const hitWord = p.kind === "late" ? "Later than your window" : p.kind === "loose" ? "A looser first BM" : "Bloating";
    const ringOf = (hits, cls, label, n, hit, i0, ctx) => {
      const c = 64, r = 54, s = segs(c, c, r, hits.length, hits.length > 40 ? 2 : 3);
      return `<figure class="rg-pr ${cls}">
        <span class="rg-pr-ring"><svg class="rg-svg" viewBox="0 0 128 128" role="img" aria-label="${esc(`${label}: ${hit} of ${n} times.`)}">${ctx ? `<circle class="rg-pctx" cx="${c}" cy="${c}" r="62"/>` : ""}${s.map((d, i) => `<path class="rg-pseg${hits[i] ? ` ${hitCls}` : ""}" style="--i:${i0 + i}" d="${d}"/>`).join("")}</svg>
        <b><span>${num(hit, 0, 1000)}</span><small>of ${n}</small></b></span>
        <figcaption>${ctx ? GLYPH.ctxring : ""}${esc(label)}</figcaption>
      </figure>`;
    };
    const tiers = ["Early signal", "Showing up often", "Consistent"];
    return card(x, "rg-pattern", `A possible pattern: ${p.title}`, `
      ${head(x, "A possible pattern", p.food ? chip(x, "info", p.food) : chip(x, "info", "Dinner time"))}
      <p class="rg-ptitle">${esc(p.title)}</p>
      <div class="rg-prs">${ringOf(p.occ, "is-a", what[0], p.n, p.hit, 0, true)}${ringOf(p.oth, "is-b", what[1], p.on, p.oh, 8, false)}</div>
      <p class="rg-ans">${esc(p.line)}</p>
      ${legend(x, [[p.kind === "late" ? "pshift" : "pread", hitWord], ["ptrack", "Not that time"], [null, "Each segment is one time"]])}
      <div class="rg-sure"><span class="rg-k">How sure</span><p class="rg-tiers"><span class="rg-vh">${esc(`How sure: ${p.tier}`)}</span>${tiers.map((t, i) => `<span aria-hidden="true"${i + 1 === p.tierK ? ' class="is-on"' : ""}>${esc(t)}</span>`).join("")}</p></div>
      ${note}`);
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "rings",
    name: "Rings",
    idea: "One dark hero card with FloraScore as a ring and your usual on it, and every card below read as rings: a morning dial, a 30-day count ring, day rings and part rings that draw themselves in.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }
  });
})();
