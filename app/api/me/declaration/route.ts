import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import { queryEntries } from "@/lib/server/entries";
import { audit } from "@/lib/server/audit";
import { fileSafe, pdfResponse, validSignature } from "@/lib/server/declarations";
import { DECLARATION_VERSION, type DeclarationRecord } from "@/lib/declaration";
import { getEventByKey, eventLabel } from "@/lib/events";
import type { RegistrationRecord } from "@/lib/api-types";

/** The student's own signed copy, as a PDF. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const rec = await db.get<DeclarationRecord>(`declarations/${user.uid}`);
  if (!rec) throw new HttpError(404, "You haven't signed the declaration yet.");
  return pdfResponse([rec], `declaration-${fileSafe(rec.studentId)}.pdf`);
});

/**
 * Students in the final list sign the declaration once (drawn signature).
 * It can't be changed afterwards — the main admin can reset it if needed.
 */
export const PUT = handle(async (req: Request) => {
  const user = await requireUser(req);
  const body = await readJson<{ agree?: boolean; signature?: string }>(req);
  const [reg, sel, existing] = await Promise.all([
    db.get<RegistrationRecord>(`registrations/${user.uid}`),
    readSel(),
    db.get<{ at: number }>(`declarations/${user.uid}/at`),
  ]);
  if (!reg) throw new HttpError(404, "Register first.");
  if (!sel.counts?.[user.uid]) throw new HttpError(403, "The declaration is only for students in the final list.");
  if (existing) throw new HttpError(409, "You've already signed the declaration.");
  if (body.agree !== true) throw new HttpError(422, "Tick the box to agree to the declaration.", { agree: "Required." });
  if (!validSignature(body.signature)) throw new HttpError(422, "Draw your signature in the box.", { signature: "Required." });

  const { entries } = await queryEntries("uid", user.uid);
  const events = entries
    .filter((e) => e.status === "selected")
    .map((e) => {
      const ev = getEventByKey(e.eventKey);
      return ev ? eventLabel(ev) : e.eventKey;
    });
  const at = Date.now();
  const record: DeclarationRecord = {
    uid: user.uid,
    name: reg.fullName,
    studentId: reg.studentId,
    department: reg.department,
    semester: reg.semester,
    gender: reg.gender,
    email: reg.email,
    phone: reg.phone,
    events,
    signature: body.signature,
    at,
    version: DECLARATION_VERSION,
    ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim(),
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  };
  await db.update("", {
    [`declarations/${user.uid}`]: record,
    [`registrations/${user.uid}/declaration`]: { at, version: DECLARATION_VERSION },
  });
  await audit(user.email, "final", `${reg.fullName} (${reg.studentId}) signed the Converge declaration`);
  return ok({ ok: true });
});
