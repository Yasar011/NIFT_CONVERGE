import { handle, HttpError } from "@/lib/server/http";
import { requireMainAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/rtdb";
import { DOC_KINDS, type DocKind } from "@/lib/documents";

/** One student's uploaded file: `?uid=…&kind=photo|aadhaar|undertaking`. The ZIP is built in the browser. */
export const GET = handle(async (req: Request) => {
  await requireMainAdmin(req);
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid") ?? "";
  const kind = url.searchParams.get("kind") as DocKind;
  if (!/^[A-Za-z0-9]+$/.test(uid) || !Object.hasOwn(DOC_KINDS, kind)) throw new HttpError(400, "Choose a student and a document.");
  const doc = await db.get<{ type: string; data: string }>(`documents/${uid}/${kind}`);
  if (!doc) throw new HttpError(404, "Not uploaded yet.");
  return new Response(Buffer.from(doc.data, "base64"), {
    headers: { "Content-Type": doc.type, "Cache-Control": "private, no-store" },
  });
});
