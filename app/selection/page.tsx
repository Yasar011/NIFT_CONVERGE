import { AlertCircle, Trophy } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import SelectionJourney from "@/components/SelectionJourney";
import RuleTag from "@/components/RuleTag";
import RegisterCta from "@/components/RegisterCta";

export const metadata = { title: "How Selection Works | NIFT Jodhpur Converge 2026" };

export default function SelectionPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <RuleTag type="jodhpur" />
      <div className="mt-4">
        <SectionHeading
          eyebrow="Read this before you register"
          title="How will you get selected?"
          description="NIFT Jodhpur's internal process for shortlisting the final CONVERGE 2026 contingent."
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-gold/30 bg-indigo/40 p-8 sm:flex-row sm:justify-center">
        <div className="text-center">
          <p className="font-display text-4xl font-bold text-gold-light">2</p>
          <p className="text-sm font-semibold uppercase tracking-wide text-cream">Major Events</p>
        </div>
        <span className="font-display text-3xl text-cream-dim">+</span>
        <div className="text-center">
          <p className="font-display text-4xl font-bold text-gold-light">1</p>
          <p className="text-sm font-semibold uppercase tracking-wide text-cream">Minor Event</p>
        </div>
      </div>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-cream-dim">
        <p>
          Every student who wants to enter the NIFT Jodhpur selection process for CONVERGE 2026
          must select <strong className="text-cream">any 2 events as their Major Events</strong>{" "}
          and <strong className="text-cream">any 1 event as their Minor Event</strong> from the
          full event catalogue on this site, at the time of registration.
        </p>
        <p>
          This 2 Major + 1 Minor structure is{" "}
          <strong className="text-cream">NIFT Jodhpur&apos;s own internal selection
          framework</strong>. It is how our campus organises interest and screens students across
          events — it is not a rule defined in the official CONVERGE 2026 Rule Book.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-magenta/40 bg-magenta/10 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-magenta-light" size={20} />
          <div>
            <p className="font-display text-base font-semibold text-cream">
              Registration does not guarantee selection.
            </p>
            <p className="mt-2 text-sm text-cream/85">
              Completing this form only enters you into NIFT Jodhpur&apos;s internal selection
              process. The final team will be shortlisted based on this process and the
              participant slots available in each event — up to a campus-wide maximum of 50
              students, as fixed by the official CONVERGE 2026 rules.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <SectionHeading eyebrow="Step by step" title="Your Converge journey" />
        <div className="mt-8">
          <SelectionJourney />
        </div>
      </div>

      <div className="mt-14 rounded-3xl border border-gold/30 bg-gradient-to-br from-indigo/60 to-maroon/30 p-8 text-center">
        <Trophy className="mx-auto text-gold-light" size={28} />
        <p className="mt-4 font-display text-xl font-semibold text-cream">The Final 50</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-cream-dim">
          NIFT Jodhpur can send a maximum of 50 participants to CONVERGE 2026, registered through
          the Campus SDAC. Not every registered student will travel.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <RegisterCta />
      </div>
    </div>
  );
}
