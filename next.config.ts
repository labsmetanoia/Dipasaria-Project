import type { NextConfig } from "next";

// Content-Security-Policy: same-origin by default; Google Fonts for type; Supabase for uploaded product photos;
// Cloudflare Turnstile (bot check) script and frame.
// 'unsafe-inline' is needed for Next.js' inline bootstrap scripts; 'unsafe-eval' only in development (React refresh).
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  "object-src 'none'",
].join("; ");

const security = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Title, description and canonical address always go in the <head> of the first HTML. By default Next.js sends
  // them later in the body for ordinary browsers ("streaming metadata") and keeps them in the head only for a fixed
  // list of crawlers that does not include Googlebot; search engines and link previews should never depend on that.
  htmlLimitedBots: /.*/,
  // guarantee reports carry up to 3 photos (compressed in the browser to well under 1 MB each)
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // the price card is drawn on the server with the brand fonts and logo read from disk
  outputFileTracingIncludes: { "/admin/harga/kartu": ["./src/assets/fonts/*.woff", "./public/brand/logo-horizontal-reversed.png"] },
  images: {
    // Only our own files and photos uploaded to Supabase Storage are optimised: no open image proxy.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1366, 1920],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      { source: "/:path*", headers: security },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
