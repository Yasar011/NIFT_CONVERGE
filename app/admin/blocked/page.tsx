"use client";

import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";

interface Block {
  email: string;
  reason: string;
  by: string;
  at: number;
}

export default function BlockedPage() {
  const { api } = useAuth();
  const { data, error, loading, reload } = useApi<{ blocked: Block[] }>("/api/admin/blocked");
  const [form, setForm] = useState({ email: "", reason: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Block ${form.email}? They won't be able to register or vote.`)) return;
    setBusy("block");
    setMsg(null);
    try {
      await api("/api/admin/blocked", { body: form });
      setForm({ email: "", reason: "" });
      setMsg({ ok: true, text: "Blocked. It takes effect within about 30 seconds." });
      reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't block." });
    } finally {
      setBusy(null);
    }
  }

  async function unblock(email: string) {
    setBusy(email);
    try {
      await api(`/api/admin/blocked?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle kicker="Main admin" title="Blocked accounts" />
      <form onSubmit={block} className="border-2 border-ink bg-paper p-5">
        <p className="label">Block a student</p>
        <p className="mt-1 text-sm text-ink-soft">
          A blocked account can&apos;t register, vote or open My Converge. Their existing entries stay until you remove them. Admins can&apos;t be blocked.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label>
            <span className="label mb-1.5 block text-ink-soft">NIFT email</span>
            <input required type="email" className={inputCls} placeholder="name@nift.ac.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Reason (shown to them)</span>
            <input className={inputCls} placeholder="e.g. Misconduct during trials" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <Btn tone="sindoor" type="submit" busy={busy === "block"}>Block</Btn>
        </div>
        {msg && <p className={clsx("mt-2 text-sm font-semibold", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <ul className="border-t-2 border-ink">
          {(data?.blocked ?? []).map((b) => (
            <li key={b.email} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 py-3">
              <span>
                <span className="block font-bold">{b.email}</span>
                <span className="text-xs text-ink-soft">
                  {b.reason || "No reason given"} · by {b.by} · {new Date(b.at).toLocaleDateString("en-IN")}
                </span>
              </span>
              <Btn busy={busy === b.email} onClick={() => unblock(b.email)}>Unblock</Btn>
            </li>
          ))}
          {!data?.blocked.length && <li className="py-8 text-center text-ink-soft">No one is blocked.</li>}
        </ul>
      )}
    </div>
  );
}
