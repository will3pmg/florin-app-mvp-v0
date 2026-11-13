/* Florin handoff: the app's screens as editable Figma layers, from the prototype's own DOM.

   NODE_PATH=$(npm root -g) node handoff/figma-layers.js <out-dir> [--only flow/screen,...] [--limit N] [--workers 3]

   For each screen in PICK (below), it drives the prototype the way handoff/capture.js does (the same inventory, steps
   and settling), grows the phone to the screen's full length, and walks the DOM of the phone's screen twice, in light
   and in dark. The two walks are paired node by node, so every colour becomes a pair (light, dark) and is bound to the
   Figma file's App colour variable with those two values (handoff/figma/vars.json), or to a new variable under
   derived/ when no variable has them. Text runs are matched to the file's text styles (handoff/figma/textstyles.json).

   Writes, per screen:
     <out>/json/<id>.json     the tree: { id, name, page, w, h, pal: [[var, light, dark]], ts: [style], tree }
     <out>/svg/<id>.svg       a carrier: the JSON as base64 in <text> chunks, for upload_assets (the Figma side reads it
                              back, decodes it and builds the screen: handoff/figma-builder.js)
     <out>/index.json         every screen, its page, size, node count and anything that didn't pair

   Node kinds in the tree (short keys keep the carriers small):
     { k: "f", n, x, y, w, h, f?, r?, s?, e?, o?, cl?, c? }   a frame: fill, radius, stroke, effects, opacity, clip
     { k: "t", n, x, y, w, h, sg: [[text, style, colour]], al?, wrap? }   text, in runs
     { k: "s", n, x, y, w, h, svg, sc: { "#RRGGBBAA": colour } }         an svg, as markup, with its colours paired
     { k: "i", n, x, y, w, h, r? }                                        an image (drawn as a placeholder)
   x and y are from the screen's top left; colours are palette indexes; a style is an index into ts. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const C = require("./capture.js");

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const OUT = args[0] && !args[0].startsWith("--") ? path.resolve(args[0]) : null;
const ONLY = flag("--only", null);
const LIMIT = +flag("--limit", 0);
const WORKERS = Math.max(1, +flag("--workers", 3));
const VARS = require("./figma/vars.json");
const TSTYLES = require("./figma/textstyles.json");

/* ---------------------------------------------------------------------------------------------------------------- */
/* which screens: Will's picks (Member, 12 weeks) and the states that change a screen's layout, plus Free where it     */
/* differs. Alternatives Will didn't pick stay as pictures on the Reference page                                       */
/* ---------------------------------------------------------------------------------------------------------------- */
const PICK = {
  "home/today": ["12w:member", "12w:free", "day5:member", "flagged:member", "no-score:member", "past-day:member", "gap-day:member", "legend:member", "flag-sheet:member"],
  "logging/plus": ["12w:member", "free:free"],
  "logging/quick-save": ["saved-toast:member"],
  "logging/bm": ["12w:member", "picked:member", "details:member", "guide:member", "saved:member"],
  "logging/flag": ["12w:member", "alarm-note:member"],
  "logging/nobm": ["offered:member", "sheet:member"],
  "logging/earlier": ["12w:member", "plus-for-day:member"],
  "logging/sym": ["12w:member", "alarm-note:member", "saved:member"],
  "logging/meal": ["12w:member", "typed:member", "said:member"],
  "logging/meal-photo": ["12w:member", "free:free"],
  "history/calendar": ["12w:member", "12w:free", "day-picked:member", "gap-picked:member", "report:member"],
  "checkin/card": ["12w:member"], "checkin/q1": ["12w:member", "picked:member"], "checkin/q2": ["12w:member"], "checkin/q3": ["12w:member"],
  "checkin/q4": ["12w:member"], "checkin/extra": ["tagged:member"], "checkin/saved": ["12w:member"], "checkin/due-day": ["12w:member"], "checkin/first": ["day0:member"],
  "ask/opening": ["12w:member"], "ask/turn": ["12w:member", "redirect:member"], "ask/alarm": ["12w:member"], "ask/from-flag": ["member:member"],
  "ask/card": ["12w:member"], "ask/knows": ["12w:member"], "ask/free": ["12w:free"],
  "onboarding/short": ["1-welcome:member", "2-name:member", "3-brings:member", "4-goals:member", "5-periods:member", "6-rem:member", "7-isnt:member", "8-ready:member"],
  "onboarding/sign": ["day0:member"],
  "profile/profile": ["12w:member"], "profile/reminder": ["12w:member"], "profile/answer": ["12w:member"], "profile/info": ["12w:member"],
  "profile/delete-logs": ["12w:member"], "profile/delete-account": ["12w:member"], "profile/easy-settings": ["12w:member", "easy-on:member"],
  "easy/today": ["12w:member"], "easy/plus": ["12w:member"], "easy/bm": ["1-look:member", "2-when:member", "3-else:member", "4-save:member"],
  "easy/sym": ["12w:member"], "easy/meal": ["12w:member"], "easy/history": ["12w:member"], "easy/ask": ["12w:member"], "easy/weeks": ["12w:member"],
  "membership/paywall": ["12w:free", "from-score:free"], "membership/started": ["toast:free"],
  "insights/insights": ["12w:member", "12w:free"], "insights/i-score": ["12w:member"], "insights/i-days": ["12w:member"], "insights/i-timing": ["12w:member"],
  "insights/i-often": ["12w:member"], "insights/i-form": ["12w:member"], "insights/i-sym": ["12w:member"], "insights/i-ck": ["12w:member"],
  "insights/i-pat": ["12w:member"], "insights/i-pattern": ["12w:member"]
};
/* the flow pages in the Figma file (handoff/figma-build-log.md) */
const PAGE_OF = { home: "4:7", history: "4:8", checkin: "4:9", ask: "4:10", onboarding: "4:11", membership: "4:12", logging: "4:13", profile: "4:14", easy: "4:14", insights: "4:15" };

/* ---------------------------------------------------------------------------------------------------------------- */
/* the walk, in the page                                                                                              */
/* ---------------------------------------------------------------------------------------------------------------- */
const WALK = function () {
  const root = document.querySelector(".rx-stage .apx-screen");
  const R0 = root.getBoundingClientRect();
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const r2 = (v) => Math.round(v * 100) / 100;
  /* a computed colour as #RRGGBBAA (null when fully transparent) */
  const hex = (c) => {
    if (!c || c === "transparent" || c === "none") return null;
    let m = /^rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?\)$/.exec(c), e = null;
    if (m) e = [+m[1], +m[2], +m[3], m[4] == null ? 255 : +m[4] * 255];
    else if ((m = /^color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([\d.]+))?\)$/.exec(c))) e = [m[1], m[2], m[3]].map((x) => Math.max(0, Math.min(255, +x * 255))).concat(m[4] == null ? 255 : +m[4] * 255);
    else { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; e = [d[0], d[1], d[2], d[3]]; }
    if (e[3] < 1) return null;
    return "#" + e.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  const px = (v) => parseFloat(v) || 0;
  const box = (r) => ({ x: r2(r.left - R0.left), y: r2(r.top - R0.top), w: r2(r.width), h: r2(r.height) });
  const outside = (r) => r.bottom < R0.top - 1 || r.top > R0.bottom + 1 || r.right < R0.left - 1 || r.left > R0.right + 1;
  const srOnly = (el, cs, r) => (r.width <= 1.5 && r.height <= 1.5 && el.childElementCount === 0 && !(el instanceof SVGElement)) || cs.clip === "rect(0px, 0px, 0px, 0px)" || /inset\(50%\)/.test(cs.clipPath) || ((r.width <= 1.5 || r.height <= 1.5) && cs.overflow === "hidden" && cs.position === "absolute");

  /* ---------- names: what a person reading the layers list would call each thing ---------- */
  const NAMES = {
    "apx-screen": "Screen", "apx-status": "Status bar", "apx-status-r": "Signal, wifi, battery", "apx-island": "Dynamic Island", "apx-homebar": "Home indicator",
    "rx-mount": "App", "ap-rx": "App", "ap-stack": "Stack", "ap-layer": "Tab content", "ap-scr": "Content", "ap-tb": "Tab bar", "ap-tb-plus": "Plus",
    "ap-ovl": "Overlays", "ap-tst": "Toast", "ap-o": "Overlay", "ap-scrim": "Scrim", "ap-sheet": "Sheet", "ap-sheet-grab": "Grabber", "ap-psh": "Plus menu",
    "ap-card": "Card", "ap-hero": "FloraScore hero", "ap-top": "Top", "ap-ava": "Avatar", "ap-tl": "Log list", "ap-tl-row": "Log row", "ap-chip": "Chip",
    "ap-btn": "Button", "ap-link": "Link", "ap-seg": "Segmented control", "ap-k": "Label", "ap-hd": "Day", "ap-hd-h": "Day header", "ap-hd-why": "Day line",
    "ap-day": "Day mark", "ap-legend": "Legend", "ap-pill": "Pill", "ap-tile": "Tile", "ap-tiles": "Tiles", "ap-fine": "Fine print", "ap-note": "Note",
    "ap-ask-b": "Ask about this", "ap-askw": "Ask", "ap-idt-ask": "Ask about this", "rlk-ask": "Ask about this", "ap-ez-ask": "Ask about this",
    "vr-cp": "Today, Compact", "vr-cp-sc": "FloraScore strip", "vr-cpw": "Week", "vr-cpw-h": "Week header", "vr-cpw-g": "Days", "vr-cpw-d": "Day",
    "vr-cpw-k": "Weekday", "vr-cpw-r": "Ring", "vr-cpw-s": "Symptoms mark", "vr-cpw-lgw": "Legend", "vr-cpw-nav": "Week arrow", "vr-cpw-i": "Legend button",
    "vr-cpw-now": "Today button", "vr-cp-day": "Day picked", "vr-cp-ck": "Check-in row", "vr-cp-log": "Log a BM", "vr-cp-add": "Add", "vr-cp-flag": "Clinician note",
    "vr-cp-nobm": "No BM", "vr-cal": "Calendar", "rg-week": "Week card", "rg-wd": "Day", "rg-day": "Ring", "rg-legend": "Legend", "rlk-foot": "Card foot",
    "ap-tb-b": "Tab", "ic": "Icon", "ap-fsh": "Full sheet", "ap-ck": "Check-in", "ap-pay": "Paywall", "ap-ins": "Insights", "ap-idt": "Detail",
    "ap-seg--range": "Range tabs", "ap-field": "Field", "ap-input": "Field", "ap-ta": "Text box", "ap-tl-nobm": "No BM row", "ap-tl-empty": "Empty log"
  };
  const ABBR = { h: "header", hd: "header", t: "title", tt: "title", k: "label", b: "body", bd: "body", g: "grid", d: "day", r: "ring", s: "sub", n: "number", lg: "legend", lgw: "legend",
    tl: "log", cp: "compact", cpw: "week", wd: "day", sym: "symptoms", ck: "check-in", ic: "icon", ico: "icon", m: "main", go: "chevron", nav: "arrow", btn: "button", sc: "strip",
    sb: "sub", ln: "line", hdr: "header", ft: "foot", foot: "foot", w: "wrap", wr: "wrap", c: "content", lb: "label", v: "value", num: "number", val: "value", q: "question",
    a: "answer", opt: "option", opts: "options", pf: "profile", ez: "easy", ph: "photo", pat: "pattern", ins: "insights", idt: "detail", dt: "detail", mv: "moved", bar: "bar",
    sw: "swatch", pk: "pick", sel: "picked", ttl: "title", sub: "sub", hero: "hero", ring: "ring", chip: "chip", note: "note", why: "why", ttip: "tooltip", x: "close",
    rg: "", rlk: "", lk: "", vr: "", ap: "", apx: "", rx: "", bn: "", jr: "", ou: "", oa: "", askx: "ask" };
  const human = (cls) => {
    const parts = cls.replace(/--/g, "-").split("-").filter(Boolean);
    const words = parts.map((p, i) => (i === 0 && ABBR[p] === "" ? "" : ABBR[p] != null ? ABBR[p] : p)).filter(Boolean);
    const s = words.join(" ").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  };
  const clip = (s, n = 40) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };
  /* the text a person sees: no screen-reader-only words */
  const visibleText = (el) => {
    let s = "";
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n && s.length < 80; n = tw.nextNode()) {
      const pe = n.parentElement; if (!pe) continue;
      const pcs = getComputedStyle(pe), pr = pe.getBoundingClientRect();
      if (pcs.display === "none" || pcs.visibility === "hidden" || srOnly(pe, pcs, pr)) continue;
      s += " " + n.data;
    }
    return s.replace(/\s+/g, " ").trim();
  };
  const labelOf = (el) => {
    if (!el.getAttribute) return "";
    const a = el.getAttribute("aria-label");
    if (a) return clip(a);
    const lb = el.getAttribute("aria-labelledby");
    if (lb) { const t = document.getElementById(lb.split(" ")[0]); if (t) return clip(t.getAttribute("aria-label") || visibleText(t)); }
    return "";
  };
  const textOf = (el) => clip(visibleText(el), 32);
  const nameOf = (el) => {
    const cl = [...(el.classList || [])];
    const tag = el.tagName.toLowerCase();
    /* the most specific known class: a generic one (Card, Button) only when nothing else names it */
    const GENERIC = new Set(["Card", "Button", "Link", "Chip", "Pill", "Label", "Icon"]);
    let base = "";
    for (const c of cl) if (NAMES[c] && !GENERIC.has(NAMES[c])) { base = NAMES[c]; break; }
    if (!base) for (const c of cl) if (NAMES[c]) { base = NAMES[c]; break; }
    const role = el.getAttribute("role");
    const lab = labelOf(el);
    if (!base) {
      if (role === "tab") base = "Tab";
      else if (role === "tabpanel") base = "Panel";
      else if (role === "dialog") base = "Sheet";
      else if (tag === "button") base = "Button";
      else if (tag === "a") base = "Link";
      else if (/^h[1-6]$/.test(tag)) base = "Heading";
      else if (tag === "nav") base = "Navigation";
      else if (tag === "ol" || tag === "ul") base = "List";
      else if (tag === "li") base = "Item";
      else if (tag === "section" || tag === "article") base = "Section";
      else if (tag === "header") base = "Header";
      else if (tag === "footer") base = "Footer";
      else if (tag === "label") base = "Label";
      else if (tag === "input" || tag === "textarea") base = "Field";
      else if (cl.length) base = human(cl.find((c) => !/^is-|^has-/.test(c)) || cl[0]);
      if (!base) base = "Group";
    }
    /* a hint after the name for the things a person picks out: a tab, a button, a card, a day, a field */
    const STRUCT = /^(Screen|App|Stack|Tab content|Content|Overlays|Status bar|Dynamic Island|Home indicator|Signal, wifi, battery)$/;
    const hint = STRUCT.test(base) ? "" : lab || ((/Button|Tab|Link|Heading|Item|Chip|Pill|Card|Section|Day|Field|Plus|Option|Tile|Row|Sheet|Panel/.test(base) || tag === "button") ? textOf(el) : "");
    /* the first clause is enough to find it by: "Day / Monday, October 5", not the whole reading */
    const short = clip(String(hint).split(/[:.]\s/)[0].replace(/[:.]$/, ""), 36);
    return short && short !== base ? `${base} / ${short}` : base;
  };

  /* ---------- the box: fill, radius, stroke, shadows ---------- */
  const shadows = (v) => {
    if (!v || v === "none") return [];
    /* split on commas outside brackets */
    const out = []; let depth = 0, cur = "";
    for (const ch of v) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out.map((s) => {
      const inset = /\binset\b/.test(s);
      const col = (s.match(/(rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|#[0-9a-f]{3,8})/i) || [])[1];
      const nums = s.replace(col || "", "").replace("inset", "").trim().split(/\s+/).map(px);
      return { inset, c: hex(col), x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0, s: nums[3] || 0 };
    }).filter((s) => s.c);
  };
  const radiusOf = (cs, w, h) => {
    const rs = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) => (/%$/.test(v) ? (px(v) / 100) * Math.min(w, h) : px(v))).map((v) => r2(Math.min(v, Math.min(w, h) / 2)));
    if (rs.every((v) => v === 0)) return null;
    return rs.every((v) => v === rs[0]) ? rs[0] : rs;
  };
  const boxStyle = (cs, w, h) => {
    const o = {};
    const bg = hex(cs.backgroundColor);
    if (bg) o.f = bg;
    else if (cs.backgroundImage && cs.backgroundImage !== "none") { const m = cs.backgroundImage.match(/(rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\))/); if (m && hex(m[1])) o.f = hex(m[1]); o.grad = 1; }
    const r = radiusOf(cs, w, h); if (r != null) o.r = r;
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    const bc = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(hex);
    const bs = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    const on = bw.map((v, i) => v > 0 && bs[i] !== "none" && bc[i]);
    if (on.every(Boolean) && bw.every((v) => v === bw[0]) && bc.every((c) => c === bc[0])) o.s = { c: bc[0], w: bw[0] };
    else if (on.some(Boolean)) o.sides = on.map((v, i) => (v ? [bc[i], bw[i]] : null));
    const sh = shadows(cs.boxShadow);
    const ring = sh.find((s) => s.inset && !s.x && !s.y && !s.b && s.s > 0);
    if (ring && !o.s) o.s = { c: ring.c, w: ring.s };
    const drop = sh.filter((s) => s !== ring);
    if (drop.length) o.e = drop.map((s) => [s.c, s.x, s.y, s.b, s.s, s.inset ? 1 : 0]);
    if (+cs.opacity < 1) o.o = r2(+cs.opacity);
    if (/hidden|clip/.test(cs.overflowX + cs.overflowY)) o.cl = 1;
    return o;
  };
  const hasBox = (o) => !!(o.f || o.s || o.e || o.sides || (o.cl && o.r));

  /* ---------- text ---------- */
  const INLINE = new Set(["inline", "contents"]);
  const famOf = (cs) => cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  const styleOf = (cs) => {
    const fs = px(cs.fontSize);
    const lh = cs.lineHeight === "normal" ? null : r2(px(cs.lineHeight));
    const ls = cs.letterSpacing === "normal" ? 0 : r2(px(cs.letterSpacing));
    return { ff: famOf(cs), fw: +cs.fontWeight || 400, fs: r2(fs), lh, ls, tt: cs.textTransform === "uppercase" ? "U" : cs.textTransform === "lowercase" ? "L" : cs.textTransform === "capitalize" ? "T" : "", it: cs.fontStyle === "italic" ? 1 : 0, td: /underline/.test(cs.textDecorationLine) ? "U" : /line-through/.test(cs.textDecorationLine) ? "S" : "" };
  };
  /* an element that is all text: text nodes and inline elements without a box of their own */
  const isInlineText = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) continue;
      if (n.nodeType !== 1) continue;
      if (n.tagName === "BR") continue;
      if (n instanceof SVGElement || n.tagName === "IMG" || n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.tagName === "SELECT") return false;
      const cs = getComputedStyle(n);
      if (cs.display === "none") continue;
      if (!INLINE.has(cs.display)) return false;
      const b = boxStyle(cs, 1, 1);
      if (b.f || b.s || b.e || b.sides || px(cs.paddingLeft) + px(cs.paddingRight) > 0) return false;
      if (!isInlineText(n)) return false;
    }
    return true;
  };
  const runsOf = (el) => {
    const runs = [];
    const go = (n, parentCs) => {
      if (n.nodeType === 3) {
        const cs = parentCs;
        let t = n.data;
        if (!/pre/.test(cs.whiteSpace)) t = t.replace(/[\t\n\r ]+/g, " ");
        if (t) runs.push([t, styleOf(cs), hex(cs.color)]);
        return;
      }
      if (n.nodeType !== 1) return;
      if (n.tagName === "BR") { runs.push(["\n", styleOf(parentCs), hex(parentCs.color)]); return; }
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = n.getBoundingClientRect();
      if (srOnly(n, cs, r)) return;
      n.childNodes.forEach((c) => go(c, cs));
    };
    const cs0 = getComputedStyle(el);
    el.childNodes.forEach((c) => go(c, cs0));
    /* collapse spaces across runs, trim the ends */
    let prevSpace = true;
    for (const r of runs) {
      if (r[0] === "\n") { prevSpace = true; continue; }
      if (prevSpace) r[0] = r[0].replace(/^ +/, "");
      if (r[0]) prevSpace = / $/.test(r[0]);
    }
    for (let i = runs.length - 1; i >= 0; i--) { runs[i][0] = runs[i][0].replace(/ +$/, ""); if (runs[i][0]) break; }
    return runs.filter((r) => r[0]);
  };
  const textNode = (el, cs, rangeTarget) => {
    const runs = rangeTarget.nodeType === 3 ? (() => { let t = rangeTarget.data; if (!/pre/.test(cs.whiteSpace)) t = t.replace(/[\t\n\r ]+/g, " ").trim(); return t ? [[t, styleOf(cs), hex(cs.color)]] : []; })() : runsOf(el);
    if (!runs.length) return null;
    const rg = document.createRange();
    if (rangeTarget.nodeType === 3) rg.selectNodeContents(rangeTarget); else rg.selectNodeContents(el);
    const rects = [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) return null;
    const bb = rg.getBoundingClientRect();
    if (outside(bb)) return null;
    const tops = new Set(rects.map((r) => Math.round(r.top)));
    const lines = [...tops].length;
    const st = runs[0][1];
    const o = { k: "t", n: clip(runs.map((r) => r[0]).join(""), 48) || "Text", sg: runs };
    const al = cs.textAlign;
    if (lines > 1 && !/nowrap/.test(cs.whiteSpace)) {
      /* wrapped: the width of the element's content box, the height of the lines */
      const er = el.getBoundingClientRect();
      const left = er.left + px(cs.paddingLeft) + px(cs.borderLeftWidth), right = er.right - px(cs.paddingRight) - px(cs.borderRightWidth);
      Object.assign(o, box({ left, top: bb.top, width: Math.max(bb.width, right - left), height: bb.height }));
      o.wrap = 1;
      if (al === "center" || al === "right" || al === "end") o.al = al === "end" ? "right" : al;
    } else {
      Object.assign(o, box(bb));
    }
    if (st.lh == null) o.lhAuto = r2(bb.height / lines);
    return o;
  };

  /* ---------- svg: inline every computed paint and font, colours as hex with their own opacity ---------- */
  const SVGP = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline", "letter-spacing"];
  const svgNode = (el, r) => {
    const cl = el.cloneNode(true);
    const src = [el, ...el.querySelectorAll("*")], dst = [cl, ...cl.querySelectorAll("*")];
    const cols = [];
    src.forEach((s, i) => {
      const d = dst[i], cs = getComputedStyle(s);
      if (cs.display === "none" || cs.visibility === "hidden") { d.setAttribute("display", "none"); return; }
      d.removeAttribute("class"); d.removeAttribute("style");
      SVGP.forEach((p) => {
        const v = cs.getPropertyValue(p);
        if (!v) return;
        if (p === "fill" || p === "stroke") {
          if (v === "none" || /url\(/.test(v)) { d.setAttribute(p, "none"); cols.push("#00000000"); return; }
          const h = hex(v);
          if (!h) { d.setAttribute(p, "none"); cols.push("#00000000"); return; }
          d.setAttribute(p, h.slice(0, 7));
          const a = parseInt(h.slice(7, 9), 16) / 255;
          const po = +cs.getPropertyValue(p + "-opacity") || 1;
          if (a < 1 || po < 1) d.setAttribute(p + "-opacity", String(r2(a * po)));
          cols.push(h);
          return;
        }
        if (p === "fill-opacity" || p === "stroke-opacity") return;
        if (p === "font-family") { d.setAttribute(p, v.split(",")[0].replace(/["']/g, "").trim()); return; }
        if (p === "opacity" && +v === 1) return;
        if (p === "stroke-width" && (cs.stroke === "none")) return;
        if (p === "letter-spacing" && v === "normal") return;
        if (s.tagName.toLowerCase() !== "text" && s.tagName.toLowerCase() !== "tspan" && /^font|text-anchor|dominant|letter/.test(p)) return;
        d.setAttribute(p, v);
      });
    });
    cl.removeAttribute("class"); cl.removeAttribute("style"); cl.removeAttribute("aria-hidden"); cl.removeAttribute("focusable");
    cl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    cl.setAttribute("width", r2(r.width)); cl.setAttribute("height", r2(r.height));
    if (!cl.getAttribute("viewBox")) cl.setAttribute("viewBox", `0 0 ${r2(r.width)} ${r2(r.height)}`);
    const ic = [...el.classList].find((c) => /^ic-/.test(c));
    const nm = labelOf(el) || (ic ? `Icon / ${ic.slice(3)}` : r.width <= 32 && r.height <= 32 ? "Icon" : nameOf(el) === "Group" ? "Graphic" : nameOf(el));
    return Object.assign({ k: "s", n: nm }, box(r), { svg: cl.outerHTML, cols });
  };

  /* ---------- pseudo-elements with a box, positioned absolutely (an edge, a dot, a star) ---------- */
  const pseudo = (el, which, er) => {
    const cs = getComputedStyle(el, which);
    if (!cs || cs.content === "none" || cs.content === "normal" || cs.display === "none") return null;
    if (cs.position !== "absolute") return null;
    const w0 = er.width, h0 = er.height;
    const L = cs.left === "auto" ? null : px(cs.left), R = cs.right === "auto" ? null : px(cs.right), T = cs.top === "auto" ? null : px(cs.top), B = cs.bottom === "auto" ? null : px(cs.bottom);
    let w = cs.width === "auto" ? null : px(cs.width), h = cs.height === "auto" ? null : px(cs.height);
    if (w == null) w = w0 - (L || 0) - (R || 0);
    if (h == null) h = h0 - (T || 0) - (B || 0);
    const x = L != null ? L : R != null ? w0 - R - w : 0, y = T != null ? T : B != null ? h0 - B - h : 0;
    if (w <= 0 || h <= 0) return null;
    const o = boxStyle(cs, w, h);
    if (!hasBox(o)) return null;
    delete o.cl;
    return Object.assign({ k: "f", n: which === "::before" ? "Edge" : "Mark" }, box({ left: er.left + x, top: er.top + y, width: w, height: h }), o);
  };

  /* ---------- the walk ---------- */
  let count = 0;
  const walk = (el) => {
    if (el.nodeType !== 1) return null;
    const tag = el.tagName;
    if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META)$/.test(tag)) return null;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity <= 0.01) return null;
    const r = el.getBoundingClientRect();
    if (srOnly(el, cs, r)) return null;
    if (el.closest("[inert]") && el.closest(".ap-o.is-out")) return null;
    if (el instanceof SVGSVGElement) { if (r.width < 0.5 || r.height < 0.5 || outside(r)) return null; count++; return svgNode(el, r); }
    if (el instanceof SVGElement) return null;
    if (tag === "IMG") { if (outside(r)) return null; count++; return Object.assign({ k: "i", n: el.alt ? `Image / ${clip(el.alt)}` : "Image" }, box(r), radiusOf(cs, r.width, r.height) != null ? { r: radiusOf(cs, r.width, r.height) } : {}); }
    if (r.width < 0.5 && r.height < 0.5 && cs.position !== "absolute" && !el.childElementCount) return null;
    const o = Object.assign({ k: "f", n: nameOf(el) }, box(r), boxStyle(cs, r.width, r.height));
    const kids = [];
    const pb = pseudo(el, "::before", r); if (pb) kids.push(pb);
    if (tag === "INPUT" || tag === "TEXTAREA") {
      const val = el.value || el.getAttribute("placeholder") || "";
      if (val && el.type !== "hidden" && el.type !== "file" && el.type !== "checkbox" && el.type !== "radio") {
        const isPh = !el.value;
        const pcs = isPh ? getComputedStyle(el, "::placeholder") : cs;
        const left = r.left + px(cs.paddingLeft) + px(cs.borderLeftWidth), top = r.top + px(cs.paddingTop) + px(cs.borderTopWidth);
        const w = r.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth);
        const lh = cs.lineHeight === "normal" ? px(cs.fontSize) * 1.3 : px(cs.lineHeight);
        kids.push(Object.assign({ k: "t", n: isPh ? `Placeholder / ${clip(val, 30)}` : clip(val, 40), sg: [[val, styleOf(cs), hex(pcs.color) || hex(cs.color)]], wrap: tag === "TEXTAREA" ? 1 : 0 }, box({ left, top, width: w, height: tag === "TEXTAREA" ? r.height - px(cs.paddingTop) - px(cs.paddingBottom) : lh })));
      }
      if (el.type === "file" || el.type === "hidden") return null;
    } else if (isInlineText(el) && /\S/.test(el.textContent)) {
      const t = textNode(el, cs, el);
      if (t) kids.push(t);
    } else {
      for (const n of el.childNodes) {
        if (n.nodeType === 3) { if (/\S/.test(n.data)) { const t = textNode(el, cs, n); if (t) kids.push(t); } continue; }
        const k = walk(n);
        if (k) kids.push(k);
      }
    }
    const pa = pseudo(el, "::after", r); if (pa) kids.push(pa);
    if (outside(r) && !kids.length) return null;
    count++;
    /* a wrapper with no box of its own: one child takes its place; none is nothing */
    const own = hasBox(o) || o.o != null;
    if (!own && !kids.length) return null;
    if (!own && kids.length === 1 && !el.matches(".apx-screen, .ap-rx, .ap-layer, .ap-scr, .ap-tb, .ap-o, .ap-card, section, button, [role=tab], [role=dialog], li, nav, header")) {
      const k = kids[0];
      if (k.k === "t" && /^(BUTTON|A|LABEL|H\d|LI)$/.test(tag)) { k.n = o.n; return k; }
      return k;
    }
    if (kids.length) o.c = kids;
    return o;
  };
  const tree = walk(root);
  return { tree, count, w: r2(R0.width), h: r2(R0.height) };
};

/* ---------------------------------------------------------------------------------------------------------------- */
/* pairing light with dark, the palette, the text styles                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */
const norm = (h) => (h ? (h.length === 7 ? h + "FF" : h).toUpperCase() : null);
const VAR_BY_PAIR = {};
/* the first App colour token with both values wins (ink/1 before control/picked: the file lists the roles a screen reads
   first); a Brand colour only when no App colour token has it in both modes */
/* every token with both values, in the file's order; the one used depends on what is coloured (text takes an ink/
   token, a fill a surface/ one, a stroke a line/ one), so forest on cream is ink/1 for words and control/picked for a
   picked chip. A Brand colour only when no App colour token has it in both modes */
const CANDS = {};
for (const [k, [l, d]] of Object.entries(VARS)) { const key = `${norm(l)}|${norm(d)}`; (CANDS[key] = CANDS[key] || []).push(k); }
const PREFER = { text: ["ink/", "usual/ink", "shift/ink", "context/ink", "ask/compact-ink", "chart/"], fill: ["surface/", "control/", "day/", "ask/", "usual/", "shift/", "context/", "heat/", "hero/", "ring/"], stroke: ["line/", "ring/", "usual/", "shift/", "context/", "ask/", "control/"], svg: ["chart/", "usual/", "shift/", "context/", "ring/", "day/", "hero/", "ask/", "ink/"] };
const varFor = (key, role) => {
  const c = CANDS[key]; if (!c) return null;
  const app = c.filter((k) => k.startsWith("App colour::")), pool = app.length ? app : c;
  for (const pre of PREFER[role] || []) { const m = pool.find((k) => k.slice(k.indexOf("::") + 2).startsWith(pre)); if (m) return m; }
  return pool[0];
};
const WEIGHT = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
const fontStyle = (ff, fw, it) => {
  if (ff === "Space Mono") return fw >= 600 ? (it ? "Bold Italic" : "Bold") : it ? "Italic" : "Regular";
  if (ff === "Lora") { const w = fw >= 600 ? "SemiBold" : fw >= 500 ? "Medium" : "Regular"; return it ? (w === "Regular" ? "Italic" : `${w} Italic`) : w; }
  const w = WEIGHT[Math.round(fw / 100) * 100] || "Regular";
  return it ? (w === "Regular" ? "Italic" : `${w} Italic`) : w;
};
const textStyleFor = (s, lhAuto) => {
  const st = fontStyle(s.ff, s.fw, s.it);
  const lh = s.lh != null ? s.lh : lhAuto;
  const lsPct = s.fs ? (s.ls / s.fs) * 100 : 0;
  const tc = s.tt === "U" ? "UPPER" : "ORIGINAL";
  const m = TSTYLES.find(([name, ff, fst, fs, slh, sls, stc]) => !name.startsWith("_Doc") && ff === s.ff && fst === st && Math.abs(fs - s.fs) < 0.06 && (typeof slh === "number" ? Math.abs(slh - lh) < 0.6 : true) && typeof sls === "number" && Math.abs(sls - lsPct) < 0.6 && stc === tc);
  return m ? m[0] : null;
};

/* a colour no variable has, named from what it is made of: the brand colour and its opacity ("forest 4%"), and its
   dark value when it differs ("forest 4%, dark black 80%"). Deterministic, so every screen asks for the same one */
const RGBNAME = { "00352B": "forest", "F9F7F2": "cream", "EEFFA3": "ray", "4F2641": "plum", "396E7C": "teal", "D1BD7E": "gold", "FFFFFF": "white", "000000": "black",
  "FFFFFD": "card", "03201A": "ground dark", "0A3129": "card dark", "0F3A31": "card-2 dark", "36544C": "ink 2", "5D766F": "ink 3", "C2A64B": "gold mark", "695612": "gold ink",
  "8EC0CD": "teal light", "CAD8D4": "ink 2 dark", "8EA7A0": "ink 3 dark", "F1EEE6": "card-2" };
const describe = (h) => { const rgb = h.slice(1, 7), a = Math.round((parseInt(h.slice(7, 9), 16) / 255) * 100); const nm = RGBNAME[rgb] || `#${rgb}`; return a >= 100 ? nm : `${nm} ${a}%`; };
const extraName = (l, d) => (l === d ? `extra/${describe(l)}` : `extra/${describe(l)}, dark ${describe(d)}`);

function pair(light, dark, ctx) {
  /* same shape: pair colours; else keep light for both and say so */
  const T0 = "#00000000";
  const P = ctx.pal, idx = (l, d, role = "fill") => {
    l = l || T0; d = d || T0;
    if (norm(l) === T0 && norm(d) === T0) return undefined;
    const pairKey = `${norm(l)}|${norm(d)}`, name = varFor(pairKey, role), key = `${pairKey}|${name || ""}`;
    if (!(key in ctx.palIdx)) { ctx.palIdx[key] = P.length; P.push([name || `App colour::${extraName(norm(l), norm(d))}`, norm(l), norm(d), name ? 0 : 1]); }
    return ctx.palIdx[key];
  };
  const same = dark && dark.k === light.k && (light.c || []).length === (dark.c || []).length;
  if (!same && dark) ctx.miss.push(light.n);
  const D = same ? dark : light;
  const o = {};
  for (const [k, v] of Object.entries(light)) {
    if (k === "c" || k === "f" || k === "s" || k === "e" || k === "sides" || k === "sg" || k === "cols" || k === "svg") continue;
    o[k] = v;
  }
  /* a colour on one side only is transparent on the other (a Gold edge in light that dark leaves out) */
  const dk = same ? dark : { };
  if (light.f || dk.f) o.f = idx(light.f, same ? dk.f : light.f);
  if (light.s || dk.s) o.s = [idx(light.s && light.s.c, same ? dk.s && dk.s.c : light.s && light.s.c, "stroke"), (light.s || dk.s).w];
  if (light.sides) o.sd = light.sides.map((x, i) => (x ? [idx(x[0], D.sides && D.sides[i] && D.sides[i][0], "stroke"), x[1]] : 0));
  if (light.e) o.e = light.e.map((x, i) => [idx(x[0], D.e && D.e[i] && D.e[i][0])].concat(x.slice(1)));
  if (light.k === "t") {
    o.sg = light.sg.map((run, i) => {
      const dr = D.sg && D.sg[i];
      const sKey = JSON.stringify(run[1]);
      if (!(sKey in ctx.tsIdx)) { ctx.tsIdx[sKey] = ctx.ts.length; const name = textStyleFor(run[1], light.lhAuto); ctx.ts.push(Object.assign({ name }, run[1])); }
      return [run[0], ctx.tsIdx[sKey], idx(run[2], dr && dr[2] ? dr[2] : run[2], "text")];
    });
  }
  if (light.k === "s") {
    o.svg = light.svg;
    o.sc = {};
    light.cols.forEach((c, i) => { const dc = same && D.cols && D.cols.length === light.cols.length ? D.cols[i] : c; const k = norm(c); if (k === "#00000000" || k in o.sc) return; const v = idx(c, dc, "svg"); if (v != null) o.sc[k] = v; });
  }
  if (light.c) o.c = light.c.map((ch, i) => pair(ch, same ? dark.c[i] : null, ctx));
  return o;
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* the run                                                                                                            */
/* ---------------------------------------------------------------------------------------------------------------- */
const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
function jobsToRun() {
  if (!args.includes("--all")) process.argv.push("--all");
  const all = C.expand();
  const want = ONLY ? ONLY.split(",") : null;
  const out = [];
  for (const j of all) {
    if (j.theme !== "light") continue;
    const key = `${j.flow}/${j.screen}`, pick = PICK[key];
    if (!pick || !pick.includes(`${j.state}:${j.plan}`)) continue;
    if (want && !want.some((w) => key === w || key.startsWith(w + "/") || j.flow === w)) continue;
    /* Will's picks: Data style is Will's picks unless the screen sets it */
    j.set = Object.assign({ look: "picks" }, j.set);
    j.id = slug(`${j.flow}-${j.screen}-${j.state}-${j.plan}`);
    out.push(j);
  }
  return LIMIT ? out.slice(0, LIMIT) : out;
}

async function walkJob(p, job, theme) {
  const jb = Object.assign({}, job, { theme });
  await C.setup(p, jb);
  for (const s of jb.steps) await C.step(p, s);
  await C.settle(p);
  await p.evaluate(() => document.querySelectorAll(".rx-stage .apx-screen, .rx-stage .rx-mount, .rx-stage .ap-rx, .rx-stage .ap-stack").forEach((e) => { e.scrollTop = 0; e.scrollLeft = 0; }));
  await p.evaluate(() => { const a = document.activeElement; if (a && a !== document.body && a.closest(".rx-stage")) a.blur(); });
  await C.grow(p);
  await p.waitForTimeout(150);
  const w = await p.evaluate(WALK);
  const now = await p.evaluate(() => { const api = window.FLORIN_EXT.api; return { plan: api.V().plan, theme: api.root.dataset.theme }; });
  await C.ungrow(p);
  return Object.assign(w, { now });
}

function carrier(id, json) {
  const b64 = Buffer.from(JSON.stringify(json), "utf8").toString("base64");
  const CH = 24000, parts = [];
  for (let i = 0; i < b64.length; i += CH) parts.push(b64.slice(i, i + CH));
  const texts = parts.map((s, i) => `<text id="part-${String(i).padStart(3, "0")}" x="0" y="${10 + i * 8}" font-family="Inter" font-size="6">${s}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="${16 + parts.length * 8}" viewBox="0 0 240 ${16 + parts.length * 8}"><g id="florin-data">${texts}</g></svg>`;
}

(async () => {
  if (!OUT) { console.error("usage: node handoff/figma-layers.js <out-dir> [--only flow/screen,...] [--limit N]"); process.exitCode = 2; return; }
  ["json", "svg"].forEach((d) => fs.mkdirSync(path.join(OUT, d), { recursive: true }));
  const jobs = jobsToRun();
  console.log(`${jobs.length} screens, light and dark, on ${WORKERS} pages`);
  const browser = await chromium.launch();
  const rows = new Array(jobs.length);
  let done = 0;
  const slices = Array.from({ length: WORKERS }, (_, w) => jobs.map((j, i) => [j, i]).filter((_, i) => i % WORKERS === w));
  await Promise.all(slices.map(async (slice) => {
    let { ctx, p, log } = await C.openPage(browser);
    let since = 0;
    for (const [job, i] of slice) {
      if (++since > 30) { await ctx.close(); ({ ctx, p, log } = await C.openPage(browser)); since = 0; }
      const row = { id: job.id, flow: job.flow, screen: job.screen, state: job.state, plan: job.plan, page: PAGE_OF[job.flow], name: `${job.flowName} / ${job.screenName} / ${job.stateName}${job.plan === "free" ? " / Free" : ""}` };
      try {
        log.length = 0;
        const L = await walkJob(p, job, "light");
        const D = await walkJob(p, job, "dark");
        const ctxP = { pal: [], palIdx: {}, ts: [], tsIdx: {}, miss: [] };
        const tree = pair(L.tree, D.tree, ctxP);
        const json = { id: job.id, name: row.name, page: row.page, flow: job.flow, screen: job.screen, state: job.state, plan: job.plan, w: L.w, h: L.h, pal: ctxP.pal, ts: ctxP.ts, tree };
        fs.writeFileSync(path.join(OUT, "json", `${job.id}.json`), JSON.stringify(json));
        fs.writeFileSync(path.join(OUT, "svg", `${job.id}.svg`), carrier(job.id, json));
        Object.assign(row, { h: L.h, nodes: L.count, bytes: JSON.stringify(json).length, unpaired: ctxP.miss.slice(0, 8), newColours: ctxP.pal.filter((x) => x[3]).map((x) => x[0].split("::")[1]), styled: ctxP.ts.filter((x) => x.name).length, unstyled: ctxP.ts.filter((x) => !x.name).length, plan: L.now.plan, console: log.slice(0, 3) });
      } catch (e) { row.error = String(e.message || e).split("\n")[0].slice(0, 300); }
      rows[i] = row;
      if (++done % 10 === 0) console.log(`  ${done} of ${jobs.length}`);
    }
    await ctx.close();
  }));
  await browser.close();
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(rows, null, 1));
  const ok = rows.filter((r) => !r.error);
  console.log(`${ok.length} of ${rows.length} walked; ${rows.filter((r) => r.error).length} failed`);
  rows.filter((r) => r.error).forEach((r) => console.log(`  FAIL ${r.id}: ${r.error}`));
})();
