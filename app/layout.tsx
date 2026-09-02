import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import RevealObserver from "@/components/RevealObserver";
import { SITE_URL } from "@/lib/site";

const title = "Murrelet — Shirts, Polos & Shorts";
const description =
  "Considered warm-weather essentials: linen shirts, polo shirts and cotton shorts. Free standard delivery over £100.";
// Real product photography, not a placeholder — used whenever a page doesn't
// set its own OG image (most pages besides individual products).
const shareImage = "/images/hero-murrelet.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s — Murrelet" },
  description,
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: "Murrelet",
    images: [{ url: shareImage, width: 1200, height: 1500 }],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [shareImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          {children}
          <Footer />
          <CookieBanner />
          <RevealObserver />
        </CartProvider>
      </body>
    </html>
  );
}
