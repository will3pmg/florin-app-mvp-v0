# Florin app vote: the ballot, agreed

Nov 5. First written by build-results from PLAN.md section 4; rewritten after build-vote's `vote/js/ballot.js` and
`vote/js/questions.js` landed, so it now describes those files as they are. Both sides follow this. To change anything,
add a line under "Requests" at the foot and say who asked; the other side answers there. Kept as `vote/BALLOT.md` (fix,
Nov 5: the line-damaged rule, rows read by label, the recommendations in op=results).

## Who writes what

| File | Owner |
|---|---|
| `vote/js/questions.js`, `vote/js/ballot.js`, `vote/config.js`, the voting page, `vote/build.js`, `vote/tools/check.js` | build-vote |
| `vote/js/count.js` (reading files and making results.json, on ballot.js), `vote/tools/aggregate.js`, `vote/tools/make-fixtures.js`, `vote/tools/fixtures/`, `vote/tools/test-results.js`, `vote/results/*`, the Code.gs votes piece and its tests, `vote/SETUP.md` | build-results |

ballot.js's exports and the shape `parse()` returns are what the results side reads: change them only with a line
below. build-results sends parsing bugs as cases here, and never edits ballot.js.

## questions.js (as it stands)

UMD, `window.VOTE_Q` / `module.exports`. Read by the results side: `QS` (19, canonical order: `{ id, part, n, label,
title, opts: [{ id, name, ... }] }`), `qOf(id)`, `optOf(q, p)`, `optName(q, p)`, `roleName(id, other)`, `inPart(n)`,
`ROLES` (`[id, name]` pairs), `NONE` (`{ id: "none", name: "No preference" }`), `PARTS` (`{ n, name, short }`).

| qid | label | options (id = name), canonical order |
|---|---|---|
| home | Home screen | score = Score first, day = Day first, compact = Compact |
| history | History | list = List, calendar = Calendar |
| bm | Logging a BM | quick = Quick tiles and form, full = Full form only |
| words | Consistency words | A = Numbers 1 to 7, B = Five words, C = Seven words |
| checkin | Weekly check-in | on = With the check-in, off = Without it |
| meals | Logging meals | quick = Quick, voice or text, detailed = One meal at a time |
| easy | Easy version | standard = Standard only, easy = Add Easy |
| onboard | Onboarding | short = Short, full = Full survey |
| c-score ... c-pattern (9 to 19) | FloraScore today, FloraScore over time, What moved FloraScore, The last 7 days, The month, Timing, How often, Consistency, Symptoms, Check-in results, Possible patterns | built = Florin charts, rings = Rings, journal = Field journal, bento = Bento, oura = Oura, easy = Easy read; the month adds cal-ring = "Florin charts, with the week's ring" after built |

Every question also takes `none`. Roles: leadership, marketing, product, design, engineering, clinical (Clinical or
science), advisor (Advisor or partner), other (the typed role, 40 characters).

## The ballot (ballot.js)

- **JSON** (`toJSON(b)`, what `?op=vote` gets as `text/plain;charset=utf-8`): `{ type: "vote", v: 1, vote, bid, vid,
  name, role, role_other, at, build, seed, picks: [{ q, p, note }] }`. `bid` 6 of `ACDEFHJKMNPRTWXY34679`; `vid` 12 of
  `[a-z0-9]`; `at` UTC to the second; picks answered only, canonical order; notes one line, 280 at most.
- **Slack text** (`text(b, { max, date })` -> `{ text, parts }`):
  ```
  Florin app vote: Sam Lee, Design
  19 of 19 answered, 4 notes. Ballot H7KC4X, Nov 5, 2026, 3:04 PM

  Part 1, the app
  1. Home screen: Compact
     Why: I can get to any day in one tap.
  ...
  Part 2, the charts
  ...
  19. Possible patterns: No preference

  `FLORIN-VOTE 1 florin-app-vote-1 b=H7KC4X n=Sam%20Lee r=design at=2026-11-05T20:04:05Z s=4821 p=home:compact,... w=home,... x=0k3f9a2`
  ```
  "no notes" for none, "1 note". A skipped question reads "Not answered" and has no pair in `p`. Over `max`, parts:
  the header gets ` (part k of n)`, each part ends with its own machine line, the ones before the last carrying only
  `b`, `n` and `part`.
- **Machine line** keys in order `b n r [ro] at s p w [part] x`; `n` and `ro` percent-encoded; `x` is FNV-1a 32-bit
  over the UTF-8 of the line up to the space before ` x=`, base 36, padded to 7.
  Test vector: `FLORIN-VOTE 1 florin-app-vote-1 b=H7KC4X n=Sam%20Lee r=design at=2026-11-05T20:04:05Z s=4821 p=home:compact,history:calendar w=home`
  gives `1b0g1il`.
- **Read back** (`parse(text, { source, file })`, `fromJSON(o, { source, file })`): `{ vote, bid, vid, name, key, role,
  role_other, at, build, seed, picks: { qid: { p, note } }, source, file, line, text, ok, flags }`. `flags` are
  strings: `read_from_text`, `line_damaged`, `note_lost`, `note_extra`, `check_failed`, `part_missing`,
  `unknown_pick`, `no_name`. A ballot with `ok: false` (check failed, no name) never counts.
- **Reading the lines:** a pick's line is matched by its question's label first (after a number, a bullet Slack put in
  its place, or nothing), then by its number, so a list Slack turned into bullets or numbered again from 1 keeps its
  picks and its `Why:` lines. A machine line with no `x=` left (wrapped) is joined to the next lines, with nothing or a
  space between, when the joined line passes its check. A machine line that still fails its check is `line_damaged`,
  and the ballot counts from its numbered lines, when those agree with every pick the line still names (an option id
  cut short is passed over) and, for a line whose check was changed rather than cut, with its name; any disagreement
  is `check_failed`.
- **Latest per name** (`latest(list)` -> `{ counted, replaced, flags }`): name key `nameKey()` (NFKD, marks off, lower
  case, runs of non-letters and non-digits one space, trimmed); one bid seen twice is one ballot; the latest `at`
  counts, a tie to the later in the list; `two_browsers` when one name came from two vids. `tally(list)` ->
  `{ qid: { n, none, opts } }`.

## results.json (count.js and the script's op=results)

```json
{ "v": 1, "vote": "florin-app-vote-1", "generated": "2026-11-06T15:00:00Z",
  "sources": [ { "kind": "slack", "file": "ballots/2026-11-05.txt", "ballots": 6 } ],
  "ballots": [ { "bid": "H7KC4X", "name": "Sam Lee", "key": "sam lee", "role": "design", "role_other": "",
                 "at": "2026-11-05T20:04:05Z", "source": "slack", "vid": "", "flags": [],
                 "picks": { "home": { "p": "compact", "note": "I can get to any day in one tap." } } } ],
  "replaced": [ { "name": "Sam Lee", "bid": "C4NM7P", "at": "2026-11-05T19:40:00Z", "by": "H7KC4X" } ],
  "flags": [ { "name": "Sam Lee", "bid": "H7KC4X", "what": "two_browsers" } ],
  "dropped": [ { "file": "ballots/2026-11-05.txt", "line": 214, "why": "check_failed", "name": "...", "bid": "...", "text": "..." } ],
  "tallies": { "home": { "n": 9, "none": 1, "opts": { "score": 2, "day": 1, "compact": 5 } } } }
```

`ballots` holds only the ballots that count. A voter's name is written as their first ballot spelled it (the earliest
`at`), in `ballots`, `replaced` and `flags`. The script's reply adds `ok: true`, `source: "sheet"`, `ballots_all`
(every ballot on the tab, in the order received), so Slack ballots can be merged with the Sheet's under the same rule,
and `recs` (what we recommend, Code.gs's `VOTE_RECS_`, which `focus/apps-script/test.js` checks against
`vote/results/js/recs.js`): the hosted site doesn't carry `recs.js`, so only the keyed reply brings them.
`dropped[].why`: `check_failed`, `no_name`, `empty` (no picks: not a ballot), `test` (a `-test` vote id), `other_vote`,
`before_since`.

## Requests

- build-results to build-vote, Nov 5 (no change needed now, for when there is time): `parse()` reads a segment with a
  header and numbered lines as a ballot even when none of its lines name a known question, so a message of Will's that
  starts "Florin app vote: ..." and has a numbered list would come back as a ballot with no picks. count.js drops a
  ballot with no picks as `empty`, so nothing is miscounted.
- build-results, Nov 5: I made `vote/.gitignore` (ballots/, results/results.json, results/results-data.js, site/).
  build-vote: add lines to it rather than replacing it. `vote/SETUP.md` points to `vote/PUBLISH.md` for the voting
  page's publish map (your file); it carries the results page's map itself.
