import { ArrowDownToLine } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import RuleTag from "@/components/RuleTag";
import { GENERAL_GUIDELINES, CONVERGE_CUP, FAIR_PLAY_AWARD, KNOW_BEFORE_YOU_REGISTER } from "@/lib/rulebook";

export const metadata = { title: "Official Rulebook | NIFT Jodhpur Converge 2026" };

const PDF = "/documents/converge-2026-rulebook.pdf";

const TOC = [
  { id: "know", label: "Know before you register" },
  { id: "guidelines", label: "General guidelines" },
  { id: "cup", label: "Converge Cup" },
  { id: "fair-play", label: "Fair Play Award" },
  { id: "host", label: "Host campus information" },
];

const MEDAL_BG = ["bg-marigold text-ink", "bg-paper-2 text-ink", "bg-sindoor text-paper"];

export default function RulebookPage() {
  return (
    <>
      <PageHeader
        kicker="Single source of truth"
        title={<>The<br />rulebook</>}
        intro="Every event and rule on this portal comes from the official CONVERGE 2026 Rule Book. Here's the summary — the PDF has everything."
        tone="bg-ink text-paper"
      >
        <a
          href={PDF}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-print mt-10 inline-flex items-center gap-4 border-2 border-paper bg-marigold px-6 py-4 text-ink"
          style={{ ["--btn-shadow" as string]: "var(--paper)" }}
        >
          <ArrowDownToLine size={22} strokeWidth={2.5} />
          <span>
            <span className="block text-sm font-bold uppercase tracking-wide">Open the full Rule Book</span>
            <span className="block text-xs">CONVERGE 2026 · PDF · 9.5 MB</span>
          </span>
        </a>
      </PageHeader>

      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-12 sm:px-8 lg:grid-cols-12 lg:py-16">
        <nav className="lg:col-span-3" aria-label="On this page">
          <div className="lg:sticky lg:top-24">
            <p className="label text-ink-soft">On this page</p>
            <ol className="mt-4 border-t-2 border-ink">
              {TOC.map((t, i) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="flex gap-3 border-b border-ink/15 py-3 text-sm font-semibold hover:bg-paper-2">
                    <span className="w-6 text-xs tabular-nums text-ink-soft">0{i + 1}</span>
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
            <RuleTag type="official" className="mt-6" />
          </div>
        </nav>

        <div className="space-y-20 lg:col-span-9">
          <section id="know" className="scroll-mt-24">
            <h2 className="display text-5xl sm:text-6xl">Know before you register</h2>
            <ol className="mt-8 grid border-t-2 border-ink sm:grid-cols-2">
              {KNOW_BEFORE_YOU_REGISTER.map((r, i) => (
                <li key={i} className="grid grid-cols-[2.25rem_1fr] border-b border-ink/15 py-4 pr-4 leading-relaxed sm:odd:border-r sm:even:pl-4">
                  <span className="pt-0.5 text-xs font-bold tabular-nums text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="guidelines" className="scroll-mt-24">
            <h2 className="display text-5xl sm:text-6xl">General guidelines</h2>
            <div className="mt-8 border-t-2 border-ink">
              {GENERAL_GUIDELINES.map((g, i) => (
                <div key={g.title} className="grid gap-3 border-b border-ink/15 py-6 md:grid-cols-[16rem_1fr] md:gap-8">
                  <h3 className="display-md flex gap-3 text-2xl">
                    <span className="pt-1 text-xs font-bold tabular-nums text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                    {g.title}
                  </h3>
                  <ul className="space-y-2">
                    {g.points.map((p, j) => (
                      <li key={j} className="flex gap-3 leading-relaxed text-ink-soft">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-ink" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="cup" className="scroll-mt-24">
            <h2 className="display text-5xl sm:text-6xl">Converge Cup</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{CONVERGE_CUP.description}</p>
            <div className="mt-8 grid grid-cols-3 border-2 border-ink">
              {CONVERGE_CUP.points.map((p, i) => (
                <div key={p.position} className={`${MEDAL_BG[i]} p-5 ${i < 2 ? "border-r-2 border-ink" : ""}`}>
                  <p className="label">{p.position}</p>
                  <p className="display mt-2 text-7xl sm:text-8xl">{p.points}</p>
                  <p className="text-sm">points</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-soft">{CONVERGE_CUP.tiebreaker}</p>
          </section>

          <section id="fair-play" className="scroll-mt-24">
            <h2 className="display text-5xl sm:text-6xl">Fair Play Award</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{FAIR_PLAY_AWARD.description}</p>
            <table className="mt-8 w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="label py-3 text-ink-soft">Criterion</th>
                  <th className="label py-3 text-right text-ink-soft">Marks</th>
                </tr>
              </thead>
              <tbody>
                {FAIR_PLAY_AWARD.criteria.map((c) => (
                  <tr key={c.name} className="border-b border-ink/15">
                    <td className="py-3 font-semibold">{c.name}</td>
                    <td className="py-3 text-right tabular-nums">{c.marks}</td>
                  </tr>
                ))}
                <tr className="border-b-2 border-ink">
                  <td className="py-3 font-bold uppercase">Total</td>
                  <td className="display py-3 text-right text-3xl">{FAIR_PLAY_AWARD.totalMarks}</td>
                </tr>
              </tbody>
            </table>
            <details className="mt-4 text-sm text-ink-soft">
              <summary className="cursor-pointer font-semibold text-ink">How ties are broken</summary>
              <ol className="mt-3 list-decimal space-y-1 pl-5">
                {FAIR_PLAY_AWARD.tiebreakerSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </details>
          </section>

          <section id="host" className="scroll-mt-24 border-2 border-dashed border-ink/40 p-6 sm:p-8">
            <p className="label text-sindoor">Host campus information</p>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
              The rulebook&apos;s Campus &amp; Travel Information Guide describes the host
              campus for Converge 2026. It doesn&apos;t apply to NIFT Jodhpur&apos;s own
              arrangements — travel, reporting and contingent logistics will be shared
              separately by the NIFT Jodhpur Campus SDAC.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
