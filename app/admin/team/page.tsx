"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";

interface Member {
  email: string;
  role: "club_admin" | "main_admin";
  club: EventCategory | null;
  addedBy: string;
}

export default function TeamPage() {
  const { api, me } = useAuth();
  const { data, error, loading, reload } = useApi<{ team: Member[]; owners: string[] }>("/api/admin/team");
  const [form, setForm] = useState({ email: "", role: "club_admin", club: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setMsg(null);
    try {
      await api("/api/admin/team", { body: form });
      setForm({ email: "", role: "club_admin", club: "" });
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't add.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    setBusy(email);
    try {
      await api(`/api/admin/team?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't remove.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle kicker="Main admin" title="Admins" />

      <form onSubmit={add} className="border-2 border-ink bg-paper p-5">
        <p className="label">Add an admin</p>
        <p className="mt-1 text-sm text-ink-soft">They get access the next time they sign in with this NIFT email.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_11rem_14rem_auto] md:items-end">
          <label>
            <span className="label mb-1.5 block text-ink-soft">NIFT email</span>
            <input required type="email" className={inputCls} placeholder="name@nift.ac.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Role</span>
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="club_admin">Club admin</option>
              <option value="main_admin">Main admin</option>
            </select>
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Club</span>
            <select className={inputCls} value={form.club} disabled={form.role !== "club_admin"} required={form.role === "club_admin"} onChange={(e) => setForm({ ...form, club: e.target.value })}>
              <option value="">Choose</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c].label}</option>
              ))}
            </select>
          </label>
          <Btn tone="ink" type="submit" busy={busy === "add"}>Add</Btn>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold text-sindoor">{msg}</p>}
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <ul className="border-t-2 border-ink">
          {data?.owners.map((email) => (
            <li key={email} className="flex items-center justify-between border-b border-ink/15 py-3">
              <span>
                <span className="block font-bold">{email}</span>
                <span className="label text-sindoor">Main admin · owner (set in server config)</span>
              </span>
            </li>
          ))}
          {data?.team.map((m) => (
            <li key={m.email} className="flex items-center justify-between gap-3 border-b border-ink/15 py-3">
              <span>
                <span className="block font-bold">{m.email}</span>
                <span className="label text-ink-soft">
                  {m.role === "main_admin" ? "Main admin" : `Club admin · ${CATEGORY_META[m.club!]?.label}`} · added by {m.addedBy}
                </span>
              </span>
              {m.email !== me?.user.email && (
                <Btn onClick={() => remove(m.email)} busy={busy === m.email} aria-label={`Remove ${m.email}`}>
                  <Trash2 size={14} /> Remove
                </Btn>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
