import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";
import { db, keyOf } from "./rtdb";
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

async function verify(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Please sign in.");
  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth().verifyIdToken(token);
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
  const d = await db.get<{ role: Role; club?: EventCategory }>(`roles/${keyOf(e)}`);
  if (d?.role === "main_admin") return { role: "main_admin", club: null };
  if (d?.role === "club_admin" && d.club) return { role: "club_admin", club: d.club };
  return { role: "student", club: null };
}

/** Verified NIFT account, without a role lookup (cheap — no database read). */
export async function requireNiftUser(req: Request) {
  const t = await verify(req);
  return { uid: t.uid, email: t.email!.toLowerCase(), name: (t.name as string) || t.email!.split("@")[0] };
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const t = await verify(req);
  const { role, club } = await roleFor(t.email!);
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
