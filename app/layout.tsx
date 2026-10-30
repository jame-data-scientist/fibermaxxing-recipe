import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Inter } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf9f4",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — real cooks, real fibre numbers`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "High-fibre and high-protein recipes from real kitchens, with nutrition calculated from USDA FoodData Central. Submit your own.",
  openGraph: {
    title: SITE_NAME,
    description:
      "High-fibre and high-protein recipes from real kitchens, with nutrition calculated from USDA data.",
    type: "website",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${serif.variable} ${sans.variable} ${mono.variable} flex min-h-screen flex-col`}
      >
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
