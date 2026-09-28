"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import StatusBadge from "@/components/StatusBadge";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey, teamComposition, type Mix } from "@/lib/events";
import { cldTransform } from "@/lib/registration-schema";
import type { EntryView } from "@/lib/api-types";

type Role = "main" | "sub" | null;

export default function TeamBuilder() {
  const { me } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const isMain = me?.user.role === "main_admin";
  const teamEvents = PICKABLE_EVENTS.filter((e) => teamComposition(e) && (isMain || e.category === me?.user.club));
  const event = params.get("event") || "";
  const ev = event ? getEventByKey(event) : null;
  const comp = ev ? teamComposition(ev) : null;
  const { data, error, loading, reload } = useApi<{ entries: EntryView[] }>(
    event ? `/api/admin/entries?event=${encodeURIComponent(event)}` : null
  );

  // Only people still in contention can be placed in the team.
  const pool = (data?.entries ?? [])
    .filter((e) => e.status === "selected" || e.status === "shortlisted")
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return (
    <div className="space-y-6">
      <PageTitle kicker="Team events" title="Team builder" />
      <label className="block max-w-xl">
        <span className="label mb-1.5 block text-ink-soft">Team event</span>
        <select className={inputCls} value={event} onChange={(e) => router.replace(`/admin/teams?event=${encodeURIComponent(e.target.value)}`)}>
          <option value="">Choose a team event</option>
          {teamEvents.map((e) => (
            <option key={eventKey(e)} value={eventKey(e)}>{eventLabel(e)} — {e.participantsLabel}</option>
          ))}
        </select>
      </label>

      {!event && (
        <p className="text-ink-soft">
          Pick a team event. Shortlisted and selected students appear here; mark each one as main team or substitute and the
          builder checks the mix against the rulebook.
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {event && loading && !data && <Loading />}

      {data && ev && comp && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <MixCheck title="Main team" need={comp.main} have={pool.filter((e) => e.teamRole === "main")} />
            <MixCheck title="Substitutes" need={comp.subs} have={pool.filter((e) => e.teamRole === "sub")} />
          </div>
          <ul className="border-t-2 border-ink">
            {pool.map((e) => (
              <Member key={e.id} entry={e} onChanged={reload} />
            ))}
            {!pool.length && (
              <li className="py-8 text-center text-ink-soft">Shortlist students in Participants first — they&apos;ll show up here.</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}

function MixCheck({ title, need, have }: { title: string; need: Mix; have: EntryView[] }) {
  const boys = have.filter((e) => e.student.gender === "Male").length;
  const girls = have.filter((e) => e.student.gender === "Female").length;
  const genderRule = need.boys + need.girls > 0;
  const issues: string[] = [];
  if (need.total && have.length !== need.total) issues.push(`${have.length} of ${need.total} placed`);
  if (genderRule && boys !== need.boys) issues.push(`needs ${need.boys} boy${need.boys === 1 ? "" : "s"}, has ${boys}`);
  if (genderRule && girls !== need.girls) issues.push(`needs ${need.girls} girl${need.girls === 1 ? "" : "s"}, has ${girls}`);
  if (!need.total && have.length) issues.push("the rulebook allows no substitutes here");
  const okay = issues.length === 0;

  return (
    <div className={clsx("border-2 p-4", okay ? "border-peacock" : "border-marigold")}>
      <p className="label">{title}</p>
      <p className="display mt-1 text-4xl tabular-nums">
        {have.length}
        <span className="text-2xl text-ink-soft">/{need.total || 0}</span>
      </p>
      <p className="text-sm text-ink-soft">
        {genderRule ? `Rulebook: ${need.boys} boys + ${need.girls} girls` : need.total ? `Rulebook: ${need.total} players` : "Rulebook: none"} · placed {boys} boys, {girls} girls
      </p>
      <p className={clsx("mt-2 flex items-center gap-1.5 text-sm font-semibold", okay ? "text-peacock" : "text-ink")}>
        {okay ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} className="text-marigold" />}
        {okay ? "Matches the rulebook" : issues.join(" · ")}
      </p>
    </div>
  );
}

function Member({ entry, onChanged }: { entry: EntryView; onChanged: () => void }) {
  const { api } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const role: Role = entry.teamRole ?? null;

  async function set(next: Role) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/entries/${entry.id}`, { method: "PATCH", body: { teamRole: next } });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 py-3">
      <span className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldTransform(entry.student.photoUrl, "c_fill,g_face,w_96,h_96,q_auto,f_auto")} alt="" className="h-12 w-12 shrink-0 border-2 border-ink object-cover" />
        <span className="min-w-0">
          <span className="block truncate font-bold">{entry.student.name}</span>
          <span className="block text-xs text-ink-soft">{entry.student.gender} · {entry.student.department} · Sem {entry.student.semester}</span>
          <span className="mt-1 block"><StatusBadge status={entry.status} short /></span>
          {err && <span className="mt-1 block text-xs font-semibold text-sindoor">{err}</span>}
        </span>
      </span>
      <span className="inline-flex border-2 border-ink" role="group" aria-label={`Team role for ${entry.student.name}`}>
        {([
          ["main", "Main"],
          ["sub", "Sub"],
          [null, "—"],
        ] as const).map(([value, label]) => (
          <button
            key={label}
            disabled={busy}
            aria-pressed={role === value}
            onClick={() => set(value)}
            className={clsx(
              "min-w-14 cursor-pointer border-r-2 border-ink px-3 py-2 text-xs font-bold uppercase last:border-r-0 disabled:opacity-50",
              role === value ? (value === "main" ? "bg-peacock text-paper" : value === "sub" ? "bg-blue text-paper" : "bg-ink text-paper") : "bg-paper hover:bg-paper-2"
            )}
          >
            {label}
          </button>
        ))}
      </span>
    </li>
  );
}
