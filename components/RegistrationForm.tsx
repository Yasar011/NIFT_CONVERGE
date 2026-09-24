"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import clsx from "clsx";
import { EVENTS } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";
import {
  EMPTY_REGISTRATION,
  PROGRAMMES,
  YEARS,
  SEMESTERS,
  validateRegistration,
  RegistrationPayload,
  RegistrationErrors,
} from "@/lib/registration-schema";
import { REGISTRATION_OPEN } from "@/lib/registration-status";

const GROUPS = CATEGORY_ORDER.map((c) => ({
  label: CATEGORY_META[c].label,
  options: EVENTS.filter((e) => e.category === c && !e.nonCompetitive).map((e) => ({
    value: `${e.category}:${e.slug}`,
    label: `${e.name}${e.genderNote && e.genderNote !== "Open" && e.genderNote !== "Mixed" ? ` (${e.genderNote})` : ""}`,
  })),
}));

const control =
  "w-full border-2 border-ink bg-paper px-3.5 py-3 text-base text-ink placeholder:text-ink-soft/60 transition-colors focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:border-ink/30 disabled:text-ink-soft";

type Key = keyof RegistrationPayload;

function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-2 block">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-semibold text-sindoor">
          {error}
        </p>
      )}
    </div>
  );
}

function StepTitle({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-3">
      <h2 className="flex items-baseline gap-4">
        <span className="text-xs font-bold tabular-nums text-ink-soft">{n}</span>
        <span className="display-md text-3xl sm:text-4xl">{title}</span>
      </h2>
      {note && <p className="text-sm text-ink-soft">{note}</p>}
    </div>
  );
}

export default function RegistrationForm() {
  const [data, setData] = useState<RegistrationPayload>(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function update<K extends Key>(key: K, value: RegistrationPayload[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const a11y = (key: Key) => ({
    id: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!REGISTRATION_OPEN) return;
    const found = validateRegistration(data);
    setErrors(found);
    const firstError = Object.keys(found).find((k) => found[k as Key]);
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }
    // TODO: send to a Firebase/Supabase-backed API route once registration opens.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="border-2 border-ink bg-peacock p-8 text-paper sm:p-12">
        <span className="flex h-12 w-12 items-center justify-center border-2 border-paper">
          <Check size={26} strokeWidth={3} />
        </span>
        <p className="display mt-6 text-5xl sm:text-6xl">You&apos;re in the process.</p>
        <p className="mt-4 max-w-md leading-relaxed text-paper/85">
          Your interest has been recorded. Your Campus SDAC or event coordinators will contact you
          about screening and trials.
        </p>
      </div>
    );
  }

  const slots: { key: "majorEvent1" | "majorEvent2" | "minorEvent"; label: string; head: string }[] = [
    { key: "majorEvent1", label: "Major 01", head: "bg-ink text-paper" },
    { key: "majorEvent2", label: "Major 02", head: "bg-ink text-paper" },
    { key: "minorEvent", label: "Minor", head: "bg-marigold text-ink" },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-14">
      <fieldset disabled={!REGISTRATION_OPEN} className="space-y-14">
        <section>
          <StepTitle n="01" title="About you" />
          <div className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
            <Field id="fullName" label="Full name" error={errors.fullName} className="sm:col-span-2">
              <input {...a11y("fullName")} autoComplete="name" className={control} value={data.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="As on your NIFT ID" />
            </Field>
            <Field id="studentId" label="NIFT student ID" error={errors.studentId}>
              <input {...a11y("studentId")} className={control} value={data.studentId} onChange={(e) => update("studentId", e.target.value)} />
            </Field>
            <Field id="programme" label="Programme" error={errors.programme}>
              <select {...a11y("programme")} className={control} value={data.programme} onChange={(e) => update("programme", e.target.value)}>
                <option value="">Select</option>
                {PROGRAMMES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field id="department" label="Department" error={errors.department}>
              <input {...a11y("department")} className={control} value={data.department} onChange={(e) => update("department", e.target.value)} placeholder="e.g. Fashion Design" />
            </Field>
            <div className="grid grid-cols-2 gap-5">
              <Field id="year" label="Year" error={errors.year}>
                <select {...a11y("year")} className={control} value={data.year} onChange={(e) => update("year", e.target.value)}>
                  <option value="">Select</option>
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </Field>
              <Field id="semester" label="Semester" error={errors.semester}>
                <select {...a11y("semester")} className={control} value={data.semester} onChange={(e) => update("semester", e.target.value)}>
                  <option value="">Select</option>
                  {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field id="phone" label="Mobile number" error={errors.phone}>
              <input {...a11y("phone")} type="tel" inputMode="numeric" autoComplete="tel" className={control} value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="10 digits" />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <input {...a11y("email")} type="email" autoComplete="email" className={control} value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="you@nift.ac.in" />
            </Field>
            <Field id="residence" label="Hostel / day scholar" error={errors.residence}>
              <select {...a11y("residence")} className={control} value={data.residence} onChange={(e) => update("residence", e.target.value as RegistrationPayload["residence"])}>
                <option value="">Select</option>
                <option value="Hostel">Hostel</option>
                <option value="Day Scholar">Day Scholar</option>
              </select>
            </Field>
            <Field id="gender" label="Gender (optional)" hint="Only needed for boys/girls-specific events.">
              <select id="gender" className={control} value={data.gender} onChange={(e) => update("gender", e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
          </div>
        </section>

        <section>
          <StepTitle n="02" title="Your three events" note="All three must be different." />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {slots.map((slot) => {
              const taken = slots.filter((s) => s.key !== slot.key).map((s) => data[s.key]);
              return (
                <div key={slot.key} className={clsx("border-2 bg-paper", errors[slot.key] ? "border-sindoor" : "border-ink")}>
                  <label htmlFor={slot.key} className={clsx("label flex items-center justify-between border-b-2 border-ink px-3 py-2.5", slot.head)}>
                    {slot.label}
                    {data[slot.key] && <Check size={14} strokeWidth={3} aria-hidden />}
                  </label>
                  <div className="p-3">
                    <select
                      {...a11y(slot.key)}
                      className={clsx(control, "border-ink/30")}
                      value={data[slot.key]}
                      onChange={(e) => update(slot.key, e.target.value)}
                    >
                      <option value="">Choose an event</option>
                      {GROUPS.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                          {g.options.map((o) => (
                            <option key={o.value} value={o.value} disabled={taken.includes(o.value)}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {errors[slot.key] && (
                      <p id={`${slot.key}-error`} className="mt-2 text-sm font-semibold text-sindoor">
                        {errors[slot.key]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <StepTitle n="03" title="Confirm" />
          <div className="mt-6 space-y-4">
            {([
              ["rulesAcknowledged", "I have read and understood the rules for the events I've picked."],
              ["selectionAcknowledged", "I understand that registering does not guarantee selection."],
            ] as const).map(([key, text]) => (
              <div key={key}>
                <label className="flex cursor-pointer items-start gap-4">
                  <input
                    {...a11y(key)}
                    type="checkbox"
                    className="peer sr-only"
                    checked={data[key]}
                    onChange={(e) => update(key, e.target.checked)}
                  />
                  <span
                    className={clsx(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
                      data[key] ? "bg-ink text-paper" : "bg-paper"
                    )}
                    aria-hidden
                  >
                    {data[key] && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="text-base leading-relaxed">{text}</span>
                </label>
                {errors[key] && (
                  <p id={`${key}-error`} className="ml-10 mt-1 text-sm font-semibold text-sindoor">
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </fieldset>

      <div className="border-t-2 border-ink pt-8">
        <button
          type="submit"
          disabled={!REGISTRATION_OPEN}
          className="btn-print inline-flex w-full cursor-pointer items-center justify-center gap-3 border-2 border-ink bg-blue px-8 py-5 text-base font-bold uppercase tracking-wide text-paper disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-paper-2 disabled:text-ink-soft sm:w-auto"
        >
          {REGISTRATION_OPEN ? "Submit registration" : "Registration opening soon"}
          {REGISTRATION_OPEN && <ArrowRight size={18} strokeWidth={2.5} />}
        </button>
        {!REGISTRATION_OPEN && (
          <p className="mt-3 text-sm text-ink-soft">
            Submissions open once NIFT Jodhpur activates registration.
          </p>
        )}
      </div>
    </form>
  );
}
