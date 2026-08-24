<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useTournamentsStore } from '@/stores/tournaments'
import type { Tournament, TournamentRound, TournamentMatchup } from '@/stores/tournaments'
import TeamRoster from '@/components/shared/TeamRoster.vue'
import type { RosterPlayer } from '@/components/shared/TeamRoster.vue'

const props = defineProps<{
  tournament: Tournament
  nameOf: (id: string) => string
  canScore: boolean
}>()

const tournamentsStore = useTournamentsStore()

const activeIndex = ref(props.tournament.schedule?.[0]?.index ?? 1)
const activeRound = computed(() =>
  props.tournament.schedule?.find((r) => r.index === activeIndex.value),
)

const teamPlayers = (ids: [string, string]): RosterPlayer[] =>
  ids.map((id) => ({ id, name: props.nameOf(id) }))

const pointsOptions = computed<number[]>(() => {
  const p = props.tournament.pointsPerRound
  if (p === 'unlimited') return []
  return Array.from({ length: p + 1 }, (_, i) => i)
})

const keyFor = (roundIndex: number, court: number) => `${roundIndex}-${court}`

const openKey = ref<string | null>(null)
const isOpen = (round: TournamentRound, m: TournamentMatchup) =>
  openKey.value === keyFor(round.index, m.court)
const toggleOpen = (round: TournamentRound, m: TournamentMatchup) => {
  if (!props.canScore) return
  const k = keyFor(round.index, m.court)
  openKey.value = openKey.value === k ? null : k
}

interface Draft {
  score1: number | null
  score2: number | null
  custom: boolean
}
const draft = reactive<Record<string, Draft>>({})

const draftFor = (round: TournamentRound, m: TournamentMatchup): Draft => {
  const k = keyFor(round.index, m.court)
  if (!draft[k]) {
    draft[k] = {
      score1: m.score1 ?? null,
      score2: m.score2 ?? null,
      custom: m.score1 === undefined && props.tournament.pointsPerRound === 'unlimited',
    }
  }
  return draft[k]!
}

const selectPreset = (round: TournamentRound, m: TournamentMatchup, value: number) => {
  const d = draftFor(round, m)
  const total = props.tournament.pointsPerRound
  d.score1 = value
  d.score2 = total === 'unlimited' ? d.score2 : total - value
  d.custom = false
}

const canSave = (round: TournamentRound, m: TournamentMatchup) => {
  const d = draftFor(round, m)
  return d.score1 !== null && d.score2 !== null
}

const saving = ref<string | null>(null)
const save = async (round: TournamentRound, m: TournamentMatchup) => {
  const d = draftFor(round, m)
  if (d.score1 === null || d.score2 === null) return
  const k = keyFor(round.index, m.court)
  saving.value = k
  try {
    await tournamentsStore.submitMatchScore(
      props.tournament.id,
      round.index,
      m.court,
      d.score1,
      d.score2,
    )
    openKey.value = null
  } finally {
    saving.value = null
  }
}

// If the schedule shows up after mount (e.g. tournament just started), land
// on its first round instead of staying on the stale default of 1.
watch(
  () => props.tournament.schedule?.length,
  () => {
    if (!props.tournament.schedule?.some((r) => r.index === activeIndex.value)) {
      activeIndex.value = props.tournament.schedule?.[0]?.index ?? 1
    }
  },
)
</script>

<template>
  <div class="rounds-panel">
    <div class="round-tabs">
      <button
        v-for="r in tournament.schedule"
        :key="r.index"
        type="button"
        :class="['round-tab', { 'round-tab--active': activeIndex === r.index }]"
        @click="activeIndex = r.index"
      >
        Round {{ r.index }}
      </button>
    </div>

    <div v-if="activeRound" class="round-card">
      <div class="round-card-hdr">
        Round {{ activeRound.index }} of {{ tournament.schedule!.length }}
      </div>

      <div v-for="m in activeRound.matchups" :key="m.court" class="matchup-card">
        <span class="matchup-court">Court {{ m.court }}</span>

        <div class="matchup-teams-display">
          <TeamRoster
            class="matchup-roster"
            :players="teamPlayers(m.team1)"
            align="start"
            :avatarSize="24"
          />
          <button
            type="button"
            class="matchup-score-btn"
            :class="{ 'matchup-score-btn--clickable': canScore }"
            :disabled="!canScore"
            @click="toggleOpen(activeRound, m)"
          >
            <span class="matchup-score-val">{{
              canScore
                ? (draftFor(activeRound, m).score1 ?? '–')
                : m.score1 !== undefined
                  ? m.score1
                  : '–'
            }}</span>
            <span class="matchup-score-sep">:</span>
            <span class="matchup-score-val">{{
              canScore
                ? (draftFor(activeRound, m).score2 ?? '–')
                : m.score2 !== undefined
                  ? m.score2
                  : '–'
            }}</span>
          </button>
          <TeamRoster
            class="matchup-roster"
            :players="teamPlayers(m.team2)"
            align="end"
            :avatarSize="24"
          />
        </div>

        <div v-if="canScore && isOpen(activeRound, m)" class="score-entry">
          <template v-if="!draftFor(activeRound, m).custom && pointsOptions.length">
            <div class="score-btn-row">
              <button
                v-for="v in pointsOptions"
                :key="v"
                type="button"
                :class="[
                  'score-btn',
                  { 'score-btn--active': draftFor(activeRound, m).score1 === v },
                ]"
                @click="selectPreset(activeRound, m, v)"
              >
                {{ v }}
              </button>
            </div>
            <button class="link-btn" type="button" @click="draftFor(activeRound, m).custom = true">
              Enter custom score
            </button>
          </template>
          <template v-else>
            <div class="custom-score-row">
              <input
                v-model.number="draftFor(activeRound, m).score1"
                type="number"
                min="0"
                class="score-input"
              />
              <span class="custom-score-sep">:</span>
              <input
                v-model.number="draftFor(activeRound, m).score2"
                type="number"
                min="0"
                class="score-input"
              />
            </div>
            <button
              v-if="pointsOptions.length"
              class="link-btn"
              type="button"
              @click="draftFor(activeRound, m).custom = false"
            >
              Use preset buttons
            </button>
          </template>
          <button
            class="btn-save-score"
            type="button"
            :disabled="!canSave(activeRound, m) || saving === keyFor(activeRound.index, m.court)"
            @click="save(activeRound, m)"
          >
            {{ m.score1 !== undefined ? 'Update Score' : 'Save Score' }}
          </button>
        </div>
      </div>

      <p v-if="activeRound.sitOutIds.length" class="sitout-line">
        Sitting out: {{ activeRound.sitOutIds.map(nameOf).join(', ') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.rounds-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.round-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
  overflow-x: auto;
}

.round-tab {
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
  flex-shrink: 0;
}

.round-tab--active {
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.round-tab:hover:not(.round-tab--active) {
  color: var(--color-text-hover);
}

.round-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.round-card-hdr {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.matchup-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-bg-subtle);
  border-radius: 12px;
  padding: 14px 16px;
}

.matchup-court {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.matchup-teams-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.matchup-roster {
  flex: 1;
  min-width: 0;
}

.matchup-score-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 3px 7px;
  border-radius: 6px;
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-text);
  cursor: default;
  transition: background 0.12s;
}

.matchup-score-btn--clickable {
  cursor: pointer;
}

.matchup-score-btn--clickable:hover {
  background: var(--color-bg-soft);
}

.matchup-score-val {
  min-width: 0.6em;
  text-align: center;
}

.matchup-score-sep {
  color: var(--color-bg-muted);
  margin: 0 1px;
}

.score-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border-light);
}

.score-btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.score-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-white);
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s;
}

.score-btn:hover {
  border-color: var(--color-accent-border);
  color: var(--color-text);
}

.score-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.link-btn {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-accent);
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.custom-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-input {
  width: 70px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
}

.score-input:focus {
  border-color: var(--color-primary);
}

.custom-score-sep {
  font-family: 'Geist Mono', monospace;
  color: var(--color-text-faint);
}

.btn-save-score {
  align-self: flex-start;
  height: 32px;
  padding: 0 14px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save-score:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-save-score:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sitout-line {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
}

@media (max-width: 768px) {
  .matchup-teams-display {
    gap: 6px;
  }
}
</style>
