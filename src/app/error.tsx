"use client";
// Shown when a page crashes. Server errors are already logged by instrumentation.ts (they carry a digest);
// errors that happen only in the browser are reported from here.
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Emblem } from "@/components/Logo";
import { sendClientError } from "@/components/ErrorReporter";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useT();
  const en = locale === "en";
  useEffect(() => {
    if (!error.digest) sendClientError(error.message || "Render error", { stack: error.stack });
  }, [error]);
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Emblem className="h-24 w-24" />
      <h1 className="mt-6 max-w-2xl text-[2.4rem] sm:text-[3rem]">{en ? "Something went wrong." : "Maaf, ada gangguan."}</h1>
      <p className="mt-4 max-w-md font-sans text-[15px] text-mute">{en ? "We have been notified. Please try again; your cart is saved on this device." : "Kami sudah menerima laporannya. Silakan coba lagi; keranjang Anda tetap tersimpan di perangkat ini."}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-mute">Ref: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-accent"><RotateCcw className="h-4 w-4" /> {en ? "Try again" : "Coba lagi"}</button>
        <Link href="/belanja" className="btn-outline">{en ? "Back to the shop" : "Kembali ke toko"}</Link>
      </div>
    </section>
  );
}
