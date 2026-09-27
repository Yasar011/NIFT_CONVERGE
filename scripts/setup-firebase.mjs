import { initializeApp, cert } from "firebase-admin/app";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString());
const app = initializeApp({ credential: cert(sa) });
const token = (await app.options.credential.getAccessToken()).access_token;
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const P = sa.project_id;

// 1. Authorized domains for Google sign-in
const cfg = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${P}/config`, { headers: H }).then((r) => r.json());
const want = ["nift-converge.vercel.app"];
const domains = [...new Set([...(cfg.authorizedDomains ?? []), ...want])];
const r1 = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${P}/config?updateMask=authorizedDomains`, {
  method: "PATCH", headers: H, body: JSON.stringify({ authorizedDomains: domains }),
});
console.log("authorizedDomains:", r1.status, (await r1.json()).authorizedDomains ?? "");
