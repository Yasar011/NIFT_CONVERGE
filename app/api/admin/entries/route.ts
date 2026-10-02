import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries } from "@/lib/server/entries";
import { entryId } from "@/lib/server/selection";
import { addEventsToStudent } from "@/lib/server/members";
import { getEventByKey, eventLabel } from "@/lib/events";
import { assertNotFrozen } from "@/lib/server/settings";
import { audit } from "@/lib/server/audit";
import type { RegistrationRecord } from "@/lib/api-types";

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const params = new URL(req.url).searchParams;
  const event = params.get("event");
  const category = admin.role === "club_admin" ? admin.club! : params.get("category");

  if (event) {
    assertClubAccess(admin, event.split(":")[0]);
    return ok({ entries: (await queryEntries("eventKey", event)).entries });
  }
  const { entries } = category ? await queryEntries("category", category) : await queryEntries(null);
  return ok({ entries });
});

/** Adds a registered student to an event (e.g. a sports admin adding a team member). */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<{ uid: string; eventKey: string }>(req);
  const event = getEventByKey(body.eventKey || "");
  if (!event || event.nonCompetitive) throw new HttpError(400, "Choose an event.");
  assertClubAccess(admin, event.category);
  await assertNotFrozen();

  const reg = await db.get<RegistrationRecord>(`registrations/${body.uid}`);
  if (!reg) throw new HttpError(404, "That student hasn't registered yet.");
  const added = await addEventsToStudent(reg, [body.eventKey], admin.email);
  if (!added.length) throw new HttpError(409, `${reg.fullName} is already in ${eventLabel(event)}.`);
  const id = entryId(reg.uid, body.eventKey);
  await audit(admin.email, "member.add", `Added ${reg.fullName} (${reg.studentId}) to ${eventLabel(event)}`, event.category);
  return ok({ ok: true, id });
});
