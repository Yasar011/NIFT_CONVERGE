"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import clsx from "clsx";
import { ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import { MAX_SELECTIONS, cldTransform, pickedKeys } from "@/lib/registration-schema";
import type { RegistrationRecord } from "@/lib/api-types";

type Student = RegistrationRecord & { selectedCount: number };

export default function StudentsPage() {
  const { data, error, loading } = useApi<{ students: Student[] }>("/api/admin/students");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data?.students ?? []).filter(
      (s) => !n || s.fullName.toLowerCase().includes(n) || s.studentId.toLowerCase().includes(n) || s.email.includes(n)
    );
  }, [data, q]);

  return (
    <div className="space-y-6">
      <PageTitle kicker="Main admin" title="Students" />
      <label className="relative block max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <span className="sr-only">Search students</span>
        <input className={clsx(inputCls, "pl-9")} placeholder="Name, student ID or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <p className="label text-ink-soft">{rows.length} students</p>
          <ul className="border-t-2 border-ink">
            {rows.map((s) => (
              <li key={s.uid}>
                <Link href={`/admin/students/${s.uid}`} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-ink/15 py-3 hover:bg-paper-2 sm:px-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cldTransform(s.photo?.url, "c_fill,g_face,w_112,h_112,q_auto,f_auto")} alt="" className="h-14 w-14 border-2 border-ink object-cover" />
                  <span className="min-w-0">
                    <span className="display-md block truncate text-2xl">{s.fullName}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {s.studentId} · {s.department} · Sem {s.semester} · {pickedKeys(s.picks).length} events
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={clsx("label border-2 px-2 py-0.5 text-[0.65rem]", s.selectedCount ? "border-peacock bg-peacock text-paper" : "border-ink/30 text-ink-soft")}>
                      {s.selectedCount}/{MAX_SELECTIONS} selected
                    </span>
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              </li>
            ))}
            {!rows.length && <li className="py-10 text-center text-ink-soft">No students yet.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
