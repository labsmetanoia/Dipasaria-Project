// Search-visibility test (no browser): reads the site the way a search engine does.
// Checks robots.txt, the sitemap, every page reachable from the home page (title, description, canonical address,
// one main heading, preview image, valid structured data), that private pages stay out of search results, the
// product feed, and a page-weight budget.
// Run against a fresh demo server:  node scripts/test-seo.cjs   (E2E_BASE overrides http://localhost:3000)
const BASE = process.env.E2E_BASE || "http://localhost:3000";
const fails = [];
let oks = 0;
const check = (cond, msg) => { if (cond) { oks++; console.log("ok:", msg); } else { fails.push(msg); console.log("FAIL:", msg); } };
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const pick = (html, re) => { const m = re.exec(html); return m ? decode(m[1]) : null; };
const pathOf = (u) => { try { return new URL(u, BASE).pathname; } catch { return null; } };

async function read(path) {
  // an ordinary phone browser, not a known crawler: metadata must be in the head for everyone
  const r = await fetch(BASE + path, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" } });
  const row = { path, status: r.status, location: r.headers.get("location") };
  if (r.status !== 200 && r.status !== 404) return row;
  const html = await r.text();
  row.bytes = html.length;
  row.html = html;
  row.title = pick(html, /<title>([^<]*)<\/title>/);
  row.desc = pick(html, /<meta name="description" content="([^"]*)"/);
  row.canonical = pick(html, /<link rel="canonical" href="([^"]*)"/);
  row.robots = pick(html, /<meta name="robots" content="([^"]*)"/) || "";
  row.ogImage = pick(html, /<meta property="og:image" content="([^"]*)"/);
  row.h1 = (html.match(/<h1[\s>]/g) || []).length;
  const head = html.slice(0, html.indexOf("</head>"));
  row.inHead = /<title>/.test(head) && /<meta name="description"/.test(head) && (/<link rel="canonical"/.test(head) || /noindex/.test(row.robots));
  row.ld = [];
  row.ldBroken = 0;
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) { try { row.ld.push(...[].concat(JSON.parse(m[1]))); } catch { row.ldBroken++; } }
  return row;
}

(async () => {
  // ---------- robots.txt and sitemap ----------
  const robots = await (await fetch(BASE + "/robots.txt")).text();
  check(/Disallow: \/admin/.test(robots) && /Disallow: \/checkout/.test(robots) && /Disallow: \/pesanan/.test(robots) && /Disallow: \/tagihan/.test(robots) && /Allow: \//.test(robots), "robots.txt lets search engines into the shop and keeps them out of admin, checkout, orders and statements");
  check(/Sitemap: \S+\/sitemap\.xml/.test(robots), "robots.txt points to the sitemap");
  const sm = await fetch(BASE + "/sitemap.xml");
  const smXml = await sm.text();
  const locs = [...smXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(decode(m[1])));
  check(sm.status === 200 && locs.length >= 70 && new Set(locs).size === locs.length, `sitemap.xml lists ${locs.length} pages, each once`);
  check(locs.some((p) => /^\/belanja\/produk\//.test(p)) && locs.some((p) => /^\/belanja\/kategori\//.test(p)) && locs.some((p) => /^\/resep\//.test(p)) && locs.some((p) => /^\/panduan\//.test(p)), "sitemap covers products, categories, recipes and guides");
  check(!locs.some((p) => /^\/(admin|api|akun$|keranjang|checkout|pesanan|tagihan)/.test(p)), "sitemap contains no private page");
  check(/<image:loc>/.test(smXml), "sitemap carries product photos for image search");

  // ---------- redirects ----------
  const home = await read("/");
  check(home.status === 308 && pathOf(home.location) === "/belanja", "the bare address redirects permanently (308) to the shop");

  // ---------- crawl from the home page ----------
  const seen = new Map();
  const queue = ["/belanja", ...locs];
  while (queue.length && seen.size < 500) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    const row = await read(path);
    seen.set(path, row);
    if (row.status !== 200) continue;
    for (const m of row.html.matchAll(/href="(\/[^"#]*)"/g)) {
      const p = decode(m[1]);
      if (/^\/(_next|api|admin|images|brand|icons|feeds)/.test(p) || /\.(png|jpg|svg|ico|webmanifest|xml|txt)(\?|$)/.test(p) || seen.has(p)) continue;
      queue.push(p);
    }
  }
  const rows = [...seen.values()];
  const pages = rows.filter((r) => r.status === 200);
  const indexable = pages.filter((r) => !/noindex/.test(r.robots));
  const broken = rows.filter((r) => r.status >= 400);
  check(broken.length === 0, `no broken internal links (${pages.length} pages reached)${broken.length ? ": " + broken.map((r) => r.path).join(", ") : ""}`);
  const list = (xs) => (xs.length ? ": " + xs.slice(0, 6).map((r) => r.path).join(", ") : "");
  let bad = indexable.filter((r) => !r.canonical || pathOf(r.canonical) !== r.path.split("?")[0]);
  check(bad.length === 0, "every indexable page names itself as the canonical address" + list(bad));
  bad = pages.filter((r) => !r.inHead);
  check(bad.length === 0, "title, description and canonical address are in the <head> of the first HTML, for every visitor" + list(bad));
  bad = pages.filter((r) => r.h1 !== 1);
  check(bad.length === 0, "every page has exactly one main heading" + list(bad));
  bad = indexable.filter((r) => !r.title || r.title.length < 15 || r.title.length > (r.path.startsWith("/panduan/") ? 90 : 60));
  check(bad.length === 0, "titles fit what a search result shows (60 characters; guide headlines up to 90)" + list(bad));
  bad = indexable.filter((r) => !r.desc || r.desc.length < 70 || r.desc.length > 160);
  check(bad.length === 0, "descriptions are 70–160 characters" + list(bad));
  const dups = (key) => Object.values(indexable.reduce((m, r) => { (m[r[key]] ||= []).push(r); return m; }, {})).filter((g) => g.length > 1).map((g) => g[0]);
  check(dups("title").length === 0, "no two indexable pages share a title" + list(dups("title")));
  check(dups("desc").length === 0, "no two indexable pages share a description" + list(dups("desc")));
  bad = indexable.filter((r) => !r.ogImage);
  check(bad.length === 0, "every indexable page has a preview image for WhatsApp and social sharing" + list(bad));
  bad = pages.filter((r) => r.ldBroken > 0);
  check(bad.length === 0, "all structured data is valid JSON" + list(bad));
  bad = indexable.filter((r) => !locs.includes(r.path));
  check(bad.length === 0, "every indexable page is in the sitemap" + list(bad));
  bad = locs.filter((p) => { const r = seen.get(p); return !r || r.status !== 200 || /noindex/.test(r.robots); });
  check(bad.length === 0, "every sitemap entry loads and may be indexed" + (bad.length ? ": " + bad.slice(0, 6).join(", ") : ""));

  // ---------- structured data ----------
  const types = (r) => r.ld.map((x) => x["@type"]);
  const of = (r, t) => r.ld.find((x) => x["@type"] === t);
  const products = indexable.filter((r) => r.path.startsWith("/belanja/produk/"));
  const priced = products.filter((r) => of(r, "Product"));
  bad = priced.filter((r) => { const p = of(r, "Product"); const offers = [].concat(p.offers || []); return !p.name || !p.image || !offers.length || offers.some((o) => !(o.price > 0) || o.priceCurrency !== "IDR" || !/schema\.org\/(InStock|OutOfStock|PreOrder)$/.test(o.availability)); });
  check(priced.length >= 40 && bad.length === 0, `${priced.length} of ${products.length} product pages carry Product data with photo, price in IDR and availability` + list(bad));
  const preorders = products.filter((r) => [].concat(of(r, "Product")?.offers || []).some((o) => /PreOrder$/.test(o.availability)));
  // (the example campaign's dates are fixed, so after it closes no product says PreOrder; that is correct too)
  check(preorders.every((r) => /tahun-baru/.test(r.path)), `only seasonal pre-order products say PreOrder to Google (${preorders.length} now)` + list(preorders.filter((r) => !/tahun-baru/.test(r.path))));
  bad = products.filter((r) => !of(r, "Product") && !/Khusus akun bisnis/.test(r.html));
  check(bad.length === 0, "only restaurant-only products (no household price to publish) go without Product data" + list(bad));
  const weighed = seen.get("/belanja/produk/kakap-merah");
  check(Boolean(weighed) && [].concat(of(weighed, "Product").offers).every((o) => o.priceSpecification?.referenceQuantity?.unitCode === "KGM"), "items sold by weight state their price per kilogram");
  check(products.every((r) => r.ogImage && /\/images\/|supabase/.test(r.ogImage)), "product pages preview with the product photo");
  const recipes = indexable.filter((r) => /^\/resep\/./.test(r.path));
  bad = recipes.filter((r) => { const x = of(r, "Recipe"); return !x || !x.image || !(x.recipeIngredient || []).length || !(x.recipeInstructions || []).length || !/^PT\d+M$/.test(x.totalTime); });
  check(recipes.length >= 5 && bad.length === 0, `${recipes.length} recipe pages carry Recipe data (photo, time, ingredients, steps)` + list(bad));
  const guides = indexable.filter((r) => /^\/panduan\/./.test(r.path));
  bad = guides.filter((r) => { const x = of(r, "Article"); return !x || !x.headline || !/^\d{4}-\d{2}-\d{2}/.test(x.datePublished); });
  check(guides.length >= 5 && bad.length === 0, `${guides.length} guides carry Article data with a publication date` + list(bad));
  bad = [...products, ...recipes, ...guides, ...indexable.filter((r) => r.path.startsWith("/belanja/kategori/"))].filter((r) => !types(r).includes("BreadcrumbList"));
  check(bad.length === 0, "product, category, recipe and guide pages carry a breadcrumb trail" + list(bad));
  bad = indexable.filter((r) => !types(r).includes("OnlineStore"));
  check(bad.length === 0, "every page identifies the business (OnlineStore)" + list(bad));

  // ---------- private and missing pages ----------
  for (const p of ["/keranjang", "/checkout", "/akun", "/pesanan", "/belanja/cari"]) {
    const r = seen.get(p) || (await read(p));
    check(r.status === 200 && /noindex/.test(r.robots), `${p} is kept out of search results`);
  }
  const missing = await read("/belanja/produk/tidak-ada-ikan-ini");
  check(missing.status === 404 && /noindex/.test(missing.robots), "an unknown product answers 404 and is not indexed");
  const sorted = await read("/belanja/semua?sort=harga&kategori=ikan-segar");
  check(sorted.status === 200 && pathOf(sorted.canonical) === "/belanja/semua", "filtered or sorted lists point back to the one canonical page");

  // ---------- product feed ----------
  const feed = await fetch(BASE + "/feeds/google.xml");
  const feedXml = await feed.text();
  const items = feedXml.split("<item>").slice(1);
  check(feed.status === 200 && items.length >= 40 && items.every((i) => /<g:price>\d+ IDR<\/g:price>/.test(i) && /<g:image_link>https?:\/\//.test(i) && /<g:availability>(in_stock|out_of_stock)<\/g:availability>/.test(i)), `product feed for Google Merchant Center has ${items.length} items with price, photo and availability`);

  // ---------- page weight ----------
  const light = seen.get("/kontak");
  check(light.bytes < 230_000, `a simple page stays under 230 KB of HTML (${Math.round(light.bytes / 1024)} KB): the catalogue is sent once, without descriptions`);
  check((light.html.match(/v_kakap_l/g) || []).length <= 2, "the catalogue for the cart is not duplicated inside the page");

  if (fails.length) console.log("\nFailed:\n- " + fails.join("\n- "));
  console.log(fails.length ? `\n${fails.length} FAILURES` : `\nALL SEO CHECKS PASSED (${oks})`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
