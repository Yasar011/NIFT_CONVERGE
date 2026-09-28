import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, type SessionUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { audit } from "@/lib/server/audit";
import { getEventByKey } from "@/lib/events";
import { CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import type { Announcement } from "@/lib/api-types";

/** Which club an audience belongs to (null = everyone). */
function clubOf(audience: string, club?: string | null): EventCategory | null {
  if (audience === "students") return (club as EventCategory) ?? null;
  if (audience === "all") return null;
  if (audience.startsWith("club:")) return audience.slice(5) as EventCategory;
  return (getEventByKey(audience)?.category as EventCategory) ?? null;
}

function canManage(u: SessionUser, audience: string, club?: string | null) {
  if (u.role === "main_admin") return true;
  return audience !== "all" && clubOf(audience, club) === u.club;
}

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const all = await db.get<Record<string, Omit<Announcement, "id">>>("announcements");
  const list = Object.entries(all ?? {})
    .map(([id, a]) => ({ ...a, id }))
    .filter((a) => canManage(admin, a.audience, a.club))
    .sort((a, b) => b.at - a.at);
  return ok({ announcements: list });
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<{ title: string; body: string; audience: string }>(req);
  const title = (body.title || "").trim().slice(0, 100);
  const text = (body.body || "").trim().slice(0, 1000);
  const audience = body.audience || "";
  if (!title || !text) throw new HttpError(400, "Add a title and a message.");
  const valid =
    audience === "all" ||
    (audience.startsWith("club:") && CATEGORY_ORDER.includes(audience.slice(5) as EventCategory)) ||
    !!getEventByKey(audience);
  if (!valid) throw new HttpError(400, "Choose who should see this.");
  if (!canManage(admin, audience)) throw new HttpError(403, "Club admins can only post to their own club or its events.");

  const record: Omit<Announcement, "id"> = { title, body: text, audience, createdBy: admin.email, at: Date.now() };
  const id = await db.push("announcements", record);
  await audit(admin.email, "announce", `Posted "${title}" to ${audience}`, clubOf(audience));
  return ok({ id });
});

export const DELETE = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const id = new URL(req.url).searchParams.get("id") || "";
  const a = await db.get<Omit<Announcement, "id">>(`announcements/${id}`);
  if (!a) throw new HttpError(404, "Announcement not found.");
  if (!canManage(admin, a.audience, a.club)) throw new HttpError(403, "You can't remove this announcement.");
  await db.remove(`announcements/${id}`);
  await audit(admin.email, "announce.delete", `Removed "${a.title}"`, clubOf(a.audience, a.club));
  return ok({ ok: true });
});
