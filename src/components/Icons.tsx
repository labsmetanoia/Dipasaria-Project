import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...p });

/** Product illustration icons drawn as single-weight line art. Tinted by storage class in <ProductArt>. */
export const ProductIcons: Record<string, (p: P) => React.JSX.Element> = {
  fish: (p) => (
    <svg {...base(p)}>
      <path d="M6 24c5-8 12-12 21-12 4 0 8 1 11 3l6-6v30l-6-6c-3 2-7 3-11 3-9 0-16-4-21-12z" />
      <circle cx="16" cy="22" r="1.6" fill="currentColor" stroke="none" />
      <path d="M14 31c6 2 12 2 18 0M24 12c-2 3-3 6-3 9" />
    </svg>
  ),
  shrimp: (p) => (
    <svg {...base(p)}>
      <path d="M12 16c0-5 4-8 9-8h10c6 0 9 4 9 9 0 10-7 17-16 19-6 1-11-2-13-6" />
      <path d="M20 8c-4 4-5 9-3 14M26 8c-3 5-3 10 0 15M32 9c-2 5-1 10 2 14" />
      <path d="M11 30c-3 1-5 3-6 6M14 34c-2 2-3 4-3 7M18 36c0 2-1 4-2 6" />
      <circle cx="35" cy="14" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  squid: (p) => (
    <svg {...base(p)}>
      <path d="M24 4l9 12v10c0 5-4 9-9 9s-9-4-9-9V16z" />
      <path d="M15 35c-3 3-4 7-3 9M20 36c-1 3-1 6 0 8M24 36v9M28 36c1 3 1 6 0 8M33 35c3 3 4 7 3 9" />
      <circle cx="20" cy="22" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="22" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  fillet: (p) => (
    <svg {...base(p)}>
      <path d="M8 30c0-10 10-20 24-20 6 0 10 3 10 8 0 10-12 20-26 20-5 0-8-3-8-8z" />
      <path d="M14 30c4-5 10-9 18-11M18 36c4-6 10-11 18-14M12 24c2-3 5-6 9-8" />
    </svg>
  ),
  chicken: (p) => (
    <svg {...base(p)}>
      <path d="M30 8c6 0 10 4 10 10 0 8-7 14-16 16l-7 7-3-3 2-4-4-1 7-7c0-9 5-18 11-18z" />
      <path d="M12 38l-3 3M9 35l-3 3" />
      <circle cx="33" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  egg: (p) => (
    <svg {...base(p)}>
      <path d="M24 5c8 0 14 13 14 23 0 8-6 15-14 15S10 36 10 28C10 18 16 5 24 5z" />
      <path d="M17 24c0-5 2-10 5-13" />
    </svg>
  ),
  bottle: (p) => (
    <svg {...base(p)}>
      <path d="M19 4h10v8l4 6v22a4 4 0 01-4 4H19a4 4 0 01-4-4V18l4-6z" />
      <path d="M15 24h18M15 34h18" />
    </svg>
  ),
  box: (p) => (
    <svg {...base(p)}>
      <path d="M6 16l18-8 18 8-18 8z" />
      <path d="M6 16v18l18 8 18-8V16M24 24v18" />
      <path d="M15 12l18 8" />
    </svg>
  ),
  snow: (p) => (
    <svg {...base(p)}>
      <path d="M24 6v36M8 15l32 18M8 33l32-18" />
      <path d="M20 10l4 4 4-4M20 38l4-4 4 4M11 20l5-1 1-5M11 28l5 1 1 5M37 20l-5-1-1-5M37 28l-5 1-1 5" />
    </svg>
  ),
};

export function ProductIcon({ name, ...p }: { name: string } & P) {
  const Icon = ProductIcons[name] ?? ProductIcons.fish;
  return <Icon {...p} />;
}
