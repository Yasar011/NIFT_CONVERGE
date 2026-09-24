"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import RegisterCta from "./RegisterCta";

const LINKS = [
  { href: "/converge", label: "Converge" },
  { href: "/events", label: "Events" },
  { href: "/selection", label: "Selection" },
  { href: "/rulebook", label: "Rulebook" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper">
      <nav className="mx-auto flex max-w-[1400px] items-stretch justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 py-3" onClick={() => setOpen(false)}>
          <span className="display text-[2rem] leading-none">
            Converge<span className="text-sindoor">’26</span>
          </span>
          <span className="hidden border-l-2 border-ink pl-3 text-[0.68rem] font-bold uppercase leading-tight tracking-[0.12em] sm:block lg:hidden xl:block">
            NIFT
            <br />
            Jodhpur
          </span>
        </Link>

        <div className="hidden items-stretch lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center border-l border-ink/15 px-4 text-sm xl:px-5 font-semibold uppercase tracking-wide transition-colors",
                isActive(link.href) ? "bg-ink text-paper" : "hover:bg-paper-2"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center border-l border-ink/15 pl-4 xl:pl-5">
            <RegisterCta size="sm" />
          </div>
        </div>

        <button
          className="flex items-center gap-2 py-3 text-sm font-bold uppercase tracking-wide lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[58px] z-40 flex flex-col overflow-y-auto bg-blue px-4 pb-8 pt-4 text-paper lg:hidden">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="display border-b border-paper/25 py-3 text-6xl"
          >
            Home
          </Link>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "display border-b border-paper/25 py-3 text-6xl",
                isActive(link.href) && "text-marigold"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-8" onClick={() => setOpen(false)}>
            <RegisterCta tone="paper" className="w-full" />
          </div>
        </div>
      )}
    </header>
  );
}
