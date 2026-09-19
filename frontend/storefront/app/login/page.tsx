"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/orders";
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    router.replace(next);
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong — try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-8 sm:px-8">
      <h1 className="text-[24px] font-bold tracking-tight text-zinc-950">
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-1 text-[13.5px] text-zinc-600">
        {mode === "login"
          ? "Sign in to check out faster and track your orders."
          : "One account for checkout, orders and tracking."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-semibold">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-sm border border-zinc-300 px-3 text-[14px] focus:border-zinc-950 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-semibold">
            Password{mode === "register" ? " (8+ characters)" : ""}
          </label>
          <input
            id="login-password"
            type="password"
            required
            minLength={mode === "register" ? 8 : 1}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-sm border border-zinc-300 px-3 text-[14px] focus:border-zinc-950 focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-sm border border-[#b3261e] bg-red-50 px-3 py-2.5 text-[13.5px] text-[#8f1d17]">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-[13.5px] text-zinc-600">
        {mode === "login" ? (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode("register")} className="font-semibold text-zinc-950 hover:underline">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already registered?{" "}
            <button type="button" onClick={() => setMode("login")} className="font-semibold text-zinc-950 hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="mb-4 text-[12.5px] text-zinc-500">
            <Link href="/" className="hover:text-zinc-950 hover:underline">Home</Link>
            {" / "}
            <span className="font-semibold text-zinc-900">Account</span>
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
