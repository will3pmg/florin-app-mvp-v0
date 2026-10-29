/* The study's back end, on this computer: a node http server that runs focus/apps-script/Code.gs itself, under the
   Apps Script stand-in (focus/apps-script/gas-stub.js), so it keeps the same contract (focus/CONTRACT.md) because it
   is the same code. It writes every tab as a JSON file of rows, for local tests and the Playwright runs.

     node focus/mock-endpoint.js [--port 8788] [--dir <folder>] [--fresh] [--latency <ms>] [--study <id,id>]
                                 [--site <folder> --site-port 8787] [--no-redirect] [--quiet]

   Paste http://localhost:8788/exec into focus/config.js as `endpoint` (or pass it however the build takes it).

   It answers the way a deployed Apps Script web app does, so a phone that works against it works against Google:
     POST /exec    runs doPost. Apps Script answers a POST with a 302 to a googleusercontent.com address that holds the
                   reply; so does this, to /echo. The phone posts with mode "no-cors" and never reads it.
     GET  /exec    runs doGet: JSONP with ?callback=, JSON without, and a plain line with no op at all. Also by a 302
                   to /echo, which a script tag follows.
     GET  /echo    the reply, with Access-Control-Allow-Origin: *, as googleusercontent.com sends it.
     OPTIONS       405, with no CORS headers: Apps Script has no answer to a preflight, so a POST that needs one
                   (JSON as application/json, or any custom header) fails here as it would there.
   And for tests:
     GET  /__mock/state        every tab of both spreadsheets as rows, and the script properties
     GET  /__mock/rows/<tab>   one tab's rows (Sessions, Answers, Tasks, Comments, Events, _index, _log, tokens, followup)
     POST /__mock/reset        a fresh Sheet, as setup() makes it
     POST /__mock/fail?mode=down|error|slow&times=<n>&ms=<ms>
                               the next n requests to /exec: down (the connection is dropped), error (a 500 page, as
                               Google gives when the script is busy or broken), slow (an extra wait). mode=off clears it
     POST /__mock/clock?offset=<ms>   moves the script's clock, to step past the per-minute limits
   The files: <dir>/state.json (everything, reloaded on the next start unless --fresh), and <dir>/<tab>.json for each
   tab. The default folder is florin-mock-endpoint in the system's temp folder, outside the repository. */
"use strict";
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { makeGas, loadScript } = require("./apps-script/gas-stub.js");

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf("--" + name); return i < 0 ? dflt : (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true); };
const PORT = Number(opt("port", 8788));
const DIR = path.resolve(String(opt("dir", path.join(os.tmpdir(), "florin-mock-endpoint"))));
const LATENCY = Number(opt("latency", 0));
const STUDY = opt("study", "");
const SITE = opt("site", "");
const SITE_PORT = Number(opt("site-port", 8787));
const REDIRECT = !args.includes("--no-redirect");
const QUIET = args.includes("--quiet");

let offset = 0;                        // the script's clock, moved by /__mock/clock
let fail = { mode: "off", times: 0, ms: 0 };
let gas, script;

function boot(fresh) {
  gas = makeGas({ now: () => Date.now() + offset, bookName: "Florin focus group answers (local)" });
  const file = path.join(DIR, "state.json");
  if (!fresh && fs.existsSync(file)) gas.load(JSON.parse(fs.readFileSync(file, "utf8")));
  script = loadScript(gas, path.join(__dirname, "apps-script", "Code.gs"));
  if (STUDY) gas.props.STUDIES = String(STUDY);
  if (fresh || !fs.existsSync(file)) script.setup();
  save();
}

function rowsAll() {
  const out = {};
  const main = gas.activeId, rec = gas.props.RECRUITER_SHEET_ID;
  for (const tab of ["Sessions", "Answers", "Tasks", "Comments", "Events", "_index", "_log"]) out[tab] = gas.rowsOf(tab, main);
  for (const tab of ["tokens", "followup"]) out[tab] = rec ? gas.rowsOf(tab, rec) : [];
  return out;
}
function save() {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, "state.json"), JSON.stringify(gas.dump()));
  const all = rowsAll();
  for (const tab of Object.keys(all)) fs.writeFileSync(path.join(DIR, tab + ".json"), JSON.stringify(all[tab], null, 1));
}

const MIME = { JAVASCRIPT: "application/javascript; charset=utf-8", JSON: "application/json; charset=utf-8", TEXT: "text/plain; charset=utf-8" };
const echoes = new Map();              // id -> { type, body }, kept for a minute as Google keeps them
function echo(res, out) {
  const type = MIME[out.getMimeType()] || MIME.TEXT, body = out.getContent();
  if (!REDIRECT) { res.writeHead(200, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }); res.end(body); return; }
  const id = crypto.randomBytes(12).toString("hex");
  echoes.set(id, { type, body });
  setTimeout(() => echoes.delete(id), 60000).unref();
  res.writeHead(302, { Location: `/echo?id=${id}`, "Cache-Control": "no-store" });
  res.end();
}
const say = (line) => { if (!QUIET) console.log(`${new Date().toISOString().slice(11, 19)} ${line}`); };

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === "/echo") {
      const e = echoes.get(url.searchParams.get("id") || "");
      if (!e) { res.writeHead(404, { "Content-Type": MIME.TEXT }); res.end("Sorry, the file you have requested does not exist."); return; }
      echoes.delete(url.searchParams.get("id"));
      res.writeHead(200, { "Content-Type": e.type, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
      res.end(e.body);
      return;
    }
    if (p === "/exec") {
      if (req.method === "OPTIONS") { res.writeHead(405, { "Content-Type": MIME.TEXT, Allow: "GET, POST" }); res.end("Method not allowed"); say("OPTIONS /exec: 405, as Apps Script answers a preflight"); return; }
      if (fail.times > 0 && fail.mode !== "off") {
        fail.times--;
        if (fail.mode === "down") { say(`${req.method} /exec: dropped (fail=down)`); req.socket.destroy(); return; }
        if (fail.mode === "error") { await readBody(req); res.writeHead(500, { "Content-Type": "text/html" }); res.end("<html><body>We're sorry, a server error occurred. Please wait a bit and try again.</body></html>"); say(`${req.method} /exec: 500 (fail=error)`); return; }
        if (fail.mode === "slow") await wait(fail.ms || 10000);
      }
      if (LATENCY) await wait(LATENCY);
      if (req.method === "POST") {
        const body = await readBody(req);
        const out = script.doPost({ postData: { contents: body, length: body.length, type: String(req.headers["content-type"] || "") }, parameter: Object.fromEntries(url.searchParams) });
        save();
        let r = {};
        try { r = JSON.parse(out.getContent()); } catch (err) { r = {}; }
        let kinds = "";
        try { const d = JSON.parse(body); kinds = [...new Set((d.pieces || []).map((x) => x && x.kind))].join(","); } catch (err) { kinds = "?"; }
        say(`POST /exec ${kinds}: ${r.ok ? `${r.accepted} accepted, ${r.duplicate} duplicate, ${r.refused} refused, ${r.limited} limited` : r.error}${req.headers["content-type"] && !/^text\/plain/.test(req.headers["content-type"]) ? `  (content-type ${req.headers["content-type"]})` : ""}`);
        echo(res, out);
        return;
      }
      if (req.method === "GET") {
        const params = Object.fromEntries(url.searchParams);
        const out = script.doGet({ parameter: params, queryString: url.search.slice(1) });
        save();
        let brief = out.getContent().replace(/^\/\*\*\/[A-Za-z0-9_$]+\(/, "").replace(/\);$/, "");
        if (brief.length > 160) brief = brief.slice(0, 160) + "...";
        say(`GET /exec op=${params.op || "-"}: ${brief}`);
        echo(res, out);
        return;
      }
    }
    if (p.startsWith("/__mock/")) {
      const send = (obj) => { res.writeHead(200, { "Content-Type": MIME.JSON, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj, null, 1)); };
      if (p === "/__mock/state") return send({ tabs: rowsAll(), properties: gas.props, dir: DIR });
      if (p.startsWith("/__mock/rows/")) return send(rowsAll()[decodeURIComponent(p.slice(13))] || []);
      if (p === "/__mock/reset" && req.method === "POST") { offset = 0; fail = { mode: "off", times: 0, ms: 0 }; boot(true); say("reset: a fresh Sheet"); return send({ ok: true }); }
      if (p === "/__mock/fail" && req.method === "POST") {
        fail = { mode: url.searchParams.get("mode") || "off", times: Number(url.searchParams.get("times") || 1), ms: Number(url.searchParams.get("ms") || 0) };
        say(`fail: ${fail.mode} for the next ${fail.times}`);
        return send({ ok: true, fail });
      }
      if (p === "/__mock/clock" && req.method === "POST") { offset += Number(url.searchParams.get("offset") || 0); return send({ ok: true, now: new Date(Date.now() + offset).toISOString() }); }
    }
    res.writeHead(404, { "Content-Type": MIME.TEXT });
    res.end("Not found. The endpoint is /exec.");
  } catch (err) {
    res.writeHead(500, { "Content-Type": MIME.TEXT });
    res.end("mock-endpoint: " + err.message);
    console.error(err);
  }
});

/* --site: the participant app's folder, served on its own port, so the page and the endpoint are different origins
   as they are when Netlify and Google serve them */
function serveSite(dir, port) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain" };
  const root = path.resolve(dir);
  http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`The site: http://localhost:${port}/ (from ${root})`));
}

boot(args.includes("--fresh"));
server.listen(PORT, () => {
  console.log(`The study's endpoint, on this computer: http://localhost:${PORT}/exec`);
  console.log(`Rows are written to ${DIR}`);
  if (SITE) serveSite(String(SITE), SITE_PORT);
});
