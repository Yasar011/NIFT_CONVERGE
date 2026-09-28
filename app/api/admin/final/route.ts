import { handle, ok } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { queryEntries } from "@/lib/server/entries";
import { readSettings } from "@/lib/server/settings";
import { PICKABLE_EVENTS, eventKey, eventLabel, capacityOf, getEventByKey } from "@/lib/events";
import { CAMPUS_CAP } from "@/lib/registration-schema";
import { CATEGORY_META } from "@/lib/types";
import type { EntryView } from "@/lib/api-types";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][], name: string) =>
  new Response("﻿" + rows.map((r) => r.map(cell).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
const role = (e: EntryView) => (e.teamRole === "sub" ? "Substitute" : e.teamRole === "main" ? "Main" : "");

/** The final contingent: everyone marked Selected, by event and by student. */
export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const format = new URL(req.url).searchParams.get("format");
  const [{ entries }, settings] = await Promise.all([queryEntries(null), readSettings()]);
  const selected = entries.filter((e) => e.status === "selected");

  const events = PICKABLE_EVENTS.map((ev) => {
    const key = eventKey(ev);
    const people = selected
      .filter((e) => e.eventKey === key)
      .sort((a, b) => (a.teamRole === "sub" ? 1 : 0) - (b.teamRole === "sub" ? 1 : 0) || a.student.name.localeCompare(b.student.name));
    return { key, category: ev.category, name: eventLabel(ev), capacity: capacityOf(ev), people };
  }).filter((e) => e.people.length);

  const byStudent = new Map<string, { entry: EntryView; events: string[] }>();
  for (const e of selected) {
    const ev = getEventByKey(e.eventKey);
    const cur = byStudent.get(e.uid) ?? { entry: e, events: [] };
    cur.events.push(ev ? eventLabel(ev) : e.eventKey);
    byStudent.set(e.uid, cur);
  }
  const students = [...byStudent.values()].sort((a, b) => a.entry.student.name.localeCompare(b.entry.student.name));

  if (format === "csv-event") {
    return csv(
      [
        ["Club", "Event", "Role", "Name", "Student ID", "Dept", "Sem", "Gender", "Email", "Phone"],
        ...events.flatMap((g) =>
          g.people.map((e) => [CATEGORY_META[g.category].label, g.name, role(e), e.student.name, e.student.studentId, e.student.department, e.student.semester, e.student.gender, e.student.email, e.student.phone])
        ),
      ],
      "converge26-final-by-event.csv"
    );
  }
  if (format === "csv-student") {
    return csv(
      [
        ["#", "Name", "Student ID", "Dept", "Sem", "Gender", "Email", "Phone", "Events"],
        ...students.map((s, i) => [i + 1, s.entry.student.name, s.entry.student.studentId, s.entry.student.department, s.entry.student.semester, s.entry.student.gender, s.entry.student.email, s.entry.student.phone, s.events.join("; ")]),
      ],
      "converge26-final-by-student.csv"
    );
  }

  return ok({
    frozen: settings.selectionFrozen,
    campusCap: CAMPUS_CAP,
    studentCount: students.length,
    events: events.map((g) => ({
      ...g,
      people: g.people.map((e) => ({
        id: e.id,
        name: e.student.name,
        studentId: e.student.studentId,
        department: e.student.department,
        semester: e.student.semester,
        gender: e.student.gender,
        photoUrl: e.student.photoUrl,
        teamRole: e.teamRole ?? null,
      })),
    })),
    students: students.map((s) => ({
      uid: s.entry.uid,
      name: s.entry.student.name,
      studentId: s.entry.student.studentId,
      department: s.entry.student.department,
      semester: s.entry.student.semester,
      photoUrl: s.entry.student.photoUrl,
      events: s.events,
    })),
  });
});
