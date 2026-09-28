"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, ThumbsDown, ThumbsUp, X } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, useApi } from "@/components/admin/kit";
import { FinalPasswordProvider, useFinalPassword } from "@/components/admin/FinalPassword";
import StatusBadge from "@/components/StatusBadge";
import { CATEGORY_META, type EventCategory } from "@/lib/types";
import { cldTransform, type EntryStatus } from "@/lib/registration-schema";
import type { Recommendation } from "@/lib/api-types";

interface Item {
  id: string;
  uid: string;
  eventKey: string;
  eventName: string;
  category: EventCategory;
  status: EntryStatus;
  student: { name: string; studentId: string; department: string; semester: string; gender: string; photoUrl: string };
  recommendation: Recommendation;
  seats: { selected: number; capacity: number };
  studentSelected: number;
  present: boolean;
  score: { average: number; judges: number } | null;
  votes: { good: number; reject: number } | null;
}
interface Queue {
  items: Item[];
  campus: { selected: number; cap: number };
  maxPerStudent: number;
}

export default function QueuePage() {
  return (
    <FinalPasswordProvider>
      <QueueInner />
    </FinalPasswordProvider>
  );
}

function QueueInner() {
  const { api } = useAuth();
  const { ask, forget } = useFinalPassword();
  const { data, error, loading, reload } = useApi<Queue>("/api/admin/queue");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Record<string, { ok: boolean; text: string }>>({});

  const items = useMemo(() => data?.items ?? [], [data]);
  const allPicked = items.length > 0 && items.every((i) => picked.has(i.id));
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function approve(ids: string[]) {
    const finalPassword = await ask();
    if (!finalPassword) return;
    setBusy(ids.length > 1 ? "bulk" : ids[0]);
    const next: Record<string, { ok: boolean; text: string }> = {};
    // In order: each approval can fill a seat or a student's 3rd slot.
    for (const id of ids) {
      try {
        await api(`/api/admin/entries/${id}`, { method: "PATCH", body: { status: "selected", finalPassword } });
        next[id] = { ok: true, text: "Approved — selected" };
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          forget();
          next[id] = { ok: false, text: e.message };
          break;
        }
        next[id] = { ok: false, text: e instanceof Error ? e.message : "Couldn't approve." };
      }
    }
    setOutcome((o) => ({ ...o, ...next }));
    setPicked(new Set());
    setBusy(null);
    reload();
  }

  async function decline(ids: string[]) {
    if (!confirm(ids.length > 1 ? `Decline ${ids.length} recommendations?` : "Decline this recommendation?")) return;
    setBusy(ids.length > 1 ? "bulk-decline" : `d-${ids[0]}`);
    const next: Record<string, { ok: boolean; text: string }> = {};
    for (const id of ids) {
      try {
        await api(`/api/admin/entries/${id}`, { method: "PATCH", body: { decline: true } });
        next[id] = { ok: true, text: "Declined" };
      } catch (e) {
        next[id] = { ok: false, text: e instanceof Error ? e.message : "Couldn't decline." };
      }
    }
    setOutcome((o) => ({ ...o, ...next }));
    setPicked(new Set());
    setBusy(null);
    reload();
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;
  const failures = Object.entries(outcome).filter(([, o]) => !o.ok);

  return (
    <div className="space-y-6">
      <PageTitle kicker={`${data.campus.selected}/${data.campus.cap} selected so far`} title="Approvals" />
      <p className="max-w-3xl text-ink-soft">
        Club admins recommend students for final selection. Approve to mark them <strong className="text-ink">Selected</strong> (you&apos;ll
        be asked for your password once per visit), or decline to send it back. Seat limits, the 3-event rule and the 50 cap are
        still checked on every approval.
      </p>

      {failures.length > 0 && (
        <div className="border-2 border-sindoor bg-sindoor/10 p-4 text-sm">
          <p className="font-bold text-sindoor">{failures.length} couldn&apos;t be approved:</p>
          <ul className="mt-1 list-disc pl-5">
            {failures.map(([id, o]) => (
              <li key={id}>{o.text}</li>
            ))}
          </ul>
        </div>
      )}

      {!items.length ? (
        <div className="border-2 border-dashed border-ink/40 p-10 text-center">
          <CheckCircle2 className="mx-auto text-peacock" size={32} />
          <p className="display mt-3 text-4xl">All clear</p>
          <p className="mt-2 text-ink-soft">No recommendations waiting. Club admins recommend from Participants.</p>
        </div>
      ) : (
        <>
          <div className="sticky top-[58px] z-20 flex flex-wrap items-center gap-3 border-y-2 border-ink bg-paper py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[#15120e]" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(items.map((i) => i.id)))} />
              Select all ({items.length})
            </label>
            {picked.size > 0 && (
              <>
                <span className="text-sm text-ink-soft">{picked.size} selected</span>
                <Btn tone="peacock" busy={busy === "bulk"} onClick={() => approve([...picked])}>
                  <Check size={14} strokeWidth={3} /> Approve {picked.size}
                </Btn>
                <Btn busy={busy === "bulk-decline"} onClick={() => decline([...picked])}>
                  <X size={14} /> Decline {picked.size}
                </Btn>
              </>
            )}
          </div>

          <ul className="space-y-3">
            {items.map((it) => {
              const full = it.seats.selected >= it.seats.capacity;
              const maxed = it.studentSelected >= data.maxPerStudent;
              const meta = CATEGORY_META[it.category];
              return (
                <li key={it.id} className={clsx("grid gap-4 border-2 bg-paper p-4 md:grid-cols-[auto_4rem_1fr_auto] md:items-center", picked.has(it.id) ? "border-ink shadow-[4px_4px_0_var(--ink)]" : "border-ink/30")}>
                  <input type="checkbox" className="h-5 w-5 accent-[#15120e]" checked={picked.has(it.id)} onChange={() => toggle(it.id)} aria-label={`Select ${it.student.name}`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cldTransform(it.student.photoUrl, "c_fill,g_face,w_128,h_128,q_auto,f_auto")} alt="" className="hidden h-16 w-16 border-2 border-ink object-cover md:block" />
                  <div className="min-w-0">
                    <p className="label flex items-center gap-2 text-ink-soft">
                      <span className={clsx("h-2 w-2", meta.bg)} aria-hidden /> {it.eventName}
                    </p>
                    <p className="display-md mt-1 text-2xl">{it.student.name}</p>
                    <p className="text-xs text-ink-soft">
                      {it.student.studentId} · {it.student.department} · Sem {it.student.semester} · {it.student.gender}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Recommended by {it.recommendation.by} · {new Date(it.recommendation.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {it.recommendation.note && <span className="italic"> — “{it.recommendation.note}”</span>}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Fact warn={full} label="Seats" value={`${it.seats.selected}/${it.seats.capacity}${full ? " · full" : ""}`} />
                      <Fact warn={maxed} label="Their selections" value={`${it.studentSelected}/${data.maxPerStudent}${maxed ? " · maxed" : ""}`} />
                      <Fact label="Judges" icon={<ClipboardCheck size={12} />} value={it.score ? `${it.score.average} avg · ${it.score.judges} judge${it.score.judges === 1 ? "" : "s"}` : "not scored"} />
                      <Fact
                        label="Votes"
                        value={
                          it.votes ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center gap-0.5"><ThumbsUp size={11} /> {it.votes.good}</span>
                              <span className="inline-flex items-center gap-0.5"><ThumbsDown size={11} /> {it.votes.reject}</span>
                            </span>
                          ) : (
                            "no voting"
                          )
                        }
                      />
                      <Fact label="Attendance" value={it.present ? "present" : "not marked"} />
                      <span className="self-center"><StatusBadge status={it.status} short /></span>
                    </div>
                    {outcome[it.id] && !outcome[it.id].ok && <p className="mt-2 text-sm font-semibold text-sindoor">{outcome[it.id].text}</p>}
                  </div>
                  <div className="flex gap-2 md:flex-col">
                    <Btn tone="peacock" busy={busy === it.id} disabled={full || maxed} onClick={() => approve([it.id])} title={full ? "Event is full" : maxed ? "Student already has 3 selections" : undefined}>
                      <Check size={14} strokeWidth={3} /> Approve
                    </Btn>
                    <Btn busy={busy === `d-${it.id}`} onClick={() => decline([it.id])}>
                      <X size={14} /> Decline
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="text-sm text-ink-soft">
        Approved students appear in the <Link href="/admin/final" className="font-semibold text-ink underline">Final 50</Link> list.
      </p>
    </div>
  );
}

function Fact({ label, value, warn, icon }: { label: string; value: React.ReactNode; warn?: boolean; icon?: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 border px-2 py-1", warn ? "border-marigold bg-marigold/20 font-bold" : "border-ink/25")}>
      {warn && <AlertTriangle size={12} aria-hidden />}
      {icon}
      <span className="text-ink-soft">{label}:</span> {value}
    </span>
  );
}
