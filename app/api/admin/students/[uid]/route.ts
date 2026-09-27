import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db, keyOf } from "@/lib/server/rtdb";
import { assertOwnMedia } from "@/lib/server/cloudinary";
import { entriesFor, queryEntries, snapshotOf } from "@/lib/server/entries";
import { addEntries, removeEntries, entryId } from "@/lib/server/selection";
import {
  validateRegistration,
  normaliseStudentId,
  pickedKeys,
  PICK_SLOTS,
  type RegistrationInput,
} from "@/lib/registration-schema";
import type { RegistrationRecord } from "@/lib/api-types";

type Ctx = { params: Promise<{ uid: string }> };

async function load(uid: string) {
  const reg = await db.get<RegistrationRecord>(`registrations/${uid}`);
  if (!reg) throw new HttpError(404, "Registration not found.");
  return reg;
}

export const GET = handle(async (req: Request, ctx: Ctx) => {
  await requireMainAdmin(req);
  const { uid } = await ctx.params;
  const [registration, { entries, sel }] = await Promise.all([load(uid), queryEntries("uid", uid)]);
  return ok({ registration, entries, selectedCount: sel.counts?.[uid] ?? 0 });
});

/** Main admin edits a student's details and/or event picks. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const admin = await requireMainAdmin(req);
  const { uid } = await ctx.params;
  const old = await load(uid);
  const input = await readJson<RegistrationInput>(req);
  const errors = validateRegistration({ ...input, rulesAcknowledged: true, selectionAcknowledged: true });
  if (Object.keys(errors).length) throw new HttpError(422, "Please fix the highlighted fields.", errors);

  const studentId = normaliseStudentId(input.studentId);
  const photo = input.photo?.url === old.photo?.url ? old.photo : assertOwnMedia(input.photo, "photo");
  const next: RegistrationRecord = {
    ...old,
    fullName: input.fullName.trim(),
    studentId,
    department: input.department,
    semester: input.semester,
    gender: input.gender,
    phone: input.phone.replace(/\D/g, "").slice(-10),
    residence: input.residence,
    photo,
    picks: Object.fromEntries(PICK_SLOTS.map((s) => [s, input.picks[s] || ""])) as RegistrationRecord["picks"],
    updatedAt: Date.now(),
  };

  if (studentId !== old.studentId) {
    await db.transaction<string>(`studentIds/${keyOf(studentId)}`, (cur) => {
      if (cur && cur !== uid) {
        throw new HttpError(409, "Another student already uses this ID.", { studentId: "Already registered." });
      }
      return uid;
    });
    await db.remove(`studentIds/${keyOf(old.studentId)}`);
  }

  const oldIds = new Set(pickedKeys(old.picks).map((p) => entryId(uid, p.key)));
  const fresh = entriesFor(next);
  const removed = [...oldIds].filter((id) => !fresh[id]);
  const added = Object.keys(fresh).filter((id) => !oldIds.has(id));

  await removeEntries(removed); // refuses if a removed event is already "selected"

  const updates: Record<string, unknown> = { [`registrations/${uid}`]: next };
  for (const id of removed) updates[`entries/${id}`] = null;
  for (const id of added) updates[`entries/${id}`] = fresh[id];
  const snap = snapshotOf(next);
  for (const id of Object.keys(fresh)) {
    if (!oldIds.has(id)) continue;
    updates[`entries/${id}/student`] = snap;
    updates[`entries/${id}/slot`] = fresh[id].slot;
    updates[`entries/${id}/updatedBy`] = admin.email;
  }
  await db.update("", updates);
  await addEntries(uid, added);
  return ok({ ok: true });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  await requireMainAdmin(req);
  const { uid } = await ctx.params;
  const reg = await load(uid);
  const ids = pickedKeys(reg.picks).map((p) => entryId(uid, p.key));
  await removeEntries(ids); // refuses if any event is "selected"
  const updates: Record<string, unknown> = {
    [`registrations/${uid}`]: null,
    [`studentIds/${keyOf(reg.studentId)}`]: null,
  };
  for (const id of ids) updates[`entries/${id}`] = null;
  await db.update("", updates);
  return ok({ ok: true });
});
