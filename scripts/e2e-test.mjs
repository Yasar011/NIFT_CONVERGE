// End-to-end API test against a running dev server (http://localhost:3000).
// Creates throwaway test accounts + data, exercises every rule, then deletes
// everything it created. Usage: node scripts/e2e-test.mjs
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
  residence: "Hostel", photo, picks: { major1: "", major2: "", minor: "", extra1: "", extra2: "", ...picks },
  rulesAcknowledged: true, selectionAcknowledged: true,
});

const eid = (uid, key) => `${uid}_${key.replace(":", "__")}`;

async function main() {
  console.log("Setup");
  for (const [k, u] of Object.entries(USERS)) {
    let rec;
    try { rec = await auth.getUserByEmail(u.email); } catch { rec = await auth.createUser({ email: u.email, emailVerified: true, displayName: u.name }); }
    USERS[k].uid = rec.uid;
    tokens[k] = await idToken(rec.uid);
  }
  await rtdb("PUT", `roles/${keyOf(USERS.ma.email)}`, { email: USERS.ma.email, role: "main_admin", club: null, addedBy: "e2e", addedAt: Date.now() });
  await rtdb("PUT", `roles/${keyOf(USERS.ca.email)}`, { email: USERS.ca.email, role: "club_admin", club: "cultural", addedBy: "e2e", addedAt: Date.now() });
  const { s1, s2, ca, ma } = USERS;

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
  r = await call("ma", "PATCH", "/api/admin/settings", { registrationOpen: false });
  const p1 = await uploadPhoto("s1", "primary");
  check("photo upload to primary Cloudinary", p1.url.includes(p1.cloud));
  try {
    const pf = await uploadPhoto("s2", "fallback");
    check("photo upload to fallback Cloudinary", pf.cloud !== p1.cloud);
  } catch (e) {
    check("photo upload to fallback Cloudinary", false, e.message);
  }
  const p2 = await uploadPhoto("s2", "primary");
  const s1Picks = { major1: "sports:100m-boys", major2: "cultural:solo-dance", minor: "literary:mime", extra1: "esse:monologue", extra2: "photography:reel-making" };
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("closed registration → 403", r.status === 403, r);
  r = await call("ca", "PATCH", "/api/admin/settings", { registrationOpen: true });
  check("club admin can't open registration → 403", r.status === 403, r);
  r = await call("ma", "PATCH", "/api/admin/settings", { registrationOpen: true });
  check("main admin opens registration", r.status === 200, r);

  console.log("Registration rules");
  r = await call("s1", "POST", "/api/registration", { ...reg(p2, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("someone else's photo → 400", r.status === 400, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", { major1: "sports:100m-boys" }), fullName: s1.name });
  check("missing required picks → 422", r.status === 422 && r.data.details?.major2 && r.data.details?.minor, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", { ...s1Picks, extra2: "sports:100m-boys" }), fullName: s1.name });
  check("duplicate event → 422", r.status === 422 && r.data.details?.extra2, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("student 1 registers 5 events", r.status === 200, r);
  r = await call("s1", "POST", "/api/registration", { ...reg(p1, "E2E/TEST/0001", "Male", s1Picks), fullName: s1.name });
  check("second registration → 409", r.status === 409, r);
  const s2Picks = { major1: "cultural:solo-dance", major2: "sports:100m-girls", minor: "literary:mime" };
  r = await call("s2", "POST", "/api/registration", { ...reg(p2, "e2e/test/0001", "Female", s2Picks), fullName: s2.name });
  check("same student ID (case-insensitive) → 409", r.status === 409, r);
  r = await call("s2", "POST", "/api/registration", { ...reg(p2, "E2E/TEST/0002", "Female", { ...s2Picks, extra1: "sports:100m-boys" }), fullName: s2.name });
  check("girl picking a boys' event → 422", r.status === 422 && r.data.details?.extra1, r);
  r = await call("s2", "POST", "/api/registration", { ...reg(p2, "E2E/TEST/0002", "Female", s2Picks), fullName: s2.name });
  check("student 2 registers 3 events", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("student 1 sees 5 registered entries", r.data.entries?.length === 5 && r.data.entries.every((e) => e.status === "registered"), r.data.entries?.map((e) => e.status));

  console.log("Club admin scope");
  r = await call("ca", "GET", "/api/admin/entries");
  check("club admin sees only their club", r.status === 200 && r.data.entries.length === 2 && r.data.entries.every((e) => e.category === "cultural"), r.data.entries?.map((e) => e.eventKey));
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s1.uid, "sports:100m-boys")}`, { status: "selected" });
  check("club admin can't touch another club → 403", r.status === 403, r);
  r = await call("s1", "GET", "/api/admin/entries");
  check("student can't use admin API → 403", r.status === 403, r);
  r = await call("ca", "GET", "/api/admin/students");
  check("club admin can't list all students → 403", r.status === 403, r);

  console.log("Selection limits");
  for (const k of ["sports:100m-boys", "cultural:solo-dance", "literary:mime"]) {
    r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, k)}`, { status: "selected" });
    check(`select student 1 for ${k}`, r.status === 200, r);
  }
  r = await call("s1", "GET", "/api/me");
  const st = Object.fromEntries(r.data.entries.map((e) => [e.eventKey, e.status]));
  check("3 selected → other 2 locked", r.data.selectedCount === 3 && st["esse:monologue"] === "locked" && st["photography:reel-making"] === "locked", st);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "esse:monologue")}`, { status: "selected" });
  check("can't select a locked (4th) event → 409", r.status === 409, r);
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s2.uid, "cultural:solo-dance")}`, { status: "selected" });
  check("event full (solo dance allows 1) → 409", r.status === 409 && /full/.test(r.data.error), r);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s2.uid, "literary:mime")}`, { status: "selected" });
  check("select student 2 for mime (capacity 5)", r.status === 200, r);
  r = await call("ma", "GET", "/api/admin/overview");
  check("campus count = 2 students", r.data.selectedStudents === 2, r.data.selectedStudents);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "literary:mime")}`, { status: "not_selected" });
  r = await call("s1", "GET", "/api/me");
  const st2 = Object.fromEntries(r.data.entries.map((e) => [e.eventKey, e.status]));
  check("unselecting one unlocks the others", r.data.selectedCount === 2 && st2["esse:monologue"] === "registered" && st2["photography:reel-making"] === "registered", st2);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s1.uid, "esse:monologue")}`, { present: true });
  r = await call("s1", "GET", "/api/me");
  check("attendance saved", r.data.entries.find((e) => e.eventKey === "esse:monologue")?.attendance?.present === true);

  console.log("Voting");
  r = await call("ca", "POST", "/api/admin/voting", { eventKey: "sports:100m-boys", date: "2026-10-01" });
  check("club admin can't create another club's round → 403", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/voting", { eventKey: "cultural:solo-dance", date: "2026-10-01", title: "E2E Solo Dance round" });
  check("club admin creates round", r.status === 200 && r.data.id, r);
  const sid = r.data.id;
  r = await call("s2", "GET", "/api/live");
  check("nothing live before a scan", r.status === 200 && !r.data.sessions.some((s) => s.id === sid), r);
  r = await call("ca", "POST", "/api/admin/scan", { code: "CNV26:nobodyatall12345", eventKey: "cultural:solo-dance", sessionId: sid });
  check("unknown pass → 404", r.status === 404, r);
  r = await call("ca", "POST", "/api/admin/scan", { code: `CNV26:${s1.uid}`, eventKey: "cultural:solo-dance", sessionId: sid });
  check("scan student 1 → present + live", r.status === 200 && r.data.live === true, r);
  r = await call("s2", "GET", "/api/live");
  const live = r.data.sessions?.find((s) => s.id === sid);
  check("live feed shows student 1, no counts", live?.live.uid === s1.uid && !("good" in live.live), live);
  r = await call("s2", "POST", "/api/vote", { sessionId: sid, participant: s1.uid, value: "good" });
  check("student 2 votes Good", r.status === 200, r);
  r = await call("s2", "POST", "/api/vote", { sessionId: sid, participant: s1.uid, value: "reject" });
  check("second vote → 409", r.status === 409, r);
  r = await call("s1", "POST", "/api/vote", { sessionId: sid, participant: s1.uid, value: "good" });
  check("self-vote → 403", r.status === 403, r);
  r = await call("ma", "POST", "/api/vote", { sessionId: sid, participant: s1.uid, value: "reject" });
  check("another voter votes Reject", r.status === 200, r);
  r = await call("s2", "GET", `/api/vote?sessionId=${sid}&participant=${s1.uid}`);
  check("vote status remembered", r.data.voted === "good", r);
  r = await call("ca", "POST", "/api/admin/scan", { code: `CNV26:${s2.uid}`, eventKey: "cultural:solo-dance", sessionId: sid });
  check("scan student 2 → becomes live", r.status === 200 && r.data.live, r);
  r = await call("ca", "POST", "/api/vote", { sessionId: sid, participant: s1.uid, value: "good" });
  check("voting for previous performer → 409", r.status === 409, r);
  r = await call("s1", "POST", "/api/vote", { sessionId: sid, participant: s2.uid, value: "good" });
  check("student 1 votes for student 2", r.status === 200, r);
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
  r = await call("s1", "POST", "/api/vote", { sessionId: sid, participant: s2.uid, value: "good" });
  check("vote after end → 409", r.status === 409, r);
  r = await call("ca", "PATCH", `/api/admin/voting/${sid}`, { action: "publish" });
  check("publish results", r.status === 200, r);
  const pub = await rtdb("GET", `results/${sid}`);
  check("published: ranked by Good incl. adjustment, no rejects", pub?.rows?.[0]?.name === s2.name && pub.rows[0].good === 3 && pub.rows[1].good === 1 && !JSON.stringify(pub).includes("reject"), pub?.rows);
  const html = await (await fetch(`${BASE}/results`)).text();
  check("results page shows the round", html.includes("E2E Solo Dance round"));

  console.log("Export & admin edits");
  r = await fetch(`${BASE}/api/admin/export`, { headers: { Authorization: `Bearer ${tokens.ca}` } });
  const csv = await r.text();
  check("club admin CSV export (own club only)", r.status === 200 && csv.includes("Student ID") && !csv.includes("100 M"), csv.slice(0, 200));
  r = await call("ma", "PATCH", `/api/admin/students/${s1.uid}`, { ...reg(p1, "E2E/TEST/0001", "Male", { ...s1Picks, extra2: "" }), fullName: "E2E Student One Edited" });
  check("main admin edits student (drops an extra)", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("edit applied: 4 entries, new name on entries", r.data.entries.length === 4 && r.data.entries.every((e) => e.student.name === "E2E Student One Edited"), r.data.entries?.length);
  r = await call("ma", "PATCH", `/api/admin/students/${s1.uid}`, { ...reg(p1, "E2E/TEST/0001", "Male", { ...s1Picks, major1: "sports:200m-boys" }), fullName: s1.name });
  check("can't drop an event the student is selected for → 409", r.status === 409, r);
  r = await call("ma", "DELETE", `/api/admin/students/${s2.uid}`);
  check("can't delete a student with selections → 409", r.status === 409, r);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup");
  const uids = Object.values(USERS).map((u) => u.uid).filter(Boolean);
  const updates = { sel: null, voting: null, results: null, "settings/app/registrationOpen": false };
  for (const u of Object.values(USERS)) if (u.uid) {
    updates[`registrations/${u.uid}`] = null;
    updates[`users/${u.uid}`] = null;
    updates[`roles/${keyOf(u.email)}`] = null;
  }
  updates["studentIds/e2e_test_0001"] = null;
  updates["studentIds/e2e_test_0002"] = null;
  await rtdb("PATCH", "", updates);
  const entries = (await rtdb("GET", "entries")) || {};
  const del = {};
  for (const id of Object.keys(entries)) if (uids.some((u) => id.startsWith(u + "_"))) del[`entries/${id}`] = null;
  if (Object.keys(del).length) await rtdb("PATCH", "", del);
  for (const uid of uids) await auth.deleteUser(uid).catch(() => {});
  const accounts = [env.CLOUDINARY_URL_PRIMARY, env.CLOUDINARY_URL_FALLBACK].map((u) => u.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/));
  for (const up of uploads) {
    const acc = accounts.find((a) => a[3] === up.cloud);
    const ts = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash("sha1").update(`invalidate=true&public_id=${up.publicId}&timestamp=${ts}${acc[2]}`).digest("hex");
    const form = new URLSearchParams({ public_id: up.publicId, timestamp: String(ts), api_key: acc[1], invalidate: "true", signature });
    const r = await fetch(`https://api.cloudinary.com/v1_1/${up.cloud}/image/destroy`, { method: "POST", body: form });
    console.log("  cloudinary destroy", up.cloud, up.publicId, (await r.json()).result);
  }
  const root = await rtdb("GET", "", undefined);
  console.log("  database now:", JSON.stringify(root));
}

main()
  .catch((e) => { console.error("FATAL", e); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
