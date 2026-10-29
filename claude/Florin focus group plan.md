# Florin focus group test: the plan

October 29, 2026. For Will. The study runs the Florin app refresh, self-guided, on each participant's own phone, and
sends every answer, task result, comment and event to one Google Sheet. This plan says what the test answers, who takes
it, the flow minute by minute, every question word for word, what the app shows, what lands in the Sheet, and how we'll
read it.

Read with: `claude/Florin app refresh brief.md` (goals and Will's notes), `claude/Florin decisions.md` (the nine
decisions and our recommendations), `claude/Florin data viz.md` (the marks and the week card), the week options page
(`options/home/`) and `claude/Florin app refresh research.md`.

## At a glance

| | |
|---|---|
| Length | About 30 minutes, in one sitting. About 40 to 45 for people 65 or over. The soft launch times it |
| Who | 24 completed sessions, from 32 invited, in the US: people with gut symptoms or an interest in tracking them, recruited to the personas in section 2 |
| Where | Their own iPhone or Android phone, from a link. No account. The tasks run in the phone's browser; the last task puts the app on the home screen, and the rest runs from there |
| How | Self-guided: the flow walks each person through alone. Nobody watches or records them |
| What they do | Consent, nine intake questions, eight tasks with a rating and a few questions each, two short comparisons (three for Oura users), putting the app on the phone, two minutes of free use with double-tap comments, an exit survey |
| What they see | The Florin app as the prototype draws it, with our recommended decisions, the week card Will picks, and Sarah's 12 weeks of logs. Home and History are each shown half one way, half the other |
| Where it lands | One Google Sheet, five tabs (sessions, answers, tasks, comments, events), through a Google Apps Script web app. Thank-you codes go to a separate sheet for the recruiter. We summarise it when Will asks |
| The app | A static web app in `focus/`, hosted on Netlify (publish directory `focus/site`), loading the prototype's files and one focus module. Settings in `focus/config.js` |
| Why not a Claude artifact | An artifact can't take writes from people outside Florin Health's organisation, and its content security policy blocks posts to other hosts, so answers couldn't reach the Sheet |

"Prototype only. Not for patients." is on the welcome, the tour's first screen, the task menu and the last screen.

## Before launch

0. **Will picks the week card** from the options page (`options/home/`: the week card tightened, the week strip, the
   week in a note, Mornings). One design, or two to test half and half (section 2.4). Set `weekCard` in config.js.
1. **Counsel reads** the consent (3.3), the screener (2.2), every word in section 4 and the three messaging lines
   (MG1), and checks the state consumer health data laws, such as Washington's My Health My Data Act, for S6, IN2, IN3
   and the free text.
2. **The script.** Deploy the Apps Script once, from the Florin Health Google account that owns the Sheet (not a
   personal account), and confirm the Workspace settings allow "Anyone" access to a web app. Create the recruiter's
   separate sheet. Paste the web app URL into `focus/config.js`, with `study`, `team`, `contact`, `recruiter`,
   `thanksHow` and `keepMonths`.
3. **Build and pin.** Run the build that copies the prototype's and the library's files, and the chosen week card,
   into `focus/site`. Commit that pinned `focus/site`. Netlify: import this GitHub repo, publish directory `focus/site`,
   and turn auto-deploys off for the fieldwork, so another workflow's change to `prototype/` never reaches a
   participant. Change `build` only between batches.
4. **A Playwright run** that completes every task in both versions, in every arm (both Homes, both Histories, each week
   card), with every goal firing, at 360 and 390 wide, at the Easy version's type size and at Android's largest font.
   The task strip must fit (3.5).
5. **Test runs on real phones**, with `?test=1`: iPhone Safari on iOS 26 in each Safari layout (Compact, Bottom, Top)
   and on iOS 18; an iPhone opening the link from Gmail (the in-app view); Android Chrome; Samsung Internet. Check:
   which address iOS 26 opens from the home screen, the one carrying `?c=` or the manifest's `start_url` (3.7); the
   code carries the session into the installed iPhone app; the queue empties; every tab fills in as section 6 says;
   Android's back gesture closes a sheet, not the app; pull to refresh is off; the install pictures match the menus.
6. **A soft launch of 6**, two of them 65 or over on iPhone. Time it, read their rows, fix. If the median runs over 32
   minutes, cut in this order: CP2's small task (a plain look instead), BM2, IV2, WK3, free use to 1 minute.
7. Invite the rest, in batches.

## Calls for Will

- **The week card** to test (Before launch 0).
- **Recruitment:** who finds the 32, including five people 65 or over and six who use the Florin app now, and the
  budget for recruiting and the thank-you. If current users come from Florin's own user list, the person who contacts
  them is kept apart from the people reading the answers.
- **The thank-you:** how much, who pays it, and how (it goes in the consent).
- **The research team** named in the consent (`team`).
- **How long to keep the data** (`keepMonths`; we suggest 6 months from when the study closes).
- **The optional follow-up contact** (`followUp`, off by default), kept apart from the answers.

---

## 1. Goals

Ten questions this test answers for Will. Each says which decisions it informs and how we'll know. The bars are in
section 7.5.

| # | The question | Informs | How we'll know |
|---|---|---|---|
| G1 | Can people use the app alone, on their own phone, from a link? Log a BM and fix its time, read the week and FloraScore, find a pattern, answer the check-in, look back in History, ask Florin, then put it on the home screen | 2 BM logging, 4 History, how a pilot is delivered | Task outcome (the app sees the goal reached), seconds, hints, the ease rating per task, the SUS score, how many put it on the home screen, by platform and age |
| G2 | Do people read the week and FloraScore the way we mean them: against the person's own usual, not a grade and not a comparison with other people? | The week card (Will's pick), 7 Data style and the hero's words | Right answers on the reading questions (WK1 to WK3, SC1, SC2), computed from the phone's live logs; the week and score tasks' chips; comments on them |
| G3 | Are Consistency C's seven words clear, to first-timers and to people who use today's app? | 1 Consistency, counsel's read of the words | Which words people mark unclear (BM1) and which pairs are hard to tell apart (BM2), split by IN5 |
| G4 | Which Home and which History work better, and which would people rather have? | 3 Home, 4 History | Each arm's task outcomes, seconds and ease, then a look at the other option and a preference (CP1, CP2), with half seeing each first |
| G5 | Would people answer a weekly check-in? | 5 Weekly check-in | CK1 and the check-in task's ease. US2 and US3 give stated logging habits, as context |
| G6 | Do people trust it, and does anything read as a diagnosis or worry them? | Ask Florin, the claims guardrails | TR1 to TR4, EX1 against IN8, AS1, and comments marked confusing |
| G7 | What would people use, pay for and miss? | Membership and its price (direction only), integrations | FV1, FV3, MS1, MS2, US1, VA2, VA3, and taps on the membership page's Start membership |
| G8 | Does the Easy version work for the people it's for, and do they pick it? | 8 Version and its open question (offer Easy when the phone's text is large) | Every participant 65 or over uses Easy: their task outcomes and words, read as problems found. IN9 (which version they'd choose) against TX2 (text set large), TX1 |
| G9 | How should the data vis modules be organised, module by module? | The Insights cards' order, what folds into a detail page, what goes | IV1 and IV2 on the live card titles, FV3, a view event per card and the deepest scroll per screen, comments by card (7.4) |
| G10 | Which way of describing the app makes people want to try it? | Messaging (no recommendation yet) | MG1 and MG2, by segment |

**Not in this round:**
- Onboarding (decision 9). Every participant starts with 12 weeks of logs, so there is no set-up to try. A second round
  could start on Just joined and run the Short set-up first.
- The meal sheet (decision 6). A meal task would push the session past 30 minutes. Free use reaches it, and comments on
  it are read, but no bar rests on it; US3 is a stated habit, beside Will's Oct 14 note.
- Ask Florin on Free. Nothing here can tell one free answer a week from members only.
- The clinician report and the alarm path. Neither is shown; MS2 asks whether people want a report.

---

## 2. Who to recruit

### 2.1 Numbers and quotas

Aim for **24 completed sessions**; invite about 32, since self-guided sessions lose about a quarter. Five people per
group find most of the problems a group will hit, so every quota below is at least five.

| Quota | At least | Why |
|---|---|---|
| Live in the US | All | US prices and English; consent written for US law |
| iPhone | 10 | The install steps and the code differ on iPhone |
| Android | 8 | The install prompt differs |
| Each of pattern seeker, fits my stack, tracker (screener S5) | 5 each | The three groups the demo people were built for |
| 65 or over | 5 | The Easy version's person. All of them use Easy (2.4) |
| IBS-D, or told they might have IBS (S6) | 8 | The core audience |
| Use the Florin app now, or have tried it (S7) | 6 | Consistency C changes two of today's words |
| Notice gut symptoms a few times a month or more (S4) | 16 | The app has to work for people who log on rough days |
| Women and men | 8 each | The research behind the demo people split by gender (2.3). Balanced in recruiting; the study itself never asks |

### 2.2 The screener

The screener is the recruiter's form (a separate Google Form), run before anyone gets the link. It holds the contact
details needed to send the link and the thank-you, and it is **never joined to the study's Sheet**: the study link
carries no name, email or recruit id. It asks only what the quotas need. Its words follow the same rules as the app.

Above the first question, word for word:

> This form is kept by {recruiter}, the study's recruiter, apart from the study itself. We use it only to choose who to
> invite, and to send the link and your thank-you. The research team never sees it. It's deleted when recruiting ends
> and every thank-you is paid.

| # | Question, word for word | Answers | Rule | Why |
|---|---|---|---|---|
| S0 | Do you live in the United States? | Yes · No | No: end | The study is set up for the US |
| S1 | Are you 18 or over? | Yes · No | No: end | The study is for adults only |
| S2 | Which phone do you use most days? | An iPhone · An Android phone · Another phone · I don't have a smartphone | Another or none: end | The test runs on the person's own phone |
| S3 | Could you spend about 30 minutes on your phone, somewhere quiet, in the next week? | Yes · No | No: end | Self-guided sessions need one sitting |
| S4 | How often do you notice gut symptoms, such as bloating, belly pain or a sudden urge to go? | Most days · A few times a week · A few times a month · Rarely or never | Quota | Most of the group should have symptoms to log |
| S5 | What would you most want from an app for your gut? Pick one. | To see what tends to come before a rough day · Something simple, with big buttons and plain words · To fit in with the health apps or wearable I already use · My own numbers, in detail, to dig into · A record I can show a clinician · I'm not sure yet | Quota | Fills the persona groups (same words as IN1) |
| S6 | Do either of these describe you? | I have IBS-D · I've been told I might have IBS · Neither · Prefer not to say | Quota | The core audience quota, and nothing more. The words are the app's own set-up options |
| S7 | Have you used the Florin app before? | Yes, I use it now · Yes, I've tried it · No · Not sure | Quota | Current users know today's words and flows |
| S8 | Your age range | 18 to 24 · 25 to 34 · 35 to 44 · 45 to 54 · 55 to 64 · 65 or over · Prefer not to say | Quota | The Easy version's person is 65 or over |
| S9 | How do you describe your gender? | Woman · Man · Another way · Prefer not to say | Quota | Balance only; the study never asks |
| S10 | Do you work in any of these? Pick any. | Making apps or websites · Market or design research · A company that makes health or wellness apps or devices · Health care, as a clinician · None of these | Any but None: end | Professional testers and competitors skew the read; clinicians get a round of their own |
| S11 | How should we send you the link? | Email · Text message, then the address or number | | To send the link and the thank-you. Kept in the recruiter's form only |

**For counsel before recruiting:** whether the screener should exclude the audience in the studio's claims rule 8
(`claims-rules.js`). The study's own words never name it, so if a question is needed, counsel words it.

The invitation, word for word:

> Florin Health is testing an early version of the Florin app. Would you try it on your phone for about 30 minutes
> and tell us what you think? There's no account to make. Open this link on your phone, in Safari or Chrome: {link}
> Prototype only. Not for patients.

### 2.3 The personas, and the intake questions that find them

The brief asks how each feature fits the personas. The prototype carries them in its three demo people (the research
lines in `prototype/js/data-app.js`) and the Easy version's person (`refresh-easy.js`); the shipping app's set-up notes
add the clinician record and today's users (`reference/shipping-app/onboarding-and-profile.md`).

| Persona | Who they are | Found by |
|---|---|---|
| Pattern seeker | Wants to see what tends to come before a rough day: patterns, triggers, outcomes. In the research, women led here, and 47% rated cycle context a must-have | IN1 "To see what tends to come before a rough day"; often IN2 foods or IBS-D |
| Fits my stack | Wants Florin to fit the health apps and wearable they already use. In the research, integration was the first driver for men (40%), and 60% of men want set-up under 10 minutes | IN1 "To fit in with the health apps or wearable I already use"; IN6 |
| Tracker | Already tracks, wants the raw series, exports and sync. People already tracking their gut were the warmest group in the research (intent 4.42 of 5) | IN1 "My own numbers, in detail, to dig into"; IN4 an app or notes |
| Record keeper | Wants a record to show a clinician | IN1 "A record I can show a clinician"; IN2 the same |
| Easy reader | A 70-year-old with reading glasses, a mild tremor and little patience for charts | IN7 65 or over; IN9; TX2 |
| Current user | Uses today's app: knows its five words and its slider | IN5 |
| Not sure yet | Curious, no strong want | IN1 "I'm not sure yet", or skipped |

A person can sit in more than one row (a tracker who uses the app today, say); the segment column in the Sheet is
IN1's answer, and every other row is a filter.

### 2.4 What each participant sees

**One demo person for everyone: Sarah**, with 12 weeks of logs. The three demo people answer the reading questions
differently (today's FloraScore is a little above its usual range for Sarah and Marcus and within it for Alex;
Marcus's first possible pattern is late dinners, with no food), and 24 people can't be split three ways and still read.
`people` in config.js maps IN1 to a person, all Sarah by default; if Will changes it, every reading question is reported
by demo person.

**Arms, assigned by the script** when intake ends, so each option is seen by about half of each platform:

| Arm | Options | Who |
|---|---|---|
| Home (`home`) | Score first · Day first | Standard version only (Easy has its own Today) |
| History (`history`) | Calendar · List | Everyone |
| Week card (`weekCard`) | Will's two, when he picks two | Standard version only (Easy draws its own week) |
| Task order | Five rows of a Latin square over the five rotated tasks (3.5) | Everyone |

The script keeps a balanced list per platform (iPhone, Android): every 4 sessions on a platform see each Home, History
and week card option twice, and every 5 see each rotated task in each place once. If the phone is offline when intake
ends, it picks at random and the session row says `assigned: phone`.

**The version.** Everyone 65 or over uses the Easy version, so the five people it's for all test it. IN9 asks everyone
which version they'd choose, as a stated preference; under 65, the answer sets the version. A person 65 or over who
picked Standard sees: "For this test, you'll try the version with larger text and simpler screens. You can switch in
Profile at any time." Anyone can switch in Profile; it's recorded.

---

## 3. The flow

### 3.1 Step by step, with timings

| # | Step | Where | Minutes | Running total |
|---|---|---|---|---|
| 1 | Welcome and consent | Browser | 2 | 2 |
| 2 | Intake: nine questions | Browser | 1.5 | 3.5 |
| 3 | The tour: eight tasks, each with an ease rating and its own questions | Browser | 13 | 16.5 |
| 4 | Two comparisons (three for Oura users), and one box for anything to add | Browser | 2 | 18.5 |
| 5 | Put Florin on your phone: the last task | Browser, then the home screen | 4 to 6 | 23.5 |
| 6 | Free use, with double-tap comments | The installed app, or the browser | 2 | 25.5 |
| 7 | Exit survey, with a look at the membership page | The same | 6 | 31.5 |
| 8 | Submit, and thanks | The same | 0.5 | 32 |

Medians, from about 8 seconds a closed question, 30 seconds a box when answered, and 60 to 90 seconds a task. That comes
to about 32 minutes; participants are told about 30. People 65 or over, in Easy, run about 40 to 45 minutes. The soft
launch times it, and the cut list in Before launch 6 brings it back if it runs long.

Install comes after the tasks, as Will set the order, so a phone that can't install loses nothing but the home screen.
The tasks run with the browser's address bar showing; the code is needed only for the last part. Comments work from the
tour to the end, by double tap or the Comment button. Every piece is sent as it happens (6.1), so a session that stops
halfway still counts for what it reached.

### 3.2 Before the welcome: the phone and the browser

- **On a computer** (wide screen, no touch), the page says: "This study runs on a phone. Scan this code with your
  phone's camera to open it there." with a QR code of the link and the link written out.
- **Inside another app's browser** (a link opened from Instagram, Facebook or an email app), the welcome, intake and
  tour all run; the install step asks them to open the page in Safari or Chrome (3.7).
- **A returning person** (a session stored in this browser, or `?c=` in the address) goes straight back to where they
  were, with one line at the top: "Welcome back. You were on {step}." Start again is under More, and sends the old code
  as `restart_of`. If the phone reloaded during a task, that task starts again; the time task, whose BM went with the
  logs in memory, says "Welcome back. Log a BM for {name} first, then change its time."
- **The study closed** (`open: false` in config.js): "This study has closed. Thank you for your interest."
- **On Android, in the browser**, pull to refresh is off (`overscroll-behavior-y: contain`), since a reload puts the
  logs in memory back.

Nothing is sent before consent.

### 3.3 Welcome and consent (2 minutes)

**Welcome**, word for word:

> **Help shape the Florin app**
>
> Florin Health is testing an early version of the Florin app, and we'd like your view. It takes about 30 minutes on
> this phone. You'll answer a few questions, try the app with a sample person's logs, then tell us what you thought.
>
> Prototype only. Not for patients.
>
> [Next]

**Consent**, word for word. {team}, {contact}, {recruiter}, {thanksHow} and {keepMonths} come from config.js. The
bracketed clause shows only when `followUp` is on.

> **Before you start**
>
> - This is research to improve an app, not a medical study. The Florin app here is a prototype. It isn't ready to use
>   for your own care, and it can't give medical advice. You're welcome to take part.
> - There's no account. We don't ask your name or contact details[, unless you choose to leave them at the end, kept
>   apart from your answers].
> - Your answers, ratings, comments, the taps you make in the app and how long you spend on each screen go to {team},
>   Florin Health's research team, under a random code. They're stored in a private Google Sheet. This site is hosted
>   by Netlify.
> - We also send a few details about your phone: its type, its system version, its screen width, and whether it's set
>   to light or dark. Not its location, and not your contacts.
> - We use all of this to improve the app, and delete it {keepMonths} months after the study closes.
> - The app shows a sample person's logs. You don't need to log anything real. Anything you log or type in the Florin
>   app itself, such as a BM, a note or a question to Ask Florin, stays on this phone, is never sent to us, and is
>   cleared when you close the app.
> - Please don't type anything you wouldn't want a research team to read, such as your name, or details about your
>   health you'd rather keep private.
> - You can stop at any time. To have your answers removed later, email {contact} with your study code, which shows on
>   the last screen. That email links your address to your code, so we delete it once your answers are removed.
> - Questions about the study: {contact}. Your thank-you comes from {recruiter}, {thanksHow}. They never see your
>   answers.
> - If you're worried about your gut, talk to a clinician. If you see blood in a BM, have a black or tar-like BM, a
>   fever, vomiting that won't stop, weight loss you can't explain, or you wake at night to go, contact your primary
>   care doctor.
>
> [ ] I'm 18 or over.
>
> [ ] I've read this, and I agree to take part.
>
> [Start] [No thanks]

Start is enabled once both boxes are ticked. No thanks shows: "Thanks for your time. You can close this page." and sends
nothing. Counsel reads this screen before launch.

### 3.4 Intake (1.5 minutes)

One question a screen, each with Skip. The heading over the first: "First, a little about you. Every question can be
skipped." The nine questions are in section 4.1. When intake ends, the phone makes the study code, the script settles it
and the arms (2.4), and the page writes `?c={code}` into its own address (`history.replaceState`), so a move to another
browser, or the home screen, carries the session.

### 3.5 The tour (13 minutes)

**Before the first task**, word for word. {count}, {name}, {weeks}, {weekday} and {date} come from the model (today 8,
Sarah, 12, Sunday and October 11; 7 tasks when the check-in is off):

> **{count} short tasks**
>
> You'll try the app as {name}, with {name}'s last {weeks} weeks of logs. The app is set to {weekday} evening,
> {date}, and talks to {name} as "you".
>
> Each task takes a minute or two. Afterwards, tap how easy it was, and answer a few quick questions.
>
> Some questions check whether the app is clear. If something's hard to tell, that's the app's problem, not yours.
>
> Double-tap anything in the app to comment on it, at any time. You can also tap Comment at the top.
>
> Prototype only. Not for patients.
>
> [Start the first task]

**The task menu.** A strip at the top of the screen, above the app (the app moves down to make room, through its
safe-area inset). First row: "Task 2 of 8" and the task, wrapping to up to three lines. Second row: Done, Skip and
Comment, then Hint (after 45 seconds, `hintAfter`) and More, each 44px. More holds: Your study code, Reload, Start this
task again (puts {name}'s logs back as they were when the task started), and Stop the study ("Stop here? What you've
answered so far stays with the team, under your code." [Stop] [Keep going]), and the line "Prototype only. Not for
patients." The strip must fit at 360 wide, in Easy's type and at Android's largest font (Before launch 4).

**Detecting the goal.** The focus module watches the phone through `FLORIN_EXT` (the screen key, the acts, the model)
and marks a task "seen" when the goal is reached; the strip then says "Done. Tap Next for a few quick questions." Done
still works when the app hasn't seen the goal ("said"). Skip asks "Why are you skipping?" (I couldn't find it · I
didn't want to · Something didn't work). A goal that needs something on screen counts it when it has been in view for
2 seconds.

**After each task**, a sheet over the lower part of the screen asks the task's own questions, then the ease rating
(TE) and the reaction chips (TR), all in section 4.2. The sheet has a "Show the screen" handle that lowers it, and the
card a question asks about is scrolled into view above it, so these are reading questions, not a memory test.

**The order.** The first three are fixed, since the first changes today and the second needs its BM. The other five
follow the session's row of a Latin square (2.4). T6 is left out when `checkin` is off. Every right answer is computed
when its question shows, from the phone's live logs.

**T1 Log a BM** (`bm`, fixed, about 2 minutes)
- Task: "Log a BM for {name}, as if they just had one. Pick any word that fits."
- Hint: "Tap the plus button at the bottom of the screen." Day first, which has a row of words on Today: "Tap a word
  under today's logs, or the plus button at the bottom of the screen." Easy: "Tap I had a BM on Today."
- Goal: `RU.bmCount(M)` goes up.
- Path: a tile in plus, a word in Day first's row (`vr-quick`), or the form; details added or not; Undo straight after
  a one-tap save.
- Then: BM1, BM2, TE, TR (six chips).

**T2 Change its time** (`time`, fixed, about 1.25 minutes)
- Task: "Say {name} actually had that BM an hour ago. Change its time."
- Hint: "On Today, tap the BM you just logged." Easy: "On Today, tap the BM you just logged, under Today's logs."
- Goal: the BM saved in T1, or one logged in its place, has a time 45 to 75 minutes before the time T1 saved. Easy picks
  the nearest hour, so there 30 to 120 minutes.
- Path: opened the BM and changed the time; undid it and logged it again; gave up (skipped).
- Then: TE, TR (six chips).

**T3 Read the week** (`week`, fixed, about 1.75 minutes)
- Task: "Find {name}'s last 7 days on Today and read them. Tap Done when you have."
- Hint, by week card: the card or Mornings, "On Today, scroll down past today's logs to Your last 7 days."; the strip,
  "It's at the top of Today."; the note, "It's under FloraScore." Easy: "On Today, scroll down to Your last 7 days."
- Goal: the week's answer line and its row of days in view together for 2 seconds (a design with no row of days, its
  answer line alone); then Done. Each week card marks its own goal elements.
- Then: WK1, WK2, WK3 (designs that draw a mark per day), TE, TR (eight chips).

**T4 FloraScore** (`score`, rotated, about 1.5 minutes)
- Task: "Open the page that explains {name}'s FloraScore."
- Hint: Score first, "Tap Details on the FloraScore card."; Day first, "Tap FloraScore at the top of Today." Easy: "Tap
  More about your weeks on Today."
- Goal: the screen key is `i-score`. Easy has no FloraScore page: the screen key is `ez-weeks` with its FloraScore card
  in view for 2 seconds.
- Then: SC1, SC2, TE, TR (eight chips). Easy's Today already prints "FloraScore compares you with you", so SC1 is
  reported by version.

**T5 Possible patterns** (`patterns`, rotated, about 2 minutes)
- Task: "Find a food that tends to come before a change for {name}."
- Hint: "Open the Insights tab and scroll to Possible patterns." Easy: "Tap More about your weeks on Today, then
  scroll to Possible patterns."
- Goal: the Possible patterns card, or a pattern's page, in view for 2 seconds; then Done.
- Then: PT1, IV1, IV2, TE, TR (eight chips). Left out when no pattern with a food is found.

**T6 The weekly check-in** (`checkin`, rotated, about 1.5 minutes)
- Task: "{name}'s weekly check-in is due tonight. Answer it. Pick any answers you like."
- Hint: "On Today, tap Start on the Weekly check-in card." Easy: "On Today, tap Start under Weekly check-in."
- Goal: the screen key is `ckdone`.
- Then: CK1, TE, TR (six chips).

**T7 A day with nothing logged** (`history`, rotated, about 1.75 minutes)
- Task: "{name} didn't log anything on one day in {month}. Find that day in History." {month} is the month before
  today's (September). The days are that month's days whose `L.facts` state is none (Sarah: Sunday, September 6, the
  only one); with two, the task says "on two days in {month}. Find one of them in History."
- Hint: Calendar, "Tap History at the bottom of the screen, then go back a month."; List, "Tap History at the bottom of
  the screen, then scroll back to {month}." Easy the same.
- Goal: Calendar, that day itself opened (`vr-cal-day` with its date); List, that day's row in view for 2 seconds;
  then Done.
- Path: the arm; the months moved.
- Then: HI1, TE, TR (six chips).

**T8 Ask Florin** (`ask`, rotated, about 1.5 minutes)
- Task: "Ask Florin a question about {name}'s logs. Tap a suggested question, or type your own."
- Hint: "Tap Ask at the bottom right." Easy the same.
- Goal: an answer is drawn in the chat.
- Path: suggested, typed, or Ask about this.
- Then: AS1, TE, TR (eight chips).

### 3.6 The comparisons (2 minutes)

After the last task, the phone shows the option the person didn't use, with a small task so it's used, not glanced at,
then asks which they'd rather have (4.3). Half the sessions saw each option first. The two run in the order of the
session's row.

- **CP1, Home** (Standard only): the phone switches Home to the other option and opens Today. "Here's another way Today
  could open. Find today's FloraScore on it, then tap Next." Then Home goes back.
- **CP2, History**: the phone switches History to the other option and opens History. "Here's another way History could
  look. Find what {name} logged on {weekday}, {date}, then tap Next." {date} is a day in the last 7 with a BM logged.
  Then History goes back.
- **CP3, FloraScore in the Oura style** (Standard, and only for people who picked An Oura ring at IN6): the phone sets
  Data style to Oura and opens Today. "Here's another way FloraScore could look on Today. Have a look, then tap Next."
  Then Data style and the phone's theme go back.

Then one box for the whole tour: TW (4.2).

### 3.7 Put Florin on your phone (4 to 6 minutes)

The last task. Before the steps show, the page waits until the script confirms it holds everything sent so far ("Sending
your answers..."), since answers left in Safari stay there on iPhone. If it can't confirm in 20 seconds: "Your phone
hasn't sent your answers yet. Please finish here, so nothing is lost." with only Finish here.

The page knows the phone, the system version and the browser, and shows only the steps for them, each with a picture.
Above the steps:

> **Put Florin on your phone**
>
> So it opens from your home screen, full screen, like an app. This takes a few minutes. If it doesn't work, you can
> finish here instead.

**iPhone, in Safari**, word for word. A page can't read which Safari layout is set, so on iOS 26 the first step shows
both pictures.

> **Your study code: K7M 4PX**
> You may need it once, when you open Florin from your home screen. Keep this screen open until then.
>
> 1. Find the Share button. If you see three dots beside the address, tap them, then tap Share. If you see a square
>    with an arrow pointing up, tap that.
> 2. Scroll down and tap Add to Home Screen. If you don't see it, tap the Safari compass to open this page in Safari,
>    then start again.
> 3. If you see Open as Web App, leave it on. Tap Add.
> 4. Go to your home screen and open Florin. It may be on your last home screen page: swipe left, or swipe down and
>    type Florin.
>
> [I've added it] [Finish here instead]

On iOS 18 and earlier, step 1 reads: "Tap the Share button at the bottom of the screen: a square with an arrow pointing
up."

**iPhone, in Chrome or another browser:** "Tap the Share button in the address bar, then Add to Home Screen. If you
don't see it, open this page in Safari: tap Copy the address, paste it into Safari's address bar, and follow the steps
there." [Copy the address] The address carries the code, so Safari picks up the session. Then steps 3 and 4 as above.

**Inside another app's browser** (one the page can tell, such as Instagram or Facebook): "To add Florin to your home
screen, open this page in your phone's browser first: tap the menu (often three dots), then Open in browser." Finish
here instead stays available. Mail apps' in-app Safari views can't be told apart from Safari, so step 2's compass line
covers them, and the invitation says to open the link in Safari or Chrome.

**Android, in Chrome**, word for word:

> 1. Tap Install below, then Install again in the box that opens.
> 2. Open Florin from your home screen or your list of apps. It may be on your last home screen page.
>
> [Install] [Finish here instead]

If Chrome hasn't offered the prompt, the Install button is replaced by: "Tap the three dots at the top right, then
Add to Home screen or Install app. Tap Install." **Samsung Internet:** "Tap the menu (three lines) at the bottom, then
Add page to, then Home screen." Android shares this page's storage with the installed app, so no code is asked for.
When the installed app opens, the browser tab says: "Florin is open from your home screen. You can close this tab."

**Opening the installed app on iPhone** (a home screen web app on iPhone keeps its own storage, apart from Safari's).
The main path is the code in the address: if iOS opens the address the page had when it was added, `?c=` carries the
session and nothing is asked. In case iOS opens the manifest's `start_url` instead, the page swaps in a manifest whose
`start_url` carries the code too; Before launch 5 checks which address iOS 26 opens. If neither carries it:

> **Enter your study code**
> It's the 6 characters on the screen where you added Florin.
> [ _ _ _  _ _ _ ] [Continue]

The field is large, with `autocapitalize="characters"` and `autocomplete="off"`, and takes lower case and spaces. A code
that fails its check character: "That code doesn't look right. Check it and try again." One the script doesn't know:
"We couldn't find that code. Check it and try again." The link under it, "I don't have my code", says: "Go back to
Safari: your code is on the screen there. You can also finish in Safari instead." With no connection: "Florin needs a
connection to pick up where you were. Check your connection and tap Try again." When the script has seen the installed
app, a reopened Safari tab says "Florin is open from your home screen. You can close this tab." instead of picking up.

**Then:** IS1 (4.4) in the installed app, or IS2 then IS1 for anyone who chose Finish here instead (IS1 is left out
after "I'd rather not add it"). The installed app starts {name}'s logs again as they were, and picks up at free use.
The outcome is recorded without asking: seen (a piece came from the installed app in standalone display mode), said (I've
added it, but the app never opened), browser (finished here), or couldn't.

**In the installed app**, there's no reload or back button, so More has Reload. iOS may close the app while someone
goes to Safari for the code; on reopening it picks up at the current step. On Android, the back gesture would close the
app, so every step and sheet adds a history entry, and back closes the sheet.

**The code.** Six characters from an alphabet without look-alikes: A C D E F H J K M N P R T W X Y and 3 4 6 7 9 (no 0,
O, Q, 1, I, L, 2, Z, 5, S, 8, B, G, U or V). Five are random; the sixth is a check character (Luhn mod 21) that
catches any one wrong character and most swaps. Shown large, in two groups of three. The code is only a lookup: each
session's id (`sid`) is a separate long random id, made on the phone at consent. The script refuses a code already
taken, so the phone draws another before the code is shown or written into the address. The code is shown again under
More and on the last screen.

### 3.8 Free use, with double-tap comments (2 minutes)

Word for word:

> **Look around**
>
> Find one thing you like and one thing you'd change. Double-tap each and tell us.
>
> The microphone in the app plays a sample; it doesn't listen.
>
> [I'm done]

The strip shows the time left from {freeMinutes} minutes. At the end: "Time's up. Tap Next when you're ready." Nothing
is cut off.

**Comments.** A double tap anywhere opens the comment sheet, pinned to the spot, with a small marker there until it
closes. If the first tap of a double tap pressed a button, the second tap is caught, so the button acts once; the
comment then belongs to the screen it led to. The Comment button in the strip does the same without a double tap, for
anyone with a tremor or using VoiceOver or TalkBack (where a double tap is how a button is pressed). The sheet's words
are in section 4.5.

### 3.9 Exit survey (6 minutes)

> **Last part: what you thought**
> About 6 minutes. Every question can be skipped.

The order: comfort again (EX1) first, then the SUS (10, one statement a screen, with large buttons), trust (TR1 to TR4,
with TR2b and TR4b when they apply), favourite (FV1, FV2), friction (FR1, FR2), missing (MS1, MS2), text size (TX1,
TX2), use (US1 to US3), the part they'd not miss (FV3), then the membership page, VA2, VA3, messaging (MG1, MG2) and
anything else (LS1). The price questions come last, since they can pull down what people say about use.

Before VA2 the phone opens the app's own membership page (`RU.paywall`, through `api.push("pay")`) with: "The app has a
free plan and a membership. Here's the page that explains what membership adds. Have a look, then tap Next." A tap on
Start membership is recorded, and the phone says: "This is a test, so nothing is charged."

### 3.10 Submit and thanks (0.5 minutes)

> **That's everything**
> Tap Submit to finish. Your answers were sent as you went; this sends the last of them.
>
> [Submit]

Offline: "Your phone is offline. Your answers are saved on this phone and will send when it's back online. Open Florin
again later to send them."

Then, word for word:

> **Thank you**
>
> Your answers are in.
>
> Your study code: {code}. Keep it if you may want your answers removed: email {contact} with it. Clearing this session
> erases it from this phone.
>
> Your thank-you code: {token}. {recruiter} uses it to send your thank-you, and never sees your answers.
>
> If you're worried about your gut, talk to a clinician. If you see blood in a BM, have a black or tar-like BM, a
> fever, vomiting that won't stop, weight loss you can't explain, or you wake at night to go, contact your primary
> care doctor. If there's a lot of blood, or you feel faint or dizzy, get urgent care now.
>
> Prototype only. Not for patients.
>
> To take Florin off your home screen, press and hold its icon, then follow the steps to remove it.
>
> [Clear this session from this phone]

The thank-you code is random, one per person, and goes to the recruiter's separate sheet at a random row, with no
session id and no time, so it can't be joined to anyone's answers. Clear this session removes the codes, the stored
decisions and the queue (once it's empty) from the phone, then says "Cleared."

When `followUp` is on, the thanks screen adds: "Could we contact you about a follow-up? Optional. What you give here is
kept apart from your code and your answers." with one box.

---

## 4. Every question, word for word

Rules for every word: no medical claims; never normal, healthy, improving or worsening, or any judging word in the
claims rules; no em or en dashes, no exclamation points, no humour; no licensed scale named; FloraScore one word; Ask
Florin. Participants' words are in US English. Options for reading questions appear in a random order, with "I
couldn't tell", "I'm not sure", "None" and "No preference" always last; scales and ordered sets (the BM words, numbers,
days) stay in their order. Under every box for words: "Please leave out anything you wouldn't want a research team to
read." Before any box is sent, words that look like an email address or a phone number are replaced with [removed],
and the text runs through the app's own alarm net (`L.alarmsIn`). On a match, a Teal note shows under the box, and the
person can still send:

> If this is about you: blood in a BM, a black or tar-like BM, a fever, vomiting that won't stop, weight loss you can't
> explain, or waking at night to go are worth a clinician's look soon. Your primary care doctor is the right first
> stop. If there's a lot of blood, or you feel faint or dizzy, get urgent care now.

### 4.1 Intake

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| IN1 | What would you most want from an app for your gut? Pick one. | To see what tends to come before a rough day · Something simple, with big buttons and plain words · To fit in with the health apps or wearable I already use · My own numbers, in detail, to dig into · A record I can show a clinician · I'm not sure yet | Places each person in a persona (2.3), so every result can be read by what people came for |
| IN2 | What brings you to an app like this? Pick any that fit. | I have IBS-D · I've been told I might have IBS · Some foods don't sit well with me · My gut feels unsettled a lot · I'm active, and my gut gets in the way · I'm curious about my gut · I want a record to show a clinician · Something else (a box for words) · Prefer not to say | The app's own set-up options, word for word (`refresh-profile.js`): tells us who came, and whether those options cover why people come (Something else) |
| IN3 | How often do you notice gut symptoms, such as bloating, belly pain or a sudden urge to go? | Most days · A few times a week · A few times a month · Rarely or never · Prefer not to say | Whether the app works for people who'd log often; a cut for every result |
| IN4 | How do you keep track of your gut now? Pick any. | I don't · In my head · Notes on my phone or on paper · A gut, food or symptom app · A diary a clinician gave me · Something else | Finds trackers, and gives a habit to read US2 and US3 against |
| IN5 | Have you used the Florin app before today? | Yes, I use it now · Yes, I've tried it · No · Not sure | Today's users know its five words and its slider; C keeps the five, adds Pellets and Soft, and narrows Hard and Loose to one kind each (G3) |
| IN6 | Do you use any of these? Pick any. | An Oura ring · An Apple Watch · Another watch or fitness band · Apple Health · Another health or fitness app · None of these | Finds the fits-my-stack persona; picks who sees CP3; reads against MS2's "Linking Apple Health or another app" |
| IN7 | Your age range | 18 to 24 · 25 to 34 · 35 to 44 · 45 to 54 · 55 to 64 · 65 or over · Prefer not to say | Finds the Easy version's person (2.4) and checks the spread. A range only, never a birth date |
| IN8 | How comfortable would you be keeping a record of your BMs on your phone? | Very uncomfortable · Somewhat uncomfortable · Neither · Somewhat comfortable · Very comfortable | A trust baseline, asked again first thing in the exit (EX1), so we see whether trying the app moves it |
| IN9 | Florin has a version with larger text and simpler screens. Which would you choose for yourself? | Standard · Larger text and simpler screens, each with a small picture of Today in that version | Who picks Easy when it's offered (G8). Sets the version under 65 (2.4). The words are Profile's own name for the setting |

Whether the phone's text is set large is asked in the exit (TX2), so it doesn't steer IN9.

### 4.2 The tasks

**After every task:**

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| TE | Overall, how easy or hard was that? | 1 Very hard to 7 Very easy (only the ends labelled) | One number per task, comparable across tasks. It follows the Single Ease Question's format in our own words, so we compare tasks with each other, not with outside benchmarks |
| TR | Which words fit? Pick any. | Clear · Confusing · Useful · Not useful · Too much on screen · Want more detail, and on the week, FloraScore, patterns and Ask tasks also Reassuring · Worrying | The reaction Will asked to record, the same words on every task so tasks compare. Shown as pairs; the pairs' order, and which side of each pair comes first, are shuffled once per participant |

**Each task's own questions.** "Right" is computed when the question shows; the examples are Sarah's, as the model
draws her today.

| ID | Task | Question, word for word | Answers | Right answer | Why it's asked |
|---|---|---|---|---|---|
| BM1 | bm | Were any of these words unclear? Pick any. | The seven words as the tiles show them, in the tiles' order (today: Pellets · Hard · Firm · Formed · Soft · Loose · Watery, from `L.TYPES`) · None were unclear | None | Which of C's words need work before counsel reads them, and whether today's users stumble on the new ones (G3) |
| BM2 | bm | Were any two words hard to tell apart? Pick up to two. | The same seven, in order · None | None | Which neighbours blur. Two picks make one pair |
| WK1 | week | Why does {name}'s week count {known} days, not 7? | {Gap} had nothing logged · Today isn't over yet · One day was outside {name}'s usual · I'm not sure ({Gap}: "One day", or "Two days") | The days with nothing logged, from `L.tally(L.span(M, 7))` (Sarah: One day had nothing logged) | Whether a gap reads as a gap, not a day outside the usual. Left out when all 7 were read, or today is flagged |
| WK2 | week | Which days were outside {name}'s usual? Pick any. | The seven days in order, by weekday, today as Today · None of them · I couldn't tell | The days `L.span(M, 7)` reads as shifted (Sarah: Wednesday and Friday, plus today if T1 moved it) | Whether the week shows which days differed, in any design. Right when the picks match exactly; each pick is kept |
| WK3 | week | On that week, what did a day marked in gold show? | A day outside {name}'s usual · A day with symptoms · A highlight, like a gold star · Today · I'm not sure | A day outside {name}'s usual | Gold can read as a reward. Checks the colour rule against a real reading. Only for designs that draw a mark per day |
| SC1 | score | Which comes closest to what FloraScore tells you? | How {name}'s recent days compare with {name}'s own usual · How {name} compares with other people · A grade out of 100 · A medical result · I'm not sure | The first | The three misreadings FloraScore has to avoid: a ranking, a grade, a medical result (G2, G6). Reported by version |
| SC2 | score | Was today's FloraScore in its usual range? | In its usual range · Above its usual range · Below its usual range · I couldn't tell | From `RU.scoreRel`, a little above counting as above (Sarah: 83 against 74 to 82, Above, until T1 changes it) | Whether the range bar reads |
| PT1 | patterns | Which food tends to come before a change for {name}? | The food in {name}'s first possible pattern that has a food, and three foods Insights checked with nothing found (`L.patterns(M, mode).found` and `.quiet`; Sarah: Pizza, with three of the quiet foods) · I couldn't find one | Any food in `.found` (Sarah: Pizza) | Whether people find and read the possible patterns, the value membership sells |
| IV1 | patterns | Have a look at the cards on Insights. Which two would you look at most? Pick two. | The live card titles, in a random order. Easy: the cards in Your weeks | None | Which cards lead (G9) |
| IV2 | patterns | Which one would you not miss? | The same titles · I'd miss all of them | None | Which cards could fold into a detail page or go (G9) |
| CK1 | checkin | How often would you answer a check-in like this? | Every week · Most weeks · Now and then · Never · Not sure | None | Decision 5: is the check-in worth its weekly ask (G5) |
| HI1 | history | Which day had nothing logged? | That day and three other days in {month} with logs, in date order · I couldn't find it | Any day in {month} with nothing logged (Sarah: Sunday, September 6) | Whether a gap reads as a gap on the calendar, where a day with nothing logged is its date alone, or in the list (G1, decision 4) |
| AS1 | ask | How much would you trust an answer like this? | Not at all · A little · Somewhat · A lot · Completely | None | Trust in Ask Florin's answers, computed from the logs here (G6) |

**At the end of the tour:**

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| TW | Anything to add about the tasks? (optional) | A box for words | What the chips can't say, once rather than after every task |

### 4.3 The comparisons

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| CP1 | Which would you rather see first when you open the app? | The FloraScore card · The day and its logs · No preference | Decision 3, after using one Home for every task and the other for one small task; half saw each first |
| CP2 | Which would you rather use to look back at past days? | A month at a glance · A list of days · No preference | Decision 4 and its open question (keep a switch on History), the same way |
| CP3 | Which way of showing FloraScore would you rather have on Today? | The one you used first · This one · No preference | Data style's open call 1 (a fixed Oura on Today), from the people who know Oura |
| CP3b | What makes you say that? (optional) | A box for words | CP3 is read as words: a few people |

### 4.4 Putting it on the phone

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| IS1 | Overall, how easy or hard was putting Florin on your phone? | 1 Very hard to 7 Very easy (only the ends labelled) | The install task's ease rating (G1) |
| IS2 | What happened? (only after Finish here instead) | I couldn't find the steps · The steps didn't match my phone · I'd rather not add it · Something else (a box for words) | Separates a design problem from a choice |

### 4.5 Comments

| ID | Words, word for word | Answers | Why it's asked |
|---|---|---|---|
| CM1 | What do you think of this? | Pick any: I like it · It's confusing · Something's missing · Something didn't work · I have an idea | What people liked, missed and tripped on, tied to the exact screen and spot |
| CM2 | Say more (optional) | A box for words | The reason in their words |

Buttons: Send · Cancel. After sending: "Comment sent."

### 4.6 Exit survey

In the order they're asked (3.9). Agreement items use Strongly disagree · Disagree · Neither agree nor disagree · Agree
· Strongly agree (1 to 5).

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| EX1 | How comfortable would you be keeping a record of your BMs on your phone? | As IN8 | The same question as IN8, asked first so the trust questions don't move it |

**SUS.** One statement a screen, with large buttons. Over each: "Thinking about the app you just tried, how much do
you agree?" Each is answered with the agreement scale (1 to 5). These are the standard ten statements, with "system"
read as "app" and "cumbersome" as "awkward" (an accepted substitution), free to use with attribution. A line at the
foot of each screen says so: "System Usability Scale. John Brooke (1996), SUS: a quick and dirty usability scale."

| ID | Statement, word for word |
|---|---|
| SUS1 | I think that I would like to use this app frequently. |
| SUS2 | I found the app unnecessarily complex. |
| SUS3 | I thought the app was easy to use. |
| SUS4 | I think that I would need the support of a technical person to be able to use this app. |
| SUS5 | I found the various functions in this app were well integrated. |
| SUS6 | I thought there was too much inconsistency in this app. |
| SUS7 | I would imagine that most people would learn to use this app very quickly. |
| SUS8 | I found the app very awkward to use. |
| SUS9 | I felt very confident using the app. |
| SUS10 | I needed to learn a lot of things before I could get going with this app. |

Why: one usability score, 0 to 100, that compares across persona groups and with later rounds (G1). Scored the
standard way: odd items minus 1, 5 minus even items, the sum times 2.5. The Sheet keeps every item, and the score only
when all ten are answered.

| ID | Question, word for word | Answers | Why it's asked |
|---|---|---|---|
| TR1 | I understood how the app came up with its numbers. | Agreement, 1 to 5 | Whether "from your logs, against your usual" comes through (G6) |
| TR2 | Did anything in the app sound like a diagnosis, or a judgment about {name}'s health? | Yes · No · Not sure | The claims guardrails, checked from the reader's side, without catching the app's own "talk to a clinician" lines (G6) |
| TR2b | Where? (optional, after Yes) | A box for words | Which screen, in their words |
| TR3 | I would trust what the app told me about my own logs. | Agreement, 1 to 5 | Trust in the readings, for themselves (G6) |
| TR4 | Did anything in the app worry you? | Yes · No · Not sure | Whether any screen alarms people without a reason (G6) |
| TR4b | What worried you? (optional, after Yes) | A box for words | Which screen, in their words |
| FV1 | Which part did you like most? | Logging a BM · FloraScore · The last 7 days on Today · The Insights cards, apart from Possible patterns · Possible patterns · The weekly check-in · History · Ask Florin, in a random order · None of them | Favourite features (Will's ask), one each so it ranks. The parts don't overlap |
| FV2 | What did you like about it? (optional) | A box for words | Why, in their words |
| FR1 | Was any part hard, slow or confusing? Pick any. | Logging a BM · Changing a BM's time · Today · FloraScore · Insights · The weekly check-in · History · Ask Florin · Putting it on my phone · Something else · Nothing was | Friction points by part (Will's ask), to read beside each task's outcome |
| FR2 | What happened with {part}? (optional) | A box for words, once for each part picked, up to three, in the order shown | What the friction was, part by part |
| MS1 | Was there anything you looked for and didn't find? (optional) | A box for words | Missing features in their words first, before any list prompts them |
| MS2 | Which of these would you want most? Pick up to two. | Linking Apple Health or another app · Period or cycle days · Sleep · Medicines · Exercise · Reminders · A report to show a clinician · Something else · None of these | Missing features we already wonder about: integrations, cycle context (the pattern seeker), the clinician report (the record keeper) |
| TX1 | How was the size of the text and buttons? | Too small · About right · Too big | Decision 8, from everyone, Standard and Easy alike |
| TX2 | Is your phone's text set larger than its standard size? | Yes · No · Not sure | Decision 8's open question, read against IN9 and the text size the phone reports (6.3) |
| US1 | If the Florin app worked like this, how likely would you be to use it over the next month? | Very unlikely · Unlikely · Neither · Likely · Very likely | Likelihood to use (Will's ask) |
| US2 | How often do you think you'd log your BMs? | Every day · Most days · Only on days something feels off · Now and then · I wouldn't | How the logs behind FloraScore would come in, as a stated habit |
| US3 | How often do you think you'd log what you ate? | Every day · Most days · Only on days something feels off · Now and then · I wouldn't | Will's note of Oct 14 (meals get logged when people are having issues), as a stated habit |
| FV3 | Which part would you not miss? | As FV1, in a random order · I'd miss all of them · Not sure | What could go, at the level of the app (G9) |
| VA2 | Which comes closest to what you'd do? (after the membership page) | Use the free plan · Try membership, then decide · Pay for membership · Use neither · Not sure | The membership offer, as the app describes it (G7) |
| VA3 | What would feel like a fair price for membership, each month? | Under $5 · $5 to $9 · $10 to $14 · $15 or more · I wouldn't pay · Not sure | Direction for the price, which is Will's call. The page shows no price, so it isn't anchored |
| MG1 | Here are three ways we might describe the Florin app. Which would make you most want to try it? | Two taps to log a BM. Florin does the reading. · Your logs give you back your usual, your FloraScore and a record for your clinician. · The start of your gut record, one log at a time. · None of these | Messaging, which has no recommendation yet: the deck's three directions (`deck/project/slides/more.html`) as draft lines, for counsel to read. Random order, None last |
| MG2 | What made you pick it? (optional) | A box for words | Why, in their words |
| LS1 | Anything else you'd like to tell the team? (optional) | A box for words | Room for what we didn't ask |

FV1, FV3 and FR1 leave out The weekly check-in when `checkin` is off. In the Easy version, the Insights options read
"The cards in Your weeks" and "Your weeks".

---

## 5. What the app shows

### 5.1 How it's built

`focus/site/` is a static web app: an `index.html` with its own document shell, a web app manifest, icons, the
apple-touch-icon and apple mobile-web-app metas, and a small service worker so Android offers Install.

It loads the prototype's css and js and the library's look files in CLAUDE.md's load order, copied into `focus/site/` by
the build and pinned (Before launch 3), so `prototype/` and `library/` are never edited. The phone, its tab bar and
`api` live in `refresh-app.js`, the page file that also draws the demo page's chrome. So the focus page loads
`refresh-app.js` unchanged, gives it the elements it mounts into, and registers `focus-app.js` before it, the way the
prototype's own modules do: into `FLORIN_EXT`, wrapping, never editing. `focus.css` hides every `.rx-` part of the page
(the left bar, the notes, the header, the footer, the phones' top bar) and runs the phone full screen. No fake status
bar or island. The study's own screens (welcome, intake, the task strip and its sheets, install, the exit survey) are
drawn by the module in the app's tokens and components, light and dark.

**Proposal for a core hook**, for the team that owns `prototype/`: a flag such as `window.FLORIN_PAGE = { chrome:
false }` that `refresh-app.js` reads to mount the phone alone, so the focus page stops relying on CSS to hide the demo
chrome. The study doesn't need it to run.

**The week cards.** Each design Will picks from `options/home/` becomes a focus module that replaces
`RU.todayParts.week` (and, for a design that moves the week, such as the strip or the note, wraps `RU.todayLayout`), as
`refresh-looks.js` already does for the data style. They're built from the options page's own drawing functions
(`window.FLORIN_HOME.draw`), copied at build. No core hook is needed. Easy keeps its own week.

The fonts (DM Sans, Lora, Space Mono, all open licences) are served from `focus/site/fonts`, so no font service sees a
participant's address. Netlify, which hosts the site, and Google, which runs the script, see addresses at the network
level, as any web host does; neither the script nor the Sheet stores one. No analytics and no other scripts. The
service worker caches the app and fetches `config.js` and `index.html` from the network first, so closing the study
takes effect on the next open.

### 5.2 The decisions and the demo, from config.js

Only the decisions are stored: as `florin-refresh:<key>` in `localStorage`, as JSON strings, which `refresh-app.js`
reads when it loads. `focus-app.js` writes them before it loads, from config.js and, on a reload, the session's arms;
when the arms arrive at the end of intake, it sets them through `api.set`, so the phone and its stored values agree.
The demo settings (`persona`, `plan`, `data`, `meals`) live in memory in `refresh-app.js` (`sarah`, `member`, `est`,
`all` by default), so the module sets them through `api.set` after the phone's first draw, on every load. Each of those
rebuilds the model and goes to Today, so they're set before a task starts, never during one.

| Setting | Key | For the test | Why |
|---|---|---|---|
| Consistency | `form` | C | Our recommendation; BM1 and BM2 test its words |
| BM logging | `bmUI` | Quick tiles and form | Our recommendation. Sarah has far more than 5 BMs, so a tile saves at once (`RU.QUICK_AFTER`) |
| Home | `home` | Half Score first, half Day first (2.4) | Our recommendation against the other, counterbalanced; CP1 shows the other |
| History | `history` | Half Calendar, half List (2.4) | The same; CP2 shows the other |
| Weekly check-in | `checkin` | On | Our recommendation; T6 |
| Meal sheet | `mealUI` | Quick, voice or text | Our recommendation. Reached in free use; the microphone plays a sample (`L.mealSay`), as in the prototype |
| Data style | `look` | Florin charts (`built`) | Our recommendation. CP3 sets Oura for one look, then puts the look and the theme back |
| Version | `easy` | Easy for 65 or over; otherwise from IN9 (2.4) | Decision 8's person tests it |
| Onboarding | `onboard` | Short | Not shown this round |
| Home's week card | `weekCard` | Will's pick from `options/home/` (`card`, `strip`, `note` or `chart`), or two, half and half; `built` is today's card | The session row records it, so results read by design |
| Plan | `plan` | Member | Every task is open to everyone. The membership page is shown before the value questions instead |
| Logs | `data` | 12 weeks (`est`) | Every screen has a usual, a FloraScore and possible patterns |
| Demo person's meals | `meals` | Every day (`all`) | Possible patterns show (T5). "Only with symptoms" would hold them back and show the food check; a later round could try it |
| Person | `persona` | Sarah, for everyone (2.4) | |
| Theme | | The phone's own | Recorded on the session row |

The comparisons set `home`, `history` and `look` to another option through `api.set` for one look, then back. Anything
the person changes in Profile (say, Larger text and simpler screens) goes through `phone.set` as in the prototype and is
recorded as an event; the study doesn't stop it.

`focus/config.js` holds, as well: `study` (the id on every row), `endpoint` (the Apps Script URL), `open`, `team`,
`contact`, `recruiter`, `thanksHow`, `keepMonths`, `people` (2.4), `weekCard`, `compare` (the comparisons), `tasks`
(which tasks run), `freeMinutes` (2), `hintAfter` (45 seconds) and `followUp` (off). A link with `?test=1` tags the
session's study id with `-test`, for Will's own runs.

### 5.3 Ask Florin

There is no Claude on this host, so Ask Florin answers from the logs, as the prototype does without the sample
capability ("Answers come from your logs alone, worked out on this phone."). Alarm words still get the primary care
answer first, and a question asking it to name a condition, a dose or what comes next still gets the fixed redirect.
Nothing typed into Ask is sent to us. Shipping Ask would use a model, so AS1 is trust in an answer computed from the
logs; we say so in the summary.

### 5.4 How a participant's own logs fit

- Every participant acts as Sarah. Anything they log joins her logs on their phone and redraws Today, FloraScore and
  Insights, so they see what a log does.
- They don't need to log anything real, and the consent says so. Some will log their own day anyway, so the content of
  every log is treated as sensitive: the forms, details, symptoms, meals, notes, check-in answers and Ask questions
  never leave the phone. The Sheet records that a BM was saved and how (a tile or the form), never which word.
- The logs live in memory, as in the prototype. Closing the app, Reload or Start this task again puts her logs back.
  The installed app starts with her logs as they were. Clear this session removes what the study stored.
- The reading questions are computed from the live logs when they show, so they stay right after T1 and T2 change
  today.
- A later round could have people log their own week before a follow-up. Not this one: that means holding real health
  logs.

---

## 6. Data

### 6.1 How it travels

Each piece (an answer, a task result, a comment, a batch of events) carries the session id (`sid`), its context
(`cid`) and a sequence number (`seq`), and is posted as it happens to the Google Apps Script web app: JSON sent as
`text/plain` with `fetch` mode `no-cors`, since the response can't be read.

- `sid` is a long random id made at consent and kept in `localStorage`. The study code is only a lookup the script
  resolves to it.
- `cid` and its `seq` are kept in `sessionStorage`, one per browser tab or app window, so Android's tab and installed
  app, which share `localStorage`, never collide.
- Unsent pieces wait in `localStorage`, each with its own `cid` and `seq`, and retry every 20 seconds and on every open.
- To confirm receipt, the app asks the script by JSONP (a GET whose `doGet` returns ContentService JavaScript) for the
  highest `seq` it holds for this `sid` and `cid`, and clears the queue up to it. The same call settles the code and
  the arms at the end of intake, looks a code up in the installed app (returning the session's stage, arms and
  version), and says whether the installed app has been seen.
- Events are batched every 10 seconds or 25 events, each keeping its own `seq`.

The script runs from the Florin Health account that owns the Sheet ("Execute as: me, Who has access: Anyone", so
phones can post without signing in). It appends rows under a lock, writes each tab's header row the first time, and
drops a piece whose `sid`, `cid` and `seq` it already has. The endpoint is public, so it also checks every piece: a
known `study` id, the shape of `sid` and the code (with its check character), known question ids and field types. It
drops fields it doesn't know, cuts any text over 1,000 characters, removes email addresses and phone numbers again,
and refuses more than 60 pieces a minute or 1,500 in all from one `sid`.

### 6.2 On every row

| Column | What it holds |
|---|---|
| `received` | When the script wrote the row, in the Sheet's time zone |
| `sid` | The session id, a long random id |
| `cid` | Which browser tab or app window sent it: 6 random characters |
| `seq` | The piece's number from that `cid`, from 1. One row per `sid`, `cid` and `seq` |
| `at` | The phone's clock when it happened, in UTC, to the second. No time zone is stored |
| `study` | The study id from config.js (`-test` on Will's own runs) |
| `build` | The focus app's version |

### 6.3 The tabs

**sessions**: one row per `sid`, updated as pieces arrive. No row before consent.

| Column | What it holds |
|---|---|
| `sid`, `study`, `build` | As 6.2 |
| `code` | The study code (K7M4PX), the lookup for a removal request |
| `restart_of` | The code of the session this one started again from, if any |
| `first_at`, `last_at` | The first and latest piece's `at` |
| `active_minutes` | Minutes with the page visible (from `visibilitychange`), so time in Safari fetching the code doesn't count |
| `minutes` | From `first_at` to Submit |
| `platform` | iPhone, Android or other |
| `os` | The system's major version (26, say) |
| `browser` | Safari, Chrome, Samsung Internet, Firefox, an in-app browser, or other. Parsed from the user agent; the string itself isn't stored |
| `width` | The screen's width in CSS pixels |
| `theme` | light or dark, as the phone was set |
| `text_reported` | smaller, standard or larger: the text size the phone reports on iPhone (`-apple-system-body`); unknown elsewhere |
| `segment` | IN1's answer as a code: pattern, simple, stack, tracker, record, unsure, or blank |
| `person` | sarah, unless `people` is changed |
| `version` | standard or easy, as used |
| `version_picked` | IN9's answer |
| `home`, `history`, `week` | The session's arms |
| `order` | The Latin square row (1 to 5) |
| `assigned` | script, or phone when it was offline at the end of intake |
| `decisions` | The config on the phone, one line: `form=C bmUI=quick home=score history=calendar checkin=on mealUI=quick look=built onboard=short weekCard=card plan=member data=est meals=all` |
| `install` | seen, said, browser, or couldn't (3.7) |
| `installed` | yes once any piece comes from the installed app |
| `stage` | The furthest step reached: consent, intake, tour, compare, install, free, exit, done, or stopped |
| `tasks_seen` | How many tasks the app saw done, 0 to 9 |
| `comments` | How many comments were sent |
| `sus` | 0 to 100, once all ten are answered |
| `submitted` | yes or no |

**answers**: one row per question answered or skipped, in every section.

| Column | What it holds |
|---|---|
| 6.2's columns | |
| `section` | intake, task, tour, compare, install or exit |
| `task` | The task id (bm, week, score...) for a task's own questions; blank otherwise |
| `qid` | The ID from section 4 (IN1, WK2, SUS4, CP1) |
| `question` | The words shown, with any computed names and figures filled in |
| `answer` | The options' words as shown, joined with " \| " |
| `value` | The codes: option ids, or 1 to 5, or 1 to 7 |
| `correct` | yes or no for a reading question; blank where there's no right answer |
| `right` | The right answer's words, for a reading question (it's computed, and can change with what T1 and T2 logged) |
| `words` | The optional words, after email and phone numbers are removed |
| `alarm_note` | yes when the primary care note showed under the box |
| `skipped` | yes or no |

**tasks**: one row per task attempt, written when its questions are done.

| Column | What it holds |
|---|---|
| 6.2's columns | |
| `task` | bm, time, week, score, patterns, checkin, history, ask, install |
| `n` | Its place in the tour (1 to 9) |
| `version` | standard or easy |
| `state` | The decisions on the phone during the task, one line |
| `started_at`, `seconds`, `active_seconds` | When it started, how long until Done, Skip or the goal, and how much of that the page was visible |
| `outcome` | seen (the app saw the goal), said (Done without the goal), stuck (skipped: couldn't find it), declined (skipped: didn't want to), broken (skipped: something didn't work). For install, as 3.7 |
| `hint` | yes or no |
| `path` | How it was done. bm: plus tile, Today's row or form, details yes or no, undo yes or no. time: edit, undo and log again, or gave up. score: details or chip (Standard) or Your weeks (Easy). checkin: today card or plus. history: calendar or list, and months moved. ask: suggested, typed, or ask about this. install: added, code from the address or typed |
| `screens` | How many screens the phone moved through |
| `backs` | How many times they went back or closed something |
| `ease` | TE (IS1 for install), 1 to 7 |
| `chips` | TR's words, joined with " \| " |
| `checks` | The task's reading questions, as "2 of 3 right" |

**comments**: one row per comment.

| Column | What it holds |
|---|---|
| 6.2's columns | |
| `phase` | The task id, cp1, cp2, cp3, install, free or exit |
| `screen` | The app's screen key, from an allow-list (today, home-day, ez-today, plus, bm, ez-bm, i-score, ez-weeks, history, hist-cal, ask). Keys that carry health content map to neutral ones: `ask-alarm` reads ask; the flag, No BM and "When to see a clinician" sheets read "a sheet" |
| `state` | The decisions on the phone, one line |
| `target` | What was tapped, from an allow-list in the app's interface words: a card's title ("Your last 7 days", "FloraScore", "Possible patterns"), a tab, a named control ("Save BM", "Start", "Details"), or the screen's title. Anything else reads "a log entry", "a log sheet", "the chat", "a text box" or "a sheet", never what it says |
| `tx`, `ty` | Where inside the target, as a share of its width and height, 0 to 1, two decimals |
| `vw`, `vh` | The viewport's size in CSS pixels |
| `scroll` | How far the screen was scrolled, in CSS pixels |
| `kind` | CM1's words, joined with " \| " |
| `words` | CM2, after removal |
| `alarm_note` | yes when the primary care note showed |
| `how` | double tap or button |

**events**: one row per event, sent in batches.

| Column | What it holds |
|---|---|
| 6.2's columns | |
| `phase` | As in comments, or consent, intake |
| `type` | flow, screen, act, set, view, depth, vis, install, net or error |
| `screen` | The app's screen key at the time, from the allow-list above |
| `name` | flow: consent, intake_done, tour_start, task_start, task_goal, task_end, cp_shown, install_shown, free_start, free_end, exit_start, pay_start, submit, stopped, cleared. screen: the key moved to. act: the app's action name from an allow-list (tab, plus, profile, idetail, iback, edit, undo, vr-quick, ck-start, vr-cal-day, vr-cal-m, ask-about, pay-start); `flag-report`, `flag-undo` and `nobm` read "a sheet" or "a log", anything else "other". set: the decision key. view: a card's title, once half the card has been in view for a second. depth: the deepest point reached on a screen, as a share of its height, sent on leaving it. vis: hidden or visible. install: prompt_shown, prompt_accepted, prompt_dismissed, appinstalled, standalone, code_ok, code_bad, code_unknown. net: flushed, failed. error: error |
| `detail` | A short value from a fixed list: a tab's name, a decision's value, a count, a share, an error's file and line (never its message, which can hold typed text). Never a log's content, a picked form, a symptom, a food, a note or anything typed |

**The recruiter's sheet** is a separate spreadsheet the recruiter can open, and the research team doesn't need. Its
`tokens` tab holds one column, the thank-you code, each written at a random row, with no session id and no time; the
recruiter checks a code there and marks it paid. When `followUp` is on, its `followup` tab holds `week` (the Monday of
the week it was left) and `contact` (as typed), with no `sid`, no `cid` and no day or time, so it can't be joined to a
session.

### 6.4 What we never collect

- Names, emails or phone numbers (except the optional follow-up, kept apart), and anything the recruiter's form holds.
- A birth date or exact age (a range only), gender or sex, height, weight, conditions beyond IN2's own words,
  medicines.
- Location, IP addresses, device ids, advertising ids, the full user agent string, contacts.
- Audio, video, photos, screen recordings, screenshots, keystrokes. "Record reactions" means the chips and words people
  choose to give.
- The content of anything logged or typed in the app: BM words, details, the flag, symptoms and their strength, meals,
  notes, check-in answers, Ask Florin's questions and answers, Profile answers. Screen and action names that would
  reveal it are mapped to neutral ones.
- Anything from Apple Health, Health Connect, Oura or any other app.
- Cookies, analytics, third-party scripts or fonts.

### 6.5 Keeping it

The Sheet belongs to Florin Health's Google account, shared only with the research team named in the consent, with no
public or "anyone with the link" access. A request to remove answers, by study code, deletes every row with that
code's `sid`, and then the email that asked. Every row is deleted {keepMonths} months after the study closes. Summaries
quote people's words without codes. When the study closes, set `open: false` and archive the Apps Script deployment, so
late pieces go nowhere. The recruiter's form and sheet are deleted when recruiting ends and every thank-you is paid.

**A worrying comment.** We can't contact anyone, by design. The app shows the primary care note when a box holds an
alarm sign, and the thanks screen repeats the primary care and urgent-care lines. A reader who sees a comment that
sounds like a person's own alarm sign tells the research lead the same day; the lead checks the note showed
(`alarm_note`) and logs it. Nobody tries to identify the person.

This is product research, not a clinical study. If any of it is meant to feed the NSF pilot or a publication, it needs
an ethics review first, and a new consent.

---

## 7. Analysis

### 7.1 Cleaning

- Leave out `-test` sessions.
- The script has dropped duplicates already. A session with `restart_of` replaces the one it names, unless the first
  reached further; count each person once.
- Task numbers count sessions that reached that task. SUS and the exit survey count sessions that reached the exit.
  Intake and comments count everyone who consented. Every number says its count: "16 of 21".
- Read the free words in full before any count. They can change what a number means.

### 7.2 By persona

Filter by `segment` (IN1), then by the other persona columns: IN2 (IBS-D or might have IBS), IN3 (symptoms most days or
a few times a week), IN4 (already tracks), IN5 (uses the Florin app), IN6 (Oura and other wearables), IN7 (65 or over)
and `version`. For each group: tasks seen, median seconds and median ease per task, reading questions right, SUS
(median and range), TR1 to TR4, EX1 against IN8, FV1, VA2, US1 to US3, MG1. A group under five people is reported as "a
few", with its words, and no figure.

### 7.3 By task and by arm

One row per task: how many were seen, said, stuck, declined and broken; hints; median seconds and active seconds;
median ease; the reading questions right; the reaction chips counted, with the share that are Confusing, Not useful,
Worrying or Too much on screen; the paths. Then the same split by arm (Home, History, week card) and by version. A task
needs a look when fewer than 4 in 5 reach the goal, when its median ease is under 5, or when its negative chips
outnumber the positive ones. Then the events show where people went instead: the screens they moved through before
Skip, and the backs. Task order is read last, to check a task didn't fare worse only for coming late.

### 7.4 By screen, and the data vis modules

Comments grouped by `screen`, then by `target`, against the active time spent on each screen (from screen and vis
events), so a screen people sat on longer isn't over-read. Each comment is placed on a 390-wide screenshot of that
screen in its session's decisions (`work/shots.js` makes them) by finding its target there and its offset inside it,
so a comment from a 360 or 430 wide phone, or from Easy, lands on the same spot.

The data vis modules are then read **module by module**, in the order of `claude/Florin data viz.md` section 2 (the
hero, the week, each Insights card, each detail page). For each: how many people had it in view (view events) and how
far down the screen it sits against how far people scrolled (depth), how many picked it in IV1, how many would not
miss it (IV2, and FV3 for the parts of the app), its comments and their kinds, and the chips on the tasks that use it.
That table is the input for organising them: which cards lead Insights, which fold into a detail page, which go.

Then the friction (FR1, FR2) and missing (MS1, MS2) words are grouped by theme, with the count of people behind each
theme.

### 7.5 What would change a decision

Set before the data comes in, so the data can't move the bar. Every figure is a count with its 95% interval (Wilson):
19 of 24 is 79%, 60% to 91%; 12 of 24 is 50%, 31% to 69%. With about 24 people, crossing a bar means **flag for design
review**, read with what people wrote, not a decision by itself. A call rests on at least 5 people, and a note about a
subgroup on at least 3. Each pair of bars meets, so every result falls on one side.

| Decision | What we read | Our recommendation stands when | Flag for design review when |
|---|---|---|---|
| 1 Consistency: C | BM1 and BM2, by IN5 | Every word is marked unclear, and every pair hard to tell apart, by fewer than 1 in 5 | A word or a pair reaches 1 in 5 (5 of 24): reword it before counsel reads C. If at least 3 of today's users mark Pellets or Soft, at twice the others' rate: a one-time note for them where the tiles first show |
| 2 BM logging: Quick tiles | The bm and time tasks' outcomes, seconds and paths; Undo straight after a one-tap save | 4 in 5 save a BM without a hint, and 4 in 5 change the time within 60 seconds | Fewer than 4 in 5 save without a hint: look at plus and the tiles. Fewer than 4 in 5 change the time within 60 seconds: build the time buttons before any pilot. 1 in 4 or more undo a one-tap save: open the form for the first two weeks (the decision's open question) |
| 3 Home: Score first | The week and score tasks by Home arm; CP1 on its own | Of those with a preference, fewer than 6 in 10 prefer the day and its logs, and the Day first arm doesn't reach those goals more often by 3 people or more | 6 in 10 or more of those with a preference prefer the day and its logs, or the Day first arm reaches them more often by 3 people or more: put Day first back to Will |
| 4 History: Calendar | The history task by arm, HI1, CP2 | 4 in 5 in the Calendar arm find the day in {month} | Fewer than 4 in 5: the gap needs its own mark or word on the calendar. 6 in 10 or more of those with a preference prefer the list: keep a List switch on History (the open question) |
| 5 Weekly check-in: On | CK1, the check-in task's ease | Half or more would answer every week or most weeks, and the median ease is 6 or more | Under half would answer most weeks: keep it, and let people turn it off in Profile (the open question). Median ease under 6: look at the check-in's screens |
| 7 Data style: Florin charts, and the hero's words | SC1 and SC2 by version, the score task's chips, comments on the hero and the cards; CP3's words | SC1 right for 4 in 5 in Standard | Fewer than 4 in 5 in Standard: the hero says "compares you with you" on Today, as Easy does. Oura users' CP3 words go to Will with open call 1, as words, not a count |
| 8 Version: Easy as a setting | The Easy group's task outcomes and words; IN9 against TX2; TX1 | No bar: read as problems found, since the Easy group is about five people | A task stuck or broken for 2 or more of the Easy group: fix that screen first |
| The week card | WK1, WK2, WK3, the week task's outcome, seconds and chips, comments on it; by `week` when two are tested | WK1 and WK2 right for 4 in 5 | Fewer than 4 in 5: the design goes back before it ships. With two designs, a difference under 3 people reads as no difference |
| Delivery for a pilot | `install` by platform and age, IS1, IS2 | 3 in 4 of those who try add it and open it from the home screen | Fewer: two options to Will, an app store build, or a plain link with no install. "I'd rather not add it" is counted apart, as a choice |
| Words and trust | TR2, TR2b, TR4, TR4b, comments marked confusing | Fewer than 1 in 5 answer Yes to TR2, and to TR4 | 1 in 5 or more: the screens they name go to counsel with the claims rules. Any screen named in TR2b goes to counsel, whatever the count |
| Membership and price | VA2, VA3, Start membership taps | No bar: direction only. What people tap counts beside what they say, and VA3 isn't anchored to a price | |
| Messaging | MG1, MG2, by segment | No bar: direction for Will's call | |

### 7.6 What Will gets

When Will asks, we read the Sheet and send one page: a line per goal (G1 to G10) with its numbers, counts and
intervals; the table in 7.5 filled in; the five things that tripped the most people, with the screens; the parts people
liked most and would not miss; the data vis table from 7.4; what's missing, by theme; and up to ten comments in
people's own words, by screen. Then the decisions it moves, as calls for Will.

### 7.7 What this test can't tell us

- People act as a sample person, in one sitting. Habit, the weekly rhythm and what their own data would feel like are
  out of reach; US1 to US3 are guesses about the future.
- A small, self-selected group. Persona cuts show direction, not proof; a 24-person bar has a wide interval.
- Each person used one Home and one History for the tasks and the other for one small task. Half saw each first, so the
  pull of the familiar falls both ways, but it doesn't vanish.
- Everyone 65 or over used Easy, so Easy and Standard aren't compared at the same age. Easy is read as problems found.
- The tasks ran in the browser, with its address bar showing; only free use and the exit ran from the home screen.
- The app is set to a fixed Sunday evening, so the date on screen isn't the real one.
- Ask Florin answers from the logs alone here; shipping answers will read differently.
- The week card holds only for the designs recorded in `week`.
- The meal sheet and Ask Florin on Free aren't tested.
- English only, US prices.
