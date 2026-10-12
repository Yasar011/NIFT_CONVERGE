"use client";

import clsx from "clsx";
import { BOYS_HOSTELS, DAY_SCHOLAR, GIRLS_HOSTELS, type Stay } from "@/lib/registration-schema";

/**
 * "Where do you stay?" — girls' hostels (G1, G2, SBV, RPV), the boys' hostel
 * (Atal), or Day Scholar (everyone). Picking a hostel asks for the room number.
 */
export default function StayFields({
  value,
  gender,
  onChange,
  errors = {},
  disabled,
  controlClass,
  labelClass = "label mb-2 block",
  optional,
}: {
  value: Stay;
  gender: string;
  onChange: (next: Stay) => void;
  errors?: Partial<Record<"residence" | "hostel" | "room", string>>;
  disabled?: boolean;
  controlClass: string;
  labelClass?: string;
  optional?: boolean;
}) {
  const showGirls = gender !== "Male";
  const showBoys = gender !== "Female";
  const selected = value.residence === DAY_SCHOLAR ? DAY_SCHOLAR : value.hostel || "";
  const inHostel = value.residence === "Hostel";

  function pick(v: string) {
    if (!v) onChange({ residence: "", hostel: "", room: "" });
    else if (v === DAY_SCHOLAR) onChange({ residence: DAY_SCHOLAR, hostel: "", room: "" });
    else onChange({ residence: "Hostel", hostel: v, room: value.room ?? "" });
  }

  return (
    <>
      <div>
        <label htmlFor="residence" className={labelClass}>
          Where do you stay?{optional ? " (optional)" : ""}
        </label>
        <select
          id="residence"
          aria-invalid={errors.residence ? true : undefined}
          aria-describedby={errors.residence ? "residence-error" : undefined}
          className={clsx(controlClass, errors.residence && "border-sindoor")}
          value={selected}
          disabled={disabled}
          onChange={(e) => pick(e.target.value)}
        >
          <option value="">{optional ? "—" : "Select"}</option>
          {showGirls && (
            <optgroup label="Girls' hostels">
              {GIRLS_HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
            </optgroup>
          )}
          {showBoys && (
            <optgroup label="Boys' hostel">
              {BOYS_HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
            </optgroup>
          )}
          <option value={DAY_SCHOLAR}>Day Scholar</option>
        </select>
        {errors.residence ? (
          <p id="residence-error" className="mt-1.5 text-sm font-semibold text-sindoor">{errors.residence}</p>
        ) : !gender ? (
          <p className="mt-1.5 text-xs text-ink-soft">Choose your gender first to see your hostels.</p>
        ) : null}
      </div>
      {inHostel && (
        <div>
          <label htmlFor="room" className={labelClass}>
            Room number{optional ? " (optional)" : ""}
          </label>
          <input
            id="room"
            aria-invalid={errors.room ? true : undefined}
            aria-describedby={errors.room ? "room-error" : undefined}
            className={clsx(controlClass, "uppercase", errors.room && "border-sindoor")}
            value={value.room ?? ""}
            disabled={disabled}
            maxLength={10}
            placeholder="e.g. 204"
            onChange={(e) => onChange({ ...value, room: e.target.value })}
          />
          {errors.room && <p id="room-error" className="mt-1.5 text-sm font-semibold text-sindoor">{errors.room}</p>}
        </div>
      )}
    </>
  );
}
