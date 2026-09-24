import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gold/15 bg-ink">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-semibold text-cream">NIFT JODHPUR</p>
            <p className="font-display text-sm text-gold-light">CONVERGE 2026</p>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-cream-dim">Rang Regalia</p>
            <p className="mt-4 text-sm leading-relaxed text-cream-dim">
              The official NIFT Jodhpur student gateway for CONVERGE 2026 — not a
              replacement for the official CONVERGE registration system.
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-light">
              Explore
            </p>
            <ul className="space-y-2.5 text-sm text-cream-dim">
              <li><Link href="/events" className="hover:text-cream">Events</Link></li>
              <li><Link href="/selection" className="hover:text-cream">Selection Process</Link></li>
              <li><Link href="/rulebook" className="hover:text-cream">Rulebook</Link></li>
              <li><Link href="/register" className="hover:text-cream">Registration</Link></li>
              <li><Link href="/faq" className="hover:text-cream">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-light">
              Categories
            </p>
            <ul className="space-y-2.5 text-sm text-cream-dim">
              <li><Link href="/events/sports" className="hover:text-cream">Sports</Link></li>
              <li><Link href="/events/cultural" className="hover:text-cream">Cultural</Link></li>
              <li><Link href="/events/literary" className="hover:text-cream">Literary & Creative</Link></li>
              <li><Link href="/events/esse" className="hover:text-cream">ESSE</Link></li>
              <li><Link href="/events/photography" className="hover:text-cream">Adventure & Photography</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-light">
              NIFT Jodhpur Contact
            </p>
            <div className="rounded-xl border border-dashed border-gold/30 bg-gold/5 p-4 text-xs leading-relaxed text-cream-dim">
              Campus SDAC contact details will be published here by NIFT Jodhpur.
              <span className="mt-2 block font-semibold text-gold-light">
                [ PLACEHOLDER — TO BE ANNOUNCED ]
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gold/10 pt-6 text-xs text-cream-dim">
          <p>
            For official information, always follow communications issued by NIFT / CONVERGE 2026 / Campus SDAC.
          </p>
          <p className="mt-2">
            © 2026 NIFT Jodhpur Converge Selection Portal. Event rules sourced from the official CONVERGE 2026 Rule Book.
          </p>
        </div>
      </div>
    </footer>
  );
}
