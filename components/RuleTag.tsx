import clsx from "clsx";

export default function RuleTag({ type }: { type: "official" | "jodhpur" }) {
  const isOfficial = type === "official";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
        isOfficial
          ? "border-teal/50 bg-teal/10 text-teal"
          : "border-magenta/50 bg-magenta/10 text-magenta-light"
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", isOfficial ? "bg-teal" : "bg-magenta")} />
      {isOfficial ? "Official Converge Rule" : "NIFT Jodhpur Selection Process"}
    </span>
  );
}
