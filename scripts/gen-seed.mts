// Generates supabase/seed.sql from src/lib/data/seed.ts so both modes share one catalogue.
// Run: node scripts/gen-seed.mts
import { writeFileSync } from "node:fs";
import { seedAccounts, seedAreas, seedCategories, seedProducts, seedPromos, seedSettings, seedSlots } from "../src/lib/data/seed.ts";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return `array[${v.map(q).join(",")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const row = (cols: string[], vals: unknown[]) => `(${vals.map(q).join(", ")})`;
const insert = (table: string, cols: string[], rows: unknown[][], conflict = "id") =>
  rows.length
    ? `insert into ${table} (${cols.join(", ")}) values\n  ${rows.map((r) => row(cols, r)).join(",\n  ")}\non conflict (${conflict}) do update set ${cols.filter((c) => c !== conflict).map((c) => `${c} = excluded.${c}`).join(", ")};\n`
    : "";

let sql = `-- Generated from src/lib/data/seed.ts. Edit the TS file and re-run \`node scripts/gen-seed.mts\`.\n-- Prices are launch placeholders: replace them with your own price list before sharing the link.\n\n`;

const s = seedSettings;
const sc = Object.keys(s) as (keyof typeof s)[];
sql += `insert into settings (id, ${sc.join(", ")}) values (1, ${sc.map((k) => q(s[k])).join(", ")})\non conflict (id) do update set ${sc.map((k) => `${k} = excluded.${k}`).join(", ")};\n\n`;

sql += insert("categories", ["id", "slug", "name", "name_en", "description", "description_en", "sort", "icon", "image_url", "is_seafood"], seedCategories.map((c) => [c.id, c.slug, c.name, c.name_en, c.description, c.description_en, c.sort, c.icon, c.image_url, c.is_seafood])) + "\n";

const pc = ["id", "slug", "category_id", "name", "name_en", "scientific_name", "aliases", "description", "description_en", "origin", "origin_en", "storage_class", "storage_note", "storage_note_en", "is_catch_weight", "available_today", "is_active", "is_featured", "image_url", "icon", "sort"] as const;
sql += insert("products", [...pc], seedProducts.map((p) => pc.map((k) => p[k]))) + "\n";

const vc = ["id", "product_id", "label", "label_en", "unit", "min_qty", "step_qty", "price_retail", "price_business", "cost", "stock_qty", "business_only", "is_active", "sort"] as const;
sql += insert("variants", [...vc], seedProducts.flatMap((p) => p.variants.map((v) => vc.map((k) => v[k])))) + "\n";

const ppc = ["id", "product_id", "label", "label_en", "surcharge", "note", "note_en", "sort"] as const;
sql += insert("prep_options", [...ppc], seedProducts.flatMap((p) => p.prep_options.map((o) => ppc.map((k) => o[k])))) + "\n";

sql += insert("delivery_areas", ["id", "name", "fee", "is_active", "sort"], seedAreas.map((a) => [a.id, a.name, a.fee, a.is_active, a.sort])) + "\n";
sql += insert("delivery_slots", ["id", "label", "start_time", "end_time", "segment", "capacity", "is_active", "sort"], seedSlots.map((x) => [x.id, x.label, x.start_time, x.end_time, x.segment, x.capacity, x.is_active, x.sort])) + "\n";

const prc = ["id", "code", "type", "value", "min_spend", "segment", "quota", "used_count", "first_order_only", "starts_at", "ends_at", "is_active", "description"] as const;
sql += insert("promos", [...prc], seedPromos.map((p) => prc.map((k) => p[k]))) + "\n";

const bac = ["id", "business_name", "contact_name", "phone", "address", "area_id", "business_type", "discount_pct", "payment_terms", "allow_cod", "status", "access_code", "preferred_slot_id", "notes", "applied_at", "approved_at"] as const;
sql += `-- Example business accounts (demo logins: phone + code). Delete before going live.\n`;
sql += insert("business_accounts", [...bac], seedAccounts.map((a) => bac.map((k) => a[k]))) + "\n";

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log("supabase/seed.sql written:", sql.length, "bytes");
