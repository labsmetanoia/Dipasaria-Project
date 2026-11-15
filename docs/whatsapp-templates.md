# WhatsApp message templates

Create these in **WhatsApp Manager**, under Account tools and then Message templates. For each one:
- choose **Create template**;
- set the category to **Utility**;
- set the language to **Indonesian (id)**;
- copy the **name** and **body** exactly as below.

Meta asks for a sample value for every variable: use the samples given. Approval usually takes minutes to a day.

Until a template is approved, its messages fail with error 132001. They then appear in Back-office → Pesan WA, where they can be sent by hand or with **Kirim ulang** once approved.

The app fills the variables from the order (`src/lib/notify/templates.ts`). If you change wording here, change it there too.

| Template name | Sent when | Variables |
|---|---|---|
| `dipasaria_pesanan_diterima` | An order is placed (checkout) | 5 |
| `dipasaria_tagihan_akhir` | An order with weighed items is weighed (corrected amounts are sent again) | 5 |
| `dipasaria_pembayaran_diterima` | Payment is confirmed (QRIS gateway or "Tandai lunas") | 4 |
| `dipasaria_dalam_pengiriman` | The order is marked "Dalam pengiriman" | 4 |
| `dipasaria_pengingat_bayar` | 30 minutes before an unpaid order's payment deadline | 5 |
| `dipasaria_pesanan_dibatalkan` | An order is cancelled (by you, or automatically when unpaid) | 4 |
| `dipasaria_pesanan_rutin` | A restaurant's standing order is placed (with any items left out) | 5 |

## Pesanan diterima: `dipasaria_pesanan_diterima`

Body:

```
Halo {{1}}, pesanan Dipasaria {{2}} sudah kami terima untuk pengiriman {{3}}. Total {{4}}.

Lihat status dan cara bayar: {{5}}

Terima kasih.
```

Samples:

- `{{1}}`: Ibu Rina
- `{{2}}`: DP-261116-AB2C
- `{{3}}`: Senin, 16 November 2026, Siang 10.00–13.00
- `{{4}}`: Rp233.000
- `{{5}}`: https://dipasaria.id/pesanan/DP-261116-AB2C?hp=6281300000001

## Tagihan akhir setelah ditimbang: `dipasaria_tagihan_akhir`

Body:

```
Halo {{1}}, pesanan {{2}} sudah ditimbang. Total akhir {{3}}. {{4}}

Rincian per produk: {{5}}

Terima kasih.
```

Samples:

- `{{1}}`: Ibu Rina
- `{{2}}`: DP-261116-AB2C
- `{{3}}`: Rp248.500
- `{{4}}`: Silakan bayar dengan QRIS di tautan di bawah; pembayaran terkonfirmasi otomatis.
- `{{5}}`: https://dipasaria.id/pesanan/DP-261116-AB2C?hp=6281300000001

## Pembayaran diterima: `dipasaria_pembayaran_diterima`

Body:

```
Terima kasih {{1}}, pembayaran {{2}} untuk pesanan {{3}} sudah kami terima. Pesanan dikirim {{4}}.

Salam segar, Dipasaria.
```

Samples:

- `{{1}}`: Ibu Rina
- `{{2}}`: Rp248.500
- `{{3}}`: DP-261116-AB2C
- `{{4}}`: Senin, 16 November 2026, Siang 10.00–13.00

## Dalam pengiriman: `dipasaria_dalam_pengiriman`

Body:

```
Halo {{1}}, pesanan {{2}} sedang diantar ke alamat Anda ({{3}}).

Lacak pesanan: {{4}}

Terima kasih.
```

Samples:

- `{{1}}`: Ibu Rina
- `{{2}}`: DP-261116-AB2C
- `{{3}}`: Siang 10.00–13.00
- `{{4}}`: https://dipasaria.id/pesanan/DP-261116-AB2C?hp=6281300000001

## Pengingat pembayaran: `dipasaria_pengingat_bayar`

Body:

```
Halo {{1}}, pesanan {{2}} sebesar {{3}} belum dibayar. Mohon selesaikan sebelum {{4}} WIB agar pesanan tidak dibatalkan otomatis.

Bayar di sini: {{5}}

Terima kasih.
```

Samples:

- `{{1}}`: Ibu Rina
- `{{2}}`: DP-261116-AB2C
- `{{3}}`: Rp233.000
- `{{4}}`: 15 Nov 21.50
- `{{5}}`: https://dipasaria.id/pesanan/DP-261116-AB2C?hp=6281300000001

## Pesanan dibatalkan: `dipasaria_pesanan_dibatalkan`

Body:

```
Halo {{1}}, pesanan {{2}} dibatalkan karena {{3}}. Bila Anda sudah membayar, dana akan kami kembalikan.

Pesan kembali: {{4}}

Terima kasih.
```

Samples:

- `{{1}}`: Ibu Rina
- `{{2}}`: DP-261116-AB2C
- `{{3}}`: pembayaran belum kami terima sampai batas waktu
- `{{4}}`: https://dipasaria.id/belanja

## Pesanan rutin dibuat: `dipasaria_pesanan_rutin`

Body:

```
Halo {{1}}, pesanan rutin untuk pengiriman {{2}} sudah dibuat dengan nomor {{3}}. {{4}}

Rincian: {{5}}

Terima kasih.
```

Samples:

- `{{1}}`: Seafood Bahari Gading
- `{{2}}`: Senin, 16 November 2026, Dapur 05.00–08.00
- `{{3}}`: DP-261116-BHR1
- `{{4}}`: Tidak tersedia malam ini: Telur Ayam Negeri habis hari ini. Produk lainnya tetap dikirim.
- `{{5}}`: https://dipasaria.id/pesanan/DP-261116-BHR1?hp=6281200000001

## Notes

- Body text may contain line breaks, but variable values may not. The app removes them automatically.
- Keep the category **Utility**. Promotional wording may make Meta reclassify a template as Marketing, which costs more and needs separate consent.
- Customers can untick WhatsApp updates at checkout. Each message type can be switched off in Back-office → Pengaturan.
