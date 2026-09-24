import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import RegisterCta from "@/components/RegisterCta";
import { genderSuffix } from "@/components/EventRow";
import { CATEGORY_META, EventCategory } from "@/lib/types";
import { EVENTS, getEventBySlug, getEventsByCategory } from "@/lib/events";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ category: e.category, slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const event = getEventBySlug(category, slug);
  return { title: event ? `${event.name} | NIFT Jodhpur Converge 2026` : "Event" };
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-ink pt-5">
      <h2 className="flex items-baseline gap-4">
        <span className="text-xs font-bold tabular-nums text-ink-soft">{n}</span>
        <span className="display-md text-3xl sm:text-4xl">{title}</span>
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol>
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-2 border-b border-ink/10 py-3 text-[0.95rem] leading-relaxed last:border-b-0">
          <span className="pt-0.5 text-xs font-bold tabular-nums text-ink-soft">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const event = getEventBySlug(category, slug);
  if (!event) notFound();

  const meta = CATEGORY_META[category as EventCategory];
  const siblings = getEventsByCategory(category);
  const pos = siblings.findIndex((e) => e.slug === slug);
  const prev = siblings[pos - 1];
  const next = siblings[pos + 1];
  const suffix = genderSuffix(event);

  const facts: { k: string; v?: string }[] = [
    { k: "Arena", v: meta.label },
    { k: "Format", v: event.format + (event.genderNote ? ` · ${event.genderNote}` : "") },
    { k: "Participants", v: event.participantsLabel },
    { k: "Substitutes", v: event.substitutes },
    { k: "Time", v: event.timeLimit },
    { k: "Theme", v: event.theme },
  ];

  let n = 0;
  const next2 = () => String(++n).padStart(2, "0");

  return (
    <>
      <PageHeader
        back={{ href: `/events/${category}`, label: meta.label }}
        kicker={`Event ${String(pos + 1).padStart(2, "0")} of ${siblings.length}`}
        title={
          <>
            {event.name}
            {suffix && (
              <span className="mt-2 block font-serif text-4xl normal-case italic tracking-normal sm:text-5xl">
                {suffix}
              </span>
            )}
          </>
        }
        titleClass="text-[14vw] sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem]"
        intro={event.about}
        tone={clsx(meta.bg, meta.onColor)}
      />

      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-12 sm:px-8 lg:grid-cols-12 lg:py-16">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <dl className="border-2 border-ink bg-paper">
              {facts
                .filter((f) => f.v)
                .map((f) => (
                  <div key={f.k} className="grid grid-cols-[8.5rem_1fr] border-b border-ink/15 last:border-b-0">
                    <dt className="label border-r border-ink/15 px-3 py-3 text-ink-soft">{f.k}</dt>
                    <dd className="px-3 py-3 text-sm font-semibold leading-snug">{f.v}</dd>
                  </div>
                ))}
            </dl>
            {event.nonCompetitive && (
              <p className="mt-3 border-2 border-dashed border-ink/40 p-3 text-sm text-ink-soft">
                Non-competitive — this event carries no points.
              </p>
            )}
            <div className="mt-6">
              <RegisterCta className="w-full" />
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                List this event as one of your Major or Minor picks when registration opens.
              </p>
            </div>
          </div>
        </aside>

        <div className="space-y-12 lg:col-span-8">
          <Section n={next2()} title="Who can take part">
            <NumberedList items={event.requirements} />
          </Section>

          <Section n={next2()} title="Rules">
            <NumberedList items={event.rules} />
          </Section>

          {event.whatYouNeed && event.whatYouNeed.length > 0 && (
            <Section n={next2()} title="Bring with you">
              <NumberedList items={event.whatYouNeed} />
            </Section>
          )}

          {event.important && event.important.length > 0 && (
            <div className="border-2 border-ink bg-marigold p-5">
              <p className="label">Important</p>
              <ul className="mt-2 space-y-1.5">
                {event.important.map((r, i) => (
                  <li key={i} className="font-semibold leading-relaxed">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {event.evaluationCriteria && event.evaluationCriteria.length > 0 && (
            <Section n={next2()} title="Judged on">
              <ol className="flex flex-wrap gap-2">
                {event.evaluationCriteria.map((c, i) => (
                  <li key={i} className="border-2 border-ink px-3 py-2 text-sm font-semibold">
                    <span className="mr-2 text-xs tabular-nums text-ink-soft">{i + 1}</span>
                    {c}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <p className="text-xs text-ink-soft">
            Source: official CONVERGE 2026 Rule Book. If anything here differs from the PDF, the{" "}
            <a href="/documents/converge-2026-rulebook.pdf" target="_blank" rel="noopener noreferrer" className="underline">
              rulebook
            </a>{" "}
            wins.
          </p>
        </div>
      </div>

      <nav className="grid border-t-2 border-ink sm:grid-cols-2" aria-label="More events in this arena">
        {prev ? (
          <Link href={`/events/${category}/${prev.slug}`} className="group border-b-2 border-ink p-6 hover:bg-paper-2 sm:border-b-0 sm:border-r-2 sm:p-8">
            <span className="label inline-flex items-center gap-2 text-ink-soft">
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> Previous
            </span>
            <span className="display-md mt-2 block text-3xl">
              {prev.name} {genderSuffix(prev) && <span className="font-serif text-2xl normal-case italic">{genderSuffix(prev)}</span>}
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block sm:border-r-2 sm:border-ink" />
        )}
        {next ? (
          <Link href={`/events/${category}/${next.slug}`} className="group p-6 text-right hover:bg-paper-2 sm:p-8">
            <span className="label inline-flex items-center gap-2 text-ink-soft">
              Next <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
            <span className="display-md mt-2 block text-3xl">
              {next.name} {genderSuffix(next) && <span className="font-serif text-2xl normal-case italic">{genderSuffix(next)}</span>}
            </span>
          </Link>
        ) : (
          <Link href={`/events/${category}`} className="group p-6 text-right hover:bg-paper-2 sm:p-8">
            <span className="label text-ink-soft">End of arena</span>
            <span className="display-md mt-2 block text-3xl">Back to {meta.label}</span>
          </Link>
        )}
      </nav>
    </>
  );
}
