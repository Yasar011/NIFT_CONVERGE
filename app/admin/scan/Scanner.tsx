"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, CameraOff, Check, Radio } from "lucide-react";
import clsx from "clsx";
import type QrScannerType from "qr-scanner";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import StatusBadge from "@/components/StatusBadge";
import { PICKABLE_EVENTS, eventKey, eventLabel } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import { cldTransform, type EntryStatus } from "@/lib/registration-schema";
import type { VotingSession } from "@/lib/api-types";

interface ScanResult {
  student: { name: string; department: string; semester: string; photoUrl: string };
  status: EntryStatus;
  live: boolean;
}

export default function Scanner() {
  const { me, api } = useAuth();
  const params = useSearchParams();
  const isMain = me?.user.role === "main_admin";
  const [event, setEvent] = useState(params.get("event") || "");
  const [sessionId, setSessionId] = useState(params.get("session") || "");
  const [on, setOn] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScannerType | null>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);

  const { data: sessionsData } = useApi<{ sessions: VotingSession[] }>("/api/admin/voting");
  const sessions = (sessionsData?.sessions ?? []).filter(
    (s) => s.eventKey === event && (s.status === "scheduled" || s.status === "running")
  );
  const events = PICKABLE_EVENTS.filter((e) => isMain || e.category === me?.user.club);

  const submit = useCallback(
    async (code: string) => {
      const now = Date.now();
      // The camera fires repeatedly while a code is in view — ignore repeats.
      if (lastCode.current && lastCode.current.code === code && now - lastCode.current.at < 4000) return;
      lastCode.current = { code, at: now };
      setBusy(true);
      setError(null);
      try {
        const r = await api<ScanResult>("/api/admin/scan", { body: { code, eventKey: event, sessionId: sessionId || undefined } });
        setResult(r);
        if ("vibrate" in navigator) navigator.vibrate(80);
      } catch (e) {
        setResult(null);
        setError(e instanceof ApiError ? e.message : "Scan failed.");
      } finally {
        setBusy(false);
      }
    },
    [api, event, sessionId]
  );

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  async function start() {
    setError(null);
    if (!video.current) return;
    const QrScanner = (await import("qr-scanner")).default;
    scanner.current = new QrScanner(video.current, (r) => submitRef.current(r.data), {
      returnDetailedScanResult: true,
      highlightScanRegion: true,
      preferredCamera: "environment",
      maxScansPerSecond: 4,
    });
    try {
      await scanner.current.start();
      setOn(true);
    } catch {
      setError("Couldn't open the camera. Allow camera access in your browser settings.");
    }
  }

  function stop() {
    scanner.current?.stop();
    scanner.current?.destroy();
    scanner.current = null;
    setOn(false);
  }

  useEffect(() => () => scanner.current?.destroy(), []);

  const ready = !!event;
  return (
    <div className="space-y-6">
      <PageTitle kicker="At the event" title="Scan passes" />

      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="label mb-2 block">Event</span>
          <select className={inputCls} value={event} onChange={(e) => { setEvent(e.target.value); setSessionId(""); setResult(null); }}>
            <option value="">Choose the event</option>
            {events.map((e) => (
              <option key={eventKey(e)} value={eventKey(e)}>
                {eventLabel(e)} — {CATEGORY_META[e.category].short}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label mb-2 block">Voting round (optional)</span>
          <select className={inputCls} value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!event}>
            <option value="">Attendance only — no voting</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.date}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sessionId && (
        <p className="flex items-center gap-2 border-2 border-ink bg-rani px-4 py-3 text-sm font-semibold text-paper">
          <Radio size={16} /> Each scan marks the student present and puts them live for voting. The previous performer&apos;s voting closes.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square w-full overflow-hidden border-2 border-ink bg-ink">
            <video ref={video} className="h-full w-full object-cover" muted playsInline />
            {!on && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-paper">
                <Camera size={40} />
                <p className="text-sm opacity-80">{ready ? "Start the camera, then point it at a student's QR pass." : "Choose the event first."}</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-3">
            {on ? (
              <Btn onClick={stop}>
                <CameraOff size={14} /> Stop camera
              </Btn>
            ) : (
              <Btn tone="blue" onClick={start} disabled={!ready}>
                <Camera size={14} /> Start camera
              </Btn>
            )}
          </div>
        </div>

        <div aria-live="polite">
          {error && <ErrorNote>{error}</ErrorNote>}
          {busy && <p className="text-ink-soft">Checking…</p>}
          {result && (
            <div className={clsx("border-2 border-ink", result.live ? "bg-rani text-paper" : "bg-paper")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cldTransform(result.student.photoUrl, "c_fill,g_face,w_600,h_450,q_auto,f_auto")} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <p className="flex items-center gap-2 text-sm font-bold uppercase">
                  <Check size={16} strokeWidth={3} /> Present{result.live ? " · Live for voting" : ""}
                </p>
                <p className="display mt-2 text-5xl">{result.student.name}</p>
                <p className="mt-1 text-sm opacity-80">
                  {result.student.department} · Sem {result.student.semester}
                </p>
                <div className="mt-3">
                  <StatusBadge status={result.status} />
                </div>
                <p className="mt-3 text-xs opacity-80">Check the photo matches the person in front of you.</p>
              </div>
            </div>
          )}
          {!result && !error && !busy && (
            <p className="border-2 border-dashed border-ink/40 p-6 text-sm text-ink-soft">The scanned student will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
