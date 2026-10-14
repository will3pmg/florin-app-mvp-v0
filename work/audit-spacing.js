/* Spacing audit for the refresh prototype (adapted from the brand studio's work/audit-spacing.js): every padding, margin, gap, inset and corner radius on the product surfaces (the app and the
   website) has to sit on the DESIGN.md scale. It reads the scale from DESIGN.md's front matter, so the two can't drift.

     node work/audit-spacing.js            summary: per file, what's on the scale and what isn't. Exits 1 on a miss
     node work/audit-spacing.js --list     every off-scale value: file:line, selector, declaration
     node work/audit-spacing.js --exempt   every value let through, and why
     node work/audit-spacing.js --all      also report the studio chrome and the boards (never enforced)

   What it checks
   - Spacing: padding, margin, gap, inset, top/right/bottom/left, scroll-margin. px only (rem reads as 16px).
     A fluid value is checked at its ends: clamp(16px, 4cqi, 56px) checks 16 and 56.
   - Radius: border-radius, against `rounded:`. 50% and 999px are circles and pills.
   - Not spacing, so not checked: borders and strokes, outlines, shadows, widths and heights, type.

   What it lets through (and --exempt lists)
   - Centring: a negative margin or inset that is exactly half the element's own width or height.
   - An inset of 3px or less (a dot or icon aligned to a line).
   - A declaration followed by a CSS comment that starts `grid-exempt:` and gives a reason: geometry that isn't
     spacing, such as a glyph drawn in CSS or a device frame. Keep these rare. The reason is required.

   Out of scope: the studio's own chrome (studio.css, labs.css, the app stage .apx-), the chart kit (.c-), the boards,
   and the brand book and story deck, which scale with their frame (cqw) rather than using px. */
const fs = require('fs');
const path = require('path');
const walk = require('./css-walk');
const ROOT = path.join(__dirname, '..');
const PROTO = path.join(ROOT, 'prototype');
const LIST = process.argv.includes('--list');
const SHOWX = process.argv.includes('--exempt');
const ALL = process.argv.includes('--all');

// ---- the scale, from DESIGN.md ---------------------------------------------------------------------
const md = fs.readFileSync(path.join(ROOT, 'claude', 'Florin DESIGN.md'), 'utf8');
const fm = md.split(/^---\s*$/m)[1] || '';
const block = (name) => {
  const m = fm.match(new RegExp('^' + name + ':[^\\n]*\\n((?:[ ]{2}.*\\n)+)', 'm'));
  const out = {};
  if (m) for (const line of m[1].split('\n')) { const kv = line.match(/^\s{2}([\w-]+):\s*"?([\d.]+)px/); if (kv) out[kv[1]] = parseFloat(kv[2]); }
  return out;
};
// SCALE=4,8,12 and RADIUS=4,8 override DESIGN.md, to try a scale before writing it down
const envSet = (v) => v && new Set(v.split(',').map(Number));
const SPACE = envSet(process.env.SCALE) || new Set(Object.entries(block('spacing')).filter(([k]) => /^space-/.test(k)).map(([, v]) => v));
const RADIUS = envSet(process.env.RADIUS) || new Set(Object.values(block('rounded')));
if (!SPACE.size) { console.error('No space-N tokens in the DESIGN.md front matter'); process.exit(2); }

// ---- rules ------------------------------------------------------------------------------------------
const SPACING_PROP = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-padding|scroll-margin)(-|$)/;
const RADIUS_PROP = /^border(-[a-z]+)*-radius$/;
const INSET_PROP = /^(inset|top|right|bottom|left)(-|$)/;
const nums = (v) => { const out = []; v.replace(/(-?\d*\.?\d+)(px|rem)\b/g, (s, n, u) => { out.push(parseFloat(n) * (u === 'rem' ? 16 : 1)); return s; }); return out; };
const px = (decls, prop) => { const d = decls.find((x) => x.prop === prop); const m = d && d.value.match(/^(\d*\.?\d+)px$/); return m ? parseFloat(m[1]) : null; };

const PRODUCT = [
  // the studio's app screens: .ap and .ap-*, not the device stage (.apx-) or the chart kit (.c-)
  { f: 'css/app.css', scope: (s) => s.split(',').some((x) => /\.ap\b|\.ap-|:where\(\.ap\)/.test(x) && !/\.apx/.test(x)) },
  // the refresh: the new app components and the prototype page around the phone, all of it on the scale
  { f: 'css/refresh.css', scope: () => true },
  // the data looks: the library page and each look, all of it on the scale
  { f: '../library/css/library.css', scope: () => true },
  { f: '../library/css/look-rings.css', scope: () => true },
  { f: '../library/css/look-journal.css', scope: () => true },
  { f: '../library/css/look-bento.css', scope: () => true },
];
const REPORT_ONLY = [];

function audit(file, scope) {
  const css = fs.readFileSync(path.join(PROTO, file), 'utf8');
  const r = { f: file, on: 0, off: 0, hits: [], exempt: [], hist: {} };
  walk(css, (rule) => {
    if (!scope(rule.sel)) return;
    const w = px(rule.decls, 'width'), h = px(rule.decls, 'height');
    for (const d of rule.decls) {
      const isR = RADIUS_PROP.test(d.prop), isS = SPACING_PROP.test(d.prop);
      if (!isR && !isS) continue;
      for (const v of nums(d.value)) {
        const n = Math.abs(v);
        if (n === 0) { r.on++; continue; }
        if (isR ? (RADIUS.has(n) || n >= 999) : SPACE.has(n)) { r.on++; continue; }
        let why = null;
        if (d.exempt) why = 'grid-exempt: ' + d.exempt;
        else if (isS && v < 0 && /^(margin|inset|top|right|bottom|left)/.test(d.prop) && (n === (w || 0) / 2 || n === (h || 0) / 2)) why = 'centring (half its own size)';
        else if (isS && INSET_PROP.test(d.prop) && n <= 3) why = 'inset of 3px or less';
        if (why) { r.exempt.push({ file, line: d.line, sel: rule.sel, prop: d.prop, value: d.value, why }); continue; }
        r.off++;
        const k = (isR ? 'r' : 's') + n;
        r.hist[k] = (r.hist[k] || 0) + 1;
        r.hits.push({ file, line: d.line, sel: rule.sel, at: rule.at, prop: d.prop, value: d.value, n, kind: isR ? 'radius' : 'spacing' });
      }
    }
  });
  return r;
}

if (require.main === module) {
  const report = PRODUCT.map(({ f, scope }) => audit(f, scope));
  const extra = ALL ? REPORT_ONLY.map(({ f, scope }) => audit(f, scope)) : [];
  console.log(`Spacing scale (DESIGN.md): ${[...SPACE].sort((a, b) => a - b).join(' ')}\nRadius scale: ${[...RADIUS].sort((a, b) => a - b).join(' ')}, plus 50% and full\n`);
  const line = (r, tag = '') => {
    const top = Object.entries(r.hist).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k.slice(1)}${k[0] === 'r' ? 'r' : ''}×${v}`).join('  ');
    console.log(`${(r.f + tag).padEnd(34)} on scale ${String(r.on).padStart(4)}   off ${String(r.off).padStart(4)}   exempt ${String(r.exempt.length).padStart(3)}   ${top}`);
  };
  report.forEach((r) => line(r));
  extra.forEach((r) => line(r, ' (report only)'));
  if (LIST) for (const r of report.concat(extra)) for (const h of r.hits) console.log(`  ${h.file}:${h.line}  ${h.sel.slice(0, 64)}  ${h.prop}: ${h.value}`);
  if (SHOWX) for (const r of report) for (const x of r.exempt) console.log(`  ${x.file}:${x.line}  ${x.sel.slice(0, 56)}  ${x.prop}: ${x.value}  [${x.why}]`);
  const off = report.reduce((a, r) => a + r.off, 0);
  console.log(off ? `\n${off} off-scale values in the prototype` : '\nThe prototype is on the scale.');
  process.exitCode = off ? 1 : 0;
}
module.exports = { audit, PRODUCT, SPACE, RADIUS, SPACING_PROP, RADIUS_PROP, INSET_PROP, nums, px };
