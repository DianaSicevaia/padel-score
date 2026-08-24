export const MIN_PARTICIPANTS = 4
export const MAX_PARTICIPANTS = 20
export const MAX_ROUNDS = 50

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// One court hosts exactly 4 players a round - floor(n / 4), never less than 1.
export function maxCourtsForParticipants(n: number): number {
  return Math.max(1, Math.floor(n / 4))
}

// The smallest round count that splits into a whole number of matches per
// player (so nobody gets an uneven share) - this is also the stepper's
// increment/decrement size and its floor, since anything smaller leaves some
// players with a fractional match count.
export function roundsStep(participants: number, courtsInPlay: number): number {
  if (participants <= 0) return 1
  return participants / gcd(participants, courtsInPlay * 4)
}

export function roundsMin(participants: number, courtsInPlay: number): number {
  return roundsStep(participants, courtsInPlay)
}

export function roundsMax(participants: number, courtsInPlay: number): number {
  const step = roundsStep(participants, courtsInPlay)
  return Math.floor(MAX_ROUNDS / step) * step
}

// One round per participant lands close to 4 matches/player at 1 court —
// except when every court is full every round (courtsInPlay * 4 ===
// participants, so nobody ever sits out), where participants-1 rounds (a
// classic full partner-rotation size) is offered instead. `participants` is
// always itself a multiple of roundsStep, so this is always a valid value;
// in the full-utilization case roundsStep is always 1, so participants-1 is too.
export function roundsDefault(participants: number, courtsInPlay: number): number {
  const isFullUtilization = courtsInPlay * 4 === participants
  return isFullUtilization ? participants - 1 : participants
}

export function matchesPerPlayer(
  rounds: number,
  courtsInPlay: number,
  participants: number,
): number {
  if (participants <= 0) return 0
  return (rounds * courtsInPlay * 4) / participants
}

export function formatMatchesPerPlayer(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export const POINTS_PER_ROUND_OPTIONS = [8, 11, 16, 21, 24, 32, 40] as const

export const SIT_OUT_FRACTIONS: Record<'third' | 'half', number> = {
  third: 1 / 3,
  half: 1 / 2,
}
