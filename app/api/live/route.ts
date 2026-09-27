import { unstable_cache } from "next/cache";
import { handle, ok } from "@/lib/server/http";
import { requireNiftUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import type { LiveSessionPublic, VotingSession } from "@/lib/api-types";

// Every voter polls this, so it's cached for a few seconds: however many
// students are watching, the database is read at most once per window.
const readLive = unstable_cache(
  async (): Promise<LiveSessionPublic[]> => {
    const all = await db.get<Record<string, Omit<VotingSession, "id">>>("voting/sessions", {
      orderBy: "status",
      equalTo: "running",
    });
    return Object.entries(all ?? {})
      .filter(([, s]) => s.live)
      .map(([id, s]) => ({ id, title: s.title, eventName: s.eventName, category: s.category, live: s.live! }));
  },
  ["live-sessions"],
  // Scans / stop / end call revalidateTag("live"), so changes show on the next poll.
  { revalidate: 3, tags: ["live"] }
);

export const GET = handle(async (req: Request) => {
  await requireNiftUser(req);
  return ok({ sessions: await readLive(), at: Date.now() });
});
