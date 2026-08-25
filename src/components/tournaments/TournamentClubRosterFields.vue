<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/stores/players'

// Club tournaments pick players exclusively from the club roster
const selectedIds = defineModel<string[]>('selectedIds', { required: true })

const props = defineProps<{
  players: Player[]
  excludePlayerId?: string
  remainingSlots: number
}>()

const available = computed(() => props.players.filter((p) => p.id !== props.excludePlayerId))
const atCap = computed(() => props.remainingSlots <= 0)
const isSelected = (id: string) => selectedIds.value.includes(id)

const toggle = (id: string) => {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
    return
  }
  if (atCap.value) return
  selectedIds.value = [...selectedIds.value, id]
}
</script>

<template>
  <div class="club-roster-fields">
    <div class="roster-label-row">
      <label class="field-label">Club players</label>
      <span class="roster-count" :class="{ 'roster-count--full': atCap }">
        {{
          atCap ? 'Roster full' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`
        }}
      </span>
    </div>

    <p v-if="available.length === 0" class="empty-note">No other players in this club yet.</p>
    <div v-else class="player-toggle-list">
      <button
        v-for="p in available"
        :key="p.id"
        type="button"
        class="player-toggle"
        :class="{ 'player-toggle--active': isSelected(p.id) }"
        :disabled="!isSelected(p.id) && atCap"
        @click="toggle(p.id)"
      >
        {{ p.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.club-roster-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.roster-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.roster-count {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.roster-count--full {
  color: var(--color-danger);
}

.empty-note {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0;
}

.player-toggle-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.player-toggle {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-white);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.12s;
}

.player-toggle:hover:not(:disabled) {
  border-color: var(--color-accent-border);
}

.player-toggle--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.player-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
