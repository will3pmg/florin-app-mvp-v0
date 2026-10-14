---
version: alpha
name: Florin Health
description: >-
  Design system for Florin Health (formerly SNIFR): Florin One, the at-home gut health monitor,
  the Florin app and FloraScore. Warm science. Cream and Forest lead, Ray signals, Plum carries
  human stories, Teal carries science and data. v1.1, October 8, 2026: one 4px spacing scale, and every
  component on it.
colors:
  # Brand palette: the only literal colours in the system. Everything else derives from these six.
  forest: "#00352B"
  cream: "#F9F7F2"
  ray: "#EEFFA3"
  plum: "#4F2641"
  teal: "#396E7C"
  gold: "#D1BD7E"
  # Derived tints (oklch from the brand colours; the hex is what each resolves to)
  forest-50: "#809A92"
  plum-50: "#A38C9A"
  teal-50: "#9CB3B9"
  ray-deep: "#697614"
  forest-mute: "#526E66"
  # Roles
  primary: "#00352B"
  on-primary: "#F9F7F2"
  background: "#F9F7F2"
  on-background: "#00352B"
  surface: "#FFFFFD"
  surface-2: "#F1EEE6"
  accent: "#EEFFA3"
  on-accent: "#00352B"
  signal: "#697614"
  signal-on-dark: "#EEFFA3"
  line: "#00352B1F"
  ink-2: "#36544C"
  ink-3: "#6A837C"
  # App data roles, light screens
  usual: "#4F2641"
  usual-band: "#4F264124"
  usual-chip: "#4F26411C"
  shift: "#C2A64B"
  shift-ink: "#695612"
  shift-chip: "#D1BD7E52"
  context: "#396E7C"
  info-bg: "#396E7C1A"
  info-ink: "#2A5662"
  track: "#EEEAE1"
  # App, dark theme
  dark-background: "#03201A"
  dark-surface: "#0A3129"
  dark-surface-2: "#0F3A31"
  dark-ink: "#F9F7F2"
  dark-ink-2: "#CAD8D4"
  dark-ink-3: "#8EA7A0"
  dark-usual: "#EEFFA3"
  dark-usual-ink: "#FAFFBC"
  dark-shift: "#DCC374"
  dark-shift-ink: "#EFD991"
  dark-plum: "#C8A9BC"
  dark-teal: "#8EC0CD"
typography:
  display-xl:
    fontFamily: DM Sans
    fontSize: 140px
    fontWeight: 300
    lineHeight: 128px
    letterSpacing: -0.04em
    fontVariation: "'opsz' 40"
  display:
    fontFamily: DM Sans
    fontSize: 96px
    fontWeight: 300
    lineHeight: 90px
    letterSpacing: -0.035em
    fontVariation: "'opsz' 40"
  h1:
    fontFamily: DM Sans
    fontSize: 60px
    fontWeight: 400
    lineHeight: 56px
    letterSpacing: -0.015em
    fontVariation: "'opsz' 40"
  h2:
    fontFamily: DM Sans
    fontSize: 40px
    fontWeight: 400
    lineHeight: 40px
    letterSpacing: -0.015em
    fontVariation: "'opsz' 40"
  lead:
    fontFamily: Lora
    fontSize: 32px
    fontWeight: 400
    lineHeight: 34px
  body:
    fontFamily: Lora
    fontSize: 19px
    fontWeight: 400
    lineHeight: 29px
  label:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: 400
    lineHeight: 20px
  micro:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.05em
  ui:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
  button-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  chip:
    fontFamily: DM Sans
    fontSize: 11.5px
    fontWeight: 500
    lineHeight: 12px
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  3xl: 32px
  full: 999px
spacing:
  # One 4px scale, named by size. Every padding, margin, gap and inset is one of these.
  space-4: 4px
  space-8: 8px
  space-12: 12px
  space-16: 16px
  space-20: 20px
  space-24: 24px
  space-32: 32px
  space-40: 40px
  space-48: 48px
  space-56: 56px
  space-64: 64px
  space-80: 80px
  space-96: 96px
  space-120: 120px
  # Layout, built from the scale
  gutter-mobile: 16px
  gutter-desktop: 56px
  section-min: 64px
  section-max: 120px
  app-screen-side: 20px
  app-stack: 16px
  max-width: 1400px
  columns: 12
components:
  # Controls have a fixed height and side padding only, with the label centred. A 1px border sits inside the
  # height, so it can't push a control off the grid. Every value below is on the spacing and radius scales.
  button-primary:
    backgroundColor: "{colors.ray}"
    textColor: "{colors.forest}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 0px 24px
  button-forest:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 0px 24px
  button-line:
    backgroundColor: transparent
    textColor: "{colors.forest}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 0px 24px
  button-small:
    backgroundColor: "{colors.ray}"
    textColor: "{colors.forest}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0px 16px
  button-app:
    backgroundColor: "{colors.ray}"
    textColor: "{colors.forest}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0px 16px
  button-app-compact:
    backgroundColor: transparent
    textColor: "{colors.forest}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 0px 12px
  field:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.forest}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 0px 20px
  kicker:
    textColor: "{colors.teal}"
    typography: "{typography.micro}"
  tag:
    backgroundColor: "{colors.ray}"
    textColor: "{colors.forest}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    height: 24px
    padding: 0px 12px
  chip-usual:
    backgroundColor: "{colors.usual-chip}"
    textColor: "{colors.usual}"
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
    height: 20px
    padding: 0px 8px
  chip-shift:
    backgroundColor: "{colors.shift-chip}"
    textColor: "{colors.shift-ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
    height: 20px
    padding: 0px 8px
  segmented:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 4px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.2xl}"
    padding: 16px
  card-hero:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    rounded: "{rounded.2xl}"
    padding: 16px
  option-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.xl}"
    padding: 12px 16px
  alarm-banner:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.forest}"
    rounded: "{rounded.xl}"
    padding: 12px 16px
---

# Florin Health · DESIGN.md

Warm science. Cream and Forest lead, Ray signals, and every number is read against the person's own usual.

## Overview

**What Florin is.** Florin Health (formerly SNIFR) makes Florin One, a small sensor that sits on the toilet tank and reads the gases your gut produces. It comes with the Florin app and a daily number, FloraScore. The first audience is people living with IBS-D.

**The feel.** Quiet Cream grounds, deep Forest type, one pale Ray signal, real photography of ordinary mornings. Calm, adult and dignified. Never clinical, never cute. "Warm Science" was the most trusted look in testing (67%).

**What is set, and what isn't (October 8, 2026).**
- **Set:** the palette (Ray replaced Lime on Sept 30), the three typefaces, the spacing and radius scales (Oct 8), the names Florin Health, FloraScore and Ask Florin, the copy rules and the claims guardrails. Humor is retired everywhere.
- **Working choice, not formally locked:** the Flow logo (picked Sept 30), and Florin One as the device name (needs founder sign-off and a trademark pass).
- **Proposed:** the app's data language and the photography direction. Every current photo is a placeholder.

**Source of truth.** The Florin Brand Studio. Its `css/studio.css` holds the palette, and the Figma files (Florin, Product and Decks) are generated from it. If this file and the studio disagree, the studio wins.

## Colors

| Colour | Hex | RGB | Role | Share |
|---|---|---|---|---|
| **Forest** | `#00352B` | 0 53 43 | Primary. Text, dark surfaces, the logo | 25% |
| **Cream** | `#F9F7F2` | 249 247 242 | Primary. The default ground | 60% |
| **Ray** | `#EEFFA3` | 238 255 163 | Signal. The one thing the eye should land on | 5% |
| **Plum** | `#4F2641` | 79 38 65 | Human moments: IBS-D stories, the founder story | 4% |
| **Teal** | `#396E7C` | 57 110 124 | Science and data: research, charts, clinical | 3% |
| **Gold** | `#D1BD7E` | 209 189 126 | Warmth and premium: packaging, awards | 3% |

**Proportion.** Cream 60, Forest 25, Plum, Teal and Gold 10 together, Ray 5. If a layout has more than one Ray moment, pick one.

**Ray is a signal, not a surface.** Ray is 12.6:1 on Forest and 1.0:1 on Cream, so:
- **On dark grounds** (Forest, Plum, Teal, photos under a dark overlay), Ray is the accent for text, lines, rules and marks.
- **On light grounds**, Ray appears only as a highlight or as a fill that carries Forest text: a button, a tag, a highlighter band. Lines, rules, dots and small labels use **Ray Deep** `#697614` (4.7:1 on Cream).
- **In code it is one token, `--signal`.** Ray Deep by default, Ray on any dark surface. A dark panel or a photo inside a light layout flips it too (`.on-dark`), or its labels turn olive on Forest (2.7:1).
- **Never Ray text on Cream.**

**The app is the exception.** On the app's light screens "your usual" is Plum (bands, chips, the average line, the live dot), context is Teal and a shift is Gold. The app never uses Ray Deep: next to data it reads as olive. Dark app screens use Ray for "your usual".

**Derive, never hardcode.** The six brand colours are the only literal values. Everything else is computed from them, so a palette change repaints every surface.

```css
:root {
  --forest: #00352B; --cream: #F9F7F2; --ray: #EEFFA3;
  --plum: #4F2641;   --teal: #396E7C;  --gold: #D1BD7E;
  --forest50: oklch(from var(--forest) calc(l + .37) calc(c * .57) h);   /* #809A92 */
  --plum50:   oklch(from var(--plum) calc(l + .331) calc(c * .45) h);    /* #A38C9A */
  --teal50:   oklch(from var(--teal) calc(l + .243) calc(c * .44) h);    /* #9CB3B9 */
  --raydeep:  oklch(from var(--ray) calc(l - .43) c h);                  /* #697614 */
  --line:     color-mix(in srgb, var(--forest) 12%, transparent);
  --signal:   var(--raydeep);
}
/* every dark surface, and any dark panel or photo inside a light layout */
.on-dark { --signal: var(--ray); }
```

**Tints.** Forest 50 `#809A92`, Plum 50 `#A38C9A` and Teal 50 `#9CB3B9` are quiet supporting fills (swatch strips, illustration). Forest Mute `#526E66` is muted text on the website. Ray Deep `#697614` is the signal on light grounds.

**App tones.**

| Role | Light | Dark |
|---|---|---|
| Background | Cream `#F9F7F2` | `#03201A` |
| Card | `#FFFFFD` | `#0A3129` |
| Card 2 | `#F1EEE6` | `#0F3A31` |
| Ink | Forest | Cream |
| Ink 2 | `#36544C` | `#CAD8D4` |
| Ink 3 | `#6A837C` | `#8EA7A0` |
| Your usual | Plum, band at 14% | Ray, band at 17% |
| Shifted | `#C2A64B`, ink `#695612` | `#DCC374`, ink `#EFD991` |
| Context | Teal | `#8EC0CD` |

**Contrast.**

| Pairing | Ratio | OK for |
|---|---|---|
| Forest on Cream | 12.7:1 | All text |
| Ray on Forest, Forest on Ray | 12.6:1 | All text |
| Cream or Ray on Plum | 11.6:1 | All text |
| Ink 2 on Cream | 7.8:1 | All text |
| Forest on Gold | 7.3:1 | All text |
| Cream on Teal, Teal on Cream, Ray on Teal | 5.3:1 | Body and large text |
| Forest Mute on Cream | 5.2:1 | Body text |
| Ray Deep on Cream | 4.7:1 | Lines, marks, labels, large text |
| Ink 3 on Card | 4.1:1 | Axis ticks and large text only |
| Teal on Forest | 2.4:1 | Never for text |
| Gold on Cream | 1.7:1 | Never for text |
| Ray on Cream | 1.0:1 | Never for text, lines or marks. Highlight fills only |

## Typography

**Three voices.** Every layout uses all three.

| Voice | Family | Weights | Job |
|---|---|---|---|
| **Headline** | DM Sans | 300, 400, 500 (600 for one bold question in chat) | Say it clearly and get out of the way |
| **Story** | Lora | 400, 500, italics | The warm voice: explanations, stories, pull quotes, italic overlays on photos, Ask Florin's replies |
| **Data** | Space Mono | 400, 700 | Anything measured: FloraScore, dates, sources, eyebrows, running heads |

Load them from Google Fonts:

```
https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Space+Mono:wght@400;700&display=swap
```

**The three-voice stack.** Eyebrow in Space Mono, then the headline in DM Sans, then the story in Lora, then the proof in Space Mono numerals.

| Token | Family | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | DM Sans | 140 / 128 | 300 | -4% | Hero lines, covers |
| `display` | DM Sans | 96 / 90 | 300 | -3.5% | Section openers, FloraScore numerals |
| `h1` | DM Sans | 60 / 56 | 400 | -1.5% | Page titles |
| `h2` | DM Sans | 40 / 40 | 400 | -1.5% | Section heads |
| `lead` | Lora | 32 / 34 | 400 | 0 | Intros and pull quotes |
| `body` | Lora | 19 / 29 | 400 | 0 | Long-form copy |
| `label` | Space Mono | 16 / 20 | 400 | 0 | Data, numerals, captions |
| `micro` | Space Mono | 12 / 16 | 400 | +5%, uppercase | Eyebrows, kickers, running heads |
| `ui` | DM Sans | 15 / 1.4 | 400 | 0 | App interface text |
| `button` | DM Sans | 16 / 24 | 500 | 0 | Buttons and text links |
| `button-sm` | DM Sans | 14 / 20 | 500 | 0 | Small buttons, app buttons |
| `chip` | DM Sans | 11.5 / 12 | 500 | 0 | App chips |

**Rules.**
- **Sentence case** for every headline. No exclamation points in headlines.
- **Go light at display sizes.** DM Sans 300 with negative tracking. Big numerals (FloraScore, stats) are DM Sans Light too.
- **Long-form copy is Lora.** Interface text in the app is DM Sans.
- **Eyebrows and kickers are Space Mono**, uppercase, +5% tracking, 11 to 13px.
- **Optical size.** DM Sans has an optical axis (9 to 40). Browsers match it to the font size. In Figma, set it to the font size, or display type draws too loose.

## Logo

**Flow.** A two-tone S-curve mark beside a lowercase serif wordmark, "florin". The curve reads as movement through the gut and as flora. Forest carries the form, and Ray carries the signal. Flow was picked on Sept 30 from twelve concepts. It is the working choice and the studio's saved pick, but it is not formally locked yet.

**Versions.**

| Version | Colours | Use on |
|---|---|---|
| **Primary** | Forest form, Ray half, Forest wordmark | Cream and other light grounds. The default |
| **Reverse** | Cream form, Ray half, Cream wordmark | Forest, and photos under a dark overlay |
| **One colour, Forest** | Forest only | Ray grounds, single-colour print, emboss |
| **One colour, Cream** | Cream only | Plum or Teal grounds, single-colour on dark |
| **Mark only** | Reverse mark on a Forest rounded square (22% corner radius) | App icon, favicon, social avatar, device emboss |

**Rules.**
- **The Ray half stays Ray** on every approved ground, Cream included, where it reads as a soft tint (decided Sept 30). Where Ray can't reproduce (single-colour print, emboss), use a one-colour version.
- **Clear space:** the wordmark's x-height on all four sides.
- **Minimum size:** the mark at 24px, the lockup at 96px wide.
- **Proportions are fixed.** The lockup is about 4:1 (2168 × 544 units). Never re-space or rebuild the mark and wordmark.

**Don't.**
- Don't add outlines, shadows or glows.
- Don't stretch, skew or rotate it.
- Don't recolour it: no Gold mark, and no Ray wordmark.
- Don't use the two-colour version on Plum or Teal.
- Don't place it on a busy photo without an overlay.
- Don't set "florin" in a typeface as a stand-in.
- Don't use the other eleven concepts in brand work. They stay in the Logo lab for reference.

**Files.** The live SVG is concept `f01` in the studio (`js/data-logos-svg.js`, rendered with `FL.logo("brand")`). The Figma Foundations page has it as a component. **Production note:** the current artwork is a trace of the concept image. Commission a clean vector redraw before print or large-format use.

## Layout

**Editorial grid (book, decks, print).**
- 12 columns, with titles in the left third and content in the right two-thirds.
- A running mono header carries the section and page.
- A Signal Line runs under the title.
- Pages are 16:9 and scale with their container.

**Website.**
- Max width 1400px. Gutters run from 16px on phones to 56px on desktop.
- Sections get 64 to 120px of vertical padding.
- Every section opens like a website: kicker, headline, optional lede, then a text link onward. No numbered heads ("01 ·") and no deck-style running heads on the site.

**App.**
- 390pt screens, 20px side padding, 16px between cards.
- Content starts 56px from the top (the status bar) and ends 120px from the bottom (the tab bar).
- Every screen ends on one next step tied to the person's own data, then a short disclaimer.

### Spacing

**One scale on a 4px grid.** 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96 and 120px. Each token is named by its size, so `space-16` is 16px.

**The rules.**
- **Every padding, margin, gap and inset is a step on the scale.** There are no in-between values and no best-effort: a 10, 14 or 18px value is a bug, not a judgment call.
- **Pick by distance.** 4 to 12 inside a component, 16 to 24 between related things, 32 to 48 between groups, 64 to 120 between sections.
- **Controls have fixed heights:** 48 for buttons and fields on the website, 40 for small buttons, 44 for app buttons, 36 for compact app buttons and the segmented control, 32 for filters and toggles, 24 for tags and 20 for chips. Padding sets only the sides, and the label is centred, so a 1px border never pushes a control off the grid.
- **Fluid values start and end on the scale:** `clamp(16px, 4cqi, 56px)`, never `clamp(18px, 4cqi, 54px)`.
- **Book and deck pages scale with their frame,** so they are measured in fractions of the page width (cqw) and sit outside the px scale. Where a page repeats a product component, it matches at the 1600px reference size: the book's tag is `.25cqw .75cqw`, which is 4 by 12px.

**What isn't spacing.** Borders and strokes (1px hairlines, the 1.5px line on app buttons, the 3px alarm edge), type sizes and line heights, and the geometry inside charts.

**Exceptions are marked, not guessed.** A few values can't be on the scale because they aren't spacing: a device frame's corners, an X drawn in CSS, a line through the middle of a dot, a 1 to 2px optical nudge that sits an icon on its first line of text. Each carries a `grid-exempt:` comment with its reason in the code: 17 on the website, none in the app. Centring a mark on its own midpoint (a negative margin of half its size) passes on its own.

**Checked automatically.** `work/audit-spacing.js` reads the scale from this file and fails on any off-scale padding, margin, gap, inset or radius on the app and the website. It reports 0.

## Elevation & Depth

- **Mostly flat.** Depth comes from surface colour, not shadow: a Cream ground, near-white cards (`#FFFFFD`), and Forest for the one card that leads.
- **App cards** get a hairline and a soft drop: `0 1px 0 rgba(0,53,43,.04), 0 10px 24px -18px rgba(0,53,43,.35)`.
- **Glass only over photography:** Forest at 72% with a 6px blur, for a data chip that sits on a photo.
- **Hairline texture** (Ray at about 20%) on dark surfaces only.
- **Dark mode** raises cards with lighter Forest tones, not shadows.

## Shapes

- **Pills and rings come from the mark.** Buttons, chips and tags are pills. FloraScore is a ring. Image masks can be rings or arches.
- **Radius scale.** Every corner is one of these:

| Token | Size | Use |
|---|---|---|
| `none` | 0 | Book tiles, slides, full-bleed photos |
| `xs` | 2px | Legend swatches and chart marks |
| `sm` | 4px | Small UI, the tail corner of a chat bubble |
| `md` | 8px | Thumbnails, small tiles |
| `lg` | 12px | Icon tiles, callouts, tooltips, source rows |
| `xl` | 16px | Fields in the app, option rows, banners, tables, toasts, chat bubbles |
| `2xl` | 24px | Cards: app cards, the hero card, website cards and media |
| `3xl` | 32px | Large website panels: plan cards, feature media, the gallery |
| `full` | 999px | Pills, buttons, chips, tags, bars, tracks, rings, avatars |

- **Nested corners.** An inner corner is the outer corner minus the padding between them: a 24px card with 16px padding holds 8px corners.
- **Lines are 1px hairlines.** Charts never use dashed lines.

## Components

**Buttons.**
- **Primary:** a Ray pill with Forest text, DM Sans 16px/500, 48px tall with 24px sides. One per view.
- **Secondary:** a Forest pill with Cream text, or a line button (transparent with a 1px line inside the 48px).
- **Small:** 40px tall with 16px sides, DM Sans 14px/500. The nav's "Reserve" is a small button.
- **In the app:** 44px tall with 16px sides. Compact line buttons (Logs, Export, Show more) are 36px with 12px sides.
- **On dark:** Ray stays primary. The secondary is an outline in Cream at 60%.

**Fields.** 48px tall pills with 20px sides and a 1px Forest line. In the app, fields are 16px-corner boxes.

**Kicker** (the section eyebrow).
- Space Mono 12px, uppercase, +5% tracking, with a 7px dot before it. No numbers.
- Its colour depends on the ground: Teal on light, Ray on Forest and Teal, Gold on Plum, Forest on Ray.

**Text link.** DM Sans 16px/500, a 1px underline at 45%, and a →.

**Tag.** A Ray pill with Forest Space Mono uppercase, 24px tall with 12px sides. Use it for highlights only. In the app, a tag takes the chip size.

**Chips (app).** 20px tall with 8px sides, DM Sans 11.5px/500.
- "Within your usual" is Plum on Plum 11%.
- "Shifted" is Shift Ink on Gold 32%.
- A neutral chip is Ink 2 on Card 2.

**Segmented control (app).** A 36px pill of Card 2 with 4px inside, holding 28px segments with 12px sides.

**Cards.**
- A standard card is Card `#FFFFFD`, 24px radius, 16px padding, with the soft drop. Cards sit 16px apart.
- The hero card (FloraScore) is Forest with the same 24px radius and 16px padding, a Ray ring and the usual range drawn on the ring.

**Range bar.** A Forest value dot on a track, with the Plum usual band behind it. It turns Gold when the value lands outside the band.

**Signal Line.** A 1px rule under headers in `--signal`. It can run on into a thin data line.

**Ask Florin (the chat coach, today's app).**
- **The opening read:** a chart of the person's own logs and two sentences, before they ask anything.
- **Each turn:**
  - an optional "Looked at N things" line;
  - one source line from the Florin journal;
  - the reply in Lora;
  - one bold question that hands the turn back (DM Sans 600). It is never repeated in the body.
- **Options:** up to three, offered about one turn in three. They are never a statement about how someone feels. Each is an option row: 12px by 16px padding, 16px corners.
- Thumbs up and down under each turn. The composer is pinned at the bottom.
- **Name:** always "Ask Florin". It never takes a doctor's title.

**Alarm banner (Ask Florin).**
- **When it shows:** when a message names an alarm feature: blood, black stools, unexplained weight loss, waking at night to go, fever or persistent vomiting.
- **What it looks like:** the turn opens with a Teal-tinted banner (12px by 16px padding, 16px corners) with a 3px Teal edge, a mono kicker ("When to see a clinician"), the sign in bold and one line. Never red.
- **What the turn does:** no sources and no options. It sends the person to primary care first, with a report to bring.

## Data Visualization

**Five roles, no new hues.**

| Role | Light | Dark |
|---|---|---|
| The reading | Forest | Ray |
| Your usual | Plum band, 14% | Ray band, 17% |
| Shifted | Gold `#C2A64B` | `#DCC374` |
| Context (cycle days, sleep, workouts) | Teal | `#8EC0CD` |
| Axes and ticks | Ink 3 | Dark Ink 3 |

No Ray Deep, no red and no green in charts.

**Rules.**
- **Start from the question.** Title the chart with its answer ("Was this morning usual for me?").
- **Pick a block first.** Use these forms:
  - one reading: a range bar;
  - over time: a line or bars with your usual;
  - two conditions: a two-group strip;
  - share of days: a segment bar.
- **Draw your usual first,** and name its range in words on or right under the chart.
- **Two layers at most:** the reading and your usual. Context moves to a Teal row under the axis.
- **Give every colour a word,** with a chip, a direct label or a legend line. Colour is never the only cue.
- **Mark the newest point.** Ring it, label it, and end the x axis on "Today".
- **Quiet axes.** Space Mono 10px, hairline grid, three to five round ticks, bars from zero.
- **Gaps stay gaps.** A day without a read is never a zero.
- **Check before it ships:** at 390 wide, in light and dark, with a table twin, and with every label run through the claims checker.

**Data language.**
- **Your usual, not normal.** Every number sits on a range built from the person's last 8 weeks, updated weekly.
- **Neutral words only:** within your usual, a little above your usual, later than usual, more often, less often, about the same. Never healthy, normal, good, bad, improving, worsening or resolved.
- **Patterns say how sure they are,** with "4 of 4 times" and a tier:
  - **Early signal:** a few examples.
  - **Showing up often:** 5 or more, most of the time.
  - **Consistent:** 8 or more, nearly every time.
- **Always add:** "Patterns show what tends to happen together. They don't prove cause."

## Imagery

**Shoot for.**
- Real joy: laughing, not posing.
- A little movement, such as walks, stretches or an easy run. Effort with a smile, never a gym ad.
- Ordinary mornings: coffee, window light, plants, kitchens.
- Every age and body from 25 to 60+, in natural light.

**Never.**
- A bathroom, a toilet or the device in use as a hero image.
- Someone clutching a stomach or wincing.
- Glossy yoga stock or six-pack fitness.
- Clinical white labs or neon "biohacker" blue.

**The Florin grade.** Shadows lift toward Forest, highlights warm toward Cream, and saturation eases about 6%. Skin stays true.

**Placement.** People carry the emotion, and data carries the proof. Never pair a real face with condition language, a quote or a result unless there is a signed release.

**Status.** Every current photo is an Unsplash placeholder with no model release. They are for internal use only until the commissioned shoot.

## Voice & Copy

**Tone.** Eight traits held as four tensions:
- Empathetic, but direct.
- Self-aware, and warm.
- Anti-theater, and respectful.
- Scientific, and encouraging.

In practice: name the frustration in line one and give the answer in line two. Treat the reader as a capable adult, not a patient.

**Writing rules.**
- **No em dashes.** Use a period, a comma or a colon.
- **No humor, puns or jokes,** on any surface. It put off 45% of people in testing.
- **Short paragraphs** of one to three sentences. End on an action.
- **Words to use:** "Gut", "digestion" and "biomarkers" in headlines. "Toilet" is fine in how-it-works copy.
- **Words to avoid:** never "stool gas" or "poop" on paid or product surfaces.
- **Competitors:** don't name them in consumer copy.

**Names.**
- **Florin Health** is the brand. It becomes **Florin** after the first mention.
- **Florin One** is the device. Always both words. Never "the One", "F1" or "Florin 1".
- **FloraScore** is one word, with a capital F and S.
- **Product names:** "the Florin app" (never "Florin One app"), and "Florin membership" for the subscription.
- **Ask Florin** is the chat coach. It shipped as "Dr. SNIFR". Never give it a doctor's title.

**Claims guardrails.** Florin is a wellness device. It never predicts, diagnoses, treats or cures anything.

| Avoid | Write instead |
|---|---|
| Predicts flare-ups | Spots patterns that may come before a rough day |
| Diagnoses, detects disease, treats IBS | Helps you understand your gut patterns |
| Clinically proven, medical-grade | Built on published VOC research (cite it) |
| Reads your microbiome | Reads gases your gut produces |
| Doctor-recommended | Designed to share with your provider |
| Healthy, normal | Within your usual range |
| "Whatever you're doing is working" | Seen together, not proof |

**Disclaimers, where they apply.**
- Florin Health shows patterns in your own data. It doesn't diagnose, treat or prevent any condition.
- Wherever symptoms appear, add a short note on when to talk to a clinician.
- Never mention IBD. The product stays with IBS-D and general gut health.

## Do's and Don'ts

**Do**
- Lead with Cream and Forest, and let Ray be the one signal.
- Use `--signal` for every line, rule, dot and small label. Ray Deep on light, Ray on dark.
- Use all three voices in every layout: mono eyebrow, sans headline, serif story, mono proof.
- Compare every number with the person's own usual, in neutral words.
- End every app screen on one next step, then a short disclaimer.
- Use Ink 2 for anything a person needs to read, disclaimers included.
- Take every padding, margin and gap from the spacing scale, and every corner from the radius scale.
- Give controls their fixed height (48, 44, 40, 36, 32, 24 or 20) and set only their side padding.
- Use the Flow lockup from the source files at its fixed proportions.
- Use real, released photography of ordinary life, graded to the palette.

**Don't**
- Set Ray as text, a line or a mark on Cream.
- Hardcode a colour that should be derived from the six brand colours.
- Use an in-between spacing value (6, 10, 14, 18, 22px) or an in-between corner (14, 18, 22, 26px).
- Use Ray Deep anywhere in the app.
- Use red, green or a new hue in charts.
- Write em dashes, humor, medical claims, "healthy" or "normal".
- Call the device anything but Florin One, or give the coach a doctor's title.
- Number website section heads or paste deck layouts onto the site.
- Show a bathroom, a toilet or a person in distress.
- Outline, recolour, stretch or rebuild the logo.

## Agent Prompt Guide

When you generate anything for Florin Health:

1. **Colours:** use the tokens above and derive tints from the six brand colours. Never invent a hex.
2. **Ground:** start on Cream with Forest text. Add one Ray moment at most.
3. **Signal:** on light grounds, lines and small labels use Ray Deep. On dark grounds, Ray. In the app, "your usual" is Plum on light and Ray on dark.
4. **Type:** a Space Mono eyebrow, a DM Sans headline (light at display sizes, sentence case), Lora for the story, and Space Mono for numbers.
5. **Spacing:** use only 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96 and 120px. Cards get 16px padding and 24px corners. Buttons are 48px tall (44 in the app), chips 20 and tags 24.
6. **Logo:** use the Flow lockup from the source files. Never draw or type a stand-in.
7. **Copy:**
   - Run every line against the claims guardrails.
   - No em dashes, no humor, no "healthy" or "normal", no predictions.
   - Use the naming rules exactly.
8. **Data:** measure against the person's usual, use neutral words, and say how sure a pattern is.
9. **Symptoms:** when copy mentions symptoms, add the clinician note. When it mentions an alarm feature, route to primary care first.
10. **Check:** contrast against the table above, the layout at 390 wide, and spacing against the scale (in the studio, `work/audit-spacing.js` reports 0).

## Changelog

### v1.1 · October 8, 2026 · one spacing scale

**Why it changed.** v1.0 listed a spacing scale (4, 8, 14, 20, 28, 56, 120) that didn't hold together, and the components didn't use it: buttons were 14 × 24, the app button 11 × 16, chips 5 × 9, tags 4 × 11 and the alarm banner 13 × 16. Those numbers were measured off the prototype, which had drifted onto a 2px grid. v1.1 replaces them with one 4px scale and puts every component on it. Compliance is strict, not best-effort.

**Scales.**

| | v1.0 | v1.1 |
|---|---|---|
| Spacing | 4, 8, 14, 20, 28, 56, 120 | 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120 |
| Radius | 4, 14, 22, 26, full | 2, 4, 8, 12, 16, 24, 32, full |

**Components.**

| Component | v1.0 | v1.1 |
|---|---|---|
| Button | 14 × 24 padding | 48 tall, 24 sides |
| Small button | 9 × 16 | 40 tall, 16 sides |
| App button | 11 × 16 | 44 tall, 16 sides |
| Tag | 4 × 11 | 24 tall, 12 sides |
| Chip | 5 × 9 | 20 tall, 8 sides |
| Card | 16 padding, 22 corners | 16 padding, 24 corners |
| Hero card | 16, 16, 12 padding, 26 corners | 16 padding, 24 corners |
| Option row | 13 × 14 (16 left), 14 corners | 12 × 16, 16 corners |
| Alarm banner | 13 × 16 | 12 × 16, 16 corners |
| App screen | 58 top, 14 between cards | 56 top, 16 between cards |
| Website sections | 64 to 120 (some pages ran 72 to 140) | 64 to 120 everywhere |

New to the component list: the small button, the compact app button, the field, the segmented control and the option row.

**In the studio.** 539 declarations in the app and website CSS moved onto the scale, and the controls got fixed heights. Of 948 spacing values, 481 moved: 400 by 1 or 2px, 49 by 4px, 30 by 6 to 8px (mostly large gaps, such as 72 to 64), and two section maximums came down to 120. The look barely changes; the numbers are now ones you can follow. `work/audit-spacing.js` checks every value against this file.

**Not updated yet.** The Figma frames for the app and the website still show the v1.0 spacing until the next push from the studio.

### v1.0 · October 7, 2026 · the first DESIGN.md

What changed from the SNIFR brand guide:
- **Names.** SNIFR became Florin Health. The device is Florin One (pending founder sign-off), the daily number is FloraScore, and the coach is Ask Florin (it shipped as "Dr. SNIFR").
- **Signal colour.** Ray `#EEFFA3` replaced Lime `#C0E900`. On light grounds, lines and small labels use Ray Deep, and Ray is never text on Cream.
- **App data colours.** "Your usual" is Plum on light screens and Ray on dark, context is Teal and a shift is Gold. No Ray Deep, red or green in the app.
- **Logo.** Flow, picked Sept 30 from twelve concepts. The working choice, not formally locked.
- **Voice.** Humor is retired everywhere, and copy has no em dashes.
- **Data language.** Every number is read against the person's own usual, in neutral words (proposed).
