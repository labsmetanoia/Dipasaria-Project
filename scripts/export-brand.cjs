// Renders the brand PNGs (app icons, lockups, social image) from the SVG mark with Playwright.
// Run: node scripts/export-brand.cjs   (needs the playwright package and network access to Google Fonts)
const { chromium } = require("playwright"); const fs = require("fs");
const M = "M11 9.5 L31 12 C45.5 12 54 21 54 32 C54 43 45.5 52 31 52 L11 54.5 L20.5 32 Z";
const font = `<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@500;600&display=swap" rel="stylesheet">`;
const root = require("path").resolve(__dirname, "../public");
const lock = (bg, word, sub, mark, eye) => `<div style="display:inline-flex;align-items:center;gap:22px;padding:36px 44px;background:${bg}"><svg width="92" height="92" viewBox="0 0 64 64"><path d="${M}" fill="${mark}"/><circle cx="43.5" cy="26" r="2.5" fill="${eye}"/></svg><div style="display:flex;flex-direction:column;line-height:1"><span style="font:800 68px 'Barlow Condensed';letter-spacing:.1em;color:${word}">DIPASARIA</span><span style="font:600 16px Barlow;letter-spacing:.4em;color:${sub};margin-top:9px;padding-left:3px">PROTEIN PILIHAN · JAKARTA</span></div></div>`;
const jobs = [
  { out: `${root}/icons/icon-192.png`, w: 192, h: 192, html: `<svg width="192" height="192" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#000"/><path d="${M}" fill="#EAB200"/><circle cx="43.5" cy="26" r="2.6" fill="#000"/></svg>`, omit: true },
  { out: `${root}/icons/icon-512.png`, w: 512, h: 512, html: `<svg width="512" height="512" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#000"/><path d="${M}" fill="#EAB200"/><circle cx="43.5" cy="26" r="2.5" fill="#000"/></svg>`, omit: true },
  { out: `${root}/icons/icon-maskable-512.png`, w: 512, h: 512, html: `<div style="width:512px;height:512px;background:#000;display:flex;align-items:center;justify-content:center"><svg width="330" height="330" viewBox="0 0 64 64"><path d="${M}" fill="#EAB200"/><circle cx="43.5" cy="26" r="2.5" fill="#000"/></svg></div>` },
  { out: `${root}/icons/apple-touch-icon.png`, w: 180, h: 180, html: `<div style="width:180px;height:180px;background:#000;display:flex;align-items:center;justify-content:center"><svg width="130" height="130" viewBox="0 0 64 64"><path d="${M}" fill="#EAB200"/><circle cx="43.5" cy="26" r="2.5" fill="#000"/></svg></div>` },
  { out: `${root}/brand/logo-lockup-on-black.png`, html: lock("#000", "#fff", "#EAB200", "#EAB200", "#000"), fit: true },
  { out: `${root}/brand/logo-lockup-on-cream.png`, html: lock("#FAF8F4", "#000", "#866500", "#000", "#EAB200"), fit: true },
  { out: `${root}/brand/logo-lockup-on-gold.png`, html: lock("#EAB200", "#000", "#000", "#000", "#EAB200"), fit: true },
  { out: `${root}/og.jpg`, w: 1200, h: 630, jpeg: true, html: `<div style="width:1200px;height:630px;position:relative;background:#000 url('data:image/jpeg;base64,${require('fs').readFileSync(root + '/images/site/hero-harbour.jpg').toString('base64')}') center/cover"><div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.7) 55%,rgba(0,0,0,.25) 100%)"></div><div style="position:absolute;left:72px;top:56px">${lock("transparent", "#fff", "#EAB200", "#EAB200", "#000")}</div><div style="position:absolute;left:132px;bottom:72px;max-width:760px"><div style="font:800 70px/0.95 'Barlow Condensed';color:#fff;text-transform:uppercase">Ikan pilihan.<br>Jelas jenisnya.<br>Tepat ukurannya.</div><div style="font:500 24px Barlow;color:rgba(255,255,255,.8);margin-top:18px">Segar dari lelang subuh Muara Baru, diantar dingin ke dapur Anda.</div></div><div style="position:absolute;left:0;right:0;bottom:0;height:12px;background:#EAB200"></div></div>` },
];
(async () => {
  const b = await chromium.launch();
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w ?? 1200, height: j.h ?? 400 } });
    await p.setContent(`<html><head>${font}</head><body style="margin:0;background:transparent">${j.html}</body></html>`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const el = j.fit ? await p.$("body > div") : null;
    const opts = { path: j.out, omitBackground: !!j.omit, ...(j.jpeg ? { type: "jpeg", quality: 88 } : {}) };
    if (el) await el.screenshot(opts); else await p.screenshot({ ...opts, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    await p.close(); console.log("wrote", j.out.replace(root, ""));
  }
  await b.close();
})();
