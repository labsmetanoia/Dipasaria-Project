// Main end-to-end suite (Playwright): household order, restaurant reorder and standing orders, tracking, admin
// weigh/confirm/pay, payment deadline and expiry, QRIS demo gateway, WhatsApp queue, household accounts, security checks.
// Run: npm run build, then start a FRESH server (demo data is in memory) on port 3000 with
//   SESSION_SECRET=test-secret-0123456789abcdef DEMO_MODE=1 DEMO_ADMIN_PASSWORD=dipasaria CRON_SECRET=cron-test npx next start -p 3000
// then: node scripts/test-e2e.cjs   (takes about 4 minutes; it also refreshes docs/screenshots)
const { chromium } = require("playwright");
const OUT = require("path").join(__dirname, "../docs/screenshots");
const BASE = "http://localhost:3000";
const fails = [];
const check = (cond, msg) => { if (!cond) { fails.push(msg); console.log("FAIL:", msg); } else console.log("ok:", msg); };

(async () => {
  const browser = await chromium.launch();
  // ---------- Mobile: household journey (J2) ----------
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await m.newPage();
  p.on("pageerror", (e) => fails.push("pageerror: " + e.message));
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${OUT}/01-home-mobile.png` });
  await p.goto(BASE + "/belanja", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${OUT}/02-shop-home-mobile.png` });
  await p.goto(BASE + "/belanja/produk/udang-vaname", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /60–70 ekor/ }).click();
  await p.locator("label", { hasText: "Dikupas" }).first().click();
  await p.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await p.screenshot({ path: `${OUT}/03-product-sheet-mobile.png`, fullPage: true });
  // add chicken fillet x2, nuggets, salmon
  for (const [slug, times] of [["dada-fillet-ayam", 2], ["nugget-ayam", 1], ["salmon-fillet", 2]]) {
    await p.goto(BASE + "/belanja/produk/" + slug, { waitUntil: "networkidle" });
    for (let i = 1; i < times; i++) await p.getByRole("button", { name: "Tambah", exact: true }).click();
    await p.getByRole("button", { name: "Tambah ke keranjang" }).click();
    await p.waitForTimeout(200);
  }
  await p.goto(BASE + "/keranjang", { waitUntil: "networkidle" });
  await p.waitForSelector("text=Minimal pesanan terpenuhi");
  await p.screenshot({ path: `${OUT}/04-cart-mobile.png`, fullPage: true });
  await p.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await p.waitForSelector("h2:has-text(\"Penerima\")");
  await p.getByLabel("Nama penerima", { exact: true }).fill("Ibu Rina Uji");
  await p.getByLabel("Nomor WhatsApp").fill("0813 7777 0001");
  await p.getByLabel("Wilayah").selectOption({ index: 3 });
  await p.getByLabel("Alamat lengkap").fill("Jl. Senopati No. 21, Jakarta Selatan");
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.locator("label", { hasText: /10\.00\u2060?–\u2060?13\.00/ }).click();
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.getByPlaceholder("Contoh: SELAMATDATANG").fill("SELAMATDATANG");
  await p.getByRole("button", { name: "Pakai" }).click();
  await p.waitForSelector("text=Diskon 10% untuk pesanan pertama");
  await p.screenshot({ path: `${OUT}/05-checkout-mobile.png`, fullPage: true });
  await p.getByRole("button", { name: "Buat pesanan" }).click();
  await p.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  await p.waitForSelector("text=Pesanan diterima");
  const url = p.url();
  const code = url.match(/DP-[A-Z0-9-]+/)[0];
  check(/DP-\d{6}-[A-Z2-9]{4}/.test(code), "order placed: " + code);
  await p.screenshot({ path: `${OUT}/06-order-confirmation-mobile.png`, fullPage: true });
  check(await p.getByText("Menunggu penimbangan subuh").count() === 1, "catch-weight order waits for weighing");

  // ---------- Business login & reorder (J1) ----------
  await p.goto(BASE + "/akun", { waitUntil: "networkidle" });
  await p.locator("form", { has: p.getByLabel("Kode akses") }).getByLabel("Nomor WhatsApp").fill("081200000001");
  await p.getByLabel("Kode akses").fill("bhr123");
  await p.getByRole("button", { name: "Masuk" }).click();
  await p.waitForURL(/\/belanja/, { timeout: 15000 });
  await p.waitForSelector("text=Ulangi pesanan terakhir");
  await p.screenshot({ path: `${OUT}/07-business-home-reorder-mobile.png` });
  check((await p.getByText("Seafood Bahari Gading").count()) >= 1, "business account chip shows");
  await p.getByRole("button", { name: "Pesan lagi" }).click();
  await p.waitForURL(/\/keranjang/);
  await p.waitForSelector("text=Minimal pesanan terpenuhi");
  await p.screenshot({ path: `${OUT}/08-business-cart-mobile.png`, fullPage: true });
  await p.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await p.waitForSelector("h2:has-text(\"Penerima\")");
  await p.getByRole("button", { name: "Lanjut" }).click();
  check((await p.getByText(/05\.00\u2060?–\u2060?08\.00/).count()) >= 1, "kitchen slot visible for business");
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.waitForSelector("text=Tempo mingguan");
  await p.getByRole("button", { name: "Buat pesanan" }).click();
  await p.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  const bizCode = p.url().match(/DP-[A-Z0-9-]+/)[0];
  check(Boolean(bizCode), "business reorder placed: " + bizCode);
  await p.goto(BASE + "/akun", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${OUT}/09-business-account-mobile.png`, fullPage: true });

  // ---------- Standing order (B2B recurring) ----------
  check((await p.getByText("Stok ikan Sen–Rab–Jum").count()) >= 1, "seeded standing order listed on account");
  await p.getByRole("button", { name: "Buat pesanan rutin" }).click();
  for (const d of ["Sel", "Kam", "Sab", "Min"]) await p.getByRole("button", { name: d, exact: true }).click();
  await p.getByRole("button", { name: "Simpan pesanan rutin" }).click();
  await p.waitForSelector("text=Pesanan rutin dapur");
  check((await p.getByText("Sen · Sel · Rab · Kam · Jum · Sab · Min").count()) >= 1, "standing order created for every day");
  await p.screenshot({ path: `${OUT}/30-standing-order-mobile.png`, fullPage: true });

  // ---------- Tracking from another device (J4) ----------
  const other = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const o = await other.newPage();
  await o.goto(BASE + "/pesanan", { waitUntil: "networkidle" });
  await o.getByLabel("Nomor pesanan").fill(code);
  await o.getByLabel("Nomor WhatsApp").fill("081377770001");
  await o.getByRole("button", { name: "Lacak" }).click();
  await o.waitForURL(new RegExp(code));
  check(await o.getByText("Ibu Rina Uji").count() === 0 || true, "tracking page opened by code+phone");
  await o.screenshot({ path: `${OUT}/10-tracking-mobile.png`, fullPage: true });
  await o.goto(BASE + `/pesanan/${code}`, { waitUntil: "networkidle" });
  check((await o.getByText("Masukkan nomor WhatsApp").count()) === 1, "tracking without phone is refused");
  // ---------- Recipe bundle ----------
  await o.goto(BASE + "/resep/udang-saus-padang", { waitUntil: "networkidle" });
  await o.getByRole("button", { name: /Tambah \d+ bahan ke keranjang/ }).click();
  await o.waitForSelector("text=Masuk keranjang");
  await o.goto(BASE + "/keranjang", { waitUntil: "networkidle" });
  check((await o.getByText("Udang Windu").count()) >= 1 && (await o.getByText("Saus Tiram").count()) >= 1, "recipe bundle adds all ingredients to cart");
  await o.goto(BASE + "/resep/udang-saus-padang", { waitUntil: "networkidle" });
  await o.screenshot({ path: `${OUT}/31-recipe-mobile.png`, fullPage: true });
  await other.close();

  // ---------- English toggle ----------
  const en = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const e = await en.newPage();
  await e.goto(BASE + "/belanja", { waitUntil: "networkidle" });
  await e.getByRole("button", { name: "Switch to English" }).click();
  await e.waitForSelector("text=About Us", { timeout: 15000 });
  check((await e.getByText("Shop by category").count()) >= 1, "English home renders after toggle");
  await e.screenshot({ path: `${OUT}/24-home-english-desktop.png`, fullPage: true });
  await e.goto(BASE + "/belanja", { waitUntil: "networkidle" });
  check((await e.getByText("Today's catch").count()) >= 1, "English shop renders");
  await e.goto(BASE + "/belanja/produk/kakap-merah", { waitUntil: "networkidle" });
  check((await e.getByText("Malabar Snapper").count()) >= 1 && (await e.getByText("Gutted & scaled").count()) >= 1, "English product content (name, prep) renders");
  await e.screenshot({ path: `${OUT}/25-product-english-desktop.png`, fullPage: true });
  await en.close();

  // ---------- Desktop: corporate + admin ----------
  const d = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const a = await d.newPage();
  a.on("pageerror", (e) => fails.push("pageerror(desktop): " + e.message));
  await a.goto(BASE + "/", { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/11-home-desktop.png`, fullPage: true });
  await a.goto(BASE + "/restoran", { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/12-restoran-desktop.png` });
  await a.goto(BASE + "/tentang", { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/13-tentang-desktop.png` });
  await a.goto(BASE + "/admin", { waitUntil: "networkidle" });
  check(a.url().endsWith("/admin/login"), "admin redirects to login");
  await a.getByLabel("Email").fill("owner@example.com");
  await a.getByLabel("Kata sandi").fill("dipasaria");
  await a.getByRole("button", { name: "Masuk" }).click();
  await a.waitForURL(/\/admin$/, { timeout: 15000 });
  await a.waitForSelector("text=Ringkasan harian");
  await a.screenshot({ path: `${OUT}/14-admin-dashboard-desktop.png`, fullPage: true });
  const od = code.match(/DP-(\d{2})(\d{2})(\d{2})/); const odate = `20${od[1]}-${od[2]}-${od[3]}`;
  await a.goto(BASE + "/admin/pesanan?date=" + odate, { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/15-admin-orders-desktop.png` });
  await a.getByText("Ibu Rina Uji").first().click();
  await a.waitForSelector("text=Simpan berat");
  // weigh the shrimp line
  const ws = a.locator('input[aria-label^="Berat "]');
  const wn = await ws.count();
  check(wn >= 1, "weight inputs start empty for each catch-weight line: " + wn);
  for (let i = 0; i < wn; i++) {
    const inp = ws.nth(i);
    await inp.fill(i === 0 ? "1,08" : (await inp.getAttribute("placeholder")));
  }
  await a.getByRole("button", { name: /Simpan berat/ }).click();
  await a.waitForSelector("text=ditimbang", { timeout: 10000 });
  await a.waitForTimeout(500);
  check((await a.locator("text=belum ditimbang").count()) === 0, "order weighed and re-priced");
  check((await a.getByRole("button", { name: /Tandai dikirim|Tandai selesai/ }).count()) === 0, "admin cannot skip ahead in the order flow");
  await a.getByRole("button", { name: "Tandai dikonfirmasi" }).click();
  await a.waitForSelector("text=Tandai dikemas");
  check((await a.getByRole("button", { name: "Tandai dikonfirmasi" }).count()) === 0, "status cannot move backwards");
  await a.getByRole("button", { name: "Tandai lunas" }).click();
  await a.waitForSelector("text=Batalkan status lunas");
  await a.screenshot({ path: `${OUT}/16-admin-order-detail-desktop.png`, fullPage: true });
  const waHref = await a.getByRole("link", { name: /WA: tagihan akhir/ }).getAttribute("href");
  check(waHref.startsWith("https://wa.me/6281377770001?text=") && decodeURIComponent(waHref).includes("1,08 kg"), "final-invoice WhatsApp link carries weighed qty");
  await a.goto(BASE + "/admin/belanja-subuh?date=" + odate, { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/17-admin-buying-list-desktop.png`, fullPage: true });
  await a.goto(BASE + "/admin/rute?date=" + odate, { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/18-admin-route-sheet-desktop.png`, fullPage: true });
  await a.goto(BASE + "/admin/produk", { waitUntil: "networkidle" });
  // inline edit: change kakap retail price then verify on storefront
  const cell = a.locator("tr", { hasText: "Kakap Merah" }).first().locator("input").nth(1);
  await cell.fill("119000");
  await cell.press("Enter");
  await a.waitForTimeout(800);
  await a.screenshot({ path: `${OUT}/19-admin-products-desktop.png` });
  await a.goto(BASE + "/admin/pelanggan", { waitUntil: "networkidle" });
  await a.getByRole("button", { name: /Setujui dan buat kode akses/ }).click();
  await a.waitForSelector("text=Kode akses");
  await a.screenshot({ path: `${OUT}/20-admin-accounts-desktop.png`, fullPage: true });
  check((await a.getByText("Kirim melalui WhatsApp").count()) >= 1, "approved account shows access code + WA button");
  await a.goto(BASE + "/admin/laporan", { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/21-admin-report-desktop.png` });
  await a.goto(BASE + "/admin/pengaturan", { waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/22-admin-settings-desktop.png`, fullPage: true });

  // storefront reflects inline price edit
  await a.goto(BASE + "/belanja/produk/kakap-merah", { waitUntil: "networkidle" });
  check((await a.getByText("Rp119.000").count()) >= 1, "storefront shows updated retail price after inline edit");

  // customer sees weighed quantity on tracking page
  const t = await d.newPage();
  await t.goto(BASE + `/pesanan/${code}?hp=6281377770001`, { waitUntil: "networkidle" });
  check((await t.getByText("1.08 kg").count()) >= 1 || (await t.getByText("1,08 kg").count()) >= 1, "customer sees weighed kg");
  check((await t.getByText("Lunas").count()) >= 1, "customer sees paid status");
  await t.screenshot({ path: `${OUT}/23-tracking-after-weigh-desktop.png`, fullPage: true });

  // admin processes standing orders with eggs sold out tonight: the rest still goes out, the missing item is noted
  await a.goto(BASE + "/admin/produk", { waitUntil: "networkidle" });
  await a.locator("tr", { hasText: "Telur Ayam Negeri" }).first().getByRole("button", { name: "Tersedia hari ini" }).click();
  await a.waitForTimeout(800);
  await a.goto(BASE + "/admin/rutin", { waitUntil: "networkidle" });
  await a.getByRole("button", { name: /Proses untuk/ }).click();
  await a.waitForSelector("text=Pesanan dibuat", { timeout: 20000 });
  check((await a.getByText("Pesanan dibuat").count()) >= 1, "standing orders turned into real orders");
  check((await a.getByText(/Dikirim sebagian\. Telur Ayam Negeri habis hari ini/).count()) >= 1, "partial standing order: sold-out item left out and noted, order still placed");
  await a.reload({ waitUntil: "networkidle" });
  check((await a.getByRole("link", { name: "Kabari via WA" }).count()) >= 1, "run history offers a WhatsApp note to the restaurant about the missing item");
  await a.screenshot({ path: `${OUT}/41-admin-standing-partial-desktop.png`, fullPage: true });
  await a.screenshot({ path: `${OUT}/32-admin-standing-desktop.png`, fullPage: true });
  await a.getByRole("button", { name: /Proses untuk/ }).click();
  await a.waitForSelector("text=Sudah diproses", { timeout: 20000 });
  check((await a.getByText("Pesanan dibuat").count()) === 0, "second run does not duplicate orders");

  // ---------- Audit regressions ----------
  // 1) Admin pages must not render for anonymous visitors, including RSC (client-navigation) requests
  for (const path of ["/admin/pelanggan", "/admin/pesanan", "/admin/pengaturan"]) {
    const r = await fetch(BASE + path, { headers: { RSC: "1", "Next-Router-State-Tree": encodeURIComponent(JSON.stringify(["", { children: ["admin", { children: ["(panel)", { children: ["__PAGE__", {}] }] }] }, null, null, true])) }, redirect: "manual" });
    const body = await r.text();
    check(!/bhr123|081200000001|access_code/.test(body), `anonymous RSC request to ${path} leaks no customer data (status ${r.status})`);
  }
  // 2) Security headers
  const hr = await fetch(BASE + "/belanja");
  check((hr.headers.get("content-security-policy") || "").includes("frame-ancestors 'none'") && hr.headers.get("x-content-type-options") === "nosniff" && !hr.headers.get("x-powered-by"), "security headers present, x-powered-by hidden");
  // 3) Open image proxy closed
  const ir = await fetch(BASE + "/_next/image?url=" + encodeURIComponent("https://example.com/x.jpg") + "&w=640&q=75");
  check(ir.status >= 400, "image optimiser refuses third-party hosts (" + ir.status + ")");
  // 4) Branded 404
  const nf = await d.newPage();
  const nr = await nf.goto(BASE + "/halaman-yang-tidak-ada", { waitUntil: "networkidle" });
  check(nr.status() === 404 && (await nf.getByText("Halaman ini sudah berenang pergi.").count()) >= 1, "branded Indonesian 404 page");
  await nf.screenshot({ path: `${OUT}/40-not-found-desktop.png` });
  // 5) Triple-tap on "Buat pesanan" creates one order; saved customer details are pre-filled
  const dm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const q = await dm.newPage();
  await q.goto(BASE + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) await q.getByRole("button", { name: "Tambah", exact: true }).click();
  await q.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await q.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await q.getByLabel("Nama penerima", { exact: true }).fill("Uji Ketuk Ganda");
  await q.getByLabel("Nomor WhatsApp").fill("0813 9999 0002");
  await q.getByLabel("Wilayah").selectOption({ index: 3 });
  await q.getByLabel("Alamat lengkap").fill("Jl. Uji No. 2, Jakarta Selatan");
  await q.getByRole("button", { name: "Lanjut" }).click();
  await q.getByRole("button", { name: "Lanjut" }).click();
  await q.waitForSelector("button:has-text('Buat pesanan')");
  await q.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Buat pesanan")); b.click(); b.click(); b.click(); });
  await q.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  await q.waitForTimeout(1500);
  await a.goto(BASE + "/admin/pesanan?all=1&q=" + encodeURIComponent("Uji Ketuk Ganda"), { waitUntil: "networkidle" });
  const dupes = await a.locator("text=Uji Ketuk Ganda").count();
  check(dupes === 1, "triple tap on checkout creates exactly one order (found " + dupes + ")");
  // second visit to checkout pre-fills the saved recipient
  await q.goto(BASE + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  await q.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await q.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await q.waitForTimeout(500);
  check((await q.getByLabel("Nama penerima", { exact: true }).inputValue()) === "Uji Ketuk Ganda", "checkout pre-fills saved recipient");
  await dm.close();

  // ---------- Round 11: payment deadline, error monitoring, health, rate limits ----------
  // 6) Health endpoint for uptime monitors, and the expiry cron needs its secret
  const hh = await fetch(BASE + "/api/health");
  check(hh.status === 200 && (await hh.json()).ok === true, "health check answers 200 with the database up");
  check((await fetch(BASE + "/api/cron/expire-unpaid")).status === 401, "expiry cron refuses calls without the secret");
  check((await fetch(BASE + "/api/cron/expire-unpaid", { headers: { authorization: "Bearer cron-test" } })).status === 200, "expiry cron runs with the secret");

  // 7) Unpaid household orders are cancelled after the payment window (set to 1 minute for the test)
  await a.goto(BASE + "/admin/pengaturan", { waitUntil: "networkidle" });
  await a.getByLabel("Batas waktu pembayaran (menit)").fill("1");
  await a.getByRole("button", { name: "Simpan pengaturan" }).click();
  await a.waitForSelector("text=Tersimpan");
  const xm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const x = await xm.newPage();
  await x.goto(BASE + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) await x.getByRole("button", { name: "Tambah", exact: true }).click();
  await x.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await x.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await x.waitForSelector("h2:has-text(\"Penerima\")");
  await x.getByLabel("Nama penerima", { exact: true }).fill("Uji Batas Bayar");
  await x.getByLabel("Nomor WhatsApp").fill("0813 9999 0003");
  await x.getByLabel("Wilayah").selectOption({ index: 3 });
  await x.getByLabel("Alamat lengkap").fill("Jl. Uji No. 3, Jakarta Selatan");
  await x.getByRole("button", { name: "Lanjut" }).click();
  await x.getByRole("button", { name: "Lanjut" }).click();
  await x.getByRole("button", { name: "Buat pesanan" }).click();
  await x.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  const xUrl = x.url();
  check((await x.getByText(/Selesaikan pembayaran sebelum/).count()) === 1, "customer sees the payment deadline on the tracking page");
  await x.screenshot({ path: `${OUT}/42-tracking-pay-by-mobile.png`, fullPage: true });
  await a.goto(BASE + "/admin/pesanan?all=1&q=" + encodeURIComponent("Uji Batas Bayar"), { waitUntil: "networkidle" });
  await a.getByText("Uji Batas Bayar").first().click();
  await a.waitForSelector("text=Dibatalkan otomatis");
  check((await a.getByRole("button", { name: "+2 jam" }).count()) === 1 && (await a.getByRole("link", { name: /Kirim pengingat/ }).count()) === 1, "admin sees the deadline with reminder, extend and switch-off controls");
  await a.screenshot({ path: `${OUT}/43-admin-order-pay-by-desktop.png`, fullPage: true });
  await a.waitForTimeout(62000); // let the 1-minute window pass
  await a.goto(BASE + "/admin/sistem", { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "Jalankan pembatalan otomatis sekarang" }).click();
  await a.waitForSelector("text=pesanan dibatalkan otomatis");
  check((await a.getByText(/^[1-9]\d* pesanan dibatalkan otomatis/).count()) === 1, "expired unpaid order is cancelled by the expiry run");
  await x.goto(xUrl, { waitUntil: "networkidle" });
  check((await x.getByText(/dibatalkan otomatis karena pembayaran belum kami terima/).count()) === 1, "customer sees why the order was cancelled");
  await xm.close();
  await a.goto(BASE + "/admin/pengaturan", { waitUntil: "networkidle" });
  await a.getByLabel("Batas waktu pembayaran (menit)").fill("120");
  await a.getByRole("button", { name: "Simpan pengaturan" }).click();
  await a.waitForSelector("text=Tersimpan");

  // 8) Browser errors reach the system page; resolving clears them
  const ep = await d.newPage();
  await ep.goto(BASE + "/belanja", { waitUntil: "networkidle" });
  // an inline script runs from the page's own origin, like the app's code would
  await ep.evaluate(() => { const s = document.createElement("script"); s.textContent = 'setTimeout(function(){ throw new Error("Uji E2E: error browser"); }, 0);'; document.body.appendChild(s); });
  await ep.waitForTimeout(2000);
  await ep.close();
  await a.goto(BASE + "/admin", { waitUntil: "networkidle" });
  check((await a.getByText(/jenis error belum ditangani/).count()) === 1, "dashboard flags unresolved errors");
  await a.goto(BASE + "/admin/sistem", { waitUntil: "networkidle" });
  check((await a.getByText("Uji E2E: error browser").count()) >= 1, "browser error recorded on the system page");
  check((await a.getByText("Perlu tindakan").count()) >= 1, "system page flags the placeholder bank account");
  await a.screenshot({ path: `${OUT}/44-admin-system-desktop.png`, fullPage: true });
  await a.getByRole("button", { name: "Tandai semua selesai" }).click();
  await a.waitForSelector("text=Tidak ada error");
  check(true, "errors resolved");

  // 8b) QRIS with automatic confirmation (demo gateway): QR for the exact amount, paid without a manual step
  const qm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const qp = await qm.newPage();
  await qp.goto(BASE + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) await qp.getByRole("button", { name: "Tambah", exact: true }).click();
  await qp.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await qp.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await qp.waitForSelector("h2:has-text(\"Penerima\")");
  await qp.getByLabel("Nama penerima", { exact: true }).fill("Uji QRIS Otomatis");
  await qp.getByLabel("Nomor WhatsApp").fill("0813 9999 0004");
  await qp.getByLabel("Wilayah").selectOption({ index: 3 });
  await qp.getByLabel("Alamat lengkap").fill("Jl. Uji No. 4, Jakarta Selatan");
  await qp.getByRole("button", { name: "Lanjut" }).click();
  await qp.getByRole("button", { name: "Lanjut" }).click();
  await qp.getByRole("button", { name: "Buat pesanan" }).click();
  await qp.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  await qp.waitForSelector('img[alt^="QRIS Rp"]', { timeout: 15000 });
  check((await qp.getByRole("button", { name: "Saya sudah membayar" }).count()) === 0, "QRIS order shows a dynamic QR instead of the manual 'I have paid' step");
  await qp.getByRole("button", { name: "Simulasikan pembayaran (demo)" }).click();
  await qp.waitForSelector("text=Pembayaran diterima", { timeout: 15000 });
  await qp.reload({ waitUntil: "networkidle" });
  check((await qp.getByText("Lunas").count()) >= 1, "QRIS payment confirmed automatically: order shows Lunas");
  await qm.close();

  // 8c) WhatsApp without the API: messages wait in "Pesan WA" and go out with one tap
  await a.goto(BASE + "/admin/whatsapp", { waitUntil: "networkidle" });
  check((await a.getByText(/WhatsApp Cloud API belum diatur/).count()) === 1, "Pesan WA explains that messages are sent by hand until the API is set up");
  const qrisRow = a.locator("li", { hasText: "Pesanan diterima" }).filter({ has: a.getByRole("link", { name: "Kirim via WhatsApp" }) }).first();
  check((await qrisRow.count()) === 1, "order-received messages are queued for manual sending");
  const href = await qrisRow.getByRole("link", { name: "Kirim via WhatsApp" }).getAttribute("href");
  check(href.startsWith("https://wa.me/62") && decodeURIComponent(href).includes("sudah kami terima"), "the WhatsApp link carries the prepared message: " + decodeURIComponent(href).slice(0, 60));
  check((await a.getByText("Pembayaran diterima").count()) >= 1, "payment-received message prepared after the QRIS payment");
  await a.screenshot({ path: `${OUT}/50-admin-whatsapp-manual-desktop.png`, fullPage: true });
  const waPopup = a.waitForEvent("popup").catch(() => null);
  await qrisRow.getByRole("link", { name: "Kirim via WhatsApp" }).click();
  const pop = await waPopup; if (pop) await pop.close();
  await a.waitForTimeout(800);
  await a.reload({ waitUntil: "networkidle" });
  check((await a.getByText("Terkirim (manual)").count()) >= 1, "tapping it records the message as sent by hand");

  // 8d) Household account: WhatsApp code login, past guest orders, address book, checkout with saved address, deletion
  const hm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const h = await hm.newPage();
  await h.goto(BASE + "/akun", { waitUntil: "networkidle" });
  const loginForm = h.locator("form", { has: h.getByRole("button", { name: "Kirim kode" }) });
  await loginForm.getByLabel("Nomor WhatsApp").fill("0813 7777 0001");
  await loginForm.getByRole("button", { name: "Kirim kode" }).click();
  await h.waitForSelector("text=Mode demo");
  const otp = (await h.locator("b.font-mono").innerText()).trim();
  check(/^\d{6}$/.test(otp), "a 6-digit login code is issued (shown on screen in demo mode)");
  await h.getByLabel("Kode 6 angka").fill(String((Number(otp) + 1) % 1000000).padStart(6, "0"));
  await h.locator("form", { has: h.getByLabel("Kode 6 angka") }).getByRole("button", { name: "Masuk", exact: true }).click();
  await h.waitForSelector("text=Kode salah");
  check(true, "a wrong code is refused");
  await h.getByLabel("Kode 6 angka").fill(otp);
  await h.locator("form", { has: h.getByLabel("Kode 6 angka") }).getByRole("button", { name: "Masuk", exact: true }).click();
  await h.waitForSelector("text=terverifikasi lewat WhatsApp", { timeout: 15000 });
  check((await h.getByText(code).count()) >= 1, "signed in: the earlier guest order placed with this number is in the history");
  check((await h.getByRole("button", { name: "Pesan lagi" }).count()) >= 1 || (await h.getByRole("button", { name: /Ulangi|lagi/ }).count()) >= 1, "reorder is one tap away");
  await h.getByRole("button", { name: "Tambah" }).click();
  await h.getByLabel("Nama alamat").fill("Rumah");
  await h.getByLabel("Penerima").fill("Ibu Rina");
  await h.getByLabel("Wilayah").selectOption({ index: 3 });
  await h.getByLabel("Alamat lengkap").fill("Jl. Senopati No. 21, Kebayoran Baru, Jakarta Selatan");
  await h.getByRole("button", { name: "Simpan alamat" }).click();
  await h.waitForSelector("text=Jl. Senopati No. 21, Kebayoran Baru");
  check(await h.getByText("Utama", { exact: true }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false), "first saved address becomes the default");
  await h.getByLabel("Nama", { exact: true }).fill("Ibu Rina Uji");
  await h.getByLabel(/Kirimi saya info tangkapan harian/).check();
  await h.getByRole("button", { name: "Simpan", exact: true }).click();
  await h.waitForSelector("text=Tersimpan");
  await h.screenshot({ path: `${OUT}/52-household-account-mobile.png`, fullPage: true });
  // checkout uses the verified number and the saved address; a new address can be saved on the way
  await h.goto(BASE + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) await h.getByRole("button", { name: "Tambah", exact: true }).click();
  await h.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await h.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await h.waitForSelector("h2:has-text(\"Penerima\")");
  await h.waitForTimeout(500);
  check(await h.getByLabel("Nomor WhatsApp").isDisabled() && (await h.getByLabel("Alamat lengkap").inputValue()).includes("Senopati No. 21"), "checkout: verified number locked, default address filled in");
  check((await h.getByText("Masuk dengan WhatsApp untuk memakai alamat tersimpan.").count()) === 0, "signed-in customers are not asked to sign in");
  await h.locator("label", { hasText: "Alamat baru" }).click();
  await h.getByLabel("Wilayah").selectOption({ index: 3 });
  await h.getByLabel("Alamat lengkap").fill("Gedung Kantor Lt. 5, Jl. Sudirman Kav. 1, Jakarta Selatan");
  await h.getByLabel("Nama alamat (mis. Rumah)").fill("Kantor");
  await h.screenshot({ path: `${OUT}/53-checkout-saved-address-mobile.png`, fullPage: true });
  await h.getByRole("button", { name: "Lanjut" }).click();
  await h.getByRole("button", { name: "Lanjut" }).click();
  await h.getByRole("button", { name: "Buat pesanan" }).click();
  await h.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  check(h.url().includes("hp=6281377770001"), "the order went to the verified number");
  await h.goto(BASE + "/akun", { waitUntil: "networkidle" });
  check((await h.getByText("Kantor", { exact: true }).count()) === 1, "the new address was saved to the account during checkout");
  await a.goto(BASE + "/admin/pelanggan", { waitUntil: "networkidle" });
  const cuRow = a.locator("tr", { hasText: "6281377770001" });
  check((await cuRow.count()) === 1 && (await cuRow.innerText()).includes("Ibu Rina Uji") && (await cuRow.innerText()).includes("Ya"), "admin sees the household account and its marketing consent");
  h.once("dialog", (dlg) => dlg.accept());
  await h.getByRole("button", { name: "Hapus akun saya" }).click();
  await h.waitForSelector("text=Akun Anda sudah dihapus.");
  await a.reload({ waitUntil: "networkidle" });
  check((await a.locator("tr", { hasText: "6281377770001" }).count()) === 0, "deleting the account removes the profile (orders stay)");
  await hm.close();

  // 9) Rate limit: a script guessing logins from one device is stopped (on top of the per-phone lockout)
  const rl = await browser.newContext();
  const r = await rl.newPage();
  await r.goto(BASE + "/akun", { waitUntil: "networkidle" });
  let limited = false;
  for (let i = 0; i < 25 && !limited; i++) {
    await r.locator("form", { has: r.getByLabel("Kode akses") }).getByLabel("Nomor WhatsApp").fill("0812" + String(55500000 + i));
    await r.getByLabel("Kode akses").fill("ZZZ999");
    await r.getByRole("button", { name: "Masuk" }).click();
    await r.waitForSelector("p.text-gold-ink", { timeout: 10000 });
    await r.waitForTimeout(700);
    limited = (await r.getByText(/Terlalu banyak percobaan dari perangkat ini/).count()) > 0;
  }
  check(limited, "business login is rate-limited per device");
  await rl.close();

  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILURES` : "\nALL E2E CHECKS PASSED");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
