import { handle, ok } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries } from "@/lib/server/entries";
import { statId } from "@/lib/server/selection";
import { getEventByKey, eventLabel, capacityOf } from "@/lib/events";
import { CAMPUS_CAP, MAX_SELECTIONS } from "@/lib/registration-schema";
import type { Adjustment, VotingSession } from "@/lib/api-types";

type Sheet = Record<string, { scores: Record<string, number> }>;
type VoteMap = Record<string, Record<string, Record<string, { v: "good" | "reject" }>>>;

/**
 * Pending recommendations from club admins, with everything the main admin
 * needs to decide: seats left, the student's other selections, judges' scores
 * and public votes.
 */
export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const [{ entries, sel }, sessions, votes, adjust] = await Promise.all([
    queryEntries(null),
    db.get<Record<string, Omit<VotingSession, "id">>>("voting/sessions"),
    db.get<VoteMap>("voting/votes"),
    db.get<Record<string, Record<string, Omit<Adjustment, "id">>>>("voting/adjust"),
  ]);

  const pending = entries.filter((e) => e.recommendation?.state === "pending" && e.status !== "selected");
  const sheets = await Promise.all(pending.map((e) => db.get<Sheet>(`scores/${e.id}`)));

  const items = pending.map((e, i) => {
    const ev = getEventByKey(e.eventKey);
    const totals = Object.values(sheets[i] ?? {}).map((j) => Object.values(j.scores ?? {}).reduce((n, v) => n + v, 0));
    // Votes across every round of this event the student performed in.
    let good = 0;
    let reject = 0;
    for (const [sid, s] of Object.entries(sessions ?? {})) {
      if (s.eventKey !== e.eventKey) continue;
      for (const v of Object.values(votes?.[sid]?.[e.uid] ?? {})) {
        if (v.v === "good") good++;
        else reject++;
      }
      for (const a of Object.values(adjust?.[sid] ?? {})) {
        if (a.uid !== e.uid) continue;
        good += a.good;
        reject += a.reject;
      }
    }
    return {
      id: e.id,
      uid: e.uid,
      eventKey: e.eventKey,
      eventName: ev ? eventLabel(ev) : e.eventKey,
      category: e.category,
      status: e.status,
      student: {
        name: e.student.name,
        studentId: e.student.studentId,
        department: e.student.department,
        semester: e.student.semester,
        gender: e.student.gender,
        photoUrl: e.student.photoUrl,
      },
      recommendation: e.recommendation!,
      seats: { selected: sel.events?.[statId(e.eventKey)] ?? 0, capacity: ev ? capacityOf(ev) : 1 },
      studentSelected: sel.counts?.[e.uid] ?? 0,
      present: !!e.attendance?.present,
      score: totals.length ? { average: Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10, judges: totals.length } : null,
      votes: good || reject ? { good, reject } : null,
    };
  });

  items.sort((a, b) => a.eventKey.localeCompare(b.eventKey) || (b.score?.average ?? -1) - (a.score?.average ?? -1));
  return ok({
    items,
    campus: { selected: sel.campus ?? 0, cap: CAMPUS_CAP },
    maxPerStudent: MAX_SELECTIONS,
  });
});
