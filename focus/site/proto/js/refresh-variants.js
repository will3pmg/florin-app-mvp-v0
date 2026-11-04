/* Florin app refresh: the Home decision's Day first (V.home "day") and Compact (V.home "compact"), and the History
   decision's Calendar (V.history "calendar"). A feature module: it registers into window.FLORIN_EXT and wraps RU.today
   and RU.history (CLAUDE.md, Extension hooks), and never edits a core file.
   - Compact (Will, Nov 4): a short FloraScore strip, this week as a row of day buttons (the Rings week card's marks,
     smaller) with arrows for earlier weeks, then the day picked as History draws it, and the check-in when it's due.
     The section COMPACT below has the detail.
   - Day first: the date with a small FloraScore chip (the glyph and the number) that opens its detail; today's logs in time order, with the one
     that stood out most marked; a row to log from that follows the BM logging decision; one sentence that leads with
     what stood out, gives FloraScore against yesterday and (with membership) what that log did to it, scored with and
     without it; then the week and the check-in. A flag leads with the Teal note and no score reading, and the chip keeps
     its number but reads it against nothing. The Easy version takes precedence over it.
   - Calendar: a month of days, each drawn with RU.dayMark, the one day mark Today's card, History, Your days and Easy
     use (claude/Florin data viz.md, section 1): a Plum circle within the usual (Ray in dark), a Gold circle outside it,
     an Ink 3 circle for a day logged but not counted, the date alone for a day with nothing logged, a Teal ring for a
     day with a flag (never read), today ringed, and one Teal square under a day with symptoms. On Free, days before
     the last 7 show only as logged.
     A tapped day is drawn by RU.historyDay, as the list draws it, with Add to this day. The filter chips stay. Arrow
     keys move between days, between the first day and today.
   Every number either one states is computed from the model. A wrapper that throws is reported with console.warn,
   naming this module, and the core's screen is drawn in its place. */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, EXT = window.FLORIN_EXT, C = window.FLC;
  if (!FL || !L || !RU || !AD || !EXT) return;
  const MOD = "refresh-variants (Day first and Calendar)";
  const warn = (what, e) => { try { console.warn(`Florin ${MOD}: ${what} failed, so the core's version is drawn instead.`, e); } catch (x) { /* nowhere to report */ } };
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, ic = RU.icon;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  const dateOf = L.dateOf;
  const shortDate = (d) => { const x = dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const winText = (M) => `${T(M.usual.tLo).replace(/ AM$/, "")} to ${T(M.usual.tHi)}`;
  const nText = (a, b) => (a === b ? `${a}` : `${a} to ${b}`);
  const todayOf = (M) => { const x = L.day(M, L.TODAY); return x ? x.entries : []; };

  /* ============================== WHAT STOOD OUT TODAY ==============================
     Today's entries, ranked. First a flag on a BM, or an alarm feature named in a note or a symptom: never read, only
     routed to primary care. Then a shift from the person's own usual: a form outside the usual forms, a first BM
     outside the usual window, a BM past the usual count, or a No BM day. Then symptoms by strength: strong, moderate,
     mild, then one logged without a strength (never read as mild). Ties go to the earlier entry. Shifts need a usual,
     so before day 14 only flags and symptoms can stand out. The first of the list is the item Day first marks.
     The core owns this ranking now (RU.standouts, RU.alarmOf, RU.leadText in refresh-ui.js), so Score first's sentence
     and Day first's marked row can't disagree: this module calls the core's copy, and keeps its own only for a core
     that doesn't have one */
  const FLAG_SIGN = { blood: "Blood in your stool", mucus: "Mucus in your stool", black: "A black or tar-like stool" };
  const ownAlarmOf = (e) => {
    if (e.kind === "bm") {
      const f = L.FLAGS.filter(([k]) => e.flags && e.flags[k]).map(([k]) => k);
      if (f.length) return { flags: f, sign: f.length === 1 ? FLAG_SIGN[f[0]] : f.includes("black") ? "A black stool, and more" : "Blood and mucus in your stool", serious: f.includes("blood") || f.includes("black") };
      const s = L.alarmsIn(e.note || "", { bm: true });
      return s.length ? { signs: s, sign: L.signText(s), serious: true, typed: true } : null;
    }
    if (e.kind === "sym") {
      const s = L.alarmsIn(`${e.items.map((i) => i.name).join(". ")}. ${e.note || ""}`);
      return s.length ? { signs: s, sign: L.signText(s), serious: true, typed: true } : null;
    }
    return null;
  };
  const alarmOf = (e) => (typeof RU.alarmOf === "function" ? RU.alarmOf(e) : ownAlarmOf(e));
  /* every alarm feature a day's logs name, in words for a label: "blood", "a fever". The calendar marks such a day for a
     clinician and never reads it against the usual */
  const SIGN_WORD = { blood: "blood", mucus: "mucus", black: "a black or tar-like stool" };
  const signsOfDay = (es) => {
    const out = [];
    es.forEach((e) => {
      const a = alarmOf(e);
      if (!a) return;
      (a.flags || []).map((k) => SIGN_WORD[k]).concat((a.signs || []).map((s) => (s === "Blood" ? "blood" : lower1(s)))).forEach((w) => { if (!out.includes(w)) out.push(w); });
    });
    return out;
  };
  const SHIFT_CHIP = { form: "Outside your usual forms", late: "Later than your window", early: "Earlier than your window", more: "More than your usual", none: "Fewer than your usual" };
  const ownStandouts = (M, mode) => {
    const u = M.usual, es = todayOf(M), bms = es.filter((e) => e.kind === "bm");
    const out = [];
    es.forEach((e) => {
      const a = alarmOf(e);
      if (a) { out.push({ e, kind: "alarm", rank: 4, tone: "info", chip: "Clinician note", alarm: a }); return; }
      if (e.kind === "bm" && u) {
        const i = bms.indexOf(e);
        const why = L.inForms(M, e, mode) === false ? "form" : i === 0 && !L.inWindow(M, e.t) ? (Math.round(e.t * 60) / 60 > u.tHi ? "late" : "early") : i >= u.nHi ? "more" : null;
        if (why) out.push({ e, kind: why, rank: 3, tone: "shift", chip: SHIFT_CHIP[why] });
      }
      if (e.kind === "nobm" && u) out.push({ e, kind: "none", rank: 3, tone: "shift", chip: SHIFT_CHIP.none });
      if (e.kind === "sym") {
        const s = Math.max(0, ...e.items.map((i) => i.s || 0));
        out.push({ e, kind: "sym", s, rank: s === 3 ? 2 : 1 + s / 10, tone: "plain", chip: s ? `${L.STRENGTH[s - 1]} symptom` : "Strength not said" });
      }
    });
    return out.sort((a, b) => b.rank - a.rank || a.e.t - b.e.t);
  };
  const standouts = (M, mode) => (typeof RU.standouts === "function" ? RU.standouts(M, mode) : ownStandouts(M, mode));

  /* the lead of the day's sentence: the item, in the person's own terms, as Score first's sentence words it. Day first
     draws a flag as the Teal note, so a flag has no lead here */
  const leadOf = (M, mode, N) => {
    if (!N || N.kind === "alarm") return null;
    if (typeof RU.leadText === "function") return RU.leadText(M, mode, N);
    const e = N.e, u = M.usual;
    if (N.kind === "form") return `Your ${T(e.t)} BM was ${L.formName(e, mode)}, outside your usual forms, ${L.usualFormsText(M, mode)}.`;
    if (N.kind === "late" || N.kind === "early") return `Your first BM came at ${T(e.t)}, ${N.kind === "late" ? "later" : "earlier"} than your usual ${winText(M)} window.`;
    if (N.kind === "more") { const n = L.bms(L.day(M, L.TODAY)).length; return `${WORDS[n] || n} BMs today, more than your usual ${nText(u.nLo, u.nHi)} a day.`; }
    if (N.kind === "none") return `No BM today, logged at ${T(e.t)}. Your usual is ${nText(u.nLo, u.nHi)} a day.`;
    if (N.kind === "sym") { const t = RU.entryText(e, mode).title; return N.s ? `${L.STRENGTH[N.s - 1]} ${lower1(t)} at ${T(e.t)}.` : `${t} at ${T(e.t)}, strength not said.`; }
    return null;
  };

  /* today's FloraScore with one of today's entries taken out: what that entry alone did to the score */
  const scoreWithout = (M, e, mode) => {
    if (RU.scoreWithout) return RU.scoreWithout(M, e, mode);
    const days = M.days.map((x) => (x.d === L.TODAY ? Object.assign({}, x, { entries: x.entries.filter((y) => y !== e) }) : x));
    return L.score(Object.assign({}, M, { days }), L.TODAY, mode);
  };
  const NOUN = { bm: "BM", nobm: "No BM log", sym: "symptom log" };
  /* what it did to the score: today's FloraScore against yesterday's, then what the item that stood out did to it on its
     own, worked out by scoring today with and without that entry (never by crediting a part it didn't move). Why the
     score moved is a membership feature, so Free says the change and stops there */
  const scoreLine = (M, V, N) => {
    const mode = V.form;
    if (!M.usual) { const left = L.LEARN_DAYS - L.learnDay(M); return left > 0 ? `Your FloraScore starts on day ${L.LEARN_DAYS}, in ${plural(left, "day")}.` : "Your FloraScore starts once Florin knows your usual."; }
    const s = L.score(M, L.TODAY, mode), y = L.score(M, L.TODAY - 1, mode);
    if (!s || s.value == null) return `No FloraScore today: ${L.NO_SCORE}.`;
    const dv = y && y.value != null ? s.value - y.value : null;
    const head = dv == null ? `FloraScore is ${s.value}. Yesterday has no FloraScore to compare it with` : !dv ? `FloraScore is ${s.value}, the same as yesterday` : `FloraScore is ${s.value}, ${Math.abs(dv)} ${dv > 0 ? "higher" : "lower"} than yesterday's ${y.value}`;
    /* no counterfactual for a No BM log, as Score first's hero (RU.scoreEffect): pricing an honest log in points reads as
       a cost for logging (fix-viz, Oct 28) */
    if (V.plan === "free" || !N || !N.e || !NOUN[N.e.kind] || N.kind === "none" || N.e.kind === "nobm") return `${head}.`;
    const w = scoreWithout(M, N.e, mode), what = `the ${T(N.e.t)} ${NOUN[N.e.kind]}`;
    if (!w || w.value == null) return `${head}.`;
    return w.value === s.value ? `${head}. ${what.charAt(0).toUpperCase()}${what.slice(1)} didn't change it.` : `${head}. Without ${what}, it would be ${w.value}.`;
  };
  /* the whole sentence, as Day first draws it. On a day with a flag or an alarm feature the Teal note comes first and
     the sentence gives no score reading at all (the flagged log is never read through the score): only the next thing
     that stood out, if anything did. With nothing logged today, the score line alone */
  const dayLine = (M, V, list) => {
    const all = list || standouts(M, V.form);
    const lead = all.find((x) => x.kind !== "alarm");
    if (all.some((x) => x.kind === "alarm")) return leadOf(M, V.form, lead) || "";
    if (!todayOf(M).length) return scoreLine(M, V, null);
    return `${leadOf(M, V.form, lead) || RU.highlight(M)} ${scoreLine(M, V, lead)}`;
  };

  /* ============================== DAY FIRST ============================== */
  /* the parts the core and the earlier modules drew (the data style replaces the week): a part that throws falls back
     to the one this module found when it loaded, then to nothing */
  const PARTS0 = Object.assign({}, RU.todayParts || {});
  const part = (k, M, V) => {
    const fs = [(RU.todayParts || {})[k], PARTS0[k]];
    for (const f of fs) { if (!f) continue; try { return f(M, V) || ""; } catch (e) { warn(`Today's ${k} part`, e); } }
    return "";
  };
  /* FloraScore's own words, the core's (RU.scoreRel): "in its usual range", so the chip never reads like a day within
     your usual beside a week card that marks today outside it (fix-viz, Oct 28) */
  const relOf = (v, su) => (RU.scoreRel ? RU.scoreRel(v, su) : v == null || !su ? null : v < su[0] ? (su[0] - v >= 6 ? "Below its usual range" : "A little below its usual range") : v > su[1] ? (v - su[1] >= 6 ? "Above its usual range" : "A little above its usual range") : "In its usual range");

  /* 1. the date, and a compact FloraScore chip (the glyph, the number) that opens its detail (the paywall on Free, as the hero does). On Free
     before day 14 there's no score to sell yet, so the chip is plain, as the core's learning card is. On a day with a
     flag or an alarm feature the chip keeps L.score's number (the detail it opens shows the same one) but reads it
     against nothing: the card under it routes the flagged log to primary care, and a flagged log is never read through
     the score */
  const FLAG_WORD = "Not read against your usual today: a log is noted for a clinician";
  const scoreChip = (M, V, list) => {
    const free = V.plan === "free";
    const act = free ? 'data-act="pay" data-pay="score"' : 'data-act="idetail" data-k="score"';
    const go = free ? "With Florin membership, see what moves it" : "Open the detail";
    let num, word, said;
    if (!M.usual) {
      const d = L.learnDay(M);
      num = ""; word = `Starts on day ${L.LEARN_DAYS}. Today is day ${d}.`;
      said = [`FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual`, `Today is day ${d} of ${L.LEARN_DAYS}`];
    } else {
      const s = L.score(M, L.TODAY, V.form), su = L.scoreUsual(M, V.form), v = s ? s.value : null;
      const flag = (list || standouts(M, V.form)).some((x) => x.kind === "alarm");
      num = v == null ? "No score" : String(v);
      word = v == null ? `Not scored today: ${L.NO_SCORE}` : flag ? FLAG_WORD : relOf(v, su) || "";
      said = v == null ? [`FloraScore not scored today: ${L.NO_SCORE}`] : flag ? [`FloraScore ${v}`, FLAG_WORD] : [`FloraScore ${v}`, word && su ? `${word}, ${su[0]} to ${su[1]}` : word];
    }
    /* the FloraScore glyph, a plain circle: a name, not a gauge. A ring this small can't show the usual range, so it
       never fills toward 100; the chip's word carries the reading */
    const svg = C && C.ring ? C.ring({ glyph: true, size: 16 }) : "";
    const inner = `<span class="vr-sc-ring" aria-hidden="true">${svg}</span><span class="vr-sc-l">FloraScore</span>${num ? `<b>${esc(num)}</b>` : ""}`;
    const chip = free && !M.usual
      ? `<span class="vr-sc vr-sc--plain">${inner}</span>`
      : `<button type="button" class="vr-sc" ${act} aria-label="${esc(said.concat(go).filter(Boolean).join(". "))}">${inner}${ic(free ? "lock" : "chev")}</button>`;
    return `<div class="vr-sc-row" data-a>
        ${chip}
        ${word ? `<span class="vr-sc-w">${esc(word)}</span>` : ""}
      </div>`;
  };
  const topPart = (M, V, list) => {
    const t = dateOf(L.TODAY), hello = L.NOW < 12 ? "Good morning" : L.NOW < 17 ? "Good afternoon" : "Good evening";
    return `<header class="ap-top vr-top" data-a>
        <div class="ap-top-l"><p class="ap-date">${hello}, ${esc(M.P.name)}</p><h1 class="ap-hello">${esc(Ut.DOWL[t.getDay()])}, ${esc(Ut.MONL[t.getMonth()])} ${t.getDate()}</h1></div>
        <button type="button" class="ap-avatar" data-act="profile" aria-label="Profile">${esc(M.P.initial)}</button>
      </header>
      ${scoreChip(M, V, list)}`;
  };

  /* 2. today's logs, in time order, as the lead. The row is RU.entryRow's (so a module that wraps it changes this list
     too), with the item that stood out marked: a chip inside the row, so it's read with the row, and an edge */
  const markRow = (h, N) => {
    const c = `<span class="ap-chip ap-chip--${N.tone} vr-mk-c">${esc(N.chip)}</span>`;
    let out = h.replace(/<li\b([^>]*)>/, (m, a) => (/class="/.test(a) ? `<li${a.replace(/class="/, `class="vr-mk vr-mk--${N.tone} `)} data-vr-mark="${N.kind}">` : `<li class="vr-mk vr-mk--${N.tone}" data-vr-mark="${N.kind}"${a}>`));
    out = /<span class="ap-tl-m">/.test(out) ? out.replace(/<span class="ap-tl-m">/, (m) => m + c) : out.replace(/(<li\b[^>]*>)/, (m) => m + c);
    return out;
  };
  const timelinePart = (M, V, N) => {
    const es = todayOf(M), id = `vr-tl-h${V.uid}`;
    const rows = es.map((e) => { const h = RU.entryRow(e, M, V); return N && N.e === e ? markRow(h, N) : h; }).join("");
    const any = M.days.some((x) => x.entries.length);
    return `<section class="ap-tlw vr-tl" data-a aria-labelledby="${id}">
        <div class="ap-card-h ap-card-h--pad"><h2 id="${id}">Today so far</h2><span class="ap-k">${es.length ? plural(es.length, "entry", "entries") : "Nothing yet"}</span></div>
        ${es.length ? `<ol class="ap-card ap-tl">${rows}</ol>` : `<div class="ap-card ap-tl-empty"><p>${any ? "Nothing logged yet today." : "Nothing logged yet."} Each log lands here, in time order, and the one that stands out is marked.</p></div>`}
      </section>`;
  };

  /* 3. a row to log from, following the BM logging decision: with quick tiles, the tiles sit here as on plus (a tile
     saves at once once 5 BMs are logged, and opens the form before that); with the full form only, a Log a BM button
     opens the form and there's no tile and no one-tap save */
  const logPart = (M, V) => {
    const es = todayOf(M), full = V.bmUI === "full", quick = RU.bmCount(M) >= RU.QUICK_AFTER;
    const hasBm = es.some((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
    const id = `vr-log-h${V.uid}`;
    const meal = V.mealUI === "detailed" ? [ic("meal"), "Meal"] : [ic("mic"), "What you ate"];
    const more = `<div class="vr-log-more">
        ${full ? `<button type="button" class="ap-btn ap-btn--2 ap-btn--c" data-act="open-bm">${RU.glyph(4)}Log a BM</button>` : ""}
        <button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="open-sym">${ic("sym")}Symptoms</button>
        <button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="open-meal">${meal[0]}${meal[1]}</button>
        ${L.isLate() && !hasBm && !hasNo ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="nobm">${ic("nobm")}No BM today</button>` : ""}
      </div>`;
    if (full) return `<section class="ap-card vr-log vr-log--full" data-a aria-labelledby="${id}"><div class="ap-card-h"><h2 id="${id}">Log</h2><span class="ap-k">Every BM through the form</span></div>${more}</section>`;
    return `<section class="ap-card vr-log" data-a aria-labelledby="${id}">
        <div class="ap-card-h"><h2 id="${id}">Log a BM</h2><span class="ap-k">${quick ? "One tap saves it" : "Tap one, then Save"}</span></div>
        ${RU.formTiles(V.form, null, { act: quick ? "vr-quick" : "open-bm", actLabel: quick ? "Logs a BM now" : "Opens Log a BM", guide: true, label: quick ? "Log a BM now" : "Start a BM log with this one" })}
        ${more}
      </section>`;
  };

  /* 4. the day's sentence. A flag or an alarm feature comes first as the Teal note (primary care first, never read),
     then the sentence about the next thing that stood out */
  const alarmBanner = (N) => {
    const x = N.alarm;
    const urgent = (x.flags || []).some((k) => k === "blood" || k === "black") || (x.signs || []).some((s) => s === "Blood" || s === "A black or tar-like stool");
    const line = x.typed ? "You wrote this in a log today. It's worth a clinician's look soon. Florin won't try to read it." : x.serious ? "It's worth a clinician's look soon. Florin won't try to read it." : "If it's new for you, keeps showing up, or comes with pain or blood, check in with a clinician. Florin won't try to read it.";
    return `<div class="ap-ask-alarm" role="note"><span class="ap-k">When to see a clinician</span><b>${esc(x.sign)}</b><p>${esc(line)} Primary care is the right first stop: your GP or a nurse practitioner.</p>${urgent ? `<p class="ap-fl-urgent">If there's a lot of blood, or you feel faint or dizzy, get urgent care now.</p>` : ""}</div>`;
  };
  /* its heading never repeats the timeline's: what stood out, else the day's highlight, else (nothing logged today) the
     score on its own */
  const highlightPart = (M, V, list) => {
    const al = list.find((x) => x.kind === "alarm"), id = `vr-hl-h${V.uid}`, line = dayLine(M, V, list);
    return `<section class="ap-card vr-hl" data-a aria-labelledby="${id}">
        <h2 class="ap-k vr-hl-k" id="${id}">${list.length ? "What stood out today" : todayOf(M).length ? "Today's highlight" : "FloraScore"}</h2>
        ${al ? alarmBanner(al) : ""}
        ${line ? `<p class="vr-hl-line">${esc(line)}</p>` : ""}
      </section>`;
  };

  /* the screen: 1 the date and the score chip, 2 the logs, 3 the log row, 4 the sentence, 5 the week and the check-in
     (it draws nothing when it's off or not due), then the next step and the fine print, as every screen ends */
  const dayFirst = (M, V) => {
    const list = standouts(M, V.form);
    return `<div class="ap-scr ap-today vr-day">
      ${[topPart(M, V, list), timelinePart(M, V, list[0]), logPart(M, V), highlightPart(M, V, list), part("week", M, V), part("checkin", M, V), part("next", M, V), part("fine", M, V)].join("\n")}
    </div>`;
  };
  /* ============================== COMPACT ==============================
     Will, Nov 4, with the shipping app's home beside it: "a more compressed data view, then the calendar (tighter too)
     then Today. That way you can really navigate when you land on home ... Little less analysis and more navigation."
     Home's third option (V.home "compact"), drawn as:
     1. the greeting with the profile button, no date line (the week row under it shows the date)
     2. a short FloraScore strip: the word FloraScore small, Insights at its end; the number (a button to FloraScore's
        page, the paywall's way on Free as Day first's chip goes) with where it sits (RU.scoreRel) and the week's
        average against last week's in words (L.scoreMoved, as shown, in whole points: "Week average 5 above last
        week"), never beside today's number as if today had moved, and never with no score today; then a thin bar of
        the usual range. Before day 14, the day it's on over 14 steps, as the hero says it. With no score today,
        L.NO_SCORE. A flag or an alarm feature today: the number read against nothing (no dot on the bar) and the Teal
        primary-care note right under the strip, in Score first's words (RU.highlightOf)
     3. one week, Monday to Sunday, as a row of seven day tabs drawn with the Rings week card's own marks (its renderer,
        FLOOKS rings .marks, at 32px, so Home's two week rows can't drift apart): a Plum ring within the usual (Ray on
        dark), a Gold one outside it (tinted and edged in light, a solid disc on dark), an Ink 3 ring not counted, a
        thin empty ring with "+ Add" under it for a day with nothing logged (a tap picks it and opens plus for it, as
        the week card's Add does), a Teal ring for a day noted for a clinician; Today over today, a Teal square under a
        day with symptoms; then the legend of the marks on show, in the shared words. The month and year over it, with
        arrows a week back and forward, never before the first day and never past today, and "This week" when the row
        is on another week. What a day's mark says is the calendar's (cellOf): a day with a sign is noted for a
        clinician, and on Free a day before the last 7 is only logged
     4. the day picked (today by default), drawn by RU.historyDay as History draws it (its mark left to the row above),
        as the tabs' panel, with Add; then the check-in card when it's due, and the fine print. No week card and no
        sentence on what stood out: the strip and the marks carry the reading
     The day picked lives on the phone's state (S.vrCp), with the model it was picked on, so a new person or new logs
     start again on today, as the Today tab does. A log saved to another day while a day is picked (the plus button,
     Log for an earlier day) moves the pick to that day, so the new log is on screen (S.vrCpSeen keeps each entry's day
     from the last draw) */
  const cpOf = (M) => { const S = EXT.api && EXT.api.S, c = S && S.vrCp; return c && c.M === M ? c : null; };
  const cpSel = (M) => { const c = cpOf(M), d = c ? c.sel : null; return d != null && L.day(M, d) ? d : L.TODAY; };
  /* a log saved since the last draw on a day other than the one picked: the pick follows it */
  const cpFollow = (M) => {
    const S = EXT.api && EXT.api.S;
    if (!S) return;
    const now = new Map();
    M.days.forEach((x) => x.entries.forEach((e) => { if (e.id != null) now.set(e.id, x.d); }));
    const was = S.vrCpSeen && S.vrCpSeen.M === M ? S.vrCpSeen.map : null;
    S.vrCpSeen = { M, map: now };
    if (!was) return;
    let to = null;
    now.forEach((d, id) => { if (was.get(id) !== d) to = d; });
    if (to != null && to !== cpSel(M) && L.day(M, to)) S.vrCp = { M, sel: to };
  };
  /* the Monday of a day's week (the model's days run Monday to Sunday: day 0 is a Monday) */
  const mon0 = (d) => d - ((dateOf(d).getDay() + 6) % 7);
  const n1 = (v) => Math.round(v * 10) / 10;
  const upper1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  /* the week's change, as Score first's detail counts it: the two averages as shown, so "5 above" is the difference of
     the numbers Insights shows. Said as the week's average, so it never reads as today's move beside today's number.
     Never Gold, never "up" or "down": a change, not a reading */
  const weekMove = (mv) => (!mv ? null : mv.delta === 0
    ? ["Week average same as last week", "This week's average is the same as last week's."]
    : [`Week average ${Math.abs(mv.delta)} ${mv.delta > 0 ? "above" : "below"} last week`, `This week's average is ${plural(Math.abs(mv.delta), "point")} ${mv.delta > 0 ? "above" : "below"} last week's.`]);
  /* the bar's ends: the last 90 days' scores and 10 points past each end of the usual range, rounded out to 5, as the
     hero's bar takes them */
  const cpAxis = (M, mode, su) => {
    const all = L.scoreSeries(M, 90, mode).map((s) => s.value).filter((v) => v != null);
    return { lo: Math.max(0, Math.floor(Math.min(...all, su[0] - 10) / 5) * 5), hi: Math.min(100, Math.ceil(Math.max(...all, su[1] + 10) / 5) * 5) };
  };
  const cpStrip = (M, V) => {
    const mode = V.form, id = `vr-cp-h${V.uid}`, free = V.plan === "free";
    const svg = C && C.ring ? C.ring({ glyph: true, size: 16 }) : "";
    const go = `<button type="button" class="vr-cp-go" data-act="vr-cp-ins">Insights${ic("chev")}</button>`;
    const head = `<div class="vr-cp-k"><span class="vr-sc-ring" aria-hidden="true">${svg}</span><h2 class="ap-k ap-k--ray" id="${id}">FloraScore</h2></div>`;
    /* before day 14: the day it's on, over 14 steps, as the hero says it */
    if (!M.usual) {
      const d = L.learnDay(M);
      return `<section class="vr-cp-sc is-learn" data-a aria-labelledby="${id}">
          ${head}
          <p class="vr-cp-n">Day ${d}<small> of ${L.LEARN_DAYS}</small></p>
          ${go}
          <div class="vr-cp-steps" role="img" aria-label="${esc(`Day ${d} of ${L.LEARN_DAYS}`)}">${Array.from({ length: L.LEARN_DAYS }, (_, i) => `<i${i < d ? ' class="is-on"' : ""}></i>`).join("")}</div>
          <p class="vr-cp-why">FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual.</p>
        </section>`;
    }
    const s = L.score(M, L.TODAY, mode), su = L.scoreUsual(M, mode), v = s ? s.value : null;
    const flag = v != null && !!RU.flagToday && RU.flagToday(M);
    const rel = v == null ? null : flag ? "Not read against your usual today" : relOf(v, su);
    /* the week's average only beside a score today: "No score" beside a week's change reads as if today had one */
    const mv = v == null ? null : weekMove(L.scoreMoved(M, mode));
    let bar = "";
    if (su) {
      const a = cpAxis(M, mode, su), p = (x) => Math.max(0, Math.min(100, ((x - a.lo) / (a.hi - a.lo)) * 100));
      const b0 = p(su[0]), b1 = p(su[1]), mid = (b0 + b1) / 2;
      const dot = v != null && !flag;
      bar = `<div class="vr-cp-bar" role="img" aria-label="${esc(`Your usual range, ${su[0]} to ${su[1]}${dot ? `, with today's ${v} on it` : ""}`)}">
          <div class="vr-cp-trk"><i class="vr-cp-band" style="left:${n1(b0)}%;width:${n1(b1 - b0)}%"></i>${dot ? `<i class="vr-cp-dot" style="left:${n1(p(v))}%"></i>` : ""}</div>
          <p class="vr-cp-u" aria-hidden="true"><span style="--mid:${n1(mid)}%">Your usual ${su[0]} to ${su[1]}</span></p>
        </div>`;
    }
    /* the number opens FloraScore's page, one tap from Home as on Score first and Day first; on Free, what membership
       adds, as Day first's chip does */
    const said = [v == null ? `FloraScore not scored today: ${L.NO_SCORE}` : `FloraScore ${v}`, v != null && rel ? (flag ? rel : `${rel}, ${su[0]} to ${su[1]}`) : "", free ? "With Florin membership, see what moves it" : "Open its page"].filter(Boolean).join(". ");
    const num = `<button type="button" class="vr-cp-n${v == null ? " is-none" : ""}" ${free ? 'data-act="pay" data-pay="score"' : 'data-act="idetail" data-k="score"'} aria-label="${esc(said)}"><span>${v == null ? "No score" : v}</span>${ic(free ? "lock" : "chev")}</button>`;
    const words = [rel ? `<span aria-hidden="true">${esc(rel)}</span>` : "", mv ? `<span class="vr-cp-mv" aria-hidden="true">${esc(mv[0])}</span><span class="sr">${esc(mv[1])}</span>` : ""].join("");
    return `<section class="vr-cp-sc" data-a aria-labelledby="${id}">
        ${head}
        ${num}
        ${words ? `<p class="vr-cp-w">${words}</p>` : ""}
        ${go}
        ${bar}
        ${v == null ? `<p class="vr-cp-why">${esc(`${upper1(L.NO_SCORE)}.`)}</p>` : ""}
      </section>`;
  };
  /* a flag or an alarm feature today: Score first's Teal note, the sign and primary care, right under the strip */
  const cpFlag = (M, V) => {
    const H = RU.highlightOf ? RU.highlightOf(M, V.form) : null;
    if (!H || !H.alarm) return "";
    return `<p class="vr-cp-flag" role="note" data-a>${ic("info")}<span>${esc(H.text)}</span></p>`;
  };
  /* a week's days, with what each mark shows, from the calendar's cellOf (the label is its words too). ring is the
     button's class (for the checks and the CSS), mk the day as the Rings week card's renderer takes it */
  const RING = { usual: "is-usual", shifted: "is-shift", unsure: "is-quiet", nocount: "is-quiet", logged: "is-quiet", flag: "is-flag", gap: "is-open", pending: "is-open", plain: "is-before", out: "is-before" };
  const MK = { usual: { logged: true, state: "usual" }, shifted: { logged: true, state: "shifted" }, unsure: { logged: true, state: "unsure" }, nocount: { logged: true, state: "nocount" }, logged: { logged: true, state: "logged" }, flag: { logged: true, state: "flag" }, gap: { logged: false, state: "none" }, pending: { logged: false, pending: true } };
  const cpWeek = (M, V, ws, sel) => {
    const first = firstLog(M);
    return Array.from({ length: 7 }, (_, i) => {
      const d = ws + i, c = cellOf(M, V, d, first, "all");
      return Object.assign(c, { ring: RING[c.out ? "out" : c.shown] || "is-quiet", mk: c.out ? null : MK[c.shown] || null, pick: !c.out && d === sel });
    });
  };
  const monthsOf = (ws) => {
    const a = dateOf(ws), b = dateOf(ws + 6), A = Ut.MONL[a.getMonth()], B = Ut.MONL[b.getMonth()];
    if (a.getMonth() === b.getMonth()) return `${A} ${a.getFullYear()}`;
    return a.getFullYear() === b.getFullYear() ? `${A} to ${B} ${b.getFullYear()}` : `${A} ${a.getFullYear()} to ${B} ${b.getFullYear()}`;
  };
  /* the arrows: a week back while the week before has a day from the first day on, a week on while it has a day up to
     today. Off, an arrow says so (aria-disabled), and a tap on it does nothing */
  const cpCanStep = (M, ws, dir) => (dir < 0 ? ws - 1 >= M.start : ws + 7 <= L.TODAY);
  /* the Rings week card's marks (library/js/look-rings.js), and the phone's theme for their dark rules */
  const ringMarks = () => { const l = (window.FLOOKS || []).find((x) => x && x.id === "rings"); return l && l.marks ? l.marks : null; };
  const themeNow = () => { const r = EXT.api && EXT.api.root; return (r && r.dataset.theme) === "dark" ? "dark" : "light"; };
  const cpIds = (V) => ({ panel: `vr-cp-p${V.uid}`, tab: (d) => `vr-cpw-${V.uid}-${d}` });
  const cpCalendar = (M, V, sel) => {
    const ws = mon0(sel), days = cpWeek(M, V, ws, sel), tid = `vr-cpw-t${V.uid}`, ids = cpIds(V), RM = ringMarks();
    if (!RM) throw new Error("the Rings look's marks are missing");
    const nav = (dir) => {
      const ok = cpCanStep(M, ws, dir), w = ws + dir * 7;
      return `<button type="button" class="vr-cpw-nav" data-act="vr-cp-wk" data-v="${dir}" aria-label="${esc(`${dir < 0 ? "Previous" : "Next"} week${ok ? `, ${RU.spanText(w, w + 6)}` : ""}`)}"${ok ? "" : ' aria-disabled="true"'}>${ic(dir < 0 ? "back" : "chev")}</button>`;
    };
    /* "This week": back to today in one tap, whenever the row is on another week */
    const now = ws !== mon0(L.TODAY) ? `<button type="button" class="vr-cpw-now" data-act="vr-cp-now" aria-label="${esc(`This week, ${RU.spanText(mon0(L.TODAY), mon0(L.TODAY) + 6)}`)}">This week</button>` : "";
    const cell = (c) => {
      const dt = dateOf(c.d), k = c.today ? "Today" : Ut.DOW[dt.getDay()], open = c.ring === "is-open";
      const ring = c.mk ? `${RM.ring(c.mk, 32, 3.6)}<b>${c.dd}</b>` : `<b>${c.dd}</b>`;
      const under = open ? RM.add : c.sym && c.logged && c.ring !== "is-before" ? "<i></i>" : "";
      const inner = `<span class="vr-cpw-k" aria-hidden="true">${esc(k)}</span><span class="vr-cpw-r" aria-hidden="true">${ring}</span><span class="vr-cpw-s" aria-hidden="true">${under}</span>`;
      const cls = ["vr-cpw-d", c.ring, c.today && "is-today", c.out && c.d > L.TODAY && "is-later"].filter(Boolean).join(" ");
      if (c.out) return `<span class="${cls}" role="presentation" aria-hidden="true">${inner}</span>`;
      const label = open ? `${c.label}. Add to ${c.today ? "today" : "this day"}` : c.label;
      return `<button type="button" class="${cls}" role="tab" id="${ids.tab(c.d)}" aria-controls="${ids.panel}" data-act="vr-cp-day" data-v="${c.d}" data-shown="${c.shown}" aria-label="${esc(label)}" aria-selected="${c.pick}"${c.today ? ' aria-current="date"' : ""} tabindex="${c.pick ? 0 : -1}">${inner}</button>`;
    };
    /* the legend: only the marks on show, in the shared words, as the week card's */
    const has = (k) => days.some((c) => c.mk && RM.cls(c.mk) === k);
    const legend = RM.legend(esc, has, days.some((c) => c.sym && c.logged && c.ring !== "is-before"));
    return `<section class="ap-card vr-cpw" data-a aria-labelledby="${tid}">
        <div class="vr-cpw-h">${nav(-1)}<div class="vr-cpw-tw"><h2 class="vr-cpw-t" id="${tid}">${esc(monthsOf(ws))}</h2>${now}</div>${nav(1)}</div>
        <div class="rlk-look lk-rings vr-cpw-lk" data-theme="${themeNow()}"><div class="rg-marks">
          <div class="vr-cpw-g" role="tablist" aria-label="${esc(`Week of ${RU.spanText(ws, ws + 6)}, one tab a day. The arrow keys move between days`)}">${days.map(cell).join("")}</div>
          ${/<li/.test(legend) ? legend : ""}
        </div></div>
      </section>`;
  };
  /* the day picked, as History draws it, as the tabs' panel, then Add: a day with nothing logged already offers it */
  const cpDay = (M, V, sel) => {
    const x = L.day(M, sel), ids = cpIds(V);
    if (!x) return "";
    const add = x.logged ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c vr-cp-add" data-act="plus-day" data-v="${sel}">${ic("plus")}${sel === L.TODAY ? "Add to today" : "Add to this day"}</button>` : "";
    return `<div class="vr-cp-day" id="${ids.panel}" role="tabpanel" aria-labelledby="${ids.tab(sel)}" data-vr-day="${sel}">${RU.historyDay(M, V, x)}${add}</div>`;
  };
  /* the greeting and the profile button, without the date line: the week row shows the date */
  const cpTop = (M, V) => part("top", M, V).replace(/<p class="ap-date">[\s\S]*?<\/p>/, "");
  const compact = (M, V) => {
    cpFollow(M);
    const sel = cpSel(M);
    return `<div class="ap-scr ap-today vr-cp">
      ${[cpTop(M, V), cpStrip(M, V), cpFlag(M, V), cpCalendar(M, V, sel), cpDay(M, V, sel), part("checkin", M, V), part("fine", M, V)].join("\n")}
    </div>`;
  };

  const baseToday = RU.today;
  RU.today = (M, V) => {
    if (!V || V.easy || (V.home !== "day" && V.home !== "compact")) return baseToday(M, V);
    if (V.home === "compact") { try { return compact(M, V); } catch (e) { warn("Compact", e); return baseToday(M, V); } }
    try { return dayFirst(M, V); } catch (e) { warn("Day first", e); return baseToday(M, V); }
  };

  /* ============================== THE CALENDAR ============================== */
  const KEEP = { all: () => true, bm: (e) => e.kind === "bm" || e.kind === "nobm", sym: (e) => e.kind === "sym", meal: (e) => e.kind === "meal", note: (e) => !!e.note };
  const F_NOUN = { bm: "BMs", sym: "symptoms", meal: "meals", note: "notes" };
  const FILTERS = [["all", "All"], ["bm", "BMs"], ["sym", "Symptoms"], ["meal", "Meals"], ["note", "Notes"]];
  /* what a day's mark says. A day reads against the usual from L.facts' state, with two exceptions: a day with a flag
     or an alarm feature is marked for a clinician and never read (the calendar marks every such day, not only today);
     and on Free, a day before the last 7 shows only that it was logged, as Insights stops at 7 days there. The mark is
     RU.dayMark's, the one every screen draws a day with, so a day looks the same here as on Today's card */
  const SHOWN_WORDS = { usual: "within your usual", shifted: "outside your usual", unsure: "not counted", logged: "logged", nocount: "not counted", gap: "nothing logged", pending: "nothing logged yet", plain: "before your first log", flag: "noted for a clinician" };
  const FREE_DAYS = L.RANGES[0];
  const READ = ["usual", "shifted", "unsure"];
  const T0 = dateOf(L.TODAY);
  /* a month as one number (year times 12 plus month), and a calendar date as the model's day number */
  const monthOf = (d) => { const x = dateOf(d); return x.getFullYear() * 12 + x.getMonth(); };
  const dayNum = (y, m, dd) => L.TODAY + Math.round((Date.UTC(y, m, dd) - Date.UTC(T0.getFullYear(), T0.getMonth(), T0.getDate())) / 864e5);
  const monthName = (mi) => `${Ut.MONL[mi % 12]} ${Math.floor(mi / 12)}`;
  const monthDays = (mi) => { const y = Math.floor(mi / 12), m = mi % 12, n = new Date(y, m + 1, 0).getDate(); return Array.from({ length: n }, (_, i) => dayNum(y, m, i + 1)); };
  /* the first day anything was logged: before it, days are plain, never gaps */
  const firstLog = (M) => { const x = M.days.find((y) => y.logged && y.entries.length); return x ? x.d : null; };
  /* which month is shown, and which day is picked: the month asked for (between the start and now), and the day asked
     for if it's in that month, else today in this month, else the month's last day */
  const calView = (M, st) => {
    const lo = monthOf(M.start), hi = monthOf(L.TODAY);
    const m = Math.max(lo, Math.min(hi, st && st.vrM != null ? st.vrM : hi));
    const ds = monthDays(m).filter((d) => d >= M.start && d <= L.TODAY);
    const sel = st && st.vrSel != null && ds.includes(st.vrSel) ? st.vrSel : ds.includes(L.TODAY) ? L.TODAY : ds[ds.length - 1];
    return { m, lo, hi, sel };
  };
  /* one day of the grid: its state from L.facts (data-state, for the checks), what its mark shows (data-shown), the
     facts its mark is drawn from, and its label. P carries the form and the plan */
  const cellOf = (M, P, d, first, F) => {
    const dt = dateOf(d), x = L.day(M, d), today = d === L.TODAY;
    const name = `${Ut.DOWL[dt.getDay()]}, ${Ut.MONL[dt.getMonth()]} ${dt.getDate()}`;
    if (!x) return { d, dd: dt.getDate(), out: true, state: "out", shown: "out", mf: { d, logged: false }, label: `${name}: ${d > L.TODAY ? "still to come" : "before you started"}` };
    const f = L.facts(M, x, P.form);
    const plain = !f.logged && !f.pending && (first == null || d < first);
    const gap = !f.logged && !f.pending && !plain;
    const signs = f.logged ? signsOfDay(x.entries) : [];
    const held = P.plan === "free" && READ.includes(f.state) && d <= L.TODAY - FREE_DAYS;
    const shown = f.pending ? "pending" : plain ? "plain" : gap ? "gap" : signs.length ? "flag" : held ? "logged" : f.state;
    /* the facts the mark is drawn from: a day with a sign is noted for a clinician, a held day only logged */
    const mf = shown === f.state || !f.logged ? f : Object.assign({}, f, { state: shown });
    /* the label: what the mark says (L.dayWhy's words for a day read against the usual), then what was logged */
    const why = M.usual && f.logged && shown === f.state && f.state !== "flag" ? L.dayWhy(M, f, P.form) : null;
    const what = shown === "flag" ? `${andList(signs)} noted for a clinician` : why ? why.sr : SHOWN_WORDS[shown] || "logged";
    const bits = [];
    const syms = Object.keys(f.sym);
    if (f.logged) {
      /* the BM count once: a reason that already says it ("3 BMs, more than usual") isn't followed by it again */
      if (f.bms.length && !new RegExp(`\\b${plural(f.bms.length, "BM")}\\b`).test(what)) bits.push(plural(f.bms.length, "BM"));
      else if (f.nobm && !/\bno BM\b/i.test(what)) bits.push("no BM");
      /* each symptom with its strongest strength; one logged without a strength says so, never mild */
      if (syms.length) bits.push(andList(syms.map((k) => (f.sym[k] ? `${L.STRENGTH[f.sym[k] - 1].toLowerCase()} ${k.toLowerCase()}` : `${k.toLowerCase()} with no strength said`))));
      if (f.meals.length) bits.push(plural(f.meals.length, "meal"));
    }
    const match = F === "all" || (f.logged && x.entries.some(KEEP[F]));
    if (!match && f.logged) bits.push(`no ${F_NOUN[F]} logged`);
    return { d, dd: dt.getDate(), today, pending: f.pending, plain, gap, logged: f.logged, state: f.state, shown, held, signs, dim: F !== "all" && !match, sym: syms.length > 0, mf, label: `${name}${today ? ", today" : ""}: ${[what].concat(bits).join(", ")}` };
  };
  /* a day's button holds the one day mark (RU.dayMark): the date in its circle, the Today ring and word, the Teal
     symptom square. A day before the person's first log, or outside the logs, is its date alone, never named */
  /* the days are tabs with manual activation (the arrow keys move, Enter or Space picks), the day picked their panel */
  const cellHTML = (c, sel, lg, ids) => {
    const cls = ["vr-cal-d", c.out && "is-out", c.out && c.d > L.TODAY && "is-later", c.plain && "is-plain", c.gap && "is-gap", c.pending && "is-pending", c.today && "is-today", c.dim && "is-dim"].filter(Boolean).join(" ");
    const mark = RU.dayMark(c.mf, { before: c.out || c.plain, today: c.today, lg, name: c.label });
    return `<button type="button" class="${cls}" role="tab" id="${ids.tab(c.d)}" aria-controls="${ids.panel}" data-act="vr-cal-day" data-v="${c.d}" data-state="${c.state}" data-shown="${c.shown}" aria-label="${esc(c.label)}" aria-selected="${c.d === sel}"${c.today ? ' aria-current="date"' : ""}${c.out ? ' aria-disabled="true"' : ""} tabindex="${c.d === sel ? 0 : -1}">${mark}</button>`;
  };
  /* the month in words, from the same marks, in the app's shared words */
  const monthSum = (M, m, hi, cells, first) => {
    const n = { usual: 0, shifted: 0, unsure: 0, logged: 0, nocount: 0, flag: 0, gap: 0 };
    cells.forEach((c) => { if (n[c.shown] != null) n[c.shown]++; });
    const so = m === hi ? `${Ut.MONL[m % 12]} so far` : `In ${Ut.MONL[m % 12]}`;
    if (first == null) return "Nothing logged yet. Each day you log gets its mark here.";
    if (!(n.usual + n.shifted + n.unsure + n.logged + n.nocount + n.flag)) return `${so}: nothing logged${n.gap ? ` on ${plural(n.gap, "day")}` : ""}.`;
    const read = n.usual + n.shifted, held = cells.some((c) => c.held), notC = n.unsure + n.nocount;
    const parts = [];
    if (read) parts.push([n.usual, "within your usual"], [n.shifted, "outside your usual"]);
    if (notC) parts.push([notC, "not counted"]);
    if (n.logged) parts.push([n.logged, M.usual && held ? `logged before ${shortDate(L.TODAY - FREE_DAYS + 1)}` : "logged"]);
    if (n.flag) parts.push([n.flag, "noted for a clinician"]);
    if (n.gap) parts.push([n.gap, "with nothing logged"]);
    const tail = !M.usual ? ` Days show as logged until Florin knows your usual, on day ${L.LEARN_DAYS}.` : held ? ` On Free, days are read against your usual for the last ${FREE_DAYS} days.` : "";
    return `${so}: ${parts.map(([k, t], i) => (i ? `${k} ${t}` : `${plural(k, "day")} ${t}`)).join(", ")}.${tail}`;
  };
  /* the legend: only the marks drawn, in the app's shared words, each starting with its own mark (RU.dayKey), three
     lines at most. A date alone (nothing logged) and Today name themselves */
  const legendOf = (M, cells) => {
    const has = (k) => cells.some((c) => c.shown === k);
    const quiet = [has("unsure") || has("nocount") ? "Not counted" : "", has("logged") ? "Logged" : ""].filter(Boolean);
    return [
      has("usual") ? `<span data-k="usual">${RU.dayKey("usual")}Within your usual</span>` : "",
      has("shifted") ? `<span data-k="shift">${RU.dayKey("shift")}Outside your usual</span>` : "",
      quiet.length ? `<span data-k="quiet">${RU.dayKey("quiet")}${quiet.join(" or ")}</span>` : "",
      has("flag") ? `<span data-k="flag">${RU.dayKey("flag")}Noted for a clinician</span>` : "",
      cells.some((c) => c.sym && c.logged && !c.out && !c.plain) ? `<span data-k="sym">${RU.dayKey("sym")}Symptoms</span>` : ""
    ].join("");
  };
  const calendar = (M, V, st) => {
    const F = KEEP[st.filter] ? st.filter : "all";
    const { m, lo, hi, sel } = calView(M, st);
    const y = Math.floor(m / 12), mm = m % 12, first = firstLog(M);
    const lead = (new Date(y, mm, 1).getDay() + 6) % 7;
    const cells = monthDays(m).map((d) => cellOf(M, V, d, first, F));
    /* the Easy version draws its marks at 32px, as its week does */
    const ids = { panel: `vr-cal-p${V.uid}`, tab: (d) => `vr-cal-${V.uid}-${d}` };
    const grid = Array.from({ length: lead }, () => '<span class="vr-cal-x" role="presentation" aria-hidden="true"></span>').join("") + cells.map((c) => cellHTML(c, sel, !!V.easy, ids)).join("");
    const total = M.days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0);
    const since = total ? `${plural(total, "entry", "entries")} since ${shortDate(M.start)}` : `Started ${M.start === L.TODAY ? "today" : `on ${shortDate(M.start)}`}. Nothing logged yet.`;
    const report = `A report of your logs to bring to a clinician: dates, BMs, symptoms${RU.ckOn(V) ? ", meals and check-ins" : " and meals"}. That comes in the next pass.`;
    const tid = `vr-cal-t${V.uid}`;
    const nav = (dir) => { const to = m + dir, ok = to >= lo && to <= hi; return `<button type="button" class="vr-cal-nav" data-act="vr-cal-m" data-v="${dir}" aria-label="${esc(`${dir < 0 ? "Previous" : "Next"} month${ok ? `, ${monthName(to)}` : ""}`)}"${ok ? "" : ' aria-disabled="true"'}>${ic(dir < 0 ? "back" : "chev")}</button>`; };
    /* the day picked: its logs as the list draws them, through the filter; a logged day gets Add to this day too (a
       gap already has it). A filter that leaves the day empty says so */
    const x = L.day(M, sel);
    const es = x && x.logged ? x.entries.filter(KEEP[F]) : [];
    const dayHTML = !x ? "" : x.logged && F !== "all" && !es.length
      ? `<section class="ap-hd" data-a><div class="ap-card-h ap-card-h--pad"><h2>${esc(RU.dayName(sel))}</h2><span class="ap-k">No ${F_NOUN[F]}</span></div><p class="ap-hd-none">No ${F_NOUN[F]} logged this day. All shows everything.</p></section>`
      : RU.historyDay(M, V, x, x.logged ? es : undefined);
    const add = x && x.logged ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c vr-cal-add" data-act="plus-day" data-v="${sel}">${ic("plus")}${sel === L.TODAY ? "Add to today" : "Add to this day"}</button>` : "";
    const legend = legendOf(M, cells);
    /* on Free, a month with days shown only as logged offers what membership adds, over the person's own month */
    const pay = cells.some((c) => c.held) ? `<button type="button" class="ap-link vr-cal-pay" data-act="pay" data-pay="range">${ic("lock")}Every day against your usual, with Florin membership</button>` : "";
    return `<div class="ap-scr ap-hist vr-hist">
      <header class="ap-hist-top" data-a><h1 class="ap-h1">History</h1><p class="ap-hi-sub">${esc(since)}</p></header>
      ${V.plan === "free" ? `<button type="button" class="ap-hist-rep" data-a data-act="pay" data-pay="report">${ic("report")}<span><b>Make a report for your clinician</b><em>With Florin membership</em></span>${ic("lock", "ap-tl-go")}</button>` : `<button type="button" class="ap-hist-rep" data-a data-act="toast" data-msg="${esc(report)}">${ic("report")}<span><b>Make a report for your clinician</b><em>Your logs, so you don't have to remember dates</em></span>${ic("chev", "ap-tl-go")}</button>`}
      <div class="ap-hist-f" role="group" aria-label="Show" data-a>${FILTERS.map(([k, l]) => `<button type="button" class="ap-hi-filter" data-act="hfilter" data-v="${k}" aria-pressed="${F === k}">${l}</button>`).join("")}</div>
      <section class="ap-card vr-cal" data-a aria-labelledby="${tid}">
        <div class="vr-cal-h">${nav(-1)}<h2 class="vr-cal-t" id="${tid}">${esc(monthName(m))}</h2>${nav(1)}</div>
        <p class="vr-cal-sum">${esc(monthSum(M, m, hi, cells, first))}</p>
        <div class="vr-cal-w" aria-hidden="true">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="vr-cal-g" role="tablist" aria-label="${esc(`${monthName(m)}, one tab a day. The arrow keys move between days`)}">${grid}</div>
        ${legend ? `<div class="ap-legend vr-cal-lg">${legend}</div>` : ""}
        ${pay}
      </section>
      <div class="vr-cal-day" id="${ids.panel}" role="tabpanel"${x ? ` aria-labelledby="${ids.tab(sel)}"` : ""}>${dayHTML}${add}</div>
      ${RU.historyNext(M, V)}
      <p class="ap-fine">${esc(`${DISC} If a symptom is new for you or keeps showing up, talk to a clinician.`)}</p>
    </div>`;
  };
  const baseHistory = RU.history;
  RU.history = (M, V, st) => {
    if (!V || V.history !== "calendar") return baseHistory(M, V, st);
    try { return calendar(M, V, st || {}); } catch (e) { warn("the calendar", e); return baseHistory(M, V, st); }
  };

  /* ============================== TAPS AND KEYS ============================== */
  const hist = (api) => (api.S.hist = api.S.hist || { filter: "all", n: 14 });
  /* a tile on Today saves at once (the core's one-tap log), then focus lands on the new row */
  EXT.acts["vr-quick"] = (b, api) => {
    const before = new Set(todayOf(api.M()).map((e) => e.id));
    api.core("quick-bm", b);
    const e = todayOf(api.M()).find((x) => !before.has(x.id));
    if (e && !api.top()) api.focusSel(`[data-act="edit"][data-id="${CSS.escape(e.id)}"]`);
  };
  /* Compact: a day picked (drawn under the week, focus kept on it, and said), a week stepped (the day picked moves with
     it, to the same weekday, kept between the first day and today), Insights, and the Today tab back on today */
  const cpSet = (api, sel) => { api.S.vrCp = { M: api.M(), sel }; };
  const cpSay = (M, d) => { const x = L.day(M, d), n = x && x.logged ? x.entries.length : 0; return `${RU.dayName(d)}: ${x && x.logged ? (n ? plural(n, "entry", "entries") : "nothing logged yet") : "nothing logged"}, shown under the week.`; };
  const cpPick = (api, d, focus) => {
    const M = api.M();
    if (!L.day(M, d)) return false;
    const ws0 = mon0(cpSel(M));
    cpSet(api, d);
    api.renderTab(true);
    if (focus) api.focusSel(focus === true ? `.vr-cpw-d[data-v="${d}"]` : focus);
    api.say(mon0(d) === ws0 ? cpSay(M, d) : `${monthsOf(mon0(d))}, week of ${RU.spanText(mon0(d), mon0(d) + 6)}. ${cpSay(M, d)}`);
    return true;
  };
  /* a day with nothing logged (its "+ Add") is picked and opens plus for that day, as the week card's Add does */
  EXT.acts["vr-cp-day"] = (b, api) => {
    const d = +b.dataset.v;
    if (!cpPick(api, d, true)) return;
    const x = L.day(api.M(), d), f = x ? L.facts(api.M(), x, api.V().form) : null;
    if (f && !f.logged) api.act("plus-day", { dataset: { v: String(d) } });
  };
  /* "This week": back to today, focus on it */
  EXT.acts["vr-cp-now"] = (b, api) => { cpPick(api, L.TODAY, true); };
  EXT.acts["vr-cp-wk"] = (b, api) => {
    const M = api.M(), dir = +b.dataset.v || 0, sel = cpSel(M), ws = mon0(sel);
    if (!dir || !cpCanStep(M, ws, dir)) return;
    const w = ws + dir * 7, to = Math.max(Math.max(w, M.start), Math.min(w + 6, L.TODAY, sel + dir * 7));
    /* focus stays on the arrow while it can go on, else lands on the day picked */
    const arrow = `[data-act="vr-cp-wk"][data-v="${dir}"]`;
    cpPick(api, to, cpCanStep(M, w, dir) ? arrow : true);
  };
  EXT.acts["vr-cp-ins"] = (b, api) => { api.go("insights"); };
  const prevTab = EXT.acts.tab;
  EXT.acts.tab = (b, api, e) => {
    if (b && b.dataset && b.dataset.tab === "today" && api.S.vrCp) {
      const was = api.S.tab === "today" && cpSel(api.M()) !== L.TODAY;
      api.S.vrCp = null; api.S.vrCpSeen = null;
      if (was) api.renderTab(true);
    }
    return prevTab ? prevTab(b, api, e) : api.core("tab", b, e);
  };
  /* a day: picked, drawn under the month, focus kept on it, and said */
  EXT.acts["vr-cal-day"] = (b, api) => {
    const d = +b.dataset.v;
    if (!L.day(api.M(), d)) return;
    const h = hist(api);
    h.vrSel = d; h.vrM = monthOf(d);
    api.renderTab(true);
    api.focusSel(`.vr-cal-d[data-v="${d}"]`);
    const x = L.day(api.M(), d), n = x && x.logged ? x.entries.filter(KEEP[KEEP[h.filter] ? h.filter : "all"]).length : 0;
    api.say(`${RU.dayName(d)}: ${x && x.logged ? plural(n, "entry", "entries") : "nothing logged"}, shown under the calendar.`);
  };
  /* the previous or next month, between the month the person started and this one */
  const toMonth = (api, to, focus, day) => {
    const M = api.M(), lo = monthOf(M.start), hi = monthOf(L.TODAY);
    if (to < lo || to > hi) return false;
    const h = hist(api);
    h.vrM = to;
    /* a key that crosses into the month picks the day it lands on, when that day has logs to show */
    if (day != null && L.day(M, day)) h.vrSel = day;
    else if (h.vrSel == null || monthOf(h.vrSel) !== to) h.vrSel = null;
    api.renderTab(true);
    if (focus) api.focusSel(focus);
    const sum = api.layer.querySelector(".vr-cal-sum");
    api.say(`${monthName(to)}. ${sum ? sum.textContent : ""}`);
    return true;
  };
  EXT.acts["vr-cal-m"] = (b, api) => {
    const h = hist(api), M = api.M();
    const cur = calView(M, h).m;
    toMonth(api, cur + (+b.dataset.v || 0), `[data-act="vr-cal-m"][data-v="${b.dataset.v}"]`);
  };
  /* arrow keys move between days (a week up or down), Home and End to the week's ends, Page Up and Page Down by a
     month. Inside a month focus moves and Enter or Space picks; a key that crosses into another month picks the day it
     lands on. Keys stay between the first day and today, so focus never lands on a day that can't be picked. Only one
     day is in the tab order at a time */
  /* Compact's week: Left and Right move between days, Home and End to the week's ends, Page Up and Page Down a week back
     and on. Inside the week focus moves and Enter or Space picks; a key that crosses into another week picks the day it
     lands on. Keys stay between the first day and today. Only one day is in the tab order at a time */
  document.addEventListener("keydown", (e) => {
    const b = e.target && e.target.closest && e.target.closest(".vr-cpw-d");
    const api = EXT.api;
    if (!b || !api || !api.root || !api.root.contains(b) || e.altKey || e.metaKey || e.ctrlKey) return;
    const d = +b.dataset.v, dow = (dateOf(d).getDay() + 6) % 7;
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -dow, End: 6 - dow, PageUp: -7, PageDown: 7 }[e.key];
    if (step == null) return;
    e.preventDefault();
    try {
      const M = api.M(), to = Math.max(M.start, Math.min(L.TODAY, d + step));
      if (to === d) return;
      const row = b.closest(".vr-cpw-g"), there = row && row.querySelector(`.vr-cpw-d[data-v="${to}"]`);
      if (there) {
        row.querySelectorAll('.vr-cpw-d[tabindex="0"]').forEach((x) => x.setAttribute("tabindex", "-1"));
        there.setAttribute("tabindex", "0");
        there.focus({ preventScroll: true });
        return;
      }
      cpPick(api, to, true);
    } catch (err) { warn("a key in Compact's week", err); }
  });
  document.addEventListener("keydown", (e) => {
    const b = e.target && e.target.closest && e.target.closest(".vr-cal-d");
    const api = EXT.api;
    if (!b || !api || !api.root || !api.root.contains(b) || e.altKey || e.metaKey || e.ctrlKey) return;
    const d = +b.dataset.v, dow = (dateOf(d).getDay() + 6) % 7;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -dow, End: 6 - dow }[e.key];
    let to = null;
    if (step != null) to = d + step;
    else if (e.key === "PageUp" || e.key === "PageDown") {
      const x = dateOf(d), mi = monthOf(d) + (e.key === "PageUp" ? -1 : 1), y = Math.floor(mi / 12), m = mi % 12;
      to = dayNum(y, m, Math.min(x.getDate(), new Date(y, m + 1, 0).getDate()));
    } else return;
    e.preventDefault();
    try {
      const M = api.M();
      to = Math.max(M.start, Math.min(L.TODAY, to));
      if (to === d) return;
      const grid = b.closest(".vr-cal-g");
      const there = grid && grid.querySelector(`.vr-cal-d[data-v="${to}"]`);
      if (there) {
        grid.querySelectorAll('.vr-cal-d[tabindex="0"]').forEach((x) => x.setAttribute("tabindex", "-1"));
        there.setAttribute("tabindex", "0");
        there.focus({ preventScroll: true });
        return;
      }
      toMonth(api, monthOf(to), `.vr-cal-d[data-v="${to}"]`, to);
    } catch (err) { warn("a calendar key", err); }
  });

  /* ============================== THE PAGE: screens, keys, notes ============================== */
  EXT.screens.push(["Tabs", [["home-day", "Home: Day first"], ["home-compact", "Home: Compact"], ["hist-cal", "History: Calendar"]]]);
  /* the screens set their own decision (the page's toggles follow) and no other. The Easy version has its own Today,
     so with Easy on, Day first is picked but Easy stays, and a toast says why Today looks as it does */
  EXT.opens["home-day"] = (api) => {
    if (api.V().home !== "day") api.set("home", "day");
    if (api.V().easy) api.toast("The Easy version is on, and it has its own Today. Turn Easy off on the left to see Day first.");
    api.layer.scrollTop = 0;
  };
  /* Compact opens on today, whatever day was picked last */
  EXT.opens["home-compact"] = (api) => {
    const had = !!api.S.vrCp;
    api.S.vrCp = null; api.S.vrCpSeen = null;
    if (api.V().home !== "compact") api.set("home", "compact");
    else if (had) api.renderTab(true);
    if (api.V().easy) api.toast("The Easy version is on, and it has its own Today. Turn Easy off on the left to see Compact.");
    api.layer.scrollTop = 0;
  };
  /* a new Home starts on today */
  EXT.onSet.push((k, v, api) => {
    if (k !== "home" || !api || !api.S) return;
    api.S.vrCpSeen = null;
    if (!api.S.vrCp) return;
    const was = cpSel(api.M()) !== L.TODAY;
    api.S.vrCp = null;
    if (was && v === "compact" && api.S.tab === "today" && !api.V().easy) api.renderTab(true);
  });
  /* the calendar opens on this month and today, whatever month was looked at last */
  EXT.opens["hist-cal"] = (api) => {
    if (api.V().history !== "calendar") api.set("history", "calendar");
    const h = hist(api);
    h.vrM = null; h.vrSel = null;
    api.S.tab = "history"; api.renderTab(true); api.layer.scrollTop = 0;
  };
  const prevKeyToday = EXT.keys["tab:today"], prevKeyHist = EXT.keys["tab:history"];
  EXT.keys["tab:today"] = (o) => { const S = o && o.st; if (S && S.home === "day" && !S.easy) return "home-day"; if (S && S.home === "compact" && !S.easy) return "home-compact"; return prevKeyToday ? prevKeyToday(o) : null; };
  EXT.keys["tab:history"] = (o) => { const S = o && o.st; if (S && S.history === "calendar") return "hist-cal"; return prevKeyHist ? prevKeyHist(o) : null; };

  /* ---------- notes for Will. Oct 28: plain, and each decision in the decision sheet's shape (refresh-app.js,
     THE DECISIONS, has the fields; the page gives the question and what it decides) ---------- */
  /* the data style picked, by name, when one is drawn (the looks module says which) */
  const lookName = (P) => {
    try {
      const id = RU.lookOf ? RU.lookOf(P) : null;
      if (!id) return null;
      const l = (window.FLOOKS || []).find((x) => x && x.id === id);
      return (l && l.name) || id;
    } catch (e) { return null; }
  };
  const homeDecision = () => ({
    opts: [
      { v: "score", is: "Today opens on the FloraScore card, with the person's usual range and one sentence on what stood out today, then today's logs and the last 7 days.", why: "One number for the day, read against the person's own usual, is the quickest thing to check.", not: `There's no score before day ${L.LEARN_DAYS}, and on a rough evening a score inside the usual range can read as if nothing happened.` },
      { v: "day", is: "Today opens on the date and today's logs in time order, with the one that stood out marked, and FloraScore as a small chip at the top.", why: "It suits people who open the app to log, and it looks the same from day 1, before Florin has a score.", not: "FloraScore, the number at the centre of Florin, is easy to miss." },
      { v: "compact", is: "Today opens on a short FloraScore strip, then this week as a row of days with arrows for earlier weeks, then the logs of the day picked, today's first.", why: "It's built for getting around, as the current app's home is: the week is in view, and any day, with its logs and a way to add to it, is one tap away.", not: "No sentence says what stood out today or how the week went, so a day outside the usual shows only as a Gold ring until the person taps it." }
    ],
    rec: { v: "score", text: "We recommend Score first.", why: "FloraScore is the centre of Florin, so it should come first, and its sentence says what stood out today, which Compact leaves out." },
    open: "Should Compact replace Score first as the default? The focus test puts the two side by side.",
    try: "Switch it, then look at the Today tab. The demo opens on Score first. On Compact, tap a day in the week to see its logs, or an arrow for an earlier week."
  });
  /* "your usual" is Plum, and Ray on dark (DESIGN.md): the notes name the colour the calendar draws in the phone's theme */
  const usualC = (P) => (P && P.theme === "dark" ? "Ray" : "Plum");
  const historyDecision = (M, P) => ({
    opts: [
      { v: "list", is: "Every day, newest first, each opening with its day mark and one line on how it sat against the usual, then its logs; a day with nothing logged is a gap with Add to this day.", why: "Every log is right there to read, and filling in a missed day takes one tap.", not: "After a few months it's a long scroll, so finding a month's gaps and days outside the usual takes many screens." },
      { v: "calendar", is: `A month on one screen: a ${usualC(P)} circle for a day within the person's usual, a Gold circle for a day outside it, and the date alone for a day with nothing logged.`, why: "A whole month fits on one screen, so gaps and days outside the usual show at a glance.", not: "Seeing a day's logs takes a tap, and a month of circles says less than the list about what each day held." }
    ],
    rec: { v: "calendar", text: "We recommend Calendar.", why: "One screen a month replaces a long scroll, and a tapped day reads just as it does in the list." },
    open: "Keep a switch on History so a person can pick the list or the calendar?",
    try: "Switch it, then open the History tab and tap a day. The demo opens on Calendar."
  });
  const homeScreenNote = (M, P) => {
    const look = lookName(P);
    return {
      t: "Home: Day first",
      lede: `Today leads with the day: the date with a small FloraScore chip, today's logs in time order with the one that stood out marked, a row to log from, then one sentence on what stood out and the last 7 days.${look ? ` In the ${look} data style, only the week takes the style.` : ""}`
    };
  };
  const compactScreenNote = (M, P) => {
    const look = lookName(P);
    return {
      t: "Home: Compact",
      lede: `Today leads with getting around: a short FloraScore strip, then this week as a row of days with arrows for earlier weeks: ${usualC(P)} within the person's usual, Gold outside it, an empty ring with Add for a day with nothing logged. Tap a day for its logs, or the score for its page. A past day noted for a clinician is Teal here, as on the calendar; Score first's week card still reads it.${look ? ` The ${look} data style shows on Insights.` : ""}`
    };
  };
  const calScreenNote = (M, P) => {
    const look = lookName(P);
    return {
      t: "History: Calendar",
      lede: `A month on one screen, each day marked as on Today's card: a ${usualC(P)} circle within the person's usual, a Gold circle outside it, a grey circle for a day logged but not counted, and the date alone for a day with nothing logged. A Teal ring marks a day noted for a clinician, and a Teal square a day with symptoms. Tap a day to see its logs.${P.plan === "free" ? ` On Free, only the last ${FREE_DAYS} days are read against the usual.` : ""}${look ? ` Today's week is in the ${look} style, so its marks differ.` : ""}`
    };
  };
  EXT.decisions.home = homeDecision;
  EXT.decisions.history = historyDecision;
  EXT.notes["home-day"] = homeScreenNote;
  EXT.notes["home-compact"] = compactScreenNote;
  EXT.notes["hist-cal"] = calScreenNote;
  /* if a later module takes over a tab's key without handing on to this one, the notes still follow the decision */
  const prevNoteToday = EXT.notes.today, prevNoteHist = EXT.notes.history;
  EXT.notes.today = (M, P) => (P && P.home === "day" && !P.easy ? homeScreenNote(M, P) : P && P.home === "compact" && !P.easy ? compactScreenNote(M, P) : prevNoteToday ? prevNoteToday(M, P) : undefined);
  EXT.notes.history = (M, P) => (P && P.history === "calendar" ? calScreenNote(M, P) : prevNoteHist ? prevNoteHist(M, P) : undefined);

  /* for the checks (work/behave.js): the ranking, the sentence and the month, as the screens use them */
  window.FLORIN_VARIANTS = { standouts, dayLine, calView, cellOf, monthOf, monthDays, firstLog, cpSel, mon0, cpCanStep, weekMove };
})();
