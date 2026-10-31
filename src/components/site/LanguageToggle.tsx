"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { setLocaleAction } from "@/actions/locale";

export function LanguageToggle({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const { locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === "id" ? "en" : "id";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await setLocaleAction(next); router.refresh(); })}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-bold uppercase tracking-wide transition ${dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink/70 hover:bg-ocean-950/5 hover:text-ocean-950"} ${pending ? "opacity-60" : ""}`}
      aria-label={locale === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
    >
      <Globe className="h-3.5 w-3.5" />
      {compact ? locale.toUpperCase() : <span><span className={locale === "id" ? "" : "opacity-50"}>ID</span><span className="mx-1 opacity-40">/</span><span className={locale === "en" ? "" : "opacity-50"}>EN</span></span>}
    </button>
  );
}
