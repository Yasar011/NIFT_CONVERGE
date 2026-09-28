import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { getSession } from "@/lib/server/voting";
import { audit } from "@/lib/server/audit";

/** Main admin adds (or removes) votes for a participant. Every change is logged. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireMainAdmin(req);
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) throw new HttpError(404, "Voting session not found.");
  if (session.status === "published") throw new HttpError(409, "Unpublish the results before adjusting votes.");

  const body = await readJson<{ uid: string; good?: number; reject?: number; reason: string }>(req);
  const good = Math.trunc(Number(body.good) || 0);
  const reject = Math.trunc(Number(body.reject) || 0);
  if (!good && !reject) throw new HttpError(400, "Enter how many votes to add or remove.");
  if (Math.abs(good) > 1000 || Math.abs(reject) > 1000) throw new HttpError(400, "That's too many votes.");
  if (!(body.reason || "").trim()) throw new HttpError(400, "Give a reason — it's kept in the log.");
  const participant = await db.get<{ name: string }>(`voting/participants/${id}/${body.uid}`);
  if (!participant) throw new HttpError(404, "That student isn't in this session.");

  await db.push(`voting/adjust/${id}`, {
    uid: body.uid,
    good,
    reject,
    reason: body.reason.trim().slice(0, 200),
    by: admin.email,
    at: Date.now(),
  });
  await audit(admin.email, "vote.adjust", `"${session.title}": ${participant.name} Good ${good >= 0 ? "+" : ""}${good}, Reject ${reject >= 0 ? "+" : ""}${reject} — ${body.reason.trim()}`, session.category);
  return ok({ ok: true });
});
