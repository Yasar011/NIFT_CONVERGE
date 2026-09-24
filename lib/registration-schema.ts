// Shape of a registration submission. Kept separate from UI code so the same
// contract can later be reused by a Firebase/Supabase-backed API route and,
// eventually, an admin dashboard.
export interface RegistrationPayload {
  fullName: string;
  studentId: string;
  year: string;
  programme: string;
  department: string;
  semester: string;
  gender?: string;
  phone: string;
  email: string;
  residence: "Hostel" | "Day Scholar" | "";
  majorEvent1: string;
  majorEvent2: string;
  minorEvent: string;
  rulesAcknowledged: boolean;
  selectionAcknowledged: boolean;
}

export const EMPTY_REGISTRATION: RegistrationPayload = {
  fullName: "",
  studentId: "",
  year: "",
  programme: "",
  department: "",
  semester: "",
  gender: "",
  phone: "",
  email: "",
  residence: "",
  majorEvent1: "",
  majorEvent2: "",
  minorEvent: "",
  rulesAcknowledged: false,
  selectionAcknowledged: false,
};

export const PROGRAMMES = ["B.Des", "B.F.Tech", "M.Des", "M.F.Tech", "MFM"];
export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export type RegistrationErrors = Partial<Record<keyof RegistrationPayload, string>>;

export function validateRegistration(data: RegistrationPayload): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!data.fullName.trim()) errors.fullName = "Enter your full name.";
  if (!data.studentId.trim()) errors.studentId = "Enter your NIFT student ID.";
  if (!data.year) errors.year = "Select your year.";
  if (!data.programme) errors.programme = "Select your programme.";
  if (!data.department.trim()) errors.department = "Enter your department.";
  if (!data.semester) errors.semester = "Select your semester.";
  const digits = data.phone.replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91"))))
    errors.phone = "Enter a 10-digit mobile number.";
  if (!/^\S+@\S+\.\S+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (!data.residence) errors.residence = "Choose Hostel or Day Scholar.";

  if (!data.majorEvent1) errors.majorEvent1 = "Pick your first major event.";
  if (!data.majorEvent2) errors.majorEvent2 = "Pick your second major event.";
  else if (data.majorEvent2 === data.majorEvent1) errors.majorEvent2 = "Must differ from Major 01.";
  if (!data.minorEvent) errors.minorEvent = "Pick your minor event.";
  else if (data.minorEvent === data.majorEvent1 || data.minorEvent === data.majorEvent2)
    errors.minorEvent = "Must differ from your major events.";

  if (!data.rulesAcknowledged) errors.rulesAcknowledged = "Please confirm you've read the event rules.";
  if (!data.selectionAcknowledged) errors.selectionAcknowledged = "Please confirm you understand this.";

  return errors;
}
