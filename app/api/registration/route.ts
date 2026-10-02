import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db, keyOf } from "@/lib/server/rtdb";
import { assertOwnMedia } from "@/lib/server/cloudinary";
import { readSettings } from "@/lib/server/settings";
import { readDeadlines, fmtDeadline } from "@/lib/server/deadlines";
import { getEventByKey, eventLabel } from "@/lib/events";
import { isRegistrationOpen } from "@/lib/settings-shared";
import { audit } from "@/lib/server/audit";
import { entriesFor } from "@/lib/server/entries";
import { addEntries } from "@/lib/server/selection";
import {
  validateRegistration,
  normaliseStudentId,
  PICK_SLOTS,
  type RegistrationInput,
} from "@/lib/registration-schema";
import type { RegistrationRecord } from "@/lib/api-types";

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const settings = await readSettings();
  if (!isRegistrationOpen(settings)) throw new HttpError(403, "Registration is not open right now.");

  const input = await readJson<RegistrationInput>(req);
  const errors = validateRegistration(input);
  // An event stops taking registrations once its first trial starts.
  const deadlines = await readDeadlines();
  for (const slot of PICK_SLOTS) {
    const key = input.picks?.[slot];
    const d = key ? deadlines[key] : undefined;
    if (d && Date.now() >= d.at) {
      const ev = getEventByKey(key);
      errors[slot] = `${ev ? eventLabel(ev) : "This event"} closed when its trial started (${fmtDeadline(d)}).`;
    }
  }
  if (Object.keys(errors).length) throw new HttpError(422, "Please fix the highlighted fields.", errors);

  const photo = assertOwnMedia(input.photo, "photo");
  if (photo.publicId !== `converge26/profiles/${user.uid}`) throw new HttpError(400, "Upload your photo again.");

  const studentId = normaliseStudentId(input.studentId);
  const record: RegistrationRecord = {
    uid: user.uid,
    email: user.email,
    fullName: input.fullName.trim(),
    studentId,
    department: input.department,
    semester: input.semester,
    gender: input.gender,
    phone: input.phone.replace(/\D/g, "").slice(-10),
    residence: input.residence,
    photo,
    picks: Object.fromEntries(PICK_SLOTS.map((s) => [s, input.picks[s] || ""])) as RegistrationRecord["picks"],
    createdAt: Date.now(),
  };

  // One registration per account…
  if (!(await db.create(`registrations/${user.uid}`, record))) {
    throw new HttpError(409, "You have already registered.");
  }
  // …and one account per student ID.
  try {
    await db.transaction<string>(`studentIds/${keyOf(studentId)}`, (cur) => {
      if (cur && cur !== user.uid) throw new HttpError(409, "This student ID is already registered by another account.", { studentId: "Already registered." });
      return user.uid;
    });
  } catch (e) {
    await db.remove(`registrations/${user.uid}`);
    throw e;
  }

  const entries = entriesFor(record);
  await db.update("entries", entries);
  await addEntries(user.uid, Object.keys(entries));
  await audit(user.email, "register", `${record.fullName} (${studentId}) registered for ${Object.keys(entries).length} events`);
  return ok({ ok: true });
});
