// Targeted test for "add a student by email". Safe while the site is in use:
// it only touches its own test accounts and removes exactly what it created.
//
//   node scripts/e2e-manual-test.mjs        (against localhost:3000)
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
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const E = {
  ca: "zz-e2e-m-clubadmin@nift.ac.in",
  ma: "zz-e2e-m-mainadmin@nift.ac.in",
  n1: "zz-e2e-m-newstudent@nift.ac.in", // never signed in before being added
  r1: "zz-e2e-m-signedin@nift.ac.in", // signed in once, never registered
};
const uids = {};
const tokens = {};
const createdUids = new Set();

async function signIn(key) {
  let rec;
  try { rec = await auth.getUserByEmail(E[key]); } catch { rec = await auth.createUser({ email: E[key], emailVerified: true, displayName: key }); }
  uids[key] = rec.uid;
  createdUids.add(rec.uid);
  const custom = await auth.createCustomToken(rec.uid);
  tokens[key] = (await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  })).json()).idToken;
}
async function call(who, method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = t; }
  return { status: r.status, data };
}
const student = (email, studentId, events, extra = {}) => ({
  email, fullName: "ZZ Manual Test", studentId, department: "TD", semester: "5", gender: "Female", events, ...extra,
});
const addedUids = new Set();

async function main() {
  if (((await rtdb("GET", "settings/app")) ?? {}).selectionFrozen) throw new Error("Selections are frozen — unfreeze first.");
  for (const k of ["ca", "ma", "r1"]) await signIn(k);
  await rtdb("PUT", `roles/${keyOf(E.ca)}`, { email: E.ca, role: "club_admin", club: "cultural", addedBy: "e2e", addedAt: Date.now() });
  await rtdb("PUT", `roles/${keyOf(E.ma)}`, { email: E.ma, role: "main_admin", club: null, addedBy: "e2e", addedAt: Date.now() });
  await call("r1", "GET", "/api/me"); // r1 has signed in once (users record exists)

  console.log("Club admin adds a brand-new student by email");
  let r = await call("ca", "POST", "/api/admin/students", student(E.n1, "ZZTEST/M/01", ["cultural:solo-dance"]));
  check("added, with a site id (not signed in yet)", r.status === 200 && r.data.existing === false && /^M/.test(r.data.uid), r);
  const n1Site = r.data.uid;
  addedUids.add(n1Site);
  r = await call("ca", "POST", "/api/admin/students", student("zz-e2e-m-other@nift.ac.in", "ZZTEST/M/02", ["sports:basketball"]));
  check("club admin can't add to another club's event → 403", r.status === 403, r);
  r = await call("ca", "POST", "/api/admin/students", student("zz-e2e-m-other@nift.ac.in", "zztest/m/01", ["cultural:solo-dance"]));
  check("duplicate student ID → 409", r.status === 409, r);
  r = await call("ca", "POST", "/api/admin/students", student("someone@gmail.com", "ZZTEST/M/03", ["cultural:solo-dance"]));
  check("non-NIFT email → 422", r.status === 422, r);
  r = await call("ca", "POST", "/api/admin/students", { ...student("zz-e2e-m-other@nift.ac.in", "ZZTEST/M/04", ["cultural:solo-dance"]), department: "" });
  check("missing department → 422 with field error", r.status === 422 && r.data.details?.department, r);
  r = await call("ca", "GET", "/api/admin/entries?event=cultural:solo-dance");
  const e1 = r.data.entries?.find((e) => e.uid === n1Site);
  check("appears in Participants with an initials photo", e1 && e1.student.photoUrl.startsWith("data:image/svg+xml") && e1.addedBy === E.ca, e1);

  console.log("The student signs in later with that email");
  await signIn("n1");
  r = await call("n1", "GET", "/api/me");
  check("their Google login maps to the added registration", r.status === 200 && r.data.user.uid === n1Site && r.data.registration?.fullName === "ZZ Manual Test" && r.data.entries.length === 1, { uid: r.data.user?.uid, site: n1Site, reg: !!r.data.registration });
  r = await call("n1", "POST", "/api/registration", {});
  check("can't register again (already registered)", r.status === 409 || r.status === 403 || r.status === 422, r);

  console.log("Adding an already-registered email just adds events");
  r = await call("ca", "POST", "/api/admin/students", student(E.n1, "IGNORED", ["cultural:group-dance", "cultural:solo-dance"]));
  check("existing → added 1 new event (skipped the one they have)", r.status === 200 && r.data.existing === true && r.data.added === 1, r);
  r = await call("n1", "GET", "/api/me");
  check("student now has 2 events (Event 1 & 2)", r.data.entries.length === 2 && r.data.registration.picks.e2 === "cultural:group-dance", r.data.registration?.picks);

  console.log("Main admin adds someone who signed in before but never registered");
  r = await call("ma", "POST", "/api/admin/students", student(E.r1, "ZZTEST/M/05", ["literary:mime", "esse:monologue"]));
  check("uses their real account id (no mapping needed)", r.status === 200 && r.data.uid === uids.r1, r);
  addedUids.add(uids.r1);
  r = await call("r1", "GET", "/api/me");
  check("they see the registration immediately", r.data.registration?.studentId === "ZZTEST/M/05" && r.data.entries.length === 2, r.data.registration);
  r = await call("ca", "GET", "/api/admin/directory");
  check("directory lists both for Add member", [n1Site, uids.r1].every((u) => r.data.students?.some((s) => s.uid === u)));

  console.log("Delete removes the email mapping");
  r = await call("ma", "DELETE", `/api/admin/students/${n1Site}`);
  check("main admin deletes the added student", r.status === 200, r);
  const alias = await rtdb("GET", `aliases/${keyOf(E.n1)}`);
  check("email mapping removed", alias === null, alias);
  addedUids.delete(n1Site);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const regs = (await rtdb("GET", "registrations")) ?? {};
  const mine = Object.values(regs).filter((r) => String(r.email).startsWith("zz-e2e-m-"));
  const sel = (await rtdb("GET", "sel")) ?? {};
  const entries = (await rtdb("GET", "entries")) ?? {};
  const ids = new Set([...mine.map((r) => r.uid), ...addedUids, ...createdUids]);
  const upd = {};
  for (const r of mine) {
    upd[`registrations/${r.uid}`] = null;
    upd[`studentIds/${r.studentId.toLowerCase().replace(/\./g, ",").replace(/[#$[\]/]/g, "_")}`] = null;
  }
  for (const id of Object.keys(entries)) if ([...ids].some((u) => id.startsWith(`${u}_`))) upd[`entries/${id}`] = null;
  for (const id of Object.keys(sel.status ?? {})) if ([...ids].some((u) => id.startsWith(`${u}_`))) upd[`sel/status/${id}`] = null;
  for (const u of ids) {
    upd[`users/${u}`] = null;
    if (sel.counts?.[u] !== undefined) upd[`sel/counts/${u}`] = null;
  }
  for (const e of [...Object.values(E), "zz-e2e-m-other@nift.ac.in"]) {
    upd[`aliases/${keyOf(e)}`] = null;
    upd[`roles/${keyOf(e)}`] = null;
  }
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e")) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  for (const u of createdUids) await auth.deleteUser(u).catch(() => {});
  console.log(`  removed ${Object.keys(upd).length} test paths`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
