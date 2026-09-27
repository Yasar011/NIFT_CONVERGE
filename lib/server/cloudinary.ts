import crypto from "node:crypto";
import { HttpError } from "./http";
import type { MediaRef } from "../registration-schema";

interface Account {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function parse(url?: string): Account | null {
  const m = url?.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/);
  return m ? { apiKey: m[1], apiSecret: m[2], cloudName: m[3].trim() } : null;
}

const ACCOUNTS = {
  primary: parse(process.env.CLOUDINARY_URL_PRIMARY),
  fallback: parse(process.env.CLOUDINARY_URL_FALLBACK),
};

export type AccountName = keyof typeof ACCOUNTS;

const KINDS = {
  photo: { resource: "image", formats: "jpg,jpeg,png,webp,heic", folder: "converge26/profiles" },
  video: { resource: "video", formats: "mp4,mov,webm,m4v", folder: "converge26/performances" },
} as const;
export type UploadKind = keyof typeof KINDS;

/**
 * Signs a direct browser → Cloudinary upload. The file never passes through
 * our server, so large performance videos don't hit Vercel's body limit.
 */
export function signUpload(account: AccountName, kind: UploadKind, publicId: string) {
  const acc = ACCOUNTS[account];
  if (!acc) throw new HttpError(503, "Uploads are not configured.");
  const k = KINDS[kind];
  const params: Record<string, string> = {
    allowed_formats: k.formats,
    invalidate: "true",
    overwrite: "true",
    // Full path in the id (not the `folder` param) so fixed- and dynamic-folder
    // accounts both store it under the same public_id.
    public_id: `${k.folder}/${publicId}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = crypto.createHash("sha1").update(toSign + acc.apiSecret).digest("hex");
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${acc.cloudName}/${k.resource}/upload`,
    fields: { ...params, api_key: acc.apiKey, signature },
    cloud: acc.cloudName,
  };
}

/** Only accept media that really lives in one of our Cloudinary accounts. */
export function assertOwnMedia(ref: MediaRef | null | undefined, kind: UploadKind): MediaRef {
  const clouds = Object.values(ACCOUNTS).filter(Boolean).map((a) => a!.cloudName);
  const resource = KINDS[kind].resource;
  if (
    !ref ||
    typeof ref.url !== "string" ||
    !clouds.includes(ref.cloud) ||
    !ref.url.startsWith(`https://res.cloudinary.com/${ref.cloud}/${resource}/upload/`) ||
    typeof ref.publicId !== "string" ||
    !ref.publicId.startsWith(KINDS[kind].folder + "/")
  ) {
    throw new HttpError(400, "Upload the file again — it didn't finish.");
  }
  return { url: ref.url, publicId: ref.publicId, cloud: ref.cloud };
}
