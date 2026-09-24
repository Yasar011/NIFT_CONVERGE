import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";

export default function PageHeader({
  kicker,
  title,
  intro,
  back,
  tone = "paper",
  titleClass = "text-[17vw] sm:text-8xl lg:text-[8.5rem]",
  children,
}: {
  titleClass?: string;
  kicker: React.ReactNode;
  title: React.ReactNode;
  intro?: React.ReactNode;
  back?: { href: string; label: string };
  /** Background block: paper, or a Tailwind bg + text pair e.g. "bg-blue text-paper". */
  tone?: string;
  children?: React.ReactNode;
}) {
  const onPaper = tone === "paper";
  return (
    <header className={clsx("border-b-2 border-ink", onPaper ? "bg-paper" : tone)}>
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-8 lg:pb-14 lg:pt-8">
        <div
          className={clsx(
            "label flex items-center justify-between gap-4 border-b pb-3",
            onPaper ? "border-ink/20 text-ink-soft" : "border-current/25 opacity-80"
          )}
        >
          {back ? (
            <Link href={back.href} className="inline-flex items-center gap-1 hover:underline">
              <ChevronLeft size={14} strokeWidth={3} /> {back.label}
            </Link>
          ) : (
            <span>NIFT Jodhpur · Converge 2026</span>
          )}
          <span className="text-right">{kicker}</span>
        </div>

        <div className="grid gap-8 pt-8 lg:grid-cols-12 lg:items-end lg:pt-12">
          <h1 className={clsx("display lg:col-span-8", titleClass)}>{title}</h1>
          {intro && (
            <p className={clsx("max-w-md text-lg leading-relaxed lg:col-span-4 lg:pb-2", onPaper ? "text-ink-soft" : "opacity-85")}>
              {intro}
            </p>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}
