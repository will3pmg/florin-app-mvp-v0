# Builds, per Figma page, the use_figma code that lays out one frame per capture (named, labelled, sized to the
# screen), and the upload list (capture file per frame, in the same order). Usage: gen.py <capdir> <outdir>
import json, sys, os
cap, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
idx = json.load(open(os.path.join(cap, 'index.json')))['captures']
PAGES = {'home': ('4:7', 'Home'), 'history': ('4:8', 'History'), 'checkin': ('4:9', 'Check-in'), 'ask': ('4:10', 'Ask Florin'),
         'onboarding': ('4:11', 'Onboarding'), 'membership': ('4:12', 'Membership'), 'logging': ('4:13', 'Logging'),
         'profile': ('4:14', 'Profile and Easy view'), 'easy': ('4:14', 'Profile and Easy view'), 'insights': ('4:15', 'Insights')}
by_page = {}
for c in idx:
    if c.get('error') or not c.get('file') or c['flow'] not in PAGES: continue
    pid, pname = PAGES[c['flow']]
    alt = 'alternative' in c['screenName'] or c['screen'] == 'look-today'
    if alt: pid, pname = '4:16', 'Reference'
    c = dict(c); c['screenName'] = c['screenName'].replace(' (in progress)', '').replace(' (alternative)', '').replace(', alternative)', ')')
    if c['screen'] == 'look-today': c['screenName'] = 'Data style on Today, Score first'
    by_page.setdefault(pid, {'name': pname, 'flows': {}})
    f = by_page[pid]['flows'].setdefault(c['flow'], {'name': c['flowName'], 'screens': {}})
    s = f['screens'].setdefault(c['screen'], {'name': c['screenName'], 'caps': []})
    tall = c.get('tall') and (c.get('tallHeight') or 0) > 860
    h = int(c['tallHeight']) if tall else 844
    label = f"{c['stateName']} · {'Member' if c['plan']=='member' else 'Free'} · {c['theme'].capitalize()}"
    name = f"{c['flowName']} / {c['screenName']} / {c['stateName']} / {'Member' if c['plan']=='member' else 'Free'} / {c['theme'].capitalize()}"
    s['caps'].append({'l': label, 'h': h, 'k': name, 'file': os.path.join(cap, c['tall'] if tall else c['file'])})
JS = r'''
const P = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(P);
await figma.loadFontAsync({ family: "DM Sans", style: "Medium" });
await figma.loadFontAsync({ family: "DM Sans", style: "Regular" });
await figma.loadFontAsync({ family: "Space Mono", style: "Regular" });
for (const n of P.children.slice()) if (n.name === "Screens from the demo" || n.name === "Upload test (to delete)") n.remove();
const ink = { r: 0, g: 53/255, b: 43/255 }, ink2 = { r: 0.28, g: 0.36, b: 0.33 }, ground = { r: 0.976, g: 0.969, b: 0.949 };
const root = figma.createAutoLayout("VERTICAL", { name: "Screens from the demo", itemSpacing: 96 });
root.paddingLeft = root.paddingRight = root.paddingTop = root.paddingBottom = 80;
root.fills = [{ type: "SOLID", color: ground }];
P.appendChild(root); root.x = 0; root.y = 0;
const T = (s, size, style, col, mono) => { const t = figma.createText(); t.fontName = { family: mono ? "Space Mono" : "DM Sans", style }; t.fontSize = size; t.characters = s; t.fills = [{ type: "SOLID", color: col }]; return t; };
const head = figma.createAutoLayout("VERTICAL", { name: "Read this", itemSpacing: 12 });
head.appendChild(T(TITLE, 40, "Medium", ink));
head.appendChild(T(NOTE, 16, "Regular", ink2));
root.appendChild(head);
const ids = [];
for (const fl of DATA) {
  const fs = figma.createAutoLayout("VERTICAL", { name: "Flow / " + fl.n, itemSpacing: 56 });
  fs.appendChild(T(fl.n, 28, "Medium", ink));
  for (const sc of fl.s) {
    const row = figma.createAutoLayout("VERTICAL", { name: "Screen / " + sc.n, itemSpacing: 20 });
    row.appendChild(T(sc.n, 20, "Medium", ink));
    const line = figma.createAutoLayout("HORIZONTAL", { name: "States", itemSpacing: 48 });
    line.counterAxisAlignItems = "MIN";
    for (const c of sc.c) {
      const cell = figma.createAutoLayout("VERTICAL", { name: "State / " + c.l, itemSpacing: 12 });
      const lab = T(c.l.toUpperCase(), 11, "Regular", ink2, true); lab.letterSpacing = { unit: "PERCENT", value: 6 };
      cell.appendChild(lab);
      const fr = figma.createFrame(); fr.name = c.k; fr.resize(390, c.h); fr.cornerRadius = 24; fr.clipsContent = true;
      fr.fills = [{ type: "SOLID", color: { r: 0.93, g: 0.93, b: 0.91 } }];
      fr.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0.2, b: 0.16, a: 0.12 }, offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: "NORMAL" }];
      cell.appendChild(fr); line.appendChild(cell); ids.push(fr.id);
    }
    row.appendChild(line); fs.appendChild(row);
  }
  root.appendChild(fs);
}
return { root: root.id, frames: ids.length, ids };
'''
for pid, pg in by_page.items():
    data, files = [], []
    for fk, f in pg['flows'].items():
        fl = {'n': f['name'], 's': []}
        for sk, s in f['screens'].items():
            fl['s'].append({'n': s['name'], 'c': [{'l': c['l'], 'h': c['h'], 'k': c['k']} for c in s['caps']]})
            files += [c['file'] for c in s['caps']]
        data.append(fl)
    title = (f"{pg['name']}: every screen and state, from the demo" if pid != '4:16' else "Reference: the options Will didn't pick, for comparison only")
    note = ("Pictures of the live demo (Nov 12), one frame per screen, state, plan and theme, named Flow / Screen / State / Plan / Theme. "
            "Behaviour lives in the prototype: https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB. Editable rebuilds replace these frame by frame.")
    code = (f"const PAGE_ID = {json.dumps(pid)};\nconst TITLE = {json.dumps(title)};\nconst NOTE = {json.dumps(note)};\nconst DATA = {json.dumps(data, separators=(',',':'))};\n" + JS)
    safe = pid.replace(':', '-')
    open(os.path.join(out, f'page-{safe}.js'), 'w').write(code)
    json.dump(files, open(os.path.join(out, f'page-{safe}.files.json'), 'w'))
    print(pid, pg['name'], len(files), 'frames', len(code), 'chars')
