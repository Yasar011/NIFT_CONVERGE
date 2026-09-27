import clsx from "clsx";
import { STATUS_LABEL, type EntryStatus } from "@/lib/registration-schema";

const TONE: Record<EntryStatus, string> = {
  registered: "border-ink/40 text-ink-soft",
  shortlisted: "border-blue bg-blue text-paper",
  selected: "border-peacock bg-peacock text-paper",
  not_selected: "border-ink/30 bg-paper-2 text-ink-soft",
  locked: "border-dashed border-ink/40 text-ink-soft",
};

export default function StatusBadge({ status, short = false }: { status: EntryStatus; short?: boolean }) {
  return (
    <span className={clsx("label inline-flex items-center whitespace-nowrap border-2 px-2 py-0.5 text-[0.65rem]", TONE[status])}>
      {short && status === "locked" ? "Locked" : STATUS_LABEL[status]}
    </span>
  );
}
