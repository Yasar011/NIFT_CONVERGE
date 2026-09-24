import Link from "next/link";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import SelectionJourney from "@/components/SelectionJourney";
import RuleTag from "@/components/RuleTag";
import RegisterCta from "@/components/RegisterCta";

export const metadata = { title: "How Selection Works | NIFT Jodhpur Converge 2026" };

const SPLIT = [
  {
    tag: "jodhpur" as const,
    title: "Set by NIFT Jodhpur",
    points: [
      "Choosing 2 Major events + 1 Minor event to enter selection.",
      "Screening, trials and auditions run by club coordinators.",
      "Who gets shortlisted for each event.",
    ],
  },
  {
    tag: "official" as const,
    title: "Set by the CONVERGE rulebook",
    points: [
      "A maximum of 50 participants per campus, including substitutes.",
      "Participant limits for every event (e.g. 1 boy for the 100 m).",
      "Final registration by the Campus SDAC through the CMS.",
    ],
  },
];

export default function SelectionPage() {
  return (
    <>
      <PageHeader
        kicker="Read this before you register"
        title={<>How you get<br />selected</>}
        intro="NIFT Jodhpur's internal process for choosing the students who go to CONVERGE 2026."
        tone="bg-marigold text-ink"
      />

      <section className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-5">
          <p className="display text-[40vw] leading-[0.75] lg:text-[15rem]" aria-hidden>2+1</p>
        </div>
        <div className="lg:col-span-7 lg:pt-6">
          <RuleTag type="jodhpur" />
          <h2 className="display mt-5 text-5xl sm:text-6xl">Any two as Major. Any one as Minor.</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            When you register, choose any 2 events from the{" "}
            <Link href="/events" className="font-semibold text-ink underline underline-offset-4">
              full programme
            </Link>{" "}
            as your Major events and any 1 as your Minor event. All three must be different.
            Coordinators use these picks to plan screening and trials across events.
          </p>

          <div className="mt-8 border-2 border-ink bg-ink p-6 text-paper">
            <p className="display-md text-3xl text-marigold">Registration ≠ selection</p>
            <p className="mt-3 leading-relaxed text-paper/80">
              Registering only enters you into NIFT Jodhpur&apos;s process. The final team is
              shortlisted from it, within the slots each event allows, up to a campus-wide
              maximum of 50 students.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-ink">
        <div className="mx-auto grid max-w-[1400px] md:grid-cols-2">
          {SPLIT.map((s, i) => (
            <div
              key={s.title}
              className={clsx(
                "px-4 py-12 sm:px-8",
                i === 0 && "border-b-2 border-ink md:border-b-0 md:border-r-2"
              )}
            >
              <RuleTag type={s.tag} />
              <h3 className="display-md mt-5 text-4xl">{s.title}</h3>
              <ul className="mt-5">
                {s.points.map((p) => (
                  <li key={p} className="border-b border-ink/15 py-3 leading-relaxed last:border-b-0">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y-2 border-ink bg-blue text-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 lg:py-20">
          <p className="label text-paper/70">Step by step</p>
          <h2 className="display mt-4 text-6xl sm:text-7xl">Your Converge journey</h2>
          <div className="mt-12">
            <SelectionJourney invert />
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-8 px-4 py-16 sm:px-8 lg:flex-row lg:items-end">
        <h2 className="display text-6xl sm:text-7xl">Shortlist your<br />three events.</h2>
        <div className="flex flex-wrap items-center gap-6">
          <RegisterCta />
          <Link href="/events" className="border-b-2 border-ink pb-1 text-sm font-bold uppercase tracking-wide">
            Browse events
          </Link>
        </div>
      </section>
    </>
  );
}
