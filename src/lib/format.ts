const TZ = "Asia/Jakarta";

export function rupiah(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (opts.compact && Math.abs(n) >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export function qty(n: number, unit: string): string {
  const s = Number.isInteger(n) ? String(n) : n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return `${s} ${unit}`;
}

/** Current date-time parts in Jakarta time. */
export function nowJakarta(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
    minutesOfDay: hour * 60 + Number(get("minute")),
  };
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatDate(isoDate: string, style: "short" | "long" | "weekday" = "long"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (style === "weekday") {
    return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(dt);
  }
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : undefined,
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
  }).format(dt);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function relativeDayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return "Hari ini";
  if (isoDate === addDays(today, 1)) return "Besok";
  if (isoDate === addDays(today, 2)) return "Lusa";
  return formatDate(isoDate, "weekday");
}

/** Normalise an Indonesian phone number to 62xxxxxxxxx digits. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  return p;
}

export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  return /^62\d{8,13}$/.test(p);
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${normalizePhone(number)}?text=${encodeURIComponent(text)}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
