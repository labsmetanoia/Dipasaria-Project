import "server-only";
import type { Repo } from "./repo";
import { memoryRepo } from "./memory";
import { revalidateTag, unstable_cache } from "next/cache";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Demo (in-memory) mode is never chosen silently in production: it must be asked for with DEMO_MODE=1. */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

function assertSafeConfig() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (!isSupabaseConfigured() && process.env.DEMO_MODE !== "1") {
    throw new Error("Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY, atau set DEMO_MODE=1 untuk sengaja menjalankan mode demo.");
  }
  if (isSupabaseConfigured() && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset (dibutuhkan untuk login admin).");
  }
}

// ---------- catalogue cache ----------
// Every storefront page needs the settings, categories, products, areas and slots. They change rarely, so they are
// read from the database at most once a minute and shared by all visitors (Next.js data cache), instead of being
// queried again for each page view. Anything that can change them (a price or stock edit, an order taking or
// returning stock, a settings change) clears the cache at once, so customers never see an old price after an edit
// made in the back-office. Changes made directly in the database (SQL editor, pg_cron) show within a minute.
const CATALOGUE_TAG = "catalogue";
const CATALOGUE_TTL_SECONDS = 60;
const INVALIDATING = new Set<keyof Repo>([
  "placeOrder", "updateOrderStatus", "expireUnpaidOrders", "upsertProduct", "updateVariant", "createVariant", "setProductAvailability",
  "upsertPrepOption", "deletePrepOption", "updateSettings", "upsertArea", "upsertSlot",
]);
// Kept on globalThis: Next.js may load this module once per route bundle. `boot` keeps demo data (which lives in
// memory) from being read out of a cache entry written by an earlier run of the server.
const cat = (globalThis as typeof globalThis & { __dpCatalogue?: { version: number; boot: string } }).__dpCatalogue ??= { version: 0, boot: Date.now().toString(36) };

function invalidateCatalogue() {
  cat.version++; // this server instance reads fresh data from now on, whatever happens below
  try { revalidateTag(CATALOGUE_TAG); } catch { /* not allowed while a page is rendering; other instances catch up within the TTL */ }
}

function cachedRead<T>(name: string, mode: Repo["mode"], read: () => Promise<T>): Promise<T> {
  return unstable_cache(read, [CATALOGUE_TAG, name, mode === "memory" ? cat.boot : "db", String(cat.version)], { tags: [CATALOGUE_TAG], revalidate: CATALOGUE_TTL_SECONDS })();
}

function withCatalogueCache(repo: Repo): Repo {
  const reads: Partial<Record<keyof Repo, (...args: never[]) => unknown>> = {
    getSettings: () => cachedRead("settings", repo.mode, () => repo.getSettings()),
    getCategories: () => cachedRead("categories", repo.mode, () => repo.getCategories()),
    // only the public catalogue is cached; back-office reads with costs or inactive products always go to the database
    getProducts: (opts?: Parameters<Repo["getProducts"]>[0]) => (opts?.includeInactive || opts?.includeCost ? repo.getProducts(opts) : cachedRead("products", repo.mode, () => repo.getProducts())),
    // found in the cached list (same rows, same hidden cost), so made-up addresses never create cache entries of their own
    getProductBySlug: async (slug: string) => (await cachedRead("products", repo.mode, () => repo.getProducts())).find((p) => p.slug === slug) ?? null,
    getAreas: (opts?: Parameters<Repo["getAreas"]>[0]) => (opts?.includeInactive ? repo.getAreas(opts) : cachedRead("areas", repo.mode, () => repo.getAreas())),
    getSlots: (opts?: Parameters<Repo["getSlots"]>[0]) => (opts?.includeInactive ? repo.getSlots(opts) : cachedRead("slots", repo.mode, () => repo.getSlots())),
  };
  return new Proxy(repo, {
    get(target, prop: string) {
      const key = prop as keyof Repo;
      if (reads[key]) return reads[key];
      const value = target[key] as unknown;
      if (typeof value !== "function") return value;
      const fn = (value as (...args: unknown[]) => unknown).bind(target);
      if (!INVALIDATING.has(key)) return fn;
      return async (...args: unknown[]) => {
        let changed = true;
        try {
          const result = await fn(...args);
          if (key === "expireUnpaidOrders") changed = Number(result) > 0; // runs often and usually cancels nothing
          return result;
        } finally { if (changed) invalidateCatalogue(); }
      };
    },
  });
}

let cached: Repo | null = null;

export async function getRepo(): Promise<Repo> {
  if (cached) return cached;
  assertSafeConfig();
  if (isSupabaseConfigured()) {
    const { supabaseRepo } = await import("./supabase");
    cached = withCatalogueCache(supabaseRepo);
  } else {
    cached = withCatalogueCache(memoryRepo);
  }
  return cached;
}

export type { Repo } from "./repo";
