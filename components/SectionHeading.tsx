import clsx from "clsx";

export default function SectionHeading({
  index,
  kicker,
  title,
  intro,
  className,
  invert = false,
}: {
  index?: string;
  kicker?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
  invert?: boolean;
}) {
  return (
    <div className={clsx("grid gap-6 lg:grid-cols-12", className)}>
      <div className="lg:col-span-7">
        {(index || kicker) && (
          <p className={clsx("label mb-4 flex items-center gap-3", invert ? "text-paper/70" : "text-ink-soft")}>
            {index && <span className={invert ? "text-paper" : "text-ink"}>{index}</span>}
            {index && kicker && <span className={clsx("h-px w-8", invert ? "bg-paper/50" : "bg-ink/40")} />}
            {kicker}
          </p>
        )}
        <h2 className="display text-[3.2rem] sm:text-7xl lg:text-[5.5rem]">{title}</h2>
      </div>
      {intro && (
        <p
          className={clsx(
            "max-w-md self-end text-base leading-relaxed lg:col-span-5 lg:justify-self-end",
            invert ? "text-paper/80" : "text-ink-soft"
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
