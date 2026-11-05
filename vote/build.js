#!/usr/bin/env node
/* Florin app vote: the hosted site. Makes vote/site/, a self-contained static site with relative paths for Vercel or
   Netlify, from vote/ and the files its pages load from prototype/ and library/ (never library/js/library.js or
   library/css/library.css, which mount the library page, and never prototype/js/refresh-app.js, which mounts the demo
   page). Nothing outside vote/site is changed: those files are copied. Modelled on focus/build.js.

     node vote/build.js [--out <folder>] [--endpoint <exec url>] [--vote <id>] [--no-results]

   --out       where to build (default vote/site). A folder that has files but no BUILD.txt is never emptied.
   --endpoint  the Apps Script's /exec URL, stamped into site/config.js (vote/config.js is left as it is). Without it the
               hosted page copies ballots for Slack, as the artifact does
   --vote      the vote id, stamped the same way
   --no-results  leave the results page out of the site
   What it does:
   1. The pages: site/index.html from vote/_local.html, and site/results/index.html from vote/results/_local.html when
      the results page is there. Every ../prototype/ and ../library/ file a page loads is copied into proto/css/ or
      proto/js/ and the page is rewritten to the copy; two files of one name from different folders stop the build.
      The vote's own files keep their paths (config.js, css/, js/, results/css/, results/js/). Ballots, results.json
      and results-data.js are never copied: voters' names stay off the public site. Nor is results/js/recs.js, what
      we recommend: the site is public, so the results page there gets the recommendations only from the Sheet's
      reply, which needs the results key (Code.gs's VOTE_RECS_), and a voter who opens /results/ sees none.
   2. The config: site/config.js gets --endpoint and --vote, and hosted: true.
   3. The build id, vote.<date>.<hash>, stamped into js/vote.js.
   4. Headers, the same rules two ways: _headers (Netlify) and vercel.json (Vercel). A content security policy that
      lets the pages load their own files, Google Fonts and the script's JSONP, and post to the script, and nothing
      else; inline styles allowed (the prototype's markup sets custom properties in style); no referrer, no indexing;
      the pages and config.js never cached long.
   5. robots.txt (Disallow: /) and BUILD.txt: the build, and every file with where it came from and its SHA-1.
   Then it checks that every file a page names is in the site, and warns when the pictures' settings (BASE in
   js/questions.js) no longer match the prototype's defaults. */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VOTE = __dirname, REPO = path.dirname(VOTE);
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const OUT = path.resolve(opt("out") || path.join(VOTE, "site"));
const ENDPOINT = opt("endpoint");
const VOTE_ID = opt("vote");
const NO_RESULTS = args.includes("--no-results");
const die = (m) => { console.error(`build: ${m}`); process.exit(1); };
if (ENDPOINT != null) { try { const u = new URL(ENDPOINT); if (u.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) die(`--endpoint must be https: ${ENDPOINT}`); } catch (e) { die(`--endpoint isn't a URL: ${ENDPOINT}`); } }
if (VOTE_ID != null && !/^[a-z0-9-]{3,60}$/.test(VOTE_ID)) die(`--vote takes lower-case letters, digits and hyphens: ${VOTE_ID}`);

/* ---------- the output folder ---------- */
if (OUT === VOTE || OUT === REPO || !path.basename(OUT) || VOTE.startsWith(OUT + path.sep)) die(`refusing to build into ${OUT}`);
if (fs.existsSync(OUT)) {
  const has = fs.readdirSync(OUT);
  if (has.length && !has.includes("BUILD.txt")) die(`${OUT} has files and no BUILD.txt, so it isn't a build: not emptying it`);
  fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });

const sha = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const ledger = [];
const copied = new Set();
function copy(src, rel) {
  if (copied.has(rel)) return;
  copied.add(rel);
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  ledger.push({ rel, from: path.relative(REPO, src), sha: sha(fs.readFileSync(src)) });
}
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])) : []);

/* ---------- 1. the pages, and what they load from outside vote/ ---------- */
const FORBID = [/library\/js\/library\.js$/, /library\/css\/library\.css$/, /prototype\/js\/refresh-app\.js$/];
const PRIVATE = [/(^|\/)ballots\//, /results\.json$/, /results-data\.js$/, /(^|\/)recs\.js$/];
const taken = {};
/* src: the page's source; rel: its place in the site */
function page(srcRel, rel) {
  const src = path.join(VOTE, srcRel);
  const from = path.dirname(src), to = path.dirname(path.join(OUT, rel));
  let html = fs.readFileSync(src, "utf8");
  /* what we recommend stays off the public site: the results page there takes it from the Sheet's keyed reply */
  html = html.replace(/[ \t]*<script src="[^"]*recs\.js"><\/script>\r?\n?/g, "");
  html = html.replace(/(href|src)="([^"#?:]+)"/g, (m, attr, ref) => {
    const file = path.resolve(from, ref);
    if (!file.startsWith(REPO + path.sep)) die(`${srcRel} loads ${ref}, outside the repository`);
    if (FORBID.some((re) => re.test(file))) die(`${srcRel} loads ${ref}, which the vote must never load`);
    if (!fs.existsSync(file)) die(`${srcRel} loads ${ref}, which isn't there`);
    let siteRel;
    if (file.startsWith(VOTE + path.sep)) {
      siteRel = path.relative(VOTE, file);
      if (PRIVATE.some((re) => re.test(siteRel))) die(`${srcRel} loads ${ref}, which holds voters' picks and stays off the site`);
    } else {
      const kind = /\.css$/.test(file) ? "css" : /\.js$/.test(file) ? "js" : "files";
      siteRel = `proto/${kind}/${path.basename(file)}`;
      if (taken[siteRel] && taken[siteRel] !== file) die(`two files named ${path.basename(file)}: ${path.relative(REPO, taken[siteRel])} and ${path.relative(REPO, file)}`);
      taken[siteRel] = file;
    }
    copy(file, siteRel);
    return `${attr}="${path.relative(to, path.join(OUT, siteRel)).split(path.sep).join("/")}"`;
  });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), html);
  ledger.push({ rel, from: `vote/${srcRel} (paths rewritten)`, sha: sha(html) });
  return rel;
}
const pages = [page("_local.html", "index.html")];
if (!NO_RESULTS && fs.existsSync(path.join(VOTE, "results", "_local.html"))) pages.push(page(path.join("results", "_local.html"), path.join("results", "index.html")));

/* ---------- 2. the vote's own files ---------- */
copy(path.join(VOTE, "config.js"), "config.js");
["css", "js"].concat(NO_RESULTS ? [] : [path.join("results", "css"), path.join("results", "js")]).forEach((d) => walk(path.join(VOTE, d)).forEach((f) => {
  const rel = path.relative(VOTE, f);
  if (PRIVATE.some((re) => re.test(rel.split(path.sep).join("/")))) return;
  copy(f, rel);
}));

/* ---------- 3. the build's stamp ---------- */
const hash = sha(ledger.map((x) => `${x.rel}:${x.sha}`).sort().join("\n")).slice(0, 8);
const BUILD = `vote.${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.${hash}`.toLowerCase();
const edit = (rel, f) => { const p = path.join(OUT, rel); fs.writeFileSync(p, f(fs.readFileSync(p, "utf8"))); };
edit(path.join("js", "vote.js"), (s) => { if (!s.includes('const BUILD = "dev";')) die("js/vote.js has no BUILD line to stamp"); return s.replace('const BUILD = "dev";', `const BUILD = ${JSON.stringify(BUILD)};`); });
let cfg = fs.readFileSync(path.join(OUT, "config.js"), "utf8");
if (ENDPOINT != null) { if (!/endpoint:\s*"[^"]*"/.test(cfg)) die("config.js has no endpoint line"); cfg = cfg.replace(/endpoint:\s*"[^"]*"/, `endpoint: ${JSON.stringify(ENDPOINT)}`); }
if (VOTE_ID != null) { if (!/\bvote:\s*"[^"]*"/.test(cfg)) die("config.js has no vote line"); cfg = cfg.replace(/\bvote:\s*"[^"]*"/, `vote: ${JSON.stringify(VOTE_ID)}`); }
if (!/\bhosted:\s*false\b/.test(cfg)) die("config.js has no hosted line");
cfg = cfg.replace(/\bhosted:\s*false\b/, "hosted: true");
fs.writeFileSync(path.join(OUT, "config.js"), cfg);
const endpointNow = (/endpoint:\s*"([^"]*)"/.exec(cfg) || [])[1] || "";
const voteNow = (/\bvote:\s*"([^"]*)"/.exec(cfg) || [])[1] || "";
{ const x = ledger.find((y) => y.rel === "config.js"); x.from += " (endpoint, vote and hosted stamped)"; x.sha = sha(cfg); }
{ const x = ledger.find((y) => y.rel === path.join("js", "vote.js")); x.from += " (build stamped)"; x.sha = sha(fs.readFileSync(path.join(OUT, "js", "vote.js"))); }

/* ---------- 4. headers, for Netlify and for Vercel ---------- */
const origins = ["https://script.google.com", "https://script.googleusercontent.com"];
try { if (endpointNow) { const o = new URL(endpointNow).origin; if (!origins.includes(o)) origins.push(o); } } catch (e) { die(`config.js's endpoint isn't a URL: ${endpointNow}`); }
const csp = [
  "default-src 'self'",
  `script-src 'self' ${origins.join(" ")}`,
  `connect-src 'self' ${origins.join(" ")}`,
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src 'none'",
  "frame-ancestors 'self'",
  "worker-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'"
].join("; ");
const SEC = [
  ["Content-Security-Policy", csp],
  ["Referrer-Policy", "no-referrer"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Robots-Tag", "noindex, nofollow"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"],
  ["Cross-Origin-Opener-Policy", "same-origin"]
];
const FRESH = ["/", "/index.html", "/config.js"].concat(NO_RESULTS ? [] : ["/results/", "/results/index.html"]);
fs.writeFileSync(path.join(OUT, "_headers"), `# Netlify headers for the Florin app vote, written by vote/build.js (build ${BUILD})
/*
${SEC.map(([k, v]) => `  ${k}: ${v}`).join("\n")}
${FRESH.map((p) => `${p}\n  Cache-Control: no-cache`).join("\n")}
`);
fs.writeFileSync(path.join(OUT, "vercel.json"), JSON.stringify({
  cleanUrls: false,
  trailingSlash: false,
  headers: [{ source: "/(.*)", headers: SEC.map(([key, value]) => ({ key, value })) }].concat(FRESH.map((source) => ({ source, headers: [{ key: "Cache-Control", value: "no-cache" }] })))
}, null, 2) + "\n");
fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /\n");

/* ---------- 5. BUILD.txt ---------- */
fs.writeFileSync(path.join(OUT, "BUILD.txt"), [
  `Florin app vote site, build ${BUILD}`,
  `Built ${new Date().toISOString()} by vote/build.js. Vote: ${voteNow}. Endpoint: ${endpointNow || "(none: ballots are copied for Slack)"}.`,
  "Every file, where it came from, and its SHA-1 at build time:",
  "",
  ...ledger.slice().sort((a, b) => a.rel.localeCompare(b.rel)).map((x) => `${x.rel.split(path.sep).join("/")}  <-  ${x.from}  ${x.sha.slice(0, 12)}`),
  "",
  "Also written: _headers (Netlify), vercel.json (Vercel), robots.txt, BUILD.txt.",
  ""
].join("\n"));

/* ---------- the check: every file a page names is here ---------- */
const missing = [];
pages.forEach((rel) => {
  const html = fs.readFileSync(path.join(OUT, rel), "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"#?:]+)"/g)) {
    const f = path.resolve(path.dirname(path.join(OUT, rel)), m[1]);
    if (!f.startsWith(OUT + path.sep) || !fs.existsSync(f)) missing.push(`${rel}: ${m[1]}`);
  }
});
if (missing.length) die(`missing from the site:\n  ${missing.join("\n  ")}`);
const leaked = walk(OUT).map((f) => path.relative(OUT, f).split(path.sep).join("/")).filter((r) => PRIVATE.some((re) => re.test(r)) || FORBID.some((re) => re.test(r)) || /(^|\/)(library|refresh-app)\.(js|css)$/.test(r));
if (leaked.length) die(`files that must stay off the site: ${leaked.join(", ")}`);
console.log(`build ${BUILD}: ${ledger.length} files into ${path.relative(process.cwd(), OUT) || OUT}${endpointNow ? `, endpoint ${endpointNow}` : ", no endpoint (ballots are copied for Slack)"}${NO_RESULTS ? ", no results page" : ", the results page at results/ (no recommendation in it: those come from the Sheet with the key)"}`);

/* ---------- a warning: the pictures' settings against the prototype's defaults ---------- */
try {
  const Q = require(path.join(VOTE, "js", "questions.js"));
  const app = fs.readFileSync(path.join(REPO, "prototype", "js", "refresh-app.js"), "utf8");
  const off = [];
  ["form", "bmUI", "home", "history", "checkin", "mealUI", "look", "easy", "onboard"].forEach((k) => {
    const m = new RegExp(`k:\\s*"${k}"[^\\n]*?def:\\s*("[^"]*"|true|false)`).exec(app);
    if (!m) { off.push(`${k}: no default found`); return; }
    const def = JSON.parse(m[1]);
    if (Q.BASE[k] !== def) off.push(`${k}: the prototype opens on ${JSON.stringify(def)}, the pictures hold ${JSON.stringify(Q.BASE[k])}`);
  });
  if (off.length) console.log(`warning: BASE in vote/js/questions.js differs from the prototype's defaults (refresh-app.js DECISIONS):\n  ${off.join("\n  ")}`);
} catch (e) { console.log(`warning: couldn't compare BASE with the prototype's defaults (${e.message})`); }
