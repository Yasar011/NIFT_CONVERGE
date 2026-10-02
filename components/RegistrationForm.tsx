"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "./auth/AuthProvider";
import SignInPanel from "./auth/SignInPanel";
import PhotoUpload from "./PhotoUpload";
import { PICKABLE_EVENTS, eventKey, eventLabel, genderRequirement } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";
import {
  EMPTY_REGISTRATION,
  DEPARTMENTS,
  SEMESTERS,
  GENDERS,
  RESIDENCES,
  PICK_SLOTS,
  REQUIRED_SLOTS,
  SLOT_LABEL,
  validateRegistration,
  type RegistrationInput,
  type RegistrationErrors,
  type PickSlot,
} from "@/lib/registration-schema";

export const control =
  "w-full border-2 border-ink bg-paper px-3.5 py-3 text-base text-ink placeholder:text-ink-soft/60 transition-colors focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:border-ink/30 disabled:text-ink-soft aria-[invalid=true]:border-sindoor";

export function Field({
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

export function StepTitle({ n, title, note }: { n: string; title: string; note?: string }) {
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

const GROUPS = CATEGORY_ORDER.map((c) => ({
  label: CATEGORY_META[c].label,
  events: PICKABLE_EVENTS.filter((e) => e.category === c),
}));

/** Student details + five event slots. Reused by the main admin's edit screen. */
export function RegistrationFields({
  data,
  update,
  errors,
  disabled,
  email,
  forUid,
}: {
  forUid?: string;
  data: RegistrationInput;
  update: <K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) => void;
  errors: RegistrationErrors;
  disabled?: boolean;
  email?: string;
}) {
  const a11y = (key: string) => ({
    id: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });
  const setPick = (slot: PickSlot, value: string) => update("picks", { ...data.picks, [slot]: value });

  return (
    <fieldset disabled={disabled} className="space-y-14">
      <section>
        <StepTitle n="01" title="About you" />
        <div className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PhotoUpload value={data.photo} onChange={(p) => update("photo", p)} error={errors.photo} disabled={disabled} forUid={forUid} />
          </div>
          <Field id="fullName" label="Full name" error={errors.fullName}>
            <input {...a11y("fullName")} autoComplete="name" className={control} value={data.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="As on your NIFT ID" />
          </Field>
          <Field id="studentId" label="NIFT student ID" error={errors.studentId}>
            <input {...a11y("studentId")} className={clsx(control, "uppercase")} value={data.studentId} onChange={(e) => update("studentId", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-5">
            <Field id="department" label="Department" error={errors.department}>
              <select {...a11y("department")} className={control} value={data.department} onChange={(e) => update("department", e.target.value)}>
                <option value="">Select</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field id="semester" label="Semester" error={errors.semester}>
              <select {...a11y("semester")} className={control} value={data.semester} onChange={(e) => update("semester", e.target.value)}>
                <option value="">Select</option>
                {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field id="gender" label="Gender" error={errors.gender} hint="Needed for boys-only and girls-only events.">
            <select {...a11y("gender")} className={control} value={data.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">Select</option>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field id="phone" label="Mobile number" error={errors.phone}>
            <input {...a11y("phone")} type="tel" inputMode="numeric" autoComplete="tel" className={control} value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="10 digits" />
          </Field>
          <Field id="residence" label="Hostel / day scholar" error={errors.residence}>
            <select {...a11y("residence")} className={control} value={data.residence} onChange={(e) => update("residence", e.target.value)}>
              <option value="">Select</option>
              {RESIDENCES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          {email && (
            <Field id="email" label="NIFT email" className="sm:col-span-2">
              <input id="email" className={control} value={email} readOnly disabled />
            </Field>
          )}
        </div>
      </section>

      <section>
        <StepTitle n="02" title="Your events" note="3 required · up to 5 · all different" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PICK_SLOTS.map((slot) => {
            const required = REQUIRED_SLOTS.includes(slot);
            const taken = PICK_SLOTS.filter((s) => s !== slot).map((s) => data.picks[s]);
            return (
              <div key={slot} className={clsx("border-2 bg-paper", errors[slot] ? "border-sindoor" : required ? "border-ink" : "border-dashed border-ink/50")}>
                <label
                  htmlFor={slot}
                  className={clsx(
                    "label flex items-center justify-between border-b-2 px-3 py-2.5",
                    required ? "border-ink bg-ink text-paper" : "border-ink/30 bg-paper-2"
                  )}
                >
                  <span>
                    {SLOT_LABEL[slot]}
                    {!required && <span className="ml-2 normal-case tracking-normal opacity-70">(optional)</span>}
                  </span>
                  {data.picks[slot] && <Check size={14} strokeWidth={3} aria-hidden />}
                </label>
                <div className="p-3">
                  <select {...a11y(slot)} className={clsx(control, "border-ink/30")} value={data.picks[slot]} onChange={(e) => setPick(slot, e.target.value)}>
                    <option value="">{required ? "Choose an event" : "None"}</option>
                    {GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.events.map((ev) => {
                          const key = eventKey(ev);
                          const need = genderRequirement(ev);
                          const blocked = !!need && !!data.gender && data.gender !== need;
                          return (
                            <option key={key} value={key} disabled={taken.includes(key) || blocked}>
                              {eventLabel(ev)}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                  {errors[slot] && (
                    <p id={`${slot}-error`} className="mt-2 text-sm font-semibold text-sindoor">
                      {errors[slot]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div className="border-2 border-ink bg-ink p-4 text-sm leading-relaxed text-paper/85">
            <p className="label text-marigold">Remember</p>
            <p className="mt-2">
              You can be <strong className="text-paper">selected for at most 3 events</strong>. Once you&apos;re
              selected for 3, your other events are locked.
            </p>
          </div>
        </div>
      </section>
    </fieldset>
  );
}

export default function RegistrationForm({ registrationOpen }: { registrationOpen: boolean }) {
  const { status, me, user, error } = useAuth();
  const router = useRouter();

  const alreadyRegistered = !!me?.registration;
  useEffect(() => {
    if (alreadyRegistered) router.replace("/me");
  }, [alreadyRegistered, router]);

  if (status === "signed-in" && !me && error) {
    return <p className="border-2 border-sindoor p-5 font-semibold text-sindoor">{error}</p>;
  }

  if (status === "loading" || (status === "signed-in" && !me)) {
    return (
      <p className="flex items-center gap-3 text-ink-soft">
        <Loader2 className="animate-spin" size={18} /> Loading your account…
      </p>
    );
  }

  if (status === "signed-out") {
    return (
      <SignInPanel
        title="Sign in to register"
        text="Registration uses your NIFT Google account, so we know it's really you. No passwords to remember."
      />
    );
  }

  if (alreadyRegistered) {
    return (
      <p className="text-ink-soft">
        You&apos;re already registered. <Link href="/me" className="font-bold text-ink underline">Go to My Converge</Link>
      </p>
    );
  }

  return <FormBody registrationOpen={registrationOpen} initialName={user?.displayName ?? ""} email={user?.email ?? undefined} />;
}

function FormBody({ registrationOpen, initialName, email }: { registrationOpen: boolean; initialName: string; email?: string }) {
  const { api, refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<RegistrationInput>(() => ({ ...EMPTY_REGISTRATION, fullName: initialName }));
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const count = useMemo(() => PICK_SLOTS.filter((s) => data.picks[s]).length, [data.picks]);

  function update<K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (key === "picks") {
        const next = { ...prev };
        PICK_SLOTS.forEach((s) => delete next[s]);
        return next;
      }
      return prev[key as string] ? { ...prev, [key]: undefined } : prev;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!registrationOpen || submitting) return;
    setFormError(null);
    const found = validateRegistration(data);
    setErrors(found);
    const first = Object.keys(found).find((k) => found[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/registration", { body: data });
      await refresh();
      router.push("/me?welcome=1");
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-14">
      <RegistrationFields data={data} update={update} errors={errors} disabled={!registrationOpen || submitting} email={email} />

      <section>
        <StepTitle n="03" title="Confirm" />
        <fieldset disabled={!registrationOpen || submitting} className="mt-6 space-y-4">
          {([
            ["rulesAcknowledged", "I have read and understood the rules for the events I've picked."],
            ["selectionAcknowledged", "I understand that registering does not guarantee selection, and that I can be selected for at most 3 events."],
          ] as const).map(([key, text]) => (
            <div key={key}>
              <label className="flex cursor-pointer items-start gap-4">
                <input
                  id={key}
                  aria-invalid={errors[key] ? true : undefined}
                  aria-describedby={errors[key] ? `${key}-error` : undefined}
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
        </fieldset>
      </section>

      <div className="border-t-2 border-ink pt-8">
        {formError && <p className="mb-4 border-2 border-sindoor bg-sindoor/10 p-3 text-sm font-semibold text-sindoor">{formError}</p>}
        <button
          type="submit"
          disabled={!registrationOpen || submitting}
          className="btn-print inline-flex w-full cursor-pointer items-center justify-center gap-3 border-2 border-ink bg-blue px-8 py-5 text-base font-bold uppercase tracking-wide text-paper disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-paper-2 disabled:text-ink-soft sm:w-auto"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {!registrationOpen ? "Registration opening soon" : submitting ? "Submitting…" : `Submit ${count} event${count === 1 ? "" : "s"}`}
          {registrationOpen && !submitting && <ArrowRight size={18} strokeWidth={2.5} />}
        </button>
        {!registrationOpen && (
          <p className="mt-3 text-sm text-ink-soft">Submissions open once NIFT Jodhpur activates registration.</p>
        )}
      </div>
    </form>
  );
}
