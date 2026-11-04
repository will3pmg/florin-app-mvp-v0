/* Florin data, module by module (modules/): the page Will decides on, chart by chart, how Florin draws its data and
   where each chart lives. Will asked "We need to go data vis module by module and decide how to organize", and on Nov 4
   picked the Rings style's week card ("much better on the week card, i like this").
     Our answer          what we recommend overall, and what it replaces (one style everywhere, decision 7)
     The summary         each module's question, our pick and where it lives, Will's pick so far, and the Insights order;
                         each row a link to its module. Take ours for every module not picked yet
     Twelve modules      the question, where it lives now and the stretch every card counts, We recommend, then the
                         styles drawn live (Florin charts, Rings, Field journal, Bento, Oura, Easy read, always in that
                         order; The month and History's days add Florin charts with the week's ring, drawn here from
                         the two), each with What it is, Why do it and Why not, Recommended and In the app now; then
                         Will's pick: a style, the places that module can live, a note
     Your days           Insights' first card as we recommend it, drawn at 7 days beside the card there now
     Order of Insights   the cards Will keeps on Insights, in his order, with Up and Down; Today's order; One look for a
                         day, everywhere
   Layout: from 1280px wide every style of a module is in view at once (the cards drawn smaller; Full size puts them
   back at a phone's width, in a row that scrolls sideways, as between 820 and 1279); under 820 a module shows one style
   at a time, picked with tabs named by style, the recommended one open. A redraw (another person, the logs, the theme,
   the size) keeps the module in view and each row where it was.
   Every card is drawn live from the prototype's own model (L.build) for the person picked, and the five other styles
   from the data looks' one data object (FLD.build over that same model), so every figure is computed, never typed.
   Nothing under prototype/ or library/ is changed: the page loads their files read only. A drawn card is a picture:
   its buttons are disabled with role none, its tab stops and count-ups gone, its ids made unique.
   Saving: claude.use("db"), one document per module at picks/<module>, the Insights order at picks/_order and the
   page note at picks/_page; the page declares writes for its owner and Editors only, so everyone else reads the picks
   saved, with who saved each (user.profiles, names never stored). Without db
   (a local file, not granted, or no answer in 10 seconds) the picks stay in this browser, and Copy my picks gives a
   plain summary to send. The first paint never waits on db. window.FLMOD */
(function () {
  const mount = document.getElementById("dm");
  if (!mount) return;
  const FL = window.FL, L = window.FLORIN_LOGS, RU = window.FLORIN_RUI, AD = window.FLORIN_APP, FLD = window.FLD;
  if (!FL || !L || !RU || !AD || !FLD || !RU.scoreHero || !RU.insights || !RU.idetail || !RU.weekCard || !RU.historyDay || !RU.history) {
    mount.innerHTML = `<p class="dm-err">The prototype's files didn't load, so the modules can't be drawn. Open the page from its own folder, with the prototype and the library beside it.</p>`;
    return;
  }
  const esc = FL.esc, Ut = AD.util, T = Ut.fmtTime;
  const n1 = (v) => Math.round(v * 10) / 10;
  const lin = (window.FLC && window.FLC.lin) || ((d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1));
  /* the looks' shared helpers, as the library page sets them; a still page never counts up */
  if (!window.FLL) window.FLL = { esc, T, n1, lin, C: window.FLC, countUp() {}, reduced: () => true };
  const MODE = "C";
  const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const word = (n) => NUM[n] || String(n);
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const andJoin = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  /* dates, from the model's day numbers: "Oct 11", and a stretch, "Oct 5 to 11" or "Sep 12 to Oct 11" */
  const dOf = (d) => L.dateOf(d);
  const fmtD = (d) => { const x = dOf(d); return `${Ut.MON[x.getMonth()]} ${x.getDate()}`; };
  const span2 = (a, b) => { if (a === b) return fmtD(a); const x = dOf(a), y = dOf(b); return x.getMonth() === y.getMonth() ? `${fmtD(a)} to ${y.getDate()}` : `${fmtD(a)} to ${fmtD(b)}`; };

  /* ================================ THE STYLES AND THE MODULES ================================ */
  const STYLES = [
    { id: "built", name: "Florin charts" },
    { id: "rings", name: "Rings" },
    { id: "journal", name: "Field journal" },
    { id: "bento", name: "Bento" },
    { id: "oura", name: "Oura" },
    { id: "easy", name: "Easy read", sub: "With the Easy version", pick: "Easy read, Easy version only" }
  ];
  /* Florin charts with the Rings day ring in place of its filled circle: The month (the calendar) and History's days.
     No screen draws it yet, so the page draws it from the two */
  const RING = (id) => ({ id, name: "Florin charts, with the week's ring", sub: "Drawn here from the two. No screen draws it yet" });
  const MONTH_STYLES = [STYLES[0], RING("cal-ring"), ...STYLES.slice(1)];
  const HIST_STYLES = [STYLES[0], RING("ring-mark")];
  const ALL_STYLES = [...STYLES, RING("cal-ring"), RING("ring-mark")];
  const styleName = (id) => (ALL_STYLES.find((s) => s.id === id) || {}).name || id;

  /* where a module can live. Each module offers only the places it makes sense in, and its own page (its detail page,
     named for the module) combines with the others; Cut stands alone */
  const PLACE = { today: ["Today", "Today"], insights: ["Insights", "Insights"], history: ["History", "History"], cut: ["Cut", "Cut"] };
  const PAGES = {
    score: ["FloraScore's page", "FloraScore's page"], trend: ["FloraScore's page", "FloraScore's page"], parts: ["FloraScore's page", "FloraScore's page"],
    week: ["Your days page", "the Your days page"], month: ["Your days page", "the Your days page"], pattern: ["A page per pattern", "a page per pattern"]
  };
  const placeList = (m) => (m.at || []).concat("cut").map((p) => (p === "detail" ? ["detail", ...(PAGES[m.key] || ["Its own page", "its own page"])] : [p, ...PLACE[p]]));
  const placesText = (m, pl) => {
    if (!pl || !pl.length) return "";
    if (pl.includes("cut")) return "Cut from the app";
    const names = placeList(m).filter((x) => pl.includes(x[0])).map((x) => x[2]);
    return pl.length === 1 && pl[0] === "detail" ? `Lives on ${names[0]} only` : `Lives on ${andJoin(names)}`;
  };

  /* the twelve modules in the app's right set that draw data (claude/Florin data viz.md, section 2). For each: its
     question, where it lives now, the places it can live (at), the stretch its cards count, the card each other style
     draws it with, what the app draws now (app), our recommendation and why, and every option in the decision sheet's
     shape: What it is, Why do it, Why not, one sentence each */
  const MODS = [
    {
      key: "score", name: "FloraScore today", q: "How is FloraScore today against its usual range?", now: "Now on Today, at the top.", card: "score", ins: "score", at: ["today", "insights", "detail"], span: "today",
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["today", "insights", "detail"],
      where: "Today, at the top; the top of Insights' FloraScore card; FloraScore's page",
      say: "We recommend keeping Florin charts.", why: "It shows today against its usual range without reading as a grade, and the rings stay on the week, where you picked them.",
      opts: {
        built: ["The dark green card with the number, your usual range as a band on a bar with today's dot on it, and one sentence on what stood out today.", "The bar shows how far today sits from its usual range without a gauge that fills toward 100.", "It's the plainest of the six, and on Today it sits above the Rings week, so one screen mixes a bar and rings."],
        rings: ["The number inside a ring that fills toward 100, with your usual range on an outer track.", "A ring reads at a glance and would match the rings on the week card you picked.", "A ring filling toward 100 reads as a grade, and its end dot turns Gold outside the range, though Gold is kept for a day outside your usual."],
        journal: ["A sentence first, then the number \"out of 100\" beside an open dial of your usual range, with this week's and last week's averages under it.", "It says the answer in words before any figure.", "It puts two weekly averages beside today's number, and the two can point different ways."],
        bento: ["A glass widget with the score in a ring, a chip for the change on last week, a week average tile and a 7-day sparkline.", "Each tile is one fact you can take in at a glance, like a phone widget.", "The ring, the average and the sparkline say the score three ways, the sparkline marks FloraScore in Gold, and the glass isn't one of the app's colours."],
        oura: ["A dark card with a round gauge, four part rings with no numbers, and a headline about this morning.", "It's the layout Oura users already know.", "The four part rings carry no numbers and all look full, the gauge's dot turns Gold, and it turns the phone dark."],
        easy: ["The number big and one sentence with your usual range.", "Nothing to decode, at a size anyone can read.", "There's no picture of where today sits against its range."]
      }
    },
    {
      key: "trend", name: "FloraScore over time", q: "Has FloraScore stayed in its usual range?", now: "Now on Insights' FloraScore card and FloraScore's page.", card: "trend", ins: "score", at: ["insights", "detail"], span: 30,
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights, the second card; FloraScore's page",
      say: "We recommend keeping Florin charts.", why: "The line keeps FloraScore dark green on its band (Ray on dark), never Gold, and it's the chart Ask Florin already draws.",
      opts: {
        built: ["A line over your usual range as a band, today's point ringed and labelled, with today's number and the part that moved it most in words above it.", "One card says how today sits and how the range went, and Ask Florin draws the same line.", "The card leads with today's number, so \"in its usual range on so many days\" waits for FloraScore's page."],
        rings: ["The count of days in its usual range, then the line on the band with the points outside it marked.", "The count answers the question before the chart.", "Points outside the range are Gold, the colour for a day outside your usual, though FloraScore isn't a day."],
        journal: ["A sentence with the count, then the days on the band with Above, Below and the lowest day labelled on the chart.", "Labels on the chart replace the legend, and the count comes first in words.", "Its labels sit in small capitals at the chart's edge, the hardest text on the card to read."],
        bento: ["The 30-day line, with a 90-day sparkline and an average tile under it.", "Two spans at once, without switching ranges.", "The average tile repeats the line, and points outside the range are Gold."],
        oura: ["A line with a 30 or 90 day switch, Gold where it leaves the range, and the zones named at the right edge.", "The switch and the zone names make the range easy to read, as in Oura.", "The Gold stretches make FloraScore look like a day outside your usual."],
        easy: ["The count of days in its usual range big, then three thick bars: in range, above, below.", "One number and three plain bars answer it.", "It drops the line, so you can't see when in the month the score moved."]
      }
    },
    {
      key: "parts", name: "What moved FloraScore", q: "Which part moved my score this week?", now: "Now one sentence on Insights' FloraScore card, and four rows on FloraScore's page.", card: "parts", ins: "score", at: ["insights", "detail"], span: "weeks",
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["detail"],
      where: "FloraScore's page, with one sentence on Insights' FloraScore card",
      say: "We recommend keeping Florin charts.", why: "It names every part on a tie and keeps to one unit, points, so the rows always add up to the change.",
      opts: {
        built: ["Four rows, one per part, each a bar from a centre line in whole points, with words such as \"Timing added 2 points\" and \"How often didn't move\".", "The rows add up to the change shown, and a tie names both parts.", "On Insights it is one sentence; the rows wait on FloraScore's page."],
        rings: ["Four nested rings for the parts out of 100, the move in points beside them, and a bar per part from zero.", "The rings echo the score's own ring.", "The nested rings carry no labels, its big number is the part that moved most rather than FloraScore's whole change, and when two parts tie it names only one."],
        journal: ["A dot for last week and one for this week on each part's row, with the points moved at the end.", "You see where each part was and where it went, on one scale.", "Each row shows the part out of 100, a second scale beside the points it moved."],
        bento: ["A big tile for the part that moved most, with its value in a ring, and a smaller tile for each other part.", "The part that moved most is the biggest tile.", "When two parts tie it names only one, and each tile shows the part out of 100 beside the points it added."],
        oura: ["A row per part with that part's own usual range as a band, last week and this week marked, and the points it added.", "Each part is read against its own usual, so you see whether it sat within it.", "When two parts tie it names only one, and each row adds a third number, the part out of 100."],
        easy: ["The change big, a sentence naming the parts that moved it, and a thick bar of points per part.", "Plain words and one bar a part, in points only.", "Sized for the Easy version, its four bars take a whole screen."]
      }
    },
    {
      key: "week", name: "The last 7 days", q: "How many of my last 7 days sat within my usual, and which didn't?", now: "Now on Today's week card, as Insights' count at 7 days, and on the Your days page.", card: "week", ins: "days", at: ["today", "insights", "detail"], span: 7,
      rec: "rings", app: "rings", label: "Your pick, Rings", short: "Rings, your pick", places: ["today", "insights", "detail"], willDefault: { style: "rings", on: "Nov 4" },
      subs: { built: "Today's card before Nov 4" },
      where: "Today, the Rings card; Insights' first card at 7 days, with a line for each day saying what was different; the Your days page",
      say: "We recommend Rings, your pick.", why: "It is Today's week card now; what was different on each day moves to Insights' first card, one tap away, drawn after The month.",
      differs: "This differs from Florin charts everywhere: the week draws each day as a ring, so every other place a day is drawn should follow it, in the month, History's days and the Your days page.",
      recTag: "Recommended: your pick, Nov 4",
      opts: {
        built: ["One count, a row of filled day circles ending on today, and a line for each day that wasn't within your usual, saying what was different.", "Each reason is written out, and its circle is the one History's calendar draws.", "It's the longest of the week cards, and it puts no FloraScore under the days."],
        /* drawn from the card as it is now: the library's Rings week is still changing (Add under a day with nothing
           logged, and no line naming the numbers) */
        rings: (fig) => [`The count big, one sentence naming the days outside your usual, and seven day rings with each day's FloraScore under it${/rg-wd-add/.test(fig) ? ", Add under a day with nothing logged," : ""} and today's column shaded.`, "The answer comes first and the week reads at a glance, with each day's score in reach.", `It names the days outside your usual but not what was different, and each number is FloraScore, which blends ${word(L.BLEND || 3)} days, so a day outside your usual can show a score inside its usual range.`],
        journal: ["A sentence with the count and the days outside, a row of day marks, then a row of dots per measure under each day, with its FloraScore.", "It shows which measure put each day outside your usual.", "Five rows of small dots make it the week with the most to read."],
        bento: ["Seven pills with a dot per BM inside, tinted by the day's state, and tiles for today's first BM and the BMs this week.", "With Oura's, the only weeks that show how many BMs each day had.", "Days outside your usual are filled Gold while usual days stay pale, so the different days shout, and the tiles repeat today's logs."],
        oura: ["A sentence for each day outside your usual, then a bar a day for the BMs logged against your usual count, coloured by the day's state, and a card asking what was different.", "It asks about a different day with the check-in's tags, as Oura asks about a night.", "A bar's height is the BM count and its colour is the day, so a Gold bar of usual height needs the sentence to explain it."],
        easy: ["The count big, a row of filled day circles, and a line for each day outside your usual.", "The reasons are written out at a size anyone can read.", "Its type is sized for the Easy version, larger than the rest of the standard app."]
      }
    },
    {
      key: "month", name: "The month", q: "How did each day this month sit against my usual?", now: "Now in History's Calendar, as Insights' count at 30 days, and on the Your days page.", card: "month", ins: "days", at: ["history", "insights", "detail"], span: "month", styles: MONTH_STYLES,
      rec: "cal-ring", label: "We recommend Florin charts' calendar, with the week's ring", short: "Florin charts' calendar, with the week's ring", places: ["history", "insights", "detail"],
      where: "History, the Calendar with the week's ring; Insights' first card at 30 days; the Your days page",
      say: "We recommend Florin charts' calendar, with the week's ring.", why: "A day should look the same on Today and in History, so the calendar keeps its taps and symptom squares and draws each logged day as the week's ring.",
      differs: "This differs from Florin charts everywhere: the month takes the Rings day ring in place of Florin charts' filled circle.",
      opts: {
        built: ["A month of filled day circles, each a button that opens that day's logs, with a Teal square under days with symptoms and a line counting the month.", "It's the one calendar you can tap, and it marks symptoms on the day they came.", "Its filled circles differ from the rings on Today's week card, so the same day looks two ways."],
        "cal-ring": ["Florin charts' calendar with each logged day drawn as the week's ring; a day with nothing logged stays the date alone, and a day noted for a clinician keeps its Teal ring.", "A day looks as it does on Today's week card, and the calendar keeps its taps, its symptom squares and its line counting the month.", "No screen draws it yet, so it is new work, and a ring at the calendar's size is smaller than the week's."],
        rings: ["The last 30 days as a grid of day rings, with the count of days within your usual above it.", "Each day looks as it does on the week card you picked.", "Alone it has no symptom marks and no taps, a ring a day gets small over 30 days, and a day with nothing logged is a thin circle rather than the date alone."],
        journal: ["A sentence with the count, a grid of filled day marks, and a column counting each week's days within your usual.", "The weekly counts show which weeks went differently.", "The week column repeats in numbers what the grid already shows."],
        bento: ["A grid of rounded squares, three count tiles, and the longest run of days within your usual.", "The tiles give the three counts at a glance.", "Days outside your usual are filled and usual days pale, and a longest run reads like a streak to keep up."],
        oura: ["A bar a day for the BMs logged, coloured by the day's state.", "It shows each day's count and state in one strip.", "No BM is drawn as a short bar, so a day with no BM looks like a day with some."],
        easy: ["The count big, a grid of filled day circles with symptom squares, and a line each for the days outside your usual, the days with nothing logged and symptoms.", "It's the plainest month, with its lines as the legend.", "Its type and circles are sized for the Easy version."]
      }
    },
    {
      key: "timing", name: "Timing", q: "Did my first BM come in my usual window?", now: "Now an Insights card and its own page.", card: "timing", ins: "timing", at: ["insights", "detail"], span: 30,
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights card; its own page",
      say: "We recommend keeping Florin charts.", why: "It is the only one that answers for the whole range on a straight time axis, the form the app's chart rules ask for.",
      opts: {
        built: ["A dot for each day's first BM on a straight time axis, your window as a band, Gold for one outside it, today labelled.", "A straight axis and a named window answer the question at a glance.", "The dots stack by time, so which day was late waits for its own page."],
        rings: ["A curved dial of the morning with your window on its rim, each first BM a dot, and the count in the middle.", "It looks like a clock, which suits a time of day.", "A curved time axis is harder to read than a straight one, and the dots crowd into the narrow window."],
        journal: ["A sentence with the count, then one dot a day across the month on a time axis, with Earlier and Later labelled at the edge.", "You see which days were late and when in the month.", "Time runs down the axis, so a later BM sits lower, which is easy to misread."],
        bento: ["The same dots by time, a ring of mornings in the window, and a tile with today's time.", "Today's time is the biggest number on the card.", "The ring repeats the count the dots already show."],
        oura: ["A curved strip of the morning with a tick for each first BM and a marker for today, then the count, your window and today in a row.", "Today leads, said in a sentence.", "The curved strip runs off the card on a small phone, and its ticks are too thin to count."],
        easy: ["Today's time big, a bar with your window and today's dot, and the month's count in a sentence.", "It answers for today first, in large type.", "The month is only a count, with no picture of the other days."]
      }
    },
    {
      key: "often", name: "How often", q: "Did I go my usual number of times?", now: "Now an Insights card and its own page.", card: "often", ins: "often", at: ["insights", "detail"], span: 30,
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights card; its own page",
      say: "We recommend keeping Florin charts.", why: "Whole counts on a line from zero, with No BM a real zero, and no decimals.",
      opts: {
        built: ["One dot a day on a count line from zero, your usual count as a band, and No BM as a dot on zero.", "Each day is its own dot, so a day with more or fewer stands out where it fell.", "With most days at one or two, the dots sit in two long rows."],
        rings: ["A ring of lanes, one per day, with the average a day in the middle.", "It fits 30 days in a small circle.", "A count read around a circle is hard to follow, the centre shows a decimal average nobody logged, and No BM is a ring."],
        journal: ["A sentence with the count and the average a day, then one dot a day on a count axis, with More and Fewer labelled.", "The labels name the days outside your usual count on the chart itself.", "It adds a decimal average to the answer, a number nobody logged."],
        bento: ["A square per BM stacked by day, an average tile, and a bar of the days by count.", "You can see every BM.", "The tile and the bar repeat the stack, and No BM is a ring."],
        oura: ["Tracks for BMs today, this week and the last 30 days, each against your usual count.", "Today leads, then the averages, as Oura's vitals do.", "The averages are decimals, so a week reads as so many point something a day."],
        easy: ["The count big, then a thick bar of days for No BM, one, two, and three or more, each marked usual or not.", "One bar per count answers \"how many times\" with nothing to decode.", "It loses when in the month the days outside your usual came."]
      }
    },
    {
      key: "form", name: "Consistency", q: "Were my BMs my usual forms?", now: "Now an Insights card and its own page.", card: "form", ins: "form", at: ["insights", "detail"], span: 30,
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights card; its own page",
      say: "We recommend keeping Florin charts.", why: "Counts on bars, in the person's own words, with Gold only for the forms outside their usual.",
      opts: {
        built: ["A bar per form with its count on top, your usual forms bracketed, and Gold bars for forms outside them.", "The counts add up to the BMs, in the words the person logs with.", "It shows the month's mix, so when a form outside your usual came waits for its own page."],
        rings: ["A ring per form, the count inside and the ring filled to its share of all BMs.", "Seven small rings line up with the seven words.", "Each ring says its count twice, as a number and a share, and small shares are hard to see."],
        journal: ["A row per form with a dot for every BM, your usual rows shaded, and the forms outside your usual named beside the others.", "You can count every BM, and today's is ringed.", "With dozens of BMs in a month, the rows of dots run long."],
        bento: ["Chips for firmer and looser, a ring of BMs within your usual forms, the bars by form, and a tile for today's form.", "Today's form and the month sit on one card.", "The ring repeats the bars beside it."],
        oura: ["Today's form on a seven-step track, then bars for the share of BMs in your usual forms this week, this month and in your usual.", "Today reads first, then the week against the month.", "The bars give shares, not forms, so firmer and looser are only in the sentence."],
        easy: ["The count big, then a thick bar per form logged with its count and a chip saying firmer, usual or looser.", "Each form says in words how it sits against your usual.", "It lists only the forms logged, so the scale from firmer to looser isn't shown whole."]
      }
    },
    {
      key: "symptoms", name: "Symptoms", q: "How often did symptoms come up?", now: "Now an Insights card, its own page, and a Teal square under each day on Today's week card.", card: "symptoms", ins: "symptoms", at: ["insights", "detail"], span: 30,
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights card; its own page; a Teal square under each day on Today's week card",
      say: "We recommend keeping Florin charts.", why: "Symptoms stay Teal and strength stays in words, as on every other screen.",
      opts: {
        built: ["A row per symptom with a Teal square on each day it came up, and an Any symptom row with your usual written at its end.", "It shows which days, in Teal, the app's colour for symptoms, with strength said in words.", "Small squares over 30 days take a careful look to count."],
        rings: ["A ring per symptom for its share of days, and a strip of dots sized by strength.", "The most common symptom leads.", "Strength is shown by dot size, and the marks aren't Teal, the colour symptoms have everywhere else."],
        journal: ["A sentence comparing the days with your usual, then rows of ticks whose height is the strength.", "The sentence says how this month compares with your usual.", "Strength is shown by tick height, and the marks aren't Teal."],
        bento: ["A strip of cells per symptom, tiles for how often and the strongest, and the note on when to see a clinician.", "The strongest symptom gets its own tile.", "Most cells are empty, so the strips are hard to read, and the marks aren't Teal."],
        oura: ["A row per symptom with a thin bar of its days and its strength in words.", "It's the plainest list, with strength in words.", "It doesn't show which days, so days in a row look the same as days apart."],
        easy: ["The count big, then a thick bar of days per symptom with its strength in words.", "The most common symptom leads, in large type.", "It doesn't show which days, and its bars aren't Teal."]
      }
    },
    {
      key: "checkin", name: "Weekly check-in results", q: "Are my answers like my first weeks?", now: "Now an Insights card, its own page, and the screen after answering.", card: "checkin", ins: "checkin", at: ["insights", "detail"], span: "checkin",
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights card; its own page, while the check-in is on",
      say: "We recommend keeping Florin charts.", why: "It is the only one that never adds the answers up.",
      opts: {
        built: ["Each question with this week's answer and one chip, \"About the same\" or more or fewer days than at first.", "One answer a question, with no score and no total.", "The trend over the weeks waits for its own page."],
        rings: ["The answers counted, a gauge per question, and a strip of the last 12 weeks.", "Each gauge shows the latest answer against your first weeks.", "It adds the answers into a total, which the check-in never does, and a gauge reads like a score."],
        journal: ["A sentence, then a line per question over the weeks on your first weeks' band, the latest ringed.", "You see each answer week by week against your first weeks.", "Four small charts make it the busiest check-in card."],
        bento: ["For each question, the answers as a ladder with the latest highlighted and your first weeks marked.", "Every possible answer is shown, so you see where this week's sits.", "It shows the latest week only, and the four ladders fill the card."],
        oura: ["The answers counted, then a slider per question with your first weeks as a band.", "The sliders are quick to scan.", "It adds the answers into a total, which the check-in never does."],
        easy: ["The answers counted big, then each question with its answer, a chip, and your first weeks in words.", "Every answer and its range are said in words.", "It leads with a total of answers."]
      }
    },
    {
      key: "pattern", name: "Possible patterns", q: "Does something tend to come before a change?", now: "Now an Insights card and a page per pattern.", card: "pattern", ins: "pattern", at: ["insights", "detail"], span: 30,
      rec: "built", label: "We recommend keeping Florin charts", short: "Florin charts", places: ["insights", "detail"],
      where: "Insights card; a page per pattern",
      say: "We recommend keeping Florin charts.", why: "All the patterns on one card, and shares on the pattern's page, with the line \"Patterns show what tends to happen together. They don't prove cause.\" on both.",
      opts: {
        built: ["Each pattern listed with how sure it is and how many times out of how many; on its page, two bars, how often the change followed and how often on other days.", "The bars are shares of each group, so a small group and a large one compare fairly.", "The Insights card is a list, so the comparison waits for the pattern's page."],
        rings: ["Two rings of segments, one segment per time, filled when the change followed.", "You can count each time.", "With dozens of times a ring of segments looks broken into dashes, and two rings are hard to compare by eye."],
        journal: ["A sentence, then a dot for every time in two rows, filled when the change followed.", "Every time is counted out.", "Rows of dozens of dots make the shares hard to compare."],
        bento: ["The pattern in a sentence, two bars of how often it followed, and a tile with three bars for how sure.", "The bars compare the two groups at once.", "How sure is a bar icon that reads like signal strength, and the card shows one pattern at a time."],
        oura: ["How sure as a slider from early signal to consistent, and two bars of how often it followed.", "How sure is a position on one scale.", "It shows one pattern at a time, with the others a tap away."],
        easy: ["The count big, two thick bars, and how sure in words.", "The plainest pattern, said in words.", "A big count can look more certain than \"consistent\" means."]
      }
    },
    {
      key: "history", name: "History's days", q: "What did I log, and how did each day sit?", now: "Now on History, newest day first, or under the Calendar. Only Florin charts draws History; no other style has one.", at: ["history"], span: "hist", styles: HIST_STYLES,
      rec: "ring-mark", label: "We recommend keeping Florin charts, with the week's ring", short: "Florin charts, with the week's ring", places: ["history"],
      where: "History, with the week's ring in each day's header",
      say: "We recommend keeping Florin charts, with the week's ring in each day's header.", why: "The list keeps its line and logs, and its mark matches the week and the calendar.",
      differs: "This differs from Florin charts everywhere: the day header takes the Rings day ring.",
      opts: {
        built: ["Each day opens with its filled circle and one line on how it sat against your usual, then its logs.", "The reason for each day sits right above the logs behind it.", "Its filled circle differs from the ring on Today's week card."],
        "ring-mark": ["The same day, with the week's ring in place of the filled circle in its header.", "A day looks the same on Today, in the calendar and in the list.", "No screen draws it yet, so it is new work, and the ring is a little larger than the circle it replaces."]
      }
    }
  ];
  const KEYS = MODS.map((m) => m.key);
  const modOf = (k) => MODS.find((m) => m.key === k);
  const stylesOf = (m) => m.styles || STYLES;
  const appOf = (m) => m.app || "built";
  /* "nine of the twelve", counted from the recommendations */
  const nBuilt = MODS.filter((m) => m.rec === "built").length;

  /* the cards on Insights, and the modules each one carries; a card's weight in FloraScore comes from the model */
  const W = L.SCORE_W || {};
  const pct = (k) => (W[k] != null ? `${Math.round(W[k] * 100)}% of FloraScore` : "");
  const CARDS = [
    { k: "days", name: "Your days", mods: ["week", "month"], say: "the count of days within your usual, then the days themselves in the week's rings: a row at 7 days, the month at 30, a bar a week at 90, and under them what was different" },
    { k: "score", name: "FloraScore", mods: ["score", "trend", "parts"], say: "today's number, the line over the range, and the part that moved it most" },
    { k: "timing", name: "Timing", mods: ["timing"], say: pct("timing") },
    { k: "often", name: "How often", mods: ["often"], say: pct("often") },
    { k: "form", name: "Consistency", mods: ["form"], say: pct("form") },
    { k: "symptoms", name: "Symptoms", mods: ["symptoms"], say: W.comfort != null ? `comfort, ${pct("comfort")}` : "" },
    { k: "checkin", name: "Weekly check-in", mods: ["checkin"], say: "while the check-in is on" },
    { k: "pattern", name: "Possible patterns", mods: ["pattern"], say: "" }
  ];
  const OUR_ORDER = CARDS.map((c) => c.k);
  const cardOf = (k) => CARDS.find((c) => c.k === k);
  /* Insights' sections, by the key each draws with */
  const INS_K = { score: "score", timing: "timing", often: "often", form: "form", sym: "symptoms", ck: "checkin", pat: "pattern" };

  /* ================================ THE VIEW: person, logs, theme, card size ================================ */
  const root = document.documentElement;
  const sysDark = () => !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const VKEY = "florin-modules:view";
  /* Sarah first: Will's week screenshot (Nov 4) is hers */
  const S = { persona: "sarah", data: "est", theme: null, size: "fit", uid: 0, tab: {} };
  try {
    const v = JSON.parse(localStorage.getItem(VKEY) || "{}");
    if (v && typeof v === "object") {
      if (FLD.PERSONAS.some((p) => p[0] === v.persona)) S.persona = v.persona;
      if (v.data === "est" || v.data === "new") S.data = v.data;
      if (v.theme === "light" || v.theme === "dark") S.theme = v.theme;
      if (v.size === "fit" || v.size === "full") S.size = v.size;
    }
  } catch (e) { /* the view is a convenience */ }
  const themeNow = () => S.theme || root.getAttribute("data-theme") || (sysDark() ? "dark" : "light");
  if (S.theme) root.setAttribute("data-theme", S.theme);
  const saveView = () => { try { localStorage.setItem(VKEY, JSON.stringify({ persona: S.persona, data: S.data, theme: S.theme, size: S.size })); } catch (e) { /* fine without it */ } };

  /* the logs' names, from the model: "12 weeks" and "New, day 5" */
  const logsOf = (data) => {
    try {
      const M = L.build("marcus", data, { meals: "all" });
      return data === "new" ? [`New, day ${L.learnDay(M)}`, `new, on day ${L.learnDay(M)} of logging`] : [`${Math.floor((L.TODAY - M.start) / 7)} weeks`, `${Math.floor((L.TODAY - M.start) / 7)} weeks of logs`];
    } catch (e) { return data === "new" ? ["New", "new"] : ["Established", "established logs"]; }
  };
  const LOGW = { est: logsOf("est"), new: logsOf("new") };
  const LOGS = [["est", LOGW.est[0]], ["new", LOGW.new[0]]];

  /* ================================ DRAWING A CARD AS A PICTURE ================================ */
  const box = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d; };
  const IDREF = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-details", "aria-activedescendant", "for", "list", "headers"];
  let PIC = 0;
  /* a drawn card is a picture: no tab stops, no presses, no count-up, and ids of its own (references rewritten), so
     the same card drawn twice never repeats an id or a gradient */
  function still(el) {
    const pfx = `dm${++PIC}`;
    el.querySelectorAll("[data-count]").forEach((e) => { e.removeAttribute("data-count"); e.removeAttribute("data-dur"); e.removeAttribute("data-dec"); });
    /* a button stays a button, so the card's own styles still find it, but disabled and with role none: it takes no
       tab stop and no press, and a screen reader reads its words as text */
    el.querySelectorAll("button").forEach((b) => { b.disabled = true; b.setAttribute("role", "none"); ["data-act", "aria-expanded", "aria-controls", "aria-haspopup", "aria-label", "title"].forEach((a) => b.removeAttribute(a)); });
    el.querySelectorAll("a[href]").forEach((a) => a.removeAttribute("href"));
    el.querySelectorAll("input, select, textarea").forEach((e) => { e.disabled = true; });
    el.querySelectorAll("[tabindex]").forEach((e) => e.removeAttribute("tabindex"));
    el.querySelectorAll("summary").forEach((s) => s.setAttribute("tabindex", "-1"));
    const map = {};
    el.querySelectorAll("[id]").forEach((e) => { map[e.id] = `${pfx}-${e.id}`; e.id = map[e.id]; });
    const olds = Object.keys(map);
    if (olds.length) {
      const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`#(${olds.map(reEsc).join("|")})(?![\\w-])`, "g");
      el.querySelectorAll("*").forEach((e) => {
        [...e.attributes].forEach((a) => {
          if (IDREF.includes(a.name)) { e.setAttribute(a.name, a.value.split(/\s+/).map((t) => map[t] || t).join(" ")); return; }
          if (a.value.indexOf("#") >= 0 && re.test(a.value)) { re.lastIndex = 0; e.setAttribute(a.name, a.value.replace(re, (s, id) => `#${map[id]}`)); }
          re.lastIndex = 0;
        });
      });
    }
    return el;
  }
  const stillHtml = (html) => still(box(html)).innerHTML;
  /* a card in the app's own ground and tokens, at a phone card's width */
  const apWrap = (inner, cls = "") => `<div class="ap ap-rx dm-ap${cls ? ` ${cls}` : ""}" data-theme="${themeNow()}"><div class="dm-ap-in">${inner}</div></div>`;
  const lookWrap = (id, inner) => apWrap(`<div class="rlk-look lk-${esc(id)}" data-theme="${themeNow()}">${inner}</div>`);
  const missing = (text) => `<p class="dm-missing">${esc(text)}</p>`;
  const sub = (label, inner) => `<div class="dm-subfig"><p class="dm-subfig-k">${esc(label)}</p>${inner}</div>`;

  /* ---------- the model, the looks' numbers and the Florin charts screens, built once per draw ---------- */
  let X = null;
  function build() {
    const M = L.build(S.persona, S.data, { meals: "all" });
    const V0 = { form: MODE, uid: 1, mealUI: "quick", plan: "member", bmUI: "quick", home: "score", history: "list", checkin: true, look: "built", easy: false, onboard: "short", persona: S.persona, data: S.data, meals: "all" };
    const V = () => Object.assign({}, V0, { uid: ++S.uid });
    const D = FLD.build(S.persona, { mode: MODE, data: S.data, meals: "all", M });
    const memo = {};
    const once = (k, f) => (k in memo ? memo[k] : (memo[k] = (() => { try { return f(); } catch (e) { console.error(`Florin data modules: ${k} failed to draw`, e); return null; } })()));
    X = {
      M, V, D, memo,
      ins: (n) => once(`ins${n}`, () => box(RU.insights(M, V(), { range: n }))),
      scoreDetail: () => once("scoreDetail", () => box(RU.idetail(M, V(), { k: "score", range: 30 }))),
      pats: () => once("pats", () => L.patterns(M, MODE)),
      rings: () => once("rings", ringsByDay)
    };
    return X;
  }
  const lookById = (id) => (window.FLOOKS || []).find((l) => l.id === id);
  const ctxOf = (look) => ({ uid: `dm${look.id}${++S.uid}`, theme: themeNow(), esc, T, n1, lin, C: window.FLC, motion: false });
  const insSection = (n, k) => { const b = X.ins(n); const h = b && b.querySelector(`.ap-ic-h[data-k="${k}"]`); return h ? h.closest("section") : null; };
  const insSum = (n) => { const b = X.ins(n); return b ? b.querySelector("section.ap-sum") : null; };
  const outer = (el) => (el ? el.outerHTML : null);

  /* ---------- the week's ring, for a day: the ring the Rings look draws for it (its month card, the last 30 days),
     so Florin charts' calendar and History's day headers can carry the same mark ---------- */
  function ringsByDay() {
    const look = lookById("rings");
    if (!look || !look.components || !look.components.month) return {};
    const b = box(look.components.month(X.D, ctxOf(look)));
    const cells = [...b.querySelectorAll("li.rg-md:not(.is-pad)")];
    const out = {};
    (X.D.days[30] || []).forEach((d, i) => { const svg = cells[i] && cells[i].querySelector("svg.rg-day"); if (svg && d && d.d != null) out[d.d] = svg.outerHTML; });
    return out;
  }
  /* a logged day's mark (RU.dayMark: within, outside, or not counted) takes the ring in place of its filled circle.
     A day with nothing logged keeps the date alone, a day noted for a clinician its Teal ring with the info sign, and
     every day its Teal symptom square and Today: the ring carries a day the way the circle does */
  const RINGED = ["usual", "shift", "quiet"];
  function ringInto(mark) {
    const k = RINGED.find((c) => mark.classList.contains(`ap-day--${c}`));
    const c = mark.querySelector(".ap-day-c");
    const d = +mark.dataset.day;
    const svg = k && c && X.rings()[d];
    if (!svg) return false;
    const today = d === L.TODAY;
    const r = document.createElement("span");
    r.className = "dm-ringc rlk-look lk-rings";
    r.setAttribute("data-theme", themeNow());
    r.setAttribute("aria-hidden", "true");
    r.innerHTML = `<span class="rg dm-rg0"><span class="rg-md${today ? " is-today" : ""}">${svg}<b>${dOf(d).getDate()}</b></span></span>`;
    c.replaceWith(r);
    mark.classList.add("dm-ringed");
    return true;
  }

  /* Florin charts: each module as the app draws it now */
  const calendar = () => box(RU.history(X.M, Object.assign(X.V(), { history: "calendar" }), {})).querySelector("section.vr-cal");
  const BUILT = {
    score: () => RU.scoreHero(X.M, X.V()),
    trend: () => outer(insSection(30, "score")),
    /* the four rows on FloraScore's page; before there's a score, what that page shows while Florin learns */
    parts: () => {
      const b = X.scoreDetail();
      if (!b) return null;
      const f = [...b.querySelectorAll("figure.ap-fig")].find((x) => /^What moved it/.test((x.querySelector("figcaption") || {}).textContent || ""));
      if (f) return f.outerHTML;
      const h = b.querySelector(".ap-dhero");
      return h ? h.outerHTML + [...b.querySelectorAll(".ap-sect-p")].map((x) => x.outerHTML).join("") : null;
    },
    week: () => RU.weekCard(X.M, MODE),
    month: () => outer(calendar()),
    timing: () => outer(insSection(30, "timing")),
    often: () => outer(insSection(30, "often")),
    form: () => outer(insSection(30, "form")),
    symptoms: () => outer(insSection(30, "sym")),
    checkin: () => outer(insSection(30, "ck")),
    pattern: () => outer(insSection(30, "pat"))
  };
  /* what Florin charts adds under its card: Insights' count now (the week and the month), the first pattern's page */
  const BUILT_MORE = {
    week: () => { const s = insSum(7); return s ? sub("Insights' count now, at 7 days", apWrap(stillHtml(s.outerHTML))) : ""; },
    month: () => { const s = insSum(30); return s ? sub("Insights' count now, at 30 days", apWrap(stillHtml(s.outerHTML))) : ""; },
    pattern: () => {
      const P = X.pats(), p = P && P.found && P.found[0];
      if (!p) return "";
      const b = box(RU.idetail(X.M, X.V(), { k: `pattern:${p.id}`, range: 30 }));
      const f = b.querySelector("figure.ap-fig");
      return f ? sub("On the first pattern's page", apWrap(stillHtml(f.outerHTML))) : "";
    }
  };
  /* Florin charts' calendar, with the week's ring: the calendar as History draws it, each logged day's mark ringed,
     and its legend's keys drawn as rings to match */
  function drawCalRing() {
    const cal = calendar();
    if (!cal) return null;
    cal.querySelectorAll(".vr-cal-d .ap-day").forEach(ringInto);
    cal.classList.add("dm-ringcal");
    return cal.outerHTML;
  }
  /* History's days: today, and the latest day of the last 7 outside the usual */
  const histDays = () => {
    const F = L.span(X.M, 7, MODE);
    const out = F.filter((f) => f.state === "shifted").pop();
    return [L.TODAY].concat(out && out.d !== L.TODAY ? [out.d] : []);
  };
  function drawHist(styleId) {
    const html = histDays().map((d) => RU.historyDay(X.M, X.V(), d)).join("");
    if (styleId === "built") return apWrap(stillHtml(html), "dm-ap--hist");
    /* with the week's ring: each day's header mark takes the ring */
    const b = box(html);
    b.querySelectorAll(".ap-hd-h .ap-day").forEach(ringInto);
    b.querySelectorAll(".ap-hd").forEach((s) => s.classList.add("dm-ringcal"));
    return apWrap(stillHtml(b.innerHTML), "dm-ap--hist");
  }
  /* one module in one style */
  function drawOpt(m, styleId) {
    try {
      if (m.key === "history") return drawHist(styleId);
      if (styleId === "cal-ring") {
        const h = drawCalRing();
        return h ? apWrap(stillHtml(h)) : missing("Florin charts doesn't draw the calendar on these logs.");
      }
      if (styleId === "built") {
        const h = BUILT[m.key]();
        if (!h) return missing(S.data === "new" ? "Florin charts doesn't draw this yet on these logs: it waits until Florin knows the person's usual." : "Florin charts doesn't draw this card on these logs.");
        const more = BUILT_MORE[m.key] ? BUILT_MORE[m.key]() : "";
        return apWrap(stillHtml(h)) + more;
      }
      const look = lookById(styleId);
      if (!look || !look.components || !look.components[m.card]) return missing("This style doesn't draw this card.");
      return lookWrap(styleId, stillHtml(look.components[m.card](X.D, ctxOf(look))));
    } catch (e) {
      console.error(`Florin data modules: ${styleName(styleId)} failed to draw ${m.name}`, e);
      return missing(`This card failed to draw: ${e && e.message ? e.message : "an error"}.`);
    }
  }

  /* ---------- the stretch each card counts, over it, and once for the module ---------- */
  const learning = () => !X.M.usual;
  const rangeOf = (n) => span2(Math.max(L.TODAY - n + 1, X.M.start), L.TODAY);
  const monthSoFar = () => { const t = dOf(L.TODAY); return [Ut.MONL[t.getMonth()], span2(Math.max(L.TODAY - t.getDate() + 1, X.M.start), L.TODAY)]; };
  function spanOf(m, styleId) {
    const since = learning() && X.M.start > L.TODAY - 29;
    switch (m.span) {
      case "today": return `Today, ${fmtD(L.TODAY)}`;
      case 7: return `The last 7 days, ${rangeOf(7)}`;
      case 30: return since ? `Since you started, ${rangeOf(30)}` : `The last 30 days, ${rangeOf(30)}`;
      case "weeks": return "This week against last";
      case "checkin": return "This week's answers, against your first weeks";
      case "month": {
        if (styleId === "built" || styleId === "cal-ring") { const [mn, r] = monthSoFar(); return `${mn} so far, ${r}`; }
        return since ? `Since you started, ${rangeOf(30)}` : `The last 30 days, ${rangeOf(30)}`;
      }
      case "hist": { const ds = histDays(); return ds.length > 1 ? `Today, and ${L.dayName(ds[1])}, ${fmtD(ds[1])}` : `Today, ${fmtD(L.TODAY)}`; }
      default: return "";
    }
  }
  /* one line for the module: what every card counts, and where the counts differ */
  function spanLine(m) {
    const since = X.M.start > L.TODAY - 29;
    if (m.span === 30) return `Every card here counts ${since ? "the days since the person started" : "the last 30 days"}. The app also offers 7 and 90 days; only Florin charts draws them now.`;
    if (m.span === "month") {
      const [mn] = monthSoFar(), t = dOf(L.TODAY);
      /* the calendar and the last 30 days start on the same day only when the person started this month */
      if (Math.max(L.TODAY - t.getDate() + 1, X.M.start) === Math.max(L.TODAY - 29, X.M.start)) return "";
      return `Florin charts' calendar counts ${mn} so far, as History does; the other styles count the last 30 days, so their counts differ. The dates are over each card.`;
    }
    return "";
  }

  /* ================================ THE PICKS: kept in db, or in this browser ================================ */
  const LKEY = "florin-modules:picks:v1";
  const empty = () => ({ picks: {}, _order: null, _page: null });
  const clean = {
    pick: (k, b) => {
      if (!b || typeof b !== "object") return null;
      const m = modOf(k);
      const ok = stylesOf(m).map((s) => s.id);
      const style = ok.includes(b.style) ? b.style : null;
      const allowed = placeList(m).map((x) => x[0]);
      let places = Array.isArray(b.places) ? b.places.filter((p, i, a) => allowed.includes(p) && a.indexOf(p) === i) : [];
      if (places.includes("cut")) places = ["cut"];
      return { v: 1, module: k, style, places, note: typeof b.note === "string" ? b.note.slice(0, 500) : "", at: typeof b.at === "string" ? b.at : null, by: typeof b.by === "string" ? b.by : null };
    },
    /* the cards in the stored order, any card the store doesn't name after them in our order */
    order: (b) => {
      if (!b || !Array.isArray(b.order)) return null;
      const ord = b.order.filter((k, i, a) => OUR_ORDER.includes(k) && a.indexOf(k) === i);
      return { v: 1, order: ord.concat(OUR_ORDER.filter((k) => !ord.includes(k))), at: typeof b.at === "string" ? b.at : null, by: typeof b.by === "string" ? b.by : null };
    },
    page: (b) => (b && typeof b.text === "string" ? { v: 1, text: b.text.slice(0, 1000), at: typeof b.at === "string" ? b.at : null, by: typeof b.by === "string" ? b.by : null } : null)
  };
  const readLocal = () => {
    const out = empty();
    try {
      const raw = JSON.parse(localStorage.getItem(LKEY) || "null");
      if (raw && typeof raw === "object") {
        KEYS.forEach((k) => { const c = raw.picks && clean.pick(k, raw.picks[k]); if (c) out.picks[k] = c; });
        out._order = clean.order(raw._order); out._page = clean.page(raw._page);
      }
    } catch (e) { /* the page works the same without the browser store */ }
    return out;
  };
  const writeLocal = () => { try { localStorage.setItem(LKEY, JSON.stringify(P)); return true; } catch (e) { return false; } };
  const hasAny = (p) => !!(p && (Object.keys(p.picks).length || p._order || (p._page && p._page.text)));

  /* ST.mode: "wait" until db answers, then "db" (saves to the page), "read" (sees the owner's picks, can't change
     them) or "local" (this browser only) */
  const ST = { mode: "wait", db: null, user: null, uid: null, canWrite: null, offer: false, localHad: false, notice: "", saved: {}, unsub: null, retried: false, timer: 0, names: {} };
  let P = readLocal();
  const pathOf = (k) => `picks/${k}`;

  /* one write at a time per document: the latest change waits while one is in flight, and only it is sent */
  const Q = {};
  const pending = (k) => (Q[k] && Q[k].next) || null;
  function put(k, body) {
    if (k === "_order") P._order = body; else if (k === "_page") P._page = body; else P.picks[k] = body;
    if (ST.mode === "local") { const ok = writeLocal(); ST.saved[k] = ok ? "local" : "unsaved"; refreshPicks(); return; }
    if (ST.mode !== "db") return;
    const q = Q[k] || (Q[k] = { busy: false, next: null });
    q.next = body; ST.saved[k] = "saving";
    refreshPicks();
    if (!q.busy) pump(k);
  }
  const DEL = {};
  async function pump(k) {
    const q = Q[k];
    q.busy = true;
    while (q.next && ST.mode === "db") {
      const body = q.next;
      try {
        await setDoc(k, body);
        if (q.next === body) q.next = null;
        ST.saved[k] = q.next ? "saving" : "db";
      } catch (e) {
        if (q.next === body) q.next = null;
        failed(e, k, body);
        break;
      }
      refreshPicks();
    }
    q.busy = false;
  }
  async function setDoc(k, body) {
    const ref = ST.db.doc(pathOf(k));
    const go = () => (body === DEL ? ref.delete() : ref.set(body));
    try { await go(); }
    catch (e) {
      const code = e && e.code;
      if (code === "invalid_argument" || code === "quota_exceeded" || code === "revoked" || code === "resource_exhausted" || code === "not_granted" || code === "capability_disabled" || code === "capability_removed" || code === "transform_error") throw e;
      /* unavailable, or a code this page doesn't know: once more after a short random wait */
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));
      await go();
    }
  }
  function failed(e, k, body) {
    const code = e && e.code;
    console.warn("Florin data modules: a pick didn't save", code, e && e.message);
    if (code === "quota_exceeded") { ST.notice = "The page's store is full, so this change wasn't saved. Use Copy my picks to keep it."; ST.saved[k] = "unsaved"; refreshPicks(); return; }
    if (code === "invalid_argument" || code === "transform_error" || code === "revoked" || code === "not_granted" || code === "capability_disabled" || code === "capability_removed") {
      toLocal(code === "invalid_argument" ? "Only the page's owner and its editors save picks to it, so for this visit yours are kept in this browser. Use Copy my picks to send them." : "The page stopped saving, so for this visit your picks are kept in this browser. Use Copy my picks to send them.");
      if (body !== DEL) { if (k === "_order") P._order = body; else if (k === "_page") P._page = body; else P.picks[k] = body; }
      const ok = writeLocal(); ST.saved[k] = ok ? "local" : "unsaved"; refreshPicks();
      return;
    }
    ST.notice = "A change didn't save. Try it again, or use Copy my picks to keep it."; ST.saved[k] = "unsaved"; refreshPicks();
  }
  function toLocal(msg) {
    if (ST.unsub) { try { ST.unsub(); } catch (e) { /* already gone */ } ST.unsub = null; }
    clearTimeout(ST.timer);
    ST.mode = "local"; ST.notice = msg || ""; ST.offer = false;
    refreshPicks();
  }

  /* db and user, after the first paint. The controls wait for this; without db, it answers at once */
  async function connect() {
    let db = null, user = null;
    try {
      const c = window.claude;
      if (c && typeof c.use === "function") [db, user] = await Promise.all([c.use("db").catch(() => null), c.use("user").catch(() => null)]);
    } catch (e) { db = null; }
    if (!db) { ST.mode = "local"; refreshPicks(); return; }
    ST.db = db; ST.user = user;
    try { ST.uid = user ? await user.id() : null; } catch (e) { ST.uid = null; }
    try { ST.canWrite = user ? await user.can("data.write") : null; } catch (e) { ST.canWrite = null; }
    ST.localHad = hasAny(readLocal());
    subscribe();
  }
  /* the first snapshot has 10 seconds; without one, the picks stay in this browser for the visit */
  const WAIT_MS = 10000;
  function subscribe() {
    clearTimeout(ST.timer);
    ST.timer = setTimeout(() => {
      if (ST.mode !== "wait") return;
      console.warn("Florin data modules: the page's picks didn't load in time");
      P = readLocal();
      toLocal("The page's picks didn't load, so for this visit yours are kept in this browser. Reload to try again, or use Copy my picks to send them.");
    }, WAIT_MS);
    try {
      ST.unsub = ST.db.collection("picks").onSnapshot((snap) => {
        if (ST.mode === "local") return;
        clearTimeout(ST.timer);
        const next = empty();
        snap.docs.forEach((d) => {
          if (!d.exists) return;
          const b = d.data();
          if (d.id === "_order") next._order = clean.order(b);
          else if (d.id === "_page") next._page = clean.page(b);
          else if (KEYS.includes(d.id)) { const c = clean.pick(d.id, b); if (c) next.picks[d.id] = c; }
        });
        /* a change still waiting to be sent stays on screen over the store's older copy */
        KEYS.concat("_order", "_page").forEach((k) => {
          const pb = pending(k);
          if (!pb) return;
          if (k === "_order") next._order = pb === DEL ? null : pb; else if (k === "_page") next._page = pb === DEL ? null : pb; else if (pb === DEL) delete next.picks[k]; else next.picks[k] = pb;
        });
        P = next;
        if (ST.mode === "wait") ST.mode = ST.canWrite === false ? "read" : "db";
        if (!snap.metadata || !snap.metadata.fromCache) ST.offer = ST.mode === "db" && snap.empty && ST.localHad;
        refreshPicks();
      }, (e) => {
        clearTimeout(ST.timer);
        const code = e && e.code;
        console.warn("Florin data modules: the picks stopped updating", code, e && e.message);
        ST.unsub = null;
        if (ST.mode === "local") return;
        if (code === "unavailable" && !ST.retried) { ST.retried = true; setTimeout(subscribe, 400 + Math.random() * 800); return; }
        if (ST.mode === "wait" || code === "revoked" || code === "not_granted" || code === "capability_disabled" || code === "capability_removed") {
          P = readLocal();
          toLocal(ST.mode === "wait" ? "" : "The page stopped saving, so for this visit your picks are kept in this browser. Use Copy my picks to send them.");
          return;
        }
        ST.notice = "The picks stopped updating from the page. Reload to see the latest.";
        refreshPicks();
      });
    } catch (e) {
      console.warn("Florin data modules: couldn't read the picks from the page", e);
      P = readLocal(); toLocal("");
    }
  }
  const now = () => new Date().toISOString();
  const stamp = (o) => Object.assign(o, { at: now(), by: ST.uid || null });

  /* a module's pick as shown: Will's saved pick, or the week's Nov 4 pick while nothing is saved for it */
  const shown = (k) => {
    const m = modOf(k), p = P.picks[k];
    if (p && !p.style && !p.places.length && !m.willDefault) return { style: null, places: [], note: p.note, saved: false, noteOnly: true, at: p.at, by: p.by };
    if (p) return { style: p.style, places: p.places, note: p.note, saved: true, at: p.at, by: p.by };
    if (m.willDefault) return { style: m.willDefault.style, places: m.places.slice(), note: "", saved: false, standing: true };
    return { style: null, places: [], note: "", saved: false };
  };
  const unpicked = () => MODS.filter((m) => { const s = shown(m.key); return !s.saved; });
  /* where a module lives, for the Insights order: Will's places when he has set them, else ours */
  const effPlaces = (k) => { const s = shown(k); return s.places && s.places.length ? s.places : modOf(k).places; };
  const editable = () => ST.mode === "db" || ST.mode === "local";
  /* a place picked with no style keeps ours */
  const styleWords = (m, s) => (s.style ? styleName(s.style) : `Style: ours (${styleName(m.rec)})`);
  /* the pick in one line, for the summary and Copy my picks */
  const pickLine = (k) => {
    const m = modOf(k), s = shown(k);
    if (s.standing) return `${styleName(s.style)}, ${POSS()} pick on ${m.willDefault.on}. ${placesText(m, s.places)}.`;
    if (!s.saved) return "";
    return `${styleWords(m, s)}. ${s.places.length ? `${placesText(m, s.places)}.` : "Where it lives: ours."}`;
  };
  const savedWhen = (at) => { const d = at ? fmtDay(at) : ""; return d ? ` on ${d}` : ""; };
  /* who saved a pick: "you", or their name as this viewer sees it (user.profiles, never stored), or nobody named */
  const whoSaved = (by) => (!by ? "" : by === ST.uid ? "you" : ST.names[by] || "");
  /* a viewer who can't change the picks reads them as saved ones; the Nov 4 week pick is Will's */
  const YOURS = () => (ST.mode === "read" ? "The saved pick" : "Your pick");
  const POSS = () => (ST.mode === "read" ? "Will's" : "your");

  /* ================================ THE PAGE ================================ */
  const seg = (key, label, opts, cur, cls = "") => `<div class="dm-ctl${cls ? ` ${cls}` : ""}"><span class="dm-ctl-l" id="dm-v-${key}">${esc(label)}</span><div class="dm-seg" role="group" aria-labelledby="dm-v-${key}">${opts.map(([v, l]) => `<button type="button" data-view="${key}" data-v="${esc(v)}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div></div>`;
  const personName = () => (FLD.PERSONAS.find((p) => p[0] === S.persona) || [S.persona, S.persona])[1];
  const demoLine = () => {
    const logs = LOGW[S.data][1];
    return `${personName()}, ${logs}, Consistency C, meals logged every day, with membership.${learning() ? ` Florin is still learning ${personName()}'s usual, so most cards show the days as logged.` : ""}`;
  };

  function head() {
    return `<header class="dm-head">
      <h1>Data vis, module by module</h1>
      <p class="dm-lede">${esc(`The ${word(MODS.length)} charts in the app, each drawn in every style from the same logs, with what we recommend and a place for your pick.`)}</p>
    </header>
    <section class="dm-answer" aria-labelledby="dm-answer-h">
      <h2 class="dm-k" id="dm-answer-h">Our answer</h2>
      <p class="dm-answer-say">${esc(`We recommend Florin charts for ${word(nBuilt)} of the ${word(MODS.length)}, Rings for the week you picked, and the week's ring as the one way a day is drawn, in History's calendar and day list too. Insights would open with your days.`)}</p>
      <p class="dm-answer-more">Until now we recommended one style everywhere (decision 7). A pick per module replaces that: the demo's Data style toggle would go.</p>
    </section>`;
  }
  function ctls() {
    return `<div class="dm-ctls" role="group" aria-label="The demo person every card draws">
      <p class="dm-demo" aria-live="polite">${esc(demoLine())}</p>
      <div class="dm-ctls-row">
        ${seg("persona", "Person", FLD.PERSONAS, S.persona)}
        ${seg("data", "Logs", LOGS, S.data)}
        ${seg("theme", "Theme", [["light", "Light"], ["dark", "Dark"]], themeNow())}
        ${seg("size", "Cards", [["fit", "All in view"], ["full", "Full size"]], S.size, "dm-ctl--fit")}
      </div>
    </div>`;
  }
  /* the save status, and the buttons that go with it */
  function statusHtml(top) {
    const say = ST.mode === "wait" ? "Checking where your picks save…"
      : ST.mode === "db" ? "Your picks save to this page."
      : ST.mode === "read" ? "These are the picks saved to this page. Only the page's owner and its editors can change them."
      : "Your picks are kept in this browser only. Use Copy my picks to send them.";
    const n = unpicked().length;
    return `<p class="dm-status-say">${esc(say)}</p>${ST.notice ? `<p class="dm-status-note">${esc(ST.notice)}</p>` : ""}
      <div class="dm-status-acts">
        ${top && editable() && n ? `<button type="button" class="dm-btn" data-act="take-all">Take ours for every module I haven't picked</button>` : ""}
        <button type="button" class="dm-btn${top && editable() && n ? " dm-btn--line" : ""}" data-act="copy">${ST.mode === "read" ? "Copy these picks" : "Copy my picks"}</button>
        ${ST.offer ? `<button type="button" class="dm-btn dm-btn--line" data-act="import">Save the picks from this browser to the page</button>` : ""}
      </div>`;
  }
  const statusBox = (id) => `<div class="dm-status" data-status="${id}"><div class="dm-status-top">${statusHtml(id === "top")}</div><p class="dm-status-live dm-vh" aria-live="polite"></p><div class="dm-copybox" hidden></div></div>`;
  /* the summary: each module's question, our pick, Will's pick so far, and the Insights order */
  function summaryRows() {
    const rows = MODS.map((m, i) => {
      const pl = pickLine(m.key), s = shown(m.key);
      const mine = pl || (s.noteOnly ? "No pick yet. Your note is kept." : "No pick yet");
      return `<tr data-key="${m.key}">
        <td class="dm-t-mod"><a href="#m-${m.key}"><span class="dm-t-n">${i + 1}</span>${esc(m.name)}</a><span class="dm-t-q">${esc(m.q)}</span></td>
        <td data-l="We recommend">${esc(m.short)}</td>
        <td data-l="Where it lives (ours)">${esc(m.where)}</td>
        <td data-l="${esc(YOURS())}" class="${pl ? "" : "is-none"}">${esc(mine)}</td>
      </tr>`;
    });
    const ours = OUR_ORDER.map((k) => cardOf(k).name).join(", ");
    const mineOrd = P._order ? `Your order: ${orderNow().map(cardOf).filter((c) => c && onInsights(c)).map((c) => c.name).join(", ")}.` : "";
    rows.push(`<tr data-key="_order">
        <td class="dm-t-mod"><a href="#m-order"><span class="dm-t-n is-blank" aria-hidden="true"></span>Order of Insights</a><span class="dm-t-q">Which card comes first on Insights?</span></td>
        <td data-l="We recommend">${esc(`Your days first: ${ours}`)}</td>
        <td data-l="Where it lives (ours)">Insights</td>
        <td data-l="${esc(YOURS())}" class="${mineOrd ? "" : "is-none"}">${esc(mineOrd || "No change yet")}</td>
      </tr>`);
    return rows.join("");
  }
  function summary() {
    return `<section class="dm-sum" id="m-summary" aria-labelledby="dm-sum-h">
      <div class="dm-sec-h"><h2 id="dm-sum-h">The ${esc(word(MODS.length))} at a glance</h2><p>Each row opens its module. Your pick fills in as you choose.</p></div>
      ${statusBox("top")}
      <table class="dm-t">
        <thead><tr><th scope="col">Module</th><th scope="col">We recommend</th><th scope="col">Where it lives (ours)</th><th scope="col" class="dm-t-yours">${esc(YOURS())}</th></tr></thead>
        <tbody class="dm-t-b">${summaryRows()}</tbody>
      </table>
      <p class="dm-not">${esc("Not on this page, and why: FloraScore while learning is a state of FloraScore today; Day first's FloraScore chip is FloraScore today drawn small beside the date, so it follows module 1; each detail page follows its card; the check-in's due card is words; your usual in Profile is four rows of words; the Free teasers and the membership page follow the member cards; Ask Florin draws the card's own chart, so it follows each pick; the Easy version keeps its own screens.")}</p>
      <p class="dm-not">${esc("Where the app offers 7, 30 and 90 days, the cards here are drawn at 30 (the week at 7). Only Florin charts draws all three now, so a card picked from another style needs its 7 and 90 days, its detail page and its Ask Florin chart drawn the same way.")}</p>
    </section>`;
  }

  /* ---------- a module ---------- */
  const optId = (m, st) => `dm-opt-${m.key}-${st.id}`;
  const tabId = (m, st) => `dm-tab-${m.key}-${st.id}`;
  const selOf = (m) => (stylesOf(m).some((s) => s.id === S.tab[m.key]) ? S.tab[m.key] : m.rec);
  function opt(m, st, i) {
    const rec = m.rec === st.id, app = appOf(m) === st.id;
    const fig = drawOpt(m, st.id);
    const raw = m.opts[st.id];
    const [is, why, not] = (typeof raw === "function" ? raw(fig) : raw) || ["", "", ""];
    const subLine = (m.subs && m.subs[st.id]) || st.sub || "";
    const tags = [rec ? `<span class="dm-tag">${esc(m.recTag || "Recommended")}</span>` : "", app ? `<span class="dm-tag dm-tag--app">In the app now</span>` : ""].join("");
    /* the Rings week no longer names its numbers on the card: the page says what they are */
    const capLine = m.key === "week" && st.id === "rings" && !/Number under a ring/.test(fig) && !learning() ? `<p class="dm-cap">${esc("Under each ring, that day's FloraScore. The card itself doesn't say so.")}</p>` : "";
    return `<article class="dm-opt" id="${optId(m, st)}"${rec ? " data-rec" : ""}${app ? " data-app" : ""} data-style="${st.id}" aria-labelledby="dm-o-${m.key}-${st.id}">
      <header class="dm-opt-h">
        <span class="dm-opt-n" aria-hidden="true">${i + 1}</span>
        <div class="dm-opt-t">
          <h3 id="dm-o-${m.key}-${st.id}">${esc(st.name)}</h3>
          ${subLine ? `<p class="dm-opt-sub">${esc(subLine)}</p>` : ""}
          ${tags ? `<p class="dm-tags">${tags}</p>` : ""}
          <p class="dm-span">${esc(spanOf(m, st.id))}</p>
        </div>
      </header>
      <div class="dm-fig" role="group" aria-label="${esc(`${st.name}: ${m.name}`)}">${fig}${capLine}</div>
      <dl class="dm-txt">
        <div><dt>What it is</dt><dd>${esc(is)}</dd></div>
        <div><dt>Why do it</dt><dd>${esc(why)}</dd></div>
        <div><dt>Why not</dt><dd>${esc(not)}</dd></div>
      </dl>
    </article>`;
  }
  function pickCtl(m) {
    const s = shown(m.key), dis = editable() ? "" : " disabled";
    const styles = stylesOf(m);
    const ours = `${styleName(m.rec)}. ${placesText(m, m.places)}`;
    const place = placeList(m);
    return `<div class="dm-ctl dm-ctl--pick"><span class="dm-ctl-l" id="dm-st-${m.key}">Style</span>
        <div class="dm-seg dm-seg--wrap" role="group" aria-labelledby="dm-st-${m.key}">${styles.map((st) => `<button type="button" data-act="style" data-key="${m.key}" data-v="${st.id}" aria-pressed="${s.style === st.id}"${dis}>${esc(st.pick || st.name)}</button>`).join("")}</div>
      </div>
      <div class="dm-ctl dm-ctl--pick"><span class="dm-ctl-l" id="dm-pl-${m.key}">Where it lives</span>
        <div class="dm-seg dm-seg--wrap" role="group" aria-labelledby="dm-pl-${m.key}">${place.map(([v, l]) => `<button type="button" data-act="place" data-key="${m.key}" data-v="${v}" aria-pressed="${(s.places || []).includes(v)}"${dis}>${esc(l)}</button>`).join("")}</div>
      </div>
      <div class="dm-pick-acts">
        <button type="button" class="dm-btn" data-act="ours" data-key="${m.key}"${dis}>Take our recommendation</button>
        ${s.standing && editable() ? `<button type="button" class="dm-btn dm-btn--line" data-act="confirm" data-key="${m.key}">Confirm ${esc(styleName(s.style))}</button>` : ""}
        ${s.saved && editable() ? `<button type="button" class="dm-btn dm-btn--line" data-act="clear" data-key="${m.key}">Clear my pick</button>` : ""}
        <span class="dm-pick-ours">${esc(`Ours: ${ours}.`)}</span>
      </div>`;
  }
  const stateLine = (m) => {
    const s = shown(m.key), sv = ST.saved[m.key];
    const what = s.standing ? `${styleName(s.style)}, ${POSS()} pick on ${m.willDefault.on}. ${placesText(m, s.places)}.${ST.mode === "read" ? "" : " Not saved here until you confirm or change it."}`
      : !s.saved ? (s.noteOnly ? "No pick yet. Your note is kept." : "No pick yet.")
      : `${styleWords(m, s)}. ${s.places.length ? placesText(m, s.places) : "Where it lives: ours"}.`;
    const tail = sv === "saving" ? " Saving…" : sv === "unsaved" ? " Not saved." : !s.saved && !s.noteOnly ? ""
      : ST.mode === "db" || ST.mode === "read" ? (whoSaved(s.by) ? ` Saved by ${whoSaved(s.by)}${savedWhen(s.at)}.` : ` Saved to the page${ST.mode === "read" ? savedWhen(s.at) : ""}.`) : ST.mode === "local" ? " Kept in this browser." : "";
    return what + tail;
  };
  function pickPanel(m) {
    const s = shown(m.key), dis = ST.mode === "read" || ST.mode === "wait" ? " disabled" : "";
    return `<div class="dm-pick" data-key="${m.key}" aria-labelledby="dm-pk-${m.key}" role="group">
      <div class="dm-pick-h"><h3 id="dm-pk-${m.key}">${esc(YOURS())}</h3><p class="dm-pick-state" aria-live="polite">${esc(stateLine(m))}</p></div>
      <div class="dm-pick-ctl">${pickCtl(m)}</div>
      <div class="dm-pick-note">
        <label for="dm-note-${m.key}">A note</label>
        <textarea id="dm-note-${m.key}" data-note="${m.key}" maxlength="500" rows="2" placeholder="Anything you want us to know about this module"${dis}>${esc(s.note || "")}</textarea>
        <p class="dm-count" aria-hidden="true">${(s.note || "").length} of 500</p>
      </div>
    </div>`;
  }
  function moduleSection(m, i) {
    const styles = stylesOf(m), sel = selOf(m), sl = spanLine(m);
    return `<section class="dm-mod" id="m-${m.key}" aria-labelledby="dm-mh-${m.key}">
      <div class="dm-mod-h">
        <p class="dm-eyebrow">${esc(`${i + 1} of ${MODS.length} · ${m.name} · ${m.label}`)}</p>
        <h2 id="dm-mh-${m.key}">${esc(m.q)}</h2>
        <p class="dm-now">${esc(m.now)}</p>
        ${sl ? `<p class="dm-now dm-now--span">${esc(sl)}</p>` : ""}
        ${learning() ? `<p class="dm-learn">${esc("These are the cards while Florin learns your usual. The words below describe them once it does.")}</p>` : ""}
      </div>
      <div class="dm-rec">
        <p class="dm-rec-say"><b>${esc(m.say)}</b> ${esc(m.why)}</p>
        ${m.differs ? `<p class="dm-rec-differs">${esc(m.differs)}</p>` : ""}
      </div>
      <div class="dm-tabs" role="tablist" aria-label="${esc(`${m.name}: the styles`)}" hidden>${styles.map((st) => `<button type="button" role="tab" id="${tabId(m, st)}" aria-controls="${optId(m, st)}" aria-selected="${st.id === sel}" tabindex="${st.id === sel ? 0 : -1}" data-tab="${m.key}" data-v="${st.id}">${esc(st.name === "Florin charts, with the week's ring" ? "With the week's ring" : st.name)}${m.rec === st.id ? `<span class="dm-vh">, recommended</span>` : ""}</button>`).join("")}</div>
      <div class="dm-rowctl" hidden><div class="dm-arrows" role="group" aria-label="${esc(`Scroll the styles for ${m.name}`)}"><button type="button" data-act="prev" aria-label="Scroll back one style">&#8249;</button><button type="button" data-act="next" aria-label="Scroll on one style">&#8250;</button></div><p class="dm-rowctl-note">${esc(`${cap1(word(styles.length))} styles side by side. The row scrolls sideways.`)}</p></div>
      <div class="dm-opts" role="region" aria-label="${esc(`${m.name} in ${word(styles.length)} styles`)}" style="--dm-n:${styles.length}" tabindex="0">${styles.map((st, j) => opt(m, st, j)).join("")}</div>
      ${pickPanel(m)}
    </section>`;
  }

  /* ---------- Insights' first card, as we recommend it: Your days at 7 days ---------- */
  function yourDaysCard() {
    const look = lookById("rings");
    if (!look || !look.components || !look.components.week) return missing("The Rings week didn't draw, so this card can't be drawn.");
    const b = box(look.components.week(X.D, ctxOf(look)));
    const h = b.querySelector(".rg-h .rg-k");
    if (h) h.textContent = `Your days · Last 7 days`;
    /* under the rings, what was different on each day, in the app's own words (L.dayWhy, as Florin charts' week card
       and History say it), then the days with nothing logged and the symptoms */
    const F = L.span(X.M, 7, MODE), lines = [];
    if (X.M.usual) {
      F.filter((f) => f.state === "shifted").forEach((f) => lines.push(L.dayWhy(X.M, f, MODE).line));
      F.filter((f) => f.logged && (f.state === "unsure" || f.state === "nocount")).forEach((f) => lines.push(L.dayWhy(X.M, f, MODE).line));
      if (F.some((f) => f.state === "flag")) lines.push(L.FLAG_DAY);
    }
    const none = F.filter((f) => !f.logged && !f.pending);
    if (none.length) lines.push(`Nothing logged on ${andJoin(none.map((f) => L.dayName(f.d)))}.`);
    const sl = L.symLine(F);
    if (sl) lines.push(sl);
    const row = b.querySelector(".rg-weekrow");
    if (row && lines.length) row.insertAdjacentHTML("afterend", `<ul class="dm-why">${lines.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`);
    return lookWrap("rings", stillHtml(b.innerHTML));
  }
  function yourDays() {
    const s = insSum(7);
    return `<section class="dm-days" id="m-days" aria-labelledby="dm-days-h">
      <div class="dm-sec-h"><p class="dm-eyebrow">After The month · Insights' first card</p><h2 id="dm-days-h">Your days, as we recommend it</h2>
        <p>${esc("Insights would open with your days: the Rings week, with what was different on each day written under it. At 30 days it would show the month in the same rings, and at 90 days a bar a week. No screen draws this yet; it is drawn here from the Rings week and the reasons Florin charts' week card gives.")}</p></div>
      <div class="dm-days-row">
        <div class="dm-opt" data-rec><header class="dm-opt-h"><span class="dm-opt-n" aria-hidden="true">1</span><div class="dm-opt-t"><h3>As we recommend it</h3><p class="dm-tags"><span class="dm-tag">Recommended</span></p><p class="dm-span">${esc(`The last 7 days, ${rangeOf(7)}`)}</p></div></header>
          <div class="dm-fig" role="group" aria-label="Your days, as we recommend it">${(() => { try { return yourDaysCard(); } catch (e) { console.error("Florin data modules: Your days failed to draw", e); return missing("This card failed to draw."); } })()}</div></div>
        <div class="dm-opt" data-app><header class="dm-opt-h"><span class="dm-opt-n" aria-hidden="true">2</span><div class="dm-opt-t"><h3>Insights' first card now</h3><p class="dm-tags"><span class="dm-tag dm-tag--app">In the app now</span></p><p class="dm-span">${esc(`The last 7 days, ${rangeOf(7)}`)}</p></div></header>
          <div class="dm-fig" role="group" aria-label="Insights' first card now">${s ? apWrap(stillHtml(s.outerHTML)) : missing("Insights doesn't draw its count on these logs.")}</div></div>
      </div>
    </section>`;
  }

  /* ---------- the Insights order, Today's order, and one look for a day ---------- */
  const orderNow = () => (P._order && P._order.order) || OUR_ORDER.slice();
  /* the app's order now, read from the Insights screen as drawn */
  const appOrder = () => {
    const b = X.ins(30);
    if (!b) return [];
    const out = [];
    b.querySelectorAll("section.ap-ic, section.ap-sum").forEach((s) => {
      if (s.classList.contains("ap-sum")) { out.push("days"); return; }
      const h = s.querySelector(".ap-ic-h[data-k]"); const k = h && INS_K[h.dataset.k]; if (k && !out.includes(k)) out.push(k);
    });
    return out;
  };
  const onInsights = (c) => c.mods.some((k) => effPlaces(k).includes("insights"));
  function orderList() {
    const ord = orderNow(), shownCards = ord.map(cardOf).filter((c) => c && onInsights(c)), off = ord.map(cardOf).filter((c) => c && !onInsights(c));
    const dis = editable() ? "" : " disabled";
    const n = shownCards.length;
    const items = shownCards.map((c, i) => `<li data-card="${c.k}">
      <span class="dm-o-n" aria-hidden="true">${i + 1}</span>
      <span class="dm-o-t"><b>${esc(c.name)}</b>${c.say ? `<em>${esc(cap1(c.say))}</em>` : ""}</span>
      <span class="dm-o-b">
        <button type="button" class="dm-ico" data-act="up" data-card="${c.k}" aria-label="${esc(`Move ${c.name} up, now ${i + 1} of ${n}`)}"${i === 0 ? " aria-disabled=\"true\"" : ""}${dis}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg></button>
        <button type="button" class="dm-ico" data-act="down" data-card="${c.k}" aria-label="${esc(`Move ${c.name} down, now ${i + 1} of ${n}`)}"${i === n - 1 ? " aria-disabled=\"true\"" : ""}${dis}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></button>
      </span>
    </li>`).join("");
    return `<ol class="dm-olist">${items}</ol>
      ${off.length ? `<p class="dm-o-off">${esc(`Not on Insights by your picks: ${andJoin(off.map((c) => c.name))}. A card comes back here when one of its modules has Insights in Where it lives.`)}</p>` : ""}`;
  }
  function orderSection() {
    const now = appOrder().map(cardOf).filter(Boolean).map((c) => c.name);
    const ourNames = OUR_ORDER.map((k) => cardOf(k).name);
    let lay = [];
    try { lay = (RU.todayLayout ? RU.todayLayout(X.M, X.V()) : []) || []; } catch (e) { lay = []; }
    const TODAY_NAMES = { hero: "FloraScore today", checkin: "The weekly check-in card, when it's due", entries: "Today's logs", week: "The last 7 days", next: "One next step" };
    /* in a sentence, every name but FloraScore starts lower case */
    const todayNow = lay.filter((k) => TODAY_NAMES[k]).map((k, i) => (i && !/^FloraScore/.test(TODAY_NAMES[k]) ? TODAY_NAMES[k].charAt(0).toLowerCase() + TODAY_NAMES[k].slice(1) : TODAY_NAMES[k]));
    const weekAfter = lay.indexOf("week") > lay.indexOf("entries") && lay.indexOf("entries") >= 0;
    const todayOurs = ["FloraScore today", "The weekly check-in card, only when it's due", "The last 7 days, the Rings card", "Today's logs", "One next step"];
    const mark = ["today marked by its shaded column in the week and an outer ring in the month", "a day noted for a clinician as a Teal ring with the info sign inside, so it is more than a colour apart from a day not counted", "a day with nothing logged as the date alone", "a dark edge on the Gold ring, so a day outside your usual is never the faintest mark", "a symptom as one Teal square under the day"];
    return `<section class="dm-order" id="m-order" aria-labelledby="dm-order-h">
      <div class="dm-sec-h"><p class="dm-eyebrow">After the ${esc(word(MODS.length))} · How to organise</p><h2 id="dm-order-h">Order of Insights</h2>
        <p>The cards you keep on Insights, in your order. A card shows here while one of its modules has Insights in Where it lives (yours, or ours where you haven't picked). Up and Down move a card.</p>
        <p><a class="dm-inl" href="#m-days">See Your days, the first card, as we recommend it</a></p></div>
      <div class="dm-order-grid">
        <div class="dm-order-main">
          <div class="dm-olist-box">${orderList()}</div>
          <div class="dm-order-acts"><button type="button" class="dm-btn dm-btn--line" data-act="order-reset"${editable() ? "" : " disabled"}>Back to our order</button><p class="dm-order-state" aria-live="polite"></p></div>
          <p class="dm-order-now">${esc(`Our order: ${ourNames.join(", ")}.`)}</p>
          ${now.length ? `<p class="dm-order-now">${esc(`The app's order now: ${now.join(", ")}.`)}</p>` : ""}
        </div>
        <div class="dm-order-why">
          <h3>Why our order</h3>
          <ul>
            <li>"See these days on Insights" on Today's week card lands on the first card, which answers the same question with the reasons.</li>
            <li>Then comes the score.</li>
            <li>Then its four parts, in the order of their weight in it.</li>
            <li>Then the answers that build up over weeks.</li>
          </ul>
          <h3>Today, top to bottom, as we recommend</h3>
          <ol>${todayOurs.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
          ${todayNow.length ? `<p>${esc(`Now: ${todayNow.join(", ")}.${weekAfter ? " The week sits after today's logs. We recommend it under FloraScore and the check-in, so the two answers about how things are going sit together, before the list of today's logs." : ""}`)}</p>` : ""}
          <p>Tell us in the note below if you want Today in another order.</p>
        </div>
      </div>
      <div class="dm-mark">
        <h3>One look for a day, everywhere</h3>
        <p>${esc(`Today's week card now draws a day as a ring. History's calendar, History's day headers and the Your days page draw it as a filled circle. We recommend the ring everywhere a day is drawn, so the same Wednesday looks the same on every screen; the Easy version keeps its larger filled circles. To carry every day the way the circle does now, the ring needs ${word(mark.length)} things:`)}</p>
        <ul>${mark.map((t) => `<li>${esc(cap1(t))}.</li>`).join("")}</ul>
        <p>${esc("The month's and History's options with the week's ring, above, are drawn this way.")}</p>
      </div>
    </section>`;
  }
  function pageNote() {
    const t = (P._page && P._page.text) || "", dis = ST.mode === "read" || ST.mode === "wait" ? " disabled" : "";
    return `<section class="dm-pnote" id="m-note" aria-labelledby="dm-pn-h">
      <div class="dm-sec-h"><h2 id="dm-pn-h">Anything else</h2><p>A note for the whole page. It saves with your picks.</p></div>
      <label class="dm-vh" for="dm-pagenote">A note for the whole page</label>
      <textarea id="dm-pagenote" data-note="_page" maxlength="1000" rows="4" placeholder="How you'd like the data organised overall"${dis}>${esc(t)}</textarea>
      <p class="dm-count" aria-hidden="true">${t.length} of 1000</p>
      ${statusBox("foot")}
    </section>`;
  }
  function foot() {
    return `<footer class="dm-foot"><p data-disclaimer>${esc(X.D.disclaimer || "")}</p><p>Every number on the cards is computed from the demo person's logs. Change the person, the logs or the theme above, and every card redraws.</p><p>Prototype only. Not for patients.</p></footer>`;
  }

  /* ---------- draw ---------- */
  /* where the viewer is: the first section still in view under the bar, how far down it starts, and each row's
     sideways place, so a redraw puts them back */
  const SECTIONS = ".dm-sum, .dm-mod, .dm-days, .dm-order, .dm-pnote";
  function where() {
    const secs = [...mount.querySelectorAll(SECTIONS)];
    if (!secs.length) return null;
    const bar = mount.querySelector(".dm-ctls");
    const barB = bar && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().bottom : 0;
    const a = secs.find((s) => s.getBoundingClientRect().bottom > barB + 8);
    const rows = {};
    mount.querySelectorAll(".dm-mod").forEach((s) => { const r = s.querySelector(".dm-opts"); if (r) rows[s.id] = r.scrollLeft; });
    return { id: a && window.scrollY > 0 ? a.id : null, top: a ? a.getBoundingClientRect().top : 0, rows };
  }
  function goBack(w) {
    if (!w) return;
    Object.keys(w.rows).forEach((id) => { const r = mount.querySelector(`#${id} .dm-opts`); if (r) r.scrollLeft = w.rows[id]; });
    const a = w.id && document.getElementById(w.id);
    if (a) window.scrollTo({ top: Math.max(0, window.scrollY + a.getBoundingClientRect().top - w.top), behavior: "instant" });
  }
  function render() {
    const w = where();
    build();
    mount.setAttribute("data-size", S.size);
    const mods = MODS.map(moduleSection);
    const at = MODS.findIndex((m) => m.key === "month") + 1;
    mount.innerHTML = `${head()}${ctls()}${summary()}${mods.slice(0, at).join("")}${yourDays()}${mods.slice(at).join("")}${orderSection()}${pageNote()}${foot()}`;
    wireRows();
    goBack(w);
    window.FLMOD.drawn = (window.FLMOD.drawn || 0) + 1;
  }
  /* the picks changed: the summary, the pick panels, the order and the status redraw in place; the cards don't */
  let pickRaf = 0;
  function refreshPicks() { if (!pickRaf) pickRaf = requestAnimationFrame(() => { pickRaf = 0; doRefresh(); }); }
  function doRefresh() {
    if (!X) return;
    const a = document.activeElement;
    const fkey = a && mount.contains(a) && a.matches("button") ? focusKey(a) : null;
    mount.querySelectorAll(".dm-status").forEach((s) => { s.querySelector(".dm-status-top").innerHTML = statusHtml(s.dataset.status === "top"); });
    const tb = mount.querySelector(".dm-t-b"); if (tb) tb.innerHTML = summaryRows();
    const th = mount.querySelector(".dm-t-yours"); if (th) th.textContent = YOURS();
    MODS.forEach((m) => {
      const pk = mount.querySelector(`.dm-pick[data-key="${m.key}"]`);
      if (!pk) return;
      pk.querySelector(".dm-pick-h h3").textContent = YOURS();
      pk.querySelector(".dm-pick-state").textContent = stateLine(m);
      pk.querySelector(".dm-pick-ctl").innerHTML = pickCtl(m);
      const ta = pk.querySelector("textarea");
      const s = shown(m.key);
      ta.disabled = ST.mode === "read" || ST.mode === "wait";
      if (ta !== document.activeElement && ta.value !== (s.note || "")) { ta.value = s.note || ""; countOf(ta); }
    });
    const pn = mount.querySelector("#dm-pagenote");
    if (pn) { pn.disabled = ST.mode === "read" || ST.mode === "wait"; const t = (P._page && P._page.text) || ""; if (pn !== document.activeElement && pn.value !== t) { pn.value = t; countOf(pn); } }
    const ob = mount.querySelector(".dm-olist-box"); if (ob) ob.innerHTML = orderList();
    const orr = mount.querySelector('[data-act="order-reset"]'); if (orr) orr.disabled = !editable();
    names();
    if (fkey) {
      const nb = mount.querySelector(fkey);
      if (nb && !nb.disabled) nb.focus({ preventScroll: true });
      /* the button pressed went away (Take ours, once every module is picked): focus stays near, on Copy my picks */
      else if (/take-all/.test(fkey)) { const c = mount.querySelector('.dm-status[data-status="top"] [data-act="copy"]'); if (c) c.focus({ preventScroll: true }); }
    }
  }
  /* the names of whoever saved the picks on show, as this viewer sees them; once they come, the lines redraw */
  let naming = false;
  function names() {
    if (naming || !ST.user || typeof ST.user.profiles !== "function" || (ST.mode !== "db" && ST.mode !== "read")) return;
    const ids = [...new Set(Object.values(P.picks).map((p) => p.by).filter((b) => b && b !== ST.uid && !(b in ST.names)))];
    if (!ids.length) return;
    naming = true;
    ST.user.profiles(ids).then((ps) => {
      ids.forEach((id) => { ST.names[id] = (ps && ps[id] && ps[id].name) || ""; });
      naming = false;
      refreshPicks();
    }, () => { ids.forEach((id) => { ST.names[id] = ""; }); naming = false; });
  }
  const focusKey = (b) => {
    const d = b.dataset;
    if (d.act && d.key && d.v) return `[data-act="${d.act}"][data-key="${d.key}"][data-v="${d.v}"]`;
    if (d.act && d.card) return `[data-act="${d.act}"][data-card="${d.card}"]`;
    if (d.act && d.key) return `[data-act="${d.act}"][data-key="${d.key}"]`;
    const st = b.closest(".dm-status");
    if (d.act && st) return `.dm-status[data-status="${st.dataset.status}"] [data-act="${d.act}"]`;
    if (d.act) return `[data-act="${d.act}"]`;
    return null;
  };
  const countOf = (ta) => { const c = ta.parentElement.querySelector(".dm-count"); if (c) c.textContent = `${ta.value.length} of ${ta.maxLength}`; };

  /* ---------- a row of styles: all in view from 1280 (cards drawn smaller), a row that scrolls sideways from 820 (with
     Previous and Next while it's wider than the window), and tabs, one style at a time, under 820 ---------- */
  const WIDE = "(min-width: 820px)", FIT = "(min-width: 1280px)";
  const mq = (q) => !window.matchMedia || window.matchMedia(q).matches;
  const wide = () => mq(WIDE);
  const fitting = () => S.size === "fit" && mq(FIT);
  const CARD_W = 390;
  function markRows() {
    const tabs = !wide(), fit = fitting();
    mount.querySelectorAll(".dm-mod").forEach((sec) => {
      const r = sec.querySelector(".dm-opts"), ctl = sec.querySelector(".dm-rowctl"), tl = sec.querySelector(".dm-tabs");
      if (!r || !ctl) return;
      /* all in view: each card scaled to its column */
      if (fit) {
        const n = +(r.style.getPropertyValue("--dm-n") || 6), gap = parseFloat(getComputedStyle(r).columnGap) || 16;
        const col = (r.clientWidth - gap * (n - 1)) / n;
        r.style.setProperty("--dm-z", String(Math.min(1, Math.floor((col / CARD_W) * 1000) / 1000)));
      }
      /* tabs under 820: one style at a time, the picked tab's */
      if (tl) {
        tl.hidden = !tabs;
        const key = sec.id.slice(2), m = modOf(key), sel = m ? selOf(m) : null;
        sec.querySelectorAll(".dm-opt").forEach((o) => {
          const tid = `dm-tab-${key}-${o.dataset.style}`;
          if (tabs) { o.setAttribute("role", "tabpanel"); o.setAttribute("aria-labelledby", tid); o.hidden = o.dataset.style !== sel; }
          else { o.removeAttribute("role"); o.setAttribute("aria-labelledby", `dm-o-${key}-${o.dataset.style}`); o.hidden = false; }
        });
      }
      const over = wide() && !fit && r.scrollWidth > r.clientWidth + 1;
      ctl.hidden = !over;
      r.setAttribute("tabindex", over ? "0" : "-1");
      const [pv, nx] = ctl.querySelectorAll("button");
      if (pv) pv.disabled = !over || r.scrollLeft <= 1;
      if (nx) nx.disabled = !over || r.scrollLeft >= r.scrollWidth - r.clientWidth - 1;
      const a = document.activeElement;
      if (a && a.disabled && ctl.contains(a)) { const o = [...ctl.querySelectorAll("button")].find((x) => !x.disabled); if (o) o.focus({ preventScroll: true }); }
    });
  }
  let rowRaf = 0;
  const rowsSoon = () => { if (!rowRaf) rowRaf = requestAnimationFrame(() => { rowRaf = 0; markRows(); }); };
  function wireRows() {
    mount.querySelectorAll(".dm-opts").forEach((r) => r.addEventListener("scroll", rowsSoon, { passive: true }));
    markRows();
  }
  function step(sec, dir) {
    const r = sec.querySelector(".dm-opts");
    if (!r) return;
    const c = r.querySelector(".dm-opt");
    const gap = parseFloat(getComputedStyle(r).columnGap) || 0;
    const w = c ? c.getBoundingClientRect().width + gap : CARD_W + 24;
    const left = Math.max(0, Math.min(r.scrollWidth - r.clientWidth, Math.round((r.scrollLeft + dir * w) / w) * w));
    r.scrollTo({ left, behavior: reduced() ? "auto" : "smooth" });
  }
  function pickTab(key, v, focus) {
    const m = modOf(key);
    if (!m || !stylesOf(m).some((s) => s.id === v)) return;
    S.tab[key] = v;
    const sec = mount.querySelector(`#m-${key}`);
    if (!sec) return;
    sec.querySelectorAll('[role="tab"]').forEach((t) => { const on = t.dataset.v === v; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    markRows();
  }
  window.addEventListener("resize", rowsSoon, { passive: true });
  [WIDE, FIT].forEach((q) => { if (window.matchMedia) { const mm = window.matchMedia(q); const on = () => markRows(); if (mm.addEventListener) mm.addEventListener("change", on); else if (mm.addListener) mm.addListener(on); } });
  /* the system's theme, while the viewer hasn't picked one */
  if (window.matchMedia) { const mm = window.matchMedia("(prefers-color-scheme: dark)"); const on = () => { if (!S.theme) render(); }; if (mm.addEventListener) mm.addEventListener("change", on); else if (mm.addListener) mm.addListener(on); }

  /* ---------- Copy my picks: plain text, no dashes ---------- */
  const MON = Ut.MON;
  function fmtDay(iso) { const d = new Date(iso); return isNaN(d) ? "" : `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
  function copyText() {
    const lines = ["Florin data modules: picks"];
    if (ST.mode === "db" || ST.mode === "read") {
      const ats = Object.values(P.picks).map((p) => p.at).concat(P._order ? P._order.at : null, P._page ? P._page.at : null).filter(Boolean).sort();
      lines.push(ats.length ? `Saved to the page on ${fmtDay(ats[ats.length - 1])}` : "Saved to the page");
    } else lines.push("Kept in this browser only");
    lines.push("");
    MODS.forEach((m, i) => {
      const s = shown(m.key);
      const t = pickLine(m.key) || `No pick yet (we recommend ${m.short}).`;
      lines.push(`${i + 1}. ${m.name}: ${t}${s.note ? ` Note: ${s.note.replace(/\s+/g, " ").trim()}` : ""}`);
    });
    lines.push("");
    const ord = orderNow().map(cardOf).filter((c) => c && onInsights(c)).map((c) => c.name);
    lines.push(`Insights order: ${ord.join(", ")}.${P._order ? "" : " (ours)"}`);
    const pn = P._page && P._page.text ? P._page.text.replace(/\s+/g, " ").trim() : "";
    lines.push(`Page note: ${pn || "none"}`);
    return lines.join("\n");
  }
  async function copy(btn) {
    const text = copyText();
    const st = btn.closest(".dm-status");
    const cb = st && st.querySelector(".dm-copybox");
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!cb) return;
    cb.hidden = false;
    if (ok) cb.innerHTML = `<p class="dm-copy-ok">Copied. Paste it into a message to send your picks.</p>`;
    else {
      cb.innerHTML = `<label for="dm-copy-${st.dataset.status}">Your picks, ready to copy. Select all and copy.</label><textarea id="dm-copy-${st.dataset.status}" readonly rows="10"></textarea>`;
      const ta = cb.querySelector("textarea"); ta.value = text; ta.focus(); ta.select();
    }
  }

  /* ---------- presses ---------- */
  function setPick(k, change) {
    if (!editable()) return;
    const s = shown(k);
    const base = { v: 1, module: k, style: s.style, places: (s.places || []).slice(), note: s.note || "" };
    const body = clean.pick(k, stamp(Object.assign(base, change(base))));
    put(k, body);
  }
  function move(card, dir) {
    if (!editable()) return;
    const ord = orderNow().slice();
    const vis = ord.filter((k) => onInsights(cardOf(k)));
    const i = vis.indexOf(card), j = i + dir;
    if (i < 0 || j < 0 || j >= vis.length) return;
    const a = ord.indexOf(vis[i]), b = ord.indexOf(vis[j]);
    [ord[a], ord[b]] = [ord[b], ord[a]];
    put("_order", stamp({ v: 1, order: ord }));
    const live = mount.querySelector(".dm-order-state");
    if (live) live.textContent = `${cardOf(card).name} is now ${j + 1} of ${vis.length}.`;
  }
  /* Take ours for every module not picked yet: our style and places, any note kept */
  function takeAll() {
    if (!editable()) return;
    const ms = unpicked();
    ms.forEach((m) => setPick(m.key, () => ({ style: m.rec, places: m.places.slice() })));
    const live = mount.querySelector('.dm-status[data-status="top"] .dm-status-live');
    if (live) live.textContent = ms.length ? `Our recommendation is now your pick for ${word(ms.length)} ${ms.length === 1 ? "module" : "modules"}.` : "Every module has a pick.";
  }
  mount.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !mount.contains(b) || b.disabled || b.closest(".dm-fig")) return;
    if (b.getAttribute("aria-disabled") === "true") return;
    const d = b.dataset;
    if (d.view) {
      if (d.view === "theme") { S.theme = d.v; root.setAttribute("data-theme", d.v); }
      else S[d.view] = d.v;
      saveView(); render();
      const nb = mount.querySelector(`[data-view="${d.view}"][data-v="${d.v}"]`); if (nb) nb.focus({ preventScroll: true });
      return;
    }
    if (d.tab) { pickTab(d.tab, d.v, false); return; }
    const sec = b.closest(".dm-mod");
    switch (d.act) {
      case "prev": case "next": step(sec, d.act === "next" ? 1 : -1); return;
      case "style": setPick(d.key, (o) => ({ style: o.style === d.v && shown(d.key).saved ? null : d.v })); return;
      case "place": setPick(d.key, (o) => {
        let pl = o.places.filter((p) => p !== d.v);
        if (!o.places.includes(d.v)) pl = d.v === "cut" ? ["cut"] : pl.filter((p) => p !== "cut").concat(d.v);
        return { places: placeList(modOf(d.key)).map((x) => x[0]).filter((p) => pl.includes(p)) };
      }); return;
      case "ours": { const m = modOf(d.key); setPick(d.key, () => ({ style: m.rec, places: m.places.slice() })); return; }
      case "take-all": takeAll(); return;
      case "confirm": setPick(d.key, () => ({})); return;
      case "clear": {
        if (!editable()) return;
        const note = shown(d.key).note;
        if (note) { put(d.key, clean.pick(d.key, stamp({ v: 1, module: d.key, style: null, places: [], note }))); return; }
        delete P.picks[d.key];
        if (ST.mode === "local") { writeLocal(); ST.saved[d.key] = ""; refreshPicks(); return; }
        const q = Q[d.key] || (Q[d.key] = { busy: false, next: null }); q.next = DEL; ST.saved[d.key] = "saving"; refreshPicks(); if (!q.busy) pump(d.key);
        return;
      }
      case "up": case "down": move(d.card, d.act === "up" ? -1 : 1); return;
      case "order-reset": if (editable()) { put("_order", stamp({ v: 1, order: OUR_ORDER.slice() })); const live = mount.querySelector(".dm-order-state"); if (live) live.textContent = "Back to our order."; } return;
      case "copy": copy(b); return;
      case "import": {
        const loc = readLocal();
        ST.offer = false;
        KEYS.forEach((k) => { if (loc.picks[k]) put(k, stamp(Object.assign({}, loc.picks[k]))); });
        if (loc._order) put("_order", stamp(Object.assign({}, loc._order)));
        if (loc._page) put("_page", stamp(Object.assign({}, loc._page)));
        refreshPicks();
        return;
      }
      default:
    }
  });
  /* notes: saved a second after typing stops, and on leaving the box */
  const noteT = {};
  const saveNote = (ta) => {
    const k = ta.dataset.note;
    clearTimeout(noteT[k]);
    if (!editable()) return;
    if (k === "_page") { const cur = (P._page && P._page.text) || ""; if (ta.value !== cur) put("_page", stamp({ v: 1, text: ta.value.slice(0, 1000) })); return; }
    if (ta.value !== (shown(k).note || "")) setPick(k, () => ({ note: ta.value.slice(0, 500) }));
  };
  mount.addEventListener("input", (e) => {
    const ta = e.target.closest("textarea[data-note]");
    if (!ta) return;
    countOf(ta);
    clearTimeout(noteT[ta.dataset.note]);
    noteT[ta.dataset.note] = setTimeout(() => saveNote(ta), 1000);
  });
  mount.addEventListener("focusout", (e) => { const ta = e.target.closest && e.target.closest("textarea[data-note]"); if (ta) saveNote(ta); });
  mount.addEventListener("keydown", (e) => {
    /* the tabs: Left and Right move between styles, Home and End to the first and last */
    const t = e.target.closest && e.target.closest('[role="tab"][data-tab]');
    if (t) {
      const all = [...t.parentElement.querySelectorAll('[role="tab"]')], i = all.indexOf(t);
      const j = e.key === "ArrowRight" ? (i + 1) % all.length : e.key === "ArrowLeft" ? (i - 1 + all.length) % all.length : e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault(); pickTab(t.dataset.tab, all[j].dataset.v, true);
      return;
    }
    /* arrow keys in a focused row of styles move it a style at a time */
    const r = e.target.closest && e.target.closest(".dm-opts");
    if (!r || e.target !== r || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault(); step(r.closest(".dm-mod"), e.key === "ArrowRight" ? 1 : -1);
  });

  window.FLMOD = { render, state: S, picks: () => P, store: ST, MODS, STYLES, copyText, refreshPicks };
  render();
  /* db after the first paint */
  setTimeout(connect, 0);
})();
