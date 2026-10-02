"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "./auth/AuthProvider";
import { uploadMedia } from "@/lib/client/upload";
import { cldTransform, type MediaRef } from "@/lib/registration-schema";

export default function PhotoUpload({
  value,
  onChange,
  error,
  disabled,
  forUid,
}: {
  forUid?: string;
  value: MediaRef | null;
  onChange: (ref: MediaRef) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { api } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function pick(file?: File) {
    if (!file) return;
    setFailed(null);
    setProgress(0);
    try {
      onChange(await uploadMedia(api, file, "photo", { onProgress: setProgress, forUid }));
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div>
      <span className="label mb-2 block">Your photo</span>
      <div className="flex items-center gap-5">
        <button
          type="button"
          id="photo"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
          aria-describedby={error ? "photo-error" : undefined}
          className={clsx(
            "relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden border-2 bg-paper-2 disabled:cursor-not-allowed",
            error || failed ? "border-sindoor" : "border-ink"
          )}
        >
          {value?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cldTransform(value.url, "c_fill,g_face,w_240,h_240,q_auto,f_auto")} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <Camera size={28} className="text-ink-soft" aria-hidden />
          )}
          {busy && (
            <span className="absolute inset-0 flex flex-col items-center justify-center bg-ink/70 text-xs font-bold text-paper">
              <Loader2 className="animate-spin" size={20} />
              {progress}%
            </span>
          )}
        </button>
        <div className="text-sm text-ink-soft">
          <p>A clear, front-facing photo. Coordinators use it to recognise you at events and on voting screens.</p>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => input.current?.click()}
            className="mt-2 cursor-pointer font-bold text-ink underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {value?.url ? "Change photo" : "Upload photo"}
          </button>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {(error || failed) && (
        <p id="photo-error" className="mt-2 text-sm font-semibold text-sindoor">
          {failed ?? error}
        </p>
      )}
    </div>
  );
}
