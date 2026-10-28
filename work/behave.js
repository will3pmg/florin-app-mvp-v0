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
    return /strength not given/.test(html);
  });
  ok(mild, "an unrated symptom shows as strength not given");

  /* 8. a No BM day is never drawn as a gap */
  const nobm = await p.evaluate(() => {
    const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI;
    const M = L.build("sarah", "new");
    L.add(M, { kind: "nobm", d: L.TODAY, t: 19 });
    const html = RU.weekCard(M, "A");
    const today = html.split('<ol class="ap-wk-strip"')[2] || "";
    return /no BM, logged/.test(today) && !/Sunday, Oct 11: nothing logged/.test(today);
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
  ok(/for breakfast/.test(said) && /for dinner/.test(said), `the mic fills the box with the day, word by word (${said.slice(0, 40)}...)`);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains("ap-mq-text")), "when the mic stops, focus is in the box to fix anything");
  await p.click(`${ph} [data-act="save-meal"]`); await wait(600);
  ok(/Saved what you ate today\. \d+ foods counted/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "saving says how many foods were counted");
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
    out.hero = new RegExp(`data-count="${s.value}"`).test(RU.scoreHero(M, { form: "C", uid: 1 })) && su[0] < su[1];
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
    return /Nausea, strength not said/.test(html) && !/Nausea, mild/.test(html);
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
    out.nocount = L.facts(M, L.day(M, 87), "C").state === "nocount" && /no BMs logged/.test(RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 })) && /but nothing about BMs/.test(RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 }));
    /* the top symptom logged without a strength: no strength word for it */
    M = L.build("sarah", "est");
    for (let d = 84; d <= 89; d++) { const x = L.day(M, d); if (!x.logged) continue; x.entries = x.entries.filter((e) => e.kind !== "sym"); L.add(M, { kind: "sym", d, t: 12, items: [{ name: "Bloating", s: 0 }], last: null, note: "" }); }
    L.add(M, { kind: "sym", d: 85, t: 13, items: [{ name: "Gas", s: 1 }], last: 1, note: "" });
    out.unrated = !/usually mild/.test(RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 }));
    /* every BM a word that covers two steps: no "mostly Type 1" */
    M = L.build("sarah", "new");
    M.days.forEach((x) => x.entries.forEach((e) => { if (e.kind === "bm") { e.form = null; e.word = 3; } }));
    const ins = RU.insights(M, { form: "A", uid: 1 }, { range: 7, k: null, y: 0 });
    out.top = !/mostly Type 1|mostly Pellets/.test(ins) && /mostly Loose/.test(ins);
    /* before a usual, a No BM day is a plain ring, not Gold */
    M = L.build("sarah", "new");
    L.add(M, { kind: "nobm", d: 87, t: 21 });
    out.plain = /dv-zero is-plain/.test(RU.insights(M, { form: "C", uid: 1 }, { range: 7, k: null, y: 0 }));
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
  ok(copy.plain, "before a usual exists, No BM is a plain ring, not a Gold shift");
  ok(copy.wk && copy.care, "90-day weekly cells start with the span, and the Symptoms clinician line matches the app's alarm list");
  await open("today");
  ok(await p.evaluate(() => !/in the last 30 days|in 30 days/.test(document.querySelector(".rx-stage .ap-rx .ap-layer").textContent)), "Today counts foods over the same 90 days Insights checks");

  /* 27. nothing on screen or in the notes reads undefined or NaN, for any person or screen */
  const ids = await p.$$eval('[data-rx="screen"]:not([disabled])', (b) => b.map((x) => x.dataset.v));
  const bad = [];
  for (const who of ["sarah", "marcus", "alex"]) {
    await p.evaluate((v) => { const b = document.querySelector(`[data-rx="persona"][data-v="${v}"]`); b && b.click(); }, who); await wait(300);
    for (const id of ids) { await open(id); const t = await p.evaluate(() => document.body.innerText); if (/\bundefined\b|\bNaN\b/.test(t)) bad.push(`${who}/${id}`); }
  }
  ok(!bad.length, `no screen or note reads undefined or NaN (${bad.slice(0, 4).join(", ") || "none"})`);

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
        compare: !!document.querySelector('#rxCmp, [data-rx="compare"], [data-v="compare-bm"], .rx-cmpt') || /compare all three|side by side/i.test(document.body.textContent),
        headSwitch: !!document.querySelector('.rx-head [data-rx]'),
        decs: [...document.querySelectorAll(".rx-side--l .rx-dec")].map((x) => x.dataset.dec),
        info: [...document.querySelectorAll('.rx-side--l [data-rx="dinfo"]')].length,
        fits: r.bottom <= window.innerHeight && r.top >= 0,
        leftScrolls: getComputedStyle(l).overflowY === "auto" && getComputedStyle(l).position === "sticky" && parseFloat(getComputedStyle(l).maxHeight) <= window.innerHeight && l.scrollHeight > l.clientHeight
      };
    });
    ok(lay.heads[0] === "Decisions" && lay.heads.indexOf("Screens") > lay.heads.indexOf("Demo") && lay.heads.indexOf("Demo") > 0, `the left bar runs Decisions, Demo, then Screens (${lay.heads.join(", ")})`);
    ok(lay.phones === 1 && !lay.compare && !lay.headSwitch, "one phone, no compare mode, and no switches left in the header");
    ok(["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard"].every((k) => lay.decs.includes(k)) && lay.info === lay.decs.length, `every decision has a toggle and an info button (${lay.decs.join(", ")})`);
    ok(lay.fits && lay.leftScrolls, "the whole phone fits under the header, and the left bar scrolls on its own");
    /* a decision's note shows when it changes, stays while the screen does, and gives way on the next screen */
    await d.click('[data-rx="bmUI"][data-v="full"]'); await d.waitForTimeout(400);
    const n1 = await d.evaluate(() => ({ eb: document.querySelector("#rxNotes .rx-eyebrow").textContent, t: document.querySelector("#rxNotes h2").textContent, on: (document.querySelector("#rxNotes .rx-opts .is-on") || {}).textContent || "", rec: !!document.querySelector("#rxNotes .rx-rec") }));
    ok(/Decision/.test(n1.eb) && /BM logging/.test(n1.t) && /Full form only/.test(n1.on) && n1.rec, `changing a decision shows its note, with the option on the phone and a recommendation (${n1.t})`);
    await d.click('.rx-side [data-rx="screen"][data-v="insights"]'); await d.waitForTimeout(400);
    ok(await d.evaluate(() => /On the phone now/i.test(document.querySelector("#rxNotes .rx-eyebrow").textContent) && /Insights/.test(document.querySelector("#rxNotes h2").textContent)), "the next screen change brings back that screen's notes");
    await d.click('[data-rx="dinfo"][data-v="checkin"]'); await d.waitForTimeout(300);
    ok(await d.evaluate(() => /check-in/i.test(document.querySelector("#rxNotes h2").textContent) && document.querySelector('[data-rx="dinfo"][data-v="checkin"]').getAttribute("aria-pressed") === "true"), "an info button shows its decision's note");
    await d.click('[data-rx="bmUI"][data-v="quick"]');
    ok(!de.length, `no page errors at 1440${de.length ? ": " + de[0] : ""}`);
    await d.close();
  }

  /* 34. on a phone: a bottom bar with Toggles and Notes; Toggles holds Decisions, Demo and Screens, in that order */
  const mob = await p.evaluate(() => {
    const bar = document.querySelector(".rx-mbar"), r = bar.getBoundingClientRect();
    const t = document.querySelector("#rxSheet-toggles"), n = document.querySelector("#rxSheet-notes");
    return {
      bottom: Math.abs(r.bottom - window.innerHeight) < 2 && getComputedStyle(bar).position === "fixed",
      btns: [...bar.querySelectorAll('[data-rx="sheet"]')].map((x) => x.textContent.trim()),
      heads: [...t.querySelectorAll(".rx-panel > .rx-h")].map((h) => h.textContent.trim()),
      notes: !!n.querySelector("#rxNotes"),
      full: document.querySelector(".rx-stage .ap-rx").classList.contains("is-full")
    };
  });
  ok(mob.bottom && mob.btns.join("|") === "Toggles|Notes" && mob.full, `on a phone the app is full screen over a bottom bar of ${mob.btns.join(" and ")}`);
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
  ok(av.w === 44 && av.h === 44 && av.l === "Profile" && /profile/i.test(av.t) && /this pass/.test(av.t), `without a module, the 44px Profile avatar says the profile comes in this pass (${av.w}x${av.h})`);

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
  await wait(300);

  /* 40. the Oct 28 review: the page follows every phone.set, Picked until an option is drawn, arrows stay off the
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
    /* On the phone, or Picked */
    await d.click('[data-rx="history"][data-v="list"]'); await dw();
    await d.click('[data-rx="history"][data-v="calendar"]'); await dw();
    const pk = await d.evaluate(() => ({ on: document.querySelector("#rxNotes .rx-opts .is-on .rx-on").textContent, lede: document.querySelector("#rxNotes .rx-note-lede").textContent }));
    ok(pk.on === "Picked" && /Calendar is drawn in the next pass/.test(pk.lede), `an option the phone doesn't draw yet reads Picked, and the lede says so (${pk.on})`);
    await api(() => { window.FLORIN_EXT.built.history = ["calendar"]; }); await d.click('[data-rx="history"][data-v="list"]'); await d.click('[data-rx="history"][data-v="calendar"]'); await dw();
    ok(await d.evaluate(() => document.querySelector("#rxNotes .rx-opts .is-on .rx-on").textContent === "On the phone" && !/next pass/.test(document.querySelector("#rxNotes .rx-note-lede").textContent)), "once a module claims it in EXT.built, it reads On the phone");
    await api(() => { delete window.FLORIN_EXT.built.history; }); await d.click('[data-rx="history"][data-v="list"]'); await dw();
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

  ok(!errs.length, `no console or page errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
  await b.close();
  console.log(fails.length ? `\n${fails.length} failed` : "\nAll behaviour checks pass.");
  process.exitCode = fails.length ? 1 : 0;
})();
