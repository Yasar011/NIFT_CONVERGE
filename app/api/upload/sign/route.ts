import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser, requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { signUpload, type AccountName, type UploadKind } from "@/lib/server/cloudinary";
import { db } from "@/lib/server/rtdb";
import type { EntryRecord } from "@/lib/api-types";

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ kind: UploadKind; account: AccountName; entryId?: string }>(req);
  const account: AccountName = body.account === "fallback" ? "fallback" : "primary";

  if (body.kind === "photo") {
    const user = await requireUser(req);
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
