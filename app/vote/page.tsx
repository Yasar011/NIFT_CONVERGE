import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import LiveVoting from "./LiveVoting";

export const metadata = { title: "Live voting | NIFT Jodhpur Converge 2026" };

export default function VotePage() {
  return (
    <>
      <PageHeader
        kicker="Live during selection rounds"
        title={<>Live<br />voting</>}
        intro={
          <>
            When a club runs public voting, open its link — no sign-in needed. Vote Good or Reject, once
            per performer. Only organisers see the counts.{" "}
            <Link href="/results" className="font-bold underline underline-offset-4">
              See published results
            </Link>
          </>
        }
        tone="bg-rani text-paper"
      />
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8 lg:py-16">
        <LiveVoting />
      </div>
    </>
  );
}
