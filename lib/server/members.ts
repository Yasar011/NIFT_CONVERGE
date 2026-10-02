import crypto from "node:crypto";
import { db } from "./rtdb";
import { HttpError } from "./http";
import { snapshotOf } from "./entries";
import { addEntries, entryId } from "./selection";
import { getEventByKey, genderRequirement, eventLabel } from "../events";
import { MAX_EVENTS, pickedKeys, picksFrom } from "../registration-schema";
import type { EntryRecord, RegistrationRecord } from "../api-types";
import type { EventCategory } from "../types";

/** Checks an event can take this student (exists, pickable, right gender). */
export function assertEventFor(reg: Pick<RegistrationRecord, "gender" | "fullName">, eventKey: string) {
  const event = getEventByKey(eventKey);
  if (!event || event.nonCompetitive) throw new HttpError(400, "Choose a valid event.");
  const need = genderRequirement(event);
  if (need && reg.gender !== need) {
    throw new HttpError(409, `${eventLabel(event)} is for ${need === "Male" ? "boys" : "girls"} only.`);
  }
  return event;
}

/**
 * Adds events to a registered student: updates their picks (Event 1–5),
 * creates the entries and registers them in selection state.
 * Returns the event keys actually added (ones they already have are skipped).
 */
export async function addEventsToStudent(reg: RegistrationRecord, eventKeys: string[], by: string) {
  const have = pickedKeys(reg.picks).map((p) => p.key);
  const fresh = [...new Set(eventKeys)].filter((k) => !have.includes(k));
  if (!fresh.length) return [];
  if (have.length + fresh.length > MAX_EVENTS) {
    throw new HttpError(409, `${reg.fullName} already has ${have.length} event(s) — the limit is ${MAX_EVENTS}.`);
  }
  for (const k of fresh) assertEventFor(reg, k);

  const picks = picksFrom([...have, ...fresh]);
  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`registrations/${reg.uid}/picks`]: picks,
    [`registrations/${reg.uid}/updatedAt`]: now,
  };
  const ids: string[] = [];
  for (const { slot, key } of pickedKeys(picks)) {
    if (!fresh.includes(key)) continue;
    const event = getEventByKey(key)!;
    const id = entryId(reg.uid, key);
    ids.push(id);
    const entry: EntryRecord & { addedBy: string } = {
      uid: reg.uid,
      eventKey: key,
      category: event.category as EventCategory,
      slot,
      student: snapshotOf({ ...reg, picks }),
      attendance: null,
      video: null,
      createdAt: now,
      updatedAt: now,
      updatedBy: by,
      addedBy: by,
    };
    updates[`entries/${id}`] = entry;
  }
  await db.update("", updates);
  await addEntries(reg.uid, ids);
  return fresh;
}

/** Site id for a student who hasn't signed in yet (alphanumeric like Firebase uids). */
export function newStudentId() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(27);
  return "M" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Initials avatar, used until a real photo is uploaded. */
export function initialsPhoto(name: string) {
  const ini = name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase() || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#e9dec9'/><text x='50' y='50' dy='.35em' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-weight='700' font-size='38' fill='#564c40'>${ini}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
