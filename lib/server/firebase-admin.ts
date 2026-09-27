import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | undefined;

export function adminApp(): App {
  if (app) return app;
  if (getApps().length) return (app = getApps()[0]);
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  app = initializeApp({ credential: cert(sa), projectId: sa.project_id });
  return app;
}

export const adminAuth = () => getAuth(adminApp());
