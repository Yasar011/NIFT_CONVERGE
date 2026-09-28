import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin, isAllowedEmail, type Role } from "@/lib/server/auth";
import { db, keyOf, forget } from "@/lib/server/rtdb";
import { CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import { audit } from "@/lib/server/audit";

interface RoleRecord {
  email: string;
  role: Role;
  club: EventCategory | null;
  addedBy: string;
  addedAt: number;
}

export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const roles = await db.get<Record<string, RoleRecord>>("roles");
  const envAdmins = (process.env.MAIN_ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
  return ok({ team: Object.values(roles ?? {}), owners: envAdmins });
});

export const POST = handle(async (req: Request) => {
  const me = await requireMainAdmin(req);
  const body = await readJson<{ email: string; role: Role; club?: EventCategory }>(req);
  const email = (body.email || "").trim().toLowerCase();
  if (!isAllowedEmail(email)) throw new HttpError(400, "Use a NIFT email address.");
  if (body.role !== "club_admin" && body.role !== "main_admin") throw new HttpError(400, "Choose a role.");
  if (body.role === "club_admin" && !CATEGORY_ORDER.includes(body.club as EventCategory)) {
    throw new HttpError(400, "Choose the club.");
  }
  const record: RoleRecord = {
    email,
    role: body.role,
    club: body.role === "club_admin" ? body.club! : null,
    addedBy: me.email,
    addedAt: Date.now(),
  };
  await db.set(`roles/${keyOf(email)}`, record);
  forget(`role:${email}`);
  await audit(me.email, "admin.add", `Added ${email} as ${body.role === "main_admin" ? "main admin" : `club admin (${record.club})`}`);
  return ok({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const me = await requireMainAdmin(req);
  const email = (new URL(req.url).searchParams.get("email") || "").toLowerCase();
  if (!email) throw new HttpError(400, "Missing email.");
  if (email === me.email) throw new HttpError(400, "You can't remove yourself.");
  await db.remove(`roles/${keyOf(email)}`);
  forget(`role:${email}`);
  await audit(me.email, "admin.remove", `Removed admin access for ${email}`);
  return ok({ ok: true });
});
