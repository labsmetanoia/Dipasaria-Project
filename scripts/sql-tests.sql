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
declare oid text; o orders%rowtype; n int; stock_before numeric; stock_after numeric; tok text; v_code text; summ jsonb; cid text; oid2 text; oid3 text; pid text; pid2 text; ex record;
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
  perform _expect_error($q$select business_login('081200000001', 'WRONG6')$q$, 'Terlalu banyak');
  -- the right code still works: a stranger's wrong tries cannot lock the restaurant out
  if business_login('081200000001', 'BHR123') is null then raise exception 'right code refused during lockout'; end if;
  if (select count(*) from login_attempts where phone = '6281200000001') <> 0 then raise exception 'successful login should clear failures'; end if;
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
  if (select wa_events from settings) <> array['received','invoice','paid','delivering','reminder','cancelled','standing','delivered','claim','restock'] then raise exception 'default WhatsApp events'; end if;

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

  -- 21. Audit round 2
  -- phone formats: "+62 0812…" is the same number as "0812…"
  if normalize_phone('+62 0812-9999-0040') <> '6281299990040' or normalize_phone('0812 9999 0040') <> '6281299990040' then raise exception 'normalize_phone +62 0…'; end if;
  -- gateway result without an amount is never "paid"; without a status it is refused
  oid := place_order(jsonb_build_object('customer_name', 'Audit Null', 'phone', '081277770040', 'address', 'Jl. Uji 40', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  insert into payments (id, order_id, provider, amount) select 'PAY-N1', id, 'mock', total_final from orders where id = oid;
  perform _expect_error($q$select record_gateway_payment('PAY-N1', null, 1000, null)$q$, 'tidak valid');
  if record_gateway_payment('PAY-N1', 'paid', null, null) <> 'mismatch' then raise exception 'paid without amount must be a mismatch'; end if;
  if (select payment_status from orders where id = oid) <> 'awaiting_confirmation' then raise exception 'paid without amount marked the order paid'; end if;
  -- no re-weighing after the customer reported a payment
  oid := place_order(jsonb_build_object('customer_name', 'Audit Klaim', 'phone', '081277770041', 'address', 'Jl. Uji 41', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'transfer', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 2))));
  perform weigh_order(oid, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.1)) from order_items where order_id = oid and is_catch_weight));
  perform customer_confirm_payment((select code from orders where id = oid), '081277770041');
  perform _expect_error(format($q$select weigh_order('%s', (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.9)) from order_items where order_id = '%s' and is_catch_weight))$q$, oid, oid), 'melaporkan pembayaran');
  -- cancelling gives back only stock that was taken
  update variants set stock_qty = null where id = 'v_kakap_l';
  oid := place_order(jsonb_build_object('customer_name', 'Audit Stok', 'phone', '081277770042', 'address', 'Jl. Uji 42', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 3))));
  update variants set stock_qty = 0 where id = 'v_kakap_l';
  perform set_order_status(oid, 'cancelled', 'uji');
  if (select stock_qty from variants where id = 'v_kakap_l') <> 0 then raise exception 'cancel created phantom stock'; end if;
  update variants set stock_qty = null where id = 'v_kakap_l';
  -- integrity rules
  perform _expect_error($q$update settings set cutoff_time = '20.00'$q$, 'settings_cutoff_format');
  perform _expect_error($q$update variants set price_retail = -1 where id = 'v_salmon'$q$, 'variants_prices_nonneg');
  perform _expect_error($q$update business_accounts set discount_pct = 150 where id = 'ba_bahari'$q$, 'accounts_discount_range');
  perform _expect_error($q$update promos set value = 120 where type = 'percent'$q$, 'promos_value_valid');
  perform _expect_error($q$insert into promos (code, type, value) values (lower((select code from promos limit 1)), 'fixed', 1)$q$, 'duplicate key');
  -- the expiry job leaves an order alone while its QR can still be paid
  oid := place_order(jsonb_build_object('customer_name', 'Audit QR Aktif', 'phone', '081277770043', 'address', 'Jl. Uji 43', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 2))));
  insert into payments (id, order_id, provider, amount, expires_at) select 'PAY-Q1', id, 'mock', total_final, now() + interval '3 minutes' from orders where id = oid;
  update orders set pay_by = now() - interval '1 minute' where id = oid;
  perform expire_unpaid_orders();
  if (select status from orders where id = oid) = 'cancelled' then raise exception 'expired an order with a payable QR'; end if;
  update payments set expires_at = now() - interval '1 second' where id = 'PAY-Q1';
  perform expire_unpaid_orders();
  if (select status from orders where id = oid) <> 'cancelled' then raise exception 'order not expired after its QR expired'; end if;
  -- a fresh login code keeps the wrong-try count of the last 15 minutes
  delete from login_codes where phone = '6281277770044';
  perform customer_request_code('081277770044', 'h1');
  for i in 1..3 loop perform customer_login('081277770044', 'bad' || i, 'x'); end loop;
  update login_codes set created_at = now() - interval '2 minutes' where phone = '6281277770044';
  perform customer_request_code('081277770044', 'h2');
  if (select attempts from login_codes where phone = '6281277770044') <> 3 then raise exception 'new code reset the wrong-try count'; end if;

  -- 22. Value features: substitution preference, delivery mode, guarantee claims, restock outbox, buying log
  oid := place_order(jsonb_build_object('customer_name', 'Audit Antar', 'phone', '081277770050', 'address', 'Jl. Uji 50', 'area_id', 'a_selatan', 'substitution', 'similar',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 2), jsonb_build_object('variant_id', 'v_salmon', 'qty', 1))));
  if (select substitution from orders where id = oid) <> 'similar' then raise exception 'substitution not stored'; end if;
  perform _expect_error(format($q$select mark_delivered('%s', 'x', null)$q$, oid), 'Timbang');
  perform _expect_error(format($q$select create_claim((select code from orders where id = '%s'), '081277770050', '[]'::jsonb, 'not_fresh', '', '[]'::jsonb, 2)$q$, oid), 'setelah pesanan diterima');
  perform weigh_order(oid, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 2.05)) from order_items where order_id = oid and is_catch_weight));
  perform mark_delivered(oid, 'Diterima satpam', null);
  if (select status || '/' || (delivered_at is not null)::text || '/' || delivery_note from orders where id = oid) <> 'completed/true/Diterima satpam' then raise exception 'mark_delivered'; end if;
  perform _expect_error(format($q$select mark_delivered('%s', '', null)$q$, oid), 'sudah selesai');
  -- claims: items must belong to the order, at most 3 photos, inside the window
  perform _expect_error(format($q$select create_claim((select code from orders where id = '%s'), '081277770050', '[{"item_id":"nope"}]'::jsonb, 'not_fresh', '', '[]'::jsonb, 2)$q$, oid), 'tidak ada di pesanan');
  perform _expect_error(format($q$select create_claim((select code from orders where id = '%s'), '081277770050', (select jsonb_agg(jsonb_build_object('item_id', id)) from order_items where order_id = '%s'), 'not_fresh', '', '["a","b","c","d"]'::jsonb, 2)$q$, oid, oid), 'Maksimal 3 foto');
  cid := create_claim((select code from orders where id = oid), '0812 7777 0050', (select jsonb_agg(jsonb_build_object('item_id', id)) from order_items where order_id = oid and is_catch_weight), 'not_fresh', 'bau', '["data:image/jpeg;base64,AAAA"]'::jsonb, 2);
  if cid is null then raise exception 'claim not created'; end if;
  perform _expect_error(format($q$select resolve_claim('%s', 'refund', 'maaf', null)$q$, cid), 'jumlah pengembalian');
  perform _expect_error(format($q$select resolve_claim('%s', 'declined', '', null)$q$, cid), 'alasan penolakan');
  perform resolve_claim(cid, 'refund', 'Maaf, ikan kurang segar', 50000);
  if (select status || '/' || refund_amount from claims where id = cid) <> 'refund/50000' then raise exception 'resolve_claim'; end if;
  if (select internal_note from orders where id = oid) not like '%[Garansi] Dana dikembalikan Rp50.000%' then raise exception 'claim note on order'; end if;
  perform _expect_error(format($q$select resolve_claim('%s', 'replace', '', null)$q$, cid), 'sudah diputuskan');
  update orders set delivered_at = now() - interval '3 hours' where id = oid;
  perform _expect_error(format($q$select create_claim((select code from orders where id = '%s'), '081277770050', (select jsonb_agg(jsonb_build_object('item_id', id)) from order_items where order_id = '%s'), 'other', '', '[]'::jsonb, 2)$q$, oid, oid), 'Batas waktu laporan');
  -- COD cash covering the total marks the order paid
  update business_accounts set allow_cod = true where id = 'ba_bahari';
  oid := place_order(jsonb_build_object('customer_name', 'Audit COD', 'phone', '081200000001', 'address', 'Jl. Uji 51', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'cod', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10))), 'ba_bahari');
  perform mark_delivered(oid, null, (select total_final from orders where id = oid));
  if (select payment_status from orders where id = oid) <> 'paid' then raise exception 'COD cash should mark paid'; end if;
  -- outbox rows without an order (back-in-stock alerts) and the buying log
  insert into wa_messages (id, kind, dedupe, phone, template, body) values ('wa_r1', 'restock', 'p_salmon:6281277770050', '6281277770050', 'dipasaria_stok_tersedia', 'x');
  perform _expect_error($q$insert into purchases (delivery_date, product_id, qty, unit, total_cost) values (current_date, 'p_salmon', 0, 'kg', 1)$q$, 'purchases_qty_check');

  -- 23. Restaurant receivables: contract prices, due dates, payments matched oldest first, credit limit, overdue block
  perform _expect_error($q$insert into wa_messages (id, kind, dedupe, phone, template, body) values ('wa_r2', 'restock', 'p_salmon:6281277770050', '6281277770050', 'dipasaria_stok_tersedia', 'x')$q$, 'wa_messages_no_order_key');
  update variants set stock_qty = null where id in ('v_salmon', 'v_kakap_l');
  insert into business_accounts (id, business_name, contact_name, phone, address, area_id, payment_terms, status, credit_limit)
    values ('ba_ar', 'Uji Piutang', 'Pak Uji', '6281299990001', 'Jl. Uji 60', 'a_selatan', 'days3', 'approved', 1500000);
  insert into contract_prices (account_id, variant_id, price, starts_on) values ('ba_ar', 'v_salmon', 99000, jakarta_now()::date - 1);
  insert into contract_prices (account_id, variant_id, price, starts_on, ends_on) values ('ba_ar', 'v_salmon', 50000, jakarta_now()::date - 30, jakarta_now()::date - 2);
  oid := place_order(jsonb_build_object('customer_name', 'Uji Piutang', 'phone', '6281299990001', 'address', 'Jl. Uji 60', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10))), 'ba_ar');
  if (select unit_price from order_items where order_id = oid) <> 99000 then raise exception 'contract price not applied'; end if;
  if (select total_final from orders where id = oid) <> 990000 then raise exception 'contract order total %', (select total_final from orders where id = oid); end if;
  if (select due_date from orders where id = oid) <> _date()::date + 3 then raise exception 'due date should be delivery + 3 days'; end if;
  update orders set created_at = created_at - interval '1 hour' where id = oid; -- orders in one test transaction share now()
  -- limit 1.500.000: a second order of 990.000 would owe 1.980.000
  perform _expect_error($q$select place_order(jsonb_build_object('customer_name', 'Uji Piutang', 'phone', '6281299990001', 'address', 'Jl. Uji 60', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10))), 'ba_ar')$q$, 'sisa Rp510.000');
  perform _expect_error($q$select record_account_payment('ba_ar', 0, jakarta_now()::date, 'transfer', '', '')$q$, 'Jumlah pembayaran');
  perform _expect_error($q$select record_account_payment('ba_ar', 1000, jakarta_now()::date + 1, 'transfer', '', '')$q$, 'Tanggal pembayaran');
  pid := record_account_payment('ba_ar', 500000, jakarta_now()::date, 'transfer', 'BCA 1', '');
  if (select payment_status from orders where id = oid) <> 'unpaid' then raise exception 'partial payment must not settle'; end if;
  select * into ex from account_exposure('ba_ar');
  if ex.outstanding <> 490000 or ex.credit <> 0 then raise exception 'exposure after partial payment: % / %', ex.outstanding, ex.credit; end if;
  oid2 := place_order(jsonb_build_object('customer_name', 'Uji Piutang', 'phone', '6281299990001', 'address', 'Jl. Uji 60', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10))), 'ba_ar');
  -- 1.200.000 settles the older invoice (490.000 left) and 710.000 of the newer one
  perform record_account_payment('ba_ar', 1200000, jakarta_now()::date, 'transfer', 'BCA 2', '');
  if (select payment_status from orders where id = oid) <> 'paid' or (select payment_status from orders where id = oid2) <> 'unpaid' then raise exception 'oldest invoice first'; end if;
  if (select sum(amount) from payment_allocations where order_id = oid2) <> 710000 then raise exception 'allocation to second invoice'; end if;
  -- overpayment stays as credit and settles the next order the moment it is placed
  pid2 := record_account_payment('ba_ar', 400000, jakarta_now()::date, 'cash', '', 'tunai');
  select * into ex from account_exposure('ba_ar');
  if (select payment_status from orders where id = oid2) <> 'paid' or ex.credit <> 120000 or ex.outstanding <> 0 then raise exception 'overpayment credit: % / %', ex.outstanding, ex.credit; end if;
  oid3 := place_order(jsonb_build_object('customer_name', 'Uji Piutang', 'phone', '6281299990001', 'address', 'Jl. Uji 60', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10))), 'ba_ar');
  if (select sum(amount) from payment_allocations where order_id = oid3) <> 120000 then raise exception 'credit applied at order time'; end if;
  -- cancelling gives the credit back; nothing to refund
  perform set_order_status(oid3, 'cancelled', 'uji');
  select * into ex from account_exposure('ba_ar');
  if (select payment_status from orders where id = oid3) <> 'void' or ex.credit <> 120000 then raise exception 'cancel releases credit: %', ex.credit; end if;
  -- deleting the cash payment re-opens the newer invoice for what is no longer covered
  perform delete_account_payment(pid2);
  select * into ex from account_exposure('ba_ar');
  if (select payment_status from orders where id = oid2) <> 'unpaid' or ex.outstanding <> 280000 or ex.credit <> 0 then raise exception 'delete payment: % / %', ex.outstanding, ex.credit; end if;
  -- overdue beyond the grace days blocks tempo
  update orders set due_date = jakarta_now()::date - 10 where id = oid2;
  perform _expect_error($q$select place_order(jsonb_build_object('customer_name', 'Uji Piutang', 'phone', '6281299990001', 'address', 'Jl. Uji 60', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10))), 'ba_ar')$q$, 'jatuh tempo');
  update orders set due_date = jakarta_now()::date - 2 where id = oid2; -- within 3 grace days: allowed
  select * into ex from account_exposure('ba_ar');
  if ex.oldest_code is distinct from (select code from orders where id = oid2) then raise exception 'oldest open invoice'; end if;
  -- a weighed invoice is settled from credit; marking it unpaid releases the money, a lighter re-weigh needs less
  perform record_account_payment('ba_ar', 2280000, jakarta_now()::date, 'transfer', 'BCA 3', '');
  if (select payment_status from orders where id = oid2) <> 'paid' then raise exception 'second invoice settled'; end if;
  update business_accounts set credit_limit = null where id = 'ba_ar';
  oid3 := place_order(jsonb_build_object('customer_name', 'Uji Piutang', 'phone', '6281299990001', 'address', 'Jl. Uji 60', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'terms', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_kakap_l', 'qty', 10))), 'ba_ar');
  if exists (select 1 from payment_allocations where order_id = oid3) then raise exception 'unweighed invoice must not be settled'; end if;
  perform weigh_order(oid3, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 10)) from order_items where order_id = oid3));
  if (select payment_status from orders where id = oid3) <> 'paid' then raise exception 'weighed invoice settled from credit'; end if;
  perform set_payment_status(oid3, 'unpaid');
  if exists (select 1 from payment_allocations where order_id = oid3) then raise exception 'unpaid releases allocation'; end if;
  perform weigh_order(oid3, (select jsonb_agg(jsonb_build_object('item_id', id, 'qty_final', 9)) from order_items where order_id = oid3));
  select * into ex from account_exposure('ba_ar');
  if (select payment_status from orders where id = oid3) <> 'paid' or ex.credit <> 2000000 - (select total_final from orders where id = oid3) then raise exception 're-weigh settles the lower amount: %', ex.credit; end if;

  -- 24. Household weekly boxes: a standing order belongs to a restaurant or to a household, never both or neither
  insert into customers (id, phone, name) values ('cu_box', '6281377770090', 'Ibu Kotak');
  insert into customer_addresses (id, customer_id, address, area_id) values ('ca_box', 'cu_box', 'Jl. Uji Kotak 1', 'a_selatan');
  insert into standing_orders (id, customer_id, address_id, every_weeks, anchor_date, weekdays, slot_id, payment_method, lines)
    values ('so_box', 'cu_box', 'ca_box', 2, current_date, array[4], 's_pagi', 'qris', '[{"variant_id":"v_box_keluarga","qty":1}]'::jsonb);
  perform _expect_error($q$insert into standing_orders (id, weekdays, slot_id, payment_method, lines) values ('so_none', array[1], 's_pagi', 'qris', '[{"variant_id":"v_salmon","qty":1}]'::jsonb)$q$, 'standing_orders_owner_check');
  perform _expect_error($q$insert into standing_orders (id, account_id, customer_id, weekdays, slot_id, payment_method, lines) values ('so_both', 'ba_bahari', 'cu_box', array[1], 's_pagi', 'qris', '[{"variant_id":"v_salmon","qty":1}]'::jsonb)$q$, 'standing_orders_owner_check');
  perform _expect_error($q$update standing_orders set every_weeks = 3 where id = 'so_box'$q$, 'standing_orders_every_weeks_check');
  delete from customer_addresses where id = 'ca_box';
  if (select address_id from standing_orders where id = 'so_box') is not null then raise exception 'deleting the address must clear it on the box'; end if;
  delete from customers where id = 'cu_box';
  if exists (select 1 from standing_orders where id = 'so_box') then raise exception 'deleting the customer must delete their boxes'; end if;

  -- 25. Visit funnel: anonymous daily counters
  perform track_event('visit');
  perform track_event('visit');
  perform track_event('product_view', 'p_kakap');
  if (select f.n from funnel_daily f where f.day = jakarta_now()::date and f.event = 'visit' and f.product_id = '') <> 2 then raise exception 'funnel counter should add up'; end if;
  if (select f.n from funnel_daily f where f.event = 'product_view' and f.product_id = 'p_kakap') <> 1 then raise exception 'funnel per-product counter'; end if;
  perform _expect_error($q$select track_event('password_typed')$q$, 'funnel_daily_event_check');

  -- 26. Ratings after delivery: once per delivered order, by its customer; stars per product for the product page
  oid := place_order(jsonb_build_object('customer_name', 'Ibu Nilai', 'phone', '081277770070', 'address', 'Jl. Uji 70', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 3), jsonb_build_object('variant_id', 'v_dada', 'qty', 2))));
  v_code := (select code from orders where id = oid);
  perform _expect_error(format($q$select create_rating('%s', '081277770070', 5, '', '[]'::jsonb, 14)$q$, v_code), 'setelah pesanan diterima');
  perform mark_delivered(oid, 'Diterima', null);
  perform _expect_error(format($q$select create_rating('%s', '081200000000', 5, '', '[]'::jsonb, 14)$q$, v_code), 'tidak ditemukan');
  perform _expect_error(format($q$select create_rating('%s', '081277770070', 6, '', '[]'::jsonb, 14)$q$, v_code), '1 sampai 5');
  perform _expect_error(format($q$select create_rating('%s', '081277770070', 4, '', '[{"item_id":"nope","stars":"5"}]'::jsonb, 14)$q$, v_code), 'produk tidak valid');
  perform _expect_error(format($q$select create_rating('%s', '081277770070', 4, '', (select jsonb_agg(jsonb_build_object('item_id', id, 'stars', '9')) from order_items where order_id = '%s'), 14)$q$, v_code, oid), 'produk tidak valid');
  cid := create_rating(v_code, '0812 7777 0070', 4, 'Segar, datang tepat waktu', (select jsonb_agg(jsonb_build_object('item_id', id, 'stars', case when variant_id = 'v_salmon' then '5' else '3' end)) from order_items where order_id = oid), 14);
  if (select stars || '/' || comment from ratings where id = cid) <> '4/Segar, datang tepat waktu' then raise exception 'rating not stored'; end if;
  if (select s.average || '/' || s.n from product_rating_summary() s where s.product_id = 'p_salmon') <> '5.00/1' then raise exception 'product rating summary: %', (select s.average || '/' || s.n from product_rating_summary() s where s.product_id = 'p_salmon'); end if;
  perform _expect_error(format($q$select create_rating('%s', '081277770070', 5, '', '[]'::jsonb, 14)$q$, v_code), 'sudah Anda nilai');
  update orders set delivered_at = now() - interval '20 days' where id = oid;
  delete from ratings where id = cid;
  if exists (select 1 from rating_items where rating_id = cid) then raise exception 'rating items should go with the rating'; end if;
  perform _expect_error(format($q$select create_rating('%s', '081277770070', 5, '', '[]'::jsonb, 14)$q$, v_code), 'Batas waktu penilaian');

  -- 27. Gift orders: the recipient's phone is for the courier, the card text is kept, the sender always pays
  oid := place_order(jsonb_build_object('customer_name', 'Ibu Penerima', 'phone', '081277770071', 'address', 'Jl. Uji Hadiah 1', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 3)),
    'is_gift', 'true', 'recipient_phone', '0813 1111 2222', 'gift_message', 'Selamat ulang tahun, Bu!', 'gift_from', 'Rina'));
  if (select recipient_phone || '/' || gift_message || '/' || gift_from || '/' || phone from orders where id = oid) <> '6281311112222/Selamat ulang tahun, Bu!/Rina/6281277770071' then raise exception 'gift fields: %', (select recipient_phone || '/' || gift_message || '/' || gift_from from orders where id = oid); end if;
  oid2 := place_order(jsonb_build_object('customer_name', 'Bapak Penerima', 'phone', '081277770072', 'address', 'Jl. Uji Hadiah 2', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'transfer', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 3)),
    'is_gift', 'true', 'recipient_phone', '081311113333'));
  if (select gift_message from orders where id = oid2) is distinct from '' or (select gift_from from orders where id = oid2) is not null then raise exception 'a gift without card text is still a gift'; end if;
  if (select gift_message from orders where id = (select id from orders where phone = '6281277770050' limit 1)) is not null then raise exception 'ordinary orders are not gifts'; end if;
  perform _expect_error($q$select place_order(jsonb_build_object('customer_name', 'X', 'phone', '081277770073', 'address', 'Jl. Uji 73', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 3)),
    'is_gift', 'true', 'recipient_phone', '12'))$q$, 'penerima hadiah tidak valid');
  perform _expect_error($q$select place_order(jsonb_build_object('customer_name', 'X', 'phone', '081277770073', 'address', 'Jl. Uji 73', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_sore', 'payment_method', 'qris', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 3)),
    'is_gift', 'true', 'recipient_phone', '081311114444', 'gift_message', repeat('x', 301)))$q$, 'maksimal 300');
  perform _expect_error($q$select place_order(jsonb_build_object('customer_name', 'X', 'phone', '081200000001', 'address', 'Jl. Uji 74', 'area_id', 'a_selatan',
    'delivery_date', _date(), 'slot_id', 's_dapur', 'payment_method', 'cod', 'lines', jsonb_build_array(jsonb_build_object('variant_id', 'v_salmon', 'qty', 10)),
    'is_gift', 'true', 'recipient_phone', '081311115555'), 'ba_bahari')$q$, 'Hadiah dibayar oleh pengirim');
  -- trader's-pick box contents live on the product
  update products set curated = true, weekly_contents = 'Kakap 1 ekor, udang 500 g' where id = 'p_salmon';
  if (select weekly_contents from products where id = 'p_salmon' and curated) <> 'Kakap 1 ekor, udang 500 g' then raise exception 'weekly contents'; end if;

  raise notice 'all assertions passed';
end $$;
