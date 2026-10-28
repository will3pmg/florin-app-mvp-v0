/* Look: Easy read. Made for a 70-year-old with reading glasses, a slight tremor and little patience for charts.
   Every card asks one question and answers it the same way: a short title, the number big, one plain sentence in large
   type, and at most one simple picture with its words written on it (a row of day circles, a few thick bars with the
   count written on them, or one big ring). Nothing to decode: a colour always comes with its word, text is Ink, and
   Ink 2 is kept for secondary lines at 18px or more. No small caps and no mono for anything a person has to read.
   Every number comes from D (library/js/looks-data.js); nothing is typed. Every rule in look-easy.css sits under .lk-easy.
   Colours: your usual is Plum on light and Ray on dark, a shift is Gold and always says so in words, "could be
   either" is an outline in Ink 2 and never Gold, a reading (a part, a symptom, a pattern) is --ap-chart. */
(function () {
  const TAU = Math.PI * 2;
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pol = (cx, cy, r, f) => [r1(cx + r * Math.sin(f * TAU)), r1(cy - r * Math.cos(f * TAU))];
  /* an arc, clockwise from share a to share b of a turn, starting at 12 o'clock */
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
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  const lower1 = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DOWL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
  /* the dates a card covers, in the app's one wording (RU.spanText: "Oct 5 to 11", as Today's card, Insights and Your
     days say them); a one-day stretch (day 1) is just today */
  const spanOf = (days) => { const a = days[0], z = days[days.length - 1], RU = window.FLORIN_RUI; return days.length === 1 ? (a.today ? "Today" : a.label) : RU && RU.spanText && a.d != null ? RU.spanText(a.d, z.d) : `${a.label} to ${z.label}`; };

  /* ---------- the parts every card is made of ---------- */
  /* the card: a short title (a heading, so a screen reader can jump card to card) and, when it helps, when it covers */
  const card = (x, cls, label, title, side, inner) => `<article class="ez ${cls}" aria-label="${x.esc(label)}">
      <header class="ez-h"><h3 class="ez-t">${x.esc(title)}</h3>${side ? `<p class="ez-side">${x.esc(side)}</p>` : ""}</header>
      ${inner}
    </article>`;
  /* the lead: the number big with what it counts, then the one plain sentence. A shift's sentence carries a Gold dot,
     so the colour on the picture below always has its word next to it */
  const lead = (x, n, unit, text, dot) => `<div class="ez-lead">
      ${n != null ? `<p class="ez-big"><b class="ez-n">${x.esc(String(n))}</b>${unit ? `<span class="ez-unit">${x.esc(unit)}</span>` : ""}</p>` : ""}
      ${text ? `<p class="ez-ans">${dot ? `<i class="ez-dot is-${dot}" aria-hidden="true"></i>` : ""}${x.esc(text)}</p>` : ""}
    </div>`;
  const body = (x, t, cls) => (t ? `<p class="ez-body${cls ? ` ${cls}` : ""}">${x.esc(t)}</p>` : "");
  const note = (x, t, disc) => `<p class="ez-note"${disc ? " data-disclaimer" : ""}>${x.esc(t)}</p>`;
  const tag = (x, kind, t) => `<span class="ez-tag is-${kind}">${x.esc(t)}</span>`;
  const btn = (x, t) => `<div class="ez-cta"><button type="button" class="ez-btn">${x.esc(t)}</button></div>`;
  const vh = (x, t) => `<span class="ez-vh">${x.esc(t)}</span>`;

  /* a few thick bars, each with its name over it and its count written on it. A bar is the share of the whole it
     counts, from zero. The count sits inside the bar when it fits there, just after it when it fits there, and by the
     name when it fits in neither. Fit is measured on a 224px track, the narrowest drawn: a 320px phone, or a 390px
     phone at 125% text zoom. A count of zero draws no bar at all, only the words */
  const TRACK = 224;
  const bars = (x, rows, cls) => `<ul class="ez-bars${cls ? ` ${cls}` : ""}">${rows.map((r) => {
    const share = r.of ? clamp(r.count / r.of, 0, 1) : 0;
    const need = r.text.length * 11 + 24;
    const inside = share * TRACK >= need, after = !inside && (1 - share) * TRACK >= need;
    return `<li class="ez-row">
        <p class="ez-row-l"><span class="ez-row-name">${x.esc(r.label)}</span>${r.tag ? tag(x, r.tag[0], r.tag[1]) : ""}${r.aside ? `<span class="ez-row-aside">${x.esc(r.aside)}</span>` : ""}${inside || after ? "" : `<b class="ez-row-n">${x.esc(r.text)}</b>`}</p>
        <p class="ez-bar">${r.count ? `<span class="ez-fill is-${r.kind}" style="width:${r1(share * 100)}%">${inside ? `<b>${x.esc(r.text)}</b>` : ""}</span>` : ""}${after ? `<b class="ez-out">${x.esc(r.text)}</b>` : ""}</p>
      </li>`;
  }).join("")}</ul>`;

  /* dates as the day marks show them, the month said once: "Oct 2, 9 and 14", "Sep 29 and Oct 3" */
  const dates = (ds) => { let mon = null; return andList(ds.map((d) => { const [m, n] = d.label.split(" "); const t = m === mon ? n : d.label; mon = m; return t; })); };

  /* ---------- FloraScore: one big ring, the number inside it, your usual drawn on its outer edge ---------- */
  function score(D, x) {
    const S = D.score, esc = x.esc;
    const DISC = "FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.";
    const C = 120, R = 90, SW = 22, RU = 114;
    if (!S.usual) {
      const L = S.learning || { day: D.learning ? D.learning.day : 0, of: D.learning ? D.learning.of : 14 };
      /* one segment per day until Florin knows your usual */
      const g = 6 / (TAU * R);
      const segs = Array.from({ length: L.of }, (_, i) => `<path class="ez-seg${i < L.day ? " is-on" : ""}" stroke-width="${SW}" d="${arc(C, C, R, i / L.of + g / 2, (i + 1) / L.of - g / 2)}"/>`).join("");
      return card(x, "ez-score", `FloraScore, day ${L.day} of ${L.of}`, "FloraScore", D.todayLabel, `
        <div class="ez-ring">
          <svg class="ez-svg" viewBox="0 0 240 240" role="img" aria-label="${esc(`Day ${L.day} of ${L.of}. Florin is still learning your usual.`)}">${segs}</svg>
          <div class="ez-ring-c" aria-hidden="true"><span class="ez-ring-k">Day</span><b class="ez-ring-n">${L.day}</b><span class="ez-ring-k">of ${L.of}</span></div>
        </div>
        ${lead(x, null, null, `Your FloraScore starts on day ${L.of}.`)}
        ${body(x, "Florin is learning your usual first.")}
        ${note(x, DISC, true)}`);
    }
    const v = S.value, u = S.usual;
    /* FloraScore is a reading, never a day's state: its end mark is the reading colour inside your usual range or not,
       never Gold, and the words say where it sits (claude/Florin data viz.md, section 1) */
    const shift = false;
    const ends = [u[0], u[1]].map((val) => { const [a, b] = pol(C, C, RU - 9, val / 100), [c2, d2] = pol(C, C, RU + 9, val / 100); return `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}"/>`; }).join("");
    const [ex, ey] = v != null ? pol(C, C, R, v / 100) : [0, 0];
    const aria = v == null ? `No FloraScore today: ${lower1(S.why)} Your usual range is ${u[0]} to ${u[1]}.` : S.flag ? `FloraScore today ${v}. ${S.relation}: a log is noted for a clinician.` : `FloraScore today ${v}. ${S.relation}, ${u[0]} to ${u[1]}.`;
    const ring = `<div class="ez-ring">
        <svg class="ez-svg" viewBox="0 0 240 240" role="img" aria-label="${esc(aria)}">
          <circle class="ez-ring-trk" cx="${C}" cy="${C}" r="${R}" stroke-width="${SW}"/>
          <circle class="ez-ring-utrk" cx="${C}" cy="${C}" r="${RU}"/>
          <path class="ez-ring-uband" d="${arc(C, C, RU, u[0] / 100, u[1] / 100)}"/>
          <g class="ez-ring-uend">${ends}</g>
          ${v != null ? `<path class="ez-ring-arc" stroke-width="${SW}" d="${arc(C, C, R, 0, clamp(v, 0, 100) / 100)}"/><circle class="ez-ring-end${shift ? " is-shift" : ""}" cx="${ex}" cy="${ey}" r="14"/>${shift ? `<circle class="ez-ring-edge" cx="${ex}" cy="${ey}" r="11"/>` : ""}` : ""}
        </svg>
        <div class="ez-ring-c" aria-hidden="true">
          ${v != null ? `<b class="ez-ring-n">${v}</b>` : `<b class="ez-ring-n ez-ring-n--sm">Not yet</b>`}
          <span class="ez-ring-u">Your usual<br>${u[0]} to ${u[1]}</span>
        </div>
      </div>`;
    const rel = v != null ? `${S.relation}.` : "No FloraScore today.";
    return card(x, "ez-score", `FloraScore today${v != null ? `, ${v}` : ""}`, "FloraScore", D.todayLabel, `
      ${ring}
      ${lead(x, null, null, rel)}
      ${v == null ? body(x, S.why) : ""}
      ${note(x, DISC, true)}`);
  }

  /* ---------- the four parts: four thick bars, each out of 100, each said against last week in words ---------- */
  function parts(D, x) {
    const S = D.score, P = S.parts || [];
    const DISC = "FloraScore isn't a medical score, and a lower number isn't a diagnosis.";
    if (!P.length) {
      return card(x, "ez-parts", "The four parts of FloraScore, not started yet", "What makes up the score", null, `
        ${lead(x, null, null, "The four parts start with your FloraScore.")}
        ${body(x, `Timing, how often, form and comfort.${D.learning ? ` Florin is learning your usual first: day ${D.learning.day} of ${D.learning.of}.` : ""}`)}`);
    }
    /* a part's change is in whole FloraScore points (L.scoreMoved's pts): what it added to this week's average, or took
       from it, against last week's. The four add up to the change in the score, so each is said as a move, never as a
       part's own 0 to 100 */
    const pts = (p) => Math.abs(p.pts);
    const word = (p) => (!p.pts ? "Didn't move" : p.pts > 0 ? `Added ${plural(pts(p), "point")}` : `Took off ${plural(pts(p), "point")}`);
    const most = Math.max(...P.map(pts)), tops = P.filter((p) => most && pts(p) === most), moved = tops[0] || P[0];
    const still = !most;
    /* a tie names every part that moved most, when they moved the same way */
    const same = tops.length > 1 && tops.every((p) => Math.sign(p.pts) === Math.sign(moved.pts));
    const top = Math.max(1, ...P.map(pts));
    const rows = P.map((p) => ({ label: p.label, tag: ["plain", word(p)], count: pts(p), of: top, kind: "read", text: p.pts ? `${p.pts > 0 ? "+" : "−"}${pts(p)}` : "0" }));
    const d = S.delta;
    /* the big number is the week's change, the number that matters (fix-viz, Oct 28: it was the largest part's 2 beside a
       change of 5 in small type); the part that moved most is said under it, every part named on a tie */
    const topSay = still ? "No part moved it."
      : same ? `${andList(tops.map((p) => p.label))} ${moved.pts > 0 ? "added" : "took off"} ${plural(pts(moved), "point")} each, the most of the four.`
      : tops.length > 1 ? `${andList(tops.map((p) => `${p.label} ${p.pts > 0 ? "added" : "took off"} ${plural(pts(p), "point")}`))}, the most of the four.`
      : `${moved.label} ${moved.pts > 0 ? "added" : "took off"} ${plural(pts(moved), "point")}, the most of the four.`;
    return card(x, "ez-parts", "What moved FloraScore this week, part by part", "What moved the score", "This week", `
      ${d ? lead(x, Math.abs(d), `${Math.abs(d) === 1 ? "point" : "points"} ${d > 0 ? "up" : "down"} on average this week`, topSay)
        : lead(x, null, null, d === 0 ? `FloraScore is where it was last week, on average. ${topSay}` : topSay)}
      ${bars(x, rows)}
      ${d != null ? body(x, `${S.weekAvg} on average this week, ${S.lastWeekAvg} last week.`) : ""}
      ${note(x, DISC, true)}`);
  }

  /* ---------- FloraScore over 30 days: three thick bars, within, above and below your usual range ---------- */
  function trend(D, x) {
    const S = D.score;
    if (!S.usual || !S.series || !S.series[30].some((s) => s.value != null)) {
      return card(x, "ez-trend", "FloraScore over 30 days, not started yet", "FloraScore over 30 days", null, `
        ${lead(x, null, null, "Your 30-day view starts with your FloraScore.")}
        ${D.learning ? body(x, `Florin is learning your usual: day ${D.learning.day} of ${D.learning.of}.`) : ""}`);
    }
    const ser = S.series[30], u = S.usual;
    /* a day with no logs is a gap, even when the blended score carries a value: it is left out, never a zero */
    const byD = {};
    D.days[30].forEach((d) => (byD[d.d] = d));
    const vals = ser.map((s) => { const d = byD[s.d]; return s.value == null || (d && !d.logged && !d.pending) ? null : s.value; });
    const noScore = vals.filter((v, i) => v == null && !(byD[ser[i].d] || {}).pending).length;
    /* a flagged today keeps its score, read against nothing: in none of the counts, and said */
    const nums = vals.filter((v, i) => v != null && !ser[i].flag), fl = ser.some((s) => s.flag);
    const within = nums.filter((v) => v >= u[0] && v <= u[1]).length, above = nums.filter((v) => v > u[1]).length, below = nums.filter((v) => v < u[0]).length;
    const n = nums.length;
    /* "most" only when it is a clear majority, two days in three; just over half is said as more than half */
    /* the score's own words, never a day's: "in its usual range", so it never reads like the days within your usual */
    const ans = within === n ? "It sat in its usual range every day it had a score." : `It was above its usual range on ${plural(above, "day")} and below it on ${plural(below, "day")}.`;
    const rows = [
      { label: `In its usual range, ${u[0]} to ${u[1]}`, count: within, of: n, kind: "read", text: plural(within, "day") },
      { label: "Above its usual range", count: above, of: n, kind: "read", text: plural(above, "day") },
      { label: "Below its usual range", count: below, of: n, kind: "read", text: plural(below, "day") }
    ];
    return card(x, "ez-trend", "FloraScore over 30 days", "FloraScore over 30 days", "Last 30 days", `
      ${lead(x, within, `of ${plural(n, "day")} with FloraScore in its usual range`, ans)}
      ${bars(x, rows)}
      ${noScore ? body(x, `No FloraScore on ${plural(noScore, "day")}. A day without logs is left out.`) : ""}
      ${fl && D.flagLine ? body(x, D.flagLine) : ""}`);
  }

  /* ---------- the days: the app's one day mark (RU.dayMark), at 32px ----------
     A day looks the same here as on Today's card, in History and in Your days (claude/Florin data viz.md, section 1):
     a Plum circle within your usual (Ray on dark), a Gold circle outside it (named in a line, always), an Ink 3 circle
     for a day logged but not counted, the date alone for a day with nothing logged, a Teal ring with the info glyph for
     a flagged today, today ringed with Today under it, and one Teal square under a day with symptoms. Each line under
     the days starts with its mark (RU.dayKey), so the lines are the legend */
  const RUI = () => window.FLORIN_RUI || {};
  const mark = (d, o) => { const R = RUI(); return R.dayMark && d.facts ? R.dayMark(d.facts, Object.assign({ why: d.why, lg: true }, o)) : `<span class="ez-c">${d.date}</span>`; };
  const keyOf = (k) => { const R = RUI(); return R.dayKey ? R.dayKey(k) : ""; };
  const lineLi = (x, k, t) => `<li>${keyOf(k)}<span>${x.esc(t)}</span></li>`;
  const named = (d) => (d.today ? "today" : DOWL[d.dow] || d.dow);
  /* the lines for a stretch of days, in the week card's order (section 3, as RU.weekCard words them): days outside your
     usual first, at most three lines, then days not counted, then the days with nothing logged together, then a flagged
     today, then the one symptom sentence. byDate names a month's days by their dates instead of one line each */
  const dayLines = (D, x, days, n) => {
    const out = [], learning = !!D.learning, T = D.tally[n];
    const sh = days.filter((d) => d.logged && d.state === "shifted"), none = days.filter((d) => !d.logged && !d.pending);
    if (learning) {
      if (days.some((d) => d.logged)) out.push(lineLi(x, "quiet", `Days show as logged until Florin knows your usual, on day ${D.learning.of}.`));
    } else if (n === 7) {
      const own = sh.length > 3 ? sh.slice(0, 2) : sh;
      own.forEach((d) => out.push(lineLi(x, "shift", d.why ? d.why.line : `${cap(named(d))}: outside your usual.`)));
      if (sh.length > 3) out.push(lineLi(x, "shift", `Also outside your usual: ${andList(sh.slice(2).map(named))}.`));
      days.filter((d) => d.logged && (d.state === "unsure" || d.state === "nocount")).forEach((d) => out.push(lineLi(x, "quiet", d.why ? d.why.line : `${cap(named(d))} isn't counted.`)));
    } else {
      if (sh.length) out.push(lineLi(x, "shift", `Outside your usual on ${plural(sh.length, "day")}${sh.length <= 6 ? `: ${dates(sh)}` : ""}.`));
      /* the days not counted, by count and why (L.tally's own words), the flag said once on its own line below */
      const left = T && T.left ? T.left.replace(D.flagLine || "\u0000", "").trim() : "";
      if (left) out.push(lineLi(x, "quiet", left));
    }
    if (none.length) out.push(lineLi(x, "none", n === 7 ? `Nothing logged on ${andList(none.map((d) => (d.today ? "Today" : DOWL[d.dow] || d.dow)))}.` : `Nothing logged on ${plural(none.length, "day")}.`));
    if (!learning && T && T.flag && D.flagLine) out.push(lineLi(x, "flag", D.flagLine));
    const sl = D.symLine && D.symLine[n];
    if (sl) out.push(lineLi(x, "sym", sl));
    return out.length ? `<ul class="ez-lines">${out.join("")}</ul>` : "";
  };

  /* ---------- the last 7 days: a row of seven day marks ending on today, then a line for each day not within ---------- */
  function week(D, x) {
    const days = D.days[7];
    const learning = !!D.learning;
    const logged = days.filter((d) => d.logged), T = D.tally[7];
    /* days before the person started sit at the left as their dates alone, never named */
    const R = RUI(), d0 = days.length ? days[days.length - 1].d - 6 : 0;
    const pre = R.dayMark ? Array.from({ length: Math.max(0, 7 - days.length) }, (_, i) => `<li>${R.dayMark({ d: d0 + i, today: false }, { before: true, dow: true, lg: true })}</li>`).join("") : "";
    const row = `<ol class="ap-days ez-days" aria-label="${x.esc(`Your last 7 days, ${spanOf(days)}`)}">${pre}${days.map((d) => `<li>${mark(d, { dow: true })}</li>`).join("")}</ol>`;
    /* the answer: the number big, as every Easy read card leads; or, on a screen that already carries one big number
       (the Easy version's Today, under FloraScore), the same answer as a line that starts with its mark (x.answerLine) */
    const ansLine = (k, n, rest) => `<div class="ez-lead"><p class="ez-ans ez-ans--line">${keyOf(k)}<span><b>${x.esc(n)}</b> ${x.esc(rest)}</span></p></div>`;
    const big = !logged.length ? lead(x, null, null, learning ? "Nothing logged yet." : "Nothing logged in the last 7 days.")
      : learning ? (x.answerLine ? ansLine("quiet", plural(logged.length, "day"), "logged") : lead(x, logged.length, `of ${plural(days.length, "day")} logged`, null))
      : T.known ? (x.answerLine ? ansLine("usual", `${T.within} of ${plural(T.known, "day")}`, "within your usual") : lead(x, T.within, `of ${plural(T.known, "day")} within your usual`, null))
      : lead(x, null, null, "None of the last 7 days can be read against your usual.");
    return card(x, "ez-week", "Your last 7 days at a glance", "Your last 7 days", spanOf(days), `
      ${big}
      ${logged.length ? `<div class="ez-fit">${row}</div>` : body(x, "Your days show here as you log them.")}
      ${dayLines(D, x, days, 7)}`);
  }

  /* ---------- the last 30 days: the same day marks as a wall calendar, then the lines ---------- */
  function month(D, x) {
    const days = D.days[30];
    const learning = !!D.learning;
    const off = Math.max(0, DOWS.indexOf(days[0].dow));
    const cells = Array(off).fill(null).concat(days);
    const logged = days.filter((d) => d.logged).length, T = D.tally[30];
    const grid = cells.map((d) => (!d ? `<li class="ez-md is-pad" aria-hidden="true"></li>` : `<li class="ez-md">${mark(d, { todayWord: false })}</li>`)).join("");
    const big = !logged ? lead(x, null, null, learning ? "Nothing logged yet." : "No days logged yet.")
      : learning ? lead(x, logged, `of ${plural(days.length, "day")} logged`, null)
      : T.known ? lead(x, T.within, `of ${plural(T.known, "day")} within your usual`, null)
      : lead(x, null, null, "No day in the last 30 days can be read against your usual yet.");
    return card(x, "ez-month", learning ? "Since you started, at a glance" : "The last 30 days at a glance", learning ? "Since you started" : "The last 30 days", spanOf(days), `
      ${big}
      <div class="ez-cal ez-fit">
        <ol class="ez-cal-h" aria-hidden="true">${DOWS.map((w) => `<li>${w.slice(0, 2)}</li>`).join("")}</ol>
        <ol class="ez-cal-g">${grid}</ol>
      </div>
      ${dayLines(D, x, days, 30)}`);
  }

  /* ---------- timing: one thick time bar, your usual window drawn on it and named under it, the morning marked ---------- */
  function timing(D, x) {
    const esc = x.esc, days = D.days[30], tm = D.timing, u = tm.usual;
    const pts = days.filter((d) => d.first != null);
    if (!pts.length) {
      return card(x, "ez-timing", "Timing of the first BM", "Timing", null, `
        ${lead(x, null, null, "No first BM logged yet.")}
        ${body(x, "Your first BM each morning will show here.")}`);
    }
    const nw = pts[pts.length - 1];
    const later = u && nw.inWin === false && nw.first > u[1];
    /* a flagged today: its time, and why it isn't read */
    const where = !u ? null : nw.flag ? D.flagLine || null : nw.inWin === true ? "Inside your usual window." : nw.inWin === false ? (later ? "Later than your usual window." : "Earlier than your usual window.") : null;
    const out = u && nw.inWin === false;
    /* the bar runs from the hour before the window to the hour after, at least two hours, so the window is drawn big
       and the morning always sits inside the bar. It is drawn only once there is a usual window: a lone dot on a bare
       track says nothing, and the big time already answers the card */
    let lo = Math.floor(Math.min(nw.first, u ? u[0] : nw.first) - 0.25), hi = Math.ceil(Math.max(nw.first, u ? u[1] : nw.first) + 0.25);
    if (hi - lo < 2) { const pad = 2 - (hi - lo); lo -= Math.floor(pad / 2); hi += Math.ceil(pad / 2); }
    const pos = (t) => r1(((t - lo) / (hi - lo)) * 100);
    const mText = `${nw.today ? "Today" : `${nw.dow} ${nw.label}`}, ${nw.firstText}`;
    const aria = `${nw.today ? "Today" : `${DOWL[nw.dow]}, ${nw.label}`}: first BM at ${nw.firstText}.${u ? ` Your usual window is ${tm.usualText}. ${where || ""}` : ""}`;
    const bar = `<div class="ez-tl" role="img" aria-label="${esc(aria)}">
        <p class="ez-tl-l is-mark" style="--x:${pos(nw.first)}" aria-hidden="true">${esc(mText)}</p>
        <div class="ez-tl-trk" aria-hidden="true">
          ${u ? `<span class="ez-tl-band" style="left:${pos(u[0])}%;width:${r1(pos(u[1]) - pos(u[0]))}%"></span>` : ""}
          <span class="ez-tl-mark${out ? " is-shift" : ""}" style="left:${pos(nw.first)}%"></span>
        </div>
        ${u ? `<p class="ez-tl-l is-band" style="--x:${r1((pos(u[0]) + pos(u[1])) / 2)}" aria-hidden="true">${esc(`Your usual, ${tm.usualText}`)}</p>` : ""}
      </div>`;
    return card(x, "ez-timing", "Timing of the first BM", "Timing", nw.today ? "Today" : `${DOWL[nw.dow]}, ${nw.label}`, `
      ${lead(x, nw.firstText, nw.today ? "your first BM today" : "your latest first BM", u ? where : `Florin learns your usual window by day ${D.learning ? D.learning.of : 14}.`, out ? "shift" : null)}
      ${u ? bar : ""}
      ${body(x, u ? `${tm.inWin30} of ${tm.mornings30} mornings in the last 30 days came in your window.` : `${plural(pts.length, "morning")} logged so far.`)}`);
  }

  /* ---------- how often: a thick bar per count, your usual ones named ---------- */
  function often(D, x) {
    const days = D.days[30], o = D.often, u = o.usual;
    /* the days read: a flagged today is noted for a clinician, in none of the counts, and said */
    const known = days.filter((d) => d.count != null && !d.flag), fl = days.some((d) => d.flag && d.count != null);
    const gaps = days.filter((d) => d.count == null && !d.pending).length;
    if (!known.length) {
      return card(x, "ez-often", "How often", "How often", null, `${lead(x, null, null, "Nothing logged yet.")}${body(x, "How many BMs you have each day will show here.")}`);
    }
    /* one bar per count up to one past the top of your usual, then "or more": the last bar is always outside your
       usual, and the days within it come from the model's own reading of each day (inCount), never a rule of ours */
    const top = u ? Math.max(3, u[1] + 1) : 3;
    const inU = (k) => !!u && k >= u[0] && k <= u[1];
    const rows = Array.from({ length: top + 1 }, (_, k) => [k, k === top ? `${top} or more BMs` : k === 0 ? "No BM" : plural(k, "BM")]).map(([k, label]) => {
      const c = known.filter((d) => (k < top ? d.count === k : d.count >= top)).length;
      const inside = k < top && inU(k);
      return { label, count: c, of: known.length, kind: u ? (inside ? "usual" : "shift") : "read", tag: !u ? null : inside ? ["usual", "Your usual"] : c ? ["shift", "Outside your usual"] : null, text: plural(c, "day") };
    });
    const inRange = u ? known.filter((d) => d.inCount).length : null;
    const outN = u ? known.length - inRange : 0;
    return card(x, "ez-often", "How often", "How often", D.learning ? "So far" : "Last 30 days", `
      ${u ? lead(x, inRange, `of ${plural(known.length, "day")} with a usual count`, outN ? `A count outside your usual on ${plural(outN, "day")}.` : "Every day you logged had a usual count.", outN ? "shift" : null)
        : lead(x, known.length, known.length === 1 ? "day logged so far" : "days logged so far", `Florin learns your usual count by day ${D.learning ? D.learning.of : 14}.`)}
      ${bars(x, rows)}
      ${u ? body(x, `Your usual is ${o.usualText}.`) : ""}
      ${gaps ? body(x, `Nothing logged on ${plural(gaps, "day")}. Those days are left out.`) : ""}
      ${fl && D.flagLine ? body(x, D.flagLine) : ""}`);
  }

  /* ---------- form: a thick bar for each form you logged, firmer at the top, each said against your usual ---------- */
  function form(D, x) {
    const F = D.form, u = F.usual, total = F.total30, mode = D.mode;
    const nameOf = (label) => (mode === "A" ? `Type ${label}` : label);
    const side = (steps) => (Math.max(...steps) < u[0] ? ["shift", "Firmer than your usual"] : ["shift", "Looser than your usual"]);
    const rows = F.bins.filter((b) => b.count).map((b) => ({
      at: b.k, label: nameOf(b.label), count: b.count, of: total, text: plural(b.count, "BM"),
      kind: u ? (b.inUsual ? "usual" : "shift") : "read", tag: u ? (b.inUsual ? ["usual", "Your usual"] : side([b.k])) : null
    })).concat((F.spans || []).map((s) => ({
      /* a word logged in option B covers two steps here: it sits between them, and could be either when its steps sit
         on both sides of your usual. That is never a shift, so never Gold */
      at: (s.steps[0] + s.steps[s.steps.length - 1]) / 2, label: s.label, count: s.count, of: total, text: plural(s.count, "BM"),
      kind: !u ? "read" : s.within === true ? "usual" : s.within === false ? "shift" : "either",
      tag: !u ? null : s.within === true ? ["usual", "Your usual"] : s.within === false ? side(s.steps) : ["either", "Could be either"]
    }))).sort((a, b) => a.at - b.at);
    const firmer = F.firmer || 0, looser = F.looser || 0, either = F.either || 0;
    const was = (k) => (k === 1 ? "was" : "were");
    const ans = !total ? (D.learning ? "No BMs logged so far." : "No BMs logged in the last 30 days.")
      : !u ? `Florin learns your usual forms by day ${D.learning ? D.learning.of : 14}.`
      : firmer && looser ? `${firmer} ${was(firmer)} firmer and ${looser} ${was(looser)} looser than your usual.`
      : firmer ? `${firmer} ${was(firmer)} firmer than your usual.`
      : looser ? `${looser} ${was(looser)} looser than your usual.`
      : either ? `${either} could be either. The rest sat within your usual.`
      : "Every BM sat within your usual forms.";
    return card(x, "ez-form", "Form", "Form", D.learning ? "So far" : "Last 30 days", `
      ${u && total > either ? lead(x, F.within30, `of ${plural(total - either, "BM")} within your usual forms`, ans, firmer || looser ? "shift" : null) : total ? lead(x, total, total === 1 ? "BM logged so far" : "BMs logged so far", ans) : lead(x, null, null, ans)}
      ${rows.length ? bars(x, rows) : ""}
      ${u ? body(x, `Your usual forms: ${F.usualText}.`) : ""}
      ${u && either && (firmer || looser) ? body(x, `${either} could be either: a word that covers forms on both sides of your usual.`) : ""}`);
  }

  /* ---------- symptoms: a thick bar for each symptom, the days written on it, the strength said beside it ---------- */
  function symptoms(D, x) {
    const S = D.symptoms, rows = S.rows;
    const WORDS = ["mild", "moderate", "strong"];
    /* the strengths in words. A day logged without a strength is never read as mild, so it is named too */
    const most = (row) => {
      const s = row.cells.filter((cl) => cl > 0), unsaid = row.cells.filter((cl) => cl === 0).length;
      if (!s.length) return "strength not said";
      const k = [1, 2, 3].map((v) => s.filter((cl) => cl === v).length);
      const top = Math.max(...k), kinds = k.filter(Boolean).length;
      const counts = () => [...k.map((c, i) => c && `${c} ${WORDS[i]}`), unsaid && `${unsaid} not said`].filter(Boolean).join(", ");
      if (unsaid) return counts();
      if (s.length === 1) return WORDS[s[0] - 1];
      if (kinds === 1) return `all ${WORDS[s[0] - 1]}`;
      return k.filter((c) => c === top).length === 1 ? `mostly ${WORDS[k.indexOf(top)]}` : counts();
    };
    const shown = rows.slice(0, 5), rest = rows.slice(5);
    const top = rows[0];
    const ans = rows.length ? `${top.name} came up most, on ${plural(top.days, "day")}.` : !S.logged30 ? "Nothing logged yet." : `No symptoms on the ${plural(S.logged30, "day")} you logged.`;
    const usual = S.usualText ? lower1(S.usualText) : null;
    return card(x, "ez-symptoms", "Symptoms", "Symptoms", D.learning ? "So far" : "Last 30 days", `
      ${S.logged30 ? lead(x, S.withSym30, `of ${plural(S.logged30, "logged day")} with a symptom`, ans) : lead(x, null, null, ans)}
      ${shown.length ? bars(x, shown.map((r) => ({ label: r.name, aside: most(r), count: r.days, of: S.logged30, kind: "read", text: plural(r.days, "day") }))) : ""}
      ${rest.length ? body(x, `Also logged: ${andList(rest.map((r) => `${lower1(r.name)} on ${plural(r.days, "day")}`))}.`) : ""}
      ${usual ? body(x, `Your usual: symptoms ${usual === "rarely" ? "rarely" : `on ${usual}`}.`) : ""}
      <p class="ez-care">A symptom that is new, strong or won't settle is worth raising with your clinician.</p>`);
  }

  /* ---------- weekly check-in: the four answers in words, each said against your first weeks ---------- */
  /* a range of answers in one plain phrase: "1 to 4 days", "Up to 2 days", "A little to some" */
  const answerSpan = (opts, lo, hi) => {
    if (lo === hi) return opts[lo];
    const a = opts[lo], b = opts[hi], na = a.match(/\d+/), nb = b.match(/(\d+)(?!.*\d)/);
    if (!nb || !/days?$/.test(b)) return `${a} to ${lower1(b)}`;
    const from = na ? +na[0] : 0;
    if (/or more/.test(b)) return from ? `${from} or more days` : "Any number of days";
    return from ? `${from} to ${nb[1]} days` : `Up to ${nb[1]} days`;
  };
  function checkin(D, x) {
    const esc = x.esc, CK = D.checkin, Q = CK.questions;
    const started = Q.some((q) => q.latest);
    const cta = CK.due ? btn(x, "Answer this week's check-in") : "";
    if (!started) {
      return card(x, "ez-checkin", "Weekly check-in, not started yet", "Weekly check-in", null, `
        ${lead(x, null, null, "Four short questions, once a week.")}
        ${body(x, "Florin compares each week with your first weeks.")}
        ${cta}`);
    }
    const rows = Q.map((q) => {
      const L = q.latest, b = q.band;
      const shift = q.cmp && q.cmp.k !== "same";
      const first = b ? answerSpan(q.opts, b.lo, b.hi) : null;
      return `<li class="ez-ck">
          <p class="ez-ck-q">${esc(q.label)}</p>
          <p class="ez-ck-a"><b>${esc(L ? q.opts[L.v] : "Not answered")}</b>${q.cmp ? tag(x, shift ? "shift" : "usual", q.cmp.text) : ""}</p>
          ${first ? `<p class="ez-ck-f">${esc(`Your first weeks: ${first}`)}</p>` : ""}
        </li>`;
    }).join("");
    const answered = Q.filter((q) => q.cmp).length, same = Q.filter((q) => q.cmp && q.cmp.k === "same").length;
    const diff = Q.filter((q) => q.cmp && q.cmp.k !== "same");
    const latest = (Q.find((q) => q.latest) || {}).latest;
    /* the sentence names what moved, so it never repeats the number above it */
    const names = cap(andList(diff.map((q) => lower1(q.label))));
    const ans = !answered ? "Florin compares your answers once it has your first weeks."
      : !diff.length ? "Every answer is about the same as your first weeks."
      : diff.length === 1 ? `${diff[0].label}: ${lower1(diff[0].cmp.text)}.`
      : same * 2 < answered ? `${names} ${diff.length === answered ? "all " : ""}moved.` : `${names} moved from your first weeks.`;
    /* the number counts whichever is more: the answers like your first weeks, or the ones that moved. A big 0 never leads */
    const big = !answered ? lead(x, null, null, ans)
      : same * 2 < answered ? lead(x, diff.length, `of ${plural(answered, "answer")} moved from your first weeks`, ans, "shift")
      : lead(x, same, `of ${plural(answered, "answer")} like your first weeks`, ans, diff.length ? "shift" : null);
    return card(x, "ez-checkin", "Weekly check-in", "Weekly check-in", latest ? latest.label : null, `
      ${big}
      <ul class="ez-cks">${rows}</ul>
      ${cta}`);
  }

  /* ---------- a possible pattern: two thick bars, after the thing you logged and on other days ---------- */
  function pattern(D, x) {
    const PT = D.patterns, p = PT.found[0];
    const pnote = note(x, PT.note);
    if (!p) {
      if (D.learning) {
        return card(x, "ez-pattern", "Possible patterns, not started yet", "Possible patterns", null, `
          ${lead(x, null, null, "Patterns come later.")}
          ${body(x, `Florin starts looking once it knows your usual, from day ${D.learning.of}. You're on day ${D.learning.day}.`)}
          ${pnote}`);
      }
      if (PT.sparse) {
        const m = PT.meals, cta = btn(x, "Start a food check");
        const check = `A ${PT.foodCheckDays}-day food check would let Florin look.`;
        if (!m.days) {
          /* no meal logs at all is a choice, not a shortfall: no number and no zero */
          return card(x, "ez-pattern", "Possible patterns: food, when you want it", "Possible patterns", "Meals", `
            ${lead(x, null, null, "Florin can look at food when you want it to.")}
            ${body(x, `Log meals for ${PT.foodCheckDays} days and Florin compares them with the days after.`)}
            ${cta}
            ${pnote}`);
        }
        const rough = m.withSymptom * 2 > m.days;
        return card(x, "ez-pattern", "Possible patterns: not enough days to compare", "Possible patterns", `Last ${m.window} days`, `
          ${lead(x, m.days, `of ${plural(m.logged, "day")} you logged include a meal`, rough ? "Too few ordinary days to compare yet." : "Too few meal logs to compare yet.")}
          ${body(x, rough ? `${m.days === 1 ? "That day also had a symptom." : m.withSymptom === m.days ? `All ${m.days} days with a meal also had a symptom.` : `${m.withSymptom} of the ${m.days} days with a meal also had a symptom.`} ${check}` : check)}
          ${cta}
          ${pnote}`);
      }
      return card(x, "ez-pattern", "Possible patterns: nothing stands out", "Possible patterns", null, `
        ${lead(x, null, null, "Nothing stands out right now.")}
        ${body(x, "Florin compared what you logged with the days after, and nothing repeats often enough to show. It keeps looking as you log.")}
        ${pnote}`);
    }
    const food = p.food ? lower1(p.food) : "";
    /* what counts as a time, in the model's own words from the pattern's line */
    const loose = (p.line.match(/first BM was (.+?) \d+ of \d+ times/) || [])[1];
    const late = (p.line.match(/dinners past ([^,]+),/) || [])[1];
    const what = p.kind === "late" ? [late ? `After a dinner past ${late}` : "After a later dinner", "After an earlier dinner"]
      : p.kind === "loose" ? [`The morning after ${food}`, "Other mornings"] : [`The day after ${food}`, "Other days"];
    const caption = p.kind === "late" ? "Times your first BM came later than your usual window"
      : p.kind === "loose" ? (loose ? `Times your first BM was ${loose}` : "Times your first BM was looser") : "Times you logged bloating";
    /* a later first BM is a shift from your window, so Gold, and the caption over the bars says so */
    const kind = p.kind === "late" ? "shift" : "read";
    const rows = [
      { label: what[0], count: p.hit, of: p.n, kind, text: `${p.hit} of ${p.n}` },
      { label: what[1], count: p.oh, of: p.on, kind, text: `${p.oh} of ${p.on}` }
    ];
    return card(x, "ez-pattern", `A possible pattern: ${p.title}`, "A possible pattern", `Last ${PT.meals.window} days`, `
      ${lead(x, p.hit, `of ${p.n} times`, `${p.title}.`)}
      <div class="ez-pbars"><p class="ez-body is-strong">${x.esc(caption)}</p>${bars(x, rows)}</div>
      <p class="ez-sure">How sure: <b>${x.esc(p.tier)}</b></p>
      ${pnote}`);
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "easy",
    name: "Easy read",
    idea: "Made for a 70-year-old with reading glasses: one big number and one plain sentence per card in large type, at most one simple picture with its words written on it, high contrast, and nothing to decode.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }
  });
})();
