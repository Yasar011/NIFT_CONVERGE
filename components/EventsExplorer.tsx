"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import clsx from "clsx";
import { EVENTS } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, EventCategory } from "@/lib/types";
import EventRow from "./EventRow";

export default function EventsExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EventCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVENTS.filter((e) => {
      const matchesCategory = category === "all" || e.category === category;
      const matchesQuery =
        q === "" ||
        e.name.toLowerCase().includes(q) ||
        e.about.toLowerCase().includes(q) ||
        (e.genderNote ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const tabs: { key: EventCategory | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: EVENTS.length },
    ...CATEGORY_ORDER.map((c) => ({
      key: c,
      label: CATEGORY_META[c].short,
      count: EVENTS.filter((e) => e.category === c).length,
    })),
  ];

  return (
    <div>
      <div className="sticky top-[58px] z-30 -mx-4 border-b-2 border-ink bg-paper px-4 sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-0 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="-mx-4 flex overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist" aria-label="Filter by arena">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={category === t.key}
                onClick={() => setCategory(t.key)}
                className={clsx(
                  "flex shrink-0 cursor-pointer items-baseline gap-1.5 border-b-4 px-3 py-4 text-sm font-bold uppercase tracking-wide transition-colors",
                  category === t.key ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
                )}
              >
                {t.label}
                <span className="text-[0.65rem] tabular-nums">{t.count}</span>
              </button>
            ))}
          </div>

          <label className="relative flex items-center border-t border-ink/15 lg:w-60 lg:shrink-0 lg:border-l xl:w-80 lg:border-t-0">
            <Search className="pointer-events-none absolute left-0 lg:left-4" size={18} aria-hidden />
            <span className="sr-only">Search events</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search — e.g. relay, dance, film"
              className="w-full bg-transparent py-4 pl-7 pr-8 text-sm placeholder:text-ink-soft/70 focus:outline-none lg:pl-11"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-0 cursor-pointer p-1 lg:right-2"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>
      </div>

      <div className="hidden grid-cols-[3rem_1fr_9rem_7rem_13rem_2rem] gap-x-4 border-b border-ink/15 py-3 pl-4 pr-2 text-ink-soft md:grid">
        <span className="label">No.</span>
        <span className="label">Event</span>
        <span className="label">Arena</span>
        <span className="label">Format</span>
        <span className="label">Participants / campus</span>
        <span />
      </div>

      <ul>
        {filtered.map((event, i) => (
          <EventRow key={`${event.category}-${event.slug}`} event={event} index={i} />
        ))}
      </ul>

      {filtered.length === 0 && (
        <div className="border-b border-ink/15 py-16 text-center">
          <p className="display-md text-3xl">Nothing matches “{query}”</p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="mt-4 cursor-pointer text-sm font-semibold underline underline-offset-4"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
