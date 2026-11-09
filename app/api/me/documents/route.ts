import { handle, ok, readJson, HttpError } from "@/lib/server/http";
import { requireUser, type SessionUser } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { readSel } from "@/lib/server/selection";
import { queryEntries } from "@/lib/server/entries";
import { audit } from "@/lib/server/audit";
import { DOC_KINDS, validAadhaar, validBloodGroup, validDob, type DocKind } from "@/lib/documents";
import type { RegistrationRecord } from "@/lib/api-types";

// Files are checked by their first bytes, not just the type the browser claims.
const MAGIC: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
};

/**
 * Whose documents: the student's own (final list + declaration signed, same gate as the kit),
 * or — for the main admin only — `forUid`, e.g. when a student sends them on WhatsApp.
 */
async function target(user: SessionUser, forUid: string | null | undefined) {
  const byAdmin = !!forUid && forUid !== user.uid;
  if (byAdmin && user.role !== "main_admin") throw new HttpError(403, "Only the main admin can upload for a student.");
  if (byAdmin && !/^[A-Za-z0-9]+$/.test(forUid!)) throw new HttpError(400, "Choose a student.");
  const uid = byAdmin ? forUid! : user.uid;
  const [reg, sel] = await Promise.all([db.get<RegistrationRecord>(`registrations/${uid}`), readSel()]);
  if (!reg) throw new HttpError(404, byAdmin ? "Student not found." : "Register first.");
  if (!sel.counts?.[uid]) throw new HttpError(403, "Documents are only for students in the final list.");
  if (!byAdmin && !reg.declaration) throw new HttpError(403, "Sign your declaration first, then upload your documents.");
  return { uid, reg, by: byAdmin ? " (by admin)" : "" };
}

/**
 * Upload one document as the raw request body: `PUT ?kind=photo|aadhaar|undertaking`
 * with Content-Type image/jpeg, image/png or application/pdf. Replaces any earlier one.
 */
export const PUT = handle(async (req: Request) => {
  const user = await requireUser(req);
  const params = new URL(req.url).searchParams;
  const kind = params.get("kind") as DocKind;
  if (!Object.hasOwn(DOC_KINDS, kind)) throw new HttpError(400, "Choose a document.");
  const spec = DOC_KINDS[kind];
  const { uid, reg, by } = await target(user, params.get("forUid"));

  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!(spec.types as readonly string[]).includes(type)) {
    throw new HttpError(415, kind === "photo" ? "Photo must be a JPG or PNG." : "Upload a PDF.");
  }
  const tooBig = `File is too big — keep it under ${spec.maxBytes / 1e6} MB.`;
  if (Number(req.headers.get("content-length") ?? 0) > spec.maxBytes) throw new HttpError(413, tooBig);
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length > spec.maxBytes) throw new HttpError(413, tooBig);
  if (bytes.length < 1000 || !MAGIC[type].every((b, i) => bytes[i] === b)) {
    throw new HttpError(422, `That file doesn't look like a real ${type === "application/pdf" ? "PDF" : "image"}.`);
  }

  const meta = { type, size: bytes.length, at: Date.now() };
  // shortcut: files live in RTDB as base64 (private, ~50 students × ~2 MB); move to Storage if this grows.
  await db.update("", {
    [`documents/${uid}/${kind}`]: { ...meta, data: bytes.toString("base64") },
    [`registrations/${uid}/documents/${kind}`]: meta,
  });
  await audit(user.email, "final", `${reg.fullName}: uploaded ${spec.label.toLowerCase()}${by}`);
  return ok({ ok: true });
});

/** Details for the ID card: name (as on Aadhaar), date of birth, Aadhaar number and blood group. */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser(req);
  const body = await readJson<{ fullName?: string; dob?: string; aadhaarNo?: string; bloodGroup?: string; forUid?: string }>(req);
  const { uid, reg, by } = await target(user, body.forUid);
  const fullName = String(body.fullName ?? "").trim().replace(/\s+/g, " ");
  const aadhaarNo = String(body.aadhaarNo ?? "").replace(/\s/g, "");

  const errors: Record<string, string> = {};
  if (!fullName) errors.fullName = "Enter your full name.";
  else if (fullName.length > 80) errors.fullName = "Name is too long.";
  if (!validDob(body.dob)) errors.dob = "Enter a valid date of birth.";
  if (!validAadhaar(aadhaarNo)) errors.aadhaarNo = "Enter your 12-digit Aadhaar number — check it again.";
  if (!validBloodGroup(body.bloodGroup)) errors.bloodGroup = "Choose your blood group.";
  if (Object.keys(errors).length) throw new HttpError(422, "Please fix the highlighted fields.", errors);

  const updates: Record<string, unknown> = {
    [`registrations/${uid}/fullName`]: fullName,
    [`registrations/${uid}/dob`]: body.dob,
    [`registrations/${uid}/aadhaarNo`]: aadhaarNo,
    [`registrations/${uid}/bloodGroup`]: body.bloodGroup,
    [`registrations/${uid}/updatedAt`]: Date.now(),
  };
  // Keep the copy on each event entry (what club admins see) in step.
  const { entries } = await queryEntries("uid", uid);
  for (const e of entries) updates[`entries/${e.id}/student/name`] = fullName;
  await db.update("", updates);
  await audit(user.email, "profile", `${reg.fullName}${fullName !== reg.fullName ? ` → ${fullName}` : ""}: ID card details updated${by}`);
  return ok({ ok: true });
});
