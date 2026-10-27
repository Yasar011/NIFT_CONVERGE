import clsx from "clsx";

const isBoy = (g: string) => g === "Male";
const isGirl = (g: string) => g === "Female";

/** "3 boys · 2 girls" (plus anyone who didn't say). */
export function genderSplit(people: { gender: string }[]) {
  const boys = people.filter((p) => isBoy(p.gender)).length;
  const girls = people.filter((p) => isGirl(p.gender)).length;
  const other = people.length - boys - girls;
  return [`${boys} ${boys === 1 ? "boy" : "boys"}`, `${girls} ${girls === 1 ? "girl" : "girls"}`, other ? `${other} other` : ""].filter(Boolean).join(" · ");
}

/** Boys / girls in the contingent, and how many events each student is final in. */
export function Breakdown({ students }: { students: { gender: string; events: string[] }[] }) {
  const boys = students.filter((s) => isBoy(s.gender)).length;
  const girls = students.filter((s) => isGirl(s.gender)).length;
  const other = students.length - boys - girls;
  const picks = students.reduce((n, s) => n + s.events.length, 0);
  const byCount = (n: number, more = false) => students.filter((s) => (more ? s.events.length >= n : s.events.length === n)).length;
  const tiles = [
    { label: "Boys", value: boys },
    { label: "Girls", value: girls },
    ...(other ? [{ label: "Other / not said", value: other }] : []),
    { label: "Event spots filled", value: picks },
  ];
  const counts = [
    { label: "1 event", value: byCount(1) },
    { label: "2 events", value: byCount(2) },
    { label: "3 events", value: byCount(3) },
    { label: "4+ events", value: byCount(4, true), warn: true },
  ];
  return (
    <div className="grid gap-px border-2 border-ink bg-ink sm:grid-cols-2">
      <div className="grid grid-cols-2 gap-px bg-ink md:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">
        {tiles.map((t) => (
          <div key={t.label} className="bg-paper p-4">
            <p className="label text-ink-soft">{t.label}</p>
            <p className="display text-4xl tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-paper p-4">
        <p className="label text-ink-soft">Students final in</p>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
          {counts.map((c) => (
            <li key={c.label} className={clsx("tabular-nums", c.warn && c.value > 0 && "font-bold text-sindoor")}>
              <span className="display text-2xl">{c.value}</span> <span className="text-ink-soft">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** "Final in 3 events" — red past the usual limit. */
export function FinalInBadge({ events }: { events: string[] }) {
  const n = events.length;
  return (
    <span
      title={events.join(", ")}
      className={clsx(
        "label shrink-0 border px-1.5 py-0.5 text-[0.6rem] tabular-nums",
        n > 3 ? "border-sindoor bg-sindoor text-paper" : n === 3 ? "border-ink bg-ink text-paper" : "border-ink"
      )}
    >
      Final in {n} {n === 1 ? "event" : "events"}
    </span>
  );
}
