// End-to-end API test. Creates throwaway test accounts + data, exercises every
// rule, then restores the database exactly as it was and deletes test uploads.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-test.mjs              (localhost:3000)
//   BASE_URL=https://… E2E_FINAL_PASSWORD="…" node scripts/e2e-test.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import crypto from "node:crypto";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const FINAL = process.env.E2E_FINAL_PASSWORD;
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString());
const app = initializeApp({ credential: cert(sa) });
const auth = getAuth(app);
const DB = env.FIREBASE_DATABASE_URL;
const accessToken = async () => (await app.options.credential.getAccessToken()).access_token;
const rtdb = async (method, path, body) => {
  const r = await fetch(`${DB}/${path}.json`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return r.json();
};
const keyOf = (s) => s.toLowerCase().replace(/\./g, ",");

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
}

const USERS = {
  s1: { email: "zz-e2e-student1@nift.ac.in", name: "E2E Student One" },
  s2: { email: "zz-e2e-student2@nift.ac.in", name: "E2E Student Two" },
  ca: { email: "zz-e2e-clubadmin@nift.ac.in", name: "E2E Club Admin" },
  ma: { email: "zz-e2e-mainadmin@nift.ac.in", name: "E2E Main Admin" },
};
const tokens = {};
const uploads = [];
const SNAPSHOT_PATHS = ["sel", "voting", "results", "settings", "entries"];
let snapshot = null;

async function idToken(uid) {
  const custom = await auth.createCustomToken(uid);
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.idToken) throw new Error("token exchange failed: " + JSON.stringify(j));
  return j.idToken;
}

async function call(who, method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function uploadPhoto(who, account) {
  const s = await call(who, "POST", "/api/upload/sign", { kind: "photo", account });
  if (s.status !== 200) throw new Error("sign failed " + JSON.stringify(s));
  const form = new FormData();
  Object.entries(s.data.fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", new Blob([PNG], { type: "image/png" }), "test.png");
  const r = await fetch(s.data.uploadUrl, { method: "POST", body: form });
  const j = await r.json();
  if (!j.secure_url) throw new Error("upload failed " + JSON.stringify(j));
  uploads.push({ cloud: s.data.cloud, publicId: j.public_id });
  return { url: j.secure_url, publicId: j.public_id, cloud: s.data.cloud };
}

const reg = (photo, studentId, gender, picks) => ({
  fullName: "", studentId, department: "FD", semester: "3", gender, phone: "9876543210",
  residence: "Hostel", photo, picks: { e1: "", e2: "", e3: "", e4: "", e5: "", ...picks },
  rulesAcknowledged: true, selectionAcknowledged: true,
});

const eid = (uid, key) => `${uid}_${key.replace(":", "__")}`;

async function main() {
  if (!FINAL) throw new Error("Set E2E_FINAL_PASSWORD to the final-selection password.");
  snapshot = Object.fromEntries(await Promise.all(SNAPSHOT_PATHS.map(async (p) => [p, await rtdb("GET", p)])));

  console.log("Setup");
  for (const [k, u] of Object.entries(USERS)) {
    let rec;
    try { rec = await auth.getUserByEmail(u.email); } catch { rec = await auth.createUser({ email: u.email, emailVerified: true, displayName: u.name }); }
    USERS[k].uid = rec.uid;
    tokens[k] = await idToken(rec.uid);
  }
  await rtdb("PUT", `roles/${keyOf(USERS.ma.email)}`, { email: USERS.ma.email, role: "main_admin", club: null, addedBy: "e2e", addedAt: Date.now() });
  await rtdb("PUT", `roles/${keyOf(USERS.ca.email)}`, { email: USERS.ca.email, role: "club_admin", club: "cultural", addedBy: "e2e", addedAt: Date.now() });
  const { s1, s2 } = USERS;
  const select = (uid, key) => call("ma", "PATCH", `/api/admin/entries/${eid(uid, key)}`, { status: "selected", finalPassword: FINAL });

  console.log("Auth & roles");
  let r = await call(null, "GET", "/api/me");
  check("no token → 401", r.status === 401, r);
  r = await call("s1", "GET", "/api/me");
  check("student /api/me", r.status === 200 && r.data.user.role === "student" && r.data.registration === null, r);
  r = await call("ma", "GET", "/api/me");
  check("main admin role", r.data.user?.role === "main_admin", r);
  r = await call("ca", "GET", "/api/me");
  check("club admin role + club", r.data.user?.role === "club_admin" && r.data.user.club === "cultural", r);

  console.log("Registration gate");
  await call("ma", "PATCH", "/api/admin/settings", { registrationOpen: false });
  const p1 = await uploadPhoto("s1", "primary");
  check("photo upload to Cloudinary", p1.url.includes(p1.cloud));
  const p2 = await uploadPhoto("s2", "primary");
  const s1Picks = { e1: "sports:100m-boys", e2: "cultural:solo-dance", e3: "literary:mime", e4: "esse:monologue", e5: "photography:reel-making" };
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("closed registration → 403", r.status === 403, r);
  r = await call("ca", "PATCH", "/api/admin/settings", { registrationOpen: true });
  check("club admin can't open registration → 403", r.status === 403, r);
  r = await call("ma", "PATCH", "/api/admin/settings", { registrationOpen: true });
  check("main admin opens registration", r.status === 200, r);

  console.log("Registration rules (Event 1–5)");
  r = await call("s1", "POST", "/api/registration", { ...reg(p2, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("someone else's photo → 400", r.status === 400, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", { e1: "sports:100m-boys" }), fullName: s1.name });
  check("fewer than 3 events → 422 on Event 2 & 3", r.status === 422 && r.data.details?.e2 && r.data.details?.e3, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", { ...s1Picks, e5: "sports:100m-boys" }), fullName: s1.name });
  check("duplicate event → 422", r.status === 422 && r.data.details?.e5, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("student 1 registers 5 events", r.status === 200, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("second registration → 409", r.status === 409, r);
  const s2Picks = { e1: "cultural:solo-dance", e2: "sports:100m-girls", e3: "literary:mime" };
  r = await call("s2", "POST", "/api/registration", { ...reg(p2, "e2e/test/0001", "Female", s2Picks), fullName: s2.name });
  check("same student ID (case-insensitive) → 409", r.status === 409, r);
  r = await call("s2", "POST", "/api/registration", { ...reg(p2, "E2E/TEST/0002", "Female", { ...s2Picks, e4: "sports:100m-boys" }), fullName: s2.name });
  check("girl picking a boys' event → 422", r.status === 422 && r.data.details?.e4, r);
  r = await call("s2", "POST", "/api/registration", { ...reg(p2, "E2E/TEST/0002", "Female", s2Picks), fullName: s2.name });
  check("student 2 registers 3 events", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("student 1 sees Event 1–5 registered", r.data.entries?.length === 5 && r.data.entries.every((e) => e.status === "registered") && r.data.entries.some((e) => e.slot === "e5"), r.data.entries?.map((e) => e.slot));

  console.log("Club admin scope & member tools");
  r = await call("ca", "GET", "/api/admin/entries");
  check("club admin sees only their club", r.status === 200 && r.data.entries.length === 2 && r.data.entries.every((e) => e.category === "cultural"), r.data.entries?.map((e) => e.eventKey));
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s1.uid, "sports:100m-boys")}`, { status: "shortlisted" });
  check("club admin can't touch another club → 403", r.status === 403, r);
  r = await call("s1", "GET", "/api/admin/entries");
  check("student can't use admin API → 403", r.status === 403, r);
  r = await call("ca", "GET", "/api/admin/students");
  check("club admin can't list full student records → 403", r.status === 403, r);
  r = await call("ca", "GET", "/api/admin/directory");
  check("club admin can search registered students (no phone/email)", r.status === 200 && r.data.students.length >= 2 && !("phone" in r.data.students[0]), r.data.students?.[0]);
  r = await call("ca", "POST", "/api/admin/entries", { uid: s2.uid, eventKey: "cultural:group-dance" });
  check("club admin adds student 2 to Group Dance", r.status === 200, r);
  r = await call("ca", "POST", "/api/admin/entries", { uid: s2.uid, eventKey: "cultural:group-dance" });
  check("adding twice → 409", r.status === 409, r);
  r = await call("ca", "POST", "/api/admin/entries", { uid: s2.uid, eventKey: "sports:basketball" });
  check("club admin can't add to another club → 403", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/entries", { uid: s1.uid, eventKey: "cultural:group-dance" });
  check("student with 5 events can't get a 6th → 409", r.status === 409, r);
  r = await call("s2", "GET", "/api/me");
  check("student 2 now has 4 events (Event 4 = Group Dance)", r.data.entries.length === 4 && r.data.registration.picks.e4 === "cultural:group-dance", r.data.registration?.picks);
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s2.uid, "cultural:group-dance")}`, { note: "Trial Tuesday 5pm" });
  check("club admin saves a note", r.status === 200, r);
  r = await call("ca", "DELETE", `/api/admin/entries/${eid(s2.uid, "cultural:group-dance")}`);
  check("club admin removes student 2 from Group Dance", r.status === 200, r);
  r = await call("s2", "GET", "/api/me");
  check("student 2 back to 3 events", r.data.entries.length === 3 && !r.data.registration.picks.e4, r.data.registration?.picks);

  console.log("Final selection (main admin + password)");
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s1.uid, "cultural:solo-dance")}`, { status: "selected", finalPassword: FINAL });
  check("club admin can't make final selection → 403", r.status === 403, r);
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s1.uid, "cultural:solo-dance")}`, { status: "shortlisted" });
  check("club admin can shortlist", r.status === 200, r);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "cultural:solo-dance")}`, { status: "selected" });
  check("main admin without password → 401", r.status === 401, r);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "cultural:solo-dance")}`, { status: "selected", finalPassword: "wrong-password" });
  check("wrong password → 401", r.status === 401, r);

  console.log("Selection limits");
  for (const k of ["sports:100m-boys", "cultural:solo-dance", "literary:mime"]) {
    r = await select(s1.uid, k);
    check(`select student 1 for ${k}`, r.status === 200, r);
  }
  r = await call("s1", "GET", "/api/me");
  const st = Object.fromEntries(r.data.entries.map((e) => [e.eventKey, e.status]));
  check("3 selected → other 2 locked", r.data.selectedCount === 3 && st["esse:monologue"] === "locked" && st["photography:reel-making"] === "locked", st);
  r = await select(s1.uid, "esse:monologue");
  check("can't select a locked (4th) event → 409", r.status === 409, r);
  r = await select(s2.uid, "cultural:solo-dance");
  check("event full (solo dance allows 1) → 409", r.status === 409 && /full/.test(r.data.error), r);
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s1.uid, "cultural:solo-dance")}`, { status: "not_selected" });
  check("club admin can't undo a final selection → 403", r.status === 403, r);
  r = await call("ca", "DELETE", `/api/admin/entries/${eid(s1.uid, "cultural:solo-dance")}`);
  check("can't remove a selected student from the event → 409", r.status === 409, r);
  r = await select(s2.uid, "literary:mime");
  check("select student 2 for mime (capacity 5)", r.status === 200, r);
  r = await call("ma", "GET", "/api/admin/overview");
  check("campus count = 2 students", r.data.selectedStudents === 2, r.data.selectedStudents);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "literary:mime")}`, { status: "not_selected", finalPassword: FINAL });
  check("main admin undoes a selection (with password)", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  const st2 = Object.fromEntries(r.data.entries.map((e) => [e.eventKey, e.status]));
  check("unselecting one unlocks the others", r.data.selectedCount === 2 && st2["esse:monologue"] === "registered" && st2["photography:reel-making"] === "registered", st2);
  await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "esse:monologue")}`, { present: true });
  r = await call("s1", "GET", "/api/me");
  check("attendance saved", r.data.entries.find((e) => e.eventKey === "esse:monologue")?.attendance?.present === true);

  console.log("Public voting (no login, one vote per device)");
  r = await call("ca", "POST", "/api/admin/voting", { eventKey: "sports:100m-boys", date: "2026-10-01" });
  check("club admin can't create another club's round → 403", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/voting", { eventKey: "cultural:solo-dance", date: "2026-10-01", title: "E2E Solo Dance round" });
  check("club admin creates round with public link", r.status === 200 && r.data.id && r.data.publicId, r);
  const sid = r.data.id, pub = r.data.publicId;
  const pv = async (device, method, body, qs = "") => {
    const res = await fetch(`${BASE}/api/public/vote/${pub}${qs}`, {
      method,
      headers: { ...(device ? { "x-voter-id": device } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json(), cookie: res.headers.get("set-cookie") };
  };
  const dev = async () => (await (await fetch(`${BASE}/api/public/device`, { method: "POST" })).json()).id;
  const devA = await dev(), devB = await dev();
  check("devices get distinct voter ids", /^[a-f0-9]{32}$/.test(devA) && devA !== devB, [devA, devB]);
  r = await pv(null, "GET");
  check("public link works without login", r.status === 200 && r.data.round.status === "scheduled" && !r.data.round.live, r.data);
  r = { status: (await fetch(`${BASE}/api/public/vote/nope-not-real`)).status };
  check("unknown link → 404", r.status === 404, r);
  r = await call("ca", "POST", "/api/admin/scan", { code: `CNV26:${s1.uid}`, eventKey: "cultural:solo-dance", sessionId: sid });
  check("scan student 1 → present + live", r.status === 200 && r.data.live === true, r);
  r = await pv(devA, "GET");
  check("public page shows student 1 live, no counts", r.data.round?.live?.uid === s1.uid && !JSON.stringify(r.data).includes('"good"'), r.data);
  r = await pv(devA, "POST", { participant: s1.uid, value: "good" });
  check("device A votes Good (cookie set)", r.status === 200 && (r.cookie || "").includes("cnv_vid"), r);
  r = await pv(devA, "POST", { participant: s1.uid, value: "reject" });
  check("device A votes again → 409 (refresh/reopen can't re-vote)", r.status === 409, r);
  r = await pv(devA, "GET", undefined, `?participant=${s1.uid}`);
  check("device A's vote is remembered", r.data.voted === "good", r.data);
  r = await pv(devB, "POST", { participant: s1.uid, value: "reject" });
  check("device B votes Reject", r.status === 200, r);
  r = await pv(null, "POST", { participant: s1.uid, value: "good" });
  check("vote with no device id → 400", r.status === 400, r);
  r = await fetch(`${BASE}/api/live`).then((x) => x.json());
  check("Vote page lists the live round", r.rounds?.some((x) => x.publicId === pub && x.liveName === s1.name), r);
  r = await call("ca", "POST", "/api/admin/scan", { code: `CNV26:${s2.uid}`, eventKey: "cultural:solo-dance", sessionId: sid });
  check("scan student 2 → becomes live", r.status === 200 && r.data.live, r);
  r = await pv(devB, "POST", { participant: s1.uid, value: "good" });
  check("voting for previous performer → 409", r.status === 409, r);
  r = await pv(devA, "POST", { participant: s2.uid, value: "good" });
  check("device A votes for student 2", r.status === 200, r);
  r = await call("s1", "GET", `/api/admin/voting/${sid}`);
  check("student can't see counts → 403", r.status === 403, r);
  r = await call("ca", "GET", `/api/admin/voting/${sid}`);
  const t = Object.fromEntries((r.data.tallies ?? []).map((x) => [x.uid, x]));
  check("admin tallies correct", t[s1.uid]?.good === 1 && t[s1.uid]?.reject === 1 && t[s2.uid]?.good === 1, r.data.tallies);
  r = await call("ca", "POST", `/api/admin/voting/${sid}/adjust`, { uid: s2.uid, good: 2, reason: "test" });
  check("club admin can't adjust votes → 403", r.status === 403, r);
  r = await call("ma", "POST", `/api/admin/voting/${sid}/adjust`, { uid: s2.uid, good: 2, reason: "E2E jury votes" });
  check("main admin adjusts votes", r.status === 200, r);
  r = await call("ma", "POST", `/api/admin/voting/${sid}/adjust`, { uid: s2.uid, good: 1, reason: "" });
  check("adjustment without reason → 400", r.status === 400, r);
  r = await call("ca", "PATCH", `/api/admin/voting/${sid}`, { action: "publish" });
  check("can't publish before ending → 409", r.status === 409, r);
  r = await call("ca", "PATCH", `/api/admin/voting/${sid}`, { action: "end" });
  check("end round", r.status === 200, r);
  r = await pv(devB, "POST", { participant: s2.uid, value: "good" });
  check("vote after end → 409", r.status === 409, r);
  r = await pv(null, "GET");
  check("public page shows closed", r.data.round?.status === "ended", r.data);
  r = await call("ca", "PATCH", `/api/admin/voting/${sid}`, { action: "publish" });
  check("publish results", r.status === 200, r);
  const pubRes = await rtdb("GET", `results/${sid}`);
  check("published: ranked by Good incl. adjustment, no rejects", pubRes?.rows?.[0]?.name === s2.name && pubRes.rows[0].good === 3 && pubRes.rows[1].good === 1 && !JSON.stringify(pubRes).includes("reject"), pubRes?.rows);
  const html = await (await fetch(`${BASE}/results`)).text();
  check("results page shows the round", html.includes("E2E Solo Dance round"));

  console.log("Export & main-admin edits");
  r = await fetch(`${BASE}/api/admin/export`, { headers: { Authorization: `Bearer ${tokens.ca}` } });
  const csv = await r.text();
  check("club admin CSV export (own club only)", r.status === 200 && csv.includes("Student ID") && !csv.includes("100 M"), csv.slice(0, 200));
  r = await call("ma", "PATCH", `/api/admin/students/${s1.uid}`, { ...reg(p1, "E2E/TEST/0001", "Male", { ...s1Picks, e5: "" }), fullName: "E2E Student One Edited" });
  check("main admin edits student (drops Event 5)", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("edit applied: 4 entries, new name on entries", r.data.entries.length === 4 && r.data.entries.every((e) => e.student.name === "E2E Student One Edited"), r.data.entries?.length);
  r = await call("ma", "PATCH", `/api/admin/students/${s1.uid}`, { ...reg(p1, "E2E/TEST/0001", "Male", { ...s1Picks, e1: "sports:200m-boys" }), fullName: s1.name });
  check("can't drop an event the student is selected for → 409", r.status === 409, r);
  r = await call("ma", "DELETE", `/api/admin/students/${s2.uid}`);
  check("can't delete a student with selections → 409", r.status === 409, r);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup");
  const updates = {};
  // Restore shared sections exactly as they were before the test.
  if (snapshot) for (const p of SNAPSHOT_PATHS) updates[p] = snapshot[p] ?? null;
  for (const u of Object.values(USERS)) if (u.uid) {
    updates[`registrations/${u.uid}`] = null;
    updates[`users/${u.uid}`] = null;
    updates[`roles/${keyOf(u.email)}`] = null;
  }
  updates["studentIds/e2e_test_0001"] = null;
  updates["studentIds/e2e_test_0002"] = null;
  await rtdb("PATCH", "", updates);
  for (const u of Object.values(USERS)) if (u.uid) await auth.deleteUser(u.uid).catch(() => {});
  const accounts = [env.CLOUDINARY_URL_PRIMARY, env.CLOUDINARY_URL_FALLBACK].map((u) => u.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/));
  for (const up of uploads) {
    const acc = accounts.find((a) => a[3] === up.cloud);
    const ts = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash("sha1").update(`invalidate=true&public_id=${up.publicId}&timestamp=${ts}${acc[2]}`).digest("hex");
    const form = new URLSearchParams({ public_id: up.publicId, timestamp: String(ts), api_key: acc[1], invalidate: "true", signature });
    const r = await fetch(`https://api.cloudinary.com/v1_1/${up.cloud}/image/destroy`, { method: "POST", body: form });
    console.log("  cloudinary destroy", up.cloud, (await r.json()).result);
  }
  const root = await rtdb("GET", "?shallow=true".slice(1) ? "" : "", undefined);
  console.log("  database top-level now:", Object.keys(root ?? {}).join(", "));
}

main()
  .catch((e) => { console.error("FATAL", e); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
