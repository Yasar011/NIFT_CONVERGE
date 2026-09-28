// Targeted test for the approval queue + bulk actions. Safe while the site is
// in use: it creates two test students, touches only their own entries, and
// removes exactly what it created. No settings changes, no snapshot/restore.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-queue-test.mjs     (against localhost:3000)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
const tokenFor = async () => (await app.options.credential.getAccessToken()).access_token;
const rtdb = async (method, path, body) => {
  const r = await fetch(`${DB}/${path}.json`, { method, headers: { Authorization: `Bearer ${await tokenFor()}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return r.json();
};
const keyOf = (s) => s.toLowerCase().replace(/\./g, ",");
const eid = (uid, key) => `${uid}_${key.replace(":", "__")}`;

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const USERS = {
  s1: { email: "zz-e2e-q-student1@nift.ac.in", name: "ZZ Test Student One", gender: "Male", sid: "ZZTEST/Q/01", picks: ["cultural:solo-dance", "cultural:group-dance", "literary:mime"] },
  s2: { email: "zz-e2e-q-student2@nift.ac.in", name: "ZZ Test Student Two", gender: "Female", sid: "ZZTEST/Q/02", picks: ["cultural:group-dance", "literary:mime", "esse:monologue"] },
  ca: { email: "zz-e2e-q-clubadmin@nift.ac.in", name: "ZZ Test Club Admin" },
  ma: { email: "zz-e2e-q-mainadmin@nift.ac.in", name: "ZZ Test Main Admin" },
};
const tokens = {};
const createdEntries = [];

async function idToken(uid) {
  const custom = await auth.createCustomToken(uid);
  const j = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  })).json();
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

async function main() {
  if (!FINAL) throw new Error("Set E2E_FINAL_PASSWORD.");
  const settings = (await rtdb("GET", "settings/app")) ?? {};
  if (settings.selectionFrozen) throw new Error("Selections are frozen — unfreeze first (this test changes statuses).");

  console.log("Setup (test students written directly, not via registration)");
  for (const [k, u] of Object.entries(USERS)) {
    let rec;
    try { rec = await auth.getUserByEmail(u.email); } catch { rec = await auth.createUser({ email: u.email, emailVerified: true, displayName: u.name }); }
    u.uid = rec.uid;
    tokens[k] = await idToken(rec.uid);
  }
  await rtdb("PUT", `roles/${keyOf(USERS.ca.email)}`, { email: USERS.ca.email, role: "club_admin", club: "cultural", addedBy: "e2e", addedAt: Date.now() });
  await rtdb("PUT", `roles/${keyOf(USERS.ma.email)}`, { email: USERS.ma.email, role: "main_admin", club: null, addedBy: "e2e", addedAt: Date.now() });
  const now = Date.now();
  for (const k of ["s1", "s2"]) {
    const u = USERS[k];
    const picks = { e1: u.picks[0], e2: u.picks[1], e3: u.picks[2], e4: "", e5: "" };
    const photo = { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "converge26/profiles/test", cloud: "demo" };
    const reg = { uid: u.uid, email: u.email, fullName: u.name, studentId: u.sid, department: "FD", semester: "3", gender: u.gender, phone: "9000000000", residence: "Hostel", photo, picks, createdAt: now };
    const student = { name: u.name, studentId: u.sid, department: "FD", semester: "3", gender: u.gender, email: u.email, phone: "9000000000", residence: "Hostel", photoUrl: photo.url };
    const upd = { [`registrations/${u.uid}`]: reg };
    u.picks.forEach((key, i) => {
      const id = eid(u.uid, key);
      createdEntries.push(id);
      upd[`entries/${id}`] = { uid: u.uid, eventKey: key, category: key.split(":")[0], slot: `e${i + 1}`, student, attendance: null, video: null, createdAt: now };
      upd[`sel/status/${id}`] = "registered";
    });
    await rtdb("PATCH", "", upd);
  }
  const { s1, s2 } = USERS;
  const gd1 = eid(s1.uid, "cultural:group-dance");

  console.log("Recommend");
  let r = await call("ca", "PATCH", `/api/admin/entries/${gd1}`, { recommend: true, recommendNote: "Strong audition" });
  check("club admin recommends", r.status === 200, r);
  r = await call("ca", "PATCH", `/api/admin/entries/${eid(s2.uid, "literary:mime")}`, { recommend: true });
  check("club admin can't recommend in another club → 403", r.status === 403, r);
  r = await call("s1", "PATCH", `/api/admin/entries/${gd1}`, { recommend: true });
  check("student can't recommend → 403", r.status === 403, r);
  r = await call("ca", "GET", `/api/admin/entries?event=cultural:group-dance`);
  check("entry shows pending recommendation", r.data.entries?.find((e) => e.id === gd1)?.recommendation?.state === "pending", r.data.entries?.find((e) => e.id === gd1));

  console.log("Approval queue");
  r = await call("ca", "GET", "/api/admin/queue");
  check("club admin can't open the queue → 403", r.status === 403, r);
  r = await call("ma", "GET", "/api/admin/queue");
  const item = r.data.items?.find((i) => i.id === gd1);
  check("queue lists it with seats, selections, note", item && item.seats.capacity === 10 && item.studentSelected === 0 && item.recommendation.note === "Strong audition", item);
  r = await call("ma", "GET", "/api/admin/overview");
  check("overview counts pending approvals", r.data.pendingApprovals >= 1, r.data.pendingApprovals);
  r = await call("ca", "PATCH", `/api/admin/entries/${gd1}`, { decline: true });
  check("club admin can't decline → 403", r.status === 403, r);
  r = await call("ma", "PATCH", `/api/admin/entries/${gd1}`, { decline: true });
  check("main admin declines", r.status === 200, r);
  r = await call("ma", "GET", "/api/admin/queue");
  check("declined leaves the queue", !r.data.items?.some((i) => i.id === gd1), r.data.items?.map((i) => i.id));
  r = await call("ca", "GET", `/api/admin/entries?event=cultural:group-dance`);
  check("club admin sees it was declined", r.data.entries?.find((e) => e.id === gd1)?.recommendation?.state === "declined");
  await call("ca", "PATCH", `/api/admin/entries/${gd1}`, { recommend: true });
  r = await call("ma", "PATCH", `/api/admin/entries/${gd1}`, { status: "selected" });
  check("approve without password → 401", r.status === 401, r);
  r = await call("ma", "PATCH", `/api/admin/entries/${gd1}`, { status: "selected", finalPassword: FINAL });
  check("approve with password → selected", r.status === 200, r);
  r = await call("ca", "GET", `/api/admin/entries?event=cultural:group-dance`);
  const approved = r.data.entries?.find((e) => e.id === gd1);
  check("approved: selected, recommendation cleared", approved?.status === "selected" && !approved?.recommendation, approved);
  r = await call("ma", "GET", "/api/admin/queue");
  check("approved leaves the queue", !r.data.items?.some((i) => i.id === gd1));

  console.log("Bulk actions");
  const sd1 = eid(s1.uid, "cultural:solo-dance"), gd2 = eid(s2.uid, "cultural:group-dance");
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1, gd2, gd1], action: "status", status: "shortlisted" });
  const res = Object.fromEntries((r.data.results ?? []).map((x) => [x.id, x]));
  check("bulk shortlist: 2 done, selected one skipped", r.status === 200 && res[sd1]?.ok && res[gd2]?.ok && res[gd1]?.ok === false && /selected/i.test(res[gd1]?.error), r.data);
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1], action: "status", status: "selected" });
  check("bulk can't make final selections → 400", r.status === 400, r);
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1, eid(s2.uid, "literary:mime")], action: "present", present: true });
  check("bulk with another club's entry → 403 (nothing changed)", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1, gd2], action: "present", present: true });
  check("bulk mark present", r.status === 200 && r.data.results.every((x) => x.ok), r.data);
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1, gd2], action: "recommend", recommend: true });
  check("bulk recommend", r.status === 200 && r.data.results.every((x) => x.ok), r.data);
  r = await call("ma", "GET", "/api/admin/queue");
  check("both appear in the queue", [sd1, gd2].every((id) => r.data.items?.some((i) => i.id === id)), r.data.items?.map((i) => i.id));
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1, gd2], action: "notice", notice: { title: "ZZ test notice", body: "Callback at 5pm" } });
  check("bulk notice to 2 students", r.status === 200 && r.data.sentTo === 2, r.data);
  r = await call("s2", "GET", "/api/me");
  const n = r.data.announcements?.find((a) => a.title === "ZZ test notice");
  check("student sees it 'for you', without others' ids", n && n.audience === "students" && !n.uids, n);
  r = await call("ca", "GET", `/api/admin/entries?event=cultural:group-dance`);
  check("attendance saved via bulk", r.data.entries?.find((e) => e.id === gd2)?.attendance?.present === true);
  r = await call("ca", "POST", "/api/admin/entries/bulk", { ids: [sd1, gd2], action: "status", status: "not_selected" });
  check("bulk not selected also clears recommendations", r.status === 200 && r.data.results.every((x) => x.ok), r.data);
  r = await call("ma", "GET", "/api/admin/queue");
  check("queue empty of test entries", ![sd1, gd2, gd1].some((id) => r.data.items?.some((i) => i.id === id)));

  // Undo the approval through the API so shared seat/campus counters are restored.
  r = await call("ma", "PATCH", `/api/admin/entries/${gd1}`, { status: "registered", finalPassword: FINAL });
  check("undo test selection (restores counters)", r.status === 200, r);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const users = Object.values(USERS).filter((u) => u.uid);
  const uids = users.map((u) => u.uid);
  const sel = (await rtdb("GET", "sel")) ?? {};
  const upd = {};
  for (const id of createdEntries) {
    upd[`entries/${id}`] = null;
    upd[`scores/${id}`] = null;
    if (sel.status?.[id] !== undefined) upd[`sel/status/${id}`] = null;
    if (sel.prev?.[id] !== undefined) upd[`sel/prev/${id}`] = null;
  }
  for (const u of users) {
    upd[`registrations/${u.uid}`] = null;
    upd[`users/${u.uid}`] = null;
    upd[`roles/${keyOf(u.email)}`] = null;
    if (sel.counts?.[u.uid] !== undefined) upd[`sel/counts/${u.uid}`] = null;
  }
  const notices = (await rtdb("GET", "announcements")) ?? {};
  for (const [id, a] of Object.entries(notices)) if (String(a.createdBy).startsWith("zz-e2e")) upd[`announcements/${id}`] = null;
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e")) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  for (const uid of uids) await auth.deleteUser(uid).catch(() => {});
  const after = (await rtdb("GET", "sel")) ?? {};
  const leftovers = Object.keys(after.status ?? {}).filter((id) => uids.some((u) => id.startsWith(u)));
  console.log(`  removed ${Object.keys(upd).length} test paths; leftover test entries in sel: ${leftovers.length}`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
