// Rules test (no server, no browser): runs the shared TypeScript rules and the in-memory data layer directly.
// Covers what the browser suite cannot reach without waiting weeks: the weekly-box schedule, payment deadlines,
// automatic pause after two unpaid boxes, and the receivables ledger arithmetic.
// Run: npm run test:rules
const path = require("node:path");
const { createJiti } = require("jiti");
const jiti = createJiti(__filename, { alias: { "@": path.join(__dirname, "../src") } });

let fails = 0, oks = 0;
const check = (cond, name) => { if (cond) { oks++; console.log("ok: " + name); } else { fails++; console.log("FAIL: " + name); } };

(async () => {
  const S = await jiti.import("../src/lib/standing.ts");
  const R = await jiti.import("../src/lib/receivables.ts");
  const { memoryRepo: repo } = await jiti.import("../src/lib/data/memory.ts");
  const { addDays, nowJakarta } = await jiti.import("../src/lib/format.ts");
  const { availableDates } = await jiti.import("../src/lib/pricing.ts");

  // ---------- schedule ----------
  const thu = { weekdays: [4], every_weeks: 2, anchor_date: "2026-11-26" };
  check(S.onSchedule(thu, "2026-11-26") && !S.onSchedule(thu, "2026-12-03") && S.onSchedule(thu, "2026-12-10"), "two-weekly box: first delivery, not the week after, again two weeks later");
  check(!S.onSchedule(thu, "2026-11-12") && !S.onSchedule(thu, "2026-11-27"), "two-weekly box: nothing before its first delivery or on another weekday");
  check(S.onSchedule({ weekdays: [4], every_weeks: 1, anchor_date: "2026-11-26" }, "2026-12-03"), "weekly box: every week");
  check(JSON.stringify(S.upcomingDates(thu, "2026-11-24", 3)) === JSON.stringify(["2026-11-26", "2026-12-10", "2026-12-24"]), "upcoming dates of a two-weekly box are 14 days apart");
  check(JSON.stringify(S.upcomingDates({ weekdays: [1, 3, 5] }, "2026-11-24", 3)) === JSON.stringify(["2026-11-25", "2026-11-27", "2026-11-30"]), "restaurant standing orders keep their weekday schedule");

  // ---------- payment deadline of a box ----------
  const st = { cutoff_time: "20:00", payment_window_minutes: 120 };
  const at = (s) => Date.parse(s + "+07:00");
  check(S.boxPayBy("2026-11-26", st, at("2026-11-24T19:45:00")) === new Date(at("2026-11-25T20:00:00")).toISOString(), "box created two evenings before: pay by the cut-off on the evening before delivery");
  check(S.boxPayBy("2026-11-26", st, at("2026-11-25T19:45:00")) === new Date(at("2026-11-25T21:45:00")).toISOString(), "box created the evening before (catch-up): the usual two hours");
  check(S.boxPayBy("2026-11-26", st, at("2026-11-25T23:30:00")) === new Date(at("2026-11-26T00:00:00")).toISOString(), "never later than the start of the delivery day");

  // ---------- skipping an order that was already created ----------
  const o = { client_ref: "so:x:2026-11-26", segment: "retail", status: "new", payment_status: "unpaid", weighed_at: null, delivery_date: "2026-11-26" };
  check(S.boxSkippable(o, ["2026-11-26", "2026-11-27"]), "an unpaid box order can be skipped before the cut-off");
  check(!S.boxSkippable(o, ["2026-11-27"]) && !S.boxSkippable({ ...o, payment_status: "paid" }, ["2026-11-26"]) && !S.boxSkippable({ ...o, client_ref: "abc" }, ["2026-11-26"]) && !S.boxSkippable({ ...o, status: "packing" }, ["2026-11-26"]),
    "not after the cut-off, once paid or packed, or for an ordinary order");

  // ---------- a household box end to end on the demo data layer ----------
  await repo.updateSettings({ max_days_ahead: 60 }); // lets the test create several weeks of boxes at once
  const settings = await repo.getSettings();
  const [products, slots, areas] = await Promise.all([repo.getProducts(), repo.getSlots(), repo.getAreas()]);
  await repo.customerRequestCode("6281377770091", "h1");
  const login = await repo.customerLogin("6281377770091", "h1", "t1");
  const customerId = login.customerId;
  const addr = (await repo.saveAddress(customerId, { label: "Rumah", recipient: "Ibu Uji Kotak", address: "Jl. Uji Kotak No. 1, Jakarta Selatan", area_id: "a_selatan", maps_url: null, is_default: true })).data;
  const D1 = availableDates(settings, nowJakarta())[0];
  const input = { name: "Kotak uji", weekdays: [S.isoWeekday(D1)], every_weeks: 1, slot_id: "s_pagi", payment_method: "qris", lines: [{ variant_id: "v_box_keluarga", qty: 1, prep_option_id: null }], note: null, address_id: addr.id };
  const addresses = await repo.listAddresses(customerId);
  check(S.validateBox(input, addresses, products, slots, areas, settings) === null, "a value box on a saved address is a valid weekly box");
  check(/satu hari/.test(S.validateBox({ ...input, weekdays: [1, 4] }, addresses, products, slots, areas, settings) || ""), "a box has exactly one delivery day");
  check(/QRIS atau transfer/.test(S.validateBox({ ...input, payment_method: "cod" }, addresses, products, slots, areas, settings) || ""), "a box is paid by QRIS or transfer (no COD, no tempo)");
  check(/minimal pesanan/.test(S.validateBox({ ...input, lines: [{ variant_id: "v_kecap_520", qty: 1, prep_option_id: null }] }, addresses, products, slots, areas, settings) || ""), "a box below the household minimum order is refused");
  check(/alamat/.test(S.validateBox({ ...input, address_id: "nope" }, addresses, products, slots, areas, settings) || ""), "a box needs one of the customer's own saved addresses");
  const bizOnly = products.flatMap((p) => p.variants).find((v) => v.business_only);
  if (bizOnly) check(/tidak tersedia/.test(S.validateBox({ ...input, lines: [{ variant_id: bizOnly.id, qty: bizOnly.min_qty, prep_option_id: null }] }, addresses, products, slots, areas, settings) || ""), "restaurant-only sizes cannot go into a household box");

  const box = (await repo.saveBox(customerId, { ...input, anchor_date: D1 })).data;
  const mine = (out, date) => out.find((r) => r.standing_order_id === box.id && r.date === date);
  let out = await S.runStandingOrders(repo, D1);
  const first = mine(out, D1);
  check(first && first.status === "placed", "catch-up: a box due on the run's own date is placed");
  const o1 = await repo.getOrder(first.order_id);
  check(o1.segment === "retail" && o1.customer_name === "Ibu Uji Kotak" && o1.phone === "6281377770091" && o1.client_ref === `so:${box.id}:${D1}`, "the order goes to the saved address under the verified number, at household prices");
  check(o1.pay_by === S.boxPayBy(D1, settings, Date.parse(o1.created_at)) || Math.abs(Date.parse(o1.pay_by) - Date.parse(S.boxPayBy(D1, settings))) < 5000, "its payment deadline follows the box rule, not the two-hour checkout window");
  out = await S.runStandingOrders(repo, D1);
  check(mine(out, D1).status === "already" && (await repo.listOrders({ q: "Ibu Uji Kotak" })).length === 1, "a second run never creates a second order");
  // two-day lead: the evening run for day D also prepares household boxes for D+1
  const D2 = addDays(D1, 7);
  out = await S.runStandingOrders(repo, addDays(D2, -1));
  const second = mine(out, D2);
  check(second && second.status === "placed", "the run for the day before also prepares the box (customer gets a day to pay)");
  const bahari = out.filter((r) => r.account_name === "Seafood Bahari Gading");
  check(bahari.every((r) => r.date === addDays(D2, -1)), "restaurant standing orders are still prepared for the run's own date only");

  // both boxes are left unpaid and cancelled automatically -> the box pauses itself instead of holding stock every week
  for (const id of [first.order_id, second.order_id]) await repo.setOrderPayBy(id, new Date(Date.now() - 60_000).toISOString());
  check((await repo.expireUnpaidOrders()) === 2, "both unpaid boxes are cancelled at their deadline");
  const D3 = addDays(D1, 14);
  out = await S.runStandingOrders(repo, D3);
  let b = (await repo.listStandingOrders({ customerId }))[0];
  check(mine(out, D3).status === "failed" && /Dijeda otomatis/.test(mine(out, D3).error) && b.status === "paused" && b.paused_reason === "unpaid", "after two unpaid boxes in a row the box is paused, with the reason recorded");
  await repo.setStandingOrderStatus(box.id, "active");
  b = (await repo.listStandingOrders({ customerId }))[0];
  check(b.status === "active" && b.paused_reason === null, "the customer can resume; the reason is cleared");
  out = await S.runStandingOrders(repo, D3);
  check(mine(out, D3).status === "placed", "after resuming, the next box is placed again (old unpaid boxes no longer count)");
  // a week the customer skipped on the order page does not count as unpaid
  await repo.updateOrderStatus(mine(out, D3).order_id, "cancelled", "Dilewati pelanggan (kotak mingguan)");
  const D4 = addDays(D1, 21);
  out = await S.runStandingOrders(repo, D4);
  await repo.setOrderPayBy(mine(out, D4).order_id, new Date(Date.now() - 60_000).toISOString());
  await repo.expireUnpaidOrders();
  out = await S.runStandingOrders(repo, addDays(D1, 28));
  check(mine(out, addDays(D1, 28)).status === "placed", "a skipped week followed by one unpaid week does not pause the box");
  // skip dates chosen in advance
  await repo.setStandingSkip(box.id, addDays(D1, 35), true);
  out = await S.runStandingOrders(repo, addDays(D1, 35));
  check(mine(out, addDays(D1, 35)).status === "skipped", "a week skipped in advance creates no order");
  // the address disappears -> paused with a reason, no failed run every week
  await repo.deleteAddress(customerId, addr.id);
  out = await S.runStandingOrders(repo, addDays(D1, 42));
  b = (await repo.listStandingOrders({ customerId }))[0];
  check(mine(out, addDays(D1, 42)).status === "failed" && b.status === "paused" && b.paused_reason === "address", "a box whose address was removed is paused with the reason");
  await repo.deleteCustomer(customerId);
  check((await repo.listStandingOrders({ customerId })).length === 0, "deleting the account removes its boxes");

  // ---------- receivables ledger ----------
  const today = "2026-11-24";
  const inv = (id, code, delivery, due, total, status = "unpaid") => ({ id, code, account_id: "acc", payment_method: "terms", status: "completed", payment_status: status, delivery_date: delivery, due_date: due, total_final: total, total_est: total, history: [], items: [] });
  const orders = [inv("o1", "A", "2026-11-01", "2026-11-04", 1000000), inv("o2", "B", "2026-11-18", "2026-11-21", 400000), inv("o3", "C", "2026-11-26", "2026-11-29", 300000)];
  const payments = [{ id: "p1", account_id: "acc", amount: 600000, paid_on: "2026-11-10", method: "transfer", reference: "", note: "", created_at: "2026-11-10T03:00:00Z" }];
  const allocations = [{ id: "a1", payment_id: "p1", order_id: "o1", amount: 600000, created_at: "2026-11-10T03:00:00Z" }];
  const l = R.buildLedger({ id: "acc", credit_limit: 1500000 }, orders, payments, allocations, today);
  check(l.outstanding === 1100000 && l.upcoming === 300000 && l.overdue === 800000 && l.credit === 0 && l.available === 400000, "ledger: outstanding, not-yet-delivered, overdue and credit left");
  check(l.aging.d15_30 === 400000 && l.aging.d1_7 === 400000 && l.aging.current === 0, "ledger: ageing by days past due (undelivered orders are not aged)");
  check(/jatuh tempo 04\/11\/2026/.test(R.termsBlock(l, { credit_limit: 1500000 }, { terms_grace_days: 3 }, 0, today) || ""), "tempo is refused for an invoice past the grace days");
  const ok = R.buildLedger({ id: "acc", credit_limit: 1500000 }, [orders[2]], [], [], today);
  check(R.termsBlock(ok, { credit_limit: 1500000 }, { terms_grace_days: 3 }, 1200000, today) === null && /sisa Rp1\.200\.000/.test(R.termsBlock(ok, { credit_limit: 1500000 }, { terms_grace_days: 3 }, 1200001, today) || ""), "tempo is refused only when the order passes the credit limit");
  const stm = R.buildStatement(l, "2026-11-05", today);
  check(stm.opening === 1000000 && stm.invoiced === 400000 && stm.received === 600000 && stm.closing === 800000, "statement: opening + invoices - payments = closing");

  // ---------- customer retention ----------
  const T = await jiti.import("../src/lib/retention.ts");
  const fact = (phone, date, total, extra = {}) => ({ code: "X", segment: "retail", account_id: null, phone, customer_name: "Ibu " + phone.slice(-2), delivery_date: date, total, ...extra });
  const facts = [
    fact("6281300000001", "2026-09-01", 200000), fact("6281300000001", "2026-09-15", 300000), fact("6281300000001", "2026-09-15", 100000), fact("6281300000001", "2026-09-29", 250000), // every two weeks, then silent
    fact("6281300000002", "2026-10-01", 180000), // once, long ago
    fact("6281300000003", "2026-10-20", 150000), fact("6281300000003", "2026-11-20", 150000), // came back, but after 31 days
    fact("6281300000004", "2026-11-18", 220000), // new: too early to judge
    fact("6281200000001", "2026-11-10", 2000000, { segment: "business", account_id: "ba_x", customer_name: "Resto X" }), fact("6281200000001", "2026-11-12", 1800000, { segment: "business", account_id: "ba_x", customer_name: "Resto X" }),
  ];
  const ret = T.buildRetention(facts, "2026-11-24");
  check(ret.customers === 5 && ret.bySegment.retail.customers === 4 && ret.bySegment.business.customers === 1, "retention: households by phone, restaurants by account");
  check(ret.eligible30 === 3 && ret.returned30 === 1, "repeat within 30 days counts only customers whose first order is old enough to judge (1 of 3)");
  check(ret.repeatCustomers === 3 && ret.bySegment.retail.medianGap === 14 && ret.bySegment.retail.aov === Math.round(1550000 / 8), "two orders for the same day are one visit; median gap and average order value");
  const sep = ret.cohorts.find((c) => c.month === "2026-09"), oct = ret.cohorts.find((c) => c.month === "2026-10");
  check(sep.customers === 1 && sep.returned30 === 1 && oct.customers === 2 && oct.returned === 1 && oct.returned30 === 0, "cohorts by first-order month: came back at all, and within 30 days");
  const quietKeys = ret.quiet.map((c) => c.phone);
  check(JSON.stringify(quietKeys) === JSON.stringify(["6281200000001", "6281300000001", "6281300000002"]), "quiet list: the restaurant after a week, the fortnightly household after a month, the one-time buyer; biggest spender first");
  check(!quietKeys.includes("6281300000003") && !quietKeys.includes("6281300000004") && ret.quiet.find((c) => c.phone === "6281300000001").threshold === 28, "recent customers are not quiet; the threshold stretches to twice a customer's usual gap");

  // ---------- ratings on the demo data layer ----------
  await repo.customerRequestCode("6281377770092", "h2");
  const rated = (await repo.placeOrder({ lines: [{ product_id: "p_salmon", variant_id: "v_salmon", qty: 3, prep_option_id: null }, { product_id: "p_dada", variant_id: "v_dada", qty: 2, prep_option_id: null }], customer_name: "Ibu Nilai", phone: "081377770093", address: "Jl. Uji Nilai 3", area_id: "a_selatan", delivery_date: availableDates(await repo.getSettings(), nowJakarta())[0], slot_id: "s_pagi", payment_method: "qris" }, null)).data;
  const lineOf = (pid) => rated.items.find((i) => i.product_id === pid).id;
  check(/setelah pesanan diterima/.test((await repo.createRating(rated.code, rated.phone, { stars: 5, comment: "", items: [] }, 14)).error || ""), "an order cannot be rated before it is delivered");
  await repo.markDelivered(rated.id, "Diterima", null);
  check(/tidak ditemukan/.test((await repo.createRating(rated.code, "081300000000", { stars: 5, comment: "", items: [] }, 14)).error || ""), "only the customer who placed the order can rate it");
  check(/tidak valid/.test((await repo.createRating(rated.code, rated.phone, { stars: 4, comment: "", items: [{ item_id: "nope", stars: 5 }] }, 14)).error || ""), "stars for a product that is not in the order are refused");
  const okRating = await repo.createRating(rated.code, rated.phone, { stars: 4, comment: "Segar", items: [{ item_id: lineOf("p_salmon"), stars: 5 }, { item_id: lineOf("p_dada"), stars: 2 }] }, 14);
  const summary = await repo.productRatings();
  check(okRating.ok && summary.p_salmon.average === 5 && summary.p_salmon.count === 1 && summary.p_dada.average === 2, "a rating is stored with stars per product");
  check(/sudah Anda nilai/.test((await repo.createRating(rated.code, rated.phone, { stars: 1, comment: "", items: [] }, 14)).error || ""), "one rating per order");
  check((await repo.getRatingForOrder(rated.id)).stars === 4 && (await repo.listRatings({ limit: 5 }))[0].order_code === rated.code, "the rating is found by order and listed with the order code");

  // ---------- gift orders on the demo data layer ----------
  const giftDate = availableDates(await repo.getSettings(), nowJakarta())[0];
  const giftInput = { lines: [{ product_id: "p_salmon", variant_id: "v_salmon", qty: 3, prep_option_id: null }], customer_name: "Ibu Penerima", phone: "081377770094", address: "Jl. Uji Hadiah 4, Jakarta Selatan", area_id: "a_selatan", delivery_date: giftDate, slot_id: "s_pagi", payment_method: "qris" };
  const g1 = await repo.placeOrder({ ...giftInput, gift: { recipient_phone: "0813 1111 6666", message: "Selamat ulang tahun, Bu!", from: "Rina" } }, null);
  check(g1.ok && g1.data.recipient_phone === "6281311116666" && g1.data.gift_message === "Selamat ulang tahun, Bu!" && g1.data.gift_from === "Rina" && g1.data.phone === "6281377770094", "a gift keeps the buyer's number for updates, the recipient's for the courier, and the card");
  check(/penerima hadiah tidak valid/.test((await repo.placeOrder({ ...giftInput, gift: { recipient_phone: "12", message: "", from: "" } }, null)).error || ""), "a gift needs a valid recipient number");
  const bahariAcc = (await repo.listAccounts()).find((a) => a.id === "ba_bahari");
  check(/Hadiah dibayar oleh pengirim/.test((await repo.placeOrder({ ...giftInput, lines: [{ product_id: "p_salmon", variant_id: "v_salmon", qty: 10, prep_option_id: null }], slot_id: "s_dapur", payment_method: "cod", gift: { recipient_phone: "081311117777", message: "", from: "" } }, bahariAcc)).error || ""), "a gift is never cash on delivery");
  const Tm = await jiti.import("../src/lib/notify/templates.ts");
  const settingsNow = await repo.getSettings();
  check(Tm.buildParams("received", g1.data, { settings: settingsNow, gatewayQris: false })[0] === "Rina" && Tm.buildParams("delivered", { ...g1.data, gift_from: null }, { settings: settingsNow, gatewayQris: false })[0] === "Bapak/Ibu" && Tm.buildParams("received", { ...g1.data, gift_message: null }, { settings: settingsNow, gatewayQris: false })[0] === "Ibu Penerima", "WhatsApp greets the buyer of a gift (sender's name, or a polite form), not the recipient");
  const facts2 = await repo.listOrderFacts(giftDate);
  check(facts2.find((f) => f.phone === "6281377770094").customer_name === "Rina", "retention names a gift's buyer, not its recipient");

  // ---------- trader's-pick box ----------
  const pick = (await repo.getProducts()).find((p) => p.curated);
  check(pick && pick.slug === "kotak-pilihan-pedagang" && pick.variants.length === 2 && pick.category_id === "c_paket", "the trader's-pick box is a value box with two sizes");
  check((await repo.setWeeklyContents("p_salmon", "x", null)).ok === false, "weekly contents can only be set on a trader's-pick box");
  await repo.setWeeklyContents(pick.id, "Kakap merah 1 ekor, udang windu 500 g", "Red snapper, tiger prawns 500 g");
  const pick2 = (await repo.getProducts()).find((p) => p.id === pick.id);
  check(pick2.weekly_contents === "Kakap merah 1 ekor, udang windu 500 g" && pick2.weekly_contents_en === "Red snapper, tiger prawns 500 g" && Boolean(pick2.weekly_contents_at), "this week's contents are stored with the time they were set");


  // ---------- seasonal pre-orders ----------
  const C = await jiti.import("../src/lib/campaigns.ts");
  const nowJ = nowJakarta();
  const cTest = { opens_on: "2026-12-01", order_by: "2026-12-27", deliver_from: "2026-12-30", deliver_to: "2026-12-31" };
  check(C.campaignState(cTest, { date: "2026-11-30", minutesOfDay: 600 }, "20:00") === "upcoming" && C.campaignState(cTest, { date: "2026-12-27", minutesOfDay: 1199 }, "20:00") === "open"
    && C.campaignState(cTest, { date: "2026-12-27", minutesOfDay: 1200 }, "20:00") === "closed" && C.campaignState(cTest, { date: "2027-01-01", minutesOfDay: 0 }, "20:00") === "over", "a pre-order opens on its day, closes at the cut-off on its last order day, and is over after its last delivery");
  check(C.dayRange("2026-12-30", "2026-12-31") === "30–31 Des" && C.dayRange("2026-12-31", "2027-01-02").includes("–") && C.dayRange("2027-02-06", "2027-02-06") === "6 Feb", "delivery days read as a short range");
  check(JSON.stringify(C.campaignDates({ ...cTest, is_active: true }, { cutoff_time: "20:00" }, { date: "2026-12-20", minutesOfDay: 600 })) === JSON.stringify(["2026-12-30", "2026-12-31"]), "a pre-order's delivery days lie beyond the usual six days ahead");
  check(/sebelum hari pengiriman pertama/.test(C.campaignError({ slug: "x-1", name: "Uji", ...cTest, order_by: "2026-12-30" }) || "") && /14 hari/.test(C.campaignError({ slug: "x-1", name: "Uji", ...cTest, deliver_to: "2027-01-20" }) || "") && C.campaignError({ slug: "x-1", name: "Uji", ...cTest }) === null, "a campaign closes before its deliveries start and delivers within two weeks");
  const camp = await repo.saveCampaign({ slug: "uji-musim", name: "Uji Musim", name_en: null, intro: "", intro_en: null, image_url: null, is_active: true,
    opens_on: addDays(nowJ.date, -1), order_by: addDays(nowJ.date, 3), deliver_from: addDays(nowJ.date, 10), deliver_to: addDays(nowJ.date, 12) });
  check(camp.ok && (await repo.saveCampaign({ ...camp.data, id: undefined })).error === "Alamat halaman ini sudah dipakai pre-order lain.", "each campaign has its own page address");
  const allP = await repo.getProducts({ includeInactive: true, includeCost: true });
  const udang = allP.find((p) => p.id === "p_ty_udang"), bakar = allP.find((p) => p.id === "p_ty_bakar");
  const strip = ({ variants, prep_options, ...rest }) => rest;
  await repo.upsertProduct({ ...strip(udang), campaign_id: camp.data.id });
  await repo.upsertProduct({ ...strip(bakar), campaign_id: camp.data.id });
  check((await repo.upsertProduct({ ...strip(udang), campaign_id: camp.data.id, is_catch_weight: true })).ok === false, "a pre-order product cannot be sold by weight");
  check(!C.everyday(await repo.getProducts()).some((p) => p.campaign_id), "pre-order products stay off the everyday shelves");
  const preDay = addDays(nowJ.date, 11);
  const preInput = { customer_name: "Ibu Musim", phone: "081377770095", address: "Jl. Uji Musim 5", area_id: "a_selatan", delivery_date: preDay, slot_id: "s_sore", payment_method: "qris", lines: [{ product_id: "p_ty_udang", variant_id: "v_ty_udang", qty: 2, prep_option_id: null }] };
  const stockBefore = udang.variants[0].stock_qty;
  const pre1 = await repo.placeOrder(preInput, null);
  check(pre1.ok && pre1.data.campaign_id === camp.data.id && pre1.data.delivery_date === preDay && pre1.data.pay_by && pre1.data.total_final !== null, "a pre-order is placed for a campaign day, with a known total and a payment deadline");
  check((await repo.getProducts()).find((p) => p.id === "p_ty_udang").variants[0].stock_qty === stockBefore - 2, "a pre-order takes from the limited quantity");
  check(/dikirim tanggal/.test((await repo.placeOrder({ ...preInput, delivery_date: availableDates(await repo.getSettings(), nowJ)[0] }, null)).error || ""), "a pre-order cannot be delivered outside its campaign days");
  await repo.updateSettings({ max_days_ahead: 6 }); // the box section above widened it
  const everydayFar = (await repo.placeOrder({ ...preInput, lines: [{ product_id: "p_kakap", variant_id: "v_kakap_l", qty: 3, prep_option_id: null }] }, null)).error || "";
  check(/Tanggal pengiriman tidak tersedia/.test(everydayFar), "an everyday order cannot use a campaign's far-off day" + (/Tanggal/.test(everydayFar) ? "" : ` (${everydayFar})`));
  check(/tidak dapat digabung/.test((await repo.placeOrder({ ...preInput, lines: [...preInput.lines, { product_id: "p_kakap", variant_id: "v_kakap_l", qty: 2, prep_option_id: null }] }, null)).error || ""), "a paid-in-advance pre-order cannot include weighed fish");
  check(/\(COD\) tidak tersedia/.test((await repo.placeOrder({ ...preInput, slot_id: "s_dapur", payment_method: "cod", lines: [{ product_id: "p_ty_bakar", variant_id: "v_ty_bakar_s", qty: 2, prep_option_id: null }] }, bahariAcc)).error || ""), "a pre-order is never cash on delivery");
  const preTerms = await repo.placeOrder({ ...preInput, customer_name: "Seafood Bahari Gading", slot_id: "s_dapur", payment_method: "terms", lines: [{ product_id: "p_ty_bakar", variant_id: "v_ty_bakar_s", qty: 2, prep_option_id: null }, { product_id: "p_kakap", variant_id: "v_kakap_l", qty: 3, prep_option_id: null }] }, bahariAcc);
  check(preTerms.ok && preTerms.data.campaign_id === camp.data.id, "a restaurant on tempo may add weighed fish to its pre-order");
  const camp2 = await repo.saveCampaign({ ...camp.data, id: undefined, slug: "uji-musim-2", name: "Uji Musim Dua" });
  await repo.upsertProduct({ ...strip(bakar), campaign_id: camp2.data.id });
  check(/satu pre-order musiman/.test((await repo.placeOrder({ ...preInput, lines: [...preInput.lines, { product_id: "p_ty_bakar", variant_id: "v_ty_bakar_s", qty: 1, prep_option_id: null }] }, null)).error || ""), "one order holds one campaign");
  await repo.saveCampaign({ ...camp2.data, is_active: false });
  check(/belum dibuka/.test((await repo.placeOrder({ ...preInput, lines: [{ product_id: "p_ty_bakar", variant_id: "v_ty_bakar_s", qty: 1, prep_option_id: null }] }, null)).error || ""), "a switched-off campaign takes no orders");
  await repo.saveCampaign({ ...camp2.data, is_active: true, opens_on: addDays(nowJ.date, -5), order_by: addDays(nowJ.date, -1) });
  check(/sudah ditutup/.test((await repo.placeOrder({ ...preInput, lines: [{ product_id: "p_ty_bakar", variant_id: "v_ty_bakar_s", qty: 1, prep_option_id: null }] }, null)).error || ""), "a closed campaign takes no orders");
  await repo.setPaymentStatus(pre1.data.id, "paid");
  await repo.placeOrder({ ...preInput, phone: "081377770096", delivery_date: addDays(nowJ.date, 12), lines: [{ product_id: "p_ty_udang", variant_id: "v_ty_udang", qty: 1, prep_option_id: null }] }, null);
  const sum = C.campaignSummary(await repo.listOrders({ campaignId: camp.data.id }), new Set(["p_ty_udang", "p_ty_bakar"]));
  const row = sum.plan.find((r) => r.variant_id === "v_ty_udang");
  check(sum.orders === 3 && row.byDate[preDay].paid === 2 && row.byDate[addDays(nowJ.date, 12)].unpaid === 1 && sum.plan.find((r) => r.variant_id === "v_ty_bakar_s").paid === 2, "the buying plan splits paid (and tempo) quantities from unpaid ones, per delivery day");


  // ---------- virtual accounts, refunds, tax details, quotations ----------
  const Sa = await jiti.import("../src/lib/sales.ts");
  check(Sa.formatNpwp("012345678901000") === "01.234.567.8-901.000" && Sa.formatNpwp("0123 4567 8901 2345") === "0123 4567 8901 2345" && Sa.npwpError("12.345") === "NPWP harus 15 atau 16 angka." && Sa.npwpError("") === null, "NPWP: 15 or 16 digits, printed in its usual format");
  check(Sa.quoteState({ status: "sent", valid_until: "2026-12-01" }, "2026-12-02") === "expired" && Sa.quoteState({ status: "sent", valid_until: "2026-12-01" }, "2026-12-01") === "sent", "a sent quotation expires after its acceptance day");
  const vaDay = availableDates(await repo.getSettings(), nowJakarta())[0];
  const vaOrder = (await repo.placeOrder({ lines: [{ product_id: "p_dada", variant_id: "v_dada", qty: 4, prep_option_id: null }], customer_name: "Ibu VA", phone: "081377770097", address: "Jl. Uji VA", area_id: "a_selatan", delivery_date: vaDay, slot_id: "s_pagi", payment_method: "transfer" }, null)).data;
  await repo.createPayment({ id: "VA-T1", order_id: vaOrder.id, account_id: null, provider: "mock", method: "va", amount: vaOrder.total_final, qr_string: null, qr_url: null, va_bank: "bca", va_number: "8808000000000001", expires_at: new Date(Date.now() + 3600e3).toISOString() });
  check(await repo.recordGatewayPayment("VA-T1", "paid", vaOrder.total_final, {}) === "paid" && (await repo.getOrder(vaOrder.id)).history.at(-1).note === "Virtual account otomatis", "a virtual-account transfer pays the order");
  const vaAcc = (await repo.listAccounts()).find((a) => a.payment_terms !== "prepaid" && a.status === "approved");
  const before = (await repo.listReceivables({ accountId: vaAcc.id })).payments.length;
  await repo.createPayment({ id: "VA-T2", order_id: null, account_id: vaAcc.id, provider: "mock", method: "va", amount: 250000, qr_string: null, qr_url: null, va_bank: "bni", va_number: "9888000000000002", expires_at: new Date(Date.now() + 3600e3).toISOString() });
  const vaOut = await repo.recordGatewayPayment("VA-T2", "paid", 250000, {});
  const accPays = (await repo.listReceivables({ accountId: vaAcc.id })).payments;
  check(vaOut === "paid" && accPays.length === before + 1 && accPays.some((p) => p.method === "va" && p.amount === 250000 && p.reference === "VA-T2") && await repo.recordGatewayPayment("VA-T2", "paid", 250000, {}) === "noop", "a restaurant's virtual-account payment is recorded once against its invoices");
  await repo.updateOrderStatus(vaOrder.id, "cancelled", "uji");
  check((await repo.getOrder(vaOrder.id)).payment_status === "refund_due", "a paid order that is cancelled waits for a refund");
  check(/melebihi dana/.test((await repo.recordRefund(vaOrder.id, { amount: vaOrder.total_final + 1, refunded_on: nowJakarta().date, method: "transfer", reference: "", proof: null, note: "", claim_id: null })).error || ""), "a refund cannot exceed what was received");
  check(/1 pesanan menunggu pengembalian dana: /.test((await (await jiti.import("../src/lib/brief.ts")).buildBrief(repo, vaDay)).text), "the brief lists orders waiting for a refund");
  const rf = await repo.recordRefund(vaOrder.id, { amount: vaOrder.total_final, refunded_on: nowJakarta().date, method: "transfer", reference: "BCA 9", proof: "data:image/jpeg;base64,AAAA", note: "", claim_id: null });
  check(rf.ok && (await repo.getOrder(vaOrder.id)).payment_status === "void" && (await repo.listRefunds({ orderId: vaOrder.id }))[0].order_code === vaOrder.code, "recording the refund closes the order and lists it with its code");
  const qToday = nowJakarta().date;
  const qBase = { account_id: null, business_name: "Hotel Uji Rules", contact_name: "Bu Rules", phone: "0813 7777 0098", address: "Jl. Uji", business_type: "Katering", npwp: "01.234.567.8-901.000", tax_name: "PT Uji", tax_address: null, lines: [{ variant_id: "v_salmon", price: 87000, note: "" }], valid_until: addDays(qToday, 7), price_from: qToday, price_to: null, note: "" };
  check(/sebelum hari ini/.test((await repo.saveQuote({ ...qBase, valid_until: addDays(qToday, -1) })).error || "") && /dua kali/.test((await repo.saveQuote({ ...qBase, lines: [...qBase.lines, ...qBase.lines] })).error || ""), "a quotation needs a future acceptance day and one line per size");
  const qt = (await repo.saveQuote(qBase)).data;
  check(qt.status === "draft" && /^PN-\d{4}-[A-Z0-9]{4}$/.test(qt.code) && qt.npwp === "012345678901000" && qt.phone === "6281377770098", "a new quotation is a draft with its own number");
  check(/tidak berlaku lagi/.test((await repo.acceptQuote(qt.id, "Bu Rules")).error || ""), "a draft cannot be accepted");
  await repo.setQuoteStatus(qt.id, "sent");
  const accId = (await repo.acceptQuote(qt.id, "Bu Rules")).data;
  const newAcc = await repo.getAccount(accId);
  check(newAcc.status === "pending" && newAcc.npwp === "012345678901000" && (await repo.listContractPrices(accId)).some((c) => c.variant_id === "v_salmon" && c.price === 87000 && c.starts_on === qToday), "accepting gives a prospect a pending account with the quoted contract prices");
  check((await repo.saveQuote({ ...qBase, id: qt.id })).error === "Penawaran yang sudah diterima tidak dapat diubah." && /sudah diterima/.test((await repo.acceptQuote(qt.id, "Bu Rules")).error || ""), "an accepted quotation cannot be changed or accepted twice");


  // ---------- daily prices and the price card ----------
  const Dp = await jiti.import("../src/lib/dailyPrice.ts");
  const Pc = await jiti.import("../src/lib/priceCard.ts");
  const dpToday = nowJakarta().date;
  const buy = (date, product_id, qty, total_cost, unit = "kg", kind = "purchase") => ({ id: Math.random().toString(36), delivery_date: date, product_id, kind, qty, unit, total_cost, supplier: "", note: "", created_at: "" });
  const kakap = { id: "p_k", name: "Kakap", category_id: "c_ikan", is_active: true, available_today: true, storage_class: "chilled", is_catch_weight: true, sort: 1, campaign_id: null,
    variants: [{ id: "v_l", unit: "kg", cost: 78000, price_retail: 115000, price_business: 92000, business_only: false, is_active: true, sort: 1, label: "1–2 kg" }, { id: "v_s", unit: "kg", cost: 68000, price_retail: 98000, price_business: 80000, business_only: false, is_active: true, sort: 2, label: "500–800 g" }] };
  const pcs = Dp.purchaseCosts([buy(dpToday, "p_k", 14, 1218000), buy(addDays(dpToday, -2), "p_k", 10, 820000), buy(dpToday, "p_k", 3, 0, "kg", "waste"), buy(addDays(dpToday, -9), "p_k", 5, 1000000)], dpToday);
  const pk = pcs.get("p_k|kg");
  check(pk.latest.perUnit === 87000 && pk.latest.date === dpToday && Math.round(pk.recent.perUnit) === 84917 && pk.recent.days === 2, "the morning's cost per kg, and the 7-day average, from purchases only (waste and older days left out)");
  const sl = Dp.sizeCost(kakap, kakap.variants[0], pcs, dpToday), ss = Dp.sizeCost(kakap, kakap.variants[1], pcs, dpToday);
  check(sl.cost === 92959 && ss.cost === 81041 && sl.source === "today" && Math.round((sl.cost * 14 * 0 + sl.cost + ss.cost) / 2) === 87000, "the morning's average is spread across sizes in the proportion of their stored costs");
  check(Dp.sizeCost(kakap, kakap.variants[0], new Map(), dpToday).source === "stored", "without purchases the stored cost is used");
  check(Dp.suggestPrice(92959, 20) === 117000 && Dp.suggestPrice(92959, 12) === 106000 && Dp.suggestPrice(0, 20) === 0 && Math.round(Dp.marginPct(115000, 92959)) === 19, "suggested prices keep the target margin, rounded up to Rp1.000");
  const rowsDp = Dp.priceRows([kakap], [buy(dpToday, "p_k", 14, 1218000)], { target_margin_retail: 20, target_margin_business: 12 }, dpToday);
  check(rowsDp.length === 2 && rowsDp[0].low_retail && rowsDp[0].low_business && rowsDp[0].suggest_retail === 117000, "a size whose price is under target at today's cost is flagged with its suggestion");
  const accs = [{ id: "a1", business_name: "Resto A", status: "approved" }, { id: "a2", business_name: "Resto B", status: "suspended" }];
  const ctr = [
    { id: "c_old", account_id: "a1", variant_id: "v_l", price: 120000, starts_on: addDays(dpToday, -60), ends_on: null },
    { id: "c_now", account_id: "a1", variant_id: "v_l", price: 92000, starts_on: addDays(dpToday, -5), ends_on: null },
    { id: "c_gone", account_id: "a1", variant_id: "v_s", price: 70000, starts_on: addDays(dpToday, -30), ends_on: addDays(dpToday, -1) },
    { id: "c_susp", account_id: "a2", variant_id: "v_l", price: 80000, starts_on: addDays(dpToday, -5), ends_on: null },
  ];
  const al = Dp.contractAlerts(ctr, accs, [kakap], [buy(dpToday, "p_k", 14, 1218000)], { target_margin_business: 12 }, dpToday);
  check(al.length === 1 && al[0].contract_id === "c_now" && al[0].margin < 0, "contract watch takes the price in force today, skips ended contracts and suspended accounts");
  check(Dp.priceChangeError({ variant_id: "x", cost: 1, price_retail: 0, price_business: 1 }, { business_only: false, name: "X" }) !== null && Dp.priceChangeError({ variant_id: "x", cost: 1, price_retail: 0, price_business: 1 }, { business_only: true, name: "X" }) === null, "a household price of zero is only allowed for restaurant-only sizes");
  const allP2 = await repo.getProducts();
  const cats = await repo.getCategories();
  const cr = Pc.cardRows(allP2, cats, ["v_kakap_l", "v_kakap_s", "v_kembung", "v_udang_40", "v_telur_tray", "v_ty_udang"], "retail", 5);
  check(cr.lines <= 5 && cr.groups[0].category === "Ikan segar" && cr.more > 0 && !cr.groups.some((g) => g.rows.some((r) => r.variant_id === "v_ty_udang")), "the card fits rows and headings in its lines, mentions the rest, and leaves pre-orders out");
  const busOnly = allP2.flatMap((p) => p.variants).find((v) => v.business_only);
  check(busOnly && Pc.cardRows(allP2, cats, [busOnly.id], "retail").total === 0 && Pc.cardRows(allP2, cats, [busOnly.id], "business").total === 1, "restaurant-only sizes appear on the restaurant card only");
  check((await repo.listPurchases({ date: dpToday })).some((p) => p.note === "Contoh data demo"), "demo mode has this morning's purchases to price from");

  // ---------- morning brief ----------
  const B = await jiti.import("../src/lib/brief.ts");
  const briefDate = giftDate;
  const brief = await B.buildBrief(repo, briefDate);
  check(brief.text.startsWith("Ringkasan pagi · ") && /Pengiriman: \d+ pesanan/.test(brief.text) && /Belanja subuh \(\d+ baris, \d+ segar\):/.test(brief.text), "the brief opens with the day's deliveries and the buying list");
  check(/hadiah \(tanpa nota harga\)/.test(brief.text), "the brief counts gifts, so nobody packs a price note");
  check(/Piutang lewat jatuh tempo Rp/.test(brief.text) && /RM Padang Sinar Minang/.test(brief.text) && brief.attention >= 1, "the brief lists overdue receivables under 'needs attention'");
  check(/Pre-order Uji Musim: 3 pesanan \(2 lunas\/tempo\)/.test(brief.text), "the brief reports open pre-orders: orders, paid and when they close");
  check(brief.text.length <= 3500 && brief.text.split("\n").filter((l) => l.startsWith("• ")).length <= 20, "the brief stays short enough for one chat message");
  const quiet = await B.buildBrief(repo, "2030-01-01");
  check(/Tidak ada pengiriman hari ini\./.test(quiet.text) && !/Belanja subuh/.test(quiet.text), "a day without deliveries says so and lists no buying");

  console.log(fails ? `\n${fails} FAILURES` : `\nALL RULES CHECKS PASSED (${oks})`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
