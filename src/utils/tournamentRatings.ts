import type { TournamentRound } from '@/stores/tournaments'
import { ELO_K, ELO_START_RATING, expectedScore, outcomeActual, outcomeFromScores } from '@/utils/elo'

export interface TournamentRatingUpdate {
  id: string
  rating: number
  matchesPlayed: number
  wins: number
  losses: number
}

// Walks a completed tournament's rounds in score order, applying the same
// K=32 Elo model as a regular 2v2 match to every scored matchup — each
// matchup rates its two teams off their *running* average (updated after
// every prior matchup), so a tournament plays out as a sequence of small
// Elo steps rather than one lump-sum adjustment at the end. Sit-out rounds
// don't touch rating, only the separately-tracked leaderboard points.
export function computeTournamentRatingUpdates(
  schedule: TournamentRound[],
  startingRatings: Map<string, number>,
): TournamentRatingUpdate[] {
  const state = new Map<string, TournamentRatingUpdate>()
  const get = (id: string): TournamentRatingUpdate =>
    state.get(id) ?? {
      id,
      rating: startingRatings.get(id) ?? ELO_START_RATING,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
    }
  const apply = (entry: TournamentRatingUpdate, delta: number, outcome: 'win' | 'loss' | 'draw') => {
    state.set(entry.id, {
      id: entry.id,
      rating: Math.max(100, entry.rating + delta),
      matchesPlayed: entry.matchesPlayed + 1,
      wins: entry.wins + (outcome === 'win' ? 1 : 0),
      losses: entry.losses + (outcome === 'loss' ? 1 : 0),
    })
  }

  const sortedRounds = [...schedule].sort((a, b) => a.index - b.index)
  for (const round of sortedRounds) {
    for (const m of round.matchups) {
      if (m.score1 === undefined || m.score2 === undefined) continue

      const p1a = get(m.team1[0])
      const p1b = get(m.team1[1])
      const p2a = get(m.team2[0])
      const p2b = get(m.team2[1])
      const avg1 = (p1a.rating + p1b.rating) / 2
      const avg2 = (p2a.rating + p2b.rating) / 2

      const outcome1 = outcomeFromScores(m.score1, m.score2)
      const outcome2 = outcomeFromScores(m.score2, m.score1)
      const delta1 = Math.round(ELO_K * (outcomeActual(outcome1) - expectedScore(avg1, avg2)))
      const delta2 = Math.round(ELO_K * (outcomeActual(outcome2) - expectedScore(avg2, avg1)))

      apply(p1a, delta1, outcome1)
      apply(p1b, delta1, outcome1)
      apply(p2a, delta2, outcome2)
      apply(p2b, delta2, outcome2)
    }
  }

  return Array.from(state.values())
}
