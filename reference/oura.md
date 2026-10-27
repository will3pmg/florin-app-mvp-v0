# The Oura app, as reference for the Florin look

Will sent five sets of Oura screenshots on Oct 27: the late-2025 redesign (Today, Vitals, My Health), an older Home,
Stress Management with Contributors, Today's check-in and Body Clock, and Activity with heart-rate zones. The images
are Oura's; they stay in the session scratchpad (`scratchpad/p3/oura-ref/`) as design reference and are never
published. This note says what they do and how each idea translates under Florin's rules.

## What the screens do

**Structure.**
- Three tabs (Today, Vitals, My Health), with a floating round + button at the bottom right.
- A date strip at the top (yesterday, today, tomorrow) on older screens.
- Dark throughout: near-black and deep navy, never a light theme in these shots.

**Today hero.**
- A full-bleed atmospheric backdrop (a mountain photo, a nebula, a wave) behind the main score.
- Above it, a row of small score shortcuts: little rings with a number and a label (Readiness 88, Sleep 84,
  Activity 81, Cycle day).
- The main score is an open arc gauge, about 270 degrees, with a thin track. The big light numeral sits inside, the
  state word under it ("Readiness", "Optimal", "Good"), then a short headline and one sentence.
- One pill button: "Learn more".

**State words as coloured small caps.**
- THRIVING, OPTIMAL, MAKING PROGRESS, LOOKING GOOD and FOLLICULAR PHASE sit above a serif headline ("Good place to be";
  "Rising heart health, with a dip in stress management").
- The headline is the "one big thing" for the day. A paragraph follows, then one pill action ("Dive in with Advisor").

**Vitals.**
- One card per metric. Each has a label, a coloured state word, and the big number at the left.
- A long horizontal track sits beside the number, with a white marker for where today falls (a range position, not a
  progress bar).

**Contributors.** The heart of an Oura detail page:
- a list of rows, each a label on the left and a state word on the right ("Optimal", "Fair", "Pay attention") with a
  chevron;
- a thin full-width bar under each row: near-white when fine, a warm coral when it needs attention;
- each row opens its own detail.

**Trend charts.**
- A smooth line whose stroke colour shifts along its length, with a soft fill under it.
- Zone names (High, Moderate, Low) sit on the right edge as horizontal bands, not numbers.
- A vertical scrubber has a white pill tooltip ("Low, This week").
- Month labels run along the bottom. A segmented pill control switches series (Cumulative Stress, Resilience).
- "Key metric" is a three-part track with a marker.

**Check in, after a change.**
- A card: "Your Sleep Score is higher than usual. Did anything impact your sleep yesterday?"
- Tag chips under it (Meditation, Magnesium, Tea, Sun, Fasting, Blue light blockers, + More) and a close X.
- The app asks about context exactly when the data moved.

**Body Clock.** A curved timeline arc of the night with hour marks, segments for sleep, and two dots: the sleep midpoint
against the chronotype. One sentence under it.

**Habits and routines.**
- A value and unit ("478 cal / daily").
- Horizontal bars for 30-day average, 90-day average and baseline, one under another.
- "Supported areas" chips.

**Activity and zones.**
- Stacked daily bars and an intensity timeline.
- Horizontal zone bars with minutes written beside each.
- Workout cards with two big stats side by side (Duration 1h 15m, Active calorie burn 471 Cal).

**Type and motion.**
- A clean geometric sans for numbers and labels. Large light numerals, small caps eyebrows, a serif for editorial
  headlines.
- Rings and arcs sweep in, numbers count up, bars fill.

## How Florin translates it

**Colour and language.**
- Florin colours: dark-first on Forest, with an atmosphere made from the brand tokens instead of photos (a Forest to
  Teal to Plum glow).
- Ray is your usual on dark, Plum your usual on light, Gold a shift, Teal context.
- Oura's coral "Pay attention" becomes Gold with a word. There is never red or green, and never "Optimal", "Good",
  "Thriving" or "Pay attention" about the person's body. State words are read against their own usual: WITHIN YOUR
  USUAL, A LITTLE OFF YOUR USUAL, OUTSIDE YOUR USUAL, STILL LEARNING.

**Today hero.**
- The FloraScore as the open arc gauge over the atmosphere, with the usual range drawn on the track and the state word
  under the numeral.
- One headline in Lora, a "one big thing" computed from today's logs. Example: "Your morning landed in your usual
  window, with one looser BM since lunch."
- Above it, shortcut rings for Timing, How often, Form and Comfort, each a small ring with its part score.

**Vitals.** The four FloraScore parts as track cards: big number, state word, a long track with your usual band and a
white marker for this week.

**Contributors.** The FloraScore detail lists Timing, How often, Form and Comfort as contributor rows, each with a state
word and a thin bar, Ray or Plum within the usual and Gold when outside. Each row opens that card's detail.

**Trends.** Smooth FloraScore and timing lines over a soft band for your usual, with zone names on the right edge
("Above your usual", "Your usual", "Below your usual"), a white pill on the newest point, and no dashed lines (Florin
rules, even where Oura uses them).

**Check in, after a change.** When a day shifts, a card asks: "Your first BM came later than your usual window. Anything
different yesterday?" It offers chips (Late dinner, Short night, Stress, Travel, Alcohol, Period, + More) that save as
tags on that day. This is where Florin's weekly check-in tags could live day to day.

**Timing as a body clock.** The morning as a curved arc of hour marks, your usual window as a band on it, and today's
first BM as a dot. One sentence under it.

**Habits.**
- How often and form become "This week, last 30 days, your usual" as stacked horizontal bars with the values written
  in.
- The pattern card shows its two groups (after pizza, other mornings) the same way.

**Motion.** Arcs sweep in, numbers count up, bars fill, the scrubber pill fades in, all inside the reduced-motion guard.
