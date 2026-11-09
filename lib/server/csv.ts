import { creditLine } from "../credit";

/** One CSV cell, quoted when needed. */
export const cell = (v: unknown) => {
  let s = String(v ?? "");
  // A name like "=HYPERLINK(...)" must stay text in Excel, never run as a formula.
  if (/^[=@\t\r]/.test(s) || /^[+-](?![\d\s]*$)/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV download that opens straight in Excel, with the portal credit under the table. */
export const csv = (rows: unknown[][], name: string) =>
  // Leading BOM so Excel opens the UTF-8 file correctly.
  new Response("﻿" + [...rows, [], [creditLine()]].map((r) => r.map(cell).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
