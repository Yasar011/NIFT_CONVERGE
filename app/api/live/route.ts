import { unstable_cache } from "next/cache";
import { handle, ok } from "@/lib/server/http";
import { db } from "@/lib/server/rtdb";
import type { VotingSession } from "@/lib/api-types";

/** Public list of rounds currently running, so the Vote page can link to them. */
const readRunning = unstable_cache(
  async () => {
    const all = await db.get<Record<string, Omit<VotingSession, "id">>>("voting/sessions", {
      orderBy: "status",
      equalTo: "running",
    });
    return Object.values(all ?? {})
      .filter((s) => s.publicId)
      .map((s) => ({
        publicId: s.publicId!,
        title: s.title,
        eventName: s.eventName,
        category: s.category,
        liveName: s.live?.name ?? null,
      }));
  },
  ["running-rounds"],
  // Scans / stop / end call revalidateTag("live"), so changes show on the next poll.
  { revalidate: 3, tags: ["live"] }
);

export const GET = handle(async () => ok({ rounds: await readRunning() }));
