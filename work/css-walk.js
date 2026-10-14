/* A small CSS walker shared by audit-spacing.js and snap-spacing.js. Handles comments, strings and nested
   at-rules. Calls cb(rule) once per style rule with every declaration and where its value sits in the source,
   so a script can rewrite values in place without touching anything else.

   rule = { sel, at, decls: [{ prop, value, valStart, valEnd, line, exempt }] }
   `exempt` is the reason from a CSS comment starting `grid-exempt:` placed right after the declaration. */
module.exports = function walk(raw, cb) {
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const lineAt = (i) => { let n = 1; for (let k = 0; k < i; k++) if (src.charCodeAt(k) === 10) n++; return n; };
  const stack = [];
  let buf = '', bufStart = 0;
  const flush = (end, ch) => {
    const text = src.slice(bufStart, end);
    const colon = text.indexOf(':');
    const top = stack[stack.length - 1];
    if (colon > 0 && top && !top.sel.startsWith('@')) {
      const prop = text.slice(0, colon).trim().toLowerCase();
      if (/^[\w-]+$/.test(prop)) {
        const after = text.slice(colon + 1);
        const lead = after.length - after.trimStart().length;
        const valStart = bufStart + colon + 1 + lead;
        const valEnd = bufStart + text.trimEnd().length;
        let exempt = null;
        if (ch === ';') { const m = raw.slice(end + 1, end + 240).match(/^[ \t]*\/\*\s*grid-exempt:?\s*([^*]*)\*\//); if (m) exempt = m[1].trim() || 'exempt'; }
        if (valEnd > valStart) top.decls.push({ prop, value: raw.slice(valStart, valEnd), valStart, valEnd, line: lineAt(valStart), exempt });
      }
    }
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'") { const j = src.indexOf(ch, i + 1); i = j < 0 ? src.length : j; continue; }
    if (ch === '{') { stack.push({ sel: src.slice(bufStart, i).trim().replace(/\s+/g, ' '), decls: [] }); bufStart = i + 1; continue; }
    if (ch === ';') { flush(i, ch); bufStart = i + 1; continue; }
    if (ch === '}') {
      flush(i, ch);
      const r = stack.pop();
      if (r && !r.sel.startsWith('@')) cb({ sel: r.sel, at: stack.filter((s) => s.sel.startsWith('@')).map((s) => s.sel).join(' '), decls: r.decls });
      bufStart = i + 1;
      continue;
    }
  }
};
