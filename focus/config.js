/* Florin focus group test: the settings. Edit this file, run `node focus/build.js`, and deploy focus/site.
   Every value here is read by both pages (index.html, the flow, and app.html, the app). The plan is
   claude/Florin focus group plan.md; the payload contract is focus/CONTRACT.md. */
window.FOCUS_CONFIG = {
  /* the id on every row in the Sheet. A link with ?test=1 adds "-test" to it, for your own runs */
  study: "florin-fg-1",

  /* the Google Apps Script web app's /exec URL. Until it's pasted here, nothing is sent: every answer waits on the
     phone, and the flow says so */
  endpoint: "",

  /* false closes the study: the page says it has closed, and nothing is sent */
  open: true,

  /* the consent's names. Fill these before launch; while one is empty, the consent words it without the name */
  team: "",          /* the research team, as named in the consent: "the Florin Health product research team" */
  contact: "",       /* the address for questions and removal requests: "research@..." */
  recruiter: "",     /* who recruits and pays the thank-you: "Acme Research" */
  thanksHow: "",     /* how the thank-you is paid, as a clause: "as a $40 gift card by email within a week" */
  tokenHow: "",      /* how a participant gets their thank-you code to the recruiter, as a clause after "To get your
                        thank-you,". Empty: "reply to the message your study link came in, with this code" */
  keepMonths: 6,     /* answers are deleted this many months after the study closes */
  followUp: false,   /* true asks, on the last screen, for an optional follow-up contact, kept apart from the answers */

  /* the decisions on the phone, from claude/Florin decisions.md (our recommendations). home and history are the two
     arms: the script gives each session one option, balanced per phone type. Profile changes are allowed and recorded */
  decisions: {
    form: "C",               /* Consistency: C, seven of our own words */
    bmUI: "quick",           /* BM logging: Quick tiles and form */
    home: ["score", "day"],  /* Home: half Score first, half Day first */
    history: ["calendar", "list"], /* History: half Calendar, half List */
    checkin: true,           /* Weekly check-in: On */
    mealUI: "quick",         /* Meal sheet: Quick, voice or text */
    look: "built",           /* Data style: Florin charts */
    onboard: "short"         /* Onboarding: Short (not shown this round) */
  },

  /* the week on Today, from options/home: "card" (Days and reasons), "strip" (Week strip), "note" (Words only),
     "chart" (Morning times chart), or "built" (the prototype's own card as it is today). Two ids test them half and
     half. Will's pick: Before launch, step 0 */
  weekCard: ["card"],
  /* where the week sits on Today: "top" (under the greeting), "under" (under FloraScore and the check-in), "after"
     (after today's logs, where the app has it now), or "" for the design's own place (the strip at the top, the words
     under FloraScore, the others after today's logs) */
  weekPlace: "",

  /* the demo person and their logs, on every phone */
  demo: { data: "est", meals: "all", plan: "member" },
  /* the demo person for each persona (IN1's answer). Everyone sees Sarah unless this changes; if it does, every
     reading question is reported by demo person */
  people: { pattern: "sarah", simple: "sarah", stack: "sarah", tracker: "sarah", record: "sarah", unsure: "sarah", none: "sarah" },

  /* the version: everyone 65 or over uses the Easy version; under 65, IN9's answer sets it */
  easyFromAge: true,

  /* which tasks run, and which comparisons. A task id left out is skipped */
  tasks: ["bm", "time", "week", "score", "patterns", "checkin", "history", "ask"],
  compare: { home: true, history: true, oura: true },

  freeMinutes: 2,    /* free use, in minutes */
  hintAfterEasy: 25, /* the same, in the version with larger text and simpler screens: sooner */
  sendPerMinute: 50, /* pieces a phone sends a minute at most, answers first: the back end takes 60 from one session */
  hintAfter: 45      /* seconds before a task's Hint shows */
};
