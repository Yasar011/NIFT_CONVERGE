const STEPS = [
  { n: "01", title: "Registration", desc: "Submit your interest with your details and your 2 Major + 1 Minor event picks." },
  { n: "02", title: "Event Screening", desc: "Respective club coordinators review interest against event capacity and eligibility." },
  { n: "03", title: "Selection / Trials", desc: "Shortlisted students may be called for trials, auditions, or interviews per event." },
  { n: "04", title: "Shortlist", desc: "A provisional shortlist is released for each event category." },
  { n: "05", title: "Final 50", desc: "The final NIFT Jodhpur contingent of up to 50 participants is confirmed by the Campus SDAC." },
  { n: "06", title: "CONVERGE 2026", desc: "The final contingent travels and competes as Team NIFT Jodhpur." },
];

export default function SelectionJourney() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {STEPS.map((step, i) => (
        <div key={step.n} className="relative flex flex-col">
          <div className="card-border relative flex h-full flex-col rounded-2xl bg-indigo/40 p-5">
            <span className="font-display text-2xl font-bold text-gold-light">{step.n}</span>
            <p className="mt-2 font-display text-base font-semibold text-cream">{step.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-cream-dim">{step.desc}</p>
          </div>
          {i < STEPS.length - 1 && (
            <div className="mt-2 flex justify-center lg:absolute lg:-right-3 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
              <span className="text-gold/60 lg:rotate-[-90deg]">↓</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
