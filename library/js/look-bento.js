/* Look: Bento. A modular grid of tiles, like well-made home-screen widgets. Each card is a small bento of two to four
   tiles of different sizes, and each tile holds one glanceable fact with a mini visual: a mini ring, a sparkline, a
   segmented bar, a pill row or a big number. FloraScore is a glass widget: a soft gradient built from the brand
   colours, a frosted panel, and the ring sitting on it at the left with the answer beside it. The month is a heat
   calendar of rounded squares, the week is seven pills, and the check-in answers are stacked chips.
   Every number is read from D; nothing is typed, and a card's period comes from its own array. Colours: the reading
   is --ap-chart (Ray on the hero), your usual is Plum on light and Ray on dark, a shift either way is Gold, a day or
   BM that could be either is a quiet Ink 3 (never Gold), context (a meal) is Teal, and every colour has a word beside it. Two measures stay named apart: the week and month read your
   BMs against your usual, the trend reads FloraScore against its usual range.
   Every rule in look-bento.css sits under .lk-bento. */
(function () {
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const low = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DOWL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
  /* a time without its AM or PM, and the AM or PM on its own, for a big numeral with a small unit */
  const hm = (t) => t.replace(/ (AM|PM)$/, "");
  const ampm = (t) => (t.match(/(AM|PM)$/) || [""])[0];
  /* a stagger index on 0 to 20 whatever the count, so a card's marks settle by about 1.4s */
  const jn = (i, n) => Math.round((i * 20) / Math.max(1, n));
  /* the period a card covers, from its own array: "So far" while Florin is still learning */
  const per = (D, arr) => (D.learning ? "So far" : `${arr.length} days`);
  /* the content width of a tile, by its span on the six-column board (358px card, 8px gaps, 16px or 12px padding) */
  const TW = { 6: 326, 4: 204, 3: 143, 2: 90 };

  /* the state of one day: a class, its word, and the order a legend lists it in */
  const ST = {
    usual: ["u", "Within your usual"],
    shifted: ["s", "Shifted"],
    unsure: ["e", "Could be either"],
    nocount: ["c", "Logged, no BMs said"],
    logged: ["l", "Logged"],
    none: ["x", "No logs"]
  };
  const ORDER = ["usual", "shifted", "unsure", "nocount", "logged", "none"];
  const stOf = (d) => (d.pending ? ["x", "Not logged yet"] : ST[d.state] || ST.none);
  const stateLegend = (days) => ORDER.filter((k) => days.some((d) => d.state === k)).map((k) => [ST[k][0] === "u" ? "uf" : ST[k][0], ST[k][1]]);

  /* ---------- markup ---------- */
  const board = (x, label, tiles, foot) => `<article class="bt" aria-label="${x.esc(label)}"><div class="bt-g">${tiles.filter(Boolean).join("")}</div>${foot || ""}</article>`;
  const tile = (o, inner) => `<div class="bt-t bt-s${o.s || 6}${o.s === 2 ? " bt-t--n" : ""}${o.cls ? " " + o.cls : ""}" style="--i:${o.i || 0}">${inner}</div>`;
  const kick = (x, k, meta, cls) => `<div class="bt-kr"><p class="bt-k${cls ? " " + cls : ""}">${x.esc(k)}</p>${meta ? `<p class="bt-k bt-k--m">${x.esc(meta)}</p>` : ""}</div>`;
  const num = (v, o = {}) => `<b class="bt-num" data-count="${v}"${o.dec ? ` data-dec="${o.dec}"` : ""} data-dur="${o.dur || 1000}">${o.dec ? Number(v).toFixed(o.dec) : v}</b>`;
  const big = (x, v, unit, o = {}) => `<p class="bt-n${o.size ? " bt-n--" + o.size : ""}">${o.raw ? `<b class="bt-num">${x.esc(v)}</b>` : num(v, o)}${unit ? `<span class="bt-u">${x.esc(unit)}</span>` : ""}</p>`;
  const ans = (x, t, cls) => `<p class="bt-a${cls ? " " + cls : ""}">${x.esc(t)}</p>`;
  const sub = (x, t, cls) => `<p class="bt-sub${cls ? " " + cls : ""}">${x.esc(t)}</p>`;
  const chip = (x, k, t) => `<span class="bt-chip bt-chip--${k}">${x.esc(t)}</span>`;
  const legend = (x, items, cls) => `<ul class="bt-lg${cls ? " " + cls : ""}">${items.filter(Boolean).map(([sw, t]) => `<li><i class="bt-sw bt-sw--${sw}" aria-hidden="true"></i>${x.esc(t)}</li>`).join("")}</ul>`;
  const fine = (x, t, attr) => `<p class="bt-fine"${attr ? " " + attr : ""}>${x.esc(t)}</p>`;
  const dash = (x, a, b) => `${a} to ${b}`;

  /* a mini ring: segments as shares of one turn, clockwise from 12 o'clock, a small gap between them */
  const miniRing = (x, o) => {
    const s = o.size || 96, sw = o.sw || 10, c = s / 2, r = c - sw / 2 - 1;
    const segs = o.segs.filter((g) => g.v > 0);
    const total = o.total || sum(segs.map((g) => g.v)) || 1;
    const gap = segs.length > 1 ? 2 : 0;
    let acc = 0;
    const arcs = segs.map((g, k) => {
      const len = (g.v / total) * 100;
      const el = `<circle class="bt-ra bt-ra--${g.cls}${segs.length === 1 ? " is-solo" : ""}" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}" pathLength="100" style="stroke-dasharray:${r1(Math.max(0.6, len - gap))} 100;stroke-dashoffset:${r1(-acc - gap / 2)};--k:${k}" transform="rotate(-90 ${c} ${c})"/>`;
      acc += len;
      return el;
    }).join("");
    const tick = o.tick != null ? (() => {
      const a = (o.tick / (o.total || 100)) * Math.PI * 2, x0 = c + Math.sin(a) * (r - sw / 2 - 3), y0 = c - Math.cos(a) * (r - sw / 2 - 3), x1 = c + Math.sin(a) * (r + sw / 2 + 3), y1 = c - Math.cos(a) * (r + sw / 2 + 3);
      return `<line class="bt-rtick" x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}"/>`;
    })() : "";
    return `<div class="bt-ring" style="--sz:${s}px"><svg viewBox="0 0 ${s} ${s}" role="img" aria-label="${x.esc(o.aria)}"><circle class="bt-rt" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>${arcs}${tick}</svg>${o.center ? `<div class="bt-ring-c" aria-hidden="true">${o.center}</div>` : ""}</div>`;
  };

  /* a row of small pills, one per step: the learning days, or any count out of a total */
  const steps = (x, n, of, aria) => `<div class="bt-steps" role="img" aria-label="${x.esc(aria)}">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? "is-on" : ""}${i === n - 1 ? " is-now" : ""}" style="--j:${i}"></i>`).join("")}</div>`;

  /* a one-line strip of days, each a short bar in its state's colour, drawn at the tile's own width. A day with no
     logs is a dash at the baseline, the same gap mark the charts use; today, while it is still open, draws nothing,
     since it isn't a gap yet. A short run (the first days) keeps wide cells from the left instead of thin ones pushed
     to one side. o.dots puts a Teal dot under a day (a meal logged). */
  const dayStrip = (x, cells, aria, w, o = {}) => {
    const n = cells.length, ch = 20, gap = n < 30 ? 4 : w < 200 ? 1.5 : 2;
    const bw = n < 30 ? Math.min(40, (w - gap * (n - 1)) / n) : (w - gap * (n - 1)) / n;
    const st = bw + gap, H = ch + (o.dots ? 10 : 0);
    const marks = cells.map((c, j) => {
      const mid = j * st + bw / 2, hw = Math.min(3, bw / 2);
      const dot = o.dots && o.dots[j] ? `<circle class="bt-mealdot bt-pop" cx="${r1(mid)}" cy="${ch + 6}" r="2.5" style="--j:${jn(j, n)}"/>` : "";
      if (c.pending) return dot;
      if (c.cls === "x") return `<line class="bt-gapmark" x1="${r1(mid - hw)}" x2="${r1(mid + hw)}" y1="${ch - 1}" y2="${ch - 1}"/>${dot}`;
      return `<rect class="bt-sc bt-sc--${c.cls}${c.today ? " is-today" : ""} bt-grow" x="${r1(j * st)}" y="0" width="${r1(bw)}" height="${ch}" rx="${r1(Math.min(4, bw / 2))}" style="--j:${jn(j, n)}"/>${dot}`;
    }).join("");
    return `<svg class="bt-strip" viewBox="0 0 ${w} ${H}" role="img" aria-label="${x.esc(aria)}">${marks}</svg>`;
  };

  /* runs of consecutive points, so a gap stays a gap */
  const runs = (pts) => { const out = []; let cur = []; pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; };

  /* a sparkline with the usual band drawn first, the newest point ringed. o.dots false keeps a long run calm: only
     the line, the band and the newest point. A run of one or two scored days between gaps is drawn as points, not a
     line: a short stroke between breaks would read as a dashed line, and a lone point would draw nothing */
  const spark = (x, vals, o) => {
    const w = o.w, h = o.h, pad = 6;
    const nums = vals.filter((v) => v != null);
    if (!nums.length) return "";
    const lo = Math.min(...nums, o.band ? o.band[0] : Infinity) - 3, hi = Math.max(...nums, o.band ? o.band[1] : -Infinity) + 3;
    const X = x.lin(0, Math.max(1, vals.length - 1), pad, w - pad), Y = x.lin(lo, hi, h - pad, pad);
    const pts = vals.map((v, i) => (v == null ? null : [X(i), Y(v)]));
    const last = pts.map((p, i) => (p ? i : -1)).filter((i) => i >= 0).pop();
    const segs = runs(pts);
    const out = (v) => o.band && v != null && (v < o.band[0] || v > o.band[1]);
    const idx = new Map(pts.map((p, i) => [p, i]));
    /* a point that already carries its own mark (the newest, or an outside point when dots are on) isn't drawn twice */
    const marked = (i) => i === last || (o.dots !== false && out(vals[i]));
    const shortDots = segs.filter((sg) => sg.length < 3).flat().map((p) => idx.get(p)).filter((i) => !marked(i));
    return `<svg class="bt-spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="${x.esc(o.aria)}">
      ${o.band ? `<rect class="bt-band" x="0" y="${r1(Y(o.band[1]))}" width="${w}" height="${r1(Math.max(2, Y(o.band[0]) - Y(o.band[1])))}" rx="4"/>` : ""}
      ${segs.filter((sg) => sg.length > 2).map((sg) => `<path class="bt-line bt-draw" pathLength="1" d="${x.C.path(sg)}"/>`).join("")}
      ${shortDots.map((i) => `<circle class="bt-dot bt-pop" cx="${r1(pts[i][0])}" cy="${r1(pts[i][1])}" r="2" style="--j:${jn(i, vals.length)}"/>`).join("")}
      ${o.dots === false ? "" : pts.map((p, i) => (p && i !== last && out(vals[i]) ? `<circle class="bt-dot is-s bt-pop" cx="${r1(p[0])}" cy="${r1(p[1])}" r="3" style="--j:${jn(i, vals.length)}"/>` : "")).join("")}
      ${last != null ? `<circle class="bt-end bt-pop${out(vals[last]) ? " is-s" : ""}" cx="${r1(pts[last][0])}" cy="${r1(pts[last][1])}" r="4.5" style="--j:20"/>` : ""}
    </svg>`;
  };

  /* one reading on a range bar: your usual range drawn first as a band with its ends named, then last week (open)
     and this week (filled, Gold when it sits outside the range) */
  const rangeBar = (x, o) => {
    const w = o.w, h = 36, u = o.band, vals = [o.now, o.before].filter((v) => v != null);
    const lo = Math.min(u[0], ...vals) - 4, hi = Math.max(u[1], ...vals) + 4;
    const X = x.lin(lo, hi, 6, w - 6), cy = 10;
    const out = o.now < u[0] || o.now > u[1];
    return `<svg class="bt-mini" viewBox="0 0 ${w} ${h}" role="img" aria-label="${x.esc(o.aria)}">
      <line class="bt-base" x1="0" x2="${w}" y1="${cy}" y2="${cy}"/>
      <rect class="bt-band bt-fade" x="${r1(X(u[0]))}" y="${cy - 8}" width="${r1(X(u[1]) - X(u[0]))}" height="16" rx="8"/>
      <text class="bt-lbl bt-lbl--u" x="${r1(X(u[0]))}" y="${h - 2}" text-anchor="middle">${u[0]}</text><text class="bt-lbl bt-lbl--u" x="${r1(X(u[1]))}" y="${h - 2}" text-anchor="middle">${u[1]}</text>
      ${o.before != null ? `<circle class="bt-was bt-pop" cx="${r1(X(o.before))}" cy="${cy}" r="4.5" style="--j:4"/>` : ""}
      <circle class="bt-end bt-pop${out ? " is-s" : ""}" cx="${r1(X(o.now))}" cy="${cy}" r="5.5" style="--j:10"/>
    </svg>`;
  };

  /* the learning tile: where Florin is in its first days */
  const learnTile = (x, D, o) => {
    const L = D.learning;
    const wide = (o.s || 6) > 3;
    return tile({ s: o.s || 6, i: o.i || 0, cls: o.cls }, `${kick(x, o.k, wide ? `Day ${L.day} of ${L.of}` : "")}${ans(x, o.a, o.acls)}${steps(x, L.day, L.of, `Day ${L.day} of ${L.of}. Florin is still learning your usual.`)}${wide ? "" : sub(x, `Day ${L.day} of ${L.of}`)}${o.sub ? sub(x, o.sub) : ""}`);
  };

  /* ===================================================================== FloraScore: the glass widget */
  /* the ring: the reading is the thick Ray arc, your usual range a thin solid Ray bracket just outside it */
  const heroDial = (x, o) => {
    const S = 136, c = 68, R = 54, sw = 12, RB = R + sw / 2 + 5;
    let svg;
    if (o.learn) {
      const n = o.learn.of, g = 2.4;
      svg = `<circle class="bt-hr-trk" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}"/>` + Array.from({ length: n }, (_, i) => `<circle class="bt-hr-seg${i < o.learn.day ? " is-on" : ""}" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}" pathLength="100" style="stroke-dasharray:${r1(100 / n - g)} 100;stroke-dashoffset:${r1(-(i * 100) / n - g / 2)};--k:${i}" transform="rotate(-90 ${c} ${c})"/>`).join("");
    } else {
      const u = o.u, v = o.v;
      const knob = v != null ? (() => { const a = (clamp(v, 0, 100) / 100) * Math.PI * 2; return `<circle class="bt-hr-knob${o.shift ? " is-s" : ""}" cx="${r1(c + Math.sin(a) * R)}" cy="${r1(c - Math.cos(a) * R)}" r="7"/>`; })() : "";
      svg = `<circle class="bt-hr-trk" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}"/>
        <circle class="bt-hr-band" cx="${c}" cy="${c}" r="${RB}" stroke-width="3" pathLength="100" style="stroke-dasharray:${u[1] - u[0]} 100;stroke-dashoffset:${-u[0]}" transform="rotate(-90 ${c} ${c})"/>
        ${v != null ? `<circle class="bt-hr-arc" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}" pathLength="100" style="stroke-dasharray:${clamp(v, 0, 100)} 100" transform="rotate(-90 ${c} ${c})"/>` : ""}
        ${knob}`;
    }
    return `<svg class="bt-hr" viewBox="0 0 ${S} ${S}" role="img" aria-label="${x.esc(o.aria)}">${svg}</svg>`;
  };
  const hero = (x, D, o) => tile({ s: 6, i: 0, cls: "bt-hero" }, `
      <i class="bt-orb bt-orb--a" aria-hidden="true"></i><i class="bt-orb bt-orb--b" aria-hidden="true"></i>
      <div class="bt-hero-top"><p class="bt-k bt-k--ray">FloraScore</p><p class="bt-k bt-k--hm">${x.esc(D.todayLabel)}</p></div>
      <div class="bt-glass">
        <div class="bt-dial">${heroDial(x, o)}<div class="bt-dial-c" aria-hidden="true">${o.center}</div></div>
        <div class="bt-hero-r">${o.panel}</div>
      </div>
      ${o.legend || ""}`);

  function score(D, x) {
    const S = D.score, E = x.esc;
    if (!S.usual) {
      const Ln = S.learning || { day: D.learning.day, of: D.learning.of, line: "" };
      const W = D.days[30], logged = W.filter((f) => f.logged).length;
      /* the strip's cells, and a word for each kind of mark it draws (today, still open, draws none) */
      const cells = W.map((f) => ({ cls: stOf(f)[0], today: f.today, pending: f.pending }));
      const drawn = new Set(cells.filter((c) => !c.pending).map((c) => c.cls));
      return board(x, "FloraScore, still learning your usual", [
        hero(x, D, {
          learn: Ln, aria: `Day ${Ln.day} of ${Ln.of}. Florin is still learning your usual.`,
          center: `<span class="bt-dial-k">Day</span><b class="bt-dial-n">${num(Ln.day, { dur: 700 })}</b><span class="bt-dial-s">of ${Ln.of}</span>`,
          panel: `<p class="bt-hero-a">Learning your usual</p><p class="bt-hero-s">${E(Ln.line)}</p>`,
          legend: legend(x, [["hseg", `Days so far, ${Ln.day}`], ["htrk", `Days to go, ${Ln.of - Ln.day}`]], "bt-lg--hero")
        }),
        tile({ s: 3, i: 1 }, `${kick(x, "Logged so far")}${big(x, logged, `of ${pl(W.length, "day")}`, { size: "md" })}${dayStrip(x, cells, `${logged} of ${W.length} days logged`, TW[3])}
          ${legend(x, [drawn.has("l") && ["r", "Logged"], drawn.has("c") && ["c", ST.nocount[1]], drawn.has("x") && ["gap", "No logs"]])}`),
        tile({ s: 3, i: 2 }, `${kick(x, "What counts")}${sub(x, "A BM, or No BM, each day. Symptoms and meals when they come up.")}`)
      ], fine(x, "FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.", "data-disclaimer"));
    }
    const v = S.value, u = S.usual;
    const shift = v != null && (v < u[0] || v > u[1]);
    const aria = v == null ? `No FloraScore yet today. Your usual range is ${u[0]} to ${u[1]}.` : `FloraScore today ${v}. ${S.relation}, ${u[0]} to ${u[1]}.`;
    const dChip = S.delta == null ? "" : chip(x, "hero", S.delta > 0 ? `This week, up ${S.delta} on last week` : S.delta < 0 ? `This week, down ${-S.delta} on last week` : "This week, the same as last week");
    const h = hero(x, D, {
      v, u, shift, aria,
      center: v != null ? `<b class="bt-dial-n${String(v).length > 2 ? " bt-dial-n--3" : ""}">${num(v, { dur: 1300 })}</b><span class="bt-dial-s">of 100</span>` : `<b class="bt-dial-n bt-dial-n--sm">Not yet</b><span class="bt-dial-s">today</span>`,
      panel: `<p class="bt-k bt-k--ray">Today</p>
        <p class="bt-hero-a">${E(v != null ? S.relation : "Not enough logs yet today")}</p>
        <p class="bt-hero-s">${E(v != null ? `Your usual range is ${u[0]} to ${u[1]}.` : `Log a BM and today's score fills in. Your usual range is ${u[0]} to ${u[1]}.`)}</p>
        ${dChip ? `<div class="bt-chips">${dChip}</div>` : ""}`,
      legend: legend(x, [v != null && ["hring", `Today, ${v}`], ["hband", `Your usual, ${dash(x, u[0], u[1])}`], shift && ["hshift", "Outside your usual"]], "bt-lg--hero")
    });
    const s7 = (S.series && S.series[7]) || [];
    const wk = S.weekAvg != null ? tile({ s: 3, i: 1 }, `${kick(x, "Week average")}${big(x, S.weekAvg, "this week")}
        ${rangeBar(x, { w: TW[3], band: u, now: S.weekAvg, before: S.lastWeekAvg, aria: `Week average ${S.weekAvg} this week, ${S.lastWeekAvg} last week. Your usual range is ${u[0]} to ${u[1]}.` })}
        ${legend(x, [S.weekAvg < u[0] || S.weekAvg > u[1] ? ["sdot", "This week, outside your usual"] : ["now", "This week"], ["was", `Last week, ${S.lastWeekAvg}`]])}`) : "";
    const sp = s7.length ? tile({ s: 3, i: 2 }, `${kick(x, `Last ${s7.length} days`)}
        ${spark(x, s7.map((p) => p.value), { w: TW[3], h: 64, band: u, aria: `FloraScore over the last ${s7.length} days, today ${v != null ? v : "not yet"}. Your usual range is ${u[0]} to ${u[1]}.` })}
        <div class="bt-ax"><span>${E(s7[0].dow)}</span><span>Today</span></div>
        ${legend(x, [["band", "Your usual"], s7.some((p) => p.value != null && (p.value < u[0] || p.value > u[1])) && ["sdot", "Outside it"]])}`) : "";
    const how = tile({ s: 6, i: 3, cls: "bt-t--how" }, `<span class="bt-ico" aria-hidden="true">i</span><p class="bt-how" data-disclaimer>${E(S.how)}</p>`);
    return board(x, `FloraScore today${v != null ? `, ${v}` : ""}`, [h, wk, sp, how]);
  }

  /* ===================================================================== the four parts */
  function parts(D, x) {
    const S = D.score, P = S.parts || [];
    if (!S.usual || !P.length) {
      return board(x, "The four parts of FloraScore, not started yet", [
        D.learning ? learnTile(x, D, { k: "What makes up the score", a: "Four parts, each read against your own usual. They fill in with your FloraScore." }) : tile({ s: 6 }, `${kick(x, "What makes up the score")}${ans(x, "The four parts fill in once this week and last week both have logs.")}`),
        ...["Timing", "How often", "Form", "Comfort"].map((nm, k) => tile({ s: 3, i: k + 1, cls: "bt-t--c bt-t--ghost" }, `<p class="bt-pname">${x.esc(nm)}</p><div class="bt-meter" aria-hidden="true"></div>${sub(x, "Not started", "bt-sub--xs")}`))
      ]);
    }
    const byMove = P.reduce((a, p) => (Math.abs(p.delta) > Math.abs(a.delta) ? p : a), P[0]);
    const moved = Math.abs(byMove.delta) > 0;
    const lead = moved ? byMove : P.reduce((a, p) => (p.weight > a.weight ? p : a), P[0]);
    const rest = P.filter((p) => p !== lead);
    const share = (p) => `${Math.round(p.weight * 100)}% of score`;
    const d1 = (p) => Math.abs(p.delta).toFixed(1);
    /* the move is in score points, so it reads as what the part added to the score, not as the part's own change */
    const dWord = (p) => (p.delta > 0 ? `added ${d1(p)} points to your score` : p.delta < 0 ? `took ${d1(p)} points from your score` : "held about the same");
    const dShort = (p) => (p.delta > 0 ? `+${d1(p)} to score` : p.delta < 0 ? `−${d1(p)} to score` : "Same");
    const leadTile = tile({ s: 3, i: 0, cls: "bt-t--tall" }, `
      ${kick(x, moved ? "Moved it most" : "The biggest part")}
      ${ans(x, moved ? `${lead.label} ${dWord(lead)} since last week.` : "Every part held about the same as last week.", "bt-a--md")}
      ${miniRing(x, { size: 112, sw: 11, segs: [{ v: lead.now, cls: "r" }], total: 100, tick: lead.before, aria: `${lead.label}: ${lead.now} out of 100 this week, ${lead.before} last week. It ${dWord(lead)}.`, center: `<b class="bt-ring-n">${num(lead.now, { dur: 1100 })}</b><span class="bt-ring-s">this week</span>` })}
      <p class="bt-pname bt-pname--lead">${x.esc(lead.label)}</p>
      ${sub(x, `Was ${lead.before} last week`)}
      ${sub(x, share(lead), "bt-sub--xs")}`);
    const small = rest.map((p, k) => tile({ s: 3, i: k + 1, cls: "bt-t--c" }, `
      <p class="bt-pname">${x.esc(p.label)}</p>
      <div class="bt-prow"><p class="bt-n bt-n--md">${num(p.now, { dur: 900 })}</p><p class="bt-delta">${dShort(p)}</p></div>
      <div class="bt-meter" role="img" aria-label="${x.esc(`${p.label}: ${p.now} out of 100 this week, ${p.before} last week. It ${dWord(p)}.`)}"><i style="--w:${clamp(p.now, 0, 100)}%"></i><b style="--at:${clamp(p.before, 0, 100)}%"></b></div>
      ${sub(x, share(p), "bt-sub--xs")}`));
    return board(x, `What makes up the score. ${moved ? `${lead.label} ${dWord(lead)} since last week.` : "About the same as last week."}`, [leadTile, ...small],
      `${legend(x, [["r", "This week, out of 100"], ["tick", "Last week"]], "bt-lg--out")}${fine(x, "Each part reads you against your own usual. Points are what each part added to or took from the score since last week. FloraScore isn't a medical score, and a lower number isn't a diagnosis.", "data-disclaimer")}`);
  }

  /* ===================================================================== FloraScore over 30 days */
  function trend(D, x) {
    const S = D.score;
    if (!S.usual || !S.series) {
      return board(x, "FloraScore over time, not started yet", [
        learnTile(x, D, { k: "FloraScore over time", a: "Your trend starts with your first FloraScore.", sub: S.learning ? S.learning.line : "" })
      ]);
    }
    const ser = S.series[30], u = S.usual, E = x.esc;
    const known = ser.filter((s) => s.value != null);
    const inN = known.filter((s) => s.value >= u[0] && s.value <= u[1]).length;
    const above = known.filter((s) => s.value > u[1]).length, below = known.filter((s) => s.value < u[0]).length;
    const avg = known.length ? Math.round(sum(known.map((s) => s.value)) / known.length) : null;
    const lastI = ser.map((s, i) => (s.value != null ? i : -1)).filter((i) => i >= 0).pop();
    const answer = `FloraScore was within its usual range on ${inN} of ${pl(known.length, "day")}.`;
    /* the chart */
    const w = TW[6], top = 12, left = 24, right = 8, ph = 132, H = top + ph + 22;
    const lo = Math.floor((Math.min(...known.map((s) => s.value), u[0]) - 2) / 5) * 5, hi = Math.ceil((Math.max(...known.map((s) => s.value), u[1]) + 2) / 5) * 5;
    const X = x.lin(0, Math.max(1, ser.length - 1), left + 6, w - right - 6), Y = x.lin(lo, hi, top + ph, top);
    const ticks = []; for (let t = Math.ceil(lo / 10) * 10; t <= hi; t += 10) ticks.push(t);
    const pts = ser.map((s, i) => (s.value == null ? null : [X(i), Y(s.value)]));
    const segs = runs(pts);
    const outside = (vv) => vv < u[0] || vv > u[1];
    const lv = lastI != null ? ser[lastI].value : null;
    const lx = lastI != null ? X(lastI) : 0, ly = lv != null ? Y(lv) : 0;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} Its usual range is ${u[0]} to ${u[1]}. Above it on ${above} days and below it on ${below}. Today ${lv != null ? lv : "not yet"}.`)}">
      ${ticks.map((t) => `<line class="bt-gl" x1="${left}" x2="${w - right}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/><text class="bt-tick" x="${left - 6}" y="${r1(Y(t) + 3.5)}" text-anchor="end">${t}</text>`).join("")}
      <rect class="bt-band bt-fade" x="${left}" y="${r1(Y(u[1]))}" width="${w - left - right}" height="${r1(Y(u[0]) - Y(u[1]))}" rx="4"/>
      <line class="bt-bedge" x1="${left}" x2="${w - right}" y1="${r1(Y(u[1]))}" y2="${r1(Y(u[1]))}"/><line class="bt-bedge" x1="${left}" x2="${w - right}" y1="${r1(Y(u[0]))}" y2="${r1(Y(u[0]))}"/>
      ${segs.map((s) => `<path class="bt-line bt-draw" pathLength="1" d="${x.C.path(s)}"/>`).join("")}
      ${pts.map((p, i) => (!p || i === lastI ? "" : `<circle class="bt-dot bt-pop${outside(ser[i].value) ? " is-s" : ""}" cx="${r1(p[0])}" cy="${r1(p[1])}" r="${outside(ser[i].value) ? 3 : 2.2}" style="--j:${jn(i, ser.length)}"/>`)).join("")}
      ${lv != null ? `<circle class="bt-halo bt-pop" cx="${r1(lx)}" cy="${r1(ly)}" r="9" style="--j:20"/><circle class="bt-end bt-pop${outside(lv) ? " is-s" : ""}" cx="${r1(lx)}" cy="${r1(ly)}" r="5" style="--j:20"/>` : ""}
      <text class="bt-tick" x="${left + 6}" y="${H - 4}">${E(ser[0].label)}</text>
      <text class="bt-tick" x="${r1(X(Math.floor((ser.length - 1) / 2)))}" y="${H - 4}" text-anchor="middle">${E(ser[Math.floor((ser.length - 1) / 2)].label)}</text>
      <text class="bt-tick bt-lbl--now" x="${w - right}" y="${H - 4}" text-anchor="end">${lv != null && lastI === ser.length - 1 ? `Today ${lv}` : "Today"}</text>
    </svg>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, `FloraScore · ${ser.length} days`, `${ser[0].label} to ${ser[ser.length - 1].label}`)}
      ${ans(x, answer)}
      ${chart}
      ${legend(x, [["line", "FloraScore"], ["band", `Its usual range, ${dash(x, u[0], u[1])}`], (above || below) && ["sdot", "Outside its usual range"], lv != null && ["today", "Today"]])}`);
    /* the longer view: 90 days, calm, the line over its usual range */
    const s90 = (S.series[90] || []);
    const k90 = s90.filter((s) => s.value != null);
    const in90 = k90.filter((s) => s.value >= u[0] && s.value <= u[1]).length;
    const long = k90.length > known.length ? tile({ s: 4, i: 1, cls: "bt-t--c" }, `${kick(x, `Last ${s90.length} days`)}
      ${spark(x, s90.map((s) => s.value), { w: TW[4], h: 56, band: u, dots: false, aria: `FloraScore over the last ${s90.length} days: within its usual range on ${in90} of ${k90.length} days with a score.` })}
      <div class="bt-ax"><span>${E(s90[0].label)}</span><span>Today</span></div>
      ${sub(x, `Within its usual range on ${in90} of ${pl(k90.length, "day")}.`, "bt-sub--xs")}`) : "";
    const av = avg != null ? tile({ s: long ? 2 : 6, i: 2, cls: "bt-t--c" }, `${kick(x, "Average")}${big(x, avg, "", { size: "md" })}${sub(x, `Over ${pl(known.length, "day")}`, "bt-sub--xs")}`) : "";
    return board(x, `FloraScore over ${ser.length} days. ${answer}`, [main, long, av]);
  }

  /* ===================================================================== this week: seven pills */
  function week(D, x) {
    const W = D.days[7], Ln = D.learning, E = x.esc, U = D.often.usual;
    const logged = W.filter((f) => f.logged);
    const nU = W.filter((f) => f.state === "usual").length, nS = W.filter((f) => f.state === "shifted").length;
    /* the pills read your BMs, not FloraScore: the answer names the measure */
    const answer = !logged.length ? "Nothing logged this week yet."
      : Ln ? `${pl(logged.length, "day")} logged so far. Florin learns your usual by day ${Ln.of}.`
      : `On ${nU} of ${pl(logged.length, "logged day")}, your BMs were within your usual.${nS ? ` On ${nS}, they shifted.` : ""}`;
    /* a week shorter than seven days (the first days) keeps its seven slots: the days before you started stay empty */
    const padN = Math.max(0, 7 - W.length);
    const firstI = DOWS.indexOf(W[0] ? W[0].dow : "Mon");
    const pads = Array.from({ length: padN }, (_, k) => DOWS[(firstI - padN + k + 7) % 7]);
    /* one dot per BM; past four, three dots and the rest as a number, so no BM drops out silently */
    const dots = (f) => (f.count == null ? "" : f.count === 0 ? `<i class="is-zero"></i>` : f.count > 4 ? `<em>+${f.count - 3}</em>${"<i></i>".repeat(3)}` : "<i></i>".repeat(f.count));
    const pill = (f, j) => {
      const [c] = stOf(f);
      return `<li class="bt-day bt-day--${c}${f.today ? " is-today" : ""}" style="--j:${j}"><span class="bt-pill"><span class="bt-pdots">${dots(f)}</span></span><span class="bt-dow">${f.today ? "Today" : E(f.dow)}</span></li>`;
    };
    const aria = `${answer} ${W.map((f) => `${f.today ? "Today" : DOWL[f.dow] || f.dow}: ${low(stOf(f)[1])}${f.count != null ? `, ${pl(f.count, "BM")}` : ""}`).join(". ")}.`;
    const pills = `<ol class="bt-week" role="img" aria-label="${E(aria)}">${pads.map((d) => `<li class="bt-day bt-day--pad"><span class="bt-pill"></span><span class="bt-dow">${d}</span></li>`).join("")}${W.map((f, j) => pill(f, j + padN)).join("")}</ol>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "This week", W.length ? `${W[0].label} to ${W[W.length - 1].label}` : "")}${ans(x, answer)}${pills}
      ${legend(x, [...stateLegend(W), ["bms", "One dot per BM"], ["today", "Today"]])}`);
    /* today */
    const t = W[W.length - 1];
    let today;
    if (!t || !t.logged) today = tile({ s: 3, i: 1 }, `${kick(x, "Today")}${ans(x, "Nothing logged yet", "bt-a--md")}${sub(x, "Log a BM, or No BM, when you're ready.")}`);
    else {
      const symChips = t.sym.map((s) => chip(x, "none", s.strength ? `${s.name}, ${low(s.word)}` : s.name)).join("");
      const head = t.first != null ? big(x, hm(t.firstText), ampm(t.firstText), { raw: true, size: "md" }) + sub(x, `First BM · ${pl(t.count, "BM")} so far`)
        : t.count === 0 ? big(x, "No BM", "", { raw: true, size: "md" }) + sub(x, "Logged today")
        : big(x, "Logged", "", { raw: true, size: "md" }) + sub(x, "No BMs said yet");
      today = tile({ s: 3, i: 1 }, `${kick(x, "Today")}${head}${symChips ? `<div class="bt-chips">${symChips}</div>` : ""}`);
    }
    /* BMs this week: one small bar per day over your usual count, gaps left empty */
    const withC = W.filter((f) => f.count != null);
    const total = sum(withC.map((f) => f.count));
    const mx = Math.max(2, ...withC.map((f) => f.count), U ? U[1] + 1 : 0);
    const bw = TW[3], bh = 44, slot = bw / 7;
    const Yc = (k) => bh - 2 - ((bh - 8) * k) / mx;
    const outC = (n) => U && (n < U[0] || n > U[1]);
    const anyOut = withC.some((f) => outC(f.count));
    const bars = [...pads.map(() => null), ...W].map((f, i) => {
      const cx = r1(slot * i + slot / 2);
      if (!f) return "";
      if (f.count == null) return f.pending ? "" : `<line class="bt-gapmark" x1="${r1(cx - 3)}" x2="${r1(cx + 3)}" y1="${bh - 1}" y2="${bh - 1}"/>`;
      if (f.count === 0) return `<circle class="bt-zero bt-pop${outC(0) ? " is-s" : ""}" cx="${cx}" cy="${bh - 5}" r="3" style="--j:${i * 2}"/>`;
      const y = Yc(f.count);
      return `<rect class="bt-mbar bt-grow${outC(f.count) ? " is-s" : ""}${f.today ? " is-today" : ""}" x="${r1(cx - 5)}" y="${r1(y)}" width="10" height="${r1(bh - 2 - y)}" rx="5" style="--j:${i * 2}"/>`;
    }).join("");
    const bandM = U ? `<rect class="bt-band bt-fade" x="0" y="${r1(Yc(U[1] + 0.5))}" width="${bw}" height="${r1(Yc(Math.max(0, U[0] - 0.5)) - Yc(U[1] + 0.5))}" rx="4"/>` : "";
    const bms = tile({ s: 3, i: 2 }, `${kick(x, "BMs this week")}${big(x, total, `BMs on ${pl(withC.length, "day")}`, { size: "md" })}
      <svg class="bt-mini" viewBox="0 0 ${bw} ${bh}" role="img" aria-label="${E(`${pl(total, "BM")} this week across ${pl(withC.length, "day")} with BMs logged.${U ? ` Your usual is ${D.often.usualText}. ${anyOut ? `Outside it on ${pl(withC.filter((f) => outC(f.count)).length, "day")}.` : "Every day was within it."}` : ""}`)}">${bandM}${bars}</svg>
      ${legend(x, [U ? ["band", `Your usual, ${D.often.usualText}`] : ["bar", "One bar per day"], U && anyOut && ["s", "Outside it"], W.some((f) => f.count == null && !f.pending) && ["gap", "No logs"]])}`);
    return board(x, `This week at a glance. ${answer}`, [main, today, bms]);
  }

  /* ===================================================================== the last 30 days: a heat calendar */
  function month(D, x) {
    const M = D.days[30], Ln = D.learning, E = x.esc;
    const logged = M.filter((f) => f.logged);
    const cnt = (k) => M.filter((f) => f.state === k && !f.pending).length;
    const nU = cnt("usual"), nS = cnt("shifted"), nX = M.filter((f) => !f.logged && !f.pending).length;
    const answer = Ln ? `${pl(logged.length, "day")} logged of your first ${M.length}.` : `On ${nU} of ${pl(logged.length, "logged day")}, your BMs were within your usual.`;
    const lead = Math.max(0, DOWS.indexOf(M[0].dow));
    const cells = [...Array.from({ length: lead }, () => `<span class="bt-sq bt-sq--pad" aria-hidden="true"></span>`), ...M.map((f, j) => {
      const [c] = stOf(f);
      return `<span class="bt-sq bt-sq--${c}${f.today ? " is-today" : ""}" style="--j:${jn(j, M.length)}" title="${E(`${f.label}: ${stOf(f)[1]}`)}">${f.date}</span>`;
    })].join("");
    const longest = (() => { let best = 0, bi = -1, run = 0; M.forEach((f, i) => { run = f.state === "usual" ? run + 1 : 0; if (run > best) { best = run; bi = i; } }); return best ? { n: best, from: M[bi - best + 1].label, to: M[bi].label } : null; })();
    const nE = cnt("unsure"), nC = cnt("nocount");
    const aria = `${answer} ${nS ? `${nS} shifted. ` : ""}${nE ? `${nE} could be either. ` : ""}${nC ? `${pl(nC, "day")} logged with no BMs said. ` : ""}${nX ? `${pl(nX, "day")} with no logs, left as ${nX === 1 ? "a gap" : "gaps"}. ` : ""}Today, ${M[M.length - 1].label}: ${low(stOf(M[M.length - 1])[1])}.`;
    /* the states with no stat tile of their own carry their count in the legend, so every day on the calendar adds up */
    const extra = ["unsure", "nocount", "logged"].filter((k) => M.some((f) => f.state === k)).map((k) => [ST[k][0], !Ln && k !== "logged" ? `${ST[k][1]}, ${pl(cnt(k), "day")}` : ST[k][1]]);
    const main = tile({ s: 6, i: 0 }, `${kick(x, Ln ? "Your days so far" : `The last ${M.length} days`, `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}
      <div class="bt-cal" role="img" aria-label="${E(aria)}">${DOWS.map((d) => `<span class="bt-cal-h" aria-hidden="true">${d.charAt(0)}</span>`).join("")}${cells}</div>
      ${legend(x, [...extra, ["today", "Today"]])}`);
    if (Ln) {
      return board(x, `Your days so far. ${answer}`, [main,
        tile({ s: 2, i: 1, cls: "bt-t--c bt-t--stat" }, `${kick(x, "Logged")}${big(x, logged.length, "days", { size: "md" })}<i class="bt-key bt-key--l" aria-hidden="true"></i>`),
        tile({ s: 2, i: 2, cls: "bt-t--c bt-t--stat" }, `${kick(x, "No logs")}${big(x, nX, nX === 1 ? "day" : "days", { size: "md" })}<i class="bt-key bt-key--x" aria-hidden="true"></i>`),
        tile({ s: 2, i: 3, cls: "bt-t--c bt-t--stat" }, `${kick(x, "Learning")}${big(x, Ln.day, `of ${Ln.of}`, { size: "md" })}${sub(x, "days")}`)
      ]);
    }
    const stat = (k, label, n, i) => tile({ s: 2, i, cls: "bt-t--c bt-t--stat" }, `${kick(x, label)}${big(x, n, n === 1 ? "day" : "days", { size: "md" })}<i class="bt-key bt-key--${k}" aria-hidden="true"></i>`);
    return board(x, `The last ${M.length} days. ${answer}`, [main, stat("u", "Within your usual", nU, 1), stat("s", "Shifted", nS, 2), stat("x", "No logs", nX, 3)],
      longest && longest.n > 1 ? fine(x, `Longest run within your usual: ${longest.n} days, ${longest.from} to ${longest.to}.`) : "");
  }

  /* ===================================================================== timing: a dot histogram of first BMs */
  function timing(D, x) {
    const M = D.days[30], Tm = D.timing, U = Tm.usual, Ln = D.learning, E = x.esc;
    const morn = M.map((f, i) => ({ f, i })).filter((o) => o.f.first != null);
    if (!morn.length) return board(x, "Timing: no first BMs logged yet", [tile({ s: 6 }, `${kick(x, "First BM")}${ans(x, "No first BMs logged yet.")}`)]);
    /* once the usual is known the chart takes four columns and the ring and today stack beside it */
    const wide = !U;
    const ts = morn.map((o) => o.f.first);
    let t0 = Math.floor(Math.min(...ts, U ? U[0] : 24) - 0.25), t1 = Math.ceil(Math.max(...ts, U ? U[1] : 0) + 0.25);
    if (t1 - t0 < 4) { const pad = 4 - (t1 - t0); t0 -= Math.floor(pad / 2); t1 += Math.ceil(pad / 2); }
    const step = 0.25, nb = Math.round((t1 - t0) / step);
    const w = wide ? TW[6] : TW[4], top = 20, axis = 22;
    const slot = w / nb, rad = Math.min(5.5, slot / 2 - 1.2), gapY = rad * 2 + 2.5;
    const stack = {};
    const dots = morn.map((o) => { const b = clamp(Math.floor((o.f.first - t0) / step), 0, nb - 1); const k = (stack[b] = (stack[b] || 0) + 1) - 1; return { ...o, b, k }; });
    const maxK = Math.max(4, ...Object.values(stack));
    const ph = maxK * gapY + 4, H = top + ph + axis;
    const X = (t) => ((t - t0) / (t1 - t0)) * w;
    const today = M[M.length - 1];
    const tDot = dots.find((d) => d.f.today);
    /* hour ticks, thinned when the hours sit close together on a narrow chart. A label at either end of the axis is
       anchored to its own tick (start or end), so it never slides away from the hour it names */
    const hours = []; for (let hh = Math.ceil(t0); hh <= t1; hh++) hours.push(hh);
    const every = (w / (t1 - t0)) < 40 ? 2 : 1;
    const hourLbl = (hh) => x.T(hh, { short: true });
    const answer = U ? `Your first BM came in your usual window on ${Tm.inWin30} of ${pl(Tm.mornings30, "morning")}.` : `${pl(Tm.mornings30, "morning")} with a first BM logged. Florin learns your usual window by day ${Ln ? Ln.of : ""}.`;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer}${U ? ` Your usual window is ${Tm.usualText}.` : ""}${today.first != null ? ` Today ${today.firstText}.` : ""}`)}">
      ${U ? `<rect class="bt-band bt-fade" x="${r1(X(U[0]))}" y="${top - 4}" width="${r1(X(U[1]) - X(U[0]))}" height="${r1(ph + 4)}" rx="8"/>
      <line class="bt-bedge" x1="${r1(X(U[0]))}" x2="${r1(X(U[0]))}" y1="${top - 4}" y2="${r1(top + ph)}"/><line class="bt-bedge" x1="${r1(X(U[1]))}" x2="${r1(X(U[1]))}" y1="${top - 4}" y2="${r1(top + ph)}"/>
      <text class="bt-lbl bt-lbl--u" x="${r1(clamp((X(U[0]) + X(U[1])) / 2, 32, w - 32))}" y="${top - 9}" text-anchor="middle">Your usual</text>` : ""}
      <line class="bt-base" x1="0" x2="${w}" y1="${r1(top + ph)}" y2="${r1(top + ph)}"/>
      ${hours.map((hh, k) => `<line class="bt-gl" x1="${r1(X(hh))}" x2="${r1(X(hh))}" y1="${r1(top + ph)}" y2="${r1(top + ph + 4)}"/>${k % every === 0 || hh === hours[hours.length - 1] && every === 1 ? `<text class="bt-tick" x="${r1(X(hh))}" y="${H - 4}" text-anchor="${X(hh) < 16 ? "start" : X(hh) > w - 16 ? "end" : "middle"}">${hourLbl(hh)}</text>` : ""}`).join("")}
      ${dots.map((d) => { const cx = r1(slot * d.b + slot / 2), cy = r1(top + ph - rad - 2 - d.k * gapY); const out = U && d.f.inWin === false; return `<circle class="bt-tdot bt-pop${out ? " is-s" : ""}${d.f.today ? " is-today" : ""}" cx="${cx}" cy="${cy}" r="${r1(rad)}" style="--j:${jn(d.i, M.length)}"/>`; }).join("")}
      ${tDot ? (() => { const cx = r1(slot * tDot.b + slot / 2), cy = r1(top + ph - rad - 2 - tDot.k * gapY); return `<circle class="bt-halo bt-pop" cx="${cx}" cy="${cy}" r="${r1(rad + 3.5)}" style="--j:20"/>`; })() : ""}
    </svg>`;
    const main = tile({ s: wide ? 6 : 4, i: 0, cls: wide ? "" : "bt-t--r2" }, `${kick(x, `First BM · ${per(D, M)}`, wide ? `${M[0].label} to ${M[M.length - 1].label}` : "")}${ans(x, answer, wide ? "" : "bt-a--md")}${chart}
      ${legend(x, [["dot", "One dot a morning"], U && ["band", `Your usual window, ${Tm.usualText}`], U && dots.some((d) => d.f.inWin === false) && ["sdot", "Outside your window"], tDot && ["today", "Today"]])}`);
    let chipT = "";
    if (today.first != null && U) chipT = today.inWin ? chip(x, "usual", "In your usual window") : chip(x, "shift", today.first < U[0] ? "Earlier than usual" : "Later than usual");
    const todayInner = (size) => `${kick(x, "Today")}${today.first != null ? `${big(x, hm(today.firstText), ampm(today.firstText), { raw: true, size })}${sub(x, "First BM", "bt-sub--xs")}${chipT ? `<div class="bt-chips">${chipT}</div>` : ""}` : `${ans(x, today.count === 0 ? "No BM logged today" : "No first BM yet today", "bt-a--sm")}${U ? sub(x, `Your usual window ${Tm.usualText}`, "bt-sub--xs") : ""}`}`;
    if (wide) {
      return board(x, `Timing. ${answer}`, [main,
        learnTile(x, D, { s: 3, i: 1, k: "Your window", a: "Learning your usual window.", acls: "bt-a--md" }),
        tile({ s: 3, i: 2 }, todayInner("md"))]);
    }
    const ringT = tile({ s: 2, i: 1 }, `${kick(x, "In your window")}
      ${miniRing(x, { size: 80, sw: 8, segs: [{ v: Tm.inWin30, cls: "u" }, { v: Tm.mornings30 - Tm.inWin30, cls: "s" }], aria: `${Tm.inWin30} of ${Tm.mornings30} mornings in your usual window.`, center: `<b class="bt-ring-n bt-ring-n--xs">${num(Tm.inWin30, { dur: 900 })}</b><span class="bt-ring-s">of ${Tm.mornings30}</span>` })}
      ${legend(x, [["u", "In it"], Tm.mornings30 > Tm.inWin30 && ["s", "Outside"]], "bt-lg--col")}`);
    const todayT = tile({ s: 2, i: 2 }, todayInner("sm"));
    return board(x, `Timing. ${answer}`, [main, ringT, todayT]);
  }

  /* ===================================================================== how often: one pill per BM, a column a day */
  function often(D, x) {
    const M = D.days[30], O = D.often, U = O.usual, E = x.esc;
    const known = M.filter((f) => f.count != null);
    const inN = U ? known.filter((f) => f.count >= U[0] && f.count <= U[1]).length : null;
    const more = U ? known.filter((f) => f.count > U[1]).length : 0, fewer = U ? known.filter((f) => f.count < U[0]).length : 0;
    const zeros = known.filter((f) => f.count === 0).length;
    const gaps = M.filter((f) => f.count == null && !f.pending).length;
    const answer = U ? `Within your usual ${O.usualText} on ${inN} of ${pl(known.length, "day")}.` : `${pl(known.length, "day")} with BMs logged so far. Florin learns your usual by day ${D.learning ? D.learning.of : ""}.`;
    const w = TW[6], left = 18, top = 8, axis = 22, uh = 14, ug = 4;
    const mx = Math.max(3, ...known.map((f) => f.count), U ? U[1] + 1 : 0);
    const ph = mx * (uh + ug) + 4, H = top + ph + axis, base = top + ph;
    const nSlots = Math.max(14, M.length), off = nSlots - M.length;
    const slot = (w - left) / nSlots, bw = Math.min(8, slot - 3);
    const cx = (i) => left + slot * (i + off) + slot / 2;
    const yU = (k) => base - k * (uh + ug); /* the top edge of unit k (1-based) is yU(k) + ug */
    const units = M.map((f, i) => {
      if (f.count == null) return f.pending ? "" : `<line class="bt-gapmark" x1="${r1(cx(i) - bw / 2)}" x2="${r1(cx(i) + bw / 2)}" y1="${r1(base + 3)}" y2="${r1(base + 3)}"/>`;
      const out = U && (f.count < U[0] || f.count > U[1]);
      if (f.count === 0) return `<circle class="bt-zero bt-pop${out ? " is-s" : ""}" cx="${r1(cx(i))}" cy="${r1(base - 5)}" r="3.5" style="--j:${jn(i, M.length)}"/>`;
      return Array.from({ length: f.count }, (_, k) => `<rect class="bt-unit bt-pop${out ? " is-s" : ""}" x="${r1(cx(i) - bw / 2)}" y="${r1(yU(k + 1) + ug)}" width="${r1(bw)}" height="${uh}" rx="${r1(bw / 2)}" style="--j:${jn(i, M.length) + k}"/>`).join("");
    }).join("");
    const ti = M.length - 1, tf = M[ti];
    const tTop = tf.count ? yU(tf.count) + ug - 3 : base - 11;
    const tx = cx(ti) - bw / 2 - 3, tw = Math.min(bw + 6, w - 0.75 - tx); /* the outline stays inside the chart */
    const todayMark = `<rect class="bt-todaycol" x="${r1(tx)}" y="${r1(tTop)}" width="${r1(tw)}" height="${r1(base + 3 - tTop)}" rx="${r1(tw / 2)}"/>`;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} ${more ? `More often on ${pl(more, "day")}. ` : ""}${fewer ? `Less often on ${pl(fewer, "day")}. ` : ""}${gaps ? `${pl(gaps, "day")} with no BM logs, left as ${gaps === 1 ? "a gap" : "gaps"}. ` : ""}Today ${tf.count == null ? "not logged yet" : pl(tf.count, "BM")}.`)}">
      ${U ? `<rect class="bt-band bt-fade" x="${left}" y="${r1(yU(U[1]) + ug / 2)}" width="${w - left}" height="${r1((U[1] - U[0] + 1) * (uh + ug))}" rx="4"/>` : ""}
      ${todayMark}
      ${Array.from({ length: mx }, (_, k) => `<text class="bt-tick" x="${left - 8}" y="${r1(yU(k + 1) + ug + uh / 2 + 3.5)}" text-anchor="end">${k + 1}</text>`).join("")}
      <line class="bt-base" x1="${left}" x2="${w}" y1="${base}" y2="${base}"/>
      ${units}
      <text class="bt-tick" x="${r1(cx(0) - bw / 2)}" y="${H - 4}">${E(M[0].label)}</text>
      <text class="bt-tick" x="${w}" y="${H - 4}" text-anchor="end">Today</text>
    </svg>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, `BMs a day · ${per(D, M)}`, `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}${chart}
      ${legend(x, [["unit", "One BM"], U && ["band", `Your usual, ${O.usualText}`], (more || fewer) && ["s", "Outside your usual"], zeros && ["zero", "Logged no BM"], gaps && ["gap", "No logs, left as a gap"], ["today", "Today"]])}`);
    const avgT = O.avg30 != null ? tile({ s: 3, i: 1 }, `${kick(x, "Average")}${big(x, O.avg30, "a day", { dec: 1, size: "md" })}${sub(x, U ? `Your usual ${O.usualText}` : `Over ${pl(known.length, "day")}`)}`) : "";
    const splitT = U ? tile({ s: 3, i: 2 }, `${kick(x, "Day by day")}
      <div class="bt-seg" role="img" aria-label="${E(`${inN} days within your usual, ${more} more often, ${fewer} less often${gaps ? `, ${gaps} not logged` : ""}.`)}">${[["u", inN], ["s", more + fewer], ["x", gaps]].filter(([, n]) => n).map(([c, n], k) => `<i class="bt-seg--${c}" style="flex:${n};--k:${k}"></i>`).join("")}</div>
      ${legend(x, [["u", `${inN} within`], more && ["s", `${more} more often`], fewer && ["s", `${fewer} less often`], gaps && ["x", `${gaps} no logs`]])}`) : learnTile(x, D, { s: 3, i: 2, k: "Your usual", a: "Learning your usual count.", acls: "bt-a--md" });
    return board(x, `How often. ${answer}`, [main, avgT, splitT]);
  }

  /* ===================================================================== form: capsule bars on this option's scale */
  function form(D, x) {
    const F = D.form, E = x.esc, M = D.days[30];
    const has = F.total30 > 0;
    const allForms = M.flatMap((f) => f.forms.map((b) => ({ ...b, day: f })));
    const either = F.usual ? allForms.filter((b) => b.within === null).length : 0;
    const outN = F.usual ? F.total30 - F.within30 - either : 0;
    const answer = !has ? "No BMs logged yet." : F.usual ? `${F.within30} of ${pl(F.total30, "BM")} sat within your usual forms, ${F.usualText}.` : `${pl(F.total30, "BM")} logged so far. Florin learns your usual forms by day ${D.learning ? D.learning.of : ""}.`;
    const n = F.bins.length, w = TW[6], top = 30, ph = 108, axis = 30, H = top + ph + axis;
    const slot = w / n, bw = Math.min(24, slot - 16);
    const spans = F.spans || [];
    const mx = Math.max(1, ...F.bins.map((b) => b.count), ...spans.map((sp) => sp.count));
    /* "could be either" BMs per form, read the way the bins are counted */
    const eOf = (b) => (F.usual ? allForms.filter((f) => f.level === b.k && f.within === null).length : 0);
    const ui = F.bins.map((b, i) => (b.inUsual ? i : -1)).filter((i) => i >= 0);
    const band = ui.length ? `<rect class="bt-band bt-fade" x="${r1(slot * ui[0] + 3)}" y="${top - 6}" width="${r1(slot * ui.length - 6)}" height="${ph + 6}" rx="12"/>
      <text class="bt-lbl bt-lbl--u" x="${r1(slot * (ui[0] + ui[ui.length - 1] + 1) / 2)}" y="${top - 14}" text-anchor="middle">Your usual</text>` : "";
    let clips = "";
    const bars = F.bins.map((b, i) => {
      const cxp = slot * i + slot / 2, hh = b.count ? Math.max(4, ((ph - 18) * b.count) / mx) : 0;
      const out = F.usual && !b.inUsual && b.count;
      const eN = eOf(b), solid = b.count ? (hh * (b.count - eN)) / b.count : 0;
      const bx = r1(cxp - bw / 2), by = r1(top + ph - hh), rx = r1(Math.min(bw / 2, hh / 2));
      let mark = "";
      if (b.count && !eN) mark = `<rect class="bt-fbar bt-grow${out ? " is-s" : ""}" x="${bx}" y="${by}" width="${r1(bw)}" height="${r1(hh)}" rx="${rx}" style="--j:${i * 2}"/>`;
      else if (b.count) {
        /* the share that could be either is an open cap on top of the solid share, inside one capsule */
        const id = `${x.uid}-fc${i}`;
        clips += `<clipPath id="${id}"><rect x="${bx}" y="${by}" width="${r1(bw)}" height="${r1(hh)}" rx="${rx}"/></clipPath>`;
        mark = `<g class="bt-grow" style="--j:${i * 2}"><rect class="bt-fbar-e" x="${r1(cxp - bw / 2 + 0.75)}" y="${r1(top + ph - hh + 0.75)}" width="${r1(bw - 1.5)}" height="${r1(hh - 1.5)}" rx="${r1(Math.max(0, rx - 0.75))}"/>${solid ? `<rect class="bt-fbar${out ? " is-s" : ""}" clip-path="url(#${id})" x="${bx}" y="${r1(top + ph - solid)}" width="${r1(bw)}" height="${r1(solid)}"/>` : ""}</g>`;
      } else mark = `<circle class="bt-none" cx="${r1(cxp)}" cy="${top + ph - 3}" r="2"/>`;
      return `${mark}
        <text class="bt-val" x="${r1(cxp)}" y="${r1(top + ph - hh - 6)}" text-anchor="middle">${b.count}</text>
        <text class="bt-xl" x="${r1(cxp)}" y="${top + ph + 16}" text-anchor="middle">${E(b.label)}</text>`;
    }).join("");
    /* a BM logged as a word that covers two forms (a B word read in A or C) can't sit on either one: it stands as an open
       capsule between its two forms, so the capsules still add up to every BM logged */
    const spanMarks = spans.map((sp, j) => {
      const ia = F.bins.findIndex((b) => b.k === sp.steps[0]), ib = F.bins.findIndex((b) => b.k === sp.steps[sp.steps.length - 1]);
      if (ia < 0 || ib < 0) return "";
      const cxp = (slot * (ia + ib + 1)) / 2, sw = Math.max(6, Math.min(12, slot - bw - 8)), hh = Math.max(4, ((ph - 18) * sp.count) / mx);
      return `<rect class="bt-fbar-e bt-grow" x="${r1(cxp - sw / 2 + 0.75)}" y="${r1(top + ph - hh + 0.75)}" width="${r1(sw - 1.5)}" height="${r1(hh - 1.5)}" rx="${r1(sw / 2 - 0.75)}" style="--j:${n * 2 + j}"/>
        <text class="bt-val" x="${r1(cxp)}" y="${r1(top + ph - hh - 6)}" text-anchor="middle">${sp.count}</text>`;
    }).join("");
    const spanWord = spans.length ? (spans.every((sp) => sp.within === null) ? "Could be either: a word covering both forms" : "A word covering both forms") : "";
    const anyE = F.bins.some((b) => eOf(b) > 0) && !spans.length;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} ${F.bins.filter((b) => b.count).map((b) => `${b.label}: ${b.count}`).join(", ")}.${spans.map((sp) => ` ${sp.label}, a word covering two forms: ${sp.count}.`).join("")}${either ? ` ${either} could be either.` : ""}`)}">
      ${clips ? `<defs>${clips}</defs>` : ""}${band}<line class="bt-base" x1="0" x2="${w}" y1="${top + ph}" y2="${top + ph}"/>${bars}${spanMarks}
      <text class="bt-lbl" x="0" y="${H - 2}">← Firmer</text><text class="bt-lbl" x="${w}" y="${H - 2}" text-anchor="end">Looser →</text>
    </svg>`;
    const chartT = (i) => tile({ s: 6, i }, `${kick(x, "BMs by form", `${M[0].label} to ${M[M.length - 1].label}`)}${chart}
      ${legend(x, [["bar", "BMs of each form"], F.usual && ["band", `Your usual, ${F.usualText}`], outN && ["s", "Outside your usual"], anyE && ["ecap", "Could be either"], spanWord && ["ecap", spanWord]])}`);
    const lastBm = allForms.length ? allForms[allForms.length - 1] : null;
    const lastT = (i) => tile({ s: 6, i, cls: "bt-t--row" }, `<div>${kick(x, lastBm && lastBm.day.today ? "Latest, today" : "Latest BM")}${lastBm ? `${big(x, lastBm.name, "", { raw: true, size: "word" })}${sub(x, `${lastBm.day.today ? "Today" : lastBm.day.label}, ${x.T(lastBm.t)}`)}` : ans(x, "No BMs logged yet", "bt-a--md")}</div>
      ${lastBm ? `<div class="bt-chips">${!F.usual ? chip(x, "none", "Usual not known yet") : lastBm.within === true ? chip(x, "usual", "Within your usual") : lastBm.within === false ? chip(x, "shift", "Outside your usual") : chip(x, "none", "Could be either")}</div>` : ""}`);
    if (!F.usual || !has) {
      const head = D.learning ? learnTile(x, D, { k: `Form · ${per(D, M)}`, a: answer }) : tile({ s: 6, i: 0 }, `${kick(x, `Form · ${per(D, M)}`)}${ans(x, answer)}`);
      return board(x, `Form. ${answer}`, [head, has ? chartT(1) : "", lastT(2)]);
    }
    /* an uneven board: the answer beside the ring, then the capsules, then the latest BM */
    const firmer = ui.length ? sum(F.bins.filter((b, i) => i < ui[0]).map((b) => b.count)) : 0;
    const looser = ui.length ? sum(F.bins.filter((b, i) => i > ui[ui.length - 1]).map((b) => b.count)) : 0;
    const dirChips = [firmer && chip(x, "shift", `${firmer} firmer than your usual`), looser && chip(x, "shift", `${looser} looser than your usual`), either && chip(x, "none", `${either} could be either`)].filter(Boolean);
    const headT = tile({ s: 4, i: 0 }, `${kick(x, `Form · ${per(D, M)}`)}${ans(x, answer, "bt-a--md")}
      <div class="bt-chips">${dirChips.length ? dirChips.join("") : chip(x, "usual", "Every form within your usual")}</div>`);
    const ringT = tile({ s: 2, i: 1 }, `${kick(x, "Within")}
      ${miniRing(x, { size: 80, sw: 8, segs: [{ v: F.within30, cls: "u" }, { v: outN, cls: "s" }, { v: either, cls: "e" }], aria: `${F.within30} of ${F.total30} BMs within your usual forms${outN ? `, ${outN} outside` : ""}${either ? `, ${either} could be either` : ""}.`, center: `<b class="bt-ring-n bt-ring-n--xs">${num(F.within30, { dur: 900 })}</b><span class="bt-ring-s">of ${F.total30}</span>` })}
      ${legend(x, [["u", "Within"], outN && ["s", "Outside"], either && ["eg", "Could be either"]], "bt-lg--col")}`);
    return board(x, `Form. ${answer}`, [headT, ringT, chartT(2), lastT(3)]);
  }

  /* ===================================================================== symptoms: a strip per symptom, strength by height */
  function symptoms(D, x) {
    const Sy = D.symptoms, M = D.days[30], E = x.esc;
    const rows = Sy.rows.slice(0, 4), more = Sy.rows.slice(4);
    const share = Sy.logged30 ? Sy.withSym30 / Sy.logged30 : 0;
    const every = share ? Math.max(1, Math.round(1 / share)) : null;
    const nowText = !Sy.logged30 ? null : every == null ? "Rarely" : every <= 1 ? "Most days" : `About 1 day in ${every}`;
    const top1 = rows[0];
    const answer = !Sy.logged30 ? "Nothing logged yet." : !Sy.withSym30 ? `No symptoms on any of your ${pl(Sy.logged30, "logged day")}.` : `Symptoms came up on ${Sy.withSym30} of ${pl(Sy.logged30, "logged day")}, ${low(top1.name)} most often.`;
    /* a short run (the first days) keeps wide cells from the left */
    const w = TW[6], n = M.length, gap = n < 30 ? 4 : 2;
    const cw = n < 30 ? Math.min(40, (w - gap * (n - 1)) / n) : (w - gap * (n - 1)) / n;
    const ch = 20, rowH = ch + 26, x0 = 0;
    const H = rows.length * rowH + 16;
    const kind = (v) => (v === null ? "x" : v === false ? "n" : v === 0 ? "z" : `l${v}`);
    const present = new Set(rows.flatMap((r) => r.cells.filter((v, i) => !(v === null && M[i].pending)).map(kind)));
    const hFor = [0.4, 0.7, 1];
    const cell = (v, i, y0, j) => {
      const cx = x0 + i * (cw + gap), y = y0 + 20;
      if (v === null) return M[i].pending ? "" : `<line class="bt-gapmark" x1="${r1(cx + cw / 2 - Math.min(3, cw / 2))}" x2="${r1(cx + cw / 2 + Math.min(3, cw / 2))}" y1="${y + ch - 1}" y2="${y + ch - 1}"/>`;
      const slotR = `<rect class="bt-hc bt-hc--n" x="${r1(cx)}" y="${y}" width="${r1(cw)}" height="${ch}" rx="2"/>`;
      if (v === false) return slotR;
      if (v === 0) return `${slotR}<rect class="bt-hc bt-hc--z bt-pop" x="${r1(cx + 0.75)}" y="${y + 0.75}" width="${r1(cw - 1.5)}" height="${ch - 1.5}" rx="2" style="--j:${j}"/>`;
      const hh = ch * hFor[v - 1];
      return `${slotR}<rect class="bt-hc bt-hc--l bt-grow" x="${r1(cx)}" y="${r1(y + ch - hh)}" width="${r1(cw)}" height="${r1(hh)}" rx="2" style="--j:${j}"/>`;
    };
    const heat = rows.length ? `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} ${rows.map((r) => `${r.name} on ${pl(r.days, "day")}`).join(", ")}.`)}">
      ${rows.map((r, ri) => { const y0 = ri * rowH; return `<text class="bt-rowl" x="0" y="${y0 + 13}">${E(r.name)}</text><text class="bt-rowv" x="${w}" y="${y0 + 13}" text-anchor="end">${pl(r.days, "day")}</text>
        ${r.cells.map((v, i) => cell(v, i, y0, jn(i, n) + ri)).join("")}`; }).join("")}
      <text class="bt-tick" x="${r1(x0)}" y="${H - 2}">${E(M[0].label)}</text><text class="bt-tick" x="${w}" y="${H - 2}" text-anchor="end">Today</text>
    </svg>` : "";
    const lg = [present.has("l1") && ["l1", "Mild"], present.has("l2") && ["l2", "Moderate"], present.has("l3") && ["l3", "Strong"], present.has("z") && ["z", "Strength not said"], present.has("n") && ["n", "None"], present.has("x") && ["gap", "Not logged"]];
    const main = tile({ s: 6, i: 0 }, `${kick(x, `Symptoms · ${per(D, M)}`, `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}${heat}
      ${rows.length ? legend(x, lg) : ""}${more.length ? sub(x, `Also: ${andList(more.map((r) => `${low(r.name)} on ${pl(r.days, "day")}`))}.`) : ""}`);
    /* how often, against your usual: "Most days" is 1 in 1, "Rarely" is never, "About 1 day in N" is N */
    const everyOf = (t) => (t === "Most days" ? 1 : t === "Rarely" ? Infinity : +((t.match(/(\d+)\s*$/) || [])[1]) || null);
    const nN = nowText ? everyOf(nowText) : null, uN = Sy.usualText ? everyOf(Sy.usualText) : null;
    const cmpChip = nN == null || uN == null ? "" : nN === uN ? chip(x, "usual", "About the same") : nN < uN ? chip(x, "shift", "More often than your usual") : chip(x, "shift", "Less often than your usual");
    const solo = !Sy.withSym30;
    const howT = tile({ s: solo ? 6 : 3, i: 1 }, `${kick(x, "How often")}${big(x, Sy.withSym30, `of ${Sy.logged30} days`, { size: "md" })}
      ${dayStrip(x, M.map((f) => ({ cls: !f.logged ? "x" : f.sym.length ? "r" : "n", today: f.today, pending: f.pending })), `Symptoms on ${Sy.withSym30} of ${Sy.logged30} logged days${nowText ? `, ${low(nowText)}` : ""}.${Sy.usualText ? ` Your usual: ${low(Sy.usualText)}.` : ""}`, solo ? TW[6] : TW[3])}
      <dl class="bt-pair${solo ? " bt-pair--row" : ""}">${nowText ? `<div><dt>${D.learning ? "So far" : `Last ${M.length} days`}</dt><dd>${E(nowText)}</dd></div>` : ""}${Sy.usualText ? `<div><dt>Your usual</dt><dd>${E(Sy.usualText)}</dd></div>` : ""}</dl>
      ${cmpChip ? `<div class="bt-chips">${cmpChip}</div>` : ""}`);
    /* the strongest day: the highest strength said, the latest day it came up */
    let strong = null;
    Sy.rows.forEach((r) => r.cells.forEach((v, i) => { if (typeof v === "number" && v > 0 && (!strong || v > strong.v || (v === strong.v && i > strong.i))) strong = { v, i, name: r.name }; }));
    const words = ["Mild", "Moderate", "Strong"];
    const spread = [1, 2, 3, 0].map((k) => ({ k, n: sum(Sy.rows.map((r) => r.cells.filter((v) => v === k).length)) })).filter((g) => g.n);
    const spreadBar = spread.length ? `<div class="bt-seg bt-seg--sym" role="img" aria-label="${E(`Strengths logged: ${spread.map((g) => `${g.k ? words[g.k - 1].toLowerCase() : "strength not said"} ${g.n}`).join(", ")}.`)}">${spread.map((g, k) => `<i class="bt-seg--${g.k ? "l" : "z"}" style="flex:${g.n};--k:${k}"></i>`).join("")}</div>
      <p class="bt-sub bt-sub--xs">${E(spread.map((g) => `${g.k ? words[g.k - 1] : "Not said"} ${g.n}`).join(" · "))}</p>` : "";
    const strongT = solo ? "" : tile({ s: 3, i: 2 }, `${kick(x, "Strongest")}${strong ? `${big(x, words[strong.v - 1], "", { raw: true, size: "word" })}${sub(x, `${strong.name}, ${M[strong.i].today ? "today" : M[strong.i].label}`)}
      <div class="bt-meter3" role="img" aria-label="${E(`${words[strong.v - 1]}, the strongest you logged in these ${M.length} days`)}">${[1, 2, 3].map((k) => `<i class="${k <= strong.v ? "is-on" : ""}" style="--j:${k}"></i>`).join("")}</div>
      <p class="bt-k bt-k--gap">All symptom logs</p>${spreadBar}` : `${ans(x, "No strength said", "bt-a--md")}${spreadBar}`}`);
    return board(x, `Symptoms. ${answer}`, [main, howT, strongT],
      `<div class="bt-care"><p class="bt-k">When to see a clinician</p><p>${E("Blood, black or tar-like stools, fever, vomiting that won't stop, weight loss or waking at night to go: talk to your primary care clinician first.")}</p></div>`);
  }

  /* ===================================================================== the weekly check-in: stacked chips */
  function checkin(D, x) {
    const C = D.checkin, Q = C.questions, E = x.esc;
    const started = Q.some((q) => q.band);
    const cta = C.due ? `<div class="bt-cta"><p class="bt-cta-l"><span class="bt-live" aria-hidden="true"></span>This week's check-in is ready</p><button type="button" class="bt-btn">Answer it</button></div>` : "";
    if (!started) {
      return board(x, "Weekly check-in, not started yet", [
        tile({ s: 6, i: 0 }, `${kick(x, "Weekly check-in", C.due ? "Due now" : "")}${ans(x, "Your first three check-ins set your starting point. Florin compares every week after with them.")}
          <div class="bt-chips">${Q.map((q) => chip(x, "none", q.label)).join("")}</div>${cta}`)
      ]);
    }
    const same = Q.filter((q) => q.cmp && q.cmp.k === "same");
    const diff = Q.filter((q) => q.cmp && q.cmp.k !== "same");
    const latest = Q.map((q) => q.latest).filter(Boolean)[0];
    const answered = Math.max(...Q.map((q) => q.weeks.filter((wk) => wk.v != null).length));
    const answer = !diff.length ? `All ${Q.length} answers sit within your first three weeks.` : `${same.length} of ${Q.length} answers sit within your first three weeks. ${diff.map((q) => `${q.label}: ${low(q.cmp.text)}`).join(". ")}.`;
    const qTile = (q, k) => {
      const lv = q.latest ? q.latest.v : null;
      const out = q.cmp && q.cmp.k !== "same";
      const items = q.ticks.map((t, v) => ({ t, v })).reverse().map(({ t, v }, j) => {
        const inBand = q.band && v >= q.band.lo && v <= q.band.hi;
        const now = lv === v;
        return `<li class="${inBand ? "is-band" : ""}${now ? " is-now" : ""}${now && out ? " is-out" : ""}" style="--j:${j}"><span>${E(t)}</span>${now ? `<em>Latest</em>` : ""}</li>`;
      }).join("");
      /* a chip only where the answer moved: "about the same" is already the head's answer */
      const chipQ = !q.cmp ? chip(x, "none", "Not answered") : out ? chip(x, "shift", q.cmp.text) : "";
      return tile({ s: 3, i: k + 1, cls: "bt-t--c bt-t--q" }, `<p class="bt-pname">${E(q.label)}</p>
        <ol class="bt-stack" role="img" aria-label="${E(`${q.label}: latest week ${q.latest ? q.opts[lv].toLowerCase() : "not answered"}. ${q.band ? `Your first three weeks ranged ${q.opts[q.band.lo].toLowerCase()}${q.band.hi !== q.band.lo ? ` to ${q.opts[q.band.hi].toLowerCase()}` : ""}.` : ""} ${q.cmp ? `${q.cmp.text}.` : ""}`)}">${items}</ol>
        ${chipQ ? `<div class="bt-chips">${chipQ}</div>` : ""}`);
    };
    const head = tile({ s: 6, i: 0 }, `${kick(x, "Weekly check-in", `${pl(answered, "week")} answered`)}${ans(x, answer)}
      ${legend(x, [["rail", "Your first three weeks"], latest && ["now", `Latest, ${low(latest.label)}`], diff.length && ["s", "Outside your first weeks"]])}${cta}`);
    return board(x, `Weekly check-in. ${answer}`, [head, ...Q.map(qTile)]);
  }

  /* ===================================================================== a possible pattern */
  const foodTile = (x, i) => tile({ s: 6, i, cls: "bt-t--food" }, `${kick(x, "Log a meal")}
      <div class="bt-food">
        <button type="button" class="bt-mic" aria-label="Say what you ate today"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></button>
        <p class="bt-food-l">Tap and say what you ate today</p>
        ${sub(x, "One line for the whole day. Ordinary days count too.")}
      </div>
      <button type="button" class="bt-field"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>Type what you ate today</button>`);

  function pattern(D, x) {
    const P = D.patterns, E = x.esc;
    const note = fine(x, P.note);
    if (D.learning) {
      return board(x, "A possible pattern: still learning your usual", [
        learnTile(x, D, { k: "A possible pattern", a: "Florin looks for patterns once it knows your usual." }),
        tile({ s: 6, i: 1, cls: "bt-t--c" }, `${kick(x, "Meanwhile")}${sub(x, "Log a BM, or No BM, each day. Add a meal when you like: one line, typed or said.")}`)
      ], note);
    }
    if (!P.found.length && P.sparse) {
      const pct = Math.round(P.coverage * 100);
      if (!pct) {
        return board(x, "A possible pattern: no meals logged yet", [
          tile({ s: 6, i: 0 }, `${kick(x, "A possible pattern")}${ans(x, "No meals logged yet, so there is nothing to compare.")}${sub(x, P.sparseLine.split(". ").pop())}`),
          foodTile(x, 1)
        ], note);
      }
      /* meals on some days only: show which days, against the days a symptom came up, instead of saying so */
      const M = D.days[30];
      const mealDays = M.filter((f) => f.meals > 0);
      const onSym = mealDays.filter((f) => f.sym.length).length;
      const strip = dayStrip(x, M.map((f) => ({ cls: !f.logged ? "x" : f.sym.length ? "r" : "n", today: f.today, pending: f.pending })), `Meals logged on ${mealDays.length} of the last ${M.length} days, ${onSym} of them days with a symptom.`, TW[6], { dots: M.map((f) => f.meals > 0) });
      return board(x, "A possible pattern: not enough ordinary days to compare", [
        tile({ s: 6, i: 0 }, `${kick(x, "A possible pattern")}${ans(x, "Not enough ordinary days to compare yet.")}${sub(x, P.sparseLine)}`),
        tile({ s: 6, i: 1 }, `${kick(x, "Days with a meal logged", `Last ${M.length} days`)}${big(x, mealDays.length, `of ${M.length} days, ${onSym} of them with a symptom`, { size: "md" })}${strip}
          ${legend(x, [["meal", "Meal logged"], ["r", "Day with a symptom"], ["n", "No symptoms"], M.some((f) => !f.logged && !f.pending) && ["gap", "No logs"]])}`),
        foodTile(x, 2)
      ], note);
    }
    if (!P.found.length) {
      return board(x, "A possible pattern: nothing stands out", [
        tile({ s: 6, i: 0 }, `${kick(x, "A possible pattern")}${ans(x, "Nothing stands out yet.")}${sub(x, "Florin keeps comparing what you log with your usual, and shows a pattern once it repeats.")}`)
      ], note);
    }
    const p = P.found[0];
    /* a later first BM is a shift, so the late-dinner pattern draws its hits in Gold */
    const late = p.kind === "late";
    const lab = late ? ["After a late dinner", "After an earlier dinner", "Later first BM"]
      : p.kind === "loose" ? [`After ${low(p.food)}`, "Other mornings", "Looser first BM"]
      : [`After ${low(p.food)}`, "Other days", "Bloating"];
    const grp = (label, hit, n, k) => `<div class="bt-grp"><p class="bt-grp-l"><span>${E(label)}</span><span class="bt-grp-n"><b>${hit}</b> of ${n}</span></p><div class="bt-grp-bar"><i style="--w:${r1((hit / Math.max(1, n)) * 100)}%;--k:${k}"></i></div></div>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "A possible pattern", P.found.length > 1 ? `1 of ${P.found.length} found` : "")}
      <p class="bt-ptitle">${E(p.title)}</p>${sub(x, p.line)}`);
    const groups = tile({ s: 4, i: 1, cls: `bt-t--grp${late ? " is-late" : ""}` }, `${kick(x, lab[2])}
      <div class="bt-grps" role="img" aria-label="${E(`${lab[0]}: ${low(lab[2])} ${p.hit} of ${p.n} times. ${lab[1]}: ${p.oh} of ${p.on}.`)}">${grp(lab[0], p.hit, p.n, 0)}${grp(lab[1], p.oh, p.on, 1)}</div>
      ${legend(x, [[late ? "s" : "hit", lab[2]], ["trk", "Not this time"]], "bt-lg--col")}`);
    /* how sure: three rising bars, the tier's word under them (early signal, showing up often, consistent) */
    const sure = tile({ s: 2, i: 2, cls: "bt-t--sure" }, `${kick(x, "How sure")}
      <div class="bt-sure" aria-hidden="true">${[1, 2, 3].map((k) => `<i class="${k <= p.tierK ? "is-on" : ""}" style="--j:${k};--h:${k * 12 + 8}px"></i>`).join("")}</div>
      <p class="bt-sure-w">${E(p.tier)}</p>`);
    return board(x, `A possible pattern. ${p.title}. ${p.line}`, [main, groups, sure], note);
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "bento",
    name: "Bento",
    idea: "A grid of small tiles like home-screen widgets: FloraScore as a glass widget with its ring beside the answer, and every other answer split into a few glanceable tiles of different sizes, each with its own mini ring, pill row, strip or calendar.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }
  });
})();
