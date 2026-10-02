import { after } from "next/server";
import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { setEntryStatus, entryId, readSel, parseEntryId } from "@/lib/server/selection";
import { assertNotFrozen } from "@/lib/server/settings";
import { checkFinalPassword } from "@/lib/server/final-password";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/push";
import type { RegistrationRecord } from "@/lib/api-types";
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
        uid: e.uid,
        registered: entries.filter((x) => x.uid === e.uid).map((x) => x.eventKey),
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

type Manage =
  | { action: "remove"; entryId: string; finalPassword: string }
  | { action: "move"; entryId: string; toEvent: string; finalPassword: string }
  | { action: "add"; uid: string; eventKey: string; finalPassword: string };

const label = (key: string) => {
  const ev = getEventByKey(key);
  return ev ? eventLabel(ev) : key;
};

/** Final selections only go to events the student registered for themselves. */
async function ownEntry(reg: RegistrationRecord, key: string) {
  const id = entryId(reg.uid, key);
  const status = (await readSel()).status?.[id];
  if (!status) {
    throw new HttpError(409, `${reg.fullName} didn't register for ${label(key)}, so they can't be placed there. Choose one of their own events.`);
  }
  return id;
}

/**
 * Manage the final list directly: remove someone from an event, move them to
 * another event, or add a registered student to an event's final list.
 * Every change still goes through the selection engine (3-event rule, seats,
 * 50 cap) and needs the final-selection password.
 */
export const POST = handle(async (req: Request) => {
  const admin = await requireMainAdmin(req);
  const body = await readJson<Manage>(req);
  checkFinalPassword(body.finalPassword);
  await assertNotFrozen();

  if (body.action === "remove") {
    const sel = await readSel();
    if (sel.status?.[body.entryId] !== "selected") throw new HttpError(409, "That student isn't on the final list for this event.");
    const { eventKey } = parseEntryId(body.entryId);
    const entry = await db.get<{ student: { name: string } }>(`entries/${body.entryId}`);
    await setEntryStatus(body.entryId, "shortlisted");
    await db.update(`entries/${body.entryId}`, { finalBy: null, finalAt: null, updatedAt: Date.now(), updatedBy: admin.email });
    await audit(admin.email, "final", `${entry?.student.name ?? "Student"}: removed from the final list for ${label(eventKey)} (back to Shortlisted)`);
    return ok({ ok: true });
  }

  if (body.action === "add") {
    const reg = await db.get<RegistrationRecord>(`registrations/${body.uid}`);
    if (!reg) throw new HttpError(404, "That student isn't registered.");
    const id = await ownEntry(reg, body.eventKey);
    if ((await readSel()).status?.[id] === "selected") throw new HttpError(409, `${reg.fullName} is already final for ${label(body.eventKey)}.`);
    await setEntryStatus(id, "selected"); // 3-event rule, seats and 50 cap enforced here
    await db.update(`entries/${id}`, { finalBy: admin.email, finalAt: Date.now(), recommendation: null, updatedAt: Date.now(), updatedBy: admin.email });
    await audit(admin.email, "final", `${reg.fullName}: added to the final list for ${label(body.eventKey)}`);
    after(() => notify({ uids: [reg.uid] }, { title: "🎉 You're selected for Converge!", body: `${label(body.eventKey)} — congratulations from NIFT Jodhpur.`, url: "/me", tag: `status-${id}` }));
    return ok({ ok: true });
  }

  if (body.action === "move") {
    const { uid, eventKey: from } = parseEntryId(body.entryId);
    if (from === body.toEvent) throw new HttpError(400, "Choose a different event.");
    if ((await readSel()).status?.[body.entryId] !== "selected") throw new HttpError(409, "That student isn't on the final list for this event.");
    const reg = await db.get<RegistrationRecord>(`registrations/${uid}`);
    if (!reg) throw new HttpError(404, "That student isn't registered.");
    if (!getEventByKey(body.toEvent)) throw new HttpError(400, "Choose a valid event.");

    // Free the old slot first (so a student with 3 selections can move), then select the new one.
    await setEntryStatus(body.entryId, "shortlisted");
    try {
      const target = await ownEntry(reg, body.toEvent);
      await setEntryStatus(target, "selected");
      const now = Date.now();
      await db.update("", {
        [`entries/${body.entryId}/finalBy`]: null,
        [`entries/${body.entryId}/finalAt`]: null,
        [`entries/${target}/finalBy`]: admin.email,
        [`entries/${target}/finalAt`]: now,
        [`entries/${target}/recommendation`]: null,
      });
      await audit(admin.email, "final", `${reg.fullName}: moved on the final list from ${label(from)} to ${label(body.toEvent)}`);
      after(() => notify({ uids: [uid] }, { title: "🔁 Your Converge event changed", body: `You're now selected for ${label(body.toEvent)} (instead of ${label(from)}).`, url: "/me", tag: `move-${uid}` }));
      return ok({ ok: true });
    } catch (e) {
      // Couldn't take the new event (full, gender, 5-event limit…): put them back where they were.
      await setEntryStatus(body.entryId, "selected").catch(() => {});
      throw e;
    }
  }

  throw new HttpError(400, "Unknown action.");
});
