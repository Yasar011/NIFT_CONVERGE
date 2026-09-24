import Link from "next/link";
import { ConvergeEvent } from "@/lib/types";
import { ArrowUpRight, Users } from "lucide-react";

export default function EventCard({ event }: { event: ConvergeEvent }) {
  return (
    <div className="card-border group flex flex-col rounded-2xl bg-indigo/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:bg-indigo/60">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-snug text-cream">
          {event.name}
          {event.genderNote && event.genderNote !== "Open" && event.genderNote !== "Mixed" && (
            <span className="ml-1.5 text-sm text-gold-light">— {event.genderNote}</span>
          )}
        </h3>
        {event.nonCompetitive && (
          <span className="shrink-0 rounded-full bg-cream/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cream-dim">
            Non-competitive
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide">
        <span className="rounded-full border border-gold/30 px-2.5 py-1 text-gold-light">
          {event.format}
        </span>
        {event.genderNote && (
          <span className="rounded-full border border-magenta/30 px-2.5 py-1 text-magenta-light">
            {event.genderNote}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-cream-dim">
        <Users size={15} className="text-gold-light" />
        <span>{event.participantsLabel}</span>
      </div>

      {event.substitutes && (
        <p className="mt-1 text-xs text-cream-dim">Substitutes: {event.substitutes}</p>
      )}

      <Link
        href={`/events/${event.category}/${event.slug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-light transition-colors hover:text-gold"
      >
        View Full Rules
        <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
