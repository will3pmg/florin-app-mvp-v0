/* Florin Brand Studio: small shared helpers */
(function () {
  const FL = (window.FL = window.FL || {});

  FL.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Logo as inline SVG. tone: orig | rev | mono-forest | mono-cream | mono-ray | current
     mark: true crops to the symbol only. Colors come from CSS classes so they can animate. */
  FL.logo = (id, opts = {}) => {
    /* id "brand" resolves to whichever mark is currently set in the studio, and the
       element is tagged so a change in the Logo lab can swap it in place. */
    const isBrand = id === "brand";
    if (isBrand) id = (window.FLTheme && window.FLTheme.logoId()) || "f01";
    const L = (window.FLORIN_LOGO_SVG || {})[id];
    if (!L) return "";
    const tone = opts.tone || "orig";
    const vb = opts.mark ? L.box.join(" ") : `0 0 ${L.w} ${L.h}`;
    const cls = `lg lg--${tone}${opts.mark ? " lg--mark" : ""}${opts.cls ? " " + opts.cls : ""}`;
    const label = opts.label || (opts.mark ? "Florin mark" : "florin");
    const style = opts.style ? ` style="${opts.style}"` : "";
    const brand = isBrand ? ` data-lg-brand="${FL.esc(JSON.stringify(opts))}"` : "";
    return `<svg class="${cls}" viewBox="${vb}" role="img" aria-label="${FL.esc(label)}"${style}${brand} preserveAspectRatio="xMidYMid meet">${L.svg}</svg>`;
  };

  /* Relative luminance + WCAG contrast */
  FL.lum = (hex) => {
    const h = hex.replace("#", "");
    const c = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  FL.contrast = (a, b) => {
    const x = FL.lum(a), y = FL.lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  FL.grade = (r) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA Large" : "Fail");

  FL.reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  FL.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  FL.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("florin-studio:" + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("florin-studio:" + k, JSON.stringify(v));
      } catch (e) {}
    },
    del(k) {
      try {
        localStorage.removeItem("florin-studio:" + k);
      } catch (e) {}
    }
  };

  /* Tiny single-series horizontal bar chart (value at tip, hover tooltip, table fallback) */
  FL.bars = (rows, o = {}) => {
    const max = o.max || Math.max(...rows.map((r) => r.value));
    const fmt = o.fmt || ((v) => v);
    const id = "b" + Math.random().toString(36).slice(2, 8);
    const body = rows
      .map(
        (r, i) => `<div class="bars-row${r.hi ? " is-hi" : ""}" data-tip="${FL.esc(r.name)}: ${FL.esc(fmt(r.value))}${r.note ? " · " + FL.esc(r.note) : ""}" style="--i:${i}">
        <span class="bars-name">${FL.esc(r.name)}</span>
        <span class="bars-track"><span class="bars-fill" style="--w:${Math.max(0, Math.min(100, (r.value / max) * 100))}%"></span><span class="bars-val">${FL.esc(fmt(r.value))}</span></span>
      </div>`
      )
      .join("");
    const table = `<details class="bars-table"><summary>View as table</summary><table><thead><tr><th>${FL.esc(o.nameCol || "Item")}</th><th>${FL.esc(o.valCol || "Value")}</th></tr></thead><tbody>${rows
      .map((r) => `<tr><td>${FL.esc(r.name)}</td><td>${FL.esc(fmt(r.value))}</td></tr>`)
      .join("")}</tbody></table></details>`;
    return `<figure class="bars" id="${id}">${o.title ? `<figcaption class="bars-title">${FL.esc(o.title)}</figcaption>` : ""}<div class="bars-body">${body}</div>${o.table === false ? "" : table}</figure>`;
  };

  /* ---------------- Color math (sRGB <-> OKLab), mirrors the CSS relative-color derivations ----------------
     FL.derive("#00352B", .42, .5) is the JS twin of
     oklch(from var(--forest) calc(l + .42) calc(c * .5) h). */
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const cbrt = (x) => (x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3));

  FL.hexToRgb = (hex) => {
    let h = String(hex || "").trim().replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  FL.rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  FL.okFromHex = (hex) => {
    const rgb = FL.hexToRgb(hex);
    if (!rgb) return null;
    const [r, g, b] = rgb.map((v) => toLin(v / 255));
    const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const Bc = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { l: L, c: Math.hypot(A, Bc), h: ((Math.atan2(Bc, A) * 180) / Math.PI + 360) % 360 };
  };
  FL.okToHex = ({ l, c, h }) => {
    const hr = (h * Math.PI) / 180;
    const A = Math.cos(hr) * c, Bc = Math.sin(hr) * c;
    const l_ = Math.pow(l + 0.3963377774 * A + 0.2158037573 * Bc, 3);
    const m_ = Math.pow(l - 0.1055613458 * A - 0.0638541728 * Bc, 3);
    const s_ = Math.pow(l - 0.0894841775 * A - 1.291485548 * Bc, 3);
    const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
    const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
    return FL.rgbToHex(clamp01(toSrgb(r)) * 255, clamp01(toSrgb(g)) * 255, clamp01(toSrgb(b)) * 255);
  };
  FL.derive = (hex, dl, cx) => {
    const o = FL.okFromHex(hex);
    if (!o) return hex;
    return FL.okToHex({ l: Math.max(0, Math.min(1, o.l + (dl || 0))), c: Math.max(0, o.c * (cx == null ? 1 : cx)), h: o.h });
  };
  FL.rgbText = (hex) => {
    const rgb = FL.hexToRgb(hex);
    return rgb ? rgb.join(" ") : "";
  };
  FL.readable = (hex, dark, light) => (FL.contrast(hex, dark) >= FL.contrast(hex, light) ? dark : light);

})();
