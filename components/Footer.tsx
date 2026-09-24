import Link from "next/link";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";

export default function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="border-zigzag bg-paper" />
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-serif text-3xl italic leading-snug text-paper/90">
              Rang Regalia —{" "}
              <span className="font-deva not-italic">काव्य · कला · क्रीड़ा</span>
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/60">
              NIFT Jodhpur&apos;s student gateway for CONVERGE 2026. This is not the official
              CONVERGE registration system — always follow communication from NIFT, the
              CONVERGE 2026 Organising Committee and your Campus SDAC.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="label mb-4 text-marigold">Portal</p>
              <ul className="space-y-2.5 text-sm text-paper/75">
                <li><Link href="/converge" className="hover:text-paper hover:underline">About Converge</Link></li>
                <li><Link href="/events" className="hover:text-paper hover:underline">All events</Link></li>
                <li><Link href="/selection" className="hover:text-paper hover:underline">How selection works</Link></li>
                <li><Link href="/rulebook" className="hover:text-paper hover:underline">Rulebook</Link></li>
                <li><Link href="/register" className="hover:text-paper hover:underline">Register</Link></li>
                <li><Link href="/faq" className="hover:text-paper hover:underline">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <p className="label mb-4 text-marigold">Arenas</p>
              <ul className="space-y-2.5 text-sm text-paper/75">
                {CATEGORY_ORDER.map((c) => (
                  <li key={c}>
                    <Link href={`/events/${c}`} className="hover:text-paper hover:underline">
                      {CATEGORY_META[c].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="label mb-4 text-marigold">Contact</p>
              <p className="border border-dashed border-paper/30 p-3 text-xs leading-relaxed text-paper/60">
                NIFT Jodhpur Campus SDAC contact details will be published here.
                <span className="label mt-2 block text-paper/85">To be announced</span>
              </p>
            </div>
          </div>
        </div>

        <div className="fit-container mt-16">
          <p className="display select-none leading-[0.8] text-paper [font-size:calc(100cqw/5.1)]" aria-hidden>
            Converge<span className="text-sindoor">’26</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-2 border-t border-paper/20 pt-5 text-xs text-paper/50 sm:flex-row">
          <p>© 2026 NIFT Jodhpur · Converge selection portal</p>
          <p>Event rules sourced from the official CONVERGE 2026 Rule Book.</p>
        </div>
      </div>
    </footer>
  );
}
