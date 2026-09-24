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

export function validateRegistration(data: RegistrationPayload): string[] {
  const errors: string[] = [];

  if (!data.fullName.trim()) errors.push("Full name is required.");
  if (!data.studentId.trim()) errors.push("NIFT student ID is required.");
  if (!data.year) errors.push("Year is required.");
  if (!data.programme) errors.push("Programme is required.");
  if (!data.department.trim()) errors.push("Department is required.");
  if (!data.semester) errors.push("Semester is required.");
  if (!data.phone.trim()) errors.push("Phone number is required.");
  if (!/^\S+@\S+\.\S+$/.test(data.email)) errors.push("A valid email address is required.");
  if (!data.residence) errors.push("Please specify Hostel / Day Scholar.");

  if (!data.majorEvent1) errors.push("Major Event 1 is required.");
  if (!data.majorEvent2) errors.push("Major Event 2 is required.");
  if (!data.minorEvent) errors.push("Minor Event is required.");

  const picks = [data.majorEvent1, data.majorEvent2, data.minorEvent].filter(Boolean);
  if (new Set(picks).size !== picks.length) {
    errors.push("Major Event 1, Major Event 2, and Minor Event must all be different.");
  }

  if (!data.rulesAcknowledged) errors.push("You must confirm you have read and understood the event rules.");
  if (!data.selectionAcknowledged) errors.push("You must confirm you understand registration does not guarantee selection.");

  return errors;
}
