"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import clsx from "clsx";
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
const LS_DEVICE = "cnv26-voter";
const voteKey = (publicId: string, p: LiveParticipant) => `cnv26-vote:${publicId}:${p.uid}:${p.since}`;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Ensures this browser has a voter id (cookie + localStorage) and returns it. */
async function ensureDevice(): Promise<string> {
  const saved = storage()?.getItem(LS_DEVICE) ?? "";
  const res = await fetch("/api/public/device", { method: "POST", headers: saved ? { "x-voter-id": saved } : {} });
  const { id } = (await res.json()) as { id: string };
  storage()?.setItem(LS_DEVICE, id);
  return id;
}

export default function PublicVote({ publicId }: { publicId: string }) {
  const [device, setDevice] = useState<string | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureDevice()
      .then(setDevice)
      .catch(() => setError("Couldn't start voting. Check your connection and reload."));
  }, []);

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
      if (alive) timer = setTimeout(tick, POLL);
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
        {round && round.status === "running" && round.live && device && (
          <PerformerCard key={`${round.live.uid}-${round.live.since}`} publicId={publicId} performer={round.live} device={device} />
        )}
        {round && (round.status === "ended" || round.status === "published") && (
          <Waiting
            title="Voting has closed"
            text={round.published ? "Results are out." : "Thanks for voting! Results will be published by the club."}
            action={round.published ? { href: "/results", label: "See results" } : undefined}
          />
        )}

        <p className="mt-10 text-center text-xs text-ink-soft">
          One vote per performer on each device. Vote counts are only visible to the organisers.
        </p>
      </div>
    </div>
  );
}

function PerformerCard({ publicId, performer, device }: { publicId: string; performer: LiveParticipant; device: string }) {
  const [voted, setVoted] = useState<string | null>(() => storage()?.getItem(voteKey(publicId, performer)) ?? null);
  const [checking, setChecking] = useState(!voted);
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Confirm with the server — it's the source of truth for "already voted".
  useEffect(() => {
    let alive = true;
    fetch(`/api/public/vote/${publicId}?participant=${performer.uid}`, { headers: { "x-voter-id": device }, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.voted) {
          setVoted(d.voted);
          storage()?.setItem(voteKey(publicId, performer), d.voted);
        }
      })
      .catch(() => {})
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [publicId, performer, device]);

  async function vote(value: "good" | "reject") {
    setSending(value);
    setMsg(null);
    try {
      const res = await fetch(`/api/public/vote/${publicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-voter-id": device },
        body: JSON.stringify({ participant: performer.uid, value }),
      });
      const data = await res.json();
      if (res.ok) {
        setVoted(value);
        storage()?.setItem(voteKey(publicId, performer), value);
      } else if (res.status === 409 && /already voted/i.test(data.error)) {
        setVoted("already");
      } else setMsg(data.error || "Couldn't record your vote.");
    } catch {
      setMsg("You're offline — try again.");
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
          {checking ? (
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
