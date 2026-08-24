import type { Tournament } from '@/stores/tournaments'
import { SIT_OUT_FRACTIONS } from '@/utils/tournamentRules'

export interface Standing {
  id: string
  points: number
  wins: number
  ties: number
  losses: number
}

export function sitOutPointsFor(tournament: Tournament): number {
  if (tournament.sitOutOption === 'none') return 0
  if (tournament.sitOutOption === 'custom') return tournament.sitOutCustomValue ?? 0
  if (tournament.pointsPerRound === 'unlimited') return 0
  return Math.round(tournament.pointsPerRound * SIT_OUT_FRACTIONS[tournament.sitOutOption])
}

export function computeStandings(tournament: Tournament): Standing[] {
  const byId = new Map<string, Standing>()
  const ensure = (id: string): Standing => {
    let s = byId.get(id)
    if (!s) {
      s = { id, points: 0, wins: 0, ties: 0, losses: 0 }
      byId.set(id, s)
    }
    return s
  }

  const sitOutPoints = sitOutPointsFor(tournament)

  for (const round of tournament.schedule ?? []) {
    for (const id of round.sitOutIds) {
      ensure(id).points += sitOutPoints
    }
    for (const m of round.matchups) {
      if (m.score1 === undefined || m.score2 === undefined) continue
      const outcome1 = m.score1 > m.score2 ? 'wins' : m.score1 === m.score2 ? 'ties' : 'losses'
      const outcome2 = m.score2 > m.score1 ? 'wins' : m.score1 === m.score2 ? 'ties' : 'losses'
      for (const id of m.team1) {
        const s = ensure(id)
        s.points += m.score1
        s[outcome1] += 1
      }
      for (const id of m.team2) {
        const s = ensure(id)
        s.points += m.score2
        s[outcome2] += 1
      }
    }
  }

  const standings = Array.from(byId.values())
  standings.sort((a, b) => {
    if (tournament.leaderboardSort === 'wins') {
      return b.wins - a.wins || b.points - a.points
    }
    return b.points - a.points || b.wins - a.wins
  })
  return standings
}

// A round only counts as fully played once every one of its matchups has
// both scores in - sit-outs don't need anything submitted for them.
export function isTournamentFullyScored(tournament: Tournament): boolean {
  const schedule = tournament.schedule
  if (!schedule || schedule.length === 0) return false
  return schedule.every((round) =>
    round.matchups.every((m) => m.score1 !== undefined && m.score2 !== undefined),
  )
}
