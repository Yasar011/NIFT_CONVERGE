"use client";

import Link from "next/link";
import { Download, Lock, Printer } from "lucide-react";
import clsx from "clsx";
import { Btn, ErrorNote, Loading, PageTitle, useApi, useDownload } from "@/components/admin/kit";
import { CATEGORY_META, type EventCategory } from "@/lib/types";
import { cldTransform } from "@/lib/registration-schema";

interface FinalList {
  frozen: boolean;
  campusCap: number;
  studentCount: number;
  events: {
    key: string;
    category: EventCategory;
    name: string;
    capacity: number;
    people: { id: string; name: string; studentId: string; department: string; semester: string; gender: string; photoUrl: string; teamRole: "main" | "sub" | null }[];
  }[];
  students: { uid: string; name: string; studentId: string; department: string; semester: string; photoUrl: string; events: string[] }[];
}

export default function FinalPage() {
  const { data, error, loading } = useApi<FinalList>("/api/admin/final");
  const download = useDownload();
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-8">
      <PageTitle kicker={data.frozen ? "Frozen" : "Live list — not frozen yet"} title="Final 50">
        <Btn onClick={() => download("/api/admin/final?format=csv-event", "converge26-final-by-event.csv")}>
          <Download size={14} /> By event (CSV)
        </Btn>
        <Btn onClick={() => download("/api/admin/final?format=csv-student", "converge26-final-by-student.csv")}>
          <Download size={14} /> By student (CSV)
        </Btn>
        <Btn onClick={() => window.print()} className="print:hidden">
          <Printer size={14} /> Print
        </Btn>
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
        <p className="display text-8xl tabular-nums">
          {data.studentCount}
          <span className="text-5xl text-ink-soft">/{data.campusCap}</span>
        </p>
        <p className="max-w-lg text-ink-soft">
          Students with at least one final selection. {data.frozen ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ink"><Lock size={14} /> Selections are frozen — this is the list to submit.</span>
          ) : (
            <>Freeze selections from <Link href="/admin" className="font-semibold text-ink underline">Overview</Link> once it&apos;s submitted.</>
          )}
        </p>
      </div>

      {!data.events.length && <p className="py-10 text-center text-ink-soft">No one has been selected yet.</p>}

      {data.events.map((g) => {
        const meta = CATEGORY_META[g.category];
        return (
          <section key={g.key} className="break-inside-avoid">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 className="display-md flex items-center gap-3 text-2xl">
                <span className={clsx("h-3 w-3", meta.bg)} aria-hidden /> {g.name}
              </h2>
              <p className="text-sm tabular-nums text-ink-soft">{g.people.length}/{g.capacity} seats</p>
            </div>
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {g.people.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-ink/10 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cldTransform(p.photoUrl, "c_fill,g_face,w_80,h_80,q_auto,f_auto")} alt="" className="h-10 w-10 shrink-0 border border-ink object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block text-xs text-ink-soft">{p.studentId} · {p.department} · Sem {p.semester} · {p.gender}</span>
                  </span>
                  {p.teamRole && <span className="label border border-ink px-1.5 py-0.5 text-[0.6rem]">{p.teamRole === "main" ? "Main" : "Sub"}</span>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
