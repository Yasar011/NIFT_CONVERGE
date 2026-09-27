import { unstable_cache } from "next/cache";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import { db } from "@/lib/server/rtdb";
import { CATEGORY_META } from "@/lib/types";
import type { PublishedResult } from "@/lib/api-types";

export const metadata = { title: "Voting results | NIFT Jodhpur Converge 2026" };

const getResults = unstable_cache(
  async () => {
    try {
      const all = await db.get<Record<string, PublishedResult>>("results");
      return Object.values(all ?? {}).sort((a, b) => b.publishedAt - a.publishedAt);
    } catch {
      return [];
    }
  },
  ["published-results"],
  { tags: ["results"], revalidate: 300 }
);

export default async function ResultsPage() {
  const results = await getResults();
  return (
    <>
      <PageHeader
        kicker={`${results.length} published`}
        title={<>Voting<br />results</>}
        intro="Rankings from public voting rounds, published by club admins after each round ends. Only Good votes are shown."
      />
      <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-12 sm:px-8 lg:py-16">
        {!results.length && (
          <div className="border-2 border-dashed border-ink/40 p-10 text-center">
            <p className="display text-4xl">No results yet</p>
            <p className="mt-3 text-ink-soft">Results appear here once a club publishes them.</p>
          </div>
        )}
        {results.map((r) => {
          const meta = CATEGORY_META[r.category];
          return (
            <section key={r.sessionId}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
                <div>
                  <p className="label flex items-center gap-2 text-ink-soft">
                    <span className={clsx("h-2 w-2", meta?.bg)} aria-hidden />
                    {meta?.label} · {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <h2 className="display mt-2 text-4xl sm:text-5xl">{r.title}</h2>
                </div>
                <p className="label text-ink-soft">{r.rows.length} performers</p>
              </div>
              <ol>
                {r.rows.map((row, i) => (
                  <li
                    key={i}
                    className={clsx(
                      "grid grid-cols-[3rem_3.5rem_1fr_auto] items-center gap-4 border-b border-ink/15 py-3",
                      row.rank === 1 && "bg-marigold/25"
                    )}
                  >
                    <span className="display pl-2 text-3xl tabular-nums">{row.rank}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.photoUrl} alt="" className="h-14 w-14 border-2 border-ink object-cover" />
                    <span>
                      <span className="display-md block text-2xl">{row.name}</span>
                      <span className="text-xs text-ink-soft">{row.department}</span>
                    </span>
                    <span className="pr-2 text-right">
                      <span className="display block text-3xl tabular-nums">{row.good}</span>
                      <span className="label text-[0.6rem] text-ink-soft">Good votes</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </>
  );
}
