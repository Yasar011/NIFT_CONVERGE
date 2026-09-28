import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { getSession } from "@/lib/server/voting";
import { readPublicRound, sessionIdFor } from "@/lib/server/public-voting";

type Ctx = { params: Promise<{ publicId: string }> };

/**
 * Round state for the shared voting link (no counts). Anyone can see who's on
 * stage; voting itself needs a signed-in NIFT account.
 * With `?participant=` and a sign-in token, also says whether you've voted.
 */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { publicId } = await ctx.params;
  const round = await readPublicRound(publicId);
  if (!round) throw new HttpError(404, "Voting link not found.");
  const participant = new URL(req.url).searchParams.get("participant");
  let voted: string | null = null;
  if (participant && req.headers.get("authorization")) {
    const user = await requireUser(req);
    const sid = await sessionIdFor(publicId);
    voted = (await db.get<{ v: string }>(`voting/votes/${sid}/${participant}/${user.uid}`))?.v ?? null;
  }
  return ok({ round, voted });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req); // NIFT account, not blocked
  const { publicId } = await ctx.params;
  const body = await readJson<{ participant: string; value: "good" | "reject" }>(req);
  if (body.value !== "good" && body.value !== "reject") throw new HttpError(400, "Choose Good or Reject.");

  const sid = await sessionIdFor(publicId);
  const session = await getSession(sid);
  if (!session || session.status !== "running" || !session.live) {
    throw new HttpError(409, "Voting isn't open right now.");
  }
  // Only whoever is live *now* can receive votes.
  if (session.live.uid !== body.participant) throw new HttpError(409, "Voting has moved to the next performer.");
  if (session.live.uid === user.uid) throw new HttpError(403, "You can't vote for yourself.");

  // One vote per performer per account: the vote's key *is* the voter's uid.
  const fresh = await db.create(`voting/votes/${sid}/${body.participant}/${user.uid}`, {
    v: body.value,
    at: Date.now(),
  });
  if (!fresh) throw new HttpError(409, "You've already voted for this performer.");
  return ok({ ok: true, voted: body.value });
});
