import { revalidateTag } from "next/cache";
import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db, forget } from "@/lib/server/rtdb";
import { readSettings } from "@/lib/server/settings";
import { checkFinalPassword } from "@/lib/server/final-password";
import { audit } from "@/lib/server/audit";

const fmt = (t: number | null) => (t ? new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—");

export const PATCH = handle(async (req: Request) => {
  const me = await requireMainAdmin(req);
  const body = await readJson<{
    registrationOpen?: boolean;
    opensAt?: number | null;
    closesAt?: number | null;
    selectionFrozen?: boolean;
    finalPassword?: string;
  }>(req);
  const current = await readSettings();
  const patch: Record<string, unknown> = {};
  const notes: string[] = [];

  if (typeof body.registrationOpen === "boolean") {
    patch.registrationOpen = body.registrationOpen;
    notes.push(`registration ${body.registrationOpen ? "opened" : "closed"}`);
  }
  if (body.opensAt !== undefined || body.closesAt !== undefined) {
    const opensAt = body.opensAt === undefined ? current.opensAt : body.opensAt;
    const closesAt = body.closesAt === undefined ? current.closesAt : body.closesAt;
    for (const t of [opensAt, closesAt]) {
      if (t !== null && (typeof t !== "number" || !Number.isFinite(t))) throw new HttpError(400, "Invalid date.");
    }
    if (opensAt && closesAt && closesAt <= opensAt) throw new HttpError(400, "Closing time must be after opening time.");
    patch.opensAt = opensAt;
    patch.closesAt = closesAt;
    notes.push(`schedule set: opens ${fmt(opensAt)}, closes ${fmt(closesAt)}`);
  }
  if (typeof body.selectionFrozen === "boolean" && body.selectionFrozen !== current.selectionFrozen) {
    // Freezing / unfreezing the final list needs the final-selection password.
    checkFinalPassword(body.finalPassword);
    patch.selectionFrozen = body.selectionFrozen;
    notes.push(body.selectionFrozen ? "selections FROZEN" : "selections unfrozen");
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to change.");

  await db.update("settings/app", patch);
  forget("settings");
  revalidateTag("settings", { expire: 0 });
  await audit(me.email, "settings", notes.join("; "));
  return ok({ ok: true });
});
