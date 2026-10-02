"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Share, SquarePlus } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "./auth/AuthProvider";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/client/push";

/** "Turn on notifications" — trial alerts, notices and selection news on the phone. */
export default function NotifyCard() {
  const { api } = useAuth();
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      setState(state === "on" ? await disablePush(api) : await enablePush(api));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't change notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  return (
    <div className={clsx("border-2 border-ink p-5", state === "on" ? "bg-peacock text-paper" : "bg-marigold")}>
      <p className="label flex items-center gap-2">
        {state === "on" ? <BellRing size={16} /> : <Bell size={16} />} Phone notifications
      </p>

      {state === "on" && (
        <>
          <p className="mt-2 text-sm">On for this phone. You&apos;ll get trials, notices and selection news like a message.</p>
          <button onClick={toggle} disabled={busy} className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-bold underline underline-offset-4">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />} Turn off
          </button>
        </>
      )}

      {state === "off" && (
        <>
          <p className="mt-2 text-sm">Get a ping when a trial is scheduled, a notice is posted or your status changes.</p>
          <button onClick={toggle} disabled={busy} className="btn-print mt-3 inline-flex cursor-pointer items-center gap-2 border-2 border-ink bg-ink px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-paper disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Turn on notifications
          </button>
        </>
      )}

      {state === "ios-install" && (
        <div className="mt-2 text-sm">
          <p>On iPhone, add this site to your Home Screen first, then open it from there and turn notifications on:</p>
          <ol className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2"><span className="font-bold">1.</span> Tap <Share size={15} className="inline" /> <strong>Share</strong> in Safari</li>
            <li className="flex items-center gap-2"><span className="font-bold">2.</span> Choose <SquarePlus size={15} className="inline" /> <strong>Add to Home Screen</strong></li>
            <li className="flex items-center gap-2"><span className="font-bold">3.</span> Open <strong>Converge ’26</strong> from your Home Screen</li>
          </ol>
        </div>
      )}

      {state === "blocked" && (
        <p className="mt-2 text-sm">
          Notifications are blocked for this site. Allow them in your browser&apos;s site settings (tap the lock icon by the address), then reload.
        </p>
      )}

      {state === "unsupported" && (
        <p className="mt-2 text-sm">This browser can&apos;t show notifications. Open the site in Chrome (Android) or add it to your Home Screen (iPhone).</p>
      )}

      {err && <p className="mt-2 text-sm font-semibold">{err}</p>}
    </div>
  );
}
