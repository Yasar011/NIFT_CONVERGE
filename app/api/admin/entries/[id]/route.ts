import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { setEntryStatus } from "@/lib/server/selection";
import { assertOwnMedia } from "@/lib/server/cloudinary";
import { SETTABLE_STATUSES, type EntryStatus, type MediaRef } from "@/lib/registration-schema";
import type { EntryRecord } from "@/lib/api-types";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const entry = await db.get<EntryRecord>(`entries/${id}`);
  if (!entry) throw new HttpError(404, "Entry not found.");
  assertClubAccess(admin, entry.category);

  const body = await readJson<{ status?: EntryStatus; present?: boolean; video?: MediaRef | null }>(req);
  const now = Date.now();
  const patch: Record<string, unknown> = { updatedAt: now, updatedBy: admin.email };
  let changed: string[] = [];

  if (body.status !== undefined) {
    if (!SETTABLE_STATUSES.includes(body.status)) throw new HttpError(400, "Invalid status.");
    changed = await setEntryStatus(id, body.status);
  }
  if (body.present !== undefined) {
    patch.attendance = { present: !!body.present, at: now, by: admin.email };
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
