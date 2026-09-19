"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const { user, login } = useAuth();
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
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong — try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-8 sm:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        Volt Electricals · Ops
      </p>
      <h1 className="mt-1 text-[24px] font-bold tracking-tight text-zinc-950">
        Admin sign in
      </h1>
      <p className="mt-1 text-[13.5px] text-zinc-600">
        Operations access requires an admin account.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-[13px] font-semibold">
            Email address
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-sm border border-zinc-300 px-3 text-[14px] focus:border-zinc-950 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1.5 block text-[13px] font-semibold">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            required
            autoComplete="current-password"
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
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-sm bg-zinc-950 text-[14px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? "Please wait…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
