"use client";

import type { MediaRef } from "../registration-schema";

type Api = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

interface Signed {
  uploadUrl: string;
  fields: Record<string, string>;
  cloud: string;
}

const LIMITS = { photo: 8 * 1024 * 1024, video: 100 * 1024 * 1024 };

function send(signed: Signed, file: File, onProgress?: (pct: number) => void) {
  return new Promise<MediaRef>((resolve, reject) => {
    const form = new FormData();
    Object.entries(signed.fields).forEach(([k, v]) => form.append(k, v));
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: res.secure_url, publicId: res.public_id, cloud: signed.cloud });
        } else reject(Object.assign(new Error(res?.error?.message || "Upload failed"), { status: xhr.status }));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/**
 * Uploads straight to Cloudinary using a server-signed request. Tries the
 * primary account first and falls back to the second if it fails.
 */
export async function uploadMedia(
  api: Api,
  file: File,
  kind: "photo" | "video",
  opts: { entryId?: string; onProgress?: (pct: number) => void } = {}
): Promise<MediaRef> {
  if (file.size > LIMITS[kind]) {
    throw new Error(kind === "photo" ? "Photo must be under 8 MB." : "Video must be under 100 MB.");
  }
  let lastError: unknown;
  for (const account of ["primary", "fallback"] as const) {
    try {
      const signed = await api<Signed>("/api/upload/sign", { body: { kind, account, entryId: opts.entryId } });
      opts.onProgress?.(0);
      return await send(signed, file, opts.onProgress);
    } catch (e) {
      lastError = e;
      const status = (e as { status?: number }).status;
      // A bad file won't upload anywhere — don't retry those.
      if (status === 400 && /format|file/i.test((e as Error).message)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload failed");
}
