import { unstable_cache } from "next/cache";
import { db } from "./rtdb";
import type { Trial } from "../api-types";

/** A trial's start as a timestamp. Trials are entered in Indian time. */
export const trialStart = (t: Pick<Trial, "date" | "time">) => Date.parse(`${t.date}T${t.time}:00+05:30`);

export interface Deadline {
  id: string;
  at: number;
  title: string;
  date: string;
  time: string;
}

/**
 * Registration for an event closes when its first trial starts.
 * Returns eventKey → that first trial (only events that have trials).
 */
export async function readDeadlines(): Promise<Record<string, Deadline>> {
  const all = await db.get<Record<string, Record<string, Omit<Trial, "id">>>>("trials");
  const out: Record<string, Deadline> = {};
  for (const byEvent of Object.values(all ?? {})) {
    for (const [id, t] of Object.entries(byEvent ?? {})) {
      const at = trialStart(t);
      if (!Number.isFinite(at)) continue;
      if (!out[t.eventKey] || at < out[t.eventKey].at) out[t.eventKey] = { id, at, title: t.title, date: t.date, time: t.time };
    }
  }
  return out;
}

/** Cached for pages; adding/removing a trial revalidates the "board" tag. */
export const getDeadlines = unstable_cache(
  async () => {
    try {
      return await readDeadlines();
    } catch {
      return {};
    }
  },
  ["event-deadlines"],
  { tags: ["board"], revalidate: 120 }
);

export const fmtDeadline = (d: Pick<Deadline, "date" | "time">) => {
  const [h, m] = d.time.split(":").map(Number);
  const day = new Date(`${d.date}T00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
