"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

interface SavedCustomer {
  name: string;
  phone: string;
  address: string;
  area_id: string;
  maps_url: string;
}

interface SavedOrderRef {
  code: string;
  phone: string;
  at: string;
}

interface CartState {
  lines: CartLine[];
  lastAdded: { name: string; at: number } | null;
  customer: SavedCustomer;
  orders: SavedOrderRef[];
  add: (line: CartLine) => void;
  setQty: (variant_id: string, prep_option_id: string | null, qty: number) => void;
  remove: (variant_id: string, prep_option_id: string | null) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  saveCustomer: (c: Partial<SavedCustomer>) => void;
  rememberOrder: (ref: SavedOrderRef) => void;
  notify: (name: string) => void;
}

const same = (a: CartLine, variant_id: string, prep: string | null) => a.variant_id === variant_id && (a.prep_option_id ?? null) === (prep ?? null);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      lastAdded: null,
      customer: { name: "", phone: "", address: "", area_id: "", maps_url: "" },
      orders: [],
      add: (line) =>
        set((s) => {
          const i = s.lines.findIndex((l) => same(l, line.variant_id, line.prep_option_id));
          if (i >= 0) {
            const next = s.lines.slice();
            next[i] = { ...next[i], qty: Math.round((next[i].qty + line.qty) * 1000) / 1000 };
            return { lines: next };
          }
          return { lines: [...s.lines, line] };
        }),
      setQty: (variant_id, prep, qty) =>
        set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => !same(l, variant_id, prep)) : s.lines.map((l) => (same(l, variant_id, prep) ? { ...l, qty } : l)) })),
      remove: (variant_id, prep) => set((s) => ({ lines: s.lines.filter((l) => !same(l, variant_id, prep)) })),
      replace: (lines) => set({ lines }),
      clear: () => set({ lines: [] }),
      saveCustomer: (c) => set((s) => ({ customer: { ...s.customer, ...c } })),
      notify: (name) => set({ lastAdded: { name, at: Date.now() } }),
      rememberOrder: (ref) => set((s) => ({ orders: [ref, ...s.orders.filter((o) => o.code !== ref.code)].slice(0, 30) })),
    }),
    { name: "dipasaria-cart", version: 1, partialize: (s) => ({ lines: s.lines, customer: s.customer, orders: s.orders }) as unknown as CartState },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.length;
