import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireMainAdmin, isAllowedEmail } from "@/lib/server/auth";
import { db, keyOf, forget } from "@/lib/server/rtdb";
import { audit } from "@/lib/server/audit";

interface Block {
  email: string;
  reason: string;
  by: string;
  at: number;
}

export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const all = await db.get<Record<string, Block>>("blocked");
  return ok({ blocked: Object.values(all ?? {}).sort((a, b) => b.at - a.at) });
});

/** Blocks an account from registering or voting (admins can't be blocked). */
export const POST = handle(async (req: Request) => {
  const me = await requireMainAdmin(req);
  const body = await readJson<{ email: string; reason?: string }>(req);
  const email = (body.email || "").trim().toLowerCase();
  if (!isAllowedEmail(email)) throw new HttpError(400, "Use a NIFT email address.");
  if (email === me.email) throw new HttpError(400, "You can't block yourself.");
  const block: Block = { email, reason: (body.reason || "").trim().slice(0, 200), by: me.email, at: Date.now() };
  await db.set(`blocked/${keyOf(email)}`, block);
  forget(`blocked:${email}`);
  await audit(me.email, "block", `Blocked ${email}${block.reason ? ` — ${block.reason}` : ""}`);
  return ok({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const me = await requireMainAdmin(req);
  const email = (new URL(req.url).searchParams.get("email") || "").toLowerCase();
  if (!email) throw new HttpError(400, "Missing email.");
  await db.remove(`blocked/${keyOf(email)}`);
  forget(`blocked:${email}`);
  await audit(me.email, "unblock", `Unblocked ${email}`);
  return ok({ ok: true });
});
