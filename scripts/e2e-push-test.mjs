// Targeted test for phone notifications (server side). Safe while the site is
// in use: test accounts only, test trials dated in the past (never on the home
// board), and everything created is removed.
//
// Each test phone "subscribes" with an endpoint that answers 410 Gone. When the
// server sends to it, it deletes that subscription — so a vanished subscription
// proves the right people were targeted and the send really happened.
//
//   node scripts/e2e-push-test.mjs        (against localhost:3000)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import crypto from "node:crypto";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const GONE = "https://httpbin.org/status/410"; // a "phone" that has unsubscribed
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

const E = { ca: "zz-e2e-p-clubadmin@nift.ac.in", s1: "zz-e2e-p-member@nift.ac.in", s2: "zz-e2e-p-outsider@nift.ac.in" };
const uids = {}, tokens = {};
const createdTrials = [];

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
/** A syntactically real browser subscription (valid P-256 key) pointing at GONE. */
function fakeSubscription() {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  return { endpoint: `${GONE}?d=${crypto.randomBytes(6).toString("hex")}`, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url") } };
}
const devices = async (k) => Object.keys((await rtdb("GET", `push/${uids[k]}`)) ?? {}).length;
async function waitGone(k, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if ((await devices(k)) === 0) return true;
    await sleep(700);
  }
  return false;
}

async function main() {
  if (((await rtdb("GET", "settings/app")) ?? {}).selectionFrozen) throw new Error("Selections are frozen — unfreeze first.");
  for (const k of Object.keys(E)) await signIn(k);
  await rtdb("PUT", `roles/${keyOf(E.ca)}`, { email: E.ca, role: "club_admin", club: "cultural", addedBy: "e2e", addedAt: Date.now() });
  // s1 is in Solo Dance; s2 is in an ESSE event only.
  const now = Date.now();
  for (const [k, ev] of [["s1", "cultural:solo-dance"], ["s2", "esse:monologue"]]) {
    const uid = uids[k];
    const id = `${uid}_${ev.replace(":", "__")}`;
    const student = { name: `ZZ Push ${k}`, studentId: `ZZTEST/P/${k}`, department: "FC", semester: "1", gender: "Female", email: E[k], phone: "", residence: "", photoUrl: "" };
    await rtdb("PATCH", "", {
      [`registrations/${uid}`]: { uid, email: E[k], fullName: student.name, studentId: student.studentId, department: "FC", semester: "1", gender: "Female", phone: "", residence: "", photo: null, picks: { e1: ev, e2: "", e3: "", e4: "", e5: "" }, createdAt: now },
      [`entries/${id}`]: { uid, eventKey: ev, category: ev.split(":")[0], slot: "e1", student, attendance: null, video: null, createdAt: now },
      [`sel/status/${id}`]: "registered",
    });
  }

  console.log("Subscribing");
  let r = await call(null, "POST", "/api/push", { subscription: fakeSubscription() });
  check("subscribing needs sign-in → 401", r.status === 401, r);
  r = await call("s1", "POST", "/api/push", { subscription: { endpoint: "http://insecure", keys: {} } });
  check("invalid subscription → 400", r.status === 400, r);
  r = await call("s1", "POST", "/api/push", { subscription: fakeSubscription() });
  check("member subscribes", r.status === 200 && (await devices("s1")) === 1, r);
  r = await call("s2", "POST", "/api/push", { subscription: fakeSubscription() });
  check("outsider subscribes", r.status === 200 && (await devices("s2")) === 1, r);

  console.log("Trial → notifies that event's team only");
  r = await call("ca", "POST", "/api/admin/trials", { eventKey: "cultural:solo-dance", title: "ZZ push test", date: "2026-01-01", time: "17:00", venue: "Test hall" });
  check("trial added", r.status === 200, r);
  createdTrials.push(["cultural__solo-dance", r.data.id]);
  check("member's phone was sent the notification", await waitGone("s1"), await devices("s1"));
  check("outsider was NOT notified", (await devices("s2")) === 1);

  console.log("Notice to one event");
  await call("s1", "POST", "/api/push", { subscription: fakeSubscription() });
  r = await call("ca", "POST", "/api/admin/announcements", { title: "ZZ push notice", body: "test", audience: "cultural:solo-dance" });
  check("notice posted", r.status === 200, r);
  check("member notified", await waitGone("s1"));
  check("outsider still not notified", (await devices("s2")) === 1);

  console.log("Status change → that student");
  await call("s1", "POST", "/api/push", { subscription: fakeSubscription() });
  r = await call("ca", "PATCH", `/api/admin/entries/${uids.s1}_cultural__solo-dance`, { status: "shortlisted" });
  check("shortlisted", r.status === 200, r);
  check("student notified about shortlisting", await waitGone("s1"));

  console.log("Trial with 'notify everyone'");
  await call("s1", "POST", "/api/push", { subscription: fakeSubscription() });
  r = await call("ca", "POST", "/api/admin/trials", { eventKey: "cultural:solo-dance", title: "ZZ open audition", date: "2026-01-02", time: "17:00", venue: "Test hall", notifyEveryone: true });
  createdTrials.push(["cultural__solo-dance", r.data.id]);
  check("everyone mode reaches the outsider too", await waitGone("s2"));

  console.log("Turning off");
  const sub = fakeSubscription();
  await call("s1", "POST", "/api/push", { subscription: sub });
  r = await call("s1", "DELETE", `/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`);
  check("unsubscribe removes the phone", r.status === 200 && (await devices("s1")) === 0, r);

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  console.log("\nCleanup (only what this test created)");
  const upd = {};
  for (const k of ["s1", "s2"]) {
    const uid = uids[k];
    if (!uid) continue;
    const ev = k === "s1" ? "cultural__solo-dance" : "esse__monologue";
    Object.assign(upd, {
      [`registrations/${uid}`]: null, [`entries/${uid}_${ev}`]: null, [`sel/status/${uid}_${ev}`]: null,
      [`push/${uid}`]: null, [`users/${uid}`]: null,
    });
  }
  if (uids.ca) Object.assign(upd, { [`users/${uids.ca}`]: null, [`push/${uids.ca}`]: null, [`roles/${keyOf(E.ca)}`]: null });
  for (const [ev, id] of createdTrials) if (id) upd[`trials/${ev}/${id}`] = null;
  const notices = (await rtdb("GET", "announcements")) ?? {};
  for (const [id, a] of Object.entries(notices)) if (String(a.createdBy).startsWith("zz-e2e")) upd[`announcements/${id}`] = null;
  const log = (await rtdb("GET", "audit")) ?? {};
  for (const [id, a] of Object.entries(log)) if (String(a.by).startsWith("zz-e2e")) upd[`audit/${id}`] = null;
  await rtdb("PATCH", "", upd);
  for (const uid of Object.values(uids)) await auth.deleteUser(uid).catch(() => {});
  console.log(`  removed ${Object.keys(upd).length} test paths`);
}

main()
  .catch((e) => { console.error("FATAL", e.message); fail++; })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup error", e));
    process.exit(fail ? 1 : 0);
  });
