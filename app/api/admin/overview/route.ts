import { handle, ok } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel, parseEntryId, statId } from "@/lib/server/selection";
import { readSettings } from "@/lib/server/settings";
import { isRegistrationOpen } from "@/lib/settings-shared";
import { PICKABLE_EVENTS, eventKey, capacityOf } from "@/lib/events";
import { CAMPUS_CAP } from "@/lib/registration-schema";

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const [sel, regs, settings, entries] = await Promise.all([
    readSel(),
    db.get<Record<string, true>>("registrations", { shallow: true }),
    readSettings(),
    admin.role === "main_admin"
      ? db.get<Record<string, { recommendation?: { state: string } | null }>>("entries")
      : Promise.resolve(null),
  ]);
  const pendingApprovals = Object.entries(entries ?? {}).filter(
    ([id, e]) => e.recommendation?.state === "pending" && sel.status?.[id] !== "selected"
  ).length;

  // Per-event registered / selected / present counts.
  const registered: Record<string, number> = {};
  for (const [id, status] of Object.entries(sel.status ?? {})) {
    const key = parseEntryId(id).eventKey;
    if (status !== "locked") registered[key] = (registered[key] ?? 0) + 1;
  }
  const events = PICKABLE_EVENTS.filter((e) => admin.role === "main_admin" || e.category === admin.club).map((e) => {
    const key = eventKey(e);
    return {
      key,
      category: e.category,
      registered: registered[key] ?? 0,
      selected: sel.events?.[statId(key)] ?? 0,
      capacity: capacityOf(e),
    };
  });

  return ok({
    role: admin.role,
    club: admin.club,
    registrations: Object.keys(regs ?? {}).length,
    selectedStudents: sel.campus ?? 0,
    campusCap: CAMPUS_CAP,
    registrationOpen: isRegistrationOpen(settings),
    settings,
    pendingApprovals: admin.role === "main_admin" ? pendingApprovals : 0,
    events,
  });
});
