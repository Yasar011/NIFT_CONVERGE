import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import EventCard from "@/components/EventCard";
import { CATEGORY_META, EventCategory } from "@/lib/types";
import { getEventsByCategory } from "@/lib/events";

export function generateStaticParams() {
  return Object.keys(CATEGORY_META).map((category) => ({ category }));
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

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-cream-dim hover:text-cream">
        <ChevronLeft size={16} /> All events
      </Link>

      <div className="mt-6">
        <SectionHeading
          eyebrow={`${events.length} Events`}
          title={meta.label}
          description={meta.description}
        />
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.slug} event={event} />
        ))}
      </div>
    </div>
  );
}
