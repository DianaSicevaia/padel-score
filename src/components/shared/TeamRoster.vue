<script setup lang="ts">
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'

export interface RosterPlayer {
  id: string
  name: string
  photoUrl?: string | null
  backgroundId?: string | null
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
          <span class="roster-player-name">{{ p.name }}</span>
          <span v-if="p.pending" class="roster-player-badge">Invited</span>
        </div>
        <PlayerAvatar
          :id="p.id"
          :name="p.name"
          :photoUrl="p.photoUrl"
          :backgroundId="p.backgroundId"
          :size="avatarSize"
        />
      </template>
      <template v-else>
        <PlayerAvatar
          :id="p.id"
          :name="p.name"
          :photoUrl="p.photoUrl"
          :backgroundId="p.backgroundId"
          :size="avatarSize"
        />
        <div class="roster-player-info">
          <span class="roster-player-name">{{ p.name }}</span>
          <span v-if="p.pending" class="roster-player-badge">Invited</span>
        </div>
      </template>
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
}

.roster--winner .roster-player-name {
  font-weight: 700;
  color: var(--color-text);
}

.roster--loser .roster-player-name {
  color: var(--color-text-subtle);
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
