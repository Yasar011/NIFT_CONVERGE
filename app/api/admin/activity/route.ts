import { handle, ok } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import type { AuditEntry } from "@/lib/server/audit";

const PAGE = 150;

/**
 * Activity log, newest first. Main admin sees everything; club admins see
 * their own club's activity. `?before=<id>` loads older entries.
 */
export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const before = new URL(req.url).searchParams.get("before");
  const page = await db.get<Record<string, Omit<AuditEntry, "id">>>("audit", {
    orderBy: "$key",
    limitToLast: PAGE + (before ? 1 : 0),
    ...(before ? { endAt: before } : {}),
  });
  let list = Object.entries(page ?? {})
    .map(([id, a]) => ({ ...a, id }))
    .filter((a) => a.id !== before)
    .sort((a, b) => (a.id < b.id ? 1 : -1));
  const more = list.length >= PAGE;
  if (admin.role === "club_admin") list = list.filter((a) => a.club === admin.club);
  return ok({ activity: list, more, oldest: list.at(-1)?.id ?? null });
});
