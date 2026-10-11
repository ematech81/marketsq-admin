"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorText, Field, PrimaryButton } from "@/components/form";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signIn(String(form.get("email")), String(form.get("password")));
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold">Square Market</h1>
      <p className="mb-8 text-muted">Sign in to manage your store</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorText message={error} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <PrimaryButton type="submit" busy={busy} className="w-full">
          Sign in
        </PrimaryButton>
      </form>
    </main>
  );
}
