/* Florin app refresh: Ask Florin, interactive. A feature module (CLAUDE.md, Extension hooks): it registers into
   window.FLORIN_EXT and wraps RU.ask for Member. Free keeps the core's lock and paywall. It never edits a core file.

   The chat keeps its messages in the phone's state (api.S.askx), tied to the model, so a new person or new logs start a
   new chat. Each question goes through four steps, in this order:
   1. Alarm words (L.alarmsIn): the Teal When to see a clinician answer. Primary care first, the urgent-care line, the
      sign named and never interpreted. The question is never sent to Claude.
   2. A request to diagnose, prescribe, dose or predict, to name a condition or to say what to cut out or still eat: a
      fixed, kind redirect to what the logs show and to a clinician. A question that names mucus gets the clinician
      answer, led by the flag note's own line, and isn't sent either.
   3. Claude, through the sample capability, on the viewer's own Claude account: a rules turn with a facts packet worked
      out from the model, then the conversation. The answer streams into its bubble, Stop aborts it, and once it's in,
      the claims check (window.FLORIN_REFRESH_CHECK) and a numbers check (every number must be one the facts state) run
      on it. If either fails, the computed answer takes its place, noted quietly. Never retried from code.
   4. Computed answers: intent matching, composed from the model's numbers, with a small chart from the FLC kit. Used
      whenever sample is null (a local file, a test, a host without it, not granted) and as the fallback.
   Every answer lists the numbers it used under From your logs, then the fine print. window.FLORIN_ASK holds the engine,
   for the checks in work/behave.js.

   Will, Nov 5 ("a little dull", "more compact, easy to read on phone"): the chat is built to the coach spec in
   claude/Florin DESIGN.md. Before anything is asked, an opening read: a chart of the person's own logs and two
   sentences, then the questions to start as compact chips. Each turn: the Ask token and a folded "Looked at N things in
   your logs" (the From your logs lines), one source line from the Florin journal, the reply in Lora, then one bold
   question that hands the turn back. The question offers one more thing to look at, and "yes" asks it ("no" gets a
   short reply). Options (up to three option rows) come about one turn in three, then thumbs up and down with the fine
   print, and the composer pinned at the bottom. Claude is asked for the reply and one question, and the checks run on
   both. The alarm turn keeps the spec: the Teal banner, no source, no options, primary care first, a report to bring.
   What Ask Florin knows (a sheet from the header) lists what every answer reads and what can be left out of this chat,
   and holds the opt-in "Let Ask Florin start a conversation". */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, AD = window.FLORIN_APP, RU = window.FLORIN_RUI, C = window.FLC, EXT = window.FLORIN_EXT;
  if (!FL || !L || !AD || !RU || !C || !EXT) return;
  const MOD = "refresh-ask (Ask Florin, interactive)";
  const warn = (what, e) => { try { console.warn(`Florin module ${MOD}: ${what}`, e); } catch (x) { /* no console */ } };
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, TODAY = L.TODAY;

  /* rules of the model that the facts state as numbers: L.score blends the days among the last 3 that have a BM, or No
     BM, logged, and needs 2 of them; a dinner from 8 PM is a late one (L.lateDinner), and a pattern reads Consistent
     from 8 times (L.patterns) */
  const BLEND = L.BLEND, BLEND_MIN = L.BLEND_MIN, LATE_H = 20, CONSISTENT = 8;
  const MAXQ = 400;

  /* ---------- small helpers ---------- */
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : "");
  const upper1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const join = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const short = (d) => { const x = L.dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const hm = (h) => T(h).replace(/ (AM|PM)$/, "");
  const winText = (u) => `${hm(u.tLo)} to ${T(u.tHi)}`;
  const one = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const lg = (sw, text) => `<span><i class="sw ${sw}"></i>${esc(text)}</span>`;
  const svgIc = (p) => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${p}</svg>`;
  const SEND = '<path d="M10 16V4.5M5 9.5l5-5 5 5"/>', STOP = '<rect x="6" y="6" width="8" height="8" rx="1.5"/>';
  /* the turn's own small marks: thumbs (the down one is the up one turned over), an open book for the Florin journal,
     and a card of notes for What Ask Florin knows */
  const THUMB = '<path d="M6.5 9.2v7.3H4.2a.7.7 0 0 1-.7-.7V9.9a.7.7 0 0 1 .7-.7zM6.5 9.2l3.1-5c.9-.1 1.8.6 1.7 1.6l-.4 2.8H15a1.5 1.5 0 0 1 1.5 1.8l-1 5a1.5 1.5 0 0 1-1.5 1.1H6.5"/>';
  const THUMBS = { up: THUMB, down: `<g transform="rotate(180 10 10)">${THUMB}</g>` };
  const BOOK = '<path d="M10 5.6C8.4 4.4 6.1 4.1 3.5 4.4v10.8c2.6-.3 4.9 0 6.5 1.3 1.6-1.3 3.9-1.6 6.5-1.3V4.4c-2.6-.3-4.9 0-6.5 1.2zM10 5.6v10.9"/>';
  const MEM = '<rect x="3.5" y="4" width="13" height="12" rx="3"/><path d="M7 8.5h6M7 11.5h3.5"/>';
  /* the Ask token: the Ask glyph on a disc (refresh-ask.css). Decorative: the words beside it say Ask Florin */
  const tok = (cls) => `<span class="ap-askt${cls ? ` ${cls}` : ""}" aria-hidden="true">${RU.icon("chat")}</span>`;
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  /* the fine print under each turn says where the answer came from; the chat's own foot says it isn't a clinician */
  const FINE = "Worked out from your logs on this phone.";
  const FINE_SYM = `${FINE} If a symptom is new for you or keeps showing up, talk to a clinician.`;
  const FINE_CLAUDE = "Written by Claude from your logs' numbers, and checked against Florin's rules.";
  const CHECKED = "Checked against Florin's rules";
  const PARTN = Object.fromEntries(L.SCORE_PARTS.map(([k, l]) => [k, l]));
  /* the days Florin needs to compare with, in Florin's own word: never good days, a word DESIGN.md keeps out of the data */
  const ORD = "ordinary days";
  /* meal coverage in the words Insights and the data looks use, from the same counts as the 60% gate (L.patterns):
     "36 of the 85 days you logged in the last 90 days" */
  const COVER = (PR) => `${PR.mealDays} of the ${plural(PR.loggedDays, "day")} you logged in the last ${PR.window} days`;
  /* foods by name (the ones Florin reads, L.FOOD_NAMES) and the words people use for what they eat or drink, for the
     food redirect and the check on Claude's answers. A food word has to follow the verb, so "Can I skip a day of
     logging?" and "Should I quit logging dinner?" stay questions about the app */
  const FOODW = Object.keys(L.FOOD_NAMES).concat(Object.values(L.FOOD_NAMES).map((n) => n[0].toLowerCase()), ["food", "meal", "dinner", "lunch", "breakfast", "snack", "drink", "dairy", "gluten", "wheat", "sugar", "alcohol", "caffeine", "meat", "coffee", "bread", "cheese", "chocolate", "beer", "wine", "soda", "fruit", "vegetable", "veg", "fibre", "fiber", "lactose", "carbs", "takeaway", "takeout"])
    .filter((w, i, all) => all.indexOf(w) === i).sort((a, b) => b.length - a.length).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const FOOD_ADJ = "spicy|fried|fatty|greasy|sugary|processed|fizzy|sweet|rich|red|junk|fast|late|big|heavy";

  /* the same words the Insights cards use, so the chat reads like the screens it sits next to */
  /* FloraScore's own words, "in its usual range" (the core's RU.scoreRel), so a score never reads like a day within
     your usual */
  const relOf = (v, su) => (RU.scoreRel ? RU.scoreRel(v, su) : v == null || !su ? null : v < su[0] ? (su[0] - v >= 6 ? "Below its usual range" : "A little below its usual range") : v > su[1] ? (v - su[1] >= 6 ? "Above its usual range" : "A little above its usual range") : "In its usual range");
  const symUsual = (u) => (!u || !u.sym ? "" : u.sym.every == null ? "rarely" : u.sym.every <= 1 ? "on most days" : `about 1 day in ${u.sym.every}`);
  const foodName = (f) => (L.FOOD_NAMES[f] || [upper1(f), false])[0];
  const patTitle = (p) => (p.kind === "late" ? "Later dinners, later first BMs" : p.kind === "loose" ? `${foodName(p.food)}, then a looser first BM` : `${foodName(p.food)}, then bloating the next day`);
  const patTry = (p) => (p.kind === "late" ? `To test it, try a few evenings with dinner before ${LATE_H - 12} PM and compare the mornings after.` : `To test it, keep logging ${foodName(p.food).toLowerCase()} as you usually would, with a word on how much.`);
  const ckOf = (M) => {
    const b = L.baseline(M), done = M.checkins.filter((c) => c.answers);
    const cur = M.checkin.status === "done" ? Object.assign({ w: 12, ws: 84 }, M.checkin) : null;
    const latest = cur || done[done.length - 1] || null;
    const cmp = latest && b ? L.CHECKIN.map((q, i) => L.compare(b, i, latest.answers[i])) : null;
    return { b, done, cur, latest, cmp };
  };
  const ckHead = (K) => {
    const moved = K.cmp.map((c, i) => ({ c, i })).filter((o) => o.c.k !== "same");
    if (!moved.length) return "About the same as your first weeks";
    const word = (o) => ({ pain: o.c.k === "less" ? "less belly pain" : "more belly pain", way: o.c.k === "less" ? "fewer days in the way" : "more days in the way", bloat: o.c.k === "less" ? "less bloating" : "more bloating", settled: o.c.k === "less" ? "more settled" : "less settled" }[L.CHECKIN[o.i].k]);
    return `${upper1(join(moved.slice(0, 2).map(word)))} than at first`;
  };
  const entryLine = (M, e, mode) => {
    if (e.kind === "bm") { const s = M.usual ? L.inForms(M, e, mode) : undefined; return `BM, ${L.formName(e, mode)}${s === true ? ", within their usual forms" : s === false ? ", outside their usual forms" : s === null ? ", could sit either side of their usual" : ""}`; }
    if (e.kind === "sym") {
      const ss = e.items.map((i) => i.s).filter(Boolean), names = join(e.items.map((i, k) => (k ? i.name.toLowerCase() : i.name)));
      return `${names}, ${ss.length ? L.STRENGTH[Math.max(...ss) - 1].toLowerCase() : "strength not said"}${e.last != null ? `, ${L.LASTED[e.last].toLowerCase()}` : ""}`;
    }
    if (e.kind === "meal") return `${L.mealLabel(e.meal)}: ${e.text}`;
    return "No BM";
  };

  /* ============================== READING THE LOGS ==============================
     One stretch of days, the way the Insights cards read it (L.span and L.facts): a gap stays a gap, No BM is a zero.
     A flagged today (L.facts' "flag") is noted for a clinician: counted as logged, read on no side, and said */
  function spanRead(M, mode, n, k) {
    const u = M.usual, d0 = Math.max(M.start, TODAY - n + 1), full = d0 === TODAY - n + 1;
    const F = L.span(M, n, mode), live = F.filter((f) => !f.pending), logged = live.filter((f) => f.logged);
    const within = F.filter((f) => f.state === "usual").length, shifted = F.filter((f) => f.state === "shifted").length;
    const R0 = F.filter((f) => !f.flag), flag = F.some((f) => f.flag);
    const morn = R0.filter((f) => f.first != null), firsts = morn.map((f) => f.first);
    /* compared at the minute shown, as L.facts reads the window: a first BM at 7:14:53 shows as 7:15 AM, inside a window
       that opens at 7:15, so later and earlier add up with the ones in it (fix-viz, Oct 28) */
    const mins = (h) => Math.round(h * 60) / 60;
    const later = u ? morn.filter((f) => mins(f.first) > u.tHi) : [], earlier = u ? morn.filter((f) => mins(f.first) < u.tLo) : [];
    const known = R0.filter((f) => f.count != null), total = known.reduce((s, f) => s + f.count, 0);
    const bms = R0.flatMap((f) => f.bms);
    const st = u ? bms.map((b) => L.inForms(M, b, mode)) : [];
    const outB = u ? bms.filter((b, i) => st[i] === false) : [];
    const firmer = outB.filter((b) => (mode === "B" ? L.wordKey(b) < u.wLo : Math.max(...L.stepsOf(b)) < u.fLo)).length;
    const tally = {};
    bms.forEach((b) => { const k = L.formKey(b, mode); tally[k] = (tally[k] || 0) + 1; });
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]), tt = ranked[0];
    const withSym = logged.filter((f) => f.nsym), names = {};
    withSym.forEach((f) => Object.keys(f.sym).forEach((k) => (names[k] = (names[k] || 0) + 1)));
    const symRows = Object.entries(names).sort((a, b) => b[1] - a[1] || L.SYMPTOMS.indexOf(a[0]) - L.SYMPTOMS.indexOf(b[0])).map(([name, k]) => ({ name, n: k }));
    return {
      k, n, d0, full, flag, lbl: full ? `in the last ${n} days` : "so far", span: RU.spanText(d0, TODAY),
      days: live.length, logged: logged.length, within, shifted, known: within + shifted,
      mornings: morn.length, inW: u ? morn.filter((f) => f.inWin).length : null, later: later.length, earlier: earlier.length,
      laterAfterLate: later.filter((f) => L.lateDinner(M, f.d - 1)).length,
      med: firsts.length ? Ut.median(firsts) : null, lo: firsts.length ? Math.min(...firsts) : null, hi: firsts.length ? Math.max(...firsts) : null,
      countDays: known.length, total, avg: known.length ? total / known.length : null, inC: u ? known.filter((f) => f.inCount).length : null,
      zero: known.filter((f) => f.count === 0).length, busy: u ? known.filter((f) => f.count > u.nHi).length : 0, gaps: F.filter((f) => f.count == null && !f.pending).length,
      bms: bms.length, inF: st.filter((s) => s === true).length, out: outB.length, unsure: st.filter((s) => s === null).length, firmer, looser: outB.length - firmer,
      top: tt ? { label: tt[0], count: tt[1] } : null, ranked, withSym: withSym.length, symRows, F,
      meals: F.reduce((s, f) => s + f.meals.length, 0), mealDays: logged.filter((f) => f.meals.length).length
    };
  }

  /* The facts packet: every number Ask Florin may state, worked out from the model, in sections of [label, value]
     lines. Claude reads it as text; a computed answer names the lines it used; the numbers check reads it as a set. */
  /* o.forget: what the person left out of this chat in What Ask Florin knows (name, today, ck, chat) */
  function read(M, V, ctx, o = {}) {
    const fg = o.forget || {};
    const mode = V.form, u = M.usual, ck = RU.ckOn(V) && !fg.ck;
    const X = {}, secs = [];
    let sec = null;
    /* a line in one of the stretches keeps which stretch it is, for From your logs ("Days logged, last 7 days") */
    let scope = null;
    const S = (title, sc) => { sec = { title, ids: [] }; secs.push(sec); scope = sc || null; };
    const f = (id, label, value) => { if (value == null || value === "") return; X[id] = [label, String(value), scope]; sec.ids.push(id); };
    const R = { M, V, mode, u, ck, learning: !u, day: L.learnDay(M), X, secs, forget: fg, who: fg.name ? "this person" : M.P.name };
    const now = L.dateOf(TODAY);
    R.entries = M.days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0);
    R.since = M.start === TODAY ? "today" : short(M.start);
    S("About these logs");
    if (!fg.name) f("who", "Whose logs", M.P.name);
    f("now", "Now", `${Ut.DOWL[now.getDay()]}, ${short(TODAY)}, ${T(L.NOW)}`);
    f("since", "Logging since", R.since);
    f("entries", "Entries logged", R.entries);
    if (!u) f("learn", "Learning their usual", `day ${R.day} of ${L.LEARN_DAYS}`);
    f("words", "Consistency is logged as", mode === "A" ? "types 1 to 7" : `${mode === "B" ? "five" : "seven"} words: ${join(mode === "B" ? L.WORDS.map((w) => w.word) : L.TYPES.slice(1).map((t) => t.short))}`);
    if (u) {
      R.win = winText(u); R.formText = L.usualFormsText(M, mode); R.su = L.scoreUsual(M, mode);
      R.uFrom = short(Math.max(28, M.start)); R.uTo = short(83);
      S(`Their usual, from their logs ${R.uFrom} to ${R.uTo}`);
      f("u.win", "First BM usually comes", R.win);
      f("u.n", "BMs a day, usually", `${u.nLo} to ${u.nHi}`);
      f("u.form", "Usual forms", R.formText);
      f("u.sym", "Symptoms, usually", symUsual(u));
      if (R.su) f("u.score", "FloraScore usual range", `${R.su[0]} to ${R.su[1]}`);
    }
    /* the last 7 days and the last 30, and the last 90 when the card they asked from reads 90; while Florin is learning
       they're the same days, said once. R.cs is the stretch the card they tapped reads, so its answer reads it too */
    /* meals logged on few days (L.patterns' sparse): dinners are too few to read, so no count of late dinners is stated,
       as Insights holds it back (fix-viz, Oct 28) */
    const sparse = !!u && L.patterns(M, mode).sparse;
    R.w = spanRead(M, mode, 7, "w");
    const m = spanRead(M, mode, 30, "m");
    R.m = m.d0 === R.w.d0 ? R.w : m;
    R.mk = R.m.k;
    R.q = null;
    if (u && ctx && ctx.range === 90) { const q = spanRead(M, mode, 90, "q"); R.q = q.d0 === R.m.d0 ? R.m : q; }
    R.cs = ctx ? (!u || ctx.range === 7 ? R.w : ctx.range === 90 && R.q ? R.q : ctx.range === 30 ? R.m : null) : null;
    [R.w, R.m, R.q].filter((s, i, all) => s && all.indexOf(s) === i).forEach((s) => {
      const k = s.k;
      S(s.full ? `Last ${s.n} days, ${s.span}` : `So far, ${s.span}`, s.full ? `last ${s.n} days` : "so far");
      f(`${k}.logged`, "Days logged", s.days ? `${s.logged} of ${s.days}` : "none yet");
      if (u && s.known) f(`${k}.within`, "Days within their usual (first BM in the window, a usual count, usual forms)", `${s.within} of ${s.known}`);
      if (u && s.flag) f(`${k}.flag`, "Today", "a log is noted for a clinician, so today isn't read against their usual or counted in these lines");
      if (s.mornings) f(`${k}.morn`, u ? "First BMs in their usual window" : "Days with a first BM logged", u ? `${s.inW} of ${s.mornings}` : s.mornings);
      if (u && s.later) f(`${k}.later`, "First BMs later than the window", s.later);
      if (u && s.laterAfterLate && !sparse) f(`${k}.lateafter`, `Of those, after a dinner past ${LATE_H - 12} PM`, `${s.laterAfterLate} of ${s.later}`);
      if (u && s.earlier) f(`${k}.earlier`, "First BMs earlier than the window", s.earlier);
      if (s.mornings) f(`${k}.med`, "Typical first BM", T(s.med));
      if (s.mornings > 1) f(`${k}.span`, "First BMs logged", `from ${T(s.lo)} to ${T(s.hi)}`);
      f(`${k}.bms`, "BMs logged", s.bms);
      if (s.countDays) f(`${k}.cd`, "Days with BMs, or No BM, logged", s.countDays);
      if (s.countDays && s.bms) f(`${k}.avg`, "BMs a day, on average", one(s.avg));
      if (u && s.countDays) f(`${k}.inc`, "Days with a usual count", `${s.inC} of ${s.countDays}`);
      if (u && s.busy) f(`${k}.busy`, `Days with more than ${u.nHi}`, s.busy);
      if (s.zero) f(`${k}.zero`, "Days logged as No BM", s.zero);
      if (s.gaps) f(`${k}.gaps`, "Days with no BMs logged, left as gaps rather than zeros", s.gaps);
      if (u && s.bms) f(`${k}.forms`, "BMs within their usual forms", `${s.inF} of ${s.bms - s.unsure}`);
      if (u && s.firmer) f(`${k}.firmer`, "BMs firmer than usual", s.firmer);
      if (u && s.looser) f(`${k}.looser`, "BMs looser than usual", s.looser);
      if (u && s.unsure) f(`${k}.unsure`, "BMs logged as a word that could sit either side", s.unsure);
      if (s.top) f(`${k}.top`, "Most common form", `${s.top.label}, ${s.top.count} of ${s.bms}`);
      if (s.logged) f(`${k}.sym`, "Days with symptoms", `${s.withSym} of ${s.logged}`);
      if (s.symRows.length) f(`${k}.symtop`, "Symptoms logged most", join(s.symRows.slice(0, 3).map((r) => `${r.name.toLowerCase()} on ${plural(r.n, "day")}`)));
      if (s.logged) f(`${k}.meals`, "Meals logged", s.meals ? `${s.meals}, on ${s.mealDays} of ${s.logged} days` : "none");
    });
    scope = null;
    const fc = L.foodCounts(M, 30);
    R.foods = Object.entries(fc).filter(([k]) => L.FOOD_NAMES[k]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (R.foods.length) f("foods", R.m === R.w ? "Foods logged most so far" : "Foods logged most, last 30 days", join(R.foods.map(([k, c]) => `${foodName(k).toLowerCase()} ${c}`)));

    S("FloraScore");
    if (u) {
      const s = L.score(M, TODAY, mode), mv = L.scoreMoved(M, mode);
      R.score = s && s.value != null ? s.value : null; R.mv = mv;
      /* a flag today: the score keeps its number, read against nothing, as Today's hero says */
      R.flag = RU.flagToday(M); R.rel = R.flag ? null : relOf(R.score, R.su);
      /* L.score counts the days among the last 3 with a BM, or No BM, logged (a day with only meals or symptoms isn't
         one), and today counts once it has one */
      R.sN = s ? s.n : 0; R.todayIn = !!L.dayParts(M, L.day(M, TODAY), mode);
      f("s.today", "Today", R.score == null ? `not scored: a BM, or No BM, is logged on ${R.sN} of the last ${BLEND} days, and it needs ${BLEND_MIN}` : `${R.score}${R.flag ? ", not read against their usual today: a log is noted for a clinician" : R.rel ? `, ${lower1(R.rel)}` : ""}`);
      if (mv) {
        f("s.avg", "Weekly averages", `${Math.round(mv.wk)} this week, ${Math.round(mv.lw)} last week`);
        f("s.delta", "This week against last", mv.delta === 0 ? "the same, on average" : `${plural(Math.abs(mv.delta), "point")} ${mv.delta > 0 ? "above" : "below"}, on average`);
        mv.parts.forEach((p) => f(`s.p.${p.key}`, `${PARTN[p.key]}, ${Math.round(p.weight * 100)}% of the score`, `${p.now} this week, ${p.before} last week`));
        /* in whole points (L.scoreMoved's pts, which add up to the change shown), every part tied for the most named, as
           the Insights card says it (fix-viz, Oct 28: "adding 2.0 points", and one part named on a tie) */
        const mx = Math.max(0, ...mv.parts.map((p) => Math.abs(p.pts)));
        R.tops = mx ? mv.parts.filter((p) => Math.abs(p.pts) === mx) : [];
        R.top = R.tops[0] || null;
        R.room = mv.parts.slice().sort((a, b) => a.now - b.now)[0];
        R.mostText = !R.top ? "" : R.tops.length > 1 && !R.tops.every((p) => Math.sign(p.pts) === Math.sign(R.top.pts))
          ? join(R.tops.map((p) => `${PARTN[p.key].toLowerCase()} ${p.pts > 0 ? "added" : "took off"} ${plural(mx, "point")}`))
          : `${join(R.tops.map((p) => PARTN[p.key].toLowerCase()))}, ${R.top.pts > 0 ? "adding" : "taking off"} ${plural(mx, "point")}${R.tops.length > 1 ? " each" : ""}`;
        f("s.most", "Moved it most", R.top ? R.mostText : "no one part moved it");
        f("s.room", "Most room this week", `${PARTN[R.room.key].toLowerCase()}, at ${R.room.now}`);
      }
    } else { R.score = null; f("s.start", "Starts on", `day ${L.LEARN_DAYS}`); }
    f("s.how", "How it works", `it blends the days among the last ${BLEND} that have a BM, or No BM, logged, and needs ${BLEND_MIN} of them; from four parts: ${join(L.SCORE_PARTS.map(([k, l]) => `${l.toLowerCase()} ${Math.round(L.SCORE_W[k] * 100)}%`))}`);

    const PR = L.patterns(M, mode);
    R.PR = PR;
    S(`Possible patterns, last ${L.PATTERN_DAYS} days`);
    if (!u) f("p.wait", "Patterns", `checked once a food has been logged ${L.PATTERN_BAR.n} times`);
    else if (PR.sparse) f("p.held", "Meal patterns held back", PR.withMeal ? `meals are logged on ${COVER(PR)}, under ${Math.round(L.MEAL_COVER * 100)}%, so there are few ordinary days to compare with` : "no meals logged");
    else {
      /* the coverage the 60% gate reads, said on this side of it too */
      if (PR.withMeal) f("p.cover", "Meals logged", `on ${COVER(PR)}, enough to read meal patterns`);
      if (PR.found.length) PR.found.forEach((p, i) => { if (i < 3 || p.kind === "late") f(`p.${i}`, patTitle(p), `${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise (${p.tier.label.toLowerCase()})`); });
      else f("p.none", "Patterns found", `none yet; ${plural(PR.checked.length, "food")} checked`);
    }
    /* a pattern card's Ask about this: that pattern, said plainly when it's below the bar */
    const cp = u && ctx && ctx.k && ctx.k.indexOf("pattern:") === 0 ? PR.tests.find((x) => x.id === ctx.k.slice(8)) : null;
    R.cp = cp ? Object.assign({}, cp, { below: !cp.show || PR.sparse }) : null;
    if (R.cp) { f("p.c", `The one they asked about: ${lower1(patTitle(R.cp))}`, `${R.cp.hit} of ${R.cp.n} times, against ${R.cp.oh} of ${R.cp.on} otherwise (${R.cp.below ? "below the bar, so not shown as a pattern" : R.cp.tier.label.toLowerCase()})`); }
    if (u && PR.sparse && PR.withMeal) f("p.check", "A food check", `one line a day for ${L.FOOD_CHECK_DAYS} days, on ${ORD} too`);
    f("p.bar", "A pattern shows when", `it holds ${L.PATTERN_BAR.n} or more times, most of the time, and far more often than on other days (showing up often; consistent from ${CONSISTENT} times, nearly every time). Patterns show what tends to happen together, not what causes it.`);

    /* the latest check-in against the first weeks: left out entirely while the check-in is off */
    if (ck) {
      const K = ckOf(M);
      R.K = K;
      S("Weekly check-in");
      if (K.b && K.latest) {
        R.ckHead = ckHead(K);
        f("c.head", `${K.cur ? "This week" : `Week of ${short(K.latest.ws)}`}, next to their first ${L.BASE_WEEKS}`, lower1(R.ckHead));
        L.CHECKIN.forEach((q, i) => f(`c.${q.k}`, q.label, `${q.opts[K.latest.answers[i]]}, ${lower1(K.cmp[i].text)}`));
      } else f("c.n", "Check-ins so far", `${K.done.length + (K.cur ? 1 : 0)}; from ${L.BASE_WEEKS}, each week is compared with the first ${L.BASE_WEEKS}`);
      f("c.due", "This week's check-in", M.checkin.status === "due" ? "due tonight" : M.checkin.status === "done" ? "done" : "skipped");
    }

    const td = L.day(M, TODAY), es = td ? td.entries : [];
    R.todayN = es.length;
    if (!fg.today) {
      S("Today's logs");
      if (!es.length) f("t.none", "Today", "nothing logged yet");
      es.forEach((e, i) => f(`t.${i}`, T(e.t), entryLine(M, e, mode)));
    }

    /* Ask about this: the card's own numbers come in with the question */
    let c = null;
    if (ctx) { try { c = RU.askContext(M, V, ctx); } catch (e) { warn("RU.askContext threw, so the card's numbers are left out", e); } }
    R.c = c; R.ctxK = ctx ? ctx.k : null;
    if (c) { S(`They tapped Ask about this on: ${c.title}`); c.facts.forEach((t, i) => f(`x.${i}`, "On that card", t)); }

    S("How Florin reads logs");
    f("k.learn", "Florin learns a person's usual over", `their first ${L.LEARN_DAYS} days, and keeps updating it`);
    f("k.gap", "A day with nothing logged", "stays a gap, never a zero; a day logged as No BM is a zero");
    f("k.late", "A late dinner", `one logged at ${LATE_H - 12} PM or later`);

    R.text = secs.filter((s) => s.ids.length).map((s) => `${s.title}\n${s.ids.map((id) => `- ${X[id][0]}: ${X[id][1]}`).join("\n")}`).join("\n\n");
    const dt = digitize(R.text);
    R.nums = numSet(dt);
    R.pairs = new Set(pairsIn(dt));
    return R;
  }

  /* ---------- the numbers check: every number in an answer has to be one the facts state, and every "5 of 6" a pair
     the facts state. Number words count as numbers ("three of your mornings"), and "half" is a number the facts never
     state, so it never passes ---------- */
  const NUM = /\d+(?:[.:]\d+)?/g;
  const numsIn = (text) => String(text || "").match(NUM) || [];
  const NUMW = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, dozen: 12, twice: 2 };
  const NUMW_RX = new RegExp(`\\b(${Object.keys(NUMW).join("|")})\\b`, "gi");
  /* "one" is left as a word: it's a pronoun as often as a count ("one thing to log", "the later one") */
  function digitize(text) { return String(text || "").replace(NUMW_RX, (w) => String(NUMW[w.toLowerCase()])); }
  function pairsIn(text) {
    const out = [], rx = /(\d+) of (?:(?:the|your|their|those|these|all) )?(\d+)\b/g;
    let m;
    while ((m = rx.exec(String(text || "")))) out.push(`${m[1]} of ${m[2]}`);
    return out;
  }
  function numSet(text) {
    const str = new Set(), val = new Set();
    numsIn(text).forEach((t) => { str.add(t); if (t.indexOf(":") < 0) val.add(+t); });
    return { str, val };
  }
  /* a count said with what it counts ("3 later", "2 looser") has to be the count the facts give for that word */
  const COUNTED = /\b(\d+)\s+(?:of\s+(?:your|the|their|those|these)\s+)?(?:first\s+)?(?:BMs?\s+|mornings?\s+|days?\s+|ones?\s+)?(?:came\s+|were\s+|was\s+|ran\s+|landed\s+|sat\s+|went\s+)?(later|earlier|firmer|looser)\b/gi;
  const numbersOff = (text, R) => {
    const t = digitize(text);
    const off = numsIn(t).filter((x) => !R.nums.str.has(x) && !(x.indexOf(":") < 0 && R.nums.val.has(+x)));
    pairsIn(t).forEach((p) => { if (!R.pairs.has(p) && !off.includes(p)) off.push(p); });
    const alone = t.replace(/(\d+) of (?:(?:the|your|their|those|these|all) )?(\d+)\b/g, " ").replace(/\d+:\d+/g, " ").replace(/\b\d+ ?(AM|PM)\b/gi, " ");
    let m;
    COUNTED.lastIndex = 0;
    while ((m = COUNTED.exec(alone))) {
      const n = m[1], w = m[2].toLowerCase(), rx = new RegExp(`\\b${w}\\b`, "i");
      if (!Object.keys(R.X).some((id) => rx.test(R.X[id][0]) && numsIn(R.X[id][1]).includes(n))) off.push(`${n} ${w}`);
    }
    return off;
  };
  /* the sentences in an answer: a decimal, a time or an abbreviation doesn't end one */
  const sentencesIn = (text) => (String(text || "").replace(/(\d)\.(\d)/g, "$1,$2").replace(/\b(e\.g|i\.e|a\.m|p\.m|vs|etc)\./gi, "$1").match(/[^.?!]*[^.?!\s][^.?!]*(?:[.?!]+|$)/g) || []).length;
  /* what the 22 claims rules don't cover on their own, for an answer Claude writes. Each is [rule, pattern]: words
     Florin never uses, a forecast, a cause or a condition named, a medicine or what to cut out, reassurance, a
     judgement of their gut or score, a share worked out ("half"), humour, a comparison with other people, and an
     emoji, a list or markdown. None blocks Florin's own disclaimers: "they don't prove cause", "not what causes it",
     "What's behind your FloraScore", "a gap stays a gap due to how Florin reads logs", "If you skip a day" and "If you
     keep logging meals" all pass */
  const ASK_RULES = [
    ["words", /\b(normal(ly)?|healthy|unhealthy|improv(e|es|ed|ing|ement)|worsen(s|ed|ing)?|resolv(e|es|ed|ing)|(ir)?regular(ity)?|good|bad|bowel movements?|IBS-SSS|Bristol)\b|[\u2013\u2014]/i],
    ["forecast", /\b(will|going to|gonna|likely|expect\w*|should)\b[^.?!]{0,40}\b(tomorrow|tonight|next (week|days?|time|few days|month)|soon|later this week|this weekend|coming days)\b|\b(tomorrow|tonight|next (week|day|time))\b[^.?!]{0,40}\b(will|going to|likely|probably|expect\w*)\b/i],
    ["forecast", /\b(will|is going to|are going to|should|would)\b[^.?!]{0,30}\b(rise|drop|fall|go up|go down|get better|get worse|settle|clear up|go away|come back|return to)\b|\b(likely|unlikely|probably|bound to)\b/i],
    ["forecast", /\b(should|will|would|could)\b[^.?!]{0,30}\b(climb|ease|calm down|pick up|level out|even out)\b|\bexpect(ed)? (a|an|the) (\w+ )?(week|day|morning|evening|night)\b|\bif you keep (this|it|that) up\b/i],
    ["cause", /\btrigger(s|ed|ing)?\b|\b(intoleran\w*|sensitivit\w*|sensitive to|allerg\w*)\b/i],
    ["cause", new RegExp(`\\bupset(s|ting)? (your|my|the) (stomach|gut|belly|tummy)\\b|\\b(culprit|to blame)\\b|\\b((may|might|could|seems? to|appears? to) be|is|are|was|were) (likely )?behind (your|the|those|these) (\\w+ )?(looser|firmer|later|earlier|bloat\\w*|symptoms?|rough\\w*|pain|cramp\\w*|BMs?|mornings?)\\b|\\b(because of|due to) (the |your |eating |having |drinking |all the |too much )?(${FOODW})|\\b(${FOODW})(s|es)? (is|are|was|were|may be|might be|could be|seems? to be) (causing|the cause|behind)\\b|\\binflam\\w*`, "i")],
    ["condition", /\b(IBS|SIBO|celiac|coeliac|gastritis|reflux|GERD|cancer|infections?|diseases?|disorders?|syndromes?)\b/i],
    ["medicine", /\b(probiotics?|prebiotics?|laxatives?|medicines?|medications?|meds|supplements?|pills?|tablets?|antibiotics?|antacids?|imodium|loperamide|doses?|dosage)\b/i],
    ["advice", /\bcut(ting)? (it|them|that|this|\w+) out\b|\bcut(ting)? (out|back on|down on)\b|\b(avoid|avoiding|eliminate|eliminating|give up|giving up|stop eating|stop drinking)\b|\b(should|will|would) help\b|\bhelps? (ease|reduce|relieve|settle|calm|fix)\b/i],
    ["advice", new RegExp(`\\b(try|trying) (skipping|going without|dropping|cutting|a week without|a few days without|without|less)\\b|\\bskip(s|ping)? (the |your |any )?(${FOODW})|\\bgo(ing)? without (the |your |any )?(${FOODW})|\\bcut(ting)? down\\b|\\bhelps? (your|the) (gut|stomach|belly|tummy|digestion|bowels?) (settle|calm|ease|recover)\\b`, "i")],
    ["reassure", /\b(nothing|no need|not something) to (worry|be concerned)\b|\bdon'?t (need to )?worry\b|\bno (cause|reason|need) for concern\b|\bnot (a )?(concern|concerning|serious)\b|\bnothing serious\b|\breassur\w*|\b(you'?re|you are|it'?s|that'?s|this is|all) (fine|ok|okay|alright|good)\b/i],
    ["judgement", /\b(better|worse|great|good|bad|poor|excellent|best|worst|ideal|optimal|perfect|strong|weak)\b[^.?!]{0,25}\b(gut|score|florascore|health|digestion|shape|sign)\b|\b(gut|digestion|health|score|florascore)\b[^.?!]{0,25}\b(better|worse|great|good|bad|poor|excellent|ideal|optimal|perfect)\b|\bgetting (better|worse)\b|\b(good|great) news\b|\bwell done\b|\bgreat (job|work)\b/i],
    ["judgement", /\bon (the right )?track\b|\bpositive sign\b|\bsettling down\b|\b(better|worse) than (last|the|before|usual|yesterday)\b|\btextbook\b|\bhealthier\b/i],
    ["humour", /\b(haha|hah|lol|lmao|joke|jokes|joking|funny|kidding)\b/i],
    ["a comparison with other people", /\bmost (people|adults|folks)\b|\b(the )?average (person|adult|people)\b|\btypical (people|person|adults?)\b|\bthan (others|average|most)\b|\b(other|many) (people|adults) (go|have|get|are|do|tend|find|see|feel|log)\b|\beveryone else\b/i],
    ["a share worked out", /\b(half|a quarter|a third|two thirds)\b/i],
    ["emoji", /\p{Extended_Pictographic}/u],
    ["a list or markdown", /^\s*([-*\u2022]|\d+[.)])\s|\*\*|__|^#{1,6}\s|`/m]
  ];
  /* the question that hands the turn back: the answer's last sentence, when it asks one. The reply is the rest */
  function splitQ(text) {
    const t = String(text || "").trim();
    const m = t.match(/(?:^|[.!?]\s+|\n\s*)([^.!?\n]*[^.!?\s][^.!?\n]*\?)$/);
    if (!m) return { body: t, q: "" };
    return { body: t.slice(0, t.length - m[1].length).trim(), q: m[1].trim() };
  }
  /* partial: an answer Stop cut short, so it isn't held to 2 to 4 sentences. The reply is held to 2 to 4 sentences
     and ends on one question at most; the rules and the numbers check read the question too */
  function checkText(text, R, o = {}) {
    text = String(text || "");
    const chk = window.FLORIN_REFRESH_CHECK;
    const rules = typeof chk === "function" ? chk(text).map((h) => h.rule.id) : ["no claims check on this page"];
    ASK_RULES.forEach(([id, rx]) => { if (rx.test(text) && !rules.includes(id)) rules.push(id); });
    if (!R.ck && /\bcheck-?ins?\b|\bcheck in\b(?! with a clinician)/i.test(text)) rules.push("check-in is off");
    const { body } = splitQ(text);
    const n = sentencesIn(body);
    if (!o.partial && (n < 2 || n > 4)) rules.push(`${n} sentences`);
    if (!o.partial && /\?/.test(body)) rules.push("more than one question");
    const nums = numbersOff(text, R);
    return { ok: !rules.length && !nums.length && !!text.trim(), rules, nums };
  }

  /* ============================== COMPUTED ANSWERS ==============================
     2 to 4 short sentences from the model's numbers, ending on one thing to log or try, with a small chart where one
     helps. Each names the fact lines it used, for From your logs. */
  /* the stretch an answer reads: the one the question names, else the one the card they asked from reads, else its own */
  const spanFor = (R, card, q, dflt) => {
    q = String(q || "");
    if (/\b(this|last|past) week\b|\b(7|seven) days\b/i.test(q)) return R.w;
    if (/\b(this|last|past) month\b|\b(30|thirty) days\b|\b(4|four) weeks\b/i.test(q)) return R.m;
    if (R.q && /\b(90|ninety) days\b|\b(3|three) months\b/i.test(q)) return R.q;
    if (R.cs && R.ctxK === card) return R.cs;
    return dflt;
  };
  /* A logs a type, B and C a word */
  const pickWord = (R) => (R.mode === "A" ? "type" : "word");
  /* which pattern an answer is about: the card they asked from, else the kind or food the question names, else the
     clearest. A question that names a kind with no pattern of that kind gets none, never another kind's */
  const KIND_WORD = { bloat: "bloating", loose: "a looser first BM", late: "a later first BM" };
  const kindIn = (q) => (/\bbloat\w*/i.test(q) ? "bloat" : /\b(loose|looser|watery|soft|softer)\b/i.test(q) ? "loose" : /\b(late|later|dinners?|timing|mornings?)\b/i.test(q) ? "late" : null);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function pickPat(R, q) {
    if (!R.u) return null;
    if (R.cp) return R.cp;
    const PR = R.PR;
    if (PR.sparse || !PR.found.length) return null;
    q = String(q || "");
    const kind = kindIn(q), food = Object.keys(L.FOOD_NAMES).find((k) => new RegExp(`\\b${reEsc(foodName(k))}\\b`, "i").test(q));
    const fits = PR.found.filter((p) => (!kind || p.kind === kind) && (!food || p.food === food));
    return fits[0] || (kind || food ? null : PR.found[0]);
  }
  const pid = (R, p) => (p === R.cp ? "p.c" : `p.${R.PR.found.indexOf(p)}`);
  /* a symptom the patterns don't look at on its own (they look at bloating, a looser first BM and a later one) */
  const symNamed = (q) => {
    const hit = L.SYMPTOMS.filter((s) => s !== "Bloating").find((s) => new RegExp(`\\b${reEsc(s)}\\b`, "i").test(q));
    return hit ? hit.toLowerCase() : /\bpain\b/i.test(q) ? "belly pain" : /\bcramps?\b/i.test(q) ? "cramping" : /\btired\w*/i.test(q) ? "low energy" : null;
  };
  const roomAct = (R) => {
    if (!R.room) return null;
    const k = R.room.key, late = R.PR && !R.PR.sparse ? R.PR.found.find((p) => p.kind === "late") : null;
    if (k === "timing") return late ? { id: `p.${R.PR.found.indexOf(late)}`, text: `try an earlier dinner, since your first BM came later after ${late.hit} of ${late.n} dinners past ${LATE_H - 12} PM` } : { text: "log your first BM when it happens" };
    if (k === "often") return { text: "log No BM on a day without one" };
    if (k === "form") { const s = R.w; return { text: `add a note on what you ate the day before ${s.looser && !s.firmer ? "a looser BM" : s.firmer && !s.looser ? "a firmer BM" : "a BM outside your usual forms"}` }; }
    return { text: `log ${ORD} as well as rough ones` };
  };
  /* fix-viz (Oct 28): every chart here is the card's own (RU.cardChart), for the stretch the answer reads, so the chat
     never draws a different picture from the card the question came from: the FloraScore line on its band with today
     labelled, the Timing dots, the How often count line, the Form bars, the summary bar of the days read, and a
     pattern's two share bars (never a Gold "Held"). Without the core's helper, no chart */
  const cardChart = (R, key, n) => {
    if (typeof RU.cardChart !== "function") return {};
    try { const c = RU.cardChart(R.M, R.V, key, n); return c && c.chart ? { chart: c.chart, legend: c.legend || "" } : {}; } catch (e) { warn(`the ${key} chart`, e); return {}; }
  };
  const scoreChart = (R) => cardChart(R, "score", R.cs ? R.cs.n : 30);
  const timeChart = (R, s) => cardChart(R, "timing", s.n);
  const countChart = (R, s) => cardChart(R, "often", s.n);
  const formChart = (R, s) => cardChart(R, "form", s.n);
  const weekChart = (R, s) => cardChart(R, "week", s.n);
  const patChart = (R, p) => cardChart(R, `pattern:${p.id}`);
  /* the forms logged so far, in words: "mostly" only for more than half, else the counts, as Insights says them */
  const formsSaid = (s) => (!s.top ? "" : s.top.count * 2 > s.bms ? (s.top.count === s.bms ? `all ${s.top.label}` : `mostly ${s.top.label}`) : join(s.ranked.map(([k, c]) => `${c} ${k}`)));
  /* the symptoms of a stretch, in the one sentence the week card and Insights use (L.symLine) */
  const symSaid = (s) => `${upper1(s.lbl)}, ${lower1(L.symLine(s.F, { named: s.n <= 7, of: s.logged }))}`;

  const A = {
    score(R) {
      if (!R.u) return { used: ["learn", "s.start", "s.how"], lines: [`Your FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual.`, `You're on day ${R.day} of ${L.LEARN_DAYS}.`], try: "Log each BM when it happens, and No BM on a day without one, so it's ready on time." };
      if (R.score == null) {
        /* what brings it back: today, when today doesn't count yet and one other day does; else the days before, from
           History. A day with only meals or symptoms logged doesn't count */
        const need = BLEND_MIN - R.sN;
        const tr = !R.todayIn && need === 1 ? "Log today's BMs, or No BM if there wasn't one, and it comes back."
          : R.todayIn ? "Add a BM, or No BM, for yesterday from History, and it comes back."
          : "Log today's BMs, or No BM, and add yesterday's from History, and it comes back.";
        return { used: ["s.today", "u.score", "s.how"], lines: [`There's no FloraScore today: ${L.NO_SCORE}, and ${R.sN ? `only ${R.sN} of them has one` : "none of them has one"}.`, R.su ? `Your usual range is ${R.su[0]} to ${R.su[1]}.` : ""], try: tr };
      }
      const lines = [R.flag ? `Your FloraScore today is ${R.score}. ${RU.FLAG_DAY}` : `Your FloraScore today is ${R.score}${R.rel ? `, ${lower1(R.rel)} of ${R.su[0]} to ${R.su[1]}` : ""}.`], used = ["s.today", "u.score"];
      if (R.mv) {
        lines.push(R.mv.delta === 0 ? "On average it's the same as last week." : `On average it's ${plural(Math.abs(R.mv.delta), "point")} ${R.mv.delta > 0 ? "above" : "below"} last week.`);
        /* in points of FloraScore, as the Insights card says it; a part's own value out of 100 stays in the four-parts list */
        lines.push(!R.top ? "No one part moved it." : R.tops.length > 1 && /added|took off/.test(R.mostText) ? `${upper1(R.mostText)}, the most any part moved.` : R.tops.length > 1 ? `${upper1(R.mostText.replace(/, (adding|taking off)/, " moved it most, $1"))}.` : `${PARTN[R.top.key]} moved it most, ${R.top.pts > 0 ? "adding" : "taking off"} ${plural(Math.abs(R.top.pts), "point")}.`);
        used.push("s.delta", "s.most", "s.room");
      }
      const ra = roomAct(R);
      if (ra && ra.id) used.push(ra.id);
      return Object.assign({ used, lines, try: R.flag ? FLAG_TRY : ra ? `${PARTN[R.room.key]} has the most room this week, so ${ra.text}.` : "Log as things happen, so each part reads true." }, scoreChart(R));
    },
    scoreHow(R) {
      return { used: ["s.how", "u.score"], lines: [`FloraScore blends the days among your last ${BLEND} that have a BM, or No BM, logged, so one odd morning doesn't swing it.`, `It's built from four things you log: ${join(L.SCORE_PARTS.map(([k, l]) => `${l.toLowerCase()} (${Math.round(L.SCORE_W[k] * 100)}%)`))}.`, "It compares you with you, never with anyone else."], try: "Log as things happen: a day you miss is left out rather than scored as zero." };
    },
    timing(R, q) {
      const s = spanFor(R, "timing", q, R.w), k = s.k;
      if (!R.u) return { used: ["learn", `${k}.morn`, `${k}.span`, `${k}.med`], lines: [`Florin is still learning your usual window: day ${R.day} of ${L.LEARN_DAYS}.`, s.mornings ? (s.mornings > 1 ? `So far your first BM came from ${T(s.lo)} to ${T(s.hi)}.` : `So far your first BM came at ${T(s.med)}.`) : "No BMs are logged yet."], try: "Log your first BM when it happens, and the window takes shape from those times." };
      const lines = [`Your usual window for a first BM is ${R.win}.`];
      /* a question about the window itself gets how it's set first */
      if (/\b(set|sets|worked out|where)\b/i.test(q)) lines.push(`It's where most first BMs landed from ${R.uFrom} to ${R.uTo}, and it updates as you log.`);
      if (!s.mornings) lines.push(`No first BM is logged ${s.lbl}.`);
      else {
        const ex = join([s.later ? `${s.later} later` : "", s.earlier ? `${s.earlier} earlier` : ""].filter(Boolean));
        lines.push(`${upper1(s.lbl)}, ${s.inW} of ${plural(s.mornings, "first BM")} came in it${ex ? `, ${ex}` : ""}.`);
        if (s.laterAfterLate && !R.PR.sparse) lines.push(`${s.laterAfterLate === s.later ? (s.later === 1 ? "The later one" : `All ${s.later} later ones`) : `${s.laterAfterLate} of the ${s.later} later ones`} came after a dinner past ${LATE_H - 12} PM.`);
      }
      return Object.assign({ used: ["u.win", `${k}.morn`, `${k}.later`, `${k}.earlier`, `${k}.lateafter`, `${k}.med`], lines, try: s.later ? "Note your dinner times this week, and compare the mornings after." : "Keep logging your first BM when it happens, so the window stays yours." }, s.mornings ? timeChart(R, s) : {});
    },
    often(R, q) {
      const s = spanFor(R, "often", q, R.w), k = s.k, u = R.u;
      if (!u) return { used: ["learn", `${k}.bms`, `${k}.cd`, `${k}.avg`, `${k}.zero`], lines: [s.countDays ? `${plural(s.bms, "BM")} logged over ${plural(s.countDays, "day")} so far.` : "No BMs are logged yet.", `Florin sets your usual count by day ${L.LEARN_DAYS}, and you're on day ${R.day}.`], try: "On a day with no BM, log No BM, so it counts as a zero rather than a gap." };
      const lines = [`Your usual is ${u.nLo} to ${u.nHi} BMs a day.`];
      if (!s.countDays) lines.push(`No BMs are logged ${s.lbl}.`);
      else {
        /* an average of nothing is no number at all: with only No BM logged, the days say so */
        lines.push(s.bms ? `${upper1(s.lbl)} you averaged ${one(s.avg)} a day, and ${s.inC} of ${plural(s.countDays, "day")} had a usual count.` : `${upper1(s.lbl)} you logged No BM on ${plural(s.zero, "day")}, and ${s.inC} of ${plural(s.countDays, "day")} had a usual count.`);
        if (/\b(busier|busy|more than|lots|many)\b/i.test(q) && s.busy) lines.push(`${plural(s.busy, "day")} had more than ${u.nHi}.`);
        else if (s.gaps) lines.push(`${plural(s.gaps, "day")} with no BMs logged ${s.gaps === 1 ? "stays a gap, never a zero" : "stay gaps, never zeros"}.`);
      }
      return Object.assign({ used: ["u.n", `${k}.avg`, `${k}.inc`, `${k}.busy`, `${k}.gaps`, `${k}.zero`], lines, try: "On a day with no BM, log No BM, so it counts as a zero rather than a gap." }, s.countDays ? countChart(R, s) : {});
    },
    gap(R, q) {
      const s = spanFor(R, "often", q, R.w), k = s.k;
      return { used: ["k.gap", `${k}.gaps`, `${k}.zero`], lines: ["A day with nothing logged stays a gap, so Florin never guesses it was a day without a BM.", "A day you log as No BM counts as a zero.", s.gaps ? `${upper1(s.lbl)}, ${plural(s.gaps, "day")} ${s.gaps === 1 ? "is a gap" : "are gaps"}.` : `${upper1(s.lbl)}, there are no gaps.`], try: "On a day with no BM, log No BM from the plus button." };
    },
    form(R, q) {
      const s = spanFor(R, "form", q, R.w), k = s.k, u = R.u, mean = /\b(mean|what are|what do)\b/i.test(q), w = pickWord(R);
      const scale = R.mode === "B" ? `Five words, hardest to loosest: ${join(L.WORDS.map((x) => x.word))}.` : R.mode === "C" ? `Seven words, from ${L.TYPES[1].short}, the hardest, to ${L.TYPES[7].short}, the loosest.` : "Types run from 1, the hardest, to 7, the loosest.";
      if (!u) return { used: ["learn", "words", `${k}.bms`, `${k}.top`], lines: [s.bms ? `${plural(s.bms, "BM")} logged so far${s.top ? `: ${formsSaid(s)}` : ""}.` : "No BMs are logged yet.", mean ? scale : `Florin learns your usual forms by day ${L.LEARN_DAYS}.`], try: `Pick the closest ${w} each time, and Florin reads it against your own usual once it knows it.` };
      const lines = [`Your usual forms are ${R.formText}.`];
      if (mean) lines.push(scale);
      if (!s.bms) lines.push(`No BMs are logged ${s.lbl}.`);
      else {
        const ex = join([s.firmer ? `${s.firmer} firmer` : "", s.looser ? `${s.looser} looser` : ""].filter(Boolean));
        lines.push(`${upper1(s.lbl)}, ${s.inF} of ${plural(s.bms - s.unsure, "BM")} sat within them${ex ? `: ${ex}` : ""}.`);
        if (!mean && s.unsure) lines.push(`${plural(s.unsure, "BM")} logged as a word that could sit either side ${s.unsure === 1 ? "isn't" : "aren't"} counted either way.`);
      }
      const tip = s.looser ? "After a looser BM, a note on what you ate the day before helps Florin look for what tends to follow." : s.firmer ? "After a firmer BM, a note on the day before helps you see it later." : `Pick the closest ${w} each time; Florin reads it against your own usual.`;
      return Object.assign({ used: ["u.form", "words", `${k}.forms`, `${k}.firmer`, `${k}.looser`, `${k}.unsure`, `${k}.top`], lines, try: tip }, s.bms ? formChart(R, s) : {});
    },
    symptoms(R, q) {
      const s = spanFor(R, "sym", q, R.m), lines = [];
      if (!s.logged) lines.push("Nothing is logged yet.");
      else if (!s.withSym) lines.push(`No symptoms are logged ${s.lbl}.`);
      else lines.push(symSaid(s));
      if (R.u) lines.push(`Usually you log symptoms ${symUsual(R.u)}.`);
      return { used: [`${s.k}.sym`, `${s.k}.symtop`, "u.sym"], lines, try: `Logging ${ORD} as well as rough ones lets Florin compare them.`, fine: FINE_SYM };
    },
    rough(R, q) {
      if (!R.u) return A.patterns(R, "");
      const s = spanFor(R, "sym", q, R.m), PR = R.PR, used = [`${s.k}.sym`, `${s.k}.symtop`];
      const lines = [s.withSym ? symSaid(s) : `No symptoms are logged ${s.lbl}.`];
      if (PR.sparse && !R.cp) {
        lines.push(PR.withMeal ? `Florin holds meal patterns back for now: meals are logged on ${COVER(PR)}, so there are few ordinary days to compare with.` : "No meals are logged, so Florin can't look at what comes before a rougher day yet.");
        used.push("p.held", "p.check");
        return { used, lines, try: PR.withMeal ? `A ${L.FOOD_CHECK_DAYS}-day food check, one line a day, on ${ORD} too, lets Florin look.` : "Log what you eat on most days, ordinary ones too, and Florin starts from there.", fine: FINE_SYM };
      }
      /* a symptom the patterns don't look at on its own is said plainly, never answered with another symptom's pattern */
      const named = R.cp ? null : symNamed(q);
      if (named) {
        lines.push(`Florin's patterns look at what comes before bloating, a looser first BM or a later one, so ${named} isn't checked on its own yet.`);
        return { used, lines, try: `When ${named} comes up, log it with a strength, and add a note on the day before.`, fine: FINE_SYM };
      }
      const p = pickPat(R, q), kind = kindIn(q);
      if (p) {
        lines.push(`In your last ${L.PATTERN_DAYS} days Florin ${p.below ? "checked" : "found"} ${lower1(patTitle(p))}: ${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise${p.below ? ", which is below the bar, so it isn't shown as a pattern" : ""}.`);
        lines.push("Patterns show what tends to happen together; they don't prove cause.");
        used.push(pid(R, p), "p.bar");
        return Object.assign({ used, lines, try: patTry(p), fine: FINE_SYM }, patChart(R, p));
      }
      lines.push(kind && PR.found.length ? `Nothing before ${KIND_WORD[kind]} clears the bar yet in your last ${L.PATTERN_DAYS} days.` : `Nothing stands out yet in your last ${L.PATTERN_DAYS} days: ${plural(PR.checked.length, "food")} checked, and none cleared the bar.`);
      used.push(kind && PR.found.length ? "p.bar" : "p.none", "p.bar");
      return { used, lines, try: `Keep logging meals on ${ORD} too, so there's something to compare with.`, fine: FINE_SYM };
    },
    patterns(R, q) {
      const PR = R.PR, n = L.PATTERN_BAR.n, p = pickPat(R, q);
      if (!R.u) return { used: ["learn", "p.wait", "p.bar"], lines: [`Florin starts checking a food once you've logged it ${n} times.`, `You're on day ${R.day} of ${L.LEARN_DAYS}, so there isn't enough to compare yet.`], try: `Log what you ate when you can, on ${ORD} as well as rough ones.` };
      const bar = `A pattern shows only when it holds ${n} or more times, most of the time, and far more often than on other days.`;
      if (/\bsure\b/i.test(q)) {
        if (p && p.below) return Object.assign({ used: ["p.bar", "p.c"], lines: [bar, `${patTitle(p)}: ${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise, so it's below that bar for now.`], try: "Keep logging as you usually would, and Florin checks it again as the days add up." }, patChart(R, p));
        return { used: ["p.bar", p ? pid(R, p) : ""], lines: [bar, `Showing up often is ${n} or more; Consistent is ${CONSISTENT} or more, nearly every time.`, p ? `${p === R.cp ? "This one" : "Your clearest"} is ${lower1(patTitle(p))}: ${p.hit} of ${p.n} times, ${p.tier.label.toLowerCase()}.` : ""], try: "Try one change at a time and compare, since a pattern shows what happens together, not cause." };
      }
      if (/\b\d+ logs\b|\bwhy does a food\b/i.test(q)) return { used: ["p.bar"], lines: [`Florin checks every food you log against the mornings after, so it waits for ${n} logs of a food before it looks.`, "With fewer, chance alone would name a food now and then."], try: "Keep logging meals as you usually would." };
      if (/\b(what else|part of it)\b/i.test(q)) return { used: p ? [pid(R, p)] : [], lines: ["Patterns only see what you logged, so sleep, a busy week, travel or how much you ate could be part of it too.", "That's why Florin calls it a possible pattern, never a cause."], try: "A short note on the day helps you see it later." };
      if (R.cp) return Object.assign({ used: ["p.c", "p.bar"], lines: [`${patTitle(p)}: ${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise${p.below ? ", below the bar for now" : ""}.`, "Patterns show what tends to happen together; they don't prove cause."], try: patTry(p) }, patChart(R, p));
      if (PR.sparse) return { used: ["p.held", "p.check"], lines: [PR.withMeal ? `Florin holds meal patterns back for now: meals are logged on ${COVER(PR)}, so there are few ordinary days to compare with.` : "No meals are logged yet, so there's nothing to compare."], try: PR.withMeal ? `A ${L.FOOD_CHECK_DAYS}-day food check, one line a day, on ${ORD} too, lets Florin look.` : "Log what you eat on most days, ordinary ones too, and Florin starts from there." };
      if (!PR.found.length) return { used: ["p.none", "p.bar"], lines: [`Nothing stands out yet in your last ${L.PATTERN_DAYS} days: ${plural(PR.checked.length, "food")} checked, and none cleared the bar.`, "A pattern has to hold most of the time, and far more often than on other days."], try: `Keep logging meals on ${ORD} too, so there's something to compare with.` };
      const two = PR.found.slice(0, 2);
      return Object.assign({ used: two.map((x, i) => `p.${i}`).concat(["p.bar"]), lines: two.map((x) => `${patTitle(x)}: ${x.hit} of ${x.n} times, against ${x.oh} of ${x.on} otherwise.`).concat(["Patterns show what tends to happen together; they don't prove cause."]), try: patTry(two[0]) }, patChart(R, two[0]));
    },
    test(R, q) {
      const PR = R.PR, p = pickPat(R, q);
      if (p) return Object.assign({ used: [pid(R, p)], lines: [p === R.cp ? `${patTitle(p)}: ${p.hit} of ${p.n} times${p.below ? `, against ${p.oh} of ${p.on} otherwise, below the bar for now` : ""}.` : `Your clearest pattern is ${lower1(patTitle(p))}: ${p.hit} of ${p.n} times.`, "One change at a time shows what matters."], try: patTry(p) }, patChart(R, p));
      if (R.u && PR.sparse && PR.withMeal) return { used: ["p.held", "p.check"], lines: [`Meals are logged on ${COVER(PR)}, so there are few ordinary days to test against.`], try: `A ${L.FOOD_CHECK_DAYS}-day food check, one line a day, on ${ORD} too, lets Florin look.` };
      return { used: R.u ? ["p.none"] : ["p.wait"], lines: ["There's no pattern to test yet: none clears the bar."], try: `Keep logging meals on ${ORD} too, so there's something to compare with.` };
    },
    try(R, q) {
      if (!R.u) return { used: ["learn"], lines: [`You're on day ${R.day} of ${L.LEARN_DAYS}, so the most useful thing now is plenty of logs.`], try: "Log each BM when it happens, symptoms when they come up, and what you ate when you can." };
      const PR = R.PR, p = pickPat(R, q);
      if (p) return Object.assign({ used: [pid(R, p), "p.bar"], lines: [p === R.cp ? `${patTitle(p)}: ${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise${p.below ? ", below the bar for now" : ""}.` : `Your clearest pattern is ${lower1(patTitle(p))}: ${p.hit} of ${p.n} times, against ${p.oh} of ${p.on} otherwise.`], try: patTry(p) }, patChart(R, p));
      if (PR.sparse && PR.withMeal) return { used: ["p.held", "p.check"], lines: [`Meals are logged on ${COVER(PR)}, so Florin can't compare them with ordinary days yet.`], try: `A ${L.FOOD_CHECK_DAYS}-day food check, one line a day, on ${ORD} too, lets Florin look.` };
      const ra = roomAct(R);
      if (!ra) return { used: [], lines: ["Your logs are steady enough that there's nothing in particular to change."], try: "Keep logging as things happen." };
      return { used: ["s.room", `s.p.${R.room.key}`, ra.id].filter(Boolean), lines: [`${PARTN[R.room.key]} has the most room in your FloraScore this week, at ${R.room.now}.`], try: `${upper1(ra.text)}.` };
    },
    meals(R) {
      const s = R.m, PR = R.PR;
      const lines = [s.logged ? (s.meals ? `${upper1(s.lbl)} you logged ${plural(s.meals, "meal")} on ${s.mealDays} of ${plural(s.logged, "day")}.` : `No meals are logged ${s.lbl}.`) : "Nothing is logged yet."];
      if (R.foods.length) lines.push(`The foods that came up most: ${join(R.foods.slice(0, 3).map(([k, c]) => `${foodName(k).toLowerCase()} ${plural(c, "time")}`))}.`);
      /* the gate is the 90-day coverage, so the answer says that count whichever side of it they are */
      if (R.u) lines.push(PR.sparse ? (PR.withMeal ? `Meals are logged on ${COVER(PR)}, under ${Math.round(L.MEAL_COVER * 100)}%, so meal patterns are held back for now.` : "") : `Meals are logged on ${COVER(PR)}, enough for Florin to look at what tends to follow a food.`);
      return { used: [`${R.mk}.meals`, "foods", "p.held", "p.cover"], lines, try: R.V.mealUI === "detailed" ? "Logging dinner with its time lets Florin read later dinners too." : "The quick log takes the whole day in one line, said or typed." };
    },
    checkin(R) {
      const K = R.K, due = R.M.checkin.status === "due", b = L.BASE_WEEKS, nCk = K.done.length + (K.cur ? 1 : 0);
      const next = due ? "This week's check-in is due tonight, and takes about a minute." : `Next week's check-in sits next to the same first ${b} weeks.`;
      if (!K.b || !K.latest) return { used: ["c.n", "c.due"], lines: [nCk ? `${plural(nCk, "check-in")} so far.` : "No check-ins yet.", `Once you have ${b}, each week sits next to your first ${b}.`], try: due && !K.done.length ? "Your first check-in is due tonight, and takes about a minute." : next };
      const moved = K.cmp.map((c, i) => ({ c, q: L.CHECKIN[i] })).filter((o) => o.c.k !== "same");
      return { used: ["c.head"].concat(L.CHECKIN.map((q) => `c.${q.k}`), ["c.due"]), lines: [`Next to your first ${b} check-ins, ${K.cur ? "this week" : "your latest week"} reads ${lower1(R.ckHead)}.`, moved.length ? `${moved.map((o) => `${o.q.label}: ${lower1(o.c.text)}`).join("; ")}.` : "Every question sits inside the range of your first weeks."], try: next };
    },
    report(R) {
      const n = R.entries;
      return { used: ["entries", "since"], lines: [`History has Make a report for your clinician: your dates, BMs, symptoms${R.ck ? ", meals and check-ins" : " and meals"}, so you don't have to remember them.`, n ? `Florin has ${plural(n, "entry", "entries")}${R.M.start === TODAY ? "" : ` since ${R.since}`} to put in it.` : "It fills in as you log.", "Primary care is the right first stop: your GP or a nurse practitioner."], try: "Before the visit, add any day you remember but didn't log, from History." };
    },
    clinician(R, q) {
      const urgent = URGENTQ.test(q || "") || URGENTQ_CASE.test(q || "");
      /* mucus leads with the flag note's own line, then primary care, never a reading of it */
      if (MUCUS.test(q || "")) return { used: [], lines: [MUCUS_LINE, ALARM_PRIMARY, urgent ? URGENT_LINE : ""], try: "Your logs can go with you as a report, so you don't have to remember dates." };
      return { used: [], lines: ["Some changes need a person, not an app.", "Blood, a black or tar-like stool, a fever, vomiting that won't stop, weight loss you can't explain or waking at night to go: start with primary care soon.", urgent ? URGENT_LINE : ""], try: "If a symptom is new for you or keeps showing up, bring your logs to your GP or a nurse practitioner." };
    },
    learn(R) {
      const t = "Log as things happen; a day you miss stays a gap rather than a zero.";
      if (!R.u) return { used: ["learn", "k.learn"], lines: [`Florin learns your usual over your first ${L.LEARN_DAYS} days: when your first BM tends to come, how many a day, your usual forms and how often symptoms come up.`, `You're on day ${R.day} of ${L.LEARN_DAYS}, and your FloraScore starts on day ${L.LEARN_DAYS} too.`], try: t };
      return { used: ["u.win", "u.n", "u.form", "u.sym", "k.learn"], lines: [`Your usual comes from your logs from ${R.uFrom} to ${R.uTo}: a first BM from ${R.win}, ${R.u.nLo} to ${R.u.nHi} a day, and ${R.formText}.`, "It updates as you log, and it's only ever compared with you."], try: t };
    },
    logHow(R, q) {
      if (/symptom/i.test(q)) return { used: [], lines: ["Log a symptom when it comes up, with a strength if you can, and how long it lasted.", "A short note on what was going on that day helps you remember it later."], try: `Log ${ORD} as well as rough ones, so Florin can compare them.`, fine: FINE_SYM };
      if (/\bnote\b/i.test(q)) return { used: [], lines: ["Anything that shaped your week is worth a line: a late dinner, travel, a short night or a busy day.", "Notes stay with the day, for you and a clinician to read later."], try: "Add it to the day it happened, from History." };
      return { used: ["k.gap"], lines: ["Log each BM when it happens, with the closest form, and symptoms when they come up.", `Meals help most when they're logged on ${ORD} too, and a day with no BM can be logged as No BM, so it isn't read as a gap.`], try: "Start from the plus button whenever something happens." };
    },
    week(R, q, off) {
      const s = R.w, lead = off ? "Ask Florin answers from your own logs, so here's what they show." : "";
      if (!R.u) return { used: ["learn", "w.logged", "w.bms", "w.sym"], lines: [lead, `You're on day ${R.day} of ${L.LEARN_DAYS}, so Florin is still learning your usual.`, s.logged ? `So far: ${plural(s.logged, "day")} logged, ${plural(s.bms, "BM")} and ${plural(s.withSym, "day")} with symptoms.` : "Nothing is logged yet."], try: "Start from the plus button whenever something happens." };
      /* a flagged today: left out of the count and said, the score read against nothing, and the clinician path offered */
      const lines = [lead, s.known ? `${upper1(s.lbl)}, ${s.within} of ${plural(s.known, "day")} sat within your usual: first BM in your window, a usual count and usual forms.` : `Nothing is logged ${s.lbl}.`, s.flag ? RU.FLAG_DAY : "", R.score != null ? `Your FloraScore today is ${R.score}${R.rel ? `, ${lower1(R.rel)}` : ""}.` : "", s.withSym ? L.symLine(s.F) : `No symptoms are logged ${s.lbl}.`];
      const ra = roomAct(R);
      return Object.assign({ used: ["w.within", s.flag && "w.flag", "s.today", "w.sym", "w.symtop", ra && ra.id].filter(Boolean), lines, try: s.flag ? FLAG_TRY : ra ? `${upper1(ra.text)}.` : "Keep logging as things happen." }, weekChart(R, s));
    }
  };

  /* ---------- the question that hands the turn back (DESIGN.md, Ask Florin: one bold question per turn, never repeated in
     the body). It offers one more thing to look at in the logs, and each offer carries the question a "yes" asks, so
     the turn can always be answered. An offer the chat already asked is passed over (pickOffer) ---------- */
  const OFFER = {
    timing: ["Want to look at your timing this week?", "How was my timing this week?"],
    often: ["Want to look at how often you went this week?", "How often do I go?"],
    forms: ["Want to look at your forms this week?", "How were my forms this week?"],
    sym: ["Want to look at your symptoms this month?", "How have my symptoms been?"],
    rough: ["Want to look at what tends to come before your rougher days?", "What tends to come before my rougher days?"],
    later: ["Want to look at what tends to come before your later mornings?", "What tends to come before my later mornings?"],
    looser: ["Want to look at what tends to come before a looser BM?", "What tends to come before a looser BM?"],
    sure: ["Want to see how sure these patterns are?", "How sure are these patterns?"],
    test: ["Want to see how to test one?", "How do I test one?"],
    other: ["Want to look at what else could be part of it?", "What else could be part of it?"],
    meals: ["Want to look at what you've been eating?", "What have I been eating?"],
    week: ["Want to look at your week so far?", "What do my logs show this week?"],
    report: ["Want to see how to bring your logs to a clinician?", "How do I bring my logs to a clinician?"],
    logwhat: ["Want to know what to log, and when?", "What should I log, and when?"],
    learn: ["Want to know how Florin learns your usual?", "How does Florin learn my usual?"],
    ck: ["Want to look at your check-ins next to your first weeks?", "What changed since I started?"]
  };
  const OFFER_ANY = "What would you like to look at next?";
  const scoreQ = (R) => (R.mv && R.score != null ? (R.mv.delta > 0 ? "Why did my FloraScore go up this week?" : R.mv.delta < 0 ? "Why did my FloraScore go down this week?" : "What's behind my FloraScore this week?") : null);
  const PART_OFFER = { timing: "timing", often: "often", form: "forms", comfort: "sym" };
  function offersOf(R, it, q) {
    const O = (k) => OFFER[k], u = R.u, PR = R.PR, found = !!(u && PR && !PR.sparse && PR.found.length);
    const sq = scoreQ(R), score = sq ? ["Want to look at what moved your FloraScore this week?", sq] : null;
    const start = [O("logwhat"), O("learn")];
    const s = spanFor(R, it === "form" ? "form" : it === "often" ? "often" : "timing", q, R.w);
    const list = {
      score: !u ? start : [R.room ? O(PART_OFFER[R.room.key]) : null, O("week"), O("rough")],
      scoreHow: !u ? start : [score, O("week")],
      timing: !u ? start : [s.later ? O("later") : null, O("often"), O("forms")],
      often: !u ? start : [O("forms"), O("timing")],
      gap: [O("often"), O("logwhat")],
      form: !u ? start : [s.looser ? O("looser") : null, O("sym"), O("timing")],
      symptoms: [u ? O("rough") : null, O("meals"), O("logwhat")],
      rough: [found ? O("sure") : O("meals"), O("report")],
      patterns: [found ? O("test") : O("meals"), O("other"), O("sure")],
      test: [O("other"), O("sure")],
      try: [O("week"), O("rough")],
      meals: [u ? O("rough") : null, O("sure"), O("logwhat")],
      checkin: [O("week"), O("timing")],
      report: [u ? O("week") : null, O("logwhat")],
      clinician: [O("report"), u ? O("week") : null],
      learn: [O("logwhat"), u ? O("week") : null],
      logHow: [O("learn"), u ? O("week") : null],
      week: !u ? start : [score, O("timing"), O("rough")]
    }[it] || [O("week")];
    /* the check-in only while it's on; the patterns only once there's a usual */
    return list.filter(Boolean).filter(([, y]) => (R.ck || !/since I started/.test(y)) && (u || !/rougher|later mornings|looser|sure|test one|part of it/.test(y)));
  }
  /* two questions are the same when they'd get the same answer */
  const sameKey = (R) => (q) => { try { const r = route(q); return r.kind === "ask" ? textOf(answerOf(R, q)) : `${r.kind}:${r.which || q.toLowerCase()}`; } catch (e) { return q.toLowerCase(); } };
  function pickOffer(R, offers, asked) {
    const key = sameKey(R), seen = new Set(asked.filter(Boolean).map(key));
    const o = offers.find(([, y]) => !seen.has(key(y)));
    return o ? { ask: o[0], yes: o[1] } : { ask: OFFER_ANY, yes: null };
  }

  /* ---------- which answer a question gets: the first intent whose words it has, else the card it came from ---------- */
  /* a question about the emergency room, A&E or urgent care gets the clinician answer with the urgent-care line */
  const URGENTQ = /\b(emergency|hospital|urgent care|urgent|walk-in|999|911|112)\b|\b(the|an) (er|a ?& ?e)\b/i, URGENTQ_CASE = /\bER\b|\bA ?& ?E\b/;
  const URGENT_LINE = "If it's severe, or you feel very unwell, get urgent care now.";
  /* mucus isn't an alarm feature, but Florin never reads it either: the flag note's line, the clinician answer, and
     the question stays on the phone */
  const MUCUS = /\bmucus\b|\bmucous\b/i;
  const MUCUS_LINE = "If mucus is new for you, keeps showing up, or comes with pain or blood, check in with a clinician.";
  const INTENTS = [
    ["report", /\breports?\b|\bbring (my |these |the )?logs\b|\bshare (my |these |the )?logs\b|\bexport\b/i],
    ["clinician", /\bclinicians?\b|\bdoctors?\b|\bgp\b|\bnurse|\bappointment|\bprimary care\b|\bprovider\b|\bsee (someone|a person)\b|\bgastroenterologists?\b|\bgastro\b|\bspecialists?\b|\bconsultants?\b/i],
    ["clinician", MUCUS],
    ["clinician", URGENTQ],
    ["clinician", URGENTQ_CASE],
    ["logHow", /\bhow (do|should|can) i log\b|\blog \w+ well\b|\bwhat (should|do) i (need to )?log\b|\bwhat to log\b|\bwhen (should|do) i log\b|\bwhat should i note\b/i],
    ["scoreHow", /\b(flora ?score|score)\b.*\b(worked out|work out|calculated|built|made up)\b|\bhow (is|does) (my )?(flora ?score|the score)\b/i],
    ["score", /\bflora ?score\b|\bscore\b|\b(?<!starting )points?\b|\bmoved\b/i],
    ["checkin", /\bcheck-?ins?\b|\bstarting point\b|\bsince i (started|began)\b|\bfirst (three |3 )?weeks\b/i, (R) => R.ck],
    ["test", /\b(test|check) (it|one|this|a pattern)\b|\bhow (do|can) i (test|check)\b|\bfood check\b/i],
    ["patterns", /\bpatterns?\b|\bhow sure\b|\b\d+ logs\b|\bwhat else could\b|\bpart of it\b/i],
    ["rough", /\brough(er)?\b|\bbad days?\b|\bworse days?\b|\bharder days?\b|\b(comes?|came|happens?) before\b|\btends? to (come|follow|happen)\b|\btriggers?\b/i],
    ["try", /\bwhat (can|could|should|might) i (try|do|change)\b|\bany (tips|ideas)\b|\btry\b/i],
    ["meals", /\bmeals?\b|\bfoods?\b|\beat(ing|s)?\b|\bate\b|\bdinners?\b|\bbreakfasts?\b|\blunch(es)?\b|\bsnacks?\b|\bdrinks?\b|\bcoffee\b/i],
    ["gap", /\bgaps?\b|\bzero\b|\bmiss(ed)? (a )?days?\b|\bdidn'?t log\b/i],
    ["timing", /\btiming\b|\bwindow\b|\bmornings?\b|\bwhat time\b|\bwhen (do|does|did) (i|my)\b|\bfirst bm\b|\blater\b|\bearlier\b|\bearly\b|\blate\b/i],
    ["often", /\bhow often\b|\bhow many\b|\bbusier\b|\bcount\b|\ba day\b|\bfrequen\w*|\bno bm\b|\btimes a day\b/i],
    ["form", /\bforms?\b|\bconsistency\b|\bloose(r)?\b|\bfirm(er)?\b|\bhard(er)?\b|\bwatery\b|\bsoft(er)?\b|\btypes?\b|\bshape\b|\bpellets?\b/i],
    ["symptoms", /\bsymptoms?\b|\bbloat\w*|\bpain\b|\bcramp\w*|\bgas\b|\bnausea\w*|\benergy\b|\btired\b/i],
    ["learn", /\busual\b|\blearn\w*|\bwait\b|\bhow does florin\b/i],
    ["week", /\bweek\b|\bchanged?\b|\bhow am i\b|\bhow('?s| is| are) (it|things|my logs)\b|\boverall\b|\bsummary\b|\btoday\b|\bdoing\b|\bshow\b/i],
    ["logHow", /\blogging\b|\btrack\w*/i]
  ];
  const CTX_INTENT = { score: "score", timing: "timing", often: "often", form: "form", sym: "symptoms", ck: "checkin", pat: "patterns" };
  const LOGWORDS = /\b(bms?|logs?|logged|gut|score|florascore|symptoms?|meals?|food|usual|bloat\w*|pain|form|timing|morning|days?|week)\b/i;
  function intentOf(q, R) {
    q = plainQ(q);
    const hit = INTENTS.find(([, rx, ok]) => rx.test(q) && (!ok || ok(R)));
    if (hit) return { it: hit[0], off: false };
    const k = R.ctxK ? (R.ctxK.indexOf("pattern:") === 0 ? "patterns" : CTX_INTENT[R.ctxK]) : null;
    if (k && (k !== "checkin" || R.ck)) return { it: k, off: false };
    return { it: "week", off: !LOGWORDS.test(q) };
  }
  /* a fact line as From your logs shows it: its label, with the stretch it's from, and its value */
  const lineOf = (R, id) => { const [l, v, sc] = R.X[id]; return [sc ? `${l}, ${sc}` : l, v]; };
  /* force: an intent to answer with whatever the question says (the clinician answer, when Claude's text pointed to
     primary care and failed a check) */
  function answerOf(R, q, force) {
    const { it, off } = force ? { it: force, off: false } : intentOf(q, R);
    const o = A[it](R, q, off);
    const used = [];
    (o.used || []).forEach((id) => { if (R.X[id] && !used.some((u) => u.id === id)) { const [l, v] = lineOf(R, id); used.push({ id, l, v }); } });
    return { intent: it, lines: (o.lines || []).filter(Boolean).slice(0, 3), try: o.try || "", chart: o.chart || "", legend: o.legend || "", used: used.map((u) => [u.l, u.v]), usedIds: used.map((u) => u.id), fine: o.fine || FINE, offers: offersOf(R, it, q) };
  }
  const textOf = (a) => [...(a.lines || []), a.try].filter(Boolean).join(" ");
  /* an answer that stays on the phone even where Claude is there: the clinician answer to a question about mucus */
  const stays = (comp, q) => comp.intent === "clinician" && MUCUS.test(q || "");

  /* ---------- steps 1 and 2: alarm words, then a request Florin never answers itself ---------- */
  /* Step 1 is L.alarmsIn, the check a log's note uses, with the wider net for how people write a sign (L.ALARM_WIDE):
     a stool or BM next to black, very dark, tar or red; a temperature; weight lost by the kilo or pound; up or awake at
     night to go; being sick. A hedge ("not sure if that was blood") isn't read as a no, and a clause that says no to
     the sign ("no blood") isn't caught. One net, so a note and a question hear the same phrasings. Florin only names
     the sign. */
  const signsIn = (q) => L.alarmsIn(q);

  /* Step 2: a request to diagnose, prescribe, dose or predict, or to say what to cut out, gets a fixed, kind redirect. A
     question about what will happen is one only when it isn't about the app ("will my logs be in the report"). A
     question that names a condition always needs a condition word, so "Could it be a gap in my logs?" and "Does this
     mean I have a pattern?" stay questions about the logs */
  const COND = "ibs|ibd|sibo|celiac|coeliac|cancer|crohn'?s|colitis|gastritis|ulcers?|inflammation|an? (\\w+ ){0,2}(intolerance|allergy|infection|disease|condition|syndrome|ulcer)";
  const MEDS = "probiotics?|prebiotics?|supplements?|medicines?|medications?|meds|pills?|tablets?|drugs?|laxatives?|antibiotics?|enzymes?";
  const REDIRECT = [
    /\bdiagnos\w*/i,
    /\bwhat('?s| is) wrong with me\b/i,
    new RegExp(`\\b(do|might|could) i have (${COND})\\b`, "i"),
    new RegExp(`\\b(is|could|might) (it|this|that) (be )?(${COND}|inflamed)\\b`, "i"),
    new RegExp(`\\b(does|could|might|would) (this|that|it) mean (that )?i('ve got|'ve| have| might have| could have| got) (${COND})\\b`, "i"),
    /\b(what|which) (conditions?|illness(es)?|diseases?|disorders?)\b/i,
    /\binflam\w*/i,
    /\b(tell me|let me know|know|find out|check|see|work out) (if|whether) i('ve| have| might have| could have| got)\b/i,
    /\bam i (\w+ )?(intolerant|allergic|sick|ill)\b/i,
    /\bis (it|this|that) (ibs|ibd|sibo|cancer|celiac|coeliac|serious|something serious|an? (\w+ ){0,2}(intolerance|allergy|infection|disease|condition))\b/i,
    /\bwhat('?s| is| could be| might be| do you think is) (going on|happening)( (with|in|to) (me|my (gut|body|stomach|belly|insides|bowels?|digestion|system)))?\s*\??$/i,
    /\bwhat (could|might|do you think) (it|this|that) (be|is)\b|\bwhat do you think (it is|is wrong|this is|that is|i have)\b/i,
    /\bprescri\w*/i,
    /\bdos(e|es|age|ing)\b/i,
    /\b(should|can|could|do) i (take|use|start|stop|need|try) (a |an |some |any |the |more |less |my )?(\w+ ){0,2}(medications?|medicines?|meds|pills?|tablets?|drugs?|supplements?|probiotics?|laxatives?|antibiotics?|imodium|loperamide|painkillers?|ibuprofen|paracetamol|enzymes?)\b/i,
    new RegExp(`\\b(what|which) (\\w+ )?(${MEDS}) (is|are|would|should|can|could|do|might|will)\\b|\\b(best|recommend\\w*) (an? |any |some )?(\\w+ )?(${MEDS})\\b`, "i"),
    new RegExp(`\\b(would|could|will|does|do|might|can) (an? |some |any |the |more |less |taking |trying )?(\\w+ )?(${MEDS}) help\\b`, "i"),
    /\bhow (much|many) (\w+ ){0,3}(should|can|do) i take\b/i,
    /\b(treat|treats|treatment|cure|cures)\b/i,
    /\bpredict\w*|\bforecast\w*/i,
    /\bwill i (have|get|be|feel|flare)\b|\b(am i|is it) going to (have|get|be|flare)\b|\bhow will i feel\b|\bwhat will (happen|tomorrow)\b|\bnext (flare|flare-up|rough day|bad day)\b/i
  ];
  const FORECAST = [
    /\bwill (my|it|this|that|things|tomorrow|today|tonight|i|the|these|those|they)\b.*\b(be|go|get|feel|stay|come|happen|rise|drop|fall|change|look|better|worse|up|down|back|away|settle|clear|last|end|stop|continue|keep|have)\b/i,
    /\btomorrow\b.*\b(going to|gonna|be|will|likely)\b|\b(going to|gonna|will|likely)\b.*\btomorrow\b/i,
    /\bwhat will\b.*\b(be|look|happen)\b/i,
    /\b(is|are) (it|this|that|things|my \w+) (going to|gonna)\b/i
  ];
  const APPQ = /\b(log|logs|logged|logging|report|app|florin|chat|reminders?|history|screen|notes?|check-?ins?)\b/i;
  const FOODQ = /(\b(should|can|could|do|must) i\b|\bwould it help to\b|\bis it (better|best) to\b)(?:(?![.?]).){0,24}?\b(cut (out|back on|down on)|stop (eating|drinking|having)|avoid|give up|eliminate|go (gluten|dairy|lactose|sugar|meat|wheat)[- ]free)\b/i, FOODQ2 = /\b(is|are) (\w+ ){1,3}(bad|good|ok|okay|safe) for (me|my)\b/i;
  /* quitting, skipping or still having a food, and whether going without one would help */
  const FOODQ3 = new RegExp(`\\b(should|can|could|do|must) i\\b(?:(?![.?]).){0,24}?\\b(quit|skip|stop|cut|go without|still (eat|have|drink))\\b (the |my |any |a |eating |having |drinking )?((${FOOD_ADJ}) )?(${FOODW})(s|es)?\\b`, "i");
  const FOODQ4 = new RegExp(`\\b(would|does|will|could|might|do) (going|cutting|stopping|giving up|dropping|quitting|skipping|avoiding|eating less|drinking less|having less)( out| down on| back on)? ((${FOOD_ADJ}) )?(${FOODW})(s|es)?([- ]free)? (out )?help\\b`, "i");
  /* curly apostrophes, as a phone types them, read as straight ones */
  const plainQ = (q) => String(q || "").replace(/[‘’]/g, "'");
  const redirectOf = (q) => {
    q = plainQ(q);
    if (REDIRECT.some((rx) => rx.test(q))) return "clinic";
    if (FOODQ.test(q) || FOODQ3.test(q) || FOODQ4.test(q) || (FOODQ2.test(q) && !APPQ.test(q))) return "food";
    if (!APPQ.test(q) && FORECAST.some((rx) => rx.test(q))) return "ahead";
    return null;
  };
  const isRedirect = (q) => !!redirectOf(q);
  const ALARM_PRIMARY = "Primary care is the right first stop: your GP or a nurse practitioner.";
  /* a flagged today, in the week and score answers: the clinician path, never a reading */
  const FLAG_TRY = "For the log noted today, primary care is the right first stop: your GP or a nurse practitioner. Your logs can go with you as a report.";
  const alarmAnswer = (signs) => {
    const bleed = signs.includes("Blood") || signs.includes("A black or tar-like stool");
    const a = {
      kind: "alarm", intent: "alarm", src: "rules", sign: L.signText(signs),
      signLine: "You mentioned this, and it's worth a clinician's look soon. Florin won't try to read it.",
      urgent: bleed ? "If there's a lot of blood, or you feel faint or dizzy, get urgent care now." : URGENT_LINE,
      lines: [ALARM_PRIMARY, "Your logs can go with you as a report, so you don't have to remember dates."],
      try: "", used: [], fine: "Florin names the sign and doesn't read past it. Ask Florin isn't a clinician.",
      /* the studio's question, and what a yes or a no to it gets: the report to bring, or urgent care if it's severe */
      ask: "Can you get an appointment with primary care in the next few days?", yes: REPORT_Q
    };
    a.noLines = [a.urgent, "When you can get an appointment, your logs can go with you as a report."];
    /* read in the order it's drawn: the sign's line, primary care first, then urgent care, then the report */
    a.text = [a.signLine, a.lines[0], a.urgent, a.lines[1]].join(" ");
    return a;
  };
  const REDIRECTS = {
    clinic: { lines: ["That one is for a clinician, not an app.", "Florin reads your logs against your own usual, so it can show what changed and when, but not what's behind it, what to take or what comes next.", "Your logs can go with you to primary care as a report."], opts: ["What do my logs show this week?", "How do I bring my logs to a clinician?"] },
    ahead: { lines: ["Florin doesn't say what comes next.", "It reads your logs against your own usual, so it can show what changed, when, and what has tended to come together.", "If something feels off for you, primary care is the right first stop."], opts: ["What do my logs show this week?", "What tends to come before my rougher days?"] },
    food: { lines: ["What to cut out is one for a clinician or a dietitian, not an app.", "Florin can show what has tended to come before a rougher day, and a food check looks at one food at a time against your own usual.", "Your logs can go with you to primary care as a report."], opts: ["What tends to come before my rougher days?", "How do I bring my logs to a clinician?"] }
  };
  const redirectAnswer = (which) => {
    const r = REDIRECTS[which] || REDIRECTS.clinic;
    return { kind: "redirect", intent: "redirect", src: "rules", lines: r.lines.slice(), try: "", used: [], opts: r.opts.slice(), ask: "Want to look at one of these instead?", yes: r.opts[0], fine: "Florin reads your logs and doesn't go past them. Ask Florin isn't a clinician." };
  };
  /* what a question gets, before anything is sent anywhere */
  function route(q) {
    const signs = signsIn(q);
    if (signs.length) return { kind: "alarm", signs };
    const r = redirectOf(q);
    if (r) return { kind: "redirect", which: r };
    return { kind: "ask" };
  }
  /* Claude's answer sent the person to primary care or urgent care: if it fails a check, the clinician answer takes
     its place, never an answer about something else */
  const CLIN_TEXT = /\b(primary care|urgent care|emergency|A ?& ?E)\b|\bsee (a|your) (clinician|doctor|GP|nurse)\b/i;

  /* ============================== STEP 3: CLAUDE ============================== */
  const rulesFor = (R) => [
    `You are Ask Florin, the chat in the Florin app, a wellness app where people log their BMs, symptoms${R.ck ? ", meals and a weekly check-in" : " and meals"} by hand. Answer the person's question from the facts below, which Florin worked out from their own logs.`,
    "Rules:",
    "- Wellness only. Read everything against the person's own usual, never against other people.",
    "- Never diagnose, predict, treat or prescribe, and never suggest a dose, a medicine, a supplement or a probiotic, or cutting out a food. Never say what a change means for their health.",
    "- Never say what will happen tomorrow, next week or soon, or what a change would lead to, and never use likely or probably.",
    "- Never name a trigger, an intolerance, a sensitivity, an allergy, inflammation or a condition, and never say a food is behind, causing or to blame for anything. Patterns show what tends to happen together, never a cause.",
    "- Never suggest skipping, cutting down on or going without a food, even to test it.",
    "- Never reassure and never judge: no nothing to worry about, no on track, and no good, bad, better or worse about their gut, their health or their FloraScore.",
    "- Never use the words normal, healthy, good, bad, regular, improving, worsening or resolved. Use neutral words: within your usual, outside your usual, more often, less often, about the same, seen together.",
    "- Never compare them with other people or say what most people do.",
    "- No em dashes, no exclamation points, no humour, no jokes, no emoji, no markdown, no lists.",
    "- Use a number only if it appears in the facts, written in digits exactly as it appears there, and say \"5 of 6\" only for a pair the facts state. Never work out a new number, a share or a percentage, and never say half.",
    "- Write 2 or 3 short sentences in plain words, to the person as you, and end them on one thing to log or try.",
    "- Then, as the last line, ask one short question that hands the turn back: an offer to look at one more thing in their logs, such as their timing, how often they go, their forms, their symptoms or what tends to come before a rougher day. Only one question in the whole answer, never repeating what you just said, and never about how they feel.",
    "- Never name IBD, the Bristol scale or IBS-SSS. Say BM, never bowel movement.",
    "- Answer only about the person's own logs. If the question is about anything else, say briefly what their logs can show instead.",
    "- If the person mentions blood, a black or tar-like stool, a fever, vomiting that won't stop, weight loss or waking at night to go, tell them to contact primary care soon, and don't interpret it.",
    "- If the person mentions mucus, say that if it's new for them, keeps showing up, or comes with pain or blood, they should check in with a clinician, and don't interpret it."
  ].join("\n");
  /* the rules and the facts lead, then the last few exchanges the page kept, then the new question */
  function turnsFor(ch, R, q, pendingId) {
    const pairs = [];
    for (let i = 0; i < ch.msgs.length - 1; i++) {
      const m = ch.msgs[i], a = ch.msgs[i + 1];
      /* a computed answer's question goes with it, so a yes to it reads in context */
      if (m.role === "user" && a.role === "florin" && a.id !== pendingId && a.kind === "answer" && a.state === "done" && a.text) pairs.push([m.text, a.src === "claude" || !a.ask ? a.text : `${a.text} ${a.ask}`]);
    }
    /* left out of this chat in What Ask Florin knows: the earlier exchanges, and the first name */
    const hist = R.forget && R.forget.chat ? [] : pairs.slice(-3).flatMap(([u, a]) => [{ role: "user", content: u }, { role: "assistant", content: a }]);
    return [{ role: "user", content: `${rulesFor(R)}\n\nFacts from ${R.forget && R.forget.name ? "the person's" : `${R.M.P.name}'s`} logs, worked out by Florin:\n\n${R.text}` }].concat(hist, [{ role: "user", content: q }]);
  }
  /* the fact lines an answer from Claude used: a line counts only when every number in it, and every "5 of 6" pair, is
     in the answer, ranked by the words its label shares with the answer. With none, the computed answer's lines */
  const wordsOf = (t) => new Set((String(t || "").toLowerCase().match(/[a-z]{4,}/g) || []).map((w) => w.replace(/s$/, "")));
  const usedFor = (text, R, comp) => {
    /* a number inside a pair ("5 of 6") backs only a line with that pair, never a line that states 5 alone */
    const t = digitize(text), tp = new Set(pairsIn(t)), tw = wordsOf(t);
    const ts = new Set(numsIn(t.replace(/(\d+) of (?:(?:the|your|their|those|these|all) )?(\d+)\b/g, " ")));
    const hit = [];
    Object.keys(R.X).forEach((id, order) => {
      const [l, v] = lineOf(R, id), ps = pairsIn(v), ns = numsIn(v.replace(/(\d+) of (?:(?:the|your|their|those|these|all) )?(\d+)\b/g, " "));
      if (!ps.length && !ns.length) return;
      if (!ns.every((x) => ts.has(x)) || !ps.every((x) => tp.has(x))) return;
      let score = 0;
      wordsOf(`${l} ${v}`).forEach((w) => { if (tw.has(w)) score++; });
      hit.push({ l, v, score, order });
    });
    hit.sort((a, b) => b.score - a.score || a.order - b.order);
    return hit.length ? hit.slice(0, 6).map((h) => [h.l, h.v]) : comp.used;
  };

  /* the sample capability: asked for once, at load. null on a local file, in a test page, or where it isn't served.
     A view that turns it down (not_granted and the like) hides the Claude path for the rest of the view */
  const ASK = { state: "waiting", off: null, used: false };
  let sampleFn = null;
  const HIDE = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
  const OFF_NOTE = { not_granted: "Claude wasn't allowed for this page, so answers come from your logs alone.", sampling_disabled: "Claude isn't available on this account, so answers come from your logs alone." };
  const ERR_NOTE = {
    rate_limited: "Claude is busy on your account just now, so this answer comes from your logs alone. You can ask again later.",
    session_expired: "Sign in to Claude again to get its answers here. This one comes from your logs alone.",
    upstream_error: "Claude couldn't answer just now, so this answer comes from your logs alone."
  };
  const srcLine = () => (ASK.off ? "Answers come from your logs alone: Claude isn't available in this view." : ASK.state === "ready" ? (ASK.used ? "Answers come from Claude on your own account, using only your logs' numbers, each one checked against Florin's rules." : "Answers come from Claude once you allow it, using only your logs' numbers, each one checked against Florin's rules.") : "Answers come from your logs alone, worked out on this phone.");
  const samplePromise = (async () => {
    try {
      const c = window.claude;
      const f = c && typeof c.use === "function" ? await c.use("sample") : null;
      sampleFn = typeof f === "function" ? f : null;
    } catch (e) { sampleFn = null; }
    ASK.state = sampleFn ? "ready" : "none";
    try { const api = EXT.api; if (api) api.layer.querySelectorAll(".ap-askx-src").forEach((el) => (el.textContent = srcLine())); } catch (e) { warn("updating the source line", e); }
    return sampleFn;
  })();

  /* ============================== THE CHAT ============================== */
  /* q: the question a card's Question style (E) showed, so the box opens with that one (refresh-ask.css, askWidget) */
  const ctxKey = (ctx) => (ctx ? `${ctx.k}|${ctx.range}|${ctx.q || ""}` : null);
  /* a new model (another person, other logs, Reset) starts a new chat, and stops an answer still coming for the old one.
     forget: what the person left out of this chat in What Ask Florin knows; a new chat starts with everything again */
  const chatOf = (S) => {
    if (!S.askx || S.askx.M !== S.M) {
      if (S.askx && S.askx.busy) { try { S.askx.busy.ctl.abort(); } catch (e) { /* already stopped */ } }
      S.askx = { M: S.M, msgs: [], draft: "", preload: "", ctxKey: null, ctxSent: null, busy: null, seq: 0, forget: {} };
    }
    return S.askx;
  };
  const alive = (ch, S) => S.askx === ch && ch.M === S.M;
  const stopChat = (S) => { const ch = S && S.askx; if (ch && ch.busy) { try { ch.busy.ctl.abort(); } catch (e) { /* already stopped */ } } };
  const readFor = (M, V, ctx, ch) => read(M, V, ctx, { forget: (ch && ch.forget) || {} });

  /* redraw the tab in place, keeping the box's words and where focus was. A new question scrolls up to near the top
     of the screen, so its answer reads from the start as it comes in under it */
  function paint(api, o = {}) {
    const S = api.S;
    if (S.tab !== "ask") return;
    const lay = api.layer, a = document.activeElement;
    const inPhone = !!a && a !== document.body && api.root.contains(a);
    const wasIn = inPhone && a.classList.contains("ap-askx-in"), wasAct = inPhone && a.dataset ? a.dataset.act : null;
    const wasKey = inPhone && a.dataset && a.dataset.id ? `[data-act="${CSS.escape(wasAct || "")}"][data-id="${CSS.escape(a.dataset.id)}"][data-v="${CSS.escape(a.dataset.v || "")}"]` : null;
    api.renderTab(true);
    const qEl = o.anchor && lay.querySelector(`[data-askx-q="${CSS.escape(o.anchor)}"]`);
    if (qEl) lay.scrollTop = Math.max(0, qEl.offsetTop - 64);
    if (api.top && api.top()) return;
    let f = null;
    if (wasIn || o.focusIn) f = lay.querySelector(".ap-askx-in");
    else if (["askx-send", "askx-stop", "askx-ask"].includes(wasAct)) f = lay.querySelector(".ap-askx-bar [data-act]");
    else if (wasAct === "askx-new") f = lay.querySelector(".ap-askx-in");
    else if (wasKey) f = lay.querySelector(wasKey);
    else if (wasAct) f = lay.querySelector(`[data-act="${CSS.escape(wasAct)}"]`);
    if (f) { f.focus({ preventScroll: true }); if (f.classList.contains("ap-askx-in")) { const n = f.value.length; try { f.setSelectionRange(n, n); } catch (e) { /* fine */ } } }
  }
  const paras = (text) => String(text || "").replace(/\*\*?|__|^#+\s*/gm, "").split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  /* while an answer streams, only its bubble changes: the box keeps focus and what's typed */
  function stream(api, a) {
    if (api.S.tab !== "ask") return;
    const el = api.layer.querySelector(`[data-askx-a="${CSS.escape(a.id)}"]`);
    if (!el) return;
    const th = el.querySelector(".ap-askx-think");
    if (th) th.remove();
    const body = el.querySelector(".ap-askx-text");
    if (body) body.innerHTML = paras(a.text);
  }
  function settle(api, ch, a) {
    if (ch.busy && ch.busy.id === a.id) ch.busy = null;
    if (a.state !== "stopped") a.state = "done";
    if (!a.text) a.text = textOf(a);
    if (api.S.askx === ch) {
      paint(api, { anchor: `q${a.id.slice(1)}` });
      const said = a.src === "claude" ? a.body || a.text : a.text;
      try { api.say(`Ask Florin: ${a.kind === "alarm" ? `When to see a clinician. ${a.sign}. ` : ""}${said || a.note || ""}${a.ask && a.state === "done" ? ` ${a.ask}` : ""}`); } catch (e) { /* no live region */ }
      try { api.nav(); } catch (e) { warn("telling the page", e); }
    }
    return a;
  }
  const fromComputed = (comp) => ({ kind: "answer", src: "logs", intent: comp.intent, lines: comp.lines, try: comp.try, chart: comp.chart, legend: comp.legend, used: comp.used, fine: comp.fine, text: textOf(comp), body: null, own: "", offers: comp.offers || [] });

  /* ---------- a yes or a no to the last turn's question ----------
     A short yes asks the question the last turn offered; a short no gets a short reply. Anything longer is a question
     of its own. Read after the alarm words and the redirects, so "yes, there was blood" still gets the clinician */
  const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|go on|go ahead|show me|tell me|sounds good|let'?s (do it|see|look))(,? (please|show me|tell me|go on|sure))?$/i;
  const NO = /^(no|nope|not now|not right now|no,? thanks|no,? thank you|maybe later|later|not really|not yet)$/i;
  const YES_OPT = "Yes, show me";
  /* the whole message has to be the yes or the no: "ok, how often do I go?" is a question of its own */
  function replyTo(q, last) {
    if (!last || !last.ask || last.state !== "done") return null;
    const t = plainQ(q).trim().replace(/[.!]+$/, "").replace(/\s+/g, " ");
    if (NO.test(t)) return { no: true };
    if (YES.test(t)) return last.yes ? { yes: last.yes } : null;
    return null;
  }
  const ackAnswer = (last) => (last.kind === "alarm"
    ? { kind: "answer", src: "rules", intent: "ack", lines: last.noLines.slice(), try: "", used: [], fine: last.fine, offers: [OFFER.report] }
    : { kind: "answer", src: "logs", intent: "ack", lines: ["Okay, we can leave that one.", "Ask about anything in your logs when you like."], try: "", used: [], fine: FINE, offers: [] });

  /* ---------- the questions to offer next: the card's, then from the logs. Two questions are the same when they'd get
     the same answer, so one already asked, the one in the box, or one the last turn offers is never offered again ---------- */
  const REPORT_Q = "How do I bring my logs to a clinician?";
  function nextQs(R, ch, extra) {
    const key = sameKey(R), seen = new Set(), out = [];
    ch.msgs.forEach((m) => { if (m.role === "user") seen.add(key(m.text)); else if (m.qa) seen.add(key(m.qa)); });
    if (ch.draft && ch.draft.trim()) seen.add(key(ch.draft));
    (extra || []).filter((q) => q && q !== YES_OPT).forEach((q) => seen.add(key(q)));
    const add = (q) => { if (!q) return; const k = key(q); if (seen.has(k)) return; seen.add(k); out.push(q); };
    if (R.c) R.c.qs.forEach(add);
    if (!R.u) ["What should I log, and when?", "How does Florin learn my usual?", "When should I talk to a clinician?"].forEach(add);
    else {
      if (R.mv && R.score != null) add(scoreQ(R));
      else if (R.score == null && R.su) add("Why is there no FloraScore today?");
      if (R.m.withSym || (!R.PR.sparse && R.PR.found.length)) add("What tends to come before my rougher days?");
      if (R.w.mornings) add("How was my timing this week?");
      add(REPORT_Q);
      ["How often do I go?", "How have my symptoms been?", "What could I try this week?"].forEach(add);
    }
    return out;
  }
  /* the chips under the chat: after the clinician answer none (its turn has the report to bring, DESIGN.md: no
     options), and none while the last turn shows its own options */
  function chipsFor(R, ch) {
    const lastA = ch.msgs.filter((m) => m.role === "florin").pop();
    if (lastA && (lastA.kind === "alarm" || (lastA.opts && lastA.opts.length))) return [];
    return nextQs(R, ch, lastA ? [lastA.yes] : []).slice(0, ch.msgs.length ? 3 : 4);
  }
  /* options about one turn in three (DESIGN.md): the first answer, then every third answer after the last turn that
     had options. A redirect always has its own, the clinician answer never */
  function optsDue(ch, a) {
    const prev = ch.msgs.filter((m) => m.role === "florin" && m !== a);
    let since = 0;
    for (let i = prev.length - 1; i >= 0; i--) {
      if (prev[i].opts && prev[i].opts.length) return since >= 2;
      if (prev[i].kind === "answer") since++;
    }
    return since === 0 || since >= 2;
  }
  /* an answer's question, what a yes to it asks, and its options. Claude's own question stands, with no yes of its
     own: a yes to it goes to Claude with the conversation */
  function finish(R, ch, a) {
    if (a.kind !== "answer" || a.state === "stopped") return a;
    const asked = ch.msgs.filter((m) => m.role === "user").map((m) => m.text).concat(ch.msgs.filter((m) => m.qa && m !== a).map((m) => m.qa), [a.qa || a.q]);
    const pk = pickOffer(R, a.offers || [], asked);
    a.ask = a.own || pk.ask;
    a.yes = a.own ? null : pk.yes;
    a.opts = null;
    if (optsDue(ch, a)) {
      const next = nextQs(R, ch, [a.yes]).slice(0, a.yes ? 2 : 3);
      const opts = (a.yes ? [YES_OPT] : []).concat(next);
      if (opts.length) a.opts = opts;
    }
    return a;
  }

  /* one question, through the four steps. computedOnly: the seeded screens, which never ask Claude */
  async function ask(api, q, o = {}) {
    const S = api.S, ch = chatOf(S);
    q = String(q || "").replace(/\s+/g, " ").trim().slice(0, MAXQ);
    if (!q || ch.busy) return null;
    const M = S.M, V = api.V(), ctx = S.askCtx;
    let R;
    try { R = readFor(M, V, ctx, ch); } catch (e) { warn("reading the logs threw, so nothing was asked", e); return null; }
    const last = ch.msgs.filter((m) => m.role === "florin").pop();
    const id = ++ch.seq;
    if (ctx) ch.ctxSent = ctxKey(ctx);
    ch.msgs.push({ id: `q${id}`, role: "user", text: q });
    ch.draft = ""; ch.preload = "";
    /* the turn keeps what it was asked under (the card, the consistency option), so a change to the phone can redraw it */
    const a = { id: `a${id}`, role: "florin", q, kind: "answer", state: "thinking", text: "", lines: null, try: "", used: [], fine: FINE, note: "", src: "logs", ctx: ctx ? Object.assign({}, ctx) : null, mode: V.form };
    ch.msgs.push(a);
    const r = route(q);
    if (r.kind === "alarm") return settle(api, ch, Object.assign(a, alarmAnswer(r.signs)));
    if (r.kind === "redirect") return settle(api, ch, Object.assign(a, redirectAnswer(r.which)));
    const rp = replyTo(q, last);
    if (rp && rp.no) return settle(api, ch, finish(R, ch, Object.assign(a, ackAnswer(last), { qa: null })));
    /* a yes asks the question the last turn offered, on the phone and to Claude alike */
    const qa = rp && rp.yes ? rp.yes : q;
    a.qa = qa;
    const comp = answerOf(R, qa);
    a.intent = comp.intent;
    /* a question that names mucus gets the clinician answer on the phone, like a sign: never sent for a reading */
    if (o.computedOnly || ASK.off || ASK.state === "none" || stays(comp, qa)) return settle(api, ch, finish(R, ch, Object.assign(a, fromComputed(comp))));
    const ctl = new AbortController();
    ch.busy = { id: a.id, ctl };
    /* an answer still coming when the chat ends (Reset, another person, other logs, a new chat) is stopped, so it
       doesn't run on in the background on the viewer's own usage. Reset tells no one, so this looks every half second */
    const gone = () => !alive(ch, S);
    const watch = setInterval(() => { if (gone()) { try { ctl.abort(); } catch (e) { /* already stopped */ } clearInterval(watch); } }, 500);
    try {
      paint(api, { anchor: `q${id}` });
      const sf = sampleFn || (await samplePromise);
      if (!alive(ch, S)) return null;
      if (ctl.signal.aborted) return settle(api, ch, Object.assign(a, { state: "stopped", note: "Stopped." }));
      if (!sf || ASK.off) return settle(api, ch, finish(R, ch, Object.assign(a, fromComputed(comp))));
      try {
        const res = await sf(turnsFor(ch, R, qa, a.id), {
          modelTier: "quick", cache: false, signal: ctl.signal,
          onText: ({ text }) => {
            if (gone()) { try { ctl.abort(); } catch (e) { /* already stopped */ } return; }
            if (ch.busy && ch.busy.id === a.id) { a.state = "streaming"; a.text = text; stream(api, a); }
          }
        });
        if (!alive(ch, S)) return null;
        ASK.used = true;
        const text = String((res && res.text) || "");
        const v = checkText(text, R);
        a.checks = v;
        /* the reply and its question: the question is drawn bold, never repeated in the reply */
        const sp = splitQ(text);
        if (v.ok) Object.assign(a, { kind: "answer", src: "claude", text, body: sp.body, own: sp.q, lines: null, try: "", chart: "", legend: "", used: usedFor(text, R, comp), fine: FINE_CLAUDE, offers: comp.offers, note: res && res.truncated ? "Cut short. Ask a smaller question for the rest." : "" });
        else {
          /* Claude pointed to primary care or urgent care: the clinician answer, never one about something else */
          const fb = CLIN_TEXT.test(text) && comp.intent !== "report" && comp.intent !== "clinician" ? answerOf(R, qa, "clinician") : comp;
          Object.assign(a, fromComputed(fb), { note: CHECKED });
        }
      } catch (e) {
        if (!alive(ch, S)) return null;
        const code = e && typeof e.code === "string" ? e.code : "upstream_error";
        a.code = code;
        if (code === "cancelled") {
          const part = String((e && e.text) || a.text || "");
          if (part) ASK.used = true;
          if (part && checkText(part, R, { partial: true }).ok) Object.assign(a, { state: "stopped", src: "claude", text: part, body: null, own: "", lines: null, used: usedFor(part, R, comp), fine: FINE_CLAUDE, note: "Stopped part way." });
          else Object.assign(a, { state: "stopped", text: "", lines: null, used: [], note: "Stopped." });
        } else if (HIDE.includes(code)) {
          ASK.off = code;
          Object.assign(a, fromComputed(comp), { note: OFF_NOTE[code] || OFF_NOTE.sampling_disabled });
        } else Object.assign(a, fromComputed(comp), { note: ERR_NOTE[code] || ERR_NOTE.upstream_error });
      }
      return settle(api, ch, finish(R, ch, a));
    } finally { clearInterval(watch); }
  }

  /* ---------- the source line: one piece from the Florin journal (DESIGN.md, Ask Florin), by what the answer is
     about. The titles are the journal's own (the brand studio's journal page); the article opens in the app ---------- */
  const JOURNAL = {
    usual: "Why Florin compares you with you",
    test: "Eating earlier: a 7-day experiment",
    visit: "Bringing your data to your next appointment"
  };
  const JR_MSG = "This opens the article in the Florin journal, in the app. That comes in the next pass.";
  /* a clinician or a report: bringing your data; an answer about later dinners: the 7-day experiment; else why Florin
     compares you with you. The clinician answer to a sign has none (DESIGN.md: no sources) */
  const journalOf = (m) => (m.kind === "alarm" || m.intent === "ack" ? null
    : JOURNAL[["report", "clinician", "redirect"].includes(m.intent) ? "visit" : /\bdinners?\b/i.test(`${m.text || ""} ${(m.lines || []).join(" ")} ${m.try || ""}`) ? "test" : "usual"]);

  /* ---------- drawing ---------- */
  const REPORT_MSG = (ck) => `A report of your logs to bring to a clinician: dates, BMs, symptoms${ck ? ", meals and check-ins" : " and meals"}. That comes in the next pass.`;
  function turn(m, o = {}) {
    if (m.role === "user") return `<li class="ap-ask-me" data-askx-q="${esc(m.id)}"><p><span class="sr">You asked: </span>${esc(m.text)}</p></li>`;
    const busy = m.state === "thinking" || m.state === "streaming", done = m.state === "done";
    /* the head: the Ask token, and what the answer read, folded (From your logs) */
    const n = m.used ? m.used.length : 0;
    const from = !busy && n ? `<details class="ap-askx-from"><summary><span>${esc(`Looked at ${plural(n, "thing")} in your logs`)}</span>${RU.icon("down")}</summary><ul class="ap-askx-facts">${m.used.map(([l, v]) => `<li><span>${esc(l)}</span><b>${esc(v)}</b></li>`).join("")}</ul></details>` : `<span class="ap-askx-who">Ask Florin</span>`;
    const head = `<div class="ap-askx-hd">${tok()}<span class="sr">Answer from Ask Florin</span>${from}</div>`;
    const jt = done && !busy ? journalOf(m) : null;
    const jr = jt ? `<button type="button" class="ap-askx-jr" data-act="toast" data-msg="${esc(JR_MSG)}">${svgIc(BOOK)}<span><b>${esc(jt)}</b> <span class="ap-askx-jr-k">Florin journal</span></span></button>` : "";
    /* the clinician answer: the banner with the sign and one line, then primary care first, then urgent care, then
       the report to bring */
    const alarm = m.kind === "alarm" ? `<div class="ap-ask-alarm" role="note"><span class="ap-k">When to see a clinician</span><b>${esc(m.sign)}</b><p>${esc(m.signLine)}</p></div>` : "";
    const body = m.kind === "alarm" ? `<div class="ap-ask-body ap-askx-text"><p>${esc(m.lines[0])}</p><p class="ap-askx-urgent">${esc(m.urgent)}</p>${m.lines.slice(1).map((x) => `<p>${esc(x)}</p>`).join("")}</div>`
      : m.lines && !busy ? `<div class="ap-ask-body"><p><span class="ap-askx-text">${esc(m.lines.join(" "))}</span>${m.try ? ` <span class="ap-askx-try">${esc(m.try)}</span>` : ""}</p></div>`
      : `<div class="ap-ask-body ap-askx-text">${paras(!busy && m.body != null ? m.body : m.text)}</div>`;
    const q = done && m.ask ? `<p class="ap-ask-q ap-askx-q">${esc(m.ask)}</p>` : "";
    const opts = done && m.opts && m.opts.length ? `<div class="ap-ask-opts" role="group" aria-label="Answers to that question">${m.opts.map((x) => `<button type="button" class="ap-ask-opt" data-act="askx-ask" data-q="${esc(x)}"><span>${esc(x)}</span>${RU.icon("chev")}</button>`).join("")}</div>` : "";
    const rep = done && m.kind === "alarm" ? `<button type="button" class="ap-btn ap-btn--2 ap-btn--c ap-ask-act" data-act="toast" data-msg="${esc(REPORT_MSG(o.ck))}">${RU.icon("report")}Make a report for your clinician</button>` : "";
    const note = !busy && m.note ? `<p class="ap-askx-note">${m.note === CHECKED ? RU.icon("check") : ""}<span>${esc(m.note)}</span></p>` : "";
    const fine = busy || (m.state === "stopped" && !m.text) ? "" : `<p class="ap-fine">${esc(m.fine || FINE)}</p>`;
    const rate = done ? `<div class="ap-ask-rate" role="group" aria-label="Was this answer helpful?">${["up", "down"].map((v) => `<button type="button" class="ap-ask-thumb" data-act="askx-rate" data-id="${esc(m.id)}" data-v="${v}" aria-label="${v === "up" ? "Helpful" : "Not helpful"}" aria-pressed="${m.rate === v}">${svgIc(THUMBS[v])}</button>`).join("")}</div>` : "";
    return `<li class="ap-ask-turn ap-askx-a${m.kind === "alarm" ? " is-alarm" : ""}" data-askx-a="${esc(m.id)}">
        ${head}
        ${alarm}${jr}
        ${m.state === "thinking" ? `<p class="ap-ask-think ap-askx-think" role="status">Thinking...</p>` : ""}
        ${body}
        ${!busy && m.chart ? `<figure class="ap-ask-chart ap-askx-fig">${m.chart}${m.legend ? `<div class="ap-legend">${m.legend}</div>` : ""}</figure>` : ""}
        ${q}${opts}${rep}
        ${note || fine || rate ? `<div class="ap-askx-foot"><div class="ap-askx-prov">${note}${fine}</div>${rate}</div>` : ""}
      </li>`;
  }

  /* ---------- the opening read (DESIGN.md: a chart of the person's own logs and two sentences, before they ask
     anything): the last 7 days against their usual with the mornings drawn, the days so far while Florin is learning,
     or the card they asked from, with its own chart and its numbers ---------- */
  const CTX_CHART = { score: "score", timing: "timing", often: "often", form: "form", sym: "sym", days: "week" };
  const sent = (t) => (/[.?!]$/.test(String(t).trim()) ? String(t).trim() : `${String(t).trim()}.`);
  function openingOf(R) {
    const s = R.w;
    if (R.c) {
      const ck = R.ctxK && R.ctxK.indexOf("pattern:") === 0 ? R.ctxK : CTX_CHART[R.ctxK];
      const n = R.cs ? R.cs.n : R.ctxK === "days" && R.V ? 30 : 7;
      return Object.assign({ k: R.c.title, lead: sent(R.c.facts[0]), body: R.c.facts[1] ? sent(R.c.facts[1]) : "", q: "What would you like to know about it?" }, ck ? cardChart(R, ck, n) : {});
    }
    if (!R.u) return Object.assign({ k: "So far", lead: `You're on day ${R.day} of ${L.LEARN_DAYS}, so Florin is still learning your usual.`, body: s.logged ? `So far you've logged ${plural(s.logged, "day")} and ${plural(s.bms, "BM")}.` : "Nothing is logged yet.", q: "Where do you want to start?" }, s.mornings ? timeChart(R, s) : {});
    const ex = join([s.later ? `${s.later} later` : "", s.earlier ? `${s.earlier} earlier` : ""].filter(Boolean));
    return Object.assign({
      k: s.full ? `Last ${s.n} days` : "So far",
      lead: s.known ? `${upper1(s.lbl)}, ${s.within} of ${plural(s.known, "day")} sat within your usual.` : `Nothing is logged ${s.lbl}.`,
      body: s.flag ? RU.FLAG_DAY : s.mornings ? `Your first BM came in your usual window on ${s.inW} of ${plural(s.mornings, "morning")}${ex ? `, ${ex}` : ""}.` : "",
      q: "Where do you want to start?"
    }, s.mornings ? timeChart(R, s) : {});
  }
  function opening(R) {
    const o = openingOf(R);
    return `<section class="ap-askx-open" data-a aria-label="Ask Florin's read of your logs">
        <div class="ap-askx-hd">${tok()}<span class="ap-k ap-askx-ok">${esc(o.k)}</span></div>
        ${o.chart ? `<figure class="ap-ask-chart ap-askx-fig">${o.chart}${o.legend ? `<div class="ap-legend">${o.legend}</div>` : ""}</figure>` : ""}
        <p class="ap-ask-lead ap-askx-lead">${esc(o.lead)}</p>
        ${o.body ? `<div class="ap-ask-body"><p>${esc(o.body)}</p></div>` : ""}
        <p class="ap-ask-q ap-askx-q">${esc(o.q)}</p>
      </section>`;
  }

  function screen(M, V, ctx) {
    const api = EXT.api, S = api && api.S && api.S.M === M ? api.S : null;
    const ch = S ? chatOf(S) : { M, msgs: [], draft: "", preload: "", ctxKey: null, busy: null, forget: {} };
    const R = readFor(M, V, ctx, ch);
    /* Ask about this: the card comes in as a chip over the box, and its first question goes in the box */
    const key = ctxKey(ctx);
    if (key !== ch.ctxKey) {
      if (ch.preload && ch.draft === ch.preload) ch.draft = "";
      ch.ctxKey = key; ch.preload = "";
      if (R.c && R.c.qs && R.c.qs.length && !ch.busy) { const q0 = ctx && ctx.q && R.c.qs.includes(ctx.q) ? ctx.q : R.c.qs[0]; ch.draft = q0; ch.preload = q0; }
    }
    const chips = ch.busy ? [] : chipsFor(R, ch);
    const n = ch.msgs.length;
    const btn = ch.busy
      ? `<button type="button" class="ap-askbar-b ap-askx-stop" data-act="askx-stop" aria-label="Stop the answer">${svgIc(STOP)}</button>`
      : `<button type="button" class="ap-askbar-b ap-askx-send" data-act="askx-send" aria-label="Send"${ch.draft.trim() ? "" : ' aria-disabled="true"'}>${svgIc(SEND)}</button>`;
    return `<div class="ap-scr ap-ask ap-askx">
      <header class="ap-askx-top" data-a>
        <div class="ap-askx-th"><h1 class="ap-h1" tabindex="-1">Ask Florin</h1><span class="ap-askx-tools"><button type="button" class="ap-askx-ib" data-act="askx-mem" aria-label="What Ask Florin knows">${svgIc(MEM)}</button>${n && !ch.busy ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c ap-askx-new" data-act="askx-new">New chat</button>` : ""}</span></div>
        <p class="ap-askx-src">${esc(srcLine())}</p>
      </header>
      ${n ? `<ol class="ap-askx-log" aria-label="Conversation with Ask Florin">${ch.msgs.map((m) => turn(m, { ck: R.ck })).join("")}</ol>` : opening(R)}
      ${chips.length ? `<div class="ap-askx-sugg" role="group" aria-label="${n ? "Ask next" : "Questions to start"}" data-a>${chips.map((q) => `<button type="button" class="ap-askq" data-act="askx-ask" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
      <p class="ap-fine">${esc(`Ask Florin answers from your own logs. It isn't a clinician. ${DISC}`)}</p>
      <div class="ap-askx-dock"><div class="ap-ask-compose ap-askx-compose">
        ${R.c ? `<div class="ap-askx-ctx"><span class="ap-chip ap-chip--info" id="askx-ctx-${V.uid}">${esc(`Asking about ${R.c.title}`)}</span><button type="button" class="ap-askc-x" data-act="ask-clear" aria-label="Remove" aria-describedby="askx-ctx-${V.uid}">${RU.icon("close")}</button></div>` : ""}
        <div class="ap-askbar ap-askx-bar"><label class="sr" for="askx-in-${V.uid}">Ask about your logs</label><input id="askx-in-${V.uid}" class="ap-askx-in" type="text" maxlength="${MAXQ}" autocomplete="off" enterkeyhint="send" placeholder="Ask about your logs" value="${esc(ch.draft)}">${btn}</div>
      </div></div>
    </div>`;
  }

  /* ---------- What Ask Florin knows: what every answer reads, what can be left out of this chat, and the opt-in to
     let Ask Florin start a conversation. Plain words, and nothing it doesn't use ---------- */
  const FORGET = [
    ["name", "Your first name", (R) => R.M.P.name],
    ["today", "Today's logs", (R) => (R.todayN ? plural(R.todayN, "entry", "entries") : "Nothing logged yet")],
    ["ck", "Your weekly check-ins", () => "Each week next to your first weeks", (R, V) => RU.ckOn(V)],
    ["chat", "Earlier questions in this chat", () => "Sent with a new question, so a follow-up makes sense"]
  ];
  const REACH_F = [["week", "Once a week"], ["twice", "Twice a week"]], REACH_T = [["am", "Morning, 8 AM"], ["pm", "Evening, 7 PM"]];
  const reachOf = (S) => S.askReach || (S.askReach = { on: false, f: "week", t: "pm" });
  const reachText = (r) => `${r.f === "twice" ? "Twice a week" : "Once a week"}, ${r.t === "am" ? "in the morning" : "in the evening"}`;
  function memHTML(M, V, st, api) {
    const S = api.S, ch = chatOf(S), R = readFor(M, V, S.askCtx, ch), id = `askm${V.uid}`, u = M.usual, rc = reachOf(S);
    const known = [
      ["Your usual", u ? `${upper1(`a first BM from ${R.win}, ${u.nLo} to ${u.nHi} a day and ${R.formText}`)}, from your logs ${R.uFrom} to ${R.uTo}` : `Still learning it: day ${R.day} of ${L.LEARN_DAYS}`],
      ["Your logs", `BMs, No BM, symptoms and meals, from the last ${L.PATTERN_DAYS} days`]
    ];
    const rows = FORGET.filter((x) => !x[3] || x[3](R, V)).map(([k, b, em]) => {
      const off = !!ch.forget[k];
      return `<li class="askx-mem-row"><span class="ap-ea-m"><b>${esc(b)}</b><em>${esc(off ? "Left out of this chat" : em(R))}</em></span><button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="${off ? "askx-keep" : "askx-forget"}" data-k="${k}" aria-label="${esc(`${off ? "Put back" : "Leave out"}: ${b}`)}">${off ? "Put back" : "Leave out"}</button></li>`;
    }).join("");
    const pick = (act, opts, cur, lbl) => `<div class="ap-chs askx-mem-chs" role="group" aria-label="${esc(lbl)}">${opts.map(([v, l]) => `<button type="button" class="ap-ch${v === cur ? " is-on" : ""}" data-act="${act}" data-v="${v}" aria-pressed="${v === cur}">${esc(l)}</button>`).join("")}</div>`;
    return `<div class="ap-psh askx-mem" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2 id="${id}" tabindex="-1" data-autofocus>What Ask Florin knows</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${RU.icon("close")}</button></div>
      <p class="ap-gd-lede">Ask Florin answers from your own logs. Here's what it reads, and what you can leave out of this chat.</p>
      <section class="askx-mem-s" aria-labelledby="${id}-a"><h3 class="ap-f-l" id="${id}-a">Every answer reads</h3>
        <ul class="ap-card ap-ea askx-mem-list">${known.map(([b, em]) => `<li class="askx-mem-row"><span class="ap-ea-m"><b>${esc(b)}</b><em>${esc(em)}</em></span></li>`).join("")}</ul></section>
      <section class="askx-mem-s" aria-labelledby="${id}-b"><h3 class="ap-f-l" id="${id}-b">You can leave these out of this chat</h3>
        <ul class="ap-card ap-ea askx-mem-list">${rows}</ul></section>
      <section class="askx-mem-s" aria-labelledby="${id}-c"><h3 class="ap-f-l" id="${id}-c">A conversation from Ask Florin</h3>
        <ul class="ap-card ap-ea askx-mem-list"><li><button type="button" class="ap-ea-row askx-sw" role="switch" aria-checked="${rc.on}" data-act="askx-reach"><span class="ap-ea-m"><b>Let Ask Florin start a conversation</b><em>${esc(rc.on ? `${reachText(rc)}: a short read of your logs and one question.` : "A short read of your logs and one question, at a time you pick. Off unless you turn it on.")}</em></span><span class="askx-sw-t" aria-hidden="true"></span></button></li></ul>
        ${rc.on ? `<div class="ap-f"><span class="ap-f-l">How often</span>${pick("askx-reach-f", REACH_F, rc.f, "How often")}</div><div class="ap-f"><span class="ap-f-l">When</span>${pick("askx-reach-t", REACH_T, rc.t, "When")}</div>` : ""}
      </section>
      <p class="ap-fine">A new chat starts with everything again. Ask Florin isn't a clinician.</p>
    </div>`;
  }

  /* ============================== THE HOOKS ============================== */
  /* Member gets the chat; Free keeps the core's lock and the way into membership. If the chat throws, the screen it
     wraps is drawn instead, so this module can't take the tab down */
  const baseAsk = RU.ask;
  RU.ask = (M, V, ctx) => {
    if (!V || V.plan === "free") return baseAsk(M, V, ctx);
    try { return screen(M, V, ctx); } catch (e) { warn("the chat threw, so the Ask screen it wraps is drawn instead", e); return baseAsk(M, V, ctx); }
  };

  /* an act this module adds, or one it wraps: one that throws is reported, and the act it replaced runs in its place */
  const act = (name, f) => {
    const prev = EXT.acts[name];
    EXT.acts[name] = (b, api, e) => {
      try { return f(b, api, e, prev); } catch (err) {
        warn(`the ${name} act threw`, err);
        if (prev) return prev(b, api, e);
        return api && api.core ? api.core(name, b, e) : undefined;
      }
    };
  };
  const run = (api, q) => ask(api, q).catch((e) => warn("asking threw", e));
  act("askx-send", (b, api) => { const inp = api.layer.querySelector(".ap-askx-in"); run(api, inp ? inp.value : chatOf(api.S).draft); });
  act("askx-ask", (b, api) => run(api, b.dataset.q));
  act("askx-stop", (b, api) => stopChat(api.S));
  /* thumbs under a turn: kept on the turn for this chat, said in one line, and a second tap takes it back */
  act("askx-rate", (b, api) => {
    const ch = chatOf(api.S), m = ch.msgs.find((x) => x.id === b.dataset.id);
    if (!m) return;
    m.rate = m.rate === b.dataset.v ? null : b.dataset.v;
    paint(api);
    api.toast(!m.rate ? "Rating taken back." : m.rate === "up" ? "Thanks. In the app, ratings help tune Ask Florin's answers." : "Thanks. In the app, ratings help tune Ask Florin's answers. Try asking it another way, or tap a question below.");
  });
  /* What Ask Florin knows: a sheet over the chat */
  act("askx-mem", (b, api) => { api.push("askx-mem", {}); });
  const memRedraw = (api) => { const o = api.top(); if (o && o.type === "askx-mem") api.rerender(o); };
  const FORGET_NAME = { name: "Your first name", today: "Today's logs", ck: "Your weekly check-ins", chat: "Earlier questions in this chat" };
  act("askx-forget", (b, api) => {
    const ch = chatOf(api.S), k = b.dataset.k;
    ch.forget = Object.assign({}, ch.forget, { [k]: true });
    memRedraw(api); paint(api);
    api.toast(`${FORGET_NAME[k] || "That"} left out of this chat.`, () => { ch.forget = Object.assign({}, ch.forget, { [k]: false }); memRedraw(api); paint(api); });
  });
  act("askx-keep", (b, api) => {
    const ch = chatOf(api.S), k = b.dataset.k;
    ch.forget = Object.assign({}, ch.forget, { [k]: false });
    memRedraw(api); paint(api);
    api.toast(`${FORGET_NAME[k] || "That"} back in this chat.`);
  });
  act("askx-reach", (b, api) => {
    const rc = reachOf(api.S);
    rc.on = !rc.on;
    memRedraw(api);
    api.toast(rc.on ? `Ask Florin can start a conversation: ${lower1(reachText(rc))}.` : "Ask Florin won't start conversations.");
  });
  act("askx-reach-f", (b, api) => { const rc = reachOf(api.S); rc.f = b.dataset.v; memRedraw(api); api.toast(`Ask Florin can start a conversation: ${lower1(reachText(rc))}.`); });
  act("askx-reach-t", (b, api) => { const rc = reachOf(api.S); rc.t = b.dataset.v; memRedraw(api); api.toast(`Ask Florin can start a conversation: ${lower1(reachText(rc))}.`); });
  EXT.overlays["askx-mem"] = {
    kind: "sheet",
    render: (M, V, st, api) => { try { return memHTML(M, V, st, api || EXT.api); } catch (e) { warn("What Ask Florin knows threw", e); return ""; } },
    key: () => "ask-mem"
  };
  act("askx-new", (b, api) => {
    const S = api.S, was = S.askx;
    if (!was || was.busy) return;
    S.askx = null;
    paint(api, { focusIn: true });
    api.nav();
    api.toast("Started a new chat.", () => { if (was.M === S.M) { S.askx = was; paint(api, { focusIn: true }); api.nav(); } });
  });
  /* Ask about this, and clearing it, land in the box with the question ready */
  /* a card that reads a stretch of its own (a data style's cards) says which, so the chat reads that stretch too */
  act("ask-about", (b, api, e, prev) => {
    if (prev) prev(b, api, e); else api.core("ask-about", b, e);
    const r = +(b.dataset.range || 0), C0 = api.S.askCtx;
    /* the range the card reads, and the question its Question style showed, so the box opens with that question */
    let redraw = false;
    if (r && C0 && C0.range !== r) { C0.range = r; redraw = true; }
    if (b.dataset.q && C0 && C0.q !== b.dataset.q) { C0.q = b.dataset.q; redraw = true; }
    if (redraw && api.S.tab === "ask") api.renderTab(true);
    if (api.S.plan !== "free" && api.S.tab === "ask") api.focusSel(".ap-askx-in");
  });
  act("ask-clear", (b, api, e, prev) => { if (prev) prev(b, api, e); else api.core("ask-clear", b, e); if (api.S.tab === "ask") api.focusSel(".ap-askx-in"); });

  /* typing never redraws: the words go into the chat's draft and Send turns on; Enter sends */
  const boxOf = (e) => { const el = e.target, api = EXT.api; return el && el.classList && el.classList.contains("ap-askx-in") && api && api.root && api.root.contains(el) ? { el, api } : null; };
  document.addEventListener("input", (e) => {
    const o = boxOf(e);
    if (!o) return;
    try {
      chatOf(o.api.S).draft = o.el.value;
      const s = o.api.layer.querySelector(".ap-askx-send");
      if (s) { if (o.el.value.trim()) s.removeAttribute("aria-disabled"); else s.setAttribute("aria-disabled", "true"); }
    } catch (err) { warn("keeping what's typed", err); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    const o = boxOf(e);
    if (!o) return;
    e.preventDefault();
    try { if (!chatOf(o.api.S).busy) run(o.api, o.el.value); } catch (err) { warn("sending", err); }
  });

  /* the two seeded screens: one computed exchange, and a question that names a sign. On Free, the paywall, as for the
     other membership screens */
  const ALARM_SEED = "There was some blood on the paper this morning. Should I be worried?";
  const seedQuestion = (R) => (!R.u ? "How does Florin learn my usual?" : R.mv && R.score != null ? (R.mv.delta > 0 ? "Why did my FloraScore go up this week?" : R.mv.delta < 0 ? "Why did my FloraScore go down this week?" : "What's behind my FloraScore this week?") : "How was my timing this week?");
  function seed(api, which) {
    const S = api.S;
    if (S.plan === "free") { api.go("ask"); api.push("pay", { from: "ask" }, { instant: true }); return; }
    stopChat(S);
    S.askx = null;
    api.go("ask");
    const q = which === "alarm" ? ALARM_SEED : seedQuestion(read(S.M, api.V(), null));
    ask(api, q, { computedOnly: true }).catch((e) => warn("seeding the chat threw", e));
  }
  /* Make a report, on the note after a flagged log: Ask Florin opens on the clinician path with that log's sign in the
     question (a sign gets the When to see a clinician answer, mucus alone the answer on bringing logs to a clinician).
     Computed only, never sent to Claude. On Free, the membership sheet, as the report is a membership feature */
  act("flag-report", (b, api) => {
    const S = api.S, q = (b.dataset.q || "").trim();
    api.closeAll();
    if (S.plan === "free") { api.push("pay", { from: "report" }); return; }
    if (!q) { api.toast(b.dataset.msg); return; }
    stopChat(S);
    S.askx = null; S.askCtx = null;
    api.go("ask");
    ask(api, q, { computedOnly: true }).catch((e) => warn("asking from the flag note threw", e));
  });
  EXT.opens["ask-chat"] = (api) => seed(api, "chat");
  EXT.opens["ask-alarm"] = (api) => seed(api, "alarm");
  /* Screens > Ask Florin: the plain tab, with no chat left over from a seeded screen (the tab bar keeps the chat). The
     core's open("ask") hands over to this hook when a module registers it */
  EXT.opens.ask = (api) => { stopChat(api.S); api.S.askx = null; api.S.askCtx = null; api.go("ask"); };
  /* What Ask Florin knows, over the chat. On Free the Ask tab is the lock, so the paywall, as for the other screens */
  EXT.opens["ask-mem"] = (api) => {
    if (api.S.plan === "free") { api.go("ask"); api.push("pay", { from: "ask" }, { instant: true }); return; }
    if (api.S.tab !== "ask") api.go("ask");
    api.push("askx-mem", {}, { instant: true });
  };
  EXT.screens.push(["Ask Florin", [["ask-chat", "Ask Florin, a conversation"], ["ask-alarm", "Ask Florin, a sign that needs a clinician"], ["ask-mem", "Ask Florin, what it knows"]], { before: "Membership" }]);

  /* which screen the Ask tab is on, for the notes and the Screens list: a conversation, or one whose last answer is
     the clinician one. With a card just loaded and nothing asked about it yet, the core's Ask about this */
  const prevKey = EXT.keys["tab:ask"];
  EXT.keys["tab:ask"] = (o) => {
    try {
      const S = o && o.st;
      if (S && S.plan !== "free" && S.askx && S.askx.M === S.M && S.askx.msgs.length && !(S.askCtx && S.askx.ctxSent !== ctxKey(S.askCtx))) {
        const last = S.askx.msgs.filter((m) => m.role === "florin").pop();
        return last && last.kind === "alarm" ? "ask-alarm" : "ask-chat";
      }
    } catch (e) { warn("naming the screen", e); }
    return prevKey ? prevKey(o) : null;
  };

  /* the phone changed. New logs (another person, other data or meals) end the chat. A change to what the answers read
     (the consistency option, the check-in, the meal log) redraws every answer from the logs for the question it had,
     under the card it was asked from. An answer from Claude stays only while it still passes the checks against the
     new facts and, after a change of consistency option, names no form; otherwise the computed answer takes its place.
     With the check-in off, an exchange about the check-in goes, and so does an answer from Claude that names it */
  const namesCk = (m) => m.intent === "checkin" || /\bcheck-?ins?\b|\bcheck in\b(?! with a clinician)/i.test(`${m.text || ""} ${(m.lines || []).join(" ")} ${m.try || ""}`);
  const FORMS_RX = new RegExp(`\\b(${L.TYPES.slice(1).map((t) => t.short).concat(L.WORDS.map((w) => w.word)).filter((w, i, all) => all.indexOf(w) === i).join("|")})\\b|\\btypes? [1-7]\\b`, "i");
  function redraw(api, k) {
    const S = api.S, ch = S.askx, V = api.V();
    const out = [];
    for (let i = 0; i < ch.msgs.length; i++) {
      const m = ch.msgs[i], a = ch.msgs[i + 1];
      if (!(m.role === "user" && a && a.role === "florin")) { out.push(m); continue; }
      i++;
      if (ch.busy && ch.busy.id === a.id) { out.push(m, a); continue; }
      if (k === "checkin" && !RU.ckOn(V) && (a.intent === "checkin" || namesCk({ text: m.text }) || (a.src === "claude" && namesCk(a)))) continue;
      if (a.kind === "answer" && a.state === "done" && a.intent !== "ack") {
        const R = readFor(S.M, V, a.ctx, ch);
        const keep = a.src === "claude" && checkText(a.text, R).ok && !(k === "form" && a.mode !== V.form && FORMS_RX.test(a.text));
        if (!keep) {
          const note = a.src === "claude" ? "" : a.note, opts = a.opts;
          Object.assign(a, fromComputed(answerOf(R, a.qa || a.q)), { note, mode: V.form });
          finish(R, ch, a);
          /* the options stay where they were (about one turn in three), less any that name the check-in once it's off */
          a.opts = opts ? opts.filter((x) => R.ck || !/check-?in|since I started/i.test(x)) : null;
          if (a.opts && !a.opts.length) a.opts = null;
        }
      }
      out.push(m, a);
    }
    ch.msgs = out;
  }
  EXT.onSet.push((k, v, api) => {
    try {
      const S = api && api.S, ch = S && S.askx;
      if (!ch) return;
      if (k === "persona" || k === "data" || k === "meals") { stopChat(S); S.askx = null; return; }
      if (k === "plan" && v === "free") stopChat(S);
      if ((k === "form" || k === "checkin" || k === "mealUI") && ch.M === S.M) {
        redraw(api, k);
        if (S.tab === "ask") { api.renderTab(true); api.nav(); }
      }
    } catch (e) { warn("following a change to the phone", e); }
  });

  /* ---------- Ask button: how Ask about this looks (Will, Nov 7: "I don't know if we need as big a bubble every
     time"). A design-system option, not one of the decisions: the page puts it under View (refresh-app.js reads
     EXT.askUI), sets it through phone.set ("askUI") and stamps it on the root as data-ask-ui; refresh-ask.css draws each
     style. The markup stays the core's, the looks' and Easy's, wherever they put the button: as each one lands in the
     phone, this pass gives it the same parts (the token, "Ask" and " about this", the card's first question for the
     Question style, a chevron for the Bar) and a name that says which card. Every style keeps the token and Ray.
     Nov 8, Will: "let's do B for the ask buttons": B, Compact, is the default and the component; a viewer's stored pick
     still wins, and the other five stay to compare ---------- */
  const ASKUI = [
    ["pill", "A Pill", "A larger Ray pill with the token and Ask about this on every card."],
    ["compact", "B Compact", "Will's pick, Nov 8: a small Ray pill in the card's corner, with the token and Ask."],
    ["link", "C Link", "A quiet link in the card's corner: the token and Ask about this, no fill."],
    ["icon", "D Token", "The token alone in the card's corner. Its name says Ask about this and the card."],
    ["chip", "E Question", "The token and the card's own first question, the one Ask opens with in the box."],
    ["bar", "F Bar", "A slim row across the card's foot: a line above, the token, Ask about this and a chevron."]
  ];
  EXT.askUI = { def: "compact", opts: ASKUI, name: (v) => (ASKUI.find(([o]) => o === v) || ASKUI[0])[1] };
  /* a button's name says its card: the card's visible head where it has one (cardHead), else these, in the plain
     heads' words (Nov 7: FREQUENCY, CHECK-IN, PATTERNS) */
  const CARD_NAME = { score: "FloraScore", days: "Your days", timing: "Timing", often: "Frequency", form: "Form", sym: "Symptoms", ck: "Check-in", pat: "Patterns" };
  const ASK_SEL = ".ap-ask-b, .ap-idt-ask, .ap-ez-ask";
  /* the card's questions, as Ask about this puts the first in the box (RU.askContext, at the range Ask will read) */
  const firstQ = (api, k, range) => {
    try { const c = RU.askContext(api.M(), api.V(), { k, range: range || api.S.ins.range }); return c && c.qs ? c.qs.filter(Boolean) : []; } catch (e) { warn("the card's first question", e); return []; }
  };
  /* the head a person sees on the button's card, its screen-reader words left out ("Trend", "Frequency") */
  const cardHead = (b) => {
    const c = b.closest("[data-rlk-k], .ap-ic, .ap-card, article");
    const h = c && c.querySelector("h2, .ap-ic-h .ap-k, :scope > .ap-k");
    if (!h) return "";
    const x = h.cloneNode(true);
    x.querySelectorAll(".sr").forEach((n) => n.remove());
    return x.textContent.replace(/\s+/g, " ").trim();
  };
  const cardName = (api, k) => {
    if (CARD_NAME[k]) return CARD_NAME[k];
    if (k.indexOf("pattern:") === 0 && api) { try { const c = RU.askContext(api.M(), api.V(), { k, range: api.S.ins.range }); if (c) return c.title; } catch (e) { /* no name: the words alone */ } }
    return "";
  };
  function askWidget(b) {
    if (b.dataset.askw) return;
    const root = b.closest(".ap-rx");
    if (!root) return;
    const api = EXT.api && EXT.api.root === root ? EXT.api : null;
    const ui = root.getAttribute("data-ask-ui") || EXT.askUI.def, k = b.dataset.k || "", free = b.dataset.act === "pay";
    const glyph = [...b.children].find((c) => c.classList && c.classList.contains("ic")) || null;
    /* E Question: the card's first question that no Ask about this earlier on the same screen already shows (the
       FloraScore card and the Trend share their questions), so no two read the same. The range is the card's own;
       on Free that is 7 days, the range Free draws */
    const range = +(b.dataset.range || 0) || (free ? RU.FREE_DAYS || 7 : 0);
    let q = "";
    if (ui === "chip" && api && k) {
      const qs = firstQ(api, k, range), scr = b.closest(".ap-scr") || root;
      const shown = new Set([...scr.querySelectorAll(".ap-askw-q")].map((n) => n.textContent));
      q = qs.find((x) => !shown.has(x)) || qs[0] || "";
      if (q && !free) b.dataset.q = q;
    }
    const nm = (b.matches(".ap-ask-b") ? cardHead(b) : "") || cardName(api, k), lock = free ? ", with Florin membership" : "";
    b.dataset.askw = ui;
    b.classList.add("ap-askw");
    b.innerHTML = `${glyph ? glyph.outerHTML : RU.icon(free ? "lock" : "chat")}<span class="ap-askw-t"><span class="ap-askw-a">Ask</span><span class="ap-askw-b"> about this</span></span>${q ? `<span class="ap-askw-q">${esc(q)}</span>` : ""}${ui === "bar" ? RU.icon("chev", "ap-askw-go") : ""}`;
    b.setAttribute("aria-label", q ? `Ask Florin: ${q}${lock}` : `Ask about this${nm ? `: ${nm}` : ""}${lock}`);
  }
  const askScan = (n) => {
    if (!n || n.nodeType !== 1) return;
    if (n.matches(ASK_SEL)) askWidget(n);
    n.querySelectorAll(ASK_SEL).forEach(askWidget);
  };
  try {
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { try { askScan(n); } catch (e) { warn("drawing Ask about this in its style", e); } })))
      .observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) { warn("no MutationObserver: Ask about this keeps its markup as drawn", e); }

  /* ---------- notes for Will. Oct 28: plain, about 80 words at most, with at most one open question ---------- */
  const engineNow = () => (ASK.state === "ready" && !ASK.off ? "In this view, answers come from Claude on your own account, checked before they show." : "In this view, every answer is worked out from the logs.");
  const ASK_WAYS = "A warning sign gets the see-a-clinician answer, and a request to diagnose, dose or predict gets a fixed reply.";
  EXT.notes["ask-chat"] = (M, P) => (P.plan === "free" ? null : {
    t: "Ask Florin, a conversation",
    lede: `A chat on the person's own logs. Each turn says what it looked at and cites one Florin journal piece, answers in a few lines, and ends on one bold question that offers the next thing to look at: a yes asks it. Options come about one turn in three, with thumbs under each turn. ${engineNow()}`
  });
  EXT.notes["ask-alarm"] = (M, P) => (P.plan === "free" ? null : {
    t: "Ask Florin, a sign that needs a clinician",
    lede: "A question that names a warning sign, such as blood, a black stool, a fever or waking at night to go, gets the see-a-clinician answer: the Teal banner with the sign named, primary care first, then urgent care, and a report to bring. No source and no options. Florin never reads anything into the sign, and the question is never sent to Claude."
  });
  EXT.notes.ask = (M, P) => (P.plan === "free" ? null : {
    t: "Ask Florin",
    lede: `Before anything is asked, Ask Florin opens on a read of the last 7 days: the mornings drawn against the person's usual window, two sentences, then questions to start. Ask about this on an Insights card brings that card's chart and numbers in instead. ${ASK_WAYS} ${engineNow()}`,
    /* Ask on Free is answered (Will, Nov 7: one answer a week, questions about seeing a doctor always answered), and
       the Free note says so: this one asks the next call from the brief */
    open: ["Show an answer only once it's checked, at the cost of a pause?"]
  });
  EXT.notes["ask-about"] = (M, P) => (P.plan === "free" ? null : {
    t: "Ask about this",
    lede: `Every Insights card and detail has Ask about this, with the Ask token the Ask tab carries. It opens Ask Florin with the card's chart and numbers loaded and its first question in the box, so the answer starts from the same figures as the chart. Will picked B, Compact, on Nov 8: a small pill in the card's corner. Ask button, under View on the left, keeps the other five to compare.`
  });
  EXT.notes["ask-mem"] = (M, P) => (P.plan === "free" ? null : {
    t: "Ask Florin, what it knows",
    lede: `From the chat's header: what every answer reads (the person's usual and their logs), what they can leave out of this chat (their first name, today's logs${P.checkin === false ? "" : ", the weekly check-ins"} and earlier questions), and an opt-in to let Ask Florin start a conversation at a time they pick, off unless turned on. A new chat starts with everything again.`,
    open: ["Should the opt-in sit with the reminders in Profile too?"]
  });

  /* the engine, for work/behave.js and the notes: pure functions of the model, no DOM */
  window.FLORIN_ASK = {
    read, route, signsIn, isRedirect, intentOf, check: checkText, numbersOff, textOf, turnsFor, rulesFor, chipsFor, usedFor, sentencesIn,
    /* an answer as the chat draws it, its hand-back question included (picked against the question asked) */
    answer: (M, V, q, ctx) => {
      const R = read(M, V, ctx), r = route(q);
      if (r.kind === "alarm") return Object.assign({ R }, alarmAnswer(r.signs));
      if (r.kind === "redirect") return Object.assign({ R }, redirectAnswer(r.which));
      const A = answerOf(R, q), pk = pickOffer(R, A.offers, [q]);
      return Object.assign({ R, ask: pk.ask, yes: pk.yes }, A);
    },
    splitQ, offersOf, openingOf, replyTo, OFFER,
    state: () => ({ state: ASK.state, off: ASK.off }),
    QUESTIONS: ["Why did my FloraScore go down this week?", "How is FloraScore worked out?", "Why is there no FloraScore today?", "How was my timing this week?", "What sets my usual window?", "How often do I go?", "Why does a gap not count as zero?", "What do the forms mean?", "Why were some BMs looser?", "How have my symptoms been?", "What tends to come before my rougher days?", "How sure are these patterns?", "Why does a food need 5 logs?", "What else could be part of it?", "How do I test one?", "What could I try this week?", "What have I been eating?", "What changed since I started?", "How do I bring my logs to a clinician?", "When should I talk to a clinician?", "How does Florin learn my usual?", "What should I log, and when?", "How do I log symptoms well?", "What should I note this week?", "What do my logs show this week?", "Tell me a story about space"]
  };
})();
