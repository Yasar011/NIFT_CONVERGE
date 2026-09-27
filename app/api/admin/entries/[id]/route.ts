import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel, setEntryStatus, removeEntries, parseEntryId, entryId } from "@/lib/server/selection";
import { assertOwnMedia } from "@/lib/server/cloudinary";
import { checkFinalPassword } from "@/lib/server/final-password";
import { SETTABLE_STATUSES, pickedKeys, picksFrom, type EntryStatus, type MediaRef } from "@/lib/registration-schema";
import type { EntryRecord, RegistrationRecord } from "@/lib/api-types";

type Ctx = { params: Promise<{ id: string }> };

async function load(req: Request, ctx: Ctx) {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const entry = await db.get<EntryRecord>(`entries/${id}`);
  if (!entry) throw new HttpError(404, "Entry not found.");
  assertClubAccess(admin, entry.category);
  return { admin, id, entry };
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { admin, id } = await load(req, ctx);
  const body = await readJson<{
    status?: EntryStatus;
    present?: boolean;
    video?: MediaRef | null;
    note?: string;
    finalPassword?: string;
  }>(req);
  const now = Date.now();
  const patch: Record<string, unknown> = { updatedAt: now, updatedBy: admin.email };
  let changed: string[] = [];

  if (body.status !== undefined) {
    if (!SETTABLE_STATUSES.includes(body.status)) throw new HttpError(400, "Invalid status.");
    const current = (await readSel()).status?.[id];
    // Final selection — making or undoing "Selected" — is the main admin's call, behind a password.
    if (body.status === "selected" || current === "selected") {
      if (admin.role !== "main_admin") throw new HttpError(403, "Only the main admin can make final selections.");
      checkFinalPassword(body.finalPassword);
    }
    changed = await setEntryStatus(id, body.status);
    if (body.status === "selected") Object.assign(patch, { finalBy: admin.email, finalAt: now });
  }
  if (body.present !== undefined) {
    patch.attendance = { present: !!body.present, at: now, by: admin.email };
  }
  if (body.note !== undefined) {
    patch.note = String(body.note).trim().slice(0, 500);
  }
  if (body.video !== undefined) {
    if (body.video === null) patch.video = null;
    else {
      const video = assertOwnMedia(body.video, "video");
      if (video.publicId !== `converge26/performances/${id}`) throw new HttpError(400, "Upload the video again.");
      patch.video = video;
    }
  }
  await db.update(`entries/${id}`, patch);
  return ok({ ok: true, changed });
});

/** Removes a student from one event (club admin for their club, or main admin). */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await load(req, ctx);
  const { uid, eventKey } = parseEntryId(id);
  const reg = await db.get<RegistrationRecord>(`registrations/${uid}`);
  await removeEntries([id]); // refuses if the student is selected for it
  const remaining = reg ? pickedKeys(reg.picks).map((p) => p.key).filter((k) => k !== eventKey) : [];
  const updates: Record<string, unknown> = { [`entries/${id}`]: null };
  if (reg) {
    const picks = picksFrom(remaining);
    updates[`registrations/${uid}/picks`] = picks;
    updates[`registrations/${uid}/updatedAt`] = Date.now();
    // Keep each remaining entry's slot label in step with the compacted picks.
    for (const { slot, key } of pickedKeys(picks)) updates[`entries/${entryId(uid, key)}/slot`] = slot;
  }
  await db.update("", updates);
  return ok({ ok: true });
});
