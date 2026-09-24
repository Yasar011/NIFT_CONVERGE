import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText } from "lucide-react";
import clsx from "clsx";
import RegisterCta from "@/components/RegisterCta";
import SectionHeading from "@/components/SectionHeading";
import SelectionJourney from "@/components/SelectionJourney";
import RuleTag from "@/components/RuleTag";
import Arches from "@/components/Arches";
import Marquee from "@/components/Marquee";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";
import { EVENTS, getEventsByCategory } from "@/lib/events";
import { REGISTRATION_OPEN } from "@/lib/registration-status";

const ARENA_HOVER: Record<string, string> = {
  sports: "hover:bg-sindoor hover:text-paper",
  cultural: "hover:bg-rani hover:text-paper",
  literary: "hover:bg-blue hover:text-paper",
  esse: "hover:bg-marigold",
  photography: "hover:bg-peacock hover:text-paper",
};

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8 lg:pt-10">
        <div className="label flex items-center justify-between border-b border-ink/20 pb-3 text-ink-soft">
          <span>NIFT Jodhpur · Contingent selection</span>
          <span className="hidden sm:block">National inter-campus festival · 2026</span>
        </div>

        <div className="fit-container pt-6 lg:pt-8">
          <h1 className="rise display hero-word">Converge</h1>
        </div>

        <div className="grid gap-10 pt-4 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="rise flex flex-wrap items-end gap-x-5 gap-y-2" style={{ animationDelay: "80ms" }}>
              <span className="display text-[24vw] text-sindoor sm:text-[16vw] lg:text-[9rem]">2026</span>
              <span className="pb-2 lg:pb-4">
                <span className="block font-serif text-4xl italic leading-none sm:text-5xl">Rang Regalia</span>
                <span className="mt-2 block font-deva text-lg text-ink-soft">काव्य · कला · क्रीड़ा</span>
              </span>
            </div>

            <p className="rise mt-8 max-w-xl text-lg leading-relaxed text-ink-soft" style={{ animationDelay: "160ms" }}>
              NIFT&apos;s annual inter-campus festival of sports, culture, literature and
              creativity. This is where NIFT Jodhpur picks the students who will represent
              the campus.
            </p>

            <div className="rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-5" style={{ animationDelay: "240ms" }}>
              <RegisterCta />
              <Link
                href="/events"
                className="group inline-flex items-center gap-2 border-b-2 border-ink pb-1 text-sm font-bold uppercase tracking-wide"
              >
                Browse all {EVENTS.length} events
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="/documents/converge-2026-rulebook.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink"
              >
                <FileText size={16} /> Rulebook (PDF)
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 lg:-mt-6">
            <Arches className="w-full" />
            <p className="label mt-3 text-ink-soft">Five arenas · five arches · one campus contingent</p>
          </div>
        </div>

        {/* fact strip */}
        <dl className="mt-14 grid grid-cols-2 border-t-2 border-ink lg:grid-cols-4">
          {[
            { k: "50", v: "Maximum students NIFT Jodhpur can send", tag: "Official rule" },
            { k: String(EVENTS.length), v: "Events across five arenas", tag: "From the rulebook" },
            { k: "2+1", v: "Major + minor event picks to enter selection", tag: "NIFT Jodhpur rule" },
            { k: REGISTRATION_OPEN ? "Open" : "Soon", v: "Registration status", tag: REGISTRATION_OPEN ? "Live now" : "Opening soon" },
          ].map((f, i) => (
            <div
              key={f.v}
              className={clsx(
                "border-ink/15 py-6 pr-4",
                i % 2 === 0 && "border-r",
                i < 2 && "border-b lg:border-b-0",
                i > 0 && "lg:pl-6",
                i === 1 && "pl-4",
                i === 3 && "pl-4",
                i < 3 && "lg:border-r"
              )}
            >
              <dt className="label text-ink-soft">{f.tag}</dt>
              <dd className="display mt-2 text-6xl sm:text-7xl">{f.k}</dd>
              <dd className="mt-2 max-w-[16rem] text-sm leading-snug text-ink-soft">{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Marquee />

      {/* 2 + 1 */}
      <section className="border-b-2 border-ink bg-marigold">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-5">
            <p className="label flex items-center gap-3">
              01 <span className="h-px w-8 bg-ink/50" /> How you get in
            </p>
            <p className="display mt-6 text-[42vw] leading-[0.75] lg:text-[17rem]" aria-hidden>
              2+1
            </p>
          </div>

          <div className="lg:col-span-7 lg:pt-10">
            <RuleTag type="jodhpur" className="bg-paper" />
            <h2 className="display mt-5 text-5xl sm:text-7xl">
              Pick two major events and one minor.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed">
              To enter NIFT Jodhpur&apos;s internal selection, every student chooses any{" "}
              <strong>2 events as Major</strong> and any <strong>1 as Minor</strong> from
              the full catalogue. This is our campus&apos;s own framework — it is not a rule
              in the official CONVERGE 2026 Rule Book.
            </p>

            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Major 01", "Major 02", "Minor"].map((slot, i) => (
                <li key={slot} className="border-2 border-ink bg-paper">
                  <p className={clsx("label border-b-2 border-ink px-3 py-2", i < 2 ? "bg-ink text-paper" : "bg-paper")}>
                    {slot}
                  </p>
                  <p className="px-3 py-4 text-sm text-ink-soft">Any event you choose</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex gap-4 border-2 border-ink bg-ink p-5 text-paper">
              <span className="display text-4xl text-marigold" aria-hidden>!</span>
              <p className="text-sm leading-relaxed">
                <strong className="text-paper">Registering is not the same as being selected.</strong>{" "}
                <span className="text-paper/75">
                  The final team is shortlisted through screening and trials, within the slots
                  available per event — up to 50 students in total.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARENAS */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 lg:py-24">
        <SectionHeading
          index="02"
          kicker="Five arenas"
          title={<>Where you<br />can compete</>}
          intro="Every event, format and participant limit on this site is taken directly from the official CONVERGE 2026 Rule Book."
        />

        <ul className="mt-12 border-t-2 border-ink">
          {CATEGORY_ORDER.map((key, i) => {
            const meta = CATEGORY_META[key];
            const count = getEventsByCategory(key).length;
            return (
              <li key={key}>
                <Link
                  href={`/events/${key}`}
                  className={clsx(
                    "group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-4 gap-y-2 border-b-2 border-ink px-2 py-6 transition-colors duration-200 sm:px-4 lg:grid-cols-[4rem_1.3fr_1fr_8rem_3rem] lg:py-8",
                    ARENA_HOVER[key]
                  )}
                >
                  <span className="text-sm font-bold tabular-nums">0{i + 1}</span>
                  <span className="display text-4xl sm:text-6xl lg:text-7xl">{meta.label}</span>
                  <ArrowUpRight
                    size={30}
                    className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 lg:order-last"
                    aria-hidden
                  />
                  <span className="col-start-2 col-end-4 text-sm leading-relaxed opacity-80 lg:col-auto">
                    {meta.description}
                  </span>
                  <span className="col-start-2 label lg:col-auto lg:text-right">{count} events</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* JOURNEY */}
      <section className="border-y-2 border-ink bg-blue text-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 lg:py-24">
          <SectionHeading
            index="03"
            kicker="Your Converge journey"
            title={<>From form<br />to final fifty</>}
            intro="Six stages between registering your interest and travelling with the contingent."
            invert
          />
          <div className="mt-14">
            <SelectionJourney invert />
          </div>
        </div>
      </section>

      {/* FINAL 50 */}
      <section className="mx-auto grid max-w-[1400px] items-end gap-8 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
        <p className="display text-[48vw] leading-[0.72] text-sindoor lg:col-span-6 lg:text-[24rem]" aria-hidden>
          50
        </p>
        <div className="lg:col-span-6 lg:pb-6">
          <p className="label flex items-center gap-3 text-ink-soft">
            04 <span className="h-px w-8 bg-ink/40" /> The final fifty
          </p>
          <h2 className="display mt-4 text-5xl sm:text-7xl">Fifty seats. That&apos;s the whole team.</h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
            Each campus can bring at most 50 participants to CONVERGE 2026, including
            substitutes. The Campus SDAC registers the final list. Not everyone who registers
            here will travel.
          </p>
          <RuleTag type="official" className="mt-6" />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-ink bg-sindoor text-paper">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-20">
          <h2 className="display text-6xl sm:text-8xl lg:text-[7.5rem]">
            Ready to<br />represent<br />Jodhpur?
          </h2>
          <div className="max-w-sm lg:pb-3">
            <p className="text-lg leading-relaxed text-paper/85">
              Read the rules, shortlist your three events, and be ready when registration opens.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <RegisterCta tone="paper" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
