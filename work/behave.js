/* Behaviour checks for the refresh prototype: the interactions the Oct 14 workshop fixed, and the Oct 27 page: the
   decisions as toggles, one phone, the extension hooks and the Just joined state.
   NODE_PATH=$(npm root -g) node work/behave.js     (exits 1 on any failure) */
const { chromium } = require("playwright");
const path = require("path");
const PAGE = "file://" + path.resolve(__dirname, "../prototype/_local.html");
const fails = [];
const ok = (cond, what) => { console.log(`${cond ? "  ✓" : "  ✗"} ${what}`); if (!cond) fails.push(what); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(PAGE);
  await p.waitForSelector(".ap-rx");
  const ph = ".rx-stage .ap-rx";
  const wait = (ms = 450) => p.waitForTimeout(ms);
  /* the page's controls exist once (on a phone they sit in the Toggles sheet), so a click by selector reaches them */
  const open = async (id) => { await p.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await wait(); };

  /* 1. a half-filled BM survives a close */
  await open("today");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  ok(await p.$eval(`${ph} .ap-psh-h .ap-lg-x`, () => true).catch(() => false), "plus menu has a close button");
  /* a tile on the plus card logs the BM in one tap; the toast offers Add details and Undo */
  const before = await p.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-layer [data-act='edit']").length);
  await p.click(`${ph} .ap-pbm [data-act="quick-bm"]:nth-child(5)`); await wait();
  ok(/BM saved/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)) && await p.$eval(`${ph} .ap-tst`, (e) => /Add details/.test(e.textContent) && /Undo/.test(e.textContent)), "a plus tile logs the BM in one tap, with Add details and Undo");
  ok(await p.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-layer [data-act='edit']").length) === before + 1, "and it shows on Today");
  await p.click(`${ph} .ap-tst [data-act="edit"]`); await wait();
  ok(await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest(".ap-xt")), "Add details opens the BM with focus on its details");
  await p.keyboard.press("Escape"); await wait();
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} .ap-pbm-h`); await wait();
  await p.click(`${ph} .ap-fm-b[data-form="6"]`); await wait(200);
  ok(await p.$eval(`${ph} .ap-fm-b[data-form="6"]`, (e) => e.getAttribute("aria-checked") === "true"), "in Log a BM a tile is a radio, checked when picked");
  ok(await p.$eval(`${ph} .ap-stack`, (e) => e.inert) && await p.$eval(`${ph} .ap-tb`, (e) => e.inert), "the screen and tab bar are inert under a form");
  await p.fill(`${ph} [data-in="note"]`, "After the late dinner");
  await p.keyboard.press("Escape"); await wait();
  ok(/Not saved yet/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "closing a half-filled BM says it's kept");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} .ap-pbm-h`); await wait();
  ok(await p.$eval(`${ph} [data-in="note"]`, (e) => e.value) === "After the late dinner", "reopening brings the note back");
  ok(await p.$eval(`${ph} .ap-fm-b[data-form="6"]`, (e) => e.getAttribute("aria-checked") === "true"), "and the picked tile");
  await p.click(`${ph} [data-act="save-bm"]`); await wait(600);
  const focusedRow = await p.evaluate(() => { const a = document.activeElement; return a && a.dataset ? a.dataset.act : null; });
  ok(focusedRow === "edit", "after Save, focus lands on the new entry");
  ok(/BM saved/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "BM saved toast");

  /* 2. a typed custom symptom counts on Save */
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} .ap-psh [data-act="open-sym"]`); await wait();
  await p.click(`${ph} [data-act="sym-other"]`); await wait(200);
  await p.fill(`${ph} [data-in="newsym"]`, "headache");
  ok(await p.$eval(`${ph} [data-act="save-sym"]`, (e) => e.getAttribute("aria-disabled") !== "true"), "Save turns on while a name is typed");
  await p.click(`${ph} [data-act="save-sym"]`); await wait(600);
  ok(/Headache/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "the typed symptom is saved");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} .ap-psh [data-act="open-sym"]`); await wait();
  ok(await p.$$eval(`${ph} [data-act="sym"]`, (bs) => bs.some((b) => b.dataset.v === "Headache")), "and it's one tap away next time");
  await p.keyboard.press("Escape"); await wait();

  /* 3. an alarm word in a note opens the primary care note */
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} .ap-psh [data-act="open-sym"]`); await wait();
  await p.click(`${ph} [data-act="sym"][data-v="Nausea"]`); await wait(200);
  await p.fill(`${ph} [data-in="note"]`, "Threw up twice");
  await p.click(`${ph} [data-act="save-sym"]`); await wait(600);
  ok(/Vomiting/.test(await p.$eval(`${ph} .ap-o:last-child`, (e) => e.textContent).catch(() => "")), "vomiting typed in a note routes to primary care");
  await p.click(`${ph} .ap-o:last-child [data-act="close"]:not(.ap-o-scrim)`); await wait();

  /* 4. meal (the one-meal sheet): the time follows the meal, foods are counted */
  const pageSet = (k, v) => p.evaluate(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); b && b.click(); }, [k, v]);
  await pageSet("mealUI", "detailed"); await wait(300);
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} .ap-psh [data-act="open-meal"]`); await wait();
  await p.click(`${ph} [data-act="meal"][data-v="breakfast"]`); await wait(200);
  const tv = await p.$eval(`${ph} [data-in="time"]`, (e) => e.value);
  ok(tv < "11:00", `picking Breakfast at 7:40 PM moves the time (${tv})`);
  await p.fill(`${ph} [data-in="text"]`, "Lentil soup and a latte");
  await wait(400);
  const counted = await p.$eval(`${ph} .ap-ml-count`, (e) => e.textContent);
  ok(/Lentils/.test(counted) && /Coffee/.test(counted), "lentil soup and a latte count as lentils and coffee");
  await p.click(`${ph} [data-act="save-meal"]`); await wait(500);

  /* 5. check-in: auto-advance puts focus on the next question, not on an answer */
  await open("ck");
  await p.click(`${ph} [data-act="ck-ans"][data-v="2"]`); await wait(700);
  const af = await p.evaluate(() => document.activeElement && document.activeElement.tagName);
  ok(af === "H3", `after an answer, focus is on the next question (${af})`);
  ok(/2 of 4/.test(await p.$eval(`${ph} .ap-ck-q .ap-k`, (e) => e.textContent)), "and it's question 2");

  /* 6. the chip and the band agree for every answer, for every persona */
  const agree = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, bad = [];
    for (const who of ["sarah", "marcus", "alex"]) {
      const M = L.build(who, "est"), b = L.baseline(M);
      L.CHECKIN.forEach((q, i) => [0, 1, 2, 3].forEach((v) => { const c = L.compare(b, i, v), inside = v >= b[i].lo && v <= b[i].hi; if ((c.k === "same") !== inside) bad.push(`${who} ${q.k} ${v}`); }));
    }
    return bad;
  });
  ok(!agree.length, `check-in chip and band agree everywhere${agree.length ? ": " + agree.join(", ") : ""}`);

  /* 7. a symptom without a strength never reads as mild */
  const mild = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI;
    const M = L.build("sarah", "new");
    L.add(M, { kind: "sym", d: L.TODAY, t: 19, items: [{ name: "Belly pain", s: 0 }], last: null, note: "" });
    const html = RU.weekCard(M, "A");
    return /strength not said/.test(html) && !/strength not given/.test(html);
  });
  ok(mild, "an unrated symptom shows as strength not said");

  /* 8. a No BM day is never drawn as a gap */
  const nobm = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI;
    const M = L.build("sarah", "new");
    L.add(M, { kind: "nobm", d: L.TODAY, t: 19 });
    /* build-core: the week card is one row of day marks; today's is a logged (Ink 3) mark that says No BM */
    const box = document.createElement("div"); box.innerHTML = RU.weekCard(M, "A");
    const t = box.querySelector(`.ap-day[data-day="${L.TODAY}"]`);
    return !!t && t.classList.contains("ap-day--quiet") && /logged, No BM/.test(t.textContent) && !/nothing logged/.test(t.textContent) && /No BM (logged )?today/.test(box.textContent);
  });
  ok(nobm, "a No BM day reads as logged, not as a gap");

  /* 9. a BM logged in B keeps its word, and A and C never turn it into one step */
  const bword = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, e = { form: null, word: 3 };
    return [L.formName(e, "B"), L.formName(e, "A"), L.formName(e, "C")];
  });
  ok(bword[0] === "Loose" && /Type 5 or 6/.test(bword[1]) && /or loose/.test(bword[2]), `a B log reads honestly in every option (${bword.join(" / ")})`);

  /* 10. B through the full form: saves with a toast, and reads as its own word in C */
  await p.evaluate(() => document.querySelector('[data-rx="form"][data-v="B"]').click());
  await wait();
  await open("bm");
  await p.click(`${ph} .ap-fm-b[data-word="1"]`); await wait(200);
  await p.click(`${ph} [data-act="save-bm"]`); await wait(500);
  ok(/BM saved\. Firm/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "saving a B log through the form shows its toast");
  await p.evaluate(() => document.querySelector('[data-rx="form"][data-v="C"]').click());
  await wait();
  ok(await p.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .ap-tl-m b")].some((b) => b.textContent === "BM · Firm")), "and reads as Firm in C, not another word");

  /* 11. reset with a half-filled form leaves nothing behind */
  await open("bm");
  await p.fill(`${ph} [data-in="note"]`, "left over");
  await p.evaluate(() => document.querySelector('[data-rx="reset"]').click()); await wait();
  await open("bm");
  ok(await p.$eval(`${ph} [data-in="note"]`, (e) => e.value) === "", "reset doesn't carry a draft into the new demo");
  await p.keyboard.press("Escape"); await wait();

  /* 12. stacked sheets: Escape closes the top one and focus stays in the one under it, so Escape works again */
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} [data-act="plus-earlier"]`); await wait();
  await p.keyboard.press("Escape"); await wait(500);
  const inPlus = await p.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest(".ap-o") && a !== document.body; });
  ok(inPlus, "after closing a stacked sheet, focus is in the sheet under it");
  await p.keyboard.press("Escape"); await wait(500);
  ok(await p.evaluate(() => !document.querySelector(".rx-stage .ap-rx .ap-o:not(.is-out)")), "and Escape closes that one too");

  /* 13. a double tap on plus doesn't press what opens under the finger */
  const box = await p.$eval(`${ph} .ap-tb-plus`, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(box.x, box.y); await p.waitForTimeout(200); await p.mouse.click(box.x, box.y); await wait(500);
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")]; return o.length === 1 && !!o[0].querySelector(".ap-pbm"); }), "a double tap on plus leaves just the plus menu open");
  await p.keyboard.press("Escape"); await wait();

  /* 14. a past day emptied by a delete is a gap again */
  const gapBack = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, M = L.build("sarah", "est");
    const e = { kind: "meal", d: 87, t: 12.5, meal: "lunch", text: "Lentil soup", foods: ["lentils"], note: "" };
    L.add(M, e); L.remove(M, e.id);
    return L.day(M, 87).logged === false;
  });
  ok(gapBack, "a past day emptied by a delete goes back to a gap");

  /* 14b. the quick meal log: one box for the day, said or typed (Will, Oct 14) */
  await pageSet("mealUI", "quick"); await wait(300);
  await open("today");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  ok(await p.$eval(`${ph} .ap-psh [data-act="open-meal"]`, (e) => /What you ate/.test(e.textContent)), "plus offers What you ate, said or typed");
  await p.click(`${ph} .ap-psh [data-act="open-meal"]`); await wait(600);
  await p.click(`${ph} [data-act="mq-mic"]`, { force: true });
  await p.waitForFunction(() => { const v = document.querySelector(".rx-stage .ap-rx .ap-mq-voice"); return v && v.classList.contains("is-done"); }, null, { timeout: 15000 });
  const said = await p.$eval(`${ph} .ap-mq-text`, (e) => e.value);
  /* final-fix: what's played is the day's meals not logged yet, so saying the day never logs a food twice */
  const sayWant = await p.evaluate(() => { const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M(), x = L.day(M, L.TODAY); return { want: L.mealSay(M, L.TODAY), logged: x.entries.filter((e) => e.kind === "meal").map((e) => e.meal) }; });
  ok(said === sayWant.want && /for dinner/.test(said) && !sayWant.logged.some((k) => k !== "day" && new RegExp(`for ${k}`).test(said)), `the mic fills the box with the day's meals not logged yet, word by word (${said.slice(0, 60)}; logged: ${sayWant.logged.join(", ")})`);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains("ap-mq-text")), "when the mic stops, focus is in the box to fix anything");
  await p.click(`${ph} [data-act="save-meal"]`); await wait(600);
  ok(/Saved what you ate today\. (1 food|\d+ foods) counted/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "saving says how many foods were counted");
  const quickData = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, out = {};
    const none = L.build("sarah", "est", { meals: "none" }), rough = L.build("sarah", "est", { meals: "rough" });
    out.none = /No meals logged/.test(RU.insights(none, { form: "C", uid: 1 }, { range: 30, k: null, y: 0 }));
    out.rough = /Not enough ordinary days yet/.test(RU.insights(rough, { form: "C", uid: 1 }, { range: 30, k: null, y: 0 })) && /food check/.test(RU.insights(rough, { form: "C", uid: 1 }, { range: 30, k: null, y: 0 })) && L.patterns(rough, "C").found.length === 0;
    out.score = L.score(none, L.TODAY, "C").value === L.score(L.build("sarah", "est"), L.TODAY, "C").value;
    out.nag = !/isn't logged yet/.test(RU.today(L.build("sarah", "est"), { form: "C", uid: 1, mealUI: "quick" }));
    return out;
  });
  ok(quickData.none && quickData.rough, "with no meals, or meals only on rough days, Insights holds patterns back and says why");
  ok(quickData.score, "FloraScore doesn't depend on meals");
  ok(quickData.nag, "Today never asks for a missing meal");

  /* 15. the BM extras show under the form, no fold (Will, Oct 14) */
  await open("bm");
  ok(await p.evaluate(() => { const x = document.querySelector(".rx-stage .ap-rx .ap-xt"); return !!x && !document.querySelector(".rx-stage .ap-rx .ap-det") && x.querySelectorAll('[data-act="how"]').length === 4 && x.querySelectorAll('[data-act="dur"]').length === 3 && x.querySelectorAll('[data-act="flag"]').length === 3; }), "Log a BM shows every extra under the form, with no Add details fold");
  await p.keyboard.press("Escape"); await wait();

  /* 15b. FloraScore: on Today from the logs, left out for a day not logged, and learning until day 14 */
  const fs = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, out = {};
    let M = L.build("sarah", "est");
    const s = L.score(M, L.TODAY, "C"), su = L.scoreUsual(M, "C");
    /* build-core: the number with no count-up (no data-count), over the bar of its usual range */
    const hb = document.createElement("div"); hb.innerHTML = RU.scoreHero(M, { form: "C", uid: 1 });
    out.hero = (hb.querySelector(".ap-hero-n") || {}).textContent === String(s.value) && !hb.querySelector("[data-count]") && new RegExp(`Your usual ${su[0]} to ${su[1]}`).test(hb.textContent) && su[0] < su[1];
    /* a day with nothing logged changes nothing in the blend: it's skipped, not scored as zero */
    const before = L.score(M, 88, "C").value;
    L.day(M, 87).logged = false;
    out.gap = L.score(M, 88, "C").value != null && Math.abs(L.score(M, 88, "C").value - before) < 15 && L.dayParts(M, L.day(M, 87), "C") === null;
    /* two days missing out of three: no score, said in words */
    M = L.build("sarah", "est"); L.day(M, 89).logged = false; L.day(M, 88).logged = false;
    out.none = L.score(M, 89, "C").value === null;
    M = L.build("sarah", "new");
    out.learn = L.score(M, L.TODAY, "C") === null && /starts on day 14/.test(RU.scoreHero(M, { form: "C", uid: 1 }));
    return out;
  });
  ok(fs.hero, "Today's hero shows the FloraScore the logs give, with a usual range");
  ok(fs.gap && fs.none, "a day not logged is left out of FloraScore, and two of three missing means no score");
  ok(fs.learn, "a new person sees FloraScore start on day 14, not a number");
  await open("today");
  await p.click(`${ph} button.ap-hero`); await wait(500);
  ok(await p.evaluate(() => /FloraScore/.test((document.querySelector(".rx-stage .ap-rx .ap-nav-t") || {}).textContent || "") && document.activeElement && document.activeElement.classList.contains("ap-nav-t")), "the hero opens the FloraScore detail, focus on its title");

  /* 16. Insights reads in all three options: six cards, and the form mix in each option's own terms */
  const setForm = (v) => p.evaluate((v) => document.querySelector(`[data-rx="form"][data-v="${v}"]`).click(), v);
  for (const [m, n, lbl] of [["A", 7, "1"], ["B", 5, "Hard"], ["C", 7, "Pellets"]]) {
    await setForm(m); await wait();
    await open("insights");
    const cards = await p.$$eval(`${ph} .ap-ins .ap-ic`, (e) => e.length);
    await open("i-form");
    const axis = await p.$$eval(`${ph} .ap-idt .ap-fig:first-of-type .dv-ax`, (e) => e.map((t) => t.textContent));
    ok(cards === 7 && axis.length === n && axis[0] === lbl, `Insights in ${m}: seven cards, the mix as ${n} bins starting ${lbl} (${axis.slice(0, 3).join(", ")})`);
  }

  /* 17. a word logged in B that straddles the usual reads as could be either, never as a shift */
  const straddle = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = L.build("alex", "est");
    const u = M.usual;
    const w = L.WORDS.find((x) => x.types.length > 1 && x.types.some((k) => k >= u.fLo && k <= u.fHi) && x.types.some((k) => k < u.fLo || k > u.fHi));
    if (!w) return "no straddling word for this usual";
    L.add(M, { kind: "bm", d: L.TODAY, t: 18, form: null, word: w.k, how: {}, dur: null, flags: {}, note: "" });
    const f = L.facts(M, L.day(M, L.TODAY), "A");
    const html = RU.idetail(M, { form: "A", uid: 99 }, { k: "form", range: 7, y: 0 });
    return f.state === "unsure" && /Could be either/.test(html) && /is-maybe/.test(html) && !/Outside your usual/.test(html.split("ap-idt-now")[1] || "") ? "ok" : `state ${f.state}`;
  });
  ok(straddle === "ok", `a B word that straddles the usual is could be either in A, on neither side (${straddle})`);

  /* 18. a symptom logged without a strength is never called mild on Insights */
  const unrated = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = L.build("sarah", "est");
    L.add(M, { kind: "sym", d: L.TODAY, t: 18, items: [{ name: "Nausea", s: 0 }], last: null, note: "" });
    const html = RU.idetail(M, { form: "C", uid: 98 }, { k: "sym", range: 7, y: 0 });
    /* build-core: strength is in the table twin (Day, Symptom, Strength) and the squares' tips, never the mark */
    return /<td>Nausea<\/td><td>Strength not said<\/td>/.test(html) && /nausea, strength not said/.test(html) && !/<td>Nausea<\/td><td>Mild/.test(html) && !/dv-sq s\d/.test(html);
  });
  ok(unrated, "a symptom without a strength reads as strength not said on Insights");

  /* 19. focus follows Insights: into a detail lands on its title, back lands on the card you left */
  await open("insights");
  await p.focus(`${ph} .ap-ic-h[data-k="often"]`); await p.keyboard.press("Enter"); await wait(500);
  ok(await p.evaluate(() => !!document.activeElement && document.activeElement.classList.contains("ap-nav-t") && /How often/.test(document.activeElement.textContent)), "opening a card's detail puts focus on its title");
  await p.click(`${ph} .ap-back`); await wait(500);
  ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.matches('.ap-ic-h[data-k="often"]'); }), "back puts focus on the card you opened");
  await p.click(`${ph} [data-act="irange"][data-v="7"]`); await wait(400);
  ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.matches('[data-act="irange"][data-v="7"]') && a.getAttribute("aria-pressed") === "true"; }), "a range tab stays focused and pressed after the cards redraw");

  /* 20. the week link on Today opens Insights on 7 days; the saved check-in opens its trend */
  await open("today");
  await p.click(`${ph} .ap-wk-go`); await wait(500);
  ok(await p.evaluate(() => !!document.querySelector('.rx-stage .ap-rx [data-act="irange"][data-v="7"][aria-pressed="true"]') && document.activeElement && document.activeElement.classList.contains("ap-h1")), "See the week on Insights opens Insights on 7 days, focus on its title");
  await open("ckdone");
  await p.click(`${ph} .ap-ck-fin [data-act="idetail"]`); await wait(500);
  ok(await p.evaluate(() => /Weekly check-in/.test((document.querySelector(".rx-stage .ap-rx .ap-nav-t") || {}).textContent || "") && !document.querySelector(".rx-stage .ap-rx .ap-o:not(.is-out)")), "See the trend on Insights closes the check-in and opens its detail");

  /* 21. patterns: every established demo person has one food the logs find; a new person has none */
  const pats = await p.evaluate(() => {
    const L = window.FLORIN_LOGS;
    const est = ["sarah", "marcus", "alex"].map((id) => ["A", "B", "C"].every((m) => L.patterns(L.build(id, "est"), m).found.some((x) => x.food)));
    return est.every(Boolean) && !L.patterns(L.build("sarah", "new"), "C").found.length;
  });
  ok(pats, "each demo person has a food pattern in A, B and C; a new person has none");

  /* 22. closing the check-in opened from Insights hands focus back to the button that opened it */
  await open("insights");
  await p.focus(`${ph} .ap-ins [data-act="ck-start"]`); await p.keyboard.press("Enter"); await wait(600);
  await p.keyboard.press("Escape"); await wait(700);
  ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.matches('[data-act="ck-start"]'); }), "Escape from a check-in opened on Insights puts focus back on Check in");

  /* 23. back from a detail reached by Next: the focused card is on screen, clear of the tab bar */
  await open("insights");
  await p.focus(`${ph} .ap-ic-h[data-k="timing"]`); await p.keyboard.press("Enter"); await wait(450);
  for (let i = 0; i < 5; i++) { await p.click(`${ph} .ap-idt-next`); await wait(400); }
  await p.click(`${ph} .ap-back`); await wait(500);
  ok(await p.evaluate(() => {
    const a = document.activeElement, ph = document.querySelector(".rx-stage .ap-rx"), lay = ph.querySelector(".ap-layer"), tb = ph.querySelector(".ap-tb");
    if (!a || !a.matches('.ap-ic-h[data-k="pat"]')) return false;
    const r = a.getBoundingClientRect(), lr = lay.getBoundingClientRect(), tr = tb.getBoundingClientRect();
    return r.top >= lr.top && r.bottom <= tr.top;
  }), "back after Next lands on the Possible patterns card, scrolled into view");

  /* 24. keyboard focus never stops under the tab bar */
  const hidden = await p.evaluate(() => {
    const ph = document.querySelector(".rx-stage .ap-rx"), lay = ph.querySelector(".ap-layer"), tb = ph.querySelector(".ap-tb");
    lay.scrollTop = 0;
    return [...lay.querySelectorAll(".ap-ask-b, .ap-ic-h")].filter((el) => { el.focus(); const r = el.getBoundingClientRect(); return r.bottom > tb.getBoundingClientRect().top + 1; }).length;
  });
  ok(hidden === 0, `focusing each Insights card and Ask button scrolls it clear of the tab bar (${hidden} hidden)`);

  /* 25. the check-in trend rings the latest answered week while this week's is still due */
  await open("i-ck");
  ok(await p.$$eval(`${ph} .ap-ckt-dot.is-now`, (e) => e.length) === 4 && await p.$$eval(`${ph} .ap-ckt-ring`, (e) => e.length) === 4, "the check-in detail rings the latest week on each of its four trends");

  /* 26. data and copy the review caught: one food window, honest counts and words */
  const copy = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, out = {};
    /* a day with only a symptom logged: no BM said, so neither within nor a zero */
    let M = L.build("sarah", "est");
    L.day(M, 87).logged = true; L.add(M, { kind: "sym", d: 87, t: 12, items: [{ name: "Cramping", s: 2 }], last: 1, note: "" });
    /* build-core: nothing drawn for it on How often's count line, and the summary says it isn't counted */
    const ins7 = RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 });
    out.nocount = L.facts(M, L.day(M, 87), "C").state === "nocount" && !/Oct 8 · (No BM|\d BM)/.test(ins7) && /Thursday had nothing about BMs, so it isn(&#39;|&#x27;|')t counted/.test(ins7);
    /* the top symptom logged without a strength: no strength word for it */
    M = L.build("sarah", "est");
    for (let d = 84; d <= 89; d++) { const x = L.day(M, d); if (!x.logged) continue; x.entries = x.entries.filter((e) => e.kind !== "sym"); L.add(M, { kind: "sym", d, t: 12, items: [{ name: "Bloating", s: 0 }], last: null, note: "" }); }
    L.add(M, { kind: "sym", d: 85, t: 13, items: [{ name: "Gas", s: 1 }], last: 1, note: "" });
    out.unrated = !/usually mild/.test(RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 }));
    /* every BM a word that covers two steps: no "mostly Type 1" */
    M = L.build("sarah", "new");
    M.days.forEach((x) => x.entries.forEach((e) => { if (e.kind === "bm") { e.form = null; e.word = 3; } }));
    const ins = RU.insights(M, { form: "A", uid: 1 }, { range: 7, k: null, y: 0 });
    out.top = !/mostly Type 1|mostly Pellets/.test(ins) && /(all|mostly) Loose/.test(ins);
    /* before a usual, a No BM day is a plain ring, not Gold */
    M = L.build("sarah", "new");
    L.add(M, { kind: "nobm", d: 87, t: 21 });
    /* build-core: a dot on the No BM line, never Gold; fix-viz: before day 14 every reading is Ink 3 (is-learn), as the
       week card draws those days */
    const insN = RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 });
    out.plain = /<circle class="dv-dot is-learn" [^>]*><title>Oct 8 · No BM/.test(insN) && !/dv-dot is-shift/.test(insN);
    /* 90 days: the weekly cells start with the span, not on Jul 13 */
    M = L.build("sarah", "est");
    const sym = RU.idetail(M, { form: "C", uid: 1 }, { range: 90, k: "sym", y: 0 });
    out.wk = !/Week of Jul 13/.test(sym);
    /* the clinician line is the app's alarm list, primary care first */
    out.care = /waking at night to go: start with primary care soon/.test(sym);
    return out;
  });
  ok(copy.nocount, "a day with only a symptom logged is a gap on How often and counted on neither side");
  ok(copy.unrated, "the symptoms card gives no strength word when the top symptom was logged without one");
  ok(copy.top, "the most common form counts every BM, words logged in B included");
  ok(copy.plain, "before a usual exists, No BM is an Ink 3 dot on the No BM line, as every reading before day 14 is, not a Gold shift");
  ok(copy.wk && copy.care, "90-day weekly cells start with the span, and the Symptoms clinician line matches the app's alarm list");
  await open("today");
  ok(await p.evaluate(() => !/in the last 30 days|in 30 days/.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent)), "Today counts foods over the same 90 days Insights checks");

  /* a sweep of the Screens list sets the decisions its screens belong to (Home: Day first sets Home, Easy version:
     Today sets Version, the onboarding screens set Onboarding), and they stay, as they do for anyone using the page.
     So a sweep notes the decisions first and puts them back after, for the checks that follow */
  const DKEYS = ["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard"];
  const noteDecisions = () => p.evaluate((ks) => Object.fromEntries(ks.map((k) => [k, (document.querySelector(`[data-rx="${k}"][aria-pressed="true"]`) || {}).dataset.v])), DKEYS);
  const putDecisions = async (was) => { await p.evaluate((was) => Object.entries(was).forEach(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (b && b.getAttribute("aria-pressed") !== "true") b.click(); }), was); await wait(300); };

  /* 27. nothing on screen or in the notes reads undefined or NaN, for any person or screen */
  const before27 = await noteDecisions();
  const ids = await p.$$eval('[data-rx="screen"]:not([disabled])', (b) => b.map((x) => x.dataset.v));
  const bad = [];
  for (const who of ["sarah", "marcus", "alex"]) {
    await p.evaluate((v) => { const b = document.querySelector(`[data-rx="persona"][data-v="${v}"]`); b && b.click(); }, who); await wait(300);
    for (const id of ids) { await open(id); const t = await p.evaluate(() => document.body.innerText); if (/\bundefined\b|\bNaN\b/.test(t)) bad.push(`${who}/${id}`); }
  }
  ok(!bad.length, `no screen or note reads undefined or NaN (${bad.slice(0, 4).join(", ") || "none"})`);
  ok(await p.evaluate(() => document.querySelector('[data-rx="easy"][aria-pressed="true"]').dataset.v === "true" && document.querySelector(".rx-stage .ap-rx").classList.contains("ap--easy")), "the sweep ends on the Easy screens, and Easy is on, on the phone and on the left");
  await putDecisions(before27);
  ok(JSON.stringify(await noteDecisions()) === JSON.stringify(before27), "and the decisions go back to what they were before the sweep");

  /* 28. skipping the check-in hands focus to Undo; finishing it lands on the card that replaced Start */
  await open("today");
  await p.focus(`${ph} [data-act="ck-skip"]`); await p.keyboard.press("Enter"); await wait(500);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('.ap-tst [data-act="undo"]')), "Skip this week puts focus on Undo");
  await p.keyboard.press("Enter"); await wait(500);
  await open("today");
  await p.focus(`${ph} .ap-ckc [data-act="ck-start"]`); await p.keyboard.press("Enter"); await wait(600);
  for (let i = 0; i < 4; i++) { await p.click(`${ph} .ap-ck-opt[data-v="1"]`); await wait(650); if (await p.$(`${ph} .ap-ck-next`)) { await p.click(`${ph} .ap-ck-next`); await wait(400); } }
  await p.click(`${ph} [data-act="ck-finish"]`); await wait(600);
  await p.click(`${ph} .ap-ck-fin [data-act="close"]`); await wait(700);
  ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.matches('[data-act="ck-result"]'); }), "Done after a finished check-in lands on the saved check-in card");

  /* 29. one name per step for "most common", and each symptom counted once a day, on Today and Insights alike */
  const agree2 = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, out = {};
    let M = L.build("sarah", "est");
    /* a B word on one step (Formed is step 4) joins the BMs logged as step 4 */
    out.key = L.formKey({ form: null, word: 2 }, "A") === L.formKey({ form: 4 }, "A") && L.formKey({ form: null, word: 3 }, "A") !== L.formKey({ form: 5 }, "A");
    /* an unrated bloating log on a day that also has a mild one: no strength word for bloating */
    M = L.build("sarah", "est");
    L.add(M, { kind: "sym", d: L.TODAY, t: 18.5, items: [{ name: "Bloating", s: 0 }], last: null, note: "" });
    out.unrated = !/bloating, usually mild/i.test(RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 }).replace(/<[^>]+>/g, ""));
    return out;
  });
  ok(agree2.key, "a B word on one step counts under that step for most common");
  ok(agree2.unrated, "a symptom with any log lacking a strength gets no strength word");

  /* 29b. the Free plan: logging and 7 days stay open; details, longer ranges, patterns, Ask and the report open the paywall */
  await pageSet("plan", "free"); await wait(400);
  await open("insights");
  await p.click(`${ph} .ap-ic-h[data-k="timing"]`); await wait(500);
  ok(await p.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-pay") && /every card/.test(document.querySelector(".rx-stage .ap-rx .ap-pay h2").textContent) && document.activeElement === document.querySelector(".rx-stage .ap-rx .ap-pay h2")), "on Free, a card's detail opens the paywall, focus on its title");
  await p.keyboard.press("Escape"); await wait(500);
  await p.click(`${ph} [data-act="pay"][data-pay="range"]`); await wait(500);
  ok(await p.evaluate(() => /30 and 90 days/.test((document.querySelector(".rx-stage .ap-rx .ap-pay h2") || {}).textContent || "")), "on Free, 30 and 90 days open the paywall");
  await p.keyboard.press("Escape"); await wait(500);
  ok(await p.evaluate(() => !document.querySelector('.rx-stage .ap-rx .ap-ins [data-act="idetail"]') && !document.querySelector('.rx-stage .ap-rx .ap-ins [data-act="ask-about"]')), "on Free, nothing on Insights opens a detail or Ask directly");
  await open("today");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  ok(await p.evaluate(() => !!document.querySelector('.rx-stage .ap-rx .ap-pbm [data-act="quick-bm"]') && !!document.querySelector('.rx-stage .ap-rx [data-act="open-sym"]')), "on Free, logging is all there");
  await p.keyboard.press("Escape"); await wait(500);
  await open("ask");
  ok(await p.evaluate(() => /Ask about your own numbers/.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent) && !document.querySelector(".rx-stage .ap-rx .ap-askbar")), "on Free, Ask Florin explains itself and offers membership, with no made-up answer");
  await open("pay");
  await p.click(`${ph} [data-act="pay-start"]`); await wait(500);
  ok(await p.evaluate(() => document.querySelector('[data-rx="plan"][data-v="member"]').getAttribute("aria-pressed") === "true" && !document.querySelector(".rx-stage .ap-rx .ap-pay")), "Start membership turns the demo to Member, the switch follows");

  /* 30. on a desktop page, Back in Insights scrolls the phone's screen, never the page around it */
  const d = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await d.goto(PAGE); await d.waitForSelector(".rx-stage .ap-rx");
  await d.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.rx-side [data-rx="screen"][data-v="insights"]').click(); }); await d.waitForTimeout(500);
  await d.evaluate(() => window.scrollTo(0, 0));
  await d.click(".rx-stage .ap-rx .ap-ic-h[data-k='timing']"); await d.waitForTimeout(450);
  await d.click(".rx-stage .ap-rx .ap-idt-next"); await d.waitForTimeout(400);
  await d.click(".rx-stage .ap-rx .ap-idt-next"); await d.waitForTimeout(400);
  const y0 = await d.evaluate(() => window.scrollY);
  await d.click(".rx-stage .ap-rx .ap-back"); await d.waitForTimeout(500);
  ok(await d.evaluate((y0) => window.scrollY === y0, y0), "Back from a detail on a desktop page leaves the page where it was");
  await d.close();

  /* 31. the alarm-word check: says no to "no blood", leaves out blood glucose, hears waking at night, names every sign */
  const alarm = await p.evaluate(() => {
    const L = window.FLORIN_LOGS;
    return { neg: [L.alarmIn("No blood, all good"), L.alarmIn("blood glucose 160"), L.alarmIn("no fever"), L.alarmIn("felt fine, no vomiting, no blood")], wake: L.alarmIn("Woke up at 3am to go"), two: L.alarmIn("Some blood and a fever") };
  });
  ok(alarm.neg.every((x) => x === null), `notes that say no to a sign, or mean blood glucose, open nothing (${alarm.neg.join(", ")})`);
  ok(alarm.wake === "Waking at night to go" && alarm.two === "Blood and a fever", `waking at night is heard, and two signs are both named (${alarm.wake}; ${alarm.two})`);
  /* 31b. the wider net, in the core so a log's note catches what Ask catches; nothing ordinary trips it */
  const wide = await p.evaluate(() => {
    const L = window.FLORIN_LOGS;
    const yes = ["My stool was black this morning", "My poo was black", "I have a temperature", "I've lost 5 kg without trying", "I lost a lot of weight", "Getting up at night to poop", "I keep waking up at 3am needing the bathroom", "There was red in the toilet", "Not sure if that was blood", "Should I worry about my temperature?", "my temperature is high", "woke up two nights in a row needing the loo", "up most nights to go"];
    const no = ["Up at 5am for the gym, BM at 7:30", "red pepper soup for dinner", "trying to lose weight", "checked the room temperature", "Had red wine, toilet trip after", "blood pressure fine", "took my temperature, it was fine", "bad nights, bathroom at 7", "woke up after a good night, BM at 8"];
    let seeded = 0;
    ["sarah", "marcus", "alex"].forEach((who) => L.build(who, "est").days.forEach((x) => x.entries.forEach((e) => { if (L.alarmsIn(e.kind === "sym" ? `${e.items.map((i) => i.name).join(". ")}. ${e.note || ""}` : e.note || "").length) seeded++; })));
    const A = window.FLORIN_ASK, same = !A || yes.concat(no).every((t) => A.signsIn(t).join() === L.alarmsIn(t).join());
    return { missed: yes.filter((t) => !L.alarmIn(t)), tripped: no.filter((t) => L.alarmIn(t)), seeded, same };
  });
  ok(wide.same, "Ask Florin hears a sign with the same net as a log's note (one net, L.alarmsIn)");
  ok(!wide.missed.length && !wide.tripped.length && wide.seeded === 0, `the core alarm net hears how people write a sign, and nothing ordinary trips it (missed: ${wide.missed.join(" | ") || "none"}; tripped: ${wide.tripped.join(" | ") || "none"}; seeded notes flagged: ${wide.seeded})`);

  /* 32. a day with no BM logged has no FloraScore of its own, so the 30-day line breaks there and isn't counted */
  const unscored = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, bad = [];
    for (const who of ["sarah", "marcus", "alex"]) {
      const M = L.build(who, "est");
      L.scoreSeries(M, 90, "C").forEach((s) => { if (s.d !== L.TODAY && s.value != null && !L.dayParts(M, L.day(M, s.d), "C")) bad.push(`${who} day ${s.d}`); });
    }
    return bad;
  });
  ok(!unscored.length, `no unlogged day carries a FloraScore (${unscored.slice(0, 3).join(", ") || "none"})`);

  /* ==================== Oct 27: the decisions as toggles, one phone, the hooks, Just joined ==================== */
  const pick = (k, v) => p.evaluate(([k, v]) => { const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (!b) throw new Error(`no ${k}=${v} control`); b.click(); }, [k, v]);
  const has = (sel) => p.evaluate((s) => !!document.querySelector(s), sel);
  const layerText = () => p.evaluate(() => { const l = document.querySelector(".rx-stage .ap-rx .ap-layer"); return l.textContent + " " + [...l.querySelectorAll("[data-msg]")].map((x) => x.dataset.msg).join(" "); });
  const topText = () => p.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return o ? o.textContent + " " + [...o.querySelectorAll("[data-msg]")].map((x) => x.dataset.msg).join(" ") : ""; });
  const CK = /check-in|\bcheck in\b/i;
  await pick("persona", "sarah"); await pick("data", "est"); await pick("plan", "member"); await wait(300);

  /* 33. the page: Decisions first in the left bar, Screens after Demo, one phone and no compare (at 1440) */
  {
    const d = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const de = [];
    d.on("pageerror", (e) => de.push(e.message));
    await d.goto(PAGE); await d.waitForSelector(".rx-stage .ap-rx");
    const lay = await d.evaluate(() => {
      const l = document.querySelector(".rx-side--l");
      const heads = l ? [...l.querySelectorAll(":scope > .rx-panel > .rx-h")].map((h) => h.textContent.trim()) : [];
      const ph = document.querySelector(".rx-stage .ap-rx"), r = ph.getBoundingClientRect();
      return {
        heads,
        phones: document.querySelectorAll(".ap-rx").length,
        compare: !!document.querySelector('#rxCmp, [data-rx="compare"], [data-v="compare-bm"], .rx-cmpt') || /compare all three|side by side/i.test(document.body.textContent.replace((document.querySelector(".rx-head-links") || {}).textContent || "", "")),
        headSwitch: !!document.querySelector('.rx-head [data-rx]'),
        decs: [...document.querySelectorAll(".rx-side--l .rx-dec[data-dec]")].map((x) => x.dataset.dec),
        info: [...document.querySelectorAll('.rx-side--l [data-rx="dinfo"]')].length,
        xinfo: [...document.querySelectorAll('.rx-side--l [data-rx="xinfo"]')].map((x) => x.dataset.v),
        demoLine: (document.querySelector(".rx-panel--demo .rx-demo-lede") || {}).textContent || "",
        fits: r.bottom <= window.innerHeight && r.top >= 0,
        leftScrolls: getComputedStyle(l).overflowY === "auto" && getComputedStyle(l).position === "sticky" && parseFloat(getComputedStyle(l).maxHeight) <= window.innerHeight && l.scrollHeight > l.clientHeight
      };
    });
    ok(lay.heads[0] === "Decisions" && lay.heads.indexOf("Screens") > lay.heads.indexOf("Demo") && lay.heads.indexOf("Demo") > 0, `the left bar runs Decisions, Demo, then Screens (${lay.heads.join(", ")})`);
    ok(lay.phones === 1 && !lay.compare && !lay.headSwitch, "one phone, no compare mode, and no switches left in the header");
    ok(["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard"].every((k) => lay.decs.includes(k)) && lay.info === lay.decs.length, `every decision has a toggle and an info button (${lay.decs.join(", ")})`);
    /* notes-page (Oct 28): the Demo panel says, in one plain line, that it changes the demo person, not the app; every
       demo control has its own info button */
    ok(/demo person, not the app/.test(lay.demoLine) && lay.xinfo.join(",") === "persona,data,meals,plan,theme,reset", `the Demo panel's line says it changes the demo person, and every demo control has a note (${lay.xinfo.join(", ")})`);
    ok(lay.fits && lay.leftScrolls, "the whole phone fits under the header, and the left bar scrolls on its own");
    /* a decision's note shows when it changes, stays while the screen does, and gives way on the next screen */
    await d.click('[data-rx="bmUI"][data-v="full"]'); await d.waitForTimeout(400);
    /* notes-page (Oct 28): the decision sheet's shape. The question, what it decides, a block per option with What it is,
       Why do it and Why not, the recommended one marked, We recommend under the blocks, and no badges */
    const n1 = await d.evaluate(() => {
      const N = document.querySelector("#rxNotes .rx-note");
      return {
        eb: N.querySelector(".rx-eyebrow").textContent, t: N.querySelector("h2").textContent,
        blocks: [...N.querySelectorAll(".rx-opts .rx-opt")].map((o) => [o.querySelector(".rx-opt-h b").textContent, [...o.querySelectorAll("dt")].map((x) => x.textContent).join("|"), o.classList.contains("is-rec")]),
        rec: (N.querySelector(".rx-rec") || {}).textContent || "", tag: [...N.querySelectorAll(".rx-tag")].map((x) => x.textContent).join(","),
        badge: /On the phone|\bPicked\b/.test(N.textContent)
      };
    });
    ok(/Decision/.test(n1.eb) && /BM logging/.test(n1.eb) && n1.t === "Should one tap on a tile save a BM?" && n1.blocks.length === 2 && n1.blocks.every((x) => x[1] === "What it is|Why do it|Why not") && n1.blocks.map((x) => x[0]).join("|") === "Quick tiles and form|Full form only" && n1.blocks[0][2] && !n1.blocks[1][2] && n1.tag === "Recommended" && /^We recommend Quick tiles and form/.test(n1.rec) && !n1.badge, `changing a decision shows its note in the sheet's shape: the question, a block per option, the recommended one marked, We recommend, no badge (${n1.t})`);
    await d.click('.rx-side [data-rx="screen"][data-v="insights"]'); await d.waitForTimeout(400);
    ok(await d.evaluate(() => /This screen/i.test(document.querySelector("#rxNotes .rx-eyebrow").textContent) && /Insights/.test(document.querySelector("#rxNotes h2").textContent)), "the next screen change brings back that screen's notes");
    await d.click('[data-rx="dinfo"][data-v="checkin"]'); await d.waitForTimeout(300);
    ok(await d.evaluate(() => /check-in/i.test(document.querySelector("#rxNotes .rx-eyebrow").textContent) && document.querySelector('[data-rx="dinfo"][data-v="checkin"]').getAttribute("aria-pressed") === "true"), "an info button shows its decision's note");
    /* Will's question: what the check-in asks, in the note, every question from the model */
    ok(await d.evaluate(() => { const t = document.querySelector("#rxNotes").textContent; return window.FLORIN_LOGS.CHECKIN.every((c) => t.includes(c.q)) && /We recommend On/.test(t); }), "the check-in note lists what the check-in asks, and recommends On");
    /* a demo control's info button shows its note, which says it changes the demo person; Meal logs reads as the
       demo person's history and explains the trap and the food check */
    await d.evaluate(() => { const f = document.querySelector('[data-rx="fold"]'); if (f.getAttribute("aria-expanded") !== "true") f.click(); });
    await d.click('[data-rx="xinfo"][data-v="meals"]'); await d.waitForTimeout(300);
    const mn0 = await d.evaluate(() => ({ eb: document.querySelector("#rxNotes .rx-eyebrow").textContent, t: document.querySelector("#rxNotes h2").textContent, txt: document.querySelector("#rxNotes").textContent, labels: [...document.querySelectorAll('[data-rx="meals"]')].map((b) => b.textContent.trim()).join("|"), cover: Math.round(window.FLORIN_LOGS.MEAL_COVER * 10), days: window.FLORIN_LOGS.FOOD_CHECK_DAYS }));
    ok(/Demo setting/.test(mn0.eb) && mn0.t === "Demo person's meals" && mn0.labels === "Every day|Only with symptoms|Never" && /not the app/.test(mn0.txt) && mn0.txt.includes(`${mn0.cover} in 10`) && mn0.txt.includes(`${mn0.days}-day food check`) && !/rough/i.test(mn0.txt), `the meals control's note: the demo person's history, the trap and the food check (${mn0.labels})`);
    await d.click('[data-rx="meals"][data-v="rough"]'); await d.waitForTimeout(500);
    ok(await d.evaluate(() => document.querySelector("#rxNotes h2").textContent === "Demo person's meals" && /Only with symptoms/.test(document.querySelector("[data-sum]").textContent + document.querySelector('[data-rx="meals"][aria-pressed="true"]').textContent)), "changing the meals control shows its note");
    await d.click('[data-rx="meals"][data-v="all"]'); await d.waitForTimeout(400);
    await d.click('[data-rx="bmUI"][data-v="quick"]');
    ok(!de.length, `no page errors at 1440${de.length ? ": " + de[0] : ""}`);
    await d.close();
  }

  /* 34. on a phone: a bottom bar with Toggles and Notes; Toggles holds Decisions, Demo and Screens, in that order */
  const mob = await p.evaluate(() => {
    const bar = document.querySelector(".rx-mbar"), r = bar.getBoundingClientRect();
    const t = document.querySelector("#rxSheet-toggles"), n = document.querySelector("#rxSheet-notes");
    return {
      top: Math.abs(r.top) < 2 && r.height <= 56 && getComputedStyle(bar).position === "fixed",
      btns: [...bar.querySelectorAll('[data-rx="sheet"]')].map((x) => x.textContent.trim()),
      heads: [...t.querySelectorAll(".rx-panel > .rx-h")].map((h) => h.textContent.trim()),
      notes: !!n.querySelector("#rxNotes"),
      full: document.querySelector(".rx-stage .ap-rx").classList.contains("is-full")
    };
  });
  ok(mob.top && mob.btns.join("|") === "Toggles|Notes" && mob.full, `on a phone the app is full screen under a slim top bar of ${mob.btns.join(" and ")}`);
  /* notes-page (Will, Oct 28): the page's bar sat over the app's tab bar on his phone. The bar is at the top now, and the
     app's own tab bar is whole and tappable at 390 and 360, and with a phone's safe areas (a stand-in: Chromium has none) */
  const tabsClear = () => p.evaluate(() => {
    const bar = document.querySelector(".rx-mbar").getBoundingClientRect(), tb = document.querySelector(".rx-stage .ap-rx .ap-tb");
    const r = tb.getBoundingClientRect(), sab = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rx-sab")) || 0;
    const tabs = [...tb.querySelectorAll(".ap-tb-b, .ap-tb-plus")];
    const hit = tabs.every((t) => { const q = t.getBoundingClientRect(), at = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!at && t.contains(at); });
    const labels = [...tb.querySelectorAll(".ap-tb-b span")].every((x) => { const q = x.getBoundingClientRect(), at = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return q.height > 0 && q.bottom <= window.innerHeight - sab && !!at && x.parentElement.contains(at); });
    return { ok: r.top > bar.bottom && r.bottom <= window.innerHeight - sab && hit && labels && tabs.length === 5, w: window.innerWidth, gap: Math.round(window.innerHeight - r.bottom) };
  });
  const tc = [await tabsClear()];
  await p.setViewportSize({ width: 360, height: 780 }); await wait(400); tc.push(await tabsClear());
  await p.evaluate(() => { document.documentElement.style.setProperty("--rx-sat", "47px"); document.documentElement.style.setProperty("--rx-sab", "34px"); }); await wait(200);
  const tcs = await tabsClear();
  const barSafe = await p.evaluate(() => { const b = document.querySelector('.rx-mbar [data-v="toggles"]').getBoundingClientRect(); return b.top >= 47; });
  tc.push(tcs);
  await p.evaluate(() => { document.documentElement.style.removeProperty("--rx-sat"); document.documentElement.style.removeProperty("--rx-sab"); });
  await p.setViewportSize({ width: 390, height: 844 }); await wait(400);
  ok(tc.every((x) => x.ok) && barSafe, `the app's tab bar is whole and tappable under the page's top bar: ${tc.map((x) => `${x.w} wide, ${x.gap}px clear of the bottom`).join("; ")} (the last with a stand-in safe area of 47 top and 34 bottom)`);
  ok(mob.heads.join("|") === "Decisions|Demo|Screens" && mob.notes, `the Toggles sheet holds ${mob.heads.join(", ")}; the Notes sheet the notes`);
  await p.click('.rx-mbar [data-v="toggles"]'); await wait(300);
  ok(await p.evaluate(() => !document.querySelector("#rxSheet-toggles").hidden && document.activeElement && document.activeElement.matches("#rxSheet-toggles .rx-x")), "Toggles opens its sheet, focus on Close");
  await p.keyboard.press("Escape"); await wait(300);
  ok(await p.evaluate(() => document.querySelector("#rxSheet-toggles").hidden && document.activeElement && document.activeElement.matches('.rx-mbar [data-v="toggles"]')), "Escape closes it and hands focus back to Toggles");

  /* 35. FLORIN_EXT: the documented keys, and a module act, overlay, note and onSet registered here (not in shipped code) */
  const ext = await p.evaluate(() => {
    const X = window.FLORIN_EXT, out = {};
    out.keys = !!X && ["overlays", "acts", "opens", "notes", "decisions", "keys"].every((k) => X[k] && typeof X[k] === "object" && !Array.isArray(X[k])) && Array.isArray(X.screens) && Array.isArray(X.onSet);
    out.api = !!X && !!X.api && ["S", "V", "M", "push", "pop", "swap", "rerender", "top", "closeAll", "toast", "say", "renderTab", "go", "nav", "focusSel", "open", "rebuild", "set", "countUp", "layer", "root"].every((k) => k in X.api);
    out.v = !!X && !!X.api && ["form", "uid", "mealUI", "plan", "bmUI", "home", "history", "checkin", "look", "easy", "onboard", "persona", "data", "meals"].every((k) => k in X.api.V());
    window.__ext = { hits: [], sets: [] };
    X.acts["test-act"] = (btn, api) => { window.__ext.hits.push([btn.dataset.v, api.S.tab, typeof api.set]); api.push("test-ovl", { n: 3 }); };
    X.overlays["test-ovl"] = { kind: "sheet", render: (M, V, st) => `<div class="ap-psh" role="dialog" aria-label="Test"><p class="t-ovl">Test overlay ${st.n} for ${M.P.name}</p><button type="button" data-act="close">Close</button></div>`, key: () => "test-screen" };
    X.notes["test-screen"] = (M, P) => ({ t: "Test note", lede: `Form ${P.form}`, ba: [], open: [], res: [] });
    X.onSet.push((k, v) => window.__ext.sets.push(`${k}=${v}`));
    X.acts["profile"] = (btn, api) => api.toast("Test profile");
    const layer = document.querySelector(".rx-stage .ap-rx .ap-layer");
    layer.insertAdjacentHTML("afterbegin", '<button type="button" id="tAct" data-act="test-act" data-v="7">t</button>');
    return out;
  });
  ok(ext.keys, "FLORIN_EXT has overlays, acts, opens, screens, notes, decisions, keys and onSet");
  ok(ext.api && ext.v, "FLORIN_EXT.api drives the phone, and V() carries every decision");
  await p.evaluate(() => document.querySelector("#tAct").click()); await wait(500);
  const extR = await p.evaluate(() => ({ hit: window.__ext.hits[0] || [], ovl: (document.querySelector(".rx-stage .ap-rx .t-ovl") || {}).textContent || "", note: document.querySelector("#rxNotes h2").textContent, cls: !!document.querySelector(".rx-stage .ap-rx .ap-o--t-test-ovl") }));
  ok(extR.hit[0] === "7" && extR.hit[2] === "function", `a registered act runs with the button and the api (${extR.hit.join(", ")})`);
  ok(/Test overlay 3 for Sarah/.test(extR.ovl) && extR.cls && extR.note === "Test note", `its overlay opens, and the overlay's key brings its own note (${extR.note})`);
  await p.keyboard.press("Escape"); await wait(400);
  await pick("home", "day"); await wait(300);
  ok(await p.evaluate(() => window.__ext.sets.includes("home=day") && document.querySelector(".rx-stage .ap-rx").dataset.home === "day"), "phone.set tells onSet, and stamps the decision on the phone");
  await pick("home", "score"); await open("today");
  await p.click(`${ph} .ap-avatar`); await wait(300);
  ok(await p.$eval(`${ph} .ap-tst`, (e) => /Test profile/.test(e.textContent)), "the Today avatar runs a module's profile act when one is registered");
  await p.evaluate(() => { const X = window.FLORIN_EXT; delete X.acts["test-act"]; delete X.acts.profile; delete X.overlays["test-ovl"]; delete X.notes["test-screen"]; X.onSet.length = 0; });
  await open("history"); await open("today");
  await p.click(`${ph} .ap-avatar`); await wait(300);
  const av = await p.evaluate(() => { const a = document.querySelector(".rx-stage .ap-rx .ap-avatar"), r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: a.getAttribute("aria-label"), t: document.querySelector(".rx-stage .ap-rx .ap-tst").textContent }; });
  ok(av.w === 44 && av.h === 44 && av.l === "Profile" && /profile/i.test(av.t) && /this version of the demo/.test(av.t), `without a module, the 44px Profile avatar says Profile isn't in this version of the demo (${av.w}x${av.h})`);

  /* 36. Weekly check-in off: gone from Today, plus, Insights, History and the Screens list; nothing else breaks */
  const score0 = await p.evaluate(() => (window.FLORIN_EXT.api.M() && window.FLORIN_LOGS.score(window.FLORIN_EXT.api.M(), window.FLORIN_LOGS.TODAY, "C") || {}).value);
  await pick("checkin", "false"); await wait(400);
  await open("today");
  const ckToday = await layerText();
  ok(!CK.test(ckToday) && !(await has(`${ph} .ap-ckc`)), "check-in off: nothing on Today mentions it");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  ok(!CK.test(await topText()) && !(await has(`${ph} .ap-pck`)), "check-in off: the plus menu has no check-in");
  await p.keyboard.press("Escape"); await wait();
  await open("insights");
  ok(!CK.test(await layerText()) && !(await has(`${ph} .ap-ic-h[data-k="ck"]`)) && await p.$$eval(`${ph} .ap-ins .ap-ic`, (e) => e.length) === 6, "check-in off: Insights has six cards and no check-in");
  await open("i-sym");
  ok(await p.$eval(`${ph} .ap-idt-next`, (e) => /Possible patterns/.test(e.textContent)), "check-in off: Next from Symptoms goes to Possible patterns");
  await open("history");
  ok(!CK.test(await layerText()), "check-in off: History and its report never mention it");
  await open("pay");
  ok(!CK.test(await topText()), "check-in off: the paywall's free list leaves it out");
  await p.keyboard.press("Escape"); await wait();
  const scr = await p.evaluate(() => ["ck-card", "ck", "ck-last", "ckdone", "ckday", "i-ck"].map((id) => { const b2 = document.querySelector(`[data-rx="screen"][data-v="${id}"]`); return !!b2 && b2.disabled && /Check-in is off/.test(b2.textContent); }));
  ok(scr.every(Boolean), `check-in off: its screens in the list are disabled and say Check-in is off (${scr.filter(Boolean).length} of ${scr.length})`);
  await p.evaluate(() => window.FLORIN_EXT.api.open("ck")); await wait();
  ok(!(await has(`${ph} .ap-o--screen`)) && await p.evaluate(() => window.FLORIN_EXT.api.S.tab === "today"), "check-in off: opening a check-in screen lands on Today instead");
  ok(await p.evaluate(() => { const L = window.FLORIN_LOGS; return (L.score(window.FLORIN_EXT.api.M(), L.TODAY, "C") || {}).value; }) === score0, "check-in off: FloraScore is the same");
  await open("today");
  ok(await p.evaluate(() => /Demo time/.test(document.querySelector("[data-time]").textContent) && !/check-in/i.test(document.querySelector("[data-time]").textContent)), "check-in off: the demo time line drops it too");
  await pick("checkin", "true"); await wait(400);
  ok(await has(`${ph} .ap-ckc`) && await p.evaluate(() => !document.querySelector('[data-rx="screen"][data-v="ck"]').disabled), "check-in on again: the card and its screens are back");

  /* 37. BM logging, full form only: no tiles anywhere on plus, one Log a BM row that opens the form, no one-tap save */
  await pick("bmUI", "full"); await wait(400);
  await open("today");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  const full = await p.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return { tiles: o.querySelectorAll(".ap-fm, .ap-fm-b, [data-act='quick-bm']").length, row: (o.querySelector(".ap-pbm [data-act='open-bm']") || {}).textContent || "", rows: o.querySelectorAll(".ap-pbm [data-act='open-bm']").length }; });
  ok(full.tiles === 0 && full.rows === 1 && /Log a BM/.test(full.row), `full form only: the plus menu has one Log a BM row and no tiles (${full.tiles} tiles)`);
  await p.click(`${ph} .ap-pbm [data-act="open-bm"]`); await wait();
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return !!o && !!o.querySelector(".ap-fsh") && /Log a BM/.test(o.querySelector("h2").textContent) && o.querySelectorAll(".ap-fm-b").length === 7; }), "the row opens the full BM form");
  await p.keyboard.press("Escape"); await wait();
  await p.click(`${ph} .ap-tb-plus`); await wait();
  await p.click(`${ph} [data-act="plus-earlier"]`); await wait();
  await p.click(`${ph} .ap-ea-row`); await wait();
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return o.querySelectorAll(".ap-fm-b").length === 0 && !!o.querySelector(".ap-pbm [data-act='open-bm']"); }), "full form only: no tiles for an earlier day either");
  await p.keyboard.press("Escape"); await wait(); await p.keyboard.press("Escape"); await wait();
  const n0 = await p.evaluate(() => window.FLORIN_RUI.bmCount(window.FLORIN_EXT.api.M()));
  await p.evaluate(() => { const b2 = document.createElement("button"); b2.dataset.form = "4"; window.FLORIN_EXT.api.act("quick-bm", b2); }); await wait();
  ok(await p.evaluate((n0) => window.FLORIN_RUI.bmCount(window.FLORIN_EXT.api.M()) === n0 && !!document.querySelector(".rx-stage .ap-rx .ap-o:not(.is-out) .ap-fsh") && !/BM saved/.test(document.querySelector(".rx-stage .ap-rx .ap-tst").textContent), n0), "full form only: a quick-bm tap opens the form, never a one-tap save");
  await p.keyboard.press("Escape"); await wait();
  await pick("bmUI", "quick"); await wait(300);

  /* 38. Just joined: day 1 of 14, nothing logged, and every tab reads right */
  await pick("data", "fresh"); await wait(400);
  const fr = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M();
    return { start: M.start === L.TODAY, day: L.learnDay(M), none: M.days.every((x) => !x.entries.length), usual: M.usual === null, days: M.days.length, built: ["sarah", "marcus", "alex"].every((id) => { const m = L.build(id, "fresh"); return m.days.length === 1 && !m.days[0].entries.length && !m.usual && L.learnDay(m) === 1; }) };
  });
  ok(fr.start && fr.day === 1 && fr.none && fr.usual && fr.days === 1 && fr.built, `Just joined: the model starts today, day ${fr.day} of 14, with nothing logged and no usual, for every person`);
  await open("today");
  const frT = await layerText();
  ok(/Day 1 of 14/.test(frT) && await has(`${ph} .ap-tl-empty`) && !/\b\d+ entr/.test(frT.replace(/Nothing yet/, "")), "Just joined: Today says day 1 of 14 and shows nothing logged");
  await p.click(`${ph} .ap-tb-plus`); await wait();
  ok(!(await has(`${ph} [data-act="plus-earlier"]`)), "Just joined: plus has no earlier day to catch up on");
  await p.keyboard.press("Escape"); await wait();
  await open("insights");
  const frI = await layerText();
  ok(/day 1 of 14/i.test(frI) && !/\bNaN\b|undefined/.test(frI), "Just joined: Insights is learning, day 1 of 14");
  await open("history");
  ok(/Started today\. Nothing logged yet/.test(await layerText()), "Just joined: History says it started today with nothing logged");
  await open("ask");
  ok(/How does Florin learn my usual/.test(await layerText()), "Just joined: Ask starts with questions about getting started");
  ok(await p.evaluate(() => /just joined/i.test(document.querySelector("[data-time]").textContent) && /day 1 of 14/.test(document.querySelector("[data-time]").textContent)), "Just joined: the demo time line says so");

  /* 39. the toggles together, every screen: nothing reads undefined or NaN, nothing names the check-in when it's off */
  const before39 = await noteDecisions();
  await pick("checkin", "false"); await pick("bmUI", "full"); await wait(300);
  const ids2 = await p.$$eval('[data-rx="screen"]:not([disabled])', (b2) => b2.map((x) => x.dataset.v));
  const bad2 = [];
  for (const [who, data] of [["marcus", "fresh"], ["alex", "est"]]) {
    await pick("persona", who); await pick("data", data); await wait(300);
    for (const id of ids2) {
      await open(id);
      const t = await p.evaluate(() => { const ph2 = document.querySelector(".rx-stage .ap-rx"); return ph2.textContent + " " + [...ph2.querySelectorAll("[data-msg]")].map((x) => x.dataset.msg).join(" "); });
      if (/\bundefined\b|\bNaN\b/.test(t) || CK.test(t)) bad2.push(`${who}/${data}/${id}`);
    }
  }
  ok(!bad2.length, `with check-in off and full form only, no screen reads undefined, NaN or the check-in (${bad2.slice(0, 4).join(", ") || "none"})`);
  for (const [k, v] of [["checkin", "true"], ["bmUI", "quick"], ["persona", "sarah"], ["data", "est"], ["plan", "member"]]) await pick(k, v);
  await putDecisions(before39);

  /* 40. the Oct 28 review: the page follows every phone.set, every decision note in the sheet's shape, arrows stay off the
     toggles, a meal sheet switch keeps what's typed, the time line counts logs, a broken overlay never opens, the left
     bar folds its Demo panel and reaches its end, and the note under the phone is pointed to */
  {
    const d = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const de = [];
    d.on("pageerror", (e) => de.push(e.message));
    d.on("console", (m) => { if (m.type() === "error" && !/drew nothing|t-boom/.test(m.text())) de.push(m.text()); });
    await d.goto(PAGE); await d.waitForSelector(".rx-stage .ap-rx"); await d.waitForTimeout(400);
    const dw = (ms = 450) => d.waitForTimeout(ms);
    const dclick = (sel) => d.evaluate((s) => document.querySelector(s).click(), sel);
    const pressed = (k) => d.evaluate((k) => (document.querySelector(`[data-rx="${k}"][aria-pressed="true"]`) || {}).dataset.v, k);
    const api = (f, a) => d.evaluate(f, a);
    /* phone.set from outside the page's own toggles (a module, say) */
    await dclick('[data-rx="screen"][data-v="today"]'); await dw();
    await api(() => window.FLORIN_EXT.api.set("checkin", false)); await dw();
    const off = await d.evaluate(() => ({ dis: document.querySelector('[data-rx="screen"][data-v="ck"]').disabled, time: document.querySelector("[data-time]").textContent, lede: document.querySelector("#rxNotes .rx-note-lede").textContent }));
    ok(await pressed("checkin") === "false" && off.dis && !/check-in/i.test(off.time + off.lede), "a module's set(checkin, false) moves the toggle, the Screens list, the time line and the notes");
    await api(() => window.FLORIN_EXT.api.set("checkin", true)); await api(() => window.FLORIN_EXT.api.set("plan", "free")); await api(() => window.FLORIN_EXT.api.set("persona", "marcus")); await api(() => window.FLORIN_EXT.api.set("history", "calendar")); await dw();
    ok(await pressed("checkin") === "true" && await pressed("plan") === "free" && await pressed("persona") === "marcus" && await pressed("history") === "calendar" && await d.evaluate(() => localStorage.getItem("florin-refresh:history") === '"calendar"' && /Marcus/.test(document.querySelector("[data-sum]").textContent) && /Free/.test(document.querySelector("[data-sum]").textContent)), "and set(plan), set(persona) and set(history) do too, stored and summed up in the Demo line");
    /* notes-page (Will, Oct 28: "Make it simple"): with every option of every decision picked in turn, the note is the
       decision sheet's shape. The question in ten words or fewer, one sentence on what it decides, a block per option
       with What it is, Why do it and Why not (each one sentence), the recommended block marked, one We recommend, at
       most one Still open and a Try it. No badge (On the phone, Picked), no build status, no was and now, no research
       list, no persona name */
    const shape = await d.evaluate(async () => {
      const out = { bad: [] }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const keys = [...new Set([...document.querySelectorAll('[data-rx="dinfo"]')].map((b) => b.dataset.v))];
      const one = (t) => (t.match(/[.?](\s|$)/g) || []).length <= 1;
      for (const k of keys) {
        const btns = [...document.querySelectorAll(`.rx-side [data-rx="${k}"]`)], was = btns.find((b) => b.getAttribute("aria-pressed") === "true");
        for (const b of btns) {
          b.click(); await sleep(60);
          /* the note as it reads, without its buttons (Show it on the phone is an action, not a badge) */
          const N = document.querySelector("#rxNotes .rx-note").cloneNode(true), tag = `${k}=${b.dataset.v}`;
          N.querySelectorAll("button").forEach((x) => x.remove());
          const q = N.querySelector("h2").textContent, what = (N.querySelector(".rx-note-lede") || {}).textContent || "";
          const blocks = [...N.querySelectorAll(".rx-opts .rx-opt")];
          const h3 = [...N.querySelectorAll(".rx-h3")].map((x) => x.textContent);
          if (q.split(/\s+/).length > 10 || !/\?$/.test(q)) out.bad.push(`${tag}: the question "${q}"`);
          if (!what || !one(what)) out.bad.push(`${tag}: what it decides isn't one sentence`);
          if (blocks.length !== btns.length) out.bad.push(`${tag}: ${blocks.length} blocks for ${btns.length} options`);
          blocks.forEach((o) => {
            const dts = [...o.querySelectorAll("dt")].map((x) => x.textContent).join("|");
            if (dts !== "What it is|Why do it|Why not") out.bad.push(`${tag}: a block reads ${dts || "nothing"}`);
            [...o.querySelectorAll("dd")].forEach((x) => { if (!one(x.textContent)) out.bad.push(`${tag}: "${x.textContent.slice(0, 40)}" isn't one sentence`); });
          });
          if (!N.querySelector(".rx-opt.is-rec .rx-tag")) out.bad.push(`${tag}: no block marked Recommended`);
          if (N.querySelectorAll(".rx-rec").length !== 1 || !/^We recommend /.test(N.querySelector(".rx-rec").textContent)) out.bad.push(`${tag}: no We recommend`);
          if (h3.filter((x) => /Still open/i.test(x)).length > 1) out.bad.push(`${tag}: more than one open question`);
          if (!h3.some((x) => /Try it/i.test(x))) out.bad.push(`${tag}: no Try it`);
          /* the badges by their own capitals (a Try it may say "unless you've picked a theme"), the rest in any case */
          const BAD = [/On the phone|\bPicked\b|Was, now|From the research|\b(Sarah|Marcus|Alex)\b/, /next pass|in this pass|being drawn|still to be drawn|\bas built\b/i];
          BAD.forEach((rx) => { const m = N.textContent.match(rx); if (m) out.bad.push(`${tag}: ${m[0]}`); });
          if (/[\u2014\u2013!]/.test(N.textContent)) out.bad.push(`${tag}: a dash or an exclamation point`);
        }
        if (was) was.click(); await sleep(60);
      }
      out.n = keys.length;
      return out;
    });
    ok(shape.n === 9 && !shape.bad.length, `every decision's note, with each option picked, is in the decision sheet's shape (${shape.n} decisions${shape.bad.length ? "; " + shape.bad.slice(0, 6).join("; ") : ""})`);
    await api(() => { window.FLORIN_EXT.api.set("plan", "member"); window.FLORIN_EXT.api.set("persona", "sarah"); }); await dw();
    /* the arrow keys step Screens from the list, never from a toggle */
    await dclick('[data-rx="screen"][data-v="insights"]'); await dw();
    await d.focus('[data-rx="form"][data-v="B"]'); await d.keyboard.press("ArrowLeft"); await dw();
    const k1 = await api(() => window.FLORIN_EXT.api.key());
    await d.focus('[data-rx="screen"][data-v="insights"]'); await d.keyboard.press("ArrowRight"); await dw();
    ok(k1 === "insights" && await api(() => window.FLORIN_EXT.api.key()) === "i-score", "an arrow key on a decision leaves the phone be; from the Screens list it steps on");
    /* the meal sheet switches in place with what's typed */
    await dclick('[data-rx="screen"][data-v="meal"]'); await dw();
    await d.fill(`${ph} [data-in="text"]`, "oatmeal and coffee"); await dw(300);
    await d.click('[data-rx="mealUI"][data-v="detailed"]'); await dw();
    const ms = await d.evaluate(() => { const os = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")], o = os.pop(); return { n: os.length + 1, text: (o.querySelector('[data-in="text"]') || {}).value, quick: !!o.querySelector(".ap-mq-mic"), toast: document.querySelector(".rx-stage .ap-rx .ap-tst").classList.contains("is-on") }; });
    ok(ms.n === 1 && ms.text === "oatmeal and coffee" && !ms.quick && !ms.toast, "Meal sheet, changed with a meal half typed: the one-meal sheet opens in its place with the words, and no Not saved toast");
    await api(() => window.FLORIN_EXT.api.closeAll()); await d.click('[data-rx="mealUI"][data-v="quick"]'); await dw();
    /* Just joined: the time line counts what's logged */
    await dclick('[data-rx="data"][data-v="fresh"]'); await dw();
    const t0 = await d.evaluate(() => document.querySelector("[data-time]").textContent);
    await d.click(`${ph} .ap-tl-empty [data-act="nobm"]`); await dw();
    ok(/nothing is logged yet/.test(t0) && /with 1 log so far/.test(await d.evaluate(() => document.querySelector("[data-time]").textContent)), "Just joined: the demo time line counts the first log");
    await dclick('[data-rx="data"][data-v="est"]'); await dw();
    /* an overlay that draws nothing never opens over a dead app */
    const boom = await api(() => { window.FLORIN_EXT.overlays["t-boom"] = { kind: "sheet", render: () => { throw new Error("t-boom"); } }; const r = window.FLORIN_EXT.api.push("t-boom", {}); delete window.FLORIN_EXT.overlays["t-boom"]; return { r: r === null, open: !!document.querySelector(".rx-stage .ap-rx .ap-o--t-t-boom"), inert: document.querySelector(".rx-stage .ap-rx .ap-stack").inert }; });
    ok(boom.r && !boom.open && !boom.inert, "a module overlay whose render throws isn't opened, and the app stays live");
    /* the left bar: Demo folds and unfolds, and the bar's end is in reach before the page scrolls */
    const fold = await d.evaluate(() => { const b2 = document.querySelector('[data-rx="fold"]'), body = document.querySelector("#rxDemoB"), was = body.hidden; b2.click(); const now = body.hidden; b2.click(); const l = document.querySelector(".rx-side--l"), r = l.getBoundingClientRect(); return { was, now, back: body.hidden === was, end: r.bottom <= window.innerHeight + 1, exp: b2.getAttribute("aria-expanded") }; });
    ok(fold.was !== fold.now && fold.back && fold.end, "the Demo panel folds and unfolds, and the left bar ends inside the window");
    ok(await d.evaluate(() => [...document.querySelectorAll('[data-rx="form"]')].map((x) => x.getAttribute("aria-label")).join("|")) === "A, 1 to 7|B, 5 words|C, 7 words", "A, B and C are read out as A, 1 to 7 and so on");
    ok(!de.length, `no page errors in the review checks${de.length ? ": " + de[0] : ""}`);
    await d.close();
    /* between 760 and 1019px, a decision changed points down to its note */
    const n9 = await b.newPage({ viewport: { width: 900, height: 900 } });
    await n9.goto(PAGE); await n9.waitForSelector(".rx-stage .ap-rx"); await n9.waitForTimeout(400);
    await n9.click('[data-rx="bmUI"][data-v="full"]'); await n9.waitForTimeout(400);
    const jp = await n9.evaluate(() => { const j = document.querySelector(".rx-jump"); return { shown: !j.hidden, text: j.textContent }; });
    await n9.click(".rx-jump"); await n9.waitForTimeout(900);
    const inView = await n9.evaluate(() => { const r = document.querySelector("#rxNotes").getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 && document.activeElement && document.activeElement.id === "rxNoteH"; });
    ok(jp.shown && /BM logging/.test(jp.text) && inView, `at 900 wide, a changed decision offers its note under the phone, and the button brings it into view (${jp.text})`);
    await n9.evaluate(() => document.querySelector('[data-rx="bmUI"][data-v="quick"]').click());
    await n9.close();
  }

  /* ===== build-looks: the data style in the app (prototype/js/refresh-looks.js) ===== */
  {
    /* its own browser context, so the data style it picks never reaches the other checks (decisions are stored) */
    const lc = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const q = await lc.newPage();
    const le = [];
    q.on("pageerror", (e) => le.push(e.message));
    q.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /refresh-looks/.test(m.text()))) le.push(m.text()); });
    await q.goto(PAGE); await q.waitForSelector(".rx-stage .ap-rx"); await q.waitForTimeout(400);
    const lw = (ms = 450) => q.waitForTimeout(ms);
    const lpick = async (k, v) => { await q.evaluate(([k, v]) => { const b2 = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (!b2) throw new Error(`no ${k}=${v} control`); b2.click(); }, [k, v]); await lw(300); };
    const lopen = async (id) => { await q.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await lw(); };
    const lkey = () => q.evaluate(() => window.FLORIN_EXT.api.key());
    const ins = () => q.evaluate(() => {
      const l = document.querySelector(".rx-stage .ap-rx .ap-layer"), r = l.querySelector(".rlk-ins");
      return { look: r ? r.dataset.rlkLook : null, keys: [...l.querySelectorAll("[data-rlk-k]")].map((c) => c.dataset.rlkK), empty: [...l.querySelectorAll(".rlk-card")].filter((c) => !c.querySelector(".rlk-look").textContent.trim()).length,
        go: [...l.querySelectorAll(".rlk-card")].map((c) => { const g = c.querySelector(".rlk-go"); return g ? `${g.dataset.act}:${g.dataset.k || g.dataset.pay || g.dataset.tab}` : "none"; }),
        text: l.textContent, bad: /\bNaN\b|\bundefined\b/.test(l.textContent), theme: [...new Set([...l.querySelectorAll(".rlk-look")].map((n) => n.dataset.theme))].join(",") };
    });
    const ORDER = ["score", "parts", "trend", "week", "month", "timing", "often", "form", "symptoms", "checkin", "pattern"];
    const DK = { score: "score", parts: "score", trend: "score", week: "days", month: "days", timing: "timing", often: "often", form: "form", symptoms: "sym", checkin: "ck", pattern: "pat" };
    const LOOKS = ["rings", "journal", "bento", "oura", "easy"];
    /* the note: a block per style, Florin charts marked, and the recommendation in the sheet's words (fix-words, Oct 28:
       one look everywhere, Florin charts, as data viz.md's Option 1) */
    await lpick("look", "oura");
    const dn = await q.evaluate(() => ({ rec: (document.querySelector("#rxNotes .rx-rec") || {}).textContent || "", opts: [...document.querySelectorAll("#rxNotes .rx-opts .rx-opt .rx-opt-h b")].map((x) => x.textContent).join(","), marked: [...document.querySelectorAll("#rxNotes .rx-opt.is-rec .rx-opt-h b")].map((x) => x.textContent).join(",") }));
    ok(dn.opts === "Florin charts,Oura,Easy read,Rings,Field journal,Bento" && dn.marked === "Florin charts" && /^We recommend one look everywhere, Florin charts, with Easy read only in the Easy version\. A card and its detail page then draw the same day the same way/.test(dn.rec), `data style: a block per style, the two real options first, Florin charts marked, and the sheet's recommendation (${dn.opts})`);
    for (const id of LOOKS) {
      await lpick("look", id);
      for (const theme of ["light", "dark"]) {
        await lpick("theme", theme);
        await lopen("look-insights");
        const r = await ins();
        ok(r.look === id && r.keys.join(",") === ORDER.join(",") && !r.empty && !r.bad && r.theme === theme && await lkey() === "look-insights", `data style ${id}, ${theme}: Insights draws every card in order, none empty, no NaN or undefined (${r.keys.length} cards${r.bad ? ", NaN or undefined" : ""}${r.empty ? `, ${r.empty} empty` : ""})`);
      }
      const r = await ins();
      ok(r.go.join(",") === ORDER.map((k) => `idetail:${DK[k]}`).join(","), `data style ${id}: every card has a link into its detail`);
      /* the theme follows without a redraw */
      await lpick("theme", "light");
      ok((await ins()).theme === "light", `data style ${id}: the cards follow the theme`);
      /* a BM logged on the phone redraws the look's cards from the live model */
      const t0 = await q.evaluate(() => ({ all: document.querySelector(".rlk-ins").textContent, often: document.querySelector('[data-rlk-k="often"]').textContent }));
      await q.evaluate(() => { const b2 = document.createElement("button"); b2.dataset.form = "4"; window.FLORIN_EXT.api.act("quick-bm", b2); }); await lw();
      const t1 = await q.evaluate(() => ({ all: document.querySelector(".rlk-ins").textContent, often: document.querySelector('[data-rlk-k="often"]').textContent, n: window.FLORIN_LOGS.day(window.FLORIN_EXT.api.M(), window.FLORIN_LOGS.TODAY).entries.filter((e) => e.kind === "bm").length }));
      ok(t1.all !== t0.all && t1.often !== t0.often && !/\bNaN\b|\bundefined\b/.test(t1.all), `data style ${id}: a BM logged on the phone changes the look's cards (${t1.n} BMs today)`);
      await lpick("data", "new"); await lpick("data", "est");
      /* the first card opens its detail, and back returns to the cards */
      await lopen("look-insights");
      await q.click(`${ph} [data-rlk-k="score"] .rlk-go`); await lw();
      const k1 = await lkey();
      await q.click(`${ph} .ap-back`); await lw();
      ok(k1 === "i-score" && await lkey() === "look-insights", `data style ${id}: the FloraScore card opens its detail, and back returns (${k1})`);
      /* Today: the score and the week are the look's */
      await lopen("look-today");
      const td = await q.evaluate((id) => { const l = document.querySelector(".rx-stage .ap-rx .ap-layer"); return { hero: !!l.querySelector(`.rlk-today[data-rlk-k="score"] .lk-${id}`), week: !!l.querySelector(`.rlk-today[data-rlk-k="week"] .lk-${id}`), core: !!l.querySelector(".ap-hero, .ap-wk"), bad: /\bNaN\b|\bundefined\b/.test(l.textContent) }; }, id);
      ok(td.hero && td.week && !td.core && !td.bad && await lkey() === "look-today", `data style ${id}: Today's FloraScore and week are the look's cards`);
    }
    /* every card opens the detail that matches it */
    await lpick("look", "oura"); await lopen("look-insights");
    const opened = [];
    for (const k of ORDER) {
      await q.click(`${ph} [data-rlk-k="${k}"] .rlk-go`); await lw();
      opened.push(`${k}>${(await lkey()).replace(/^i-/, "")}`);
      await q.click(`${ph} .ap-back`); await lw(300);
    }
    ok(opened.join(",") === ORDER.map((k) => `${k}>${DK[k]}`).join(","), `data style: each card opens its own detail (${opened.filter((x) => { const [a, b2] = x.split(">"); return DK[a] !== b2; }).join(", ") || "all eleven"})`);
    /* the week's link opens the days page on 7 days, every day listed; 30 days lists the days that shifted */
    await q.click(`${ph} [data-rlk-k="week"] .rlk-go`); await lw();
    const dp = await q.evaluate(() => ({ t: document.querySelector(".rx-stage .ap-rx .ap-nav-t").textContent, rows: document.querySelectorAll(".rx-stage .ap-rx .rlk-day").length, range: window.FLORIN_EXT.api.S.ins.range, bad: /\bNaN\b|\bundefined\b/.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent) }));
    await q.click(`${ph} [data-act="irange"][data-v="30"]`); await lw();
    /* build-modules: each row carries its day's word in the app's shared words; on 30 days only the days not within */
    const dp30 = await q.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .rlk-day .rlk-day-w")].map((c) => c.textContent));
    ok(dp.t === "Your days" && dp.range === 7 && dp.rows === 7 && !dp.bad && dp30.length > 0 && dp30.every((w) => w === "Outside your usual" || w === "Not counted" || w === "Noted for a clinician"), `data style: Your days lists every day of the week, and on 30 days only the ones not within your usual (${dp.rows} rows, then ${dp30.length})`);
    await q.click(`${ph} .ap-back`); await lw();
    /* the Oura look's own controls work in the phone: the 30 and 90 switch, a Contributors row, and a tag that goes on
       this week's check-in and stays pressed after a redraw */
    const ou = await q.evaluate(() => {
      const l = document.querySelector(".rx-stage .ap-rx .ap-layer");
      const b90 = l.querySelector('[data-ou-span="90"]'); b90.click();
      const panes = [...b90.closest(".ou").querySelectorAll(".ou-pane")].map((p) => `${p.dataset.span}:${p.hidden}`).join(",");
      const row = l.querySelector(".ou-ct-top"); row.click();
      const more = !l.querySelector(`#${CSS.escape(row.getAttribute("aria-controls"))}`).hidden;
      const tag = l.querySelector("[data-ou-tag]"); tag.click();
      return { panes, more, tag: tag.textContent.trim(), toast: document.querySelector(".rx-stage .ap-rx .ap-tst").textContent };
    });
    await q.evaluate(() => window.FLORIN_EXT.api.renderTab(true)); await lw(200);
    const lpressed = (t) => q.evaluate((t) => [...document.querySelectorAll(".rx-stage .ap-rx [data-ou-tag]")].some((b2) => b2.textContent.trim() === t && b2.getAttribute("aria-pressed") === "true"), t);
    const still = await lpressed(ou.tag);
    ok(/30:true/.test(ou.panes) && /90:false/.test(ou.panes) && ou.more && /this week's check-in/.test(ou.toast) && still, `data style Oura: the 90 day switch, a Contributors row and a tag work in the phone, and the tag stays pressed after a redraw (${ou.tag})`);
    /* the check-in card's button starts the check-in, with the tag already on it; closed with nothing answered (the
       core keeps no draft then), the tag is still on the card and still in the check-in when it opens again */
    const ltags = () => q.evaluate(() => { const t = window.FLORIN_EXT.api.top(); return t && t.type === "ck" ? t.st.tags.slice() : null; });
    await q.click(`${ph} [data-rlk-k="checkin"] [data-act="ck-start"]`); await lw();
    const tg1 = await ltags();
    ok(await q.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-o--t-ck:not(.is-out)")) && !!tg1 && tg1.includes(ou.tag), `data style: the check-in card's button opens the check-in, with the card's tag on it (${(tg1 || []).join(", ")})`);
    await q.keyboard.press("Escape"); await lw();
    const tgStill = await lpressed(ou.tag);
    await q.click(`${ph} [data-rlk-k="checkin"] [data-act="ck-start"]`); await lw();
    const tg2 = await ltags();
    await q.keyboard.press("Escape"); await lw();
    ok(tgStill && !!tg2 && tg2.includes(ou.tag), `data style Oura: a card's tag survives the check-in closed unanswered, on the card and in the check-in (${(tg2 || []).join(", ")})`);
    /* every look's check-in card has a button that opens the check-in, on Member and Free, and no look button is left
       doing nothing */
    {
      const bad = [];
      for (const plan of ["member", "free"]) {
        await lpick("plan", plan);
        for (const id of LOOKS) {
          await lpick("look", id); await lopen("look-insights");
          const dead = await q.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .rlk-look button")].filter((x) => !x.closest("[inert]") && !x.dataset.act && !x.matches("[data-ou-span], [data-ou-tag], [data-ou-close], .ou-ct-top")).map((x) => x.textContent.trim()));
          if (dead.length) bad.push(`${plan} ${id}: ${dead.join("/")}`);
          if (!(await q.$(`${ph} [data-rlk-k="checkin"] [data-act="ck-start"]`))) { bad.push(`${plan} ${id}: no button`); continue; }
          await q.click(`${ph} [data-rlk-k="checkin"] [data-act="ck-start"]`); await lw();
          if (!(await q.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-o--t-ck:not(.is-out)")))) bad.push(`${plan} ${id}: didn't open`);
          await q.keyboard.press("Escape"); await lw();
        }
      }
      await lpick("plan", "member");
      ok(!bad.length, `data style: every look's check-in button opens the check-in, on Member and Free, and every look button does something (${bad.join("; ") || "all five"})`);
    }
    /* Back from a detail lands on the card it was opened from, where it was: the parts and the trend both open
       FloraScore, the week and the month both open Your days */
    {
      const bad = [];
      for (const id of ["oura", "rings"]) {
        await lpick("look", id);
        for (const k of ["trend", "month", "parts"]) {
          await lopen("look-insights");
          await q.evaluate((k) => document.querySelector(`.rx-stage .ap-rx [data-rlk-k="${k}"] .rlk-go`).scrollIntoView({ block: "center" }), k); await lw(200);
          const y0 = await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").scrollTop);
          await q.click(`${ph} [data-rlk-k="${k}"] .rlk-go`); await lw();
          await q.click(`${ph} .ap-back`); await lw(600);
          const s = await q.evaluate(() => { const a = document.activeElement, c = a && a.closest("[data-rlk-k]"); return { card: c ? c.dataset.rlkK : null, go: !!a && a.classList.contains("rlk-go"), y: document.querySelector(".rx-stage .ap-rx .ap-layer").scrollTop }; });
          if (s.card !== k || !s.go || Math.abs(s.y - y0) > 2) bad.push(`${id} ${k}: focus on ${s.card}, y ${Math.round(y0)} then ${Math.round(s.y)}`);
        }
      }
      ok(!bad.length, `data style: Back from a detail focuses the card it was opened from, at the same place (${bad.join("; ") || "trend, month and parts, in Oura and Rings"})`);
    }
    /* Today: See the week on Insights lands on the week card; in Oura the week's tag card stays on Insights, so Today
       asks for the check-in once */
    await lpick("look", "oura"); await lopen("look-today");
    const ltag = await q.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-layer .ou-tagcard").length);
    await q.click(`${ph} .rlk-today[data-rlk-k="week"] .rlk-go`); await lw(700);
    const lwk = await q.evaluate(() => { const a = document.activeElement, c = a && a.closest("[data-rlk-k]"), l = document.querySelector(".rx-stage .ap-rx .ap-layer"); const r = c && c.getBoundingClientRect(), lr = l.getBoundingClientRect(); return { card: c ? c.dataset.rlkK : null, ins: !!a && !!a.closest(".rlk-ins"), seen: !!r && r.top >= lr.top && r.top < lr.bottom - 96 }; });
    ok(ltag === 0 && lwk.card === "week" && lwk.ins && lwk.seen && await lkey() === "look-insights", `data style: See the week on Insights opens Insights on the week card, and Today in Oura has no tag card (${lwk.card}, ${ltag} tag cards)`);
    /* the screen's outline: the cards' headings sit one level under the h1 on Insights and on Today, never skipping
       one; Field journal's "more patterns in Insights" link is gone inside Insights, and the card's own link counts */
    {
      const bad = [];
      for (const id of LOOKS) {
        await lpick("look", id);
        for (const scr of ["look-insights", "look-today"]) {
          await lopen(scr);
          const lv = await q.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer :is(h1, h2, h3, h4, [role=heading])")].filter((h) => !h.closest("[aria-hidden=true], [inert], [hidden]")).map((h) => +(h.getAttribute("aria-level") || h.tagName.slice(1))));
          const skip = lv.findIndex((v, i) => i > 0 && v > lv[i - 1] + 1);
          if (lv[0] !== 1 || skip >= 0) bad.push(`${id} ${scr}: ${lv.join(",")}`);
        }
      }
      await lpick("look", "journal"); await lopen("look-insights");
      const jr = await q.evaluate(() => ({ n: document.querySelectorAll(".rx-stage .ap-rx .jr-link").length, go: document.querySelector('.rx-stage .ap-rx [data-rlk-k="pattern"] .rlk-go').textContent.trim(), found: (() => { const V = window.FLORIN_EXT.api.V(); return window.FLD.build(V.persona, { mode: V.form, data: V.data, meals: V.meals, M: window.FLORIN_EXT.api.M() }).patterns.found.length; })() }));
      ok(!bad.length && jr.n === 0 && (jr.found > 1 ? jr.go === `All ${jr.found} possible patterns` : jr.go === "Possible patterns in detail"), `data style: the cards' headings never skip a level, and Field journal's pattern card links once, with the count (${bad.join("; ") || jr.go})`);
    }
    /* Your days: Ask about this opens Ask Florin with the days' own counts, not FloraScore's */
    await lpick("look", "oura"); await lopen("look-insights");
    await q.click(`${ph} [data-rlk-k="month"] .rlk-go`); await lw();
    const lask = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="ask-about"]').dataset.k);
    await q.click(`${ph} [data-act="ask-about"]`); await lw(700);
    const lctx = await q.evaluate(() => { const S = window.FLORIN_EXT.api.S, c = window.FLORIN_RUI.askContext(window.FLORIN_EXT.api.M(), window.FLORIN_EXT.api.V(), S.askCtx); return { k: S.askCtx && S.askCtx.k, title: c && c.title, facts: c ? c.facts.join(" | ") : "", text: document.querySelector(".rx-stage .ap-rx .ap-layer").textContent }; });
    ok(lask === "days" && lctx.k === "days" && /^Your days · last 30 days$/.test(lctx.title) && /within your usual/.test(lctx.facts) && lctx.text.includes(lctx.title) && !/\bNaN\b|\bundefined\b/.test(lctx.facts), `data style: Your days' Ask about this opens Ask Florin with the days' counts (${lctx.facts})`);
    await lopen("look-insights");
    /* the claims check passes on both data style screens, in every look, on Member and Free */
    {
      const bad = [];
      for (const plan of ["member", "free"]) {
        await lpick("plan", plan);
        for (const id of LOOKS) {
          await lpick("look", id);
          for (const scr of ["look-insights", "look-today"]) {
            await lopen(scr);
            const lint = await q.evaluate(() => (document.querySelector("#rxNotes .rx-lint") || {}).textContent || "");
            if (lint) bad.push(`${plan} ${id} ${scr}: ${lint.slice(0, 120)}`);
          }
        }
      }
      await lpick("plan", "member");
      ok(!bad.length, `data style: the claims check passes on Insights and Today in every look, Member and Free (${bad.join("; ") || "20 screens"})`);
    }
    /* fix-viz (Oct 28): no count-up in the app (a number counting up sits beside a reading it doesn't have), and a
       numeral with decimals reads its own value as written */
    await lpick("look", "rings"); await lopen("today"); await lopen("look-insights"); await lw(300);
    const dec = await q.evaluate(() => ({ counts: document.querySelectorAll(".rx-stage .ap-rx [data-rlk-count], .rx-stage .ap-rx .rlk-look [data-count]").length, dec: [...document.querySelectorAll(".rx-stage .ap-rx .rlk-look [data-dec]")].map((n) => n.textContent.trim()) }));
    ok(!dec.counts && dec.dec.length > 0 && dec.dec.every((t) => /^\d+\.\d$/.test(t)), `data style: no count-up, decimals as written (${dec.dec.join(", ")})`);
    /* Free: the score, the week and the check-in, then one membership card that opens the paywall */
    await lpick("plan", "free");
    for (const id of LOOKS) {
      await lpick("look", id); await lopen("look-insights");
      const r = await ins();
      const lock = await q.evaluate(() => { const c = document.querySelector('.rx-stage .ap-rx [data-rlk-k="lock"]'); return !!c && !!c.querySelector('[data-act="pay"]') && !c.querySelector(".rlk-tease button") && /With Florin membership/.test(c.textContent); });
      ok(r.keys.join(",") === "score,week,checkin,lock" && lock && r.go.every((g) => /^pay:/.test(g)) && !r.bad, `data style ${id}, free: the score, the week and the check-in, then the membership card (${r.keys.join(",")})`);
    }
    /* the membership card names what's behind it in the paywall's words: never the parts, which the free score card
       shows, nor FloraScore's line, which the free plan keeps */
    const llock = await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .rlk-lock-p").textContent);
    ok(/^Why your FloraScore moved, /.test(llock) && !/makes up|30 days of it/.test(llock), `data style, free: the membership card's list matches the plan (${llock})`);
    await q.click(`${ph} [data-rlk-k="lock"] [data-act="pay"]`); await lw();
    ok(await q.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-o--t-pay:not(.is-out)")), "data style, free: the membership card opens the paywall");
    await q.keyboard.press("Escape"); await lw();
    await lpick("plan", "member");
    /* the check-in off drops its card, the Oura tag card, and every word of it, on the phone and in the notes */
    await lpick("checkin", "false");
    const CKW = /check-in|\bcheck in\b/i;
    for (const id of LOOKS) {
      await lpick("look", id);
      const dnote = await q.evaluate(() => document.querySelector("#rxNotes").textContent);
      await lopen("look-insights");
      const r = await ins();
      const inote = await q.evaluate(() => document.querySelector("#rxNotes").textContent);
      await lopen("look-today");
      const tt = await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").textContent);
      const tnote = await q.evaluate(() => document.querySelector("#rxNotes").textContent);
      ok(!r.keys.includes("checkin") && r.keys.length === ORDER.length - 1 && !CKW.test(r.text) && !CKW.test(tt) && !CKW.test(dnote) && !CKW.test(inote) && !CKW.test(tnote), `data style ${id}, check-in off: its card is gone and nothing names it, the notes included`);
    }
    await lpick("checkin", "true");
    /* new and just joined, A and B: every look reads, with the day it's on */
    for (const [data, form] of [["new", "A"], ["fresh", "B"]]) {
      await lpick("data", data); await lpick("form", form);
      const bad = [];
      for (const id of LOOKS) {
        await lpick("look", id); await lopen("look-insights");
        const r = await ins();
        if (r.bad || r.empty || !/Day \d+ of 14/.test(r.text)) bad.push(`${id} insights`);
        await lopen("look-today");
        if (await q.evaluate(() => /\bNaN\b|\bundefined\b/.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent))) bad.push(`${id} today`);
      }
      ok(!bad.length, `data style, ${data === "new" ? "new day 5" : "just joined"} in ${form}: every look's Insights and Today read, day by day (${bad.join(", ") || "all five"})`);
      /* Your days counts the days logged the way the week card does; with nothing logged it says so in words */
      await lpick("look", "rings"); await lopen("look-insights");
      /* fix-library: with nothing logged the card says so in words too ("Nothing logged yet", never "0 of 1 days"), read here as 0 */
      const wk = await q.evaluate(() => { const t = document.querySelector('.rx-stage .ap-rx [data-rlk-k="week"]').textContent, m = t.match(/(\d+)\s*of (\d+) days? logged/); return m ? `${m[1]} of ${m[2]}` : /Nothing logged yet/.test(t) && !/\b0\s*of\b/.test(t) ? "0 of none" : null; });
      await q.click(`${ph} [data-rlk-k="week"] .rlk-go`); await lw();
      const dp = await q.evaluate(() => { const h = document.querySelector(".rx-stage .ap-rx .rlk-days-page .ap-dhero"); const b2 = h.querySelector(".ap-big"), m = b2 && b2.textContent.match(/(\d+)\s*of (\d+) days? logged/); return { big: b2 ? (m ? `${m[1]} of ${m[2]}` : b2.textContent) : null, text: document.querySelector(".rx-stage .ap-rx .rlk-days-page").textContent }; });
      const logged0 = wk && /^0 of/.test(wk);
      ok(!!wk && (logged0 ? dp.big === null && /Nothing logged yet/.test(dp.text) : dp.big === wk) && !/\b0 of 0\b|\b(\d+) to \1\b/.test(dp.text), `data style, ${data === "new" ? "new day 5" : "just joined"}: Your days counts the days the week card counts (card ${wk}, page ${dp.big || "Nothing logged yet"})`);
      await q.click(`${ph} .ap-back`); await lw();
    }
    await lpick("data", "est"); await lpick("form", "C");
    /* the Easy version draws Easy read whatever the style; Florin charts (built) draws the core's screens */
    ok(await q.evaluate(() => window.FLORIN_RUI.lookOf({ easy: true, look: "oura" }) === "easy" && window.FLORIN_RUI.lookOf({ easy: false, look: "built" }) === null && /lk-easy/.test(window.FLORIN_RUI.lookCards(window.FLORIN_EXT.api.M(), Object.assign(window.FLORIN_EXT.api.V(), { easy: true }), ["score"]))), "data style: the Easy version draws Easy read whatever the style, through RU.lookOf and RU.lookCards");
    await lpick("look", "built"); await lopen("look-insights");
    ok(!(await q.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .rlk-ins"))) && await q.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-ic")) && /Florin charts/.test(await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-tst").textContent)), "data style Florin charts: Insights is the core's, and its screen says to pick a style");
    ok(!le.length, `data style: no console errors or module warnings${le.length ? ": " + le.slice(0, 2).join(" | ") : ""}`);
    await lc.close();
  }
  /* ===== end build-looks ===== */

  /* ===== fix-looks: Oura is dark first. Picking it turns the phone dark (the phone, the Theme toggle and the Demo
     summary) unless the viewer has picked a theme; leaving it puts the theme back; the Easy version, which draws Easy
     read, leaves the theme alone; a stored Oura pick boots dark (prototype/js/refresh-looks.js) ===== */
  {
    const fl = [];
    const thCtx = async (scheme) => {
      const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
      const q = await c.newPage();
      q.on("pageerror", (e) => fl.push(e.message));
      q.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /refresh-looks/.test(m.text()))) fl.push(m.text()); });
      await q.goto(PAGE); await q.waitForSelector(".rx-stage .ap-rx"); await q.waitForTimeout(400);
      return { c, q };
    };
    const thPick = (q) => async (k, v) => { await q.evaluate(([k, v]) => { const b2 = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (!b2) throw new Error(`no ${k}=${v} control`); b2.click(); }, [k, v]); await q.waitForTimeout(350); };
    const thOpen = (q) => async (id) => { await q.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await q.waitForTimeout(450); };
    /* the phone, the Theme toggle, the Demo summary and the look's cards: one word when they agree, else each */
    const thState = (q) => q.evaluate(() => {
      const r = document.querySelector(".rx-stage .ap-rx"), on = document.querySelector('[data-rx="theme"][aria-pressed="true"]'), sum = (document.querySelector("[data-sum]") || {}).textContent || "";
      const cards = [...new Set([...r.querySelectorAll(".rlk-look")].map((n) => n.dataset.theme))];
      const all = [r.dataset.theme, on && on.dataset.v, /Dark$/.test(sum.trim()) ? "dark" : /Light$/.test(sum.trim()) ? "light" : "none", ...cards];
      return new Set(all).size === 1 ? all[0] : `phone ${all[0]}, toggle ${all[1]}, summary ${all[2]}, cards ${cards.join("/") || "none"}`;
    });
    /* a light system: Oura turns everything dark, the first time it draws, and Rings puts light back */
    {
      const { c, q } = await thCtx("light");
      const pick = thPick(q), open = thOpen(q);
      const s0 = await thState(q);
      await open("look-today"); await pick("look", "oura");
      const s1 = await thState(q);
      await open("look-insights");
      const s2 = await thState(q), n2 = await q.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .rlk-look.lk-oura").length);
      ok(s0 === "light" && s1 === "dark" && s2 === "dark" && n2 > 0, `fix-looks: on a light page, picking Oura turns the phone, the Theme toggle, the Demo summary and every Oura card dark (before ${s0}, Today ${s1}, Insights ${s2})`);
      const note = await q.evaluate(() => { const b2 = document.querySelector('[data-rx="dinfo"][data-v="look"]'); if (b2.getAttribute("aria-pressed") !== "true") b2.click(); return [...document.querySelectorAll("#rxNotes .rx-opts li")].map((x) => x.textContent).find((t) => /^Oura/.test(t.trim())) || ""; });
      const tryIt = await q.evaluate(() => [...document.querySelectorAll("#rxNotes .rx-line")].map((x) => x.textContent).join(" "));
      ok(/^\s*Oura/.test(note) && /Picking Oura turns the demo dark, unless you've picked a theme or Easy is on/.test(tryIt) && !/[–—!]/.test(note + tryIt), "fix-looks: the Data style note's Try it says picking Oura turns the demo dark, unless a theme is picked or Easy is on");
      await pick("look", "rings");
      const s3 = await thState(q);
      ok(s3 === "light", `fix-looks: leaving Oura for Rings puts the light theme back (${s3})`);
      /* the Easy version draws Easy read, so Oura picked under it leaves the theme alone; Easy off draws Oura, dark */
      await pick("easy", "true"); await pick("look", "oura");
      const e1 = await thState(q);
      await pick("easy", "false");
      const e2 = await thState(q);
      await pick("easy", "true");
      const e3 = await thState(q);
      await pick("easy", "false"); await pick("look", "rings");
      ok(e1 === "light" && e2 === "dark" && e3 === "light" && await thState(q) === "light", `fix-looks: with the Easy version on, picking Oura leaves the theme alone; Easy off turns it dark, Easy on gives light back (${e1}, ${e2}, ${e3})`);
      /* the viewer's own pick holds: Light picked, Oura stays light; Dark picked, Rings stays dark */
      await pick("theme", "light"); await pick("look", "oura");
      const p1 = await thState(q);
      await pick("theme", "dark"); await pick("look", "rings");
      const p2 = await thState(q);
      ok(p1 === "light" && p2 === "dark", `fix-looks: a theme the viewer picked holds: Light then Oura stays light, Dark then Rings stays dark (${p1}, ${p2})`);
      /* a stored Oura pick boots dark, the toggle and the summary with it, and leaving it gives light back */
      await pick("theme", "light"); await pick("look", "oura");
      await q.reload(); await q.waitForSelector(".rx-stage .ap-rx"); await q.waitForTimeout(500);
      await open("look-insights");
      const r1 = await thState(q), look = await q.evaluate(() => document.querySelector(".rx-stage .ap-rx").getAttribute("data-look"));
      await pick("look", "built");
      const r2 = await thState(q);
      ok(look === "oura" && r1 === "dark" && r2 === "light", `fix-looks: a reload with Oura stored boots dark, toggle and summary too, and As built gives light back (${look}: ${r1}, then ${r2})`);
      await c.close();
    }
    /* a dark system: Oura is dark already, and leaving it keeps dark, the page's own theme */
    {
      const { c, q } = await thCtx("dark");
      const pick = thPick(q);
      const d0 = await thState(q);
      await pick("look", "oura");
      const d1 = await thState(q);
      await pick("look", "rings");
      const d2 = await thState(q);
      ok(d0 === "dark" && d1 === "dark" && d2 === "dark", `fix-looks: on a dark page, Oura and then Rings stay dark (${d0}, ${d1}, ${d2})`);
      await c.close();
    }
    ok(!fl.length, `fix-looks: no console errors or module warnings${fl.length ? ": " + fl.slice(0, 2).join(" | ") : ""}`);
  }
  /* ===== end fix-looks ===== */

  /* ===== build-variants: Home Day first and History Calendar (prototype/js/refresh-variants.js) ===== */
  {
    /* its own browser context, so the decisions it picks (stored per viewer) never reach the other checks */
    const vc = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const v = await vc.newPage();
    const ve = [];
    v.on("pageerror", (e) => ve.push(e.message));
    v.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /refresh-variants/.test(m.text()))) ve.push(m.text()); });
    await v.goto(PAGE); await v.waitForSelector(".rx-stage .ap-rx"); await v.waitForTimeout(400);
    const vw = (ms = 450) => v.waitForTimeout(ms);
    const vph = ".rx-stage .ap-rx";
    const vpick = async (k, val) => { await v.evaluate(([k, val]) => { const b2 = document.querySelector(`[data-rx="${k}"][data-v="${val}"]`); if (!b2) throw new Error(`no ${k}=${val} control`); b2.click(); }, [k, val]); await vw(300); };
    const vopen = async (id) => { await v.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await vw(); };
    const vkey = () => v.evaluate(() => window.FLORIN_EXT.api.key());
    const vtext = () => v.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").textContent);
    /* a log added to today straight into the model, then Today redrawn */
    const vadd = (e) => v.evaluate((e) => { const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api; L.add(api.M(), Object.assign({ d: L.TODAY, note: "" }, e)); api.renderTab(true); }, e);
    /* the strongest event today, ranked here on its own: a flag or an alarm feature, then a shift from the usual (a form
       outside the usual forms, a first BM outside the window, a BM past the usual count, No BM), then symptoms by
       strength, strong first, unrated last; the earlier wins a tie. Day first must mark that entry and no other */
    /* fix-variants: a BM's note is read with the BM net (L.alarmsIn's bm option), as the core's RU.alarmOf reads it */
    const vmark = () => v.evaluate(() => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), mode = api.V().form, u = M.usual;
      const x = L.day(M, L.TODAY), es = x ? x.entries : [], bms = es.filter((e) => e.kind === "bm");
      const rank = (e) => {
        if (e.kind === "bm" && (L.FLAGS.some(([k]) => e.flags && e.flags[k]) || L.alarmsIn(e.note || "", { bm: true }).length)) return 4;
        if (e.kind === "sym" && L.alarmsIn(`${e.items.map((i) => i.name).join(". ")}. ${e.note || ""}`).length) return 4;
        if (e.kind === "bm" && u) { const i = bms.indexOf(e); if (L.inForms(M, e, mode) === false || (i === 0 && !L.inWindow(M, e.t)) || i >= u.nHi) return 3; }
        if (e.kind === "nobm" && u) return 3;
        if (e.kind === "sym") { const s = Math.max(0, ...e.items.map((i) => i.s || 0)); return s === 3 ? 2 : 1 + s / 10; }
        return 0;
      };
      const best = es.map((e) => [rank(e), e]).filter(([r]) => r > 0).sort((a, b2) => b2[0] - a[0] || a[1].t - b2[1].t)[0];
      const got = [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .vr-mk")].map((m) => (m.querySelector("[data-id]") || {}).dataset.id);
      return { want: best ? best[1].id : null, rank: best ? best[0] : 0, got, ok: best ? got.length === 1 && got[0] === best[1].id : got.length === 0 };
    });
    /* the day's sentence: FloraScore today against yesterday, from L.score. With membership it says what the marked log
       did on its own: today scored here again without that entry, so it can never credit a part the log didn't move.
       Free stops after the change. On a day with a flag or an alarm feature, no score reading anywhere in the card */
    const vline = () => v.evaluate(() => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), V = api.V();
      const card = document.querySelector(".rx-stage .ap-rx .vr-hl"), all = card ? card.textContent : "";
      const line = (document.querySelector(".rx-stage .ap-rx .vr-hl-line") || {}).textContent || "";
      const x = L.day(M, L.TODAY), es = x ? x.entries : [];
      const alarm = es.some((e) => (e.kind === "bm" && (L.FLAGS.some(([k]) => e.flags && e.flags[k]) || L.alarmsIn(e.note || "", { bm: true }).length)) || (e.kind === "sym" && L.alarmsIn(`${e.items.map((i) => i.name).join(". ")}. ${e.note || ""}`).length));
      const partWord = / from (Timing|How often|Form|Comfort)\b/.test(line);
      if (alarm) return { ok: !!card && !/FloraScore/.test(all) && !partWord, line, alarm };
      if (!M.usual) return { ok: line.includes(`starts on day ${L.LEARN_DAYS}, in ${L.LEARN_DAYS - L.learnDay(M)} day`), line };
      const s = L.score(M, L.TODAY, V.form), y = L.score(M, L.TODAY - 1, V.form);
      if (!s || s.value == null) return { ok: line.includes(`No FloraScore today: ${L.NO_SCORE}.`), line };
      const dv = y && y.value != null ? s.value - y.value : null;
      const want = dv == null ? `FloraScore is ${s.value}.` : dv === 0 ? `FloraScore is ${s.value}, the same as yesterday` : `FloraScore is ${s.value}, ${Math.abs(dv)} ${dv > 0 ? "higher" : "lower"} than yesterday's ${y.value}`;
      const said = /Without the |didn't change it/.test(line);
      if (V.plan === "free") return { ok: line.includes(want) && !said && !partWord, line };
      const mk = document.querySelector(".rx-stage .ap-rx .vr-mk [data-id]"), id = mk && mk.dataset.id;
      if (!id) return { ok: line.includes(want) && !said && !partWord, line };
      const days = M.days.map((z) => (z.d === L.TODAY ? Object.assign({}, z, { entries: z.entries.filter((e) => e.id !== id) }) : z));
      const w = L.score(Object.assign({}, M, { days }), L.TODAY, V.form);
      const effect = !w || w.value == null ? !said : w.value === s.value ? /didn't change it\.$/.test(line) : line.endsWith(`, it would be ${w.value}.`);
      return { ok: line.includes(want) && effect && !partWord, line, without: w && w.value };
    });
    /* every month from the first to now, every day of it: its state is L.facts' state, its label is the full date, a day
       outside the logs is disabled, a gap after the first log is the date alone, before the first log a day is plain.
       What the mark shows is worked out here on its own: a flag or an alarm feature is marked for a clinician (never
       within the usual, and said in the label), on Free a day before the last 7 shows only as logged, else the state.
       build-modules: the mark is the app's one day mark (RU.dayMark): a filled circle within the usual and a filled Gold
       one outside it, an Ink 3 circle logged but not counted, the date alone for a gap (never struck through), a Teal
       ring for a flag, the date alone before the first log */
    const vcal = () => v.evaluate(() => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), mode = api.V().form, U = window.FLORIN_APP.util;
      const free = api.V().plan === "free";
      const alarmIn = (e) => (e.kind === "bm" && (L.FLAGS.some(([k]) => e.flags && e.flags[k]) || L.alarmsIn(e.note || "", { bm: true }).length)) || (e.kind === "sym" && L.alarmsIn(`${e.items.map((i) => i.name).join(". ")}. ${e.note || ""}`).length);
      const circ = (el) => getComputedStyle(el.querySelector(".ap-day-c"));
      const kind = (el) => { const m = el.querySelector(".ap-day"); return m ? (m.className.match(/ap-day--(usual|shift|quiet|none|flag|before)/) || [])[1] : null; };
      const clear = (c) => /rgba\(0, 0, 0, 0\)|transparent/.test(c);
      const lay = document.querySelector(".rx-stage .ap-rx .ap-layer");
      const ym = (d) => { const x = L.dateOf(d); return x.getFullYear() * 12 + x.getMonth(); };
      const first = (M.days.find((x) => x.logged && x.entries.length) || {}).d;
      const bad = [];
      let months = 0, n = 0;
      for (let guard = 0; guard < 24; guard++) {
        const title = lay.querySelector(".vr-cal-t").textContent;
        const bs = [...lay.querySelectorAll(".vr-cal-d")];
        const mi = ym(+bs[0].dataset.v);
        if (title !== `${U.MONL[mi % 12]} ${Math.floor(mi / 12)}`) bad.push(`title ${title}`);
        const len = new Date(Math.floor(mi / 12), mi % 12 + 1, 0).getDate();
        if (bs.length !== len) bad.push(`${title}: ${bs.length} days, not ${len}`);
        bs.forEach((el) => {
          const d = +el.dataset.v, dt = L.dateOf(d), x = L.day(M, d), f = x ? L.facts(M, x, mode) : null;
          n++;
          if (ym(d) !== mi) bad.push(`${title}: day ${d} from another month`);
          const want = f ? f.state : "out";
          if (el.dataset.state !== want) bad.push(`${dt.toDateString()}: ${el.dataset.state} not ${want}`);
          if (el.tagName !== "BUTTON" || !(el.getAttribute("aria-label") || "").startsWith(`${U.DOWL[dt.getDay()]}, ${U.MONL[dt.getMonth()]} ${dt.getDate()}`)) bad.push(`${dt.toDateString()}: label ${el.getAttribute("aria-label")}`);
          if (!f !== (el.getAttribute("aria-disabled") === "true")) bad.push(`${dt.toDateString()}: disabled is wrong`);
          const gap = !!f && !f.logged && !f.pending && first != null && d > first;
          if (gap !== el.classList.contains("is-gap")) bad.push(`${dt.toDateString()}: gap ${el.classList.contains("is-gap")}`);
          if (!!f && !f.logged && !f.pending && (first == null || d < first) && !el.classList.contains("is-plain")) bad.push(`${dt.toDateString()}: not plain before the first log`);
          if ((d === L.TODAY) !== (el.getAttribute("aria-current") === "date" && el.classList.contains("is-today"))) bad.push(`${dt.toDateString()}: today ring`);
          const flag = !!f && f.logged && x.entries.some(alarmIn);
          const shown = !f ? "out" : f.pending ? "pending" : !f.logged ? (gap ? "gap" : "plain") : flag ? "flag" : free && ["usual", "shifted", "unsure"].includes(f.state) && d <= L.TODAY - 7 ? "logged" : f.state;
          if (el.dataset.shown !== shown) bad.push(`${dt.toDateString()}: shows ${el.dataset.shown} not ${shown}`);
          const lab = el.getAttribute("aria-label") || "";
          if (flag && (!/noted for a clinician/.test(lab) || /your usual/.test(lab))) bad.push(`${dt.toDateString()}: flag label ${lab}`);
          const want2 = { usual: "usual", shifted: "shift", unsure: "quiet", nocount: "quiet", logged: "quiet", flag: "flag", gap: "none", pending: "none", plain: "before", out: "before" }[shown];
          if (kind(el) !== want2) bad.push(`${dt.toDateString()}: drawn ${kind(el)} not ${want2}`);
          if ((shown === "usual" || shown === "shifted") && clear(circ(el).backgroundColor)) bad.push(`${dt.toDateString()}: ${shown} is not a filled circle`);
          if (shown === "flag" && (!/inset/.test(circ(el).boxShadow) || !el.querySelector(".ap-day-c svg"))) bad.push(`${dt.toDateString()}: no Teal ring with the info glyph on a flag`);
          if ((shown === "gap" || shown === "plain" || shown === "out") && (!clear(circ(el).backgroundColor) || /line-through/.test(circ(el).textDecorationLine))) bad.push(`${dt.toDateString()}: a ${shown} day isn't the date alone`);
        });
        months++;
        const prev = lay.querySelector('[data-act="vr-cal-m"][data-v="-1"]');
        if (prev.getAttribute("aria-disabled") === "true") break;
        prev.click();
      }
      const want = ym(L.TODAY) - ym(M.start) + 1;
      if (months !== want) bad.push(`${months} months, not ${want}`);
      /* back to this month */
      for (let guard = 0; guard < 24; guard++) { const nx = lay.querySelector('[data-act="vr-cal-m"][data-v="1"]'); if (nx.getAttribute("aria-disabled") === "true") break; nx.click(); }
      return { ok: !bad.length, bad: bad.slice(0, 4), months, n };
    });

    /* the decisions, in the decision sheet's words (notes-page, Oct 28): Home recommends Score first, History Calendar */
    const dec = async (k, val) => { await vpick(k, val); return v.evaluate(() => ({ q: document.querySelector("#rxNotes h2").textContent, rec: (document.querySelector("#rxNotes .rx-rec") || {}).textContent || "", marked: [...document.querySelectorAll("#rxNotes .rx-opt.is-rec .rx-opt-h b")].map((x) => x.textContent).join(","), n: document.querySelectorAll("#rxNotes .rx-opt").length })); };
    const dh = await dec("home", "day"), dc = await dec("history", "calendar");
    ok(dh.q === "What does Today show first?" && dh.n === 2 && dh.marked === "Score first" && /^We recommend Score first\. FloraScore is the centre of Florin/.test(dh.rec), `Home: the sheet's question, both options as blocks, and Score first recommended (${dh.marked})`);
    ok(dc.q === "How should History show past days?" && dc.n === 2 && dc.marked === "Calendar" && /^We recommend Calendar\. One screen a month replaces a long scroll/.test(dc.rec), `History: the sheet's question, both options as blocks, and Calendar recommended (${dc.marked})`);
    await vpick("home", "score"); await vpick("history", "list");
    /* the two screens set their decision, and the page follows: the toggle, the key and the note */
    await vopen("home-day");
    const sh = await v.evaluate(() => ({ p: document.querySelector('[data-rx="home"][data-v="day"]').getAttribute("aria-pressed"), note: document.querySelector("#rxNotes h2").textContent, row: (document.querySelector('[data-rx="screen"][aria-current="true"]') || {}).textContent || "", day: !!document.querySelector(".rx-stage .ap-rx .vr-day") }));
    ok(sh.p === "true" && sh.note === "Home: Day first" && /Home: Day first/.test(sh.row) && sh.day && await vkey() === "home-day", `the Home: Day first screen sets Home to Day first; its row lights and its note shows (${sh.note})`);
    await vopen("hist-cal");
    const sc = await v.evaluate(() => ({ p: document.querySelector('[data-rx="history"][data-v="calendar"]').getAttribute("aria-pressed"), note: document.querySelector("#rxNotes h2").textContent, cal: !!document.querySelector(".rx-stage .ap-rx .vr-cal") }));
    ok(sc.p === "true" && sc.note === "History: Calendar" && sc.cal && await vkey() === "hist-cal", `the History: Calendar screen sets History to Calendar, and its note shows (${sc.note})`);

    /* Day first, in A, B and C: the parts in order, the chip's number from L.score, the strongest event marked */
    for (const form of ["A", "B", "C"]) {
      await vpick("form", form); await vopen("home-day");
      const o = await v.evaluate(() => {
        const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), l = document.querySelector(".rx-stage .ap-rx .ap-layer .vr-day");
        const order = [".vr-top", ".vr-sc-row", ".vr-tl", ".vr-log", ".vr-hl", ".ap-wk", ".ap-ckc"].map((s) => { const el = l.querySelector(s); return el ? [...l.querySelectorAll("*")].indexOf(el) : -1; });
        const s = L.score(M, L.TODAY, api.V().form);
        const h2 = [...l.querySelectorAll("h2")].map((h) => h.textContent);
        return { order, sorted: order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), chip: (l.querySelector(".vr-sc b") || {}).textContent, aria: l.querySelector(".vr-sc").getAttribute("aria-label") || "", score: s && s.value, tiles: l.querySelectorAll('.vr-log [data-act="vr-quick"]').length, bad: /\bNaN\b|\bundefined\b/.test(l.textContent), twice: h2.length !== new Set(h2).size };
      });
      ok(o.sorted && o.chip === String(o.score) && o.tiles >= 5 && !o.bad && !o.twice, `Day first in ${form}: the date and FloraScore chip (${o.chip}), the logs, the log row, the sentence, the week, the check-in, in that order, no heading twice`);
      ok(!/\.\s*\./.test(o.aria) && o.aria.startsWith(`FloraScore ${o.score}.`), `Day first in ${form}: the chip's label reads cleanly: ${o.aria}`);
      const m0 = await vmark(), l0 = await vline();
      ok(m0.ok && l0.ok, `Day first in ${form}: the strongest event is marked (${m0.got.join(",") || "none"}), and the sentence reads today against yesterday: ${l0.line}`);
    }
    /* stronger events, one at a time: each must take the mark */
    await vpick("form", "C"); await vopen("home-day");
    await vadd({ kind: "sym", t: 19.0, items: [{ name: "Cramping", s: 3 }], last: 1 });
    const m1 = await vmark();
    ok(m1.ok && m1.rank === 2, `Day first: a strong symptom outranks a mild one (${m1.got.join(",")})`);
    await vadd({ kind: "bm", t: 19.2, form: 1, word: null, how: {}, dur: null, flags: {} });
    const m2 = await vmark(), l2 = await vline();
    ok(m2.ok && m2.rank === 3 && /outside your usual forms/.test(l2.line) && l2.line.includes("7:12 PM") && l2.ok, `Day first: a BM outside the usual forms outranks a strong symptom, and the sentence leads with it: ${l2.line}`);
    /* what the log did is today scored without it, never a part it didn't move: a third, usual BM moves How often, and
       the sentence still speaks only for the 7:12 PM BM */
    await vadd({ kind: "bm", t: 19.3, form: 4, word: null, how: {}, dur: null, flags: {} });
    const l2b = await vline();
    ok(l2b.ok && /^Your 7:12 PM BM/.test(l2b.line) && l2b.line.includes(`Without the 7:12 PM BM, it would be ${l2b.without}.`) && !/ from (Timing|How often|Form|Comfort)/.test(l2b.line), `Day first: the sentence names no part the log didn't move; it scores today without the 7:12 PM BM (${l2b.without}): ${l2b.line}`);
    await vadd({ kind: "bm", t: 19.3, form: 4, word: null, how: {}, dur: null, flags: { mucus: true } });
    const m3 = await vmark(), l3 = await vline();
    const al = await v.evaluate(() => { const h = document.querySelector(".rx-stage .ap-rx .vr-hl"), a = h && h.querySelector(".ap-ask-alarm"); return { a: !!a, role: a && a.getAttribute("role"), text: a ? a.textContent : "", all: h ? h.textContent : "", chip: (document.querySelector(".rx-stage .ap-rx .vr-mk .ap-chip--info") || {}).textContent }; });
    ok(m3.ok && m3.rank === 4 && al.a && al.role === "note" && /When to see a clinician/.test(al.text) && /Primary care/.test(al.text) && al.chip === "Clinician note", "Day first: a flag outranks everything, marked Clinician note, with the Teal note to primary care");
    ok(l3.ok && l3.alarm && !/FloraScore/.test(al.all), `Day first, a flag today: no score reading anywhere in the card, banner or sentence (${l3.line || "no sentence"})`);
    /* fix-variants: on a flag day the chip keeps L.score's number (its detail shows the same one) but reads it against
       nothing, on screen or in its label, as the card under it and the Home note say. The reviewer's state: Sarah, a
       Watery BM with blood at 7:00 PM, which read "Within your usual range" before */
    {
      const fx = async () => v.evaluate(() => { const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), c = document.querySelector(".rx-stage .ap-rx .vr-sc"), w = document.querySelector(".rx-stage .ap-rx .vr-sc-w"), s = L.score(M, L.TODAY, api.V().form); return { num: (c.querySelector("b") || {}).textContent, score: s && s.value, word: w ? w.textContent : "", aria: c.getAttribute("aria-label") || "" }; });
      const f1 = await fx();
      ok(f1.num === String(f1.score) && f1.word === "Not read against your usual today: a log is noted for a clinician" && !/usual range|Within|above|below/i.test(f1.word + f1.aria) && f1.aria.startsWith(`FloraScore ${f1.score}. Not read against your usual today`), `Day first, a mucus flag today: the chip keeps FloraScore ${f1.score} and reads it against nothing (${f1.aria})`);
      await v.evaluate(() => window.FLORIN_EXT.api.set("data", "est")); await vw();
      await vopen("home-day");
      const f0 = await fx();
      await vadd({ kind: "bm", t: 19, form: 7, word: null, how: {}, dur: null, flags: { blood: true } });
      const f2 = await fx();
      await vpick("plan", "free"); await vopen("home-day");
      const f3 = await fx();
      await vpick("plan", "member");
      ok(/usual range$/.test(f0.word) && f2.num === String(f2.score) && !/usual range/.test(f2.word + f2.aria) && /noted for a clinician/.test(f2.word) && !/usual range/.test(f3.word + f3.aria) && f3.num === String(f3.score), `Day first, a blood flag at 7:00 PM: "${f0.word}" before, then FloraScore ${f2.score} read against nothing, on Member and Free ("${f2.word}")`);
    }
    /* end fix-variants */
    /* a tile on Today logs the BM in one tap, and focus lands on the new row */
    await v.evaluate(() => window.FLORIN_EXT.api.set("data", "est")); await vw();
    const n0 = await v.evaluate(() => window.FLORIN_RUI.bmCount(window.FLORIN_EXT.api.M()));
    await v.click(`${vph} .vr-log .ap-fm-b[data-form="4"]`); await vw(600);
    const q1 = await v.evaluate(() => { const a = document.activeElement, M = window.FLORIN_EXT.api.M(), L = window.FLORIN_LOGS; const bms = L.day(M, L.TODAY).entries.filter((e) => e.kind === "bm"); return { n: window.FLORIN_RUI.bmCount(M), toast: document.querySelector(".rx-stage .ap-rx .ap-tst").textContent, focus: a && a.dataset ? a.dataset.id : null, last: bms[bms.length - 1].id }; });
    ok(q1.n === n0 + 1 && /BM saved/.test(q1.toast) && q1.focus === q1.last, `Day first, quick tiles: a tile saves the BM in one tap, and focus lands on its row (${q1.focus})`);
    /* the chip opens FloraScore's detail; on Free, the paywall, and the sentence stops before why it moved */
    await vopen("home-day");
    await v.click(`${vph} .vr-sc`); await vw();
    ok(await vkey() === "i-score", "Day first: the FloraScore chip opens its detail");
    await vpick("plan", "free"); await vopen("home-day");
    const fr = await v.evaluate(() => (document.querySelector(".rx-stage .ap-rx .vr-sc") || {}).dataset || {});
    const lf = await vline();
    ok(fr.act === "pay" && fr.pay === "score" && lf.ok, `Day first, Free: the chip opens the paywall, and the sentence says the change without why: ${lf.line}`);
    await vpick("plan", "member");
    /* the BM logging decision: the full form only means no tile and no one-tap save on Today, and a button to the form */
    await vpick("bmUI", "full"); await vopen("home-day");
    const fu = await v.evaluate(() => { const l = document.querySelector(".rx-stage .ap-rx .ap-layer"); return { tiles: l.querySelectorAll(".ap-fm-b, [data-act='vr-quick'], [data-act='quick-bm']").length, btn: !!l.querySelector('.vr-log [data-act="open-bm"]') }; });
    await v.click(`${vph} .vr-log [data-act="open-bm"]`); await vw();
    const fo = await v.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return !!o && !!o.querySelector(".ap-fsh") && /Log a BM/.test(o.querySelector("h2").textContent); });
    ok(fu.tiles === 0 && fu.btn && fo, `Day first, full form only: no tiles on Today, and Log a BM opens the form (${fu.tiles} tiles)`);
    await v.keyboard.press("Escape"); await vw();
    await vpick("bmUI", "quick");
    /* the check-in off: Day first never names it; the Easy version takes precedence over Day first */
    await vpick("checkin", "false"); await vopen("home-day");
    ok(!/check-in/i.test(await vtext()) && !(await v.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-ckc"))), "Day first, check-in off: no check-in card and no word of it");
    await vpick("checkin", "true");
    await v.evaluate(() => window.FLORIN_EXT.api.set("easy", true)); await vw();
    const ez = await v.evaluate(() => ({ day: !!document.querySelector(".rx-stage .ap-rx .vr-day"), key: window.FLORIN_EXT.api.key() }));
    ok(!ez.day && ez.key !== "home-day", `with the Easy version on, Day first steps aside for it (key ${ez.key})`);
    /* opening Home: Day first leaves the Easy version alone: it picks Day first and says Easy takes precedence */
    await vopen("home-day");
    const ez2 = await v.evaluate(() => ({ V: window.FLORIN_EXT.api.V(), toast: (document.querySelector(".rx-stage .ap-rx .ap-tst") || {}).textContent || "", p: document.querySelector('[data-rx="easy"][aria-pressed="true"]').dataset.v }));
    ok(ez2.V.easy === true && ez2.p === "true" && ez2.V.home === "day" && /Easy version is on/.test(ez2.toast), `opening Home: Day first keeps Easy on, picks Day first, and says why (${ez2.toast})`);
    await v.evaluate(() => window.FLORIN_EXT.api.set("easy", false)); await vw();
    /* new, day 5, and just joined: Day first reads right, only symptoms and flags can stand out, the calendar starts plain */
    for (const data of ["new", "fresh"]) {
      await vpick("data", data); await vopen("home-day");
      const t = await vtext(), l5 = await vline(), m5 = await vmark();
      const d5 = await v.evaluate(() => window.FLORIN_LOGS.learnDay(window.FLORIN_EXT.api.M()));
      const opens = await v.evaluate(() => document.querySelectorAll('.rx-stage .ap-rx .vr-log [data-act="open-bm"].ap-fm-b').length);
      ok(!/\bNaN\b|\bundefined\b/.test(t) && t.includes(`Today is day ${d5}.`) && l5.ok && m5.ok && opens >= 5, `Day first on ${data === "new" ? "day 5" : "day 1"}: the chip says day ${d5}, the sentence says when FloraScore starts, the tiles open the form: ${l5.line}`);
      const once = await v.evaluate(() => { const l = document.querySelector(".rx-stage .ap-rx .ap-layer"); const h2 = [...l.querySelectorAll("h2")].map((h) => h.textContent); return { twice: h2.length !== new Set(h2).size, nothing: (l.textContent.match(/Nothing logged yet/g) || []).length, h2 }; });
      ok(!once.twice && once.nothing <= 1, `Day first on ${data === "new" ? "day 5" : "day 1"}, nothing logged today: no heading twice, "Nothing logged yet" at most once (${once.h2.join(" | ")})`);
      await vpick("plan", "free"); await vopen("home-day");
      const fc = await v.evaluate(() => { const c = document.querySelector(".rx-stage .ap-rx .vr-sc"); return { tag: c.tagName, act: c.dataset.act || null }; });
      ok(fc.tag !== "BUTTON" && !fc.act, `Day first on Free before day ${14}: the FloraScore chip is plain, with no paywall for a score that doesn't exist yet (${fc.tag})`);
      await vpick("plan", "member"); await vopen("home-day");
      await vadd({ kind: "sym", t: 19.5, items: [{ name: "Belly pain", s: 2 }], last: 1 });
      const m6 = await vmark();
      ok(m6.ok && m6.got.length === 1, `Day first on ${data === "new" ? "day 5" : "day 1"}: a symptom logged now is the one marked`);
      await vopen("hist-cal");
      const c5 = await vcal();
      ok(c5.ok, `Calendar on ${data === "new" ? "day 5" : "day 1"}: every day's state matches L.facts, and days before the first log are plain (${c5.n} days${c5.bad.length ? ": " + c5.bad.join("; ") : ""})`);
      if (data === "fresh") {
        await v.evaluate(() => window.FLORIN_EXT.api.set("data", "fresh")); await vopen("hist-cal");
        const pl = await v.evaluate(() => { const l = document.querySelector(".rx-stage .ap-rx .ap-layer"); return { marked: l.querySelectorAll(".vr-cal-d:not(.is-plain):not(.is-pending):not(.is-out)").length, gaps: l.querySelectorAll(".vr-cal-d.is-gap").length, today: !!l.querySelector(".vr-cal-d.is-today"), nav: [...l.querySelectorAll('[data-act="vr-cal-m"]')].every((x) => x.getAttribute("aria-disabled") === "true") }; });
        ok(!pl.marked && !pl.gaps && pl.today && pl.nav, "Calendar, just joined: before the first log every day is plain, today is ringed, and there's no other month to go to");
      }
    }
    await vpick("data", "est");

    /* the calendar, in A, B and C and for another person: every day of every month matches L.facts */
    for (const [who, form] of [["sarah", "A"], ["sarah", "B"], ["sarah", "C"], ["marcus", "C"]]) {
      await vpick("persona", who); await vpick("form", form); await vopen("hist-cal");
      const c = await vcal();
      ok(c.ok, `Calendar, ${who} in ${form}: ${c.months} months, ${c.n} days, every state matches L.facts${c.bad.length ? ": " + c.bad.join("; ") : ""}`);
    }
    await vpick("persona", "sarah");
    /* a tapped day: drawn by RU.historyDay, with Add to this day; the arrow keys move between days and months */
    await vopen("hist-cal");
    const dd = await v.evaluate(() => window.FLORIN_LOGS.TODAY - 5);
    await v.click(`${vph} .vr-cal-d[data-v="${dd}"]`); await vw();
    const td = await v.evaluate((dd) => { const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M(), x = L.day(M, dd), l = document.querySelector(".rx-stage .ap-rx .vr-cal-day"); return { h: (l.querySelector("h2") || {}).textContent, rows: l.querySelectorAll('.ap-tl [data-act="edit"]').length, n: x.entries.length, want: window.FLORIN_RUI.dayName(dd), add: (l.querySelector('[data-act="plus-day"]') || {}).dataset, pressed: document.querySelector(`.rx-stage .ap-rx .vr-cal-d[data-v="${dd}"]`).getAttribute("aria-pressed"), focus: document.activeElement && document.activeElement.dataset.v }; }, dd);
    ok(td.h === td.want && td.rows === td.n && td.add && +td.add.v === dd && td.pressed === "true" && +td.focus === dd, `Calendar: a tapped day shows its ${td.n} logs as the list draws them, with Add to this day, and keeps focus (${td.h})`);
    await v.click(`${vph} .vr-cal-day [data-act="plus-day"]`); await vw();
    ok(await v.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return !!o && /Catching up/.test(o.textContent); }), "Calendar: Add to this day opens plus for that day");
    await v.keyboard.press("Escape"); await vw();
    /* from ten days back, so every move stays between the first day and today */
    const kd0 = await v.evaluate(() => window.FLORIN_LOGS.TODAY - 10);
    await v.click(`${vph} .vr-cal-d[data-v="${kd0}"]`); await vw();
    await v.focus(`${vph} .vr-cal-d[data-v="${kd0}"]`);
    const kv = async (k) => { await v.keyboard.press(k); await vw(200); return v.evaluate(() => ({ d: +document.activeElement.dataset.v, t: document.querySelector(".rx-stage .ap-rx .vr-cal-t").textContent, tab0: [...document.querySelectorAll('.rx-stage .ap-rx .vr-cal-d[tabindex="0"]')].map((x) => +x.dataset.v) })); };
    const k1 = await kv("ArrowRight"), k2 = await kv("ArrowDown"), k3 = await kv("ArrowUp"), k4 = await kv("ArrowUp");
    ok(k1.d === kd0 + 1 && k2.d === kd0 + 8 && k3.d === kd0 + 1 && k4.d === kd0 - 6 && k1.tab0.join() === String(kd0 + 1) && /September/.test(k4.t) && /October/.test(k3.t), `Calendar: the arrow keys move a day and a week, one day in the tab order, and into the month before (${[k1, k2, k3, k4].map((k) => k.d).join(", ")})`);
    /* keys stay between the first day and today: never onto a day still to come, and Page Up past the start lands on the
       first day, picked, so focus and the day shown agree */
    await vopen("hist-cal");
    await v.focus(`${vph} .vr-cal-d.is-today`);
    const kt = await v.evaluate(() => window.FLORIN_LOGS.TODAY);
    const kr = await kv("ArrowRight"), kd = await kv("ArrowDown");
    ok(kr.d === kt && kd.d === kt, `Calendar: from today, Right and Down keep focus on today, never on a day still to come (${kr.d}, ${kd.d})`);
    for (let i = 0; i < 6; i++) await kv("PageUp");
    const ks = await v.evaluate(() => { const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M(), a = document.activeElement; return { d: +a.dataset.v, dis: a.getAttribute("aria-disabled"), start: M.start, h: (document.querySelector(".rx-stage .ap-rx .vr-cal-day h2") || {}).textContent, want: window.FLORIN_RUI.dayName(M.start) }; });
    ok(ks.d === ks.start && ks.dis !== "true" && ks.h === ks.want, `Calendar: Page Up past the first month lands on the first day, and the day shown is the one focused (${ks.h})`);
    /* the screen opens on this month and today, whatever month was looked at last */
    await vopen("hist-cal");
    const ro = await v.evaluate(() => { const L = window.FLORIN_LOGS, U = window.FLORIN_APP.util, t = L.dateOf(L.TODAY); return { t: document.querySelector(".rx-stage .ap-rx .vr-cal-t").textContent, want: `${U.MONL[t.getMonth()]} ${t.getFullYear()}`, sel: +(document.querySelector('.rx-stage .ap-rx .vr-cal-d[aria-pressed="true"]') || {}).dataset.v, today: L.TODAY }; });
    ok(ro.t === ro.want && ro.sel === ro.today, `Calendar: opening History: Calendar again shows ${ro.want} with today picked (${ro.t})`);
    /* a flag on a past day: marked for a clinician in Teal, said in its label, never read against the usual; a day with
       only a symptom logged gets its own mark, Nothing logged on BMs */
    const vfd = await v.evaluate(() => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M();
      const d = L.TODAY - 5;
      L.add(M, { kind: "bm", d, t: 8, form: 4, word: null, how: {}, dur: null, flags: { blood: true }, note: "" });
      const gap = M.days.filter((x) => !x.logged && x.d < L.TODAY && x.d >= L.TODAY - 10).map((x) => x.d)[0];
      if (gap != null) L.add(M, { kind: "sym", d: gap, t: 14, items: [{ name: "Bloating", s: 1 }], last: 1, note: "" });
      api.renderTab(true);
      const el = document.querySelector(`.rx-stage .ap-rx .vr-cal-d[data-v="${d}"]`), g = gap != null ? document.querySelector(`.rx-stage .ap-rx .vr-cal-d[data-v="${gap}"]`) : null;
      return { d, gap, label: el.getAttribute("aria-label"), shown: el.dataset.shown, gshown: g && g.dataset.shown, legend: document.querySelector(".rx-stage .ap-rx .vr-cal-lg").textContent, sum: document.querySelector(".rx-stage .ap-rx .vr-cal-sum").textContent };
    });
    const cf = await vcal();
    ok(vfd.shown === "flag" && /^[A-Za-z]+, [A-Za-z]+ \d+: blood noted for a clinician/.test(vfd.label) && !/your usual/.test(vfd.label) && /Noted for a clinician/.test(vfd.legend) && /1 noted for a clinician/.test(vfd.sum) && cf.ok, `Calendar: a blood flag on a past day is noted for a clinician, in the label, the legend and the month, and never read (${vfd.label})${cf.bad.length ? ": " + cf.bad.join("; ") : ""}`);
    /* build-modules: a day with only a symptom is logged but not counted, an Ink 3 circle, in the legend's shared words */
    ok(vfd.gap == null || (vfd.gshown === "nocount" && /Not counted/.test(vfd.legend)), `Calendar: a day with only a symptom logged is drawn as not counted, and the legend says Not counted (${vfd.gshown})`);
    /* the filter chips stay: a filter dims the days without that kind of log */
    await vopen("hist-cal");
    await v.click(`${vph} .ap-hi-filter[data-v="sym"]`); await vw();
    const fl = await v.evaluate(() => { const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M(); const bs = [...document.querySelectorAll(".rx-stage .ap-rx .vr-cal-d")]; const bad = bs.filter((el) => { const x = L.day(M, +el.dataset.v); if (!x) return el.classList.contains("is-dim"); const want = !(x.logged && x.entries.some((e) => e.kind === "sym")); return want !== el.classList.contains("is-dim"); }); return { bad: bad.length, n: document.querySelectorAll(".rx-stage .ap-rx .ap-hi-filter").length, on: (document.querySelector('.rx-stage .ap-rx .ap-hi-filter[aria-pressed="true"]') || {}).textContent }; });
    ok(!fl.bad && fl.n === 5 && fl.on === "Symptoms", `Calendar: the five filter chips stay, and Symptoms dims every day without one (${fl.bad} wrong)`);
    await v.click(`${vph} .ap-hi-filter[data-v="all"]`); await vw();
    /* fix-variants: the calendar's symptom ticks, the chip's sentence, and what the calendar's notes say about marks */
    {
      /* a moderate symptom, and one logged without a strength, each on a past day this month that had none */
      const tkd = await v.evaluate(() => {
        const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), mo = L.dateOf(L.TODAY).getMonth();
        const days = M.days.filter((x) => x.d < L.TODAY && L.dateOf(x.d).getMonth() === mo && x.logged && x.entries.length && !x.entries.some((e) => e.kind === "sym"));
        if (days[0]) L.add(M, { kind: "sym", d: days[0].d, t: 15, items: [{ name: "Cramping", s: 2 }], last: 1, note: "" });
        if (days[1]) L.add(M, { kind: "sym", d: days[1].d, t: 15.5, items: [{ name: "Gas", s: 0 }], last: 1, note: "" });
        api.renderTab(true);
        return { s2: days[0] ? days[0].d : null, s0: days[1] ? days[1].d : null };
      });
      /* build-modules: a symptom day is one Teal square under the day (RU.dayMark), whatever the strength: the square
         holds 3:1 on the card and on the picked day, every square is the same colour, and the strength is said in the
         day's label, a symptom logged without one as "no strength said", never mild */
      const vtk = (tkd) => v.evaluate((tkd) => {
        const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g = cv.getContext("2d", { willReadFrequently: true });
        const px = (...fills) => { g.clearRect(0, 0, 1, 1); fills.forEach((f) => { g.fillStyle = f; g.fillRect(0, 0, 1, 1); }); const d = g.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
        const lum = (c) => { const [r, gg, bb] = c.match(/\d+/g).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * gg + 0.0722 * bb; };
        const cr = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const lay = document.querySelector(".rx-stage .ap-rx .ap-layer"), card = getComputedStyle(lay.querySelector(".vr-cal")).backgroundColor;
        const picked = getComputedStyle(lay.querySelector('.vr-cal-d[aria-pressed="true"]')).backgroundColor;
        const sq = [...lay.querySelectorAll(".vr-cal-g .ap-day-s.is-on")].map((t) => getComputedStyle(t).backgroundColor);
        const teal = (() => { const i = document.createElement("i"); i.style.background = "var(--ap-teal)"; lay.appendChild(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; })();
        const c = sq[0] || teal;
        const lab = (d) => (d == null ? "" : lay.querySelector(`.vr-cal-d[data-v="${d}"]`).getAttribute("aria-label"));
        const lg = lay.querySelector(".vr-cal-lg");
        return { n: sq.length, one: sq.every((x) => x === teal), onCard: +cr(px(card, c), px(card)).toFixed(2), onPicked: +cr(px(card, picked, c), px(card, picked)).toFixed(2), s0Label: lab(tkd.s0), s2Label: lab(tkd.s2), legend: !!lg && !!lg.querySelector(".ap-day-k--sym") && /Symptoms/.test(lg.textContent), old: !!lay.querySelector(".vr-t, .vr-cal-mk") };
      }, tkd);
      for (const theme of ["light", "dark"]) {
        await vpick("theme", theme); await vw(200);
        const tk = await vtk(tkd);
        ok(tk.n > 0 && tk.one && tk.onCard >= 3 && tk.onPicked >= 3 && tk.legend && !tk.old, `Calendar, ${theme}: every symptom day is one Teal square, whatever the strength, at 3:1 or more on the card and the picked day, named Symptoms in the legend (${tk.n} squares, ${tk.onCard}/${tk.onPicked})`);
        if (theme === "light") ok((tkd.s0 == null || (/gas with no strength said/.test(tk.s0Label) && !/mild gas/.test(tk.s0Label))) && (tkd.s2 == null || /moderate cramping/.test(tk.s2Label)), `Calendar: a day's label says each symptom's strength in words, a symptom logged without one says so (${tk.s0Label} | ${tk.s2Label})`);
      }
      await vpick("theme", "light");
      /* the chip's sentence sits on its own line under the chip, for 12 weeks, day 5 and day 1 */
      const under = [];
      for (const data of ["est", "new", "fresh"]) {
        await vpick("data", data); await vopen("home-day");
        under.push(await v.evaluate((data) => { const r = document.querySelector(".rx-stage .ap-rx .vr-sc-row"), c = r.querySelector(".vr-sc"), w = r.querySelector(".vr-sc-w"); if (!w) return `${data}: no sentence`; const cb = c.getBoundingClientRect(), wb = w.getBoundingClientRect(), rb = r.getBoundingClientRect(); return wb.top >= cb.bottom - 1 && Math.abs(wb.width - (rb.width - parseFloat(getComputedStyle(r).paddingLeft) - parseFloat(getComputedStyle(r).paddingRight))) <= 1 ? "" : `${data}: beside the chip`; }, data));
      }
      await vpick("data", "est");
      ok(under.every((x) => !x), `Day first: the chip's sentence takes its own line under the chip with 12 weeks of logs, on day 5 and on day 1${under.filter(Boolean).length ? ": " + under.filter(Boolean).join("; ") : ""}`);
      /* the calendar's notes (notes-page, Oct 28: plain): each mark in a few words; with a data style or the Easy version
         on, that Today's week is drawn in that style, so its marks differ. The decision's Calendar block names its marks */
      const calNote = async () => { await vopen("hist-cal"); return v.evaluate(() => (document.querySelector("#rxNotes .rx-note-lede") || {}).textContent || ""); };
      const nb = await calNote();
      await vpick("look", "rings"); const nr = await calNote();
      await vpick("look", "built");
      await v.evaluate(() => window.FLORIN_EXT.api.set("easy", true)); await vw();
      const ne = await calNote();
      await v.evaluate(() => window.FLORIN_EXT.api.set("easy", false)); await vw();
      await vpick("history", "calendar");
      const nd = await v.evaluate(() => { const b2 = document.querySelector('[data-rx="dinfo"][data-v="history"]'); if (b2 && b2.getAttribute("aria-pressed") !== "true") b2.click(); return [...document.querySelectorAll("#rxNotes .rx-opt")].map((o) => o.textContent).find((t) => /^\s*Calendar/.test(t)) || ""; });
      /* build-modules: the calendar's marks are Today's card's, said in the note's shared words */
      const marks = (t) => /each day marked as on Today's card: a Plum circle within the person's usual, a Gold circle outside it, a grey circle for a day logged but not counted, and the date alone for a day with nothing logged\. A Teal ring marks a day noted for a clinician, and a Teal square a day with symptoms\./.test(t);
      ok(marks(nb) && !/style/.test(nb) && /Today's week is in the Rings style, so its marks differ\./.test(nr) && /Today's week is in the Easy read style, so its marks differ\./.test(ne) && /a filled mark for a day within the person's usual, a ring for a day outside it, and a struck date for a day with nothing logged|Plum circle[^.]*within the person's usual[^.]*Gold circle[^.]*outside it[^.]*the date alone for a day with nothing logged/.test(nd), "Calendar notes: each mark in plain words, and with a data style or Easy on, that Today's week differs; the decision's Calendar block names its marks");
    }
    /* end fix-variants */
    /* both themes and Free */
    await vpick("theme", "dark"); await vpick("plan", "free"); await vopen("hist-cal");
    const dk = await v.evaluate(() => ({ cal: !!document.querySelector(".rx-stage .ap-rx .vr-cal-g"), rep: (document.querySelector(".rx-stage .ap-rx .ap-hist-rep") || {}).dataset, sum: document.querySelector(".rx-stage .ap-rx .vr-cal-sum").textContent, pay: (document.querySelector('.rx-stage .ap-rx .vr-cal [data-act="pay"]') || {}).dataset }));
    /* Free reads the last 7 days against the usual, as Insights does; earlier days show only as logged */
    const fcal = await vcal();
    ok(fcal.ok && /On Free, days are read against your usual for the last 7 days/.test(dk.sum) && dk.pay && dk.pay.pay === "range", `Calendar, Free and dark: days before the last 7 show only as logged, the month says so, and membership is one tap (${dk.sum})${fcal.bad.length ? ": " + fcal.bad.join("; ") : ""}`);
    await vopen("home-day");
    const dk2 = await vline();
    ok(dk.cal && dk.rep && dk.rep.act === "pay" && dk2.ok, "Calendar and Day first, dark and Free: drawn, the clinician report behind membership");
    ok(!ve.length, `Day first and Calendar: no console errors or module warnings${ve.length ? ": " + ve.slice(0, 2).join(" | ") : ""}`);
    await vc.close();
  }
  /* ===== end build-variants ===== */

  /* ===== build-profile: Profile and onboarding (prototype/js/refresh-profile.js) ===== */
  {
    /* its own browser context, so the decisions it changes (onboarding, Version, theme) never reach the other checks */
    const pc = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const q = await pc.newPage();
    const pe = [];
    q.on("pageerror", (e) => pe.push(e.message));
    q.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /Florin profile module/.test(m.text()))) pe.push(m.text()); });
    await q.goto(PAGE); await q.waitForSelector(".rx-stage .ap-rx"); await q.waitForTimeout(400);
    const pw = (ms = 400) => q.waitForTimeout(ms);
    const ppick = async (k, v) => { await q.evaluate(([k, v]) => { const b2 = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (!b2) throw new Error(`no ${k}=${v} control`); if (b2.getAttribute("aria-pressed") !== "true") b2.click(); }, [k, v]); await pw(300); };
    const popen = async (id) => { await q.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await pw(); };
    /* a tap inside the top overlay (or the screen when none is open) */
    const ptap = async (sel, ms = 250) => { await q.evaluate((s) => { const ph2 = document.querySelector(".rx-stage .ap-rx"), o = [...ph2.querySelectorAll(".ap-o:not(.is-out)")].pop() || ph2; const x = o.querySelector(s); if (!x) throw new Error(`no ${s}`); x.click(); }, sel); await pw(ms); };
    const pkey = () => q.evaluate(() => window.FLORIN_EXT.api.key());
    const ptop = () => q.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); if (!o) return null; const s = o.querySelector(".pf-onb"); return { type: [...o.classList].find((c) => c.indexOf("ap-o--t-") === 0).slice(8), text: o.textContent, step: s ? s.dataset.step : null, at: s ? +s.dataset.at : null, of: s ? +s.dataset.of : null, sub: s ? s.querySelector(".ap-fsh-t p").textContent : null }; });
    /* the step's words, as the claims check reads a screen: disclaimers and drawings left out */
    const stepText = () => q.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); const c = o.cloneNode(true); c.querySelectorAll(".ap-fine, [data-disclaimer], svg").forEach((n) => n.remove()); const t = c.textContent.replace(/\s+/g, " "); return { t, all: o.textContent, hits: window.FLORIN_REFRESH_CHECK(t).map((h) => h.text) }; });
    const NAMED = /bristol|rome foundation|ibs-sss|\bIBD\b|crohn|colitis|\bnormal\b|\bideal\b|healthy/i;
    const pv = () => q.evaluate(() => window.FLORIN_EXT.api.V());

    /* the hooks: the avatar opens Profile, both onboarding options are claimed On the phone, the group is listed */
    await popen("today");
    await q.click(`${ph} .ap-avatar`); await pw();
    const t0 = await ptop();
    ok(t0 && t0.type === "pf" && await pkey() === "profile" && /Your usual/.test(t0.text) && /About you/.test(t0.text), "profile: the Today avatar opens Profile, a full screen");
    await ptap('[data-act="close"]');
    ok(!(await ptop()) && await q.evaluate(() => document.activeElement && document.activeElement.matches(".ap-avatar")), "profile: Back closes it, and focus returns to the avatar");
    const grp = await q.evaluate(() => { const g = [...document.querySelectorAll(".rx-nav-g")].find((x) => /Onboarding and profile/.test(x.textContent)); return g ? [...g.querySelectorAll('[data-rx="screen"]')].map((x) => x.dataset.v).join(",") : ""; });
    ok(grp === "onb-short,onb-full,onb-sign,profile,profile-day1", `profile: Screens has the Onboarding and profile group (${grp})`);
    await ppick("onboard", "full"); await ppick("onboard", "short");
    /* notes-page (Oct 28): the decision in the sheet's shape, with each flow's step count read from the flow */
    const dn = await q.evaluate(() => ({ t: document.querySelector("#rxNotes h2").textContent, rec: (document.querySelector("#rxNotes .rx-rec") || {}).textContent || "", ba: document.querySelectorAll("#rxNotes .rx-ba li").length, blocks: [...document.querySelectorAll("#rxNotes .rx-opt")].map((o) => o.textContent) }));
    ok(dn.t === "How much do we ask a new person?" && /^We recommend Short, and asking the rest when it matters/.test(dn.rec) && !dn.ba && dn.blocks.length === 2 && /\d+ steps in under two minutes/.test(dn.blocks[0]) && /survey in \d+ steps/.test(dn.blocks[1]), `profile: the onboarding decision in the sheet's shape, recommending Short (${dn.t})`);

    /* the Onboarding toggle shows its flow on the phone: from Today it opens, an open one moves to the other flow, and
       a Screens row opens exactly one */
    await popen("today");
    await ppick("onboard", "full");
    const tg1 = await ptop(), tgN = await q.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-o--t-onb:not(.is-out)").length), tgNote = await q.evaluate(() => document.querySelector("#rxNotes h2").textContent);
    await ppick("onboard", "short");
    const tg2 = await ptop();
    await popen("onb-full");
    const tg3 = await q.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-o--t-onb:not(.is-out)").length);
    ok(tg1 && tg1.type === "onb" && tg1.step === "welcome" && /Full survey/.test(tg1.text) && tgN === 1 && tgNote === "How much do we ask a new person?" && /Getting started/.test(tg2.text) && tg3 === 1, `profile: the Onboarding toggle opens its flow on the phone with the decision's note beside it, switches an open one, and a Screens row opens one (${tgN}, ${tg3})`);
    /* switched part way, a flow lands on the next step the other flow has, never back on Welcome */
    { let k = 0; while ((await ptop()).step !== "usual" && k++ < 8) await ptap('[data-act="onb-skip"]', 150); }
    await ppick("onboard", "short");
    const sw1 = (await ptop()).step;
    { let k = 0; while ((await ptop()).step !== "isnt" && k++ < 8) await ptap('[data-act="onb-skip"]', 150); }
    await ppick("onboard", "full");
    const sw2 = (await ptop()).step;
    ok(sw1 === "periods" && sw2 === "usual", `onboarding: switched part way, the flow lands on the next step it has, never Welcome (usual > ${sw1}, isnt > ${sw2})`);
    /* Escape goes back a step, never out of onboarding part way; on Welcome it closes, as Welcome's Close does
       (fix-profile: the page opens every flow, so Welcome must always be able to leave it, logs untouched) */
    await q.focus(".rx-stage .ap-rx .ap-o:not(.is-out) .ap-ck-q h3"); await q.keyboard.press("Escape"); await pw();
    const es1 = await ptop();
    await popen("onb-short"); await q.focus(".rx-stage .ap-rx .ap-o:not(.is-out) .ap-ck-q h3"); await q.keyboard.press("Escape"); await pw();
    const es2 = await ptop(), esm = await q.evaluate(() => window.FLORIN_EXT.api.M().mode);
    ok(es1 && es1.type === "onb" && es1.step === "goals" && es2 === null && esm === "est", `onboarding: Escape goes back a step part way, and on Welcome closes it with the logs as they were (usual > ${es1 && es1.step}, welcome > ${es2 ? es2.step : "closed"}, ${esm})`);
    await ppick("onboard", "short"); await popen("today");

    /* Profile's usual figures are the model's, in A, B and C, for each person */
    for (const [who, f] of [["sarah", "A"], ["sarah", "B"], ["sarah", "C"], ["marcus", "C"], ["alex", "B"]]) {
      await ppick("persona", who); await ppick("form", f);
      await popen("profile");
      const r = await q.evaluate((f) => {
        const L = window.FLORIN_LOGS, T = window.FLORIN_APP.util.fmtTime, M = window.FLORIN_EXT.api.M(), u = M.usual, su = L.scoreUsual(M, f);
        const get = (k) => (document.querySelector(`.rx-stage .ap-rx [data-pf-usual="${k}"] .pf-us-v`) || {}).textContent;
        const want = { timing: `${T(u.tLo)} to ${T(u.tHi)}`, often: u.nLo === u.nHi ? `${u.nLo} BM${u.nLo === 1 ? "" : "s"} a day` : `${u.nLo} to ${u.nHi} BMs a day`, forms: L.usualFormsText(M, f), score: su ? `${su[0]} to ${su[1]}` : "Not enough scored days yet" };
        return Object.keys(want).map((k) => [k, get(k), want[k]]);
      }, f);
      ok(r.every(([, a, w]) => a === w), `profile, ${who} in ${f}: the usual figures are the model's (${r.map(([k, a]) => `${k} ${a}`).join("; ")})`);
    }
    const since = await q.evaluate(() => { const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M(), x = M.days.find((d) => d.logged && d.entries.length), dt = L.dateOf(x.d), U = window.FLORIN_APP.util; return [document.querySelector('.rx-stage .ap-rx [data-pf="since"]').textContent, `Logging since ${U.MONL[dt.getMonth()]} ${dt.getDate()}`]; });
    ok(since[0] === since[1], `profile: the first log date is the model's (${since[0]})`);
    await ppick("persona", "sarah"); await ppick("form", "C");

    /* Profile on day 1, and new day 5: the learning state says what arrives on day 14 */
    await popen("profile-day1");
    const d1 = await q.evaluate(() => ({ text: document.querySelector(".rx-stage .ap-rx .ap-o:not(.is-out):last-child").textContent, usual: document.querySelectorAll(".rx-stage .ap-rx [data-pf-usual]").length, mode: window.FLORIN_EXT.api.M().mode, data: (document.querySelector('[data-rx="data"][aria-pressed="true"]') || {}).dataset.v }));
    ok(d1.mode === "est" && d1.data === "est" && /Day 1 of 14/.test(d1.text) && /In 13 more days/.test(d1.text) && /Nothing logged yet/.test(d1.text) && !d1.usual && await pkey() === "profile-day1", "profile on day 1: a preview at day 1 of 14, what arrives on day 14 in place of figures, and the phone's own logs untouched");
    await ppick("data", "fresh"); await popen("profile");
    ok(await pkey() === "profile-day1" && /Day 1 of 14/.test((await ptop()).text), "profile, Just joined: the live Profile is the day-1 one");
    await ppick("data", "new"); await popen("profile");
    ok(/Day 5 of 14/.test((await ptop()).text) && /In 9 more days/.test((await ptop()).text), "profile, new day 5: day 5 of 14, with 9 more days to go");
    /* the FloraScore range can't come on day 14: it needs days with a score, and there's none before day 14. Its row says
       After day 14 and names the days it needs, which must be what L.scoreUsual itself asks for */
    const sn = await q.evaluate(() => {
      const L = window.FLORIN_LOGS, real = L.score, rows = {};
      document.querySelectorAll(".rx-stage .ap-rx [data-pf-soon]").forEach((x) => (rows[x.dataset.pfSoon] = { chip: x.querySelector(".ap-chip").textContent, em: x.querySelector("em").textContent }));
      const n = +((rows.score && rows.score.em.match(/(\d+) days with a FloraScore/)) || [])[1];
      let lo = null, hi = null;
      try {
        L.score = (M, d) => ({ d, value: d - 28 < n - 1 ? 50 : null }); lo = L.scoreUsual({ usual: {}, start: 0 }, "C");
        L.score = (M, d) => ({ d, value: d - 28 < n ? 50 : null }); hi = L.scoreUsual({ usual: {}, start: 0 }, "C");
      } finally { L.score = real; }
      return { rows, n, lo, hi, lede: document.querySelector(".rx-stage .ap-rx .pf-learn .ap-gd-lede").textContent };
    });
    ok(["timing", "often", "forms"].every((k) => sn.rows[k] && sn.rows[k].chip === "Day 14") && sn.rows.score && sn.rows.score.chip === "After day 14" && sn.n > 0 && sn.lo === null && Array.isArray(sn.hi) && new RegExp(`${sn.n} days with a FloraScore`).test(sn.lede), `profile, learning: the usual's three rows come on day 14, the FloraScore range after it, once there are ${sn.n} days with a score, as L.scoreUsual needs`);
    await ppick("data", "est");

    /* the Easy switch flips V.easy, and the page's Version toggle follows */
    await popen("profile");
    await ptap('[data-act="pf-easy"]');
    const e1 = await q.evaluate(() => ({ v: window.FLORIN_EXT.api.V().easy, root: document.querySelector(".rx-stage .ap-rx").dataset.easy, page: (document.querySelector('[data-rx="easy"][aria-pressed="true"]') || {}).dataset.v, sw: (document.querySelector('.rx-stage .ap-rx [data-act="pf-easy"]') || {}).getAttribute ? document.querySelector('.rx-stage .ap-rx [data-act="pf-easy"]').getAttribute("aria-checked") : null, open: !!document.querySelector(".rx-stage .ap-rx .ap-o--t-pf:not(.is-out)") }));
    await ptap('[data-act="pf-easy"]');
    const e2 = await q.evaluate(() => ({ v: window.FLORIN_EXT.api.V().easy, page: (document.querySelector('[data-rx="easy"][aria-pressed="true"]') || {}).dataset.v }));
    ok(e1.v === true && e1.root === "true" && e1.page === "true" && e1.sw === "true" && e1.open && e2.v === false && e2.page === "false", "profile: Larger text and simpler screens flips V.easy, and the left bar's Version toggle follows, both ways");
    /* the theme, the BM logging and the meal sheet go through set(), and the page follows */
    await ptap('[data-act="pf-set"][data-v="theme:dark"]');
    const th = await q.evaluate(() => ({ root: document.querySelector(".rx-stage .ap-rx").dataset.theme, page: (document.querySelector('[data-rx="theme"][aria-pressed="true"]') || {}).dataset.v, chip: document.querySelector('.rx-stage .ap-rx [data-act="pf-set"][data-v="theme:dark"]').getAttribute("aria-checked") }));
    /* in dark, a switch that's on is Cream, as a picked chip is: Ray means "your usual" */
    await ptap('[data-act="pf-research"]');
    const dsw = await q.evaluate(() => { const o = document.querySelector(".rx-stage .ap-rx .ap-o--t-pf"), t = o.querySelector('[data-act="pf-research"] .pf-sw-t'), pr = document.createElement("i"); o.appendChild(pr); pr.style.background = "var(--ap-chart)"; const ray = getComputedStyle(pr).backgroundColor; pr.style.background = "var(--ap-ink)"; const ink = getComputedStyle(pr).backgroundColor; pr.remove(); return { on: t.closest("[aria-checked]").getAttribute("aria-checked"), bg: getComputedStyle(t).backgroundColor, ray, ink }; });
    await ptap('[data-act="pf-research"]');
    ok(dsw.on === "true" && dsw.bg !== dsw.ray && dsw.bg === dsw.ink, `profile, dark: a switch that's on is Cream, never Ray (${dsw.bg})`);
    await ptap('[data-act="pf-set"][data-v="mealUI:detailed"]');
    const ml = await pv();
    await ptap('[data-act="pf-set"][data-v="mealUI:quick"]'); await ptap('[data-act="pf-set"][data-v="theme:light"]');
    ok(th.root === "dark" && th.page === "dark" && th.chip === "true" && ml.mealUI === "detailed" && (await pv()).mealUI === "quick", "profile: the theme and the meal sheet change through set(), and the page's toggles follow");
    /* logging: the consistency words of the option on the phone, and How to pick */
    for (const f of ["A", "B", "C"]) {
      await ppick("form", f); await popen("profile");
      const w = await q.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .pf-words li")].map((x) => x.textContent.trim()));
      const want = await q.evaluate((f) => { const L = window.FLORIN_LOGS; return f === "B" ? L.WORDS.map((x) => x.word) : L.TYPES.slice(1).map((t) => (f === "A" ? `${t.k} · ${t.short}` : t.short)); }, f);
      ok(w.join("|") === want.join("|"), `profile in ${f}: the consistency words are the option's own (${w.length})`);
    }
    await ptap('.pf-log [data-act="guide"]');
    ok((await ptop()).type === "guide", "profile: How to pick opens the guide");
    await q.keyboard.press("Escape"); await pw();
    await ppick("form", "C");

    /* reminders: the BM reminder sheet saves; the check-in day uses the check-in's own sheet, only with it on */
    await popen("profile");
    await ptap('[data-act="pf-rem"]'); await ptap('[data-act="pf-rem-pick"][data-v="20"]'); await ptap('[data-act="pf-rem-save"]');
    const fr1 = await q.evaluate(() => document.activeElement && document.activeElement.dataset.act);
    ok((await ptop()).type === "pf" && /Every day at 8:00 PM/.test((await ptop()).text) && fr1 === "pf-rem", `profile: the BM reminder sheet saves, Profile shows it, and focus is back on its row (${fr1})`);
    await ptap('[data-act="ck-day"]');
    const ckt = (await ptop()).type;
    await ptap('[data-act="ckd-dow"][data-v="3"]'); await ptap('[data-act="ckd-save"]');
    const fr2 = await q.evaluate(() => document.activeElement && document.activeElement.dataset.act);
    ok(ckt === "ckday" && (await ptop()).type === "pf" && /Due Wednesday evenings/.test((await ptop()).text) && fr2 === "ck-day", `profile: the check-in day opens the check-in's own sheet, Profile shows the new day, and focus is back on its row (${fr2})`);
    await ppick("checkin", "false"); await popen("profile");
    ok(!/check-in|\bcheck in\b/i.test((await ptop()).text), "profile, check-in off: nothing in Profile names it");
    await popen("onb-short"); { let k = 0; while ((await ptop()).step !== "rem" && k++ < 8) await ptap('[data-act="onb-skip"]'); }
    ok(!/check-in|\bcheck in\b/i.test((await ptop()).text) && !(await q.evaluate(() => !!document.querySelector('.rx-stage .ap-rx [data-act="onb-ckd"]'))), "onboarding, check-in off: the reminders step has the BM reminder only");
    await ppick("checkin", "true");

    /* membership, your data */
    await ppick("plan", "free"); await popen("profile");
    await ptap('[data-act="pay"][data-pay=""]');
    const pay1 = (await ptop()).type;
    await q.keyboard.press("Escape"); await pw();
    await ptap('[data-act="pay"][data-pay="report"]');
    ok(pay1 === "pay" && (await ptop()).type === "pay" && /clinician/i.test((await ptop()).text), "profile, free: Membership and the clinician report open the paywall");
    await q.keyboard.press("Escape"); await pw();
    await ppick("plan", "member"); await popen("profile");
    ok(/Florin membership/.test((await ptop()).text) && /Active/.test((await ptop()).text), "profile, member: the plan's status");
    const rs0 = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="pf-research"]').getAttribute("aria-checked"));
    await ptap('[data-act="pf-research"]');
    const rs1 = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="pf-research"]').getAttribute("aria-checked"));
    await ptap('[data-act="pf-research"]');
    const rs2 = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="pf-research"]').getAttribute("aria-checked"));
    ok(rs0 === "false" && rs1 === "true" && rs2 === "false", "profile: research sharing is off until turned on, and turns off again");
    await ptap('[data-act="pf-research"]'); await ptap('[data-act="pf-info"][data-v="privacy"]');
    const pv1 = (await ptop()).text;
    await q.keyboard.press("Escape"); await pw();
    await ptap('[data-act="pf-research"]'); await ptap('[data-act="pf-info"][data-v="privacy"]');
    const pv2 = (await ptop()).text;
    await q.keyboard.press("Escape"); await pw();
    ok(/You chose to share/.test(pv1) && !/stays off unless/.test(pv1) && /stays off unless/.test(pv2) && !/You chose to share/.test(pv2), "profile: the Privacy sheet's research line follows the person's choice, on and off");
    for (const k of ["apple", "oura", "cycle"]) {
      await ptap(`[data-act="pf-app"][data-v="${k}"]`);
      const t = await ptop();
      ok(t.type === "pf-info" && /Not connected/.test(t.text) && /decision for this version/.test(t.text), `profile: ${k} is not connected, and the tap says it's a decision for this version`);
      await q.keyboard.press("Escape"); await pw();
    }
    const n0 = await q.evaluate(() => window.FLORIN_EXT.api.M().days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0));
    await ptap('[data-act="pf-del"]');
    const del = await q.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); const y = o.querySelector('[data-act="pf-del-yes"]'); return { text: o.textContent, red: y ? getComputedStyle(y).backgroundColor : "" }; });
    ok(new RegExp(`all ${n0} entries`).test(del.text) && /can't be undone/.test(del.text) && /Keep my logs/.test(del.text), `profile: Delete my logs asks first, naming the ${n0} entries (${del.red})`);
    const dk = await q.evaluate(() => { const M = window.FLORIN_EXT.api.M(), c = { bm: 0, sym: 0, meal: 0, nobm: 0 }; M.days.forEach((x) => x.logged && x.entries.forEach((e) => c[e.kind]++)); c.ck = M.checkins.filter((k) => k.answers && !k.skipped).length; return c; });
    ok(dk.bm + dk.sym + dk.meal + dk.nobm === n0 && [`${dk.bm} BMs`, `${dk.sym} symptom logs`, `${dk.meal} meal logs`, `${dk.nobm} No BM day`, `and ${dk.ck} weekly check-ins`].every((x) => del.text.includes(x)), `profile: the delete sheet's count names every kind it counts, and the ${dk.ck} check-ins on their own (${dk.bm} + ${dk.sym} + ${dk.meal} + ${dk.nobm} = ${n0})`);
    await ptap('[data-act="pf-del-yes"]');
    ok(await q.evaluate(() => window.FLORIN_EXT.api.M().mode === "fresh" && window.FLORIN_EXT.api.S.tab === "today" && !document.querySelector(".rx-stage .ap-rx .ap-o:not(.is-out)")) && /logs are deleted/.test(await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-tst").textContent)), "profile: confirmed, the logs go and Today is day 1 again");
    await ppick("data", "est");

    /* onboarding: Skip works on every step, nothing names the scale or IBD, and every step passes the claims check, in
       A, B and C; both flows finish on Today, day 1 */
    for (const f of ["A", "B", "C"]) {
      await ppick("form", f);
      for (const flow of ["short", "full"]) {
        await popen(`onb-${flow}`);
        const t = await ptop(), n = t.of, seen = [], bad = [], named = [];
        let good = t.type === "onb" && n === (flow === "short" ? 8 : 14);
        for (let i = 0; i < n; i++) {
          const s = await ptop(), tx = await stepText();
          seen.push(s.step);
          if (s.at !== i + 1 || s.sub !== `Step ${i + 1} of ${n}`) good = false;
          if (tx.hits.length) bad.push(`${s.step}: ${tx.hits.join(", ")}`);
          if (NAMED.test(tx.all) || /\bundefined\b|\bNaN\b/.test(tx.all)) named.push(s.step);
          if (s.step === "usual") { const tiles = await q.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .pf-onb .ap-fm-b").length); if (tiles !== (f === "B" ? 5 : 7) || !/It varies/.test(tx.all) || !/Most often, lately/.test(tx.all)) named.push("usual tiles"); }
          if (i < n - 1) { if (!(await q.evaluate(() => !!document.querySelector('.rx-stage .ap-rx .ap-o:not(.is-out):last-child [data-act="onb-skip"]')))) good = false; else await ptap('[data-act="onb-skip"]', 150); }
        }
        good = good && seen[n - 1] === "ready" && new Set(seen).size === n;
        ok(good, `onboarding ${flow} in ${f}: Skip moves on from every step, Step N of ${n} each time (${seen.join(" > ")})`);
        ok(!named.length, `onboarding ${flow} in ${f}: no step names the scale or IBD, or says normal, ideal or healthy (${named.join(", ") || "none"})`);
        ok(!bad.length, `onboarding ${flow} in ${f}: every step passes the claims check (${bad.join("; ") || `${n} steps`})`);
        if (f !== "C") { await popen("today"); continue; }
        /* all skipped: finish */
        await ptap(`[data-act="onb-done"][data-v="${flow === "short" ? "today" : "bm"}"]`, 500);
        const land = await q.evaluate(() => { const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return { mode: M.mode, day: L.learnDay(M), tab: api.S.tab, top: o ? [...o.classList].find((c) => c.indexOf("ap-o--t-") === 0).slice(8) : null, layer: document.querySelector(".rx-stage .ap-rx .ap-layer").textContent, page: (document.querySelector('[data-rx="data"][aria-pressed="true"]') || {}).dataset.v }; });
        ok(land.mode === "fresh" && land.day === 1 && land.tab === "today" && land.page === "fresh" && /Day 1 of 14/.test(land.layer) && (flow === "short" ? land.top === null : land.top === "bm"), `onboarding ${flow}: finishing lands on Today, day 1 of 14 (Just joined)${flow === "full" ? ", with Log your first BM opening the BM form" : ""}`);
        if (flow === "full") { await q.keyboard.press("Escape"); await pw(); }
        await popen("profile");
        const sk = await q.evaluate(() => [...document.querySelectorAll('.rx-stage .ap-rx [data-act="pf-edit"]')].map((x) => x.querySelector("em").textContent));
        /* the first name is the account's: skipped, the row says so and Today still greets the person */
        ok(sk.length === (flow === "short" ? 4 : 13) && sk[0] === "Sarah, from sign-up" && sk.slice(1).every((x) => x === "Skipped"), `onboarding ${flow}, every step skipped: Profile's About you says Skipped on each of its ${sk.length - 1} other rows, and the first name is the one from sign-up (${sk[0]})`);
        const rmx = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="pf-rem"] em').textContent);
        ok(rmx === (flow === "short" ? "Skipped" : "Not set"), `onboarding ${flow}, every step skipped: Profile's BM reminder says ${flow === "short" ? "Skipped" : "Not set, as the full survey has no reminder step"} (${rmx})`);
        await ppick("data", "est");
      }
    }

    /* the short flow, answered: Continue waits for an answer; the answers reach Profile and the name reaches Today */
    await popen("onb-short");
    await ptap('[data-act="onb-next"]');
    await q.fill(`${ph} [data-pf-in="name"]`, ""); await pw(100);
    const wait1 = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="onb-next"]').getAttribute("aria-disabled"));
    await q.fill(`${ph} [data-pf-in="name"]`, "Robin"); await pw(100);
    const wait2 = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="onb-next"]').getAttribute("aria-disabled"));
    await q.press(`${ph} [data-pf-in="name"]`, "Enter"); await pw(250);
    ok(wait1 === "true" && wait2 === null && (await ptop()).step === "brings", "onboarding: Continue waits for an answer, and Enter on the name moves on");
    await ptap('[data-act="onb-next"]');
    ok((await ptop()).step === "brings", "onboarding: Continue with nothing picked stays on the step");
    await ptap('[data-act="onb-tog"][data-v="brings:ibsd"]'); await ptap('[data-act="onb-next"]');
    for (const v of ["usual", "before", "clin", "record"]) await ptap(`[data-act="onb-tog"][data-v="goals:${v}"]`);
    const g = await q.evaluate(() => [...document.querySelectorAll('.rx-stage .ap-rx [data-act="onb-tog"][aria-pressed="true"]')].map((x) => x.dataset.v));
    ok(g.length === 3 && !g.includes("goals:record") && /3 of 3 picked/.test((await ptop()).text), `onboarding: goals stop at 3 (${g.join(", ")})`);
    await ptap('[data-act="onb-next"]');
    await ptap('[data-act="onb-pick"][data-v="periods:no"]'); await ptap('[data-act="onb-next"]');
    await ptap('[data-act="onb-pick"][data-v="rem:12.5"]'); await ptap('[data-act="onb-ckd"][data-v="dow:5"]'); await ptap('[data-act="onb-ckd"][data-v="when:morning"]'); await ptap('[data-act="onb-next"]');
    await ptap('[data-act="onb-next"]');
    ok(/You're set up, Robin/.test((await ptop()).text), "onboarding: the ready step uses the first name");
    await ptap('[data-act="onb-done"][data-v="today"]', 500);
    const td = await q.evaluate(() => ({ layer: document.querySelector(".rx-stage .ap-rx .ap-layer").textContent, av: document.querySelector(".rx-stage .ap-rx .ap-avatar").textContent.trim(), ck: window.FLORIN_EXT.api.M().ckDay, cyc: window.FLORIN_EXT.api.M().P.cycle }));
    ok(/Good evening, Robin/.test(td.layer) && td.av === "R" && td.ck.dow === 5 && td.ck.when === "morning" && td.cyc === false, "onboarding: Today greets Robin, the avatar says R, the check-in day is kept, and periods feeds the cycle context");
    await q.click(`${ph} .ap-avatar`); await pw();
    const pr = (await ptop()).text;
    ok(/Robin/.test(pr) && /I have IBS-D/.test(pr) && /Know my own usual/.test(pr) && /Every day at 12:30 PM/.test(pr) && /Due Friday mornings/.test(pr) && /Day 1 of 14/.test(pr), "onboarding: every answer shows in Profile on day 1");
    /* an answer reopened from Profile: the same step, Save, back to Profile */
    await ptap('[data-act="pf-edit"][data-v="periods"]');
    const ed = await ptop();
    await ptap('[data-act="onb-pick"][data-v="periods:yes"]'); await ptap('[data-act="onb-save"]');
    const fr3 = await q.evaluate(() => document.activeElement && `${document.activeElement.dataset.act}:${document.activeElement.dataset.v}`);
    ok(ed.type === "onb" && ed.step === "periods" && await q.evaluate(() => window.FLORIN_EXT.api.key()) === "profile-day1" && /Periods\s*Yes/.test((await ptop()).text) && await q.evaluate(() => window.FLORIN_EXT.api.M().P.cycle === true) && fr3 === "pf-edit:periods", `profile: an answer reopens its own step, Save brings the new answer back to Profile, and focus is back on its row (${fr3})`);
    /* the first name cleared: the account's name comes back, and Clear says so */
    await ptap('[data-act="pf-edit"][data-v="name"]');
    const nmSub = await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .pf-onb .ap-ck-recall").textContent);
    await ptap('[data-act="onb-clear"]');
    const nmc = await q.evaluate(() => ({ row: document.querySelector('.rx-stage .ap-rx .ap-o--t-pf [data-act="pf-edit"][data-v="name"] em').textContent, you: document.querySelector('.rx-stage .ap-rx [data-pf="name"]').textContent, tst: document.querySelector(".rx-stage .ap-rx .ap-tst").textContent, hello: document.querySelector(".rx-stage .ap-rx .ap-layer .ap-hello").textContent }));
    ok(/Clear it, and Florin uses the name you signed up with, Sarah/.test(nmSub) && nmc.row === "Sarah, from sign-up" && nmc.you === "Sarah" && /signed up with, Sarah/.test(nmc.tst) && /Good evening, Sarah/.test(nmc.hello), `profile: a cleared first name gives the one from sign-up back, on the row, in You and on Today, and Clear says so (${nmc.row})`);
    await ptap('[data-act="pf-edit"][data-v="name"]'); await q.fill(`${ph} [data-pf-in="name"]`, "Robin"); await pw(100); await ptap('[data-act="onb-save"]');
    await ptap('[data-act="close"]');
    /* the person's name stays theirs across a change of person */
    await ppick("persona", "marcus");
    const mk = await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").textContent);
    await ppick("persona", "sarah");
    ok(/Good evening, Marcus/.test(mk) && /Good evening, Robin/.test(await q.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").textContent)), "onboarding: each demo person keeps their own answers");
    /* Reset the demo starts the answers again: Sarah's own name and answers, not the onboarding's */
    await q.evaluate(() => document.querySelector('[data-rx="reset"]').click()); await pw(500);
    const rst = await q.evaluate(() => ({ hello: document.querySelector(".rx-stage .ap-rx .ap-layer .ap-hello").textContent, av: document.querySelector(".rx-stage .ap-rx .ap-avatar").textContent.trim() }));
    await q.click(`${ph} .ap-avatar`); await pw();
    const rsp = (await ptop()).text;
    await ptap('[data-act="close"]');
    ok(/Good evening, Sarah/.test(rst.hello) && rst.av === "S" && !/Robin/.test(rsp) && /Every day at 8:00 AM/.test(rsp), `onboarding: Reset the demo gives each person their own answers back (${rst.hello})`);
    await ppick("data", "est");

    /* a sign that needs a clinician: blood, black stools and waking at night each bring the Teal note on the step */
    await popen("onb-sign");
    const sg = await q.evaluate(() => { const a = document.querySelector(".rx-stage .ap-rx .pf-alarm"); return { a: a ? a.textContent : "", k: window.FLORIN_EXT.api.key(), note: document.querySelector("#rxNotes h2").textContent, on: !!document.querySelector('.rx-stage .ap-rx [data-act="onb-tog"][data-v="sym:blood"][aria-pressed="true"]') }; });
    ok(sg.on && /When to see a clinician/.test(sg.a) && /Blood in your stool/.test(sg.a) && /Primary care/.test(sg.a) && sg.k === "onb-sign" && /a sign that needs a clinician/.test(sg.note), "onboarding: the blood choice shows the Teal clinician note on the step, with its own note for Will");
    const tone = await q.evaluate(() => { const a = document.querySelector(".rx-stage .ap-rx .pf-alarm"), cs = getComputedStyle(a); return cs.boxShadow + " " + cs.backgroundColor; });
    await ptap('[data-act="onb-tog"][data-v="sym:blood"]');
    const off = await q.evaluate(() => !document.querySelector(".rx-stage .ap-rx .pf-alarm") && !!document.querySelector(".rx-stage .ap-rx .pf-onb .ap-info"));
    await ptap('[data-act="onb-tog"][data-v="sym:black"]');
    const bl = await q.evaluate(() => (document.querySelector(".rx-stage .ap-rx .pf-alarm") || {}).textContent || "");
    await ptap('[data-act="onb-tog"][data-v="sym:black"]'); await ptap('[data-act="onb-tog"][data-v="sym:night"]');
    const nt = await q.evaluate(() => (document.querySelector(".rx-stage .ap-rx .pf-alarm") || {}).textContent || "");
    await ptap('[data-act="onb-tog"][data-v="sym:none"]');
    const nn = await q.evaluate(() => ({ alarm: !!document.querySelector(".rx-stage .ap-rx .pf-alarm"), on: [...document.querySelectorAll('.rx-stage .ap-rx [data-act="onb-tog"][aria-pressed="true"]')].map((x) => x.dataset.v) }));
    ok(off && /A black or tar-like stool/.test(bl) && /Waking at night to go/.test(nt) && !nn.alarm && nn.on.join() === "sym:none", "onboarding: black or tar-like stools and waking at night bring it too; None of these clears the rest");
    ok(!/rgb\((2[0-9]{2}), ([0-9]{1,2}), ([0-9]{1,2})\)/.test(tone), `onboarding: the clinician note is Teal, never red (${tone.slice(0, 60)})`);
    await popen("today");

    /* the full survey's ready step: its research line follows the answer, and it offers Larger text and simpler screens */
    await popen("onb-full");
    { let k = 0; while ((await ptop()).step !== "research" && k++ < 14) await ptap('[data-act="onb-skip"]', 150); }
    await ptap('[data-act="onb-pick"][data-v="rchoice:yes"]'); await ptap('[data-act="onb-next"]');
    const rdy = await ptop();
    await ptap('[data-act="onb-easy"]', 400);
    const rz1 = await q.evaluate(() => ({ v: window.FLORIN_EXT.api.V().easy, page: (document.querySelector('[data-rx="easy"][aria-pressed="true"]') || {}).dataset.v, sw: document.querySelector('.rx-stage .ap-rx [data-act="onb-easy"]').getAttribute("aria-checked"), step: document.querySelector(".rx-stage .ap-rx .pf-onb").dataset.step }));
    await ptap('[data-act="onb-easy"]', 400);
    const rz2 = await pv();
    ok(rdy.step === "ready" && /You chose to share anonymized logs/.test(rdy.text) && !/stays off unless/.test(rdy.text) && rz1.v === true && rz1.page === "true" && rz1.sw === "true" && rz1.step === "ready" && rz2.easy === false, "onboarding: Ready follows the research answer and offers Larger text and simpler screens, which flips V.easy and the left bar, and back");
    await popen("today");

    /* every screen of the group, in both themes, Free and Member, new and just joined: reads, with a note of its own */
    const NOTE = { "onb-short": "Onboarding, short", "onb-full": "Onboarding, the full survey", "onb-sign": "Onboarding: a sign that needs a clinician", profile: "Profile", "profile-day1": "Profile on day 1" };
    const rd = [];
    for (const [theme, plan, data] of [["light", "member", "est"], ["dark", "free", "new"], ["dark", "member", "est"], ["light", "free", "fresh"]]) {
      await ppick("theme", theme); await ppick("plan", plan); await ppick("data", data);
      for (const id of Object.keys(NOTE)) {
        await popen(id);
        const r = await q.evaluate(() => ({ t: document.querySelector("#rxNotes h2").textContent, lint: (document.querySelector("#rxNotes .rx-lint") || {}).textContent || "", text: document.querySelector(".rx-stage .ap-rx").textContent }));
        const want = id === "profile" && data === "fresh" ? "Profile on day 1" : NOTE[id];
        if (r.t !== want || r.lint || /\bundefined\b|\bNaN\b/.test(r.text)) rd.push(`${theme}/${plan}/${data}/${id}: ${r.t}${r.lint ? " (claims)" : ""}`);
      }
    }
    ok(!rd.length, `profile and onboarding: every screen reads in both themes, Free and Member, new and just joined, with its own note and a clean claims check (${rd.slice(0, 3).join("; ") || "20 screens"})`);
    await ppick("theme", "light"); await ppick("plan", "member"); await ppick("data", "est");
    /* the Easy version on: the screens still open and read */
    await ppick("easy", "true");
    const ez = [];
    for (const id of Object.keys(NOTE)) { await popen(id); const t = await ptop(); if (!t || !["onb", "pf"].includes(t.type) || /\bundefined\b|\bNaN\b/.test(t.text)) ez.push(id); }
    /* Easy's type on Profile's own parts: no chip spills, headings as big as its rows, no text under 16px; the full
       survey's Most often, lately? as big rows, not the small tiles */
    const zsmall = () => q.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); let min = 99, at = ""; const tw = document.createTreeWalker(o, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const p = n.parentElement; if (!p || p.closest(".sr, svg")) continue; const r = p.getBoundingClientRect(), cs = getComputedStyle(p); if (r.width < 2 || r.height < 2 || cs.visibility === "hidden") continue; const f = parseFloat(cs.fontSize); if (f < min) { min = f; at = n.textContent.trim().slice(0, 32); } } return { min, at }; });
    await popen("profile");
    const zp = await q.evaluate(() => ({ spill: [...document.querySelectorAll(".rx-stage .ap-rx .ap-o--t-pf .ap-ch")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent), h3: parseFloat(getComputedStyle(document.querySelector(".rx-stage .ap-rx .pf-sec h3")).fontSize), row: parseFloat(getComputedStyle(document.querySelector(".rx-stage .ap-rx .pf-sec .ap-ea-m b")).fontSize) }));
    const zpt = await zsmall();
    ok(!zp.spill.length && zp.h3 >= zp.row && zpt.min >= 16, `profile, Easy version: no chip spills (${zp.spill.join(", ") || "none"}), section headings ${zp.h3}px over rows of ${zp.row}px, no text under 16px (${zpt.min}px, "${zpt.at}")`);
    await ppick("onboard", "full"); await popen("onb-full");
    { let k = 0; while ((await ptop()).step !== "usual" && k++ < 8) await ptap('[data-act="onb-skip"]', 150); }
    const zu0 = await q.evaluate(() => ({ rows: document.querySelectorAll(".rx-stage .ap-rx .pf-onb .pf-fo-b").length, tiles: document.querySelectorAll(".rx-stage .ap-rx .pf-onb .ap-fm-b").length }));
    const zut = await zsmall();
    await ptap('.pf-fo-b[data-form="4"]');
    const zu1 = await q.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .pf-onb .pf-fo-b")].map((x) => x.getAttribute("aria-checked")).join(""));
    await ptap('[data-act="onb-next"]');
    const zu2 = (await ptop()).step;
    ok(zu0.rows === 7 && !zu0.tiles && zut.min >= 16 && zu1 === "falsefalsefalsetruefalsefalsefalse" && zu2 === "sym", `onboarding, Easy version: Most often, lately? is ${zu0.rows} big rows with no text under 16px (${zut.min}px), and a pick moves on`);
    await popen("today"); await ppick("onboard", "short");
    await ppick("easy", "false"); await ppick("data", "est");
    ok(!ez.length, `profile and onboarding, Easy version on: every screen opens and reads (${ez.join(", ") || "all five"})`);
    /* ===== fix-profile: the third pass's review of Profile and onboarding, kept as checks ===== */
    {
      const v0 = await pv();
      const fx = (s) => q.evaluate((s) => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); const x = o && o.querySelector(s); return x ? parseFloat(getComputedStyle(x).fontSize) : null; }, s);
      /* 1. Welcome offers Larger text and simpler screens before the first question, in both flows; the step stays on
         Welcome and redraws at Easy's sizes, and the steps after follow */
      const wz = [];
      for (const flow of ["short", "full"]) {
        await popen(`onb-${flow}`);
        const w0 = await ptop(), h0 = await fx(".ap-ck-q h3"), l0 = await fx(".ap-gd-lede");
        const has = await q.evaluate(() => !!document.querySelector('.rx-stage .ap-rx .pf-onb[data-step="welcome"] [data-act="onb-easy"][role="switch"]'));
        await ptap('[data-act="onb-easy"]', 400);
        const w1 = await ptop(), h1 = await fx(".ap-ck-q h3"), l1 = await fx(".ap-gd-lede");
        const z1 = await q.evaluate(() => ({ v: window.FLORIN_EXT.api.V().easy, page: (document.querySelector('[data-rx="easy"][aria-pressed="true"]') || {}).dataset.v, sw: document.querySelector('.rx-stage .ap-rx [data-act="onb-easy"]').getAttribute("aria-checked") }));
        await ptap('[data-act="onb-next"]', 300);
        const n1 = await ptop(), hn = await fx(".ap-ck-q h3");
        if (!(w0.step === "welcome" && has && w1.step === "welcome" && z1.v === true && z1.page === "true" && z1.sw === "true" && h1 > h0 && l1 > l0 && l1 >= 16 && n1.step === "name" && hn >= h1)) wz.push(`${flow}: ${w0.step} ${has} ${h0}>${h1} ${l0}>${l1} ${n1.step} ${hn}`);
        await ppick("easy", "false");
      }
      ok(!wz.length, `fix-profile: Welcome offers Larger text and simpler screens in both flows; it flips V.easy and the left bar, Welcome redraws bigger at once and the next step follows (${wz.join("; ") || "short and full"})`);
      await popen("today");

      /* 2. the Onboarding toggle's flow can be left from the phone: Welcome's Close, logs as they were, and the other
         toggles reach the phone again */
      /* part 1 left Onboarding on full, so picking short opens it from Today */
      await ppick("onboard", "short");
      const c0 = await ptop();
      const cx = await q.evaluate(() => { const b2 = document.querySelector('.rx-stage .ap-rx .pf-onb[data-step="welcome"] .ap-ck-h [data-act="close"]'); if (!b2) return null; const r = b2.getBoundingClientRect(), af = getComputedStyle(b2, "::after"), out = (x) => (af.content !== "none" && !isNaN(parseFloat(x)) ? -parseFloat(x) : 0); return { w: Math.round(r.width + out(af.left) + out(af.right)), h: Math.round(r.height + out(af.top) + out(af.bottom)), l: b2.getAttribute("aria-label") }; });
      await ptap('.ap-ck-h [data-act="close"]', 450);
      const c1 = await ptop(), cm = await q.evaluate(() => ({ mode: window.FLORIN_EXT.api.M().mode, inert: !!document.querySelector(".rx-stage .ap-rx .ap-tb[inert], .rx-stage .ap-rx [inert] .ap-tb") }));
      await ppick("history", "calendar").catch(() => {}); await popen("history").catch(() => {});
      const c2 = await ptop();
      await ppick("onboard", "full");
      const c3 = await ptop();
      await ptap('[data-act="onb-next"]', 300);
      const c4 = await q.evaluate(() => !!document.querySelector('.rx-stage .ap-rx .pf-onb .ap-ck-h [data-act="close"]'));
      ok(c0 && c0.step === "welcome" && cx && cx.w >= 44 && cx.h >= 44 && cx.l === "Close" && c1 === null && cm.mode === "est" && !cm.inert && c2 === null && c3 && c3.step === "welcome" && !c4, `fix-profile: Welcome has a Close (${cx ? `${cx.w}x${cx.h} to tap` : "missing"}) that leaves the toggle's flow with the logs as they were (${cm.mode}), so the next toggle reaches the phone; later steps have Back, not Close`);
      await popen("today"); await ppick("history", v0.history).catch(() => {});

      /* 3. this week's finished check-in counts in Profile, as Insights and Ask count it */
      const ckDone = async () => {
        await popen("today");
        if (!(await q.$(`${ph} .ap-ckc [data-act="ck-start"]`))) return false;
        await q.click(`${ph} .ap-ckc [data-act="ck-start"]`); await pw(600);
        for (let i = 0; i < 4; i++) { await q.click(`${ph} .ap-ck-opt[data-v="1"]`); await pw(650); if (await q.$(`${ph} .ap-ck-next`)) { await q.click(`${ph} .ap-ck-next`); await pw(400); } }
        await q.click(`${ph} [data-act="ck-finish"]`); await pw(600);
        await q.click(`${ph} .ap-ck-fin [data-act="close"]`); await pw(700);
        return q.evaluate(() => window.FLORIN_EXT.api.M().checkin.status === "done");
      };
      const k1 = await ckDone();
      const kw = await q.evaluate(() => { const M = window.FLORIN_EXT.api.M(); return M.checkins.filter((k) => k.answers && !k.skipped).length + 1; });
      await popen("profile");
      const kx = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="pf-export"] em').textContent);
      await ptap('[data-act="pf-del"]');
      const kd = (await ptop()).text;
      await q.keyboard.press("Escape"); await pw();
      ok(k1 && kx.includes(`and ${kw} check-ins`) && kd.includes(`and ${kw} weekly check-ins`), `fix-profile: with this week's check-in finished, Export and Delete count ${kw} check-ins, this week's too (${kx})`);
      await ppick("data", "fresh");
      const k2 = await ckDone();
      await popen("profile");
      const fx1 = await q.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="pf-export"] em').textContent);
      await ptap('[data-act="pf-del"]');
      const fd = (await ptop()).text;
      await q.keyboard.press("Escape"); await pw();
      ok(!k2 || (/^1 check-in from today$/.test(fx1) && /Delete your logs\?/.test(fd) && /This deletes 1 weekly check-in\. It can't be undone/.test(fd) && !/all 1 /.test(fd) && !/starts learning/.test(fd)), `fix-profile: Just joined, with the check-in finished: Export says 1 check-in and Delete names it, without "all" (${k2 ? fx1 : "no check-in card on day 1"})`);
      await ppick("data", "est"); await popen("today");

      /* 4. Easy, Most often lately?: a word picked in B, seen in A or C, marks its steps in words, checks none, and says
         what Continue keeps; a step picked then is exact */
      await ppick("easy", "true"); await ppick("form", "B");
      await popen("onb-full");
      { let k = 0; while ((await ptop()).step !== "usual" && k++ < 8) await ptap('[data-act="onb-skip"]', 150); }
      await ptap('.pf-fo-b[data-word="3"]');
      const mz = [];
      for (const f of ["C", "A"]) {
        await ppick("form", f);
        const m = await q.evaluate(() => { const r = document.querySelector(".rx-stage .ap-rx .pf-onb"); return { maybe: [...r.querySelectorAll(".pf-fo-b.is-maybe")].map((x) => `${x.dataset.form}:${(x.querySelector(".pf-fo-maybe") || {}).textContent}`).join(","), checked: r.querySelectorAll('.pf-fo-b[aria-checked="true"]').length, info: (r.querySelector(".pf-fo-info") || {}).textContent || "", desc: (r.querySelector(".pf-fo") || { getAttribute: () => "" }).getAttribute("aria-describedby") === ((r.querySelector(".pf-fo-info") || {}).id || "x") }; });
        const sm = await zsmall();
        if (!(m.maybe === "5:Could be this one,6:Could be this one" && m.checked === 0 && /You picked Loose, which could be either of the two marked "Could be this one"\. Tap one to be exact, or Continue to keep Loose\./.test(m.info) && m.desc && sm.min >= 16)) mz.push(`${f}: ${m.maybe} ${m.checked} ${m.info.slice(0, 40)} ${sm.min}px`);
      }
      await ptap('.pf-fo-b[data-form="5"]');
      const m5 = await q.evaluate(() => { const r = document.querySelector(".rx-stage .ap-rx .pf-onb"); return { on: [...r.querySelectorAll('.pf-fo-b[aria-checked="true"]')].map((x) => x.dataset.form).join(), maybe: r.querySelectorAll(".pf-fo-b.is-maybe").length, info: !!r.querySelector(".pf-fo-info") }; });
      ok(!mz.length && m5.on === "5" && !m5.maybe && !m5.info, `fix-profile: Easy's Most often, lately?, a B word seen in C and A marks its two steps "Could be this one", checks none and says Continue keeps it; picking a step makes it exact (${mz.join("; ") || "C and A"})`);
      await popen("today"); await ppick("form", v0.form); await ppick("easy", "false"); await ppick("onboard", "short");

      /* 5. Profile names the account's email (without making one up) and can delete the account, asked first */
      await popen("profile");
      const hp = await q.evaluate(() => { const r = [...document.querySelectorAll('.rx-stage .ap-rx .ap-o--t-pf [data-act="pf-info"]')]; return r.map((x) => x.dataset.v).join(","); });
      const dr = await q.evaluate(() => { const rows = [...document.querySelectorAll('.rx-stage .ap-rx .ap-o--t-pf [data-act^="pf-del"]')].map((x) => x.dataset.act); return rows.join(","); });
      await ptap('[data-act="pf-info"][data-v="account"]');
      const em = await ptop();
      await q.keyboard.press("Escape"); await pw();
      await ptap('[data-act="pf-delacct"]');
      const da = await ptop();
      const dfoc = await q.evaluate(() => { const a = document.activeElement, y = document.querySelector('.rx-stage .ap-rx [data-act="pf-delacct-yes"]'); return { foc: a ? a.textContent.trim() : "", bg: y ? getComputedStyle(y).backgroundColor : "" }; });
      const dcnt = await q.evaluate(() => { const M = window.FLORIN_EXT.api.M(); return M.days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0); });
      await ptap('[data-act="pf-delacct-yes"]', 450);
      const dy = await q.evaluate(() => ({ top: ([...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop() || { className: "" }).className, tst: document.querySelector(".rx-stage .ap-rx .ap-tst").textContent, mode: window.FLORIN_EXT.api.M().mode, foc: document.activeElement && document.activeElement.dataset.act }));
      ok(/^account,help,/.test(hp) && em.type === "pf-info" && /Email and sign-in/.test(em.text) && /the email you signed up with/.test(em.text) && !/@/.test(em.text), `fix-profile: Help starts with Email and sign-in, whose sheet says what it holds without making up an address (${hp})`);
      ok(dr === "pf-del,pf-delacct" && da.type === "pf-del" && /Delete your account\?/.test(da.text) && da.text.includes(`${dcnt} entries`) && /can't be undone/.test(da.text) && /export your logs/.test(da.text) && dfoc.foc === "Keep my account" && !/rgb\((2[0-9]{2}), ([0-9]{1,2}), ([0-9]{1,2})\)/.test(dfoc.bg) && /ap-o--t-pf\b/.test(dy.top) && /deletes your account and signs you out\. The prototype keeps it/.test(dy.tst) && dy.mode === "est" && dy.foc === "pf-delacct", `fix-profile: Delete my account, after Delete my logs, asks first with the ${dcnt} entries named and Keep my account focused, never red; confirming says what the app does and keeps the demo (${dfoc.bg})`);
      await popen("today");

      /* 6. with the check-in off, the short onboarding's note never sends periods to the check-in's Period tag */
      await ppick("checkin", "false"); await popen("onb-short");
      const nOff = await q.evaluate(() => document.querySelector("#rxNotes").textContent);
      await popen("today"); await ppick("checkin", "true"); await popen("onb-short");
      const nOn = await q.evaluate(() => document.querySelector("#rxNotes").textContent);
      ok(/a BM reminder/.test(nOff) && !/check-in/i.test(nOff) && /periods, reminders,/.test(nOn) && /Welcome and Ready offer larger text and simpler screens/.test(nOn + nOff), "fix-profile: the short onboarding's note follows the check-in (reminders only when it's on, a BM reminder when off) and says Welcome and Ready offer larger text");
      await popen("today"); await ppick("checkin", String(v0.checkin));
    }
    /* ===== end fix-profile ===== */
    ok(!pe.length, `profile and onboarding: no console errors or module warnings${pe.length ? ": " + pe.slice(0, 2).join(" | ") : ""}`);
    await pc.close();
  }
  /* ===== end build-profile ===== */

  /* ===== build-ask: Ask Florin, interactive (prototype/js/refresh-ask.js) =====
     The chat on Member: alarm words never reach Claude, computed answers match the model and pass the claims check, a
     Claude answer that breaks a rule is replaced, a streamed answer shows as it arrives, and with no Claude at all an
     answer still comes. window.claude is stubbed on its own page; the main page has none, as on a local file. */
  {
    const ap = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const aerr = [];
    ap.on("pageerror", (e) => aerr.push(e.message));
    ap.on("console", (m) => { if (m.type() === "error") aerr.push(m.text()); });
    /* the stub: use("sample") hands back one function that records each call and runs whatever the check sets */
    await ap.addInitScript(() => {
      window.__askCalls = [];
      window.__askImpl = async () => ({ text: "Keep logging each BM when it happens.", truncated: false });
      window.claude = { use: async (name) => (name === "sample" ? (input, opts) => { window.__askCalls.push({ input, tier: opts.modelTier, cache: opts.cache, signal: opts.signal instanceof AbortSignal, aborted: !!(opts.signal && opts.signal.aborted), stream: typeof opts.onText === "function" }); return window.__askImpl(input, opts); } : null) };
    });
    await ap.goto(PAGE);
    await ap.waitForSelector(".rx-stage .ap-rx");
    await ap.waitForTimeout(400);
    const aw = (ms = 350) => ap.waitForTimeout(ms);
    const aph = ".rx-stage .ap-rx";
    const aopen = async (id) => { await ap.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await aw(); };
    const askQ = async (q) => { await ap.fill(`${aph} .ap-askx-in`, q); await ap.press(`${aph} .ap-askx-in`, "Enter"); };
    const calls = () => ap.evaluate(() => window.__askCalls.length);
    const last = () => ap.evaluate(() => {
      const ts = document.querySelectorAll(".rx-stage .ap-rx .ap-askx-a"), a = ts[ts.length - 1];
      if (!a) return null;
      const q = (s) => a.querySelector(s);
      return { all: a.textContent.replace(/\s+/g, " "), text: q(".ap-askx-text").textContent.replace(/\s+/g, " ").trim(), alarm: !!q(".ap-ask-alarm"), note: (q(".ap-askx-note") || {}).textContent || "", from: !!q(".ap-askx-from"), fine: (q(".ap-fine") || {}).textContent || "", think: !!q(".ap-askx-think"), opts: a.querySelectorAll(".ap-ask-opt").length, stop: !!document.querySelector(".rx-stage .ap-rx .ap-askx-stop") };
    });
    /* what the engine would answer, worked out in the page from the same model */
    const computed = (q) => ap.evaluate((q) => { const api = window.FLORIN_EXT.api, A = window.FLORIN_ASK.answer(api.M(), api.V(), q, api.S.askCtx); return { body: A.lines.join(" "), try: A.try }; }, q);

    ok(await ap.evaluate(() => window.FLORIN_ASK && window.FLORIN_ASK.state().state === "ready"), "Ask: with window.claude stubbed, the sample capability is picked up at load");
    await aopen("ask");
    ok(await ap.evaluate(() => /Answers come from Claude/.test(document.querySelector(".rx-stage .ap-rx .ap-askx-src").textContent)), "Ask: the small line in the chat says answers come from Claude");

    /* 1. an alarm question gets the clinician answer and never calls sample */
    await askQ("I noticed blood when I went this morning"); await aw();
    let la = await last();
    ok(la && la.alarm && /When to see a clinician/.test(la.all) && /Blood/.test(la.all) && /primary care/i.test(la.all) && /urgent care/.test(la.all) && !la.from && (await calls()) === 0, "Ask: an alarm question routes to the Teal clinician answer, primary care first, and never calls sample");
    ok(await ap.evaluate(() => document.querySelector("#rxNotes h2").textContent === "Ask Florin, a sign that needs a clinician"), "Ask: the notes follow to the alarm screen");
    /* a request to diagnose, prescribe or predict gets the fixed redirect, also never sent */
    await askQ("Can you diagnose what's going on with me?"); await aw();
    la = await last();
    ok(la && /for a clinician, not an app/.test(la.text) && la.opts === 2 && (await calls()) === 0, "Ask: a request to diagnose gets the fixed redirect with two options, and isn't sent");

    /* 2. a stub that breaks the rules is replaced by the computed answer, quietly noted */
    await ap.evaluate(() => { window.__askImpl = async () => ({ text: "Great news! Your gut is healthy and improving, and your FloraScore is 99 today.", truncated: false }); });
    await askQ("How was my timing this week?"); await aw(600);
    la = await last();
    const want = await computed("How was my timing this week?");
    ok(la && la.text === want.body && la.all.includes(want.try), "Ask: a rule-breaking answer from Claude is swapped for the computed one");
    ok(la && /Checked against Florin's rules/.test(la.note) && !/healthy|improving|99/.test(la.all) && /Worked out from your logs/.test(la.fine) && la.from, "Ask: it's noted quietly as Checked against Florin's rules, with From your logs and the fine print");
    const c1 = await ap.evaluate(() => { const c = window.__askCalls[window.__askCalls.length - 1]; return { n: window.__askCalls.length, tier: c.tier, cache: c.cache, signal: c.signal, stream: c.stream, first: c.input[0].role === "user" && /Rules:/.test(c.input[0].content) && /Facts from/.test(c.input[0].content) && /FloraScore/.test(c.input[0].content), lastQ: c.input[c.input.length - 1].content, roles: c.input.map((t) => t.role).join(",") }; });
    ok(c1.n === 1 && c1.tier === "quick" && c1.cache === false && c1.signal && c1.stream, `Ask: sample is called once, on the quick tier, with cache off, a signal and onText (${c1.tier}, ${c1.cache})`);
    ok(c1.first && c1.lastQ === "How was my timing this week?" && /^user.*user$/.test(c1.roles), "Ask: the input is turns: rules and the facts packet first, the question last, starting and ending on a user turn");
    /* a made-up number fails the numbers check on its own */
    await ap.evaluate(() => { window.__askImpl = async () => ({ text: "Your first BM came inside your usual window on 937 mornings. Keep logging it when it happens.", truncated: false }); });
    await askQ("How was my timing this week?"); await aw(600);
    la = await last();
    ok(la && /Checked against Florin's rules/.test(la.note) && !/\b937\b/.test(la.all), "Ask: a number the facts don't state fails the numbers check, and the computed answer takes its place");

    /* 3. a stub that streams shows the text as it arrives, with Thinking... first and Stop while it runs */
    const FULL = "Your first BMs mostly came inside your usual window this week. Keep logging each one when it happens, so the window stays yours.";
    await ap.evaluate((FULL) => { window.__askImpl = (input, opts) => new Promise((res) => { setTimeout(() => opts.onText({ text: "Your first BMs mostly", delta: "Your first BMs mostly" }), 300); setTimeout(() => opts.onText({ text: FULL, delta: FULL.slice(21) }), 800); setTimeout(() => res({ text: FULL, truncated: false }), 1100); }); }, FULL);
    await askQ("When does my first BM usually come?"); await aw(120);
    const s0 = await last();
    await aw(400);
    const s1 = await last();
    await aw(1000);
    const s2 = await last();
    ok(s0 && s0.think && s0.stop, "Ask: Thinking... shows until the first text, with Stop in place of Send");
    ok(s1 && !s1.think && s1.text === "Your first BMs mostly" && s1.stop, `Ask: a streamed answer shows its text as it arrives (${s1 && s1.text})`);
    ok(s2 && s2.text === FULL && !s2.stop && /Written by Claude/.test(s2.fine) && s2.from && !s2.note, "Ask: when it finishes and passes the checks it stays, from Claude, with From your logs");
    ok(await ap.evaluate(() => document.activeElement && document.activeElement.classList.contains("ap-askx-in")), "Ask: focus stays in the box through the answer");

    /* Stop: a new AbortController per call; the part that streamed stays, marked */
    await ap.evaluate(() => { window.__askImpl = (input, opts) => new Promise((res, rej) => { setTimeout(() => opts.onText({ text: "Your first BMs mostly came", delta: "Your first BMs mostly came" }), 200); opts.signal.addEventListener("abort", () => rej({ code: "cancelled", message: "stopped", text: "Your first BMs mostly came" })); }); });
    await askQ("How were my mornings?"); await aw(450);
    await ap.click(`${aph} .ap-askx-stop`); await aw(300);
    la = await last();
    ok(la && /Stopped/.test(la.note) && la.text === "Your first BMs mostly came" && !la.stop, "Ask: Stop ends the answer and keeps what streamed, marked Stopped");
    await ap.evaluate(() => { window.__askImpl = async () => ({ text: "Keep logging each BM when it happens.", truncated: false }); });
    await askQ("What should I keep doing?"); await aw(400);
    ok(await ap.evaluate(() => { const c = window.__askCalls; return c.length >= 2 && !c[c.length - 1].aborted && c[c.length - 1].signal; }), "Ask: the next call gets a fresh signal, not the stopped one");

    /* rejections: rate_limited gives a note and the computed answer; not_granted hides the Claude path for the view */
    await ap.evaluate(() => { window.__askImpl = () => Promise.reject({ code: "rate_limited", message: "busy" }); });
    await askQ("How often do I go?"); await aw(400);
    la = await last();
    ok(la && /busy/.test(la.note) && la.from && (await ap.evaluate(() => window.FLORIN_ASK.state().off)) === null, "Ask: rate_limited gives a short note and the computed answer, and Claude stays on");
    await ap.evaluate(() => { window.__askImpl = () => Promise.reject({ code: "not_granted", message: "no" }); });
    await askQ("How have my symptoms been?"); await aw(400);
    const nBefore = await calls();
    la = await last();
    ok(la && /wasn't allowed/.test(la.note) && la.from && (await ap.evaluate(() => window.FLORIN_ASK.state().off)) === "not_granted", "Ask: not_granted gives the computed answer and turns the Claude path off for the view");
    await askQ("What have I been eating?"); await aw(400);
    ok((await calls()) === nBefore && await ap.evaluate(() => /logs alone/.test(document.querySelector(".rx-stage .ap-rx .ap-askx-src").textContent)), "Ask: after not_granted no call is made, and the line says answers come from the logs alone");

    /* the messages live in the phone's state: a trip to Today keeps them, new logs end the chat */
    const nTurns = await ap.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-askx-log > li").length);
    await ap.click(`${aph} .ap-tb-b[data-tab="today"]`); await aw();
    await ap.click(`${aph} .ap-tb-b[data-tab="ask"]`); await aw();
    ok(nTurns > 4 && (await ap.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-askx-log > li").length)) === nTurns, `Ask: the conversation is kept in the phone's state across tabs (${nTurns} turns)`);
    await ap.evaluate(() => document.querySelector('[data-rx="persona"][data-v="marcus"]').click()); await aw();
    await ap.click(`${aph} .ap-tb-b[data-tab="ask"]`); await aw();
    ok(await ap.evaluate(() => !document.querySelector(".rx-stage .ap-rx .ap-askx-log") && !!document.querySelector(".rx-stage .ap-rx .ap-askx-sugg")), "Ask: another person starts a new chat, with chips from their logs");

    /* Ask about this preloads the card as a context chip and its question in the box */
    await aopen("insights");
    await ap.click(`${aph} .ap-ins [data-act="ask-about"][data-k="timing"]`); await aw(500);
    const ab = await ap.evaluate(() => { const ph = document.querySelector(".rx-stage .ap-rx"), api = window.FLORIN_EXT.api, c = window.FLORIN_RUI.askContext(api.M(), api.V(), api.S.askCtx); return { chip: (ph.querySelector(".ap-askx-ctx .ap-chip") || {}).textContent || "", box: (ph.querySelector(".ap-askx-in") || {}).value, q: c && c.qs[0], focus: document.activeElement && document.activeElement.classList.contains("ap-askx-in"), title: c && c.title }; });
    ok(/^Asking about Timing/.test(ab.chip) && ab.box === ab.q && ab.focus, `Ask: Ask about this loads the card as a context chip, its first question in the box, focus on it (${ab.chip} / ${ab.box})`);
    await ap.press(`${aph} .ap-askx-in`, "Enter"); await aw(400);
    const sent = await ap.evaluate(() => { const me = [...document.querySelectorAll(".rx-stage .ap-rx .ap-ask-me")].pop(), api = window.FLORIN_EXT.api, R = window.FLORIN_ASK.read(api.M(), api.V(), api.S.askCtx); return { q: me ? me.textContent.replace("You asked: ", "").trim() : "", ctx: /They tapped Ask about this on: Timing/.test(R.text) }; });
    la = await last();
    ok(sent.q === ab.q && sent.ctx && la && la.from, "Ask: one tap sends the preloaded question, with the card's numbers in the facts");
    await ap.click(`${aph} .ap-askx-ctx [data-act="ask-clear"]`); await aw();
    ok(await ap.evaluate(() => !document.querySelector(".rx-stage .ap-rx .ap-askx-ctx")), "Ask: the context chip clears");

    /* the seeded screens, and Free keeps the lock */
    await aopen("ask-chat");
    ok(await ap.evaluate(() => { const ph = document.querySelector(".rx-stage .ap-rx"); return ph.querySelectorAll(".ap-askx-log > .ap-ask-me").length === 1 && ph.querySelectorAll(".ap-askx-a").length === 1 && !!ph.querySelector(".ap-askx-a .ap-askx-from") && document.querySelector("#rxNotes h2").textContent === "Ask Florin, a conversation" && document.querySelector('[data-rx="screen"][data-v="ask-chat"]').getAttribute("aria-current") === "true"; }), "Ask: Ask Florin, a conversation opens on one computed exchange, with its notes and its row lit");
    await aopen("ask-alarm");
    ok(await ap.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-askx-a .ap-ask-alarm") && !!document.querySelector("#rxNotes .rx-note") && !document.querySelector("#rxNotes .rx-lint")), "Ask: the sign that needs a clinician opens on the Teal banner, and passes the claims check (no claims line)");
    await ap.evaluate(() => document.querySelector('[data-rx="plan"][data-v="free"]').click()); await aw();
    await aopen("ask");
    ok(await ap.evaluate(() => !document.querySelector(".rx-stage .ap-rx .ap-askx-in") && /Ask about your own numbers/.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent)), "Ask: on Free the tab keeps the lock and the way into membership");
    await ap.evaluate(() => document.querySelector('[data-rx="plan"][data-v="member"]').click()); await aw();
    ok(!aerr.length, `Ask: no page errors on the stubbed page${aerr.length ? ": " + aerr[0] : ""}`);
    await ap.close();

    /* 4 and 5: no window.claude at all, as on a local file. A chip still gets an answer, and every computed answer's
       numbers come from the model and pass the claims check, for every person, their logs, A, B and C, and the
       check-in on and off */
    const np = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await np.goto(PAGE); await np.waitForSelector(".rx-stage .ap-rx"); await np.waitForTimeout(400);
    await np.evaluate(() => document.querySelector('[data-rx="screen"][data-v="ask"]').click()); await np.waitForTimeout(350);
    await np.click(".rx-stage .ap-rx .ap-askx-sugg .ap-askq"); await np.waitForTimeout(350);
    const nl = await np.evaluate(() => { const a = document.querySelector(".rx-stage .ap-rx .ap-askx-a"); return { state: window.FLORIN_ASK.state().state, text: a ? a.querySelector(".ap-askx-text").textContent : "", from: !!(a && a.querySelector(".ap-askx-from")), fine: a ? a.querySelector(".ap-fine").textContent : "", src: document.querySelector(".rx-stage .ap-rx .ap-askx-src").textContent }; });
    ok(nl.state === "none" && nl.text.length > 20 && nl.from && /Worked out from your logs/.test(nl.fine) && /logs alone/.test(nl.src), "Ask: with sample null, a chip gets the computed answer, From your logs and the fine print, and the line says logs alone");
    const eng = await np.evaluate(() => {
      const L = window.FLORIN_LOGS, AK = window.FLORIN_ASK, chk = window.FLORIN_REFRESH_CHECK, bad = [];
      let n = 0;
      for (const who of ["sarah", "marcus", "alex"]) for (const data of ["est", "new", "fresh"]) for (const meals of ["all", "rough"]) for (const form of ["A", "B", "C"]) for (const checkin of [true, false]) {
        if (meals === "rough" && (data !== "est" || form !== "C")) continue;
        const M = L.build(who, data, { meals }), V = { form, plan: "member", checkin, uid: 9, mealUI: "quick" };
        const R = AK.read(M, V, null);
        if (/undefined|NaN/.test(R.text)) bad.push(`${who}/${data}/${form}: facts read undefined or NaN`);
        /* the facts agree with the model the screens draw from */
        if (M.usual) {
          const s = L.score(M, L.TODAY, form);
          if (s && s.value != null && !R.text.includes(`Today: ${s.value}`)) bad.push(`${who}/${data}/${form}: FloraScore ${s.value} not in the facts`);
          const F = L.span(M, 7, form), mo = F.filter((f) => f.first != null);
          if (mo.length && !R.text.includes(`First BMs in their usual window: ${mo.filter((f) => f.inWin).length} of ${mo.length}`)) bad.push(`${who}/${data}/${form}: mornings in the window disagree`);
        }
        for (const q of AK.QUESTIONS) {
          const A = AK.answer(M, V, q, null), text = AK.textOf(A), legend = String(A.legend || "").replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, "'");
          n++;
          const off = AK.numbersOff(`${text} ${legend}`, R);
          if (off.length) bad.push(`${who}/${data}/${meals}/${form}/"${q}": numbers not in the facts: ${off.join(", ")}`);
          const hits = chk(text);
          if (hits.length) bad.push(`${who}/${data}/${form}/"${q}": claims: ${hits.map((h) => h.text).join(", ")}`);
          if (/\b(normal|healthy|improv\w*|worsen\w*)\b|[\u2013\u2014]|\bundefined\b|\bNaN\b/i.test(text)) bad.push(`${who}/${data}/${form}/"${q}": words: ${text}`);
          if (!checkin && /check-?ins?\b/i.test(text + " " + A.used.map((u) => u.join(" ")).join(" "))) bad.push(`${who}/${data}/${form}/"${q}": names the check-in while it's off`);
          const k = A.lines.length + (A.try ? 1 : 0);
          if (A.kind !== "alarm" && A.kind !== "redirect" && (k < 2 || k > 4)) bad.push(`${who}/${data}/${form}/"${q}": ${k} sentences`);
        }
      }
      return { n, bad };
    });
    ok(!eng.bad.length, `Ask: ${eng.n} computed answers state only numbers from the model's facts and pass the claims check${eng.bad.length ? ": " + eng.bad.slice(0, 3).join(" | ") : ""}`);
    const rt = await np.evaluate(() => { const AK = window.FLORIN_ASK; return ["Is that blood?", "I've been waking at night to go", "I had a fever yesterday"].every((q) => AK.route(q).kind === "alarm") && ["What dose of loperamide should I take?", "Will I have a flare tomorrow?", "Do I have IBS?", "Can you predict my week?"].every((q) => AK.route(q).kind === "redirect") && ["How was my timing this week?", "There was no blood", "What could I try this week?", "What tends to come before my rougher days?"].every((q) => AK.route(q).kind === "ask"); });
    ok(rt, "Ask: alarm words, then requests to diagnose, dose or predict, are routed before anything is asked; ordinary questions aren't");
    await np.close();

    /* fix-ask: the review's findings, kept as checks. The wider alarm net and the forecast and food redirects; the
       stricter check on Claude's answers (and no computed answer failing it); answers that read the card they were
       asked from; the chat after a change to the phone; the alarm turn's chips; the dock in Easy and on a short chat;
       Reset stopping a call; Undo putting focus back */
    const fp = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const ferr = [];
    fp.on("pageerror", (e) => ferr.push(e.message));
    fp.on("console", (m) => { if (m.type() === "error") ferr.push(m.text()); });
    await fp.addInitScript(() => {
      window.__askCalls = [];
      window.__askImpl = async () => ({ text: "Keep logging each BM when it happens. Florin reads it against your own usual.", truncated: false });
      window.claude = { use: async (name) => (name === "sample" ? (input, opts) => { window.__askCalls.push({ input }); return window.__askImpl(input, opts); } : null) };
    });
    await fp.goto(PAGE); await fp.waitForSelector(".rx-stage .ap-rx"); await fp.waitForTimeout(400);
    const fw = (ms = 400) => fp.waitForTimeout(ms);
    const fph = ".rx-stage .ap-rx";
    const fopen = async (id) => { await fp.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await fw(); };
    const fset = async (k, v) => { await fp.evaluate(([k, v]) => document.querySelector(`[data-rx="${k}"][data-v="${v}"]`).click(), [k, v]); await fw(); };
    const fask = async (q, ms = 450) => { await fp.fill(`${fph} .ap-askx-in`, q); await fp.press(`${fph} .ap-askx-in`, "Enter"); await fw(ms); };
    const flast = () => fp.evaluate(() => { const ts = document.querySelectorAll(".rx-stage .ap-rx .ap-askx-a"), a = ts[ts.length - 1]; return a ? a.textContent.replace(/\s+/g, " ") : ""; });
    const fchips = () => fp.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .ap-askx-sugg .ap-askq")].map((x) => x.textContent));

    const ALARMQ = ["My stool was black this morning, is that bad?", "My poo was black", "I have a temperature", "I've lost 5 kg without trying", "I lost a lot of weight", "Getting up at night to poop", "I keep waking up at 3am needing the bathroom", "There was red in the toilet", "Not sure if that was blood", "I've been being sick all morning"];
    const AHEADQ = ["Will my score go up tomorrow?", "Is tomorrow going to be a rough day?", "What will my FloraScore be next week?", "Will this get better?", "Can you tell me if I have SIBO?", "What do you think is going on?", "Should I cut out dairy?", "Should I stop eating gluten?"];
    const BADT = ["Three of your first BMs came later than your window this week. Keep logging your dinner times.", "Your FloraScore will likely rise tomorrow if you keep this up. Keep logging each BM.", "Tomorrow is likely to be a rougher day after last night's pizza. Log how you feel in the morning.", "Pizza seems to trigger your looser BMs, so cutting it out should help. Log your meals.", "This looks like a food intolerance. Log your meals.", "Consider taking a probiotic. Log how you feel.", "Bloating on 2 days is nothing to worry about. Keep logging.", "You had 5 of 6 first BMs in your window, which is a sign of good gut health. Keep logging.", "Your score went from 80 to 83, so things are getting better. Keep logging.", "Your gut is in great shape this week. Keep logging.", "Your score is 83 \u{1F642} Keep logging.", "Your timing was 5 of 6 this week.\n\n- Keep logging\n- Note dinner times", "About half your mornings were in your window. Keep logging.", "Keep logging."];
    const fe = await fp.evaluate(([ALARMQ, AHEADQ, BADT]) => {
      const L = window.FLORIN_LOGS, AK = window.FLORIN_ASK, RU = window.FLORIN_RUI, api = window.FLORIN_EXT.api, out = {};
      out.alarm = ALARMQ.filter((q) => AK.route(q).kind !== "alarm");
      const er = AK.answer(api.M(), api.V(), "Should I go to the ER?", null);
      out.er = er.intent === "clinician" && /primary care/.test(AK.textOf(er)) && /urgent care/.test(AK.textOf(er));
      out.ahead = AHEADQ.filter((q) => AK.route(q).kind !== "redirect");
      /* every question the app itself offers stays an ordinary question */
      const qs = new Set(AK.QUESTIONS.filter((q) => !/clinician/.test(q)));
      for (const k of ["score", "timing", "often", "form", "sym", "ck", "pat"]) for (const range of [7, 30, 90]) { const c = RU.askContext(api.M(), api.V(), { k, range }); if (c) c.qs.filter((q) => !/clinician/.test(q)).forEach((q) => qs.add(q)); }
      out.ordinary = [...qs].filter((q) => AK.route(q).kind !== "ask");
      const R = AK.read(api.M(), api.V(), null);
      out.passed = BADT.filter((t) => AK.check(t, R).ok);
      /* every computed answer passes the same full check Claude's must, for every person, logs, A, B and C, the
         check-in on and off, and every card it can be asked from; the cards' own numbers come through */
      const bad = [], miss = [];
      let n = 0;
      for (const who of ["sarah", "marcus", "alex"]) for (const data of ["est", "new", "fresh"]) for (const form of ["A", "B", "C"]) for (const checkin of [true, false]) {
        const M = L.build(who, data, { meals: "all" }), V = { form, plan: "member", checkin, uid: 9, mealUI: "quick" };
        const ctxs = [null];
        for (const k of ["score", "timing", "often", "form", "sym", "ck", "pat"]) for (const range of [7, 30, 90]) ctxs.push({ k, range });
        const PR = L.patterns(M, form);
        PR.tests.forEach((t) => ctxs.push({ k: "pattern:" + t.id, range: 90 }));
        for (const ctx of ctxs) {
          const c = ctx ? RU.askContext(M, V, ctx) : null, R2 = AK.read(M, V, ctx);
          for (const q of ctx ? (c ? c.qs : []) : AK.QUESTIONS) {
            const A = AK.answer(M, V, q, ctx), tx = AK.textOf(A);
            n++;
            if (A.kind === "alarm" || A.kind === "redirect") continue;
            const v = AK.check(tx, R2);
            if (!v.ok) bad.push(`${who}/${data}/${form}/${ctx ? ctx.k + "@" + ctx.range : "-"} "${q}": ${v.rules.concat(v.nums).join(", ")}`);
            /* a pattern card's answers carry that pattern's count, and one below the bar says so */
            if (ctx && ctx.k.indexOf("pattern:") === 0 && M.usual) {
              const t = PR.tests.find((x) => x.id === ctx.k.slice(8));
              if (!/part of it/.test(q) && (!tx.includes(`${t.hit} of ${t.n}`) || (!t.show && !/below/.test(tx)))) miss.push(`${who}/${form} ${t.id} "${q}": ${tx}`);
            }
          }
          /* a timing, how often, form or symptoms card answers its first question from the card's own stretch */
          if (c && M.usual && ["timing", "often", "form", "sym"].includes(ctx.k)) {
            const pair = c.facts.map((f) => (f.match(/\d+ of \d+/) || [])[0]).find(Boolean), tx = AK.textOf(AK.answer(M, V, c.qs[0], ctx));
            if (pair && !tx.includes(pair)) miss.push(`${who}/${form} ${ctx.k}@${ctx.range} "${c.qs[0]}" card says ${pair}: ${tx}`);
          }
        }
        if (M.usual && checkin && AK.answer(M, V, "How is my starting point set?", { k: "ck", range: 30 }).intent !== "checkin") miss.push(`${who}/${form}: the starting point question doesn't get the check-in answer`);
        if (M.usual && !/where most first BMs landed/.test(AK.textOf(AK.answer(M, V, "What sets my usual window?", { k: "timing", range: 7 })))) miss.push(`${who}/${form}: What sets my usual window? doesn't say`);
        const bloat = PR.sparse ? null : PR.found.find((p) => p.kind === "bloat");
        if (bloat && data === "est" && !AK.textOf(AK.answer(M, V, "What tends to come before my bloating?", { k: "sym", range: 30 })).includes(`${bloat.hit} of ${bloat.n}`)) miss.push(`${who}/${form}: the bloating question doesn't get the bloating pattern`);
      }
      out.n = n; out.bad = bad; out.miss = miss;
      return out;
    }, [ALARMQ, AHEADQ, BADT]);
    ok(!fe.alarm.length, `Ask: the wider alarm net catches a black stool, a temperature, weight lost, up at night to go, red in the toilet, a hedged sign and being sick${fe.alarm.length ? ": missed " + fe.alarm.join(" | ") : ""}`);
    ok(fe.er, "Ask: Should I go to the ER? gets the clinician answer, primary care first, with the urgent-care line");
    ok(!fe.ahead.length, `Ask: asking what comes next, whether I have something, or what to cut out gets the redirect${fe.ahead.length ? ": missed " + fe.ahead.join(" | ") : ""}`);
    ok(!fe.ordinary.length, `Ask: no question the app itself offers is routed to the alarm answer or a redirect${fe.ordinary.length ? ": " + fe.ordinary.join(" | ") : ""}`);
    ok(!fe.passed.length, `Ask: the check on Claude's answers fails forecasts, triggers, intolerance, medicines, reassurance, judgements, a number word that's off, an emoji, a list, half and one sentence${fe.passed.length ? ": passed " + fe.passed.join(" | ") : ""}`);
    ok(!fe.bad.length, `Ask: all ${fe.n} computed answers, from the tab and from every card, pass that same check${fe.bad.length ? ": " + fe.bad.slice(0, 3).join(" | ") : ""}`);
    ok(!fe.miss.length, `Ask: answers read the card they were asked from (its pattern, its stretch), the starting point gets the check-in, the window question says how it's set, bloating gets the bloating pattern${fe.miss.length ? ": " + fe.miss.slice(0, 3).join(" | ") : ""}`);

    /* in the phone: an alarm never calls sample, whatever the phrasing; a failed answer that pointed to primary care
       becomes the clinician answer; From your logs lists only lines the answer states */
    await fopen("ask"); await fw(200);
    const c0 = await fp.evaluate(() => window.__askCalls.length);
    await fask("My poo was black, is that bad?");
    let fl = await flast();
    ok(/When to see a clinician/.test(fl) && /A black or tar-like stool/.test(fl) && fl.indexOf("Primary care") < fl.indexOf("urgent care") && (await fp.evaluate(() => window.__askCalls.length)) === c0, "Ask: a black stool, said plainly, gets the clinician answer, primary care before urgent care, and isn't sent to Claude");
    const ac = await fchips();
    ok(ac.length <= 1 && ac.every((q) => /clinician/.test(q)), `Ask: after the clinician answer the only question offered is the report to bring (${ac.join(" | ") || "none"})`);
    await fp.evaluate(() => { window.__askImpl = async () => ({ text: "Please contact primary care within 2 days. Keep logging.", truncated: false }); });
    await fask("How was my timing this week?", 700);
    fl = await flast();
    ok(/start with primary care soon/.test(fl) && /Checked against Florin's rules/.test(fl) && !/usual window for a first BM/.test(fl), "Ask: an answer from Claude that fails a check after pointing to primary care becomes the clinician answer, not a timing one");
    const used = await fp.evaluate(() => { const api = window.FLORIN_EXT.api, R = window.FLORIN_ASK.read(api.M(), api.V(), null); const v = R.X["w.morn"][1]; window.__askImpl = async () => ({ text: `In the last 7 days, ${v} first BMs came in your usual window. Keep logging your first BM when it happens.`, truncated: false }); return v; });
    await fask("How were my mornings?", 700);
    const fromRows = await fp.evaluate(() => { const d = [...document.querySelectorAll(".rx-stage .ap-rx .ap-askx-from")].pop(); return d ? [...d.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").trim()) : []; });
    ok(fromRows.length >= 1 && fromRows.every((r) => r.includes(used)), `Ask: From your logs under Claude's answer lists only the lines it states (${fromRows.join(" | ")})`);
    /* chips: never the question already in the box, by its answer */
    await fp.evaluate(() => { const api = window.FLORIN_EXT.api; api.S.askx = null; });
    await fopen("insights");
    await fp.click(`${fph} .ap-ins [data-act="ask-about"][data-k="score"]`); await fw(500);
    const sc = await fp.evaluate(() => ({ box: document.querySelector(".rx-stage .ap-rx .ap-askx-in").value, chips: [...document.querySelectorAll(".rx-stage .ap-rx .ap-askx-sugg .ap-askq")].map((x) => x.textContent) }));
    ok(!sc.chips.some((q) => /FloraScore go (up|down)|behind my FloraScore/.test(q)), `Ask: with the FloraScore card loaded, no chip asks the box's question again (${sc.box} / ${sc.chips.join(" | ")})`);
    await fp.click(`${fph} .ap-askx-ctx [data-act="ask-clear"]`); await fw();
    /* the chat after a change to the phone: A, B or C redraws the answers; the check-in off takes only what names it */
    await fp.evaluate(() => { window.__askImpl = () => Promise.reject({ code: "not_granted" }); });
    await fset("form", "B");
    await fp.click(`${fph} .ap-tb-b[data-tab="ask"]`); await fw();
    await fask("Tell me about my forms");
    await fask("How do I bring my logs to a clinician?");
    await fask("What changed since I started?");
    await fset("form", "A");
    await fp.click(`${fph} .ap-tb-b[data-tab="ask"]`); await fw();
    const fa = await fp.evaluate(() => { const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS; return { log: document.querySelector(".rx-stage .ap-rx .ap-askx-log").textContent, want: L.usualFormsText(api.M(), "A") }; });
    ok(fa.log.includes(`Your usual forms are ${fa.want}`), `Ask: switching to A mid-chat redraws the forms answer in A's words (${fa.want})`);
    await fset("checkin", "false");
    await fp.click(`${fph} .ap-tb-b[data-tab="ask"]`); await fw();
    const fc = await fp.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-askx-log").textContent);
    ok(/bring my logs to a clinician/.test(fc) && /symptoms and meals/.test(fc) && !/check-?in|What changed since I started/i.test(fc), "Ask: turning the check-in off keeps the report exchange (now without check-ins) and drops only the check-in one");
    await fset("checkin", "true");
    await fset("form", "C");
    /* Undo on New chat puts focus back in the box */
    await fp.click(`${fph} .ap-tb-b[data-tab="ask"]`); await fw();
    await fp.click(`${fph} [data-act="askx-new"]`); await fw(300);
    await fp.click(`${fph} .ap-tst-b[data-act="undo"]`); await fw();
    ok(await fp.evaluate(() => document.activeElement && document.activeElement.classList.contains("ap-askx-in") && !!document.querySelector(".rx-stage .ap-rx .ap-askx-log")), "Ask: Undo on New chat brings the chat back with focus in the box");
    /* the dock: pinned to the bottom on a short chat, and clear of the taller tab bar in the Easy version */
    const dock = () => fp.evaluate(() => { const ph = document.querySelector(".rx-stage .ap-rx"), lay = ph.querySelector(".ap-layer"); lay.scrollTop = 1e6; const c = ph.querySelector(".ap-askx-compose").getBoundingClientRect(), t = ph.querySelector(".ap-tb").getBoundingClientRect(); return { gap: t.top - c.bottom }; });
    await fset("data", "fresh"); await fopen("ask");
    const d1 = await dock();
    await fset("data", "est"); await fset("easy", "true"); await fopen("ask-chat");
    const d2 = await dock();
    await fset("easy", "false");
    ok(d1.gap >= 8 && d1.gap <= 32 && d2.gap >= 8, `Ask: the box sits just above the tab bar on a short chat (${Math.round(d1.gap)}px) and clears Easy's taller one (${Math.round(d2.gap)}px)`);
    /* Reset stops a call that's still coming */
    await fp.evaluate(() => { window.__aborted = false; window.__askImpl = (input, opts) => new Promise((res, rej) => opts.signal.addEventListener("abort", () => { window.__aborted = true; rej({ code: "cancelled" }); })); });
    await fp.reload(); await fp.waitForSelector(".rx-stage .ap-rx"); await fw();
    await fp.evaluate(() => { window.__aborted = false; window.__askImpl = (input, opts) => new Promise((res, rej) => opts.signal.addEventListener("abort", () => { window.__aborted = true; rej({ code: "cancelled" }); })); });
    await fopen("ask");
    await fask("How often do I go?", 300);
    await fp.evaluate(() => document.querySelector('[data-rx="reset"]').click()); await fw(900);
    ok(await fp.evaluate(() => window.__aborted === true), "Ask: Reset stops an answer from Claude that's still coming");
    ok(!ferr.length, `Ask: no page errors through the review's checks${ferr.length ? ": " + ferr[0] : ""}`);
    await fp.close();
    /* end fix-ask */

    /* ===== fix-ask: the third review's findings, kept as checks. A condition named, a supplement, a food to quit or
       still eat get the redirect, and the app's own questions don't; a gastroenterologist and mucus get the clinician
       answer, mucus led by the flag note's own line and never sent; the check on Claude's answers fails forecasts,
       causes, food advice, resolved, regular, comparisons with other people and humour, and passes Florin's own
       disclaimers; the no-score answer says what L.score counts and what brings it back; no answer says good days; in
       Easy the options under a redirect are Easy's size; the Ask opener clears a seeded chat ===== */
    {
      const tp = await b.newPage({ viewport: { width: 1440, height: 1000 } });
      const terr = [];
      tp.on("pageerror", (e) => terr.push(e.message));
      tp.on("console", (m) => { if (m.type() === "error") terr.push(m.text()); });
      await tp.addInitScript(() => {
        window.__askCalls = [];
        window.claude = { use: async (name) => (name === "sample" ? (input) => { window.__askCalls.push({ input }); return Promise.resolve({ text: "Keep logging each BM when it happens. Florin reads it against your own usual.", truncated: false }); } : null) };
      });
      await tp.goto(PAGE); await tp.waitForSelector(".rx-stage .ap-rx"); await tp.waitForTimeout(400);
      const tw = (ms = 400) => tp.waitForTimeout(ms);
      const tph = ".rx-stage .ap-rx";
      const topen = async (id) => { await tp.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await tw(); };
      const tset = async (k, v) => { await tp.evaluate(([k, v]) => document.querySelector(`[data-rx="${k}"][data-v="${v}"]`).click(), [k, v]); await tw(); };
      const task = async (q, ms = 450) => { await tp.fill(`${tph} .ap-askx-in`, q); await tp.press(`${tph} .ap-askx-in`, "Enter"); await tw(ms); };
      const tlast = () => tp.evaluate(() => { const ts = document.querySelectorAll(".rx-stage .ap-rx .ap-askx-a"), a = ts[ts.length - 1]; return a ? { text: a.querySelector(".ap-askx-text").textContent.replace(/\s+/g, " ").trim(), opts: a.querySelectorAll(".ap-ask-opt").length } : null; });
      const RED = [["Is this Crohn's?", "clinic"], ["Is this Crohn’s?", "clinic"], ["Is it colitis?", "clinic"], ["Could it be coeliac?", "clinic"], ["Does this mean I have SIBO?", "clinic"], ["Is my gut inflamed?", "clinic"], ["What probiotic is best for me?", "clinic"], ["Would a probiotic help?", "clinic"], ["What condition do my logs point to?", "clinic"], ["Would going dairy free help?", "food"], ["Would cutting out dairy help?", "food"], ["Should I quit coffee?", "food"], ["Can I still eat pizza?", "food"], ["Should I skip pizza?", "food"]];
      const NOTRED = ["Could it be a gap in my logs?", "Does this mean I have a pattern?", "Can I skip a day of logging?", "Can I skip the check-in this week?", "Should I quit logging dinner?", "Can I still have a FloraScore if I miss a day?", "Would logging more help?", "Could it be the late dinners?"];
      const MUSTFAIL = ["Your bloating seems to have resolved this week.", "Your FloraScore should climb if you keep this up.", "Expect a calmer week if dinners come earlier.", "Pizza may be behind your looser BMs.", "Dairy could be the culprit here. Try a week without it and compare.", "Try skipping pizza for a week and see what changes.", "Your gut seems inflamed after pizza.", "Eating earlier helps your gut settle.", "Most people go once or twice a day, and so do you.", "Your gut is on track this week.", "Haha, that is a funny question.", "Coffee upsets your stomach.", "Your bloating is due to pizza.", "Your BMs are regular this week.", "That is a positive sign.", "Your mornings are better than last week.", "Your timing is textbook.", "Your bloating should ease by the weekend.", "The average person goes once a day.", "Coffee is causing your bloating.", "Your FloraScore is good this week."];
      const MUSTPASS = ["Patterns show what tends to happen together; they don't prove cause.", "Patterns show what tends to happen together, not what causes it.", "What's behind your FloraScore this week is timing.", "A gap stays a gap due to how Florin reads logs.", "If you skip a day, it stays a gap.", "If you keep logging meals, Florin can look.", "Florin compares you with your own usual, never with other people."];
      const te = await tp.evaluate(([RED, NOTRED, MUSTFAIL, MUSTPASS]) => {
        const L = window.FLORIN_LOGS, AK = window.FLORIN_ASK, api = window.FLORIN_EXT.api, out = {};
        const K = " Keep logging each BM when it happens.";
        out.red = RED.filter(([q, w]) => { const r = AK.route(q); return r.kind !== "redirect" || r.which !== w; }).map(([q]) => q);
        out.notred = NOTRED.filter((q) => AK.route(q).kind !== "ask");
        const M = api.M(), V = api.V(), R = AK.read(M, V, null);
        const gi = AK.answer(M, V, "Do I need to see a gastroenterologist?", null), mu = AK.answer(M, V, "Is it bad that there's mucus?", null);
        out.clin = gi.intent === "clinician" && /primary care/.test(AK.textOf(gi)) && mu.intent === "clinician" && AK.textOf(mu).indexOf("If mucus is new for you, keeps showing up, or comes with pain or blood, check in with a clinician.") === 0 && /Primary care is the right first stop/.test(AK.textOf(mu)) && AK.answer(M, V, "I logged mucus today. How do I bring my logs to a clinician?", null).intent === "report";
        out.passed = MUSTFAIL.filter((t) => AK.check(t + K, R).ok);
        out.failed = MUSTPASS.filter((t) => !AK.check(t + K, R).ok).map((t) => `${t} (${AK.check(t + K, R).rules.join(", ")})`);
        /* no FloraScore today, three ways: the facts say how many of the last 3 days have a BM, or No BM, the answer says
           what brings it back, and doing that brings it back */
        const V3 = { form: "C", plan: "member", checkin: true, uid: 9, mealUI: "quick" };
        const strip = (M, d) => L.day(M, d).entries.filter((e) => e.kind === "bm" || e.kind === "nobm").map((e) => e.id).forEach((id) => L.remove(M, id));
        const cases = [
          { off: [0, 1], n: 1, tr: "Log today's BMs, or No BM if there wasn't one", add: [0] },
          { off: [1, 2], n: 1, tr: "Add a BM, or No BM, for yesterday from History", add: [1] },
          { off: [0, 1, 2], n: 0, tr: "Log today's BMs, or No BM, and add yesterday's from History", add: [0, 1] }
        ];
        out.noscore = [];
        cases.forEach((c) => {
          const M3 = L.build("sarah", "est", { meals: "all" });
          c.off.forEach((k) => strip(M3, L.TODAY - k));
          const R3 = AK.read(M3, V3, null), A3 = AK.answer(M3, V3, "Why is there no FloraScore today?", null), tx = AK.textOf(A3);
          const fact = R3.X["s.today"][1], how = R3.X["s.how"][1];
          c.add.forEach((k) => L.add(M3, { kind: "nobm", d: L.TODAY - k, t: 20 }));
          const back = L.score(M3, L.TODAY, "C");
          if (fact !== `not scored: a BM, or No BM, is logged on ${c.n} of the last 3 days, and it needs 2` || !/among the last 3 that have a BM, or No BM, logged/.test(how) || !tx.startsWith("There's no FloraScore today: it needs a BM, or No BM, logged on 2 of your last 3 days") || !tx.includes(c.tr) || !AK.check(tx, R3).ok || !back || back.value == null) out.noscore.push(`${c.off.join("+")}: ${fact} / ${tx} / back ${back && back.value}`);
        });
        out.how = /blends the days among your last 3 that have a BM, or No BM, logged/.test(AK.textOf(AK.answer(M, V, "How is FloraScore worked out?", null)));
        /* never good days: every answer that asks for ordinary days, and the facts, for meals every day, rough days only
           and none */
        out.good = [];
        for (const meals of ["all", "rough", "none"]) for (const data of ["est", "new"]) {
          const Mg = L.build("sarah", data, { meals });
          if (/\bgood\b|\bbad\b/i.test(AK.read(Mg, V3, null).text)) out.good.push(`${meals}/${data}: facts`);
          ["How have my symptoms been?", "What tends to come before my rougher days?", "How sure are these patterns?", "How do I test one?", "What could I try this week?", "How do I log symptoms well?", "What should I log, and when?", "Is my FloraScore good?", "What do my logs show this week?"].forEach((q) => { const tx = AK.textOf(AK.answer(Mg, V3, q, null)); if (/\bgood\b|\bbad\b/i.test(tx)) out.good.push(`${meals}/${data} "${q}": ${tx}`); });
        }
        return out;
      }, [RED, NOTRED, MUSTFAIL, MUSTPASS]);
      ok(!te.red.length, `Ask: a condition named (Crohn's, colitis, coeliac, SIBO, inflamed), a probiotic, a food to quit, skip or still eat, and going dairy free get the redirect${te.red.length ? ": missed " + te.red.join(" | ") : ""}`);
      ok(!te.notred.length, `Ask: questions about the app that share those words (a gap, a pattern, skipping a day or the check-in, quitting logging dinner) stay ordinary${te.notred.length ? ": " + te.notred.join(" | ") : ""}`);
      ok(te.clin, "Ask: a gastroenterologist gets the clinician answer; mucus gets it led by the flag note's own line, and the flag note's mucus question still gets the report answer");
      ok(!te.passed.length, `Ask: the check on Claude's answers fails resolved, regular, good, forecasts, a food behind or to blame, skipping a food, inflamed, on track, most people and humour${te.passed.length ? ": passed " + te.passed.join(" | ") : ""}`);
      ok(!te.failed.length, `Ask: and it passes Florin's own lines: they don't prove cause, not what causes it, what's behind your FloraScore, due to how Florin reads logs, if you skip a day, if you keep logging, never with other people${te.failed.length ? ": failed " + te.failed.join(" | ") : ""}`);
      ok(!te.noscore.length && te.how, `Ask: with no FloraScore today, the facts and the answer say a BM, or No BM, on 2 of the last 3 days, and what they say to log brings it back${te.noscore.length ? ": " + te.noscore.join(" | ") : ""}`);
      ok(!te.good.length, `Ask: no answer or fact calls a day good or bad, with meals every day, on rough days only or none${te.good.length ? ": " + te.good.slice(0, 2).join(" | ") : ""}`);
      /* in the phone, with Claude there: a condition and mucus never reach it */
      await topen("ask");
      const tc0 = await tp.evaluate(() => window.__askCalls.length);
      await task("Is this Crohn's?");
      let tl = await tlast();
      ok(tl && /for a clinician, not an app/.test(tl.text) && tl.opts === 2 && (await tp.evaluate(() => window.__askCalls.length)) === tc0, "Ask: Is this Crohn's? gets the clinic redirect with its two options, and isn't sent to Claude");
      await task("Is it bad that there's mucus?");
      tl = await tlast();
      ok(tl && tl.text.startsWith("If mucus is new for you") && (await tp.evaluate(() => window.__askCalls.length)) === tc0, "Ask: a question about mucus gets the clinician answer on the phone, and isn't sent to Claude");
      /* Easy: the options under a redirect are Easy's size, like the Ask next chips beside them */
      await tset("easy", "true"); await topen("ask");
      await task("Do I have IBS?");
      const eo = await tp.evaluate(() => [...[...document.querySelectorAll(".rx-stage .ap-rx .ap-askx-a")].pop().querySelectorAll(".ap-ask-opt")].map((x) => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x), ic = x.querySelector(".ic").getBoundingClientRect(); return { h: Math.round(r.height), f: parseFloat(cs.fontSize), ic: Math.round(ic.width) }; }));
      ok(eo.length === 2 && eo.every((o) => o.h >= 64 && o.f >= 18 && o.ic === 20), `Ask: in Easy the options under a redirect are 64px or taller at 18px, with 20px chevrons (${eo.map((o) => `${o.h}px/${o.f}px/${o.ic}px`).join(", ")})`);
      await tset("easy", "false");
      /* the Ask opener: from a seeded chat, the plain tab (the core's open("ask") calls it once refresh-app.js does) */
      await topen("ask-alarm");
      const op = await tp.evaluate(() => { const X = window.FLORIN_EXT; X.opens.ask(X.api); return new Promise((res) => setTimeout(() => res({ log: !!document.querySelector(".rx-stage .ap-rx .ap-askx-log"), sugg: !!document.querySelector(".rx-stage .ap-rx .ap-askx-sugg"), tab: X.api.S.tab, h: document.querySelector("#rxNotes h2").textContent }), 400)); });
      ok(op.tab === "ask" && !op.log && op.sugg && op.h === "Ask Florin", `Ask: the Ask opener clears a seeded chat and shows the plain tab, with its notes (${op.h})`);
      ok(!terr.length, `Ask: no page errors through the third review's checks${terr.length ? ": " + terr[0] : ""}`);
      await tp.close();
    }
    /* ===== end fix-ask: the third review ===== */
  }
  /* ===== end build-ask ===== */

  /* ===== build-easy: the Easy version (prototype/js/refresh-easy.js). Its own page and context, so nothing above it changes ===== */
  {
    const ez = await b.newPage({ viewport: { width: 390, height: 844 } });
    const ee = [];
    ez.on("pageerror", (e) => ee.push(e.message));
    ez.on("console", (m) => { if (m.type() === "error") ee.push(m.text()); });
    await ez.goto(PAGE); await ez.waitForSelector(".rx-stage .ap-rx"); await ez.waitForTimeout(400);
    const Z = ".rx-stage .ap-rx";
    const zw = (ms = 450) => ez.waitForTimeout(ms);
    const zset = async (k, v) => { await ez.evaluate(([k, v]) => { const x = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (x && x.getAttribute("aria-pressed") !== "true") x.click(); }, [k, v]); await zw(300); };
    const zgo = async (id) => { await ez.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await zw(); };
    const ztap = async (sel, ms) => { await ez.click(`${Z} ${sel}`); await zw(ms); };
    const zpressed = (k) => ez.evaluate((k) => (document.querySelector(`[data-rx="${k}"][aria-pressed="true"]`) || {}).dataset.v, k);
    const zkey = () => ez.evaluate(() => window.FLORIN_EXT.api.key());
    const ztop = () => ez.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return o ? o.textContent.replace(/\s+/g, " ") : ""; });
    const ztoast = () => ez.$eval(`${Z} .ap-tst`, (e) => (e.classList.contains("is-on") ? e.textContent : ""));
    const zbms = () => ez.evaluate(() => { const L = window.FLORIN_LOGS, x = L.day(window.FLORIN_EXT.api.M(), L.TODAY); return x.entries.filter((e) => e.kind === "bm").map((e) => ({ t: e.t, form: e.form, word: e.word, rush: !!(e.how && e.how.rush), flags: Object.keys(e.flags || {}).filter((k) => e.flags[k]) })); });
    /* the smallest visible text and the smallest target: on Today the screen and the tab bar, else the open overlay */
    const zmeasure = (scope) => ez.evaluate((scope) => {
      const root = document.querySelector(".rx-stage .ap-rx");
      const areas = scope === "today" ? [root.querySelector(".ap-layer"), root.querySelector(".ap-tb")] : [[...root.querySelectorAll(".ap-o:not(.is-out)")].pop()];
      let minFont = 99, smallText = "", minT = 999, smallT = "";
      areas.forEach((a) => {
        const tw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = tw.nextNode())) {
          if (!n.textContent.trim()) continue;
          const p = n.parentElement;
          if (!p || p.closest(".sr, .ez-vh, svg")) continue;
          const r = p.getBoundingClientRect(), cs = getComputedStyle(p);
          if (r.width < 2 || r.height < 2 || cs.visibility === "hidden") continue;
          const f = parseFloat(cs.fontSize);
          if (f < minFont) { minFont = f; smallText = n.textContent.trim().slice(0, 32); }
        }
        a.querySelectorAll("button, input, select, textarea, [role=button]").forEach((x) => {
          if (x.matches(".ap-o-scrim")) return;
          const r = x.getBoundingClientRect(), cs = getComputedStyle(x);
          if (!r.width || !r.height || cs.visibility === "hidden") return;
          const m = Math.min(r.width, r.height);
          if (m < minT) { minT = m; smallT = (x.textContent || x.getAttribute("aria-label") || x.className).trim().slice(0, 32); }
        });
      });
      return { minFont, smallText, minT: Math.round(minT), smallT };
    }, scope);

    /* Version: Easy, from the toggle */
    await zset("easy", "true"); await zgo("today");
    const z1 = await ez.evaluate(() => { const root = document.querySelector(".rx-stage .ap-rx"), plus = root.querySelector(".ap-tb-plus"); return { cls: root.classList.contains("ap--easy"), today: !!root.querySelector(".ap-layer .ap-ez-today"), ins: getComputedStyle(root.querySelector('.ap-tb [data-tab="insights"]')).display, word: plus.textContent.trim(), name: plus.getAttribute("aria-label"), tabs: [...root.querySelectorAll(".ap-tb button")].filter((x) => getComputedStyle(x).display !== "none").map((x) => x.textContent.trim()).join("|") }; });
    ok(z1.cls && z1.today && await zkey() === "ez-today", "Easy: the phone carries .ap--easy and Today is the Easy one (screen ez-today)");
    ok(z1.ins === "none" && z1.tabs === "Today|Add|History|Ask" && /^Add/.test(z1.name), `Easy: the tab bar is ${z1.tabs.replace(/\|/g, ", ")}, each with its word, and Insights folds into Today`);
    /* Today, computed from the model */
    const z2 = await ez.evaluate(() => {
      const L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M(), x = L.day(M, L.TODAY), bms = x.entries.filter((e) => e.kind === "bm"), root = document.querySelector(".rx-stage .ap-rx");
      const n = root.querySelector(".ap-ez-score .ez-n");
      return { say: root.querySelector(".ap-ez-say").textContent, t: bms.length ? window.FLORIN_APP.util.fmtTime(bms[0].t) : "", v: (L.score(M, L.TODAY, "C") || {}).value, shown: n ? n.textContent : null, counts: n ? n.hasAttribute("data-count") : null, words: root.querySelector(".ap-ez-score .ez-ans").textContent, big: [...root.querySelectorAll(".ap-ez-do .ap-ez-big b")].map((b) => b.textContent).join("|"), week: !!root.querySelector(".ap-ez-today .lk-easy .ez-week"), rows: root.querySelectorAll(".ap-ez-tl [data-act='edit']").length, entries: x.entries.length, ck: !!root.querySelector(".ap-ez-ck") };
    });
    ok(z2.t && z2.say.includes(z2.t) && /within your usual time|later than your usual time|earlier than your usual time/.test(z2.say), `Today opens on one plain sentence from the logs (${z2.say})`);
    /* build-modules: the number never counts up (it sits beside its reading), so it is there as drawn */
    ok(String(z2.v) === String(z2.shown) && z2.counts === false && /usual range/.test(z2.words), `FloraScore is the model's number, big, with its words, and never counts up (${z2.shown}: ${z2.words})`);
    ok(z2.big === "I had a BM|Something feels off|What I ate" && z2.week && z2.rows === z2.entries && z2.ck, "Today has the three big buttons, This week as the Easy read week card, today's logs as rows, and the check-in card when it's due");
    const mT = await zmeasure("today");
    ok(mT.minFont >= 16, `Easy Today: no text under 16px (smallest ${mT.minFont}px, "${mT.smallText}")`);
    ok(mT.minT >= 56, `Easy Today: every target at least 56px (smallest ${mT.minT}px, "${mT.smallT}")`);
    /* check-in off: no card, and Today never names it */
    await zset("checkin", "false");
    ok(await ez.evaluate(() => !document.querySelector(".rx-stage .ap-rx .ap-ez-ck") && !/check-in/i.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent)), "check-in off: Easy Today has no check-in card and never names it");
    await zset("checkin", "true");

    /* the plus menu: big labelled buttons; with quick tiles a word still saves in one tap */
    await ztap(".ap-tb-plus");
    const mP = await zmeasure("top");
    ok(mP.minFont >= 16 && mP.minT >= 56, `Easy plus menu: no text under 16px (${mP.minFont}px) and every target 56px or more (${mP.minT}px, "${mP.smallT}")`);
    /* fix-easy: I had a BM is a button into the steps and takes focus, so a stray Enter never saves a word */
    ok(await ez.evaluate(() => { const a = document.activeElement, o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return !!a && a.matches('.ap-ez-pbm [data-act="open-bm"]') && !o.querySelector(".ap-ez-word[data-autofocus]"); }), "Easy plus, quick tiles: I had a BM opens the steps and has focus, not a word that saves at once");
    const b0 = (await zbms()).length;
    await ztap('.ap-ez-word[data-form="5"]', 600);
    const q1 = await zbms();
    ok(q1.length === b0 + 1 && q1.some((e) => e.form === 5 && Math.abs(e.t - 19 - 40 / 60) < 0.01) && /BM saved/.test(await ztoast()), "Easy plus, quick tiles: a word saves the BM in one tap, at the time it's tapped");
    await ztap('.ap-tst [data-act="undo"]');
    ok((await zbms()).length === b0, "and Undo in the bigger toast takes it back");
    await zset("bmUI", "full");
    await ztap(".ap-tb-plus");
    const fu = await ez.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return { words: o.querySelectorAll(".ap-ez-word").length, row: !!o.querySelector('.ap-ez-big[data-act="open-bm"]') }; });
    ok(fu.words === 0 && fu.row, "Easy plus, Full form only: one I had a BM button and no word that saves on its own");
    await ez.keyboard.press("Escape"); await zw();
    /* fix-easy: dark, Full form only: the line under I had a BM keeps its Forest on Ray */
    await zset("theme", "dark"); await ztap(".ap-tb-plus");
    const zc = await ez.evaluate(() => {
      const rgb = (c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const em = document.querySelector('.rx-stage .ap-rx .ap-o:last-child .ap-ez-big--bm em'), bt = em.closest("button");
      const a = lum(getComputedStyle(em).color), b = lum(getComputedStyle(bt).backgroundColor);
      return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10;
    });
    ok(zc >= 7, `dark, Full form only: the line under I had a BM reads at ${zc}:1 on Ray`);
    await ez.keyboard.press("Escape"); await zw(); await zset("theme", "light");
    await zset("bmUI", "quick");

    /* Log a BM: one question per screen, four steps, a big Back */
    await zgo("today");
    await ztap('.ap-ez-do [data-act="open-bm"]', 600);
    const stepOf = () => ez.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return { step: (o.querySelector(".ap-ez-step") || {}).textContent || "", q: (o.querySelector(".ap-ez-q") || {}).textContent || "", focus: !!document.activeElement && document.activeElement.matches(".ap-ez-q"), back: (o.querySelector(".ap-ez-nav") || {}).textContent || "" }; });
    let sB = await stepOf(), mB = await zmeasure("top");
    ok(/Step 1 of 4/.test(sB.step) && sB.q === "What did it look like?" && sB.focus && /Close/.test(sB.back), `BM step 1: ${sB.q} (${sB.step}), focus on the question`);
    ok(await ez.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-o:last-child .ap-ez-opt .ap-gl").length) === 7, "step 1: the seven words of C as big rows, each with its mark");
    const bmSizes = [mB];
    await ztap('.ap-ez-opt[data-form="6"]', 800);
    sB = await stepOf();
    ok(/Step 2 of 4/.test(sB.step) && sB.q === "When was it?" && sB.focus && /Back/.test(sB.back), "a pick moves on by itself to step 2, When, with a big Back");
    bmSizes.push(await zmeasure("top"));
    await ztap('[data-act="ez-back"]', 500);
    ok(await ez.evaluate(() => document.querySelector('.rx-stage .ap-rx .ap-o:last-child .ap-ez-opt[data-form="6"]').getAttribute("aria-checked") === "true"), "Back goes to step 1 with the pick kept");
    await ztap('[data-act="ez-next"]', 500);
    await ztap('[data-act="ez-when"][data-v="today"]', 500);
    sB = await stepOf();
    ok(sB.q === "About what time today?" && await ez.evaluate(() => document.querySelectorAll('.rx-stage .ap-rx .ap-o:last-child [data-act="ez-hour"]').length) > 3, "Earlier today asks the hour, as big buttons");
    ok(await ez.evaluate(() => { const o = document.querySelector(".rx-stage .ap-rx .ap-o:last-child"); return /^Night/.test(o.querySelector(".ap-ez-hgrp-l").textContent) && !!o.querySelector('[data-act="ez-hour"][data-v="0"]') && !!o.querySelector('[data-act="ez-hour"][data-v="4"]'); }), "the hours start at midnight, under Night, so waking at night to go can be logged");
    bmSizes.push(await zmeasure("top"));
    await ztap('[data-act="ez-hour"][data-v="9"]', 800);
    sB = await stepOf();
    ok(/Step 3 of 4/.test(sB.step) && sB.q === "Anything else?", "step 3, Anything else");
    bmSizes.push(await zmeasure("top"));
    await ztap('[data-act="ez-xt"][data-v="rush"]', 200);
    await ztap('[data-act="ez-next"]', 500);
    sB = await stepOf();
    const rev = await ztop();
    ok(/Step 4 of 4/.test(sB.step) && /Loose/.test(rev) && /Today, 9:00 AM/.test(rev) && /Sudden urge to go/.test(rev), "step 4 shows every answer with Change before Save");
    bmSizes.push(await zmeasure("top"));
    const worstB = bmSizes.reduce((a, x) => ({ f: Math.min(a.f, x.minFont), t: Math.min(a.t, x.minT), ft: a.f <= x.minFont ? a.ft : x.smallText, tt: a.t <= x.minT ? a.tt : x.smallT }), { f: 99, t: 999, ft: "", tt: "" });
    ok(worstB.f >= 16, `the BM steps: no text under 16px (smallest ${worstB.f}px, "${worstB.ft}")`);
    ok(worstB.t >= 56, `the BM steps: every target at least 56px (smallest ${worstB.t}px, "${worstB.tt}")`);
    const b1 = (await zbms()).length;
    await ztap('[data-act="save-bm"]', 600);
    const sv = await zbms();
    ok(sv.length === b1 + 1 && sv.some((e) => e.form === 6 && e.word === null && Math.abs(e.t - 9) < 0.01 && e.rush && !e.flags.length) && /BM saved/.test(await ztoast()), "the four steps save the right entry: Loose, today at 9:00 AM, a sudden urge, no flag");
    /* the flag still routes to primary care */
    await ztap('.ap-ez-do [data-act="open-bm"]', 600);
    await ztap('.ap-ez-opt[data-form="4"]', 800);
    await ztap('[data-act="ez-when"][data-v="now"]', 800);
    await ztap('[data-act="ez-xt"][data-v="blood"]', 300);
    ok(/clinician/.test(await ztop()), "ticking blood says a clinician note comes after Save");
    await ztap('[data-act="ez-next"]', 500);
    await ztap('[data-act="save-bm"]', 700);
    const fl = await ez.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); const a = o && o.querySelector(".ap-ask-alarm"); return { alarm: !!a, text: o ? o.textContent : "", bg: a ? getComputedStyle(a).backgroundColor : "" }; });
    ok(fl.alarm && /Blood in your stool/.test(fl.text) && /Primary care is the right first stop/.test(fl.text) && await zkey() === "flag", "a flag ticked in the steps still opens the primary care note, Teal and never read");
    ok((await zbms()).some((e) => e.form === 4 && e.flags.includes("blood")), "and the BM is saved with its flag");
    await ez.keyboard.press("Escape"); await zw();
    /* fix-easy: Add details from the toast lands on step 3 with Back and the step counter in view */
    await ztap(".ap-tb-plus"); await ztap('.ap-ez-word[data-form="4"]', 600);
    await ztap('.ap-tst [data-act="edit"]', 800);
    const adz = await ez.evaluate(() => { const r = document.querySelector(".rx-stage .ap-rx"), o = [...r.querySelectorAll(".ap-o:not(.is-out)")].pop(), n = o.querySelector(".ap-ez-nav").getBoundingClientRect(), rr = r.getBoundingClientRect(); return { scroll: r.scrollTop, step: (o.querySelector(".ap-ez-step") || {}).textContent, inView: n.top >= rr.top && n.bottom <= rr.bottom }; });
    ok(adz.scroll === 0 && adz.step === "Step 3 of 4" && adz.inView, `Add details opens step 3 with Back and the step counter in view (the phone scrolled ${adz.scroll}px)`);
    await ez.keyboard.press("Escape"); await zw();
    /* a word logged in B keeps its word */
    await zset("form", "B");
    await ztap('.ap-ez-do [data-act="open-bm"]', 600);
    ok(await ez.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-o:last-child .ap-ez-opt").length) === 5, "in B, step 1 has the five words");
    await ztap('.ap-ez-opt[data-word="3"]', 800);
    await ztap('[data-act="ez-when"][data-v="now"]', 800);
    await ztap('[data-act="ez-next"]', 500);
    await ztap('[data-act="save-bm"]', 600);
    ok((await zbms()).some((e) => e.form === null && e.word === 3 && Math.abs(e.t - 19 - 40 / 60) < 0.01), "in B, the steps save the word itself (form null, word Loose)");
    await zset("form", "C");
    /* fix-easy: that word, seen in C, marks its two steps in words, not by an outline alone */
    await ez.evaluate(() => { const L = window.FLORIN_LOGS, e = L.day(window.FLORIN_EXT.api.M(), L.TODAY).entries.filter((x) => x.kind === "bm" && x.word === 3).pop(); document.querySelector(`.rx-stage .ap-rx [data-act="edit"][data-id="${e.id}"]`).click(); }); await zw(600);
    await ztap('[data-act="ez-goto"][data-v="1"]', 500);
    const mb = await ez.evaluate(() => { const o = document.querySelector(".rx-stage .ap-rx .ap-o:last-child"); return { tags: [...o.querySelectorAll(".ap-ez-opt.is-maybe")].map((b) => b.dataset.form + ":" + /Could be this one/.test(b.textContent)).join(","), line: /You logged Loose, which could be either of the two/.test(o.textContent) }; });
    ok(mb.tags === "5:true,6:true" && mb.line, `a word logged in B, opened in C: its two steps say Could be this one (${mb.tags})`);
    await ez.keyboard.press("Escape"); await zw();
    /* an entry opens on its review, with Save changes and Delete */
    await ez.evaluate(() => { const r = document.querySelector('.rx-stage .ap-rx .ap-ez-tl [data-act="edit"]'); r.click(); }); await zw(600);
    const ed = await ztop();
    ok(/Step 4 of 4/.test(ed) && /Save changes/.test(ed) && /Delete this BM/.test(ed), "a BM opened from Today's logs lands on its review, with Save changes and Delete");
    await ez.keyboard.press("Escape"); await zw();

    /* symptoms: big chips, three big strength buttons */
    await ztap('.ap-ez-do [data-act="open-sym"]', 600);
    await ztap('[data-act="sym"][data-v="Bloating"]', 300);
    const mS = await zmeasure("top");
    ok(await ez.evaluate(() => document.querySelectorAll('.rx-stage .ap-rx .ap-o:last-child [data-act="str"]').length) === 3 && mS.minFont >= 16 && mS.minT >= 56, `symptoms: big chips and three strength buttons, no text under 16px (${mS.minFont}px), targets 56px or more (${mS.minT}px)`);
    await ztap('[data-act="str"][data-v="3"]', 200);
    await ztap('[data-act="save-sym"]', 600);
    ok(await ez.evaluate(() => { const L = window.FLORIN_LOGS, x = L.day(window.FLORIN_EXT.api.M(), L.TODAY); return x.entries.some((e) => e.kind === "sym" && e.items.length === 1 && e.items[0].name === "Bloating" && e.items[0].s === 3); }), "and Save logs Bloating, strong");
    /* fix-easy: catching up a symptom asks about when, and saves the part of the day picked */
    await ztap(".ap-tb-plus"); await ztap('[data-act="plus-earlier"]', 600);
    const cd = await ez.evaluate(() => [...document.querySelectorAll('.rx-stage .ap-rx .ap-o:not(.is-out) [data-act="plus-day"]')].pop().dataset.v);
    await ztap(`.ap-o:last-child [data-act="plus-day"][data-v="${cd}"]`, 600);
    await ztap('.ap-o:last-child [data-act="open-sym"]', 600);
    await ztap('[data-act="sym"][data-v="Gas"]', 300);
    const pod = await ez.evaluate(() => [...document.querySelectorAll('.rx-stage .ap-rx .ap-o:last-child [data-act="ez-sym-t"]')].map((b) => b.getAttribute("aria-checked") === "true" ? "*" + b.dataset.v : b.dataset.v).join(","));
    await ztap('[data-act="ez-sym-t"][data-v="19"]', 300);
    await ztap('[data-act="save-sym"]', 600);
    ok(pod === "9,*12,15,19,22" && await ez.evaluate((d) => { const L = window.FLORIN_LOGS; return L.day(window.FLORIN_EXT.api.M(), +d).entries.some((e) => e.kind === "sym" && e.items.some((i) => i.name === "Gas") && Math.abs(e.t - 19) < 0.01); }, cd), `catching up a symptom: About when shows Midday picked (what's kept), and Evening saves at 7:00 PM (${pod})`);

    /* Insights, folded under Today: Your weeks for a member, the paywall on Free */
    await zgo("today");
    await ztap('[data-act="tab"][data-tab="insights"]', 600);
    ok(await zkey() === "ez-weeks" && await ez.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-ez-weeks .lk-easy .ez").length) >= 8, "More about your weeks opens Your weeks, the Easy read cards");
    /* fix-easy: a member's cards carry Ask about this, and Ask's intro points to them */
    const ak = await ez.evaluate(() => [...document.querySelectorAll('.rx-stage .ap-rx .ap-ez-weeks [data-act="ask-about"]')].map((b) => b.dataset.k).join(","));
    await ztap('.ap-ez-weeks [data-act="ask-about"][data-k="timing"]', 800);
    const ai = await ez.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").textContent);
    ok(ak === "score,timing,often,form,sym,ck,pat" && await zkey() === "ask-about" && !/any Insights card/.test(ai), `Your weeks: Ask about this on each card with an Insights twin (${ak}), and it opens Ask with that card`);
    await zset("plan", "free"); await zgo("today");
    await ztap('.ap-ez-big[data-act="pay"]', 600);
    ok(/Florin membership/.test(await ztop()) && await zkey() === "pay", "on Free, More weeks opens the membership sheet");
    const ph = await ez.evaluate(() => { const h = document.querySelector(".rx-stage .ap-rx .ap-o:last-child .ap-pay-hero"), t = h.querySelector("h2").getBoundingClientRect(), r = h.getBoundingClientRect(); return { clip: h.scrollHeight - h.clientHeight, inside: t.bottom <= r.bottom }; });
    ok(ph.clip <= 1 && ph.inside, `Easy, the membership sheet: its headline and line show in full (${ph.clip}px clipped)`);
    await ez.keyboard.press("Escape"); await zw();
    await zset("plan", "member");
    /* dark theme reaches the look's cards; a new person's day 1 draws */
    await zset("theme", "dark"); await zw(200);
    ok(await ez.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .lk-easy")].every((x) => x.dataset.theme === "dark")), "dark: the Easy read cards follow the phone's theme");
    await zset("theme", "light");
    await zset("data", "fresh"); await zw(300);
    const fr = await ez.evaluate(() => ({ say: document.querySelector(".rx-stage .ap-rx .ap-ez-say").textContent, n: (document.querySelector(".rx-stage .ap-rx .ap-ez-score .ez-n") || {}).textContent }));
    ok(fr.say === "Nothing logged yet today." && fr.n === "Day 1", `Just joined: Today says so, and the big line under FloraScore reads Day 1, never a bare 1 (${fr.n})`);
    /* fix-easy: Just joined has no day before today, so the BM steps never offer Yesterday, and Today has no week card yet */
    ok(await ez.evaluate(() => !document.querySelector(".rx-stage .ap-rx .ap-ez-today .ez-week")), "Just joined: Today leaves the week card off until the week has a second day");
    await ztap('.ap-ez-do [data-act="open-bm"]', 600); await ztap('.ap-ez-opt[data-form="4"]', 800);
    ok(await ez.evaluate(() => { const o = document.querySelector(".rx-stage .ap-rx .ap-o:last-child"); return !o.querySelector('[data-act="ez-when"][data-v="yesterday"]') && !!o.querySelector('[data-act="ez-when"][data-v="today"]'); }), "Just joined: When offers Just now and Earlier today, no Yesterday to lose a log to");
    await ez.keyboard.press("Escape"); await zw();
    await zset("data", "est");

    /* a wrapper whose Easy screen throws draws the standard one, and says why */
    const iso = await ez.evaluate(() => {
      const was = window.FLD.build, cw = console.warn, warns = [];
      console.warn = (...a) => warns.push(String(a[0]));
      window.FLD.build = () => { throw new Error("test"); };
      window.FLORIN_EXT.api.renderTab(true);
      const std = !!document.querySelector(".rx-stage .ap-rx .ap-layer .ap-today") && !document.querySelector(".rx-stage .ap-rx .ap-ez-today");
      window.FLD.build = was; console.warn = cw;
      window.FLORIN_EXT.api.renderTab(true);
      return { std, warned: warns.some((w) => /refresh-easy/.test(w)), back: !!document.querySelector(".rx-stage .ap-rx .ap-ez-today") };
    });
    ok(iso.std && iso.warned && iso.back, "if Easy's Today throws, the standard Today is drawn and a console.warn names refresh-easy.js");

    /* the Version note, and the screens in the list, which turn Easy on */
    await ez.evaluate(() => document.querySelector('[data-rx="dinfo"][data-v="easy"]').click()); await zw(300);
    const vn = await ez.evaluate(() => ({ t: document.querySelector("#rxNotes h2").textContent, marked: [...document.querySelectorAll("#rxNotes .rx-opt.is-rec .rx-opt-h b")].map((x) => x.textContent).join(","), rec: (document.querySelector("#rxNotes .rx-rec") || {}).textContent || "" }));
    ok(vn.t === "Should the app offer larger text and simpler screens?" && vn.marked === "Easy" && /^We recommend Easy as a setting anyone can turn on or off, "Larger text and simpler screens"/.test(vn.rec), `the Version note recommends Easy as a setting anyone can turn on (${vn.marked})`);
    await ez.keyboard.press("Escape"); await zw(300);
    await zset("easy", "false"); await zgo("today");
    await zgo("ez-today");
    ok(await zpressed("easy") === "true" && await zkey() === "ez-today", "Easy version: Today in the Screens list shows Easy, and the toggle follows");
    await zgo("ez-bm");
    ok(await zkey() === "ez-bm" && /What did it look like\?/.test(await ztop()), "Easy version: log a BM opens step 1");
    /* fix-easy: in Easy, History's filters wrap, none off the edge */
    await ez.evaluate(() => document.querySelector('.rx-stage .ap-rx .ap-tb [data-tab="history"]').click()); await zw();
    ok(await ez.evaluate(() => { const r = document.querySelector(".rx-stage .ap-rx"), f = r.querySelector(".ap-hist-f"); return r.classList.contains("ap--easy") && !!f && f.scrollWidth <= f.clientWidth + 1; }), "Easy History: the filters all show, wrapped, none off the edge");
    /* integrate: the Easy screens set Version to Easy and it stays, as Home: Day first sets Home, so the phone and the
       left bar always agree; Standard on the left gives the standard version back, tab bar and all */
    await zgo("history");
    const kept = await ez.evaluate(() => ({ stored: localStorage.getItem("florin-refresh:easy"), easy: document.querySelector(".rx-stage .ap-rx").classList.contains("ap--easy") }));
    ok(await zpressed("easy") === "true" && kept.easy && kept.stored === "true", "after the Easy screens, the next screen in the list is still Easy, and the toggle and the stored decision say so");
    await ez.evaluate(() => window.FLORIN_EXT.api.set("easy", false)); await zw(300);
    await zgo("ez-bm");
    ok(await zpressed("easy") === "true", "Easy version: log a BM turns Easy on too");
    await zset("easy", "false"); await zgo("history");
    ok(await zpressed("easy") === "false" && await ez.evaluate(() => { const r = document.querySelector(".rx-stage .ap-rx"), p = r.querySelector(".ap-tb-plus"); return !r.classList.contains("ap--easy") && p.getAttribute("aria-label") === "Log something" && !p.querySelector(".ap-ez-tbl") && getComputedStyle(r.querySelector('.ap-tb [data-tab="insights"]')).display !== "none"; }), "Standard on the left gives the standard version back, tab bar and all");
    ok(!ee.length, `no console or page errors in the Easy checks${ee.length ? ": " + ee.slice(0, 3).join(" | ") : ""}`);
    await ez.close();
    /* fix-easy: a 360px phone: on plus, no word breaks inside itself, in A, B or C */
    const ez3 = await b.newPage({ viewport: { width: 360, height: 780 } });
    await ez3.goto(PAGE); await ez3.waitForSelector(".rx-stage .ap-rx"); await ez3.waitForTimeout(400);
    await ez3.evaluate(() => window.FLORIN_EXT.api.set("easy", true)); await ez3.waitForTimeout(300);
    const broke = [];
    for (const f of ["A", "B", "C"]) {
      await ez3.evaluate((f) => window.FLORIN_EXT.api.set("form", f), f); await ez3.waitForTimeout(300);
      await ez3.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-tb-plus").click()); await ez3.waitForTimeout(500);
      broke.push(...await ez3.evaluate((f) => [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:last-child .ap-ez-word b")].filter((x) => !/\s/.test(x.textContent.trim()) && x.getBoundingClientRect().height > parseFloat(getComputedStyle(x).lineHeight) * 1.5).map((x) => `${f}: ${x.textContent}`), f));
      await ez3.keyboard.press("Escape"); await ez3.waitForTimeout(400);
    }
    ok(!broke.length, `Easy plus at 360px: every word on one line${broke.length ? ` (broken: ${broke.join(", ")})` : ""}`);
    await ez3.close();
    /* ----- fix-easy (pass 3): the Easy tab bar's four words sit on one line, the plus's 36px circle included, at 360
       and 390, light and dark; the icons stay centred on one line and every tab stays 64px tall ----- */
    {
      const off = [];
      for (const [w, h] of [[360, 780], [390, 844]]) {
        for (const theme of ["light", "dark"]) {
          const tp = await b.newPage({ viewport: { width: w, height: h }, colorScheme: theme });
          await tp.goto(PAGE); await tp.waitForSelector(".rx-stage .ap-rx"); await tp.waitForTimeout(400);
          await tp.evaluate((t) => { window.FLORIN_EXT.api.set("easy", true); const x = document.querySelector(`[data-rx="theme"][data-v="${t}"]`); if (x && x.getAttribute("aria-pressed") !== "true") x.click(); }, theme);
          await tp.waitForTimeout(400);
          const tm = await tp.evaluate(() => {
            const tb = document.querySelector(".rx-stage .ap-rx .ap-tb");
            return [...tb.querySelectorAll("button")].filter((x) => getComputedStyle(x).display !== "none").map((x) => {
              const r = x.getBoundingClientRect(), i = x.querySelector(".ic").getBoundingClientRect(), s = x.querySelector("span").getBoundingClientRect();
              return { w: x.textContent.trim(), h: r.height, lab: s.top - r.top, icon: i.top + i.height / 2 - r.top };
            });
          });
          const spread = (k) => Math.max(...tm.map((x) => x[k])) - Math.min(...tm.map((x) => x[k]));
          if (tm.length !== 4 || spread("lab") > 0.5 || spread("icon") > 0.5 || tm.some((x) => Math.round(x.h) !== 64)) off.push(`${w} ${theme}: ${tm.map((x) => `${x.w} word ${x.lab.toFixed(1)}, icon ${x.icon.toFixed(1)}, ${x.h.toFixed(0)}px`).join("; ")}`);
          await tp.close();
        }
      }
      ok(!off.length, `Easy tab bar: Today, Add, History and Ask have their words on one line and their icons centred on one line, 64px tall, at 360 and 390, light and dark${off.length ? ` (${off.join(" | ")})` : ""}`);
    }
    /* ----- end fix-easy (pass 3) ----- */
  }
  /* ===== end build-easy ===== */

  /* ===== fix-library: the data looks (library/js) read this week's saved check-in, count days and BMs the way Insights
     does (within out of the days or BMs read either way, the rest named), say a one-day stretch in words, keep Bento's
     usual edge at 3:1 on light and give every Bento board a heading ===== */
  {
    const lq = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const le = [];
    lq.on("pageerror", (e) => le.push(e.message));
    lq.on("console", (m) => { if (m.type() === "error") le.push(m.text()); });
    await lq.goto(PAGE); await lq.waitForSelector(".rx-stage .ap-rx"); await lq.waitForTimeout(400);
    const R = await lq.evaluate(() => {
      const L = window.FLORIN_LOGS, FLL = window.FLL, LOOKS = window.FLOOKS, U = window.FLORIN_APP.util;
      const txt = (h) => { const t = document.createElement("div"); t.innerHTML = h; return t.textContent.replace(/\s+/g, " ").trim(); };
      const draw = (M, keys) => {
        const D = window.FLD.build(M.P.id, { mode: "C", M }), o = { D, html: {}, t: {} };
        LOOKS.forEach((lk) => keys.forEach((k) => { const h = lk.components[k](D, { uid: `fl${lk.id}${k}`, theme: "light", esc: FLL.esc, T: FLL.T, n1: FLL.n1, lin: FLL.lin, C: FLL.C, motion: false }); o.html[`${lk.id}.${k}`] = h; o.t[`${lk.id}.${k}`] = txt(h); }));
        return o;
      };
      const save = (M, a) => Object.assign(M.checkin, { status: "done", answers: a, tags: [], note: "" });
      const r = {};
      /* the check-in, saved this week, 12 weeks in: every look reads it as the latest week */
      {
        const M = L.build("sarah", "est", { meals: "all" }); save(M, [3, 3, 3, 3]);
        const o = draw(M, ["checkin"]), Q = o.D.checkin.questions, prev = Q[0].weeks[Q[0].weeks.length - 2].label.replace("Week of ", "");
        r.ckEst = { data: o.D.checkin.saved && Q.every((q) => q.latest && q.latest.label === "This week" && q.latest.v === 3 && q.cmp && q.cmp.k !== "same"), stale: LOOKS.filter((lk) => !/this week/i.test(o.t[`${lk.id}.checkin`]) || o.t[`${lk.id}.checkin`].includes(prev)).map((lk) => lk.id), prev };
      }
      /* the first check-in saved, while learning (Just joined, day 5): saved, not compared, never "No answer yet" */
      r.ckFirst = ["fresh", "new"].map((data) => {
        const M = L.build("sarah", data, { meals: "all" }); save(M, [1, 1, 2, 1]);
        const o = draw(M, ["checkin"]), C = o.D.checkin, bad = [];
        if (!(C.saved && C.count === 1 && C.questions.every((q) => q.latest && q.latest.label === "This week" && !q.cmp))) bad.push("data");
        LOOKS.forEach((lk) => { const t = o.t[`${lk.id}.checkin`], h = o.html[`${lk.id}.checkin`]; if (/No answer yet|Not answered|answers? moved|Not started|0 of 0/.test(t) || /the this week/i.test(h)) bad.push(`${lk.id}: ${t.slice(0, 90)}`); });
        if (!/1\s*of 3 check-ins saved/.test(o.t["rings.checkin"])) bad.push("rings count");
        if (!/Your first check-in, this week, is saved/.test(o.t["journal.checkin"])) bad.push("journal lede");
        if (!/Your first check-in is saved/.test(o.t["oura.checkin"]) || !/Your first check-in is saved/.test(o.t["bento.checkin"])) bad.push("oura or bento");
        return `${data}: ${bad.join("; ") || "ok"}`;
      });
      /* days: within out of within plus shifted, from L.facts, and the day left out named (a gap day logged with a
         symptom only; Alex's B word Loose today, read in C) */
      const dayCase = (M, look4) => {
        const o = draw(M, ["week", "month"]), bad = [];
        [[7, "week"], [30, "month"]].forEach(([n, k]) => {
          const F = L.span(M, n, "C"), w = F.filter((f) => f.state === "usual").length, kn = w + F.filter((f) => f.state === "shifted").length;
          ["rings", "oura", "easy"].forEach((id) => { if (!new RegExp(`(?<!\\d)${w}\\s*of ${kn} days within your usual`).test(o.t[`${id}.${k}`])) bad.push(`${id}.${k} not ${w} of ${kn}`); });
          if (!o.t[`bento.${k}`].includes(`On ${w} of ${kn} days`)) bad.push(`bento.${k} not ${w} of ${kn}`);
          /* build-modules: Easy read's week names a day not counted in its own line, as Today's card does (L.dayWhy) */
          const easyWeek = () => F.filter((f) => f.logged && (f.state === "unsure" || f.state === "nocount")).map((f) => L.dayWhy(M, f, "C").line);
          if (look4(F, k)) ["rings", "oura", "easy", "bento"].forEach((id) => { const want = id === "easy" && k === "week" ? easyWeek() : [look4(F, k)]; if (!want.length || !want.every((w) => o.t[`${id}.${k}`].includes(w))) bad.push(`${id}.${k} names nothing left out`); });
        });
        return bad;
      };
      {
        const M = L.build("sarah", "est", { meals: "all" }), g = L.span(M, 7, "C").find((f) => !f.logged && !f.today);
        L.add(M, { kind: "sym", d: g.d, t: 13, items: [{ name: "Bloating", s: 0 }], note: "" });
        const name = U.DOWL[L.dateOf(g.d).getDay()];
        r.gap = dayCase(M, (F, k) => (k === "week" ? `${name} had nothing about BMs, so it isn't counted` : "1 day had nothing about BMs, so it isn't counted"));
        r.gapLeft = L.span(M, 7, "C").filter((f) => f.logged).length - L.span(M, 7, "C").filter((f) => f.state === "usual" || f.state === "shifted").length;
      }
      {
        const M = L.build("alex", "est", { meals: "all" });
        L.add(M, { kind: "bm", d: L.TODAY, t: L.NOW, form: null, word: 3, how: {}, dur: null, flags: {}, note: "" });
        r.loose = dayCase(M, (F, k) => (k === "week" ? "Today could be either, so it isn't counted" : ""));
        /* forms: within out of the BMs read either way, the either named in sight; and a word read firmer (Hard) is firmer */
        const o = draw(M, ["form"]), bms = L.span(M, 30, "C").flatMap((f) => f.bms), w = bms.filter((x) => L.inForms(M, x, "C") === true).length, e = bms.filter((x) => L.inForms(M, x, "C") === null).length;
        r.form = { w, read: bms.length - e, e, bad: ["rings", "bento", "oura", "easy"].filter((id) => !new RegExp(`(?<!\\d)${w}\\s*of ${bms.length - e}(?!\\d)`).test(o.t[`${id}.form`])).concat(/1 could be either/.test(o.t["rings.form"]) ? [] : ["rings either"]) };
        const H = L.build("alex", "est", { meals: "all" });
        L.add(H, { kind: "bm", d: L.TODAY, t: L.NOW, form: null, word: 0, how: {}, dur: null, flags: {}, note: "" });
        const oh = draw(H, ["form"]);
        r.hard = [/(?<!\d)1 was firmer\b/.test(oh.t["rings.form"]), /(?<!\d)1 firmer than your usual/.test(oh.t["bento.form"]), oh.D.form.firmer === 1];
      }
      /* day 1, nothing logged: no "0 of 1", "of 0", "1 days", "Last 1 days" or "Oct 11 to Oct 11" anywhere */
      {
        const M = L.build("sarah", "fresh", { meals: "all" }), keys = ["score", "week", "month", "timing", "often", "form", "symptoms", "pattern"];
        const o = draw(M, keys), d0 = o.D.days[7][0].label, re = new RegExp(`(?<!\\d)0 ?of \\d|\\bof 0(?!\\d)|(?<!\\d)1 days\\b|[Ll]ast 1 days|${d0} to ${d0}|(?<!\\d)0 days logged|BMs on 0|(?<!\\d)0 logged`);
        r.fresh = [];
        LOOKS.forEach((lk) => keys.forEach((k) => { const t = o.t[`${lk.id}.${k}`], h = o.html[`${lk.id}.${k}`]; const m = t.match(re) || h.match(/aria-label="[^"]*\b(0 of \d|of 0\b|1 days)[^"]*"/); if (m) r.fresh.push(`${lk.id}.${k}: ${m[0].slice(0, 60)}`); }));
      }
      return r;
    });
    ok(R.ckEst.data && !R.ckEst.stale.length, `fix-library: a check-in saved this week is every data style's latest week, read against the first weeks, not the week of ${R.ckEst.prev}${R.ckEst.stale.length ? ` (stale: ${R.ckEst.stale.join(", ")})` : ""}`);
    ok(R.ckFirst.every((x) => /: ok$/.test(x)), `fix-library: a first check-in saved while learning reads as saved, never No answer yet or 0 answers moved (${R.ckFirst.join(" | ")})`);
    ok(R.gapLeft > 0 && !R.gap.length, `fix-library: a day logged with nothing about BMs is left out of within your usual and named, week and month, in Rings, Oura, Easy read and Bento${R.gap.length ? `: ${R.gap.join("; ")}` : ""}`);
    ok(!R.loose.length, `fix-library: a day that could be either is left out of within your usual and named${R.loose.length ? `: ${R.loose.join("; ")}` : ""}`);
    ok(!R.form.bad.length, `fix-library: form cards say ${R.form.w} of ${R.form.read} within, the ${R.form.e} that could be either named, as Insights does${R.form.bad.length ? `: ${R.form.bad.join(", ")}` : ""}`);
    ok(R.hard.every(Boolean), `fix-library: a word read firmer than the usual forms (Hard, in C) counts as firmer in Rings and Bento (${R.hard.join(", ")})`);
    ok(!R.fresh.length, `fix-library: on day 1 with nothing logged, no data style says 0 of 1, of 0, 1 days or a one-day span as a range${R.fresh.length ? `: ${R.fresh.slice(0, 4).join(" | ")}` : ""}`);
    /* in the app: Bento's usual edge against the card, and one heading per board */
    const lpick = async (k, v) => { await lq.evaluate(([k, v]) => document.querySelector(`[data-rx="${k}"][data-v="${v}"]`).click(), [k, v]); await lq.waitForTimeout(300); };
    const lopen = async (id) => { await lq.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await lq.waitForTimeout(500); };
    await lpick("look", "bento");
    const edge = {};
    for (const th of ["light", "dark"]) {
      await lpick("theme", th); await lopen("look-today");
      edge[th] = await lq.evaluate(() => {
        const parse = (s) => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = s; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const pill = document.querySelector('.rx-stage .ap-rx [data-rlk-k="week"] .bt-day--u .bt-pill');
        if (!pill) return 0;
        const card = parse(getComputedStyle(pill.closest(".bt-t")).backgroundColor).slice(0, 3), m = getComputedStyle(pill).boxShadow.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\))/);
        const e = parse(m[1]), a = e[3] / 255, mix = [0, 1, 2].map((i) => Math.round(e[i] * a + card[i] * (1 - a)));
        const x = lum(mix), y = lum(card);
        return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
      });
    }
    ok(edge.light >= 3 && edge.dark >= 3, `fix-library: Bento's within-your-usual day edge is 3:1 or more against the card (light ${edge.light}, dark ${edge.dark})`);
    await lpick("theme", "light"); await lopen("look-insights");
    const bh = await lq.evaluate(() => { const bt = [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .bt")]; return { n: bt.length, one: bt.filter((a) => a.querySelectorAll("h1, h2, h3, h4").length === 1).length, h2: [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .bt h2")].map((h) => getComputedStyle(h).fontWeight).every((fw) => fw === "400") }; });
    ok(bh.n >= 10 && bh.one === bh.n && bh.h2, `fix-library: in Bento's Insights every board has one heading, kept at the kicker's weight (${bh.one} of ${bh.n})`);
    const lib = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    lib.on("pageerror", (e) => le.push(e.message));
    await lib.goto("file://" + path.resolve(__dirname, "../library/_local.html")); await lib.waitForTimeout(600);
    const lh = await lib.evaluate(() => { const bt = [...document.querySelectorAll(".lk-bento .bt")]; return { n: bt.length, one: bt.filter((a) => a.querySelectorAll("h3").length === 1).length }; });
    ok(lh.n >= 10 && lh.one === lh.n, `fix-library: on the library page every Bento board has one h3 under its row's h2 (${lh.one} of ${lh.n})`);
    await lib.close();
    ok(!le.length, `fix-library: no console or page errors${le.length ? ": " + le.slice(0, 2).join(" | ") : ""}`);
    await lq.close();
  }
  /* ===== end fix-library ===== */

  /* ===== integrate: the modules as one ===== */
  {
    const g = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const ge = [];
    g.on("pageerror", (e) => ge.push(e.message));
    g.on("console", (m) => { if (m.type() === "error") ge.push(m.text()); });
    await g.goto(PAGE); await g.waitForSelector(".rx-stage .ap-rx"); await g.waitForTimeout(400);
    const gw = (ms = 450) => g.waitForTimeout(ms);
    const ggo = async (id) => { await g.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await gw(); };
    /* Make a report, on the note after a flagged BM, opens Ask Florin on the clinician path with that log's sign */
    await ggo("flag");
    await g.click('.rx-stage .ap-rx .ap-fl [data-act="flag-report"]'); await g.waitForTimeout(900);
    const fr = await g.evaluate(() => { const ph = document.querySelector(".rx-stage .ap-rx"); const a = [...ph.querySelectorAll(".ap-askx-a")].pop(); return { tab: window.FLORIN_EXT.api.S.tab, open: ph.querySelectorAll(".ap-o:not(.is-out)").length, q: ([...ph.querySelectorAll(".ap-ask-me")].pop() || {}).textContent || "", alarm: !!(a && a.querySelector(".ap-ask-alarm")), sign: a ? (a.querySelector(".ap-ask-alarm b") || {}).textContent : "", key: window.FLORIN_EXT.api.key() }; });
    ok(fr.tab === "ask" && !fr.open && fr.alarm && /Blood/.test(fr.sign) && fr.key === "ask-alarm" && /I logged blood today/.test(fr.q), `Make a report on the flag note opens Ask Florin on the clinician path, the sign named on the Teal banner (${fr.sign || fr.key})`);
    await g.evaluate(() => window.FLORIN_EXT.api.set("plan", "free")); await gw(300);
    await ggo("flag");
    await g.click('.rx-stage .ap-rx .ap-fl [data-act="flag-report"]'); await gw(600);
    ok(await g.evaluate(() => !!document.querySelector(".rx-stage .ap-rx .ap-o--t-pay:not(.is-out)")), "on Free, Make a report opens the membership sheet");
    await g.evaluate(() => window.FLORIN_EXT.api.set("plan", "member")); await gw(300);
    /* the Easy version's detail pages: the back word (Your weeks) stays on one line beside the longest titles */
    await g.evaluate(() => window.FLORIN_EXT.api.set("easy", true)); await gw(300);
    const wrapped = [];
    for (const id of ["i-ck", "i-pat", "i-score", "i-timing"]) {
      await ggo(id);
      const w = await g.evaluate(() => { const b = document.querySelector(".rx-stage .ap-rx .ap-layer .ap-back span"); if (!b) return "no back"; const lh = parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.3; return b.getBoundingClientRect().height > lh * 1.5 ? b.textContent : ""; });
      if (w) wrapped.push(`${id}: ${w}`);
    }
    ok(!wrapped.length, `Easy: a detail page's back word stays on one line (${wrapped.join(", ") || "Your weeks, on 4 pages"})`);
    await g.evaluate(() => window.FLORIN_EXT.api.set("easy", false)); await gw(300);
    ok(!ge.length, `no console or page errors in the integration checks${ge.length ? ": " + ge.slice(0, 3).join(" | ") : ""}`);
    await g.close();
  }

  /* ===== fix-core: the third review's core findings, kept as checks. Score first's sentence leads with what stood
     out; a BM's own note and the wider alarm net hear more ways of writing a sign; the week's score change and the
     meal coverage say the same numbers everywhere; the page's notes, Screens list, skip link and Show it button ===== */
  {
    const cp = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const ce = [];
    cp.on("pageerror", (e) => ce.push(e.message));
    cp.on("console", (m) => { if (m.type() === "error") ce.push(m.text()); });
    await cp.goto(PAGE); await cp.waitForSelector(".rx-stage .ap-rx"); await cp.waitForTimeout(500);
    const cw = (ms = 350) => cp.waitForTimeout(ms);
    const cgo = async (id) => { await cp.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await cw(); };
    const cset = async (k, v) => { await cp.evaluate(([k, v]) => { const x = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (x && x.getAttribute("aria-pressed") !== "true") x.click(); }, [k, v]); await cw(); };
    const hero = () => cp.evaluate(() => { const h = document.querySelector(".rx-stage .ap-rx .ap-layer .ap-hero"), s = h && h.querySelector(".ap-hero-sub"); return h ? { line: h.querySelector(".ap-hero-line").textContent, sub: s.textContent, flag: s.classList.contains("ap-hero-flag"), aria: h.getAttribute("aria-label") || "" } : null; });
    const cadd = (e) => cp.evaluate((e) => { const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS; L.add(api.M(), Object.assign({ d: L.TODAY, how: {}, dur: null, flags: {}, note: "" }, e)); api.renderTab(true); }, e);
    await cset("form", "C"); await cgo("today");
    /* 1. Score first: the day's top item leads, ranked as Day first ranks it */
    const h0 = await hero();
    /* with membership the sentence goes on to say what that log did to FloraScore (RU.scoreEffect) */
    const top0 = await cp.evaluate(() => { const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = window.FLORIN_EXT.api.M(); const N = RU.standouts(M, "C")[0]; if (!N) return null; const fx = RU.scoreEffect(M, "C", N); return `${RU.leadText(M, "C", N)}${fx ? ` ${fx}` : ""}`; });
    ok(h0 && h0.sub === top0 && /^Mild bloating at /.test(h0.sub) && !h0.flag, `fix-core: Score first's sentence leads with what stood out today, a mild symptom on Sarah's day (${h0 && h0.sub})`);
    await cadd({ kind: "bm", t: 19.67, form: 7 });
    const h1 = await hero();
    ok(/^Your 7:40 PM BM was Watery, outside your usual forms/.test(h1.sub) && !h1.flag && /usual range|Within/.test(h1.line), `fix-core: a Watery BM leads the Score first sentence, outside your usual forms (${h1.sub})`);
    await cadd({ kind: "bm", t: 19.7, form: 4, flags: { blood: true } });
    const h2 = await hero();
    ok(h2.flag && /^Blood in your stool, noted in a log today: primary care is the right first stop\.$/.test(h2.sub) && h2.line === "Not read against your usual today." && !/usual range|Within|above|below/i.test(h2.line + h2.sub) && h2.aria.includes(h2.sub), `fix-core: a flagged BM leads as the Teal note, names the sign, reads nothing, and the card's label says it (${h2.sub})`);
    /* the Teal note is Teal on the Forest card, never red: its edge's hue sits with Teal's */
    const tl = await cp.evaluate(() => { const s = document.querySelector(".rx-stage .ap-rx .ap-hero-flag"); return getComputedStyle(s).boxShadow + " " + getComputedStyle(s).backgroundColor; });
    ok(!/rgb\((2[0-9]{2}), ([0-9]{1,2}), ([0-9]{1,2})\)/.test(tl), `fix-core: the note on the score card is Teal, not red (${tl.slice(0, 60)})`);
    await cp.evaluate(() => window.FLORIN_EXT.api.set("data", "est")); await cw();
    /* 2. a BM's own note: the BM is the stool */
    const bmNet = await cp.evaluate(() => {
      const L = window.FLORIN_LOGS;
      const yes = ["It looked like tar", "Black and sticky", "It was black", "Jet black, smelled awful", "very dark today", "almost black", "bright red", "some red in it", "Dark red streaks", "maroon"];
      const no = ["After black coffee", "red pepper soup last night", "no black, normal colour", "Had a red wine", "Sudden urge this morning.", "Late dinner last night."];
      return { missed: yes.filter((t) => !L.alarmsIn(t, { bm: true }).length), tripped: no.filter((t) => L.alarmsIn(t, { bm: true }).length), general: yes.filter((t) => /^(bright red|maroon|some red in it)$/.test(t) && L.alarmsIn(t).length) };
    });
    ok(!bmNet.missed.length && !bmNet.tripped.length && !bmNet.general.length, `fix-core: a BM's note is read with the BM net: a colour alone is a sign there, a food after it isn't, and a question elsewhere keeps the narrower net (missed: ${bmNet.missed.join(" | ") || "none"}; tripped: ${bmNet.tripped.join(" | ") || "none"}; general net: ${bmNet.general.join(" | ") || "none"})`);
    await cgo("bm");
    await cp.click('.rx-stage .ap-rx .ap-fm-b[data-form="4"]'); await cw(150);
    await cp.fill('.rx-stage .ap-rx [data-in="note"]', "It looked like tar");
    await cp.click('.rx-stage .ap-rx [data-act="save-bm"]'); await cw(600);
    const tar = await cp.evaluate(() => { const o = [...document.querySelectorAll(".rx-stage .ap-rx .ap-o:not(.is-out)")].pop(); return o ? o.textContent : ""; });
    ok(/When to see a clinician/.test(tar) && /A black or tar-like stool/.test(tar), "fix-core: saving a BM noted 'It looked like tar' opens the primary care note");
    await cp.evaluate(() => window.FLORIN_EXT.api.set("data", "est")); await cw();
    /* 3. the wider net, for a log's note and an Ask question alike */
    const wide2 = await cp.evaluate(() => {
      const L = window.FLORIN_LOGS;
      const yes = ["I've lost 4kg without trying", "dropped 10lbs this month", "My poo was really dark, almost black", "it was black, like tar", "I'm running a temp", "I had chills and a temperature", "I've been really unwell, 39 degrees", "38.5C last night"];
      const no = ["lost my keys", "a temp job", "I have a temp job", "not black, normal colour", "Stool normal colour, not black", "39 degrees outside", "it's 39 degrees today", "had my temperature taken, it was fine", "No stool today, black coffee only"];
      return { missed: yes.filter((t) => !L.alarmsIn(t).length), tripped: no.filter((t) => L.alarmsIn(t).length) };
    });
    ok(!wide2.missed.length && !wide2.tripped.length, `fix-core: the wider net hears kilos and pounds against the digit, a dark stool across a comma, a temp, chills and a temperature, and a reading, and not the weather or a temp job (missed: ${wide2.missed.join(" | ") || "none"}; tripped: ${wide2.tripped.join(" | ") || "none"})`);
    /* 4. the week's FloraScore change is the difference of the two averages as shown */
    const dl = await cp.evaluate(() => {
      const L = window.FLORIN_LOGS, bad = [];
      for (const who of ["sarah", "marcus", "alex"]) for (const m of ["A", "B", "C"]) { const mv = L.scoreMoved(L.build(who, "est"), m); if (mv && (mv.delta !== Math.round(mv.wk) - Math.round(mv.lw) || mv.wkR !== Math.round(mv.wk) || mv.lwR !== Math.round(mv.lw))) bad.push(`${who} ${m}`); }
      return bad;
    });
    ok(!dl.length, `fix-core: for every person and option, the week's change is round(this week) minus round(last week)${dl.length ? ` (off: ${dl.join(", ")})` : ""}`);
    await cset("persona", "alex"); await cgo("i-score");
    /* build-core: the week is a neutral chip of the two averages, and What moved it says the same two numbers, its
       whole-point rows adding up to the change */
    const al = await cp.evaluate(() => { const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, mv = L.scoreMoved(api.M(), api.V().form); const ly = document.querySelector(".rx-stage .ap-rx .ap-layer"), t = ly.textContent; const pts = [...ly.querySelectorAll(".ap-moved-r strong")].map((x) => +x.textContent.replace("−", "-")); return { mv: mv && [mv.lwR, mv.wkR, mv.delta], chip: t.includes(`This week ${mv.wkR} on average, last week ${mv.lwR}`), wf: t.includes(`${mv.lwR} last week to ${mv.wkR}, in points`) && pts.length === 4 && pts.reduce((a, b) => a + b, 0) === mv.delta }; });
    ok(al.mv && al.mv[2] === al.mv[1] - al.mv[0] && al.chip && al.wf, `fix-core: Alex's FloraScore detail: the week chip says ${al.mv && al.mv[1]} and ${al.mv && al.mv[0]} on average, and What moved it adds up to ${al.mv && al.mv[2]}`);
    await cset("persona", "sarah");
    /* 5. meal coverage: counted over the days logged in the 90-day window, the same as the data looks */
    await cset("meals", "rough"); await cgo("i-pat");
    const mc = await cp.evaluate(() => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), PR = L.patterns(M, api.V().form);
      const D = window.FLD && window.FLD.build ? window.FLD.build(M.P.id, { M, mode: api.V().form }) : null;
      const t = document.querySelector(".rx-stage .ap-rx .ap-layer").textContent;
      return { pr: [PR.mealDays, PR.loggedDays, PR.window], fld: D && D.patterns && D.patterns.meals ? [D.patterns.meals.days, D.patterns.meals.logged, D.patterns.meals.window] : null, said: t.includes(`Meals are logged on ${PR.mealDays} of the ${PR.loggedDays} days you logged in the last ${PR.window} days`), sparse: PR.sparse, gate: PR.sparse === PR.mealDays / PR.loggedDays < L.MEAL_COVER, old: /of your last \d+ days/.test(t) };
    });
    ok(mc.said && mc.sparse && mc.gate && !mc.old && (!mc.fld || mc.fld.join() === mc.pr.join()), `fix-core: Possible patterns says meals on ${mc.pr[0]} of the ${mc.pr[1]} days logged in the last ${mc.pr[2]} days, the same counts the gate and the data looks use (${mc.fld ? mc.fld.join(" of ") : "looks not loaded"})`);
    await cp.evaluate(() => { const b2 = document.querySelector('[data-rx="dinfo"][data-v="mealUI"]'); b2.click(); }); await cw();
    /* notes-page (Will, Oct 28: "I don't understand the rough days meal logging"): the Meal sheet note says the meals
       control under Demo is the demo person's history, not this decision, with the gate and the food check from the model */
    const mn = await cp.evaluate(() => ({ t: (document.querySelector("#rxNotes .rx-aside") || {}).textContent || "" }));
    ok(mn.t === "Not the same as \u201cDemo person's meals\u201d under Demo, which only changes how often the demo person wrote meals down. Its note explains the trap.", `fix-notes: the Meal sheet note points to the meals control under Demo in one plain line, and leaves the trap to its note (${mn.t})`);
    await cp.evaluate(() => document.querySelector('[data-rx="dclose"]') && document.querySelector('[data-rx="dclose"]').click());
    await cset("meals", "all");
    /* 6. build-core: the week card has no legend, no strips and no struck date: a day with nothing logged is its date
       alone, named in a line */
    await cgo("today");
    const gl = await cp.evaluate(() => { const c = document.querySelector(".rx-stage .ap-rx .ap-wk"), g = c.querySelector(".ap-day--none .ap-day-c"); return { legend: !!c.querySelector(".ap-legend, .ap-wk-strip"), struck: g ? /line-through/.test(getComputedStyle(g).textDecorationLine) : null, line: /Nothing logged on \w+day/.test(c.textContent) }; });
    ok(!gl.legend && gl.struck === false && gl.line, "fix-core: the week card has no legend or strips; a day with nothing logged is its plain date, named in a line");
    /* 7. build-core: every day mark is 3:1 or more against the card (Plum or Ray, Ink 3, the Teal square, the Teal ring,
       and Gold's Shift Ink edge in light; dark Gold is its own fill), light and dark */
    const sq = [];
    for (const th of ["light", "dark"]) {
      await cset("theme", th);
      sq.push(await cp.evaluate((th) => {
        const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
        const rgb = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
        const over = (f, b) => f.slice(0, 3).map((v, i) => v * f[3] + b[i] * (1 - f[3]));
        const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const card = document.querySelector(".rx-stage .ap-rx .ap-wk"), bg = rgb(getComputedStyle(card).backgroundColor);
        const sqr = (() => { const i = document.createElement("span"); i.className = "ap-day-s is-on"; card.appendChild(i); const c = rgb(getComputedStyle(i).backgroundColor); i.remove(); return +ratio(over(c, bg), bg).toFixed(2); })();
        const html = (k) => { const w = document.createElement("span"); w.innerHTML = `<span class="ap-day ap-day--${k}"><span class="ap-day-c">5</span></span>`; return w.firstChild; };
        const of = (k, prop) => { const el = html(k); card.appendChild(el); const cs = getComputedStyle(el.querySelector(".ap-day-c")); let c = cs.backgroundColor; if (prop === "edge") { const m = cs.boxShadow.match(/(rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\))/); c = m ? m[1] : "rgba(0,0,0,0)"; } el.remove(); return +ratio(over(rgb(c), bg), bg).toFixed(2); };
        const out = [of("usual"), of("quiet"), sqr, of("flag", "edge"), th === "light" ? of("shift", "edge") : of("shift")];
        return { th, out };
      }, th));
    }
    await cset("theme", "light");
    ok(sq.every((r) => r.out.every((v) => v >= 3)), `fix-core: every day mark is 3:1 or more on the card: within, not counted, the symptom square, the flag ring, Gold's edge in light and Gold on dark (${sq.map((r) => `${r.th} ${r.out.join(", ")}`).join("; ")})`);
    /* 8. the faintest inks clear 4.5:1 in light: the app's on the card, the page's on its panels and ground */
    const ink = await cp.evaluate(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
      const rgb = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
      const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)); };
      const col = (host, v) => { const s = document.createElement("span"); s.style.color = `var(${v})`; host.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return rgb(c); };
      const ph = document.querySelector(".rx-stage .ap-rx"), card = ph.querySelector(".ap-wk");
      const panel = document.querySelector(".rx-panel--dec");
      return { app: ratio(col(card, "--ap-ink3"), rgb(getComputedStyle(card).backgroundColor)), panel: ratio(col(panel, "--ink-3"), rgb(getComputedStyle(document.documentElement).getPropertyValue("--panel").trim() ? getComputedStyle(panel).backgroundColor : "#fff")), ground: ratio(col(document.body, "--ink-3"), rgb(getComputedStyle(document.body).backgroundColor)) };
    });
    ok(ink.app >= 4.5 && ink.ground >= 4.5, `fix-core: light, the faintest inks clear 4.5:1: the app's on the card ${ink.app}, the page's on its ground ${ink.ground} (panel ${ink.panel})`);
    /* 9. the detail charts draw no dashed lines; a day not logged is its struck date */
    await cgo("i-score");
    const ds = await cp.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .c-avg, .rx-stage .ap-rx .ap-layer .c-wf-conn")].map((x) => getComputedStyle(x).strokeDasharray).filter((v) => v && v !== "none"));
    /* build-core: no average line at all now (DESIGN.md: two layers at most) */
    const avl = await cp.evaluate(() => document.querySelectorAll(".rx-stage .ap-rx .ap-layer .c-avg, .rx-stage .ap-rx .ap-layer .c-area, .rx-stage .ap-rx .ap-layer .c-avg-lbl").length);
    await cgo("i-timing");
    const dt = await cp.evaluate(() => {
      const L = document.querySelector(".rx-stage .ap-rx .ap-layer");
      const dash = [...L.querySelectorAll(".dv-chart line, .dv-chart path, .dv-chart rect, .dv-chart circle")].map((x) => getComputedStyle(x).strokeDasharray).filter((v) => v && v !== "none");
      /* build-core: a day with nothing logged is its date alone, in Ink 3, not struck, with no dots */
      const gaps = [...L.querySelectorAll(".dv-rowlbl.is-gap")].map((g) => ({ lbl: g.textContent, struck: /line-through/.test(getComputedStyle(g).textDecorationLine), fill: getComputedStyle(g).fill }));
      const ink3 = (() => { const t = L.querySelector(".dv-ax"); return t ? getComputedStyle(t).fill : ""; })();
      const lg = [...L.querySelectorAll(".ap-legend *")].some((x) => /dashed/.test(getComputedStyle(x).borderTopStyle));
      return { dash, gaps, lg, ink3, strike: L.querySelectorAll(".ap-lg-gap").length };
    });
    ok(!ds.length && avl === 0 && !dt.dash.length && !dt.lg && !dt.strike && dt.gaps.length && dt.gaps.every((g) => g.lbl && !g.struck && g.fill === dt.ink3), `fix-core: FloraScore and Timing draw no dashed lines and no average line or area; a day with nothing logged is its date in Ink 3, not struck (${dt.gaps.map((g) => g.lbl).join(", ")})`);
    /* 10. with the Easy version on, Home and Data style each get one plain line: Easy has its own Today and charts */
    await cset("easy", "true");
    const ez = {};
    for (const [k, v] of [["look", "oura"], ["home", "day"]]) {
      await cset(k, v);
      ez[k] = await cp.evaluate((k) => ({ on: (document.querySelector("#rxNotes .rx-note-easy") || {}).textContent || "", badge: /On the phone|\bPicked\b/.test(document.querySelector("#rxNotes").textContent), line: (() => { const x = document.querySelector(`[data-shadow="${k}"]`); return x && !x.hidden ? x.textContent : ""; })() }), k);
    }
    await cset("easy", "false");
    const ez0 = await cp.evaluate(() => [...document.querySelectorAll("[data-shadow]")].every((x) => x.hidden));
    await cset("look", "built"); await cset("home", "score");
    ok(ez.look.on === ez.look.line && ez.home.on === ez.home.line && /^Easy has its own charts/.test(ez.look.line) && /^Easy has its own Today/.test(ez.home.line) && !ez.look.badge && !ez.home.badge && ez0, `notes-page: with Easy on, Data style and Home each get one plain line, under the row and in the note, and no badge; Easy off takes the lines away (${ez.home.line} / ${ez.look.line})`);
    /* 11. a row picked from the list shows that screen's note, even when the phone is already on it */
    /* the demo opens on Calendar (last-fix, Oct 29: its recommendation), so List first, then Calendar */
    await cgo("today"); await cset("history", "list"); await cgo("today"); await cset("history", "calendar");
    const n1 = await cp.evaluate(() => document.querySelector("#rxNotes h2").textContent);
    /* the option shows on another screen: the note offers to show it, and keeps itself up when it does */
    const sb = await cp.evaluate(() => { const x = document.querySelector('#rxNotes [data-rx="show"]'); return x ? x.dataset.v : null; });
    await cp.evaluate(() => document.querySelector('#rxNotes [data-rx="show"]').click()); await cw();
    const sa = await cp.evaluate(() => ({ key: window.FLORIN_EXT.api.key(), h: document.querySelector("#rxNotes h2").textContent, again: !!document.querySelector('#rxNotes [data-rx="show"]') }));
    ok(/History/.test(n1) && sb === "hist-cal" && sa.key === "hist-cal" && sa.h === n1 && !sa.again, `fix-core: History set to Calendar from Today: the note offers Show it on the phone, which opens the calendar and keeps the decision's note up (${sa.key})`);
    await cgo("today");
    const n2 = await cp.evaluate(() => ({ h: document.querySelector("#rxNotes h2").textContent, eyebrow: document.querySelector("#rxNotes .rx-eyebrow").textContent }));
    await cgo("today");
    const n3 = await cp.evaluate(() => document.querySelector("#rxNotes h2").textContent);
    await cset("history", "list"); await cgo("today");
    await cp.evaluate(() => document.querySelector('[data-rx="history"][data-v="calendar"]').click()); await cw();
    await cgo("today");
    const n4 = await cp.evaluate(() => ({ h: document.querySelector("#rxNotes h2").textContent, eyebrow: document.querySelector("#rxNotes .rx-eyebrow").textContent }));
    await cset("history", "list");
    ok(n4.eyebrow === "This screen" && !/History/.test(n4.h) && n3 === n2.h, `fix-core: a decision's note, then Today picked from the list while the phone is on Today: Today's note shows (${n4.h})`);
    /* 12. the arrow keys walk the Screens list: every enabled row once, in order, from Plus menu */
    await cgo("plus");
    await cp.evaluate(() => { document.activeElement && document.activeElement.blur(); });
    const flat = await cp.evaluate(() => [...document.querySelectorAll('[data-rx="screen"]:not([disabled])')].map((x) => x.dataset.v));
    const walk = [await cp.evaluate(() => document.querySelector(".rx-panel--nav").dataset.row)];
    for (let i = 1; i < flat.length; i++) { await cp.keyboard.press("ArrowRight"); await cw(420); walk.push(await cp.evaluate(() => document.querySelector(".rx-panel--nav").dataset.row)); }
    const i0 = flat.indexOf("plus"), want = flat.slice(i0).concat(flat.slice(0, i0));
    const off = walk.map((r, i) => (r === want[i] ? null : `${i}: ${r} for ${want[i]}`)).filter(Boolean);
    ok(!off.length && new Set(walk).size === flat.length, `fix-core: from Plus menu, ArrowRight visits all ${flat.length} rows once, in order, no repeats${off.length ? ` (${off.slice(0, 3).join("; ")})` : ""}`);
    /* Easy's Your weeks lights the Insights row */
    await cp.evaluate(() => window.FLORIN_EXT.api.set("easy", true)); await cw();
    await cp.evaluate(() => window.FLORIN_EXT.api.go("insights")); await cw();
    const ezr = await cp.evaluate(() => ({ key: window.FLORIN_EXT.api.key(), lit: (document.querySelector('[data-rx="screen"][aria-current="true"]') || {}).dataset || {} }));
    await cp.evaluate(() => window.FLORIN_EXT.api.set("easy", false)); await cw();
    ok(ezr.key !== "ez-weeks" || ezr.lit.v === "insights", `fix-core: with Easy on, its Insights (Your weeks) lights the Insights row (${ezr.key}: ${ezr.lit.v || "none"})`);
    await cp.evaluate(() => { for (const [k, v] of [["home", "score"], ["history", "list"], ["easy", "false"], ["plan", "member"]]) { const x = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`); if (x && x.getAttribute("aria-pressed") !== "true") x.click(); } }); await cw();
    /* 13. the first Tab stop is Skip to the phone, which takes focus into the phone; the header links the deck and the looks */
    await cp.goto(PAGE); await cp.waitForSelector(".rx-stage .ap-rx"); await cw(500);
    await cp.keyboard.press("Tab");
    const sk = await cp.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { t: a.textContent, vis: r.top >= 0 && r.height >= 44 }; });
    await cp.keyboard.press("Enter"); await cw(200);
    const inPh = await cp.evaluate(() => !!document.activeElement && !!document.activeElement.closest(".rx-stage .ap-rx"));
    const links = await cp.evaluate(() => [...document.querySelectorAll(".rx-head-links a")].map((a) => `${a.textContent}|${a.target}|${a.rel}|${a.href}`));
    ok(sk.t === "Skip to the phone" && sk.vis && inPh, `fix-core: the first Tab stop is Skip to the phone, shown on focus, and it takes focus into the phone`);
    ok(links.length === 2 && links.every((l) => /\|_blank\|noopener\|https:\/\/claude\.ai\/artifact\//.test(l)) && /decisions, as slides.*2h5ikADR2eFCY1DZYbJEJU/.test(links[0]) && /^Every data style, side by side\|.*FdsxDLSQqETo3HRCVmUZzL/.test(links[1]), "fix-core: the header links the decisions deck and every data style side by side, each in a new tab");
    ok(!ce.length, `fix-core: no console or page errors${ce.length ? ": " + ce.slice(0, 3).join(" | ") : ""}`);
    await cp.close();
  }
  /* ===== end fix-core ===== */

  /* ===== consolidate: the hand-offs between the third review's fixers, kept as checks. One wording of the no-score
     rule (L.NO_SCORE) on every Today; Ask's meal counts said as Insights says them; no "good days"; a flagged today
     read against nothing on every week card and score card; the page following the system again after Oura; Screens >
     Ask Florin opening a fresh chat; Score first saying what the log did to FloraScore; the strength marks ===== */
  {
    const fs = require("fs");
    const xp = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
    const xe = [];
    xp.on("pageerror", (e) => xe.push(e.message));
    xp.on("console", (m) => { if (m.type() === "error") xe.push(m.text()); });
    await xp.goto(PAGE); await xp.waitForSelector(".rx-stage .ap-rx"); await xp.waitForTimeout(600);
    const xw = (ms = 400) => xp.waitForTimeout(ms);
    const xset = async (k, v) => { await xp.evaluate(([k, v]) => window.FLORIN_EXT.api.set(k, v), [k, v]); await xw(); };
    const xtext = () => xp.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").innerText);
    /* 1. no FloraScore today: every Today says the model's one rule */
    const strip = () => xp.evaluate(() => {
      const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, M = api.M();
      [L.TODAY, L.TODAY - 1].forEach((d) => L.day(M, d).entries.filter((e) => e.kind === "bm" || e.kind === "nobm").map((e) => e.id).forEach((id) => L.remove(M, id)));
      api.go("today"); api.renderTab(true);
      return { rule: window.FLORIN_LOGS.NO_SCORE, v: (L.score(M, L.TODAY, api.V().form) || {}).value };
    });
    const noScore = [];
    for (const [k, v] of [["home", "score"], ["home", "day"], ["easy", true], ["look", "rings"], ["look", "journal"], ["look", "bento"], ["look", "oura"], ["look", "easy"]]) {
      await xset("persona", "sarah"); await xset(k, v);
      const r = await strip(); await xw(500);
      const t = await xtext(), rule = r.rule.charAt(0).toUpperCase() + r.rule.slice(1);
      if (r.v != null || !(t.includes(r.rule) || t.includes(rule))) noScore.push(`${k}=${v}`);
      await xset(k, k === "home" ? "score" : k === "easy" ? false : "built");
    }
    ok(!noScore.length, `consolidate: with no FloraScore today, Score first, Day first, Easy and every data style say "${await xp.evaluate(() => window.FLORIN_LOGS.NO_SCORE)}"${noScore.length ? ": missed " + noScore.join(", ") : ""}`);
    /* 2. Ask's meal counts are Insights' counts, in Insights' words */
    const am = await xp.evaluate(() => {
      const L = window.FLORIN_LOGS, AK = window.FLORIN_ASK, V = { form: "C", plan: "member", checkin: true, uid: 9, mealUI: "quick" }, bad = [];
      for (const p of ["sarah", "marcus", "alex"]) {
        const M = L.build(p, "est", { meals: "rough" }), PR = L.patterns(M, "C");
        if (!PR.sparse || !PR.mealDays) continue;
        const want = `${PR.mealDays} of the ${PR.loggedDays === 1 ? "1 day" : `${PR.loggedDays} days`} you logged in the last ${PR.window} days`;
        const facts = AK.read(M, V, null).text;
        ["What tends to come before my rougher days?", "How sure are these patterns?", "How do I test one?", "What have I been eating?"].forEach((q) => { const tx = AK.textOf(AK.answer(M, V, q, null)); if (/of your last \d+ days/.test(tx) || (/[Mm]eals are logged on \d/.test(tx) && !tx.includes(want))) bad.push(`${p} "${q}": ${tx.slice(0, 140)}`); });
        if (!facts.includes(want)) bad.push(`${p} facts`);
      }
      return bad;
    });
    ok(!am.length, `consolidate: Ask states meal coverage as "N of the N days you logged in the last 90 days", the counts Insights and the gate use${am.length ? ": " + am.slice(0, 2).join(" | ") : ""}`);
    /* 3. "good days" is in no copy (DESIGN.md keeps judgement out of the data): ordinary days */
    const gd = [];
    for (const dir of ["../prototype/js", "../library/js"]) for (const fn of fs.readdirSync(path.resolve(__dirname, dir)).filter((x) => x.endsWith(".js"))) {
      fs.readFileSync(path.resolve(__dirname, dir, fn), "utf8").split("\n").forEach((ln, i) => { if (/["`][^"`]*\bgood days?\b[^"`]*["`]/i.test(ln)) gd.push(`${fn}:${i + 1}`); });
    }
    ok(!gd.length, `consolidate: no copy says good days, only ordinary days${gd.length ? ": " + gd.join(", ") : ""}`);
    /* 4. a flagged today: every week card and score card reads it against nothing */
    const flagBad = [];
    for (const [k, v] of [["look", "built"], ["look", "rings"], ["look", "journal"], ["look", "bento"], ["look", "oura"], ["look", "easy"], ["easy", true]]) {
      await xset("persona", "sarah"); await xset(k, v);
      const r = await xp.evaluate(() => {
        const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = api.M(), V = api.V();
        L.add(M, { kind: "bm", d: L.TODAY, t: 19.7, form: 4, how: {}, dur: null, flags: { blood: true }, note: "" });
        api.go("today"); api.renderTab(true);
        /* Field journal sets its apostrophes curly */
        const W = RU.week(M, V.form), t = document.querySelector(".rx-stage .ap-rx .ap-layer").innerText.replace(/\u2019/g, "'");
        const D = window.FLD && window.FLD.build("sarah", { mode: V.form, M });
        return { t, flag: RU.FLAG_DAY, read: W.cols.filter((c) => c.flag).length, cnt: W.rbms.length + W.flagged.flatMap((c) => c.bms).length === W.bms.length, dstate: D ? D.days[7][D.days[7].length - 1].state : null, sflag: D ? D.score.flag : null };
      });
      const looksOk = r.dstate === "flag" && r.sflag === true;
      const scoreRead = !/not read against your usual today/i.test(r.t) || /(Within|In|A little above|A little below|Above|Below) (your|its) usual range/.test(r.t);
      if (!r.t.includes(r.flag) || scoreRead || !r.cnt || !looksOk) flagBad.push(`${k}=${v}${!r.t.includes(r.flag) ? " (no week line)" : ""}${scoreRead ? " (score read)" : ""}${looksOk ? "" : ` (data ${r.dstate}, ${r.sflag})`}`);
      await xset(k, k === "easy" ? false : "built");
    }
    ok(!flagBad.length, `consolidate: with a flagged BM today, As built's week card, every data style's week and score cards and Easy's leave today unread and say why${flagBad.length ? ": " + flagBad.join(", ") : ""}`);
    /* 5. Score first says what the log that stood out did to FloraScore, with membership; Free stops at the lead */
    await xset("persona", "sarah");
    const fx = await xp.evaluate(async () => {
      const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = api.M(), V = api.V();
      L.add(M, { kind: "bm", d: L.TODAY, t: 19.67, form: 7, how: {}, dur: null, flags: {}, note: "" });
      api.go("today"); api.renderTab(true);
      const N = RU.standouts(M, V.form)[0], e = RU.scoreEffect(M, V.form, N), sub = document.querySelector(".rx-stage .ap-rx .ap-hero-sub").textContent;
      const w = RU.scoreWithout(M, N.e, V.form).value, s = L.score(M, L.TODAY, V.form).value;
      return { sub, e, ok: e === (w === s ? "It didn't change FloraScore." : `Without it, FloraScore would be ${w}.`) };
    });
    ok(fx.ok && fx.e && fx.sub.endsWith(fx.e) && /^Your 7:40 PM BM was Watery/.test(fx.sub), `consolidate: Score first's sentence leads with the Watery BM and says what it did to FloraScore (${fx.sub})`);
    await xset("plan", "free");
    const fxFree = await xp.evaluate(() => {
      const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, M = api.M();
      if (!L.day(M, L.TODAY).entries.some((e) => e.kind === "bm" && e.form === 7)) L.add(M, { kind: "bm", d: L.TODAY, t: 19.67, form: 7, how: {}, dur: null, flags: {}, note: "" });
      api.go("today"); api.renderTab(true);
      return document.querySelector(".rx-stage .ap-rx .ap-hero-sub").textContent;
    });
    ok(!/FloraScore/.test(fxFree) && /^Your 7:40 PM BM was Watery/.test(fxFree), `consolidate: on Free it stops at the lead, as Day first does (${fxFree})`);
    await xset("plan", "member");
    /* 6. the strength marks. build-modules: strength left the mark (claude/Florin data viz.md, section 1): the calendar,
       the week card and every day mark draw one Teal square for a symptom day, the same for mild and for strength not
       said, through RU.dayMark */
    const mk = await xp.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = window.FLORIN_EXT.api.M(), root = document.querySelector(".rx-stage .ap-rx"), box = document.createElement("div");
      const f = L.facts(M, L.day(M, L.TODAY - 1), "C");
      const day = (s) => Object.assign({}, f, { logged: true, sym: { Bloating: s }, nsym: 1, unrated: s ? {} : { Bloating: true } });
      box.innerHTML = RU.dayMark(day(1), { M, mode: "C" }) + RU.dayMark(day(0), { M, mode: "C" });
      root.appendChild(box);
      const c = [...box.querySelectorAll(".ap-day-s")].map((x) => getComputedStyle(x).backgroundColor);
      const t = document.createElement("i"); t.style.background = "var(--ap-teal)"; box.appendChild(t); const teal = getComputedStyle(t).backgroundColor;
      box.remove();
      return { c, teal };
    });
    ok(mk.c.length === 2 && mk.c.every((x) => x === mk.teal), `consolidate: a symptom day is one Teal square, the same for mild and for strength not said (${mk.c.join(", ")})`);
    /* 7. Screens > Ask Florin after a seeded chat: a fresh chat, through EXT.opens.ask */
    const xgo = async (id) => { await xp.evaluate((id) => document.querySelector(`[data-rx="screen"][data-v="${id}"]`).click(), id); await xw(900); };
    await xgo("ask-chat");
    const a0 = await xp.evaluate(() => { const S = window.FLORIN_EXT.api.S; return S.askx ? S.askx.msgs.length : 0; });
    await xgo("ask");
    const a1 = await xp.evaluate(() => { const api = window.FLORIN_EXT.api, S = api.S; return { n: S.askx ? S.askx.msgs.length : 0, key: api.key(), lit: (document.querySelector('[data-rx="screen"][aria-current="true"]') || { dataset: {} }).dataset.v }; });
    ok(a0 > 0 && a1.n === 0 && a1.key === "ask" && a1.lit === "ask", `consolidate: Screens > Ask Florin after the seeded chat opens a fresh chat and lights its own row (${a0} messages, then ${a1.n}; ${a1.key})`);
    await xp.close();
    /* 8. the page follows the system theme again after the Oura style turned the phone dark and gave it back */
    const tp2 = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
    await tp2.goto(PAGE); await tp2.waitForSelector(".rx-stage .ap-rx"); await tp2.waitForTimeout(900);
    const th = async () => tp2.evaluate(() => document.querySelector(".rx-stage .ap-rx").dataset.theme);
    await tp2.evaluate(() => document.querySelector('[data-rx="look"][data-v="oura"]').click()); await tp2.waitForTimeout(500);
    const t1 = await th();
    await tp2.evaluate(() => document.querySelector('[data-rx="look"][data-v="rings"]').click()); await tp2.waitForTimeout(500);
    const t2 = await th();
    await tp2.emulateMedia({ colorScheme: "dark" }); await tp2.waitForTimeout(600);
    const t3 = await th();
    await tp2.emulateMedia({ colorScheme: "light" }); await tp2.waitForTimeout(600);
    const t4 = await th();
    await tp2.evaluate(() => document.querySelector('[data-rx="look"][data-v="built"]').click()); await tp2.waitForTimeout(300);
    await tp2.close();
    ok(t1 === "dark" && t2 === "light" && t3 === "dark" && t4 === "light", `consolidate: Oura turns the phone dark and gives it back, and the page then follows the system again (${[t1, t2, t3, t4].join(", ")})`);
    ok(!xe.length, `consolidate: no console or page errors${xe.length ? ": " + xe.slice(0, 3).join(" | ") : ""}`);
  }
  /* ===== end consolidate ===== */

  /* ===== final-fix: a flagged today reads nothing anywhere: Easy's sentence, FloraScore's detail, Insights' cards and
     counts, the data styles' 30-day cards and Ask Florin's answers; the week card's labels and flag line; the meal
     transcript; the Oura theme after a system change ===== */
  {
    const fp = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
    const fe = [];
    fp.on("pageerror", (e) => fe.push(e.message));
    fp.on("console", (m) => { if (m.type() === "error") fe.push(m.text()); });
    await fp.goto(PAGE); await fp.waitForSelector(".rx-stage .ap-rx"); await fp.waitForTimeout(600);
    const fw = (ms = 400) => fp.waitForTimeout(ms);
    const fset = async (k, v) => { await fp.evaluate(([k, v]) => window.FLORIN_EXT.api.set(k, v), [k, v]); await fw(); };
    const ftext = () => fp.evaluate(() => document.querySelector(".rx-stage .ap-rx .ap-layer").innerText.replace(/’/g, "'"));
    const fflag = () => fp.evaluate(() => { const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, M = api.M(); if (!L.day(M, L.TODAY).entries.some((e) => e.flags && e.flags.blood)) L.add(M, { kind: "bm", d: L.TODAY, t: 19.7, form: 7, how: {}, dur: null, flags: { blood: true }, note: "" }); api.renderTab(true); });
    const fgo = (t) => fp.evaluate((t) => { window.FLORIN_EXT.api.go(t); window.FLORIN_EXT.api.renderTab(true); }, t);
    const SIGN = "Blood in your stool, noted in a log today: primary care is the right first stop.";
    await fset("persona", "sarah"); await fflag();
    /* the model: today's state is "flag" and it reads on no side; the score keeps its number */
    const mdl = await fp.evaluate(() => {
      const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, M = api.M(), f = L.facts(M, L.day(M, L.TODAY), "C"), s = L.score(M, L.TODAY, "C");
      return { st: f.state, fl: f.flag, nul: f.inWin === null && f.inCount === null && f.formsIn === null, raw: f.raw.inWin != null, v: s && s.value };
    });
    ok(mdl.st === "flag" && mdl.fl && mdl.nul && mdl.raw && mdl.v != null, `final-fix: L.facts gives a flagged today the state "flag", read on no side, and FloraScore keeps its number (${mdl.v})`);
    /* 1. Easy's Today leads with the sign, as the Teal note, and reads nothing of the day */
    await fset("easy", true); await fflag(); await fgo("today"); await fw(500);
    const ez = await fp.evaluate(() => { const s = document.querySelector(".rx-stage .ap-rx .ap-ez-say"); return s ? { t: s.textContent.trim(), flag: s.classList.contains("ap-ez-flag"), bg: getComputedStyle(s).backgroundColor } : null; });
    ok(ez && ez.flag && ez.t === SIGN && !/usual/.test(ez.t) && !/rgba\(0, 0, 0, 0\)/.test(ez.bg), `final-fix: Easy's Today leads with the sign and primary care, as the Teal note (${ez && ez.t})`);
    await fset("easy", false);
    /* 2. FloraScore's detail: not read against the usual, the sign under it, no judgement of the week */
    await fflag(); await fgo("insights"); await fw(400);
    await fp.evaluate(() => document.querySelector('.rx-stage .ap-rx [data-act="idetail"][data-k="score"]').click()); await fw(700);
    const dt = await ftext();
    ok(/Not read against your usual today\./.test(dt) && dt.includes(SIGN) && !/(Within|In|A little above|A little below|Above|Below) (your|its) usual range/.test(dt.split("Where today sits")[0]) && !/Steadier|bumpier/i.test(dt), `final-fix: FloraScore's detail reads a flagged today against nothing and names the sign (${dt.split("\n").slice(2, 5).join(" | ")})`);
    /* 7. the week, in points */
    const wk = await fp.evaluate(() => { const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api; return L.scoreMoved(api.M(), api.V().form); });
    const wkWant = wk.delta === 0 ? "The same as last week, on average." : `${Math.abs(wk.delta)} ${Math.abs(wk.delta) === 1 ? "point" : "points"} ${wk.delta > 0 ? "above" : "below"} last week, on average.`;
    ok(dt.includes(wkWant), `final-fix: the detail says the week's change in points, as the Insights card does ("${wkWant}")`);
    /* 3. Insights: the score card and the day counts leave today out, and say why */
    await fp.evaluate(() => { const bk = document.querySelector('.rx-stage .ap-rx [data-act="iback"]'); if (bk) bk.click(); }); await fw(400); await fgo("insights"); await fw(500);
    const ins = await fp.evaluate(() => {
      const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = api.M(), V = api.V(), n = api.S.ins.range || 30;
      const F = L.span(M, n, V.form), w = F.filter((f) => f.state === "usual").length, k = w + F.filter((f) => f.state === "shifted").length;
      const t = document.querySelector(".rx-stage .ap-rx .ap-layer").innerText;
      return { t, w, k, flag: RU.FLAG_DAY, mor: F.filter((f) => f.first != null && !f.flag).length, inW: F.filter((f) => f.inWin).length };
    });
    ok(/\d+, not read against your usual today/.test(ins.t) && ins.t.includes(`${ins.w}\nof ${ins.k}`) && ins.t.includes(ins.flag) && ins.t.includes(`${ins.inW} of ${ins.mor} days`), `final-fix: Insights reads the flagged today against nothing: the score card, ${ins.w} of ${ins.k} days and the first BM in the window on ${ins.inW} of ${ins.mor} days without it, and says why`);
    /* 4. every data style's 30-day cards leave today out of their counts */
    const lookBad = [];
    for (const look of ["rings", "journal", "bento", "oura", "easy"]) {
      await fset("look", look); await fflag(); await fgo("insights"); await fw(500);
      const r = await fp.evaluate(() => {
        const api = window.FLORIN_EXT.api, M = api.M(), V = api.V(), D = window.FLD.build("sarah", { mode: V.form, M });
        const ser = D.score.series[30], rd = ser.filter((s) => s.value != null && !s.flag).length;
        return { t: document.querySelector(".rx-stage .ap-rx .ap-layer").innerText.replace(/’/g, "'"), rd, all: ser.filter((s) => s.value != null).length, mor: D.timing.mornings30, flagLine: D.flagLine };
      });
      const bad = [];
      if (new RegExp(`\\d+\\s*of ${r.all} days(\\.| within your usual range| in its usual range| with FloraScore in its usual range)`).test(r.t) && r.all !== r.rd) bad.push("trend counts today");
      if (/In your usual window|Inside your usual window|first BM today came in your usual window|Today[^.\n]*inside your window/.test(r.t)) bad.push("today's timing read");
      if (!r.t.includes(r.flagLine)) bad.push("no flag line");
      if (bad.length) lookBad.push(`${look}: ${bad.join(", ")}`);
    }
    await fset("look", "built");
    ok(!lookBad.length, `final-fix: every data style's trend, timing, often and form cards leave a flagged today out and say why${lookBad.length ? ": " + lookBad.join("; ") : ""}`);
    /* 5. Ask Florin: the week and score answers leave today out, say why and offer primary care */
    const ak = await fp.evaluate(() => {
      const api = window.FLORIN_EXT.api, AK = window.FLORIN_ASK, RU = window.FLORIN_RUI, M = api.M(), V = api.V();
      const a = (q) => AK.textOf(AK.answer(M, V, q, null));
      return { week: a("How was this week?"), score: a("Why did my FloraScore go up this week?"), facts: AK.read(M, V, null).text, flag: RU.FLAG_DAY };
    });
    const akOk = (t) => t.includes(ak.flag) && /primary care is the right first stop/.test(t) && !/(Within|in|a little above|a little below|above|below) (your|its) usual range/i.test(t.replace(/last week/g, ""));
    ok(akOk(ak.week) && akOk(ak.score) && /noted for a clinician/.test(ak.facts), `final-fix: Ask's week and score answers leave a flagged today unread, say why and point to primary care (${ak.week.slice(0, 120)}...)`);
    /* 12 and 18. the week card names each symptom with its own strength, and its flag line sits under the BM rows */
    const wc = await fp.evaluate(() => {
      const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, M = api.M();
      L.add(M, { kind: "sym", d: L.TODAY, t: 19.8, items: [{ name: "Gas", s: 0 }], last: null, note: "" });
      /* build-core: today's mark is the Teal ring, its screen-reader words name each symptom with its own strength,
         and the flag line (with its ring) comes after the day lines and before the symptom line */
      const box = document.createElement("div"); box.innerHTML = RU.weekCard(M, api.V().form);
      const t = box.querySelector(`.ap-day[data-day="${L.TODAY}"]`), today = t ? t.querySelector(".sr").textContent : "";
      const ls = [...box.querySelectorAll(".ap-wk-ls li")], fl = ls.findIndex((li) => li.textContent === RU.FLAG_DAY && !!li.querySelector(".ap-day-k--flag")), sy = ls.findIndex((li) => !!li.querySelector(".ap-day-k--sym"));
      return { today, under: !!t && t.classList.contains("ap-day--flag") && fl >= 0 && fl === ls.length - 2 && sy === ls.length - 1 };
    });
    ok(/bloating, mild; gas, strength not said\.$/.test(wc.today) && wc.under, `final-fix: the week card says each symptom's own strength ("${wc.today}") and puts the flag line, with its Teal ring, after the day lines`);
    /* 8. the meal transcript leaves out the meals already logged that day */
    const ms = await fp.evaluate(() => { const L = window.FLORIN_LOGS, M = L.build("sarah", "est", { meals: "all" }), x = L.day(M, L.TODAY); return { say: L.mealSay(M, L.TODAY), logged: x.entries.filter((e) => e.kind === "meal").map((e) => e.meal) }; });
    ok(ms.logged.length && !ms.logged.some((k) => new RegExp(`for ${k}`).test(ms.say)) && /^[A-Z]/.test(ms.say), `final-fix: the played transcript leaves out today's ${ms.logged.join(" and ")} ("${ms.say}")`);
    ok(!fe.length, `final-fix: no console or page errors${fe.length ? ": " + fe.slice(0, 3).join(" | ") : ""}`);
    await fp.close();
    /* 13. the page following the system isn't a theme pick: Oura is dark first again after it */
    const tp = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
    await tp.goto(PAGE); await tp.waitForSelector(".rx-stage .ap-rx"); await tp.waitForTimeout(900);
    const tth = () => tp.evaluate(() => document.querySelector(".rx-stage .ap-rx").dataset.theme);
    const tlook = async (v) => { await tp.evaluate((v) => document.querySelector(`[data-rx="look"][data-v="${v}"]`).click(), v); await tp.waitForTimeout(500); };
    await tlook("oura"); await tlook("rings");
    await tp.emulateMedia({ colorScheme: "light" }); await tp.waitForTimeout(600);
    const s1 = await tth();
    await tlook("oura");
    const s2 = await tth();
    await tlook("built");
    const s3 = await tth();
    await tp.close();
    ok(s1 === "light" && s2 === "dark" && s3 === "light", `final-fix: after the page follows the system to light, Oura is dark first again and gives the theme back (${[s1, s2, s3].join(", ")})`);
  }
  /* ===== end final-fix ===== */

  /* ===== build-modules: the modules' charts in the one set of marks (claude/Florin data viz.md, M1 to M6 and M8). The
     calendar, Your days, the Easy version and Easy read draw a day with RU.dayMark and count days with L.tally, so each
     number here is checked against the model, and each mark against its rule ===== */
  {
    const mc = await b.newContext({ viewport: { width: 390, height: 844 } });
    const m = await mc.newPage();
    const me = [];
    m.on("pageerror", (e) => me.push(e.message));
    m.on("console", (x) => { if (x.type() === "error" || (x.type() === "warning" && /refresh-(variants|looks)|Easy version/.test(x.text()))) me.push(x.text()); });
    await m.goto(PAGE); await m.waitForSelector(".ap-rx"); await m.waitForTimeout(500);
    const mw = (ms = 500) => m.waitForTimeout(ms);
    const mset = async (k, v) => { await m.evaluate(([k, v]) => window.FLORIN_EXT.api.set(k, v), [k, v]); await mw(300); };
    const mopen = async (id) => { await m.evaluate((id) => window.FLORIN_EXT.api.open(id), id); await mw(); };
    const RETIRED = /Something shifted|\bNo logs\b|Not logged|Outside them|Outside it(?!s)|Nothing logged on BMs/;

    /* M1. the calendar: one day mark a day, no meal marks, no struck dates, the legend in the shared words in three lines
       at most, and every day a 44 by 44 button, in both themes */
    for (const theme of ["light", "dark"]) {
      await mset("theme", theme); await mopen("hist-cal");
      const c = await m.evaluate(() => {
        const lay = document.querySelector(".ap-rx .ap-layer"), bs = [...lay.querySelectorAll(".vr-cal-d")];
        const lg = lay.querySelector(".vr-cal-lg"), items = lg ? [...lg.children] : [];
        const tops = [...new Set(items.map((x) => Math.round(x.getBoundingClientRect().top)))];
        const small = bs.filter((x) => { const r = x.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length;
        const struck = [...lay.querySelectorAll(".vr-cal *")].some((x) => /line-through/.test(getComputedStyle(x).textDecorationLine));
        return { n: bs.length, marks: bs.every((x) => x.querySelectorAll(".ap-day").length === 1), meal: !!lay.querySelector(".vr-t--meal, .vr-cal-ts") || /Meal logged/.test(lg ? lg.textContent : ""), lines: tops.length, legend: lg ? lg.textContent : "", small, struck };
      });
      ok(c.n >= 28 && c.marks && !c.meal && !c.struck && c.small === 0 && c.lines <= 3 && !RETIRED.test(c.legend), `build-modules, calendar ${theme}: one day mark in each of ${c.n} day buttons, every one 44 by 44 or more, no meal marks or struck dates, and a legend of ${c.lines} lines in the shared words (${c.legend})`);
    }
    /* the date inside a filled day mark is 4.5:1 or more on its fill, in both themes: Plum, Gold and Ink 3 */
    const ratio = () => m.evaluate(() => {
      /* any CSS colour (oklch, color-mix) to sRGB through a canvas pixel */
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g0 = cv.getContext("2d", { willReadFrequently: true });
      const rgb = (c) => { g0.clearRect(0, 0, 1, 1); g0.fillStyle = c; g0.fillRect(0, 0, 1, 1); return [...g0.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c) => { const [r, g, bb] = rgb(c).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
      const cr = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const out = {};
      document.querySelectorAll(".ap-rx .ap-layer .ap-day:is(.ap-day--usual, .ap-day--shift, .ap-day--quiet) .ap-day-c").forEach((el) => {
        const k = el.parentElement.className.match(/ap-day--(usual|shift|quiet)/)[1], cs = getComputedStyle(el);
        const v = +cr(cs.color, cs.backgroundColor).toFixed(2);
        out[k] = Math.min(out[k] || 99, v);
      });
      return out;
    });
    const rr = {};
    for (const theme of ["light", "dark"]) { await mset("theme", theme); await mset("plan", "free"); await mopen("hist-cal"); rr[theme] = await ratio(); await mset("plan", "member"); }
    ok(["light", "dark"].every((t) => ["usual", "shift", "quiet"].every((k) => rr[t][k] >= 4.5)), `build-modules: the date inside every filled day mark is 4.5:1 or more on its fill (light ${JSON.stringify(rr.light)}, dark ${JSON.stringify(rr.dark)})`);
    await mset("theme", "light");
    /* Day first: the symptom row's edge is Teal, as symptoms are everywhere; the chip carries the FloraScore glyph, a
       name with no value, never a ring filled toward 100 */
    await mopen("home-day");
    const df = await m.evaluate(() => {
      const row = document.querySelector('.ap-rx .vr-mk--plain'), svg = document.querySelector(".ap-rx .vr-sc-ring svg");
      const t = document.createElement("i"); t.style.background = "var(--ap-teal)"; document.querySelector(".ap-rx .ap-layer").appendChild(t); const teal = getComputedStyle(t).backgroundColor; t.remove();
      return { edge: row ? getComputedStyle(row, "::before").backgroundColor : null, teal, svg: svg ? svg.outerHTML : "" };
    });
    ok(df.edge === df.teal && !!df.svg && !/--v:\s*\d|c-ring-band/.test(df.svg), `build-modules, Day first: the marked symptom's edge is Teal (${df.edge}) and the chip's glyph holds no value`);
    await mset("home", "score");

    /* M2. Your days: the count is L.tally's over the last 7 days, the bar's parts add up to its "of", every row's mark
       is its day's state and its word the shared one; Ask about this says the same count */
    await mopen("i-days");
    const yd = await m.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, api = window.FLORIN_EXT.api, M = api.M(), V = api.V();
      const T = L.tally(L.span(M, 7, V.form), true), lay = document.querySelector(".ap-rx .ap-layer");
      const big = lay.querySelector(".ap-dhero .ap-big"), seg = lay.querySelector(".c-seg");
      const parts = seg ? (seg.getAttribute("aria-label").match(/\d+/g) || []).map(Number) : [];
      const K = { usual: "usual", shifted: "shift", unsure: "quiet", nocount: "quiet", logged: "quiet", none: "none", pending: "none", flag: "flag" };
      const rows = [...lay.querySelectorAll(".rlk-day")].map((r) => ({ st: r.dataset.state, mk: ((r.querySelector(".ap-day") || {}).className || "").match(/ap-day--(\w+)/), w: (r.querySelector(".rlk-day-w") || {}).textContent }));
      const ctx = RU.askContext(M, V, { k: "days", range: 7 });
      return { big: big ? big.textContent.replace(/\s+/g, " ").trim() : "", want: `${T.within}of ${T.known} days within your usual`, sum: parts.reduce((s, v) => s + v, 0), known: T.known, rows: rows.length, marks: rows.every((r) => r.mk && r.mk[1] === K[r.st]), words: rows.map((r) => r.w).join("|"), fact: ctx && ctx.facts[0], factWant: `${T.within} of ${T.known} days within your usual`, text: lay.textContent };
    });
    ok(yd.big.replace(/\s/g, "") === yd.want.replace(/\s/g, "") && yd.sum === yd.known && yd.rows === 7 && yd.marks && yd.fact === yd.factWant && !RETIRED.test(yd.text) && !/\bShifted\b/.test(yd.words), `build-modules, Your days: ${yd.factWant} as L.tally counts it, a bar whose parts add up to ${yd.sum}, each day's own mark and word, and Ask about this says the same (${yd.fact})`);

    /* M3. the Easy version's Today: the last 7 days counted as L.tally counts them, its answer a line under the one big
       number, day marks at 32px, a Gold mark for every day named outside the usual, no count-up, FloraScore never Gold,
       and nothing wider than the phone at 390 */
    for (const theme of ["light", "dark"]) {
      await mset("theme", theme); await mopen("ez-today");
      const ez = await m.evaluate(() => {
        const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M(), V = api.V(), T = L.tally(L.span(M, 7, V.form), true);
        const root = document.querySelector(".ap-rx"), lay = root.querySelector(".ap-layer"), wk = lay.querySelector(".ez-week");
        const gold = wk ? wk.querySelectorAll(".ez-days .ap-day--shift").length : -1;
        const lines = wk ? [...wk.querySelectorAll(".ez-lines li")].filter((li) => li.querySelector(".ap-day-k--shift")) : [];
        const named = lines.reduce((s, li) => s + (/^Also outside your usual: /.test(li.textContent) ? li.textContent.split(/, | and /).length : 1), 0);
        const c = wk && wk.querySelector(".ap-day-c");
        return { ans: wk ? wk.querySelector(".ez-ans--line").textContent.replace(/\s+/g, " ").trim() : "", want: `${T.within} of ${T.known} days within your usual`, big: lay.querySelectorAll(".ez-n").length, gold, named, d: c ? Math.round(c.getBoundingClientRect().width) : 0, wide: lay.scrollWidth > lay.clientWidth + 1, scoreGold: !!lay.querySelector(".ap-ez-score .ez-dot"), count: !!lay.querySelector("[data-count]") };
      });
      ok(ez.ans === ez.want && ez.big === 1 && ez.gold === ez.named && ez.d === 32 && !ez.wide && !ez.scoreGold && !ez.count, `build-modules, Easy Today ${theme}: "${ez.ans}" as L.tally counts it, one big number, ${ez.gold} Gold days each named in a line, 32px day marks, no count-up, FloraScore never Gold, nothing wider than the phone`);
    }
    await mset("theme", "light");
    /* Your weeks: the trend in the score's own words, the parts as moves in whole points that add up to the change */
    await m.evaluate(() => { const x = document.querySelector('.ap-rx [data-act="tab"][data-tab="insights"]'); x && x.click(); }); await mw();
    const yw = await m.evaluate(() => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, mv = L.scoreMoved(api.M(), api.V().form), lay = document.querySelector(".ap-rx .ap-layer");
      const tr = (lay.querySelector(".ez-trend") || {}).textContent || "", pa = (lay.querySelector(".ez-parts") || {}).textContent || "";
      return { tr, pa, pts: mv ? mv.parts.map((p) => p.pts) : [], delta: mv ? mv.delta : null, month: !!lay.querySelector(".ez-month .ez-cal-g .ap-day") };
    });
    ok(/with FloraScore in its usual range/.test(yw.tr) && !/within your usual range/.test(yw.tr) && yw.pts.reduce((s, v) => s + v, 0) === yw.delta && !/of 100/.test(yw.pa) && !/\d\.\d/.test(yw.pa) && yw.month, `build-modules, Your weeks: FloraScore's days in its own words, the month in day marks, and the parts as whole points (${yw.pts.join(", ")}) that add up to the change (${yw.delta})`);
    await mset("easy", false);

    /* M4. the data looks count, name and say the symptoms exactly as the app does */
    const lk = await m.evaluate(() => {
      const L = window.FLORIN_LOGS, out = [];
      for (const [p, data] of [["sarah", "est"], ["marcus", "est"], ["alex", "est"], ["sarah", "new"]]) for (const mode of ["A", "B", "C"]) {
        const M = L.build(p, data), D = window.FLD.build(p, { mode, M }), F = L.span(M, 7, mode);
        const T = L.tally(F, true), why = D.days[7].map((d) => d.why && d.why.line).join("|"), want = F.map((f) => L.dayWhy(M, f, mode).line).join("|");
        if (JSON.stringify(D.tally[7]) !== JSON.stringify(T) || D.symLine[7] !== L.symLine(F) || why !== want) out.push(`${p} ${data} ${mode}`);
      }
      return out;
    });
    ok(!lk.length, `build-modules: the data looks' counts (D.tally), lines (D.why) and symptom sentence (D.symLine) are the app's own, for every person and option${lk.length ? ": " + lk.join(", ") : ""}`);

    /* M5, M6 and M8 on the library page: each look says where it stands in the app, every row asks its question, Easy
       read's days are the app's day marks with a line for each day outside the usual, and Field journal counts over the
       days read */
    const LIB = "file://" + path.resolve(__dirname, "../library/_local.html");
    for (const theme of ["light", "dark"]) {
      const lp = await mc.newPage({ viewport: { width: 1440, height: 1000 } });
      const le = [];
      lp.on("pageerror", (e) => le.push(e.message));
      lp.on("console", (x) => { if (x.type() === "error") le.push(x.text()); });
      await lp.addInitScript((t) => { try { localStorage.setItem("florin-looks", JSON.stringify({ persona: "marcus", theme: t })); } catch (e) {} }, theme);
      await lp.goto(LIB); await lp.waitForSelector(".lb-row"); await lp.waitForTimeout(600);
      const lb = await lp.evaluate(() => {
        const L = window.FLORIN_LOGS, D = window.FLD.build("marcus", { mode: "C" }), T = D.tally[7];
        const looks = [...document.querySelectorAll(".lb-look")].map((x) => x.querySelector(".lb-eyebrow").textContent);
        const rows = [...document.querySelectorAll(".lb-row-h")].map((h) => (h.querySelector("p") || {}).textContent || "");
        const ez = document.querySelector('.lb-cell[data-look="easy"] .ez-week'), jr = document.querySelector('.lb-cell[data-look="journal"] .jr--week');
        const sr = ez ? getComputedStyle(ez.querySelector(".ap-day .sr")).position : "";
        const gold = ez ? ez.querySelectorAll(".ap-day--shift").length : -1, named = ez ? [...ez.querySelectorAll(".ez-lines li")].filter((li) => li.querySelector(".ap-day-k--shift")).length : 0;
        return { looks, rows, marks: ez ? ez.querySelectorAll(".ez-days .ap-day").length : 0, sr, gold, named, jr: jr ? jr.querySelector(".jr-lede").textContent : "", want: `${T.within} of the ${T.known} days counted`, text: document.querySelector(".lb").textContent };
      });
      await lp.close();
      ok(lb.looks.length === 5 && lb.looks.every(Boolean) && lb.rows.length === 11 && lb.rows.every((q) => /\?$/.test(q)) && lb.marks === 7 && lb.sr === "absolute" && lb.gold === lb.named && lb.jr.includes(lb.want) && !/\bShifted\b|Not logged/.test(lb.text) && !le.length, `build-modules, the library in ${theme}: every look says where it stands in the app (${lb.looks.join("; ")}), every row asks its question, Easy read's week is seven of the app's day marks with each Gold day named, and Field journal says "${lb.want}"${le.length ? ": " + le.slice(0, 2).join(" | ") : ""}`);
    }
    ok(!me.length, `build-modules: no console errors or module warnings${me.length ? ": " + me.slice(0, 3).join(" | ") : ""}`);
    await mc.close();
  }
  /* ===== end build-modules ===== */

  /* ===== build-core: the core charts in the one set of marks (claude/Florin data viz.md, C1 to C17). The model helpers
     (L.tally, L.dayWhy, L.symLine, the whole-point parts), the week card, the hero, Insights' cards and details, History's
     day headers, Ask's hand-off and the kit, each checked against the model and its rule ===== */
  {
    const kc = await b.newContext({ viewport: { width: 390, height: 844 } });
    const k = await kc.newPage();
    const ke = [];
    k.on("pageerror", (e) => ke.push(e.message));
    k.on("console", (x) => { if (x.type() === "error") ke.push(x.text()); });
    await k.goto(PAGE); await k.waitForSelector(".ap-rx"); await k.waitForTimeout(500);
    const kw = (ms = 450) => k.waitForTimeout(ms);
    const kset = async (key, v) => { await k.evaluate(([key, v]) => window.FLORIN_EXT.api.set(key, v), [key, v]); await kw(300); };
    const kopen = async (id) => { await k.evaluate((id) => window.FLORIN_EXT.api.open(id), id); await kw(); };

    /* C1. L.tally is the data looks' count, for every person, logs setting and option */
    const t1 = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, bad = [];
      for (const p of ["sarah", "marcus", "alex"]) for (const data of ["est", "new", "fresh"]) for (const mode of ["A", "B", "C"]) {
        const M = L.build(p, data), D = window.FLD.build(p, { mode, M });
        if (JSON.stringify(L.tally(L.span(M, 7, mode), true)) !== JSON.stringify(D.tally[7]) || JSON.stringify(L.tally(L.span(M, 30, mode), false)) !== JSON.stringify(D.tally[30])) bad.push(`${p} ${data} ${mode}`);
      }
      return bad;
    });
    ok(!t1.length, `build-core: L.tally over the last 7 and 30 days equals the data looks' D.tally, every person, logs setting and option${t1.length ? ": " + t1.join(", ") : ""}`);

    /* C1. L.dayWhy: each day's one line, in the week card's order and words */
    const dw = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, out = {}, line = (M, d, mode) => L.dayWhy(M, L.facts(M, L.day(M, d), mode), mode).line;
      let M = L.build("marcus", "est");
      out.wed = line(M, 86, "C"); out.fri = line(M, 88, "C"); out.thu = line(M, 87, "C"); out.sun = line(M, L.TODAY, "C");
      /* only symptoms on a day with nothing else */
      M = L.build("sarah", "est"); L.add(M, { kind: "sym", d: 87, t: 12, items: [{ name: "Cramping", s: 2 }], last: 1, note: "" }); out.sym = line(M, 87, "C");
      /* a flag today */
      M = L.build("sarah", "est"); L.add(M, { kind: "bm", d: L.TODAY, t: 19.5, form: 4, how: {}, dur: null, flags: { blood: true }, note: "" }); out.flag = line(M, L.TODAY, "C");
      /* No BM today, and three BMs today */
      M = L.build("marcus", "est"); const x = L.day(M, L.TODAY); x.entries = x.entries.filter((e) => e.kind !== "bm"); L.add(M, { kind: "nobm", d: L.TODAY, t: 19.5 }); out.none = line(M, L.TODAY, "C");
      M = L.build("marcus", "est"); [12, 15].forEach((t) => L.add(M, { kind: "bm", d: L.TODAY, t, form: 4, how: {}, dur: null, flags: {}, note: "" })); out.more = line(M, L.TODAY, "C");
      /* a word logged in B that straddles the usual, read in A */
      M = L.build("alex", "est"); const u = M.usual, w = L.WORDS.find((y) => y.types.length > 1 && y.types.some((s) => s >= u.fLo && s <= u.fHi) && y.types.some((s) => s < u.fLo || s > u.fHi));
      L.add(M, { kind: "bm", d: L.TODAY, t: 12, form: null, word: w.k, how: {}, dur: null, flags: {}, note: "" }); out.either = line(M, L.TODAY, "A"); out.word = w.word;
      out.flagWant = L.FLAG_DAY; out.n = `${M.usual.nLo} to ${M.usual.nHi}`;
      return out;
    });
    const dwOk = /^Wednesday: your first BM came later than usual, at \d+:\d\d AM\.$/.test(dw.wed) && dw.fri === "Friday: one BM was Firm, firmer than your usual forms." && dw.thu === "Nothing logged on Thursday." && dw.sun === "Today: within your usual."
      && dw.sym === "Thursday isn't counted: only symptoms were logged." && dw.flag === dw.flagWant && /^Today: No BM, fewer than your usual \d+( to \d+)? a day\.$/.test(dw.none) && /^Today: 3 BMs, more than your usual \d+ to \d+ a day\.$/.test(dw.more)
      && dw.either === `Today isn't counted: a BM logged as ${dw.word} could be either side of your usual.`;
    ok(dwOk, `build-core: L.dayWhy gives each day its line: later, firmer, nothing logged, within, only symptoms, a flag, No BM, more BMs and could be either (${[dw.wed, dw.fri, dw.none, dw.more, dw.either].join(" | ")})`);

    /* C1. L.symLine: a tie names both, one log names its day, a stronger one is added, a strength not said is never mild */
    const sl = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, T = L.TODAY;
      const day = (d, sym, unrated) => ({ d, today: d === T, logged: true, nsym: Object.keys(sym).length, sym, unrated: unrated || {} });
      return {
        tie: L.symLine([day(86, { Bloating: 1 }), day(88, { Cramping: 1 })]),
        one: L.symLine([day(86, { Bloating: 1 }), day(87, {})]),
        strong: L.symLine([day(86, { Bloating: 1 }), day(T, { Bloating: 1, Cramping: 3 })]),
        unsaid: L.symLine([day(86, { Bloating: 1 }), day(T, { Bloating: 0 }, { Bloating: true })]),
        range: L.symLine([day(85, { Bloating: 1 }), day(86, { Bloating: 2 }), day(88, { Gas: 1 })]),
        of: L.symLine([day(86, { Bloating: 1 }), day(T, { Bloating: 1 })], { of: 6 }),
        none: L.symLine([day(86, {})])
      };
    });
    ok(sl.tie === "Symptoms on 2 days: bloating and cramping, 1 day each." && sl.one === "Symptoms on Wednesday: mild bloating." && sl.strong === "Symptoms on 2 days: mild bloating both days, and strong cramping today." && sl.unsaid === "Symptoms on 2 days: bloating both days." && sl.range === "Symptoms on 3 days: mild to moderate bloating on 2 days." && sl.of === "Symptoms on 2 of 6 days you logged: mild bloating both days." && sl.none === "" && !/most often/.test(Object.values(sl).join(" ")), `build-core: L.symLine, the one symptom sentence: a tie, one day, a stronger one today, a strength not said, a range (${sl.strong} | ${sl.unsaid})`);

    /* C1. what moved FloraScore, in whole points that add up to the change shown, every person and option, with No BM
       today and three BMs today too */
    const wp = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, bad = [];
      const variants = [["as seeded", () => {}], ["No BM today", (M) => { const x = L.day(M, L.TODAY); x.entries = x.entries.filter((e) => e.kind !== "bm"); L.add(M, { kind: "nobm", d: L.TODAY, t: 19.5 }); }], ["3 BMs today", (M) => [12, 15].forEach((t) => L.add(M, { kind: "bm", d: L.TODAY, t, form: 4, how: {}, dur: null, flags: {}, note: "" }))]];
      for (const p of ["sarah", "marcus", "alex"]) for (const mode of ["A", "B", "C"]) for (const [nm, f] of variants) {
        const M = L.build(p, "est"); f(M); const mv = L.scoreMoved(M, mode);
        if (!mv) continue;
        const sum = mv.parts.reduce((s, x) => s + x.pts, 0);
        if (sum !== mv.delta || !mv.parts.every((x) => Number.isInteger(x.pts)) || mv.parts.some((x) => Math.abs(x.delta) < 1e-9 && x.pts !== 0)) bad.push(`${p} ${mode} ${nm}: ${mv.parts.map((x) => x.pts).join(" ")} vs ${mv.delta}`);
      }
      return bad;
    });
    ok(!wp.length, `build-core: the parts of what moved FloraScore are whole points adding up to the change shown, a part that didn't move at 0, for every person and option, No BM today and 3 BMs today too${wp.length ? ": " + wp.slice(0, 3).join(" | ") : ""}`);

    /* C2. the week card: its answer is Insights' 7 days and the data looks' count; every Gold day is named in a line; no
       strips, hatch, struck dates, meal count or legend; drawn to a mid-week day it ends there and counts to there */
    const wc = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, bad = [];
      for (const p of ["sarah", "marcus", "alex"]) for (const mode of ["A", "B", "C"]) for (const end of [L.TODAY, 88, 86]) {
        const M = L.build(p, "est"), T = L.tally(L.span(M, 7, mode, end), true), box = document.createElement("div");
        box.innerHTML = RU.weekCard(M, mode, { end });
        const ans = box.querySelector(".ap-wk-a").textContent.replace(/\s+/g, " ").trim(), days = [...box.querySelectorAll(".ap-days > li .ap-day")];
        const gold = box.querySelectorAll(".ap-days .ap-day--shift").length;
        const named = [...box.querySelectorAll(".ap-wk-ls li")].filter((li) => li.querySelector(".ap-day-k--shift")).reduce((s, li) => s + (/^Also outside your usual: /.test(li.textContent) ? li.textContent.split(/, | and /).length : 1), 0);
        const D = end === L.TODAY ? window.FLD.build(p, { mode, M }).tally[7] : T;
        const ins = end === L.TODAY ? (() => { const b2 = document.createElement("div"); b2.innerHTML = RU.insights(M, { form: mode, uid: 7, plan: "member" }, { range: 7, k: null, y: 0 }); const big = b2.querySelector(".ap-sum-top .ap-big"); return big ? big.textContent.replace(/\s+/g, " ").trim() : ""; })() : `${T.within} of ${T.known === 1 ? "1 day" : T.known + " days"}`;
        const want = `${T.within} of ${T.known === 1 ? "1 day" : `${T.known} days`}`;
        if (ans !== `${want} within your usual` || ins.replace(/\s/g, "") !== want.replace(/\s/g, "") || D.within !== T.within || D.known !== T.known) bad.push(`${p} ${mode} ${end}: ${ans} / ${ins}`);
        if (days.length !== 7 || +days[6].dataset.day !== end || gold !== named) bad.push(`${p} ${mode} ${end}: ${days.length} days, last ${days[6] && days[6].dataset.day}, ${gold} Gold, ${named} named`);
        if (box.querySelector(".ap-wk-strip, .ap-legend") || /\bmeals?\b/i.test(box.textContent) || /line-through|repeating-linear-gradient/.test(box.innerHTML)) bad.push(`${p} ${mode} ${end}: an old mark`);
      }
      return bad;
    });
    ok(!wc.length, `build-core: the week card counts the last 7 days as Insights and the data looks do, names every Gold day in a line, draws no strip, legend or meal count, and drawn to a mid-week day ends and counts there${wc.length ? ": " + wc.slice(0, 3).join(" | ") : ""}`);

    /* C2 and C17. on the phone, in both themes: every Gold mark carries its Shift Ink edge in light (and every Gold
       chart mark too), the date in each filled day circle is 4.5:1 or more, nothing is struck through */
    const ratioOf = () => k.evaluate(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g0 = cv.getContext("2d", { willReadFrequently: true });
      const rgb = (c) => { g0.clearRect(0, 0, 1, 1); g0.fillStyle = c; g0.fillRect(0, 0, 1, 1); return [...g0.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c) => { const [r, g, bb] = rgb(c).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
      const cr = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const lay = document.querySelector(".ap-rx .ap-layer"), out = {};
      lay.querySelectorAll(".ap-wk .ap-day:is(.ap-day--usual, .ap-day--shift, .ap-day--quiet) .ap-day-c").forEach((el) => { const kk = el.parentElement.className.match(/ap-day--(\w+)/)[1], cs = getComputedStyle(el); out[kk] = Math.min(out[kk] || 99, +cr(cs.color, cs.backgroundColor).toFixed(2)); });
      const struck = [...lay.querySelectorAll(".ap-wk *")].some((x) => /line-through/.test(getComputedStyle(x).textDecorationLine));
      return { out, struck };
    });
    const dc = {};
    for (const theme of ["light", "dark"]) {
      await kset("theme", theme);
      await kset("persona", "marcus"); await kopen("today"); const a = await ratioOf();
      await kset("data", "new"); await kopen("today"); const c = await ratioOf();
      await kset("data", "est");
      dc[theme] = { usual: a.out.usual, shift: a.out.shift, quiet: c.out.quiet, struck: a.struck || c.struck };
    }
    ok(["light", "dark"].every((t) => dc[t].usual >= 4.5 && dc[t].shift >= 4.5 && dc[t].quiet >= 4.5 && !dc[t].struck), `build-core: on the week card the date inside every filled circle is 4.5:1 or more, within, outside and logged, nothing struck (light ${JSON.stringify(dc.light)}, dark ${JSON.stringify(dc.dark)})`);
    await kset("theme", "light");
    await kopen("insights"); await k.evaluate(() => document.querySelector('.ap-rx .ap-seg--range [data-v="30"]').click()); await kw();
    const edge = await k.evaluate(() => {
      const lay = document.querySelector(".ap-rx .ap-layer"), t = document.createElement("i"); t.style.color = "var(--ap-shift-ink)"; lay.appendChild(t); const ink = getComputedStyle(t).color; t.remove();
      const marks = [...lay.querySelectorAll(".dv-dot.is-shift, .dv-bar.is-shift, .dv-wbar.is-shift")];
      const sws = [...lay.querySelectorAll(".ap-legend .sw--shift")];
      return { ink, n: marks.length, bad: marks.filter((m) => getComputedStyle(m).stroke !== ink || parseFloat(getComputedStyle(m).strokeWidth) < 1.5).length, sw: sws.length, swBad: sws.filter((s) => !getComputedStyle(s).boxShadow.includes(ink)).length };
    });
    ok(edge.n > 0 && !edge.bad && edge.sw > 0 && !edge.swBad, `build-core: in light every Gold chart mark (${edge.n}) and legend swatch (${edge.sw}) carries the 1.5px Shift Ink edge (${edge.ink})`);

    /* C3 and C4. the hero: the number with no count-up over its usual range, a Cream dot never Gold, no dot on a flagged
       today; "Without it" never for a No BM log, on Score first or Day first; learning is Day 5 of 14 over 14 steps */
    const hr = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, out = {}, V = { form: "C", uid: 3, plan: "member" };
      const html = (M) => { const b2 = document.createElement("div"); b2.innerHTML = RU.scoreHero(M, V); return b2; };
      let M = L.build("marcus", "est"); let h = html(M);
      out.plain = !!h.querySelector(".ap-sbar-dot") && !h.querySelector(".is-shift, [data-count], .c-ring-arc, .c-spark, .ap-pill");
      M = L.build("marcus", "est"); L.add(M, { kind: "bm", d: L.TODAY, t: 19.5, form: 4, how: {}, dur: null, flags: { blood: true }, note: "" }); h = html(M);
      out.flag = !h.querySelector(".ap-sbar-dot") && !!h.querySelector(".ap-sbar") && /Not read against your usual today/.test(h.textContent) && h.querySelector(".ap-hero-n").textContent === String(L.score(M, L.TODAY, "C").value);
      M = L.build("marcus", "est"); const x = L.day(M, L.TODAY); x.entries = x.entries.filter((e) => e.kind !== "bm"); L.add(M, { kind: "nobm", d: L.TODAY, t: 19.5 });
      const N = RU.standouts(M, "C")[0]; out.nobm = N && N.kind === "none" && RU.scoreEffect(M, "C", N) === "" && !/Without it/.test(html(M).textContent);
      M = L.build("sarah", "new"); h = html(M); out.learn = /Day 5 of 14/.test(h.textContent) && h.querySelectorAll(".ap-hero-steps i").length === 14 && h.querySelectorAll(".ap-hero-steps i.is-on").length === 5 && !h.querySelector("[data-count]");
      return out;
    });
    await kset("persona", "marcus");
    await k.evaluate(() => { const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS, M = api.M(), x = L.day(M, L.TODAY); x.entries = x.entries.filter((e) => e.kind !== "bm"); L.add(M, { kind: "nobm", d: L.TODAY, t: 19.5 }); });
    await kset("home", "day"); await kopen("home-day");
    const dayFirst = await k.evaluate(() => document.querySelector(".ap-rx .ap-layer").textContent);
    await kset("home", "score"); await kset("persona", "sarah");
    ok(hr.plain && hr.flag && hr.nobm && hr.learn && !/Without it/.test(dayFirst), `build-core: the hero is the number over its usual range with a dot never Gold, no dot on a flagged today, no count-up, no ring or 30-day line; no "Without it" for a No BM log on Score first or Day first; learning is Day 5 of 14 over 14 steps`);

    /* C5, C8, C9, C11, C13, C15 and C16 on the model */
    const ins = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, C = window.FLC, AK = window.FLORIN_ASK, out = {};
      const V = { form: "C", uid: 5, plan: "member", checkin: true };
      const dom = (h) => { const b2 = document.createElement("div"); b2.innerHTML = h; return b2; };
      let M = L.build("marcus", "est");
      /* C5: the summary's bar is the days read: its parts add up to its "of" */
      for (const n of [7, 30, 90]) { const d = dom(RU.insights(M, V, { range: n, k: null, y: 0 })), T = L.tally(L.span(M, n, "C"), n <= 7), seg = d.querySelector(".ap-sum .c-seg"), parts = [...seg.querySelectorAll(".c-seg-part")].map((p) => +p.getAttribute("title").match(/\d+$/)[0]); out[`seg${n}`] = parts.reduce((s, v) => s + v, 0) === T.known && ![...seg.querySelectorAll("[title], [data-tip]")].some((x) => /%/.test(x.getAttribute("title") + x.getAttribute("data-tip"))) && !/%/.test(seg.getAttribute("aria-label")); }
      /* C8: a day with 4 BMs isn't clipped; a flagged today's average leaves it out, as Ask's does */
      [12, 14, 16].forEach((t) => L.add(M, { kind: "bm", d: L.TODAY, t, form: 4, how: {}, dur: null, flags: {}, note: "" }));
      const often = dom(RU.cardChart(M, V, "often", 7).chart), dot4 = [...often.querySelectorAll("circle.dv-dot")].find((c) => /4 BMs so far/.test(c.textContent));
      out.four = !!dot4 && +dot4.getAttribute("cy") >= 18 && [...often.querySelectorAll(".dv-ax")].some((t) => t.textContent === "4");
      M = L.build("marcus", "est"); L.add(M, { kind: "bm", d: L.TODAY, t: 19.5, form: 4, how: {}, dur: null, flags: { blood: true }, note: "" });
      const F7 = L.span(M, 7, "C").filter((f) => f.count != null && !f.flag), avg = (F7.reduce((s, f) => s + f.count, 0) / F7.length).toFixed(1);
      const fact = RU.askContext(M, V, { k: "often", range: 7 }).facts[1], said = AK ? AK.textOf(AK.answer(M, V, "How often do I go?", { k: "often", range: 7 })) : `${avg} a day`;
      out.avg = fact === `${avg} a day on average` && said.includes(`${avg} a day`); out.avgSaid = `${fact} / ${avg}`;
      /* C9: the form bars' counts add up to the BMs read; in learning, 2 of 4 Formed is said as counts, never "mostly" */
      M = L.build("marcus", "est");
      const fb = dom(RU.cardChart(M, V, "form", 30).chart), read = L.span(M, 30, "C").filter((f) => !f.flag).reduce((s, f) => s + f.bms.length, 0);
      out.bars = [...fb.querySelectorAll(".dv-val")].reduce((s, t) => s + +t.textContent, 0) === read && !/%/.test(fb.innerHTML);
      M = L.build("sarah", "new"); const lf = dom(RU.insights(M, V, { range: 7, k: null, y: 0 })).querySelector('.ap-ic:has([data-k="form"]) .ap-ic-sum').textContent;
      out.mostly = lf === "4 BMs so far: 2 Formed, 1 Soft and 1 Firm."; out.lf = lf;
      /* C10: one Teal square per day per symptom, no strength in the mark */
      M = L.build("marcus", "est"); const sq = dom(RU.cardChart(M, V, "sym", 30).chart);
      out.sq = sq.querySelectorAll(".dv-sq").length > 0 && [...sq.querySelectorAll(".dv-sq")].every((r) => r.getAttribute("class") === "dv-sq" && r.getAttribute("width") === "8") && /Any symptom/.test(sq.textContent);
      /* C11: a pattern's two bars are as long as their shares, the counts written on them, never Plum or Gold */
      const PR = L.patterns(M, "C"), p = PR.found[0], sh = dom(RU.cardChart(M, V, "pattern:" + p.id, 90).chart);
      const ws = [...sh.querySelectorAll(".ap-share-t b")].map((x) => parseFloat(x.style.getPropertyValue("--w")));
      out.share = ws.length === 2 && Math.abs(ws[0] - (p.hit / p.n) * 100) < 0.2 && Math.abs(ws[1] - (p.oh / p.on) * 100) < 0.2 && sh.textContent.includes(`${p.hit} of ${p.n}`) && sh.textContent.includes(`${p.oh} of ${p.on}`) && (p.hit / p.n > p.oh / p.on) === (ws[0] > ws[1]);
      /* C13: a question is offered only when the logs have something for it */
      out.qs = [];
      for (const who of ["sarah", "marcus", "alex"]) for (const n of [7, 30, 90]) {
        const M2 = L.build(who, "est"), F = L.span(M2, n, "C"), u = M2.usual;
        const looser = F.filter((f) => !f.flag).flatMap((f) => f.bms).filter((b2) => L.inForms(M2, b2, "C") === false && Math.min(...L.stepsOf(b2)) > u.fHi).length;
        const busy = F.filter((f) => !f.flag && f.count != null && f.count > u.nHi).length;
        const fq = RU.askContext(M2, V, { k: "form", range: n }).qs.join(" "), oq = RU.askContext(M2, V, { k: "often", range: n }).qs.join(" ");
        if ((!looser && /looser/.test(fq)) || (!busy && /busier/.test(oq))) out.qs.push(`${who} ${n}`);
      }
      /* C15: Ask draws the card's own chart */
      out.same = [];
      for (const key of ["score", "timing", "often", "form", "sym"]) for (const n of [7, 30, 90]) {
        const d = dom(RU.insights(M, V, { range: n, k: null, y: 0 })), fig = d.querySelector(`.ap-ic:has([data-k="${key}"]) .ap-ic-fig`);
        if (!fig || fig.innerHTML.trim() !== dom(RU.cardChart(M, V, key, n).chart).innerHTML.trim()) out.same.push(`${key}@${n}`);
      }
      /* C16: the kit: a range with no value draws no dot; a segment's tip is a count, never a percent; the glyph holds no value */
      out.kit = !/c-range-dot/.test(C.range({ min: 0, max: 10, lo: 2, hi: 4, value: null })) && /c-range-dot/.test(C.range({ min: 0, max: 10, lo: 2, hi: 4, value: 3 })) && ![...dom(C.seg([{ v: 3, label: "A" }, { v: 1, label: "B" }])).querySelectorAll(".c-seg-part")].some((x) => /%/.test(x.getAttribute("title") + x.getAttribute("data-tip"))) && !/c-ring-arc|--v/.test(C.ring({ glyph: true }));
      return out;
    });
    ok(ins.seg7 && ins.seg30 && ins.seg90, "build-core: Insights' summary bar is the days read: its parts add up to its count, at 7, 30 and 90 days, with no percents");
    ok(ins.four && ins.avg, `build-core: How often's axis reaches a day with 4 BMs, and with a flagged today the average leaves it out, as Ask Florin's does (${ins.avgSaid})`);
    ok(ins.bars && ins.mostly, `build-core: the form bars' counts add up to the BMs read, and before a usual 2 of 4 is said as counts, never "mostly" (${ins.lf})`);
    ok(ins.sq, "build-core: a symptom is one 8px Teal square a day, strength never in the mark, with an Any symptom row");
    ok(ins.share, "build-core: a pattern's two bars are as long as their shares, with the counts on them");
    ok(!ins.qs.length, `build-core: Ask about this offers looser or busier only when the logs have them${ins.qs.length ? ": " + ins.qs.join(", ") : ""}`);
    ok(!ins.same.length, `build-core: RU.cardChart, the chart Ask draws, is each card's own chart at 7, 30 and 90 days${ins.same.length ? ": differs for " + ins.same.join(", ") : ""}`);
    ok(ins.kit, "build-core: the kit: no dot on a range with no value, counts in a segment's tip, and a glyph with no value");

    /* C6 and C12: FloraScore's card and detail: a line on the band with no area or average, today ringed and labelled */
    for (const theme of ["light", "dark"]) {
      await kset("theme", theme); await kopen("i-score");
      const sd = await k.evaluate(() => {
        const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, lay = document.querySelector(".ap-rx .ap-layer"), M = api.M(), V = api.V(), n = api.S.ins.range;
        const ser = L.scoreSeries(M, n, V.form), su = L.scoreUsual(M, V.form), sc = ser.filter((s) => s.value != null), k2 = sc.filter((s) => s.value >= su[0] && s.value <= su[1]).length;
        const t = document.createElement("i"); t.style.color = "var(--ap-shift)"; lay.appendChild(t); const gold = getComputedStyle(t).color; t.remove();
        const dot = lay.querySelector(".ap-sbar-dot");
        return { area: lay.querySelectorAll(".c-area, .c-avg").length, ring: lay.querySelectorAll(".dv-ring").length, today: [...lay.querySelectorAll(".dv-newlbl")].some((x) => /^Today \d+$/.test(x.textContent)), cap: lay.textContent.includes(`In its usual range on ${k2} of ${sc.length} days`), gold: dot ? getComputedStyle(dot).backgroundColor === gold : true, count: !!lay.querySelector("[data-count]") };
      });
      ok(!sd.area && sd.ring >= 1 && sd.today && sd.cap && !sd.gold && !sd.count, `build-core, FloraScore detail ${theme}: no area or average line, today ringed and labelled, "In its usual range on N of M days" from the model, the dot never Gold, no count-up`);
    }
    await kset("theme", "light");

    /* C14. History: each day's header has its mark and line, no chip inside an entry row, a flagged today reads FLAG_DAY */
    await k.evaluate(() => { const api = window.FLORIN_EXT.api, L = window.FLORIN_LOGS; L.add(api.M(), { kind: "bm", d: L.TODAY, t: 19.6, form: 4, how: {}, dur: null, flags: { blood: true }, note: "" }); });
    await kopen("history");
    const hs = await k.evaluate(() => {
      const L = window.FLORIN_LOGS, lay = document.querySelector(".ap-rx .ap-layer"), hd = [...lay.querySelectorAll(".ap-hd")];
      const first = hd[0], marks = hd.every((h) => !!h.querySelector(".ap-hd-h .ap-day"));
      const chips = [...lay.querySelectorAll(".ap-tl-row .ap-chip")].filter((c) => !/^Noted: /.test(c.textContent)).length;
      const gap = hd.find((h) => h.querySelector(".ap-hd-gap"));
      return { marks, chips, flag: first && (first.querySelector(".ap-hd-why") || {}).textContent === L.FLAG_DAY && !!first.querySelector(".ap-day--flag"), gap: gap ? gap.querySelector(".ap-hd-none").textContent : "" };
    });
    ok(hs.marks && !hs.chips && hs.flag && hs.gap === "Nothing logged this day. It stays a gap, never a zero.", "build-core: History's day headers carry the day mark and its line, no reading chip inside an entry row, a flagged today reads FLAG_DAY, and a gap says it stays a gap");

    /* C10 dark: the symptom squares stay Teal on dark (no Ray cells), and the check-in detail's dots are 8px */
    await kset("theme", "dark"); await kopen("i-sym");
    const sd2 = await k.evaluate(() => { const lay = document.querySelector(".ap-rx .ap-layer"), t = document.createElement("i"); t.style.color = "var(--ap-teal)"; lay.appendChild(t); const teal = getComputedStyle(t).color; t.remove(); const q = [...lay.querySelectorAll(".dv-sq")]; return { n: q.length, bad: q.filter((r) => getComputedStyle(r).fill !== teal).length }; });
    await kset("theme", "light"); await kopen("i-ck");
    const ckd = await k.evaluate(() => [...document.querySelectorAll(".ap-rx .ap-layer .ap-ckt-dot")].every((c) => +c.getAttribute("r") >= 4));
    ok(sd2.n > 0 && !sd2.bad && ckd, `build-core: symptom squares are Teal on dark (${sd2.n}), and the check-in detail's dots are 8px or more`);
    ok(!ke.length, `build-core: no console or page errors${ke.length ? ": " + ke.slice(0, 3).join(" | ") : ""}`);
    await kc.close();
  }
  /* ===== end build-core ===== */

  /* ===== fix-viz: the chart critic's and the truth recheck's findings, kept as checks (claude/Florin data viz.md,
     revised after the fix pass). A ring means today only; one reading of a day before day 14 and on Free; the stronger
     symptom's own days; ties named; Ask Florin draws the card's own chart; the weekly bars count days in Plum ===== */
  {
    const xc = await b.newContext({ viewport: { width: 390, height: 844 } });
    const x = await xc.newPage();
    const xe = [];
    x.on("pageerror", (e) => xe.push(e.message));
    x.on("console", (m) => { if (m.type() === "error") xe.push(m.text()); });
    await x.goto(PAGE); await x.waitForSelector(".ap-rx"); await x.waitForTimeout(500);
    const r = await x.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AK = window.FLORIN_ASK, VR = window.FLORIN_VARIANTS, out = {};
      const V = (o = {}) => Object.assign({ form: "C", uid: 1, plan: "member", mealUI: "quick", bmUI: "quick", home: "score", history: "list", checkin: true, look: "built", easy: false, onboard: "short", persona: "sarah", data: "est", meals: "all" }, o);
      const txt = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " "); };
      const bm = (d, t, o = {}) => Object.assign({ kind: "bm", d, t, form: 4, how: {}, dur: null, flags: {}, note: "" }, o);
      /* 1. the stronger symptom names only its own days */
      let M = L.build("sarah", "est");
      out.sym30 = L.symLine(L.span(M, 30, "C"), { named: false });
      L.add(M, { kind: "sym", d: L.TODAY, t: 15, items: [{ name: "Cramping", s: 3 }], last: 1, note: "" });
      out.sym7 = L.symLine(L.span(M, 7, "C"));
      out.sym30b = L.symLine(L.span(M, 30, "C"), { named: false });
      /* 2. before day 14: a day with only symptoms is logged, a flagged today is flagged, everywhere */
      M = L.build("sarah", "new"); L.day(M, L.TODAY).entries = []; L.add(M, { kind: "sym", d: L.TODAY, t: 15, items: [{ name: "Cramping", s: 3 }], last: 1, note: "" });
      const ft = L.facts(M, L.day(M, L.TODAY), "C");
      out.learnSym = ft.state === "logged" && !/Not counted/.test(txt(RU.historyDay(M, V({ data: "new" }), L.TODAY))) && /\b\d+ days logged\b/.test(txt(RU.weekCard(M, "C"))) && !/not counted/i.test(VR ? VR.cellOf(M, V({ data: "new" }), L.TODAY, VR.firstLog(M), "all").label : "");
      M = L.build("sarah", "new"); L.add(M, bm(L.TODAY, 16.5, { flags: { blood: true } }));
      const wkF = RU.weekCard(M, "C");
      out.learnFlag = L.facts(M, L.day(M, L.TODAY), "C").state === "flag" && /ap-day--flag/.test(wkF) && txt(wkF).includes(L.FLAG_DAY) && /ap-day--flag/.test(RU.historyDay(M, V({ data: "new" }), L.TODAY));
      out.learnSpan = (RU.weekCard(L.build("sarah", "new"), "C").match(/<h2>Your last 7 days<\/h2><span class="ap-k">([^<]*)</) || [])[1];
      /* 3. on Free, History's list reads the days the calendar reads, and holds the rest as logged */
      M = L.build("marcus", "est");
      const mis = [];
      const K = { usual: "usual", shifted: "shift", unsure: "quiet", nocount: "quiet", logged: "quiet", flag: "flag", gap: "none", pending: "none", plain: "before" };
      for (let d = L.TODAY - 13; d <= L.TODAY; d++) {
        const h = RU.historyDay(M, V({ plan: "free" }), d), k = (h.match(/ap-day ap-day--(\w+)/) || [])[1], c = VR.cellOf(M, V({ plan: "free" }), d, VR.firstLog(M), "all");
        if (k !== K[c.shown]) mis.push(`${d}: list ${k}, calendar ${c.shown}`);
      }
      out.free = mis;
      out.freeSay = /On Free, days are read against your usual for the last 7 days/.test(txt(RU.history(M, V({ plan: "free" }), { filter: "all", n: 14 })));
      /* 4. a ring means today: with nothing logged today, no chart rings or labels another day, and the axis ends on Today */
      M = L.build("marcus", "est"); L.day(M, L.TODAY).entries = [];
      /* (FloraScore keeps a score today, from the days before, so its line may ring today: the other charts have no reading today) */
      const ins = RU.insights(M, V({ persona: "marcus" }), { range: 7 }), det = ["timing", "often", "form", "score"].map((k) => RU.idetail(M, V({ persona: "marcus" }), { k, range: 7 })).join("");
      out.rings = ["timing", "often", "form"].map((k) => RU.cardChart(M, V({ persona: "marcus" }), k, 7).chart + RU.idetail(M, V({ persona: "marcus" }), { k, range: 7 })).join("").match(/class="dv-ring"/g) || [];
      out.lbls = ((ins + det).match(/class="dv-newlbl"[^>]*>([^<]*)</g) || []).filter((t) => /(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d/.test(t));
      out.axisToday = /BMs a day[\s\S]*?>Today<\/text><\/svg>/.test(ins);
      /* 5. a tie names every part that moved most (Marcus: Timing and Form, 2 points each), on the card and in Ask */
      M = L.build("marcus", "est");
      out.tie = (RU.insights(M, V({ persona: "marcus" }), { range: 7 }).match(/ap-ic-moved">([^<]*)</) || [])[1] || "";
      out.tieAsk = AK ? AK.answer(M, V({ persona: "marcus" }), "What moved my FloraScore this week?", { k: "score", range: 7 }).lines.join(" ") : "";
      /* 6. the symptom trend chips compare with the stretch before: plain, never Plum or Gold */
      const sd = RU.idetail(M, V({ persona: "marcus" }), { k: "sym", range: 30 });
      out.trend = !/ap-trow[\s\S]*?ap-chip--(usual|shift)/.test(sd) && !/ap-chip--(usual|shift)">[^<]*(than|as) (the week|the 30 days|your first 30)/.test(sd);
      /* 7. Ask Florin draws the card's own chart, never a Gold "Held", a spark with an area, or a retired word */
      const asks = [["How was my timing this week?", "timing", 7], ["How often do I go?", "often", 30], ["What do the forms mean?", "form", 30], ["What do my logs show this week?", "week", 7], ["Why did my FloraScore go down this week?", "score", 30]];
      out.askCharts = asks.filter(([q, k, n]) => { const a = AK.answer(M, V({ persona: "marcus" }), q, { k: k === "week" ? "score" : k, range: n }); const c = RU.cardChart(M, V({ persona: "marcus" }), k, n); return !a.chart || a.chart !== c.chart; }).map(([q]) => q);
      const pat = L.patterns(M, "C").found[0];
      const pa = pat ? AK.answer(M, V({ persona: "marcus" }), "How do I test it?", { k: `pattern:${pat.id}`, range: 30 }) : null;
      out.askPat = !pat || (pa.chart === RU.cardChart(M, V({ persona: "marcus" }), `pattern:${pat.id}`).chart && /ap-share/.test(pa.chart) && !/Held|is-shift|c-seg/.test(pa.chart + pa.legend));
      M = L.build("marcus", "est"); L.add(M, { kind: "sym", d: L.TODAY, t: 15, items: [{ name: "Cramping", s: 3 }], last: 1, note: "" });
      out.askWeek = AK.answer(M, V({ persona: "marcus" }), "What do my logs show this week?", null).lines.join(" ");
      /* 8. Ask's timing adds up at the minute shown: in the window, later and earlier are every first BM read */
      out.askAdd = [];
      for (const p of ["sarah", "marcus", "alex"]) for (const n of [7, 30, 90]) { const R = AK.read(L.build(p, "est"), V({ persona: p }), { k: "timing", range: n }), s = R.cs; if (s.inW + s.later + s.earlier !== s.mornings) out.askAdd.push(`${p} ${n}: ${s.inW}+${s.later}+${s.earlier} of ${s.mornings}`); }
      /* 9. a word that covers two forms: a span on today's bar, never a dot; the bars and the count add up */
      M = L.build("alex", "est"); L.add(M, bm(L.TODAY, 13.5, { form: null, word: 3 }));
      const fd = RU.idetail(M, V({ persona: "alex", form: "A" }), { k: "form", range: 7 });
      out.span = /c-range-span/.test(fd.split("ap-det-range")[0]) && !/c-range-dot/.test(fd.split("ap-det-range")[0]) && /covers two steps, so it isn't in the bars/.test(txt(fd));
      /* 10. the hero's bar names only the band; the detail names Lowest and Highest; FloraScore says "its usual range" */
      M = L.build("marcus", "est");
      const hero = RU.scoreHero(M, V({ persona: "marcus" }));
      out.hero = !/ap-sbar-ax/.test(hero) && /its usual range/.test(txt(hero)) && !/(Within|above|below) your usual range/i.test(txt(hero)) && /Lowest \d+/.test(txt(RU.idetail(M, V({ persona: "marcus" }), { k: "score", range: 7 })));
      out.rel = RU.scoreRel(90, [76, 82]) === "Above its usual range" && RU.scoreRel(84, [76, 82]) === "A little above its usual range" && RU.scoreRel(80, [76, 82]) === "In its usual range";
      /* 11. Score first's hero names the BM it takes out on a 3 BM day */
      M = L.build("sarah", "est"); [12, 15].forEach((t) => L.add(M, bm(L.TODAY, t)));
      out.three = txt(RU.scoreHero(M, V())).match(/(Without the \d+:\d\d [AP]M BM, FloraScore would be \d+|The \d+:\d\d [AP]M BM didn't change FloraScore)/) ? true : txt(RU.scoreHero(M, V()));
      /* 12. before day 14, chart readings are Ink 3 (is-learn), as the week card draws those days */
      const li = RU.insights(L.build("sarah", "new"), V({ data: "new" }), { range: 7 });
      out.learnInk = /dv-dot is-learn/.test(li) && !/class="dv-dot"/.test(li) && !/dv-bar"/.test(li);
      /* 13. How your days split is cut; dinners aren't read with meals on few days */
      out.split = !/How your days split/.test(RU.idetail(L.build("marcus", "est"), V({ persona: "marcus" }), { k: "often", range: 30 }));
      M = L.build("marcus", "est", { meals: "rough" });
      out.sparse = L.patterns(M, "C").sparse && !/after a dinner past 8 PM/.test(txt(RU.insights(M, V({ persona: "marcus", meals: "rough" }), { range: 30 }))) && !/dv-tick-ctx/.test(RU.idetail(M, V({ persona: "marcus", meals: "rough" }), { k: "timing", range: 30 }));
      /* 14. the Symptoms card names the rows past four */
      M = L.build("alex", "est"); L.add(M, { kind: "sym", d: L.TODAY, t: 15, items: [{ name: "Nausea", s: 0 }], last: 1, note: "" });
      out.more = /Also logged: /.test(txt(RU.insights(M, V({ persona: "alex" }), { range: 30 })));
      /* 15. the calendar says a day's BM count once */
      M = L.build("sarah", "est"); [12, 15].forEach((t) => L.add(M, bm(L.TODAY, t)));
      const cl = VR.cellOf(M, V(), L.TODAY, VR.firstLog(M), "all").label;
      out.cal = (cl.match(/3 BMs/g) || []).length === 1 ? true : cl;
      /* 16. Day first prices no No BM log */
      M = L.build("sarah", "est"); L.day(M, L.TODAY).entries = L.day(M, L.TODAY).entries.filter((e) => e.kind !== "bm"); L.add(M, { kind: "nobm", d: L.TODAY, t: 19.5 });
      out.nobm = !/Without the/.test(txt(RU.today(M, V({ home: "day" }))));
      return out;
    });
    ok(!/(moderate|strong) cramping on [2-9] days/.test(r.sym30) && /cramping on 2 days, once moderate/.test(r.sym30) && /strong cramping today/.test(r.sym7) && /cramping on [2-9] days, once strong/.test(r.sym30b), `last-fix: the stronger symptom is counted on all its days, as the strip counts it, then how many were that strong (${r.sym30} | ${r.sym7} | ${r.sym30b})`);
    ok(r.learnSym && r.learnFlag && r.learnSpan === "Oct 7 to 11", `fix-viz: before day 14 a day with only symptoms is logged and a flagged today is flagged, on the week card, History and the calendar alike; the card's dates start on the day the person did (${r.learnSpan})`);
    ok(!r.free.length && r.freeSay, `fix-viz: on Free, History's list reads the same days the calendar reads and holds the rest as logged, and says why${r.free.length ? ": " + r.free.join("; ") : ""}`);
    ok(!r.rings.length && !r.lbls.length && r.axisToday, `fix-viz: with nothing logged today no chart rings or labels another day, and the count line still ends on Today (${r.rings.length} rings, ${r.lbls.join(" ")})`);
    ok(/^Timing and form moved it most this week, adding 2 points each\.$/.test(r.tie) && /Timing and form moved it most, adding 2 points each\./.test(r.tieAsk), `fix-viz: a tie names every part (${r.tie} | ${r.tieAsk})`);
    ok(r.trend, "fix-viz: the Symptoms detail's trend chips are plain, never Plum or Gold");
    ok(!r.askCharts.length && r.askPat && /strong cramping today/.test(r.askWeek) && !/mostly bloating/.test(r.askWeek), `fix-viz: Ask Florin draws the card's own chart for each answer, a pattern as its share bars, and says the symptoms as the card does${r.askCharts.length ? ": " + r.askCharts.join(", ") : ""} (${r.askWeek.slice(0, 160)})`);
    ok(!r.askAdd.length, `fix-viz: Ask's timing adds up at the minute shown, every person, 7, 30 and 90 days${r.askAdd.length ? ": " + r.askAdd.join("; ") : ""}`);
    ok(r.span, "fix-viz: a word that covers two forms is an Ink 3 span on today's bar, and a line under the bars says it isn't in them");
    ok(r.hero && r.rel, "fix-viz: the hero's bar names only the band, the detail names Lowest and Highest, and FloraScore reads in its usual range (Above from 6 points out)");
    ok(r.three === true, `fix-viz: on a 3 BM day the hero names the BM it takes out (${r.three === true ? "" : r.three})`);
    ok(r.learnInk, "fix-viz: before day 14 chart readings are Ink 3, as the week card draws those days");
    ok(r.split && r.sparse, "fix-viz: How your days split is gone, and with meals on few days no dinner count or dinner tick is drawn");
    ok(r.more && r.cal === true && r.nobm, `fix-viz: the Symptoms card names its rows past four; the calendar says a day's BM count once; Day first prices no No BM log${r.cal === true ? "" : ` (${r.cal})`}`);
    /* the weekly bars count days: within in Plum (Ray on dark), the colour of a day within your usual */
    for (const theme of ["light", "dark"]) {
      await x.evaluate((t) => { window.FLORIN_EXT.api.set("persona", "marcus"); window.FLORIN_EXT.api.set("theme", t); window.FLORIN_EXT.api.open("i-timing"); }, theme); await x.waitForTimeout(500);
      await x.evaluate(() => { const bs = [...document.querySelectorAll('.ap-rx .ap-o:not(.is-out) [data-v="90"], .ap-rx .ap-layer .ap-seg--range [data-v="90"]')]; if (bs.length) bs[bs.length - 1].click(); }); await x.waitForTimeout(500);
      const wb = await x.evaluate(() => {
        const ph = document.querySelector(".rx-stage .ap-rx") || document.querySelector(".ap-rx"), bar = ph.querySelector(".dv-wbar:not(.is-shift):not(.is-ctx)");
        const probe = document.createElement("i"); probe.style.color = "var(--ap-signal)"; ph.appendChild(probe); const want = getComputedStyle(probe).color; probe.remove();
        return { got: bar ? getComputedStyle(bar).fill : "none", want, gold: [...ph.querySelectorAll(".dv-wbar.is-shift")].every((n) => getComputedStyle(n).strokeWidth === "1.5px") };
      });
      ok(wb.got === wb.want && wb.gold, `fix-viz, ${theme}: the 90-day weekly bars count days in Plum (Ray on dark), their Gold edged (${wb.got} against ${wb.want})`);
    }
    await x.evaluate(() => { window.FLORIN_EXT.api.set("theme", "light"); window.FLORIN_EXT.api.set("persona", "sarah"); window.FLORIN_EXT.api.reset(); });
    ok(!xe.length, `fix-viz: no console or page errors${xe.length ? ": " + xe.slice(0, 3).join(" | ") : ""}`);
    await xc.close();
  }
  /* ===== end fix-viz ===== */

  /* ===== finish-viz: the rest of the critic's and the truth recheck's findings, kept as checks (claude/Florin data
     viz.md, after the finishing pass). A chart's x axis ends on Today and its Today tick sits under today alone, at 30
     days too; dots apart at 30 days; Timing's day by day capped at 14 rows with its legend words; dark Gold chart marks
     edged; no decoration ring on the hero; one typical first BM; Easy's dates and its What moved; the check-in strips'
     own words; meals said as all; Ask's labels; a flagged today before day 14 on the calendar ===== */
  {
    const zc = await b.newContext({ viewport: { width: 390, height: 844 } });
    const z = await zc.newPage();
    const ze = [];
    z.on("pageerror", (e) => ze.push(e.message));
    z.on("console", (m) => { if (m.type() === "error") ze.push(m.text()); });
    await z.goto(PAGE); await z.waitForSelector(".ap-rx"); await z.waitForTimeout(500);
    const r = await z.evaluate(() => {
      const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AK = window.FLORIN_ASK, VR = window.FLORIN_VARIANTS, out = {};
      const V = (o = {}) => Object.assign({ form: "C", uid: 1, plan: "member", mealUI: "quick", bmUI: "quick", home: "score", history: "list", checkin: true, look: "built", easy: false, onboard: "short", persona: "marcus", data: "est", meals: "all" }, o);
      const txt = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " "); };
      const dom = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d; };
      const bm = (d, t, o = {}) => Object.assign({ kind: "bm", d, t, form: 4, how: {}, dur: null, flags: {}, note: "" }, o);
      /* 1. nothing logged today: at 7 and 30 days, How often's and Form's day charts end on a Today tick with nothing
         drawn above it, and no tick says Today under another day */
      let M = L.build("marcus", "est"); L.day(M, L.TODAY).entries = [];
      out.axis = [];
      for (const k of ["often", "form"]) for (const n of [7, 30]) {
        const svgs = [...dom(RU.idetail(M, V(), { k, range: n })).querySelectorAll("svg")].filter((s) => [...s.querySelectorAll("text.dv-ax")].some((t) => t.textContent === "Today"));
        if (!svgs.length) { out.axis.push(`${k} ${n}: no chart ends on Today`); continue; }
        svgs.forEach((s) => {
          const tk = [...s.querySelectorAll("text.dv-ax")].filter((t) => t.textContent === "Today");
          const tx = +tk[tk.length - 1].getAttribute("x");
          const above = [...s.querySelectorAll("circle.dv-dot:not(.is-hit)")].filter((c) => Math.abs(+c.getAttribute("cx") - tx) < 3);
          if (tk.length !== 1 || above.length) out.axis.push(`${k} ${n}: ${tk.length} Today ticks, ${above.length} marks above it`);
        });
      }
      /* 2. past 7 days each dot sits on a card-colour disc; at 7 days none */
      M = L.build("marcus", "est");
      out.sp = /dv-sp/.test(RU.cardChart(M, V(), "often", 30).chart) && !/dv-sp/.test(RU.cardChart(M, V(), "often", 7).chart);
      /* 3. Timing's day by day: 14 rows at most past a week, each labelled, with its legend's words */
      const td = RU.idetail(M, V(), { k: "timing", range: 30 }), tt = txt(td);
      out.rows = /Last 14 days, newest at the top/.test(tt) && /First BM, in your usual window/.test(tt) && !/Inside your usual window/.test(tt);
      /* 4. one typical first BM: with a flagged today, the Timing detail's equals Ask Florin's (both over the days read) */
      M = L.build("marcus", "est"); L.add(M, bm(L.TODAY, 16.5, { flags: { blood: true } }));
      const tm = (txt(RU.idetail(M, V(), { k: "timing", range: 7 })).match(/Typical first BM\s*(\d+:\d\d [AP]M)/) || [])[1];
      const ak = AK ? (AK.read(M, V(), { k: "timing", range: 7 }).text.match(/Typical first BM[^\d]*(\d+:\d\d [AP]M)/) || [])[1] : tm;
      out.med = tm && tm === ak ? true : `${tm} against ${ak}`;
      /* 5. Easy: the dates as every other card says them, and What moved leads with the week's change */
      M = L.build("marcus", "est");
      const ez = txt(RU.today(M, V({ easy: true })));
      out.ezSpan = /Your last 7 days\s*Oct 5 to 11/.test(ez) && !/to today/.test(ez);
      const mv = L.scoreMoved(M, "C");
      const ew = txt(RU.insights(M, V({ easy: true }), { range: 30 }));
      out.ezMoved = !mv || !mv.delta ? true : new RegExp(`${Math.abs(mv.delta)}\\s*points? ${mv.delta > 0 ? "up" : "down"} on average this week`).test(ew);
      /* 6. the check-in strips name each step in the answer's own words */
      const ck = RU.ckTrend(M, 3, null);
      out.ck = /Mostly settled/.test(ck) && !/>Mostly</.test(ck);
      /* 7. meals logged only with symptoms: "all of them days with symptoms" when every meal day had one */
      M = L.build("sarah", "est", { meals: "rough" });
      const PR = L.patterns(M, "C");
      out.rough = PR.roughShare < 1 || /all of them days with symptoms/.test(txt(RU.insights(M, V({ persona: "sarah", meals: "rough" }), { range: 30 })));
      /* 8. Ask's From your logs: a stretch said once, and no average of nothing */
      M = L.build("marcus", "est");
      const fx = AK ? AK.read(M, V(), null).text : "";
      M = L.build("sarah", "fresh"); L.add(M, { kind: "nobm", d: L.TODAY, t: 19.5 });
      const fy = AK ? AK.read(M, V({ persona: "sarah", data: "fresh" }), null).text : "";
      out.askLbl = !/(last 30 days), \1/.test(fx) && !/\b0\.0\b/.test(fy);
      /* 9. a flagged today before day 14 is the Teal ring on the calendar as on the week card */
      M = L.build("sarah", "new"); L.add(M, bm(L.TODAY, 16.5, { flags: { blood: true } }));
      out.calFlag = !VR || VR.cellOf(M, V({ persona: "sarah", data: "new" }), L.TODAY, VR.firstLog(M), "all").shown === "flag";
      return out;
    });
    ok(!r.axis.length, `finish-viz: with nothing logged today, How often's and Form's charts end on one Today tick with nothing above it, at 7 and 30 days${r.axis.length ? ": " + r.axis.join("; ") : ""}`);
    ok(r.sp && r.rows, "finish-viz: past 7 days each dot sits on a card-colour disc, and Timing's day by day shows the last 14 days with its legend's words");
    ok(r.med === true, `finish-viz: with a flagged today, the typical first BM is over the days read on the Timing detail and in Ask Florin alike${r.med === true ? "" : ` (${r.med})`}`);
    ok(r.ezSpan && r.ezMoved, "finish-viz: Easy's week says Oct 5 to 11, as every card does, and What moved leads with the week's change");
    ok(r.ck && r.rough && r.askLbl && r.calFlag, `finish-viz: the check-in strips use the answers' own words; meals all on symptom days say "all of them"; Ask's labels say a stretch once and no average of nothing; a flagged today before day 14 is flagged on the calendar (${JSON.stringify({ ck: r.ck, rough: r.rough, askLbl: r.askLbl, calFlag: r.calFlag })})`);
    /* the live phone: dark Gold chart marks carry their deeper Gold edge, and the hero has no decoration ring */
    const lv = await z.evaluate(async () => {
      const api = window.FLORIN_EXT.api, wait = (ms) => new Promise((res) => setTimeout(res, ms));
      api.set("persona", "marcus"); api.set("theme", "dark"); api.reset(); await wait(300);
      const ph = document.querySelector(".rx-stage .ap-rx") || document.querySelector(".ap-rx"), hero = ph.querySelector(".ap-hero");
      const deco = hero ? getComputedStyle(hero, "::after").display : "no hero drawn";
      api.open("i-timing"); await wait(400);
      const bs = [...ph.querySelectorAll('[data-act="irange"][data-v="30"]')]; if (bs.length) bs[bs.length - 1].click(); await wait(400);
      const g = [...ph.querySelectorAll(".dv-dot.is-shift")].map((n) => { const s = getComputedStyle(n); return { w: s.strokeWidth, st: s.stroke, f: s.fill }; });
      api.set("theme", "light"); api.set("persona", "sarah"); api.reset();
      return { deco, n: g.length, edged: g.every((x) => x.w === "1.5px" && x.st !== x.f && x.st !== "none") };
    });
    ok(lv.deco === "none" && lv.n > 0 && lv.edged, `finish-viz: on dark every Gold chart mark (${lv.n}) carries its deeper Gold edge, and the hero draws no decoration ring (${lv.deco})`);
    ok(!ze.length, `finish-viz: no console or page errors${ze.length ? ": " + ze.slice(0, 3).join(" | ") : ""}`);
    await zc.close();
  }
  /* ===== end finish-viz ===== */

  /* ===== fix-notes: the notes critic's findings, kept as checks (Will, Oct 28: "Make it simple"). Every decision's
     top label numbers it and says what we recommend; the check-in note answers first; a new note opens at its top; the
     claims line shows only on a fail; no was and now or research section can come back; the Person and Logs notes
     are worked out from the logs; the top bar counts the safe area once; on a phone a changed decision says so at the
     top of the Toggles sheet, and the meals control opens its note (prototype/js/refresh-app.js) ===== */
  {
    const fc = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const f = await fc.newPage();
    const fe = [];
    f.on("pageerror", (e) => fe.push(e.message));
    f.on("console", (x) => { if (x.type() === "error") fe.push(x.text()); });
    await f.goto(PAGE); await f.waitForSelector(".rx-stage .ap-rx"); await f.waitForTimeout(500);
    const fw = (ms = 300) => f.waitForTimeout(ms);
    const fclick = async (sel, ms) => { await f.evaluate((s) => document.querySelector(s).click(), sel); await fw(ms); };
    const info = async (k) => { await f.evaluate((k) => { const x = document.querySelector(`[data-rx="dinfo"][data-v="${k}"]`); if (x.getAttribute("aria-pressed") !== "true") x.click(); }, k); await fw(250); };
    const KEYS = ["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard"];
    const LABEL = { form: "Consistency", bmUI: "BM logging", home: "Home", history: "History", checkin: "Weekly check-in", mealUI: "Meal sheet", look: "Data style", easy: "Version", onboard: "Onboarding" };
    const WANT = { form: "C", bmUI: "Quick tiles and form", home: "Score first", history: "Calendar", checkin: "On", mealUI: "Quick, voice or text", look: "Florin charts", easy: "Easy, as a setting", onboard: "Short" };
    /* 12. the top label: Decision n of 9, the decision, and what we recommend, in view at 1000 tall */
    const eb = [];
    for (let i = 0; i < KEYS.length; i++) {
      await info(KEYS[i]);
      const e = await f.evaluate(() => { const x = document.querySelector("#rxNotes .rx-eyebrow"); return { t: x.textContent, bottom: x.getBoundingClientRect().bottom }; });
      if (e.t !== `Decision ${i + 1} of 9 · ${LABEL[KEYS[i]]} · We recommend ${WANT[KEYS[i]]}` || e.bottom > 1000) eb.push(`${KEYS[i]}: ${e.t}`);
    }
    ok(!eb.length, `fix-notes: every decision's top label reads Decision n of 9, its name and what we recommend, in view${eb.length ? ": " + eb.join("; ") : ""}`);
    /* 6. the check-in note answers Will's question right under its opening sentence, then what the check-in is, in the
       sheet's words, with every question and the day it's due from the model */
    await info("checkin");
    const ck = await f.evaluate(() => {
      const N = document.querySelector("#rxNotes .rx-note"), kids = [...N.children], L = window.FLORIN_LOGS, M = window.FLORIN_EXT.api.M();
      const at = (sel) => kids.findIndex((x) => x.matches(sel));
      const h3 = kids.find((x) => x.matches(".rx-h3") && /What the check-in is/.test(x.textContent));
      const ans = N.querySelector(".rx-answer");
      return {
        order: at(".rx-note-lede") < at(".rx-answer") && at(".rx-answer") < kids.indexOf(h3) && kids.indexOf(h3) < at(".rx-opts"),
        ans: ans ? ans.textContent : "",
        qs: L.CHECKIN.every((c) => N.textContent.includes(c.q)),
        more: N.querySelectorAll(".rx-about-m li").length,
        due: N.textContent.includes(`(${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][M.ckDay.dow]} ${M.ckDay.when} to start)`),
        rec: (N.querySelector(".rx-rec") || {}).textContent || "",
        top: ans ? ans.getBoundingClientRect().bottom : 9999,
        n: ["No", "One", "Two", "Three", "Four", "Five", "Six"][L.CHECKIN.length]
      };
    });
    ok(ck.order && ck.ans === `Our answer: keep it. ${ck.n} one-tap questions a week, in our own words, not a licensed questionnaire. Free for everyone.` && ck.qs && ck.more === 3 && ck.due && ck.rec === "We recommend On, free on both plans. It takes a minute and is the app's one weekly reason to come back." && ck.top < 1000, `fix-notes: the check-in note answers first (in view, ${Math.round(ck.top)}px), then what the check-in is as the sheet's lines, and recommends On in the sheet's words`);
    /* 7. a note about something else opens at its top */
    await info("look");
    await f.evaluate(() => { document.querySelector("#rxRight").scrollTop = 99999; }); await fw(100);
    const s0 = await f.evaluate(() => document.querySelector("#rxRight").scrollTop);
    await info("home");
    const s1 = await f.evaluate(() => ({ top: document.querySelector("#rxRight").scrollTop, h: document.querySelector("#rxNotes h2").getBoundingClientRect().top }));
    await f.evaluate(() => { document.querySelector("#rxRight").scrollTop = 99999; });
    await fclick('#rxLeft [data-rx="history"][data-v="calendar"]', 400);
    const s2 = await f.evaluate(() => ({ top: document.querySelector("#rxRight").scrollTop, t: document.querySelector("#rxNotes h2").textContent }));
    await fclick('#rxLeft [data-rx="history"][data-v="list"]', 300);
    ok(s0 > 200 && s1.top === 0 && s1.h > 0 && s2.top === 0 && s2.t === "How should History show past days?", `fix-notes: a new note opens at its top, from an info button and from a toggle (was ${s0}px down)`);
    /* 13, 23. a screen that passes shows no claims line; a note's ba and res draw nothing */
    await fclick('[data-rx="dclose"]');
    await fclick('[data-rx="screen"][data-v="today"]', 400);
    const cl = await f.evaluate(() => ({ lint: !!document.querySelector("#rxNotes .rx-lint"), t: document.querySelector("#rxNotes h2").textContent }));
    const old = await f.evaluate(async () => {
      const X = window.FLORIN_EXT, was = X.notes.today;
      X.notes.today = () => ({ t: "Test", lede: "A note with old sections.", ba: [["Was", "Now"]], res: ["A study"] });
      document.querySelector('[data-rx="screen"][data-v="today"]').click();
      await new Promise((r) => setTimeout(r, 300));
      const N = document.querySelector("#rxNotes").textContent, ba = !!document.querySelector("#rxNotes .rx-ba, #rxNotes .rx-res");
      X.notes.today = was;
      document.querySelector('[data-rx="screen"][data-v="today"]').click();
      return { ba, t: /Was, now|From the research|A study/.test(N) };
    });
    await fw(300);
    ok(!cl.lint && cl.t === "Today" && !old.ba && !old.t, "fix-notes: a screen that passes the claims check shows no claims line, and a note's was and now or research draws nothing");
    /* 14 to 22, 24, 25: the plain words, on the page and in the notes */
    const pg = await f.evaluate(() => ({
      foot: document.querySelector(".rx-foot").textContent.trim(), lede: document.querySelector(".rx-dec-lede").textContent,
      link: document.querySelectorAll(".rx-head-links a")[1].textContent, bm: [...document.querySelectorAll('[data-rx="bmUI"]')].map((x) => x.textContent.trim()).join("|"),
      today: document.querySelector("#rxNotes .rx-note-lede").textContent
    }));
    ok(pg.foot === "Prototype only. Not for patients." && pg.lede === "Each one changes the app on the phone." && pg.link === "Every data style, side by side" && pg.bm === "Quick tiles|Full form" && /the last 7 days/.test(pg.today), `fix-notes: the footer, the Decisions line, the header link, the BM logging toggle and Today's note in plain words (${pg.bm})`);
    const words = {};
    for (const k of KEYS) { await info(k); words[k] = await f.evaluate(() => document.querySelector("#rxNotes .rx-note").textContent); }
    ok(/FloraScore as a small chip at the top/.test(words.home) && /a Plum circle for a day within the person's usual, a Gold circle for a day outside it, and the date alone/.test(words.history) && !/week card/.test(words.history + words.look) && /a small ring for each part of the score/.test(words.look) && /the usual range as a bar, the week as one circle a day/.test(words.look) && !/being redrawn|; the other four/.test(words.look) && /The app as the rest of this demo shows it/.test(words.easy) && /Every data style, side by side/.test(words.look), "fix-notes: Home, History, Data style and Version describe what the phone draws, with no build status");
    await fclick('[data-rx="dclose"]');
    await f.evaluate(() => window.FLORIN_EXT.api.set("easy", true)); await fw(400);
    const sh = await f.evaluate(() => [...document.querySelectorAll("[data-shadow]")].map((x) => x.textContent).join("|"));
    await f.evaluate(() => window.FLORIN_EXT.api.set("easy", false)); await fw(400);
    ok(sh === "Easy has its own Today. Turn Easy off to see this choice.|Easy has its own charts. Turn Easy off to see this choice.", `fix-notes: with Easy on, the lines under Home and Data style say how to see the choice (${sh})`);
    /* 21, 22. the Person and Logs notes, worked out from each demo person's logs */
    await f.evaluate(() => { const x = document.querySelector('[data-rx="fold"]'); if (x.getAttribute("aria-expanded") !== "true") x.click(); });
    await fclick('[data-rx="xinfo"][data-v="persona"]');
    const pn = await f.evaluate(() => {
      const L = window.FLORIN_LOGS, mode = window.FLORIN_EXT.api.V().form;
      const items = [...document.querySelectorAll("#rxNotes .rx-pairs li")].map((li) => [li.querySelector("b").textContent, li.querySelector("span").textContent]);
      const bad = items.filter(([name, line]) => {
        const id = name.toLowerCase(), M = L.build(id, "est"), u = M.usual;
        return !line.includes(`usual forms ${L.usualFormsText(M, mode)}`) || !line.includes(`about 1 day in ${u.sym.every}`) || !/^First BM usually \d/.test(line) || !/Possible pattern: /.test(line);
      });
      return { n: items.length, bad: bad.map((x) => x[0]) };
    });
    await fclick('[data-rx="xinfo"][data-v="data"]');
    const dn = await f.evaluate(() => { const L = window.FLORIN_LOGS, li = [...document.querySelectorAll("#rxNotes .rx-pairs li")].find((x) => /New/.test(x.querySelector("b").textContent)); return { t: li ? li.querySelector("span").textContent : "", day: L.learnDay(L.build(window.FLORIN_EXT.api.V().persona, "new")), learn: L.LEARN_DAYS }; });
    ok(pn.n === 3 && !pn.bad.length && dn.t === `Day ${dn.day}. Florin is still learning their usual, so there's no FloraScore until day ${dn.learn}.`, `fix-notes: the Person note gives each person a line from their logs, and Logs says New is day ${dn.day}${pn.bad.length ? " (" + pn.bad.join(", ") + ")" : ""}`);
    await fc.close();

    /* 9, 10. on a phone: the top bar counts the safe area once, so the app's date line and avatar sit under it; a
       decision changed in Toggles says so at the top of the sheet, with See it and Read the note; the meals control
       opens its note */
    const mc = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const m = await mc.newPage();
    m.on("pageerror", (e) => fe.push(e.message));
    await m.goto(PAGE); await m.waitForSelector(".rx-stage .ap-rx"); await m.waitForTimeout(500);
    const mw = (ms = 350) => m.waitForTimeout(ms);
    const mclick = async (sel, ms) => { await m.evaluate((s) => document.querySelector(s).click(), sel); await mw(ms); };
    await m.evaluate(() => { document.documentElement.style.setProperty("--rx-sat", "47px"); document.documentElement.style.setProperty("--rx-sab", "34px"); }); await mw(250);
    const sa = await m.evaluate(() => {
      const bar = document.querySelector(".rx-mbar").getBoundingClientRect(), ly = document.querySelector(".rx-stage .ap-rx .ap-layer");
      const av = ly.querySelector(".ap-avatar").getBoundingClientRect(), at = document.elementFromPoint(av.left + av.width / 2, av.top + av.height / 2);
      const first = [...ly.querySelectorAll("p, h1, h2")].find((x) => x.getBoundingClientRect().height > 0);
      return { h: Math.round(bar.height), avatar: av.top >= bar.bottom && !!at && !!at.closest(".ap-avatar"), first: first.getBoundingClientRect().top >= bar.bottom };
    });
    await m.evaluate(() => { document.documentElement.style.removeProperty("--rx-sat"); document.documentElement.style.removeProperty("--rx-sab"); }); await mw(250);
    ok(sa.h === 95 && sa.avatar && sa.first, `fix-notes: with a stand-in safe area of 47, the top bar is ${sa.h}px (48 plus the inset, once), and the app's first line and avatar sit under it, the avatar tappable`);
    await mclick('.rx-mbar [data-v="toggles"]');
    /* the demo opens on Calendar (last-fix, Oct 29), so List first, then Calendar */
    await mclick('#rxSheet-toggles [data-rx="history"][data-v="list"]');
    await mclick('#rxSheet-toggles [data-rx="history"][data-v="calendar"]');
    const ln = await m.evaluate(() => { const n = document.querySelector("[data-sheet-now]"), r = n.getBoundingClientRect(); return { on: !n.hidden, t: n.querySelector("p").textContent, b: [...n.querySelectorAll("button")].map((x) => `${x.textContent}:${x.dataset.rx}`).join("|"), inView: r.top >= 0 && r.bottom <= innerHeight }; });
    await mclick('[data-sheet-now] [data-rx="now-note"]', 450);
    const rn = await m.evaluate(() => ({ notes: !document.querySelector("#rxSheet-notes").hidden, h: document.querySelector("#rxNotes h2").textContent }));
    await mclick("#rxSheet-notes .rx-x");
    await mclick('.rx-mbar [data-v="toggles"]');
    const gone = await m.evaluate(() => document.querySelector("[data-sheet-now]").hidden);
    await mclick('#rxSheet-toggles [data-rx="history"][data-v="list"]');
    await mclick('#rxSheet-toggles [data-rx="history"][data-v="calendar"]');
    await mclick('[data-sheet-now] [data-rx="show"]', 500);
    const si = await m.evaluate(() => ({ closed: document.querySelector("#rxSheet-toggles").hidden, key: window.FLORIN_EXT.api.key() }));
    await m.evaluate(() => window.FLORIN_EXT.api.set("history", "list")); await mw();
    ok(ln.on && ln.inView && ln.t === "History is now Calendar." && ln.b === "See it:show|Read the note:now-note" && rn.notes && rn.h === "How should History show past days?" && gone && si.closed && si.key === "hist-cal", `fix-notes: on a phone, a changed decision says so at the top of Toggles (${ln.t}); Read the note opens its note, See it closes the sheet on the calendar, and the line is gone next time`);
    await mclick('.rx-mbar [data-v="toggles"]');
    await m.evaluate(() => { const x = document.querySelector('[data-rx="fold"]'); if (x.getAttribute("aria-expanded") !== "true") x.click(); }); await mw(200);
    await mclick('#rxSheet-toggles [data-rx="meals"][data-v="rough"]', 600);
    const mn = await m.evaluate(() => ({ notes: !document.querySelector("#rxSheet-notes").hidden, toggles: !document.querySelector("#rxSheet-toggles").hidden, h: document.querySelector("#rxNotes h2").textContent }));
    await m.evaluate(() => window.FLORIN_EXT.api.set("meals", "all")); await mw();
    ok(mn.notes && !mn.toggles && mn.h === "Demo person's meals", "fix-notes: on a phone, changing Demo person's meals opens its note");
    ok(!fe.length, `fix-notes: no console or page errors${fe.length ? ": " + fe.slice(0, 3).join(" | ") : ""}`);
    await mc.close();
  }
  /* ===== end fix-notes ===== */

  ok(!errs.length, `no console or page errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
  await b.close();
  console.log(fails.length ? `\n${fails.length} failed` : "\nAll behaviour checks pass.");
  process.exitCode = fails.length ? 1 : 0;
})();
