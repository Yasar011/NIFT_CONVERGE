"use client";

import { useState } from "react";
import { CalendarDays, MapPin, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import type { Trial } from "@/lib/api-types";

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) =>
  new Date(`${d}T00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export default function TrialsPage() {
  const { me, api } = useAuth();
  const { data, error, loading, reload } = useApi<{ trials: Trial[] }>("/api/admin/trials");
  const isMain = me?.user.role === "main_admin";
  const events = PICKABLE_EVENTS.filter((e) => isMain || e.category === me?.user.club);
  const [form, setForm] = useState({ eventKey: "", title: "", date: today(), time: "16:00", venue: "", notes: "", notifyEveryone: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setMsg(null);
    try {
      await api("/api/admin/trials", { body: form });
      setForm((f) => ({ ...f, title: "", notes: "" }));
      setMsg({ ok: true, text: form.notifyEveryone ? "Trial added — notification sent to everyone with notifications on." : "Trial added — the event\u2019s team got a phone notification and sees it on My Converge." });
      reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't add." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: Trial) {
    if (!confirm(`Cancel "${t.title}" on ${fmtDate(t.date)}?`)) return;
    setBusy(t.id);
    try {
      await api(`/api/admin/trials?event=${encodeURIComponent(t.eventKey)}&id=${t.id}`, { method: "DELETE" });
      reload();
    } finally {
      setBusy(null);
    }
  }

  const upcoming = (data?.trials ?? []).filter((t) => t.date >= today());
  const past = (data?.trials ?? []).filter((t) => t.date < today()).reverse();

  return (
    <div className="space-y-8">
      <PageTitle kicker="Schedule" title="Trials & auditions" />

      <form onSubmit={add} className="border-2 border-ink bg-paper p-5">
        <p className="label">Schedule a trial</p>
        <p className="mt-1 text-sm text-ink-soft">
          Students can register for an event only until its <strong>first trial starts</strong>. After that the event is closed
          for self-registration — you can still add late students from Participants → Add member.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="md:col-span-1">
            <span className="label mb-1.5 block text-ink-soft">Event</span>
            <select required className={inputCls} value={form.eventKey} onChange={(e) => setForm({ ...form, eventKey: e.target.value })}>
              <option value="">Choose</option>
              {events.map((ev) => (
                <option key={eventKey(ev)} value={eventKey(ev)}>{eventLabel(ev)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Title</span>
            <input className={inputCls} placeholder="e.g. Round 1 audition" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Venue</span>
            <input required className={inputCls} placeholder="e.g. Auditorium" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Date</span>
            <input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Time</span>
            <input required type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Notes (optional)</span>
            <input className={inputCls} placeholder="e.g. Bring your own music" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#15120e]" checked={form.notifyEveryone} onChange={(e) => setForm({ ...form, notifyEveryone: e.target.checked })} />
          Notify <strong>everyone</strong> (not just this event&apos;s team) — e.g. for open auditions
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Btn tone="ink" type="submit" busy={busy === "add"}>Add trial & notify</Btn>
          {msg && <p className={clsx("text-sm font-semibold", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
        </div>
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <TrialList title="Upcoming" trials={upcoming} busy={busy} onRemove={remove} />
          {past.length > 0 && <TrialList title="Past" trials={past} busy={busy} onRemove={remove} muted />}
        </>
      )}
    </div>
  );
}

function TrialList({ title, trials, busy, onRemove, muted }: { title: string; trials: Trial[]; busy: string | null; onRemove: (t: Trial) => void; muted?: boolean }) {
  return (
    <section className={clsx(muted && "opacity-70")}>
      <h2 className="display-md border-b-2 border-ink pb-2 text-3xl">{title}</h2>
      <ul>
        {trials.map((t) => {
          const ev = getEventByKey(t.eventKey);
          return (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 py-3">
              <span className="min-w-0">
                <span className="label flex items-center gap-2 text-ink-soft">
                  <span className={clsx("h-2 w-2", CATEGORY_META[t.category].bg)} aria-hidden />
                  {ev ? eventLabel(ev) : t.eventKey}
                </span>
                <span className="mt-0.5 block text-lg font-bold">{t.title}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {fmtDate(t.date)} · {t.time}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={14} /> {t.venue}</span>
                </span>
                {t.notes && <span className="mt-0.5 block text-sm">{t.notes}</span>}
              </span>
              <Btn onClick={() => onRemove(t)} busy={busy === t.id} aria-label={`Cancel ${t.title}`}>
                <Trash2 size={14} /> Cancel
              </Btn>
            </li>
          );
        })}
        {!trials.length && <li className="py-6 text-ink-soft">None.</li>}
      </ul>
    </section>
  );
}
