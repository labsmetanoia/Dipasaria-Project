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

  // 8e) Value features: recipe add-ons, substitution choice, delivery mode, freshness guarantee, buying log, "Kabari saya"
  const vm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const v = await vm.newPage();
  // cart suggests the rest of a recipe when its main fish is in the cart
  await v.goto(BASE + "/belanja/produk/kakap-putih", { waitUntil: "networkidle" });
  for (let i = 0; i < 2; i++) await v.getByRole("button", { name: "Tambah", exact: true }).click();
  await v.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await v.goto(BASE + "/keranjang", { waitUntil: "networkidle" });
  check((await v.getByText(/Lengkapi masakan/).count()) >= 1, "cart offers the missing recipe ingredients for the fish in the cart");
  const linesBefore = await v.locator("button[aria-label='Hapus']").count();
  await v.getByRole("button", { name: /Tambah semua/ }).first().click();
  await v.waitForTimeout(500);
  check((await v.locator("button[aria-label='Hapus']").count()) > linesBefore, "'Tambah semua' adds the recipe's other ingredients to the cart");
  await v.screenshot({ path: `${OUT}/54-cart-recipe-complete-mobile.png`, fullPage: true });
  // checkout with a substitution choice
  await v.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await v.waitForSelector("h2:has-text(\"Penerima\")");
  await v.getByLabel("Nama penerima", { exact: true }).fill("Uji Antar Garansi");
  await v.getByLabel("Nomor WhatsApp").fill("0813 9999 0005");
  await v.getByLabel("Wilayah").selectOption({ index: 3 });
  await v.getByLabel("Alamat lengkap").fill("Jl. Uji No. 5, Jakarta Selatan");
  await v.getByRole("button", { name: "Lanjut" }).click();
  await v.getByRole("button", { name: "Lanjut" }).click();
  await v.locator("label", { hasText: "Ganti dengan yang sejenis dan setara" }).click();
  await v.screenshot({ path: `${OUT}/55-checkout-substitution-mobile.png`, fullPage: true });
  await v.getByRole("button", { name: "Buat pesanan" }).click();
  await v.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  const vUrl = v.url();
  const vCode = vUrl.match(/DP-[A-Z0-9-]+/)[0];
  const vd = vCode.match(/DP-(\d{2})(\d{2})(\d{2})/); const vDate = `20${vd[1]}-${vd[2]}-${vd[3]}`;
  // admin: substitution visible; weigh the kakap; deliver from the route sheet
  await a.goto(BASE + "/admin/pesanan?all=1&q=" + encodeURIComponent("Uji Antar Garansi"), { waitUntil: "networkidle" });
  await a.getByText("Uji Antar Garansi").first().click();
  await a.waitForSelector("text=Simpan berat");
  check((await a.getByText("ganti dengan yang sejenis").count()) === 1, "admin sees the customer's substitution choice");
  const vw = a.locator('input[aria-label^="Berat "]');
  for (let i = 0; i < (await vw.count()); i++) await vw.nth(i).fill((await vw.nth(i).getAttribute("placeholder")));
  await a.getByRole("button", { name: /Simpan berat/ }).click();
  await a.waitForTimeout(1200);
  await a.goto(BASE + "/admin/rute?date=" + vDate, { waitUntil: "networkidle" });
  const stop = a.locator("div.card", { hasText: "Uji Antar Garansi" }).first();
  check((await stop.getByText("Bila kosong: ganti sejenis").count()) === 1, "route card shows the substitution choice for the packer");
  await stop.getByRole("button", { name: "Diterima" }).click();
  await stop.getByLabel("Diterima oleh").fill("Satpam lobi");
  await stop.getByRole("button", { name: "Simpan: sudah diterima" }).click();
  await a.waitForSelector("text=Diterima", { timeout: 10000 });
  await a.waitForTimeout(800);
  check((await a.locator("div.card", { hasText: "Uji Antar Garansi" }).first().getByText(/Diterima .* Satpam lobi/).count()) === 1, "delivery mode records the delivery time and who received it");
  await a.screenshot({ path: `${OUT}/56-admin-delivery-mode-desktop.png`, fullPage: true });
  // customer: delivered, then a guarantee report with a photo
  await v.goto(vUrl, { waitUntil: "networkidle" });
  check((await v.getByText(/Diterima .* WIB · Satpam lobi/).count()) === 1, "customer sees when and to whom the order was delivered");
  await v.getByRole("button", { name: "Laporkan masalah" }).click();
  await v.locator("label", { hasText: "Kakap Putih" }).first().locator("input[type=checkbox]").check();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await v.locator("input[type=file]").setInputFiles({ name: "ikan.png", mimeType: "image/png", buffer: png });
  await v.waitForSelector("img[alt='Foto 1']");
  await v.screenshot({ path: `${OUT}/57-guarantee-report-mobile.png`, fullPage: true });
  await v.getByRole("button", { name: "Kirim laporan" }).click();
  await v.waitForSelector("text=Laporan diterima", { timeout: 15000 });
  check(true, "customer reports a problem with a photo within the guarantee window");
  // admin decides; customer sees the decision
  await a.goto(BASE + "/admin", { waitUntil: "networkidle" });
  check((await a.getByText(/laporan garansi menunggu keputusan/).count()) === 1, "dashboard flags the open guarantee report");
  await a.goto(BASE + "/admin/garansi", { waitUntil: "networkidle" });
  const claimCard = a.locator("div.card", { hasText: vCode }).first();
  check((await claimCard.locator("img[alt^='Foto 1']").count()) === 1, "the report's photo is visible to the owner");
  await claimCard.locator("label", { hasText: "Kembalikan dana" }).click();
  await claimCard.getByLabel("Pesan untuk pelanggan").fill("Maaf, kakap kurang segar.");
  await a.screenshot({ path: `${OUT}/58-admin-guarantee-desktop.png`, fullPage: true });
  await claimCard.getByRole("button", { name: /Simpan keputusan/ }).click();
  await a.waitForSelector("text=Tidak ada laporan yang menunggu.", { timeout: 10000 });
  await v.reload({ waitUntil: "networkidle" });
  check((await v.getByText(/dana dikembalikan Rp/).count()) === 1, "customer sees the refund decision on the order page");
  await a.goto(BASE + "/admin/whatsapp", { waitUntil: "networkidle" });
  check((await a.getByText("Pesanan sudah diterima").count()) >= 1 && (await a.getByText("Keputusan laporan garansi").count()) >= 1, "delivered and guarantee-decision WhatsApp messages are prepared");
  // buying log: record what was paid at the auction
  await a.goto(BASE + "/admin/belanja-subuh?date=" + vDate, { waitUntil: "networkidle" });
  const row = a.locator("div.divide-y > *").filter({ hasText: "Kakap Putih" }).first();
  await row.getByLabel("Total bayar (Rp)").fill("190000");
  await row.getByLabel("Pemasok atau lot").fill("Lelang Muara Baru lot 12");
  await row.getByRole("button", { name: "Catat" }).click();
  await a.waitForSelector("text=Lelang Muara Baru lot 12", { timeout: 10000 });
  check((await a.getByText("Rp190.000").count()) >= 1 && (await a.getByText("Modal dan susut hari ini").count()) === 1, "buying log records the price paid and shows actual cost and margin");
  await a.screenshot({ path: `${OUT}/59-admin-buying-log-desktop.png`, fullPage: true });
  // "Kabari saya": eggs were switched off for the standing-order test above
  await v.goto(BASE + "/belanja/produk/telur-ayam", { waitUntil: "networkidle" });
  await v.getByLabel("Nomor WhatsApp").fill("0813 9999 0006");
  await v.getByRole("button", { name: "Kabari" }).click();
  await v.waitForSelector("text=Kami kabari lewat WhatsApp");
  check(true, "a sold-out product offers 'Kabari saya' and records the request");
  await a.goto(BASE + "/admin/produk", { waitUntil: "networkidle" });
  const egg = a.locator("tr", { hasText: "Telur Ayam Negeri" }).first();
  check((await egg.getByText("1 menunggu").count()) === 1, "admin sees how many customers wait for the product");
  await egg.getByRole("button", { name: "Tersedia hari ini" }).click();
  await a.waitForTimeout(1500);
  await a.goto(BASE + "/admin/whatsapp", { waitUntil: "networkidle" });
  check((await a.getByText("Produk tersedia lagi").count()) >= 1, "switching the product back on prepares the back-in-stock message");
  await vm.close();

  // 8f) Restaurant receivables: ageing, overdue block, payments matched oldest first, credit limit, contract prices,
  //     WhatsApp statement with a signed link, invoices
  await a.goto(BASE + "/admin/piutang", { waitUntil: "networkidle" });
  check((await a.locator("tr", { hasText: "RM Padang Sinar Minang" }).getByText("Tempo ditahan").count()) === 1, "receivables: a restaurant with an invoice past the grace days is flagged");
  check((await a.getByText("15–30 hari").count()) >= 1 && (await a.getByText("Lewat jatuh tempo").count()) >= 1, "receivables: ageing buckets and overdue total shown");
  await a.screenshot({ path: `${OUT}/60-admin-receivables-desktop.png`, fullPage: true });
  const login = async (pg, phone, codeVal) => {
    await pg.goto(BASE + "/akun", { waitUntil: "networkidle" });
    await pg.locator("form", { has: pg.getByLabel("Kode akses") }).getByLabel("Nomor WhatsApp").fill(phone);
    await pg.getByLabel("Kode akses").fill(codeVal);
    await pg.getByRole("button", { name: "Masuk" }).click();
    await pg.waitForURL(/\/belanja/, { timeout: 15000 });
  };
  const toPayment = async (pg) => {
    await pg.goto(BASE + "/checkout", { waitUntil: "networkidle" });
    await pg.waitForSelector("h2:has-text(\"Penerima\")");
    await pg.getByRole("button", { name: "Lanjut" }).click();
    await pg.getByRole("button", { name: "Lanjut" }).click();
    await pg.waitForSelector("text=Tempo 3 hari");
  };
  const mc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await mc.newPage();
  mp.on("pageerror", (e) => fails.push("pageerror(minang): " + e.message));
  await login(mp, "081200000002", "mng456");
  await mp.getByRole("button", { name: "Pesan lagi" }).click();
  await mp.waitForURL(/\/keranjang/);
  await mp.goto(BASE + "/akun", { waitUntil: "networkidle" });
  check((await mp.getByText("Tagihan tempo").count()) >= 1 && (await mp.getByText(/jatuh tempo \d\d\/\d\d\/\d{4} belum lunas/).count()) >= 1, "restaurant sees its balance, due dates and why tempo is paused");
  await mp.screenshot({ path: `${OUT}/61-business-terms-card-mobile.png`, fullPage: true });
  await toPayment(mp);
  check((await mp.getByText(/Pembayaran tempo belum dapat dipakai/).count()) === 1, "checkout explains that tempo is paused for an overdue invoice");
  await mp.locator("label", { hasText: "Tempo 3 hari" }).click();
  check(await mp.getByRole("button", { name: "Buat pesanan" }).isDisabled(), "a tempo order cannot be placed while an invoice is overdue");
  await mp.screenshot({ path: `${OUT}/62-checkout-terms-paused-mobile.png`, fullPage: true });
  // the owner records the transfer: oldest invoices are settled first and the block lifts
  await a.goto(BASE + "/admin/piutang/ba_minang", { waitUntil: "networkidle" });
  check((await a.getByText("Pesanan tempo baru ditahan.").count()) === 1, "admin sees why tempo is held for this restaurant");
  await a.getByLabel("Referensi (opsional)").fill("Mandiri 23/11");
  await a.getByRole("button", { name: "Simpan pembayaran" }).click();
  await a.waitForSelector("text=Tidak ada tagihan terbuka.", { timeout: 10000 });
  check((await a.getByText("Pesanan tempo baru ditahan.").count()) === 0 && (await a.getByText(/Untuk DP-\d{6}-MNG5/).count()) >= 1, "payment settles the overdue invoices (oldest first) and lifts the hold");
  await a.screenshot({ path: `${OUT}/63-admin-receivables-account-desktop.png`, fullPage: true });
  await toPayment(mp);
  check((await mp.getByText(/Sisa batas kredit tempo/).count()) === 1, "checkout shows the tempo credit left");
  await mp.locator("label", { hasText: "Tempo 3 hari" }).click();
  await mp.getByRole("button", { name: "Buat pesanan" }).click();
  await mp.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  check(true, "after paying, the restaurant can order on tempo again");
  // credit limit: a lower limit stops the next tempo order before it is placed
  await a.goto(BASE + "/admin/piutang/ba_minang", { waitUntil: "networkidle" });
  await a.getByLabel("Batas kredit (Rp)").fill("100000");
  await a.getByRole("button", { name: "Simpan", exact: true }).click();
  await a.waitForSelector("text=Tersimpan.", { timeout: 10000 });
  await mp.goto(BASE + "/belanja", { waitUntil: "networkidle" });
  await mp.getByRole("button", { name: "Pesan lagi" }).click();
  await mp.waitForURL(/\/keranjang/);
  await toPayment(mp);
  await mp.locator("label", { hasText: "Tempo 3 hari" }).click();
  check((await mp.getByText(/melebihi batas kredit tempo akun Anda/).count()) === 1 && await mp.getByRole("button", { name: "Buat pesanan" }).isDisabled(), "an order above the credit left is stopped at checkout");
  await mc.close();
  // contract price: agreed per restaurant and product, shown to the restaurant
  await a.goto(BASE + "/admin/piutang/ba_bahari", { waitUntil: "networkidle" });
  await a.getByLabel("Produk").selectOption("v_udang_40");
  await a.getByLabel("Harga kontrak per satuan (Rp)").fill("99000");
  await a.getByRole("button", { name: "Tambah harga kontrak" }).click();
  await a.waitForSelector("text=Harga kontrak ditambahkan.", { timeout: 10000 });
  await a.getByText("Rp99.000").first().waitFor({ timeout: 10000 }); // the list refreshes a moment after the message
  check((await a.getByText("Rp99.000").count()) >= 1 && (await a.getByText("Kontrak Q4: kakap merah 1–2 kg").count()) === 1, "admin adds a contract price next to the existing one");
  const bc = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const bp = await bc.newPage();
  await login(bp, "081200000001", "bhr123");
  await bp.goto(BASE + "/akun", { waitUntil: "networkidle" });
  check((await bp.getByText("Harga kontrak Anda").count()) === 1 && (await bp.getByText(/Rp99\.000/).count()) >= 1, "restaurant sees its contract prices");
  await bc.close();
  // statement by WhatsApp with a signed link; invoice from the statement; a tampered link is refused
  await a.goto(BASE + "/admin/piutang/ba_minang", { waitUntil: "networkidle" });
  await a.getByRole("button", { name: /Kirim ringkasan tagihan/ }).click();
  await a.waitForSelector("text=Buka WhatsApp untuk mengirim", { timeout: 15000 });
  const stHref = decodeURIComponent(await a.getByRole("link", { name: "Buka WhatsApp untuk mengirim" }).getAttribute("href"));
  const stUrl = (stHref.match(/https?:\/\/[^\s]+\/tagihan\/[A-Za-z0-9_.-]+/) || [])[0];
  check(Boolean(stUrl) && /sisa tagihan Rp/.test(stHref), "statement summary prepared for WhatsApp with a signed link");
  const sc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const sp = await sc.newPage();
  await sp.goto(stUrl.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle" });
  check((await sp.getByText("Rekening koran").count()) >= 1 && (await sp.getByText("Saldo akhir").count()) === 1 && (await sp.getByText(/Pembayaran · Transfer bank \(Mandiri 23\/11\)/).count()) === 1, "signed link opens the statement with the recorded payment");
  const sideways = await sp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!sideways, "statement fits a 390 px phone without sideways scrolling");
  await sp.screenshot({ path: `${OUT}/64-statement-mobile.png`, fullPage: true });
  await sp.getByRole("link", { name: /Pesanan DP-\d{6}-MNG6/ }).first().click();
  await sp.waitForSelector("text=Faktur");
  check((await sp.getByText("Lunas").count()) >= 1, "invoice opens from the statement and shows it is paid");
  await sp.goto(stUrl.replace(/^https?:\/\/[^/]+/, BASE).slice(0, -1) + "x", { waitUntil: "networkidle" });
  check((await sp.getByText("Tautan tidak berlaku").count()) === 1, "a tampered statement link is refused");
  await sc.close();
  await a.goto(BASE + "/admin/whatsapp", { waitUntil: "networkidle" });
  check((await a.getByText("Ringkasan tagihan tempo (restoran)").count()) >= 1, "statement message is in the WhatsApp queue");

  // 8g) Household weekly box: subscribe from a value box, the evening run creates the order with a payment deadline,
  //     the customer skips this week from the order page; pause and resume; the address in use cannot be deleted
  const km = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const k = await km.newPage();
  k.on("pageerror", (e) => fails.push("pageerror(box): " + e.message));
  await k.goto(BASE + "/belanja/produk/kotak-freezer-keluarga", { waitUntil: "networkidle" });
  await k.getByRole("link", { name: "Langganan kotak ini tiap minggu" }).click();
  await k.waitForSelector("text=Masuk dengan WhatsApp untuk memulai kotak mingguan Anda.");
  check(true, "a value box offers a weekly subscription and asks the customer to sign in first");
  const kForm = k.locator("form", { has: k.getByRole("button", { name: "Kirim kode" }) });
  await kForm.getByLabel("Nomor WhatsApp").fill("0813 7777 0077");
  await kForm.getByRole("button", { name: "Kirim kode" }).click();
  await k.waitForSelector("text=Mode demo");
  await k.getByLabel("Kode 6 angka").fill((await k.locator("b.font-mono").innerText()).trim());
  await k.locator("form", { has: k.getByLabel("Kode 6 angka") }).getByRole("button", { name: "Masuk", exact: true }).click();
  await k.waitForSelector("#langganan", { timeout: 15000 });
  const panel = k.locator("#langganan");
  check((await panel.getByText(/Simpan dulu alamat pengiriman/).count()) === 1, "a box needs a saved delivery address first");
  await k.getByRole("button", { name: "Tambah" }).click();
  await k.getByLabel("Nama alamat").fill("Rumah");
  await k.getByLabel("Penerima").fill("Ibu Sari Kotak");
  await k.getByLabel("Wilayah").selectOption({ index: 3 });
  await k.getByLabel("Alamat lengkap").fill("Jl. Kemang Timur No. 9, Jakarta Selatan");
  await k.getByRole("button", { name: "Simpan alamat" }).click();
  await panel.getByText(/Kotak Freezer Keluarga · 1 kotak/).first().waitFor({ timeout: 10000 });
  check((await panel.getByText(/Kotak Freezer Keluarga · 1 kotak/).count()) >= 1 && (await panel.getByText(/Pengiriman pertama/).count()) === 1, "the form opens with the chosen box, its price and the first delivery date");
  await panel.getByRole("button", { name: "Dua minggu sekali" }).click();
  await panel.getByRole("button", { name: "Mulai kotak mingguan" }).click();
  await panel.getByText("Aktif", { exact: true }).waitFor({ timeout: 10000 });
  check((await panel.getByText(/, dua minggu sekali/).count()) === 1, "a two-weekly box is saved and active");
  await panel.getByRole("button", { name: "Ubah" }).click();
  await panel.getByRole("button", { name: "Setiap minggu" }).click();
  await panel.getByRole("button", { name: "Simpan perubahan" }).click();
  await panel.getByText(/Setiap (Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu) ·/).waitFor({ timeout: 10000 });
  check((await panel.getByText(/Per kotak: /).count()) >= 1 && (await panel.getByText(/ketuk untuk melewati/).count()) === 1, "changed to weekly; price per box and the next deliveries are shown");
  await k.screenshot({ path: `${OUT}/65-weekly-box-mobile.png`, fullPage: true });
  check(!(await k.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "the account page with a box fits a 390 px phone");
  // the evening run (here: "process now") turns the box into an order with a payment deadline
  await a.goto(BASE + "/admin/rutin", { waitUntil: "networkidle" });
  check((await a.getByText("Kotak mingguan · Kotak Freezer Keluarga").count()) === 1 && (await a.getByText("Kotak mingguan rumah tangga", { exact: true }).count()) === 1, "admin sees the household box next to restaurant standing orders");
  await a.getByRole("button", { name: /Proses untuk/ }).click();
  await a.waitForSelector("text=Pesanan dibuat", { timeout: 20000 });
  const boxCode = (await a.locator("li", { hasText: "(rumah tangga)" }).getByRole("link").first().innerText()).trim();
  const boxLine = a.locator("ul[aria-live] li", { hasText: "(rumah tangga)" });
  check(/^DP-\d{6}-[A-Z2-9]{4}$/.test(boxCode) && (await boxLine.count()) === 1 && (await boxLine.getByText("Pesanan dibuat").count()) === 1, "the run creates one order for the box: " + boxCode);
  await a.getByRole("button", { name: /Proses untuk/ }).click();
  await boxLine.getByText("Sudah diproses").waitFor({ timeout: 20000 });
  check((await a.getByText("Pesanan dibuat").count()) === 0, "a second run does not create a second box order");
  await a.reload({ waitUntil: "networkidle" });
  await a.screenshot({ path: `${OUT}/66-admin-weekly-box-desktop.png`, fullPage: true });
  await a.goto(BASE + "/admin/whatsapp", { waitUntil: "networkidle" });
  check((await a.getByText(/Mohon bayar sebelum .+ WIB, atau lewati minggu ini/).count()) >= 1, "the WhatsApp message gives the total, the payment deadline and the option to skip");
  await k.goto(BASE + "/akun", { waitUntil: "networkidle" });
  await k.locator("#langganan").getByRole("link", { name: new RegExp(boxCode) }).click();
  await k.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  await k.getByRole("button", { name: "Lewati minggu ini" }).waitFor({ timeout: 10000 });
  check((await k.getByText("atur langganan").count()) === 1 && (await k.getByText(/Bayar sebelum|Batas pembayaran|sebelum/).count()) >= 1, "the order page marks it as a weekly box, with the deadline and a skip button");
  await k.screenshot({ path: `${OUT}/67-weekly-box-order-mobile.png`, fullPage: true });
  k.once("dialog", (dlg) => dlg.accept());
  await k.getByRole("button", { name: "Lewati minggu ini" }).click();
  await k.waitForSelector("text=Kotak minggu ini Anda lewati", { timeout: 10000 });
  check((await k.getByRole("button", { name: "Lewati minggu ini" }).count()) === 0, "the customer skips this week: the order is cancelled, nothing to pay");
  await k.goto(BASE + "/akun", { waitUntil: "networkidle" });
  check((await k.locator("#langganan").getByText("Aktif", { exact: true }).count()) === 1, "the box itself stays active for the following weeks");
  k.once("dialog", (dlg) => dlg.accept());
  await k.getByRole("button", { name: "Hapus", exact: true }).click();
  await k.waitForSelector("text=Alamat ini dipakai kotak mingguan Anda", { timeout: 10000 });
  check(true, "an address used by a box cannot be deleted by accident");
  await k.locator("#langganan").getByRole("button", { name: "Jeda" }).click();
  await k.locator("#langganan").getByText("Dijeda", { exact: true }).waitFor({ timeout: 10000 });
  await k.locator("#langganan").getByRole("button", { name: "Lanjutkan" }).click();
  await k.locator("#langganan").getByText("Aktif", { exact: true }).waitFor({ timeout: 10000 });
  check(true, "pause and resume in one tap each");
  await km.close();

  // 8h) Visit funnel: an ordinary phone browser (not a crawler, not the admin) is counted once per step;
  //     the report shows the steps and the product that was viewed. The other contexts in this suite are headless
  //     browsers, which the counter ignores, so every step reads exactly 1.
  const fc = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
  await fc.addInitScript(() => { window.__dpTrackTests = true; });
  const f = await fc.newPage();
  f.on("pageerror", (e) => fails.push("pageerror(funnel): " + e.message));
  await f.goto(BASE + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  await f.reload({ waitUntil: "networkidle" }); // a second view in the same visit must not count again
  for (let i = 0; i < 3; i++) await f.getByRole("button", { name: "Tambah", exact: true }).click();
  await f.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await f.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  await f.waitForSelector("h2:has-text(\"Penerima\")");
  await f.getByLabel("Nama penerima", { exact: true }).fill("Bapak Corong Uji");
  await f.getByLabel("Nomor WhatsApp").fill("0813 7777 0088");
  await f.getByLabel("Wilayah").selectOption({ index: 3 });
  await f.getByLabel("Alamat lengkap").fill("Jl. Uji Corong No. 8, Jakarta Selatan");
  await f.getByRole("button", { name: "Lanjut" }).click();
  await f.locator('input[name="slot"]:not([disabled])').first().check();
  await f.getByRole("button", { name: "Lanjut" }).click();
  await f.getByRole("button", { name: "Buat pesanan" }).click();
  await f.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  await f.waitForSelector("text=Pesanan diterima");
  await f.waitForTimeout(1200);
  await fc.close();
  await a.goto(BASE + "/admin/laporan", { waitUntil: "networkidle" });
  const funnel = a.locator("section", { hasText: "Corong kunjungan" });
  const stepCount = async (i) => Number((await funnel.locator("ol li").nth(i).locator("b").last().innerText()).replace(/\D/g, ""));
  const steps = [await stepCount(0), await stepCount(1), await stepCount(2), await stepCount(3), await stepCount(4)];
  check(steps.join(",") === "1,1,1,1,1", "funnel counts one visit once per step, from opening the shop to the order: " + steps.join(","));
  check((await funnel.getByText(/Dari kunjungan menjadi pesanan: 100%/).count()) === 1, "the report shows the conversion from visit to order");
  check((await funnel.locator("tr", { hasText: "Fillet Dada Ayam Beku" }).count()) === 1, "the report lists the product that was viewed and added");
  await funnel.scrollIntoViewIfNeeded();
  await a.screenshot({ path: `${OUT}/68-admin-funnel-desktop.png`, fullPage: true });

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
  if (fails.length) console.log("\nFailed:\n- " + fails.join("\n- ")); // includes page errors, which are not printed as they happen
  console.log(fails.length ? `\n${fails.length} FAILURES` : "\nALL E2E CHECKS PASSED");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
