# Figma build log: Florin app handoff

File: https://www.figma.com/design/6lE1EmYO0KMkP7YYyxKEfz (fileKey 6lE1EmYO0KMkP7YYyxKEfz), "Florin app handoff", Undone-US
team (Professional). Figma session id: 5b3d4142-a9f3-4ae1-92a1-bf5798b219a7.

Each step appends its own section as it goes (ids of what it made), so a step cut off by a container restart can be
picked up where it stopped. Keep what exists; never build a second copy.

## Pages (Nov 9, created by the coordinator)

| Page | id |
|---|---|
| Cover | 0:1 |
| Read me | 4:2 |
| Brand | 4:3 |
| Components: Controls | 4:4 |
| Components: Data | 4:5 |
| Components: Surfaces | 4:6 |
| Home | 4:7 |
| History | 4:8 |
| Check-in | 4:9 |
| Ask Florin | 4:10 |
| Onboarding | 4:11 |
| Membership | 4:12 |
| Logging | 4:13 |
| Profile and Easy view | 4:14 |
| Insights | 4:15 |
| Reference | 4:16 |

Nothing else exists yet: no variables, styles or components.

## Step 2: Foundations and the Brand page (started Nov 10)

Captures for this step: `/tmp/claude-0/-home-user-florin-app-mvp-v0/8c9716d2-58e6-5835-9170-e12c1e677800/scratchpad/figma/cap-foundations`
(136 captures with --dom: home, logging, ask, history, check-in; `tokens.json`, `type.json`). Run:
`node handoff/capture.js <dir> --flows home,logging,ask,history,checkin --only today,plus,bm,opening,turn,calendar,q1,saved --dom`.

**Fonts (checked Nov 10):** DM Sans (Light, Regular, Medium, SemiBold, plus a "9pt Regular" optical instance), Lora
(Regular, Medium, SemiBold, Italic) and Space Mono (Regular, Bold) are all available in the file. No fallback used. The
style names are "SemiBold" (no space). DM Sans's optical size is not a style here: display sizes use the default
instance, so a large DM Sans Light may draw a little looser than the browser's (DESIGN.md asks opsz to follow size).

Plan for the variables (resume check: get collections by name; every script below is find-or-create by name):
- `Brand` (one mode, Value; hidden from publishing, scopes []): forest, cream, ray, plum, teal, gold, forest-50,
  plum-50, teal-50. No Ray Deep (website only).
- `App colour` (Light, Dark): the `--ap-*` roles from tokens.json, grouped surface/, ink/, line/, usual/, shift/,
  context/, chart/, day/, ring/, ask/, heat/; aliases to Brand where the value is the brand colour exactly.
- `Space` (Value): space/4 to space/120, layout/side 20, layout/stack 16, layout/top 56, layout/bottom 120.
- `Radius` (Value): none 0, xs 2, sm 4, md 8, lg 12, xl 16, 2xl 24, 3xl 32, full 999.
- `Scale` (Standard, Easy): control heights, tap target, Ask token and the shared type sizes and line heights.

### Variables (done Nov 10, one call, find-or-create by name; the script is
`/tmp/claude-0/-home-user-florin-app-mvp-v0/8c9716d2-58e6-5835-9170-e12c1e677800/scratchpad/figma/vars.js`)

| Collection | id | Modes (id) | Variables |
|---|---|---|---|
| Brand | VariableCollectionId:9:2 | Value (9:0); hiddenFromPublishing | 9 (scopes [], code syntax var(--forest) etc.) |
| App colour | VariableCollectionId:9:12 | Light (9:1), Dark (9:2) | 52 (35 mode values alias Brand) |
| Space | VariableCollectionId:9:65 | Value (9:3) | 18 (space/4..120, layout/side, stack, top, bottom as aliases) |
| Radius | VariableCollectionId:9:84 | Value (9:4) | 9 (radius/none, xs, sm, md, lg, xl, 2xl, 3xl, full) |
| Scale | VariableCollectionId:9:94 | Standard (9:5), Easy (9:6) | 35 (size/* WIDTH_HEIGHT; type/*/size FONT_SIZE, type/*/line LINE_HEIGHT) |

App colour names: surface/{ground, card, card-2, hero, pattern, accent, tab-bar, scrim, toast, toast-action},
ink/{1, 2, 3, hero, on-accent, toast, toast-action}, line/{hairline, grid}, usual/{mark, band, band-edge, chip, ink,
ring-band, plum, live}, shift/{mark, ink, chip, day-edge, chart-edge}, context/{mark, tint, ink}, chart/{reading, up},
day/{on, on-shift, gap}, ring/{track, empty}, ask/{edge, compact-fill, compact-ink, compact-edge, token, token-glyph},
heat/{0..3}. WEB code syntax is the prototype's own `var(--ap-*)`; where the app has no token (tab bar, scrim, toast,
ring track, the Compact Ask pill) it is the CSS expression the prototype uses. Space, Radius and Scale code syntax are
proposed names (`var(--space-16)`, `var(--radius-xl)`, `var(--ap-size-button)`): the prototype writes px literals.

### Text and effect styles (done Nov 10; script `.../scratchpad/figma/styles.js`, find-or-update by name)

41 text styles. Twelve shared ones have fontSize and lineHeight bound to the Scale collection's `type/*` variables, so a
frame set to Scale: Easy grows them (Title/Card, Body, Body/Strong, Row, Button, Choice, Small, Small/Strong, Caption,
Chip, Fine, Mono/Kicker). Values are the prototype's computed ones (type.json), which differ from the plan's table in
four places: Numeral/Hero tracking -4% (plan -3%), Ask/Question 16/22.4 (plan 16/21), Story/Reply 17/25.5 (plan 25),
Mono/Date 10.5/14.7 (plan 16); and Story/Hero 19/21.85, Easy/Body 20/30. Added from the prototype beyond the plan's
table: Title/Step (28 Light), Title/Sheet (22), Mono/Add, Mark/Date, Mark/Date strong, Mark/Ring.

| Text style | id | Text style | id |
|---|---|---|---|
| Numeral/Hero | S:76df8d3ab8a28084842f50bbb3f9362fd06d1cf2, | Story/Reply | S:42f4ac81984bce2c424ef61c89951e7813c1f6d7, |
| Numeral/Strip | S:30fdef93b11b94f40eec88e45925f27b0f4a4c5f, | Story/Reply strong | S:307e457dfd1f27a5133a75623f15532374e6c577, |
| Numeral/Day | S:b129977026b8f9159459cfaac934ca564627cd1d, | Story/Lead | S:56a4237a999f5a7ce7170170b01e8e9e521ddd3f, |
| Title/Screen | S:dcf6928413b48c114d2def6de4346413ba68e63b, | Story/Hero | S:daf054069b914b8f65c0d06df3894f1764f5cee4, |
| Title/Step | S:ed69134fa97034f4a1e4b2358c34661b8847f350, | Story/Lede | S:43d5051d7722e97eed537d984e1b1f5147fc42ad, |
| Title/Greeting | S:58492e51dc13f4e8756518f1ff32ec14a8189ad8, | Mono/Kicker | S:602e76c95c163c9888e826e2283f0fc913211930, |
| Title/Sheet | S:16354894df1172b4666b4b7a0fa3f174245bf8eb, | Mono/Date | S:e902c14226e7ddeb4939f6bf7c15d121ceea0799, |
| Title/Card | S:e2e1e8e32b40f260349f5de55bf10de7e98dbda0, | Mono/Time | S:94424161e6d4cba9a6b065d84e1ced5a7d45bdcd, |
| Body | S:75f09a2fef1d76fa242d82eeb7e7859b2bc50819, | Mono/Weekday | S:8f6b56493ae2838c7d730e2d82e65874159b36b7, |
| Body/Strong | S:5b0f52db96fb8c579dbf29bdedbf39d5f021284a, | Mono/Weekday strong | S:ded42f5b05000071b4bd39983946e42814c1815f, |
| Row | S:d89557e4748bdfba0b1e5695a671afd68479a4f2, | Mono/Axis | S:76157744d2f3d1f471f26f927e8dc90a4670b965, |
| Button | S:677872095a7b4ca0f91e6008d3c224a1fa06a30c, | Mono/Add | S:ede53711e9c078c545e51c3be51f7d5fdee4cba5, |
| Choice | S:bcbfec0e868c966eb47f93a16471450e7c35c9ed, | Mark/Date | S:29838c301fbfd6f980da7523aa5b0ded7a4686a1, |
| Small | S:a31accea1619b8e15098f261124415909df2e9b8, | Mark/Date strong | S:28de19b791b6812ec98b0e828d0862e37ad7f622, |
| Small/Strong | S:2fd6dc5911ac79e71fa0fe75b3272bc11fe789e0, | Mark/Ring | S:74b0942854a9f5b0e52788a87f95f21f872d5a40, |
| Caption | S:e3aebdfc78bc7937569eb70e2f079de2131ea7be, | Easy/Number | S:f91f5ae6544de657e83e637c86cbb6f648e7eee0, |
| Chip | S:35c23d34e9513a1f5cf810885ac044bedbfa7664, | Easy/Question | S:b7c1259606ec22560bfeba5b8628231d3ab5d640, |
| Fine | S:9a74ae203fffa817858b8a2e4b5f6bc39fd1537c, | Easy/Say | S:801ee577f452c0d697eb949c4dd73e4350d838c0, |
| Ask/Question | S:e6a0851559520956c01281de075de06bffd90592, | Easy/Title | S:0e3cbce44c4681748f425bd140da22e7718c28aa, |
| | | Easy/Button | S:a9f960db49115629e6b8b66415e9bea2b7b64ffe, |
| | | Easy/Body | S:f160a88e362a03ea348589b4cdde09f03bcbe2fa, |
| | | Easy/Small | S:7b9e22b45ef41d7598fc2f161be4fa149416e33f, |

7 effect styles: Elevation/Card light S:4625dd3cdd1bf455c86c4ad3e571bb1858fba5ce,; Elevation/Card dark
S:823d5bb2bc9df4c82f7d8a7c82ac8205abc9dac4,; Elevation/Tab bar S:803f4f1b959c1c27f68502df6e04216a3f657bb2, (drop + 16
blur); Elevation/Plus S:73f33bd261cd0be24ef96efbfd2efc7491eb9d19,; Elevation/Toast
S:2cfb5d96972fd68d83ee0b29a946fe56943c9106,; Elevation/Segment picked S:0b6b8254a4363e0b7220fc5c4737c73eb6df971c,;
Elevation/Sheet dark edge S:e82d4cc464ab6156e8af4c2567e090cae1768c75,. (Effect styles have no modes: pick the light or
dark card style by the frame's theme.)

### Brand page, Cover and Read me (resumed Nov 10, after a restart)

Resume check (Nov 10): the five collections (Brand 9, App colour 52, Space 18, Radius 9, Scale 35), 41 text styles and 7
effect styles are in the file as logged above; Cover, Read me and Brand were empty. Built next, in this order: Brand
page (root frame "Brand" on page 4:3), then Cover (0:1), then Read me (4:2). Helpers for this step:
`.../scratchpad/figma/contrast.js` (contrast pairs from vars.js, written to contrast.json), `tree.py` (reads a DOM dump).

### Foundations additions (Nov 11, resumed)

Resume check (Nov 11): five collections, 41 text styles, 7 effect styles present; Cover, Read me and Brand pages empty.
Added (find-or-update by name):
- App colour `ring/shift-fill` VariableID:13:2 (Light alias shift/chip, Dark alias shift/mark): the fill inside a week
  ring outside the usual (light Gold 32%, dark a solid disc). App colour now 53 variables.
- Text styles (52 now): Mark/Week date S:56a5f34492a57fc481a5ce2bae734b5925a735a9, (DM Sans Medium 14/14 -2%, the
  date in Compact's 32px ring); Mark/Week date open S:41d8be74a0f2237f2c63de39025d5220727e41ac, (Regular, empty ring);
  Mark/Today S:4b2043e1b9ad366c16adc878258c589c87ff5ea2, (Medium 11/13.2, .ap-day-t).
- Private documentation styles (underscore, not published): _Doc/Display S:2a52e8480b6adbe8ad412fdddf281dd923c167da,
  _Doc/Heading S:73d6e47977ae2b9a695428885a1e623a6acee83b, _Doc/Subheading S:537104c0ce720b91de1a77263deb81830a992e7d,
  _Doc/Body S:c4cc3ebeb3c5dfa12f9525ca01f148e59408f519, _Doc/Small S:81ea7350638df32f4007b260cc60b3215e663a63,
  _Doc/Small strong S:a009a812a6cf6d76355d608b3df79754f3ea1ea6, _Doc/Label S:94f4cc1836810a87fb636d04709193774a0cae16,
  _Doc/Code S:187eb98ca758f2d4ee7f5de6f7678e1c3c8f9d14. Documentation chrome uses these; specimens use the app styles.

Brand page build: one root auto-layout frame "Brand" (1440 wide) on page 4:3; each section is a child frame named
"Section/<name>" that its script removes and rebuilds in place (retry-safe). Generators:
`.../scratchpad/figma/brand/*.js` (prelude.js is prepended to each).

**Brand page progress (Nov 11):** root frame "Brand" 14:2 on page 4:3 (1440 wide, App colour Light, Scale Standard set
on it). Built: Section/Header 14:3, Section/Brand colours 14:19, Section/Colour rules 14:71, Section/App colour 16:2
(53 role cards, Light and Dark cells), Section/Contrast 16:591 (20 pairs; translucent grounds sit on the card).
Gotcha found: a TEXT set to FILL at creation collapses to 0 wide; the prelude's `fixFills()` re-applies FILL after
layout, and fixed-width text needs `textAutoResize = 'HEIGHT'` set after `resize()`. Screenshots can't be downloaded
here (figma.com blocked by the proxy): use get_screenshot with enableBase64Response.
Sections added Nov 11: Section/Type 18:2 (44 app styles in 7 groups; spec, Scale values, usage), Section/Spacing 20:2
(bars bound to space/*, a 390 frame whose paddings and gap are bound to layout/*), Section/Radius 20:76, Section/Sizes
20:117 (two panels, Scale: Standard and Scale: Easy, bars bound to size/*), Section/Elevation 20:246 (effect styles on
Light and Dark grounds). Note: a style's `description` reads back HTML-escaped (&#39;), so unescape before reusing it.
More Brand sections (Nov 11): Section/Marks 21:2 (Light panel built, Dark panel its clone with App colour: Dark; day
marks per RU.dayMark at 28px, Compact's week row Oct 5 to 11 with 32px rings and + Add, the five ring states, chart
marks, the day-mark open call), Section/Icons 22:3 (37 icons from their SVG source: refresh-ui.js's 28, camera, moon,
pat, ring, send, stop, thumb, book, mem; strokes bound to ink/1; the seven consistency glyphs with C's words; the Ask
token and its Free lock and the FloraScore glyph in both modes; logo note), Section/Copy 22:301, Section/Licensing
22:333. Added App colour `ink/hero-accent` (Ray in both modes, alias brand ray; the FloraScore kicker and glyph ring on
the strip). App colour now 54 variables. Brand page done but for a final screenshot pass; next Cover (0:1), Read me (4:2).
Cover (Nov 11): frame "Cover" 23:2 on page 0:1, 1440x900, Forest (surface/hero), title, Ray rule, what the file holds,
a week of 64px rings in the Dark mode values with a caption naming them (24:31), Handoff v1 Nov 8 2026, the prototype
link (hyperlinked), what's inside. `figma.setFileThumbnailNodeAsync` is not supported here: set the thumbnail by hand.
Read me (Nov 11): frame "Read me" 25:2 on page 4:2: Section/Header 25:3 (prototype link, demo clock, foundations
counts), Section/Pages 25:19 (pages table, how a flow page reads), Section/Decisions 25:88 (11 locked decisions, with
Data style as Will's picks and Ask about this B), Section/Behaviour 25:165 (prototype, docs, logic to port, captures,
rules to keep), Section/Open 25:189 (8 open questions).

### Step 2 done (Nov 11)

Brand page 14:2 final: 14 sections (Header, Brand colours, Colour rules, App colour (54 role cards, ink/hero-accent card
27:2 added after), Contrast, Type, Spacing, Radius, Sizes, Elevation, Marks, Icons, Copy, Licensing), 1440 x ~22,100.
Audit (read-only, Nov 11): 2,260 nodes, 0 raw fills or strokes, 0 unbound padding, gap or radius, every text on a
style, no em dash or exclamation point. Visual check: the marks' week row and day marks match the captures
(home/today/12w, history/calendar/12w and flagged) ring for ring.

Final foundations: Brand 9, App colour 54 (Light 9:1, Dark 9:2), Space 18, Radius 9, Scale 35 (Standard 9:5, Easy
9:6); 52 text styles (44 app, 8 private _Doc/*); 7 effect styles.

For the next steps:
- Icon and glyph SVG source, ready to import: `.../scratchpad/figma/brand/icons.json` (IC 28, extra 9, GL 7). Strokes
  bind to an ink variable; list and sliders have filled dots; glyph 7 is strokes at 1.9.
- Mark geometry (from the DOM dumps): day circle 28 in a 36 box (Today ring 36, 2px inside), date Mark/Date strong;
  week ring 32 box, ring r13.2 at 3.6 centre, outside = ring/shift-fill disc + shift/mark ring + r15.3 shift/day-edge
  1.5; nothing logged = r13.2 ink/3 at 1.5 and + Add (Mono/Add, 16 tall, 1px ink/3 inside, plus 6px at 1.5); Today
  column 48x84, card-2, radius lg, 1.5 ink/1 inside. The flagged ring in Compact has no glyph; the calendar's does.
- Variables a component should use that are easy to miss: ink/hero-accent (the strip's kicker and glyph ring),
  ring/shift-fill, day/on-shift (the date in a Gold ring or circle), shift/day-edge (none on dark).
- The text helper gotcha (FILL text collapses at creation) and the escaped style descriptions are noted above.

## Step 3: Components, group "controls" (started Nov 11)

Resume check (Nov 11): Components: Controls 4:4, Data 4:5 and Surfaces 4:6 were empty; no components anywhere in the
file. Since no earlier group built icons, this step builds the Icon components first (on Components: Controls, a
section "Icons") so the other groups reuse them as instances. Captures for this step:
`/tmp/claude-0/-home-user-florin-app-mvp-v0/8c9716d2-58e6-5835-9170-e12c1e677800/scratchpad/figma/cap-comp-controls`
(224 captures with --dom: today, plus, quick-save, bm, sym, meal, meal-photo, check-in q1, extra, due-day, profile,
reminder, easy-settings, ask opening, turn, knows, free, insights, i-timing, paywall). Generators:
`.../scratchpad/figma/controls/*.js` (prelude.js prepended to each).

**Call A (done Nov 11):** root frame "Components: Controls" on page 4:4 (1440 wide, App colour Light, Scale Standard),
Section/Header, Section/Icons (37 icons + 7 glyphs, each a component in a "Cell <name>" frame; built once, a rerun only
adds what is missing).
- App colour additions (now 64): control/picked VariableID:29:2 (L Forest, D Cream), control/on-picked 29:3 (L card, D
  ground), control/seg-picked 29:4 (L card, D Cream), control/on-seg-picked 29:5 (L Forest, D ground), control/on-hero
  29:6 (Cream 10%), control/on-hero-hover 29:7 (Cream 16%), ink/hero-2 29:8 (Cream 80%), ink/hero-3 29:9 (Cream 70%),
  control/btn-forest 29:10 (L Forest, D none), control/btn-forest-edge 29:11 (L none, D Cream 60%).
- Text styles added (57 now): Tab label S:5ed34e427ea06ed1e15d49446acd39f219a66346, Segment
  S:1c8ba0bfd836a388d76de9266d7dd6fb766146d8, Toast S:e59d8e59544da9234764e2eeb968dcb3843591c0, Field
  S:25ec729b7a5e25e509a37cb91189237c62de7658, Tile word S:b0999619db61b8153fd6720a086d20a0dbe90067. Effect style
  Elevation/Ask S:dbd3206f9611fff5f55b6fec6865d0b3f5093aa8.
- Icon components (name "Icon/<RU.icon key>", 20px, stroke bound to ink/1): back 29:31, chev 29:36, info 29:42, clock
  29:48, bars 29:53, home 29:58, chart 29:63, plus 29:68, check 29:73, note 29:79, meal 29:84, lock 29:90, mic 29:96, cal
  29:102, close 29:107, down 29:112, list 29:120, chat 29:126, today 29:132, sym 29:137, ck 29:143, nobm 29:149, trash
  29:154, undo 29:159, pen 29:164, report 29:170, repeat 29:175, sliders 29:182, camera 29:188, moon 29:193, pat 29:200,
  ring 29:206, send 29:211, stop 29:216, thumb 29:221, book 29:226, mem 29:232.
- Glyph components ("Glyph/<n> <C word>", 24px, fill bound to ink/1): 1 Pellets 29:240, 2 Hard 29:248, 3 Firm 29:253,
  4 Formed 29:258, 5 Soft 29:265, 6 Loose 29:270, 7 Watery 29:276.
- Use an icon at another size with instance.rescale(size/20) so the stroke scales as in the browser, then rebind its
  stroke (and any fill) to the ink of its place. Other groups: reuse these; do not rebuild Section/Icons.

**Call B (done Nov 11):** each set sits in a "Section/<name>" frame (Head: title and usage note; Body: "<set> / table"
frame holding the set with row and column labels, then specimen frames "Dark (App colour: Dark)" and "Easy (Scale:
Easy)" made of instances). A rerun of a section removes and rebuilds it (its set gets new ids), so rebuild a set only
before other sets nest it.
- Button 30:137 (Section/Button 30:2): 30 variants, Style (Primary, Forest, Line, Done) x Size (Default 44, Compact 36,
  Block 350 wide) x State (Default, Focus, Disabled); Done only in Default. Props: Label (TEXT), Show icon (BOOLEAN,
  off), Icon (INSTANCE_SWAP, Icon/plus). Height bound to size/button, size/button-compact, size/button-block.
- Icon button 30:241 (Section/Icon button 30:218): Ground (Light, On hero) x State (Default, Focus); 44 target bound
  to size/tap-target, 36 disc; prop Icon (INSTANCE_SWAP, Icon/close).
- Text link 30:309 (Section/Text link 30:259): Kind (Link, Chevron, Guide, Back) x Ground (Light; On hero for Guide)
  x State (Default, Focus); prop Label (TEXT).
- Note: component sets come with a dashed border; SETSTYLE now sets dashPattern [] (fix the three above in a later
  call).

**Calls C to E (done Nov 11):**
- Text style Row/Regular S:2a0d837d7b04b6fada19538595ba182cf9a7f088 (14/19.6 Regular, .ap-fm-line). Text styles now 58.
- BM tile 31:107 (Section/BM tile 31:76): Context (Form, On hero) x State (Default, Picked [Form], Hover [On hero],
  Focus); props Word (TEXT), Glyph (INSTANCE_SWAP, Glyph/4 Formed). 46 (hero 44) x 80.
- BM scale 31:301 (Section/BM scale 31:127): the consistency step, Context=Form Picked=None|Loose, Context=On hero
  Picked=None; seven BM tile instances with C's words and glyphs, Harder and Looser, How to pick (Text link instance).
- Choice chip 31:403 (Section/Choice chip 31:363): Kind (Choice, Flag, Add) x State (Off, On, Focus; Add has Off and
  Focus); props Label (Choice), Sign (Flag), Add label (Add). Height size/choice-chip.
- Food chip 31:461 (Section/Food chip 31:442): Kind=Counted (20px status chip) | Seen (Default, Checked) | Something
  else; prop Food.
- Call D: every Icon/* and Glyph/* (but Icon/ring) is now ONE filled vector named "shape" (strokes outlined), fill bound
  to ink/1, so a colour override on "shape" survives an instance swap. To recolour an icon instance, set the fill of
  its "shape" child; rescale the instance for size (the outline scales with it).
- Per-kind TEXT props (so each variant shows its own words): Button: Label (Primary), Forest label, Line label, Done
  label (Show icon BOOLEAN, Icon INSTANCE_SWAP kept); Text link: Label (Link), Page label (Chevron), Guide label, Back
  label.
- Segmented control 33:264: Segments (2, 3) x Picked (1..3); props Label 1, 2, 3.
- Range tabs 33:342: Plan=Member Picked=7D|30D|90D, Plan=Free Picked=7D (30D, 90D with a 12px lock).
- Switch 33:399: State (Off, On) x Focus (false, true); 44x24, no auto layout (knob absolute).
- Switch row 33:429: State (Off, On); props Title, Line when off, Line when on, Show line. Section also holds the "Easy
  view controls (Scale: Easy)" specimen frame 33:434 (a card of switch rows and the Text size chips).
- List row 33:555: Kind (Setting, Value, Card row, Card row due) x State (Default, Focus); props Title, Card title,
  Line, Card line, Due line, Value, Icon (INSTANCE_SWAP on the Card rows' tile, Icon/ck).
- Field 33:634: Kind (Select, Time, Text, Text box) x State (Default|Empty, Filled, Focus); props Day, Time, Text,
  Placeholder, Note, Note placeholder. When row 33:660 (a single component, in Section/Field's body): WHEN kicker and a
  Select and a Time instance.

**Call F (done Nov 11):** hug fix (resize() had fixed the hug axis): Button (not Block), Text link, Choice chip, Food chip,
segments, Switch row, List row, Text box field, BM scale and When row hug again; every set re-fitted to its children.
- Ask token 34:440: Context (Default, On Ray, On hero) x Plan (Member, Free: lock glyph) x Size (24 bound to
  size/ask-token, 28, 36). The glyph is an Icon/chat (or Icon/lock) instance named "glyph", Fill in the disc.
- Ask about this 34:621: Style (B Compact [default variant, the component], A Pill, C Link, D Token, E Question, F Bar
  [reference only]) x Plan (Member, Free) x State (Default, Focus) = 24; prop Question (E). B has a "target 48" layer.
  Section also holds Dark, "B in Easy (Scale: Easy)" and "B on the FloraScore hero (light)" specimens.
- Toast 34:778: Kind (Message, Undo [Default, Focus], Action and undo, BM saved with time [decision 2's time buttons,
  designed here]); props Message, Undo message, Saved message.

**Call G (done Nov 11):** text style Easy/Tab S:e1d4ec13698a5ccd2413f65779a8cb397b93d0c2 (16/19.2 Medium). Text styles now 59.
- Tab 35:596 (building block): Kind (Icon, Ask) x Current (false, true); props Label, Icon (INSTANCE_SWAP, Icon/home).
- Tab bar 35:721 (Section/Tab bar): Version=Standard x Current (Today, Insights, History, Ask), plus Version=Easy
  Current=Today (Easy's own bar). Standard is built from Tab instances, the plus (44 Ray) and the Ask token.
- Top bar 35:796: Kind=Greeting (State Default, Focus on the avatar), Kind=Insights (title and a Range tabs
  instance); props Greeting, Initial, Title.
- Voice 35:915 (State Idle, Listening, Done), Photo row 35:937 (Plan Member, Free), Meal box 35:960 (State Empty,
  Typed: Text box Field instance and Food chip Counted instances); all in Section/Meal box with a Dark specimen.

**Call H and checks (done Nov 11):** Tab bar variants hug (332x52 Standard, 364x80 Easy; the table was re-laid, wrap
37:759). strokesIncludedInLayout set false on 77 main components and frames, so a 1 or 1.5 inside line never adds to a
size (as the prototype's inset box-shadows). Min sizes bound: Choice chip minWidth size/tap-target, Photo row minHeight
size/list-row, Ask about this E minHeight size/tap-target.
Audit (read-only, Nov 11, main components and doc frames on the page): 0 raw fills or strokes, 0 unbound padding, gap
or radius, every text on a style, no em dash or exclamation point; all 22 sets have descriptions. Screens compared with
the captures: tab bar (home/today 12w), Ask about this B (insights picks, on the FloraScore hero), toast (quick-save
saved-toast), BM tiles (logging/plus, logging/bm details), chips (logging/bm details), meal box (logging/meal typed).

### Step 3 "controls" done (Nov 11): what the other groups should reuse

Page Components: Controls 4:4, root frame 29:18 (1440 wide, ~18,100 tall). Sets (id, variants): Button 30:137 (30),
Icon button 30:241 (4), Text link 30:309 (10), BM tile 31:107 (6), BM scale 31:301 (3), Choice chip 31:403 (8), Food chip
31:461 (4), Segmented control 33:264 (5), Range tabs 33:342 (4), Switch 33:399 (4), Switch row 33:429 (2), List row
33:555 (8), Field 33:634 (10), When row 33:660 (component), Ask token 34:440 (18), Ask about this 34:621 (24, default B
Compact Member), Toast 34:778 (5), Tab 35:596 (4), Tab bar 35:721 (5), Top bar 35:796 (3), Voice 35:915 (3), Photo row
35:937 (2), Meal box 35:960 (2). Icons and glyphs: see Call A (44 components).
Not built here (other groups): status chips (Usual, Shift, Info, Neutral; Food chip Counted is the neutral look), day
marks, week rings, chart marks, legend, kicker, cards, sheets, the plus menu sections, the check-in pieces, the Ask chat
pieces, the paywall. Notes for screens: Elevation/Card light and Elevation/Segment picked are light-only effect styles:
on a Dark frame swap to Elevation/Card dark and drop the segment shadow. Pressed is a scale (97%, the plus 94%, tiles
95%), noted in descriptions, not drawn as variants. Field text (16) is not bound to Scale (no type variable for it); its
height is (size/field).

## Step 4: Components, group "data" (started Nov 11)

Resume check (Nov 11): Components: Data 4:5 was empty (no components, no frames). Captures for this step:
`/tmp/claude-0/-home-user-florin-app-mvp-v0/8c9716d2-58e6-5835-9170-e12c1e677800/scratchpad/figma/cap-comp-data` (140 with
--dom and --tall: home/today, history/calendar, checkin card and saved, insights (all states, picks), i-score, i-timing,
i-often, easy today and history). Generators: `.../scratchpad/figma/data/*.js` (data/prelude.js prepended to each; page
4:5, root frame "Components: Data", the same SECTION/TABLE/SPEC helpers as controls). Icons and controls are reused from
page 4:4 by id (getNodeByIdAsync), never rebuilt.

Plan, in call order: A foundations additions (hero/* colours, text styles Legend, Mono/Label, Numeral/Ring) + root frame +
atoms (Kicker, Status chip, FloraScore glyph, Legend item); B Day mark, Week ring, Week day; C Week row; D Calendar cell,
Calendar month; E Entry row, Check-in row, Teal note; F Usual range bar, FloraScore strip; G check-in result (Check-in
strip, Check-in result card, Your logs this week); H FloraScore ring and FloraScore hero (Insights); I chart primitives
(Chart mark, Meter bar, Oura tick, Oura arc, Bento capsule); then specimens (Dark, Easy), screenshots, audit.

**Call A (done Nov 11):** root frame "Components: Data" 40:15 on page 4:5 (1440 wide, pad 80, gap 96, App colour Light,
Scale Standard); Section/Header 40:16.
- App colour additions (now 74): hero/track, hero/band, hero/band-edge, hero/edge, ink/hero-soft, hero/ring-track,
  hero/tick, hero/ring-usual, hero/ring-usual-ink, hero/glow (all mode-invariant: the hero is Forest, Card 2 on dark,
  and these are Cream or Ray over it; CSS expressions as code syntax).
- Text styles added (62 now): Legend (DM Sans 11.5/15), Mono/Label (Space Mono 10.5/16 +2%, sentence case), Numeral/Ring
  (DM Sans Light 84/75.6 -5.5%).
- Kicker 40:32 (Section/Kicker 40:19): Tone (Default, Context, Hero, Hero accent); prop Label.
- Status chip 40:54 (Section/Status chip 40:41): Tone (Usual, Shift, Info, Neutral); prop Label; height size/status-chip.
- FloraScore glyph 40:92 (Section/FloraScore glyph 40:83): Ground (Light, On hero).
- Legend item 40:181 (Section/Legend item 40:98): Mark (Day within, Day outside, Day logged, Day flagged, Symptoms, Ring
  within, Ring outside, Ring logged, Ring flagged, Band, Each week, This week, Window, Tick within, Tick outside, Capsule,
  Outside, No BM, Today ring); prop Label.

**Call A2 (done Nov 11):** Kicker and FloraScore glyph sets have no fill (so their hero ground rectangles show behind
the On hero variants). Status chip now has per-tone TEXT props (Usual label, Shift label, Info label, Neutral label), so
each tone shows its own word. Section/Legend item 41:69 rebuilt: **Legend mark** 41:114 (Mark: the 19 marks above, shapes
only) and **Legend item** 41:120 (one component: an exposed Legend mark instance "mark" and TEXT prop Label), with an
examples frame (each mark with its word) and its Dark twin. The earlier Legend item set 40:181 is gone.

**Call B (done Nov 11):** Section/Day mark 42:129, Section/Week ring 42:368, Section/Week day 42:463.
- **Day mark** 42:222: State (Within, Outside, Not counted, Nothing logged, Flagged, Later) x Size (28, 32) = 12; props
  Date (TEXT), Today ring, Today word, Symptoms (BOOLEAN, default off). Layers: ap-day-c (36 or 40 box: circle, date,
  today ring), ap-day-s (8px slot, "symptoms"), today word. Flagged has the info glyph (Icon/info instance) and no date.
- **Week ring** 42:392: State (Within, Outside, Logged, Nothing logged, Flagged, Before), 32px; prop Date. Geometry as
  the Brand page's marks (r13.2, 3.6; outside: ring/shift-fill disc + shift/mark ring + 1.5 shift/day-edge).
- **Week day** 42:570: Day (Weekday, Today) x Picked (false, true); props Weekday (TEXT, Weekday variants), Symptoms,
  Add (BOOLEAN); nested Week ring "ring" is exposed (State, Date). Examples: Oct 5 to 11 in Light and Dark.

## Screens from the demo (Nov 12)

Pictures of the live demo, one frame per capture (390 wide, named Flow / Screen / State / Plan / Theme), laid out on
each page in a root frame "Screens from the demo" that replaces any earlier one. Each capture was set as the frame's
image fill (FILL). Every page checked with one screenshot: the frames show app screens, none blank.

| Page | Root node | Frames placed |
|---|---|---|
| 4:7 Home | 54:2 | 45 of 45 |
| 4:8 History | 55:2 | 28 of 28 |
| 4:9 Check-in | 56:2 | 28 of 28 |
| 4:10 Ask Florin | 58:2 | 39 of 39 |
| 4:11 Onboarding | 59:2 | 19 of 19 |
| 4:12 Membership | 60:2 | 8 of 8 |
| 4:13 Logging | 61:2 | 84 of 84 (two uploads: 60 and 24) |
| 4:14 Profile and Easy view | 62:2 | 63 of 63 (two uploads: 60 and 3) |
| 4:15 Insights | 63:2 | 71 of 71 (two uploads: 60 and 11) |
| 4:16 Reference (options not picked) | 64:2 | 34 of 34 |

419 frames in all, matching the 419 captures. Failures: none; no use_figma call needed a retry.
