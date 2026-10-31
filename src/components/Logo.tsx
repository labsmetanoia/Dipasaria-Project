import { BRAND } from "@/lib/config";

export function LogoMark({ className = "h-8 w-8", light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill={light ? "#faf8f4" : "#000000"} />
      <path d="M96 256c44-70 110-106 190-106 36 0 70 10 98 30l56-52v256l-56-52c-28 20-62 30-98 30-80 0-146-36-190-106z" fill="none" stroke={light ? "#000000" : "#faf8f4"} strokeWidth="22" strokeLinejoin="round" />
      <circle cx="186" cy="238" r="14" fill={light ? "#000000" : "#faf8f4"} />
      <path d="M150 330c60 26 120 26 180 0" fill="none" stroke="#eab200" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-xl" : "text-2xl";
  const mark = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={mark} light={dark} />
      <span className={`font-display font-extrabold uppercase tracking-tight ${text} ${dark ? "text-white" : "text-ocean-950"}`}>{BRAND.name}</span>
    </span>
  );
}
