import clsx from "clsx";

// Stamp that marks where a rule comes from, so NIFT Jodhpur's own
// process is never confused with the official CONVERGE rulebook.
export default function RuleTag({
  type,
  className,
}: {
  type: "official" | "jodhpur";
  className?: string;
}) {
  const official = type === "official";
  return (
    <span
      className={clsx(
        "label inline-flex items-center gap-2 border-2 px-2.5 py-1",
        official ? "border-blue text-blue" : "border-sindoor text-sindoor",
        className
      )}
    >
      <span className={clsx("h-2 w-2", official ? "bg-blue" : "bg-sindoor")} aria-hidden />
      {official ? "Official Converge rule" : "NIFT Jodhpur selection rule"}
    </span>
  );
}
