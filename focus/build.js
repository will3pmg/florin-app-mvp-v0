#!/usr/bin/env node
/* Florin focus group test: the build. Makes focus/site/, a self-contained static site with relative paths, from
   focus/ and the files its two pages load from prototype/, library/ and options/home/ (never library/js/library.js or
   library/css/library.css, which mount the library page). Nothing outside focus/ is changed: those files are copied.

     node focus/build.js [--out <folder>] [--endpoint <url>] [--study <id>] [--config key=value ...]

   --out       where to build (default focus/site). A folder that has files but no BUILD.txt is never emptied.
   --endpoint  stamps a script URL into the built config.js, for a test run against focus/mock-endpoint.js (the
               repository's config.js is left as it is)
   --study     the same, for the study id
   --config    the same, for any other setting with a number or a word as its value (sendPerMinute=400, for a check)
   What it does:
   1. Reads index.html and app.html and copies every file they load from outside focus/ into proto/css/ or proto/js/,
      rewriting the page to the copy. Two files of one name from different folders stop the build.
   2. Copies focus's own files: config.js, the manifest, sw.js, robots.txt, css/, js/, fonts/, icons/.
   3. Stamps the build (a hash of everything copied) into js/focus.js and sw.js, and lists the app shell in sw.js.
   4. Writes _headers (Netlify): a content security policy that lets the pages post to the script and load its JSONP
      replies and nothing else, no referrer, no cookies, no indexing; config.js, sw.js and the pages are never cached
      long.
   5. Writes BUILD.txt: the build, when, and every file with where it came from and its hash.
   Then it checks that every file a page names is in the site. */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FOCUS = __dirname, REPO = path.dirname(FOCUS);
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const OUT = path.resolve(opt("out") || path.join(FOCUS, "site"));
const ENDPOINT = opt("endpoint");
const STUDY = opt("study");
const die = (m) => { console.error(`build: ${m}`); process.exit(1); };

/* ---------- the output folder ---------- */
if (OUT === FOCUS || OUT === REPO || !path.basename(OUT)) die(`refusing to build into ${OUT}`);
if (fs.existsSync(OUT)) {
  const has = fs.readdirSync(OUT);
  if (has.length && !has.includes("BUILD.txt")) die(`${OUT} has files and no BUILD.txt, so it isn't a build: not emptying it`);
  fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });

const sha = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const ledger = [];
function copy(src, rel) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  ledger.push({ rel, from: path.relative(REPO, src), sha: sha(fs.readFileSync(src)) });
}
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

/* ---------- 1. the pages, and what they load from outside focus/ ---------- */
const FORBID = [/library\/js\/library\.js$/, /library\/css\/library\.css$/];
const taken = {};
function page(name) {
  let html = fs.readFileSync(path.join(FOCUS, name), "utf8");
  html = html.replace(/(href|src)="(\.\.\/[^"]+)"/g, (m, attr, ref) => {
    const src = path.resolve(FOCUS, ref);
    if (!src.startsWith(REPO + path.sep)) die(`${name} loads ${ref}, outside the repository`);
    if (FORBID.some((re) => re.test(src))) die(`${name} loads ${ref}, which the study must never load`);
    if (!fs.existsSync(src)) die(`${name} loads ${ref}, which isn't there`);
    const kind = /\.css$/.test(src) ? "css" : /\.js$/.test(src) ? "js" : "files";
    const rel = `proto/${kind}/${path.basename(src)}`;
    if (taken[rel] && taken[rel] !== src) die(`two files named ${path.basename(src)}: ${path.relative(REPO, taken[rel])} and ${path.relative(REPO, src)}`);
    if (!taken[rel]) { taken[rel] = src; copy(src, rel); }
    return `${attr}="${rel}"`;
  });
  fs.writeFileSync(path.join(OUT, name), html);
  ledger.push({ rel: name, from: `focus/${name} (paths rewritten)`, sha: sha(html) });
  return html;
}
const pages = ["index.html", "app.html"].map((n) => [n, page(n)]);

/* ---------- 2. focus's own files ---------- */
["config.js", "manifest.webmanifest", "sw.js", "robots.txt"].forEach((f) => copy(path.join(FOCUS, f), f));
["css", "js", "fonts", "icons"].forEach((d) => walk(path.join(FOCUS, d)).forEach((f) => copy(f, path.relative(FOCUS, f))));

/* ---------- 3. the build's stamp ---------- */
const hash = sha(ledger.map((x) => `${x.rel}:${x.sha}`).sort().join("\n")).slice(0, 8);
const BUILD = `fg.${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.${hash}`.toLowerCase();
const edit = (rel, f) => { const p = path.join(OUT, rel); fs.writeFileSync(p, f(fs.readFileSync(p, "utf8"))); };
edit("js/focus.js", (s) => { if (!s.includes('const BUILD = "dev";')) die("js/focus.js has no BUILD line to stamp"); return s.replace('const BUILD = "dev";', `const BUILD = ${JSON.stringify(BUILD)};`); });
let cfg = fs.readFileSync(path.join(OUT, "config.js"), "utf8");
if (ENDPOINT) cfg = cfg.replace(/endpoint:\s*"[^"]*"/, `endpoint: ${JSON.stringify(ENDPOINT)}`);
if (STUDY) cfg = cfg.replace(/study:\s*"[^"]*"/, `study: ${JSON.stringify(STUDY)}`);
args.forEach((a, i) => {
  if (a !== "--config") return;
  const m = /^([A-Za-z]+)=(.*)$/.exec(args[i + 1] || "");
  if (!m) die(`--config wants key=value, not ${args[i + 1]}`);
  const v = /^-?\d+(\.\d+)?$/.test(m[2]) || /^(true|false)$/.test(m[2]) ? m[2] : JSON.stringify(m[2]);
  const re = new RegExp(`(\\n\\s*${m[1]}:\\s*)([^,\\n]+)`);
  if (!re.test(cfg)) die(`config.js has no ${m[1]}`);
  cfg = cfg.replace(re, `$1${v}`);
});
fs.writeFileSync(path.join(OUT, "config.js"), cfg);
const endpointNow = (/endpoint:\s*"([^"]*)"/.exec(cfg) || [])[1] || "";
const shell = ["./", "index.html", "app.html"].concat(ledger.map((x) => x.rel).filter((r) => !/\.(html|txt)$/.test(r) && !["sw.js", "robots.txt"].includes(r)));
edit("sw.js", (s) => s.replace('const BUILD = "dev";', `const BUILD = ${JSON.stringify(BUILD)};`).replace("const SHELL = [/*SHELL*/];", `const SHELL = ${JSON.stringify(shell)};`));

/* ---------- 4. _headers, for Netlify ---------- */
const origins = ["https://script.google.com", "https://script.googleusercontent.com"];
try { if (endpointNow) { const o = new URL(endpointNow).origin; if (!origins.includes(o)) origins.push(o); } } catch (e) { die(`config.js's endpoint isn't a URL: ${endpointNow}`); }
/* the mock endpoint answers with a redirect to its own /echo, as Google's does: same origin, already listed */
const csp = [
  "default-src 'self'",
  `script-src 'self' ${origins.join(" ")}`,
  `connect-src 'self' ${origins.join(" ")}`,
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "manifest-src 'self' data:",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'"
].join("; ");
fs.writeFileSync(path.join(OUT, "_headers"), `# Netlify headers for the Florin focus group site, written by focus/build.js (build ${BUILD})
/*
  Content-Security-Policy: ${csp}
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Robots-Tag: noindex, nofollow
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/app.html
  Cache-Control: no-cache
/config.js
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
`);

/* ---------- 5. BUILD.txt ---------- */
fs.writeFileSync(path.join(OUT, "BUILD.txt"), [
  `Florin focus group site, build ${BUILD}`,
  `Built ${new Date().toISOString()} by focus/build.js. Endpoint: ${endpointNow || "(none: answers wait on the phone)"}.`,
  "Every file, where it came from, and its SHA-1 at build time:",
  "",
  ...ledger.map((x) => `${x.rel}  <-  ${x.from}  ${x.sha.slice(0, 12)}`),
  ""
].join("\n"));

/* ---------- the check: every file a page names is here ---------- */
const missing = [];
pages.forEach(([n]) => {
  const html = fs.readFileSync(path.join(OUT, n), "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"#:?]+)"/g)) { const rel = m[1]; if (rel.startsWith("data") || rel === "about:blank") continue; if (!fs.existsSync(path.join(OUT, rel))) missing.push(`${n}: ${rel}`); }
});
shell.forEach((r) => { if (r !== "./" && !fs.existsSync(path.join(OUT, r))) missing.push(`sw.js shell: ${r}`); });
if (missing.length) die(`missing from the site:\n  ${missing.join("\n  ")}`);
console.log(`build ${BUILD}: ${ledger.length} files into ${path.relative(process.cwd(), OUT) || OUT}${ENDPOINT ? `, endpoint ${ENDPOINT}` : ""}`);
/* before launch: what the consent and the thank-you need from config.js (a warning, since test builds leave them out) */
{
  const empty = ["endpoint", "team", "contact", "recruiter", "thanksHow"].filter((k) => { const m = new RegExp(`\\n\\s*${k}:\\s*"([^"]*)"`).exec(cfg); return m && !m[1].trim(); });
  if (empty.length) console.log(`before launch, fill in config.js: ${empty.join(", ")} (the consent words itself without them meanwhile)`);
}
