// Builds the Dipasaria logo system from geometry + the Plus Jakarta Sans font.
// Outputs: src/components/brand/paths.ts (used by <Logo/>, <Emblem/>, <Seal/>) and SVG files in public/brand + public/icons.
// Run: npm run brand   (then `node scripts/export-brand.cjs` for the PNGs)
const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");

const ROOT = path.resolve(__dirname, "../..");
const fontFile = (w) => path.join(ROOT, `node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff`);
const load = (w) => opentype.parse(new Uint8Array(fs.readFileSync(fontFile(w))).buffer);
const F800 = load(800);
const F700 = load(700);

const C = { black: "#000000", cream: "#FAF8F4", parchment: "#EEE7DA", gold: "#EAB200", deep: "#C09200" };
const r2 = (n) => Math.round(n * 100) / 100;

// ---------- Emblem geometry (viewBox 0 0 120 123) ----------
// Market basket (keranjang lelang): rim + tapered body as one outline, four slots cut out (even-odd).
const slot = (x) => `M${x + 3} 73A3 3 0 0 1 ${x + 6} 76V90A3 3 0 0 1 ${x} 90V76A3 3 0 0 1 ${x + 3} 73Z`;
const BASKET = "M21 55H99A6 6 0 0 1 99 67H96.74L90 93Q88 101 80 101H40Q32 101 30 93L23.26 67H21A6 6 0 0 1 21 55Z" + [42, 52, 62, 72].map(slot).join("");
// Snapper leaping out of the basket; gill cut out (even-odd). Drawn pointing right, placed with FISH_TRANSFORM.
const FISH = "M34 0C30 -6 22 -12 10 -13C-2 -14 -14 -10 -24 -3L-27 -1.6L-41 -12.5Q-35.5 0 -41 12.5L-27 1.6C-14 9 0 12 12 11C22 10 30 6 34 0Z"
  + "M16.1 -9.8Q12.2 0 16.1 9.3A0.9 0.9 0 0 0 17.75 8.75Q14.05 0 17.75 -9.25A0.9 0.9 0 0 0 16.1 -9.8Z";
const FIN = "M-3 -13.4C1 -22.5 10 -23 15 -12.6Z";
const FISH_TRANSFORM = "translate(57 35) rotate(-28)";
const EYE = { cx: 24, cy: -3.2, r: 2.5 };
// The "senyum": a gold arc under the basket — the sea, and the service.
const SMILE = "M35 106Q60 119 85 106";
const SMILE_WIDTH = 7.5;

const VARIANTS = {
  color: { basket: C.black, fish: C.gold, eye: C.black, smile: C.deep },
  reversed: { basket: C.cream, fish: C.gold, eye: C.black, smile: C.gold },
  black: { basket: C.black, fish: C.black, eye: null, smile: C.black },
  cream: { basket: C.cream, fish: C.cream, eye: null, smile: C.cream },
  gold: { basket: C.black, fish: C.black, eye: null, smile: C.black, bg: C.gold },
};

function emblemSvgInner(v) {
  const eye = v.eye
    ? `<circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${v.eye}"/>`
    : "";
  // In one-colour versions the eye is a hole: draw it as an even-odd subpath of the fish.
  const fishPath = v.eye ? FISH : FISH + `M${EYE.cx + EYE.r} ${EYE.cy}A${EYE.r} ${EYE.r} 0 1 0 ${EYE.cx - EYE.r} ${EYE.cy}A${EYE.r} ${EYE.r} 0 1 0 ${EYE.cx + EYE.r} ${EYE.cy}Z`;
  return `<g transform="${FISH_TRANSFORM}" fill="${v.fish}"><path fill-rule="evenodd" d="${fishPath}"/><path d="${FIN}"/>${eye}</g>`
    + `<path fill-rule="evenodd" fill="${v.basket}" d="${BASKET}"/>`
    + `<path d="${SMILE}" fill="none" stroke="${v.smile}" stroke-width="${SMILE_WIDTH}" stroke-linecap="round"/>`;
}

// ---------- Type to outlines ----------
function run(font, text, size, x0, y, track) {
  let x = x0;
  const parts = [];
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    parts.push(g.getPath(x, y, size).toPathData(2));
    x += (g.advanceWidth * size) / font.unitsPerEm + track;
    if (glyphs[i + 1]) x += (font.getKerningValue(g, glyphs[i + 1]) * size) / font.unitsPerEm;
  });
  return { d: parts.join(""), end: x - track };
}
const WS = 100;
const WTRACK = -2.2;
const dipa = run(F800, "Dipa", WS, 0, 0, WTRACK);
const saria = run(F800, "saria", WS, dipa.end + WTRACK, 0, WTRACK);
const WORD = { dipa: dipa.d, saria: saria.d, width: r2(saria.end), cap: r2((F800.tables.os2.sCapHeight * WS) / F800.unitsPerEm), desc: 22.2 };
const TAG_TEXT = "SEGAR & TERPILIH";
const tag = run(F700, TAG_TEXT, 15, 0, 0, 15 * 0.34);
const TAG = { d: tag.d, width: r2(tag.end), cap: r2((F700.tables.os2.sCapHeight * 15) / F700.unitsPerEm) };

// Ring text for the seal: glyphs placed along a circle.
function ring(font, text, size, cx, cy, radius, track, startDeg) {
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  const adv = glyphs.map((g) => (g.advanceWidth * size) / font.unitsPerEm);
  const total = adv.reduce((a, b) => a + b, 0) + track * glyphs.length;
  const circumference = 2 * Math.PI * radius;
  const extra = (circumference - total) / glyphs.length; // spread evenly round the full circle
  // Centre the first word on the top of the circle.
  const firstWord = text.indexOf(" ");
  const span = adv.slice(0, firstWord).reduce((a, b) => a + b, 0) + (track + extra) * (firstWord - 1);
  startDeg += -((span / circumference) * 360) / 2;
  let s = 0;
  const out = [];
  glyphs.forEach((g, i) => {
    const mid = s + adv[i] / 2;
    const ang = startDeg + (mid / circumference) * 360;
    const p = g.getPath(-adv[i] / 2, 0, size).toPathData(2);
    if (p) out.push(`<path transform="translate(${cx} ${cy}) rotate(${r2(ang)}) translate(0 ${-radius})" d="${p}"/>`);
    s += adv[i] + track + extra;
  });
  return out.join("");
}

// ---------- Lockups ----------
const lockups = {};
function horizontal(v, withTag) {
  // emblem 120x123 at left; wordmark cap height 52; optional tagline under it
  const s = 52 / WORD.cap;
  const wx = 136;
  const ww = WORD.width * s;
  const base = withTag ? 74 : 88;
  const word = `<g transform="translate(${wx} ${base}) scale(${r2(s)})"><path fill="${v.word}" d="${WORD.dipa}"/><path fill="${v.accent}" d="${WORD.saria}"/></g>`;
  let tagSvg = "";
  if (withTag) {
    const ts = (ww * 0.62) / TAG.width;
    const tw = TAG.width * ts;
    const rule = (ww - tw) / 2 - 10;
    const ty = 108;
    const mid = ty - (TAG.cap * ts) / 2;
    tagSvg = `<rect x="${wx}" y="${r2(mid - 1)}" width="${r2(rule)}" height="2" fill="${v.rule}"/><rect x="${r2(wx + ww - rule)}" y="${r2(mid - 1)}" width="${r2(rule)}" height="2" fill="${v.rule}"/>`
      + `<g transform="translate(${r2(wx + rule + 10)} ${ty}) scale(${r2(ts)})"><path fill="${v.tag}" d="${TAG.d}"/></g>`;
  }
  const w = Math.ceil(wx + ww + 2);
  return { w, h: 123, inner: emblemSvgInner(v.emblem) + word + tagSvg };
}
function stacked(v) {
  const W = 460;
  const es = 1.75;
  const ew = 120 * es;
  const emblem = `<g transform="translate(${r2((W - ew) / 2)} 0) scale(${es})">${emblemSvgInner(v.emblem)}</g>`;
  const wx = (W - WORD.width) / 2;
  const base = 123 * es + 26 + WORD.cap;
  const word = `<g transform="translate(${r2(wx)} ${r2(base)})"><path fill="${v.word}" d="${WORD.dipa}"/><path fill="${v.accent}" d="${WORD.saria}"/></g>`;
  const ts = 1.45;
  const tw = TAG.width * ts;
  const ty = base + WORD.desc + 40;
  const mid = ty - (TAG.cap * ts) / 2;
  const rule = (WORD.width - tw) / 2 - 16;
  const tagSvg = `<rect x="${r2(wx)}" y="${r2(mid - 1.5)}" width="${r2(rule)}" height="3" fill="${v.rule}"/><rect x="${r2(wx + WORD.width - rule)}" y="${r2(mid - 1.5)}" width="${r2(rule)}" height="3" fill="${v.rule}"/>`
    + `<g transform="translate(${r2(wx + rule + 16)} ${r2(ty)}) scale(${ts})"><path fill="${v.tag}" d="${TAG.d}"/></g>`;
  return { w: W, h: Math.ceil(ty + 6), inner: emblem + word + tagSvg };
}
const LIGHT = { emblem: VARIANTS.color, word: C.black, accent: C.deep, tag: C.black, rule: C.deep };
const DARK = { emblem: VARIANTS.reversed, word: C.cream, accent: C.gold, tag: C.cream, rule: C.gold };
const MONO = { emblem: VARIANTS.black, word: C.black, accent: C.black, tag: C.black, rule: C.black };

// Seal: emblem in the centre, outlined ring text, double rule.
function seal(color, ink) {
  const text = "DIPASARIA · SEGAR & TERPILIH · MUARA BARU · JAKARTA · ";
  const ringText = ring(F700, text, 13, 100, 100, 70, 1.2, 0);
  const em = `<g transform="translate(58 55) scale(0.7)">${emblemSvgInner({ basket: color, fish: color, eye: null, smile: color })}</g>`;
  return {
    w: 200, h: 200,
    inner: `<circle cx="100" cy="100" r="96" fill="${ink}"/><circle cx="100" cy="100" r="92" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="100" cy="100" r="86" fill="none" stroke="${color}" stroke-width="0.6"/><circle cx="100" cy="100" r="58" fill="none" stroke="${color}" stroke-width="0.8"/><g fill="${color}">${ringText}</g>${em}`,
  };
}

const svg = ({ w, h, inner }, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${inner}</svg>\n`;
const write = (rel, content) => { fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), content); console.log("wrote", rel); };

// Emblems
write("public/brand/emblem.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.color) }));
write("public/brand/emblem-reversed.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.reversed) }, C.black));
write("public/brand/emblem-black.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.black) }));
write("public/brand/emblem-cream.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.cream) }, C.black));
// Lockups
write("public/brand/logo-horizontal.svg", svg(horizontal(LIGHT, false)));
write("public/brand/logo-horizontal-tagline.svg", svg(horizontal(LIGHT, true)));
write("public/brand/logo-horizontal-reversed.svg", svg(horizontal(DARK, true), C.black));
write("public/brand/logo-stacked.svg", svg(stacked(LIGHT)));
write("public/brand/logo-stacked-reversed.svg", svg(stacked(DARK), C.black));
write("public/brand/logo-stacked-black.svg", svg(stacked(MONO)));
write("public/brand/seal.svg", svg(seal(C.gold, C.black)));
write("public/brand/seal-black.svg", svg(seal(C.black, "none")));
// Pattern tile: "sisik" scales — read as fish scales and as waves.
const scale = (cx, cy) => [18, 12.5, 7].map((r) => `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`).join("");
write("public/brand/pattern-sisik.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20" width="40" height="20"><g fill="none" stroke="${C.gold}" stroke-width="1">${scale(0, 20)}${scale(40, 20)}${scale(20, 10)}${scale(0, 0)}${scale(40, 0)}</g></svg>\n`);
write("public/brand/pattern-sisik-ink.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20" width="40" height="20"><g fill="none" stroke="${C.black}" stroke-width="1">${scale(0, 20)}${scale(40, 20)}${scale(20, 10)}${scale(0, 0)}${scale(40, 0)}</g></svg>\n`);
// App icon: black tile, reversed emblem
const icon = (pad, rx) => {
  const s = (64 - pad * 2) / 123;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rx}" fill="${C.black}"/><g transform="translate(${r2(32 - 60 * s)} ${r2(pad)}) scale(${r2(s)})">${emblemSvgInner(VARIANTS.reversed)}</g></svg>\n`;
};
write("public/icons/icon.svg", icon(9, 13));
write("public/brand/icon-maskable.svg", icon(15, 0));

// Path constants for React components
const ts = `// Generated by scripts/brand/build.cjs — do not edit by hand.
export const EMBLEM = ${JSON.stringify({ basket: BASKET, fish: FISH, fin: FIN, fishTransform: FISH_TRANSFORM, eye: EYE, smile: SMILE, smileWidth: SMILE_WIDTH, viewBox: "0 0 120 123" })} as const;
export const WORDMARK = ${JSON.stringify({ dipa: WORD.dipa, saria: WORD.saria, width: WORD.width, cap: WORD.cap, desc: WORD.desc })} as const;
export const TAGLINE = ${JSON.stringify({ text: TAG_TEXT, d: TAG.d, width: TAG.width, cap: TAG.cap })} as const;
export const SEAL_RING = ${JSON.stringify(ring(F700, "DIPASARIA · SEGAR & TERPILIH · MUARA BARU · JAKARTA · ", 13, 100, 100, 70, 1.2, 0))};
`;
write("src/components/brand/paths.ts", ts);
