"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck, Ticket, UserRound } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "./AuthProvider";

export function initials(name?: string | null) {
  return (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Desktop: sign-in link or avatar with dropdown. */
export default function AccountMenu() {
  const { status, user, me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (status === "loading") return <span className="h-9 w-9 animate-pulse bg-paper-2" aria-hidden />;

  if (status === "signed-out") {
    return (
      <Link href="/login" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:underline">
        <UserRound size={18} /> Sign in
      </Link>
    );
  }

  const role = me?.user.role;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden border-2 border-ink bg-marigold text-xs font-bold"
      >
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials(user?.displayName)
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 border-2 border-ink bg-paper shadow-[4px_4px_0_var(--ink)]">
          <div className="border-b border-ink/15 px-4 py-3">
            <p className="truncate text-sm font-bold">{user?.displayName}</p>
            <p className="truncate text-xs text-ink-soft">{user?.email}</p>
            {role && role !== "student" && (
              <p className="label mt-2 text-sindoor">
                {role === "main_admin" ? "Main admin" : `Club admin · ${me?.user.club}`}
              </p>
            )}
          </div>
          <MenuLink href="/me" icon={<Ticket size={16} />} onClick={() => setOpen(false)}>
            My Converge
          </MenuLink>
          {role && role !== "student" && (
            <MenuLink href="/admin" icon={<ShieldCheck size={16} />} onClick={() => setOpen(false)}>
              Admin panel
            </MenuLink>
          )}
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-paper-2"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={clsx("flex items-center gap-3 border-b border-ink/10 px-4 py-3 text-sm font-semibold hover:bg-paper-2")}>
      {icon}
      {children}
    </Link>
  );
}
