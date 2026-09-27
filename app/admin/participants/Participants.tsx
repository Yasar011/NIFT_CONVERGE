"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Download, Film, Loader2, Phone, Search, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi, useDownload } from "@/components/admin/kit";
import StatusBadge from "@/components/StatusBadge";
import { uploadMedia } from "@/lib/client/upload";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey, capacityOf } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import { SETTABLE_STATUSES, SLOT_LABEL, STATUS_LABEL, cldTransform, type EntryStatus } from "@/lib/registration-schema";
import type { EntryView } from "@/lib/api-types";

export default function Participants() {
  const { me } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const isMain = me?.user.role === "main_admin";

  const event = params.get("event") || "";
  const category = (isMain ? params.get("category") || event.split(":")[0] : me?.user.club) || "";
  const [statusFilter, setStatusFilter] = useState<EntryStatus | "all">("all");
  const [q, setQ] = useState("");

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
        <Btn onClick={() => download(`/api/admin/export${isMain && category ? `?category=${category}` : ""}`, `converge26-${category || "all"}.csv`)}>
          <Download size={14} /> Export CSV
        </Btn>
      </PageTitle>

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

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <p className="label text-ink-soft">{rows.length} entries</p>
          <ul className="border-t-2 border-ink">
            {rows.map((e) => (
              <Row key={e.id} entry={e} onChanged={reload} showEvent={!event} />
            ))}
          </ul>
          {!rows.length && <p className="py-10 text-center text-ink-soft">No participants match.</p>}
        </>
      )}
    </div>
  );
}

function Row({ entry, onChanged, showEvent }: { entry: EntryView; onChanged: () => void; showEvent: boolean }) {
  const { api } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ev = getEventByKey(entry.eventKey);
  const s = entry.student;

  async function patch(body: Record<string, unknown>, what: string) {
    setBusy(what);
    setErr(null);
    try {
      await api(`/api/admin/entries/${entry.id}`, { method: "PATCH", body });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
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
  return (
    <li className="grid gap-4 border-b border-ink/15 py-4 md:grid-cols-[4rem_1fr_12rem_auto] md:items-center">
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
          {err && <p className="mt-1 text-sm font-semibold text-sindoor">{err}</p>}
        </div>
      </div>

      <div>
        {entry.status === "locked" ? (
          <StatusBadge status="locked" />
        ) : (
          <select
            aria-label={`Status for ${s.name}`}
            className={clsx(inputCls, entry.status === "selected" && "border-peacock bg-peacock/10 font-bold")}
            value={entry.status}
            disabled={!!busy}
            onChange={(e) => patch({ status: e.target.value }, "status")}
          >
            {SETTABLE_STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_LABEL[st]}</option>
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
            {progress !== null ? `${progress}%` : "Add video"}
          </Btn>
        )}
        <input ref={file} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { uploadVideo(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </li>
  );
}
