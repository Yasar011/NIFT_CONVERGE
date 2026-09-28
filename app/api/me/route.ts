import { handle, ok } from "@/lib/server/http";
import { requireUser, touchUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { queryEntries } from "@/lib/server/entries";
import { readSettings } from "@/lib/server/settings";
import { isRegistrationOpen } from "@/lib/settings-shared";
import type { Announcement, MeResponse, RegistrationRecord, Trial } from "@/lib/api-types";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const [registration, { entries, sel }, settings, allNotices, allTrials] = await Promise.all([
    db.get<RegistrationRecord>(`registrations/${user.uid}`),
    queryEntries("uid", user.uid),
    readSettings(),
    db.get<Record<string, Omit<Announcement, "id">>>("announcements"),
    db.get<Record<string, Record<string, Omit<Trial, "id">>>>("trials"),
    touchUser(user),
  ]);

  // Only what's relevant to this student: everyone, their clubs, their events.
  const myEvents = new Set(entries.filter((e) => e.status !== "not_selected").map((e) => e.eventKey));
  const myClubs = new Set(entries.map((e) => `club:${e.category}`));
  const announcements = Object.entries(allNotices ?? {})
    .map(([id, a]) => ({ ...a, id }))
    .filter((a) => a.audience === "all" || myClubs.has(a.audience) || myEvents.has(a.audience))
    .sort((a, b) => b.at - a.at)
    .slice(0, 20);
  const trials = Object.values(allTrials ?? {})
    .flatMap((byEvent) => Object.entries(byEvent ?? {}).map(([id, t]) => ({ ...t, id })))
    .filter((t) => myEvents.has(t.eventKey))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const body: MeResponse = {
    user,
    registration,
    entries,
    selectedCount: sel.counts?.[user.uid] ?? 0,
    registrationOpen: isRegistrationOpen(settings),
    announcements,
    trials,
  };
  return ok(body);
});
