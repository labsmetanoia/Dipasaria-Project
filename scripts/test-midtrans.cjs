// Midtrans QRIS adapter test against a local stand-in of the Midtrans Core API (no network, no real money).
// Run: npm run build, then start the app on port 3003 with
//   SESSION_SECRET=test-secret-0123456789abcdef DEMO_MODE=1 DEMO_ADMIN_PASSWORD=dipasaria MIDTRANS_SERVER_KEY=SB-Mid-server-TESTKEY MIDTRANS_API_BASE=http://127.0.0.1:4010 npx next start -p 3003
// then: node scripts/test-midtrans.cjs   (needs Playwright)
const http = require("http");
const crypto = require("crypto");
const { chromium } = require("playwright");
const APP = "http://localhost:3003";
const KEY = "SB-Mid-server-TESTKEY";
const fails = []; const check = (c, m) => { console.log((c ? "ok: " : "FAIL: ") + m); if (!c) fails.push(m); };

const charges = []; const state = new Map(); let statusCalls = 0;
const jkt = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 19).replace("T", " ");
const srv = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    const send = (o) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.method === "POST" && req.url === "/v2/charge") {
      const body = JSON.parse(b); charges.push({ body, auth: req.headers.authorization, override: req.headers["x-override-notification"] });
      state.set(body.transaction_details.order_id, { transaction_status: "pending", gross_amount: `${body.transaction_details.gross_amount}.00` });
      return send({ status_code: "201", status_message: "Success, QRIS transaction is created", transaction_id: crypto.randomUUID(), order_id: body.transaction_details.order_id,
        gross_amount: `${body.transaction_details.gross_amount}.00`, payment_type: "qris", transaction_status: "pending", fraud_status: "accept",
        qr_string: "00020101021226620014COM.GO-JEK.WWW011893600914" + body.transaction_details.order_id.replace(/\W/g, "") + "5204581253033605802ID6304TEST",
        actions: [{ name: "generate-qr-code", method: "GET", url: "https://api.sandbox.midtrans.com/v2/qris/x/qr-code" }], expiry_time: jkt(Date.now() + body.custom_expiry.expiry_duration * 60e3) });
    }
    const m = req.url.match(/^\/v2\/([^/]+)\/(status|cancel)$/);
    if (m) {
      const id = decodeURIComponent(m[1]); const s = state.get(id);
      if (m[2] === "status") statusCalls++;
      if (!s) return send({ status_code: "404", status_message: "Transaction doesn't exist." });
      if (m[2] === "cancel") s.transaction_status = "cancel";
      return send({ status_code: s.transaction_status === "settlement" ? "200" : "201", order_id: id, transaction_status: s.transaction_status, gross_amount: s.gross_amount, payment_type: "qris" });
    }
    res.writeHead(404); res.end("{}");
  });
});
const sign = (o, key = KEY) => crypto.createHash("sha512").update(o.order_id + o.status_code + o.gross_amount + key).digest("hex");
const notify = async (o, key) => { const body = { ...o, signature_key: sign(o, key) }; const r = await fetch(APP + "/api/payments/midtrans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => ({})) }; };

async function order(b, name, phone) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(APP + "/belanja/produk/dada-fillet-ayam", { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) await p.getByRole("button", { name: "Tambah", exact: true }).click();
  await p.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await p.goto(APP + "/checkout", { waitUntil: "networkidle" });
  await p.waitForSelector('h2:has-text("Penerima")');
  await p.getByLabel("Nama penerima", { exact: true }).fill(name);
  await p.getByLabel("Nomor WhatsApp").fill(phone);
  await p.getByLabel("Wilayah").selectOption({ index: 3 });
  await p.getByLabel("Alamat lengkap").fill("Jl. Uji QRIS No. 1, Jakarta Selatan");
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.getByRole("button", { name: "Lanjut" }).click();
  await p.locator("label", { hasText: "QRIS" }).first().click().catch(() => {});
  await p.getByRole("button", { name: "Buat pesanan" }).click();
  await p.waitForURL(/\/pesanan\/DP-/, { timeout: 15000 });
  await p.waitForSelector('img[alt^="QRIS Rp"]', { timeout: 15000 });
  return { ctx, p, code: p.url().match(/DP-[A-Z0-9-]+/)[0] };
}

(async () => {
  await new Promise((r) => srv.listen(4010, "127.0.0.1", r));
  const b = await chromium.launch();

  // 1. Issuing a QR: the charge request Midtrans receives
  const A = await order(b, "Uji Midtrans A", "0813 4444 0001");
  const c = charges[0];
  check(charges.length === 1, "one QRIS charge sent to Midtrans");
  check(c.body.payment_type === "qris" && c.body.qris?.acquirer === "gopay", "charge uses payment_type qris with the GoPay acquirer");
  check(Number.isInteger(c.body.transaction_details.gross_amount) && c.body.transaction_details.gross_amount > 0, "gross_amount is a whole rupiah amount: " + c.body.transaction_details.gross_amount);
  check(c.body.transaction_details.order_id === `${A.code}-Q1`, "Midtrans order_id is the order code + attempt: " + c.body.transaction_details.order_id);
  check(c.auth === "Basic " + Buffer.from(KEY + ":").toString("base64"), "Authorization is Basic base64(server key + ':')");
  check(c.body.custom_expiry?.unit === "minute" && c.body.custom_expiry.expiry_duration > 0 && c.body.custom_expiry.expiry_duration <= 30, "QR expiry sent as custom_expiry in minutes: " + c.body.custom_expiry?.expiry_duration);
  check((await A.p.getByText(/Rp\d/).count()) > 0 && (await A.p.getByRole("link", { name: "Simpan gambar QR" }).count()) === 1, "customer sees the QR, the amount and a save-image button");
  check((await A.p.getByRole("button", { name: "Saya sudah membayar" }).count()) === 0, "no manual 'I have paid' step for gateway QRIS");
  await A.p.screenshot({ path: require("path").join(__dirname, "../docs/screenshots/") + "46-qris-gateway-mobile.png", fullPage: true });
  await A.p.reload({ waitUntil: "networkidle" });
  await A.p.waitForSelector('img[alt^="QRIS Rp"]');
  check(charges.length === 1, "reloading the page reuses the open QR (no second charge)");

  // 2. Notifications: signature required; body never trusted on its own
  const id = `${A.code}-Q1`; const gross = state.get(id).gross_amount;
  check((await notify({ order_id: id, status_code: "200", gross_amount: gross, transaction_status: "settlement" }, "wrong-key")).status === 401, "notification with a bad signature is rejected (401)");
  const forged = await notify({ order_id: id, status_code: "200", gross_amount: gross, transaction_status: "settlement" });
  check(forged.status === 200 && forged.json.outcome === "noop", "signed 'settlement' while Midtrans' status API says pending changes nothing (status API is the source of truth)");
  check((await notify({ order_id: "SOMEONE-ELSE-1", status_code: "200", gross_amount: "1000.00", transaction_status: "settlement" })).json.ignored === "unknown order_id", "notification for an unknown order id is acknowledged and ignored");

  // 3. Real payment: Midtrans settles, sends the notification, the customer's page confirms by itself
  state.get(id).transaction_status = "settlement";
  const paid = await notify({ order_id: id, status_code: "200", gross_amount: gross, transaction_status: "settlement" });
  check(paid.json.outcome === "paid", "settled payment marks the order paid: " + JSON.stringify(paid.json));
  await A.p.waitForSelector("text=Pembayaran diterima", { timeout: 15000 });
  check(true, "customer page confirms the payment without reloading");
  await A.p.screenshot({ path: require("path").join(__dirname, "../docs/screenshots/") + "47-qris-paid-mobile.png" });
  check((await notify({ order_id: id, status_code: "200", gross_amount: gross, transaction_status: "settlement" })).json.outcome === "noop", "repeated notification is a no-op");

  // 4. Missed notification: the page's polling asks Midtrans and still confirms
  const B = await order(b, "Uji Midtrans B", "0813 4444 0002");
  const idB = `${B.code}-Q1`; const before = statusCalls;
  state.get(idB).transaction_status = "settlement";
  await B.p.waitForSelector("text=Pembayaran diterima", { timeout: 40000 });
  check(statusCalls > before, "without any notification, polling checks Midtrans' status API and confirms the payment");

  // 5. Wrong amount: not marked paid, the owner is asked to check
  const C = await order(b, "Uji Midtrans C", "0813 4444 0003");
  const idC = `${C.code}-Q1`; const s = state.get(idC);
  s.transaction_status = "settlement"; s.gross_amount = `${Number.parseFloat(s.gross_amount) - 1000}.00`;
  const mm = await notify({ order_id: idC, status_code: "200", gross_amount: s.gross_amount, transaction_status: "settlement" });
  check(mm.json.outcome === "mismatch", "a different amount is not marked paid (mismatch)");
  await C.p.waitForSelector("text=sedang memeriksa nominalnya", { timeout: 15000 });
  check(true, "customer is told the payment is being checked");

  // 6. Admin sees the gateway record and the note
  const ad = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await ad.goto(APP + "/admin/login"); await ad.getByLabel("Email").fill("owner@example.com"); await ad.getByLabel("Kata sandi").fill("dipasaria");
  await ad.getByRole("button", { name: "Masuk" }).click(); await ad.waitForURL(/\/admin$/);
  await ad.goto(APP + "/admin/pesanan?all=1&q=" + encodeURIComponent("Uji Midtrans C"), { waitUntil: "networkidle" });
  await ad.getByText("Uji Midtrans C").first().click();
  await ad.waitForSelector("text=QRIS otomatis");
  check((await ad.getByText(/\[QRIS\] Diterima/).count()) + (await ad.locator("textarea").filter({ hasText: "[QRIS] Diterima" }).count()) >= 1, "admin sees the amount-mismatch note on the order");
  await ad.screenshot({ path: require("path").join(__dirname, "../docs/screenshots/") + "48-admin-qris-mismatch-desktop.png", fullPage: true });
  await ad.goto(APP + "/admin/sistem", { waitUntil: "networkidle" });
  check((await ad.getByText(/Midtrans \(sandbox\): QR sesuai nominal/).count()) === 1, "system page shows Midtrans sandbox as the QRIS gateway");

  await b.close(); srv.close();
  console.log(fails.length ? `\n${fails.length} FAILURES` : "\nALL MIDTRANS CHECKS PASSED");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
