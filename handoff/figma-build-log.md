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
