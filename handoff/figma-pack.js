/* Packs handoff/figma-builder.js into a carrier SVG (base64 in <text> chunks), for upload_assets, so the builder lives
   in the Figma file and each use_figma call only loads and runs it.
   node handoff/figma-pack.js <out.svg> */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "figma-builder.js"), "utf8");
const b64 = Buffer.from(src, "utf8").toString("base64");
const CH = 24000, parts = [];
for (let i = 0; i < b64.length; i += CH) parts.push(b64.slice(i, i + CH));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="${16 + parts.length * 8}" viewBox="0 0 240 ${16 + parts.length * 8}"><g id="florin-builder">${parts.map((s, i) => `<text id="part-${String(i).padStart(3, "0")}" x="0" y="${10 + i * 8}" font-family="Inter" font-size="6">${s}</text>`).join("")}</g></svg>`;
fs.writeFileSync(process.argv[2], svg);
console.log(`${src.length} chars, ${parts.length} parts`);
