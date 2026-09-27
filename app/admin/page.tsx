"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, Stat, useApi } from "@/components/admin/kit";
import { getEventByKey, eventLabel } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";

interface Overview {
  role: string;
  club: EventCategory | null;
  registrations: number;
  selectedStudents: number;
  campusCap: number;
  registrationOpen: boolean;
  events: { key: string; category: EventCategory; registered: number; selected: number; capacity: number }[];
}

export default function AdminOverview() {
  const { api } = useAuth();
  const { data, error, loading, reload } = useApi<Overview>("/api/admin/overview");
  const [saving, setSaving] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;

  const isMain = data.role === "main_admin";
  const pct = Math.round((data.selectedStudents / data.campusCap) * 100);

  async function toggleRegistration() {
    if (!data) return;
    const next = !data.registrationOpen;
    if (!confirm(next ? "Open registration for all students?" : "Close registration? Students won't be able to submit.")) return;
    setSaving(true);
    try {
      await api("/api/admin/settings", { method: "PATCH", body: { registrationOpen: next } });
      await reload();
    } finally {
      setSaving(false);
    }
  }

  const clubs = CATEGORY_ORDER.filter((c) => isMain || c === data.club);

  return (
    <div className="space-y-10">
      <PageTitle kicker="Converge 2026" title="Overview" />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Students registered" value={data.registrations} />
        <Stat
          label="Selected for Converge"
          value={
            <>
              {data.selectedStudents}
              <span className="text-3xl text-ink-soft">/{data.campusCap}</span>
            </>
          }
          sub={
            <div className="h-2 border border-ink" aria-hidden>
              <div className={clsx("h-full", pct >= 100 ? "bg-sindoor" : "bg-peacock")} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          }
        />
        <div className={clsx("border-2 border-ink p-5", data.registrationOpen ? "bg-peacock text-paper" : "bg-marigold")}>
          <p className="label opacity-80">Registration</p>
          <p className="display mt-2 text-6xl">{data.registrationOpen ? "Open" : "Closed"}</p>
          {isMain ? (
            <Btn className="mt-3" tone={data.registrationOpen ? "paper" : "ink"} busy={saving} onClick={toggleRegistration}>
              {data.registrationOpen ? "Close registration" : "Open registration"}
            </Btn>
          ) : (
            <p className="mt-2 text-sm opacity-80">Only the main admin can change this.</p>
          )}
        </div>
      </div>

      {clubs.map((club) => {
        const meta = CATEGORY_META[club];
        const events = data.events.filter((e) => e.category === club);
        return (
          <section key={club}>
            <div className="flex items-center justify-between border-b-2 border-ink pb-2">
              <h2 className="display-md flex items-center gap-3 text-3xl">
                <span className={clsx("h-3 w-3", meta.bg)} aria-hidden />
                {meta.label}
              </h2>
              <Link href={`/admin/participants?category=${club}`} className="text-sm font-bold underline underline-offset-4">
                Manage
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/20 text-ink-soft">
                    <th className="label py-2 font-bold">Event</th>
                    <th className="label py-2 text-right">Registered</th>
                    <th className="label py-2 text-right">Selected</th>
                    <th className="label w-32 py-2 pl-4">Seats</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const ev = getEventByKey(e.key);
                    const full = e.selected >= e.capacity;
                    return (
                      <tr key={e.key} className="border-b border-ink/10 hover:bg-paper-2">
                        <td className="py-2.5">
                          <Link href={`/admin/participants?event=${encodeURIComponent(e.key)}`} className="font-semibold hover:underline">
                            {ev ? eventLabel(ev) : e.key}
                          </Link>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{e.registered}</td>
                        <td className={clsx("py-2.5 text-right font-bold tabular-nums", full && "text-peacock")}>
                          {e.selected}/{e.capacity}
                        </td>
                        <td className="py-2.5 pl-4">
                          <div className="h-2 border border-ink/40" aria-hidden>
                            <div className={clsx("h-full", full ? "bg-peacock" : "bg-ink")} style={{ width: `${Math.min(100, (e.selected / e.capacity) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
