/* Florin app prototype: seeded demo data and the stats every screen reads from.
   Pure JS (no DOM), so the studio, the homepage build and the deck all draw the same numbers. */
(function () {
  const W = window;
  const DAYS = 91; /* index 0..90, 90 = today */
  const Y = 2026, M = 8, D = 16; /* Wednesday, September 16, 2026 */

  const mulberry = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const gauss = (r) => {
    let u = 0, v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const mean = (a) => (a.length ? sum(a) / a.length : 0);
  const pct = (arr, p) => {
    const s = arr.slice().sort((x, y) => x - y);
    if (!s.length) return 0;
    const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  };
  const median = (a) => pct(a, 0.5);
  const floorTo = (v, s) => Math.floor(v / s) * s;
  const ceilTo = (v, s) => Math.ceil(v / s) * s;

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const fmtTime = (h, o = {}) => {
    let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh += 1; mm = 0; }
    const ap = hh >= 12 && hh < 24 ? "PM" : "AM";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    if (o.short && mm === 0) return `${h12} ${ap}`;
    return `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
  };
  const fmtHours = (h) => `${Math.floor(h)}h ${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, "0")}m`;
  const fmtMins = (m) => `${Math.round(m)} min`;

  const PERSONAS = {
    sarah: {
      id: "sarah", name: "Sarah", initial: "S", seed: 1103, cycle: true, workoutP: 0.42,
      sync: ["Apple Health", "Cycle tracking"], lead: "Patterns and outcomes first",
      why: "For women, the research says lead with patterns, triggers and outcomes, and plan for cycle correlation (47% rated it a must-have).",
      patterns: ["sleep", "dinner", "cycle", "move"]
    },
    marcus: {
      id: "marcus", name: "Marcus", initial: "M", seed: 2207, cycle: false, workoutP: 0.56,
      sync: ["Apple Health", "Apple Watch"], lead: "Fits his stack first",
      why: "For men, the research says lead with how Florin fits the health apps they already use (health-app integration was the #1 driver for men, 40%).",
      patterns: ["dinner", "move", "sleep"]
    },
    alex: {
      id: "alex", name: "Alex", initial: "A", seed: 3301, cycle: false, workoutP: 0.6,
      sync: ["Oura", "Apple Health", "CSV export"], lead: "Open data first",
      why: "The data-driven amplifier wants the raw series, exports and sync. People already tracking their gut rated intent 4.42 of 5, the warmest group in the research.",
      patterns: ["sleep", "move", "dinner"]
    }
  };

  /* The last two weeks are designed so the story reads the same for every persona:
     a rougher last week (late dinners, short nights) and a steadier this week. [first, extra visits, voc, sleep, lateDinnerTonight, workoutToday, felt] */
  const DESIGN = {
    77: [9.08, 0, 45.2, 6.9, false, false, { bloating: 1 }],
    78: [7.83, 1, 53.2, 5.4, true, false, { energy: 1, bloating: 1 }],
    79: [9.33, 1, 46.0, 7.2, false, true, {}],
    80: [8.08, 0, 42.3, 7.4, true, false, {}],
    81: [9.17, 1, 47.4, 6.8, false, true, { urgency: 1 }],
    82: [7.75, 0, 52.4, 5.5, false, false, { energy: 1 }],
    83: [7.67, 0, 41.2, 7.1, false, true, {}],
    84: [7.58, 0, 40.1, 7.3, false, true, {}],
    85: [7.83, 1, 42.4, 7.0, true, false, {}],
    86: [8.92, 0, 44.1, 7.2, false, true, {}],
    87: [8.17, 0, 39.3, 7.6, false, true, {}],
    88: [7.5, 1, 41.0, 7.4, false, true, {}],
    89: [7.67, 0, 40.2, 7.2, false, true, {}],
    90: [7.7, 0, 51.6, 5.8, false, false, null]
  };

  function generate(P) {
    const r = mulberry(P.seed);
    const days = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(Y, M, D - (DAYS - 1 - d));
      const dow = date.getDay();
      days.push({ d, date, dow, weekend: dow === 0 || dow === 6, label: `${DOW[dow]} ${MON[date.getMonth()]} ${date.getDate()}` });
    }
    days.forEach((x) => {
      x.lateDinner = r() < (x.d >= 60 ? 0.15 : 0.22); /* dinner after 8 PM on this day, seen the next morning */
      x.sleep = +clamp(7.15 + gauss(r) * 0.45, 6.2, 8.6).toFixed(2); /* sleep the night before this morning */
      x.workout = r() < P.workoutP;
      x.cycleDay = P.cycle ? ((x.d + 9) % 28) + 1 : null;
    });
    [8, 19, 33, 47, 55, 64, 71].forEach((i) => (days[i].sleep = +(5.3 + ((i * 7) % 6) * 0.1).toFixed(2)));
    days.slice(56, 77).forEach((x) => { if (x.sleep < 6 && ![64, 71].includes(x.d)) x.sleep = 6.4; });

    days.forEach((x, i) => {
      const prev = days[i - 1];
      const afterLate = !!(prev && prev.lateDinner);
      const moved = !!(prev && prev.workout);
      const short = x.sleep < 6;
      const menses = P.cycle && x.cycleDay <= 3;
      const u = r();
      let n = u < 0.025 ? 0 : u < 0.7 ? 1 : u < 0.955 ? 2 : 3;
      if (afterLate && n === 1 && r() < 0.25) n = 2;
      if (menses && r() < 0.6) n += 1;
      const ts = [];
      if (n > 0) {
        ts.push(clamp(7.55 + (x.weekend ? 0.3 : 0) + (afterLate ? 1.25 : 0) + (moved ? -0.05 : 0.12) + gauss(r) * (moved ? 0.22 : 0.36) - (x.d < 45 ? 0 : 0), 5.6, 11.4));
        if (n > 1) ts.push(clamp(12.8 + r() * 3.6, 12, 17));
        if (n > 2) ts.push(clamp(18.2 + r() * 2.9, 17.5, 22));
      }
      x.visits = ts.map((t) => ({ t: +t.toFixed(3), dur: +clamp(Math.exp(Math.log(5.7) + gauss(r) * 0.28) + (short ? 1.4 : 0) + (menses ? 1 : 0), 1.8, 17).toFixed(1) }));
      x.voc = n ? +clamp(40.5 + gauss(r) * (x.d < 45 ? 3.4 : 2.5) + (short ? 10 : 0) + (afterLate ? 4 : 0) + (menses ? 7 : 0), 20, 78).toFixed(1) : null;
      x.logged = r() < 0.76;
      x.felt = { bloating: 0, urgency: 0, cramping: 0, energy: 0 };
      if (x.logged) {
        const vocHigh = x.voc != null && x.voc > 47;
        if (r() < 0.06 + (x.d < 61 ? 0.17 : 0) + (vocHigh ? 0.42 : 0)) x.felt.bloating = vocHigh && r() < 0.4 ? 2 : 1;
        if (r() < 0.04 + (n >= 2 ? 0.24 : 0) + (x.d < 61 ? 0.05 : 0)) x.felt.urgency = r() < 0.25 ? 2 : 1;
        if (r() < 0.03 + (menses ? 0.62 : 0)) x.felt.cramping = menses && r() < 0.4 ? 2 : 1;
        if (r() < 0.06 + (short ? 0.5 : 0)) x.felt.energy = 1;
      }
    });
    if (days[71].voc != null) days[71].voc = 44.6;
    if (days[64].visits.length) days[64].voc = 50.9;

    Object.keys(DESIGN).forEach((k) => {
      const i = +k, x = days[i], [first, extra, voc, sleep, late, workout, felt] = DESIGN[k];
      const r2 = mulberry(P.seed * 31 + i);
      const menses = P.cycle && x.cycleDay <= 3;
      const ex = extra + (menses && i !== 90 ? 1 : 0);
      const ts = [first];
      if (ex > 0) ts.push(13.1 + r2() * 3.2);
      if (ex > 1) ts.push(18.6 + r2() * 2.2);
      x.visits = ts.map((t, j) => ({ t: +t.toFixed(3), dur: +(j === 0 && i === 90 ? 6.2 : clamp(5.2 + r2() * 2.1 + (sleep < 6 ? 1.3 : 0), 3.6, 9.4)).toFixed(1) }));
      x.voc = voc + (menses && i !== 90 ? 4 : 0);
      x.sleep = sleep;
      x.lateDinner = late;
      x.workout = workout;
      x.logged = !!felt && r2() < 0.9;
      x.felt = Object.assign({ bloating: 0, urgency: 0, cramping: menses ? 1 : 0, energy: 0 }, felt || {});
      if (!x.logged) x.felt = { bloating: 0, urgency: 0, cramping: 0, energy: 0 };
    });
    days[76].lateDinner = true;
    days[76].workout = false;
    days[90].partial = true;
    return days;
  }

  function usualFrom(days, from, to) {
    const w = days.slice(from, to + 1);
    const firsts = w.filter((x) => x.visits.length).map((x) => x.visits[0].t);
    const counts = w.map((x) => x.visits.length);
    const durs = w.flatMap((x) => x.visits.map((v) => v.dur));
    const vocs = w.filter((x) => x.voc != null).map((x) => x.voc);
    const vMed = median(vocs);
    const mad = median(vocs.map((v) => Math.abs(v - vMed))) * 1.4826;
    return {
      tLo: floorTo(pct(firsts, 0.1), 0.25), tHi: ceilTo(pct(firsts, 0.75), 0.25), tMid: median(firsts),
      nLo: Math.max(1, Math.round(pct(counts, 0.1))), nHi: Math.max(2, Math.round(pct(counts, 0.9))),
      dLo: Math.floor(pct(durs, 0.2)), dHi: Math.ceil(pct(durs, 0.8)), dMid: median(durs),
      vLo: Math.round(vMed - 1.3 * mad), vHi: Math.round(vMed + 1.3 * mad), vMid: Math.round(vMed),
      from, to
    };
  }

  const WEIGHTS = { rhythm: 0.3, regularity: 0.25, steadiness: 0.25, comfort: 0.2 };
  const MAP_LO = 80, MAP_HI = 96, OUT_LO = 63, OUT_HI = 84;
  const mapScore = (raw) => OUT_LO + ((raw - MAP_LO) * (OUT_HI - OUT_LO)) / (MAP_HI - MAP_LO);

  function components(x, U) {
    const n = x.visits.length;
    let rhythm = 55;
    if (n) {
      const t = x.visits[0].t;
      const out = t < U.tLo ? U.tLo - t : t > U.tHi ? t - U.tHi : 0;
      rhythm = out ? clamp(88 - out * 32, 40, 88) : 100 - Math.abs(t - U.tMid) * 7;
    }
    const regularity = n === 0 ? 55 : n <= U.nHi ? 97 : n === 3 ? 76 : 62;
    let steadiness = 60;
    if (x.voc != null) {
      const out = x.voc < U.vLo ? U.vLo - x.voc : x.voc > U.vHi ? x.voc - U.vHi : 0;
      steadiness = out ? clamp(88 - out * 3, 45, 88) : 98 - Math.abs(x.voc - U.vMid) * 0.7;
    }
    const maxSev = Math.max(0, ...Object.values(x.felt));
    const comfort = !x.logged ? 86 : [97, 82, 67, 55][maxSev];
    return { rhythm, regularity, steadiness, comfort };
  }

  function build(personaId) {
    const P = PERSONAS[personaId] || PERSONAS.sarah;
    const days = generate(P);
    const U = usualFrom(days, 28, 83);
    days.forEach((x) => (x.comp = components(x, U)));
    days.forEach((x, i) => {
      const win = days.slice(Math.max(0, i - 2), i + 1);
      const c3 = {};
      Object.keys(WEIGHTS).forEach((k) => (c3[k] = mean(win.map((y) => y.comp[k]))));
      x.c3 = c3;
      x.raw = sum(Object.keys(WEIGHTS).map((k) => WEIGHTS[k] * c3[k]));
      x.score = clamp(Math.round(mapScore(x.raw)), 0, 100);
      const n = x.visits.length;
      x.first = n ? x.visits[0].t : null;
      x.inWindow = n ? x.first >= U.tLo && x.first <= U.tHi : null;
      x.vocState = x.voc == null ? null : x.voc > U.vHi ? "high" : x.voc < U.vLo ? "low" : "usual";
      x.countState = n < U.nLo ? "low" : n > U.nHi ? "high" : "usual";
      const durs = x.visits.map((v) => v.dur);
      x.durMed = durs.length ? median(durs) : null;
      x.durState = x.durMed == null ? null : x.durMed > U.dHi ? "high" : x.durMed < U.dLo ? "low" : "usual";
      x.state = !n ? "none" : x.inWindow && x.vocState === "usual" && x.countState === "usual" && x.durState === "usual" ? "usual" : "shifted";
    });

    const today = days[DAYS - 1];
    const range = (n) => days.slice(DAYS - n);
    const wk = days.slice(84, 91), lastWk = days.slice(77, 84);
    const wAvg = (arr, k) => mean(arr.map((x) => x.c3[k]));
    const scoreAvg = (arr) => mean(arr.map((x) => mapScore(x.raw)));
    const factor = (OUT_HI - OUT_LO) / (MAP_HI - MAP_LO);
    const moved = Object.keys(WEIGHTS).map((k) => ({ key: k, delta: factor * WEIGHTS[k] * (wAvg(wk, k) - wAvg(lastWk, k)), now: Math.round(wAvg(wk, k)), before: Math.round(wAvg(lastWk, k)), weight: WEIGHTS[k] }));
    const scoreDelta = Math.round(scoreAvg(wk) - scoreAvg(lastWk));
    const last60 = days.slice(31, 91).map((x) => x.score);
    const scoreUsual = [Math.round(pct(last60, 0.15)), Math.round(pct(last60, 0.85))];

    /* Patterns across the last 30 days (mornings 61..90) */
    const W30 = days.slice(61, 91);
    const pats = {};
    {
      const withV = W30.filter((x) => x.visits.length);
      const a = withV.filter((x) => days[x.d - 1].lateDinner), b = withV.filter((x) => !days[x.d - 1].lateDinner);
      const ma = median(a.map((x) => x.first)), mb = median(b.map((x) => x.first));
      const hit = a.filter((x) => x.first > mb + 0.5).length;
      pats.dinner = { id: "dinner", metric: "timing", icon: "moon", title: "Later dinners, later mornings", cond: "Dinner after 8 PM", other: "Other nights", a, b, ma, mb, hit, n: a.length, diffMin: Math.round((ma - mb) * 60), source: "Meal times you logged" };
    }
    {
      const withV = W30.filter((x) => x.voc != null);
      const a = withV.filter((x) => x.sleep < 6), b = withV.filter((x) => x.sleep >= 6);
      const ma = median(a.map((x) => x.voc)), mb = median(b.map((x) => x.voc));
      const hit = a.filter((x) => x.voc > U.vHi).length;
      pats.sleep = { id: "sleep", metric: "voc", icon: "sleep", title: "Short nights, busier mornings", cond: "Under 6 hours of sleep", other: "6 hours or more", a, b, ma, mb, hit, n: a.length, diff: Math.round(ma - mb), source: P.id === "alex" ? "Sleep from Oura" : "Sleep from Apple Health" };
    }
    {
      const withV = W30.filter((x) => x.visits.length && days[x.d - 1]);
      const a = withV.filter((x) => days[x.d - 1].workout), b = withV.filter((x) => !days[x.d - 1].workout);
      const ra = a.filter((x) => x.inWindow).length / Math.max(1, a.length), rb = b.filter((x) => x.inWindow).length / Math.max(1, b.length);
      pats.move = { id: "move", metric: "timing", icon: "move", title: "Active days, steadier mornings", cond: "Morning after a workout", other: "Other mornings", a, b, ra, rb, hit: a.filter((x) => x.inWindow).length, n: a.length, source: P.id === "alex" ? "Workouts from Oura and Apple Health" : "Workouts from Apple Health" };
    }
    if (P.cycle) {
      const all = days.slice(7, 91);
      const a = all.filter((x) => x.cycleDay <= 3), b = all.filter((x) => x.cycleDay > 3);
      pats.cycle = { id: "cycle", metric: "frequency", icon: "cycle", title: "Cycle days 1 to 3, more visits", cond: "Cycle days 1 to 3", other: "Other days", a, b, ma: mean(a.map((x) => x.visits.length)), mb: mean(b.map((x) => x.visits.length)), hit: a.filter((x) => x.visits.length >= 2).length, n: a.length, cycles: 3, source: "Cycle tracking" };
    }
    const strength = (p) => {
      const rate = p.hit / Math.max(1, p.n);
      if (p.n >= 8 && rate >= 0.7) return { k: 3, label: "Consistent" };
      if (p.n >= 5 && rate >= 0.6) return { k: 2, label: "Showing up often" };
      return { k: 1, label: "Early signal" };
    };
    Object.values(pats).forEach((p) => (p.strength = strength(p)));

    return {
      persona: P, days, today, U, WEIGHTS, moved, scoreDelta, scoreUsual, patterns: pats,
      range, wk, lastWk, DAYS,
      fmt: { time: fmtTime, hours: fmtHours, mins: fmtMins, DOW, DOWL, MON, MONL }
    };
  }

  const cache = {};
  W.FLORIN_APP = {
    personas: PERSONAS,
    get: (id) => cache[id] || (cache[id] = build(id)),
    util: { clamp, mean, median, pct, sum, fmtTime, fmtHours, fmtMins, DOW, DOWL, MON, MONL }
  };
})();
