import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { AgentShowcaseSection } from "@/components/landing/AgentShowcaseSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { TaglineRevealSection } from "@/components/landing/TaglineRevealSection";
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

        {/* Section 3: Asymmetric Capabilities Showcase */}
        <CapabilitiesSection />

        {/* Section 4: Interactive LangGraph AI Coding Agent Visual */}
        <AgentShowcaseSection />

        {/* Section 5: Custom Animated 4-Layer Architecture Canvas */}
        <ArchitectureSection />

        {/* Section 6: Scroll-Activated Tagline Reveal */}
        <TaglineRevealSection />

        {/* Section 7: Step-Synchronized Workflow Rail */}
        <WorkflowSection />

        {/* Section 8: Engineering Tech Credibility Strip */}
        <TechCredibilityStrip />

        {/* Section 9: Blast Radius Reprise Final CTA */}
        <FinalCTASection />
      </main>

      {/* Section 10: Product Footer */}
      <LandingFooter />
    </div>
  );
}
