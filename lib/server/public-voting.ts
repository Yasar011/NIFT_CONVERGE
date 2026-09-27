import crypto from "node:crypto";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { db } from "./rtdb";
import { HttpError } from "./http";
import type { LiveParticipant, SessionStatus, VotingSession } from "../api-types";
import type { EventCategory } from "../types";

export const DEVICE_COOKIE = "cnv_vid";
const DEVICE_RE = /^[a-f0-9]{32}$/;

export const newPublicId = () => crypto.randomBytes(8).toString("base64url");
export const newDeviceId = () => crypto.randomBytes(16).toString("hex");

/**
 * The browser's anonymous voter id. It lives in an HttpOnly cookie *and* in
 * localStorage (sent as x-voter-id), so clearing either one alone — or simply
 * refreshing / reopening the link — doesn't grant another vote.
 */
export async function readDeviceId(): Promise<{ id: string | null; fromCookie: boolean }> {
  const fromCookie = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (fromCookie && DEVICE_RE.test(fromCookie)) return { id: fromCookie, fromCookie: true };
  const fromHeader = (await headers()).get("x-voter-id");
  if (fromHeader && DEVICE_RE.test(fromHeader)) return { id: fromHeader, fromCookie: false };
  return { id: null, fromCookie: false };
}

export async function rememberDevice(id: string) {
  (await cookies()).set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function ipHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "";
  return ip ? crypto.createHash("sha256").update(`cnv26:${ip}`).digest("hex").slice(0, 16) : null;
}

export async function sessionIdFor(publicId: string) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(publicId)) throw new HttpError(404, "Voting link not found.");
  const sid = await db.get<string>(`voting/public/${publicId}`);
  if (!sid) throw new HttpError(404, "Voting link not found.");
  return sid;
}

export interface PublicRound {
  title: string;
  eventName: string;
  category: EventCategory;
  status: SessionStatus;
  live: LiveParticipant | null;
  published: boolean;
}

/** Cached per link for a few seconds; scans/stop/end revalidate the "live" tag. */
export const readPublicRound = unstable_cache(
  async (publicId: string): Promise<PublicRound | null> => {
    const sid = await db.get<string>(`voting/public/${publicId}`);
    if (!sid) return null;
    const s = await db.get<Omit<VotingSession, "id">>(`voting/sessions/${sid}`);
    if (!s) return null;
    return {
      title: s.title,
      eventName: s.eventName,
      category: s.category,
      status: s.status,
      live: s.status === "running" ? (s.live ?? null) : null,
      published: s.status === "published",
    };
  },
  ["public-round"],
  { revalidate: 3, tags: ["live"] }
);
