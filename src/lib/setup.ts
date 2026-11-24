// Deployment self-check. In production the app refuses to run on unsafe settings (see data/index.ts and auth.ts);
// instead of a generic error page, the root layout shows exactly which setting is missing. Only variable names
// are shown, never values.
import "server-only";

export interface SetupProblem { id: string; title: string; fix: string }

const KNOWN_DEFAULTS = new Set(["dev-secret-change-me", "change-me-to-a-long-random-string"]);

function envProblems(): SetupProblem[] {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return [];
  const out: SetupProblem[] = [];
  const supabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const demo = process.env.DEMO_MODE === "1";
  if (!supabase && !demo) {
    out.push({ id: "mode", title: "Database belum dipilih", fix: "Hubungkan Supabase (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY), atau untuk pratinjau tanpa database set DEMO_MODE = 1." });
  }
  if (supabase && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    out.push({ id: "anon", title: "Kunci anon Supabase belum diisi", fix: "Set NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase → Project Settings → API → anon public)." });
  }
  const s = process.env.SESSION_SECRET ?? "";
  if (KNOWN_DEFAULTS.has(s) || s.length < 16) {
    out.push({ id: "secret", title: "SESSION_SECRET belum diset atau masih nilai contoh", fix: "Set SESSION_SECRET ke teks acak minimal 32 karakter (misalnya hasil `openssl rand -hex 32`, atau ketik acak 40 huruf dan angka)." });
  }
  if (demo && !supabase && !process.env.DEMO_ADMIN_PASSWORD) {
    out.push({ id: "demo-pass", title: "Kata sandi admin mode demo belum diset", fix: "Set DEMO_ADMIN_PASSWORD (kata sandi untuk masuk ke /admin di mode demo)." });
  }
  return out;
}

let dbCache: { at: number; problems: SetupProblem[] } | null = null;

/** With Supabase: are the tables and columns from the latest migrations there? Cached for a minute. */
async function databaseProblems(): Promise<SetupProblem[]> {
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) return [];
  if (dbCache && Date.now() - dbCache.at < (dbCache.problems.length ? 15_000 : 60_000)) return dbCache.problems;
  const problems: SetupProblem[] = [];
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const checks: Array<[string, () => PromiseLike<{ error: unknown }>]> = [
      ["004", () => sb.from("orders").select("client_ref, promo_type").limit(1)],
      ["005", () => sb.from("orders").select("pay_by").limit(1)],
      ["005", () => sb.from("error_events").select("fingerprint").limit(1)],
      ["006", () => sb.from("payments").select("id").limit(1)],
      ["007", () => sb.from("wa_messages").select("id").limit(1)],
      ["007", () => sb.from("settings").select("wa_events").limit(1)],
      ["008", () => sb.from("customers").select("id").limit(1)],
      ["009", () => sb.from("order_items").select("stock_reserved").limit(1)],
      ["010", () => sb.from("claims").select("id").limit(1)],
      ["010", () => sb.from("orders").select("substitution, delivered_at").limit(1)],
      ["011", () => sb.from("orders").select("due_date").limit(1)],
      ["011", () => sb.from("settings").select("terms_grace_days").limit(1)],
      ["011", () => sb.from("account_payments").select("id").limit(1)],
      ["012", () => sb.from("standing_orders").select("customer_id, every_weeks, paused_reason").limit(1)],
    ];
    const missing = new Set<string>();
    for (const [m, q] of checks) if ((await q()).error) missing.add(m);
    if (missing.size) {
      const files = [...missing].sort().map((m) => `supabase/migrations/${m}_*.sql`).join(", ");
      problems.push({ id: "schema", title: "Database Supabase belum diperbarui", fix: `Di Supabase → SQL Editor jalankan ${files} (berurutan), lalu jalankan ulang supabase/schema.sql.` });
    }
  } catch {
    problems.push({ id: "db", title: "Supabase tidak dapat dihubungi", fix: "Periksa NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY, dan pastikan proyek Supabase tidak sedang dijeda (paused)." });
  }
  dbCache = { at: Date.now(), problems };
  return problems;
}

export async function setupProblems(): Promise<SetupProblem[]> {
  const env = envProblems();
  if (env.length) return env;
  return databaseProblems();
}
