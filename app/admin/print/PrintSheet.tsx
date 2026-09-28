"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, inputCls, useApi } from "@/components/admin/kit";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey, criteriaFor } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import { SLOT_LABEL, cldTransform } from "@/lib/registration-schema";
import type { EntryView } from "@/lib/api-types";

/** Printable attendance or judging sheet for one event — for offline use at the venue. */
export default function PrintSheet() {
  const { me } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const event = params.get("event") || "";
  const type = params.get("type") === "judging" ? "judging" : "attendance";
  const isMain = me?.user.role === "main_admin";
  const events = PICKABLE_EVENTS.filter((e) => isMain || e.category === me?.user.club);
  const ev = event ? getEventByKey(event) : null;
  const { data, error, loading } = useApi<{ entries: EntryView[] }>(event ? `/api/admin/entries?event=${encodeURIComponent(event)}` : null);

  const people = (data?.entries ?? [])
    .filter((e) => e.status !== "locked" && e.status !== "not_selected")
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
  const criteria = ev ? criteriaFor(ev) : [];
  const go = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => sp.set(k, v));
    router.replace(`/admin/print?${sp.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 print:hidden md:grid-cols-[1fr_12rem_auto] md:items-end">
        <label>
          <span className="label mb-1.5 block text-ink-soft">Event</span>
          <select className={inputCls} value={event} onChange={(e) => go({ event: e.target.value })}>
            <option value="">Choose</option>
            {events.map((e) => (
              <option key={eventKey(e)} value={eventKey(e)}>{eventLabel(e)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label mb-1.5 block text-ink-soft">Sheet</span>
          <select className={inputCls} value={type} onChange={(e) => go({ type: e.target.value })}>
            <option value="attendance">Attendance</option>
            <option value="judging">Judging</option>
          </select>
        </label>
        <Btn tone="ink" disabled={!people.length} onClick={() => window.print()}>
          <Printer size={14} /> Print
        </Btn>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {event && loading && !data && <Loading />}

      {ev && data && (
        <article className="bg-white p-4 text-ink print:p-0">
          <header className="flex items-end justify-between border-b-2 border-ink pb-2">
            <div>
              <p className="label">NIFT Jodhpur · Converge 2026 · {CATEGORY_META[ev.category].label}</p>
              <h1 className="display mt-1 text-4xl">{eventLabel(ev)}</h1>
            </div>
            <p className="text-right text-sm">
              {type === "attendance" ? "Attendance sheet" : "Judging sheet"}
              <br />
              Date: ____________ Venue: ____________
            </p>
          </header>
          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Photo</th>
                <th className="py-2 pr-2">Name / ID</th>
                <th className="py-2 pr-2">Dept · Sem</th>
                {type === "attendance" ? (
                  <>
                    <th className="py-2 pr-2">Pick</th>
                    <th className="w-20 py-2 pr-2">Present</th>
                    <th className="w-40 py-2">Signature</th>
                  </>
                ) : (
                  <>
                    {criteria.map((c) => (
                      <th key={c} className="w-16 py-2 pr-1 text-[0.65rem] leading-tight">{c} /10</th>
                    ))}
                    <th className="w-16 py-2">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {people.map((e, i) => (
                <tr key={e.id} className="break-inside-avoid border-b border-ink/30">
                  <td className="py-2 pr-2 tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cldTransform(e.student.photoUrl, "c_fill,g_face,w_96,h_96,q_auto,f_auto")} alt="" className="h-11 w-11 border border-ink object-cover" />
                  </td>
                  <td className="py-2 pr-2">
                    <strong>{e.student.name}</strong>
                    <br />
                    <span className="text-xs">{e.student.studentId}</span>
                  </td>
                  <td className="py-2 pr-2 text-xs">{e.student.department} · {e.student.semester}</td>
                  {type === "attendance" ? (
                    <>
                      <td className="py-2 pr-2 text-xs">{SLOT_LABEL[e.slot]}</td>
                      <td className="py-2 pr-2"><span className="inline-block h-5 w-5 border-2 border-ink" /></td>
                      <td className="py-2" />
                    </>
                  ) : (
                    <>
                      {criteria.map((c) => <td key={c} className="border-l border-ink/20 py-2" />)}
                      <td className="border-l border-ink/20 py-2" />
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!people.length && <p className="py-8 text-center">No participants in contention for this event.</p>}
          <p className="mt-6 text-xs">Judge / coordinator: ______________________ Signature: ______________________</p>
        </article>
      )}
    </div>
  );
}
