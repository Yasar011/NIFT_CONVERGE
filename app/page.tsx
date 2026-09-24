import Link from "next/link";
import { Sparkles, Trophy, Users } from "lucide-react";
import RegisterCta from "@/components/RegisterCta";
import SectionHeading from "@/components/SectionHeading";
import SelectionJourney from "@/components/SelectionJourney";
import CategoryCard from "@/components/CategoryCard";
import RuleTag from "@/components/RuleTag";
import { CATEGORY_META } from "@/lib/types";
import { getEventsByCategory } from "@/lib/events";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gold/15">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-float-slow rounded-full bg-magenta/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-32 h-80 w-80 animate-float-slow rounded-full bg-gold/15 blur-3xl" style={{ animationDelay: "1.5s" }} />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 animate-float-slow rounded-full bg-teal/15 blur-3xl" style={{ animationDelay: "3s" }} />

        <div className="relative mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="animate-fade-up mb-5 text-xs font-bold uppercase tracking-[0.35em] text-gold-light">
            NIFT Jodhpur × National Inter-Campus Festival
          </p>
          <h1 className="animate-fade-up font-display text-5xl font-bold leading-[1.05] text-cream sm:text-7xl">
            CONVERGE <span className="text-gradient-gold">2026</span>
          </h1>
          <p className="animate-fade-up mt-2 font-display text-xl font-medium tracking-wide text-cream/90 sm:text-2xl">
            NIFT JODHPUR
          </p>
          <p className="animate-fade-up mt-4 font-display text-2xl italic text-gold-light sm:text-3xl">
            Rang Regalia
          </p>

          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cream-dim sm:text-lg">
            NIFT&apos;s annual inter-campus festival bringing together students from NIFT
            campuses across India through sports, cultural, literary and creative events.
          </p>

          <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-4">
            <RegisterCta />
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:border-gold hover:text-gold-light"
            >
              Explore Events
            </Link>
            <Link
              href="/rulebook"
              className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:border-gold hover:text-gold-light"
            >
              Read Rulebook
            </Link>
          </div>

          {/* 3-second clarity strip */}
          <div className="animate-fade-up mt-16 grid gap-4 sm:grid-cols-3">
            <div className="card-border rounded-2xl bg-ink/60 p-5 text-left">
              <Sparkles className="text-gold-light" size={20} />
              <p className="mt-3 font-display text-base font-semibold text-cream">
                Converge 2026 is coming
              </p>
              <p className="mt-1 text-xs text-cream-dim">
                NIFT&apos;s biggest inter-campus festival returns this year.
              </p>
            </div>
            <div className="card-border rounded-2xl bg-ink/60 p-5 text-left">
              <Users className="text-gold-light" size={20} />
              <p className="mt-3 font-display text-base font-semibold text-cream">
                Max 50 participants
              </p>
              <p className="mt-1 text-xs text-cream-dim">
                NIFT Jodhpur can send a maximum of 50 students to Converge.
              </p>
            </div>
            <div className="card-border rounded-2xl bg-ink/60 p-5 text-left">
              <Trophy className="text-gold-light" size={20} />
              <p className="mt-3 font-display text-base font-semibold text-cream">
                2 Major + 1 Minor
              </p>
              <p className="mt-1 text-xs text-cream-dim">
                Choose this combination of events to enter the selection process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTED NOTICE */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-maroon via-maroon-light to-magenta p-8 text-center shadow-2xl shadow-magenta/10 sm:p-12">
          <p className="font-display text-2xl font-bold text-cream sm:text-3xl">
            Want to represent NIFT Jodhpur at Converge 2026?
          </p>
          <p className="mt-3 text-cream/90">Choose your events carefully.</p>
          <p className="mt-4 font-display text-lg font-semibold text-gold-light">
            2 Major Events + 1 Minor Event
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-cream/85">
            Complete your registration to enter the NIFT Jodhpur selection process.
            Only selected students will be part of the final 50-member CONVERGE contingent.
          </p>
          <div className="mt-7 flex justify-center">
            <RegisterCta variant="outline" />
          </div>
        </div>
      </section>

      {/* WHAT IS CONVERGE */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <SectionHeading
          eyebrow="What is Converge"
          title="One festival, five arenas of talent"
          description="Converge is NIFT's annual inter-campus festival that brings together students from NIFT centres across India to compete and collaborate."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((key) => (
            <div key={key} className="card-border rounded-2xl bg-indigo/40 p-5">
              <p className="font-display text-base font-semibold text-cream">
                {CATEGORY_META[key].label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-cream-dim">
                {CATEGORY_META[key].description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-cream-dim">
          Celebrating talent, teamwork, and diversity, the festival fosters camaraderie, healthy
          competition, and the spirit of unity while strengthening the vibrant NIFT community.
        </p>
      </section>

      {/* HOW WILL YOU GET SELECTED */}
      <section className="border-y border-gold/15 bg-ink/40 py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <RuleTag type="jodhpur" />
          </div>
          <SectionHeading
            eyebrow="The most important section on this site"
            title="How will you get selected?"
            description="To be eligible for the NIFT Jodhpur internal selection process for CONVERGE 2026, every student must choose:"
          />

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="card-border rounded-2xl bg-gradient-to-br from-magenta/20 to-indigo/40 px-8 py-6 text-center">
              <p className="font-display text-3xl font-bold text-gold-light">2</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-cream">
                Major Events
              </p>
            </div>
            <span className="font-display text-2xl text-cream-dim">+</span>
            <div className="card-border rounded-2xl bg-gradient-to-br from-teal/20 to-indigo/40 px-8 py-6 text-center">
              <p className="font-display text-3xl font-bold text-gold-light">1</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-cream">
                Minor Event
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-gold/25 bg-ink/60 p-6 text-sm leading-relaxed text-cream-dim">
            <p>
              This 2 Major + 1 Minor requirement is NIFT Jodhpur&apos;s own internal selection
              framework — it decides how our campus shortlists students for the final
              contingent. It is <strong className="text-cream">not</strong> an official rule of
              CONVERGE 2026 itself.
            </p>
            <p className="mt-3">
              <strong className="text-cream">Registration does not guarantee selection.</strong>{" "}
              The final NIFT Jodhpur team will be shortlisted based on the internal selection
              process and available participant slots, up to a maximum of 50 students.
            </p>
          </div>
        </div>
      </section>

      {/* EVENTS PREVIEW */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <SectionHeading
          eyebrow="Event Explorer"
          title="Browse events by category"
          description="Every event below is sourced directly from the official CONVERGE 2026 Rule Book."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((key) => (
            <CategoryCard
              key={key}
              slug={key}
              label={CATEGORY_META[key].label}
              description={CATEGORY_META[key].description}
              count={getEventsByCategory(key).length}
            />
          ))}
        </div>
      </section>

      {/* YOUR CONVERGE JOURNEY */}
      <section className="border-y border-gold/15 bg-ink/40 py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Your Converge Journey"
            title="From registration to the final 50"
            align="center"
          />
          <div className="mt-10">
            <SelectionJourney />
          </div>
        </div>
      </section>

      {/* FINAL 50 */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <div className="card-border flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-indigo/60 to-maroon/30 p-10 text-center">
          <Trophy className="text-gold-light" size={32} />
          <h2 className="font-display text-3xl font-semibold text-cream">The Final 50</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-cream-dim">
            As per the official CONVERGE 2026 rules, NIFT Jodhpur can send a maximum of{" "}
            <strong className="text-cream">50 participants</strong> to CONVERGE 2026. The final
            contingent, including event registrations and substitutes, will be managed and
            submitted through the Campus SDAC. Not every registered student will travel —
            selection depends on the internal screening process and available slots per event.
          </p>
          <RuleTag type="official" />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-gold/15 bg-gradient-to-br from-ink via-indigo/60 to-maroon/40 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl font-bold text-cream sm:text-4xl">
            Ready to represent NIFT Jodhpur?
          </h2>
          <p className="mt-4 text-cream-dim">
            Explore the events. Read the rules. Choose your events. Get ready for the selection
            process.
          </p>
          <div className="mt-8 flex justify-center">
            <RegisterCta />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-gold-light">
            NIFT Jodhpur × Converge 2026
          </p>
        </div>
      </section>
    </div>
  );
}
