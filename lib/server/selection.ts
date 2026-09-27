import { db } from "./rtdb";
import { HttpError } from "./http";
import { getEventByKey, capacityOf, eventLabel } from "../events";
import { CAMPUS_CAP, MAX_SELECTIONS, type EntryStatus } from "../registration-schema";

/**
 * All selection state lives under one small node, `/sel`, so a single
 * transaction can check and update every limit atomically:
 *   status/{entryId}  current status of each event entry
 *   prev/{entryId}    status to restore when an auto-lock is lifted
 *   counts/{uid}      how many events the student is selected for
 *   events/{statId}   how many students are selected for the event
 *   campus            how many distinct students are selected
 */
export interface SelState {
  status?: Record<string, EntryStatus>;
  prev?: Record<string, EntryStatus>;
  counts?: Record<string, number>;
  events?: Record<string, number>;
  campus?: number;
}

// Firebase UIDs are alphanumeric, so "_" safely separates the parts.
export const entryId = (uid: string, eventKey: string) => `${uid}_${eventKey.replace(":", "__")}`;
export const statId = (eventKey: string) => eventKey.replace(":", "__");
export const parseEntryId = (id: string) => {
  const i = id.indexOf("_");
  return { uid: id.slice(0, i), eventKey: id.slice(i + 1).replace("__", ":") };
};

export async function readSel(): Promise<SelState> {
  return (await db.get<SelState>("sel")) ?? {};
}

/**
 * Changes one entry's status and enforces every rule:
 *  - a student can be selected for at most 3 events — the rest lock,
 *  - an event can't take more students than the rulebook allows,
 *  - the campus can't send more than 50 students.
 * Returns the ids whose status changed (the entry plus any locked/unlocked).
 */
export async function setEntryStatus(id: string, next: EntryStatus): Promise<string[]> {
  if (next === "locked") throw new HttpError(400, "Locked is set automatically.");
  const { uid, eventKey } = parseEntryId(id);
  const event = getEventByKey(eventKey);
  const capacity = event ? capacityOf(event) : 1;
  let changed: string[] = [];

  await db.transaction<SelState>("sel", (cur) => {
    const s: Required<SelState> = {
      status: { ...(cur?.status ?? {}) },
      prev: { ...(cur?.prev ?? {}) },
      counts: { ...(cur?.counts ?? {}) },
      events: { ...(cur?.events ?? {}) },
      campus: cur?.campus ?? 0,
    };
    changed = [];
    const prev = s.status[id];
    if (!prev) throw new HttpError(404, "Entry not found.");
    if (prev === next) return undefined;
    if (prev === "locked") {
      throw new HttpError(409, "This student already has 3 selections. Unselect one of those first.");
    }

    const count = s.counts[uid] ?? 0;
    const sid = statId(eventKey);
    const siblings = Object.keys(s.status).filter((k) => k !== id && k.startsWith(`${uid}_`));

    if (next === "selected") {
      if (count >= MAX_SELECTIONS) throw new HttpError(409, "This student is already selected for 3 events.");
      if ((s.events[sid] ?? 0) >= capacity) {
        throw new HttpError(409, `${event ? eventLabel(event) : "This event"} is full — the rulebook allows ${capacity}.`);
      }
      if (count === 0 && s.campus >= CAMPUS_CAP) {
        throw new HttpError(409, `The campus limit of ${CAMPUS_CAP} students is reached.`);
      }
      s.status[id] = "selected";
      s.events[sid] = (s.events[sid] ?? 0) + 1;
      s.counts[uid] = count + 1;
      if (count === 0) s.campus += 1;
      changed.push(id);
      if (count + 1 === MAX_SELECTIONS) {
        for (const k of siblings) {
          const st = s.status[k];
          if (st === "selected" || st === "not_selected" || st === "locked") continue;
          s.prev[k] = st;
          s.status[k] = "locked";
          changed.push(k);
        }
      }
      return s;
    }

    s.status[id] = next;
    changed.push(id);
    if (prev === "selected") {
      s.events[sid] = Math.max(0, (s.events[sid] ?? 1) - 1);
      s.counts[uid] = Math.max(0, count - 1);
      if (count === 1) s.campus = Math.max(0, s.campus - 1);
      if (count === MAX_SELECTIONS) {
        for (const k of siblings) {
          if (s.status[k] !== "locked") continue;
          s.status[k] = s.prev[k] ?? "registered";
          delete s.prev[k];
          changed.push(k);
        }
      }
    }
    return s;
  });

  return changed;
}

/** Removes entries from selection state (only allowed when they aren't selected). */
export async function removeEntries(ids: string[]) {
  if (!ids.length) return;
  await db.transaction<SelState>("sel", (cur) => {
    const s = { ...(cur ?? {}), status: { ...(cur?.status ?? {}) }, prev: { ...(cur?.prev ?? {}) } };
    for (const id of ids) {
      if (s.status[id] === "selected") throw new HttpError(409, "Unselect the student before removing this event.");
      delete s.status[id];
      delete s.prev[id];
    }
    return s;
  });
}

/** Adds new entries as "registered" (or locked if the student already has 3 selections). */
export async function addEntries(uid: string, ids: string[]) {
  if (!ids.length) return;
  await db.transaction<SelState>("sel", (cur) => {
    const s = { ...(cur ?? {}), status: { ...(cur?.status ?? {}) }, prev: { ...(cur?.prev ?? {}) } };
    const full = (cur?.counts?.[uid] ?? 0) >= MAX_SELECTIONS;
    for (const id of ids) {
      if (s.status[id]) continue;
      if (full) {
        s.status[id] = "locked";
        s.prev[id] = "registered";
      } else s.status[id] = "registered";
    }
    return s;
  });
}
