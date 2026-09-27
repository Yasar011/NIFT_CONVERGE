"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, SESSION_TONE, inputCls, useApi } from "@/components/admin/kit";
import { PICKABLE_EVENTS, eventKey, eventLabel } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import type { VotingSession } from "@/lib/api-types";

export default function VotingList() {
  const { me, api } = useAuth();
  const { data, error, loading, reload } = useApi<{ sessions: VotingSession[] }>("/api/admin/voting");
  const isMain = me?.user.role === "main_admin";
  const events = PICKABLE_EVENTS.filter((e) => isMain || e.category === me?.user.club);

  const [form, setForm] = useState({ eventKey: "", date: new Date().toISOString().slice(0, 10), title: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/admin/voting", { body: form });
      setForm((f) => ({ ...f, title: "" }));
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle kicker="Public voting" title="Voting rounds" />

      <form onSubmit={create} className="border-2 border-ink bg-paper p-5">
        <p className="label">New voting round</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_11rem_1fr_auto] md:items-end">
          <label>
            <span className="label mb-1.5 block text-ink-soft">Event</span>
            <select required className={inputCls} value={form.eventKey} onChange={(e) => setForm({ ...form, eventKey: e.target.value })}>
              <option value="">Choose</option>
              {events.map((ev) => (
                <option key={eventKey(ev)} value={eventKey(ev)}>{eventLabel(ev)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Date</span>
            <input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Title (optional)</span>
            <input className={inputCls} placeholder="e.g. Solo Dance — auditions" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <Btn tone="ink" type="submit" busy={saving}>Create</Btn>
        </div>
        {formError && <p className="mt-2 text-sm font-semibold text-sindoor">{formError}</p>}
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <ul className="border-t-2 border-ink">
          {(data?.sessions ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/admin/voting/${s.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-ink/15 py-4 hover:bg-paper-2 sm:px-2">
                <span>
                  <span className="label flex items-center gap-2 text-ink-soft">
                    <span className={clsx("h-2 w-2", CATEGORY_META[s.category].bg)} aria-hidden />
                    {s.eventName} · {s.date}
                  </span>
                  <span className="display-md mt-1 block text-2xl">{s.title}</span>
                  {s.live && <span className="mt-1 block text-sm font-semibold text-rani">Live now: {s.live.name}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className={clsx("label border-2 px-2 py-0.5 text-[0.65rem]", SESSION_TONE[s.status])}>{s.status}</span>
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            </li>
          ))}
          {!data?.sessions.length && <li className="py-10 text-center text-ink-soft">No voting rounds yet.</li>}
        </ul>
      )}
    </div>
  );
}
