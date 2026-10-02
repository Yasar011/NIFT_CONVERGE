import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { deviceKey, notify, type StoredSubscription } from "@/lib/server/push";

interface SubscriptionJSON {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/** Turn on notifications for this phone/browser. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const { subscription, test } = await readJson<{ subscription: SubscriptionJSON; test?: boolean }>(req);
  const endpoint = subscription?.endpoint ?? "";
  const keys = subscription?.keys ?? {};
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys.p256dh || !keys.auth) {
    throw new HttpError(400, "That notification subscription isn't valid.");
  }
  const record: StoredSubscription = {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    at: Date.now(),
    ua: (req.headers.get("user-agent") || "").slice(0, 160),
  };
  await db.set(`push/${user.uid}/${deviceKey(endpoint)}`, record);
  if (test) {
    await notify(
      { uids: [user.uid] },
      { title: "🔔 Notifications are on", body: "You'll get trials, notices and selection updates here.", url: "/me", tag: "welcome" }
    );
  }
  return ok({ ok: true });
});

/** Turn off notifications for this phone/browser. */
export const DELETE = handle(async (req: Request) => {
  const user = await requireUser(req);
  const endpoint = new URL(req.url).searchParams.get("endpoint") || "";
  if (!endpoint) throw new HttpError(400, "Missing subscription.");
  await db.remove(`push/${user.uid}/${deviceKey(endpoint)}`);
  return ok({ ok: true });
});
