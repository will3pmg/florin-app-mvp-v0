# Florin app: the handoff to a developer, through Figma

November 7, 2026. Will (Nov 7): "We need to start prepping the entire app for handoff via Figma to developer including
states, different pages, different flows. Paid and Unpaid. We can do everything that we've finalized, namely home,
logging, ask is good for now though may need different flows/components shown? brand page, component page both needed.
Page for 'easy view' settings? ... do it while we rebuild insights and do that last."

This file is the plan and the inventory. Phase 1 (this file, the capture tool and a first capture run) is done. Phase 2
(building the Figma file) waits on two things from Will: where the file goes, and which decisions are locked.

Read with: `CLAUDE.md`, `claude/Florin DESIGN.md` (tokens, components, copy), `claude/Florin data viz.md` (the marks,
the week, the FloraScore strip), `claude/Florin decisions.md` (the nine decisions and Ask Florin on Free).

**Contents:** 1 Scope and order. 2 How the inventory is written. 3 Brand. 4 Components. 5 The flows (Home, Logging,
History, Weekly check-in, Ask Florin, Onboarding, Profile and settings, Easy version, Membership, then Insights). 6 States
that cut across every flow. 7 Decisions and what waits on them. 8 The capture tool. 9 The Figma build plan. 10 What we
need from Will. 11 What the developer gets.

---

## 1. Scope and order

In Will's order. Everything on the prototype that is finalized or recommended goes in; Insights goes last, after the
rebuild that is running now.

| # | Page | What it holds | Status |
|---|---|---|---|
| 1 | Brand | The six brand tokens and the app's colour roles, type, spacing and radius, elevation, the marks, icons, copy and licensing rules | Ready to build |
| 2 | Components | Every component with its variants and states | Ready (Ask about this is B, Compact, locked Nov 8) |
| 3 | Home (Compact) | Today, the FloraScore strip, the week row, the day picked, the check-in row, the flag note | Ready |
| 4 | Logging | Plus, BM quick tiles and the form, symptoms, meals (quick and one at a time), voice, photo (in progress), No BM, an earlier day, edit and delete | Ready; photo log in progress |
| 5 | History | Calendar, a day tapped, months, Free | Ready |
| 6 | Weekly check-in | Due on Today, four questions, tags and note, saved, when it's due, skip | Ready |
| 7 | Ask Florin | Opening read, a turn, options, a redirect, the alarm and clinician path with Make a report, What Ask Florin knows, Free lock | Ready; Ask button style pending |
| 8 | Onboarding | Short (8 steps); Full survey (14) as the alternative | Ready |
| 9 | Profile and settings | Profile, its sheets, the Easy view settings page | Profile ready; Easy settings page in progress (shot as it stands) |
| 10 | Easy version | Today, Add, a BM in four steps, symptoms, meals, History, Ask, Your weeks | Ready |
| 11 | Membership | The paywall from each entry point, locks, teasers that blur the person's own counts | Ready |
| 12 | Insights | Insights and its detail pages | **After the rebuild** |

Two other things are being built in other sessions as this is written, and are listed where they land: the photo meal
log (Logging) and the Easy view settings page (Profile). Both landed on the prototype during this pass and are shot as
they stood on Nov 7, marked in progress (`wip` in `index.json`), to shoot again when they settle. The capture tool's
`--rows` switch shoots any Screens row the inventory doesn't name, so a rerun at the end catches anything else new.

**Not in scope for the handoff:** the prototype page around the phone (toggles, notes, demo controls), the data looks
library, the focus test and voting sites. These are review tools, not the app.

---

## 2. How the inventory is written

Each flow lists its **entry points**, its **steps**, its **exits**, the **toasts and undo** it shows, then a table of its
**screens** with their **states**. A state is one thing the developer has to draw: a data state, a plan, a theme, a
decision's option, or an interaction state (a tile picked, a sheet open, a toast up).

**The axes every screen is checked on:**

| Axis | Values | Where it matters |
|---|---|---|
| Data | **12 weeks** (Florin knows the usual), **day 5** (learning, no FloraScore), **day 0** (just joined, nothing logged) | Every screen that shows a reading or a count |
| Plan | **Member**, **Free** | Home's strip link, History before the last 7 days, Ask, the paywall, Insights |
| Theme | **Light**, **Dark** | Every screen (one design, two modes of the same variables) |
| Easy | Off, **On** (larger text and simpler screens) | Its own screens; the shared components grow |
| Width | **390** (the frame), with 360 checked for wrapping | Every screen |

**The special states** that cut across flows (section 6 has the detail): a **flagged today** (blood, mucus or a black
stool ticked on a BM: the Teal note, read against nothing), an **alarm word in a note** ("It looked like tar"), **no
score** (nothing logged on 2 of the last 3 days), a **day with 5 BMs** (Monday, Sep 21), **check-in due / done / skipped
/ off**.

The demo's clock: Sunday, Oct 11, 7:40 PM, day 90 of Sarah's logs. Every figure on a screen comes from her model. In
Figma it will be static text; the developer computes it (CLAUDE.md: "Every number a screen states is computed from the
model, never typed").

The machine-readable twin of this inventory is `handoff/inventory.js`; `handoff/capture.js` shoots it. The capture run of
Nov 7 is at `/tmp/claude-0/-home-user-florin-app-mvp-v0/8c9716d2-58e6-5835-9170-e12c1e677800/scratchpad/p8/handoff/`
(section 8). File names in the tables below are `<flow>/<screen>/<state>--<plan>--<theme>.png` in that folder.

---

## 3. Brand (foundations)

The source of truth is the brand studio (https://claude.ai/artifact/AnK85Y5MHPX9MiDiUiY3Sj) and `claude/Florin DESIGN.md`
v1.1. Every value below was read off the running prototype (`tokens.json` in the capture folder resolves each token to hex
in light and dark).

### 3.1 Colour

**The six brand tokens** are the only literal colours. Everything else derives from them.

| Token | Hex | Role |
|---|---|---|
| Forest | `#00352B` | Ink on light, the hero card, the FloraScore strip |
| Cream | `#F9F7F2` | The light ground; ink on dark |
| Ray | `#EEFFA3` | The one signal: primary buttons, the plus, Ask; "your usual" on dark |
| Plum | `#4F2641` | "Your usual" on light; the avatar |
| Teal | `#396E7C` | Context: symptoms, the flag, the clinician note, focus ring |
| Gold | `#D1BD7E` | A shift from the usual (as the derived Shift tones) |

**The app's colour roles** (the CSS names are the developer's names; Figma variables carry them as code syntax):

| Role | CSS token | Light | Dark | Rule |
|---|---|---|---|---|
| Ground | `--ap-bg` | `#F9F7F2` Cream | `#03201A` | |
| Card | `--ap-card` | `#FFFFFD` | `#0A3129` | Cards sit 16px apart |
| Card 2 | `--ap-card2` | `#F1EEE6` | `#0F3A31` | Picked day, chips, the Today column |
| Ink | `--ap-ink` | `#00352B` Forest | `#F9F7F2` Cream | |
| Ink 2 | `--ap-ink2` | `#36544C` | `#CAD8D4` | Anything a person reads |
| Ink 3 | `--ap-ink3` | `#5D766F` | `#8EA7A0` | Axis ticks, placeholders, "not counted". **Light is darker than the studio's** (`#6A837C`, 4.07:1) so it clears 4.5:1 on the card (4.89:1). For the studio to take back |
| Line | `--ap-line` | Forest 12% | Cream 13% | 1px hairlines only |
| Your usual (mark) | `--ap-signal` | Plum | Ray | A day within, the band, a count of days within |
| Your usual (band) | `--ap-band`, `--ap-band-edge` | Plum 14%, edge 32% | Ray 17%, edge 40% | |
| Usual chip | `--ap-usual-bg`, `--ap-usual-ink` | Plum 11%, Plum | Ray 14%, `#FAFFBC` | "About the same", "Within your usual" |
| Shift (mark) | `--ap-shift` | `#C2A64B` | `#DCC374` | Always with its word; never FloraScore |
| Shift ink | `--ap-shift-ink` | `#695612` | `#EFD991` | Gold marks carry a 1.5px Shift Ink edge in light (Gold alone is 2.37:1) |
| Shift chip | `--ap-shift-bg` | Gold 32% | Gold 16% | |
| Context | `--ap-teal` | Teal | `#8EC0CD` | Symptoms square, flag ring, clinician note edge |
| Context tint, ink | `--ap-info-bg`, `--ap-info-ink` | Teal 10%, `#2A5662` | Teal 13%, `#B7DCE6` | The Teal note and banner |
| The reading (charts) | `--ap-chart` | Forest | Ray (Cream proposed, open call for the studio) | |
| Hero | `--ap-hero`, `--ap-hero-ink` | Forest, Cream | Card 2, Cream | The strip and the hero card |
| Accent | `--ap-accent`, `--ap-on-accent` | Ray, Forest | Ray, Forest | One Ray moment per view |
| Check-in heat | `--h0` to `--h3` | Plum steps | Solid Plum steps | Check-in strips |

**Rules the Figma file enforces by construction:** Plum means your usual, only. Gold means outside your usual, only, and
always with its word. Teal is context and the clinician note and never changes colour. **No red, no green, no Ray Deep
in the app** (Ray Deep `#697614` is for the website only; it stays out of the app file). On dark, Ray means your usual.
Colour is never the only cue: every mark has a word (a label, a chip or a legend line).

**What Figma can't do with these:** the app derives tints with `oklch(from ...)` and `color-mix()`. Figma variables have
no colour functions, so each derived role is stored as its resolved value in each mode, with the formula in the
variable's description, and aliased to a brand primitive only where it is the brand colour exactly (Ink light is Forest,
Ground light is Cream, Your usual light is Plum and dark is Ray, Accent is Ray, Context light is Teal). A brand change
then needs the resolved values regenerated (the capture tool writes them to `tokens.json` on every run).

### 3.2 Type

Three voices, every screen: **DM Sans** for the interface (300, 400, 500; 600 only for Ask's one bold question), **Lora**
for the story (Ask's reply, sheet ledes, the hero's sentence), **Space Mono** for anything measured or labelled (dates,
kickers, axes, times). Loaded from Google Fonts in the prototype; the same faces are in `focus/fonts/` as woff2.

**What the prototype uses.** The capture run counted 165 distinct text styles across the 167 screen states (`type.json`),
around 50 DM Sans size and weight pairs alone, with half-pixel sizes (10.5, 11.5, 12.5, 13.5, 15.5) that sit off
DESIGN.md's list. The Figma file consolidates them to the styles below. Where a prototype size is folded into a
neighbour, the style says so in its description, and the developer uses the style.

| Figma text style | Face | Size / line | Use (prototype classes) |
|---|---|---|---|
| Numeral/Hero | DM Sans Light | 64 / 64, -3% | FloraScore on Score first (`.ap-hero-n`) |
| Numeral/Strip | DM Sans Light | 40 / 40, -3% | FloraScore on Compact's strip, Insights ring |
| Numeral/Day | DM Sans Light | 32 / 32 | Day 5 of 14 |
| Title/Screen | DM Sans Light | 32 / 32, -3% | History, Ask Florin (`.ap-h1`) |
| Title/Greeting | DM Sans Regular | 25 / 27.5, -2% | Good evening, Sarah (`.ap-hello`) |
| Title/Card | DM Sans Medium | 17 / 20.4, -1% | Card and sheet heads (`h2`, `h3`) |
| Body | DM Sans Regular | 15 / 21 | The interface default (DESIGN.md `ui`) |
| Body/Strong | DM Sans Medium | 15 / 21 | Row titles |
| Row | DM Sans Medium | 14 / 19.6 | Entry rows, chips to ask, small buttons |
| Button | DM Sans Medium | 14 / 20 | App buttons (DESIGN.md `button-sm`) |
| Choice | DM Sans Medium | 13.5 / 14.9 (proposed 14) | Choice chips (`.ap-ch`) |
| Small | DM Sans Regular | 13 / 18.2 | Sub-lines, the strip's sentence, why lines |
| Small/Strong | DM Sans Medium | 13 / 18.2 | Links, filter chips |
| Caption | DM Sans Regular | 12.5 / 17.5 (proposed 12) | Hints, sources, notes (`em`) |
| Chip | DM Sans Medium | 11.5 / 12 | Status chips (DESIGN.md `chip`) |
| Fine | DM Sans Regular | 11 / 16 | Disclaimers (`.ap-fine`) |
| Ask/Question | DM Sans Semibold | 16 / 21 | The one bold question in a turn |
| Story/Reply | Lora Regular | 17 / 25 | Ask Florin's reply |
| Story/Reply strong | Lora Medium | 17 / 25 | The thing to try, the urgent line |
| Story/Lede | Lora Regular | 15 / 22 | Sheet and step ledes |
| Story/Lead | Lora Regular | 20 / 27 | Ask's opening read |
| Story/Hero | Lora Regular | 19 / 26 | Score first's sentence |
| Mono/Kicker | Space Mono Regular | 11 / 15.4, +6%, caps | Kickers, field labels (`.ap-k`, `.ap-f-l`) |
| Mono/Date | Space Mono Regular | 10.5 / 16, +5%, caps | Dates, eyebrows |
| Mono/Time | Space Mono Regular | 11 / 11 | Times on rows (`.ap-tl-t`) |
| Mono/Weekday | Space Mono Regular and Bold | 11.5 / 16 | Compact's week row |
| Mono/Axis | Space Mono Regular | 10 / 14 | Chart axes and values |
| Easy/Number | DM Sans Regular | 64 | Easy's FloraScore |
| Easy/Question | DM Sans Regular | 32 | Easy's step question |
| Easy/Say | DM Sans Regular | 28 | Easy's sentence on Today |
| Easy/Title | DM Sans Medium | 22 / 27.5 | Easy card titles |
| Easy/Button | DM Sans Medium | 20 / 26 | Easy buttons and rows |
| Easy/Body | DM Sans Regular | 20 / 26 | Easy body |
| Easy/Small | DM Sans Regular | 18 / 25 | Easy secondary text |

Sentence case everywhere. DM Sans has an optical size axis; DESIGN.md asks for it to follow the font size in Figma.

### 3.3 Spacing, radius, sizes

- **Spacing:** one 4px scale, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120. No in-between values.
  `work/audit-spacing.js` keeps the prototype at 0 off-scale.
- **App layout:** 390 frame, 20px sides, 16px between cards, content from 56px (under the status bar) to 120px from the
  bottom (over the floating tab bar).
- **Radius:** xs 2 (legend swatches, chart marks), sm 4, md 8, lg 12 (source rows), xl 16 (fields, option rows,
  banners, toasts, bubbles), 2xl 24 (cards, the hero), 3xl 32, full (pills, chips, rings, the tab bar). Nested corners
  are the outer corner minus the padding.
- **Control heights:** app button 44, compact 36, segmented 36, filters 32, tags 24, chips 20; every target 44 by 44 at
  least, however small it looks. Easy: 56 to 64.

### 3.4 Elevation

Mostly flat: depth from surface colour. Light cards: `0 1px 0 Forest 4%, 0 10px 24px -18px Forest 35%`. Dark cards: a
1px Cream 6% inner hairline and `0 10px 24px -18px black 80%`. The floating tab bar, the plus and the toast carry their
own soft drops (read from `refresh.css`). Sheets on dark get a 1px Cream 9% top hairline. Two effect styles each (light,
dark), since Figma effect styles have no modes.

### 3.5 The marks (data viz.md, section 1)

Shape says what a thing is, colour how it reads against the usual, a word says it again.

| Mark | Drawn as | Word |
|---|---|---|
| A day within your usual | Filled Plum circle (Ray on dark), the date inside in Cream | Within your usual |
| A day outside | Filled Gold circle, 1.5px Shift Ink edge in light, date in Forest | Outside your usual (and a line saying what) |
| Logged, not counted (or any day before day 14) | Filled Ink 3 circle | Not counted (Logged before day 14) |
| Nothing logged | No circle: the date alone in Ink 3 (never a hatch, a strike or a zero) | Nothing logged |
| Today | 2px Ink ring 2px out, and the word Today | Today |
| Today, flagged | 2px Teal ring with the info glyph, no fill, in no count | Noted for a clinician |
| Symptoms that day | One 8px Teal square under the day, whatever the strength | Symptoms |
| **Week ring** (Today's week card, Compact's week row) | A ring a day: Plum ring within, Gold ring over a Gold tint (solid disc on dark) outside, Ink 3 ring not counted, a thin empty Ink 3 ring with "+ Add" for nothing logged, Teal ring flagged; 40px on the week card, 32px on Compact | as above |
| In a chart | Your usual as a band named in words; the reading in the reading colour; Gold with an edge outside; today ringed and labelled; gaps stay gaps; No BM a dot on 0 | |

**Open for the app:** the day is a filled circle on the calendar, History and Easy, and a ring on Today's week card and
Compact (Will's Nov 4 pick). Pick one before components are final (section 10).

Sizes: day circles 28px (32 in Easy), the week card's rings 40, Compact's 32, chart marks 8 at least, rings and edges 2
and 1.5. **Charts never use dashed lines.**

### 3.6 Icons and glyphs

- **28 interface icons** (`RU.icon`, 20px box, 1.6 stroke, round caps and joins, `currentColor`): back, chev, info,
  clock, bars, home, chart, plus, check, note, meal, lock, mic, cal, close, down, list, chat (Ask Florin's glyph), today,
  sym, ck, nobm, trash, undo, pen, report, repeat, sliders. Ask adds its own send, stop, thumbs and What Ask Florin knows
  (`refresh-ask.js`), and the modules a few more; the build collects them all from the DOM dumps' SVG.
- **The seven consistency glyphs** (`RU.glyph`, 24px, filled, our own abstract marks: pebbles, an uneven bar, a short
  bar, a long bar, three blobs, a low spread shape, waves). Never a picture of the thing.
- **The FloraScore glyph:** a small plain circle beside the word FloraScore. A name, never a gauge.
- **The Ask token:** Ask Florin's glyph (a round bubble holding the Flow wave) on a disc: Forest with a Ray glyph on light
  and on Ray, Ray with a Forest glyph on dark; a lock in the token on Free.
- **The Flow logo:** from the studio (`f01`), never redrawn; the app icon is the reverse mark on a Forest rounded square
  (22% corner). The current artwork is a trace; a clean vector redraw is due before production.

In Figma each icon is a component imported from its SVG source (`createNodeFromSvg`), stroke bound to an ink variable,
swapped through one instance-swap property.

### 3.7 Copy rules

- No em dashes, no exclamation points, no humor, on any surface.
- **No medical claims.** Florin never predicts, diagnoses, treats or cures. Never "healthy", "normal", "improving",
  "worsening", "good", "bad" about a person's data: everything is read against **their own usual**, in neutral words
  (within your usual, a little above, later than usual, about the same). Never mention IBD.
- **Names:** Florin Health, then Florin; "the Florin app"; FloraScore is one word; Ask Florin, never a doctor's title;
  Florin membership.
- Patterns say "tends to follow" and how sure they are, never "causes"; always "Patterns show what tends to happen
  together. They don't prove cause."
- Wherever symptoms appear, a short note on when to talk to a clinician. An alarm feature (blood, black or tar-like
  stools, fever, vomiting that won't stop, weight loss, waking at night to go) routes to primary care with the Teal note,
  never interpreted, never red.
- Every screen ends on one next step, then a short disclaimer. The claims check (`prototype/js/claims-rules.js`, 22 rules)
  and the alarm net (`L.alarmsIn` in `refresh-data.js`) are logic for the developer to port, not design.

### 3.8 Licensing

The Bristol Stool Form Scale and IBS-SSS are Rome Foundation instruments: don't name, quote, adapt or score them without
a licence. Consistency C's seven words and the check-in's four questions are our own (counsel to read C's words before
ship). Consistency A's words are stand-ins and must not ship without the licensed wording.

---

## 4. Components

One Figma component set per row, variants bound to the variables, theme by variable mode (never a Light/Dark variant).
"Plan" is a variant only where the component differs on Free. Sources are the prototype's CSS (`app.css`, `refresh.css`,
`refresh-<module>.css`) and the library looks' CSS for the week ring. Pending rows wait on a pick or a build.

### 4.1 Atoms

| Component | Variants and states | Source |
|---|---|---|
| Icon | 28 core icons and the modules' own, instance swap; sizes 18, 20, 24 | `RU.icon`, `refresh-ask.js` |
| Consistency glyph | 7 glyphs; on light, on Forest | `RU.glyph` |
| FloraScore glyph | Light, on Forest | |
| Ask token | Light, on Ray, dark; Locked (Free) | `refresh-ask.css` |
| Kicker | Teal on light, Ray on Forest; with dot | `.ap-k` |
| Status chip | Usual, Shift, Info (Teal), Neutral | `.ap-chip--*` (20px) |
| Day mark | State: Within, Outside, Not counted, Logged, Nothing logged, Flagged; Today ring on/off; Symptom on/off; Size 28, 32 | `RU.dayMark`, `.ap-day` |
| Week ring | State: Within, Outside, Not counted, Nothing logged (+ Add), Flagged; Size 40 (week card), 32 (Compact); Picked on/off; Today on/off; Symptom on/off; Held (Free) | library `look-rings.css`, `refresh-variants.css` |
| Chart marks | Reading dot, Shift dot with edge, band, Today ring and label, Flag ring, Symptom square, Meal tick, No BM dot, Ink 3 dot (before day 14) | `refresh.css` chart marks |
| Legend item | Each mark with its word; up to three lines | `.ap-legend` |
| Divider, Fine print | | `.ap-fine` |

### 4.2 Controls

| Component | Variants and states | Notes |
|---|---|---|
| Button | Style: Primary (Ray), Forest, Line, Line compact (36), Done; Width: hug, block; State: default, pressed, disabled (aria-disabled, with its hint); On dark | One Ray moment per view; on dark the secondary is a Cream line |
| Icon button | Close, Back, Info; on light, on Forest, on a sheet | 44px hit area, drawn smaller |
| Text link | Default, with chevron | `.ap-link` |
| Choice chip | Off, On (check), Flag (Teal edge), Single (radio), Multi | `.ap-ch`; symptoms, BM extras, durations, tags |
| Option row | Off, On (check), with glyph and line (onboarding's form picker), "Could be either" | `.ap-ck-opt`; check-in and onboarding answers |
| Segmented control / range tabs | 2 to 3 segments; picked; locked segment (Free) | `.ap-seg`, `.ap-seg--range` |
| Switch row | Off, On | Profile, onboarding's Larger text, Ask's reach |
| Field | Select (day), Time, Text, Textarea (note), Search-like; empty, filled, focus | 16px corners, 16px text (no iOS zoom) |
| When row | Day select + time | Every log form |
| Form tiles | Consistency A (7, numbered), B (5 words), C (7 words); On the plus card (on Forest) or in the form; Picked; "Could be either" (B); Pressed | `RU.formTiles`; 44px each, 40 under 380 wide |
| Week day chips | Sun to Sat, one picked | When it's due |
| Toast | Message; Message + Undo; Message + action + Undo (Add details); on dark it inverts | `.ap-tst`; Undo holds while touched or focused |
| Tab bar | Standard: Today, Insights, +, History, Ask (Ask with the token), current tab; Easy: Today, Add, History, Ask with words | Floating pill, 24px from the bottom |
| Status bar, home indicator | Light, dark | Device chrome, for the frames only |

### 4.3 Cards and Home pieces

| Component | Variants and states |
|---|---|
| Card | Standard; with head (title, kicker, link); Forest hero |
| FloraScore strip (Compact) | Member, Free (chevron to the paywall); 12 weeks, learning (Day 5 of 14 over 14 steps), no score (`L.NO_SCORE`), flagged ("Not read against your usual today", no bar); "· Today" while another day is picked |
| Week row (Compact) | This week, an earlier week (Today button), legend folded or open, the Free line under the row, arrows disabled at the ends |
| Day panel | Today, a past day, a gap (Add), a flagged day; its why line; Add at the top |
| Entry row | Kind: BM, Symptom, Meal (quick day, one meal), No BM, Note; Layout: one line (Compact) or two (History, Score first); Flag edge (Teal); tappable to edit |
| Check-in row (Compact) | Due (Start, Skip), answered in part |
| Teal note | On Compact (a button to the flag sheet), on Score first's hero; sign named |
| Primary care note | "When to see a clinician" kicker, the sign in bold, the line, the urgent line; in a sheet, on an onboarding step, in Ask |
| Next step card, Info line | |
| FloraScore hero, Week card, Day first chip | Alternatives (section 7) |

### 4.4 Sheets and overlays

| Component | Variants and states |
|---|---|
| Sheet | Grab handle, title, close; short (plus, earlier, guide, flag, No BM, when it's due, paywall, Profile's sheets) |
| Full sheet | Close, title, sub-title, scrolling body, footer (hint + Save) (Log a BM, symptoms, meals) |
| Full screen | Back or close, title, step counter, Later or Skip, progress (check-in, onboarding, Profile, Easy BM) |
| Plus menu sections | BM block (tiles that save, tiles that open the form, or one Log a BM row); Symptoms and What you ate (or Meal) tiles; check-in row (due with dot, done, skipped); Log for an earlier day; Log no BM today (after 5 PM); for an earlier day: the Catching up line, Back to today |
| Scrim | Light, dark |

### 4.5 Logging pieces

Symptom picker (6 + your own, Something else with a field and Add), strength (Mild, Moderate, Strong), how long, when it
started; BM details (How it went, How long, Noticed any of these with the info line); the mic button (idle, listening with
a pulse, done; no pulse under reduced motion); What you said field with Foods counted chips (food, count in 90 days);
meal type chips; the photo card (in progress); Earlier day rows (with a Gap chip); No BM sheet.

### 4.6 History pieces

Calendar month (month nav, the month's summary line, weekday row, day cells as Day marks, the legend, the Free line);
filter chips (All, BMs, Symptoms, Meals, Notes); the report row; the day panel under it.

### 4.7 Check-in pieces

Progress (4 steps), question header (week span, Later), answer rows, Next, tags, note, Finish; the result: Your logs this
week box, a strip per question (steps in the answers' own words, the first weeks as a band, latest week ringed) with
its chip (About the same in Plum, More or Fewer than at first in Gold).

### 4.8 Ask Florin pieces

| Component | Variants and states |
|---|---|
| Ask header | Title, What Ask Florin knows button, New chat (after a first question) |
| Opening read | The 7-day chart card, two sentences in Lora, "Where do you want to start?" |
| Question chips | To start, to ask next |
| User bubble | |
| Turn | Token + "Looked at N things in your logs" (folded, open with its lines); Florin journal source row; reply in Lora; one bold question; options (up to three rows, about one turn in three); thumbs (none, up, down) with the fine print; States: thinking, streaming (Stop), done |
| Redirect turn | Its own options, no source |
| Alarm turn | Teal banner (3px Teal edge, "When to see a clinician", the sign, one line), primary care, urgent line, report line, bold question, Make a report (Forest pill); no source, no options |
| Composer | Empty (send disabled), typed, busy (Stop); docked over the tab bar |
| What Ask Florin knows | Every answer reads (rows), Leave out / Put back rows, Let Ask Florin start a conversation (switch), undo toast |
| Free lock | The tab's membership card, What people ask with locks |
| **Ask about this** | **B, Compact, locked Nov 8** (Will: "let's do B for the ask buttons"; `options/ask/`, DESIGN.md "Ask Florin"): the one component, a 32px Ray pill in the card's corner with the token and Ask, on a 48px target, its card in its accessible name, a lock in the token on Free; Easy a step larger (48px, 18px words). States: Member, Free; light, dark, on the dark FloraScore card; pressed, focus. The other five (A Pill, C Link, D Token, E Question, F Bar) go on the Reference page as screenshots only, never as variants |

### 4.9 Onboarding and Profile pieces

Step header (close or back, title, Step n of N, Skip), progress, step bodies (welcome list, name field, single rows,
multi chips, reminder chips and time, check-in day and time, the form picker with "It varies", what Florin is and isn't,
ready), the primary care note on a step, the Larger text switch, the ready footer (Log your first BM, Go to Today).
Profile: the identity card, Your usual rows (and the learning card on day 1), section heads, setting rows (value,
chevron), switch rows, the Logging chips, the membership row, sheets (BM reminder, connected apps and help, delete,
asked first).

### 4.10 Easy version pieces

Easy tab bar; the greeting and sentence; the Easy FloraScore card; the three big buttons (I had a BM, Something feels off,
What I ate); the Easy week (day circles at 32px with a line per day outside); big option rows; the step header (Back or
Close, Step n of 4, progress); review rows with Change; Your weeks cards (the Easy read look); Ask about this a step
larger. In Figma the shared controls take Easy sizes from a **Scale** variable mode (section 9.2); Easy's own screens are
their own frames.

### 4.11 Membership pieces

The paywall sheet (Forest hero with the FloraScore ring glyph, the title by entry point, the five rows, "Membership price
set at launch", Start membership, Not now, the disclaimer); the lock (in the Ask token, on a range tab, on a row); the
teaser (the person's own counts, blurred, never made-up content); the "with Florin membership" line under a week or
month with days held on Free.

---

## 5. The flows

Notes that apply to every flow are in section 6 (keyboard, screen reader, motion, empty, loading, error). Each flow
below names only what is its own.

### 5.1 Home (Compact)

**Entry:** app open, the Today tab, Home: Compact. **Exits:** the strip's number to FloraScore's detail (Insights, later;
the paywall on Free); Insights; a day to History's calendar (the month); the avatar to Profile; plus; a log row to edit;
the Teal note to the flag sheet; the check-in row to the check-in.

**Steps (the everyday path):** open, read the strip (number, the week's change in one sentence, the usual range bar),
glance at the week (a ring a day), tap a day to see its logs, Add to it, or tap plus. Swipe or arrows for another week;
Today comes back.

**Toasts and undo:** check-in skipped ("Skipped for this week. It's still in the plus menu if you change your mind.",
Undo); a log saved to another day moves the pick there.

| Screen | States captured | Plan | Notes |
|---|---|---|---|
| Today, Compact (`home/today`) | 12 weeks, day 5, day 0; flagged today (blood); alarm word in a note; the flag sheet from the Teal note; no score; a past day picked; a gap picked (+ Add); a day with 5 BMs, two weeks back; last week (Today button); legend open; check-in skipped (toast); check-in Off | Member and Free for the base, flagged, flag sheet, no score, last week; Free: the strip opens the paywall (See what moves your FloraScore); the Free line under a week with held days | Light and dark for every state |
| Avatar to Profile (`home/avatar`) | | | |
| Score first, Day first (`home/score-first`, `home/day-first`) | 12 weeks, day 5, flagged | Member | **Alternatives**, until Home is locked |

Day 0 shows the BM tiles where the day's logs go; after 5 PM, No BM today too. On a flagged today the strip keeps its
number and says "Not read against your usual today", with no bar.

### 5.2 Logging

**Entry:** plus (the tab bar), + Add on a day, Add to this day (History), a tile on Today with nothing logged, Log your
first BM (onboarding), I had a BM (Easy). **Exits:** save (back where it started, toast), close (a half-filled log is
kept: "Not saved yet. This BM will be here when you open it again."), Undo.

**Steps:**
1. **A BM, quick (recommended):** plus, tap a tile: saved at once ("BM saved. Formed at 7:40 PM.", Add details, Undo).
   Before 5 BMs are logged, a tile opens the form with it picked instead. Recommended, not built: time buttons in the
   toast (Just now, 30 min ago, 1 hr ago, Earlier).
2. **A BM, the form:** When (today, a time), Consistency (tiles, How to pick), Details all optional (How it went, How
   long, Noticed any of these), a note, Save BM. Ticking blood, mucus or black shows the info line; saving shows the
   flag sheet (When to see a clinician, Make a report, Done). A sign in the note does the same.
3. **Symptoms:** pick any (or add your own), how strong at its worst, how long, when it started, a note, Save symptoms.
4. **What you ate (Quick, recommended):** the mic (say the day) or the box, Florin counts the foods as you type, Add a
   photo (in progress), when, Save what you ate. **One meal at a time (alternative):** meal type, what, time.
5. **No BM today:** from 5 PM, Log no BM today: logged at once, toast with Undo; the row opens a sheet (Log a BM
   instead, Take it back).
6. **An earlier day:** Log for an earlier day, Which day (the last week, gaps marked), then plus for that day (Catching
   up), then any log.
7. **Edit and delete:** tap a row: the same form with Save changes and Delete; Deleted, with Undo.

**Toasts:** BM saved (Add details, Undo); Saved (edit); Symptoms saved; Saved what you ate (N foods counted); Breakfast
saved; Logged: no BM today; Deleted; Not saved yet; Undone.

| Screen | States captured | Notes |
|---|---|---|
| Plus (`logging/plus`) | 12 weeks, day 5, day 0; Full form only; One meal at a time; check-in Off; Consistency A; B; Free (same as Member) | Check-in row: due with a dot, done, skipped |
| One-tap save (`logging/quick-save`) | Saved toast; Undone; before 5 BMs a tile opens the form | |
| Log a BM (`logging/bm`) | 12 weeks, day 0; a tile picked; details filled; blood ticked; A tiles; B tiles; How to pick; saved; closed half filled; edit; deleted | Save is aria-disabled with its hint until a tile is picked |
| After a flagged log (`logging/flag`) | Blood ticked; an alarm word in the note; Make a report (Member: Ask's clinician answer; Free: the paywall) | Member and Free |
| No BM (`logging/nobm`) | Offered (day 0, after 5 PM); logged; the sheet | |
| An earlier day (`logging/earlier`) | 12 weeks, day 0 ("You started today"); plus for a gap day; Log a BM for that day | |
| Symptoms (`logging/sym`) | Seeded (Bloating, Moderate, A few hours); empty; your own; a sign in the note; saved | |
| What you ate (`logging/meal`) | Empty; typed (foods counted); said (mic done); saved | The mic's listening state is animated and isn't caught under reduced motion: draw it from the prototype (the mic pulses, "Listening") |
| Meal, one at a time (`logging/meal-one`) | Empty; typed | Alternative |
| From a photo (`logging/meal-photo`) | Member; Free | **In progress in another session**: shot as it stood on Nov 7, shoot again |

### 5.3 History

**Entry:** the History tab; the month on Compact. **Exits:** a day's row to edit; Add to this day (plus for that day);
the report row (Member: a toast, the report isn't built; Free: the paywall); filters.

**Steps:** the month, each day a mark; tap a day: its logs and why line under the month; arrows for other months; filter.

| Screen | States captured | Notes |
|---|---|---|
| Calendar (`history/calendar`) | 12 weeks, day 5, day 0; a day tapped; a gap tapped (Add to this day); September; a day with 5 BMs; Free: a day before the last 7 is only logged; filter BMs; a flagged today; the report row | Member and Free for the base; on Free the calendar reads only the last 7 days ("Every day against your usual, with Florin membership") |
| List (`history/list`) | 12 weeks | **Alternative** |

### 5.4 Weekly check-in

**Entry:** the row on Today when due (Sunday evening by default), the plus menu every week (a dot when due), the
reminder. **Exits:** Finish (the result), Later (keeps answers), Skip (toast with Undo; stays in plus), back.

**Steps:** four one-tap questions (belly pain; days it got in the way; bloating; how settled), each auto-advancing, then
an optional line (tags: Travel, Stress, Short nights, Eating out, Feeling unwell, Period) and a note, Finish; the result
compares each answer with the first three check-ins (About the same, More, Fewer than at first). No score.

| Screen | States captured | Notes |
|---|---|---|
| Due on Today (`checkin/card`) | 12 weeks, day 0; Score first's card (alternative) | Member and Free (the check-in is free) |
| Questions 1 to 4 (`checkin/q1` to `q4`) | Each; an answer picked | |
| Anything else (`checkin/extra`) | Empty; tags picked | |
| Saved (`checkin/saved`) | 12 weeks | Member and Free |
| When it's due (`checkin/due-day`) | Sunday evening | Saved: "From next week it's due ..." |
| The first one (`checkin/first`) | Day 0 | "See your answers" until three are in |

Off (decision 5) takes it out of every screen: Today, plus, Insights, History's report, the paywall's free list,
onboarding's reminders step and Profile's reminders.

### 5.5 Ask Florin

**Entry:** the Ask tab (the token); Ask about this on a card (with the card's chart and first question loaded); Make a
report on the flag sheet (the clinician path); New chat. **Exits:** the tab bar; What Ask Florin knows (sheet); Make a
report (the report isn't built yet).

**Steps:** the opening read (a chart of the last 7 days and two sentences), questions to start; ask; each turn: Looked at
N things (folded), one Florin journal line, the reply, one bold question; "yes" asks it, "no" gets a short reply;
options on the first answer and then about every third; thumbs. A question that names a sign gets the Teal clinician
answer first and is never sent anywhere; a request to diagnose, dose or predict gets a fixed redirect.

**Toasts:** Today's logs left out of this chat (Undo); Put back.

| Screen | States captured | Notes |
|---|---|---|
| The Ask tab (`ask/opening`) | 12 weeks, day 5, day 0 | Member; Free is the lock |
| A conversation (`ask/turn`) | One turn; Looked at, opened; a second turn ("yes"); an option tapped; thumbs up; a redirect ("Do I have IBS?"); learning | Thinking and streaming (Stop) are animated: draw from the prototype |
| A sign (`ask/alarm`) | The alarm turn; scrolled to Make a report | |
| From the flag sheet (`ask/from-flag`) | Member: the clinician answer; Free: the paywall (Bring your logs to a clinician) | |
| From a card (`ask/card`) | Timing loaded | The card's chart is Insights': its look settles with the rebuild |
| What Ask Florin knows (`ask/knows`) | Default; today's logs left out; start a conversation on | |
| Free (`ask/free`) | 12 weeks, day 0 | The lock; decision "Ask Florin on Free" (section 7) may change it to one answer a week |
| Ask about this | B, Compact (locked Nov 8) on every card and detail page | The other five styles on the Reference page only |

### 5.6 Onboarding

**Entry:** first launch. **Exits:** Ready: Log your first BM (the BM form), or Go to Today (day 1 of 14). Every step can
be skipped; Close at Welcome.

**Short (recommended), 8 steps:** welcome (with Larger text and simpler screens), first name, what brings you, what you'd
like Florin to do, periods, reminders (BM reminder; check-in day and time), what Florin is and isn't, ready.
**Full survey (alternative), 14 steps:** welcome, first name, about you, what brings you, goals, most often lately,
symptoms now (blood or a black stool shows the primary care note on the step), eating, stress and sleep, foods to watch,
medicines, conditions, research, ready.

| Screen | States captured |
|---|---|
| Short (`onboarding/short`) | Each of the 8 steps, light and dark; Welcome with Larger text on |
| Full survey (`onboarding/full`) | Each of the 14 steps (alternative) |
| A sign on the step (`onboarding/sign`) | The primary care note |

### 5.7 Profile and settings

**Entry:** the avatar on Today. **Exits:** back; a row to its sheet or step.

Profile holds: the person (logging since), Your usual (window, how often, forms, FloraScore range, each "set from your
logs"), About you (every set-up answer, each reopens its step with Save, Clear my answer, Cancel), Reminders (BM reminder,
check-in day), Logging (BM logging and the meal sheet as the person's own setting), Display (Larger text and simpler
screens, theme), Connected apps (Apple Health, Oura, a cycle app: Not connected), Membership, Your data (export, research
sharing, delete my logs, delete my account, both asked first), Help.

| Screen | States captured |
|---|---|
| Profile (`profile/profile`) | 12 weeks, day 0; Profile on day 1; Member and Free |
| BM reminder (`profile/reminder`) | |
| An answer reopened (`profile/answer`) | |
| Connected apps and help (`profile/info`) | |
| Delete my logs, Delete my account (`profile/delete-*`) | |
| Easy view settings (`profile/easy-settings`) | Easy off, Easy on. **In progress in another session** (Will: "Page for 'easy view' settings?"): a preview, Larger text and simpler screens, Text size (Large, Larger), Fewer cards on Today, Start listening when What I ate opens, Less motion. Shot as it stood on Nov 7. Its Less motion row reads "Your phone already asks for less motion" in the captures, since they run with reduced motion on |

### 5.8 Easy version

Recommended as a setting anyone can turn on ("Larger text and simpler screens"), Standard the default. Type about a third
larger, every control 56px or more with its word on it, text in Ink.

**Entry:** the setting (Profile, onboarding). **Exits:** the same setting. **Steps (a BM):** I had a BM, what did it look
like (a pick moves on by itself after 400ms; Back undoes it), when (Just now, Earlier today, Yesterday, then the hour),
anything else (sudden urge, blood, mucus, black), check and Save (Change beside each answer).

| Screen | States captured |
|---|---|
| Today (`easy/today`) | 12 weeks, day 5, day 0; flagged today (the Teal note leads); Member and Free |
| Add (`easy/plus`) | |
| A BM (`easy/bm`) | Step 1, 2, 3, 4 |
| Something feels off (`easy/sym`), What I ate (`easy/meal`) | |
| History (`easy/history`), Ask (`easy/ask`) | Member and Free |
| Your weeks (`easy/weeks`) | Member and Free (Insights folded under Today; its cards may follow the Insights rebuild) |

### 5.9 Membership

**Free keeps:** logging, Today, FloraScore, the weekly check-in, History (read for the last 7 days) and 7 days of Insights.
**Membership adds:** why the score moved, 30 and 90 days, every detail page, possible patterns and the food check's
results, Ask Florin, the clinician report. Teasers blur the person's own counts; never made-up content.

**Entry points to the paywall and its title:** FloraScore's detail (See what moves your FloraScore); a 30 or 90 day tab
(See 30 and 90 days); patterns (See your possible patterns); Ask (Ask Florin about your own numbers); a report (Bring your
logs to a clinician); the food check (Run a 14-day food check); otherwise See the detail behind every card. **Exits:** Not
now; Start membership (in the demo, a toast: "Membership is on in this demo.").

| Screen | States captured |
|---|---|
| The paywall (`membership/paywall`) | Default; from score, range, patterns, Ask, report |
| Started (`membership/started`) | The toast |
| Free across the app | In each flow above: Home's strip, History's held days, Ask's lock, Make a report, Your weeks |

### 5.10 Insights, after the rebuild

Listed so the file has its place; **built last**, after the rebuild running now (Insights cards, detail pages, Ask button
styles). The inventory already holds it (`--all` shoots it): Insights at 7, 30 and 90 days, Will's picks, a flagged
today, meals only with symptoms (patterns held back, the food check); the detail pages FloraScore, Your days, Timing, How
often, Form, Symptoms, Check-in trend, Possible patterns, One pattern, each at 7, 30, 90 days and while learning;
Insights on Free (7 days, teasers blurred); Data style: Insights and Today. About 13 screens and 72 captures.

---

## 6. States that cut across every flow

**Data.** 12 weeks (a usual, a score), day 5 (learning: "Day 5 of 14", days drawn as Logged, no comparisons, form opens
for the first 5 BMs), day 0 (just joined: nothing logged, the tiles on Today, no earlier day, the first check-in).

**A flagged today** (a flag or an alarm feature in today's logs): read against nothing anywhere. The score keeps its
number with "Not read against your usual today"; the day is a Teal ring in no count; every card says "Today has a log
noted for a clinician, so it isn't read against your usual."; Compact puts the Teal note under the strip (a button to
the flag sheet).

**An alarm word in a note** (one net, `L.alarmsIn`): a BM's own note treats the BM as the stool ("It looked like tar",
"some red in it"), "after black coffee" stays quiet. Opens the same primary care note.

**No score:** "It needs a BM, or No BM, logged on 2 of your last 3 days." No bar.

**Plan:** section 5.9. **Theme:** one design, the variables' Dark mode. **Easy:** section 5.8.

**Keyboard and screen reader (every screen):**
- Every target 44 by 44 at least (Easy 56 to 64); the Teal focus ring (Ray on Forest).
- A new screen focuses its heading (so a screen reader lands there); the ring isn't drawn for that programmatic focus.
- Sheets are dialogs: focus moves in, Tab stays in, Escape and a drag down close, focus returns to what opened it; the
  screen and tab bar behind are inert.
- Toasts are a polite live region; an Undo toast waits while it is touched or focused.
- Compact's week and the calendar are tab lists with manual activation (arrows, Home, End, Page Up and Down move; Enter
  or Space picks); each day's name carries its reading ("Wednesday, October 7: outside your usual, first BM later than
  usual").
- Every chart has a table twin; colour is never the only cue.
- Save stays focusable when it can't save yet, with its hint read out (aria-disabled and describedby).
- Reduced motion: no ring fill, no bars growing, no mic pulse, no count-up.

**Empty:** day 0 on every screen (captured). **Loading:** the prototype computes everything on the phone, so its only
waits are Ask's thinking and streaming (with Stop), the mic, and the photo log (in progress). **Error:** Ask falls back
to the answer computed from the logs when Claude fails its checks or isn't there, noted quietly. **Not designed yet, for
the developer to raise:** first launch with no network, sync, a failed save, an expired membership, app store purchase
flows, notifications themselves (the reminder and the check-in), and the clinician report.

**390 wide:** every frame. The prototype is checked at 360 for wrapping (tiles step their word down under 380).

---

## 7. Decisions, and what waits on which

Will answered on Nov 7. The calls below are locked on our recommendations, except Data style, which his answer didn't
name (Insights is being rebuilt; ask again when it lands).

| # | Decision | Options | Locked as | Locked | Screens it changes |
|---|---|---|---|---|---|
| 1 | Consistency | A 1 to 7 (licence); B five words; C seven words | C, our seven words, pending counsel's read; B dropped, A out | Locked Nov 7 | BM tiles (plus, the form, How to pick, Easy step 1, onboarding's form step), every BM row's word, Profile's words, Insights' Form |
| 2 | BM logging | Quick tiles and form; Full form only | Quick tiles and form, with time buttons on "BM saved" (Just now, 30 min ago, 1 hr ago, Earlier; not built on the prototype yet) | Locked Nov 7 | Plus menu's BM block, the one-tap toast, Today's tiles on an empty day, Easy's Add, Profile's Logging |
| 3 | Home | Score first; Day first; Compact | Compact | Locked Nov 7 | The whole Today tab: the strip, the week row, the day picked |
| 4 | History | List; Calendar | Calendar | Locked Nov 7 | The History tab, Compact's month link |
| 5 | Weekly check-in | On; Off | On, free on both plans | Locked Nov 7 | Today's row, plus, the check-in flow, Insights' card, History's report, the paywall's free list, onboarding's reminders, Profile |
| 6 | Meal sheet | Quick, voice or text; One meal at a time | Quick (with the photo log, in for v1) | Locked Nov 7 | Plus's meal row, the meal sheet, the photo log, Profile's Logging |
| 7 | Data style | Florin charts, Will's picks, Rings, Field journal, Bento, Oura, Easy read | We recommend Florin charts everywhere, Easy read only in Easy | Not yet (not named on Nov 7; Insights is being rebuilt) | Insights' cards (built last) |
| 8 | Version | Standard; Easy | Easy as a setting anyone can turn on (with the Easy view settings page, in for v1) | Locked Nov 7 | Every Easy screen, Profile's Display, onboarding's Welcome and Ready, the Easy settings page |
| 9 | Onboarding | Short; Full survey | Short | Locked Nov 7 | The onboarding flow, Profile's About you |
| 10 | Ask Florin on Free | Members only (built); one free answer a week | One answer a week; questions about seeing a doctor always answered (the prototype still shows the lock) | Locked Nov 7 | Ask on Free, Make a report on Free, the paywall's Ask entry |

**Still open, drawn as they stand:**
- **The day mark.** Both are drawn as the app has them now: section 1's day mark (`RU.dayMark`) for the calendar, History
  and Your days, and the Rings ring for Today's week card and Compact's week. The note on both components names the open
  call.
- **The developer's platform** is unknown; the variables carry the `--ap-*` CSS names as their code syntax for now.

**Alternatives** (Score first, Day first, History list, Full survey, One meal at a time, Consistency A and B, Full form
only, and Ask about this A and C to F) go on the Reference page only, as screenshots from the captures, not as built
frames. Ask about this is B, Compact (Will, Nov 8: "let's do B for the ask buttons"): one component, no style axis.

**Ask on Free, as locked, isn't on the prototype yet** (it still shows the lock). The Figma frames draw the locked
behaviour: the Ask tab on Free with one answer a week (the count left, then the lock with the paywall), and a question
about seeing a doctor answered on any plan.

## 8. The capture tool

`handoff/capture.js` (Playwright, the prototype's own `_local.html`) shoots every screen x state x plan x theme in
`handoff/inventory.js` at **390 by 844, deviceScaleFactor 2** (the phone's screen inside the device frame, status bar
and home indicator included, square corners). It drives the page the way `work/shots.js` and `work/sweep.js` do: the
left bar's own buttons for the decisions and demo controls (so the page and phone agree), the Screens rows, and
`window.FLORIN_EXT.api` for the rest (`open`, `act`, `push`, `L.add` for a flagged log). Reduced motion is on, every
capture starts from Reset (a fresh model), and a focused heading is blurred so no programmatic focus ring shows.

```
NODE_PATH=$(npm root -g) node handoff/capture.js <out-dir> [--flows home,logging] [--only today,plus] [--all]
    [--rows] [--tall] [--dom] [--embed-fonts] [--workers 3] [--limit 20] [--list]
```

It writes, under `<out-dir>`:

- `<flow>/<screen>/<state>--<plan>--<theme>.png`, the 390 by 844 frame; `--tall` adds `...--tall.png`, the screen grown
  to its whole scroll length.
- `--dom` adds `...html`: the screen's DOM with every element's computed style inlined (inherited values only where they
  change; colours resolved to rgb()), pseudo-elements as spans, each element's box as `data-x/y/w/h`, and the fonts from
  `<out-dir>/fonts/` (or embedded with `--embed-fonts`). Rendered back at 390 wide it matches the screenshot to within a
  word's wrap. It is the measured reference for the Figma build: exact sizes, gaps, colours and the charts' SVG.
- `index.json` (one row per capture: flow, screen, state, plan, theme, file, tall, dom, the screen key the phone
  reported, any error and console output), `tokens.json` (every `--ap-*` token and the brand tokens resolved to hex in
  light and dark, normal and Easy), `type.json` (every text style the screens use, with counts and classes),
  `errors.json`.

**The Nov 7 run** (Phase 1 flows, not Insights): `--flows home,logging,history,checkin,ask,onboarding,membership,profile,easy --tall --dom --rows`.
**347 captures, 52 screens, 169 screen states, 9 flows,** 237 full-length frames and 347 DOM dumps, in about two
minutes on 4 pages. **None failed and none logged a console error,** while four other sessions were editing the
prototype. Along the way `--rows` found the photo meal log's two rows and the Easy view settings page as they landed
(now in the inventory, marked in progress). With Insights (`--all`): 65 screens and 419 captures. Output (197 MB):
`/tmp/claude-0/-home-user-florin-app-mvp-v0/8c9716d2-58e6-5835-9170-e12c1e677800/scratchpad/p8/handoff/`

Known gaps in the captures: animated states (the mic listening, Ask thinking and streaming, the ring filling) aren't
caught under reduced motion and are drawn from the prototype; the Ask button's six styles wait on Will's pick (listed as
pending); the photo log and the Easy settings page are in progress. **Rerun at the end of Phase 2's input freeze**, once the other sessions land, with the same command.

---

## 9. The Figma build plan

Read for this plan: the Figma skills `figma-use`, `figma-generate-library` (with its token, component and documentation
references), `figma-generate-design`, `figma-create-new-file`, `figma-code-workflows` and `figma-spec`. The account:
Will Africano, **Undone-US** (team, Professional tier, Full seat, admin; Specs and Code Layers enabled). Nothing has been
written to Figma.

### 9.1 The file's pages

| Page | Holds |
|---|---|
| Cover | Florin app, handoff v1, the date, what's locked |
| Read me | An embedded Figma spec (Specs is on for this plan): how to read the file, the decision table (section 7) with its lock status, links to the prototype, the docs and the captures, the rules a developer must keep (computed numbers, alarm net, claims check, no medical claims) |
| Brand | Variables documented: brand and app colour swatches bound to the variables in both modes, the contrast table, type specimens, spacing and radius, elevation, the marks, icons and glyphs, the logo, the copy rules and licensing |
| --- Components --- | Separator |
| Components: Atoms and marks | 4.1 |
| Components: Controls | 4.2 |
| Components: Cards, Home and History | 4.3, 4.6 |
| Components: Sheets and logging | 4.4, 4.5, 4.7 |
| Components: Ask, onboarding, Profile, Easy, membership | 4.8 to 4.11 |
| --- Flows --- | Separator |
| 1 Home | 5.1 |
| 2 Logging | 5.2 |
| 3 History | 5.3 |
| 4 Weekly check-in | 5.4 |
| 5 Ask Florin | 5.5 |
| 6 Onboarding | 5.6 |
| 7 Profile and settings | 5.7 |
| 8 Easy version | 5.8 |
| 9 Membership | 5.9 |
| 10 Insights (after the rebuild) | A placeholder frame until then |
| --- Reference --- | Separator |
| Reference | The alternatives as screenshots only (Score first, Day first, History list, Full survey, One meal at a time, Consistency A and B tiles, Full form only, Ask about this A and C to F from `options/ask/`), and the captures as a reference column per flow (light, Member, base states), clearly labelled as reference |

**A flow page** is a row of Figma sections, one per screen, in the flow's order. Inside a section: the steps strip (the
screens in tap order with a numbered label for each tap), then the state grid (columns are states; rows are Light, Dark,
and Free where it differs), then a notes frame (entry, exits, toasts, the keyboard and screen reader notes from section
6, open questions). Frames are 390 by 844; a screen longer than that gets a full-length frame with a hairline at 844
marking the fold.

### 9.2 Foundations as variables

Following `figma-generate-library`'s standard pattern, with the prototype's CSS names as WEB code syntax so Dev Mode shows
`var(--ap-ink2)`, not a hex:

| Collection | Modes | Holds | Scopes |
|---|---|---|---|
| Brand | Value | Forest, Cream, Ray, Plum, Teal, Gold, and the studio tints (Forest 50, Plum 50, Teal 50) | Hidden (primitives) |
| App colour | **Light, Dark** | About 45 roles from section 3.1: ground, card, card 2, ink 1 to 3, line, grid, usual (mark, band, band edge, chip, ink), shift (mark, ink, chip, day edge, chart edge), context (mark, tint, ink), reading, hero and hero ink, accent and on-accent, avatar, check-in heat 0 to 3, Ask edge, scrim | Fills, text, strokes as fits each role; aliases to Brand where exact, resolved values elsewhere with the CSS formula in the description |
| Space | Value | 4 to 120, plus screen side 20, stack 16, top 56, bottom 120 | Gap (padding and gap) |
| Radius | Value | xs 2 to 3xl 32, full | Corner radius |
| Scale | **Standard, Easy** | Control heights (44, 36, 32, 20 and their Easy steps), tap target 44 and 56, icon sizes, the shared type sizes | Width and height, font size |

Text styles (section 3.2, about 34) and effect styles (card light, card dark, tab bar, plus, toast) complete the
foundations. A frame set to Dark mode redraws every bound fill; a frame set to Easy on Scale grows every shared control.
The Professional plan allows four modes a collection, enough for both pairs.

### 9.3 Components as component sets

Built in dependency order: icons and glyphs (from their SVG source, one instance-swap property), then atoms (marks,
chips, kicker, token), then controls (buttons, fields, tiles, chips, rows, toast, tab bar), then composites (strip, week
row, day panel, entry row, sheets, the turn, the paywall, step headers). Every fill, stroke, padding, gap and corner is
bound to a variable; text uses a text style; variants follow `Property=Value` names (State, Kind, Plan, Size), at most 30
a set (the week ring splits into its states by Size); TEXT properties for every label; descriptions on every set with
its rules (for example the week ring: "A ring means a day's reading against the person's own usual. Never a grade.").

Charts and the larger data drawings (the opening read's chart, the check-in strips, the FloraScore range bar) come in as
vectors from the DOM dumps' SVG (`createNodeFromSvg`), then a script rebinds each resolved colour to its variable, so
they follow the mode too. Each chart becomes a component with the person's numbers as an example; the developer draws
them from data.

### 9.4 Screens from components

Each screen is a 390 frame with auto-layout sections (status bar, scroll content, tab bar or sheet), built from component
instances with their text set through component properties, **native editable layers only**: no screenshot inside a
deliverable frame (the screenshots live on the Prototype captures page, as reference). Each screen is built once in
Light; its Dark twin is a duplicate with the App colour mode set to Dark; Free is a duplicate with the plan variants
swapped. Every frame is checked against its capture (one screenshot per flow page section, then one after any fix), and
its fonts are asserted to be DM Sans, Lora and Space Mono, not a fallback. Text that the app computes is named
`{computed}` in the layer name, with the rule in the notes frame.

### 9.5 The order of work

1. Create the file where Will says; a session; the pages; the Cover and Read me.
2. Foundations: the five collections, text and effect styles; validate counts, modes, aliases, scopes and code syntax.
3. Brand page.
4. Icons and glyphs, then atoms, controls, composites; a screenshot per component family.
5. Flows, in the order agreed on Nov 7: Home, History, Weekly check-in, Ask Florin, Onboarding, Membership; then
   Logging and Profile with the Easy view settings once the photo log and Easy settings land; Easy; Insights last. The
   meal-photo and Easy-settings components, and Insights' card components, wait for the same. Each flow's captures are
   rerun right before it is built.
6. The Reference page (alternatives and captures, as screenshots).
7. Insights, after its rebuild, with a fresh capture run.
8. QA: every fill and text bound (an audit script lists raw values), naming, descriptions, a contrast spot check of the
   faintest pairs, the copy rules over every text node (no em dashes, no medical words), and a final screenshot of each
   page.

A state ledger on disk (`handoff/figma-state.json`: page, collection, variable, style and component IDs, the last step
done) carries the build across sessions, as the library skill asks.

### 9.6 The estimate

| Stage | use_figma calls | Agent time |
|---|---|---|
| File, pages, Cover, Read me spec | 6 | 0.5 h |
| Foundations (variables, text and effect styles, checks) | 10 | 1 to 1.5 h |
| Brand page | 8 | 1 h |
| Icons, glyphs and the ~40 component sets (about 3 calls a set, with a screenshot each) | 120 to 140 | 6 to 8 h |
| Nine flow pages: about 170 distinct frames, then dark and Free twins, notes | 120 to 150 | 8 to 11 h |
| Alternatives, captures page (upload_assets, 60 images a call), QA | 25 | 2 h |
| **Phase 1 flows total** | **about 290 to 340** | **about 19 to 24 hours over 3 to 5 sessions** |
| Insights after its rebuild | 50 to 70 | 4 to 6 h |

Honest caveats: the estimate assumes the decisions are locked first (a changed Home redraws a page's worth of frames), and
that most calls succeed first time; component sets with many variants (the week ring, the form tiles, the turn) take
more calls than the average. Writes run one at a time, so the calls set the pace, not the rate limit.

### 9.7 Limits found

- **Writes are sequential**, the page is switched at most once a call, and a script is at most 50,000 characters, so a
  long screen is built in two or three calls.
- **No image fetch inside a script** (`createImageAsync` isn't supported). Screenshots go in through `upload_assets` (60
  a call, 10 MB each) and only as reference.
- **No HTML import in this session.** The tools offered here don't include `html_to_figma` or `generate_figma_design`, so
  the DOM dumps aren't imported directly: they are the measured reference the component build follows. If Will's
  connector later offers an HTML import, a dump could seed a reference layer, never a deliverable.
- **Colour functions don't exist in Figma** (section 3.1): derived roles are resolved values per mode, regenerated from
  `tokens.json` when the brand moves.
- **Modes:** four a collection on Professional: Light and Dark, Standard and Easy fit; nothing more on either.
- **Fonts:** the Plugin API sets a family and style; whether DM Sans's optical size follows the font size in this Figma
  account is checked with `listAvailableFontsAsync` before the first text style, and noted if display sizes draw loose.
- **Behaviour doesn't travel in Figma:** one-tap save after 5 BMs, the alarm net, FloraScore and every count, the
  pattern test, auto-advance, focus order. The prototype and `prototype/js/refresh-data.js` stay the behaviour spec, and
  the notes frames point to them.
- **Rate limits:** a Full seat on a Professional team gets per-minute limits (Figma's page,
  https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/). This cloud session can't reach that host
  (developers.figma.com isn't in its allowed network), so the exact numbers aren't read yet; until they are, the build
  runs one write at a time and backs off on the first rate-limit answer (calling `whoami`, as the tool asks).
- **The account:** the connector is signed in as will@itsundone.com (Undone-US). The brief (Oct 12) says the studio's
  Florin Figma files (Florin, Product, Decks) belong to will@snifr.ai, which this connector can't open, so the build can't
  reuse the studio's Figma library and makes its own foundations from the prototype; if the file belongs with the
  studio's, the connector needs that account.

---

## 10. What we need from Will

1. **Where the file goes.** Will picked https://www.figma.com/design/rGN6vIjAJpWoJdcRp3iZXk (Nov 7), but the connector
   (will@itsundone.com) has no edit access to it: `create_session` and `get_metadata` both answer "you don't have edit
   access to this file". The file's owner has to share it with will@itsundone.com as an editor (or move it into the
   Undone-US team), or the connector has to sign in as the account that owns it.
2. **Data style:** his Nov 7 locks didn't name it; we recommend Florin charts everywhere, Easy read only in Easy. Needed
   before Insights is built.
3. **The day mark** for every screen: the ring (Today's week, Compact) or the filled circle (calendar, History, Your
   days). Both drawn as they are until he picks.
4. **The developer's platform** (iOS, Android, React Native, web), so the variables carry its code syntax as well as the
   CSS names.
5. **When the Insights rebuild lands**, so it can be captured and built last.

Answered on Nov 7: the locks (section 7), alternatives on the Reference page as screenshots only, and the photo meal log
and Easy view settings page in for v1. Answered on Nov 8: the Ask button is B, Compact (the other five on Reference);
Timing in Will's picks is Oura's card again, with a note on the card of the mornings outside the usual window; and
Insights goes into the Figma file for handoff once it is built.

## 11. What the developer gets

- **The Figma file** (section 9.1): foundations as variables with Light, Dark, Standard and Easy modes and real CSS names
  in Dev Mode; components with variants and descriptions; a page per flow with every state, its steps and its notes; an
  Alternatives page; the captures as reference.
- **The prototype** as the behaviour reference: https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB (the Screens list opens
  every screen in this inventory; the Decisions panel switches the options).
- **The docs:** this file; `CLAUDE.md` (the rules and the model's hooks); `claude/Florin DESIGN.md`; `claude/Florin data
  viz.md`; `claude/Florin decisions.md`; `reference/shipping-app/` (what ships today).
- **The captures** (section 8): every screen and state as PNG, full-length frames, DOM dumps with computed styles,
  `tokens.json`, `type.json`, `index.json`; and the tool to make them again (`handoff/capture.js`, `handoff/inventory.js`).
- **The logic to port**, not redraw: the model (`prototype/js/refresh-data.js`: the usual, FloraScore and its parts, the
  day facts and tallies, patterns and the meal gate, the alarm net), the claims rules (`prototype/js/claims-rules.js`),
  and the render functions as the reference for what each screen says (`prototype/js/refresh-*.js`).
