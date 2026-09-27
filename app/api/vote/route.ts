import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireNiftUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { getSession } from "@/lib/server/voting";

/** Has this student already voted for whoever is live? */
export const GET = handle(async (req: Request) => {
  const user = await requireNiftUser(req);
  const params = new URL(req.url).searchParams;
  const sessionId = params.get("sessionId") || "";
  const participant = params.get("participant") || "";
  if (!sessionId || !participant) throw new HttpError(400, "Missing session.");
  const vote = await db.get<{ v: string }>(`voting/votes/${sessionId}/${participant}/${user.uid}`);
  return ok({ voted: vote?.v ?? null });
});

export const POST = handle(async (req: Request) => {
  const user = await requireNiftUser(req);
  const body = await readJson<{ sessionId: string; participant: string; value: "good" | "reject" }>(req);
  if (body.value !== "good" && body.value !== "reject") throw new HttpError(400, "Choose Good or Reject.");

  const session = await getSession(body.sessionId || "");
  if (!session || session.status !== "running" || !session.live) {
    throw new HttpError(409, "Voting isn't open right now.");
  }
  // Only the participant who is live *now* can receive votes.
  if (session.live.uid !== body.participant) {
    throw new HttpError(409, "Voting has moved to the next participant.");
  }
  if (session.live.uid === user.uid) throw new HttpError(403, "You can't vote for yourself.");

  const fresh = await db.create(`voting/votes/${body.sessionId}/${body.participant}/${user.uid}`, {
    v: body.value,
    at: Date.now(),
  });
  if (!fresh) throw new HttpError(409, "You've already voted for this participant.");
  return ok({ ok: true, voted: body.value });
});
