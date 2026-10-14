# Florin app refresh: working notes for Claude

This repo holds the **Florin app refresh**: a clickable phone prototype of today's Florin app, the one that ships
without hardware. People log manually (BMs, symptoms, meals, a weekly check-in). No sensor, no gas data, no FloraScore.

Read these first, in order:

1. `claude/Florin app refresh brief.md`: the goals, Will's notes, what's decided, what was built, open questions.
2. `claude/Florin app refresh research.md`: Oura, Function Health, GI logging apps, weekly check-ins, licensing.
3. `claude/Florin DESIGN.md`: the design system (v1.1). Spacing and radius scales, app colours, components, data vis, copy.

The brand studio (`florin-brand-studio.zip`, published at https://claude.ai/artifact/AnK85Y5MHPX9MiDiUiY3Sj) is the
source of truth for tokens and rules. Its `CLAUDE.md` carries the research-backed rules summarized below.

## What's here

```
prototype/index.html     the artifact page (no doctype: the publisher wraps it)
prototype/_local.html    the same page with a document shell, for file:// and Playwright. Keep the two in sync
prototype/css/app.css    the studio's app tokens and components (--ap-*), copied from the studio
prototype/css/refresh.css  the refresh: new app components (.ap-) and the page around the phone (.rx-)
prototype/js/lib.js, data-app.js, claims-rules.js   copied from the studio (helpers, seeded days, the 22 claims rules)
prototype/js/refresh-data.js  the manual-logs model built on the seeded days (window.FLORIN_LOGS). Pure JS, no DOM
prototype/js/refresh-ui.js    every app screen as a render function (window.FLORIN_RUI)
prototype/js/refresh-insights.js  the Insights tab, its detail pages and the Ask tab hand-off (extends FLORIN_RUI)
prototype/js/app-charts.js    the studio's small SVG chart kit (window.FLC), used by Insights
prototype/js/refresh-app.js   the prototype page: phones, actions, the screen list, notes per screen, A/B/C compare
reference/shipping-app/       screenshots of the app that ships today (Log a visit, History)
work/                          QA and screenshot scripts
```

Every number a screen states is computed from the model, never typed. If copy states a figure, compute it.

Consistency has three options, A (types 1 to 7, licence needed), B (today's five words) and C (seven of our own
words, proposed). A and C store a step from 1 to 7; a B log stores its word (`{ form: null, word }`), which covers
one or two steps. Read a BM's consistency only through `L.formName`, `L.formLine`, `L.glyphOf` and `L.inForms`, which
take the entry; `L.inForms` is three-valued in A and C (null when a B word's steps sit on both sides of the usual,
which reads as "could be either", never a shift). Foods are counted only through `L.matchFoods`, for seeded meals and
typed ones alike.

Insights reads days through `L.facts` (a gap stays a gap, No BM is a zero, a day is usual, shifted, unsure or none)
and patterns through `L.patterns` (90 days, a food needs 5 logs, a one-sided binomial test at 1 in 100). Each demo
person has one dish their seeded logs follow (`PATTERN_DISH`), seeded on its own meal pass so Insights has to find it.
A symptom logged without a strength keeps `s: 0` and reads as "strength not said", never mild.

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
- **Alarm features** (blood, black or tar-like stools, fever, vomiting that won't stop, weight loss, waking at night
  to go) route to primary care with a Teal banner. Never interpreted, never red.

## Check before you publish

```
NODE_PATH=$(npm root -g) node work/qa.js            # console errors, sideways scroll, claims check, tap targets
NODE_PATH=$(npm root -g) node work/behave.js        # interactions and data: drafts, focus, one-tap log, check-in rule
node work/audit-spacing.js                          # must say the prototype is on the scale
NODE_PATH=$(npm root -g) node work/shots.js <dir>   # phone screenshots of every screen in every state
```

## Publishing

The prototype is the artifact https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB. Publish `prototype/index.html` as the
page and every css/js file as a published file at the same relative path. Read the artifact before republishing: other
sessions publish to it too (the second pass did, on Oct 14), so merge onto what's live rather than overwrite it.
