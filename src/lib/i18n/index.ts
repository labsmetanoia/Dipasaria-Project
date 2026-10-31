export type Locale = "id" | "en";
export const LOCALES: Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "dp_lang";

export function isLocale(x: unknown): x is Locale {
  return x === "id" || x === "en";
}

/** Pick the localized value of a pair of fields; falls back to Indonesian. */
export function pick(locale: Locale, id: string | null | undefined, en: string | null | undefined): string {
  if (locale === "en" && en) return en;
  return id ?? en ?? "";
}
