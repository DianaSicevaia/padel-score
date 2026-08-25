import type { Match } from '@/stores/matches'
import { courtLabel } from '@/utils/courts'

// 'men'/'women' read as "guys"/"girls" in casual copy ("For guys only").
export function genderPrefWord(pref: 'men' | 'women'): string {
  return pref === 'men' ? 'guys' : 'girls'
}

export function matchFormatLabel(m: Match): string {
  const parts: string[] = []
  if (m.matchFormat === 'friendly') {
    parts.push('Friendly')
  } else if (m.matchFormat === 'competitive') {
    if (m.competitiveScope === 'ranked' && m.rankMin !== undefined && m.rankMax !== undefined) {
      parts.push(`Competitive · NTRP ${m.rankMin.toFixed(1)}–${m.rankMax.toFixed(1)}`)
    } else {
      parts.push('Competitive · Open level')
    }
  }
  if (m.genderPreference && m.genderPreference !== 'mixed') {
    parts.push(m.genderPreference === 'men' ? 'Guys only' : 'Girls only')
  }
  return parts.join(' · ')
}

export function matchLocationLabel(m: Match): string {
  const parts = [
    courtLabel(m.court) || m.city,
    m.durationMinutes ? `${m.durationMinutes} min` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}
