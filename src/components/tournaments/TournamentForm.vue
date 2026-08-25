<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTournamentsStore } from '@/stores/tournaments'
import type {
  Tournament,
  TournamentFormat,
  LeaderboardSort,
  TournamentVisibility,
  SitOutOption,
  TournamentGuest,
  CreateTournamentPayload,
  UpdateTournamentPayload,
} from '@/stores/tournaments'
import type { MatchFormat } from '@/stores/matches'
import type { Player } from '@/stores/players'
import { useAuthStore } from '@/stores/auth'
import { CITIES, courtsInCity, courtLabel } from '@/utils/courts'
import {
  MIN_PARTICIPANTS,
  MAX_PARTICIPANTS,
  maxCourtsForParticipants,
  roundsStep,
  roundsMin,
  roundsMax,
  roundsDefault,
  matchesPerPlayer,
  formatMatchesPerPlayer,
  POINTS_PER_ROUND_OPTIONS,
  SIT_OUT_FRACTIONS,
} from '@/utils/tournamentRules'
import TournamentRosterFields from '@/components/tournaments/TournamentRosterFields.vue'
import TournamentClubRosterFields from '@/components/tournaments/TournamentClubRosterFields.vue'

// When `initial` is set, the form edits that tournament in place instead of
// creating a new one - roster fields are hidden (roster changes go through
// the detail page's leave/kick actions instead of a bulk edit).
// `clubId`/`clubPlayers`/`myClubPlayer*` are only passed when creating (or
// editing) a club-scoped tournament
const props = defineProps<{
  initial?: Tournament
  clubId?: string
  clubPlayers?: Player[]
  myClubPlayerId?: string
  myClubPlayerName?: string
}>()
const isEditMode = computed(() => !!props.initial)
const isClubTournament = computed(() => !!props.clubId || !!props.initial?.clubId)

const emit = defineEmits<{
  cancel: []
  saved: []
}>()

const tournamentsStore = useTournamentsStore()
const authStore = useAuthStore()

const initDateStr = (ts: number): string => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const initTimeStr = (ts: number): string => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const name = ref(props.initial?.name ?? '')
const description = ref(props.initial?.description ?? '')
const format = ref<TournamentFormat>(props.initial?.format ?? 'classic-americano')

const startMode = ref<'now' | 'schedule'>(isEditMode.value ? 'schedule' : 'now')
const todayStr = computed(() => new Date().toISOString().slice(0, 10))
const schedDate = ref(props.initial ? initDateStr(props.initial.scheduledAt) : '')
const schedTime = ref(props.initial ? initTimeStr(props.initial.scheduledAt) : '')
const endDate = ref(props.initial?.endAt ? initDateStr(props.initial.endAt) : '')
const endTime = ref(props.initial?.endAt ? initTimeStr(props.initial.endAt) : '')

const city = ref(props.initial?.city ?? CITIES[0]!)
const court = ref(props.initial?.court ?? '')
const courtOptions = computed(() => courtsInCity(city.value))
const courtDropdownOpen = ref(false)
watch(city, () => {
  court.value = ''
})
const selectCourt = (id: string) => {
  court.value = id
  courtDropdownOpen.value = false
}
const onCourtBlur = () => {
  setTimeout(() => (courtDropdownOpen.value = false), 150)
}

const maxParticipants = ref(props.initial?.maxParticipants ?? MIN_PARTICIPANTS)

type PointsMode = 'preset' | 'unlimited' | 'custom'
const initialPointsMode = (): PointsMode => {
  const p = props.initial?.pointsPerRound
  if (p === undefined) return 'preset'
  if (p === 'unlimited') return 'unlimited'
  return (POINTS_PER_ROUND_OPTIONS as readonly number[]).includes(p) ? 'preset' : 'custom'
}
const pointsMode = ref<PointsMode>(initialPointsMode())
const pointsPreset = ref(
  pointsMode.value === 'preset' && typeof props.initial?.pointsPerRound === 'number'
    ? props.initial.pointsPerRound
    : 32,
)
const pointsCustom = ref<number | null>(
  pointsMode.value === 'custom' && typeof props.initial?.pointsPerRound === 'number'
    ? props.initial.pointsPerRound
    : null,
)
const effectivePoints = computed<number | null>(() => {
  if (pointsMode.value === 'unlimited') return null
  if (pointsMode.value === 'custom') return pointsCustom.value
  return pointsPreset.value
})
const selectPointsPreset = (p: number) => {
  pointsMode.value = 'preset'
  pointsPreset.value = p
}

const leaderboardSort = ref<LeaderboardSort>(props.initial?.leaderboardSort ?? 'points')

const maxCourts = computed(() => maxCourtsForParticipants(maxParticipants.value))
const courtsInPlay = ref(props.initial?.courtsInPlay ?? maxCourtsForParticipants(MIN_PARTICIPANTS))
watch(maxCourts, (max) => {
  if (courtsInPlay.value > max) courtsInPlay.value = max
})

// — rounds — the valid step/min/max all depend on participants and
// courts in play, so whichever one this default came from, changing either
// field afterward resets rounds to the new pairing's default (see the watch
// below; an existing tournament's stored value is trusted as-is on load).
const rounds = ref(
  props.initial?.rounds ?? roundsDefault(maxParticipants.value, courtsInPlay.value),
)
const currentRoundsStep = computed(() => roundsStep(maxParticipants.value, courtsInPlay.value))
const currentRoundsMin = computed(() => roundsMin(maxParticipants.value, courtsInPlay.value))
const currentRoundsMax = computed(() => roundsMax(maxParticipants.value, courtsInPlay.value))
watch([maxParticipants, courtsInPlay], () => {
  rounds.value = roundsDefault(maxParticipants.value, courtsInPlay.value)
})
const matchesPerPlayerHint = computed(() =>
  formatMatchesPerPlayer(matchesPerPlayer(rounds.value, courtsInPlay.value, maxParticipants.value)),
)
const incRounds = () => {
  const next = rounds.value + currentRoundsStep.value
  if (next <= currentRoundsMax.value) rounds.value = next
}
const decRounds = () => {
  const next = rounds.value - currentRoundsStep.value
  if (next >= currentRoundsMin.value) rounds.value = next
}
const incParticipants = () => {
  if (maxParticipants.value < MAX_PARTICIPANTS) maxParticipants.value += 1
}
const decParticipants = () => {
  if (maxParticipants.value > MIN_PARTICIPANTS) maxParticipants.value -= 1
}
const incCourts = () => {
  if (courtsInPlay.value < maxCourts.value) courtsInPlay.value += 1
}
const decCourts = () => {
  if (courtsInPlay.value > 1) courtsInPlay.value -= 1
}

const sitOutOption = ref<SitOutOption>(props.initial?.sitOutOption ?? 'none')
const sitOutCustomValue = ref<number | null>(props.initial?.sitOutCustomValue ?? null)
const sitOutFractionValue = (fraction: 'third' | 'half') =>
  effectivePoints.value === null
    ? null
    : Math.round(effectivePoints.value * SIT_OUT_FRACTIONS[fraction])
watch(pointsMode, (mode) => {
  // A fraction of "no limit" is undefined — fall back to a flat 0 when
  // switching into unlimited points while a fraction chip was selected.
  if (mode === 'unlimited' && (sitOutOption.value === 'third' || sitOutOption.value === 'half')) {
    sitOutOption.value = 'none'
  }
})

const matchFormat = ref<MatchFormat>(props.initial?.matchFormat ?? 'competitive')
const visibility = ref<TournamentVisibility>(
  props.initial?.visibility ?? (props.clubId ? 'private' : 'public'),
)
const creatorParticipates = ref(props.initial?.creatorParticipates ?? true)

// roster (create mode only — edit mode changes the roster via the
// detail page's leave/kick actions instead)
const invitedUids = ref<string[]>([])
const guests = ref<TournamentGuest[]>([])
const selectedClubPlayerIds = ref<string[]>([])
const myUid = computed(() => authStore.user?.uid)
const excludeUids = computed(() => (myUid.value ? [myUid.value] : []))

// In edit mode, the roster already exists on `initial` — track it net of the
// creator-participates toggle so downsizing max participants below the
// current roster size still gets caught by validate(). Club tournaments
// track the organizer's own participation via their `guests` entry (keyed
// by club Player.id) instead of `participantUids`.
const currentRosterCount = computed(() => {
  if (props.initial) {
    const wasCreatorIn = props.initial.clubId
      ? !!props.myClubPlayerId && props.initial.guests.some((g) => g.id === props.myClubPlayerId)
      : props.initial.participantUids.includes(props.initial.createdBy)
    const delta = (creatorParticipates.value ? 1 : 0) - (wasCreatorIn ? 1 : 0)
    return props.initial.participantUids.length + props.initial.guests.length + delta
  }
  if (props.clubId) {
    return (creatorParticipates.value ? 1 : 0) + selectedClubPlayerIds.value.length
  }
  return (creatorParticipates.value ? 1 : 0) + invitedUids.value.length + guests.value.length
})
const remainingSlots = computed(() => maxParticipants.value - currentRosterCount.value)

const formError = ref('')
const submitting = ref(false)

const validate = (status: 'draft' | 'upcoming'): string => {
  if (!name.value.trim()) return 'Please give the tournament a name.'
  if (maxParticipants.value < MIN_PARTICIPANTS || maxParticipants.value > MAX_PARTICIPANTS) {
    return `Participants must be between ${MIN_PARTICIPANTS} and ${MAX_PARTICIPANTS}.`
  }
  if (courtsInPlay.value < 1 || courtsInPlay.value > maxCourts.value) {
    return 'Courts in play must match the number of participants.'
  }
  if (rounds.value < currentRoundsMin.value || rounds.value > currentRoundsMax.value) {
    return `With ${maxParticipants.value} participants and ${courtsInPlay.value} court${courtsInPlay.value === 1 ? '' : 's'}, rounds must be between ${currentRoundsMin.value} and ${currentRoundsMax.value}.`
  }
  if (currentRosterCount.value > maxParticipants.value) {
    return 'The roster exceeds the maximum number of participants.'
  }
  if (pointsMode.value === 'custom') {
    if (pointsCustom.value === null || pointsCustom.value < 0 || pointsCustom.value > 100) {
      return 'Custom points per round must be between 0 and 100.'
    }
  }
  if (sitOutOption.value === 'custom') {
    if (sitOutCustomValue.value === null || sitOutCustomValue.value < 0) {
      return 'Custom sit-out points must be 0 or higher.'
    }
  }

  if (status === 'upcoming') {
    if (!court.value) return 'Please select a court.'
    if (startMode.value === 'schedule') {
      if (!schedDate.value || !schedTime.value) return 'Please select a start date and time.'
      const startAt = new Date(`${schedDate.value}T${schedTime.value}`).getTime()
      if (startAt <= Date.now()) return 'Start time must be in the future.'
      if (endDate.value && endTime.value) {
        const endAt = new Date(`${endDate.value}T${endTime.value}`).getTime()
        if (endAt <= startAt) return 'End time must be after the start time.'
      }
    }
  }
  return ''
}

const submit = async (status: 'draft' | 'upcoming') => {
  const error = validate(status)
  if (error) {
    formError.value = error
    return
  }
  const uid = authStore.user?.uid
  if (!uid) {
    formError.value = 'You must be logged in to create a tournament.'
    return
  }

  const scheduledAt =
    startMode.value === 'now' || !schedDate.value || !schedTime.value
      ? Date.now()
      : new Date(`${schedDate.value}T${schedTime.value}`).getTime()
  const endAt =
    startMode.value === 'schedule' && endDate.value && endTime.value
      ? new Date(`${endDate.value}T${endTime.value}`).getTime()
      : undefined

  const pointsPerRound: number | 'unlimited' =
    pointsMode.value === 'unlimited'
      ? 'unlimited'
      : pointsMode.value === 'custom'
        ? (pointsCustom.value ?? 0)
        : pointsPreset.value

  const basePayload = {
    name: name.value.trim(),
    ...(description.value.trim() ? { description: description.value.trim() } : {}),
    format: format.value,
    matchFormat: matchFormat.value,
    scheduledAt,
    ...(endAt ? { endAt } : {}),
    city: city.value,
    court: court.value,
    courtsInPlay: courtsInPlay.value,
    maxParticipants: maxParticipants.value,
    rounds: rounds.value,
    pointsPerRound,
    sitOutOption: sitOutOption.value,
    ...(sitOutOption.value === 'custom' && sitOutCustomValue.value !== null
      ? { sitOutCustomValue: sitOutCustomValue.value }
      : {}),
    leaderboardSort: leaderboardSort.value,
    visibility: visibility.value,
    creatorParticipates: creatorParticipates.value,
  }

  submitting.value = true
  formError.value = ''
  try {
    if (props.initial) {
      const payload: UpdateTournamentPayload = basePayload
      const myClubPlayer =
        isClubTournament.value && props.myClubPlayerId && props.myClubPlayerName
          ? { id: props.myClubPlayerId, name: props.myClubPlayerName }
          : undefined
      await tournamentsStore.updateTournament(props.initial.id, payload, status, uid, myClubPlayer)
    } else if (props.clubId) {
      const guestsFromClub: TournamentGuest[] = selectedClubPlayerIds.value.map((id) => ({
        id,
        name: props.clubPlayers?.find((p) => p.id === id)?.name ?? 'Player',
      }))
      if (creatorParticipates.value && props.myClubPlayerId && props.myClubPlayerName) {
        guestsFromClub.push({ id: props.myClubPlayerId, name: props.myClubPlayerName })
      }
      const payload: CreateTournamentPayload = {
        ...basePayload,
        clubId: props.clubId,
        invitedUids: [],
        guests: guestsFromClub,
      }
      await tournamentsStore.createTournament(payload, status, uid)
    } else {
      const payload: CreateTournamentPayload = {
        ...basePayload,
        invitedUids: invitedUids.value,
        guests: guests.value,
      }
      await tournamentsStore.createTournament(payload, status, uid)
    }
    emit('saved')
  } catch {
    formError.value = 'Failed to save tournament. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="tournament-form">
    <div class="form-section">
      <label class="field-label">Name</label>
      <input
        v-model="name"
        type="text"
        class="sched-input sched-input--full"
        placeholder="Summer Americano"
      />
    </div>

    <div class="form-section">
      <label class="field-label">Description <span class="optional-tag">optional</span></label>
      <textarea
        v-model="description"
        class="sched-input sched-input--full sched-textarea"
        placeholder="Anything players should know…"
        rows="2"
      ></textarea>
    </div>

    <div class="form-section">
      <label class="field-label">Format</label>
      <div class="tab-row">
        <button type="button" class="tab tab--active">Classic Americano</button>
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">When</label>
      <div class="tab-row">
        <button
          type="button"
          :class="['tab', { 'tab--active': startMode === 'now' }]"
          @click="startMode = 'now'"
        >
          Start now
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': startMode === 'schedule' }]"
          @click="startMode = 'schedule'"
        >
          Choose date &amp; time
        </button>
      </div>
      <div v-if="startMode === 'schedule'" class="sched-datetime-block">
        <div class="sched-datetime">
          <span class="datetime-tag">Start</span>
          <input type="date" v-model="schedDate" :min="todayStr" class="sched-input" />
          <input type="time" v-model="schedTime" class="sched-input" />
        </div>
        <div class="sched-datetime">
          <span class="datetime-tag">End <span class="optional-tag">optional</span></span>
          <input type="date" v-model="endDate" :min="schedDate || todayStr" class="sched-input" />
          <input type="time" v-model="endTime" class="sched-input" />
        </div>
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">Court</label>
      <div class="location-row">
        <select v-model="city" class="sched-input">
          <option v-for="c in CITIES" :key="c" :value="c">{{ c }}</option>
        </select>
        <div class="court-dropdown-wrap">
          <button
            type="button"
            class="sched-input court-dropdown-btn"
            @click="courtDropdownOpen = !courtDropdownOpen"
            @blur="onCourtBlur"
          >
            {{ court ? courtLabel(court) : 'Select a court…' }}
          </button>
          <div v-if="courtDropdownOpen" class="court-dropdown">
            <button
              v-for="c in courtOptions"
              :key="c.id"
              type="button"
              class="court-option"
              :class="{ 'court-option--active': court === c.id }"
              @mousedown.prevent="selectCourt(c.id)"
            >
              <span class="court-option-name">{{ c.name }}</span>
              <span class="court-option-address">{{ c.address }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">Max participants</label>
      <div class="stepper">
        <button
          type="button"
          class="stepper-btn"
          :disabled="maxParticipants <= MIN_PARTICIPANTS"
          @click="decParticipants"
        >
          −
        </button>
        <span class="stepper-value">{{ maxParticipants }}</span>
        <button
          type="button"
          class="stepper-btn"
          :disabled="maxParticipants >= MAX_PARTICIPANTS"
          @click="incParticipants"
        >
          +
        </button>
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">Points per round</label>
      <div class="tab-row tab-row--wrap">
        <button
          v-for="p in POINTS_PER_ROUND_OPTIONS"
          :key="p"
          type="button"
          :class="['tab', { 'tab--active': pointsMode === 'preset' && pointsPreset === p }]"
          @click="selectPointsPreset(p)"
        >
          {{ p }}
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': pointsMode === 'unlimited' }]"
          @click="pointsMode = 'unlimited'"
        >
          No limit
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': pointsMode === 'custom' }]"
          @click="pointsMode = 'custom'"
        >
          Custom
        </button>
      </div>
      <input
        v-if="pointsMode === 'custom'"
        v-model.number="pointsCustom"
        type="number"
        min="0"
        max="100"
        class="sched-input sched-input--sm"
        placeholder="0–100"
      />
    </div>

    <div class="form-section">
      <label class="field-label">Leaderboard sort</label>
      <div class="tab-row">
        <button
          type="button"
          :class="['tab', { 'tab--active': leaderboardSort === 'points' }]"
          @click="leaderboardSort = 'points'"
        >
          By points
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': leaderboardSort === 'wins' }]"
          @click="leaderboardSort = 'wins'"
        >
          By wins
        </button>
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">Courts in play</label>
      <div class="stepper">
        <button type="button" class="stepper-btn" :disabled="courtsInPlay <= 1" @click="decCourts">
          −
        </button>
        <span class="stepper-value">{{ courtsInPlay }}</span>
        <button
          type="button"
          class="stepper-btn"
          :disabled="courtsInPlay >= maxCourts"
          @click="incCourts"
        >
          +
        </button>
      </div>
      <p class="field-hint">
        Up to {{ maxCourts }} court{{ maxCourts === 1 ? '' : 's' }} for
        {{ maxParticipants }} participants.
      </p>
    </div>

    <div class="form-section">
      <label class="field-label">Rounds</label>
      <div class="stepper">
        <button
          type="button"
          class="stepper-btn"
          :disabled="rounds <= currentRoundsMin"
          @click="decRounds"
        >
          −
        </button>
        <span class="stepper-value">{{ rounds }}</span>
        <button
          type="button"
          class="stepper-btn"
          :disabled="rounds >= currentRoundsMax"
          @click="incRounds"
        >
          +
        </button>
      </div>
      <p class="field-hint">
        ≈{{ matchesPerPlayerHint }} matches per player · {{ currentRoundsMin }}–{{
          currentRoundsMax
        }}
        rounds, steps of {{ currentRoundsStep }}.
      </p>
    </div>

    <div class="form-section">
      <label class="field-label">Sit-out points</label>
      <div class="tab-row">
        <button
          type="button"
          :class="['tab', { 'tab--active': sitOutOption === 'none' }]"
          @click="sitOutOption = 'none'"
        >
          0
        </button>
        <button
          type="button"
          class="tab"
          :class="{ 'tab--active': sitOutOption === 'third' }"
          :disabled="pointsMode === 'unlimited'"
          @click="sitOutOption = 'third'"
        >
          1/3{{
            sitOutFractionValue('third') !== null ? ` (≈${sitOutFractionValue('third')})` : ''
          }}
        </button>
        <button
          type="button"
          class="tab"
          :class="{ 'tab--active': sitOutOption === 'half' }"
          :disabled="pointsMode === 'unlimited'"
          @click="sitOutOption = 'half'"
        >
          1/2{{ sitOutFractionValue('half') !== null ? ` (≈${sitOutFractionValue('half')})` : '' }}
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': sitOutOption === 'custom' }]"
          @click="sitOutOption = 'custom'"
        >
          Custom
        </button>
      </div>
      <input
        v-if="sitOutOption === 'custom'"
        v-model.number="sitOutCustomValue"
        type="number"
        min="0"
        class="sched-input sched-input--sm"
        placeholder="Points"
      />
    </div>

    <div class="form-section">
      <label class="field-label">Match type</label>
      <div class="tab-row">
        <button
          type="button"
          :class="['tab', { 'tab--active': matchFormat === 'competitive' }]"
          @click="matchFormat = 'competitive'"
        >
          Competitive
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': matchFormat === 'friendly' }]"
          @click="matchFormat = 'friendly'"
        >
          Friendly
        </button>
      </div>
      <p class="field-hint">
        {{
          matchFormat === 'friendly'
            ? "Won't affect anyone's rating."
            : 'Counts toward rating like a regular match.'
        }}
      </p>
    </div>

    <div class="form-section">
      <label class="field-label">Visibility</label>
      <div class="tab-row">
        <button
          type="button"
          :class="['tab', { 'tab--active': visibility === 'public' }]"
          @click="visibility = 'public'"
        >
          Public
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': visibility === 'private' }]"
          @click="visibility = 'private'"
        >
          Private
        </button>
      </div>
    </div>

    <div class="form-section">
      <label class="checkbox-row">
        <input type="checkbox" v-model="creatorParticipates" />
        I'm playing in this tournament
      </label>
    </div>

    <TournamentClubRosterFields
      v-if="!isEditMode && clubId"
      v-model:selected-ids="selectedClubPlayerIds"
      :players="clubPlayers ?? []"
      :exclude-player-id="myClubPlayerId"
      :remaining-slots="remainingSlots"
    />
    <TournamentRosterFields
      v-else-if="!isEditMode"
      v-model:invited-uids="invitedUids"
      v-model:guests="guests"
      :exclude-uids="excludeUids"
      :remaining-slots="remainingSlots"
    />

    <div class="tournament-form-footer">
      <template v-if="!isEditMode">
        <button class="btn-sm-primary" :disabled="submitting" @click="submit('upcoming')">
          {{ submitting ? '…' : 'Create Tournament' }}
        </button>
        <button class="btn-sm-ghost" :disabled="submitting" @click="submit('draft')">
          Save Draft
        </button>
      </template>
      <template v-else-if="initial?.status === 'draft'">
        <button class="btn-sm-primary" :disabled="submitting" @click="submit('upcoming')">
          {{ submitting ? '…' : 'Publish Tournament' }}
        </button>
        <button class="btn-sm-ghost" :disabled="submitting" @click="submit('draft')">
          Save Draft
        </button>
      </template>
      <template v-else>
        <button class="btn-sm-primary" :disabled="submitting" @click="submit('upcoming')">
          {{ submitting ? '…' : 'Save Changes' }}
        </button>
      </template>
      <button class="btn-sm-ghost" :disabled="submitting" @click="emit('cancel')">Cancel</button>
    </div>
    <p v-if="formError" class="form-error">{{ formError }}</p>
  </div>
</template>

<style scoped>
.tournament-form {
  padding: 16px 20px;
  background: var(--color-bg-subtle);
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-radius: 12px;
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

.optional-tag {
  color: var(--color-text-faint);
  font-weight: 500;
  text-transform: none;
}

.field-hint {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
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

.sched-input--full {
  width: 100%;
  cursor: text;
}

.sched-input--sm {
  width: 120px;
  cursor: text;
}

.sched-textarea {
  height: auto;
  padding: 8px 10px;
  resize: vertical;
  font-family: 'Inter', sans-serif;
}

.tab-row {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
  width: fit-content;
}

.tab-row--wrap {
  flex-wrap: wrap;
}

.tab {
  padding: 7px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.tab--active {
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab:hover:not(.tab--active):not(:disabled) {
  color: var(--color-text-hover);
}

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sched-datetime-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sched-datetime {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.datetime-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  width: 40px;
  flex-shrink: 0;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.location-row .sched-input {
  flex: 1;
  min-width: 160px;
}

.court-dropdown-wrap {
  position: relative;
  flex: 1;
  min-width: 160px;
}

.court-dropdown-btn {
  width: 100%;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.court-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 20;
  overflow: hidden;
  max-height: 260px;
  overflow-y: auto;
}

.court-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
}

.court-option:hover {
  background: var(--color-bg-soft);
}

.court-option--active {
  background: var(--color-accent-bg);
}

.court-option-name {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 600;
}

.court-option-address {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.stepper-btn:hover:not(:disabled) {
  background: var(--color-bg-soft);
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-value {
  font-family: 'Geist Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  min-width: 24px;
  text-align: center;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.tournament-form-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
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
</style>
