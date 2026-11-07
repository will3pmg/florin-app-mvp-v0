/* Florin handoff inventory: every screen to hand to the developer, its states, and how to reach each on the prototype.
   claude/Florin handoff.md is the same list in words; handoff/capture.js shoots it.

   A flow: { id, name, later?, matrix?, set?, screens }. later: true flows (Insights, after its rebuild) run only with
   --all or --flows. A screen: { id, name, steps, matrix?, set?, states?, noBase?, pending?, crop?, scroll? }.
   - matrix: the axes the base state is shot on. data: est (12 weeks), new (day 5, learning), fresh (just joined, day 0);
     plan: member, free; theme: light, dark. A state's matrix defaults to 12 weeks, Member, light and dark.
   - set: decisions (and the Person and Demo person's meals controls) for the screen, by the left bar's data-rx keys.
     Everything else is at the defaults below: the recommended option of each decision, as the page ships.
   - steps: how to get there, in order. { open: screenId } (the Screens row, else api.open), { click: css, nth? }
     (inside the phone), { act: name, data }, { add: entry | [entries] } (a log, `ago` days back, today by default),
     { eval: "body" } (api, L, RU, EXT), { type: [css, text] }, { set: { k: v } }, { tab }, { scroll }, { wait }.
   - a state: { id, name, steps, before?, replace?, matrix?, set? }. Its steps run after the screen's (before: ahead of
     them; replace: instead of them).
   - pending: a screen being built in another session; listed, not shot (capture --rows shoots any new Screens row).
   Days: L.TODAY is day 90, Sunday, Oct 11, 7:40 PM. Sarah's Wednesday (ago 4) carries the note "some red in it"; Thursday
   (ago 3) has nothing logged; Monday, Sep 21 (ago 20) has 5 BMs. */
const D = { flag: { kind: "bm", t: 19.5, form: 4, flags: { blood: true } }, tar: { kind: "bm", t: 19.5, form: 4, note: "It looked like tar" } };
const step = (n, answers) => ({ eval: `const o = api.top(); if (o && o.st) { o.st.step = ${n}; ${answers ? `o.st.answers = ${JSON.stringify(answers)};` : ""} api.rerender(o); }` });
const onbStep = (n) => ({ eval: `const o = api.top(); if (o && o.st) { o.st.step = ${n}; api.rerender(o); }` });
const pay = (from) => ({ eval: `api.push("pay", { from: ${JSON.stringify(from)} }, { instant: true });` });
const range = (n) => ({ eval: `api.S.ins.range = ${n}; api.renderTab(true);` });
const SHORT = ["welcome", "name", "brings", "goals", "periods", "rem", "isnt", "ready"];
const FULL = ["welcome", "name", "about", "brings", "goals", "usual", "sym", "eat", "stress", "foods", "meds", "cond", "research", "ready"];
const BOTH = { plan: ["member", "free"], theme: ["light", "dark"] };

module.exports = {
  /* the recommended option of every decision (claude/Florin decisions.md), as data-v on the left bar */
  defaults: { persona: "sarah", decisions: { form: "C", bmUI: "quick", home: "compact", history: "calendar", checkin: "true", mealUI: "quick", look: "built", easy: "false", onboard: "short", askUI: "pill" } },
  matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] },
  flows: [
    /* ------------------------------------------------------------------------------------------------ 1. Home */
    {
      id: "home", name: "Home (Compact)",
      screens: [
        {
          id: "today", name: "Today, Compact", steps: [{ open: "home-compact" }],
          matrix: { data: ["est", "new", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [
            { id: "flagged", name: "A flagged today (blood on a BM): the Teal note under the strip", before: [{ add: D.flag }], matrix: BOTH },
            { id: "alarm-note", name: "An alarm word in a BM's note (\"It looked like tar\")", before: [{ add: D.tar }] },
            { id: "flag-sheet", name: "The flag note opened from the Teal note: When to see a clinician, Make a report", before: [{ add: D.flag }], steps: [{ click: '[data-act="vr-cp-flag"]' }], matrix: BOTH },
            { id: "no-score", name: "No score today: nothing on 2 of the last 3 days", before: [{ eval: "[89, 88].forEach((d) => { const x = L.day(api.M(), d); if (x) { x.entries = []; x.logged = false; } });" }], matrix: BOTH },
            { id: "past-day", name: "A past day picked (Wednesday)", steps: [{ click: '[data-act="vr-cp-day"][data-v="86"]' }] },
            { id: "gap-day", name: "A day with nothing logged picked: + Add", steps: [{ click: '[data-act="vr-cp-day"][data-v="87"]' }] },
            { id: "busy-day", name: "A day with 5 BMs (Monday, Sep 21), two weeks back", steps: [{ click: '[data-act="vr-cp-wk"][data-v="-1"]' }, { click: '[data-act="vr-cp-wk"][data-v="-1"]' }, { click: '[data-act="vr-cp-day"][data-v="70"]' }] },
            { id: "last-week", name: "Last week, with Today to come back", steps: [{ click: '[data-act="vr-cp-wk"][data-v="-1"]' }], matrix: BOTH },
            { id: "legend", name: "The legend open (info button)", steps: [{ click: '[data-act="vr-cp-lg"]' }] },
            { id: "ck-skipped", name: "Check-in skipped: the row gone, the toast with Undo", steps: [{ click: '[data-act="ck-skip"]' }, { scroll: 0 }] },
            { id: "ck-off", name: "Weekly check-in Off", set: { checkin: "false" } },
            { id: "score-sheet-free", name: "Free: the strip's number opens the paywall", steps: [{ click: '.vr-cp-sc [data-act], .vr-cp-n[data-act], [data-act="pay"]' }], matrix: { plan: ["free"], theme: ["light", "dark"] } }
          ]
        },
        { id: "avatar", name: "Today's avatar opens Profile", noBase: true, steps: [{ open: "home-compact" }], states: [{ id: "profile", name: "Profile from the avatar", steps: [{ click: '[data-act="profile"]' }], matrix: { theme: ["light"] } }] },
        /* the other Home options, for reference until Will locks Home */
        { id: "score-first", name: "Today, Score first (alternative)", steps: [{ open: "today" }], matrix: { data: ["est", "new"], plan: ["member"], theme: ["light", "dark"] },
          states: [{ id: "flagged", name: "A flagged today", before: [{ add: D.flag }] }] },
        { id: "day-first", name: "Today, Day first (alternative)", steps: [{ open: "home-day" }], matrix: { data: ["est", "new"], plan: ["member"], theme: ["light", "dark"] },
          states: [{ id: "flagged", name: "A flagged today", before: [{ add: D.flag }] }] }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 2. Logging */
    {
      id: "logging", name: "Logging",
      matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
      screens: [
        {
          id: "plus", name: "Plus menu", steps: [{ open: "plus" }], matrix: { data: ["est", "new", "fresh"], plan: ["member"], theme: ["light", "dark"] },
          states: [
            { id: "full-form", name: "BM logging: Full form only (one Log a BM row)", set: { bmUI: "full" } },
            { id: "one-meal", name: "Meal sheet: One meal at a time (Meal row)", set: { mealUI: "detailed" }, matrix: { theme: ["light"] } },
            { id: "ck-off", name: "Weekly check-in Off", set: { checkin: "false" }, matrix: { theme: ["light"] } },
            { id: "form-A", name: "Consistency A (1 to 7)", set: { form: "A" }, matrix: { theme: ["light"] } },
            { id: "form-B", name: "Consistency B (five words)", set: { form: "B" }, matrix: { theme: ["light"] } },
            { id: "free", name: "Free (same as Member)", matrix: { plan: ["free"], theme: ["light"] } }
          ]
        },
        {
          id: "quick-save", name: "One-tap BM save", noBase: true, steps: [{ open: "plus" }],
          states: [
            { id: "saved-toast", name: "A tile tapped: BM saved, with Add details and Undo", steps: [{ click: '[data-act="quick-bm"]', nth: 3 }, { wait: 300 }] },
            { id: "undone", name: "Undo: Undone.", steps: [{ click: '[data-act="quick-bm"]', nth: 3 }, { wait: 300 }, { click: '.ap-tst [data-act="undo"]' }] },
            { id: "first-bms", name: "Before 5 BMs, a tile opens the form with it picked", matrix: { data: ["fresh"], theme: ["light", "dark"] }, steps: [{ click: '[data-act="open-bm"][data-form]', nth: 3 }] }
          ]
        },
        {
          id: "bm", name: "Log a BM (the form)", steps: [{ open: "bm" }], matrix: { data: ["est", "fresh"], plan: ["member"], theme: ["light", "dark"] },
          states: [
            { id: "picked", name: "A tile picked: Save on", steps: [{ click: '.ap-fsh [data-form="6"]' }] },
            { id: "details", name: "Details filled in", replace: true, steps: [{ open: "bm-details" }] },
            { id: "flag-picked", name: "Blood ticked: the info line", steps: [{ click: '.ap-fsh [data-form="4"]' }, { click: '[data-act="flag"][data-v="blood"]' }, { scroll: "end" }] },
            { id: "form-A", name: "Consistency A tiles", set: { form: "A" }, matrix: { theme: ["light"] } },
            { id: "form-B", name: "Consistency B tiles", set: { form: "B" }, matrix: { theme: ["light"] } },
            { id: "guide", name: "How to pick (i)", replace: true, steps: [{ open: "guide" }] },
            { id: "saved", name: "Saved: the toast with Undo", steps: [{ click: '.ap-fsh [data-form="4"]' }, { click: '[data-act="save-bm"]' }, { wait: 300 }] },
            { id: "kept", name: "Closed half filled: Not saved yet", steps: [{ click: '.ap-fsh [data-form="4"]' }, { click: '.ap-fsh [data-act="close"]' }, { wait: 300 }] },
            { id: "edit", name: "An entry reopened from Today: Edit BM, Delete", replace: true, steps: [{ open: "home-compact" }, { click: '.ap-layer [data-act="edit"]' }] },
            { id: "deleted", name: "Deleted, with Undo", replace: true, steps: [{ open: "home-compact" }, { click: '.ap-layer [data-act="edit"]' }, { click: '[data-act="delete"]' }, { wait: 300 }] }
          ]
        },
        {
          id: "flag", name: "After a flagged log", steps: [{ open: "flag" }], matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [
            { id: "alarm-note", name: "An alarm word in the note opens the same note", replace: true, steps: [{ open: "bm" }, { click: '.ap-fsh [data-form="4"]' }, { type: ['[data-in="note"]', "It looked like tar"] }, { click: '[data-act="save-bm"]' }, { wait: 300 }] },
            { id: "report", name: "Make a report: Ask on the clinician path", steps: [{ click: '[data-act="flag-report"]' }, { wait: 600 }], matrix: { plan: ["member", "free"], theme: ["light"] } }
          ]
        },
        {
          id: "nobm", name: "No BM today", noBase: true, steps: [{ open: "plus" }],
          states: [
            { id: "offered", name: "Plus with nothing logged today, after 5 PM: Log no BM today", matrix: { data: ["fresh"], theme: ["light", "dark"] } },
            { id: "logged", name: "Logged at once: the No BM row and the toast with Undo", steps: [{ click: '[data-act="nobm"]' }, { wait: 300 }], matrix: { data: ["fresh"], theme: ["light", "dark"] } },
            { id: "sheet", name: "The No BM row tapped: Log a BM instead, Take it back", steps: [{ click: '[data-act="nobm"]' }, { wait: 300 }, { click: '.ap-layer [data-act="edit"]' }], matrix: { data: ["fresh"], theme: ["light", "dark"] } }
          ]
        },
        {
          id: "earlier", name: "Log for an earlier day", steps: [{ open: "earlier" }], matrix: { data: ["est", "fresh"], plan: ["member"], theme: ["light", "dark"] },
          states: [
            { id: "plus-for-day", name: "Plus for Thursday (a gap): Catching up", steps: [{ click: '[data-act="plus-day"][data-v="87"]' }] },
            { id: "bm-for-day", name: "Log a BM for Thursday", steps: [{ click: '[data-act="plus-day"][data-v="87"]' }, { click: '.ap-pbm [data-act="open-bm"]' }] }
          ]
        },
        {
          id: "sym", name: "Log symptoms", steps: [{ open: "sym" }],
          states: [
            { id: "empty", name: "Opened from plus, nothing picked", replace: true, steps: [{ open: "plus" }, { click: '[data-act="open-sym"]' }] },
            { id: "own", name: "Something else: adding your own", steps: [{ click: '[data-act="sym-other"]' }, { type: ['[data-in="newsym"]', "Heartburn"] }] },
            { id: "alarm-note", name: "A sign typed in the note", steps: [{ type: ['[data-in="note"]', "I've had a fever since last night"] }, { scroll: "end" }] },
            { id: "saved", name: "Saved: the toast", steps: [{ click: '[data-act="save-sym"]' }, { wait: 300 }] }
          ]
        },
        {
          id: "meal", name: "What you ate (Quick, voice or text)", steps: [{ open: "meal" }],
          states: [
            { id: "typed", name: "Typed: foods counted as you type", steps: [{ type: ['textarea', "Oatmeal for breakfast, a chicken salad, pizza for dinner"] }] },
            { id: "said", name: "Said: what you said, foods counted", replace: true, steps: [{ open: "meal-voice" }] },
            { id: "saved", name: "Saved: the toast", replace: true, steps: [{ open: "meal-voice" }, { click: '[data-act="save-meal"]' }, { wait: 300 }] }
          ]
        },
        {
          id: "meal-one", name: "Meal (One meal at a time, alternative)", set: { mealUI: "detailed" }, steps: [{ open: "meal" }], matrix: { data: ["est"], plan: ["member"], theme: ["light"] },
          states: [{ id: "typed", name: "Typed", steps: [{ type: ['textarea', "Pizza and a salad"] }] }]
        },
        /* being built in another session as this is written: shot as it stands, to be shot again when it settles */
        { id: "meal-photo", name: "What you ate, from a photo (in progress)", wip: true, steps: [{ open: "meal-photo" }], matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
          states: [{ id: "free", name: "Free", replace: true, steps: [{ open: "meal-photo-free" }], matrix: { plan: ["free"], theme: ["light"] } }] }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 3. History */
    {
      id: "history", name: "History",
      screens: [
        {
          id: "calendar", name: "History, Calendar", steps: [{ open: "hist-cal" }],
          matrix: { data: ["est", "new", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [
            { id: "day-picked", name: "A past day tapped (Wednesday)", steps: [{ click: '[data-act="vr-cal-day"][data-v="86"]' }, { scroll: ".vr-cal-day" }] },
            { id: "gap-picked", name: "A day with nothing logged: Add to this day", steps: [{ click: '[data-act="vr-cal-day"][data-v="87"]' }, { scroll: ".vr-cal-day" }] },
            { id: "prev-month", name: "September", steps: [{ click: '[data-act="vr-cal-m"][data-v="-1"]' }] },
            { id: "busy-day", name: "A day with 5 BMs (Sep 21)", steps: [{ click: '[data-act="vr-cal-m"][data-v="-1"]' }, { click: '[data-act="vr-cal-day"][data-v="70"]' }, { scroll: ".vr-cal-day" }] },
            { id: "held-free", name: "Free: a day before the last 7, only logged", steps: [{ click: '[data-act="vr-cal-day"][data-v="80"]' }, { scroll: ".vr-cal-day" }], matrix: { plan: ["free"], theme: ["light", "dark"] } },
            { id: "filter-bms", name: "Filter: BMs", steps: [{ click: '[data-act="hfilter"]', nth: 1 }] },
            { id: "flagged", name: "A flagged today", before: [{ add: D.flag }] },
            { id: "report", name: "Make a report for your clinician (top row): a toast on Member, the paywall on Free", steps: [{ click: '.ap-layer .ap-hist-rep' }, { wait: 300 }], matrix: { plan: ["member", "free"], theme: ["light"] } }
          ]
        },
        { id: "list", name: "History, List (alternative)", steps: [{ open: "history" }], matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] } }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 4. Weekly check-in */
    {
      id: "checkin", name: "Weekly check-in",
      matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
      screens: [
        { id: "card", name: "Due, on Today", steps: [{ open: "ck-card" }], matrix: { data: ["est", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [{ id: "score-first", name: "On Score first's Today (alternative)", replace: true, steps: [{ open: "today" }, { open: "ck-card" }], matrix: { theme: ["light"] } }] },
        { id: "q1", name: "Question 1 of 4", steps: [{ open: "ck" }], states: [{ id: "picked", name: "An answer picked", steps: [{ click: '[data-act="ck-ans"]', nth: 1 }], matrix: { theme: ["light"] } }] },
        { id: "q2", name: "Question 2 of 4", steps: [{ open: "ck" }, step(1, [1, null, null, null])] },
        { id: "q3", name: "Question 3 of 4", steps: [{ open: "ck" }, step(2, [1, 0, null, null])] },
        { id: "q4", name: "Question 4 of 4", steps: [{ open: "ck" }, step(3, [1, 0, 1, null])] },
        { id: "extra", name: "Anything else (tags and a note)", steps: [{ open: "ck-last" }],
          states: [{ id: "tagged", name: "Tags picked", steps: [{ click: '[data-act="ck-tag"]', nth: 0 }, { click: '[data-act="ck-tag"]', nth: 3 }], matrix: { theme: ["light"] } }] },
        { id: "saved", name: "Saved: this week next to your first weeks", steps: [{ open: "ckdone" }], matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] } },
        { id: "due-day", name: "When it's due (sheet)", steps: [{ open: "ckday" }] },
        { id: "first", name: "The first check-in (just joined)", steps: [{ open: "ck" }], matrix: { data: ["fresh"], plan: ["member"], theme: ["light"] } }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 5. Ask Florin */
    {
      id: "ask", name: "Ask Florin",
      screens: [
        { id: "opening", name: "The Ask tab: the opening read", steps: [{ open: "ask" }], matrix: { data: ["est", "new", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] } },
        {
          id: "turn", name: "A conversation", steps: [{ open: "ask-chat" }], matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
          states: [
            { id: "looked-open", name: "Looked at N things, unfolded", steps: [{ click: '.ap-layer details summary, .ap-layer [aria-expanded="false"]' }], matrix: { theme: ["light"] } },
            { id: "second", name: "A second turn (yes to the question)", steps: [{ type: [".ap-askx-in", "yes"] }, { act: "askx-send" }, { wait: 400 }, { scroll: "end" }] },
            { id: "option", name: "An option row tapped", steps: [{ click: '[data-act="askx-ask"]' }, { wait: 400 }, { scroll: "end" }], matrix: { theme: ["light"] } },
            { id: "rated", name: "Thumbs up", steps: [{ scroll: "end" }, { click: '[data-act="askx-rate"][data-v="up"]' }], matrix: { theme: ["light"] } },
            { id: "redirect", name: "A question to diagnose: the fixed redirect", steps: [{ type: [".ap-askx-in", "Do I have IBS?"] }, { act: "askx-send" }, { wait: 400 }, { scroll: "end" }] },
            { id: "learning", name: "While learning (day 5)", matrix: { data: ["new"], theme: ["light"] } }
          ]
        },
        { id: "alarm", name: "A sign that needs a clinician", steps: [{ open: "ask-alarm" }], matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
          states: [{ id: "end", name: "Scrolled to Make a report", steps: [{ scroll: "end" }] }] },
        { id: "from-flag", name: "Make a report, from the flag note", noBase: true, steps: [{ open: "flag" }, { click: '[data-act="flag-report"]' }, { wait: 600 }],
          states: [{ id: "member", name: "Member: the clinician answer" }, { id: "free", name: "Free: the paywall (report)", matrix: { plan: ["free"], theme: ["light"] } }] },
        { id: "card", name: "Asked from a card (Ask about this)", steps: [{ open: "ask-about" }], matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] } },
        { id: "knows", name: "What Ask Florin knows", steps: [{ open: "ask-mem" }], matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
          states: [
            { id: "left-out", name: "Today's logs left out", steps: [{ click: '[data-act="askx-forget"]', nth: 1 }], matrix: { theme: ["light"] } },
            { id: "reach-on", name: "Let Ask Florin start a conversation: on", steps: [{ click: '[data-act="askx-reach"]' }, { scroll: "end" }], matrix: { theme: ["light"] } }
          ] },
        { id: "free", name: "Free: the locked tab", steps: [{ open: "free-ask" }], matrix: { data: ["est", "fresh"], plan: ["free"], theme: ["light", "dark"] } },
        { id: "ask-button", name: "Ask about this, the six styles", pending: "Ask button styles A to F wait on Will's pick (options/ask/); another session is restyling them now" }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 6. Onboarding */
    {
      id: "onboarding", name: "Onboarding",
      matrix: { data: ["fresh"], plan: ["member"], theme: ["light", "dark"] },
      screens: [
        { id: "short", name: "Short (8 steps)", noBase: true, steps: [{ open: "onb-short" }],
          states: SHORT.map((k, i) => ({ id: `${i + 1}-${k}`, name: `Step ${i + 1} of ${SHORT.length}: ${k}`, steps: [onbStep(i)], matrix: { data: ["fresh"], theme: ["light", "dark"] } }))
            .concat([{ id: "1-welcome-easy", name: "Welcome, Larger text turned on", steps: [{ click: '[data-act="onb-easy"]' }], matrix: { data: ["fresh"], theme: ["light"] } }]) },
        { id: "full", name: "Full survey (14 steps, alternative)", noBase: true, set: { onboard: "full" }, steps: [{ open: "onb-full" }],
          states: FULL.map((k, i) => ({ id: `${i + 1}-${k}`, name: `Step ${i + 1} of ${FULL.length}: ${k}`, steps: [onbStep(i)], matrix: { data: ["fresh"], theme: ["light"] } })) },
        { id: "sign", name: "A sign that needs a clinician, on the step", steps: [{ open: "onb-sign" }], set: { onboard: "full" } }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 7. Profile */
    {
      id: "profile", name: "Profile and settings",
      matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
      screens: [
        { id: "profile", name: "Profile", steps: [{ open: "profile" }], matrix: { data: ["est", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [{ id: "day1", name: "Profile on day 1", replace: true, steps: [{ open: "profile-day1" }], matrix: { data: ["fresh"], theme: ["light", "dark"] } }] },
        { id: "reminder", name: "BM reminder (sheet)", steps: [{ open: "profile" }, { click: '[data-act="pf-rem"]' }] },
        { id: "answer", name: "An answer reopened (Save, Clear my answer)", steps: [{ open: "profile" }, { click: '[data-act="pf-edit"]' }] },
        { id: "info", name: "Connected apps, help (sheet)", steps: [{ open: "profile" }, { click: '[data-act="pf-app"], [data-act="pf-info"]' }] },
        { id: "delete-logs", name: "Delete my logs (asks first)", steps: [{ open: "profile" }, { click: '[data-act="pf-del"]' }] },
        { id: "delete-account", name: "Delete my account (asks first)", steps: [{ open: "profile" }, { click: '[data-act="pf-delacct"]' }], matrix: { data: ["est"], plan: ["member"], theme: ["light"] } },
        /* being built in another session as this is written: shot as it stands, to be shot again when it settles */
        { id: "easy-settings", name: "Easy view settings (in progress)", wip: true, steps: [{ open: "ez-set" }], matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
          states: [{ id: "easy-on", name: "With Easy on", set: { easy: "true" } }] }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 8. Easy version */
    {
      id: "easy", name: "Easy version",
      set: { easy: "true" },
      matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
      screens: [
        { id: "today", name: "Easy: Today", steps: [{ open: "ez-today" }], matrix: { data: ["est", "new", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [{ id: "flagged", name: "A flagged today: the Teal note leads", before: [{ add: D.flag }] }] },
        { id: "plus", name: "Easy: Add (plus)", steps: [{ open: "ez-today" }, { open: "plus" }] },
        { id: "bm", name: "Easy: log a BM", noBase: true, steps: [{ open: "ez-bm" }],
          states: [
            { id: "1-look", name: "Step 1: what did it look like" },
            { id: "2-when", name: "Step 2: when", steps: [{ click: '[data-act="ez-form"]', nth: 3 }, { wait: 700 }] },
            { id: "3-else", name: "Step 3: anything else", steps: [{ click: '[data-act="ez-form"]', nth: 3 }, { wait: 700 }, { click: '[data-act="ez-when"]' }, { wait: 700 }] },
            { id: "4-save", name: "Step 4: check and save", steps: [{ click: '[data-act="ez-form"]', nth: 3 }, { wait: 700 }, { click: '[data-act="ez-when"]' }, { wait: 700 }, { click: '[data-act="ez-next"]', optional: true }, { wait: 300 }, { click: '[data-act="ez-next"]', optional: true }, { wait: 300 }] }
          ] },
        { id: "sym", name: "Easy: something feels off", steps: [{ open: "ez-today" }, { open: "plus" }, { click: '[data-act="open-sym"]' }] },
        { id: "meal", name: "Easy: what I ate", steps: [{ open: "ez-today" }, { open: "plus" }, { click: '[data-act="open-meal"]' }] },
        { id: "history", name: "Easy: History", steps: [{ open: "hist-cal" }], matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] } },
        { id: "ask", name: "Easy: Ask Florin", steps: [{ open: "ask" }], matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] } },
        { id: "weeks", name: "Easy: Your weeks (Insights folded under Today)", steps: [{ open: "ez-today" }, { tab: "insights" }], matrix: { data: ["est"], plan: ["member", "free"], theme: ["light", "dark"] } }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 9. Membership */
    {
      id: "membership", name: "Membership",
      matrix: { data: ["est"], plan: ["free"], theme: ["light", "dark"] },
      screens: [
        { id: "paywall", name: "The paywall", steps: [{ open: "pay" }],
          states: ["score", "range", "pat", "ask", "report"].map((f) => ({ id: `from-${f}`, name: `Opened from ${f}`, replace: true, steps: [{ tab: "today" }, pay(f)], matrix: { plan: ["free"], theme: ["light"] } })) },
        { id: "started", name: "Start membership (demo: membership on)", noBase: true, steps: [{ open: "pay" }, { click: '[data-act="pay-start"]' }, { wait: 300 }], states: [{ id: "toast", name: "Membership on: the toast", matrix: { plan: ["free"], theme: ["light"] } }] }
      ]
    },
    /* ------------------------------------------------------------------------------------------------ 10. Insights, after the rebuild */
    {
      id: "insights", name: "Insights (after the rebuild)", later: true,
      matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] },
      screens: [
        { id: "insights", name: "Insights", steps: [{ open: "insights" }], matrix: { data: ["est", "new", "fresh"], plan: ["member", "free"], theme: ["light", "dark"] },
          states: [{ id: "7", name: "7 days", steps: [range(7)] }, { id: "90", name: "90 days", steps: [range(90)] }, { id: "picks", name: "Will's picks", set: { look: "picks" } }, { id: "flagged", name: "A flagged today", before: [{ add: D.flag }] }, { id: "meals-rough", name: "Meals only with symptoms: patterns held back", set: { meals: "rough" } }] },
        ...[["i-score", "FloraScore"], ["i-days", "Your days"], ["i-timing", "Timing"], ["i-often", "How often"], ["i-form", "Form"], ["i-sym", "Symptoms"], ["i-ck", "Check-in trend"], ["i-pat", "Possible patterns"], ["i-pattern", "One pattern"]].map(([id, name]) => ({
          id, name: `${name}, the detail`, steps: [{ open: id }],
          states: [{ id: "7", name: "7 days", steps: [range(7)], matrix: { theme: ["light"] } }, { id: "90", name: "90 days", steps: [range(90)], matrix: { theme: ["light"] } }, { id: "learning", name: "While learning", matrix: { data: ["new"], theme: ["light"] } }]
        })),
        { id: "free", name: "Insights on Free (7 days, teasers blurred)", steps: [{ open: "free-insights" }], matrix: { data: ["est"], plan: ["free"], theme: ["light", "dark"] } },
        { id: "look-insights", name: "Data style: Insights (the style picked)", steps: [{ open: "look-insights" }], set: { look: "picks" }, matrix: { data: ["est"], plan: ["member"], theme: ["light", "dark"] } },
        { id: "look-today", name: "Data style: Today (Score first in the style picked)", steps: [{ open: "look-today" }], matrix: { data: ["est"], plan: ["member"], theme: ["light"] } }
      ]
    }
  ]
};
module.exports.SHORT = SHORT;
module.exports.FULL = FULL;
