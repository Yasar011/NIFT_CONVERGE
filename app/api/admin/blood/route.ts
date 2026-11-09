import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import { audit } from "@/lib/server/audit";
import { fmtBlood, validBloodGroup } from "@/lib/documents";

/** Main admin sets blood groups for many final-list students at once (from a pasted list). */
export const POST = handle(async (req: Request) => {
  const admin = await requireMainAdmin(req);
  const { items } = await readJson<{ items?: { uid?: string; bloodGroup?: string }[] }>(req);
  if (!Array.isArray(items) || !items.length || items.length > 200) throw new HttpError(400, "Nothing to save.");
  const sel = await readSel();
  const updates: Record<string, unknown> = {};
  const names: string[] = [];
  for (const it of items) {
    const uid = String(it.uid ?? "");
    if (!/^[A-Za-z0-9]+$/.test(uid) || !validBloodGroup(it.bloodGroup)) throw new HttpError(400, "Check the list — a student or blood group is wrong.");
    if (!sel.counts?.[uid]) throw new HttpError(403, "Blood groups are only for students in the final list.");
    const name = await db.get<string>(`registrations/${uid}/fullName`);
    if (name === null) throw new HttpError(404, "Student not found.");
    updates[`registrations/${uid}/bloodGroup`] = it.bloodGroup;
    names.push(`${name} ${fmtBlood(it.bloodGroup)}`);
  }
  await db.update("", updates);
  await audit(admin.email, "final", `Blood groups set for ${items.length} students (by admin): ${names.join(", ")}`);
  return ok({ ok: true, saved: items.length });
});
