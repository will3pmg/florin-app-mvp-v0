/* Florin data looks: the page. One row per component, one column per look, all drawn from the same numbers (FLD).
   A look is a file that registers itself on window.FLOOKS:
     { id, name, idea, components: { score(D, ctx), parts, trend, week, month, timing, often, form, symptoms, checkin, pattern }, after(el, ctx) }
   Each component returns the markup for one phone-width card (358px). The page wraps it in .ap with the theme, so a look
   uses the app's tokens (--ap-*) and the six brand colours, nothing else.
   Five looks don't fit side by side at 1440, so on a wide screen the look buttons are switches: turn looks off to
   compare two or three at a time with nothing to scroll. With more on, every row scrolls sideways and the rows scroll
   together, so a column stays one look all the way down the page; the arrows move the rows a column at a time. The
   picker stays at the top of the window as the page scrolls. On a phone the same buttons are tabs, one look at a
   time. */
(function () {
  const FL = window.FL, FLD = window.FLD, AD = window.FLORIN_APP;
  const mount = document.getElementById("lb");
  if (!FL || !FLD || !mount) return;
  const esc = FL.esc;
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* helpers every look can use: the chart kit, number formatting, and a count-up for big numerals */
  const n1 = (v) => Math.round(v * 10) / 10;
  const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1);
  function countUp(root) {
    root.querySelectorAll("[data-count]").forEach((el) => {
      const to = +el.dataset.count, dec = +(el.dataset.dec || 0);
      if (!isFinite(to)) return;
      if (reduced()) { el.textContent = to.toFixed(dec); return; }
      const t0 = performance.now(), dur = +(el.dataset.dur || 900);
      const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
      el.textContent = (0).toFixed(dec);
      requestAnimationFrame(step);
    });
  }
  window.FLL = { esc, T: AD.util.fmtTime, n1, lin, C: window.FLC, countUp, reduced };

  const COMPONENTS = [
    ["score", "FloraScore", "How is today, against my own usual?"],
    ["parts", "What makes up the score", "Which of the four parts moved it?"],
    ["trend", "FloraScore over 30 days", "Has it been steady, against my usual range?"],
    ["week", "This week at a glance", "Which days sat within my usual?"],
    ["month", "The last month", "How did each day sit, at a glance?"],
    ["timing", "Timing", "Did my first BM come in my usual window?"],
    ["often", "How often", "How many BMs a day, against my usual?"],
    ["form", "Form", "Were my forms within my usual?"],
    ["symptoms", "Symptoms", "How often did symptoms come up, and which?"],
    ["checkin", "Weekly check-in", "Is this week like my first weeks?"],
    ["pattern", "A possible pattern", "What tends to follow something I logged?"]
  ];

  /* the theme starts as the viewer's; the switch then sets the page and the cards together */
  const root = document.documentElement;
  const viewerTheme = () => root.getAttribute("data-theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const S = { persona: "sarah", mode: "C", data: "est", meals: "all", theme: viewerTheme(), look: null, hide: [], uid: 0, x: 0 };
  /* wide: the looks that are on sit side by side, and the rows scroll sideways together. Narrow: one look at a time,
     picked with the tabs */
  const WIDE = "(min-width: 820px)";
  const wide = () => !window.matchMedia || window.matchMedia(WIDE).matches;
  try { const s = JSON.parse(localStorage.getItem("florin-looks") || "{}"); Object.assign(S, s); if (!Array.isArray(S.hide)) S.hide = []; } catch (e) {}
  const save = () => { try { localStorage.setItem("florin-looks", JSON.stringify({ persona: S.persona, mode: S.mode, data: S.data, meals: S.meals, theme: S.theme, look: S.look, hide: S.hide })); } catch (e) {} };

  const seg = (key, label, opts) => `<div class="lb-ctl"><span class="lb-ctl-l" id="lb-${key}">${esc(label)}</span><div class="lb-seg" role="group" aria-labelledby="lb-${key}">${opts.map(([v, l]) => `<button type="button" data-k="${key}" data-v="${esc(v)}" aria-pressed="${S[key] === v}">${esc(l)}</button>`).join("")}</div></div>`;

  /* the new user's first days come from the prototype model, which starts every person in the same seeded week. Say so
     when that's the case, worked out from the logs rather than assumed, so the Person switch doesn't look broken */
  const daysSig = (D) => JSON.stringify(D.days[30].map((f) => [f.d, f.logged, f.first, f.count, f.forms.map((x) => x.name), f.sym.map((y) => `${y.name}${y.strength}`)]));
  const sameNote = (D) => {
    if (S.data !== "new" || !D.learning) return "";
    const mine = daysSig(D);
    const same = FLD.PERSONAS.every(([p]) => p === S.persona || daysSig(FLD.build(p, { mode: S.mode, data: S.data, meals: S.meals })) === mine);
    return same ? `<p class="lb-note">${esc(`On day ${D.learning.day}, every person has the same demo BM and symptom logs, so the cards don't change with the person yet.`)}</p>` : "";
  };

  function render() {
    const looks = (window.FLOOKS || []).slice();
    if (!S.look || !looks.some((l) => l.id === S.look)) S.look = looks[0] ? looks[0].id : null;
    /* a look that is off on a wide screen; never every look */
    S.hide = S.hide.filter((id) => looks.some((l) => l.id === id));
    if (S.hide.length >= looks.length) S.hide = [];
    const attrs = (id) => `${S.look !== id ? " data-off" : ""}${S.hide.includes(id) ? " data-hide" : ""}`;
    const D = FLD.build(S.persona, { mode: S.mode, data: S.data, meals: S.meals });
    const ctxOf = (look) => ({ uid: `${look.id}${++S.uid}`, theme: S.theme, esc, T: AD.util.fmtTime, n1, lin, C: window.FLC, motion: !reduced() });
    const card = (look, k) => {
      let html = "";
      try { html = look.components && look.components[k] ? look.components[k](D, ctxOf(look)) : `<p class="lb-missing">Not drawn in this look yet.</p>`; } catch (e) { console.error(look.id, k, e); html = `<p class="lb-missing">This card failed to draw: ${esc(e.message)}</p>`; }
      return `<div class="lb-cell" data-look="${esc(look.id)}"${attrs(look.id)}><p class="lb-cell-name" aria-hidden="true">${esc(look.name)}</p><div class="ap lk-${esc(look.id)}" data-theme="${S.theme}"><div class="lb-phonecard" data-k="${k}">${html}</div></div></div>`;
    };
    const count = ["No looks", "One look", "Two looks", "Three looks", "Four looks", "Five looks", "Six looks", "Seven looks"][looks.length] || `${looks.length} looks`;
    const ways = ["", "one way", "two ways", "three ways", "four ways", "five ways", "six ways", "seven ways"][looks.length] || `${looks.length} ways`;
    mount.innerHTML = `
      <header class="lb-head">
        <p class="lb-eyebrow">Florin app refresh · Data looks · Oct 27</p>
        <h1>${esc(count)} for the data</h1>
        <p class="lb-lede">${esc(`The same person, the same numbers, drawn ${ways}. Each look takes its cue from Oura: one score up front, parts you can see, charts that move. Every card is built from the refresh's manual logs and keeps Florin's rules: everything is read against your own usual, with Plum for your usual on light, Ray on dark, and Gold for a shift. Pick the one to take through the app.`)}</p>
      </header>
      <div class="lb-ctls" role="group" aria-label="What the cards show">
        ${seg("persona", "Person", FLD.PERSONAS)}
        ${seg("mode", "Consistency", [["A", "A · 1 to 7"], ["B", "B · 5 words"], ["C", "C · 7 words"]])}
        ${seg("data", "Logs", [["est", "12 weeks"], ["new", "New, day 5"]])}
        ${seg("meals", "Meal logs", FLD.MEAL_LOGS)}
        ${seg("theme", "Theme", [["light", "Light"], ["dark", "Dark"]])}
        <button type="button" class="lb-replay" data-act="replay">Replay the motion</button>
        <p class="lb-motion-off">Motion is off because your system asks for reduced motion.</p>
        ${sameNote(D)}
      </div>
      <div class="lb-pick">
        <nav class="lb-tabs" aria-label="Looks">${looks.map((l) => `<button type="button" data-k="look" data-v="${esc(l.id)}" aria-pressed="${S.look === l.id}">${esc(l.name)}</button>`).join("")}</nav>
        <div class="lb-arrows" role="group" aria-label="Scroll the looks"><button type="button" data-act="prev" aria-label="Scroll the looks back one column">&#8249;</button><button type="button" data-act="next" aria-label="Scroll the looks on one column">&#8250;</button></div>
        <p class="lb-pick-note" aria-live="polite"></p>
      </div>
      <div class="lb-looks lb-x">${looks.map((l) => `<section class="lb-look"${attrs(l.id)} data-look="${esc(l.id)}"><span class="lb-eyebrow">Look ${looks.indexOf(l) + 1}</span><h2>${esc(l.name)}</h2><p>${esc(l.idea || "")}</p></section>`).join("")}</div>
      ${COMPONENTS.map(([k, t, q]) => `<section class="lb-row" aria-labelledby="lb-h-${k}"><div class="lb-row-h"><h2 id="lb-h-${k}">${esc(t)}</h2><p>${esc(q)}</p></div><div class="lb-cells lb-x">${looks.map((l) => card(l, k)).join("")}</div></section>`).join("")}
      <footer class="lb-foot"><p>${esc(D.disclaimer)}</p><p>Every number here is computed from the demo person's logs. Change the person, the option, the logs or the meal logs above, and every look redraws.</p></footer>`;
    countUp(mount);
    looks.forEach((l) => { if (l.after) try { l.after(mount, ctxOf(l)); } catch (e) { console.error(l.id, "after", e); } });
    wireRows();
  }

  /* ---------- the picker and the rows ----------
     Each row is its own sideways scroller, so its scrollbar sits right under its cards. A scroll in one row moves the
     others to the same place. A row that was just moved here fires its own scroll event a frame later; it already sits
     where S.x says, so it's let be, and only the row someone is scrolling ever leads */
  const rows = () => [...mount.querySelectorAll(".lb-x")];
  let raf = 0;
  /* the look buttons say what they do: on a wide screen each one switches its look on or off, on a phone each is a tab.
     The arrows show only while the rows are wider than the window */
  function markPick() {
    raf = 0;
    const looks = window.FLOOKS || [];
    const btns = [...mount.querySelectorAll(".lb-tabs button")];
    const W = wide();
    btns.forEach((b) => b.setAttribute("aria-pressed", String(W ? !S.hide.includes(b.dataset.v) : b.dataset.v === S.look)));
    const nav = mount.querySelector(".lb-tabs");
    if (nav) nav.setAttribute("aria-label", W ? "Looks to show" : "Looks");
    const r = mount.querySelector(".lb-cells.lb-x");
    const over = !!r && W && r.scrollWidth > r.clientWidth + 1;
    const ar = mount.querySelector(".lb-arrows");
    if (ar) {
      ar.hidden = !over;
      const [pv, nx] = ar.querySelectorAll("button");
      if (pv) pv.disabled = !over || r.scrollLeft <= 1;
      if (nx) nx.disabled = !over || r.scrollLeft >= r.scrollWidth - r.clientWidth - 1;
    }
    /* an arrow that just became disabled hands focus to the other one, so the keyboard never drops to the page */
    if (ar && document.activeElement && document.activeElement.disabled && ar.contains(document.activeElement)) { const o = [...ar.querySelectorAll("button")].find((x) => !x.disabled); if (o) o.focus({ preventScroll: true }); }
    const on = looks.length - S.hide.length;
    const NUM = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
    const n = (k) => NUM[k] || String(k);
    const note = mount.querySelector(".lb-pick-note");
    if (note) note.textContent = !W ? "" : `${S.hide.length ? `${n(on)} of ${n(looks.length).toLowerCase()} looks on` : `${n(on)} ${on === 1 ? "look" : "looks"} on`}. ${over ? "Each row scrolls sideways and the rows move together, so a column stays one look all the way down. Turn looks off to see two or three side by side." : on > 1 ? "Side by side, one column a look. Turn a look on or off to compare." : "Turn on another look to compare."}`;
  }
  const pickSoon = () => { if (!raf) raf = requestAnimationFrame(markPick); };
  function wireRows() {
    const xs = rows();
    xs.forEach((r) => { r.scrollLeft = S.x; });
    xs.forEach((r) => r.addEventListener("scroll", () => {
      if (Math.abs(r.scrollLeft - S.x) < 1) return;
      S.x = r.scrollLeft;
      xs.forEach((o) => { if (o !== r) o.scrollLeft = S.x; });
      pickSoon();
    }, { passive: true }));
    markPick();
  }
  /* the arrows move every row by one column */
  function step(dir) {
    const r = mount.querySelector(".lb-cells.lb-x");
    if (!r) return;
    const c = r.querySelector(".lb-cell:not([data-hide])");
    const gap = parseFloat(getComputedStyle(r).columnGap) || 0;
    const w = c ? c.getBoundingClientRect().width + gap : 390;
    const left = Math.max(0, Math.min(r.scrollWidth - r.clientWidth, Math.round((r.scrollLeft + dir * w) / w) * w));
    r.scrollTo({ left, behavior: reduced() ? "auto" : "smooth" });
  }
  if (window.matchMedia) {
    const mq = window.matchMedia(WIDE);
    const onMq = () => markPick();
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  window.addEventListener("resize", pickSoon, { passive: true });

  /* every press redraws the page, controls included, so focus goes back to the same control once it's drawn again */
  const refocus = (sel) => { const nb = mount.querySelector(`.lb-ctls ${sel}, .lb-tabs ${sel}, .lb-arrows ${sel}`); if (nb) nb.focus({ preventScroll: true }); };
  mount.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !mount.contains(b) || !b.closest(".lb-ctls, .lb-pick")) return;
    if (b.dataset.act === "replay") { render(); refocus('[data-act="replay"]'); return; }
    if (b.dataset.act === "prev" || b.dataset.act === "next") { step(b.dataset.act === "next" ? 1 : -1); return; }
    const sel = `[data-k="${CSS.escape(b.dataset.k || "")}"][data-v="${CSS.escape(b.dataset.v || "")}"]`;
    /* on a wide screen a look button switches that look on or off (one always stays on); on a phone it picks the tab */
    if (b.dataset.k === "look" && wide()) {
      const id = b.dataset.v, looks = window.FLOOKS || [];
      if (S.hide.includes(id)) S.hide = S.hide.filter((h) => h !== id);
      else if (looks.length - S.hide.length > 1) S.hide = S.hide.concat(id);
      else return;
      S.look = id; save(); render(); refocus(sel);
      return;
    }
    if (b.dataset.k) {
      S[b.dataset.k] = b.dataset.v; if (b.dataset.k === "theme") root.setAttribute("data-theme", S.theme); save(); render();
      refocus(sel);
    }
  });
  if (S.theme !== viewerTheme()) root.setAttribute("data-theme", S.theme);
  window.FLLIB = { render, state: S, COMPONENTS };
  render();
})();
