// Targeted test: the main admin can knowingly select a student past 3 events.
// Safe while the site is in use: one test student; selections are undone through
// the API so shared seat/campus counters return to where they were.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-extra-test.mjs     (against localhost:3000)
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

const E = { ma: "zz-e2e-x4-mainadmin@nift.ac.in", s1: "zz-e2e-x4-student@nift.ac.in" };
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
  const uid = uids.s1;
  const picks = ["sports:100m-girls", "sports:200m-girls", "sports:400m-girls", "sports:shot-put-girls", "sports:discus-throw-girls"];
  const student = { name: "ZZ Extra", studentId: "ZZTEST/X4/1", department: "FD", semester: "3", gender: "Female", email: E.s1, phone: "", residence: "", photoUrl: "" };
  const upd = { [`registrations/${uid}`]: { uid, email: E.s1, fullName: student.name, studentId: student.studentId, department: "FD", semester: "3", gender: "Female", phone: "", residence: "", photo: null, picks: Object.fromEntries(picks.map((k, i) => [`e${i + 1}`, k])), createdAt: now } };
  picks.forEach((key, i) => {
    upd[`entries/${eid(uid, key)}`] = { uid, eventKey: key, category: "sports", slot: `e${i + 1}`, student, attendance: null, video: null, createdAt: now };
    upd[`sel/status/${eid(uid, key)}`] = "registered";
  });
  await rtdb("PATCH", "", upd);
  const [a, b, c, d, e] = picks.map((k) => eid(uid, k));
  const count = async () => (await rtdb("GET", `sel/counts/${uid}`)) ?? 0;

  console.log("Up to 3 as before");
  for (const k of picks.slice(0, 3)) {
    const r = await fin({ action: "add", uid, eventKey: k });
    check(`select ${k}`, r.status === 200, r);
  }
  check("4th and 5th auto-locked", (await statusOf(d)) === "locked" && (await statusOf(e)) === "locked");

  console.log("Past 3, knowingly");
  let r = await fin({ action: "add", uid, eventKey: picks[3] });
  check("4th without allowExtra → 409 with limit details", r.status === 409 && r.data.details?.limit === "selections" && r.data.details?.count === "3", r);
  r = await fin({ action: "add", uid, eventKey: picks[3], allowExtra: true });
  check("4th with allowExtra → selected", r.status === 200 && (await statusOf(d)) === "selected" && (await count()) === 4, r);
  check("5th stays locked", (await statusOf(e)) === "locked");
  r = await call("ma", "PATCH", `/api/admin/entries/${e}`, { status: "selected", finalPassword: FINAL });
  check("Participants: 5th without allowExtra → 409 limit", r.status === 409 && r.data.details?.limit === "selections", r);
  r = await call("ma", "PATCH", `/api/admin/entries/${e}`, { status: "selected", finalPassword: FINAL, allowExtra: true });
  check("Participants: 5th with allowExtra → selected (5 events)", r.status === 200 && (await count()) === 5, r);

  console.log("Coming back down");
  r = await fin({ action: "remove", entryId: e });
  check("5 → 4: removed event locks (still at 3+)", r.status === 200 && (await statusOf(e)) === "locked" && (await count()) === 4, await statusOf(e));
  r = await fin({ action: "move", entryId: d, toEvent: picks[4] });
  check("move while over the limit → asks for allowExtra", r.status === 409 && r.data.details?.limit === "selections" && (await statusOf(d)) === "selected" && (await count()) === 4, r);
  r = await fin({ action: "move", entryId: d, toEvent: picks[4], allowExtra: true });
  check("move with allowExtra works", r.status === 200 && (await statusOf(e)) === "selected" && (await statusOf(d)) === "locked" && (await count()) === 4, r);
  r = await fin({ action: "remove", entryId: e });
  check("4 → 3: removed event locks", r.status === 200 && (await statusOf(e)) === "locked" && (await count()) === 3, r);
  r = await fin({ action: "remove", entryId: c });
  check("3 → 2: the rest unlock as usual", r.status === 200 && (await count()) === 2 && (await statusOf(c)) === "shortlisted" && (await statusOf(d)) === "shortlisted" && (await statusOf(e)) === "shortlisted", [await statusOf(c), await statusOf(d), await statusOf(e)]);
  for (const id of [a, b]) await fin({ action: "remove", entryId: id });
  check("counters back to 0 for cleanup", (await count()) === 0);
  console.log(`
${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const upd = {};
  const entries = (await rtdb("GET", "entries")) ?? {};
  const sel = (await rtdb("GET", "sel")) ?? {};
  for (const k of ["s1"]) {
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
