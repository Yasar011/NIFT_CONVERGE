"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Download, FileArchive, FileSpreadsheet } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, inputCls, useDownload } from "./kit";
import { DOC_KINDS, DOC_LIST, ageOn, docsComplete, extOf, type DocKind, type DocMeta } from "@/lib/documents";

interface Student {
  uid: string;
  name: string;
  studentId: string;
  gender: string;
  dob: string;
  aadhaarNo: string;
  documents: Partial<Record<DocKind, DocMeta>>;
}

type Mode = "student" | DocKind;
const MODES: { value: Mode; label: string; folder?: string }[] = [
  { value: "student", label: "Folder for each student" },
  { value: "photo", label: "All photos in one folder", folder: "Photos" },
  { value: "aadhaar", label: "All Aadhaar cards in one folder", folder: "Aadhaar cards" },
  { value: "undertaking", label: "All undertakings in one folder", folder: "Parents undertakings" },
];

// Windows/Mac-safe file and folder names.
const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim();
const label = (s: Student) => clean(`${s.name} (${s.studentId})`);
const short = (k: DocKind) => (k === "photo" ? "Photo" : k === "aadhaar" ? "Aadhaar" : "Undertaking");

/** ID card details and uploaded documents of the final list, with Excel and ZIP downloads. */
export default function FinalDocuments({ students }: { students: Student[] }) {
  const { api } = useAuth();
  const download = useDownload();
  const [mode, setMode] = useState<Mode>("student");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const done = students.filter((s) => docsComplete(s)).length;
  const noAadhaar = students.filter((s) => !s.documents.aadhaar);
  const [copied, setCopied] = useState<string | null>(null);

  // Ready to paste in the WhatsApp group.
  async function copyMissing() {
    const text = [
      "*CONVERGE 2026 — Aadhaar card pending*",
      "",
      `These ${noAadhaar.length} students in the final list have not uploaded their Aadhaar card yet:`,
      ...noAadhaar.map((s, i) => `${i + 1}. ${s.name} (${s.studentId})`),
      "",
      "Please upload it today: My Converge → Documents. Add photos of the front and back — the site makes the PDF for you.",
      `${window.location.origin}/me`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`Copied ${noAadhaar.length} names`);
    } catch {
      setErr("Couldn't copy — your browser blocked the clipboard.");
    }
    setTimeout(() => setCopied(null), 2500);
  }

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't download.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  // Files come one by one (each under Vercel's response limit) and are zipped here in the browser.
  async function zip() {
    const folder = MODES.find((m) => m.value === mode)!.folder;
    const jobs = students.flatMap((s) =>
      DOC_LIST.filter((k) => s.documents[k] && (mode === "student" || mode === k)).map((k) => {
        const ext = extOf(s.documents[k]!.type);
        return { s, k, path: folder ? `${folder}/${label(s)}.${ext}` : `${label(s)}/${DOC_KINDS[k].file}.${ext}` };
      })
    );
    if (!jobs.length) throw new Error("Nothing uploaded yet for this download.");
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < jobs.length; i += 6) {
      await Promise.all(
        jobs.slice(i, i + 6).map(async (j) => {
          const blob = await api<Blob>(`/api/admin/documents?uid=${encodeURIComponent(j.s.uid)}&kind=${j.k}`);
          files[j.path] = new Uint8Array(await blob.arrayBuffer());
        })
      );
      setProgress(`${Math.min(i + 6, jobs.length)}/${jobs.length} files`);
    }
    const { zipSync } = await import("fflate");
    const out = zipSync(files, { level: 0 }); // JPG and PDF are already compressed
    const url = URL.createObjectURL(new Blob([new Uint8Array(out)], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `converge26-${mode === "student" ? "documents" : DOC_KINDS[mode].file}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
        <h2 className="display-md text-2xl">ID card documents</h2>
        <span className="flex flex-wrap items-center gap-2 print:hidden">
          <Btn disabled={!noAadhaar.length} onClick={copyMissing}>
            <Copy size={14} /> {copied ?? `Copy list: no Aadhaar (${noAadhaar.length})`}
          </Btn>
          <Btn busy={busy === "xls"} onClick={() => act("xls", () => download("/api/admin/final?format=csv-ids", "converge26-id-details.csv"))}>
            <FileSpreadsheet size={14} /> ID details (Excel)
          </Btn>
          <select aria-label="How to arrange the ZIP" className={clsx(inputCls, "w-auto py-2 text-sm")} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <Btn tone="ink" busy={busy === "zip"} onClick={() => act("zip", zip)}>
            <FileArchive size={14} /> {busy === "zip" && progress ? progress : "Download ZIP"}
          </Btn>
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        <strong className="text-ink">{done}/{students.length}</strong> have given DOB, Aadhaar number, photo and Aadhaar card. The parents&apos; undertaking is optional for now.
        {" "}Click a name to upload for that student.
      </p>
      {err && <p className="mt-2 border-2 border-sindoor bg-sindoor/10 p-2 text-sm font-semibold text-sindoor">{err}</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-2 border-ink text-sm">
          <thead className="bg-paper-2 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">DOB · Age</th>
              <th className="px-3 py-2">Aadhaar no.</th>
              <th className="px-3 py-2">Files</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.uid} className="border-t border-ink/15 align-top">
                <td className="px-3 py-2">
                  <Link href={`/admin/students/${s.uid}#documents`} className="block font-bold underline-offset-2 hover:underline" title="Open profile to upload for them">
                    {s.name}
                  </Link>
                  <span className="text-xs text-ink-soft">{s.studentId}</span>
                </td>
                <td className="px-3 py-2">{s.gender}</td>
                <td className="px-3 py-2 tabular-nums">
                  {s.dob ? `${s.dob.split("-").reverse().join("-")} · ${ageOn(s.dob)}` : <span className="text-xs font-bold text-sindoor">Not given</span>}
                </td>
                {/* Only the last 4 on screen; the full number is in the Excel download. */}
                <td className="px-3 py-2 tabular-nums">{s.aadhaarNo ? `XXXX XXXX ${s.aadhaarNo.slice(-4)}` : <span className="text-xs font-bold text-sindoor">Not given</span>}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {DOC_LIST.map((k) =>
                      s.documents[k] ? (
                        <button
                          key={k}
                          type="button"
                          disabled={busy === `${s.uid}-${k}`}
                          onClick={() => act(`${s.uid}-${k}`, () => download(`/api/admin/documents?uid=${encodeURIComponent(s.uid)}&kind=${k}`, `${label(s)} - ${DOC_KINDS[k].file}.${extOf(s.documents[k]!.type)}`))}
                          className="inline-flex cursor-pointer items-center gap-1 border border-peacock bg-peacock px-1.5 py-0.5 text-[11px] font-bold text-paper disabled:opacity-50"
                          title={`Download ${DOC_KINDS[k].label.toLowerCase()}`}
                        >
                          <Check size={11} strokeWidth={3} /> {short(k)} <Download size={11} />
                        </button>
                      ) : (
                        <span key={k} className={clsx("border px-1.5 py-0.5 text-[11px] font-bold", DOC_KINDS[k].required ? "border-sindoor text-sindoor" : "border-ink/30 text-ink-soft")}>
                          No {short(k).toLowerCase()}
                        </span>
                      )
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
