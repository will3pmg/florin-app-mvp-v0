/* A small stand-in for the Google Apps Script services Code.gs uses, so the script runs in node: for the tests
   (focus/apps-script/test.js) and for the local endpoint (focus/mock-endpoint.js).
   It covers SpreadsheetApp (spreadsheets, sheets, ranges, text finders, a menu), ContentService, LockService,
   PropertiesService, Utilities, Session and Logger, as far as Code.gs reaches. It is strict where Sheets would
   quietly do something else:
     - a string that starts with = is a formula in Sheets, so the stub records it in `formulas` (the tests want none);
     - a string Sheets would read as a number, a date or TRUE/FALSE is recorded in `autoParsed`, unless it was written
       with the leading apostrophe that keeps it text (the apostrophe itself is never stored, as in Sheets);
     - every write while the script lock isn't held is recorded in `unlocked` (the tests want none).
   load(state) and dump() move the whole thing to and from plain JSON, which is how the local endpoint keeps it. */
"use strict";
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function makeGas(opts) {
  opts = opts || {};
  const tz = opts.timeZone || "America/New_York";
  /* calls: the Sheets calls that read (getValues, getLastRow, a text finder's search and the like), a rough guide to how
     long a post takes on Google's side: Apps Script holds writes back and sends them together, but each read has to
     wait for its answer. writes: the calls that change something. */
  const log = { formulas: [], autoParsed: [], unlocked: [], logs: [], calls: 0, writes: 0 };
  const tick = () => { log.calls++; };
  const wtick = () => { log.writes++; };
  const lock = { held: false, waits: 0 };
  const props = Object.assign({}, opts.properties || {});
  const cache = {}; // the script cache: key -> { v, until }
  const books = {}; // id -> { id, name, tz, sheets: [ { id, name, rows: [[]], hidden, frozen } ] }
  let activeId = null;
  let nextSheetId = 1;
  let now = opts.now || null; // a fixed clock for the tests: a function returning ms

  /* the values Sheets would turn into something else when written as plain text */
  const looksParsed = (s) => /^\s*[-+]?(\d[\d,]*\.?\d*|\.\d+)(e[-+]?\d+)?\s*%?\s*$/i.test(s) ||
    /^\s*\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?\s*$/.test(s) || /^\s*\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\s*$/i.test(s) ||
    /^\s*(true|false)\s*$/i.test(s) || /^\s*\$\s*\d/.test(s);

  function store(book, sheet, r, c, v) {
    if (!lock.held) log.unlocked.push(`${sheet.name}!R${r}C${c}`);
    if (typeof v === "string") {
      if (v.charAt(0) === "'") v = v.slice(1);
      else if (v.charAt(0) === "=") { log.formulas.push({ sheet: sheet.name, r, c, v }); }
      else if (v !== "" && looksParsed(v)) log.autoParsed.push({ sheet: sheet.name, r, c, v });
    }
    if (v === undefined || v === null) v = "";
    while (sheet.rows.length < r) sheet.rows.push([]);
    const row = sheet.rows[r - 1];
    while (row.length < c) row.push("");
    row[c - 1] = v;
  }
  function read(sheet, r, c) {
    const row = sheet.rows[r - 1];
    if (!row || row[c - 1] === undefined) return "";
    return row[c - 1];
  }
  const lastRow = (sheet) => {
    for (let i = sheet.rows.length; i > 0; i--) if (sheet.rows[i - 1].some((v) => v !== "")) return i;
    return 0;
  };
  const lastCol = (sheet) => sheet.rows.reduce((m, row) => {
    for (let i = row.length; i > 0; i--) if (row[i - 1] !== "") return Math.max(m, i);
    return m;
  }, 0);

  function Range(book, sheet, row, col, nr, nc) {
    if (row < 1 || col < 1 || nr < 1 || nc < 1) throw new Error(`Range out of bounds: ${row},${col},${nr},${nc}`);
    if (row + nr - 1 > sheet.maxRows || col + nc - 1 > sheet.maxCols) throw new Error(`The coordinates of the range are outside the dimensions of the sheet. (${sheet.name}: ${row + nr - 1} of ${sheet.maxRows} rows, ${col + nc - 1} of ${sheet.maxCols} columns)`);
    const self = {
      getRow: () => row, getColumn: () => col, getNumRows: () => nr, getNumColumns: () => nc, getLastRow: () => row + nr - 1,
      getSheet: () => SheetObj(book, sheet),
      getValues: () => { tick(); const out = []; for (let i = 0; i < nr; i++) { const a = []; for (let j = 0; j < nc; j++) a.push(read(sheet, row + i, col + j)); out.push(a); } return out; },
      getDisplayValues: () => self.getValues().map((a) => a.map((v) => (v instanceof Date ? v.toISOString() : String(v)))),
      getValue: () => read(sheet, row, col),
      setValues: (vals) => {
        wtick();
        if (!Array.isArray(vals) || vals.length !== nr) throw new Error(`The number of rows in the data does not match the number of rows in the range. The data has ${vals && vals.length} but the range has ${nr}.`);
        vals.forEach((a, i) => {
          if (a.length !== nc) throw new Error(`The number of columns in the data does not match the number of columns in the range. The data has ${a.length} but the range has ${nc}.`);
          a.forEach((v, j) => store(book, sheet, row + i, col + j, v));
        });
        return self;
      },
      setValue: (v) => { store(book, sheet, row, col, v); return self; },
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sheet.rows[row + i - 1]) store(book, sheet, row + i, col + j, ""); return self; },
      setNumberFormat: () => self, setNumberFormats: () => self, setFontWeight: () => self, setBackground: () => self,
      setFontColor: () => self, setWrap: () => self, setWrapStrategy: () => self, setVerticalAlignment: () => self,
      setHorizontalAlignment: () => self, setFontSize: () => self, setFontFamily: () => self,
      createTextFinder: (text) => Finder(book, sheet, text, { row, col, nr, nc }),
    };
    return self;
  }
  function Finder(book, sheet, text, area) {
    let entire = false, matchCase = false;
    const f = {
      matchEntireCell: (b) => { entire = b !== false; return f; },
      matchCase: (b) => { matchCase = b !== false; return f; },
      useRegularExpression: () => f,
      findAll: () => {
        tick();
        const a = area || { row: 1, col: 1, nr: Math.max(1, lastRow(sheet)), nc: Math.max(1, lastCol(sheet)) };
        const out = [];
        const want = matchCase ? String(text) : String(text).toLowerCase();
        for (let i = 0; i < a.nr; i++) for (let j = 0; j < a.nc; j++) {
          let v = read(sheet, a.row + i, a.col + j);
          v = v instanceof Date ? v.toISOString() : String(v);
          if (!matchCase) v = v.toLowerCase();
          if (entire ? v === want : v.indexOf(want) >= 0) out.push(Range(book, sheet, a.row + i, a.col + j, 1, 1));
        }
        return out;
      },
      findNext: () => f.findAll()[0] || null,
    };
    return f;
  }
  function SheetObj(book, sheet) {
    const self = {
      getName: () => sheet.name, setName: (n) => { sheet.name = n; return self; }, getSheetId: () => sheet.id,
      getParent: () => BookObj(book),
      getLastRow: () => { tick(); return lastRow(sheet); }, getLastColumn: () => { tick(); return lastCol(sheet); },
      getMaxRows: () => { tick(); return sheet.maxRows; }, getMaxColumns: () => { tick(); return sheet.maxCols; },
      getRange: (r, c, nr, nc) => {
        if (typeof r === "string") {
          const m = /^(\d+):(\d+)$/.exec(r);
          if (!m) throw new Error("The stub takes numeric ranges, or whole rows such as 1:1");
          return Range(book, sheet, Number(m[1]), 1, Number(m[2]) - Number(m[1]) + 1, sheet.maxCols);
        }
        return Range(book, sheet, r, c, nr || 1, nc || 1);
      },
      getDataRange: () => Range(book, sheet, 1, 1, Math.max(1, lastRow(sheet)), Math.max(1, lastCol(sheet))),
      appendRow: (vals) => { wtick(); const r = lastRow(sheet) + 1; if (r > sheet.maxRows) sheet.maxRows = r; if (vals.length > sheet.maxCols) sheet.maxCols = vals.length; vals.forEach((v, j) => store(book, sheet, r, j + 1, v)); return self; },
      insertRowBefore: (r) => self.insertRowsBefore(r, 1),
      insertRowsBefore: (r, n) => {
        wtick(); if (!lock.held) log.unlocked.push(`${sheet.name}!insert`);
        if (r < 1 || r > sheet.maxRows) throw new Error(`Those rows are out of bounds. (${sheet.name}: ${r} of ${sheet.maxRows})`);
        while (sheet.rows.length < r - 1) sheet.rows.push([]);
        const add = []; for (let i = 0; i < n; i++) add.push([]);
        sheet.rows.splice(r - 1, 0, ...add); sheet.maxRows += n; return self;
      },
      insertRowAfter: (r) => self.insertRowsAfter(r, 1),
      insertRowsAfter: (r, n) => {
        wtick(); if (!lock.held) log.unlocked.push(`${sheet.name}!insert`);
        if (r < 1 || r > sheet.maxRows) throw new Error(`Those rows are out of bounds. (${sheet.name}: ${r} of ${sheet.maxRows})`);
        if (sheet.rows.length > r) { const add = []; for (let i = 0; i < n; i++) add.push([]); sheet.rows.splice(r, 0, ...add); }
        sheet.maxRows += n; return self;
      },
      insertColumnsAfter: (c, n) => {
        wtick(); if (!lock.held) log.unlocked.push(`${sheet.name}!insertColumns`);
        if (c < 1 || c > sheet.maxCols) throw new Error(`Those columns are out of bounds. (${sheet.name}: ${c} of ${sheet.maxCols})`);
        sheet.rows.forEach((row) => { if (row.length > c) row.splice(c, 0, ...new Array(n).fill("")); });
        sheet.maxCols += n; return self;
      },
      deleteRow: (r) => self.deleteRows(r, 1),
      deleteRows: (r, n) => {
        wtick(); if (!lock.held) log.unlocked.push(`${sheet.name}!delete`);
        if (sheet.maxRows - n <= (sheet.frozen || 0)) throw new Error("Sorry, it is not possible to delete all non-frozen rows.");
        sheet.rows.splice(r - 1, n); sheet.maxRows -= n; return self;
      },
      clear: () => { wtick(); if (!lock.held) log.unlocked.push(`${sheet.name}!clear`); sheet.rows = []; return self; },
      clearContents: () => { wtick(); if (!lock.held) log.unlocked.push(`${sheet.name}!clear`); sheet.rows = []; return self; },
      setFrozenRows: (n) => { wtick(); sheet.frozen = n; return self; }, getFrozenRows: () => { tick(); return sheet.frozen || 0; },
      hideSheet: () => { sheet.hidden = true; return self; }, showSheet: () => { sheet.hidden = false; return self; },
      isSheetHidden: () => !!sheet.hidden,
      setColumnWidth: () => self, setColumnWidths: () => self, autoResizeColumns: () => self, setTabColor: () => self,
      activate: () => self, protect: () => ({ setDescription() { return this; }, setWarningOnly() { return this; } }),
      createTextFinder: (text) => Finder(book, sheet, text, null),
    };
    return self;
  }
  function BookObj(book) {
    const self = {
      getId: () => book.id, getName: () => book.name, getUrl: () => `https://docs.google.com/spreadsheets/d/${book.id}/edit`,
      getSpreadsheetTimeZone: () => book.tz,
      getSheetByName: (n) => { tick(); const s = book.sheets.find((x) => x.name === n); return s ? SheetObj(book, s) : null; },
      getSheets: () => book.sheets.map((s) => SheetObj(book, s)),
      insertSheet: (name, index) => {
        if (book.sheets.some((x) => x.name === name)) throw new Error(`A sheet with the name "${name}" already exists. Please enter another name.`);
        const s = { id: nextSheetId++, name, rows: [], hidden: false, frozen: 0, maxRows: 1000, maxCols: 26 };
        if (typeof index === "number") book.sheets.splice(index, 0, s); else book.sheets.push(s);
        return SheetObj(book, s);
      },
      deleteSheet: (sh) => { book.sheets = book.sheets.filter((x) => x.name !== sh.getName()); },
      setActiveSheet: (sh) => sh, moveActiveSheet: () => {}, getActiveSheet: () => SheetObj(book, book.sheets[0]),
    };
    return self;
  }
  function newBook(name, id) {
    id = id || crypto.randomBytes(16).toString("hex");
    books[id] = { id, name, tz, sheets: [{ id: nextSheetId++, name: "Sheet1", rows: [], hidden: false, frozen: 0, maxRows: 1000, maxCols: 26 }] };
    return books[id];
  }
  if (opts.bound !== false) activeId = newBook(opts.bookName || "Florin focus group", opts.bookId).id;

  const ui = {
    calls: [], promptReply: null, alertReply: "OK",
    createMenu(name) { const m = { items: [], addItem(label, fn) { m.items.push([label, fn]); return m; }, addSeparator() { return m; }, addToUi() { ui.calls.push(["menu", name, m.items]); } }; return m; },
    prompt(title, text) { ui.calls.push(["prompt", title, text]); const r = ui.promptReply || { button: "OK", text: "" }; return { getSelectedButton: () => r.button, getResponseText: () => r.text }; },
    alert(title, text) { ui.calls.push(["alert", title, text]); return ui.alertReply; },
    ButtonSet: { OK: "OK", OK_CANCEL: "OK_CANCEL", YES_NO: "YES_NO" }, Button: { OK: "OK", CANCEL: "CANCEL", YES: "YES", NO: "NO", CLOSE: "CLOSE" },
  };

  const globals = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => (activeId ? BookObj(books[activeId]) : null),
      openById: (id) => { if (!books[id]) throw new Error(`Unexpected error while getting the method or property openById on object SpreadsheetApp.`); return BookObj(books[id]); },
      create: (name) => BookObj(newBook(name)),
      flush: () => {},
      getUi: () => ui,
    },
    ContentService: {
      MimeType: { JAVASCRIPT: "JAVASCRIPT", JSON: "JSON", TEXT: "TEXT", CSV: "CSV" },
      createTextOutput: (content) => {
        const o = { content: content == null ? "" : String(content), mime: "TEXT" };
        o.setMimeType = (m) => { o.mime = m; return o; }; o.getMimeType = () => o.mime;
        o.getContent = () => o.content; o.setContent = (c) => { o.content = String(c); return o; }; o.append = (c) => { o.content += c; return o; };
        return o;
      },
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => { lock.waits++; lock.held = true; }, tryLock: () => { lock.held = true; return true; },
        releaseLock: () => { lock.held = false; }, hasLock: () => lock.held,
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); return this; }, deleteProperty: (k) => { delete props[k]; },
        getProperties: () => Object.assign({}, props), setProperties: (o) => { Object.keys(o).forEach((k) => (props[k] = String(o[k]))); },
        getKeys: () => Object.keys(props),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => { const e = cache[k]; if (!e) return null; if (e.until < (now ? now() : Date.now())) { delete cache[k]; return null; } return e.v; },
        put: (k, v, secs) => { cache[k] = { v: String(v), until: (now ? now() : Date.now()) + Math.min(21600, secs || 600) * 1000 }; },
        remove: (k) => { delete cache[k]; },
      }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      sleep: () => {},
      formatDate: (d, zone, fmt) => {
        const iso = new Date(d).toISOString();
        return fmt.replace("yyyy", iso.slice(0, 4)).replace("MM", iso.slice(5, 7)).replace("dd", iso.slice(8, 10))
          .replace("HH", iso.slice(11, 13)).replace("mm", iso.slice(14, 16)).replace("ss", iso.slice(17, 19));
      },
    },
    Session: { getScriptTimeZone: () => tz },
    Logger: { log: (...a) => { log.logs.push(a.join(" ")); } },
  };
  globals.console = { log: globals.Logger.log, warn: globals.Logger.log, error: globals.Logger.log, info: globals.Logger.log };

  return {
    globals, log, lock, props, books, ui,
    get activeId() { return activeId; },
    setNow(fn) { now = fn; },
    nowFn() { return now; },
    book: (id) => BookObj(books[id || activeId]),
    /* the rows of a tab as objects keyed by the header row */
    rowsOf(name, id) {
      const b = books[id || activeId]; const s = b && b.sheets.find((x) => x.name === name);
      if (!s || !s.rows.length) return [];
      const head = s.rows[0];
      return s.rows.slice(1).filter((r) => r.some((v) => v !== "")).map((r) => {
        const o = {}; head.forEach((h, i) => { if (h !== "") o[h] = r[i] === undefined ? "" : r[i]; }); return o;
      });
    },
    dump() {
      const out = { activeId, props, cache, books: {} };
      Object.values(books).forEach((b) => {
        out.books[b.id] = { id: b.id, name: b.name, tz: b.tz, sheets: b.sheets.map((s) => ({ name: s.name, hidden: !!s.hidden, frozen: s.frozen || 0, maxRows: s.maxRows, maxCols: s.maxCols, rows: s.rows.map((r) => r.map((v) => (v instanceof Date ? { $date: v.toISOString() } : v))) })) };
      });
      return out;
    },
    load(state) {
      Object.keys(books).forEach((k) => delete books[k]);
      Object.keys(props).forEach((k) => delete props[k]);
      Object.assign(props, state.props || {});
      Object.keys(cache).forEach((k) => delete cache[k]);
      Object.assign(cache, state.cache || {});
      Object.values(state.books || {}).forEach((b) => {
        books[b.id] = { id: b.id, name: b.name, tz: b.tz || tz, sheets: b.sheets.map((s) => ({ id: nextSheetId++, name: s.name, hidden: s.hidden, frozen: s.frozen, maxRows: s.maxRows || Math.max(1000, s.rows.length), maxCols: s.maxCols || 26, rows: s.rows.map((r) => r.map((v) => (v && typeof v === "object" && v.$date ? new Date(v.$date) : v))) })) };
      });
      activeId = state.activeId || null;
    },
  };
}

/* Code.gs run in a fresh context with the stub's services as its globals. A fixed clock (gas.setNow) replaces Date's
   now inside the script, so the tests can step through minutes. */
function loadScript(gas, file) {
  const src = fs.readFileSync(file || path.join(__dirname, "Code.gs"), "utf8");
  const ctx = Object.assign({}, gas.globals);
  ctx.Math = Math; ctx.JSON = JSON;
  const RealDate = Date;
  function FakeDate(...a) {
    const f = gas.nowFn();
    if (!(this instanceof FakeDate)) return new RealDate(f ? f() : RealDate.now()).toString();
    return a.length ? new RealDate(...a) : new RealDate(f ? f() : RealDate.now());
  }
  FakeDate.now = () => { const f = gas.nowFn(); return f ? f() : RealDate.now(); };
  FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.prototype = RealDate.prototype;
  ctx.Date = FakeDate;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: "Code.gs" });
  return ctx;
}

module.exports = { makeGas, loadScript };
