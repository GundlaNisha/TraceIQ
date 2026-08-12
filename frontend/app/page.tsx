import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Code2, GitMerge, GitPullRequest, Search } from "lucide-react";

export default async function RootPage() {
  const { userId } = await auth();
  
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl px-6 py-24 mx-auto text-center relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          TraceIQ is now in public beta
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold font-serif text-foreground tracking-tight leading-[1.1] mb-6">
          The AI Code Reviewer <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60">
            For Modern Engineering Teams
          </span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted mb-12">
          TraceIQ sits seamlessly inside your workflow. Catch bugs before you commit, 
          understand the blast radius of your changes, and generate pristine PR drafts instantly.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="h-12 px-8 text-base shadow-sm">
              Start Building for Free
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              Sign In to your Account
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          
          <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white/50 border border-border/50 shadow-sm backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold font-serif text-foreground">Impact Analysis</h3>
            <p className="text-sm text-muted">
              Map the blast radius of any requirement. See exactly which files and symbols will be impacted before you write a single line of code.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white/50 border border-border/50 shadow-sm backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold font-serif text-foreground">Pre-Commit Reviews</h3>
            <p className="text-sm text-muted">
              Run an AI pass over your local commits. TraceIQ identifies missed edge cases and missing tests instantly.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white/50 border border-border/50 shadow-sm backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold font-serif text-foreground">Automated PR Drafts</h3>
            <p className="text-sm text-muted">
              Stop writing boilerplate PR descriptions. TraceIQ reads your code diffs and requirements to draft the perfect PR context.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
