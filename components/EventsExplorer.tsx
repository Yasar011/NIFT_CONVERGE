"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { EVENTS } from "@/lib/events";
import { CATEGORY_META, EventCategory } from "@/lib/types";
import EventCard from "./EventCard";

const CATEGORIES: (EventCategory | "all")[] = ["all", "sports", "cultural", "literary", "esse", "photography"];

export default function EventsExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EventCategory | "all">("all");

  const filtered = useMemo(() => {
    return EVENTS.filter((e) => {
      const matchesCategory = category === "all" || e.category === category;
      const matchesQuery =
        query.trim() === "" ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.about.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-dim" size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full rounded-full border border-gold/25 bg-ink/60 py-3 pl-11 pr-4 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={clsx(
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                category === c
                  ? "bg-gradient-to-r from-gold-light to-magenta text-ink"
                  : "border border-gold/25 text-cream-dim hover:border-gold/50 hover:text-cream"
              )}
            >
              {c === "all" ? "All" : CATEGORY_META[c].short}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-xs uppercase tracking-widest text-cream-dim">
        {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((event) => (
          <EventCard key={`${event.category}-${event.slug}`} event={event} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 rounded-2xl border border-gold/20 bg-ink/60 p-10 text-center text-cream-dim">
          No events match your search. Try a different keyword or category.
        </div>
      )}
    </div>
  );
}
