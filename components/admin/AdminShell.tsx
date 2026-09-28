"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  QrCode,
  ShieldCheck,
  ThumbsUp,
  Trophy,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../auth/AuthProvider";
import SignInPanel from "../auth/SignInPanel";
import { Loading } from "./kit";
import { CATEGORY_META } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, main: false },
  { href: "/admin/queue", label: "Approvals", icon: CheckSquare, main: true },
  { href: "/admin/participants", label: "Participants", icon: ListChecks, main: false },
  { href: "/admin/trials", label: "Trials", icon: CalendarDays, main: false },
  { href: "/admin/judging", label: "Judging", icon: ClipboardCheck, main: false },
  { href: "/admin/teams", label: "Teams", icon: UsersRound, main: false },
  { href: "/admin/scan", label: "Scan", icon: QrCode, main: false },
  { href: "/admin/voting", label: "Voting", icon: ThumbsUp, main: false },
  { href: "/admin/announcements", label: "Notices", icon: Megaphone, main: false },
  { href: "/admin/stats", label: "Stats", icon: BarChart3, main: false },
  { href: "/admin/activity", label: "Activity", icon: Activity, main: false },
  { href: "/admin/final", label: "Final 50", icon: Trophy, main: true },
  { href: "/admin/students", label: "Students", icon: Users, main: true },
  { href: "/admin/team", label: "Admins", icon: UserCog, main: true },
  { href: "/admin/blocked", label: "Blocked", icon: ShieldCheck, main: true },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, me, error } = useAuth();
  const pathname = usePathname();

  if (status === "loading" || (status === "signed-in" && !me && !error)) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <Loading />
      </div>
    );
  }
  if (status === "signed-out" || !me) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
        <SignInPanel title="Admin sign in" text="Sign in with the NIFT account the main admin added." />
      </div>
    );
  }
  if (me.user.role === "student") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
        <p className="display text-5xl">No admin access</p>
        <p className="mt-3 text-ink-soft">
          {me.user.email} isn&apos;t an admin. Ask the main admin to add you under Admins.
        </p>
      </div>
    );
  }

  const isMain = me.user.role === "main_admin";
  const nav = NAV.filter((n) => isMain || !n.main);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[14rem_1fr] lg:py-10 print:block print:p-0">
      <aside className="print:hidden">
        <div className="lg:sticky lg:top-24">
          <div className={clsx("border-2 border-ink p-4", isMain ? "bg-ink text-paper" : clsx(CATEGORY_META[me.user.club!].bg, CATEGORY_META[me.user.club!].onColor))}>
            <p className="label opacity-80">{isMain ? "Main admin" : "Club admin"}</p>
            <p className="display-md mt-1 text-2xl">{isMain ? "All clubs" : CATEGORY_META[me.user.club!].label}</p>
          </div>
          <nav className="-mx-4 mt-4 flex overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:block lg:px-0" aria-label="Admin">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "flex shrink-0 items-center gap-3 border-b-2 px-3 py-3 text-sm font-bold uppercase tracking-wide lg:border-b lg:border-ink/15",
                  active(n.href) ? "border-ink bg-ink text-paper lg:border-ink" : "border-transparent hover:bg-paper-2"
                )}
              >
                <n.icon size={16} /> {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
