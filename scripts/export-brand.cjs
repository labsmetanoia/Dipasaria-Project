// Renders the brand PNGs (app icons, lockups, social image) from the SVGs that scripts/brand/build.cjs writes.
// Run: npm run brand   (needs the playwright package; the social image also loads Barlow Condensed from Google Fonts)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const pub = path.resolve(__dirname, "../public");
const read = (rel) => fs.readFileSync(path.join(pub, rel), "utf8");
const dataUrl = (rel, type) => `data:${type};base64,${fs.readFileSync(path.join(pub, rel)).toString("base64")}`;
const sized = (svg, w, h) => svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${w}" height="${h}"`);
const icon = read("icons/icon.svg").replace("<svg ", '<svg width="W" height="W" ');
const sq = (n) => icon.replace(/width="W" height="W"/, `width="${n}" height="${n}"`);
const fav = (n) => read("icons/favicon.svg").replace("<svg ", `<svg width="${n}" height="${n}" `);
const maskable = read("brand/icon-maskable.svg").replace("<svg ", '<svg width="512" height="512" ');
const apple = read("brand/icon-maskable.svg").replace("<svg ", '<svg width="180" height="180" ');
const pattern = dataUrl("brand/pattern-sisik.svg", "image/svg+xml");
const font = `<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Plus+Jakarta+Sans:wght@500&display=swap" rel="stylesheet">`;

const pad = (svg, bg, p) => `<div style="display:inline-block;padding:${p}px;background:${bg};line-height:0">${svg}</div>`;
const jobs = [
  { out: "icons/icon-192.png", w: 192, h: 192, html: sq(192), omit: true },
  { out: "icons/icon-512.png", w: 512, h: 512, html: sq(512), omit: true },
  { out: "icons/icon-maskable-512.png", w: 512, h: 512, html: maskable },
  { out: "icons/apple-touch-icon.png", w: 180, h: 180, html: apple },
  { out: "brand/logo-stacked.png", html: pad(sized(read("brand/logo-stacked.svg"), 920, 0).replace('height="0"', ""), "#FAF8F4", 80), fit: true },
  { out: "brand/logo-stacked-reversed.png", html: pad(sized(read("brand/logo-stacked-reversed.svg"), 920, 0).replace('height="0"', ""), "#000", 80), fit: true },
  { out: "brand/logo-horizontal.png", html: pad(sized(read("brand/logo-horizontal-tagline.svg"), 1000, 0).replace('height="0"', ""), "#FAF8F4", 60), fit: true },
  { out: "brand/logo-horizontal-reversed.png", html: pad(sized(read("brand/logo-horizontal-reversed.svg"), 1000, 0).replace('height="0"', ""), "#000", 60), fit: true },
  {
    out: "og.jpg", w: 1200, h: 630, jpeg: true,
    html: `<div style="width:1200px;height:630px;position:relative;background:#000;overflow:hidden">
      <div style="position:absolute;right:0;top:0;bottom:0;width:560px;background:url('${dataUrl("images/site/hero-harbour.jpg", "image/jpeg")}') center/cover"></div>
      <div style="position:absolute;right:0;top:0;bottom:0;width:560px;background:linear-gradient(90deg,#000 0%,rgba(0,0,0,.15) 45%,rgba(0,0,0,0) 100%)"></div>
      <div style="position:absolute;left:0;top:0;bottom:0;width:700px;background:url('${pattern}');background-size:56px 28px;opacity:.1"></div>
      <div style="position:absolute;left:80px;top:72px">${sized(read("brand/logo-horizontal-reversed.svg"), 430, 0).replace('height="0"', "").replace(/<rect width="[\d.]+" height="123" fill="#000000"\/>/, "")}</div>
      <div style="position:absolute;left:80px;top:276px;font:800 76px/0.94 'Barlow Condensed';color:#FAF8F4;text-transform:uppercase">Ikan pilihan.<br>Jelas jenisnya.<br><span style="color:#EAB200">Tepat ukurannya.</span></div>
      <div style="position:absolute;left:80px;bottom:52px;font:500 21px 'Plus Jakarta Sans';color:rgba(250,248,244,.75)">Dari lelang subuh Muara Baru, diantar dingin ke dapur Anda.</div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:10px;background:#EAB200"></div></div>`,
  },
];

(async () => {
  const b = await chromium.launch();
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w ?? 1200, height: j.h ?? 800 } });
    await p.setContent(`<html><head>${font}</head><body style="margin:0;background:transparent">${j.html}</body></html>`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const el = j.fit ? await p.$("body > div") : null;
    const opts = { path: path.join(pub, j.out), omitBackground: !!j.omit, ...(j.jpeg ? { type: "jpeg", quality: 88 } : {}) };
    if (el) await el.screenshot(opts); else await p.screenshot({ ...opts, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    await p.close();
    console.log("wrote", j.out);
  }
  // favicon.ico with 16, 32 and 48 px PNG frames (browsers that ask for /favicon.ico get the current mark)
  const frames = [];
  for (const n of [16, 32, 48]) {
    const p = await b.newPage({ viewport: { width: n, height: n } });
    await p.setContent(`<html><body style="margin:0">${fav(n)}</body></html>`);
    frames.push({ n, png: await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: n, height: n } }) });
    await p.close();
  }
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
  let offset = 6 + 16 * frames.length;
  const dir = frames.map(({ n, png }) => { const e = Buffer.alloc(16); e.writeUInt8(n, 0); e.writeUInt8(n, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12); offset += png.length; return e; });
  fs.writeFileSync(path.join(pub, "favicon.ico"), Buffer.concat([header, ...dir, ...frames.map((f) => f.png)]));
  console.log("wrote favicon.ico");
  await b.close();
})();
