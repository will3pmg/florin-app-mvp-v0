/* Florin focus group test: the week card on Home, as a feature module (CLAUDE.md, Extension hooks: wrap, don't edit).
   The study tests the week card Will picks from the options page (options/home): "card" (the week card, tightened),
   "strip" (the week strip), "note" (the week in a note) or "chart" (Mornings); "built" is the prototype's own card.
   Each is drawn by the options page's own drawing functions (window.FLORIN_HOME.draw, from options/home/js, copied at
   build), from the phone's live model, so a BM logged on the phone redraws it.
   - RU.todayParts.week is replaced while the data style is Florin charts and the Easy version is off (a data look or
     Easy draws its own week).
   - Where it sits is config.js's weekPlace (top, under FloraScore, or after today's logs), or the design's own place:
     the strip at the top, the words under FloraScore, the others after today's logs. Day first keeps its own order,
     with a week at the top moved under its greeting too.
   - The options page draws a picture of the app: its links and days aren't wired. Here See these days on Insights and
     the count go to Insights' 7 days, and a day on the strip opens that day as History draws it, in a sheet.
   window.FOCUS_WEEK is the design on the phone; FOCUS_APP.setWeek(id) changes it. */
(function () {
  const L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, EXT = window.FLORIN_EXT, FL = window.FL, AD = window.FLORIN_APP;
  if (!L || !RU || !EXT || !FL) return;
  const IDS = ["built", "card", "strip", "note", "chart"];
  const H = () => window.FLORIN_HOME;
  const ic = RU.icon, esc = FL.esc;
  const warn = (what, e) => { try { console.warn(`Florin focus-week: ${what}; the prototype's own week is drawn instead.`, e); } catch (x) { /* none */ } };
  const cur = () => { const w = window.FOCUS_WEEK; return IDS.includes(w) ? w : "built"; };
  const ours = (V) => !!V && !V.easy && (V.look || "built") === "built" && cur() !== "built" && !!(H() && H().draw && H().draw[cur()]);

  /* the options page's links and days, made live */
  const live = (html) => html
    .replace(/class="ap-link ap-wk-go"/g, 'class="ap-link ap-wk-go" data-act="tab" data-tab="insights" data-range="7"')
    .replace(/<button type="button" class="ho-sa"/g, '<button type="button" class="ho-sa" data-act="tab" data-tab="insights" data-range="7"')
    .replace(/class="ho-d"(?: data-live)? data-day="(\d+)"/g, 'class="ho-d" data-act="fx-wkday" data-day="$1"');
  /* the options page draws from the week (its weekOf), or, in its first version, from the model */
  const drawWeek = (M) => { const h = H(), W = typeof h.weekOf === "function" ? h.weekOf(M) : M; return h.draw[cur()](W, true) || ""; };
  /* where the week sits: config.js's weekPlace (top, under, after), or the design's own place: the strip at the top,
     the words under FloraScore, the rest after today's logs */
  const PLACES = ["top", "under", "after"];
  const place = () => { const p = window.FOCUS_WEEK_PLACE; return PLACES.includes(p) ? p : cur() === "strip" ? "top" : cur() === "note" ? "under" : "after"; };
  window.FOCUS_WEEK_PLACE_OF = place;

  const baseWeek = RU.todayParts.week;
  RU.todayParts.week = (M, V) => {
    if (!ours(V)) return baseWeek(M, V);
    try { return live(drawWeek(M)); } catch (e) { warn(`the ${cur()} week failed`, e); return baseWeek(M, V); }
  };
  /* where the week sits on Score first */
  const baseLayout = RU.todayLayout;
  RU.todayLayout = (M, V) => {
    const ks = baseLayout(M, V);
    if (!ours(V) || !Array.isArray(ks)) return ks;
    const p = place();
    if (p === "after") return ks;
    const out = ks.filter((k) => k !== "week");
    const at = p === "top" ? out.indexOf("top") + 1 : (out.indexOf("checkin") >= 0 ? out.indexOf("checkin") : out.indexOf("hero")) + 1;
    out.splice(Math.max(0, at), 0, "week");
    return out;
  };
  /* Day first draws its own order: at the top, the week goes under its greeting there too */
  const baseToday = RU.today;
  RU.today = (M, V) => {
    const html = baseToday(M, V);
    if (!ours(V) || V.home !== "day" || place() !== "top") return html;
    try {
      const m = /<section class="(?:ho-strip|ap-card[^"]*)"[^>]*data-week[\s\S]*?<\/section>/.exec(html);
      if (!m) return html;
      const rest = html.replace(m[0], "");
      const i = rest.indexOf("</header>");
      return i < 0 ? html : rest.slice(0, i + 9) + m[0] + rest.slice(i + 9);
    } catch (e) { warn("moving the week", e); return html; }
  };

  /* a day on the strip: the day as History draws it, with the days before and after */
  const days = () => { const M = EXT.api && EXT.api.M(); if (!M) return []; const out = []; for (let d = L.TODAY - 6; d < L.TODAY; d++) if (d >= M.start) out.push(d); return out; };
  EXT.overlays["fx-day"] = {
    kind: "sheet",
    key: () => "a sheet",
    render: (M, V, st) => {
      const ds = days(), i = ds.indexOf(st.d), x = L.dateOf(st.d), Ut = AD.util;
      const name = `${Ut.DOWL[x.getDay()]}, ${Ut.MON[x.getMonth()]} ${x.getDate()}`;
      return `<div class="ap-psh fx-wk-day" role="dialog" aria-modal="true" aria-label="${esc(name)}">
          <div class="ap-sheet-grab" aria-hidden="true"></div>
          <div class="ap-psh-h fx-wk-day-h">
            <button type="button" class="ho-sb" data-act="fx-wkday-step" data-v="-1"${i <= 0 ? ' aria-disabled="true"' : ""}>${ic("back")}Previous day</button>
            <button type="button" class="ho-sb" data-act="fx-wkday-step" data-v="1"${i >= ds.length - 1 ? ' aria-disabled="true"' : ""}>Next day${ic("chev")}</button>
            <button type="button" class="ap-lg-x" data-act="close" aria-label="Close">${ic("close")}</button>
          </div>
          <div class="fx-wk-day-b" data-scroll>${RU.historyDay(M, V, st.d)}</div>
        </div>`;
    }
  };
  EXT.acts["fx-wkday"] = (b, api) => { const d = +b.dataset.day; if (!isFinite(d)) return; api.push("fx-day", { d }); };
  EXT.acts["fx-wkday-step"] = (b, api) => {
    const t = api.top();
    if (!t || t.type !== "fx-day") return;
    const ds = days(), i = ds.indexOf(t.st.d) + (+b.dataset.v || 0);
    if (i < 0 || i >= ds.length) return;
    t.st.d = ds[i];
    api.rerender(t);
  };

  window.FOCUS_WEEK = window.FOCUS_WEEK || "built";
  window.FOCUS_WEEK_IDS = IDS;
  window.FOCUS_WEEK_PLACES = PLACES;
})();
