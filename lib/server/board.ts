import { unstable_cache } from "next/cache";
import { db } from "./rtdb";
import type { Announcement, Trial } from "../api-types";

export interface Board {
  notices: Pick<Announcement, "id" | "title" | "body" | "at">[];
  trials: Pick<Trial, "id" | "eventKey" | "category" | "title" | "date" | "time" | "venue" | "notes">[];
}

/** Indian date (YYYY-MM-DD) — trials are scheduled in local dates. */
const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

/**
 * Public notice board for the home page: notices posted to "Everyone" and
 * upcoming trials. Club, event and personal notices are never shown here.
 * Cached; posting/removing a notice or trial revalidates the "board" tag.
 */
export const getBoard = unstable_cache(
  async (): Promise<Board> => {
    try {
      const [notices, trials] = await Promise.all([
        db.get<Record<string, Omit<Announcement, "id">>>("announcements"),
        db.get<Record<string, Record<string, Omit<Trial, "id">>>>("trials"),
      ]);
      const today = todayIST();
      return {
        notices: Object.entries(notices ?? {})
          .filter(([, a]) => a.audience === "all")
          .map(([id, a]) => ({ id, title: a.title, body: a.body, at: a.at }))
          .sort((a, b) => b.at - a.at)
          .slice(0, 6),
        trials: Object.values(trials ?? {})
          .flatMap((byEvent) => Object.entries(byEvent ?? {}).map(([id, t]) => ({ ...t, id })))
          .filter((t) => t.date >= today)
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
          .slice(0, 8)
          .map(({ id, eventKey, category, title, date, time, venue, notes }) => ({ id, eventKey, category, title, date, time, venue, notes })),
      };
    } catch {
      return { notices: [], trials: [] };
    }
  },
  ["public-board"],
  { tags: ["board"], revalidate: 300 }
);
