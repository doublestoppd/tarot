import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { SiteFooter } from "@/components/shell/SiteFooter";

/**
 * Every document renders per-request so the framework can attach the
 * per-request CSP nonce (proxy.ts) to its inline bootstrap scripts —
 * prerendered HTML cannot carry a request nonce and would fail the strict
 * policy. Documents are small and privacy policy prefers uncached pages;
 * static assets under /_next/static keep long immutable caching.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arcanum",
  description: "A private reading space.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0d16",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
