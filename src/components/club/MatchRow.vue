<script setup lang="ts">
import { ref } from 'vue'
import type { Match } from '@/stores/matches'
import type { Player } from '@/stores/players'
import { useUsersStore } from '@/stores/users'
import TeamRoster from '@/components/shared/TeamRoster.vue'
import type { RosterPlayer } from '@/components/shared/TeamRoster.vue'

const props = defineProps<{
  match: Match
  isDeleting: boolean
  isEditing: boolean
  players: Player[]
}>()

const emit = defineEmits<{
  edit: [match: Match]
  delete: [matchId: string]
}>()

const usersStore = useUsersStore()
const expanded = ref(false)

const resolveRoster = (ids: string[], names?: string[]): RosterPlayer[] =>
  ids.map((id, i) => {
    const player = props.players.find((p) => p.id === id)
    const profile = player?.uid ? usersStore.allUsers.find((u) => u.uid === player.uid) : undefined
    return {
      id,
      name: names?.[i] ?? player?.name ?? id,
      photoUrl: profile?.photoUrl,
      backgroundId: profile?.avatarBackground,
      rating: profile?.rating,
      linkUid: profile?.uid,
    }
  })

const displaySets = (match: Match) =>
  match.sets && match.sets.length > 0
    ? match.sets
    : [{ scoreA: match.scoreA, scoreB: match.scoreB }]

const setsWon = (match: Match) => {
  const sets = displaySets(match)
  return {
    a: sets.filter((s) => s.scoreA > s.scoreB).length,
    b: sets.filter((s) => s.scoreB > s.scoreA).length,
  }
}

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
</script>

<template>
  <div class="match-row" :class="{ 'match-row--editing': isEditing }">
    <div class="match-row-main">
      <div class="match-teams-display">
        <TeamRoster
          class="match-team-roster"
          :players="resolveRoster(match.teamA, match.teamANames)"
          align="start"
          :avatarSize="22"
          :winner="match.winnerTeam === 'A'"
        />
        <div class="match-score-block">
          <template v-if="displaySets(match).length > 1">
            <button
              class="match-score-summary"
              :class="{ 'match-score-summary--open': expanded }"
              type="button"
              @click.stop="expanded = !expanded"
            >
              <span :class="match.winnerTeam === 'A' ? 'sp-win' : 'sp-lose'">{{
                setsWon(match).a
              }}</span>
              <span class="sp-sep">:</span>
              <span :class="match.winnerTeam === 'B' ? 'sp-win' : 'sp-lose'">{{
                setsWon(match).b
              }}</span>
              <svg
                class="score-chevron"
                :class="{ 'score-chevron--open': expanded }"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </template>
          <template v-else>
            <span v-for="s in displaySets(match)" :key="s.scoreA" class="set-pill">
              <span :class="s.scoreA > s.scoreB ? 'sp-win' : 'sp-lose'">{{ s.scoreA }}</span>
              <span class="sp-sep">:</span>
              <span :class="s.scoreB > s.scoreA ? 'sp-win' : 'sp-lose'">{{ s.scoreB }}</span>
            </span>
          </template>
        </div>
        <TeamRoster
          class="match-team-roster"
          :players="resolveRoster(match.teamB, match.teamBNames)"
          align="end"
          :avatarSize="22"
          :winner="match.winnerTeam === 'B'"
        />
      </div>
      <span class="match-date-label">{{ formatDate(match.createdAt) }}</span>
      <div class="match-row-actions">
        <button
          class="btn-icon"
          title="Edit match"
          :disabled="isDeleting"
          @click="emit('edit', match)"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
        <button
          class="btn-icon btn-icon-danger"
          title="Delete match"
          :disabled="isDeleting"
          @click="emit('delete', match.id)"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
    <div v-if="displaySets(match).length > 1 && expanded" class="sets-detail">
      <div v-for="(s, si) in displaySets(match)" :key="si" class="sets-detail-item">
        <span class="sets-detail-num">{{ si + 1 }}</span>
        <span :class="s.scoreA > s.scoreB ? 'sp-win' : 'sp-lose'">{{ s.scoreA }}</span>
        <span class="sp-sep">:</span>
        <span :class="s.scoreB > s.scoreA ? 'sp-win' : 'sp-lose'">{{ s.scoreB }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-row {
  display: flex;
  flex-direction: column;
}

.match-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  gap: 16px;
}

.match-teams-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.match-score-block {
  flex-shrink: 0;
}

.match-score-summary {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 6px;
  transition: background 0.12s;
}

.match-score-summary:hover,
.match-score-summary--open {
  background: var(--color-bg-soft);
}

.score-chevron {
  color: var(--color-border);
  margin-left: 3px;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.score-chevron--open {
  transform: rotate(180deg);
}

.sets-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 20px 10px;
  border-top: 1px solid var(--color-bg-soft);
}

.sets-detail-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Anton', sans-serif;
  font-size: 16px;
}

.sets-detail-num {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-faintest);
  width: 14px;
  text-align: right;
}

.match-team-roster {
  flex: 1;
  min-width: 0;
}

.set-pill {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 1px;
}

.sp-win {
  color: var(--color-text);
}
.sp-lose {
  color: var(--color-border);
}
.sp-sep {
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  color: var(--color-bg-muted);
  margin: 0 1px;
}

.match-date-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-subtle);
  white-space: nowrap;
  flex-shrink: 0;
  width: 12ch;
  text-align: right;
}

.match-row-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.match-row:hover .match-row-actions {
  opacity: 1;
}

.match-row--editing .match-row-main {
  background: var(--color-bg-subtle);
}
.match-row--editing .sets-detail {
  background: var(--color-bg-subtle);
}
.match-row--editing .match-row-actions {
  opacity: 1;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}

.btn-icon:hover:not(:disabled) {
  background: var(--color-bg-soft);
  color: var(--color-text);
}
.btn-icon-danger:hover:not(:disabled) {
  background: var(--color-danger-bg-hover);
  color: var(--color-danger-text);
}
.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .match-teams-display {
    gap: 8px;
  }

  .match-row-main {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .match-date-label {
    width: auto;
    text-align: center;
  }
}
</style>
