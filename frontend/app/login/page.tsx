"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { USE_MOCK } from "@/lib/api/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (USE_MOCK) {
      // In mock mode, any credentials work — just navigate to dashboard
      router.push("/dashboard");
      return;
    }
    // Real auth: POST /api/v1/auth/login
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      },
    );
    if (res.ok) router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">TraceIQ</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800"
          >
            {USE_MOCK ? "Sign in (mock)" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
