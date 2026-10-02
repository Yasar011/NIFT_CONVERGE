import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser, requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { signUpload, type AccountName, type UploadKind } from "@/lib/server/cloudinary";
import { db } from "@/lib/server/rtdb";
import type { EntryRecord } from "@/lib/api-types";

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ kind: UploadKind; account: AccountName; entryId?: string; forUid?: string }>(req);
  const account: AccountName = body.account === "fallback" ? "fallback" : "primary";

  if (body.kind === "photo") {
    const user = await requireUser(req);
    // The main admin can upload a photo on a student's behalf.
    if (body.forUid && body.forUid !== user.uid) {
      if (user.role !== "main_admin") throw new HttpError(403, "Main admin only.");
      if (!/^[A-Za-z0-9]{10,40}$/.test(body.forUid)) throw new HttpError(400, "Invalid student.");
      return ok(signUpload(account, "photo", body.forUid));
    }
    return ok(signUpload(account, "photo", user.uid));
  }

  if (body.kind === "video") {
    const admin = await requireAdmin(req);
    if (!body.entryId) throw new HttpError(400, "Missing entry.");
    const entry = await db.get<EntryRecord>(`entries/${body.entryId}`);
    if (!entry) throw new HttpError(404, "Entry not found.");
    assertClubAccess(admin, entry.category);
    return ok(signUpload(account, "video", body.entryId));
  }

  throw new HttpError(400, "Unknown upload type.");
});
