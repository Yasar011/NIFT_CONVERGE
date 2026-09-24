import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle, CheckCircle2, Clock, ListChecks, Package, Star, Users } from "lucide-react";
import RegisterCta from "@/components/RegisterCta";
import { CATEGORY_META, EventCategory } from "@/lib/types";
import { EVENTS, getEventBySlug } from "@/lib/events";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ category: e.category, slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const event = getEventBySlug(category, slug);
  return { title: event ? `${event.name} | NIFT Jodhpur Converge 2026` : "Event" };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const event = getEventBySlug(category, slug);
  if (!event) notFound();

  const meta = CATEGORY_META[category as EventCategory];

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <Link
        href={`/events/${category}`}
        className="inline-flex items-center gap-1.5 text-sm text-cream-dim hover:text-cream"
      >
        <ChevronLeft size={16} /> {meta?.label ?? "Events"}
      </Link>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-light">
          {meta?.label}
          {event.genderNote ? ` · ${event.genderNote}` : ""}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-cream sm:text-5xl">
          {event.name}
        </h1>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="rounded-full border border-gold/30 px-3 py-1.5 text-gold-light">
            {event.format}
          </span>
          {event.nonCompetitive && (
            <span className="rounded-full bg-cream/10 px-3 py-1.5 text-cream-dim">
              Non-competitive
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card-border rounded-2xl bg-indigo/40 p-5">
          <div className="flex items-center gap-2 text-gold-light">
            <Users size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Participants</p>
          </div>
          <p className="mt-2 text-sm text-cream">{event.participantsLabel}</p>
          {event.substitutes && (
            <p className="mt-1 text-xs text-cream-dim">Substitutes: {event.substitutes}</p>
          )}
        </div>
        {event.timeLimit && (
          <div className="card-border rounded-2xl bg-indigo/40 p-5">
            <div className="flex items-center gap-2 text-gold-light">
              <Clock size={16} />
              <p className="text-xs font-semibold uppercase tracking-wide">Time Limit</p>
            </div>
            <p className="mt-2 text-sm text-cream">{event.timeLimit}</p>
          </div>
        )}
        {event.theme && (
          <div className="card-border rounded-2xl bg-indigo/40 p-5 sm:col-span-2">
            <div className="flex items-center gap-2 text-gold-light">
              <Star size={16} />
              <p className="text-xs font-semibold uppercase tracking-wide">Theme</p>
            </div>
            <p className="mt-2 text-sm text-cream">{event.theme}</p>
          </div>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-cream">About the Event</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-dim">{event.about}</p>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cream">
          <CheckCircle2 size={20} className="text-gold-light" /> Participation Requirements
        </h2>
        <ul className="mt-3 space-y-2">
          {event.requirements.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-cream-dim">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cream">
          <ListChecks size={20} className="text-gold-light" /> Rules
        </h2>
        <ul className="mt-3 space-y-2.5">
          {event.rules.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-cream-dim">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      {event.whatYouNeed && event.whatYouNeed.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-cream">
            <Package size={20} className="text-gold-light" /> What You Need
          </h2>
          <ul className="mt-3 space-y-2">
            {event.whatYouNeed.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-cream-dim">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.important && event.important.length > 0 && (
        <section className="mt-10 rounded-2xl border border-magenta/40 bg-magenta/10 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-cream">
            <AlertTriangle size={18} className="text-magenta-light" /> Important
          </h2>
          <ul className="mt-3 space-y-2">
            {event.important.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed text-cream/90">
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.evaluationCriteria && event.evaluationCriteria.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-cream">Evaluation Criteria</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.evaluationCriteria.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-gold/25 bg-ink/60 px-3 py-1.5 text-xs text-cream-dim"
              >
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-14 rounded-3xl border border-gold/30 bg-gradient-to-br from-indigo/60 to-maroon/30 p-8 text-center">
        <p className="font-display text-xl font-semibold text-cream">
          Interested in this event?
        </p>
        <p className="mt-2 text-sm text-cream-dim">
          Register your interest and include this event among your Major or Minor picks.
        </p>
        <div className="mt-6 flex justify-center">
          <RegisterCta />
        </div>
      </div>
    </div>
  );
}
