# Florin app refresh: working notes for Claude

This repo holds the **Florin app refresh**: a clickable phone prototype of today's Florin app, the one that ships
without hardware. People log manually (BMs, symptoms, meals, a weekly check-in). No sensor and no gas data; FloraScore
is built from the logs.

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
prototype/js/refresh-looks.js     the Data style decision: Insights as a library look's cards, Today's FloraScore and week
                              as its score and week cards, and one detail page of its own, Your days (i-days)
prototype/js/refresh-variants.js  Home Day first (the date with a small score ring, today's logs with the one that stood
                              out marked, a row to log from) and History Calendar (a month of marked days; a tapped day
                              is drawn as the list draws it)
prototype/js/refresh-profile.js   Profile, from the Today avatar, and onboarding, Short or the Full survey (the shipping
                              survey reworded), with the primary care note on a sign
prototype/js/refresh-ask.js       Ask Florin as a chat: alarm words first (L.alarmsIn), a fixed redirect for diagnose,
                              dose or predict, then Claude through the sample capability, checked, with answers computed
                              from the logs as the floor; Make a report on the flag note opens it on the clinician path
prototype/js/refresh-easy.js      the Easy version: larger text and simpler screens. Its own Today, plus, a BM in four
                              steps, symptoms, Your weeks in place of Insights; History and Ask drawn bigger
prototype/css/refresh-{looks,variants,profile,ask,easy}.css   each module's styles, scoped to what it draws
                              Each module registers into FLORIN_EXT and wraps RU; it never edits a core file
prototype/js/refresh-app.js   the page: the one phone (Phone, phone.set), the decisions, notes per screen and decision
library/                       Florin data looks: the same numbers drawn in five looks, the start of a component library
library/js/looks-data.js       the one data object (FLD.build) every look draws from, built on refresh-data.js. A look's
                              day counts come from D.tally[7] and [30] (within, shifted, unsure, nocount, flag, known,
                              and left, the sentence naming the days counted neither way), so every look counts alike
library/js/look-*.js, css/look-*.css   one look each, registered on window.FLOOKS, every rule scoped under .lk-<id>
reference/shipping-app/       the app that ships today: Log a visit, History, the onboarding survey and profile
reference/oura.md              what Oura's screens do, and how each idea translates under Florin's rules
work/                          QA and screenshot scripts (work/shots-library.js for the looks, work/sweep.js for every
                              pair of decisions)
```

Load order (both pages): lib.js, claims-rules.js, data-app.js, app-charts.js, refresh-data.js, refresh-ui.js,
refresh-insights.js, then the library's looks-data.js and look-rings, journal, bento, oura and easy, then the modules
in this order: looks, variants, profile, ask, easy, and refresh-app.js last. The css follows the same order (app.css,
refresh.css, look-*.css, refresh-<module>.css). A later module wraps what an earlier one drew: Easy wraps Day first's
Today and the look's Insights, and draws its own in their place.

The page (Will, Oct 27): one phone, live, in the middle, under a slim header. The left bar holds **Decisions**
(Consistency, BM logging, Home, History, Weekly check-in, Meal sheet, Data style, Version, Onboarding), one line each,
then **Demo** (Person; Logs: 12 weeks, New, day 5 or Just joined; Meal logs; Plan; Theme; Reset), which folds to a
one-line summary (folded by default, remembered per viewer as `florin-refresh:demoOpen`), then **Screens**. Each side
bar scrolls on its own and is sized from where it sits, so its end is always in reach. The right bar is the notes for
the screen, or for the decision just changed (until the phone moves to another screen); each decision's info button
shows its note. Between 760 and 1019px the notes sit under the phone: an info button scrolls to them, and a changed
decision shows a "Read the note" button at the foot of the toggles column, never over the phone. Every option of every decision is drawn, by the core or a module, so each
reads **On the phone** (an option no module claimed would read **Picked**). A screen in the list that belongs to a
decision sets that decision, and it stays: Home: Day first, History: Calendar, the onboarding screens and the Easy
version's, as the Membership screens set Plan to Free. So the phone and the left bar always agree, and a check that
sweeps the list puts the decisions back after. Decisions are stored (`florin-refresh:<key>`); the demo controls
aren't. The phone follows the page's theme (the system's, or the page's own) until something sets one that differs from
it; a set equal to the page's own clears that, so the phone goes back to following (the Oura style turning it dark and
giving it back leaves nothing stored). The arrow keys step through Screens from the list or with nothing focused, from the row the page opened while
the phone is still on it (so a row that draws another row's screen, such as Log a BM, details filled in, never loops),
and focus comes back to the lit row if a screen took it into the phone. A row picked from the list always shows that
screen's note. The first Tab stop is Skip to the phone. The header links the decisions deck and the data looks
library. A decision whose option shows on another screen (Home, History, BM logging, Meal sheet) has Show it on the
phone in its note, which opens that screen and keeps the note up. With the Easy version on, Home and Data style read
"Picked; Easy draws its own", with a line under each row saying so (`SHADOWED` in refresh-app.js). Under 760px the app is full screen
and a bottom bar opens Toggles (Decisions, Demo, Screens) and Notes as sheets: the same panels, moved, never doubled.
Weekly check-in Off takes the check-in out of the whole app (`RU.ckOn(V)`), and its screens are disabled in the list.
BM logging Full form only shows one Log a BM row on plus and no one-tap save. Home Day first, History Calendar, Data
style, Version Easy and Onboarding are stored and stamped on the phone, and drawn by their modules. Where they meet:
Easy has its own Today (Home's Day first waits under it) and always draws Easy read (whatever Data style says), and
keeps History as a calendar when that's picked; Profile's Larger text and simpler screens sets Version, its Logging
rows set BM logging and Meal sheet, and its theme row sets the theme, all through phone.set, so the left bar follows.

The prototype loads the library's looks (looks-data.js, look-*.js and their css, never library.js, which mounts the
library page) before the modules: `_local.html` from `../library/`, `index.html` from `js/` and `css/`, so publish them
at those paths with the prototype (see Publishing).

Every number a screen states is computed from the model, never typed. If copy states a figure, compute it.

Consistency has three options, A (types 1 to 7, licence needed), B (today's five words) and C (seven of our own
words, proposed). A and C store a step from 1 to 7; a B log stores its word (`{ form: null, word }`), which covers
one or two steps. Read a BM's consistency only through `L.formName`, `L.formLine`, `L.glyphOf` and `L.inForms`, which
take the entry; `L.inForms` is three-valued in A and C (null when a B word's steps sit on both sides of the usual,
which reads as "could be either", never a shift). Foods are counted only through `L.matchFoods`, for seeded meals and
typed ones alike.

Insights reads days through `L.facts` (a gap stays a gap, No BM is a zero, a day is usual, shifted, unsure, none, or
"flag" for a flagged today)
and patterns through `L.patterns` (90 days, a food needs 5 logs, a one-sided binomial test at 1 in 100). Meal
coverage is counted once, over the days logged in the 90-day window (`mealDays` of `loggedDays` in `window`, also
under the old names `withMeal` and `logged`), never over the pairs of days the tests use, so the gate and every
sentence about it agree with the data looks: "Meals are logged on 36 of the 85 days you logged in the last 90 days". Each demo
person has one dish their seeded logs follow (`PATTERN_DISH`), seeded on its own meal pass so Insights has to find it.
A symptom logged without a strength keeps `s: 0` and reads as "strength not said", never mild.

FloraScore (`L.score`, `L.scoreUsual`, `L.scoreMoved`) is built from four logged parts (timing, how often, form,
comfort), weighted 30/25/25/20 like the studio's, blended over the last 3 logged days. A day with no BM logged is left
out and has no score of its own (today excepted, as far as it has gone), fewer than 2 logged days in 3 means no score,
and there's no score before day 14. It doesn't depend on meals. The blend is `L.BLEND` (3) and `L.BLEND_MIN` (2), and
`L.NO_SCORE` is the rule in words, the one wording every screen uses when there's no score today: "it needs a BM, or No
BM, logged on 2 of your last 3 days" (Score first's hero, Day first, Easy, Ask and every data look, `D.score.why`).
`L.scoreMoved` gives this week's and last week's
averages raw (`wk`, `lw`, for the waterfall's geometry) and as shown (`wkR`, `lwR`); `delta` is `wkR - lwR`, so "+8"
always sits beside 76 and 84.

Meals are occasional (Will, Oct 14). `L.build(persona, data, { meals })` takes "all", "rough" (only days with a
symptom) or "none". Under 60% of logged days with a meal (`L.MEAL_COVER`), `L.patterns` holds every meal pattern back
(`sparse`), because rough-day-only logs name ordinary foods by selection. The quick log (`RU.mealQuick`) is one box
for the day with a voice button; the prototype plays `L.mealSay` in place of the microphone (that day's meals not
logged yet, so saying the day never counts a food twice).

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
  opens:     { [screenId]: (api) => void },                // open(id) for ids the core doesn't know (after going to Today);
                                                           // opens.ask: after the core's Ask tab, a module's fresh chat
  screens:   [[group, [[id, label], ...], { before?: group }]],  // joins a group of that name, or a new group
  notes:     { [screenId]: (M, P) => note },               // wins over the core note when it returns one
  decisions: { [key]: (M, P) => note },                    // replaces a decision's core note
  built:     { [key]: [value, ...] },                      // the options of a decision a module draws (home: ["day"])
  keys:      { [overlayType]: (overlay) => screenId, ["tab:<tab>"]: ({ st: S }) => screenId },
  onSet:     [(key, value, api) => void],                  // after phone.set has redrawn and the page has followed
  api                                                      // the live phone's api, there from the phone's first draw
}
note = { t, lede, ba?: [[was, now]], opts?: [[value, text]], rec?, open?: [], res?: [] }   // P: every decision, the
                                                           // demo controls (persona, data, meals, plan, theme) and key
```

- **api**: `S` (the phone's state), `V()`, `M()`, `push(type, st, { instant })` (returns the overlay, or null when its
  render drew nothing or threw: it isn't opened), `pop()`, `swap(type, st)`, `rerender(overlay?)`, `top()`,
  `closeAll()`, `toast(msg, undo?, more?)`, `say(text)`, `renderTab(soft)`, `go(tab)`, `nav()`, `focusSel(selector)`,
  `open(screenId)`, `rebuild()` (a fresh model, every draft and overlay gone, drawing nothing: follow it with
  `open(id)`), `reset()` (rebuild, then Today), `set(key, value)`, `countUp(el)`, `layer`, `root`, and `snapshot()`
  (returns an undo), `commit(st, kind, fields)`, `key()`, `act(name, button)` (a module's act, else the core's),
  `core(name, button)` (always the core's, for an act that wraps one).
- **set(key, value)** is the one way to change the phone: the decisions (`form`, `bmUI`, `home`, `history`, `checkin`,
  `mealUI`, `look`, `easy`, `onboard`), `plan`, `persona`, `data` and `meals` (these rebuild the model and go to Today),
  `theme`, `full`. The page follows every set, whoever makes it: the toggles, the stored decision, the Screens list and
  the notes (so a Profile screen can turn the check-in off). Each decision is stamped on the phone's `.ap` root
  (`data-bm-ui="full"`, `data-look="rings"`, `data-easy="true"`) for a module's CSS; an overlay's element carries
  `.ap-o--t-<type>`.
- **built**: until a module claims an option in `EXT.built[key]`, a decision's note says Picked for it, not On the
  phone. The core draws every option of form, bmUI, checkin and mealUI, and only Score first, List, As built and
  Standard of the others, and no onboarding. The modules claim the rest: looks `look` rings, journal, bento, oura and
  easy; variants `home` day and `history` calendar; profile `onboard` short and full; easy `easy` true. So every option
  reads On the phone, and behave.js checks it stays that way.
- **V()** = `{ form, uid, mealUI, plan, bmUI, home, history, checkin, look, easy, onboard, persona, data, meals }`.
- **Wrap, don't edit.** Render functions are looked up when called, so `const base = RU.plus; RU.plus = (M, V, st) =>
  V.easy ? mine(M, V, st) : base(M, V, st)` works for `RU.today`, `RU.history`, `RU.insights`, `RU.idetail`, `RU.ask`,
  `RU.plus`, `RU.bm` and the parts below.
- **Today** is `RU.todayLayout(M, V)` (an array of part names, Score first: top, hero, checkin, entries, week, next,
  fine) over `RU.todayParts[name](M, V)`. Replace `hero` or `week` (data style), or wrap `todayLayout` or `RU.today`
  (Day first, Easy). The `top` part holds the 44px avatar, `data-act="profile"`; with no module's `profile` act it
  toasts that the profile comes in this pass; the profile module's act opens Profile.
- **History** is `RU.history(M, V, st)` over `RU.historyDay(M, V, d, entries)`, `RU.entryRow(e, M, V)` and
  `RU.historyNext(M, V)`, so a calendar shows a day the same way.
- **What stood out today** is `RU.standouts(M, mode)`, ranked one way for Score first and Day first: a BM flag or an
  alarm feature (`RU.alarmOf(e)`, a BM's note read with the BM net) first, then a shift from the person's own usual (a
  form outside the usual forms, a first BM outside the window, more BMs than the usual count, No BM), then symptoms by
  strength (one without a strength reads "strength not said", never mild); ties to the earlier entry; before day 14
  only flags and symptoms. `RU.leadText(M, mode, item)` is its one sentence; `RU.highlightOf(M, mode)` gives
  `{ text, alarm }` (the timing sentence when nothing stood out) and `RU.highlight(M, mode)` the text alone (without a
  mode it reads with the phone's). Score first draws an alarm as the Teal note on the Forest card, and the score's line
  then reads "Not read against your usual today", as Day first's chip does. With membership the hero's sentence goes on
  to say what the log that stood out did to FloraScore, `RU.scoreEffect(M, mode, N)` ("Without it, FloraScore would be
  <n>." or "It didn't change FloraScore."), worked out by `RU.scoreWithout(M, e, mode)`, today scored without that entry;
  Day first uses the same. Never for an alarm, never on Free.
- **A flagged today** (`L.flagToday(M)`, also `RU.flagToday`: a flag or an alarm feature in today's logs, by
  `L.alarmOf(e)`, which `RU.alarmOf` is) is read against nothing anywhere. The model does it: `L.facts` gives a flagged
  today (once there's a usual) `state: "flag"`, `flag: true` and `inWin`, `inCount`, `formsIn` all null, with the
  reading it would have had in `raw`; FloraScore reads `raw`, so it keeps its number. Everything that counts days
  against the usual (Insights' cards and details, Ask Florin's facts and answers, the data looks, the calendar) leaves
  it out and says `RU.FLAG_DAY` ("Today has a log noted for a clinician, so it isn't read against your usual."); a
  chart draws it as a Teal ring (`.is-flag`, legend `sw--clin`). The hero, Day first's chip, Easy's FloraScore,
  Insights' score card and FloraScore's detail keep the number and say "Not read against your usual today"; Easy's
  sentence and the detail lead with the sign as the Teal note. `RU.week` gives the read counts over the other days
  (`rbms`, `rmornings`, `flagged`) and puts the line under the two BM rows. In the data looks `D.flagToday`,
  `D.score.flag`, a series point's `flag` and `D.flagLine` say the same; their 30-day counts (`D.timing.mornings30`,
  `D.often.avg30`, `D.form`) are over the other days. Past days stay read (whether every surface should mark a flagged
  day, as History's calendar does, is a call for Will).
- Helpers: `RU.ckOn(V)` (the check-in is on), `RU.bmCount(M)`, `RU.QUICK_AFTER` (5 BMs before a tile saves at once).
  The looks module adds `RU.lookOf(V)`, `RU.lookCards(M, V, keys, o)` and `RU.lookAfter(el)`, so another module draws
  cards in a look (Easy draws Your weeks with them).
- **Alarm words** have one net, `L.alarmsIn(text)` (L.ALARM, then L.ALARM_WIDE for how people write a sign: a stool
  and black, very or really dark, tar or red anywhere in the sentence, with the no read in the colour's own clause; a
  temperature had, run or worried about, "a temp" (never "a temp job"), or a reading of 38 to 41 C or 100 to 104 F
  (not the weather); weight lost by the kilo, pound or stone, the digit against its unit or not; up most nights to go;
  being sick; a hedge isn't a no). A BM's own note is `L.alarmsIn(note, { bm: true })`, which adds L.ALARM_BM: the BM
  is the stool, so a colour on its own is a sign there ("It looked like tar", "some red in it"), unless a food follows
  it ("after black coffee"). A log's note, both Home sentences and Ask Florin's questions all run it; never add a
  second one in a module.
- **Make a report** on the flag note is `data-act="flag-report"` with the question in `data-q`. The core toasts that
  the report comes later; the Ask module opens Ask on the clinician path with it (Member), or the paywall (Free).

What each module registers (the file's header comment has the detail):

```
refresh-looks     wraps RU.insights, RU.todayParts.hero and .week, RU.idetail (Your days), RU.askContext; acts idetail,
                  iback, ck-start and ck-tag (wrapped), rlk-week, rlk-voice; screens Data style; keys tab:insights and
                  tab:today; notes, decisions.look, built.look; onSet (theme, look, a rebuild). Oura sets the phone
                  dark while it's drawn (through api.set, so the page follows) unless the viewer has picked a theme,
                  and gives the theme back when it stops; with Easy on it leaves the theme alone
refresh-variants  wraps RU.today (Day first) and RU.history (Calendar); acts vr-quick, vr-cal-day, vr-cal-m; screens
                  home-day and hist-cal in Tabs; keys tab:today and tab:history; notes, decisions.home and .history
refresh-profile   overlays pf, onb, pf-rem, pf-info, pf-del; acts profile, onb-*, pf-*, ckd-save (wrapped); wraps RU.today
                  (the first name); screens Onboarding and profile; notes, decisions.onboard, built.onboard; onSet
refresh-ask       wraps RU.ask (Member; Free keeps the core's lock); acts askx-*, ask-about and ask-clear (wrapped),
                  flag-report; screens ask-chat and ask-alarm; opens ask-chat, ask-alarm and ask (Screens > Ask
                  Florin is a fresh chat); keys tab:ask; notes; onSet (form, check-in, meals, plan)
refresh-easy      wraps RU.today, insights, plus, bm, sym, history, ask and idetail under V.easy; acts ez-* and plus-day
                  (wrapped); screens ez-today and ez-bm (which set Version to Easy); keys tab:today, tab:insights, bm;
                  notes (its screens, plus and sym in Easy), decisions.easy, built.easy; onSet (easy, theme)
```
- A hook that throws is logged and skipped, never allowed to take the page down. A wrapped screen that throws is drawn
  the core's way instead (`RU.core` keeps every core screen from before the modules loaded), and so is a Today part
  or layout. A module screen with no note of its own shows "On the phone" and lights no row in Screens.

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
- **Charts never use dashed lines** (DESIGN.md). The studio's kit dashes the average and the waterfall's connectors;
  refresh.css draws them as solid hairlines on the phone, and a day not logged is its struck date, as on the week card.
  Light `--ap-ink3` is overridden in refresh.css (4.89:1 on the card; the studio's token is 4.07:1), and the page's
  light `--ink-3` is darker in both shells. Both changes are for the studio to take back.
- **Alarm features** (blood, black or tar-like stools, fever, vomiting that won't stop, weight loss, waking at night
  to go) route to primary care with a Teal banner. Never interpreted, never red.

## Check before you publish

```
NODE_PATH=$(npm root -g) node work/qa.js            # console errors, sideways scroll, claims check, 44x44 tap targets
NODE_PATH=$(npm root -g) node work/behave.js        # interactions and data: drafts, focus, one-tap log, check-in rule
node work/audit-spacing.js                          # must say the prototype is on the scale
NODE_PATH=$(npm root -g) node work/shots.js <dir>   # phone screenshots of every screen in the list, in every state
NODE_PATH=$(npm root -g) node work/sweep.js         # every pair of decisions, both themes, 12 weeks and Just joined:
                                                    # errors, junk text, dashes, claims, overflow, blank, check-in off
```

The sweep takes about 5 minutes on 4 workers; `--plan free` and `--width 390` run the same pairs on Free or full
screen on a phone, and `--limit 20` is a quick look.

## Publishing

The prototype is the artifact https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB. Publish `prototype/index.html` as the
page and every `prototype/css` and `prototype/js` file at the same relative path (`css/app.css`, `js/refresh-app.js`,
the five modules and their css included). The library's look files `index.html` loads go under `js/` and `css/` too,
from `library/`: `css/look-*.css`, and `js/looks-data.js` with `js/look-*.js`. The page declares the capabilities
`{ sample: {} }`, so Ask Florin can ask Claude on the viewer's own account (the first question in a view asks the viewer
to allow it); without it, or on a local file, every answer is computed from the logs. Keep the capability on every
republish (omit `capabilities` on a redeploy to keep what's there, or pass it again).

```
js/looks-data.js  <- library/js/looks-data.js        css/look-rings.css    <- library/css/look-rings.css
js/look-rings.js  <- library/js/look-rings.js        css/look-journal.css  <- library/css/look-journal.css
js/look-journal.js <- library/js/look-journal.js     css/look-bento.css    <- library/css/look-bento.css
js/look-bento.js  <- library/js/look-bento.js        css/look-oura.css     <- library/css/look-oura.css
js/look-oura.js   <- library/js/look-oura.js         css/look-easy.css     <- library/css/look-easy.css
js/look-easy.js   <- library/js/look-easy.js
```

Never `library/js/library.js` or `library/css/library.css` into the prototype. The data looks are a separate artifact,
https://claude.ai/artifact/FdsxDLSQqETo3HRCVmUZzL (library/index.html, with the shared prototype css/js published under
css/ and js/). Read the artifact before republishing: other
sessions publish to it too (the second pass did, on Oct 14), so merge onto what's live rather than overwrite it.
