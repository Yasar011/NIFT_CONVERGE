"use client";

import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { EVENTS } from "@/lib/events";
import { CATEGORY_META } from "@/lib/types";
import {
  EMPTY_REGISTRATION,
  PROGRAMMES,
  YEARS,
  SEMESTERS,
  validateRegistration,
  RegistrationPayload,
} from "@/lib/registration-schema";
import { REGISTRATION_OPEN } from "@/lib/registration-status";

const EVENT_OPTIONS = EVENTS.filter((e) => !e.nonCompetitive).map((e) => ({
  value: `${e.category}:${e.slug}`,
  label: `${e.name}${e.genderNote && e.genderNote !== "Open" && e.genderNote !== "Mixed" ? ` (${e.genderNote})` : ""} — ${CATEGORY_META[e.category].short}`,
}));

const inputClass =
  "w-full rounded-xl border border-gold/25 bg-ink/60 px-4 py-3 text-sm text-cream placeholder:text-cream-dim/50 focus:border-gold focus:outline-none disabled:opacity-50";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cream-dim";

export default function RegistrationForm() {
  const [data, setData] = useState<RegistrationPayload>(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof RegistrationPayload>(key: K, value: RegistrationPayload[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateRegistration(data);
    setErrors(validationErrors);
    if (validationErrors.length === 0 && REGISTRATION_OPEN) {
      // TODO: wire to a Firebase/Supabase-backed API route when registration opens.
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="card-border flex flex-col items-center gap-3 rounded-3xl bg-indigo/40 p-10 text-center">
        <CheckCircle2 className="text-gold-light" size={32} />
        <p className="font-display text-xl font-semibold text-cream">
          Your interest has been recorded.
        </p>
        <p className="max-w-md text-sm text-cream-dim">
          You will be contacted by your Campus SDAC / event coordinators regarding the next
          steps in the selection process.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {!REGISTRATION_OPEN && (
        <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-5">
          <Lock className="mt-0.5 shrink-0 text-gold-light" size={18} />
          <p className="text-sm leading-relaxed text-cream">
            Registration for CONVERGE 2026 has not opened yet. You can preview the full
            registration form below — submission will be enabled once NIFT Jodhpur activates
            registration.
          </p>
        </div>
      )}

      <fieldset disabled={!REGISTRATION_OPEN}>
        <section>
          <h2 className="font-display text-xl font-semibold text-cream">Student Information</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                className={inputClass}
                value={data.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="As per NIFT ID"
              />
            </div>
            <div>
              <label className={labelClass}>NIFT Student ID</label>
              <input
                className={inputClass}
                value={data.studentId}
                onChange={(e) => update("studentId", e.target.value)}
                placeholder="e.g. FD/23/1234"
              />
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <select
                className={inputClass}
                value={data.year}
                onChange={(e) => update("year", e.target.value)}
              >
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Programme</label>
              <select
                className={inputClass}
                value={data.programme}
                onChange={(e) => update("programme", e.target.value)}
              >
                <option value="">Select programme</option>
                {PROGRAMMES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <input
                className={inputClass}
                value={data.department}
                onChange={(e) => update("department", e.target.value)}
                placeholder="e.g. Fashion Design"
              />
            </div>
            <div>
              <label className={labelClass}>Semester</label>
              <select
                className={inputClass}
                value={data.semester}
                onChange={(e) => update("semester", e.target.value)}
              >
                <option value="">Select semester</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Gender (only if required for event eligibility)</label>
              <select
                className={inputClass}
                value={data.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="">Prefer not to specify</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Hostel / Day Scholar</label>
              <select
                className={inputClass}
                value={data.residence}
                onChange={(e) => update("residence", e.target.value as RegistrationPayload["residence"])}
              >
                <option value="">Select</option>
                <option value="Hostel">Hostel</option>
                <option value="Day Scholar">Day Scholar</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                className={inputClass}
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@nift.ac.in"
              />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-cream">Event Selection</h2>
          <p className="mt-2 text-sm text-cream-dim">
            Choose 2 Major Events and 1 Minor Event. All three must be different.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Major Event 1</label>
              <select
                className={inputClass}
                value={data.majorEvent1}
                onChange={(e) => update("majorEvent1", e.target.value)}
              >
                <option value="">Select event</option>
                {EVENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Major Event 2</label>
              <select
                className={inputClass}
                value={data.majorEvent2}
                onChange={(e) => update("majorEvent2", e.target.value)}
              >
                <option value="">Select event</option>
                {EVENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Minor Event</label>
              <select
                className={inputClass}
                value={data.minorEvent}
                onChange={(e) => update("minorEvent", e.target.value)}
              >
                <option value="">Select event</option>
                {EVENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-3">
          <label className="flex items-start gap-3 text-sm text-cream-dim">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#e8a93c]"
              checked={data.rulesAcknowledged}
              onChange={(e) => update("rulesAcknowledged", e.target.checked)}
            />
            I have read and understood the event rules.
          </label>
          <label className="flex items-start gap-3 text-sm text-cream-dim">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#e8a93c]"
              checked={data.selectionAcknowledged}
              onChange={(e) => update("selectionAcknowledged", e.target.checked)}
            />
            I understand that registration does not guarantee selection.
          </label>
        </section>
      </fieldset>

      {errors.length > 0 && (
        <div className="rounded-2xl border border-magenta/40 bg-magenta/10 p-5">
          <ul className="space-y-1.5 text-sm text-cream/90">
            {errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={!REGISTRATION_OPEN}
        className="w-full rounded-full bg-gradient-to-r from-gold-light via-gold to-magenta px-8 py-4 text-sm font-bold uppercase tracking-wide text-ink shadow-lg shadow-gold/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {REGISTRATION_OPEN ? "Submit Registration" : "Registration Opening Soon"}
      </button>
    </form>
  );
}
