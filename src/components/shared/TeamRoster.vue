<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'
import { formatNtrp } from '@/utils/ntrp'

export interface RosterPlayer {
  id: string
  name: string
  photoUrl?: string | null
  backgroundId?: string | null
  rating?: number
  linkUid?: string
  pending?: boolean
  isOpen?: boolean
}

withDefaults(
  defineProps<{
    players: RosterPlayer[]
    align?: 'start' | 'end'
    avatarSize?: number
    winner?: boolean
  }>(),
  { align: 'start', avatarSize: 24 },
)

const isGuest = (p: RosterPlayer) => !p.linkUid && !p.isOpen
const openGuestId = ref<string | null>(null)

const toggleGuestTooltip = (p: RosterPlayer) => {
  if (!isGuest(p)) return
  openGuestId.value = openGuestId.value === p.id ? null : p.id
}

const closeGuestTooltip = () => {
  openGuestId.value = null
}

onMounted(() => document.addEventListener('click', closeGuestTooltip))
onUnmounted(() => document.removeEventListener('click', closeGuestTooltip))
</script>

<template>
  <div
    class="roster"
    :class="{
      'roster--end': align === 'end',
      'roster--winner': winner === true,
      'roster--loser': winner === false,
    }"
  >
    <div
      v-for="p in players"
      :key="p.id"
      class="roster-player"
      :class="{ 'roster-player--open': p.isOpen }"
    >
      <template v-if="align === 'end'">
        <div class="roster-player-info">
          <component
            :is="p.linkUid ? 'router-link' : 'span'"
            :to="p.linkUid ? `/players/${p.linkUid}` : undefined"
            :class="['roster-player-name', { 'is-guest': isGuest(p) }]"
            @click.stop="toggleGuestTooltip(p)"
          >
            {{ p.name }}
          </component>
          <span v-if="p.rating !== undefined" class="roster-player-ntrp"
            >NTRP {{ formatNtrp(p.rating) }}</span
          >
          <span v-if="p.pending" class="roster-player-badge">Invited</span>
        </div>
        <component
          :is="p.linkUid ? 'router-link' : 'div'"
          :to="p.linkUid ? `/players/${p.linkUid}` : undefined"
          :class="{ 'is-guest': isGuest(p) }"
          @click.stop="toggleGuestTooltip(p)"
        >
          <PlayerAvatar
            :id="p.id"
            :name="p.name"
            :photoUrl="p.photoUrl"
            :backgroundId="p.backgroundId"
            :size="avatarSize"
          />
        </component>
      </template>
      <template v-else>
        <component
          :is="p.linkUid ? 'router-link' : 'div'"
          :to="p.linkUid ? `/players/${p.linkUid}` : undefined"
          :class="{ 'is-guest': isGuest(p) }"
          @click.stop="toggleGuestTooltip(p)"
        >
          <PlayerAvatar
            :id="p.id"
            :name="p.name"
            :photoUrl="p.photoUrl"
            :backgroundId="p.backgroundId"
            :size="avatarSize"
          />
        </component>
        <div class="roster-player-info">
          <component
            :is="p.linkUid ? 'router-link' : 'span'"
            :to="p.linkUid ? `/players/${p.linkUid}` : undefined"
            :class="['roster-player-name', { 'is-guest': isGuest(p) }]"
            @click.stop="toggleGuestTooltip(p)"
          >
            {{ p.name }}
          </component>
          <span v-if="p.rating !== undefined" class="roster-player-ntrp"
            >NTRP {{ formatNtrp(p.rating) }}</span
          >
          <span v-if="p.pending" class="roster-player-badge">Invited</span>
        </div>
      </template>

      <div v-if="openGuestId === p.id" class="guest-tooltip">Guest profile</div>
    </div>
  </div>
</template>

<style scoped>
.roster {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.roster--end {
  align-items: flex-end;
}

.roster-player {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  position: relative;
}

.roster-player > a,
.roster-player > div:has(> .player-avatar) {
  display: flex;
  flex-shrink: 0;
  line-height: 0;
}

.roster-player--open .roster-player-name {
  color: var(--color-text-faint);
  font-style: italic;
}

.roster-player-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.roster--end .roster-player-info {
  align-items: flex-end;
}

.roster-player-name {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

a.roster-player-name:hover {
  color: var(--color-accent);
  text-decoration: underline;
}

.is-guest {
  cursor: pointer;
}

.guest-tooltip {
  position: absolute;
  background: #1a1a1a;
  color: var(--color-white);
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 30;
  pointer-events: none;
}

.roster--end .guest-tooltip {
  left: auto;
  right: 0;
}

.roster--winner .roster-player-name {
  font-weight: 700;
  color: var(--color-text);
}

.roster--loser .roster-player-name {
  color: var(--color-text-subtle);
}

.roster-player-ntrp {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-faint);
}

.roster-player-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  width: fit-content;
}
</style>
