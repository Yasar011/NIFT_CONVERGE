// Targeted test: the signed declaration for students in the final list.
// Safe while the site is in use: test students only; the one selection is undone
// through the API so shared seat/campus counters return to where they were.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-declaration-test.mjs     (against localhost:3000)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
import QRCode from "qrcode";

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

const E = { ma: "zz-e2e-dec-mainadmin@nift.ac.in", s1: "zz-e2e-dec-student@nift.ac.in", s2: "zz-e2e-dec-other@nift.ac.in" };
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
  // A girls' event with a free seat on the live list (seats fill up as the real selection goes on).
  const taken = (await rtdb("GET", "sel/events")) ?? {};
  const key = ["100m-girls", "200m-girls", "400m-girls", "shot-put-girls", "discus-throw-girls", "high-jump-girls", "table-tennis-girls", "badminton-girls", "squash-girls"]
    .map((slug) => `sports:${slug}`)
    .find((k) => !taken[k.replace(":", "__")]);
  if (!key) throw new Error("No girls' event with a free seat to test with.");
  for (const k of ["s1", "s2"]) {
    const uid = uids[k];
    const student = { name: `ZZ Dec ${k}`, studentId: `ZZTEST/D/${k}`, department: "FD", semester: "3", gender: "Female", email: E[k], phone: "9000000000", residence: "", photoUrl: "" };
    await rtdb("PATCH", "", {
      [`registrations/${uid}`]: { uid, email: E[k], fullName: student.name, studentId: student.studentId, department: "FD", semester: "3", gender: "Female", phone: "9000000000", residence: "", photo: null, picks: { e1: key, e2: "", e3: "", e4: "", e5: "" }, createdAt: now },
      [`entries/${eid(uid, key)}`]: { uid, eventKey: key, category: "sports", slot: "e1", student, attendance: null, video: null, createdAt: now },
      [`sel/status/${eid(uid, key)}`]: "registered",
    });
  }
  const { s1, s2 } = uids;
  const SIG = await QRCode.toDataURL("zz-e2e signature");
  const SIZES = { tshirt: "M", shorts: "L", jacket: "M", trackpant: "2XL" };

  console.log("Only for the final list");
  let r = await call("s1", "PUT", "/api/me/declaration", { agree: true, signature: SIG });
  check("not final yet → 403", r.status === 403, r);
  r = await fin({ action: "add", uid: s1, eventKey: key });
  check("main admin selects the student", r.status === 200, r);

  console.log("Signing");
  r = await call("s1", "PUT", "/api/me/kit", SIZES);
  check("kit closed until signed → 403", r.status === 403 && /declaration/i.test(r.data.error), r);
  r = await call("s1", "PUT", "/api/me/declaration", { agree: false, signature: SIG });
  check("must tick agree → 422", r.status === 422 && r.data.details?.agree, r.data);
  r = await call("s1", "PUT", "/api/me/declaration", { agree: true, signature: "data:image/png;base64,AAAA" });
  check("blank / fake signature → 422", r.status === 422 && r.data.details?.signature, r.data);
  r = await call("s1", "PUT", "/api/me/declaration", { agree: true, signature: "data:image/svg+xml;base64,PHN2Zz4=" });
  check("non-PNG signature → 422", r.status === 422, r.data);
  r = await call("s1", "GET", "/api/me/declaration");
  check("no copy before signing → 404", r.status === 404, r);
  r = await call("s1", "PUT", "/api/me/declaration", { agree: true, signature: SIG });
  check("signs → saved", r.status === 200, r);
  const rec = await rtdb("GET", `declarations/${s1}`);
  check("record keeps name, ID, events, signature, time", rec?.name === "ZZ Dec s1" && rec?.studentId === "ZZTEST/D/s1" && rec?.events?.length === 1 && rec?.signature === SIG && rec?.at > 0 && rec?.version === 1, { ...rec, signature: rec?.signature?.slice(0, 30) });
  r = await call("s1", "GET", "/api/me");
  check("My Converge shows signed (no signature sent to the browser)", r.data.registration?.declaration?.at === rec?.at && !JSON.stringify(r.data).includes(SIG.slice(30, 80)), r.data.registration?.declaration);
  r = await call("s1", "PUT", "/api/me/declaration", { agree: true, signature: SIG });
  check("can't sign twice → 409", r.status === 409, r);
  r = await call("s1", "PUT", "/api/me/kit", SIZES);
  check("kit opens after signing", r.status === 200, r);
  const own = await fetch(BASE + "/api/me/declaration", { headers: { Authorization: `Bearer ${tokens.s1}` } });
  const ownPdf = Buffer.from(await own.arrayBuffer());
  check("student downloads their own PDF", own.status === 200 && own.headers.get("content-type") === "application/pdf" && ownPdf.subarray(0, 5).toString() === "%PDF-", own.status);

  console.log("Main admin");
  r = await call("s2", "GET", "/api/admin/declarations");
  check("students can't download everyone's → 403", r.status === 403, r);
  r = await call("ma", "GET", "/api/admin/final");
  check("Final 50 shows signed time", r.data.students?.find((s) => s.uid === s1)?.declaredAt === rec?.at, r.data.students?.find((s) => s.uid === s1));
  const one = await fetch(`${BASE}/api/admin/declarations?uid=${s1}`, { headers: { Authorization: `Bearer ${tokens.ma}` } });
  const onePdf = Buffer.from(await one.arrayBuffer());
  check("single student PDF", one.status === 200 && onePdf.subarray(0, 5).toString() === "%PDF-", one.status);
  fs.writeFileSync(process.env.E2E_PDF_OUT || "zz-declaration-sample.pdf", onePdf);
  const all = await fetch(`${BASE}/api/admin/declarations`, { headers: { Authorization: `Bearer ${tokens.ma}` } });
  const allPdf = Buffer.from(await all.arrayBuffer());
  check("all-declarations PDF", all.status === 200 && allPdf.subarray(0, 5).toString() === "%PDF-" && allPdf.length >= onePdf.length, all.status);
  r = await call("ma", "GET", "/api/admin/final?format=csv-list");
  check("students CSV has the declaration column", typeof r.data === "string" && r.data.includes(",Declaration") && /ZZTEST\/D\/s1.*Signed/.test(r.data), String(r.data).slice(0, 200));
  r = await call("ma", "DELETE", `/api/admin/declarations?uid=${s1}`);
  check("main admin resets it", r.status === 200 && !(await rtdb("GET", `declarations/${s1}`)) && !(await rtdb("GET", `registrations/${s1}/declaration`)), r);
  r = await call("s1", "PUT", "/api/me/kit", SIZES);
  check("after reset the kit is closed again", r.status === 403, r);

  r = await fin({ action: "remove", entryId: eid(s1, key) });
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
    Object.assign(upd, { [`registrations/${uid}`]: null, [`users/${uid}`]: null, [`declarations/${uid}`]: null });
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
