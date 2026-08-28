import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { TechCredibilityStrip } from "@/components/landing/TechCredibilityStrip";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function RootPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#111111] flex flex-col relative selection:bg-[#1B2A4A] selection:text-[#F8F6F2]">
      {/* Texture & Ambient Noise Overlay */}
      <div className="fixed inset-0 noise-overlay pointer-events-none z-40 opacity-40" />

      {/* Sticky Navigation Bar */}
      <LandingNav />

      {/* Main Content Sections */}
      <main className="flex-1 flex flex-col">
        {/* Section 1: Hero with live AST graph visual */}
        <HeroSection />

        {/* Section 2: Editorial Problem Framing Strip */}
        <ProblemSection />

        {/* Section 3: Asymmetric 6-Pillar Capabilities Showcase */}
        <CapabilitiesSection />

        {/* Section 4: Custom Animated 4-Layer Architecture Canvas */}
        <ArchitectureSection />

        {/* Section 5: Step-Synchronized 6-Stage Workflow Rail */}
        <WorkflowSection />

        {/* Section 6: Engineering Tech Credibility Strip */}
        <TechCredibilityStrip />

        {/* Section 7: Blast Radius Reprise Final CTA */}
        <FinalCTASection />
      </main>

      {/* Section 8: Product Footer */}
      <LandingFooter />
    </div>
  );
}
