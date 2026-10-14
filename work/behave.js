/* Behaviour checks for the refresh prototype: the interactions the Oct 14 workshop fixed.
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
  const open = async (id) => { await p.evaluate((id) => document.querySelector(`#rxMsheet [data-rx="screen"][data-v="${id}"]`).click(), id); await wait(); };

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
  await p.evaluate(() => document.querySelector('#rxMsheet [data-rx="form"][data-v="B"]') ? null : null);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.rx-mbar [data-rx="form"]')].find((x) => x.dataset.v === "B"); b && b.click(); });
  await wait();
  await open("bm");
  await p.click(`${ph} .ap-fm-b[data-word="1"]`); await wait(200);
  await p.click(`${ph} [data-act="save-bm"]`); await wait(500);
  ok(/BM saved\. Firm/.test(await p.$eval(`${ph} .ap-tst`, (e) => e.textContent)), "saving a B log through the form shows its toast");
  await p.evaluate(() => { const b = [...document.querySelectorAll('.rx-mbar [data-rx="form"]')].find((x) => x.dataset.v === "C"); b && b.click(); });
  await wait();
  ok(await p.evaluate(() => [...document.querySelectorAll(".rx-stage .ap-rx .ap-layer .ap-tl-m b")].some((b) => b.textContent === "BM · Firm")), "and reads as Firm in C, not another word");

  /* 11. reset with a half-filled form leaves nothing behind */
  await open("bm");
  await p.fill(`${ph} [data-in="note"]`, "left over");
  await p.evaluate(() => document.querySelector('#rxMsheet [data-rx="reset"]').click()); await wait();
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
  const setForm = (v) => p.evaluate((v) => { const b = [...document.querySelectorAll('.rx-mbar [data-rx="form"]')].find((x) => x.dataset.v === v); b && b.click(); }, v);
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
  const ids = await p.$$eval('#rxMsheet [data-rx="screen"]', (b) => b.map((x) => x.dataset.v));
  const bad = [];
  for (const who of ["sarah", "marcus", "alex"]) {
    await p.evaluate((v) => { const b = document.querySelector(`#rxMsheet [data-rx="persona"][data-v="${v}"]`); b && b.click(); }, who); await wait(300);
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

  ok(!errs.length, `no console or page errors${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
  await b.close();
  console.log(fails.length ? `\n${fails.length} failed` : "\nAll behaviour checks pass.");
  process.exitCode = fails.length ? 1 : 0;
})();
