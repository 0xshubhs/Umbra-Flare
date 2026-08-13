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

const STATS = [
  { stat: "TEE", lbl: "Confidential execution", sub: "Bids decrypted and compared only inside the enclave" },
  { stat: "Vickrey", lbl: "Second-price auctions", sub: "Truth-telling is the dominant strategy — only credible with real privacy" },
  { stat: "FCC", lbl: "Flare Confidential Compute", sub: "Verifiable off-chain compute, signed results consumed on-chain" },
  { stat: "EVM", lbl: "Any wallet works", sub: "MetaMask, Rainbow, WalletConnect — nothing exotic to install" },
];

const BUILT = [
  { label: "UmbraAuction.sol", desc: "Full Vickrey lifecycle — create, bid, close, settle. 8/8 tests passing.", status: "built" as const },
  { label: "UmbraInstructionSender.sol", desc: "Real FCC entry point using Flare's actual ITeeExtensionRegistry/ITeeMachineRegistry interfaces.", status: "built" as const },
  { label: "Go FCC extension", desc: "Decrypt, hold privately, compute Vickrey, sign — structured to match Flare's real scaffold.", status: "built" as const },
  { label: "Registered TEE machine", desc: "Needs Flare's Coston2 indexer credentials (contact required) plus governance setup.", status: "planned" as const },
];

export default function Home() {
  return (
    <div className="md:pl-[84px]" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SideNav />

      {/* vertical edge label, desktop only */}
      <div className="hidden lg:block" style={{ position: "fixed", left: 100, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
        <span style={{
          fontFamily: "monospace", fontSize: 10, color: "#3a3a40", letterSpacing: "0.4em",
          writingMode: "vertical-rl",
        }}>
          SEALED-BID · VICKREY · FCC
        </span>
      </div>

      {/* Hero */}
      <section style={{ padding: "130px 40px 100px", textAlign: "center", minHeight: "88vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.3em", color: MUTED, marginBottom: 24 }}>
          Flare Summer Signal · Confidential Compute Apps
        </p>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "clamp(42px, 8vw, 100px)",
          fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.04em", lineHeight: 0.98,
          color: TEXT, maxWidth: 980, margin: "0 auto 32px",
        }}>
          Sealed bids.<br />
          <span style={{ color: PURPLE }}>Verified on Flare.</span>
        </h1>
        <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: "#c4c4ca", maxWidth: 600, lineHeight: 1.75, margin: "0 auto 44px" }}>
          Vickrey sealed-bid auctions settled in FXRP. Bid amounts are decrypted
          and compared only inside a Flare Confidential Compute TEE — the chain
          only ever learns the winner and the price they pay.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
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
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#5a5a60", letterSpacing: "0.05em" }}>
          v0.1 · Coston2 testnet · secp256k1 ECIES + Vickrey second-price
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(26px, 3.2vw, 40px)", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>
              One round. Two things ever disclosed.
            </h2>
          </div>
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

      {/* Worked example */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 10 }}>A worked example</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(26px, 3.2vw, 40px)", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>
              Three bids in. Two numbers out.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: "26px 28px", background: PANEL, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f0a840", marginBottom: 16 }}>Private, inside the TEE</div>
              {[
                { who: "Bidder A", amt: "800 FXRP" },
                { who: "Bidder B", amt: "650 FXRP" },
                { who: "Bidder C", amt: "300 FXRP" },
              ].map((b) => (
                <div key={b.who} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontFamily: "monospace", fontSize: 13 }}>
                  <span style={{ color: MUTED }}>{b.who}</span>
                  <span style={{ color: "#c4c4ca" }}>{b.amt}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#5a5a60", marginTop: 14, lineHeight: 1.6 }}>
                None of these three numbers are ever written on-chain, logged, or shown to anyone — including each other.
              </div>
            </div>
            <div style={{ padding: "26px 28px", background: PANEL, border: `1px solid ${BORDER_STRONG}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: PURPLE, marginBottom: 16 }}>Public, on-chain after settle()</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontFamily: "monospace", fontSize: 13 }}>
                <span style={{ color: MUTED }}>Winner</span>
                <span style={{ color: TEXT }}>Bidder A</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontFamily: "monospace", fontSize: 13 }}>
                <span style={{ color: MUTED }}>Clearing price</span>
                <span style={{ color: PURPLE, fontWeight: 700 }}>650 FXRP</span>
              </div>
              <div style={{ fontSize: 11, color: "#5a5a60", marginTop: 14, lineHeight: 1.6 }}>
                Bidder A&apos;s true bid (800) and Bidder C&apos;s bid (300) stay private forever — only the winner and the second-highest price ever surface.
              </div>
            </div>
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

      {/* Stats */}
      <section style={{ padding: "0 40px 100px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {STATS.map((s) => (
              <div key={s.stat} style={{ padding: "26px 22px", background: PANEL, border: `1px solid ${BORDER}` }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(18px, 2.4vw, 26px)", fontWeight: 900, color: PURPLE, marginBottom: 8 }}>{s.stat}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{s.lbl}</div>
                <div style={{ fontSize: 11.5, color: "#6a6a70", lineHeight: 1.5 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built vs planned */}
      <section style={{ padding: "0 40px 110px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 10 }}>Honestly, where this stands</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(26px, 3.2vw, 40px)", fontWeight: 900, color: TEXT, letterSpacing: "-0.02em" }}>
              What&apos;s real, what&apos;s next.
            </h2>
          </div>
          <div style={{ border: `1px solid ${BORDER}` }}>
            {BUILT.map((b, i) => (
              <div key={b.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
                padding: "18px 24px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none",
              }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: 13.5, color: TEXT, fontWeight: 700 }}>{b.label}</span>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{b.desc}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", flexShrink: 0,
                  color: b.status === "built" ? "#4ade80" : "#f0a840",
                  border: `1px solid ${b.status === "built" ? "#4ade80" : "#f0a840"}`,
                }}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 40px 100px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(28px, 4vw, 54px)", fontWeight: 900, fontStyle: "italic", color: TEXT, letterSpacing: "-0.03em", marginBottom: 18 }}>
          Bid privately. Settle publicly.
        </h2>
        <p style={{ fontSize: "clamp(14px, 1.8vw, 17px)", color: MUTED, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
          Connect a wallet, create an auction, and see the whole sealed-bid flow run end to end on Coston2.
        </p>
        <Link href="/auctions" style={{
          height: 54, padding: "0 40px", background: PURPLE, color: BG, fontSize: 15, fontWeight: 800,
          display: "inline-flex", alignItems: "center", textDecoration: "none",
        }}>
          View Auctions →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: "auto", background: BG, borderTop: `1px solid ${BORDER}`,
        padding: "24px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 900, color: TEXT }}>Umbra</span>
          <div style={{ fontSize: 11, color: "#6a6a70", marginTop: 4 }}>Sealed-bid Vickrey auctions · Flare Confidential Compute</div>
        </div>
        <span style={{ fontSize: 12, color: "#6a6a70" }}>Flare Summer Signal hackathon submission</span>
      </footer>
    </div>
  );
}
