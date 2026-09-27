import { revalidateTag } from "next/cache";
import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { getSession, tallies } from "@/lib/server/voting";
import type { PublishedResult } from "@/lib/api-types";

type Ctx = { params: Promise<{ id: string }> };

async function load(req: Request, ctx: Ctx) {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) throw new HttpError(404, "Voting session not found.");
  assertClubAccess(admin, session.category);
  return { admin, session, id };
}

/** Session + live vote counts. Only admins ever see counts. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { admin, session, id } = await load(req, ctx);
  const t = await tallies(id);
  return ok({ session, tallies: t.tallies, adjustments: admin.role === "main_admin" ? t.adjustments : [] });
});

type Action = "stop" | "end" | "publish" | "reopen" | "unpublish" | "delete";

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { admin, session, id } = await load(req, ctx);
  const { action } = await readJson<{ action: Action }>(req);
  const now = Date.now();

  switch (action) {
    case "stop": // pause: nobody live until the next scan
      await db.update(`voting/sessions/${id}`, { live: null });
      break;

    case "end":
      if (session.status === "published") throw new HttpError(409, "Already published.");
      await db.update(`voting/sessions/${id}`, { live: null, status: "ended", endedAt: now });
      break;

    case "reopen":
      if (session.status !== "ended") throw new HttpError(409, "Only an ended session can be reopened.");
      await db.update(`voting/sessions/${id}`, { status: "running" });
      break;

    case "publish": {
      if (session.status !== "ended") throw new HttpError(409, "End the session before publishing results.");
      const { tallies: list } = await tallies(id);
      // Ranked by Good votes (incl. adjustments). Reject counts are never published.
      let rank = 0;
      let last = -1;
      const rows = list.map((t, i) => {
        const good = t.good + t.adjGood;
        if (good !== last) rank = i + 1;
        last = good;
        return { rank, name: t.name, department: t.department, photoUrl: t.photoUrl, good };
      });
      const result: PublishedResult = {
        sessionId: id,
        title: session.title,
        eventName: session.eventName,
        category: session.category,
        date: session.date,
        publishedAt: now,
        rows,
      };
      await db.update("", {
        [`results/${id}`]: result,
        [`voting/sessions/${id}/status`]: "published",
        [`voting/sessions/${id}/publishedAt`]: now,
      });
      revalidateTag("results", { expire: 0 });
      break;
    }

    case "unpublish":
      if (admin.role !== "main_admin") throw new HttpError(403, "Main admin only.");
      await db.update("", { [`results/${id}`]: null, [`voting/sessions/${id}/status`]: "ended" });
      revalidateTag("results", { expire: 0 });
      break;

    case "delete":
      if (session.status === "running" || session.status === "published") {
        throw new HttpError(409, "End (and unpublish) the session before deleting it.");
      }
      await db.update("voting", {
        [`sessions/${id}`]: null,
        [`votes/${id}`]: null,
        [`participants/${id}`]: null,
        [`adjust/${id}`]: null,
        ...(session.publicId ? { [`public/${session.publicId}`]: null } : {}),
      });
      break;

    default:
      throw new HttpError(400, "Unknown action.");
  }
  revalidateTag("live", { expire: 0 });
  return ok({ ok: true });
});
