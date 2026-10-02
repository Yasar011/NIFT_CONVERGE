import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RegistrationForm from "@/components/RegistrationForm";
import { getSettings } from "@/lib/server/settings";
import { isRegistrationOpen } from "@/lib/settings-shared";
import { getDeadlines, fmtDeadline } from "@/lib/server/deadlines";

export const metadata = { title: "Register | NIFT Jodhpur Converge 2026" };

const CHECKLIST = [
  "Your @nift.ac.in Google account",
  "Your NIFT student ID and a clear photo of your face",
  "3 to 5 events in mind (Events 1–3 required, 4–5 optional)",
  <>
    The rules for those events — see the{" "}
    <Link href="/events" className="font-semibold underline underline-offset-4">programme</Link>
  </>,
  "A mobile number you answer",
];

export default async function RegisterPage() {
  const registrationOpen = isRegistrationOpen(await getSettings());
  const raw = await getDeadlines();
  const deadlines = Object.fromEntries(Object.entries(raw).map(([k, d]) => [k, { at: d.at, label: fmtDeadline(d) }]));
  return (
    <>
      <PageHeader
        kicker={registrationOpen ? "Registration open" : "Registration opening soon"}
        title={<>Register your<br />interest</>}
        intro="Sign in with your NIFT account, add your details, and pick 3 to 5 events to enter NIFT Jodhpur's selection."
        tone="bg-blue text-paper"
      />

      {!registrationOpen && (
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
                final 50. You can be selected for at most 3 events.{" "}
                <Link href="/selection" className="font-semibold text-paper underline underline-offset-4">
                  How selection works
                </Link>
              </p>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-8">
          <RegistrationForm registrationOpen={registrationOpen} deadlines={deadlines} />
        </div>
      </div>
    </>
  );
}
