/* Look: Oura. Dark first, on Forest, with an atmosphere made from the brand colours instead of a photo. FloraScore is
   an open arc gauge with your usual range on its track and a state word under the numeral; a Lora headline says the
   one big thing about today, worked out from today's logs. The parts are small shortcut rings and Contributors rows,
   readings are Vitals-style tracks with your usual as a band and a marker for now, trends are smooth lines with zone
   names on the right edge and a pill on the newest point, timing is a curved clock of the morning, and averages read
   "This week, Last 30 days, Your usual" as bars one under another. When a day this week shifted, the week card asks
   about it with the check-in's tags, as Oura asks about a night when the score moved. On the hero the shortcut rings
   carry no numerals (the parts are on their own 0 to 100 scale); the numbers are on Contributors, where each row opens
   what the part is.
   Colours: the reading (a marker, a line, a numeral) is the ink, Cream on dark and Forest on light, as Oura's white
   marks are. Your usual is Ray on dark and Plum on light; a shift either way is Gold, with a word; context is Teal.
   "Could be either" is never Gold. State words are read against the person's own usual and nothing else.
   Every number is read from D; nothing is typed. Every rule in look-oura.css sits under .lk-oura. */
(function () {
  const TAU = Math.PI * 2;
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* a point on a circle: f is the share of a full turn, clockwise from 12 o'clock */
  const pol = (cx, cy, r, f) => [r1(cx + r * Math.sin(f * TAU)), r1(cy - r * Math.cos(f * TAU))];
  const arc = (cx, cy, r, a, b) => {
    if (b - a <= 0) return "";
    const [x0, y0] = pol(cx, cy, r, a), [x1, y1] = pol(cx, cy, r, b);
    return `M${x0},${y0}A${r},${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const word = (n) => WORDS[n] || String(n);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const lower1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const DOWL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
  const dayName = (d) => (d.today ? "today" : DOWL[d.dow] || d.dow);
  const hourLbl = (h) => { const hh = ((Math.round(h) % 24) + 24) % 24; return `${hh % 12 || 12} ${hh >= 12 ? "PM" : "AM"}`; };
  const pct = (v, lo, hi) => r1(((clamp(v, lo, hi) - lo) / (hi - lo || 1)) * 100);
  /* a range in words: one value when its two ends are the same */
  const rng = (r) => (r[0] === r[1] ? String(r[0]) : `${r[0]} to ${r[1]}`);
  /* the dates a card covers: a one-day stretch (day 1) is that day, never "Oct 11 to Oct 11" */
  const spanOf = (days) => (days.length === 1 ? (days[0].today ? "Today" : days[0].label) : `${days[0].label} to ${days[days.length - 1].label}`);

  /* ---------- shared card parts ---------- */
  const card = (x, cls, label, inner) => `<article class="ou ${cls}" aria-label="${x.esc(label)}">${inner}</article>`;
  /* the card title is a heading, so a screen reader can move card to card */
  const head = (x, k, side) => `<header class="ou-h"><h3 class="ou-k">${x.esc(k)}</h3>${side || ""}</header>`;
  const dateK = (x, t) => `<span class="ou-date">${x.esc(t)}</span>`;
  /* a state word, as coloured small caps: within your usual, a shift (with its word), could be either, still learning */
  const stateW = (x, kind, t, tag) => `<${tag || "p"} class="ou-state is-${kind}">${x.esc(t)}</${tag || "p"}>`;
  const hl = (x, t, cls) => `<p class="ou-hl${cls ? ` ${cls}` : ""}">${x.esc(t)}</p>`;
  const say = (x, t) => (t ? `<p class="ou-say">${x.esc(t)}</p>` : "");
  const chip = (x, kind, t) => `<span class="ou-chip is-${kind}">${x.esc(t)}</span>`;
  const num = (v, dec, dur) => `<span class="ou-n" data-count="${v}"${dec ? ` data-dec="${dec}"` : ""} data-dur="${dur || 1000}">${dec ? Number(v).toFixed(dec) : v}</span>`;
  /* the lead: a big light numeral, its unit, then one sentence that answers the card's question */
  const lead = (x, n, of, ans) => `<div class="ou-lead"><p class="ou-big">${n}${of ? `<span class="ou-of">${x.esc(of)}</span>` : ""}</p>${ans ? `<p class="ou-ans">${x.esc(ans)}</p>` : ""}</div>`;
  const legend = (x, items) => `<ul class="ou-legend">${items.filter(Boolean).map(([k, t]) => `<li>${k ? `<i class="ou-sw ou-sw--${k}" aria-hidden="true"></i>` : ""}${x.esc(t)}</li>`).join("")}</ul>`;
  const care = (x) => `<p class="ou-care">${x.esc("A symptom that is new, strong or won't settle is worth raising with your clinician.")}</p>`;
  const CHEV = `<svg class="ou-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>`;

  /* a reading against a range: within, above or below. Gold is only ever "outside", and always comes with its word */
  const vs = (v, r) => (v == null || !r ? null : v < r[0] ? "below" : v > r[1] ? "above" : "within");
  const VS = { within: ["usual", "Within your usual"], above: ["shift", "Above your usual"], below: ["shift", "Below your usual"] };
  /* the FloraScore's own relation, as a state word: "A little above your usual range" reads "A little above your usual" */
  const scoreState = (S) => {
    if (!S.relation) return ["none", "No score yet today"];
    /* a flag today: the number stays, read against nothing, in Teal as the primary care note is */
    if (S.flag) return ["ctx", S.relation];
    return [S.relation.indexOf("Within") === 0 ? "usual" : "shift", S.relation.replace(/ range$/, "")];
  };

  /* the state of a day, as a class and a word */
  /* flag: today with a flag or an alarm feature logged, noted for a clinician and never read (Teal) */
  const DAY = { usual: ["usual", "Within your usual"], shifted: ["shift", "Outside your usual"], unsure: ["either", "Could be either"], flag: ["flag", "Noted for a clinician"], logged: ["read", "Logged"], nocount: ["nocount", "Logged, no BMs said"], none: ["gap", "Nothing logged"] };
  const dayState = (d) => (d.pending ? ["pending", "Nothing logged yet"] : DAY[d.state] || DAY.none);

  /* one BM's side of your usual forms: in, firmer, looser or either (a word that covers steps on both sides of an edge).
     In B the usual is a run of words and a BM's step is its word, so the same comparison holds */
  const sideOf = (D, f) => {
    const u = D.form.usual;
    if (!u) return null;
    /* a flagged today's BM: noted for a clinician, on neither side */
    if (f.flag) return "flag";
    if (f.within === true) return "in";
    if (f.within == null) return Math.min(...f.steps) < u[0] ? "either-lo" : "either-hi";
    return Math.min(...f.steps) > u[1] ? "looser" : "firmer";
  };
  const todayOf = (D) => { const w = D.days[7]; const t = w[w.length - 1]; return t && t.today ? t : null; };

  /* why a day shifted, in words: timing, count and forms, each against its own usual */
  const whyShift = (D, d) => {
    const out = [], tu = D.timing.usual, ou = D.often.usual;
    if (d.inWin === false && tu) out.push(`the first BM came ${d.first > tu[1] ? "later" : "earlier"} than your usual window`);
    if (d.inCount === false && ou) out.push(d.count === 0 ? "no BM was logged, fewer than your usual" : `${plural(d.count, "BM")}, ${d.count > ou[1] ? "more" : "fewer"} than your usual`);
    const sides = d.forms.map((f) => sideOf(D, f));
    const lo = sides.filter((s) => s === "looser").length, fi = sides.filter((s) => s === "firmer").length;
    if (lo) out.push(`${word(lo)} ${lo === 1 ? "BM was" : "BMs were"} looser than your usual forms`);
    if (fi) out.push(`${word(fi)} ${fi === 1 ? "BM was" : "BMs were"} firmer than your usual forms`);
    return out;
  };

  /* ---------- the one big thing about today, from today's logs ---------- */
  function bigThing(D) {
    const t = todayOf(D), tu = D.timing.usual, fu = D.form.usual;
    if (!t || t.pending || !t.logged) return tu ? "No BM logged yet today" : "Nothing logged yet today";
    /* a flag today: the primary care sentence (RU.highlight), and nothing of the day read against the usual */
    if (t.flag && D.highlight) return D.highlight;
    if (t.count === 0) return "You logged no BM today";
    if (t.count == null) return "Nothing logged about BMs yet today";
    const where = !tu || t.inWin == null ? null : t.inWin ? "in" : t.first > tu[1] ? "later" : "earlier";
    const A = where === "in" ? "Your morning landed in your usual window" : where ? `Your first BM came ${where} than your usual window` : `Your first BM came at ${t.firstText}`;
    /* a count outside your usual is the day's shift whatever the forms, so it leads (today counts as far as it has gone) */
    const ou = D.often.usual;
    if (t.inCount === false && ou && t.count > 0) return `${A}, with ${word(t.count)} ${t.count === 1 ? "BM" : "BMs"} so far, ${t.count > ou[1] ? "more" : "fewer"} than your usual ${rng(ou)}`;
    const n = t.forms.length, more = n - 1;
    if (!fu) return more ? `${A}, and ${word(more)} more since` : A;
    const sides = t.forms.map((f) => sideOf(D, f));
    const k = (s) => sides.filter((v) => v === s).length;
    const lo = k("looser"), fi = k("firmer"), ei = k("either-lo") + k("either-hi");
    const bm = (c) => (c === 1 ? "BM" : "BMs");
    if (lo && fi) return `${A}, with ${word(lo)} ${bm(lo)} looser and ${word(fi)} firmer than your usual forms`;
    if (lo || fi) { const c = lo || fi, w = lo ? "looser" : "firmer"; return n === 1 ? `${A}, in a ${w} form than your usual` : `${A}, with ${word(c)} ${bm(c)} ${w} than your usual forms`; }
    if (ei) return n === 1 ? `${A}, in a form that could be either` : `${A}, with ${word(ei)} ${bm(ei)} that could be either`;
    return n === 1 ? `${A}, in a form within your usual` : `${A}, and ${n === 2 ? "both" : `all ${word(n)}`} BMs sat within your usual forms`;
  }
  /* the sentence under it: your usual range in words (the band on the track has no label of its own), your usual window
     while there's no BM yet, then any symptom logged today. The headline already says how the morning went */
  function todaySay(D) {
    const t = todayOf(D), tu = D.timing.usual, su = D.score.usual;
    const syms = D.today.events.filter((e) => e.kind === "sym").map((e) => `${e.name} logged at ${e.text}, ${lower1(e.detail)}.`);
    const noBM = !t || t.pending || !t.logged || t.count == null;
    return [su && `Your usual range is ${rng(su)}.`, noBM && tu && `Your usual window is ${D.timing.usualText}.`, ...syms].filter(Boolean).join(" ");
  }

  /* ---------- shortcut rings: the four parts of today's score ---------- */
  function shortRings(D, x, onHero) {
    const P = D.score.partsToday || [];
    const NAMES = [["timing", "Timing"], ["often", "How often"], ["form", "Form"], ["comfort", "Comfort"]];
    const c = 22, r = 18;
    const items = NAMES.map(([k, label], i) => {
      const p = P.find((y) => y.key === k);
      const st = p ? vs(p.value, p.usual) : null;
      /* a flag today reads no part against its usual either */
      const fl = !!D.score.flag;
      const cls = !p ? "" : fl ? " is-read" : st && st !== "within" ? " is-shift" : st ? " is-usual" : " is-read";
      const tip = p ? `${label}: ${p.value} of 100 today${p.usual && !fl ? `, ${st === "within" ? "within" : st} your usual ${rng(p.usual)}` : ""}` : `${label}: fills in with your FloraScore`;
      return `<li class="ou-sr${cls}" style="--i:${i}" title="${x.esc(tip)}">
        <span class="ou-sr-r"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ou-sr-t" cx="${c}" cy="${c}" r="${r}"/>${p ? `<path class="ou-sr-a ou-sweep" pathLength="1" d="${arc(c, c, r, 0, clamp(p.value, 0, 99.9) / 100)}"/>` : ""}</svg>${p && !onHero ? `<b>${num(p.value, 0, 900)}</b>` : ""}</span>
        <span class="ou-sr-l">${x.esc(label)}</span>
      </li>`;
    }).join("");
    /* on the hero the rings carry no numerals: the parts are out of 100 on their own scale, and four numbers in the 90s over
       an 83 read as a contradiction. The ring's colour says how each part sits against its own usual; the numbers are
       on Contributors */
    const stWord = (p) => { const st = vs(p.value, p.usual); return !st ? "" : st === "within" ? " within its usual" : ` ${st} its usual`; };
    const aria = P.length ? `Today's four parts against their own usual: ${P.map((p) => `${p.label}${stWord(p)}`).join(", ")}.` : "The four parts fill in with your FloraScore.";
    return `<ul class="ou-shorts${onHero ? " is-hero" : ""}" role="img" aria-label="${x.esc(aria)}">${items}</ul>`;
  }

  /* ---------- FloraScore: the hero, an open arc gauge over the atmosphere ---------- */
  function score(D, x) {
    const S = D.score, esc = x.esc;
    const W = 326, cx = 163, cy = 116, R = 96, H = 200;
    const A0 = -0.35, A1 = 0.35; /* a 252° arc, open at the bottom */
    const fv = (v) => A0 + ((A1 - A0) * clamp(v, 0, 100)) / 100;
    const [e0x, e0y] = pol(cx, cy, R, A0), [e1x, e1y] = pol(cx, cy, R, A1);
    const ends = `<text class="ou-g-end" x="${e0x}" y="${r1(e0y + 20)}" text-anchor="middle">0</text><text class="ou-g-end" x="${e1x}" y="${r1(e1y + 20)}" text-anchor="middle">100</text>`;
    const topPct = r1(((cy + 4) / H) * 100);
    if (!S.usual) {
      const Lr = S.learning || { day: D.learning ? D.learning.day : 1, of: D.learning ? D.learning.of : 14, line: "" };
      const n = Lr.of, g = 0.008, per = (A1 - A0) / n;
      const segs = Array.from({ length: n }, (_, i) => `<path class="ou-g-seg${i < Lr.day ? " is-on ou-sweep" : ""}" style="--i:${i}" pathLength="1" d="${arc(cx, cy, R, A0 + i * per + g / 2, A0 + (i + 1) * per - g / 2)}"/>`).join("");
      return card(x, "ou--hero ou-score", "FloraScore, still learning your usual", `
        ${head(x, "FloraScore", dateK(x, D.todayLabel))}
        ${shortRings(D, x, true)}
        <div class="ou-gauge">
          <svg class="ou-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Day ${Lr.day} of ${Lr.of}. Florin is still learning your usual.`)}">${segs}${ends.replace(">0<", ">Day 1<").replace(">100<", `>Day ${Lr.of}<`)}</svg>
          <div class="ou-gauge-c" style="top:${topPct}%" aria-hidden="true"><span class="ou-g-k">Day</span><b class="ou-g-n">${num(Lr.day, 0, 700)}</b>${stateW(x, "learn", "Still learning", "span")}</div>
        </div>
        ${hl(x, bigThing(D), "is-centre")}
        ${say(x, [todaySay(D), Lr.line].filter(Boolean).join(" "))}
        <p class="ou-how" data-disclaimer>${esc("FloraScore compares you with you. It isn't a medical score, and a lower number isn't a diagnosis.")}</p>`);
    }
    const v = S.value, u = S.usual;
    const [sk, sw] = scoreState(S);
    const shift = !S.flag && v != null && (v < u[0] || v > u[1]);
    /* your usual is a band on the track itself, in your usual's colour, and named in words under the state word */
    const [ex, ey] = v != null ? pol(cx, cy, R, fv(v)) : [0, 0];
    const aria = v == null ? `No FloraScore today: ${lower1(S.why)} Your usual range is ${rng(u)}.` : S.flag ? `FloraScore today ${v}. ${S.relation}: a log is noted for a clinician.` : `FloraScore today ${v}. ${S.relation}, ${rng(u)}.`;
    /* the two ends of your usual, written just outside the track; one number when they meet */
    const endAt = (val, dx) => { const [lx, ly] = pol(cx, cy, R + 20, fv(val)); return `<text class="ou-g-ue" x="${r1(lx + dx)}" y="${r1(ly + 4)}" text-anchor="middle">${val}</text>`; };
    const bandEnds = u[1] - u[0] < 4 ? endAt(Math.round((u[0] + u[1]) / 2), 0).replace(/>\d+</, `>${rng(u)}<`) : endAt(u[0], 0) + endAt(u[1], 0);
    const svg = `<svg class="ou-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
        <path class="ou-g-trk" d="${arc(cx, cy, R, A0, A1)}"/>
        <path class="ou-g-band ou-sweep ou-sweep--fast" pathLength="1" d="${arc(cx, cy, R, fv(u[0]), fv(u[1]))}"/>
        ${ends}${bandEnds}
        ${v != null ? `<path class="ou-g-arc ou-sweep ou-sweep--slow" pathLength="1" d="${arc(cx, cy, R, A0, fv(v))}"/>
        <circle class="ou-g-dot${shift ? " is-shift" : ""}" cx="${ex}" cy="${ey}" r="7"/>` : ""}
      </svg>`;
    const centre = v != null
      ? `<b class="ou-g-n">${num(v, 0, 1300)}</b>${stateW(x, sk, sw, "span")}`
      : `<b class="ou-g-n is-sm">Not yet</b>${stateW(x, "none", "No score yet today", "span")}`;
    const sayT = v != null ? todaySay(D) : `No FloraScore today: ${lower1(S.why)} ${todaySay(D)}`;
    return card(x, "ou--hero ou-score", `FloraScore today${v != null ? `, ${v}` : ""}`, `
      ${head(x, "FloraScore", dateK(x, D.todayLabel))}
      ${shortRings(D, x, true)}
      <div class="ou-gauge">${svg}<div class="ou-gauge-c" style="top:${topPct}%" aria-hidden="true">${centre}</div></div>
      ${hl(x, bigThing(D), S.flag ? "is-centre is-flag" : "is-centre")}
      ${say(x, sayT)}
      <p class="ou-how" data-disclaimer>${esc(S.how)}</p>`);
  }

  /* ---------- the parts: Contributors rows, each a Vitals track: this week's number, the part's own usual as a band
     and this week as the marker on it, last week as a ring. Each row opens what the part is and how much it weighs ---------- */
  function parts(D, x) {
    const S = D.score, esc = x.esc, P = S.parts || [];
    if (!P.length) {
      const names = ["Timing", "How often", "Form", "Comfort"];
      const rows = names.map((n) => `<li class="ou-ct"><p class="ou-ct-top"><b>${esc(n)}</b>${stateW(x, "learn", D.learning ? "Still learning" : "Not yet", "span")}</p><span class="ou-ct-trk" aria-hidden="true"></span></li>`).join("");
      return card(x, "ou-parts", "Contributors to FloraScore, not started yet", `
        ${head(x, "Contributors")}
        ${hl(x, "The four parts fill in with your FloraScore")}
        ${say(x, D.learning ? `Florin is learning your usual first. Day ${D.learning.day} of ${D.learning.of}.` : "Each part needs this week and last week logged.")}
        <ul class="ou-cts">${rows}</ul>`);
    }
    const moved = P.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const still = P.every((p) => Math.round(p.delta) === 0); /* the score moves in whole points */
    const big = still ? "Every part is about the same as last week" : `${moved.label} moved your FloraScore most since last week, ${moved.delta > 0 ? "up" : "down"} ${Math.abs(moved.delta).toFixed(1)} points`;
    /* one scale for every row, so the four tracks can be read against each other: from a round ten under the lowest
       value shown, to 100 */
    const lo = Math.max(0, Math.floor((Math.min(...P.flatMap((p) => [p.now, p.before].concat(p.usual || []))) - 5) / 10) * 10);
    const at = (v) => pct(v, lo, 100);
    const pts = (v) => `${v > 0 ? "+" : "\u2212"}${Math.abs(v).toFixed(1)} pts`;
    const rows = P.map((p, i) => {
      const st = vs(p.now, p.usual);
      const [kind, w] = st ? VS[st] : ["read", "This week"];
      const id = `ou-${x.uid}-ct-${p.key}`;
      const same = Math.round(p.delta) === 0;
      const d = same ? "about the same as last week" : `${p.delta > 0 ? "up" : "down"} ${Math.abs(p.delta).toFixed(1)} FloraScore points since last week`;
      /* a usual of one value is a short band centred on it, so it still shows around the marker */
      const band = !p.usual ? "" : p.usual[0] === p.usual[1] ? `<i class="ou-ct-band is-pt" style="left:${at(p.usual[0])}%"></i>` : `<i class="ou-ct-band" style="left:${at(p.usual[0])}%;width:${r1(at(p.usual[1]) - at(p.usual[0]))}%"></i>`;
      const aria = `${p.label}: ${p.now} of 100 this week, ${w.toLowerCase()}${p.usual ? ` of ${rng(p.usual)}` : ""}. ${p.before} last week, ${d}.`;
      return `<li class="ou-ct" style="--i:${i}">
        <button type="button" class="ou-ct-top" aria-expanded="false" aria-controls="${id}"><b>${esc(p.label)}</b>${stateW(x, kind, w, "span")}${CHEV}</button>
        <div class="ou-ct-body" role="img" aria-label="${esc(aria)}">
          <p class="ou-ct-n" aria-hidden="true">${num(p.now, 0, 900)}</p>
          <span class="ou-ct-trk" aria-hidden="true">${band}<i class="ou-ct-lw" style="left:${at(p.before)}%"></i><i class="ou-ct-m${st && st !== "within" ? " is-shift" : ""}" style="--i:${i};left:${at(p.now)}%"></i></span>
        </div>
        <p class="ou-ct-sub" aria-hidden="true"><span>${esc(p.usual ? `Usual ${rng(p.usual)}` : "Usual not set yet")}</span><span>${esc(same ? "Same as last week" : pts(p.delta))}</span></p>
        <div class="ou-ct-more" id="${id}" hidden>
          <p>${esc(`${p.desc}. It weighs ${Math.round(p.weight * 100)} in 100 in the blend that makes your FloraScore.`)}</p>
          <p>${esc(`${p.before} last week, ${p.now} this week${p.usual ? `. Your usual for ${p.label.toLowerCase()}, ${rng(p.usual)}, is the middle of your days in the weeks that set your usual` : ""}.`)}</p>
        </div>
      </li>`;
    }).join("");
    const wk = S.weekAvg != null ? `This week's FloraScore averages ${S.weekAvg}, against ${S.lastWeekAvg} last week.` : "";
    const anyOut = P.some((p) => { const s = vs(p.now, p.usual); return s && s !== "within"; });
    return card(x, "ou-parts", "Contributors to FloraScore, this week", `
      ${head(x, "Contributors", dateK(x, "This week"))}
      ${stateW(x, "ctx", "Since last week")}
      ${hl(x, big)}
      ${say(x, wk)}
      <ul class="ou-cts">${rows}</ul>
      <p class="ou-dir is-days ou-ct-scale" aria-hidden="true"><span>${lo}</span><span>100</span></p>
      ${legend(x, [["now", "This week"], anyOut && ["now-shift", "Outside that part's usual"], ["lw", "Last week"], ["cband", "That part's usual"]])}
      <p class="ou-how" data-disclaimer>Each part is out of 100 and reads you against your own usual. Changes are in FloraScore points. FloraScore isn't a medical score.</p>`);
  }

  /* ---------- FloraScore over time: a smooth line, zone names on the right edge, a pill on the newest point ---------- */
  function trendPane(D, x, n, hidden) {
    const S = D.score, esc = x.esc, u = S.usual;
    const ser = S.series[n];
    const byD = {};
    D.days[90].forEach((d) => (byD[d.d] = d));
    /* a day with no logs is a gap in the line, even if a blended score could carry over */
    const gapDay = (s) => { const d = byD[s.d]; return !!d && !d.logged && !d.pending; };
    const vals = ser.map((s) => (s.value == null || gapDay(s) ? null : s.value));
    const nums = vals.filter((v) => v != null);
    if (!nums.length) return `<div class="ou-pane" data-span="${n}"${hidden ? " hidden" : ""}>${lead(x, "Not yet", "", "No logged days with a FloraScore yet.")}</div>`;
    const W = 326, gut = 72, PR = W - gut, top = 40, plotH = 120, H = top + plotH + 24;
    const lo = Math.floor((Math.min(...nums, u[0]) - 4) / 5) * 5, hi = Math.ceil((Math.max(...nums, u[1]) + 3) / 5) * 5;
    const xs = x.lin(0, ser.length - 1, 8, PR - 8), ys = x.lin(lo, hi, top + plotH, top);
    const yU1 = r1(ys(u[1])), yU0 = r1(ys(u[0])), yB = top + plotH;
    const out = (v) => v < u[0] || v > u[1];
    const runs = []; let cur = [];
    vals.forEach((v, i) => { if (v != null) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } });
    if (cur.length) runs.push(cur);
    const pathOf = (r) => x.C.path(r.map((i) => [xs(i), ys(vals[i])]));
    const id = `ou-${x.uid}-${n}`;
    /* the line's colour changes where it leaves your usual band: the ink inside it, Gold above or below */
    const f = (y) => r1((y - top) / plotH);
    const e = 0.012;
    const grad = `<linearGradient id="${id}-l" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top}" y2="${yB}">
        <stop offset="0" class="ou-st-shift"/><stop offset="${clamp(f(yU1) - e, 0, 1)}" class="ou-st-shift"/><stop offset="${clamp(f(yU1) + e, 0, 1)}" class="ou-st-read"/>
        <stop offset="${clamp(f(yU0) - e, 0, 1)}" class="ou-st-read"/><stop offset="${clamp(f(yU0) + e, 0, 1)}" class="ou-st-shift"/><stop offset="1" class="ou-st-shift"/></linearGradient>
      <linearGradient id="${id}-a" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top}" y2="${yB}"><stop offset="0" class="ou-st-area"/><stop offset="1" class="ou-st-none"/></linearGradient>`;
    /* the zones: names on the right edge, each in the middle of its own zone, and only where there's room */
    const zone = (y0, y1, l1, l2, cls) => {
      const h = y1 - y0, m = (y0 + y1) / 2;
      if (h < 12) return "";
      return h >= 26 && l2 ? `<text class="ou-zl${cls}" x="${W}" y="${r1(m - 2)}" text-anchor="end">${esc(l1)}</text><text class="ou-zl${cls}" x="${W}" y="${r1(m + 10)}" text-anchor="end">${esc(l2)}</text>`
        : `<text class="ou-zl${cls}" x="${W}" y="${r1(m + 4)}" text-anchor="end">${esc(cls || !l2 ? l1 : `${l1} usual`)}</text>`;
    };
    const zones = zone(top, yU1, "Above", "your usual", "") + zone(yU1, yU0, "Your usual", `${u[0]} to ${u[1]}`, " is-usual") + zone(yU0, yB, "Below", "your usual", "");
    const li = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
    const last = ser[li], lv = vals[li], lx = r1(xs(li)), ly = r1(ys(lv));
    const solo = new Set(runs.filter((r) => r.length === 1).map((r) => r[0]));
    const dots = [...solo].filter((i) => i !== li).map((i) => `<circle class="ou-tdot${out(vals[i]) ? " is-shift" : ""}" cx="${r1(xs(i))}" cy="${r1(ys(vals[i]))}" r="3"/>`).join("");
    /* x labels: the first day, the middle and Today for 30 days; the start of each month and Today for 90 */
    let xl = [];
    if (n <= 30) { const mid = Math.floor((ser.length - 1) / 2); xl = [[0, ser[0].label, "start"], [mid, ser[mid].label, "middle"]]; }
    else ser.forEach((s, i) => { if (i > 0 && /\s1$/.test(s.label)) xl.push([i, s.label.split(" ")[0], "middle"]); });
    xl = xl.filter(([i]) => xs(ser.length - 1) - xs(i) > 40);
    xl.push([ser.length - 1, ser[ser.length - 1].today ? "Today" : ser[ser.length - 1].label, "end"]);
    const xlab = xl.map(([i, t, a]) => `<text class="ou-xt${t === "Today" ? " is-today" : ""}" x="${r1(i === 0 && a === "start" ? 4 : xs(i) + (a === "end" ? 6 : 0))}" y="${H - 6}" text-anchor="${a}">${esc(t)}</text>`).join("");
    /* the pill on the newest point, kept inside the plot */
    const pillT = `${lv} · ${last.today ? "Today" : last.label}`, pw = r1(pillT.length * 6.4 + 24);
    const px = r1(clamp(lx - pw / 2, 0, PR - pw));
    /* a flagged today keeps its point, read against nothing: in none of the counts */
    const rd = vals.filter((v, i) => v != null && !ser[i].flag);
    const within = rd.filter((v) => !out(v)).length, above = rd.filter((v) => v > u[1]).length, below = rd.filter((v) => v < u[0]).length;
    const noScore = vals.filter((v, i) => v == null && !(byD[ser[i].d] || {}).pending).length;
    const rel = last.today && lv === S.value && S.relation ? lower1(S.relation) : lv < u[0] ? "below your usual range" : lv > u[1] ? "above your usual range" : "within your usual range";
    const ans = `${last.today ? "Today" : `Latest, ${last.label},`} ${lv}, ${rel}.`;
    const spread = [above && `above it on ${plural(above, "day")}`, below && `below it on ${plural(below, "day")}`].filter(Boolean);
    const aria = `FloraScore over ${n} days. ${within} of ${rd.length} days within your usual range, ${u[0]} to ${u[1]}${spread.length ? `, ${andList(spread)}` : ""}. ${ans}${noScore ? ` No FloraScore on ${plural(noScore, "day")}, left as breaks in the line.` : ""}`;
    /* the points the scrubber can stop on, for after() */
    const pts = vals.map((v, i) => (v == null ? null : [r1(xs(i)), r1(ys(v)), v, ser[i].today ? "Today" : ser[i].label, ser[i].flag ? 2 : out(v) ? 1 : 0])).filter(Boolean);
    const valText = (p) => `${p[3]}: ${p[2]}, ${p[4] === 2 ? lower1(S.relation) : p[4] ? `${p[2] > u[1] ? "above" : "below"} your usual range` : "within your usual range"}`;
    const svg = `<svg class="ou-svg ou-chart" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>${grad}</defs>
      <rect class="ou-band" x="0" y="${yU1}" width="${PR}" height="${r1(yU0 - yU1)}"/>
      <line class="ou-zline" x1="0" x2="${W}" y1="${yU1}" y2="${yU1}"/><line class="ou-zline" x1="0" x2="${W}" y1="${yU0}" y2="${yU0}"/>
      <line class="ou-axis" x1="0" x2="${W}" y1="${yB}" y2="${yB}"/>
      ${zones}
      ${runs.filter((r) => r.length > 2 && n <= 30).map((r) => `<path class="ou-area" fill="url(#${id}-a)" d="${pathOf(r)}L${r1(xs(r[r.length - 1]))},${yB}L${r1(xs(r[0]))},${yB}Z"/>`).join("")}
      ${runs.filter((r) => r.length > 1).map((r) => `<path class="ou-line ou-sweep ou-sweep--slow" pathLength="1" stroke="url(#${id}-l)" d="${pathOf(r)}"/>`).join("")}
      ${dots}
      <g class="ou-scrub" data-x="${lx}">
        <line class="ou-scrub-l" x1="${lx}" x2="${lx}" y1="30" y2="${ly}"/>
        <circle class="ou-now-halo${!last.flag && out(lv) ? " is-shift" : ""}" cx="${lx}" cy="${ly}" r="10"/>
        <circle class="ou-now${!last.flag && out(lv) ? " is-shift" : ""}" cx="${lx}" cy="${ly}" r="5"/>
        <g class="ou-pill" transform="translate(${px} 6)"><rect width="${pw}" height="24" rx="12"/><text x="${r1(pw / 2)}" y="16" text-anchor="middle">${esc(pillT)}</text></g>
      </g>
      ${xlab}
    </svg>`;
    return `<div class="ou-pane" data-span="${n}"${hidden ? " hidden" : ""}>
      ${lead(x, num(within), `of ${rd.length} days within your usual range`, ans)}
      <div class="ou-plot" tabindex="0" role="slider" aria-label="${esc(`FloraScore, day by day, last ${n} days`)}" aria-valuemin="0" aria-valuemax="${pts.length - 1}" aria-valuenow="${pts.length - 1}" aria-valuetext="${esc(valText(pts[pts.length - 1]))}" aria-describedby="${id}-d" data-pts="${esc(JSON.stringify(pts))}" data-w="${W}" data-pr="${PR}" data-hi="${u[1]}">${svg}</div>
      <p class="ou-vh" id="${id}-d">${esc(`${aria} The left and right arrow keys move from day to day.`)}</p>
      ${legend(x, [["line", "FloraScore"], ["band", `Your usual, ${u[0]} to ${u[1]}`], (above || below) && ["line-shift", "Outside your usual"], noScore && [null, "A break in the line: no FloraScore that day"]])}
    </div>`;
  }
  function trend(D, x) {
    const S = D.score, esc = x.esc;
    if (!S.usual || !S.series || !S.series[30].some((s) => s.value != null)) {
      return card(x, "ou-trend", "FloraScore over time, not started yet", `
        ${head(x, "FloraScore · trend")}
        ${hl(x, "Your line starts with your FloraScore")}
        <div class="ou-empty" aria-hidden="true"><span></span><span></span><span></span></div>
        ${say(x, D.learning ? `Florin is learning your usual. Day ${D.learning.day} of ${D.learning.of}.` : S.why || "")}`);
    }
    const has90 = S.series[90] && S.series[90].filter((s) => s.value != null).length > S.series[30].filter((s) => s.value != null).length;
    const seg = has90 ? `<div class="ou-seg" role="group" aria-label="${esc("How far back")}"><button type="button" data-ou-span="30" aria-pressed="true">30 days</button><button type="button" data-ou-span="90" aria-pressed="false">90 days</button></div>` : "";
    return card(x, "ou-trend", "FloraScore over time", `
      ${head(x, "FloraScore · trend", seg)}
      ${trendPane(D, x, 30, false)}
      ${has90 ? trendPane(D, x, 90, true) : ""}`);
  }

  /* ---------- this week: stacked daily bars, one block per BM, coloured by the day's state ---------- */
  function week(D, x) {
    const esc = x.esc, days = D.days[7], ou = D.often.usual;
    const slots = Array(Math.max(0, 7 - days.length)).fill(null).concat(days);
    const learning = !!D.learning;
    const W = 326, cw = W / 7, bw = 24, top = 44, plotH = 92, base = top + plotH, gap = 4;
    const maxC = Math.max(3, ou ? ou[1] + 1 : 0, ...days.map((d) => d.count || 0));
    const segH = (plotH - (maxC - 1) * gap) / maxC;
    const yTop = (k) => base - k * segH - (k - 1) * gap; /* the top of the k-th block */
    /* your usual count as a band: a bar whose top lands inside it is a usual count */
    /* each block is its own BM: a late first BM marks the first block, a count outside your usual marks every block,
       and a form outside your usual marks that BM; a word that could be either is never Gold */
    const bmCls = (d, k, cls) => {
      if (!D.form.usual || cls === "read" || cls === "flag" || !d.forms[k]) return cls;
      const s = sideOf(D, d.forms[k]);
      return s === "looser" || s === "firmer" || d.inCount === false || (k === 0 && d.inWin === false) ? "shift" : s && s.indexOf("either") === 0 ? "either" : "usual";
    };
    /* your usual count as a band, named on its right end, or on its left end when a bar stands above it there; when
       neither end is clear the legend carries the numbers */
    const bandT = ou ? `Usual ${rng(ou)} a day` : "", bandW = bandT.length * 6.7;
    const tallAt = (x0, x1) => slots.some((d, i) => d && d.count != null && d.count > ou[1] && cw * (i + 1) > x0 && cw * i < x1);
    const bandAt = !ou ? null : !tallAt(W - bandW, W) ? "end" : !tallAt(0, bandW) ? "start" : null;
    const band = ou ? (() => { const y0 = r1(yTop(ou[1]) - 2), y1 = r1(ou[0] > 1 ? yTop(ou[0] - 1) - gap / 2 : base); return `<rect class="ou-band" x="0" y="${y0}" width="${W}" height="${r1(y1 - y0)}" rx="4"/>${bandAt ? `<text class="ou-band-l" x="${bandAt === "end" ? W : 0}" y="${r1(y0 - 4)}" text-anchor="${bandAt}">${esc(bandT)}</text>` : ""}`; })() : "";
    const drawn = new Set(); /* the block colours drawn, so the legend names only those */
    const cols = slots.map((d, i) => {
      const cx = r1(cw * (i + 0.5));
      if (!d) return "";
      const [cls, w] = dayState(d);
      const lbl = d.today ? `<g class="ou-wk-today"><rect x="${r1(cx - 22)}" y="0" width="44" height="20" rx="10"/><text x="${cx}" y="14" text-anchor="middle">Today</text></g>` : `<text class="ou-wk-d" x="${cx}" y="14" text-anchor="middle">${esc(d.dow)}</text>`;
      const date = `<text class="ou-wk-n${d.today ? " is-today" : ""}" x="${cx}" y="34" text-anchor="middle">${d.date}</text>`;
      let mark = "";
      if (d.pending) mark = `<text class="ou-wk-note" x="${cx}" y="${base - 6}" text-anchor="middle">Not yet</text>`;
      else if (!d.logged) mark = `<circle class="ou-gapmark" cx="${cx}" cy="${base - 5}" r="4"/>`;
      else if (d.count == null) mark = `<circle class="ou-nocount" cx="${cx}" cy="${base - 5}" r="2.5"/>`;
      else if (d.count === 0) { drawn.add(`zero-${cls}`); mark = `<rect class="ou-blk is-${cls} ou-grow" style="--i:${i}" x="${r1(cx - bw / 2)}" y="${base - 4}" width="${bw}" height="4" rx="2"/><text class="ou-wk-note" x="${cx}" y="${base - 10}" text-anchor="middle">0</text>`; }
      else mark = Array.from({ length: d.count }, (_, k) => { const c = bmCls(d, k, cls); drawn.add(c); return `<rect class="ou-blk is-${c} ou-grow" style="--i:${i};--k:${k}" x="${r1(cx - bw / 2)}" y="${r1(yTop(k + 1))}" width="${bw}" height="${r1(segH)}" rx="4"/>`; }).join("");
      const sym = d.sym.length ? `<circle class="ou-symdot" cx="${cx}" cy="${base + 12}" r="3"/>` : "";
      const tip = `${d.dow} ${d.label}: ${w}${d.count != null && !d.pending ? `, ${d.count === 0 ? "no BM" : plural(d.count, "BM")}` : ""}${d.firstText ? `, first at ${d.firstText}` : ""}${d.sym.length ? `, ${d.sym.map((s) => s.name.toLowerCase()).join(", ")}` : ""}`;
      return `<g class="ou-wk-col"><title>${esc(tip)}</title>${lbl}${date}${mark}${sym}</g>`;
    }).join("");
    const logged = days.filter((d) => d.logged);
    const shifted = days.filter((d) => d.logged && d.state === "shifted");
    /* within your usual out of the days read either way; a day that could be either, or with nothing about BMs, is said
       by name (D.tally) and counted neither way, never as not within */
    const T = D.tally[7], leftT = T.left ? ` ${T.left}` : "";
    let ans;
    if (learning) ans = `${logged.length ? "" : "Nothing logged yet. "}Days show as logged while Florin learns your usual.`;
    else if (!T.logged) ans = "Nothing logged this week yet.";
    else if (!shifted.length) ans = (!T.known ? "No day this week has a BM count logged yet." : T.left ? "No day you logged shifted." : "Every day you logged sat within your usual.") + leftT;
    else ans = (shifted.length <= 2 ? shifted.map((d) => `${d.today ? "Today" : `On ${dayName(d)}`}, ${andList(whyShift(D, d))}.`).join(" ") : `Outside your usual on ${andList(shifted.map(dayName))}.`) + leftT;
    const gaps = days.filter((d) => !d.logged && !d.pending);
    const aria = `This week, one block per BM. ${ans}${gaps.length ? ` Nothing logged on ${andList(gaps.map(dayName))}.` : ""} ${days.map((d) => `${d.dow}: ${dayState(d)[1]}${d.count != null && !d.pending ? `, ${d.count === 0 ? "no BM" : plural(d.count, "BM")}` : ""}`).join(". ")}.`;
    const has = (c) => days.some((d) => dayState(d)[0] === c);
    const zeroK = ["shift", "usual", "flag", "read"].find((c) => drawn.has(`zero-${c}`));
    return card(x, "ou-week", "This week at a glance", `
      ${head(x, "This week", dateK(x, spanOf(days)))}
      ${learning ? (logged.length ? lead(x, num(logged.length), `of ${plural(days.length, "day")} logged`, ans) : lead(x, "Not yet", "", ans)) : T.known ? lead(x, num(T.within), `of ${plural(T.known, "day")} within your usual`, ans) : lead(x, "Not yet", "", ans)}
      <svg class="ou-svg ou-wk" viewBox="0 0 ${W} ${base + 20}" role="img" aria-label="${esc(aria)}">${band}<line class="ou-axis" x1="0" x2="${W}" y1="${base}" y2="${base}"/>${cols}</svg>
      ${legend(x, [drawn.has("usual") && ["usual", "Within your usual"], drawn.has("shift") && ["shift", "Outside your usual"], drawn.has("either") && ["either", "Could be either"], drawn.has("flag") && ["flag", "Noted for a clinician"], drawn.has("read") && ["read", "Logged"], zeroK && [`zero-${zeroK}`, "No BM logged"], has("nocount") && ["nocount", "Logged, no BMs said"], has("gap") && ["gap", "Nothing logged"], days.some((d) => d.sym.length) && ["sym", "Symptoms"], ou && ["band", bandAt ? "Your usual count" : `Your usual count, ${rng(ou)} a day`]])}
      ${learning ? "" : afterChange(D, x)}`);
  }

  /* ---------- the last 30 days: a day-by-day timeline, then the days counted by state, Oura's zone list ---------- */
  function month(D, x) {
    const esc = x.esc, days = D.days[30];
    const learning = !!D.learning;
    const W = 326, n = days.length, cw = W / Math.max(n, 14), bw = Math.min(8, cw - 3), base = 76;
    const x0 = learning ? 0 : W - cw * n;
    const cols = days.map((d, i) => {
      const cx = r1(x0 + cw * (i + 0.5));
      const [cls, w] = dayState(d);
      const tip = `${d.dow} ${d.label}: ${w}${d.count != null && !d.pending ? `, ${d.count === 0 ? "no BM" : plural(d.count, "BM")}` : ""}`;
      let m;
      if (d.pending) m = `<circle class="ou-gapmark is-pending" cx="${cx}" cy="${base - 4}" r="2.5"/>`;
      else if (!d.logged) m = `<circle class="ou-gapmark" cx="${cx}" cy="${base - 4}" r="2.5"/>`;
      else if (d.count == null) m = `<circle class="ou-nocount" cx="${cx}" cy="${base - 4}" r="2"/>`;
      else { const h = d.count === 0 ? 3 : 14 + 14 * (Math.min(d.count, 4) - 1); m = `<rect class="ou-blk is-${cls} ou-grow" style="--i:${i}" x="${r1(cx - bw / 2)}" y="${r1(base - h)}" width="${r1(bw)}" height="${h}" rx="2"/>`; }
      return `<g><title>${esc(tip)}</title>${m}</g>`;
    }).join("");
    const first = days[0], lastD = days[n - 1];
    const tx = r1(x0 + cw * (n - 0.5));
    const xl = learning
      ? `<text class="ou-xt" x="0" y="${base + 18}" text-anchor="start">${esc(first.label)}</text><text class="ou-xt is-today" x="${r1(Math.max(tx, 64))}" y="${base + 18}" text-anchor="middle">Today</text><text class="ou-xt" x="${W}" y="${base + 18}" text-anchor="end">${esc(`Day ${D.learning.of}`)}</text><line class="ou-grid" x1="${r1(tx + cw / 2)}" x2="${W}" y1="${base}" y2="${base}"/>`
      : `<text class="ou-xt" x="${r1(x0)}" y="${base + 18}" text-anchor="start">${esc(first.label)}</text><text class="ou-xt${lastD.today ? " is-today" : ""}" x="${W}" y="${base + 18}" text-anchor="end">${lastD.today ? "Today" : esc(lastD.label)}</text>`;
    const cnt = (k) => days.filter((d) => dayState(d)[0] === k).length;
    const logged = days.filter((d) => d.logged).length;
    const ROWS = [["usual", "Within your usual"], ["shift", "Outside your usual"], ["either", "Could be either"], ["flag", "Noted for a clinician"], ["read", "Logged"], ["nocount", "Logged, no BMs said"], ["gap", "Nothing logged"], ["pending", "Nothing logged yet today"]];
    const present = ROWS.map(([k, t]) => [k, t, cnt(k)]).filter((r) => r[2]);
    const maxN = Math.max(...present.map((r) => r[2]));
    const zones = present.map(([k, t, c], i) => `<li class="ou-zr" style="--i:${i}"><span class="ou-zr-b"><i class="ou-zr-f is-${k}" style="--w:${pct(c, 0, maxN)}%"></i></span><b>${esc(t)}</b><span class="ou-zr-v">${esc(plural(c, "day"))}</span></li>`).join("");
    const T = D.tally[30];
    /* a no-BM bar takes its day's colour, and so does its swatch */
    const zeroD = days.find((d) => d.count === 0 && !d.pending), zeroK = zeroD ? dayState(zeroD)[0] : null;
    const aria = learning ? (logged ? `Since you started: ${plural(logged, "day")} logged of ${n}.` : "Since you started: nothing logged yet.") : `The last 30 days, one bar per day, its height the BMs that day and its colour how the day sat. ${present.map(([, t, c]) => `${t}: ${plural(c, "day")}`).join(". ")}.`;
    return card(x, "ou-month", learning ? "Since you started" : "The last 30 days", `
      ${head(x, learning ? "Since you started" : "Last 30 days", dateK(x, spanOf(days)))}
      ${learning ? (logged ? lead(x, num(logged), `of ${plural(n, "day")} logged`, "") : lead(x, "Not yet", "", "Nothing logged yet.")) : T.known ? lead(x, num(T.within), `of ${plural(T.known, "day")} within your usual`, T.left) : lead(x, "Not yet", "", `No day in the last 30 days has a BM count logged yet.${T.left ? ` ${T.left}` : ""}`)}
      <svg class="ou-svg ou-mo" viewBox="0 0 ${W} ${base + 22}" role="img" aria-label="${esc(aria)}"><line class="ou-axis" x1="0" x2="${W}" y1="${base}" y2="${base}"/>${cols}${xl}</svg>
      <ul class="ou-zones" aria-hidden="true">${zones}</ul>
      ${legend(x, [[null, "A bar's height is the BMs that day, up to 4"], zeroK && [`zero-${zeroK}`, "A short bar: no BM logged"], cnt("gap") && ["gap", "Nothing logged: a gap, never a zero"]])}`);
  }

  /* ---------- timing: the morning as a curved clock, your usual window as a band on it, today as a dot ---------- */
  function timing(D, x) {
    const esc = x.esc, days = D.days[30], tm = D.timing, u = tm.usual;
    const pts = days.filter((d) => d.first != null);
    const t = todayOf(D);
    if (!pts.length) return card(x, "ou-timing", "Timing", `${head(x, "Timing · first BM")}${hl(x, "Your first BM each morning shows here")}${say(x, D.learning ? `Florin learns your usual window by day ${D.learning.of}.` : "")}`);
    const firsts = pts.map((d) => d.first);
    let t0 = Math.floor(Math.min(...firsts, u ? u[0] : 24) - 0.5), t1 = Math.ceil(Math.max(...firsts, u ? u[1] : 0) + 0.5);
    while (t1 - t0 < 4) { t0 -= 0.5; t1 += 0.5; }
    t0 = Math.floor(t0); t1 = Math.ceil(t1);
    /* a wide, shallow arc that runs off both edges of the card, as the sky does */
    const W = 358, cx = W / 2, R = 400, topY = 52, cy = topY + R;
    const half = Math.asin((cx + 14) / R) / TAU;
    const fa = (h) => -half + (2 * half * (h - t0)) / (t1 - t0);
    const Ri = R - 28;
    const hours = []; for (let h = t0 + 1; h < t1; h++) hours.push(h);
    const hourMarks = hours.map((h) => { const [hx, hy] = pol(cx, cy, R + 20, fa(h)); return `<text class="ou-ck-h" x="${hx}" y="${r1(hy + 4)}" text-anchor="middle">${hourLbl(h)}</text>`; }).join("")
      + hours.concat([t0]).map((h) => { const [dx, dy] = pol(cx, cy, R + 20, fa(h + 0.5)); return `<circle class="ou-ck-dot" cx="${dx}" cy="${dy}" r="1.5"/>`; }).join("");
    const band = u ? `<path class="ou-ck-band ou-sweep ou-sweep--fast" pathLength="1" d="${arc(cx, cy, R, fa(u[0]), fa(u[1]))}"/>` : "";
    /* every morning of the last 30 days as a tick on the inner arc: Gold outside your window, your usual's colour inside */
    const ticks = pts.map((d, i) => {
      const f = fa(d.first), [ax, ay] = pol(cx, cy, Ri - 5, f), [bx, by] = pol(cx, cy, Ri + 5, f);
      return `<line class="ou-ck-tick${d.inWin === false ? " is-shift" : d.inWin ? " is-usual" : ""}" style="--i:${i}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"><title>${esc(`${d.dow} ${d.label}: ${d.firstText}`)}</title></line>`;
    }).join("");
    const tf = t && t.first != null ? t : null;
    const newest = tf || pts[pts.length - 1];
    const [nx, ny] = pol(cx, cy, R, fa(newest.first));
    const nOut = newest.inWin === false;
    /* "Your usual" sits on the quarter of the window farthest from today's dot, so the halo never covers it */
    const ulbl = u ? (() => { const at = newest.first <= (u[0] + u[1]) / 2 ? u[1] - (u[1] - u[0]) / 4 : u[0] + (u[1] - u[0]) / 4; const [bx, by] = pol(cx, cy, R - 14, fa(at)); return `<text class="ou-ck-ul" x="${bx}" y="${r1(by + 4)}" text-anchor="middle">Your usual</text>`; })() : "";
    const where = newest.inWin === true ? "in your usual window" : newest.inWin === false ? `${newest.first > u[1] ? "later" : "earlier"} than your usual window` : "";
    const big = tf ? (where ? `Your first BM today came ${where === "in your usual window" ? "in your usual window" : where}` : `Your first BM today came at ${tf.firstText}`)
      : t && t.count === 0 ? "You logged no BM today" : "No BM logged yet today";
    /* how far into the window, or past it, in minutes as shown */
    const mins = (h) => { const m = Math.round(Math.abs(h) * 60); return m >= 60 ? `${plural(Math.floor(m / 60), "hour")}${m % 60 ? ` ${plural(m % 60, "minute")}` : ""}` : plural(m, "minute"); };
    const fromWin = (d) => (!u || d.flag ? "" : d.inWin === true ? (Math.round((d.first - u[0]) * 60) === 0 ? ", just as your window opened" : `, ${mins(d.first - u[0])} after your window opened`) : d.first > u[1] ? `, ${mins(d.first - u[1])} after your window closed` : `, ${mins(u[0] - d.first)} before your window opened`);
    /* a flagged today: its time, and why it isn't read */
    const sentence = tf ? `Today at ${tf.firstText}${fromWin(tf)}.${tf.flag && D.flagLine ? ` ${D.flagLine}` : ""}` : `Latest, ${newest.label}, at ${newest.firstText}${fromWin(newest)}.`;
    const later = u ? pts.filter((d) => d.inWin === false && d.first > u[1]).length : 0, earlier = u ? pts.filter((d) => d.inWin === false && d.first < u[0]).length : 0;
    const aria = `First BM each morning, ${D.learning ? "so far" : "the last 30 days"}, on a curved clock from ${hourLbl(t0)} to ${hourLbl(t1)}. ${u ? `${tm.inWin30} of ${tm.mornings30} mornings in your usual window, ${tm.usualText}${later || earlier ? `; ${andList([later && `${later} later`, earlier && `${earlier} earlier`].filter(Boolean))}` : ""}. ` : ""}${big}. ${sentence}`;
    const svg = `<svg class="ou-svg ou-clock" viewBox="0 0 ${W} 128" role="img" aria-label="${esc(aria)}">
      <path class="ou-ck-trk" d="${arc(cx, cy, R, -half, half)}"/>
      ${band}
      <path class="ou-ck-itrk" d="${arc(cx, cy, Ri, -half, half)}"/>
      ${ticks}${ulbl}${hourMarks}
      <circle class="ou-now-halo${nOut ? " is-shift" : ""}" cx="${nx}" cy="${ny}" r="11"/>
      <circle class="ou-now${nOut ? " is-shift" : ""}" cx="${nx}" cy="${ny}" r="6"/>
    </svg>`;
    const stats = [
      u ? [`${tm.inWin30} of ${tm.mornings30}`, "Mornings in your window"] : [String(pts.length), pts.length === 1 ? "Morning logged" : "Mornings logged"],
      u ? [tm.usualText, "Your usual window"] : ["Learning", D.learning ? `Your window, by day ${D.learning.of}` : "Your window"],
      [tf ? tf.firstText : t && t.count === 0 ? "No BM" : "Not yet", "Today"]
    ];
    return card(x, "ou-timing", "Timing of the first BM", `
      ${head(x, "Timing · first BM", u ? "" : chip(x, "learn", "Learning"))}
      ${svg}
      ${hl(x, big)}
      ${say(x, sentence)}
      <dl class="ou-stats">${stats.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${legend(x, [[nOut ? "now-shift" : "now", tf ? "Today" : "Latest"], u && ["usual", "Your usual window"], [u ? "tick-usual" : "tick", D.learning ? "Each morning so far" : u ? "Each morning in your window, last 30 days" : "Each morning, last 30 days"], (later || earlier) && ["tick-shift", "Outside your window"]])}`);
  }

  /* ---------- a Vitals-style reading: a label and state word, a big number, a long track with your usual and a marker ---------- */
  function vital(x, o) {
    const { label, kind, stateText, big, unit, steps, band, marks, ticks, stack } = o;
    const n = steps.length;
    const cells = steps.map((s, i) => `<i class="ou-vt-c${band && i >= band[0] && i <= band[1] ? " is-band" : ""}"></i>`).join("");
    const bandBox = band ? `<i class="ou-vt-band" style="left:${r1((band[0] / n) * 100)}%;width:${r1(((band[1] - band[0] + 1) / n) * 100)}%"></i>` : "";
    const markEls = (marks || []).map((m, i) => `<i class="ou-vt-m${m.cls ? ` ${m.cls}` : ""}" style="--i:${i};left:${r1(((m.a + m.b + 1) / 2 / n) * 100)}%;--span:${m.b - m.a + 1}"${m.n > 1 ? ` data-n="${m.n}"` : ""}></i>`).join("");
    return `<div class="ou-vital${stack ? " is-stack" : ""}">
      <p class="ou-vt-top"><span class="ou-vt-k">${x.esc(label)}</span>${stateText ? stateW(x, kind, stateText, "span") : ""}</p>
      <div class="ou-vt-body">
        <p class="ou-vt-big">${big}${unit ? `<span class="ou-of">${x.esc(unit)}</span>` : ""}</p>
        <div class="ou-vt-r"><span class="ou-vt" style="--n:${n}">${cells}${bandBox}${markEls}</span><span class="ou-vt-ticks" style="--n:${n}" aria-hidden="true">${ticks.map((t, i) => `<span class="${band && i >= band[0] && i <= band[1] ? "is-band" : ""}">${x.esc(t)}</span>`).join("")}</span></div>
      </div>
    </div>`;
  }
  /* "This week, Last 30 days, Your usual": bars one under another, values written in */
  const habit = (x, rows) => `<ul class="ou-habits">${rows.map((r, i) => `<li style="--i:${i}"><p class="ou-hb-top"><span>${x.esc(r.label)}</span><b>${x.esc(r.value)}</b></p><span class="ou-hb${r.thin ? " is-thin" : ""}">${r.segs.map((s) => `<i class="ou-hb-f is-${s.k}" style="--w:${s.w}%;--x:${s.x || 0}%"></i>`).join("")}${r.band ? `<i class="ou-hb-band" style="left:${r.band[0]}%;width:${r.band[1]}%"></i>` : ""}</span>${r.sub ? `<p class="ou-hb-sub">${x.esc(r.sub)}</p>` : ""}</li>`).join("")}</ul>`;

  /* ---------- how often: today as a Vitals track, then this week, the last 30 days and your usual ---------- */
  function often(D, x) {
    const esc = x.esc, days = D.days[30], o = D.often, u = o.usual;
    const learning = !!D.learning;
    const t = todayOf(D);
    const top = Math.max(4, u ? u[1] + 1 : 0);
    const steps = Array.from({ length: top + 1 }, (_, i) => i);
    const ticks = steps.map((s) => (s === top ? `${s}+` : String(s)));
    const tc = t && !t.pending && t.logged ? t.count : null;
    /* a flagged today: its count, noted for a clinician, read against nothing */
    const st = tc != null && u && !t.flag ? vs(tc, u) : null;
    const [kind, stText] = learning ? ["learn", "Still learning"] : t && t.pending ? ["none", ""] : t && t.logged && tc == null ? ["none", "No BMs said yet"] : t && t.flag ? ["ctx", "Noted for a clinician"] : st ? VS[st] : ["none", ""];
    const v1 = vital(x, {
      label: "BMs today", kind, stateText: stText,
      big: tc != null ? num(tc, 0, 700) : "Not yet", unit: tc != null ? "so far" : "",
      steps, band: u ? [u[0], u[1]] : null, ticks,
      marks: tc != null ? [{ a: Math.min(tc, top), b: Math.min(tc, top), cls: st && st !== "within" ? "is-shift" : "" }] : []
    });
    const avg = (ds) => { const k = ds.filter((d) => d.count != null); return k.length ? +(k.reduce((s, d) => s + d.count, 0) / k.length).toFixed(1) : null; };
    const wk = avg(D.days[7].filter((d) => !d.flag)), mo = o.avg30;
    const kOf = (v) => (v == null ? "read" : !u ? "read" : v < u[0] || v > u[1] ? "shift" : "usual");
    const bandP = u ? [pct(u[0], 0, top), r1(pct(u[1], 0, top) - pct(u[0], 0, top))] : null;
    const rows = [
      { label: "This week", value: wk == null ? "Nothing logged" : `${wk.toFixed(1)} a day`, segs: wk == null ? [] : [{ k: kOf(wk), w: pct(wk, 0, top) }], band: bandP },
      { label: learning ? "So far" : "Last 30 days", value: mo == null ? "Nothing logged" : `${mo.toFixed(1)} a day`, segs: mo == null ? [] : [{ k: kOf(mo), w: pct(mo, 0, top) }], band: bandP }
    ];
    if (learning) rows.shift();
    if (u) rows.push({ label: "Your usual", value: o.usualText, segs: [{ k: "uband", w: bandP[1], x: bandP[0] }], thin: false });
    const known = days.filter((d) => d.count != null && !d.flag);
    const inR = u ? known.filter((d) => d.count >= u[0] && d.count <= u[1]).length : null;
    const zeros = known.filter((d) => d.count === 0).length, gaps = days.filter((d) => d.count == null && !d.pending).length;
    const extra = [zeros && `${zeros} with no BM`, gaps && `${gaps} with nothing logged`].filter(Boolean);
    const ans = u ? `In the last 30 days, ${inR} of ${known.length} days within your usual${extra.length ? `, ${andList(extra)}` : ""}.${t && t.flag && D.flagLine ? ` ${D.flagLine}` : ""}` : `${known.length ? `${plural(known.length, "day")} logged so far.` : "Nothing logged yet."} Florin learns your usual count by day ${D.learning ? D.learning.of : ""}.`;
    return card(x, "ou-often", "How often", `
      ${head(x, "How often", u ? chip(x, "usual", o.usualText) : chip(x, "learn", "Learning"))}
      ${v1}
      ${habit(x, rows)}
      ${say(x, ans)}
      ${legend(x, [u && ["usual", "Within your usual"], (u && [wk, mo, tc].some((v) => v != null && (v < u[0] || v > u[1]))) && ["shift", "Outside your usual"], u && ["uband", `Your usual, ${o.usualText}`], tc != null && [st && st !== "within" ? "now-shift" : "now", "Today"]])}`);
  }

  /* ---------- form: today's BMs on the scale as a Vitals track, then this week and the last 30 days by side ---------- */
  function form(D, x) {
    const esc = x.esc, F = D.form, u = F.usual, mode = D.mode;
    const learning = !!D.learning;
    const t = todayOf(D);
    const keys = F.scale.map((s) => s.k);
    const idx = (k) => keys.indexOf(k);
    const tf = t && t.logged && !t.pending ? t.forms : [];
    /* one marker per BM, on its step, or across both steps of a word that covers two; the same place twice is one marker with a count */
    const groups = {};
    tf.forEach((f) => { const a = idx(Math.min(...f.steps)), b = idx(Math.max(...f.steps)), key = `${a}-${b}`, s = sideOf(D, f); (groups[key] = groups[key] || { a, b, n: 0, cls: s === "looser" || s === "firmer" ? "is-shift" : s && s.indexOf("either") === 0 ? "is-either" : "" }).n++; });
    const sides = tf.map((f) => sideOf(D, f));
    const anyOut = sides.some((s) => s === "looser" || s === "firmer"), anyEither = sides.some((s) => s && s.indexOf("either") === 0);
    const [kind, stText] = !u ? ["learn", "Still learning"] : !tf.length ? (t && t.pending ? ["none", ""] : ["none", t && t.count === 0 ? "No BM today" : "No BMs said yet"]) : t.flag ? ["ctx", "Noted for a clinician"] : anyOut ? ["shift", sides.includes("looser") && sides.includes("firmer") ? "Outside your usual" : sides.includes("looser") ? "Looser than your usual" : "Firmer than your usual"] : anyEither ? ["either", "Could be either"] : ["usual", "Within your usual"];
    const big = tf.length === 1 ? esc(tf[0].name) : tf.length ? `${num(tf.length, 0, 700)}` : t && t.count === 0 ? "No BM" : "Not yet";
    const v1 = vital(x, {
      label: "Form today", kind, stateText: stText, big, unit: tf.length > 1 ? "BMs" : "", stack: true,
      steps: keys, band: u ? [idx(u[0]), idx(u[1])] : null, ticks: F.scale.map((s) => s.label),
      marks: Object.values(groups)
    });
    /* this week and the last 30 days, each one bar along the scale's own direction: firmer, within, looser */
    const count = (forms) => {
      const s = forms.map((f) => sideOf(D, f));
      const c = (k) => s.filter((v) => v === k).length;
      return { fi: c("firmer"), el: c("either-lo"), in: c("in"), eh: c("either-hi"), lo: c("looser"), n: forms.length };
    };
    /* the days read: a flagged today's BMs are in neither bar */
    const wkF = D.days[7].filter((d) => !d.flag).flatMap((d) => d.forms), moF = D.days[30].filter((d) => !d.flag).flatMap((d) => d.forms);
    const bar = (label, forms) => {
      const c = count(forms);
      if (!c.n) return { label, value: "No BMs logged", segs: [] };
      if (!u) return { label, value: plural(c.n, "BM"), segs: [{ k: "read", w: 100 }] };
      const order = [["shift", c.fi], ["either", c.el], ["usual", c.in], ["either", c.eh], ["shift", c.lo]];
      let at = 0;
      const segs = order.filter(([, v]) => v).map(([k, v]) => { const s = { k, w: r1((v / c.n) * 100), x: r1((at / c.n) * 100) }; at += v; return s; });
      /* within out of the BMs read either way, as Insights counts them; a BM that could be either is said under */
      const e = c.el + c.eh;
      return { label, value: c.n === e ? `${plural(e, "BM")}, could be either` : `${c.in} of ${c.n - e} within`, segs, stacked: true, sub: e && c.n > e ? `${e} could be either` : "" };
    };
    /* your usual, as the same bar: the share of BMs your usual forms held in the weeks Florin learned them from */
    const uw = F.usualWeeks, baseF = uw ? D.days[90].filter((d) => d.d >= uw[0] && d.d <= uw[1]).flatMap((d) => d.forms) : [];
    const rows = learning ? [bar("So far", moF)] : [bar("This week", wkF), bar("Last 30 days", moF)];
    if (u && baseF.length) rows.push({ ...bar("Your usual", baseF), sub: `${F.usualText}, in the weeks that set your usual` });
    const total = F.total30, firmer = F.firmer || 0, looser = F.looser || 0, either = F.either || 0;
    const was = (k) => (k === 1 ? "was" : "were");
    const eith = either ? `, and ${either} could be either` : "";
    const ans = !total ? (learning ? "No BMs logged so far." : "No BMs logged in the last 30 days.")
      : !u ? `Florin learns your usual forms by day ${D.learning ? D.learning.of : ""}.`
      : firmer && looser ? `In the last 30 days, ${firmer} ${was(firmer)} firmer and ${looser} looser than your usual forms${eith}.`
      : firmer ? `In the last 30 days, ${firmer} ${was(firmer)} firmer than your usual forms${eith}.`
      : looser ? `In the last 30 days, ${looser} ${was(looser)} looser than your usual forms${eith}.`
      : either ? `In the last 30 days, ${either} could be either; the rest sat within your usual forms.` : "In the last 30 days, every BM sat within your usual forms.";
    const scaleName = mode === "A" ? "1 to 7" : mode === "B" ? "five words" : "seven words";
    return card(x, "ou-form", "Form", `
      ${head(x, `Form · ${scaleName}`, u ? chip(x, "usual", F.usualText) : chip(x, "learn", "Learning"))}
      ${v1}
      ${habit(x, rows.map((r) => ({ ...r, segs: r.segs })))}
      <p class="ou-dir" aria-hidden="true"><span>Firmer</span><span>Looser</span></p>
      ${say(x, ans)}
      ${legend(x, [u && ["usual", "Within your usual forms"], (anyOut || firmer || looser) && ["shift", "Outside your usual forms, firmer or looser"], (anyEither || either) && ["either", "Could be either"], tf.length > 0 && [anyOut && !sides.includes("in") && !anyEither ? "now-shift" : "now", "Today, one marker per BM"]])}`);
  }

  /* ---------- symptoms: which came up, as Contributors rows split by strength ---------- */
  function symptoms(D, x) {
    const esc = x.esc, S = D.symptoms;
    const rows = S.rows, L30 = Math.max(1, S.logged30);
    const WORDS3 = ["mild", "moderate", "strong"];
    const most = (row) => {
      const s = row.cells.filter((c) => c > 0), unsaid = row.cells.filter((c) => c === 0).length;
      if (!s.length) return "strength not said";
      const k = [1, 2, 3].map((v) => s.filter((c) => c === v).length);
      const counts = () => [...k.map((c, i) => c && `${c} ${WORDS3[i]}`), unsaid && `${unsaid} strength not said`].filter(Boolean).join(", ");
      if (unsaid) return counts();
      const top = Math.max(...k), kinds = k.filter(Boolean).length;
      if (s.length === 1) return WORDS3[s[0] - 1];
      if (kinds === 1) return `all ${WORDS3[s[0] - 1]}`;
      return k.filter((c) => c === top).length === 1 ? `mostly ${WORDS3[k.indexOf(top)]}` : counts();
    };
    const list = rows.map((row, i) => {
      const parts = [1, 2, 3, 0].map((s) => [s, row.cells.filter((c) => c === s).length]).filter(([, c]) => c);
      let at = 0;
      const segs = parts.map(([s, c]) => { const seg = `<i class="ou-bar-s is-s${s}" style="--x:${r1((at / L30) * 100)}%;--w:${r1((c / L30) * 100)}%"></i>`; at += c; return seg; }).join("");
      return `<li class="ou-ct" style="--i:${i}">
        <p class="ou-ct-top"><b>${esc(row.name)}</b><span class="ou-ct-v">${esc(`${plural(row.days, "day")}, ${most(row)}`)}</span></p>
        <span class="ou-bar is-stack" aria-hidden="true">${segs}</span>
      </li>`;
    }).join("");
    const top = rows[0];
    const ans = rows.length ? `${top.name} came up most, on ${plural(top.days, "day")}.` : !S.logged30 ? "Nothing logged yet." : `No symptoms on the ${plural(S.logged30, "day")} you logged.`;
    const aria = `Symptoms, ${D.learning ? "so far" : "last 30 days"}. ${S.logged30 ? `${S.withSym30} of ${plural(S.logged30, "logged day")} with symptoms.` : "Nothing logged yet."}${S.usualText ? ` Your usual: ${lower1(S.usualText)}.` : ""} ${ans} ${rows.map((row) => `${row.name}: ${plural(row.days, "day")}, ${most(row)}`).join(". ")}.`;
    const strengths = new Set(rows.flatMap((row) => row.cells.filter((c) => c != null && c !== false)));
    return card(x, "ou-symptoms", "Symptoms", `
      ${head(x, D.learning ? "Symptoms · so far" : "Symptoms · 30 days", S.usualText ? chip(x, "usual", `Usual: ${S.usualText.toLowerCase()}`) : chip(x, "learn", "Learning"))}
      ${S.logged30 ? lead(x, num(S.withSym30), `of ${plural(S.logged30, "logged day")} with symptoms`, ans) : lead(x, "Not yet", "", ans)}
      ${rows.length ? `<ul class="ou-cts" role="img" aria-label="${esc(aria)}">${list}</ul>
      <p class="ou-dir is-days" aria-hidden="true"><span>0</span><span>${esc(plural(S.logged30, "logged day"))}</span></p>
      ${legend(x, [strengths.has(1) && ["s1", "Mild"], strengths.has(2) && ["s2", "Moderate"], strengths.has(3) && ["s3", "Strong"], strengths.has(0) && ["s0", "Strength not said"]])}` : ""}
      ${care(x)}`);
  }

  /* ---------- after a change: a card on the week that asks about the latest day that shifted, with the check-in's own
     tags, the way Oura asks about a night when the score moved. Then the weekly check-in: each answer as a key-metric
     track against your first weeks ---------- */
  function afterChange(D, x) {
    if (!D.timing.usual) return "";
    const sh = D.days[7].filter((d) => d.logged && d.state === "shifted");
    const d = sh[sh.length - 1];
    if (!d) return "";
    const why = whyShift(D, d);
    if (!why.length) return "";
    const when = d.today ? "Today" : `On ${dayName(d)}`;
    const ask = d.today ? "Anything different yesterday or today?" : "Anything different the day before?";
    const tags = D.checkin.tags || [];
    return `<section class="ou-tagcard" aria-label="${x.esc(`Check in about ${d.today ? "today" : dayName(d)}`)}">
      <header class="ou-tc-h"><svg class="ou-tc-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 4.5v5.2l7 7 6.2-6.2-7-7H4.5a1 1 0 0 0-1 1Z"/><circle cx="7.2" cy="7.2" r="1.3"/></svg><h4>Check in</h4><button type="button" class="ou-tc-x" data-ou-close aria-label="${x.esc("Dismiss the check in")}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></header>
      <p class="ou-tc-q">${x.esc(`${when}, ${andList(why)}. ${ask}`)}</p>
      <div class="ou-tc-chips" role="group" aria-label="${x.esc("Tags for that day")}">${tags.map((t, i) => `<button type="button" class="ou-tag" data-ou-tag aria-pressed="false" style="--i:${i}">${x.esc(t)}</button>`).join("")}</div>
      <p class="ou-tc-n">${x.esc("A tag saves to that day, and the weekly check-in keeps it.")}</p>
    </section>`;
  }
  function checkin(D, x) {
    const esc = x.esc, CK = D.checkin, Q = CK.questions;
    const started = Q.some((q) => q.latest);
    const cta = CK.due ? `<div class="ou-cta"><button type="button" class="ou-btn">Answer this week's check-in</button></div>` : "";
    const track = (q, qi) => {
      const L = q.latest, b = q.band, n = q.ticks.length;
      const shift = q.cmp && q.cmp.k !== "same";
      const [kind, w] = !L ? ["none", "No answer yet"] : !q.cmp ? ["learn", "Still learning"] : shift ? ["shift", q.cmp.text] : ["usual", q.cmp.text];
      const cells = q.ticks.map((t, i) => `<i class="ou-vt-c${b && i >= b.lo && i <= b.hi ? " is-band" : ""}"></i>`).join("");
      const bandBox = b ? `<i class="ou-vt-band" style="left:${r1((b.lo / n) * 100)}%;width:${r1(((b.hi - b.lo + 1) / n) * 100)}%"></i>` : "";
      const mark = L ? `<i class="ou-vt-m${shift ? " is-shift" : ""}" style="--i:${qi};left:${r1(((L.v + 0.5) / n) * 100)}%;--span:1"></i>` : "";
      const aria = L ? `${q.label}: ${q.opts[L.v]}, ${lower1(L.label)}. ${q.cmp ? q.cmp.text : ""}${b ? `. Your first weeks: ${q.ticks[b.lo]}${b.hi !== b.lo ? ` to ${q.ticks[b.hi]}` : ""}` : ""}.` : `${q.label}: not answered yet.`;
      return `<li class="ou-km" style="--i:${qi}">
        <p class="ou-km-k">${esc(q.label)}</p>
        <p class="ou-km-v">${L ? esc(q.opts[L.v]) : "Not yet"}</p>
        ${stateW(x, kind, w)}
        <span class="ou-vt" style="--n:${n}" role="img" aria-label="${esc(aria)}">${cells}${bandBox}${mark}</span>
        <p class="ou-km-ends" aria-hidden="true"><span>${esc(q.ticks[0])}</span><span>${esc(q.ticks[n - 1])}</span></p>
      </li>`;
    };
    if (!started) {
      return card(x, "ou-checkin", "Weekly check-in, not started yet", `
        ${head(x, "Weekly check-in")}
        ${hl(x, "Four short questions, once a week")}
        ${say(x, "Florin compares each week with your first weeks.")}
        <ul class="ou-kms is-empty">${Q.map((q) => `<li class="ou-km"><p class="ou-km-k">${esc(q.label)}</p>${stateW(x, "none", "No answer yet")}<span class="ou-vt" style="--n:${q.ticks.length}" aria-hidden="true">${q.ticks.map(() => '<i class="ou-vt-c"></i>').join("")}</span></li>`).join("")}</ul>
        ${cta}`);
    }
    const answered = Q.filter((q) => q.cmp).length, same = Q.filter((q) => q.cmp && q.cmp.k === "same").length;
    const diff = Q.filter((q) => q.cmp && q.cmp.k !== "same");
    const latest = (Q.find((q) => q.latest) || {}).latest;
    /* before the first check-ins there is nothing to compare with: say what is saved, and when comparing starts */
    const big = !answered ? (CK.count === 1 ? "Your first check-in is saved" : `${cap(word(CK.count))} check-ins saved`) : !diff.length ? "Every answer sits within the range of your first weeks" : diff.length === 1 ? `${diff[0].label}: ${lower1(diff[0].cmp.text)}` : `${cap(word(diff.length))} answers moved from your first weeks`;
    return card(x, "ou-checkin", "Weekly check-in", `
      ${head(x, "Weekly check-in", latest ? dateK(x, latest.label) : "")}
      ${answered ? `<p class="ou-big">${num(same)}<span class="ou-of">${esc(`of ${answered} like your first weeks`)}</span></p>` : ""}
      ${hl(x, big)}
      ${answered ? "" : say(x, `Your first ${word(CK.baseWeeks)} become your starting point. Each week after is compared with them.`)}
      <ul class="ou-kms">${Q.map(track).join("")}</ul>
      ${legend(x, [["now", "Latest answer"], Q.some((q) => q.band) && ["uband", "Your first weeks"], diff.length && ["shift", "Different from your first weeks"]])}
      ${cta}`);
  }

  /* ---------- a possible pattern: the two groups as bars one under another, and how sure, as a key-metric track ---------- */
  function pattern(D, x) {
    const esc = x.esc, PT = D.patterns, p = PT.found[0];
    const note = `<p class="ou-pnote">${esc(PT.note)}</p>`;
    const foodCta = `<div class="ou-cta"><button type="button" class="ou-btn">Start a food check</button></div>`;
    if (!p) {
      if (D.learning) {
        return card(x, "ou-pattern", "Possible patterns, not started yet", `
          ${head(x, "Possible patterns")}
          ${stateW(x, "learn", "Still learning")}
          ${hl(x, "Patterns come later")}
          ${say(x, `Florin starts looking once it knows your usual, from day ${D.learning.of}. You're on day ${D.learning.day}.`)}
          ${note}`);
      }
      if (PT.sparse) {
        const m = PT.meals, cov = Math.round((PT.coverage || 0) * 100);
        if (!m.days) {
          /* no meal logs at all is a choice, not a shortfall: no bar and no 0% */
          return card(x, "ou-pattern", "Possible patterns: food, when you want it", `
            ${head(x, "Possible patterns", chip(x, "ctx", "Meals"))}
            ${hl(x, "Florin can look at food when you want it to")}
            ${say(x, PT.foodCheckDays ? `Log meals for ${PT.foodCheckDays} days and Florin compares them with the days after.` : "Log meals during a food check and Florin compares them with the days after.")}
            ${foodCta}
            ${note}`);
        }
        const need = Math.round((PT.cover || 0) * 100);
        /* the mark only where the bar falls short of it, so the bar never passes the mark on a card that says "not enough" */
        const mark = need > 0 && cov < need;
        return card(x, "ou-pattern", "Possible patterns: not enough other days to compare", `
          ${head(x, "Possible patterns", chip(x, "ctx", "Meals"))}
          ${hl(x, "Not enough other days to compare")}
          <ul class="ou-habits"><li><p class="ou-hb-top"><span>${esc("Days with a meal logged")}</span><b>${esc(`${m.days} of ${m.logged}`)}</b></p><span class="ou-hb"><i class="ou-hb-f is-ctx" style="--w:${cov}%;--x:0%"></i>${mark ? `<i class="ou-hb-need" style="left:${need}%"></i>` : ""}</span>${mark ? `<p class="ou-hb-sub">${esc(`The mark is where Florin can compare: meals on ${need % 10 ? `${need} in 100` : `${need / 10} in 10`} of the days you log.`)}</p>` : ""}</li></ul>
          ${say(x, PT.sparseLine || "")}
          ${foodCta}
          ${note}`);
      }
      return card(x, "ou-pattern", "Possible patterns: nothing stands out", `
        ${head(x, "Possible patterns")}
        ${hl(x, "Nothing stands out right now")}
        ${say(x, "Florin compared what you logged with the days after, and nothing repeats often enough to show. It keeps looking as you log.")}
        ${note}`);
    }
    const what = p.kind === "late" ? ["After a dinner past 8 PM", "After an earlier dinner"] : p.kind === "loose" ? [`The morning after ${p.food.toLowerCase()}`, "Other mornings"] : [`The day after ${p.food.toLowerCase()}`, "Other days"];
    /* a later first BM is a shift from your window, so Gold. A looser first BM or bloating is a reading, not a shift */
    const k = p.kind === "late" ? "shift" : "read";
    const hitWord = p.kind === "late" ? "Later than your window" : p.kind === "loose" ? "A looser first BM" : "Bloating";
    const rows = [
      { label: what[0], value: `${p.hit} of ${p.n}`, segs: [{ k, w: pct(p.hit, 0, p.n) }], ctx: true },
      { label: what[1], value: `${p.oh} of ${p.on}`, segs: [{ k, w: pct(p.oh, 0, p.on) }] }
    ];
    const tiers = ["Early signal", "Showing up often", "Consistent"];
    const bars = `<ul class="ou-habits is-pattern">${rows.map((r, i) => `<li style="--i:${i}"><p class="ou-hb-top"><span>${r.ctx ? '<i class="ou-ctxdot" aria-hidden="true"></i>' : ""}${esc(r.label)}</span><b>${esc(r.value)}</b></p><span class="ou-hb" role="img" aria-label="${esc(`${r.label}: ${hitWord.toLowerCase()} ${r.value} times.`)}">${r.segs.map((s) => `<i class="ou-hb-f is-${s.k}" style="--w:${s.w}%;--x:0%"></i>`).join("")}</span></li>`).join("")}</ul>`;
    return card(x, "ou-pattern", `A possible pattern: ${p.title}`, `
      ${head(x, "A possible pattern", p.food ? chip(x, "ctx", p.food) : chip(x, "ctx", "Dinner time"))}
      ${stateW(x, "ctx", p.tier)}
      ${hl(x, p.title)}
      ${bars}
      ${say(x, p.line)}
      <div class="ou-sure"><p class="ou-km-k">How sure</p><span class="ou-vt is-tiers" style="--n:3" role="img" aria-label="${esc(`How sure: ${p.tier}.`)}">${tiers.map((t, i) => `<i class="ou-vt-c${i + 1 === p.tierK ? " is-on" : ""}"></i>`).join("")}<i class="ou-vt-m" style="left:${r1(((p.tierK - 0.5) / 3) * 100)}%;--span:1"></i></span><p class="ou-tiers" aria-hidden="true">${tiers.map((t, i) => `<span${i + 1 === p.tierK ? ' class="is-on"' : ""}>${esc(t)}</span>`).join("")}</p></div>
      ${legend(x, [[k === "shift" ? "shift" : "read", hitWord], ["ctx", what[0]]])}
      ${note}`);
  }

  /* ---------- after the cards are drawn: the 30 and 90 day switch, the scrubber, the tag chips ---------- */
  function after(el) {
    if (!el || el.__ouWired) return;
    el.__ouWired = true;
    const ptsOf = (plot) => { try { return JSON.parse(plot.dataset.pts || "[]"); } catch (e) { return []; } };
    /* move the scrubber, its dot and its pill to point i */
    const moveTo = (plot, i) => {
      const pts = ptsOf(plot), p = pts[i];
      if (!p) return;
      const g = plot.querySelector(".ou-scrub");
      if (!g) return;
      const [px, py, v, label, out] = p;
      const l = g.querySelector(".ou-scrub-l"), cs = g.querySelectorAll("circle"), pill = g.querySelector(".ou-pill"), rect = pill.querySelector("rect"), txt = pill.querySelector("text");
      l.setAttribute("x1", px); l.setAttribute("x2", px); l.setAttribute("y2", py);
      cs.forEach((c) => { c.setAttribute("cx", px); c.setAttribute("cy", py); c.classList.toggle("is-shift", !!out); });
      const t = `${v} · ${label}`, pw = Math.round((t.length * 6.4 + 24) * 10) / 10, pr = +plot.dataset.pr || 254;
      txt.textContent = t; rect.setAttribute("width", pw); txt.setAttribute("x", pw / 2);
      pill.setAttribute("transform", `translate(${Math.max(0, Math.min(pr - pw, px - pw / 2))} 6)`);
      plot.dataset.at = i;
      g.classList.add("is-moved");
      plot.setAttribute("aria-valuenow", i);
      plot.setAttribute("aria-valuetext", `${label}: ${v}, ${out ? (v > +plot.dataset.hi ? "above" : "below") : "within"} your usual range`);
    };
    const nearest = (plot, clientX) => {
      const svg = plot.querySelector("svg"), box = svg.getBoundingClientRect(), W = +plot.dataset.w || 326;
      const sx = ((clientX - box.left) / box.width) * W;
      const pts = ptsOf(plot);
      let best = 0, bd = Infinity;
      pts.forEach((p, i) => { const d = Math.abs(p[0] - sx); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !el.contains(b)) return;
      const art = b.closest(".lk-oura .ou");
      if (!art) return;
      if (b.dataset.ouSpan) {
        art.querySelectorAll("[data-ou-span]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
        art.querySelectorAll(".ou-pane").forEach((p) => { p.hidden = p.dataset.span !== b.dataset.ouSpan; });
      } else if (b.hasAttribute("data-ou-tag")) {
        b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
      } else if (b.classList.contains("ou-ct-top") && b.hasAttribute("aria-controls")) {
        const more = art.querySelector(`#${CSS.escape(b.getAttribute("aria-controls"))}`);
        const open = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", String(open));
        if (more) more.hidden = !open;
      } else if (b.hasAttribute("data-ou-close")) {
        const tc = b.closest(".ou-tagcard");
        /* the card goes, and focus stays in this card rather than dropping to the page */
        if (tc) { tc.hidden = true; const h = art.querySelector(".ou-k"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
      }
    });
    el.addEventListener("pointermove", (e) => {
      const plot = e.target.closest && e.target.closest(".lk-oura .ou-plot");
      if (!plot) return;
      moveTo(plot, nearest(plot, e.clientX));
    });
    el.addEventListener("pointerout", (e) => {
      const plot = e.target.closest && e.target.closest(".lk-oura .ou-plot");
      if (!plot || plot.contains(e.relatedTarget)) return;
      const pts = ptsOf(plot);
      moveTo(plot, pts.length - 1);
    });
    el.addEventListener("keydown", (e) => {
      const plot = e.target.closest && e.target.closest(".lk-oura .ou-plot");
      if (!plot || (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End")) return;
      e.preventDefault();
      const pts = ptsOf(plot), at = plot.dataset.at != null ? +plot.dataset.at : pts.length - 1;
      const i = e.key === "Home" ? 0 : e.key === "End" ? pts.length - 1 : clamp(at + (e.key === "ArrowLeft" ? -1 : 1), 0, pts.length - 1);
      moveTo(plot, i);
    });
  }

  (window.FLOOKS = window.FLOOKS || []).push({
    id: "oura",
    name: "Oura",
    idea: "Dark first, on a Forest atmosphere: FloraScore as an open arc gauge with your usual on its track and the day's one big thing in Lora, parts as shortcut rings and Contributors rows, Vitals-style tracks, smooth trends with zone names, and a curved clock for the morning.",
    components: { score, parts, trend, week, month, timing, often, form, symptoms, checkin, pattern },
    after
  });
})();
