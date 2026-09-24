"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import RegisterCta from "./RegisterCta";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/converge", label: "Converge" },
  { href: "/events", label: "Events" },
  { href: "/selection", label: "How Selection Works" },
  { href: "/rulebook", label: "Rulebook" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gold/15 bg-ink/85 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-magenta font-display text-base font-bold text-ink">
            N
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-sm font-semibold tracking-wide text-cream">
              NIFT JODHPUR
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-light">
              Converge 2026
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-medium tracking-wide transition-colors hover:text-gold-light",
                pathname === link.href ? "text-gold-light" : "text-cream/80"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          <RegisterCta size="sm" />
        </div>

        <button
          className="text-cream lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-gold/15 bg-ink px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "text-base font-medium",
                  pathname === link.href ? "text-gold-light" : "text-cream/85"
                )}
              >
                {link.label}
              </Link>
            ))}
            <RegisterCta className="mt-2 w-full" />
          </div>
        </div>
      )}
    </header>
  );
}
