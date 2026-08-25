<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMatchesStore, buildScheduleDetails } from '@/stores/matches'
import type {
  StandaloneParticipant,
  MatchFormat,
  CompetitiveScope,
  GenderPreference,
} from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import { CITIES } from '@/utils/courts'
import PlayerPicker from '@/components/quickmatch/PlayerPicker.vue'
import ScheduleDetailsFields from '@/components/schedule/ScheduleDetailsFields.vue'

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

const todayStr = computed(() => new Date().toISOString().slice(0, 10))
const schedDate = ref('')
const schedTime = ref('')

const durationMinutes = ref(90)
const matchFormat = ref<MatchFormat>('competitive')
const competitiveScope = ref<CompetitiveScope>('open')
const rankMin = ref(3.0)
const rankMax = ref(4.0)
const city = ref(CITIES[0]!)
const court = ref('')
const genderPreference = ref<GenderPreference>('mixed')

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
  if (teamA.every((p) => p.isOpen) && teamB.every((p) => p.isOpen)) {
    matchError.value = 'At least one slot must have a real player.'
    return
  }

  const uid = authStore.user?.uid
  if (!uid) {
    matchError.value = 'You must be logged in to schedule a match.'
    return
  }

  if (!schedDate.value || !schedTime.value) {
    matchError.value = 'Please select date and time.'
    return
  }
  const scheduledAt = new Date(`${schedDate.value}T${schedTime.value}`).getTime()
  if (scheduledAt <= Date.now()) {
    matchError.value = 'Scheduled time must be in the future.'
    return
  }
  if (
    matchFormat.value === 'competitive' &&
    competitiveScope.value === 'ranked' &&
    rankMin.value > rankMax.value
  ) {
    matchError.value = 'Minimum rank must be lower than the maximum.'
    return
  }

  const details = buildScheduleDetails({
    durationMinutes: durationMinutes.value,
    matchFormat: matchFormat.value,
    competitiveScope: competitiveScope.value,
    rankMin: rankMin.value,
    rankMax: rankMax.value,
    city: city.value,
    court: court.value,
    genderPreference: genderPreference.value,
  })

  submitting.value = true
  matchError.value = ''
  try {
    await matchesStore.createStandaloneScheduledMatch(teamA, teamB, scheduledAt, uid, details)
    emit('saved')
  } catch {
    matchError.value = 'Failed to schedule match. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="match-form">
    <div class="match-form-teams">
      <div class="match-form-team">
        <PlayerPicker v-model="a1" label="Team A" :excludeUids="takenUids(a1)" allowOpen />
        <PlayerPicker
          v-if="showSecondPlayer"
          v-model="a2"
          label="Partner"
          :excludeUids="takenUids(a2)"
          allowOpen
        />
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
        <PlayerPicker v-model="b1" label="Team B" :excludeUids="takenUids(b1)" allowOpen />
        <PlayerPicker
          v-if="showSecondPlayer"
          v-model="b2"
          label="Partner"
          :excludeUids="takenUids(b2)"
          allowOpen
        />
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">When</label>
      <div class="sched-datetime">
        <input type="date" v-model="schedDate" :min="todayStr" class="sched-input" />
        <input type="time" v-model="schedTime" class="sched-input" />
      </div>
    </div>

    <ScheduleDetailsFields
      v-model:duration-minutes="durationMinutes"
      v-model:match-format="matchFormat"
      v-model:competitive-scope="competitiveScope"
      v-model:rank-min="rankMin"
      v-model:rank-max="rankMax"
      v-model:city="city"
      v-model:court="court"
      v-model:gender-preference="genderPreference"
    />

    <div class="match-form-footer">
      <button class="btn-sm-primary" :disabled="submitting" @click="submit">
        {{ submitting ? '…' : 'Schedule Match' }}
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
  gap: 18px;
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

.form-section {
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

.sched-datetime {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sched-input {
  height: 38px;
  padding: 0 10px;
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
