"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInPanel from "@/components/auth/SignInPanel";

export default function LoginPanel() {
  const { status, me } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  useEffect(() => {
    if (status !== "signed-in" || !me) return;
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.replace(safe ?? (me.user.role === "student" ? "/me" : "/admin"));
  }, [status, me, next, router]);

  if (status === "signed-in") {
    return <p className="display-md text-3xl">Signing you in…</p>;
  }
  return (
    <div className="max-w-2xl">
      <SignInPanel
        title="Welcome to Converge ’26"
        text="One sign-in for everything: registration, your selection status, your QR pass for events, and live voting."
      />
    </div>
  );
}
