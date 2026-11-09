"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Download, FileArchive, FileSpreadsheet, Search, Upload, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi, useDownload } from "@/components/admin/kit";
import DocumentsCard from "@/components/DocumentsCard";
import { fmtSignedAt } from "@/lib/declaration";
import { DOC_KINDS, DOC_LIST, ageOn, extOf, type DocKind, type DocMeta } from "@/lib/documents";
import type { RegistrationRecord } from "@/lib/api-types";

interface Student {
  uid: string;
  name: string;
  studentId: string;
  department: string;
  gender: string;
  events: string[];
  declaredAt: number | null;
  dob: string;
  aadhaarNo: string;
  documents: Partial<Record<DocKind, DocMeta>>;
}

/** Everything a final-list student has to give, in the order they do it on My Converge. */
type Item = "declaration" | "dob" | "aadhaarNo" | DocKind;
const ITEMS: { key: Item; label: string; short: string; required: boolean; has: (s: Student) => boolean }[] = [
  { key: "declaration", label: "Declaration signed", short: "declaration", required: true, has: (s) => !!s.declaredAt },
  { key: "dob", label: "Date of birth", short: "date of birth", required: true, has: (s) => !!s.dob },
  { key: "aadhaarNo", label: "Aadhaar number", short: "Aadhaar number", required: true, has: (s) => !!s.aadhaarNo },
  ...DOC_LIST.map((k) => ({
    key: k,
    label: k === "photo" ? "Passport photo" : k === "aadhaar" ? "Aadhaar card" : "Parents' undertaking",
    short: k === "photo" ? "passport photo" : k === "aadhaar" ? "Aadhaar card (front + back)" : "parents' undertaking",
    required: DOC_KINDS[k].required,
    has: (s: Student) => !!s.documents[k],
  })),
];
// Selects sized to their content (inputCls is full-width).
const selectCls = inputCls.replace("w-full ", "w-auto ");
const missingOf = (s: Student, requiredOnly = true) => ITEMS.filter((i) => (!requiredOnly || i.required) && !i.has(s));

type Show = "all" | "complete" | "missing" | Item;

// Windows/Mac-safe file and folder names.
const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim();
const label = (s: Student) => clean(`${s.name} (${s.studentId})`);
const short = (k: DocKind) => (k === "photo" ? "Photo" : k === "aadhaar" ? "Aadhaar" : "Undertaking");

type Mode = "student" | DocKind;
const MODES: { value: Mode; label: string; folder?: string }[] = [
  { value: "student", label: "Folder for each student" },
  { value: "photo", label: "All photos in one folder", folder: "Photos" },
  { value: "aadhaar", label: "All Aadhaar cards in one folder", folder: "Aadhaar cards" },
  { value: "undertaking", label: "All undertakings in one folder", folder: "Parents undertakings" },
];

export default function DocumentsPage() {
  const { data, error, loading, reload } = useApi<{ students: Student[] }>("/api/admin/final");
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;
  return <Desk students={data.students} reload={reload} />;
}

function Desk({ students, reload }: { students: Student[]; reload: () => void }) {
  const { api } = useAuth();
  const download = useDownload();
  const [show, setShow] = useState<Show>("all");
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [event, setEvent] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("student");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const events = useMemo(() => [...new Set(students.flatMap((s) => s.events))].sort(), [students]);
  const genders = useMemo(() => [...new Set(students.map((s) => s.gender).filter(Boolean))].sort(), [students]);
  const complete = students.filter((s) => !missingOf(s).length);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return students.filter((s) => {
      if (n && !`${s.name} ${s.studentId} ${s.department}`.toLowerCase().includes(n)) return false;
      if (gender && s.gender !== gender) return false;
      if (event && !s.events.includes(event)) return false;
      if (show === "complete") return !missingOf(s).length;
      if (show === "missing") return missingOf(s).length > 0;
      if (show !== "all") return !ITEMS.find((i) => i.key === show)!.has(s);
      return true;
    });
  }, [students, q, gender, event, show]);

  const filtered = !!(q || gender || event || show !== "all");
  const item = ITEMS.find((i) => i.key === show);

  function flash(ok: boolean, text: string) {
    setNote({ ok, text });
    setTimeout(() => setNote(null), 3000);
  }

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  /** WhatsApp-ready text for whoever is on screen, with what each one still has to give. */
  async function copyList() {
    // On a "missing X" filter just the names; otherwise each name with what they're missing.
    const people = show === "complete" ? [] : list.filter((s) => (item ? !item.has(s) : missingOf(s).length));
    if (!people.length) return flash(false, "No one on this list is missing anything.");
    const what = item ? item.short : "documents";
    const needsSign = people.some((s) => !s.declaredAt);
    const text = [
      `*CONVERGE 2026 — ${item ? `${item.label} pending` : "Documents pending"}*`,
      ...(event ? [`_${event}_`] : []),
      "",
      `These ${people.length} ${people.length === 1 ? "student" : "students"} in the final list still have to give their ${what}:`,
      ...people.map((s, i) => `${i + 1}. ${s.name} (${s.studentId})${item ? "" : ` — ${missingOf(s).map((m) => m.short).join(", ")}`}`),
      "",
      needsSign
        ? "Please do it today: open My Converge, sign the declaration first, then fill in Documents."
        : "Please do it today: My Converge → Documents. For the Aadhaar card add photos of the front and back — the site makes the PDF for you.",
      `${window.location.origin}/me`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash(true, `Copied ${people.length} ${people.length === 1 ? "name" : "names"} — paste it in the group.`);
    } catch {
      flash(false, "Couldn't copy — your browser blocked the clipboard.");
    }
  }

  // Files come one by one (each under Vercel's response limit) and are zipped here in the browser.
  async function zip() {
    const folder = MODES.find((m) => m.value === mode)!.folder;
    const jobs = list.flatMap((s) =>
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

  const tiles: { key: Show; label: string; value: number; bad?: boolean }[] = [
    { key: "all", label: "All students", value: students.length },
    { key: "complete", label: "Everything given", value: complete.length },
    { key: "missing", label: "Something missing", value: students.length - complete.length, bad: true },
    ...ITEMS.map((i) => ({ key: i.key as Show, label: `No ${i.label.toLowerCase().replace(" signed", "")}`, value: students.filter((s) => !i.has(s)).length, bad: i.required })),
  ];

  return (
    <div className="space-y-6">
      <PageTitle kicker="Final list · ID card & travel" title="Documents">
        <Btn onClick={() => act("xls", () => download("/api/admin/final?format=csv-ids", "converge26-id-details.csv"))} busy={busy === "xls"}>
          <FileSpreadsheet size={14} /> ID details (Excel)
        </Btn>
      </PageTitle>

      {!students.length ? (
        <p className="py-10 text-center text-ink-soft">
          No one is on the final list yet. Students show up here once they&apos;re selected in <Link href="/admin/final" className="font-semibold text-ink underline">Final 50</Link>.
        </p>
      ) : (
        <>
          {/* Each tile is a filter. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {tiles.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={show === t.key}
                onClick={() => setShow(show === t.key && t.key !== "all" ? "all" : t.key)}
                className={clsx(
                  "cursor-pointer border-2 p-3 text-left transition-colors",
                  show === t.key ? "border-ink bg-ink text-paper" : "border-ink/25 bg-paper hover:border-ink"
                )}
              >
                <span className={clsx("label block text-[0.65rem]", show === t.key ? "opacity-80" : "text-ink-soft")}>{t.label}</span>
                <span className={clsx("display mt-1 block text-4xl tabular-nums", show !== t.key && t.bad && t.value > 0 && "text-sindoor")}>{t.value}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-y-2 border-ink py-3">
            <label className="relative min-w-56 flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <span className="sr-only">Search</span>
              <input className={clsx(inputCls, "pl-9")} placeholder="Name, student ID or dept" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <select aria-label="Show" className={selectCls} value={show} onChange={(e) => setShow(e.target.value as Show)}>
              <option value="all">Everyone</option>
              <option value="complete">Everything given</option>
              <option value="missing">Something missing</option>
              {ITEMS.map((i) => (
                <option key={i.key} value={i.key}>Missing: {i.label.replace(" signed", "")}</option>
              ))}
            </select>
            <select aria-label="Event" className={clsx(selectCls, "max-w-64")} value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="">All events</option>
              {events.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select aria-label="Gender" className={selectCls} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Boys &amp; girls</option>
              {genders.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {filtered && (
              <button type="button" onClick={() => { setShow("all"); setQ(""); setGender(""); setEvent(""); }} className="inline-flex cursor-pointer items-center gap-1 px-2 text-sm font-semibold underline">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              Showing <strong className="text-ink">{list.length}</strong> of {students.length}. Click <strong className="text-ink">Upload</strong> on a row to add files a student sent you.
            </p>
            <span className="flex flex-wrap items-center gap-2">
              <Btn tone="ink" onClick={copyList} disabled={!list.length || show === "complete"} title="Copy a message for the WhatsApp group">
                <Copy size={14} /> Copy list for group{item ? `: no ${item.label.toLowerCase().replace(" signed", "")}` : ""}
              </Btn>
              <select aria-label="How to arrange the ZIP" className={clsx(selectCls, "py-2 text-sm")} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <Btn busy={busy === "zip"} disabled={!list.length} onClick={() => act("zip", zip)}>
                <FileArchive size={14} /> {busy === "zip" && progress ? progress : `ZIP (${list.length} ${list.length === 1 ? "student" : "students"})`}
              </Btn>
            </span>
          </div>

          {note && (
            <p className={clsx("border-2 p-3 text-sm font-semibold", note.ok ? "border-peacock text-peacock" : "border-sindoor bg-sindoor/10 text-sindoor")}>{note.text}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-2 border-ink text-sm">
              <thead className="bg-paper-2 text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Declaration</th>
                  <th className="px-3 py-2">DOB · Age</th>
                  <th className="px-3 py-2">Aadhaar no.</th>
                  <th className="px-3 py-2">Files</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <Row
                    key={s.uid}
                    n={i + 1}
                    s={s}
                    open={open === s.uid}
                    toggle={() => setOpen(open === s.uid ? null : s.uid)}
                    busy={busy}
                    get={(k) => act(`${s.uid}-${k}`, () => download(`/api/admin/documents?uid=${encodeURIComponent(s.uid)}&kind=${k}`, `${label(s)} - ${DOC_KINDS[k].file}.${extOf(s.documents[k]!.type)}`))}
                    onSaved={reload}
                  />
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-ink-soft">No one matches these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-soft">
            Only the last 4 Aadhaar digits are shown here; the full number is in the Excel download. The parents&apos; undertaking is optional for now.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ n, s, open, toggle, busy, get, onSaved }: { n: number; s: Student; open: boolean; toggle: () => void; busy: string | null; get: (k: DocKind) => void; onSaved: () => void }) {
  const missing = missingOf(s);
  const notGiven = <span className="text-xs font-bold text-sindoor">Not given</span>;
  return (
    <>
      <tr className={clsx("border-t border-ink/15 align-top", open && "bg-paper-2")}>
        <td className="px-3 py-2 tabular-nums text-ink-soft">{n}</td>
        <td className="px-3 py-2">
          <Link href={`/admin/students/${s.uid}#documents`} className="block font-bold underline-offset-2 hover:underline">{s.name}</Link>
          <span className="block text-xs text-ink-soft">{s.studentId} · {s.department} · {s.gender}</span>
          <span className="block text-xs text-ink-soft">{s.events.join(", ")}</span>
        </td>
        <td className="px-3 py-2">
          {s.declaredAt ? <span className="text-xs text-peacock"><strong>Signed</strong> {fmtSignedAt(s.declaredAt)}</span> : <span className="text-xs font-bold text-sindoor">Not signed</span>}
        </td>
        <td className="px-3 py-2 tabular-nums">{s.dob ? `${s.dob.split("-").reverse().join("-")} · ${ageOn(s.dob)}` : notGiven}</td>
        <td className="px-3 py-2 tabular-nums">{s.aadhaarNo ? `XXXX XXXX ${s.aadhaarNo.slice(-4)}` : notGiven}</td>
        <td className="px-3 py-2">
          <span className="flex flex-wrap gap-1">
            {DOC_LIST.map((k) =>
              s.documents[k] ? (
                <button
                  key={k}
                  type="button"
                  disabled={busy === `${s.uid}-${k}`}
                  onClick={() => get(k)}
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
          {!missing.length && <span className="mt-1 block text-[11px] font-bold uppercase text-peacock">All done</span>}
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="inline-flex cursor-pointer items-center gap-1 border-2 border-ink bg-paper px-2 py-1 text-[11px] font-bold uppercase hover:bg-paper-2"
          >
            <Upload size={12} /> Upload {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-paper-2">
          <td colSpan={7} className="px-3 pb-4 pt-1">
            <UploadFor uid={s.uid} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

/** The same Documents card the student sees, filled in by the main admin for them. */
function UploadFor({ uid, onSaved }: { uid: string; onSaved: () => void }) {
  const { data, error, loading, reload } = useApi<{ registration: RegistrationRecord }>(`/api/admin/students/${uid}`);
  if (loading && !data) return <Loading label="Opening their documents…" />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;
  const r = data.registration;
  return (
    <DocumentsCard
      key={`${r.updatedAt ?? r.createdAt}-${Object.values(r.documents ?? {}).map((d) => d?.at).join("-")}`}
      reg={r}
      forUid={uid}
      onSaved={() => {
        reload();
        onSaved();
      }}
    />
  );
}
