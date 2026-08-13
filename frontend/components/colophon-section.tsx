"use client"

import { useRef, useEffect } from "react"
import { AUCTION_ADDRESS, FXRP_ADDRESS, explorerAddress } from "@/lib/contracts"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

/// One deployed contract, rendered as a Blockscout link when the active network
/// has an explorer (Coston2 does; a local anvil fork does not).
function ContractLink({ label, address }: { label: string; address: string }) {
  const href = explorerAddress(address)

  if (!href) {
    return <span className="font-mono text-xs text-foreground/80">{label}</span>
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={address}
      className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
    >
      {label}
      <span className="block text-[10px] text-muted-foreground">{shortAddress(address)}</span>
    </a>
  )
}

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      // Header slide in
      if (headerRef.current) {
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
      }

      // Grid columns fade up with stagger
      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div")
        gsap.from(columns, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      // Footer fade in
      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12 border-t border-border/30"
    >
      {/* Section header */}
      <div ref={headerRef} className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">05 / Colophon</span>
        <h2 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">CREDITS</h2>
      </div>

      {/* Multi-column layout */}
      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12">
        {/* Project */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Project</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Umbra</li>
            <li className="font-mono text-xs text-foreground/80">Sealed-Bid Vickrey</li>
          </ul>
        </div>

        {/* Stack */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Stack</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Next.js</li>
            <li className="font-mono text-xs text-foreground/80">Tailwind CSS</li>
            <li className="font-mono text-xs text-foreground/80">Solidity / Foundry</li>
            <li className="font-mono text-xs text-foreground/80">Flare Confidential Compute</li>
          </ul>
        </div>

        {/* Cryptography */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Cryptography
          </h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">ECIES</li>
            <li className="font-mono text-xs text-foreground/80">secp256k1</li>
            <li className="font-mono text-xs text-foreground/80">129-byte ciphertext</li>
          </ul>
        </div>

        {/* Network */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Network</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Flare Testnet Coston2</li>
            <li className="font-mono text-xs text-foreground/80">Chain ID 114</li>
            <li className="font-mono text-xs text-foreground/80">FXRP settlement</li>
          </ul>
        </div>

        {/* Contracts */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Contracts</h4>
          <ul className="space-y-2">
            <li>
              <ContractLink label="UmbraAuction" address={AUCTION_ADDRESS} />
            </li>
            <li>
              <ContractLink label="MockFXRP" address={FXRP_ADDRESS} />
            </li>
          </ul>
        </div>

        {/* Verified */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Verified</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">8/8 contract tests passing</li>
            <li className="font-mono text-xs text-foreground/80">3 end-to-end settlements</li>
            <li className="font-mono text-xs text-foreground/80">Source verified on Blockscout</li>
          </ul>
        </div>
      </div>

      {/* Bottom copyright */}
      <div
        ref={footerRef}
        className="mt-24 pt-8 border-t border-border/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          Umbra — sealed-bid Vickrey auctions on Flare.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          Bid amounts stay in the enclave. Only the winner and the clearing price come out.
        </p>
      </div>
    </section>
  )
}
