# Florin app refresh: working notes for Claude

This repo holds the **Florin app refresh**: a clickable phone prototype of today's Florin app, the one that ships
without hardware. People log manually (BMs, symptoms, meals, a weekly check-in). No sensor and no gas data; FloraScore
is built from the logs.

Read these first, in order:

1. `claude/Florin app refresh brief.md`: the goals, Will's notes, what's decided, what was built, open questions.
2. `claude/Florin app refresh research.md`: Oura, Function Health, GI logging apps, weekly check-ins, licensing.
3. `claude/Florin DESIGN.md`: the design system (v1.1). Spacing and radius scales, app colours, components, data vis, copy.
4. `claude/Florin decisions.md`: the nine decisions, Ask Florin on Free and the demo controls, each in one shape. It is
   the one source for every decision note and demo-control note on the page.
5. `claude/Florin data viz.md`: the marks (one set for every screen), the right set of charts, the week card and the
   FloraScore hero. A module that draws a day or a chart follows it.

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
                              as its score and week cards, and one detail page of its own, Your days (i-days). It also
                              makes Today's week card the Rings look's week in every style (Will's pick, Nov 4),
                              Insights' FloraScore card the Rings look's hero (Will, Nov 5), and draws Will's picks
                              (Data style "picks", the WILL_PICKS table)
prototype/js/refresh-variants.js  Home Day first (the date with a small FloraScore chip, the glyph and the number, today's
                              logs with the one that stood out marked, a row to log from), Home Compact, the default
                              (a short FloraScore strip, a week of day buttons with arrows and swipe, the check-in as
                              one row when it's due, the day picked as History draws it, its logs one line each)
                              and History Calendar (a month of day marks, RU.dayMark; a tapped day is drawn as the list
                              draws it)
prototype/js/refresh-profile.js   Profile, from the Today avatar, and onboarding, Short or the Full survey (the shipping
                              survey reworded), with the primary care note on a sign
prototype/js/refresh-photo.js     a photo of a meal (Will, Nov 7, membership only): Add a photo on both meal sheets, the
                              foods it sees as chips to check, which meal and when, then the core's save-meal. Claude
                              reads the photo where the page can send images; otherwise the demo plays a sample
prototype/js/refresh-ask.js       Ask Florin as a chat: alarm words first (L.alarmsIn), a fixed redirect for diagnose,
                              dose or predict, then Claude through the sample capability, checked, with answers computed
                              from the logs as the floor; Make a report on the flag note opens it on the clinician path.
                              Built to DESIGN.md's coach spec (Will, Nov 5): an opening read, compact turns ending on one
                              bold question, options about one turn in three, thumbs, What Ask Florin knows
prototype/js/refresh-detail.js    the detail pages with Oura's depth in Florin's design (Will, Nov 7): the core's page plus
                              a state word and a Lora headline, contributors on tracks against the usual, a day by day
                              chart with a scrubber (the day picked shows its reading and L.dayWhy), and what moved
                              against the stretch before. It follows the phone's theme, never forced dark
prototype/js/refresh-easy.js      the Easy version: larger text and simpler screens. Its own Today, plus, a BM in four
                              steps, symptoms, Your weeks in place of Insights; History and Ask drawn bigger; Easy view,
                              its settings page from Profile (Will, Nov 7: text size, fewer cards, voice first, motion)
prototype/css/refresh-{looks,variants,profile,photo,ask,detail,easy}.css   each module's styles, scoped to what it draws
                              Each module registers into FLORIN_EXT and wraps RU; it never edits a core file
prototype/js/refresh-app.js   the page: the one phone (Phone, phone.set), the decisions, notes per screen and decision
library/                       Florin data looks: the same numbers drawn in five looks, the start of a component library
library/js/looks-data.js       the one data object (FLD.build) every look draws from, built on refresh-data.js. A look's
                              day counts come from D.tally[7] and [30] (within, shifted, unsure, nocount, flag, known,
                              and left, the sentence naming the days counted neither way), so every look counts alike.
                              Its range option (Nov 7) makes the "30" stretch 7 or 90 days for the app's Insights tabs;
                              the library page draws 30, unchanged
library/js/look-*.js, css/look-*.css   one look each, registered on window.FLOOKS, every rule scoped under .lk-<id>
reference/shipping-app/       the app that ships today: Log a visit, History, the onboarding survey and profile
reference/oura.md              what Oura's screens do, and how each idea translates under Florin's rules
work/                          QA and screenshot scripts (work/shots-library.js for the looks, work/sweep.js for every
                              pair of decisions)
```

Load order (both pages): lib.js, claims-rules.js, data-app.js, app-charts.js, refresh-data.js, refresh-ui.js,
refresh-insights.js, then the library's looks-data.js and look-rings, journal, bento, oura and easy, then the modules
in this order: looks, variants, profile, photo, ask, detail, easy, and refresh-app.js last. The css follows the same order (app.css,
refresh.css, look-*.css, refresh-<module>.css). A later module wraps what an earlier one drew: Easy wraps Day first's
Today and the look's Insights, and draws its own in their place.

The page (Will, Oct 27): one phone, live, in the middle, under a slim header. The left bar opens with **View**
(Default or Will's picks, Will, Nov 5), which sets Data style through phone.set (Default is its default; Will's picks
opens Insights), with one plain line under it, and a second row, **Ask button** (A Pill, B Compact, C Link, D Token,
E Question, F Bar; Will, Nov 7), how Ask about this looks everywhere, with its own plain line: a design-system option,
not a decision, set through phone.set (`askUI`), stored per viewer (`florin-refresh:askUI`), Pill by default, and a
change opens Insights (options/ask is the page Will picks from). Then it holds **Decisions**
(Consistency, BM logging, Home, History, Weekly check-in, Meal sheet, Data style, Version, Onboarding), one line each,
then **Demo** (Person; Logs: 12 weeks, New, day 5 or Just joined; Demo person's meals: Every day, Only with symptoms or
Never; Plan; Theme; Reset), under one plain line, "These change the demo person, not the app", which folds to a
one-line summary (folded by default, remembered per viewer as `florin-refresh:demoOpen`), then **Screens**. Each side
bar scrolls on its own and is sized from where it sits, so its end is always in reach. The right bar is the notes for
the screen, or for the decision or demo control just changed or asked about (until the phone moves to another screen);
every decision and every demo control has an info button that shows its note (`data-rx="dinfo"`, `data-rx="xinfo"`).
Changing Demo person's meals shows its note, since it reads like a design option. Between 760 and 1019px the notes sit
under the phone: an info button scrolls to them, and a changed decision shows a "Read the note" button at the foot of
the toggles column, never over the phone.

The notes (Will, Oct 28: "Make it simple"). A decision's note takes the decision sheet's shape and keeps to its words
(`claude/Florin decisions.md`): the question in ten words or fewer, one sentence on what it decides, a block per option
(its name, then What it is, Why do it and Why not, one sentence each, honest both ways), the recommended block marked
Recommended, "We recommend <option>" with one sentence of why, at most one Still open, and Try it. Its top label
numbers it and says what we recommend ("Decision 1 of 9 · Consistency · We recommend C"; `rec.short`
names a recommendation more shortly there), so the answer is in view before the options. The check-in's note answers
Will's question first (`answer`), then says what the check-in is, as the sheet does. A note about something else opens
at its top. A screen's note shows its claims line only when the screen fails a rule (no line is a pass, and every check
reads it that way). A demo control's note
says what it changes about the demo person (Person gives each person a line from their own logs: their usual first
BM window and forms, how often symptoms come up and the food pattern Insights finds; Logs says New's day from the
model); the meals one explains the trap (meals written down only on days with
symptoms make everyday foods look linked to them) and the food check, with `L.MEAL_COVER` and `L.FOOD_CHECK_DAYS`. A
screen's note is about 80 words or fewer: what the screen does and why, and at most one open question. Every note is
plain: no badges (every option is drawn, so nothing says On the phone or Picked), no build status, no was and now, no
research lists, no persona names or scores as evidence, and every figure from the model. A screen in the list that belongs to a
decision sets that decision, and it stays: Home: Score first (the core's Today row; the page sets it, so the phone's own
open("today") never changes Home), Home: Day first, Home: Compact, History: List and History: Calendar, Data style:
Today (Score first, when Home is Compact, which draws no data style), the onboarding screens and the Easy
version's, as the Membership screens set Plan to Free. So the phone and the left bar always agree, and a check that
sweeps the list puts the decisions back after. Decisions are stored (`florin-refresh:<key>`); the demo controls
aren't. The phone follows the page's theme (the system's, or the page's own) until something sets one that differs from
it; a set equal to the page's own clears that, so the phone goes back to following (the Oura style turning it dark and
giving it back leaves nothing stored). The arrow keys step through Screens from the list or with nothing focused, from the row the page opened while
the phone is still on it (so a row that draws another row's screen, such as Log a BM, details filled in, never loops),
and focus comes back to the lit row if a screen took it into the phone. A row picked from the list always shows that
screen's note. The first Tab stop is Skip to the phone. The header links the data looks library ("Every data style,
side by side"), with room in its links row for one more (the voting page, to come); the footer says only "Prototype only. Not for patients." A decision whose option shows on another screen (Home, History, BM logging, Meal sheet) has Show it on the
phone in its note, which opens that screen and keeps the note up. With the Easy version on, the Home and Data style rows
each get one plain line, "Easy has its own Today (charts). Turn Easy off to see this choice.", under the row and at the top
of the note (`SHADOWED` in refresh-app.js). Under 760px the app is full screen and a slim bar at the top opens Toggles
(View, Decisions, Demo, Screens) and Notes as sheets: the same panels, moved, never doubled. A decision changed in the
Toggles sheet says so in one line at the sheet's top ("History is now Calendar."), with See it (closing the sheet, on the
screen the option shows on) and Read the note; changing Demo person's meals opens its note. The bar is at the top so the app
keeps its own tab bar at the bottom, as on a real phone (Will, Oct 28: a bottom bar covered the app's tabs). The app
ends above the home indicator (`.rx-mount` takes `--rx-sab`), and the strip under it is the app's own ground. The safe
areas are variables on `:root` (`--rx-sat`, `--rx-sab`), so behave.js stands in a phone's at 47 and 34. The bar is
border-box, so it is 48px plus the top inset, counted once, and the app's first line and avatar sit under it.
Weekly check-in Off takes the check-in out of the whole app (`RU.ckOn(V)`), and its screens are disabled in the list.
BM logging Full form only shows one Log a BM row on plus and no one-tap save. Home has three options, Score first (the
core's), Day first and Compact (Will, Nov 4), and its toggle takes its own line. Compact is the default (Will, Nov 5:
"Set the default to compact for home screen"); a viewer's stored pick still wins. Home Day first and Compact, History
Calendar, Data style, Version Easy and Onboarding are stored and stamped on the phone, and drawn by their modules. Where
they meet: Easy has its own Today (Home's Day first or Compact waits under it) and always draws Easy read (whatever Data style says), and
keeps History as a calendar when that's picked; Profile's Larger text and simpler screens opens Easy view, whose first
switch sets Version, its Logging
rows set BM logging and Meal sheet, and its theme row sets the theme, all through phone.set, so the left bar follows.

**Will's picks** (Will, Nov 5: "Can you build an app refresh view that 'Will's picks' toggled to and a default?"; Nov 7:
"I think FLORIN CHARTS for insights tab has the best flow"), Data style's `picks`: the core's Insights in its own order
and range tabs, each card Will picked (`WILL_PICKS` in refresh-looks.js, read Nov 7; change the table when he picks
more) in his style: Timing in the Rings look's morning dial (the screenshot of the Timing card he likes was Rings',
though he called it "the oura"; Oura's card is one table edit away), Form, Symptoms and the check-in in Oura's cards,
Frequency in Bento's stacked chart, the rest in Florin charts. The range is picked once, in the tabs at the top of Insights (Will, Nov 7: "the date range is
toggled at very top, not labeled within"), and every card draws it, picked or not: a look's card reads the range
through `FLD.build(..., { range })` (7, 30 or 90; 7 on Free; the days so far while learning), whose `D.range` the
range cards say. Every Insights card, in Florin charts, Will's picks and each library look the phone draws (the Easy
version keeps its own plain heads), is named in a word or two (FloraScore, Trend, Your days, Timing, Frequency, Form,
Symptoms, Check-in, Patterns; a look's head is rewritten by refresh-looks's `plainHead`, which drops its range, its date
and every pill beside it, what a pill said being said in the card's body; Oura's
trend keeps its 30 and 90 switch in the Oura style, which has no range tabs), with the range said only in words a screen reader hears, and carries Ask about this and its detail link inside
the card at its foot (`.rlk-foot--in`; on a Bento board in its full-width first tile, else a tile of its own). Today,
the detail pages and the theme don't change (an Oura card takes the phone's theme). In every view but a library look
and Easy, Insights' FloraScore card is the Rings look's hero, "the large green big circle" (Will, Nov 5), drawn by its
own renderer; under it the core's card is the Trend (FloraScore's average over the range against its usual range,
"FloraScore averaged 80, in its usual range", with what moved it; never an "N of M days" count, which is Your days'
alone, Nov 7), then Your days (the logs: the count within your usual, what that means in one line, and what the days
outside it had, a row each, with Ask about this and Your days in detail at its foot). FloraScore stays out of Gold there. Each demo person has one day with 5 BMs (refresh-data.js, `BUSY`,
Sep 21), in the last 30 days and outside this week and last, so Frequency shows one; it is Gold, as every shift is.

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
averages raw (`wk`, `lw`) and as shown (`wkR`, `lwR`); `delta` is `wkR - lwR`, so "+8" always sits beside 76 and 84,
and each part's `pts` is in whole points (largest remainder) that add up to `delta`.

Meals are occasional (Will, Oct 14). `L.build(persona, data, { meals })` takes "all", "rough" (only days with a
symptom) or "none". `L.MEAL_LOGS` labels them Every day, Only with symptoms and Never: the demo control (Demo person's
meals) is the demo person's history, never a design option, so nothing on the page says "rough days" for it. Under 60%
of logged days with a meal (`L.MEAL_COVER`), `L.patterns` holds every meal pattern back (`sparse`), because logs kept
only on days with symptoms name ordinary foods by selection. The quick log (`RU.mealQuick`) is one box
for the day with a voice button; the prototype plays `L.mealSay` in place of the microphone (that day's meals not
logged yet, so saying the day never counts a food twice). With membership, both meal sheets also take a photo of a
meal (refresh-photo.js, Will, Nov 7): the foods it sees are chips the person checks, nothing is saved before Save, and
Save is the core's save-meal, so the foods are counted through `L.matchFoods` like any meal's. Claude reads the photo
through the sample capability when the page can send images, its reply kept to plain food names (no amounts, no
judgement or health words, nothing the claims rules or `L.alarmsIn` catch, "can't tell" counted, never guessed);
otherwise the photo plays that slot's meal from `L.mealSay`, and says so.

The page has a Plan switch. Free keeps logging, Today, FloraScore, the check-in, History and 7 days of Insights;
Florin membership adds why the score moved, 30 and 90 days, details, patterns, the food check, Ask Florin, the
clinician report and a photo of a meal (`RU.paywall`; refresh-photo.js adds the photo to its list). Teasers blur the person's own counts; never show made-up content.

## Extension hooks

A feature module is a file pair, `prototype/js/refresh-<name>.js` and `css/refresh-<name>.css`, loaded after
refresh-insights.js and the library looks and before refresh-app.js, in this order: looks, variants, profile, photo, ask,
detail, easy.
It never edits a core file: it registers into `window.FLORIN_EXT` (made by refresh-data.js) and wraps `RU` functions.

```
FLORIN_EXT = {
  overlays:  { [type]: { kind: "sheet" | "full" | "screen", render(M, V, st, api) -> html, key?(st) -> screenId } },
  acts:      { [name]: (button, api, event) => void },     // a data-act; wins over a core act of the same name
  opens:     { [screenId]: (api) => void },                // open(id) for ids the core doesn't know (after going to Today);
                                                           // opens.ask: after the core's Ask tab, a module's fresh chat
  screens:   [[group, [[id, label], ...], { before?: group }]],  // joins a group of that name, or a new group
  notes:     { [screenId]: (M, P) => note },               // wins over the core note when it returns one
  decisions: { [key]: (M, P) => decision },                // the note of a decision a module draws
  built:     {},                                           // no longer read (Oct 28); kept so an old claim can't throw
  keys:      { [overlayType]: (overlay) => screenId, ["tab:<tab>"]: ({ st: S }) => screenId },
  onSet:     [(key, value, api) => void],                  // after phone.set has redrawn and the page has followed
  api                                                      // the live phone's api, there from the phone's first draw
}
note = { t, lede, open?: [one question] }               // a screen's: about 80 words at most (was and now, and
                                                           // research, are gone: the page draws neither)
decision = { opts: [{ v, name?, is, why, not }], rec: { v | [v, v], short?, text: "We recommend ...", why },
             open?: "...", try: "...", aside?, answer?: [lead, rest],
             about?: { h, lede?, items: [[a, b]], more?: [line] } }   // the page adds q and what (DECISIONS)
                                                           // P: every decision, the demo controls (persona, data,
                                                           // meals, plan, theme) and key
```

- **api**: `S` (the phone's state), `V()`, `M()`, `push(type, st, { instant })` (returns the overlay, or null when its
  render drew nothing or threw: it isn't opened), `pop()`, `swap(type, st)`, `rerender(overlay?)`, `top()`,
  `closeAll()`, `toast(msg, undo?, more?)`, `say(text)`, `renderTab(soft)`, `go(tab)`, `nav()`, `focusSel(selector)`,
  `open(screenId)`, `rebuild()` (a fresh model, every draft and overlay gone, drawing nothing: follow it with
  `open(id)`), `reset()` (rebuild, then Today), `set(key, value)`, `countUp(el)`, `layer`, `root`, and `snapshot()`
  (returns an undo), `commit(st, kind, fields)`, `key()`, `act(name, button)` (a module's act, else the core's),
  `core(name, button)` (always the core's, for an act that wraps one).
- **set(key, value)** is the one way to change the phone: the decisions (`form`, `bmUI`, `home`, `history`, `checkin`,
  `mealUI`, `look`, `easy`, `onboard`), `askUI` (Ask button, under View), `plan`, `persona`, `data` and `meals` (these rebuild the model and go to Today),
  `theme`, `full`. The page follows every set, whoever makes it: the toggles, the stored decision, the Screens list and
  the notes (so a Profile screen can turn the check-in off). Each decision is stamped on the phone's `.ap` root
  (`data-bm-ui="full"`, `data-look="rings"`, `data-easy="true"`, and `data-ask-ui`) for a module's CSS; an overlay's element carries
  `.ap-o--t-<type>`.
- **decisions**: every option is drawn, so a note has no badge. The core writes the notes of form, bmUI, checkin and
  mealUI; the modules write the rest: looks `look`, variants `home` and `history`, profile `onboard`, easy `easy`. The
  page gives each its question (`q`) and what it decides (`what`) from `DECISIONS`, and if a module's note throws, the
  note falls back to those and the options' names. behave.js and sweep.js check every option of every decision for the
  sheet's shape.
- **V()** = `{ form, uid, mealUI, plan, bmUI, home, history, checkin, look, easy, onboard, askUI, persona, data, meals }`.
- **Wrap, don't edit.** Render functions are looked up when called, so `const base = RU.plus; RU.plus = (M, V, st) =>
  V.easy ? mine(M, V, st) : base(M, V, st)` works for `RU.today`, `RU.history`, `RU.insights`, `RU.idetail`, `RU.ask`,
  `RU.plus`, `RU.bm` and the parts below.
- **Today** is `RU.todayLayout(M, V)` (an array of part names, Score first: top, hero, checkin, entries, week, next,
  fine) over `RU.todayParts[name](M, V)`. Replace `hero` or `week` (data style), or wrap `todayLayout` or `RU.today`
  (Day first, Compact, Easy). The `top` part holds the 44px avatar, `data-act="profile"`; with no module's `profile` act it
  toasts that the profile comes in this pass; the profile module's act opens Profile.
- **History** is `RU.history(M, V, st)` over `RU.historyDay(M, V, d, entries)`, `RU.entryRow(e, M, V)` and
  `RU.historyNext(M, V)`, so a calendar shows a day the same way. Each day's header carries its day mark
  (`RU.dayMark`) and its `L.dayWhy` line (a flagged today, `RU.FLAG_DAY`); on Free, a day before the last
  `RU.FREE_DAYS` is only logged, never read (`RU.heldOnFree`), as the calendar holds it.
- **Home** (`V.home`) is `compact` (Compact, the default since Nov 5), `score` (Score first, the core's Today) or `day`
  (Day first); Compact and Day first are drawn by refresh-variants's wrap of `RU.today`. Compact is the `top` part
  without its date line, then a FloraScore strip (`L.score` as a button to FloraScore's page with a chevron, the paywall
  on Free; "· Today" by the name while another day is picked; `L.scoreMoved`'s `delta` as a sentence, "This week's
  average is 5 above last week's.", never with no score today; a thin bar of the usual range with today's dot, only
  when there's a dot, its label "Your usual 74 to 82", and `RU.scoreRel`'s words in the number's name for a screen
  reader, not on screen; Insights; Day 5 of 14 while learning and `L.NO_SCORE` with no score, as the hero says them; on
  a flag, "Not read against your usual today" and no bar), Score first's Teal note on a flag or an alarm
  (`RU.highlightOf`), a button (`vr-cp-flag`) to the flag sheet for that log (When to see a clinician, Make a report),
  a week of day tabs Monday to Sunday drawn with the Rings week card's own marks (`FLOOKS` rings `.marks`: `ring`,
  `add`, `legend`, inside `.lk-rings .rg-marks`), each day's reading from the calendar's `cellOf`, "+ Add" under a day
  with nothing logged (a tap picks it, as any day; the day then offers Add), one header row (an arrow a week back, the
  month short, "Oct 2026", a button to History's calendar on that day when History is Calendar, the legend's info
  button, "Today" when off this week, an arrow a week on: nothing comes and goes on a row of its own), a swipe across
  the row stepping a week, the legend of the marks on show (never "Nothing logged") folded behind the info button
  (open before day 14), and on Free the calendar's membership line when a held day is on show; the check-in as one row
  when it's due (Start, Skip); the day picked through `RU.historyDay` (the tabs' panel) with Add where the count was,
  its `L.dayWhy` line across the width, its logs one line each (`RU.entryRow` while Compact draws: the word and what
  was picked, never the stock line; a meal's words and a note keep theirs), the BM tiles on today with nothing logged
  (the BM logging decision's way) and No BM today in the evening, as Score first offers it; then the check-in's result
  when it's done, and `fine`. No week card and no sentence on what stood out. The day picked is `S.vrCp` (`{ M, sel }`:
  a new model starts again on today); a log saved to another day moves it there (`S.vrCpSeen`); with a past day picked,
  plus offers "Log for <that day>" in place of Log for an earlier day; acts `vr-cp-day`, `vr-cp-wk`, `vr-cp-now`,
  `vr-cp-lg`, `vr-cp-cal`, `vr-cp-flag` and `vr-cp-ins` (Insights); the Today tab, the Home: Compact row and a change
  of Home bring it back to today. The calendar's days are tabs too (manual activation: the arrow keys move, Enter or
  Space picks).
- **A day** is drawn one way everywhere (claude/Florin data viz.md, section 1): `RU.dayMark(f, o)` draws one day's
  circle, ring, date, symptom square and screen-reader words for the calendar, History's day headers, Your days and
  Easy, from one of `L.span(M, n, mode, end?)`'s facts. Never draw a day another way, with one exception until the
  module-by-module review settles it: Today's week card and Compact's week draw the Rings week's ring (Will's pick, Nov
  4; data viz.md section 3 says where it departs from section 1). `L.tally(F, named)`
  counts a stretch the one way (within out of the days read; `left` says what was counted neither way);
  `L.dayWhy(M, f, mode, o)` is a day's reasons and its line; `L.symLine(F, o)` is the one symptom sentence (the week
  card, Ask Florin, and the screen-reader words of Insights' Symptoms day strip, which says it in the card's
  answer, its usual and its bars on screen); `L.FLAG_DAY` (also `RU.FLAG_DAY`) is the flagged today's line.
  `RU.weekCard(M, mode, o)` is Today's week card. refresh-looks wraps it to draw the Rings look's week (`week()` in
  look-rings.js, through FLD.build: `D.tally[7]`, each day's `L.score` under its ring, a day with nothing logged a
  button with Add that opens plus for that day) in every style that doesn't draw its own week; the core's card (the
  last 7 days over `L.span(M, 7)`, `L.tally`, `L.dayWhy` and `L.symLine`) stays as `RU.core.weekCard`, drawn for a
  week to another day (`o.end`) or if the Rings card can't draw.
  `RU.scoreRel(v, range)` says where a FloraScore sits ("In its usual range", "A little above its usual range") for
  every screen, and `RU.cardChart(M, V, key, n)` gives an Insights card's chart for a range, so Ask Florin draws the
  card's own.
- **What stood out today** is `RU.standouts(M, mode)`, ranked one way for Score first and Day first: a BM flag or an
  alarm feature (`RU.alarmOf(e)`, a BM's note read with the BM net) first, then a shift from the person's own usual (a
  form outside the usual forms, a first BM outside the window, more BMs than the usual count, No BM), then symptoms by
  strength (one without a strength reads "strength not said", never mild); ties to the earlier entry; before day 14
  only flags and symptoms. `RU.leadText(M, mode, item)` is its one sentence; `RU.highlightOf(M, mode)` gives
  `{ text, alarm }` (the timing sentence when nothing stood out) and `RU.highlight(M, mode)` the text alone (without a
  mode it reads with the phone's). Score first draws an alarm as the Teal note on the Forest card, and the score's line
  then reads "Not read against your usual today", as Day first's chip does. With membership the hero's sentence goes on
  to say what the log that stood out did to FloraScore, `RU.scoreEffect(M, mode, N)` ("Without it, FloraScore would be
  <n>.", or "Without the <time> BM, FloraScore would be <n>." when more BMs than usual stood out, or "It didn't change
  FloraScore."), worked out by `RU.scoreWithout(M, e, mode)`, today scored without that entry; Day first uses the same.
  Never for an alarm, never for a No BM log, never on Free.
- **A flagged today** (`L.flagToday(M)`, also `RU.flagToday`: a flag or an alarm feature in today's logs, by
  `L.alarmOf(e)`, which `RU.alarmOf` is) is read against nothing anywhere. The model does it: `L.facts` gives a flagged
  today (once there's a usual) `state: "flag"`, `flag: true` and `inWin`, `inCount`, `formsIn` all null, with the
  reading it would have had in `raw`; FloraScore reads `raw`, so it keeps its number. Everything that counts days
  against the usual (Insights' cards and details, Ask Florin's facts and answers, the data looks, the calendar) leaves
  it out and says `RU.FLAG_DAY` ("Today has a log noted for a clinician, so it isn't read against your usual."); a
  chart draws it as a Teal ring (`.is-flag`, legend `sw--clin`). The hero, Day first's chip, Easy's FloraScore,
  Insights' score card and FloraScore's detail keep the number and say "Not read against your usual today"; Easy's
  sentence and the detail lead with the sign as the Teal note. `RU.week` gives the read counts over the last 7 days,
  the flagged today left out (`rbms`, `rmornings`, `flagged`); the week card (`RU.weekCard`) draws the flagged today as
  a Teal ring and says `RU.FLAG_DAY` in its answer (the core's card, a Teal ring with the info glyph and the line). In the data looks `D.flagToday`,
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
- **Ask Florin's shape** (Will, Nov 5; DESIGN.md, Ask Florin). Every way into Ask is Ray with the Ask token: the
  `chat` icon in refresh-ui.js is Ask Florin's glyph (a round bubble holding the Flow wave), and refresh-ask.css sets it
  on a disc (Forest with a Ray glyph, Ray with a Forest glyph on dark grounds) on the Ask tab, `.ap-ask-b`,
  `.ap-idt-ask` and `.ap-ez-ask`, which are Ray pills edged at 3:1 in light. A data style's Insights cards carry Ask
  about this too (refresh-looks, `.rlk-ask`, with the card's own range in `data-range`). The chat opens on a read of the last 7
  days (or of the card it was asked from): a chart and two sentences, then the questions to start as chips. A turn is
  the token with "Looked at N things in your logs" (From your logs, folded), one Florin journal line (never on the
  clinician answer), the reply in Lora, then one bold question (`a.ask`) offering one more thing to look at; its
  `a.yes` is what a short "yes" asks, a short "no" gets a short reply. Options (`a.opts`, "Yes, show me" first) come on
  the first answer and then every third; a redirect keeps its own; the clinician answer has none, only the report
  button. Claude is asked for 2 or 3 sentences and one question; `check` reads the reply and the question
  (`splitQ`), and the computed answer's question stands in when Claude asks none. What Ask Florin knows (`askx-mem`)
  lists what every answer reads and what can be left out of this chat (`ch.forget`: name, today, ck, chat), and the
  opt-in "Let Ask Florin start a conversation" (`S.askReach`, off by default).
- **Ask button** (Will, Nov 7: "I don't know if we need as big a bubble every time"): one setting, `V.askUI`, stamped as
  `data-ask-ui` (pill, compact, link, icon, chip, bar), draws every Ask about this (`.ap-ask-b`, `.ap-idt-ask`,
  `.ap-ez-ask`, a look's `.rlk-ask`, and any later module's that uses those classes) in one style. The markup stays
  each module's; refresh-ask.js gives each button, as it lands in the phone, the same parts (`.ap-askw`: the token,
  "Ask" and " about this", the card's first question from `RU.askContext` for chip, a chevron for bar) and a name that
  says the card ("Ask about this: Timing", "Ask Florin: <question>", ", with Florin membership" on Free); refresh-ask.css
  draws each style. Every style keeps the token, a 44px target and the Free lock; the styles are listed once, in
  `EXT.askUI`.

What each module registers (the file's header comment has the detail):

```
refresh-looks     wraps RU.weekCard (Today's week is the Rings week; RU.core.weekCard keeps the core's), RU.insights
                  (a look's cards; else the core's with the Rings FloraScore hero and the Trend, and Will's picks' cards,
                  at the tabs' range, each head plain and its Ask inside),
                  RU.todayParts.hero and .week, RU.idetail (Your days), RU.askContext; acts idetail,
                  iback, ck-start and ck-tag (wrapped), rlk-week, rlk-voice; screens Data style (Data style: Today
                  puts Home on Score first while it's Compact, which draws no data style); keys tab:insights and
                  tab:today; notes, decisions.look; onSet (theme, look, a rebuild). Oura sets the phone
                  dark while it's drawn (through api.set, so the page follows) unless the viewer has picked a theme,
                  and gives the theme back when it stops; with Easy on it leaves the theme alone
refresh-variants  wraps RU.today (Day first and Compact), RU.history (Calendar), RU.entryRow (Compact's one-line rows),
                  RU.plus (the day picked on Compact) and RU.flagNote (its heading from Compact's Teal note), and the
                  tab act (the Today tab puts Compact back on today); acts vr-quick, vr-cal-day, vr-cal-m, vr-cp-day,
                  vr-cp-wk, vr-cp-now, vr-cp-lg, vr-cp-cal, vr-cp-flag, vr-cp-ins; a swipe on Compact's week; screens
                  home-day, home-compact and hist-cal in Tabs; opens home-compact; keys tab:today and tab:history;
                  notes, decisions.home and .history; onSet (home); state S.vrCp, S.vrCpSeen, S.vrCpLg, S.vrCpSlide
refresh-profile   overlays pf, onb, pf-rem, pf-info, pf-del; acts profile, onb-*, pf-*, ckd-save (wrapped); wraps RU.today
                  (the first name); screens Onboarding and profile; notes, decisions.onboard; onSet. pf-easy (the
                  Larger text row) opens Easy's ez-set when it's there, else switches Version
refresh-photo     wraps RU.mealQuick and RU.meal (the Add a photo row before the box for the words: a file input,
                  data-ph-file, and Use a sample photo; on Free the lock and the paywall, data-pay="photo") and
                  RU.paywall (the photo in its list, its title when the photo opened it); overlay ph (full); acts
                  ph-add, ph-sample, ph-food, ph-other, ph-add-food, ph-meal, ph-stop, ph-close, ph-save (the core's
                  save-meal on the sheet's state, then L.alarmsIn on the words saved); screens meal-photo (Logging)
                  and meal-photo-free (Membership, sets Plan to Free); keys meal (the free row's sheet); notes;
                  RU.photo (clean, the reply check; sampleText; held). The photo is a blob URL in memory, let go when
                  its sheet closes, sent nowhere but the one Claude call
refresh-ask       wraps RU.ask (Member; Free keeps the core's lock); acts askx-* (send, ask, stop, new, rate, mem,
                  forget, keep, reach), ask-about and ask-clear (wrapped), flag-report; overlay askx-mem; screens
                  ask-chat, ask-alarm and ask-mem; opens ask-chat, ask-alarm, ask-mem and ask (Screens > Ask Florin is
                  a fresh chat); keys tab:ask; notes; onSet (form, check-in, meals, plan); EXT.askUI (the Ask button
                  styles) and the pass that draws every Ask about this in the one picked
refresh-detail    wraps RU.idetail (score, timing, often, form, sym, ck, pat; Member, not Easy; the core's page as
                  RU.core.idetailPlain): the headline's state word and sentence, contributors (FloraScore's four
                  parts open their pages), a day by day chart with a scrubber (.dt-scrub, role slider: a tap, a
                  drag or the arrow keys), What moved, and what stayed the same; a column a week at 90 days; notes
                  for i-score to i-pat. Your days and one pattern stay as they are
refresh-easy      wraps RU.today, insights, plus, bm, sym, history, ask and idetail under V.easy; acts ez-* and plus-day
                  (wrapped); screens ez-today and ez-bm (which set Version to Easy); keys tab:today, tab:insights, bm;
                  notes (its screens, plus and sym in Easy), decisions.easy; onSet (easy, theme). Easy view (Nov 7):
                  overlay ez-set (from Profile, first control the Version switch) and acts ezv-*; its settings kept in
                  S.pf.ez (size, fewer, voice, motion; Reset clears them with the profile), stamped on the root while
                  Easy is on (data-ez-size="larger": zoom on each screen's content; data-ez-motion="less"); wraps
                  FL.reduced (less motion) and the open-meal act (voice first: the quick sheet starts listening);
                  screens ez-set in Onboarding and profile
```
- A hook that throws is logged and skipped, never allowed to take the page down. A wrapped screen that throws is drawn
  the core's way instead (`RU.core` keeps every core screen from before the modules loaded), and so is a Today part
  or layout. A module screen with no note of its own shows "This screen" and lights no row in Screens.

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
  the phone draws neither now (no average line, and What moved it is four bars from a centre line). A day with nothing
  logged is never a hatch, a strike-through or a zero: in charts, History and the calendar it is drawn as nothing, the
  date alone in Ink 3 (data viz.md section 1); on Today's week card and Compact's week, where Will asked for it to be
  obvious (Nov 4), it is a thin empty Ink 3 ring with "+ Add" (section 3).
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
the seven modules and their css included, `js/refresh-detail.js`, `css/refresh-detail.css`, `js/refresh-photo.js` and
`css/refresh-photo.css` among them). The library's look files `index.html` loads go under `js/` and `css/` too,
from `library/`: `css/look-*.css`, and `js/looks-data.js` with `js/look-*.js`. The page declares the capabilities
`{ sample: { images: true } }`, so Ask Florin can ask Claude on the viewer's own account (the first question in a view
asks the viewer to allow it) and a member's photo of a meal is read by Claude (images: true; since Nov 7, so the next
publish passes it once, which asks viewers again at their next use); without it, or on a local file, every answer is
computed from the logs and a photo plays the sample. Keep the capability on every
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
