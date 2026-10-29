/* Florin focus group: the study's back end, a Google Apps Script web app.

   The participant app (focus/site) posts each piece of a session as it happens: a change to the session's row, an
   answer, a task's result, a comment, an event. It posts JSON as text/plain with fetch mode "no-cors", so it can't
   read the reply, and it asks by JSONP what the script holds. focus/CONTRACT.md sets out every piece, field and reply;
   this file is the back end's half of it.

     doPost(e)  parses the JSON and checks every piece on its own (the study id, the envelope, each field's type, list
                and length, a size cap); drops a piece it already holds, by sid, cid and seq; limits each session to 60
                new pieces a minute and 1,500 in all; and appends rows to the tabs Sessions, Answers, Tasks, Comments
                and Events, making any missing tab with its header row. Rows are written by header name, so a column
                can be moved, or one of Will's own added, without breaking anything.
     doGet(e)   answers the JSONP calls: ack, claim, lookup, token, followup and ping.
     setup()    makes the tabs, their header rows and a README tab, and the recruiter's separate spreadsheet.

   Every write runs under the script lock. There are no secrets here: the settings are the study ids below and four
   optional script properties: SHEET_ID (the answers Sheet, for a standalone script), RECRUITER_SHEET_ID (setup()
   makes that spreadsheet and sets it), STUDIES (replaces the list below) and CLOSED (yes closes the study).

   Kept apart on purpose: thank-you codes go to the recruiter's spreadsheet, one to a row at a random place, with no
   session id and no time. A follow-up contact goes there too, with its week only. Neither ever reaches this Sheet.
   Apps Script passes on no IP address, user agent or location, so none is stored. */

/* ---------------------------------------------------------------- settings */

/* The study ids the app may send: config.js's `study`. Will's own runs (?test=1) add "-test", which is accepted for
   each of these. */
var STUDIES = ["florin-fg-1"];

var CONFIG = {
  maxBody: 200000,          // characters in one post
  maxPieces: 25,            // pieces handled from one post; any more are refused, and the phone sends them again
  maxText: 1000,            // characters in a text field people typed, after which it is cut
  perMinute: 60,            // new pieces from one session in a minute; the rest wait in the phone's queue
  perSession: 1500,         // pieces from one session in all
  lookupsUnknown: 20,       // lookups that find no session, from everyone together, in a minute
  tokensPerMinute: 30,      // thank-you codes, from everyone together, in a minute
  lockWaitMs: 20000,
  logRows: 2000             // the _log tab stops growing here
};

/* The tabs and their columns. Every tab of pieces starts with the same seven. */
var COMMON = ["received", "sid", "cid", "seq", "at", "study", "build"];
var TABS = {
  Sessions: ["received", "updated", "sid", "study", "build", "code", "restart_of", "first_at", "last_at",
    "active_minutes", "minutes", "platform", "os", "browser", "width", "theme", "text_reported", "segment", "person",
    "version", "version_picked", "home", "history", "week", "order", "assigned", "decisions", "install", "installed",
    "stage", "tasks_seen", "comments", "sus", "submitted"],
  Answers: COMMON.concat(["section", "task", "qid", "question", "answer", "value", "correct", "right", "words",
    "alarm_note", "skipped"]),
  Tasks: COMMON.concat(["task", "n", "version", "state", "started_at", "seconds", "active_seconds", "outcome", "hint",
    "path", "screens", "backs", "ease", "chips", "checks"]),
  Comments: COMMON.concat(["phase", "screen", "state", "target", "x", "y", "tx", "ty", "vw", "vh", "scroll", "kind",
    "words", "alarm_note", "how", "cmid"]),
  Events: COMMON.concat(["phase", "type", "screen", "name", "detail"])
};
var INDEX_TAB = "_index";   // which seqs each sid and cid has sent, the counts for the limits, the comments ledger
var LOG_TAB = "_log";       // pieces refused, and errors: the reason and the field, never what they said
var INDEX_HEAD = ["key", "sid", "cid", "have", "upto", "max", "count", "minute", "in_minute", "notes", "updated"];
var LOG_HEAD = ["received", "what", "kind", "field", "sid"];
var RECRUITER_TABS = { tokens: ["token"], followup: ["week", "contact"] };

/* ---------------------------------------------------------------- the lists (CONTRACT.md section 7) */

var QIDS = ["IN1", "IN2", "IN3", "IN4", "IN5", "IN6", "IN7", "IN8", "IN9",
  "TE", "TR", "BM1", "BM2", "WK1", "WK2", "WK3", "SC1", "SC2", "PT1", "IV1", "IV2", "CK1", "HI1", "AS1", "SKIP",
  "TW", "CP1", "CP2", "CP3", "CP3b", "IS1", "IS2",
  "EX1", "SUS1", "SUS2", "SUS3", "SUS4", "SUS5", "SUS6", "SUS7", "SUS8", "SUS9", "SUS10", "TR1", "TR2", "TR2b", "TR3",
  "TR4", "TR4b", "FV1", "FV2", "FR1", "FR2", "MS1", "MS2", "TX1", "TX2", "US1", "US2", "US3", "FV3", "VA2", "VA3",
  "MG1", "MG2", "LS1"];
var TASK_IDS = ["bm", "time", "week", "score", "patterns", "checkin", "history", "ask", "install"];
var PHASES = ["consent", "intake", "bm", "time", "week", "score", "patterns", "checkin", "history", "ask", "tour",
  "cp1", "cp2", "cp3", "install", "free", "exit", "done"];
var STAGES = ["consent", "intake", "tour", "compare", "install", "free", "exit", "done"];
var SCREENS = ["today", "home-day", "ez-today", "plus", "earlier", "bm", "ez-bm", "sym", "meal", "ck", "ckdone",
  "ckday", "insights", "ez-weeks", "i-score", "i-timing", "i-often", "i-form", "i-sym", "i-ck", "i-pat", "i-pattern",
  "i-days", "history", "hist-cal", "ask", "ask-about", "pay", "pf", "profile", "a sheet", "other"];
var ACTS = ["tab", "plus", "profile", "idetail", "iback", "edit", "undo", "quick-bm", "vr-quick", "open-bm", "save-bm",
  "open-sym", "open-meal", "ck-start", "ck-finish", "ck-skip", "vr-cal-day", "vr-cal-m", "ask-about", "askx-ask",
  "askx-send", "pay", "pay-start", "hmore", "hfilter", "irange", "close", "fx-wkday", "a sheet", "a log", "other"];
var FLOWS = ["consent", "intake_done", "tour_start", "task_start", "task_goal", "task_end", "cp_shown", "install_shown",
  "free_start", "free_end", "exit_start", "pay_shown", "pay_start", "submit", "stopped", "cleared", "restart", "resume"];
var INSTALLS = ["prompt_shown", "prompt_accepted", "prompt_dismissed", "appinstalled", "standalone", "code_ok",
  "code_bad", "code_unknown", "manifest_swapped"];
var NETS = ["flushed", "failed", "offline", "online"];
var PATHS = ["plus tile", "today row", "form", "easy steps", "details yes", "details no", "undo yes", "undo no", "edit",
  "undo and log again", "gave up", "details", "chip", "your weeks", "today card", "plus", "calendar", "list",
  "months moved 0", "months moved 1", "months moved 2", "months moved 3", "months moved 4", "months moved 5",
  "months moved 6", "suggested", "typed", "ask about this", "added", "code from the address", "code typed",
  "no code needed"];
var CHIPS = ["Clear", "Confusing", "Useful", "Not useful", "Too much on screen", "Want more detail", "Reassuring",
  "Worrying"];
var CM_KINDS = ["I like it", "It's confusing", "Something's missing", "Something didn't work", "I have an idea"];
var ARMS = { home: ["score", "day"], history: ["calendar", "list"], week: ["built", "card", "strip", "note", "chart"] };

/* The alphabet of the study code and the thank-you code, in this order: the check character depends on it. */
var CODE_ALPHABET = "ACDEFHJKMNPRTWXY34679";

/* ---------------------------------------------------------------- field rules */

/* t: s text, n number, yn yes or no, b true or false, time, code (a study code), parts (words from a list, joined
   with " | "). max: a length. re: a pattern. of: a list. free: words people typed, cut at 1,000 characters and
   scrubbed of email addresses and phone numbers. scrub: scrubbed too. cut: cut at max rather than refused. blank: ""
   is allowed. col: the column it's written to, when that isn't its own name. A field that breaks its rule refuses the
   piece; a field with no rule is dropped. */
function S_(max, re, o) { return mix_({ t: "s", max: max, re: re }, o); }
function OF_(list, o) { return mix_({ t: "s", max: 60, of: list }, o); }
function INT_(min, max, o) { return mix_({ t: "n", min: min, max: max, dp: 0 }, o); }
function NUM_(min, max, dp, o) { return mix_({ t: "n", min: min, max: max, dp: dp }, o); }
function PARTS_(list, o) { return mix_({ t: "parts", of: list, max: 400 }, o); }
function mix_(a, b) { if (b) Object.keys(b).forEach(function (k) { a[k] = b[k]; }); return a; }
var FREE = { t: "s", max: 1000, free: true };
var YN = { t: "yn" };
var LINE = /^[A-Za-z0-9_=. \-]*$/;          // the decisions on one line
var BLANK = { blank: true };

var ENVELOPE = {
  study: S_(40, /^[a-z0-9-]{3,40}$/), build: S_(24, /^[a-z0-9.-]{1,24}$/), sid: S_(24, /^[A-Za-z0-9_-]{24}$/),
  cid: S_(6, /^[a-z0-9]{6}$/), seq: INT_(1, 1000000), at: { t: "time" }, phase: OF_(PHASES, BLANK),
  standalone: { t: "b" }
};

var KINDS = {
  session: {
    tab: "Sessions",
    fields: {
      code: { t: "code" }, restart_of: { t: "code", blank: true }, platform: OF_(["iphone", "android", "other"]),
      os: S_(4, /^[0-9]*$/, BLANK), browser: OF_(["safari", "chrome", "samsung", "firefox", "edge", "inapp", "other"]),
      width: INT_(0, 10000), theme: OF_(["light", "dark"]), text_reported: OF_(["smaller", "standard", "larger", "unknown"]),
      segment: OF_(["pattern", "simple", "stack", "tracker", "record", "unsure"], BLANK),
      person: OF_(["sarah", "marcus", "alex"]), version: OF_(["standard", "easy"]),
      version_picked: OF_(["standard", "easy"], BLANK), home: OF_(ARMS.home, BLANK), history: OF_(ARMS.history),
      week: OF_(ARMS.week, BLANK), order: INT_(1, 9), assigned: OF_(["script", "phone"]), decisions: S_(400, LINE),
      install: OF_(["seen", "said", "browser", "couldnt"]), stage: OF_(STAGES.concat(["stopped"])),
      tasks_seen: INT_(0, 9), comments: INT_(0, 10000), sus: NUM_(0, 100, 1), submitted: YN,
      active_minutes: NUM_(0, 1440, 1), minutes: NUM_(0, 1440, 1)
    }
  },
  answer: {
    tab: "Answers",
    fields: {
      section: OF_(["intake", "task", "tour", "compare", "install", "exit"]), task: OF_(TASK_IDS, BLANK),
      qid: OF_(QIDS), question: FREE, answer: FREE, value: S_(400, /^[A-Za-z0-9_.:'\- |]*$/),
      correct: OF_(["yes", "no"], BLANK), right: FREE, words: FREE, alarm_note: YN, skipped: YN
    },
    need: ["qid"]
  },
  task: {
    tab: "Tasks",
    fields: {
      task: OF_(TASK_IDS), n: INT_(1, 9), version: OF_(["standard", "easy"]), state: S_(400, LINE),
      started_at: { t: "time" }, seconds: INT_(0, 86400), active_seconds: INT_(0, 86400),
      outcome: OF_(["seen", "said", "stuck", "declined", "broken", "browser", "couldnt"]), hint: YN,
      path: PARTS_(PATHS, BLANK), screens: INT_(0, 100000), backs: INT_(0, 100000), ease: INT_(1, 7, BLANK),
      chips: PARTS_(CHIPS, BLANK), checks: S_(20, /^\d{1,2} of \d{1,2} right$/, BLANK)
    },
    need: ["task"]
  },
  comment: {
    tab: "Comments",
    fields: {
      cmid: S_(8, /^[a-z0-9]{8}$/), op: OF_(["add", "edit", "delete"]), screen: OF_(SCREENS), state: S_(400, LINE),
      target: S_(80, /^[^<>{}\\]*$/, { scrub: true }), x: NUM_(0, 1, 2, BLANK), y: NUM_(0, 1, 2, BLANK),
      tx: NUM_(0, 1, 2, BLANK), ty: NUM_(0, 1, 2, BLANK), vw: INT_(0, 10000), vh: INT_(0, 10000),
      scroll: INT_(0, 1000000), cm_kind: PARTS_(CM_KINDS, { blank: true, col: "kind" }), words: FREE, alarm_note: YN,
      how: OF_(["double tap", "button"])
    },
    need: ["cmid", "op"]
  },
  event: {
    tab: "Events",
    fields: {
      type: OF_(["flow", "screen", "act", "set", "view", "depth", "vis", "install", "net", "error"]),
      screen: OF_(SCREENS, BLANK), name: S_(60, /^[^<>{}\\]*$/), detail: S_(80, /^[^<>{}\\]*$/, BLANK)
    },
    need: ["type", "name"]
  },
  token: { recruiter: true, fields: { token: S_(8, new RegExp("^[" + CODE_ALPHABET + "]{8}$")) }, need: ["token"] },
  followup: {
    recruiter: true,
    fields: { n: S_(8, /^[a-z0-9]{8}$/), contact: { t: "s", max: 200, cut: true }, week: S_(10, /^\d{4}-\d\d-\d\d$/, BLANK) },
    need: ["n", "contact"]
  }
};

/* An event's name, by its type */
var EVENT_NAMES = {
  flow: FLOWS, screen: SCREENS, act: ACTS, depth: SCREENS, vis: ["hidden", "visible"], install: INSTALLS, net: NETS,
  error: ["error"], set: /^[A-Za-z]{2,16}$/, view: /^[A-Za-z0-9 ,.'\u2019:()\/&+\-]{1,60}$/
};

/* ---------------------------------------------------------------- the web app */

function doPost(e) {
  var out;
  try {
    out = receive_(e && e.postData ? String(e.postData.contents || "") : "");
  } catch (err) {
    logNow_([{ what: "error", field: where_(err) }]);
    out = { ok: false, error: "server" };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = p.callback;
  if (cb === undefined && !p.op) {
    return ContentService.createTextOutput("The Florin focus group endpoint is running.")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  if (cb !== undefined && !/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(String(cb))) {
    return ContentService.createTextOutput("/* bad callback */").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  var out;
  try {
    out = call_(p);
  } catch (err) {
    logNow_([{ what: "error", field: where_(err) }]);
    out = { ok: false, error: "server" };
  }
  var json = JSON.stringify(out).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  /* with no callback (a check from a browser's address bar) the reply is plain JSON */
  if (cb === undefined) return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  return ContentService.createTextOutput("/**/" + cb + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function call_(p) {
  var op = String(p.op || "");
  if (!studyOk_(p.study)) return { ok: false, error: "unknown_study" };
  if (op === "ping") return { ok: true, open: !closed_() };
  if (op === "ack") return ack_(p);
  if (op === "claim") return claim_(p);
  if (op === "lookup") return lookup_(p);
  if (op === "token") return tokenHave_(p);
  if (op === "followup") return followupHave_(p);
  return { ok: false, error: "bad_request" };
}

/* ---------------------------------------------------------------- receiving pieces */

function receive_(body) {
  if (closed_()) return { ok: false, error: "closed" };
  if (!body) return { ok: false, error: "bad_request" };
  if (body.length > CONFIG.maxBody) { logNow_([{ what: "too_big", field: String(body.length) }]); return { ok: false, error: "bad_request" }; }
  var data;
  try { data = JSON.parse(body); } catch (err) { logNow_([{ what: "not_json" }]); return { ok: false, error: "bad_request" }; }
  if (!data || typeof data !== "object" || !Array.isArray(data.pieces)) { logNow_([{ what: "no_pieces" }]); return { ok: false, error: "bad_request" }; }

  var res = { ok: true, accepted: 0, duplicate: 0, refused: 0, limited: 0, log: [] };
  var pieces = [];
  data.pieces.forEach(function (raw, i) {
    if (i >= CONFIG.maxPieces) { refuse_(res, "too_many", raw, ""); return; }
    var p = check_(raw, res);
    if (p) pieces.push(p);
  });

  var lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.lockWaitMs); } catch (err) { return { ok: false, error: "server" }; }
  try {
    var v = view_(book_());
    if (pieces.length) store_(v, pieces, res);
    writeLog_(v, res.log);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  delete res.log;
  return res;
}

function refuse_(res, why, raw, field) {
  res.refused++;
  var kind = raw && typeof raw.kind === "string" ? raw.kind.slice(0, 12) : "";
  var sid = raw && typeof raw.sid === "string" && /^[A-Za-z0-9_-]{24}$/.test(raw.sid) && kind !== "token" && kind !== "followup" ? raw.sid : "";
  res.log.push({ what: why, kind: kind, field: field || "", sid: sid });
  return null;
}

/* One piece, checked on its own. Returns the clean piece, or null when it's refused. */
function check_(raw, res) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return refuse_(res, "shape", null, "");
  var kind = raw.kind;
  if (typeof kind !== "string" || !KINDS.hasOwnProperty(kind)) return refuse_(res, "kind", raw, "kind");
  if (!studyOk_(raw.study)) return refuse_(res, "study", raw, "study");
  var spec = KINDS[kind];
  var p = { kind: kind, study: raw.study, f: {} };

  if (spec.recruiter) {
    /* a token or a follow-up carries nothing that could link it to a session; anything of the kind is ignored */
    if (raw.sid !== undefined || raw.cid !== undefined || raw.seq !== undefined || raw.code !== undefined || raw.at !== undefined) {
      res.log.push({ what: "linked_fields_ignored", kind: kind, field: "", sid: "" });
    }
  } else {
    var keys = ["build", "sid", "cid", "seq", "at", "phase", "standalone"];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (raw[k] === undefined) {
        if (k === "phase" || k === "standalone" || k === "build") continue;
        return refuse_(res, "missing", raw, k);
      }
      var c = clean_(raw[k], ENVELOPE[k]);
      if (!c.ok) return refuse_(res, "field", raw, k);
      p[k] = c.v;
    }
    if (p.build === undefined) p.build = "";
    if (p.phase === undefined) p.phase = "";
    p.standalone = p.standalone === true;
  }

  var rules = spec.fields;
  for (var f in rules) {
    if (!rules.hasOwnProperty(f) || raw[f] === undefined) continue;
    var cv = clean_(raw[f], rules[f]);
    if (!cv.ok) return refuse_(res, "field", raw, f);
    p.f[rules[f].col || f] = cv.v;
  }
  var need = spec.need || [];
  for (var j = 0; j < need.length; j++) if (p.f[need[j]] === undefined || p.f[need[j]] === "") return refuse_(res, "missing", raw, need[j]);

  if (kind === "event") {
    var names = EVENT_NAMES[p.f.type];
    var ok = names instanceof RegExp ? names.test(p.f.name) : names.indexOf(p.f.name) >= 0;
    if (!ok) return refuse_(res, "field", raw, "name");
  }
  if (kind === "comment" && p.f.op === "add" && !p.f.screen) return refuse_(res, "missing", raw, "screen");
  return p;
}

/* A value by its rule: { ok, v } */
function clean_(v, rule) {
  var no = { ok: false };
  if (rule.t === "time") { var tv = time_(v); return tv ? { ok: true, v: tv } : no; }
  if (rule.t === "b") return typeof v === "boolean" ? { ok: true, v: v } : no;
  if (rule.t === "yn") return v === "yes" || v === "no" ? { ok: true, v: v } : no;
  if (rule.t === "code") {
    if (rule.blank && v === "") return { ok: true, v: "" };
    var code = typeof v === "string" ? normCode_(v) : "";
    return codeOk_(code) ? { ok: true, v: code } : no;
  }
  if (rule.t === "n") {
    if (v === "" && rule.blank) return { ok: true, v: "" };
    var n = typeof v === "number" ? v : (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : NaN);
    if (!isFinite(n) || n < rule.min || n > rule.max) return no;
    if (rule.dp === 0 && Math.floor(n) !== n) return no;
    var f = Math.pow(10, rule.dp);
    return { ok: true, v: Math.round(n * f) / f };
  }
  if (typeof v !== "string") return no;
  v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (v === "") return rule.blank || rule.free || (rule.t === "s" && !rule.re && !rule.of) ? { ok: true, v: "" } : no;
  if (rule.t === "parts") {
    var parts = v.split(" | ");
    for (var i = 0; i < parts.length; i++) if (rule.of.indexOf(straight_(parts[i])) < 0) return no;
    return v.length <= rule.max ? { ok: true, v: v } : no;
  }
  if (rule.free) {
    v = scrub_(v);
    if (v.length > CONFIG.maxText) v = v.slice(0, CONFIG.maxText);
    return { ok: true, v: v };
  }
  if (rule.of) return rule.of.indexOf(v) >= 0 ? { ok: true, v: v } : no;
  if (rule.scrub) v = scrub_(v);
  if (rule.cut && v.length > rule.max) v = v.slice(0, rule.max);
  if (v.length > rule.max) return no;
  if (rule.re && !rule.re.test(v)) return no;
  return { ok: true, v: v };
}

/* A curly apostrophe reads as a straight one when a word is matched to its list. */
function straight_(s) { return String(s).replace(/\u2019/g, "'"); }

/* A time from the phone, ISO 8601 in UTC to the second. Not before 2025, and not more than two days ahead. */
function time_(v) {
  if (typeof v !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(v)) return "";
  var t = new Date(v).getTime();
  if (!(t >= Date.UTC(2025, 0, 1)) || t > Date.now() + 2 * 86400000) return "";
  return v;
}

/* Email addresses and phone numbers in words people typed become [removed], as the phone already does before
   sending. A phone number is 7 or more digits, with spaces, dots, dashes or brackets between; a time, a date or a
   reading with fewer digits stays. */
function scrub_(s) {
  s = s.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, "[removed]");
  return s.replace(/\+?\(?\d[\d\s().\-]{5,}\d/g, function (m) {
    return m.replace(/\D/g, "").length >= 7 ? "[removed]" : m;
  });
}

function studyOk_(study) {
  if (typeof study !== "string" || !/^[a-z0-9-]{3,40}$/.test(study)) return false;
  return studies_().indexOf(study.replace(/-test$/, "")) >= 0;
}
function studies_() {
  var prop = PropertiesService.getScriptProperties().getProperty("STUDIES");
  if (prop) return prop.split(",").map(function (s) { return s.trim(); }).filter(String);
  return STUDIES;
}
function closed_() {
  return /^(yes|true|1)$/i.test(String(PropertiesService.getScriptProperties().getProperty("CLOSED") || ""));
}

/* ---------------------------------------------------------------- storing pieces, under the lock */

function store_(v, pieces, res) {
  var idx = index_(v);
  var now = new Date();
  var minute = Math.floor(now.getTime() / 60000);
  var rows = {};          // tab -> [ row objects ]
  var sessions = {};      // sid -> its changes
  var cmOps = [];         // comment edits and deletes, applied once the rows are in
  var unlinked = [];      // tokens and follow-ups
  var touched = {};

  pieces.forEach(function (p) {
    if (KINDS[p.kind].recruiter) { unlinked.push(p); return; }
    var key = p.sid + "|" + p.cid;
    var tot = idx.get(p.sid + "|*", p.sid, "*");
    var one = idx.get(key, p.sid, p.cid);
    if (hasSeq_(one.have, p.seq)) { res.duplicate++; return; }
    if (tot.count >= CONFIG.perSession) { res.limited++; res.limit = "session"; return; }
    if (Number(tot.minute) !== minute) { tot.minute = minute; tot.in_minute = 0; }
    if (tot.in_minute >= CONFIG.perMinute) { res.limited++; if (!res.limit) res.limit = "minute"; return; }
    tot.count++; tot.in_minute++;
    one.have = addSeq_(one.have, p.seq);
    one.max = Math.max(Number(one.max) || 0, p.seq);
    one.upto = upto_(one.have);
    one.count++;
    touched[key] = one; touched[p.sid + "|*"] = tot;
    res.accepted++;

    var s = sessions[p.sid] || (sessions[p.sid] = { sid: p.sid, study: p.study, build: p.build, f: {}, first: p.at, last: p.at, tot: tot });
    s.study = p.study;
    if (p.build) s.build = p.build;
    if (p.at < s.first) s.first = p.at;
    if (p.at > s.last) s.last = p.at;
    if (p.standalone) s.installed = true;

    if (p.kind === "session") {
      Object.keys(p.f).forEach(function (k) {
        s.f[k] = k === "stage" ? furthest_(s.f.stage, p.f.stage) : p.f[k];
      });
      return;
    }
    var row = { received: now, sid: p.sid, cid: p.cid, seq: p.seq, at: p.at, study: p.study, build: p.build, phase: p.phase };
    Object.keys(p.f).forEach(function (k) { row[k] = p.f[k]; });
    if (p.kind === "comment") {
      var led = ledger_(tot, p.f.cmid);
      if (p.f.op !== "add") { cmOps.push({ p: p, tot: tot }); return; }
      if (led.del) return;                      // taken back before it arrived: never written
      if (led.edit) { ["kind", "words", "alarm_note"].forEach(function (k) { if (led.edit[k] !== undefined) row[k] = led.edit[k]; }); led.edit = null; }
      led.add = true;
      delete row.op;
    }
    (rows[KINDS[p.kind].tab] = rows[KINDS[p.kind].tab] || []).push(row);
  });

  /* rows first, then the index: a failure between them can only make a duplicate row, never lose a piece */
  Object.keys(rows).forEach(function (tab) { append_(open_(v, tab), rows[tab]); });
  cmOps.forEach(function (o) { commentOp_(v, o.p, o.tot); });
  Object.keys(sessions).forEach(function (sid) { updateSession_(v, sessions[sid], now, res); });
  if (unlinked.length) toRecruiter_(unlinked, res);
  idx.save(touched, now);
}

/* The furthest stage reached: by the order of STAGES, except that stopped wins over every stage but done. */
function furthest_(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a === "done" || b === "done") return "done";
  if (a === "stopped" || b === "stopped") return "stopped";
  return STAGES.indexOf(b) > STAGES.indexOf(a) ? b : a;
}

/* The session's row. It's written when a session piece comes, when the session is new, when the installed app is
   first seen, or when an earlier piece arrives late; otherwise at most once a minute, to keep last_at current. So
   last_at can trail the newest piece by up to a minute. The ledger in _index remembers when it was last written. */
function updateSession_(v, s, now, res) {
  var n = s.tot.notes = s.tot.notes || {};
  var due = Object.keys(s.f).length > 0 || !n.w || (s.installed && !n.inst) || (n.f && s.first < n.f) || now.getTime() - (n.w || 0) >= 60000;
  if (!due) return;
  var t = open_(v, "Sessions");
  var found = null;
  if (n.r && n.r <= t.last) {
    /* the row it was on last time, if it still holds this sid (rows move when the tab is sorted) */
    var vals = t.sh.getRange(n.r, 1, 1, t.head.length).getValues()[0];
    if (String(vals[t.head.indexOf("sid")]) === s.sid) found = { row: n.r, obj: obj_(t.head, vals) };
  }
  if (!found) found = find_(t, "sid", s.sid);
  var next = found ? found.obj : {};
  next.sid = s.sid;
  if (!next.received) next.received = now;
  next.updated = now;
  next.study = s.study;
  if (s.build) next.build = s.build;
  if (!next.first_at || s.first < String(next.first_at)) next.first_at = s.first;
  if (!next.last_at || s.last > String(next.last_at)) next.last_at = s.last;
  Object.keys(s.f).forEach(function (k) {
    var val = s.f[k];
    if (k === "stage") { next.stage = furthest_(String(next.stage || ""), val); return; }
    if (k === "code") {
      if (String(next.code || "") === val) return;
      var held = find_(t, "code", val);
      if (held && String(held.obj.sid) !== s.sid) { res.log.push({ what: "code_taken", kind: "session", field: "code", sid: s.sid }); return; }
    }
    next[k] = val;
  });
  if (s.installed) next.installed = "yes";
  if (!next.installed) next.installed = "no";
  var r = found ? found.row : t.last + 1;
  put_(t, r, next);
  n.r = r; n.w = now.getTime(); n.f = String(next.first_at);
  if (next.installed === "yes") n.inst = 1;
}

/* ---------------------------------------------------------------- comments: add, edit, delete */

/* The ledger keeps, per comment, whether its add has been written, the newest edit (until its add lands), and
   whether it was taken back. It lives in the session's row of _index. */
function ledger_(tot, cmid) {
  tot.notes = tot.notes || {};
  var cm = tot.notes.cm = tot.notes.cm || {};
  return cm[cmid] = cm[cmid] || {};
}
function orderKey_(p) { return p.at + "|" + ("0000000" + p.seq).slice(-7) + "|" + p.cid; }

function commentOp_(v, p, tot) {
  var led = ledger_(tot, p.f.cmid);
  var t = open_(v, "Comments");
  var row = findComment_(t, p.sid, p.f.cmid);
  if (p.f.op === "delete") {
    led.del = true; led.edit = null;
    if (row) remove_(t, row.row);
    return;
  }
  /* an edit: only the newest one counts */
  var k = orderKey_(p);
  if (led.del || (led.ekey && led.ekey > k)) return;
  led.ekey = k;
  var fields = {};
  ["kind", "words", "alarm_note"].forEach(function (f) { if (p.f[f] !== undefined) fields[f] = p.f[f]; });
  if (row) {
    Object.keys(fields).forEach(function (f) { row.obj[f] = fields[f]; });
    put_(t, row.row, row.obj);
    led.edit = null;
  } else {
    led.edit = fields;
  }
}
function findComment_(t, sid, cmid) {
  var list = findAll_(t, "cmid", cmid);
  for (var i = 0; i < list.length; i++) if (String(list[i].obj.sid) === sid) return list[i];
  return null;
}

/* ---------------------------------------------------------------- the JSONP calls */

/* ack: `upto` is the highest n such that every seq from 1 to n is held for this sid and cid. `installed` is true once
   any piece of the sid came from the app on the home screen. Also: `have` (every seq held, as ranges), `known` (the
   sid has a row), `stage`, and `limit` when a limit is holding pieces back. Read only, so no lock. */
function ack_(p) {
  var sid = String(p.sid || ""), cid = String(p.cid || "");
  if (!/^[A-Za-z0-9_-]{24}$/.test(sid) || !/^[a-z0-9]{6}$/.test(cid)) return { ok: false, error: "bad_request" };
  var v = view_(book_());
  var idx = index_(v, true);
  var one = idx.peek(sid + "|" + cid), tot = idx.peek(sid + "|*");
  var t = open_(v, "Sessions", true);
  var row = t ? find_(t, "sid", sid) : null;
  var out = {
    ok: true, upto: one ? Number(one.upto) || 0 : 0,
    installed: !!((row && row.obj.installed === "yes") || (tot && tot.notes && tot.notes.inst)),
    have: one ? String(one.have || "") : "", known: !!row, stage: row ? String(row.obj.stage || "") : ""
  };
  if (tot && tot.count >= CONFIG.perSession) out.limit = "session";
  else if (tot && Number(tot.minute) === Math.floor(Date.now() / 60000) && tot.in_minute >= CONFIG.perMinute) out.limit = "minute";
  return out;
}

/* claim: at the end of intake the phone offers a study code. The script claims it for this sid, or answers code_taken,
   and assigns the arms. The same sid claiming again gets the code and arms it already holds. */
function claim_(p) {
  if (closed_()) return { ok: false, error: "closed" };
  var sid = String(p.sid || ""), code = normCode_(p.code);
  if (!/^[A-Za-z0-9_-]{24}$/.test(sid)) return { ok: false, error: "bad_request" };
  if (!codeOk_(code)) return { ok: false, error: "bad_code" };
  var platform = ({ iphone: "iphone", android: "android" })[String(p.platform || "")] || "other";
  var version = p.version === "easy" ? "easy" : "standard";
  var lock = LockService.getScriptLock();
  try { lock.waitLock(CONFIG.lockWaitMs); } catch (err) { return { ok: false, error: "server" }; }
  try {
    var t = open_(view_(book_()), "Sessions");
    var mine = find_(t, "sid", sid);
    if (mine && mine.obj.code && mine.obj.order !== "" && mine.obj.order !== undefined) return armsReply_(mine.obj);
    if (mine && mine.obj.code) code = String(mine.obj.code);
    else {
      var taken = find_(t, "code", code);
      if (taken && String(taken.obj.sid) !== sid) return { ok: false, error: "code_taken" };
    }
    var arms = assign_(String(p.study), platform === "iphone" ? "iphone" : "android", version, {
      home: list_(p.homes, ARMS.home), history: list_(p.histories, ARMS.history), week: list_(p.weeks, ARMS.week),
      orders: Math.max(1, Math.min(9, parseInt(p.orders, 10) || 5))
    });
    var now = new Date();
    var next = mine ? mine.obj : {};
    next.sid = sid; next.study = String(p.study); next.code = code;
    if (!next.received) next.received = now;
    next.updated = now;
    next.platform = platform; next.version = next.version || version;
    next.home = arms.home; next.history = arms.history; next.week = arms.week; next.order = arms.order;
    next.assigned = "script";
    if (!next.stage) next.stage = "intake";
    if (!next.installed) next.installed = "no";
    put_(t, mine ? mine.row : t.last + 1, next);
    SpreadsheetApp.flush();
    return armsReply_(next);
  } finally {
    lock.releaseLock();
  }
}
function armsReply_(o) {
  return { ok: true, code: String(o.code), home: String(o.home || ""), history: String(o.history || ""), week: String(o.week || ""), order: Number(o.order) || 1 };
}
function list_(val, allowed) {
  var a = String(val || "").split(",").map(function (x) { return x.trim(); }).filter(function (x) { return allowed.indexOf(x) >= 0; });
  a = a.filter(function (x, i) { return a.indexOf(x) === i; }).slice(0, 4);
  return a.length ? a : [allowed[0]];
}

/* The balanced list, per study and platform (other shares Android's).
   Standard: when Home, History and the week card each have one or two options, they come from the rows of a 2 by 2
   by 2 orthogonal array, in blocks of 4 in a random order: every 4 sessions see each option of each arm twice, and
   each pair of options from two arms together once, so the arms cross. An arm with three or four options has its
   own counter instead, in blocks of that many.
   Easy: no Home and no week card; History from its own counter, in blocks of 2, so History stays balanced within
   Standard and within Easy alike.
   Everyone: the task order from its own counter, in blocks of `orders`, so every block sees each order once.
   The counters are script properties keyed by the study id, so Will's -test runs never use up the study's blocks. */
var L4 = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];

function assign_(study, platform, version, o) {
  var props = PropertiesService.getScriptProperties();
  var draw = function (stream, size) {
    var key = "arms|" + study + "|" + platform + "|" + stream + "|" + size;
    var st;
    try { st = JSON.parse(props.getProperty(key) || "null"); } catch (err) { st = null; }
    if (!st || !st.perm || st.perm.length !== size) st = { n: 0, perm: shuffle_(range_(size)) };
    var pick = st.perm[st.n % size];
    st.n++;
    if (st.n % size === 0) st.perm = shuffle_(range_(size));
    props.setProperty(key, JSON.stringify(st));
    return pick;
  };
  var arms = { home: "", history: "", week: "", order: 1 };
  var one = function (arm, opts, row) {
    if (opts.length === 1) return opts[0];
    if (opts.length === 2 && row) return opts[row[["home", "history", "week"].indexOf(arm)]];
    return opts[draw(version + "-" + arm, opts.length)];
  };
  if (version === "easy") {
    arms.history = one("history", o.history, null);
  } else {
    var crossed = o.home.length <= 2 && o.history.length <= 2 && o.week.length <= 2;
    var row = crossed ? L4[draw("standard-l4", 4)] : null;
    arms.home = one("home", o.home, row);
    arms.history = one("history", o.history, row);
    arms.week = one("week", o.week, row);
  }
  arms.order = draw("order", o.orders) + 1;
  return arms;
}
function range_(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
function shuffle_(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* lookup: the installed app on iPhone has storage of its own, so it asks for the session by its code. When 20 codes
   in a minute have found nothing, every lookup waits for the next minute, so guessing codes is slow. */
function lookup_(p) {
  var code = normCode_(p.code);
  if (!codeOk_(code)) return { ok: false, error: "bad_code" };
  var props = PropertiesService.getScriptProperties();
  var minute = Math.floor(Date.now() / 60000);
  var rate;
  try { rate = JSON.parse(props.getProperty("lookup_unknown") || "{}"); } catch (err) { rate = {}; }
  if (rate.minute === minute && rate.n >= CONFIG.lookupsUnknown) return { ok: false, error: "rate" };
  var t = open_(view_(book_()), "Sessions", true);
  var row = t ? find_(t, "code", code) : null;
  if (!row) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(5000);
      try { rate = JSON.parse(props.getProperty("lookup_unknown") || "{}"); } catch (err) { rate = {}; }
      if (rate.minute !== minute) rate = { minute: minute, n: 0 };
      rate.n++;
      props.setProperty("lookup_unknown", JSON.stringify(rate));
    } catch (err) {
      /* busy: the count is a brake, not a record */
    } finally {
      lock.releaseLock();
    }
    return { ok: false, error: "unknown" };
  }
  var o = row.obj;
  return {
    ok: true, sid: String(o.sid), code: code, stage: String(o.stage || ""), version: String(o.version || "standard"),
    person: String(o.person || ""), home: String(o.home || ""), history: String(o.history || ""),
    week: String(o.week || ""), order: Number(o.order) || 1
  };
}

/* token: whether the recruiter's tokens tab holds this thank-you code */
function tokenHave_(p) {
  var tk = String(p.t || "");
  if (!TOKEN_RE.test(tk)) return { ok: false, error: "bad_request" };
  var id = PropertiesService.getScriptProperties().getProperty("RECRUITER_SHEET_ID");
  if (!id) return { ok: true, have: false };
  var t = open_(view_(SpreadsheetApp.openById(id)), "tokens", true);
  return { ok: true, have: !!(t && find_(t, "token", tk)) };
}

/* followup: whether the contact with this nonce arrived. The nonce lives in the script's cache for six hours, never
   in a sheet, so nothing joins it to the contact. */
function followupHave_(p) {
  var n = String(p.n || "");
  if (!/^[a-z0-9]{8}$/.test(n)) return { ok: false, error: "bad_request" };
  return { ok: true, have: !!CacheService.getScriptCache().get("fu|" + n) };
}

/* ---------------------------------------------------------------- the recruiter's spreadsheet */

/* Each thank-you code goes into the tokens tab once, at a random row, with nothing else. A follow-up contact goes into
   the followup tab with the Monday of its week, also at a random row. */
function toRecruiter_(pieces, res) {
  var rv = view_(recruiterBook_());
  var props = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();
  var minute = Math.floor(Date.now() / 60000);
  pieces.forEach(function (p) {
    if (p.kind === "token") {
      var t = open_(rv, "tokens");
      if (find_(t, "token", p.f.token)) { res.duplicate++; return; }
      var rate;
      try { rate = JSON.parse(props.getProperty("token_rate") || "{}"); } catch (err) { rate = {}; }
      if (rate.minute !== minute) rate = { minute: minute, n: 0 };
      if (rate.n >= CONFIG.tokensPerMinute) { res.limited++; res.log.push({ what: "token_rate", kind: "token", field: "", sid: "" }); return; }
      rate.n++;
      props.setProperty("token_rate", JSON.stringify(rate));
      insertRandom_(t, { token: p.f.token });
      res.accepted++;
    } else {
      if (cache.get("fu|" + p.f.n)) { res.duplicate++; return; }
      insertRandom_(open_(rv, "followup"), { week: p.f.week || monday_(new Date()), contact: p.f.contact });
      cache.put("fu|" + p.f.n, "1", 21600);
      res.accepted++;
    }
  });
}
/* a row at a random place among the rows there, so the order says nothing about when it came */
function insertRandom_(t, obj) {
  var at = 2 + Math.floor(Math.random() * t.last);   // a row from 2 to last + 1
  if (at <= t.last) {
    t.sh.insertRowBefore(at);
    if (t.max) t.max++;
    t.last++;
    put_(t, at, obj);
  } else {
    append_(t, [obj]);
  }
}
function monday_(d) {
  var day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}
function recruiterBook_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("RECRUITER_SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  var rb = SpreadsheetApp.create("Florin focus group: thank-you codes (recruiter only)");
  props.setProperty("RECRUITER_SHEET_ID", rb.getId());
  var rv = view_(rb);
  open_(rv, "tokens");
  open_(rv, "followup");
  var first = rb.getSheetByName("Sheet1");
  if (first) rb.deleteSheet(first);
  return rb;
}

/* ---------------------------------------------------------------- the index: which seqs each sid and cid has sent */

/* readOnly: for ack, which runs without the lock, so it never makes or changes a tab */
function index_(v, readOnly) {
  var t = open_(v, INDEX_TAB, readOnly);
  var map = {};
  if (t && t.last >= 2) {
    t.sh.getRange(2, 1, t.last - 1, t.head.length).getValues().forEach(function (r, i) {
      var o = obj_(t.head, r);
      if (!o.key) return;
      o.row = i + 2;
      o.key = String(o.key); o.sid = String(o.sid); o.cid = String(o.cid);
      o.count = Number(o.count) || 0; o.in_minute = Number(o.in_minute) || 0; o.have = String(o.have || "");
      try { o.notes = o.notes ? JSON.parse(String(o.notes)) : {}; } catch (err) { o.notes = {}; }
      map[o.key] = o;
    });
  }
  return {
    peek: function (key) { return map[key] || null; },
    get: function (key, sid, cid) {
      if (!map[key]) map[key] = { key: key, sid: sid, cid: cid, have: "", upto: 0, max: 0, count: 0, minute: "", in_minute: 0, notes: {}, row: 0 };
      return map[key];
    },
    save: function (touched, now) {
      var fresh = [];
      Object.keys(touched).forEach(function (key) {
        var o = touched[key], out = {};
        INDEX_HEAD.forEach(function (h) { out[h] = o[h]; });
        out.notes = o.cid === "*" ? JSON.stringify(o.notes || {}) : "";
        out.updated = now;
        if (o.row) put_(t, o.row, out);
        else fresh.push(out);
      });
      append_(t, fresh);
    }
  };
}

/* "1-40,42,44-45": the seqs held, as ranges */
function parseRanges_(s) {
  if (!s) return [];
  return String(s).split(",").map(function (part) {
    var m = part.split("-");
    return [Number(m[0]), Number(m.length > 1 ? m[1] : m[0])];
  }).filter(function (r) { return r[0] >= 1 && r[1] >= r[0]; });
}
function hasSeq_(s, seq) { return parseRanges_(s).some(function (r) { return seq >= r[0] && seq <= r[1]; }); }
function addSeq_(s, seq) {
  var rs = parseRanges_(s);
  rs.push([seq, seq]);
  rs.sort(function (a, b) { return a[0] - b[0]; });
  var out = [];
  rs.forEach(function (r) {
    var last = out[out.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  });
  return out.map(function (r) { return r[0] === r[1] ? String(r[0]) : r[0] + "-" + r[1]; }).join(",");
}
function upto_(s) { var rs = parseRanges_(s); return rs.length && rs[0][0] === 1 ? rs[0][1] : 0; }

/* ---------------------------------------------------------------- the study code */

/* Six characters: five random, then a Luhn mod n check character over CODE_ALPHABET (n is its length). Lower case and
   spaces are taken out first. */
var CODE_RE = new RegExp("^[" + CODE_ALPHABET + "]{6}$");
var TOKEN_RE = new RegExp("^[" + CODE_ALPHABET + "]{8}$");
function normCode_(val) { return String(val || "").toUpperCase().replace(/[\s\-]/g, ""); }
function luhnSum_(s, factor) {
  var n = CODE_ALPHABET.length, sum = 0;
  for (var i = s.length - 1; i >= 0; i--) {
    var a = factor * CODE_ALPHABET.indexOf(s.charAt(i));
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(a / n) + (a % n);
  }
  return sum;
}
function codeOk_(code) { return CODE_RE.test(code) && luhnSum_(code, 1) % CODE_ALPHABET.length === 0; }
function checkChar_(payload) {
  var n = CODE_ALPHABET.length;
  return CODE_ALPHABET.charAt((n - (luhnSum_(payload, 2) % n)) % n);
}

/* ---------------------------------------------------------------- the Sheet */

function book_() {
  var id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  throw new Error("No Sheet: run setup() once, or set the script property SHEET_ID");
}

/* One run's view of a spreadsheet: each tab is looked up once, its header row read once (any expected column that's
   missing is added at the end), and its last row kept as rows go in. Every post waits on the one lock, so each call
   to Sheets saved here is time saved for everyone posting. */
function view_(ss) { return { ss: ss, t: {} }; }
var HEADS = { _index: INDEX_HEAD, _log: LOG_HEAD, tokens: RECRUITER_TABS.tokens, followup: RECRUITER_TABS.followup };

/* A tab as { sh, head, last, max }. readOnly never makes or changes anything, and gives null for a missing tab. */
function open_(v, name, readOnly) {
  if (v.t[name]) return v.t[name];
  var expected = TABS[name] || HEADS[name] || null;
  var sh = v.ss.getSheetByName(name);
  if (!sh) {
    if (readOnly) return null;
    sh = make_(v.ss, name, expected);
  }
  var first = sh.getRange("1:1").getValues()[0];
  var head = first.map(String);
  while (head.length && head[head.length - 1] === "") head.pop();
  if (!readOnly && expected) {
    var missing = expected.filter(function (h) { return head.indexOf(h) < 0; });
    if (missing.length) {
      if (head.length + missing.length > first.length) sh.insertColumnsAfter(first.length, head.length + missing.length - first.length);
      sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing.map(cell_)]).setFontWeight("bold");
      head = head.concat(missing);
    }
  }
  return (v.t[name] = { sh: sh, head: head, last: sh.getLastRow(), max: 0 });
}

/* A new tab with its header row: frozen, bold, the times formatted, the ledger and the log hidden. */
function make_(ss, name, head) {
  var sh = ss.insertSheet(name);
  if (head) {
    var cols = sh.getMaxColumns();
    if (head.length > cols) sh.insertColumnsAfter(cols, head.length - cols);
    sh.getRange(1, 1, 1, head.length).setValues([head.map(cell_)]).setFontWeight("bold");
    sh.setFrozenRows(1);
    head.forEach(function (h, i) {
      if (h === "received" || h === "updated") sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
    });
  }
  if (name.charAt(0) === "_") sh.hideSheet();
  return sh;
}

function obj_(head, vals) {
  var o = {};
  head.forEach(function (h, i) { if (h) o[h] = vals[i]; });
  return o;
}

/* Rows after the last one, with more room made first when the tab is full. */
function append_(t, objs) {
  if (!objs.length) return;
  var end = t.last + objs.length;
  if (!t.max) t.max = t.sh.getMaxRows();
  if (end > t.max) {
    t.sh.insertRowsAfter(t.max, end - t.max + 500);
    t.max = end + 500;
  }
  t.sh.getRange(t.last + 1, 1, objs.length, t.head.length).setValues(objs.map(function (o) {
    return t.head.map(function (h) { return cell_(o[h]); });
  }));
  t.last = end;
}
function put_(t, r, obj) {
  if (r > t.last) return append_(t, [obj]);
  t.sh.getRange(r, 1, 1, t.head.length).setValues([t.head.map(function (h) { return cell_(obj[h]); })]);
}
/* A row out. Sheets won't delete the last row under a frozen header, so that one is cleared instead. */
function remove_(t, r) {
  if (!t.max) t.max = t.sh.getMaxRows();
  if (t.max <= 2) t.sh.getRange(r, 1, 1, t.head.length).clearContent();
  else { t.sh.deleteRow(r); t.max--; }
  if (r <= t.last) t.last--;
}
function findAll_(t, col, value) {
  var c = t.head.indexOf(col);
  if (c < 0 || t.last < 2 || !value) return [];
  return t.sh.getRange(2, c + 1, t.last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findAll()
    .map(function (hit) {
      var r = hit.getRow();
      return { row: r, obj: obj_(t.head, t.sh.getRange(r, 1, 1, t.head.length).getValues()[0]) };
    });
}
function find_(t, col, value) {
  var c = t.head.indexOf(col);
  if (c < 0 || t.last < 2 || !value) return null;
  var hit = t.sh.getRange(2, c + 1, t.last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findNext();
  if (!hit) return null;
  var r = hit.getRow();
  return { row: r, obj: obj_(t.head, t.sh.getRange(r, 1, 1, t.head.length).getValues()[0]) };
}

/* A value as Sheets should keep it. Text goes in behind an apostrophe, which Sheets hides: then nothing a person typed
   can become a formula, and a code like 4E3679 or a range of seqs like 1-12 stays text, never a number or a date. */
function cell_(val) {
  if (val === undefined || val === null) return "";
  if (val instanceof Date) return val;
  if (typeof val === "number") return isFinite(val) ? val : "";
  if (typeof val === "boolean") return val ? "yes" : "no";
  var s = String(val);
  return s === "" ? "" : "'" + s;
}

/* ---------------------------------------------------------------- the log: refusals and errors, without content */

function writeLog_(v, entries) {
  if (!entries || !entries.length) return;
  var t = open_(v, LOG_TAB);
  if (t.last > CONFIG.logRows) return;
  var now = new Date();
  append_(t, entries.map(function (e) {
    return { received: now, what: e.what, kind: e.kind || "", field: e.field || "", sid: e.sid || "" };
  }));
}
function logNow_(entries) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try { writeLog_(view_(book_()), entries); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  } catch (err) {
    /* the log is a help, never a reason to fail */
  }
}
function where_(err) {
  var m = err && err.stack ? String(err.stack).match(/Code(?:\.gs)?:(\d+)/) : null;
  return m ? "Code.gs:" + m[1] : "";
}

/* ---------------------------------------------------------------- setup, and tools for Will */

/* Run once from the editor. Makes the tabs and header rows, the README tab and the recruiter's spreadsheet, and logs
   both links. Safe to run again: it adds what's missing and rewrites the README. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = props.getProperty("SHEET_ID") ? SpreadsheetApp.openById(props.getProperty("SHEET_ID")) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.create("Florin focus group answers");
    props.setProperty("SHEET_ID", ss.getId());
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    readme_(ss);
    var v = view_(ss);
    Object.keys(TABS).concat([INDEX_TAB, LOG_TAB]).forEach(function (name) { open_(v, name); });
    var blank = ss.getSheetByName("Sheet1");
    if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);
    var rb = recruiterBook_();
    var rv = view_(rb);
    open_(rv, "tokens");
    open_(rv, "followup");
    SpreadsheetApp.flush();
    var msg = "Done.\nThe answers Sheet: " + ss.getUrl() + "\nThe thank-you codes, for the recruiter only: " + rb.getUrl();
    Logger.log(msg);
    return msg;
  } finally {
    lock.releaseLock();
  }
}

function readme_(ss) {
  var sh = ss.getSheetByName("README") || ss.insertSheet("README", 0);
  sh.clear();
  var bold = [];
  var lines = [];
  var h = function (x) { lines.push(x); bold.push(lines.length); };
  var t = function (x) { lines.push(x); };
  h("Florin focus group answers");
  t("Prototype only. Not for patients.");
  t("");
  h("What this Sheet holds");
  t("Every piece of each participant's session, sent by the study app as it happened, under a random session id (sid). No names, emails, phone numbers, locations or IP addresses. Nothing a participant logged in the app itself (BMs, symptoms, meals, notes, check-in answers, questions to Ask Florin) is ever sent.");
  t("Thank-you codes and any follow-up contact go to the recruiter's separate spreadsheet, at random rows, with no sid and no time, so they can't be joined to these answers. Never copy them here.");
  t("");
  h("The tabs");
  t("Sessions: one row per session, updated as pieces arrive (last_at can trail the newest piece by up to a minute). code is the study code a participant sends to have their answers removed. stage is the furthest step reached. sus is the usability score, 0 to 100, once all ten statements are answered. installed is yes once a piece came from the app on the home screen.");
  t("Answers: one row per question answered or skipped. qid is the question's id in the plan (section 4). correct and right are filled in for the reading questions.");
  t("Tasks: one row per task attempt. outcome: seen (the app saw the goal), said (Done without the goal), stuck, declined or broken (the reason given for Skip). For install: seen, said, browser or couldnt.");
  t("Comments: one row per comment, from a double tap or the Comment button, with the screen, the part of it and where. A comment the participant took back is removed.");
  t("Events: what happened in the app: screens, taps on named controls, cards in view, how far down people scrolled. Never what anyone logged or typed.");
  t("Hidden tabs: _index (which pieces each session has sent, so nothing is counted twice) and _log (pieces refused, and errors, with the reason and the field only). Leave them as they are.");
  t("");
  h("On every row");
  t("received: when the script wrote it, in this Sheet's time zone. sid: the session. cid: the browser tab or app window that sent it. seq: its number from that cid. at: the phone's clock when it happened, in UTC. study: the study id, ending -test on test runs. build: the app's version.");
  t("");
  h("Reading it");
  t("Leave out sessions whose study ends in -test. Count each person once: a session with restart_of replaces the one it names, unless that one reached further. Every number says its count, such as 16 of 21.");
  t("You can sort, filter, and add columns of your own with a header. Don't rename or delete the script's columns: a deleted one comes back, empty, at the end.");
  t("");
  h("Removing a participant's answers");
  t("When someone emails their study code: the Florin study menu, Remove a session by its code. It deletes every row with that session's sid on every tab. Then delete the email. In a standalone script, set the script property REMOVE_CODE to the code and run removeByCodeProperty.");
  t("");
  h("Keeping it");
  t("Share this Sheet only with the research team named in the consent, with no public or anyone-with-the-link access. Delete it the number of months after the study closes that the consent says. When the study closes, set open to false in config.js, set the script property CLOSED to yes, and archive the deployment.");
  t("");
  t("The System Usability Scale: John Brooke (1996), SUS: a quick and dirty usability scale.");
  sh.getRange(1, 1, lines.length, 1).setValues(lines.map(function (l) { return [cell_(l)]; })).setWrap(true);
  bold.forEach(function (r) { sh.getRange(r, 1).setFontWeight("bold"); });
  sh.getRange(1, 1).setFontSize(14);
  sh.setColumnWidth(1, 900);
}

/* The Sheet's menu, when the script is bound to it. */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu("Florin study")
      .addItem("Set up the tabs", "setup")
      .addItem("Remove a session by its code", "removeByCodePrompt")
      .addToUi();
  } catch (err) {
    /* no menu for a standalone script */
  }
}

function removeByCodePrompt() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt("Remove a session", "The study code the participant sent (6 characters):", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  ui.alert("Remove a session", removeSessionByCode(r.getResponseText()), ui.ButtonSet.OK);
}

function removeByCodeProperty() {
  var props = PropertiesService.getScriptProperties();
  var out = removeSessionByCode(props.getProperty("REMOVE_CODE") || "");
  props.deleteProperty("REMOVE_CODE");
  Logger.log(out);
  return out;
}

/* Deletes every row of the session with this code, on every tab, the hidden ones included. */
function removeSessionByCode(code) {
  code = normCode_(code);
  if (!codeOk_(code)) return "That code doesn't look right: " + code + ". Check it and try again.";
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = book_();
    var t = open_(view_(ss), "Sessions", true);
    var row = t ? find_(t, "code", code) : null;
    if (!row) return "No session has the code " + code + ".";
    var sid = String(row.obj.sid), removed = 0;
    Object.keys(TABS).concat([INDEX_TAB, LOG_TAB]).forEach(function (name) {
      var sh = ss.getSheetByName(name);
      if (sh) removed += dropSid_(sh, sid);
    });
    SpreadsheetApp.flush();
    return "Removed " + removed + " rows for the code " + code + ".";
  } finally {
    lock.releaseLock();
  }
}

/* A tab without the rows of one sid: one read and one write, however many rows go. */
function dropSid_(sh, sid) {
  var last = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (last < 2 || !lastCol) return 0;
  var c = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String).indexOf("sid");
  if (c < 0) return 0;
  var vals = sh.getRange(2, 1, last - 1, lastCol).getValues();
  var keep = vals.filter(function (r) { return String(r[c]) !== sid; });
  var gone = vals.length - keep.length;
  if (!gone) return 0;
  if (keep.length) sh.getRange(2, 1, keep.length, lastCol).setValues(keep.map(function (r) { return r.map(cell_); }));
  sh.getRange(2 + keep.length, 1, gone, lastCol).clearContent();
  return gone;
}
