import Link from "next/link";
import { CalendarDays, MapPin, Megaphone } from "lucide-react";
import clsx from "clsx";
import { getBoard } from "@/lib/server/board";
import { getDeadlines } from "@/lib/server/deadlines";
import { getEventByKey, eventLabel } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";

const fmtDate = (d: string) =>
  new Date(`${d}T00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/** Home-page notice board: upcoming trials + notices for everyone. */
export default async function NoticeBoard() {
  const [{ notices, trials }, deadlines] = await Promise.all([getBoard(), getDeadlines()]);
  if (!notices.length && !trials.length) return null;

  return (
    <section className="border-b-2 border-ink bg-paper-2">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:py-16">
        <div>
          <h2 className="display-md flex items-center gap-3 border-b-2 border-ink pb-3 text-4xl">
            <CalendarDays size={28} /> Upcoming trials
          </h2>
          {trials.length ? (
            <ul>
              {trials.map((t) => {
                const ev = getEventByKey(t.eventKey);
                const meta = CATEGORY_META[t.category];
                return (
                  <li key={t.id} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-ink/15 py-4">
                    <span className="border-2 border-ink bg-paper text-center">
                      <span className={clsx("label block py-0.5 text-[0.6rem]", meta.bg, meta.onColor)}>
                        {new Date(`${t.date}T00:00`).toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                      <span className="display block py-1 text-3xl">{Number(t.date.slice(8, 10))}</span>
                    </span>
                    <span>
                      <span className="label text-ink-soft">{ev ? eventLabel(ev) : t.eventKey}</span>
                      <span className="mt-0.5 block text-lg font-bold">{t.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-ink-soft">
                        <span>{fmtDate(t.date)} · {fmtTime(t.time)}</span>
                        <span className="inline-flex items-center gap-1"><MapPin size={13} /> {t.venue}</span>
                      </span>
                      {deadlines[t.eventKey]?.id === t.id && (
                        <span className="mt-1.5 inline-block bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-paper">
                          Last chance to register — closes at this trial
                        </span>
                      )}
                      {t.notes && <span className="mt-1 block text-sm">{t.notes}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-ink-soft">No trials scheduled yet.</p>
          )}
        </div>

        <div>
          <h2 className="display-md flex items-center gap-3 border-b-2 border-ink pb-3 text-4xl">
            <Megaphone size={28} /> Notices
          </h2>
          {notices.length ? (
            <ul>
              {notices.map((n) => (
                <li key={n.id} className="border-b border-ink/15 py-4">
                  <span className="label text-ink-soft">
                    {new Date(n.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <span className="mt-0.5 block text-lg font-bold">{n.title}</span>
                  <span className="mt-1 block whitespace-pre-line leading-relaxed text-ink-soft">{n.body}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-ink-soft">No notices right now.</p>
          )}
          <p className="mt-4 text-sm text-ink-soft">
            Notices for your own events are on{" "}
            <Link href="/me" className="font-semibold text-ink underline underline-offset-4">My Converge</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
