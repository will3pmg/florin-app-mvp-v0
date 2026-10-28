/* Florin app refresh: the Home decision's Day first (V.home "day") and the History decision's Calendar
   (V.history "calendar"). A feature module: it registers into window.FLORIN_EXT and wraps RU.today and RU.history
   (CLAUDE.md, Extension hooks), and never edits a core file.
   - Day first: the date with a small FloraScore ring that opens its detail; today's logs in time order, with the one
     that stood out most marked; a row to log from that follows the BM logging decision; one sentence that leads with
     what stood out, gives FloraScore against yesterday and (with membership) what that log did to it, scored with and
     without it; then the week and the check-in. A flag leads with the Teal note and no score reading, and the chip keeps
     its number but reads it against nothing. The Easy version takes precedence over it.
   - Calendar: a month of days, each marked from L.facts. Shared with As built's week card: Plum filled within the
     usual (Ray in dark), a Gold ring for a shift, a struck date for a gap. Its own: a dash for logs but nothing on BMs,
     a Teal ring for a day with a flag (never read); today ringed. Small symptom ticks (filled by strength, hollow only
     when no strength was said) and meal ticks. On Free, days before the last 7 show only as logged.
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
    if (!s || s.value == null) return "No FloraScore yet today: it needs a BM logged on 2 of your last 3 days.";
    const dv = y && y.value != null ? s.value - y.value : null;
    const head = dv == null ? `FloraScore is ${s.value}. Yesterday has no FloraScore to compare it with` : !dv ? `FloraScore is ${s.value}, the same as yesterday` : `FloraScore is ${s.value}, ${Math.abs(dv)} ${dv > 0 ? "higher" : "lower"} than yesterday's ${y.value}`;
    if (V.plan === "free" || !N || !N.e || !NOUN[N.e.kind]) return `${head}.`;
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
  const relOf = (v, su) => (v == null || !su ? null : v < su[0] ? (su[0] - v >= 6 ? "Below your usual range" : "A little below your usual range") : v > su[1] ? (v - su[1] >= 6 ? "Above your usual range" : "A little above your usual range") : "Within your usual range");

  /* 1. the date, and a compact FloraScore chip that opens its detail (the paywall on Free, as the hero does). On Free
     before day 14 there's no score to sell yet, so the chip is plain, as the core's learning card is. On a day with a
     flag or an alarm feature the chip keeps L.score's number (the detail it opens shows the same one) but reads it
     against nothing: the card under it routes the flagged log to primary care, and a flagged log is never read through
     the score */
  const FLAG_WORD = "Not read against your usual today: a log is noted for a clinician";
  const scoreChip = (M, V, list) => {
    const free = V.plan === "free";
    const act = free ? 'data-act="pay" data-pay="score"' : 'data-act="idetail" data-k="score"';
    const go = free ? "With Florin membership, see what moves it" : "Open the detail";
    let ring, num, word, said;
    if (!M.usual) {
      const d = L.learnDay(M);
      ring = Math.round((d / L.LEARN_DAYS) * 100); num = ""; word = `Starts on day ${L.LEARN_DAYS}. Today is day ${d}.`;
      said = [`FloraScore starts on day ${L.LEARN_DAYS}, once Florin knows your usual`, `Today is day ${d} of ${L.LEARN_DAYS}`];
    } else {
      const s = L.score(M, L.TODAY, V.form), su = L.scoreUsual(M, V.form), v = s ? s.value : null;
      const flag = (list || standouts(M, V.form)).some((x) => x.kind === "alarm");
      ring = v == null ? 0 : v; num = v == null ? "No score" : String(v);
      word = v == null ? "Not scored today: it needs a BM logged on 2 of your last 3 days" : flag ? FLAG_WORD : relOf(v, su) || "";
      said = v == null ? [`FloraScore not scored today: it needs a BM logged on 2 of your last 3 days`] : flag ? [`FloraScore ${v}`, FLAG_WORD] : [`FloraScore ${v}`, word && su ? `${word}, ${su[0]} to ${su[1]}` : word];
    }
    const svg = C && C.ring ? C.ring({ value: ring, size: 24, stroke: 3 }) : "";
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
  const baseToday = RU.today;
  RU.today = (M, V) => {
    if (!V || V.home !== "day" || V.easy) return baseToday(M, V);
    try { return dayFirst(M, V); } catch (e) { warn("Day first", e); return baseToday(M, V); }
  };

  /* ============================== THE CALENDAR ============================== */
  const KEEP = { all: () => true, bm: (e) => e.kind === "bm" || e.kind === "nobm", sym: (e) => e.kind === "sym", meal: (e) => e.kind === "meal", note: (e) => !!e.note };
  const F_NOUN = { bm: "BMs", sym: "symptoms", meal: "meals", note: "notes" };
  const FILTERS = [["all", "All"], ["bm", "BMs"], ["sym", "Symptoms"], ["meal", "Meals"], ["note", "Notes"]];
  /* what a day's mark says. A day reads against the usual from L.facts' state, with three exceptions: a day with a flag
     or an alarm feature is marked for a clinician and never read; on Free, a day before the last 7 shows only that it
     was logged, as Insights stops at 7 days there; and a day with logs but nothing on BMs gets its own mark */
  const SHOWN_WORDS = { usual: "within your usual", shifted: "outside your usual", unsure: "could be either", logged: "logged", nocount: "nothing logged on BMs", gap: "nothing logged", pending: "nothing logged yet", plain: "before your first log" };
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
  /* one day of the grid: its state from L.facts (data-state, for the checks), what its mark shows (data-shown), its
     label, its ticks. P carries the form and the plan */
  const cellOf = (M, P, d, first, F) => {
    const dt = dateOf(d), x = L.day(M, d), today = d === L.TODAY;
    const name = `${Ut.DOWL[dt.getDay()]}, ${Ut.MONL[dt.getMonth()]} ${dt.getDate()}`;
    if (!x) return { d, dd: dt.getDate(), out: true, state: "out", shown: "out", label: `${name}: ${d > L.TODAY ? "still to come" : "before you started"}` };
    const f = L.facts(M, x, P.form);
    const plain = !f.logged && !f.pending && (first == null || d < first);
    const gap = !f.logged && !f.pending && !plain;
    const signs = f.logged ? signsOfDay(x.entries) : [];
    const held = P.plan === "free" && READ.includes(f.state) && d <= L.TODAY - FREE_DAYS;
    const shown = f.pending ? "pending" : plain ? "plain" : gap ? "gap" : signs.length ? "flag" : held ? "logged" : f.state;
    const what = shown === "flag" ? `${andList(signs)} noted for a clinician` : SHOWN_WORDS[shown];
    const bits = [];
    const syms = Object.keys(f.sym);
    if (f.logged) {
      if (f.bms.length) bits.push(plural(f.bms.length, "BM"));
      else if (f.nobm) bits.push("no BM");
      /* each symptom with its strongest strength, as the tick draws it; one logged without a strength says so, never mild */
      if (syms.length) bits.push(andList(syms.map((k) => (f.sym[k] ? `${L.STRENGTH[f.sym[k] - 1].toLowerCase()} ${k.toLowerCase()}` : `${k.toLowerCase()} with no strength said`))));
      if (f.meals.length) bits.push(plural(f.meals.length, "meal"));
    }
    const match = F === "all" || (f.logged && x.entries.some(KEEP[F]));
    if (!match && f.logged) bits.push(`no ${F_NOUN[F]} logged`);
    const s = syms.length ? Math.max(...syms.map((k) => f.sym[k] || 0)) : null;
    return { d, dd: dt.getDate(), today, pending: f.pending, plain, gap, logged: f.logged, state: f.state, shown, held, signs, dim: F !== "all" && !match, sym: s, meal: f.meals.length > 0, label: `${name}${today ? ", today" : ""}: ${[what].concat(bits).join(", ")}` };
  };
  const cellHTML = (c, sel) => {
    const cls = ["vr-cal-d", c.out && "is-out", c.plain && "is-plain", c.gap && "is-gap", c.pending && "is-pending", c.today && "is-today", c.dim && "is-dim"].filter(Boolean).join(" ");
    const ticks = `${c.sym != null ? `<i class="vr-t vr-t--sym vr-t--s${c.sym}"></i>` : ""}${c.meal ? '<i class="vr-t vr-t--meal"></i>' : ""}`;
    return `<button type="button" class="${cls}" data-act="vr-cal-day" data-v="${c.d}" data-state="${c.state}" data-shown="${c.shown}" aria-label="${esc(c.label)}" aria-pressed="${c.d === sel}"${c.today ? ' aria-current="date"' : ""}${c.out ? ' aria-disabled="true"' : ""} tabindex="${c.d === sel ? 0 : -1}"><span class="vr-cal-n" aria-hidden="true">${c.dd}</span><i class="vr-cal-mk" aria-hidden="true"></i><span class="vr-cal-ts" aria-hidden="true">${ticks}</span></button>`;
  };
  /* the month in words, from the same marks */
  const monthSum = (M, m, hi, cells, first) => {
    const n = { usual: 0, shifted: 0, unsure: 0, logged: 0, nocount: 0, flag: 0, gap: 0 };
    cells.forEach((c) => { if (n[c.shown] != null) n[c.shown]++; });
    const so = m === hi ? `${Ut.MONL[m % 12]} so far` : `In ${Ut.MONL[m % 12]}`;
    if (first == null) return "Nothing logged yet. Each day you log gets its mark here.";
    if (!(n.usual + n.shifted + n.unsure + n.logged + n.nocount + n.flag)) return `${so}: nothing logged${n.gap ? `, ${plural(n.gap, "day")} left as gaps` : ""}.`;
    const read = n.usual + n.shifted + n.unsure, held = cells.some((c) => c.held);
    const parts = [];
    if (read) { parts.push([n.usual, "within your usual"], [n.shifted, "outside it"]); if (n.unsure) parts.push([n.unsure, "that could be either"]); }
    if (n.logged) parts.push([n.logged, read && held ? `logged before ${shortDate(L.TODAY - FREE_DAYS + 1)}` : "logged"]);
    if (n.nocount) parts.push([n.nocount, "with nothing logged on BMs"]);
    if (n.flag) parts.push([n.flag, "noted for a clinician"]);
    if (n.gap) parts.push([n.gap, "with nothing logged"]);
    const tail = !M.usual ? ` Marks against your usual start on day ${L.LEARN_DAYS}.` : held ? ` On Free, marks against your usual cover the last ${FREE_DAYS} days.` : "";
    return `${so}: ${parts.map(([k, t], i) => (i ? `${k} ${t}` : `${plural(k, "day")} ${t}`)).join(", ")}.${tail}`;
  };
  /* the legend draws each mark with the same markup the days use, so the two can't drift */
  const legendOf = (M, cells) => {
    const has = (k) => cells.some((c) => c.shown === k);
    const mk = (k, words) => (has(k) ? `<span data-shown="${k}"><i class="vr-cal-mk" aria-hidden="true"></i>${words}</span>` : "");
    const gapDay = cells.find((c) => c.shown === "gap");
    return [
      mk("usual", "Within your usual"),
      mk("shifted", "Outside it"),
      mk("unsure", "Could be either"),
      mk("logged", "Logged"),
      mk("nocount", "Nothing logged on BMs"),
      mk("flag", "Noted for a clinician"),
      gapDay ? `<span data-shown="gap"><span class="vr-cal-n" aria-hidden="true">${gapDay.dd}</span>Nothing logged</span>` : "",
      cells.some((c) => c.today) ? `<span><i class="vr-lg-today" aria-hidden="true"></i>Today</span>` : "",
      cells.some((c) => c.sym > 0) ? `<span><i class="vr-t vr-t--sym vr-t--s1" aria-hidden="true"></i><i class="vr-t vr-t--sym vr-t--s3" aria-hidden="true"></i>Symptoms, milder to stronger</span>` : "",
      /* a day whose symptoms were all logged without a strength: the only hollow tick, never read as mild */
      cells.some((c) => c.sym === 0) ? `<span><i class="vr-t vr-t--sym vr-t--s0" aria-hidden="true"></i>Symptoms, strength not said</span>` : "",
      cells.some((c) => c.meal) ? `<span><i class="vr-t vr-t--meal" aria-hidden="true"></i>Meal logged</span>` : ""
    ].join("");
  };
  const calendar = (M, V, st) => {
    const F = KEEP[st.filter] ? st.filter : "all";
    const { m, lo, hi, sel } = calView(M, st);
    const y = Math.floor(m / 12), mm = m % 12, first = firstLog(M);
    const lead = (new Date(y, mm, 1).getDay() + 6) % 7;
    const cells = monthDays(m).map((d) => cellOf(M, V, d, first, F));
    const grid = Array.from({ length: lead }, () => '<span class="vr-cal-x" aria-hidden="true"></span>').join("") + cells.map((c) => cellHTML(c, sel)).join("");
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
        <div class="vr-cal-g" role="group" aria-label="${esc(`${monthName(m)}, one button a day. The arrow keys move between days`)}">${grid}</div>
        ${legend ? `<div class="ap-legend vr-cal-lg">${legend}</div>` : ""}
        ${pay}
      </section>
      <div class="vr-cal-day">${dayHTML}${add}</div>
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
  EXT.built.home = ["day"];
  EXT.built.history = ["calendar"];
  EXT.screens.push(["Tabs", [["home-day", "Home: Day first"], ["hist-cal", "History: Calendar"]]]);
  /* the screens set their own decision (the page's toggles follow) and no other. The Easy version has its own Today,
     so with Easy on, Day first is picked but Easy stays, and a toast says why Today looks as it does */
  EXT.opens["home-day"] = (api) => {
    if (api.V().home !== "day") api.set("home", "day");
    if (api.V().easy) api.toast("The Easy version is on, and it has its own Today. Turn Easy off on the left to see Day first.");
    api.layer.scrollTop = 0;
  };
  /* the calendar opens on this month and today, whatever month was looked at last */
  EXT.opens["hist-cal"] = (api) => {
    if (api.V().history !== "calendar") api.set("history", "calendar");
    const h = hist(api);
    h.vrM = null; h.vrSel = null;
    api.S.tab = "history"; api.renderTab(true); api.layer.scrollTop = 0;
  };
  const prevKeyToday = EXT.keys["tab:today"], prevKeyHist = EXT.keys["tab:history"];
  EXT.keys["tab:today"] = (o) => { const S = o && o.st; if (S && S.home === "day" && !S.easy) return "home-day"; return prevKeyToday ? prevKeyToday(o) : null; };
  EXT.keys["tab:history"] = (o) => { const S = o && o.st; if (S && S.history === "calendar") return "hist-cal"; return prevKeyHist ? prevKeyHist(o) : null; };

  /* ---------- notes for Will, every figure from the person on the phone ---------- */
  const markWord = (N, mode) => {
    if (!N) return "";
    const t = T(N.e.t);
    if (N.kind === "alarm") return `the ${t} log (${lower1(N.alarm.sign)}, a clinician note)`;
    if (N.kind === "sym") return `the ${t} ${lower1(RU.entryText(N.e, mode).title)} (${N.s ? L.STRENGTH[N.s - 1].toLowerCase() : "strength not said"})`;
    if (N.kind === "none") return `the No BM logged at ${t}`;
    return `the ${t} BM (${lower1(N.chip)})`;
  };
  /* the list shows 14 days, and each Show earlier days adds 14: the taps it takes to reach a day */
  const listTapsTo = (M, d) => (M.days.length <= 14 ? 0 : Math.max(0, Math.ceil((L.TODAY - d + 1 - 14) / 14)));
  const cal = (M, P) => {
    const lo = monthOf(M.start), hi = monthOf(L.TODAY);
    const total = M.days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0);
    const first = firstLog(M);
    const cells = monthDays(hi).map((d) => cellOf(M, P, d, first, "all"));
    return { lo, hi, total, tapsStart: listTapsTo(M, M.start), monthTaps: hi - lo, months: hi - lo + 1, sum: monthSum(M, hi, hi, cells, first), gaps: M.days.filter((x) => x.d < L.TODAY && !x.logged && first != null && x.d > first).length };
  };
  const reachLine = (M, Q) => (Q.tapsStart
    ? `${M.P.name}'s ${plural(Q.total, "entry", "entries")} since ${shortDate(M.start)} come 14 days at a time in the list: reaching ${shortDate(M.start)}, the first day, takes ${plural(Q.tapsStart, "tap")} of Show earlier days; on the calendar, ${Q.monthTaps ? `${plural(Q.monthTaps, "tap")} of Previous month` : "it's in this month"}.`
    : `${M.P.name} has ${M.days.length === 1 ? "one day" : `${M.days.length} days`} so far, so the list shows them all without Show earlier days. The list adds a tap of Show earlier days for every 14 days; the calendar adds one screen a month.`);
  /* the data style picked, by name, when one is drawn (the looks module says which) */
  const lookName = (P) => {
    try {
      const id = RU.lookOf ? RU.lookOf(P) : null;
      if (!id) return null;
      const l = (window.FLOOKS || []).find((x) => x && x.id === id);
      return (l && l.name) || id;
    } catch (e) { return null; }
  };
  const lineQuote = (M, P, list) => { const t = dayLine(M, P, list); return t ? `"${t}"` : "nothing after the Teal note to primary care, which leads the card."; };
  /* the calendar's marks: what it shares with As built's week card on Today (refresh-ui.js weekCard), and what is its
     own. The week card's dash is a No BM log; the calendar reads a No BM day as zero BMs and keeps its dash for
     a day with logs but nothing on BMs. With a data style or the Easy version on, Today's week is drawn in that style */
  const MARKS = "the marks As built's week card on Today uses: Plum filled within the usual (Ray in dark), a Gold ring outside it, and a struck-through date for a day with nothing logged. Two marks are the calendar's own: a dash for a day with logs but nothing on BMs (on the week card a dash is a No BM log; the calendar reads a No BM day as zero BMs, outside the usual once there is one), and a Teal ring for a day with a flag or an alarm feature, noted for a clinician and never read. Today is ringed";
  const marksStyle = (P) => {
    const look = lookName(P);
    if (!look) return "";
    const rings = RU.lookOf && RU.lookOf(P) === "rings";
    return ` With ${P.easy ? "the Easy version" : `the ${look} data style`} on, Today's week is drawn in that style, so its marks differ from the calendar's.${rings ? " In Rings a Teal dot under a day means symptoms; on the calendar a Teal dot means a meal was logged." : ""}`;
  };

  /* Score first's sentence as the core draws it now, and how far it is from the recommendation: whether it leads with
     the log Day first marks, and whether it says what that log did to FloraScore */
  const scoreFirstNow = (M, P, list) => {
    const H = typeof RU.highlightOf === "function" ? RU.highlightOf(M, P.form) : { text: RU.highlight(M, P.form), N: null };
    const N = list[0], leads = !!(N && H.N && H.N.e === N.e), said = /FloraScore/.test(H.text);
    const how = !N ? "Nothing stands out today, so it says how the day's timing sits next to the usual." : !leads ? "The recommendation has it lead with the log Day first marks." : said ? "It leads with the log Day first marks." : "It leads with the log Day first marks; saying what that log did to FloraScore is the change left.";
    return `Score first's sentence on ${M.P.name}'s logs now reads: "${H.text}" ${how}`;
  };
  const homeDecision = (M, P) => {
    const list = standouts(M, P.form), ck = P.checkin !== false;
    return {
      t: "Home: score first, or day first",
      lede: `What Today opens on. Score first leads with FloraScore on the Forest card, then ${ck ? "the check-in when it's due, " : ""}today's entries and the week. Day first leads with the day: the date with a small FloraScore ring, today's logs in time order with the one that stood out marked, a row to log from, one sentence on what stood out and what that log did to the score, then the week${ck ? " and the check-in" : ""}. The Easy version has its own Today, so it takes precedence over both. A data style changes Day first's week only; FloraScore stays the small ring by the date.`,
      opts: [
        ["score", `As built: FloraScore on the Forest card, the ring with the person's usual range, 30 days under it, and one sentence ${typeof RU.highlightOf === "function" ? "that leads with what stood out today, ranked as Day first ranks it" : "about the first BM"}. The day's logs come after the score.`],
        ["day", `The day leads. The most notable log is marked: a flag first (routed to primary care, never read, and never read through the score), then a shift from the person's usual, then the strongest symptom. ${P.bmUI === "full" ? "With the full form only, a Log a BM button opens the form" : "BM tiles sit on Today, so once 5 BMs are logged a usual BM is one tap"}. The sentence leads with what stood out, gives FloraScore against yesterday, and, with membership, what that log did to it, scored with and without it.`]
      ],
      rec: "Score first, with the hero's sentence leading on the most notable thing logged today and saying what it did to FloraScore, in the order Day first's sentence uses (a flag first, to primary care, then a shift from the usual, then the strongest symptom). It keeps FloraScore where Oura keeps its main score, the big arc that leads Today, and that's where the Oura data style draws its arc. Day first stays as the option to try with people like Sarah on a rough evening, when the day matters more than the number. It also reads right on days 1 to 13, where Score first opens on a ring with no score yet. Will to confirm.",
      open: [
        `Day first on ${M.P.name}'s logs now ${list.length ? `marks ${markWord(list[0], P.form)}` : "marks nothing, since nothing stands out"}, and its sentence reads: ${lineQuote(M, P, list)}`,
        /* Score first's sentence as the core draws it now, so the note shows whether the change above is in yet */
        ...(lookName(P) ? [] : [scoreFirstNow(M, P, list)]),
        "The order is a flag, a shift, then the strongest symptom. Should a strong symptom outrank a shift, since it's what the person felt?",
        "Will (Oct 14) wanted FloraScore to tie Florin to the score people know from Oura, which is why the recommendation keeps the hero. If Day first wins, is a small ring by the date enough for that?",
        "Day first puts the BM tiles on Today as well as on plus. Keep both, or only Today's?"
      ],
      res: ["Oura's Today since its late-2025 redesign: a row of small score shortcuts, then the main score as a big arc with one headline about the day, then a timeline you can add to. Score first follows that order; Day first moves the score to a small ring by the date."]
    };
  };
  const historyDecision = (M, P) => {
    const Q = cal(M, P);
    return {
      t: "History: a list, or a calendar",
      lede: `How History shows past days. The list is every day, newest first, 14 at a time, with a gap kept as a gap and Add to this day on it. The calendar is a month at a glance, each day marked from the same reading Insights uses, with ${MARKS}. Small ticks show symptoms and meals, and the tapped day's logs sit under it, drawn the way the list draws them. On Free, days before the last ${FREE_DAYS} show only as logged, as Insights stops at ${FREE_DAYS} days there.${marksStyle(P)}`,
      opts: [
        ["list", "As built: newest day first, filters for BMs, symptoms, meals and notes, Show earlier days, and the report for a clinician at the top."],
        ["calendar", "A month at a glance, with Previous and Next month. Within the usual and outside it differ in shape as well as colour (a filled dot, a Gold ring), so they hold in dark, where Ray and Gold are close. The filters dim the days without that kind of log. Every day is a button the arrow keys move through, read out in full, flags included."]
      ],
      rec: `Calendar. It answers the designer's "endless scroll": ${Q.total ? `${M.P.name}'s ${plural(Q.total, "entry", "entries")} since ${shortDate(M.start)} ${Q.months > 1 ? `sit in ${Q.months} months, one screen each` : "fit on one month's screen"}` : "a month is one screen"}, the gaps and shifts show at a glance, and a tapped day reads exactly as it does in the list. ${reachLine(M, Q)}`,
      open: [
        `What the calendar says for ${M.P.name} now: "${Q.sum}"`,
        "A day with a flag is marked for a clinician and not read against the usual, even when its BMs sat within it. Right, or show both?",
        `On Free the calendar reads only the last ${FREE_DAYS} days against the usual, like Insights. Or should History, which is free, read every day?`,
        "Keep a List and Calendar switch on History itself, or the calendar only?"
      ],
      res: ["Throne's guidance: log the days without a BM, so a gap and a day without one read differently. The calendar keeps them apart: a struck-through date for nothing logged, while a No BM day is read as zero BMs, outside the usual once there is one, and its label says no BM.", "CareClinic lets people catch up on several entries in one go. Add to this day works on any past day the calendar shows."]
    };
  };
  const homeScreenNote = (M, P) => {
    const list = standouts(M, P.form), ck = P.checkin !== false, look = lookName(P);
    return {
      t: "Home: Day first",
      lede: `${M.P.name}'s day leads: the date with a small FloraScore ring that opens its detail, then today's logs in time order (${todayOf(M).length ? plural(todayOf(M).length, "log") : "none yet"})${list.length ? ` with ${markWord(list[0], P.form)} marked` : ""}, a row to log from, the day's sentence, then the week${ck ? " and the check-in when it's due" : ""}.${look ? ` The data style is ${look}: Day first keeps FloraScore as the small ring, so only the week takes the look.` : ""}`,
      ba: [
        ["The day's sentence said when the first BM came", "It leads with what stood out, and says what that log did to FloraScore"],
        ["FloraScore's Forest card first, the day under it", "The day first, FloraScore one tap away as a small ring by the date"],
        ["Logging only from plus", P.bmUI === "full" ? "A Log a BM button on Today that opens the full form, as the BM logging decision says" : "BM tiles on Today, so a usual BM is one tap once 5 are logged"]
      ],
      open: [
        `The sentence now: ${lineQuote(M, P, list)} Does it say enough, or too much?`,
        "A day's score blends the last 3 logged days, so one log moves it by about a third of what it would on its own. Say that on the score's detail, or is the sentence enough?"
      ],
      res: ["Oura's Today since its late-2025 redesign: a row of small score shortcuts, then the main score as a big arc with one headline about the day, then a timeline you can add to. Day first moves the score to a small ring by the date and leads with the day; the Home decision recommends Score first, which keeps Oura's order."]
    };
  };
  const calScreenNote = (M, P) => {
    const Q = cal(M, P);
    return {
      t: "History: Calendar",
      lede: `A month of ${M.P.name}'s days, each marked from the same reading of a day Insights uses, with ${MARKS}. Ticks show symptoms and meals.${P.plan === "free" ? ` On Free, days before the last ${FREE_DAYS} show only as logged.` : ""}${marksStyle(P)} Tap a day for its logs, drawn as the list draws them, with Add to this day. The arrow keys move between days. On the phone now: "${Q.sum}"`,
      ba: [
        ["An endless scroll: 14 days at a time, newest first", "A month at a glance, Previous and Next month, and the tapped day's logs under it"],
        ["A gap found by scrolling for it", Q.gaps ? `${plural(Q.gaps, "gap")} since the first log, each a struck-through date in its month` : "Gaps show as struck-through dates, so none hide in a scroll"],
        ["A flag seen only in that day's rows", "A Teal ring on the day, and its label says what was noted"]
      ],
      open: [reachLine(M, Q), "Start the calendar on today, or on the last day with a log?"],
      res: ["Throne's guidance: log the days without a BM, so a gap and a day without one read differently."]
    };
  };
  EXT.decisions.home = homeDecision;
  EXT.decisions.history = historyDecision;
  EXT.notes["home-day"] = homeScreenNote;
  EXT.notes["hist-cal"] = calScreenNote;
  /* if a later module takes over a tab's key without handing on to this one, the notes still follow the decision */
  const prevNoteToday = EXT.notes.today, prevNoteHist = EXT.notes.history;
  EXT.notes.today = (M, P) => (P && P.home === "day" && !P.easy ? homeScreenNote(M, P) : prevNoteToday ? prevNoteToday(M, P) : undefined);
  EXT.notes.history = (M, P) => (P && P.history === "calendar" ? calScreenNote(M, P) : prevNoteHist ? prevNoteHist(M, P) : undefined);

  /* for the checks (work/behave.js): the ranking, the sentence and the month, as the screens use them */
  window.FLORIN_VARIANTS = { standouts, dayLine, calView, cellOf, monthOf, monthDays, firstLog };
})();
