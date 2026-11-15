import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getRepo, isSupabaseConfigured } from "./data";
import type { BusinessAccount } from "./types";

export const BIZ_COOKIE = "dp_biz";
export const ADMIN_COOKIE = "dp_admin";
const NINETY_DAYS = 90 * 24 * 3600;

const KNOWN_DEFAULTS = new Set(["", "dev-secret-change-me", "change-me-to-a-long-random-string"]);

function secret(): string {
  const s = process.env.SESSION_SECRET ?? "";
  if (KNOWN_DEFAULTS.has(s) || s.length < 16) {
    // In production a missing or published secret would let anyone forge sessions: refuse to run.
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET belum diset atau masih nilai contoh. Gunakan string acak minimal 32 karakter.");
    return "dev-secret-change-me";
  }
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

// ---------- Business account session (phone + access code) ----------

/** The signed-in business account, without secrets (access code, internal notes), so it is safe to pass to client components. */
export async function getCurrentAccount(): Promise<BusinessAccount | null> {
  const token = (await cookies()).get(BIZ_COOKIE)?.value;
  if (!token) return null;
  const repo = await getRepo();
  const account = await repo.getAccountBySession(token);
  return account ? { ...account, access_code: null, notes: "" } : null;
}

/** Use at the top of every back-office page: layouts alone do not protect pages in the App Router. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
}

const ADMIN_TTL = 12 * 3600; // demo-mode admin session lifetime, seconds

function demoAdminPassword(): string | null {
  const p = process.env.DEMO_ADMIN_PASSWORD;
  if (p) return p;
  return process.env.NODE_ENV === "production" ? null : "dipasaria";
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
  const [exp, mac] = v.split(".");
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false;
  const expected = sign(`admin:${exp}`);
  return mac.length === expected.length && timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
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
  const expected = demoAdminPassword();
  if (!expected) return { ok: false, error: "Login admin mode demo dinonaktifkan: set DEMO_ADMIN_PASSWORD." };
  const a = Buffer.from(password), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "Kata sandi salah." };
  const exp = Math.floor(Date.now() / 1000) + ADMIN_TTL;
  jar.set(ADMIN_COOKIE, `${exp}.${sign(`admin:${exp}`)}`, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ADMIN_TTL });
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
