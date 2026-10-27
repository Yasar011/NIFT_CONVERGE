"use client";

import { useState } from "react";
import { Check, Lock, Ruler } from "lucide-react";
import clsx from "clsx";
import { useAuth, ApiError } from "./auth/AuthProvider";
import { KIT_COLOURS, KIT_EXTRAS, KIT_IMAGE, KIT_ITEMS, kitComplete, type KitSizes } from "@/lib/kit";

const control =
  "w-full border-2 border-ink bg-paper px-3 py-2.5 text-base text-ink focus:bg-[#fffaf1] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const empty = () => Object.fromEntries(KIT_ITEMS.map((i) => [i.key, ""])) as KitSizes;

/**
 * The jersey kit for students in the final list: what they get, NIFT Jodhpur's
 * colours, the rulebook size chart, and their sizes. Admins pass `forUid`.
 */
export default function KitCard({
  kit,
  locked,
  forUid,
  onSaved,
}: {
  kit?: Partial<KitSizes> | null;
  locked?: boolean;
  forUid?: string;
  onSaved?: () => void;
}) {
  const { api, refresh } = useAuth();
  const [sizes, setSizes] = useState<KitSizes>({ ...empty(), ...(kit ?? {}) });
  const [chart, setChart] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = kitComplete(kit);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api("/api/me/kit", { method: "PUT", body: { ...sizes, ...(forUid ? { forUid } : {}) } });
      setMsg({ ok: true, text: "Sizes saved." });
      if (onSaved) onSaved();
      else await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="kit" className="scroll-mt-24 border-2 border-ink bg-paper">
      <div className="grid gap-0 md:grid-cols-[minmax(0,14rem)_1fr]">
        <div className="border-b-2 border-ink bg-[#f6f3dc] p-4 md:border-r-2 md:border-b-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={KIT_IMAGE} alt="NIFT Jodhpur Converge 2026 kit: mustard jacket, T-shirt with maroon panel, shorts, cap and track pant" className="mx-auto w-full max-w-[12rem]" />
          <p className="mt-2 text-center text-xs text-ink-soft">NIFT Jodhpur kit · from the rulebook</p>
        </div>

        <div className="p-5">
          <p className="label flex items-center gap-2">
            Your Converge kit
            {done && (
              <span className="inline-flex items-center gap-1 bg-peacock px-2 py-0.5 text-[10px] text-paper">
                <Check size={11} strokeWidth={3} /> Sizes in
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Everyone in the final contingent gets the full jersey kit in NIFT Jodhpur&apos;s colours: T-shirt, shorts, jacket,
            track pant and cap.
          </p>

          <div className="mt-4 flex flex-wrap gap-4">
            {KIT_COLOURS.map((c) => (
              <div key={c.hex} className="flex items-center gap-3">
                <span className="h-10 w-10 shrink-0 border-2 border-ink" style={{ background: c.hex }} aria-hidden />
                <span className="text-sm leading-tight">
                  <span className="label block text-ink-soft">{c.role}</span>
                  <strong>{c.name}</strong>
                  <span className="block text-xs text-ink-soft">{c.pantone}</span>
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={save} className="mt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {KIT_ITEMS.map((item) => (
                <div key={item.key}>
                  <label htmlFor={`kit-${item.key}`} className="label mb-1.5 flex items-center justify-between gap-2">
                    {item.name}
                    <button
                      type="button"
                      onClick={() => setChart(chart === item.key ? null : item.key)}
                      aria-expanded={chart === item.key}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] normal-case tracking-normal underline underline-offset-2"
                    >
                      <Ruler size={12} /> Size chart
                    </button>
                  </label>
                  <select
                    id={`kit-${item.key}`}
                    disabled={locked}
                    className={clsx(control, errors[item.key] && "border-sindoor")}
                    value={sizes[item.key]}
                    onChange={(e) => setSizes({ ...sizes, [item.key]: e.target.value })}
                  >
                    <option value="">Choose size</option>
                    {item.sizes.map((s, i) => (
                      <option key={s} value={s}>
                        {s} — {item.head[0].toLowerCase()} {item.rows[i][0]}&quot;
                      </option>
                    ))}
                  </select>
                  {errors[item.key] && <p className="mt-1 text-xs font-semibold text-sindoor">{errors[item.key]}</p>}
                  {chart === item.key && <SizeChart item={item} />}
                  <p className="mt-1 text-xs text-ink-soft">{item.fabric}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-soft">{KIT_EXTRAS.join(" · ")}. All measurements in inches.</p>

            {locked ? (
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <Lock size={14} /> Sizes are locked — the final list has been submitted. Contact the main admin to change them.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="cursor-pointer border-2 border-ink bg-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-paper disabled:opacity-50"
                >
                  {busy ? "Saving…" : done ? "Update sizes" : "Save sizes"}
                </button>
                {msg && <p className={clsx("text-sm font-semibold", msg.ok ? "text-peacock" : "text-sindoor")}>{msg.text}</p>}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

function SizeChart({ item }: { item: (typeof KIT_ITEMS)[number] }) {
  return (
    <div className="mt-2 overflow-x-auto border-2 border-ink">
      <table className="w-full text-xs tabular-nums">
        <thead className="bg-paper-2">
          <tr>
            <th className="px-2 py-1.5 text-left">Size</th>
            {item.head.map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {item.rows.map((r, i) => (
            <tr key={item.sizes[i]} className="border-t border-ink/15">
              <td className="px-2 py-1 font-bold">{item.sizes[i]}</td>
              {r.map((v, j) => (
                <td key={j} className="px-2 py-1">{v}&quot;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
