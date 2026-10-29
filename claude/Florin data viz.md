# Florin data viz

October 28, 2026, revised the same day after a review, again after the fix pass (fix-viz), and after the finishing pass
(finish-viz): this file now says what is built. The one list of what the Florin app draws, and how. It comes from two audits of the prototype: one of every
chart's design (both themes, all six data styles, 390 and 1440 wide) and one of every number against the model. It sits
under DESIGN.md's Data Visualization rules. Where it asks DESIGN.md to change, it says so and leaves the change to the
studio.

**What was off in Will's screenshot** (Today's week card, As built, Marcus at 12 weeks):

- It never answers the question. Three strips answer three questions, and every other screen says "4 of 6 days within
  your usual". The card says 7 of 8 BMs and 5 of 6 mornings, and doesn't say which unit it means.
- One dot means two things. In the BMs row a dot is a BM and Plum means its form; in the First BM row a dot is a
  morning and Plum means its time. Wednesday is Plum in one row and Gold in the next, with no word saying why.
- An empty Thursday is drawn four times: a struck-through date and a hatched cell in each strip.
- Rings mean today, a change and a clinician note. The hollow Gold ring is too faint to see (2.37:1 on the card).
- Symptoms are grey, which isn't one of the app's colours, and the legend shows two shades when only one is drawn.
- "14 meals logged" answers nothing, and the legend runs to four lines.
- It counts Monday to today, while Insights, Easy and every data look count the last 7 days. In the demo today is a
  Sunday, so nobody sees the difference; on any other day of the week they disagree.

---

## 1. The marks

One set of marks for every screen. **Shape says what a thing is. Colour says how it reads against your usual. A word
says it again**, so colour is never the only cue.

**A day** (Today's week, History's calendar and day headers, Easy's week and month, Your days). One renderer draws it
everywhere, so the same day always looks the same.

| A day that was | Mark | Its word |
|---|---|---|
| Within your usual | A filled Plum circle (Ray on dark), the date inside in Cream (the card colour on dark) | Within your usual |
| Outside your usual | A filled Gold circle with a 1.5px Shift Ink edge in light (no edge on dark), the date inside in Forest (the card colour on dark), and always a line naming what was different | Outside your usual |
| Logged but not counted: a BM word that could be either, only symptoms or meals, or any logged day before day 14 | A filled Ink 3 circle, the date in Cream (the card colour on dark), and a line saying why. Before day 14 every logged day is Logged, symptoms-only days too (one rule for the week card, History, the calendar, Insights and Easy) | Not counted (before day 14: Logged) |
| Nothing logged | No circle. The date stays, in Ink 3. Never a hatch, a strike-through, a grey column or a zero | Nothing logged |
| Today | A 2px Ink ring, 2px out from today's circle, and the word Today under it. No ring when nothing is logged yet, or when today is flagged | Today |
| Today, flagged for a clinician | A 2px Teal ring with the info glyph inside and no fill, before day 14 as after it, with the flag line. In no count | Noted for a clinician |
| A symptom that day | One 8px Teal square under the day, whatever the strength. Strength is said in words | Symptoms |
| Before you started | The date only, in Ink 3, at the left of the row. Never named | none |

**In a chart** (Insights cards, detail pages, Ask Florin):

| What | Mark |
|---|---|
| Your usual | The band, named in words on or right under the chart |
| A reading within your usual | The reading colour, inside the band. Position says within |
| A reading outside your usual | Gold with an edge (Shift Ink in light, a deeper Gold on dark), and a word or direct label saying which way ("later", "firmer", "fewer") |
| A count of days (the summary bar, Your days, the 90-day weekly bars) | Plum within your usual (Ray on dark), Gold outside it: the colour of a day, since each unit is a day. The reading colour is only for a measured value (a time, a count of BMs, a form) |
| FloraScore | Always the reading colour, inside the band or not. The words say "in its usual range", "a little above" or "a little below". Never Gold |
| Could be either, or logged before day 14 | Ink 3. A word that covers two forms is an Ink 3 span over both steps on the Today bar, never a dot between them; it sits in no form bar, and a line under the bars says so, so they add up to the count |
| No BM | A reading of 0: a dot on the 0 line, Gold when 0 is outside your usual count, labelled No BM. Never a dash or a ring |
| Nothing logged | Nothing drawn: no dot, no bar, the line breaks, the date label stays in Ink 3 |
| Today | Today's point ringed in Ink and labelled Today, only when today has a reading: no other point is ever ringed or labelled. The x axis ends on Today, with nothing drawn above it when today has no reading yet |
| Today, flagged | A Teal ring at its place with nothing inside, labelled Noted for a clinician, in no count |
| A symptom | One Teal square on each day it came up, at 7 and 30 days; at 90 days, Teal bars of days a week. Strength in words and in the table, never in the mark's size |
| A meal or a late dinner | A Teal tick in its own labelled row or column, never a dot that could be read as a BM |

**The tokens.** Code names the token for each role, never a hex. The values are the resolved colours, for checking.

| Role | Token | Light | Dark |
|---|---|---|---|
| A day within your usual | `--ap-signal` | Plum `#4F2641` | Ray `#EEFFA3` |
| A day or a reading outside your usual | `--ap-shift`; a day's edge `--ap-day-edge`, a chart mark's `--ap-chart-edge` | `#C2A64B`, edge `#695612` (both) | `#DCC374`; a day circle has no edge, a chart mark a 1.5px edge of Gold mixed 45% into the card (refresh.css) |
| Not counted, axes and ticks | `--ap-ink3` | `#5D766F` (refresh.css's darker Ink 3) | `#8EA7A0` |
| Context, symptoms and the flag | `--ap-teal` | Teal `#396E7C` | `#8EC0CD` |
| Your usual band | `--ap-band`, edge `--ap-band-edge` | Plum at 14%, edge 32% | Ray at 17%, edge 40% |
| The reading on a chart | `--ap-chart` | Forest | Ray (Cream proposed, open call 2) |
| On the FloraScore hero card | the band Ray at 16%, the dot `--ap-hero-ink` with a 2px `--ap-hero` ring | Cream on Forest | Cream on dark Card 2 |

Never `--ap-plum` for a mark (on dark it is a pale plum, `#C8A9BC`, too close to Ink 3 to tell apart), and never
`--ap-usual` (it is the ink colour, not your usual).

**The date inside a filled circle** is 4.5:1 or more on its fill: Cream on Plum 11.6:1, Cream on Ink 3 4.58:1, Forest
on Gold 5.73:1; on dark, the card colour on Ray 13.1:1, on Gold 8.2:1, on Ink 3 5.5:1. Cream on the studio's lighter
Ink 3 would be 3.8:1, so the library takes refresh.css's darker Ink 3 too.

**The rules.**

- **A ring around a day or a data point means today (Ink) or a flagged today (Teal), nothing else.** Not a change, not
  No BM, not a day with nothing logged, not last week. The FloraScore glyph (a small plain circle beside the word
  FloraScore) is a name, not a mark: it never holds a value and never fills toward 100. One exception is built: the
  check-in strips ring the latest week answered, which on the evening this week's is due is last week; the legend
  names it "Latest week". Whether it should wait for this week's answers is a small call for the studio.
- **Plum is your usual, only:** the band, a day within it, a count of days within it (the weekly bars too), the "about
  the same" chip on the check-in. Not a pattern that held, not an average line, not a picked tier, not a comparison with
  the stretch before (the Symptoms detail's trend chips are plain).
- **Gold is outside your usual, only**, either way, always with its word: a day's state, or one measure's reading
  (a time, a count, a form). Not a week-on-week change, not "down", and never FloraScore.
- **FloraScore is a reading, never a day's state.** It blends the last 3 logged days, so it can sit a little above
  its usual range on a day that was within your usual. Drawn in the reading colour with its words, it never looks like
  it disagrees with the day.
- **Teal is context and the clinician note:** shown, never read against your usual and never changing colour.
  Symptoms are compared with your usual in words only ("Symptoms on 2 of 7 days; your usual is about 1 day in 3").
- **The reading colour is for charts.** It never sits next to Plum as a second state: the validator puts Plum and
  Forest 13.3 apart for full colour vision and 4.5 for red-weak vision, too close to tell apart without a cue. So the
  words carry it: a Plum legend counts days ("<n> days within your usual", "Days in your window", "Days with a usual
  count"), and a Forest legend names a reading ("In your usual window"), so a card that goes from dots at 30 days to
  weekly bars at 90 says which it is drawing.
- **One meaning for "within your usual":** a day whose first BM came in your window, with a usual count and usual
  forms. Each measure has its own words: in your usual window, a usual count, in your usual forms, and for FloraScore,
  in its usual range ("In its usual range", "A little above its usual range", "Above its usual range" from 6 points
  out), one helper (`RU.scoreRel`) for the hero, Insights, Day first, Easy, Ask Florin and the data looks.
- **Words, the same everywhere:** Within your usual, Outside your usual, Not counted, Logged, Nothing logged, No BM,
  Today, Noted for a clinician, Mild, Moderate, Strong, Strength not said. Retire Outside it, Outside them, Shifted,
  Something shifted, Not logged, No logs and No BMs logged (as a mark's word). The sweep checks for them (K1: on every
  screen it opens, and in a pass of its own over every data style, person, range and Ask Florin answer).
- **Legends:** only for a mark the chart doesn't name itself, only for marks drawn, three lines at most. The best
  legend is a line of text that starts with the mark it explains.
- **A number only when it is the point:** counts a person logged ("5 of 6 days"), not percents of them, not decimals
  of points ("+3", never "+3.0" or "+0.0").
- **Axes come from the data.** FloraScore's y axis runs from the lowest score shown (or the usual range's low end,
  whichever is lower) minus 5, to the highest (or the range's high end) plus 5, rounded out to 5 and never over 100,
  with three to five round ticks. A count axis runs from 0 to the largest of 3, the usual count's top plus 1, and the
  highest day's count. Nothing typed.
- **Every chart has a table twin**, open under it: the week row and the calendar are lists for screen readers ("Wednesday,
  October 7: outside your usual, first BM later than usual"); the count line is Day, BMs, Within your usual count;
  the symptom rows are Day, Symptom, Strength; the part bars are Part, Last week, This week, Moved.
- **Taps:** the week card's circles are not buttons (the card's link opens Insights). The calendar's days are buttons
  with 44px hit areas.
- **Sizes:** day circles 28px (32px in Easy, 40px with the today ring, which fits Easy's 43px columns at 390); chart
  marks 8px at least; Gold edge 1.5px; rings 2px; marks round at 2px (radius xs). Spacing on the DESIGN.md scale.
- **Crowding:** past 7 days, each dot on the count line and the form plot sits on a card-colour disc 1.5px wider, so
  neighbours stay apart instead of running into bars. A label sits above the band and every stack, never on an edge.
- **Steps are steps:** a range bar over a scale of steps (BMs a day, forms) pads the band and the axis half a step
  either side, as the count line does, so a reading of 1 sits inside a usual of 1 to 2, never on its edge.
- **No count-up** on any number, in any data style: a number that counts up sits beside a reading it doesn't have.

**Checked with the dataviz validator.** The filled day marks (Plum, Gold, Ink 3) pass separation in light (worst
19.6 for colour blindness, 22.1 for full colour vision) and in dark (Ray, Gold, Ink 3: 13.3 and 15.5). Dark Gold and
Ray are 15.4 apart for full colour vision, just over the floor, so every Gold day is also named in a line, in both
themes; in a chart, where points aren't named one by one, a dark Gold mark also carries a deeper Gold edge, so it reads
apart from the Ray marks beside it. Teal and Ink 3 are too close to share a shape (5.6 in light, 7.9 in dark), so the flag
is a ring and "not counted" is a fill. Light Gold is 2.37:1 on the card; the Shift Ink edge (7.13:1) makes every Gold mark visible. The
brand colours fail the validator's lightness and chroma bands for a categorical palette; that's expected, since these
are fixed roles, not series.

---

## 2. The right set

Every visual in the app. Question is the title the chart would carry. Call: keep, change, cut, or add.

| # | Screen | Question | Form | Call | What was wrong, and why |
|---|---|---|---|---|---|
| 1 | Today, FloraScore (Score first) | How is FloraScore today against its usual range? | The big number; a range bar with your usual range labelled with its two numbers and today's dot, no numbers at the bar's ends; one sentence (section 4) | Change | A ring filling toward 100 reads as a grade. At 124px Marcus's 76 to 82 is a 22-degree arc, so a score one point above it sits on the label. Your usual was drawn twice, once unlabelled. The "+1 vs last week" pill compared averages beside today's number. The 30-day line was the fourth copy of the trend, so it moves to Insights |
| 2 | Today, FloraScore while learning | When does my FloraScore start? | "Day 5 of 14" in words over 14 small steps | Change | The day number sat where the score sits, so 5 read as a score. Learning was drawn three times on Today and Insights |
| 3 | Today, the last 7 days (Score first and Day first) | How many of my last 7 days sat within my usual? | One answer, a row of seven days, a line for each day not within | Change | Section 3 |
| 4 | Today, check-in card | Is my check-in due? | Text and the calendar icon | Keep | Its due dot was the same mark as a logged BM |
| 5 | Today, Day first's chip and marked log | How is today, and which log stood out? | The FloraScore glyph and number in a chip; a chip on the log that stood out | Change | The chip's ring was a gauge at 24px, too small to show your usual: it becomes the glyph, and the chip's word carries the reading. A symptom's edge was Ink here and Teal elsewhere: make it Teal |
| 6 | Insights, FloraScore | Has FloraScore stayed in its usual range? | A line on the band, today ringed and labelled; one sentence on the part that moved most (every part named on a tie: "Timing and form moved it most this week, adding 2 points each") | Change | Two charts in one card. Four part bars in the 90s that look the same, labelled "today" but showing this week. An area fill hid the band |
| 7 | Insights, the summary | How many days sat within my usual? | The count over a segment bar of the days read (within, outside); not counted and nothing logged in words under it | Change | The bar showed 4 of 7 under "4 of 6": it added a nothing-logged segment (1.16:1, invisible) and dropped the days that could be either. Gold had no edge. Its words differed from every other card |
| 8 | Insights, Timing | Did my first BM come in my usual window? | Dots on a straight time axis, your window as a band; today's label above the band, with a lead down to its dot | Keep | Gold under 3:1. The flag ring and the today ring differed only by hue |
| 9 | Insights, How often | Did I go my usual number of times? | One dot per day on a count line from 0, your usual count as a band | Change | Thin bars at 1 or 2 read as a barcode. No BM was a ring. Today wasn't marked. The average counted the flagged day. A fixed 0 to 3 axis would clip the first person with 4 |
| 10 | Insights, Form | Were my BMs my usual forms? | Bars by form with their counts, your usual forms bracketed | Change | Outside your usual was grey here and Gold everywhere else, under the same words. Percents added up to 102 |
| 11 | Insights, Symptoms | How often did symptoms come up? | One row per symptom, a Teal square on each day it came up (four rows on the card, the rest named under it: "Also logged: cramping on 1 day"); an Any symptom row with your usual written at its end; strength in the sentence | Change | Square size meant strength at 7 days and frequency at 90, so one chart asked two questions. Mild failed contrast. Strength not said drew as mild. Four colours for one fact |
| 12 | Insights, Weekly check-in | Are my answers like my first weeks? | Each question with this week's answer and one chip; the trends stay on the detail | Change | Strips with no scale words and 5px dots. See "The weekly check-in" under this table |
| 13 | Insights, Possible patterns | Does something tend to come before a change? | Title, tier, "20 of 22 times" | Change | Plum dots meant "it held", and repeated the count beside them |
| 14 | FloraScore detail, today | Where is today against its usual range? | The hero's block: the number, the sentence, the range bar with the last 90 days' Lowest and Highest named (the hero's bar names only the band); the week as a neutral chip of averages | Change | Today was drawn twice, as a ring and as a range bar. The usual arc was unlabelled. The week chip was Gold, which means outside your usual |
| 15 | FloraScore detail, 30 days | Has FloraScore stayed in its usual range? | "In its usual range on N of 30 days"; a line on the band, today ringed and labelled, the y axis from the data | Change | Four layers where DESIGN allows two. The average line looked like a second usual, and its label hit the line at 390 |
| 16 | FloraScore detail, what moved it | Which part moved my score this week? | Four rows, a bar each from a centre line in the reading colour, in whole points that add up to the change, with words ("Timing added 2 points", "How often didn't move") | Change | Teal meant up and Gold meant down. "+0.0". A part showed two different changes on one page with no unit. Rounded parts could fail to add up |
| 17 | Timing detail, today and the window | Did today's first BM come in my window? | Range bar, then the card's dots | Keep | Gold under 3:1. Every detail page opens on this block, FloraScore's too |
| 18 | Timing detail, every BM by day | When in the day did each BM come? | A row of dots per day on a time axis, every row labelled, at most 14 days (the table lists all 30); first BM in the reading colour or Gold, later BMs Ink 3, the legend "First BM, in your usual window", "First BM, outside your usual window", "Later BMs"; dinners after 8 PM as Teal ticks in their own column, only when meals are logged on enough days to read | Change | Teal meant a later BM and a dinner in one chart. Fixed-length pills. Struck dates for gaps |
| 19 | Timing detail, 90 days | Week by week, how many mornings came in my window? | A bar a week: in your window at the base in Plum (it counts days), outside it in Gold above, the bar's top at the mornings read; the latest labelled "5 of 6" | Change | A percent of 4 to 7 mornings isn't a number anyone logged |
| 20 | How often detail | As 9 | As 9; today's range bar on the same count axis, padded half a step; at 90 days the weekly bars of 19, for a usual count. "How your days split" is cut: a fourth picture of the same counts, with no usual marked | Change | As 9. The today bar's axis was fixed at 0 to 4. A dot a week at its average put decimals on the scale |
| 21 | Form detail | Which forms, and when was one outside my usual? | The card's bars (a line under them names a word that covers two steps), then a dot per BM by day with your usual forms as a band; today's bar draws a two-step word as a span over both steps, Ink 3 when it could be either side of the usual; at 90 days the weekly bars of 19, for usual forms ("Every BM in your usual forms", "A BM outside your usual forms") | Change | Grey above, Gold below, same words. Three of seven forms labelled. A dot a day at 90 days ran into dashes (90 days at 8px is 720px on a 300px plot) |
| 22 | Symptoms detail | As 11, and has it changed? | As 11; at 90 days, Teal bars of days a week with any symptom; each symptom against the weeks before, in words, its chip plain (it compares with the stretch before, not with your usual) | Change | As 11 |
| 23 | Check-in detail and Saved | How does each answer compare with my first weeks? | A strip per question with its steps written in the answers' own words ("Mostly settled"), the first weeks as a band, the latest week answered ringed and named "Latest week" in the legend | Keep | 6px dots: made 8px. The steps are the answers' own words, with a gutter wide enough for "5 or more days" |
| 24 | One pattern | How often did the change follow, against other days? | Two bars whose length is the share (from none to every time), "20 of 22" and "26 of 52" written on them, in the reading colour; for late dinners, the two-group strip of first BM times after each kind of dinner | Change | Plum for "held", and 52 dots to say 26 of 52. A bar as long as its count would draw 26 of 52 longer than 20 of 22. The 90-day day-by-day rows for foods couldn't fit their marks; the table lists the days instead |
| 25 | Patterns with few meals | Why no patterns yet? | Text, no chart | Keep | The picked tier was outlined in Plum: use Ink |
| 26 | Your days | Which days sat within my usual, and why? | As 7, then each day with its mark and its line | Change | The same bar and words as 7 |
| 27 | History, List | What did I log, and how did each day sit? | Each day's header carries its day mark and its one line; the logs under it. On Free, days before the last 7 are Ink 3 Logged with no line, as the calendar draws them, and one line says why | Change | Nothing said how a day sat. A chip on BM rows would have doubled Day first's chip and read a flagged today against the usual, so the day header carries it once |
| 28 | History, Calendar | How did each day this month sit? | One day mark per day; one Teal square under it for symptoms | Change | Hollow Gold rings, struck dates, up to three tiny marks a day, grey symptoms, Teal dots for meals, and two hollow Teal marks meaning two things |
| 29 | Profile, your usual | What is my usual? | Four rows of words | Keep | Nothing |
| 30 | Easy, Today | How is today, and my last 7 days? | The big number; the last 7 days as section 3, at 32px | Change | Seven day states drawn seven ways; days grouped by state instead of named with their reason; 40px circles didn't fit at 390 |
| 31 | Easy, Your weeks | The Insights questions, one answer a card | The same marks, one picture a card | Change | "15 of 29 days within your usual range" beside "19 of 29 days within your usual": the same words for two measures. Parts as four 0 to 100 bars |
| 32 | Ask Florin, FloraScore | Why did my score move? | The FloraScore card's line, today labelled (`RU.cardChart`), 30 days or the card's range; the part that moved most in whole points | Built | Area fill, no today label |
| 33 | Ask Florin, timing | Did my first BM come in my window? | The Timing card's chart for the answer's range | Built | It drew the median as a range bar, a different picture from the card the question came from |
| 34 | Ask Florin, how often | Did I go my usual number of times? | The How often card's count line | Built | It drew the average as a range bar, with a decimal |
| 35 | Ask Florin, form | Were my BMs my usual forms? | The Form card's bars | Built | A segment bar with the legend "Outside it" |
| 36 | Ask Florin, the week | How many days sat within my usual? | The summary's bar (7), its whole the days read | Built | "Something shifted" and "Not logged", and the same 4 of 7 bar under 4 of 6 |
| 37 | Ask Florin, one pattern | How often did it hold? | The pattern's two share bars (24) | Built | "Held" in Gold, which means outside your usual |
| 38 | Free teasers | What does membership add? | The member card, the person's own values blurred | Keep | Follows the member cards (the parts teaser blurs the sentence, since the bars go) |
| 39 | Membership page | What is FloraScore? | The FloraScore glyph | Change | A ring filled to 72 for every person: a typed number |
| 40 | Data style: As built | All of the above | Repaired into these marks | Change | It is what every style's detail pages draw, and it disagreed with itself. It becomes the base, not an option |
| 41 | Data style: Field journal | | | Fold into the base | Its answer-first sentence moves into the base's cards. Kept in the library |
| 42 | Data style: Easy read | | | Keep, with the Easy version | Section 5 |
| 43 | Data style: Rings | | | Cut | One mark, the ring, means eight things |
| 44 | Data style: Bento | | | Cut | Donuts repeat the chart beside them |
| 45 | Data style: Oura | | | Cut, Will's call | Section 5 |
| 46 | Data looks library page | Which look draws each answer best? | Each look with its status in the app, and the question on every row | Change | It shows five looks as peers though three fail the same rules, and never says which one the app draws |
| 47 | Dark theme, every chart | As light | As light | Change, studio call | The reading and your usual are both Ray, so "within" is only a position. Proposal: the reading in Cream on dark, as the hero already does |

**The weekly check-in, plainly.** What we recommend: on Insights, each question with this week's answer and one chip.
"About the same as at first" is Plum. "More days than at first" or "Fewer days than at first" is Gold, whichever way
it moved, because Gold means a change from your usual and the chip's words already say which way. A neutral chip would
make the check-in the only place a change isn't Gold. No score and no total. The detail page keeps a strip per
question with its steps written, your first weeks as a band and this week ringed.

**What the set loses:** the ring as a gauge (hero, FloraScore detail, Day first's chip, the membership page), the
30-day line on Today (now on Insights, the FloraScore detail and Ask), the four part bars on the Insights card, the
area fills, the 30-day average line, the learning bar on the week card, the meals count, the week card's three strips
and its legend, Monday-to-today counting, the size scale on symptoms, the outline square for "strength not said",
three different 90-day forms, Ask's own five charts, and four data styles.

**What it gains:** one answer for the last 7 days on Today, counted as Insights counts them; one renderer for a day,
used by the week, the calendar, History's day headers, Your days and Easy; one form at 90 days for every measure; your
usual on the symptom chart; today marked on every chart over time; Ask drawing the card's own chart; a named token
for each role; and a sweep check for the retired words.

---

## 3. Today's week card

The card answers one question in five seconds: how many of my last 7 days sat within my usual, and which didn't.

```
Your last 7 days                                   Oct 5 to 11

● 4 of 6 days within your usual

 Mon    Tue    Wed    Thu    Fri    Sat    Sun
 (5)    (6)    (7)     8     (9)   (10)   ((11))
 Plum   Plum   Gold  date   Gold   Plum   Plum
               ■                           ■
                                         Today

● Wednesday: your first BM came later than usual, at 8:55 AM.
● Friday: one BM was Firm, firmer than your usual forms.
Nothing logged on Thursday.
■ Symptoms on 2 days: mild bloating both days.

See these days on Insights  >
```

Marcus, 12 weeks, Consistency C. Every figure comes from the model: Wednesday's first BM at 8:55 against his 7:15 to
8:30 window, Friday's Firm, Thursday with nothing logged, mild bloating on Wednesday and today.

**The parts, top to bottom.**

1. **Title and dates:** "Your last 7 days" and "Oct 5 to 11", from the day the person started when that's inside the
   seven ("Oct 7 to 11" on day 5, "Oct 11" on day 1), as Easy and the data looks say it. No learning bar (the FloraScore
   card carries day 5 of 14).
2. **The answer**, at heading size (not hero size, so Today carries one big number): a small Plum circle, then within
   out of the days read, counted exactly as Insights' 7 days count them, through `L.tally` over `L.span(M, 7)`. The
   days read are within plus outside.
3. **One row of seven day marks**, ending on today at the right, in section 1's marks: the weekday above (Space Mono
   10px, Ink 3), the date inside the circle, Today under today's column, a Teal square under each day with a symptom.
   Days before the person started sit at the left as dates only and need no word. The row is a list for screen
   readers. The circles are not buttons.
4. **The lines:** one plain sentence for each day that wasn't within your usual, each starting with that day's mark,
   so the lines are the legend.
   - Days outside your usual first, in day order, at most three. A fourth or more roll into the third line: "Also
     outside your usual: Saturday and today." Every Gold day is named, in both themes.
   - Then days not counted, one line each (rare).
   - Then the days with nothing logged, together on one line.
   - Then, on a flagged today, the flag line with its Teal ring.
5. **Symptoms:** one line starting with the Teal square, only when any were logged, from the one symptom helper
   (below).
6. **See these days on Insights**, which opens Insights on 7 days. Free keeps it.

No strips, no hatch, no struck dates, no meal count, no legend.

**What each line says.** One reason per day, picked in this order: No BM, more or fewer BMs than usual, a form
outside your usual, the first BM's time. A second reason adds a short tail: ", and later than usual". Today is "Today",
never its weekday.

| The day | Its line |
|---|---|
| No BM | Today: No BM, fewer than your usual 1 to 2 a day. |
| More BMs | Today: 3 BMs, more than your usual 1 to 2 a day. |
| Fewer BMs | Tuesday: 1 BM, fewer than your usual 2 to 3 a day. |
| A form | Friday: one BM was Firm, firmer than your usual forms. (Type 2 in A, the logged word in B; "two BMs were Watery, looser than your usual forms") |
| The time | Wednesday: your first BM came later than usual, at 8:55 AM. ("earlier than usual" the other way) |
| Could be either | Saturday isn't counted: a BM logged as Loose could be either side of your usual. |
| Only symptoms or meals | Tuesday isn't counted: only symptoms were logged. Today: "Today isn't counted yet: nothing about BMs is logged." |
| Nothing logged | Nothing logged on Thursday. (Two or more: "Nothing logged on Tuesday and Thursday.") |
| Flagged today | Today has a log noted for a clinician, so it isn't read against your usual. (`RU.FLAG_DAY`, word for word) |

**The symptom line** comes from one helper, used here, on Insights' Symptoms card and in Ask Florin, so all three say
the same thing:

- Count each symptom once per day it came up.
- Name the one on the most days. On a tie, name both: "bloating and cramping, 1 day each".
- Say "both days" or "each day" when it came up every symptom day, else "on 2 days".
- Give its strength only when every log of it gave one: "mild", or "mild to moderate". Drop it when any was left
  unsaid.
- When another symptom was logged stronger, add it, counted on every day it came up (as the symptom strip counts it),
  then how many of those days it was that strong: "Symptoms on 2 days: bloating both days, and strong cramping today";
  mild one day and moderate another is "cramping on 2 days, once moderate".
- "Mostly" only for more than half. Never "most often".

**Every state.**

| State | The answer | The row and lines |
|---|---|---|
| 12 weeks (above) | 4 of 6 days within your usual | As above |
| All not counted | None of the last 7 days can be read against your usual. | The not-counted lines say why |
| Every day within | 6 of 6 days within your usual | No lines but symptoms |
| Today not logged yet | Counted over the other days | Today's column: the date and Today, no circle, no ring, no line |
| Flagged today | 3 of 5 days within your usual | Today a Teal ring with the info glyph; the flag line. FloraScore and Day first carry the Teal note to primary care |
| No BM today | 3 of 6 days within your usual | Today Gold; "Today: No BM, fewer than your usual 1 to 2 a day." |
| 3 BMs today | 3 of 6 days within your usual | Today Gold; "Today: 3 BMs, more than your usual 1 to 2 a day." |
| Learning, day 5 | 3 days logged | The two days before the person started as dates only at the left; logged days filled Ink 3 (a day with only symptoms too); "Days show as logged until Florin knows your usual, on day 14." "4 BMs over 3 days." "Nothing logged on Thursday." The symptom line |
| Learning, flagged today | 4 days logged | Today the Teal ring with the info glyph, and the flag line, as after day 14 |
| Just joined, nothing logged | No days logged yet. (Not "Nothing logged yet": Day first and Easy say that for today on the same screen) | No row. "Your days show here as you log them." |
| Just joined, No BM logged | 1 day logged | Only today drawn, filled Ink 3, ringed, Today; "No BM logged today." |
| Mid-week (any day but Sunday) | The same count as Insights' 7 days | Today at the right end; no future days are ever drawn |
| Consistency A, B, C | The same rule, through `L.facts` with the mode | Form names through `L.formName`. "Could be either" only reading a B word in A or C |
| Free | The same card; nothing here is held | The link opens Insights' 7 days, which Free keeps |
| Check-in off | No change: the card never draws the check-in | |
| Score first and Day first | The same card, through `RU.todayParts.week` | |
| Easy version | The same card, larger: 32px circles, lines at 18px or more | Easy's own Today draws it |
| Dark | Ray within, Gold without an edge but always named in a line, dark Ink 3, dark Teal ring | Lines in dark Ink 2 |

---

## 4. FloraScore on Today

The hero on Score first answers: how is FloraScore today against its usual range? It follows DESIGN's block for one
reading, a range bar.

```
◯ FloraScore                                        Today

83

              Your usual 76 to 82
   ────────────[███████████████]─●────────────────

A little above its usual range. Mild bloating at 3:10 PM.
Without it, FloraScore would be 84.
```

**The parts, top to bottom.**

1. **The label** "FloraScore" with the small glyph beside it: a plain circle, no fill, no value. It keeps the tie to
   the ring people know, without a gauge.
2. **The number**, big, with no count-up (a number that counts up sits for a moment beside a reading it doesn't have).
3. **The range bar.** Your usual range as a Ray band at 16%, labelled with its two numbers. Today a Cream dot with a
   2px Forest ring (the hero's surface), so it never sits Ray on Ray. The bar runs from the lowest FloraScore in the
   last 90 days to the highest, widened to at least 10 points past each end of the usual range and rounded out to 5,
   so one point above the range is a visible step (Marcus: 60 to 95). Its ends carry no numbers: 60 and 95 read as the
   lowest and highest scores, which they aren't. The FloraScore detail uses the same bar and names the last 90 days'
   Lowest and Highest on it. The studio's 190px decorative circle behind the hero is off on the phone (a ring means
   today).
4. **The sentence**, as now, with what stood out (above: Marcus, Member). With membership it goes on to say what the
   log that stood out did to FloraScore, except for an alarm, on Free, or for a No BM log.

The dot is never Gold: FloraScore is a reading, and the words say "a little above" or "a little below".

| State | The number | The bar | The sentence |
|---|---|---|---|
| Scored | 83 | The band and today's dot | "A little above its usual range." Then what stood out ("Three BMs today" names the one taken out: "Without the 4:00 PM BM, FloraScore would be 83.") |
| Flagged today | The number stays | The band, no dot | "Not read against your usual today", and the Teal note to primary care |
| No score, after day 14 | No score | The band, no dot | `L.NO_SCORE`: "it needs a BM, or No BM, logged on 2 of your last 3 days" |
| Learning, day 5 | Day 5 of 14 | 14 small steps, 5 filled in Cream | "FloraScore starts on day 14, once Florin knows your usual." |
| Just joined | Day 1 of 14 | 14 steps, 1 filled | The same |
| Dark | The same | The same: the hero is dark in both themes | |

---

## 5. The data styles

**Is this the right set? No.** The six options are not six jobs. Three are skins over the same cards, and none of them
changes the detail pages, so the style picked on a card is gone one tap later. Whatever Will picks, the base (As
built, repaired into these marks) has to be right first, because every detail page draws it.

| Style | Call | Why |
|---|---|---|
| As built | The base | Repaired into section 1's marks, it is what the app draws, not an option |
| Field journal | Fold into the base | Its best idea, the answer in a sentence above each chart, moves into the base's cards. Kept in the library |
| Easy read | Keep, with the Easy version | One number, one sentence, one labelled picture. Already the Easy version's |
| Rings | Cut | The ring means eight things card to card; radial bars and a curved time axis are hard to read on a phone; the part rings carry no labels; a number under every day ring needs a legend |
| Bento | Cut | Donuts repeat the chart beside them; a hollow ring means "last week" in one tile and "today" in another; the symptom heat strips are mostly empty cells; a glass surface outside the app's tokens. Its week pills (a dot per BM) are worth keeping as an idea if Will wants the BM count per day seen |
| Oura | Cut, Will's call | Below |

**The call for Will.** Our earlier lean was Oura for Today and FloraScore, Field journal for the detail pages, and
Easy read with the Easy version. The audit shows two parts of it don't hold. Oura breaks the chart rules in four
places:

- four rings for the parts with no numbers, which all look full;
- No BM drawn as a short bar, a zero with length;
- a curved time axis that runs off the card at 390;
- the same Gold square for a timing change and a form change.

It also turns the phone dark, and its FloraScore is a ring filling toward 100, which reads as a grade. And "Field
journal for the detail pages" was never built: the detail pages stay As built in every style.

**Option 1: one look everywhere (what we recommend; the decision sheet says so, fix-words, Oct 28).**
- What it is: every screen draws the base, with Field journal's answer-first sentences in it. The Easy version draws
  Easy read. Rings, Bento, Oura and Field journal leave the app and stay in the library.
- Why do it: a card and its detail page draw the same day the same way, on every screen. Nothing on screen depends on
  a theme. With nothing left to pick, Data style folds into Version (Standard draws the base, Easy draws Easy read),
  which takes a decision off the list.
- Why not: it loses the Oura look, which was part of the reason for the earlier lean. The tie to Oura comes down to
  the FloraScore glyph and the score itself.

**Option 2: Oura on Today, the base everywhere else.**
- What it is: Today's FloraScore and week in a fixed Oura: a number on each part, No BM as a dot on 0, a straight
  morning axis, a word for each Gold mark, the week as section 3, and no theme switch. Insights, the detail pages and
  History draw the base. Easy draws Easy read.
- Why do it: it keeps the visual tie to Oura on the first screen people see.
- Why not: the same day is drawn one way on Today and another on Insights. Fixed, Oura has to drop its round gauge
  too, so little of the Oura look is left, and it ends close to the base anyway.

**How each kept style draws.**

- **The base:** section 1's marks, section 3's week card, section 4's hero, the forms in section 2, each card's answer
  in a sentence above its chart.
- **Easy read, with the Easy version:**
  - The week and month in the marks at 32px, dates inside the circles.
  - Nothing logged is the date alone (no hairline circle).
  - Could be either, only symptoms, and logged before day 14 become one filled Ink 3 circle (today they are an outline,
    a fill and a Forest fill).
  - Flagged today is the Teal ring with the info glyph. Today is ringed in the week as in the month.
  - Section 3's lines replace the groups by state.
  - "FloraScore was in its usual range on 15 of 29 days."
  - The parts said as moves in points.
  - No count-up on the big numbers.

**Until Will decides,** the six options stay as they are, so the comparison stays live. After the call, stored values
fall back safely: the page already drops a stored value that isn't one of the options.

**If Will keeps a cut style anyway:**
- Rings: today's score under today's ring (it is missing on a symptoms-only day while Journal shows 83), labels on the
  part rings, a straight time axis.
- Bento: drop the donuts and the glass.
- Oura: Option 2's fixes.

---

## 6. Truth mismatches

Where a screen says something the model doesn't, and the fix. Worst first. The work item that fixes it is in brackets.

| # | Where | It says | The model says | Fix |
|---|---|---|---|---|
| 1 | Today's week card, every person | 7 of 8 within your usual, 5 of 6 mornings | 4 of 6 days within (`D.tally[7]`); Insights, every style and Ask say 4 of 6 | The new card leads with the day count over the last 7 days. Rename How often's line to "6 of 6 days with a usual count" so "within your usual" alone always means a day [C2, C8] |
| 2 | Week card, mid-week | Monday to today | Insights, Easy and every look count the last 7 days | The card counts the last 7 days [C1, C2] |
| 3 | Week card, 3 BMs today | Three Plum "within" dots | Today is outside your usual (count 3, usual 1 to 2) on every other screen | The day is drawn in its `L.facts` state, with its line [C2] |
| 4 | Week card, No BM today | A neutral dash | Outside your usual everywhere else | As 3 [C2] |
| 5 | Insights summary, Your days, Ask's week | "4 of 6" over a bar whose whole is 7 days | 4 of the 6 days read | The bar's whole is the days read [C5, M2, M9] |
| 6 | Score first's pill, FloraScore detail's chip | "+1 vs last week" beside today's 68 | Today is 15 below yesterday's 83; +1 is this week's average against last week's | Cut the pill from the hero. On the detail: "This week 81 on average, last week 80", in a neutral chip [C4, C12] |
| 7 | How often, a flagged today | 1.5 a day on average, 5 of 5 days | 1.4 over the 5 days read (Ask says 1.4) | Average over the days read, as the count is [C8] |
| 8 | Symptoms charts, strength not said | Drawn as Mild; the legend has no Strength not said | `s: 0` is "strength not said", never mild | Strength leaves the mark; the sentence and the table say "strength not said" [C10] |
| 9 | Form chart; timing dots | Outside your usual in grey; within in Forest on Insights and Plum on Today | Outside is Gold everywhere | Gold with its edge. Today's card stops drawing first-BM dots, so within is the reading colour on a chart and Plum only as a day's state, by rule (section 1) [C9, C2] |
| 10 | Form chart labels | 13% 63% 13% 13% (102); 100% for one BM | 1, 5, 1 and 1 of 8 | Counts on the bars [C9] |
| 11 | Insights FloraScore card | Four part bars under "FloraScore, today" | They are this week's averages | Cut the bars; one sentence on the part that moved most, said as this week [C6] |
| 12 | FloraScore detail, what moved it | Timing +3.0 in the chart and +7 in the list | Points of FloraScore, and the part's own 0 to 100 | One unit on the page, whole FloraScore points that add up to the change; the part's own value only in the four-parts list, "out of 100" [C1, C12] |
| 13 | Membership page | A ring filled to 72, for every person | Nothing: 72 is typed | The FloraScore glyph, no value [C15] |
| 14 | Field journal's week sentence (library) | "3 of the 6 days you logged"; with a flag, "of the 5 days you logged" when 6 were | 3 of 5 days read | Count over the days read, and say so [M5] |
| 15 | Week card symptom sentence | "mostly mild bloating" with strong cramping today | Bloating on both days, cramping strong today | The one symptom helper [C1, C2, C10, M3, M9] |
| 16 | Week card, Insights, Ask: ties and single logs | "Most often" on a tie; "1 BM, mostly Watery"; "most often" and "mostly" for the same 2 of 4 | A tie is a tie; one of one is all | The one helper names both on a tie, says "all" or the count, and "mostly" only over half [C1, C9, M9] |
| 17 | Week card, Just joined with No BM | "BMs: none logged yet" | Today is logged, with a count of 0 | "No BM logged today." [C2] |
| 18 | Ask, suggested questions on Form and How often | "Why were some BMs looser?", "What made my busier days different?" for Sarah | 0 looser, 0 busier days | Offer a question only when its count is above 0, else a neutral one ("What do the forms mean?") [C13] |
| 19 | Rings week card, symptoms-only today | No number under today | Today is 83 (Journal shows it) | Cut with Rings, or show it [M7] |
| 20 | Legends on the week card and Symptoms | Two shades, or all three strengths, when one is drawn | Only mild this week | Legends from the marks drawn; strength in words [C2, C10] |
| 21 | "Without it, FloraScore would be 83" on a No BM day | An honest log priced at 15 points | True arithmetic, wrong lesson | No counterfactual for a No BM log. Whether to keep it for any log is an open call [C3] |
| 22 | Today and Easy, the big score counting up | 72 for a moment beside "a little above your usual range, 74 to 82" | 83 | No count-up on a number that sits beside its reading [C4, M3] |
| 23 | Easy's Your weeks | "15 of 29 days within your usual range" beside "19 of 29 days within your usual" | Two measures | "FloraScore was in its usual range on 15 of 29 days" [M6] |

Also from the truth audit: Sarah and Marcus share one seeded week (only the window and meal count differ), so
switching person shows almost the same card. Giving each a different week would change 90 days of patterns, scores,
deck figures and existing checks, so it is left for a later pass. And How often's part of "what moved it" is exactly 0
for every demo person, because every logged day in both weeks had a usual count. It reads "How often didn't move",
with no bar, until a No BM or a 3 BM day moves it.

---

## 7. The work list

Each item gives the file, what to change and how to check it. The work list builds Option 1's base; the items marked
"after Will's call" wait for it.

**Where it stands (Oct 28, after finish-viz):** C1 to C17, K1 to K3 and M1 to M6, M8 and M9 are built, with the
critic's and the truth recheck's findings on top (a ring only on today, Ink 3 readings before day 14, one reading of a
day on Free, ties named, Ask drawing the card's own chart, the weekly bars in Plum, dinners not read with meals on few
days). M7 and the parts of M2 marked "after Will's call" wait for it, so Rings, Bento and Oura still draw their own
marks (FloraScore in Gold in places, a ring for a day with nothing logged); only their retired words are fixed. The
module screen notes below are applied, and so are the hand-offs at the end that belong to the notes workflow (the
`refresh-app.js` screen notes, the decision notes, the brief and CLAUDE.md, by fix-words). The deck's are the deck
workflow's. The usual five checks run after each group: `qa.js`, `behave.js`, `audit-spacing.js`,
`shots.js`, `sweep.js` (both themes, 12 weeks and Just joined, `--plan free` and `--width 390` too).

### Core

| # | File | Change | Check |
|---|---|---|---|
| C1 | `refresh-data.js` | Add `L.tally(F, named)` (moved from looks-data.js, same output); `L.FLAG_DAY` (and `RU.FLAG_DAY = L.FLAG_DAY`); `L.dayWhy(M, f, mode)`, a day's reasons in section 3's order, each with its line and short tail; `L.symLine(F)`, the one symptom sentence; an optional last day on `L.span(M, n, mode, end)`, today by default; and the parts of `L.scoreMoved` in whole points, rounded by largest remainder so they add up to `delta` | Behave, a case per helper: tie, single log, strong today, strength not said, could be either, only symptoms, a flag. `L.tally(L.span(M, 7))` equals `D.tally[7]` for every person, data setting and A, B, C. The whole-point parts add up to `delta` for every person and mode, with No BM today and 3 BMs today too |
| C2 | `refresh-ui.js` | Add `RU.dayMark(f, o)`: one day's circle, ring, date, symptom square and screen-reader words, for the week card, the calendar, History's day headers, Your days and Easy. Rewrite `RU.weekCard` to section 3 over `L.span(M, 7)`, `L.tally`, `L.dayWhy` and `L.symLine`; the link opens Insights on 7 days. Keep `RU.week` and its fields (the page's notes read `inForms`), over the same seven days instead of `L.weekOf`. Drop the strips, the hatch, the struck date, the meals line, the legend and the learning bar | Shots of every state in section 3's table, light and dark, 390 and 1440. Behave: the card's number equals Insights' 7-day summary and `D.tally[7]`; Gold circles equal the days named in outside lines, in both themes; a card drawn to a mid-week end day has it at the right and counts `L.tally(L.span(M, 7, mode, end))`; the date in every filled circle is 4.5:1 or more on its fill; no `ap-wk-strip`, no `line-through`, no "meal" in the card. Update every `ap-wk` match in work/*.js (the week checks, `.ap-wk-go`, the order checks) |
| C3 | `refresh-ui.js` `RU.scoreEffect` | Return nothing for a No BM log (`N.kind === "none"`) | Behave: No BM today, membership, Score first and Day first: no "Without it" |
| C4 | `refresh-insights.js` `RU.scoreHero` | Section 4: the label with the glyph, the number with no count-up, the range bar (no dot on a flagged today or with no score), the sentence. Cut the ring gauge, the 30-day line, its legend row and the pill. Learning: "Day 5 of 14" over 14 steps | Shots at 12 weeks, No BM today, flag, no score, day 5 and Just joined, light and dark; a shot 100ms after load shows the final number; behave: the hero's dot is never Gold, and has no dot on a flagged today |
| C5 | `refresh-insights.js` summary | The shared words; the bar's whole is the days read (within, outside); not counted and nothing logged in words under it; counts through `L.tally` | Behave: the summary matches the week card; the bar's parts add up to the sentence's "of" |
| C6 | `refresh-insights.js` FloraScore card | A line on the band in the reading colour, no area, the newest point ringed and labelled Today, the y axis from the data; cut the part bars; one sentence on the part that moved most, in whole points (C1), "this week". Free blurs that sentence | Shots, Member and Free; claims check |
| C7 | `refresh-insights.js` Timing | Gold dots edged; a flagged today a Teal ring with nothing inside, labelled; legend words "In your usual window" and "Outside your usual window"; the summary in days ("on 5 of 6 days"). Day by day: round dots, later BMs Ink 3, dinners after 8 PM as Teal ticks in a labelled column, gap rows blank with the date in Ink 3. 90 days: the weekly bars (a new `weekBars`: within at the base, Gold above, the top at the days read, the latest labelled "5 of 6") | Shots at 7, 30 and 90 days, and a flag day; no `line-through` in any chart label |
| C8 | `refresh-insights.js` How often | Dots on a count line in place of bars (a new `countLine`), its axis from section 1's rule; No BM a dot on 0 in its state; gaps blank; today ringed and labelled; 90 days the weekly bars for a usual count; `oftenOf` averages over `read`; the card's answer "6 of 6 days with a usual count"; the detail's today range bar on the same axis (now fixed at 0 to 4) | Behave: the flagged today average equals Ask's; a day with 4 BMs isn't clipped; shots at 7, 30 and 90 days |
| C9 | `refresh-insights.js` Form | Outside your usual in `--ap-shift` with the Shift Ink edge (bars and `sw--out`); counts on the bars; legend "In your usual forms" and "Outside your usual forms"; the dot plot labels the band's two edges; 90 days the weekly bars for usual forms; the learning summary says "mostly" only over half, else the counts | Shots; behave: bar labels add up to the BMs counted; 2 of 4 Formed never reads "mostly" |
| C10 | `refresh-insights.js` Symptoms | One Teal square a day per symptom at 7 and 30 days (drop the size classes and the outline square); an Any symptom row with the usual written at its end; 90 days as Teal bars of days a week with any symptom; strength in the summary (`L.symLine`) and in the table twin (Day, Symptom, Strength); `symLegend` only for marks drawn | Behave: nausea with no strength reads "strength not said" in the sentence and the table; no strength classes on the squares; shots in dark (no Ray cells) |
| C11 | `refresh-insights.js` check-in, patterns | Check-in card: each answer with its chip (section 2), no strips. Detail dots 8px. Patterns card: no count dots. Pattern detail: two bars whose length is the share, the counts written on them, in the reading colour (replacing `countDots`); late dinners keep the two-group strip of first BM times; foods drop the 90-day day-by-day rows, and the table twin lists each day. Picked tier outlined in Ink | Shots with the check-in on; patterns at 90 days and sparse; behave: "20 of 22" draws longer than "26 of 52" |
| C12 | `refresh-insights.js` FloraScore detail | The hero's block in place of the ring: the number, the sentence, the range bar ("Where today sits", with Lowest and Highest named), no Gold; a neutral week chip worded as averages; the 30-day line without area or average line, the y axis from the data, today ringed, the answer "In its usual range on N of 30 days"; What moved it as four rows of bars from a centre line in whole points (C1), each with words, and a part that didn't move as words with no bar; the parts list says "out of 100"; the table twin for the part bars | Shots at 390 (no label on the line); behave: the four rows add up to the chip's change |
| C13 | `refresh-insights.js` `RU.askContext` | Questions from the counts (looser only when looser > 0, busier only when busy > 0); "moved most" in whole points; the learning Form fact follows the "mostly" rule | Behave: Sarah at 30 days has no looser or busier question |
| C14 | `refresh-ui.js` `RU.historyDay` | Each day's header carries `RU.dayMark` and its `L.dayWhy` line (a flagged today: `RU.FLAG_DAY`); a gap reads "Nothing logged this day. It stays a gap, never a zero." No chip on BM rows: `RU.entryRow` stays as it is, so Today, Day first and Easy don't change | Shot of History with Friday's Firm BM; behave: no chip inside an entry row; a flagged today's header reads `RU.FLAG_DAY` |
| C15 | `refresh-insights.js` | Export `RU.cardChart(M, V, key, n)`, a card's chart and legend for a range, so Ask draws the card's own; the membership page's ring becomes the glyph | Shots of the membership page; behave: Ask's chart markup for each key matches the card's |
| C16 | `app-charts.js` (the studio's kit; the changes are for the studio to take back) | `C.range` draws no dot when the value is null; `C.seg`'s tooltip gives counts, no percents; `C.ring({ glyph: true })` draws a plain circle with no arc and no value. Callers drop `area: true`: the Insights FloraScore card, the FloraScore detail's line and Ask's `scoreChart` (the hero's goes with C4) | The shots above |
| C17 | `refresh.css` (.ap- chart rules only) | `.ap-day` rules for `RU.dayMark`; the hero's range bar (Ray band at 16%, Cream dot with a 2px hero ring); remove the `.ap-wk` strip, hatch, square and dash rules; `.dv-bar.is-out` and `sw--out` to Gold with the edge; `.dv-sym` and `.dv-cell` to one Teal square; drop the `.c-row.is-gap .c-row-lbl` strike; one rule giving every light Gold mark the Shift Ink edge. The calendar borrows `.ap-wk-dot` and `.ap-wk-sq` (refresh-variants.css says so), so it moves to `.ap-day` in M1 at the same time | `audit-spacing.js` on the scale; behave: a computed edge on every Gold mark in light; the calendar still draws a mark for every day |

### Checks

| # | File | Change | Check |
|---|---|---|---|
| K1 | `work/sweep.js` | A retired-words check on phone text: "Something shifted", "No logs", "Not logged", "Outside them" and "Outside it" (not "Outside its") anywhere; "Shifted" and "No BMs logged" as a whole legend item, chart label, table cell or day word ("No BMs logged yet." stays a sentence) | The sweep, both themes, Member and Free |
| K2 | `work/behave.js` | The cases under each item above; the "every option On the phone" check after the looks change | behave.js |
| K3 | `work/qa.js` | No sideways scroll at 390 with Easy's circles; the calendar's day buttons 44 by 44 | qa.js |

### Modules

| # | Files | Change | Check |
|---|---|---|---|
| M1 | `refresh-variants.js`, `refresh-variants.css` | Calendar: one `RU.dayMark` per day; one Teal square under the day for symptoms; no meal dots; the shared legend words, three lines at most; Free's held days stay Ink 3 "Logged"; day buttons with 44px hit areas. Day first: a symptom's edge Teal; the chip's ring becomes the glyph (`C.ring({ glyph: true })`), its word still carries the reading. The calendar's screen note, below | Shots of the calendar, light and dark, Member and Free, a flag day; no `line-through` |
| M2 | `refresh-looks.js`, `refresh-looks.css` | Your days: as row 26, through `L.tally` and `L.dayWhy`, in the shared words (no "Shifted", "Not logged"); its `askContext` facts in the same words; its screen note, below. After Will's call (Option 1): draw no look but Easy read under the Easy version; `EXT.built.look` follows the options refresh-app.js keeps; Oura's theme switch goes with Oura | `behave.js` "every option On the phone" still passes; sweep |
| M3 | `refresh-easy.js`, `refresh-easy.css` | Easy's Today: the last 7 days through `RU.dayMark` at 32px, with section 3's answer and lines at Easy's size; Your weeks in the same marks; no count-up; its Today screen note, below | Shots of Easy Today and Your weeks at 12 weeks, day 5, Just joined, a flag day and dark; no sideways scroll at 390 |
| M4 | `library/js/looks-data.js` | Call `L.tally`; `D.why` from `L.dayWhy`; `D.symLine` from `L.symLine` | `shots-library.js`; the library and the phone agree card for card |
| M5 | `library/js/look-journal.js`, `look-journal.css` | Library only, low priority (Journal leaves the app under Option 1): count over the days read; solid Plum circles; Gold edged; the flagged day's marks named | Library shots, light and dark |
| M6 | `library/js/look-easy.js`, `look-easy.css` | Day states through `RU.dayMark` (one Ink 3 fill for unsure, not counted and logged; nothing logged as the date alone; the flag ring with the glyph; today ringed in the week); lines in place of groups; "FloraScore was in its usual range on 15 of 29 days"; parts as moves in points | Library shots; the Easy version's shots |
| M7 | `library/js/look-rings.js`, `look-bento.js`, `look-oura.js` and their css | After Will's call: stop loading the cut looks in the prototype (the load lines in `index.html` and `_local.html`, and the publish list), and mark them "not used in the app" in the library. Under Option 2: Oura's fixes (section 5) | Sweep with the remaining options |
| M8 | `library/index.html`, `library/js/library.js` | Each look's status (in the app, folded into the base, not used) and the question on every row | Library shots |
| M9 | `refresh-ask.js` | The computed symptom answers through `L.symLine`, and the learning form answer on the "mostly" rule, so Ask says what the week card and Insights say. Its charts: the FloraScore line (no area, today labelled) and the five others through `RU.cardChart` for the answer's range, so a chart in the chat is the card's chart; the pattern's bars as C11's, with no Gold "Held" | Behave: with strong cramping today, Ask's week answer names it, as the card does; no Gold in a pattern answer; shots of each answer |

**Screen notes in the modules** (ours to change, with M1 to M3; all three applied, Was then Now):

- `refresh-variants.js`, the calendar (`calScreenNote`). Was: "A month on one screen. A filled dot is a day within
  the person's usual, a gold ring a day outside it, a dash a day with logs but none about BMs, and a struck date a day
  with nothing logged. A teal ring marks a day with a log noted for a clinician. Tap a day to see its logs." Now: "A
  month on one screen, each day marked as on Today's card: a Plum circle within the person's usual, a Gold circle
  outside it, a grey circle for a day logged but not counted, and the date alone for a day with nothing logged. A Teal
  ring marks a day noted for a clinician, and a Teal square a day with symptoms. Tap a day to see its logs." (Keep the
  Free and data style tails.)
- `refresh-looks.js`, Your days (`i-days`). Was: "Behind the week and month cards: how many days sat within the
  person's usual, then the days themselves. Seven days lists every day; 30 and 90 list the days that shifted, each
  with what shifted. A day with nothing logged stays a gap." Now: "How many of the days read sat within the person's
  usual, then each day with its line. Seven days lists every day; 30 and 90 list the days outside the usual, each
  saying what was different. A day with nothing logged stays a gap."
- `refresh-easy.js`, Easy's Today (`ez-today`). Was: "this week as day circles". Now: "the last 7 days as day
  circles, with a line for each day that wasn't within the usual".

### Hand-offs: notes and docs owned elsewhere

**Screen notes in `refresh-app.js`** (`NOTES`; owned by the notes workflow, applied by fix-words, Oct 28, as the New
text below, with `consistency` in `i-score` named form, as the phone names the part). The old text is quoted
as it stands on Oct 28, after finish-viz; the new says what the screens draw now:

- `today`, with a usual. Old: "Then the weekly check-in when it's due, today's logs, the last 7 days, and one next
  step." New: "Then the weekly check-in when it's due, today's logs, the last 7 days with a line for each day that
  wasn't within the usual, and one next step."
- `today`, while learning. Old: "Florin is still learning this person's usual, so FloraScore shows how many days are
  left instead of a number until day 14. Then the weekly check-in when it's due, today's logs, the last 7 days, and one
  next step." New: "Florin is still learning this person's usual, so FloraScore shows the day it's on, Day 5 of 14,
  instead of a number until day 14. Then the weekly check-in when it's due, today's logs, the last 7 days as they're
  logged, and one next step." (Day 5 from `L.learnDay`.)
- `history`. Old: "Every log, newest day first. A day with nothing logged stays a gap, with Add to this day for
  catching up." New: "Every log, newest day first, each day opening with its mark and one line on how it sat against
  the usual. A day with nothing logged stays a gap, with Add to this day for catching up." (The rest as now. On Free,
  a line says days before the last 7 show as logged.)
- `i-score`. Old: "Today's score against the person's usual range, the trend, what moved it this week, and its four
  parts:". New: "Today's score on a bar with the person's usual range, then each day's score against that range, what
  moved it this week in whole points, and its four parts:" (the rest as now).
- `i-timing`. Old: "When the first BM came each morning, on a straight time axis, with the person's usual window
  marked." New: "When the first BM came each day, on a straight time axis, with the person's usual window marked, then
  every BM day by day, the last 14 days at most; over 90 days, a bar a week for the mornings in the window and outside
  it." (The rest as now.)
- `i-often`. Old: "BMs a day, as bars from zero, over the person's usual range. A day logged as No BM counts as zero;
  a day with nothing logged stays a gap, never a zero." New: "BMs a day, one dot a day on a count line from zero, with
  the person's usual count as a band. A day logged as No BM is a dot on zero; a day with nothing logged stays a gap,
  never a zero. Over 90 days, a bar a week for the days with a usual count."
- `i-form`. Old: "The mix of forms over the range, with the person's usual forms marked, then each BM by day. In B, a
  word that covers two kinds of stool sits between them, since it could be either." New: "How many BMs came in each
  form, counts on the bars, with the person's usual forms marked, then each BM by day; over 90 days, a bar a week for
  the days in the usual forms. A word from B that covers two kinds of stool sits between them by day, spans both on
  today's bar, and stays out of the bars, with a line that says so."
- `i-sym`. Old: "A row per symptom, with a dot on each day it came up, larger when stronger. One logged without a
  strength reads as strength not said." New: "A row per symptom, with a Teal square on each day it came up, and an Any
  symptom row with the usual written at its end; how strong is said in words, and one logged without a strength reads
  as strength not said. Over 90 days, Teal bars of the days a week with any symptom." (The rest as now.)
- `i-pattern`. Old: "One dot for each time the food came up, filled when the symptom followed, next to the same count
  for every other day. Then the pattern over time, and a way to test it." New: "Two bars: how often the change followed
  the food, and how often it came on other days, with the counts written on. Late dinners add the first BM times after
  each kind of dinner. Then a way to test it." (The last sentence as now.)
- `ckdone`. Old ends: "No score, and the answers are never added up into one." New adds: "Your logs this week counts
  the days within the usual, with the symptom sentence."
- After Will's call: the Data style options in `DECISIONS`, and, if it folds into Version, Version's note.

**Decision notes in the modules** (`EXT.decisions`, owned by the notes workflow):

- `refresh-variants.js` `historyDecision`: applied. The calendar's `is` now reads "A month on one screen: a Plum circle
  for a day within the person's usual, a Gold circle for a day outside it, and the date alone for a day with nothing
  logged."
- `refresh-looks.js` `EXT.decisions.look`: applied (fix-words, Oct 28). The sheet now recommends Option 1, and the
  note says so in the sheet's words: `rec` and `open` as proposed below, the Oura block's why and why not rewritten
  from section 5, and the `aside` the sheet's plain lede ("The choice is one look everywhere, or Oura on Today and the
  same look everywhere else. Rings, Field journal and Bento are here to compare."), since a note carries no was and
  now. The proposal as it stood: `aside` "The week card you flagged is redrawn
  in one set of marks used on every screen. With that in place, the choice is one look everywhere, or Oura on Today and
  the same look everywhere else."; `rec` { v: "built", text: "We recommend one look everywhere, the redrawn Florin
  charts, with Easy read only in the Easy version.", why: "A card and its detail page then draw the same day the same
  way, and Oura breaks the chart rules in four places." }; `open` "Keep a fixed Oura on Today's FloraScore and week, or
  one look everywhere? With one look, Data style folds into Version."

**The deck** (`deck/project/slides`, owned by the deck workflow). What the slides still say or draw, and what the phone
draws now:

- `history.html`, the Calendar option. Old: "A month on one screen, each day marked the way the week card marks it,
  with a struck date for a day with nothing logged." New: "A month on one screen, each day marked the way the week
  card marks it, with the date alone for a day with nothing logged."
- `home.html`, Day first. Old: "FloraScore as a small ring at the top". New: "FloraScore as a small chip at the top"
  (the sheet's words; the chip carries the glyph, which holds no value).
- `style-built.html`, the Florin charts FloraScore card. It draws the old card: a ring that sweeps full, "83, a little
  above your usual range", four part bars (Timing 95, How often 97, Form 94, Comfort 93), a 30-day line with today's
  dot, and a number that counts up. The card now draws "83, a little above its usual range", the line on the usual
  band with today ringed and labelled "Today 83", and one sentence on the part that moved most ("Timing and form moved
  it most this week, adding 2 points each"), with no part bars and no count-up.
- The data style slides follow the sheet's Data style block, which now recommends Option 1.

**The brief** (`claude/Florin app refresh brief.md`, owned by the notes workflow; applied by fix-words, Oct 28: the
build lines and the calls changed, the dated logs left as written with one line under them saying which marks
changed, and a section for Will's Oct 28 notes). Lines that describe the build as it
is, now out of date (the dated logs of earlier passes stay as history):

- Will's notes (Oct 27), History and home. Old: "Day first (the date with a small FloraScore ring, ...)". New: "Day
  first (the date with the FloraScore glyph and number in a chip, ...)". Old: "a Calendar of the month with each day
  marked the way Today's week card marks it (Plum within the usual, a Gold ring outside it, a gap struck through, a
  Teal ring for a flag, never read)". New: "(a Plum circle within the usual, a Gold circle outside it, the date alone
  for a gap, a Teal ring for a flag, never read, and a Teal square for symptoms)".
- The third review, Craft. Old: "a day not logged is its struck date". New: "a day with nothing logged is its date
  alone, with nothing drawn".
- Closing the hand-offs, The page. Old: "Strength not said is a hollow square on the week card, as on the calendar."
  New: "A symptom is one Teal square whatever its strength; strength is said in words, and one logged without a
  strength reads as strength not said."
- The calls for Will, Home. "Should the hero keep "+2 vs last week" on a rough evening?" is moot: the pill is cut (the
  week is a neutral chip of averages on the FloraScore detail). "Is a small ring by the date (Day first) enough..."
  becomes "Is the FloraScore glyph by the date (Day first) enough...".
- The calls for Will, History and the week. "Mild symptoms at 65% on the week card and the calendar ..., or both at
  70%?" is moot: no strength shading anywhere. "What should a Teal dot mean across the app? Rings uses it for symptoms,
  the calendar for meals." becomes "A Teal square means symptoms on every screen of the app; Rings still draws Teal
  dots for them."

**CLAUDE.md** (shared; re-read before editing), after the work lands (applied by fix-words, Oct 28):
- "Charts never use dashed lines ... a day not logged is its struck date, as on the week card": now "a day with
  nothing logged is its date alone, with nothing drawn";
- the week card in "A flagged today" and the `RU.week` line (the last 7 days);
- `RU.dayMark`, `L.tally`, `L.dayWhy`, `L.symLine`, `L.FLAG_DAY`, `RU.scoreRel`, `RU.heldOnFree` and `RU.cardChart`
  in the hooks;
- the calendar's marks in the History lines, and History's day headers;
- the looks module's list of what it wraps, and the load order if looks are dropped.

**Publishing:** the data looks artifact publishes refresh-data.js too, and looks-data.js will call `L.tally`, so the
library is republished together with the prototype.

**DESIGN.md**, proposals for the studio:
- add section 1's marks and tokens to Data Visualization;
- every Gold mark carries the Shift Ink edge in light;
- the FloraScore hero's ring becomes a glyph and the reading a range bar (section 4);
- for a yes or no outcome under two conditions, the two-group strip is two bars of shares (row 24);
- on dark, the reading is Cream, so Ray means only your usual;
- the darker light Ink 3 (already asked for) also carries the date inside a filled circle.

---

## Open calls

1. **Data style.** Option 1: one look everywhere, the redrawn Florin charts, with Easy read in the Easy version (what
   the decision sheet recommends; Data style folds into Version). Option 2: a fixed Oura on Today, the same charts everywhere else. Section 5
   has why and why not for each.
2. **The dark reading:** Cream (proposal) or Ray (DESIGN.md today). The studio's call.
3. **The FloraScore hero:** a range bar with the glyph by the label (proposal), in place of the studio's ring gauge.
   The studio's call.
4. **"Without it, FloraScore would be N":** fixed for No BM. Keep it for other logs? It can read as a cost for
   logging.
5. **The BM count per day on the week card:** left out for five-second reading. Bento's week pills (a dot per BM
   inside the day) can add it back if Will wants it seen.

**Settled in this pass:** the week card counts the last 7 days, as Insights does; the check-in's chip stays Gold for
a move either way, with words saying which way.
