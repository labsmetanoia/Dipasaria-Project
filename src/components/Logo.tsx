import { BRAND } from "@/lib/config";

export function LogoMark({ className = "h-8 w-8", light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill={light ? "#eef6f7" : "#0b2a3f"} />
      <path d="M96 256c44-70 110-106 190-106 36 0 70 10 98 30l56-52v256l-56-52c-28 20-62 30-98 30-80 0-146-36-190-106z" fill="none" stroke={light ? "#0b2a3f" : "#eef6f7"} strokeWidth="22" strokeLinejoin="round" />
      <circle cx="186" cy="238" r="14" fill={light ? "#0b2a3f" : "#eef6f7"} />
      <path d="M150 330c60 26 120 26 180 0" fill="none" stroke="#e4573d" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const mark = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={mark} light={dark} />
      <span className={`font-display font-semibold tracking-tight ${text} ${dark ? "text-white" : "text-ocean-900"}`}>{BRAND.name}</span>
    </span>
  );
}
