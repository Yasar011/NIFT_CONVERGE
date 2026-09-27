import { handle, ok } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import type { RegistrationRecord } from "@/lib/api-types";

export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const [regs, sel] = await Promise.all([db.get<Record<string, RegistrationRecord>>("registrations"), readSel()]);
  const students = Object.values(regs ?? {})
    .map((r) => ({ ...r, selectedCount: sel.counts?.[r.uid] ?? 0 }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return ok({ students });
});
