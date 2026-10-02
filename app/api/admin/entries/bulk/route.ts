import { after } from "next/server";
import { notify } from "@/lib/server/push";
import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { getEventByKey, eventLabel } from "@/lib/events";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel, setEntryStatus } from "@/lib/server/selection";
import { assertNotFrozen } from "@/lib/server/settings";
import { audit } from "@/lib/server/audit";
import { STATUS_LABEL, type EntryStatus } from "@/lib/registration-schema";
import type { EntryRecord } from "@/lib/api-types";

type Body = {
  ids: string[];
  action: "status" | "present" | "recommend" | "notice";
  status?: EntryStatus;
  present?: boolean;
  recommend?: boolean;
  notice?: { title: string; body: string };
};

// Bulk actions never make or undo a *final* selection — that stays one-by-one
// (or via the approval queue) behind the main admin's password.
const BULK_STATUSES: EntryStatus[] = ["registered", "shortlisted", "not_selected"];

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<Body>(req);
  const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])].filter((x) => typeof x === "string");
  if (!ids.length) throw new HttpError(400, "Select at least one student.");
  if (ids.length > 300) throw new HttpError(400, "Select at most 300 at a time.");

  const entries = await Promise.all(ids.map((id) => db.get<EntryRecord>(`entries/${id}`)));
  const found = ids.map((id, i) => ({ id, entry: entries[i] })).filter((x): x is { id: string; entry: EntryRecord } => !!x.entry);
  for (const { entry } of found) assertClubAccess(admin, entry.category); // all-or-nothing on permissions

  const results: { id: string; ok: boolean; error?: string }[] = ids
    .filter((id) => !found.some((f) => f.id === id))
    .map((id) => ({ id, ok: false, error: "Entry not found." }));
  const now = Date.now();

  if (body.action === "notice") {
    const title = (body.notice?.title || "").trim().slice(0, 100);
    const text = (body.notice?.body || "").trim().slice(0, 1000);
    if (!title || !text) throw new HttpError(400, "Add a title and a message.");
    const uids = [...new Set(found.map((f) => f.entry.uid))];
    const clubs = [...new Set(found.map((f) => f.entry.category))];
    await db.push("announcements", {
      title,
      body: text,
      audience: "students",
      uids,
      club: admin.role === "club_admin" ? admin.club : clubs.length === 1 ? clubs[0] : null,
      createdBy: admin.email,
      at: now,
    });
    await audit(admin.email, "announce", `Sent "${title}" to ${uids.length} student(s)`, admin.club ?? (clubs.length === 1 ? clubs[0] : null));
    after(() => notify({ uids }, { title: `📣 ${title}`, body: text, url: "/me", tag: `notice-${now}` }));
    return ok({ results: [...results, ...found.map((f) => ({ id: f.id, ok: true }))], sentTo: uids.length });
  }

  if (body.action === "status" || body.action === "recommend") await assertNotFrozen();
  if (body.action === "status" && !BULK_STATUSES.includes(body.status as EntryStatus)) {
    throw new HttpError(400, "Bulk can only set Registered, Shortlisted or Not selected.");
  }
  const sel = await readSel();

  const shortlisted: string[] = [];
  // One at a time: selection changes are transactional and order-dependent.
  for (const { id } of found) {
    const current = sel.status?.[id] ?? "registered";
    try {
      if (body.action === "status") {
        if (current === "selected") throw new HttpError(409, "Already selected — change it individually.");
        if (current === "locked") throw new HttpError(409, "Locked (3 selections).");
        await setEntryStatus(id, body.status!);
        if (body.status === "shortlisted" && current !== "shortlisted") shortlisted.push(id);
        const extra: Record<string, unknown> = { updatedAt: now, updatedBy: admin.email };
        if (body.status === "not_selected") extra.recommendation = null;
        await db.update(`entries/${id}`, extra);
      } else if (body.action === "present") {
        await db.update(`entries/${id}`, { attendance: { present: !!body.present, at: now, by: admin.email }, updatedAt: now, updatedBy: admin.email });
      } else if (body.action === "recommend") {
        if (body.recommend && (current === "selected" || current === "locked" || current === "not_selected")) {
          throw new HttpError(409, `Can't recommend — ${STATUS_LABEL[current].toLowerCase()}.`);
        }
        await db.update(`entries/${id}`, {
          recommendation: body.recommend ? { state: "pending", by: admin.email, at: now, note: "" } : null,
          updatedAt: now,
          updatedBy: admin.email,
        });
      } else {
        throw new HttpError(400, "Unknown action.");
      }
      results.push({ id, ok: true });
    } catch (e) {
      if (e instanceof HttpError && e.status === 400 && e.message === "Unknown action.") throw e;
      results.push({ id, ok: false, error: e instanceof Error ? e.message : "Failed." });
    }
  }

  for (const id of shortlisted) {
    const entry = found.find((f) => f.id === id)!.entry;
    const ev = getEventByKey(entry.eventKey);
    after(() =>
      notify({ uids: [entry.uid] }, { title: "⭐ You're shortlisted!", body: `${ev ? eventLabel(ev) : "Your event"} — watch My Converge for the next step.`, url: "/me", tag: `status-${id}` })
    );
  }
  const done = results.filter((r) => r.ok).length;
  const what =
    body.action === "status" ? `→ ${STATUS_LABEL[body.status!]}` : body.action === "present" ? (body.present ? "marked present" : "marked absent") : body.recommend ? "recommended" : "recommendation withdrawn";
  const clubs = [...new Set(found.map((f) => f.entry.category))];
  await audit(admin.email, `bulk.${body.action}`, `Bulk: ${done} of ${ids.length} entries ${what}`, admin.club ?? (clubs.length === 1 ? clubs[0] : null));
  return ok({ results });
});
