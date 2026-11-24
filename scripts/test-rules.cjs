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

  console.log(fails ? `\n${fails} FAILURES` : `\nALL RULES CHECKS PASSED (${oks})`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
