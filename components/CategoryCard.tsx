import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCategory } from "@/lib/types";

export default function CategoryCard({
  slug,
  label,
  description,
  count,
}: {
  slug: EventCategory;
  label: string;
  description: string;
  count: number;
}) {
  return (
    <Link
      href={`/events/${slug}`}
      className="card-border group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-indigo/60 to-maroon/40 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/60"
    >
      <span className="text-xs font-bold uppercase tracking-widest text-gold-light">
        {count} Events
      </span>
      <h3 className="mt-3 font-display text-2xl font-semibold text-cream">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-cream-dim">{description}</p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-light group-hover:text-gold">
        Explore {label}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
