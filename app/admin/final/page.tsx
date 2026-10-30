"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRightLeft, Download, FileSignature, Lock, Plus, Printer, RotateCcw, Search, Shirt, X } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi, useDownload } from "@/components/admin/kit";
import { FinalPasswordProvider, useFinalPassword } from "@/components/admin/FinalPassword";
import { CATEGORY_META, type EventCategory } from "@/lib/types";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey } from "@/lib/events";
import { cldTransform } from "@/lib/registration-schema";
import { KIT_ITEMS, kitComplete, type KitSizes } from "@/lib/kit";
import KitCard from "@/components/KitCard";
import { fmtSignedAt } from "@/lib/declaration";
import { Breakdown, FinalInBadge, genderSplit } from "@/components/admin/FinalStats";

interface Person {
  id: string;
  uid: string;
  /** Every event this student registered for. */
  registered: string[];
  name: string;
  studentId: string;
  department: string;
  semester: string;
  gender: string;
  photoUrl: string;
  teamRole: "main" | "sub" | null;
}
interface FinalList {
  frozen: boolean;
  campusCap: number;
  studentCount: number;
  events: { key: string; category: EventCategory; name: string; capacity: number; people: Person[] }[];
  students: { uid: string; name: string; studentId: string; department: string; semester: string; gender: string; photoUrl: string; events: string[]; kit: KitSizes | null; declaredAt: number | null }[];
}

export default function FinalPage() {
  return (
    <FinalPasswordProvider>
      <FinalInner />
    </FinalPasswordProvider>
  );
}

function useFinalAction(onDone: () => void) {
  const { api } = useAuth();
  const { ask, forget } = useFinalPassword();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(key: string, body: Record<string, unknown>, confirmText: string, done: string) {
    if (!confirm(confirmText)) return false;
    const finalPassword = await ask();
    if (!finalPassword) return false;
    setBusy(key);
    setMsg(null);
    try {
      try {
        await api("/api/admin/final", { body: { ...body, finalPassword } });
      } catch (e) {
        // Past the 3-event limit: the main admin can allow it knowingly.
        if (!(e instanceof ApiError && e.details?.limit === "selections" && confirm(`This student is already final in ${e.details.count} events — the usual limit is 3.

Select them for one more event anyway?`))) throw e;
        await api("/api/admin/final", { body: { ...body, finalPassword, allowExtra: true } });
      }
      setMsg({ ok: true, text: done });
      onDone();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) forget();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't do that." });
      return false;
    } finally {
      setBusy(null);
    }
  }
  return { run, busy, msg };
}

function FinalInner() {
  const { data, error, loading, reload } = useApi<FinalList>("/api/admin/final");
  const download = useDownload();
  const action = useFinalAction(reload);
  const [adding, setAdding] = useState(false);
  // uid → the event names they're final in, to show "Final in N events" on every row.
  const finalIn = useMemo(() => new Map((data?.students ?? []).map((s) => [s.uid, s.events])), [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-8">
      <PageTitle kicker={data.frozen ? "Frozen" : "Live list — not frozen yet"} title="Final 50">
        {!data.frozen && (
          <Btn tone="ink" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className="print:hidden">
            <Plus size={14} /> Add to final list
          </Btn>
        )}
        <Btn onClick={() => download("/api/admin/final?format=csv-event", "converge26-final-by-event.csv")} className="print:hidden">
          <Download size={14} /> By event (CSV)
        </Btn>
        <Btn onClick={() => download("/api/admin/final?format=csv-student", "converge26-final-by-student.csv")} className="print:hidden">
          <Download size={14} /> By student (CSV)
        </Btn>
        <Btn onClick={() => download("/api/admin/final?format=csv-kit", "converge26-kit-sizes.csv")} className="print:hidden">
          <Shirt size={14} /> Kit sizes (CSV)
        </Btn>
        <Btn onClick={() => window.print()} className="print:hidden">
          <Printer size={14} /> Print
        </Btn>
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
        <p className="display text-8xl tabular-nums">
          {data.studentCount}
          <span className="text-5xl text-ink-soft">/{data.campusCap}</span>
        </p>
        <p className="max-w-lg text-ink-soft">
          Students with at least one final selection. Each student is usually final in up to 3 events.{" "}
          {data.frozen ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ink"><Lock size={14} /> Selections are frozen — unfreeze from Overview to change.</span>
          ) : (
            <>Freeze selections from <Link href="/admin" className="font-semibold text-ink underline">Overview</Link> once it&apos;s submitted.</>
          )}
        </p>
      </div>

      {data.students.length > 0 && <Breakdown students={data.students} />}

      {action.msg && (
        <p className={clsx("border-2 p-3 text-sm font-semibold print:hidden", action.msg.ok ? "border-peacock text-peacock" : "border-sindoor bg-sindoor/10 text-sindoor")}>
          {action.msg.text}
        </p>
      )}

      {adding && !data.frozen && <AddToFinal run={action.run} busy={action.busy} onClose={() => setAdding(false)} />}

      {!data.events.length && <p className="py-10 text-center text-ink-soft">No one has been selected yet.</p>}

      {data.events.map((g) => {
        const meta = CATEGORY_META[g.category];
        return (
          <section key={g.key} className="break-inside-avoid">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 className="display-md flex items-center gap-3 text-2xl">
                <span className={clsx("h-3 w-3", meta.bg)} aria-hidden /> {g.name}
              </h2>
              <p className="text-sm tabular-nums text-ink-soft">
                {genderSplit(g.people)} · {g.people.length}/{g.capacity} seats
              </p>
            </div>
            <ul>
              {g.people.map((p) => (
                <PersonRow key={p.id} person={p} finalIn={finalIn.get(p.uid) ?? [g.name]} eventKeyFrom={g.key} eventName={g.name} frozen={data.frozen} run={action.run} busy={action.busy} />
              ))}
            </ul>
          </section>
        );
      })}

      {data.students.length > 0 && (
        <StudentList students={data.students} onChanged={reload} />
      )}

      {data.students.length > 0 && <KitSizesSection students={data.students} onChanged={reload} />}
    </div>
  );
}

/** Jersey kit sizes for the final contingent: totals for the order + who's missing. */
/** Every student once, with all their final events on one line. */
function StudentList({ students, onChanged }: { students: FinalList["students"]; onChanged: () => void }) {
  const { api } = useAuth();
  const download = useDownload();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const signed = students.filter((s) => s.declaredAt).length;

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy(null);
    }
  }
  const pdfName = (s: FinalList["students"][number]) => `declaration-${s.studentId.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
        <h2 className="display-md text-2xl">All students · {students.length}</h2>
        <span className="flex flex-wrap gap-2 print:hidden">
          <Btn onClick={() => act("csv", () => download("/api/admin/final?format=csv-list", "converge26-final-students.csv"))} busy={busy === "csv"}>
            <Download size={14} /> Students list (CSV)
          </Btn>
          <Btn
            tone="ink"
            disabled={!signed}
            busy={busy === "all"}
            onClick={() => act("all", () => download("/api/admin/declarations", "converge26-declarations.pdf"))}
          >
            <FileSignature size={14} /> All declarations (PDF)
          </Btn>
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        <strong className="text-ink">{signed}/{students.length}</strong> declarations signed. Students sign on My Converge before their kit opens.
      </p>
      {err && <p className="mt-2 border-2 border-sindoor bg-sindoor/10 p-2 text-sm font-semibold text-sindoor">{err}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[48rem] border-2 border-ink text-sm">
          <thead className="bg-paper-2 text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Student ID</th>
              <th className="px-3 py-2">Dept</th>
              <th className="px-3 py-2">Events</th>
              <th className="px-3 py-2 text-right">No.</th>
              <th className="px-3 py-2">Declaration</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.uid} className="border-t border-ink/15 align-top">
                <td className="px-3 py-2 tabular-nums text-ink-soft">{i + 1}</td>
                <td className="px-3 py-2 font-bold">{s.name}</td>
                <td className="px-3 py-2 tabular-nums">{s.studentId}</td>
                <td className="px-3 py-2">{s.department}</td>
                <td className="px-3 py-2">{s.events.join(", ")}</td>
                <td className={clsx("px-3 py-2 text-right font-bold tabular-nums", s.events.length > 3 && "text-sindoor")}>{s.events.length}</td>
                <td className="px-3 py-2">
                  {s.declaredAt ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-peacock">
                        <strong>Signed</strong> {fmtSignedAt(s.declaredAt)}
                      </span>
                      <button
                        type="button"
                        disabled={busy === `pdf-${s.uid}`}
                        onClick={() => act(`pdf-${s.uid}`, () => download(`/api/admin/declarations?uid=${encodeURIComponent(s.uid)}`, pdfName(s)))}
                        className="inline-flex cursor-pointer items-center gap-1 border border-ink px-1.5 py-0.5 text-[11px] font-bold uppercase disabled:opacity-50 print:hidden"
                      >
                        <Download size={12} /> PDF
                      </button>
                      <button
                        type="button"
                        disabled={busy === `rs-${s.uid}`}
                        title="Make them sign again"
                        aria-label={`Reset ${s.name}'s declaration`}
                        onClick={() =>
                          confirm(`Reset ${s.name}'s declaration?

Their signature is deleted and they must sign again before using the kit section.`) &&
                          act(`rs-${s.uid}`, async () => {
                            await api(`/api/admin/declarations?uid=${encodeURIComponent(s.uid)}`, { method: "DELETE" });
                            onChanged();
                          })
                        }
                        className="cursor-pointer p-0.5 text-ink-soft hover:text-sindoor disabled:opacity-50 print:hidden"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-sindoor">Not signed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KitSizesSection({ students, onChanged }: { students: FinalList["students"]; onChanged: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const missing = students.filter((s) => !kitComplete(s.kit));
  return (
    <section className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
        <h2 className="display-md flex items-center gap-3 text-2xl"><Shirt size={22} /> Kit sizes</h2>
        <p className="text-sm tabular-nums text-ink-soft">{students.length - missing.length}/{students.length} filled in</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-2 border-ink text-sm tabular-nums">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              {["XS", "S", "M", "L", "XL", "XXL / 2XL"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
              <th className="px-3 py-2 text-left">Not given</th>
            </tr>
          </thead>
          <tbody>
            {KIT_ITEMS.map((item) => {
              const n = (size: string) => students.filter((s) => s.kit?.[item.key] === size).length;
              const cols = ["XS", "S", "M", "L", "XL", item.key === "trackpant" ? "2XL" : "XXL"];
              return (
                <tr key={item.key} className="border-t border-ink/15">
                  <td className="px-3 py-2 font-bold">{item.name}</td>
                  {cols.map((c) => <td key={c} className="px-3 py-2">{item.sizes.includes(c) ? n(c) || "·" : "—"}</td>)}
                  <td className="px-3 py-2 text-sindoor">{students.filter((s) => !s.kit?.[item.key]).length || "·"}</td>
                </tr>
              );
            })}
            <tr className="border-t border-ink/15">
              <td className="px-3 py-2 font-bold">Cap</td>
              <td className="px-3 py-2" colSpan={7}>One size × {students.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="mt-4">
        {students.map((s) => (
          <li key={s.uid} className="border-b border-ink/10 py-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="font-bold">{s.name}</span> <span className="text-xs text-ink-soft">{s.studentId}</span>
              </span>
              <span className={clsx("text-sm", !kitComplete(s.kit) && "font-semibold text-sindoor")}>
                {kitComplete(s.kit) ? KIT_ITEMS.map((k) => `${k.name.split(" ")[0]} ${s.kit![k.key]}`).join(" · ") : "Sizes not given yet"}
              </span>
              <Btn onClick={() => setEditing(editing === s.uid ? null : s.uid)} aria-expanded={editing === s.uid} className="print:hidden">
                {kitComplete(s.kit) ? "Edit" : "Add sizes"}
              </Btn>
            </div>
            {editing === s.uid && (
              <div className="mt-2 print:hidden">
                <KitCard kit={s.kit} forUid={s.uid} onSaved={() => { setEditing(null); onChanged(); }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type Run = ReturnType<typeof useFinalAction>["run"];

function PersonRow({ person: p, finalIn, eventKeyFrom, eventName, frozen, run, busy }: { person: Person; finalIn: string[]; eventKeyFrom: string; eventName: string; frozen: boolean; run: Run; busy: string | null }) {
  const [moving, setMoving] = useState(false);
  const [to, setTo] = useState("");
  // Only the student's own registered events (other than this one).
  const options = PICKABLE_EVENTS.filter((e) => eventKey(e) !== eventKeyFrom && p.registered.includes(eventKey(e)));

  return (
    <li className="border-b border-ink/10 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldTransform(p.photoUrl, "c_fill,g_face,w_80,h_80,q_auto,f_auto")} alt="" className="h-10 w-10 shrink-0 border border-ink object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{p.name}</span>
          <span className="block text-xs text-ink-soft">{p.studentId} · {p.department} · Sem {p.semester} · {p.gender}</span>
          {finalIn.length > 1 && (
            <span className="block text-xs text-ink-soft">
              Also final in: <span className="font-semibold text-ink">{finalIn.filter((e) => e !== eventName).join(", ")}</span>
            </span>
          )}
        </span>
        <FinalInBadge events={finalIn} />
        {p.teamRole && <span className="label border border-ink px-1.5 py-0.5 text-[0.6rem]">{p.teamRole === "main" ? "Main" : "Sub"}</span>}
        {!frozen && (
          <span className="flex gap-2 print:hidden">
            <Btn onClick={() => setMoving((v) => !v)} aria-expanded={moving} title="Move to another event">
              <ArrowRightLeft size={14} /> Move
            </Btn>
            <Btn
              tone="sindoor"
              busy={busy === `rm-${p.id}`}
              onClick={() =>
                run(`rm-${p.id}`, { action: "remove", entryId: p.id }, `Remove ${p.name} from the final list for ${eventName}?\n\nThey go back to Shortlisted.`, `${p.name} removed from ${eventName}.`)
              }
              aria-label={`Remove ${p.name} from ${eventName}`}
            >
              <X size={14} /> Remove
            </Btn>
          </span>
        )}
      </div>
      {moving && !frozen && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2 pl-[3.25rem] print:hidden"
          onSubmit={async (e) => {
            e.preventDefault();
            const target = getEventByKey(to);
            if (!target) return;
            const ok = await run(
              `mv-${p.id}`,
              { action: "move", entryId: p.id, toEvent: to },
              `Move ${p.name}\n\nfrom ${eventName}\nto ${eventLabel(target)}?`,
              `${p.name} moved to ${eventLabel(target)}.`
            );
            if (ok) setMoving(false);
          }}
        >
          {options.length ? (
            <>
              <label className="text-sm text-ink-soft" htmlFor={`mv-${p.id}`}>Move to their event</label>
              <select id={`mv-${p.id}`} required className={clsx(inputCls, "w-auto min-w-64")} value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">Choose event</option>
                {options.map((e) => (
                  <option key={eventKey(e)} value={eventKey(e)}>{eventLabel(e)}</option>
                ))}
              </select>
              <Btn type="submit" tone="ink" busy={busy === `mv-${p.id}`}>Move</Btn>
            </>
          ) : (
            <p className="text-sm font-semibold text-sindoor">
              {p.name} didn&apos;t register for any other event, so they can&apos;t be moved.
            </p>
          )}
        </form>
      )}
    </li>
  );
}

interface DirStudent {
  uid: string;
  name: string;
  studentId: string;
  department: string;
  semester: string;
  gender: string;
  photoUrl: string;
  events: string[];
}

function AddToFinal({ run, busy, onClose }: { run: Run; busy: string | null; onClose: () => void }) {
  const { data, loading } = useApi<{ students: DirStudent[] }>("/api/admin/directory");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<DirStudent | null>(null);
  const [event, setEvent] = useState("");

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return (data?.students ?? []).filter((s) => s.name.toLowerCase().includes(n) || s.studentId.toLowerCase().includes(n)).slice(0, 8);
  }, [data, q]);

  // Only events the student registered for themselves.
  const options = picked ? PICKABLE_EVENTS.filter((e) => picked.events.includes(eventKey(e))) : [];

  return (
    <section className="border-2 border-ink bg-paper p-5 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">Add a student to the final list</p>
          <p className="mt-1 text-sm text-ink-soft">
            Pick a registered student, then one of <strong>their own</strong> events. Seat limits, the 3-event rule and the 50 cap
            still apply.
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="cursor-pointer p-1 hover:bg-paper-2"><X size={18} /></button>
      </div>

      {!picked ? (
        <>
          <label className="relative mt-4 block max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <span className="sr-only">Find student</span>
            <input className={clsx(inputCls, "pl-9")} placeholder="Student name or ID" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </label>
          {loading && <Loading label="Loading students…" />}
          {q && !loading && (
            <ul className="mt-2 border-t border-ink/15">
              {matches.map((s) => (
                <li key={s.uid}>
                  <button onClick={() => setPicked(s)} className="flex w-full cursor-pointer items-center gap-3 border-b border-ink/10 py-2 text-left hover:bg-paper-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cldTransform(s.photoUrl, "c_fill,g_face,w_80,h_80,q_auto,f_auto")} alt="" className="h-9 w-9 border border-ink object-cover" />
                    <span>
                      <span className="block font-bold">{s.name}</span>
                      <span className="block text-xs text-ink-soft">{s.studentId} · {s.department} · {s.events.length} events</span>
                    </span>
                  </button>
                </li>
              ))}
              {!matches.length && <li className="py-3 text-sm text-ink-soft">No match. Add new students from Students → Add student.</li>}
            </ul>
          )}
        </>
      ) : (
        <form
          className="mt-4 flex flex-wrap items-center gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const ev = getEventByKey(event);
            if (!ev) return;
            const ok = await run(
              `add-${picked.uid}`,
              { action: "add", uid: picked.uid, eventKey: event },
              `FINAL SELECTION\n\nSelect ${picked.name} for ${eventLabel(ev)}?`,
              `${picked.name} added to the final list for ${eventLabel(ev)}.`
            );
            if (ok) {
              setPicked(null);
              setEvent("");
              setQ("");
            }
          }}
        >
          <span className="font-bold">{picked.name}</span>
          <select required className={clsx(inputCls, "w-auto min-w-64")} value={event} onChange={(e) => setEvent(e.target.value)} aria-label="Event">
            <option value="">Choose one of their events</option>
            {options.map((e) => (
              <option key={eventKey(e)} value={eventKey(e)}>{eventLabel(e)}</option>
            ))}
          </select>
          <Btn type="submit" tone="peacock" busy={busy === `add-${picked.uid}`}>Select</Btn>
          <button type="button" onClick={() => setPicked(null)} className="cursor-pointer text-sm underline">Change student</button>
        </form>
      )}
    </section>
  );
}
