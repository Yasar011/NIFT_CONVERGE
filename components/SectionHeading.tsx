import clsx from "clsx";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <div className={clsx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-gold-light">
          {eyebrow}
        </p>
      )}
      <h2
        className={clsx(
          "font-display text-3xl font-semibold sm:text-4xl",
          light ? "text-ink" : "text-cream"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={clsx("mt-4 text-base leading-relaxed", light ? "text-ink/70" : "text-cream-dim")}>
          {description}
        </p>
      )}
    </div>
  );
}
