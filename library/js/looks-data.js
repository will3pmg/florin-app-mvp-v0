/* Florin data looks: one set of numbers for every look.
   Built from the refresh's own model (prototype/js/refresh-data.js), so each look draws the same demo person and every
   number on the page is computed, never typed. A look only decides how the numbers are drawn. window.FLD */
(function () {
  const L = window.FLORIN_LOGS, AD = window.FLORIN_APP, RU = window.FLORIN_RUI;
  if (!L || !AD) return;
  const Ut = AD.util, T = Ut.fmtTime;
  const short = (d) => { const x = L.dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const dow = (d) => Ut.DOW[L.dateOf(d).getDay()];
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  /* the weeks every usual is learned from, days 28 to 83 (refresh-data.js, the studio's rule) */
  const BASE = [28, 83];

  /* the scale each option draws consistency on: A numbers 1 to 7, B five words, C seven words */
  const scaleOf = (mode) => (mode === "B" ? L.WORDS.map((w) => ({ k: w.k, label: w.word })) : L.TYPES.slice(1).map((t) => ({ k: t.k, label: mode === "A" ? String(t.k) : t.short })));

  /* o.mode is the consistency option (A, B or C). o.M, when given, is a model the caller already holds (the prototype
     passes its own live one, with whatever has been logged on the phone), so the looks draw it instead of a fresh
     seeded build; the persona, the logs scenario and the meal logs then come from that model */
  function build(persona, o = {}) {
    const mode = o.mode || "C";
    const M = o.M || L.build(persona, o.data || "est", { meals: o.meals || "all" });
    const u = M.usual;
    /* today, with a flag or an alarm feature logged, is noted for a clinician and never read against the usual, as
       Today's score and week card treat it (RU.flagToday): its state is "flag" in every stretch, and a look draws it
       with its own flag mark and reads nothing of it */
    const flagT = !!(u && RU && RU.flagToday && RU.flagToday(M));
    const day = (f) => ({
      d: f.d, label: short(f.d), dow: dow(f.d), date: L.dateOf(f.d).getDate(), today: f.today,
      logged: f.logged && !f.pending, pending: f.pending, state: flagT && f.today && f.logged ? "flag" : f.state, flag: flagT && f.today && f.logged, first: f.first, firstText: f.first != null ? T(f.first) : null,
      inWin: f.inWin, count: f.count, inCount: f.inCount,
      /* steps: the one step a BM sits on, or the two a B word covers when read in A or C. level is the step (A and C),
         or the word (B); a two-step word reads at the middle of its steps, so it never lands in a one-step bin */
      /* a flagged today's BMs keep their names and steps for drawing, flag: true, and are in none of the readings */
      forms: f.bms.map((b) => ({ t: b.t, name: L.formName(b, mode), steps: mode === "B" ? [L.wordKey(b)] : L.stepsOf(b), level: mode === "B" ? L.wordKey(b) : Ut.mean(L.stepsOf(b)), within: u && !(flagT && f.today) ? L.inForms(M, b, mode) : null, flag: flagT && f.today })),
      sym: Object.entries(f.sym).map(([name, s]) => ({ name, strength: s, word: s ? L.STRENGTH[s - 1] : "Strength not said" })),
      meals: f.meals.length,
      score: (L.score(M, f.d, mode) || {}).value == null ? null : L.score(M, f.d, mode).value
    });
    const span = (n) => L.span(M, n, mode).map(day);

    /* FloraScore */
    const sNow = L.score(M, L.TODAY, mode);
    const sU = L.scoreUsual(M, mode);
    const mv = L.scoreMoved(M, mode);
    const NAMES = Object.fromEntries(L.SCORE_PARTS.map(([k, l, d]) => [k, { label: l, desc: d }]));
    /* each part's own usual range: the middle 70% of that part on the days the score's usual comes from, the same rule
       as the score's. Worked out whether or not today has a FloraScore, so a look can read this week against it */
    const partsUsual = (() => {
      if (!u) return null;
      const base = [];
      for (let x = Math.max(BASE[0], M.start); x <= BASE[1]; x++) { const s = L.score(M, x, mode); if (s && s.value != null) base.push(s.parts); }
      return Object.fromEntries(L.SCORE_PARTS.map(([k]) => { const v = base.map((p) => p[k]); return [k, v.length >= 7 ? [Math.round(Ut.pct(v, 0.15)), Math.round(Ut.pct(v, 0.85))] : null]; }));
    })();
    /* a flag today: the score keeps its number but is read against nothing, as Today's hero and Day first's chip say */
    const flagS = flagT && !!sNow && sNow.value != null;
    const score = u ? {
      value: sNow ? sNow.value : null,
      usual: sU,
      flag: flagS,
      relation: flagS ? "Not read against your usual today" : !sNow || sNow.value == null || !sU ? null : sNow.value < sU[0] ? (sU[0] - sNow.value >= 6 ? "Below your usual range" : "A little below your usual range") : sNow.value > sU[1] ? "A little above your usual range" : "Within your usual range",
      /* the change is the difference of the two averages as shown, so "84, up 8 on 76" always adds up */
      weekAvg: mv ? Math.round(mv.wk) : null, lastWeekAvg: mv ? Math.round(mv.lw) : null,
      delta: mv ? Math.round(mv.wk) - Math.round(mv.lw) : null,
      parts: mv ? mv.parts.map((p) => ({ key: p.key, label: NAMES[p.key].label, desc: NAMES[p.key].desc, weight: p.weight, now: p.now, before: p.before, delta: +p.delta.toFixed(1), usual: partsUsual ? partsUsual[p.key] : null })) : [],
      /* a series point's flag: today's, on a flag day, keeps its value and is read against nothing (no within, above or
         below, and in no count of them) */
      series: Object.fromEntries([7, 30, 90].map((n) => [n, L.scoreSeries(M, n, mode).map((s) => ({ d: s.d, label: short(s.d), dow: dow(s.d), today: s.d === L.TODAY, value: s.value, flag: flagS && s.d === L.TODAY }))])),
      /* today's four parts, each against its own usual range (partsUsual). Empty when today has no FloraScore */
      partsToday: !sNow || sNow.value == null || !sNow.parts ? [] : L.SCORE_PARTS.map(([k, l, d]) => ({ key: k, label: l, desc: d, weight: L.SCORE_W[k], value: Math.round(sNow.parts[k]), usual: partsUsual ? partsUsual[k] : null })),
      how: "FloraScore blends the days among your last 3 that have a BM, or No BM, logged, and compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.",
      /* the no-score rule in the model's one wording (L.NO_SCORE), for a look to say when today has no FloraScore */
      why: `${cap(L.NO_SCORE)}.`,
      learning: null
    } : { value: null, usual: null, partsToday: [], learning: { day: L.learnDay(M), of: L.LEARN_DAYS, line: `Your FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual.` } };

    /* today, entry by entry, for a timeline of the day: BMs (read against the usual forms), No BM, meals and symptoms,
       each at the time it was logged, and the time it is now in the demo */
    const tx = L.day(M, L.TODAY);
    const todayLine = {
      now: L.NOW, nowText: T(L.NOW),
      events: (tx && tx.logged ? tx.entries : []).map((e) => e.kind === "bm" ? { kind: "bm", t: e.t, text: T(e.t), name: L.formName(e, mode), within: u ? L.inForms(M, e, mode) : null }
        : e.kind === "nobm" ? { kind: "nobm", t: e.t, text: T(e.t), name: "No BM" }
        : e.kind === "meal" ? { kind: "meal", t: e.t, text: T(e.t), name: L.mealLabel(e.meal), detail: e.text || "" }
        : e.kind === "sym" ? { kind: "sym", t: e.t, text: T(e.t), name: e.items.map((i) => i.name).join(", "), detail: e.items.map((i) => (i.s ? L.STRENGTH[i.s - 1] : "Strength not said")).join(", ") }
        : null).filter(Boolean).sort((a, b) => a.t - b.t)
    };

    /* the cards' numbers */
    const F7 = span(7), F30 = span(30), F90 = span(90);
    /* a stretch's days, counted the way Insights and Your days count them: the days within your usual out of the days
       read either way (within or shifted). A day that could be either, or one logged with nothing about BMs, is counted
       neither way, never as a shift: left says which, by name for a week and by count for a month */
    const tally = (F, named) => {
      const lg = F.filter((f) => f.logged), by = (s) => lg.filter((f) => f.state === s);
      const within = by("usual"), shifted = by("shifted"), unsure = by("unsure"), noc = by("nocount"), flag = by("flag");
      const nm = (f) => (f.today ? "today" : Ut.DOWL[L.dateOf(f.d).getDay()]);
      const who = (a) => cap(named ? andList(a.map(nm)) : plural(a.length, "day"));
      const notC = (a) => `so ${a.length === 1 ? "it isn't" : "they aren't"} counted`;
      const past = noc.filter((f) => !f.today), now = noc.some((f) => f.today);
      const left = [
        unsure.length && `${who(unsure)} could be either, ${notC(unsure)}.`,
        past.length && `${who(past)} had nothing about BMs, ${notC(past)}.`,
        now && "Today has nothing about BMs yet, so it isn't counted.",
        flag.length && RU.FLAG_DAY
      ].filter(Boolean).join(" ");
      return { logged: lg.length, within: within.length, shifted: shifted.length, unsure: unsure.length, nocount: noc.length, flag: flag.length, none: F.filter((f) => !f.logged && !f.pending).length, known: within.length + shifted.length, left };
    };
    const scale = scaleOf(mode);
    const formUsual = !u ? null : mode === "B" ? [u.wLo, u.wHi] : [u.fLo, u.fHi];
    /* every reading over the days read: a flagged today's BMs are noted for a clinician, in none of these counts */
    const allForms = F30.filter((f) => !f.flag).flatMap((f) => f.forms);
    /* one bin per step (A and C) or word (B). A B word read in A or C that covers two steps goes in spans instead, so
       the bins plus the spans always add up to total30 */
    const bins = scale.map((s) => ({ label: s.label, k: s.k, count: allForms.filter((x) => x.steps.length === 1 && x.steps[0] === s.k).length, inUsual: formUsual ? s.k >= formUsual[0] && s.k <= formUsual[1] : null }));
    const spanMap = {};
    allForms.filter((x) => x.steps.length > 1).forEach((x) => {
      const key = x.steps.join("-");
      (spanMap[key] = spanMap[key] || { steps: x.steps.slice(), label: x.name, count: 0, within: x.within }).count++;
    });
    const spans = Object.values(spanMap).sort((a, b) => a.steps[0] - b.steps[0]);
    /* outside the usual, by side: every step of the BM below the usual (firmer) or above it (looser) */
    const outside = formUsual ? allForms.filter((x) => x.within === false) : [];
    const firmer = formUsual ? outside.filter((x) => Math.max(...x.steps) < formUsual[0]).length : null;
    const looser = formUsual ? outside.filter((x) => Math.min(...x.steps) > formUsual[1]).length : null;
    const either = formUsual ? allForms.filter((x) => x.within === null).length : null;
    const symNames = {};
    F30.forEach((f) => f.sym.forEach((s) => (symNames[s.name] = (symNames[s.name] || 0) + 1)));
    const symRows = Object.entries(symNames).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, days: n, cells: F30.map((f) => (!f.logged ? null : (f.sym.find((s) => s.name === name) || { strength: false }).strength)) }));
    const symUsual = u && u.sym ? (u.sym.every == null ? "Rarely" : u.sym.every <= 1 ? "Most days" : `About 1 day in ${u.sym.every}`) : null;

    /* the weekly check-in. This week's, once saved, is the latest week, the way Insights reads it (refresh-insights.js
       ckOf); the starting point stays the first three weeks before it (L.baseline reads M.checkins only). saved and
       count let a look tell a first check-in saved, with nothing to compare it with yet, from none at all */
    const b = L.baseline(M);
    const cur = M.checkin.status === "done" && M.checkin.answers ? Object.assign({ w: 12, ws: 84 }, M.checkin) : null;
    const ckWeeks = cur ? M.checkins.concat([cur]) : M.checkins;
    const checkin = {
      due: M.checkin.status === "due",
      saved: !!cur,
      count: ckWeeks.filter((c) => c.answers).length, baseWeeks: L.BASE_WEEKS,
      /* the check-in's own tag words, so a look that asks about a day saves the same tags the check-in does */
      tags: L.CHECKIN_TAGS.slice(),
      questions: L.CHECKIN.map((q, i) => {
        /* label is a week's name as a title, when the same in a sentence ("this week", "the week of Sep 28") */
        const weeks = ckWeeks.map((c) => ({ w: c.w, label: c === cur ? "This week" : `Week of ${short(c.ws)}`, when: c === cur ? "this week" : `the week of ${short(c.ws)}`, v: c.answers ? c.answers[i] : null }));
        const latest = weeks.filter((w) => w.v != null).slice(-1)[0] || null;
        const cmp = b && latest ? L.compare(b, i, latest.v) : null;
        return { label: q.label, opts: q.opts, ticks: q.ticks, weeks, band: b ? { lo: b[i].lo, hi: b[i].hi } : null, latest, cmp };
      })
    };

    /* possible patterns */
    const PR = L.patterns(M, mode);
    /* meal logging over the pattern window, counted from the days the cards draw (PR.logged counts only pairs of logged
       days, so it can't be stated as "days you logged") */
    const lg90 = F90.filter((f) => f.logged), md90 = lg90.filter((f) => f.meals > 0);
    const meals = { days: md90.length, logged: lg90.length, withSymptom: md90.filter((f) => f.sym.length).length, window: F90.length };
    const mealsSaid = `Meals are logged on ${meals.days} of the ${meals.logged} days you logged in the last ${meals.window} days`;
    const checkLine = `A ${L.FOOD_CHECK_DAYS}-day food check would let Florin look.`;
    const foodName = (f) => (L.FOOD_NAMES[f] || [f])[0];
    const looseText = mode === "B" ? "Loose or Watery" : mode === "C" ? `${L.TYPES[L.LOOSE_AT].short} or looser` : `Type ${L.LOOSE_AT} or looser`;
    const patterns = {
      found: PR.found.map((p) => ({
        id: p.id, kind: p.kind, food: p.food ? foodName(p.food) : null,
        title: p.kind === "late" ? "Later dinners, later first BMs" : p.kind === "loose" ? `${foodName(p.food)}, then a looser first BM` : `${foodName(p.food)}, then bloating the next day`,
        line: p.kind === "late" ? `After ${p.hit} of ${p.n} dinners past 8 PM, your first BM came later than your usual window. After an earlier dinner, ${p.oh} of ${p.on}.` : p.kind === "loose" ? `The morning after ${lower1(foodName(p.food))}, your first BM was ${looseText} ${p.hit} of ${p.n} times. On other mornings, ${p.oh} of ${p.on}.` : `Bloating the day after ${lower1(foodName(p.food))} ${p.hit} of ${p.n} times, and on ${p.oh} of ${p.on} other days.`,
        hit: p.hit, n: p.n, oh: p.oh, on: p.on, tier: p.tier.label, tierK: p.tier.k, occ: p.occ.map((x) => x.hit), oth: p.oth.map((x) => x.hit)
      })),
      /* sparse is the model's gate; coverage and every count shown come from meals, so a share and a count always agree */
      sparse: PR.sparse, meals, coverage: meals.logged ? meals.days / meals.logged : 0, cover: L.MEAL_COVER, foodCheckDays: L.FOOD_CHECK_DAYS,
      note: "Patterns show what tends to happen together. They don't prove cause.",
      sparseLine: !PR.sparse ? null
        : !meals.days ? `No meals are logged in the last ${meals.window} days, so there is nothing to compare yet. ${checkLine}`
        : meals.withSymptom * 2 > meals.days ? `${mealsSaid}, ${meals.withSymptom === meals.days ? "all" : meals.withSymptom} of them days with a symptom, so there are few ordinary days to compare with. ${checkLine}`
        : `${mealsSaid}, too few for Florin to compare yet. ${checkLine}`
    };

    return {
      persona: { id: M.P.id, name: M.P.name }, mode, modeName: L.MODES[mode], data: o.M ? M.mode : o.data || "est", meals: M.meals,
      today: todayLine,
      todayLabel: (() => { const t = L.dateOf(L.TODAY); return `${Ut.DOWL[t.getDay()]}, ${Ut.MONL[t.getMonth()]} ${t.getDate()}`; })(),
      highlight: RU && RU.highlight ? RU.highlight(M) : "",
      learning: !u ? { day: L.learnDay(M), of: L.LEARN_DAYS } : null,
      score,
      days: { 7: F7, 30: F30, 90: F90 },
      tally: { 7: tally(F7, true), 30: tally(F30, false) },
      /* the sentence for today with a flag (RU.FLAG_DAY), or "" */
      flagLine: flagT && RU.FLAG_DAY ? RU.FLAG_DAY : "",
      /* flagToday: today has a log noted for a clinician, so the mornings and days counted against the usual leave it out
         (mornings30 and read30 count the days read) */
      flagToday: flagT,
      timing: { usual: u ? [u.tLo, u.tHi] : null, usualText: u ? `${T(u.tLo).replace(/ (AM|PM)$/, "")} to ${T(u.tHi)}` : null, inWin30: u ? F30.filter((f) => f.inWin).length : null, mornings30: F30.filter((f) => f.first != null && !f.flag).length },
      often: { usual: u ? [u.nLo, u.nHi] : null, usualText: u ? `${u.nLo} to ${u.nHi} a day` : null, avg30: (() => { const k = F30.filter((f) => f.count != null && !f.flag); return k.length ? +(k.reduce((s, f) => s + f.count, 0) / k.length).toFixed(1) : null; })(), inCount30: u ? F30.filter((f) => f.inCount).length : null, read30: F30.filter((f) => f.count != null && !f.flag).length },
      /* usualWeeks: the days the usual forms were learned from, so a look can show what share of BMs they held */
      form: { scale, usual: formUsual, usualText: u ? L.usualFormsText(M, mode) : null, bins, spans, firmer, looser, either, within30: allForms.filter((x) => x.within === true).length, total30: allForms.length, usualWeeks: u ? BASE.slice() : null },
      symptoms: { usualText: symUsual, rows: symRows, withSym30: F30.filter((f) => f.sym.length).length, logged30: F30.filter((f) => f.logged).length },
      checkin, patterns,
      disclaimer: "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition."
    };
  }

  window.FLD = { build, PERSONAS: [["sarah", "Sarah"], ["marcus", "Marcus"], ["alex", "Alex"]], MODES: L.MODES, MEAL_LOGS: L.MEAL_LOGS };
})();
