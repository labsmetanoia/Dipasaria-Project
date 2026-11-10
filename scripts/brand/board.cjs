// Renders docs/brand/brand-board.png (and a 2x version) from the public/brand SVGs. Run: npm run brand
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, "public", rel), "utf8").replace(/ width="[\d.]+" height="[\d.]+"/, "");
const strip = (svg) => svg.replace(/<rect width="[\d.]+" height="[\d.]+" fill="#000000"\/>/, "");
const uri = (rel) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(ROOT, "public", rel)).toString("base64")}`;
const photo = `data:image/jpeg;base64,${fs.readFileSync(path.join(ROOT, "public/images/site/hero-harbour.jpg")).toString("base64")}`;
const stacked = read("brand/logo-stacked.svg"), stackedRev = strip(read("brand/logo-stacked-reversed.svg"));
const horiz = read("brand/logo-horizontal-tagline.svg"), horizRev = strip(read("brand/logo-horizontal-reversed.svg"));
const emblem = read("brand/emblem.svg"), emblemRev = strip(read("brand/emblem-reversed.svg")), emblemBlack = read("brand/emblem-black.svg");
const seal = read("brand/seal.svg"), sealBlack = read("brand/seal-black.svg");
const sisik = uri("brand/pattern-sisik.svg"), sisikInk = uri("brand/pattern-sisik-ink.svg");
const ico = (d) => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#C09200" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Plus Jakarta Sans';color:#121212}
.board{width:1640px;height:900px;display:grid;grid-template-columns:420px 1fr;background:#fff}
.side{padding:40px 40px 32px;background:#FAF8F4;display:flex;flex-direction:column;gap:26px}
.h{display:flex;align-items:center;gap:12px;font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase}
.p{margin:10px 0 0 42px;font-size:13.5px;line-height:1.62;color:#333}
ul{margin:8px 0 0 42px;padding:0;list-style:none;font-size:13.5px;line-height:1.85;color:#333}li:before{content:"•  ";color:#C09200}
.sw{display:flex;gap:10px;margin:12px 0 0 42px}.sw div{width:52px}.sw i{display:block;height:44px;border-radius:6px;border:1px solid #e2dccf}.sw b{display:block;font-size:9.5px;font-weight:700;margin-top:5px;letter-spacing:.02em}
.grid{display:grid;grid-template-columns:1.15fr .85fr;grid-template-rows:470px 430px}
.hero{background:#FAF8F4;display:flex;align-items:center;justify-content:center;border-left:1px solid #eee7da}
.sign{position:relative;overflow:hidden;background:#141414}
.row{grid-column:1/3;display:grid;grid-template-columns:1fr 1fr 1fr 1fr}
.tile{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.pat{position:absolute;inset:0;background-size:56px 28px}
.cap{position:absolute;left:14px;bottom:10px;font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(0,0,0,.45)}
.capd{color:rgba(250,248,244,.5)}
</style></head><body><div class="board">
<div class="side">
  <div style="width:300px">${horiz}</div>
  <div><div class="h">${ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>')}Tentang merek</div>
  <p class="p">Dipasaria adalah pedagang prinsipal seafood dan protein pilihan dari lantai lelang Muara Baru. Logonya menampilkan ikan yang melompat dari keranjang lelang dengan senyum emas di bawahnya: kesegaran langsung dari pasar, disajikan dengan layanan yang tepercaya.</p></div>
  <div><div class="h">${ico('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>')}Sistem identitas</div>
  <ul><li>Emblem, logo horizontal dan bertumpuk</li><li>Segel mutu, lencana dan pola "sisik"</li><li>Palet warna dan tipografi</li><li>Kemasan, papan nama dan alat tulis</li><li>Situs, toko daring dan aplikasi</li></ul></div>
  <div><div class="h">${ico('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21a3 3 0 0 1 0-6h1"/>')}Palet warna</div>
  <div class="sw"><div><i style="background:#000"></i><b>#000000</b></div><div><i style="background:#EAB200"></i><b>#EAB200</b></div><div><i style="background:#C09200"></i><b>#C09200</b></div><div><i style="background:#EEE7DA"></i><b>#EEE7DA</b></div><div><i style="background:#FAF8F4"></i><b>#FAF8F4</b></div></div></div>
  <div style="margin-left:42px;display:flex;gap:26px;align-items:flex-end"><div><div style="font:800 34px 'Plus Jakarta Sans';letter-spacing:-.02em">Aa</div><div style="font-size:10.5px;font-weight:700">Plus Jakarta Sans<br><span style="font-weight:500;color:#5c5c5c">logo, teks, antarmuka</span></div></div>
  <div><div style="font:800 38px 'Barlow Condensed';text-transform:uppercase">Aa</div><div style="font-size:10.5px;font-weight:700">Barlow Condensed<br><span style="font-weight:500;color:#5c5c5c">judul besar, harga</span></div></div></div>
</div>
<div class="grid">
  <div class="hero"><div style="width:400px">${stacked}</div></div>
  <div class="sign">
    <div style="position:absolute;inset:0;background:url('${photo}') center/cover;filter:brightness(.45) saturate(.8)"></div>
    <div style="position:absolute;right:0;top:92px;width:200px;height:10px;background:#2b2b2b;border-radius:0 0 0 4px"></div><div style="position:absolute;right:181px;top:92px;width:8px;height:40px;background:#2b2b2b"></div><div style="position:absolute;right:0;top:70px;width:16px;height:54px;background:#3a3a3a"></div>
    <div style="position:absolute;right:60px;top:126px;width:250px;height:250px;border-radius:50%;background:#FAF8F4;border:12px solid #000;box-shadow:0 20px 50px rgba(0,0,0,.6),inset 0 0 0 3px #EAB200;display:flex;align-items:center;justify-content:center"><div style="width:170px">${stacked}</div></div>
    <div class="cap capd">Papan nama gerai</div>
  </div>
  <div class="row">
    <div class="tile" style="background:#EAB200"><div class="pat" style="background-image:url('${sisikInk}');opacity:.08"></div><div style="width:200px;position:relative;filter:drop-shadow(0 18px 30px rgba(0,0,0,.3))">${read("brand/badge-arch.svg")}</div><div class="cap">Lencana kemasan</div></div>
    <div class="tile" style="background:#EEE7DA">
      <div style="position:relative;width:196px;height:270px;margin-top:40px">
        <div style="position:absolute;left:52px;top:-52px;width:92px;height:80px;border:7px solid #000;border-bottom:none;border-radius:46px 46px 0 0"></div>
        <div style="position:absolute;inset:0;background:#FAF8F4;box-shadow:12px 18px 30px rgba(0,0,0,.18);overflow:hidden"><div style="position:absolute;right:-40px;bottom:-40px;width:150px;opacity:.06">${emblemBlack}</div><div style="position:absolute;left:0;right:0;bottom:0;height:12px;background:#EAB200"></div>
        <div style="position:absolute;left:28px;right:28px;top:58px">${stacked}</div></div>
        <div style="position:absolute;right:-26px;top:0;bottom:0;width:26px;background:#e6dece;transform:skewY(-25deg);transform-origin:left top"></div>
      </div><div class="cap">Tas belanja</div></div>
    <div class="tile" style="background:#141414"><div class="pat" style="background-image:url('${sisik}');opacity:.06"></div>
      <div style="position:absolute;left:34px;top:62px;width:250px;height:146px;background:#FAF8F4;transform:rotate(-8deg);box-shadow:0 14px 30px rgba(0,0,0,.5);padding:26px 22px"><div style="width:190px">${horiz}</div><div style="position:absolute;right:-20px;bottom:-24px;width:96px;opacity:.06">${emblemBlack}</div></div>
      <div style="position:absolute;left:74px;top:232px;width:250px;height:146px;background:#000;border-top:5px solid #EAB200;transform:rotate(4deg);box-shadow:0 14px 30px rgba(0,0,0,.6);padding:22px 22px;color:#FAF8F4;font-size:11px;line-height:1.9;overflow:hidden"><div class="pat" style="background-image:url('${sisik}');opacity:.1"></div><div style="position:relative"><b style="font-size:13px">Pemilik · Dipasaria</b><br><span style="color:#EAB200">●</span> +62 811 0000 0000<br><span style="color:#EAB200">●</span> halo@dipasaria.id<br><span style="color:#EAB200">●</span> Muara Baru, Jakarta Utara</div></div>
      <div class="cap capd">Kartu nama</div></div>
    <div class="tile" style="background:#FAF8F4">
      <div style="position:relative;width:250px;height:190px;margin-top:70px;background:#EEE7DA;box-shadow:14px 18px 30px rgba(0,0,0,.15)">
        <div style="position:absolute;left:0;right:0;top:-34px;height:34px;background:#e3d9c6;clip-path:polygon(6% 0,94% 0,100% 100%,0 100%)"></div>
        <div style="position:absolute;left:0;right:0;top:78px;height:26px;background:#EAB200"></div>
        <div style="position:absolute;left:84px;top:44px;width:98px;height:98px;transform:rotate(-10deg)">${seal}</div>
        <div style="position:absolute;left:16px;bottom:12px;font:700 8px 'Plus Jakarta Sans';letter-spacing:.18em">BEKU −18 °C · SEGAR 0–4 °C</div>
      </div>
      <div style="position:absolute;left:28px;top:30px;width:92px;height:132px;background:#000;border-radius:10px 10px 46px 46px;transform:rotate(-12deg);box-shadow:0 12px 24px rgba(0,0,0,.25);display:flex;flex-direction:column;align-items:center;padding-top:12px"><div style="width:12px;height:12px;border-radius:50%;background:#FAF8F4"></div><div style="width:58px;margin-top:12px">${emblemRev}</div><div style="color:#EAB200;font:800 11px 'Plus Jakarta Sans';margin-top:6px">Segar &amp;<br>terpilih</div></div>
      <div class="cap">Kotak antar dan label</div></div>
  </div>
</div></div></body></html>`;

(async () => {
  const b = await chromium.launch();
  for (const [scale, name] of [[1, "brand-board.png"], [2, "brand-board@2x.png"]]) {
    const p = await b.newPage({ viewport: { width: 1640, height: 900 }, deviceScaleFactor: scale });
    await p.setContent(html, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(ROOT, "docs/brand", name) });
    await p.close();
    console.log("wrote docs/brand/" + name);
  }
  await b.close();
})();
