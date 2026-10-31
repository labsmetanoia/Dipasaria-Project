"use client";
import { createContext, useContext } from "react";
import type { Locale } from "./index";
import type { Dict } from "./dict";

const Ctx = createContext<{ locale: Locale; t: Dict } | null>(null);

export function LocaleProvider({ locale, t, children }: { locale: Locale; t: Dict; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t }}>{children}</Ctx.Provider>;
}

export function useT(): { locale: Locale; t: Dict } {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT must be used inside <LocaleProvider>");
  return v;
}
