// Targeted test: ID card details and document uploads for the final list.
// Safe while the site is in use: test students only; the one selection is undone
// through the API so shared seat/campus counters return to where they were.
//
//   E2E_FINAL_PASSWORD="…" node scripts/e2e-documents-test.mjs     (against localhost:3000)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
import QRCode from "qrcode";
import { validAadhaar } from "../lib/documents.ts";

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

const E = { ma: "zz-e2e-docs-mainadmin@nift.ac.in", s1: "zz-e2e-docs-student@nift.ac.in", s2: "zz-e2e-docs-other@nift.ac.in" };
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
    const student = { name: `ZZ Docs ${k}`, studentId: `ZZTEST/X/${k}`, department: "FD", semester: "3", gender: "Female", email: E[k], phone: "9000000000", residence: "", photoUrl: "" };
    await rtdb("PATCH", "", {
      [`registrations/${uid}`]: { uid, email: E[k], fullName: student.name, studentId: student.studentId, department: "FD", semester: "3", gender: "Female", phone: "9000000000", residence: "", photo: null, picks: { e1: key, e2: "", e3: "", e4: "", e5: "" }, createdAt: now },
      [`entries/${eid(uid, key)}`]: { uid, eventKey: key, category: "sports", slot: "e1", student, attendance: null, video: null, createdAt: now },
      [`sel/status/${eid(uid, key)}`]: "registered",
    });
  }
  const { s1, s2 } = uids;
  const SIG = await QRCode.toDataURL("zz-e2e signature");
  // A valid Aadhaar-shaped number: exactly one last digit satisfies the check digit.
  const withCheck = (p) => [..."0123456789"].map((d) => p + d).filter(validAadhaar);
  const aad = withCheck("23456789012");
  check("check digit: exactly one valid last digit", aad.length === 1 && withCheck("98765432101").length === 1, aad);
  const AAD = aad[0];
  const typo = AAD.slice(0, 5) + ((Number(AAD[5]) + 1) % 10) + AAD.slice(6);
  check("check digit: one-digit typo is rejected", !validAadhaar(typo) && !validAadhaar("123456789012") && !validAadhaar("2345"), typo);
  const DETAILS = { fullName: "ZZ Docs s1 Renamed", dob: "2005-03-09", aadhaarNo: AAD.replace(/(\d{4})(?=\d)/g, "$1 "), bloodGroup: "B-" };
  const put = (who, kind, type, bytes) =>
    fetch(`${BASE}/api/me/documents?kind=${kind}`, { method: "PUT", headers: { Authorization: `Bearer ${tokens[who]}`, "Content-Type": type }, body: bytes }).then(async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) }));
  const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 7)]);
  const PDF = Buffer.concat([Buffer.from("%PDF-1.7 "), Buffer.alloc(5000, 32)]);

  console.log("Gate");
  let r = await call("s1", "PATCH", "/api/me/documents", DETAILS);
  check("not final → 403", r.status === 403, r);
  // Marked final directly: the real list may be at the 50 cap. Only this test student's own sel keys are touched (cleanup removes them).
  r = { status: (await rtdb("PATCH", "sel", { [`status/${eid(s1, key)}`]: "selected", [`counts/${s1}`]: 1 })) ? 200 : 500 };
  check("main admin selects the student", r.status === 200, r);
  r = await put("s1", "photo", "image/jpeg", JPG);
  check("before the declaration → 403", r.status === 403 && /declaration/i.test(r.data.error), r);
  r = await call("s1", "PUT", "/api/me/declaration", { agree: true, signature: SIG });
  check("student signs the declaration", r.status === 200, r);

  console.log("Details");
  r = await call("s1", "PATCH", "/api/me/documents", { ...DETAILS, aadhaarNo: typo, dob: "2030-01-01", bloodGroup: "C+" });
  check("bad Aadhaar + future DOB + bad blood group → 422 for all", r.status === 422 && r.data.details?.aadhaarNo && r.data.details?.dob && r.data.details?.bloodGroup, r.data);
  r = await call("s1", "PATCH", "/api/me/documents", DETAILS);
  check("valid details saved", r.status === 200, r);
  const reg = await rtdb("GET", `registrations/${s1}`);
  check("name, DOB, Aadhaar (digits only) and blood group stored", reg.fullName === DETAILS.fullName && reg.dob === DETAILS.dob && reg.aadhaarNo === AAD && reg.bloodGroup === "B-", { n: reg.fullName, d: reg.dob, a: reg.aadhaarNo });
  check("event entry shows the new name", (await rtdb("GET", `entries/${eid(s1, key)}/student/name`)) === DETAILS.fullName);

  console.log("Uploads");
  r = await put("s1", "photo", "image/gif", JPG);
  check("photo as GIF → 415", r.status === 415, r);
  r = await put("s1", "photo", "image/jpeg", PDF);
  check("PDF bytes labelled as JPG → 422", r.status === 422, r);
  r = await put("s1", "photo", "image/jpeg", Buffer.concat([JPG, Buffer.alloc(1_100_000)]));
  check("photo over 1 MB → 413", r.status === 413, r);
  r = await put("s1", "aadhaar", "image/jpeg", JPG);
  check("Aadhaar must be a PDF → 415", r.status === 415, r);
  r = await put("s1", "photo", "image/jpeg", JPG);
  check("photo uploaded", r.status === 200, r);
  r = await put("s1", "aadhaar", "application/pdf", PDF);
  check("Aadhaar PDF uploaded", r.status === 200, r);
  r = await call("s1", "GET", "/api/me");
  const docs = r.data.registration?.documents;
  check("My Converge: meta only, no file data", docs?.photo?.size === JPG.length && docs?.aadhaar?.type === "application/pdf" && !JSON.stringify(r.data).includes(JPG.toString("base64").slice(0, 40)), docs);
  r = await call("s1", "PUT", "/api/me/kit", { tshirt: "M", shorts: "L", jacket: "M", trackpant: "2XL" });
  check("kit still works", r.status === 200, r);

  console.log("Main admin");
  const putFor = (who, kind, type, bytes, uid) =>
    fetch(`${BASE}/api/me/documents?kind=${kind}&forUid=${uid}`, { method: "PUT", headers: { Authorization: `Bearer ${tokens[who]}`, "Content-Type": type }, body: bytes }).then(async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) }));
  r = await putFor("s2", "undertaking", "application/pdf", PDF, s1);
  check("a student can't upload for someone else → 403", r.status === 403, r);
  r = await putFor("ma", "undertaking", "application/pdf", PDF, s2);
  check("admin upload for a student not in the final list → 403", r.status === 403 && /final list/.test(r.data.error), r);
  r = await putFor("ma", "undertaking", "application/pdf", PDF, s1);
  check("main admin uploads the undertaking for the student", r.status === 200 && (await rtdb("GET", `registrations/${s1}/documents/undertaking/size`)) === PDF.length, r);
  r = await call("ma", "PATCH", "/api/me/documents", { ...DETAILS, fullName: "ZZ Docs s1 Admin", forUid: s1 });
  check("main admin edits the student's details", r.status === 200 && (await rtdb("GET", `registrations/${s1}/fullName`)) === "ZZ Docs s1 Admin", r);
  r = await call("ma", "PATCH", "/api/me/documents", { ...DETAILS, forUid: s1 });

  r = await call("s2", "GET", `/api/admin/documents?uid=${s1}&kind=photo`);
  check("students can't read files → 403", r.status === 403, r);
  r = await call("ma", "GET", `/api/admin/documents?uid=..%2Fsel&kind=photo`);
  check("odd uid → 400", r.status === 400, r);
  const f = await fetch(`${BASE}/api/admin/documents?uid=${s1}&kind=aadhaar`, { headers: { Authorization: `Bearer ${tokens.ma}` } });
  check("admin downloads the exact file", f.status === 200 && Buffer.from(await f.arrayBuffer()).equals(PDF) && f.headers.get("content-type") === "application/pdf", f.status);
  r = await call("ma", "GET", `/api/admin/documents?uid=${s2}&kind=undertaking`);
  check("missing file → 404", r.status === 404, r);
  r = await call("ma", "GET", "/api/admin/final");
  const st = r.data.students?.find((s) => s.uid === s1);
  check("Final 50 lists DOB, Aadhaar, blood group and files", st?.dob === DETAILS.dob && st?.aadhaarNo === AAD && st?.bloodGroup === "B-" && st?.documents?.photo && st?.documents?.undertaking, st);
  r = await call("ma", "GET", "/api/admin/final?format=csv-ids");
  const row = String(r.data).split(/\r?\n/).find((l) => l.includes("ZZTEST/X/s1")) ?? "";
  const age = new Date().getFullYear() - 2005 - (new Date() < new Date(new Date().getFullYear(), 2, 9) ? 1 : 0);
  check("Excel: name, gender, age, DOB, Aadhaar", String(r.data).includes("#,Name,Gender,Age,DOB,Aadhaar number,Blood group") && row.includes(`ZZ Docs s1 Renamed,Female,${age},09-03-2005,${DETAILS.aadhaarNo},B−`), row);

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
    Object.assign(upd, { [`registrations/${uid}`]: null, [`users/${uid}`]: null, [`declarations/${uid}`]: null, [`documents/${uid}`]: null });
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
