"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, Stat, inputCls, useApi } from "@/components/admin/kit";
import { FinalPasswordProvider, useFinalPassword } from "@/components/admin/FinalPassword";
import { getEventByKey, eventLabel } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import type { AppSettings } from "@/lib/settings-shared";

interface Overview {
  role: string;
  club: EventCategory | null;
  registrations: number;
  selectedStudents: number;
  campusCap: number;
  registrationOpen: boolean;
  settings: AppSettings;
  pendingApprovals: number;
  events: { key: string; category: EventCategory; registered: number; selected: number; capacity: number }[];
}

const toLocalInput = (t: number | null) => {
  if (!t) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmt = (t: number | null) =>
  t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;

export default function AdminOverview() {
  return (
    <FinalPasswordProvider>
      <OverviewInner />
    </FinalPasswordProvider>
  );
}

function OverviewInner() {
  const { data, error, loading, reload } = useApi<Overview>("/api/admin/overview");

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;

  const isMain = data.role === "main_admin";
  const pct = Math.round((data.selectedStudents / data.campusCap) * 100);
  const clubs = CATEGORY_ORDER.filter((c) => isMain || c === data.club);
  const s = data.settings;

  return (
    <div className="space-y-10">
      <PageTitle kicker="Converge 2026" title="Overview" />

      {s.selectionFrozen && (
        <p className="flex items-center gap-2 border-2 border-ink bg-ink px-4 py-3 text-sm font-semibold text-paper">
          <Lock size={16} /> Selections are frozen: no statuses, members or teams can change until the main admin unfreezes.
        </p>
      )}

      {data.pendingApprovals > 0 && (
        <Link href="/admin/queue" className="btn-print flex items-center justify-between gap-3 border-2 border-ink bg-marigold px-4 py-3 font-bold">
          <span>{data.pendingApprovals} recommendation{data.pendingApprovals === 1 ? "" : "s"} waiting for your approval</span>
          <span className="text-sm uppercase">Review →</span>
        </Link>
      )}

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
          <p className="mt-2 text-sm opacity-85">
            {s.opensAt
              ? `Scheduled: ${fmt(s.opensAt)} to ${fmt(s.closesAt) ?? "no end"}`
              : s.closesAt
                ? `Closes automatically ${fmt(s.closesAt)}`
                : "Manual switch"}
          </p>
        </div>
      </div>

      {isMain && <Controls settings={s} open={data.registrationOpen} onChanged={reload} />}

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

function Controls({ settings, open, onChanged }: { settings: AppSettings; open: boolean; onChanged: () => void }) {
  const { api } = useAuth();
  const { ask, forget } = useFinalPassword();
  const [opensAt, setOpensAt] = useState(toLocalInput(settings.opensAt));
  const [closesAt, setClosesAt] = useState(toLocalInput(settings.closesAt));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(what: string, body: Record<string, unknown>, done: string) {
    setBusy(what);
    setMsg(null);
    try {
      await api("/api/admin/settings", { method: "PATCH", body });
      setMsg({ ok: true, text: done });
      onChanged();
    } catch (e) {
      if (what === "freeze") forget();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="border-2 border-ink bg-paper p-5">
        <p className="label">Registration</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            tone="peacock"
            busy={busy === "open"}
            disabled={open && !settings.opensAt}
            onClick={() =>
              confirm("Open registration now? This clears any schedule.") &&
              save("open", { registrationOpen: true, opensAt: null, closesAt: null }, "Registration is open.")
            }
          >
            Open now
          </Btn>
          <Btn
            busy={busy === "close"}
            disabled={!open && !settings.opensAt && !settings.closesAt}
            onClick={() =>
              confirm("Close registration now? This clears any schedule.") &&
              save("close", { registrationOpen: false, opensAt: null, closesAt: null }, "Registration is closed.")
            }
          >
            Close now
          </Btn>
        </div>
        <p className="label mt-5 text-ink-soft">Or schedule it (India time)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Opens</span>
            <input type="datetime-local" className={inputCls} value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-soft">Closes</span>
            <input type="datetime-local" className={inputCls} value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            tone="ink"
            busy={busy === "schedule"}
            disabled={!opensAt && !closesAt}
            onClick={() =>
              save(
                "schedule",
                {
                  opensAt: opensAt ? new Date(opensAt).getTime() : null,
                  closesAt: closesAt ? new Date(closesAt).getTime() : null,
                },
                "Schedule saved. The site switches by itself within about a minute of each time."
              )
            }
          >
            Save schedule
          </Btn>
          {(settings.opensAt || settings.closesAt) && (
            <Btn
              busy={busy === "clear"}
              onClick={() => {
                setOpensAt("");
                setClosesAt("");
                save("clear", { opensAt: null, closesAt: null }, "Schedule cleared.");
              }}
            >
              Clear schedule
            </Btn>
          )}
        </div>
      </div>

      <div className={clsx("border-2 border-ink p-5", settings.selectionFrozen ? "bg-ink text-paper" : "bg-paper")}>
        <p className="label">Final list</p>
        <p className="display-md mt-2 flex items-center gap-2 text-3xl">
          {settings.selectionFrozen ? <Lock size={24} /> : <LockOpen size={24} />}
          {settings.selectionFrozen ? "Selections frozen" : "Selections open"}
        </p>
        <p className={clsx("mt-2 text-sm", settings.selectionFrozen ? "text-paper/80" : "text-ink-soft")}>
          Freeze once the final list is submitted to the Campus SDAC. While frozen, nobody (including club admins) can
          change statuses, add or remove members, or edit teams. Needs your final-selection password.
        </p>
        <Btn
          className="mt-4"
          tone={settings.selectionFrozen ? "paper" : "sindoor"}
          busy={busy === "freeze"}
          onClick={async () => {
            const finalPassword = await ask();
            if (!finalPassword) return;
            save(
              "freeze",
              { selectionFrozen: !settings.selectionFrozen, finalPassword },
              settings.selectionFrozen ? "Selections unfrozen." : "Selections frozen."
            );
          }}
        >
          {settings.selectionFrozen ? "Unfreeze selections" : "Freeze selections"}
        </Btn>
      </div>

      {msg && <p className={clsx("text-sm font-semibold lg:col-span-2", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
    </section>
  );
}
