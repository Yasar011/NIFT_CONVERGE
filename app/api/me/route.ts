import { handle, ok } from "@/lib/server/http";
import { requireUser, touchUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries } from "@/lib/server/entries";
import { readSettings } from "@/lib/server/settings";
import type { MeResponse, RegistrationRecord } from "@/lib/api-types";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const [registration, { entries, sel }, settings] = await Promise.all([
    db.get<RegistrationRecord>(`registrations/${user.uid}`),
    queryEntries("uid", user.uid),
    readSettings(),
    touchUser(user),
  ]);
  const body: MeResponse = {
    user,
    registration,
    entries,
    selectedCount: sel.counts?.[user.uid] ?? 0,
    registrationOpen: settings.registrationOpen,
  };
  return ok(body);
});
