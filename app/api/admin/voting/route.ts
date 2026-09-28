import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { getEventByKey, eventLabel } from "@/lib/events";
import { newPublicId } from "@/lib/server/public-voting";
import { audit } from "@/lib/server/audit";
import type { VotingSession } from "@/lib/api-types";
import type { EventCategory } from "@/lib/types";

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const all = await db.get<Record<string, Omit<VotingSession, "id">>>("voting/sessions");
  const sessions = Object.entries(all ?? {})
    .map(([id, s]) => ({ ...s, id, live: s.live ?? null }))
    .filter((s) => admin.role === "main_admin" || s.category === admin.club)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  return ok({ sessions });
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<{ eventKey: string; title?: string; date: string }>(req);
  const event = getEventByKey(body.eventKey || "");
  if (!event || event.nonCompetitive) throw new HttpError(400, "Choose an event.");
  assertClubAccess(admin, event.category);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) throw new HttpError(400, "Choose a date.");

  const publicId = newPublicId();
  const session: Omit<VotingSession, "id"> = {
    publicId,
    eventKey: body.eventKey,
    category: event.category as EventCategory,
    eventName: eventLabel(event),
    title: (body.title || "").trim().slice(0, 80) || `${eventLabel(event)} — selection`,
    date: body.date,
    status: "scheduled",
    live: null,
    createdBy: admin.email,
    createdAt: Date.now(),
  };
  const id = await db.push("voting/sessions", session);
  await db.set(`voting/public/${publicId}`, id);
  await audit(admin.email, "round.create", `Created voting round "${session.title}" for ${session.date}`, session.category);
  return ok({ id, publicId });
});
