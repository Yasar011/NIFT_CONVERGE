"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";
import { PICKABLE_EVENTS, eventKey, eventLabel, getEventByKey } from "@/lib/events";
import { CATEGORY_META, CATEGORY_ORDER, type EventCategory } from "@/lib/types";
import type { Announcement } from "@/lib/api-types";

function audienceLabel(a: string, uids?: string[]) {
  if (a === "students") return `${uids?.length ?? 0} selected student${uids?.length === 1 ? "" : "s"}`;
  if (a === "all") return "Everyone";
  if (a.startsWith("club:")) return `All of ${CATEGORY_META[a.slice(5) as EventCategory]?.label}`;
  const ev = getEventByKey(a);
  return ev ? eventLabel(ev) : a;
}

export default function AnnouncementsPage() {
  const { me, api } = useAuth();
  const isMain = me?.user.role === "main_admin";
  const clubs = CATEGORY_ORDER.filter((c) => isMain || c === me?.user.club);
  const { data, error, loading, reload } = useApi<{ announcements: Announcement[] }>("/api/admin/announcements");
  const [form, setForm] = useState({ title: "", body: "", audience: isMain ? "all" : `club:${me?.user.club}` });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy("post");
    setMsg(null);
    try {
      await api("/api/admin/announcements", { body: form });
      setForm((f) => ({ ...f, title: "", body: "" }));
      setMsg({ ok: true, text: "Posted. Students see it on My Converge." });
      reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't post." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(a: Announcement) {
    if (!confirm(`Remove "${a.title}"?`)) return;
    setBusy(a.id);
    try {
      await api(`/api/admin/announcements?id=${a.id}`, { method: "DELETE" });
      reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle kicker="Tell students" title="Announcements" />

      <form onSubmit={post} className="border-2 border-ink bg-paper p-5">
        <p className="label">New announcement</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label>
            <span className="label mb-1.5 block text-ink-soft">Who should see it</span>
            <select className={inputCls} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {isMain && <option value="all">Everyone registered</option>}
              {clubs.map((c) => (
                <optgroup key={c} label={CATEGORY_META[c].label}>
                  <option value={`club:${c}`}>All of {CATEGORY_META[c].label}</option>
                  {PICKABLE_EVENTS.filter((e) => e.category === c).map((ev) => (
                    <option key={eventKey(ev)} value={eventKey(ev)}>{eventLabel(ev)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span className="label mb-1.5 block text-ink-soft">Title</span>
            <input required maxLength={100} className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Basketball trials moved to 5 pm" />
          </label>
          <label className="md:col-span-2">
            <span className="label mb-1.5 block text-ink-soft">Message</span>
            <textarea required maxLength={1000} rows={3} className={inputCls} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Btn tone="ink" type="submit" busy={busy === "post"}>Post</Btn>
          {msg && <p className={clsx("text-sm font-semibold", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
        </div>
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <ul className="border-t-2 border-ink">
          {(data?.announcements ?? []).map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 border-b border-ink/15 py-4">
              <span className="min-w-0">
                <span className="label text-ink-soft">
                  {audienceLabel(a.audience, a.uids)} · {new Date(a.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {a.createdBy}
                </span>
                <span className="mt-1 block text-lg font-bold">{a.title}</span>
                <span className="mt-1 block whitespace-pre-line text-ink-soft">{a.body}</span>
              </span>
              <Btn onClick={() => remove(a)} busy={busy === a.id} aria-label={`Remove ${a.title}`}>
                <Trash2 size={14} />
              </Btn>
            </li>
          ))}
          {!data?.announcements.length && <li className="py-8 text-center text-ink-soft">No announcements yet.</li>}
        </ul>
      )}
    </div>
  );
}
