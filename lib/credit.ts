import { fmtSignedAt } from "./declaration";

/** Credit line at the bottom of every Excel, PDF and printout the portal makes. */
export const CREDIT = "Generated from NIFT Jodhpur Converge '26 · Developed by Yasar CH";

/** The credit plus when the file was made (IST). */
export const creditLine = (at = Date.now()) => `${CREDIT} · ${fmtSignedAt(at)} IST`;
