import { notFound } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import EventRow from "@/components/EventRow";
import { CATEGORY_META, CATEGORY_ORDER, EventCategory } from "@/lib/types";
import { getEventsByCategory } from "@/lib/events";

export function generateStaticParams() {
  return CATEGORY_ORDER.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = CATEGORY_META[category as EventCategory];
  return { title: meta ? `${meta.label} | NIFT Jodhpur Converge 2026` : "Events" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = CATEGORY_META[category as EventCategory];
  if (!meta) notFound();

  const events = getEventsByCategory(category);
  const idx = CATEGORY_ORDER.indexOf(category as EventCategory);

  return (
    <>
      <PageHeader
        back={{ href: "/events", label: "All events" }}
        kicker={`Arena 0${idx + 1} · ${events.length} events`}
        title={meta.label}
        intro={meta.description}
        tone={clsx(meta.bg, meta.onColor)}
      />

      <div className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-8">
        <div className="hidden grid-cols-[3rem_1fr_9rem_7rem_13rem_2rem] gap-x-4 border-b border-ink/15 py-3 pl-4 pr-2 text-ink-soft md:grid">
          <span className="label">No.</span>
          <span className="label">Event</span>
          <span />
          <span className="label">Format</span>
          <span className="label">Participants / campus</span>
          <span />
        </div>
        <ul>
          {events.map((event, i) => (
            <EventRow key={event.slug} event={event} index={i} showArena={false} />
          ))}
        </ul>

        <nav className="mt-16" aria-label="Other arenas">
          <p className="label text-ink-soft">Other arenas</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {CATEGORY_ORDER.filter((c) => c !== category).map((c) => (
              <Link
                key={c}
                href={`/events/${c}`}
                className={clsx(
                  "btn-print border-2 border-ink px-4 py-2.5 text-sm font-bold uppercase tracking-wide",
                  CATEGORY_META[c].bg,
                  CATEGORY_META[c].onColor
                )}
              >
                {CATEGORY_META[c].label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
