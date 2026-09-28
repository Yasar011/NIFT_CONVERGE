// Quick production health check — no passwords, no lasting data.
// Usage: BASE_URL=https://nift-converge.vercel.app node scripts/smoke.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "https://nift-converge.vercel.app";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString());
const auth = getAuth(initializeApp({ credential: cert(sa) }));

let fail = 0;
const check = (name, ok, extra) => {
  console.log(ok ? "  ✓" : "  ✗", name, ok ? "" : JSON.stringify(extra ?? "").slice(0, 300));
  if (!ok) fail++;
};

const email = "zz-smoke-test@nift.ac.in";
let uid;
try {
  let r = await fetch(`${BASE}/api/me`);
  check("API up, rejects anonymous (401 JSON)", r.status === 401 && (await r.json()).error);

  const rec = await auth.createUser({ email, emailVerified: true, displayName: "Smoke Test" });
  uid = rec.uid;
  const custom = await auth.createCustomToken(uid);
  const tok = (await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  })).json()).idToken;
  const H = { Authorization: `Bearer ${tok}` };

  r = await fetch(`${BASE}/api/me`, { headers: H });
  const me = await r.json();
  check("verifies NIFT login + reads database", r.status === 200 && me.user?.role === "student", me);

  r = await fetch(`${BASE}/api/upload/sign`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ kind: "photo", account: "primary" }) });
  const sign = await r.json();
  check("signs Cloudinary uploads", r.status === 200 && sign.uploadUrl?.includes("cloudinary"), sign);

  r = await fetch(`${BASE}/api/admin/overview`, { headers: H });
  check("admin API blocks students (403)", r.status === 403);

  r = await fetch(`${BASE}/api/live`);
  check("public live list", r.status === 200 && Array.isArray((await r.json()).rounds));

  r = await fetch(`${BASE}/api/public/vote/doesnotexist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("voting requires sign-in (401)", r.status === 401);

  r = await fetch(`${BASE}/api/admin/stats`, { headers: H });
  check("admin stats blocked for students (403)", r.status === 403);

  r = await fetch(`${BASE}/api/public/vote/doesnotexist`);
  check("unknown voting link → 404", r.status === 404);

  for (const p of ["/", "/events", "/register", "/vote", "/results", "/login", "/me", "/admin", "/admin/final", "/admin/stats", "/admin/trials", "/admin/judging", "/admin/teams", "/admin/activity", "/admin/print"]) {
    r = await fetch(`${BASE}${p}`);
    check(`page ${p}`, r.status === 200, r.status);
  }
} catch (e) {
  check("no crash", false, String(e));
} finally {
  if (uid) {
    await auth.deleteUser(uid).catch(() => {});
    const token = (await (await import("firebase-admin/app")).getApp().options.credential.getAccessToken()).access_token;
    await fetch(`${env.FIREBASE_DATABASE_URL}/users/${uid}.json`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  }
  console.log(fail ? `\n${fail} failed` : "\nAll good");
  process.exit(fail ? 1 : 0);
}
