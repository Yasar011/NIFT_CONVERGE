import crypto from "node:crypto";
import { unstable_cache } from "next/cache";
import { db } from "./rtdb";
import { HttpError } from "./http";
import type { LiveParticipant, SessionStatus, VotingSession } from "../api-types";
import type { EventCategory } from "../types";

export const newPublicId = () => crypto.randomBytes(8).toString("base64url");

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
