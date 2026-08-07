<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Match, MatchFormat, CompetitiveScope } from '@/stores/matches'
import { useMatchesStore, buildScheduleDetails } from '@/stores/matches'
import type { Player } from '@/stores/players'
import { useUsersStore } from '@/stores/users'
import { formatNtrp } from '@/utils/ntrp'
import { CITIES } from '@/utils/courts'
import ScheduleDetailsFields from '@/components/schedule/ScheduleDetailsFields.vue'

const props = defineProps<{
  clubId: string
  players: Player[]
  myPlayerId?: string
  editingMatch?: Match | null
  initialTeamA?: string[]
  initialTeamB?: string[]
  initialMatchFormat?: MatchFormat
}>()

const emit = defineEmits<{
  cancel: []
  saved: []
}>()

const matchesStore = useMatchesStore()
const usersStore = useUsersStore()

const matchA1 = ref(
  props.initialTeamA?.[0] ?? props.editingMatch?.teamA[0] ?? props.myPlayerId ?? '',
)
const matchA2 = ref(props.initialTeamA?.[1] ?? props.editingMatch?.teamA[1] ?? '')
const matchB1 = ref(props.initialTeamB?.[0] ?? props.editingMatch?.teamB[0] ?? '')
const matchB2 = ref(props.initialTeamB?.[1] ?? props.editingMatch?.teamB[1] ?? '')
const showSecondPlayer = ref(!!(matchA2.value || matchB2.value))
const matchSets = ref<{ scoreA: string; scoreB: string }[]>(
  props.editingMatch?.sets?.length
    ? props.editingMatch.sets.map((s) => ({ scoreA: String(s.scoreA), scoreB: String(s.scoreB) }))
    : [{ scoreA: '', scoreB: '' }],
)
const manualWinner = ref<'A' | 'B' | null>(null)
const showWinnerPicker = ref(false)
const isScheduling = ref(false)
const schedDate = ref('')
const schedTime = ref('')

const scheduleDuration = ref(90)
const scheduleFormat = ref<MatchFormat>('competitive')
const scheduleScope = ref<CompetitiveScope>('open')
const scheduleRankMin = ref(3.0)
const scheduleRankMax = ref(4.0)
const scheduleCity = ref(CITIES[0]!)
const scheduleCourt = ref('')

const matchError = ref('')
const submitting = ref(false)

const todayStr = computed(() => new Date().toISOString().slice(0, 10))

const playerName = (id: string) => props.players.find((p) => p.id === id)?.name ?? ''
const optionLabel = (p: Player) => {
  const isMe = p.uid && p.uid === props.players.find((pl) => pl.id === props.myPlayerId)?.uid
  const base = isMe ? `${p.name} (You)` : p.name
  const rating = p.uid ? usersStore.allUsers.find((u) => u.uid === p.uid)?.rating : undefined
  return rating !== undefined ? `${base} · NTRP ${formatNtrp(rating)}` : base
}

const teamALabel = computed(() => {
  const names = [matchA1.value, matchA2.value].filter(Boolean).map(playerName)
  return names.length ? names.join(' & ') : 'Team A'
})
const teamBLabel = computed(() => {
  const names = [matchB1.value, matchB2.value].filter(Boolean).map(playerName)
  return names.length ? names.join(' & ') : 'Team B'
})

const playerOptions = computed(() => {
  const me = props.players.find((p) => p.id === props.myPlayerId)
  if (!me) return props.players
  return [me, ...props.players.filter((p) => p.id !== me.id)]
})

const takenInForm = (exceptVal: string) =>
  new Set(
    [matchA1.value, matchA2.value, matchB1.value, matchB2.value].filter(
      (id) => id && id !== exceptVal,
    ),
  )

const toggleSecondPlayer = () => {
  showSecondPlayer.value = !showSecondPlayer.value
  if (!showSecondPlayer.value) {
    matchA2.value = ''
    matchB2.value = ''
  }
}

const addSet = () => matchSets.value.push({ scoreA: '', scoreB: '' })
const removeSet = (i: number) => {
  if (matchSets.value.length > 1) matchSets.value.splice(i, 1)
}

const selectWinner = (team: 'A' | 'B') => {
  manualWinner.value = team
  showWinnerPicker.value = false
}
const clearWinner = () => {
  manualWinner.value = null
  showWinnerPicker.value = false
}

const submit = async () => {
  if (!matchA1.value || !matchB1.value) {
    matchError.value = 'Please select a player for each team.'
    return
  }
  if (showSecondPlayer.value && (!matchA2.value || !matchB2.value)) {
    matchError.value = 'Please select both partners, or remove the 2nd player slot.'
    return
  }
  const teamAIds = [matchA1.value, ...(matchA2.value ? [matchA2.value] : [])]
  const teamBIds = [matchB1.value, ...(matchB2.value ? [matchB2.value] : [])]
  const allIds = [...teamAIds, ...teamBIds]
  if (new Set(allIds).size < allIds.length) {
    matchError.value = 'All players must be different.'
    return
  }

  if (isScheduling.value) {
    if (!schedDate.value || !schedTime.value) {
      matchError.value = 'Please select date and time.'
      return
    }
    const scheduledAt = new Date(`${schedDate.value}T${schedTime.value}`).getTime()
    if (scheduledAt <= Date.now()) {
      matchError.value = 'Scheduled time must be in the future.'
      return
    }
    const details = buildScheduleDetails({
      durationMinutes: scheduleDuration.value,
      matchFormat: scheduleFormat.value,
      competitiveScope: scheduleScope.value,
      rankMin: scheduleRankMin.value,
      rankMax: scheduleRankMax.value,
      city: scheduleCity.value,
      court: scheduleCourt.value,
    })
    submitting.value = true
    matchError.value = ''
    try {
      await matchesStore.createScheduledMatch(props.clubId, teamAIds, teamBIds, scheduledAt, details)
      emit('saved')
    } catch {
      matchError.value = 'Failed to schedule match. Please try again.'
    } finally {
      submitting.value = false
    }
    return
  }

  const sets: { scoreA: number; scoreB: number }[] = []
  for (let i = 0; i < matchSets.value.length; i++) {
    const s = matchSets.value[i]!
    if (s.scoreA === '' && s.scoreB === '') {
      matchError.value = `Set ${i + 1}: score can't be 0:0 — enter at least one score.`
      return
    }
    const sa = s.scoreA === '' ? 0 : Number(s.scoreA)
    const sb = s.scoreB === '' ? 0 : Number(s.scoreB)
    if (isNaN(sa) || isNaN(sb) || sa < 0 || sb < 0) {
      matchError.value = `Set ${i + 1}: enter valid scores.`
      return
    }
    if (sa === sb) {
      matchError.value = `Set ${i + 1}: scores must differ — there must be a winner.`
      return
    }
    sets.push({ scoreA: sa, scoreB: sb })
  }

  const totalA = sets.filter((s) => s.scoreA > s.scoreB).length
  const totalB = sets.filter((s) => s.scoreB > s.scoreA).length
  if (totalA === totalB && !manualWinner.value) {
    showWinnerPicker.value = true
    matchError.value = ''
    return
  }

  const winnerOverride = manualWinner.value ?? undefined
  submitting.value = true
  matchError.value = ''
  try {
    if (props.editingMatch) {
      await matchesStore.updateMatch(
        props.editingMatch.id,
        teamAIds,
        teamBIds,
        sets,
        winnerOverride,
      )
    } else {
      await matchesStore.createMatch(
        props.clubId,
        teamAIds,
        teamBIds,
        sets,
        winnerOverride,
        props.initialMatchFormat,
      )
    }
    emit('saved')
  } catch {
    matchError.value = 'Failed to save match. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="match-form" :class="{ 'match-form--edit': editingMatch }">
    <div v-if="editingMatch" class="match-form-edit-label">Editing match</div>
    <p v-if="initialMatchFormat === 'friendly'" class="friendly-note">
      Friendly match — the result won't affect anyone's rating.
    </p>
    <div class="match-form-teams">
      <div class="match-form-team">
        <span class="match-form-label">Team A</span>
        <select v-model="matchA1" class="player-select">
          <option value="">Select player…</option>
          <option
            v-for="p in playerOptions"
            :key="p.id"
            :value="p.id"
            :disabled="takenInForm(matchA1).has(p.id)"
          >
            {{ optionLabel(p) }}
          </option>
        </select>
        <select v-if="showSecondPlayer" v-model="matchA2" class="player-select">
          <option value="">Select partner…</option>
          <option
            v-for="p in playerOptions"
            :key="p.id"
            :value="p.id"
            :disabled="takenInForm(matchA2).has(p.id)"
          >
            {{ optionLabel(p) }}
          </option>
        </select>
      </div>
      <div class="match-form-vs">
        <span>vs</span>
        <button
          class="btn-doubles-toggle"
          type="button"
          :title="showSecondPlayer ? 'Switch to 1v1' : 'Switch to 2v2'"
          @click="toggleSecondPlayer"
        >
          {{ showSecondPlayer ? '1v1' : '+ 2v2' }}
        </button>
      </div>
      <div class="match-form-team">
        <span class="match-form-label">Team B</span>
        <select v-model="matchB1" class="player-select">
          <option value="">Select player…</option>
          <option
            v-for="p in playerOptions"
            :key="p.id"
            :value="p.id"
            :disabled="takenInForm(matchB1).has(p.id)"
          >
            {{ optionLabel(p) }}
          </option>
        </select>
        <select v-if="showSecondPlayer" v-model="matchB2" class="player-select">
          <option value="">Select partner…</option>
          <option
            v-for="p in playerOptions"
            :key="p.id"
            :value="p.id"
            :disabled="takenInForm(matchB2).has(p.id)"
          >
            {{ optionLabel(p) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Schedule toggle (not shown when editing) -->
    <div v-if="!editingMatch" class="sched-toggle">
      <button
        :class="['sched-tab', { 'sched-tab--active': !isScheduling }]"
        type="button"
        @click="isScheduling = false"
      >
        Play now
      </button>
      <button
        :class="['sched-tab', { 'sched-tab--active': isScheduling }]"
        type="button"
        @click="isScheduling = true"
      >
        Schedule
      </button>
    </div>

    <template v-if="!isScheduling">
      <div class="match-form-sets">
        <div v-for="(set, i) in matchSets" :key="i" class="match-set-row">
          <span class="set-num-label">Set {{ i + 1 }}</span>
          <input
            v-model="set.scoreA"
            type="number"
            min="0"
            max="99"
            class="score-input"
            placeholder="0"
          />
          <span class="score-colon">:</span>
          <input
            v-model="set.scoreB"
            type="number"
            min="0"
            max="99"
            class="score-input"
            placeholder="0"
          />
          <button
            v-if="matchSets.length > 1"
            class="btn-remove-set"
            title="Remove set"
            type="button"
            @click="removeSet(i)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div v-else class="set-row-spacer"></div>
        </div>
        <div class="sets-footer">
          <button class="btn-add-set" type="button" @click="addSet">+ Add Set</button>
          <template v-if="!showWinnerPicker && !manualWinner">
            <button class="btn-decide-winner" type="button" @click="showWinnerPicker = true">
              Decide a winner
            </button>
          </template>
          <div v-else-if="showWinnerPicker" class="winner-picker">
            <span class="winner-picker-label">Who won?</span>
            <button class="btn-team-pick" type="button" @click="selectWinner('A')">
              {{ teamALabel }}
            </button>
            <button class="btn-team-pick" type="button" @click="selectWinner('B')">
              {{ teamBLabel }}
            </button>
          </div>
          <div v-else class="manual-winner-display">
            <span class="manual-winner-text"
              >{{ manualWinner === 'A' ? teamALabel : teamBLabel }} wins</span
            >
            <button class="btn-clear-winner" type="button" @click="clearWinner">×</button>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="sched-datetime">
        <label class="sched-label">Date</label>
        <input type="date" v-model="schedDate" :min="todayStr" class="sched-input" />
        <label class="sched-label">Time</label>
        <input type="time" v-model="schedTime" class="sched-input" />
      </div>
      <ScheduleDetailsFields
        v-model:duration-minutes="scheduleDuration"
        v-model:match-format="scheduleFormat"
        v-model:competitive-scope="scheduleScope"
        v-model:rank-min="scheduleRankMin"
        v-model:rank-max="scheduleRankMax"
        v-model:city="scheduleCity"
        v-model:court="scheduleCourt"
      />
    </template>

    <div class="match-form-footer">
      <button class="btn-sm-primary" :disabled="submitting" @click="submit">
        {{ submitting ? '…' : isScheduling ? 'Schedule Match' : 'Save Match' }}
      </button>
      <button class="btn-sm-ghost" :disabled="submitting" @click="emit('cancel')">Cancel</button>
    </div>
    <p v-if="matchError" class="form-error">{{ matchError }}</p>
  </div>
</template>

<style scoped>
.match-form {
  padding: 16px 20px;
  background: var(--color-bg-subtle);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.match-form--edit {
  border-left: 3px solid var(--color-primary);
}

.match-form-edit-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.match-form-teams {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: end;
}

.match-form-team {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-form-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.match-form-vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 8px 4px;
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: var(--color-border);
}

.btn-doubles-toggle {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  background: none;
  border: 1px solid var(--color-accent-border);
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s;
}

.btn-doubles-toggle:hover {
  background: var(--color-accent-bg);
}

.player-select {
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 10px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  cursor: pointer;
  width: 100%;
  transition: border-color 0.15s;
}

.player-select:focus {
  border-color: var(--color-accent);
}

.sched-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
  margin: 0 0 4px;
}

.sched-tab {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.sched-tab--active {
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sched-tab:hover:not(.sched-tab--active) {
  color: var(--color-text-hover);
}

.match-form-sets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.match-set-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.set-num-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-subtle);
  width: 44px;
  text-align: right;
  text-transform: uppercase;
  flex-shrink: 0;
}

.score-input {
  width: 64px;
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0;
  text-align: center;
  font-family: 'Anton', sans-serif;
  font-size: 26px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  transition: border-color 0.15s;
}

.score-input:focus {
  border-color: var(--color-accent);
}

.score-input::-webkit-outer-spin-button,
.score-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.score-colon {
  font-family: 'Anton', sans-serif;
  font-size: 26px;
  color: var(--color-border);
}

.btn-remove-set {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-subtle);
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}

.btn-remove-set:hover {
  background: var(--color-danger-bg-hover);
  color: var(--color-danger-text);
}

.set-row-spacer {
  width: 28px;
  flex-shrink: 0;
}

.sets-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.btn-add-set {
  height: 32px;
  padding: 0 14px;
  background: none;
  border: 1.5px dashed var(--color-border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  margin-top: 2px;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.btn-add-set:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-decide-winner {
  height: 32px;
  padding: 0 14px;
  background: none;
  border: 1.5px dashed var(--color-border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-subtle);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.btn-decide-winner:hover {
  border-color: var(--color-text-subtle);
  color: var(--color-text-hover);
}

.winner-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.winner-picker-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-subtle);
  text-transform: uppercase;
  white-space: nowrap;
}

.btn-team-pick {
  height: 32px;
  padding: 0 14px;
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-strong);
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}

.btn-team-pick:hover {
  border-color: var(--color-accent);
  background: rgba(52, 33, 124, 0.05);
  color: var(--color-accent);
}

.manual-winner-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.manual-winner-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
}

.btn-clear-winner {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1;
  padding: 0;
  transition: background 0.15s;
}

.btn-clear-winner:hover {
  background: var(--color-border);
}

.sched-datetime {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sched-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.match-form-footer {
  display: flex;
  gap: 8px;
  align-items: center;
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

.btn-sm-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.btn-sm-ghost:hover:not(:disabled) {
  color: var(--color-text);
}

.btn-sm-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-error {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-danger);
  margin: 0;
}

.friendly-note {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0;
}

@media (max-width: 768px) {
  .match-form-teams {
    grid-template-columns: 1fr;
  }
  .match-form-vs {
    padding: 4px 0;
  }
}
</style>
