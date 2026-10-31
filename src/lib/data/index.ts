import "server-only";
import type { Repo } from "./repo";
import { memoryRepo } from "./memory";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cached: Repo | null = null;

export async function getRepo(): Promise<Repo> {
  if (cached) return cached;
  if (isSupabaseConfigured()) {
    const { supabaseRepo } = await import("./supabase");
    cached = supabaseRepo;
  } else {
    cached = memoryRepo;
  }
  return cached;
}

export type { Repo } from "./repo";
