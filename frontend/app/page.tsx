import { SideNav } from "@/components/SideNav";
import { SmoothScroll } from "@/components/smooth-scroll";
import { HeroSection } from "@/components/hero-section";
import { SignalsSection } from "@/components/signals-section";
import { WorkSection } from "@/components/work-section";
import { TeeSection } from "@/components/tee-section";
import { PrinciplesSection } from "@/components/principles-section";
import { ColophonSection } from "@/components/colophon-section";

export default function Page() {
  return (
    <SmoothScroll>
      <main className="relative min-h-screen">
        <SideNav />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />

        <div className="relative z-10 md:pl-[84px]">
          <HeroSection />
          <SignalsSection />
          <WorkSection />
          <TeeSection />
          <PrinciplesSection />
          <ColophonSection />
        </div>
      </main>
    </SmoothScroll>
  );
}
