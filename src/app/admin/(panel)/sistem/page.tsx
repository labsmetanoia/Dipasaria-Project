import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { SITE_URL } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { turnstileEnabled } from "@/lib/guard";
import { SystemActions, ResolveButton } from "@/components/admin/SystemActions";
import { getGateway } from "@/lib/payments/gateway";
import { waApiEnabled } from "@/lib/notify/service";

export const metadata = { title: "Sistem" };

type Check = { label: string; ok: boolean | "warn"; detail: string };

const JOB_LABEL: Record<string, string> = { expire_unpaid: "Pembatalan otomatis pesanan belum dibayar", standing_orders: "Pesanan rutin restoran" };

export default async function SystemPage() {
  await requireAdmin();
  const repo = await getRepo();
  const [dbOk, settings, errors, jobs] = await Promise.all([
    repo.ping().catch(() => false),
    repo.getSettings(),
    repo.listErrors({ limit: 100 }),
    repo.listJobs(),
  ]);
  const bankPlaceholder = !settings.bank_account || /^0+$/.test(settings.bank_account.replace(/\D/g, ""));
  const checks: Check[] = [
    { label: "Database", ok: dbOk, detail: dbOk ? (repo.mode === "supabase" ? "Supabase terhubung" : "Mode demo (data di memori, hilang saat server dimulai ulang)") : "Database tidak menjawab" },
    { label: "Perlindungan bot", ok: turnstileEnabled() ? true : "warn", detail: turnstileEnabled() ? "Cloudflare Turnstile aktif di checkout, login dan pendaftaran; batas percobaan aktif" : "Batas percobaan aktif. Turnstile belum diatur (TURNSTILE_SITE_KEY dan TURNSTILE_SECRET_KEY)" },
    { label: "Notifikasi error", ok: process.env.ALERT_WEBHOOK_URL ? true : "warn", detail: process.env.ALERT_WEBHOOK_URL ? "Error baru dikirim ke chat (ALERT_WEBHOOK_URL)" : "Belum diatur: error hanya terlihat di halaman ini. Isi ALERT_WEBHOOK_URL (misalnya bot Telegram)" },
    { label: "Jadwal otomatis", ok: process.env.CRON_SECRET ? true : false, detail: process.env.CRON_SECRET ? "CRON_SECRET diatur" : "CRON_SECRET belum diatur: pesanan rutin tidak diproses otomatis" },
    { label: "Rekening bank", ok: bankPlaceholder ? false : true, detail: bankPlaceholder ? "Masih contoh (0000000000). Ganti di Pengaturan sebelum menerima pesanan" : `${settings.bank_name} ${settings.bank_account}` },
    { label: "QRIS", ok: settings.qris_image_url ? true : "warn", detail: settings.qris_image_url ? "Gambar QRIS diatur" : "Belum ada gambar QRIS; pelanggan QRIS hanya melihat petunjuk" },
    { label: "QRIS otomatis", ok: getGateway()?.name === "midtrans" ? true : "warn", detail: getGateway()?.name === "midtrans" ? `${getGateway()!.label}: QR sesuai nominal, lunas otomatis. URL notifikasi: ${SITE_URL}/api/payments/midtrans` : getGateway() ? "Gateway demo aktif (tanpa uang sungguhan). Isi MIDTRANS_SERVER_KEY untuk pembayaran nyata" : "Belum diatur: pelanggan QRIS memakai gambar QRIS statis dan konfirmasi manual. Isi MIDTRANS_SERVER_KEY" },
    { label: "WhatsApp otomatis ke pelanggan", ok: waApiEnabled() ? true : "warn", detail: waApiEnabled() ? "WhatsApp Cloud API aktif: pesan terkirim otomatis (lihat menu Pesan WA)" : "Belum diatur: pesan disiapkan di menu Pesan WA untuk dikirim manual. Isi WHATSAPP_TOKEN dan WHATSAPP_PHONE_NUMBER_ID" },
    { label: "Batas waktu pembayaran", ok: true, detail: settings.payment_window_minutes > 0 ? `${settings.payment_window_minutes} menit untuk pesanan rumah tangga transfer/QRIS` : "Nonaktif (0): pesanan belum dibayar tidak dibatalkan otomatis" },
  ];
  const tone = (ok: Check["ok"]) => (ok === true ? "bg-success-50 text-success-600" : ok === "warn" ? "bg-warn-50 text-warn-600" : "bg-coral-50 text-gold-ink");
  const word = (ok: Check["ok"]) => (ok === true ? "Baik" : ok === "warn" ? "Perlu diatur" : "Perlu tindakan");

  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Sistem</p><h1 className="text-2xl text-ocean-900">Kesehatan sistem dan error</h1></div>

      <div className="card divide-y divide-line">
        {checks.map((c) => (
          <div key={c.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div><p className="font-semibold">{c.label}</p><p className="text-mute">{c.detail}</p></div>
            <span className={`px-2 py-0.5 text-[11px] font-semibold ${tone(c.ok)}`}>{word(c.ok)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 text-sm">
          <p className="font-semibold text-ocean-900">Tugas terjadwal</p>
          <ul className="mt-2 space-y-1.5">
            {["expire_unpaid", "standing_orders"].map((j) => { const r = jobs.find((x) => x.job === j); return (
              <li key={j} className="flex flex-wrap justify-between gap-2"><span>{JOB_LABEL[j]}</span><span className="text-mute">{r ? `${formatDateTime(r.last_at)} WIB · ${r.result}` : "Belum pernah berjalan"}</span></li>); })}
          </ul>
          <SystemActions />
        </div>
        <div className="card p-4 text-sm">
          <p className="font-semibold text-ocean-900">Pemantauan uptime</p>
          <p className="mt-1 text-mute">Daftarkan alamat ini di layanan pemantau gratis (misalnya UptimeRobot, cek tiap 5 menit). Jawaban 200 berarti toko dan database berjalan.</p>
          <p className="mt-2 break-all font-mono text-xs">{SITE_URL}/api/health</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="font-semibold text-ocean-900">Error belum ditangani ({errors.length})</p>
          {errors.length > 0 && <ResolveButton fingerprints="all" label="Tandai semua selesai" />}
        </div>
        {errors.length === 0 ? <p className="px-4 py-6 text-sm text-mute">Tidak ada error. Error dari server dan browser pelanggan akan muncul di sini, dikelompokkan per jenis.</p> : (
          <ul className="divide-y divide-line">
            {errors.map((e) => (
              <li key={e.fingerprint} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{e.message}</p>
                    <p className="text-xs text-mute">{e.source === "client" ? "Browser" : e.source === "job" ? "Tugas terjadwal" : e.source === "action" ? "Aksi" : "Server"}{e.path ? ` · ${e.path}` : ""} · {e.count}× · pertama {formatDateTime(e.first_at)}, terakhir {formatDateTime(e.last_at)} WIB{e.digest ? ` · ref ${e.digest}` : ""}</p>
                  </div>
                  <ResolveButton fingerprints={[e.fingerprint]} label="Selesai" />
                </div>
                {e.detail && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-gold-ink">Detail teknis</summary><pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all bg-sand-100 p-2 text-[11px]">{e.detail}</pre></details>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
