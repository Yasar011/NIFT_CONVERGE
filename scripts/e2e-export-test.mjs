// Targeted test: Participants exports follow filters; hostel list sorts by hostel/room.
// Safe while the site is in use — test students only, removed afterwards.
//
//   node scripts/e2e-export-test.mjs        (against localhost:3000)
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
const keyOf = (s) => s.toLowerCase().replace(/\./g, ",");

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ""); }
};

const CA = "zz-e2e-x-clubadmin@nift.ac.in";
let caUid, token;
const EVENT = "literary:ad-mad";
// Fake site ids (never sign in) so nothing touches real accounts.
const STUDENTS = [
  { uid: "MzzTestExportAAAAAAAAAAAAAAA1", name: "ZZX Day", residence: "Day Scholar", hostel: "", room: "", status: "shortlisted" },
  { uid: "MzzTestExportAAAAAAAAAAAAAAA2", name: "ZZX G2", residence: "Hostel", hostel: "G2", room: "10", status: "shortlisted" },
  { uid: "MzzTestExportAAAAAAAAAAAAAAA3", name: "ZZX G1 big", residence: "Hostel", hostel: "G1", room: "204", status: "shortlisted" },
  { uid: "MzzTestExportAAAAAAAAAAAAAAA4", name: "ZZX G1 small", residence: "Hostel", hostel: "G1", room: "9", status: "shortlisted" },
  { uid: "MzzTestExportAAAAAAAAAAAAAAA5", name: "ZZX Atal", residence: "Hostel", hostel: "Atal", room: "5", status: "registered" },
];
const eid = (uid) => `${uid}_${EVENT.replace(":", "__")}`;

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, text: await r.text() };
}

async function main() {
  let rec;
  try { rec = await auth.getUserByEmail(CA); } catch { rec = await auth.createUser({ email: CA, emailVerified: true }); }
  caUid = rec.uid;
  await rtdb("PUT", `roles/${keyOf(CA)}`, { email: CA, role: "club_admin", club: "literary", addedBy: "e2e", addedAt: Date.now() });
  const custom = await auth.createCustomToken(caUid);
  token = (await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  })).json()).idToken;

  const upd = {};
  for (const s of STUDENTS) {
    upd[`entries/${eid(s.uid)}`] = {
      uid: s.uid, eventKey: EVENT, category: "literary", slot: "e1", createdAt: Date.now(), attendance: null, video: null,
      student: { name: s.name, studentId: `ZZX/${s.uid.slice(-1)}`, department: "FC", semester: "3", gender: s.hostel === "Atal" ? "Male" : "Female", email: "", phone: "9000000000", residence: s.residence, hostel: s.hostel, room: s.room, photoUrl: "" },
    };
    upd[`sel/status/${eid(s.uid)}`] = s.status;
  }
  await rtdb("PATCH", "", upd);

  console.log("Hostel list");
  let r = await get(`/api/admin/export?event=${EVENT}&status=shortlisted&q=ZZX&format=hostel`);
  const lines = r.text.replace(/^﻿/, "").split("\n");
  const names = lines.slice(1).map((l) => l.split(",")[2]);
  check("follows filters: only shortlisted test students", r.status === 200 && names.length === 4 && !names.includes("ZZX Atal"), names);
  check("sorted G1 (room 9, 204) → G2 → Day Scholar", JSON.stringify(names) === JSON.stringify(["ZZX G1 small", "ZZX G1 big", "ZZX G2", "ZZX Day"]), names);
  check("columns: hostel, room, phone, events", lines[0].startsWith("Hostel,Room,Name,Student ID") && lines[1].startsWith("G1,9,") && lines[1].includes("Ad-Mad (Shortlisted)"), lines.slice(0, 2));
  r = await get(`/api/admin/export?event=${EVENT}&q=ZZX&format=hostel`);
  check("without status filter Atal is included", r.text.includes("ZZX Atal"));

  console.log("Participant export follows filters");
  r = await get(`/api/admin/export?event=${EVENT}&status=registered&q=ZZX`);
  check("event + status + search applied", r.status === 200 && r.text.includes("ZZX Atal") && !r.text.includes("ZZX G2"), r.text.slice(0, 200));
  r = await get(`/api/admin/export?event=sports:basketball&format=hostel`);
  check("club admin can't export another club's event → 403", r.status === 403, r);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup");
  const upd = { [`roles/${keyOf(CA)}`]: null };
  for (const s of STUDENTS) {
    upd[`entries/${eid(s.uid)}`] = null;
    upd[`sel/status/${eid(s.uid)}`] = null;
  }
  if (caUid) upd[`users/${caUid}`] = null;
  await rtdb("PATCH", "", upd);
  if (caUid) await auth.deleteUser(caUid).catch(() => {});
  console.log(`  removed ${Object.keys(upd).length} test paths`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
