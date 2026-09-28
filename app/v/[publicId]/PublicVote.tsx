"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import { SignInButton } from "@/components/auth/SignInPanel";
import { CATEGORY_META } from "@/lib/types";
import type { LiveParticipant } from "@/lib/api-types";

interface Round {
  title: string;
  eventName: string;
  category: keyof typeof CATEGORY_META;
  status: "scheduled" | "running" | "ended" | "published";
  live: LiveParticipant | null;
  published: boolean;
}

const POLL = 4000;

export default function PublicVote({ publicId }: { publicId: string }) {
  const { status, user, me, error: authError } = useAuth();
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    async function tick() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/api/public/vote/${publicId}`, { cache: "no-store" });
          const data = await res.json();
          if (!alive) return;
          if (!res.ok) setError(data.error || "Voting link not found.");
          else {
            setRound(data.round);
            setError(null);
          }
        } catch {
          if (alive) setError("You're offline — retrying…");
        }
      }
      if (alive) timer = setTimeout(tick, POLL + Math.random() * 1500);
    }
    tick();
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [publicId]);

  const meta = round ? CATEGORY_META[round.category] : null;
  const signedIn = status === "signed-in" && !!me;

  return (
    <div className="min-h-[80vh]">
      <header className={clsx("border-b-2 border-ink", meta ? clsx(meta.bg, meta.onColor) : "bg-rani text-paper")}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="label flex items-center gap-2 opacity-90">
            {round?.status === "running" && <span className="h-2 w-2 animate-pulse bg-marigold motion-reduce:animate-none" aria-hidden />}
            Live vote · {round?.eventName ?? "Converge ’26"}
          </p>
          <h1 className="display mt-2 text-5xl">{round?.title ?? "Loading…"}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {error && <p className="mb-4 border-2 border-sindoor bg-sindoor/10 p-3 text-sm font-semibold text-sindoor">{error}</p>}
        {!round && !error && <Spinner text="Loading…" />}

        {round && round.status === "scheduled" && (
          <Waiting title="Voting hasn't started yet" text="Keep this page open — the first performer will appear here automatically." />
        )}
        {round && round.status === "running" && !round.live && (
          <Waiting title="Waiting for the next performer" text="The next performer appears here as soon as they're called on stage." />
        )}
        {round && round.status === "running" && round.live && (
          <PerformerCard
            key={`${round.live.uid}-${round.live.since}`}
            publicId={publicId}
            performer={round.live}
            signedIn={signedIn}
            isMe={round.live.uid === user?.uid}
            authLoading={status === "loading" || (status === "signed-in" && !me && !authError)}
            authError={authError}
          />
        )}
        {round && (round.status === "ended" || round.status === "published") && (
          <Waiting
            title="Voting has closed"
            text={round.published ? "Results are out." : "Thanks for voting! Results will be published by the club."}
            action={round.published ? { href: "/results", label: "See results" } : undefined}
          />
        )}

        <p className="mt-10 text-center text-xs text-ink-soft">
          Sign in with your NIFT account to vote — one vote per performer. Counts are only visible to the organisers.
        </p>
      </div>
    </div>
  );
}

function PerformerCard({
  publicId,
  performer,
  signedIn,
  isMe,
  authLoading,
  authError,
}: {
  publicId: string;
  performer: LiveParticipant;
  signedIn: boolean;
  isMe: boolean;
  authLoading: boolean;
  authError: string | null;
}) {
  const { api } = useAuth();
  const [voted, setVoted] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Once signed in, ask the server whether this account already voted.
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    api<{ voted: string | null }>(`/api/public/vote/${publicId}?participant=${performer.uid}`)
      .then((d) => alive && setVoted(d.voted))
      .catch(() => {})
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [api, publicId, performer.uid, signedIn]);

  async function vote(value: "good" | "reject") {
    setSending(value);
    setMsg(null);
    try {
      await api(`/api/public/vote/${publicId}`, { body: { participant: performer.uid, value } });
      setVoted(value);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && /already voted/i.test(e.message)) setVoted("already");
      else setMsg(e instanceof Error ? e.message : "Couldn't record your vote.");
    } finally {
      setSending(null);
    }
  }

  return (
    <article className="border-2 border-ink bg-paper">
      {performer.videoUrl ? (
        <video src={performer.videoUrl} controls playsInline preload="metadata" poster={performer.photoUrl} className="aspect-video w-full bg-ink object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={performer.photoUrl} alt={performer.name} className="aspect-square w-full object-cover" />
      )}
      <div className="p-5">
        <p className="label text-ink-soft">Now performing</p>
        <h2 className="display mt-1 text-5xl">{performer.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">{performer.department}</p>

        <div className="mt-6" aria-live="polite">
          {authLoading ? (
            <Spinner text="Checking your account…" />
          ) : !signedIn ? (
            <div className="border-2 border-dashed border-ink/40 p-4 text-center">
              <p className="font-semibold">Sign in with your NIFT account to vote</p>
              {authError && <p className="mt-2 text-sm font-semibold text-sindoor">{authError}</p>}
              <SignInButton className="mt-3" />
            </div>
          ) : isMe ? (
            <p className="border-2 border-dashed border-ink/40 p-4 text-center font-semibold">That&apos;s you on stage — good luck!</p>
          ) : checking ? (
            <Spinner text="Checking…" />
          ) : voted ? (
            <p className={clsx("flex items-center justify-center gap-2 border-2 p-4 text-center font-bold uppercase tracking-wide", voted === "good" ? "border-peacock bg-peacock text-paper" : "border-ink bg-paper-2")}>
              <Check size={18} strokeWidth={3} />
              {voted === "good" ? "You voted Good" : voted === "reject" ? "You voted Reject" : "You've already voted"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => vote("good")} disabled={!!sending} className="btn-print flex cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-peacock px-4 py-6 text-xl font-bold uppercase text-paper disabled:opacity-60">
                {sending === "good" ? <Loader2 className="animate-spin" size={22} /> : <ThumbsUp size={22} />} Good
              </button>
              <button onClick={() => vote("reject")} disabled={!!sending} className="btn-print flex cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-paper px-4 py-6 text-xl font-bold uppercase disabled:opacity-60">
                {sending === "reject" ? <Loader2 className="animate-spin" size={22} /> : <ThumbsDown size={22} />} Reject
              </button>
            </div>
          )}
          {msg && <p className="mt-3 text-sm font-semibold text-sindoor">{msg}</p>}
        </div>
      </div>
    </article>
  );
}

function Waiting({ title, text, action }: { title: string; text: string; action?: { href: string; label: string } }) {
  return (
    <div className="border-2 border-dashed border-ink/40 p-8 text-center">
      <p className="display text-4xl">{title}</p>
      <p className="mx-auto mt-3 max-w-sm text-ink-soft">{text}</p>
      {action && (
        <Link href={action.href} className="btn-print mt-5 inline-block border-2 border-ink bg-blue px-5 py-3 text-sm font-bold uppercase text-paper">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-ink-soft">
      <Loader2 size={16} className="animate-spin" /> {text}
    </p>
  );
}
