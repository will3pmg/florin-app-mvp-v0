/* Renders the home screen icons from icons/icon.svg and icons/icon-maskable.svg with Playwright's Chromium:
   apple-touch-icon 180, the manifest's 192 and 512, and a maskable 512. Run: NODE_PATH=$(npm root -g) node focus/tools/make-icons.js */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "icons");
(async () => {
  const b = await chromium.launch();
  const jobs = [["icon.svg", 180, "apple-touch-icon.png"], ["icon.svg", 192, "icon-192.png"], ["icon.svg", 512, "icon-512.png"], ["icon-maskable.svg", 512, "icon-maskable-512.png"], ["icon.svg", 32, "favicon-32.png"]];
  for (const [src, px, out] of jobs) {
    const pg = await b.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    const svg = fs.readFileSync(path.join(dir, src), "utf8");
    await pg.setContent(`<html><body style="margin:0">${svg.replace("<svg ", `<svg width="${px}" height="${px}" `)}</body></html>`);
    await pg.screenshot({ path: path.join(dir, out), clip: { x: 0, y: 0, width: px, height: px }, omitBackground: false });
    await pg.close();
    console.log(out, px);
  }
  await b.close();
})();
