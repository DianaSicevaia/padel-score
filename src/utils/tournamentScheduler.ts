export interface ScheduledMatchup {
  court: number
  team1: [string, string]
  team2: [string, string]
}

export interface ScheduledRound {
  index: number
  matchups: ScheduledMatchup[]
  sitOutIds: string[]
}

function chunkIntoFours(players: string[]): string[][] {
  const groups: string[][] = []
  for (let i = 0; i + 4 <= players.length; i += 4) {
    groups.push(players.slice(i, i + 4))
  }
  return groups
}

// A group of 4 has exactly 3 distinct ways to split into two teams of 2
// cycling through them by round index is what reproduces the textbook
// Americano partner rotation (verified against a 4-player/1-court/3-round
// example: round1 AB-CD, round2 AC-BD, round3 AD-BC).
function splitGroup(group: string[], patternIndex: number, court: number): ScheduledMatchup {
  const [p0, p1, p2, p3] = group as [string, string, string, string]
  if (patternIndex === 0) return { court, team1: [p0, p1], team2: [p2, p3] }
  if (patternIndex === 1) return { court, team1: [p0, p2], team2: [p1, p3] }
  return { court, team1: [p0, p3], team2: [p1, p2] }
}

// Generates a deterministic round-by-round schedule for a fixed roster.
// Each round: rotate the roster by the round index, take the sit-outs off
// the tail of the rotation (so both who sits out AND who ends up grouped
// with whom vary round to round), then chunk the rest into courts of 4 and
// split each court with the round's partner pattern. Not a perfect
// non-repeating design for every N/court/round combination (that's the
// social-golfer problem - out of scope here), but it exactly matches the
// simple cases and gives reasonable partner/opponent variety generally.
// internal cry, as a non-padel-player it hurts my brain to dig into all this
// my friends'd better really appreaciate the effort -_-
export function generateSchedule(
  rosterIds: string[],
  totalRounds: number,
  courtsInPlay: number,
): ScheduledRound[] {
  const n = rosterIds.length
  const playingPerRound = Math.min(courtsInPlay * 4, Math.floor(n / 4) * 4)
  if (playingPerRound < 4) return []

  const rounds: ScheduledRound[] = []
  for (let r = 0; r < totalRounds; r++) {
    const rotated = rosterIds.map((_, i) => rosterIds[(i + r) % n]!)
    const playing = rotated.slice(0, playingPerRound)
    const sitOutIds = rotated.slice(playingPerRound)
    const patternIndex = r % 3
    const matchups = chunkIntoFours(playing).map((group, gi) =>
      splitGroup(group, patternIndex, gi + 1),
    )
    rounds.push({ index: r + 1, matchups, sitOutIds })
  }
  return rounds
}
