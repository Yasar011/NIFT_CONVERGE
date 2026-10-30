"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eraser, FileSignature } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "./auth/AuthProvider";
import { DECLARATION_POINTS, DECLARATION_TITLE, declarationIntro, fmtSignedAt, type DeclarationStudent } from "@/lib/declaration";

/** Fixed drawing resolution; the canvas is scaled to fit with CSS. */
const W = 900;
const H = 300;

/**
 * The final-list declaration: read it, tick to agree, draw a signature, submit.
 * Once signed it shows the date and a download of the signed PDF.
 */
export default function DeclarationCard({ student, signedAt }: { student: DeclarationStudent; signedAt?: number }) {
  const { api, refresh } = useAuth();
  const [agree, setAgree] = useState(false);
  const [inked, setInked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const moves = useRef(0);

  async function download() {
    setErr(null);
    try {
      const blob = await api<Blob>("/api/me/declaration");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converge-declaration-${student.studentId.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't download.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!agree) return setErr("Tick the box to agree to the declaration.");
    if (!inked || !canvas.current) return setErr("Draw your signature in the box.");
    if (!confirm("Submit your signed declaration? You can't change it after this.")) return;
    setBusy(true);
    try {
      await api("/api/me/declaration", { method: "PUT", body: { agree, signature: canvas.current.toDataURL("image/png") } });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't submit.");
    } finally {
      setBusy(false);
    }
  }

  if (signedAt) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-paper p-4">
        <p className="flex items-center gap-2 text-sm">
          <FileSignature size={18} className="text-peacock" />
          <span>
            <strong>Declaration signed</strong> <span className="text-ink-soft">· {fmtSignedAt(signedAt)}</span>
          </span>
        </p>
        <button type="button" onClick={download} className="inline-flex cursor-pointer items-center gap-1.5 border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
          <Download size={14} /> Your copy (PDF)
        </button>
        {err && <p className="w-full text-sm font-semibold text-sindoor">{err}</p>}
      </section>
    );
  }

  return (
    <section id="declaration" className="scroll-mt-24 border-2 border-ink bg-paper">
      <div className="border-b-2 border-ink bg-marigold px-5 py-3">
        <p className="label flex items-center gap-2"><FileSignature size={16} /> Step 1 · Sign before you get your kit</p>
        <h2 className="display-md mt-1 text-2xl">{DECLARATION_TITLE}</h2>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="text-sm leading-relaxed">{declarationIntro(student)}</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {DECLARATION_POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>

        <label className="flex cursor-pointer items-start gap-3 border-2 border-ink bg-paper-2 p-3 text-sm font-semibold">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-ink" />
          I have read the declaration above, I agree to every point, and I will not back out of the contingent.
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label">Your signature</span>
            <button
              type="button"
              onClick={() => {
                canvas.current?.getContext("2d")?.clearRect(0, 0, W, H);
                moves.current = 0;
                setInked(false);
              }}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold uppercase underline"
            >
              <Eraser size={13} /> Clear
            </button>
          </div>
          <SignaturePad
            canvasRef={canvas}
            onMove={() => {
              // A real signature, not a stray tap.
              if (++moves.current > 15) setInked(true);
            }}
          />
          <p className="mt-1 text-xs text-ink-soft">Sign with your finger, stylus or mouse inside the box.</p>
        </div>

        {err && <p className="text-sm font-semibold text-sindoor">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className={clsx(
            "w-full cursor-pointer border-2 border-ink bg-ink px-5 py-3 text-sm font-bold uppercase tracking-wide text-paper disabled:opacity-50 sm:w-auto",
            (!agree || !inked) && "opacity-70"
          )}
        >
          {busy ? "Submitting…" : "Sign and submit"}
        </button>
      </form>
    </section>
  );
}

function SignaturePad({ canvasRef, onMove }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; onMove: () => void }) {
  const drawing = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#14110f";
  }, [canvasRef]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      aria-label="Signature box — draw your signature"
      className="block aspect-[3/1] w-full cursor-crosshair touch-none border-2 border-dashed border-ink bg-white"
      onPointerDown={(e) => {
        const ctx = e.currentTarget.getContext("2d");
        if (!ctx) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.1, p.y);
        ctx.stroke();
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = e.currentTarget.getContext("2d");
        if (!ctx) return;
        const p = point(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        onMove();
      }}
      onPointerUp={() => (drawing.current = false)}
      onPointerCancel={() => (drawing.current = false)}
    />
  );
}
