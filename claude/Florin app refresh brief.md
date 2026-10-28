# Florin app refresh: workshop brief

October 12, 2026. Handoff from the brand studio chat to a new chat for the app workshop. Read this first, then `claude/Florin app refresh research.md`, then `claude/Florin DESIGN.md`.

## What we're doing

Refresh today's app, the one that ships without hardware. People log manually. There is no gas or VOC data in this version, so no FloraScore built from sensor readings.

Two goals.

- **Simplify logging.** Fewer symptom pills, no forced weekly report, no slider for logging a BM.
- **Rethink the data visualization.** Modern, balanced between health and wellness and science, easy to read, and obvious how to dive deeper. Learn from Oura and Function Health.

## Will's notes (Oct 12)

- Logging defaults to a BM, with options for a weekly check-in, symptoms and meals.
- The extra symptom pills on every logging interaction are too much. Symptoms move out of the BM log; the BM log keeps notes.
- No tips or blog links for now.
- Weekly reporting is forced through the symptom-tracking flow today, and again every time you go through Insights. Decouple it.
- "Log a symptom" goes inside the plus button.
- The BM slider isn't intuitive. Rethink it.
- The plus button opens a submenu: BM, Symptoms, Meal.
  - Meal: free text, with options for breakfast, lunch, dinner and other.
  - Symptoms: the pills and their follow-up questions.
- "How do we do the surveys?" (answered below as a proposal)
- Add chat.

## Decided (Oct 12)

- **Workspace:** a new chat in the SNIFR project.
- **Weekly check-in:** a card on Today when it's due (one reminder), and an item in the plus menu. It never blocks logging or Insights.
- **Ask Florin:** its own tab, plus an "Ask about this" link on each chart that opens chat with that chart's data loaded.

## Proposed, to workshop

**Tabs.** Today · Insights · (+) · History · Ask.

**Plus menu.** BM (first and largest), Symptoms, Meal, and Check-in when it's due (with a dot).

**Log a BM:** one tap, then optional detail.

- Time defaults to now, editable.
- Stool form as tappable chips, not a slider. Two options to compare:
  - **A.** Bristol types 1 to 7 with abstract icons and plain one-line labels, and an (i) guide. Standard in GI apps and what clinicians expect. Confirm licensing first (see research).
  - **B.** Our own five words as chips: Hard, Firm, Formed, Loose, Watery. Today's scale without the slider. No licensing question, but it doesn't map cleanly to Bristol.
- "Add details", collapsed: urgency, didn't feel finished, straining, duration as three chips. Blood or mucus is a flag that routes to the clinician path in Ask Florin, never interpreted.
- A note field.
- Drop odor: it was a sensor-era field.
- A "No BM today" quick log, so empty days aren't read as missing data.

**Log symptoms.** The current pills, then one or two follow-ups as chips (how strong: mild, moderate, strong; how long), and a note.

**Log a meal.** Breakfast, Lunch, Dinner or Other, then free text.

**The weekly check-in (the survey).**

- Four or five questions in our own words, about 60 seconds, answered with chips, not sliders. A starting set: how much belly pain this week, how many days it got in the way, bloating, how settled your bowel habits felt, and anything else to note.
- Scored only against the person's own first weeks. Not named, banded or scored as IBS-SSS or any clinical scale.
- Due on a day the person picks (Sunday evening by default), with one reminder. It shows as a Today card and in the plus menu, and can be skipped.
- Results show on Insights as a weekly card with the trend.
- **Parallel track:** if the NSF pilot needs a validated outcome measure, license IBS-SSS from the Rome Foundation and use it word for word in the study arm. Don't adapt it without permission.

**Insights, borrowing from Oura and Function.**

- Each card leads with "your usual" in words, then the chart. For the first 14 days, a "learning your usual" state instead of a judgment.
- Summary counts in plain terms: "This week: 9 of 12 BMs in your usual window."
- Cards to start: timing (first BM of the day), frequency, stool form mix, symptom days, weekly check-in trend, meals (possible patterns only after a food shows up 5 or more times).
- Every card has an obvious way in: a chevron to the detail page, and "Ask about this".
- Detail page: your value against your range, the trend (week, month, 3 months), and "What shaped this" collapsed by default.
- One range only, the person's own. No red, no pass or fail. Patterns say "tends to follow", never "causes".

**Today.** One sentence from the person's own logs, today's entries as a short timeline, the check-in card when due, and "this week so far".

**Ask Florin.** Keep the coach test bench rules: answer first, one bold question per turn, options about one turn in three, an alarm feature gets a banner and routes to primary care. Add memories the person can see and delete, opt-in check-ins and small charts in answers.

## Rules that stay

- DESIGN.md v1.1: the 4px spacing scale, the radius scale, fixed control heights, app colours (Plum for your usual, Gold for a shift, Teal for context, no Ray Deep in the app).
- The claims guardrails: no diagnosis, prediction or treatment, never "healthy" or "normal", never IBD.
- No em dashes and no humor in any copy.
- Names: Florin Health, the Florin app, Ask Florin (never a doctor's title).

## Where things are

- **The brand studio:** published at https://claude.ai/artifact/AnK85Y5MHPX9MiDiUiY3Sj. The full source, including CLAUDE.md and the QA and Figma scripts, is `florin-brand-studio.zip` from the previous chat; attach it to the new chat.
- **Today's app as it stands in the studio:** `js/app-ui.js` (`UI.log`, `UI.history`, `UI.ask`), `css/app.css`, seeded data in `js/data-app.js`, the chart kit in `js/app-charts.js`, and the chart rules on `board-dataviz.html`.
- **Screenshots of the shipping app:** `work/figma/out-ref/` in the zip (Log a visit, top and bottom, and History), copied to `reference/shipping-app/` in this repo. Fresh screenshots of Insights and the weekly report flow would help.
- **Figma:** the connector is currently signed in to the UNDONE account (will@itsundone.com), which can't open the Florin files. Reconnect as will@snifr.ai before any push.

## Suggested first steps

1. Unzip the studio and read CLAUDE.md, this brief and the research.
2. Build the refresh as its own clickable phone prototype (a separate artifact, so the team can tap through it on a phone), reusing the studio's tokens, chart kit and seeded data. Fold the winning screens back into the studio later.
3. **First pass:** the plus menu, Log a BM with options A and B side by side, Symptoms, Meal, the weekly check-in card and flow, and the Today tab.
4. **Second pass:** Insights and the detail page, then Ask Florin as a tab with "Ask about this".

## Open questions

- Bristol (A) or our own five words (B)?
- Should a check-in that was skipped stay skipped, or move to the next day?
- Does History stay a tab, or move under Today?
- Is a weekly report (Oura style) worth having beyond the check-in card?

## First pass, built (Oct 13)

The prototype: https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB (private until shared from its Share menu). Its own artifact, with the source published alongside it. The new files are `css/refresh.css`, `js/refresh-data.js` (manual logs derived from the studio's seeded days), `js/refresh-ui.js` (screens) and `js/refresh-app.js` (the prototype page). They use the studio's `ap-` classes, tokens and `data-app.js`, so screens can fold back into the studio. The chart kit comes in with Insights in the second pass.

**What's in it**

- **Tabs:** Today · Insights · (+) · History · Ask. Insights and Ask are placeholders; History is basic, not workshopped.
- **Plus menu:** BM first and largest, with the form tiles on the card (tap one and Log a BM opens with it picked), No BM today, Symptoms, Meal, and the weekly check-in with a dot when due.
- **Log a BM:** time defaults to now; A (types 1 to 7) or B (five words) as tiles with our own icons and lines, an (i) guide; Add details folded (had to rush, had to strain, didn't feel finished, how long, and a flag for blood, mucus or black or tar-like); a note. Saving with a flag shows a clinician note (Teal, primary care first).
- **Log symptoms:** six body symptoms plus your own, strength per symptom, how long, a note, the alarm list in one line.
- **Log a meal:** Breakfast, Lunch, Dinner or Other (defaults by time), free text, recent meals as chips.
- **Weekly check-in:** four chip questions plus a note, auto-advance, Later keeps answers, Skip with undo. The result compares each answer with the first three check-ins (Plum about the same, Gold moved either way) with a 13-week trend. No score, no bands.
- **Today:** one sentence from today's logs, the day on a 6 AM to midnight line, the check-in card, today's entries (tap to edit or delete), This week so far (a grid plus counts in plain words), one next step.
- **Demo controls:** Sarah, Marcus or Alex; 12 weeks of logs or New, day 5 (learning your usual); light and dark; A and B side by side; a live claims check on each screen.
- **Checked:** no console errors, no sideways scroll at 1440, 1100, 900 and 390 wide, every screen through the 22 claims rules (0 flags), spacing audit 0 off-scale.

**Calls made in the build, to confirm**

- Form tiles on the plus menu card, so a usual BM is plus, a tile, Save.
- The check-in sits in the plus menu every week, with the dot only when due (the brief had it there only when due).
- A skipped check-in stays skipped, still reachable from plus.
- Symptoms: Bloating, Belly pain, Cramping, Gas, Nausea, Burning. Urgency moved to the BM; Loose or watery and Hard or pellet-like are the form; Bloody and Mucus became the BM flag; Greasy or oily dropped for now.
- Black or tar-like added to the BM flag (it's on the alarm list with blood).
- Today has no FloraScore until the sensor ships.
- The check-in baseline is the first three answered check-ins.

**What the A/B build showed:** B's five words hide a step. In Sarah's seeded week, A puts 7 of 8 BMs within her usual (Types 4 to 6) and B puts 8 of 8 (Formed or Loose), because Friday's Type 3 reads as Formed.

**New open questions**

- BM or visit as the in-app word? The brief says BM; the studio's version of today's app said "Log a visit", and the claims checker flags "bowel movement" as a SNIFR-era term ("BM" itself passes).
- Does a FloraScore built from manual logs come back, or stay away until the sensor?

## First pass, workshopped (Oct 14)

Nine reviews of the Oct 13 build (one per first-pass screen, brand and claims, accessibility, and the open calls), a synthesis that verified and deduplicated them, and a four-way verification of the result (copy and claims, data, visual and dark mode, regressions), whose findings are fixed too. Everything below is in the prototype, at the same link. The page itself carries this as "What changed, and the calls" under the phone.

**The calls**

| Question | Recommendation | Status |
|---|---|---|
| Types 1 to 7 (A), five words (B), or seven words (C)? | **C.** Seven steps, one word each in our own words, no numbers or scale name in the app. The step (1 to 7) is stored, so a clinician report can add the number once licensed. One request to the Rome Foundation covering that export and IBS-SSS for the NSF study arm. Counsel reads C's words, lines and marks next to the scale before it ships: they're our own but describe the same seven forms. | Built as C; A and B kept to compare; counsel to read C |
| Tiles on the plus card? | Yes, and a tile logs the BM in one tap, with Add details and Undo in the toast. Catching up an earlier day, or a person's first few BMs, still open the form. | Built; needs Will's OK |
| Check-in in plus every week, or only when due? | Every week, last in the menu, dot only when due. | Built |
| A skipped check-in? | Stays skipped. One reminder. One that's ignored (not skipped) stays on Today through Tuesday evening, then the week closes as a gap. | Skip built; Tuesday rule needs Will's OK |
| The six symptoms? | Bloating, Belly pain, Cramping, Gas, Nausea, Low energy, plus the person's own (remembered). Burning moves to the BM; urgency is a BM detail. | Built; needs Will's OK |
| Which BM extras stay? | All of them show under the form now, as Will asked on Oct 14 (no Add details tap), so each costs height, not a tap. Keep the flag for safety and Sudden urge to go for IBS-D; Burning and Didn't feel finished go first if the form feels long. | Inline; needs Will's call on which stay |
| Black or tar-like on the flag? | Yes, with its own line. Plus "If there's a lot of blood, or you feel faint or dizzy, get urgent care now", which needs the regulatory pass. | Built; regulatory pass |
| Alarm words typed into a note? | Open the same primary care note, as Ask Florin's alarm banner does. Never read further. | Built |
| FloraScore from manual logs? | No. The Forest card on Today keeps the slot for Florin One. | Built |
| Check-in baseline? | The first three answered check-ins. The chip and the band now use one rule. Later: start fresh. | Built |
| BM or visit? | BM. Keep visit for what Florin One detects. The studio's claims rule should suggest BM. | Built here; studio rule to change |
| History a tab? | Yes for now: catching up, and the report for a clinician. Revisit after Insights. | Built |
| A weekly report beyond the check-in? | No. The saved check-in shows the week's logs above the answers. | Built |

**What changed, by screen**

- **Plus menu:** close button and drag-down; tiles 44px with How to pick on the card; one-tap tile log; Log for an earlier day (a week back) and Add to this day on History gaps; Log no BM today from 5 PM.
- **Log a BM:** option C; our own words and marks for the seven steps (the first pass paraphrased the scale's descriptors); B keeps its word and never a step nobody picked, and each B word sits on the step C gives the same word (Hard covers 1 and 2, Loose 5 and 6); every extra shown under the form, all optional (Will, Oct 14); blood, mucus and black named on the flag; the flag note offers a report, an urgent care line and Undo.
- **Log symptoms:** one strength for the entry, how long it lasted, when it started; Low energy back, Burning to the BM, own symptoms remembered; an unrated symptom never reads as mild; a typed name counts on Save.
- **Log a meal:** one food matcher (seed and typing, plurals, drinks); counted foods shown as you type; Same as yesterday and recent foods that add; time follows the meal; Other reads as Snack or drink; fields at 16px.
- **Weekly check-in:** one comparison rule for chip and band; taller trend with labelled steps, the first weeks in words and a table twin; recall window in words; Next, Change an answer, Later after a skip; the week's logs above the answers; clinician line and disclaimer.
- **Today:** one sentence against the usual; the day chart cut; the week as three counts over strips with hollow Gold rings for shifts; a next step from what today is missing; the clinician line when symptoms show.
- **Throughout:** focus held in sheets and returned after saving; half-filled logs kept; 44px targets; Ink 2 for anything to read; colours carry one meaning each in dark; no sideways scroll.

**Checks:** `work/qa.js` (four widths, A, B and C, every screen through the 22 claims rules, targets), `work/behave.js` (interaction and data checks, Insights included), `work/audit-spacing.js` (0 off-scale).

## Second pass, merged (Oct 14)

The second pass (Insights, its detail pages and the Ask Florin hand-off) was built the same day in another session and published to the same link, on the first pass as it stood on Oct 13. It's merged onto the workshopped first pass, so both are in the prototype now.

- **Insights:** a summary of days within the person's usual, then one card per question (timing, how often, form, symptoms, the weekly check-in, possible patterns), each with the usual in words, a count, a chart from the data vis board, and Ask about this. 7, 30 and 90 days. The learning state shows counts only until day 14.
- **Detail pages:** the typical value and today against the usual, a main and a second chart, What shaped this (folded), Ask about this, a table, and Next.
- **Possible patterns:** from logged meals and dinner times, over 90 days. A food needs 5 logs; a pattern has to hold 5 or more times, 6 in 10 or more, and clear a one-sided binomial test at 1 in 100 against other days. Each demo person has one dish their seeded logs follow (pizza, curry, burrito bowl), and Insights finds it without being told.
- **Ask Florin:** its own tab with three questions to start; Ask about this loads the card's numbers. Answers are the next pass.
- **What the merge changed in it:** Insights reads A, B and C (C's words on the axes; a word logged in B sits between its steps and reads as "could be either" when they straddle the usual, counted on neither side); a symptom without a strength reads as "strength not said", not mild; the check-in detail explains the band rule without colour names; focus lands on each Insights screen's title and back on the card you left; 44px targets on the range tabs and Ask's buttons; the picked range tab is Cream in dark.

**New questions from the merge**

- Marcus also gets "rice, then a looser first BM": rice mostly came with his curry. Hold back a food that clears the bar only alongside another found food, or show it with a note?
- The option moves the 30-day summary: B's five words absorb some forms A and C count as outside the usual. One more reason to settle A, B or C before Insights ships.
- The second pass's own questions sit in the notes beside each Insights screen (the "within your usual" definition, a usual for symptoms, Next or swipe, today in averages, dots or cells for symptoms, when to name a pattern).

## Will's notes (Oct 14) and what they changed

Will, after seeing the second pass: the app is a lot of text and simple graphs; take inspiration from Oura and give a few looks for the data, toward a component library. Keep FloraScore: it ties Florin to the score people know from Oura. Meal logging only happens when people are having issues, so look at a version with no meal logging, and make logging food as simple as saying what you ate that day, with a big voice button or one text box. Add animation. Add a toggle for a free plan without the deeper insights and Ask Florin, behind a paywall. And a report on every feature: how valuable, how well designed, how it fits the personas.

- **FloraScore is back,** built from the logs: timing, how often, form and comfort, weighted as the studio weights its four parts, blended over the last 3 logged days. A day with no BM logged is left out and has no score of its own (it would only repeat the days around it), never scored as zero; no score before day 14. On Today as the studio's Forest hero with the Ray ring and the usual range on it, first on Insights, and its own detail page. This reverses the Oct 14 workshop's "no FloraScore from manual logs" call.
- **Meals are occasional.** A Meal logs switch shows every day, rough days only and none. Logging only on rough days named toast for Sarah by selection alone, so under 60% of logged days with a meal, patterns are held back and a 14-day food check is offered instead. FloraScore doesn't depend on meals. Today no longer asks for a missing meal; a symptom today invites what you ate.
- **The quick meal log:** a big voice button and one box for the whole day; Florin picks out the foods as the words land. The prototype plays a sample transcript, since an artifact can't use the microphone.
- **Florin membership.** A Plan switch shows Free and Member. Free keeps logging, Today, FloraScore, the weekly check-in, History and 7 days of Insights; membership adds why the score moved, 30 and 90 days, every detail page, possible patterns and the food check, Ask Florin and the clinician report. The paywall says what membership adds and "Membership price set at launch", as the studio's membership page does. Teasers blur the person's own counts, never made-up content.
- **Motion:** the ring fills and the score counts up, Insights bars grow and dots land, the mic pulses while listening. All of it off under reduced motion.
- **Data looks** (library/, its own artifact): the same eleven data components drawn in three looks, Rings, Field journal and Bento, from the same numbers, as the start of a component library.

**Next:** pick a look and take it through Insights; Ask Florin's answers; the studio fold-back once the calls above are settled.

## Will's notes (Oct 27) and what they changed

Will, after the Oct 14 build: put the open decisions on the page as toggles instead of separate demos, then build out
what each decision needs. His asks, what was built for each, and the calls that are his. Everything below is in the
prototype at the same link, and in the decisions deck (https://claude.ai/artifact/2h5ikADR2eFCY1DZYbJEJU).

**What was built, ask by ask**

- **Toggles on the left, above the screens.** The page is one live phone in the middle under a slim header. The left
  bar runs Decisions (nine toggles: Consistency, BM logging, Home, History, Weekly check-in, Meal sheet, Data style,
  Version, Onboarding), then Demo (person, logs, meal logs, plan, theme, reset, folded to one line), then Screens. Each
  decision is stored per viewer and has an info button for its note: what it decides, every option, our
  recommendation, what's open and the research. The notes for the screen sit on the right. On a phone the app is full
  screen, with Toggles and Notes as sheets.
- **The 3 demos become a toggle and a slide.** The A, B and C phones side by side are gone. Consistency is one toggle
  (A 1 to 7, B 5 words, C 7 words) that redraws the whole app, and the deck has a Consistency slide that sets the three
  side by side with one demo person's last 30 days in each.
- **Quick BM or full.** BM logging: Quick tiles and form (the tiles on plus; once 5 BMs are logged a tile saves at
  once, with Add details and Undo) or Full form only (one Log a BM row, every BM through the form, no one-tap save).
- **History and home.** Home: Score first (the Forest FloraScore card) or Day first (the date with a small FloraScore
  ring, today's logs with the one that stood out marked, a row to log from, and one sentence on what stood out and
  what that log did to the score). History: List, or a Calendar of the month with each day marked the way Today's week
  card marks it (Plum within the usual, a Gold ring outside it, a gap struck through, a Teal ring for a flag, never
  read) and a tapped day drawn as the list draws it.
- **Check-in with and without.** Weekly check-in On or Off. Off takes it out of the whole app: Today, plus, Insights
  (six cards), History and its report, the paywall's free list, the demo time line, and its screens in the list.
  FloraScore never used it, so nothing else moves.
- **Data style.** Six options: As built and the five library looks (Rings, Field journal, Bento, Oura, Easy read). In
  a look, Insights is that look's cards in order, each opening its detail, and Today's FloraScore and week are its
  score and week cards, all drawn from the phone's live logs, so a BM logged on the phone redraws them. Detail pages
  stay as built, with one new page, Your days.
- **An Oura-like style, from his screenshots.** The Oura look, in the library and on the phone: dark first on a
  Forest atmosphere, FloraScore as an open arc with the usual on its track and the day's one big thing in Lora, the
  parts as shortcut rings and Contributors rows, Vitals-style range tracks, trends with a 30 and 90 day switch, and a
  curved clock for the morning. `reference/oura.md` says what each of his screens does and how it translates under
  Florin's rules (no state words that judge, the person's own usual on every track).
- **An elderly-friendly version.** Version: Standard or Easy, for a 70-year-old with reading glasses, a mild tremor
  and little patience for charts. Type about a third larger, every control 56px or more with its word on it, text in
  Ink, Today as a greeting, one sentence, FloraScore as a big number, three big buttons and this week as day circles;
  plus as labelled buttons; a BM in four short steps; symptoms as big chips; Insights folded into Today as Your weeks,
  in the Easy read look. History and Ask keep their content, bigger.
- **Profile and onboarding, from the shipping survey.** The shipping app's 14-question survey and profile are
  transcribed in `reference/shipping-app/onboarding-and-profile.md`. Onboarding: Short (8 steps, under two minutes,
  only what changes the app on day 1) or the Full survey (the shipping sections in 14 steps, reworded: no scale
  named, goals that say what Florin does rather than promise an outcome, weight left out, and blood or a black stool
  answered with the primary care note on the step). Profile opens from the Today avatar: the person's usual read from
  the model, every onboarding answer (each reopens its step), the BM reminder and check-in day, logging, Larger text
  and simpler screens, connected apps, membership, their data and help.
- **Ask Florin interactive.** A working chat on the person's own logs. Each question goes alarm words first (the Teal
  When to see a clinician answer, never sent anywhere), then a fixed redirect for diagnose, dose or predict, then
  Claude on the viewer's own account through the artifact's sample capability, with a facts packet from the model,
  then a check of the answer (the 22 claims rules, Ask's own rules and a numbers check). A failed check, or no
  Claude, gives the answer computed from the logs. Ask about this brings a card's numbers in, and every answer lists
  the numbers it used.
- **A decisions deck.** 25 slides in Claude Slides: how to use the demo, every decision at a glance, one slide per
  decision, one per data style with Sarah's figures, then the business calls and the list of what we need from Will.
  Its source is `deck/`.

**Making the modules one app (Oct 28)**

The five modules were built in parallel, each in its own files, and checked alone. Together:

- A screen in the list that belongs to a decision now sets it, and it stays: Easy version: Today and log a BM set
  Version to Easy, as Home: Day first, History: Calendar and the onboarding screens already set theirs. Before, Easy
  turned itself back off when the list moved on, so a sweep of the list left the next check on a different version
  than the left bar showed (and the arrow keys left it on).
- Every option of every decision is drawn now, so every note reads On the phone, and no note says anything comes in
  the next pass.
- One alarm net. Ask Florin's wider net had moved into the core check; its own copy is gone, and the two phrasings
  only it heard (worried about my temperature, my temperature is high; up most nights, two nights in a row) are in the
  core, so a log's note hears them too.
- Make a report on the note after a flagged log opens Ask Florin on the clinician path, the sign in the question
  (Member), or the membership sheet (Free). It was a toast saying the chat was still to come.
- The Rings look said "Average null a day" to a screen reader on day 1 (fixed in `library/js/look-rings.js`, one
  line). In the Easy version, the back word on a detail page no longer wraps beside a long title.
- `work/sweep.js` sets every pair of decisions against each other (95 settings), for Sarah, in both themes, with 12
  weeks of logs and Just joined, and opens Today, Insights, FloraScore's detail, History, Ask, plus, Log a BM,
  symptoms, the meal sheet, Profile and onboarding in each: clean on Member, on Free and at 390 wide.

**The third review, in the core (Oct 28)**

Five reviewers read the third pass. What the core changed:

- *Score first's sentence leads with what stood out.* The core now ranks today's logs (`RU.standouts`) the way Day
  first does, and both Home options use it: a flag or an alarm feature first, as the Teal note on the score card that
  names the sign and reads nothing (the score's line says "Not read against your usual today"); then a shift from the
  person's own usual; then symptoms by strength, one without a strength said as "strength not said". With nothing
  notable it keeps the timing sentence. A Watery BM now leads ("Your 7:40 PM BM was Watery, outside your usual forms,
  Formed to Loose."), where it used to say the first BM was in the window.
- *The alarm net hears more.* A BM's own note treats the BM as the stool: "It looked like tar", "almost black", "some
  red in it", "maroon" now open the primary care note, and "after black coffee" or "red pepper soup" don't. Everywhere:
  "lost 4kg", "dropped 10lbs", "really dark, almost black", "like tar", "running a temp", "chills and a temperature"
  and a reading such as 39 degrees or 38.5C. "A temp job", "39 degrees outside" and "not black, normal colour" stay
  quiet.
- *One number for one thing.* This week's FloraScore change is the difference of the two averages as shown (Alex: 84
  and 76, so +8, where Insights said 7). Meal coverage is counted over the days logged in the 90 days, the way the data
  looks count it ("36 of the 85 days you logged", not "34 of your last 80 days"), and the 60% gate uses the same counts.
- *The page.* Read the note sits under the toggles, never over the phone's tab bar. A row picked from Screens always
  shows its note. The arrow keys walk every row once, in order. With Easy on, Home and Data style say "Picked; Easy
  draws its own". A changed decision whose option shows elsewhere offers Show it on the phone. Skip to the phone is the
  first Tab stop, and the header links the deck and the looks library.
- *Craft.* BM tiles keep Formed on one line at 360 wide. Mild symptom squares are 3.4:1 (were 1.5:1). The detail
  charts lost their dashed lines; a day not logged is its struck date. The faintest inks, in the app and on the page,
  clear 4.5:1 in light. These two token changes, and the chart kit's dashes, are for the studio to take back.

**The calls for Will, from every note**

Where our recommendation and a module's note now disagree, both are named.

- *Home.* The deck and the Home note now both recommend Score first, for Will to confirm, and Score first's sentence
  leads on the most notable log, ranked as Day first ranks it (built in the core, Oct 28). On a flag day the score
  keeps its number but isn't read against the usual, on both options: right? Also: should a strong symptom outrank a shift
  in what stands out? Is a small ring by the date enough to tie Florin to the score people know from Oura? Day first
  puts the BM tiles on Today as well as on plus: keep both? Does the day's sentence say enough, or too much?
- *History.* A day with a flag is marked for a clinician and not read against the usual: right, or show both? On
  Free the calendar reads only the last 7 days against the usual: or should History, which is free, read every day?
  Keep a List and Calendar switch on History itself? Start the calendar on today, or on the last day with a log?
- *Data style.* Ours: Oura for Today and the score, Field journal's figures for the detail pages, Easy read for the
  larger-text setting, one style per screen. Mix by surface like that, or one style everywhere? Keep the Oura week's
  tags going onto that week's check-in? Insights in a style shows 30 days without range tabs: enough? On Free, the
  style's cut (the score, the week and the check-in) is less than As built's free plan: keep it, or match? Your days:
  list every day at 30 and 90, or only the shifted ones?
- *Easy version.* A setting in Profile (recommended), or a version of its own? Offer it once in onboarding, or turn
  it on when the phone's own text size is large? Keep the one-tap save in Easy, since a tremor brings mis-taps? Fold
  Insights into Today, or keep a tab? Keep the calendar in Easy (days about 49px wide), or the list? FloraScore on
  Easy's Today at all? "Something feels off" and "What I ate" as the words? Auto-advance after a pick, or a Next
  button? The nearest hour, or minutes? Easy leaves out straining, didn't feel finished, burning, how long and the
  note: enough? Which cards earn a place in Your weeks?
- *Onboarding.* Which questions earn a place on day 1 (the short flow's 8 are the proposal)? Research consent as a
  step, or only in Profile? Age range and sex at all, or only for a clinician report? Is a BM reminder worth a step on
  day 1? What should "what brings you" change on day 1? Ask the rest in context (eating with the first meal, foods to
  watch with the first food check, medicines and conditions with the first report)? Should foods to watch count from
  day 1, or wait for 5 logs? The full survey has no reminder step: add the short flow's? The sign note on onboarding:
  once on the step, or back on Today on day 1? Fever, vomiting that won't stop and weight loss aren't on the survey's
  list (the shipping survey left them out): add them?
- *Profile.* Turn the check-in off here as well as change its day? Logging repeats BM logging and the meal sheet as a
  person's own setting: theirs to pick, or one for everyone? Connected apps for this version (Apple Health first)?
  Export: a file for the person, the clinician report, or both? Offer Larger text again after a few days? On day 1,
  the answers lead Profile until there's a usual: right order? A changed answer (periods, say): offer to change what
  it feeds right there?
- *Ask Florin.* The deck recommends one free answer a week on Free and never locking the clinician question; the
  prototype keeps Ask locked on Free (and Make a report on Free opens the membership sheet), so this is open. Claude
  runs on the viewer's own usage here; the shipping app needs its own model account and a privacy review before any
  log leaves the phone. Show Claude's answer only once checked, at the cost of a pause? Thumbs and memories the person
  can see and delete? Should the card's question go in the box, or wait as a chip? Once the report is built, offer it
  in the clinician answer? An urgent-care number for the person's country, from Profile?
- *Weekly check-in, BM logging, consistency, meals, membership, FloraScore, integrations, messaging.* As on the
  deck's last slide and in each decision's note: ship C once counsel has read it and drop B; Quick tiles with a When
  row in the saved toast (Just now, 30 min ago, 1 hr ago, Earlier), recommended and for Will to confirm, not built; one box and the mic with a free 14-day food check; the check-in on and free; the report and the food check's
  start free, under $10 a month; FloraScore's four parts and weights; integrations now or later; how we describe the
  app before Florin One. The report for a clinician is still a placeholder everywhere it's offered.
