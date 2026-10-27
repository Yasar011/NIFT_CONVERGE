import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser, touchUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries } from "@/lib/server/entries";
import { readSettings } from "@/lib/server/settings";
import { isRegistrationOpen } from "@/lib/settings-shared";
import { getDeadlines, fmtDeadline } from "@/lib/server/deadlines";
import { assertOwnMedia } from "@/lib/server/cloudinary";
import { audit } from "@/lib/server/audit";
import { normaliseStay, validateStay, type MediaRef } from "@/lib/registration-schema";
import type { Announcement, MeResponse, RegistrationRecord, Trial } from "@/lib/api-types";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const [registration, { entries, sel }, settings, allNotices, allTrials, deadlines] = await Promise.all([
    db.get<RegistrationRecord>(`registrations/${user.uid}`),
    queryEntries("uid", user.uid),
    readSettings(),
    db.get<Record<string, Omit<Announcement, "id">>>("announcements"),
    db.get<Record<string, Record<string, Omit<Trial, "id">>>>("trials"),
    getDeadlines(),
    touchUser(user),
  ]);

  // Only what's relevant to this student: everyone, their clubs, their events.
  const myEvents = new Set(entries.filter((e) => e.status !== "not_selected").map((e) => e.eventKey));
  const myClubs = new Set(entries.map((e) => `club:${e.category}`));
  const announcements = Object.entries(allNotices ?? {})
    .map(([id, a]) => ({ ...a, id }))
    .filter(
      (a) =>
        a.audience === "all" ||
        myClubs.has(a.audience) ||
        myEvents.has(a.audience) ||
        (a.audience === "students" && !!a.uids?.includes(user.uid))
    )
    // Never send the list of other students' ids to the browser.
    .map((a) => ({ ...a, uids: undefined }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 20);
  const trials = Object.values(allTrials ?? {})
    .flatMap((byEvent) => Object.entries(byEvent ?? {}).map(([id, t]) => ({ ...t, id })))
    .filter((t) => myEvents.has(t.eventKey))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const body: MeResponse = {
    user,
    registration,
    entries,
    selectedCount: sel.counts?.[user.uid] ?? 0,
    registrationOpen: isRegistrationOpen(settings),
    announcements,
    trials,
    kitLocked: settings.selectionFrozen,
    closedEvents: Object.fromEntries(
      Object.entries(deadlines).filter(([, d]) => Date.now() >= d.at).map(([k, d]) => [k, fmtDeadline(d)])
    ),
  };
  return ok(body);
});

/**
 * Students update their own contact details: mobile, where they stay
 * (hostel + room, or day scholar) and photo. Name, ID, department, semester,
 * gender and events stay with the admins.
 */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser(req);
  const reg = await db.get<RegistrationRecord>(`registrations/${user.uid}`);
  if (!reg) throw new HttpError(404, "Register first.");
  const body = await readJson<{ phone?: string; residence?: string; hostel?: string; room?: string; photo?: MediaRef }>(req);

  const errors: Record<string, string> = {};
  const digits = (body.phone ?? reg.phone ?? "").replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91")))) errors.phone = "Enter a 10-digit mobile number.";
  const stay = { residence: body.residence ?? reg.residence, hostel: body.hostel ?? reg.hostel, room: body.room ?? reg.room };
  Object.assign(errors, validateStay(stay, reg.gender));
  let photo = reg.photo;
  if (body.photo && body.photo.url !== reg.photo?.url) {
    photo = assertOwnMedia(body.photo, "photo");
    if (photo.publicId !== `converge26/profiles/${user.uid}`) errors.photo = "Upload your photo again.";
  }
  if (Object.keys(errors).length) throw new HttpError(422, "Please fix the highlighted fields.", errors);

  const clean = normaliseStay(stay);
  const phone = digits.slice(-10);
  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`registrations/${user.uid}/phone`]: phone,
    [`registrations/${user.uid}/residence`]: clean.residence,
    [`registrations/${user.uid}/hostel`]: clean.hostel,
    [`registrations/${user.uid}/room`]: clean.room,
    [`registrations/${user.uid}/photo`]: photo,
    [`registrations/${user.uid}/updatedAt`]: now,
  };
  // Keep the copy on each event entry (what club admins see) in step.
  const { entries } = await queryEntries("uid", user.uid);
  for (const e of entries) {
    updates[`entries/${e.id}/student/phone`] = phone;
    updates[`entries/${e.id}/student/residence`] = clean.residence;
    updates[`entries/${e.id}/student/hostel`] = clean.hostel;
    updates[`entries/${e.id}/student/room`] = clean.room;
    updates[`entries/${e.id}/student/photoUrl`] = photo?.url ?? "";
  }
  await db.update("", updates);
  await audit(user.email, "profile", `${reg.fullName} (${reg.studentId}) updated their profile`);
  return ok({ ok: true });
});
