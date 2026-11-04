"use client";

import { useState } from "react";
import { Check, FileText, ImagePlus, RotateCw, Upload, X } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "./auth/AuthProvider";
import { auth } from "@/lib/firebase/client";
import { DOC_KINDS, ageOn, fmtAadhaar, type DocKind, type DocMeta } from "@/lib/documents";
import type { RegistrationRecord } from "@/lib/api-types";

const control =
  "w-full border-2 border-ink bg-paper px-3 py-2.5 text-base text-ink focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const btn = "inline-flex cursor-pointer items-center gap-1.5 border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";
const IMAGE_TYPES = ["image/jpeg", "image/png"];

/** Draws an image rotated (0/90/180/270), optionally centre-cropped to w/h `aspect`, scaled to fit `maxSide`. */
async function toCanvas(file: File, rotate: number, maxSide: number, aspect?: number) {
  const img = await createImageBitmap(file);
  const turned = rotate % 180 !== 0;
  const fw = turned ? img.height : img.width;
  const fh = turned ? img.width : img.height;
  let [w, h, sx, sy] = [fw, fh, 0, 0];
  if (aspect && w / h > aspect) [sx, w] = [(w - h * aspect) / 2, h * aspect];
  else if (aspect) [sy, h] = [(h - w / aspect) / 2, w / aspect];
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.scale(scale, scale);
  ctx.translate(fw / 2 - sx, fh / 2 - sy);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

const jpeg = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't read that image."))), "image/jpeg", q));

/** Photos → one compressed A4 PDF. `perPage` 2 puts front and back on the same page (Aadhaar). */
async function imagesToPdf(items: Picked[], perPage: 1 | 2) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const [W, H, M] = [595.28, 841.89, 36];
  const slotH = (H - M * (perPage + 1)) / perPage;
  for (let i = 0; i < items.length; i += perPage) {
    const page = pdf.addPage([W, H]);
    for (let j = 0; j < perPage && items[i + j]; j++) {
      const canvas = await toCanvas(items[i + j].file, items[i + j].rotate, 1600);
      const img = await pdf.embedJpg(new Uint8Array(await (await jpeg(canvas, 0.72)).arrayBuffer()));
      const fit = img.scaleToFit(W - 2 * M, slotH);
      page.drawImage(img, { x: (W - fit.width) / 2, y: H - M - j * (slotH + M) - (slotH + fit.height) / 2, width: fit.width, height: fit.height });
    }
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

// Raw body upload (not JSON) — no base64 overhead on a 2 MB file.
async function upload(kind: DocKind, blob: Blob) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/me/documents?kind=${kind}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": blob.type },
    body: blob,
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || "Upload failed.");
}

interface Picked {
  file: File;
  url: string;
  rotate: number;
}

/**
 * ID card details and documents for the final contingent: name, DOB, Aadhaar
 * number, passport photo, Aadhaar (front + back as one PDF) and the parents'
 * undertaking (optional for now).
 */
export default function DocumentsCard({ reg }: { reg: RegistrationRecord }) {
  return (
    <section id="documents" className="scroll-mt-24 border-2 border-ink bg-paper">
      <div className="border-b-2 border-ink bg-paper-2 px-5 py-3">
        <p className="label flex items-center gap-2"><FileText size={16} /> Documents for your Converge ID card</p>
        <p className="mt-1 text-sm text-ink-soft">Only the main admin can see these. Use your details exactly as on your Aadhaar card.</p>
      </div>
      <div className="divide-y-2 divide-ink/15">
        <Details reg={reg} />
        <PhotoField meta={reg.documents?.photo} />
        <PdfField step={3} kind="aadhaar" meta={reg.documents?.aadhaar} perPage={2} slots={["Front", "Back"]} />
        <PdfField step={4} kind="undertaking" meta={reg.documents?.undertaking} perPage={1} slots={["Page 1", "Page 2", "Page 3"]} optional />
      </div>
    </section>
  );
}

function Details({ reg }: { reg: RegistrationRecord }) {
  const { api, refresh } = useAuth();
  const [f, setF] = useState({ fullName: reg.fullName, dob: reg.dob ?? "", aadhaarNo: fmtAadhaar(reg.aadhaarNo) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const age = /^\d{4}-\d{2}-\d{2}$/.test(f.dob) ? ageOn(f.dob) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api("/api/me/documents", { method: "PATCH", body: f });
      setMsg({ ok: true, text: "Details saved." });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof f, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={`doc-${key}`} className="label mb-1.5 block">{label}</label>
      {input}
      {errors[key] && <p className="mt-1 text-xs font-semibold text-sindoor">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-4 p-5">
      <p className="label">1 · Your details</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("fullName", "Full name (as on Aadhaar)", (
          <input id="doc-fullName" className={clsx(control, errors.fullName && "border-sindoor")} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoComplete="name" />
        ))}
        {field("dob", `Date of birth${age !== null && age > 0 ? ` · Age ${age}` : ""}`, (
          <input id="doc-dob" type="date" className={clsx(control, errors.dob && "border-sindoor")} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} autoComplete="bday" />
        ))}
        {field("aadhaarNo", "Aadhaar number", (
          <input
            id="doc-aadhaarNo"
            inputMode="numeric"
            placeholder="1234 5678 9012"
            className={clsx(control, "tabular-nums tracking-wider", errors.aadhaarNo && "border-sindoor")}
            value={f.aadhaarNo}
            onChange={(e) => setF({ ...f, aadhaarNo: fmtAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12)) })}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={clsx(btn, "bg-ink text-paper")}>{busy ? "Saving…" : "Save details"}</button>
        {msg && <p className={clsx("text-sm font-semibold", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
      </div>
    </form>
  );
}

function Status({ meta }: { meta?: DocMeta }) {
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-peacock px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-paper">
      <Check size={12} strokeWidth={3} /> Uploaded {new Date(meta.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {Math.round(meta.size / 1024)} KB
    </span>
  );
}

function PhotoField({ meta }: { meta?: DocMeta }) {
  const { refresh } = useAuth();
  const [pick, setPick] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!pick) return;
    setBusy(true);
    setErr(null);
    try {
      // Cropped to passport shape (35 × 45 mm) and re-saved as a JPG well under 1 MB.
      await upload("photo", await jpeg(await toCanvas(pick.file, pick.rotate, 1200, 35 / 45), 0.9));
      setPick(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-5">
      <p className="label flex flex-wrap items-center gap-2">2 · {DOC_KINDS.photo.label} <Status meta={meta} /></p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
        <li>A proper passport-size photo: plain white or light background, face straight, both ears and shoulders visible.</li>
        <li><strong className="text-ink">No selfies</strong>, no filters, sunglasses, caps or group photos. JPG or PNG only.</li>
      </ul>
      <div className="flex flex-wrap items-end gap-4">
        {pick && (
          <span className="relative block aspect-[35/45] w-28 overflow-hidden border-2 border-ink bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pick.url} alt="Your photo, as it will be cropped" className="h-full w-full object-cover" style={{ transform: `rotate(${pick.rotate}deg)` }} />
          </span>
        )}
        <span className="flex flex-wrap gap-2">
          <label className={clsx(btn, "bg-paper")}>
            <ImagePlus size={14} /> {pick || meta ? "Choose another" : "Choose photo"}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (!IMAGE_TYPES.includes(file.type)) return setErr("Photo must be a JPG or PNG.");
                setErr(null);
                setPick({ file, url: URL.createObjectURL(file), rotate: 0 });
              }}
            />
          </label>
          {pick && (
            <>
              <button type="button" className={btn} onClick={() => setPick({ ...pick, rotate: (pick.rotate + 90) % 360 })} aria-label="Rotate photo">
                <RotateCw size={14} /> Rotate
              </button>
              <button type="button" disabled={busy} className={clsx(btn, "bg-ink text-paper")} onClick={send}>
                <Upload size={14} /> {busy ? "Uploading…" : "Upload photo"}
              </button>
            </>
          )}
        </span>
      </div>
      {err && <p className="text-sm font-semibold text-sindoor">{err}</p>}
    </div>
  );
}

function PdfField({ step, kind, meta, perPage, slots, optional }: { step: number; kind: DocKind; meta?: DocMeta; perPage: 1 | 2; slots: string[]; optional?: boolean }) {
  const { refresh } = useAuth();
  const spec = DOC_KINDS[kind];
  const [picks, setPicks] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needBack = kind === "aadhaar" && picks.length < 2;

  async function send(make: () => Promise<Blob> | Blob) {
    setBusy(true);
    setErr(null);
    try {
      const blob = await make();
      if (blob.size > spec.maxBytes) {
        throw new Error(`That PDF is ${(blob.size / 1e6).toFixed(1)} MB — the limit is ${spec.maxBytes / 1e6} MB. Add photos of the pages instead and we'll make a smaller PDF.`);
      }
      await upload(kind, blob);
      setPicks([]);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-5">
      <p className="label flex flex-wrap items-center gap-2">
        {step} · {spec.label} {optional && <span className="normal-case tracking-normal text-ink-soft">(optional for now)</span>} <Status meta={meta} />
      </p>
      <p className="text-sm text-ink-soft">
        {kind === "aadhaar"
          ? "Add clear photos of the front and back — we put both on one page and make a small PDF. Or upload a ready PDF with both sides."
          : "Signed by your parent / guardian. Add photos of the pages (we make the PDF) or upload a PDF."}
      </p>

      {picks.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {picks.map((p, i) => (
            <li key={p.url} className="w-32">
              <span className="label mb-1 block text-[10px]">{slots[i]}</span>
              <span className="flex aspect-square items-center justify-center overflow-hidden border-2 border-ink bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={slots[i]} className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${p.rotate}deg)` }} />
              </span>
              <span className="mt-1 flex gap-1">
                <button type="button" className={clsx(btn, "px-2 py-1")} aria-label={`Rotate ${slots[i]}`} onClick={() => setPicks(picks.map((q, j) => (j === i ? { ...q, rotate: (q.rotate + 90) % 360 } : q)))}>
                  <RotateCw size={13} />
                </button>
                <button type="button" className={clsx(btn, "px-2 py-1")} aria-label={`Remove ${slots[i]}`} onClick={() => setPicks(picks.filter((_, j) => j !== i))}>
                  <X size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {picks.length < slots.length && (
          <label className={clsx(btn, "bg-paper")}>
            <ImagePlus size={14} /> Add {slots[picks.length].toLowerCase()} photo
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (!IMAGE_TYPES.includes(file.type)) return setErr("Add a JPG or PNG photo.");
                setErr(null);
                setPicks([...picks, { file, url: URL.createObjectURL(file), rotate: 0 }]);
              }}
            />
          </label>
        )}
        {picks.length > 0 && (
          <button type="button" disabled={busy || needBack} className={clsx(btn, "bg-ink text-paper")} onClick={() => send(() => imagesToPdf(picks, perPage))}>
            <Upload size={14} /> {busy ? "Uploading…" : needBack ? "Add the back too" : "Make PDF and upload"}
          </button>
        )}
        {picks.length === 0 && (
          <label className={clsx(btn, "bg-paper")}>
            <FileText size={14} /> {meta ? "Replace with a PDF" : "Upload a PDF"}
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.type !== "application/pdf") return setErr("Upload a PDF.");
                send(() => file);
              }}
            />
          </label>
        )}
      </div>
      {err && <p className="text-sm font-semibold text-sindoor">{err}</p>}
    </div>
  );
}
