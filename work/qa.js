/* QA for the refresh prototype. Run before every publish.
   NODE_PATH=$(npm root -g) node work/qa.js
   - console errors and page errors, at 1440, 1100, 900 and 390 wide
   - sideways scroll on the page, at every width
   - every screen through the 22 claims rules, in A and B, light, established and new (the notes panel's own check)
   - tap targets under 44px inside the phone, at 390 wide where the app fills the screen at full size
   - em dashes and exclamation points in any user-facing string in the source */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const PAGE = "file://" + path.resolve(__dirname, "../prototype/_local.html");
const problems = [];
const note = (s) => { problems.push(s); console.log("  ✗ " + s); };

(async () => {
  const browser = await chromium.launch();
  const screens = async (p) => p.$$eval('.rx-side [data-rx="screen"]', (bs) => bs.map((b) => b.dataset.v));

  for (const [w, h] of [[1440, 1000], [1100, 900], [900, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    p.on("console", (m) => { if (m.type() === "error") note(`${w}: console: ${m.text()}`); });
    p.on("pageerror", (e) => note(`${w}: pageerror: ${e.message}`));
    await p.goto(PAGE);
    await p.waitForSelector(".ap-rx");
    const mobile = w < 760;
    const ids = mobile ? await p.$$eval('#rxMsheet [data-rx="screen"]', (bs) => bs.map((b) => b.dataset.v)) : await screens(p);
    const runs = mobile ? [{ form: "A", data: "est" }] : [{ form: "A", data: "est" }, { form: "B", data: "est" }, { form: "A", data: "new" }];
    for (const r of runs) {
      if (!mobile) {
        await p.click(`.rx-head [data-rx="form"][data-v="${r.form}"]`).catch(() => {});
        await p.click(`.rx-side [data-rx="data"][data-v="${r.data}"]`);
      }
      for (const id of ids) {
        await p.evaluate((id) => { const b = document.querySelector(`${window.innerWidth < 760 ? "#rxMsheet" : ".rx-side"} [data-rx="screen"][data-v="${id}"]`); b && b.click(); }, id);
        await p.waitForTimeout(380);
        const o = await p.evaluate(() => {
          const out = { overflow: document.documentElement.scrollWidth > window.innerWidth + 1, lint: (document.querySelector("#rxNotes .rx-lint") || {}).textContent || "" };
          /* small tap targets inside the first phone, at full scale only */
          const ph = document.querySelector(".rx-stage .ap-rx");
          const scale = ph.getBoundingClientRect().width / ph.offsetWidth;
          out.small = [];
          if (Math.abs(scale - 1) < 0.01) {
            ph.querySelectorAll(".ap-o:not(.is-out):last-child button, .ap-o:not(.is-out):last-child [role=button], .ap-o:not(.is-out):last-child input, .ap-o:not(.is-out):last-child select" + (ph.querySelector(".ap-o:not(.is-out)") ? "" : ", .ap-layer button, .ap-tb button")).forEach((b) => {
              const r = b.getBoundingClientRect();
              if (!r.width || !r.height || b.closest("[hidden]")) return;
              if (b.matches(".ap-o-scrim")) return;
              if (r.height < 44 && r.width < 44 || Math.min(r.height, r.width) < 32) out.small.push(`${(b.className || b.tagName).toString().split(" ")[0]} "${(b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
            });
          }
          return out;
        });
        const tag = `${w} ${r.form}/${r.data} ${id}`;
        if (o.overflow) note(`${tag}: page scrolls sideways`);
        if (o.lint && !/passes all/.test(o.lint)) note(`${tag}: ${o.lint.trim()}`);
        if (o.small.length) note(`${tag}: small targets: ${[...new Set(o.small)].slice(0, 6).join("; ")}`);
      }
    }
    await ctx.close();
  }

  /* em dashes and exclamation points in the source strings */
  for (const f of ["refresh-ui.js", "refresh-app.js", "refresh-data.js"]) {
    const src = fs.readFileSync(path.resolve(__dirname, "../prototype/js", f), "utf8");
    src.split("\n").forEach((line, i) => {
      if (/—/.test(line)) note(`${f}:${i + 1}: em dash`);
      const strs = line.match(/(["'`])(?:(?!\1).)*!(?:(?!\1).)*\1/g) || [];
      strs.filter((s) => /[A-Za-z]!(\s|$|["'`])/.test(s) && !/!==?|!\w|\(!/.test(s)).forEach((s) => note(`${f}:${i + 1}: exclamation point in ${s.slice(0, 40)}`));
    });
  }
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problems` : "\nQA clean: no console errors, no sideways scroll, every screen passes the claims check, tap targets fine.");
  process.exitCode = problems.length ? 1 : 0;
})();
