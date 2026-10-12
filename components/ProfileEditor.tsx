"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "./auth/AuthProvider";
import PhotoUpload from "./PhotoUpload";
import StayFields from "./StayFields";
import type { RegistrationRecord } from "@/lib/api-types";
import type { MediaRef, Stay } from "@/lib/registration-schema";

const control =
  "w-full border-2 border-ink bg-paper px-3.5 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Students edit what they own: photo, mobile and where they stay. */
export default function ProfileEditor({ reg, onClose }: { reg: RegistrationRecord; onClose: () => void }) {
  const { api, refresh } = useAuth();
  const [phone, setPhone] = useState(reg.phone ?? "");
  const [stay, setStay] = useState<Stay>({ residence: reg.residence ?? "", hostel: reg.hostel ?? "", room: reg.room ?? "" });
  const [photo, setPhoto] = useState<MediaRef | null>(reg.photo?.publicId ? reg.photo : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api("/api/me", { method: "PATCH", body: { phone, ...stay, ...(photo ? { photo } : {}) } });
      await refresh();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Record<string, string>);
      setMsg(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="border-2 border-ink bg-paper p-5 sm:p-6">
      <p className="label">Edit profile</p>
      <p className="mt-1 text-sm text-ink-soft">
        Name, student ID, department, semester and events can only be changed by the main admin.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <PhotoUpload value={photo ?? reg.photo} onChange={setPhoto} error={errors.photo} />
        </div>
        <div>
          <label htmlFor="phone" className="label mb-2 block">Mobile number</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            className={clsx(control, errors.phone && "border-sindoor")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10 digits"
          />
          {errors.phone && <p className="mt-1.5 text-sm font-semibold text-sindoor">{errors.phone}</p>}
        </div>
        <StayFields value={stay} gender={reg.gender} onChange={setStay} errors={errors} controlClass={control} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="btn-print inline-flex cursor-pointer items-center gap-2 border-2 border-ink bg-blue px-5 py-3 text-sm font-bold uppercase tracking-wide text-paper disabled:opacity-60"
        >
          <Check size={16} strokeWidth={3} /> {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="cursor-pointer text-sm font-semibold underline underline-offset-4">
          Cancel
        </button>
        {msg && <p className="text-sm font-semibold text-sindoor">{msg}</p>}
      </div>
    </form>
  );
}
