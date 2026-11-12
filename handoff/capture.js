/* Florin handoff capture: every screen x state x plan x theme in handoff/inventory.js, from the prototype's own page,
   at 390 by 844 (the phone's screen inside the device frame, status bar and home indicator included), deviceScaleFactor 2.

   NODE_PATH=$(npm root -g) node handoff/capture.js <out-dir> [options]

   --flows home,logging       only these flows (ids in inventory.js). Default: every flow not marked later: true
   --only today,plus          only these screens (screen ids, or flow/screen)
   --all                      include the flows marked later: true (Insights, after its rebuild)
   --rows                     also shoot every Screens-list row the inventory doesn't name, once, in the default state
                              (so a screen another session adds, a photo meal log say, is caught on a rerun)
   --tall                     also a full-length frame of each screen (the scroller grown to its content)
   --dom                      also a flattened DOM dump per capture: one HTML file, every element's computed style
                              inlined, colours in rgb(), pseudo-elements as spans, boxes as data-x/y/w/h, fonts from
                              <out>/fonts (copied from focus/fonts). What a Figma import of real layers can work from
   --embed-fonts              with --dom, embed the fonts as data: URIs instead of referencing <out>/fonts
   --workers 3                pages in parallel (default 3)
   --limit 20                 the first N captures only
   --list                     print the expanded inventory and stop
   --page <path>              the page to load (default prototype/_local.html)

   Writes <out>/<flow>/<screen>/<state>--<plan>--<theme>.png (and -tall.png, .html), <out>/index.json (one row per
   capture: flow, screen, state, plan, theme, file, tall, dom, error), <out>/tokens.json (every --ap-* token and the
   brand tokens resolved to hex in light and dark, normal and Easy), <out>/type.json (the type styles the captured
   screens use, with counts) and <out>/errors.json.

   It drives the page the way work/shots.js and work/sweep.js do: the left bar's own buttons (data-rx) for the decisions
   and the demo controls, so the page, the stored decisions and the phone agree; the Screens list's rows to open a
   screen; and window.FLORIN_EXT.api (phone.set, open, act, push) for what the list doesn't reach. It never edits the
   prototype. Reduced motion is on, so nothing is caught mid-animation and no number counts up. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const OUT = args[0] && !args[0].startsWith("--") ? path.resolve(args[0]) : null;
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.resolve(flag("--page", path.join(ROOT, "prototype/_local.html")));
const WORKERS = Math.max(1, +flag("--workers", 3));
const LIMIT = +flag("--limit", 0);
const FLOWS = flag("--flows", null);
const ONLY = flag("--only", null);
const TALL = has("--tall"), DOM = has("--dom"), EMBED = has("--embed-fonts"), ROWS = has("--rows"), ALL = has("--all");
const INV = require("./inventory.js");

/* ---------------------------------------------------------------------------------------------------------------- */
/* the inventory, expanded: one job per screen x state x plan x theme                                                */
/* ---------------------------------------------------------------------------------------------------------------- */
const PENDING = [];
const DATA_LABEL = { est: "12w", new: "day5", fresh: "day0" };
function expand() {
  const jobs = [];
  const wantF = FLOWS ? FLOWS.split(",") : null, wantS = ONLY ? ONLY.split(",") : null;
  for (const F of INV.flows) {
    if (wantF && !wantF.includes(F.id)) continue;
    if (!wantF && F.later && !ALL) continue;
    for (const Sc of F.screens) {
      if (Sc.pending) { PENDING.push({ flow: F.id, screen: Sc.id, name: Sc.name, why: Sc.pending }); continue; }
      if (wantS && !wantS.includes(Sc.id) && !wantS.includes(`${F.id}/${Sc.id}`)) continue;
      const base = Object.assign({}, INV.matrix, F.matrix || {}, Sc.matrix || {});
      /* the base state over its matrix: one state per data value */
      if (!Sc.noBase) {
        for (const data of base.data) for (const plan of base.plan) for (const theme of base.theme) {
          jobs.push({ flow: F.id, flowName: F.name, screen: Sc.id, screenName: Sc.name, state: DATA_LABEL[data] || data, stateName: { est: "12 weeks of logs", new: "New, day 5 (learning)", fresh: "Just joined, day 0" }[data] || data,
            data, plan, theme, set: Object.assign({}, F.set || {}, Sc.set || {}), steps: [].concat(Sc.steps || []), crop: Sc.crop || null, scroll: Sc.scroll, wip: !!Sc.wip });
        }
      }
      for (const St of Sc.states || []) {
        const m = Object.assign({ data: ["est"], plan: ["member"], theme: ["light", "dark"] }, St.matrix || {});
        for (const data of m.data) for (const plan of m.plan) for (const theme of m.theme) {
          const sid = m.data.length > 1 ? `${St.id}-${DATA_LABEL[data] || data}` : St.id;
          jobs.push({ flow: F.id, flowName: F.name, screen: Sc.id, screenName: Sc.name, state: sid, stateName: St.name, data, plan, theme,
            set: Object.assign({}, F.set || {}, Sc.set || {}, St.set || {}), steps: [].concat(St.before || [], St.replace ? [] : Sc.steps || [], St.steps || []), crop: St.crop || Sc.crop || null, scroll: St.scroll != null ? St.scroll : Sc.scroll, wip: !!Sc.wip });
        }
      }
    }
  }
  return jobs;
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* in the page                                                                                                        */
/* ---------------------------------------------------------------------------------------------------------------- */
/* the controls on the left bar, by data-rx and data-v. Returns ok, missing or disabled */
const clickRx = (p, k, v) => p.evaluate(([k, v]) => {
  const b = document.querySelector(`[data-rx="${k}"][data-v="${v}"]`);
  if (!b) return "missing";
  if (b.disabled) return "disabled";
  if (b.getAttribute("aria-pressed") !== "true") b.click();
  return "ok";
}, [k, String(v)]);

/* one step of a screen's way there (inventory.js says what each does) */
async function step(p, s) {
  if (s.open) {
    const r = await p.evaluate((id) => {
      const b = document.querySelector(`[data-rx="screen"][data-v="${id}"]`);
      if (b && !b.disabled) { b.click(); return "row"; }
      if (b && b.disabled) return "disabled";
      window.FLORIN_EXT.api.open(id); return "api";
    }, s.open);
    if (r === "disabled") throw new Error(`the Screens row ${s.open} is disabled`);
    return;
  }
  if (s.set) { for (const [k, v] of Object.entries(s.set)) { const r = await clickRx(p, k, v); if (r === "missing") await p.evaluate(([k, v]) => window.FLORIN_EXT.api.set(k, v), [k, v]); } return; }
  if (s.tab) { await p.evaluate((t) => window.FLORIN_EXT.api.go(t), s.tab); return; }
  if (s.click) {
    const ok = await p.evaluate(([sel, nth]) => {
      const ph = document.querySelector(".rx-stage .ap-rx");
      const all = [...ph.querySelectorAll(sel)].filter((el) => !el.closest("[inert]") && !el.closest(".is-out"));
      const el = all[nth < 0 ? all.length + nth : nth || 0];
      if (!el) return false;
      el.click();
      return true;
    }, [s.click, s.nth || 0]);
    if (!ok && !s.optional) throw new Error(`nothing to click: ${s.click}`);
    return;
  }
  if (s.act) {
    await p.evaluate(([name, data]) => {
      const b = document.createElement("button");
      Object.entries(data || {}).forEach(([k, v]) => (b.dataset[k] = String(v)));
      window.FLORIN_EXT.api.act(name, b);
    }, [s.act, s.data || {}]);
    return;
  }
  if (s.add) {
    await p.evaluate((es) => {
      const L = window.FLORIN_LOGS, api = window.FLORIN_EXT.api, M = api.M();
      [].concat(es).forEach((e0) => {
        const e = Object.assign({ d: L.TODAY, note: "" }, e0);
        if (e.ago != null) { e.d = L.TODAY - e.ago; delete e.ago; }
        if (e.kind === "bm") Object.assign(e, Object.assign({ form: null, word: null, how: {}, dur: null, flags: {} }, e0, { d: e.d }));
        if (e.kind === "sym") e.last = e.last === undefined ? null : e.last;
        L.add(M, e);
      });
      api.renderTab(true);
    }, s.add);
    return;
  }
  if (s.eval) {
    await p.evaluate((body) => new Function("api", "L", "RU", "EXT", body)(window.FLORIN_EXT.api, window.FLORIN_LOGS, window.FLORIN_RUI, window.FLORIN_EXT), s.eval);
    return;
  }
  if (s.type) {
    const [sel, text] = s.type;
    const ok = await p.evaluate(([sel, text]) => {
      const el = document.querySelector(`.rx-stage .ap-rx ${sel}`);
      if (!el) return false;
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, [sel, text]);
    if (!ok) throw new Error(`no field to type in: ${sel}`);
    return;
  }
  if (s.key) { await p.keyboard.press(s.key); return; }
  if (s.wait) { await p.waitForTimeout(s.wait); return; }
  if (s.scroll != null) { await scrollTo(p, s.scroll); return; }
  if (s.focus) { await p.evaluate((sel) => { const el = document.querySelector(`.rx-stage .ap-rx ${sel}`); if (el) el.focus(); }, s.focus); return; }
  throw new Error(`unknown step ${JSON.stringify(s)}`);
}

/* the live scroller: the top overlay's body, else the tab under the bar */
const SCROLLER = `(() => {
  const ph = document.querySelector(".rx-stage .ap-rx");
  const ovs = [...ph.querySelectorAll(".ap-o:not(.is-out)")];
  const ov = ovs[ovs.length - 1];
  const cands = ov ? [...ov.querySelectorAll(".ap-fsh-b, .ap-ck-b, .ap-psh, .ap-o-p, *")] : [ph.querySelector(".ap-layer")];
  return cands.find((el) => { const cs = getComputedStyle(el); return /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4; }) || (ov ? null : ph.querySelector(".ap-layer"));
})()`;
async function scrollTo(p, to) {
  await p.evaluate(([to, sc]) => {
    const el = eval(sc);
    if (!el) return;
    if (to === "end") el.scrollTop = el.scrollHeight;
    else if (typeof to === "number") el.scrollTop = to;
    else { const t = el.querySelector(to); if (t) el.scrollTop = Math.max(0, t.offsetTop - 64); }
  }, [to, SCROLLER]);
}

/* wait for the phone to settle: fonts, an Ask answer being worked out, a frame or two */
async function settle(p) {
  await p.evaluate(() => document.fonts && document.fonts.ready);
  for (let i = 0; i < 40; i++) {
    const busy = await p.evaluate(() => { const S = window.FLORIN_EXT.api.S; return !!(S.askx && (S.askx.busy || S.askx.pending)); }).catch(() => false);
    if (!busy) break;
    await p.waitForTimeout(150);
  }
  await p.waitForTimeout(250);
}

/* grow the phone so the live scroller shows all of its content, for a full-length frame; returns how much it grew */
async function grow(p) {
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const extra = await p.evaluate((sc) => { const el = eval(sc); return el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0; }, SCROLLER);
    if (extra < 4 || total + extra > 6000) break;
    total += extra;
    await p.evaluate((h) => {
      const dev = document.querySelector(".rx-stage .apx-device"), fit = document.querySelector(".rx-stage .rx-fit");
      dev.style.height = `${868 + h}px`; fit.style.height = `${868 + h}px`;
    }, total);
    await p.waitForTimeout(150);
  }
  return total;
}
const ungrow = (p) => p.evaluate(() => {
  const dev = document.querySelector(".rx-stage .apx-device"), fit = document.querySelector(".rx-stage .rx-fit");
  dev.style.height = ""; fit.style.height = "868px";
  document.querySelectorAll("[data-shot]").forEach((x) => x.removeAttribute("data-shot"));
});

/* the capture's look: the screen as a rectangle (no device corners), nothing caught mid-transition */
const CAPTURE_CSS = `.rx-stage .apx-screen { border-radius: 0 !important; }
  .rx-stage .apx-phone { background: none !important; box-shadow: none !important; }
  .rx-stage *, .rx-stage *::before, .rx-stage *::after { caret-color: transparent !important; transition-duration: 0s !important; transition-delay: 0s !important; }`;

/* ---------- the flattened DOM: every element's computed style inlined ---------- */
/* runs in the page. Inherited properties are written only where they differ from the parent; the rest only where they
   differ from the tag's default (a clean element in an empty frame). Colours in any space become rgb()/rgba() */
const FLATTEN = function (opts) {
  const root = document.querySelector(".rx-stage .apx-screen");
  const box0 = root.getBoundingClientRect();
  const INHERITED = new Set(["color", "font-family", "font-size", "font-style", "font-variant", "font-weight", "font-stretch", "font-feature-settings", "font-variation-settings", "font-optical-sizing", "line-height", "letter-spacing", "word-spacing", "text-align", "text-indent", "text-transform", "text-shadow", "white-space", "word-break", "overflow-wrap", "hyphens", "visibility", "cursor", "direction", "list-style-type", "list-style-position", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "stroke-dasharray", "text-anchor", "dominant-baseline", "-webkit-font-smoothing", "font-kerning", "tab-size", "caret-color", "border-collapse", "border-spacing", "color-scheme", "paint-order", "text-rendering", "text-wrap-mode", "text-wrap-style", "white-space-collapse"]);
  const SKIP = /^(transition|animation|will-change|cursor|caret|outline-offset|user-select|-webkit-user|-webkit-tap|pointer-events|touch-action|scroll-|overscroll|contain|content-visibility|view-transition|anchor|position-try|interpolate|math-|ruby-|speak|zoom|app-region|-webkit-locale|-webkit-rtl|-webkit-print|-webkit-text-security|-webkit-line-break|-webkit-highlight|-webkit-user-drag|-webkit-mask-box|backface|perspective-origin|transform-origin|inset-block|inset-inline|margin-block|margin-inline|padding-block|padding-inline|border-block|border-inline|block-size|inline-size|min-block|min-inline|max-block|max-inline|text-size-adjust|-webkit-text-size|-webkit-border-image|text-decoration-skip|text-underline-position|orphans|widows|counter-|quotes|forced-color|print-color|accent-color|field-sizing|reading-|timeline|scrollbar|dynamic-range|text-spacing|text-box)/;
  /* a clean frame for the defaults */
  let fr = document.getElementById("__hof");
  if (!fr) { fr = document.createElement("iframe"); fr.id = "__hof"; fr.style.cssText = "position:absolute;left:-9999px;width:10px;height:10px;"; document.body.appendChild(fr); }
  const fd = fr.contentDocument, defs = {};
  const defOf = (tag, ns) => {
    const k = (ns || "") + tag;
    if (defs[k]) return defs[k];
    const el = ns ? fd.createElementNS(ns, tag) : fd.createElement(tag);
    if (ns) { let s = fd.querySelector("svg"); if (!s) { s = fd.createElementNS("http://www.w3.org/2000/svg", "svg"); fd.body.appendChild(s); } if (tag === "svg") fd.body.appendChild(el); else s.appendChild(el); } else fd.body.appendChild(el);
    const cs = fr.contentWindow.getComputedStyle(el), o = {};
    for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]);
    defs[k] = o;
    return o;
  };
  /* colours to rgb(): any colour function the importer might not read, through a 1px canvas */
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const memo = {};
  const toRgb = (c) => {
    if (memo[c]) return memo[c];
    const m = /^color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([\d.]+))?\)$/.exec(c);
    if (m) { const [r, g, b] = [m[1], m[2], m[3]].map((x) => Math.round(Math.max(0, Math.min(1, +x)) * 255)); return (memo[c] = m[4] == null || +m[4] === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+(+m[4]).toFixed(3)})`); }
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return (memo[c] = a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`);
  };
  const COLOR_FN = /\b(oklch|oklab|lab|lch|color|color-mix|hwb)\((?:[^()]|\([^()]*\))*\)/g;
  const fixColors = (v) => (v && COLOR_FN.test(v) ? v.replace(COLOR_FN, (m) => toRgb(m)) : v);
  const fonts = {};
  const styleOf = (el, pseudo, parentCs) => {
    const cs = getComputedStyle(el, pseudo || null);
    const ns = el.namespaceURI === "http://www.w3.org/2000/svg" ? el.namespaceURI : null;
    const d = defOf(pseudo ? "span" : el.localName, pseudo ? null : ns), span = ns ? d : defOf("span", null);
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      const k = cs[i];
      if (k.startsWith("--") || SKIP.test(k)) continue;
      const v = cs.getPropertyValue(k);
      /* an inherited value equal to the parent's is left to inherit, unless the tag's own default sets it (an em's
         italic, a button's centring, a heading's weight), where the dump has to say it */
      if (INHERITED.has(k) ? parentCs && parentCs.getPropertyValue(k) === v && d[k] === span[k] : d[k] === v) continue;
      if (k === "width" || k === "height") { if (!ns && cs.display === "inline") continue; }
      out.push(`${k}: ${fixColors(v)}`);
    }
    return { cs, css: out.join("; ") };
  };
  const BOX = (el) => { const r = el.getBoundingClientRect(); return [Math.round((r.left - box0.left) * 10) / 10, Math.round((r.top - box0.top) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  const type = {};
  const walk = (el, parentCs) => {
    if (el.nodeType === 3) return document.createTextNode(el.nodeValue);
    if (el.nodeType !== 1) return null;
    const tag = el.localName;
    if (tag === "script" || tag === "style" || el.id === "__hof") return null;
    const ns = el.namespaceURI;
    const { cs, css } = styleOf(el, null, parentCs);
    if (cs.display === "none" && !opts.keepHidden) return null;
    const c = ns === "http://www.w3.org/1999/xhtml" ? document.createElement(tag) : document.createElementNS(ns, tag);
    for (const a of el.attributes) { if (a.name === "style" || a.name.startsWith("on")) continue; try { c.setAttribute(a.name, a.value); } catch (e) { /* an odd name */ } }
    if (css) c.setAttribute("style", css);
    if (ns !== "http://www.w3.org/2000/svg" || tag === "svg") { const [x, y, w, h] = BOX(el); c.setAttribute("data-x", x); c.setAttribute("data-y", y); c.setAttribute("data-w", w); c.setAttribute("data-h", h); }
    if (tag === "input" || tag === "textarea") { c.setAttribute("value", el.value); if (tag === "textarea") c.textContent = el.value; }
    if (tag === "select") { const o = el.options[el.selectedIndex]; c.setAttribute("data-value", o ? o.textContent : ""); }
    /* text styles: the elements that hold text of their own */
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) {
      const k = [cs.fontFamily.split(",")[0].replace(/"/g, ""), cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing, cs.textTransform, cs.fontStyle].join(" | ");
      fonts[cs.fontFamily.split(",")[0].replace(/"/g, "") + " " + cs.fontWeight + " " + cs.fontStyle] = 1;
      (type[k] = type[k] || { n: 0, cls: {} }).n++;
      const cl = (el.getAttribute("class") || tag).split(" ")[0];
      type[k].cls[cl] = (type[k].cls[cl] || 0) + 1;
    }
    const pse = (which) => {
      const ps = getComputedStyle(el, which);
      const content = ps.content;
      if (!content || content === "none" || content === "normal") return null;
      const { css } = styleOf(el, which, cs);
      const s = document.createElement("span");
      s.setAttribute("data-pseudo", which.replace(/:/g, ""));
      s.setAttribute("style", css);
      const txt = content.replace(/^["']|["']$/g, "");
      if (txt && !/^(counter|attr|url)\(/.test(content)) s.textContent = txt;
      return s;
    };
    if (ns === "http://www.w3.org/1999/xhtml") { const b = pse("::before"); if (b) c.appendChild(b); }
    for (const n of el.childNodes) { const k = walk(n, cs); if (k) c.appendChild(k); }
    if (ns === "http://www.w3.org/1999/xhtml") { const a = pse("::after"); if (a) c.appendChild(a); }
    if (el.scrollTop && c.setAttribute) c.setAttribute("data-scroll-top", el.scrollTop);
    return c;
  };
  /* the frame says every inherited value in full, since nothing above it is dumped */
  const tree = walk(root, null);
  tree.setAttribute("data-frame", "phone");
  tree.style.position = "relative"; tree.style.left = "0"; tree.style.top = "0"; tree.style.inset = "auto";
  tree.style.width = `${box0.width}px`; tree.style.height = `${box0.height}px`;
  return { html: tree.outerHTML, type, fonts: Object.keys(fonts), w: box0.width, h: box0.height };
};

/* every token, resolved, for the Figma variables: --ap-* on the phone's root in light and dark, normal and Easy, and
   the brand tokens on :root */
const TOKENS = function () {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  /* a computed colour in rgb() or color(srgb), read exactly (a canvas rounds a see-through colour's channels); any
     other space through a 1px canvas */
  const exact = (c) => {
    let m = /^rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?\)$/.exec(c);
    if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 255 : +m[4] * 255];
    m = /^color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([\d.]+))?\)$/.exec(c);
    if (m) return [m[1], m[2], m[3]].map((x) => Math.max(0, Math.min(255, +x * 255))).concat(m[4] == null ? 255 : +m[4] * 255);
    return null;
  };
  const hex = (c) => {
    const e = exact(c);
    if (e) { const [r, g, b, a] = e.map(Math.round); const h = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase(); return a >= 255 ? h : h + a.toString(16).padStart(2, "0").toUpperCase(); }
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    const h = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
    return a === 255 ? h : h + Math.round(a).toString(16).padStart(2, "0").toUpperCase();
  };
  const ph = document.querySelector(".rx-stage .ap-rx");
  const probe = document.createElement("i");
  probe.style.cssText = "position:absolute;width:1px;height:1px;";
  const read = (el) => {
    const cs = getComputedStyle(el), o = {};
    const names = [];
    for (let i = 0; i < cs.length; i++) if (cs[i].startsWith("--")) names.push(cs[i]);
    el.appendChild(probe);
    names.sort().forEach((n) => {
      const raw = cs.getPropertyValue(n).trim();
      probe.style.color = ""; probe.style.color = `var(${n})`;
      const col = getComputedStyle(probe).color;
      const isCol = raw && probe.style.color && col && !/^(\d|cubic|ease|linear|inset|0 |[a-z]+\()/i.test(raw.replace(/^(oklch|oklab|color-mix|color|rgb|rgba|hsl|#)/i, "#")) ;
      o[n] = isCol || /^(#|rgb|oklch|color-mix|color\(|var\(--(forest|cream|ray|plum|teal|gold))/i.test(raw) ? { value: hex(col), raw } : { raw };
    });
    probe.remove();
    return o;
  };
  const was = { theme: ph.dataset.theme, easy: ph.classList.contains("ap--easy") };
  const out = { brand: {}, light: {}, dark: {}, easyLight: {}, easyDark: {} };
  const rootCs = getComputedStyle(document.documentElement);
  ["--forest", "--cream", "--ray", "--plum", "--teal", "--gold"].forEach((n) => (out.brand[n] = rootCs.getPropertyValue(n).trim().toUpperCase()));
  ph.dataset.theme = "light"; ph.classList.remove("ap--easy"); out.light = read(ph);
  ph.dataset.theme = "dark"; out.dark = read(ph);
  ph.classList.add("ap--easy"); ph.dataset.theme = "light"; out.easyLight = read(ph);
  ph.dataset.theme = "dark"; out.easyDark = read(ph);
  ph.dataset.theme = was.theme; ph.classList.toggle("ap--easy", was.easy);
  return out;
};

/* ---------------------------------------------------------------------------------------------------------------- */
/* the run                                                                                                            */
/* ---------------------------------------------------------------------------------------------------------------- */
const DEFAULTS = INV.defaults;
async function setup(p, job) {
  /* the demo person and the plan, then every decision to the job's value (defaults unless the job sets it), then a reset
     so the model is fresh: nothing logged by an earlier capture carries over */
  const want = Object.assign({}, DEFAULTS.decisions, job.set || {});
  const r = [];
  r.push(await clickRx(p, "persona", want.persona || DEFAULTS.persona));
  r.push(await clickRx(p, "data", job.data));
  r.push(await clickRx(p, "meals", want.meals || "all"));
  for (const k of Object.keys(DEFAULTS.decisions)) if (!["persona", "meals"].includes(k)) r.push(await clickRx(p, k, want[k]));
  r.push(await clickRx(p, "plan", job.plan));
  r.push(await clickRx(p, "theme", job.theme));
  await p.evaluate(() => { const b = document.querySelector('[data-rx="reset"]'); if (b) b.click(); });
  await p.evaluate(() => { const api = window.FLORIN_EXT.api; api.closeAll(); });
  return r;
}

async function shoot(p, job, out, log) {
  const dir = path.join(out, job.flow, job.screen);
  fs.mkdirSync(dir, { recursive: true });
  const base = `${job.state}--${job.plan}--${job.theme}`;
  const row = { flow: job.flow, flowName: job.flowName, screen: job.screen, screenName: job.screenName, state: job.state, stateName: job.stateName, data: job.data, plan: job.plan, theme: job.theme, set: job.set, wip: !!job.wip, file: null, tall: null, dom: null, key: null, error: null, console: [] };
  log.length = 0;
  try {
    await setup(p, job);
    for (const s of job.steps) await step(p, s);
    await settle(p);
    if (job.scroll != null) { await scrollTo(p, job.scroll); await p.waitForTimeout(120); }
    /* a box that clips its overflow can still be scrolled by focus or a script: put the phone's frame back at its top */
    await p.evaluate(() => document.querySelectorAll(".rx-stage .apx-screen, .rx-stage .rx-mount, .rx-stage .ap-rx, .rx-stage .ap-stack").forEach((e) => { e.scrollTop = 0; e.scrollLeft = 0; }));
    /* a heading the app focused for a screen reader would show its ring: blur it, as a tap would */
    await p.evaluate(() => { const a = document.activeElement; if (a && a !== document.body && a.closest(".rx-stage")) a.blur(); });
    /* the plan, the theme and the screen the phone says it shows, after the steps (a Membership row sets Free) */
    const now = await p.evaluate(() => { const api = window.FLORIN_EXT.api; return { key: api.key(), plan: api.V().plan, theme: api.root.dataset.theme, easy: api.V().easy }; });
    row.key = now.key;
    if (now.plan !== job.plan) row.note = `the screen set the plan to ${now.plan}`;
    const el = await p.$(".rx-stage .apx-screen");
    const file = path.join(dir, `${base}.png`);
    await el.screenshot({ path: file, animations: "disabled" });
    row.file = path.relative(out, file);
    if (job.crop) {
      for (const c of job.crop) {
        const cdir = path.join(out, "components", c.name);
        fs.mkdirSync(cdir, { recursive: true });
        const hs = await p.$$(`.rx-stage .ap-rx ${c.sel}`);
        const pick = c.all ? hs.slice(0, c.all) : hs.slice(0, 1);
        row.crops = row.crops || [];
        for (const [i, h] of pick.entries()) {
          const f = path.join(cdir, `${job.screen}-${job.state}--${job.theme}${pick.length > 1 ? `-${i + 1}` : ""}.png`);
          try { await h.screenshot({ path: f, animations: "disabled" }); row.crops.push(path.relative(out, f)); } catch (e) { row.crops.push(`failed: ${c.name}: ${e.message.split("\n")[0]}`); }
        }
      }
    }
    if (DOM) {
      const d = await p.evaluate(FLATTEN, { keepHidden: false });
      const fontCss = fontFaces(out, EMBED, dir);
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${d.w}">
<title>${esc(job.flowName)} / ${esc(job.screenName)} / ${esc(job.stateName)} / ${job.plan} / ${job.theme}</title>
<meta name="florin:screen" content="${job.screen}"><meta name="florin:state" content="${job.state}"><meta name="florin:plan" content="${job.plan}"><meta name="florin:theme" content="${job.theme}">
<style>${fontCss}
html, body { margin: 0; padding: 0; background: #888; }
[data-frame] { overflow: hidden; }
</style></head><body>
${d.html}
</body></html>`;
      const hf = path.join(dir, `${base}.html`);
      fs.writeFileSync(hf, html);
      row.dom = path.relative(out, hf);
      row.type = d.type;
    }
    if (TALL) {
      const grew = await grow(p);
      if (grew > 0) {
        await p.waitForTimeout(120);
        const tf = path.join(dir, `${base}--tall.png`);
        await el.screenshot({ path: tf, animations: "disabled" });
        row.tall = path.relative(out, tf);
        row.tallHeight = 844 + grew;
      }
      await ungrow(p);
    }
  } catch (e) {
    row.error = String(e.message || e).split("\n")[0].slice(0, 300);
    await ungrow(p).catch(() => {});
  }
  row.console = log.slice();
  return row;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* the fonts the dumps use: the prototype loads Google Fonts; the focus test keeps the same faces as local woff2 */
let FONT_CSS_REF = null, FONT_CSS_EMB = null;
function fontFaces(out, embed, dir) {
  const src = path.join(ROOT, "focus/fonts");
  const FACES = [
    ["DM Sans", "normal", "300 700", "dm-sans-normal-latin.woff2"], ["DM Sans", "italic", "300 700", "dm-sans-italic-latin.woff2"],
    ["Lora", "normal", "400 700", "lora-normal-latin.woff2"], ["Lora", "italic", "400 700", "lora-italic-latin.woff2"],
    ["Space Mono", "normal", "400", "space-mono-normal-400-latin.woff2"], ["Space Mono", "normal", "700", "space-mono-normal-700-latin.woff2"]
  ].filter((f) => fs.existsSync(path.join(src, f[3])));
  if (embed) {
    if (!FONT_CSS_EMB) FONT_CSS_EMB = FACES.map(([fam, st, w, f]) => `@font-face { font-family: "${fam}"; font-style: ${st}; font-weight: ${w}; font-display: block; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(src, f)).toString("base64")}) format("woff2"); }`).join("\n");
    return FONT_CSS_EMB;
  }
  const fdir = path.join(out, "fonts");
  if (!fs.existsSync(fdir)) { fs.mkdirSync(fdir, { recursive: true }); FACES.forEach((f) => fs.copyFileSync(path.join(src, f[3]), path.join(fdir, f[3]))); }
  const rel = path.relative(dir, fdir).split(path.sep).join("/");
  return FACES.map(([fam, st, w, f]) => `@font-face { font-family: "${fam}"; font-style: ${st}; font-weight: ${w}; font-display: block; src: url("${rel}/${f}") format("woff2"); }`).join("\n") +
    `\n/* also on Google Fonts: https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Space+Mono:wght@400;700 */`;
}

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2, reducedMotion: "reduce", colorScheme: "light" });
  const p = await ctx.newPage();
  const log = [];
  p.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /module|refresh-|threw|failed/i.test(m.text()))) log.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  p.on("pageerror", (e) => log.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  await p.goto(PAGE);
  await p.waitForSelector(".rx-stage .ap-rx");
  await p.addStyleTag({ content: CAPTURE_CSS });
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await p.waitForTimeout(300);
  return { ctx, p, log };
}

const main = async () => {
  let jobs = expand();
  if (has("--list")) {
    const by = {};
    jobs.forEach((j) => { const k = `${j.flow}/${j.screen}`; (by[k] = by[k] || []).push(`${j.state}--${j.plan}--${j.theme}`); });
    Object.entries(by).forEach(([k, v]) => console.log(`${k} (${v.length}): ${v.join(", ")}`));
    PENDING.forEach((x) => console.log(`${x.flow}/${x.screen}: pending, ${x.why}`));
    console.log(`\n${jobs.length} captures, ${Object.keys(by).length} screens, ${new Set(jobs.map((j) => j.flow)).size} flows`);
    return;
  }
  if (!OUT) { console.error("usage: node handoff/capture.js <out-dir> [--flows ...] [--only ...] [--tall] [--dom] [--rows] [--all]"); process.exitCode = 2; return; }
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const browser = await chromium.launch();

  /* the tokens, and the rows the inventory doesn't name (with --rows), from one page first */
  {
    const { ctx, p } = await openPage(browser);
    fs.writeFileSync(path.join(OUT, "tokens.json"), JSON.stringify(await p.evaluate(TOKENS), null, 1));
    if (ROWS) {
      const named = new Set(INV.flows.flatMap((F) => F.screens.flatMap((S) => [].concat(S.steps || [], ...(S.states || []).map((x) => x.steps || [])).filter((s) => s.open).map((s) => s.open))));
      const rows = await p.$$eval('[data-rx="screen"]', (bs) => bs.map((b) => [b.dataset.v, b.textContent.trim(), b.closest(".rx-nav-g").querySelector(".rx-eyebrow").textContent.trim()]));
      rows.filter(([id]) => !named.has(id)).forEach(([id, label, g]) => jobs.push({ flow: "unlisted", flowName: "Not in the inventory yet", screen: id, screenName: `${g}: ${label}`, state: "12w", stateName: "12 weeks of logs", data: "est", plan: "member", theme: "light", set: {}, steps: [{ open: id }] }));
    }
    await ctx.close();
  }
  if (LIMIT) jobs = jobs.slice(0, LIMIT);
  console.log(`${jobs.length} captures on ${WORKERS} pages${TALL ? ", full length too" : ""}${DOM ? ", with DOM dumps" : ""}`);

  const rows = new Array(jobs.length);
  let done = 0;
  const slices = Array.from({ length: WORKERS }, (_, w) => jobs.map((j, i) => [j, i]).filter((_, i) => i % WORKERS === w));
  await Promise.all(slices.map(async (slice) => {
    let { ctx, p, log } = await openPage(browser);
    let since = 0;
    for (const [job, i] of slice) {
      /* a fresh page now and then, so nothing a screen left behind (a timer, a chat) leaks into the next */
      if (++since > 40) { await ctx.close(); ({ ctx, p, log } = await openPage(browser)); since = 0; }
      let row = await shoot(p, job, OUT, log);
      if (row.error && /Target closed|crashed|detached/i.test(row.error)) { await ctx.close().catch(() => {}); ({ ctx, p, log } = await openPage(browser)); since = 0; row = await shoot(p, job, OUT, log); }
      rows[i] = row;
      if (++done % 25 === 0) console.log(`  ${done} of ${jobs.length}`);
    }
    await ctx.close();
  }));
  await browser.close();

  /* the type styles the screens use, merged */
  const type = {};
  rows.forEach((r) => Object.entries(r.type || {}).forEach(([k, v]) => { const t = (type[k] = type[k] || { n: 0, cls: {} }); t.n += v.n; Object.entries(v.cls).forEach(([c, n]) => (t.cls[c] = (t.cls[c] || 0) + n)); }));
  if (DOM) fs.writeFileSync(path.join(OUT, "type.json"), JSON.stringify(Object.entries(type).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => { const [family, size, weight, lineHeight, letterSpacing, transform, style] = k.split(" | "); return { family, size, weight, lineHeight, letterSpacing, transform, style, n: v.n, classes: Object.entries(v.cls).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c} (${n})`) }; }), null, 1));
  rows.forEach((r) => delete r.type);
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ made: new Date().toISOString(), page: PAGE, viewport: "390x844 @2x", pending: PENDING, captures: rows }, null, 1));
  const bad = rows.filter((r) => r.error || (r.console && r.console.length));
  fs.writeFileSync(path.join(OUT, "errors.json"), JSON.stringify(bad.map((r) => ({ at: `${r.flow}/${r.screen} ${r.state}--${r.plan}--${r.theme}`, error: r.error, console: r.console })), null, 1));
  const secs = Math.round((Date.now() - t0) / 1000);
  console.log(`${rows.filter((r) => r.file).length} of ${rows.length} captured in ${secs}s; ${rows.filter((r) => r.error).length} failed, ${rows.filter((r) => !r.error && r.console.length).length} with console errors`);
  rows.filter((r) => r.error).forEach((r) => console.log(`  FAIL ${r.flow}/${r.screen} ${r.state}--${r.plan}--${r.theme}: ${r.error}`));
};
/* run as a script, or lend the way there to another tool (handoff/figma-layers.js): the inventory's jobs, the page,
   the controls, the steps, settling and growing the phone */
if (require.main === module) main();
module.exports = { INV, expand, openPage, setup, step, settle, grow, ungrow, scrollTo, clickRx, SCROLLER };
