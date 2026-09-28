import { handle, ok } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries } from "@/lib/server/entries";
import { PICKABLE_EVENTS, eventKey, eventLabel, capacityOf } from "@/lib/events";
import { DEPARTMENTS, SEMESTERS } from "@/lib/registration-schema";
import type { RegistrationRecord } from "@/lib/api-types";

const countBy = <T,>(items: T[], key: (t: T) => string, order?: readonly string[]) => {
  const m = new Map<string, number>();
  order?.forEach((k) => m.set(k, 0));
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value }));
};

/** Numbers for the stats page. Club admins get their club's slice only. */
export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const club = admin.role === "club_admin" ? admin.club! : null;
  const [{ entries }, regs, votes] = await Promise.all([
    club ? queryEntries("category", club) : queryEntries(null),
    db.get<Record<string, RegistrationRecord>>("registrations"),
    db.get<Record<string, Record<string, Record<string, unknown>>>>("voting/votes"),
  ]);

  // Students in scope: everyone (main admin) or those with an entry in the club.
  const inScope = new Set(entries.map((e) => e.uid));
  const students = Object.values(regs ?? {}).filter((r) => !club || inScope.has(r.uid));

  const events = PICKABLE_EVENTS.filter((e) => !club || e.category === club).map((ev) => {
    const key = eventKey(ev);
    const mine = entries.filter((e) => e.eventKey === key);
    const interested = mine.filter((e) => e.status !== "locked" && e.status !== "not_selected").length;
    return {
      key,
      label: eventLabel(ev),
      category: ev.category,
      interested,
      selected: mine.filter((e) => e.status === "selected").length,
      capacity: capacityOf(ev),
      present: mine.filter((e) => e.attendance?.present).length,
    };
  });

  const voteCount = Object.values(votes ?? {}).reduce(
    (n, byPerformer) => n + Object.values(byPerformer ?? {}).reduce((m, voters) => m + Object.keys(voters ?? {}).length, 0),
    0
  );

  return ok({
    scope: club ?? "all",
    students: students.length,
    entries: entries.length,
    present: entries.filter((e) => e.attendance?.present).length,
    votes: voteCount,
    byDepartment: countBy(students, (s) => s.department, DEPARTMENTS),
    bySemester: countBy(students, (s) => `Sem ${s.semester}`, SEMESTERS.map((s) => `Sem ${s}`)),
    byGender: countBy(students, (s) => s.gender),
    byStatus: countBy(entries, (e) => e.status),
    events: events.sort((a, b) => b.interested / b.capacity - a.interested / a.capacity),
  });
});
