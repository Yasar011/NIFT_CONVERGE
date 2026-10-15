// Targeted test: students fill empty slots and change / clear Event 4–5.
// Safe while the site is in use — one test student, removed afterwards.
// Needs the local dev server with E2E_FORCE_OPEN=1 (in .env.development.local)
// because registration may be closed on the shared database.
//
//   node scripts/e2e-slots-test.mjs        (against localhost:3000)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const EMAIL = "zz-e2e-slots@nift.ac.in";
let uid, token;
const eid = (key) => `${uid}_${key.replace(":", "__")}`;
const put = async (slot, eventKey) => {
  const r = await fetch(BASE + "/api/me/events", {
    method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ slot, eventKey }),
  });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const me = async () => (await fetch(BASE + "/api/me", { headers: { Authorization: `Bearer ${token}` } })).json();

async function main() {
  let rec;
  try { rec = await auth.getUserByEmail(EMAIL); } catch { rec = await auth.createUser({ email: EMAIL, emailVerified: true, displayName: "ZZ Slots" }); }
  uid = rec.uid;
  const custom = await auth.createCustomToken(uid);
  token = (await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  })).json()).idToken;

  const picks = ["literary:mime", "literary:ad-mad", "literary:meme-making"];
  const student = { name: "ZZ Slots", studentId: "ZZTEST/S/01", department: "TD", semester: "3", gender: "Female", email: EMAIL, phone: "9000000000", residence: "Day Scholar", hostel: "", room: "", photoUrl: "" };
  const upd = {
    [`registrations/${uid}`]: { uid, email: EMAIL, fullName: student.name, studentId: student.studentId, department: "TD", semester: "3", gender: "Female", phone: "9000000000", residence: "Day Scholar", photo: { url: "", publicId: "", cloud: "" }, picks: { e1: picks[0], e2: picks[1], e3: picks[2], e4: "", e5: "" }, createdAt: Date.now() },
  };
  picks.forEach((key, i) => {
    upd[`entries/${eid(key)}`] = { uid, eventKey: key, category: "literary", slot: `e${i + 1}`, student, attendance: null, video: null, createdAt: Date.now() };
    upd[`sel/status/${eid(key)}`] = "registered";
  });
  await rtdb("PATCH", "", upd);

  console.log("Rules");
  let r = await put("e4", "cultural:solo-dance");
  check("Solo Dance closed (trial over) → 409", r.status === 409 && /closed/.test(r.data?.error), r);
  r = await put("e4", "literary:mime");
  check("event already picked → 409", r.status === 409, r);
  r = await put("e4", "sports:100m-boys");
  check("boys-only event for a girl → 409", r.status === 409, r);
  r = await put("e1", "literary:poetry");
  check("Event 1 can't be changed by the student → 403", r.status === 403, r);

  console.log("Add, change, remove");
  r = await put("e4", "sports:100m-girls");
  check("add Event 4", r.status === 200, r);
  let m = await me();
  let e4 = m.entries.find((e) => e.slot === "e4");
  check("Event 4 entry is there, registered", m.registration.picks.e4 === "sports:100m-girls" && e4?.eventKey === "sports:100m-girls" && e4.status === "registered", { picks: m.registration.picks, e4 });
  r = await put("e4", "sports:200m-girls");
  check("change Event 4", r.status === 200, r);
  m = await me();
  check("old entry gone, new one added", m.entries.length === 4 && !m.entries.some((e) => e.eventKey === "sports:100m-girls") && m.entries.some((e) => e.eventKey === "sports:200m-girls" && e.slot === "e4"), m.entries.map((e) => e.eventKey));
  const old = await rtdb("GET", `sel/status/${eid("sports:100m-girls")}`);
  check("old selection status cleared", old === null, old);

  await rtdb("PUT", `sel/status/${eid("sports:200m-girls")}`, "shortlisted");
  r = await put("e4", "sports:400m-girls");
  check("already shortlisted → can't change (409)", r.status === 409, r);
  await rtdb("PUT", `sel/status/${eid("sports:200m-girls")}`, "registered");

  r = await put("e5", "sports:400m-girls");
  check("add Event 5", r.status === 200, r);
  r = await put("e4", "");
  check("remove Event 4", r.status === 200, r);
  m = await me();
  check("Event 4 empty, Event 5 kept", m.registration.picks.e4 === "" && m.registration.picks.e5 === "sports:400m-girls" && m.entries.length === 4, m.registration.picks);
  check("/api/me lists closed events", !!m.closedEvents?.["cultural:solo-dance"], m.closedEvents);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup");
  const upd = {};
  const entries = (await (await fetch(`${DB}/entries.json?shallow=true`, { headers: { Authorization: `Bearer ${await tok()}` } })).json()) ?? {};
  for (const id of Object.keys(entries)) if (uid && id.startsWith(`${uid}_`)) { upd[`entries/${id}`] = null; upd[`sel/status/${id}`] = null; upd[`sel/prev/${id}`] = null; }
  if (uid) Object.assign(upd, { [`registrations/${uid}`]: null, [`users/${uid}`]: null });
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e-slots")) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  if (uid) await auth.deleteUser(uid).catch(() => {});
  console.log(`  removed ${Object.keys(upd).length} test paths`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
