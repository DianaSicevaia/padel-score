import type { Match } from '@/stores/matches'
import { courtLabel } from '@/utils/courts'

export function matchFormatLabel(m: Match): string {
  if (!m.matchFormat) return ''
  if (m.matchFormat === 'friendly') return 'Friendly'
  if (m.competitiveScope === 'ranked' && m.rankMin !== undefined && m.rankMax !== undefined) {
    return `Competitive · NTRP ${m.rankMin.toFixed(1)}–${m.rankMax.toFixed(1)}`
  }
  return 'Competitive · Open level'
}

export function matchLocationLabel(m: Match): string {
  const parts = [
    courtLabel(m.court) || m.city,
    m.durationMinutes ? `${m.durationMinutes} min` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}
