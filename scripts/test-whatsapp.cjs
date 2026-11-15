// WhatsApp Cloud API notifications against a local stand-in of graph.facebook.com (no real messages are sent).
// Run: npm run build, then start the app on port 3006 with
//   SESSION_SECRET=test-secret-0123456789abcdef DEMO_MODE=1 DEMO_ADMIN_PASSWORD=dipasaria CRON_SECRET=cron-test \
//   WHATSAPP_TOKEN=test-token WHATSAPP_PHONE_NUMBER_ID=1234567890 WHATSAPP_API_BASE=http://127.0.0.1:4020 npx next start -p 3006
// then: node scripts/test-whatsapp.cjs   (needs Playwright)
const http = require("http");
const { chromium } = require("playwright");
const APP = "http://localhost:3006";
const fails = []; const check = (c, m) => { console.log((c ? "ok: " : "FAIL: ") + m); if (!c) fails.push(m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sent = []; let failNext = null; // null | 500 | 400
const srv = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    const m = req.url.match(/^\/(v\d+\.\d+)\/(\d+)\/messages$/);
    if (req.method !== "POST" || !m) { res.writeHead(404); return res.end("{}"); }
    const body = JSON.parse(b);
    const rec = { version: m[1], phoneId: m[2], auth: req.headers.authorization, body };
    if (failNext === 500) { failNext = null; rec.result = 500; sent.push(rec); res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: { message: "Service temporarily unavailable", code: 2 } })); }
    if (failNext === 400) { failNext = null; rec.result = 400; sent.push(rec); res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: { message: "(#132001) Template name does not exist in the translation", code: 132001 } })); }
    rec.result = 200; sent.push(rec);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ messaging_product: "whatsapp", contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: "wamid.TEST" + sent.length }] }));
  });
});
const waitFor = async (pred, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (pred()) return true; await sleep(250); } return false; };
const ofTemplate = (name) => sent.filter((s) => s.body.template?.name === name);

async function order(b, name, phone, optOut = false) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(APP + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) await p.getByRole("button", { name: "Tambah", exact: true }).click();
  await p.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await p.goto(APP + "/checkout", { waitUntil: "networkidle" });
  await p.waitForSelector('h2:has-text("Penerima")');
  await p.getByLabel("Nama penerima", { exact: true }).fill(name);
  await p.getByLabel("Nomor WhatsApp").fill(phone);
  if (optOut) await p.getByLabel(/Kirim kabar pesanan ke WhatsApp ini/).uncheck();
  await p.getByLabel("Wilayah").selectOption({ index: 3 });
  await p.getByLabel("Alamat lengkap").fill("Jl. Uji WA No. 1, Jakarta Selatan");
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.getByRole("button", { name: "Buat pesanan" }).click();
  await p.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  return { ctx, p, code: p.url().match(/DP-[A-Z0-9-]+/)[0] };
}

(async () => {
  await new Promise((r) => srv.listen(4020, "127.0.0.1", r));
  const b = await chromium.launch();

  // 1. Order received → template message with the right shape
  const A = await order(b, "Uji WA A", "0813 5555 0001");
  check(await waitFor(() => ofTemplate("dipasaria_pesanan_diterima").length >= 1) && (await sleep(2000), true) && ofTemplate("dipasaria_pesanan_diterima").length === 1, "order received: exactly one 'dipasaria_pesanan_diterima' message sent");
  console.log("  received sends:", ofTemplate("dipasaria_pesanan_diterima").map((x) => x.body.to + " " + x.result).join(", "));
  const r = ofTemplate("dipasaria_pesanan_diterima")[0];
  check(r && r.auth === "Bearer test-token" && r.phoneId === "1234567890" && r.version === "v26.0", "sent to /v26.0/<phone number id>/messages with the Bearer token");
  const t = r?.body.template;
  check(r?.body.messaging_product === "whatsapp" && r.body.type === "template" && r.body.to === "6281355550001", "messaging_product whatsapp, type template, to the customer's number in 62… form");
  check(t?.language?.code === "id" && t.components?.[0]?.type === "body" && t.components[0].parameters.length === 5, "Indonesian template with 5 body parameters");
  const params = t?.components?.[0]?.parameters.map((x) => x.text) ?? [];
  check(params[0] === "Uji WA A" && params[1] === A.code && /^https?:\/\/.+\/pesanan\/DP-/.test(params[4]), "parameters: name, order code, … tracking link");
  check(params.every((x) => !/[\n\t]/.test(x) && !/ {4,}/.test(x)), "no line breaks, tabs or long space runs in parameters (WhatsApp rejects them)");

  // 2. Opt-out at checkout → nothing sent
  const before = sent.length;
  await order(b, "Uji WA Tidak", "0813 5555 0002", true);
  await sleep(2500);
  check(sent.length === before, "customer who unticked WhatsApp updates gets no message");

  // 3. Payment confirmed (demo QRIS gateway) → 'payment received'
  await A.p.waitForSelector('img[alt^="QRIS Rp"]', { timeout: 15000 });
  await A.p.getByRole("button", { name: "Simulasikan pembayaran (demo)" }).click();
  check(await waitFor(() => ofTemplate("dipasaria_pembayaran_diterima").length === 1), "payment confirmed → 'dipasaria_pembayaran_diterima' sent");

  // 4. Temporary failure (HTTP 500) → retried by the sweep and delivered
  const ad = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await ad.goto(APP + "/admin/login"); await ad.getByLabel("Email").fill("owner@example.com"); await ad.getByLabel("Kata sandi").fill("dipasaria");
  await ad.getByRole("button", { name: "Masuk" }).click(); await ad.waitForURL(/\/admin$/);
  await ad.goto(APP + "/admin/pesanan?all=1&q=" + encodeURIComponent("Uji WA A"), { waitUntil: "networkidle" });
  await ad.getByText("Uji WA A").first().click();
  await ad.waitForSelector("text=Pesan WhatsApp otomatis");
  failNext = 500;
  for (const s of ["Tandai dikonfirmasi", "Tandai dikemas", "Tandai dalam pengiriman"]) { await ad.getByRole("button", { name: s }).click(); await ad.waitForTimeout(800); }
  check(await waitFor(() => ofTemplate("dipasaria_dalam_pengiriman").length === 1 && ofTemplate("dipasaria_dalam_pengiriman")[0].result === 500), "out for delivery: first attempt hit a temporary error");
  const cron = await fetch(APP + "/api/cron/expire-unpaid", { headers: { authorization: "Bearer cron-test" } });
  check(cron.status === 200 && (await waitFor(() => ofTemplate("dipasaria_dalam_pengiriman").some((x) => x.result === 200))), "the sweep retried it and it was delivered");

  // 5. Permanent failure (template not approved) → shown in Pesan WA with the error, sendable by hand
  const C = await order(b, "Uji WA C", "0813 5555 0003");
  await waitFor(() => ofTemplate("dipasaria_pesanan_diterima").length === 2);
  await ad.goto(APP + "/admin/pesanan?all=1&q=" + encodeURIComponent("Uji WA C"), { waitUntil: "networkidle" });
  await ad.getByText("Uji WA C").first().click();
  await ad.waitForSelector("text=Pesan WhatsApp otomatis");
  failNext = 400;
  ad.once("dialog", (d) => d.accept());
  await ad.getByRole("button", { name: "Batalkan", exact: true }).click();
  check(await waitFor(() => ofTemplate("dipasaria_pesanan_dibatalkan").some((x) => x.result === 400)), "cancellation message hit a permanent error (template missing)");
  const n = sent.length;
  await fetch(APP + "/api/cron/expire-unpaid", { headers: { authorization: "Bearer cron-test" } });
  await sleep(1500);
  check(sent.length === n, "a permanent error is not retried automatically");
  await ad.goto(APP + "/admin/whatsapp", { waitUntil: "networkidle" });
  check((await ad.getByText(/132001/).count()) >= 1 && (await ad.getByRole("button", { name: "Kirim ulang" }).count()) >= 1 && (await ad.getByRole("link", { name: "Kirim via WhatsApp" }).count()) >= 1, "Pesan WA lists the failed message with its error, 'Kirim ulang' and 'Kirim via WhatsApp'");
  await ad.screenshot({ path: require("path").join(__dirname, "../docs/screenshots/") + "49-admin-whatsapp-desktop.png", fullPage: true });
  await ad.getByRole("button", { name: "Kirim ulang" }).first().click();
  check(await waitFor(() => ofTemplate("dipasaria_pesanan_dibatalkan").some((x) => x.result === 200)), "'Kirim ulang' resends it once the template is fixed");
  await ad.goto(APP + "/admin/sistem", { waitUntil: "networkidle" });
  check((await ad.getByText(/WhatsApp Cloud API aktif/).count()) >= 1, "system page shows the WhatsApp API as active");

  // 6. Household login code through the Authentication template (copy-code button)
  const lc = await b.newContext({ viewport: { width: 390, height: 844 } });
  const lp = await lc.newPage();
  await lp.goto(APP + "/akun", { waitUntil: "networkidle" });
  const lf = lp.locator("form", { has: lp.getByRole("button", { name: "Kirim kode" }) });
  await lf.getByLabel("Nomor WhatsApp").fill("0813 5555 0009");
  await lf.getByRole("button", { name: "Kirim kode" }).click();
  check(await waitFor(() => ofTemplate("dipasaria_kode_masuk").length === 1), "login code sent with the 'dipasaria_kode_masuk' template");
  const otpMsg = ofTemplate("dipasaria_kode_masuk")[0]?.body;
  const comps = otpMsg?.template?.components ?? [];
  const otpCode = comps[0]?.parameters?.[0]?.text;
  check(otpMsg?.to === "6281355550009" && /^\d{6}$/.test(otpCode ?? "") && comps[1]?.type === "button" && comps[1]?.index === "0" && comps[1]?.parameters?.[0]?.text === otpCode, "code in the body and in the copy-code button (index 0)");
  await lp.waitForSelector("text=Kode dikirim ke WhatsApp");
  check((await lp.getByText(/Mode demo: WhatsApp tidak dikirim/).count()) === 0 && (await lp.getByText(otpCode, { exact: true }).count()) === 0, "with the API on, the code is never shown on screen");
  await lp.getByLabel("Kode 6 angka").fill(otpCode);
  await lp.locator("form", { has: lp.getByLabel("Kode 6 angka") }).getByRole("button", { name: "Masuk", exact: true }).click();
  check(await lp.waitForSelector("text=terverifikasi lewat WhatsApp", { timeout: 15000 }).then(() => true).catch(() => false), "the code from WhatsApp signs the customer in");
  await lc.close();

  await b.close(); srv.close();
  console.log(fails.length ? `\n${fails.length} FAILURES` : "\nALL WHATSAPP CHECKS PASSED");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
