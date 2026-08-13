"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const PURPLE = "#FD5299";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(253,82,153,0.22)";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/auctions", label: "Auctions" },
  { href: "/auctions/new", label: "Create" },
];

/// Fixed left dot-nav, matching the reference project's editorial layout
/// language (SilentBid's SideNav), reskinned to Umbra's palette.
export function SideNav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="hidden md:flex"
        style={{
          position: "fixed", left: 0, top: 0, zIndex: 50, height: "100vh", width: 84,
          flexDirection: "column", justifyContent: "space-between", alignItems: "center",
          borderRight: `1px solid ${BORDER}`, background: "rgba(10,10,12,0.85)", backdropFilter: "blur(10px)",
          padding: "28px 0",
        }}
      >
        <Link href="/" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{
            width: 34, height: 34, border: `1px solid ${BORDER}`, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif",
            fontWeight: 900, fontSize: 15, color: PURPLE,
          }}>
            U
          </span>
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || (item.href === "/auctions" && pathname?.startsWith("/auctions/") && pathname !== "/auctions/new");
            return (
              <Link key={item.href} href={item.href} className="group" style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: active ? PURPLE : "rgba(138,138,146,0.4)",
                  boxShadow: active ? `0 0 0 4px rgba(253,82,153,0.15)` : "none",
                  transform: active ? "scale(1.3)" : "scale(1)",
                  transition: "all 0.2s",
                }} />
                <span
                  className="opacity-0 group-hover:opacity-100"
                  style={{
                    position: "absolute", left: 26, fontFamily: "monospace", fontSize: 10,
                    textTransform: "uppercase", letterSpacing: "0.25em", whiteSpace: "nowrap",
                    color: active ? PURPLE : MUTED, transition: "opacity 0.2s",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} />
          <span style={{
            fontFamily: "monospace", fontSize: 8, color: MUTED, letterSpacing: "0.1em",
            writingMode: "vertical-rl", transform: "rotate(180deg)",
          }}>
            COSTON2
          </span>
        </div>
      </nav>

      {/* mobile top bar */}
      <nav className="flex md:hidden" style={{
        position: "sticky", top: 0, zIndex: 50, height: 56, alignItems: "center",
        padding: "0 20px", borderBottom: `1px solid ${BORDER}`, background: "rgba(10,10,12,0.92)", backdropFilter: "blur(8px)",
      }}>
        <Link href="/" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 16, color: TEXT, textDecoration: "none" }}>Umbra</Link>
        <div style={{ display: "flex", gap: 16, marginLeft: 24 }}>
          {NAV_ITEMS.slice(1).map((item) => (
            <Link key={item.href} href={item.href} style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>{item.label}</Link>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ConnectButton chainStatus="none" accountStatus="avatar" showBalance={false} label="Connect" />
        </div>
      </nav>

      {/* floating connect button, desktop only */}
      <div className="hidden md:block" style={{ position: "fixed", top: 20, right: 28, zIndex: 60 }}>
        <ConnectButton chainStatus="icon" accountStatus="avatar" showBalance={false} label="Connect Wallet" />
      </div>
    </>
  );
}
