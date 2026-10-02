// Targeted test: registration for an event closes when its first trial starts.
// Safe while the site is in use — the test trial is written straight to the
// database (so no phone notifications go out), dated in the past (never on the
// home board), and everything created is removed.
//
//   node scripts/e2e-deadline-test.mjs        (against localhost:3000; registration must be open)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import crypto from "node:crypto";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString());
const app = initializeApp({ credential: cert(sa) });
const auth = getAuth(app);
const DB = env.FIREBASE_DATABASE_URL;
const tok = async () => (await app.options.credential.getAccessToken()).access_token;
const rtdb = async (method, path, body) =>
  (await fetch(`${DB}/${path}.json`, { method, headers: { Authorization: `Bearer ${await tok()}` }, body: body === undefined ? undefined : JSON.stringify(body) })).json();
const keyOf = (s) => s.toLowerCase().replace(/\./g, ",");

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const E = { s1: "zz-e2e-d-student@nift.ac.in", ca: "zz-e2e-d-clubadmin@nift.ac.in" };
const CLOSED = "literary:imaginarium"; // gets a past-dated test trial
const uids = {}, tokens = {};
let upload = null, trialPath = null;

async function signIn(k) {
  let rec;
  try { rec = await auth.getUserByEmail(E[k]); } catch { rec = await auth.createUser({ email: E[k], emailVerified: true, displayName: "ZZ Deadline Test" }); }
  uids[k] = rec.uid;
  const custom = await auth.createCustomToken(rec.uid);
  tokens[k] = (await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  })).json()).idToken;
}
async function call(who, method, path, body) {
  const r = await fetch(BASE + path, {
    method, headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = t; }
  return { status: r.status, data };
}
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function main() {
  const settings = (await rtdb("GET", "settings/app")) ?? {};
  const now = Date.now();
  const open = settings.opensAt ? now >= settings.opensAt && (!settings.closesAt || now < settings.closesAt) : settings.registrationOpen && !(settings.closesAt && now >= settings.closesAt);
  if (!open) throw new Error("Registration is closed on the site — this test needs it open.");
  if (settings.selectionFrozen) throw new Error("Selections are frozen — unfreeze first.");

  await signIn("s1");
  await signIn("ca");
  await rtdb("PUT", `roles/${keyOf(E.ca)}`, { email: E.ca, role: "club_admin", club: "literary", addedBy: "e2e", addedAt: now });

  // Past-dated first trial for CLOSED, written directly (no notifications).
  const trialId = `-ZZTEST${crypto.randomBytes(4).toString("hex")}`;
  trialPath = `trials/${CLOSED.replace(":", "__")}/${trialId}`;
  await rtdb("PUT", trialPath, { eventKey: CLOSED, category: "literary", title: "ZZ deadline test trial", date: "2026-01-10", time: "10:00", venue: "Test", notes: "", createdBy: "e2e", at: now });

  const s = await call("s1", "POST", "/api/upload/sign", { kind: "photo", account: "primary" });
  const form = new FormData();
  Object.entries(s.data.fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", new Blob([PNG], { type: "image/png" }), "t.png");
  const up = await (await fetch(s.data.uploadUrl, { method: "POST", body: form })).json();
  upload = { cloud: s.data.cloud, publicId: up.public_id };
  const photo = { url: up.secure_url, publicId: up.public_id, cloud: s.data.cloud };
  const reg = (picks) => ({
    fullName: "ZZ Deadline Test", studentId: "ZZTEST/D/01", department: "FC", semester: "1", gender: "Female", phone: "9000000000",
    residence: "Hostel", photo, picks: { e1: "", e2: "", e3: "", e4: "", e5: "", ...picks }, rulesAcknowledged: true, selectionAcknowledged: true,
  });

  console.log("Deadline enforcement");
  let r = await call("s1", "POST", "/api/registration", reg({ e1: "literary:mime", e2: CLOSED, e3: "literary:meme-making" }));
  check("event whose trial already started → rejected on that slot", r.status === 422 && /closed when its trial started/.test(r.data.details?.e2 ?? ""), r.data);
  check("other events in the same form are fine", !r.data.details?.e1 && !r.data.details?.e3, r.data.details);
  r = await call("s1", "POST", "/api/registration", reg({ e1: "literary:mime", e2: "literary:ad-mad", e3: "literary:meme-making" }));
  check("registration without the closed event goes through", r.status === 200, r);

  console.log("Admins can still add late");
  r = await call("ca", "POST", "/api/admin/entries", { uid: uids.s1, eventKey: CLOSED });
  check("club admin adds the student after the deadline", r.status === 200, r);

  console.log("Shown to students");
  const page = await (await fetch(`${BASE}/events/literary/imaginarium`)).text();
  check("event page shows the registration deadline", /Registration closes/.test(page) && page.includes("ZZ deadline test trial"));

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const upd = {};
  if (trialPath) upd[trialPath] = null;
  const uid = uids.s1;
  if (uid) {
    const entries = (await rtdb("GET", "entries")) ?? {};
    const sel = (await rtdb("GET", "sel")) ?? {};
    for (const id of Object.keys(entries)) if (id.startsWith(`${uid}_`)) upd[`entries/${id}`] = null;
    for (const id of Object.keys(sel.status ?? {})) if (id.startsWith(`${uid}_`)) upd[`sel/status/${id}`] = null;
    Object.assign(upd, { [`registrations/${uid}`]: null, [`users/${uid}`]: null, ["studentIds/zztest_d_01"]: null });
  }
  if (uids.ca) Object.assign(upd, { [`users/${uids.ca}`]: null, [`roles/${keyOf(E.ca)}`]: null });
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e")) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  for (const u of Object.values(uids)) await auth.deleteUser(u).catch(() => {});
  if (upload) {
    const m = env.CLOUDINARY_URL_PRIMARY.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/);
    const ts = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash("sha1").update(`invalidate=true&public_id=${upload.publicId}&timestamp=${ts}${m[2]}`).digest("hex");
    await fetch(`https://api.cloudinary.com/v1_1/${upload.cloud}/image/destroy`, {
      method: "POST", body: new URLSearchParams({ public_id: upload.publicId, timestamp: String(ts), api_key: m[1], invalidate: "true", signature }),
    });
  }
  console.log(`  removed ${Object.keys(upd).length} test paths + test photo`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
