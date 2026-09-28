// Settings shape + the "is registration open right now?" rule, shared by
// server routes and admin screens.
export interface AppSettings {
  /** Manual switch, used when no opening time is scheduled. */
  registrationOpen: boolean;
  /** Scheduled window (ms since epoch). If opensAt is set, the schedule decides. */
  opensAt: number | null;
  closesAt: number | null;
  /** Locks all selection changes once the final list is submitted. */
  selectionFrozen: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  registrationOpen: false,
  opensAt: null,
  closesAt: null,
  selectionFrozen: false,
};

export function isRegistrationOpen(s: AppSettings, now = Date.now()) {
  if (s.opensAt) return now >= s.opensAt && (!s.closesAt || now < s.closesAt);
  if (s.closesAt && now >= s.closesAt) return false;
  return s.registrationOpen;
}
