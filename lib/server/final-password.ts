import crypto from "node:crypto";
import { HttpError } from "./http";

// FINAL_SELECT_PASSWORD_HASH = "scrypt:<salt hex>:<hash hex>" — only a hash is
// ever stored. Generate with: node scripts/set-final-password.mjs
export function checkFinalPassword(password: unknown) {
  const stored = process.env.FINAL_SELECT_PASSWORD_HASH || "";
  const [algo, saltHex, hashHex] = stored.split(":");
  if (algo !== "scrypt" || !saltHex || !hashHex) {
    throw new HttpError(503, "Final selection password isn't configured.");
  }
  if (typeof password !== "string" || !password) {
    throw new HttpError(401, "Enter the final selection password.", { needFinalPassword: "1" });
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  if (!crypto.timingSafeEqual(actual, expected)) {
    throw new HttpError(401, "Wrong final selection password.", { needFinalPassword: "1" });
  }
}
