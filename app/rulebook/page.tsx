import { Download, FileText } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import RuleTag from "@/components/RuleTag";
import { GENERAL_GUIDELINES, CONVERGE_CUP, FAIR_PLAY_AWARD, KNOW_BEFORE_YOU_REGISTER } from "@/lib/rulebook";

export const metadata = { title: "Official Rulebook | NIFT Jodhpur Converge 2026" };

const QUICK_SUMMARY = [
  { title: "General Guidelines", desc: "Registration, ID cards, reporting times, conduct, safety and dispute resolution rules that apply across all of Converge." },
  { title: "Sports Rules", desc: "Event-wise rules for athletics, court sports, table games, esports and powerlifting." },
  { title: "Cultural Rules", desc: "Rules for the opening parade, Ms. & Mr. Converge, singing, dance, band and design showcase events." },
  { title: "ESSE Rules", desc: "Rules for street play, monologue, face painting and stand-up comedy." },
  { title: "Literary Rules", desc: "Rules for Brush Battle, Mime, Imaginarium, Ad-Mad, Meme Making and Big Bait." },
  { title: "Adventure & Photography Rules", desc: "Rules for Short Film, Concept Photography and Reel Making." },
  { title: "Converge Cup", desc: "The overall championship, awarded on cumulative Gold/Silver/Bronze points across all events." },
  { title: "Campus & Travel Information", desc: "Host-campus logistics, published by the host campus — not applicable to NIFT Jodhpur's own travel arrangements." },
];

export default function RulebookPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <RuleTag type="official" />
      <div className="mt-4">
        <SectionHeading
          eyebrow="Single source of truth"
          title="Official Rulebook"
          description="CONVERGE 2026 Rule Book — every event, format, and rule on this site is drawn directly from this document."
        />
      </div>

      <a
        href="/documents/converge-2026-rulebook.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold-light/20 to-magenta/20 px-6 py-4 font-semibold text-cream transition-colors hover:border-gold"
      >
        <FileText className="text-gold-light" size={22} />
        <span>CONVERGE 2026 Rule Book</span>
        <Download size={18} className="text-gold-light" />
      </a>
      <p className="mt-2 text-xs text-cream-dim">Opens the official PDF in a new tab.</p>

      <div className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-cream">Quick Summary</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {QUICK_SUMMARY.map((s) => (
            <div key={s.title} className="card-border rounded-2xl bg-indigo/40 p-5">
              <p className="font-display text-base font-semibold text-cream">{s.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-cream-dim">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-cream">General Guidelines</h2>
        <div className="mt-6 space-y-5">
          {GENERAL_GUIDELINES.map((g) => (
            <div key={g.title} className="rounded-2xl border border-gold/15 bg-ink/50 p-5">
              <p className="font-display text-sm font-semibold text-gold-light">{g.title}</p>
              <ul className="mt-2 space-y-1.5">
                {g.points.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-cream-dim">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-cream">Know Before You Register</h2>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {KNOW_BEFORE_YOU_REGISTER.map((r, i) => (
            <div key={i} className="flex gap-2.5 rounded-xl bg-indigo/30 p-3.5 text-sm leading-relaxed text-cream-dim">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" />
              {r}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-indigo/50 to-maroon/20 p-6">
          <p className="font-display text-lg font-semibold text-cream">Converge Cup</p>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">{CONVERGE_CUP.description}</p>
          <div className="mt-4 flex gap-4">
            {CONVERGE_CUP.points.map((p) => (
              <div key={p.position} className="text-center">
                <p className="font-display text-xl font-bold text-gold-light">{p.points}</p>
                <p className="text-xs text-cream-dim">{p.position}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-cream-dim">{CONVERGE_CUP.tiebreaker}</p>
        </div>

        <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-indigo/50 to-maroon/20 p-6">
          <p className="font-display text-lg font-semibold text-cream">Fair Play Award</p>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">{FAIR_PLAY_AWARD.description}</p>
          <ul className="mt-4 space-y-1.5">
            {FAIR_PLAY_AWARD.criteria.map((c) => (
              <li key={c.name} className="flex justify-between text-xs text-cream-dim">
                <span>{c.name}</span>
                <span className="text-gold-light">{c.marks} marks</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-semibold text-cream">Total: {FAIR_PLAY_AWARD.totalMarks} marks</p>
        </div>
      </div>

      <div className="mt-14 rounded-2xl border border-dashed border-gold/30 bg-gold/5 p-6 text-sm leading-relaxed text-cream-dim">
        <p className="font-semibold text-gold-light">About the Campus & Travel Information Guide</p>
        <p className="mt-2">
          The official rulebook&apos;s Campus & Travel Information Guide describes the host
          campus for Converge 2026. It does not apply to NIFT Jodhpur students — our own
          travel, reporting and contingent logistics will be communicated separately by the
          NIFT Jodhpur Campus SDAC.
        </p>
      </div>
    </div>
  );
}
