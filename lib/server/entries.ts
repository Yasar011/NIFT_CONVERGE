import { db } from "./rtdb";
import { readSel, entryId, type SelState } from "./selection";
import type { EntryRecord, EntryView, RegistrationRecord, StudentSnapshot } from "../api-types";
import { pickedKeys } from "../registration-schema";
import { getEventByKey } from "../events";
import type { EventCategory } from "../types";

export function snapshotOf(reg: RegistrationRecord): StudentSnapshot {
  return {
    name: reg.fullName,
    studentId: reg.studentId,
    department: reg.department,
    semester: reg.semester,
    gender: reg.gender,
    email: reg.email,
    phone: reg.phone,
    residence: reg.residence,
    photoUrl: reg.photo?.url ?? "",
  };
}

/** Entry documents for a registration's picks, keyed by entry id. */
export function entriesFor(reg: RegistrationRecord, now = Date.now()) {
  const out: Record<string, EntryRecord> = {};
  for (const { slot, key } of pickedKeys(reg.picks)) {
    const event = getEventByKey(key)!;
    out[entryId(reg.uid, key)] = {
      uid: reg.uid,
      eventKey: key,
      category: event.category as EventCategory,
      slot,
      student: snapshotOf(reg),
      attendance: null,
      video: null,
      createdAt: now,
    };
  }
  return out;
}

export function withStatus(map: Record<string, EntryRecord> | null, sel: SelState): EntryView[] {
  return Object.entries(map ?? {}).map(([id, e]) => ({ ...e, id, status: sel.status?.[id] ?? "registered" }));
}

export async function queryEntries(field: "uid" | "category" | "eventKey" | null, value?: string) {
  const [map, sel] = await Promise.all([
    field ? db.get<Record<string, EntryRecord>>("entries", { orderBy: field, equalTo: value }) : db.get<Record<string, EntryRecord>>("entries"),
    readSel(),
  ]);
  return { entries: withStatus(map, sel), sel };
}
