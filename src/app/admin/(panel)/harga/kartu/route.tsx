// The daily price card as a PNG (admin only: the restaurant version shows wholesale prices). Rendered on the server
// with Next's image renderer and the brand fonts in src/assets/fonts (SIL Open Font License).
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { SITE_URL } from "@/lib/config";
import { formatDate, nowJakarta, rupiah } from "@/lib/format";
import { CARD_SIZE, cardRows, parseIds, type CardFormat, type CardVersion } from "@/lib/priceCard";

export const dynamic = "force-dynamic";

const C = { cream: "#FAF8F4", sand: "#EEE7DA", gold: "#EAB200", goldInk: "#C09200", ink: "#000000" };
const font = (f: string) => readFile(path.join(process.cwd(), "src/assets/fonts", f));
// one line per product: long names and size labels are shortened rather than wrapped
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const q = new URL(req.url).searchParams;
  const version: CardVersion = q.get("v") === "business" ? "business" : "retail";
  const format: CardFormat = q.get("f") === "post" ? "post" : "story";
  const note = String(q.get("note") ?? "").slice(0, 90);
  const size = CARD_SIZE[format];
  const repo = await getRepo();
  const [products, categories, settings] = await Promise.all([repo.getProducts(), repo.getCategories(), repo.getSettings()]);
  const { groups, more, lines } = cardRows(products, categories, parseIds(q.get("ids")), version, size.lines);
  const [display7, display8, sans5, sans7, logo] = await Promise.all([
    font("barlow-condensed-latin-700-normal.woff"), font("barlow-condensed-latin-800-normal.woff"),
    font("plus-jakarta-sans-latin-500-normal.woff"), font("plus-jakarta-sans-latin-700-normal.woff"),
    readFile(path.join(process.cwd(), "public/brand/logo-horizontal-reversed.png")),
  ]);
  const today = nowJakarta().date;
  const host = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  // the list fills what the header, footer and "more" line leave, at most 74 px a line
  const footerH = (note ? 60 : 0) + 170, moreH = more > 0 ? 60 : 0;
  const rowH = Math.min(74, Math.floor((size.height - size.header - footerH - moreH - 40) / Math.max(lines, 1)));
  const footer = version === "business"
    ? `Harga grosir akun bisnis · minimal ${rupiah(settings.min_order_business)} · kirim 05.00–08.00`
    : `Pesan sebelum ${settings.cutoff_time.replace(":", ".")} WIB, diantar besok · gratis ongkir mulai ${rupiah(settings.free_delivery_retail)}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: C.cream, fontFamily: "Jakarta", color: C.ink }}>
        <div style={{ display: "flex", flexDirection: "column", backgroundColor: C.ink, padding: format === "story" ? "64px 64px 44px" : "44px 64px 32px", borderBottom: `12px solid ${C.gold}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${logo.toString("base64")}`} width={340} height={120} alt="" style={{ objectFit: "contain", objectPosition: "left" }} />
          <div style={{ display: "flex", marginTop: 24, fontFamily: "Display", fontWeight: 800, fontSize: format === "story" ? 84 : 72, lineHeight: 0.95, color: C.cream, textTransform: "uppercase" }}>
            {version === "business" ? "Harga grosir hari ini" : "Tangkapan & harga hari ini"}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 30, fontWeight: 700, color: C.gold }}>{formatDate(today, "long")}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "28px 64px 0" }}>
          {groups.map((g) => (
            <div key={g.category} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", height: rowH, alignItems: "flex-end", paddingBottom: 6, fontFamily: "Display", fontWeight: 700, fontSize: 30, letterSpacing: 3, color: C.goldInk, textTransform: "uppercase" }}>{g.category}</div>
              {g.rows.map((r) => (
                <div key={r.variant_id} style={{ display: "flex", height: rowH, alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${C.sand}` }}>
                  <div style={{ display: "flex", alignItems: "baseline", maxWidth: 640 }}>
                    <span style={{ fontFamily: "Display", fontWeight: 800, fontSize: 42, textTransform: "uppercase", whiteSpace: "nowrap" }}>{cut(r.name, 24)}</span>
                    <span style={{ marginLeft: 14, fontSize: 24, color: "#555", whiteSpace: "nowrap" }}>{cut(r.label, 18)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "Display", fontWeight: 800, fontSize: 46 }}>{rupiah(r.price)}</span>
                    <span style={{ marginLeft: 6, fontSize: 24, color: "#555" }}>/{r.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {groups.length === 0 && <div style={{ display: "flex", marginTop: 40, fontSize: 32 }}>Pilih produk untuk kartu ini.</div>}
          {more > 0 && <div style={{ display: "flex", marginTop: 18, fontSize: 26, color: "#555" }}>{`+${more} produk lain di ${host}`}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "28px 64px", backgroundColor: C.gold }}>
          {note && <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginBottom: 10 }}>{note}</div>}
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500 }}>{footer}</div>
          <div style={{ display: "flex", marginTop: 10, fontFamily: "Display", fontWeight: 800, fontSize: 40, textTransform: "uppercase" }}>{`${host} · WA +${settings.whatsapp_number}`}</div>
        </div>
      </div>
    ),
    {
      width: size.width, height: size.height,
      fonts: [
        { name: "Display", data: display7, weight: 700, style: "normal" }, { name: "Display", data: display8, weight: 800, style: "normal" },
        { name: "Jakarta", data: sans5, weight: 500, style: "normal" }, { name: "Jakarta", data: sans7, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
