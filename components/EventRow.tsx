import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { ConvergeEvent, CATEGORY_META } from "@/lib/types";

export function genderSuffix(e: ConvergeEvent) {
  return e.genderNote && e.genderNote !== "Open" && e.genderNote !== "Mixed" ? e.genderNote : null;
}

export default function EventRow({
  event,
  index,
  showArena = true,
}: {
  event: ConvergeEvent;
  index: number;
  showArena?: boolean;
}) {
  const meta = CATEGORY_META[event.category];
  const suffix = genderSuffix(event);

  return (
    <li>
      <Link
        href={`/events/${event.category}/${event.slug}`}
        className="group relative grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 border-b border-ink/15 py-5 pl-4 pr-2 transition-colors hover:bg-paper-2 md:grid-cols-[3rem_1fr_9rem_7rem_13rem_2rem] md:items-center md:gap-x-4"
      >
        <span className={clsx("absolute inset-y-0 left-0 w-1 transition-all group-hover:w-2", meta.bg)} aria-hidden />
        <span className="text-xs font-bold tabular-nums text-ink-soft">
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="display-md text-2xl sm:text-3xl">
          {event.name}
          {suffix && <span className="ml-2 font-serif text-xl normal-case italic tracking-normal text-ink-soft">{suffix}</span>}
          {event.nonCompetitive && (
            <span className="label ml-3 align-middle text-[0.6rem] text-ink-soft">Non-competitive</span>
          )}
        </span>

        <ArrowUpRight
          size={22}
          className="justify-self-end transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 md:order-last"
          aria-hidden
        />

        <span className="col-start-2 col-end-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft md:contents">
          {showArena ? (
            <span className="label md:text-[0.68rem]">
              <span className={clsx("mr-2 inline-block h-2 w-2 align-middle", meta.bg)} aria-hidden />
              {meta.short}
            </span>
          ) : (
            <span className="hidden md:block" />
          )}
          <span className="md:text-sm">{event.format}</span>
          <span className="font-semibold text-ink md:text-sm">{event.participantsLabel}</span>
        </span>
      </Link>
    </li>
  );
}
