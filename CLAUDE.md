# Florin app refresh: working notes for Claude

This repo holds the **Florin app refresh**: a clickable phone prototype of today's Florin app, the one that ships
without hardware. People log manually (BMs, symptoms, meals, a weekly check-in). No sensor, no gas data, no FloraScore.

Read these first, in order:

1. `claude/Florin app refresh brief.md`: the goals, Will's notes, what's decided, what was built, open questions.
2. `claude/Florin app refresh research.md`: Oura, Function Health, GI logging apps, weekly check-ins, licensing.
3. `claude/Florin DESIGN.md`: the design system (v1.1). Spacing and radius scales, app colours, components, data vis, copy.

The brand studio (`florin-brand-studio.zip`, published at https://claude.ai/artifact/AnK85Y5MHPX9MiDiUiY3Sj) is the
source of truth for tokens and rules. Its `CLAUDE.md` carries the research-backed rules summarized below.

## What's here

```
prototype/index.html     the artifact page (no doctype: the publisher wraps it)
prototype/_local.html    the same page with a document shell, for file:// and Playwright. Keep the two in sync
prototype/css/app.css    the studio's app tokens and components (--ap-*), copied from the studio
prototype/css/refresh.css  the refresh: new app components (.ap-) and the page around the phone (.rx-)
prototype/js/lib.js, data-app.js, claims-rules.js   copied from the studio (helpers, seeded days, the 22 claims rules)
prototype/js/refresh-data.js  the manual-logs model built on the seeded days (window.FLORIN_LOGS), and window.FLORIN_EXT
prototype/js/refresh-ui.js    every app screen as a render function (window.FLORIN_RUI)
prototype/js/refresh-insights.js  the Insights tab, its detail pages and the Ask tab hand-off (extends FLORIN_RUI)
prototype/js/app-charts.js    the studio's small SVG chart kit (window.FLC), used by Insights
prototype/js/refresh-{looks,variants,profile,ask,easy}.js and css/refresh-*.css   feature modules, one per decision
                              (data style; Day first and Calendar; profile and onboarding; Ask Florin; the Easy version).
                              Each registers into FLORIN_EXT and never edits a core file
prototype/js/refresh-app.js   the page: the one phone (Phone, phone.set), the decisions, notes per screen and decision
library/                       Florin data looks: the same numbers drawn in five looks, the start of a component library
library/js/looks-data.js       the one data object (FLD.build) every look draws from, built on refresh-data.js
library/js/look-*.js, css/look-*.css   one look each, registered on window.FLOOKS, every rule scoped under .lk-<id>
reference/shipping-app/       the app that ships today: Log a visit, History, the onboarding survey and profile
reference/oura.md              what Oura's screens do, and how each idea translates under Florin's rules
work/                          QA and screenshot scripts (work/shots-library.js for the looks)
```

The page (Will, Oct 27): one phone, live, in the middle. The left bar holds **Decisions** (Consistency, BM logging,
Home, History, Weekly check-in, Meal sheet, Data style, Version, Onboarding), then **Demo** (Person; Logs: 12 weeks,
New, day 5 or Just joined; Meal logs; Plan; App theme; Reset), then **Screens**. The right bar is the notes for the
screen, or for the decision just changed (until the phone moves to another screen); each decision's info button shows
its note. Decisions are stored (`florin-refresh:<key>`); the demo controls aren't. Under 760px the app is full screen
and a bottom bar opens Toggles (Decisions, Demo, Screens) and Notes as sheets: the same panels, moved, never doubled.
Weekly check-in Off takes the check-in out of the whole app (`RU.ckOn(V)`), and its screens are disabled in the list.
BM logging Full form only shows one Log a BM row on plus and no one-tap save. Home Day first, History Calendar, Data
style, Version Easy and Onboarding Full survey are stored and stamped on the phone, and drawn by their modules.

The prototype loads the library's looks (looks-data.js, look-*.js and their css, never library.js, which mounts the
library page) before the modules: `_local.html` from `../library/`, `index.html` from `js/` and `css/`, so publish them
at those paths with the prototype.

Every number a screen states is computed from the model, never typed. If copy states a figure, compute it.

Consistency has three options, A (types 1 to 7, licence needed), B (today's five words) and C (seven of our own
words, proposed). A and C store a step from 1 to 7; a B log stores its word (`{ form: null, word }`), which covers
one or two steps. Read a BM's consistency only through `L.formName`, `L.formLine`, `L.glyphOf` and `L.inForms`, which
take the entry; `L.inForms` is three-valued in A and C (null when a B word's steps sit on both sides of the usual,
which reads as "could be either", never a shift). Foods are counted only through `L.matchFoods`, for seeded meals and
typed ones alike.

Insights reads days through `L.facts` (a gap stays a gap, No BM is a zero, a day is usual, shifted, unsure or none)
and patterns through `L.patterns` (90 days, a food needs 5 logs, a one-sided binomial test at 1 in 100). Each demo
person has one dish their seeded logs follow (`PATTERN_DISH`), seeded on its own meal pass so Insights has to find it.
A symptom logged without a strength keeps `s: 0` and reads as "strength not said", never mild.

FloraScore (`L.score`, `L.scoreUsual`, `L.scoreMoved`) is built from four logged parts (timing, how often, form,
comfort), weighted 30/25/25/20 like the studio's, blended over the last 3 logged days. A day with no BM logged is left
out and has no score of its own (today excepted, as far as it has gone), fewer than 2 logged days in 3 means no score,
and there's no score before day 14. It doesn't depend on meals.

Meals are occasional (Will, Oct 14). `L.build(persona, data, { meals })` takes "all", "rough" (only days with a
symptom) or "none". Under 60% of logged days with a meal (`L.MEAL_COVER`), `L.patterns` holds every meal pattern back
(`sparse`), because rough-day-only logs name ordinary foods by selection. The quick log (`RU.mealQuick`) is one box
for the day with a voice button; the prototype plays `L.mealSay` in place of the microphone.

The page has a Plan switch. Free keeps logging, Today, FloraScore, the check-in, History and 7 days of Insights;
Florin membership adds why the score moved, 30 and 90 days, details, patterns, the food check, Ask Florin and the
clinician report (`RU.paywall`). Teasers blur the person's own counts; never show made-up content.

## Extension hooks

A feature module is a file pair, `prototype/js/refresh-<name>.js` and `css/refresh-<name>.css`, loaded after
refresh-insights.js and the library looks and before refresh-app.js, in this order: looks, variants, profile, ask, easy.
It never edits a core file: it registers into `window.FLORIN_EXT` (made by refresh-data.js) and wraps `RU` functions.

```
FLORIN_EXT = {
  overlays:  { [type]: { kind: "sheet" | "full" | "screen", render(M, V, st, api) -> html, key?(st) -> screenId } },
  acts:      { [name]: (button, api, event) => void },     // a data-act; wins over a core act of the same name
  opens:     { [screenId]: (api) => void },                // open(id) for ids the core doesn't know (after going to Today)
  screens:   [[group, [[id, label], ...], { before?: group }]],  // joins a group of that name, or a new group
  notes:     { [screenId]: (M, P) => note },               // wins over the core note when it returns one
  decisions: { [key]: (M, P) => note },                    // replaces a decision's core note
  keys:      { [overlayType]: (overlay) => screenId, ["tab:<tab>"]: ({ st: S }) => screenId },
  onSet:     [(key, value, api) => void],                  // after phone.set has redrawn
  api                                                      // the live phone's api, set by refresh-app.js
}
note = { t, lede, ba?: [[was, now]], opts?: [[value, text]], rec?, open?: [], res?: [] }   // P: every decision, the
                                                           // demo controls (persona, data, meals, plan, theme) and key
```

- **api**: `S` (the phone's state), `V()`, `M()`, `push(type, st, { instant })`, `pop()`, `swap(type, st)`,
  `rerender(overlay?)`, `top()`, `closeAll()`, `toast(msg, undo?, more?)`, `say(text)`, `renderTab(soft)`, `go(tab)`,
  `nav()`, `focusSel(selector)`, `open(screenId)`, `rebuild()`, `set(key, value)`, `countUp(el)`, `layer`, `root`, and
  `snapshot()` (returns an undo), `commit(st, kind, fields)`, `key()`, `act(name, button)` (a module's act, else the
  core's), `core(name, button)` (always the core's, for an act that wraps one).
- **set(key, value)** is the one way to change the phone: the decisions (`form`, `bmUI`, `home`, `history`, `checkin`,
  `mealUI`, `look`, `easy`, `onboard`), `plan`, `persona`, `data` and `meals` (these rebuild the model and go to Today),
  `theme`, `full`. Each decision is stamped on the phone's `.ap` root (`data-bm-ui="full"`, `data-look="rings"`,
  `data-easy="true"`) for a module's CSS; an overlay's element carries `.ap-o--t-<type>`.
- **V()** = `{ form, uid, mealUI, plan, bmUI, home, history, checkin, look, easy, onboard, persona, data, meals }`.
- **Wrap, don't edit.** Render functions are looked up when called, so `const base = RU.plus; RU.plus = (M, V, st) =>
  V.easy ? mine(M, V, st) : base(M, V, st)` works for `RU.today`, `RU.history`, `RU.insights`, `RU.idetail`, `RU.ask`,
  `RU.plus`, `RU.bm` and the parts below.
- **Today** is `RU.todayLayout(M, V)` (an array of part names, Score first: top, hero, checkin, entries, week, next,
  fine) over `RU.todayParts[name](M, V)`. Replace `hero` or `week` (data style), or wrap `todayLayout` or `RU.today`
  (Day first, Easy). The `top` part holds the 44px avatar, `data-act="profile"`; with no module's `profile` act it
  toasts that the profile comes in this pass.
- **History** is `RU.history(M, V, st)` over `RU.historyDay(M, V, d, entries)`, `RU.entryRow(e, M, V)` and
  `RU.historyNext(M, V)`, so a calendar shows a day the same way.
- Helpers: `RU.ckOn(V)` (the check-in is on), `RU.bmCount(M)`, `RU.QUICK_AFTER` (5 BMs before a tile saves at once).
- A hook that throws is logged and skipped, never allowed to take the page down.

## Rules you must not break

- **No em dashes, no exclamation points, no humor** in any copy.
- **No medical claims.** Florin never predicts, diagnoses, treats or cures. Never "healthy", "normal", "improving",
  "worsening" about a person's data: everything is read against **their own usual**. Never mention IBD.
- **Names:** Florin Health, then Florin. "The Florin app". Ask Florin (never a doctor's title). FloraScore is one word.
- **Licensing:** the Bristol Stool Form Scale and IBS-SSS are Rome Foundation instruments. Don't name, quote, adapt or
  score them without a licence. Our form words and check-in questions are our own.
- **App colours:** Plum is "your usual", Gold is a shift, Teal is context, Ray is "your usual" on dark. No Ray Deep in
  the app, no red, no green. Derive colours from the six brand tokens; never hardcode a hex.
- **Spacing:** every padding, margin, gap, inset and radius on the DESIGN.md scale. Fixed control heights.
- **Alarm features** (blood, black or tar-like stools, fever, vomiting that won't stop, weight loss, waking at night
  to go) route to primary care with a Teal banner. Never interpreted, never red.

## Check before you publish

```
NODE_PATH=$(npm root -g) node work/qa.js            # console errors, sideways scroll, claims check, 44x44 tap targets
NODE_PATH=$(npm root -g) node work/behave.js        # interactions and data: drafts, focus, one-tap log, check-in rule
node work/audit-spacing.js                          # must say the prototype is on the scale
NODE_PATH=$(npm root -g) node work/shots.js <dir>   # phone screenshots of every screen in every state
```

## Publishing

The prototype is the artifact https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB. Publish `prototype/index.html` as the
page and every css/js file as a published file at the same relative path. The data looks are a separate artifact,
https://claude.ai/artifact/FdsxDLSQqETo3HRCVmUZzL (library/index.html, with the shared prototype css/js published under
css/ and js/). Read the artifact before republishing: other
sessions publish to it too (the second pass did, on Oct 14), so merge onto what's live rather than overwrite it.
