// Documents the final contingent uploads for the Converge ID card and travel.

export const DOC_KINDS = {
  photo: { label: "Passport-size photo", file: "photo", types: ["image/jpeg", "image/png"], maxBytes: 1_000_000, required: true },
  aadhaar: { label: "Aadhaar card (front + back)", file: "aadhaar", types: ["application/pdf"], maxBytes: 2_500_000, required: true },
  undertaking: { label: "Parents' undertaking", file: "parents-undertaking", types: ["application/pdf"], maxBytes: 2_500_000, required: false },
} as const;

export type DocKind = keyof typeof DOC_KINDS;
export const DOC_LIST = Object.keys(DOC_KINDS) as DocKind[];

export interface DocMeta {
  type: string;
  size: number;
  at: number;
}

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export const validBloodGroup = (v: unknown): v is BloodGroup => (BLOOD_GROUPS as readonly unknown[]).includes(v);
/** "B−" with a real minus sign, for screens and the Excel. */
export const fmtBlood = (v?: string) => (v ? v.replace("-", "−") : "");

export const extOf = (type: string) => (type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg");

/** Completed years on `at` (default today) for a YYYY-MM-DD date of birth. */
export function ageOn(dob: string, at = new Date()) {
  const [y, m, d] = dob.split("-").map(Number);
  let age = at.getFullYear() - y;
  if (at.getMonth() + 1 < m || (at.getMonth() + 1 === m && at.getDate() < d)) age--;
  return age;
}

export function validDob(dob: unknown): dob is string {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const t = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== dob) return false;
  const age = ageOn(dob);
  return age >= 15 && age <= 45;
}

// Verhoeff check digit — the one Aadhaar numbers use; catches typos and swapped digits.
const VD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** 12 digits, not starting with 0 or 1, with a valid Verhoeff check digit. */
export function validAadhaar(raw: unknown): raw is string {
  const n = String(raw ?? "").replace(/\s/g, "");
  if (!/^[2-9]\d{11}$/.test(n)) return false;
  let c = 0;
  [...n].reverse().forEach((ch, i) => (c = VD[c][VP[i % 8][Number(ch)]]));
  return c === 0;
}

/** "1234 5678 9012" — readable, and Excel keeps it as text. */
export const fmtAadhaar = (n?: string) => (n ? n.replace(/\s/g, "").replace(/(\d{4})(?=\d)/g, "$1 ") : "");

export const docsComplete = (r?: { dob?: string; aadhaarNo?: string; bloodGroup?: string; documents?: Partial<Record<DocKind, DocMeta>> } | null) =>
  !!r?.dob && !!r.aadhaarNo && !!r.bloodGroup && DOC_LIST.every((k) => !DOC_KINDS[k].required || !!r.documents?.[k]);
