"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CalendarDays, Check, Loader2, Megaphone, MapPin, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInPanel from "@/components/auth/SignInPanel";
import QrPass from "@/components/QrPass";
import NotifyCard from "@/components/NotifyCard";
import StatusBadge from "@/components/StatusBadge";
import { getEventByKey, eventLabel } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import { MAX_SELECTIONS, SLOT_LABEL, PICK_SLOTS, cldTransform } from "@/lib/registration-schema";

export default function MyConverge() {
  const { status, me, refresh, error } = useAuth();
  const welcome = useSearchParams().get("welcome");

  if (status === "signed-in" && !me && error) {
    return (
      <Shell>
        <div className="border-2 border-sindoor p-6 sm:p-10">
          <p className="display text-4xl text-sindoor">Can&apos;t open your account</p>
          <p className="mt-3 max-w-lg">{error}</p>
        </div>
      </Shell>
    );
  }

  if (status === "loading" || (status === "signed-in" && !me)) {
    return (
      <Shell>
        <p className="flex items-center gap-3 text-ink-soft">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </p>
      </Shell>
    );
  }

  if (status === "signed-out" || !me) {
    return (
      <Shell>
        <SignInPanel title="Sign in to see your Converge" text="Your registration, selection status and QR pass live here." />
      </Shell>
    );
  }

  const reg = me.registration;
  if (!reg) {
    return (
      <Shell>
        <div className="border-2 border-ink p-6 sm:p-10">
          <p className="display text-4xl sm:text-5xl">You haven&apos;t registered yet</p>
          <p className="mt-3 max-w-md text-ink-soft">
            {me.registrationOpen
              ? "Registration is open — pick your events to enter NIFT Jodhpur's selection."
              : "Registration hasn't opened yet. You can preview the form now."}
          </p>
          <Link href="/register" className="btn-print mt-6 inline-flex items-center gap-2 border-2 border-ink bg-blue px-6 py-4 text-sm font-bold uppercase tracking-wide text-paper">
            {me.registrationOpen ? "Register now" : "Preview the form"} <ArrowUpRight size={16} />
          </Link>
          {me.user.role !== "student" && (
            <Link href="/admin" className="ml-4 inline-block text-sm font-bold underline underline-offset-4">
              Go to admin panel
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  const order = (slot: string) => PICK_SLOTS.indexOf(slot as never);
  const entries = [...me.entries].sort((a, b) => order(a.slot) - order(b.slot));
  const selected = me.selectedCount;

  return (
    <>
      <header className="border-b-2 border-ink bg-blue text-paper">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-12 lg:items-end lg:py-14">
          <div className="flex items-center gap-5 lg:col-span-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cldTransform(reg.photo?.url, "c_fill,g_face,w_240,h_240,q_auto,f_auto")}
              alt=""
              className="h-24 w-24 shrink-0 border-2 border-paper object-cover sm:h-32 sm:w-32"
            />
            <div>
              <p className="label opacity-80">My Converge</p>
              <h1 className="display mt-2 text-5xl sm:text-7xl">{reg.fullName}</h1>
              <p className="mt-2 text-sm opacity-85">
                {reg.studentId} · {reg.department} · Semester {reg.semester}
              </p>
            </div>
          </div>
          <div className="lg:col-span-4">
            <p className="label opacity-80">Selected for</p>
            <p className="display mt-1 text-7xl">
              {selected}
              <span className="text-4xl opacity-60">/{MAX_SELECTIONS}</span>
            </p>
            <div className="mt-2 flex gap-1.5" aria-hidden>
              {Array.from({ length: MAX_SELECTIONS }).map((_, i) => (
                <span key={i} className={clsx("h-2 flex-1 border border-paper", i < selected ? "bg-marigold" : "bg-transparent")} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {welcome && (
        <div className="border-b-2 border-ink bg-peacock text-paper">
          <p className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-4 font-semibold sm:px-8">
            <Check size={18} strokeWidth={3} /> You&apos;re registered. Keep your QR pass handy for screenings and trials.
          </p>
        </div>
      )}

      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-12 sm:px-8 lg:grid-cols-12 lg:py-16">
        <aside className="space-y-6 lg:col-span-4">
          <NotifyCard />
          <div className="border-2 border-ink bg-paper p-5 lg:sticky lg:top-24">
            <p className="label">Your QR pass</p>
            <div className="mt-4 flex justify-center border-2 border-ink bg-white p-3">
              <QrPass uid={reg.uid} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Show this at every screening, trial and voting round. The club admin scans it to mark you present.
            </p>
          </div>
        </aside>

        <section className="lg:col-span-8">
          {me.announcements.length > 0 && (
            <div className="mb-10">
              <h2 className="display-md flex items-center gap-3 border-b-2 border-ink pb-3 text-3xl sm:text-4xl">
                <Megaphone size={24} /> Announcements
              </h2>
              <ul>
                {me.announcements.slice(0, 6).map((a) => (
                  <li key={a.id} className="border-b border-ink/15 py-4">
                    <p className="label text-ink-soft">
                      {audienceLabel(a.audience)} · {new Date(a.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    <p className="mt-1 text-lg font-bold">{a.title}</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-soft">{a.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
            <h2 className="display-md text-3xl sm:text-4xl">Your events</h2>
            <button onClick={refresh} className="flex cursor-pointer items-center gap-2 text-sm font-semibold hover:underline">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <ul>
            {entries.map((e) => {
              const ev = getEventByKey(e.eventKey);
              const meta = CATEGORY_META[e.category];
              return (
                <li key={e.id} className="relative grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 border-b border-ink/15 py-5 pl-4">
                  <span className={clsx("absolute inset-y-0 left-0 w-1", meta.bg)} aria-hidden />
                  <div>
                    <p className="label text-ink-soft">
                      {SLOT_LABEL[e.slot]} · {meta.short}
                    </p>
                    <Link href={ev ? `/events/${ev.category}/${ev.slug}` : "/events"} className="display-md mt-1 block text-2xl hover:underline sm:text-3xl">
                      {ev ? eventLabel(ev) : e.eventKey}
                    </Link>
                    {e.attendance?.present && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-peacock">
                        <Check size={12} strokeWidth={3} /> Marked present
                      </p>
                    )}
                  </div>
                  <StatusBadge status={e.status} />
                  <div className="col-span-2">
                    <Timeline status={e.status} hasTrial={me.trials.some((t) => t.eventKey === e.eventKey)} present={!!e.attendance?.present} />
                    {me.trials
                      .filter((t) => t.eventKey === e.eventKey && `${t.date}T${t.time}` >= new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 16))
                      .slice(0, 2)
                      .map((t) => (
                        <p key={t.id} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-4 border-marigold bg-marigold/15 px-3 py-2 text-sm">
                          <strong>{t.title}</strong>
                          <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {fmtDate(t.date)} · {t.time}</span>
                          <span className="inline-flex items-center gap-1"><MapPin size={14} /> {t.venue}</span>
                          {t.notes && <span className="w-full text-ink-soft">{t.notes}</span>}
                        </p>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-ink-soft">
            Need to change an event? Contact the main admin — changes can&apos;t be made here after submitting.
          </p>
        </section>
      </div>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8">{children}</div>;
}

const fmtDate = (d: string) =>
  new Date(`${d}T00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function audienceLabel(a: string) {
  if (a === "students") return "For you";
  if (a === "all") return "Everyone";
  if (a.startsWith("club:")) return CATEGORY_META[a.slice(5) as keyof typeof CATEGORY_META]?.label ?? "Club";
  const ev = getEventByKey(a);
  return ev ? eventLabel(ev) : "Event";
}

/** Registered → Trial → Shortlisted → Final, for one event. */
function Timeline({ status, hasTrial, present }: { status: string; hasTrial: boolean; present: boolean }) {
  const final = status === "selected" ? "Selected" : status === "not_selected" ? "Not selected" : status === "locked" ? "Locked" : "Final";
  const steps = [
    { label: "Registered", done: true },
    { label: present ? "Trial attended" : hasTrial ? "Trial scheduled" : "Trial", done: present || hasTrial },
    { label: "Shortlisted", done: status === "shortlisted" || status === "selected" },
    { label: final, done: status === "selected" || status === "not_selected" || status === "locked" },
  ];
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={i} className="text-[0.7rem] font-semibold uppercase tracking-wide">
          <span
            className={clsx(
              "mb-1 block h-1.5",
              s.done ? (i === 3 && status !== "selected" ? "bg-ink/40" : "bg-peacock") : "bg-ink/10"
            )}
            aria-hidden
          />
          <span className={s.done ? "text-ink" : "text-ink-soft"}>
            {s.done && <Check size={10} strokeWidth={3} className="mr-0.5 inline" />}
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
