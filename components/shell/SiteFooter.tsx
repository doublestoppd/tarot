"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Small footer (spec §5.1): quiet links + "Lock this browser". */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  async function lockBrowser() {
    try {
      await fetch("/api/access/lock", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <footer className="site-footer">
      <Link href="/methodology">Methodology</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/about">About</Link>
      <button type="button" onClick={lockBrowser}>
        Lock this browser
      </button>
    </footer>
  );
}
