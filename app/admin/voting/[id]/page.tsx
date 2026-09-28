"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, ExternalLink, QrCode } from "lucide-react";
import QrImage from "@/components/QrImage";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, SESSION_TONE, inputCls, useApi } from "@/components/admin/kit";
import type { Adjustment, Tally, VotingSession } from "@/lib/api-types";

interface Detail {
  session: VotingSession;
  tallies: Tally[];
  adjustments: Adjustment[];
}

export default function VotingRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, api } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Detail>(`/api/admin/voting/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isMain = me?.user.role === "main_admin";

  // Refresh counts every 4s while the round is running.
  const running = data?.session.status === "running";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, [running, reload]);

  async function act(action: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(action);
    setActionError(null);
    try {
      await api(`/api/admin/voting/${id}`, { method: "PATCH", body: { action } });
      if (action === "delete") router.replace("/admin/voting");
      else await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorNote>{error}</ErrorNote>;
  const s = data.session;

  return (
    <div className="space-y-8">
      <Link href="/admin/voting" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
        <ChevronLeft size={14} /> All rounds
      </Link>
      <PageTitle kicker={`${s.eventName} · ${s.date}`} title={s.title}>
        <span className={clsx("label border-2 px-2 py-1", SESSION_TONE[s.status])}>{s.status}</span>
      </PageTitle>

      <div className="flex flex-wrap gap-3">
        {(s.status === "scheduled" || s.status === "running") && (
          <Link
            href={`/admin/scan?event=${encodeURIComponent(s.eventKey)}&session=${s.id}`}
            className="inline-flex items-center gap-2 border-2 border-ink bg-blue px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-paper"
          >
            <QrCode size={14} /> Open scanner
          </Link>
        )}
        {s.live && <Btn busy={busy === "stop"} onClick={() => act("stop")}>Stop voting for {s.live.name.split(" ")[0]}</Btn>}
        {(s.status === "running" || s.status === "scheduled") && (
          <Btn tone="ink" busy={busy === "end"} onClick={() => act("end", "End this round? Nobody can vote after this.")}>End round</Btn>
        )}
        {s.status === "ended" && (
          <>
            <Btn tone="peacock" busy={busy === "publish"} onClick={() => act("publish", "Publish the ranking and Good votes to everyone?")}>Publish results</Btn>
            <Btn busy={busy === "reopen"} onClick={() => act("reopen")}>Reopen</Btn>
          </>
        )}
        {s.status === "published" && isMain && (
          <Btn busy={busy === "unpublish"} onClick={() => act("unpublish", "Take the published results down?")}>Unpublish</Btn>
        )}
        {(s.status === "scheduled" || s.status === "ended") && (
          <Btn tone="sindoor" busy={busy === "delete"} onClick={() => act("delete", "Delete this round and all its votes? This can't be undone.")}>Delete</Btn>
        )}
      </div>
      {actionError && <ErrorNote>{actionError}</ErrorNote>}

      {s.publicId && s.status !== "published" && <PublicLink publicId={s.publicId} />}

      {s.live && (
        <div className="flex items-center gap-4 border-2 border-ink bg-rani p-4 text-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.live.photoUrl} alt="" className="h-20 w-20 border-2 border-paper object-cover" />
          <div>
            <p className="label opacity-80">Live now</p>
            <p className="display text-4xl">{s.live.name}</p>
            <p className="text-sm opacity-85">{s.live.department}</p>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h2 className="display-md text-3xl">Counts</h2>
          <p className="text-xs text-ink-soft">Only admins see these. Rejects are never published.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="border-b border-ink/20">
                <th className="label py-2 text-ink-soft">Performer</th>
                <th className="label py-2 text-right text-ink-soft">Good</th>
                <th className="label py-2 text-right text-ink-soft">Reject</th>
                <th className="label py-2 text-right text-ink-soft">Adjusted</th>
                <th className="label py-2 text-right">Final Good</th>
              </tr>
            </thead>
            <tbody>
              {data.tallies.map((t) => (
                <tr key={t.uid} className={clsx("border-b border-ink/10", s.live?.uid === t.uid && "bg-rani/10")}>
                  <td className="py-2.5">
                    <span className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.photoUrl} alt="" className="h-10 w-10 border border-ink object-cover" />
                      <span>
                        <span className="block font-bold">{t.name}</span>
                        <span className="text-xs text-ink-soft">{t.department}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{t.good}</td>
                  <td className="py-2.5 text-right tabular-nums">{t.reject}</td>
                  <td className="py-2.5 text-right text-sm tabular-nums text-ink-soft">
                    {t.adjGood || t.adjReject ? `${fmt(t.adjGood)} / ${fmt(t.adjReject)}` : "—"}
                  </td>
                  <td className="display py-2.5 text-right text-2xl tabular-nums">{t.good + t.adjGood}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.tallies.length && <p className="py-8 text-center text-ink-soft">Scan a performer to start voting.</p>}
        </div>
      </section>

      {isMain && data.tallies.length > 0 && s.status !== "published" && (
        <AdjustForm sessionId={id} tallies={data.tallies} onDone={reload} />
      )}

      {isMain && data.adjustments.length > 0 && (
        <section>
          <h2 className="display-md border-b-2 border-ink pb-2 text-3xl">Adjustment log</h2>
          <ul>
            {data.adjustments.map((a) => (
              <li key={a.id} className="border-b border-ink/10 py-2.5 text-sm">
                <strong>{data.tallies.find((t) => t.uid === a.uid)?.name ?? a.uid}</strong>: Good {fmt(a.good)}, Reject {fmt(a.reject)} — “{a.reason}”
                <span className="block text-xs text-ink-soft">
                  {a.by} · {new Date(a.at).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

function AdjustForm({ sessionId, tallies, onDone }: { sessionId: string; tallies: Tally[]; onDone: () => void }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ uid: "", good: "0", reject: "0", reason: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/voting/${sessionId}/adjust`, {
        body: { uid: form.uid, good: Number(form.good), reject: Number(form.reject), reason: form.reason },
      });
      setForm({ uid: "", good: "0", reject: "0", reason: "" });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't adjust.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-2 border-ink bg-paper p-5">
      <p className="label">Adjust votes (main admin)</p>
      <p className="mt-1 text-sm text-ink-soft">Use a negative number to remove votes. Every change is logged with your email.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_6rem_6rem_1fr_auto] md:items-end">
        <label>
          <span className="label mb-1.5 block text-ink-soft">Performer</span>
          <select required className={inputCls} value={form.uid} onChange={(e) => setForm({ ...form, uid: e.target.value })}>
            <option value="">Choose</option>
            {tallies.map((t) => (
              <option key={t.uid} value={t.uid}>{t.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label mb-1.5 block text-ink-soft">Good ±</span>
          <input type="number" className={inputCls} value={form.good} onChange={(e) => setForm({ ...form, good: e.target.value })} />
        </label>
        <label>
          <span className="label mb-1.5 block text-ink-soft">Reject ±</span>
          <input type="number" className={inputCls} value={form.reject} onChange={(e) => setForm({ ...form, reject: e.target.value })} />
        </label>
        <label>
          <span className="label mb-1.5 block text-ink-soft">Reason</span>
          <input required className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Jury votes" />
        </label>
        <Btn tone="ink" type="submit" busy={busy}>Apply</Btn>
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-sindoor">{err}</p>}
    </form>
  );
}

function PublicLink({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/v/${publicId}` : `${window.location.origin}/v/${publicId}`;
  return (
    <section className="grid gap-5 border-2 border-ink bg-paper p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="justify-self-center border-2 border-ink bg-white p-2">
        <QrImage value={url} size={170} label="QR code for the public voting link" />
      </div>
      <div className="min-w-0">
        <p className="label">Voting link — voters sign in with their NIFT account</p>
        <p className="mt-2 break-all font-mono text-sm">{url}</p>
        <p className="mt-2 text-sm text-ink-soft">
          Share it in groups or project the QR on screen. Each NIFT account gets one vote per performer.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy size={14} /> {copied ? "Copied" : "Copy link"}
          </Btn>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-paper-2">
            <ExternalLink size={14} /> Open
          </a>
        </div>
      </div>
    </section>
  );
}
