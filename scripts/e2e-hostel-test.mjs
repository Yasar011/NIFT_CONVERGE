// Targeted test: hostel/room rules and students editing their own profile.
// Safe while the site is in use — test accounts only, everything removed after.
//
//   node scripts/e2e-hostel-test.mjs        (against localhost:3000)
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

const E = { s1: "zz-e2e-h-girl@nift.ac.in", ma: "zz-e2e-h-mainadmin@nift.ac.in" };
const NEW_BOY = "zz-e2e-h-boy@nift.ac.in";
const uids = {}, tokens = {};
let upload = null;

async function signIn(k) {
  let rec;
  try { rec = await auth.getUserByEmail(E[k]); } catch { rec = await auth.createUser({ email: E[k], emailVerified: true, displayName: "ZZ Hostel Test" }); }
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
  await signIn("s1");
  await signIn("ma");
  await rtdb("PUT", `roles/${keyOf(E.ma)}`, { email: E.ma, role: "main_admin", club: null, addedBy: "e2e", addedAt: Date.now() });

  const s = await call("s1", "POST", "/api/upload/sign", { kind: "photo", account: "primary" });
  const form = new FormData();
  Object.entries(s.data.fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", new Blob([PNG], { type: "image/png" }), "t.png");
  const up = await (await fetch(s.data.uploadUrl, { method: "POST", body: form })).json();
  upload = { cloud: s.data.cloud, publicId: up.public_id };
  const photo = { url: up.secure_url, publicId: up.public_id, cloud: s.data.cloud };

  console.log("Setup: test student written directly (registration may be closed on the site)");
  {
    const uid = uids.s1;
    const picks = ["literary:mime", "literary:ad-mad", "literary:meme-making"];
    const student = { name: "ZZ Hostel Test", studentId: "ZZTEST/H/01", department: "TD", semester: "3", gender: "Female", email: E.s1, phone: "9000000000", residence: "Hostel", hostel: "G1", room: "204A", photoUrl: photo.url };
    const upd = {
      [`registrations/${uid}`]: { uid, email: E.s1, fullName: student.name, studentId: student.studentId, department: "TD", semester: "3", gender: "Female", phone: "9000000000", residence: "Hostel", hostel: "G1", room: "204A", photo, picks: { e1: picks[0], e2: picks[1], e3: picks[2], e4: "", e5: "" }, createdAt: Date.now() },
    };
    picks.forEach((key, i) => {
      const id = `${uid}_${key.replace(":", "__")}`;
      upd[`entries/${id}`] = { uid, eventKey: key, category: "literary", slot: `e${i + 1}`, student, attendance: null, video: null, createdAt: Date.now() };
      upd[`sel/status/${id}`] = "registered";
    });
    await rtdb("PATCH", "", upd);
  }
  let r = await call("s1", "GET", "/api/me");
  check("My Converge shows G1 · Room 204A", r.data.registration?.hostel === "G1" && r.data.registration?.room === "204A", r.data.registration);
  r = await call("s1", "PATCH", "/api/me", { residence: "Hostel", hostel: "G1", room: "" });
  check("hostel without a room number → asks for room", r.status === 422 && r.data.details?.room, r.data);

  console.log("Student edits their own profile");
  r = await call("s1", "PATCH", "/api/me", { residence: "Day Scholar" });
  check("switch to Day Scholar", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("hostel/room cleared everywhere", r.data.registration?.residence === "Day Scholar" && !r.data.registration.hostel && r.data.entries.every((e) => e.student.residence === "Day Scholar" && !e.student.room), r.data.registration);
  r = await call("s1", "PATCH", "/api/me", { residence: "Hostel", hostel: "SBV", room: "B-17", phone: "9123456789" });
  check("move to SBV room B-17 with a new number", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("profile + every event entry updated", r.data.registration?.hostel === "SBV" && r.data.registration?.phone === "9123456789" && r.data.entries.every((e) => e.student.room === "B-17" && e.student.phone === "9123456789"), r.data.entries?.[0]?.student);
  r = await call("s1", "PATCH", "/api/me", { residence: "Hostel", hostel: "Atal", room: "1" });
  check("girl can't switch to Atal → 422", r.status === 422 && r.data.details?.residence, r.data);
  r = await call("s1", "PATCH", "/api/me", { phone: "123" });
  check("bad mobile → 422", r.status === 422 && r.data.details?.phone, r.data);
  r = await call("s1", "PATCH", "/api/me", { residence: "Hostel", hostel: "SBV", room: "B-17", photo: { url: "https://evil.example/x.png", publicId: "x", cloud: "x" } });
  check("photo from somewhere else → refused", r.status === 400 || r.status === 422, r);
  r = await call("ma", "GET", "/api/admin/export?category=literary");
  const csv = r.data;
  check("Excel export shows SBV · Room B-17", typeof csv === "string" && csv.includes("SBV · Room B-17"), String(csv).slice(0, 200));

  console.log("Admin adds a boy by email");
  r = await call("ma", "POST", "/api/admin/students", { email: NEW_BOY, fullName: "ZZ Hostel Boy", studentId: "ZZTEST/H/02", department: "FD", semester: "1", gender: "Male", residence: "Hostel", hostel: "G2", room: "5", events: ["literary:mime"] });
  check("boy in a girls' hostel → 422", r.status === 422 && r.data.details?.residence, r.data);
  r = await call("ma", "POST", "/api/admin/students", { email: NEW_BOY, fullName: "ZZ Hostel Boy", studentId: "ZZTEST/H/02", department: "FD", semester: "1", gender: "Male", residence: "Hostel", hostel: "Atal", room: "5", events: ["literary:mime"] });
  check("boy in Atal room 5 → added", r.status === 200, r);
  uids.boy = r.data?.uid;

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const upd = {};
  const entries = (await rtdb("GET", "entries")) ?? {};
  const sel = (await rtdb("GET", "sel")) ?? {};
  for (const uid of [uids.s1, uids.boy].filter(Boolean)) {
    for (const id of Object.keys(entries)) if (id.startsWith(`${uid}_`)) upd[`entries/${id}`] = null;
    for (const id of Object.keys(sel.status ?? {})) if (id.startsWith(`${uid}_`)) upd[`sel/status/${id}`] = null;
    Object.assign(upd, { [`registrations/${uid}`]: null, [`users/${uid}`]: null });
  }
  Object.assign(upd, {
    "studentIds/zztest_h_01": null, "studentIds/zztest_h_02": null,
    [`aliases/${keyOf(NEW_BOY)}`]: null, [`roles/${keyOf(E.ma)}`]: null,
  });
  if (uids.ma) upd[`users/${uids.ma}`] = null;
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e") || /ZZ Hostel/.test(a.summary)) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  for (const u of [uids.s1, uids.ma]) if (u) await auth.deleteUser(u).catch(() => {});
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
