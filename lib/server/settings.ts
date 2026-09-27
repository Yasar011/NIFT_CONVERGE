import { unstable_cache } from "next/cache";
import { db } from "./rtdb";

export interface AppSettings {
  registrationOpen: boolean;
}

const DEFAULTS: AppSettings = { registrationOpen: false };

export async function readSettings(): Promise<AppSettings> {
  try {
    const data = await db.get<Partial<AppSettings>>("settings/app");
    return { ...DEFAULTS, ...(data ?? {}) };
  } catch {
    // Database unreachable or not created yet — stay closed rather than crash.
    return DEFAULTS;
  }
}

/** Cached for pages; the admin toggle calls revalidateTag("settings"). */
export const getSettings = unstable_cache(readSettings, ["app-settings"], {
  tags: ["settings"],
  revalidate: 300,
});
