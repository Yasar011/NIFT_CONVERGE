"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Loader2, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInPanel from "@/components/auth/SignInPanel";
import QrPass from "@/components/QrPass";
import StatusBadge from "@/components/StatusBadge";
import { getEventByKey, eventLabel } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import { MAX_SELECTIONS, SLOT_LABEL, PICK_SLOTS, cldTransform } from "@/lib/registration-schema";

export default function MyConverge() {
  const { status, me, refresh } = useAuth();
  const welcome = useSearchParams().get("welcome");

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
        <aside className="lg:col-span-4">
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
                <li key={e.id} className="relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-ink/15 py-5 pl-4">
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
