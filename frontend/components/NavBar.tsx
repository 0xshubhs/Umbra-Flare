"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const PURPLE = "#b98cf0";
const BG = "#0a0a0c";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(185,140,240,0.22)";

const LINKS = [
  { href: "/auctions", label: "Auctions" },
  { href: "/auctions/new", label: "Create" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav style={{
      height: 58, background: "rgba(10,10,12,0.85)", backdropFilter: "blur(8px)",
      borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center",
      padding: "0 28px", position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, color: TEXT, letterSpacing: "-0.02em" }}>
          Umbra
        </span>
      </Link>

      <div style={{ display: "flex", gap: 20, marginLeft: 36 }}>
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href === "/auctions" && pathname?.startsWith("/auctions/") && pathname !== "/auctions/new");
          return (
            <Link key={l.href} href={l.href} style={{
              fontSize: 13, fontWeight: 600, textDecoration: "none",
              color: active ? PURPLE : MUTED,
            }}>
              {l.label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginLeft: "auto" }}>
        <ConnectButton chainStatus="icon" accountStatus="avatar" showBalance={false} label="Connect Wallet" />
      </div>
    </nav>
  );
}
