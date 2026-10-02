import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, requireMainAdmin, assertClubAccess, isAllowedEmail } from "@/lib/server/auth";
import { db, keyOf, forget } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import { assertNotFrozen } from "@/lib/server/settings";
import { audit } from "@/lib/server/audit";
import { addEventsToStudent, assertEventFor, initialsPhoto, newStudentId } from "@/lib/server/members";
import { getEventByKey, eventLabel } from "@/lib/events";
import {
  MAX_EVENTS,
  normaliseStudentId,
  picksFrom,
  validateRegistration,
  EMPTY_REGISTRATION,
} from "@/lib/registration-schema";
import type { RegistrationRecord } from "@/lib/api-types";

export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const [regs, sel] = await Promise.all([db.get<Record<string, RegistrationRecord>>("registrations"), readSel()]);
  const students = Object.values(regs ?? {})
    .map((r) => ({ ...r, selectedCount: sel.counts?.[r.uid] ?? 0 }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return ok({ students });
});

interface ManualStudent {
  email: string;
  fullName: string;
  studentId: string;
  department: string;
  semester: string;
  gender: string;
  phone?: string;
  residence?: string;
  events: string[];
}

/**
 * Club admins and the main admin add a student by NIFT email and put them in
 * events — no self-registration needed. If the email is already registered,
 * the events are added to that registration instead.
 */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<ManualStudent>(req);
  const email = (body.email || "").trim().toLowerCase();
  if (!isAllowedEmail(email)) throw new HttpError(422, "Use the student's NIFT email.", { email: "Use a @nift.ac.in email." });

  const events = [...new Set(Array.isArray(body.events) ? body.events : [])].filter(Boolean);
  if (!events.length) throw new HttpError(422, "Choose at least one event.", { events: "Choose at least one event." });
  if (events.length > MAX_EVENTS) throw new HttpError(422, `At most ${MAX_EVENTS} events.`);
  for (const k of events) {
    const ev = getEventByKey(k);
    if (!ev || ev.nonCompetitive) throw new HttpError(400, "Choose a valid event.");
    assertClubAccess(admin, ev.category); // club admins: only their own club's events
  }
  await assertNotFrozen();

  // Already registered (themselves or by another admin)? Just add the events.
  const found = await db.get<Record<string, RegistrationRecord>>("registrations", { orderBy: "email", equalTo: email });
  const existing = Object.values(found ?? {})[0];
  if (existing) {
    const added = await addEventsToStudent(existing, events, admin.email);
    await audit(
      admin.email,
      "member.add",
      `Added ${existing.fullName} (${existing.studentId}) to ${added.map((k) => eventLabel(getEventByKey(k)!)).join(", ") || "no new events"}`,
      admin.club
    );
    return ok({ existing: true, uid: existing.uid, added: added.length, name: existing.fullName });
  }

  // New student: validate details with the same rules as the form (photo/phone optional for admins).
  const studentId = normaliseStudentId(body.studentId || "");
  const input = {
    ...EMPTY_REGISTRATION,
    fullName: body.fullName || "",
    studentId,
    department: body.department,
    semester: body.semester,
    gender: body.gender,
    phone: body.phone || "",
    residence: body.residence || "",
    photo: { url: initialsPhoto(body.fullName || "?"), publicId: "", cloud: "" },
    picks: picksFrom(events),
  };
  const errors = validateRegistration(input, { admin: true });
  if (Object.keys(errors).length) throw new HttpError(422, "Please fix the highlighted fields.", errors);
  for (const k of events) assertEventFor({ gender: input.gender, fullName: input.fullName }, k);

  // Use their real account id if they've signed in before; otherwise a site id
  // that their Google sign-in maps to later (see aliasFor in auth).
  const signedIn = await db.get<Record<string, unknown>>("users", { orderBy: "email", equalTo: email });
  const priorAlias = await db.get<string>(`aliases/${keyOf(email)}`);
  const realUid = Object.keys(signedIn ?? {})[0];
  const uid = priorAlias ?? realUid ?? newStudentId();

  const record: RegistrationRecord = {
    uid,
    email,
    fullName: input.fullName.trim(),
    studentId,
    department: input.department,
    semester: input.semester,
    gender: input.gender,
    phone: input.phone.replace(/\D/g, "").slice(-10),
    residence: input.residence,
    photo: input.photo,
    picks: picksFrom([]),
    createdAt: Date.now(),
  };
  if (!(await db.create(`registrations/${uid}`, { ...record, addedBy: admin.email }))) {
    throw new HttpError(409, "This student is already registered.");
  }
  try {
    await db.transaction<string>(`studentIds/${keyOf(studentId)}`, (cur) => {
      if (cur && cur !== uid) throw new HttpError(409, "This student ID is already registered.", { studentId: "Already registered." });
      return uid;
    });
  } catch (e) {
    await db.remove(`registrations/${uid}`);
    throw e;
  }
  if (!realUid && !priorAlias) {
    await db.set(`aliases/${keyOf(email)}`, uid);
    forget(`alias:${email}`);
  }

  const added = await addEventsToStudent({ ...record, picks: picksFrom([]) }, events, admin.email);
  await audit(
    admin.email,
    "student.add",
    `Added new student ${record.fullName} (${studentId}, ${email}) to ${added.map((k) => eventLabel(getEventByKey(k)!)).join(", ")}`,
    admin.club
  );
  return ok({ existing: false, uid, added: added.length, name: record.fullName });
});
