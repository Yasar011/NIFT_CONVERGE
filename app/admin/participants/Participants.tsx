"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Download, Film, Loader2, Lock, Phone, Plus, Printer, Search, StickyNote, Trash2, UserPlus, X } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi, useDownload } from "@/components/admin/kit";
import { FinalPasswordProvider, useFinalPassword } from "@/components/admin/FinalPassword";
import StatusBadge from "@/components/StatusBadge";
import { uploadMedia } from "@/lib/client/upload";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey, capacityOf, genderRequirement } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import { MAX_EVENTS, SETTABLE_STATUSES, SLOT_LABEL, STATUS_LABEL, cldTransform, type EntryStatus } from "@/lib/registration-schema";
import type { EntryView } from "@/lib/api-types";

export default function Participants() {
  return (
    <FinalPasswordProvider>
      <ParticipantsInner />
    </FinalPasswordProvider>
  );
}

function ParticipantsInner() {
  const { me } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const isMain = me?.user.role === "main_admin";

  const event = params.get("event") || "";
  const category = (isMain ? params.get("category") || event.split(":")[0] : me?.user.club) || "";
  const [statusFilter, setStatusFilter] = useState<EntryStatus | "all">("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const path = event
    ? `/api/admin/entries?event=${encodeURIComponent(event)}`
    : `/api/admin/entries${category ? `?category=${category}` : ""}`;
  const { data, error, loading, reload } = useApi<{ entries: EntryView[] }>(path);
  const download = useDownload();

  const setParam = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    router.replace(`/admin/participants?${sp.toString()}`);
  };

  const events = PICKABLE_EVENTS.filter((e) => !category || e.category === category);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.entries ?? [])
      .filter((e) => statusFilter === "all" || e.status === statusFilter)
      .filter((e) => !needle || e.student.name.toLowerCase().includes(needle) || e.student.studentId.toLowerCase().includes(needle))
      .sort((a, b) => a.eventKey.localeCompare(b.eventKey) || a.student.name.localeCompare(b.student.name));
  }, [data, statusFilter, q]);

  const selectedEvent = event ? getEventByKey(event) : null;
  const selectedCount = (data?.entries ?? []).filter((e) => e.status === "selected").length;

  return (
    <div className="space-y-6">
      <PageTitle kicker={category ? CATEGORY_META[category as EventCategory]?.label : "All clubs"} title="Participants">
        <Btn tone="ink" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
          <UserPlus size={14} /> Add member
        </Btn>
        <Btn onClick={() => download(`/api/admin/export${isMain && category ? `?category=${category}` : ""}`, `converge26-${category || "all"}.csv`)}>
          <Download size={14} /> Export CSV
        </Btn>
        <Link
          href={`/admin/print?type=attendance${event ? `&event=${encodeURIComponent(event)}` : ""}`}
          className="inline-flex items-center gap-2 border-2 border-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-paper-2"
        >
          <Printer size={14} /> Print sheet
        </Link>
      </PageTitle>

      {adding && (
        <AddMember
          defaultEvent={event}
          events={events.map((e) => eventKey(e))}
          onClose={() => setAdding(false)}
          onAdded={reload}
        />
      )}

      <div className="grid gap-3 md:grid-cols-4">
        {isMain && (
          <select aria-label="Club" className={inputCls} value={category} onChange={(e) => setParam({ category: e.target.value, event: "" })}>
            <option value="">All clubs</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c].label}</option>
            ))}
          </select>
        )}
        <select aria-label="Event" className={inputCls} value={event} onChange={(e) => setParam({ event: e.target.value })}>
          <option value="">All events</option>
          {events.map((e) => (
            <option key={eventKey(e)} value={eventKey(e)}>{eventLabel(e)}</option>
          ))}
        </select>
        <select aria-label="Status" className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EntryStatus | "all")}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <span className="sr-only">Search</span>
          <input className={clsx(inputCls, "pl-9")} placeholder="Name or student ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {selectedEvent && (
        <p className="border-2 border-ink bg-paper-2 px-4 py-3 text-sm">
          <strong>{eventLabel(selectedEvent)}</strong> — {selectedCount} of {capacityOf(selectedEvent)} seats filled
          ({selectedEvent.participantsLabel}
          {selectedEvent.substitutes ? ` + ${selectedEvent.substitutes} substitutes` : ""}).
        </p>
      )}
      {!isMain && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Lock size={14} /> Final selection (&ldquo;Selected&rdquo;) is made by the main admin. You can shortlist, mark not selected, take attendance and manage members.
        </p>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <p className="label text-ink-soft">{rows.length} entries</p>
          <ul className="border-t-2 border-ink">
            {rows.map((e) => (
              <Row key={e.id} entry={e} onChanged={reload} showEvent={!event} isMain={isMain} />
            ))}
          </ul>
          {!rows.length && <p className="py-10 text-center text-ink-soft">No participants match.</p>}
        </>
      )}
    </div>
  );
}

interface DirStudent {
  uid: string;
  name: string;
  studentId: string;
  department: string;
  semester: string;
  gender: string;
  photoUrl: string;
  events: string[];
}

function AddMember({ defaultEvent, events, onClose, onAdded }: { defaultEvent: string; events: string[]; onClose: () => void; onAdded: () => void }) {
  const { api } = useAuth();
  const { data, loading } = useApi<{ students: DirStudent[] }>("/api/admin/directory");
  const [event, setEvent] = useState(defaultEvent);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const ev = event ? getEventByKey(event) : null;
  const need = ev ? genderRequirement(ev) : null;
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return (data?.students ?? [])
      .filter((s) => s.name.toLowerCase().includes(n) || s.studentId.toLowerCase().includes(n))
      .slice(0, 12);
  }, [data, q]);

  async function add(s: DirStudent) {
    setBusy(s.uid);
    setMsg(null);
    try {
      await api("/api/admin/entries", { body: { uid: s.uid, eventKey: event } });
      setMsg({ ok: true, text: `Added ${s.name} to ${ev ? eventLabel(ev) : "the event"}.` });
      onAdded();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't add." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="border-2 border-ink bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">Add a member to an event</p>
          <p className="mt-1 text-sm text-ink-soft">Search students who have registered. A student can be in at most {MAX_EVENTS} events.</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="cursor-pointer p-1 hover:bg-paper-2"><X size={18} /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <select aria-label="Event to add to" className={inputCls} value={event} onChange={(e) => setEvent(e.target.value)}>
          <option value="">Choose the event</option>
          {events.map((k) => {
            const e = getEventByKey(k)!;
            return <option key={k} value={k}>{eventLabel(e)}</option>;
          })}
        </select>
        <label className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <span className="sr-only">Find student</span>
          <input className={clsx(inputCls, "pl-9")} placeholder="Student name or ID" value={q} onChange={(e) => setQ(e.target.value)} disabled={!event} />
        </label>
      </div>
      {msg && <p className={clsx("mt-3 text-sm font-semibold", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
      {loading && <Loading label="Loading students…" />}
      {event && q && !loading && (
        <ul className="mt-3 border-t border-ink/15">
          {matches.map((s) => {
            const already = s.events.includes(event);
            const full = s.events.length >= MAX_EVENTS;
            const wrongGender = !!need && s.gender !== need;
            const reason = already ? "Already in" : full ? `Has ${MAX_EVENTS} events` : wrongGender ? (need === "Male" ? "Boys only" : "Girls only") : null;
            return (
              <li key={s.uid} className="flex items-center justify-between gap-3 border-b border-ink/10 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cldTransform(s.photoUrl, "c_fill,g_face,w_80,h_80,q_auto,f_auto")} alt="" className="h-10 w-10 shrink-0 border border-ink object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{s.name}</span>
                    <span className="block text-xs text-ink-soft">{s.studentId} · {s.department} · Sem {s.semester} · {s.events.length} events</span>
                  </span>
                </span>
                {reason ? (
                  <span className="label text-ink-soft">{reason}</span>
                ) : (
                  <Btn tone="blue" busy={busy === s.uid} onClick={() => add(s)}><Plus size={14} /> Add</Btn>
                )}
              </li>
            );
          })}
          {!matches.length && <li className="py-4 text-sm text-ink-soft">No registered student matches. They need to register first.</li>}
        </ul>
      )}
    </section>
  );
}

function Row({ entry, onChanged, showEvent, isMain }: { entry: EntryView; onChanged: () => void; showEvent: boolean; isMain: boolean }) {
  const { api } = useAuth();
  const { ask, forget } = useFinalPassword();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(entry.note ?? "");
  const file = useRef<HTMLInputElement>(null);
  const ev = getEventByKey(entry.eventKey);
  const s = entry.student;

  async function patch(body: Record<string, unknown>, what: string) {
    setBusy(what);
    setErr(null);
    try {
      await api(`/api/admin/entries/${entry.id}`, { method: "PATCH", body });
      onChanged();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && e.details?.needFinalPassword) forget();
      setErr(e instanceof Error ? e.message : "Couldn't save.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(next: EntryStatus) {
    const isFinal = next === "selected" || entry.status === "selected";
    if (!isFinal) return patch({ status: next }, "status");
    const finalPassword = await ask();
    if (!finalPassword) return;
    return patch({ status: next, finalPassword }, "status");
  }

  async function remove() {
    if (!confirm(`Remove ${s.name} from ${ev ? eventLabel(ev) : "this event"}?`)) return;
    setBusy("remove");
    setErr(null);
    try {
      await api(`/api/admin/entries/${entry.id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't remove.");
      setBusy(null);
    }
  }

  async function uploadVideo(f?: File) {
    if (!f) return;
    setErr(null);
    setProgress(0);
    try {
      const video = await uploadMedia(api, f, "video", { entryId: entry.id, onProgress: setProgress });
      await patch({ video }, "video");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  const present = !!entry.attendance?.present;
  const lockedForClub = !isMain && entry.status === "selected";
  return (
    <li className="border-b border-ink/15 py-4">
      <div className="grid gap-4 md:grid-cols-[4rem_1fr_13rem_auto] md:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldTransform(s.photoUrl, "c_fill,g_face,w_128,h_128,q_auto,f_auto")} alt="" className="hidden h-16 w-16 border-2 border-ink object-cover md:block" />

        <div className="flex min-w-0 gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cldTransform(s.photoUrl, "c_fill,g_face,w_112,h_112,q_auto,f_auto")} alt="" className="h-14 w-14 shrink-0 border-2 border-ink object-cover md:hidden" />
          <div className="min-w-0">
            <p className="display-md truncate text-2xl">{s.name}</p>
            <p className="text-xs text-ink-soft">
              {s.studentId} · {s.department} · Sem {s.semester} · {s.gender}
            </p>
            {showEvent && (
              <p className="mt-1 text-sm font-semibold">
                {ev ? eventLabel(ev) : entry.eventKey} <span className="font-normal text-ink-soft">· {SLOT_LABEL[entry.slot]}</span>
              </p>
            )}
            <a href={`tel:${s.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs text-ink-soft hover:underline">
              <Phone size={11} /> {s.phone}
            </a>
            {entry.finalBy && entry.status === "selected" && (
              <p className="text-xs text-peacock">Final selection by {entry.finalBy}</p>
            )}
            {entry.note && !noteOpen && <p className="mt-1 text-sm italic text-ink-soft">“{entry.note}”</p>}
          </div>
        </div>

        <div>
          {entry.status === "locked" || lockedForClub ? (
            <StatusBadge status={entry.status} />
          ) : (
            <select
              aria-label={`Status for ${s.name}`}
              className={clsx(inputCls, entry.status === "selected" && "border-peacock bg-peacock/10 font-bold")}
              value={entry.status}
              disabled={!!busy}
              onChange={(e) => setStatus(e.target.value as EntryStatus)}
            >
              {SETTABLE_STATUSES.map((st) => (
                <option key={st} value={st} disabled={st === "selected" && !isMain}>
                  {st === "selected" ? (isMain ? "Selected (final) 🔒" : "Selected — main admin only") : STATUS_LABEL[st]}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Btn tone={present ? "peacock" : "paper"} busy={busy === "present"} onClick={() => patch({ present: !present }, "present")} aria-pressed={present}>
            {present ? <Check size={14} strokeWidth={3} /> : null} {present ? "Present" : "Mark present"}
          </Btn>
          {entry.video?.url ? (
            <span className="inline-flex items-center gap-1">
              <a href={entry.video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 border-2 border-ink px-3 py-2 text-xs font-bold uppercase hover:bg-paper-2">
                <Film size={14} /> Video
              </a>
              <button onClick={() => confirm("Remove this video?") && patch({ video: null }, "video")} aria-label="Remove video" className="cursor-pointer p-2 hover:bg-paper-2">
                <X size={14} />
              </button>
            </span>
          ) : (
            <Btn onClick={() => file.current?.click()} disabled={progress !== null} title="Performance video for voting">
              {progress !== null ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
              {progress !== null ? `${progress}%` : "Video"}
            </Btn>
          )}
          <button onClick={() => setNoteOpen((v) => !v)} aria-label="Note" title="Note" className="cursor-pointer border-2 border-ink p-2 hover:bg-paper-2">
            <StickyNote size={14} />
          </button>
          {entry.status !== "selected" && (
            <button onClick={remove} disabled={busy === "remove"} aria-label={`Remove ${s.name} from this event`} title="Remove from event" className="cursor-pointer border-2 border-ink p-2 hover:bg-sindoor hover:text-paper disabled:opacity-50">
              {busy === "remove" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
          <input ref={file} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { uploadVideo(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>

      {noteOpen && (
        <form
          className="mt-3 flex gap-2 md:ml-[5rem]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await patch({ note }, "note")) setNoteOpen(false);
          }}
        >
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private note for admins (e.g. trial time, feedback)" maxLength={500} />
          <Btn type="submit" tone="ink" busy={busy === "note"}>Save</Btn>
        </form>
      )}
      {err && <p className="mt-2 text-sm font-semibold text-sindoor md:ml-[5rem]">{err}</p>}
    </li>
  );
}
