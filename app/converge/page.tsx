import { Camera, Drama, Feather, Palette, Trophy } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import RuleTag from "@/components/RuleTag";
import RegisterCta from "@/components/RegisterCta";

const PILLARS = [
  { icon: Trophy, name: "Sports", desc: "Track & field, court, table and combat sports across individual and team formats." },
  { icon: Drama, name: "Cultural", desc: "Music, dance, personality pageant and design showcases on the main stage." },
  { icon: Feather, name: "Literary", desc: "Art, storytelling, improv and idea-pitching competitions." },
  { icon: Palette, name: "Creative / ESSE", desc: "Street theatre, spoken word, comedy and face art." },
  { icon: Camera, name: "Adventure & Photography", desc: "Short film, concept photography and reel making." },
];

export default function ConvergePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <RuleTag type="official" />
      <SectionHeading
        eyebrow="About the festival"
        title="Converge 2026 — Rang Regalia"
        description=""
        light={false}
      />

      <div className="mt-6 space-y-5 text-base leading-relaxed text-cream-dim">
        <p>
          Converge is NIFT&apos;s annual inter-campus festival that brings together students
          from NIFT centres across India to compete in sports, cultural, literary, and creative
          events. Celebrating talent, teamwork, and diversity, the festival fosters camaraderie,
          healthy competition, and the spirit of unity while strengthening the vibrant NIFT
          community.
        </p>
        <p>
          The 2026 theme, <strong className="text-cream">Rang Regalia</strong>, celebrates the
          grandeur of Indian maximalism through the vibrant convergence of{" "}
          <em>Kavya</em> (poetry), <em>Kala</em> (art), and <em>Kreeda</em> (play). Inspired by
          India&apos;s rich cultural heritage, the theme embraces bold colours, intricate
          craftsmanship, expressive traditions, and joyous festivities — creating an immersive
          celebration of creativity, culture, and collective artistic expression.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <div key={p.name} className="card-border flex items-start gap-4 rounded-2xl bg-indigo/40 p-5">
            <p.icon className="mt-0.5 shrink-0 text-gold-light" size={22} />
            <div>
              <p className="font-display text-base font-semibold text-cream">{p.name}</p>
              <p className="mt-1 text-sm text-cream-dim">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-dashed border-gold/30 bg-gold/5 p-6 text-sm leading-relaxed text-cream-dim">
        <p className="font-semibold text-gold-light">A note on this portal</p>
        <p className="mt-2">
          This website is NIFT Jodhpur&apos;s own student registration and selection portal for
          CONVERGE 2026 — it is not the official CONVERGE registration system, and it does not
          represent the host campus. All official CONVERGE communications come only from NIFT /
          the CONVERGE 2026 Organising Committee / your Campus SDAC.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <RegisterCta />
      </div>
    </div>
  );
}
