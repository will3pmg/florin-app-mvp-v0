/* Florin app refresh: Profile and onboarding (V.onboard), from the Today avatar (data-act="profile").
   Will, Oct 27: "build out the profile and onboarding workflow". The shipping app's 14-question survey and profile are
   transcribed in reference/shipping-app/onboarding-and-profile.md, with what breaks Florin's rules; this module is the
   refresh of both.
   Registers into window.FLORIN_EXT (CLAUDE.md, Extension hooks) and never edits a core file:
   - overlays: "pf" (Profile, a full screen), "onb" (an onboarding step, a full screen, also one step reopened from
     Profile), and three sheets: "pf-rem" (the BM reminder), "pf-info" (connected apps, help, terms, sign out) and
     "pf-del" (delete my logs, or the account, asked first)
   - acts: "profile" (the Today avatar), the onboarding steps (onb-*), the Profile rows (pf-*), and "ckd-save" chained
     so the check-in day sheet, opened from Profile, redraws Profile when it saves
   - opens, screens, notes, decisions.onboard, built.onboard, onSet, and one RU wrapper (RU.today), which puts the
     first name from onboarding on Today and always draws the screen it wraps
   Every answer is kept in the phone's state (api.S.pf), per demo person, and shown in Profile. Every usual figure in
   Profile is read from the model (M.usual, L.scoreUsual), the same way Insights reads it. */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, EXT = window.FLORIN_EXT;
  if (!FL || !L || !RU || !AD || !EXT) return;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, ic = RU.icon;
  const NAME = "Florin profile module";
  const warn = (e) => console.warn(`${NAME}:`, e);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const chip = (text, tone = "plain") => `<span class="ap-chip ap-chip--${tone}">${esc(text)}</span>`;
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  const shortDate = (d) => { const x = L.dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const longDate = (d) => { const x = L.dateOf(d); return `${Ut.MONL[x.getMonth()]} ${x.getDate()}`; };
  /* the weeks every usual comes from: the same days L.build sets the usual from, and Insights names (days 28 to 83) */
  const USUAL_FROM = 28, USUAL_TO = 83;
  const usualSpan = () => `${shortDate(USUAL_FROM)} to ${shortDate(USUAL_TO)}`;
  /* how many days with a FloraScore the score range needs. L.scoreUsual has no constant for it, so it's asked of
     L.scoreUsual itself, once, at load: a stand-in model whose days from USUAL_FROM on each have a score, one more day
     each try, with L.score put back straight after (nothing else runs in between) */
  const RANGE_N = (() => {
    const real = L.score;
    try {
      for (let n = 1; n <= USUAL_TO - USUAL_FROM + 1; n++) {
        L.score = (M, d) => ({ d, value: d - USUAL_FROM < n ? 50 : null });
        if (L.scoreUsual({ usual: {}, start: 0 }, "C")) return n;
      }
      return null;
    } catch (e) { warn(e); return null; } finally { L.score = real; }
  })();
  const rangeWhen = () => (RANGE_N ? `once there are ${plural(RANGE_N, "day")} with a FloraScore` : "once there are enough days with a FloraScore");

  /* ====================================================================== */
  /* THE QUESTIONS                                                           */
  /* ====================================================================== */
  /* our own words throughout. Nothing names a licensed scale, nothing promises an outcome, and nothing reads a person
     against a norm. What brings you is self-description only; goals are what Florin does */
  const O = {
    brings: [["ibsd", "I have IBS-D"], ["ibs", "I've been told I might have IBS"], ["foods", "Some foods don't sit well with me"], ["unsettled", "My gut feels unsettled a lot"], ["active", "I'm active, and my gut gets in the way"], ["curious", "I'm curious about my gut"], ["record", "I want a record to show a clinician"]],
    goals: [["usual", "Know my own usual"], ["before", "See what tends to come before a rougher day"], ["food14", `Find foods worth a ${L.FOOD_CHECK_DAYS}-day check`], ["clin", "Bring my logs to a clinician"], ["record", "Keep a simple record"], ["shift", "Show me when a week shifts from my usual"]],
    periods: [["yes", "Yes"], ["no", "No"], ["prefer", "Prefer not to say"]],
    age: [["u25", "Under 25"], ["25", "25 to 34"], ["35", "35 to 44"], ["45", "45 to 54"], ["55", "55 to 64"], ["65", "65 or over"], ["prefer", "Prefer not to say"]],
    sex: [["female", "Female"], ["male", "Male"], ["another", "Another way"], ["prefer", "Prefer not to say"]],
    sym: [["bloating", "Bloating"], ["pain", "Belly pain"], ["cramp", "Cramping"], ["gas", "Gas"], ["nausea", "Nausea"], ["urge", "Sudden urge to go"], ["loose", "Loose or watery BMs"], ["hard", "Hard BMs or straining"], ["unfinished", "Not feeling finished"], ["heartburn", "Heartburn"], ["energy", "Low energy"], ["sleep", "Poor sleep"], ["mucus", "Mucus"], ["blood", "Blood in my stool"], ["black", "Black or tar-like stools"], ["night", "Waking at night to go"], ["none", "None of these"]],
    eat: [["mix", "A bit of everything"], ["med", "Mediterranean"], ["plant", "Plant-based or vegetarian"], ["lowcarb", "Low-carb"], ["fodmap", "Low-FODMAP"], ["plan", "Another eating plan"], ["none", "No set pattern"]],
    stress: [["calm", "Low stress, and I sleep well"], ["stress", "High stress, but I sleep well"], ["sleep", "Low stress, but short on sleep"], ["both", "Both are hard right now"], ["varies", "It varies a lot"]],
    foods: [["dairy", "Dairy"], ["gluten", "Gluten"], ["spicy", "Spicy food"], ["fried", "Fatty or fried food"], ["coffee", "Coffee"], ["alcohol", "Alcohol"], ["onion", "Onion or garlic"], ["beans", "Beans or lentils"], ["other", "Something else"], ["none", "None I know of"]],
    meds: [["probiotics", "Probiotics"], ["fiber", "Fiber or prebiotics"], ["enzymes", "Digestive enzymes"], ["antacids", "Antacids or acid reducers"], ["antibiotics", "Antibiotics in the last 3 months"], ["rx", "A prescription for my gut"], ["none", "None"]],
    cond: [["ibs", "IBS"], ["celiac", "Celiac disease"], ["lactose", "Lactose intolerance"], ["allergy", "A food allergy"], ["other", "Something else"], ["none", "None"], ["prefer", "Prefer not to say"]],
    rchoice: [["yes", "Yes, share my anonymized logs"], ["no", "No thanks"], ["later", "Decide later"]],
    rem: [[8, "In the morning"], [12.5, "At midday"], [20, "In the evening"], ["off", "No reminder"]].map(([v, l]) => [v, v === "off" ? l : `${l}, ${T(v)}`])
  };
  /* an answer that stands alone: picking it clears the rest of the list, and picking anything else clears it */
  const ALONE = { sym: ["none"], foods: ["none"], meds: ["none"], cond: ["none", "prefer"] };
  const labelOf = (k, v) => { const o = (O[k] || []).find(([x]) => x === v); return o ? o[1] : String(v); };

  /* one step per screen. kind: info (welcome, what Florin is), ready, text, one, many, form (consistency), about (age,
     sex and periods together), rem (the reminder, and the check-in day when it's on). fields: what it writes */
  const STEPS = {
    welcome: { kind: "info" },
    name: { kind: "text", fields: ["name"], kick: "About you", q: "What should Florin call you?", sub: "Your first name, for the greeting on Today." },
    about: { kind: "about", fields: ["age", "sex", "periods"], kick: "About you", q: "A little about you", sub: "All optional. They go on a clinician report if you make one, and nowhere else." },
    brings: { kind: "many", fields: ["brings"], kick: "What brings you", q: "What brings you to Florin?", sub: "Pick any that fit. These are your words: Florin doesn't decide anything from them." },
    goals: { kind: "many", fields: ["goals"], max: 3, kick: "What Florin does", q: "What would you like Florin to do?", sub: "Pick up to 3. You can change them any time in Profile.", subEdit: "Pick up to 3." },
    periods: { kind: "one", fields: ["periods"], kick: "Cycle", q: "Do you have periods?", sub: "Optional. If you do, Florin can show cycle days next to your logs later, as context." },
    rem: { kind: "rem", fields: ["rem"], kick: "Reminders", q: "When should Florin remind you?", sub: "One reminder a day to log a BM. You can change it any time in Profile." },
    usual: { kind: "form", fields: ["usual"], kick: "Your usual, to start", q: "Most often, lately?", sub: `Your BMs over the last few weeks. Pick the closest one, or It varies. It's a first guess only: from day ${L.LEARN_DAYS}, your own logs take over.` },
    sym: { kind: "many", fields: ["sym"], kick: "Lately", q: "Anything you're noticing lately?", sub: "Pick any. Your logs will say more from today." },
    eat: { kind: "one", fields: ["eat"], kick: "Eating", q: "How do you usually eat?", sub: "So Florin can make sense of what you log. It's never a judgment of how you eat." },
    stress: { kind: "one", fields: ["stress"], kick: "Stress and sleep", q: "How have stress and sleep been lately?", sub: "Context for your logs. A note on any day can say more." },
    foods: { kind: "many", fields: ["foods"], kick: "Foods to watch", q: "Any foods you already watch?", sub: `They go in Profile as foods to watch. Florin still waits for ${L.PATTERN_BAR.n} logs of a food before it looks at what tends to follow it.`, subEdit: `Florin still waits for ${L.PATTERN_BAR.n} logs of a food before it looks at what tends to follow it.` },
    meds: { kind: "many", fields: ["meds", "medsText"], kick: "Medicines and supplements", q: "Taking anything for your gut?", sub: "For your clinician report, as you write it. Florin never reads anything into it." },
    cond: { kind: "many", fields: ["cond"], kick: "Conditions", q: "Any gut conditions you live with?", sub: "Self-reported, for your clinician report. Florin never uses it to label you." },
    research: { kind: "one", fields: ["rchoice", "research"], kick: "Research", q: "Share your logs for gut research?", sub: "Anonymized first: your name and email never go with them. Off unless you say yes, and you can turn it off any time in Profile." },
    isnt: { kind: "info" },
    ready: { kind: "ready" }
  };
  /* short: only what changes the app on day 1. Full: the shipping survey's sections, refreshed */
  const FLOWS = {
    short: ["welcome", "name", "brings", "goals", "periods", "rem", "isnt", "ready"],
    full: ["welcome", "name", "about", "brings", "goals", "usual", "sym", "eat", "stress", "foods", "meds", "cond", "research", "ready"]
  };
  /* the rows About you shows, by onboarding: [field, label, the step that edits it] */
  const ROWS = {
    short: [["name", "First name", "name"], ["brings", "What brings you", "brings"], ["goals", "What you'd like Florin to do", "goals"], ["periods", "Periods", "periods"]],
    full: [["name", "First name", "name"], ["age", "Age range", "about"], ["sex", "Sex", "about"], ["periods", "Periods", "about"], ["brings", "What brings you", "brings"], ["goals", "What you'd like Florin to do", "goals"], ["usual", "Most often, lately", "usual"], ["sym", "Noticing lately", "sym"], ["eat", "Eating", "eat"], ["stress", "Stress and sleep", "stress"], ["foods", "Foods to watch", "foods"], ["meds", "Medicines and supplements", "meds"], ["cond", "Conditions", "cond"]]
  };
  const flowOf = (v) => (v === "full" ? "full" : "short");

  /* ====================================================================== */
  /* THE ANSWERS, in the phone's state                                       */
  /* ====================================================================== */
  /* what each demo person said when they set up (the short flow's answers, and the full survey's, both kept). A new
     onboarding replaces them with what's said on it */
  const SEED = {
    sarah: { name: "Sarah", age: "35", sex: "female", periods: "yes", brings: ["ibsd", "foods"], goals: ["usual", "before", "food14"], usual: { form: 5, word: null }, sym: ["bloating", "urge", "loose"], eat: "mix", stress: "sleep", foods: ["dairy"], meds: ["probiotics"], cond: ["ibs"], research: false, rem: 8 },
    marcus: { name: "Marcus", age: "45", sex: "male", periods: "no", brings: ["ibsd", "active"], goals: ["usual", "clin", "record"], usual: { form: 6, word: null }, sym: ["urge", "loose", "cramp"], eat: "mix", stress: "stress", foods: ["spicy", "alcohol"], meds: ["none"], cond: ["ibs"], research: false, rem: 7 },
    alex: { name: "Alex", age: "25", sex: "prefer", periods: "prefer", brings: ["curious", "foods"], goals: ["before", "food14", "shift"], usual: { varies: true }, sym: ["gas", "bloating"], eat: "plant", stress: "varies", foods: ["coffee"], meds: ["fiber"], cond: ["prefer"], research: false, rem: "off" }
  };
  const FIELDS = ["name", "age", "sex", "periods", "brings", "goals", "usual", "sym", "eat", "stress", "foods", "meds", "medsText", "cond", "rchoice", "research", "rem"];
  const blank = () => { const a = { skip: {} }; FIELDS.forEach((f) => (a[f] = null)); a.medsText = ""; a.research = false; return a; };
  const copy = (a) => JSON.parse(JSON.stringify(a));
  const state = (api) => api.S.pf || (api.S.pf = { ans: {} });
  const answers = (api, pid) => {
    const P = state(api), id = pid || api.S.persona;
    if (!P.ans[id]) P.ans[id] = Object.assign(blank(), copy(SEED[id] || { name: (AD.personas[id] || {}).name || "" }));
    return P.ans[id];
  };
  const baseOf = (M) => AD.personas[M.P.id] || M.P;
  /* the first name and periods answer reach the model: Today's greeting and the avatar use the name, and periods feed
     the cycle context (the Period tag on the check-in). The persona object is shared between models, so this model gets
     its own copy of it. Idempotent; true when it changed something */
  function ensurePerson(M, api) {
    if (!M || !M.P || !api || !api.S) return false;
    const a = answers(api, M.P.id), base = baseOf(M);
    const name = (a.name || "").trim() || base.name; /* the account's name, when the answer is skipped or cleared */
    const want = { name, initial: name.charAt(0).toUpperCase(), cycle: a.periods === "yes" ? true : a.periods === "no" ? false : !!base.cycle };
    if (M.P.name === want.name && M.P.initial === want.initial && !!M.P.cycle === want.cycle) return false;
    M.P = Object.assign({}, M.P, want);
    return true;
  }

  /* how an answer reads in Profile */
  /* the alarm features on the symptoms step, named as Log a BM's note names them */
  const SIGN = { blood: "Blood in your stool", black: "A black or tar-like stool", night: "Waking at night to go" };
  const ALARM_SYM = Object.keys(SIGN);
  const signsOf = (sym) => ALARM_SYM.filter((k) => (sym || []).includes(k));
  const signLine = (keys) => L.signText(keys.map((k) => SIGN[k]));
  /* the BM reminder: a time, Off when the person said no reminder, Skipped when they skipped the step, Not set when no
     step asked (the full survey has none) */
  const remText = (a) => (a.rem === "off" ? "Off" : a.rem != null ? `Every day at ${T(a.rem)}` : a.skip && a.skip.rem ? "Skipped" : "Not set");
  /* the first name comes from the account: what onboarding asks only changes what Florin calls the person, and a
     skipped or cleared answer leaves the name they signed up with */
  const accountName = (M) => baseOf(M).name;
  const valueOf = (f, a, V, M) => {
    const v = a[f];
    if (f === "name") return (v || "").trim() || `${accountName(M)}, from sign-up`;
    if (f === "usual") return !v ? null : v.varies ? "It varies" : L.formName({ form: v.form != null ? v.form : null, word: v.word != null ? v.word : null }, V.form);
    if (f === "meds") { const xs = (v || []).map((k) => labelOf("meds", k)).concat((a.medsText || "").trim() ? [a.medsText.trim()] : []); return xs.length ? xs.join(" · ") : null; }
    if (v == null || (Array.isArray(v) && !v.length) || v === "") return null;
    return Array.isArray(v) ? v.map((k) => labelOf(f, k)).join(" · ") : labelOf(f, v);
  };

  /* ====================================================================== */
  /* SMALL PARTS                                                             */
  /* ====================================================================== */
  /* chips, the app's own (as in the log forms): one choice is a radio group, several a set of toggles */
  const chips = (act, items, isOn, o = {}) => `<div class="ap-chs${o.wrap ? " ap-chs--wrap" : ""}${o.week ? " ap-chs--week" : ""}" role="${o.single ? "radiogroup" : "group"}"${o.label ? ` aria-label="${esc(o.label)}"` : ""}${o.labelledby ? ` aria-labelledby="${o.labelledby}"` : ""}>${items.map(([v, l]) => { const on = isOn(v); return `<button type="button" class="ap-ch${on ? " is-on" : ""}" data-act="${act}" data-v="${esc(String(v))}" ${o.single ? `role="radio" aria-checked="${on}"` : `aria-pressed="${on}"`}>${on && !o.noCheck ? ic("check") : ""}${esc(l)}</button>`; }).join("")}</div>`;
  /* one choice as the check-in's big rows */
  const rows1 = (field, items, cur, label) => `<div class="ap-ck-opts" role="radiogroup" aria-label="${esc(label)}">${items.map(([v, l]) => { const on = cur === v; return `<button type="button" class="ap-ck-opt${on ? " is-on" : ""}" data-act="onb-pick" data-v="${esc(`${field}:${v}`)}" role="radio" aria-checked="${on}"><span>${esc(l)}</span>${on ? ic("check") : ""}</button>`; }).join("")}</div>`;
  const row = (act, v, b, em, o = {}) => `<li><button type="button" class="ap-ea-row${o.cls ? " " + o.cls : ""}" data-act="${act}"${v != null ? ` data-v="${esc(v)}"` : ""}${o.attrs || ""}><span class="ap-ea-m"><b>${esc(b)}</b>${em ? `<em>${esc(em)}</em>` : ""}</span>${o.right || ""}${o.noChev ? "" : ic(o.icon || "chev", "ap-tl-go")}</button></li>`;
  const sw = (act, on, b, em, v) => `<li><button type="button" class="ap-ea-row pf-sw" role="switch" aria-checked="${on}" data-act="${act}"${v ? ` data-v="${esc(v)}"` : ""}><span class="ap-ea-m"><b>${esc(b)}</b>${em ? `<em>${esc(em)}</em>` : ""}</span><span class="pf-sw-t" aria-hidden="true"></span></button></li>`;
  const sec = (id, title, body, right) => `<section class="pf-sec" aria-labelledby="${id}"><div class="ap-card-h ap-card-h--pad"><h3 id="${id}">${esc(title)}</h3>${right || ""}</div>${body}</section>`;

  /* ====================================================================== */
  /* PROFILE                                                                 */
  /* ====================================================================== */
  const reportMsg = (V) => `A report of your logs to bring to a clinician: dates, BMs, symptoms${RU.ckOn(V) ? ", meals and check-ins" : " and meals"}. That comes in the next pass.`;
  /* what's logged, by kind: the entries on logged days (BMs, symptom logs, meal logs, No BM days), and the weekly
     check-ins answered, which aren't entries: the past weeks', and this week's once it's finished (as Insights and Ask
     count them) */
  const tally = (M) => {
    const c = { bm: 0, sym: 0, meal: 0, nobm: 0, other: 0 };
    M.days.forEach((x) => { if (x.logged) x.entries.forEach((e) => { c[e.kind in c ? e.kind : "other"]++; }); });
    c.total = c.bm + c.sym + c.meal + c.nobm + c.other;
    c.ck = (M.checkins || []).filter((k) => k && k.answers && !k.skipped).length + (M.checkin && M.checkin.status === "done" && M.checkin.answers ? 1 : 0);
    return c;
  };
  const logCount = (M) => tally(M).total;
  const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  /* "375 entries and 11 check-ins", or the part of it there is */
  const countText = (c, ck) => andList([c.total ? plural(c.total, "entry", "entries") : "", ck && c.ck ? plural(c.ck, "check-in") : ""].filter(Boolean));
  const kindsText = (c) => andList([[c.bm, "BM"], [c.sym, "symptom log"], [c.meal, "meal log"], [c.nobm, "No BM day"], [c.other, "other entry", "other entries"]].filter(([n]) => n).map(([n, one, many]) => plural(n, one, many)));
  const firstLog = (M) => M.days.find((x) => x.logged && x.entries.length);
  /* where a count starts: the first log, or the first day when nothing is logged; on day 1 that's today */
  const sinceOf = (M) => { const fl = firstLog(M), d = fl ? fl.d : M.start; return d >= L.TODAY ? "from today" : `since ${shortDate(d)}`; };
  /* Profile on day 1, from the Screens list: a preview drawn against this person's day-1 model (what onboarding leaves
     them with), as the check-in's preview screens are. The phone's own logs are never touched by a list row */
  const previewOf = (api, st) => {
    if (!st || !st.preview) return null;
    const M = api.M();
    if (!st.M || st.M.P.id !== M.P.id) st.M = L.build(M.P.id, "fresh", { meals: M.meals });
    st.M.ckDay = M.ckDay;
    return st.M;
  };
  /* the model a Profile sheet reads: the preview's when the Profile under it is one */
  const pfModel = (api) => { const o = api.S.ovl.find((x) => x.type === "pf"); return (o && previewOf(api, o.st)) || api.M(); };
  function profileHTML(M0, V, st, api) {
    const M = previewOf(api, st) || M0;
    ensurePerson(M, api);
    const a = answers(api, M.P.id), id = `pf${V.uid}`, mode = V.form, ck = RU.ckOn(V), free = V.plan === "free";
    const u = M.usual, d = L.learnDay(M), fl = firstLog(M);
    const theme = api.root.dataset.theme === "dark" ? "dark" : "light";
    /* you */
    const since = !u ? `Day ${d} of ${L.LEARN_DAYS}` : fl ? `Logging since ${longDate(fl.d)}` : "Nothing logged yet";
    const you = `<section class="ap-card pf-you" aria-label="You">
        <span class="pf-av" aria-hidden="true">${esc(M.P.initial)}</span>
        <span class="pf-you-m"><b class="pf-you-n" data-pf="name">${esc(M.P.name)}</b><em data-pf="since">${esc(since)}</em></span>
      </section>`;
    /* your usual, from the model; while learning, what day 14 brings */
    let usual;
    if (u) {
      const su = L.scoreUsual(M, mode), from = `Set from your logs, ${usualSpan()}`;
      const items = [
        ["timing", "First BM, your usual window", `${T(u.tLo)} to ${T(u.tHi)}`],
        ["often", "How often", u.nLo === u.nHi ? `${plural(u.nLo, "BM")} a day` : `${u.nLo} to ${u.nHi} BMs a day`],
        ["forms", "Your usual forms", L.usualFormsText(M, mode)],
        ["score", "Your FloraScore range", su ? `${su[0]} to ${su[1]}` : "Not enough scored days yet"]
      ];
      usual = sec(`${id}-us`, "Your usual", `<ul class="ap-card pf-us">${items.map(([k, l, v]) => `<li class="pf-row" data-pf-usual="${k}"><span class="ap-ea-m"><span class="ap-k">${esc(l)}</span><b class="pf-us-v">${esc(v)}</b><em>${esc(from)}</em></span></li>`).join("")}</ul>`, `<span class="ap-k">Updates as you log</span>`);
    } else {
      /* the first three come on day 14; the score range needs days with a FloraScore first, and there's none before
         day 14, so it comes after (L.scoreUsual) */
      const left = L.LEARN_DAYS - d;
      const soon = [["timing", "First BM, your usual window", "When your first BM tends to come", `Day ${L.LEARN_DAYS}`], ["often", "How often", "How many BMs a day is usual for you", `Day ${L.LEARN_DAYS}`], ["forms", "Your usual forms", "The forms you log most", `Day ${L.LEARN_DAYS}`], ["score", "Your FloraScore range", `Where your FloraScore usually sits, ${rangeWhen()}`, `After day ${L.LEARN_DAYS}`]];
      usual = sec(`${id}-us`, "Your usual", `<div class="ap-card pf-learn">
          <span class="ap-k">Learning your usual · day ${d} of ${L.LEARN_DAYS}</span>
          <div class="ap-learn-bar" role="img" aria-label="${esc(`Day ${d} of ${L.LEARN_DAYS}`)}"><i style="--w:${((d / L.LEARN_DAYS) * 100).toFixed(1)}%"></i></div>
          <p class="ap-gd-lede">${esc(`${left > 0 ? `In ${plural(left, "more day")}` : `From day ${L.LEARN_DAYS}`}, Florin sets the first three from your logs. Your FloraScore range follows, ${rangeWhen()}.`)}</p>
          <ul class="pf-us pf-us--soon">${soon.map(([k, l, e, c]) => `<li class="pf-row" data-pf-soon="${k}"><span class="ap-ea-m"><b>${esc(l)}</b><em>${esc(e)}</em></span>${chip(c)}</li>`).join("")}</ul>
        </div>`);
    }
    /* about you: each answer reopens its step */
    const flow = flowOf(V.onboard);
    const signs = flow === "full" ? signsOf(a.sym) : [];
    const about = sec(`${id}-ab`, "About you", `<ol class="ap-card ap-ea">${ROWS[flow].map(([f, l]) => {
        const v = valueOf(f, a, V, M);
        return row("pf-edit", f, l, v || (a.skip && a.skip[f] ? "Skipped" : "Not answered"), { right: f === "sym" && signs.length ? chip("Primary care first", "info") : "" });
      }).join("")}</ol>${flow === "short" ? `<p class="ap-f-h pf-note">The rest is asked later, where it's used: what you eat when you log a meal, foods to watch with a food check, medicines with a clinician report.</p>` : ""}`, `<span class="ap-k">From onboarding</span>`);
    /* reminders: the check-in day only when the check-in is on, through the check-in's own day sheet */
    const rem = sec(`${id}-rm`, "Reminders", `<ol class="ap-card ap-ea">${row("pf-rem", null, "BM reminder", remText(a))}${ck ? row("ck-day", null, "Weekly check-in", RU.ckDayText(M)) : ""}</ol>`);
    /* logging: the consistency words of the option on the phone, How to pick, the meal sheet and the BM extras */
    const words = mode === "B" ? L.WORDS.map((w) => [w.glyph, w.word]) : L.TYPES.slice(1).map((t) => [L.glyphOf(t.k, mode), mode === "A" ? `${t.k} · ${t.short}` : t.short]);
    const wordsLine = mode === "B" ? "Five words, from hardest to loosest." : mode === "A" ? "Seven types, numbered 1 to 7, from hardest to loosest." : "Seven words, from hardest to loosest.";
    const logging = sec(`${id}-lg`, "Logging", `<div class="ap-card pf-log">
        <div class="ap-f"><div class="ap-f-lr"><span class="ap-f-l" id="${id}-wl">Consistency words</span><button type="button" class="ap-gd-b" data-act="guide">${ic("info")}How to pick</button></div>
          <ol class="pf-words" aria-labelledby="${id}-wl" style="--r:${Math.ceil(words.length / 2)}">${words.map(([g, w]) => `<li><span class="pf-wd-ic">${RU.glyph(g)}</span><span>${esc(w)}</span></li>`).join("")}</ol>
          <p class="ap-f-h">${esc(wordsLine)} Pick the closest one; it doesn't need to be exact.</p></div>
        <div class="ap-f"><span class="ap-f-l" id="${id}-bl">Logging a BM</span>${chips("pf-set", [["bmUI:quick", "Quick tiles"], ["bmUI:full", "Full form"]], (v) => v === `bmUI:${V.bmUI}`, { single: true, labelledby: `${id}-bl` })}
          <p class="ap-f-h">${esc(V.bmUI === "full" ? "Every BM goes through the form, with its time and details." : `Plus shows the tiles. After ${plural(RU.QUICK_AFTER, "BM")}, a tile saves at once.`)} Details on Log a BM are all optional: how it went, how long, and a flag for blood, mucus or a black stool.</p></div>
        <div class="ap-f"><span class="ap-f-l" id="${id}-ml">Meal sheet</span>${chips("pf-set", [["mealUI:quick", "Quick"], ["mealUI:detailed", "One meal at a time"]], (v) => v === `mealUI:${V.mealUI}`, { single: true, labelledby: `${id}-ml` })}
          <p class="ap-f-h">${esc(V.mealUI === "detailed" ? "Breakfast, lunch, dinner or other, each with its time." : "One box for the day, said or typed.")}</p></div>
      </div>`);
    /* display */
    const display = sec(`${id}-ds`, "Display", `<ol class="ap-card ap-ea">${sw("pf-easy", !!V.easy, "Larger text and simpler screens", "Bigger type and buttons, fewer cards. Your logs stay the same.")}</ol>
      <div class="ap-card pf-log"><div class="ap-f"><span class="ap-f-l" id="${id}-th">Theme</span>${chips("pf-set", [["theme:light", "Light"], ["theme:dark", "Dark"]], (v) => v === `theme:${theme}`, { single: true, labelledby: `${id}-th` })}</div></div>`);
    /* connected apps: none connected; which ones is a decision for this version */
    const apps = sec(`${id}-ap`, "Connected apps", `<ol class="ap-card ap-ea">${APPS.map(([k, n]) => row("pf-app", k, n, "Not connected")).join("")}</ol>`);
    /* membership */
    const member = sec(`${id}-mb`, "Membership", free
      ? `<ol class="ap-card ap-ea"><li><button type="button" class="ap-ea-row" data-act="pay" data-pay=""><span class="ap-ea-m"><b>Free plan</b><em>${esc(ck ? "Logging, Today, FloraScore, the weekly check-in and 7 days of Insights. See what membership adds." : "Logging, Today, FloraScore and 7 days of Insights. See what membership adds.")}</em></span>${ic("chev", "ap-tl-go")}</button></li></ol>`
      : `<ul class="ap-card ap-ea"><li class="pf-row"><span class="ap-ea-m"><b>Florin membership</b><em>Why your FloraScore moved, 30 and 90 days, patterns, Ask Florin and the clinician report.</em></span>${chip("Active")}</li></ul>`);
    /* your data */
    const c = tally(M);
    const data = sec(`${id}-dt`, "Your data", `<ol class="ap-card ap-ea">
        ${free ? `<li><button type="button" class="ap-ea-row" data-act="pay" data-pay="report"><span class="ap-ea-m"><b>Make a report for your clinician</b><em>With Florin membership</em></span>${ic("lock", "ap-tl-go")}</button></li>` : `<li><button type="button" class="ap-ea-row" data-act="toast" data-msg="${esc(reportMsg(V))}"><span class="ap-ea-m"><b>Make a report for your clinician</b><em>Your logs, so you don't have to remember dates</em></span>${ic("chev", "ap-tl-go")}</button></li>`}
        ${row("pf-export", null, "Export your logs", countText(c, ck) ? `${countText(c, ck)} ${sinceOf(M)}` : "Nothing logged yet")}
        ${sw("pf-research", !!a.research, "Share anonymized logs for research", a.research ? "On. Turn it off any time; sharing stops from then." : "Off. Your name and email never go with them.")}
        ${row("pf-del", null, "Delete my logs", "Asks first. Your answers here stay.")}
        ${row("pf-delacct", null, "Delete my account", "Asks first. Your logs and answers go with it.")}
      </ol>`);
    /* help */
    const help = sec(`${id}-hp`, "Help", `<ol class="ap-card ap-ea">${INFO_ROWS.map(([k, n, em]) => row("pf-info", k, n, em || "")).join("")}</ol>`);
    return `<div class="ap-ck pf" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      <div class="ap-ck-h"><button type="button" class="ap-lg-x" data-act="close" aria-label="Back to Today">${ic("back")}</button><div class="ap-fsh-t"><h2 id="${id}-h" tabindex="-1" data-autofocus>Profile</h2></div><span class="ap-fsh-sp"></span></div>
      <div class="ap-ck-b pf-b" data-scroll>
        ${you}${usual}${about}${rem}${logging}${display}${apps}${member}${data}${help}
        <p class="ap-fine">${esc(DISC)}</p>
      </div>
    </div>`;
  }
  const APPS = [["apple", "Apple Health"], ["oura", "Oura"], ["cycle", "A cycle app"]];
  /* the account's email isn't made up here: its row says what it holds, and the sheet what it does in the app */
  const INFO_ROWS = [["account", "Email and sign-in", "The email you signed up with"], ["help", "Help and feedback"], ["terms", "Terms of use"], ["privacy", "Privacy"], ["about", "About Florin"], ["signout", "Sign out"]];

  /* the sheets over Profile */
  const sheetHead = (id, title) => `<div class="ap-sheet-grab" aria-hidden="true"></div><div class="ap-psh-h"><h2 id="${id}">${esc(title)}</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>`;
  const APP_TEXT = {
    apple: "Apple Health could bring sleep and activity in as context next to your logs.",
    oura: "Oura could bring sleep and readiness in as context next to your logs.",
    cycle: "A cycle app could bring cycle days in as context next to your logs, if you have periods."
  };
  const INFO = {
    account: ["Email and sign-in", "In the app, this shows the email you signed up with, and lets you change it or your password."],
    help: ["Help and feedback", "Answers about logging, Florin membership and your account, and a way to write to the Florin team. In the app this opens the help pages."],
    terms: ["Terms of use", "The terms for using the Florin app open here in the app."],
    privacy: ["Privacy", "How Florin handles your logs: what's kept, who can see it, and how to export or delete it."],
    about: ["About Florin", "Florin Health shows patterns in your own logs, each day next to your own usual. The Florin app is a wellness app, not a medical device."],
    signout: ["Sign out of Florin?", "Your logs stay with your account, and come back when you sign in again."]
  };
  /* the research line follows the person's own choice */
  const researchLine = (on) => (on ? "You chose to share anonymized logs for research. Turn it off any time in Profile, under Your data; sharing stops from then." : "Research sharing stays off unless you turn it on.");
  function infoHTML(M, V, st, api) {
    const id = `pfi${V.uid}`;
    if (st.app) {
      const n = (APPS.find(([k]) => k === st.app) || [, "This app"])[1];
      return `<div class="ap-psh pf-sh" role="dialog" aria-modal="true" aria-labelledby="${id}">${sheetHead(id, n)}
        <p class="ap-gd-lede">Not connected. Which apps Florin connects to is a decision for this version of the Florin app, so nothing connects here yet.</p>
        <p class="ap-gd-lede">${esc(APP_TEXT[st.app] || "")} Nothing would be shared until you connect it and pick what it can read.</p>
        <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">OK</button></div></div>`;
    }
    const [t, body0] = INFO[st.k] || INFO.help;
    const body = st.k === "privacy" ? `${body0} ${researchLine(!!answers(api, M.P.id).research)}` : body0;
    const act = st.k === "signout"
      ? `<button type="button" class="ap-btn ap-btn--2 ap-btn--block" data-act="pf-signout">Sign out</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">Cancel</button>`
      : `<button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">OK</button>`;
    return `<div class="ap-psh pf-sh" role="dialog" aria-modal="true" aria-labelledby="${id}">${sheetHead(id, t)}
      <p class="ap-gd-lede">${esc(body)}</p>${st.k === "about" ? `<p class="ap-fine">${esc(DISC)}</p>` : ""}
      <div class="ap-fl-act">${act}</div></div>`;
  }
  function remHTML(M, V, st) {
    const id = `pfr${V.uid}`, cur = st.rem;
    const preset = O.rem.some(([v]) => v === cur);
    return `<div class="ap-psh pf-sh" role="dialog" aria-modal="true" aria-labelledby="${id}">${sheetHead(id, "BM reminder")}
      <p class="ap-gd-lede">One reminder a day to log a BM. A day you've already logged gets no reminder.</p>
      <div class="ap-f"><span class="ap-f-l" id="${id}-l">When</span>${chips("pf-rem-pick", O.rem.map(([v, l]) => [String(v), l]), (v) => v === String(cur), { single: true, wrap: true, labelledby: `${id}-l` })}</div>
      <div class="ap-f"><label class="ap-f-l" for="${id}-t">Or pick a time</label><label class="ap-fld">${ic("clock")}<input id="${id}-t" type="time" data-pf-in="remTime" value="${cur == null || cur === "off" ? "" : RU.toInput(cur)}"></label>${!preset && cur != null && cur !== "off" ? `<p class="ap-f-h">Every day at ${esc(T(cur))}</p>` : ""}</div>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="pf-rem-save">Save</button></div></div>`;
  }
  function delHTML(M, V, st) {
    const id = `pfd${V.uid}`, c = tally(M), ck = RU.ckOn(V) && c.ck > 0, n = c.total + (ck ? c.ck : 0);
    const from = sinceOf(M);
    /* the account: everything goes, the sign-in too, asked first and never red */
    if (st && st.acct) {
      const has = countText(c, RU.ckOn(V));
      return `<div class="ap-psh pf-sh" role="dialog" aria-modal="true" aria-labelledby="${id}">${sheetHead(id, "Delete your account?")}
        <p class="ap-gd-lede">${esc(`This deletes your Florin account and everything in it: ${has ? `${has} ${from}, ` : ""}your answers in Profile and your sign-in. It can't be undone.`)}</p>
        <p class="ap-f-h">${esc(has ? "To keep a copy first, export your logs." : "Nothing is logged yet, so there's nothing to export first.")}</p>
        <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--2 ap-btn--block" data-act="pf-delacct-yes">Delete my account</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close" data-autofocus>Keep my account</button></div></div>`;
    }
    /* the count names every kind it counts; the check-ins aren't entries, so they're named on their own ("all" only
       before more than one) */
    const what = `${c.total ? `all ${plural(c.total, "entry", "entries")} ${from} (${kindsText(c)})` : ""}${c.total && ck ? " and " : ""}${ck ? `${c.total || c.ck === 1 ? "" : "all "}${plural(c.ck, "weekly check-in")}` : ""}`;
    return `<div class="ap-psh pf-sh" role="dialog" aria-modal="true" aria-labelledby="${id}">${sheetHead(id, n ? "Delete your logs?" : "Nothing to delete yet")}
      <p class="ap-gd-lede">${esc(n ? `This deletes ${what}.${c.total ? " Florin starts learning your usual again from today." : ""} It can't be undone.` : "Nothing is logged yet. Your logs show up here once there are some.")}</p>
      ${n ? `<p class="ap-f-h">Your answers in Profile stay. To keep a copy first, export your logs.</p>` : ""}
      <div class="ap-fl-act">${n ? `<button type="button" class="ap-btn ap-btn--2 ap-btn--block" data-act="pf-del-yes">Delete my logs</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close" data-autofocus>Keep my logs</button>` : `<button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">OK</button>`}</div></div>`;
  }

  /* ====================================================================== */
  /* ONBOARDING                                                              */
  /* ====================================================================== */
  const stepsOf = (st) => (st.edit ? [st.only] : FLOWS[st.flow]);
  const keyOf = (st) => stepsOf(st)[Math.min(st.step, stepsOf(st).length - 1)];
  /* a step has an answer when what it writes has something in it */
  const answered = (k, st) => {
    const S = STEPS[k], a = st.a;
    if (S.kind === "text") return !!(a.name || "").trim();
    if (S.kind === "form") return st.form != null || st.word != null || !!st.varies;
    if (S.kind === "about") return ["age", "sex", "periods"].some((f) => a[f] != null);
    if (S.kind === "many") return !!(a[S.fields[0]] || []).length || (k === "meds" && !!(a.medsText || "").trim());
    if (S.kind === "one" || S.kind === "rem") return a[S.fields[0]] != null;
    return true;
  };
  const newFlow = (api, flow, o = {}) => {
    const M = api.M();
    const a = blank();
    a.name = baseOf(M).name;
    a.ckDay = Object.assign({}, M.ckDay);
    return Object.assign({ flow, step: 0, a, form: null, word: null, varies: false }, o);
  };
  /* one answer, reopened from Profile: the same step, with Save and Clear */
  const editFlow = (api, k) => {
    const M = api.M(), a = copy(answers(api, M.P.id));
    if (!a.skip) a.skip = {};
    a.ckDay = Object.assign({}, M.ckDay);
    const u = a.usual || {};
    return { flow: flowOf(api.V().onboard), edit: true, only: k, step: 0, a, form: u.form != null ? u.form : null, word: u.word != null ? u.word : null, varies: !!u.varies };
  };

  function bodyOf(k, st, M, V, id) {
    const S = STEPS[k], a = st.a, ck = RU.ckOn(V);
    const n = FLOWS[st.flow].length;
    const head = (kick, q, sub) => `<div class="ap-ck-q"><span class="ap-k">${esc(kick)}</span><h3 tabindex="-1" data-autofocus>${esc(q)}</h3>${sub ? `<p class="ap-ck-recall">${esc(sub)}</p>` : ""}</div>`;
    /* Larger text and simpler screens (the Easy version), offered on Welcome, before the first question, and again on
       Ready; kept in Profile under Display */
    const easy = `<ol class="ap-card ap-ea pf-onb-easy">${sw("onb-easy", !!V.easy, "Larger text and simpler screens", "Bigger type and buttons, fewer cards. Change it any time in Profile.")}</ol>`;
    if (k === "welcome") {
      const pts = [
        [`${n} short steps, ${st.flow === "short" ? "under two minutes" : "about 3 minutes"}`, "Skip any of them."],
        ["Change any answer later", "Everything you say here shows in Profile."],
        ["Your logs are yours", "Export them or delete them any time."]
      ];
      return `${head("Welcome to Florin", "Gut days blur together. Florin keeps the record.", "")}
        <p class="ap-gd-lede">You log what happens: BMs, symptoms, a meal now and then. After ${L.LEARN_DAYS} days, Florin knows your usual, and shows each day next to it, never next to anyone else's.</p>
        <ul class="pf-pts">${pts.map(([b, e]) => `<li><span class="pf-pt-ic">${ic("check")}</span><span><b>${esc(b)}</b><em>${esc(e)}</em></span></li>`).join("")}</ul>
        ${easy}`;
    }
    if (k === "isnt" || k === "ready") {
      const isnt = `<ul class="pf-pts">
          <li><span class="pf-pt-ic">${ic("chart")}</span><span><b>A wellness app</b><em>Florin shows patterns in your own logs. It isn't a medical device.</em></span></li>
          <li><span class="pf-pt-ic">${ic("today")}</span><span><b>Read against your own usual</b><em>Every number sits next to your own usual, never anyone else's, and never as a grade.</em></span></li>
          <li><span class="pf-pt-ic">${ic("lock")}</span><span><b>Your logs are yours</b><em>Export them or delete them any time, from Profile. ${esc(researchLine(st.a.rchoice === "yes"))}</em></span></li>
        </ul>
        <div class="ap-ask-alarm" role="note"><span class="ap-k">When to see a clinician</span><b>Some signs go to primary care first</b><p>Blood, a black or tar-like stool, a fever, vomiting that won't stop, weight loss you can't explain, or waking at night to go. Florin points you to your GP or a nurse practitioner, and won't try to read them.</p></div>`;
      if (k === "isnt") return `${head("Before you start", "What Florin is, and isn't", "")}${isnt}<p class="ap-fine">${esc(DISC)}</p>`;
      const nm = (a.name || "").trim() || accountName(M);
      return `${head("Ready", nm ? `You're set up, ${nm}` : "You're set up", "")}
        <p class="ap-gd-lede">Today is day 1 of ${L.LEARN_DAYS}. Log your first BM when it happens, and anything else from plus. In ${plural(L.LEARN_DAYS - 1, "more day")}, Florin can start showing your usual.</p>
        ${easy}
        ${st.flow === "full" ? isnt : ""}
        <p class="ap-fine">${esc(DISC)}</p>`;
    }
    let ctl = "", sub = st.edit && S.subEdit ? S.subEdit : S.sub;
    if (k === "name") sub = `${S.sub} ${st.edit ? "Clear it" : "Skip it"}, and Florin uses the name you signed up with, ${accountName(M)}.`;
    if (S.kind === "text") {
      ctl = `<div class="ap-f"><label class="ap-f-l" for="${id}-name">First name</label><input id="${id}-name" class="ap-in" type="text" data-pf-in="name" value="${esc(a.name || "")}" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" maxlength="40" placeholder="First name"></div>`;
    } else if (S.kind === "one") {
      ctl = rows1(S.fields[0], O[S.fields[0]], a[S.fields[0]], S.q);
    } else if (S.kind === "many") {
      const f = S.fields[0], cur = a[f] || [];
      ctl = `${S.max ? `<p class="ap-f-h pf-count${st.full ? " is-flash" : ""}" aria-live="polite">${cur.length} of ${S.max} picked${cur.length >= S.max ? ". Take one off to pick another." : ""}</p>` : ""}
        ${chips("onb-tog", O[f].map(([v, l]) => [`${f}:${v}`, l]), (v) => cur.includes(v.slice(f.length + 1)), { wrap: true, label: S.q })}`;
      if (k === "sym") {
        const signs = signsOf(cur);
        ctl += signs.length ? `<div class="ap-ask-alarm pf-alarm" role="note"><span class="ap-k">When to see a clinician</span><b>${esc(signLine(signs))}</b><p>Worth a clinician's look soon. Primary care is the right first stop: your GP or a nurse practitioner. Florin won't try to read it.</p>${signs.some((x) => x === "blood" || x === "black") ? `<p class="ap-fl-urgent">If there's a lot of blood, or you feel faint or dizzy, get urgent care now.</p>` : ""}</div>`
          : cur.includes("mucus") ? `<p class="ap-info">${ic("info")}<span>If mucus is new for you, keeps showing up, or comes with pain or blood, talk to a clinician.</span></p>`
          : `<p class="ap-info">${ic("info")}<span>New for you, or getting stronger? Talk to a clinician.</span></p>`;
      }
      if (k === "meds") ctl += `<div class="ap-f"><label class="ap-f-l" for="${id}-meds">Anything else, in your words</label><input id="${id}-meds" class="ap-in" type="text" data-pf-in="medsText" value="${esc(a.medsText || "")}" autocomplete="off" maxlength="80" placeholder="Optional"></div>`;
    } else if (S.kind === "about") {
      ctl = ["age", "sex", "periods"].map((f) => `<div class="ap-f"><span class="ap-f-l" id="${id}-${f}">${{ age: "Age range", sex: "Sex", periods: "Do you have periods?" }[f]}</span>${chips("onb-pick", O[f].map(([v, l]) => [`${f}:${v}`, l]), (v) => v === `${f}:${a[f]}`, { single: true, wrap: true, labelledby: `${id}-${f}` })}${f === "periods" ? `<p class="ap-f-h">If you do, Florin can show cycle days next to your logs later, as context.</p>` : ""}</div>`).join("");
    } else if (S.kind === "form") {
      const sel = st.form != null || st.word != null ? { form: st.form, word: st.word } : null;
      /* the Easy version: the option's words as big rows with their marks, as its own Log a BM draws them (the tiles'
         labels are smaller than its type allows); the core's form act picks either way */
      ctl = V.easy ? `<div class="ap-f">${formRows(V.form, sel, S.q, { id: `${id}-fo`, keep: st.edit ? "Save" : "Continue" })}<button type="button" class="ap-gd-b pf-fo-guide" data-act="guide">${ic("info")}How to pick</button></div>`
        : `<div class="ap-f">${RU.formTiles(V.form, sel, { guide: true, label: S.q })}
          <p class="ap-fm-line${sel ? " is-set" : ""}">${sel ? `<b>${esc(L.formName(sel.form != null ? sel.form : sel, V.form))}</b> · ${esc(L.formLine(sel.form != null ? sel.form : sel, V.form))}` : "Tap the closest one. It doesn't need to be exact."}</p></div>`;
      ctl += `
<button type="button" class="ap-ck-opt${st.varies ? " is-on" : ""}" data-act="onb-varies" aria-pressed="${!!st.varies}"><span>It varies</span>${st.varies ? ic("check") : ""}</button>`;
    } else if (S.kind === "rem") {
      ctl = `<div class="ap-f"><span class="ap-f-l">BM reminder</span>${rows1("rem", O.rem, a.rem, "BM reminder")}</div>`;
      if (ck) {
        const c = a.ckDay || M.ckDay;
        ctl += `<div class="ap-f"><span class="ap-f-l" id="${id}-ckd">Weekly check-in, the day</span>${chips("onb-ckd", Ut.DOW.map((dd, i) => [`dow:${i}`, dd]), (v) => v === `dow:${c.dow}`, { single: true, week: true, noCheck: true, labelledby: `${id}-ckd` })}</div>
          <div class="ap-f"><span class="ap-f-l" id="${id}-ckt">And the time</span>${chips("onb-ckd", [["when:morning", "Morning"], ["when:evening", "Evening"]], (v) => v === `when:${c.when}`, { single: true, labelledby: `${id}-ckt` })}<p class="ap-f-h">${esc(plural(L.CHECKIN.length, "quick question"))} once a week, about a minute. Skipping is fine.</p></div>`;
      }
    }
    return `${head(S.kick, S.q, sub)}${ctl}`;
  }
  /* the option's words as one-choice rows, hardest first, each with its mark and line. A word picked in B, seen in A
     or C, covers one or two steps and names neither: those rows are marked in words (as Easy's own Log a BM marks
     them), nothing is checked, and a line says what Continue keeps */
  const NUM = ["no", "one", "two", "three"];
  function formRows(mode, sel, label, o = {}) {
    const wl = mode !== "B" && sel && sel.form == null && sel.word != null ? L.WORDS[sel.word] : null;
    const tag = wl ? (wl.types.length > 1 ? "Could be this one" : "The same as your word") : "";
    const items = mode === "B"
      ? L.WORDS.map((w) => ({ attr: `data-word="${w.k}"`, on: !!sel && (sel.word === w.k || (sel.form != null && L.wordOf(sel.form) === w.k)), g: w.glyph, name: w.word, line: w.line }))
      : L.TYPES.slice(1).map((t) => ({ attr: `data-form="${t.k}"`, on: !!sel && sel.form === t.k, maybe: !!wl && wl.types.includes(t.k), g: t.k, name: mode === "A" ? `Type ${t.k}: ${t.short}` : t.short, line: t.line }));
    const keep = o.keep || "Continue";
    const line = !wl ? "" : wl.types.length > 1
      ? `You picked ${wl.word}, which could be either of the ${NUM[wl.types.length] || wl.types.length} marked "${tag}". Tap one to be exact, or ${keep} to keep ${wl.word}.`
      : `You picked ${wl.word}, the one marked "${tag}". Tap ${keep} to keep it.`;
    const lid = line && o.id ? o.id : "";
    return `${line ? `<p class="ap-info pf-fo-info"${lid ? ` id="${lid}"` : ""}>${ic("info")}<span>${esc(line)}</span></p>` : ""}<div class="ap-ck-opts pf-fo" role="radiogroup" aria-label="${esc(label)}"${lid ? ` aria-describedby="${lid}"` : ""}>${items.map((it) => `<button type="button" class="ap-ck-opt pf-fo-b${it.on ? " is-on" : it.maybe ? " is-maybe" : ""}" data-act="form" ${it.attr} role="radio" aria-checked="${it.on}"><span class="pf-fo-g" aria-hidden="true">${RU.glyph(it.g)}</span><span class="pf-fo-t">${it.maybe ? `<span class="pf-fo-maybe">${esc(tag)}</span>` : ""}<b>${esc(it.name)}</b><em>${esc(it.line)}</em></span>${it.on ? ic("check") : ""}</button>`).join("")}</div>`;
  }

  function onbHTML(M, V, st) {
    if (st.form != null || st.word != null) st.varies = false;
    const steps = stepsOf(st), i = Math.min(st.step, steps.length - 1), k = steps[i], S = STEPS[k], n = steps.length;
    const id = `onb${V.uid}`, has = answered(k, st);
    const total = FLOWS[st.flow].length, at = FLOWS[st.flow].indexOf(k) + 1;
    const prog = st.edit ? "" : `<div class="ap-ck-prog pf-prog" style="--n:${n}" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${i + 1}" aria-valuetext="${esc(`Step ${i + 1} of ${n}`)}">${steps.map((_, j) => `<i class="${j < i ? "is-done" : j === i ? "is-on" : ""}"></i>`).join("")}</div>`;
    /* a reopened answer cancels; a later step goes back; Welcome closes, since the page opens every flow (the toggle or
       a Screens row) and must always be able to leave it. Closing keeps the phone's logs as they were */
    const lead = st.edit ? `<button type="button" class="ap-lg-x" data-act="close" aria-label="Cancel">${ic("close")}</button>` : i > 0 ? `<button type="button" class="ap-lg-x" data-act="onb-back" aria-label="Back">${ic("back")}</button>` : `<button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button>`;
    const skip = st.edit || S.kind === "ready" ? `<span class="ap-fsh-sp"></span>` : `<button type="button" class="ap-ck-later" data-act="onb-skip">Skip</button>`;
    const title = st.edit ? "Edit your answer" : st.flow === "full" ? "Full survey" : "Getting started";
    const sub = st.edit ? "From Profile" : `Step ${i + 1} of ${n}`;
    const question = !["info", "ready"].includes(S.kind);
    let foot;
    if (S.kind === "ready") {
      foot = `<button type="button" class="ap-btn ap-btn--block" data-act="onb-done" data-v="bm">Log your first BM</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="onb-done" data-v="today">Go to Today</button>`;
    } else if (st.edit) {
      foot = `${has ? "" : `<p class="ap-fsh-hint" id="${id}-hint">Pick an answer to save, or clear it</p>`}<button type="button" class="ap-btn ap-btn--block" data-act="onb-save"${has ? "" : ` aria-disabled="true" aria-describedby="${id}-hint"`}>Save</button><button type="button" class="ap-fsh-del pf-clear" data-act="onb-clear">${ic("undo")}Clear my answer</button>`;
    } else {
      const hint = S.kind === "text" ? "Type your first name, or skip this step" : S.max ? `Pick up to ${S.max}, or skip this step` : S.kind === "many" ? "Pick any that fit, or skip this step" : "Pick one, or skip this step";
      foot = `${question && !has ? `<p class="ap-fsh-hint" id="${id}-hint">${esc(hint)}</p>` : ""}<button type="button" class="ap-btn ap-btn--block" data-act="onb-next"${question && !has ? ` aria-disabled="true" aria-describedby="${id}-hint"` : ""}>${k === "welcome" ? "Get started" : "Continue"}</button>`;
    }
    return `<div class="ap-ck pf-onb" role="dialog" aria-modal="true" aria-labelledby="${id}-h" data-step="${esc(k)}" data-flow="${esc(st.flow)}"${st.edit ? "" : ` data-at="${at}" data-of="${total}"`}>
      <div class="ap-ck-h">${lead}<div class="ap-fsh-t"><h2 id="${id}-h">${esc(title)}</h2><p>${esc(sub)}</p></div>${skip}</div>
      <div class="ap-ck-b" data-scroll>${prog}${bodyOf(k, st, M, V, id)}</div>
      <div class="ap-fsh-f">${foot}</div>
    </div>`;
  }

  /* ====================================================================== */
  /* REGISTRATION                                                            */
  /* ====================================================================== */
  /* Reset the demo starts every person's answers again: the page's reset is the phone's, so it's wrapped once, the
     first time the phone draws Today, a screen of this module's, or changes (Easy may draw Today in place of the
     core) */
  const hooked = new WeakSet();
  const hookReset = (api) => {
    if (!api || hooked.has(api) || typeof api.reset !== "function") return;
    hooked.add(api);
    const base = api.reset;
    api.reset = function () { try { delete api.S.pf; } catch (e) { warn(e); } return base.apply(this, arguments); };
  };
  /* a render that throws is reported, naming this module, and draws nothing, so the core never opens an empty sheet */
  const safeRender = (f) => (M, V, st, api) => { try { hookReset(api || EXT.api); return f(M, V, st || {}, api || EXT.api); } catch (e) { warn(e); return ""; } };
  const pfKey = () => { const api = EXT.api, M = api && pfModel(api); return M && M.mode === "fresh" ? "profile-day1" : "profile"; };
  Object.assign(EXT.overlays, {
    pf: { kind: "screen", render: safeRender(profileHTML), key: pfKey },
    onb: { kind: "screen", render: safeRender((M, V, st) => onbHTML(M, V, st)), key: (st) => (st.edit ? "onb-edit" : st.flow === "full" && keyOf(st) === "sym" && signsOf(st.a.sym).length ? "onb-sign" : `onb-${st.flow}`) },
    "pf-rem": { kind: "sheet", render: safeRender((M, V, st) => remHTML(M, V, st)), key: pfKey },
    "pf-info": { kind: "sheet", render: safeRender((M, V, st, api) => infoHTML(pfModel(api), V, st, api)), key: pfKey },
    "pf-del": { kind: "sheet", render: safeRender((M, V, st, api) => delHTML(pfModel(api), V, st)), key: pfKey }
  });

  /* every Profile under the top sheet redraws after a change made on that sheet */
  const redrawPf = (api) => api.S.ovl.forEach((o) => { if (o.type === "pf") api.rerender(o, { noRestore: o !== api.top() }); });
  /* back on Profile after a sheet or a reopened answer saves (and Profile redrew): focus goes back to the row that
     opened it, scrolled into view in Profile, never the page around the phone */
  const focusRow = (api, sel) => {
    const o = api.top();
    if (!o || o.type !== "pf") return;
    const el = o.el.querySelector(sel);
    if (!el) return;
    el.focus({ preventScroll: true });
    const sc = o.el.querySelector(".ap-ck-b");
    if (!sc) return;
    const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(), k = s.height / sc.clientHeight || 1;
    if (r.top < s.top || r.bottom > s.bottom) sc.scrollTop += ((r.top + r.bottom) / 2 - (s.top + s.bottom) / 2) / k;
  };
  /* after a reopened answer saves or clears: Profile redraws, and focus is back on its row */
  const backToPf = (api, M, from) => {
    api.pop({ instant: true });
    if (ensurePerson(M, api)) api.renderTab(true);
    redrawPf(api);
    if (from) focusRow(api, `[data-act="pf-edit"][data-v="${CSS.escape(from)}"]`);
  };
  const openProfile = (api, o) => api.push("pf", {}, o);
  /* moving between steps: a fresh draw, the screen back at its top, focus on the new question */
  const stepTo = (api, ov) => {
    api.rerender(ov, { noRestore: true });
    const sc = ov.el.querySelector(".ap-ck-b"); if (sc) sc.scrollTop = 0;
    const h = ov.el.querySelector(".ap-ck-q h3"); if (h) h.focus({ preventScroll: true });
  };
  /* scroll the step (never the page around the phone) until el is in view */
  const reveal = (sc, el, now) => {
    if (!sc || !el) return;
    const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(), k = s.height / sc.clientHeight || 1;
    const by = (r.bottom - s.bottom) / k + 24;
    if (by > 0) sc.scrollTo({ top: sc.scrollTop + by, behavior: now || FL.reduced() ? "auto" : "smooth" });
  };
  const onbTop = (api) => { const t = api.top(); return t && t.type === "onb" ? t : null; };
  /* the Continue button and its hint follow the answer in place, so typing never redraws the field */
  const syncNext = (ov) => {
    const k = keyOf(ov.st), has = answered(k, ov.st);
    const btn = ov.el.querySelector('[data-act="onb-next"], [data-act="onb-save"]'), hint = ov.el.querySelector(".ap-fsh-hint");
    if (btn) { if (has) { btn.removeAttribute("aria-disabled"); btn.removeAttribute("aria-describedby"); } else btn.setAttribute("aria-disabled", "true"); }
    if (hint) hint.hidden = has;
  };
  /* what a step writes, from the draft into the answers (the consistency tiles keep their pick on the overlay's state,
     as Log a BM does) */
  const commitStep = (k, st) => {
    if (STEPS[k].kind === "form") st.a.usual = st.varies ? { varies: true } : st.form != null || st.word != null ? { form: st.form, word: st.form != null ? null : st.word } : null;
    if (k === "research") st.a.research = st.a.rchoice === "yes";
    (STEPS[k].fields || []).forEach((f) => { if (st.a.skip) delete st.a.skip[f]; });
  };
  const clearStep = (k, st) => {
    (STEPS[k].fields || []).forEach((f) => { st.a[f] = f === "medsText" ? "" : f === "research" ? false : null; if (!st.a.skip) st.a.skip = {}; st.a.skip[f] = true; });
    if (STEPS[k].kind === "form") { st.form = null; st.word = null; st.varies = false; }
  };
  /* finishing: a new person, so the model starts again at day 1 (Just joined), with the answers kept */
  function finish(api, ov, then) {
    const st = ov.st, pid = api.S.persona, ck = RU.ckOn(api.V());
    const a = Object.assign(blank(), copy(st.a));
    delete a.ckDay;
    a.research = st.a.rchoice === "yes";
    state(api).ans[pid] = a;
    const ckDay = st.a.ckDay;
    api.set("data", "fresh");
    const M = api.M();
    if (ck && ckDay) M.ckDay = { dow: ckDay.dow, when: ckDay.when };
    ensurePerson(M, api);
    api.renderTab(true);
    api.nav();
    /* a bare button: the act reads data-form from what it's given, and the phone's root carries the option there */
    if (then === "bm") api.act("open-bm", document.createElement("button"));
    else { api.focusSel(); api.toast(`You're set up. Today is day 1 of ${L.LEARN_DAYS}.`); }
  }
  /* a module act that throws is reported, naming this module; the avatar falls back to the core's own */
  const act = (f, fallback) => (b, api, e) => { try { return f(b, api, e); } catch (err) { warn(err); if (fallback) return api.core(fallback, b, e); return undefined; } };
  const split = (v) => { const i = String(v).indexOf(":"); return [String(v).slice(0, i), String(v).slice(i + 1)]; };
  const prevCkdSave = EXT.acts["ckd-save"];
  Object.assign(EXT.acts, {
    profile: act((b, api) => { if (!openProfile(api)) api.core("profile", b); }, "profile"),
    /* ---------- onboarding ---------- */
    "onb-next": act((b, api) => {
      const ov = onbTop(api); if (!ov) return;
      const st = ov.st, k = keyOf(st);
      commitStep(k, st);
      if (st.step < FLOWS[st.flow].length - 1) st.step++;
      st.full = false;
      stepTo(api, ov);
    }),
    "onb-back": act((b, api) => { const ov = onbTop(api); if (!ov) return; ov.st.step = Math.max(0, ov.st.step - 1); ov.st.full = false; stepTo(api, ov); }),
    "onb-skip": act((b, api) => {
      const ov = onbTop(api); if (!ov) return;
      const st = ov.st, k = keyOf(st);
      if (!["info", "ready"].includes(STEPS[k].kind)) clearStep(k, st);
      if (st.step < FLOWS[st.flow].length - 1) st.step++;
      st.full = false;
      stepTo(api, ov);
      api.say(`Skipped. Step ${st.step + 1} of ${FLOWS[st.flow].length}.`);
    }),
    "onb-pick": act((b, api) => {
      const ov = onbTop(api); if (!ov) return;
      const [f, raw] = split(b.dataset.v), v = f === "rem" && raw !== "off" ? +raw : raw;
      ov.st.a[f] = ov.st.a[f] === v ? null : v;
      api.rerender(ov);
    }),
    "onb-tog": act((b, api) => {
      const ov = onbTop(api); if (!ov) return;
      const st = ov.st, [f, v] = split(b.dataset.v), S = STEPS[keyOf(st)];
      let cur = (st.a[f] || []).slice();
      const alone = ALONE[f] || [];
      if (cur.includes(v)) cur = cur.filter((x) => x !== v);
      else if (S.max && cur.length >= S.max) { st.full = true; api.rerender(ov); api.say(`Up to ${S.max}. Take one off to pick another.`); return; }
      else cur = alone.includes(v) ? [v] : cur.filter((x) => !alone.includes(x)).concat([v]);
      st.a[f] = cur.length ? cur : null;
      st.full = false;
      api.rerender(ov);
      /* an alarm feature picked on the symptoms step: the primary care note shows on the step, and is read out */
      if (f === "sym" && ALARM_SYM.includes(v) && cur.includes(v)) {
        reveal(ov.el.querySelector(".ap-ck-b"), ov.el.querySelector(".pf-alarm"));
        api.say(`When to see a clinician: ${signLine(signsOf(cur))}. Worth a clinician's look soon. Primary care is the right first stop.`);
      }
    }),
    "onb-varies": act((b, api) => { const ov = onbTop(api); if (!ov) return; const st = ov.st; st.varies = !st.varies; if (st.varies) { st.form = null; st.word = null; } api.rerender(ov); }),
    "onb-ckd": act((b, api) => { const ov = onbTop(api); if (!ov) return; const [f, v] = split(b.dataset.v); ov.st.a.ckDay = Object.assign({}, ov.st.a.ckDay || api.M().ckDay, { [f]: f === "dow" ? +v : v }); api.rerender(ov); }),
    "onb-done": act((b, api) => { const ov = onbTop(api); if (ov) finish(api, ov, b.dataset.v); }),
    "onb-save": act((b, api) => {
      const ov = onbTop(api); if (!ov || !ov.st.edit) return;
      const st = ov.st, k = st.only, M = api.M(), a = answers(api, M.P.id);
      commitStep(k, st);
      STEPS[k].fields.forEach((f) => (a[f] = copy({ v: st.a[f] }).v));
      if (!a.skip) a.skip = {};
      STEPS[k].fields.forEach((f) => delete a.skip[f]);
      backToPf(api, M, st.from);
      api.toast("Saved to your profile.");
    }),
    "onb-clear": act((b, api) => {
      const ov = onbTop(api); if (!ov || !ov.st.edit) return;
      const st = ov.st, k = st.only, M = api.M(), a = answers(api, M.P.id);
      clearStep(k, st);
      STEPS[k].fields.forEach((f) => (a[f] = copy({ v: st.a[f] }).v));
      if (!a.skip) a.skip = {};
      STEPS[k].fields.forEach((f) => (a.skip[f] = true));
      backToPf(api, M, st.from);
      api.toast(k === "name" ? `Answer cleared. Florin uses the name you signed up with, ${accountName(M)}.` : "Answer cleared.");
    }),
    /* ---------- Profile ---------- */
    "pf-edit": act((b, api) => {
      const f = b.dataset.v, flow = flowOf(api.V().onboard), r = ROWS[flow].find(([x]) => x === f);
      if (r) api.push("onb", Object.assign(editFlow(api, r[2]), { from: f }));
    }),
    "pf-rem": act((b, api) => { const a = answers(api); api.push("pf-rem", { rem: a.rem }); }),
    "pf-rem-pick": act((b, api) => { const t = api.top(); if (!t || t.type !== "pf-rem") return; const v = b.dataset.v; t.st.rem = v === "off" ? "off" : +v; api.rerender(t); }),
    "pf-rem-save": act((b, api) => {
      const t = api.top(); if (!t || t.type !== "pf-rem") return;
      const a = answers(api), was = a.rem;
      a.rem = t.st.rem == null ? was : t.st.rem;
      if (a.skip) delete a.skip.rem;
      api.pop({ instant: true });
      redrawPf(api);
      focusRow(api, '[data-act="pf-rem"]');
      api.toast(a.rem === was ? "No change." : a.rem === "off" ? "BM reminder off." : `Saved. A reminder every day at ${T(a.rem)}.`);
    }),
    "pf-set": act((b, api) => {
      const [k, v] = split(b.dataset.v);
      if (!["bmUI", "mealUI", "theme"].includes(k)) return;
      api.set(k, v);
      /* the theme doesn't redraw the phone; the chips here follow it */
      if (k === "theme") redrawPf(api);
    }),
    "pf-easy": act((b, api) => { api.set("easy", !api.V().easy); redrawPf(api); }),
    /* the same switch on onboarding's Welcome and Ready steps: the step redraws in the version picked */
    "onb-easy": act((b, api) => { api.set("easy", !api.V().easy); const ov = onbTop(api); if (ov) api.rerender(ov); api.say(api.V().easy ? "Larger text and simpler screens on." : "Larger text and simpler screens off."); }),
    "pf-research": act((b, api) => {
      const a = answers(api);
      a.research = !a.research;
      a.rchoice = a.research ? "yes" : "no";
      redrawPf(api);
      api.toast(a.research ? "Research sharing is on. Turn it off here any time." : "Research sharing is off. Nothing more is shared from now.");
    }),
    "pf-app": act((b, api) => { api.push("pf-info", { app: b.dataset.v }); }),
    "pf-info": act((b, api) => { api.push("pf-info", { k: b.dataset.v }); }),
    "pf-signout": act((b, api) => { api.pop({ instant: true }); api.toast("In the app, this goes to the sign-in screen. The prototype stays signed in."); }),
    "pf-export": act((b, api) => {
      const M = pfModel(api), c = tally(M), ck = RU.ckOn(api.V()) && c.ck > 0;
      api.toast(c.total || ck ? `Export makes one file of ${c.total ? `all ${plural(c.total, "entry", "entries")} ${sinceOf(M)} (${kindsText(c)})` : ""}${c.total && ck ? " and " : ""}${ck ? plural(c.ck, "weekly check-in") : ""}, to keep or move. That comes in the next pass.` : "Nothing logged yet, so there's nothing to export.");
    }),
    "pf-del": act((b, api) => { api.push("pf-del", {}); }),
    "pf-delacct": act((b, api) => { api.push("pf-del", { acct: true }); }),
    /* the prototype never deletes the demo person: it says what the app does, as Sign out does */
    "pf-delacct-yes": act((b, api) => {
      api.pop({ instant: true });
      focusRow(api, '[data-act="pf-delacct"]');
      api.toast("In the app, this deletes your account and signs you out. The prototype keeps it.");
    }),
    "pf-del-yes": act((b, api) => {
      api.set("data", "fresh");
      ensurePerson(api.M(), api);
      api.renderTab(true);
      api.focusSel();
      api.toast(`Your logs are deleted. Today is day 1 of ${L.LEARN_DAYS} again.`);
    }),
    /* the check-in's own day sheet, opened from Profile: Profile shows the new day once it's saved, with focus back on
       its row. The save runs once, outside the guard: only the redraw after it is this module's */
    "ckd-save": (b, api, e) => {
      const r = prevCkdSave ? prevCkdSave(b, api, e) : api.core("ckd-save", b, e);
      try { redrawPf(api); focusRow(api, '[data-act="ck-day"]'); } catch (err) { warn(err); }
      return r;
    }
  });

  /* typing never redraws: a name or a medicine is kept on the draft as it's typed */
  document.addEventListener("input", (e) => {
    const el = e.target && e.target.closest && e.target.closest("[data-pf-in]"), api = EXT.api;
    if (!el || !api || !api.root.contains(el)) return;
    try {
      const t = api.top(); if (!t) return;
      const k = el.dataset.pfIn;
      if (t.type === "onb" && (k === "name" || k === "medsText")) { t.st.a[k] = el.value; syncNext(t); }
      if (t.type === "pf-rem" && k === "remTime") {
        const h = RU.fromInput(el.value);
        if (h == null) return;
        t.st.rem = h;
        t.el.querySelectorAll('[data-act="pf-rem-pick"]').forEach((x) => { const on = x.dataset.v === String(h); x.classList.toggle("is-on", on); x.setAttribute("aria-checked", String(on)); });
      }
    } catch (err) { warn(err); }
  });
  /* Enter on the name moves on, as Continue would */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target || !e.target.matches || !e.target.matches('[data-pf-in="name"]')) return;
    const api = EXT.api, ov = api && onbTop(api);
    if (!ov) return;
    e.preventDefault();
    try { if (answered(keyOf(ov.st), ov.st)) EXT.acts[ov.st.edit ? "onb-save" : "onb-next"](e.target, api, e); } catch (err) { warn(err); }
  });

  /* Escape on an onboarding step goes back a step, as Back does, and on Welcome closes it, as its Close does: the
     core's Escape would close any step and lose every answer. Ahead of the core's own handlers, and only for the phone
     (or focus fallen out to the page), so the page's own sheets still close on Escape. A reopened answer still cancels */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const api = EXT.api, ov = api && onbTop(api);
    if (!ov || ov.st.edit || !(api.root.contains(e.target) || e.target === document.body)) return;
    e.preventDefault();
    e.stopPropagation();
    try { if (ov.st.step > 0) EXT.acts["onb-back"](e.target, api, e); else api.pop(); } catch (err) { warn(err); }
  }, true);

  /* Today's greeting follows the first name from onboarding. The wrapper always draws the screen it wraps */
  const baseToday = RU.today;
  if (typeof baseToday === "function") {
    RU.today = (M, V) => {
      try { const api = EXT.api; hookReset(api); if (api && api.M() === M) ensurePerson(M, api); } catch (e) { warn(e); }
      return baseToday(M, V);
    };
  }
  /* a change of flow part way through: the same step when both flows have it, else the first step of the other flow
     after the last one both share up to here, so the person lands on a step they haven't been through and never back
     on Welcome */
  const stepIn = (from, flow, k) => {
    const to = FLOWS[flow], i = to.indexOf(k);
    if (i >= 0) return i;
    const seq = FLOWS[from], at = seq.indexOf(k);
    for (let j = at; j >= 0; j--) { const x = to.indexOf(seq[j]); if (x >= 0) return Math.min(x + 1, to.length - 1); }
    return 0;
  };
  /* a Screens row opening a flow sets the decision first; that set mustn't open the flow a second time */
  let opening = false;
  /* after the phone changes: a new model for the person keeps their name; the theme moves the chips in Profile. The
     Onboarding toggle shows its flow on the phone: an open set-up moves to the other flow, answers kept; otherwise
     the flow opens from its first step */
  EXT.onSet.push((k, v, api) => {
    try {
      hookReset(api);
      if (["persona", "data", "meals"].includes(k)) { if (ensurePerson(api.M(), api)) api.renderTab(true); }
      if (k === "theme" || k === "easy") redrawPf(api);
      if (k === "onboard" && !opening) {
        const flow = flowOf(v), ov = api.S.ovl.find((o) => o.type === "onb" && !o.st.edit);
        if (!ov) api.open(`onb-${flow}`);
        else if (ov.st.flow !== flow) {
          ov.st.step = stepIn(ov.st.flow, flow, keyOf(ov.st));
          ov.st.flow = flow;
          ov.st.full = false;
          if (api.top() === ov) stepTo(api, ov); else api.rerender(ov, { noRestore: true });
        }
      }
    } catch (e) { warn(e); }
  });

  /* ---------- the Screens list ---------- */
  const setIf = (api, k, v) => { if (api.V()[k] !== v) { opening = true; try { api.set(k, v); } finally { opening = false; } } };
  Object.assign(EXT.opens, {
    "onb-short": (api) => { setIf(api, "onboard", "short"); api.push("onb", newFlow(api, "short"), { instant: true }); },
    "onb-full": (api) => { setIf(api, "onboard", "full"); api.push("onb", newFlow(api, "full"), { instant: true }); },
    "onb-sign": (api) => {
      setIf(api, "onboard", "full");
      const st = newFlow(api, "full", { step: FLOWS.full.indexOf("sym") });
      st.a.sym = ["bloating", "blood"];
      const ov = api.push("onb", st, { instant: true });
      /* the note in view, as it is right after the tap */
      if (ov) reveal(ov.el.querySelector(".ap-ck-b"), ov.el.querySelector(".pf-alarm"), true);
    },
    profile: (api) => { openProfile(api, { instant: true }); },
    "profile-day1": (api) => { api.push("pf", { preview: api.V().data !== "fresh" }, { instant: true }); }
  });
  EXT.screens.push(["Onboarding and profile", [["onb-short", "Onboarding (short)"], ["onb-full", "Onboarding (full survey)"], ["onb-sign", "Onboarding: a sign that needs a clinician"], ["profile", "Profile"], ["profile-day1", "Profile on day 1"]]]);
  EXT.built.onboard = ["short", "full"];

  /* ====================================================================== */
  /* NOTES FOR WILL                                                          */
  /* ====================================================================== */
  const nameOf = (M) => (M && M.P ? M.P.name : "The person");
  const WRONG = [
    ["14 questions before Today, each line opening with an emoji, buttons in all caps", `${FLOWS.short.length} short steps in Florin's voice, sentence case, every one skippable`],
    ["Goals that promise outcomes: reduce IBS-D flare-ups, optimize microbiome health, improve digestive comfort", "What Florin does: know my own usual, see what tends to come before a rougher day, find foods worth a 14-day check, bring my logs to a clinician, keep a simple record"],
    ["IBS-D symptoms as a tile Florin reads", "I have IBS-D, or I've been told I might have IBS: the person's own words, never a label Florin gives"],
    ["Typical consistency on a slider named for a licensed scale, with steps called Normal and Ideal", "Most often, lately?, in the option's own words, with It varies; a first guess the logs replace by day 14"],
    ["Weight in pounds", "Left out. Weight loss is an alarm feature, so asking for it at sign-up invites reading it later"],
    ["Bloody stool and mucus as two more chips", "Blood, black or tar-like stools, or waking at night to go show the Teal primary care note on the step"],
    ["A conditions list that names a condition Florin never mentions", "Self-reported and short: IBS, celiac disease, lactose intolerance, a food allergy, something else, none, prefer not to say"],
    ["Research consent as step 14 of 14", "A clear choice, off unless yes, and a switch in Profile to turn it off again"]
  ];
  const shortSteps = (P) => `welcome, first name, what brings you, up to 3 things Florin does, periods, ${P.checkin ? "a BM reminder and the check-in day" : "a BM reminder"}, what Florin is and isn't, and ready`;
  const fullSteps = "welcome, first name, about you (age range, sex, periods), what brings you, goals, most often lately, symptoms now, eating, stress and sleep, foods to watch, medicines and supplements, conditions, research, and ready";
  Object.assign(EXT.notes, {
    "onb-short": (M, P) => ({
      t: "Onboarding, short",
      lede: `${FLOWS.short.length} steps, under two minutes, each with Continue and Skip, and Back from step 2: ${shortSteps(P)}. Only what changes the app on day 1. Welcome offers Larger text and simpler screens as a switch, before the first question, and Ready offers it again. Log your first BM or Go to Today both finish on Today, day 1 of ${L.LEARN_DAYS} (Logs on the left moves to Just joined), and every answer shows in Profile. Welcome has Close (and Escape there closes it too), which leaves set-up with the logs on the phone as they were; on a later step Escape goes back a step.`,
      ba: WRONG.slice(0, 3).concat([["Biological sex as a demographic", P.checkin ? "Do you have periods?, which feeds cycle context later (the Period tag on the check-in)" : "Do you have periods?, kept for cycle context later"]]),
      open: ["Is a BM reminder worth a step on day 1, or better offered after the third log?", "Welcome can be closed, so the page's toggles always have a way back. In the app, should a person be able to leave set-up at Welcome and finish it later?", "What should 'what brings you' change on day 1? Ask Florin's first questions are the obvious candidate.", "Ask the rest in context: eating when the first meal is logged, foods to watch with the first food check, medicines and conditions with the first clinician report. Agree?"],
      res: ["The shipping survey notes (Oct 27): 60% of men want setup under 10 minutes, and 47% of women want cycle context.", "Oura takes up to 2 weeks of learning before it judges anything; Florin's day 14 does the same."]
    }),
    "onb-full": () => ({
      t: "Onboarding, the full survey",
      lede: `Today's sections, refreshed, in ${FLOWS.full.length} steps: ${fullSteps}. Every step skippable, every answer editable from Profile. Welcome and Ready both offer Larger text and simpler screens, and Welcome can be closed. Finishing lands on Today, day 1 of ${L.LEARN_DAYS}.`,
      ba: WRONG.slice(3),
      open: ["Which of these earn a place before Today? The recommendation is none: ask each one where it's used.", "Age range and sex: keep at all, or only for the clinician report?", `Foods to watch: should Florin count them from day 1, or wait for ${L.PATTERN_BAR.n} logs like every other food (as built)?`, "The shipping survey has no reminder step, so after it Profile's BM reminder reads Not set until it's picked there. Add the short flow's reminder step to it?"],
      res: ["Nerva asks a symptom measure at onboarding, weekly and at the end (its licensing is unverified); Florin's questions stay its own.", "Rome questionnaires are diagnostic and licensed: nothing here adapts or scores one."]
    }),
    "onb-sign": () => ({
      t: "Onboarding: a sign that needs a clinician",
      lede: "On the symptoms step, picking blood, black or tar-like stools, or waking at night to go brings the Teal note right there: When to see a clinician, the sign in bold, primary care first, and urgent care for a lot of blood. It's read out too. Florin never interprets it, and onboarding carries on.",
      ba: [["Bloody stool as a quiet tick among 17 chips", "The primary care note on the step, in Teal, never red"], ["Mucus in the same list", "Mucus gets the softer line, as on Log a BM: new for you, keeps showing up, or with pain or blood"]],
      open: ["Should the note come back on Today on day 1, or is once, on the step, enough? Profile marks the row Primary care first.", "Fever, vomiting that won't stop and weight loss you can't explain aren't on the list (they weren't in the shipping survey). Add them?"],
      res: ["The research's watch-outs: keep the referral path, and blood or mucus goes to a clinician, not to interpretation."]
    }),
    "onb-edit": () => ({
      t: "An answer, reopened from Profile",
      lede: "The same step as onboarding, with Save and Clear my answer in place of Continue and Skip, and Cancel to leave it as it was. Saving goes back to Profile with the new answer on its row.",
      ba: [["Update health survey: all 14 questions again", "One answer at a time, from its own row"]],
      open: ["Should a changed answer (periods, say) also offer to change what it feeds, like cycle context, there and then?"],
      res: []
    }),
    profile: (M, P) => {
      const u = M && M.usual;
      return {
        t: "Profile",
        lede: `From the avatar on Today, a full screen: ${nameOf(M)}, then their usual, the answers from onboarding (${P.onboard === "full" ? "the full survey's" : "the short one's"}, each reopening its step), reminders${P.checkin ? " with the check-in day" : ""}, logging, display, connected apps, membership, their data, and help. The first name is the one from sign-up unless onboarding changed it. ${u ? `Every usual figure is read from the model, the same weeks Insights uses (${usualSpan()}).` : `Day ${L.learnDay(M)} of ${L.LEARN_DAYS}: Your usual says what arrives on day ${L.LEARN_DAYS}, and that the FloraScore range follows ${rangeWhen()}, instead of a number.`}`,
        ba: [["Demo Settings, Requires assessment every visit to Insights", "The demo's own switches stay on the page. Profile keeps the few a person might set for themselves: how a BM is logged, the meal sheet, larger text and the theme"], ["Update health survey", "Each answer is a row that reopens its own step"], ["A red Delete Profile", "Delete my logs (the answers stay) and Delete my account (everything goes), each asked first, never red"], ["Research consent buried in the survey", "Its own switch under Your data, off until turned on"], ["Name and email first", `${u ? "Your usual, set from the logs, near the top" : "What day 14 brings, near the top"}; the email under Help, Email and sign-in`]],
        open: [P.checkin ? "Should a person turn the weekly check-in off here, as well as change its day?" : "With the check-in off, Reminders has the BM reminder only. Enough?", "Logging repeats two of the page's decisions, Quick tiles or Full form and the meal sheet, as a person's own setting. Should a person pick these themselves, or should Florin pick one for everyone?", "Connected apps: which ones for this version, Apple Health first?", "Export: a file of logs for the person, the clinician report for a visit, or both?", "Larger text and simpler screens turns on the Easy version, here and on onboarding's first and last steps. Is set-up enough, or should Florin offer it again after a few days?", "Delete my account: membership is billed through the app store, so cancelling it may need its own step. Should the sheet say so for a member?"],
        res: ["Oura Advisor's memories can be seen and deleted by the person: the same idea as Your data.", "Oura explains baselines in plain terms; Your usual says where each one comes from."]
      };
    },
    "profile-day1": (M0, P) => {
      const api = EXT.api, M = api ? pfModel(api) : M0, prev = !!api && M !== api.M();
      return {
        t: "Profile on day 1",
      lede: `${prev ? `A preview of ${nameOf(M)}'s Profile just after onboarding, drawn against a day-1 model, so the logs on the phone stay as they are (Logs on the left, Just joined, gives the same Profile live): ` : "Just after onboarding: "}day ${L.learnDay(M)} of ${L.LEARN_DAYS}, ${logCount(M) ? plural(logCount(M), "entry", "entries") + " logged so far" : "nothing logged yet"}. Your usual lists what Florin sets on day ${L.LEARN_DAYS} instead of numbers, with the FloraScore range after it, ${rangeWhen()}; About you shows what onboarding asked (${P.onboard === "full" ? "the full survey" : "the short flow"}), and Delete has nothing to delete until there are logs.`,
      ba: [["A profile that's the same on day 1 as on day 100", "The learning state says what's coming, and when"]],
      open: [`Day 1 has no usual, so the answers carry Profile. Is that the right order until day ${L.LEARN_DAYS}?`],
      res: ["Oura shows a learning period before baselines; the Profile does the same for the usual."]
      };
    }
  });
  EXT.decisions.onboard = (M, P) => ({
    t: "Onboarding: short, or the full survey",
    lede: `What a new person is asked before Today. The app that ships asks 14 questions (Will, Oct 27). Short asks ${FLOWS.short.length} steps, only what changes the app on day 1; the full survey keeps the shipping sections, refreshed, in ${FLOWS.full.length}. Both finish on Today, day 1 of ${L.LEARN_DAYS}, and every answer shows in Profile. Switching here shows the flow on the phone (one already open moves to the other flow, answers kept); Screens, Onboarding and profile has both too.`,
    opts: [
      ["short", `Under two minutes: ${shortSteps(P)}.`],
      ["full", `About 3 minutes: ${fullSteps}. Every step skippable.`]
    ],
    rec: "Short, then ask the rest in context: the eating pattern when the first meal is logged, foods to watch with the first food check, medicines and conditions with the first clinician report, and research consent in Profile. Most of the shipping survey's answers change nothing a person sees on day 1.",
    ba: WRONG,
    open: ["Which questions earn a place on day 1? The short flow's are the proposal.", "Research consent: a step at all, or only the switch in Profile?", "Age range and sex: asked at all, or only when making a clinician report?"],
    res: ["The shipping onboarding: 14 questions, about 1 to 3 minutes (Will, Oct 27).", "The shipping survey notes: 60% of men want setup under 10 minutes; 47% of women want cycle context."]
  });
})();
