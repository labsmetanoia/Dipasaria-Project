import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="mt-6 text-2xl font-semibold text-ocean-900">Anda sedang offline</h1>
      <p className="mt-2 max-w-sm text-mute">Harga ikan berubah setiap hari, jadi katalog memerlukan koneksi. Keranjang Anda tetap tersimpan di perangkat ini.</p>
      <Link href="/belanja" className="btn-primary mt-6">Coba lagi</Link>
    </main>
  );
}
