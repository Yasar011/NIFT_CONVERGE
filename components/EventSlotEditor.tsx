"use client";

import { useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { PICKABLE_EVENTS, eventKey, eventLabel, genderRequirement } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/types";
import { SLOT_LABEL, type PickSlot } from "@/lib/registration-schema";

const control =
  "w-full border-2 border-ink bg-paper px-3.5 py-3 text-base text-ink focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Pick (or change / clear) the event in one of the student's own slots. */
export default function EventSlotEditor({
  slot,
  current,
  gender,
  taken,
  closed,
  onClose,
}: {
  slot: PickSlot;
  current: string;
  gender: string;
  taken: string[];
  closed: Record<string, string>;
  onClose: () => void;
}) {
  const { api, refresh } = useAuth();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const options = PICKABLE_EVENTS.filter((e) => {
    const need = genderRequirement(e);
    const key = eventKey(e);
    return (!need || need === gender) && (key === current || !taken.includes(key));
  });

  async function save(eventKey: string) {
    if (eventKey === "" && !confirm(`Remove ${SLOT_LABEL[slot]}? You can pick another event later while registration is open.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/me/events", { method: "PUT", body: { slot, eventKey } });
      await refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-2 border-ink bg-paper-2 p-4">
      <label className="label mb-2 block" htmlFor={`slot-${slot}`}>
        {current ? `Change ${SLOT_LABEL[slot]}` : `Choose ${SLOT_LABEL[slot]}`}
      </label>
      <select id={`slot-${slot}`} className={control} value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Choose an event</option>
        {CATEGORY_ORDER.map((c) => {
          const evs = options.filter((e) => e.category === c);
          if (!evs.length) return null;
          return (
            <optgroup key={c} label={CATEGORY_META[c].label}>
              {evs.map((e) => {
                const key = eventKey(e);
                return (
                  <option key={key} value={key} disabled={!!closed[key] && key !== current}>
                    {eventLabel(e)}
                    {closed[key] ? ` — closed (trial started ${closed[key]})` : ""}
                  </option>
                );
              })}
            </optgroup>
          );
        })}
      </select>
      <p className="mt-2 text-xs text-ink-soft">Each event takes registrations only until its first trial starts.</p>
      {err && <p className="mt-2 text-sm font-semibold text-sindoor">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !value || value === current}
          onClick={() => save(value)}
          className="cursor-pointer border-2 border-ink bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {current && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save("")}
            className="cursor-pointer border-2 border-sindoor px-4 py-2 text-xs font-bold uppercase tracking-wide text-sindoor disabled:opacity-50"
          >
            Remove
          </button>
        )}
        <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-wide underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
