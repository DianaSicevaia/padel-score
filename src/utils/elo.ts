// Shared Elo constants/formula — used by both regular matches (stores/matches.ts)
// and tournaments (stores/tournaments.ts, utils/tournamentRatings.ts) so the
// two systems can never drift apart on how rating changes are computed.
export const ELO_K = 32
export const ELO_START_RATING = 1000

export function expectedScore(myAvg: number, oppAvg: number): number {
  return 1 / (1 + Math.pow(10, (oppAvg - myAvg) / 400))
}

export type MatchOutcome = 'win' | 'loss' | 'draw'

// A draw counts as `actual = 0.5` — same Elo math as a win/loss, just aimed
// at the midpoint. A favorite who draws a weaker opponent still loses
// rating (0.5 < their expected score); the underdog gains it.
export function outcomeActual(outcome: MatchOutcome): number {
  return outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0
}

export function outcomeFromScores(myScore: number, oppScore: number): MatchOutcome {
  if (myScore > oppScore) return 'win'
  if (myScore < oppScore) return 'loss'
  return 'draw'
}
