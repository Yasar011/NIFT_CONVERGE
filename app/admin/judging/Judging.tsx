"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Printer } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import StatusBadge from "@/components/StatusBadge";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey, criterionKey } from "@/lib/events";
import { cldTransform } from "@/lib/registration-schema";
import type { ScoreRow } from "@/lib/api-types";

interface Sheet {
  criteria: string[];
  max: number;
  rows: ScoreRow[];
}

export default function Judging() {
  const { me } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const isMain = me?.user.role === "main_admin";
  const event = params.get("event") || "";
  const events = PICKABLE_EVENTS.filter((e) => isMain || e.category === me?.user.club);
  const { data, error, loading, reload } = useApi<Sheet>(event ? `/api/admin/scores?event=${encodeURIComponent(event)}` : null);
  const [sortByRank, setSortByRank] = useState(false);
  const ev = event ? getEventByKey(event) : null;

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])];
    return sortByRank
      ? list.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      : list.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, sortByRank]);

  return (
    <div className="space-y-6">
      <PageTitle kicker="Scoring" title="Judging sheet">
        {event && (
          <Link href={`/admin/print?event=${encodeURIComponent(event)}&type=judging`} className="inline-flex items-center gap-2 border-2 border-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-paper-2">
            <Printer size={14} /> Print sheet
          </Link>
        )}
      </PageTitle>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <label>
          <span className="label mb-1.5 block text-ink-soft">Event</span>
          <select className={inputCls} value={event} onChange={(e) => router.replace(`/admin/judging?event=${encodeURIComponent(e.target.value)}`)}>
            <option value="">Choose the event to judge</option>
            {events.map((e) => (
              <option key={eventKey(e)} value={eventKey(e)}>{eventLabel(e)}</option>
            ))}
          </select>
        </label>
        {data && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={sortByRank} onChange={(e) => setSortByRank(e.target.checked)} /> Sort by rank
          </label>
        )}
      </div>

      {!event && <p className="text-ink-soft">Pick an event. Each judge scores every performer 0–10 on the rulebook&apos;s criteria; the average of all judges decides the rank.</p>}
      {error && <ErrorNote>{error}</ErrorNote>}
      {event && loading && !data && <Loading />}

      {data && ev && (
        <>
          <p className="border-2 border-ink bg-paper-2 px-4 py-3 text-sm">
            <strong>Criteria:</strong> {data.criteria.join(" · ")} — each out of {data.max}, total {data.criteria.length * data.max}.
          </p>
          <ul className="border-t-2 border-ink">
            {rows.map((r) => (
              <ScoreLine key={r.entryId} row={r} criteria={data.criteria} max={data.max} onSaved={reload} />
            ))}
            {!rows.length && <li className="py-8 text-center text-ink-soft">No one to judge in this event yet.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

function ScoreLine({ row, criteria, max, onSaved }: { row: ScoreRow; criteria: string[]; max: number; onSaved: () => void }) {
  const { api } = useAuth();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c, row.mine?.[criterionKey(c)] !== undefined ? String(row.mine[criterionKey(c)]) : ""]))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const filled = criteria.every((c) => values[c] !== "");
  const myTotal = criteria.reduce((n, c) => n + (Number(values[c]) || 0), 0);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/scores", {
        body: { entryId: row.entryId, scores: Object.fromEntries(criteria.map((c) => [c, Number(values[c])])) },
      });
      setMsg({ ok: true, text: "Saved" });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-3 border-b border-ink/15 py-4 lg:grid-cols-[3rem_14rem_1fr_9rem] lg:items-center">
      <span className="display text-4xl tabular-nums text-ink-soft" title="Rank by judges' average">{row.rank ?? "—"}</span>
      <span className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldTransform(row.photoUrl, "c_fill,g_face,w_96,h_96,q_auto,f_auto")} alt="" className="h-12 w-12 shrink-0 border-2 border-ink object-cover" />
        <span className="min-w-0">
          <span className="block truncate font-bold">{row.name}</span>
          <span className="block text-xs text-ink-soft">{row.studentId} · {row.department}</span>
          <span className="mt-1 block"><StatusBadge status={row.status} short /></span>
        </span>
      </span>
      <span className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {criteria.map((c) => (
          <label key={c} className="text-xs">
            <span className="mb-1 block truncate text-ink-soft" title={c}>{c}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={max}
              step={0.5}
              className={clsx(inputCls, "py-2 text-center text-base font-bold tabular-nums")}
              value={values[c]}
              onChange={(e) => setValues({ ...values, [c]: e.target.value })}
              aria-label={`${c} for ${row.name}`}
            />
          </label>
        ))}
      </span>
      <span className="flex flex-col items-start gap-1 lg:items-end">
        <span className="text-sm">
          Mine <strong className="tabular-nums">{filled ? myTotal : "—"}</strong> · Avg{" "}
          <strong className="tabular-nums">{row.average ?? "—"}</strong>
          <span className="text-xs text-ink-soft"> ({row.judges} judge{row.judges === 1 ? "" : "s"})</span>
        </span>
        <Btn tone="ink" busy={busy} disabled={!filled} onClick={save}>
          {msg?.ok ? <Check size={14} strokeWidth={3} /> : null} Save
        </Btn>
        {msg && !msg.ok && <span className="text-xs font-semibold text-sindoor">{msg.text}</span>}
      </span>
    </li>
  );
}
