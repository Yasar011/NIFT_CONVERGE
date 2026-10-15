"use client";

import { useState } from "react";
import { CalendarDays, MapPin, MessageCircle, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import type { Trial } from "@/lib/api-types";
import { firstTrials, openWhatsApp, trialMessage, trialsMessage } from "@/lib/trial-share";

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
  const [added, setAdded] = useState<Trial | null>(null);
  const [club, setClub] = useState<EventCategory | "">("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setMsg(null);
    setAdded(null);
    try {
      const { id } = await api<{ id: string }>("/api/admin/trials", { body: form });
      const ev = getEventByKey(form.eventKey);
      if (ev) setAdded({ ...form, id, category: ev.category, title: form.title.trim() || "Trial", venue: form.venue.trim(), notes: form.notes.trim(), createdBy: "", at: Date.now() } as Trial);
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

  const all = data?.trials ?? [];
  const first = firstTrials(all);
  const shown = all.filter((t) => !club || t.category === club);
  const upcoming = shown.filter((t) => t.date >= today());
  const past = shown.filter((t) => t.date < today()).reverse();
  const user = me?.user;
  const portal = typeof window === "undefined" ? "" : window.location.origin;
  const shareOne = (t: Trial) => user && openWhatsApp(trialMessage(t, user, portal, first[t.eventKey] === t.id));
  const shareAll = () => user && openWhatsApp(trialsMessage(upcoming, user, portal, first, isMain ? club : user.club ?? ""));

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
          {added && <WhatsAppBtn onClick={() => shareOne(added)}>Send this trial on WhatsApp</WhatsAppBtn>}
        </div>
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 border-2 border-ink bg-paper-2 p-4">
            <div className="mr-auto">
              <p className="label">Share on WhatsApp</p>
              <p className="mt-1 text-sm text-ink-soft">
                Opens WhatsApp with the message ready — pick your group or chat and send. Every message links to the portal and says it&apos;s from you.
              </p>
            </div>
            {isMain && (
              <label>
                <span className="label mb-1.5 block text-ink-soft">Club</span>
                <select className={inputCls} value={club} onChange={(e) => setClub(e.target.value as EventCategory | "")}>
                  <option value="">All clubs</option>
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                  ))}
                </select>
              </label>
            )}
            <WhatsAppBtn onClick={shareAll} disabled={!upcoming.length}>
              Send all {upcoming.length} upcoming{isMain && !club ? " (all clubs)" : ""}
            </WhatsAppBtn>
          </div>
          <TrialList title="Upcoming" trials={upcoming} busy={busy} onRemove={remove} onShare={shareOne} />
          {past.length > 0 && <TrialList title="Past" trials={past} busy={busy} onRemove={remove} muted />}
        </>
      )}
    </div>
  );
}

function WhatsAppBtn({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 border-2 border-[#128C7E] bg-[#25D366] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#0b2e1f] transition-colors hover:bg-[#1ebe5b] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <MessageCircle size={14} /> {children}
    </button>
  );
}

function TrialList({ title, trials, busy, onRemove, onShare, muted }: { title: string; trials: Trial[]; busy: string | null; onRemove: (t: Trial) => void; onShare?: (t: Trial) => void; muted?: boolean }) {
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
              <span className="flex flex-wrap gap-2">
                {onShare && <WhatsAppBtn onClick={() => onShare(t)} aria-label={`Send ${t.title} on WhatsApp`}>WhatsApp</WhatsAppBtn>}
                <Btn onClick={() => onRemove(t)} busy={busy === t.id} aria-label={`Cancel ${t.title}`}>
                  <Trash2 size={14} /> Cancel
                </Btn>
              </span>
            </li>
          );
        })}
        {!trials.length && <li className="py-6 text-ink-soft">None.</li>}
      </ul>
    </section>
  );
}
