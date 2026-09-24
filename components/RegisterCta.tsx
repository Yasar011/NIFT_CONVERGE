import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { REGISTRATION_OPEN } from "@/lib/registration-status";

interface RegisterCtaProps {
  className?: string;
  tone?: "blue" | "ink" | "paper";
  size?: "sm" | "lg";
}

export default function RegisterCta({ className, tone = "blue", size = "lg" }: RegisterCtaProps) {
  const label = REGISTRATION_OPEN ? "Register now" : "Registration opening soon";

  return (
    <Link
      href="/register"
      className={clsx(
        "btn-print inline-flex items-center justify-center gap-3 whitespace-nowrap border-2 border-ink font-bold uppercase tracking-wide",
        size === "lg" ? "px-6 py-4 text-sm" : "px-4 py-2.5 text-xs",
        tone === "blue" && "bg-blue text-paper",
        tone === "ink" && "bg-ink text-paper",
        tone === "paper" && "bg-paper text-ink",
        className
      )}
    >
      {!REGISTRATION_OPEN && (
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping bg-marigold opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 bg-marigold" />
        </span>
      )}
      {label}
      <ArrowRight size={size === "lg" ? 18 : 14} strokeWidth={2.5} />
    </Link>
  );
}
