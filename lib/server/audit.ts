import { db } from "./rtdb";

export interface AuditEntry {
  id: string;
  at: number;
  by: string;
  action: string;
  summary: string;
  club?: string | null;
}

/**
 * Appends to the activity log. Never throws — a logging hiccup must not undo
 * the action it describes.
 */
export async function audit(by: string, action: string, summary: string, club?: string | null) {
  try {
    await db.push("audit", { at: Date.now(), by, action, summary, club: club ?? null });
  } catch (e) {
    console.error("audit failed", e);
  }
}
