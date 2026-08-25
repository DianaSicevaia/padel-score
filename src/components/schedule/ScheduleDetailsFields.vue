<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MatchFormat, CompetitiveScope, GenderPreference } from '@/stores/matches'
import { NTRP_OPTIONS } from '@/utils/ntrp'
import { CITIES, courtsInCity, courtLabel } from '@/utils/courts'

const durationMinutes = defineModel<number>('durationMinutes', { required: true })
const matchFormat = defineModel<MatchFormat>('matchFormat', { required: true })
const competitiveScope = defineModel<CompetitiveScope>('competitiveScope', { required: true })
const rankMin = defineModel<number>('rankMin', { required: true })
const rankMax = defineModel<number>('rankMax', { required: true })
const city = defineModel<string>('city', { required: true })
const court = defineModel<string>('court', { required: true })
const genderPreference = defineModel<GenderPreference>('genderPreference', { required: true })

const DURATION_OPTIONS = [60, 90, 120]

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
</script>

<template>
  <div class="form-section">
    <label class="field-label">Duration</label>
    <div class="tab-row">
      <button
        v-for="d in DURATION_OPTIONS"
        :key="d"
        type="button"
        :class="['tab', { 'tab--active': durationMinutes === d }]"
        @click="durationMinutes = d"
      >
        {{ d }} min
      </button>
    </div>
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

  <div v-if="matchFormat === 'competitive'" class="form-section">
    <label class="field-label">Skill level</label>
    <div class="tab-row">
      <button
        type="button"
        :class="['tab', { 'tab--active': competitiveScope === 'open' }]"
        @click="competitiveScope = 'open'"
      >
        Open to all levels
      </button>
      <button
        type="button"
        :class="['tab', { 'tab--active': competitiveScope === 'ranked' }]"
        @click="competitiveScope = 'ranked'"
      >
        By desired rank
      </button>
    </div>
    <div v-if="competitiveScope === 'ranked'" class="rank-range">
      <select v-model.number="rankMin" class="sched-input sched-input--sm">
        <option v-for="n in NTRP_OPTIONS" :key="n" :value="n">{{ n.toFixed(1) }}</option>
      </select>
      <span class="rank-range-sep">–</span>
      <select v-model.number="rankMax" class="sched-input sched-input--sm">
        <option v-for="n in NTRP_OPTIONS" :key="n" :value="n">{{ n.toFixed(1) }}</option>
      </select>
      <span class="field-hint field-hint--inline"
        >NTRP — shown on the listing, not enforced yet.</span
      >
    </div>
  </div>

  <div class="form-section">
    <label class="field-label">Who's welcome</label>
    <div class="tab-row">
      <button
        type="button"
        :class="['tab', { 'tab--active': genderPreference === 'mixed' }]"
        @click="genderPreference = 'mixed'"
      >
        Mixed
      </button>
      <button
        type="button"
        :class="['tab', { 'tab--active': genderPreference === 'men' }]"
        @click="genderPreference = 'men'"
      >
        Guys only
      </button>
      <button
        type="button"
        :class="['tab', { 'tab--active': genderPreference === 'women' }]"
        @click="genderPreference = 'women'"
      >
        Girls only
      </button>
    </div>
  </div>

  <div class="form-section">
    <label class="field-label">Location</label>
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
</template>

<style scoped>
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

.field-hint--inline {
  margin-left: 4px;
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

.sched-input--sm {
  width: 80px;
  flex-shrink: 0;
}

.tab-row {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
  width: fit-content;
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

.tab:hover:not(.tab--active) {
  color: var(--color-text-hover);
}

.rank-range {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rank-range-sep {
  color: var(--color-text-faint);
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
</style>
