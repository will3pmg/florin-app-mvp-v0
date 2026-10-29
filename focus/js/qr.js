/* Florin focus group test: a small QR code encoder, so a laptop can show the study's link to a phone camera without
   any outside script. Byte mode, error correction M, versions 1 to 10 (up to 213 bytes), the standard masks and
   penalty rules (ISO/IEC 18004), after Project Nayuki's reference implementation (MIT). FXQR.svg(text) returns an SVG
   whose dark modules take currentColor, on a light ground the page sets. window.FXQR */
(function () {
  const ECC = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26]; /* error correction codewords per block, level M, v1 to v10 */
  const BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC[v - 1] * BLOCKS[v - 1];
  const bit = (x, i) => ((x >>> i) & 1) !== 0;

  /* ---------- Reed-Solomon over GF(256), polynomial 0x11D ---------- */
  function mul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; }
  function divisor(deg) {
    const r = new Array(deg).fill(0); r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      root = mul(root, 0x02);
    }
    return r;
  }
  function remainder(data, div) {
    const r = div.map(() => 0);
    data.forEach((b) => { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => (r[i] ^= mul(c, f))); });
    return r;
  }

  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    let v = 1;
    for (; v <= 10; v++) { const cap = dataCodewords(v) * 8, need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8; if (need <= cap) break; }
    if (v > 10) throw new Error("FXQR: text too long");
    /* the bit stream: byte mode, the count, the bytes, the terminator, padding */
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
    const cap = dataCodewords(v) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) put(p, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    /* blocks and their error correction, interleaved */
    const nb = BLOCKS[v - 1], el = ECC[v - 1], raw = Math.floor(rawModules(v) / 8);
    const nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = divisor(el);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = remainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) all.push(b[i]); });

    /* the grid */
    const size = v * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const setF = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const al = ALIGN[v - 1], na = al.length;
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const drawFormat = (mask) => {
      const d = (0 << 3) | mask; /* level M is 00 */
      let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) setF(8, i, bit(b, i));
      setF(8, 7, bit(b, 6)); setF(8, 8, bit(b, 7)); setF(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(b, i));
      setF(8, size - 8, true);
    };
    drawFormat(0);
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), c = Math.floor(i / 3); setF(a, c, bit(b, i)); setF(c, a, bit(b, i)); }
    }
    /* the data, in the zigzag */
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && i < all.length * 8) { m[y][x] = bit(all[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
    /* the mask with the lowest penalty */
    const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
    const apply = (k) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[k](x, y)) m[y][x] = !m[y][x]; };
    const penalty = () => {
      let p = 0;
      const line = (get) => {
        for (let a = 0; a < size; a++) {
          let run = 1;
          for (let b = 1; b < size; b++) { if (get(a, b) === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
          for (let b = 0; b + 10 < size + 4; b++) {
            const s = (k) => (b + k < 0 || b + k >= size ? false : get(a, b + k));
            const pat = [true, false, true, true, true, false, true];
            const core = pat.every((q, k) => s(k) === q);
            if (core && ((!s(-1) && !s(-2) && !s(-3) && !s(-4)) || (!s(7) && !s(8) && !s(9) && !s(10)))) p += 40;
          }
        }
      };
      line((a, b) => m[a][b]);
      line((a, b) => m[b][a]);
      for (let y = 0; y + 1 < size; y++) for (let x = 0; x + 1 < size; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
      let dark = 0; m.forEach((r) => r.forEach((c) => (dark += c ? 1 : 0)));
      const tot = size * size;
      p += Math.max(0, Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let k = 0; k < 8; k++) { apply(k); drawFormat(k); const p = penalty(); if (p < bestP) { bestP = p; best = k; } apply(k); }
    apply(best); drawFormat(best);
    return { size, m };
  }

  function svg(text, o = {}) {
    const { size, m } = encode(text), q = 4, n = size + q * 2;
    let d = "";
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x]) d += `M${x + q} ${y + q}h1v1h-1z`;
    return `<svg class="${o.cls || "fx-qr"}" viewBox="0 0 ${n} ${n}" role="img" aria-label="${o.label || "QR code of the study's link"}" shape-rendering="crispEdges"><rect class="fx-qr-bg" width="${n}" height="${n}"/><path class="fx-qr-fg" d="${d}"/></svg>`;
  }

  window.FXQR = { encode, svg };
})();
