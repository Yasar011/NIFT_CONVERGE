import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RegistrationForm from "@/components/RegistrationForm";
import { REGISTRATION_OPEN } from "@/lib/registration-status";

export const metadata = { title: "Register | NIFT Jodhpur Converge 2026" };

const CHECKLIST = [
  "Your NIFT student ID",
  "Two Major events and one Minor event in mind",
  <>
    The rules for those events — see the{" "}
    <Link href="/events" className="font-semibold underline underline-offset-4">programme</Link>
  </>,
  "A mobile number and email you check",
];

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        kicker={REGISTRATION_OPEN ? "Registration open" : "Registration opening soon"}
        title={<>Register your<br />interest</>}
        intro="Tell us who you are and pick your 2 Major + 1 Minor events to enter NIFT Jodhpur's selection for CONVERGE 2026."
        tone="bg-blue text-paper"
      />

      {!REGISTRATION_OPEN && (
        <div className="border-b-2 border-ink bg-marigold">
          <p className="mx-auto max-w-[1400px] px-4 py-4 text-sm font-semibold sm:px-8">
            Registration hasn&apos;t opened yet. You can look through the form below so you know
            what you&apos;ll need — submission unlocks when NIFT Jodhpur opens registration.
          </p>
        </div>
      )}

      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-12 sm:px-8 lg:grid-cols-12 lg:py-16">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <p className="label text-ink-soft">Before you start</p>
            <ul className="mt-4 border-t-2 border-ink">
              {CHECKLIST.map((item, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] border-b border-ink/15 py-3 leading-relaxed">
                  <span className="text-xs font-bold tabular-nums text-ink-soft">0{i + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-2 border-ink bg-ink p-5 text-paper">
              <p className="label text-marigold">NIFT Jodhpur selection rule</p>
              <p className="mt-3 text-sm leading-relaxed text-paper/80">
                Registering enters you into selection — it doesn&apos;t guarantee a place in the
                final 50.{" "}
                <Link href="/selection" className="font-semibold text-paper underline underline-offset-4">
                  How selection works
                </Link>
              </p>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-8">
          <RegistrationForm />
        </div>
      </div>
    </>
  );
}
