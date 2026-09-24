import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";

export const metadata = { title: "FAQ | NIFT Jodhpur Converge 2026" };

const FAQS: FaqItem[] = [
  {
    question: "Who can register?",
    answer:
      "Eligible NIFT Jodhpur students, as per the criteria announced by NIFT Jodhpur and the official CONVERGE 2026 rules. Watch for the announcement from your Campus SDAC for the exact window.",
  },
  {
    question: "Does registering mean I'm selected?",
    answer:
      "No. Registration only enters you into NIFT Jodhpur's internal selection process. The final team is shortlisted from it, based on the slots available per event, up to 50 participants for the whole campus.",
  },
  {
    question: "How many students will represent NIFT Jodhpur?",
    answer:
      "A maximum of 50, as fixed by the official CONVERGE 2026 rules. The Campus SDAC registers the final list.",
  },
  {
    question: "How many events do I pick?",
    answer:
      "Two Major events and one Minor event. This is NIFT Jodhpur's own selection requirement — it isn't part of the official CONVERGE rulebook.",
  },
  {
    question: "Can I change my events after registering?",
    answer: "Changes depend on the selection team's instructions and the registration timeline.",
  },
  {
    question: "Where are the official rules?",
    answer: (
      <>
        On the <Link href="/rulebook" className="font-semibold text-ink underline underline-offset-4">Rulebook page</Link>,
        with a link to the full CONVERGE 2026 Rule Book PDF.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader
        kicker={`${FAQS.length} questions`}
        title={<>Questions,<br />answered</>}
        intro="The short version of what students ask most about registration and selection."
      />
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8 lg:py-16">
        <FaqAccordion items={FAQS} />
        <p className="mt-10 text-ink-soft">
          Still unsure? Read the{" "}
          <Link href="/rulebook" className="font-semibold text-ink underline underline-offset-4">
            rulebook summary
          </Link>{" "}
          or wait for official communication from your Campus SDAC.
        </p>
      </div>
    </>
  );
}
