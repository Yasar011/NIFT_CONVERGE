// Pushes database.rules.json to the Realtime Database.
// Browsers get no direct access; the rules only add query indexes.
import { initializeApp, cert } from "firebase-admin/app";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString());
const app = initializeApp({ credential: cert(sa) });
const token = (await app.options.credential.getAccessToken()).access_token;
const base = env.FIREBASE_DATABASE_URL || `https://${sa.project_id}-default-rtdb.firebaseio.com`;
const r = await fetch(`${base}/.settings/rules.json`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${token}` },
  body: fs.readFileSync("database.rules.json", "utf8"),
});
console.log("rules:", r.status, await r.text());
