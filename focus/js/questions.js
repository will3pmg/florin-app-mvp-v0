/* Florin focus group test: every word a participant reads in the study's own screens, in one place. window.FXQ
   From claude/Florin focus group plan.md, sections 3 and 4, word for word, with two changes for the claims rules
   (claims-rules.js): TR2 asks whether anything "named a condition" rather than "sounded like a diagnosis", and the
   SUS attribution line keeps the paper's title. Rules for every word: no medical claims; never normal, healthy,
   improving or worsening; no em or en dashes, no exclamation points, no humour; no licensed scale named; FloraScore
   one word; Ask Florin.
   A question: { id, q (text or (c) => text), type: one | many | box | scale, opts: [[code, words], ...], last: codes
   that stay last when the options are shuffled, shuffle, max, box (the option code that opens a box), excl (a code
   that clears the others), lo, hi (a scale's end labels), n (a scale's length) }. c is the context: the demo person's
   name and the live figures, filled in when the question shows. */
(function () {
  const AGREE = [["1", "Strongly disagree"], ["2", "Disagree"], ["3", "Neither agree nor disagree"], ["4", "Agree"], ["5", "Strongly agree"]];
  const COMFORT = [["1", "Very uncomfortable"], ["2", "Somewhat uncomfortable"], ["3", "Neither"], ["4", "Somewhat comfortable"], ["5", "Very comfortable"]];
  const OFTEN = [["every", "Every day"], ["most", "Most days"], ["off", "Only on days something feels off"], ["now", "Now and then"], ["never", "I wouldn't"]];
  const PARTS = (c) => [["bm", "Logging a BM"], ["score", "FloraScore"], ["week", "The last 7 days on Today"], ["cards", c.easy ? "The cards in Your weeks" : "The Insights cards, apart from Possible patterns"], ["patterns", "Possible patterns"], ["checkin", "The weekly check-in"], ["history", "History"], ["ask", "Ask Florin"]].filter(([k]) => k !== "checkin" || c.checkin);

  const intake = [
    { id: "IN1", q: "What would you most want from an app for your gut? Pick one.", type: "one", opts: [["pattern", "To see what tends to come before a rough day"], ["simple", "Something simple, with big buttons and plain words"], ["stack", "To fit in with the health apps or wearable I already use"], ["tracker", "My own numbers, in detail, to dig into"], ["record", "A record I can show a clinician"], ["unsure", "I'm not sure yet"]] },
    { id: "IN2", q: "What brings you to an app like this? Pick any that fit.", type: "many", opts: [["ibsd", "I have IBS-D"], ["ibs", "I've been told I might have IBS"], ["foods", "Some foods don't sit well with me"], ["unsettled", "My gut feels unsettled a lot"], ["active", "I'm active, and my gut gets in the way"], ["curious", "I'm curious about my gut"], ["record", "I want a record to show a clinician"], ["other", "Something else"], ["pnts", "Prefer not to say"]], box: "other", excl: "pnts" },
    { id: "IN3", q: "How often do you notice gut symptoms, such as bloating, belly pain or a sudden urge to go?", type: "one", opts: [["most", "Most days"], ["week", "A few times a week"], ["month", "A few times a month"], ["rarely", "Rarely or never"], ["pnts", "Prefer not to say"]] },
    { id: "IN4", q: "How do you keep track of your gut now? Pick any.", type: "many", opts: [["dont", "I don't"], ["head", "In my head"], ["notes", "Notes on my phone or on paper"], ["app", "A gut, food or symptom app"], ["diary", "A diary a clinician gave me"], ["else", "Something else"]], excl: "dont" },
    { id: "IN5", q: "Have you used the Florin app before today?", type: "one", opts: [["now", "Yes, I use it now"], ["tried", "Yes, I've tried it"], ["no", "No"], ["unsure", "Not sure"]] },
    { id: "IN6", q: "Do you use any of these? Pick any.", type: "many", opts: [["oura", "An Oura ring"], ["watch", "An Apple Watch"], ["band", "Another watch or fitness band"], ["health", "Apple Health"], ["app", "Another health or fitness app"], ["none", "None of these"]], excl: "none" },
    { id: "IN7", q: "Your age range", type: "one", opts: [["18", "18 to 24"], ["25", "25 to 34"], ["35", "35 to 44"], ["45", "45 to 54"], ["55", "55 to 64"], ["65", "65 or over"], ["pnts", "Prefer not to say"]] },
    { id: "IN8", q: "How comfortable would you be keeping a record of your BMs on your phone?", type: "one", opts: COMFORT },
    { id: "IN9", q: "Florin has a version with larger text and simpler screens. Which would you choose for yourself?", type: "one", opts: [["standard", "Standard"], ["easy", "Larger text and simpler screens"]], pics: true }
  ];

  /* the tasks: the words on the strip and the hints. c: the context (name, version, arms, figures) */
  const tasks = {
    bm: {
      title: (c) => `Log a BM for ${c.name}, as if they just had one. Pick any word that fits.`,
      hint: (c) => (c.easy ? "Tap I had a BM on Today." : c.home === "day" ? "Tap a word under today's logs, or the plus button at the bottom of the screen." : "Tap the plus button at the bottom of the screen.")
    },
    time: {
      title: (c) => (c.t1 ? `Say ${c.name} actually had that BM an hour ago. Change its time.` : `Log a BM for ${c.name} first, then change its time to an hour ago.`),
      hint: (c) => (c.easy ? "On Today, tap the BM you just logged, under Today's logs." : "On Today, tap the BM you just logged.")
    },
    week: {
      title: (c) => `Find ${c.name}'s last 7 days on Today and read them. Tap Done when you have.`,
      hint: (c) => (c.easy ? "On Today, scroll down to Your last 7 days."
        : c.place === "top" ? "It's at the top of Today."
        : c.place === "under" && c.home !== "day" ? "It's under FloraScore."
        : "On Today, scroll down past today's logs to Your last 7 days.")
    },
    score: {
      title: (c) => `Open the page that explains ${c.name}'s FloraScore.`,
      hint: (c) => (c.easy ? "Tap More about your weeks on Today." : c.home === "day" ? "Tap FloraScore at the top of Today." : "Tap Details on the FloraScore card.")
    },
    patterns: {
      title: (c) => `Find a food that tends to come before a change for ${c.name}.`,
      hint: (c) => (c.easy ? "Tap More about your weeks on Today, then scroll to Possible patterns." : "Open the Insights tab and scroll to Possible patterns.")
    },
    checkin: {
      title: (c) => `${c.name}'s weekly check-in is due tonight. Answer it. Pick any answers you like.`,
      hint: (c) => (c.easy ? "On Today, tap Start under Weekly check-in." : "On Today, tap Start on the Weekly check-in card.")
    },
    history: {
      title: (c) => (c.gaps > 1 ? `${c.name} didn't log anything on two days in ${c.month}. Find one of them in History.` : `${c.name} didn't log anything on one day in ${c.month}. Find that day in History.`),
      hint: (c) => (c.history === "calendar" ? "Tap History at the bottom of the screen, then go back a month." : `Tap History at the bottom of the screen, then scroll back to ${c.month}.`)
    },
    ask: {
      title: (c) => `Ask Florin a question about ${c.name}'s logs. Tap a suggested question, or type your own.`,
      hint: () => "Tap Ask at the bottom right."
    }
  };

  const TE = { id: "TE", q: "Overall, how easy or hard was that?", type: "scale", n: 7, lo: "Very hard", hi: "Very easy" };
  /* the reaction chips, as pairs; the last pair only on the week, FloraScore, patterns and Ask tasks */
  const TR_PAIRS = [[["clear", "Clear"], ["confusing", "Confusing"]], [["useful", "Useful"], ["notuseful", "Not useful"]], [["much", "Too much on screen"], ["detail", "Want more detail"]], [["reassuring", "Reassuring"], ["worrying", "Worrying"]]];
  const TR_FOUR = ["week", "score", "patterns", "ask"];
  const SKIP = { id: "SKIP", q: "Why are you skipping?", type: "one", opts: [["stuck", "I couldn't find it"], ["declined", "I didn't want to"], ["broken", "Something didn't work"]] };

  /* each task's own questions; right answers are worked out by the flow from the live logs */
  const own = {
    BM1: (c) => ({ id: "BM1", q: "Were any of these words unclear? Pick any.", type: "many", opts: c.words.concat([["none", "None were unclear"]]), excl: "none" }),
    BM2: (c) => ({ id: "BM2", q: "Were any two words hard to tell apart? Pick up to two.", type: "many", max: 2, opts: c.words.concat([["none", "None"]]), excl: "none" }),
    WK1: (c) => ({ id: "WK1", q: `Why does ${c.name}'s week count ${c.known} days, not 7?`, type: "one", shuffle: true, last: ["unsure"], opts: [["gap", `${c.gapWord} had nothing logged`], ["today", "Today isn't over yet"], ["outside", `One day was outside ${c.name}'s usual`], ["unsure", "I'm not sure"]] }),
    WK2: (c) => ({ id: "WK2", q: `Which days were outside ${c.name}'s usual? Pick any.`, type: "many", opts: c.days.concat([["none", "None of them"], ["cant", "I couldn't tell"]]), excl: ["none", "cant"] }),
    WK3: (c) => ({ id: "WK3", q: "On that week, what did a day marked in gold show?", type: "one", shuffle: true, last: ["unsure"], opts: [["outside", `A day outside ${c.name}'s usual`], ["sym", "A day with symptoms"], ["star", "A highlight, like a gold star"], ["today", "Today"], ["unsure", "I'm not sure"]] }),
    SC1: (c) => ({ id: "SC1", q: "Which comes closest to what FloraScore tells you?", type: "one", shuffle: true, last: ["unsure"], opts: [["own", `How ${c.name}'s recent days compare with ${c.name}'s own usual`], ["others", `How ${c.name} compares with other people`], ["grade", "A grade out of 100"], ["medical", "A medical result"], ["unsure", "I'm not sure"]] }),
    SC2: () => ({ id: "SC2", q: "Was today's FloraScore in its usual range?", type: "one", shuffle: true, last: ["cant"], opts: [["in", "In its usual range"], ["above", "Above its usual range"], ["below", "Below its usual range"], ["cant", "I couldn't tell"]] }),
    PT1: (c) => ({ id: "PT1", q: `Which food tends to come before a change for ${c.name}?`, type: "one", shuffle: true, last: ["none"], opts: c.foods.concat([["none", "I couldn't find one"]]) }),
    IV1: (c) => ({ id: "IV1", q: c.easy ? "Have a look at the cards in Your weeks. Which two would you look at most? Pick two." : "Have a look at the cards on Insights. Which two would you look at most? Pick two.", type: "many", max: 2, shuffle: true, opts: c.cards }),
    IV2: (c) => ({ id: "IV2", q: "Which one would you not miss?", type: "one", shuffle: true, last: ["all"], opts: c.cards.concat([["all", "I'd miss all of them"]]) }),
    CK1: () => ({ id: "CK1", q: "How often would you answer a check-in like this?", type: "one", opts: [["every", "Every week"], ["most", "Most weeks"], ["now", "Now and then"], ["never", "Never"], ["unsure", "Not sure"]] }),
    HI1: (c) => ({ id: "HI1", q: "Which day had nothing logged?", type: "one", opts: c.histDays.concat([["cant", "I couldn't find it"]]) }),
    AS1: () => ({ id: "AS1", q: "How much would you trust an answer like this?", type: "one", opts: [["1", "Not at all"], ["2", "A little"], ["3", "Somewhat"], ["4", "A lot"], ["5", "Completely"]] })
  };
  const ownFor = { bm: ["BM1", "BM2"], time: [], week: ["WK1", "WK2", "WK3"], score: ["SC1", "SC2"], patterns: ["PT1", "IV1", "IV2"], checkin: ["CK1"], history: ["HI1"], ask: ["AS1"] };
  const TW = { id: "TW", q: "Anything to add about the tasks? (optional)", type: "box" };

  const compare = {
    home: {
      id: "CP1", text: () => "Here's another way Today could open. Find today's FloraScore on it, then tap Next.",
      q: { id: "CP1", q: "Which would you rather see first when you open the app?", type: "one", shuffle: true, last: ["none"], opts: [["score", "The FloraScore card"], ["day", "The day and its logs"], ["none", "No preference"]] }
    },
    history: {
      id: "CP2", text: (c) => `Here's another way History could look. Find what ${c.name} logged on ${c.cpDay}, then tap Next.`,
      q: { id: "CP2", q: "Which would you rather use to look back at past days?", type: "one", shuffle: true, last: ["none"], opts: [["calendar", "A month at a glance"], ["list", "A list of days"], ["none", "No preference"]] }
    },
    oura: {
      id: "CP3", text: () => "Here's another way FloraScore could look on Today. Have a look, then tap Next.",
      q: { id: "CP3", q: "Which way of showing FloraScore would you rather have on Today?", type: "one", opts: [["first", "The one you used first"], ["this", "This one"], ["none", "No preference"]] },
      more: { id: "CP3b", q: "What makes you say that? (optional)", type: "box" }
    }
  };

  const install = {
    IS1: { id: "IS1", q: "Overall, how easy or hard was putting Florin on your phone?", type: "scale", n: 7, lo: "Very hard", hi: "Very easy" },
    IS2: { id: "IS2", q: "What happened?", type: "one", opts: [["find", "I couldn't find the steps"], ["match", "The steps didn't match my phone"], ["rather", "I'd rather not add it"], ["else", "Something else"]], box: "else" }
  };

  const SUS = [
    "I think that I would like to use this app frequently.",
    "I found the app unnecessarily complex.",
    "I thought the app was easy to use.",
    "I think that I would need the support of a technical person to be able to use this app.",
    "I found the various functions in this app were well integrated.",
    "I thought there was too much inconsistency in this app.",
    "I would imagine that most people would learn to use this app very quickly.",
    "I found the app very awkward to use.",
    "I felt very confident using the app.",
    "I needed to learn a lot of things before I could get going with this app."
  ];
  const SUS_HEAD = "Thinking about the app you just tried, how much do you agree?";
  const SUS_CREDIT = "System Usability Scale. John Brooke (1996), SUS: a quick and dirty usability scale.";

  /* the exit survey, in the order it's asked (plan 3.9). "pay" is the look at the membership page */
  const exit = (c) => [
    { id: "EX1", q: "How comfortable would you be keeping a record of your BMs on your phone?", type: "one", opts: COMFORT },
    ...SUS.map((s, i) => ({ id: `SUS${i + 1}`, q: s, head: SUS_HEAD, credit: SUS_CREDIT, type: "one", opts: AGREE, sus: true })),
    { id: "TR1", q: "I understood how the app came up with its numbers.", head: "How much do you agree?", type: "one", opts: AGREE },
    { id: "TR2", q: `Did anything in the app sound like it named a condition, or judged ${c.name}'s health?`, type: "one", opts: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]] },
    { id: "TR2b", q: "Where? (optional)", type: "box", when: (A) => A.TR2 === "yes" },
    { id: "TR3", q: "I would trust what the app told me about my own logs.", head: "How much do you agree?", type: "one", opts: AGREE },
    { id: "TR4", q: "Did anything in the app worry you?", type: "one", opts: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]] },
    { id: "TR4b", q: "What worried you? (optional)", type: "box", when: (A) => A.TR4 === "yes" },
    { id: "FV1", q: "Which part did you like most?", type: "one", shuffle: true, last: ["none"], opts: PARTS(c).concat([["none", "None of them"]]) },
    { id: "FV2", q: "What did you like about it? (optional)", type: "box", when: (A) => A.FV1 && A.FV1 !== "none" },
    { id: "FR1", q: "Was any part hard, slow or confusing? Pick any.", type: "many", opts: [["bm", "Logging a BM"], ["time", "Changing a BM's time"], ["today", "Today"], ["score", "FloraScore"], ["insights", c.easy ? "Your weeks" : "Insights"], ["checkin", "The weekly check-in"], ["history", "History"], ["ask", "Ask Florin"], ["install", "Putting it on my phone"], ["else", "Something else"], ["nothing", "Nothing was"]].filter(([k]) => k !== "checkin" || c.checkin), excl: "nothing" },
    { id: "FR2", type: "box", each: "FR1" },
    { id: "MS1", q: "Was there anything you looked for and didn't find? (optional)", type: "box" },
    { id: "MS2", q: "Which of these would you want most? Pick up to two.", type: "many", max: 2, opts: [["link", "Linking Apple Health or another app"], ["cycle", "Period or cycle days"], ["sleep", "Sleep"], ["meds", "Medicines"], ["exercise", "Exercise"], ["remind", "Reminders"], ["report", "A report to show a clinician"], ["else", "Something else"], ["none", "None of these"]], excl: "none" },
    { id: "TX1", q: "How was the size of the text and buttons?", type: "one", opts: [["small", "Too small"], ["right", "About right"], ["big", "Too big"]] },
    { id: "TX2", q: "Is your phone's text set larger than its standard size?", type: "one", opts: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]] },
    { id: "US1", q: "If the Florin app worked like this, how likely would you be to use it over the next month?", type: "one", opts: [["1", "Very unlikely"], ["2", "Unlikely"], ["3", "Neither"], ["4", "Likely"], ["5", "Very likely"]] },
    { id: "US2", q: "How often do you think you'd log your BMs?", type: "one", opts: OFTEN },
    { id: "US3", q: "How often do you think you'd log what you ate?", type: "one", opts: OFTEN },
    { id: "FV3", q: "Which part would you not miss?", type: "one", shuffle: true, last: ["all", "unsure"], opts: PARTS(c).concat([["all", "I'd miss all of them"], ["unsure", "Not sure"]]) },
    { id: "PAY", type: "pay" },
    { id: "VA2", q: "Which comes closest to what you'd do?", type: "one", opts: [["free", "Use the free plan"], ["try", "Try membership, then decide"], ["pay", "Pay for membership"], ["neither", "Use neither"], ["unsure", "Not sure"]] },
    { id: "VA3", q: "What would feel like a fair price for membership, each month?", type: "one", opts: [["u5", "Under $5"], ["5", "$5 to $9"], ["10", "$10 to $14"], ["15", "$15 or more"], ["wouldnt", "I wouldn't pay"], ["unsure", "Not sure"]] },
    { id: "MG1", q: "Here are three ways we might describe the Florin app. Which would make you most want to try it?", type: "one", shuffle: true, last: ["none"], opts: [["taps", "Two taps to log a BM. Florin does the reading."], ["usual", "Your logs give you back your usual, your FloraScore and a record for your clinician."], ["record", "The start of your gut record, one log at a time."], ["none", "None of these"]] },
    { id: "MG2", q: "What made you pick it? (optional)", type: "box", when: (A) => A.MG1 && A.MG1 !== "none" },
    { id: "LS1", q: "Anything else you'd like to tell the team? (optional)", type: "box" }
  ];
  const FR2 = (part) => `What happened with ${part}? (optional)`;

  const comment = {
    q: "What do you think of this?",
    kinds: [["like", "I like it"], ["confusing", "It's confusing"], ["missing", "Something's missing"], ["broken", "Something didn't work"], ["idea", "I have an idea"]],
    more: "Say more (optional)",
    send: "Send", cancel: "Cancel", sent: "Comment sent."
  };

  window.FXQ = { intake, tasks, TE, TR_PAIRS, TR_FOUR, SKIP, own, ownFor, TW, compare, install, exit, FR2, SUS, comment, PARTS };
})();
