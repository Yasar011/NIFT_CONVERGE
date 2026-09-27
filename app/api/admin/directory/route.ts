import { handle, ok } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { pickedKeys } from "@/lib/registration-schema";
import type { RegistrationRecord } from "@/lib/api-types";

/**
 * Minimal list of registered students so any admin can add a member to their
 * club's events. No phone/email here — only what's needed to pick the right person.
 */
export const GET = handle(async (req: Request) => {
  await requireAdmin(req);
  const regs = await db.get<Record<string, RegistrationRecord>>("registrations");
  const students = Object.values(regs ?? {})
    .map((r) => ({
      uid: r.uid,
      name: r.fullName,
      studentId: r.studentId,
      department: r.department,
      semester: r.semester,
      gender: r.gender,
      photoUrl: r.photo?.url ?? "",
      events: pickedKeys(r.picks).map((p) => p.key),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return ok({ students });
});
