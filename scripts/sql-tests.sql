-- Behavioural tests for the server-side order logic. Each block raises on failure.
\set ON_ERROR_STOP on

create or replace function _expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if position(needle in sqlerrm) = 0 then
      raise exception 'expected error containing "%", got "%"', needle, sqlerrm;
    end if;
    return;
  end;
  raise exception 'expected an error containing "%", but call succeeded: %', needle, sql;
end $$;

-- A delivery date that is always valid: tomorrow if before cut-off, else the day after.
create or replace function _date() returns text language sql as $$
  select (jakarta_now()::date + case when jakarta_now()::time < '20:00'::time then 1 else 2 end)::text
$$;

do $$
declare oid text; o orders%rowtype; n int; stock_before numeric; stock_after numeric; tok text; v_code text; summ jsonb;
begin
  -- 1. Retail order: prices from the price list, prep surcharge, catch weight, delivery fee, first-order promo
  select stock_qty into stock_before from variants where id = 'v_udang_beku';
  oid := place_order(jsonb_build_object(
    'customer_name', 'Ibu Test', 'phone', '0812-3456-7890', 'address', 'Jl. Uji 1', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_pagi', 'payment_method', 'qris', 'promo_code', 'selamatdatang',
    'lines', jsonb_build_array(
      jsonb_build_object('variant_id', 'v_udang_60', 'qty', 1, 'prep_option_id', 'pp_udang_kupas'),
      jsonb_build_object('variant_id', 'v_udang_beku', 'qty', 2))));
  select * into o from orders where id = oid;
  if o.segment <> 'retail' then raise exception 'segment'; end if;
  if o.phone <> '6281234567890' then raise exception 'phone normalisation: %', o.phone; end if;
  -- udang 60: 105000 + 12000 = 117000 ×1; udang beku 72000 ×2 = 144000; subtotal 261000
  if o.subtotal_est <> 261000 then raise exception 'subtotal %', o.subtotal_est; end if;
  if o.discount <> 26100 then raise exception 'promo discount %', o.discount; end if;
  if o.delivery_fee <> 0 then raise exception 'free delivery above 250k expected, got %', o.delivery_fee; end if;
  if not o.has_catch_weight or o.total_final is not null then raise exception 'catch weight flags'; end if;
  select stock_qty into stock_after from variants where id = 'v_udang_beku';
  if stock_after <> stock_before - 2 then raise exception 'stock not reserved'; end if;
  select used_count into n from promos where code = 'SELAMATDATANG';
  if n <> 1 then raise exception 'promo usage'; end if;

  -- 2. Weigh and re-price
  perform weigh_order(oid, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 0.9)) from order_items where order_id = oid and is_catch_weight));
  select * into o from orders where id = oid;
  -- 117000×0.9 = 105300 + 144000 = 249300 → below the 250k threshold, but free delivery was granted at order time
  -- and is never taken back because the fish weighed lighter; promo 10% = 24930
  if o.subtotal_final <> 249300 then raise exception 'weighed subtotal %', o.subtotal_final; end if;
  if o.delivery_fee <> 0 then raise exception 'fee after weighing %', o.delivery_fee; end if;
  if o.discount <> 24930 then raise exception 'discount after weighing %', o.discount; end if;
  if o.total_final <> 249300 - 24930 then raise exception 'total_final %', o.total_final; end if;

  -- 3. Second order from the same phone cannot use the first-order promo
  perform _expect_error(format($q$select place_order('{"customer_name":"Ibu Test","phone":"081234567890","address":"x","area_id":"a_selatan","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","promo_code":"SELAMATDATANG","lines":[{"variant_id":"v_udang_beku","qty":3}]}'::jsonb)$q$, _date()), 'pesanan pertama');

  -- 4. Minimum order, business-only variant, stock, availability, cut-off
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_nugget","qty":1}]}'::jsonb)$q$, _date()), 'minimal pesanan Rp');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_telur_peti","qty":1}]}'::jsonb)$q$, _date()), 'khusus untuk akun bisnis');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_salmon","qty":99}]}'::jsonb)$q$, _date()), 'stok tersisa');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_baronang","qty":2}]}'::jsonb)$q$, _date()), 'habis hari ini');
  perform _expect_error($q$select place_order(('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"' || jakarta_now()::date || '","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_salmon","qty":2}]}')::jsonb)$q$, 'Tanggal pengiriman');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_dapur","payment_method":"qris","lines":[{"variant_id":"v_salmon","qty":2}]}'::jsonb)$q$, _date()), 'Jam pengiriman');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"cod","lines":[{"variant_id":"v_salmon","qty":2}]}'::jsonb)$q$, _date()), 'Bayar di tempat');

  -- 5. Business account: wholesale price, account discount, terms, business-only variant, kitchen slot
  oid := place_order(jsonb_build_object(
    'customer_name', 'RM Padang Sinar Minang', 'phone', '6281200000002', 'address', 'Sunter', 'area_id', 'a_utara',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms',
    'lines', jsonb_build_array(
      jsonb_build_object('variant_id', 'v_kembung', 'qty', 10, 'prep_option_id', 'pp_kembung_siangi'),
      jsonb_build_object('variant_id', 'v_ayam8', 'qty', 6),
      jsonb_build_object('variant_id', 'v_telur_peti', 'qty', 1))), 'ba_minang');
  select * into o from orders where id = oid;
  if o.segment <> 'business' then raise exception 'business segment'; end if;
  -- kembung 36000×0.98 = 35280 + 3000 = 38280 ×10 = 382800; ayam 42000×0.98=41160 ×6 = 246960; telur peti 410000×0.98=401800
  if o.subtotal_est <> 382800 + 246960 + 401800 then raise exception 'business subtotal %', o.subtotal_est; end if;
  if o.delivery_fee <> 0 then raise exception 'business free delivery'; end if;
  if o.payment_method <> 'terms' then raise exception 'terms'; end if;

  -- 6. Slot capacity: fill s_sore (capacity 12) then expect a refusal
  for n in 1..12 loop
    perform place_order(jsonb_build_object('customer_name', 'C'||n, 'phone', '0813000000' || lpad(n::text, 2, '0'), 'address', 'x', 'area_id', 'a_pusat',
      'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'transfer',
      'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_dada', 'qty', 3))));
  end loop;
  perform _expect_error(format($q$select place_order('{"customer_name":"C","phone":"081399999999","address":"x","area_id":"a_pusat","delivery_date":"%s","slot_id":"s_sore","payment_method":"transfer","lines":[{"variant_id":"v_dada","qty":3}]}'::jsonb)$q$, _date()), 'sudah penuh');

  -- 7. Cancel returns stock and voids payment
  select stock_qty into stock_before from variants where id = 'v_dada';
  select id into oid from orders where customer_name = 'C1';
  perform set_order_status(oid, 'cancelled', 'uji');
  select stock_qty into stock_after from variants where id = 'v_dada';
  if stock_after <> stock_before + 3 then raise exception 'stock not returned'; end if;
  select * into o from orders where id = oid;
  if o.payment_status <> 'void' or o.status <> 'cancelled' then raise exception 'cancel state'; end if;
  perform _expect_error(format('select set_order_status(%L, %L)', oid, 'confirmed'), 'sudah dibatalkan');

  -- 8. Customer payment confirmation and tracking lookup
  select orders.code into v_code from orders where customer_name = 'C2';
  perform customer_confirm_payment(v_code, '081300000002');

  if (select payment_status from orders where orders.code = v_code) <> 'awaiting_confirmation' then raise exception 'awaiting confirmation'; end if;
  perform _expect_error(format('select customer_confirm_payment(%L, %L)', v_code, '0899'), 'tidak ditemukan');
  perform set_payment_status((select id from orders where orders.code = v_code), 'paid');

  -- 9. Business login and sessions
  tok := business_login('0812-0000-0001', 'bhr123');
  if tok is null then raise exception 'login should succeed'; end if;
  if business_login('081200000001', 'WRONG1') is not null then raise exception 'wrong code accepted'; end if;
  if business_login('081200000003', 'ANY') is not null then raise exception 'pending account logged in'; end if;

  -- 10. Account application and approval
  oid := apply_account('{"business_name":"Warung Uji","contact_name":"Budi","phone":"081277777777","area_id":"a_utara","business_type":"Warung / reseller frozen"}'::jsonb);
  perform _expect_error($q$select apply_account('{"business_name":"Dup","contact_name":"B","phone":"081277777777"}'::jsonb)$q$, 'sudah terdaftar');
  perform approve_account(oid, 2.5, 'days3', true);
  if (select access_code from business_accounts where id = oid) !~ '^[A-Z2-9]{6}$' then raise exception 'access code'; end if;
  v_code := regenerate_access_code(oid);
  if (select access_code from business_accounts where id = oid) <> v_code then raise exception 'regenerate'; end if;

  -- 11. Reporting functions run and add up
  summ := daily_summary(_date()::date);
  if (summ->>'orders_total')::int <> 13 then raise exception 'orders_total %', summ->>'orders_total'; end if;
  if (summ->>'orders_business')::int <> 1 then raise exception 'orders_business'; end if;
  if (summ->>'to_weigh')::int <> 1 then raise exception 'to_weigh %', summ->>'to_weigh'; end if;
  if (summ->>'non_seafood_share_pct')::numeric <= 0 then raise exception 'non seafood share'; end if;
  if (select count(*) from buying_list(_date()::date)) < 4 then raise exception 'buying list'; end if;
  if (select sum(orders) from sales_report(_date()::date, _date()::date)) <> 13 then raise exception 'sales report'; end if;
  if (select qty_with_buffer from buying_list(_date()::date) where product_name = 'Kembung') <> 10.5 then raise exception 'buffer'; end if;

  -- 12. Standing orders: constraints and the idempotent run lock
  insert into standing_orders (id, account_id, name, weekdays, slot_id, payment_method, lines)
    values ('so_t1', oid, 'Tes rutin', array[1,3,5], 's_dapur', 'transfer', '[{"variant_id":"v_kakap_l","qty":2,"prep_option_id":null}]'::jsonb);
  perform _expect_error($q$insert into standing_orders (id, account_id, weekdays, slot_id, payment_method, lines) select 'so_bad', account_id, array[0], 's_dapur', 'transfer', lines from standing_orders where id = 'so_t1'$q$, 'check constraint');
  perform _expect_error($q$insert into standing_orders (id, account_id, weekdays, slot_id, payment_method, lines) select 'so_bad2', account_id, array[2], 's_dapur', 'transfer', '[]'::jsonb from standing_orders where id = 'so_t1'$q$, 'check constraint');
  insert into standing_order_runs (id, standing_order_id, delivery_date) values ('sr_t1', 'so_t1', _date()::date);
  perform _expect_error(format($q$insert into standing_order_runs (id, standing_order_id, delivery_date) values ('sr_t2', 'so_t1', '%s')$q$, _date()), 'duplicate key');
  delete from standing_orders where id = 'so_t1';
  if exists (select 1 from standing_order_runs where id = 'sr_t1') then raise exception 'standing run cascade'; end if;

  -- 13. Audit regressions: quantity bounds, idempotency, maps links, weighing, status machine, payments, reports
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_salmon","qty":"NaN"}]}'::jsonb)$q$, _date()), 'jumlah tidak valid');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_salmon","qty":"Infinity"}]}'::jsonb)$q$, _date()), 'maksimal 500');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_salmon","qty":-3}]}'::jsonb)$q$, _date()), 'jumlah tidak valid');
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_kakap_l","qty":100000}]}'::jsonb)$q$, _date()), 'maksimal 500');

  oid := place_order(jsonb_build_object('customer_name', 'Audit Idem', 'phone', '081277770001', 'address', 'Jl. Uji 1', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_pagi', 'payment_method', 'qris', 'client_ref', 'ref-audit-1', 'maps_url', 'javascript:alert(1)',
    'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 2), jsonb_build_object('variant_id', 'v_salmon', 'qty', 1))));
  if place_order(jsonb_build_object('customer_name', 'Audit Idem', 'phone', '081277770001', 'address', 'Jl. Uji 1', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_pagi', 'payment_method', 'qris', 'client_ref', 'ref-audit-1',
    'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 2)))) <> oid then raise exception 'idempotent retry made a new order'; end if;
  if (select count(*) from orders where client_ref = 'ref-audit-1') <> 1 then raise exception 'duplicate order for one client_ref'; end if;
  if (select maps_url from orders where id = oid) is not null then raise exception 'non-Google maps link kept'; end if;

  -- weighing: missing weight, then no marking paid before weighing, then no re-weigh after paid
  perform _expect_error(format($q$select weigh_order('%s', '[]'::jsonb)$q$, oid), 'Isi berat semua');
  perform _expect_error(format($q$select weigh_order('%s', (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', null)) from order_items where order_id = '%s' and is_catch_weight))$q$, oid, oid), 'Berat tidak valid');
  perform _expect_error(format($q$select set_payment_status('%s', 'paid')$q$, oid), 'Timbang pesanan');
  perform weigh_order(oid, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.2)) from order_items where order_id = oid and is_catch_weight));
  perform set_payment_status(oid, 'paid');
  perform _expect_error(format($q$select weigh_order('%s', (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.6)) from order_items where order_id = '%s' and is_catch_weight))$q$, oid, oid), 'sudah lunas');

  -- status machine: no going back; cancelling a paid order flags a refund and frees promo usage / stock
  perform set_order_status(oid, 'packing');
  perform _expect_error(format($q$select set_order_status('%s', 'new')$q$, oid), 'tidak dapat dimundurkan');
  select stock_qty into stock_before from variants where id = 'v_salmon';
  perform set_order_status(oid, 'cancelled');
  if (select payment_status from orders where id = oid) <> 'refund_due' then raise exception 'paid + cancelled should be refund_due'; end if;
  select stock_qty into stock_after from variants where id = 'v_salmon';
  if stock_after <> stock_before + 1 then raise exception 'stock not returned on cancel'; end if;
  perform _expect_error(format($q$select set_payment_status('%s', 'paid')$q$, oid), 'Pesanan dibatalkan');
  perform set_payment_status(oid, 'void');

  oid := place_order(jsonb_build_object('customer_name', 'Audit Kirim', 'phone', '081277770002', 'address', 'Jl. Uji 2', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_pagi', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  perform set_order_status(oid, 'delivering');
  perform _expect_error(format($q$select set_order_status('%s', 'cancelled')$q$, oid), 'sudah dikirim');

  -- promo usage is returned on cancel
  select used_count into n from promos where code = 'SELAMATDATANG';
  oid := place_order(jsonb_build_object('customer_name', 'Audit Promo', 'phone', '081277770003', 'address', 'Jl. Uji 3', 'area_id', 'a_selatan', 'promo_code', 'SELAMATDATANG',
    'delivery_date', _date(), 'slot_id', 's_pagi', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  perform set_order_status(oid, 'cancelled');
  if (select used_count from promos where code = 'SELAMATDATANG') <> n then raise exception 'promo usage not returned on cancel'; end if;

  -- sales report: whole rupiah (no division drift) and gross profit net of promo discounts
  if exists (select 1 from sales_report(_date()::date, _date()::date) where sales <> round(sales) or gross_profit <> round(gross_profit)) then raise exception 'sales report drift'; end if;

  -- 14. Access-code guessing is locked out after 5 failures; codes use the unambiguous alphabet
  delete from login_attempts;
  for i in 1..5 loop perform business_login('081200000001', 'WRONG' || i); end loop;
  perform _expect_error($q$select business_login('081200000001', 'BHR123')$q$, 'Terlalu banyak');
  delete from login_attempts;
  if business_login('081200000001', 'BHR123') is null then raise exception 'login after lockout reset'; end if;
  if random_code(6) !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then raise exception 'random_code alphabet'; end if;

  -- 15. Unpaid household orders expire and release stock; any payment clears the deadline; weighed orders get none
  update delivery_slots set capacity = 100 where id = 's_sore';
  update variants set stock_qty = 50 where id = 'v_salmon';
  oid := place_order(jsonb_build_object('customer_name', 'Audit Expire', 'phone', '081277770004', 'address', 'Jl. Uji 4', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  if (select pay_by from orders where id = oid) is null then raise exception 'pay_by not set on a household QRIS order with a known total'; end if;
  if (select pay_by from orders where id = oid) > (_date()::timestamp at time zone 'Asia/Jakarta') then raise exception 'pay_by later than the start of the delivery day'; end if;
  select stock_qty into stock_before from variants where id = 'v_salmon';
  perform expire_unpaid_orders();
  if (select status from orders where id = oid) = 'cancelled' then raise exception 'order expired before its deadline'; end if;
  update orders set pay_by = now() - interval '1 minute' where id = oid;
  if expire_unpaid_orders() < 1 then raise exception 'expire_unpaid_orders cancelled nothing'; end if;
  if (select status || '/' || payment_status from orders where id = oid) <> 'cancelled/void' then raise exception 'expired order should be cancelled/void'; end if;
  select stock_qty into stock_after from variants where id = 'v_salmon';
  if stock_after <> stock_before + 2 then raise exception 'expired order did not return stock'; end if;
  if not exists (select 1 from orders where id = oid and history::text like '%Dibatalkan otomatis%') then raise exception 'expiry not recorded in history'; end if;
  if not exists (select 1 from job_runs where job = 'expire_unpaid') then raise exception 'expiry run not recorded'; end if;

  oid := place_order(jsonb_build_object('customer_name', 'Audit Bayar', 'phone', '081277770005', 'address', 'Jl. Uji 5', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'transfer', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  perform customer_confirm_payment((select code from orders where id = oid), '081277770005');
  if (select pay_by from orders where id = oid) is not null then raise exception '"I have paid" should clear the deadline'; end if;
  perform set_payment_status(oid, 'unpaid');
  perform expire_unpaid_orders();
  if (select status from orders where id = oid) = 'cancelled' then raise exception 'order with a payment claim was auto-cancelled'; end if;

  oid := place_order(jsonb_build_object('customer_name', 'Audit Timbang', 'phone', '081277770006', 'address', 'Jl. Uji 6', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 2))));
  if (select pay_by from orders where id = oid) is not null then raise exception 'weighed order must not get a payment deadline'; end if;
  update settings set payment_window_minutes = 0;
  oid := place_order(jsonb_build_object('customer_name', 'Audit Nol', 'phone', '081277770007', 'address', 'Jl. Uji 7', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  if (select pay_by from orders where id = oid) is not null then raise exception 'window 0 should disable expiry'; end if;
  update settings set payment_window_minutes = 120;

  -- 16. Rate limits count per key inside the window
  for i in 1..3 loop if not hit_rate_limit('test:a', 60, 3) then raise exception 'rate limit refused below the limit'; end if; end loop;
  if hit_rate_limit('test:a', 60, 3) then raise exception 'rate limit not enforced'; end if;
  if not hit_rate_limit('test:b', 60, 3) then raise exception 'rate limit keys are not independent'; end if;

  -- 17. Errors are grouped by fingerprint; a resolved error that comes back starts a new count
  if log_error('server', 'Boom', '/x', null, null) <> 1 then raise exception 'new error count'; end if;
  if log_error('server', 'Boom', '/x', 'd1', 'stack') <> 2 then raise exception 'repeat error count'; end if;
  update error_events set resolved = true;
  if log_error('server', 'Boom', '/x', null, null) <> 1 then raise exception 'reopened error should restart at 1'; end if;

  -- 18. QRIS gateway results: paid, idempotent, duplicate, wrong amount, late (after cancel), expiry, re-weigh invalidates the QR
  oid := place_order(jsonb_build_object('customer_name', 'Audit QRIS', 'phone', '081277770010', 'address', 'Jl. Uji 10', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  insert into payments (id, order_id, provider, amount) select 'PAY-T1', id, 'mock', total_final from orders where id = oid;
  if record_gateway_payment('PAY-T1', 'paid', (select total_final from orders where id = oid), '{}'::jsonb) <> 'paid' then raise exception 'gateway payment should mark the order paid'; end if;
  if (select payment_status || '/' || coalesce(pay_by::text, '-') from orders where id = oid) <> 'paid/-' then raise exception 'order not paid or deadline kept'; end if;
  if record_gateway_payment('PAY-T1', 'paid', 1, '{}'::jsonb) <> 'noop' then raise exception 'repeated notification must be a no-op'; end if;
  insert into payments (id, order_id, provider, amount) select 'PAY-T2', id, 'mock', total_final from orders where id = oid;
  if record_gateway_payment('PAY-T2', 'paid', (select total_final from orders where id = oid), '{}'::jsonb) <> 'duplicate' then raise exception 'second payment should be flagged as duplicate'; end if;
  if (select internal_note from orders where id = oid) not like '%Pembayaran ganda%' then raise exception 'duplicate payment not noted'; end if;

  oid := place_order(jsonb_build_object('customer_name', 'Audit QRIS Selisih', 'phone', '081277770011', 'address', 'Jl. Uji 11', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  insert into payments (id, order_id, provider, amount) select 'PAY-T3', id, 'mock', total_final from orders where id = oid;
  if record_gateway_payment('PAY-T3', 'paid', (select total_final - 1000 from orders where id = oid), '{}'::jsonb) <> 'mismatch' then raise exception 'wrong amount should be a mismatch'; end if;
  if (select payment_status from orders where id = oid) <> 'awaiting_confirmation' then raise exception 'mismatch should wait for the owner'; end if;

  oid := place_order(jsonb_build_object('customer_name', 'Audit QRIS Telat', 'phone', '081277770012', 'address', 'Jl. Uji 12', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  insert into payments (id, order_id, provider, amount) select 'PAY-T4', id, 'mock', total_final from orders where id = oid;
  perform set_order_status(oid, 'cancelled', 'uji');
  if (select status from payments where id = 'PAY-T4') <> 'cancelled' then raise exception 'cancelling the order should cancel its open QR'; end if;
  if record_gateway_payment('PAY-T4', 'paid', (select total_final from orders where id = oid), '{}'::jsonb) <> 'late' then raise exception 'payment after cancel should be late'; end if;
  if (select payment_status from orders where id = oid) <> 'refund_due' then raise exception 'late payment should be refund_due'; end if;

  insert into payments (id, order_id, provider, amount) values ('PAY-T5', oid, 'mock', 1000);
  if record_gateway_payment('PAY-T5', 'expired', null, '{}'::jsonb) <> 'updated' then raise exception 'expired QR not updated'; end if;
  if (select status from payments where id = 'PAY-T5') <> 'expired' then raise exception 'expired QR not recorded'; end if;

  oid := place_order(jsonb_build_object('customer_name', 'Audit QRIS Timbang', 'phone', '081277770013', 'address', 'Jl. Uji 13', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 2))));
  perform weigh_order(oid, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.1)) from order_items where order_id = oid and is_catch_weight));
  insert into payments (id, order_id, provider, amount) select 'PAY-T6', id, 'mock', total_final from orders where id = oid;
  perform weigh_order(oid, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.3)) from order_items where order_id = oid and is_catch_weight));
  if (select status from payments where id = 'PAY-T6') <> 'cancelled' then raise exception 're-weighing should cancel the QR for the old amount'; end if;
  perform _expect_error($q$select record_gateway_payment('NOPE', 'paid', 1, '{}'::jsonb)$q$, 'tidak ditemukan');

  -- 19. WhatsApp outbox: one message per (order, kind, dedupe); opt-out stored from checkout
  oid := place_order(jsonb_build_object('customer_name', 'Audit WA', 'phone', '081277770020', 'address', 'Jl. Uji 20', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'wa_opt_in', false, 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  if (select wa_opt_in from orders where id = oid) then raise exception 'wa_opt_in=false not stored'; end if;
  insert into wa_messages (id, order_id, kind, phone, template, body) values ('wa_t1', oid, 'received', '6281277770020', 'dipasaria_pesanan_diterima', 'x');
  perform _expect_error(format($q$insert into wa_messages (id, order_id, kind, phone, template, body) values ('wa_t2', '%s', 'received', '62812', 't', 'x')$q$, oid), 'duplicate key');
  insert into wa_messages (id, order_id, kind, dedupe, phone, template, body) values ('wa_t3', oid, 'invoice', '250000', '62812', 't', 'x');
  insert into wa_messages (id, order_id, kind, dedupe, phone, template, body) values ('wa_t4', oid, 'invoice', '262500', '62812', 't', 'x');
  if (select count(*) from wa_messages where order_id = oid) <> 3 then raise exception 'a corrected invoice (new amount) should be allowed'; end if;
  if (select wa_events from settings) <> array['received','invoice','paid','delivering','reminder','cancelled','standing'] then raise exception 'default WhatsApp events'; end if;

  -- 20. Household login: one code per phone, a minute between requests, 5 wrong tries lock it, a session on success
  perform customer_request_code('0812 7777 0030', 'hash-a');
  perform _expect_error($q$select customer_request_code('081277770030', 'hash-b')$q$, 'Tunggu satu menit');
  perform _expect_error($q$select customer_request_code('12345', 'x')$q$, 'tidak valid');
  if customer_login('081277770030', 'nope', 'tok1') <> 'wrong' then raise exception 'wrong code should be wrong'; end if;
  if (select attempts from login_codes where phone = '6281277770030') <> 1 then raise exception 'wrong try not counted'; end if;
  if customer_login('081277770030', 'hash-a', 'tok1') !~ '^ok:cu' then raise exception 'right code should log in'; end if;
  if not exists (select 1 from customer_sessions s join customers c on c.id = s.customer_id where s.token_hash = 'tok1' and c.phone = '6281277770030') then raise exception 'session not created'; end if;
  if customer_login('081277770030', 'hash-a', 'tok2') <> 'expired' then raise exception 'a code works only once'; end if;
  update login_codes set created_at = now() - interval '2 minutes' where phone = '6281277770030';
  perform customer_request_code('081277770030', 'hash-c');
  for i in 1..4 loop perform customer_login('081277770030', 'bad' || i, 'x'); end loop;
  if customer_login('081277770030', 'bad5', 'x') <> 'locked' then raise exception 'fifth wrong try should lock'; end if;
  if customer_login('081277770030', 'hash-c', 'tok3') <> 'locked' then raise exception 'locked code must stay locked even with the right code'; end if;
  update login_codes set expires_at = now() - interval '1 second' where phone = '6281277770030';
  if customer_login('081277770030', 'hash-c', 'tok4') <> 'expired' then raise exception 'expired code'; end if;
  if (select count(*) from customers where phone = '6281277770030') <> 1 then raise exception 'one customer per phone'; end if;

  raise notice 'all assertions passed';
end $$;
