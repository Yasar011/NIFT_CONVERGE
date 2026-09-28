"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, ErrorNote, Loading, PageTitle, inputCls, useApi } from "@/components/admin/kit";

interface Item {
  id: string;
  at: number;
  by: string;
  action: string;
  summary: string;
  club?: string | null;
}
interface Page {
  activity: Item[];
  more: boolean;
  oldest: string | null;
}

const TONE: Record<string, string> = {
  final: "bg-peacock text-paper",
  settings: "bg-ink text-paper",
  "vote.adjust": "bg-marigold",
  block: "bg-sindoor text-paper",
  "student.delete": "bg-sindoor text-paper",
  "member.remove": "bg-paper-2",
};

export default function ActivityPage() {
  const { api } = useAuth();
  const { data, error, loading } = useApi<Page>("/api/admin/activity");
  const [older, setOlder] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<{ oldest: string | null; more: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const all = useMemo(() => [...(data?.activity ?? []), ...older], [data, older]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? all.filter((a) => `${a.summary} ${a.by} ${a.action}`.toLowerCase().includes(n)) : all;
  }, [all, q]);
  const state = cursor ?? (data ? { oldest: data.oldest, more: data.more } : null);

  async function loadOlder() {
    if (!state?.oldest) return;
    setBusy(true);
    try {
      const page = await api<Page>(`/api/admin/activity?before=${state.oldest}`);
      setOlder((o) => [...o, ...page.activity]);
      setCursor({ oldest: page.oldest, more: page.more });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle kicker="Who did what" title="Activity log" />
      <label className="relative block max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <span className="sr-only">Filter</span>
        <input className={clsx(inputCls, "pl-9")} placeholder="Filter by name, admin or action" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <ul className="border-t-2 border-ink">
            {shown.map((a) => (
              <li key={a.id} className="grid gap-1 border-b border-ink/10 py-3 sm:grid-cols-[9.5rem_8rem_1fr] sm:gap-4">
                <span className="text-xs tabular-nums text-ink-soft">
                  {new Date(a.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </span>
                <span>
                  <span className={clsx("label inline-block border border-ink px-1.5 py-0.5 text-[0.6rem]", TONE[a.action])}>{a.action}</span>
                </span>
                <span className="text-sm">
                  {a.summary}
                  <span className="block text-xs text-ink-soft">{a.by}</span>
                </span>
              </li>
            ))}
            {!shown.length && <li className="py-8 text-center text-ink-soft">Nothing logged yet.</li>}
          </ul>
          {state?.more && (
            <Btn busy={busy} onClick={loadOlder}>Load older</Btn>
          )}
        </>
      )}
    </div>
  );
}
