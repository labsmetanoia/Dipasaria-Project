/** Fish anatomy diagram with preparation zones, the seafood counterpart of a beef-cut chart. */
export function FishDiagram({ labels }: { labels: { head: string; loin: string; belly: string; tail: string; steak: string; fillet: string } }) {
  return (
    <svg viewBox="0 0 640 320" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="fg" x1="0" x2="1"><stop offset="0" stopColor="#2f8dc9" stopOpacity="0.35" /><stop offset="1" stopColor="#5fb0e0" stopOpacity="0.15" /></linearGradient>
      </defs>
      {/* body */}
      <path d="M70 160 C 130 70, 330 60, 470 120 L 560 70 L 540 160 L 560 250 L 470 200 C 330 260, 130 250, 70 160 Z" fill="url(#fg)" stroke="#9cd0ee" strokeWidth="2" />
      {/* zones */}
      <path d="M70 160 C 95 115, 130 95, 175 88 L 175 232 C 130 225, 95 205, 70 160 Z" fill="#ffffff" fillOpacity="0.06" stroke="#9cd0ee" strokeDasharray="4 5" />
      <line x1="175" y1="88" x2="175" y2="232" stroke="#9cd0ee" strokeDasharray="4 5" />
      <line x1="320" y1="76" x2="320" y2="244" stroke="#9cd0ee" strokeDasharray="4 5" />
      <line x1="175" y1="160" x2="470" y2="160" stroke="#9cd0ee" strokeDasharray="4 5" />
      <line x1="470" y1="120" x2="470" y2="200" stroke="#9cd0ee" strokeDasharray="4 5" />
      {/* eye and gill */}
      <circle cx="112" cy="140" r="7" fill="#eef6fb" />
      <path d="M150 110 C 165 140, 165 180, 150 210" fill="none" stroke="#9cd0ee" strokeWidth="2" />
      {/* labels */}
      <g fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill="#ffffff">
        <text x="98" y="250" textAnchor="middle">{labels.head}</text>
        <text x="248" y="112" textAnchor="middle">{labels.loin}</text>
        <text x="248" y="214" textAnchor="middle">{labels.belly}</text>
        <text x="395" y="112" textAnchor="middle">{labels.steak}</text>
        <text x="395" y="214" textAnchor="middle">{labels.fillet}</text>
        <text x="540" y="40" textAnchor="middle">{labels.tail}</text>
      </g>
      <line x1="540" y1="48" x2="540" y2="70" stroke="#9cd0ee" />
    </svg>
  );
}
