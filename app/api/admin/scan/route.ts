import { revalidateTag } from "next/cache";
import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { entryId, readSel } from "@/lib/server/selection";
import { getSession } from "@/lib/server/voting";
import { cldTransform } from "@/lib/registration-schema";
import type { EntryRecord, LiveParticipant } from "@/lib/api-types";
import { audit } from "@/lib/server/audit";

/**
 * Club admin scans a student's QR pass at the event: marks them present and,
 * if a voting session is chosen, puts them live (closing the previous one).
 */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const body = await readJson<{ code: string; eventKey: string; sessionId?: string }>(req);
  const uid = (body.code || "").replace(/^CNV26:/, "").trim();
  if (!/^[A-Za-z0-9]{10,40}$/.test(uid)) throw new HttpError(400, "That isn't a Converge pass.");
  assertClubAccess(admin, (body.eventKey || "").split(":")[0]);

  const id = entryId(uid, body.eventKey);
  const [entry, sel] = await Promise.all([db.get<EntryRecord>(`entries/${id}`), readSel()]);
  if (!entry) throw new HttpError(404, "This student isn't registered for this event.");
  const status = sel.status?.[id] ?? "registered";

  const now = Date.now();
  await db.update(`entries/${id}`, { attendance: { present: true, at: now, by: admin.email } });

  let live = false;
  if (body.sessionId) {
    const session = await getSession(body.sessionId);
    if (!session || session.eventKey !== body.eventKey) throw new HttpError(404, "Voting session not found.");
    if (session.status === "ended" || session.status === "published") {
      throw new HttpError(409, "This voting session has ended.");
    }
    if (status === "locked") {
      throw new HttpError(409, "This student already has 3 selections — they can't be voted on.");
    }
    const participant: LiveParticipant = {
      uid,
      entryId: id,
      name: entry.student.name,
      department: entry.student.department,
      photoUrl: cldTransform(entry.student.photoUrl, "c_fill,g_face,w_600,h_600,q_auto,f_auto"),
      videoUrl: entry.video?.url ?? null,
      since: now,
    };
    await db.update("voting", {
      [`sessions/${body.sessionId}/live`]: participant,
      [`sessions/${body.sessionId}/status`]: "running",
      [`participants/${body.sessionId}/${uid}`]: {
        name: participant.name,
        department: participant.department,
        photoUrl: participant.photoUrl,
        entryId: id,
        scannedAt: now,
      },
    });
    live = true;
    revalidateTag("live", { expire: 0 });
  }

  await audit(admin.email, "scan", `Scanned ${entry.student.name} at ${body.eventKey}${live ? " — live for voting" : ""}`, entry.category);
  return ok({
    student: {
      name: entry.student.name,
      department: entry.student.department,
      semester: entry.student.semester,
      photoUrl: entry.student.photoUrl,
    },
    status,
    live,
  });
});
