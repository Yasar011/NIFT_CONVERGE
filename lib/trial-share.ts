// WhatsApp messages for trials. Opens WhatsApp with the text filled in; the
// admin picks the chat or group and taps send.
import { getEventByKey, eventLabel } from "./events";
import { CATEGORY_META, type EventCategory } from "./types";
import type { Me, Trial } from "./api-types";

const fmtDate = (d: string) =>
  new Date(`${d}T00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
const label = (key: string) => {
  const ev = getEventByKey(key);
  return ev ? eventLabel(ev) : key;
};
const sortKey = (t: Pick<Trial, "date" | "time">) => `${t.date} ${t.time}`;

/** eventKey → id of its first trial (registration for the event closes then). */
export function firstTrials(trials: Trial[]) {
  const out: Record<string, Trial> = {};
  for (const t of trials) if (!out[t.eventKey] || sortKey(t) < sortKey(out[t.eventKey])) out[t.eventKey] = t;
  return Object.fromEntries(Object.entries(out).map(([k, t]) => [k, t.id]));
}

function footer(me: Me, portal: string) {
  const who = me.role === "main_admin" ? "Main admin" : me.club ? `${CATEGORY_META[me.club].label} club` : "Admin";
  return [`ℹ️ For more info and updates, see the portal:`, portal, "", `— Sent by ${me.name || me.email} (${who})`];
}

/** One trial. */
export function trialMessage(t: Trial, me: Me, portal: string, isFirst: boolean) {
  const ev = label(t.eventKey);
  return [
    "*NIFT Jodhpur × CONVERGE 2026*",
    "",
    `🗓 *${ev} — ${t.title}*`,
    `📅 ${fmtDate(t.date)} · ${fmtTime(t.time)}`,
    `📍 ${t.venue}`,
    ...(t.notes ? [`📝 ${t.notes}`] : []),
    ...(isFirst ? ["", `⚠️ Registration for ${ev} closes when this trial starts — register before that.`] : []),
    "",
    ...footer(me, portal),
  ].join("\n");
}

/** Several trials in one message, grouped by day. */
export function trialsMessage(trials: Trial[], me: Me, portal: string, first: Record<string, string>, club?: EventCategory | "") {
  const lines = ["*NIFT Jodhpur × CONVERGE 2026*", `*Upcoming trials${club ? ` — ${CATEGORY_META[club].label}` : ""}*`];
  let day = "";
  for (const t of [...trials].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))) {
    if (t.date !== day) {
      day = t.date;
      lines.push("", `📅 *${fmtDate(t.date)}*`);
    }
    lines.push(`• ${fmtTime(t.time)} — *${label(t.eventKey)}*: ${t.title} · 📍 ${t.venue}`);
    if (t.notes) lines.push(`   _${t.notes}_`);
    if (first[t.eventKey] === t.id) lines.push(`   ⚠️ Last chance to register for ${label(t.eventKey)}`);
  }
  lines.push("", ...footer(me, portal));
  return lines.join("\n");
}

export function openWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
