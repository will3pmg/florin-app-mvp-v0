/* Florin app refresh: screens for today's app, the one that ships without hardware. Pure render functions that
   return markup, in the studio's style (js/app-ui.js), so the winning screens can fold back into the studio.
   Copy follows the claims rules: the person's own usual, neutral words, never a prediction or a diagnosis.
   window.FLORIN_RUI */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, AD = window.FLORIN_APP;
  if (!FL || !L || !AD) return;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime;
  const RU = (window.FLORIN_RUI = {});

  /* ---------- icons: the studio's set (copied from js/app-ui.js), plus the ones the refresh needs ---------- */
  const IC = {
    back: "<path d=\"M12.5 4 6.5 10l6 6\"/>",
    chev: "<path d=\"M7.5 4l6 6-6 6\"/>",
    info: "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M10 9v5M10 6.3v.2\"/>",
    clock: "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M10 5.5V10l3 2\"/>",
    bars: "<path d=\"M4.5 16V10M8.5 16V5M12.5 16v-7M16.5 16V7.5\"/>",
    home: "<path d=\"M3.5 9.5 10 4l6.5 5.5V16a1 1 0 0 1-1 1H12v-4H8v4H4.5a1 1 0 0 1-1-1z\"/>",
    chart: "<path d=\"M3 16.5h14M5 13l3.2-3.6 3 2.1L15.5 6\"/>",
    plus: "<path d=\"M10 4.5v11M4.5 10h11\"/>",
    check: "<path d=\"m4.5 10.5 3.5 3.5 7.5-8\"/>",
    note: "<path d=\"M4 15.5 13.5 6l1.5 1.5L5.5 17H4z\"/><path d=\"M11.8 7.7l1.5 1.5\"/>",
    meal: "<path d=\"M6 3v6M4.5 3v4.5a1.5 1.5 0 0 0 3 0V3M6 9v8M13.5 3c-1.7 1.2-2 4.2-2 6h2v8\"/>",
    cal: "<rect x=\"3.5\" y=\"4.5\" width=\"13\" height=\"12\" rx=\"2\"/><path d=\"M3.5 8.5h13M7 2.8v3.4M13 2.8v3.4\"/>",
    close: "<path d=\"M5.5 5.5l9 9M14.5 5.5l-9 9\"/>",
    down: "<path d=\"M6 8.2 10 12l4-3.8\"/>",
    list: '<path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9"/><circle cx="4" cy="5.5" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="14.5" r="1" fill="currentColor" stroke="none"/>',
    chat: '<path d="M4.5 4h11A1.5 1.5 0 0 1 17 5.5v7a1.5 1.5 0 0 1-1.5 1.5H9.5L6 16.8V14H4.5A1.5 1.5 0 0 1 3 12.5v-7A1.5 1.5 0 0 1 4.5 4z"/>',
    today: '<circle cx="10" cy="10" r="3.2"/><path d="M10 2.8v1.6M10 15.6v1.6M2.8 10h1.6M15.6 10h1.6M4.9 4.9l1.1 1.1M14 14l1.1 1.1M4.9 15.1 6 14M14 6l1.1-1.1"/>',
    sym: '<path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6a3.4 3.4 0 0 1 6 2.4c0 4.5-6 8.1-6 8.1z"/>',
    ck: '<rect x="4.5" y="3.5" width="11" height="14" rx="2"/><path d="M7.5 3.5V2.6h5v.9M7.3 10.6l2 2 3.6-4"/>',
    nobm: '<circle cx="10" cy="10" r="7"/><path d="M6.8 10h6.4"/>',
    trash: '<path d="M4 6h12M8 6V4.2h4V6M5.8 6l.8 10.3h6.8L14.2 6"/>',
    undo: '<path d="M7.5 6.5 4 10l3.5 3.5M4.5 10H12a4 4 0 0 1 0 8h-1.5"/>',
    pen: '<path d="M4 16l.7-3.1 8.6-8.6a1.6 1.6 0 0 1 2.3 2.3L7 15.3z"/>'
  };
  const ic = (k, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 20 20" aria-hidden="true">${IC[k] || ""}</svg>`;
  RU.icon = ic;

  /* ---------- the form marks: abstract, our own, never a picture of the thing ----------
     1 separate pieces · 2 a lumpy log · 3 a log with cracks · 4 a smooth log · 5 soft pieces · 6 a ragged mass · 7 waves */
  const GL = {
    1: '<circle cx="6.4" cy="10.2" r="2.4"/><circle cx="12.2" cy="7.4" r="2.4"/><circle cx="17.8" cy="10.6" r="2.4"/><circle cx="9.4" cy="15.8" r="2.4"/><circle cx="15.4" cy="16.6" r="2.2"/>',
    2: '<circle cx="5.8" cy="12.6" r="3"/><circle cx="9.8" cy="11.4" r="3.2"/><circle cx="14" cy="12.7" r="3.1"/><circle cx="18.2" cy="11.7" r="3"/>',
    3: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/><path class="ap-gl-cut" d="M7.6 8.4l1.1 2.3M12.4 8.4l-.9 2.1M16.6 8.4l1 2"/>',
    4: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/>',
    5: '<ellipse cx="5.9" cy="13.2" rx="3.4" ry="2.7"/><ellipse cx="12.2" cy="10.6" rx="3.2" ry="2.6"/><ellipse cx="18.1" cy="13.5" rx="3.3" ry="2.7"/>',
    6: '<path d="M4.4 15c-1.3-.4-1.7-2.1-.6-3-.4-1.5.9-2.8 2.3-2.4.3-1.5 2.1-2.2 3.3-1.2.9-1.2 2.8-1.3 3.7-.1 1.1-1 2.9-.7 3.4.7 1.5-.3 2.8 1 2.5 2.5 1.2.7 1.2 2.4 0 3 .2 1.4-1.2 2.5-2.5 2-.8 1.1-2.4 1.3-3.4.4-1 .9-2.6.8-3.4-.2-1.1.6-2.6.2-3-1-1 .1-1.7-.5-1.7-1.5z"/><circle cx="3.2" cy="18.6" r="1"/><circle cx="20.8" cy="8.4" r="1"/>',
    7: '<path class="ap-gl-st" d="M2.6 9.6c1.6-1.5 3.2-1.5 4.8 0s3.2 1.5 4.8 0 3.2-1.5 4.8 0 3.2 1.5 4.8 0"/><path class="ap-gl-st" d="M2.6 14.8c1.6-1.5 3.2-1.5 4.8 0s3.2 1.5 4.8 0 3.2-1.5 4.8 0 3.2 1.5 4.8 0"/>'
  };
  RU.glyph = (k, cls = "") => `<svg class="ap-gl ${cls}" viewBox="0 0 24 24" aria-hidden="true">${GL[k] || ""}</svg>`;
  const formGlyph = (form, mode) => RU.glyph(mode === "B" ? L.WORDS[L.wordOf(form)].glyph : form);

  /* ---------- small helpers ---------- */
  const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const chip = (text, tone = "plain") => `<span class="ap-chip ap-chip--${tone}">${esc(text)}</span>`;
  const fine = (t) => `<p class="ap-fine">${esc(t)}</p>`;
  const DISC = "Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.";
  const dateOf = L.dateOf;
  const shortDate = (d) => { const x = dateOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const dayName = (d) => {
    if (d === L.TODAY) return "Today";
    if (d === L.TODAY - 1) return "Yesterday";
    const x = dateOf(d);
    return `${Ut.DOWL[x.getDay()]}, ${Ut.MON[x.getMonth()]} ${x.getDate()}`;
  };
  const spanText = (d0, d1) => {
    const a = dateOf(d0), b = dateOf(d1);
    return a.getMonth() === b.getMonth() ? `${Ut.MON[a.getMonth()]} ${a.getDate()} to ${b.getDate()}` : `${shortDate(d0)} to ${shortDate(d1)}`;
  };
  RU.spanText = spanText;
  RU.dayName = dayName;
  const winText = (M) => `${T(M.usual.tLo).replace(/ AM$/, "")} to ${T(M.usual.tHi)}`;
  RU.toInput = (h) => { const hh = Math.floor(h + 1e-6), mm = Math.round((h - hh) * 60); return `${String(mm === 60 ? hh + 1 : hh).padStart(2, "0")}:${String(mm === 60 ? 0 : mm).padStart(2, "0")}`; };
  RU.fromInput = (v) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ""); return m ? +m[1] + +m[2] / 60 : null; };
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  /* how an entry reads in a list (Today's timeline and History share it) */
  RU.entryText = (e, mode) => {
    if (e.kind === "bm") {
      const extra = [...L.HOW.filter(([k]) => e.how && e.how[k]).map(([, l]) => l), e.dur != null ? L.DURATION[e.dur] : null].filter(Boolean);
      const flags = L.FLAGS.filter(([k]) => e.flags && e.flags[k]).map(([, l]) => l);
      return { title: `BM · ${L.formName(e.form, mode)}`, sub: extra.length ? extra.join(" · ") : L.formLine(e.form, mode), flags, note: e.note };
    }
    if (e.kind === "sym") {
      const names = e.items.map((i, k) => (k ? lower1(i.name) : i.name));
      const title = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
      const ss = e.items.map((i) => i.s).filter(Boolean);
      const sw = ss.length ? (Math.min(...ss) === Math.max(...ss) ? L.STRENGTH[ss[0] - 1] : `${L.STRENGTH[Math.min(...ss) - 1]} to ${lower1(L.STRENGTH[Math.max(...ss) - 1])}`) : "";
      return { title, sub: [sw, e.last != null ? L.LASTED[e.last] : ""].filter(Boolean).join(" · "), flags: [], note: e.note };
    }
    if (e.kind === "meal") return { title: L.mealLabel(e.meal), sub: e.text, flags: [], note: e.note };
    return { title: "No BM today", sub: "Logged, so the day doesn't read as a gap", flags: [], note: "" };
  };
  const entryIcon = (e, mode) => (e.kind === "bm" ? formGlyph(e.form, mode) : e.kind === "sym" ? ic("sym") : e.kind === "meal" ? ic("meal") : ic("nobm"));
  RU.row = (e, mode, o = {}) => {
    const t = RU.entryText(e, mode);
    return `<li><button type="button" class="ap-tl-row" data-act="edit" data-id="${esc(e.id)}">
        <span class="ap-tl-t">${esc(T(e.t))}</span>
        <span class="ap-tl-ic ap-tl-ic--${e.kind}">${entryIcon(e, mode)}</span>
        <span class="ap-tl-m"><b>${esc(t.title)}</b>${t.sub ? `<em>${esc(t.sub)}</em>` : ""}${t.flags.length ? `<span class="ap-chips">${t.flags.map((f) => chip(`Noted: ${lower1(f)}`, "info")).join("")}</span>` : ""}${t.note && !o.noNote ? `<q>${esc(t.note)}</q>` : ""}</span>
        ${ic("chev", "ap-tl-go")}
      </button></li>`;
  };

  /* ---------- the week, Monday to Sunday ---------- */
  RU.week = (M, mode) => {
    const ds = L.weekOf(L.TODAY);
    const cols = ds.map((d) => {
      const x = L.day(M, d);
      const before = !x;
      /* today with nothing in it yet isn't a gap, it just isn't over */
      const pending = !!x && d === L.TODAY && !x.entries.length;
      const logged = !!x && x.logged && !pending;
      const es = logged ? x.entries : [];
      return { d, x, before, pending, logged, bms: es.filter((e) => e.kind === "bm"), nobm: es.some((e) => e.kind === "nobm"), syms: es.filter((e) => e.kind === "sym"), meals: es.filter((e) => e.kind === "meal") };
    });
    const live = cols.filter((c) => !c.before && !c.pending);
    const bms = cols.flatMap((c) => c.bms);
    const inForms = M.usual ? bms.filter((b) => L.inForms(M, b.form, mode)).length : null;
    const mornings = cols.filter((c) => c.bms.length);
    const inWin = M.usual ? mornings.filter((c) => L.inWindow(M, c.bms[0].t)).length : null;
    const loggedDays = live.filter((c) => c.logged).length;
    const symDays = cols.filter((c) => c.syms.length);
    const symItems = symDays.flatMap((c) => c.syms.flatMap((s) => s.items));
    const meals = cols.reduce((s, c) => s + c.meals.length, 0);
    const formCount = {};
    bms.forEach((b) => { const k = L.formName(b.form, mode); formCount[k] = (formCount[k] || 0) + 1; });
    const topForm = Object.entries(formCount).sort((a, b) => b[1] - a[1])[0];
    const gaps = live.filter((c) => !c.logged);
    return { ds, cols, bms, inForms, mornings, inWin, loggedDays, symDays, symItems, meals, topForm, gaps };
  };

  /* ---------- the one sentence on Today, from the person's own logs ---------- */
  RU.highlight = (M, mode) => {
    const x = L.day(M, L.TODAY);
    const es = x ? x.entries.filter((e) => e.t <= L.NOW + 6) : [];
    const bms = es.filter((e) => e.kind === "bm"), syms = es.filter((e) => e.kind === "sym"), nobm = es.some((e) => e.kind === "nobm");
    const u = M.usual;
    const out = [];
    if (!es.length) {
      out.push("Nothing logged yet today.");
      out.push(u ? `Your first BM usually comes between ${winText(M)}.` : `Day ${L.learnDay(M)} of learning your usual. Log as you go and it fills in.`);
      return out.join(" ");
    }
    if (bms.length) {
      const f = bms[0];
      const where = !u ? "" : L.inWindow(M, f.t) ? ", inside your usual window" : f.t > u.tHi ? ", later than your usual window" : ", earlier than your usual window";
      out.push(bms.length === 1 ? `One BM so far, at ${T(f.t)}${where}.` : `${WORDS[bms.length] || bms.length} BMs so far, the first at ${T(f.t)}${where}.`);
    } else if (nobm) out.push("No BM today, and it's logged as that.");
    else out.push(u ? `No BM logged yet today. Your first usually comes between ${winText(M)}.` : "No BM logged yet today.");
    if (syms.length) {
      const s = syms[syms.length - 1];
      const top = s.items.slice().sort((a, b) => (b.s || 0) - (a.s || 0))[0];
      out.push(`You logged ${top.s ? L.STRENGTH[top.s - 1].toLowerCase() + " " : ""}${top.name.toLowerCase()}${s.items.length > 1 ? " and more" : ""} at ${T(s.t)}.`);
    } else if (u && bms.length && L.inWindow(M, bms[0].t)) {
      const W = RU.week(M, mode);
      if (W.mornings.length > 2) out.push(`That's ${W.inWin} of ${W.mornings.length} mornings this week.`);
    } else if (!u) out.push(`Day ${L.learnDay(M)} of learning your usual.`);
    return out.join(" ");
  };

  /* the day so far, on a 6 AM to midnight line. Ray on Forest, so it reads on the dark hero */
  RU.ribbon = (M) => {
    const x = L.day(M, L.TODAY);
    const es = x ? x.entries : [];
    const W = 318, L0 = 8, R0 = 8, h0 = 6, h1 = 24;
    const X = (h) => +(L0 + ((Math.max(h0, Math.min(h1, h)) - h0) / (h1 - h0)) * (W - L0 - R0)).toFixed(1);
    const band = M.usual ? `<rect class="ap-rb-band" x="${X(M.usual.tLo)}" y="17" width="${(X(M.usual.tHi) - X(M.usual.tLo)).toFixed(1)}" height="22" rx="4"><title>Your usual window for the first BM</title></rect>` : "";
    const ticks = [[6, "6a"], [12, "12p"], [18, "6p"], [24, "12a"]].map(([h, l]) => `<text class="ap-rb-tk" x="${X(h)}" y="66" text-anchor="${h === 6 ? "start" : h === 24 ? "end" : "middle"}">${l}</text><line class="ap-rb-grid" x1="${X(h)}" x2="${X(h)}" y1="24" y2="32"/>`).join("");
    const now = `<line class="ap-rb-now" x1="${X(L.NOW)}" x2="${X(L.NOW)}" y1="4" y2="54"/><text class="ap-rb-nowl" x="${X(L.NOW) - 4}" y="10" text-anchor="end">Now</text>`;
    const marks = es.map((e) => {
      const tip = `${T(e.t)} · ${RU.entryText(e, "A").title.replace(/^BM · Type \d$/, "BM")}`;
      if (e.kind === "bm") return `<circle class="ap-rb-bm" cx="${X(e.t)}" cy="28" r="5.5"><title>${esc(tip)}</title></circle>`;
      if (e.kind === "sym") return `<circle class="ap-rb-sym" cx="${X(e.t)}" cy="11" r="4.2"><title>${esc(tip)}</title></circle>`;
      if (e.kind === "meal") return `<rect class="ap-rb-meal" x="${(X(e.t) - 1.5).toFixed(1)}" y="41" width="3" height="10" rx="1.5"><title>${esc(tip)}</title></rect>`;
      return `<line class="ap-rb-no" x1="${X(e.t) - 5}" x2="${X(e.t) + 5}" y1="28" y2="28"><title>No BM today</title></line>`;
    }).join("");
    return `<svg class="ap-rb" viewBox="0 0 ${W} 70" role="img" aria-label="${esc(`Today from 6 AM to midnight: ${es.length ? es.map((e) => `${RU.entryText(e, "A").title} at ${T(e.t)}`).join(", ") : "nothing logged yet"}`)}">
      <line class="ap-rb-axis" x1="${L0}" x2="${W - R0}" y1="28" y2="28"/>${band}${ticks}${now}${marks}</svg>`;
  };

  /* ============================== TODAY ============================== */
  RU.today = (M, V) => {
    const mode = V.form, u = M.usual;
    const x = L.day(M, L.TODAY);
    const es = x ? x.entries : [];
    const hasBm = es.some((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
    const t = dateOf(L.TODAY);
    const hello = L.NOW < 12 ? "Good morning" : L.NOW < 17 ? "Good afternoon" : "Good evening";
    const W = RU.week(M, mode);
    const ck = M.checkin;

    /* the check-in card: only when it's due, and never in the way */
    const firstCk = M.checkins.filter((c) => c.answers).length === 0;
    const ckCard = ck.status === "due" ? `<section class="ap-ckc" data-a aria-label="Weekly check-in">
        <div class="ap-ckc-top"><span class="ap-k">Weekly check-in</span><span class="ap-due"><i class="ap-live"></i>Due tonight</span></div>
        <h2>How did this week go?</h2>
        <p>${firstCk ? "Five questions, about a minute. Your first three check-ins become the starting point for every week after." : "Five questions, about a minute. Your answers are only ever compared with your own first weeks."}</p>
        <div class="ap-ckc-act"><button type="button" class="ap-btn" data-act="ck-start">${M.ckDraft && M.ckDraft.step > 0 ? "Continue" : "Start"}</button><button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="ck-skip">Skip this week</button></div>
        <button type="button" class="ap-ckc-day" data-act="ck-day">${ic("cal")}<span>${esc(RU.ckDayText(M))}</span><b>Change</b></button>
      </section>` : ck.status === "done" ? `<button type="button" class="ap-ckc ap-ckc--done" data-act="ck-result" data-a>
        <span class="ap-ckc-ok">${ic("check")}</span><span class="ap-ckc-m"><b>Check-in saved</b><em>${esc(spanText(ck.ws, ck.ws + 6))} · See how it compares</em></span>${ic("chev", "ap-tl-go")}
      </button>` : "";

    /* today's entries, as a short timeline */
    const empty = !es.length;
    const late = L.NOW >= 17;
    const tl = empty ? `<div class="ap-card ap-tl-empty"><p>Nothing logged yet today.</p><div class="ap-tl-empty-act"><button type="button" class="ap-btn" data-act="open-bm">${ic("plus")}Log a BM</button><button type="button" class="ap-btn ap-btn--line" data-act="nobm">No BM today</button></div></div>`
      : `<ol class="ap-card ap-tl">${es.map((e) => RU.row(e, mode)).join("")}</ol>${!hasBm && !hasNo && late ? `<button type="button" class="ap-tl-nobm" data-act="nobm">${ic("nobm")}<span><b>No BM today?</b><em>Log it, so the day doesn't read as a gap</em></span></button>` : ""}`;

    /* this week so far: a small grid, then the counts in plain words */
    const today = L.TODAY;
    const dow = ["M", "T", "W", "T", "F", "S", "S"];
    const cellBm = (c) => {
      if (c.before) return `<td class="is-before" aria-label="Before you started"></td>`;
      if (c.pending) return `<td aria-label="Nothing yet today"></td>`;
      if (!c.logged) return `<td class="is-gap" aria-label="Nothing logged"><i class="ap-wk-gap"></i></td>`;
      if (!c.bms.length) return `<td aria-label="${c.nobm ? "No BM" : "No BM logged"}">${c.nobm ? '<i class="ap-wk-no"></i>' : '<i class="ap-wk-gap"></i>'}</td>`;
      const dots = c.bms.map((b) => { const k = L.inForms(M, b.form, mode); return `<i class="ap-wk-dot${k === true ? " is-usual" : k === false ? " is-shift" : ""}" title="${esc(`${T(b.t)} · ${L.formName(b.form, mode)}`)}"></i>`; }).join("");
      return `<td aria-label="${esc(plural(c.bms.length, "BM"))}"><span class="ap-wk-dots">${dots}</span></td>`;
    };
    const cellFirst = (c) => {
      if (c.before || c.pending) return `<td class="is-before"></td>`;
      if (!c.logged || !c.bms.length) return `<td class="is-gap"><i class="ap-wk-gap"></i></td>`;
      const f = c.bms[0], k = M.usual ? L.inWindow(M, f.t) : null;
      return `<td aria-label="${esc(`First at ${T(f.t)}`)}"><i class="ap-wk-dot${k === true ? " is-usual" : k === false ? " is-shift" : ""}" title="${esc(`First BM ${T(f.t)}`)}"></i></td>`;
    };
    const cellSym = (c) => {
      if (c.before || c.pending) return `<td class="is-before"></td>`;
      if (!c.logged) return `<td class="is-gap"><i class="ap-wk-gap"></i></td>`;
      const s = Math.max(0, ...c.syms.flatMap((e) => e.items.map((i) => i.s || 1)));
      if (!s) return `<td aria-label="No symptoms logged"></td>`;
      return `<td aria-label="${esc(`Symptoms, ${L.STRENGTH[s - 1].toLowerCase()}`)}"><i class="ap-wk-sq ap-wk-sq--${s}" title="${esc(c.syms.flatMap((e) => e.items.map((i) => i.name)).join(", "))}"></i></td>`;
    };
    const cellMeal = (c) => (c.before || c.pending ? `<td class="is-before"></td>` : !c.logged ? `<td class="is-gap"><i class="ap-wk-gap"></i></td>` : `<td><span class="ap-wk-n">${c.meals.length}</span></td>`);
    const grid = `<table class="ap-wk-grid">
        <thead><tr><th scope="col"><span class="sr">Day</span></th>${W.cols.map((c, i) => `<th scope="col" class="${c.d === today ? "is-today" : ""}${c.before ? " is-before" : ""}"><span>${dow[i]}</span><em>${dateOf(c.d).getDate()}</em></th>`).join("")}</tr></thead>
        <tbody>
          <tr><th scope="row">BMs</th>${W.cols.map(cellBm).join("")}</tr>
          <tr><th scope="row">First BM</th>${W.cols.map(cellFirst).join("")}</tr>
          <tr><th scope="row">Symptoms</th>${W.cols.map(cellSym).join("")}</tr>
          <tr><th scope="row">Meals</th>${W.cols.map(cellMeal).join("")}</tr>
        </tbody></table>`;
    const strength = `<span><i class="ap-wk-sq ap-wk-sq--1"></i><i class="ap-wk-sq ap-wk-sq--3"></i>Milder to stronger</span>`;
    const legend = u ? `<div class="ap-legend ap-wk-legend"><span><i class="sw sw--usual"></i>Within your usual</span><span><i class="sw sw--shift"></i>Outside it</span>${strength}<span><i class="ap-wk-no"></i>No BM</span><span><i class="ap-wk-gap"></i>Nothing logged</span></div>`
      : `<div class="ap-legend ap-wk-legend"><span><i class="sw"></i>Logged</span>${strength}<span><i class="ap-wk-no"></i>No BM</span><span><i class="ap-wk-gap"></i>Nothing logged</span></div>`;
    const symLine = (() => {
      if (!W.symDays.length) return `No symptoms logged on the ${plural(W.loggedDays, "day")} you logged.`;
      const names = {}; W.symItems.forEach((i) => (names[i.name] = (names[i.name] || 0) + 1));
      const top = Object.entries(names).sort((a, b) => b[1] - a[1])[0][0];
      const ss = W.symItems.map((i) => i.s || 1);
      const how = Math.max(...ss) === 1 ? "mild" : Math.min(...ss) === Math.max(...ss) ? L.STRENGTH[ss[0] - 1].toLowerCase() : "mostly " + L.STRENGTH[Math.round(Ut.median(ss)) - 1].toLowerCase();
      return `Symptoms on ${W.symDays.length} of the ${W.loggedDays} days you logged, ${W.symDays.length === 1 ? "" : W.symItems.every((i) => i.name === top) ? "each time " : "mostly "}${how} ${top.toLowerCase()}.`;
    })();
    const sums = u ? [
      `<b>${W.inForms} of ${plural(W.bms.length, "BM")}</b> within your usual forms, ${esc(L.usualFormsText(M, mode))}.`,
      `<b>First BM inside your usual window</b> on ${W.inWin} of ${plural(W.mornings.length, "morning")}, ${esc(winText(M))}.`,
      esc(symLine)
    ] : [
      `<b>Learning your usual: day ${L.learnDay(M)} of ${L.LEARN_DAYS}.</b> Until then, counts only, no comparisons.`,
      `${plural(W.bms.length, "BM")} logged${W.topForm ? `, mostly ${esc(W.topForm[0])}` : ""}. ${plural(W.meals, "meal")} logged.`,
      esc(symLine)
    ];
    const learnBar = u ? "" : `<div class="ap-learn-bar" role="img" aria-label="${esc(`Day ${L.learnDay(M)} of ${L.LEARN_DAYS}`)}"><i style="--w:${((L.learnDay(M) / L.LEARN_DAYS) * 100).toFixed(1)}%"></i></div>`;
    const weekCard = `<section class="ap-card ap-wk" data-a>
        <div class="ap-card-h"><h2>This week so far</h2><span class="ap-k">${esc(spanText(W.ds[0], W.ds[6]))}</span></div>
        ${grid}${legend}${learnBar}
        <ul class="ap-wk-sum">${sums.map((s) => `<li>${s}</li>`).join("")}</ul>
        <button type="button" class="ap-link ap-wk-go" data-act="tab" data-tab="insights">See it on Insights ${ic("chev")}</button>
      </section>`;

    /* one next step, tied to the person's own logs */
    const next = (() => {
      if (!u) {
        const left = L.LEARN_DAYS - L.learnDay(M);
        return { k: "Next step", line: `Keep logging as you go. In ${plural(left, "more day")}, Florin can start showing your usual.`, act: hasBm || hasNo ? ["open-meal", "Log a meal"] : ["open-bm", "Log a BM"] };
      }
      const fc = L.foodCounts(M, 30);
      const lastSeen = {};
      M.days.forEach((dd) => dd.entries.filter((e) => e.kind === "meal").forEach((m) => (m.foods || []).forEach((f) => (lastSeen[f] = dd.d * 100 + m.t))));
      const cand = Object.entries(fc).filter(([f, n]) => n < 5 && L.FOOD_NAMES[f]).sort((a, b) => b[1] - a[1] || (lastSeen[b[0]] || 0) - (lastSeen[a[0]] || 0))[0];
      if (!cand) return { k: "Next step", line: "Keep logging meals. Florin checks a food for what tends to follow once it has come up 5 times.", act: ["open-meal", "Log a meal"] };
      const [name, pl] = L.FOOD_NAMES[cand[0]];
      return { k: "Next step", line: `${name} ${pl ? "have" : "has"} come up in ${cand[1]} of your meals this month. At 5, Florin starts checking what tends to follow ${pl ? "them" : "it"}.`, act: ["open-meal", "Log a meal"] };
    })();

    return `<div class="ap-scr ap-today">
      <header class="ap-top" data-a>
        <div class="ap-top-l"><p class="ap-date">${esc(Ut.DOWL[t.getDay()])}, ${esc(Ut.MONL[t.getMonth()])} ${t.getDate()}</p><h1 class="ap-hello">${hello}, ${esc(M.P.name)}</h1></div>
        <button type="button" class="ap-avatar" data-act="toast" data-msg="Profile and settings come later." aria-label="Profile">${esc(M.P.initial)}</button>
      </header>

      <section class="ap-hl" data-a>
        <span class="ap-k ap-k--ray">Today so far</span>
        <p class="ap-hl-line">${esc(RU.highlight(M, mode))}</p>
        ${RU.ribbon(M)}
        <div class="ap-hl-legend"><span><i class="ap-hl-sw ap-hl-sw--bm"></i>BM</span><span><i class="ap-hl-sw ap-hl-sw--sym"></i>Symptom</span><span><i class="ap-hl-sw ap-hl-sw--meal"></i>Meal</span>${u ? `<span><i class="ap-hl-sw ap-hl-sw--band"></i>Usual first BM</span>` : ""}</div>
      </section>

      ${ckCard}

      <section class="ap-tlw" data-a>
        <div class="ap-card-h ap-card-h--pad"><h2>Today</h2><span class="ap-k">${empty ? "Nothing yet" : plural(es.length, "entry", "entries")}</span></div>
        ${tl}
      </section>

      ${weekCard}

      <section class="ap-card ap-nx" data-a>
        <span class="ap-k">${esc(next.k)}</span>
        <p>${esc(next.line)}</p>
        <button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="${next.act[0]}">${esc(next.act[1])}</button>
      </section>
      ${fine(DISC)}
    </div>`;
  };

  /* ============================== PLUS MENU ============================== */
  RU.formTiles = (mode, sel, o = {}) => {
    const items = mode === "B" ? L.WORDS.map((w) => ({ v: w.rep, k: w.k, g: w.glyph, label: w.word, aria: `${w.word}: ${w.line}` })) : L.TYPES.slice(1).map((t) => ({ v: t.k, k: t.k, g: t.k, label: String(t.k), aria: `Type ${t.k}: ${t.line}` }));
    const on = (it) => sel != null && (mode === "B" ? L.wordOf(sel) === it.k : sel === it.v);
    return `<div class="ap-fm ap-fm--${mode}${o.dark ? " ap-fm--dark" : ""}" role="group" aria-label="${esc(o.label || "Form")}">${items.map((it) => `<button type="button" class="ap-fm-b${on(it) ? " is-on" : ""}" data-act="${o.act || "form"}" data-form="${it.v}" aria-pressed="${on(it)}" aria-label="${esc(it.aria)}">${RU.glyph(it.g)}<span>${esc(it.label)}</span></button>`).join("")}</div>
      <div class="ap-fm-scale" aria-hidden="true"><span>Harder</span><span>Looser</span></div>`;
  };
  RU.ckDayText = (M) => `${Ut.DOWL[M.ckDay.dow]}s, ${M.ckDay.when}`;

  RU.plus = (M, V) => {
    const mode = V.form;
    const x = L.day(M, L.TODAY), es = x ? x.entries : [];
    const bms = es.filter((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
    const ck = M.checkin;
    const ckSub = ck.status === "due" ? "Due tonight · about a minute" : ck.status === "done" ? "Done for this week" : "Skipped this week · check in anyway";
    const meal = L.mealLabel(L.mealFor(L.NOW));
    return `<div class="ap-psh" role="dialog" aria-modal="true" aria-label="Add to today">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>Add to today</h2><span class="ap-k">${esc(Ut.DOWL[dateOf(L.TODAY).getDay()])} · ${esc(T(L.NOW))}</span></div>
      <section class="ap-pbm">
        <button type="button" class="ap-pbm-h" data-act="open-bm"><span class="ap-pbm-ic">${RU.glyph(4)}</span><span class="ap-pbm-t"><b>BM</b><em>Tap the closest form. Details are optional.</em></span>${ic("chev")}</button>
        ${RU.formTiles(mode, null, { dark: true, act: "open-bm", label: "Start a BM log with this form" })}
      </section>
      <div class="ap-pbm-sub">${bms.length ? `<span class="ap-k">Last BM today: ${esc(T(bms[bms.length - 1].t))}</span>` : hasNo ? `<span class="ap-k">Logged: no BM today</span>` : `<button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="nobm">${ic("nobm")}No BM today</button>`}</div>
      <div class="ap-pgrid">
        <button type="button" class="ap-pt" data-act="open-sym"><span class="ap-read-ic">${ic("sym")}</span><b>Symptoms</b><em>Bloating, pain, cramping and more</em></button>
        <button type="button" class="ap-pt" data-act="open-meal"><span class="ap-read-ic">${ic("meal")}</span><b>Meal</b><em>${esc(meal)}, or any meal</em></button>
      </div>
      <button type="button" class="ap-pck${ck.status === "due" ? " is-due" : ""}" data-act="${ck.status === "done" ? "ck-result" : "ck-start"}"><span class="ap-read-ic">${ic("ck")}</span><span class="ap-pck-m"><b>Weekly check-in</b><em>${esc(ckSub)}</em></span>${ck.status === "due" ? '<i class="ap-pck-dot" aria-label="Due"></i>' : ""}${ic("chev", "ap-tl-go")}</button>
    </div>`;
  };

  /* ============================== LOG FORMS ============================== */
  const sheetHead = (title, sub) => `<div class="ap-fsh-h"><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button><div class="ap-fsh-t"><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div><span class="ap-fsh-sp"></span></div>`;
  const whenRow = (M, st, id) => {
    const opts = [[L.TODAY, "Today"], [L.TODAY - 1, "Yesterday"], [L.TODAY - 2, "2 days ago"]].filter(([d]) => d >= M.start);
    if (!opts.some(([d]) => d === st.d)) opts.push([st.d, dayName(st.d)]); /* an older entry, opened from History */
    return `<div class="ap-f"><span class="ap-f-l" id="${id}-wl">When</span>
      <div class="ap-when" role="group" aria-labelledby="${id}-wl">
        <label class="ap-fld ap-fld--sel">${ic("cal")}<span class="sr">Day</span><select id="${id}-day" data-in="day">${opts.map(([d, l]) => `<option value="${d}"${st.d === d ? " selected" : ""}>${l}</option>`).join("")}</select>${ic("down", "ap-fld-dn")}</label>
        <label class="ap-fld">${ic("clock")}<span class="sr">Time</span><input id="${id}-time" type="time" data-in="time" value="${RU.toInput(st.t)}"></label>
      </div></div>`;
  };
  const choice = (act, items, isOn, o = {}) => `<div class="ap-chs${o.wrap ? " ap-chs--wrap" : ""}" role="group"${o.label ? ` aria-label="${esc(o.label)}"` : ""}>${items.map(([v, l], i) => `<button type="button" class="ap-ch${o.flag ? " ap-ch--flag" : ""}${isOn(v, i) ? " is-on" : ""}" data-act="${act}" data-v="${esc(v)}" aria-pressed="${isOn(v, i)}">${isOn(v, i) && !o.noCheck ? ic("check") : ""}${esc(l)}</button>`).join("")}</div>`;
  const noteField = (id, st, ph) => `<div class="ap-f"><label class="ap-f-l" for="${id}-note">Note</label><textarea id="${id}-note" class="ap-ta" data-in="note" rows="3" placeholder="${esc(ph)}">${esc(st.note || "")}</textarea></div>`;

  /* ---------- Log a BM: one tap on a form, then optional detail ---------- */
  RU.bm = (M, V, st) => {
    const mode = V.form, id = `bm${V.uid}`;
    const sel = st.form;
    const anyFlag = L.FLAGS.some(([k]) => st.flags[k]);
    const detCount = L.HOW.filter(([k]) => st.how[k]).length + (st.dur != null ? 1 : 0) + L.FLAGS.filter(([k]) => st.flags[k]).length;
    const line = sel != null ? `<b>${esc(L.formName(sel, mode))}</b> · ${esc(L.formLine(sel, mode))}` : `Tap the closest one. It doesn't need to be exact.`;
    return `<div class="ap-fsh" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit BM" : "Log a BM").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        ${whenRow(M, st, id)}
        <div class="ap-f">
          <div class="ap-f-lr"><span class="ap-f-l">Form</span><button type="button" class="ap-gd-b" data-act="guide">${ic("info")}How to pick</button></div>
          ${RU.formTiles(mode, sel)}
          <p class="ap-fm-line${sel != null ? " is-set" : ""}" aria-live="polite">${line}</p>
        </div>
        <div class="ap-det${st.details ? " is-open" : ""}">
          <button type="button" class="ap-det-h" data-act="details" aria-expanded="${!!st.details}" aria-controls="${id}-det"><span><b>Add details</b><em>${detCount ? `${plural(detCount, "detail")} added` : "Rushing, straining, how long, anything you noticed"}</em></span>${ic("down")}</button>
          <div class="ap-det-b" id="${id}-det"${st.details ? "" : " hidden"}>
            <div class="ap-f"><span class="ap-f-l">How it went</span>${choice("how", L.HOW, (v) => !!st.how[v], { label: "How it went", wrap: true })}</div>
            <div class="ap-f"><span class="ap-f-l">How long</span>${choice("dur", L.DURATION.map((l, i) => [i, l]), (v, i) => st.dur === i, { label: "How long" })}</div>
            <div class="ap-f"><span class="ap-f-l">Anything you noticed</span>${choice("flag", L.FLAGS, (v) => !!st.flags[v], { label: "Anything you noticed", flag: true, wrap: true })}
              ${anyFlag ? `<p class="ap-info">${ic("info")}<span>After you save, we'll show when to talk to a clinician. Florin won't try to read this.</span></p>` : ""}</div>
          </div>
        </div>
        ${noteField(id, st, "Anything else? Optional")}
      </div>
      <div class="ap-fsh-f">
        ${sel == null ? `<p class="ap-fsh-hint">Pick a form to save</p>` : ""}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-bm"${sel == null ? ' aria-disabled="true"' : ""}>${st.edit ? "Save changes" : "Save BM"}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete this BM</button>` : ""}
      </div>
    </div>`;
  };

  /* the (i) guide: the full lines, so the tiles can stay small */
  RU.guide = (V) => {
    const B = V.form === "B";
    const rows = B ? L.WORDS.map((w) => [w.glyph, w.word, w.line]) : L.TYPES.slice(1).map((t) => [t.k, `Type ${t.k}`, t.line]);
    return `<div class="ap-psh ap-gd" role="dialog" aria-modal="true" aria-label="How to pick">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>${B ? "Picking a word" : "Picking a type"}</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <p class="ap-gd-lede">${B ? "Five words, from hardest to loosest. Pick the closest one." : "Types 1 to 7 run from hardest to loosest. It's the scale clinicians use, so your logs make sense to them. Pick the closest one; it doesn't need to be exact."}</p>
      <ol class="ap-gd-list">${rows.map(([g, k, l]) => `<li><span class="ap-gd-ic">${RU.glyph(g)}</span><b>${esc(k)}</b><span>${esc(l)}</span></li>`).join("")}</ol>
    </div>`;
  };

  /* after a BM with blood, mucus or a black stool: a clinician note, never a reading of it */
  RU.flagNote = (st) => {
    const f = L.FLAGS.filter(([k]) => st.flags[k]).map(([k]) => k);
    const serious = f.includes("blood") || f.includes("black");
    const sign = f.length === 1 ? { blood: "Blood in your stool", mucus: "Mucus in your stool", black: "A black or tar-like stool" }[f[0]] : f.includes("black") ? "A black stool, and more" : "Blood and mucus in your stool";
    return `<div class="ap-psh ap-fl" role="dialog" aria-modal="true" aria-label="When to see a clinician">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>Saved, with a note</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <div class="ap-ask-alarm" role="note"><span class="ap-k">When to see a clinician</span><b>${esc(sign)}</b><p>${serious ? "Even a small amount is worth a clinician's look soon. Florin won't try to read it." : "If it's new for you, keeps showing up, or comes with pain or blood, check in with a clinician. Florin won't try to read it."}</p></div>
      <p class="ap-fl-body">Primary care is the right first stop: your GP or a nurse practitioner. Your logs can go with you as a report, so you don't have to remember dates.</p>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="toast" data-msg="Ask Florin opens with this log loaded. That comes in the second pass." data-close="1">Talk it through with Ask Florin</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">Done</button></div>
    </div>`;
  };

  /* tapping a "No BM today" entry: log a BM after all, or take it back */
  RU.nobmSheet = (st) => `<div class="ap-psh" role="dialog" aria-modal="true" aria-label="No BM today">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>No BM today</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <p class="ap-gd-lede">Logged at ${esc(T(st.t))}, so today reads as a day without one, not a day you didn't log. Logging a BM later replaces it.</p>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="open-bm" data-swap="1">Log a BM instead</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="delete">Take it back</button></div>
    </div>`;

  /* ---------- Log symptoms: the pills, then how strong and how long ---------- */
  RU.sym = (M, V, st) => {
    const id = `sy${V.uid}`;
    const names = L.SYMPTOMS.concat(st.custom || []);
    const on = (n) => st.items.some((i) => i.name === n);
    const rows = st.items.map((it) => `<div class="ap-sy-row"><b>${esc(it.name)}</b>${choice("str", L.STRENGTH.map((l, i) => [`${it.name}|${i + 1}`, l]), (v) => v === `${it.name}|${it.s}`, { label: `How strong: ${it.name}` })}</div>`).join("");
    return `<div class="ap-fsh" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit symptoms" : "Log symptoms").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        ${whenRow(M, st, id)}
        <div class="ap-f"><div class="ap-f-lr"><span class="ap-f-l">What you're feeling</span><span class="ap-f-h">Pick any</span></div>
          ${choice("sym", names.map((n) => [n, n]), (v) => on(v), { label: "Symptoms", wrap: true })}
          ${st.adding ? `<div class="ap-sy-add"><label class="sr" for="${id}-new">Name it</label><input id="${id}-new" class="ap-in" data-in="newsym" type="text" placeholder="Name it" value="${esc(st.newName || "")}" autocomplete="off"><button type="button" class="ap-btn ap-btn--c" data-act="sym-add">Add</button></div>`
            : `<button type="button" class="ap-sy-more" data-act="sym-other">${ic("plus")}Something else</button>`}
        </div>
        ${st.items.length ? `<div class="ap-f"><span class="ap-f-l">How strong</span><div class="ap-sy-rows">${rows}</div></div>
        <div class="ap-f"><span class="ap-f-l">How long has it lasted</span>${choice("last", L.LASTED.map((l, i) => [i, l]), (v, i) => st.last === i, { label: "How long has it lasted", wrap: true })}</div>` : ""}
        ${noteField(id, st, "Anything that came before it? Optional")}
        <p class="ap-info">${ic("info")}<span>See a clinician about blood, a black stool, a fever, vomiting that won't stop, weight loss you can't explain, or waking at night to go.</span></p>
      </div>
      <div class="ap-fsh-f">
        ${st.items.length ? "" : `<p class="ap-fsh-hint">Pick at least one to save</p>`}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-sym"${st.items.length ? "" : ' aria-disabled="true"'}>${st.edit ? "Save changes" : "Save symptoms"}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete</button>` : ""}
      </div>
    </div>`;
  };

  /* ---------- Log a meal: which one, then free text ---------- */
  RU.meal = (M, V, st) => {
    const id = `ml${V.uid}`;
    const recent = [];
    for (let i = M.days.length - 1; i >= 0 && recent.length < 3; i--) {
      M.days[i].entries.filter((e) => e.kind === "meal" && e.meal === st.meal).reverse().forEach((e) => { if (recent.length < 3 && !recent.includes(e.text)) recent.push(e.text); });
    }
    const ok = (st.text || "").trim().length > 0;
    return `<div class="ap-fsh" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit meal" : "Log a meal").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        <div class="ap-f"><span class="ap-f-l">Which meal</span>${choice("meal", L.MEALS, (v) => st.meal === v, { label: "Which meal" })}</div>
        ${whenRow(M, st, id)}
        <div class="ap-f"><label class="ap-f-l" for="${id}-text">What you had</label><textarea id="${id}-text" class="ap-ta" data-in="text" rows="3" placeholder="For example: salmon, rice and greens">${esc(st.text || "")}</textarea>
          ${recent.length ? `<div class="ap-ml-rec"><span class="ap-f-h">Recent ${esc(L.mealLabel(st.meal).toLowerCase())}s</span>${choice("recent", recent.map((r) => [r, r]), (v) => v === st.text, { label: "Recent", wrap: true })}</div>` : ""}
        </div>
        <p class="ap-fine ap-ml-fine">Florin starts checking what tends to follow a food once it has come up 5 times.</p>
      </div>
      <div class="ap-fsh-f">
        ${ok ? "" : `<p class="ap-fsh-hint">Write what you had to save</p>`}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-meal"${ok ? "" : ' aria-disabled="true"'}>${st.edit ? "Save changes" : `Save ${esc(L.mealLabel(st.meal).toLowerCase())}`}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete</button>` : ""}
      </div>
    </div>`;
  };

  /* ============================== WEEKLY CHECK-IN ============================== */
  /* a 13-week trend for one question: dots on four steps, the person's first weeks as the band */
  RU.ckTrend = (M, qi, cur) => {
    const q = L.CHECKIN[qi];
    const weeks = M.checkins.concat(cur != null ? [{ w: 12, answers: Object.assign([], { [qi]: cur }) }] : []);
    const b = L.baseline(M);
    const W = 318, H = 60, left = 64, right = 8, top = 8, bot = 40;
    const X = (i) => +(left + (i / 12) * (W - left - right)).toFixed(1);
    const Y = (v) => +(bot - (v / 3) * (bot - top)).toFixed(1);
    /* the first weeks' range runs the full width, so this week reads against it */
    const band = b ? `<rect class="c-band" x="${left - 6}" y="${(Y(b[qi].hi) - 5).toFixed(1)}" width="${W - left - right + 12}" height="${(Y(b[qi].lo) - Y(b[qi].hi) + 10).toFixed(1)}" rx="4"/>` : "";
    const grid = [0, 1, 2, 3].map((v) => `<line class="ap-ckt-grid" x1="${left - 6}" x2="${W - right + 6}" y1="${Y(v)}" y2="${Y(v)}"/>`).join("");
    const ends = `<text class="ap-ckt-y" x="0" y="${Y(3) + 3}">${esc(q.ends[1])}</text><text class="ap-ckt-y" x="0" y="${Y(0) + 3}">${esc(q.ends[0])}</text>`;
    const xs = `<text class="ap-ckt-x" x="${X(0)}" y="${H - 4}" text-anchor="start">${esc(shortDate(0))}</text><text class="ap-ckt-x" x="${X(12)}" y="${H - 4}" text-anchor="end">This week</text>`;
    const dots = weeks.map((c) => (c.answers && c.answers[qi] != null ? `<circle class="ap-ckt-dot${c.w === 12 ? " is-now" : ""}" cx="${X(c.w)}" cy="${Y(c.answers[qi])}" r="${c.w === 12 ? 4.4 : 3}"><title>${esc(c.w === 12 ? `This week: ${q.opts[c.answers[qi]]}` : `Week of ${shortDate(c.w * 7)}: ${q.opts[c.answers[qi]]}`)}</title></circle>` : "")).join("");
    return `<svg class="ap-ckt" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${q.label}, each week since ${shortDate(0)}. The band is your first three weeks.`)}">${band}${grid}${ends}${xs}${dots}</svg>`;
  };

  RU.ck = (M, V, st) => {
    const id = `ck${V.uid}`;
    const ck = M.checkin;
    const span = spanText(ck.ws, ck.ws + 6);
    const n = L.CHECKIN.length + 1;
    const prog = `<div class="ap-ck-prog" role="img" aria-label="${esc(`Question ${Math.min(st.step + 1, n)} of ${n}`)}">${Array.from({ length: n }, (_, i) => `<i class="${i < st.step ? "is-done" : i === st.step ? "is-on" : ""}"></i>`).join("")}</div>`;
    const head = `<div class="ap-ck-h"><button type="button" class="ap-lg-x" data-act="${st.step > 0 && st.step < n ? "ck-back" : "close"}" aria-label="${st.step > 0 && st.step < n ? "Back" : "Close"}">${ic(st.step > 0 && st.step < n ? "back" : "close")}</button><div class="ap-fsh-t"><h2 id="${id}-h">Weekly check-in</h2><p>${esc(span)}</p></div>${st.step < n ? `<button type="button" class="ap-ck-later" data-act="close">Later</button>` : `<span class="ap-fsh-sp"></span>`}</div>`;
    let body;
    if (st.step < L.CHECKIN.length) {
      const q = L.CHECKIN[st.step];
      body = `${prog}<div class="ap-ck-q"><span class="ap-k">${st.step + 1} of ${n}</span><h3>${esc(q.q)}</h3></div>
        <div class="ap-ck-opts" role="group" aria-label="${esc(q.q)}">${q.opts.map((o, i) => `<button type="button" class="ap-ck-opt${st.answers[st.step] === i ? " is-on" : ""}" data-act="ck-ans" data-v="${i}" aria-pressed="${st.answers[st.step] === i}"><span>${esc(o)}</span>${st.answers[st.step] === i ? ic("check") : ""}</button>`).join("")}</div>
        <p class="ap-ck-foot">Think about the whole week, Monday to today.</p>`;
    } else if (st.step === L.CHECKIN.length) {
      body = `${prog}<div class="ap-ck-q"><span class="ap-k">${n} of ${n}</span><h3>Anything else to note about this week?</h3></div>
        ${choice("ck-tag", L.CHECKIN_TAGS.concat(M.P.cycle ? ["Period"] : []).map((t) => [t, t]), (v) => st.tags.includes(v), { label: "This week", wrap: true })}
        <div class="ap-f"><label class="ap-f-l" for="${id}-note">Note</label><textarea id="${id}-note" class="ap-ta" data-in="cknote" rows="3" placeholder="Optional">${esc(st.note || "")}</textarea></div>
        <div class="ap-ck-fin"><button type="button" class="ap-btn ap-btn--block" data-act="ck-finish">Finish</button></div>`;
    } else {
      const b = L.baseline(M);
      const rows = L.CHECKIN.map((q, i) => {
        const cmp = L.compare(b, i, st.answers[i]);
        return `<li class="ap-ckr-row"><div class="ap-ckr-top"><span class="ap-k">${esc(q.label)}</span>${cmp ? chip(cmp.text, cmp.k === "same" ? "usual" : "shift") : ""}</div><b>${esc(q.opts[st.answers[i]])}</b>${b ? RU.ckTrend(M, i, st.answers[i]) : ""}</li>`;
      }).join("");
      const first = M.checkins.filter((c) => c.answers);
      body = `<div class="ap-ckr">
          <span class="ap-k">${esc(span)} · Saved</span>
          <h3>${b ? "This week, next to your first weeks" : "Your first check-in is saved"}</h3>
          <p class="ap-ckr-lede">${b ? `Compared only with your first three check-ins, ${esc(spanText(first[0].ws, first[2].ws + 6))}. No score and no bands, only how this week sits next to your own start.` : "This is your starting point. After three check-ins, each week is compared with these first ones. No score and no bands, only you next to you."}</p>
          <ul class="ap-ckr-list">${rows}</ul>
          ${b ? `<div class="ap-legend"><span><i class="sw sw--band"></i>Your first three weeks</span><span><i class="sw ap-ckt-sw--past"></i>Each week</span><span><i class="sw ap-ckt-sw--now"></i>This week</span><span><i class="ap-chip ap-chip--usual ap-ckt-chip"></i>About the same</span><span><i class="ap-chip ap-chip--shift ap-ckt-chip"></i>Moved, either way</span></div>` : ""}
          ${st.tags.length || st.note ? `<p class="ap-ckr-note">${ic("note")}<span>${esc([st.tags.join(", "), st.note].filter(Boolean).join(". "))}</span></p>` : ""}
          <div class="ap-ck-fin"><button type="button" class="ap-btn ap-btn--block" data-act="close">Done</button><button type="button" class="ap-link" data-act="tab" data-tab="insights" data-close="1">See the trend on Insights ${ic("chev")}</button></div>
        </div>`;
    }
    return `<div class="ap-ck" role="dialog" aria-modal="true" aria-labelledby="${id}-h">${head}<div class="ap-ck-b">${body}</div></div>`;
  };

  RU.ckDay = (M, st) => `<div class="ap-psh" role="dialog" aria-modal="true" aria-label="When your check-in is due">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>When should it be due?</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <div class="ap-f"><span class="ap-f-l">Day</span>${choice("ckd-dow", Ut.DOW.map((d, i) => [i, d]), (v, i) => st.dow === i, { label: "Day", noCheck: true })}</div>
      <div class="ap-f"><span class="ap-f-l">Time</span>${choice("ckd-when", [["morning", "Morning"], ["evening", "Evening"]], (v) => st.when === v, { label: "Time" })}</div>
      <p class="ap-fine">One reminder when it's due. Skipping is fine; it never blocks logging or Insights.</p>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="ckd-save">Save</button></div>
    </div>`;

  /* ============================== HISTORY (basic) ============================== */
  RU.history = (M, V, st) => {
    const mode = V.form;
    const F = st.filter || "all";
    const keep = (e) => F === "all" || (F === "bm" && (e.kind === "bm" || e.kind === "nobm")) || (F === "sym" && e.kind === "sym") || (F === "meal" && e.kind === "meal") || (F === "note" && e.note);
    const days = M.days.slice().reverse().slice(0, st.n || 14);
    const total = M.days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0);
    const groups = days.map((x) => {
      const es = x.logged ? x.entries.filter(keep) : [];
      if (x.logged && !es.length && F !== "all") return "";
      return `<section class="ap-hd" data-a>
          <div class="ap-card-h ap-card-h--pad"><h2>${esc(dayName(x.d))}</h2><span class="ap-k">${x.logged ? plural(es.length, "entry", "entries") : "Nothing logged"}</span></div>
          ${x.logged ? (es.length ? `<ol class="ap-card ap-tl">${es.map((e) => RU.row(e, mode)).join("")}</ol>` : `<p class="ap-hd-none">Nothing logged yet.</p>`) : `<p class="ap-hd-none">No logs this day. It stays a gap, never a zero.</p>`}
        </section>`;
    }).join("");
    return `<div class="ap-scr ap-hist">
      <header class="ap-hist-top" data-a><h1 class="ap-h1">History</h1><p class="ap-hi-sub">${plural(total, "entry", "entries")} since ${esc(shortDate(M.start))}</p></header>
      <div class="ap-hist-f" role="group" aria-label="Show" data-a>${[["all", "All"], ["bm", "BMs"], ["sym", "Symptoms"], ["meal", "Meals"], ["note", "Notes"]].map(([k, l]) => `<button type="button" class="ap-hi-filter" data-act="hfilter" data-v="${k}" aria-pressed="${F === k}">${l}</button>`).join("")}</div>
      ${groups}
      ${(st.n || 14) < M.days.length ? `<button type="button" class="ap-btn ap-btn--line ap-hi-more" data-act="hmore" data-a>Show earlier days</button>` : ""}
      ${fine(DISC)}
    </div>`;
  };

  /* ============================== SECOND PASS ============================== */
  RU.soon = (which) => {
    const S = {
      insights: { t: "Insights", k: "Second pass", p: "A card each for timing, how often, form mix, symptom days, the weekly check-in and meals. Each one leads with your usual in words, then the chart, with a chevron into the detail and Ask about this.", rows: ["Timing · first BM of the day", "How often · BMs a day", "Form mix", "Symptom days", "Weekly check-in trend", "Meals · possible patterns after 5 logs"] },
      ask: { t: "Ask Florin", k: "Second pass", p: "Its own tab, plus Ask about this on every chart, which opens the chat with that chart's data loaded. The coach test bench rules carry over: answer first, one bold question per turn, options about one turn in three, and an alarm feature routes to primary care.", rows: ["Memories you can see and delete", "Check-ins you opt into", "Small charts in answers"] }
    }[which];
    return `<div class="ap-scr ap-soon">
      <header class="ap-hist-top" data-a><h1 class="ap-h1">${esc(S.t)}</h1></header>
      <section class="ap-card ap-soon-c" data-a><span class="ap-k">${esc(S.k)}</span><p>${esc(S.p)}</p><ul>${S.rows.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></section>
      ${fine(DISC)}
    </div>`;
  };
})();
