// Shapes returned by the API — shared by server routes and client pages.
import type { EventCategory } from "./types";
import type { EntryStatus, MediaRef, PickSlot, RegistrationInput } from "./registration-schema";

export type Role = "student" | "club_admin" | "main_admin";

export interface Me {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  role: Role;
  club: EventCategory | null;
}

export type RegistrationRecord = Omit<RegistrationInput, "rulesAcknowledged" | "selectionAcknowledged"> & {
  uid: string;
  email: string;
  createdAt: number;
  updatedAt?: number;
};

export interface StudentSnapshot {
  name: string;
  studentId: string;
  department: string;
  semester: string;
  gender: string;
  email: string;
  phone: string;
  residence: string;
  photoUrl: string;
}

export interface EntryRecord {
  uid: string;
  eventKey: string;
  category: EventCategory;
  slot: PickSlot;
  student: StudentSnapshot;
  attendance?: { present: boolean; at: number; by: string } | null;
  video?: MediaRef | null;
  createdAt: number;
  updatedAt?: number;
  updatedBy?: string;
}

export interface EntryView extends EntryRecord {
  id: string;
  status: EntryStatus;
}

export interface MeResponse {
  user: Me;
  registration: RegistrationRecord | null;
  entries: EntryView[];
  selectedCount: number;
  registrationOpen: boolean;
}

export type SessionStatus = "scheduled" | "running" | "ended" | "published";

export interface LiveParticipant {
  uid: string;
  entryId: string;
  name: string;
  department: string;
  photoUrl: string;
  videoUrl: string | null;
  since: number;
}

export interface VotingSession {
  id: string;
  eventKey: string;
  category: EventCategory;
  eventName: string;
  title: string;
  date: string;
  status: SessionStatus;
  live: LiveParticipant | null;
  createdBy: string;
  createdAt: number;
  endedAt?: number;
  publishedAt?: number;
}

export interface Tally {
  uid: string;
  name: string;
  department: string;
  photoUrl: string;
  good: number;
  reject: number;
  adjGood: number;
  adjReject: number;
}

export interface Adjustment {
  id: string;
  uid: string;
  good: number;
  reject: number;
  reason: string;
  by: string;
  at: number;
}

export interface PublishedResult {
  sessionId: string;
  title: string;
  eventName: string;
  category: EventCategory;
  date: string;
  publishedAt: number;
  rows: { rank: number; name: string; department: string; photoUrl: string; good: number }[];
}

export interface LiveSessionPublic {
  id: string;
  title: string;
  eventName: string;
  category: EventCategory;
  live: LiveParticipant;
}
