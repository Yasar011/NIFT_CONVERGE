import { verifyIdToken, type IdToken } from "./google";
import { db, keyOf, cached } from "./rtdb";
import { HttpError } from "./http";
import type { EventCategory } from "../types";

export type Role = "student" | "club_admin" | "main_admin";

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  role: Role;
  club: EventCategory | null;
}

const DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "nift.ac.in").toLowerCase();
const MAIN_ADMINS = (process.env.MAIN_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email?: string | null) {
  return !!email && email.toLowerCase().endsWith(`@${DOMAIN}`);
}

async function verify(req: Request): Promise<IdToken> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Please sign in.");
  let decoded: IdToken;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
  if (!isAllowedEmail(decoded.email) || !decoded.email_verified) {
    throw new HttpError(403, `Only verified @${DOMAIN} accounts can use this.`);
  }
  return decoded;
}

/** Roles are keyed by email so a club admin can be added before they first sign in. */
export async function roleFor(email: string): Promise<{ role: Role; club: EventCategory | null }> {
  const e = email.toLowerCase();
  if (MAIN_ADMINS.includes(e)) return { role: "main_admin", club: null };
  // Cached briefly per server instance: a burst of logins/votes reads it once.
  const d = await cached(`role:${e}`, 30_000, () => db.get<{ role: Role; club?: EventCategory }>(`roles/${keyOf(e)}`));
  if (d?.role === "main_admin") return { role: "main_admin", club: null };
  if (d?.role === "club_admin" && d.club) return { role: "club_admin", club: d.club };
  return { role: "student", club: null };
}

export async function isBlocked(email: string) {
  return cached(`blocked:${email.toLowerCase()}`, 30_000, () =>
    db.get<{ reason?: string }>(`blocked/${keyOf(email)}`)
  );
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const t = await verify(req);
  const [{ role, club }, blocked] = await Promise.all([roleFor(t.email!), isBlocked(t.email!)]);
  if (blocked && role === "student") {
    throw new HttpError(
      403,
      `Your account has been blocked by the organisers${blocked.reason ? ` (${blocked.reason})` : ""}. Contact the Campus SDAC.`,
      { blocked: "1" }
    );
  }
  return {
    uid: t.uid,
    email: t.email!.toLowerCase(),
    name: (t.name as string) || t.email!.split("@")[0],
    picture: t.picture,
    role,
    club,
  };
}

export async function requireAdmin(req: Request): Promise<SessionUser> {
  const u = await requireUser(req);
  if (u.role === "student") throw new HttpError(403, "Admins only.");
  return u;
}

export async function requireMainAdmin(req: Request): Promise<SessionUser> {
  const u = await requireUser(req);
  if (u.role !== "main_admin") throw new HttpError(403, "Main admin only.");
  return u;
}

/** Club admins may only touch their own club's events. */
export function assertClubAccess(u: SessionUser, category: string) {
  if (u.role === "main_admin") return;
  if (u.role === "club_admin" && u.club === category) return;
  throw new HttpError(403, "This event belongs to another club.");
}

export async function touchUser(u: SessionUser) {
  await db.update(`users/${u.uid}`, {
    email: u.email,
    name: u.name,
    picture: u.picture ?? null,
    role: u.role,
    club: u.club,
    lastLoginAt: Date.now(),
  });
}
