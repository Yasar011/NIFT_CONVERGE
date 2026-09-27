"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, NIFT_DOMAIN } from "@/lib/firebase/client";
import type { MeResponse } from "@/lib/api-types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

type Status = "loading" | "signed-out" | "signed-in";

interface AuthValue {
  status: Status;
  user: User | null;
  me: MeResponse | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  api: <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
}

const AuthContext = createContext<AuthValue | null>(null);

const isNift = (email?: string | null) => !!email && email.toLowerCase().endsWith(`@${NIFT_DOMAIN}`);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async <T,>(path: string, init?: { method?: string; body?: unknown }) => {
    const current = auth.currentUser;
    const token = current ? await current.getIdToken() : null;
    const res = await fetch(path, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : await res.blob();
    if (!res.ok) {
      const d = data as { error?: string; details?: Record<string, string> };
      throw new ApiError(res.status, d?.error || "Something went wrong.", d?.details);
    }
    return data as T;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<MeResponse>("/api/me"));
      setError(null);
    } catch (e) {
      setMe(null);
      setError(e instanceof Error ? e.message : "Couldn't load your account.");
    }
  }, [api]);

  // Load the profile once per signed-in user (token refreshes don't refetch).
  const loadedUid = useRef<string | null>(null);

  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      if (u && !isNift(u.email)) {
        await fbSignOut(auth);
        setError(`Please sign in with your @${NIFT_DOMAIN} account.`);
        return;
      }
      setUser(u);
      if (!u) {
        loadedUid.current = null;
        setMe(null);
        setStatus("signed-out");
        return;
      }
      setStatus("signed-in");
      if (loadedUid.current !== u.uid) {
        loadedUid.current = u.uid;
        refresh();
      }
    });
  }, [refresh]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked") await signInWithRedirect(auth, googleProvider);
      else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Sign-in failed. Please try again.");
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ status, user, me, error, signIn, signOut, refresh, api }),
    [status, user, me, error, signIn, signOut, refresh, api]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
