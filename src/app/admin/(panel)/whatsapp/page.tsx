import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { waApiEnabled } from "@/lib/notify/service";
import { WaList } from "@/components/admin/WaList";

export const metadata = { title: "Pesan WhatsApp" };

export default async function WhatsAppPage() {
  await requireAdmin();
  const repo = await getRepo();
  const api = waApiEnabled();
  const [todo, recent] = await Promise.all([repo.listWaRecent(100, ["manual", "failed", "queued", "sending"]), repo.listWaRecent(40, ["sent"])]);
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Pesan WA</p><h1 className="text-2xl text-ocean-900">Pesan WhatsApp ke pelanggan</h1></div>
      <p className={`px-4 py-3 text-sm ${api ? "bg-success-50 text-success-600" : "bg-warn-50 text-warn-600"}`}>
        {api ? "WhatsApp Cloud API aktif: pesan dikirim otomatis. Yang gagal tampil di bawah untuk dikirim ulang atau dikirim manual." : "WhatsApp Cloud API belum diatur. Pesan otomatis tetap disiapkan di sini: ketuk “Kirim via WhatsApp”, lalu tekan kirim di WhatsApp. Lihat README untuk mengaktifkan pengiriman otomatis."}
      </p>
      <div className="card p-4">
        <p className="font-semibold text-ocean-900">Perlu dikirim ({todo.length})</p>
        <div className="mt-2"><WaList messages={todo} apiEnabled={api} showOrder empty="Tidak ada pesan yang menunggu." /></div>
      </div>
      <div className="card p-4">
        <p className="font-semibold text-ocean-900">Terkirim terakhir</p>
        <div className="mt-2"><WaList messages={recent} apiEnabled={api} showOrder empty="Belum ada pesan terkirim." /></div>
      </div>
    </div>
  );
}
