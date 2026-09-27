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
      "2 Major and 1 Minor event are required, and you can add up to 2 extras — 5 at most. This is NIFT Jodhpur's own requirement, not part of the official CONVERGE rulebook.",
  },
  {
    question: "Can I be selected for all five?",
    answer:
      "No. You can be selected for at most 3 events. As soon as your third selection is confirmed, your other events are locked.",
  },
  {
    question: "How do I sign in?",
    answer:
      "With your @nift.ac.in Google account — the same one you use for NIFT email. Other Google accounts can't sign in.",
  },
  {
    question: "What is the QR pass for?",
    answer:
      "After registering you get a personal QR code on My Converge. Club admins scan it at screenings and trials to mark you present, and to put you live when there's public voting.",
  },
  {
    question: "How does public voting work?",
    answer:
      "For some events a club runs public voting. The performer on stage appears on the Vote page and any NIFT student can vote Good or Reject — once per performer. Only admins see the counts; published results show the ranking and Good votes only.",
  },
  {
    question: "Can I change my events after registering?",
    answer: "Not yourself — once submitted, your events are fixed. Contact the main admin if you need a change; events you've already been selected for can't be removed.",
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
