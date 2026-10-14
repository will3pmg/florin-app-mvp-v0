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

  /* the scale each option draws consistency on: A numbers 1 to 7, B five words, C seven words */
  const scaleOf = (mode) => (mode === "B" ? L.WORDS.map((w) => ({ k: w.k, label: w.word })) : L.TYPES.slice(1).map((t) => ({ k: t.k, label: mode === "A" ? String(t.k) : t.short })));

  function build(persona, o = {}) {
    const mode = o.mode || "C";
    const M = L.build(persona, o.data || "est", { meals: o.meals || "all" });
    const u = M.usual;
    const day = (f) => ({
      d: f.d, label: short(f.d), dow: dow(f.d), date: L.dateOf(f.d).getDate(), today: f.today,
      logged: f.logged && !f.pending, pending: f.pending, state: f.state, first: f.first, firstText: f.first != null ? T(f.first) : null,
      inWin: f.inWin, count: f.count, inCount: f.inCount,
      forms: f.bms.map((b) => ({ t: b.t, name: L.formName(b, mode), level: mode === "B" ? L.wordKey(b) : Ut.mean(L.stepsOf(b)), within: u ? L.inForms(M, b, mode) : null })),
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
    const score = u ? {
      value: sNow ? sNow.value : null,
      usual: sU,
      relation: !sNow || sNow.value == null || !sU ? null : sNow.value < sU[0] ? (sU[0] - sNow.value >= 6 ? "Below your usual range" : "A little below your usual range") : sNow.value > sU[1] ? "A little above your usual range" : "Within your usual range",
      delta: mv ? mv.delta : null,
      weekAvg: mv ? Math.round(mv.wk) : null, lastWeekAvg: mv ? Math.round(mv.lw) : null,
      parts: mv ? mv.parts.map((p) => ({ key: p.key, label: NAMES[p.key].label, desc: NAMES[p.key].desc, weight: p.weight, now: p.now, before: p.before, delta: +p.delta.toFixed(1) })) : [],
      series: Object.fromEntries([7, 30, 90].map((n) => [n, L.scoreSeries(M, n, mode).map((s) => ({ d: s.d, label: short(s.d), dow: dow(s.d), today: s.d === L.TODAY, value: s.value }))])),
      how: "FloraScore blends your last 3 days that have logs and compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.",
      learning: null
    } : { value: null, usual: null, learning: { day: L.learnDay(M), of: L.LEARN_DAYS, line: `Your FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual.` } };

    /* the cards' numbers */
    const F7 = span(7), F30 = span(30), F90 = span(90);
    const scale = scaleOf(mode);
    const formUsual = !u ? null : mode === "B" ? [u.wLo, u.wHi] : [u.fLo, u.fHi];
    const allForms = F30.flatMap((f) => f.forms);
    const bins = scale.map((s) => ({ label: s.label, k: s.k, count: allForms.filter((x) => (mode === "B" ? x.level === s.k : x.level === s.k)).length, inUsual: formUsual ? s.k >= formUsual[0] && s.k <= formUsual[1] : null }));
    const symNames = {};
    F30.forEach((f) => f.sym.forEach((s) => (symNames[s.name] = (symNames[s.name] || 0) + 1)));
    const symRows = Object.entries(symNames).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, days: n, cells: F30.map((f) => (!f.logged ? null : (f.sym.find((s) => s.name === name) || { strength: false }).strength)) }));
    const symUsual = u && u.sym ? (u.sym.every == null ? "Rarely" : u.sym.every <= 1 ? "Most days" : `About 1 day in ${u.sym.every}`) : null;

    /* the weekly check-in */
    const b = L.baseline(M);
    const ckWeeks = M.checkins;
    const checkin = {
      due: M.checkin.status === "due",
      questions: L.CHECKIN.map((q, i) => {
        const weeks = ckWeeks.map((c) => ({ w: c.w, label: c.w === 12 ? "This week" : `Week of ${short(c.ws)}`, v: c.answers ? c.answers[i] : null }));
        const latest = weeks.filter((w) => w.v != null).slice(-1)[0] || null;
        const cmp = b && latest ? L.compare(b, i, latest.v) : null;
        return { label: q.label, opts: q.opts, ticks: q.ticks, weeks, band: b ? { lo: b[i].lo, hi: b[i].hi } : null, latest, cmp };
      })
    };

    /* possible patterns */
    const PR = L.patterns(M, mode);
    const foodName = (f) => (L.FOOD_NAMES[f] || [f])[0];
    const looseText = mode === "B" ? "Loose or Watery" : mode === "C" ? `${L.TYPES[L.LOOSE_AT].short} or looser` : `Type ${L.LOOSE_AT} or looser`;
    const patterns = {
      found: PR.found.map((p) => ({
        id: p.id, kind: p.kind, food: p.food ? foodName(p.food) : null,
        title: p.kind === "late" ? "Later dinners, later first BMs" : p.kind === "loose" ? `${foodName(p.food)}, then a looser first BM` : `${foodName(p.food)}, then bloating the next day`,
        line: p.kind === "late" ? `After ${p.hit} of ${p.n} dinners past 8 PM, your first BM came later than your usual window. After an earlier dinner, ${p.oh} of ${p.on}.` : p.kind === "loose" ? `The morning after ${lower1(foodName(p.food))}, your first BM was ${looseText} ${p.hit} of ${p.n} times. On other mornings, ${p.oh} of ${p.on}.` : `Bloating the day after ${lower1(foodName(p.food))} ${p.hit} of ${p.n} times, and on ${p.oh} of ${p.on} other days.`,
        hit: p.hit, n: p.n, oh: p.oh, on: p.on, tier: p.tier.label, tierK: p.tier.k, occ: p.occ.map((x) => x.hit), oth: p.oth.map((x) => x.hit)
      })),
      sparse: PR.sparse, coverage: PR.coverage,
      note: "Patterns show what tends to happen together. They don't prove cause.",
      sparseLine: PR.sparse ? `Meals are logged on ${Math.round(PR.coverage * 100)}% of your days, mostly the rough ones, so there are no ordinary days to compare with. A ${L.FOOD_CHECK_DAYS}-day food check would let Florin look.` : null
    };

    return {
      persona: { id: M.P.id, name: M.P.name }, mode, modeName: L.MODES[mode], data: o.data || "est", meals: M.meals,
      todayLabel: (() => { const t = L.dateOf(L.TODAY); return `${Ut.DOWL[t.getDay()]}, ${Ut.MONL[t.getMonth()]} ${t.getDate()}`; })(),
      highlight: RU && RU.highlight ? RU.highlight(M) : "",
      learning: !u ? { day: L.learnDay(M), of: L.LEARN_DAYS } : null,
      score,
      days: { 7: F7, 30: F30, 90: F90 },
      timing: { usual: u ? [u.tLo, u.tHi] : null, usualText: u ? `${T(u.tLo).replace(/ (AM|PM)$/, "")} to ${T(u.tHi)}` : null, inWin30: u ? F30.filter((f) => f.inWin).length : null, mornings30: F30.filter((f) => f.first != null).length },
      often: { usual: u ? [u.nLo, u.nHi] : null, usualText: u ? `${u.nLo} to ${u.nHi} a day` : null, avg30: (() => { const k = F30.filter((f) => f.count != null); return k.length ? +(k.reduce((s, f) => s + f.count, 0) / k.length).toFixed(1) : null; })() },
      form: { scale, usual: formUsual, usualText: u ? L.usualFormsText(M, mode) : null, bins, within30: allForms.filter((x) => x.within === true).length, total30: allForms.length },
      symptoms: { usualText: symUsual, rows: symRows, withSym30: F30.filter((f) => f.sym.length).length, logged30: F30.filter((f) => f.logged).length },
      checkin, patterns,
      disclaimer: "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition."
    };
  }

  window.FLD = { build, PERSONAS: [["sarah", "Sarah"], ["marcus", "Marcus"], ["alex", "Alex"]], MODES: L.MODES, MEAL_LOGS: L.MEAL_LOGS };
})();
