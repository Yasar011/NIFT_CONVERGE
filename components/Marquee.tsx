import { EVENTS } from "@/lib/events";

// Unique event names, scrolling like a festival ticker.
const NAMES = Array.from(new Set(EVENTS.map((e) => e.name.split(" — ")[0])));

export default function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center">
      {NAMES.map((name) => (
        <span key={name} className="flex items-center">
          <span className="display-md whitespace-nowrap px-5 text-2xl sm:text-3xl">{name}</span>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0 fill-marigold" aria-hidden>
            <path d="M5 0 L10 5 L5 10 L0 5 Z" />
          </svg>
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-y-2 border-ink bg-blue py-4 text-paper" aria-hidden>
      <div className="animate-marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
