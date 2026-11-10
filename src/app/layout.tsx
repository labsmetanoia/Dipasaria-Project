import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND, SITE_URL } from "@/lib/config";
import { RegisterSW } from "@/components/RegisterSW";
import { LocaleProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.promise,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "black-translucent" },
  openGraph: { type: "website", siteName: BRAND.name, title: `${BRAND.name} — ${BRAND.tagline}`, description: BRAND.promise, locale: "id_ID", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Dipasaria" }] },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Dipasaria",
  slogan: "Segar & terpilih",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo-stacked.png`,
  areaServed: ["Jakarta", "Tangerang"],
  address: { "@type": "PostalAddress", addressLocality: "Jakarta Utara", addressCountry: "ID" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }} />
        <LocaleProvider locale={locale} t={t}>{children}</LocaleProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
