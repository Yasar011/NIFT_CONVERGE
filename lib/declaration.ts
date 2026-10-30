// Declaration and undertaking signed by every student in the final contingent
// before the kit opens. Bump DECLARATION_VERSION when the wording changes.

export const DECLARATION_VERSION = 1;

export const DECLARATION_TITLE = "Declaration and Undertaking — CONVERGE 2026";

export interface DeclarationStudent {
  name: string;
  studentId: string;
  department: string;
  semester: string;
  events: string[];
}

export const declarationIntro = (s: DeclarationStudent) =>
  `I, ${s.name} (${s.studentId}, ${s.department}, Semester ${s.semester}), a student of NIFT Jodhpur, have been selected ` +
  `for the NIFT Jodhpur contingent for CONVERGE 2026 in: ${s.events.join(", ")}. I hereby declare and undertake that:`;

export const DECLARATION_POINTS = [
  "I will take part in all the events listed above and will not withdraw or back out of the contingent after signing this declaration.",
  "I am willing to travel with the NIFT Jodhpur contingent to the host campus and venues of CONVERGE 2026, and to stay there for the full duration of the event, on the travel dates and arrangements set by the institute.",
  "I will withdraw only for a genuine medical or family emergency, and I will inform the campus SDAC and the Converge coordinators in writing at once, with supporting proof.",
  "I understand that if I back out without a valid reason, my place may be given to another student, I may be asked to bear the cost of the kit, travel and other arrangements made for me, I may not be considered for future inter-campus events, and the institute may take disciplinary action as per NIFT rules.",
  "I will follow the CONVERGE 2026 rulebook and code of conduct, the rules of the host campus, and the instructions of the accompanying faculty and team leads at all times, including during travel and stay.",
  "I am medically fit to take part in these events, I take part at my own risk, and I have told the coordinators about any medical condition they should know of.",
  "I have informed my parents / guardian about my selection, travel and stay for CONVERGE 2026.",
  "The information I have given on this portal is true and correct.",
];

/** What the registration keeps; the full record (with the signature) lives under `declarations/{uid}`. */
export interface DeclarationMeta {
  at: number;
  version: number;
}

export interface DeclarationRecord extends DeclarationStudent, DeclarationMeta {
  uid: string;
  gender: string;
  email: string;
  phone: string;
  /** PNG data URL of the drawn signature. */
  signature: string;
  ip: string;
  userAgent: string;
}

/** "30 Oct 2026, 4:05 pm" in IST. */
export const fmtSignedAt = (at: number) =>
  new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
