import Link from "next/link";
import { REGISTRATION_OPEN } from "@/lib/registration-status";
import clsx from "clsx";

interface RegisterCtaProps {
  className?: string;
  variant?: "solid" | "outline";
  size?: "sm" | "lg";
}

export default function RegisterCta({
  className,
  variant = "solid",
  size = "lg",
}: RegisterCtaProps) {
  const label = REGISTRATION_OPEN ? "REGISTER NOW" : "REGISTRATION OPENING SOON";
  const href = "/register";

  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide uppercase transition-all duration-300",
        size === "lg" ? "px-8 py-4 text-sm" : "px-5 py-2.5 text-xs",
        variant === "solid"
          ? "bg-gradient-to-r from-gold-light via-gold to-magenta text-ink shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-magenta/30 hover:-translate-y-0.5"
          : "border border-gold/50 text-cream hover:bg-gold/10 hover:border-gold",
        !REGISTRATION_OPEN && variant === "solid" && "opacity-90",
        className
      )}
    >
      {label}
    </Link>
  );
}
