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

  /* ---------- consistency, two ways ----------
     A: the seven-step scale's numbers (Type 1 to 7). Shipping A means licensing the scale from the Rome Foundation
        and using its own wording, word for word. Until then the words and lines here are ours, written from two
        cues only (how firm, and one piece or several), so they don't paraphrase the scale's descriptors, and the
        marks are our own. Nothing names the scale.
     B: our own words, no numbers. See L.WORDS. */
  L.TYPES = [
    null,
    { k: 1, short: "Pellets", line: "Very hard and dry" },
    { k: 2, short: "Hard", line: "One piece, hard and uneven" },
    { k: 3, short: "Firm", line: "One piece, firm" },
    { k: 4, short: "Formed", line: "One piece, soft, holds its shape" },
    { k: 5, short: "Soft", line: "Soft, breaks apart easily" },
    { k: 6, short: "Loose", line: "Very soft, barely holds a shape" },
    { k: 7, short: "Watery", line: "No shape at all" }
  ];
  /* B: today's five words, as briefed. Each word sits on the step C gives the same word, so a word never names two
     different steps: Hard covers steps 1 and 2, Loose covers 5 and 6. A B log keeps its word and the app never claims
     to know which step. That is B's cost: it can't split 5 from 6, the line that matters most for IBS-D */
  L.WORDS = [
    { k: 0, word: "Hard", line: "Hard, in bits or in one piece", types: [1, 2], glyph: 2 },
    { k: 1, word: "Firm", line: "One piece, firm", types: [3], glyph: 3 },
    { k: 2, word: "Formed", line: "One piece, soft, holds its shape", types: [4], glyph: 4 },
    { k: 3, word: "Loose", line: "Soft, or barely holds a shape", types: [5, 6], glyph: 6 },
    { k: 4, word: "Watery", line: "No shape at all", types: [7], glyph: 7 }
  ];
  L.wordOf = (type) => L.WORDS.find((w) => w.types.includes(type)).k;
  /* C, proposed: the seven steps in our own words (L.TYPES short words), no numbers and no scale name in the app.
     The step is stored, so a clinician export can carry the number once it's licensed */
  L.MODES = { A: "A · Types 1 to 7", B: "B · Five words", C: "C · Seven words" };
  L.MODES_SHORT = { A: "A · 1 to 7", B: "B · 5 words", C: "C · 7 words" };

  /* how a BM's consistency reads in each option. x is a step (1 to 7), or an entry: { form } or, logged in B, { word } */
  L.stepsOf = (x) => (typeof x === "number" ? [x] : x.form != null ? [x.form] : L.WORDS[x.word].types);
  L.wordKey = (x) => (typeof x === "number" ? L.wordOf(x) : x.form != null ? L.wordOf(x.form) : x.word);
  /* a B log always reads as its own word; seen through A or C it adds the step or steps the word covers */
  const wordLog = (x) => typeof x === "object" && x !== null && x.form == null && x.word != null;
  L.formName = (x, mode) => {
    const s = L.stepsOf(x);
    if (mode === "B") return L.WORDS[L.wordKey(x)].word;
    if (wordLog(x)) {
      const w = L.WORDS[x.word].word;
      if (mode === "A") return `${w} (Type ${s.join(" or ")})`;
      const cw = s.map((k, i) => (i ? L.TYPES[k].short.toLowerCase() : L.TYPES[k].short));
      return cw.length === 1 && cw[0] === w ? w : `${w} (${cw.join(" or ")})`;
    }
    return mode === "A" ? `Type ${s[0]}` : L.TYPES[s[0]].short;
  };
  L.formLine = (x, mode) => (mode === "B" || wordLog(x) ? L.WORDS[L.wordKey(x)].line : L.TYPES[L.stepsOf(x)[0]].line);
  L.glyphOf = (x, mode) => (mode === "B" || wordLog(x) ? L.WORDS[L.wordKey(x)].glyph : L.stepsOf(x)[0]);

  /* ---------- the lists the forms use ----------
     Symptoms are body symptoms only. The stool words that sat in the old pills moved to the BM: the form covers
     loose or watery and hard or pellet-like, urgency and burning are BM details, and blood or mucus became the BM flag.
     Gas and Nausea are new; Low energy comes back from the studio's check-in. */
  L.SYMPTOMS = ["Bloating", "Belly pain", "Cramping", "Gas", "Nausea", "Low energy"];
  L.STRENGTH = ["Mild", "Moderate", "Strong"]; /* s = 1, 2, 3; 0 = not said */
  L.LASTED = ["Under an hour", "A few hours", "Most of the day", "Still going"];
  L.DURATION = ["Under 5 min", "5 to 10 min", "Over 10 min"];
  L.HOW = [["rush", "Sudden urge to go"], ["strain", "Had to strain"], ["unfinished", "Didn't feel finished"], ["burn", "Burning"]];
  L.FLAGS = [["blood", "Blood"], ["mucus", "Mucus"], ["black", "Black or tar-like"]];
  L.MEALS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["other", "Other"]];
  L.ALARM = [
    [/\b(bloody|bleed\w*)\b|\bblood\b(?! (orange|sugar|pressure|test|work|type|donation))/i, "Blood"], [/\b(black|tarry|tar-like) (stool|bm|poo)\w*|\btar-like\b|\btarry\b/i, "A black or tar-like stool"],
    [/\bfever\w*\b/i, "A fever"], [/\b(vomit\w*|threw up|throwing up)\b/i, "Vomiting"], [/\b(weight loss|lost weight|losing weight)\b/i, "Weight loss"],
    [/\bw(o|a)k\w* (up )?(at night|in the night) to go\b|\bw(o|a)k\w* (up )?at night\b/i, "Waking at night to go"]
  ];
  L.alarmIn = (text) => { const hit = L.ALARM.find(([rx]) => rx.test(text || "")); return hit ? hit[1] : null; };
  /* "No BM today" is an end-of-day fact: offered from 5 PM on the day itself, any time for an earlier day */
  L.LATE = 17;
  L.isLate = () => L.NOW >= L.LATE;
  L.mealFor = (h) => (h >= 4.5 && h < 10.75 ? "breakfast" : h >= 10.75 && h < 15 ? "lunch" : h >= 17 && h < 22.5 ? "dinner" : "other");

  /* ---------- foods ----------
     One matcher for everything: the seeded meals, a meal the person types, and the counts Today and Insights read.
     Each key has a name to show, whether it reads as plural, and the words that count as it (a plural s or es is
     fine). A food needs 5 logs in 30 days before Insights looks at what tends to follow it. */
  const FOOD = {
    oatmeal: ["Oatmeal", false, ["oatmeal", "oats", "porridge"]], eggs: ["Eggs", true, ["egg"]], toast: ["Toast", false, ["toast"]],
    yogurt: ["Yogurt", false, ["yogurt", "yoghurt"]], smoothie: ["Smoothies", true, ["smoothie"]], avocado: ["Avocado", false, ["avocado"]],
    salad: ["Salad", false, ["salad"]], sandwich: ["Sandwiches", true, ["sandwich"]], chicken: ["Chicken", false, ["chicken"]],
    salmon: ["Salmon", false, ["salmon"]], rice: ["Rice", false, ["rice"]], lentils: ["Lentils", true, ["lentil"]],
    beans: ["Beans", true, ["bean"]], pasta: ["Pasta", false, ["pasta", "spaghetti", "noodle"]], tofu: ["Tofu", false, ["tofu"]],
    tacos: ["Tacos", true, ["taco"]], pizza: ["Pizza", false, ["pizza"]], curry: ["Curry", false, ["curry", "curries"]],
    potatoes: ["Potatoes", true, ["potato", "fries"]], apple: ["Apples", true, ["apple"]], "protein bar": ["Protein bars", true, ["protein bar"]],
    "ice cream": ["Ice cream", false, ["ice cream"]],
    coffee: ["Coffee", false, ["coffee(?![ -]cakes?)", "(?<!\\b(?:chai|matcha|turmeric|golden) )latte", "espresso", "cappuccino", "americano", "flat white", "cold brew", "mocha"]],
    tea: ["Tea", false, ["tea", "chai", "matcha"]], alcohol: ["Alcohol", false, ["wine(?! gums?)", "(?<!\\b(?:ginger|root) )beer", "cocktail", "cider(?! vinegar)", "prosecco"]],
    milk: ["Milk", false, ["milk"]]
  };
  const FOOD_RX = Object.entries(FOOD).map(([k, [, , al]]) => [k, new RegExp(`\\b(${al.join("|")})(e?s)?\\b`, "i")]);
  L.matchFoods = (text) => FOOD_RX.filter(([, rx]) => rx.test(text || "")).map(([k]) => k);
  /* the foods a "next step" or a count may name, with how to say them */
  L.FOOD_NAMES = Object.fromEntries(Object.entries(FOOD).map(([k, [n, pl]]) => [k, [n, pl]]));

  /* the words around each meal. Other stays "Other" on its chip, as Will wrote it, and reads as a snack or drink */
  L.MEAL_COPY = {
    breakfast: { title: "Breakfast", recent: "breakfasts", save: "Save breakfast", ph: "For example: oatmeal with berries, coffee" },
    lunch: { title: "Lunch", recent: "lunches", save: "Save lunch", ph: "For example: chicken salad" },
    dinner: { title: "Dinner", recent: "dinners", save: "Save dinner", ph: "For example: salmon, rice and greens" },
    other: { title: "Snack or drink", recent: "snacks and drinks", save: "Save snack or drink", ph: "For example: a latte, an apple, a glass of wine" }
  };
  L.mealLabel = (k) => (L.MEAL_COPY[k] || { title: "Meal" }).title;
  L.MEAL_DEFAULT_T = { breakfast: 8, lunch: 12.5, dinner: 18.5, other: 15.5 };

  /* what the seeded days eat */
  const SEED_MEALS = {
    breakfast: ["Oatmeal with berries", "Eggs and toast", "Greek yogurt and granola", "A smoothie", "Avocado toast"],
    lunch: ["Chicken salad", "Turkey sandwich", "Salmon rice bowl", "Lentil soup", "Leftover pasta", "Burrito bowl, beans and rice"],
    dinner: ["Salmon, rice and greens", "Pasta with tomato sauce", "Tofu stir-fry with rice", "Tacos", "Pizza", "Chicken curry with rice", "Roast chicken and potatoes"],
    other: ["Apple and peanut butter", "A protein bar", "Ice cream", "Afternoon latte", "Green tea"]
  };

  /* ---------- this week, written out ----------
     The week that ends tonight is the seeded steadier week. Thursday has no logs at all (a gap stays a gap),
     Tuesday's dinner ran past 8 PM and Wednesday's first BM came later and looser, with mild bloating. */
  const CRAFT_FORMS = { 84: [4], 85: [4, 6], 86: [5], 88: [3, 4], 89: [4] };
  const CRAFT_GAP = { 87: true };
  const CRAFT_SYM = { 86: { t: 10.33, items: [{ name: "Bloating", s: 1 }], last: 1, note: "" } };
  const TODAY_ENTRIES = (mode) => (mode === "new" ? [] : [
    { kind: "bm", t: null /* the seeded first visit */, form: 4, how: {}, dur: null, flags: {}, note: "" },
    { kind: "meal", t: 8.08, meal: "breakfast", text: "Oatmeal with berries, coffee", note: "" },
    { kind: "meal", t: 12.67, meal: "lunch", text: "Chicken salad", note: "" },
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
      TODAY_ENTRIES(mode).forEach((e) => day.entries.push(Object.assign({ id: nid(e.kind), d }, e, { t: e.t == null ? x.visits[0].t : e.t }, e.kind === "meal" ? { foods: L.matchFoods(e.text) } : {})));
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
        if (urg > 0) bm.note = "Sudden urge this morning.";
        else if (afterLate && r() < 0.3) bm.note = "Late dinner last night.";
        else if (menses && r() < 0.5) bm.note = `Cycle day ${x.cycleDay}.`;
      }
      day.entries.push(bm);
    });
    if (!x.visits.length) day.entries.push({ id: nid("nobm"), d, kind: "nobm", t: between(r, 20.75, 21.75) });

    /* symptoms: from the seeded check-ins. Urgency is a BM detail now; low energy logs in the morning (its own
       generator, so the meals after it don't shift) */
    if (felt.energy) { const r2 = mulberry(P.seed * 977 + d); day.entries.push({ id: nid("sym"), d, kind: "sym", t: between(r2, 8.6, 10.4), items: [{ name: "Low energy", s: 1 }], last: r2() < 0.55 ? 2 : 1, note: "" }); }
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
      let text = pick(r, SEED_MEALS[k]);
      if (k === "breakfast" && r() < 0.55) text += ", coffee";
      if (k === "dinner" && date.getDay() === 5 && r() < 0.6) text += ", a glass of wine";
      day.entries.push({ id: nid("meal"), d, kind: "meal", t, meal: k, text, foods: L.matchFoods(text), note: "" });
    };
    if (r() < 0.72) meal("breakfast", Math.max(between(r, 7.55, 8.7), x.first != null ? Math.min(9.6, x.first + 0.25) : 0));
    if (r() < 0.62) meal("lunch", between(r, 12.1, 13.6));
    if (x.lateDinner || r() < 0.8) meal("dinner", x.lateDinner ? between(r, 20.15, 21.4) : between(r, 18.3, 19.85));
    if (r() < 0.2) meal("other", between(r, 15.2, 16.4));

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
    { k: "pain", label: "Belly pain", q: "How much belly pain did you have this week?", opts: ["None", "A little", "Some", "A lot"], ticks: ["None", "A little", "Some", "A lot"], less: "Less than at first", more: "More than at first" },
    { k: "way", label: "Days it got in the way", q: "On how many days did your gut get in the way of your plans?", opts: ["None", "1 or 2 days", "3 or 4 days", "5 or more days"], ticks: ["None", "1 or 2", "3 or 4", "5+"], less: "Fewer days than at first", more: "More days than at first" },
    { k: "bloat", label: "Bloating", q: "How much bloating did you have this week?", opts: ["None", "A little", "Some", "A lot"], ticks: ["None", "A little", "Some", "A lot"], less: "Less than at first", more: "More than at first" },
    { k: "settled", label: "Bowel habits", q: "How settled did your bowel habits feel this week?", opts: ["Settled", "Mostly settled", "Up and down", "Unsettled"], ticks: ["Settled", "Mostly", "Up and down", "Unsettled"], less: "More settled than at first", more: "Less settled than at first" }
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
      /* the usual window for the first BM, from the logged first BMs of the same weeks (10th to 75th percentile, to
         the quarter hour, the studio's rule), so a day the person didn't log never shapes it */
      const firsts = days.filter((x) => x.d >= 28 && x.d <= 83 && x.logged).map((x) => x.entries.find((e) => e.kind === "bm")).filter(Boolean).map((e) => e.t);
      const tLo = Math.floor(Ut.pct(firsts, 0.1) / 0.25) * 0.25, tHi = Math.ceil(Ut.pct(firsts, 0.75) / 0.25) * 0.25;
      M.usual = { tLo, tHi, nLo: U.nLo, nHi: U.nHi, fLo: a.lo + 1, fHi: a.hi + 1, wLo: b.lo, wHi: b.hi };
      /* twelve answered Sundays (one skipped), tonight's still to come */
      M.checkins = [];
      for (let w = 0; w < 12; w++) {
        const ws = w * 7;
        M.checkins.push(w === 6 ? { w, ws, skipped: true } : { w, ws, answers: weekAnswers(A, ws), tags: [], note: "" });
      }
    }
    M.ckDay = { dow: 0, when: "evening" };
    /* this week's check-in keeps its own slot; changing ckDay moves next week's */
    M.checkin = { w: 12, ws: 84, status: "due", answers: null, tags: [], note: "", when: M.ckDay.when };
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
  /* within the person's usual: a word against the usual words (B); a step against the usual steps (A and C). A B word
     whose steps sit on both sides of the usual can't be told apart: null, never a shift */
  L.inForms = (M, x, mode) => {
    if (!M.usual) return null;
    if (mode === "B") { const w = L.wordKey(x); return w >= M.usual.wLo && w <= M.usual.wHi; }
    const s = L.stepsOf(x), n = s.filter((k) => k >= M.usual.fLo && k <= M.usual.fHi).length;
    return n === s.length ? true : n === 0 ? false : null;
  };
  L.usualFormsText = (M, mode) => {
    const u = M.usual;
    if (mode === "B") return u.wLo === u.wHi ? L.WORDS[u.wLo].word : `${L.WORDS[u.wLo].word} ${u.wHi - u.wLo === 1 ? "or" : "to"} ${L.WORDS[u.wHi].word}`;
    if (mode === "C") return u.fLo === u.fHi ? L.TYPES[u.fLo].short : `${L.TYPES[u.fLo].short} to ${L.TYPES[u.fHi].short}`;
    return u.fLo === u.fHi ? `Type ${u.fLo}` : `Types ${u.fLo} to ${u.fHi}`;
  };
  /* the Monday to Sunday week holding day d */
  L.weekOf = (d) => {
    const ws = d - ((L.dateOf(d).getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => ws + i);
  };
  L.learnDay = (M) => TODAY - M.start + 1;

  /* when this person usually logs a meal: the middle of their last 30 days, or a plain default */
  L.mealUsualTime = (M, k) => {
    const ts = [];
    M.days.filter((x) => x.d > TODAY - 30).forEach((x) => x.entries.filter((e) => e.kind === "meal" && e.meal === k && !(x.d === TODAY && e.t > L.NOW)).forEach((e) => ts.push(e.t)));
    return ts.length >= 3 ? Math.round(Ut.median(ts) * 12) / 12 : L.MEAL_DEFAULT_T[k];
  };

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
  /* one rule for the chip and the band it sits next to: inside the first weeks' range is about the same */
  L.compare = (b, i, v) => {
    if (!b) return null;
    return v < b[i].lo ? { k: "less", text: L.CHECKIN[i].less } : v > b[i].hi ? { k: "more", text: L.CHECKIN[i].more } : { k: "same", text: "About the same" };
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
      if (i >= 0) {
        const [e] = x.entries.splice(i, 1);
        /* a past day with nothing left goes back to being a gap; today just isn't over */
        if (!x.entries.length && x.d !== TODAY) x.logged = false;
        return { e, x };
      }
    }
    return null;
  };
  L.move = (M, e, d) => {
    L.remove(M, e.id);
    e.d = d;
    return L.add(M, e);
  };
})();
