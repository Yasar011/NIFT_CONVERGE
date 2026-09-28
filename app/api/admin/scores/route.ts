import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db, keyOf } from "@/lib/server/rtdb";
import { audit } from "@/lib/server/audit";
import { queryEntries } from "@/lib/server/entries";
import { parseEntryId } from "@/lib/server/selection";
import { getEventByKey, eventLabel, criteriaFor, criterionKey } from "@/lib/events";
import type { EntryRecord, ScoreRow } from "@/lib/api-types";

// scores/{entryId}/{judgeKey} = { by, at, scores: { [criterion]: 0–10 } }
type Sheet = Record<string, { by: string; at: number; scores: Record<string, number> }>;

const total = (s: Record<string, number>) => Object.values(s).reduce((n, v) => n + v, 0);

/** Judging sheet for one event: my scores, the judges' average, and the ranking. */
export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const eventKey = new URL(req.url).searchParams.get("event") || "";
  const event = getEventByKey(eventKey);
  if (!event) throw new HttpError(400, "Choose an event.");
  assertClubAccess(admin, event.category);

  const { entries } = await queryEntries("eventKey", eventKey);
  const active = entries.filter((e) => e.status !== "locked");
  const sheets = await Promise.all(active.map((e) => db.get<Sheet>(`scores/${e.id}`)));
  const me = keyOf(admin.email);

  const rows: ScoreRow[] = active.map((e, i) => {
    const sheet = sheets[i] ?? {};
    const totals = Object.values(sheet).map((j) => total(j.scores ?? {}));
    return {
      entryId: e.id,
      uid: e.uid,
      name: e.student.name,
      studentId: e.student.studentId,
      department: e.student.department,
      photoUrl: e.student.photoUrl,
      status: e.status,
      mine: sheet[me]?.scores ?? null,
      judges: totals.length,
      average: totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null,
      rank: null,
    };
  });
  // Rank by average (ties share a rank); unscored students go last.
  const ranked = [...rows].filter((r) => r.average !== null).sort((a, b) => b.average! - a.average!);
  ranked.forEach((r, i) => {
    r.rank = i > 0 && ranked[i - 1].average === r.average ? ranked[i - 1].rank : i + 1;
  });
  return ok({ criteria: criteriaFor(event), max: 10, rows });
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<{ entryId: string; scores: Record<string, number> }>(req);
  const entry = await db.get<EntryRecord>(`entries/${body.entryId}`);
  if (!entry) throw new HttpError(404, "Entry not found.");
  assertClubAccess(admin, entry.category);
  const event = getEventByKey(parseEntryId(body.entryId).eventKey)!;
  const criteria = criteriaFor(event);

  const scores: Record<string, number> = {};
  for (const c of criteria) {
    const v = Number(body.scores?.[c]);
    if (!Number.isFinite(v) || v < 0 || v > 10) throw new HttpError(400, `Score "${c}" from 0 to 10.`);
    scores[criterionKey(c)] = Math.round(v * 2) / 2; // half-point steps
  }
  await db.set(`scores/${body.entryId}/${keyOf(admin.email)}`, { by: admin.email, at: Date.now(), scores });
  await audit(admin.email, "score", `Scored ${entry.student.name} in ${eventLabel(event)}: ${total(scores)}/${criteria.length * 10}`, entry.category);
  return ok({ ok: true });
});
