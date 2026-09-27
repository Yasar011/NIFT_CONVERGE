import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { db } from "@/lib/server/rtdb";
import { getSession } from "@/lib/server/voting";
import {
  ipHash,
  readDeviceId,
  readPublicRound,
  rememberDevice,
  sessionIdFor,
} from "@/lib/server/public-voting";

type Ctx = { params: Promise<{ publicId: string }> };

/**
 * Public, no-login round state. `?participant=` also returns whether this
 * browser has already voted for that performer.
 */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { publicId } = await ctx.params;
  const round = await readPublicRound(publicId);
  if (!round) throw new HttpError(404, "Voting link not found.");
  const participant = new URL(req.url).searchParams.get("participant");
  let voted: string | null = null;
  if (participant) {
    const { id } = await readDeviceId();
    if (id) {
      const sid = await sessionIdFor(publicId);
      voted = (await db.get<{ v: string }>(`voting/votes/${sid}/${participant}/${id}`))?.v ?? null;
    }
  }
  return ok({ round, voted });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { publicId } = await ctx.params;
  const body = await readJson<{ participant: string; value: "good" | "reject" }>(req);
  if (body.value !== "good" && body.value !== "reject") throw new HttpError(400, "Choose Good or Reject.");

  const { id: device, fromCookie } = await readDeviceId();
  if (!device) throw new HttpError(400, "Please reload the page and try again.");
  if (!fromCookie) await rememberDevice(device);

  const sid = await sessionIdFor(publicId);
  const session = await getSession(sid);
  if (!session || session.status !== "running" || !session.live) {
    throw new HttpError(409, "Voting isn't open right now.");
  }
  // Only whoever is live *now* can receive votes.
  if (session.live.uid !== body.participant) throw new HttpError(409, "Voting has moved to the next performer.");

  // One vote per performer per browser: the vote's key *is* the device id.
  const fresh = await db.create(`voting/votes/${sid}/${body.participant}/${device}`, {
    v: body.value,
    at: Date.now(),
    ip: await ipHash(),
  });
  if (!fresh) throw new HttpError(409, "You've already voted for this performer.");
  return ok({ ok: true, voted: body.value });
});
