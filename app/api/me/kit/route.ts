import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import { readSettings } from "@/lib/server/settings";
import { audit } from "@/lib/server/audit";
import { validateKit, type KitSizes } from "@/lib/kit";
import type { RegistrationRecord } from "@/lib/api-types";

/**
 * Jersey kit sizes. Students in the final list set their own until selections
 * are frozen; the main admin can set anyone's (`forUid`) at any time.
 */
export const PUT = handle(async (req: Request) => {
  const user = await requireUser(req);
  const body = await readJson<Partial<KitSizes> & { forUid?: string }>(req);
  const forOther = !!body.forUid && body.forUid !== user.uid;
  if (forOther && user.role !== "main_admin") throw new HttpError(403, "Only the main admin can set someone else's sizes.");
  const uid = forOther ? body.forUid! : user.uid;

  const [reg, sel, settings] = await Promise.all([db.get<RegistrationRecord>(`registrations/${uid}`), readSel(), readSettings()]);
  if (!reg) throw new HttpError(404, "Register first.");
  if (!sel.counts?.[uid]) throw new HttpError(403, "Kit sizes are only for students in the final list.");
  if (!forOther && settings.selectionFrozen) {
    throw new HttpError(423, "Kit sizes are locked now that the final list is submitted. Contact the main admin to change them.");
  }

  const { errors, kit } = validateKit(body);
  if (Object.keys(errors).length) throw new HttpError(422, "Choose a size for every item.", errors);
  await db.set(`registrations/${uid}/kit`, { ...kit, at: Date.now(), by: user.email });
  if (forOther) await audit(user.email, "final", `${reg.fullName}: kit sizes set by admin`);
  return ok({ ok: true });
});
