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
  -- 117000×0.9 = 105300 + 144000 = 249300 → below 250k so fee 25000 applies; promo 10% = 24930
  if o.subtotal_final <> 249300 then raise exception 'weighed subtotal %', o.subtotal_final; end if;
  if o.delivery_fee <> 25000 then raise exception 'fee after weighing %', o.delivery_fee; end if;
  if o.discount <> 24930 then raise exception 'discount after weighing %', o.discount; end if;
  if o.total_final <> 249300 - 24930 + 25000 then raise exception 'total_final %', o.total_final; end if;

  -- 3. Second order from the same phone cannot use the first-order promo
  perform _expect_error(format($q$select place_order('{"customer_name":"Ibu Test","phone":"081234567890","address":"x","area_id":"a_selatan","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","promo_code":"SELAMATDATANG","lines":[{"variant_id":"v_udang_beku","qty":3}]}'::jsonb)$q$, _date()), 'pesanan pertama');

  -- 4. Minimum order, business-only variant, stock, availability, cut-off
  perform _expect_error(format($q$select place_order('{"customer_name":"A","phone":"081200000000","address":"x","area_id":"a_utara","delivery_date":"%s","slot_id":"s_pagi","payment_method":"qris","lines":[{"variant_id":"v_nugget","qty":1}]}'::jsonb)$q$, _date()), 'Minimal pesanan');
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

  raise notice 'all assertions passed';
end $$;
