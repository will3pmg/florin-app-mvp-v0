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
    lock: '<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>',
    mic: '<rect x="7.5" y="2.5" width="5" height="9.5" rx="2.5"/><path d="M4.8 9.5a5.2 5.2 0 0 0 10.4 0M10 14.7V17.5M7.5 17.5h5"/>',
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
    pen: '<path d="M4 16l.7-3.1 8.6-8.6a1.6 1.6 0 0 1 2.3 2.3L7 15.3z"/>',
    report: '<path d="M6 3.5h6l3 3V16a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M12 3.5V7h3M7.5 10.5h5M7.5 13h5"/>',
    repeat: '<path d="M4.5 9V7.5A2.5 2.5 0 0 1 7 5h9l-2.5-2.5M15.5 11v1.5A2.5 2.5 0 0 1 13 15H4l2.5 2.5"/>',
    sliders: '<path d="M3.5 6.5h13M3.5 13.5h13"/><circle cx="7.5" cy="6.5" r="2" fill="currentColor"/><circle cx="12.5" cy="13.5" r="2" fill="currentColor"/>'
  };
  const ic = (k, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 20 20" aria-hidden="true">${IC[k] || ""}</svg>`;
  RU.icon = ic;

  /* ---------- the marks: abstract, our own, never a picture of the thing ----------
     Drawn from the same two cues as our words, firmness and pieces: 1 small hard pebbles · 2 an uneven bar ·
     3 a short, thick bar · 4 a long, smooth bar · 5 three soft blobs, well apart · 6 a low, spread shape · 7 waves.
     Each one still reads at 24px, in light, dark and on the plus card. */
  const GL = {
    1: '<circle cx="5.6" cy="12.6" r="2.3"/><circle cx="11" cy="9.6" r="2.3"/><circle cx="12.4" cy="15.6" r="2.3"/><circle cx="17.6" cy="11.6" r="2.3"/>',
    2: '<circle cx="5.8" cy="12.6" r="3"/><circle cx="9.8" cy="11.4" r="3.2"/><circle cx="14" cy="12.7" r="3.1"/><circle cx="18.2" cy="11.7" r="3"/>',
    3: '<rect x="4.5" y="7.5" width="15" height="9" rx="4.5"/>',
    4: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/>',
    5: '<ellipse cx="4.9" cy="13.4" rx="3.1" ry="2.6"/><ellipse cx="12" cy="10.8" rx="3.1" ry="2.6"/><ellipse cx="19.1" cy="13.4" rx="3.1" ry="2.6"/>',
    6: '<path d="M2.6 15.4c0-1.9 1.5-2.6 3-2.9.6-1.9 2.6-2.8 4.4-2.1 1.3-1.5 3.6-1.6 4.9-.2 1.7-.6 3.6.5 3.9 2.2 1.5.3 2.6 1.3 2.6 2.7 0 .9-.7 1.6-1.6 1.6H4.2c-.9 0-1.6-.6-1.6-1.3z"/>',
    7: '<path class="ap-gl-st" d="M2.6 9.6c1.6-1.5 3.2-1.5 4.8 0s3.2 1.5 4.8 0 3.2-1.5 4.8 0 3.2 1.5 4.8 0"/><path class="ap-gl-st" d="M2.6 14.8c1.6-1.5 3.2-1.5 4.8 0s3.2 1.5 4.8 0 3.2-1.5 4.8 0 3.2 1.5 4.8 0"/>'
  };
  RU.glyph = (k, cls = "") => `<svg class="ap-gl ${cls}" viewBox="0 0 24 24" aria-hidden="true">${GL[k] || ""}</svg>`;
  const formGlyph = (e, mode) => RU.glyph(L.glyphOf(e, mode));

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

  /* ============ build-core: the model helpers every chart and day mark reads (claude/Florin data viz.md, C1) ============
     They belong with the rest of L in refresh-data.js; they sit here, on L, because this pass doesn't own that file (to
     move there as they are). Pure, no DOM. The week card, Insights, History, Your days, Easy, Ask Florin and the data
     looks count days, name why a day sat outside the usual and say the symptoms through these, so they all agree. */
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const andJoin = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const NUMW = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  /* the one wording for a flagged today, everywhere (RU.FLAG_DAY is the same string) */
  L.FLAG_DAY = L.FLAG_DAY || "Today has a log noted for a clinician, so it isn't read against your usual.";
  /* a day's name in a sentence about the last 7 days: Today, never its weekday; any other day its weekday */
  L.dayName = (d) => (d === L.TODAY ? "Today" : Ut.DOWL[dateOf(d).getDay()]);
  /* L.span with an optional last day (today by default), so a card can be drawn to any day and count what Insights
     would have counted then */
  if (!L.span.withEnd) {
    const span0 = L.span;
    L.span = (M, n, mode, end) => {
      if (end == null || end >= L.TODAY) return span0(M, n, mode);
      const d0 = Math.max(M.start, end - n + 1);
      return M.days.filter((x) => x.d >= d0 && x.d <= end).map((x) => L.facts(M, x, mode));
    };
    L.span.withEnd = true;
  }
  /* a stretch's days, counted the one way every screen counts them: the days within your usual out of the days read
     either way (within or outside). A day that could be either, or one logged with nothing about BMs, is counted
     neither way, never as a shift; left says which, by name (named) or by count. A flagged today is in neither count
     (L.FLAG_DAY). F is L.span's facts. Moved from library/js/looks-data.js, same output */
  L.tally = (F, named) => {
    const lg = F.filter((f) => f.logged), by = (s) => lg.filter((f) => f.state === s);
    const within = by("usual"), shifted = by("shifted"), unsure = by("unsure"), noc = by("nocount"), flag = by("flag");
    const nm = (f) => (f.today ? "today" : Ut.DOWL[dateOf(f.d).getDay()]);
    const who = (a) => cap1(named ? andJoin(a.map(nm)) : plural(a.length, "day"));
    const notC = (a) => `so ${a.length === 1 ? "it isn't" : "they aren't"} counted`;
    const past = noc.filter((f) => !f.today), now = noc.some((f) => f.today);
    const left = [
      unsure.length && `${who(unsure)} could be either, ${notC(unsure)}.`,
      past.length && `${who(past)} had nothing about BMs, ${notC(past)}.`,
      now && "Today has nothing about BMs yet, so it isn't counted.",
      flag.length && L.FLAG_DAY
    ].filter(Boolean).join(" ");
    return { logged: lg.length, within: within.length, shifted: shifted.length, unsure: unsure.length, nocount: noc.length, flag: flag.length, none: F.filter((f) => !f.logged && !f.pending).length, known: within.length + shifted.length, left };
  };
  /* why a day sat where it did, in the order the week card names it: No BM, more or fewer BMs than usual, a form outside
     your usual forms, then the first BM's time. reasons[0] is the line; a second reason adds its short tail. f is one
     of L.span's facts. Returns { state, word (the mark's word), reasons [{ k, text, tail, short }], line (with the
     day's name: "Wednesday: your first BM came later than usual, at 8:55 AM."), say (the same without the name, for a
     header that already names the day), sr (the short words a screen reader hears) }. o.name names the day another
     way ("Friday, Oct 9"); the default is L.dayName */
  L.dayWhy = (M, f, mode, o = {}) => {
    const u = M.usual, name = o.name || L.dayName(f.d);
    const state = f.pending ? "pending" : f.state;
    const out = { d: f.d, state, word: "", reasons: [], line: "", say: "", sr: "" };
    const cnt = () => (u.nLo === u.nHi ? `${u.nLo}` : `${u.nLo} to ${u.nHi}`);
    if (state === "pending") return Object.assign(out, { word: "Nothing logged yet", say: "Nothing logged yet today.", sr: "nothing logged yet" });
    if (state === "none") return Object.assign(out, { word: "Nothing logged", line: `Nothing logged on ${name}.`, say: "Nothing logged.", sr: "nothing logged" });
    if (state === "flag") return Object.assign(out, { word: "Noted for a clinician", line: L.FLAG_DAY, say: L.FLAG_DAY, sr: "noted for a clinician, not read against your usual" });
    if (state === "usual") return Object.assign(out, { word: "Within your usual", line: `${name}: within your usual.`, say: "Within your usual.", sr: "within your usual" });
    if (state === "logged") {
      const n = f.count;
      const what = n == null ? "symptoms or meals" : n === 0 ? "No BM" : plural(n, "BM");
      return Object.assign(out, { word: "Logged", say: "Logged.", sr: `logged, ${what}` });
    }
    if (state === "unsure") {
      const bs = f.bms.filter((b) => L.inForms(M, b, mode) === null), w = andJoin([...new Set(bs.map((b) => L.WORDS[L.wordKey(b)].word))]);
      const text = `${bs.length === 1 ? "a BM" : `${NUMW[bs.length] || bs.length} BMs`} logged as ${w} could be either side of your usual`;
      return Object.assign(out, { word: "Not counted", line: `${name} isn't counted: ${text}.`, say: `Not counted: ${text}.`, sr: `not counted, ${text}` });
    }
    if (state === "nocount") {
      const s = f.nsym > 0, m = f.meals.length > 0;
      if (f.today) return Object.assign(out, { word: "Not counted", line: "Today isn't counted yet: nothing about BMs is logged.", say: "Not counted yet: nothing about BMs is logged.", sr: "not counted yet, nothing about BMs logged" });
      const text = `only ${s && m ? "symptoms and meals were" : s ? "symptoms were" : m ? "meals were" : "notes were"} logged`;
      return Object.assign(out, { word: "Not counted", line: `${name} isn't counted: ${text}.`, say: `Not counted: ${text}.`, sr: `not counted, ${text}` });
    }
    /* outside your usual */
    const R = out.reasons;
    if (f.count === 0) R.push({ k: "none", text: `No BM, fewer than your usual ${cnt()} a day`, tail: "", short: "No BM" });
    else if (f.inCount === false) {
      const more = f.count > u.nHi;
      R.push({ k: more ? "more" : "fewer", text: `${plural(f.count, "BM")}, ${more ? "more" : "fewer"} than your usual ${cnt()} a day`, tail: `, and ${more ? "more" : "fewer"} BMs than usual`, short: `${plural(f.count, "BM")}, ${more ? "more" : "fewer"} than usual` });
    }
    if (f.formsIn === false) {
      const B = mode === "B", outB = f.bms.filter((b) => L.inForms(M, b, mode) === false);
      const firmer = outB.filter((b) => (B ? L.wordKey(b) < u.wLo : Math.max(...L.stepsOf(b)) < u.fLo));
      const n = outB.length, dir = firmer.length === n ? "firmer" : firmer.length === 0 ? "looser" : null;
      const names = andJoin([...new Set(outB.map((b) => L.formName(b, mode)))]);
      const lead = `${NUMW[n] || n} BM${n === 1 ? " was" : "s were"}`;
      R.push(dir
        ? { k: "form", text: `${lead} ${names}, ${dir} than your usual forms`, tail: `, and ${dir} than usual`, short: `${dir} than your usual forms` }
        : { k: "form", text: `${lead} outside your usual forms, ${firmer.length} firmer and ${n - firmer.length} looser`, tail: ", and a form outside your usual", short: "outside your usual forms" });
    }
    if (f.inWin === false && f.first != null) {
      const late = Math.round(f.first * 60) / 60 > u.tHi;
      R.push({ k: late ? "late" : "early", text: `your first BM came ${late ? "later" : "earlier"} than usual, at ${T(f.first)}`, tail: `, and ${late ? "later" : "earlier"} than usual`, short: `first BM ${late ? "later" : "earlier"} than usual` });
    }
    const r0 = R[0], tail = R[1] ? R[1].tail : "";
    return Object.assign(out, { word: "Outside your usual", line: r0 ? `${name}: ${r0.text}${tail}.` : `${name}: outside your usual.`, say: r0 ? `${cap1(r0.text)}${tail}.` : "Outside your usual.", sr: `outside your usual${R.length ? `, ${R.map((r) => r.short).join(", ")}` : ""}` });
  };
  /* the one symptom sentence, for the week card, Insights' Symptoms card and Ask Florin: each symptom counted once per
     day it came up; the one on the most days named (a tie names both); "both days" or "each day" when it came up every
     symptom day; its strength only when every log of it gave one; another symptom logged stronger added after. Never
     "most often". o.named (the default) names a single day ("today", "on Wednesday"); false counts it ("on 1 day").
     o.of, the days logged, makes the head "Symptoms on 2 of 6 days you logged". "" when no symptoms were logged */
  L.symLine = (F, o = {}) => {
    const named = o.named !== false, days = F.filter((f) => f.logged && f.nsym);
    if (!days.length) return "";
    const k = days.length, by = {};
    days.forEach((f) => Object.keys(f.sym).forEach((n) => (by[n] = by[n] || []).push(f)));
    const at = (n) => { const i = L.SYMPTOMS.indexOf(n); return i < 0 ? 99 : i; };
    const names = Object.keys(by).sort((a, b) => by[b].length - by[a].length || at(a) - at(b));
    const low = (s) => s.toLowerCase();
    const when = (fs) => (fs.length === 1 && named ? (fs[0].today ? "today" : `on ${L.dayName(fs[0].d)}`) : `on ${plural(fs.length, "day")}`);
    const str = (n) => {
      if (by[n].some((f) => (f.unrated && f.unrated[n]) || !f.sym[n])) return "";
      const ss = by[n].map((f) => f.sym[n]), a = Math.min(...ss), b = Math.max(...ss);
      return a === b ? low(L.STRENGTH[a - 1]) : `${low(L.STRENGTH[a - 1])} to ${low(L.STRENGTH[b - 1])}`;
    };
    const named1 = (n) => { const s = str(n); return `${s ? s + " " : ""}${low(n)}`; };
    const head = o.of != null ? `Symptoms on ${k} of ${plural(o.of, "day")} you logged` : k === 1 && named ? `Symptoms ${when(days)}` : `Symptoms on ${plural(k, "day")}`;
    if (k === 1) return `${head}: ${andJoin(names.map(named1))}${o.of != null && named ? `, ${when(days)}` : ""}.`;
    const c = by[names[0]].length, tops = names.filter((n) => by[n].length === c);
    let lead;
    if (tops.length > 1) lead = `${andJoin(tops.map(low))}, ${plural(c, "day")} each`;
    else lead = c === k ? `${named1(tops[0])} ${k === 2 ? "both days" : "each day"}` : `${named1(tops[0])} on ${plural(c, "day")}`;
    const top = Math.max(0, ...tops.flatMap((n) => by[n].map((f) => f.sym[n] || 0)));
    const strong = names.filter((n) => !tops.includes(n)).map((n) => ({ n, s: Math.max(0, ...by[n].map((f) => f.sym[n] || 0)) })).filter((x) => x.s > top).sort((a, b) => b.s - a.s)[0];
    return `${head}: ${lead}${strong ? `, and ${low(L.STRENGTH[strong.s - 1])} ${low(strong.n)} ${when(by[strong.n])}` : ""}.`;
  };
  /* what moved FloraScore, in whole points: each part's change rounded by largest remainder so the four add up to the
     change shown (delta), a part that didn't move staying 0. Added to L.scoreMoved's parts as pts */
  if (!L.scoreMoved.whole) {
    const moved0 = L.scoreMoved;
    L.scoreMoved = (M, mode) => {
      const mv = moved0(M, mode);
      if (!mv) return mv;
      const r = mv.parts.map((p) => p.delta), sum = r.reduce((s, v) => s + v, 0), abs = r.reduce((s, v) => s + Math.abs(v), 0);
      /* the parts' raw sum and the change shown can differ by the rounding of each day's score: share the difference out
         by each part's size, so a part at 0 stays at 0 */
      const adj = r.map((v) => v + (abs ? ((mv.delta - sum) * Math.abs(v)) / abs : (mv.delta - sum) / r.length));
      const base = adj.map((v) => Math.floor(v + 1e-9)), left = mv.delta - base.reduce((s, v) => s + v, 0);
      adj.map((v, i) => ({ i, f: v - base[i] })).sort((a, b) => b.f - a.f).slice(0, Math.max(0, left)).forEach((x) => base[x.i]++);
      mv.parts.forEach((p, i) => (p.pts = base[i]));
      return mv;
    };
    L.scoreMoved.whole = true;
  }

  /* how an entry reads in a list (Today's timeline and History share it) */
  RU.entryText = (e, mode) => {
    if (e.kind === "bm") {
      const extra = [...L.HOW.filter(([k]) => e.how && e.how[k]).map(([, l]) => l), e.dur != null ? L.DURATION[e.dur] : null].filter(Boolean);
      const flags = L.FLAGS.filter(([k]) => e.flags && e.flags[k]).map(([, l]) => l);
      return { title: `BM · ${L.formName(e, mode)}`, sub: extra.length ? extra.join(" · ") : L.formLine(e, mode), flags, note: e.note };
    }
    if (e.kind === "sym") {
      const names = e.items.map((i, k) => (k ? lower1(i.name) : i.name));
      const title = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
      const ss = e.items.map((i) => i.s).filter(Boolean);
      const sw = ss.length ? (Math.min(...ss) === Math.max(...ss) ? L.STRENGTH[ss[0] - 1] : `${L.STRENGTH[Math.min(...ss) - 1]} to ${lower1(L.STRENGTH[Math.max(...ss) - 1])}`) : "";
      return { title, sub: [sw, e.last != null ? L.LASTED[e.last] : ""].filter(Boolean).join(" · "), flags: [], note: e.note };
    }
    if (e.kind === "meal") return { title: L.mealLabel(e.meal), sub: e.text, flags: [], note: e.note };
    return { title: e.d === L.TODAY ? "No BM today" : "No BM that day", sub: "Logged, so the day doesn't read as a gap", flags: [], note: "" };
  };
  const entryIcon = (e, mode) => (e.kind === "bm" ? formGlyph(e, mode) : e.kind === "sym" ? ic("sym") : e.kind === "meal" ? ic("meal") : ic("nobm"));
  RU.row = (e, mode, o = {}) => {
    const t = RU.entryText(e, mode);
    return `<li><button type="button" class="ap-tl-row" data-act="edit" data-id="${esc(e.id)}">
        <span class="ap-tl-t">${esc(T(e.t))}</span>
        <span class="ap-tl-ic ap-tl-ic--${e.kind}">${entryIcon(e, mode)}</span>
        <span class="ap-tl-m"><b>${esc(t.title)}</b>${t.sub ? `<em>${esc(t.sub)}</em>` : ""}${t.flags.length ? `<span class="ap-chips">${t.flags.map((f) => chip(`Noted: ${lower1(f)}`, "info")).join("")}</span>` : ""}${t.note && !o.noNote ? `<q>${esc(t.note)}</q>` : ""}</span>
        ${ic("chev", "ap-tl-go")}
      </button></li>`;
  };

  /* one entry as a row, for Today, History and anything that lists entries (a calendar's day, say). Wrap this to change
     every list at once */
  RU.entryRow = (e, M, V, o) => RU.row(e, V.form, o);

  /* ---------- the last 7 days ----------
     The days Today's week card and Insights' 7 days count: today and the six before it (Oct 28: not Monday to today,
     which disagreed with Insights on every day but Sunday). end draws them to another day. The fields stay as they
     were (the page's notes and the check-in read them); "within your usual" counts are over the days read, never a
     flagged today. */
  RU.week = (M, mode, end) => {
    const e = end != null ? end : L.TODAY;
    const ds = Array.from({ length: 7 }, (_, i) => e - 6 + i);
    const cols = ds.map((d) => {
      const x = L.day(M, d);
      const before = !x;
      /* today with nothing in it yet isn't a gap, it just isn't over */
      const pending = !!x && d === L.TODAY && !x.entries.length;
      const logged = !!x && x.logged && !pending;
      const es = logged ? x.entries : [];
      /* today, with a flag or an alarm feature logged (RU.flagToday), is noted for a clinician and never read against
         the usual, as Today's score is */
      return { d, x, before, pending, logged, flag: logged && d === L.TODAY && RU.flagToday(M), bms: es.filter((e) => e.kind === "bm"), nobm: es.some((e) => e.kind === "nobm"), syms: es.filter((e) => e.kind === "sym"), meals: es.filter((e) => e.kind === "meal") };
    });
    const live = cols.filter((c) => !c.before && !c.pending);
    const bms = cols.flatMap((c) => c.bms);
    /* the days read against the usual: every logged day but a flagged one. rbms and rmornings are theirs, and every
       "within your usual" count is over them; bms and mornings stay every BM logged, for counts that read nothing */
    const flagged = M.usual ? cols.filter((c) => c.flag) : [];
    const read = cols.filter((c) => !flagged.includes(c));
    const rbms = read.flatMap((c) => c.bms);
    /* a B word that straddles the usual (null) is left out of the count, never called a shift */
    const ks = M.usual ? rbms.map((b) => L.inForms(M, b, mode)) : [];
    const inForms = M.usual ? ks.filter((k) => k === true).length : null;
    const unsure = ks.filter((k) => k === null).length;
    const mornings = cols.filter((c) => c.bms.length);
    const rmornings = read.filter((c) => c.bms.length);
    const inWin = M.usual ? rmornings.filter((c) => L.inWindow(M, c.bms[0].t)).length : null;
    const loggedDays = live.filter((c) => c.logged).length;
    const symDays = cols.filter((c) => c.syms.length);
    const symItems = symDays.flatMap((c) => c.syms.flatMap((s) => s.items));
    const meals = cols.reduce((s, c) => s + c.meals.length, 0);
    const formCount = {};
    bms.forEach((b) => { const k = L.formKey(b, mode); formCount[k] = (formCount[k] || 0) + 1; });
    const topForm = Object.entries(formCount).sort((a, b) => b[1] - a[1])[0];
    const gaps = live.filter((c) => !c.logged);
    /* F and tally: the same days as L.span's facts and their count, the one every screen states ("4 of 6 days") */
    const F = L.span(M, 7, mode, e), tally = L.tally(F, true);
    return { ds, cols, bms, rbms, inForms, unsure, mornings, rmornings, inWin, flagged, loggedDays, symDays, symItems, meals, topForm, gaps, F, tally };
  };

  /* ---------- one day, as a mark (claude/Florin data viz.md, section 1) ----------
     The one way a day is drawn: Today's week card, History's day headers and calendar, Your days and Easy. Shape says
     what it is, colour how it read against your usual, and a word says it again. f is one of L.span's facts.
       within your usual   a filled Plum circle (Ray on dark), the date inside
       outside your usual  a filled Gold circle, edged in Shift Ink in light, the date inside
       logged, not counted a filled Ink 3 circle (a word that could be either, only symptoms or meals, or before day 14)
       nothing logged      no circle: the date alone, in Ink 3 (and today with nothing logged yet)
       flagged today       a Teal ring with the info glyph, no fill, in no count
       today, logged       a 2px Ink ring, 2px out from its circle; the word Today under today's column
       a symptom that day  one Teal square under it, whatever the strength
     o: { M, mode (for the screen reader's words; or why, L.dayWhy's result), before (a day before the person
     started: the date alone, never named), lg or size: 32 (Easy's 32px), sym (false: no square slot), dow (the weekday
     above), today (overrides f.today: the ring and the word), todayWord (false: no Today under today), name (the screen
     reader's name for the day) }. Spans only, so a calendar can wrap it in its button */
  const DAY_K = { usual: "usual", shifted: "shift", flag: "flag", unsure: "quiet", nocount: "quiet", logged: "quiet", none: "none", pending: "none" };
  const DAY_SR = { usual: "within your usual", shifted: "outside your usual", flag: "noted for a clinician, not read against your usual", unsure: "not counted", nocount: "not counted", logged: "logged", none: "nothing logged", pending: "nothing logged yet" };
  RU.dayMark = (f, o = {}) => {
    const st = o.before ? "before" : f.pending ? "pending" : !f.logged ? "none" : f.state;
    const k = o.before ? "none" : DAY_K[st] || "quiet", lg = !!(o.lg || o.size === 32), today = o.today != null ? !!o.today : !!f.today;
    const ring = today && !o.before && (k === "usual" || k === "shift" || k === "quiet");
    const date = dateOf(f.d), sym = !o.before && f.logged && f.nsym > 0;
    const why = o.before ? null : o.why || (o.M ? L.dayWhy(o.M, f, o.mode) : null);
    const symW = sym ? `Symptoms: ${Object.entries(f.sym).map(([n, s]) => `${n.toLowerCase()}, ${s ? L.STRENGTH[s - 1].toLowerCase() : "strength not said"}`).join("; ")}.` : "";
    const name = o.name || `${f.today ? "Today, " : ""}${Ut.DOWL[date.getDay()]}, ${Ut.MONL[date.getMonth()]} ${date.getDate()}`;
    /* a day before the person started is its date alone, never named: hidden from a screen reader too */
    const words = o.before ? "" : `${name}: ${why ? why.sr : DAY_SR[st] || "logged"}.${symW ? ` ${symW}` : ""}`;
    return `<span class="ap-day ap-day--${o.before ? "before" : k}${ring ? " is-today" : ""}${lg ? " ap-day--lg" : ""}" data-day="${f.d}"${o.before ? ' aria-hidden="true"' : ""}>`
      + (o.dow ? `<span class="ap-day-w" aria-hidden="true">${esc(Ut.DOW[date.getDay()])}</span>` : "")
      + `<span class="ap-day-c" aria-hidden="true">${k === "flag" ? ic("info") : date.getDate()}</span>`
      + (o.sym === false ? "" : `<span class="ap-day-s${sym ? " is-on" : ""}" aria-hidden="true"></span>`)
      + (today && !o.before && o.todayWord !== false ? `<span class="ap-day-t" aria-hidden="true">Today</span>` : "")
      + (words ? `<span class="sr">${esc(words)}</span>` : "") + "</span>";
  };
  /* the small mark a line starts with, so the lines under a row of days are its legend: k is usual, shift, quiet, flag,
     sym (the Teal square) or none (an empty slot, so the words still line up) */
  RU.dayKey = (k) => `<i class="ap-day-k ap-day-k--${k}" aria-hidden="true">${k === "flag" ? ic("info") : ""}</i>`;

  /* ---------- what stood out today ----------
     Today's entries, ranked, one way for Score first's sentence and Day first's marked row. First a flag on a BM, or an
     alarm feature named in a note (a BM's note read with the BM net) or a symptom: never read, only routed to primary
     care. Then a shift from the person's own usual: a form outside the usual forms, a first BM outside the usual
     window, a BM past the usual count, or a No BM day. Then symptoms by strength: strong, moderate, mild, then one
     logged without a strength (never read as mild). Ties go to the earlier entry. Shifts need a usual, so before day 14
     only flags and symptoms can stand out. mode is the consistency option; without one, a form isn't read.
     Each item: { e, kind (alarm, form, late, early, more, none, sym), rank, tone (info, shift, plain), chip, alarm?, s? } */
  /* the model holds the rule (L.alarmOf, in refresh-data.js), so L.facts and every screen read a flag the same way */
  RU.alarmOf = L.alarmOf;
  /* today has a flag or an alarm feature logged: Today's score, its sentence, every week card, Insights, Ask Florin and
     the data looks then read nothing of today against the usual (L.facts gives today the state "flag") */
  RU.flagToday = (M) => todayOf(M).some((e) => !!RU.alarmOf(e));
  RU.FLAG_DAY = L.FLAG_DAY;
  const SHIFT_CHIP = { form: "Outside your usual forms", late: "Later than your window", early: "Earlier than your window", more: "More than your usual", none: "Fewer than your usual" };
  RU.standouts = (M, mode) => {
    const u = M.usual, es = todayOf(M), bms = es.filter((e) => e.kind === "bm");
    const out = [];
    es.forEach((e) => {
      const a = RU.alarmOf(e);
      if (a) { out.push({ e, kind: "alarm", rank: 4, tone: "info", chip: "Clinician note", alarm: a }); return; }
      if (e.kind === "bm" && u) {
        const i = bms.indexOf(e);
        const why = mode && L.inForms(M, e, mode) === false ? "form" : i === 0 && !L.inWindow(M, e.t) ? (Math.round(e.t * 60) / 60 > u.tHi ? "late" : "early") : i >= u.nHi ? "more" : null;
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
  /* the item that stood out, in the person's own terms: one sentence, no judgement words. An alarm names the sign and
     routes it, and reads nothing: no score, no usual */
  const nText = (a, b) => (a === b ? `${a}` : `${a} to ${b}`);
  RU.leadText = (M, mode, N) => {
    if (!N) return null;
    const e = N.e, u = M.usual;
    if (N.kind === "alarm") return N.alarm.serious ? `${N.alarm.sign}, noted in a log today: primary care is the right first stop.` : `${N.alarm.sign}, noted in a log today: if it's new for you or keeps showing up, check in with a clinician.`;
    if (N.kind === "form") return `Your ${T(e.t)} BM was ${L.formName(e, mode)}, outside your usual forms, ${L.usualFormsText(M, mode)}.`;
    if (N.kind === "late" || N.kind === "early") return `Your first BM came at ${T(e.t)}, ${N.kind === "late" ? "later" : "earlier"} than your usual ${winText(M)} window.`;
    if (N.kind === "more") { const n = L.bms(L.day(M, L.TODAY)).length; return `${WORDS[n] || n} BMs today, more than your usual ${nText(u.nLo, u.nHi)} a day.`; }
    if (N.kind === "none") return `No BM today, logged at ${T(e.t)}; your usual is ${nText(u.nLo, u.nHi)} a day.`;
    if (N.kind === "sym") { const t = RU.entryText(e, mode).title; return N.s ? `${L.STRENGTH[N.s - 1]} ${lower1(t)} at ${T(e.t)}.` : `${t} at ${T(e.t)}, strength not said.`; }
    return null;
  };

  /* ---------- the one sentence on Today ----------
     One sentence. It leads with what stood out today (RU.standouts), and with nothing that did, says how the day's
     timing sits next to the person's usual. RU.highlightOf says whether the lead is an alarm, so Today can draw it as
     the Teal note; RU.highlight is the sentence alone */
  const winBetween = (M) => `${T(M.usual.tLo).replace(/ AM$/, "")} and ${T(M.usual.tHi)}`;
  RU.highlightOf = (M, mode) => {
    /* a caller without a consistency option (a module's note quoting this sentence) reads with the phone's */
    if (!mode && window.FLORIN_EXT && window.FLORIN_EXT.api && window.FLORIN_EXT.api.S) mode = window.FLORIN_EXT.api.S.form;
    const N = RU.standouts(M, mode)[0];
    if (N) return { text: RU.leadText(M, mode, N), alarm: N.kind === "alarm", N };
    return { text: timingLine(M), alarm: false, N: null };
  };
  RU.highlight = (M, mode) => RU.highlightOf(M, mode).text;
  /* today's FloraScore with one of today's entries taken out: what that entry alone did to the score */
  RU.scoreWithout = (M, e, mode) => {
    const days = M.days.map((x) => (x.d === L.TODAY ? Object.assign({}, x, { entries: x.entries.filter((y) => y !== e) }) : x));
    return L.score(Object.assign({}, M, { days }), L.TODAY, mode);
  };
  /* what the log that stood out did to FloraScore, said after the sentence that leads with it, worked out by scoring
     today with and without it (never by crediting a part it didn't move): "Without it, FloraScore would be 80." or "It
     didn't change FloraScore." Nothing for an alarm (a flagged log is never read through the score), nothing without a
     score today. Nothing for a No BM log either (Oct 28): pricing an honest log in points reads as a cost for logging.
     Why the score moved is a membership feature, so the caller leaves it off on Free */
  RU.scoreEffect = (M, mode, N) => {
    if (!N || !N.e || N.kind === "alarm" || N.kind === "none" || !M.usual) return "";
    const s = L.score(M, L.TODAY, mode);
    if (!s || s.value == null) return "";
    const w = RU.scoreWithout(M, N.e, mode);
    if (!w || w.value == null) return "";
    return w.value === s.value ? "It didn't change FloraScore." : `Without it, FloraScore would be ${w.value}.`;
  };
  const timingLine = (M) => {
    const x = L.day(M, L.TODAY);
    const es = x ? x.entries : [];
    const bms = es.filter((e) => e.kind === "bm"), no = es.find((e) => e.kind === "nobm");
    const u = M.usual;
    if (bms.length) {
      const f = bms[0], more = bms.length - 1;
      const tail = more ? `, and ${WORDS[more].toLowerCase()} more since` : "";
      if (!u) return `Your first BM today came at ${T(f.t)}${tail}.`;
      const where = L.inWindow(M, f.t) ? "inside" : f.t > u.tHi ? "later than" : "earlier than";
      return `Your first BM came at ${T(f.t)}, ${where} your usual ${winText(M)} window${tail}.`;
    }
    if (no) return `No BM today, logged at ${T(no.t)}.`;
    if (!u) return es.length ? "No BM logged yet today." : "Nothing logged yet today.";
    return `${es.length ? "No BM logged yet today" : "Nothing logged yet today"}; your first usually comes between ${winBetween(M)}.`;
  };

  /* ---------- Your last 7 days (claude/Florin data viz.md, section 3) ----------
     One question in five seconds: how many of my last 7 days sat within my usual, and which didn't. The answer counts
     the days exactly as Insights' 7 days counts them (L.tally over L.span), then one row of seven day marks ending on
     today, then one line for each day that wasn't within the usual, each starting with that day's mark, so the lines
     are the legend. No strips, no hatch, no struck dates, no meal count, no legend. o.end draws it to another day */
  RU.weekCard = (M, mode, o = {}) => {
    const u = M.usual, end = o.end != null ? o.end : L.TODAY, d0 = end - 6;
    const F = L.span(M, 7, mode, end), T7 = L.tally(F, true);
    const lowName = (d) => (d === L.TODAY ? "today" : L.dayName(d));
    const onDays = (fs) => andJoin(fs.map((f) => (f.d === L.TODAY ? "today" : `on ${L.dayName(f.d)}`)).map((s, i) => (i && s.indexOf("on ") === 0 ? s.slice(3) : s)));
    const line = (k, text) => (k ? `<li>${RU.dayKey(k)}<span>${esc(text)}</span></li>` : `<li class="is-plain"><span>${esc(text)}</span></li>`);
    const logged = F.filter((f) => f.logged), none = F.filter((f) => !f.logged && !f.pending);
    const lines = [];
    let answer, row = true;
    if (u) {
      answer = T7.known ? `${RU.dayKey("usual")}<span><b>${T7.within} of ${plural(T7.known, "day")}</b> within your usual</span>`
        : `<span>${logged.length ? "None of the last 7 days can be read against your usual." : "Nothing logged in the last 7 days."}</span>`;
      /* outside your usual first, in day order, at most three lines: a fourth or more roll into the third */
      const sh = F.filter((f) => f.state === "shifted");
      const own = sh.length > 3 ? sh.slice(0, 2) : sh;
      own.forEach((f) => lines.push(line("shift", L.dayWhy(M, f, mode).line)));
      if (sh.length > 3) lines.push(line("shift", `Also outside your usual: ${andJoin(sh.slice(2).map((f) => lowName(f.d)))}.`));
      F.filter((f) => f.logged && (f.state === "unsure" || f.state === "nocount")).forEach((f) => lines.push(line("quiet", L.dayWhy(M, f, mode).line)));
      if (none.length) lines.push(line("none", `Nothing logged on ${andJoin(none.map((f) => L.dayName(f.d)))}.`));
      if (F.some((f) => f.state === "flag")) lines.push(line("flag", L.FLAG_DAY));
    } else if (logged.length) {
      answer = `${RU.dayKey("quiet")}<span><b>${plural(logged.length, "day")}</b> logged</span>`;
      lines.push(line("quiet", `Days show as logged until Florin knows your usual, on day ${L.LEARN_DAYS}.`));
      const nBm = F.reduce((s, f) => s + f.bms.length, 0), noBm = F.filter((f) => f.count === 0);
      if (nBm) lines.push(line("none", `${plural(nBm, "BM")} over ${plural(F.filter((f) => f.bms.length).length, "day")}${noBm.length ? `, and No BM ${onDays(noBm)}` : ""}.`));
      else if (noBm.length) lines.push(line("none", `No BM logged ${onDays(noBm)}.`));
      if (none.length) lines.push(line("none", `Nothing logged on ${andJoin(none.map((f) => L.dayName(f.d)))}.`));
    } else {
      /* (Day first and Easy say "Nothing logged yet" for today; the card counts days) */
      answer = "<span>No days logged yet.</span>";
      row = false;
      lines.push(line(null, "Your days show here as you log them."));
    }
    const sl = L.symLine(F);
    if (sl) lines.push(line("sym", sl));
    const pre = [];
    for (let d = d0; d < Math.max(d0, M.start); d++) pre.push(`<li>${RU.dayMark({ d, today: false }, { before: true, dow: true })}</li>`);
    const days = row ? `<ol class="ap-days" aria-label="${esc(`Your last 7 days, ${spanText(d0, end)}`)}">${pre.join("")}${F.map((f) => `<li>${RU.dayMark(f, { M, mode, dow: true })}</li>`).join("")}</ol>` : "";
    return `<section class="ap-card ap-wk" data-a>
        <div class="ap-card-h"><h2>Your last 7 days</h2><span class="ap-k">${esc(spanText(d0, end))}</span></div>
        <p class="ap-wk-a">${answer}</p>
        ${days}
        ${lines.length ? `<ul class="ap-wk-ls">${lines.join("")}</ul>` : ""}
        <button type="button" class="ap-link ap-wk-go" data-act="tab" data-tab="insights" data-range="7">See these days on Insights ${ic("chev")}</button>
      </section>`;
  };

  /* ============================== TODAY ==============================
     Today is a list of named parts, so a module can replace one (the data style swaps the hero and the week) or wrap
     RU.today for a different order (Day first, the Easy version). RU.todayLayout gives the Score-first order; each part
     is (M, V) -> markup, and a part with nothing to say returns "". V.checkin false takes the check-in card away. */
  const ckOn = (V) => !V || V.checkin !== false;
  RU.ckOn = ckOn;
  const todayOf = (M) => { const x = L.day(M, L.TODAY); return x ? x.entries : []; };
  RU.todayParts = {
    /* the date, the greeting and the profile button */
    top: (M) => {
      const t = dateOf(L.TODAY), hello = L.NOW < 12 ? "Good morning" : L.NOW < 17 ? "Good afternoon" : "Good evening";
      return `<header class="ap-top" data-a>
        <div class="ap-top-l"><p class="ap-date">${esc(Ut.DOWL[t.getDay()])}, ${esc(Ut.MONL[t.getMonth()])} ${t.getDate()}</p><h1 class="ap-hello">${hello}, ${esc(M.P.name)}</h1></div>
        <button type="button" class="ap-avatar" data-act="profile" aria-label="Profile">${esc(M.P.initial)}</button>
      </header>`;
    },
    /* FloraScore (refresh-insights.js draws it), or the day's one sentence before that file has loaded */
    hero: (M, V) => (RU.scoreHero ? RU.scoreHero(M, V) : `<section class="ap-hl" data-a aria-label="Today so far"><span class="ap-k ap-k--ray">Today so far</span><p class="ap-hl-line">${esc(RU.highlight(M, V && V.form))}</p></section>`),
    /* the check-in card: only when it's due, and never in the way. Its Start is secondary: Ray stays on logging */
    checkin: (M, V) => {
      if (!ckOn(V)) return "";
      const ck = M.checkin;
      const firstCk = M.checkins.filter((c) => c.answers).length === 0;
      const draft = M.ckDraft;
      const answered = draft ? draft.answers.filter((v) => v != null).length : 0;
      const ckLine = answered ? `${answered} of ${L.CHECKIN.length} answered. Pick up where you left off.` : firstCk ? `Four quick questions and an optional note, about a minute. Your first three check-ins become the starting point for every week after.` : `Four quick questions and an optional note, about a minute. Your answers are only ever compared with your own first weeks.`;
      return ck.status === "due" ? `<section class="ap-ckc" data-a aria-label="Weekly check-in">
        <div class="ap-ckc-top"><span class="ap-k">Weekly check-in</span><span class="ap-due"><i class="ap-pck-dot" aria-hidden="true"></i>${esc(dueText(M))}</span></div>
        <h2>How did this week go?</h2>
        <p>${esc(ckLine)}</p>
        <div class="ap-ckc-act"><button type="button" class="ap-btn ap-btn--2" data-act="ck-start">${answered ? "Continue" : "Start"}</button><button type="button" class="ap-btn ap-btn--line" data-act="ck-skip">Skip this week</button></div>
        <button type="button" class="ap-ckc-day" data-act="ck-day">${ic("cal")}<span>${esc(RU.ckDayText(M))}</span><b>Change</b></button>
      </section>` : ck.status === "done" ? `<button type="button" class="ap-ckc ap-ckc--done" data-act="ck-result" data-a>
        <span class="ap-ckc-ok">${ic("check")}</span><span class="ap-ckc-m"><b>Check-in saved</b><em>${esc(spanText(ck.ws, ck.ws + 6))} · ${L.baseline(M) ? "See how it compares" : "See your answers"}</em></span>${ic("chev", "ap-tl-go")}
      </button>` : "";
    },
    /* today's entries: the one timeline */
    entries: (M, V) => {
      const es = todayOf(M), empty = !es.length, late = L.isLate();
      const hasBm = es.some((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
      const tl = empty ? `<div class="ap-card ap-tl-empty"><p>Today's logs show up here, in time order.</p><div class="ap-tl-empty-act"><button type="button" class="ap-btn" data-act="open-bm">${ic("plus")}Log a BM</button>${late ? `<button type="button" class="ap-btn ap-btn--line" data-act="nobm">No BM today</button>` : ""}</div></div>`
        : `<ol class="ap-card ap-tl">${es.map((e) => RU.entryRow(e, M, V)).join("")}</ol>${!hasBm && !hasNo && late ? `<button type="button" class="ap-tl-nobm" data-act="nobm">${ic("nobm")}<span><b>No BM today?</b><em>Log it, so the day doesn't read as a gap</em></span></button>` : ""}`;
      return `<section class="ap-tlw" data-a>
        <div class="ap-card-h ap-card-h--pad"><h2>Today</h2><span class="ap-k">${empty ? "Nothing yet" : plural(es.length, "entry", "entries")}</span></div>
        ${tl}
      </section>`;
    },
    week: (M, V) => RU.weekCard(M, V.form),
    /* one next step, from what today is missing first: a meal not logged yet, then a food close to its 5 */
    next: (M, V) => {
      const mode = V.form, u = M.usual, es = todayOf(M);
      const next = (() => {
        /* meals aren't expected every day (Will, Oct 14): no nudge for a missing one. A symptom today invites what you ate */
        const symE = es.find((e) => e.kind === "sym"), ate = es.some((e) => e.kind === "meal");
        if (symE && !ate) return { line: `${symE.items.length ? symE.items[0].name : "A symptom"} logged today. If you'd like, say what you ate today: it helps Florin look for what tends to follow.`, act: ["open-meal", "Add what you ate"] };
        const left = plural(L.LEARN_DAYS - L.learnDay(M), "more day");
        /* day 1, nothing logged anywhere yet: the first thing to do */
        if (!u && !M.days.some((x) => x.entries.length)) return { line: `Log your next BM when it happens, or anything else from plus. In ${left}, Florin can start showing your usual.`, act: ["plus", "Log something"] };
        if (!u) return { line: `Keep logging as you go. In ${left}, Florin can start showing your usual.`, act: ["plus", "Log something"] };
        const fc = L.foodCounts(M, L.PATTERN_DAYS);
        const cand = L.patterns(M, mode).sparse ? null : Object.entries(fc).filter(([f, n]) => n < 5 && n >= 3 && L.FOOD_NAMES[f]).sort((a, b) => b[1] - a[1])[0];
        if (!cand) return { line: "Everything so far today is logged. Anything else, plus is one tap away.", act: ["plus", "Add something"] };
        const [name, pl] = L.FOOD_NAMES[cand[0]];
        return { line: `${name} ${pl ? "have" : "has"} come up in ${cand[1]} of your meals in the last ${L.PATTERN_DAYS} days. At 5, Insights can look for a possible pattern in what tends to follow ${pl ? "them" : "it"}.`, act: ["open-meal", "Log a meal"] };
      })();
      return `<section class="ap-card ap-nx" data-a>
        <span class="ap-k">Next step</span>
        <p>${esc(next.line)}</p>
        <button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="${next.act[0]}">${esc(next.act[1])}</button>
      </section>`;
    },
    /* symptoms on screen bring the clinician line with them */
    fine: (M, V) => {
      const symOn = todayOf(M).some((e) => e.kind === "sym") || RU.week(M, V.form).symDays.length > 0;
      return fine(symOn ? `${DISC} If a symptom is new for you or keeps showing up, talk to a clinician.` : DISC);
    }
  };
  RU.todayLayout = () => ["top", "hero", "checkin", "entries", "week", "next", "fine"];
  /* a part a module replaced, or a layout it wrapped, that throws is logged and drawn the core's way instead */
  const CORE_PARTS = Object.assign({}, RU.todayParts), CORE_LAYOUT = RU.todayLayout;
  const tryEach = (fs, ...a) => { for (const f of fs) { if (!f) continue; try { return f(...a); } catch (e) { console.error(e); } } return undefined; };
  RU.today = (M, V) => {
    const ks = tryEach([RU.todayLayout, CORE_LAYOUT], M, V) || [];
    return `<div class="ap-scr ap-today">
      ${ks.map((k) => tryEach([RU.todayParts[k], CORE_PARTS[k]], M, V) || "").join("\n")}
    </div>`;
  };

  /* ============================== PLUS MENU ============================== */
  /* the tiles. Inside Log a BM they're toggles; on the plus card each one opens Log a BM with it picked */
  RU.formTiles = (mode, sel, o = {}) => {
    /* sel: { form, word } or null. A shows the step's number and word, C the word, B one of its five words */
    const items = mode === "B"
      ? L.WORDS.map((w) => ({ attr: `data-word="${w.k}"`, on: !!sel && (sel.word === w.k || (sel.form != null && L.wordOf(sel.form) === w.k)), g: w.glyph, label: `<span class="ap-fm-w">${esc(w.word)}</span>`, aria: `${w.word}: ${w.line}` }))
      : L.TYPES.slice(1).map((t) => ({ attr: `data-form="${t.k}"`, on: !!sel && sel.form === t.k, maybe: !!sel && sel.form == null && sel.word != null && L.WORDS[sel.word].types.includes(t.k), g: t.k, label: `${mode === "A" ? `<span class="ap-fm-n">${t.k}</span>` : ""}<span class="ap-fm-w">${esc(t.short)}</span>`, aria: `${mode === "A" ? `Type ${t.k}, ` : ""}${t.short}: ${t.line}` }));
    const toggle = !o.act;
    return `<div class="ap-fm ap-fm--${mode === "B" ? "B" : "A"}${o.dark ? " ap-fm--dark" : ""}" role="${toggle ? "radiogroup" : "group"}" aria-label="${esc(o.label || "Consistency")}">${items.map((it) => `<button type="button" class="ap-fm-b${it.on ? " is-on" : it.maybe ? " is-maybe" : ""}" data-act="${o.act || "form"}" ${it.attr}${toggle ? ` role="radio" aria-checked="${it.on}"` : ""} aria-label="${esc(it.aria + (o.act ? `. ${o.actLabel || "Opens Log a BM"}` : ""))}">${RU.glyph(it.g)}${it.label}</button>`).join("")}</div>
      <div class="ap-fm-scale"><span aria-hidden="true">Harder</span>${o.guide ? `<button type="button" class="ap-gd-b" data-act="guide">${ic("info")}How to pick</button>` : ""}<span aria-hidden="true">Looser</span></div>`;
  };
  RU.ckDayText = (M) => `Due ${Ut.DOWL[M.ckDay.dow]} ${M.ckDay.when}s`;
  const dueText = (M) => ((M.checkin.when || M.ckDay.when) === "morning" ? "Due this morning" : "Due tonight");
  RU.dueText = dueText;
  /* "yesterday" inside a sentence, the weekday and date for anything older */
  const dayIn = (d) => (d === L.TODAY ? "today" : d === L.TODAY - 1 ? "yesterday" : dayName(d));

  /* a tile on the plus card saves at once only after this many BMs are logged: the first few go through the form */
  RU.QUICK_AFTER = 5;
  RU.bmCount = (M) => M.days.reduce((s, y) => s + y.entries.filter((e) => e.kind === "bm").length, 0);
  /* the plus menu, for today or (catching up) an earlier day */
  RU.plus = (M, V, st = {}) => {
    const mode = V.form;
    const d = st.d != null ? st.d : L.TODAY, isToday = d === L.TODAY;
    const x = L.day(M, d), es = x && x.logged ? x.entries : [];
    const bms = es.filter((e) => e.kind === "bm"), hasNo = es.some((e) => e.kind === "nobm");
    const ck = M.checkin;
    const k = M.ckDraft ? M.ckDraft.answers.filter((v) => v != null).length : 0;
    const ckSub = ck.status === "due" ? (k ? `${k} of ${L.CHECKIN.length} answered · pick up where you left off` : `${dueText(M)} · about a minute`) : ck.status === "done" ? `Saved for ${spanText(ck.ws, ck.ws + 6)} · ${L.baseline(M) ? "see how it compares" : "see your answers"}` : k ? `Skipped · ${k} of ${L.CHECKIN.length} answered, pick up where you left off` : "Skipped this week · you can still do it";
    const mk = L.mealFor(L.NOW);
    const mealHint = isToday && mk !== "other" ? `${L.mealLabel(mk)}, or any meal` : "Breakfast, lunch, dinner or other";
    const sub = bms.length ? `<span class="ap-k">Last BM ${isToday ? "today" : "that day"}: ${esc(T(bms[bms.length - 1].t))}</span>`
      : hasNo ? `<span class="ap-k">Logged: no BM ${isToday ? "today" : "that day"}</span>`
      : !isToday || L.isLate() ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="nobm">${ic("nobm")}Log no BM ${isToday ? "today" : "that day"}</button>` : "";
    const hid = `plus-h${V.uid}`;
    const quick = isToday && RU.bmCount(M) >= RU.QUICK_AFTER;
    /* BM logging, Full form only: one row into the form, and no tiles to log from */
    const full = V.bmUI === "full";
    /* someone who joined today has no earlier day to catch up on */
    const earlier = M.start < L.TODAY;
    const bm = full ? `<section class="ap-pbm ap-pbm--row" aria-label="BM">
        <button type="button" class="ap-pbm-h" data-act="open-bm" data-autofocus><span class="ap-pbm-ic">${RU.glyph(4)}</span><span class="ap-pbm-t"><b>Log a BM</b><em>When, consistency and details, then Save</em></span>${ic("chev")}</button>
      </section>` : `<section class="ap-pbm" aria-label="BM">
        <button type="button" class="ap-pbm-h" data-act="open-bm" data-autofocus><span class="ap-pbm-ic">${RU.glyph(4)}</span><span class="ap-pbm-t"><b>BM</b><em>${quick ? "Tap one to log it now. Add details after." : "Tap the closest one, then Save. Details are optional."}</em></span>${ic("chev")}</button>
        ${RU.formTiles(mode, null, { dark: true, act: quick ? "quick-bm" : "open-bm", actLabel: quick ? "Logs a BM now" : "Opens Log a BM", guide: true, label: quick ? "Log a BM now" : "Start a BM log with this one" })}
      </section>`;
    return `<div class="ap-psh" role="dialog" aria-modal="true" aria-labelledby="${hid}">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2 id="${hid}">${isToday ? "Add to today" : `Add to ${esc(dayIn(d))}`}</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      ${isToday ? "" : `<p class="ap-psh-day">${ic("cal")}<span>Catching up. Everything here is logged for ${esc(dayIn(d))}.</span></p>`}
      ${bm}
      ${sub ? `<div class="ap-pbm-sub">${sub}</div>` : ""}
      <div class="ap-pgrid">
        <button type="button" class="ap-pt" data-act="open-sym"><span class="ap-read-ic">${ic("sym")}</span><b>Symptoms</b><em>Bloating, pain, cramping and more</em></button>
        ${V.mealUI === "detailed" ? `<button type="button" class="ap-pt" data-act="open-meal"><span class="ap-read-ic">${ic("meal")}</span><b>Meal</b><em>${esc(mealHint)}</em></button>` : `<button type="button" class="ap-pt" data-act="open-meal"><span class="ap-read-ic">${ic("mic")}</span><b>What you ate</b><em>Say it or type it</em></button>`}
      </div>
      ${isToday && ckOn(V) ? `<button type="button" class="ap-pck${ck.status === "due" ? " is-due" : ""}" data-act="${ck.status === "done" ? "ck-result" : "ck-start"}"><span class="ap-read-ic">${ic("ck")}</span><span class="ap-pck-m"><b>Weekly check-in</b><em>${esc(ckSub)}</em></span>${ck.status === "due" ? '<i class="ap-pck-dot" aria-hidden="true"></i>' : ""}${ic("chev", "ap-tl-go")}</button>` : ""}
      ${isToday ? (earlier ? `<button type="button" class="ap-psh-ago" data-act="plus-earlier">${ic("cal")}Log for an earlier day</button>` : "") : `<button type="button" class="ap-psh-ago" data-act="plus-day" data-v="${L.TODAY}">${ic("back")}Back to today</button>`}
    </div>`;
  };

  /* catching up: which day */
  RU.earlier = (M, V) => {
    const ds = [];
    for (let d = L.TODAY - 1; d >= Math.max(M.start, L.TODAY - 7); d--) ds.push(d);
    const hid = `ea-h${V.uid}`;
    const rows = ds.map((d) => {
      const x = L.day(M, d), gap = !x || !x.logged;
      const n = gap ? 0 : x.entries.length;
      return `<li><button type="button" class="ap-ea-row" data-act="plus-day" data-v="${d}"><span class="ap-ea-m"><b>${esc(d === L.TODAY - 1 ? "Yesterday" : dayName(d))}</b><em>${gap ? "Nothing logged" : esc(plural(n, "entry", "entries"))}</em></span>${gap ? chip("Gap", "plain") : ""}${ic("chev", "ap-tl-go")}</button></li>`;
    }).join("");
    return `<div class="ap-psh" role="dialog" aria-modal="true" aria-labelledby="${hid}">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2 id="${hid}">Which day?</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      ${ds.length ? `<p class="ap-gd-lede">Pick the day, then log the way you would today. A day with nothing logged stays a gap until you add to it.</p>
      <ol class="ap-card ap-ea">${rows}</ol>` : `<p class="ap-gd-lede">You started today, so there's no earlier day to add to yet. From tomorrow, the last week shows here.</p>`}
    </div>`;
  };

  /* ============================== LOG FORMS ============================== */
  const sheetHead = (title, sub) => `<div class="ap-fsh-h"><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button><div class="ap-fsh-t"><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div><span class="ap-fsh-sp"></span></div>`;
  const whenRow = (M, st, id, label = "When") => {
    /* a week back, for catching up */
    const opts = [[L.TODAY, "Today"], [L.TODAY - 1, "Yesterday"]].concat([2, 3, 4, 5, 6].map((k) => [L.TODAY - k, `${Ut.DOW[dateOf(L.TODAY - k).getDay()]}, ${shortDate(L.TODAY - k)}`])).filter(([d]) => d >= M.start);
    if (!opts.some(([d]) => d === st.d)) opts.push([st.d, dayName(st.d)]); /* an older entry, opened from History */
    return `<div class="ap-f"><span class="ap-f-l" id="${id}-wl">${esc(label)}</span>
      <div class="ap-when" role="group" aria-labelledby="${id}-wl">
        <label class="ap-fld ap-fld--sel">${ic("cal")}<span class="sr">Day</span><select id="${id}-day" data-in="day">${opts.map(([d, l]) => `<option value="${d}"${st.d === d ? " selected" : ""}>${l}</option>`).join("")}</select>${ic("down", "ap-fld-dn")}</label>
        <label class="ap-fld">${ic("clock")}<span class="sr">Time</span><input id="${id}-time" type="time" data-in="time" value="${RU.toInput(st.t)}"></label>
      </div></div>`;
  };
  const choice = (act, items, isOn, o = {}) => `<div class="ap-chs${o.wrap ? " ap-chs--wrap" : ""}${o.grid ? " ap-chs--grid" : ""}${o.week ? " ap-chs--week" : ""}" role="${o.single ? "radiogroup" : "group"}"${o.label ? ` aria-label="${esc(o.label)}"` : ""}>${items.map(([v, l], i) => `<button type="button" class="ap-ch${o.flag ? " ap-ch--flag" : ""}${isOn(v, i) ? " is-on" : ""}" data-act="${act}" data-v="${esc(v)}" ${o.single ? `role="radio" aria-checked="${isOn(v, i)}"` : `aria-pressed="${isOn(v, i)}"`}>${isOn(v, i) && !o.noCheck ? ic("check") : ""}${esc(l)}</button>`).join("")}</div>`;
  const noteField = (id, st, ph) => `<div class="ap-f"><label class="ap-f-l" for="${id}-note">Note</label><textarea id="${id}-note" class="ap-ta" data-in="note" rows="3" placeholder="${esc(ph)}">${esc(st.note || "")}</textarea></div>`;

  /* ---------- Log a BM: one tap on a form, then optional detail ---------- */
  RU.bm = (M, V, st) => {
    const mode = V.form, id = `bm${V.uid}`;
    const x = st.form != null ? st.form : st.word != null ? { form: null, word: st.word } : null;
    const sel = x == null ? null : { form: st.form, word: st.word };
    const anyFlag = L.FLAGS.some(([k]) => st.flags[k]);
    const line = x != null ? `<b>${esc(L.formName(x, mode))}</b> · ${esc(L.formLine(x, mode))}` : `Tap the closest one. It doesn't need to be exact.`;
    return `<div class="ap-fsh" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit BM" : "Log a BM").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        ${whenRow(M, st, id)}
        <div class="ap-f">
          <div class="ap-f-lr"><span class="ap-f-l" id="${id}-fl">Consistency</span><button type="button" class="ap-gd-b" data-act="guide">${ic("info")}How to pick</button></div>
          ${RU.formTiles(mode, sel)}
          <p class="ap-fm-line${x != null ? " is-set" : ""}">${line}</p>
        </div>
        <section class="ap-xt" aria-labelledby="${id}-xt">
          <div class="ap-xt-h"><span class="ap-f-l" id="${id}-xt">Details</span><span class="ap-f-h">All optional</span></div>
          <div class="ap-f"><span class="ap-xt-l">How it went</span>${choice("how", L.HOW, (v) => !!st.how[v], { label: "How it went", wrap: true })}</div>
          <div class="ap-f"><span class="ap-xt-l">How long</span>${choice("dur", L.DURATION.map((l, i) => [i, l]), (v, i) => st.dur === i, { label: "How long", single: true })}</div>
          <div class="ap-f"><span class="ap-xt-l">Noticed any of these?</span>${choice("flag", L.FLAGS, (v) => !!st.flags[v], { label: "Noticed any of these?", flag: true, wrap: true })}
            ${anyFlag ? `<p class="ap-info">${ic("info")}<span>After you save, we'll show when to talk to a clinician. Florin won't try to read this.</span></p>` : ""}</div>
        </section>
        ${noteField(id, st, "Anything else? Optional")}
      </div>
      <div class="ap-fsh-f">
        ${x == null ? `<p class="ap-fsh-hint" id="${id}-hint">Tap the closest one above to save</p>` : ""}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-bm"${x == null ? ` aria-disabled="true" aria-describedby="${id}-hint"` : ""}>${st.edit ? "Save changes" : "Save BM"}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete this BM</button>` : ""}
      </div>
    </div>`;
  };

  /* the (i) guide: the full lines, so the tiles can stay small */
  RU.guide = (V) => {
    const m = V.form;
    const rows = m === "B" ? L.WORDS.map((w) => [w.glyph, w.word, w.line]) : L.TYPES.slice(1).map((t) => [t.k, m === "A" ? `${t.k}\u00a0·\u00a0${t.short}` : t.short, t.line]);
    const lede = m === "B" ? "Five words, from hardest to loosest. Pick the closest one; it doesn't need to be exact." : `Seven steps, from hardest to loosest${m === "A" ? ", numbered 1 to 7" : ""}. Pick the closest one; it doesn't need to be exact.`;
    return `<div class="ap-psh ap-gd" role="dialog" aria-modal="true" aria-label="How to pick">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>How to pick</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <p class="ap-gd-lede">${esc(lede)}</p>
      <ol class="ap-gd-list">${rows.map(([g, k, l]) => `<li><span class="ap-gd-ic">${RU.glyph(g)}</span><b>${esc(k)}</b><span>${esc(l)}</span></li>`).join("")}</ol>
    </div>`;
  };

  /* the question Make a report asks Ask Florin (refresh-ask.js takes the "flag-report" act): the log's sign in the
     person's words, so the answer starts on the clinician path with this log. Without the module it toasts */
  const flagQuestion = (st, f) => {
    const said = st.sign ? [lower1(st.sign)] : f.map((k) => ({ blood: "blood", mucus: "mucus", black: "a black or tar-like stool" })[k]);
    const list = said.length < 2 ? said.join("") : `${said.slice(0, -1).join(", ")} and ${said[said.length - 1]}`;
    return `I logged ${list} today. How do I bring my logs to a clinician?`;
  };
  /* after a BM with blood, mucus or a black stool: a clinician note, never a reading of it */
  /* the same note when an alarm feature is typed into a note or a symptom name (st.sign) */
  RU.flagNote = (st) => {
    const f = L.FLAGS.filter(([k]) => st.flags && st.flags[k]).map(([k]) => k);
    const serious = !!st.sign || f.includes("blood") || f.includes("black");
    const sign = st.sign ? st.sign : f.length === 1 ? { blood: "Blood in your stool", mucus: "Mucus in your stool", black: "A black or tar-like stool" }[f[0]] : f.includes("black") ? "A black stool, and more" : "Blood and mucus in your stool";
    return `<div class="ap-psh ap-fl" role="dialog" aria-modal="true" aria-label="When to see a clinician">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>Saved, with a note</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <div class="ap-ask-alarm" role="note"><span class="ap-k">When to see a clinician</span><b>${esc(sign)}</b><p>${st.sign ? "You wrote this in your log. It's worth a clinician's look soon. Florin won't try to read it." : f.includes("blood") ? "Even a small amount is worth a clinician's look soon. Florin won't try to read it." : f.includes("black") ? "A black or tar-like stool is worth a clinician's look soon. Florin won't try to read it." : "If it's new for you, keeps showing up, or comes with pain or blood, check in with a clinician. Florin won't try to read it."}</p>${f.includes("blood") || f.includes("black") || (st.signs || [st.sign]).some((x) => x === "Blood" || x === "A black or tar-like stool") ? `<p class="ap-fl-urgent">If there's a lot of blood, or you feel faint or dizzy, get urgent care now.</p>` : ""}</div>
      <p class="ap-fl-body">Primary care is the right first stop: your GP or a nurse practitioner. Your logs can go with you as a report, so you don't have to remember dates.</p>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="flag-report" data-q="${esc(flagQuestion(st, f))}" data-msg="A report of your logs to bring to a clinician: dates, BMs, symptoms and meals. That comes in the next pass." data-close="1">Make a report for your clinician</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="close">Done</button>${st.restore ? `<button type="button" class="ap-fsh-del" data-act="flag-undo">${ic("undo")}Undo this log</button>` : ""}</div>
    </div>`;
  };

  /* what a toast names after a delete */
  RU.deletedText = (e) => (e.kind === "bm" ? `BM at ${T(e.t)}` : e.kind === "sym" ? `${lower1(RU.entryText(e).title)} at ${T(e.t)}` : e.kind === "meal" ? `${L.mealLabel(e.meal).toLowerCase()} at ${T(e.t)}` : "no BM");

  /* tapping a "No BM today" entry: log a BM after all, or take it back */
  RU.nobmSheet = (st) => `<div class="ap-psh" role="dialog" aria-modal="true" aria-label="${st.d === L.TODAY ? "No BM today" : "No BM that day"}">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>${st.d === L.TODAY ? "No BM today" : `No BM ${esc(dayIn(st.d))}`}</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <p class="ap-gd-lede">Logged at ${esc(T(st.t))}, so ${st.d === L.TODAY ? "today" : "that day"} reads as a day without one, not a day you didn't log. Logging a BM later replaces it.</p>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="open-bm" data-swap="1">Log a BM instead</button><button type="button" class="ap-btn ap-btn--line ap-btn--block" data-act="delete">Take it back</button></div>
    </div>`;

  /* ---------- Log symptoms: the pills, then one strength and how long, both optional ----------
     One strength for the entry (at its worst), not a row per symptom: Will asked for one or two follow-ups, and the
     weekly check-in already asks about belly pain and bloating one by one. The time is when it started. */
  RU.sym = (M, V, st) => {
    const id = `sy${V.uid}`;
    const names = L.SYMPTOMS.concat(st.custom || []);
    const on = (n) => st.items.some((i) => i.name === n);
    const picked = st.items.length > 0;
    return `<div class="ap-fsh" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit symptoms" : "Log symptoms").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        <div class="ap-f"><div class="ap-f-lr"><span class="ap-f-l">What you're feeling</span><span class="ap-f-h">Pick any</span></div>
          ${choice("sym", names.map((n) => [n, n]), (v) => on(v), { label: "Symptoms", wrap: true })}
          ${st.adding ? `<div class="ap-sy-add"><label class="sr" for="${id}-new">Name it</label><input id="${id}-new" class="ap-in" data-in="newsym" type="text" enterkeyhint="done" placeholder="Name it" value="${esc(st.newName || "")}" autocomplete="off"><button type="button" class="ap-btn ap-btn--c" data-act="sym-add">Add</button></div>`
            : `<button type="button" class="ap-sy-more" data-act="sym-other">${ic("plus")}Something else</button>`}
        </div>
        ${picked ? `<div class="ap-f"><span class="ap-f-l">How strong at its worst</span>${choice("str", L.STRENGTH.map((l, i) => [i + 1, l]), (v) => st.s === +v, { label: "How strong at its worst", single: true })}</div>
        <div class="ap-f"><span class="ap-f-l">How long it lasted</span>${choice("last", L.LASTED.map((l, i) => [i, l]), (v, i) => st.last === i, { label: "How long it lasted", grid: true, single: true })}</div>` : ""}
        ${whenRow(M, st, id, "Started")}
        ${noteField(id, st, "Anything that came before it? Optional")}
        <p class="ap-info">${ic("info")}<span>New for you, or getting stronger? Talk to a clinician. Blood, a black stool, a fever, vomiting that won't stop, weight loss you can't explain or waking at night to go: start with primary care soon.</span></p>
      </div>
      <div class="ap-fsh-f">
        ${picked ? "" : `<p class="ap-fsh-hint" id="${id}-hint" aria-live="polite">Pick at least one to save</p>`}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-sym"${picked ? "" : ` aria-disabled="true" aria-describedby="${id}-hint"`}>${st.edit ? "Save changes" : "Save symptoms"}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete this entry</button>` : ""}
      </div>
    </div>`;
  };

  /* ---------- Log a meal: which one, then free text ----------
     The text stays free. Under it, the foods Florin recognized and how often each came up, so a missed word is
     visible and the 5-log gate is honest. Recent foods add to the text, never replace it. The time follows the
     meal until the person sets it. */
  RU.mealFoods = (M, k) => {
    const n = {};
    M.days.filter((x) => x.d > L.TODAY - 30).forEach((x) => x.entries.filter((e) => e.kind === "meal" && e.meal === k).forEach((e) => (e.foods || []).forEach((f) => (n[f] = (n[f] || 0) + 1))));
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f]) => f);
  };
  RU.mealCount = (M, st) => {
    const fs = L.matchFoods(st.text || "");
    if (!fs.length) return `<p class="ap-ml-why">Florin counts each food it recognizes. Once one comes up 5 times in ${L.PATTERN_DAYS} days, Insights can look for a possible pattern in what tends to follow it.</p>`;
    const fc = L.foodCounts(M, L.PATTERN_DAYS);
    const was = st.edit ? (L.find(M, st.edit) || {}).foods || [] : [];
    const n = (f) => (fc[f] || 0) + (was.includes(f) ? 0 : 1);
    const hit = fs.find((f) => n(f) === 5 && !was.includes(f));
    /* what the count means: a food just reaching 5, foods Insights already reads, or (meals on few days) nothing yet */
    const sparse = L.patterns(M, "C").sparse;
    const said = sparse ? `Florin counts these foods. Patterns need meals on most days, ordinary days too.` : hit ? (() => { const [nm, pl] = L.FOOD_NAMES[hit]; return `${nm} ${pl ? "have" : "has"} now come up 5 times in ${L.PATTERN_DAYS} days. Insights can look for a possible pattern in what tends to follow ${pl ? "them" : "it"}.`; })() : fs.every((f) => n(f) >= 5) ? "Insights already looks at these foods for possible patterns." : `At 5 times in ${L.PATTERN_DAYS} days, Insights can look for a possible pattern.`;
    return `<div class="ap-ml-counted"><span class="ap-ml-cl">Counted</span>${fs.map((f) => chip(`${L.FOOD_NAMES[f][0]} · ${n(f)} in ${L.PATTERN_DAYS} days`, "plain")).join("")}</div><p class="ap-ml-why">${esc(said)}</p>`;
  };
  RU.meal = (M, V, st) => {
    const id = `ml${V.uid}`;
    const C = L.MEAL_COPY[st.meal];
    /* the same meal again in one tap: the latest of this kind, before this one */
    let same = null;
    for (let i = M.days.length - 1; i >= 0 && !same; i--) {
      const x = M.days[i];
      const es = x.logged ? x.entries.filter((e) => e.kind === "meal" && e.meal === st.meal && e.id !== st.edit && (x.d < st.d || (x.d === st.d && e.t < st.t))) : [];
      if (es.length) same = { e: es[es.length - 1], d: x.d };
    }
    const tops = RU.mealFoods(M, st.meal);
    const inText = L.matchFoods(st.text || "");
    const ok = (st.text || "").trim().length > 0;
    const sameWhen = same ? (same.d === st.d ? (st.d === L.TODAY ? "earlier today" : "earlier that day") : dayIn(same.d)) : "";
    return `<div class="ap-fsh" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit meal" : "Log a meal").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        <div class="ap-f"><span class="ap-f-l">Which meal</span>${choice("meal", L.MEALS, (v) => st.meal === v, { label: "Which meal", noCheck: true, single: true })}${st.meal === "other" ? `<p class="ap-f-h">Snacks, drinks, or anything between meals.</p>` : ""}</div>
        <div class="ap-f"><label class="ap-f-l" for="${id}-text">What you had</label><textarea id="${id}-text" class="ap-ta" data-in="text" rows="3" placeholder="${esc(C.ph)}">${esc(st.text || "")}</textarea>
          <div class="ap-ml-count" aria-live="polite">${RU.mealCount(M, st)}</div>
        </div>
        ${same || tops.length ? `<div class="ap-f"><span class="ap-f-l">From your recent ${esc(C.recent)}</span>
          ${same ? `<button type="button" class="ap-ml-same" data-act="meal-same" data-v="${esc(same.e.text)}">${ic("repeat")}<span><b>Same as ${esc(sameWhen)}</b><em>${esc(same.e.text)}</em></span></button>` : ""}
          ${tops.length ? `<div class="ap-ml-foods"><span class="ap-f-h">Add a food</span>${choice("meal-food", tops.map((k) => [k, L.FOOD_NAMES[k][0]]), (v) => inText.includes(v), { label: "Add a food", wrap: true, noCheck: true })}</div>` : ""}
        </div>` : ""}
        ${whenRow(M, st, id)}
        ${st.autoT ? `<p class="ap-f-h ap-ml-auto">${esc(st.autoT)}</p>` : ""}
      </div>
      <div class="ap-fsh-f">
        ${ok ? "" : `<p class="ap-fsh-hint" id="${id}-hint" aria-live="polite">Type what you had, then save</p>`}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-meal"${ok ? "" : ` aria-disabled="true" aria-describedby="${id}-hint"`}>${st.edit ? "Save changes" : esc(C.save)}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete this entry</button>` : ""}
      </div>
    </div>`;
  };

  /* ---------- the quick meal log (Will, Oct 14) ----------
     Meal logging happens when things feel off, so it has to be as quick as saying it. A big voice button and one box for
     the whole day; Florin picks out the foods as the words land. The prototype plays a sample instead of the microphone */
  RU.WAVE = Array.from({ length: 24 }, (_, i) => 8 + Math.round(Math.abs(Math.sin(i * 1.7) * 18 + Math.cos(i * 0.6) * 6)));
  RU.mealQuick = (M, V, st) => {
    const id = `mq${V.uid}`, on = st.voice === "listening";
    const ok = (st.text || "").trim().length > 0;
    const state = on ? "Listening" : st.voice === "done" ? "Got it. Change anything below." : "Tap and say what you ate";
    return `<div class="ap-fsh ap-mq" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      ${sheetHead(st.edit ? "Edit what you ate" : "What you ate").replace("<h2>", `<h2 id="${id}-h">`)}
      <div class="ap-fsh-b">
        <p class="ap-mq-lede">The whole day in one go is enough. Florin picks out the foods.</p>
        <div class="ap-mq-voice${on ? " is-on" : ""}${st.voice === "done" ? " is-done" : ""}">
          <button type="button" class="ap-mq-mic" data-act="mq-mic" aria-pressed="${on}" aria-label="${on ? "Stop listening" : "Say what you ate"}"><span class="ap-mq-rings" aria-hidden="true"><i></i><i></i><i></i></span>${ic(on ? "close" : "mic")}</button>
          <span class="ap-mq-state" aria-live="polite">${esc(state)}</span>
          <span class="ap-mq-wave" aria-hidden="true">${RU.WAVE.map((h, i) => `<i style="--h:${h}px;--i:${i}"></i>`).join("")}</span>
        </div>
        <div class="ap-f"><label class="ap-f-l" for="${id}-text">${st.voice === "done" ? "What you said" : "Or type it"}</label><textarea id="${id}-text" class="ap-ta ap-mq-text" data-in="text" rows="4" placeholder="${esc(L.MEAL_COPY.day.ph)}">${esc(st.text || "")}</textarea>
          <div class="ap-ml-count" aria-live="polite">${RU.mealCount(M, st)}</div>
        </div>
        ${whenRow(M, st, id)}
      </div>
      <div class="ap-fsh-f">
        ${ok ? "" : `<p class="ap-fsh-hint" id="${id}-hint" aria-live="polite">Say it or type it, then save</p>`}
        <button type="button" class="ap-btn ap-btn--block" data-act="save-meal"${ok ? "" : ` aria-disabled="true" aria-describedby="${id}-hint"`}>${st.edit ? "Save changes" : "Save what you ate"}</button>
        ${st.edit ? `<button type="button" class="ap-fsh-del" data-act="delete">${ic("trash")}Delete this entry</button>` : ""}
      </div>
    </div>`;
  };

  /* ============================== WEEKLY CHECK-IN ============================== */
  /* a 13-week trend for one question: the first three weeks as a band (named in words right under the chart), each
     week a dot on four labelled steps, this week ringed. A table twin for screen readers */
  RU.ckTrend = (M, qi, cur) => {
    const q = L.CHECKIN[qi];
    const weeks = M.checkins.concat(cur != null ? [{ w: 12, answers: Object.assign([], { [qi]: cur }) }] : []);
    const b = L.baseline(M);
    const W = 318, H = 100, left = 76, right = 12, top = 8, bot = 80;
    const X = (i) => +(left + (i / 12) * (W - left - right)).toFixed(1);
    const Y = (v) => +(bot - (v / 3) * (bot - top)).toFixed(1);
    const band = b ? `<rect class="c-band" x="${left - 8}" y="${(Y(b[qi].hi) - 8).toFixed(1)}" width="${W - left - right + 16}" height="${(Y(b[qi].lo) - Y(b[qi].hi) + 16).toFixed(1)}" rx="4"/>` : "";
    const grid = [0, 1, 2, 3].map((v) => `<line class="ap-ckt-grid" x1="${left - 8}" x2="${W - right + 4}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ap-ckt-y" x="0" y="${Y(v) + 3.5}">${esc(q.ticks[v])}</text>`).join("");
    const xs = `<text class="ap-ckt-x" x="${X(0)}" y="${H - 4}" text-anchor="start">${esc(shortDate(0))}</text><text class="ap-ckt-x" x="${X(12)}" y="${H - 4}" text-anchor="end">This week</text>`;
    /* the newest answered week is ringed: this week once it's in, the last one before that */
    const answered = weeks.filter((c) => c.answers && c.answers[qi] != null), last = answered[answered.length - 1];
    /* every week's dot 8px across (marks are 8px or more), this week's ringed */
    const dots = answered.map((c) => `<circle class="ap-ckt-dot${c === last ? " is-now" : ""}" cx="${X(c.w)}" cy="${Y(c.answers[qi])}" r="4"/>`).join("");
    const now = last ? `<circle class="ap-ckt-ring" cx="${X(last.w)}" cy="${Y(last.answers[qi])}" r="8"/>` : "";
    const lbl = `${q.label}, each week since ${shortDate(0)}.${cur != null ? ` This week: ${q.opts[cur].toLowerCase()}.` : last ? ` Latest, the week of ${shortDate(last.w * 7)}: ${q.opts[last.answers[qi]].toLowerCase()}.` : ""}${b ? (b[qi].lo === b[qi].hi ? ` Your first three weeks were ${q.opts[b[qi].lo].toLowerCase()}.` : ` Your first three weeks ran from ${q.opts[b[qi].lo].toLowerCase()} to ${q.opts[b[qi].hi].toLowerCase()}.`) : ""}`;
    const table = `<table class="sr"><caption>${esc(q.label)} by week</caption><tbody>${weeks.map((c) => `<tr><th scope="row">${esc(c.w === 12 ? "This week" : `Week of ${shortDate(c.w * 7)}`)}</th><td>${esc(c.answers && c.answers[qi] != null ? q.opts[c.answers[qi]] : "Skipped")}</td></tr>`).join("")}</tbody></table>`;
    return `<svg class="ap-ckt" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(lbl)}">${band}${grid}${xs}${dots}${now}</svg>${table}`;
  };

  RU.ck = (M, V, st) => {
    const id = `ck${V.uid}`;
    const ck = M.checkin;
    const span = spanText(ck.ws, ck.ws + 6);
    const nq = L.CHECKIN.length, n = nq + 1;
    const done = st.step > nq;
    const prog = `<div class="ap-ck-prog" role="img" aria-label="${esc(st.step < nq ? `Question ${st.step + 1} of ${nq}` : "Last step, optional")}">${Array.from({ length: n }, (_, i) => `<i class="${i < st.step ? "is-done" : i === st.step ? "is-on" : ""}"></i>`).join("")}</div>`;
    /* question 1 has one way out (Later); after it, Back. The result closes */
    const lead = done ? `<button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button>` : st.step > 0 ? `<button type="button" class="ap-lg-x" data-act="ck-back" aria-label="Back">${ic("back")}</button>` : `<span class="ap-fsh-sp"></span>`;
    const head = `<div class="ap-ck-h">${lead}<div class="ap-fsh-t"><h2 id="${id}-h">Weekly check-in</h2><p>${esc(span)}</p></div>${done ? `<span class="ap-fsh-sp"></span>` : `<button type="button" class="ap-ck-later" data-act="close">${M.checkin.status === "done" ? "Cancel" : "Later"}</button>`}</div>`;
    let body;
    if (st.step < nq) {
      const q = L.CHECKIN[st.step];
      const a = st.answers[st.step];
      body = `${prog}<div class="ap-ck-q"><span class="ap-k">${st.step + 1} of ${nq}</span><h3 tabindex="-1">${esc(q.q)}</h3><p class="ap-ck-recall">Think about the last 7 days, ${esc(span)}.</p></div>
        <div class="ap-ck-opts" role="radiogroup" aria-label="${esc(q.q)}">${q.opts.map((o, i) => `<button type="button" class="ap-ck-opt${a === i ? " is-on" : ""}" data-act="ck-ans" data-v="${i}" role="radio" aria-checked="${a === i}"><span>${esc(o)}</span>${a === i ? ic("check") : ""}</button>`).join("")}</div>
        ${a != null ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c ap-ck-next" data-act="ck-next">Next</button>` : ""}`;
    } else if (st.step === nq) {
      body = `${prog}<div class="ap-ck-q"><span class="ap-k">Optional</span><h3 tabindex="-1">Anything else to note about this week?</h3></div>
        ${choice("ck-tag", L.CHECKIN_TAGS.concat(M.P.cycle ? ["Period"] : []).map((t) => [t, t]), (v) => st.tags.includes(v), { label: "This week", wrap: true })}
        <div class="ap-f"><label class="ap-f-l" for="${id}-note">Note</label><textarea id="${id}-note" class="ap-ta" data-in="cknote" rows="3" placeholder="Optional">${esc(st.note || "")}</textarea></div>
        <div class="ap-ck-fin"><button type="button" class="ap-btn ap-btn--block" data-act="ck-finish">Finish</button></div>`;
    } else {
      const b = L.baseline(M);
      const first = M.checkins.filter((c) => c.answers);
      const rows = L.CHECKIN.map((q, i) => {
        const cmp = L.compare(b, i, st.answers[i]);
        const words = b ? `First three weeks: ${q.opts[b[i].lo].toLowerCase()}${b[i].lo === b[i].hi ? "" : ` to ${q.opts[b[i].hi].toLowerCase()}`}.` : "";
        return `<li class="ap-ckr-row"><div class="ap-ckr-top"><span class="ap-k">${esc(q.label)}</span>${cmp ? chip(cmp.text, cmp.k === "same" ? "usual" : "shift") : ""}</div><b>${esc(q.opts[st.answers[i]])}</b>${b ? `${RU.ckTrend(M, i, st.answers[i])}<p class="ap-ckr-w">${esc(words)}</p>` : ""}</li>`;
      }).join("");
      body = `<div class="ap-ckr">
          <span class="ap-k">${esc(span)} · Saved</span>
          <h3 tabindex="-1">${b ? "This week, next to your first weeks" : "Your first check-in is saved"}</h3>
          <p class="ap-ckr-lede">${b ? `Compared only with your first three check-ins, ${esc(spanText(first[0].ws, first[2].ws + 6))}. Each chip says whether this week is about the same as then, or moved, and which way. No score and no severity labels.` : "This is your starting point. After three check-ins, each week is compared with these first ones. No score and no severity labels, only you next to you."}</p>
          ${(() => {
            /* the week's own logs next to the answers, counted as Today's card and Insights count them: days within your
               usual out of the days read, and the one symptom sentence (Oct 28: not BMs here and mornings there) */
            if (!M.usual) return "";
            const Fk = L.span(M, 7, V.form, Math.min(ck.ws + 6, L.TODAY)), Tk = L.tally(Fk, true), sl = L.symLine(Fk);
            return `<div class="ap-ckr-logs"><span class="ap-k">Your logs this week</span><ul><li>${Tk.known ? `<b>${Tk.within} of ${plural(Tk.known, "day")}</b> within your usual` : "No day this week can be read against your usual yet"}</li><li>${esc(sl || "No symptoms logged this week.")}</li></ul></div>`;
          })()}
          ${b ? `<div class="ap-legend"><span><i class="sw sw--band"></i>Your first three weeks</span><span><i class="sw ap-ckt-sw--past"></i>Each week</span><span><i class="sw ap-ckt-sw--now"></i>This week</span></div>` : ""}
          <ul class="ap-ckr-list">${rows}</ul>
          ${st.tags.length || st.note ? `<p class="ap-ckr-note">${ic("note")}<span>${esc([st.tags.join(", "), st.note].filter(Boolean).join(". "))}</span></p>` : ""}
          <p class="ap-info">${ic("info")}<span>New for you, or getting stronger? Talk to a clinician. Blood, a black stool, a fever, vomiting that won't stop, weight loss you can't explain or waking at night to go: start with primary care soon.</span></p>
          <div class="ap-ck-fin"><button type="button" class="ap-btn ap-btn--block" data-act="close">Done</button>${st.preview ? "" : `<button type="button" class="ap-link" data-act="ck-edit">Change an answer</button>`}<button type="button" class="ap-link" data-act="idetail" data-k="ck">See the trend on Insights ${ic("chev")}</button></div>
          ${fine(DISC)}
        </div>`;
    }
    return `<div class="ap-ck" role="dialog" aria-modal="true" aria-labelledby="${id}-h">${head}<div class="ap-ck-b">${body}</div></div>`;
  };

  RU.ckDay = (M, st) => `<div class="ap-psh" role="dialog" aria-modal="true" aria-label="When your check-in is due">
      <div class="ap-sheet-grab" aria-hidden="true"></div>
      <div class="ap-psh-h"><h2>When should it be due?</h2><button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button></div>
      <div class="ap-f"><span class="ap-f-l">Day</span>${choice("ckd-dow", Ut.DOW.map((d, i) => [i, d]), (v, i) => st.dow === i, { label: "Day", noCheck: true, single: true, week: true })}</div>
      <div class="ap-f"><span class="ap-f-l">Time</span>${choice("ckd-when", [["morning", "Morning"], ["evening", "Evening"]], (v) => st.when === v, { label: "Time", single: true })}</div>
      <p class="ap-fine">One reminder when it's due. Skipping is fine; it never blocks logging or Insights.</p>
      <div class="ap-fl-act"><button type="button" class="ap-btn ap-btn--block" data-act="ckd-save">Save</button></div>
    </div>`;

  /* ============================== HISTORY (basic) ==============================
     RU.history lists the days, newest first; RU.historyDay draws one day and RU.entryRow one entry, so a calendar can
     show the same day the same way. The weekly check-in isn't an entry, so History has none to hide when it's off. */
  const keepFor = (F) => (e) => F === "all" || (F === "bm" && (e.kind === "bm" || e.kind === "nobm")) || (F === "sym" && e.kind === "sym") || (F === "meal" && e.kind === "meal") || (F === "note" && e.note);
  /* one day: its mark and its name, one line on how it sat against the usual (L.dayWhy: the same mark and words as
     Today's card, so a day reads the same everywhere), how many entries, then the rows, or the gap with Add to this
     day. The day carries the reading once, in its header: the rows stay as they are (no chip on a BM row, which would
     double Day first's chip and read a flagged today). d is a day number or a day; entries defaults to everything
     logged that day (History passes the filtered ones) */
  RU.historyDay = (M, V, d, entries) => {
    const x = typeof d === "number" ? L.day(M, d) : d;
    if (!x) return "";
    const es = entries || (x.logged ? x.entries : []);
    const isToday = x.d === L.TODAY;
    const f = L.facts(M, x, V.form), why = L.dayWhy(M, f, V.form, { name: dayName(x.d) });
    /* the line under the name: what was different, or within; a gap says so in its body; a learning day has none */
    const say = f.state === "none" || f.pending || f.state === "logged" ? "" : why.say;
    return `<section class="ap-hd" data-a>
        <div class="ap-hd-h">${RU.dayMark(f, { M, mode: V.form, why, todayWord: false })}<div class="ap-hd-t"><h2>${esc(dayName(x.d))}</h2>${say ? `<p class="ap-hd-why">${esc(say)}</p>` : ""}</div><span class="ap-k">${x.logged ? (es.length ? plural(es.length, "entry", "entries") : isToday ? "Nothing yet" : "Nothing logged") : "Nothing logged"}</span></div>
        ${x.logged ? (es.length ? `<ol class="ap-card ap-tl">${es.map((e) => RU.entryRow(e, M, V)).join("")}</ol>` : `<p class="ap-hd-none">Nothing logged yet.</p>`) : `<div class="ap-hd-gap"><p class="ap-hd-none">Nothing logged this day. It stays a gap, never a zero.</p><button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="plus-day" data-v="${x.d}">${ic("plus")}Add to this day</button></div>`}
      </section>`;
  };
  RU.history = (M, V, st) => {
    const F = st.filter || "all", keep = keepFor(F);
    const days = M.days.slice().reverse().slice(0, st.n || 14);
    const total = M.days.reduce((s, x) => s + (x.logged ? x.entries.length : 0), 0);
    const groups = days.map((x) => {
      const es = x.logged ? x.entries.filter(keep) : [];
      if (x.logged && !es.length && F !== "all") return "";
      return RU.historyDay(M, V, x, es);
    }).join("");
    const since = total ? `${plural(total, "entry", "entries")} since ${shortDate(M.start)}` : `Started ${M.start === L.TODAY ? "today" : `on ${shortDate(M.start)}`}. Nothing logged yet.`;
    const report = `A report of your logs to bring to a clinician: dates, BMs, symptoms${ckOn(V) ? ", meals and check-ins" : " and meals"}. That comes in the next pass.`;
    return `<div class="ap-scr ap-hist">
      <header class="ap-hist-top" data-a><h1 class="ap-h1">History</h1><p class="ap-hi-sub">${esc(since)}</p></header>
      ${V.plan === "free" ? `<button type="button" class="ap-hist-rep" data-a data-act="pay" data-pay="report">${ic("report")}<span><b>Make a report for your clinician</b><em>With Florin membership</em></span>${RU.icon("lock", "ap-tl-go")}</button>` : `<button type="button" class="ap-hist-rep" data-a data-act="toast" data-msg="${esc(report)}">${ic("report")}<span><b>Make a report for your clinician</b><em>Your logs, so you don't have to remember dates</em></span>${ic("chev", "ap-tl-go")}</button>`}
      <div class="ap-hist-f" role="group" aria-label="Show" data-a>${[["all", "All"], ["bm", "BMs"], ["sym", "Symptoms"], ["meal", "Meals"], ["note", "Notes"]].map(([k, l]) => `<button type="button" class="ap-hi-filter" data-act="hfilter" data-v="${k}" aria-pressed="${F === k}">${l}</button>`).join("")}</div>
      ${groups}
      ${(st.n || 14) < M.days.length ? `<button type="button" class="ap-btn ap-btn--line ap-hi-more" data-act="hmore" data-a>Show earlier days</button>` : ""}
      ${RU.historyNext(M, V)}
      ${fine(`${DISC} If a symptom is new for you or keeps showing up, talk to a clinician.`)}
    </div>`;
  };
  /* one next step: the latest gap this past week, or nothing to catch up on */
  RU.historyNext = (M) => {
    const g = M.days.slice().reverse().find((x) => !x.logged && x.d >= L.TODAY - 7);
    const line = g ? `${dayName(g.d)} has no logs. If you remember it, add it now.` : M.start === L.TODAY ? "Each day you log shows here, newest first. Start with plus whenever something happens." : "Nothing to catch up on this past week. Keep logging as you go.";
    const act = g ? `<button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="plus-day" data-v="${g.d}">Add to ${esc(Ut.DOWL[dateOf(g.d).getDay()])}</button>` : `<button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="plus">Log something</button>`;
    return `<section class="ap-card ap-nx" data-a><span class="ap-k">Next step</span><p>${esc(line)}</p>${act}</section>`;
  };

  /* the core's own screens, kept before any module wraps them: the phone falls back to these when a wrapper throws.
     refresh-insights.js adds Insights, its details, Ask and the paywall */
  RU.core = Object.assign(RU.core || {}, { today: RU.today, history: RU.history, plus: RU.plus, earlier: RU.earlier, bm: RU.bm, sym: RU.sym, meal: RU.meal, mealQuick: RU.mealQuick, guide: RU.guide, flagNote: RU.flagNote, ck: RU.ck, ckDay: RU.ckDay, nobmSheet: RU.nobmSheet });

  /* Insights and the Ask tab live in refresh-insights.js */
})();
