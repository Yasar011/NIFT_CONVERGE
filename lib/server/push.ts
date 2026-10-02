import crypto from "node:crypto";
import webpush from "web-push";
import { db } from "./rtdb";
import { queryEntries } from "./entries";

// push/{uid}/{deviceKey} = { endpoint, keys: { p256dh, auth }, at, ua }
export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  at: number;
  ua?: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Page to open when the notification is tapped. */
  url?: string;
  /** Same tag replaces an older notification instead of stacking. */
  tag?: string;
}

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://nift-converge.vercel.app", pub, priv);
  configured = true;
  return true;
}

export const deviceKey = (endpoint: string) => crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 24);

/** Who to notify: specific students, everyone in an event or club, or every subscribed phone. */
export type Audience =
  | { uids: string[] }
  | { event: string }
  | { club: string }
  | { everyone: true };

async function resolve(audience: Audience): Promise<Record<string, Record<string, StoredSubscription>>> {
  if ("everyone" in audience) {
    return (await db.get<Record<string, Record<string, StoredSubscription>>>("push")) ?? {};
  }
  let uids: string[];
  if ("uids" in audience) uids = audience.uids;
  else {
    const { entries } = "event" in audience ? await queryEntries("eventKey", audience.event) : await queryEntries("category", audience.club);
    // People still in it — not those turned down or locked out.
    uids = entries.filter((e) => e.status !== "not_selected" && e.status !== "locked").map((e) => e.uid);
  }
  const unique = [...new Set(uids)];
  const subs = await Promise.all(unique.map((u) => db.get<Record<string, StoredSubscription>>(`push/${u}`)));
  return Object.fromEntries(unique.map((u, i) => [u, subs[i] ?? {}]));
}

/**
 * Sends a phone notification. Never throws — notifications are best-effort and
 * must not break the action that triggered them. Expired subscriptions are removed.
 */
export async function notify(audience: Audience, message: PushMessage): Promise<{ sent: number; failed: number }> {
  try {
    if (!configure()) return { sent: 0, failed: 0 };
    const byUser = await resolve(audience);
    const jobs = Object.entries(byUser).flatMap(([uid, devices]) =>
      Object.entries(devices ?? {}).map(([key, sub]) => ({ uid, key, sub }))
    );
    const payload = JSON.stringify({ ...message, url: message.url ?? "/me" });
    const dead: Record<string, null> = {};
    let sent = 0;
    let failed = 0;

    // Send in batches so hundreds of phones don't open hundreds of sockets at once.
    for (let i = 0; i < jobs.length; i += 25) {
      await Promise.all(
        jobs.slice(i, i + 25).map(async ({ uid, key, sub }) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
            sent++;
          } catch (e) {
            failed++;
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) dead[`push/${uid}/${key}`] = null; // phone unsubscribed
          }
        })
      );
    }
    if (Object.keys(dead).length) await db.update("", dead);
    return { sent, failed };
  } catch (e) {
    console.error("notify failed", e);
    return { sent: 0, failed: 0 };
  }
}

export async function subscriberCount() {
  const all = await db.get<Record<string, Record<string, true>>>("push", { shallow: true });
  return Object.keys(all ?? {}).length;
}
