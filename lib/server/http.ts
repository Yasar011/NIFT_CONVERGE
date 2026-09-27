import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const ok = (data: unknown = { ok: true }, init?: ResponseInit) => NextResponse.json(data, init);

/** Wraps a route handler so thrown HttpErrors become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
      }
      console.error(e);
      const msg = e instanceof Error && /NOT_FOUND|has not been used|disabled/.test(e.message)
        ? "Database is not set up yet."
        : "Something went wrong. Please try again.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid request body.");
  }
}

/** Converts Firestore Timestamps (and nested ones) to ISO strings for JSON. */
export function serialise<T>(value: T): T {
  if (value && typeof value === "object") {
    const v = value as unknown as { toDate?: () => Date };
    if (typeof v.toDate === "function") return v.toDate().toISOString() as unknown as T;
    if (Array.isArray(value)) return value.map(serialise) as unknown as T;
    return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, serialise(x)])) as T;
  }
  return value;
}
