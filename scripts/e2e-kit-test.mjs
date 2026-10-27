// Targeted test: jersey kit sizes for students in the final list.
// Safe while the site is in use: test students only; the one selection is undone
// through the API so shared seat/campus counters return to where they were.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-kit-test.mjs     (against localhost:3000)
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
const tok = async () => (await app.options.credential.getAccessToken()).access_token;
const rtdb = async (method, path, body) =>
  (await fetch(`${DB}/${path}.json`, { method, headers: { Authorization: `Bearer ${await tok()}` }, body: body === undefined ? undefined : JSON.stringify(body) })).json();
const keyOf = (s) => s.toLowerCase().replace(/\./g, ",");
const eid = (uid, key) => `${uid}_${key.replace(":", "__")}`;

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const E = { ma: "zz-e2e-kit-mainadmin@nift.ac.in", s1: "zz-e2e-kit-student@nift.ac.in", s2: "zz-e2e-kit-other@nift.ac.in" };
const uids = {}, tokens = {};
const statusOf = async (id) => (await rtdb("GET", `sel/status/${id}`));

async function signIn(k) {
  let rec;
  try { rec = await auth.getUserByEmail(E[k]); } catch { rec = await auth.createUser({ email: E[k], emailVerified: true, displayName: k }); }
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
const fin = (body) => call("ma", "POST", "/api/admin/final", { finalPassword: FINAL, ...body });

async function main() {
  if (!FINAL) throw new Error("Set E2E_FINAL_PASSWORD.");
  if (((await rtdb("GET", "settings/app")) ?? {}).selectionFrozen) throw new Error("Selections are frozen — unfreeze first.");
  for (const k of Object.keys(E)) await signIn(k);
  await rtdb("PUT", `roles/${keyOf(E.ma)}`, { email: E.ma, role: "main_admin", club: null, addedBy: "e2e", addedAt: Date.now() });
  const now = Date.now();
  for (const k of ["s1", "s2"]) {
    const uid = uids[k];
    const key = "sports:100m-girls";
    const student = { name: `ZZ Kit ${k}`, studentId: `ZZTEST/K/${k}`, department: "FD", semester: "3", gender: "Female", email: E[k], phone: "9000000000", residence: "", photoUrl: "" };
    await rtdb("PATCH", "", {
      [`registrations/${uid}`]: { uid, email: E[k], fullName: student.name, studentId: student.studentId, department: "FD", semester: "3", gender: "Female", phone: "9000000000", residence: "", photo: null, picks: { e1: key, e2: "", e3: "", e4: "", e5: "" }, createdAt: now },
      [`entries/${eid(uid, key)}`]: { uid, eventKey: key, category: "sports", slot: "e1", student, attendance: null, video: null, createdAt: now },
      [`sel/status/${eid(uid, key)}`]: "registered",
    });
  }
  const { s1, s2 } = uids;
  const SIZES = { tshirt: "M", shorts: "L", jacket: "M", trackpant: "2XL" };

  console.log("Only for the final list");
  let r = await call("s1", "PUT", "/api/me/kit", SIZES);
  check("not final yet → 403", r.status === 403, r);
  r = await fin({ action: "add", uid: s1, eventKey: "sports:100m-girls" });
  check("main admin selects the student", r.status === 200, r);

  console.log("Student sets sizes");
  r = await call("s1", "PUT", "/api/me/kit", { ...SIZES, trackpant: "XXL" });
  check("track pant has no XXL (chart says 2XL) → 422", r.status === 422 && r.data.details?.trackpant, r.data);
  r = await call("s1", "PUT", "/api/me/kit", { tshirt: "M" });
  check("missing items → 422 for each", r.status === 422 && r.data.details?.shorts && r.data.details?.jacket, r.data);
  r = await call("s1", "PUT", "/api/me/kit", SIZES);
  check("valid sizes → saved", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  check("My Converge returns the kit", r.data.registration?.kit?.trackpant === "2XL" && r.data.kitLocked === false, r.data.registration?.kit);
  r = await call("s1", "PUT", "/api/me/kit", { ...SIZES, forUid: s2 });
  check("student can't set someone else's sizes → 403", r.status === 403, r);

  console.log("Main admin");
  r = await call("ma", "GET", "/api/admin/final");
  check("Final 50 lists the student's kit", r.data.students?.find((s) => s.uid === s1)?.kit?.tshirt === "M", r.data.students?.find((s) => s.uid === s1));
  r = await call("ma", "PUT", "/api/me/kit", { ...SIZES, tshirt: "XL", forUid: s1 });
  check("main admin edits sizes for them", r.status === 200 && (await rtdb("GET", `registrations/${s1}/kit/tshirt`)) === "XL", r);
  r = await call("ma", "GET", "/api/admin/final?format=csv-kit");
  check("kit CSV: row + totals", typeof r.data === "string" && /ZZ Kit s1,ZZTEST\/K\/s1,FD,Female,9000000000,XL,L,M,2XL,One size/.test(r.data) && r.data.includes("TOTALS"), String(r.data).slice(0, 300));
  r = await call("ma", "PUT", "/api/me/kit", { ...SIZES, forUid: s2 });
  check("not final → 403 even for admin", r.status === 403, r);

  r = await fin({ action: "remove", entryId: eid(s1, "sports:100m-girls") });
  check("selection undone for cleanup", r.status === 200 && ((await rtdb("GET", `sel/counts/${s1}`)) ?? 0) === 0, r);
  console.log(`
${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const upd = {};
  const entries = (await rtdb("GET", "entries")) ?? {};
  const sel = (await rtdb("GET", "sel")) ?? {};
  for (const k of ["s1", "s2"]) {
    const uid = uids[k];
    if (!uid) continue;
    for (const id of Object.keys(entries)) if (id.startsWith(`${uid}_`)) upd[`entries/${id}`] = null;
    for (const id of Object.keys(sel.status ?? {})) if (id.startsWith(`${uid}_`)) upd[`sel/status/${id}`] = null;
    for (const id of Object.keys(sel.prev ?? {})) if (id.startsWith(`${uid}_`)) upd[`sel/prev/${id}`] = null;
    if (sel.counts?.[uid] !== undefined) upd[`sel/counts/${uid}`] = null;
    Object.assign(upd, { [`registrations/${uid}`]: null, [`users/${uid}`]: null });
  }
  if (uids.ma) Object.assign(upd, { [`users/${uids.ma}`]: null, [`roles/${keyOf(E.ma)}`]: null });
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e")) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  for (const u of Object.values(uids)) await auth.deleteUser(u).catch(() => {});
  console.log(`  removed ${Object.keys(upd).length} test paths`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
