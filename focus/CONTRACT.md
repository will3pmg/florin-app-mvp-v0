# Florin focus group test: the payload contract

Version 1, October 29, 2026. Between the participant web app (`focus/`, built into `focus/site/`) and the Google Apps
Script web app that writes the study's Google Sheet. The plan this serves is `claude/Florin focus group plan.md`
(section 6 is the data). If the two disagree, this file is what the code does; change both together.

The phone never reads a response to a POST. It posts, then asks the script by JSONP what it holds. So every POST must
be safe to repeat, and every GET must be cheap.

## 1. Transport

| | |
|---|---|
| Endpoint | The web app's `/exec` URL, pasted into `focus/config.js` as `endpoint`. Empty means nothing is sent: pieces wait on the phone |
| POST | `fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body })`. The body is JSON text (section 2). `navigator.sendBeacon(endpoint, body)` is used for the same body when the page is hidden |
| GET | JSONP: a `<script src="{endpoint}?op=...&callback=...">`. `doGet` returns `ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT)` |
| Callback | `callback` matches `^[A-Za-z_$][A-Za-z0-9_$]{0,63}$`. Anything else: return `/* bad callback */` as JavaScript and do nothing |
| Deployment | Execute as: me (the Florin Health account that owns the Sheet). Who has access: Anyone |
| Time | Every `at` is the phone's clock in UTC, to the second: `2026-10-29T14:03:12Z`. The script adds `received` in the Sheet's time zone |

Retries: the phone keeps every unconfirmed piece in `localStorage` and posts it again every 20 seconds, on every open,
and when the page comes back online. A piece is posted many times; the script keeps it once (section 4).

## 2. The POST body

```json
{ "v": 1, "pieces": [ { ...piece }, { ...piece } ] }
```

At most 25 pieces per POST. Each piece is handled on its own: one bad piece is dropped, the rest are kept. A body that
isn't JSON, or has no `pieces` array, is dropped whole.

There are two families of piece:

- **Session pieces** (`session`, `answer`, `task`, `comment`, `event`): they carry the envelope below and go to the
  study Sheet.
- **Unlinked pieces** (`token`, `followup`): they carry no `sid`, `cid`, `seq`, `code` or `at`, are always posted in a
  POST of their own, and go to the recruiter's separate sheet (section 6).

### 2.1 The envelope, on every session piece

| Field | Type | Rule | Column |
|---|---|---|---|
| `kind` | string | `session`, `answer`, `task`, `comment` or `event` | (picks the tab) |
| `study` | string | Must be a known study id, or a known id followed by `-test`. `^[a-z0-9-]{3,40}$` | `study` |
| `build` | string | The focus app's version, `^[a-z0-9.-]{1,24}$` | `build` |
| `sid` | string | The session id: 24 characters, `^[A-Za-z0-9_-]{24}$`. Made on the phone at consent | `sid` |
| `cid` | string | Which browser tab or app window sent it: `^[a-z0-9]{6}$`. One per tab or window (kept in `sessionStorage`) | `cid` |
| `seq` | integer | 1, 2, 3, and on, per `sid` and `cid`. Never reused for another piece | `seq` |
| `at` | string | ISO 8601 UTC to the second, `^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$` | `at` |
| `phase` | string | Where in the study it happened: `consent`, `intake`, a task id (`bm`, `time`, `week`, `score`, `patterns`, `checkin`, `history`, `ask`), `tour`, `cp1`, `cp2`, `cp3`, `install`, `free`, `exit`, `done` | `phase` (comments, events) |
| `standalone` | boolean | true when the piece came from the app opened from the home screen (display mode standalone) | (sets `installed` on the sessions row) |

### 2.2 `session`: the sessions tab, one row per `sid`

Upserted: the first `session` piece for a `sid` makes its row; each later one overwrites only the fields it carries
(a missing field leaves the cell as it is). Every field but the envelope is optional.

| Field | Type, values |
|---|---|
| `code` | The study code, 6 characters (section 5), e.g. `K7M4PX` |
| `restart_of` | A study code, or absent |
| `platform` | `iphone`, `android`, `other` |
| `os` | The system's major version as a string, `"26"`, or `""` |
| `browser` | `safari`, `chrome`, `samsung`, `firefox`, `edge`, `inapp`, `other` |
| `width` | integer, the screen width in CSS pixels |
| `theme` | `light`, `dark` |
| `text_reported` | `smaller`, `standard`, `larger`, `unknown` |
| `segment` | `pattern`, `simple`, `stack`, `tracker`, `record`, `unsure`, `""` |
| `person` | `sarah`, `marcus`, `alex` |
| `version` | `standard`, `easy` (as used now; it changes if the person switches in Profile) |
| `version_picked` | `standard`, `easy`, `""` (IN9) |
| `home` | `score`, `day`, `""` (blank for Easy) |
| `history` | `calendar`, `list` |
| `week` | `built`, `card`, `strip`, `note`, `chart`, `""` (blank for Easy) |
| `order` | integer 1 to 5, the Latin square row |
| `assigned` | `script`, `phone` |
| `decisions` | One line: `form=C bmUI=quick home=score history=calendar checkin=on mealUI=quick look=built easy=off onboard=short weekCard=card plan=member data=est meals=all persona=sarah` |
| `install` | `seen`, `said`, `browser`, `couldnt` |
| `stage` | `consent`, `intake`, `tour`, `compare`, `install`, `free`, `exit`, `done`, `stopped`. Keep the furthest by that order; `stopped` always wins over every stage but `done` |
| `tasks_seen` | integer 0 to 9 |
| `comments` | integer, comments sent and not deleted |
| `sus` | number 0 to 100, as computed (it can end in .5), only once all ten SUS items are answered |
| `submitted` | `yes`, `no` |
| `active_minutes` | number, one decimal: minutes with the page visible |
| `minutes` | number, one decimal: from the first piece to Submit |

The script works out and writes itself: `first_at` and `last_at` (the smallest and largest `at` of any piece for the
`sid`), and `installed` (`yes` once any piece for the `sid` has `standalone: true`).

### 2.3 `answer`: the answers tab, one row per question answered or skipped

| Field | Type, values |
|---|---|
| `section` | `intake`, `task`, `tour`, `compare`, `install`, `exit` |
| `task` | A task id for a task's own questions, else `""` |
| `qid` | A question id from section 7 |
| `question` | The words shown, with names and figures filled in |
| `answer` | The options' words as shown, joined with ` \| ` |
| `value` | The codes, joined with `\|`: option ids, or `1` to `5`, or `1` to `7` |
| `correct` | `yes`, `no`, or `""` where there's no right answer |
| `right` | The right answer's words, computed on the phone when the question showed, or `""` |
| `words` | Optional words, already scrubbed on the phone (section 4.3) |
| `alarm_note` | `yes`, `no`: the primary care note showed under the box |
| `skipped` | `yes`, `no` |

The same `qid` can come more than once in a session (FR2 once per part; a task tried again). Each is its own row: the
`seq` tells them apart.

### 2.4 `task`: the tasks tab, one row per task attempt

| Field | Type, values |
|---|---|
| `task` | `bm`, `time`, `week`, `score`, `patterns`, `checkin`, `history`, `ask`, `install` |
| `n` | integer 1 to 9, its place in the tour |
| `version` | `standard`, `easy` |
| `state` | The decisions on the phone during the task, the same one-line format as `decisions` |
| `started_at` | ISO UTC, as `at` |
| `seconds` | integer, from start to Done, Skip or the goal |
| `active_seconds` | integer, the part of that with the page visible |
| `outcome` | `seen`, `said`, `stuck`, `declined`, `broken`. For `install`: `seen`, `said`, `browser`, `couldnt` |
| `hint` | `yes`, `no` |
| `path` | Short words from a fixed list, joined with ` \| `. bm: `plus tile`, `today row`, `form`, `easy steps`, `details yes`, `details no`, `undo yes`, `undo no`. time: `edit`, `undo and log again`, `gave up`. score: `details`, `chip`, `your weeks`. checkin: `today card`, `plus`. history: `calendar`, `list`, `months moved 0` to `months moved 6`. ask: `suggested`, `typed`, `ask about this`. install: `added`, `code from the address`, `code typed`, `no code needed` |
| `screens` | integer, screens the phone moved through |
| `backs` | integer, times they went back or closed something |
| `ease` | integer 1 to 7 (TE, or IS1 for install), or `""` |
| `chips` | TR's words, joined with ` \| `, or `""` |
| `checks` | `"2 of 3 right"`, or `""` |

### 2.5 `comment`: the comments tab, one row per comment

| Field | Type, values |
|---|---|
| `cmid` | The comment's id: `^[a-z0-9]{8}$`, made on the phone. The row's key (see below) |
| `op` | `add`, `edit`, `delete` |
| `screen` | The app's screen key, from the allow-list in section 7.3 |
| `state` | The decisions on the phone, one line |
| `target` | What was tapped, in the app's interface words, from an allow-list on the phone (a card's title, a tab, a named control, a screen's title), else one of `a log entry`, `a log sheet`, `the chat`, `a text box`, `a sheet`, `the screen` |
| `x`, `y` | Where on the app's screen, as shares of its width and height, 0 to 1, two decimals. Blank for a comment from the Comment button |
| `tx`, `ty` | Where inside the target, as shares of its width and height, 0 to 1, two decimals. Blank for the Comment button |
| `vw`, `vh` | integers, the app's viewport in CSS pixels |
| `scroll` | integer, how far the screen was scrolled, in CSS pixels |
| `cm_kind` | CM1's words, joined with ` \| `: `I like it`, `It's confusing`, `Something's missing`, `Something didn't work`, `I have an idea`. Written to the `kind` column (the piece's own `kind` is `comment`) |
| `words` | CM2, scrubbed (section 4.3) |
| `alarm_note` | `yes`, `no` |
| `how` | `double tap`, `button` |

`op: "add"` makes the row. `op: "edit"` (same `sid` and `cmid`) overwrites `cm_kind`, `words` and `alarm_note` on that row
and keeps the rest. `op: "delete"` removes the row, words and all: the person took the comment back before submitting.
An `edit` or `delete` that arrives before its `add` (retries can reorder) is kept in the ledger and applied when the
`add` lands; a `delete` that wins means the `add` is never written.

### 2.6 `event`: the events tab, one row per event

| Field | Type, values |
|---|---|
| `type` | `flow`, `screen`, `act`, `set`, `view`, `depth`, `vis`, `install`, `net`, `error` |
| `screen` | The app's screen key at the time, from the allow-list, or `""` |
| `name` | flow: `consent`, `intake_done`, `tour_start`, `task_start`, `task_goal`, `task_end`, `cp_shown`, `install_shown`, `free_start`, `free_end`, `exit_start`, `pay_shown`, `pay_start`, `submit`, `stopped`, `cleared`, `restart`, `resume`. screen: the key moved to. act: an action name from the allow-list in section 7.4, or `a sheet`, `a log`, `other`. set: the decision key. view: a card's title. depth: the screen key. vis: `hidden`, `visible`. install: `prompt_shown`, `prompt_accepted`, `prompt_dismissed`, `appinstalled`, `standalone`, `code_ok`, `code_bad`, `code_unknown`, `manifest_swapped`. net: `flushed`, `failed`, `offline`, `online`. error: `error` |
| `detail` | A short value, at most 80 characters: a tab's name, a decision's value, a count, a share (`0.62`), an error's file and line (`focus-ext.js:212`, never its message). Never a log's content, a picked form, a symptom, a food, a note or anything typed |

Events go out in batches (every 10 seconds, or at 25), several `event` pieces in one POST, each with its own `seq`.

## 3. The GET calls (JSONP)

Every call carries `op`, `study` and `callback`. Every result is an object with `ok`. On a refusal: `{ "ok": false,
"error": "<code>" }`, with `error` one of `bad_request`, `unknown_study`, `closed`, `rate`, `code_taken`, `unknown`,
`bad_code`, `server`.

### 3.1 `op=ack`: what the script holds

`?op=ack&study=S&sid=SID&cid=CID&callback=cb`

```json
{ "ok": true, "upto": 12, "installed": false }
```

`upto` is the highest `n` such that every `seq` from 1 to `n` is held for that `sid` and `cid` (0 when none). The phone
removes every queued piece of that `sid` and `cid` with `seq <= upto`. `installed` is true once any piece for the `sid`
came with `standalone: true`: a Safari tab that sees it tells the person the app is open from their home screen.

The phone calls `ack` once per `cid` that has queued pieces, after each flush, and before the install steps show
(it waits there until `upto` covers everything sent, for up to 20 seconds).

### 3.2 `op=claim`: the study code and the arms, at the end of intake

`?op=claim&study=S&sid=SID&code=K7M4PX&platform=iphone&version=standard&homes=score,day&histories=calendar,list&weeks=card,strip&orders=5&callback=cb`

```json
{ "ok": true, "code": "K7M4PX", "home": "day", "history": "calendar", "week": "card", "order": 3 }
```

- `code` must pass its check character (section 5), else `bad_code`. If another `sid` holds it: `code_taken`, and the
  phone draws another code and claims again.
- The same `sid` claiming again (a retry, or a new code after a lost response) gets back the code and arms it already
  holds, whatever `code` it sends.
- The arms come from a balanced list per `platform` (`iphone`, `android`; `other` shares Android's): the options in
  `homes`, `histories` and `weeks` (one to four each, as given) and `order` from 1 to `orders`. Within each platform,
  each block of `lcm` sessions sees each option of an arm equally often, and each block of `orders` sessions sees each
  order once. Keep one counter per platform and arm, so the arms cross rather than move together.
- For `version=easy`, `home` and `week` come back as `""` and don't count toward their balance; `history` and `order`
  do.
- The script writes `code`, `platform`, the arms and `assigned: "script"` onto the sessions row.

If the phone can't reach the script in 8 seconds, it picks at random, uses its own code, and the next `session` piece
says `assigned: "phone"`. A later claim isn't made for that session.

### 3.3 `op=lookup`: the code typed in the installed app on iPhone

`?op=lookup&study=S&code=K7M4PX&callback=cb`

```json
{ "ok": true, "sid": "Qx7...24 chars", "code": "K7M4PX", "stage": "install", "version": "standard", "person": "sarah",
  "home": "score", "history": "calendar", "week": "card", "order": 3, "easy_by_age": false }
```

`bad_code` when the check character fails, `unknown` when no session holds it. The script returns what the sessions row
holds; `easy_by_age` is optional and may be omitted. Rate limit lookups to 20 a minute from all callers together for
codes that come back `unknown`, so guessing codes is slow.

### 3.4 `op=token`: the thank-you code arrived

`?op=token&study=S&t=TOKEN&callback=cb`

```json
{ "ok": true, "have": true }
```

### 3.5 `op=followup`: the follow-up contact arrived (only when `followUp` is on)

`?op=followup&study=S&n=NONCE&callback=cb`

```json
{ "ok": true, "have": true }
```

### 3.6 `op=ping`: the study is open

`?op=ping&study=S&callback=cb`

```json
{ "ok": true, "open": true }
```

`open: false` after the study is closed on the script's side; the phone then says the study has closed.

## 4. What the script checks

### 4.1 Duplicates

A session piece is identified by `sid`, `cid` and `seq`. The script keeps a ledger of every (`sid`, `cid`, `seq`) it
has accepted (a hidden tab, or script properties: the back end's choice) and drops a piece it already holds, under a
lock (`LockService.getScriptLock()`), so two retries arriving together write one row. The ledger holds no token and no
follow-up contact.

### 4.2 Validation

- `study` is known (a list in the script), with or without `-test`.
- The envelope's fields match section 2.1. `code`, where present, passes its check character.
- `kind` is known; `qid`, `type`, `name`, `screen`, `outcome` and every field with a fixed list match their lists.
  An unknown field is dropped; a field of the wrong type drops the piece.
- Any text field over 1,000 characters is cut to 1,000.
- Rate: more than 60 pieces a minute, or 1,500 in all, from one `sid`, and the rest are dropped (the phone's `ack`
  then never covers them, so it stops after 1,500 too).

### 4.3 Words

The phone scrubs every box before it's sent: email addresses and phone numbers (7 or more digits, with spaces, dots,
dashes or brackets between) become `[removed]`. The script does the same again on `words`, `question`, `answer` and
`target`. A follow-up piece's `contact` is exempt: it is the contact, and it is kept apart (section 6).

## 5. The study code

Six characters from the alphabet `ACDEFHJKMNPRTWXY34679` (21 characters, in that order: index 0 is `A`, index 20 is
`9`). Five are random; the sixth is a Luhn mod 21 check character. The phone shows it as `K7M 4PX`; it accepts lower
case and spaces when typed, and sends it as six upper-case characters.

Making the check character, over the five payload characters:

```
n = 21; factor = 2; sum = 0
for i from 4 down to 0:
  a = factor * index(payload[i])
  factor = (factor == 2) ? 1 : 2
  sum += floor(a / n) + (a % n)
check = alphabet[(n - (sum % n)) % n]
```

Checking a whole code: run the same loop over all six characters from the right, starting with `factor = 1`; the code
is good when `sum % n == 0`. `focus/js/focus.js` has both as `FX.code.make()` and `FX.code.ok(code)`.

The `sid` is separate: 24 random characters from `A-Z a-z 0-9 _ -`, made with `crypto.getRandomValues` at consent. The
code is only a lookup that resolves to it.

## 6. The unlinked pieces: the recruiter's sheet

Posted alone, one per POST, with no envelope, a few seconds apart from any session piece:

```json
{ "v": 1, "pieces": [ { "kind": "token", "study": "florin-fg-1", "token": "TQ4KX7MC" } ] }
{ "v": 1, "pieces": [ { "kind": "followup", "study": "florin-fg-1", "n": "k3j9x2mq", "contact": "as typed", "week": "2026-10-26" } ] }
```

| Field | Rule |
|---|---|
| `token` | 8 characters from the code alphabet. The script writes it to the recruiter's sheet, tab `tokens`, one column, at a random row (insert a row at a random position), with no time, no `sid` and nothing else |
| `n` | A random nonce, `^[a-z0-9]{8}$`, only so the phone can confirm it arrived. Not written to the sheet |
| `contact` | As typed, at most 200 characters. Tab `followup`: `week` and `contact` only |
| `week` | The Monday of the week it was left, `YYYY-MM-DD` |

The script keeps each `token` once (drop a repeat) and answers `op=token` from the tokens tab. The phone retries the
token with the rest of the queue until `op=token` says `have: true`.

## 7. Lists

### 7.1 Question ids (`qid`)

Intake: `IN1` to `IN9`. Tasks: `TE`, `TR`, `BM1`, `BM2`, `WK1`, `WK2`, `WK3`, `SC1`, `SC2`, `PT1`, `IV1`, `IV2`, `CK1`,
`HI1`, `AS1`, `SKIP`. Tour: `TW`. Comparisons: `CP1`, `CP2`, `CP3`, `CP3b`. Install: `IS1`, `IS2`. Exit: `EX1`, `SUS1`
to `SUS10`, `TR1`, `TR2`, `TR2b`, `TR3`, `TR4`, `TR4b`, `FV1`, `FV2`, `FR1`, `FR2`, `MS1`, `MS2`, `TX1`, `TX2`, `US1`,
`US2`, `US3`, `FV3`, `VA2`, `VA3`, `MG1`, `MG2`, `LS1`.

`SKIP` is the answer to "Why are you skipping?" on a task (its `value`: `stuck`, `declined`, `broken`).

### 7.2 Option codes (`value`)

Each option has a short code, sent in `value`; the words shown go in `answer`. Scales send their number. The codes for
every question are in `focus/js/questions.js` (`FXQ`), the one place the words live.

### 7.3 Screen keys (`screen`)

`today`, `home-day`, `ez-today`, `plus`, `earlier`, `bm`, `ez-bm`, `sym`, `meal`, `ck`, `ckdone`, `ckday`, `insights`,
`ez-weeks`, `i-score`, `i-timing`, `i-often`, `i-form`, `i-sym`, `i-ck`, `i-pat`, `i-pattern`, `i-days`, `history`,
`hist-cal`, `ask`, `ask-about`, `pay`, `pf`, `profile`, `a sheet`, `other`. The phone maps any other key to `other`, and
`ask-alarm`, `ask-chat` to `ask`; the flag note, No BM and the alarm sheets read `a sheet`.

### 7.4 Action names (`name` for `type: "act"`)

`tab`, `plus`, `profile`, `idetail`, `iback`, `edit`, `undo`, `quick-bm`, `vr-quick`, `open-bm`, `save-bm`, `open-sym`,
`open-meal`, `ck-start`, `ck-finish`, `ck-skip`, `vr-cal-day`, `vr-cal-m`, `ask-about`, `askx-ask`, `askx-send`,
`pay`, `pay-start`, `hmore`, `hfilter`, `irange`, `close`, `fx-wkday`. `flag-report`, `flag-undo` and `nobm` read
`a sheet` or `a log`; anything else reads `other`.

## 8. What never travels

The content of anything logged or typed in the app (BM words, details, the flag, symptoms and their strength, meals,
notes, check-in answers, Ask Florin's questions and answers, Profile answers), names, emails, phone numbers (except the
optional follow-up, unlinked), location, IP addresses, device ids, the user agent string. The phone parses the user
agent into `platform`, `os` and `browser` and sends only those.

## Back end asks (agreed, and folded into sections 2.2 and 2.5)

From the back end (`focus/apps-script/Code.gs`, `focus/mock-endpoint.js`). Everything else in this file is what the
script does, as written.

1. **A comment's CM1 words travel as `cm_kind`, not `kind`.** `kind` is already the piece's kind (`"comment"`), so the
   two can't share a field. Send the same words, joined with ` | `, as `cm_kind`, on `add` and on `edit`; the script
   writes them to the `kind` column of the comments tab.
2. **`sus` can end in .5.** The score is the sum times 2.5 (72.5, say), so the script takes 0 to 100 with one decimal.
   Send it as computed, unrounded.
