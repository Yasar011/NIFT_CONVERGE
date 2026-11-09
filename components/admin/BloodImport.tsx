"use client";

import { useMemo, useState } from "react";
import { Droplet, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, inputCls } from "./kit";
import { BLOOD_GROUPS, fmtBlood, type BloodGroup } from "@/lib/documents";
import { matchStudents, parseBloodList } from "@/lib/blood-import";

interface Student {
  uid: string;
  name: string;
  studentId: string;
  bloodGroup: string;
}
interface Row {
  line: string;
  uid: string;
  bloodGroup: BloodGroup | "";
  options: string[];
}

const selectCls = inputCls.replace("w-full ", "w-full min-w-48 ") + " py-1.5";

/** Paste "1 Name B+" lines → check the matches → save every blood group at once. */
export default function BloodImport({ students, onClose, onSaved }: { students: Student[]; onClose: () => void; onSaved: () => void }) {
  const { api } = useAuth();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const byUid = useMemo(() => new Map(students.map((s) => [s.uid, s])), [students]);
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  function match() {
    setMsg(null);
    setRows(matchStudents(parseBloodList(text), students).map((m) => ({ line: m.line, uid: m.uid, bloodGroup: m.bloodGroup ?? "", options: m.options })));
  }

  const counts = new Map<string, number>();
  for (const r of rows ?? []) if (r.uid) counts.set(r.uid, (counts.get(r.uid) ?? 0) + 1);
  const ready = (rows ?? []).filter((r) => r.uid && r.bloodGroup && counts.get(r.uid) === 1);
  const problems = (rows ?? []).length - ready.length;
  const notInList = rows ? sorted.filter((s) => !counts.has(s.uid)) : [];
  const set = (i: number, patch: Partial<Row>) => setRows(rows!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/blood", { body: { items: ready.map((r) => ({ uid: r.uid, bloodGroup: r.bloodGroup })) } });
      setMsg({ ok: true, text: `Saved ${ready.length} blood groups.` });
      onSaved();
      setRows(rows!.filter((r) => !ready.includes(r)));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-2 border-ink bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label flex items-center gap-2"><Droplet size={15} /> Paste blood group list</p>
          <p className="mt-1 text-sm text-ink-soft">
            One student per line, e.g. <code className="bg-paper-2 px-1">12 Neva Mariya James O-</code>. Numbers, short names and small typos are fine — you check every match before saving.
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="cursor-pointer p-1 hover:bg-paper-2"><X size={18} /></button>
      </div>

      {!rows ? (
        <>
          <textarea
            className={clsx(inputCls, "mt-4 h-56 font-mono text-sm")}
            placeholder={"1 Yasar CH B-\n2 Varunesh A+\n3 Abhay O+"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Blood group list"
            autoFocus
          />
          <Btn tone="ink" className="mt-3" disabled={!text.trim()} onClick={match}>Match names</Btn>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm">
            <strong>{ready.length}</strong> ready to save
            {problems > 0 && <> · <strong className="text-sindoor">{problems} need you</strong> (pick the student or blood group — red rows)</>}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-2 border-ink text-sm">
              <thead className="bg-paper-2 text-left">
                <tr>
                  <th className="px-3 py-2">Your line</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Blood group</th>
                  <th className="px-3 py-2">Now</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const dup = !!r.uid && (counts.get(r.uid) ?? 0) > 1;
                  const bad = !r.uid || !r.bloodGroup || dup;
                  const cur = byUid.get(r.uid)?.bloodGroup;
                  // Likely matches first, then everyone else.
                  const first = r.options.map((u) => byUid.get(u)!).filter(Boolean);
                  const rest = sorted.filter((s) => !r.options.includes(s.uid));
                  return (
                    <tr key={i} className={clsx("border-t border-ink/15", bad && "bg-sindoor/10")}>
                      <td className="px-3 py-2 font-mono text-xs">{r.line}</td>
                      <td className="px-3 py-2">
                        <select aria-label={`Student for ${r.line}`} className={clsx(selectCls, !r.uid && "border-sindoor")} value={r.uid} onChange={(e) => set(i, { uid: e.target.value })}>
                          <option value="">{r.options.length > 1 ? "Which one? Choose" : "No match — choose"}</option>
                          {first.length > 0 && (
                            <optgroup label="Likely">
                              {first.map((s) => <option key={s.uid} value={s.uid}>{s.name} · {s.studentId}</option>)}
                            </optgroup>
                          )}
                          <optgroup label="Everyone in the final list">
                            {rest.map((s) => <option key={s.uid} value={s.uid}>{s.name} · {s.studentId}</option>)}
                          </optgroup>
                        </select>
                        {dup && <span className="mt-1 block text-xs font-bold text-sindoor">This student is on 2 lines — fix one.</span>}
                      </td>
                      <td className="px-3 py-2">
                        <select aria-label={`Blood group for ${r.line}`} className={clsx(selectCls, "min-w-24", !r.bloodGroup && "border-sindoor")} value={r.bloodGroup} onChange={(e) => set(i, { bloodGroup: e.target.value as BloodGroup })}>
                          <option value="">Choose</option>
                          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{fmtBlood(g)}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {!r.uid ? "" : !cur ? <span className="text-ink-soft">Not given</span> : cur === r.bloodGroup ? <span className="text-peacock">Same</span> : <span className="font-bold text-sindoor">{fmtBlood(cur)} → {fmtBlood(r.bloodGroup)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {notInList.length > 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              <strong className="text-ink">Final-list students not in your list ({notInList.length}):</strong> {notInList.map((s) => s.name).join(", ")}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn tone="ink" busy={busy} disabled={!ready.length} onClick={save}>Save {ready.length} blood groups</Btn>
            <button type="button" onClick={() => setRows(null)} className="cursor-pointer text-sm underline">Edit the pasted list</button>
          </div>
        </>
      )}
      {msg && <p className={clsx("mt-3 border-2 p-2 text-sm font-semibold", msg.ok ? "border-peacock text-peacock" : "border-sindoor bg-sindoor/10 text-sindoor")}>{msg.text}</p>}
    </section>
  );
}
