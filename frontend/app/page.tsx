import Link from "next/link";
import { SideNav } from "@/components/SideNav";

const PURPLE = "#FD5299";
const BG = "#0a0a0c";
const PANEL = "#111114";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(253,82,153,0.22)";
const BORDER_STRONG = "rgba(253,82,153,0.5)";

const STEPS = [
  { num: "01", title: "Bidder encrypts", desc: "Bid amount is ECIES-encrypted client-side to the TEE's public key before it ever leaves the browser." },
  { num: "02", title: "Escrow, not exposure", desc: "Every bidder escrows the same fixed cap in FXRP — the public transaction reveals nothing about the real bid." },
  { num: "03", title: "TEE decides privately", desc: "Only the TEE decrypts bids. It computes the Vickrey winner and second-highest price — nothing else, ever." },
  { num: "04", title: "Verified settlement", desc: "A signed (winner, price) result settles on-chain: winner pays clearing price, everyone else refunded in full." },
];

export default function Home() {
  return (
    <div className="md:pl-[84px]" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SideNav />

      {/* Hero */}
      <section style={{ padding: "110px 40px 90px", textAlign: "center" }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.3em", color: MUTED, marginBottom: 20 }}>
          Flare Summer Signal · Confidential Compute Apps
        </p>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "clamp(38px, 7vw, 84px)",
          fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.04em", lineHeight: 1.02,
          color: TEXT, maxWidth: 900, margin: "0 auto 28px",
        }}>
          Sealed bids.<br />
          <span style={{ color: PURPLE }}>Verified on Flare.</span>
        </h1>
        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#c4c4ca", maxWidth: 560, lineHeight: 1.72, margin: "0 auto 40px" }}>
          Vickrey sealed-bid auctions settled in FXRP. Bid amounts are decrypted
          and compared only inside a Flare Confidential Compute TEE — the chain
          only ever learns the winner and the price they pay.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auctions" style={{
            height: 52, padding: "0 36px", background: PURPLE, color: BG, fontWeight: 800, fontSize: 15,
            display: "inline-flex", alignItems: "center", textDecoration: "none",
          }}>
            View Auctions →
          </Link>
          <Link href="/auctions/new" style={{
            height: 52, padding: "0 36px", background: "transparent", border: `1px solid ${BORDER_STRONG}`, color: TEXT,
            fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", textDecoration: "none",
          }}>
            Create an Auction
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "0 40px 90px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: `1px solid ${BORDER}` }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{
                padding: "36px 26px", borderRight: i < 3 ? `1px solid ${BORDER}` : "none",
                background: i % 2 === 0 ? PANEL : BG,
              }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 40, fontWeight: 900, color: BORDER_STRONG, marginBottom: 20 }}>{s.num}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 12.5, lineHeight: 1.7, color: MUTED }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why confidential compute */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 14 }}>
              Why not a normal contract
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(26px, 3.2vw, 40px)", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20 }}>
              Calldata is public.<br />Sealed bids can&apos;t be.
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: MUTED, marginBottom: 24 }}>
              A plain contract leaks every bid to the mempool the instant it&apos;s
              submitted. Commit-reveal needs two rounds and lets a losing bidder
              just never reveal. Vickrey&apos;s whole incentive-compatibility promise
              — bid your true value — only holds if nobody can see anyone else&apos;s
              bid to game their own.
            </p>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: MUTED }}>
              A TEE removes both problems in one round: bidders submit once, the
              enclave alone sees plaintext amounts, and only the winner and
              clearing price are ever disclosed.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "22px 24px", background: PANEL, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PURPLE, marginBottom: 10 }}>
                What&apos;s private
              </div>
              <p style={{ fontSize: 13, color: "#c4c4ca", lineHeight: 1.7 }}>
                Every individual bid amount — including the winner&apos;s own true
                bid — decrypted and compared only inside the TEE&apos;s memory.
              </p>
            </div>
            <div style={{ padding: "22px 24px", background: PANEL, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PURPLE, marginBottom: 10 }}>
                What&apos;s on-chain
              </div>
              <p style={{ fontSize: 13, color: "#c4c4ca", lineHeight: 1.7 }}>
                Just the winner&apos;s address and the second-highest bid, as a
                signature <code style={{ fontFamily: "monospace", color: PURPLE }}>UmbraAuction.settle()</code> verifies before paying out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: "auto", background: BG, borderTop: `1px solid ${BORDER}`,
        padding: "24px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 900, color: TEXT }}>Umbra</span>
        <span style={{ fontSize: 12, color: "#6a6a70" }}>Flare Summer Signal hackathon submission</span>
      </footer>
    </div>
  );
}
