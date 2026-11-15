import "server-only";
import type { Repo } from "./repo";
import { memoryRepo } from "./memory";

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

let cached: Repo | null = null;

export async function getRepo(): Promise<Repo> {
  if (cached) return cached;
  assertSafeConfig();
  if (isSupabaseConfigured()) {
    const { supabaseRepo } = await import("./supabase");
    cached = supabaseRepo;
  } else {
    cached = memoryRepo;
  }
  return cached;
}

export type { Repo } from "./repo";
