import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries, snapshotOf } from "@/lib/server/entries";
import { addEntries, entryId } from "@/lib/server/selection";
import { getEventByKey, genderRequirement, eventLabel } from "@/lib/events";
import { MAX_EVENTS, pickedKeys, picksFrom } from "@/lib/registration-schema";
import type { EntryRecord, RegistrationRecord } from "@/lib/api-types";
import type { EventCategory } from "@/lib/types";

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

  const reg = await db.get<RegistrationRecord>(`registrations/${body.uid}`);
  if (!reg) throw new HttpError(404, "That student hasn't registered yet.");
  const keys = pickedKeys(reg.picks).map((p) => p.key);
  if (keys.includes(body.eventKey)) throw new HttpError(409, `${reg.fullName} is already in ${eventLabel(event)}.`);
  if (keys.length >= MAX_EVENTS) {
    throw new HttpError(409, `${reg.fullName} already has ${MAX_EVENTS} events. Remove one first.`);
  }
  const need = genderRequirement(event);
  if (need && reg.gender !== need) {
    throw new HttpError(409, `${eventLabel(event)} is for ${need === "Male" ? "boys" : "girls"} only.`);
  }

  const picks = picksFrom([...keys, body.eventKey]);
  const slot = pickedKeys(picks).find((p) => p.key === body.eventKey)!.slot;
  const id = entryId(reg.uid, body.eventKey);
  const now = Date.now();
  const entry: EntryRecord = {
    uid: reg.uid,
    eventKey: body.eventKey,
    category: event.category as EventCategory,
    slot,
    student: snapshotOf(reg),
    attendance: null,
    video: null,
    createdAt: now,
    updatedAt: now,
    updatedBy: admin.email,
  };
  await db.update("", {
    [`entries/${id}`]: { ...entry, addedBy: admin.email },
    [`registrations/${reg.uid}/picks`]: picks,
    [`registrations/${reg.uid}/updatedAt`]: now,
  });
  await addEntries(reg.uid, [id]);
  return ok({ ok: true, id });
});
