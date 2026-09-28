"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import clsx from "clsx";
import { CATEGORY_META } from "@/lib/types";
import type { RunningRound } from "@/lib/api-types";

/** Lists rounds that are live right now; each links to its public voting page. */
export default function LiveVoting() {
  const [rounds, setRounds] = useState<RunningRound[] | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    async function tick() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        try {
          const data = await (await fetch("/api/live", { cache: "no-store" })).json();
          if (alive) setRounds(data.rounds ?? []);
        } catch {
          /* keep the last list */
        }
      }
      if (alive) timer = setTimeout(tick, 10000 + Math.random() * 3000);
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  if (!rounds) {
    return (
      <p className="flex items-center gap-3 text-ink-soft">
        <Loader2 className="animate-spin" size={18} /> Loading…
      </p>
    );
  }

  if (!rounds.length) {
    return (
      <div className="border-2 border-dashed border-ink/40 p-10 text-center">
        <p className="display text-4xl sm:text-5xl">Nothing live right now</p>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          During a selection round, the club shares a voting link or QR code. Live rounds also show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {rounds.map((r) => {
        const meta = CATEGORY_META[r.category];
        return (
          <li key={r.publicId}>
            <Link href={`/v/${r.publicId}`} className={clsx("btn-print group flex h-full flex-col justify-between border-2 border-ink p-6", meta.bg, meta.onColor)}>
              <span>
                <span className="label flex items-center gap-2 opacity-90">
                  <span className="h-2 w-2 animate-pulse bg-marigold motion-reduce:animate-none" aria-hidden /> Live · {r.eventName}
                </span>
                <span className="display mt-2 block text-4xl">{r.title}</span>
                {r.liveName && <span className="mt-2 block text-sm opacity-90">On stage: {r.liveName}</span>}
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase">
                Vote now <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
