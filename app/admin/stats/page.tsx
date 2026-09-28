"use client";

import { AlertTriangle } from "lucide-react";
import { ErrorNote, Loading, PageTitle, Stat, useApi } from "@/components/admin/kit";
import { CATEGORY_META, type EventCategory } from "@/lib/types";
import { STATUS_LABEL, type EntryStatus } from "@/lib/registration-schema";

interface Bar {
  label: string;
  value: number;
}

interface Stats {
  scope: string;
  students: number;
  entries: number;
  present: number;
  votes: number;
  byDepartment: Bar[];
  bySemester: Bar[];
  byGender: Bar[];
  byStatus: Bar[];
  events: { key: string; label: string; category: EventCategory; interested: number; selected: number; capacity: number; present: number }[];
}

export default function StatsPage() {
  const { data, error, loading } = useApi<Stats>("/api/admin/stats");
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;

  const oversubscribed = data.events.filter((e) => e.interested > e.capacity);
  const scopeLabel = data.scope === "all" ? "All clubs" : CATEGORY_META[data.scope as EventCategory]?.label;

  return (
    <div className="space-y-10">
      <PageTitle kicker={scopeLabel} title="Stats" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={data.students} />
        <Stat label="Event entries" value={data.entries} />
        <Stat label="Marked present" value={data.present} sub={data.entries ? `${Math.round((data.present / data.entries) * 100)}% of entries` : undefined} />
        <Stat label="Votes cast" value={data.votes} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <BarChart title="Students by department" bars={data.byDepartment} />
        <BarChart title="Students by semester" bars={data.bySemester} />
        <BarChart title="Students by gender" bars={data.byGender} />
      </div>

      <BarChart title="Entries by status" bars={data.byStatus.map((b) => ({ ...b, label: STATUS_LABEL[b.label as EntryStatus] ?? b.label }))} />

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
          <h2 className="display-md text-3xl">Demand vs seats</h2>
          <p className="text-sm text-ink-soft">Bar = students still in contention · tick = seats the rulebook allows</p>
        </div>
        {oversubscribed.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={16} className="text-marigold" aria-hidden />
            {oversubscribed.length} event{oversubscribed.length === 1 ? " has" : "s have"} more interest than seats — trials needed.
          </p>
        )}
        <ul className="mt-4 space-y-2.5">
          {data.events.map((e) => {
            const max = Math.max(...data.events.map((x) => Math.max(x.interested, x.capacity)), 1);
            const over = e.interested > e.capacity;
            return (
              <li key={e.key} className="grid grid-cols-[minmax(0,11rem)_1fr_7.5rem] items-center gap-3 text-sm" title={`${e.label}: ${e.interested} interested, ${e.capacity} seats, ${e.selected} selected`}>
                <span className="truncate font-semibold">{e.label}</span>
                <span className="relative h-5">
                  <span className="absolute inset-y-1 left-0 rounded-r-[4px] bg-blue" style={{ width: `${(e.interested / max) * 100}%` }} aria-hidden />
                  <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(e.capacity / max) * 100}%` }} aria-hidden />
                </span>
                <span className="tabular-nums">
                  {e.interested} / {e.capacity}
                  {over && <span className="ml-1.5 text-xs font-bold uppercase">· over</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Single-series horizontal bars: one hue, value labels in ink, hover titles. */
function BarChart({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const total = bars.reduce((n, b) => n + b.value, 0);
  return (
    <section>
      <h2 className="display-md border-b-2 border-ink pb-2 text-2xl">{title}</h2>
      {!bars.length || !total ? (
        <p className="py-4 text-sm text-ink-soft">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {bars.map((b) => (
            <li key={b.label} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm" title={`${b.label}: ${b.value} (${Math.round((b.value / total) * 100)}%)`}>
              <span className="truncate font-semibold">{b.label}</span>
              <span className="h-4">
                <span className="block h-full rounded-r-[4px] bg-blue" style={{ width: `${(b.value / max) * 100}%`, minWidth: b.value ? 2 : 0 }} aria-hidden />
              </span>
              <span className="text-right tabular-nums">{b.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
