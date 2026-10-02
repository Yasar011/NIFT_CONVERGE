// Targeted test for managing the Final 50 list (remove / move / add). Safe while
// the site is in use: test students only, everything removed afterwards, and
// shared seat/campus counters are restored through the API.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-final-test.mjs     (against localhost:3000)
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

const E = { ma: "zz-e2e-f-mainadmin@nift.ac.in", s1: "zz-e2e-f-student@nift.ac.in", s2: "zz-e2e-f-student2@nift.ac.in" };
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
  // s1 registered for Mime + Meme Making (Female); s2 for Monologue (Male).
  const mk = (k, gender, picks) => {
    const uid = uids[k];
    const student = { name: `ZZ Final ${k}`, studentId: `ZZTEST/F/${k}`, department: "FD", semester: "3", gender, email: E[k], phone: "", residence: "", photoUrl: "" };
    const upd = { [`registrations/${uid}`]: { uid, email: E[k], fullName: student.name, studentId: student.studentId, department: "FD", semester: "3", gender, phone: "", residence: "", photo: null, picks: { e1: picks[0] ?? "", e2: picks[1] ?? "", e3: picks[2] ?? "", e4: "", e5: "" }, createdAt: now } };
    picks.forEach((key, i) => {
      upd[`entries/${eid(uid, key)}`] = { uid, eventKey: key, category: key.split(":")[0], slot: `e${i + 1}`, student, attendance: null, video: null, createdAt: now };
      upd[`sel/status/${eid(uid, key)}`] = "registered";
    });
    return rtdb("PATCH", "", upd);
  };
  await mk("s1", "Female", ["literary:mime", "literary:meme-making"]);
  await mk("s2", "Male", ["esse:monologue"]);
  const { s1, s2 } = uids;

  console.log("Add to final list");
  let r = await call("ma", "POST", "/api/admin/final", { action: "add", uid: s1, eventKey: "literary:mime", finalPassword: "wrong" });
  check("wrong password → 401", r.status === 401, r);
  r = await fin({ action: "add", uid: s1, eventKey: "literary:mime" });
  check("add student to a registered event's final list", r.status === 200 && (await statusOf(eid(s1, "literary:mime"))) === "selected", r);
  r = await fin({ action: "add", uid: s1, eventKey: "cultural:group-dance" });
  check("event they didn't register for → refused (409)", r.status === 409 && /didn't register/.test(r.data.error) && !(await statusOf(eid(s1, "cultural:group-dance"))), r);
  r = await fin({ action: "add", uid: s1, eventKey: "literary:mime" });
  check("already final → 409", r.status === 409, r);

  console.log("Move");
  r = await fin({ action: "move", entryId: eid(s1, "literary:mime"), toEvent: "literary:meme-making" });
  check("move to their other registered event (Mime → Meme Making)", r.status === 200, r);
  check("old event back to Shortlisted", (await statusOf(eid(s1, "literary:mime"))) === "shortlisted");
  check("new event Selected", (await statusOf(eid(s1, "literary:meme-making"))) === "selected");
  const before = (await rtdb("GET", "sel/counts"))?.[s1];
  r = await fin({ action: "move", entryId: eid(s1, "literary:meme-making"), toEvent: "cultural:group-dance" });
  check("move to an event they didn't register for → refused, stays put", r.status === 409 && /didn't register/.test(r.data.error) && (await statusOf(eid(s1, "literary:meme-making"))) === "selected" && (await rtdb("GET", "sel/counts"))?.[s1] === before, r);
  r = await fin({ action: "move", entryId: eid(s1, "literary:meme-making"), toEvent: "literary:mime" });
  check("move back to Mime", r.status === 200 && (await statusOf(eid(s1, "literary:mime"))) === "selected", r);

  console.log("Remove");
  r = await call("ma", "GET", "/api/admin/final");
  const person = r.data.events?.find((g) => g.key === "literary:mime")?.people.find((p) => p.id === eid(s1, "literary:mime"));
  check("final list: student once, with their registered events for Move", r.data.students?.filter((s) => s.uid === s1).length === 1 && person?.registered?.length === 2, person);
  r = await fin({ action: "remove", entryId: eid(s1, "literary:mime") });
  check("remove from final list → Shortlisted", r.status === 200 && (await statusOf(eid(s1, "literary:mime"))) === "shortlisted", r);
  r = await fin({ action: "remove", entryId: eid(s1, "literary:mime") });
  check("removing someone not final → 409", r.status === 409, r);

  check("counters restored for cleanup", ((await rtdb("GET", "sel/counts"))?.[s1] ?? 0) === 0);
  console.log(`\n${pass} passed, ${fail} failed`);
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
