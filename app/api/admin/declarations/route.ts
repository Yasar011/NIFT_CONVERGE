import { handle, ok, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import { audit } from "@/lib/server/audit";
import { fileSafe, pdfResponse } from "@/lib/server/declarations";
import type { DeclarationRecord } from "@/lib/declaration";

/**
 * Signed declarations as PDF: `?uid=` for one student, otherwise everyone
 * currently in the final list who has signed (one page each, by name).
 */
export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const uid = new URL(req.url).searchParams.get("uid");
  if (uid) {
    const rec = await db.get<DeclarationRecord>(`declarations/${uid}`);
    if (!rec) throw new HttpError(404, "This student hasn't signed the declaration yet.");
    return pdfResponse([rec], `declaration-${fileSafe(rec.studentId)}.pdf`);
  }
  const [all, sel] = await Promise.all([db.get<Record<string, DeclarationRecord>>("declarations"), readSel()]);
  const records = Object.values(all ?? {})
    .filter((r) => sel.counts?.[r.uid])
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!records.length) throw new HttpError(404, "No one in the final list has signed yet.");
  return pdfResponse(records, "converge26-declarations.pdf");
});

/** Clears a declaration so the student signs again (e.g. their events changed). */
export const DELETE = handle(async (req: Request) => {
  const admin = await requireMainAdmin(req);
  const uid = new URL(req.url).searchParams.get("uid");
  if (!uid) throw new HttpError(400, "Choose a student.");
  const rec = await db.get<DeclarationRecord>(`declarations/${uid}`);
  if (!rec) throw new HttpError(404, "No declaration to reset.");
  await db.update("", { [`declarations/${uid}`]: null, [`registrations/${uid}/declaration`]: null });
  await audit(admin.email, "final", `${rec.name} (${rec.studentId}): declaration reset — they need to sign again`);
  return ok({ ok: true });
});
