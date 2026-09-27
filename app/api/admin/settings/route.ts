import { revalidateTag } from "next/cache";
import { handle, ok, readJson } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";

export const PATCH = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const body = await readJson<{ registrationOpen?: boolean }>(req);
  if (typeof body.registrationOpen === "boolean") {
    await db.update("settings/app", { registrationOpen: body.registrationOpen });
  }
  // Every page's "Register" button reads this — refresh immediately.
  revalidateTag("settings", { expire: 0 });
  return ok({ ok: true });
});
