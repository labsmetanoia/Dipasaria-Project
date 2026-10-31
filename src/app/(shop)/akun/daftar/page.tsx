import { getRepo } from "@/lib/data";
import { BusinessApplyForm } from "@/components/shop/BusinessApplyForm";

export const metadata = { title: "Daftar akun bisnis" };

export default async function DaftarPage() {
  const areas = await (await getRepo()).getAreas();
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-ocean-900">Daftar akun bisnis</h1>
      <p className="mt-1 text-sm text-mute">Harga grosir, slot dapur subuh, tempo setelah terbukti. Kami tinjau dalam 1 hari kerja.</p>
      <div className="card mt-5 p-5"><BusinessApplyForm areas={areas} /></div>
    </div>
  );
}
