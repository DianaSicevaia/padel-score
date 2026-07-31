import greenCourt from '@/assets/greenCourt.png'
import lightBlueCourt from '@/assets/lightBlueCourt.png'
import lightGreenCourt from '@/assets/lightGreenCourt.png'
import orangeCourt from '@/assets/orangeCourt.png'
import violetCourt from '@/assets/violetCourt.png'

export interface AvatarBackground {
  id: string
  label: string
  src: string
}

export const AVATAR_BACKGROUNDS: AvatarBackground[] = [
  { id: 'green', label: 'Green', src: greenCourt },
  { id: 'lightBlue', label: 'Light blue', src: lightBlueCourt },
  { id: 'lightGreen', label: 'Light green', src: lightGreenCourt },
  { id: 'orange', label: 'Orange', src: orangeCourt },
  { id: 'violet', label: 'Violet', src: violetCourt },
]

// Deterministic pick so the same player always gets the same background
// (rather than a new random one on every re-render) when they haven't
// chosen one for themselves.
export function avatarBackgroundFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % AVATAR_BACKGROUNDS.length
  return AVATAR_BACKGROUNDS[idx]!.src
}

export function avatarBackgroundById(id: string | null | undefined): string | undefined {
  return AVATAR_BACKGROUNDS.find((b) => b.id === id)?.src
}
