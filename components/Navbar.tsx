"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import AccountMenu from "./auth/AccountMenu";
import { useAuth } from "./auth/AuthProvider";

const LINKS = [
  { href: "/converge", label: "Converge" },
  { href: "/events", label: "Events" },
  { href: "/selection", label: "Selection" },
  { href: "/rulebook", label: "Rulebook" },
  { href: "/vote", label: "Vote" },
];

const MOBILE_EXTRA = [
  { href: "/results", label: "Results" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar({ cta, mobileCta }: { cta: React.ReactNode; mobileCta: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { status, me, signOut } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isAdmin = me?.user.role && me.user.role !== "student";

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
                "flex items-center border-l border-ink/15 px-4 text-sm font-semibold uppercase tracking-wide transition-colors xl:px-5",
                isActive(link.href) ? "bg-ink text-paper" : "hover:bg-paper-2"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center border-l border-ink/15 pl-4 xl:pl-5">{cta}</div>
          <div className="flex items-center pl-4">
            <AccountMenu />
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
          {[{ href: "/", label: "Home" }, ...LINKS, ...MOBILE_EXTRA].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "display border-b border-paper/25 py-2.5 text-5xl",
                (link.href === "/" ? pathname === "/" : isActive(link.href)) && "text-marigold"
              )}
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-bold uppercase tracking-wide">
            {status === "signed-in" ? (
              <>
                <Link href="/me" onClick={() => setOpen(false)} className="border-2 border-paper px-3 py-3 text-center">
                  My Converge
                </Link>
                {isAdmin ? (
                  <Link href="/admin" onClick={() => setOpen(false)} className="border-2 border-paper px-3 py-3 text-center">
                    Admin
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="border-2 border-paper px-3 py-3"
                  >
                    Sign out
                  </button>
                )}
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="col-span-2 border-2 border-paper px-3 py-3 text-center">
                Sign in with NIFT account
              </Link>
            )}
          </div>
          <div className="mt-4" onClick={() => setOpen(false)}>
            {mobileCta}
          </div>
        </div>
      )}
    </header>
  );
}
