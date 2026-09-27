// Registration contract shared by the browser form and the API route, so both
// validate with exactly the same rules.
import { getEventByKey, genderRequirement, eventLabel } from "./events";

export const DEPARTMENTS = ["BFT", "MFM", "AD", "FC", "TD", "FD"] as const;
export const SEMESTERS = ["1", "3", "5", "7"] as const;
export const GENDERS = ["Male", "Female", "Prefer not to say"] as const;
export const RESIDENCES = ["Hostel", "Day Scholar"] as const;

export const PICK_SLOTS = ["e1", "e2", "e3", "e4", "e5"] as const;
export type PickSlot = (typeof PICK_SLOTS)[number];
/** Students must pick at least Events 1–3; Events 4–5 are optional. */
export const REQUIRED_SLOTS: PickSlot[] = ["e1", "e2", "e3"];
export const SLOT_LABEL: Record<PickSlot, string> = {
  e1: "Event 1",
  e2: "Event 2",
  e3: "Event 3",
  e4: "Event 4",
  e5: "Event 5",
};

export const MIN_EVENTS = REQUIRED_SLOTS.length;
export const MAX_EVENTS = PICK_SLOTS.length;
export const MAX_SELECTIONS = 3;
export const CAMPUS_CAP = 50;

export interface MediaRef {
  url: string;
  publicId: string;
  cloud: string;
}

export interface RegistrationInput {
  fullName: string;
  studentId: string;
  department: string;
  semester: string;
  gender: string;
  phone: string;
  residence: string;
  photo: MediaRef | null;
  picks: Record<PickSlot, string>;
  rulesAcknowledged: boolean;
  selectionAcknowledged: boolean;
}

export const EMPTY_REGISTRATION: RegistrationInput = {
  fullName: "",
  studentId: "",
  department: "",
  semester: "",
  gender: "",
  phone: "",
  residence: "",
  photo: null,
  picks: { e1: "", e2: "", e3: "", e4: "", e5: "" },
  rulesAcknowledged: false,
  selectionAcknowledged: false,
};

export type RegistrationErrors = Partial<Record<string, string>>;

export function normaliseStudentId(id: string) {
  return id.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * `admin: true` relaxes the minimum to one event — admins may add or remove a
 * student's events one at a time.
 */
export function validateRegistration(data: RegistrationInput, opts: { admin?: boolean } = {}): RegistrationErrors {
  const required: PickSlot[] = opts.admin ? ["e1"] : REQUIRED_SLOTS;
  const errors: RegistrationErrors = {};

  if (!data.fullName?.trim()) errors.fullName = "Enter your full name.";
  else if (data.fullName.trim().length > 80) errors.fullName = "Name is too long.";
  if (!data.studentId?.trim()) errors.studentId = "Enter your NIFT student ID.";
  else if (!/^[A-Z0-9/\-]{4,30}$/.test(normaliseStudentId(data.studentId)))
    errors.studentId = "Use letters, numbers, / or - only.";
  if (!DEPARTMENTS.includes(data.department as never)) errors.department = "Select your department.";
  if (!SEMESTERS.includes(data.semester as never)) errors.semester = "Select your semester.";
  if (!GENDERS.includes(data.gender as never)) errors.gender = "Select an option.";
  const digits = (data.phone ?? "").replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91"))))
    errors.phone = "Enter a 10-digit mobile number.";
  if (!RESIDENCES.includes(data.residence as never)) errors.residence = "Choose Hostel or Day Scholar.";
  if (!data.photo?.url) errors.photo = "Upload a clear photo of your face.";

  const picks = data.picks ?? EMPTY_REGISTRATION.picks;
  const seen = new Map<string, PickSlot>();
  for (const slot of PICK_SLOTS) {
    const key = picks[slot];
    if (!key) {
      if (required.includes(slot)) errors[slot] = `Pick an event for ${SLOT_LABEL[slot]}.`;
      continue;
    }
    const event = getEventByKey(key);
    if (!event || event.nonCompetitive) {
      errors[slot] = "That event isn't available.";
      continue;
    }
    if (seen.has(key)) {
      errors[slot] = `Already picked as ${SLOT_LABEL[seen.get(key)!]}.`;
      continue;
    }
    seen.set(key, slot);
    const need = genderRequirement(event);
    if (need && data.gender !== need) {
      errors[slot] = `${eventLabel(event)} is for ${need === "Male" ? "boys" : "girls"} only.`;
    }
  }

  if (opts.admin) return errors;
  if (!data.rulesAcknowledged) errors.rulesAcknowledged = "Please confirm you've read the event rules.";
  if (!data.selectionAcknowledged) errors.selectionAcknowledged = "Please confirm you understand this.";

  return errors;
}

export function pickedKeys(picks: Record<PickSlot, string>) {
  return PICK_SLOTS.map((slot) => ({ slot, key: picks[slot] })).filter((p) => p.key);
}

/** Rebuilds picks from an ordered list of event keys (Event 1, Event 2, …). */
export function picksFrom(keys: string[]): Record<PickSlot, string> {
  return Object.fromEntries(PICK_SLOTS.map((slot, i) => [slot, keys[i] ?? ""])) as Record<PickSlot, string>;
}

// ---- Selection statuses ----

export const STATUSES = ["registered", "shortlisted", "selected", "not_selected", "locked"] as const;
export type EntryStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<EntryStatus, string> = {
  registered: "Registered",
  shortlisted: "Shortlisted",
  selected: "Selected",
  not_selected: "Not selected",
  locked: "Locked — 3 selections reached",
};

/** Statuses an admin can set by hand ("locked" is only ever set automatically). */
export const SETTABLE_STATUSES: EntryStatus[] = ["registered", "shortlisted", "selected", "not_selected"];

/** Cloudinary delivery URL with an on-the-fly transformation. */
export function cldTransform(url: string | undefined | null, t: string) {
  if (!url) return "";
  return url.replace("/upload/", `/upload/${t}/`);
}
