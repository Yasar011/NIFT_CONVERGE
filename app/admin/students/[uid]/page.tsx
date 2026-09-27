"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth, ApiError } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, useApi } from "@/components/admin/kit";
import { RegistrationFields } from "@/components/RegistrationForm";
import StatusBadge from "@/components/StatusBadge";
import QrPass from "@/components/QrPass";
import { getEventByKey, eventLabel } from "@/lib/events";
import { EMPTY_REGISTRATION, SLOT_LABEL, type RegistrationErrors, type RegistrationInput } from "@/lib/registration-schema";
import type { EntryView, RegistrationRecord } from "@/lib/api-types";

interface Detail {
  registration: RegistrationRecord;
  entries: EntryView[];
  selectedCount: number;
}

export default function StudentEdit({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { data, error, loading, reload } = useApi<Detail>(`/api/admin/students/${uid}`);
  const [saved, setSaved] = useState(false);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;
  // Remount the editor whenever the saved record changes, so the form resets to it.
  const version = data.registration.updatedAt ?? data.registration.createdAt;
  return (
    <Editor
      key={version}
      uid={uid}
      data={data}
      saved={saved}
      onSaved={() => {
        setSaved(true);
        reload();
      }}
    />
  );
}

function Editor({ uid, data, saved, onSaved }: { uid: string; data: Detail; saved: boolean; onSaved: () => void }) {
  const { api } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<RegistrationInput>(() => ({
    ...EMPTY_REGISTRATION,
    ...data.registration,
    rulesAcknowledged: true,
    selectionAcknowledged: true,
  }));
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(saved ? { ok: true, text: "Saved." } : null);

  function update<K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    setErrors({});
    try {
      await api(`/api/admin/students/${uid}`, { method: "PATCH", body: form });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(e.details);
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this registration and all its event entries? This can't be undone.")) return;
    setBusy("delete");
    try {
      await api(`/api/admin/students/${uid}`, { method: "DELETE" });
      router.replace("/admin/students");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't delete." });
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <Link href="/admin/students" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
        <ChevronLeft size={14} /> All students
      </Link>
      <PageTitle kicker={`${data.registration.email} · ${data.selectedCount}/3 selected`} title={data.registration.fullName}>
        <Btn tone="sindoor" busy={busy === "delete"} onClick={remove}>Delete</Btn>
      </PageTitle>

      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <section>
          <h2 className="display-md border-b-2 border-ink pb-2 text-3xl">Event status</h2>
          <ul>
            {data.entries.map((e) => {
              const ev = getEventByKey(e.eventKey);
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b border-ink/10 py-3">
                  <span>
                    <span className="label block text-ink-soft">{SLOT_LABEL[e.slot]}</span>
                    <span className="font-bold">{ev ? eventLabel(ev) : e.eventKey}</span>
                  </span>
                  <StatusBadge status={e.status} />
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">Change statuses from Participants. Events that are already selected can&apos;t be removed below.</p>
        </section>
        <div className="border-2 border-ink bg-white p-3">
          <QrPass uid={uid} size={200} />
        </div>
      </div>

      <RegistrationFields data={form} update={update} errors={errors} disabled={!!busy} email={data.registration.email} />

      <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink pt-6">
        <Btn tone="blue" busy={busy === "save"} onClick={save}>Save changes</Btn>
        {msg && <p className={msg.ok ? "font-semibold text-peacock" : "font-semibold text-sindoor"}>{msg.text}</p>}
      </div>
    </div>
  );
}
