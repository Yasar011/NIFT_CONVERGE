"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import clsx from "clsx";

export interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ul className="border-t-2 border-ink">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <li key={i} className="border-b-2 border-ink">
            <h3>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                aria-controls={`faq-${i}`}
                className="grid w-full cursor-pointer grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-6 text-left transition-colors hover:bg-paper-2 sm:px-2"
              >
                <span className="text-xs font-bold tabular-nums text-ink-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="display-md text-2xl sm:text-4xl">{item.question}</span>
                <span
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center border-2 border-ink transition-all duration-200",
                    open ? "rotate-45 bg-ink text-paper" : "bg-paper"
                  )}
                  aria-hidden
                >
                  <Plus size={18} strokeWidth={2.5} />
                </span>
              </button>
            </h3>
            <div
              id={`faq-${i}`}
              className={clsx(
                "grid transition-all duration-300",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-7 pl-[3.25rem] pr-4 text-lg leading-relaxed text-ink-soft sm:pl-[3.75rem]">
                  {item.answer}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
