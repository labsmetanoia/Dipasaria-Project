-- DEMO ONLY. Example business accounts whose access codes are published in the README and demo hints.
-- Never run this on a production database.

insert into business_accounts (id, business_name, contact_name, phone, address, area_id, business_type, discount_pct, payment_terms, allow_cod, status, access_code, preferred_slot_id, notes, applied_at, approved_at, credit_limit) values
  ('ba_bahari', 'Seafood Bahari Gading', 'Pak Hendra', '6281200000001', 'Jl. Boulevard Raya Blok QA 1 No. 12, Kelapa Gading', 'a_utara', 'Restoran seafood', 0, 'weekly', true, 'approved', 'BHR123', 's_dapur', 'Pesan 5 hari/minggu. Minta kakap 1–2 kg selalu disiangi.', '2026-10-20T09:00:00Z', '2026-10-21T10:00:00Z', 15000000),
  ('ba_minang', 'RM Padang Sinar Minang', 'Uni Ratna', '6281200000002', 'Jl. Danau Sunter Utara No. 45, Sunter', 'a_utara', 'Restoran Padang / Sunda / Manado', 2, 'days3', true, 'approved', 'MNG456', 's_dapur', 'Kembung dan tongkol harian; mulai ambil ayam potong 8.', '2026-10-22T09:00:00Z', '2026-10-23T10:00:00Z', 5000000),
  ('ba_kemang', 'Kopi & Dapur Kemang', 'Mbak Sita', '6281200000003', 'Jl. Kemang Raya No. 8, Jakarta Selatan', 'a_selatan', 'Kafe / dapur daring', 0, 'prepaid', false, 'pending', null, null, '', '2026-10-30T14:30:00Z', null, null)
on conflict (id) do nothing;
