-- Generated from src/lib/data/seed.ts. Edit the TS file and re-run `node scripts/gen-seed.mts`.
-- Prices are launch placeholders: replace them with your own price list before sharing the link.

insert into settings (id, store_name, tagline, whatsapp_number, bank_name, bank_account, bank_holder, qris_image_url, cutoff_time, min_order_retail, min_order_business, free_delivery_retail, free_delivery_business, catch_weight_buffer_pct, max_days_ahead, instagram, address_line, announcement) values (1, 'Dipasaria', 'Protein pilihan untuk dapur Jakarta', '6281100000000', 'BCA', '0000000000', 'PT Dipasaria', null, '20:00', 150000, 750000, 250000, 750000, 5, 6, 'dipasaria.id', 'Jakarta Utara', null)
on conflict (id) do update set store_name = excluded.store_name, tagline = excluded.tagline, whatsapp_number = excluded.whatsapp_number, bank_name = excluded.bank_name, bank_account = excluded.bank_account, bank_holder = excluded.bank_holder, qris_image_url = excluded.qris_image_url, cutoff_time = excluded.cutoff_time, min_order_retail = excluded.min_order_retail, min_order_business = excluded.min_order_business, free_delivery_retail = excluded.free_delivery_retail, free_delivery_business = excluded.free_delivery_business, catch_weight_buffer_pct = excluded.catch_weight_buffer_pct, max_days_ahead = excluded.max_days_ahead, instagram = excluded.instagram, address_line = excluded.address_line, announcement = excluded.announcement;

insert into categories (id, slug, name, description, sort, icon, is_seafood) values
  ('c_ikan', 'ikan-segar', 'Ikan Segar', 'Dilelang di Muara Baru sebelum subuh, dinamai spesiesnya, digrade ukurannya.', 1, 'fish', true),
  ('c_udang', 'udang-cumi', 'Udang & Cumi', 'Udang vaname berukuran dan cumi segar, siap dikupas atau dibersihkan.', 2, 'shrimp', true),
  ('c_beku', 'seafood-beku', 'Seafood Beku', 'Fillet dan portion beku untuk stok freezer, tanpa risiko basi.', 3, 'snow', true),
  ('c_ayam', 'ayam', 'Ayam', 'Ayam potong dari RPHU bersertifikat halal, beku atau segar untuk akun bisnis.', 4, 'chicken', false),
  ('c_olahan', 'frozen-food', 'Frozen Food', 'Nugget, sosis dan bakso ikan dari merek ber-BPOM dan berlogo halal.', 5, 'box', false),
  ('c_telur', 'telur', 'Telur', 'Telur ayam segar per tray, atau per peti untuk restoran.', 6, 'egg', false),
  ('c_bumbu', 'bumbu-dapur', 'Bumbu & Dapur', 'Kebutuhan dapur yang Anda beli setiap minggu, ikut dalam pengiriman yang sama.', 7, 'bottle', false)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, sort = excluded.sort, icon = excluded.icon, is_seafood = excluded.is_seafood;

insert into products (id, slug, category_id, name, name_en, scientific_name, aliases, description, origin, storage_class, storage_note, is_catch_weight, available_today, is_active, is_featured, image_url, icon, sort) values
  ('p_kakap', 'kakap-merah', 'c_ikan', 'Kakap Merah', 'Malabar Snapper', 'Lutjanus malabaricus', array['bambangan','red snapper','kakap']::text[], 'Kakap merah yang benar, bukan Red Bass yang sering dijual sebagai kakap. Daging putih padat untuk kukus, bakar atau goreng.', 'Muara Baru, didaratkan subuh', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, true, null, 'fish', 1),
  ('p_kerapu', 'kerapu', 'c_ikan', 'Kerapu', 'Orange-spotted Grouper', 'Epinephelus coioides', array['grouper','kerapu lumpur','kerapu macan']::text[], 'Kerapu budidaya dengan pasokan stabil. Pilihan utama untuk hidangan ikan kukus restoran.', 'Tambak Lampung & Kepulauan Seribu via Muara Baru', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, true, null, 'fish', 2),
  ('p_kembung', 'kembung', 'c_ikan', 'Kembung', 'Indian Mackerel', 'Rastrelliger kanagurta', array['mackerel','kembung banjar']::text[], 'Ikan rakyat dengan omega-3 tinggi. Volume harian untuk dapur Padang dan warung.', 'Muara Baru, didaratkan subuh', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, false, null, 'fish', 3),
  ('p_tongkol', 'tongkol', 'c_ikan', 'Tongkol', 'Mackerel Tuna', 'Euthynnus affinis', array['tuna','tongkol abu']::text[], 'Tongkol segar untuk balado, pindang dan suwir.', 'Muara Baru, didaratkan subuh', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, false, null, 'fish', 4),
  ('p_bandeng', 'bandeng', 'c_ikan', 'Bandeng', 'Milkfish', 'Chanos chanos', array['milkfish','bandeng presto']::text[], 'Bandeng tambak Lampung dengan opsi cabut duri untuk keluarga.', 'Tambak Lampung via Muara Baru', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, false, null, 'fish', 5),
  ('p_baronang', 'baronang', 'c_ikan', 'Baronang', 'Rabbitfish', 'Siganus spp.', array['rabbitfish','beronang']::text[], 'Ikan bakar favorit restoran seafood, daging manis dan tidak amis.', 'Muara Baru, didaratkan subuh', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, false, true, false, null, 'fish', 6),
  ('p_bawal', 'bawal-putih', 'c_ikan', 'Bawal Putih', 'Silver Pomfret', 'Pampus argenteus', array['pomfret','bawal']::text[], 'Bawal putih premium untuk kukus ala Chinese-Indonesian.', 'Muara Baru, didaratkan subuh', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, false, null, 'fish', 7),
  ('p_nila', 'nila-merah', 'c_ikan', 'Nila Merah', 'Red Tilapia', 'Oreochromis sp.', array['tilapia','nila']::text[], 'Nila budidaya Jawa Barat, ukuran konsisten, ramah anak jika difillet.', 'Kolam Sukabumi & Indramayu', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, false, null, 'fish', 8),
  ('p_udang', 'udang-vaname', 'c_udang', 'Udang Vaname Segar', 'Whiteleg Shrimp', 'Litopenaeus vannamei', array['shrimp','prawn','udang putih','vannamei']::text[], 'Udang vaname tambak, dihitung per kg (size = jumlah ekor per kg). Tanpa perendaman penambah berat.', 'Tambak Lampung & Indramayu', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, true, null, 'shrimp', 9),
  ('p_cumi', 'cumi-segar', 'c_udang', 'Cumi Segar', 'Squid', 'Loligo spp.', array['squid','sotong','cumi-cumi']::text[], 'Cumi segar hasil lelang subuh, bisa dibersihkan dan dipotong ring.', 'Muara Baru, didaratkan subuh', 'chilled', 'Simpan 0–4 °C, masak dalam 24 jam atau bekukan.', true, true, true, true, null, 'squid', 10),
  ('p_udang_beku', 'udang-kupas-beku', 'c_beku', 'Udang Vaname Kupas PD Beku', 'Peeled & Deveined Shrimp', 'Litopenaeus vannamei', array['udang beku','frozen shrimp','pd shrimp']::text[], 'Udang kupas belah punggung, IQF, siap tumis. Andalan stok freezer rumah tangga.', 'Cold storage Lampung', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, true, null, 'shrimp', 11),
  ('p_dori', 'dori-fillet', 'c_beku', 'Dori Fillet Beku', 'Pangasius Fillet', 'Pangasius hypophthalmus', array['dory','patin fillet','ikan dori']::text[], 'Fillet dori tanpa duri untuk fish & chips, kafe dan menu anak.', 'Pengolah Lampung (SKP/HACCP)', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'fillet', 12),
  ('p_tuna', 'tuna-saku', 'c_beku', 'Tuna Saku Beku', 'Yellowfin Tuna Saku', 'Thunnus albacares', array['tuna','saku','tuna loin']::text[], 'Tuna saku grade sashimi-ready setelah dicairkan dengan benar.', 'Bitung, via distributor Jakarta', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'fillet', 13),
  ('p_salmon', 'salmon-fillet', 'c_beku', 'Salmon Fillet Beku', 'Atlantic Salmon Portion', 'Salmo salar', array['salmon','salmon norway']::text[], 'Portion salmon impor dari importir berizin, dipotong 200 g siap panggang.', 'Norwegia, importir berizin Jakarta', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, true, null, 'fillet', 14),
  ('p_tenggiri', 'tenggiri-steak', 'c_beku', 'Tenggiri Steak Beku', 'Spanish Mackerel Steak', 'Scomberomorus commerson', array['tenggiri','mackerel steak']::text[], 'Steak tenggiri untuk bakar dan goreng, atau bahan pempek dan otak-otak.', 'Muara Baru, dibekukan dalam 4 jam', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'fillet', 15),
  ('p_sayap', 'sayap-ayam-beku', 'c_ayam', 'Sayap Ayam Beku', 'Chicken Wings', null, array['wings','chicken wing']::text[], 'Sayap ayam dari RPHU bersertifikat halal dan NKV, dibekukan segar.', 'RPHU bersertifikat halal, Jawa Barat', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'chicken', 16),
  ('p_paha', 'paha-ayam-beku', 'c_ayam', 'Paha Ayam Beku', 'Chicken Thigh', null, array['thigh','paha bawah','paha atas']::text[], 'Paha ayam utuh, ukuran seragam 180–220 g per potong.', 'RPHU bersertifikat halal, Jawa Barat', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'chicken', 17),
  ('p_dada', 'dada-fillet-ayam', 'c_ayam', 'Dada Fillet Ayam Beku', 'Boneless Chicken Breast', null, array['fillet ayam','chicken breast','dada ayam']::text[], 'Dada tanpa tulang dan kulit, untuk geprek, katsu dan menu sehat.', 'RPHU bersertifikat halal, Jawa Barat', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, true, null, 'chicken', 18),
  ('p_ayam_segar', 'ayam-potong-segar', 'c_ayam', 'Ayam Potong Segar', 'Fresh Chicken, cut', null, array['ayam segar','ayam potong 8','broiler']::text[], 'Ayam broiler segar dipotong 8 atau 12, dari RPHU bersertifikat halal. Khusus akun restoran, harga mengikuti indeks pasar mingguan.', 'RPHU bersertifikat halal, Bogor', 'chilled', 'Simpan 0–4 °C, dikemas terpisah dari ikan.', true, true, true, false, null, 'chicken', 19),
  ('p_nugget', 'nugget-ayam', 'c_olahan', 'Nugget Ayam', 'Chicken Nuggets', null, array['nugget','naget']::text[], 'Nugget ayam merek nasional ber-BPOM MD dan berlogo halal.', 'Distributor resmi', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, true, null, 'box', 20),
  ('p_sosis', 'sosis-ayam', 'c_olahan', 'Sosis Ayam', 'Chicken Sausage', null, array['sosis','sausage']::text[], 'Sosis ayam premium untuk sarapan, bento dan menu kafe.', 'Distributor resmi', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'box', 21),
  ('p_bakso', 'bakso-ikan', 'c_olahan', 'Bakso Ikan', 'Fish Balls', null, array['fish ball','baso ikan']::text[], 'Bakso ikan kenyal untuk sup, tomyam dan steamboat.', 'Distributor resmi', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'box', 22),
  ('p_otak', 'otak-otak', 'c_olahan', 'Otak-otak Tenggiri', 'Grilled Fish Cake', null, array['otak otak','otak-otak bakar']::text[], 'Otak-otak tenggiri beku, tinggal bakar atau kukus 10 menit.', 'Produsen UMKM bersertifikat PIRT', 'frozen', 'Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.', false, true, true, false, null, 'box', 23),
  ('p_telur', 'telur-ayam', 'c_telur', 'Telur Ayam Negeri', 'Chicken Eggs', null, array['telur','egg','telor']::text[], 'Telur segar dari peternakan Blitar dan Bogor, diantar 2× seminggu ke gudang kami.', 'Peternakan Blitar & Bogor', 'ambient', 'Simpan di tempat sejuk, gunakan dalam 2 minggu.', false, true, true, false, null, 'egg', 24),
  ('p_minyak', 'minyak-goreng', 'c_bumbu', 'Minyak Goreng', 'Cooking Oil', null, array['minyak','oil']::text[], 'Minyak goreng sawit kemasan, merek nasional.', 'Distributor FMCG', 'ambient', 'Simpan di tempat sejuk dan kering.', false, true, true, false, null, 'bottle', 25),
  ('p_kecap', 'kecap-manis', 'c_bumbu', 'Kecap Manis', 'Sweet Soy Sauce', null, array['kecap','soy sauce']::text[], 'Kecap manis merek nasional, botol atau jerigen untuk dapur restoran.', 'Distributor FMCG', 'ambient', 'Simpan di tempat sejuk dan kering.', false, true, true, false, null, 'bottle', 26),
  ('p_sambal', 'sambal-bawang', 'c_bumbu', 'Sambal Bawang', 'Shallot Chili Paste', null, array['sambal','chili']::text[], 'Sambal bawang siap pakai, teman ikan bakar dan ayam goreng.', 'Produsen UMKM ber-BPOM', 'ambient', 'Simpan di kulkas setelah dibuka.', false, true, true, false, null, 'bottle', 27),
  ('p_bawang', 'bawang-putih-kupas', 'c_bumbu', 'Bawang Putih Kupas', 'Peeled Garlic', null, array['garlic','bawang']::text[], 'Bawang putih kupas, hemat 30 menit kerja dapur setiap hari.', 'Pasar Induk Kramat Jati', 'chilled', 'Simpan 0–4 °C, gunakan dalam 5 hari.', false, true, true, false, null, 'bottle', 28),
  ('p_tepung', 'tepung-bumbu', 'c_bumbu', 'Tepung Bumbu Serbaguna', 'Seasoned Flour', null, array['tepung','flour','tepung crispy']::text[], 'Tepung bumbu untuk ayam dan seafood goreng tepung.', 'Distributor FMCG', 'ambient', 'Simpan di tempat sejuk dan kering.', false, true, true, false, null, 'bottle', 29)
on conflict (id) do update set slug = excluded.slug, category_id = excluded.category_id, name = excluded.name, name_en = excluded.name_en, scientific_name = excluded.scientific_name, aliases = excluded.aliases, description = excluded.description, origin = excluded.origin, storage_class = excluded.storage_class, storage_note = excluded.storage_note, is_catch_weight = excluded.is_catch_weight, available_today = excluded.available_today, is_active = excluded.is_active, is_featured = excluded.is_featured, image_url = excluded.image_url, icon = excluded.icon, sort = excluded.sort;

insert into variants (id, product_id, label, unit, min_qty, step_qty, price_retail, price_business, cost, stock_qty, business_only, is_active, sort) values
  ('v_kakap_l', 'p_kakap', '1–2 kg/ekor', 'kg', 0.5, 0.5, 115000, 92000, 78000, null, false, true, 1),
  ('v_kakap_s', 'p_kakap', '500–800 g/ekor', 'kg', 0.5, 0.5, 98000, 80000, 68000, null, false, true, 2),
  ('v_kerapu', 'p_kerapu', '600–900 g/ekor', 'kg', 0.5, 0.5, 165000, 135000, 118000, null, false, true, 1),
  ('v_kembung', 'p_kembung', '6–8 ekor/kg', 'kg', 0.5, 0.5, 48000, 36000, 30000, null, false, true, 1),
  ('v_tongkol', 'p_tongkol', '300–500 g/ekor', 'kg', 0.5, 0.5, 42000, 33000, 28000, null, false, true, 1),
  ('v_bandeng', 'p_bandeng', '400–600 g/ekor', 'kg', 0.5, 0.5, 45000, 35000, 29000, null, false, true, 1),
  ('v_baronang', 'p_baronang', '300–500 g/ekor', 'kg', 0.5, 0.5, 60000, 48000, 40000, null, false, true, 1),
  ('v_bawal', 'p_bawal', '400–600 g/ekor', 'kg', 0.5, 0.5, 150000, 125000, 105000, null, false, true, 1),
  ('v_nila', 'p_nila', '500–700 g/ekor', 'kg', 0.5, 0.5, 42000, 35000, 29000, null, false, true, 1),
  ('v_udang_40', 'p_udang', 'Size 40–50', 'kg', 0.5, 0.5, 118000, 96000, 84000, null, false, true, 1),
  ('v_udang_60', 'p_udang', 'Size 60–70', 'kg', 0.5, 0.5, 105000, 88000, 76000, null, false, true, 2),
  ('v_cumi', 'p_cumi', '8–12 ekor/kg', 'kg', 0.5, 0.5, 95000, 78000, 66000, null, false, true, 1),
  ('v_udang_beku', 'p_udang_beku', '500 g', 'pack', 1, 1, 72000, 62000, 54000, 40, false, true, 1),
  ('v_dori', 'p_dori', '1 kg', 'pack', 1, 1, 68000, 55000, 47000, 30, false, true, 1),
  ('v_tuna', 'p_tuna', '250 g', 'pack', 1, 1, 58000, 48000, 40000, 25, false, true, 1),
  ('v_salmon', 'p_salmon', '200 g', 'pack', 1, 1, 95000, 82000, 70000, 20, false, true, 1),
  ('v_tenggiri', 'p_tenggiri', '500 g', 'pack', 1, 1, 75000, 62000, 53000, 18, false, true, 1),
  ('v_sayap', 'p_sayap', '1 kg', 'pack', 1, 1, 46000, 40000, 36000, 40, false, true, 1),
  ('v_paha', 'p_paha', '1 kg', 'pack', 1, 1, 44000, 38000, 34000, 40, false, true, 1),
  ('v_dada', 'p_dada', '1 kg', 'pack', 1, 1, 52000, 45000, 40000, 40, false, true, 1),
  ('v_ayam8', 'p_ayam_segar', 'Potong 8, 0,9–1,0 kg/ekor', 'kg', 2, 1, 0, 42000, 38000, null, true, true, 1),
  ('v_ayam12', 'p_ayam_segar', 'Potong 12, 0,9–1,0 kg/ekor', 'kg', 2, 1, 0, 42000, 38000, null, true, true, 2),
  ('v_nugget', 'p_nugget', '500 g', 'pack', 1, 1, 42000, 36000, 31000, 36, false, true, 1),
  ('v_sosis', 'p_sosis', '500 g (12 pcs)', 'pack', 1, 1, 38000, 32000, 27000, 30, false, true, 1),
  ('v_bakso', 'p_bakso', '500 g', 'pack', 1, 1, 35000, 30000, 25000, 30, false, true, 1),
  ('v_otak', 'p_otak', '10 pcs', 'pack', 1, 1, 28000, 24000, 20000, 24, false, true, 1),
  ('v_telur_tray', 'p_telur', 'Tray 30 butir', 'tray', 1, 1, 58000, 52000, 48000, 30, false, true, 1),
  ('v_telur_peti', 'p_telur', 'Peti 15 kg (±240 butir)', 'crate', 1, 1, 0, 410000, 385000, 6, true, true, 2),
  ('v_minyak_2l', 'p_minyak', '2 L', 'bottle', 1, 1, 38000, 35000, 32000, 24, false, true, 1),
  ('v_minyak_18l', 'p_minyak', 'Jerigen 18 L', 'box', 1, 1, 0, 305000, 285000, 6, true, true, 2),
  ('v_kecap_520', 'p_kecap', '520 ml', 'bottle', 1, 1, 22000, 19000, 17000, 24, false, true, 1),
  ('v_kecap_5l', 'p_kecap', 'Jerigen 5 L', 'box', 1, 1, 0, 125000, 112000, 8, true, true, 2),
  ('v_sambal', 'p_sambal', '200 g', 'bottle', 1, 1, 28000, 24000, 20000, 20, false, true, 1),
  ('v_bawang', 'p_bawang', '500 g', 'pack', 1, 1, 32000, 26000, 22000, 20, false, true, 1),
  ('v_tepung', 'p_tepung', '1 kg', 'pack', 1, 1, 24000, 21000, 18000, 20, false, true, 1)
on conflict (id) do update set product_id = excluded.product_id, label = excluded.label, unit = excluded.unit, min_qty = excluded.min_qty, step_qty = excluded.step_qty, price_retail = excluded.price_retail, price_business = excluded.price_business, cost = excluded.cost, stock_qty = excluded.stock_qty, business_only = excluded.business_only, is_active = excluded.is_active, sort = excluded.sort;

insert into prep_options (id, product_id, label, surcharge, note, sort) values
  ('pp_kakap_siangi', 'p_kakap', 'Siangi (buang sisik & isi perut)', 3000, null, 1),
  ('pp_kakap_fillet', 'p_kakap', 'Fillet', 20000, 'Rendemen ±45%; harga per kg ikan utuh', 2),
  ('pp_kakap_steak', 'p_kakap', 'Potong steak', 8000, null, 3),
  ('pp_kerapu_siangi', 'p_kerapu', 'Siangi', 3000, null, 1),
  ('pp_kembung_siangi', 'p_kembung', 'Siangi', 3000, null, 1),
  ('pp_tongkol_steak', 'p_tongkol', 'Potong steak', 5000, null, 1),
  ('pp_bandeng_siangi', 'p_bandeng', 'Siangi', 3000, null, 1),
  ('pp_bandeng_duri', 'p_bandeng', 'Cabut duri', 15000, 'Dikerjakan subuh, 1–2 jam', 2),
  ('pp_baronang_siangi', 'p_baronang', 'Siangi', 3000, null, 1),
  ('pp_bawal_siangi', 'p_bawal', 'Siangi', 3000, null, 1),
  ('pp_nila_siangi', 'p_nila', 'Siangi', 3000, null, 1),
  ('pp_nila_fillet', 'p_nila', 'Fillet tanpa kulit', 15000, 'Rendemen ±40%', 2),
  ('pp_udang_kupas', 'p_udang', 'Kupas kulit', 12000, 'Berat ditimbang sebelum dikupas', 1),
  ('pp_udang_pd', 'p_udang', 'Kupas & belah punggung (PD)', 15000, null, 2),
  ('pp_cumi_bersih', 'p_cumi', 'Bersihkan (buang tinta & tulang)', 5000, null, 1),
  ('pp_cumi_ring', 'p_cumi', 'Bersihkan & potong ring', 8000, null, 2)
on conflict (id) do update set product_id = excluded.product_id, label = excluded.label, surcharge = excluded.surcharge, note = excluded.note, sort = excluded.sort;

insert into delivery_areas (id, name, fee, is_active, sort) values
  ('a_utara', 'Jakarta Utara (Kelapa Gading, Sunter, Pluit, PIK)', 15000, true, 1),
  ('a_pusat', 'Jakarta Pusat', 20000, true, 2),
  ('a_selatan', 'Jakarta Selatan (Senopati, Kemang, Blok M)', 25000, true, 3),
  ('a_barat_timur', 'Jakarta Barat & Timur', 25000, true, 4),
  ('a_tangerang', 'Tangerang, BSD & Gading Serpong', 35000, true, 5)
on conflict (id) do update set name = excluded.name, fee = excluded.fee, is_active = excluded.is_active, sort = excluded.sort;

insert into delivery_slots (id, label, start_time, end_time, segment, capacity, is_active, sort) values
  ('s_dapur', 'Dapur restoran', '05:00', '08:00', 'business', 15, true, 1),
  ('s_pagi', 'Pagi', '10:00', '13:00', 'all', 12, true, 2),
  ('s_sore', 'Sore', '15:00', '18:00', 'retail', 12, true, 3)
on conflict (id) do update set label = excluded.label, start_time = excluded.start_time, end_time = excluded.end_time, segment = excluded.segment, capacity = excluded.capacity, is_active = excluded.is_active, sort = excluded.sort;

insert into promos (id, code, type, value, min_spend, segment, quota, used_count, first_order_only, starts_at, ends_at, is_active, description) values
  ('pr_welcome', 'SELAMATDATANG', 'percent', 10, 150000, 'retail', 200, 0, true, null, null, true, 'Diskon 10% pesanan pertama rumah tangga'),
  ('pr_ongkir', 'GRATISONGKIR', 'free_delivery', 0, 200000, 'retail', null, 0, false, null, null, true, 'Gratis ongkir belanja di atas Rp 200.000'),
  ('pr_mitra', 'MITRA50', 'fixed', 50000, 1500000, 'business', 50, 0, false, null, null, true, 'Potongan Rp 50.000 untuk pesanan restoran di atas Rp 1,5 jt')
on conflict (id) do update set code = excluded.code, type = excluded.type, value = excluded.value, min_spend = excluded.min_spend, segment = excluded.segment, quota = excluded.quota, used_count = excluded.used_count, first_order_only = excluded.first_order_only, starts_at = excluded.starts_at, ends_at = excluded.ends_at, is_active = excluded.is_active, description = excluded.description;

-- Example business accounts (demo logins: phone + code). Delete before going live.
insert into business_accounts (id, business_name, contact_name, phone, address, area_id, business_type, discount_pct, payment_terms, allow_cod, status, access_code, preferred_slot_id, notes, applied_at, approved_at) values
  ('ba_bahari', 'Seafood Bahari Gading', 'Pak Hendra', '6281200000001', 'Jl. Boulevard Raya Blok QA 1 No. 12, Kelapa Gading', 'a_utara', 'Restoran seafood', 0, 'weekly', true, 'approved', 'BHR123', 's_dapur', 'Pesan 5 hari/minggu. Minta kakap 1–2 kg selalu disiangi.', '2026-10-20T09:00:00Z', '2026-10-21T10:00:00Z'),
  ('ba_minang', 'RM Padang Sinar Minang', 'Uni Ratna', '6281200000002', 'Jl. Danau Sunter Utara No. 45, Sunter', 'a_utara', 'Restoran Padang / Sunda / Manado', 2, 'days3', true, 'approved', 'MNG456', 's_dapur', 'Kembung dan tongkol harian; mulai ambil ayam potong 8.', '2026-10-22T09:00:00Z', '2026-10-23T10:00:00Z'),
  ('ba_kemang', 'Kopi & Dapur Kemang', 'Mbak Sita', '6281200000003', 'Jl. Kemang Raya No. 8, Jakarta Selatan', 'a_selatan', 'Kafe / cloud kitchen', 0, 'prepaid', false, 'pending', null, null, '', '2026-10-30T14:30:00Z', null)
on conflict (id) do update set business_name = excluded.business_name, contact_name = excluded.contact_name, phone = excluded.phone, address = excluded.address, area_id = excluded.area_id, business_type = excluded.business_type, discount_pct = excluded.discount_pct, payment_terms = excluded.payment_terms, allow_cod = excluded.allow_cod, status = excluded.status, access_code = excluded.access_code, preferred_slot_id = excluded.preferred_slot_id, notes = excluded.notes, applied_at = excluded.applied_at, approved_at = excluded.approved_at;

