import { unstable_cache } from "next/cache";
import { db, cached } from "./rtdb";
import { HttpError } from "./http";
import { DEFAULT_SETTINGS, type AppSettings } from "../settings-shared";

export type { AppSettings };

export async function readSettings(): Promise<AppSettings> {
  try {
    const data = await cached("settings", 15_000, () => db.get<Partial<AppSettings>>("settings/app"));
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  } catch {
    // Database unreachable — stay closed rather than crash.
    return DEFAULT_SETTINGS;
  }
}

/**
 * Cached for pages. Admin changes call revalidateTag("settings"); the short
 * revalidate also lets a scheduled opening/closing show up within a minute.
 */
export const getSettings = unstable_cache(readSettings, ["app-settings"], {
  tags: ["settings"],
  revalidate: 60,
});

/** Blocks selection changes once the main admin has frozen the final list. */
export async function assertNotFrozen() {
  if ((await readSettings()).selectionFrozen) {
    throw new HttpError(423, "Selections are frozen. The main admin must unfreeze them first.");
  }
}
