"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../auth/AuthProvider";
import type { SessionStatus } from "@/lib/api-types";

export const SESSION_TONE: Record<SessionStatus, string> = {
  scheduled: "border-ink/40 text-ink-soft",
  running: "border-rani bg-rani text-paper",
  ended: "border-ink bg-paper-2",
  published: "border-peacock bg-peacock text-paper",
};

/** Fetches an API path and exposes { data, error, loading, reload }. */
export function useApi<T>(path: string | null) {
  const { api, status } = useAuth();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null }>({
    key: "",
    data: null,
    error: null,
  });
  const key = `${path}#${version}`;

  useEffect(() => {
    if (!path || status !== "signed-in") return;
    let alive = true;
    api<T>(path)
      .then((data) => alive && setState({ key, data, error: null }))
      .catch((e) => alive && setState((s) => ({ key, data: s.data, error: e instanceof Error ? e.message : "Couldn't load." })));
    return () => {
      alive = false;
    };
  }, [key, path, status, api]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // Keep showing the previous data while a reload is in flight.
  return { data: state.data, error: state.error, loading: state.key !== key, reload };
}

export function PageTitle({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <div>
        {kicker && <p className="label text-ink-soft">{kicker}</p>}
        <h1 className="display mt-1 text-5xl sm:text-6xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Btn({
  children,
  tone = "paper",
  busy,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "paper" | "ink" | "blue" | "sindoor" | "peacock"; busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 border-2 border-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "paper" && "bg-paper hover:bg-paper-2",
        tone === "ink" && "bg-ink text-paper hover:bg-ink/85",
        tone === "blue" && "bg-blue text-paper hover:bg-blue-deep",
        tone === "sindoor" && "bg-sindoor text-paper hover:bg-sindoor/90",
        tone === "peacock" && "bg-peacock text-paper hover:bg-peacock/90",
        className
      )}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-3 py-8 text-ink-soft">
      <Loader2 className="animate-spin" size={18} /> {label}
    </p>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="border-2 border-sindoor bg-sindoor/10 p-3 text-sm font-semibold text-sindoor">{children}</p>;
}

export const inputCls =
  "w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("border-2 border-ink bg-paper p-5", className)}>
      <p className="label text-ink-soft">{label}</p>
      <p className="display mt-2 text-6xl">{value}</p>
      {sub && <div className="mt-2 text-sm text-ink-soft">{sub}</div>}
    </div>
  );
}

/** Downloads an authenticated API response (e.g. CSV) as a file. */
export function useDownload() {
  const { api } = useAuth();
  return useCallback(
    async (path: string, filename: string) => {
      const blob = await api<Blob>(path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [api]
  );
}
