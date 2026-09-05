import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/60 via-[#F8F6F2] to-purple-50/60 px-4 py-8">
      <div className="w-full max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2.5 mb-6 group transition-transform hover:scale-105">
          <Image
            src="/logo.png"
            alt="TraceIQ Logo"
            width={38}
            height={38}
            className="w-9 h-9 object-contain drop-shadow-sm"
            priority
          />
          <span className="font-serif font-bold text-2xl tracking-tight text-foreground">
            Trace<span className="text-accent">IQ</span>
          </span>
        </Link>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "shadow-xl border border-slate-200/60 rounded-2xl"
            }
          }}
        />
      </div>
    </main>
  );
}
