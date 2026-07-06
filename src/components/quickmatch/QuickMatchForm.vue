<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMatchesStore } from '@/stores/matches'
import type { StandaloneParticipant } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import PlayerPicker from '@/components/quickmatch/PlayerPicker.vue'

const emit = defineEmits<{
  cancel: []
  saved: []
}>()

const matchesStore = useMatchesStore()
const authStore = useAuthStore()

const a1 = ref<StandaloneParticipant | null>(null)
const a2 = ref<StandaloneParticipant | null>(null)
const b1 = ref<StandaloneParticipant | null>(null)
const b2 = ref<StandaloneParticipant | null>(null)
const showSecondPlayer = ref(false)

const matchSets = ref<{ scoreA: string; scoreB: string }[]>([{ scoreA: '', scoreB: '' }])
const manualWinner = ref<'A' | 'B' | null>(null)
const showWinnerPicker = ref(false)
const matchError = ref('')
const submitting = ref(false)

const takenUids = (except: (typeof a1)['value']) =>
  [a1.value, a2.value, b1.value, b2.value]
    .filter((p) => p && p.uid && p !== except)
    .map((p) => p!.uid!)

const toggleSecondPlayer = () => {
  showSecondPlayer.value = !showSecondPlayer.value
  if (!showSecondPlayer.value) {
    a2.value = null
    b2.value = null
  }
}

const addSet = () => matchSets.value.push({ scoreA: '', scoreB: '' })
const removeSet = (i: number) => {
  if (matchSets.value.length > 1) matchSets.value.splice(i, 1)
}

const teamALabel = computed(() => [a1.value, a2.value].filter(Boolean).map((p) => p!.name).join(' & ') || 'Team A')
const teamBLabel = computed(() => [b1.value, b2.value].filter(Boolean).map((p) => p!.name).join(' & ') || 'Team B')

const selectWinner = (team: 'A' | 'B') => {
  manualWinner.value = team
  showWinnerPicker.value = false
}
const clearWinner = () => {
  manualWinner.value = null
  showWinnerPicker.value = false
}

const submit = async () => {
  if (!a1.value || !b1.value) {
    matchError.value = 'Please add a player for each team.'
    return
  }
  if (showSecondPlayer.value && (!a2.value || !b2.value)) {
    matchError.value = 'Please add both partners, or remove the 2nd player slot.'
    return
  }

  const teamA = [a1.value, ...(a2.value ? [a2.value] : [])]
  const teamB = [b1.value, ...(b2.value ? [b2.value] : [])]
  const allUids = [...teamA, ...teamB].map((p) => p.uid).filter((u): u is string => !!u)
  if (new Set(allUids).size < allUids.length) {
    matchError.value = 'All registered players must be different.'
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

  const uid = authStore.user?.uid
  if (!uid) {
    matchError.value = 'You must be logged in to create a match.'
    return
  }

  const winnerOverride = manualWinner.value ?? undefined
  submitting.value = true
  matchError.value = ''
  try {
    await matchesStore.createStandaloneMatch(teamA, teamB, sets, uid, winnerOverride)
    emit('saved')
  } catch {
    matchError.value = 'Failed to save match. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="match-form">
    <div class="match-form-teams">
      <div class="match-form-team">
        <PlayerPicker v-model="a1" label="Team A" :excludeUids="takenUids(a1)" />
        <PlayerPicker v-if="showSecondPlayer" v-model="a2" label="Partner" :excludeUids="takenUids(a2)" />
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
        <PlayerPicker v-model="b1" label="Team B" :excludeUids="takenUids(b1)" />
        <PlayerPicker v-if="showSecondPlayer" v-model="b2" label="Partner" :excludeUids="takenUids(b2)" />
      </div>
    </div>

    <div class="match-form-sets">
      <div v-for="(set, i) in matchSets" :key="i" class="match-set-row">
        <span class="set-num-label">Set {{ i + 1 }}</span>
        <input v-model="set.scoreA" type="number" min="0" max="99" class="score-input" placeholder="0" />
        <span class="score-colon">:</span>
        <input v-model="set.scoreB" type="number" min="0" max="99" class="score-input" placeholder="0" />
        <button v-if="matchSets.length > 1" class="btn-remove-set" title="Remove set" type="button" @click="removeSet(i)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div v-else class="set-row-spacer"></div>
      </div>
      <div class="sets-footer">
        <button class="btn-add-set" type="button" @click="addSet">+ Add Set</button>
        <template v-if="!showWinnerPicker && !manualWinner">
          <button class="btn-decide-winner" type="button" @click="showWinnerPicker = true">Decide a winner</button>
        </template>
        <div v-else-if="showWinnerPicker" class="winner-picker">
          <span class="winner-picker-label">Who won?</span>
          <button class="btn-team-pick" type="button" @click="selectWinner('A')">{{ teamALabel }}</button>
          <button class="btn-team-pick" type="button" @click="selectWinner('B')">{{ teamBLabel }}</button>
        </div>
        <div v-else class="manual-winner-display">
          <span class="manual-winner-text">{{ manualWinner === 'A' ? teamALabel : teamBLabel }} wins</span>
          <button class="btn-clear-winner" type="button" @click="clearWinner">×</button>
        </div>
      </div>
    </div>

    <div class="match-form-footer">
      <button class="btn-sm-primary" :disabled="submitting" @click="submit">
        {{ submitting ? '…' : 'Save Match' }}
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
  border-radius: 12px;
}

.match-form-teams {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: start;
}

.match-form-team {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-form-vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 8px 4px;
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
  transition: background 0.15s, color 0.15s;
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
  transition: border-color 0.15s, color 0.15s;
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
  transition: border-color 0.15s, color 0.15s;
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
  transition: border-color 0.15s, background 0.15s, color 0.15s;
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

@media (max-width: 768px) {
  .match-form-teams {
    grid-template-columns: 1fr;
  }
  .match-form-vs {
    padding: 4px 0;
    flex-direction: row;
  }
}
</style>
