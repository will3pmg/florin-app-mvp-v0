/* Florin handoff: the Figma side of handoff/figma-layers.js. This is the body of an async function (figma, opts), kept
   in the Figma file itself as a carrier (handoff/figma-pack.js packs it), so each use_figma call is a few lines:

     const page = await figma.getNodeByIdAsync("4:7"); await figma.setCurrentPageAsync(page);
     const parts = (await figma.getNodeByIdAsync("<builder carrier id>")).findAll((n) => n.type === "TEXT")...
     return await new AsyncFunction("figma", "opts", decode(parts))(figma, { max: 3 });

   On the current page it finds the screen carriers (frames holding a "florin-data" group, uploaded by upload_assets),
   reads each one's JSON back, builds the screen as editable layers, clones it for Dark, puts the pair in the page's
   "Screens, editable" section and removes the carrier. opts.max caps how many screens one call builds; a rerun picks up
   what's left, so it is safe to call again after a timeout. Every colour is bound to an App colour variable (created
   under extra/ when the file has none with those two values); the screen is set to the collection's Light mode and its
   clone to Dark, so the two can never drift. Text takes the file's text style where one matches. */
const T0 = Date.now();
const MAX = (opts && opts.max) || 3;
const page = figma.currentPage;
const b64 = (s) => { const bytes = figma.base64Decode(s); let out = ""; for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return decodeURIComponent(escape(out)); };

/* the carriers on this page */
const carriers = page.children.filter((n) => n.type === "FRAME" && n.children.some((c) => c.name === "florin-data")).slice(0, MAX);
if (!carriers.length) return { built: [], left: 0, note: "no carriers on this page" };

/* variables: App colour (Light, Dark) and Brand, by name */
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const APP = cols.find((c) => c.name === "App colour"), BRAND = cols.find((c) => c.name === "Brand");
const LIGHT = APP.modes.find((m) => m.name === "Light").modeId, DARK = APP.modes.find((m) => m.name === "Dark").modeId;
const VARS = {};
for (const v of await figma.variables.getLocalVariablesAsync("COLOR")) {
  const c = v.variableCollectionId === APP.id ? "App colour" : v.variableCollectionId === BRAND.id ? "Brand" : null;
  if (c) VARS[`${c}::${v.name}`] = v;
}
const rgba = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255, a: h.length > 7 ? parseInt(h.slice(7, 9), 16) / 255 : 1 });
const rgb = (h) => { const c = rgba(h); return { r: c.r, g: c.g, b: c.b }; };
const created = [];
const varFor = (entry) => {
  const [name, l, d] = entry;
  if (VARS[name]) return VARS[name];
  if (!name.startsWith("App colour::")) return null;
  const v = figma.variables.createVariable(name.slice("App colour::".length), APP, "COLOR");
  v.setValueForMode(LIGHT, rgba(l)); v.setValueForMode(DARK, rgba(d));
  v.scopes = ["ALL_FILLS", "STROKE_COLOR", "EFFECT_COLOR"];
  v.description = "Made from the prototype's computed colours (light and dark) where no App colour token had both values.";
  VARS[name] = v; created.push(v.name);
  return v;
};

/* text styles by name, fonts loaded once */
const STYLES = {};
for (const s of await figma.getLocalTextStylesAsync()) STYLES[s.name] = s;
const loaded = {};
const load = async (family, style) => {
  const k = `${family}|${style}`;
  if (k in loaded) return loaded[k];
  const tries = [[family, style], [family, style.replace(" Italic", "")], [family, "Regular"], ["Inter", "Regular"]];
  for (const [f, s] of tries) { try { await figma.loadFontAsync({ family: f, style: s }); loaded[k] = { family: f, style: s }; return loaded[k]; } catch (e) {} }
  loaded[k] = { family: "Inter", style: "Regular" }; return loaded[k];
};
const WEIGHT = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
const fontStyle = (ff, fw, it) => {
  if (ff === "Space Mono") return fw >= 600 ? (it ? "Bold Italic" : "Bold") : it ? "Italic" : "Regular";
  if (ff === "Lora") { const w = fw >= 600 ? "SemiBold" : fw >= 500 ? "Medium" : "Regular"; return it ? (w === "Regular" ? "Italic" : `${w} Italic`) : w; }
  let w = WEIGHT[Math.round(fw / 100) * 100] || "Regular";
  if (ff === "DM Sans" && w === "Bold") w = "SemiBold";
  return it ? (w === "Regular" ? "Italic" : `${w} Italic`) : w;
};
await load("Inter", "Regular");

/* a paint, an effect, bound to its variable */
const paint = (pal, i) => {
  const e = pal[i]; if (!e) return null;
  const v = varFor(e);
  const base = { type: "SOLID", color: rgb(e[1]), opacity: rgba(e[1]).a };
  if (!v) return base;
  const p = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: rgb(e[1]), opacity: 1 }, "color", v);
  return p;
};

/* the page's section for editable screens: under the picture gallery */
const SEC_NAME = "Screens, editable (from the demo, Nov 12)";
let sec = page.children.find((n) => n.type === "SECTION" && n.name === SEC_NAME);
if (!sec) {
  sec = figma.createSection(); sec.name = SEC_NAME;
  const others = page.children.filter((n) => n !== sec);
  const bottom = others.reduce((m, n) => Math.max(m, n.y + n.height), 0);
  const left = others.reduce((m, n) => Math.min(m, n.x), others.length ? Infinity : 0);
  sec.x = Number.isFinite(left) ? left : 0; sec.y = bottom + 400; sec.resizeWithoutConstraints(1000, 1000);
}

const GAP = 48, PAIR_GAP = 120, PAD = 80;
const built = [], problems = [];
for (const car of carriers) {
  const t1 = Date.now();
  let J;
  try {
    const parts = car.findAll((n) => n.type === "TEXT").sort((a, b) => (a.name < b.name ? -1 : 1));
    J = JSON.parse(b64(parts.map((t) => t.characters).join("")));
  } catch (e) { problems.push(`${car.name}: unreadable (${String(e).slice(0, 80)})`); continue; }
  const pal = J.pal, ts = J.ts;
  /* fonts and styles for this screen */
  for (const s of ts) { s.font = await load(s.ff, fontStyle(s.ff, s.fw, s.it)); if (s.name && STYLES[s.name]) await load(STYLES[s.name].fontName.family, STYLES[s.name].fontName.style); }
  let nodes = 0;
  const build = async (n, parent, px, py) => {
    nodes++;
    if (n.k === "t") {
      const t = figma.createText();
      parent.appendChild(t);
      t.name = n.n;
      const chars = n.sg.map((r) => r[0]).join("");
      t.fontName = ts[n.sg[0][1]].font;
      t.characters = chars;
      let at = 0;
      for (const [txt, si, ci] of n.sg) {
        const s = ts[si], end = at + txt.length;
        if (end > at) {
          const st = s.name && STYLES[s.name];
          if (st) await t.setRangeTextStyleIdAsync(at, end, st.id);
          else {
            t.setRangeFontName(at, end, s.font);
            t.setRangeFontSize(at, end, s.fs);
            const lh = s.lh != null ? s.lh : n.lhAuto;
            if (lh) t.setRangeLineHeight(at, end, { unit: "PIXELS", value: lh });
            if (s.ls) t.setRangeLetterSpacing(at, end, { unit: "PERCENT", value: (s.ls / s.fs) * 100 });
            if (s.tt === "U") t.setRangeTextCase(at, end, "UPPER");
          }
          if (s.td === "U") t.setRangeTextDecoration(at, end, "UNDERLINE");
          if (s.td === "S") t.setRangeTextDecoration(at, end, "STRIKETHROUGH");
          if (ci != null) { const p = paint(pal, ci); if (p) t.setRangeFills(at, end, [p]); }
        }
        at = end;
      }
      if (n.wrap) { t.resize(Math.max(1, n.w), Math.max(1, n.h)); t.textAutoResize = "HEIGHT"; if (n.al === "center") t.textAlignHorizontal = "CENTER"; if (n.al === "right") t.textAlignHorizontal = "RIGHT"; }
      else t.textAutoResize = "WIDTH_AND_HEIGHT";
      t.x = n.x - px; t.y = n.y - py;
      /* a single line keeps its place: centre it on the box the browser drew, so a slightly wider face doesn't drift */
      if (!n.wrap && Math.abs(t.width - n.w) > 1) t.x = n.x - px + (n.w - t.width) / 2;
      return t;
    }
    if (n.k === "s") {
      let f;
      try { f = figma.createNodeFromSvg(n.svg); } catch (e) { f = figma.createFrame(); f.fills = []; problems.push(`${J.id}: svg ${n.n}`); }
      parent.appendChild(f);
      f.name = n.n; f.x = n.x - px; f.y = n.y - py;
      if (Math.abs(f.width - n.w) > 0.5 || Math.abs(f.height - n.h) > 0.5) f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
      f.fills = []; f.clipsContent = false;
      const sc = n.sc || {};
      const keyOf = (p) => { const c = p.color, h = (x) => Math.round(x * 255).toString(16).padStart(2, "0").toUpperCase(); return "#" + h(c.r) + h(c.g) + h(c.b) + h(p.opacity == null ? 1 : p.opacity); };
      for (const v of f.findAll(() => true)) {
        for (const prop of ["fills", "strokes"]) {
          if (!(prop in v) || v[prop] === figma.mixed || !v[prop].length) continue;
          const next = v[prop].map((p) => { if (p.type !== "SOLID") return p; const i = sc[keyOf(p)]; return i != null ? paint(pal, i) || p : p; });
          v[prop] = next;
        }
      }
      return f;
    }
    if (n.k === "i") {
      const r = figma.createRectangle();
      parent.appendChild(r);
      r.name = n.n; r.x = n.x - px; r.y = n.y - py; r.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
      const v = VARS["App colour::surface/card-2"];
      r.fills = v ? [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }, "color", v)] : [];
      if (n.r != null) { if (Array.isArray(n.r)) [r.topLeftRadius, r.topRightRadius, r.bottomRightRadius, r.bottomLeftRadius] = n.r; else r.cornerRadius = n.r; }
      return r;
    }
    const f = figma.createFrame();
    parent.appendChild(f);
    f.name = n.n;
    f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
    f.x = n.x - px; f.y = n.y - py;
    f.fills = n.f != null ? [paint(pal, n.f)].filter(Boolean) : [];
    f.clipsContent = !!n.cl;
    if (n.r != null) { if (Array.isArray(n.r)) [f.topLeftRadius, f.topRightRadius, f.bottomRightRadius, f.bottomLeftRadius] = n.r; else f.cornerRadius = n.r; }
    if (n.s && n.s[0] != null) { const p = paint(pal, n.s[0]); if (p) { f.strokes = [p]; f.strokeWeight = n.s[1]; f.strokeAlign = "INSIDE"; } }
    else if (n.sd) {
      const first = n.sd.find(Boolean);
      const p = first && paint(pal, first[0]);
      if (p) { f.strokes = [p]; f.strokeAlign = "INSIDE"; f.strokeTopWeight = n.sd[0] ? n.sd[0][1] : 0; f.strokeRightWeight = n.sd[1] ? n.sd[1][1] : 0; f.strokeBottomWeight = n.sd[2] ? n.sd[2][1] : 0; f.strokeLeftWeight = n.sd[3] ? n.sd[3][1] : 0; }
    }
    if (n.e) {
      f.effects = n.e.map(([ci, x, y, b, s, inset]) => {
        const e = pal[ci]; if (!e) return null;
        const eff = { type: inset ? "INNER_SHADOW" : "DROP_SHADOW", color: rgba(e[1]), offset: { x, y }, radius: b, spread: s, visible: true, blendMode: "NORMAL" };
        const v = varFor(e);
        return v ? figma.variables.setBoundVariableForEffect(eff, "color", v) : eff;
      }).filter(Boolean);
    }
    if (n.o != null) f.opacity = n.o;
    for (const c of n.c || []) await build(c, f, n.x, n.y);
    return f;
  };
  /* the screen: the tree's root is the phone's screen, 390 wide */
  const root = figma.createFrame();
  sec.appendChild(root);
  root.name = `${J.name} / Light`;
  root.resize(J.w, J.h);
  root.clipsContent = true;
  root.fills = J.tree.f != null ? [paint(pal, J.tree.f)] : [];
  try {
    for (const c of J.tree.c || []) await build(c, root, J.tree.x, J.tree.y);
  } catch (e) { problems.push(`${J.id}: ${String(e).slice(0, 160)}`); root.remove(); continue; }
  root.setExplicitVariableModeForCollection(APP, LIGHT);
  const dark = root.clone();
  sec.appendChild(dark);
  dark.name = `${J.name} / Dark`;
  dark.setExplicitVariableModeForCollection(APP, DARK);
  /* place the pair after what the section holds: one row, in the order they were built */
  const items = sec.children.filter((n) => n !== root && n !== dark);
  const right = items.reduce((m, n) => Math.max(m, n.x + n.width), 0);
  root.x = items.length ? right + PAIR_GAP : PAD; root.y = PAD;
  dark.x = root.x + J.w + GAP; dark.y = PAD;
  const maxH = sec.children.reduce((m, n) => Math.max(m, n.y + n.height), 0);
  sec.resizeWithoutConstraints(Math.max(sec.width, dark.x + J.w + PAD), Math.max(sec.height, maxH + PAD));
  car.remove();
  built.push({ id: J.id, light: root.id, dark: dark.id, nodes, ms: Date.now() - t1 });
  if (Date.now() - T0 > 45000) break;
}
const left = page.children.filter((n) => n.type === "FRAME" && n.children.some((c) => c.name === "florin-data")).length;
return { section: sec.id, built, left, created, problems, ms: Date.now() - T0 };
