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
// Market basket (keranjang lelang): rim + tapered body as one outline; five slim slots and a fine rim line cut out (even-odd).
const slot = (x, w = 4.4) => `M${x + w / 2} 73A${w / 2} ${w / 2} 0 0 1 ${x + w} ${73 + w / 2}V${93 - w / 2}A${w / 2} ${w / 2} 0 0 1 ${x} ${93 - w / 2}V${73 + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} 73Z`;
const BASKET_OUTLINE = "M21 55H99A6 6 0 0 1 99 67H96.74L90.2 92.2Q88 101 79.5 101H40.5Q32 101 29.8 92.2L23.26 67H21A6 6 0 0 1 21 55Z";
const SLOTS = [39.8, 48.4, 57.8, 67.2, 75.8].map((x) => slot(x)).join("");
const RIM_LINE = "M37 60.2H83A0.8 0.8 0 0 1 83 61.8H37A0.8 0.8 0 0 1 37 60.2Z";
const BASKET = BASKET_OUTLINE + SLOTS + RIM_LINE;
const BASKET_SMALL = BASKET_OUTLINE + [42, 52, 62, 72].map((x) => slot(x, 6)).join("");
// Snapper leaping out of the basket: curved body, tapered gill and lateral line cut out (even-odd), a dorsal fin.
// Drawn pointing right, placed with FISH_TRANSFORM; the tail tucks behind the rim.
const FISH_BODY = "M37 0C33 -7 22 -13.5 8 -13.5C-5 -13.5 -16 -8.5 -25 -1.5L-28.5 1.2L-41 -10.5C-40 -2 -38.5 6 -36.5 17.5L-27 5.2C-17 11.5 -4 13.8 9 12.2C21 10.8 31 6.6 37 0Z";
const GILL = "M18.2 -10.6Q13.6 0.5 18.4 10.2Q15.6 0.5 20.2 -10.3Q19.2 -10.9 18.2 -10.6Z";
const LATERAL = "M14 -0.9Q-2 -3.6 -20 2.6Q-2 -1.4 14 0.5Z";
const FISH = FISH_BODY + GILL + LATERAL;
const FISH_SMALL = FISH_BODY + GILL;
const FIN = "M-6 -12.6C-2 -22 9 -24.5 15 -13.4C8 -15.6 1 -14.6 -6 -12.6Z";
const FISH_TRANSFORM = "translate(59 40) rotate(-25) scale(0.86)";
const EYE = { cx: 26, cy: -3.6, r: 2.5 };
const EYE_HOLE = `M${EYE.cx + EYE.r} ${EYE.cy}A${EYE.r} ${EYE.r} 0 1 0 ${EYE.cx - EYE.r} ${EYE.cy}A${EYE.r} ${EYE.r} 0 1 0 ${EYE.cx + EYE.r} ${EYE.cy}Z`;
// "Dipa" (light): a dawn sun rising out of the basket, the 03.00 auction and the transparency of a named catch.
const SUN = "M22 55A38 38 0 0 1 98 55Z";
const SUN_RING = "M23.2 55A36.8 36.8 0 0 1 96.8 55"; // one-colour versions: the sun as an outline
const HALO = "M17.5 55A42.5 42.5 0 0 1 102.5 55";
// The "senyum": a tapered gold crescent under the basket — the sea, and the service.
const SMILE = "M33 104.5Q60 124 87 104.5Q60 109 33 104.5Z";

// sun: fill colour or null (then drawn as an outline ring in `ring`); halo: thin outer arc (omitted at small sizes)
const VARIANTS = {
  color: { sun: C.gold, halo: C.deep, fish: C.black, basket: C.black, smile: C.deep },
  reversed: { sun: C.gold, halo: C.gold, fish: C.black, basket: C.cream, smile: C.gold },
  gold: { sun: C.cream, halo: C.black, fish: C.black, basket: C.black, smile: C.black },
  black: { sun: null, ring: C.black, halo: null, fish: C.black, basket: C.black, smile: C.black },
  cream: { sun: null, ring: C.cream, halo: null, fish: C.cream, basket: C.cream, smile: C.cream },
};

function emblemSvgInner(v, small = false) {
  const sun = v.sun ? `<path fill="${v.sun}" d="${SUN}"/>` : `<path fill="none" stroke="${v.ring}" stroke-width="2.4" d="${SUN_RING}"/>`;
  const halo = v.halo && !small ? `<path fill="none" stroke="${v.halo}" stroke-width="1.3" d="${HALO}"/>` : "";
  // Eye, gill and lateral line are cut out of the fish, so the dawn light shows through them.
  return sun + halo
    + `<g transform="${FISH_TRANSFORM}" fill="${v.fish}"><path fill-rule="evenodd" d="${(small ? FISH_SMALL : FISH) + EYE_HOLE}"/><path d="${FIN}"/></g>`
    + `<path fill-rule="evenodd" fill="${v.basket}" d="${small ? BASKET_SMALL : BASKET}"/>`
    + `<path fill="${v.smile}" d="${SMILE}"/>`;
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
  return { d: parts.join(""), parts, end: x - track };
}
const WS = 100;
const WTRACK = -1.6;
const dipa = run(F700, "Dipa", WS, 0, 0, WTRACK);
const saria = run(F700, "saria", WS, dipa.end + WTRACK, 0, WTRACK);
// Lift the tittle of the "i" in "Dipa" out so it can be set in gold: the one accent that ties the two halves.
function splitTittle(run) {
  const parts = run.parts[1].split(/(?=M)/); // contours of the "i"
  const top = (p) => Math.min(...[...p.matchAll(/-?\d+\.?\d*/g)].map((m) => +m[0]).filter((_, k) => k % 2 === 1));
  const tops = parts.map(top);
  // the tittle is the small contour sitting highest among the lowercase glyphs (the D's top is at cap height, lower than the dot)
  const i = tops.indexOf(Math.min(...tops));
  const i2 = run.parts.slice();
  i2[1] = parts.filter((_, k) => k !== i).join("");
  return { body: i2.join(""), dot: parts[i] };
}
const dipaSplit = splitTittle(dipa);
const WORD = { dipa: dipaSplit.body, dot: dipaSplit.dot, saria: saria.d, width: r2(saria.end), cap: r2((F700.tables.os2.sCapHeight * WS) / F700.unitsPerEm), desc: 22.2 };
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
const wordPaths = (v) => `<path fill="${v.word}" d="${WORD.dipa}"/><path fill="${v.accent}" d="${WORD.dot}"/><path fill="${v.accent}" d="${WORD.saria}"/>`;
function horizontal(v, withTag) {
  // emblem 120x123 at left; wordmark cap height 52; optional tagline under it
  const s = 52 / WORD.cap;
  const wx = 136;
  const ww = WORD.width * s;
  const base = withTag ? 74 : 88;
  const word = `<g transform="translate(${wx} ${base}) scale(${r2(s)})">${wordPaths(v)}</g>`;
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
  const word = `<g transform="translate(${r2(wx)} ${r2(base)})">${wordPaths(v)}</g>`;
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
  const em = `<g transform="translate(58 55) scale(0.7)">${emblemSvgInner({ sun: null, ring: color, halo: null, basket: color, fish: color, smile: color }, true)}</g>`;
  return {
    w: 200, h: 200,
    inner: `<circle cx="100" cy="100" r="96" fill="${ink}"/><circle cx="100" cy="100" r="92" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="100" cy="100" r="86" fill="none" stroke="${color}" stroke-width="0.6"/><circle cx="100" cy="100" r="58" fill="none" stroke="${color}" stroke-width="0.8"/><g fill="${color}">${ringText}</g>${em}`,
  };
}

// Arch badge: the premium plaque for packaging, signage and the story page.
const PLACE = run(F700, "MUARA BARU · JAKARTA", 11, 0, 0, 11 * 0.36);
function badge() {
  const W = 360, H = 500, R = W / 2;
  const arch = (i) => `M${i} ${H - i}V${R}A${R - i} ${R - i} 0 0 1 ${W - i} ${R}V${H - i}Z`;
  const es = 1.55, ew = 120 * es;
  const emblem = `<g transform="translate(${r2((W - ew) / 2)} 62) scale(${es})">${emblemSvgInner(VARIANTS.reversed)}</g>`;
  const ws = 0.66, ww = WORD.width * ws, wx = (W - ww) / 2, base = 62 + 123 * es + 26 + WORD.cap * ws;
  const word = `<g transform="translate(${r2(wx)} ${r2(base)}) scale(${ws})">${wordPaths(DARK)}</g>`;
  const ts = 1, tw = TAG.width * ts, ty = base + 44, mid = ty - TAG.cap / 2, rule = (ww - tw) / 2 - 12;
  const tagSvg = `<rect x="${r2(wx)}" y="${r2(mid - 1)}" width="${r2(rule)}" height="2" fill="${C.gold}"/><rect x="${r2(wx + ww - rule)}" y="${r2(mid - 1)}" width="${r2(rule)}" height="2" fill="${C.gold}"/><g transform="translate(${r2(wx + rule + 12)} ${r2(ty)})"><path fill="${C.cream}" d="${TAG.d}"/></g>`;
  const place = `<g transform="translate(${r2((W - PLACE.end) / 2)} ${H - 34})"><path fill="${C.gold}" d="${PLACE.d}"/></g>`;
  return { w: W, h: H, inner: `<path fill="${C.black}" d="${arch(0)}"/><path fill="none" stroke="${C.gold}" stroke-width="1.6" d="${arch(12)}"/><path fill="none" stroke="${C.gold}" stroke-width="0.6" d="${arch(18)}"/>${emblem}${word}${tagSvg}<rect x="${W / 2 - 3}" y="${H - 62}" width="6" height="6" transform="rotate(45 ${W / 2} ${H - 59})" fill="${C.gold}"/>${place}` };
}

const svg = ({ w, h, inner }, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${inner}</svg>\n`;
const write = (rel, content) => { fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), content); console.log("wrote", rel); };

// Emblems
write("public/brand/emblem.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.color) }));
write("public/brand/emblem-reversed.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.reversed) }, C.black));
write("public/brand/emblem-black.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.black) }));
write("public/brand/emblem-cream.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.cream) }, C.black));
write("public/brand/emblem-gold.svg", svg({ w: 120, h: 123, inner: emblemSvgInner(VARIANTS.gold) }, C.gold));
// Lockups
write("public/brand/logo-horizontal.svg", svg(horizontal(LIGHT, false)));
write("public/brand/logo-horizontal-tagline.svg", svg(horizontal(LIGHT, true)));
write("public/brand/logo-horizontal-reversed.svg", svg(horizontal(DARK, true), C.black));
write("public/brand/logo-stacked.svg", svg(stacked(LIGHT)));
write("public/brand/logo-stacked-reversed.svg", svg(stacked(DARK), C.black));
write("public/brand/logo-stacked-black.svg", svg(stacked(MONO)));
write("public/brand/seal.svg", svg(seal(C.gold, C.black)));
write("public/brand/seal-black.svg", svg(seal(C.black, "none")));
write("public/brand/badge-arch.svg", svg(badge()));
// Pattern tile: "sisik" scales — read as fish scales and as waves.
const scale = (cx, cy) => [18, 12.5, 7].map((r) => `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`).join("");
write("public/brand/pattern-sisik.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20" width="40" height="20"><g fill="none" stroke="${C.gold}" stroke-width="1">${scale(0, 20)}${scale(40, 20)}${scale(20, 10)}${scale(0, 0)}${scale(40, 0)}</g></svg>\n`);
write("public/brand/pattern-sisik-ink.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20" width="40" height="20"><g fill="none" stroke="${C.black}" stroke-width="1">${scale(0, 20)}${scale(40, 20)}${scale(20, 10)}${scale(0, 0)}${scale(40, 0)}</g></svg>\n`);
// App icon: black tile, reversed emblem
const icon = (pad, rx, small = false) => {
  const s = (64 - pad * 2) / 123;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rx}" fill="${C.black}"/><g transform="translate(${r2(32 - 60 * s)} ${r2(pad)}) scale(${r2(s)})">${emblemSvgInner(VARIANTS.reversed, small)}</g></svg>\n`;
};
write("public/icons/icon.svg", icon(9, 13, true));
write("public/brand/icon-maskable.svg", icon(15, 0));
write("public/brand/icon-large.svg", icon(9, 13));

// Path constants for React components
const ts = `// Generated by scripts/brand/build.cjs — do not edit by hand.
export const EMBLEM = ${JSON.stringify({ sun: SUN, sunRing: SUN_RING, halo: HALO, basket: BASKET, basketSmall: BASKET_SMALL, fish: FISH + EYE_HOLE, fishSmall: FISH_SMALL + EYE_HOLE, fin: FIN, fishTransform: FISH_TRANSFORM, smile: SMILE, viewBox: "0 0 120 123" })} as const;
export const WORDMARK = ${JSON.stringify({ dipa: WORD.dipa, dot: WORD.dot, saria: WORD.saria, width: WORD.width, cap: WORD.cap, desc: WORD.desc })} as const;
export const TAGLINE = ${JSON.stringify({ text: TAG_TEXT, d: TAG.d, width: TAG.width, cap: TAG.cap })} as const;
export const SEAL_RING = ${JSON.stringify(ring(F700, "DIPASARIA · SEGAR & TERPILIH · MUARA BARU · JAKARTA · ", 13, 100, 100, 70, 1.2, 0))};
`;
write("src/components/brand/paths.ts", ts);
