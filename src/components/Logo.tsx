// Dipasaria identity. The mark is a "D" whose straight back forms a forked tail and whose bowl
// forms the body of a fish; one eye completes it. See docs/brand-guidelines.md.

export const MARK_PATH = "M11 9.5 L31 12 C45.5 12 54 21 54 32 C54 43 45.5 52 31 52 L11 54.5 L20.5 32 Z";

type Tone = "gold" | "black" | "white";
const FILL: Record<Tone, { body: string; eye: string }> = {
  gold: { body: "#EAB200", eye: "#000000" },
  black: { body: "#000000", eye: "#EAB200" },
  white: { body: "#FFFFFF", eye: "#000000" },
};

export function LogoMark({ className = "h-8 w-8", tone = "gold", tile = false }: { className?: string; tone?: Tone; tile?: boolean; light?: boolean }) {
  const f = FILL[tone];
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {tile && <rect width="64" height="64" rx="12" fill={tone === "gold" ? "#000" : "#EAB200"} />}
      <path d={MARK_PATH} fill={f.body} />
      <circle cx="43.5" cy="26" r="2.5" fill={f.eye} />
    </svg>
  );
}

/**
 * Primary lockup: mark + tracked condensed wordmark, optional descriptor.
 * `dark` = for black backgrounds (gold mark, white word); otherwise black mark, black word.
 */
export function Logo({ dark = false, size = "md", descriptor = false }: { dark?: boolean; size?: "sm" | "md" | "lg"; descriptor?: boolean }) {
  const word = size === "lg" ? "text-[30px]" : size === "sm" ? "text-[19px]" : "text-[23px]";
  const mark = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Dipasaria">
      <LogoMark className={mark} tone={dark ? "gold" : "black"} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-extrabold uppercase tracking-[0.1em] ${word} ${dark ? "text-white" : "text-ocean-950"}`}>Dipasaria</span>
        {descriptor && <span className={`mt-1 pl-px font-sans text-[8.5px] font-semibold uppercase tracking-[0.38em] ${dark ? "text-coral-500" : "text-gold-ink"}`}>Protein pilihan · Jakarta</span>}
      </span>
    </span>
  );
}

/** Provenance seal for footers, packaging and story sections. */
export function Seal({ className = "h-40 w-40", color = "#EAB200", eye = "#000" }: { className?: string; color?: string; eye?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-label="Dipasaria · Protein pilihan · Muara Baru, Jakarta" role="img">
      <defs><path id="dp-seal-ring" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" /></defs>
      <circle cx="100" cy="100" r="95" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="100" cy="100" r="89" fill="none" stroke={color} strokeWidth="0.6" />
      <circle cx="100" cy="100" r="56" fill="none" stroke={color} strokeWidth="0.8" />
      <text fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="700" fontSize="14.5" fill={color}>
        <textPath href="#dp-seal-ring" textLength="436" lengthAdjust="spacing">DIPASARIA ✦ PROTEIN PILIHAN ✦ MUARA BARU · JAKARTA ✦</textPath>
      </text>
      <g transform="translate(65 65) scale(1.09)"><path d={MARK_PATH} fill={color} /><circle cx="43.5" cy="26" r="2.5" fill={eye} /></g>
    </svg>
  );
}
