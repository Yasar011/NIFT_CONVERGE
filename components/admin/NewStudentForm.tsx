"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "../auth/AuthProvider";
import { Btn, inputCls } from "./kit";
import { PICKABLE_EVENTS, eventKey, eventLabel, genderRequirement } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";
import { DEPARTMENTS, GENDERS, MAX_EVENTS, RESIDENCES, SEMESTERS } from "@/lib/registration-schema";

const EMPTY = { email: "", fullName: "", studentId: "", department: "", semester: "", gender: "", phone: "", residence: "" };

/**
 * Admin adds a student by NIFT email (no self-registration needed).
 * `fixedEvent` puts them straight into that event; otherwise the admin picks up to 5.
 */
export default function NewStudentForm({ fixedEvent, onDone }: { fixedEvent?: string; onDone: (msg: string) => void }) {
  const { api, me } = useAuth();
  const isMain = me?.user.role === "main_admin";
  const allowed = PICKABLE_EVENTS.filter((e) => isMain || e.category === me?.user.club);
  const [form, setForm] = useState(EMPTY);
  const [events, setEvents] = useState<string[]>(fixedEvent ? [fixedEvent] : [""]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErrors({});
    try {
      const res = await api<{ existing: boolean; added: number; name: string }>("/api/admin/students", {
        body: { ...form, events: (fixedEvent ? [fixedEvent] : events).filter(Boolean) },
      });
      onDone(
        res.existing
          ? `${res.name} was already registered — added to ${res.added} event${res.added === 1 ? "" : "s"}.`
          : `Added ${res.name}. They'll see it when they sign in with ${form.email.trim().toLowerCase()}.`
      );
      setForm(EMPTY);
      setEvents(fixedEvent ? [fixedEvent] : [""]);
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Record<string, string>);
      setMsg(err instanceof Error ? err.message : "Couldn't add.");
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof EMPTY, label: string, node: React.ReactNode, hint?: string) => (
    <label>
      <span className="label mb-1.5 block text-ink-soft">{label}</span>
      {node}
      {errors[k] ? <span className="mt-1 block text-xs font-semibold text-sindoor">{errors[k]}</span> : hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
  const sel = (k: keyof typeof EMPTY, opts: readonly string[], placeholder = "Select") => (
    <select className={clsx(inputCls, errors[k] && "border-sindoor")} value={form[k]} onChange={(e) => set(k, e.target.value)} required>
      <option value="">{placeholder}</option>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {field("email", "NIFT email", <input required type="email" className={clsx(inputCls, errors.email && "border-sindoor")} placeholder="name@nift.ac.in" value={form.email} onChange={(e) => set("email", e.target.value)} />, "They sign in with this later")}
        {field("fullName", "Full name", <input required className={clsx(inputCls, errors.fullName && "border-sindoor")} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />)}
        {field("studentId", "Student ID", <input required className={clsx(inputCls, "uppercase", errors.studentId && "border-sindoor")} value={form.studentId} onChange={(e) => set("studentId", e.target.value)} />)}
        {field("gender", "Gender", sel("gender", GENDERS))}
        {field("department", "Department", sel("department", DEPARTMENTS))}
        {field("semester", "Semester", sel("semester", SEMESTERS))}
        {field("phone", "Mobile (optional)", <input type="tel" inputMode="numeric" className={clsx(inputCls, errors.phone && "border-sindoor")} placeholder="10 digits" value={form.phone} onChange={(e) => set("phone", e.target.value)} />)}
        {field("residence", "Hostel / day (optional)", (
          <select className={inputCls} value={form.residence} onChange={(e) => set("residence", e.target.value)}>
            <option value="">—</option>
            {RESIDENCES.map((r) => <option key={r}>{r}</option>)}
          </select>
        ))}
      </div>

      {!fixedEvent && (
        <div>
          <span className="label mb-1.5 block text-ink-soft">Events (up to {MAX_EVENTS})</span>
          <div className="grid gap-2 md:grid-cols-3">
            {events.map((value, i) => {
              const taken = events.filter((_, j) => j !== i);
              return (
                <select
                  key={i}
                  aria-label={`Event ${i + 1}`}
                  className={inputCls}
                  value={value}
                  required={i === 0}
                  onChange={(e) => setEvents((ev) => ev.map((x, j) => (j === i ? e.target.value : x)))}
                >
                  <option value="">{i === 0 ? "Choose an event" : "None"}</option>
                  {CATEGORY_ORDER.filter((c) => allowed.some((e) => e.category === c)).map((c) => (
                    <optgroup key={c} label={CATEGORY_META[c].label}>
                      {allowed.filter((e) => e.category === c).map((ev) => {
                        const k = eventKey(ev);
                        const need = genderRequirement(ev);
                        return (
                          <option key={k} value={k} disabled={taken.includes(k) || (!!need && !!form.gender && form.gender !== need)}>
                            {eventLabel(ev)}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              );
            })}
            {events.length < MAX_EVENTS && (
              <button type="button" onClick={() => setEvents((ev) => [...ev, ""])} className="cursor-pointer border-2 border-dashed border-ink/40 px-3 py-2.5 text-sm font-semibold hover:bg-paper-2">
                + Add another event
              </button>
            )}
          </div>
          {errors.events && <span className="mt-1 block text-xs font-semibold text-sindoor">{errors.events}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Btn type="submit" tone="blue" busy={busy}>
          <UserPlus size={14} /> Add student
        </Btn>
        <span className="text-xs text-ink-soft">No photo needed now — an initials avatar is used until one is uploaded.</span>
      </div>
      {msg && <p className="text-sm font-semibold text-sindoor">{msg}</p>}
    </form>
  );
}
