// Sets the main admin's final-selection password (stores only a scrypt hash).
// Usage: node scripts/set-final-password.mjs "<password>"
// Then add the printed value to Vercel too:
//   vercel env add FINAL_SELECT_PASSWORD_HASH production
import crypto from "node:crypto";
import fs from "node:fs";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Give a password of at least 8 characters.");
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 32);
const value = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;

const file = ".env.local";
let env = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
env = /^FINAL_SELECT_PASSWORD_HASH=.*$/m.test(env)
  ? env.replace(/^FINAL_SELECT_PASSWORD_HASH=.*$/m, `FINAL_SELECT_PASSWORD_HASH=${value}`)
  : env.trimEnd() + `\n\n# ---- Final selection (main admin) ----\nFINAL_SELECT_PASSWORD_HASH=${value}\n`;
fs.writeFileSync(file, env);
console.log("Saved to .env.local:\nFINAL_SELECT_PASSWORD_HASH=" + value);
