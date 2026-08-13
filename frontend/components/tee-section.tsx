"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const workflows = [
  {
    step: "01",
    name: "Encrypt & Submit",
    route: "/api/tee/submit-bid",
    offchain:
      "The browser encrypts the bid amount with ECIES (secp256k1) to the enclave's public key. The plaintext never leaves the client, and the ciphertext is a constant 129 bytes regardless of the amount.",
    onchain:
      "submitBid(auctionId, encryptedBid) stores the ciphertext and escrows a fixed bid cap in FXRP — the same cap for every bidder, so the escrow leaks nothing.",
  },
  {
    step: "02",
    name: "Enclave Compute",
    route: "/api/tee/close-auction",
    offchain:
      "The TEE reads every ciphertext, decrypts with the key only it holds, and ranks the bids in enclave memory: winner is the highest bidder, clearing price is the second-highest bid.",
    onchain:
      "closeAuction(auctionId) ends bidding. The ranking stays inside the enclave — nothing about it is written yet.",
  },
  {
    step: "03",
    name: "Settle",
    route: "UmbraAuction.settle()",
    offchain:
      "The enclave signs (winner, clearingPrice). That signature is the only thing that crosses out of the TEE; the individual bids stay behind.",
    onchain:
      "settle() recovers the signer and requires it to equal trustedTeeSigner, then pays the seller, refunds the winner cap − clearingPrice, and refunds every loser in full.",
  },
]

export function TeeSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !cardsRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        x: -60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      })

      const cards = cardsRef.current?.querySelectorAll(":scope > div")
      if (cards) {
        gsap.from(cards, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="tee" className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12">
      {/* Section header */}
      <div ref={headerRef} className="mb-16 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            03 / Flare Confidential Compute
          </span>
          <h2 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">
            INSIDE THE ENCLAVE
          </h2>
        </div>
        <p className="hidden md:block max-w-xs font-mono text-xs text-muted-foreground text-right leading-relaxed">
          Three stages. The bid amount exists in the clear in exactly two places: your browser, and the
          enclave.
        </p>
      </div>

      {/* Workflow cards */}
      <div ref={cardsRef} className="grid gap-6 md:grid-cols-3">
        {workflows.map((wf) => (
          <div
            key={wf.step}
            className="group relative border border-border/40 p-6 md:p-8 flex flex-col gap-6 hover:border-accent/60 transition-all duration-500"
          >
            {/* Step number + name */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Step {wf.step}
              </span>
              <h3 className="mt-2 font-sans font-black text-3xl md:text-4xl tracking-tight group-hover:text-accent transition-colors duration-300">
                {wf.name}
              </h3>
              <code className="mt-1 block font-mono text-[11px] text-accent/80">
                {wf.route}
              </code>
            </div>

            {/* Offchain */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                In the TEE
              </span>
              <p className="mt-2 font-mono text-xs text-muted-foreground leading-relaxed">
                {wf.offchain}
              </p>
            </div>

            {/* Onchain */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                Onchain
              </span>
              <p className="mt-2 font-mono text-xs text-foreground/80 leading-relaxed">
                {wf.onchain}
              </p>
            </div>

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute top-0 right-0 w-full h-[1px] bg-accent" />
              <div className="absolute top-0 right-0 w-[1px] h-full bg-accent" />
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-12 border border-border/30 p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-accent shrink-0">
          Key point
        </span>
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          The chain sees three things: ciphertext, an escrow that is identical for every bidder, and one signed
          outcome. It never sees the winner&apos;s own bid, or any bid below second place. The clearing price is by
          definition the runner-up&apos;s bid — it is the price paid, so the mechanism has to reveal it. Umbra reveals
          nothing beyond it.
        </p>
      </div>
    </section>
  )
}
