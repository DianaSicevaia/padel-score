import { START_RATING } from '@/stores/users'

const NTRP_MIN = 1.0
const NTRP_MAX = 7.0
const NTRP_AT_START_RATING = 2.5
const RATING_POINTS_PER_NTRP_STEP = 400

// Approximates an NTRP (1.0-7.0) skill level from our internal ELO-style
// rating, purely for display — it isn't a real self-assessed NTRP rating.
export function ratingToNtrp(rating: number): number {
  const raw = NTRP_AT_START_RATING + (rating - START_RATING) / RATING_POINTS_PER_NTRP_STEP
  const clamped = Math.min(NTRP_MAX, Math.max(NTRP_MIN, raw))
  return Math.round(clamped * 2) / 2
}

export function formatNtrp(rating: number): string {
  return ratingToNtrp(rating).toFixed(1)
}

// Inverse of ratingToNtrp - used to seed/reset the internal rating from a
// self-assessed NTRP level (at registration, or a later manual correction).
export function ntrpToRating(ntrp: number): number {
  const clamped = Math.min(NTRP_MAX, Math.max(NTRP_MIN, ntrp))
  return Math.round(START_RATING + (clamped - NTRP_AT_START_RATING) * RATING_POINTS_PER_NTRP_STEP)
}

export const NTRP_OPTIONS: number[] = Array.from(
  { length: Math.round((NTRP_MAX - NTRP_MIN) / 0.5) + 1 },
  (_, i) => Math.round((NTRP_MIN + i * 0.5) * 2) / 2,
)
