import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { audit } from "@/lib/server/audit";
import { statId } from "@/lib/server/selection";
import { getEventByKey, eventLabel } from "@/lib/events";
import type { Trial } from "@/lib/api-types";
import type { EventCategory } from "@/lib/types";

/** Trials / auditions, stored per event: trials/{eventStatId}/{trialId}. */
export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const all = await db.get<Record<string, Record<string, Omit<Trial, "id">>>>("trials");
  const trials = Object.values(all ?? {})
    .flatMap((byEvent) => Object.entries(byEvent ?? {}).map(([id, t]) => ({ ...t, id })))
    .filter((t) => admin.role === "main_admin" || t.category === admin.club)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return ok({ trials });
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<Partial<Trial>>(req);
  const event = getEventByKey(body.eventKey || "");
  if (!event || event.nonCompetitive) throw new HttpError(400, "Choose an event.");
  assertClubAccess(admin, event.category);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) throw new HttpError(400, "Choose a date.");
  if (!/^\d{2}:\d{2}$/.test(body.time || "")) throw new HttpError(400, "Choose a time.");
  const venue = (body.venue || "").trim().slice(0, 100);
  if (!venue) throw new HttpError(400, "Add the venue.");

  const trial: Omit<Trial, "id"> = {
    eventKey: body.eventKey!,
    category: event.category as EventCategory,
    title: (body.title || "").trim().slice(0, 80) || "Trial",
    date: body.date!,
    time: body.time!,
    venue,
    notes: (body.notes || "").trim().slice(0, 300),
    createdBy: admin.email,
    at: Date.now(),
  };
  const id = await db.push(`trials/${statId(body.eventKey!)}`, trial);
  await audit(admin.email, "trial.add", `${eventLabel(event)}: "${trial.title}" on ${trial.date} ${trial.time} at ${venue}`, event.category);
  return ok({ id });
});

export const DELETE = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const params = new URL(req.url).searchParams;
  const eventKey = params.get("event") || "";
  const id = params.get("id") || "";
  const path = `trials/${statId(eventKey)}/${id}`;
  const t = await db.get<Omit<Trial, "id">>(path);
  if (!t) throw new HttpError(404, "Trial not found.");
  assertClubAccess(admin, t.category);
  await db.remove(path);
  await audit(admin.email, "trial.delete", `Cancelled "${t.title}" (${t.date} ${t.time}) for ${eventKey}`, t.category);
  return ok({ ok: true });
});
