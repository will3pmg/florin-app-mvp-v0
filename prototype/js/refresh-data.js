/* Florin app refresh: the manual logs behind today's app (no hardware, no gas data, no FloraScore).
   Built on the studio's seeded days (js/data-app.js), so the refresh tells the same story as the studio:
   BM times are the seeded visits, symptoms come from the seeded check-ins, late dinners stay late.
   Week before last was the rougher one; last week, the one that ends tonight, was steadier.
   Pure JS, no DOM. Every number a screen states is computed from this, never typed. window.FLORIN_LOGS */
(function () {
  const AD = window.FLORIN_APP;
  if (!AD) return;
  const Ut = AD.util;
  const L = (window.FLORIN_LOGS = {});

  /* ---------- the demo's "now" ----------
     Sunday evening, the night the weekly check-in is due. Day 90 of the seeded data is today, relabelled so the
     calendar week (Monday to Sunday, days 84 to 90) is the seeded "steadier" week. Day 0 is Monday, July 13. */
  const TODAY = 90;
  const ANCHOR = [2026, 9, 11]; /* Sunday, October 11, 2026 */
  L.TODAY = TODAY;
  L.NOW = 19 + 40 / 60; /* 7:40 PM */
  L.dateOf = (d) => new Date(ANCHOR[0], ANCHOR[1], ANCHOR[2] - (TODAY - d));
  L.LEARN_DAYS = 14;
  L.BASE_WEEKS = 3; /* the check-in compares each week with the person's first three */

  const mulberry = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const wpick = (r, pairs) => {
    let u = r() * pairs.reduce((s, p) => s + p[1], 0);
    for (const [v, w] of pairs) if ((u -= w) < 0) return v;
    return pairs[pairs.length - 1][0];
  };
  const between = (r, a, b) => +(a + r() * (b - a)).toFixed(3);

  /* ---------- the stool form, two ways ----------
     A: the 1 to 7 scale clinicians use. The short labels and lines are our own words, and the icons are our own
        abstract marks: the scale's wording and imagery need the licence confirmed before anything ships.
     B: today's five words as chips. No licensing question, but they group the seven types unevenly. */
  L.TYPES = [
    null,
    { k: 1, short: "Hard pieces", line: "Small, hard, separate pieces" },
    { k: 2, short: "Lumpy", line: "In one piece, firm and lumpy" },
    { k: 3, short: "Cracked", line: "In one piece, with a cracked surface" },
    { k: 4, short: "Smooth", line: "In one piece, smooth and soft" },
    { k: 5, short: "Soft pieces", line: "Soft pieces with clear edges" },
    { k: 6, short: "Mushy", line: "Mushy, with ragged edges" },
    { k: 7, short: "Liquid", line: "All liquid, no solid pieces" }
  ];
  L.WORDS = [
    { k: 0, word: "Hard", line: "Hard, separate pieces", types: [1], rep: 1, glyph: 1 },
    { k: 1, word: "Firm", line: "In one piece, firm or lumpy", types: [2], rep: 2, glyph: 2 },
    { k: 2, word: "Formed", line: "In one piece and soft", types: [3, 4], rep: 4, glyph: 4 },
    { k: 3, word: "Loose", line: "Soft or mushy pieces", types: [5, 6], rep: 5, glyph: 5 },
    { k: 4, word: "Watery", line: "Mostly or all liquid", types: [7], rep: 7, glyph: 7 }
  ];
  L.wordOf = (type) => L.WORDS.find((w) => w.types.includes(type)).k;
  /* how a BM's form reads in each option */
  L.formName = (form, mode) => (mode === "B" ? L.WORDS[L.wordOf(form)].word : `Type ${form}`);
  L.formLine = (form, mode) => (mode === "B" ? L.WORDS[L.wordOf(form)].line : L.TYPES[form].line);

  /* ---------- the lists the forms use ----------
     Symptoms are body symptoms only. The stool words that sat in the old pills moved to the BM: the form covers
     loose or watery and hard or pellet-like, urgency is a BM detail, and blood or mucus became the BM flag. */
  L.SYMPTOMS = ["Bloating", "Belly pain", "Cramping", "Gas", "Nausea", "Burning"];
  L.STRENGTH = ["Mild", "Moderate", "Strong"]; /* s = 1, 2, 3; 0 = not said */
  L.LASTED = ["Under an hour", "A few hours", "Most of the day"];
  L.DURATION = ["Under 5 min", "5 to 10 min", "Over 10 min"];
  L.HOW = [["rush", "Had to rush"], ["strain", "Had to strain"], ["unfinished", "Didn't feel finished"]];
  L.FLAGS = [["blood", "Blood"], ["mucus", "Mucus"], ["black", "Black or tar-like"]];
  L.MEALS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["other", "Other"]];
  L.mealLabel = (k) => (L.MEALS.find((m) => m[0] === k) || ["", "Meal"])[1];
  L.mealFor = (h) => (h >= 4.5 && h < 10.75 ? "breakfast" : h >= 10.75 && h < 15 ? "lunch" : h >= 17 && h < 22.5 ? "dinner" : "other");

  /* foods, with the plain names Florin would match on (a food needs 5 or more logs before patterns are checked) */
  const FOODS = {
    breakfast: [["Oatmeal with berries", ["oatmeal"]], ["Eggs and toast", ["eggs", "toast"]], ["Greek yogurt and granola", ["yogurt"]], ["A smoothie", ["smoothie"]], ["Avocado toast", ["avocado", "toast"]]],
    lunch: [["Chicken salad", ["salad"]], ["Turkey sandwich", ["sandwich"]], ["Salmon rice bowl", ["salmon", "rice"]], ["Lentil soup", ["lentils"]], ["Leftover pasta", ["pasta"]], ["Burrito bowl", ["beans", "rice"]]],
    dinner: [["Salmon, rice and greens", ["salmon", "rice"]], ["Pasta with tomato sauce", ["pasta"]], ["Tofu stir-fry", ["tofu"]], ["Tacos", ["tacos"]], ["Pizza", ["pizza"]], ["Chicken curry with rice", ["curry", "rice"]], ["Roast chicken and potatoes", ["potatoes"]]],
    other: [["Apple and peanut butter", ["apple"]], ["A protein bar", ["protein bar"]], ["Ice cream", ["ice cream"]]]
  };
  /* the foods a "next step" may name, with how to say them */
  L.FOOD_NAMES = {
    coffee: ["Coffee", false], curry: ["Curry", false], tacos: ["Tacos", true], pizza: ["Pizza", false], "ice cream": ["Ice cream", false],
    lentils: ["Lentils", true], pasta: ["Pasta", false], beans: ["Beans", true], salmon: ["Salmon", false], oatmeal: ["Oatmeal", false],
    yogurt: ["Yogurt", false], tofu: ["Tofu", false], smoothie: ["Smoothies", true], eggs: ["Eggs", true], salad: ["Salad", false]
  };

  /* ---------- this week, written out ----------
     The week that ends tonight is the seeded steadier week. Thursday has no logs at all (a gap stays a gap),
     Tuesday's dinner ran past 8 PM and Wednesday's first BM came later and looser, with mild bloating. */
  const CRAFT_FORMS = { 84: [4], 85: [4, 6], 86: [5], 88: [3, 4], 89: [4] };
  const CRAFT_GAP = { 87: true };
  const CRAFT_SYM = { 86: { t: 10.33, items: [{ name: "Bloating", s: 1 }], last: 1, note: "" } };
  const TODAY_ENTRIES = (mode) => (mode === "new" ? [] : [
    { kind: "bm", t: null /* the seeded first visit */, form: 4, how: {}, dur: null, flags: {}, note: "" },
    { kind: "meal", t: 8.08, meal: "breakfast", text: "Oatmeal with berries, coffee", foods: ["oatmeal", "coffee"], note: "" },
    { kind: "meal", t: 12.67, meal: "lunch", text: "Chicken salad", foods: ["salad"], note: "" },
    { kind: "sym", t: 15.17, items: [{ name: "Bloating", s: 1 }], last: 1, note: "" }
  ]);

  let seq = 0;
  const nid = (k) => `${k}${++seq}`;

  /* one day of manual logs, from one seeded day */
  function dayOf(A, d, mode) {
    const P = A.persona, U = A.U, x = A.days[d], prev = A.days[d - 1];
    const r = mulberry(P.seed * 131 + d * 7919 + 17);
    const date = L.dateOf(d);
    const day = { d, date, dow: date.getDay(), entries: [], logged: true };
    const gap = d !== TODAY && (CRAFT_GAP[d] || (d < 84 && r() < 0.07));
    if (gap) { day.logged = false; return day; }
    if (d === TODAY) {
      TODAY_ENTRIES(mode).forEach((e) => day.entries.push(Object.assign({ id: nid(e.kind), d }, e, { t: e.t == null ? x.visits[0].t : e.t })));
      return day;
    }

    const felt = x.logged ? x.felt : { bloating: 0, urgency: 0, cramping: 0, energy: 0 };
    const urg = felt.urgency, bloat = felt.bloating;
    const menses = P.cycle && x.cycleDay <= 3;
    const afterLate = !!(prev && prev.lateDinner);

    /* BMs: the seeded visits, each with a form */
    x.visits.forEach((v, i) => {
      let form;
      if (CRAFT_FORMS[d] && CRAFT_FORMS[d][i]) form = CRAFT_FORMS[d][i];
      else if (i === 0 && urg > 0) form = urg >= 2 ? 7 : 6;
      else if (i > 0 && (urg > 0 || menses)) form = wpick(r, [[5, 3], [6, 2]]);
      else if (i === 0 && afterLate) form = wpick(r, [[4, 2], [5, 3]]);
      else if (i === 0 && x.first > U.tHi + 0.25) form = wpick(r, [[2, 1], [3, 2], [4, 1]]);
      else if (bloat >= 2) form = wpick(r, [[5, 2], [6, 1]]);
      else form = wpick(r, [[3, 2], [4, 5], [5, 2.4], [6, 0.4]]);
      const bm = { id: nid("bm"), d, kind: "bm", t: v.t, form, how: {}, dur: null, flags: {}, note: "" };
      if (i === 0 && urg > 0) bm.how.rush = true;
      if (form <= 2 && r() < 0.5) bm.how.strain = true;
      if (form >= 6 && r() < 0.3) bm.how.unfinished = true;
      if (urg > 0 || r() < 0.22) bm.dur = v.dur < 5 ? 0 : v.dur < 10 ? 1 : 2;
      if (i === 0) {
        if (urg > 0) bm.note = "Had to hurry this morning.";
        else if (afterLate && r() < 0.3) bm.note = "Late dinner last night.";
        else if (menses && r() < 0.5) bm.note = `Cycle day ${x.cycleDay}.`;
      }
      day.entries.push(bm);
    });
    if (!x.visits.length) day.entries.push({ id: nid("nobm"), d, kind: "nobm", t: between(r, 20.75, 21.75) });

    /* symptoms: from the seeded check-ins. Low energy and urgency don't log here any more */
    if (CRAFT_SYM[d]) day.entries.push(Object.assign({ id: nid("sym"), d, kind: "sym" }, JSON.parse(JSON.stringify(CRAFT_SYM[d]))));
    else {
      if (felt.cramping) day.entries.push({ id: nid("sym"), d, kind: "sym", t: between(r, 9.6, 11.4), items: [{ name: "Cramping", s: felt.cramping }], last: r() < 0.6 ? 0 : 1, note: "" });
      if (bloat) {
        const items = [{ name: "Bloating", s: bloat }];
        if (r() < 0.35) items.push({ name: "Gas", s: 1 });
        if (bloat >= 2 && r() < 0.45) items.push({ name: "Belly pain", s: 1 });
        day.entries.push({ id: nid("sym"), d, kind: "sym", t: between(r, 13.4, 17.2), items, last: r() < 0.7 ? 1 : 2, note: "" });
      }
    }

    /* meals: dinner after 8 PM on the seeded late-dinner days */
    const meal = (k, t) => {
      const [text, foods] = pick(r, FOODS[k]);
      const m = { id: nid("meal"), d, kind: "meal", t, meal: k, text, foods: foods.slice(), note: "" };
      if (k === "breakfast" && r() < 0.55) { m.text += ", coffee"; m.foods.push("coffee"); }
      day.entries.push(m);
    };
    if (r() < 0.72) meal("breakfast", Math.max(between(r, 7.55, 8.7), x.first != null ? Math.min(9.6, x.first + 0.25) : 0));
    if (r() < 0.62) meal("lunch", between(r, 12.1, 13.6));
    if (x.lateDinner || r() < 0.8) meal("dinner", x.lateDinner ? between(r, 20.15, 21.4) : between(r, 18.3, 19.85));
    if (r() < 0.12) meal("other", between(r, 15.2, 16.4));

    day.entries.sort((a, b) => a.t - b.t);
    return day;
  }

  /* the smallest run of neighbouring steps that holds 80% or more of the BMs */
  function usualRun(counts, n) {
    let best = null;
    for (let lo = 0; lo < counts.length; lo++) for (let hi = lo; hi < counts.length; hi++) {
      let s = 0;
      for (let k = lo; k <= hi; k++) s += counts[k];
      if (s / Math.max(1, n) < 0.8) continue;
      if (!best || hi - lo < best[1] - best[0] || (hi - lo === best[1] - best[0] && s > best[2])) best = [lo, hi, s];
    }
    return best ? { lo: best[0], hi: best[1] } : null;
  }

  /* the weekly check-in, answered from the seeded days (0 is the lightest answer, 3 the heaviest) */
  L.CHECKIN = [
    { k: "pain", label: "Belly pain", q: "How much belly pain did you have this week?", opts: ["None", "A little", "Some", "A lot"], ends: ["None", "A lot"], less: "Less than at first", more: "More than at first" },
    { k: "way", label: "Days it got in the way", q: "On how many days did your gut get in the way of your plans?", opts: ["None", "1 or 2 days", "3 or 4 days", "5 or more days"], ends: ["None", "5+ days"], less: "Fewer days than at first", more: "More days than at first" },
    { k: "bloat", label: "Bloating", q: "How much bloating did you have this week?", opts: ["None", "A little", "Some", "A lot"], ends: ["None", "A lot"], less: "Less than at first", more: "More than at first" },
    { k: "settled", label: "Bowel habits", q: "How settled did your bowel habits feel this week?", opts: ["Settled", "Mostly settled", "Up and down", "Unsettled"], ends: ["Settled", "Unsettled"], less: "More settled than at first", more: "Less settled than at first" }
  ];
  L.CHECKIN_TAGS = ["Travel", "Stress", "Short nights", "Eating out", "Feeling unwell"];
  function weekAnswers(A, ws) {
    const wd = A.days.slice(ws, ws + 7);
    const lvl = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3);
    const pain = wd.filter((x) => x.felt.cramping > 0 || x.felt.bloating >= 2).length;
    const way = wd.filter((x) => Math.max(...Object.values(x.felt)) >= 2 || x.felt.urgency > 0 || x.countState === "high").length;
    const bloat = wd.filter((x) => x.felt.bloating > 0).length;
    const share = wd.filter((x) => x.state === "usual").length / 7;
    return [lvl(pain), lvl(way), lvl(bloat), share >= 0.7 ? 0 : share >= 0.45 ? 1 : share >= 0.25 ? 2 : 3];
  }

  /* ---------- the model one phone works on ----------
     mode "est": twelve weeks of logs, check-ins answered every Sunday but one, tonight's due.
     mode "new": started five days ago, still learning their usual, nothing logged yet today, first check-in due. */
  L.build = (personaId, mode) => {
    const A = AD.get(personaId);
    const P = A.persona, U = A.U;
    const start = mode === "new" ? TODAY - 4 : 0;
    const days = [];
    for (let d = start; d <= TODAY; d++) days.push(dayOf(A, d, mode));
    const M = { A, P, persona: P, mode, start, days, seq: 0 };

    if (mode === "new") {
      M.usual = null;
      M.checkins = [];
    } else {
      /* your usual, from the same weeks the studio uses (days 28 to 83) */
      const base = days.filter((x) => x.d >= 28 && x.d <= 83).flatMap((x) => x.entries.filter((e) => e.kind === "bm"));
      const c7 = [0, 0, 0, 0, 0, 0, 0];
      base.forEach((b) => c7[b.form - 1]++);
      const c5 = [0, 0, 0, 0, 0];
      base.forEach((b) => c5[L.wordOf(b.form)]++);
      const a = usualRun(c7, base.length), b = usualRun(c5, base.length);
      M.usual = { tLo: U.tLo, tHi: U.tHi, nLo: U.nLo, nHi: U.nHi, fLo: a.lo + 1, fHi: a.hi + 1, wLo: b.lo, wHi: b.hi };
      /* twelve answered Sundays (one skipped), tonight's still to come */
      M.checkins = [];
      for (let w = 0; w < 12; w++) {
        const ws = w * 7;
        M.checkins.push(w === 6 ? { w, ws, skipped: true } : { w, ws, answers: weekAnswers(A, ws), tags: [], note: "" });
      }
    }
    M.checkin = { w: 12, ws: 84, status: "due", answers: null, tags: [], note: "" };
    M.ckDay = { dow: 0, when: "evening" };
    return M;
  };

  /* ---------- reading the model ---------- */
  L.day = (M, d) => M.days.find((x) => x.d === d);
  L.find = (M, id) => {
    for (const x of M.days) { const e = x.entries.find((y) => y.id === id); if (e) return e; }
    return null;
  };
  L.bms = (x) => (x && x.logged ? x.entries.filter((e) => e.kind === "bm") : []);
  L.inWindow = (M, t) => !!M.usual && t >= M.usual.tLo && t <= M.usual.tHi;
  L.inForms = (M, form, mode) => {
    if (!M.usual) return null;
    if (mode === "B") { const w = L.wordOf(form); return w >= M.usual.wLo && w <= M.usual.wHi; }
    return form >= M.usual.fLo && form <= M.usual.fHi;
  };
  L.usualFormsText = (M, mode) => {
    const u = M.usual;
    if (mode === "B") return u.wLo === u.wHi ? L.WORDS[u.wLo].word : `${L.WORDS[u.wLo].word} ${u.wHi - u.wLo === 1 ? "or" : "to"} ${L.WORDS[u.wHi].word}`;
    return u.fLo === u.fHi ? `Type ${u.fLo}` : `Types ${u.fLo} to ${u.fHi}`;
  };
  /* the Monday to Sunday week holding day d */
  L.weekOf = (d) => {
    const ws = d - ((L.dateOf(d).getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => ws + i);
  };
  L.learnDay = (M) => TODAY - M.start + 1;

  /* how many times each food came up in the last n days */
  L.foodCounts = (M, n = 30) => {
    const out = {};
    M.days.filter((x) => x.d > TODAY - n).forEach((x) => x.entries.filter((e) => e.kind === "meal").forEach((m) => (m.foods || []).forEach((f) => (out[f] = (out[f] || 0) + 1))));
    return out;
  };

  /* the check-in baseline: the first three answered weeks */
  L.baseline = (M) => {
    const done = M.checkins.filter((c) => c.answers);
    if (done.length < L.BASE_WEEKS) return null;
    const first = done.slice(0, L.BASE_WEEKS);
    return L.CHECKIN.map((q, i) => {
      const v = first.map((c) => c.answers[i]);
      return { mean: Ut.mean(v), lo: Math.min(...v), hi: Math.max(...v) };
    });
  };
  L.compare = (b, i, v) => {
    if (!b) return null;
    const diff = v - b[i].mean;
    return Math.abs(diff) < 0.5 ? { k: "same", text: "About the same" } : diff < 0 ? { k: "less", text: L.CHECKIN[i].less } : { k: "more", text: L.CHECKIN[i].more };
  };

  /* ---------- changing the model ---------- */
  L.add = (M, e) => {
    const x = L.day(M, e.d);
    if (!x) return { replacedNoBm: false };
    x.logged = true;
    let replacedNoBm = false;
    if (e.kind === "bm") {
      const before = x.entries.length;
      x.entries = x.entries.filter((y) => y.kind !== "nobm");
      replacedNoBm = x.entries.length < before;
    }
    if (e.kind === "nobm") x.entries = x.entries.filter((y) => y.kind !== "nobm");
    e.id = e.id || nid(e.kind);
    x.entries.push(e);
    x.entries.sort((a, b) => a.t - b.t);
    return { replacedNoBm };
  };
  L.remove = (M, id) => {
    for (const x of M.days) {
      const i = x.entries.findIndex((y) => y.id === id);
      if (i >= 0) { const [e] = x.entries.splice(i, 1); return { e, x }; }
    }
    return null;
  };
  L.move = (M, e, d) => {
    L.remove(M, e.id);
    e.d = d;
    return L.add(M, e);
  };
})();
