"use client";

import clsx from "clsx";
import { useAuth } from "./AuthProvider";

export function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignInButton({ className }: { className?: string }) {
  const { signIn } = useAuth();
  return (
    <button
      onClick={signIn}
      className={clsx(
        "btn-print inline-flex cursor-pointer items-center justify-center gap-3 border-2 border-ink bg-paper px-6 py-4 text-sm font-bold uppercase tracking-wide",
        className
      )}
    >
      <GoogleMark /> Sign in with NIFT account
    </button>
  );
}

export default function SignInPanel({ title, text }: { title: string; text: string }) {
  const { error } = useAuth();
  return (
    <div className="border-2 border-ink bg-paper p-6 sm:p-10">
      <p className="display text-4xl sm:text-5xl">{title}</p>
      <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{text}</p>
      <SignInButton className="mt-6" />
      <p className="mt-3 text-xs text-ink-soft">Only @nift.ac.in Google accounts can sign in.</p>
      {error && <p className="mt-3 text-sm font-semibold text-sindoor">{error}</p>}
    </div>
  );
}
