/* Florin app vote: what we recommend, per question, shown beside the votes on the results page. Loaded by the results
   page only, never by the voting page, so nobody is steered while they vote.

   Each entry: v (the option we recommend, an id of questions.js, or a list of ids), say (the sentence the page shows,
   in the voting page's option names), why (one or two sentences, word for word from the source), and from (where it
   comes from: anchor is the source's own words, which vote/tools/test-results.js finds there, so a changed
   recommendation fails the check instead of going stale here).
     Part 1: claude/Florin decisions.md, each decision's "We recommend" paragraph.
     Part 2: modules/js/modules.js, MODS[k].rec, say and why. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VOTE_RECS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const sheet = (anchor) => ({ src: "decisions", anchor });
  const mod = (key) => ({ src: "modules", key });
  return {
    home: {
      v: "score", say: "We recommend Score first.",
      why: ["FloraScore is the centre of Florin, so it should come first, and its sentence says what stood out today, which Compact leaves out.",
        "Compact doesn't change our recommendation yet. It keeps FloraScore at the top, so the case against Day first doesn't apply to it, but it trades the day's sentence for getting around, and that trade is your call."],
      from: sheet("We recommend Score first."),
    },
    history: {
      v: "calendar", say: "We recommend Calendar.",
      why: ["One screen a month replaces a long scroll, and a tapped day reads just as it does in the list."],
      from: sheet("We recommend Calendar."),
    },
    bm: {
      v: "quick", say: "We recommend Quick tiles and form, with time buttons on the \"BM saved\" message.",
      why: ["It keeps the two-tap log and fixes the wrong time without opening the form."],
      from: sheet("We recommend Quick tiles and form, and adding time buttons to the \"BM saved\" message"),
    },
    words: {
      v: "C", say: "We recommend Seven words, once counsel has read them, and dropping Five words.",
      why: ["It keeps the detail a clinician needs and the plain words a first-timer can pick, without waiting for a licence."],
      from: sheet("We recommend C, once counsel has read its words, and dropping B."),
    },
    checkin: {
      v: "on", say: "We recommend the check-in, free on both plans.",
      why: ["It takes a minute and is the app's one weekly reason to come back."],
      from: sheet("We recommend On, free on both plans."),
    },
    meals: {
      v: "quick", say: "We recommend Quick, voice or text, and a free food check.",
      why: ["People tend to write meals down only on days with symptoms, which can make everyday foods look linked to them, so logging has to be easy enough for every day."],
      from: sheet("We recommend Quick, with a one-tap"),
    },
    easy: {
      v: "easy", say: "We recommend Add Easy, as a setting anyone can turn on or off, with Standard as the default.",
      why: ["One app underneath keeps the same logs, so a person can switch either way and lose nothing."],
      from: sheet("We recommend Easy as a setting anyone can turn on or off"),
    },
    onboard: {
      v: "short", say: "We recommend Short, and asking the rest when it matters.",
      why: ["Each answer then changes something the person can see."],
      from: sheet("We recommend Short, and asking the rest when it matters"),
    },
    "c-score": { v: "built", say: "We recommend keeping Florin charts.", why: ["It shows today against its usual range without reading as a grade, and the rings stay on the week, where you picked them."], from: mod("score") },
    "c-trend": { v: "built", say: "We recommend keeping Florin charts.", why: ["The line keeps FloraScore dark green on its band (Ray on dark), never Gold, and it's the chart Ask Florin already draws."], from: mod("trend") },
    "c-parts": { v: "built", say: "We recommend keeping Florin charts.", why: ["It names every part on a tie and keeps to one unit, points, so the rows always add up to the change."], from: mod("parts") },
    "c-week": { v: "rings", say: "We recommend Rings, your pick.", why: ["It is Today's week card now; what was different on each day moves to Insights' first card, one tap away, drawn after The month."], from: mod("week") },
    "c-month": { v: "cal-ring", say: "We recommend Florin charts' calendar, with the week's ring.", why: ["A day should look the same on Today and in History, so the calendar keeps its taps and symptom squares and draws each logged day as the week's ring."], from: mod("month") },
    "c-timing": { v: "built", say: "We recommend keeping Florin charts.", why: ["It is the only one that answers for the whole range on a straight time axis, the form the app's chart rules ask for."], from: mod("timing") },
    "c-often": { v: "built", say: "We recommend keeping Florin charts.", why: ["Whole counts on a line from zero, with No BM a real zero, and no decimals."], from: mod("often") },
    "c-form": { v: "built", say: "We recommend keeping Florin charts.", why: ["Counts on bars, in the person's own words, with Gold only for the forms outside their usual."], from: mod("form") },
    "c-symptoms": { v: "built", say: "We recommend keeping Florin charts.", why: ["Symptoms stay Teal and strength stays in words, as on every other screen."], from: mod("symptoms") },
    "c-checkin": { v: "built", say: "We recommend keeping Florin charts.", why: ["It is the only one that never adds the answers up."], from: mod("checkin") },
    "c-pattern": { v: "built", say: "We recommend keeping Florin charts.", why: ["All the patterns on one card, and shares on the pattern's page, with the line \"Patterns show what tends to happen together. They don't prove cause.\" on both."], from: mod("pattern") },
  };
});
