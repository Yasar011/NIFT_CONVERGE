import { handle } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { queryEntries } from "@/lib/server/entries";
import { getEventByKey, eventLabel } from "@/lib/events";
import { SLOT_LABEL, STATUS_LABEL } from "@/lib/registration-schema";
import { CATEGORY_META } from "@/lib/types";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const category = admin.role === "club_admin" ? admin.club! : new URL(req.url).searchParams.get("category");
  const { entries } = category ? await queryEntries("category", category) : await queryEntries(null);

  const head = ["Club", "Event", "Pick", "Status", "Present", "Name", "Student ID", "Dept", "Sem", "Gender", "Email", "Phone", "Hostel/Day", "Photo"];
  const rows = entries
    .sort((a, b) => a.eventKey.localeCompare(b.eventKey) || a.student.name.localeCompare(b.student.name))
    .map((e) => {
      const ev = getEventByKey(e.eventKey);
      return [
        CATEGORY_META[e.category]?.label,
        ev ? eventLabel(ev) : e.eventKey,
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
        e.student.residence,
        e.student.photoUrl,
      ];
    });
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  // Leading BOM so Excel opens the UTF-8 file correctly.
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="converge26-${category ?? "all"}.csv"`,
    },
  });
});
