import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getRepo, isSupabaseConfigured } from "./data";
import type { BusinessAccount } from "./types";

export const BIZ_COOKIE = "dp_biz";
export const ADMIN_COOKIE = "dp_admin";
const NINETY_DAYS = 90 * 24 * 3600;

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

// ---------- Business account session (phone + access code) ----------

export async function getCurrentAccount(): Promise<BusinessAccount | null> {
  const token = (await cookies()).get(BIZ_COOKIE)?.value;
  if (!token) return null;
  const repo = await getRepo();
  return repo.getAccountBySession(token);
}

export async function setBusinessSession(token: string) {
  (await cookies()).set(BIZ_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: NINETY_DAYS });
}

export async function clearBusinessSession() {
  const jar = await cookies();
  const token = jar.get(BIZ_COOKIE)?.value;
  if (token) (await getRepo()).endSession(token).catch(() => undefined);
  jar.delete(BIZ_COOKIE);
}

// ---------- Admin session ----------
// Supabase mode: Supabase Auth (email + password) and membership of the admins table.
// Demo mode: a single password from DEMO_ADMIN_PASSWORD, signed into a cookie.

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  if (isSupabaseConfigured()) {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => jar.getAll(), setAll: () => undefined },
    });
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const { createClient } = await import("@supabase/supabase-js");
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data: row } = await service.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
    return Boolean(row);
  }
  const v = jar.get(ADMIN_COOKIE)?.value;
  if (!v) return false;
  const expected = sign("admin");
  return v.length === expected.length && timingSafeEqual(Buffer.from(v), Buffer.from(expected));
}

export async function adminLogin(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const jar = await cookies();
  if (isSupabaseConfigured()) {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => jar.set(name, value, options)),
      },
    });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: "Email atau kata sandi salah." };
    if (!(await isAdmin())) {
      await supabase.auth.signOut();
      return { ok: false, error: "Akun ini belum terdaftar sebagai admin." };
    }
    return { ok: true };
  }
  const expected = process.env.DEMO_ADMIN_PASSWORD || "dipasaria";
  if (password !== expected) return { ok: false, error: "Kata sandi salah. Mode demo: lihat .env.example." };
  jar.set(ADMIN_COOKIE, sign("admin"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 24 * 3600 });
  return { ok: true };
}

export async function adminLogout() {
  const jar = await cookies();
  if (isSupabaseConfigured()) {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => jar.set(name, value, options)),
      },
    });
    await supabase.auth.signOut();
  }
  jar.delete(ADMIN_COOKIE);
}
