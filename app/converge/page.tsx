import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import RuleTag from "@/components/RuleTag";
import RegisterCta from "@/components/RegisterCta";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";

export const metadata = { title: "About Converge | NIFT Jodhpur Converge 2026" };

const PILLARS = [
  { deva: "काव्य", name: "Kavya", gloss: "Poetry", bg: "bg-rani text-paper" },
  { deva: "कला", name: "Kala", gloss: "Art", bg: "bg-marigold text-ink" },
  { deva: "क्रीड़ा", name: "Kreeda", gloss: "Play", bg: "bg-peacock text-paper" },
];

export default function ConvergePage() {
  return (
    <>
      <PageHeader
        kicker="About the festival"
        title={<>What is<br />Converge?</>}
        intro="NIFT's annual inter-campus festival, bringing students from NIFT centres across India together to compete in sports, cultural, literary and creative events."
        tone="bg-blue text-paper"
      />

      <section className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-5">
          <RuleTag type="official" />
          <p className="mt-6 font-serif text-4xl italic leading-[1.1] sm:text-5xl">
            “Rang Regalia” celebrates the grandeur of Indian maximalism.
          </p>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-ink-soft lg:col-span-6 lg:col-start-7 lg:pt-12">
          <p>
            The 2026 theme brings together <em className="text-ink">Kavya</em> (poetry),{" "}
            <em className="text-ink">Kala</em> (art) and <em className="text-ink">Kreeda</em>{" "}
            (play). Inspired by India&apos;s cultural heritage, it embraces bold colour,
            intricate craftsmanship, expressive traditions and joyous festivity.
          </p>
          <p>
            Celebrating talent, teamwork and diversity, Converge builds camaraderie, healthy
            competition and a sense of unity across the NIFT community.
          </p>
        </div>
      </section>

      <section className="grid border-y-2 border-ink sm:grid-cols-3">
        {PILLARS.map((p, i) => (
          <div
            key={p.name}
            className={clsx(
              "flex min-h-[18rem] flex-col justify-between p-6 sm:p-8",
              p.bg,
              i < 2 && "border-b-2 border-ink sm:border-b-0 sm:border-r-2"
            )}
          >
            <p className="font-deva text-7xl leading-none sm:text-8xl">{p.deva}</p>
            <div>
              <p className="display text-5xl">{p.name}</p>
              <p className="mt-1 font-serif text-2xl italic">{p.gloss}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 lg:py-24">
        <p className="label text-ink-soft">The five arenas</p>
        <ul className="mt-6 border-t-2 border-ink">
          {CATEGORY_ORDER.map((c, i) => (
            <li key={c}>
              <Link
                href={`/events/${c}`}
                className="group flex items-center justify-between gap-4 border-b border-ink/15 py-5 hover:bg-paper-2 sm:px-2"
              >
                <span className="flex items-baseline gap-4">
                  <span className="text-xs font-bold tabular-nums text-ink-soft">0{i + 1}</span>
                  <span className={clsx("mt-1 inline-block h-3 w-3 shrink-0", CATEGORY_META[c].bg)} aria-hidden />
                  <span className="display-md text-3xl sm:text-4xl">{CATEGORY_META[c].label}</span>
                </span>
                <span className="hidden flex-1 text-sm text-ink-soft md:block md:max-w-sm">
                  {CATEGORY_META[c].description}
                </span>
                <ArrowUpRight className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-8 border-2 border-dashed border-ink/40 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <p className="label text-sindoor">A note on this portal</p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              This site is NIFT Jodhpur&apos;s own registration and selection portal for
              CONVERGE 2026. It is not the official CONVERGE registration system and does not
              represent the host campus. Official communication comes only from NIFT, the
              CONVERGE 2026 Organising Committee and your Campus SDAC.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <RegisterCta />
          </div>
        </div>
      </section>
    </>
  );
}
