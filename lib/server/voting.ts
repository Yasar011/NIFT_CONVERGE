import { db } from "./rtdb";
import type { Adjustment, Tally, VotingSession } from "../api-types";

type VoteMap = Record<string, Record<string, { v: "good" | "reject"; at: number }>>;
type ParticipantMap = Record<string, { name: string; department: string; photoUrl: string; entryId: string; scannedAt: number }>;

export async function getSession(id: string) {
  const s = await db.get<Omit<VotingSession, "id">>(`voting/sessions/${id}`);
  return s ? ({ ...s, id, live: s.live ?? null } as VotingSession) : null;
}

/** Counts votes per participant and applies main-admin adjustments. */
export async function tallies(sessionId: string): Promise<{ tallies: Tally[]; adjustments: Adjustment[] }> {
  const [votes, participants, adj] = await Promise.all([
    db.get<VoteMap>(`voting/votes/${sessionId}`),
    db.get<ParticipantMap>(`voting/participants/${sessionId}`),
    db.get<Record<string, Omit<Adjustment, "id">>>(`voting/adjust/${sessionId}`),
  ]);
  const adjustments = Object.entries(adj ?? {}).map(([id, a]) => ({ ...a, id }));
  const list: Tally[] = Object.entries(participants ?? {}).map(([uid, p]) => {
    const vs = Object.values(votes?.[uid] ?? {});
    const mine = adjustments.filter((a) => a.uid === uid);
    return {
      uid,
      name: p.name,
      department: p.department,
      photoUrl: p.photoUrl,
      good: vs.filter((v) => v.v === "good").length,
      reject: vs.filter((v) => v.v === "reject").length,
      adjGood: mine.reduce((n, a) => n + a.good, 0),
      adjReject: mine.reduce((n, a) => n + a.reject, 0),
    };
  });
  list.sort((a, b) => b.good + b.adjGood - (a.good + a.adjGood));
  return { tallies: list, adjustments: adjustments.sort((a, b) => b.at - a.at) };
}
