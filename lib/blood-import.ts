// Turns a pasted list ("12 Neva Mariya James O-", "43. Shasransu AB+") into
// blood groups matched to final-list students. Used by the Documents page.
import type { BloodGroup } from "./documents";

export interface PastedLine {
  line: string;
  name: string;
  bloodGroup: BloodGroup | null;
}

const words = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

/** One entry per non-empty line; blood group read from the end ("B+", "b -", "O positive", "AB-ve"). */
export function parseBloodList(text: string): PastedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.replace(/[​-‍⁠﻿]/g, "").replace(/[−–—]/g, "-").trim())
    .filter(Boolean)
    .map((line) => {
      const body = line.replace(/^\s*\d+\s*[.)\-:]?\s*/, "");
      const m = body.match(/\b(AB|A|B|O)\s*(\+|-|positive|negative|pos|neg|\+ve|-ve|ve)?\s*$/i);
      let bloodGroup: BloodGroup | null = null;
      let name = body;
      if (m && m[2]) {
        const sign = /^(\+|pos)/i.test(m[2]) ? "+" : /^(-|neg)/i.test(m[2]) ? "-" : null;
        if (sign) bloodGroup = `${m[1].toUpperCase()}${sign}` as BloodGroup;
        name = body.slice(0, m.index).trim();
      }
      return { line, name: name.replace(/[\s,:\-–]+$/, "").trim(), bloodGroup };
    });
}

function editDistance(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return d[b.length];
}

/** How well a pasted name fits a student's name: 0 = no match, higher is better. */
function score(pasted: string[], full: string[]) {
  if (!pasted.length || !full.length) return 0;
  if (pasted.join(" ") === full.join(" ")) return 100;
  let total = 0;
  for (const w of pasted) {
    let best = 0;
    for (const f of full) {
      if (f === w) best = Math.max(best, 10);
      else if (w.length >= 2 && f.startsWith(w)) best = Math.max(best, 7); // "CH" → "Chaudhary"
      else if (w.length >= 5 && editDistance(w, f) <= (w.length >= 8 ? 2 : 1)) best = Math.max(best, 6); // typos
    }
    if (!best) return 0; // every pasted word has to fit somewhere
    total += best;
  }
  // The first name matters most.
  if (pasted[0] === full[0]) total += 5;
  return total;
}

/** Best student for each pasted name: unique winner, or null when none / a tie. */
export function matchStudents<S extends { uid: string; name: string }>(rows: PastedLine[], students: S[]) {
  return rows.map((r) => {
    const p = words(r.name);
    const scored = students.map((s) => ({ s, n: score(p, words(s.name)) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
    const tie = scored.length > 1 && scored[0].n === scored[1].n;
    return { ...r, uid: scored.length && !tie ? scored[0].s.uid : "", options: scored.map((x) => x.s.uid), tie };
  });
}
