// Server-side Google/Firebase credentials without the firebase-admin SDK.
// (firebase-admin's token verifier can't load on Vercel's runtime, and we only
// need two things: verify Firebase ID tokens and mint OAuth access tokens.)
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT, type JWTPayload } from "jose";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let sa: ServiceAccount | null = null;
export function serviceAccount(): ServiceAccount {
  if (sa) return sa;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as ServiceAccount;
  return sa;
}

// ---- Verify Firebase ID tokens (https://firebase.google.com/docs/auth/admin/verify-id-tokens) ----

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface IdToken extends JWTPayload {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function verifyIdToken(token: string): Promise<IdToken> {
  const projectId = serviceAccount().project_id;
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token has no subject");
  if (typeof payload.auth_time === "number" && payload.auth_time > Date.now() / 1000 + 300) {
    throw new Error("Token auth_time is in the future");
  }
  return { ...payload, uid: payload.sub } as IdToken;
}

// ---- OAuth access token for the Realtime Database REST API ----

const SCOPES = [
  "https://www.googleapis.com/auth/firebase.database",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

let cached: { token: string; exp: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const { client_email, private_key } = serviceAccount();
  const key = await importPKCS8(private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!data.access_token) throw new Error(`Couldn't get an access token: ${data.error ?? res.status}`);
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}
