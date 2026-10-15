import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSettings } from "@/lib/server/settings";
import { readDeadlines, fmtDeadline } from "@/lib/server/deadlines";
import { snapshotOf } from "@/lib/server/entries";
import { addEntries, removeEntries, entryId, readSel } from "@/lib/server/selection";
import { assertEventFor } from "@/lib/server/members";
import { audit } from "@/lib/server/audit";
import { isRegistrationOpen } from "@/lib/settings-shared";
import { getEventByKey, eventLabel } from "@/lib/events";
import { PICK_SLOTS, REQUIRED_SLOTS, SLOT_LABEL, type PickSlot } from "@/lib/registration-schema";
import type { EntryRecord, RegistrationRecord } from "@/lib/api-types";
import type { EventCategory } from "@/lib/types";

const label = (key: string) => {
  const ev = getEventByKey(key);
  return ev ? eventLabel(ev) : key;
};

/**
 * Students fill an empty event slot, or change / clear Event 4 and Event 5,
 * while registration is open and before the events' first trials start.
 * Event 1–3 stay with the main admin once chosen.
 */
export const PUT = handle(async (req: Request) => {
  const user = await requireUser(req);
  const body = await readJson<{ slot: PickSlot; eventKey: string }>(req);
  const slot = body.slot;
  const next = (body.eventKey || "").trim();
  if (!PICK_SLOTS.includes(slot)) throw new HttpError(400, "Choose an event slot.");

  const [reg, settings, deadlines] = await Promise.all([
    db.get<RegistrationRecord>(`registrations/${user.uid}`),
    readSettings(),
    readDeadlines(),
  ]);
  if (!reg) throw new HttpError(404, "Register first.");
  // Local e2e tests only: never true on Vercel (NODE_ENV is "production" there).
  const forceOpen = process.env.NODE_ENV !== "production" && process.env.E2E_FORCE_OPEN === "1";
  if (!isRegistrationOpen(settings) && !forceOpen) throw new HttpError(403, "Registration is closed, so events can't be changed now.");

  const current = reg.picks?.[slot] || "";
  if (current === next) return ok({ ok: true });
  if (current && REQUIRED_SLOTS.includes(slot)) {
    throw new HttpError(403, `${SLOT_LABEL[slot]} can only be changed by the main admin.`);
  }
  if (!current && !next) return ok({ ok: true });

  const closed = (key: string) => {
    const d = deadlines[key];
    return d && Date.now() >= d.at ? d : null;
  };

  // The event being replaced must still be open and untouched by the club.
  if (current) {
    const d = closed(current);
    if (d) throw new HttpError(409, `${label(current)} closed when its trial started (${fmtDeadline(d)}), so it can't be changed.`);
    const status = (await readSel()).status?.[entryId(user.uid, current)];
    if (status && status !== "registered" && status !== "locked") {
      throw new HttpError(409, `The ${label(current)} team has already reviewed you, so it can't be changed.`);
    }
  }

  if (next) {
    assertEventFor(reg, next);
    if (Object.entries(reg.picks ?? {}).some(([s, k]) => s !== slot && k === next)) {
      throw new HttpError(409, `You already have ${label(next)}.`);
    }
    const d = closed(next);
    if (d) throw new HttpError(409, `${label(next)} closed when its trial started (${fmtDeadline(d)}).`);
  }

  const now = Date.now();
  const picks = { ...Object.fromEntries(PICK_SLOTS.map((s) => [s, reg.picks?.[s] || ""])), [slot]: next } as RegistrationRecord["picks"];
  const updates: Record<string, unknown> = {
    [`registrations/${user.uid}/picks`]: picks,
    [`registrations/${user.uid}/updatedAt`]: now,
  };
  if (current) {
    await removeEntries([entryId(user.uid, current)]); // refuses if they were selected meanwhile
    updates[`entries/${entryId(user.uid, current)}`] = null;
  }
  if (next) {
    const event = getEventByKey(next)!;
    const entry: EntryRecord = {
      uid: user.uid,
      eventKey: next,
      category: event.category as EventCategory,
      slot,
      student: snapshotOf({ ...reg, picks }),
      attendance: null,
      video: null,
      createdAt: now,
      updatedAt: now,
      updatedBy: user.email,
    };
    updates[`entries/${entryId(user.uid, next)}`] = entry;
  }
  await db.update("", updates);
  if (next) await addEntries(user.uid, [entryId(user.uid, next)]);

  const what = !current ? `added ${label(next)}` : !next ? `removed ${label(current)}` : `changed ${label(current)} → ${label(next)}`;
  await audit(user.email, "register", `${reg.fullName}: ${SLOT_LABEL[slot]} ${what}`);
  return ok({ ok: true });
});
