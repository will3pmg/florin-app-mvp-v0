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

**Next:** Ask Florin's answers, and the studio fold-back once the calls above are settled.
