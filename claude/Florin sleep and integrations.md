# Florin sleep and integrations

November 5, 2026. A spec for layering sleep into the Florin app refresh: a one-tap sleep log, Apple Health and Oura
sync, a few prompts, and what sleep does on each screen. It is written to be built in the prototype
(`prototype/_local.html`) and follows CLAUDE.md, `Florin decisions.md`, `Florin data viz.md` and DESIGN.md. Figures
in quoted copy are examples: on the phone every one comes from the model, never typed.

**Will's ask (Nov 5):** "Is 'Quality of Sleep' a logging item? We should definitely layer it in. App integrations:
Apple Health Kit, Oura Ring? Through the systems, maybe a prompt here and there like 'want to layer sleep? sync.'
something during onboarding?"

**Where it stands:** sleep is barely in the app. The Full survey asks "How have stress and sleep been lately?", the
check-in has a "Short nights" tag, and Profile lists Apple Health, Oura and a cycle app as Not connected, with no way to
connect. The model, Today, Insights, patterns and Ask Florin have no sleep. DESIGN.md already keeps Teal for context,
sleep included, as a row under a chart's axis. The decision sheet's integrations line says connecting is free and the
patterns Florin finds from it are in membership.

## In short

- **Both ways in.** A one-tap word for last night (Restful, Mostly restful, Restless, Hardly slept), with optional bed
  and wake times, and Apple Health or Oura sync. Synced hours are used where they exist. The person's word is always
  theirs, and both show.
- **Sleep is context.** It never changes FloraScore, never changes a day's mark or count, and is always Teal. It is read
  against the person's own usual in words only.
- **It earns its place in three spots:** last night on Today and in History, when you woke on Insights' Timing card,
  and possible patterns ("Short nights, then a looser first BM") through the same test and gates as foods.
- **Prompts, one at a time:** a set-up step, a light "Last night" row on Today for people who log sleep, one offer to
  sync after the third night logged by hand, and one on Insights' Timing card. Each is shown once or until answered,
  and remembered.
- **Free and membership** follow the integrations line: logging, connecting, last night, History and the 7-day
  Timing row are free. 30 and 90 days, sleep patterns and Ask Florin with sleep are membership.
- **A tenth decision on the page, Sleep:** Log and sync (recommended), Log only, Sync only.

---

## 1. The sleep log

### What a person logs

**The word, one tap.** "How did you sleep?" Four steps in our own words, most restful first. They are not taken from,
and must not be adapted from, any licensed sleep questionnaire, and none of them grades the night.

| Step | Word | Its line |
|---|---|---|
| 0 | Restful | Slept through, or close to it |
| 1 | Mostly restful | Woke once or twice, then slept again |
| 2 | Restless | Woke often, or lay awake a while |
| 3 | Hardly slept | Very little sleep |

**Times, optional.** "Add times" opens two fields, Went to bed and Woke up, filled with the person's last logged times
(11:00 PM and 7:00 AM the first time). The sheet says the span it makes: "7 h 25 min in bed". A person logs time in
bed, never time asleep: only a device measures that.

**A note, optional**, run through `L.alarmsIn` like every note (the wide net, not the BM net). "Up twice in the night to
go" names an alarm feature, waking at night to go: the saved night shows the Teal flag note and routes to primary care,
and today is flagged as for a symptom note that names a sign. The sheet never asks about bathroom trips.

### How a night is kept and read

- **A night belongs to the morning it ends on.** Day d's night is the sleep that ended on the morning of day d, so
  today's is "Last night". A night is the main sleep ending between 3 AM and 2 PM. Naps and daytime sleep are left out
  (people who work nights are a later question).
- **A night is never an entry.** It lives in its own slot on the day, `x.night = { log, sync, hidden }`, never in
  `x.entries`. Nothing that counts entries changes: `L.facts`' logged and state, `L.tally`, `RU.week`, `RU.bmCount`,
  `L.foodCounts`, the standouts, the gap rules. A day with only a night stays a day with nothing logged, keeps its
  empty ring and Add, and is drawn the same everywhere.
- **`L.night(M, d)`** gives one night's reading: `{ d, known, from: "sync" | "log" | null, src: "apple" | "oura" |
  null, word, hours, kind: "asleep" | "in bed", bed, wake, stages, ouraScore, short, under }`. Hours are time asleep
  from a source, else time in bed from logged times, else null.
- **Your usual sleep** (`M.usual.sleep`): the middle of the person's known nights with hours, over the same weeks every
  usual comes from (days 28 to 83), once there are 14 of them (`L.SLEEP_USUAL_N`). It reads the kind of hours that
  covers most of those nights (asleep or in bed) and says which: "About 6 h 55 min a night, asleep, from Oura".
- **A short night** is one an hour or more under the person's usual (`L.SHORT_BY = 1`), or, when there are no hours,
  one logged as Hardly slept. `under` is how far under, in minutes. Restless alone is not short. With no usual yet,
  only Hardly slept is short.
- **Words for a night,** the same on every screen: "5 h 48 min asleep", "7 h 25 min in bed", "11:52 PM to 5:40 AM",
  "From Oura", "From Apple Health", "You logged", and, only for a short night, "1 h 05 min under your usual 6 h 55
  min". Durations are hours and minutes, never decimals. No night is ever called long enough, too short, good or bad.
- **Colour:** a night is Teal everywhere, with a crescent glyph of its own (`sleep`, not the late-dinner moon). It is
  never Plum and never Gold, whatever it reads against the usual. The words carry that.

### Where it lives

**Plus.** A row under the Symptoms and What you ate tiles, styled as the check-in row:

| State | The row |
|---|---|
| Today, nothing yet | **Sleep** · Last night, not logged yet |
| Today, a word logged | **Sleep** · Last night: Restless |
| Today, synced | **Sleep** · Last night: 5 h 48 min asleep, from Oura |
| Catching up on a day | **Sleep** · The night before Wednesday |
| Sync only, nothing connected | **Sleep** · Bring it in from Apple Health or Oura (opens the source sheet) |

**The sleep sheet** (`slp`): title "Last night" (or "The night before Wednesday"), the four words as one-choice rows
with their lines, Add times, the note, Save. With a synced night, its hours and times sit read-only at the top ("From
Oura: 5 h 48 min asleep, 11:52 PM to 5:40 AM") and the sheet offers only the word and the note. Saved: the toast
"Sleep saved." with Undo and Add times.

**Today, the "Last night" row.** A light card, not a nag: kicker "Last night", the line "How did you sleep?", the four
words as 44px chips in a two by two grid, and a close button named "Not today". One tap saves the word (toast: "Sleep
saved: Restless." with Undo and Add times) and the card is gone; the night shows as the first row of today's logs.
When it shows, and how it stays quiet, is prompt `slp-am` in section 3.

| Home | Where the row sits |
|---|---|
| Compact (the default) | Under the FloraScore strip and its flag note, above the week row |
| Score first | Under the hero, above the check-in card (a new Today part, `night`) |
| Day first | Under its row to log from |
| Easy | Its own card after the three big buttons (below) |

**Today's logs and History.** The night is the first row of each day, before the entries: icon `sleep`, title "Night ·
Restless" (just "Night" with no word), sub-line its hours, times and source, and the under-your-usual line when short.
Compact's day panel shows it the same way, since it draws the day through `RU.historyDay`. A tap opens the sleep sheet.
History's filter gets a Sleep chip. The calendar draws no mark for sleep: a day's mark stays its BMs' reading, with the
one Teal square for symptoms.

**A synced night** can't be edited in Florin ("From Oura. Change it in Oura."). It can take a word and a note, and it
can be hidden: "Hide this night" stops Florin using it, and the person's own logged times, if any, are used instead.

**The Easy version.** Today: when the row would show, a big card "How did you sleep last night?" with the four words as
56px rows, after I had a BM, Something feels off and What I ate. Plus: a fourth big button, "How I slept". The sheet
takes Easy's sizes. History's night row gets bigger with the rest. Your weeks has no sleep card yet.

### Seeded demo data

Every person's nights start from the studio's seeded hours (`A.days[d].sleep`, the night before that morning, in hours
asleep: short nights on the rougher days, 5.8 hours last night). Bed and wake come from a seeded pass of their own:
wake 20 to 70 minutes before the first BM (7:00 AM, give or take 30 minutes, on a day with none), in bed 15 to 45
minutes longer than asleep. These are kept aside at build as `M.seedNights[d]` (as `M.seedMeals` is), and sync fills
nights from them. Apple Health nights carry stages; Oura nights carry stages and a seeded Oura sleep score.

| Person | Sleep logged by hand | What the demo shows |
|---|---|---|
| Sarah | A word on about 3 in 4 mornings, ordinary nights too, with times on about half; not last night | Today's "Last night" row (she hasn't logged it yet). Insights checks her nights: nothing stands out |
| Marcus | A word after every short night, and on about 1 in 5 other mornings, never times; last night logged as Hardly slept | Sleep patterns held back: few ordinary nights. Connecting Apple Health fills them; still nothing stands out |
| Alex | None | No nights until Oura is connected. Then the sleep pattern |

**Alex's pattern, seeded on the sleep side** (`PATTERN_SLEEP = { alex: "looser" }`, a pass of its own, as
`PATTERN_DISH` is for meals). Every morning before day 84 whose first BM was looser than Alex's usual forms, and that
didn't follow beans or a dinner past 8 PM, gets a short night before it (5.2 to 5.6 hours). The studio's other short
nights before day 77 are lengthened to 6.4 hours, as the studio already does for days 56 to 76; the designed weeks
(77 to 90) keep the studio's nights. Picked on the steps, so the same nights are short in A, B and C.

Seeding the nights, not the BMs, keeps every existing figure: no BM, form, symptom, meal, usual, FloraScore or food
pattern changes. A simulation of this seeding (scratch, not the build) gives, for Alex with Oura connected:
"Short nights, then a looser first BM", 6 of 9 against 9 of 74 other nights, Showing up often, in A and C. In B it
doesn't show, since Loose covers both of Alex's forms on those mornings, which is option B's known cost (decision 1).
Sarah and Marcus show no sleep pattern in any option. The model's numbers are the ones that count.

Why not "later first BM", the task's other idea: in the seeded data every later morning of Sarah's and Marcus's, and 16
of Alex's 19, follows a dinner past 8 PM, so a short-night pattern on timing would be the late-dinner pattern again.
The test for later mornings still runs (below), and the pattern page says when short nights and late dinners overlap.

---

## 2. Sync

### What each source brings

| | Apple Health (HealthKit sleep analysis) | Oura |
|---|---|---|
| Read | In bed, asleep (unspecified, or core, deep and REM where the device records stages), awake | The night's sleep period: bedtime start and end, total sleep, time in bed, deep, REM, light and awake time; the day's sleep score |
| Florin uses | Asleep (else in bed), bed, wake, stages for the night's details | Total sleep, bed, wake, stages for the details, the score on the night's details only |
| Label | From Apple Health | From Oura |
| Notes | An iPhone alone may record only time in bed, so hours fall back to in bed. HealthKit never tells an app whether read access was denied | Oura writes to Apple Health too: with both connected, Apple Health samples whose source is Oura are skipped |

Field and scope names are to check against Apple's and Oura's current developer documentation before the real build.
Android (Health Connect) and other devices are later.

### Which night is used

1. **One sleep source.** With both connected, Profile asks "Sleep comes from" (Apple Health or Oura), the first
   connected by default.
2. **Synced hours and times win** for that night, in every count, chart and pattern. Times the person logged stay in
   History under the synced ones, in Ink 3: "You also logged 11:30 PM to 6:45 AM".
3. **The word is always the person's.** A synced night with a word shows both: "Night · Restless", "5 h 48 min asleep,
   11:52 PM to 5:40 AM · From Oura".
4. **A hidden synced night** is left out; the person's logged times, if any, are used.
5. **Sync reads from the day the person joined Florin.** Reading further back, to set the usual sooner, is a later call.

### The connect flow in the demo

Simulated, never real, and never a copy of Apple's or Oura's screens: the permission step is a plain stand-in sheet,
labelled as one.

| Step | Overlay | What it says and does |
|---|---|---|
| 1. What Florin reads | `slp-about`, a sheet | Title "Bring in sleep from Apple Health" (or Oura). "Florin reads your sleep: when you went to bed and woke, time asleep, and sleep stages if your device records them." (Oura adds "and Oura's sleep score".) "Florin only reads. It never writes to Apple Health, and reads nothing else." "Your nights sit next to your logs as context. They never change your FloraScore." "Turn it off any time in Profile, under Connected apps." Continue, Not now |
| 2. Permission | `slp-perm`, a stand-in | Kicker "Stand-in for iPhone's Health permission sheet" (or "Stand-in for Oura's sign-in page"). "Florin would like to read: Sleep." Allow, Don't allow. Under it, Apple: "In the app, Apple's own sheet appears here." Oura: "In the app, Oura's own page opens here: you sign in to Oura and allow Florin to read your sleep." |
| 3. Connected | `slp-done`, a sheet | "Apple Health is connected." "<n> nights brought in, from <first date> to last night." (count and dates from `L.sync`). "What changes:" last night shows on Today, and every night in History; Insights' Timing card shows when you woke; with Florin membership, Florin looks for patterns with your sleep, as it does with meals. Done |
| Then | | Toast "Apple Health connected." The model gains the nights (`L.sync(M, src)`); Today's "Last night" row is gone (last night is known); Profile's row reads Connected; Insights, patterns and Ask Florin read the nights |
| Don't allow, Apple | `slp-done`, no nights | "Florin hasn't received any nights from Apple Health. If sleep is turned off for Florin, turn it on in the Health settings on your iPhone." Profile: "Connected · no nights yet" |
| Cancel, Oura | | Back where they were. "Oura isn't connected. Nothing was shared." |

**Disconnect** (`slp-off`): "Stop bringing in sleep from Apple Health?" Two choices for the nights already brought in:
"Keep them in Florin" or "Remove them". Apple Health then adds: "To remove Florin's access fully, also turn it off in
the Health settings on your iPhone." Oura's disconnect ends Florin's access at Oura.

In the demo, sync lives in the phone's state per person (`api.S.slp[persona] = { src, seen, quiet, dismissed }`), is
put back on the model after any rebuild (a change of Logs, meals or consistency), and Reset clears it. It isn't stored
across reloads, like the other demo state.

### Profile, Connected apps

| Row | Not connected | Connected |
|---|---|---|
| Apple Health | Not connected · Reads sleep only | Connected · sleep, <n> nights (or "no nights yet") |
| Oura | Not connected · Reads sleep only | Connected · sleep, <n> nights |
| Sleep comes from | (only with both connected) | Oura, a two-way pick |
| A cycle app | As now | As now |

A tap on a row not connected opens step 1. A tap on a connected row opens `slp-app`: "Connected on <date>. Florin reads
sleep only." "<n> nights brought in. Last night: 5 h 48 min asleep." The privacy lines, then Disconnect.

Also in Profile: **Your usual** gains a fifth row, "Sleep, your usual: about 6 h 55 min a night, asleep, from Oura"
(or "Once there are 14 nights with hours"). **Logging** gains a switch, "Ask about last night on Today", with the line
"A row on Today each morning until you log or close it."

### Privacy lines

On `slp-about`, `slp-app` and the Privacy sheet, word for word:

- "Read only. Florin reads your sleep and nothing else, and never writes to Apple Health or Oura."
- "What's read: when you went to bed and woke, time asleep and in bed, sleep stages where your device records them,
  and, from Oura, its sleep score."
- "Your nights stay with your Florin logs. They're never sold or used for ads, and they're left out of research
  sharing."
- "To disconnect: Profile, Connected apps, the app, then Disconnect. You choose whether the nights already here stay."
- "Export and delete include your nights, like every log."

Before shipping, counsel reads these against Apple's HealthKit rules and Oura's API terms, and the two names and any
marks follow each company's guidelines.

---

## 3. Prompts

Rules for all of them: at most one sleep prompt on a screen; each can be dismissed; each is remembered per person (in
the app, on the account; in the demo, `api.S.slp`, cleared by Reset); none shows on Just joined's day 1 except the
set-up step; none blocks logging. Status lines (the patterns card's held-back line, Profile's rows) aren't prompts.

| Id | When it shows | Its words | Where it leads | Remembered |
|---|---|---|---|---|
| `slp-onb` | Set-up, Short and Full. Short: after Reminders, before What Florin is (8 steps become 9). Full: after Stress and sleep (14 become 15) | Kicker "Sleep". "Add your sleep, as context?" Sub: "Florin can show your nights next to your logs, so you can see what tends to come before a change. Sleep never changes your FloraScore." Rows: "Connect Apple Health" (Reads your sleep only), "Connect Oura" (Reads your sleep only), "I'll log it myself" (One tap on Today: how last night was). Skip | The connect flow over the step, then the next step; or turns the Today row on | The answer goes in Profile, About you ("Sleep: Oura"), and reopens its step |
| `slp-am` | Today, when last night isn't known, from day 2, for a person who logs sleep: they picked "I'll log it myself", or logged a night in the last 14 days, or turned the switch on in Profile. Never when a source is connected. Sync only: never | The "Last night" card: "How did you sleep?" and the four words | One tap saves the word | Gone for the day when answered or closed. Closed three mornings running, it goes quiet: toast "Florin won't ask about sleep on Today. Turn it back on in Profile." and the Profile switch turns off |
| `slp-3rd` | The third night logged by hand, when no source is connected. Log only: never | The save toast: "Sleep saved. Apple Health or Oura can bring your nights in for you." with Undo and Connect | Connect opens the source sheet `slp-pick` | Shown once, ever |
| `slp-ins` | Insights, the Timing card, at 7 or 30 days, when no source is connected and the stretch has no nights, or nights on under 6 in 10 of its logged days. Log only: it offers logging only | A row under the legend: "Sleep can sit next to these mornings: log last night, or bring your nights in from Apple Health or Oura." Button "Add sleep", close "Not now" | `slp-pick` | Gone for good when closed, connected, or once nights cover the stretch |

**The source sheet** (`slp-pick`): "Bring in your sleep", rows "Apple Health · Reads sleep only", "Oura · Reads sleep
only", "Log it myself · One tap each morning" (that row opens the sleep sheet for last night). Sync only drops the last
row; Log only never opens this sheet.

Ask Florin is not a prompt: when someone asks about sleep and Florin has no nights, the answer says so and offers Log
last night and Connect as option rows.

---

## 4. What sleep does in the app

### FloraScore

Sleep is context, not a FloraScore part. The score keeps its four logged parts (timing, how often, form, comfort) and
their weights, and never moves with a night, synced or logged. Section 5 has the decision; it's a call for Will.

### Insights

**The marks** (add to data viz.md, section 1, chart marks):

| Chart | Sleep's mark |
|---|---|
| Timing card, the morning strip (time of day across) | A Teal row under the axis, labelled "Woke" in Space Mono 10px: one 1.5 by 8px Teal tick at each known wake time in the stretch. The axis widens to take the earliest wake. Legend: "When you woke, from Oura" (or "from your logs"). No ring, no label on today's tick: the ring stays today's first BM. Table twin: a Woke column |
| Timing detail, every BM day by day | On each day's row, a Teal tick at that day's wake time. A short night is a Teal tick in its own column, headed "Night", beside the late-dinner column, which takes the head "Dinner". Legend lines: "When you woke", "Short night: an hour or more under your usual". Table: Night (hours), Woke |
| 90 days (the weekly bars) | No sleep row: there's no day to sit under. The words and the patterns carry it |
| Every other card | Nothing yet. A Teal row of nights under How often's, Form's and Symptoms' by-day charts is the next step, once Will has seen Timing |

Sleep is never a third layer on a chart and never changes a mark's colour. A night not known is drawn as nothing, as a
gap is.

**Possible patterns.** Two tests join `L.patterns`, over the same 90 days, with the same bar (5 or more short nights,
6 in 10 or more of them followed by the change, more than on other nights, and the one-sided binomial test at 1 in 100):

| Test | The night | The morning after | Title |
|---|---|---|---|
| `sleep:looser` | Short | A first BM looser than the usual forms (`L.inForms` false, above the usual; a word that could be either counts as no) | Short nights, then a looser first BM |
| `sleep:later` | Short | A first BM after the usual window, as late dinners read it | Short nights, then a later first BM |

The pool is every morning with a first BM logged and a night known. Both read against the person's own usual: a fixed
"Soft or looser" bar, as the food test uses, is met on more than half of the seeded mornings, so it can't see a change.
(Whether foods should move to the same reading is a question for the studio.)

**The gate,** as for meals: under 6 in 10 of the logged days in the 90-day window with a night known
(`L.SLEEP_COVER`, equal to `L.MEAL_COVER`), sleep patterns are held back (`sleepSparse`). People log sleep after rough
nights more than ordinary ones, which leaves too few ordinary nights to compare. Coverage is counted once, `nightDays`
of `loggedDays`, and every sentence uses it. The patterns card says, while held back: "Nights are known on 25 of the 87
days you logged in the last 90 days, most of them short nights, so there are few ordinary nights to compare with. Log
sleep most mornings, or connect Apple Health or Oura." (figures from the model).

**A sleep pattern's page** (`pattern:sleep:looser`), as a food's:
- the two share bars: "After a short night" (6 of 9) and "After other nights" (9 of 74);
- the line: "After 6 of 9 short nights, your first BM was looser than your usual forms. After other nights, 9 of 74.";
- Where this comes from: "Nights from Oura, and the first BM you logged that morning." (or "Nights you logged");
- the overlap, when meals are read: "2 of the 9 short nights came after a dinner past 8 PM." (or "None of the 9");
  with meals held back: "Dinners aren't logged on enough days to tell short nights and late dinners apart.";
- How to test it: "To see whether it holds for you, keep logging as you are. Florin keeps checking as nights come in.";
- the table: Night, Hours, First BM that morning, Followed;
- always: "Patterns show what tends to happen together. They don't prove cause."

It never suggests how much to sleep, and never says sleep caused anything.

**The patterns card** lists sleep patterns with the others (the `sleep` glyph), and its "Checked, nothing stands out
yet" line adds "short nights" when the sleep tests ran and found nothing.

### Ask Florin

The facts packet (`read()` in refresh-ask.js) gains a section, **Sleep**:

- Sleep comes from: "Oura, connected Oct 11" / "their own logs" / "nothing logged or connected";
- Last night: "5 h 48 min asleep, 11:52 PM to 5:40 AM, from Oura; logged as Restless" (or "not known");
- Usual sleep: "about 6 h 55 min a night, asleep";
- per stretch: Nights known "60 of 85"; Short nights "9";
- patterns: each sleep pattern found, with its counts and the late-dinner overlap; or "Sleep patterns held back: nights
  known on 25 of the 87 days they logged, under 60%";
- How Florin reads sleep: "context only: it never changes FloraScore or a day's reading; a short night is an hour or
  more under their usual, or one logged as Hardly slept".

Oura's sleep score stays out of the packet: it's Oura's reading, and Ask Florin doesn't explain another company's
score. The rules turn adds: never say sleep changed FloraScore; never say how much sleep someone needs or should get;
never say sleep caused a change. The computed answers gain a sleep intent ("How did I sleep?", "Do short nights change
my mornings?"), answered from these lines only. A question about sleep still runs the alarm net first, so "I keep
waking at night to go" gets the clinician answer.

### The weekly check-in's "Short nights" tag

Shown only when Florin has nights for fewer than 4 of the week's 7 days. Otherwise the tag leaves the chips, and the
tag step shows one Teal line from the nights: "Short nights this week: Tuesday and today, from Oura." or "No short
nights this week, from your sleep logs." (The decision is in section 5.)

### Free and membership

| | Free | Florin membership |
|---|---|---|
| Log a night, the Today row, plus | Yes | Yes |
| Connect Apple Health or Oura | Yes | Yes |
| Last night on Today, nights in History | Yes | Yes |
| Insights' Timing card, the Woke row at 7 days | Yes | Yes |
| 30 days, the Timing detail's night marks | No (the range is locked, as now) | Yes |
| Sleep patterns | The patterns teaser, blurred, as now | Yes |
| Ask Florin with sleep | Locked, as now | Yes |
| Nights in the clinician report | The basic report, if built, lists them | Yes |

The paywall's patterns row becomes "From what you eat, when, and how you slept".

### Data styles and Easy

| Style | How it shows sleep |
|---|---|
| Florin charts | Everything in this section |
| Rings, Field journal, Bento, Oura | No sleep rows yet: their own cards draw none. Sleep patterns show in their pattern cards, worded by the shared helpers. Today's night row and History are the same in every style |
| Easy read (the Easy version) | Today's big "Last night" card, plus's "How I slept", History's night row, and sleep patterns in Your weeks' patterns card. No sleep card in Your weeks yet |

(The Oura data style and Oura sync are unrelated: one is a look, the other a source.)

---

## 5. The decisions

### How does sleep come in: logged, synced or both?

**What it decides:** how a night gets into Florin, and what plus, Today and Profile offer for sleep. On the page it's
decision 10, Sleep.

**Log only**
- What it is: A one-tap word for last night on Today and in plus, with optional bed and wake times.
- Why do it: Everyone can do it, with no device and nothing to connect.
- Why not: People log after rough nights more than ordinary ones, so Florin often has too few ordinary nights to compare.

**Sync only**
- What it is: Nights come from Apple Health or Oura, and nothing about sleep is logged by hand.
- Why do it: Every night arrives with no effort, ordinary nights included.
- Why not: People with no watch, ring or sleep schedule get nothing, and nobody can say how a night felt.

**Log and sync** (Recommended)
- What it is: Nights sync where a person has a source, and anyone can add a one-tap word for how a night felt.
- Why do it: Sync brings every night, and the word brings what only the person knows.
- Why not: Two ways in need one rule for which wins, and more to word and test.

**We recommend Log and sync.** Synced hours are used where they exist, and the person's word always stays theirs.

**Try it:** Decisions, Sleep. Then Today (Sarah's Last night row), Profile, Connected apps, and Insights' Timing card.

### Does sleep count in FloraScore?

**What it decides:** whether a night moves the day's FloraScore.

**Context only** (Recommended)
- What it is: Nights show beside the logs and in patterns, and FloraScore keeps its four parts.
- Why do it: The score means the same with a ring or without one, and stays a read of the gut against its own usual.
- Why not: Someone after a rough night may expect the day's number to show it.

**A fifth part**
- What it is: Sleep joins timing, how often, form and comfort, with the weights rebalanced.
- Why do it: One number takes in more of the day, as Oura's readiness score does.
- Why not: The score would move with whether a night was logged or synced, it stops being a gut score, and every figure changes.

**We recommend context only.** FloraScore is "from your logs" about the gut; sleep sits beside it, where a pattern can
show what tends to come together.

### When do we offer sync?

**What it decides:** the moments Florin asks a person to connect Apple Health or Oura.

**At set-up only**
- What it is: One onboarding step offers Apple Health or Oura, and Profile keeps the way in.
- Why do it: It asks once, when people expect to be asked.
- Why not: A new person can't yet see what sleep would add, so many will skip it.

**When it would help only**
- What it is: No set-up step; the offer comes after the third night logged and on Insights' Timing card.
- Why do it: The offer arrives when the person can see what it adds.
- Why not: People who would have connected on day 1 log by hand for weeks first.

**Both, one at a time** (Recommended)
- What it is: The set-up step, then at most two more offers, each shown once and gone when closed.
- Why do it: One ask at the start and one where sleep shows its value, never more.
- Why not: More moments to build, word and test.

**We recommend both, one at a time.** Section 3 names each prompt, its words and when it stops.

### What does a person log about a night?

**What it decides:** the sleep sheet and Today's row.

**A word only**
- What it is: The four words, one tap, nothing else.
- Why do it: It's the quickest log in the app.
- Why not: With no hours, a short night only shows when someone picks Hardly slept.

**A word, and times if they like** (Recommended)
- What it is: The four words, with Went to bed and Woke up behind Add times.
- Why do it: One tap stays one tap, and anyone who wants hours can add them.
- Why not: Logged times are time in bed, which reads longer than a device's time asleep.

**Hours as chips**
- What it is: Chips such as "Under 6 h" or "7 to 8 h" in place of times.
- Why do it: Quick, and it gives a number.
- Why not: The buckets are rough, and a bucket of hours reads like an amount someone should get.

**We recommend a word, and times if they like.** It keeps the log to one tap and lets the usual come from hours.

### Show Oura's own sleep score in Florin?

**What it decides:** whether the score Oura owners know appears beside their nights.

**Leave it out**
- What it is: Florin shows Oura's hours and times, never its score.
- Why do it: There's one score in Florin, read against the person's own usual.
- Why not: Oura owners know their score and may look for it.

**On the night's details only** (Recommended)
- What it is: "Oura sleep score 82, from Oura" on the night's sheet; never on Today, a chart, a pattern or in Ask Florin, and never Oura's own words for its bands.
- Why do it: It's the number Oura owners know, and it shows Florin has the same night.
- Why not: Two scores in one app can still be mixed up.

**We recommend the night's details only.** It's labelled as Oura's, and Florin never reads it.

### Keep the check-in's Short nights tag?

**What it decides:** whether the weekly check-in still asks about short nights.

**Keep it as it is**
- What it is: The tag stays among the chips every week.
- Why do it: Nothing changes for people who don't log or sync sleep.
- Why not: It asks what Florin may already know from the nights.

**Drop it**
- What it is: The tag goes, and sleep comes only from logs and sync.
- Why do it: One place for sleep.
- Why not: People with no nights lose their one way to note a rough week of sleep.

**Keep it only when Florin has no nights for the week** (Recommended)
- What it is: With nights on 4 or more of the week's days, the tag gives way to a line from them.
- Why do it: Florin asks only what it doesn't know.
- Why not: The check-in looks slightly different from week to week.

**We recommend keeping it only when Florin has no nights for the week.**

---

## 6. The build plan

Run the five checks after each group (qa, behave, audit-spacing, shots, sweep), as CLAUDE.md says. Other jobs are
editing the prototype: read each file fresh before changing it.

### 1. The model: `prototype/js/refresh-data.js`

- Constants: `L.SLEEP_WORDS` (the four words and lines), `L.SHORT_BY = 1`, `L.SLEEP_USUAL_N = 14`,
  `L.SLEEP_COVER = L.MEAL_COVER`, `L.SLEEP_SRC = { apple: "Apple Health", oura: "Oura" }`.
- Seeded nights: `M.seedNights[d]` from `A.days[d].sleep`, with bed, wake, in bed, stages and an Oura score from their
  own seeded pass; `PATTERN_SLEEP = { alex: "looser" }` as in section 1; `SLEEP_LOGS = { sarah: "most", marcus:
  "rough", alex: "none" }` writing `x.night.log` (Sarah not today; Marcus today, Hardly slept). Learning modes seed no
  logged nights.
- `x.night = { log: null, sync: null, hidden: false }` on every day. Never in `x.entries`.
- Reading: `L.night(M, d)`, `L.nights(M, n)`, `M.usual.sleep`, `L.nightText(n)` (the words in section 1).
- Changing: `L.logNight(M, d, log)`, `L.unlogNight(M, d)`, `L.sync(M, src)` (returns `{ n, from, to }`),
  `L.unsync(M, src, keep)`, `L.hideNight(M, d, on)`.
- `L.facts` gains `night` and nothing else. `L.alarmOf` reads a night's note (`kind: "night"`, the wide net), and
  `L.flagToday` reads today's night.
- `L.patterns` gains the two sleep tests, `sleepSparse`, `nightDays`, and `sleepShare` (short nights among the nights
  logged, for the held-back line). Sleep tests have `kind: "sleep-looser"` or `"sleep-later"` and `src: "sleep"`.
- One set of pattern words in the model: `L.patTitle(p, mode)`, `L.patCond(p)`, `L.patOther(p)`, `L.patLine(M, p,
  mode)`, `L.patSource(p)`, `L.patIcon(p)`. Today the titles are written in six places (refresh-insights.js,
  refresh-ask.js, refresh-app.js's Person note, looks-data.js, look-bento.js, look-easy.js), each reading any kind it
  doesn't know as a food's bloating. Every one calls these, before a sleep pattern can reach `found`.

Check: behave "sleep model" cases below; `node` on the model alone shows Alex's pattern in A and C, none in B, none for
Sarah and Marcus.

### 2. Today, plus and History: `refresh-ui.js` (hooks), `refresh-variants.js`, and a new module

- Core hooks in `refresh-ui.js`, each empty by default: `RU.todayParts.night` (and `"night"` after `"hero"` in
  `RU.todayLayout`), `RU.nightRow(M, V, d)` (first in `RU.historyDay`'s list and in Today's entries part),
  `RU.plusExtra(M, V, st)` (after plus's tiles), `RU.cardExtra(M, V, key)` (in an Insights card's `after`). History's
  filters gain Sleep.
- `refresh-variants.js`: Compact draws `part("night")` after `cpFlag`; Day first after its log row.
- New module `prototype/js/refresh-sleep.js` and `css/refresh-sleep.css`, loaded after refresh-ask and before
  refresh-easy. It fills the hooks; registers the overlays `slp`, `slp-pick`, `slp-about`, `slp-perm`, `slp-done`,
  `slp-app`, `slp-off`; the acts `slp-*`; the state `api.S.slp`; an `onSet` that puts sync back after a rebuild and
  follows `sleep`; `EXT.decisions.sleep`; the screens and notes below.

Check: shots of Today on Compact, Score first and Day first with the row, after a tap, and with Oura connected, light
and dark, 390 and 1440; History with nights; plus in each state of the table.

### 3. Insights: `refresh-insights.js`

- `morning()`: the Woke row and its legend; `morningDomain` takes wake times; the table twin's Woke column.
- The Timing detail's day rows: wake ticks, the Night column with heads, legends, table columns.
- Patterns: the card and pages through the `L.pat*` helpers; the held-back line; a sleep pattern's page as section 4.
- `RU.askContext` for timing: "Woke up, typically 6:50 AM" when nights are known.
- `slp-ins` arrives through `RU.cardExtra(M, V, "timing")` from the module.

Check: shots of Timing at 7, 30 and 90 days, with and without nights, Member and Free; the sleep pattern page; the
held-back card for Marcus.

### 4. Profile and onboarding: `refresh-profile.js`

- `STEPS.sleep` in both flows (section 3), its answer `sleepIn` in About you; picking a source runs the connect flow
  over the step.
- Connected apps from `api.S.slp`; `pf-app` opens `slp-about` or `slp-app`; "Sleep comes from" with both connected.
- Your usual's sleep row; Logging's "Ask about last night on Today" switch; the Privacy sheet's lines.
- The Profile and onboarding notes say the new step and rows.

Check: shots of both flows' sleep step, Profile with nothing, one and both connected.

### 5. Ask Florin: `refresh-ask.js`

- The Sleep section of the facts packet, the rules turn's three lines, the sleep intent and its computed answers.

Check: behave runs the computed answers for three sleep questions per person and the numbers check passes on each.

### 6. Easy: `refresh-easy.js`

- Today's big Last night card (same rule as `slp-am`), plus's "How I slept", the sheet at Easy's sizes.

Check: shots of Easy Today with the card, after a tap, and plus; no sideways scroll at 390.

### 7. The data looks: `library/js/looks-data.js`, `look-bento.js`, `look-easy.js`

- Pattern words through the `L.pat*` helpers. No sleep rows in the looks yet.

Check: `work/shots-library.js`; the library and the phone list the same patterns. Republish the library with the
prototype.

### 8. The page, notes and docs

- `refresh-app.js`: decision 10, `sleep` (Log and sync, Log only, Sync only), stored as `florin-refresh:sleep`,
  stamped `data-sleep`, in `V()`; the Person note's sleep line per person; the Screens group "Sleep": Today, the Last
  night row; Log last night; Set-up, the sleep step; Connect Apple Health; Connect Oura; Profile, Connected apps;
  History, a night; Insights, a sleep pattern (sets Person to Alex and connects Oura); Insights, sleep held back (sets
  Person to Marcus). A screen note each, about 80 words or fewer.
- `_local.html` and `index.html` load the new module pair in its place; the publish list gains `js/refresh-sleep.js`
  and `css/refresh-sleep.css`.
- `CLAUDE.md`: the load order, the hooks above, the night rules (a night is never an entry; a short night; the gate),
  decision 10, the publish list. `Florin decisions.md`: decision 10 and the other five as written in section 5; the
  integrations line; Short becomes 9 steps and Full 15. `Florin data viz.md`: section 1's two sleep marks. The brief:
  Will's Nov 5 notes and the calls below. The deck: owned by the deck workflow.

### 9. Checks: `work/behave.js`, `work/sweep.js`, `work/qa.js`, `work/shots.js`

New behave cases, by name:

- `sleep: a night never changes a day`: for every person, A, B and C, every meals setting: `L.tally` over 7, 30 and 90
  days, every day's state and the calendar's marks are the same before and after logging every night and after sync.
- `sleep: FloraScore ignores nights`: `L.score` for every day and `L.scoreMoved` are the same before and after sync.
- `sleep: Alex's pattern`: Oura connected, "Short nights, then a looser first BM" is found in A and C and not in B;
  no sleep pattern for Sarah or Marcus in any option or meals setting; every food pattern found before is still found.
- `sleep: held back`: Marcus before connecting has `sleepSparse`, and the card's line states the model's `nightDays`
  and `loggedDays`; after connecting it isn't held back.
- `sleep: pattern words`: no pattern title, line or condition anywhere reads "undefined", "null" or "then bloating"
  for a sleep pattern, on the phone and in every look.
- `sleep: the Last night row`: on Compact, Score first, Day first and Easy, Sarah's row shows; one tap on Restless
  saves, the row is gone, the night is the first row of today's logs, Undo brings the row back; Not today hides it for
  the day; three closes in a row turn the Profile switch off and say so.
- `sleep: one prompt at a time`: no screen draws two of `slp-am`, `slp-ins` and the `slp-3rd` toast.
- `sleep: connect`: Apple Health, Continue, Allow: the done sheet's count equals `L.sync`'s; Today shows last night
  From Apple Health; Profile reads Connected; Don't allow leads to "no nights yet"; Disconnect, Remove them, takes the
  nights away.
- `sleep: synced and logged`: a night with both shows the word and the synced hours, counts use the synced hours, and
  the logged times sit under them.
- `sleep: a note's alarm`: "Up twice in the night to go" on last night flags today and draws the Teal note.
- `sleep: Ask`: the facts packet has the Sleep section, never Oura's score; each sleep question's computed answer passes
  the numbers check.
- `sleep: Free`: connecting works on Free; the Woke row draws at 7 days; sleep patterns are blurred.
- `sleep: the check-in tag`: with nights on 4 or more days this week the tag is gone and the line names the short
  nights from the model; with none the tag is there.
- `sleep: every option drawn`: decision 10's three options each have the sheet's shape; Log only shows no connect,
  Sync only shows no word log.

`sweep.js` adds `sleep` to the decision pairs. `qa.js` checks the Last night chips and Easy's rows at 44 and 56px and no
sideways scroll at 390. `shots.js` covers the new Screens rows.

---

## Calls for Will

1. **Sleep as context only,** never a FloraScore part? (Recommended: yes.)
2. **Ship Apple Health and Oura sync in this version,** connecting free and sleep patterns in membership? Health
   Connect for Android, and other devices, later?
3. **Oura's sleep score:** on the night's details only, labelled as Oura's, or left out?
4. **The four words** (Restful, Mostly restful, Restless, Hardly slept): our own; counsel to confirm they aren't close
   to any licensed sleep questionnaire.
5. **A BM logged between bedtime and waking:** now that Florin knows the night, should it count as waking at night to
   go (an alarm feature) with no note saying so? We suggest not yet: ask a clinician adviser first.
6. **The Last night row** only for people who log sleep (as specified), or for everyone without a source?
7. **The check-in's Short nights tag** only when Florin has no nights for the week?
8. **Synced nights left out of research sharing** (counsel to confirm), and sync reading only from the day a person
   joined?
9. **Short nights and late dinners overlap** in real life: the pattern page says how often they did. Enough, or should
   Florin hold a sleep pattern back when most of its nights followed a late dinner?
10. **Decision 10 on the page,** with the label count, the sheet and the deck following?
