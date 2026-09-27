"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import SignInPanel from "@/components/auth/SignInPanel";
import type { LiveSessionPublic } from "@/lib/api-types";

// Polling (not a live database connection) keeps us inside the free plan's
// connection limit; the server caches /api/live for a few seconds.
const POLL_LIVE = 5000;
const POLL_IDLE = 15000;

export default function LiveVoting() {
  const { status, api, user } = useAuth();
  const [sessions, setSessions] = useState<LiveSessionPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "signed-in") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    async function tick() {
      clearTimeout(timer);
      let next = POLL_IDLE;
      if (document.visibilityState === "visible") {
        try {
          const data = await api<{ sessions: LiveSessionPublic[] }>("/api/live");
          if (!alive) return;
          setSessions(data.sessions);
          setError(null);
          if (data.sessions.length) next = POLL_LIVE;
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : "Couldn't load voting.");
        }
      }
      if (alive) timer = setTimeout(tick, next);
    }

    tick();
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, api]);

  if (status === "loading") return <Loading />;
  if (status === "signed-out") {
    return (
      <SignInPanel
        title="Sign in to vote"
        text="Voting uses your NIFT account so each student gets exactly one vote per performer."
      />
    );
  }
  if (!sessions) return error ? <p className="text-sindoor">{error}</p> : <Loading />;

  if (!sessions.length) {
    return (
      <div className="border-2 border-dashed border-ink/40 p-10 text-center">
        <p className="display text-4xl sm:text-5xl">Nothing live right now</p>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Keep this page open during a selection round — the performer on stage will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {sessions.map((s) => (
        <LiveCard key={`${s.id}-${s.live.uid}-${s.live.since}`} session={s} myUid={user?.uid} />
      ))}
    </div>
  );
}

function LiveCard({ session, myUid }: { session: LiveSessionPublic; myUid?: string }) {
  const { api } = useAuth();
  const p = session.live;
  const [voted, setVoted] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isMe = p.uid === myUid;

  // Each performer gets a fresh card (see key) → check whether I've voted for them.
  useEffect(() => {
    let alive = true;
    api<{ voted: string | null }>(`/api/vote?sessionId=${session.id}&participant=${p.uid}`)
      .then((r) => alive && setVoted(r.voted))
      .catch(() => alive && setVoted(null))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [api, session.id, p.uid]);

  async function vote(value: "good" | "reject") {
    setSending(value);
    setMsg(null);
    try {
      await api("/api/vote", { body: { sessionId: session.id, participant: p.uid, value } });
      setVoted(value);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Couldn't record your vote.");
    } finally {
      setSending(null);
    }
  }

  return (
    <article className="border-2 border-ink bg-paper">
      <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-3 text-paper">
        <p className="label">{session.eventName}</p>
        <span className="label flex items-center gap-2 text-marigold">
          <span className="h-2 w-2 animate-pulse bg-sindoor motion-reduce:animate-none" aria-hidden /> Live
        </span>
      </div>

      {p.videoUrl ? (
        <video
          src={p.videoUrl}
          controls
          playsInline
          preload="metadata"
          poster={p.photoUrl}
          className="aspect-video w-full bg-ink object-contain"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photoUrl} alt={p.name} className="aspect-square w-full object-cover sm:aspect-[4/3]" />
      )}

      <div className="p-5">
        <p className="label text-ink-soft">{session.title}</p>
        <h2 className="display mt-1 text-5xl">{p.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">{p.department}</p>

        <div className="mt-6" aria-live="polite">
          {isMe ? (
            <p className="border-2 border-dashed border-ink/40 p-4 text-center font-semibold">
              That&apos;s you on stage — good luck!
            </p>
          ) : checking ? (
            <p className="flex items-center gap-2 text-ink-soft">
              <Loader2 size={16} className="animate-spin" /> Checking…
            </p>
          ) : voted ? (
            <p
              className={clsx(
                "flex items-center justify-center gap-2 border-2 p-4 font-bold uppercase tracking-wide",
                voted === "good" ? "border-peacock bg-peacock text-paper" : "border-ink bg-paper-2"
              )}
            >
              <Check size={18} strokeWidth={3} /> You voted {voted === "good" ? "Good" : "Reject"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => vote("good")}
                disabled={!!sending}
                className="btn-print flex cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-peacock px-4 py-5 text-lg font-bold uppercase text-paper disabled:opacity-60"
              >
                {sending === "good" ? <Loader2 className="animate-spin" size={20} /> : <ThumbsUp size={20} />} Good
              </button>
              <button
                onClick={() => vote("reject")}
                disabled={!!sending}
                className="btn-print flex cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-paper px-4 py-5 text-lg font-bold uppercase disabled:opacity-60"
              >
                {sending === "reject" ? <Loader2 className="animate-spin" size={20} /> : <ThumbsDown size={20} />} Reject
              </button>
            </div>
          )}
          {msg && <p className="mt-3 text-sm font-semibold text-sindoor">{msg}</p>}
        </div>
      </div>
    </article>
  );
}

function Loading() {
  return (
    <p className="flex items-center gap-3 text-ink-soft">
      <Loader2 className="animate-spin" size={18} /> Loading…
    </p>
  );
}
