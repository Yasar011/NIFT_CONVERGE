import { declarationsPdf } from "./declaration-pdf";
import type { DeclarationRecord } from "../declaration";

/** A signature is a PNG data URL from the drawing pad — small, and really a PNG. */
export function validSignature(sig: unknown): sig is string {
  if (typeof sig !== "string" || sig.length > 300_000) return false;
  const prefix = "data:image/png;base64,";
  if (!sig.startsWith(prefix)) return false;
  const bytes = Buffer.from(sig.slice(prefix.length), "base64");
  return bytes.length > 500 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

export const fileSafe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";

export async function pdfResponse(records: DeclarationRecord[], filename: string) {
  const bytes = await declarationsPdf(records);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
