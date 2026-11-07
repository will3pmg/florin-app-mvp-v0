/* Florin app refresh: a photo of a meal (Will, Nov 7: "Let's add in an option to load an image for food analysis (only
   a paid feature)"). Registers into window.FLORIN_EXT and wraps RU functions (CLAUDE.md, Extension hooks); it never
   edits a core file.

   What it does:
   - both meal sheets (RU.mealQuick, the quick log, and RU.meal, one meal at a time) get an Add a photo row before the
     box for the words. A member's opens the phone's own picker (a file input, accept from what Claude can read, else
     image/*, and no capture attribute, so a phone offers the camera and the library both); Use a sample photo under
     it lets the demo run with no photo at all. On Free the row carries the membership lock and opens the paywall
     (data-pay="photo"), and RU.paywall is wrapped to list the photo with what membership adds;
   - a photo opens "ph", a full sheet over the meal sheet: the photo small, one line on where it goes, then what Florin
     sees as chips the person checks (tap one to take it out, Something else to add one), which meal it was (it follows
     the time until picked) and the time. Nothing is saved until Save, which runs the core's own save-meal on the
     sheet's state, so the meal is committed, its foods counted (L.matchFoods) and its toast shown exactly as a typed or
     spoken meal's are. The words saved run through the alarm net (L.alarmsIn); a sign opens the primary care sheet;
   - what reads the photo: Claude, through the page's sample capability, when the page declares images
     (capabilities: { sample: { images: true } }) and the viewer allows it: one call, quick tier, a strict prompt, the
     reply checked (only plain food names kept: no numbers, no judgement or health words, nothing the claims rules or
     the alarm net catch, "can't tell" counted, never guessed). With no capability (a local file, a test, a view that
     can't send images, a viewer who says no) the demo plays a sample instead: that slot's meal from L.mealSay, the
     day as the microphone plays it, and says so in one line;
   - the photo lives in memory only, as a blob URL revoked when its sheet closes, and goes nowhere but that one Claude
     call. Nothing about it is stored.
   Screens: Logging > A photo of a meal (the sample photo, read; on Free the paywall, as a detail is), and Membership >
   A photo of a meal, free (Plan set to Free, the meal sheet with its locked row). */
(function () {
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, EXT = window.FLORIN_EXT;
  if (!FL || !L || !RU || !AD || !EXT) return;
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime, ic = RU.icon;
  const MOD = "Florin photo module (refresh-photo.js)";
  const warn = (where, e) => { try { console.warn(`${MOD}: ${where} failed.`, e); } catch (x) { /* no console */ } };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  /* the camera, drawn as the app's icons are (20 by 20, a 1.5 stroke from .ic) */
  const cam = (cls = "") => `<svg class="ic ${cls}" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.2c0-.9.7-1.6 1.6-1.6h1.8l1.3-2h3.6l1.3 2h1.8c.9 0 1.6.7 1.6 1.6v7.2c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6z"/><circle cx="10" cy="10.6" r="3"/></svg>`;
  /* the meals a photo can be, in the app's own words (Other reads as a snack or drink, as L.mealLabel says it) */
  const KINDS = L.MEALS.map(([k]) => [k, L.mealLabel(k)]);
  const free = (V) => !!V && V.plan === "free";

  /* ====================================================================== */
  /* WHAT READS THE PHOTO                                                     */
  /* ====================================================================== */
  /* the sample capability, asked for once at load (Ask asks too; use() is memoized). Images only when the page
     declares them and this view can send them: sample.limits() says so, and gives the file types to accept */
  const CAP = { fn: null, images: null, off: null };
  const HIDE = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed", "images_unavailable"];
  const capReady = (async () => {
    try {
      const c = window.claude;
      const f = c && typeof c.use === "function" ? await c.use("sample") : null;
      if (typeof f === "function") {
        CAP.fn = f;
        const lim = typeof f.limits === "function" ? await f.limits().catch(() => null) : null;
        CAP.images = lim && lim.images && Array.isArray(lim.images.mediaTypes) && lim.images.mediaTypes.length ? lim.images : null;
      }
    } catch (e) { CAP.fn = null; CAP.images = null; }
    /* a picker already drawn takes the types Claude reads (iPhone photos come as JPEG then, not HEIC) */
    try { const a = EXT.api; if (a && a.root) a.root.querySelectorAll("input[data-ph-file]").forEach((el) => (el.accept = accept())); } catch (e) { /* drawn next time */ }
    return CAP;
  })();
  const canRead = () => !!(CAP.fn && CAP.images && typeof CAP.fn.json === "function" && !CAP.off);
  const accept = () => (CAP.images ? CAP.images.mediaTypes.join(",") : "image/*");

  /* the prompt: memoryless, so the instruction, the rules and the format all go in it */
  const PROMPT = [
    "You are reading one photo for a food log. List each food and each drink you can see in the photo.",
    "Rules:",
    "- Plain, everyday names, one to three words each, in lowercase: for example \"rice\", \"salmon\", \"green salad\", \"coffee\".",
    "- Name only what you can see. If you can see something but can't tell what it is, don't guess: count it in \"cantTell\" instead.",
    "- No amounts, sizes, calories or nutrition. No brand names. No words about health, and nothing about whether a food is good or bad for anyone.",
    "- If the photo shows no food or drink, return an empty list.",
    "Reply with only this JSON and nothing else: {\"foods\": [\"rice\", \"salmon\"], \"cantTell\": 0}"
  ].join("\n");
  /* the reply, checked: only plain food names are kept. A judgement word is taken out of a name ("healthy salmon" is
     salmon); a name with a number, an amount, a nutrient, a claim the claims rules catch or a word the alarm net hears
     is left out whole; "can't tell" and the like are counted, never shown as a food */
  const JUDGE = /\b(?:healthy|healthier|unhealthy|good|bad|junk|clean|cheat|guilty|guilt-free|indulgent|naughty|nutritious|ultra-processed|processed|trigger(?:ing|s)?|inflammatory|toxic|superfoods?|fattening|diet|organic|natural|wholesome)\b/gi;
  const DROP = /\d|\b(?:calories?|kcal|cals?|grams?|ounces?|oz|servings?|portions?|nutrients?|nutrition|vitamins?|macros?|sodium|carbs?|cholesterol|percent)\b/i;
  const UNSURE = /^(?:can'?t tell|cannot tell|unknown|unclear|unsure|not sure|unidentified|something|an? item|item|food|drink|other)$/i;
  const claims = (s) => { try { const f = window.FLORIN_REFRESH_CHECK; return typeof f === "function" ? f(s).length > 0 : false; } catch (e) { return false; } };
  function clean(reply) {
    const raw = reply && Array.isArray(reply.foods) ? reply.foods : Array.isArray(reply) ? reply : [];
    const said = Math.max(0, Math.min(9, Math.round(+((reply && reply.cantTell) || 0)) || 0));
    let unsure = 0;
    const out = [], seen = new Set();
    raw.slice(0, 24).forEach((x) => {
      let s = String(x == null ? "" : x).replace(/[\u2018\u2019]/g, "'").replace(/[^\p{L}\s'&-]/gu, " ").replace(/\s+/g, " ").trim().toLowerCase();
      if (!s) return;
      if (UNSURE.test(s)) { unsure++; return; }
      if (DROP.test(String(x))) return;
      s = s.replace(JUDGE, " ").replace(/\s+/g, " ").trim().replace(/^(?:a|an|some|the|and)\s+/, "").replace(/^(?:glass|cup|mug|bowl|slice|piece|plate)s?\s+of\s+/, "").trim();
      if (s.length < 2 || s.length > 32 || s.split(" ").length > 4) return;
      if (claims(s) || L.alarmsIn(s).length) return;
      if (seen.has(s)) return;
      seen.add(s);
      out.push(s);
    });
    /* a thing Claude couldn't name may be both in the list and in its count: counted once */
    return { names: out.slice(0, 12), unsure: Math.max(said, unsure) };
  }

  /* the sample: the slot's meal as the microphone plays the day (L.mealSay, "Pizza for dinner"), else that kind's
     latest seeded meal, else the sheet's own example. Split into the names a photo would show */
  const SAY_RX = /(.+?) (for (breakfast|lunch|dinner)|as a snack)(?:, (?:and )?|\.?$)/g;
  function sampleText(M, d, k) {
    try {
      const said = L.mealSay(M, d);
      SAY_RX.lastIndex = 0;
      let m;
      while ((m = SAY_RX.exec(said))) { if ((m[3] || "other") === k) return m[1].replace(/^and /i, ""); }
    } catch (e) { warn("reading the day's meals", e); }
    for (let dd = d; dd >= Math.max(0, d - 30); dd--) {
      const x = ((M.seedMeals && M.seedMeals[dd]) || []).find((s) => s.meal === k);
      if (x) return x.text;
    }
    return String((L.MEAL_COPY[k] || L.MEAL_COPY.dinner).ph || "").replace(/^For example:\s*/i, "");
  }
  const splitFoods = (text) => String(text || "").replace(/\.$/, "")
    .split(/\s*,\s*|\s+and\s+|\s+with\s+|\s*&\s*/i)
    .map((s) => s.trim().toLowerCase().replace(/^(?:a|an|some|the)\s+/, "").replace(/^(?:glass|cup|mug|bowl|slice|piece|plate)s?\s+of\s+/, "").replace(/^(?:afternoon|morning|evening|leftover)\s+/, ""))
    .filter(Boolean);

  /* ====================================================================== */
  /* THE PHOTO ROW ON BOTH MEAL SHEETS                                        */
  /* ====================================================================== */
  const photoRow = (V, st) => {
    if (!st || st.edit) return "";
    if (free(V)) {
      return `<div class="ap-f ph-row"><button type="button" class="ph-add" data-act="pay" data-pay="photo">${cam("ph-add-ic")}<span class="ph-add-m"><b>Add a photo</b><em>With Florin membership</em></span>${ic("lock", "ph-add-go")}</button></div>`;
    }
    return `<div class="ap-f ph-row">
        <button type="button" class="ph-add" data-act="ph-add">${cam("ph-add-ic")}<span class="ph-add-m"><b>Add a photo</b><em>Florin picks out the foods for you to check</em></span>${ic("chev", "ph-add-go")}</button>
        <input type="file" class="ph-file" data-ph-file accept="${esc(accept())}" hidden tabindex="-1" aria-hidden="true">
        <button type="button" class="ap-link ph-sample" data-act="ph-sample">Use a sample photo</button>
      </div>`;
  };
  /* before the box for the words: under the microphone on the quick log, under Which meal on the one-meal sheet */
  const withRow = (html, V, st, cls) => {
    const row = photoRow(V, st);
    if (!row || typeof html !== "string") return html;
    const rx = new RegExp(`(<div class="ap-f"><label class="ap-f-l" for="${cls}\\d+-text">)`);
    return rx.test(html) ? html.replace(rx, `${row}$1`) : html;
  };
  {
    const baseQ = RU.mealQuick, baseM = RU.meal;
    if (typeof baseQ === "function") RU.mealQuick = function (M, V, st) { const h = baseQ.apply(this, arguments); try { return withRow(h, V, st, "mq"); } catch (e) { warn("the photo row on the quick log", e); return h; } };
    if (typeof baseM === "function") RU.meal = function (M, V, st) { const h = baseM.apply(this, arguments); try { return withRow(h, V, st, "ml"); } catch (e) { warn("the photo row on the meal sheet", e); return h; } };
  }

  /* the paywall lists the photo with what membership adds, and says it when the photo opened it */
  {
    const base = RU.paywall;
    if (typeof base === "function") {
      RU.paywall = function (M, V, st) {
        let h = base.apply(this, arguments);
        try {
          if (typeof h !== "string") return h;
          const li = `<li style="--i:0"><span class="ap-pay-ic">${cam()}</span><span><b>A photo of a meal</b><em>Florin picks out the foods for you to check</em></span></li>`;
          /* after Possible patterns (the food row), else before Ask Florin, else at the end of the list */
          if (/(<li[^>]*>(?:(?!<\/li>)[\s\S])*Possible patterns(?:(?!<\/li>)[\s\S])*<\/li>)/.test(h)) h = h.replace(/(<li[^>]*>(?:(?!<\/li>)[\s\S])*Possible patterns(?:(?!<\/li>)[\s\S])*<\/li>)/, `$1${li}`);
          else h = h.replace(/(<\/ul>)/, `${li}$1`);
          let i = 0;
          h = h.replace(/(<ul class="ap-pay-list">[\s\S]*?<\/ul>)/, (ul) => ul.replace(/style="--i:\d+"/g, () => `style="--i:${i++}"`));
          if (st && st.from === "photo") h = h.replace(/(<h2 id="[^"]*-h"[^>]*>)[^<]*(<\/h2>)/, "$1Log a meal from a photo$2");
          return h;
        } catch (e) { warn("the photo on the paywall", e); return h; }
      };
    }
  }

  /* ====================================================================== */
  /* THE PHOTO SHEET                                                          */
  /* ====================================================================== */
  const PLATE = `<svg class="ph-plate" viewBox="0 0 96 96" role="img" aria-label="A sample photo of a meal"><rect class="ph-pl-t" width="96" height="96"/><circle class="ph-pl-r" cx="48" cy="50" r="38"/><circle class="ph-pl-p" cx="48" cy="50" r="30"/><ellipse class="ph-pl-a" cx="38" cy="44" rx="13" ry="9"/><ellipse class="ph-pl-b" cx="58" cy="58" rx="12" ry="8"/><circle class="ph-pl-c" cx="60" cy="38" r="7"/><circle class="ph-pl-c" cx="66" cy="46" r="4"/></svg>`;
  /* where the photo goes, said only as it's true for what was built */
  const whereLine = (st) => (st.sample ? "Only the foods you confirm are saved."
    : st.sent ? "Florin sends the photo once to read it and doesn't keep it. Only the foods you confirm are saved."
      : "The photo stays on this phone; only the foods you confirm are saved.");
  const STATUS = {
    reading: "Reading your photo",
    claude: "Read from your photo. Check each one.",
    sample: "A sample photo. Check the foods as you would for your own.",
    local: "This demo can't read photos here, so these foods are a sample. Change them to match your plate.",
    off: "Claude isn't allowed to read photos in this view, so these foods are a sample, not read from your photo.",
    busy: "Claude couldn't read the photo just now, so these foods are a sample, not read from your photo.",
    none: "Florin didn't find a food or drink in this photo. Add what you had.",
    rejected: "This photo couldn't be read. Try another, or add what you had.",
    stopped: "Stopped. Add what you had."
  };
  const dayLabel = (d) => (d === L.TODAY ? "Today" : d === L.TODAY - 1 ? "Yesterday" : RU.dayName(d));
  const onItems = (st) => st.items.filter((x) => x.on);
  const textOf = (st) => cap1(andList(onItems(st).map((x) => x.name)));
  function render(M, V, st) {
    const id = `ph${V.uid}`, reading = st.phase === "reading";
    const n = onItems(st).length, ok = !reading && n > 0;
    const C = L.MEAL_COPY[st.meal] || L.MEAL_COPY.other;
    const pic = st.sample ? PLATE : `<img class="ph-img" src="${esc(st.shown || st.url || "")}" alt="Your photo of the meal">`;
    const chips = st.items.map((x, i) => `<button type="button" class="ap-ch${x.on ? " is-on" : ""}" data-act="ph-food" data-v="${i}" aria-pressed="${x.on}">${x.on ? ic("check") : ""}${esc(cap1(x.name))}</button>`).join("");
    const unsure = st.unsure > 0 ? `<p class="ap-f-h">${esc(st.unsure === 1 ? "Florin couldn't tell what one thing was. Add it if you know." : `Florin couldn't tell what ${plural(st.unsure, "thing")} were. Add them if you know.`)}</p>` : "";
    const add = st.adding
      ? `<div class="ap-sy-add ph-new"><label class="sr" for="${id}-new">Name a food or drink</label><input id="${id}-new" class="ap-in" data-ph-in="new" type="text" enterkeyhint="done" autocomplete="off" placeholder="A food or drink" value="${esc(st.newName || "")}"><button type="button" class="ap-btn" data-act="ph-add-food">Add</button></div>`
      : `<button type="button" class="ap-ch ph-other" data-act="ph-other">${ic("plus")}Something else</button>`;
    const hint = reading ? "Reading your photo first" : n ? "" : "Keep or add at least one food to save";
    return `<div class="ap-fsh ph" role="dialog" aria-modal="true" aria-labelledby="${id}-h">
      <div class="ap-fsh-h"><button type="button" class="ap-lg-x" data-act="ph-close" aria-label="Close">${ic("close")}</button><div class="ap-fsh-t"><h2 id="${id}-h">A photo of your meal</h2></div><span class="ap-fsh-sp"></span></div>
      <div class="ap-fsh-b">
        <div class="ph-pic">
          <span class="ph-frame">${pic}</span>
          <span class="ph-pic-m"><b class="ph-status">${esc(STATUS[st.status] || STATUS.reading)}</b><em>${esc(whereLine(st))}</em></span>
        </div>
        ${reading ? `<div class="ph-wait"><span class="ph-dots" aria-hidden="true"><i></i><i></i><i></i></span><button type="button" class="ap-btn ap-btn--line ap-btn--c" data-act="ph-stop">Stop</button></div>` : `
        <div class="ap-f"><span class="ap-f-l" id="${id}-fl">Is this what you had?</span>
          <p class="ap-f-h">Tap one to take it out. Add anything Florin missed.</p>
          <div class="ap-chs ap-chs--wrap ph-foods" role="group" aria-labelledby="${id}-fl">${chips}${st.adding ? "" : add}</div>
          ${st.adding ? add : ""}
          ${unsure}
          ${n ? `<div class="ap-ml-count" aria-live="polite">${RU.mealCount(M, { text: textOf(st) })}</div>` : ""}
        </div>
        <div class="ap-f"><span class="ap-f-l" id="${id}-ml">Which meal</span><div class="ap-chs ap-chs--wrap" role="radiogroup" aria-labelledby="${id}-ml">${KINDS.map(([k, l]) => `<button type="button" class="ap-ch${st.meal === k ? " is-on" : ""}" data-act="ph-meal" data-v="${k}" role="radio" aria-checked="${st.meal === k}">${esc(l)}</button>`).join("")}</div>
          ${st.mealTouched ? "" : `<p class="ap-f-h">From the time. Pick another if it was.</p>`}</div>
        <div class="ap-f"><span class="ap-f-l" id="${id}-wl">When</span>
          <div class="ap-when" role="group" aria-labelledby="${id}-wl"><span class="ap-fld ph-day">${ic("cal")}<span>${esc(dayLabel(st.d))}</span></span><label class="ap-fld">${ic("clock")}<span class="sr">Time</span><input id="${id}-time" type="time" data-in="time" value="${RU.toInput(st.t)}"></label></div></div>`}
      </div>
      <div class="ap-fsh-f">
        ${hint ? `<p class="ap-fsh-hint" id="${id}-hint" aria-live="polite">${esc(hint)}</p>` : ""}
        <button type="button" class="ap-btn ap-btn--block" data-act="ph-save"${ok ? "" : ` aria-disabled="true" aria-describedby="${id}-hint"`}>${esc(C.save)}</button>
      </div>
    </div>`;
  }
  EXT.overlays.ph = { kind: "full", render: (M, V, st) => render(M, V, st), key: () => "meal-photo" };

  /* ---------- the photo in memory: a blob URL, let go when its sheet closes ---------- */
  const live = new Set();
  const letGo = (st) => {
    if (!st) return;
    if (st.ctl) { try { st.ctl.abort(); } catch (e) { /* already stopped */ } }
    if (st.url) { try { URL.revokeObjectURL(st.url); } catch (e) { /* gone */ } live.delete(st.url); }
    st.url = null; st.shown = null; st.file = null;
  };
  /* a photo sheet closed some other way (Escape, Reset) is let go the next time anything here runs */
  const sweep = (api) => { if (!api) return; const open = new Set(api.S.ovl.filter((o) => o.type === "ph").map((o) => o.st.url)); [...live].forEach((u) => { if (!open.has(u)) { try { URL.revokeObjectURL(u); } catch (e) { /* gone */ } live.delete(u); } }); };
  try { window.addEventListener("pagehide", () => { live.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { /* gone */ } }); live.clear(); }); } catch (e) { /* no window events */ }

  const isOpen = (api, ov) => !!ov && api.S.ovl.includes(ov);
  const setItems = (st, names, status) => { st.items = names.map((name) => ({ name, on: true })); st.status = status; st.phase = "read"; };
  /* the sample foods for this sheet's meal and day */
  const playSample = (api, st, status) => { setItems(st, splitFoods(sampleText(api.M(), st.d, st.meal)), status); st.unsure = 0; };

  async function read(api, ov) {
    const st = ov.st;
    if (st.sample) { playSample(api, st, "sample"); return done(api, ov); }
    await capReady;
    if (!isOpen(api, ov)) return null;
    if (!canRead()) { playSample(api, st, CAP.off ? "off" : "local"); return done(api, ov); }
    const ctl = new AbortController();
    st.ctl = ctl; st.sent = true;
    try {
      const reply = await CAP.fn.json(PROMPT, { images: [st.file], modelTier: "quick", signal: ctl.signal });
      if (!isOpen(api, ov)) return null;
      const c = clean(reply);
      setItems(st, c.names, c.names.length ? "claude" : "none");
      st.unsure = c.unsure;
    } catch (e) {
      if (!isOpen(api, ov)) return null;
      const code = e && typeof e.code === "string" ? e.code : "upstream_error";
      /* where the photo went stays said as it may be: a call stopped or failed part way may have sent it; one the
         viewer didn't allow, or a file Claude can't take, never left */
      if (code === "cancelled") setItems(st, [], "stopped");
      else if (code === "image_rejected") { setItems(st, [], "rejected"); st.sent = false; }
      else if (HIDE.includes(code)) { CAP.off = code; st.sent = false; playSample(api, st, "off"); }
      else playSample(api, st, "busy");
    } finally { st.ctl = null; }
    return done(api, ov);
  }
  function done(api, ov) {
    if (!isOpen(api, ov)) return null;
    const st = ov.st;
    if (!st.items.length) st.adding = true;
    api.rerender(ov, { noRestore: true });
    const n = st.items.length;
    api.say(n ? `${STATUS[st.status]} ${plural(n, "food")}: ${andList(st.items.map((x) => x.name))}.` : STATUS[st.status]);
    /* focus: the first food to check, or the box to add one */
    requestAnimationFrame(() => { if (api.top() !== ov) return; const f = ov.el.querySelector(n ? ".ph-foods .ap-ch" : "[data-ph-in=new]"); if (f) f.focus({ preventScroll: true }); });
    return ov;
  }

  /* the sheet opens over the meal sheet it came from, on that sheet's day; the meal follows the time until picked, or
     starts as the one the one-meal sheet has picked */
  function openPhoto(api, o) {
    sweep(api);
    const under = api.top(), us = under && under.type === "meal" ? under.st : null;
    const d = us && us.d != null ? us.d : L.TODAY;
    const t = d === L.TODAY ? L.NOW : us && !us.quick ? us.t : 12.5;
    const meal = us && !us.quick && us.mealTouched ? us.meal : L.mealFor(t);
    const st = { d, t, meal, mealTouched: !!(us && !us.quick && us.mealTouched), tTouched: false, sample: !!o.sample, url: o.url || null, file: o.file || null, shown: null, sent: canRead() && !o.sample, phase: "reading", status: "reading", items: [], unsure: 0, adding: false, newName: "", text: "", note: "" };
    if (st.url) live.add(st.url);
    const ov = api.push("ph", st);
    if (!ov) { letGo(st); return null; }
    read(api, ov).catch((e) => { warn("reading the photo", e); if (isOpen(api, ov)) { playSample(api, ov.st, "busy"); done(api, ov); } });
    return ov;
  }
  const phTop = (api) => { const t = api.top(); return t && t.type === "ph" ? t : null; };
  /* the microphone stops before a photo (Easy's voice first may have started it as the sheet opened) */
  const hush = (api) => { const t = api.top(); if (t && t.type === "meal" && t.st && t.st.voice === "listening") api.core("mq-mic", document.createElement("button")); };

  /* ---------- the acts ---------- */
  const ACTS = {
    "ph-add"(b, api) {
      const t = api.top(); if (!t) return;
      if (free(api.V())) { api.push("pay", { from: "photo" }); return; }
      hush(api);
      const inp = t.el.querySelector("input[data-ph-file]");
      if (!inp) return;
      inp.accept = accept();
      inp.value = "";
      inp.click();
    },
    "ph-sample"(b, api) { if (free(api.V())) { api.push("pay", { from: "photo" }); return; } hush(api); openPhoto(api, { sample: true }); },
    "ph-food"(b, api) {
      const ov = phTop(api); if (!ov) return;
      const x = ov.st.items[+b.dataset.v]; if (!x) return;
      x.on = !x.on;
      api.rerender(ov);
      api.say(`${cap1(x.name)} ${x.on ? "kept" : "taken out"}.`);
    },
    "ph-other"(b, api) { const ov = phTop(api); if (!ov) return; ov.st.adding = true; api.rerender(ov, { noRestore: true }); const f = ov.el.querySelector("[data-ph-in=new]"); if (f) f.focus({ preventScroll: true }); },
    "ph-add-food"(b, api) {
      const ov = phTop(api); if (!ov) return;
      const st = ov.st, name = String(st.newName || "").replace(/\s+/g, " ").trim().slice(0, 48).toLowerCase();
      if (!name) { const f = ov.el.querySelector("[data-ph-in=new]"); if (f) f.focus({ preventScroll: true }); return; }
      const have = st.items.find((x) => x.name === name);
      if (have) have.on = true; else st.items.push({ name, on: true, own: true });
      st.newName = ""; st.adding = false;
      api.rerender(ov, { noRestore: true });
      api.say(`${cap1(name)} added.`);
      const f = ov.el.querySelector(".ph-other"); if (f) f.focus({ preventScroll: true });
    },
    "ph-meal"(b, api) { const ov = phTop(api); if (!ov) return; ov.st.meal = b.dataset.v; ov.st.mealTouched = true; api.rerender(ov); },
    "ph-stop"(b, api) { const ov = phTop(api); if (ov && ov.st.ctl) { try { ov.st.ctl.abort(); } catch (e) { /* already stopped */ } } },
    "ph-close"(b, api) { const ov = phTop(api); if (!ov) return; letGo(ov.st); api.pop(); },
    /* Save: the core's own save-meal on this sheet's state, so it's committed, counted and toasted as any meal is.
       The meal sheet it came from closes too when nothing is typed on it */
    "ph-save"(b, api, e) {
      const ov = phTop(api); if (!ov) return;
      const st = ov.st;
      if (st.phase === "reading" || !onItems(st).length) {
        const h = ov.el.querySelector(".ap-fsh-hint"); if (h) { h.classList.remove("is-flash"); void h.offsetWidth; h.classList.add("is-flash"); }
        return;
      }
      st.text = textOf(st); st.note = "";
      const signs = L.alarmsIn(st.items.filter((x) => x.on).map((x) => x.name).join(". "));
      const restore = api.snapshot();
      const day = L.day(api.M(), st.d), had = new Set(((day && day.entries) || []).map((x) => x.id));
      letGo(st);
      api.act("save-meal", b, e);
      if (api.S.ovl.includes(ov)) return; /* the save didn't go through */
      const day2 = L.day(api.M(), st.d), e2 = ((day2 && day2.entries) || []).find((x) => !had.has(x.id) && x.kind === "meal");
      const under = api.top();
      if (under && under.type === "meal" && !under.st.edit && !(under.st.text || "").trim()) { under.st.saved = true; api.pop({ instant: true, focusId: e2 ? e2.id : undefined }); }
      if (signs.length) { const fo = api.push("flag", { sign: L.signText(signs), signs, restore }); if (fo && e2) fo.okey = { act: "edit", id: e2.id }; }
    }
  };
  Object.entries(ACTS).forEach(([k, f]) => { EXT.acts[k] = (b, a, e) => { try { return f(b, a || EXT.api, e); } catch (err) { warn(`the ${k} tap`, err); } }; });

  /* ---------- the phone's own events: the picker, the box for a food, Enter, the time, a photo that won't show ---------- */
  const watched = new WeakSet();
  function watch(api) {
    if (!api || !api.root || watched.has(api.root)) return;
    const root = api.root;
    watched.add(root);
    root.addEventListener("change", (e) => {
      const el = e.target;
      if (el && el.matches && el.matches("input[data-ph-file]")) {
        const f = el.files && el.files[0];
        el.value = "";
        if (!f) return;
        if (f.type && !/^image\//.test(f.type)) { api.toast("That file isn't a photo. Pick a photo of the meal."); return; }
        let url = null;
        try { url = URL.createObjectURL(f); } catch (err) { warn("holding the photo", err); }
        openPhoto(api, { file: f, url });
        return;
      }
      /* a new time picks the meal that fits it, until the person picks one */
      const ov = phTop(api);
      if (ov && el && el.matches && el.matches('[data-in="time"]') && !ov.st.mealTouched) {
        const h = RU.fromInput(el.value);
        if (h != null) { ov.st.t = h; ov.st.tTouched = true; ov.st.meal = L.mealFor(h); api.rerender(ov); }
      }
    });
    root.addEventListener("input", (e) => {
      const el = e.target, ov = phTop(api);
      if (ov && el && el.matches && el.matches("[data-ph-in=new]")) ov.st.newName = el.value;
    });
    root.addEventListener("keydown", (e) => {
      const el = e.target;
      if (e.key === "Enter" && el && el.matches && el.matches("[data-ph-in=new]")) { e.preventDefault(); ACTS["ph-add-food"](el, api); }
    });
    /* a blob URL the page isn't allowed to show is read into memory as a data URL instead, once */
    root.addEventListener("error", (e) => {
      const el = e.target, ov = phTop(api);
      if (!ov || !el || !el.matches || !el.matches("img.ph-img") || ov.st.shown || !ov.st.file) return;
      try {
        const r = new FileReader();
        r.onload = () => { if (api.S.ovl.includes(ov) && typeof r.result === "string") { ov.st.shown = r.result; api.rerender(ov, { noRestore: true }); } };
        r.readAsDataURL(ov.st.file);
      } catch (err) { warn("showing the photo", err); }
    }, true);
  }
  /* the phone exists after this file loads: watch it from the first meal sheet drawn, or the first set */
  {
    const base = RU.mealQuick, base2 = RU.meal;
    RU.mealQuick = function () { try { watch(EXT.api); } catch (e) { warn("watching the phone", e); } return base.apply(this, arguments); };
    RU.meal = function () { try { watch(EXT.api); } catch (e) { warn("watching the phone", e); } return base2.apply(this, arguments); };
  }
  EXT.onSet.push((k, v, api) => { try { watch(api); sweep(api); } catch (e) { warn("following a change", e); } });

  /* ====================================================================== */
  /* WHAT THE PAGE KNOWS: screens, opens, keys, notes                         */
  /* ====================================================================== */
  EXT.screens.push(["Logging", [["meal-photo", "A photo of a meal"]]]);
  EXT.screens.push(["Membership", [["meal-photo-free", "A photo of a meal, free"]]]);
  /* the core's own act, so nothing a module adds to opening a meal sheet (Easy's voice first) runs under the photo */
  const openMeal = (api, row) => {
    api.core("open-meal", document.createElement("button"));
    const t = api.top();
    if (t && t.type === "meal" && row) { t.st.phRow = row; api.nav(); }
    return t;
  };
  /* a member: the meal sheet and the sample photo read over it. On Free the paywall, as a detail opens it */
  EXT.opens["meal-photo"] = (api) => {
    watch(api);
    openMeal(api);
    if (free(api.V())) { api.push("pay", { from: "photo" }, { instant: true }); return; }
    openPhoto(api, { sample: true });
  };
  /* Free: the plan is set to Free (the left bar follows), and the meal sheet shows its locked row */
  EXT.opens["meal-photo-free"] = (api) => {
    watch(api);
    if (!free(api.V())) api.set("plan", "free");
    openMeal(api, "free");
  };
  {
    const prev = EXT.keys.meal;
    EXT.keys.meal = (o) => (o && o.st && o.st.phRow === "free" && free(EXT.api && EXT.api.V()) ? "meal-photo-free" : typeof prev === "function" ? prev(o) : null);
  }
  EXT.notes["meal-photo"] = () => ({
    t: "A photo of a meal",
    lede: "With membership, either meal sheet takes a photo. Florin lists the foods it sees as chips; the person takes out or adds any, picks the meal (it follows the time until picked) and saves. Nothing is saved before that, and it saves as a typed meal does, so its foods count the same way. The photo is never kept. Claude reads it where the page allows; otherwise, and with Use a sample photo, the demo plays that day's meal.",
    open: ["Keep the photo with the log, for the person's own record, or never keep it, as here?"]
  });
  EXT.notes["meal-photo-free"] = () => ({
    t: "A photo of a meal, free plan",
    lede: "On Free, Add a photo carries the membership lock and opens the paywall, which lists the photo with what membership adds. Saying or typing what you ate stays free, so meals on ordinary days stay as easy to log."
  });

  /* for the checks: what reads a photo, and the reply check, without a photo */
  RU.photo = { clean, sampleText, splitFoods, canRead, prompt: PROMPT, ready: capReady, held: () => live.size };
})();
