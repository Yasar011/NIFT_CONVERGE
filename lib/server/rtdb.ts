// Minimal Realtime Database client over REST, authenticated as the service
// account (bypasses security rules, which deny all browser access).
// REST keeps serverless functions stateless — no long-lived websocket — and
// ETag conditional writes give us safe read-modify-write transactions.
import { accessToken } from "./google";
import { HttpError } from "./http";

const BASE =
  process.env.FIREBASE_DATABASE_URL ||
  `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`;

const token = accessToken;

type Query = {
  orderBy?: string;
  equalTo?: string | number | boolean;
  endAt?: string | number;
  limitToLast?: number;
  shallow?: boolean;
};

function url(path: string, q?: Query) {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const u = new URL(`${BASE}/${clean}.json`);
  if (q?.orderBy) u.searchParams.set("orderBy", JSON.stringify(q.orderBy));
  if (q?.equalTo !== undefined) u.searchParams.set("equalTo", JSON.stringify(q.equalTo));
  if (q?.endAt !== undefined) u.searchParams.set("endAt", JSON.stringify(q.endAt));
  if (q?.limitToLast) u.searchParams.set("limitToLast", String(q.limitToLast));
  if (q?.shallow) u.searchParams.set("shallow", "true");
  return u.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One REST call. If the database is busy (429) or has a hiccup (5xx / network),
 * wait a random 100–1500 ms and retry, up to 4 times — random jitter spreads a
 * burst of requests (e.g. hundreds of logins at once) instead of piling them up.
 */
async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, q?: Query) {
  const init = {
    method,
    headers: { Authorization: `Bearer ${await token()}`, ...headers, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store" as const,
  };
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url(path, q), init);
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await sleep(100 * 2 ** attempt + Math.random() * 300 * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt >= 4) throw e;
      await sleep(100 * 2 ** attempt + Math.random() * 300 * (attempt + 1));
    }
  }
}

/** Tiny per-instance TTL cache for hot, rarely-changing reads (roles, settings). */
const memo = new Map<string, { at: number; value: unknown }>();
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  memo.set(key, { at: Date.now(), value });
  if (memo.size > 5000) memo.clear();
  return value;
}
export const forget = (key: string) => memo.delete(key);

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RTDB ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const db = {
  async get<T = unknown>(path: string, q?: Query): Promise<T | null> {
    return json<T | null>(await call("GET", path, undefined, {}, q));
  },
  async set(path: string, value: unknown) {
    await json(await call("PUT", path, value));
  },
  /** Multi-location atomic update: keys are paths relative to `path`. */
  async update(path: string, values: Record<string, unknown>) {
    await json(await call("PATCH", path, values));
  },
  async remove(path: string) {
    await json(await call("DELETE", path));
  },
  /** Push with a server-generated, time-ordered key. */
  async push(path: string, value: unknown): Promise<string> {
    return (await json<{ name: string }>(await call("POST", path, value))).name;
  },

  /**
   * Read-modify-write with optimistic concurrency. `fn` receives the current
   * value and returns the new one. Return `undefined` to leave it untouched,
   * or throw an HttpError to abort with an error.
   */
  async transaction<T>(path: string, fn: (current: T | null) => T | null | undefined, retries = 12): Promise<T | null> {
    for (let i = 0; i < retries; i++) {
      const res = await call("GET", path, undefined, { "X-Firebase-ETag": "true" });
      const etag = res.headers.get("ETag");
      const current = await json<T | null>(res);
      const next = fn(current);
      if (next === undefined) return current;
      const put = await call("PUT", path, next, { "if-match": etag ?? "" });
      if (put.ok) return next;
      if (put.status !== 412) await json(put);
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 120 * (i + 1)));
    }
    throw new HttpError(503, "Too many people are updating this right now — try again.");
  },

  /** Writes only if nothing exists at `path`. Returns false if it already existed. */
  async create(path: string, value: unknown): Promise<boolean> {
    let existed = false;
    await this.transaction(path, (cur) => {
      if (cur !== null) {
        existed = true;
        return undefined;
      }
      return value;
    });
    return !existed;
  },
};

/** RTDB keys can't contain . # $ [ ] / */
export const keyOf = (s: string) => s.trim().toLowerCase().replace(/\./g, ",").replace(/[#$[\]/]/g, "_");
