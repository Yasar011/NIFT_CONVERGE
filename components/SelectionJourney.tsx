import clsx from "clsx";

const STEPS = [
  { title: "Register", desc: "Submit your details and your 2 Major + 1 Minor event picks." },
  { title: "Screening", desc: "Club coordinators review interest against event slots and eligibility." },
  { title: "Trials", desc: "Shortlisted students may be called for trials, auditions or interviews." },
  { title: "Shortlist", desc: "A provisional shortlist is released for each event." },
  { title: "Final 50", desc: "The Campus SDAC confirms the contingent of up to 50 students." },
  { title: "Converge", desc: "The contingent travels and competes as Team NIFT Jodhpur." },
];

export default function SelectionJourney({ invert = false }: { invert?: boolean }) {
  return (
    <ol className="grid border-t-2 sm:grid-cols-2 lg:grid-cols-6" style={{ borderColor: "currentColor" }}>
      {STEPS.map((step, i) => (
        <li
          key={step.title}
          className={clsx(
            "relative border-b py-6 pr-5 lg:border-b-0 lg:border-r lg:pl-5 lg:first:pl-0 lg:last:border-r-0",
            invert ? "border-paper/25" : "border-ink/15"
          )}
        >
          <span
            className={clsx(
              "absolute -top-[9px] left-0 h-4 w-4 border-2",
              i > 0 && "lg:left-5",
              i === STEPS.length - 1 ? "bg-marigold" : invert ? "bg-blue" : "bg-paper",
              invert ? "border-paper" : "border-ink"
            )}
            aria-hidden
          />
          <p className={clsx("label", invert ? "text-paper/60" : "text-ink-soft")}>
            Step {String(i + 1).padStart(2, "0")}
          </p>
          <p className="display-md mt-2 text-3xl">{step.title}</p>
          <p className={clsx("mt-2 text-sm leading-relaxed", invert ? "text-paper/80" : "text-ink-soft")}>
            {step.desc}
          </p>
        </li>
      ))}
    </ol>
  );
}
