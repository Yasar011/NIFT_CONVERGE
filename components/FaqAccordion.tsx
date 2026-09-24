"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={i} className="card-border overflow-hidden rounded-2xl bg-indigo/40">
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-display text-base font-semibold text-cream">
                {item.question}
              </span>
              <ChevronDown
                size={18}
                className={clsx(
                  "shrink-0 text-gold-light transition-transform",
                  open && "rotate-180"
                )}
              />
            </button>
            <div
              className={clsx(
                "grid transition-all duration-300",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-cream-dim">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
