import { handle, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { queryEntries } from "@/lib/server/entries";
import { getEventByKey, eventLabel } from "@/lib/events";
import { DAY_SCHOLAR, HOSTELS, SLOT_LABEL, STATUS_LABEL, stayLabel, type EntryStatus } from "@/lib/registration-schema";
import { CATEGORY_META } from "@/lib/types";
import type { EntryView } from "@/lib/api-types";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][], name: string) =>
  // Leading BOM so Excel opens the UTF-8 file correctly.
  new Response("﻿" + rows.map((r) => r.map(cell).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
const label = (key: string) => {
  const ev = getEventByKey(key);
  return ev ? eventLabel(ev) : key;
};

/** Hostels in walking order, then day scholars, then anyone who hasn't said. */
function hostelRank(e: EntryView) {
  if (e.student.residence === "Hostel" && e.student.hostel) {
    const i = HOSTELS.indexOf(e.student.hostel);
    return i === -1 ? HOSTELS.length : i;
  }
  if (e.student.residence === "Hostel") return HOSTELS.length;
  if (e.student.residence === DAY_SCHOLAR) return HOSTELS.length + 1;
  return HOSTELS.length + 2;
}
const roomNum = (r?: string) => {
  const n = parseInt((r ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

/**
 * Excel exports for Participants, following the page's filters:
 * ?category & ?event & ?status & ?q. `format=hostel` gives one row per student,
 * sorted by hostel and room — handy for finding people before trials.
 */
export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const params = new URL(req.url).searchParams;
  const event = params.get("event") || "";
  const status = params.get("status") || "";
  const q = (params.get("q") || "").trim().toLowerCase();
  const format = params.get("format");
  const category = admin.role === "club_admin" ? admin.club! : params.get("category") || "";
  if (event) assertClubAccess(admin, event.split(":")[0]);
  if (status && !STATUS_LABEL[status as EntryStatus]) throw new HttpError(400, "Unknown status.");

  const { entries: all } = event
    ? await queryEntries("eventKey", event)
    : category
      ? await queryEntries("category", category)
      : await queryEntries(null);
  const entries = all
    .filter((e) => !status || e.status === status)
    .filter((e) => !q || e.student.name.toLowerCase().includes(q) || e.student.studentId.toLowerCase().includes(q));

  const scope = [event ? label(event) : category ? CATEGORY_META[category as keyof typeof CATEGORY_META]?.short : "all", status && STATUS_LABEL[status as EntryStatus]]
    .filter(Boolean)
    .join("-")
    .replace(/[^A-Za-z0-9-]+/g, "_");

  if (format === "hostel") {
    // One row per student; list the events (in this filter) they're in.
    const byStudent = new Map<string, { e: EntryView; events: string[] }>();
    for (const e of entries) {
      const cur = byStudent.get(e.uid) ?? { e, events: [] };
      cur.events.push(`${label(e.eventKey)} (${STATUS_LABEL[e.status]})`);
      byStudent.set(e.uid, cur);
    }
    const rows = [...byStudent.values()].sort(
      (a, b) =>
        hostelRank(a.e) - hostelRank(b.e) ||
        roomNum(a.e.student.room) - roomNum(b.e.student.room) ||
        (a.e.student.room ?? "").localeCompare(b.e.student.room ?? "") ||
        a.e.student.name.localeCompare(b.e.student.name)
    );
    return csv(
      [
        ["Hostel", "Room", "Name", "Student ID", "Dept", "Sem", "Gender", "Phone", "Events"],
        ...rows.map(({ e, events }) => [
          e.student.residence === "Hostel" ? e.student.hostel || "Hostel (not given)" : e.student.residence || "Not given",
          e.student.room ?? "",
          e.student.name,
          e.student.studentId,
          e.student.department,
          e.student.semester,
          e.student.gender,
          e.student.phone,
          events.join("; "),
        ]),
      ],
      `converge26-hostel-list-${scope}.csv`
    );
  }

  const head = ["Club", "Event", "Pick", "Status", "Present", "Name", "Student ID", "Dept", "Sem", "Gender", "Email", "Phone", "Hostel / Room", "Photo"];
  const rows = entries
    .sort((a, b) => a.eventKey.localeCompare(b.eventKey) || a.student.name.localeCompare(b.student.name))
    .map((e) => [
      CATEGORY_META[e.category]?.label,
      label(e.eventKey),
      SLOT_LABEL[e.slot],
      STATUS_LABEL[e.status],
      e.attendance?.present ? "Yes" : "",
      e.student.name,
      e.student.studentId,
      e.student.department,
      e.student.semester,
      e.student.gender,
      e.student.email,
      e.student.phone,
      stayLabel(e.student),
      e.student.photoUrl.startsWith("data:") ? "" : e.student.photoUrl,
    ]);
  return csv([head, ...rows], `converge26-${scope}.csv`);
});
