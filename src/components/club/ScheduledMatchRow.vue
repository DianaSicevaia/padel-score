<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Match } from '@/stores/matches'
import { useMatchesStore } from '@/stores/matches'
import type { Player } from '@/stores/players'
import { useUsersStore } from '@/stores/users'
import TeamRoster from '@/components/shared/TeamRoster.vue'
import type { RosterPlayer } from '@/components/shared/TeamRoster.vue'
import { matchFormatLabel, matchLocationLabel } from '@/utils/matchDetails'

const props = defineProps<{
  match: Match
  players: Player[]
  currentUid: string | null
  canManage: boolean
}>()

const canPlayNow = () => !props.match.createdBy || props.match.createdBy === props.currentUid

const emit = defineEmits<{
  'play-now': [match: Match]
  'cancel-match': [matchId: string]
}>()

const matchesStore = useMatchesStore()
const usersStore = useUsersStore()

const isEditing = ref(false)
const editDate = ref('')
const editTime = ref('')

const resolveRoster = (ids: string[], names?: string[]): RosterPlayer[] =>
  ids.map((id, i) => {
    const player = props.players.find((p) => p.id === id)
    const profile = player?.uid ? usersStore.allUsers.find((u) => u.uid === player.uid) : undefined
    const pending = !!player?.uid && !!props.match.pendingUids?.includes(player.uid)
    return {
      id,
      name: names?.[i] ?? player?.name ?? id,
      photoUrl: profile?.photoUrl,
      backgroundId: profile?.avatarBackground,
      rating: profile?.rating,
      linkUid: profile?.uid,
      pending,
    }
  })

const teamAPlayers = computed(() => resolveRoster(props.match.teamA, props.match.teamANames))
const teamBPlayers = computed(() => resolveRoster(props.match.teamB, props.match.teamBNames))

const formatScheduled = (ts: number) => {
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

const openEdit = () => {
  if (!props.canManage) return
  const d = new Date(props.match.scheduledAt!)
  editDate.value = d.toISOString().slice(0, 10)
  editTime.value = d.toTimeString().slice(0, 5)
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editDate.value = ''
  editTime.value = ''
}

const confirmEdit = async () => {
  if (!editDate.value || !editTime.value) return
  const scheduledAt = new Date(`${editDate.value}T${editTime.value}`).getTime()
  await matchesStore.updateMatchSchedule(props.match.id, scheduledAt)
  cancelEdit()
}
</script>

<template>
  <div class="scheduled-row">
    <template v-if="isEditing">
      <div class="scheduled-edit">
        <input type="date" v-model="editDate" class="sched-input sched-input--sm" />
        <input type="time" v-model="editTime" class="sched-input sched-input--sm" />
        <button class="btn-sm-primary" @click="confirmEdit">Save</button>
        <button class="btn-sm-ghost" @click="cancelEdit">Cancel</button>
      </div>
    </template>
    <template v-else>
      <div class="scheduled-info">
        <div class="scheduled-teams-row">
          <TeamRoster :players="teamAPlayers" align="start" />
          <span class="vs-label">vs</span>
          <TeamRoster :players="teamBPlayers" align="end" />
        </div>
        <span class="scheduled-time">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {{ formatScheduled(match.scheduledAt!) }}
        </span>
        <span v-if="matchFormatLabel(match)" class="match-format-badge">{{ matchFormatLabel(match) }}</span>
        <span v-if="matchLocationLabel(match)" class="match-location">{{ matchLocationLabel(match) }}</span>
      </div>
      <div class="scheduled-actions">
        <span v-if="match.status === 'pending'" class="status-badge">Awaiting confirmation</span>
        <span v-else-if="match.status === 'cancelled'" class="status-badge status-badge--cancelled"
          >Cancelled</span
        >
        <button v-else-if="canPlayNow()" class="btn-play-now" @click="emit('play-now', match)">
          ▶ Play now
        </button>
        <span v-else class="status-badge">Only the organizer can start this match</span>
        <template v-if="canManage">
          <button
            v-if="match.status !== 'cancelled'"
            class="btn-icon"
            title="Edit schedule"
            @click="openEdit"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <button
            class="btn-icon btn-icon-danger"
            title="Cancel match"
            @click="emit('cancel-match', match.id)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scheduled-row {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-bg-info);
}

.scheduled-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.scheduled-teams-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vs-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-faint);
  flex-shrink: 0;
}

.scheduled-time {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}

.scheduled-time svg {
  flex-shrink: 0;
}

.match-format-badge {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
}

.match-location {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--color-text-faint);
}

.scheduled-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.scheduled-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.status-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}

.status-badge--cancelled {
  color: var(--color-danger-text);
  background: var(--color-danger-bg-hover);
}

.btn-play-now {
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-play-now:hover {
  background: var(--color-primary-hover-alt);
}

.sched-input {
  padding: 7px 10px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  cursor: pointer;
}

.sched-input:focus {
  border-color: var(--color-primary);
}

.sched-input--sm {
  padding: 5px 8px;
  font-size: 12px;
}

.btn-sm-primary {
  height: 36px;
  padding: 0 16px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s;
}

.btn-sm-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-sm-ghost {
  height: 36px;
  padding: 0 12px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s;
}

.btn-sm-ghost:hover {
  color: var(--color-text);
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
</style>
