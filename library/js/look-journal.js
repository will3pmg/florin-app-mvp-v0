/* Look: Field journal. Editorial science. Each card states its answer first, in a Lora sentence in the person's own
   terms, then draws one figure the way a good science magazine would: dot plots, beeswarms, small multiples, direct
   labels and thin leader lines instead of legends, hairline rules, and a mono figure caption. Cream paper on light,
   a night edition on dark. Every number comes from D (library/js/looks-data.js); nothing is typed. */
(function () {
  const W = 318; /* the card's inner width: 358 less 20px a side */
  const FIG = { score: 1, parts: 2, trend: 3, week: 4, month: 5, timing: 6, often: 7, form: 8, symptoms: 9, checkin: 10, pattern: 11 };
  const DOWL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
  const DOWI = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

  const f1 = (v) => String(Math.round(v * 10) / 10);
  const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const up = (s) => String(s).toUpperCase();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const andList = (a, last = "and") => (a.length < 2 ? a[0] || "" : `${a.slice(0, -1).join(", ")} ${last} ${a[a.length - 1]}`);
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
  const signed = (v) => (v > 0 ? `+${v.toFixed(1)}` : v < 0 ? `−${Math.abs(v).toFixed(1)}` : "0.0");
  const ptsWord = (v) => { const a = Math.abs(v), s = Number.isInteger(a) ? String(a) : a.toFixed(1); return `${s} ${a === 1 ? "point" : "points"}`; };
  const shortWeek = (s) => String(s).replace(/^Week of /, "");
  /* Space Mono is fixed-width: 0.6em a character, plus tracking. Used to keep direct labels inside the figure */
  const mw = (s, size = 10, ls = 0.04) => String(s).length * size * (0.6 + ls);
  const fitX = (x, w, anchor) => (anchor === "end" ? clamp(x, w, W) : anchor === "middle" ? clamp(x, w / 2, W - w / 2) : clamp(x, 0, W - w));

  /* the role a mark plays, as a class: read is the reading, usual your usual, shift a shift, open a gap or not logged */
  const mk = (html, role) => `<span class="jr-mk jr-mk--${role}">${html}</span>`;
  const sw = (role) => `<i class="jr-sw jr-sw--${role}" aria-hidden="true"></i>`;
  const key = (role, word) => `<span class="jr-key">${sw(role)}${word}</span>`;
  const tx = (x, y, s, cls, anchor) => `<text${cls ? ` class="${cls}"` : ""} x="${f1(x)}" y="${f1(y)}"${anchor && anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${s}</text>`;
  const ln = (x1, y1, x2, y2, cls, style) => `<line class="${cls}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"${style ? ` style="${style}"` : ""}/>`;
  const dot = (x, y, r, cls, i, st, more) => `<circle class="${cls}" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"${i != null ? ` style="--i:${i}${st ? `;--st:${st}` : ""}${more ? `;${more}` : ""}"` : ""}/>`;
  const svg = (ctx, h, aria, body, cls) => `<svg class="jr-svg${cls ? " " + cls : ""}" viewBox="0 0 ${W} ${f1(h)}"${aria == null ? ' aria-hidden="true"' : ` role="img" aria-label="${ctx.esc(aria)}"`}>${body}</svg>`;
  /* a label that sits above a figure and points down to what it names */
  const leader = (x, y1, y2, cls) => `${ln(x, y1, x, y2, `jr-lead ${cls || ""}`)}${dot(x, y2, 1.75, `jr-lead-end ${cls || ""}`)}`;

  /* the card: running head, the answer in Lora, one figure, its caption, then whatever closes the card */
  function shell(k, o) {
    return `<article class="jr jr--${k}">
      <header class="jr-head"><span class="jr-kick">${o.kicker}</span>${o.meta ? `<span class="jr-meta">${o.meta}</span>` : ""}</header>
      <div class="jr-text"><p class="jr-lede">${o.lede}</p>${o.deck ? `<p class="jr-deck">${o.deck}</p>` : ""}</div>
      ${o.fig ? `<figure class="jr-fig">${o.fig}<figcaption class="jr-cap"><span class="jr-fn">Fig. ${FIG[k]}</span>${o.cap}</figcaption></figure>` : ""}
      ${o.foot || ""}
    </article>`;
  }
  const note = (s, disc) => `<p class="jr-note"${disc ? " data-disclaimer" : ""}>${s}</p>`;
  const lastN = (days) => `Last ${days.length} days`;
  /* when your usual is ready, in words: the day it starts while Florin is still learning */
  const whenUsual = (D) => (D.learning ? `on day ${D.learning.of}` : "once Florin knows your usual");

  /* the first weeks: a row of days, the ones behind you filled, today ringed, the day your usual is ready named */
  function learnFig(D, ctx) {
    const Lr = D.learning, n = Lr.of, d = Lr.day, cy = 30, x = lin(0, n - 1, 8, W - 8);
    let b = ln(8, cy, W - 8, cy, "jr-grid");
    for (let i = 0; i < n; i++) b += dot(x(i), cy, i < d ? 5 : 3.5, i < d ? "jr-read jr-pop" : "jr-open jr-pop", i, "40ms");
    b += dot(x(d - 1), cy, 9.5, "jr-today jr-pop", d, "40ms");
    const tl = `TODAY, DAY ${d}`, tX = fitX(x(d - 1), mw(tl), "middle");
    if (tX - mw(tl) / 2 > x(0) + mw("FIRST DAY") + 8) b += tx(x(0), cy + 28, "FIRST DAY", "");
    b += tx(tX, cy + 28, tl, "tk", "middle");
    b += tx(W, cy - 16, up(`Your usual, day ${n}`), "tu", "end");
    b += ln(x(n - 1), cy - 12, x(n - 1), cy - 6, "jr-lead tu-s");
    return svg(ctx, cy + 34, `Day ${d} of ${n}. Florin knows your usual from day ${n}.`, b);
  }
  const learnCap = (D) => `Your first ${D.learning.of} days. Each dot is a day; the filled ones are behind you, today is ringed.`;

  /* ---------------- 1. FloraScore today ---------------- */
  function ringFig(ctx, o) {
    const cx = 232, cy = 92, r = 70, H = 186;
    const P = (v, rr = r) => { const a = (Math.min(v, 99.99) / 100) * Math.PI * 2; return [cx + rr * Math.sin(a), cy - rr * Math.cos(a)]; };
    const arc = (v0, v1, rr = r) => { const [x0, y0] = P(v0, rr), [x1, y1] = P(v1, rr); return `M${f1(x0)},${f1(y0)}A${rr},${rr} 0 ${v1 - v0 > 50 ? 1 : 0} 1 ${f1(x1)},${f1(y1)}`; };
    let b = "";
    /* the dial: a hairline every 5, a longer one every 25 */
    for (let t = 0; t < 100; t += 5) { const [x0, y0] = P(t, t % 25 ? r - 10 : r - 14), [x1, y1] = P(t, r - 6); b += ln(x0, y0, x1, y1, t % 25 ? "jr-tick" : "jr-tick jr-tick--major"); }
    b += `<circle class="jr-trk" cx="${cx}" cy="${cy}" r="${r}"/>`;
    const numY = 106, big = (s, count) => `<text class="jr-big" x="-4" y="${numY}"${count != null ? ` data-count="${count}" data-dur="1100"` : ""}>${s}</text>`;
    const digitsW = (s) => String(s).length * 50;
    let aria;
    if (o.learn) {
      const n = o.learn.of, d = o.learn.day, seg = 100 / n;
      for (let i = 0; i < n; i++) {
        const a0 = i * seg + 0.9, a1 = (i + 1) * seg - 0.9;
        b += `<path class="${i < d ? "jr-arc jr-draw" : "jr-arc-off"}" pathLength="1" d="${arc(a0, a1)}" style="--d:${100 + i * 50}ms;--dur:500ms"/>`;
      }
      b += tx(cx, cy - 4, "LEARNING", "tk-2", "middle") + `<text class="jr-ital" x="${cx}" y="${cy + 16}" text-anchor="middle">your usual</text>`;
      b += big(d, d) + tx(0, numY + 22, up(`of ${n} days`), "", "start");
      const [ex, ey] = P(d * seg - 0.9, r + 12), [dx0, dy0] = P(d * seg - 0.9, r + 4);
      if (d * seg > 52 && d * seg < 97) b += `<path class="jr-lead" d="M${f1(dx0)},${f1(dy0)}L${f1(ex)},${f1(ey)}L${f1(digitsW(d) + 8)},${f1(clamp(ey, 56, 96))}"/>`;
      aria = `Learning your usual: day ${d} of ${n}. FloraScore starts on day ${n}.`;
    } else {
      const u = o.usual, v = o.value;
      /* your usual first: a shaded arc on the ring, its edges ruled, its range set in the middle */
      b += `<path class="jr-band-arc" d="${arc(u[0], u[1])}"/>`;
      [u[0], u[1]].forEach((t) => { const [x0, y0] = P(t, r - 8), [x1, y1] = P(t, r + 8); b += ln(x0, y0, x1, y1, "jr-bandedge"); });
      b += tx(cx, cy - 6, "YOUR USUAL", "tu", "middle") + `<text class="jr-mid tu" x="${cx}" y="${cy + 18}" text-anchor="middle">${u[0]} to ${u[1]}</text>`;
      if (v == null) {
        b += `<text class="jr-big jr-big--none" x="0" y="${numY - 14}">No score</text>` + tx(0, numY + 8, "NOT ENOUGH RECENT LOGS");
        aria = `No FloraScore today: not enough recent logs. Your usual range is ${u[0]} to ${u[1]}.`;
      } else {
        b += `<path class="jr-arc jr-draw" pathLength="1" d="${arc(0, v)}" style="--d:100ms;--dur:1100ms"/>`;
        const [vx, vy] = P(v);
        b += dot(vx, vy, 5.5, "jr-read jr-vdot jr-pop", 0, null, "--d0:820ms");
        /* a leader from the newest reading on the ring to the numeral */
        if (v > 52 && v < 97) {
          const [ex, ey] = P(v, r + 14), [sx, sy] = P(v, r + 9), endX = digitsW(v) + 10;
          if (ex - endX > 16) b += `<path class="jr-lead jr-fade" d="M${f1(sx)},${f1(sy)}L${f1(ex)},${f1(ey)}L${f1(endX)},${f1(clamp(ey, 40, 96))}" style="--d:820ms"/>`;
        }
        b += big(v, v) + tx(0, numY + 22, "OUT OF 100");
        aria = `FloraScore ${v} out of 100, ${lower1(o.relation)} of ${u[0]} to ${u[1]}.`;
      }
    }
    return svg(ctx, H, aria, b, "jr-ring");
  }

  function score(D, ctx) {
    const S = D.score, e = ctx.esc;
    if (S.learning) {
      const Lr = S.learning;
      return shell("score", {
        kicker: "FloraScore", meta: e(D.todayLabel), lede: e(Lr.line),
        fig: ringFig(ctx, { learn: Lr }),
        cap: `Learning your usual. Each segment of the ring is one of your first ${Lr.of} days; the filled ones are behind you.`,
        foot: note("FloraScore will compare you with you. It isn't a medical score, and a lower number isn't a diagnosis.", true)
      });
    }
    const v = S.value, u = S.usual, within = S.relation === "Within your usual range";
    const lede = v == null
      ? `There aren't enough recent logs for a FloraScore today. Your ${mk("usual range", "usual")} is ${u[0]} to ${u[1]}.`
      : `Today’s FloraScore is ${v}, ${mk(e(lower1(S.relation)), within ? "usual" : "shift")} of ${u[0]} to ${u[1]}.`;
    const stats = S.weekAvg != null && S.lastWeekAvg != null ? `<div class="jr-stats">
        <div class="jr-stat"><span>This week</span><b data-count="${S.weekAvg}" data-dur="1000">${S.weekAvg}</b><em>${S.delta ? `${S.delta > 0 ? "+" : "−"}${Math.abs(S.delta)} on last week` : "Same as last week"}</em></div>
        <div class="jr-stat"><span>Last week</span><b>${S.lastWeekAvg}</b><em>Average</em></div>
      </div>` : "";
    return shell("score", {
      kicker: "FloraScore", meta: e(D.todayLabel), lede,
      fig: ringFig(ctx, { value: v, usual: u, relation: S.relation || "" }),
      cap: `FloraScore today, out of 100. The shaded arc on the ring is your usual range.`,
      foot: stats + note(e(S.how), true)
    });
  }

  /* ---------------- 2. The four parts ---------------- */
  function parts(D, ctx) {
    const S = D.score, e = ctx.esc;
    if (D.learning) return shell("parts", { kicker: "What makes up the score", meta: `Day ${D.learning.day} of ${D.learning.of}`, lede: `The parts of your FloraScore appear on day ${D.learning.of}, once Florin knows your usual.`, fig: learnFig(D, ctx), cap: learnCap(D) });
    const P = S.parts || [];
    if (!P.length) return shell("parts", { kicker: "What makes up the score", meta: "This week", lede: "There aren't enough logs across the last two weeks to compare the parts." });
    const top = P.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const moved = (p) => Math.abs(p.delta) >= 0.5;
    const lede = !moved(top)
      ? `All ${P.length} parts of your FloraScore were ${mk("about the same", "usual")} as last week.`
      : `${mk(e(top.label), "shift")} moved your FloraScore most this week, ${top.delta > 0 ? "adding" : "taking off"} ${ptsWord(top.delta)}.`;
    const deck = S.weekAvg != null ? `This week averaged ${S.weekAvg}, against ${S.lastWeekAvg} the week before.` : "";
    const vals = P.flatMap((p) => [p.now, p.before]);
    const lo = Math.max(0, Math.floor((Math.min(...vals) - 4) / 10) * 10), hi = 100;
    const x0 = 128, x1 = 266, X = lin(lo, hi, x0, x1), top0 = 26, rowH = 50;
    const yc = (i) => top0 + i * rowH + 18;
    const axisY = top0 + P.length * rowH;
    let b = tx(W, 10, "POINTS", "", "end");
    [lo, (lo + hi) / 2, hi].forEach((t) => { b += ln(X(t), top0 - 4, X(t), axisY - 6, "jr-grid") + tx(X(t), axisY + 8, f1(t), "t3", "middle"); });
    /* direct labels on the row whose two weeks sit furthest apart */
    const wide = P.reduce((m, p, i) => (Math.abs(p.now - p.before) > Math.abs(P[m].now - P[m].before) ? i : m), 0);
    P.forEach((p, i) => {
      const y = yc(i), xb = X(p.before), xn = X(p.now), mv = moved(p);
      b += `<text class="tl" x="0" y="${y + 1}">${e(p.label)}</text>` + tx(0, y + 17, `${Math.round(p.weight * 100)}% OF SCORE`);
      b += ln(x0, y, x1, y, "jr-grid");
      if (Math.abs(xn - xb) > 1) b += `<path class="jr-db${mv ? " jr-db--shift" : ""} jr-draw" pathLength="1" d="M${f1(xb)},${y}L${f1(xn)},${y}" style="--d:${200 + i * 90}ms;--dur:700ms"/>`;
      b += dot(xb, y, 4.5, "jr-open-ink") + dot(xn, y, 5.5, "jr-read jr-pop", i, "90ms", "--d0:550ms");
      b += `<text class="tm${mv ? " ts" : ""}" x="${W}" y="${y + 4}" text-anchor="end">${signed(p.delta)}</text>`;
      if (i === wide) {
        const gap = Math.abs(xn - xb), dir = p.now >= p.before;
        if (gap >= 6) {
          b += tx(dir ? xb + 3 : xb - 3, y - 12, "LAST WEEK", "", dir ? "end" : "start");
          const tw = mw("THIS WEEK"), tAnchor = dir ? "start" : "end";
          b += tx(fitX(dir ? xn - 3 : xn + 3, tw, tAnchor), y - 12, "THIS WEEK", "tk", tAnchor);
        } else b += tx(xn, y - 12, "BOTH WEEKS", "", "middle");
      }
    });
    const aria = `${P.map((p) => `${p.label} ${p.before} last week, ${p.now} this week, ${signed(p.delta).replace("−", "minus ")} points`).join("; ")}.`;
    return shell("parts", {
      kicker: "What makes up the score", meta: "This week vs last", lede, deck,
      fig: svg(ctx, axisY + 12, aria, b),
      cap: `The parts of FloraScore, each out of 100: ${key("open", "last week")}, ${key("read", "this week")}, ${key("shift", "a part that moved")}. Points are each part’s share of the change.`
    });
  }

  /* ---------------- 3. FloraScore over 30 days ---------------- */
  function trend(D, ctx) {
    const S = D.score;
    if (D.learning || !S.series) return shell("trend", { kicker: "FloraScore over time", meta: D.learning ? `Day ${D.learning.day} of ${D.learning.of}` : "", lede: D.learning ? `Your FloraScore over time starts on day ${D.learning.of}, once Florin knows your usual.` : "No FloraScore yet.", fig: D.learning ? learnFig(D, ctx) : "", cap: D.learning ? learnCap(D) : "" });
    const ser = S.series[30], u = S.usual, n = ser.length;
    const vs = ser.filter((s) => s.value != null).map((s) => s.value);
    const inN = vs.filter((v) => v >= u[0] && v <= u[1]).length, ab = vs.filter((v) => v > u[1]).length, be = vs.filter((v) => v < u[0]).length;
    const extra = [ab ? `above it on ${ab}` : "", be ? `below it on ${be}` : ""].filter(Boolean);
    const lede = `Your FloraScore sat ${mk("within your usual range", "usual")} on ${inN} of ${vs.length} days${extra.length ? `, ${mk(andList(extra), "shift")}` : ""}.`;
    const dmin = Math.floor((Math.min(...vs, u[0]) - 3) / 5) * 5, dmax = Math.ceil((Math.max(...vs, u[1]) + 3) / 5) * 5;
    const top = 30, ph = 120, bot = top + ph, left = 26;
    const X = lin(0, n - 1, left + 6, W - 8), Y = lin(dmin, dmax, bot, top);
    const step = dmax - dmin > 30 ? 10 : 5;
    let b = "";
    for (let t = Math.ceil(dmin / step) * step; t <= dmax; t += step) b += ln(left, Y(t), W, Y(t), "jr-grid") + tx(left - 6, Y(t) + 3.5, t, "t3", "end");
    /* your usual, drawn first and named with a leader */
    b += `<rect class="jr-band jr-band-in" x="${left}" y="${f1(Y(u[1]))}" width="${W - left}" height="${f1(Y(u[0]) - Y(u[1]))}"/>`;
    b += ln(left, Y(u[1]), W, Y(u[1]), "jr-bandedge") + ln(left, Y(u[0]), W, Y(u[0]), "jr-bandedge");
    const lbl = up(`Your usual range, ${u[0]} to ${u[1]}`);
    b += tx(left, 10, lbl, "tu") + leader(left + 4, 14, Y(u[1]), "tu-s");
    /* day ticks along the base, longer on Mondays */
    ser.forEach((s, i) => { b += ln(X(i), bot + 3, X(i), bot + (s.dow === "Mon" ? 9 : 6), "jr-tick"); });
    b += tx(X(0), bot + 22, up(ser[0].label), "t3", "start") + tx(X(Math.floor((n - 1) / 2)), bot + 22, up(ser[Math.floor((n - 1) / 2)].label), "t3", "middle") + tx(W, bot + 22, "TODAY", "tk", "end");
    /* the readings: a hairline through them, Gold where they leave the band */
    const runs = [];
    let cur = [];
    ser.forEach((s, i) => { if (s.value == null) { if (cur.length) runs.push(cur); cur = []; } else cur.push([X(i), Y(s.value)]); });
    if (cur.length) runs.push(cur);
    runs.forEach((r) => { if (r.length > 1) b += `<path class="jr-trace jr-draw" pathLength="1" d="${r.map((p, k) => `${k ? "L" : "M"}${f1(p[0])},${f1(p[1])}`).join("")}" style="--d:200ms"/>`; });
    ser.forEach((s, i) => { if (s.value != null) b += dot(X(i), Y(s.value), 3.2, `${s.value < u[0] || s.value > u[1] ? "jr-shift" : "jr-read"} jr-pop`, i); });
    /* the lowest point and today, labelled directly */
    const minV = Math.min(...vs), mi = ser.findIndex((s) => s.value === minV);
    if (minV < u[0]) {
      const s = `LOWEST, ${minV} ON ${up(ser[mi].label)}`, anchor = X(mi) + mw(s) < W ? "start" : "end";
      b += tx(fitX(anchor === "start" ? X(mi) - 4 : X(mi) + 4, mw(s), anchor), Y(minV) + 16, s, "jr-halo", anchor);
    }
    const li = n - 1 - ser.slice().reverse().findIndex((s) => s.value != null), lv = ser[li].value;
    b += dot(X(li), Y(lv), 7.5, "jr-today jr-pop", n);
    const tl = `${ser[li].today ? "TODAY" : up(ser[li].label)}, ${lv}`;
    b += tx(W, 10, tl, "tk", "end") + ln(X(li), 14, X(li), Y(lv) - 8, "jr-lead");
    const aria = `FloraScore over ${n} days: within your usual range of ${u[0]} to ${u[1]} on ${inN} of ${vs.length} days${extra.length ? `, ${andList(extra)}` : ""}. Today ${lv}.`;
    return shell("trend", {
      kicker: "FloraScore over time", meta: lastN(ser), lede,
      fig: svg(ctx, bot + 26, aria, b),
      cap: `FloraScore, day by day: ${key("read", "within your usual range")}, ${key("shift", "outside it")}. Today is ringed.`
    });
  }

  /* ---------------- day facts shared by the week and the month ---------------- */
  const stateRole = (s) => ({ usual: "usual", shifted: "shift", unsure: "either", nocount: "nocount", logged: "read", none: "open" }[s] || "open");
  const ROLE_ORDER = ["usual", "shift", "either", "nocount", "read", "open"];
  const rolesIn = (days) => ROLE_ORDER.filter((r) => days.some((f) => stateRole(f.state) === r));
  const STATE_WORD = { usual: "within your usual", shift: "shifted", either: "could be either", nocount: "logged without a BM", read: "logged", open: "not logged" };
  function why(D, f, T) {
    const r = [], tu = D.timing.usual, ou = D.often.usual;
    if (f.inWin === false && tu) r.push(`First BM at ${f.firstText}, ${f.first > tu[1] ? "later" : "earlier"} than your usual window`);
    if (f.inCount === false && ou) r.push(f.count === 0 ? "No BM, fewer than usual" : `${plural(f.count, "BM")}, ${f.count > ou[1] ? "more" : "fewer"} than usual`);
    const out = uniq(f.forms.filter((x) => x.within === false).map((x) => x.name));
    if (out.length) r.push(`${andList(out)}, outside your usual forms`);
    return r;
  }
  /* a day's disc: filled for within your usual or shifted, split for could be either, a hairline ring for a gap */
  function disc(x, y, r, role, i, st) {
    if (role === "either") {
      return `<g class="jr-pop" style="--i:${i};--st:${st}"><path class="jr-usual" d="M${f1(x)},${f1(y - r)}A${r},${r} 0 0 0 ${f1(x)},${f1(y + r)}Z"/><path class="jr-shift" d="M${f1(x)},${f1(y - r)}A${r},${r} 0 0 1 ${f1(x)},${f1(y + r)}Z"/></g>`;
    }
    const cls = { usual: "jr-usual", shift: "jr-shift", read: "jr-read", nocount: "jr-open-ink", open: "jr-open" }[role];
    return dot(x, y, role === "open" || role === "nocount" ? r - 0.75 : r, `${cls} jr-pop`, i, st);
  }

  /* ---------------- 4. This week ---------------- */
  function week(D, ctx) {
    const days = D.days[7], e = ctx.esc, learning = !!D.learning;
    const lg = days.filter((f) => f.logged);
    const by = (s) => days.filter((f) => f.state === s);
    let lede;
    if (learning) lede = `You logged ${lg.length} of the last ${days.length} days. Florin learns your usual over your first ${D.learning.of}.`;
    else if (!lg.length) lede = "Nothing is logged this week yet.";
    else {
      const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
      const sh = by("shifted").map((f) => (f.today ? "today" : DOWL[f.dow])), un = by("unsure").map((f) => (f.today ? "today" : DOWL[f.dow]));
      lede = `${by("usual").length} of the ${lg.length} days you logged this week sat ${mk("within your usual", "usual")}.`;
      if (sh.length) lede += ` ${cap1(andList(sh))} ${mk("shifted", "shift")}.`;
      if (un.length) lede += ` ${cap1(andList(un))} could be either.`;
    }
    const left = 74, cw = (W - left) / days.length, cx = (i) => left + cw * i + cw / 2;
    const hasScore = days.some((f) => f.score != null);
    const yDow = 10, yDate = 32, yDisc = 58, rows = [["Timing", 96], ["How often", 116], ["Form", 136], ["Symptoms", 156]], yScore = hasScore ? 184 : 160;
    let b = "";
    const ti = days.findIndex((f) => f.today);
    if (ti >= 0) b += `<rect class="jr-col" x="${f1(cx(ti) - cw / 2 + 1)}" y="0" width="${f1(cw - 2)}" height="${yScore + 10}" rx="8"/>`;
    b += ln(0, 78, W, 78, "jr-grid") + (hasScore ? ln(0, 168, W, 168, "jr-grid") + tx(0, yScore, "SCORE", "") : "");
    b += tx(0, yDisc + 3.5, "THE DAY", "") + rows.map(([l, y]) => tx(0, y + 3.5, up(l), "")).join("");
    const role3 = (ok) => (ok === true ? "usual" : ok === false ? "shift" : "open");
    days.forEach((f, i) => {
      const x = cx(i), st = "50ms";
      b += tx(x, yDow, f.today ? "TODAY" : up(f.dow), f.today ? "tk" : "", "middle");
      b += `<text class="jr-date" x="${f1(x)}" y="${yDate}" text-anchor="middle">${f.date}</text>`;
      const role = stateRole(f.state);
      b += disc(x, yDisc, 11, role, i, st);
      if (!f.logged) return;
      const tRole = learning ? (f.first != null ? "read" : "open") : f.first == null ? "open" : role3(f.inWin);
      const cRole = learning ? (f.count != null ? "read" : "open") : f.count == null ? "open" : role3(f.inCount);
      const fw = f.forms.map((x) => x.within);
      const fRole = !f.forms.length ? "open" : learning ? "read" : fw.includes(false) ? "shift" : fw.includes(null) ? "either" : "usual";
      [tRole, cRole, fRole].forEach((r, k) => { b += r === "open" ? ln(x - 3, rows[k][1], x + 3, rows[k][1], "jr-nil") : disc(x, rows[k][1], 4.5, r, i + k + 2, st); });
      const sMax = f.sym.length ? Math.max(...f.sym.map((s) => s.strength || 0)) : -1;
      b += sMax < 0 ? ln(x - 3, rows[3][1], x + 3, rows[3][1], "jr-nil") : sMax === 0 ? dot(x, rows[3][1], 3.5, "jr-open-ink jr-pop", i + 5, st) : dot(x, rows[3][1], 2 + sMax * 1.4, "jr-sym jr-pop", i + 5, st);
      if (f.score != null) b += tx(x, yScore, f.score, f.today ? "tk" : "", "middle");
    });
    const notes = learning ? [] : days.filter((f) => f.state === "shifted").map((f) => [f.today ? "Today" : f.dow, why(D, f)]).filter((x) => x[1].length);
    const foot = notes.length ? `<ul class="jr-notes" aria-label="Why a day shifted">${notes.slice(0, 3).map(([d, r]) => `<li><b>${e(d)}</b><span>${e(r.join(". "))}.</span></li>`).join("")}${notes.length > 3 ? `<li><b></b><span>${plural(notes.length - 3, "more shifted day")}.</span></li>` : ""}</ul>` : "";
    const roles = rolesIn(days);
    const aria = days.map((f) => `${f.today ? "Today" : DOWL[f.dow]}: ${STATE_WORD[stateRole(f.state)]}${f.score != null ? `, FloraScore ${f.score}` : ""}`).join(". ") + ".";
    return shell("week", {
      kicker: "This week", meta: `${e(days[0].label)} to ${e(days[days.length - 1].label)}`, lede,
      fig: svg(ctx, yScore + 10, aria, b),
      cap: `Each column is a day, each row one part of it: ${roles.map((r) => key(r, STATE_WORD[r])).join(", ")}. Under Symptoms, the dot grows with the strongest one logged.`,
      foot
    });
  }

  /* ---------------- 5. The last month ---------------- */
  function month(D, ctx) {
    const days = D.days[30], learning = !!D.learning;
    const lg = days.filter((f) => f.logged), nu = days.filter((f) => f.state === "usual").length, ns = days.filter((f) => f.state === "shifted").length;
    const lede = learning
      ? `You logged ${lg.length} of your first ${days.length} days. Florin learns your usual over your first ${D.learning.of}.`
      : `${nu} of the ${lg.length} days you logged sat ${mk("within your usual", "usual")}, and ${mk(`${ns} shifted`, "shift")}.`;
    const cw = 37, r = 14, top = 28, rh = 38;
    /* weeks run Monday to Sunday, one row each */
    let row = 0;
    const cells = days.map((f, i) => { if (i && DOWI[f.dow] === 0) row++; return { f, col: DOWI[f.dow], row }; });
    const nRows = row + 1, cy = (rw) => top + rw * rh + r + 2, H = cy(nRows - 1) + r + 8;
    let b = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((d, i) => tx(i * cw + cw / 2, 10, d, "", "middle")).join("");
    b += tx(W, 10, learning ? "LOGGED" : "IN USUAL", "", "end");
    for (let rw = 0; rw < nRows; rw++) {
      if (rw) b += ln(0, cy(rw) - rh / 2, W, cy(rw) - rh / 2, "jr-grid");
      const rc = cells.filter((c) => c.row === rw), rl = rc.filter((c) => c.f.logged);
      const t = learning ? `${rl.length} of ${rc.length}` : `${rc.filter((c) => c.f.state === "usual").length} of ${rl.length}`;
      b += `<text class="tm" x="${W}" y="${f1(cy(rw) + 4)}" text-anchor="end">${t}</text>`;
    }
    cells.forEach(({ f, col, row: rw }, i) => {
      const x = col * cw + cw / 2, y = cy(rw), role = stateRole(f.state);
      b += disc(x, y, r, role, i, "20ms");
      if (role === "either") b += dot(x, y, r - 5, "jr-paperfill");
      b += `<text class="jr-dnum on-${role}" x="${f1(x)}" y="${f1(y + 3.5)}" text-anchor="middle">${f.date}</text>`;
      if (f.today) b += dot(x, y, r + 3.5, "jr-today jr-pop", i + 2, "20ms");
    });
    const roles = rolesIn(days);
    const aria = learning ? `${lg.length} of ${days.length} days logged.` : `${nu} of ${lg.length} logged days within your usual, ${ns} shifted, ${days.length - lg.length} not logged.`;
    return shell("month", {
      kicker: "The last month", meta: lastN(days), lede,
      fig: svg(ctx, H, aria, b),
      cap: `Your days, Monday first: ${roles.map((x) => key(x, STATE_WORD[x])).join(", ")}. Today is ringed; the margin counts each week.`
    });
  }

  /* ---------------- 6. Timing: a beeswarm of first BMs ---------------- */
  function swarm(xs, d) {
    const placed = [], ys = new Array(xs.length);
    xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]).forEach((i) => {
      const x = xs[i];
      const blocks = placed.filter((p) => Math.abs(p.x - x) < d).map((p) => { const h = Math.sqrt(d * d - (p.x - x) ** 2); return [p.y - h, p.y + h]; });
      const free = (y) => blocks.every(([a, b2]) => y <= a + 1e-6 || y >= b2 - 1e-6);
      const c = [0, ...blocks.flat()].filter(free).sort((a, b2) => Math.abs(a) - Math.abs(b2) || b2 - a);
      ys[i] = c[0];
      placed.push({ x, y: c[0] });
    });
    return ys;
  }
  function timing(D, ctx) {
    const days = D.days[30], tu = D.timing.usual, T = ctx.T, e = ctx.esc;
    const mor = days.map((f, i) => ({ f, i })).filter((m) => m.f.first != null);
    if (!mor.length) return shell("timing", { kicker: "Timing", meta: lastN(days), lede: "No first BM is logged yet." });
    const firsts = mor.map((m) => m.f.first);
    const later = tu ? firsts.filter((t) => t > tu[1]).length : 0, earlier = tu ? firsts.filter((t) => t < tu[0]).length : 0;
    let lede;
    if (!tu) lede = `On the ${plural(mor.length, "morning")} you logged, your first BM came between ${T(Math.min(...firsts))} and ${T(Math.max(...firsts))}. Your usual window appears ${whenUsual(D)}.`;
    else {
      lede = `Your first BM came ${mk("in your usual window", "usual")} on ${D.timing.inWin30} of ${D.timing.mornings30} mornings.`;
      const ex = [later ? `${mk("later", "shift")} on ${later}` : "", earlier ? `${mk("earlier", "shift")} on ${earlier}` : ""].filter(Boolean);
      if (ex.length) lede += ` It came ${andList(ex)}.`;
    }
    const tmin = Math.floor(Math.min(...firsts, tu ? tu[0] : 24) - 0.25), tmax = Math.max(tmin + 3, Math.ceil(Math.max(...firsts, tu ? tu[1] : 0) + 0.25));
    const X = lin(tmin, tmax, 10, W - 10), r = 4.6, sp = 2 * r + 1.6;
    const ys = swarm(mor.map((m) => X(m.f.first)), sp);
    const ext = Math.max(r, ...ys.map((y) => Math.abs(y) + r));
    const top = tu ? 30 : 8, cy = top + ext + 6, axY = cy + ext + 8;
    let b = "";
    if (tu) {
      b += `<rect class="jr-band jr-band-in" x="${f1(X(tu[0]))}" y="${top - 4}" width="${f1(X(tu[1]) - X(tu[0]))}" height="${f1(axY - top + 4)}"/>`;
      b += ln(X(tu[0]), top - 4, X(tu[0]), axY, "jr-bandedge") + ln(X(tu[1]), top - 4, X(tu[1]), axY, "jr-bandedge");
      const s = up(`Your usual window, ${D.timing.usualText}`), w = mw(s);
      b += `<path class="jr-bracket" d="M${f1(X(tu[0]))},${top - 8}V${top - 13}H${f1(X(tu[1]))}V${top - 8}"/>`;
      b += tx(fitX((X(tu[0]) + X(tu[1])) / 2, w, "middle"), top - 18, s, "tu", "middle");
    }
    b += ln(0, axY, W, axY, "jr-axis");
    const today = mor.find((m) => m.f.today);
    const avoid = today ? X(today.f.first) : -99;
    for (let h = Math.ceil(tmin); h <= tmax; h++) { b += ln(X(h), axY, X(h), axY + 4, "jr-tick jr-tick--major"); const s = up(T(h, { short: true })); if (Math.abs(X(h) - avoid) > 16) b += tx(fitX(X(h), mw(s), "middle"), axY + 16, s, "t3", "middle"); }
    for (let h = Math.ceil(tmin * 4) / 4; h <= tmax; h += 0.25) if (h % 1) b += ln(X(h), axY, X(h), axY + 2.5, "jr-tick");
    let H = axY + 22;
    if (today) {
      const i = mor.indexOf(today), x = X(today.f.first), y = cy + ys[i];
      b += `<path class="jr-marker" d="M${f1(x)},${f1(axY - 1)}l-4,-6h8z"/>` + ln(x, axY + 4, x, axY + 27, "jr-lead");
      const s = `TODAY, ${up(today.f.firstText)}`;
      b += tx(fitX(x, mw(s), "middle"), axY + 38, s, "tk", "middle");
      H = axY + 42;
    }
    mor.forEach((m, k) => { b += dot(X(m.f.first), cy + ys[k], r, `${m.f.inWin === false ? "jr-shift" : "jr-read"} jr-pop`, m.i); });
    if (today) { const k = mor.indexOf(today); b += dot(X(today.f.first), cy + ys[k], r + 3.5, "jr-today jr-pop", today.i + 1); }
    const aria = tu ? `First BM in your usual window, ${D.timing.usualText}, on ${D.timing.inWin30} of ${D.timing.mornings30} mornings${later ? `, later on ${later}` : ""}${earlier ? `, earlier on ${earlier}` : ""}.${today ? ` Today ${today.f.firstText}.` : ""}` : `First BMs between ${T(Math.min(...firsts))} and ${T(Math.max(...firsts))}.`;
    return shell("timing", {
      kicker: "Timing", meta: lastN(days), lede,
      fig: svg(ctx, H, aria, b),
      cap: `First BM of each morning. Each dot is a morning: ${key("read", tu ? "in your usual window" : "a first BM")}${tu ? `, ${key("shift", "outside it")}` : ""}.${today ? " Today is ringed and marked on the axis." : ""} Mornings without a logged BM aren't drawn.`
    });
  }

  /* ---------------- 7. How often: beads, one per BM, one column per day ---------------- */
  function often(D, ctx) {
    const days = D.days[30], ou = D.often.usual, n = days.length;
    const k = days.filter((f) => f.count != null);
    if (!k.length) return shell("often", { kicker: "How often", meta: lastN(days), lede: "No BMs are logged yet." });
    const inN = k.filter((f) => f.inCount).length;
    const lede = ou
      ? `Your BMs a day sat ${mk("within your usual", "usual")} on ${inN} of the ${k.length} days you logged, ${D.often.avg30} a day on average.`
      : `Over the ${plural(k.length, "day")} you logged, you averaged ${D.often.avg30} BMs a day. Your usual appears ${whenUsual(D)}.`;
    const maxC = Math.max(...k.map((f) => f.count));
    const levels = Math.max(3, maxC, ou ? ou[1] + 1 : 0);
    const left = 20, slot = (W - left) / n, cx = (i) => left + slot * i + slot / 2, pitch = 15, r = Math.min(3.8, slot / 2 - 1.2);
    const top = 30, base = top + levels * pitch + 4, yL = (lv) => base - lv * pitch;
    let b = "";
    for (let lv = 0; lv <= levels; lv++) b += tx(6, yL(lv) + 3.5, lv, "t3", "middle");
    if (ou) {
      b += `<rect class="jr-band jr-band-in" x="${left - 4}" y="${f1(yL(ou[1]) - pitch / 2)}" width="${W - left + 4}" height="${f1((ou[1] - ou[0] + 1) * pitch)}" rx="4"/>`;
      b += tx(left - 4, 10, up(`Your usual, ${D.often.usualText}`), "tu") + leader(left + 2, 14, yL(ou[1]) - pitch / 2, "tu-s");
    }
    const ti = days.findIndex((f) => f.today);
    if (ti >= 0) b += `<rect class="jr-col" x="${f1(cx(ti) - slot / 2)}" y="${top - 4}" width="${f1(slot)}" height="${f1(base - top + 12)}" rx="4"/>`;
    days.forEach((f, i) => { b += ln(cx(i), base + 8, cx(i), base + (f.dow === "Mon" ? 13 : 11), "jr-tick"); });
    b += tx(cx(0) - slot / 2, base + 26, up(days[0].label), "t3") + tx(W, base + 26, "TODAY", "tk", "end");
    let q = 0;
    days.forEach((f, i) => {
      if (f.count == null) return;
      const role = !ou ? "jr-read" : f.inCount ? "jr-read" : "jr-shift";
      if (f.count === 0) { b += dot(cx(i), yL(0), r - 0.6, `${ou ? "jr-open-shift" : "jr-open-ink"} jr-pop`, q++, "14ms"); return; }
      for (let c = 1; c <= f.count; c++) b += dot(cx(i), yL(c), r, `${role} jr-pop`, q++, "14ms");
    });
    if (ti >= 0) {
      const f = days[ti], s = f.count == null ? "TODAY, NOT LOGGED" : f.count === 0 ? "TODAY, NO BM" : `TODAY, ${plural(f.count, "BM")}`.toUpperCase();
      const yTop = f.count ? yL(f.count) - r - 3 : yL(0) - r - 3;
      b += tx(W, 10, s, "tk", "end") + ln(cx(ti), 14, cx(ti), yTop, "jr-lead");
    }
    const aria = ou ? `BMs a day within your usual of ${D.often.usualText} on ${inN} of ${k.length} logged days; average ${D.often.avg30}.` : `Average ${D.often.avg30} BMs a day over ${k.length} logged days.`;
    return shell("often", {
      kicker: "How often", meta: lastN(days), lede,
      fig: svg(ctx, base + 30, aria, b),
      cap: `BMs a day. Each bead is one BM: ${key("read", ou ? "a day within your usual" : "a logged BM")}${ou ? `, ${key("shift", "a day outside it")}, ${key("open-shift", "a day logged with no BM")}` : ""}. A blank column is a day not logged.`
    });
  }

  /* ---------------- 8. Form: a dot histogram in this option's own words ---------------- */
  function form(D, ctx) {
    const Fm = D.form, e = ctx.esc, days = D.days[30], A = D.mode === "A";
    const name = (b) => (A ? `Type ${b.label}` : b.label);
    const all = days.flatMap((f) => f.forms);
    const either = Fm.usual ? all.filter((x) => x.within === null).length : 0;
    if (!Fm.total30) return shell("form", { kicker: "Form", meta: lastN(days), lede: "No BMs are logged yet." });
    let lede;
    if (!Fm.usual) {
      const topB = Fm.bins.slice().sort((a, b) => b.count - a.count)[0];
      lede = `You've logged ${plural(Fm.total30, "BM")} so far, most often ${e(name(topB))}. Your usual forms appear ${whenUsual(D)}.`;
    } else {
      const outB = Fm.bins.filter((b) => b.count && b.inUsual === false), outN = outB.reduce((s, b) => s + b.count, 0);
      lede = `${Fm.within30} of your ${Fm.total30} BMs sat ${mk("within your usual forms", "usual")}, ${e(Fm.usualText)}.`;
      if (outN) lede += ` The other ${outN === 1 ? "one was" : `${outN} were`} ${mk(e(andList(outB.map(name), "or")), "shift")}.`;
      if (either) lede += ` ${either === 1 ? "One" : either} could be either.`;
    }
    const rows = Fm.bins.map((b) => ({ label: name(b), count: b.count, role: b.inUsual === false ? "shift" : "read", inU: !!b.inUsual }));
    if (either) rows.push({ label: "Either", count: either, role: "either", inU: false });
    const left = 84, rowH = 22, top = 6, maxC = Math.max(1, ...rows.map((x) => x.count));
    const pitch = Math.min(10, 156 / maxC), r = Math.min(3.8, pitch / 2 - 0.6);
    const yc = (i) => top + i * rowH + rowH / 2;
    let b = "";
    const ui = rows.map((x, i) => (x.inU ? i : -1)).filter((i) => i >= 0);
    if (ui.length) {
      const y0 = yc(ui[0]) - rowH / 2, y1 = yc(ui[ui.length - 1]) + rowH / 2;
      b += `<rect class="jr-band jr-band-in" x="0" y="${f1(y0)}" width="${W}" height="${f1(y1 - y0)}" rx="8"/>`;
      const mid = (y0 + y1) / 2;
      b += tx(W - 8, mid - 2, "YOUR", "tu", "end") + tx(W - 8, mid + 10, "USUAL", "tu", "end");
    }
    const lastDay = days.slice().reverse().find((f) => f.forms.length), lastF = lastDay ? lastDay.forms[lastDay.forms.length - 1] : null;
    const latestRow = !lastF ? -1 : Fm.usual && lastF.within === null && either ? rows.length - 1 : Fm.bins.findIndex((x) => x.k === lastF.level);
    let q = 0;
    const fst = `${Math.max(6, Math.min(16, Math.round(600 / Math.max(1, rows.reduce((t, x) => t + x.count, 0)))))}ms`;
    rows.forEach((row, i) => {
      const y = yc(i);
      b += `<text class="tl tl--sm" x="8" y="${f1(y + 4)}">${e(row.label)}</text>`;
      if (!row.count) { b += ln(left, y, left + 6, y, "jr-nil") + tx(left + 14, y + 3.5, "0"); return; }
      for (let c = 0; c < row.count; c++) b += row.role === "either" ? disc(left + r + c * pitch, y, r, "either", q++, fst) : dot(left + r + c * pitch, y, r, `${row.role === "shift" ? "jr-shift" : "jr-read"} jr-pop`, q++, fst);
      if (i === latestRow) b += dot(left + r + (row.count - 1) * pitch, y, r + 3, "jr-today jr-pop", q, fst);
      b += tx(left + 2 * r + (row.count - 1) * pitch + (i === latestRow ? 11 : 8), y + 3.5, row.count, row.role === "shift" ? "ts" : "tk");
    });
    const H = top + rows.length * rowH + 6;
    const aria = Fm.usual ? `${Fm.within30} of ${Fm.total30} BMs within your usual forms, ${Fm.usualText}. ${rows.filter((x) => x.count).map((x) => `${x.label} ${x.count}`).join(", ")}.` : `${rows.filter((x) => x.count).map((x) => `${x.label} ${x.count}`).join(", ")}.`;
    return shell("form", {
      kicker: "Form", meta: lastN(days), lede,
      fig: svg(ctx, H, aria, b),
      cap: `Every BM logged, by form. Each dot is one BM: ${key("read", Fm.usual ? "within your usual forms" : "a logged BM")}${Fm.usual ? `, ${key("shift", "outside them")}` : ""}${either ? `, ${key("either", "could be either")}` : ""}.${latestRow >= 0 ? " Your latest BM is ringed." : ""}`
    });
  }

  /* ---------------- 9. Symptoms: one strip per symptom ---------------- */
  function symptoms(D, ctx) {
    const Sy = D.symptoms, e = ctx.esc, days = D.days[30], n = days.length;
    const rows = Sy.rows;
    let lede = !Sy.logged30 ? "No days are logged yet." : !Sy.withSym30 ? `No symptoms came up on the ${Sy.logged30} days you logged.` : rows.length === 1 ? `Symptoms came up on ${Sy.withSym30} of the ${Sy.logged30} days you logged, each time ${e(lower1(rows[0].name))}.` : `Symptoms came up on ${Sy.withSym30} of the ${Sy.logged30} days you logged, ${e(lower1(rows[0].name))} most often, on ${rows[0].days}.`;
    const deck = Sy.usualText ? `Your usual: ${mk(e(lower1(Sy.usualText)), "usual")}.` : "";
    const anyRow = { name: "Any symptom", days: Sy.withSym30, cells: days.map((f) => (!f.logged ? null : f.sym.length ? Math.max(...f.sym.map((s) => s.strength || 0)) : false)), any: true };
    const R = [anyRow, ...rows];
    const left = 98, right = 52, slot = (W - left - right) / n, bx = (i) => left + slot * i + slot / 2;
    const top = 26, rowH = 30, base = (j) => top + j * rowH + rowH - 8;
    const bw = Math.max(2, Math.min(4, slot - 2.4)), hS = [0, 7, 12, 17];
    let b = "";
    /* the key for strength sits on the figure, next to what it explains */
    let kx = left;
    b += tx(kx, 10, "STRENGTH", "");
    kx += mw("STRENGTH") + 8;
    [["MILD", 1], ["MODERATE", 2], ["STRONG", 3]].forEach(([l, s]) => { b += `<rect class="jr-symbar" x="${f1(kx)}" y="${f1(12 - hS[s])}" width="${bw}" height="${hS[s]}" rx="1"/>` + tx(kx + bw + 4, 10, l, ""); kx += bw + 8 + mw(l); });
    R.forEach((row, j) => {
      const y = base(j);
      if (j === 1) b += ln(0, y - rowH + 4, W, y - rowH + 4, "jr-grid");
      b += `<text class="tl tl--sm${row.any ? " tl--b" : ""}" x="0" y="${f1(y)}">${e(row.name)}</text>`;
      row.cells.forEach((c, i) => { if (c !== null) b += ln(bx(i) - slot / 2, y + 0.5, bx(i) + slot / 2, y + 0.5, "jr-base"); });
      b += tx(W, y, plural(row.days, "day").toUpperCase(), row.any ? "tk" : "", "end");
      row.cells.forEach((c, i) => {
        if (c === null) return;
        if (c === false) return;
        if (c === 0) { b += dot(bx(i), y - 4, Math.min(2.6, bw / 2 + 0.6), "jr-open-ink jr-pop", i, "18ms"); return; }
        b += `<rect class="jr-symbar jr-gy" x="${f1(bx(i) - bw / 2)}" y="${f1(y - hS[c])}" width="${bw}" height="${hS[c]}" rx="1" style="--i:${i};--st:16ms"/>`;
      });
    });
    const yA = base(R.length - 1) + 18;
    b += tx(left, yA, up(days[0].label), "t3") + tx(W - right + 4, yA, "TODAY", "tk", "end");
    const ti = days.findIndex((f) => f.today);
    if (ti >= 0) b = `<rect class="jr-col" x="${f1(bx(ti) - slot / 2 - 1)}" y="${top - 4}" width="${f1(slot + 2)}" height="${f1(base(R.length - 1) - top + 10)}" rx="2"/>` + b;
    const aria = `Symptoms on ${Sy.withSym30} of ${Sy.logged30} logged days. ${rows.map((x) => `${x.name} on ${plural(x.days, "day")}`).join(", ")}.`;
    const alarm = `<aside class="jr-alarm"><span class="jr-alarm-k">When to see a clinician</span><p>Blood, black or tar-like stools, a fever, vomiting that won’t stop, weight loss, or waking at night to go: talk to your primary care clinician first.</p></aside>`;
    return shell("symptoms", {
      kicker: "Symptoms", meta: lastN(days), lede, deck,
      fig: svg(ctx, yA + 4, aria, b),
      cap: `One strip per symptom. A bar is a day it came up, its height the strength${R.some((x) => x.cells.includes(0)) ? `; ${key("open", "strength not said")}` : ""}. The line runs under the days you logged, so a break is a day not logged.`,
      foot: alarm
    });
  }

  /* ---------------- 10. The weekly check-in: small multiples, one per question ---------------- */
  function checkin(D, ctx) {
    const C = D.checkin, e = ctx.esc, Q = C.questions;
    const has = Q.some((q) => q.weeks.some((w) => w.v != null));
    const btn = C.due ? `<button type="button" class="jr-btn">Start this week’s check-in</button>` : "";
    if (!has) {
      const rowsH = Q.map((q) => {
        const x = lin(0, q.ticks.length - 1, 6, W - 6);
        const body = ln(6, 14, W - 6, 14, "jr-axis") + q.ticks.map((t, i) => dot(x(i), 14, 4, "jr-open-ink jr-pop", i, "60ms") + tx(fitX(x(i), mw(t, 10, 0), i === 0 ? "start" : i === q.ticks.length - 1 ? "end" : "middle"), 34, e(t), "", i === 0 ? "start" : i === q.ticks.length - 1 ? "end" : "middle")).join("");
        return `<div class="jr-ck-row"><div class="jr-ck-h"><span class="jr-ck-l">${e(q.label)}</span></div>${svg(ctx, 38, null, body)}</div>`;
      }).join("");
      return shell("checkin", {
        kicker: "Weekly check-in", meta: C.due ? "Ready" : "", lede: `Your first weekly check-in ${C.due ? "is ready" : "comes after your first week"}. Each answer will be read against ${mk("your first weeks", "usual")}.`,
        fig: `<div class="jr-ck" role="img" aria-label="${e(`The ${Q.length} check-in questions and their answers.`)}">${rowsH}</div>`,
        cap: `The ${Q.length} questions, each answered on its own scale.`, foot: btn
      });
    }
    const latest = Q[0].latest;
    const same = Q.filter((q) => q.cmp && q.cmp.k === "same"), diff = Q.filter((q) => q.cmp && q.cmp.k !== "same");
    let lede = same.length === Q.length
      ? `On your last check-in, ${e(lower1(latest.label))}, all ${Q.length} answers sat ${mk("about the same as your first weeks", "usual")}.`
      : `On your last check-in, ${e(lower1(latest.label))}, ${same.length} of ${Q.length} answers sat ${mk("about the same as your first weeks", "usual")}.`;
    if (diff.length) lede += ` ${diff.map((q) => `${e(q.label)}: ${mk(e(lower1(q.cmp.text)), "shift")}`).join(". ")}.`;
    const nw = Q[0].weeks.length, PW = W - 92, X = lin(0, nw - 1, 8, PW - 8), Y = (v) => 40 - v * 10;
    const rowsH = Q.map((q, qi) => {
      let body = "";
      body += ln(0, Y(0) + 5, PW, Y(0) + 5, "jr-axis") + ln(0, Y(q.ticks.length - 1) - 5, PW, Y(q.ticks.length - 1) - 5, "jr-grid");
      if (q.band) body += `<rect class="jr-band jr-band-in" x="0" y="${f1(Y(q.band.hi) - 5)}" width="${PW}" height="${f1((q.band.hi - q.band.lo) * 10 + 10)}" rx="4"/>`;
      const runs = [];
      let cur = [];
      q.weeks.forEach((w, i) => { if (w.v == null) { if (cur.length) runs.push(cur); cur = []; } else cur.push([X(i), Y(w.v)]); });
      if (cur.length) runs.push(cur);
      runs.forEach((r) => { if (r.length > 1) body += `<path class="jr-trace jr-draw" pathLength="1" d="${r.map((p, k) => `${k ? "L" : "M"}${f1(p[0])},${f1(p[1])}`).join("")}" style="--d:${200 + qi * 60}ms;--dur:1000ms"/>`; });
      q.weeks.forEach((w, i) => { if (w.v != null) body += dot(X(i), Y(w.v), 3.6, "jr-read jr-pop", i + qi * 3, "30ms"); });
      if (q.latest) {
        const li = q.weeks.indexOf(q.weeks.find((w) => w.w === q.latest.w));
        body += dot(X(li), Y(q.latest.v), 7, "jr-today jr-pop", li + qi * 3 + 1, "30ms");
        const word = up(q.ticks[q.latest.v]);
        body += ln(X(li) + 9, Y(q.latest.v), W - mw(word) - 6, Y(q.latest.v), "jr-lead") + tx(W, Y(q.latest.v) + 3.5, e(word), "tk", "end");
      }
      const chip = q.cmp ? `<span class="jr-tag jr-tag--${q.cmp.k === "same" ? "usual" : "shift"}">${e(q.cmp.text)}</span>` : "";
      return `<div class="jr-ck-row"><div class="jr-ck-h"><span class="jr-ck-l">${e(q.label)}</span>${chip}</div>${svg(ctx, 46, null, body)}</div>`;
    }).join("");
    const axis = svg(ctx, 14, null, tx(X(0), 10, up(shortWeek(Q[0].weeks[0].label)), "t3") + tx(PW - 8, 10, up(shortWeek(Q[0].weeks[nw - 1].label)), "t3", "end"));
    const aria = Q.map((q) => `${q.label}: ${q.latest ? q.opts[q.latest.v] : "not answered"}${q.cmp ? `, ${lower1(q.cmp.text)}` : ""}`).join(". ") + ".";
    return shell("checkin", {
      kicker: "Weekly check-in", meta: `${plural(nw, "week")}`, lede,
      fig: `<div class="jr-ck" role="img" aria-label="${e(aria)}">${rowsH}${axis}</div>`,
      cap: `Each row is one question, week by week, lowest answer at the bottom. The shaded band is the range of your first weeks; your last answer is ringed and named.`,
      foot: btn
    });
  }

  /* ---------------- 11. A possible pattern: two groups of mornings, one dot each ---------------- */
  function rug(D, ctx) {
    const days = D.days[30], n = days.length, left = 104, right = 52, slot = (W - left - right) / n, bx = (i) => left + slot * i + slot / 2, bw = Math.max(2, slot - 2);
    const R = [["Meals logged", (f) => f.meals > 0, "jr-ctx"], ["Shifted days", (f) => f.state === "shifted", "jr-shift"]];
    let b = "";
    R.forEach(([l, on, cls], j) => {
      const y = 8 + j * 28, k = days.filter(on).length;
      b += `<text class="tl tl--sm" x="0" y="${y + 11}">${l}</text>` + ln(left, y + 14.5, W - right + 2, y + 14.5, "jr-axis");
      days.forEach((f, i) => { if (on(f)) b += `<rect class="${cls} jr-gy" x="${f1(bx(i) - bw / 2)}" y="${y}" width="${f1(bw)}" height="14" rx="1" style="--i:${i};--st:16ms"/>`; });
      b += tx(W, y + 11, plural(k, "day").toUpperCase(), "tk", "end");
    });
    b += tx(left, 74, up(days[0].label), "t3") + tx(W - right + 2, 74, "TODAY", "tk", "end");
    const k0 = days.filter((f) => f.meals > 0).length, k1 = days.filter((f) => f.state === "shifted").length;
    return svg(ctx, 78, `Meals logged on ${k0} of ${n} days; ${k1} shifted days.`, b);
  }
  function pattern(D, ctx) {
    const Pt = D.patterns, e = ctx.esc, foot = (x) => (x || "") + note(e(Pt.note));
    if (D.learning) return shell("pattern", { kicker: "A possible pattern", meta: `Day ${D.learning.day} of ${D.learning.of}`, lede: `Florin starts looking for patterns on day ${D.learning.of}, once it knows your usual. You're on day ${D.learning.day}.`, fig: learnFig(D, ctx), cap: learnCap(D), foot: foot() });
    const p = Pt.found[0];
    if (!p) {
      const cta = Pt.sparse ? `<button type="button" class="jr-btn">Start a food check</button>` : "";
      return shell("pattern", {
        kicker: "A possible pattern", meta: Pt.sparse ? "Not enough meals" : "None yet",
        lede: Pt.sparse ? e(Pt.sparseLine) : "Nothing stands out in your logs right now. Florin keeps looking as you log.",
        fig: rug(D, ctx), cap: `${key("ctx", "Meals logged")} and ${key("shift", "shifted days")}, ${lastN(D.days[30]).toLowerCase()}. To compare, Florin needs meals on ordinary days too.`, foot: foot(cta)
      });
    }
    const food = p.food ? lower1(p.food) : "";
    const G = p.kind === "late"
      ? [["After a later dinner", p.occ, p.hit, p.n], ["After an earlier dinner", p.oth, p.oh, p.on]]
      : p.kind === "loose"
        ? [[`The morning after ${food}`, p.occ, p.hit, p.n], ["Other mornings", p.oth, p.oh, p.on]]
        : [[`The day after ${food}`, p.occ, p.hit, p.n], ["Other days", p.oth, p.oh, p.on]];
    const what = p.kind === "late" ? "Later first BM" : p.kind === "loose" ? "Looser first BM" : "Bloating";
    const pitch = 11, r = 4, per = Math.floor((W + pitch - 2 * r) / pitch);
    let y = 0, b = "", q = 0;
    const pst = `${Math.max(4, Math.min(12, Math.round(600 / (p.occ.length + p.oth.length))))}ms`;
    G.forEach(([label, hits, h, nn], gi) => {
      y += 18;
      b += (gi === 0 ? `<rect class="jr-ctx" x="0" y="${y - 11}" width="3" height="14" rx="1"/>` : "") + `<text class="tl" x="${gi === 0 ? 10 : 0}" y="${y}">${e(label)}</text>`;
      b += `<text class="jr-ratio" x="${W}" y="${y + 1}" text-anchor="end">${h} <tspan class="jr-ratio-of">of</tspan> ${nn}</text>`;
      y += 10;
      hits.forEach((hit, i) => {
        const cx = r + (i % per) * pitch, cy = y + r + Math.floor(i / per) * pitch;
        b += dot(cx, cy, hit ? r : r - 0.75, hit ? "jr-shift jr-pop" : "jr-open-ink jr-pop", q++, pst);
        if (gi === 0 && i === hits.length - 1) b += dot(cx, cy, r + 2.5, "jr-today jr-pop", q, pst);
      });
      y += Math.ceil(hits.length / per) * pitch + 8;
    });
    y += 6;
    b += dot(r, y, r, "jr-shift") + tx(r + 10, y + 3.5, up(what)) + dot(r + 24 + mw(what), y, r - 0.75, "jr-open-ink") + tx(r + 34 + mw(what), y + 3.5, "NOT");
    const more = Pt.found.length - 1;
    const aria = `${G[0][0]}: ${what.toLowerCase()} ${G[0][2]} of ${G[0][3]} times. ${G[1][0]}: ${G[1][2]} of ${G[1][3]}.`;
    return shell("pattern", {
      kicker: "A possible pattern", meta: `${e(p.tier)} <svg class="jr-meter" viewBox="0 0 16 12" width="16" height="12" aria-hidden="true">${[6, 9, 12].map((h, i) => `<rect x="${i * 6}" y="${12 - h}" width="4" height="${h}" rx="2"${i < p.tierK ? ' class="on"' : ""}/>`).join("")}</svg>`,
      lede: e(p.line),
      fig: svg(ctx, y + 8, aria, b),
      cap: `${e(p.title)}. Each dot is one time, in the order they happened; the latest is ringed.`,
      foot: foot(more > 0 ? `<p class="jr-more">${plural(more, "more possible pattern")} in Insights</p>` : "")
    });
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "journal",
    name: "Field journal",
    idea: "Each card states its answer in a sentence, then proves it with one figure drawn like a science magazine’s: dots, direct labels and a caption.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }
  });
})();
