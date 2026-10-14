/* Look: Bento. A modular grid of tiles, like well-made home-screen widgets. Each card is a small bento of two to four
   tiles of different sizes, and each tile holds one glanceable fact with a mini visual: a mini ring, a sparkline, a
   segmented bar, a pill row or a big number. FloraScore is a glass hero: a soft gradient built from the brand colours
   with a frosted panel and the ring sitting on top of it. The month is a heat calendar of rounded squares, the week is
   seven pills, and the check-in answers are stacked chips.
   Every number is read from D; nothing is typed. Colours: the reading is --ap-chart (Ray on the hero), your usual is
   Plum on light and Ray on dark, a shift either way is Gold, context is Teal, and every colour has a word beside it.
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
  const tile = (o, inner) => `<div class="bt-t bt-s${o.s || 6}${o.cls ? " " + o.cls : ""}" style="--i:${o.i || 0}">${inner}</div>`;
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

  /* a one-line strip of days, each a short pill in its state's colour */
  const dayStrip = (x, cells, aria) => {
    const n = cells.length, st = 8, bw = 6, W = Math.max(1, n * st - 2), H = 24;
    return `<svg class="bt-strip" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="max-width:${n * 12}px" role="img" aria-label="${x.esc(aria)}">${cells.map((c, j) => `<rect class="bt-sc bt-sc--${c.cls}${c.today ? " is-today" : ""} bt-grow" x="${j * st}" y="${c.cls === "x" ? H / 2 : 0}" width="${bw}" height="${c.cls === "x" ? H / 2 : H}" rx="3" vector-effect="non-scaling-stroke" style="--j:${j}"/>`).join("")}</svg>`;
  };

  /* runs of consecutive points, so a gap stays a gap */
  const runs = (pts) => { const out = []; let cur = []; pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; };

  /* a sparkline with the usual band drawn first, the newest point ringed */
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
    return `<svg class="bt-spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="${x.esc(o.aria)}">
      ${o.band ? `<rect class="bt-band" x="0" y="${r1(Y(o.band[1]))}" width="${w}" height="${r1(Math.max(2, Y(o.band[0]) - Y(o.band[1])))}" rx="4"/>` : ""}
      ${segs.map((s) => `<path class="bt-line bt-draw" pathLength="1" d="${x.C.path(s)}"/>`).join("")}
      ${pts.map((p, i) => (p && i !== last && out(vals[i]) ? `<circle class="bt-dot is-s bt-pop" cx="${r1(p[0])}" cy="${r1(p[1])}" r="3" style="--j:${i}"/>` : "")).join("")}
      ${last != null ? `<circle class="bt-end bt-pop${out(vals[last]) ? " is-s" : ""}" cx="${r1(pts[last][0])}" cy="${r1(pts[last][1])}" r="4.5" style="--j:${vals.length}"/>` : ""}
    </svg>`;
  };

  /* the learning tile: where Florin is in its first days */
  const learnTile = (x, D, o) => {
    const L = D.learning;
    const wide = (o.s || 6) > 3;
    return tile({ s: o.s || 6, i: o.i || 0, cls: o.cls }, `${kick(x, o.k, wide ? `Day ${L.day} of ${L.of}` : "")}${ans(x, o.a, o.acls)}${steps(x, L.day, L.of, `Day ${L.day} of ${L.of}. Florin is still learning your usual.`)}${wide ? "" : sub(x, `Day ${L.day} of ${L.of}`)}${o.sub ? sub(x, o.sub) : ""}`);
  };

  /* ===================================================================== FloraScore: the glass hero */
  const heroDial = (x, o) => {
    const S = 184, c = 92, R = 76, sw = 14, RU = 60;
    let svg;
    if (o.learn) {
      const n = o.learn.of, g = 2.4;
      svg = `<circle class="bt-hr-trk" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}"/>` + Array.from({ length: n }, (_, i) => `<circle class="bt-hr-seg${i < o.learn.day ? " is-on" : ""}" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}" pathLength="100" style="stroke-dasharray:${r1(100 / n - g)} 100;stroke-dashoffset:${r1(-(i * 100) / n - g / 2)};--k:${i}" transform="rotate(-90 ${c} ${c})"/>`).join("");
    } else {
      const u = o.u, v = o.v;
      const notch = (val) => { const a = (val / 100) * Math.PI * 2; return `<line class="bt-hr-notch" x1="${r1(c + Math.sin(a) * (R - sw / 2 - 1))}" y1="${r1(c - Math.cos(a) * (R - sw / 2 - 1))}" x2="${r1(c + Math.sin(a) * (R + sw / 2 + 1))}" y2="${r1(c - Math.cos(a) * (R + sw / 2 + 1))}"/>`; };
      const knob = v != null ? (() => { const a = (v / 100) * Math.PI * 2; return `<circle class="bt-hr-knob${o.shift ? " is-s" : ""}" cx="${r1(c + Math.sin(a) * R)}" cy="${r1(c - Math.cos(a) * R)}" r="8"/>`; })() : "";
      svg = `<circle class="bt-hr-trk" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}"/>
        <circle class="bt-hr-utrk" cx="${c}" cy="${c}" r="${RU}"/>
        <circle class="bt-hr-band" cx="${c}" cy="${c}" r="${RU}" stroke-width="5" pathLength="100" style="stroke-dasharray:${u[1] - u[0]} 100;stroke-dashoffset:${-u[0]}" transform="rotate(-90 ${c} ${c})"/>
        ${v != null ? `<circle class="bt-hr-arc" cx="${c}" cy="${c}" r="${R}" stroke-width="${sw}" pathLength="100" style="stroke-dasharray:${clamp(v, 0, 100)} 100" transform="rotate(-90 ${c} ${c})"/>` : ""}
        ${notch(u[0])}${notch(u[1])}${knob}`;
    }
    return `<svg class="bt-hr" viewBox="0 0 ${S} ${S}" role="img" aria-label="${x.esc(o.aria)}">${svg}</svg>`;
  };
  const hero = (x, D, o) => tile({ s: 6, i: 0, cls: "bt-hero" }, `
      <i class="bt-orb bt-orb--a" aria-hidden="true"></i><i class="bt-orb bt-orb--b" aria-hidden="true"></i><i class="bt-orb bt-orb--c" aria-hidden="true"></i>
      <div class="bt-hero-top"><p class="bt-k bt-k--ray">FloraScore</p><p class="bt-k bt-k--hm">${x.esc(D.todayLabel)}</p></div>
      <div class="bt-stage">
        <div class="bt-dial">${heroDial(x, o)}<div class="bt-dial-c" aria-hidden="true">${o.center}</div></div>
        <div class="bt-glass">${o.panel}</div>
      </div>`);

  function score(D, x) {
    const S = D.score, E = x.esc;
    if (!S.usual) {
      const Ln = S.learning || { day: D.learning.day, of: D.learning.of, line: "" };
      const W = D.days[30], logged = W.filter((f) => f.logged).length;
      return board(x, "FloraScore, still learning your usual", [
        hero(x, D, {
          learn: Ln, aria: `Day ${Ln.day} of ${Ln.of}. Florin is still learning your usual.`,
          center: `<span class="bt-dial-k">Learning</span><b class="bt-dial-n bt-dial-n--sm">Day ${num(Ln.day, { dur: 700 })}</b><span class="bt-dial-s">of ${Ln.of}</span>`,
          panel: `<p class="bt-hero-a">${E(Ln.line)}</p>${legend(x, [["hseg", `Days so far, ${Ln.day}`], ["htrk", `Days to go, ${Ln.of - Ln.day}`]], "bt-lg--hero")}`
        }),
        tile({ s: 3, i: 1 }, `${kick(x, "Logged so far")}${big(x, logged, `of ${pl(W.length, "day")}`)}${dayStrip(x, W.map((f) => ({ cls: stOf(f)[0], today: f.today })), `${logged} of ${W.length} days logged`)}`),
        tile({ s: 3, i: 2 }, `${kick(x, "What counts")}${sub(x, "A BM, or No BM, each day. Symptoms and meals when they come up.")}`)
      ], fine(x, "FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.", "data-disclaimer"));
    }
    const v = S.value, u = S.usual;
    const shift = v != null && (v < u[0] || v > u[1]);
    const aria = v == null ? `No FloraScore yet today. Your usual range is ${u[0]} to ${u[1]}.` : `FloraScore today ${v}. ${S.relation}, ${u[0]} to ${u[1]}.`;
    const h = hero(x, D, {
      v, u, shift, aria,
      center: `<span class="bt-dial-k">Today</span>${v != null ? `<b class="bt-dial-n">${num(v, { dur: 1300 })}</b>` : `<b class="bt-dial-n bt-dial-n--sm">Not yet</b>`}<span class="bt-dial-s">of 100</span>`,
      panel: `<p class="bt-hero-a">${E(v != null ? S.relation : "Not enough logs yet today")}</p>
        <p class="bt-hero-s">${E(v != null ? `Your usual range is ${u[0]} to ${u[1]}.` : `Log a BM and today's FloraScore fills in. Your usual range is ${u[0]} to ${u[1]}.`)}</p>
        ${legend(x, [v != null && ["hring", `Today, ${v}`], ["hband", `Your usual, ${dash(x, u[0], u[1])}`], shift && ["hshift", "Outside your usual"]], "bt-lg--hero")}`
    });
    const s7 = (S.series && S.series[7]) || [];
    const wk = S.weekAvg != null ? tile({ s: 3, i: 1 }, `${kick(x, "This week")}${big(x, S.weekAvg, "average")}
        <div class="bt-chips">${chip(x, "none", S.delta > 0 ? `Up ${S.delta} on last week` : S.delta < 0 ? `Down ${-S.delta} on last week` : "Same as last week")}</div>
        ${sub(x, `Last week ${S.lastWeekAvg}`)}`) : "";
    const sp = s7.length ? tile({ s: 3, i: 2 }, `${kick(x, "Last 7 days")}
        ${spark(x, s7.map((p) => p.value), { w: 143, h: 64, band: u, aria: `FloraScore over the last 7 days, today ${v != null ? v : "not yet"}. Your usual range is ${u[0]} to ${u[1]}.` })}
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
    const pct = (p) => `${Math.round(p.weight * 100)}%`;
    const dWord = (p) => (p.delta > 0 ? `Up ${p.delta.toFixed(1)} points` : p.delta < 0 ? `Down ${Math.abs(p.delta).toFixed(1)} points` : "About the same");
    const dShort = (p) => (p.delta > 0 ? `+${p.delta.toFixed(1)} pts` : p.delta < 0 ? `−${Math.abs(p.delta).toFixed(1)} pts` : "Same");
    const leadTile = tile({ s: 3, i: 0, cls: "bt-t--tall" }, `
      ${kick(x, moved ? "Moved it most" : "The biggest part")}
      ${ans(x, moved ? `${lead.label}, ${low(dWord(lead))} on last week.` : "Every part held about the same as last week.", "bt-a--md")}
      ${miniRing(x, { size: 112, sw: 11, segs: [{ v: lead.now, cls: "r" }], total: 100, tick: lead.before, aria: `${lead.label}: ${lead.now} out of 100 this week, ${lead.before} last week. ${dWord(lead)}.`, center: `<b class="bt-ring-n">${num(lead.now, { dur: 1100 })}</b><span class="bt-ring-s">this week</span>` })}
      <p class="bt-pname bt-pname--lead">${x.esc(lead.label)} <span>${pct(lead)}</span></p>
      ${sub(x, `Last week ${lead.before}`)}`);
    const small = rest.map((p, k) => tile({ s: 3, i: k + 1, cls: "bt-t--c" }, `
      <p class="bt-pname">${x.esc(p.label)} <span>${pct(p)}</span></p>
      <div class="bt-prow"><p class="bt-n bt-n--md">${num(p.now, { dur: 900 })}</p><p class="bt-delta" aria-label="${x.esc(dWord(p))}">${dShort(p)}</p></div>
      <div class="bt-meter" role="img" aria-label="${x.esc(`${p.label}: ${p.now} out of 100 this week, ${p.before} last week. ${dWord(p)}.`)}"><i style="--w:${clamp(p.now, 0, 100)}%"></i><b style="--at:${clamp(p.before, 0, 100)}%"></b></div>`));
    return board(x, `What makes up the score. ${moved ? `${lead.label} moved it most, ${low(dWord(lead))}.` : "About the same as last week."}`, [leadTile, ...small],
      `${legend(x, [["r", "This week, out of 100"], ["tick", "Last week"], ["pct", "Share of the score"]], "bt-lg--out")}${fine(x, "Each part reads you against your own usual. Points are what each part added to or took from the score since last week. FloraScore isn't a medical score, and a lower number isn't a diagnosis.", "data-disclaimer")}`);
  }

  /* ===================================================================== FloraScore over 30 days */
  function trend(D, x) {
    const S = D.score;
    if (!S.usual || !S.series) {
      return board(x, "FloraScore over 30 days, not started yet", [
        learnTile(x, D, { k: "FloraScore · 30 days", a: "Your trend starts with your first FloraScore.", sub: S.learning ? S.learning.line : "" })
      ]);
    }
    const ser = S.series[30], u = S.usual, E = x.esc;
    const known = ser.filter((s) => s.value != null);
    const inN = known.filter((s) => s.value >= u[0] && s.value <= u[1]).length;
    const above = known.filter((s) => s.value > u[1]).length, below = known.filter((s) => s.value < u[0]).length;
    const gaps = ser.length - known.length;
    const avg = known.length ? Math.round(sum(known.map((s) => s.value)) / known.length) : null;
    const lastI = ser.map((s, i) => (s.value != null ? i : -1)).filter((i) => i >= 0).pop();
    /* the chart */
    const w = 326, top = 22, left = 24, right = 8, ph = 132, H = top + ph + 22;
    const lo = Math.floor((Math.min(...known.map((s) => s.value), u[0]) - 2) / 5) * 5, hi = Math.ceil((Math.max(...known.map((s) => s.value), u[1]) + 2) / 5) * 5;
    const X = x.lin(0, Math.max(1, ser.length - 1), left + 6, w - right - 6), Y = x.lin(lo, hi, top + ph, top);
    const ticks = []; for (let t = Math.ceil(lo / 10) * 10; t <= hi; t += 10) ticks.push(t);
    const pts = ser.map((s, i) => (s.value == null ? null : [X(i), Y(s.value)]));
    const segs = runs(pts);
    const outside = (vv) => vv < u[0] || vv > u[1];
    const lv = ser[lastI] ? ser[lastI].value : null;
    const lx = lastI != null ? X(lastI) : 0, ly = lv != null ? Y(lv) : 0;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`FloraScore over the last 30 days. Within your usual range of ${u[0]} to ${u[1]} on ${inN} of ${known.length} days with a score, above it on ${above} and below it on ${below}. Today ${lv != null ? lv : "not yet"}.`)}">
      ${ticks.map((t) => `<line class="bt-gl" x1="${left}" x2="${w - right}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/><text class="bt-tick" x="${left - 6}" y="${r1(Y(t) + 3.5)}" text-anchor="end">${t}</text>`).join("")}
      <rect class="bt-band bt-fade" x="${left}" y="${r1(Y(u[1]))}" width="${w - left - right}" height="${r1(Y(u[0]) - Y(u[1]))}" rx="4"/>
      <line class="bt-bedge" x1="${left}" x2="${w - right}" y1="${r1(Y(u[1]))}" y2="${r1(Y(u[1]))}"/><line class="bt-bedge" x1="${left}" x2="${w - right}" y1="${r1(Y(u[0]))}" y2="${r1(Y(u[0]))}"/>
      ${segs.map((s) => `<path class="bt-line bt-draw" pathLength="1" d="${x.C.path(s)}"/>`).join("")}
      ${pts.map((p, i) => (!p || i === lastI ? "" : `<circle class="bt-dot bt-pop${outside(ser[i].value) ? " is-s" : ""}" cx="${r1(p[0])}" cy="${r1(p[1])}" r="${outside(ser[i].value) ? 3.4 : 2.2}" style="--j:${i}"/>`)).join("")}
      ${lv != null ? `<circle class="bt-halo bt-pop" cx="${r1(lx)}" cy="${r1(ly)}" r="9" style="--j:${ser.length}"/><circle class="bt-end bt-pop${outside(lv) ? " is-s" : ""}" cx="${r1(lx)}" cy="${r1(ly)}" r="5" style="--j:${ser.length}"/>
      <text class="bt-lbl bt-lbl--now bt-halo-t" x="${r1(lx + 4)}" y="${r1(ly > top + ph / 2 ? ly - 14 : ly + 22)}" text-anchor="end">Today ${lv}</text>` : ""}
      <text class="bt-tick" x="${left + 6}" y="${H - 4}">${E(ser[0].label)}</text>
      <text class="bt-tick" x="${r1(X(Math.floor((ser.length - 1) / 2)))}" y="${H - 4}" text-anchor="middle">${E(ser[Math.floor((ser.length - 1) / 2)].label)}</text>
      <text class="bt-tick" x="${w - right - 6}" y="${H - 4}" text-anchor="end">Today</text>
    </svg>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "FloraScore · 30 days", `${ser[0].label} to ${ser[ser.length - 1].label}`)}
      ${ans(x, `Within your usual range on ${inN} of ${known.length} days.`)}
      ${chart}
      ${legend(x, [["line", "FloraScore"], ["band", `Your usual, ${dash(x, u[0], u[1])}`], (above || below) && ["sdot", "Outside your usual"]])}`);
    const strip = tile({ s: 4, i: 1, cls: "bt-t--c" }, `${kick(x, "Day by day")}
      ${dayStrip(x, ser.map((s) => ({ cls: s.value == null ? "x" : outside(s.value) ? "s" : "u", today: s.today })), `${inN} days within your usual range, ${above} above, ${below} below${gaps ? `, ${gaps} with no score` : ""}.`)}
      ${legend(x, [["u", `${inN} within`], above && ["s", `${above} above`], below && ["s", `${below} below`], gaps && ["x", `${gaps} no score`]])}`);
    const av = avg != null ? tile({ s: 2, i: 2, cls: "bt-t--c" }, `${kick(x, "Average")}${big(x, avg, "", { size: "md" })}${sub(x, `Usual ${u[0]} to ${u[1]}`)}`) : "";
    return board(x, `FloraScore over 30 days: within your usual range on ${inN} of ${known.length} days`, [main, strip, av]);
  }

  /* ===================================================================== this week: seven pills */
  function week(D, x) {
    const W = D.days[7], Ln = D.learning, E = x.esc;
    const logged = W.filter((f) => f.logged);
    const nU = W.filter((f) => f.state === "usual").length, nS = W.filter((f) => f.state === "shifted").length;
    const answer = !logged.length ? "Nothing logged this week yet."
      : Ln ? `${pl(logged.length, "day")} logged so far. Florin learns your usual by day ${Ln.of}.`
      : `${nU} of ${pl(logged.length, "logged day")} sat within your usual${nS ? `, and ${nS} shifted` : ""}.`;
    /* a week shorter than seven days (the first days) keeps its seven slots: the days before you started stay empty */
    const padN = Math.max(0, 7 - W.length);
    const firstI = DOWS.indexOf(W[0] ? W[0].dow : "Mon");
    const pads = Array.from({ length: padN }, (_, k) => DOWS[(firstI - padN + k + 7) % 7]);
    const dots = (f) => (f.count == null ? "" : f.count === 0 ? `<i class="is-zero"></i>` : Array.from({ length: Math.min(4, f.count) }, () => "<i></i>").join(""));
    const pill = (f, j) => {
      const [c, w] = stOf(f);
      return `<li class="bt-day bt-day--${c}${f.today ? " is-today" : ""}" style="--j:${j}"><span class="bt-pill"><b>${f.logged && f.score != null ? f.score : ""}</b><span class="bt-pdots">${dots(f)}</span></span><span class="bt-dow">${f.today ? "Today" : E(f.dow)}</span></li>`;
    };
    const aria = `${answer} ${W.map((f) => `${f.today ? "Today" : DOWL[f.dow] || f.dow}: ${low(stOf(f)[1])}${f.count != null ? `, ${pl(f.count, "BM")}` : ""}`).join(". ")}.`;
    const pills = `<ol class="bt-week" role="img" aria-label="${E(aria)}">${pads.map((d) => `<li class="bt-day bt-day--pad"><span class="bt-pill"></span><span class="bt-dow">${d}</span></li>`).join("")}${W.map((f, j) => pill(f, j + padN)).join("")}</ol>`;
    const hasScore = W.some((f) => f.logged && f.score != null);
    const main = tile({ s: 6, i: 0 }, `${kick(x, "This week", W.length ? `${W[0].label} to ${W[W.length - 1].label}` : "")}${ans(x, answer)}${pills}
      ${legend(x, [...stateLegend(W), ["bms", "One dot per BM"], ["today", "Today"]])}${hasScore ? sub(x, "The number in each pill is that day's FloraScore.", "bt-sub--xs") : ""}`);
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
    /* BMs this week: one small bar per day, gaps left empty */
    const withC = W.filter((f) => f.count != null);
    const total = sum(withC.map((f) => f.count));
    const mx = Math.max(2, ...withC.map((f) => f.count));
    const bw = 143, bh = 40, slot = bw / 7;
    const bars = [...pads.map(() => null), ...W].map((f, i) => {
      const cx = r1(slot * i + slot / 2);
      if (!f) return "";
      if (f.count == null) return `<line class="bt-gapmark" x1="${r1(cx - 3)}" x2="${r1(cx + 3)}" y1="${bh - 1}" y2="${bh - 1}"/>`;
      if (f.count === 0) return `<circle class="bt-zero bt-pop" cx="${cx}" cy="${bh - 4}" r="3" style="--j:${i}"/>`;
      const hh = r1(((bh - 4) * f.count) / mx);
      return `<rect class="bt-mbar bt-grow${f.today ? " is-today" : ""}" x="${r1(cx - 5)}" y="${r1(bh - hh)}" width="10" height="${hh}" rx="3" style="--j:${i}"/>`;
    }).join("");
    const bms = tile({ s: 3, i: 2 }, `${kick(x, "BMs this week")}${big(x, total, `on ${pl(withC.length, "day")}`, { size: "md" })}
      <svg class="bt-mini" viewBox="0 0 ${bw} ${bh}" role="img" aria-label="${E(`${pl(total, "BM")} this week across ${pl(withC.length, "day")} with BMs logged. ${D.often.usualText ? `Your usual is ${D.often.usualText}.` : ""}`)}">${bars}</svg>
      ${sub(x, D.often.usualText ? `Your usual ${D.often.usualText}` : "One bar per day")}`);
    return board(x, `This week at a glance. ${answer}`, [main, today, bms]);
  }

  /* ===================================================================== the last 30 days: a heat calendar */
  function month(D, x) {
    const M = D.days[30], Ln = D.learning, E = x.esc;
    const logged = M.filter((f) => f.logged);
    const cnt = (k) => M.filter((f) => f.state === k && !f.pending).length;
    const nU = cnt("usual"), nS = cnt("shifted"), nX = M.filter((f) => !f.logged).length;
    const answer = Ln ? `${pl(logged.length, "day")} logged of your first ${M.length}.` : `${nU} of ${pl(logged.length, "logged day")} sat within your usual.`;
    const lead = Math.max(0, DOWS.indexOf(M[0].dow));
    const cells = [...Array.from({ length: lead }, () => `<span class="bt-sq bt-sq--pad" aria-hidden="true"></span>`), ...M.map((f, j) => {
      const [c] = stOf(f);
      return `<span class="bt-sq bt-sq--${c}${f.today ? " is-today" : ""}" style="--j:${j}" title="${E(`${f.label}: ${stOf(f)[1]}`)}">${f.date}</span>`;
    })].join("");
    const longest = (() => { let best = 0, bi = -1, run = 0; M.forEach((f, i) => { run = f.state === "usual" ? run + 1 : 0; if (run > best) { best = run; bi = i; } }); return best ? { n: best, from: M[bi - best + 1].label, to: M[bi].label } : null; })();
    const aria = `${answer} ${nS ? `${nS} shifted. ` : ""}${nX ? `${pl(nX, "day")} with no logs, left as gaps. ` : ""}Today, ${M[M.length - 1].label}: ${low(stOf(M[M.length - 1])[1])}.`;
    const extra = ["unsure", "nocount", "logged"].filter((k) => M.some((f) => f.state === k)).map((k) => [ST[k][0], ST[k][1]]);
    const main = tile({ s: 6, i: 0 }, `${kick(x, "The last 30 days", `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}
      <div class="bt-cal" role="img" aria-label="${E(aria)}">${DOWS.map((d) => `<span class="bt-cal-h" aria-hidden="true">${d.charAt(0)}</span>`).join("")}${cells}</div>
      ${legend(x, [...extra, ["today", "Today"]])}`);
    if (Ln) {
      return board(x, `The last month. ${answer}`, [main,
        tile({ s: 2, i: 1, cls: "bt-t--c bt-t--stat" }, `${kick(x, "Logged")}${big(x, logged.length, "days", { size: "md" })}<i class="bt-key bt-key--l" aria-hidden="true"></i>`),
        tile({ s: 2, i: 2, cls: "bt-t--c bt-t--stat" }, `${kick(x, "No logs")}${big(x, nX, nX === 1 ? "day" : "days", { size: "md" })}<i class="bt-key bt-key--x" aria-hidden="true"></i>`),
        tile({ s: 2, i: 3, cls: "bt-t--c bt-t--stat" }, `${kick(x, "Learning")}${big(x, Ln.day, `of ${Ln.of}`, { size: "md" })}${sub(x, "days")}`)
      ]);
    }
    const stat = (k, label, n, i) => tile({ s: 2, i, cls: "bt-t--c bt-t--stat" }, `${kick(x, label)}${big(x, n, n === 1 ? "day" : "days", { size: "md" })}<i class="bt-key bt-key--${k}" aria-hidden="true"></i>`);
    return board(x, `The last month. ${answer}`, [main, stat("u", "Within your usual", nU, 1), stat("s", "Shifted", nS, 2), stat("x", "No logs", nX, 3)],
      longest && longest.n > 1 ? fine(x, `Longest run within your usual: ${longest.n} days, ${longest.from} to ${longest.to}.`) : "");
  }

  /* ===================================================================== timing: a dot histogram of first BMs */
  function timing(D, x) {
    const M = D.days[30], Tm = D.timing, U = Tm.usual, Ln = D.learning, E = x.esc;
    const morn = M.map((f, i) => ({ f, i })).filter((o) => o.f.first != null);
    if (!morn.length) return board(x, "Timing: no first BMs logged yet", [tile({ s: 6 }, `${kick(x, "First BM")}${ans(x, "No first BMs logged yet.")}`)]);
    const ts = morn.map((o) => o.f.first);
    let t0 = Math.floor(Math.min(...ts, U ? U[0] : 24) - 0.25), t1 = Math.ceil(Math.max(...ts, U ? U[1] : 0) + 0.25);
    if (t1 - t0 < 4) { const pad = 4 - (t1 - t0); t0 -= Math.floor(pad / 2); t1 += Math.ceil(pad / 2); }
    const step = 0.25, nb = Math.round((t1 - t0) / step);
    const w = 326, top = 22, axis = 22;
    const slot = w / nb, rad = Math.min(5.5, slot / 2 - 1.5), gapY = rad * 2 + 3;
    const stack = {};
    const dots = morn.map((o) => { const b = clamp(Math.floor((o.f.first - t0) / step), 0, nb - 1); const k = (stack[b] = (stack[b] || 0) + 1) - 1; return { ...o, b, k }; });
    const maxK = Math.max(4, ...Object.values(stack));
    const ph = maxK * gapY + 4, H = top + ph + axis;
    const X = (t) => ((t - t0) / (t1 - t0)) * w;
    const today = M[M.length - 1];
    const tDot = dots.find((d) => d.f.today);
    const hours = []; for (let hh = Math.ceil(t0); hh <= t1; hh++) hours.push(hh);
    const hourLbl = (hh) => x.T(hh, { short: true });
    const answer = U ? `Your first BM came in your usual window on ${Tm.inWin30} of ${pl(Tm.mornings30, "morning")}.` : `${pl(Tm.mornings30, "morning")} with a first BM logged. Florin learns your usual window by day ${Ln ? Ln.of : ""}.`;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer}${U ? ` Your usual window is ${Tm.usualText}.` : ""}${today.first != null ? ` Today ${today.firstText}.` : ""}`)}">
      ${U ? `<rect class="bt-band bt-fade" x="${r1(X(U[0]))}" y="${top - 4}" width="${r1(X(U[1]) - X(U[0]))}" height="${r1(ph + 4)}" rx="8"/>
      <line class="bt-bedge" x1="${r1(X(U[0]))}" x2="${r1(X(U[0]))}" y1="${top - 4}" y2="${r1(top + ph)}"/><line class="bt-bedge" x1="${r1(X(U[1]))}" x2="${r1(X(U[1]))}" y1="${top - 4}" y2="${r1(top + ph)}"/>
      <text class="bt-lbl bt-lbl--u" x="${r1((X(U[0]) + X(U[1])) / 2)}" y="${top - 10}" text-anchor="middle">Your usual</text>` : ""}
      <line class="bt-base" x1="0" x2="${w}" y1="${r1(top + ph)}" y2="${r1(top + ph)}"/>
      ${hours.map((hh) => `<line class="bt-gl" x1="${r1(X(hh))}" x2="${r1(X(hh))}" y1="${r1(top + ph)}" y2="${r1(top + ph + 4)}"/><text class="bt-tick" x="${r1(clamp(X(hh), 14, w - 14))}" y="${H - 4}" text-anchor="middle">${hourLbl(hh)}</text>`).join("")}
      ${dots.map((d) => { const cx = r1(slot * d.b + slot / 2), cy = r1(top + ph - rad - 2 - d.k * gapY); const out = U && d.f.inWin === false; return `<circle class="bt-tdot bt-pop${out ? " is-s" : ""}${d.f.today ? " is-today" : ""}" cx="${cx}" cy="${cy}" r="${r1(rad)}" style="--j:${d.i}"/>`; }).join("")}
      ${tDot ? (() => { const cx = r1(slot * tDot.b + slot / 2), cy = r1(top + ph - rad - 2 - tDot.k * gapY); return `<circle class="bt-halo bt-pop" cx="${cx}" cy="${cy}" r="${r1(rad + 4)}" style="--j:${M.length}"/>`; })() : ""}
    </svg>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "First BM · 30 days", `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}${chart}
      ${legend(x, [["dot", "First BM, one dot a morning"], U && ["band", `Your usual window, ${Tm.usualText}`], U && dots.some((d) => d.f.inWin === false) && ["sdot", "Outside your window"], tDot && ["today", "Today"]])}`);
    const ringT = U ? tile({ s: 3, i: 1 }, `${kick(x, "In your window")}
      ${miniRing(x, { size: 88, sw: 9, segs: [{ v: Tm.inWin30, cls: "u" }, { v: Tm.mornings30 - Tm.inWin30, cls: "s" }], aria: `${Tm.inWin30} of ${Tm.mornings30} mornings in your usual window.`, center: `<b class="bt-ring-n bt-ring-n--sm">${num(Tm.inWin30, { dur: 900 })}</b><span class="bt-ring-s">of ${Tm.mornings30}</span>` })}
      ${legend(x, [["u", "In your window"], ["s", "Outside it"]])}`)
      : learnTile(x, D, { s: 3, i: 1, k: "Your window", a: "Learning your usual window.", acls: "bt-a--md" });
    let chipT = "";
    if (today.first != null && U) chipT = today.inWin ? chip(x, "usual", "In your usual window") : chip(x, "shift", today.first < U[0] ? "Earlier than usual" : "Later than usual");
    const todayT = tile({ s: 3, i: 2 }, `${kick(x, "Today")}${today.first != null ? `${big(x, hm(today.firstText), ampm(today.firstText), { raw: true, size: "md" })}${sub(x, "First BM")}${chipT ? `<div class="bt-chips">${chipT}</div>` : ""}` : `${ans(x, today.count === 0 ? "No BM logged today" : "No first BM yet today", "bt-a--md")}${U ? sub(x, `Your usual window ${Tm.usualText}`) : ""}`}`);
    return board(x, `Timing. ${answer}`, [main, ringT, todayT]);
  }

  /* ===================================================================== how often: one pill per BM, a column a day */
  function often(D, x) {
    const M = D.days[30], O = D.often, U = O.usual, E = x.esc;
    const known = M.filter((f) => f.count != null);
    const inN = U ? known.filter((f) => f.count >= U[0] && f.count <= U[1]).length : null;
    const more = U ? known.filter((f) => f.count > U[1]).length : 0, fewer = U ? known.filter((f) => f.count < U[0]).length : 0;
    const zeros = known.filter((f) => f.count === 0).length;
    const gaps = M.length - known.length;
    const answer = U ? `Within your usual ${O.usualText} on ${inN} of ${pl(known.length, "day")}.` : `${pl(known.length, "day")} with BMs logged so far. Florin learns your usual by day ${D.learning ? D.learning.of : ""}.`;
    const w = 326, left = 18, top = 8, axis = 22, uh = 14, ug = 4;
    const mx = Math.max(3, ...known.map((f) => f.count), U ? U[1] + 1 : 0);
    const ph = mx * (uh + ug) + 4, H = top + ph + axis, base = top + ph;
    const nSlots = Math.max(14, M.length), off = nSlots - M.length;
    const slot = (w - left) / nSlots, bw = Math.min(8, slot - 3);
    const cx = (i) => left + slot * (i + off) + slot / 2;
    const yU = (k) => base - k * (uh + ug); /* the top edge of unit k (1-based) is yU(k) + ug */
    const units = M.map((f, i) => {
      if (f.count == null) return `<line class="bt-gapmark" x1="${r1(cx(i) - bw / 2)}" x2="${r1(cx(i) + bw / 2)}" y1="${r1(base + 3)}" y2="${r1(base + 3)}"/>`;
      const out = U && (f.count < U[0] || f.count > U[1]);
      if (f.count === 0) return `<circle class="bt-zero bt-pop${out ? " is-s" : ""}" cx="${r1(cx(i))}" cy="${r1(base - 5)}" r="3.5" style="--j:${i}"/>`;
      return Array.from({ length: f.count }, (_, k) => `<rect class="bt-unit bt-pop${out ? " is-s" : ""}" x="${r1(cx(i) - bw / 2)}" y="${r1(yU(k + 1) + ug)}" width="${r1(bw)}" height="${uh}" rx="${r1(bw / 2)}" style="--j:${i + k * 2}"/>`).join("");
    }).join("");
    const ti = M.length - 1, tf = M[ti];
    const tTop = tf.count ? yU(tf.count) + ug - 3 : base - 11;
    const todayMark = `<rect class="bt-todaycol" x="${r1(cx(ti) - bw / 2 - 3)}" y="${r1(tTop)}" width="${r1(bw + 6)}" height="${r1(base + 3 - tTop)}" rx="${r1(bw / 2 + 3)}"/>`;
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} ${more ? `More often on ${pl(more, "day")}. ` : ""}${fewer ? `Less often on ${pl(fewer, "day")}. ` : ""}${gaps ? `${pl(gaps, "day")} with no BM logs, left as gaps. ` : ""}Today ${tf.count == null ? "not logged yet" : pl(tf.count, "BM")}.`)}">
      ${U ? `<rect class="bt-band bt-fade" x="${left}" y="${r1(yU(U[1]) + ug / 2)}" width="${w - left}" height="${r1((U[1] - U[0] + 1) * (uh + ug))}" rx="6"/>` : ""}
      ${todayMark}
      ${Array.from({ length: mx }, (_, k) => `<text class="bt-tick" x="${left - 8}" y="${r1(yU(k + 1) + ug + uh / 2 + 3.5)}" text-anchor="end">${k + 1}</text>`).join("")}
      <line class="bt-base" x1="${left}" x2="${w}" y1="${base}" y2="${base}"/>
      ${units}
      <text class="bt-tick" x="${r1(cx(0) - bw / 2)}" y="${H - 4}">${E(M[0].label)}</text>
      <text class="bt-tick" x="${w}" y="${H - 4}" text-anchor="end">Today</text>
    </svg>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "BMs a day · 30 days", `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}${chart}
      ${legend(x, [["unit", "One BM"], U && ["band", `Your usual, ${O.usualText}`], (more || fewer) && ["s", "Outside your usual"], zeros && ["zero", "Logged no BM"], gaps && ["gap", "No logs, left as a gap"], ["today", "Today"]])}`);
    const avgT = O.avg30 != null ? tile({ s: 3, i: 1 }, `${kick(x, "Average")}${big(x, O.avg30, "a day", { dec: 1, size: "md" })}${sub(x, U ? `Your usual ${O.usualText}` : `Over ${pl(known.length, "day")}`)}`) : "";
    const splitT = U ? tile({ s: 3, i: 2 }, `${kick(x, "Day by day")}
      <div class="bt-seg" role="img" aria-label="${E(`${inN} days within your usual, ${more} more often, ${fewer} less often${gaps ? `, ${gaps} not logged` : ""}.`)}">${[["u", inN], ["s", more + fewer], ["x", gaps]].filter(([, n]) => n).map(([c, n], k) => `<i class="bt-seg--${c}" style="flex:${n};--k:${k}"></i>`).join("")}</div>
      ${legend(x, [["u", `${inN} within`], more && ["s", `${more} more`], fewer && ["s", `${fewer} fewer`], gaps && ["x", `${gaps} no logs`]])}`) : learnTile(x, D, { s: 3, i: 2, k: "Your usual", a: "Learning your usual count.", acls: "bt-a--md" });
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
    const n = F.bins.length, w = 326, top = 30, ph = 108, axis = 30, H = top + ph + axis;
    const slot = w / n, bw = Math.min(30, slot - 14);
    const mx = Math.max(1, ...F.bins.map((b) => b.count));
    const ui = F.bins.map((b, i) => (b.inUsual ? i : -1)).filter((i) => i >= 0);
    const band = ui.length ? `<rect class="bt-band bt-fade" x="${r1(slot * ui[0] + 3)}" y="${top - 6}" width="${r1(slot * ui.length - 6)}" height="${ph + 6}" rx="12"/>
      <text class="bt-lbl bt-lbl--u" x="${r1(slot * (ui[0] + ui[ui.length - 1] + 1) / 2)}" y="${top - 14}" text-anchor="middle">Your usual</text>` : "";
    const bars = F.bins.map((b, i) => {
      const cxp = slot * i + slot / 2, hh = b.count ? Math.max(bw, (ph - 18) * (b.count / mx)) : 0;
      const out = F.usual && !b.inUsual && b.count;
      return `${b.count ? `<rect class="bt-fbar bt-grow${out ? " is-s" : ""}" x="${r1(cxp - bw / 2)}" y="${r1(top + ph - hh)}" width="${r1(bw)}" height="${r1(hh)}" rx="${r1(bw / 2)}" style="--j:${i}"/>` : `<circle class="bt-none" cx="${r1(cxp)}" cy="${top + ph - 3}" r="2"/>`}
        <text class="bt-val" x="${r1(cxp)}" y="${r1(top + ph - hh - 6)}" text-anchor="middle">${b.count}</text>
        <text class="bt-xl" x="${r1(cxp)}" y="${top + ph + 16}" text-anchor="middle">${E(b.label)}</text>`;
    }).join("");
    const chart = `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} ${F.bins.filter((b) => b.count).map((b) => `${b.label}: ${b.count}`).join(", ")}.`)}">
      ${band}<line class="bt-base" x1="0" x2="${w}" y1="${top + ph}" y2="${top + ph}"/>${bars}
      <text class="bt-tick" x="0" y="${H - 2}">Firmer</text><text class="bt-tick" x="${w}" y="${H - 2}" text-anchor="end">Looser</text>
    </svg>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "Form · 30 days", D.modeName)}${ans(x, answer)}${chart}
      ${legend(x, [["bar", "BMs of each form"], F.usual && ["band", `Your usual, ${F.usualText}`], outN && ["s", "Outside your usual"]])}`);
    const ringT = F.usual && has ? tile({ s: 3, i: 1 }, `${kick(x, "Within your usual")}
      ${miniRing(x, { size: 88, sw: 9, segs: [{ v: F.within30, cls: "u" }, { v: outN, cls: "s" }, { v: either, cls: "e" }], aria: `${F.within30} of ${F.total30} BMs within your usual forms${outN ? `, ${outN} outside` : ""}${either ? `, ${either} could be either` : ""}.`, center: `<b class="bt-ring-n bt-ring-n--sm">${num(F.within30, { dur: 900 })}</b><span class="bt-ring-s">of ${F.total30}</span>` })}
      ${legend(x, [["u", "Within"], outN && ["s", "Outside"], either && ["e", "Could be either"]])}`)
      : learnTile(x, D, { s: 3, i: 1, k: "Your usual", a: "Learning your usual forms.", acls: "bt-a--md" });
    const lastBm = allForms.length ? allForms[allForms.length - 1] : null;
    const lastT = tile({ s: 3, i: 2 }, `${kick(x, lastBm && lastBm.day.today ? "Latest, today" : "Latest BM")}${lastBm ? `${big(x, lastBm.name, "", { raw: true, size: "word" })}${sub(x, `${lastBm.day.today ? "Today" : lastBm.day.label}, ${x.T(lastBm.t)}`)}
      <div class="bt-chips">${!F.usual ? chip(x, "none", "Usual not known yet") : lastBm.within === true ? chip(x, "usual", "Within your usual") : lastBm.within === false ? chip(x, "shift", "Outside your usual") : chip(x, "none", "Could be either")}</div>` : ans(x, "No BMs logged yet", "bt-a--md")}`);
    return board(x, `Form. ${answer}`, [main, ringT, lastT]);
  }

  /* ===================================================================== symptoms: a heat strip per symptom */
  function symptoms(D, x) {
    const Sy = D.symptoms, M = D.days[30], E = x.esc;
    const rows = Sy.rows.slice(0, 4), more = Sy.rows.slice(4);
    const share = Sy.logged30 ? Sy.withSym30 / Sy.logged30 : 0;
    const every = share ? Math.max(1, Math.round(1 / share)) : null;
    const nowText = !Sy.logged30 ? null : every == null ? "Rarely" : every <= 1 ? "Most days" : `About 1 day in ${every}`;
    const top1 = rows[0];
    const answer = !Sy.logged30 ? "Nothing logged yet." : !Sy.withSym30 ? `No symptoms on any of your ${pl(Sy.logged30, "logged day")}.` : `Symptoms came up on ${Sy.withSym30} of ${pl(Sy.logged30, "logged day")}, ${low(top1.name)} most often.`;
    const w = 326, n = M.length, gap = 2, cw = Math.min(14, (w - gap * (n - 1)) / n), ch = 16, rowH = ch + 26;
    const x0 = w - (n * cw + (n - 1) * gap);
    const cls = (v) => (v === null ? "x" : v === false ? "n" : v === 0 ? "z" : `l${v}`);
    const H = rows.length * rowH + 16;
    const present = new Set(rows.flatMap((r) => r.cells.map(cls)));
    const heat = rows.length ? `<svg class="bt-chart" viewBox="0 0 ${w} ${H}" role="img" aria-label="${E(`${answer} ${rows.map((r) => `${r.name} on ${pl(r.days, "day")}`).join(", ")}.`)}">
      ${rows.map((r, ri) => { const y0 = ri * rowH; return `<text class="bt-rowl" x="0" y="${y0 + 13}">${E(r.name)}</text><text class="bt-rowv" x="${w}" y="${y0 + 13}" text-anchor="end">${pl(r.days, "day")}</text>
        ${r.cells.map((v, i) => `<rect class="bt-hc bt-hc--${cls(v)} bt-pop" x="${r1(x0 + i * (cw + gap))}" y="${y0 + 20}" width="${r1(cw)}" height="${ch}" rx="3" style="--j:${i + ri * 3}"/>`).join("")}`; }).join("")}
      <text class="bt-tick" x="${r1(x0)}" y="${H - 2}">${E(M[0].label)}</text><text class="bt-tick" x="${w}" y="${H - 2}" text-anchor="end">Today</text>
    </svg>` : "";
    const lg = [present.has("l1") && ["l1", "Mild"], present.has("l2") && ["l2", "Moderate"], present.has("l3") && ["l3", "Strong"], present.has("z") && ["z", "Strength not said"], present.has("n") && ["n", "None"], present.has("x") && ["x", "Not logged"]];
    const main = tile({ s: 6, i: 0 }, `${kick(x, "Symptoms · 30 days", `${M[0].label} to ${M[M.length - 1].label}`)}${ans(x, answer)}${heat}
      ${rows.length ? legend(x, lg) : ""}${more.length ? sub(x, `Also: ${andList(more.map((r) => `${low(r.name)} on ${pl(r.days, "day")}`))}.`) : ""}`);
    const same = nowText && Sy.usualText && nowText === Sy.usualText;
    const howT = tile({ s: 3, i: 1 }, `${kick(x, "How often")}${big(x, Sy.withSym30, `of ${Sy.logged30} days`, { size: "md" })}
      ${dayStrip(x, M.map((f) => ({ cls: !f.logged ? "x" : f.sym.length ? "r" : "n", today: f.today })), `Symptoms on ${Sy.withSym30} of ${Sy.logged30} logged days${nowText ? `, ${low(nowText)}` : ""}.${Sy.usualText ? ` Your usual: ${low(Sy.usualText)}.` : ""}`)}
      <dl class="bt-pair">${nowText ? `<div><dt>This month</dt><dd>${E(nowText)}</dd></div>` : ""}${Sy.usualText ? `<div><dt>Your usual</dt><dd>${E(Sy.usualText)}</dd></div>` : ""}</dl>
      ${same ? `<div class="bt-chips">${chip(x, "usual", "About the same")}</div>` : ""}`);
    /* the strongest day: the highest strength said, the latest day it came up */
    let strong = null;
    Sy.rows.forEach((r) => r.cells.forEach((v, i) => { if (typeof v === "number" && v > 0 && (!strong || v > strong.v || (v === strong.v && i > strong.i))) strong = { v, i, name: r.name }; }));
    const words = ["Mild", "Moderate", "Strong"];
    const spread = [1, 2, 3, 0].map((k) => ({ k, n: sum(Sy.rows.map((r) => r.cells.filter((v) => v === k).length)) })).filter((g) => g.n);
    const spreadBar = spread.length ? `<div class="bt-seg bt-seg--sym" role="img" aria-label="${E(`Strengths logged: ${spread.map((g) => `${g.k ? words[g.k - 1].toLowerCase() : "strength not said"} ${g.n}`).join(", ")}.`)}">${spread.map((g, k) => `<i class="bt-seg--${g.k ? "l" + g.k : "z"}" style="flex:${g.n};--k:${k}"></i>`).join("")}</div>
      ${legend(x, spread.map((g) => [g.k ? "l" + g.k : "z", `${g.k ? words[g.k - 1] : "Not said"} ${g.n}`]))}` : "";
    const strongT = tile({ s: 3, i: 2 }, `${kick(x, "Strongest")}${strong ? `${big(x, words[strong.v - 1], "", { raw: true, size: "word" })}${sub(x, `${strong.name}, ${M[strong.i].today ? "today" : M[strong.i].label}`)}
      <div class="bt-meter3" role="img" aria-label="${E(`${words[strong.v - 1]}, the strongest you logged this month`)}">${[1, 2, 3].map((k) => `<i class="${k <= strong.v ? "is-on" : ""}" style="--j:${k}"></i>`).join("")}</div>
      <p class="bt-k bt-k--gap">All symptom logs</p>${spreadBar}` : ans(x, Sy.withSym30 ? "No strength said" : "None logged", "bt-a--md")}`);
    return board(x, `Symptoms. ${answer}`, [main, howT, strongT],
      `<div class="bt-care"><p class="bt-k">When to see a clinician</p><p>${E("Blood, black or tar-like stools, fever, vomiting that won't stop, weight loss or waking at night to go: talk to your primary care clinician first.")}</p></div>`);
  }

  /* ===================================================================== the weekly check-in: stacked chips */
  function checkin(D, x) {
    const C = D.checkin, Q = C.questions, E = x.esc;
    const started = Q.some((q) => q.band);
    if (!started) {
      return board(x, "Weekly check-in, not started yet", [
        tile({ s: 6, i: 0 }, `${kick(x, "Weekly check-in", C.due ? "Due now" : "")}${ans(x, "Your first three check-ins set your starting point. Florin compares every week after with them.")}
          <div class="bt-chips">${Q.map((q) => chip(x, "none", q.label)).join("")}</div>`),
        C.due ? tile({ s: 6, i: 1, cls: "bt-t--cta" }, `<button type="button" class="bt-btn">Answer this week's check-in</button>`) : ""
      ]);
    }
    const same = Q.filter((q) => q.cmp && q.cmp.k === "same");
    const diff = Q.filter((q) => q.cmp && q.cmp.k !== "same");
    const latest = Q.map((q) => q.latest).filter(Boolean)[0];
    const answer = !diff.length ? `All ${Q.length} answers sit within your first three weeks.` : `${same.length} of ${Q.length} answers sit within your first three weeks. ${andList(diff.map((q) => `${q.label}: ${low(q.cmp.text)}`))}.`;
    const qTile = (q, k) => {
      const lv = q.latest ? q.latest.v : null;
      const out = q.cmp && q.cmp.k !== "same";
      const answered = q.weeks.filter((wk) => wk.v != null).length;
      const items = q.ticks.map((t, v) => ({ t, v })).reverse().map(({ t, v }, j) => {
        const inBand = q.band && v >= q.band.lo && v <= q.band.hi;
        const now = lv === v;
        return `<li class="${inBand ? "is-band" : ""}${now ? " is-now" : ""}${now && out ? " is-out" : ""}" style="--j:${j}"><span>${E(t)}</span>${now ? `<em>Latest</em>` : ""}</li>`;
      }).join("");
      return tile({ s: 3, i: k + 1, cls: "bt-t--c bt-t--q" }, `<p class="bt-pname">${E(q.label)}</p>
        <ol class="bt-stack" role="img" aria-label="${E(`${q.label}: latest week ${q.latest ? q.opts[lv].toLowerCase() : "not answered"}. ${q.band ? `Your first three weeks ranged ${q.opts[q.band.lo].toLowerCase()}${q.band.hi !== q.band.lo ? ` to ${q.opts[q.band.hi].toLowerCase()}` : ""}.` : ""} ${q.cmp ? `${q.cmp.text}.` : ""}`)}">${items}</ol>
        <div class="bt-chips">${q.cmp ? chip(x, out ? "shift" : "usual", q.cmp.text) : chip(x, "none", "Not answered")}</div>
        ${sub(x, `${answered} weeks answered`, "bt-sub--xs")}`);
    };
    const head = tile({ s: 6, i: 0 }, `${kick(x, "Weekly check-in", latest ? latest.label : "")}${ans(x, answer)}
      ${legend(x, [["rail", "Your first three weeks"], ["now", "Latest week"], diff.length && ["s", "Outside your first weeks"]])}`);
    return board(x, `Weekly check-in. ${answer}`, [head, ...Q.map(qTile),
      C.due ? tile({ s: 6, i: 5, cls: "bt-t--cta" }, `<p class="bt-cta-l"><span class="bt-live" aria-hidden="true"></span>This week's check-in is ready</p><button type="button" class="bt-btn">Answer it</button>`) : ""]);
  }

  /* ===================================================================== a possible pattern */
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
      return board(x, "A possible pattern: not enough ordinary days to compare", [
        tile({ s: 6, i: 0 }, pct ? `${kick(x, "A possible pattern")}${ans(x, "Not enough ordinary days to compare yet.")}${sub(x, P.sparseLine)}`
          : `${kick(x, "A possible pattern")}${ans(x, "No meals logged yet, so there is nothing to compare.")}${sub(x, P.sparseLine.split(". ").pop())}`),
        tile({ s: 3, i: 1 }, `${kick(x, "Days with meals")}${miniRing(x, { size: 88, sw: 9, segs: [{ v: pct, cls: "r" }], total: 100, aria: `Meals logged on ${pct}% of your days.`, center: `<b class="bt-ring-n bt-ring-n--sm">${num(pct, { dur: 900 })}<small>%</small></b>` })}
          ${legend(x, [["r", "Meals logged"], ["trk", "No meals logged"]])}`),
        tile({ s: 3, i: 2, cls: "bt-t--food" }, `${kick(x, "Food check")}
          <button type="button" class="bt-mic" aria-label="Start a food check: say what you ate"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></button>
          <p class="bt-pname">Say what you ate</p>${sub(x, "Or type one line. Ordinary days count too.")}`)
      ], note);
    }
    if (!P.found.length) {
      return board(x, "A possible pattern: nothing stands out", [
        tile({ s: 6, i: 0 }, `${kick(x, "A possible pattern")}${ans(x, "Nothing stands out yet.")}${sub(x, "Florin keeps comparing what you log with your usual, and shows a pattern once it repeats.")}`)
      ], note);
    }
    const p = P.found[0];
    const lab = p.kind === "late" ? ["Late dinners", "Earlier dinners", "Later first BM"]
      : p.kind === "loose" ? [`After ${low(p.food)}`, "Other mornings", "Looser first BM"]
      : [`After ${low(p.food)}`, "Other days", "Bloating"];
    const waffle = (arr, aria) => {
      const cols = 13, sz = 8, st = 11, rows = Math.ceil(arr.length / cols);
      return `<svg class="bt-waf" viewBox="0 0 ${cols * st - 3} ${rows * st - 3}" role="img" aria-label="${E(aria)}">${arr.map((hit, i) => `<rect class="bt-wc${hit ? " is-hit" : ""} bt-pop" x="${(i % cols) * st}" y="${Math.floor(i / cols) * st}" width="${sz}" height="${sz}" rx="2" style="--j:${i}"/>`).join("")}</svg>`;
    };
    const tierDots = `<span class="bt-tier" aria-hidden="true">${[1, 2, 3].map((k) => `<i class="${k <= p.tierK ? "is-on" : ""}"></i>`).join("")}</span>`;
    const main = tile({ s: 6, i: 0 }, `${kick(x, "A possible pattern", P.found.length > 1 ? `1 of ${P.found.length} found` : "")}
      <p class="bt-ptitle">${E(p.title)}</p>${sub(x, p.line)}
      <div class="bt-chips"><span class="bt-chip bt-chip--info">${tierDots}${E(p.tier)}</span>${chip(x, "none", `${p.hit} of ${p.n} times`)}</div>`);
    const a = tile({ s: 3, i: 1 }, `${kick(x, lab[0])}${big(x, p.hit, `of ${p.n}`, { size: "md" })}${waffle(p.occ, `${lab[0]}: ${low(lab[2])} ${p.hit} of ${p.n} times.`)}`);
    const b = tile({ s: 3, i: 2 }, `${kick(x, lab[1])}${big(x, p.oh, `of ${p.on}`, { size: "md" })}${waffle(p.oth, `${lab[1]}: ${low(lab[2])} ${p.oh} of ${p.on} times.`)}`);
    return board(x, `A possible pattern. ${p.title}. ${p.line}`, [main, a, b], `${legend(x, [["hit", lab[2]], ["miss", "Not this time"]], "bt-lg--out")}${note}`);
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "bento",
    name: "Bento",
    idea: "A grid of small tiles like home-screen widgets: FloraScore as a glass hero, and every other answer split into a few glanceable facts, each with its own mini ring, pill row or calendar.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }
  });
})();
