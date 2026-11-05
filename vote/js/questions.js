/* Florin app vote: the questions. One file for the voting page, the results page, vote/tools/aggregate.js and the Apps
   Script's tests (UMD: window.VOTE_Q in a browser, module.exports in node), so every count is made from one list.

   Nineteen questions in two parts, in canonical order (the Sheet, the results and the Slack text use this order, never
   the shuffled order a voter sees). Each question:
     id      the qid on the ballot (home, history, ..., c-score, ..., c-pattern)
     part    1 (the app) or 2 (the charts)
     title   the choice, on the voting page
     label   the short label, for the Slack text, the review and the results
     opts    [{ id, name, line, plain?, style?, sub?, sheet: [what it is, why do it, why not] }]: line is said under the
             option's name (Part 2: that chart's own line); plain is line without {tokens}, for the results page, which
             has no model to fill them; style is a Part 2 style's general line, for Part 2's opening screen
   Part 1's option ids are the prototype's own values for each decision (V.home, V.history, V.bmUI, V.form, V.mealUI,
   V.onboard as they are; checkin on and off map to V.checkin true and false, easy standard and easy to V.easy), and its
   three sentences are the decision sheet's (claude/Florin decisions.md), word for word. Part 2's are the modules page's
   (modules/js/modules.js, MODS[k].opts[style]). A line with {tokens} is filled in the browser from the model (fill):
   {ckN} the check-in's questions, {words5} and {words7} the tile words, {shortN} and {fullN} the onboarding steps.
   Two of the modules page's sentences named Will's own pick ("the week card you picked"); here they name Today's week
   card instead, so nothing on the voting page points to anyone's pick (SHEET_EDITS lists both, and the Easy version's
   "as described in the rest of this sheet", for the drift check).
   Every question also takes No preference (NONE, id "none"). Nothing here names a recommendation: those live in
   vote/results/js/recs.js, which the voting page never loads. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VOTE_Q = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const NONE = { id: "none", name: "No preference" };
  const PARTS = [
    { n: 1, name: "Part 1, the app", short: "The app" },
    { n: 2, name: "Part 2, the charts", short: "The charts" }
  ];
  /* the voter's role: one pick, optional. Other opens a box for the role in a few words */
  const ROLES = [
    ["leadership", "Leadership"], ["marketing", "Marketing"], ["product", "Product"], ["design", "Design"],
    ["engineering", "Engineering"], ["clinical", "Clinical or science"], ["advisor", "Advisor or partner"], ["other", "Other"]
  ];

  /* the settings every picture holds still while a question's own decision varies: the prototype's own defaults (the
     DECISIONS def values in prototype/js/refresh-app.js; Home moved to Compact on Nov 5), with membership on, Sarah, 12
     weeks of logs and meals every day. vote/build.js warns when they drift apart */
  const BASE = { form: "C", bmUI: "quick", home: "compact", history: "calendar", checkin: true, mealUI: "quick", look: "built", easy: false, onboard: "short", plan: "member", persona: "sarah", data: "est", meals: "all" };

  /* ============ Part 2's styles: the same six on every chart ============ */
  /* each style's general line, said once on Part 2's opening screen; on a chart, each option has that chart's own line
     (LINES below), since a style draws each chart its own way */
  const STYLES = [
    { id: "built", name: "Florin charts", line: "Bands, dots and bars, with the answer in words first." },
    { id: "rings", name: "Rings", line: "Rings and dials: the score as a ring, and a ring for each day." },
    { id: "journal", name: "Field journal", line: "The numbers written out, with plain captioned charts." },
    { id: "bento", name: "Bento", line: "Tiles of different sizes, one number each." },
    { id: "oura", name: "Oura", line: "Oura's layout: a dark score gauge, then tracks, sliders and bars." },
    { id: "easy", name: "Easy read", line: "One big number and one sentence, in large type.", sub: "Made for the Easy version" }
  ];
  /* the month's seventh: Florin charts' calendar with each day drawn as the week's ring (the modules page's RING). Its
     Why not says no screen draws it yet; no tag marks it apart from the others */
  const CAL_RING = { id: "cal-ring", name: "Florin charts, with the week's ring", line: "The same calendar, with each logged day drawn as the week's ring." };
  /* each chart's line per style: what that card shows, in a few words from its What it is (MOD below). The week's
     Florin charts card is the filled-circle week Today no longer shows, and its line says so, so a vote for it isn't
     read as a vote for Today's week card */
  const LINES = {
    score: { built: "The dark green card: the number, and today's dot on a bar of your usual range.", rings: "The number inside a ring that fills toward 100.", journal: "A sentence first, then the number beside an open dial of your usual range.", bento: "A glass widget: the score in a ring, a change chip, tiles and a sparkline.", oura: "A dark card with a round gauge and four part rings.", easy: "The number big and one sentence with your usual range." },
    trend: { built: "A line over your usual range as a band, today's point ringed.", rings: "The count of days in its usual range, then the line on the band.", journal: "A sentence with the count, then the days on the band, labelled.", bento: "The line, with a longer sparkline and an average tile under it.", oura: "A line with a switch for the range, and the zones named at the edge.", easy: "The count of days in its usual range big, then three thick bars." },
    parts: { built: "Four rows, one per part, each a bar of points from a centre line.", rings: "Four nested rings for the parts, and a bar per part.", journal: "A dot for last week and one for this week on each part's row.", bento: "A big tile for the part that moved most, smaller tiles for the rest.", oura: "A row per part, each against that part's own usual range.", easy: "The change big, a sentence, and a thick bar of points per part." },
    week: { built: "Filled day circles and a line for each day outside your usual. Today no longer shows this card.", rings: "The count big, then a ring for each day with its FloraScore under it.", journal: "A sentence, a row of day marks, then a row of dots per measure.", bento: "A pill a day with a dot per BM, and tiles for today.", oura: "A sentence for each day outside your usual, then a bar a day for BMs.", easy: "The count big, filled day circles, and a line for each day outside your usual." },
    month: { built: "A month of filled day circles you can tap, with symptom squares.", rings: "A grid of day rings, with the count of days within your usual.", journal: "A sentence with the count, a grid of day marks, and a count per week.", bento: "A grid of rounded squares, three count tiles and the longest run.", oura: "A bar a day for the BMs logged, coloured by the day.", easy: "The count big, a grid of filled day circles, and a line for each kind of day." },
    timing: { built: "A dot for each day's first BM on a straight time axis, your window as a band.", rings: "A curved dial of the morning, with your window on its rim.", journal: "A sentence with the count, then one dot a day on a time axis.", bento: "The dots by time, a ring of mornings in your window, and today's time.", oura: "A curved strip of the morning, with a tick for each first BM.", easy: "Today's time big, a bar with your window, and the count in a sentence." },
    often: { built: "One dot a day on a count line from zero, your usual count as a band.", rings: "A ring of lanes, one per day, with the average in the middle.", journal: "A sentence with the count and the average, then one dot a day.", bento: "A square per BM stacked by day, with an average tile.", oura: "Tracks for BMs today, this week and this month, against your usual count.", easy: "The count big, then a thick bar of days for each count." },
    form: { built: "A bar per form with its count, your usual forms bracketed.", rings: "A ring per form, filled to its share of all BMs.", journal: "A row per form with a dot for every BM.", bento: "Chips for firmer and looser, a ring, bars by form, and today's form.", oura: "Today's form on a track of the forms, then bars of shares.", easy: "The count big, then a thick bar per form, each said in words." },
    symptoms: { built: "A row per symptom with a Teal square on each day it came up.", rings: "A ring per symptom for its share of days, and dots sized by strength.", journal: "A sentence against your usual, then ticks whose height is the strength.", bento: "A strip of cells per symptom, and tiles for how often and the strongest.", oura: "A row per symptom with a thin bar of its days and its strength in words.", easy: "The count big, then a thick bar of days per symptom." },
    checkin: { built: "Each question with this week's answer and one chip.", rings: "The answers counted, a gauge per question, and a strip of past weeks.", journal: "A sentence, then a line per question over the weeks.", bento: "Each question's answers as a ladder, with this week's highlighted.", oura: "The answers counted, then a slider per question.", easy: "The answers counted big, then each answer said in words." },
    pattern: { built: "Each pattern listed with how sure it is and how many times out of how many.", rings: "Two rings of segments, one per time, filled when the change followed.", journal: "A sentence, then a dot for every time in two rows.", bento: "The pattern in a sentence, two bars, and a tile for how sure.", oura: "How sure as a slider, and two bars of how often it followed.", easy: "The count big, two thick bars, and how sure in words." }
  };

  const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"];
  const word = (n) => NUM[n] || String(n);

  /* the modules page's three sentences per style, for each chart (MODS[k].opts). The week's Rings entry reads the card
     it describes, as there: weekRings(cardHtml, blend) */
  const weekRings = (fig, blend) => [
    `The count big, one sentence naming the days outside your usual, and seven day rings with each day's FloraScore under it${/rg-wd-add/.test(fig || "") ? ", Add under a day with nothing logged," : ""} and today's column shaded.`,
    "The answer comes first and the week reads at a glance, with each day's score in reach.",
    `It names the days outside your usual but not what was different, and each number is FloraScore, which blends ${word(blend || 3)} days, so a day outside your usual can show a score inside its usual range.`
  ];
  const MOD = {
    score: {
      built: ["The dark green card with the number, your usual range as a band on a bar with today's dot on it, and one sentence on what stood out today.", "The bar shows how far today sits from its usual range without a gauge that fills toward 100.", "It's the plainest of the six, and on Today it sits above the Rings week, so one screen mixes a bar and rings."],
      rings: ["The number inside a ring that fills toward 100, with your usual range on an outer track.", "A ring reads at a glance and would match the rings on Today's week card.", "A ring filling toward 100 reads as a grade, and its end dot turns Gold outside the range, though Gold is kept for a day outside your usual."],
      journal: ["A sentence first, then the number \"out of 100\" beside an open dial of your usual range, with this week's and last week's averages under it.", "It says the answer in words before any figure.", "It puts two weekly averages beside today's number, and the two can point different ways."],
      bento: ["A glass widget with the score in a ring, a chip for the change on last week, a week average tile and a 7-day sparkline.", "Each tile is one fact you can take in at a glance, like a phone widget.", "The ring, the average and the sparkline say the score three ways, the sparkline marks FloraScore in Gold, and the glass isn't one of the app's colours."],
      oura: ["A dark card with a round gauge, four part rings with no numbers, and a headline about this morning.", "It's the layout Oura users already know.", "The four part rings carry no numbers and all look full, the gauge's dot turns Gold, and it turns the phone dark."],
      easy: ["The number big and one sentence with your usual range.", "Nothing to decode, at a size anyone can read.", "There's no picture of where today sits against its range."]
    },
    trend: {
      built: ["A line over your usual range as a band, today's point ringed and labelled, with today's number and the part that moved it most in words above it.", "One card says how today sits and how the range went, and Ask Florin draws the same line.", "The card leads with today's number, so \"in its usual range on so many days\" waits for FloraScore's page."],
      rings: ["The count of days in its usual range, then the line on the band with the points outside it marked.", "The count answers the question before the chart.", "Points outside the range are Gold, the colour for a day outside your usual, though FloraScore isn't a day."],
      journal: ["A sentence with the count, then the days on the band with Above, Below and the lowest day labelled on the chart.", "Labels on the chart replace the legend, and the count comes first in words.", "Its labels sit in small capitals at the chart's edge, the hardest text on the card to read."],
      bento: ["The 30-day line, with a 90-day sparkline and an average tile under it.", "Two spans at once, without switching ranges.", "The average tile repeats the line, and points outside the range are Gold."],
      oura: ["A line with a 30 or 90 day switch, Gold where it leaves the range, and the zones named at the right edge.", "The switch and the zone names make the range easy to read, as in Oura.", "The Gold stretches make FloraScore look like a day outside your usual."],
      easy: ["The count of days in its usual range big, then three thick bars: in range, above, below.", "One number and three plain bars answer it.", "It drops the line, so you can't see when in the month the score moved."]
    },
    parts: {
      built: ["Four rows, one per part, each a bar from a centre line in whole points, with words such as \"Timing added 2 points\" and \"How often didn't move\".", "The rows add up to the change shown, and a tie names both parts.", "On Insights it is one sentence; the rows wait on FloraScore's page."],
      rings: ["Four nested rings for the parts out of 100, the move in points beside them, and a bar per part from zero.", "The rings echo the score's own ring.", "The nested rings carry no labels, its big number is the part that moved most rather than FloraScore's whole change, and when two parts tie it names only one."],
      journal: ["A dot for last week and one for this week on each part's row, with the points moved at the end.", "You see where each part was and where it went, on one scale.", "Each row shows the part out of 100, a second scale beside the points it moved."],
      bento: ["A big tile for the part that moved most, with its value in a ring, and a smaller tile for each other part.", "The part that moved most is the biggest tile.", "When two parts tie it names only one, and each tile shows the part out of 100 beside the points it added."],
      oura: ["A row per part with that part's own usual range as a band, last week and this week marked, and the points it added.", "Each part is read against its own usual, so you see whether it sat within it.", "When two parts tie it names only one, and each row adds a third number, the part out of 100."],
      easy: ["The change big, a sentence naming the parts that moved it, and a thick bar of points per part.", "Plain words and one bar a part, in points only.", "Sized for the Easy version, its four bars take a whole screen."]
    },
    week: {
      built: ["One count, a row of filled day circles ending on today, and a line for each day that wasn't within your usual, saying what was different.", "Each reason is written out, and its circle is the one History's calendar draws.", "It's the longest of the week cards, and it puts no FloraScore under the days."],
      rings: weekRings,
      journal: ["A sentence with the count and the days outside, a row of day marks, then a row of dots per measure under each day, with its FloraScore.", "It shows which measure put each day outside your usual.", "Five rows of small dots make it the week with the most to read."],
      bento: ["Seven pills with a dot per BM inside, tinted by the day's state, and tiles for today's first BM and the BMs this week.", "With Oura's, the only weeks that show how many BMs each day had.", "Days outside your usual are filled Gold while usual days stay pale, so the different days shout, and the tiles repeat today's logs."],
      oura: ["A sentence for each day outside your usual, then a bar a day for the BMs logged against your usual count, coloured by the day's state, and a card asking what was different.", "It asks about a different day with the check-in's tags, as Oura asks about a night.", "A bar's height is the BM count and its colour is the day, so a Gold bar of usual height needs the sentence to explain it."],
      easy: ["The count big, a row of filled day circles, and a line for each day outside your usual.", "The reasons are written out at a size anyone can read.", "Its type is sized for the Easy version, larger than the rest of the standard app."]
    },
    month: {
      built: ["A month of filled day circles, each a button that opens that day's logs, with a Teal square under days with symptoms and a line counting the month.", "It's the one calendar you can tap, and it marks symptoms on the day they came.", "Its filled circles differ from the rings on Today's week card, so the same day looks two ways."],
      "cal-ring": ["Florin charts' calendar with each logged day drawn as the week's ring; a day with nothing logged stays the date alone, and a day noted for a clinician keeps its Teal ring.", "A day looks as it does on Today's week card, and the calendar keeps its taps, its symptom squares and its line counting the month.", "No screen draws it yet, so it is new work, and a ring at the calendar's size is smaller than the week's."],
      rings: ["The last 30 days as a grid of day rings, with the count of days within your usual above it.", "Each day looks as it does on Today's week card.", "Alone it has no symptom marks and no taps, a ring a day gets small over 30 days, and a day with nothing logged is a thin circle rather than the date alone."],
      journal: ["A sentence with the count, a grid of filled day marks, and a column counting each week's days within your usual.", "The weekly counts show which weeks went differently.", "The week column repeats in numbers what the grid already shows."],
      bento: ["A grid of rounded squares, three count tiles, and the longest run of days within your usual.", "The tiles give the three counts at a glance.", "Days outside your usual are filled and usual days pale, and a longest run reads like a streak to keep up."],
      oura: ["A bar a day for the BMs logged, coloured by the day's state.", "It shows each day's count and state in one strip.", "No BM is drawn as a short bar, so a day with no BM looks like a day with some."],
      easy: ["The count big, a grid of filled day circles with symptom squares, and a line each for the days outside your usual, the days with nothing logged and symptoms.", "It's the plainest month, with its lines as the legend.", "Its type and circles are sized for the Easy version."]
    },
    timing: {
      built: ["A dot for each day's first BM on a straight time axis, your window as a band, Gold for one outside it, today labelled.", "A straight axis and a named window answer the question at a glance.", "The dots stack by time, so which day was late waits for its own page."],
      rings: ["A curved dial of the morning with your window on its rim, each first BM a dot, and the count in the middle.", "It looks like a clock, which suits a time of day.", "A curved time axis is harder to read than a straight one, and the dots crowd into the narrow window."],
      journal: ["A sentence with the count, then one dot a day across the month on a time axis, with Earlier and Later labelled at the edge.", "You see which days were late and when in the month.", "Time runs down the axis, so a later BM sits lower, which is easy to misread."],
      bento: ["The same dots by time, a ring of mornings in the window, and a tile with today's time.", "Today's time is the biggest number on the card.", "The ring repeats the count the dots already show."],
      oura: ["A curved strip of the morning with a tick for each first BM and a marker for today, then the count, your window and today in a row.", "Today leads, said in a sentence.", "The curved strip runs off the card on a small phone, and its ticks are too thin to count."],
      easy: ["Today's time big, a bar with your window and today's dot, and the month's count in a sentence.", "It answers for today first, in large type.", "The month is only a count, with no picture of the other days."]
    },
    often: {
      built: ["One dot a day on a count line from zero, your usual count as a band, and No BM as a dot on zero.", "Each day is its own dot, so a day with more or fewer stands out where it fell.", "With most days at one or two, the dots sit in two long rows."],
      rings: ["A ring of lanes, one per day, with the average a day in the middle.", "It fits 30 days in a small circle.", "A count read around a circle is hard to follow, the centre shows a decimal average nobody logged, and No BM is a ring."],
      journal: ["A sentence with the count and the average a day, then one dot a day on a count axis, with More and Fewer labelled.", "The labels name the days outside your usual count on the chart itself.", "It adds a decimal average to the answer, a number nobody logged."],
      bento: ["A square per BM stacked by day, an average tile, and a bar of the days by count.", "You can see every BM.", "The tile and the bar repeat the stack, and No BM is a ring."],
      oura: ["Tracks for BMs today, this week and the last 30 days, each against your usual count.", "Today leads, then the averages, as Oura's vitals do.", "The averages are decimals, so a week reads as so many point something a day."],
      easy: ["The count big, then a thick bar of days for No BM, one, two, and three or more, each marked usual or not.", "One bar per count answers \"how many times\" with nothing to decode.", "It loses when in the month the days outside your usual came."]
    },
    form: {
      built: ["A bar per form with its count on top, your usual forms bracketed, and Gold bars for forms outside them.", "The counts add up to the BMs, in the words the person logs with.", "It shows the month's mix, so when a form outside your usual came waits for its own page."],
      rings: ["A ring per form, the count inside and the ring filled to its share of all BMs.", "Seven small rings line up with the seven words.", "Each ring says its count twice, as a number and a share, and small shares are hard to see."],
      journal: ["A row per form with a dot for every BM, your usual rows shaded, and the forms outside your usual named beside the others.", "You can count every BM, and today's is ringed.", "With dozens of BMs in a month, the rows of dots run long."],
      bento: ["Chips for firmer and looser, a ring of BMs within your usual forms, the bars by form, and a tile for today's form.", "Today's form and the month sit on one card.", "The ring repeats the bars beside it."],
      oura: ["Today's form on a seven-step track, then bars for the share of BMs in your usual forms this week, this month and in your usual.", "Today reads first, then the week against the month.", "The bars give shares, not forms, so firmer and looser are only in the sentence."],
      easy: ["The count big, then a thick bar per form logged with its count and a chip saying firmer, usual or looser.", "Each form says in words how it sits against your usual.", "It lists only the forms logged, so the scale from firmer to looser isn't shown whole."]
    },
    symptoms: {
      built: ["A row per symptom with a Teal square on each day it came up, and an Any symptom row with your usual written at its end.", "It shows which days, in Teal, the app's colour for symptoms, with strength said in words.", "Small squares over 30 days take a careful look to count."],
      rings: ["A ring per symptom for its share of days, and a strip of dots sized by strength.", "The most common symptom leads.", "Strength is shown by dot size, and the marks aren't Teal, the colour symptoms have everywhere else."],
      journal: ["A sentence comparing the days with your usual, then rows of ticks whose height is the strength.", "The sentence says how this month compares with your usual.", "Strength is shown by tick height, and the marks aren't Teal."],
      bento: ["A strip of cells per symptom, tiles for how often and the strongest, and the note on when to see a clinician.", "The strongest symptom gets its own tile.", "Most cells are empty, so the strips are hard to read, and the marks aren't Teal."],
      oura: ["A row per symptom with a thin bar of its days and its strength in words.", "It's the plainest list, with strength in words.", "It doesn't show which days, so days in a row look the same as days apart."],
      easy: ["The count big, then a thick bar of days per symptom with its strength in words.", "The most common symptom leads, in large type.", "It doesn't show which days, and its bars aren't Teal."]
    },
    checkin: {
      built: ["Each question with this week's answer and one chip, \"About the same\" or more or fewer days than at first.", "One answer a question, with no score and no total.", "The trend over the weeks waits for its own page."],
      rings: ["The answers counted, a gauge per question, and a strip of the last 12 weeks.", "Each gauge shows the latest answer against your first weeks.", "It adds the answers into a total, which the check-in never does, and a gauge reads like a score."],
      journal: ["A sentence, then a line per question over the weeks on your first weeks' band, the latest ringed.", "You see each answer week by week against your first weeks.", "Four small charts make it the busiest check-in card."],
      bento: ["For each question, the answers as a ladder with the latest highlighted and your first weeks marked.", "Every possible answer is shown, so you see where this week's sits.", "It shows the latest week only, and the four ladders fill the card."],
      oura: ["The answers counted, then a slider per question with your first weeks as a band.", "The sliders are quick to scan.", "It adds the answers into a total, which the check-in never does."],
      easy: ["The answers counted big, then each question with its answer, a chip, and your first weeks in words.", "Every answer and its range are said in words.", "It leads with a total of answers."]
    },
    pattern: {
      built: ["Each pattern listed with how sure it is and how many times out of how many; on its page, two bars, how often the change followed and how often on other days.", "The bars are shares of each group, so a small group and a large one compare fairly.", "The Insights card is a list, so the comparison waits for the pattern's page."],
      rings: ["Two rings of segments, one segment per time, filled when the change followed.", "You can count each time.", "With dozens of times a ring of segments looks broken into dashes, and two rings are hard to compare by eye."],
      journal: ["A sentence, then a dot for every time in two rows, filled when the change followed.", "Every time is counted out.", "Rows of dozens of dots make the shares hard to compare."],
      bento: ["The pattern in a sentence, two bars of how often it followed, and a tile with three bars for how sure.", "The bars compare the two groups at once.", "How sure is a bar icon that reads like signal strength, and the card shows one pattern at a time."],
      oura: ["How sure as a slider from early signal to consistent, and two bars of how often it followed.", "How sure is a position on one scale.", "It shows one pattern at a time, with the others a tap away."],
      easy: ["The count big, two thick bars, and how sure in words.", "The plainest pattern, said in words.", "A big count can look more certain than \"consistent\" means."]
    }
  };

  /* ============ the questions, in canonical order ============ */
  const P1 = [
    {
      id: "home", title: "Pick your preferred flow for the home screen", label: "Home screen", decision: "home",
      lede: "Today, the screen the app opens on.",
      opts: [
        { id: "score", name: "Score first", line: "Opens on the FloraScore card, then today's logs and the week.", sheet: ["Today opens on the FloraScore card, with the person's usual range and one sentence on what stood out today, then today's logs and the last 7 days.", "One number for the day, read against the person's own usual, is the quickest thing to check.", "There's no score before day 14, and on a rough evening a score inside the usual range can read as if nothing happened."] },
        { id: "day", name: "Day first", line: "Opens on the date and today's logs, with FloraScore in a small chip.", sheet: ["Today opens on the date and today's logs in time order, with the one that stood out marked, and FloraScore as a small chip at the top.", "It suits people who open the app to log, and it looks the same from day 1, before Florin has a score.", "FloraScore, the number at the centre of Florin, is easy to miss."] },
        { id: "compact", name: "Compact", line: "A short FloraScore strip, a row of days, then the day picked.", sheet: ["Today opens on a short FloraScore strip, then this week as a row of days to tap or swipe through, then the day picked, today first, with Add and its logs one line each.", "It's built for getting around, as the current app's home is: the week is in view, and any day, with its logs and a way to add to it, is one tap away.", "No sentence says what stood out today or how the week went, so a day outside the usual shows only as a Gold ring until the person taps it."] }
      ]
    },
    {
      id: "history", title: "Pick how History shows past days", label: "History", decision: "history",
      lede: "History, where people look back over past days and fill in one they missed.",
      opts: [
        { id: "list", name: "List", line: "Every day, newest first, with its logs.", sheet: ["Every day, newest first, each opening with its day mark and one line on how it sat against the usual, then its logs; a day with nothing logged is a gap with Add to this day.", "Every log is right there to read, and filling in a missed day takes one tap.", "After a few months it's a long scroll, so finding a month's gaps and days outside the usual takes many screens."] },
        { id: "calendar", name: "Calendar", line: "A month on one screen; tap a day for its logs.", sheet: ["A month on one screen: a Plum circle for a day within the person's usual, a Gold circle for a day outside it, and the date alone for a day with nothing logged.", "A whole month fits on one screen, so gaps and days outside the usual show at a glance.", "Seeing a day's logs takes a tap, and a month of circles says less than the list about what each day held."] }
      ]
    },
    {
      id: "bm", title: "Pick how logging a BM works", label: "Logging a BM", decision: "bmUI",
      lede: "Logging a BM, from the plus button at the foot of every screen.",
      opts: [
        { id: "quick", name: "Quick tiles and form", line: "Tap plus, then a tile, and the BM is saved.", sheet: ["Tap plus, then a tile, and the BM is saved, with a message that offers Add details and Undo.", "A usual BM takes two taps, so logging every day stays easy.", "A BM logged an hour late gets the wrong time, and details like urgency get skipped."] },
        { id: "full", name: "Full form only", line: "Every BM goes through the form before it's saved.", sheet: ["The plus menu has one Log a BM row, and every BM goes through the form: when, consistency, details and a note.", "Every BM shows its time before saving, with room for details.", "It takes more taps every time, and people who find logging slow log less."] }
      ]
    },
    {
      id: "words", title: "Pick the words for a BM's consistency", label: "Consistency words", decision: "form",
      lede: "The words on the BM tiles, and how Insights names each BM back. With numbers, the short words under them are stand-ins for now.",
      opts: [
        { id: "A", name: "Numbers 1 to 7", line: "Seven tiles, each a number with a short word.", sheet: ["Seven tiles, each a number from 1 to 7 with a short word, from the scale clinicians use.", "Clinicians and other gut apps use these numbers, so a log reads straight across at a visit.", "The Rome Foundation licenses the scale, so we need a licence and must use its exact wording."] },
        { id: "B", name: "Five words", line: "{words5}.", plain: "The five words the current app uses.", sheet: ["The five words the current app uses, as tiles: Hard, Firm, Formed, Loose and Watery.", "People who use the current app already know them, and they need no licence.", "Hard and Loose each cover two kinds of stool, so Florin can't always tell when a BM has shifted from the person's usual."] },
        { id: "C", name: "Seven words", line: "Seven words of our own, with no numbers.", sheet: ["Seven tiles in our own words, with no numbers: Pellets, Hard, Firm, Formed, Soft, Loose and Watery.", "All seven kinds in plain words, each with a number from 1 to 7 behind it that a clinician report can show once we have a licence.", "Counsel must clear the words first, since they follow the licensed scale's seven kinds, and people who use the current app learn two new words."] }
      ]
    },
    {
      id: "checkin", title: "Pick whether the app has a weekly check-in", label: "Weekly check-in", decision: "checkin",
      lede: "A weekly check-in: a few one-tap questions about how the past week felt, in our own words.",
      opts: [
        { id: "on", v: true, name: "With the check-in", line: "{ckN} one-tap questions a week about how it felt.", plain: "A few one-tap questions a week about how it felt.", sheet: ["The check-in on Today when it's due, an item in the plus menu every week, and its trend on Insights.", "It's the one place Florin asks how the week felt, not just what happened, and it gives people a reason to come back each week.", "It's one more task a week, and in a steady week the answers add little that the logs didn't show."] },
        { id: "off", v: false, name: "Without it", line: "No check-in anywhere in the app.", sheet: ["No check-in anywhere: nothing on Today, no plus item, no Insights card and no reminder.", "The app asks less of people, and the week's logs already show what happened.", "Nothing asks how the week felt, so a hard week shows only as logs."] }
      ]
    },
    {
      id: "meals", title: "Pick how people log what they ate", label: "Logging meals", decision: "mealUI",
      lede: "The sheet for logging what someone ate, from the plus button.",
      opts: [
        { id: "quick", name: "Quick, voice or text", line: "One box for the whole day: say it or type it.", sheet: ["One big microphone button and one box for the whole day: say or type what you ate, and Florin picks out the foods.", "It's the least effort, so logging meals on ordinary days, not only on days with symptoms, stays easy.", "The day has no meal times, so Florin can't look at what tends to follow a late dinner."] },
        { id: "detailed", name: "One meal at a time", line: "Pick the meal, type what you had, set the time.", sheet: ["Pick Breakfast, Lunch, Dinner or Other, type what you had, and set the time.", "Each meal keeps its time, so Florin can look at what tends to follow a late dinner.", "It's more steps for every meal, so people log fewer of them."] }
      ]
    },
    {
      id: "easy", title: "Pick whether the app offers an easier version", label: "Easy version", decision: "easy",
      lede: "An easier version of the whole app, with larger text and simpler screens, that anyone can turn on.",
      opts: [
        /* the sheet's "as described in the rest of this sheet" reads as the other questions here (SHEET_EDITS) */
        { id: "standard", v: false, name: "Standard only", line: "One set of screens for everyone.", sheet: ["The app as the other questions show it: the FloraScore card, the week, charts and the full Insights tab.", "It shows the most, for people who want the detail.", "Small type and many cards and charts are hard with reading glasses or a shaky hand."] },
        { id: "easy", v: true, name: "Add Easy", line: "Also offer larger text and simpler screens.", sheet: ["Larger text and big labelled buttons: one sentence and FloraScore as a big number on Today, three buttons to log from, and a BM in four short steps.", "Older people, or anyone who wants less on screen, get the same logs and numbers, said more simply.", "It's a second set of screens to design, test and clear with counsel, and it shows less of the data."] }
      ]
    },
    {
      id: "onboard", title: "Pick how much a new person is asked", label: "Onboarding", decision: "onboard",
      lede: "The set-up steps a new person goes through before they first see Today.",
      opts: [
        { id: "short", name: "Short", line: "{shortN} steps, only what changes the app on day 1.", plain: "Only what changes the app on day 1.", sheet: ["8 steps in under two minutes: welcome, first name, what brings you, what you'd like Florin to do, periods, reminders, what Florin is and isn't, and ready.", "It asks only what changes the app on day 1, so people start logging sooner.", "Florin knows less at the start, and the rest (eating, foods to watch, medicines) has to be asked later."] },
        { id: "full", name: "Full survey", line: "The current app's survey, reworded, in {fullN} steps.", plain: "The current app's survey, reworded.", sheet: ["The current app's survey in 14 steps, about three minutes, reworded in Florin's voice, with a note to talk to their primary care doctor if someone picks blood or a black stool.", "Florin knows the most from day 1, and it stays close to the current app.", "Most answers change nothing the person sees on day 1, and 14 steps is long."] }
      ]
    }
  ];
  /* Part 2: one question per data module on the modules page, in its order (History's days is Part 1's History) */
  const P2 = [
    ["score", "FloraScore today", "Pick a style for FloraScore today", "How is FloraScore today against its usual range?"],
    ["trend", "FloraScore over time", "Pick a style for FloraScore over time", "Has FloraScore stayed in its usual range?"],
    ["parts", "What moved FloraScore", "Pick a style for what moved FloraScore", "Which part moved my score this week?"],
    ["week", "The last 7 days", "Pick a style for the last 7 days", "How many of my last 7 days sat within my usual, and which didn't?"],
    ["month", "The month", "Pick a style for the month", "How did each day this month sit against my usual?"],
    ["timing", "Timing", "Pick a style for timing", "Did my first BM come in my usual window?"],
    ["often", "How often", "Pick a style for how often", "Did I go my usual number of times?"],
    ["form", "Consistency", "Pick a style for consistency", "Were my BMs my usual forms?"],
    ["symptoms", "Symptoms", "Pick a style for symptoms", "How often did symptoms come up?"],
    ["checkin", "Check-in results", "Pick a style for check-in results", "Are my answers like my first weeks?"],
    ["pattern", "Possible patterns", "Pick a style for possible patterns", "Does something tend to come before a change?"]
  ].map(([mod, label, title, sub]) => ({
    id: `c-${mod}`, mod, title, label, sub,
    opts: (mod === "month" ? [STYLES[0], CAL_RING].concat(STYLES.slice(1)) : STYLES).map((s) => Object.assign({}, s, { style: s.line, line: (LINES[mod] && LINES[mod][s.id]) || s.line, sheet: MOD[mod][s.id] }))
  }));

  /* where the words here differ from their source on purpose: [qid, option, sentence index, the source's words] */
  const SHEET_EDITS = [
    ["easy", "standard", 0, "The app as described in the rest of this sheet: the FloraScore card, the week, charts and the full Insights tab."],
    ["c-score", "rings", 1, "A ring reads at a glance and would match the rings on the week card you picked."],
    ["c-month", "rings", 1, "Each day looks as it does on the week card you picked."]
  ];

  const QS = P1.map((q) => Object.assign({ part: 1 }, q)).concat(P2.map((q) => Object.assign({ part: 2 }, q)));
  QS.forEach((q, i) => { q.n = i + 1; });
  const byId = {};
  QS.forEach((q) => { byId[q.id] = q; });
  const qOf = (id) => byId[id] || null;
  const optOf = (q, p) => {
    const Q = typeof q === "string" ? byId[q] : q;
    if (!Q) return null;
    if (p === NONE.id) return NONE;
    return Q.opts.find((o) => o.id === p) || null;
  };
  const optName = (q, p) => { const o = optOf(q, p); return o ? o.name : null; };
  const roleName = (id, other) => (id === "other" ? (String(other || "").trim() || "Other") : ((ROLES.find((r) => r[0] === id) || [])[1] || ""));
  const inPart = (n) => QS.filter((q) => q.part === n);

  /* the time it takes, said on the start screen as a range: from 35 seconds a question in Part 1 and 25 in Part 2 (a
     quick look at each option) to 50 and 45 (a look at every option and a note now and then), plus a minute for the
     start and the review, each end rounded to 5 minutes. [low, high] */
  const SECS = { lo: { 1: 35, 2: 25 }, hi: { 1: 50, 2: 45 }, extra: 60 };
  const minutes = () => ["lo", "hi"].map((k) => {
    const s = QS.reduce((t, q) => t + SECS[k][q.part], 0) + SECS.extra;
    return Math.max(5, Math.round(s / 60 / 5) * 5);
  });

  /* a line's {tokens}, from what the page computed from the model; a token with no value stays as it is */
  const fill = (s, ctx) => String(s || "").replace(/\{(\w+)\}/g, (m, k) => (ctx && ctx[k] != null ? String(ctx[k]) : m));
  /* an option's three sentences (the week's Rings reads its card) */
  const sheetOf = (o, ctx) => (typeof o.sheet === "function" ? o.sheet((ctx && ctx.fig) || "", ctx && ctx.blend) : o.sheet);

  return { v: 1, SHEET_EDITS, NONE, PARTS, ROLES, BASE, STYLES, CAL_RING, QS, byId, qOf, optOf, optName, roleName, inPart, minutes, fill, sheetOf, word, NUM };
});
