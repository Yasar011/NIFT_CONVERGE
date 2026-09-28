// End-to-end API test. Creates throwaway test accounts + data, exercises every
// rule, then restores the database exactly as it was and deletes test uploads.
//
// ⚠ It snapshots and restores whole database sections, so anything real that
// changes *during* the run (2–3 min) would be lost. Only run it when nobody is
// using the site, and confirm with E2E_ALLOW_SHARED_DB=1.
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
const SNAPSHOT_PATHS = ["sel", "voting", "results", "settings", "entries", "trials", "announcements", "scores", "audit", "blocked"];
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
  if (process.env.E2E_ALLOW_SHARED_DB !== "1") {
    throw new Error("This test writes to the live database. Re-run with E2E_ALLOW_SHARED_DB=1 when nobody is using the site.");
  }
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

  console.log("Voting (signed-in NIFT accounts, one vote per account)");
  r = await call("ca", "POST", "/api/admin/voting", { eventKey: "sports:100m-boys", date: "2026-10-01" });
  check("club admin can't create another club's round → 403", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/voting", { eventKey: "cultural:solo-dance", date: "2026-10-01", title: "E2E Solo Dance round" });
  check("club admin creates round with shareable link", r.status === 200 && r.data.id && r.data.publicId, r);
  const sid = r.data.id, pub = r.data.publicId;
  const vote = (who, participant, value) => call(who, "POST", `/api/public/vote/${pub}`, { participant, value });
  r = await call(null, "GET", `/api/public/vote/${pub}`);
  check("link shows round state without login", r.status === 200 && r.data.round.status === "scheduled", r.data);
  r = await call(null, "GET", "/api/public/vote/nope-not-real");
  check("unknown link → 404", r.status === 404, r);
  r = await call("ca", "POST", "/api/admin/scan", { code: `CNV26:${s1.uid}`, eventKey: "cultural:solo-dance", sessionId: sid });
  check("scan student 1 → present + live", r.status === 200 && r.data.live === true, r);
  r = await call(null, "GET", `/api/public/vote/${pub}`);
  check("link shows student 1 live, no counts", r.data.round?.live?.uid === s1.uid && !JSON.stringify(r.data).includes('"good"'), r.data);
  r = await vote(null, s1.uid, "good");
  check("voting without sign-in → 401", r.status === 401, r);
  r = await vote("s2", s1.uid, "good");
  check("student 2 votes Good", r.status === 200, r);
  r = await vote("s2", s1.uid, "reject");
  check("same account votes again → 409", r.status === 409, r);
  r = await call("s2", "GET", `/api/public/vote/${pub}?participant=${s1.uid}`);
  check("account's vote is remembered", r.data.voted === "good", r.data);
  r = await vote("s1", s1.uid, "good");
  check("self-vote → 403", r.status === 403, r);
  r = await vote("ma", s1.uid, "reject");
  check("another account votes Reject", r.status === 200, r);
  r = await fetch(`${BASE}/api/live`).then((x) => x.json());
  check("Vote page lists the live round", r.rounds?.some((x) => x.publicId === pub && x.liveName === s1.name), r);
  r = await call("ca", "POST", "/api/admin/scan", { code: `CNV26:${s2.uid}`, eventKey: "cultural:solo-dance", sessionId: sid });
  check("scan student 2 → becomes live", r.status === 200 && r.data.live, r);
  r = await vote("ma", s1.uid, "good");
  check("voting for previous performer → 409", r.status === 409, r);
  r = await vote("s1", s2.uid, "good");
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
  r = await vote("ma", s2.uid, "good");
  check("vote after end → 409", r.status === 409, r);
  r = await call("ca", "PATCH", `/api/admin/voting/${sid}`, { action: "publish" });
  check("publish results", r.status === 200, r);
  const pubRes = await rtdb("GET", `results/${sid}`);
  check("published: ranked by Good incl. adjustment, no rejects", pubRes?.rows?.[0]?.name === s2.name && pubRes.rows[0].good === 3 && pubRes.rows[1].good === 1 && !JSON.stringify(pubRes).includes("reject"), pubRes?.rows);
  const html = await (await fetch(`${BASE}/results`)).text();
  check("results page shows the round", html.includes("E2E Solo Dance round"));

  console.log("Trials, announcements, judging, teams");
  r = await call("ca", "POST", "/api/admin/trials", { eventKey: "cultural:solo-dance", title: "E2E audition", date: "2026-10-05", time: "16:30", venue: "Auditorium" });
  check("club admin schedules a trial", r.status === 200 && r.data.id, r);
  const trialId = r.data.id;
  r = await call("ca", "POST", "/api/admin/trials", { eventKey: "sports:basketball", date: "2026-10-05", time: "16:30", venue: "Court" });
  check("club admin can't schedule another club's trial → 403", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/announcements", { title: "E2E notice", body: "Bring your music", audience: "cultural:solo-dance" });
  check("club admin posts to their event", r.status === 200, r);
  r = await call("ca", "POST", "/api/admin/announcements", { title: "x", body: "y", audience: "all" });
  check("club admin can't post to everyone → 403", r.status === 403, r);
  r = await call("ma", "POST", "/api/admin/announcements", { title: "E2E everyone", body: "Hello all", audience: "all" });
  check("main admin posts to everyone", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("student sees their trial + both notices", r.data.trials?.some((x) => x.id === trialId) && r.data.announcements?.some((a) => a.title === "E2E notice") && r.data.announcements?.some((a) => a.title === "E2E everyone"), { trials: r.data.trials, ann: r.data.announcements?.map((a) => a.title) });
  r = await call("ca", "GET", "/api/admin/scores?event=cultural:solo-dance");
  const crit = r.data.criteria ?? [];
  check("judging sheet uses rulebook criteria", r.status === 200 && crit.includes("Relevance to theme"), r.data.criteria);
  const full = (n) => Object.fromEntries(crit.map((c) => [c, n]));
  r = await call("ca", "POST", "/api/admin/scores", { entryId: eid(s1.uid, "cultural:solo-dance"), scores: full(8) });
  check("club admin scores student 1", r.status === 200, r);
  await call("ma", "POST", "/api/admin/scores", { entryId: eid(s1.uid, "cultural:solo-dance"), scores: full(6) });
  await call("ca", "POST", "/api/admin/scores", { entryId: eid(s2.uid, "cultural:solo-dance"), scores: full(9) });
  r = await call("ca", "POST", "/api/admin/scores", { entryId: eid(s2.uid, "cultural:solo-dance"), scores: full(11) });
  check("score above 10 → 400", r.status === 400, r);
  r = await call("ca", "GET", "/api/admin/scores?event=cultural:solo-dance");
  const rows = Object.fromEntries((r.data.rows ?? []).map((x) => [x.uid, x]));
  check("average across judges + ranking", rows[s1.uid]?.average === crit.length * 7 && rows[s1.uid]?.judges === 2 && rows[s2.uid]?.rank === 1 && rows[s1.uid]?.rank === 2, r.data.rows);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s2.uid, "literary:mime")}`, { teamRole: "main" });
  check("mark team role (main)", r.status === 200, r);

  console.log("Freeze, block, schedule, activity, final list, stats");
  r = await call("ma", "PATCH", "/api/admin/settings", { selectionFrozen: true });
  check("freeze without password → 401", r.status === 401, r);
  r = await call("ma", "PATCH", "/api/admin/settings", { selectionFrozen: true, finalPassword: FINAL });
  check("main admin freezes selections", r.status === 200, r);
  await new Promise((res) => setTimeout(res, 16000)); // settings are cached up to 15 s per server instance
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s2.uid, "cultural:solo-dance")}`, { status: "shortlisted" });
  check("frozen: status change → 423", r.status === 423, r);
  r = await call("ca", "POST", "/api/admin/entries", { uid: s2.uid, eventKey: "cultural:group-dance" });
  check("frozen: add member → 423", r.status === 423, r);
  r = await call("ma", "PATCH", `/api/admin/entries/${eid(s2.uid, "literary:mime")}`, { teamRole: "sub" });
  check("frozen: team change → 423", r.status === 423, r);
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s2.uid, "cultural:solo-dance")}`, { present: true });
  check("frozen: attendance still allowed", r.status === 200, r);
  r = await call("ma", "PATCH", "/api/admin/settings", { selectionFrozen: false, finalPassword: FINAL });
  check("main admin unfreezes", r.status === 200, r);
  r = await call("ma", "GET", "/api/admin/final");
  check("final list: 2 students, grouped by event", r.status === 200 && r.data.studentCount === 2 && r.data.events.some((g) => g.key === "literary:mime" && g.people.some((p) => p.teamRole === "main")), r.data);
  r = await fetch(`${BASE}/api/admin/final?format=csv-event`, { headers: { Authorization: `Bearer ${tokens.ma}` } });
  check("final list CSV by event", r.status === 200 && (await r.text()).includes("Main"));
  r = await call("ca", "GET", "/api/admin/final");
  check("club admin can't see final list → 403", r.status === 403, r);
  r = await call("ca", "GET", "/api/admin/stats");
  check("club stats scoped to their club", r.status === 200 && r.data.scope === "cultural" && r.data.events.every((e) => e.category === "cultural"), r.data.scope);
  r = await call("ma", "GET", "/api/admin/stats");
  check("main stats: votes counted", r.status === 200 && r.data.votes >= 3 && r.data.students >= 2, { votes: r.data.votes, students: r.data.students });
  r = await call("ma", "PATCH", "/api/admin/settings", { opensAt: Date.now() + 3600e3, closesAt: Date.now() + 7200e3 });
  check("schedule registration window", r.status === 200, r);
  r = await call("ma", "GET", "/api/admin/overview");
  check("scheduled in the future → closed now", r.data.registrationOpen === false && r.data.settings.opensAt > Date.now(), r.data.settings);
  r = await call("ma", "PATCH", "/api/admin/settings", { opensAt: Date.now() - 60e3, closesAt: Date.now() + 3600e3 });
  r = await call("ma", "GET", "/api/admin/overview");
  check("inside the window → open", r.data.registrationOpen === true, r.data.settings);
  r = await call("ma", "PATCH", "/api/admin/settings", { opensAt: null, closesAt: null, registrationOpen: true });
  r = await call("ma", "POST", "/api/admin/blocked", { email: s2.email, reason: "E2E test" });
  check("main admin blocks student 2", r.status === 200, r);
  await new Promise((res) => setTimeout(res, 31000)); // block list is cached up to 30 s per server instance
  r = await call("s2", "GET", "/api/me");
  check("blocked student gets 403 with reason", r.status === 403 && /blocked/i.test(r.data.error) && /E2E test/.test(r.data.error), r);
  r = await call("ma", "DELETE", `/api/admin/blocked?email=${encodeURIComponent(s2.email)}`);
  check("unblock", r.status === 200, r);
  r = await call("ma", "GET", "/api/admin/activity");
  const acts = (r.data.activity ?? []).map((a) => a.action);
  check("activity log records the key actions", ["final", "member.add", "member.remove", "vote.adjust", "settings", "block", "announce", "trial.add", "score", "team"].every((a) => acts.includes(a)), [...new Set(acts)]);
  r = await call("ca", "GET", "/api/admin/activity");
  check("club admin sees only their club's activity", r.status === 200 && r.data.activity.every((a) => a.club === "cultural"), r.data.activity?.slice(0, 3));

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
  // Restore the registration switch through the API too, so page caches refresh.
  if (snapshot && tokens.ma) {
    await rtdb("PUT", `roles/${keyOf(USERS.ma.email)}`, { email: USERS.ma.email, role: "main_admin", club: null });
    await call("ma", "PATCH", "/api/admin/settings", { registrationOpen: !!snapshot.settings?.app?.registrationOpen });
    await rtdb("DELETE", `roles/${keyOf(USERS.ma.email)}`);
    // Drop the activity-log line that restore itself just wrote.
    const log = (await rtdb("GET", "audit")) ?? {};
    const own = Object.entries(log).filter(([, e]) => String(e.by).startsWith("zz-e2e")).map(([k]) => [`audit/${k}`, null]);
    if (own.length) await rtdb("PATCH", "", Object.fromEntries(own));
  }
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
