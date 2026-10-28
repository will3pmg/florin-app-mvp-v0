/* Florin app refresh: the manual logs behind today's app (no hardware, no gas data; FloraScore from the logs).
   Built on the studio's seeded days (js/data-app.js), so the refresh tells the same story as the studio:
   BM times are the seeded visits, symptoms come from the seeded check-ins, late dinners stay late.
   Week before last was the rougher one; last week, the one that ends tonight, was steadier.
   Meals are seeded on their own pass, and each demo person has one dish their logs tend to follow (Insights has
   to find it). Pure JS, no DOM. Every number a screen states is computed from this, never typed. window.FLORIN_LOGS */
/* ---------- the extension hooks, before anything else runs ----------
   Feature modules load after refresh-insights.js and before refresh-app.js and register into this one object; the
   phone and the page read it when they run. Created here so it exists for every file after this one, and filled in
   key by key so a test (or a module loaded earlier) that made it first keeps what it put there. CLAUDE.md, Extension
   hooks, has the shape of each key. window.FLORIN_EXT */
(function () {
  const EXT = (window.FLORIN_EXT = window.FLORIN_EXT || {});
  [["overlays", {}], ["acts", {}], ["opens", {}], ["screens", []], ["notes", {}], ["decisions", {}], ["built", {}], ["keys", {}], ["onSet", []]].forEach(([k, d]) => { if (!EXT[k]) EXT[k] = d; });
})();

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
  /* the name a BM is counted under for "most common": in A and C a one-step BM counts under its step, so a B word that
     sits on one step joins the BMs logged as that step; a two-step word keeps its own name */
  L.formKey = (x, mode) => (mode !== "B" && L.stepsOf(x).length === 1 ? L.formName(L.stepsOf(x)[0], mode) : L.formName(x, mode));
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
    [/\b(bloody|bleed\w*)\b|\bblood\b(?! (orange|sugars?|glucose|pressure|tests?|work|panel|draw|counts?|type|donation|bank))/i, "Blood"], [/\b(black|tarry|tar-like) (stool|bm|poo)\w*|\btar-like\b|\btarry\b|\blike tar\b/i, "A black or tar-like stool"],
    [/\bfevers?\b|\bfeverish\b/i, "A fever"], [/\b(vomit\w*|threw up|throwing up)\b/i, "Vomiting"], [/\b(weight loss|lost weight|losing weight)\b/i, "Weight loss"],
    [/\bw(o|a)k(e|en|ing|es)?\b(?:(?![.;]).){0,40}?\bto (go|the bathroom|the toilet|use the bathroom)\b|\bw(o|a)k\w* (up )?(at night|in the night|overnight)\b|\bup in the night to go\b/i, "Waking at night to go"]
  ];
  /* every alarm feature a note names, clause by clause, leaving out the ones it says no to ("no blood", "without a
     fever", "didn't throw up"). Florin only names the sign; it never reads past that */
  const NEG = /\b(no|not|without|never|none|zero|didn'?t|don'?t|wasn'?t|haven'?t|hasn'?t)\b[^,;.]*$/i;
  /* the wider net, for the ways people write a sign that the words above miss (moved here from Ask Florin so a log's
     note catches them too): a stool next to black, very dark, tar or red; red in the toilet or on the paper; a
     temperature (had, running, or worried about); weight lost by the kilo or pound; being sick; up or awake in the
     night (1 to 4 AM, or most nights, two nights in a row) to go. A hedge ("not sure if that was blood") isn't read as
     a no. Ask Florin runs this same check on a question, so a note and a question hear the same phrasings */
  const STOOL = "(?:stools?|poo\\w*|bms?|bowel movements?|motions?|faeces|feces)", STOOLW = STOOL.slice(3, -1);
  /* foods a colour word often goes with, so "black coffee", "red pepper soup" or "dark chocolate" is never read as a
     stool's colour */
  const FOODX = "(?:meat|wine|peppers?|peppercorns?|onions?|beans?|lentils?|cabbage|apples?|grapes?|grapefruit|curry|sauce|velvet|food|dye|coffee|tea|olives?|rice|pudding|liquorice|licorice|chocolate|roast|beer|ale|greens|salmon|lemonade|berries|beets?|beetroot|tomato\\w*|jelly|bull|forest|cake|lady|sesame|garlic|currants?)";
  const NOFOOD = `(?![\\s-]+${FOODX}\\b)`;
  /* a stool and its colour, read across the whole sentence ("My poo was really dark, almost black"), with the no read in
     the colour's own clause, so "Stool normal colour, not black" stays a no */
  const DARK = "(?:jet black|black|tarry|tar|like tar|very dark|really dark|almost black|nearly black)";
  const STOOL_COLOUR = new RegExp(`\\b${STOOL}\\b(?:(?![.;]).){0,30}?\\b(${DARK})\\b${NOFOOD}|\\b(black|tarry|very dark|really dark|almost black|nearly black)\\b${NOFOOD}(?:(?![.;]).){0,20}?\\b${STOOL}\\b`, "i");
  /* a body temperature, read as a number: 38 to 41 in Celsius, 100 to 104 in Fahrenheit. Not the weather ("39 degrees
     outside", "it's 39 degrees") and not an angle */
  const WXB = "(?<![\\d.])(?<!\\b(?:it|it's|its|it is|it was|it got to|it hit|weather|outside|forecast)\\s+(?:about |nearly |over |almost |around )?)";
  const WXA = "(?![a-z])(?!\\s*(?:outside|out\\b|in the shade|in the sun|weather|heat|angle|turn|incline))";
  const TEMP_READ = new RegExp(`${WXB}(?:3[89]|4[01])(?:[.,]\\d+)?\\s?(?:°\\s?c?|degrees?(?:\\s?(?:c|celsius))?|c)${WXA}|${WXB}10[0-4](?:[.,]\\d+)?\\s?(?:°\\s?f?|degrees?(?:\\s?(?:f|fahrenheit))?|f)${WXA}`, "i");
  L.ALARM_WIDE = [
    [STOOL_COLOUR, "A black or tar-like stool"],
    [new RegExp(`\\bred\\b${NOFOOD}(?:(?![.;]).){0,30}?\\b(toilet|bowl|paper|tissue|wip\\w*|${STOOLW}|underwear)\\b|\\b(toilet|bowl|paper|tissue|${STOOLW})\\b(?:(?![.;]).){0,30}?\\b(red|bright red|maroon)\\b`, "i"), "Blood"],
    /* a temperature had, run or worried about, with up to three words between ("had chills and a temperature"), and
       "temp" for short ("running a temp", never "a temp job") */
    [/\b(have|had|has|got|running|ran|with|developed|getting)\b(?:\s+(?!(?:no|not|never|without|any|my|the|your|his|her|their|its|our|room|water|oven|bath|normal)\b)[\w']+){0,3}?\s+(?:a |an )?(?:high |slight |bit of a |raised |real |little )?temp(?:erature)?\b(?! (?:job|jobs|agency|role|position|contract|work|worker|staff|gig))|\bhigh temperature\b|\btemp(erature)? (of|is|was|at) \d|\b(worr\w*|concerned|anxious) about my (temperature|temp)\b|\bmy (temperature|temp) (is|was|'s|has been|keeps|went|keeps going|is going|has gone) (up|high|raised|rising)\b/i, "A fever"],
    [TEMP_READ, "A fever"],
    /* a digit can sit straight against its unit: "lost 4kg", "dropped 10lbs" */
    [/(?<!to )\b(lost|losing|lose|dropped|dropping|shed)\b(?:(?![.;]).){0,25}?(?:\b(?:weight|kgs?|kilos?|kilograms?|lbs?|pounds?|stone)|(?<=\d)(?:kgs?|kilos?|lbs?|st(?! (?:place|prize|round|game|match))))\b|\bweight (has |have |keeps )?(dropped|dropping|gone down|going down|fallen|falling)\b/i, "Weight loss"],
    [/\b(being|been|was|were|keep being|kept being|keeps being) sick\b(?! of| and tired| with)|\bpuk\w*/i, "Vomiting"]
  ];
  /* a BM's own note: the BM is the stool, so a colour on its own is a sign there ("It looked like tar", "some red in
     it"), unless a food follows it ("after black coffee"). Used with L.alarmsIn(note, { bm: true }) */
  L.ALARM_BM = [
    [new RegExp(`\\b(jet black|black|blackish|tarry|tar|like tar|tar-like|very dark|really dark|almost black|nearly black)\\b${NOFOOD}(?![\\s-]+(?:red|maroon|brown|green))`, "i"), "A black or tar-like stool"],
    [new RegExp(`\\b(bright red|dark red|blood-red|red|reddish|maroon|pink|pinkish)\\b${NOFOOD}`, "i"), "Blood"]
  ];
  const WAKE = /\b(wak\w*|woke|woken|awake|up)\b(?! late)/i, GOING = /\bto go\b|\bpoo\w*|\bbms?\b|\bbathroom\b|\btoilet\b|\bloo\b|\bbowels?\b|\burge\b/i;
  const NIGHT = /\b(at night|in the night|overnight|night-?time|middle of the night|(most|several|many|a few|a couple of|two|three|four|five) nights|nights? in a row|[1-4] ?(am|a\.m\.)|[1-4] in the morning|small hours)\b/i;
  const HEDGE = /\b(not sure|not certain|unsure|don'?t know|do not know|can'?t tell|cannot tell|not clear|no idea)\b/gi;
  /* the clause of sentence s that ends at index at, from the comma or "but" before it */
  const clauseTo = (s, at) => { const cut = s.slice(0, at).split(/,|\bbut\b/i); return cut[cut.length - 1]; };
  /* o.bm: the text is a BM's own note, so L.ALARM_BM joins the net */
  L.alarmsIn = (text, o) => {
    const out = [], add = (name) => { if (!out.includes(name)) out.push(name); };
    const rules = L.ALARM.concat(L.ALARM_WIDE.filter(([rx]) => rx !== STOOL_COLOUR), o && o.bm ? L.ALARM_BM : []);
    /* sentences end at . ; ! ? or a new line, but a decimal point ("38.5C") keeps its sentence */
    String(text || "").split(/[;!?\n]|\.(?!\d)|(?<!\d)\./).forEach((s0) => {
      const s = s0.replace(HEDGE, " ");
      /* the stool's colour, over the sentence: no when the colour's clause says no, or the stool's own does ("No BM,
         really dark day") */
      const m = STOOL_COLOUR.exec(s);
      if (m) {
        const at = m[1] ? m.index + m[0].length - m[1].length : m.index;
        if (!NEG.test(clauseTo(s, at)) && !(m[1] && NEG.test(clauseTo(s, m.index)))) add("A black or tar-like stool");
      }
      s.split(/,|\bbut\b/i).forEach((c) => {
        rules.forEach(([rx, name]) => { const k = rx.exec(c); if (k && !NEG.test(c.slice(0, k.index))) add(name); });
        const w = WAKE.exec(c);
        if (w && NIGHT.test(c) && GOING.test(c) && !NEG.test(c.slice(0, w.index))) add("Waking at night to go");
      });
    });
    return L.ALARM.map(([, n]) => n).filter((n) => out.includes(n));
  };
  /* the signs as one line: "Blood and a fever" */
  L.signText = (ss) => ss.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).reduce((a, x, i, all) => (i === 0 ? x : i === all.length - 1 ? `${a} and ${x}` : `${a}, ${x}`), "");
  L.alarmIn = (text) => { const ss = L.alarmsIn(text); return ss.length ? L.signText(ss) : null; };
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
    other: { title: "Snack or drink", recent: "snacks and drinks", save: "Save snack or drink", ph: "For example: a latte, an apple, a glass of wine" },
    /* the quick log (Will, Oct 14): the whole day in one line, said or typed */
    day: { title: "What you ate", recent: "days", save: "Save what you ate", ph: "For example: oatmeal and coffee, a chicken salad, pizza for dinner" }
  };
  L.mealLabel = (k) => (L.MEAL_COPY[k] || { title: "Meal" }).title;
  L.MEAL_DEFAULT_T = { breakfast: 8, lunch: 12.5, dinner: 18.5, other: 15.5, day: 20.5 };
  /* what someone might say into the mic for a day: that day's meals, in order, as one sentence. The prototype can't use
     the microphone, so the quick log plays this back as if dictated */
  const DINNER_SAY = { sarah: "pizza", marcus: "chicken curry with rice", alex: "salmon, rice and greens" };
  L.mealSay = (M, d) => {
    const parts = ((M.seedMeals && M.seedMeals[d]) || []).map((m) => [m.meal, m.text]);
    if (d === TODAY && L.NOW >= 18 && !parts.some(([k]) => k === "dinner")) parts.push(["dinner", DINNER_SAY[M.P.id] || "pasta"]);
    if (!parts.length) parts.push(["dinner", DINNER_SAY[M.P.id] || "pasta"]);
    const said = (t) => t.replace(/, (coffee|a glass of wine)$/i, " and $1");
    const low = (t) => t.charAt(0).toLowerCase() + t.slice(1);
    const bits = parts.map(([k, t], i) => `${i ? low(said(t)) : said(t)} ${k === "other" ? "as a snack" : `for ${k}`}`);
    return bits.length === 1 ? `${bits[0]}.` : `${bits.slice(0, -1).join(", ")}, and ${bits[bits.length - 1]}.`;
  };

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
  const TODAY_ENTRIES = (mode) => (mode === "new" || mode === "fresh" ? [] : [
    { kind: "bm", t: null /* the seeded first visit */, form: 4, how: {}, dur: null, flags: {}, note: "" },
    { kind: "meal", t: 8.08, meal: "breakfast", text: "Oatmeal with berries, coffee", note: "" },
    { kind: "meal", t: 12.67, meal: "lunch", text: "Chicken salad", note: "" },
    { kind: "sym", t: 15.17, items: [{ name: "Bloating", s: 1 }], last: 1, note: "" }
  ]);

  let seq = 0;
  const nid = (k) => `${k}${++seq}`;

  /* ---------- meals, on their own seeded pass ----------
     Meals come first, so the next day can follow them. Each demo person has one dish that, in their seeded logs,
     tends to be followed by a looser first BM and some bloating the next day. Insights isn't told which one: its
     pattern check has to find it, the way it would in real logs. The crafted week is left as written. */
  const PATTERN_DISH = { sarah: "Pizza", marcus: "Chicken curry", alex: "Burrito bowl" };
  const isGap = (P, d) => d !== TODAY && !!(CRAFT_GAP[d] || (d < 84 && mulberry(P.seed * 131 + d * 7919 + 17)() < 0.07));
  const hasDish = (P, m) => m.text.indexOf(PATTERN_DISH[P.id]) === 0;
  function mealsOf(A, d) {
    const P = A.persona, x = A.days[d], dish = PATTERN_DISH[P.id], date = L.dateOf(d);
    const r = mulberry(P.seed * 977 + d * 131 + 5);
    const out = [];
    const meal = (k, t, force) => {
      let text = force ? SEED_MEALS[k].find((o) => o.indexOf(force) === 0) : wpick(r, SEED_MEALS[k].map((o) => [o, o.indexOf(dish) === 0 ? 3 : 1]));
      if (k === "breakfast" && r() < 0.55) text += ", coffee";
      if (k === "dinner" && date.getDay() === 5 && r() < 0.6) text += ", a glass of wine";
      out.push({ kind: "meal", t, meal: k, text, foods: L.matchFoods(text), note: "" });
    };
    /* Tuesday of the crafted week: the late dinner (Alex: lunch) is the dish, so Wednesday's later, looser morning has a story */
    const crafted = d === 85 ? dish : null;
    const at = crafted ? (SEED_MEALS.lunch.some((o) => o.indexOf(crafted) === 0) ? "lunch" : "dinner") : null;
    if (r() < 0.72) meal("breakfast", Math.max(between(r, 7.55, 8.7), x.first != null ? Math.min(9.6, x.first + 0.25) : 0));
    if (r() < 0.62 || at === "lunch") meal("lunch", between(r, 12.1, 13.6), at === "lunch" ? crafted : null);
    if (x.lateDinner || r() < 0.8 || at === "dinner") meal("dinner", x.lateDinner ? between(r, 20.15, 21.4) : between(r, 18.3, 19.85), at === "dinner" ? crafted : null);
    if (r() < 0.2) meal("other", between(r, 15.2, 16.4));
    return out;
  }

  /* one day of manual logs, from one seeded day */
  function dayOf(A, d, mode, meals) {
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
    /* the morning after the person's dish (outside the crafted week): a looser first BM most times, bloating some */
    const afterDish = d < 84 && (meals[d - 1] || []).some((m) => hasDish(P, m));
    const rp = mulberry(P.seed * 53 + d * 211 + 9);

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
      if (afterDish && i === 0 && rp() < 0.8) form = Math.max(form, rp() < 0.65 ? 6 : 5);
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
    if (afterDish && !bloat && rp() < 0.75) day.entries.push({ id: nid("sym"), d, kind: "sym", t: between(rp, 9.4, 11.2), items: [{ name: "Bloating", s: 1 }], last: rp() < 0.6 ? 0 : 1, note: "" });

    /* meals, from the pass above: dinner after 8 PM on the seeded late-dinner days */
    (meals[d] || []).forEach((m) => day.entries.push(Object.assign({ id: nid("meal"), d }, m, { foods: m.foods.slice() })));

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
     mode "new": started five days ago, still learning their usual, nothing logged yet today, first check-in due.
     mode "fresh": just joined. Onboarding finished this evening, so today is day 1 of 14: nothing logged anywhere, no
     usual, no earlier day to catch up on, and, as for "new", the first check-in due tonight. */
  L.DATA = [["est", "12 weeks"], ["new", "New, day 5"], ["fresh", "Just joined"]];
  const learning = (mode) => mode === "new" || mode === "fresh";
  /* what a demo person logs for meals. Will (Oct 14): meal logging happens when things feel off, not every day.
     "all" is every day, as seeded; "rough" keeps a day's meals only when that day has a symptom logged (what someone
     writes down when things feel off); "none" logs no meals at all */
  L.MEAL_LOGS = [["all", "Every day"], ["rough", "Rough days only"], ["none", "None"]];
  const keepMeals = (days, how) => {
    if (how === "all") return;
    const sym = (d) => { const x = days.find((y) => y.d === d); return !!x && x.entries.some((e) => e.kind === "sym"); };
    days.forEach((x) => { if (how === "none" || !sym(x.d)) x.entries = x.entries.filter((e) => e.kind !== "meal"); });
  };

  L.build = (personaId, mode, opts = {}) => {
    const A = AD.get(personaId);
    const P = A.persona, U = A.U;
    const start = mode === "new" ? TODAY - 4 : mode === "fresh" ? TODAY : 0;
    const meals = {};
    for (let d = start; d < TODAY; d++) if (!isGap(P, d)) meals[d] = mealsOf(A, d);
    const days = [];
    for (let d = start; d <= TODAY; d++) days.push(dayOf(A, d, mode, meals));
    /* the seeded meals, kept aside before the meal-logs scenario drops any: the voice demo says them */
    const seedMeals = {};
    days.forEach((x) => (seedMeals[x.d] = x.entries.filter((e) => e.kind === "meal").map((e) => ({ meal: e.meal, text: e.text }))));
    keepMeals(days, opts.meals || "all");
    const M = { A, P, persona: P, mode, start, days, seq: 0, meals: opts.meals || "all", seedMeals };

    if (learning(mode)) {
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
      M.usual = { tLo, tHi, nLo: U.nLo, nHi: U.nHi, fLo: a.lo + 1, fHi: a.hi + 1, wLo: b.lo, wHi: b.hi, sym: symUsual(days) };
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
  L.inWindow = (M, t) => { const m = Math.round(t * 60) / 60; return !!M.usual && m >= M.usual.tLo && m <= M.usual.tHi; };
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

  /* ---------- reading the logs for Insights ----------
     Every number Insights states comes from here. A day that wasn't logged stays a gap, never a zero; a day logged
     as No BM is a zero; today counts as far as it has gone. A day "within your usual" had its first BM in the usual
     window, a usual number of BMs and every form within the usual forms. A BM logged in B whose word covers steps on
     both sides of the usual can't be placed: that day is "unsure", counted on neither side. A day logged with only
     symptoms or meals says nothing about BMs: "nocount", a gap on How often, never a zero. Symptoms are counted on
     their own. */
  L.RANGES = [7, 30, 90];
  L.facts = (M, x, mode) => {
    const pending = x.d === TODAY && !x.entries.length;
    const logged = !!x.logged && !pending;
    const es = logged ? x.entries : [];
    const bms = es.filter((e) => e.kind === "bm");
    const nobm = es.some((e) => e.kind === "nobm");
    const count = bms.length ? bms.length : nobm ? 0 : null; /* null: logged, but nothing said about BMs */
    const first = bms.length ? bms[0].t : null;
    const sym = {}, unrated = {};
    /* the strongest of the day; 0 when it was logged without a strength, which is never read as mild. unrated keeps the
       names with any log that had no strength, so a strength word is never claimed for them */
    es.filter((e) => e.kind === "sym").forEach((e) => e.items.forEach((i) => { sym[i.name] = Math.max(sym[i.name] || 0, i.s || 0); if (!i.s) unrated[i.name] = true; }));
    const u = M.usual;
    /* compared at the minute shown, so 7:14.7 (shown 7:15 AM) is inside a window that opens at 7:15 */
    const fMin = first != null ? Math.round(first * 60) / 60 : null;
    const inWin = u && first != null ? fMin >= u.tLo && fMin <= u.tHi : null;
    const inCount = u && count != null ? count >= u.nLo && count <= u.nHi : null;
    const fi = u && bms.length ? bms.map((b) => L.inForms(M, b, mode)) : null;
    const formsIn = !fi ? null : fi.includes(false) ? false : fi.includes(null) ? null : true;
    const state = !logged ? "none" : count == null ? "nocount" : !u ? "logged" : count > 0 && inWin && inCount ? (formsIn ? "usual" : formsIn === false ? "shifted" : "unsure") : "shifted";
    return { d: x.d, date: x.date, dow: x.dow, today: x.d === TODAY, pending, logged, bms, nobm, count, first, sym, unrated, nsym: Object.keys(sym).length, meals: es.filter((e) => e.kind === "meal"), inWin, inCount, formsIn, state };
  };
  L.span = (M, n, mode) => { const d0 = Math.max(M.start, TODAY - n + 1); return M.days.filter((x) => x.d >= d0).map((x) => L.facts(M, x, mode)); };
  /* the stretch just before, for "more or less often". 90 days compares your last 30 with your first 30 */
  L.prevSpan = (M, n, mode) => {
    const of = (a, b) => M.days.filter((x) => x.d >= Math.max(M.start, a) && x.d <= b).map((x) => L.facts(M, x, mode));
    if (n >= 90) return { cur: L.span(M, 30, mode), prev: of(M.start, M.start + 29), cur30: true, label: "your first 30 days" };
    return { cur: L.span(M, n, mode), prev: of(TODAY - 2 * n + 1, TODAY - n), label: n === 7 ? "the week before" : `the ${n} days before` };
  };
  /* a dinner logged at 8 PM or later */
  L.lateDinner = (M, d) => { const x = L.day(M, d); return !!x && x.logged && x.entries.some((e) => e.kind === "meal" && e.meal === "dinner" && e.t >= 20); };
  /* how often symptoms came up in the weeks the usual comes from (days 28 to 83) */
  const symUsual = (days) => {
    const base = days.filter((x) => x.d >= 28 && x.d <= 83 && x.logged);
    const n = base.filter((x) => x.entries.some((e) => e.kind === "sym")).length;
    const share = n / Math.max(1, base.length);
    return { share, n, of: base.length, every: share ? Math.max(1, Math.round(1 / share)) : null };
  };

  /* ---------- possible patterns, over the last 90 days ----------
     A food is checked once it has come up 5 times. To show, a pattern has to hold 5 or more times, most of the time
     (6 in 10 or more), and far more often than on other days: a one-sided binomial test against the other days'
     rate, at 1 in 100, because Florin runs twenty or more of these checks at once and a looser bar names foods by
     chance (it did, on 30 days of Alex's logs: pasta, 5 of 5). Seen together is all a pattern ever claims. */
  L.LOOSE_AT = 5; /* step 5 or looser: Type 5 in A, Loose or Watery in B, Soft or looser in C */
  L.isLoose = (e) => Math.min(...L.stepsOf(e)) >= L.LOOSE_AT;
  L.PATTERN_DAYS = 90;
  L.PATTERN_BAR = { n: 5, rate: 0.6, p: 0.01 };
  L.MEAL_COVER = 0.6; /* share of logged days with a meal before meal patterns are read */
  L.FOOD_CHECK_DAYS = 14;
  const choose = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i; return c; };
  /* the chance of k or more of n by luck alone, if each held as often as on other days */
  const tail = (k, n, p) => { let s = 0; for (let i = k; i <= n; i++) s += choose(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i); return s; };
  L.patterns = (M, mode) => {
    const d0 = Math.max(M.start, TODAY - L.PATTERN_DAYS + 1);
    const F = {};
    M.days.forEach((x) => (F[x.d] = L.facts(M, x, mode)));
    const prev = (f) => F[f.d - 1];
    const days = Object.values(F).filter((f) => f.d >= d0 && f.logged && prev(f) && prev(f).logged);
    const mornings = days.filter((f) => f.first != null);
    const B = L.PATTERN_BAR;
    const test = (id, kind, food, cond, pool, hitOf, valOf) => {
      const occ = [], oth = [];
      pool.forEach((f) => (cond(prev(f)) ? occ : oth).push({ d: f.d, hit: hitOf(f), v: valOf(f) }));
      const hit = occ.filter((o) => o.hit).length, oh = oth.filter((o) => o.hit).length;
      const rate = hit / Math.max(1, occ.length), orate = oh / Math.max(1, oth.length);
      const p = tail(hit, occ.length, (oh + 1) / (oth.length + 2));
      const show = occ.length >= B.n && rate >= B.rate && rate > orate && p < B.p;
      return { id, kind, food, occ, oth, n: occ.length, hit, rate, on: oth.length, oh, orate, p, show, tier: occ.length >= 8 && rate >= 0.7 ? { k: 3, label: "Consistent" } : { k: 2, label: "Showing up often" } };
    };
    const tests = [];
    /* dinners after 8 PM, against dinners before 8: was the next first BM later than the usual window? */
    const dinnered = mornings.filter((f) => prev(f).meals.some((m) => m.meal === "dinner"));
    const lateCount = Object.values(F).filter((f) => f.d >= d0 - 1 && f.d < TODAY && L.lateDinner(M, f.d)).length;
    if (M.usual) tests.push(test("late", "late", null, (p) => p.meals.some((m) => m.meal === "dinner" && m.t >= 20), dinnered, (f) => f.first > M.usual.tHi, (f) => f.first));
    /* each food with 5 or more logs: a looser first BM the next morning (the first BM is the entry, so a word logged
       in B counts by its steps), and bloating the next day */
    const counts = L.foodCounts(M, L.PATTERN_DAYS);
    const foods = Object.keys(counts).filter((f) => L.FOOD_NAMES[f]);
    const checked = foods.filter((f) => counts[f] >= 5).sort((a, b) => counts[b] - counts[a]);
    const waiting = foods.filter((f) => counts[f] < 5).sort((a, b) => counts[b] - counts[a]);
    const ate = mornings.filter((f) => prev(f).meals.length), ateDays = days.filter((f) => prev(f).meals.length);
    checked.forEach((food) => {
      const has = (p) => p.meals.some((m) => (m.foods || []).includes(food));
      tests.push(test(`${food}:loose`, "loose", food, has, ate, (f) => L.isLoose(f.bms[0]), (f) => f.bms[0]));
      tests.push(test(`${food}:bloat`, "bloat", food, has, ateDays, (f) => f.sym.Bloating != null, (f) => (f.sym.Bloating != null ? f.sym.Bloating : null)));
    });
    /* meals logged on only some days (most often the rough ones) leave no ordinary days to compare with, and name
       foods by selection alone (in testing, Sarah with meals kept around rough days: toast, 13 of 19). Under 60% of
       logged days with a meal, every meal pattern, late dinners included, is held back and Insights offers a food check */
    /* coverage is counted once, over the days logged in the 90-day window (not the pairs the tests use), so the gate
       and every sentence about it say the same thing: "Meals are logged on 36 of the 85 days you logged in the last 90
       days". withMeal and logged are the same counts, kept under their old names */
    const window = TODAY - d0 + 1;
    const inWin = Object.values(F).filter((f) => f.d >= d0 && f.logged);
    const loggedDays = inWin.length, mealDays = inWin.filter((f) => f.meals.length).length, roughMeal = inWin.filter((f) => f.meals.length && f.nsym).length;
    const coverage = loggedDays ? mealDays / loggedDays : 0;
    const sparse = coverage < L.MEAL_COVER;
    const shown = sparse ? [] : tests.filter((t) => t.show);
    const found = shown.sort((a, b) => b.tier.k - a.tier.k || b.rate - a.rate || b.n - a.n);
    const quiet = sparse ? [] : checked.filter((food) => !found.some((t) => t.food === food));
    return { found, tests, checked: sparse ? [] : checked, quiet, waiting: sparse ? [] : waiting, counts, lateCount, d0, coverage, sparse, mealDays, loggedDays, window, withMeal: mealDays, logged: loggedDays, roughShare: mealDays ? roughMeal / mealDays : 0 };
  };

  /* ---------- FloraScore, from manual logs ----------
     The studio's FloraScore rebuilt for logs. Four parts, each 0 to 100 against the person's own usual: Timing (the first
     BM against the usual window), How often (BMs against the usual count), Form (BMs within the usual forms) and Comfort
     (symptoms that day). Weighted as the studio weights its four (30, 25, 25, 20), blended over the last 3 days that have
     logs, then mapped the way the studio maps it. A day with nothing said about BMs is left out, never scored as a zero;
     fewer than 2 such days in the last 3 means no score that day. There is no score until there's a usual (day 14).
     A symptom logged without a strength weighs like the lightest one in Comfort, and is never called mild. Every number
     is read against the person's own usual range, never as a grade. */
  L.SCORE_W = { timing: 0.3, often: 0.25, form: 0.25, comfort: 0.2 };
  L.SCORE_PARTS = [
    ["timing", "Timing", "How close your first BM came to your usual window"],
    ["often", "How often", "BMs a day compared with your usual"],
    ["form", "Form", "How many BMs sat within your usual forms"],
    ["comfort", "Comfort", "Symptoms you logged, and how strong"]
  ];
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const mapScore = (raw) => 63 + ((raw - 80) * 21) / 16;
  L.dayParts = (M, x, mode) => {
    const u = M.usual;
    if (!u || !x) return null;
    const f = L.facts(M, x, mode);
    if (!f.logged || f.count == null) return null;
    const mid = (u.tLo + u.tHi) / 2;
    const timing = f.first == null ? 55 : f.inWin ? 100 - Math.abs(f.first - mid) * 7 : cl(88 - (f.first < u.tLo ? u.tLo - f.first : f.first - u.tHi) * 32, 40, 88);
    const often = f.count === 0 ? 55 : f.count >= u.nLo && f.count <= u.nHi ? 97 : f.count === u.nHi + 1 ? 76 : 62;
    let form = 60;
    if (f.bms.length) { const s = f.bms.map((b) => L.inForms(M, b, mode)); form = 62 + 36 * (s.reduce((a, v) => a + (v === true ? 1 : v === null ? 0.5 : 0), 0) / s.length); }
    const ss = Object.values(f.sym), mx = ss.length ? Math.max(...ss.map((s) => s || 1)) : 0;
    const comfort = [97, 82, 67, 55][mx];
    return { timing, often, form, comfort };
  };
  L.score = (M, d, mode) => {
    if (!M.usual) return null;
    /* a day with no BM logged has no FloraScore of its own: it would only repeat the days around it. Today counts as far
       as it has gone */
    if (d !== TODAY && !L.dayParts(M, L.day(M, d), mode)) return { d, value: null, n: 0 };
    const P = [];
    for (let k = d; k > d - 3 && k >= M.start; k--) { const p = L.dayParts(M, L.day(M, k), mode); if (p) P.push(p); }
    if (P.length < 2) return { d, value: null, n: P.length };
    const parts = {};
    Object.keys(L.SCORE_W).forEach((k) => (parts[k] = Ut.mean(P.map((p) => p[k]))));
    const raw = Object.keys(L.SCORE_W).reduce((s, k) => s + L.SCORE_W[k] * parts[k], 0);
    return { d, value: cl(Math.round(mapScore(raw)), 0, 100), parts, raw, n: P.length };
  };
  /* the usual range: the middle 70% of the person's daily scores in the weeks the other usuals come from */
  L.scoreUsual = (M, mode) => {
    if (!M.usual) return null;
    const v = [];
    for (let d = Math.max(28, M.start); d <= 83; d++) { const s = L.score(M, d, mode); if (s && s.value != null) v.push(s.value); }
    return v.length >= 7 ? [Math.round(Ut.pct(v, 0.15)), Math.round(Ut.pct(v, 0.85))] : null;
  };
  L.scoreSeries = (M, n, mode) => { const out = []; for (let d = Math.max(M.start, TODAY - n + 1); d <= TODAY; d++) out.push(L.score(M, d, mode) || { d, value: null }); return out; };
  /* what moved it: this week's average of each part against last week's, in score points */
  L.scoreMoved = (M, mode) => {
    if (!M.usual) return null;
    const avg = (a, b) => { const s = []; for (let d = a; d <= b; d++) { const x = L.score(M, d, mode); if (x && x.value != null) s.push(x); } return s; };
    const wk = avg(84, TODAY), lw = avg(77, 83);
    if (!wk.length || !lw.length) return null;
    const mean = (s, k) => Ut.mean(s.map((x) => (k ? x.parts[k] : x.value)));
    const f = 21 / 16;
    const parts = Object.keys(L.SCORE_W).map((k) => ({ key: k, weight: L.SCORE_W[k], now: Math.round(mean(wk, k)), before: Math.round(mean(lw, k)), delta: f * L.SCORE_W[k] * (mean(wk, k) - mean(lw, k)) }));
    /* the change is the difference of the two averages as they're shown, so "+8" always sits next to 76 and 84 (the
       data looks use the same rule). wk and lw stay unrounded for the waterfall's geometry */
    const wkR = Math.round(mean(wk)), lwR = Math.round(mean(lw));
    return { wk: mean(wk), lw: mean(lw), wkR, lwR, delta: wkR - lwR, parts };
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
