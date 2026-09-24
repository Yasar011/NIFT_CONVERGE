import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";

export const metadata = { title: "FAQ | NIFT Jodhpur Converge 2026" };

const FAQS: FaqItem[] = [
  {
    question: "Who can register?",
    answer:
      "Registration on this portal is open to eligible NIFT Jodhpur students as per the eligibility criteria announced by NIFT Jodhpur and the official CONVERGE 2026 rules. Watch for the official announcement from your Campus SDAC for the exact eligibility window.",
  },
  {
    question: "Does registration guarantee selection?",
    answer:
      "No. Registration only enters you into the NIFT Jodhpur internal selection process. The final team is shortlisted based on this process and the number of slots available per event, up to a maximum of 50 participants for the whole campus.",
  },
  {
    question: "How many students will represent NIFT Jodhpur?",
    answer:
      "A maximum of 50 participants, as per the official CONVERGE 2026 rules. Registration of the final list is handled by the Campus SDAC.",
  },
  {
    question: "How many events do I need to select?",
    answer:
      "2 Major Events + 1 Minor Event, for the NIFT Jodhpur internal selection process. This combination is required by NIFT Jodhpur's own selection framework, not by the official CONVERGE rulebook.",
  },
  {
    question: "Can I change my event after registering?",
    answer:
      "Event changes will be subject to the selection team's instructions and the registration timeline.",
  },
  {
    question: "Where can I read the official rules?",
    answer: "The full official CONVERGE 2026 Rule Book is available on the Rulebook page.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <SectionHeading
        eyebrow="Still have questions?"
        title="Frequently Asked Questions"
      />
      <div className="mt-10">
        <FaqAccordion items={FAQS} />
      </div>

      <p className="mt-10 text-center text-sm text-cream-dim">
        Can&apos;t find your answer? Read the{" "}
        <Link href="/rulebook" className="text-gold-light hover:underline">
          full rulebook
        </Link>{" "}
        or wait for official communication from your Campus SDAC.
      </p>
    </div>
  );
}
