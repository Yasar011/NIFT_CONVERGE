import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { DECLARATION_POINTS, DECLARATION_TITLE, declarationIntro, fmtSignedAt, type DeclarationRecord } from "../declaration";

const A4 = { w: 595.28, h: 841.89 };
const M = 56; // margin
const INK = rgb(0.08, 0.07, 0.06);
const SOFT = rgb(0.38, 0.35, 0.31);

/** One A4 page per signed declaration, in the order given. */
export async function declarationsPdf(records: DeclarationRecord[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(records.length === 1 ? `Declaration — ${records[0].name}` : "CONVERGE 2026 declarations — NIFT Jodhpur");
  pdf.setAuthor("NIFT Jodhpur × CONVERGE 2026");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const r of records) await drawPage(pdf, pdf.addPage([A4.w, A4.h]), r, font, bold);
  return pdf.save();
}

// The standard PDF fonts only cover Latin-1-ish text; anything else becomes "?".
function safe(text: string, font: PDFFont) {
  let out = "";
  for (const ch of text.normalize("NFKC")) {
    try {
      font.widthOfTextAtSize(ch, 10);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function drawPage(pdf: PDFDocument, page: PDFPage, r: DeclarationRecord, font: PDFFont, bold: PDFFont) {
  const width = A4.w - 2 * M;
  let y = A4.h - M;
  const text = (s: string, opts: { x?: number; size?: number; f?: PDFFont; color?: typeof INK } = {}) => {
    const f = opts.f ?? font;
    page.drawText(safe(s, f), { x: opts.x ?? M, y, size: opts.size ?? 10, font: f, color: opts.color ?? INK });
  };
  const para = (s: string, size: number, indent = 0, f = font) => {
    for (const line of wrap(safe(s, f), f, size, width - indent)) {
      text(line, { x: M + indent, size, f });
      y -= size * 1.45;
    }
  };

  text("NIFT JODHPUR × CONVERGE 2026", { size: 9, f: bold, color: SOFT });
  y -= 22;
  text(DECLARATION_TITLE, { size: 16, f: bold });
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1.5, color: INK });
  y -= 22;

  const details: [string, string][] = [
    ["Name", r.name],
    ["Student ID", r.studentId],
    ["Department / Sem", `${r.department} · Semester ${r.semester}`],
    ["Gender", r.gender],
    ["Email / Phone", `${r.email} · ${r.phone}`],
    ["Final in", r.events.join(", ")],
  ];
  for (const [k, v] of details) {
    text(k, { size: 9, f: bold, color: SOFT });
    const lines = wrap(safe(v, font), font, 10, width - 110);
    lines.forEach((line, i) => {
      page.drawText(line, { x: M + 110, y: y - i * 14, size: 10, font, color: INK });
    });
    y -= 14 * lines.length + 3;
  }
  y -= 10;

  para(declarationIntro(r), 10.5);
  y -= 4;
  DECLARATION_POINTS.forEach((p, i) => {
    text(`${i + 1}.`, { size: 10.5, f: bold });
    para(p, 10.5, 18);
    y -= 3;
  });

  y -= 14;
  const png = await pdf.embedPng(Buffer.from(r.signature.split(",")[1], "base64"));
  const sig = png.scaleToFit(200, 70);
  page.drawImage(png, { x: M, y: y - sig.height, width: sig.width, height: sig.height });
  y -= sig.height + 6;
  page.drawLine({ start: { x: M, y }, end: { x: M + 220, y }, thickness: 0.8, color: INK });
  y -= 14;
  text(`Signature of ${r.name}`, { size: 10, f: bold });
  text(`Signed on ${fmtSignedAt(r.at)} IST`, { x: A4.w - M - 190, size: 10 });
  y -= 14;
  text("Place: NIFT Jodhpur", { size: 10 });

  y = M - 18;
  text(
    `Signed electronically on the NIFT Converge portal by ${r.email} · IP ${r.ip || "—"} · declaration v${r.version}`,
    { size: 7.5, color: SOFT }
  );
}
