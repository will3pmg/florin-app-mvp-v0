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
