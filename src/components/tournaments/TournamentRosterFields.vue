<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUsersStore } from '@/stores/users'
import type { TournamentGuest } from '@/stores/tournaments'
import { formatNtrp } from '@/utils/ntrp'

const invitedUids = defineModel<string[]>('invitedUids', { required: true })
const guests = defineModel<TournamentGuest[]>('guests', { required: true })

const props = defineProps<{
  excludeUids: string[]
  remainingSlots: number
}>()

const usersStore = useUsersStore()
const term = ref('')
const showDropdown = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Names aren't stored on invitedUids (string[]) — kept alongside locally so
// chips can render a label without a round-trip lookup on every render.
const invitedNames = ref<Record<string, string>>({})

const atCap = computed(() => props.remainingSlots <= 0)

watch(term, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!value.trim()) {
    usersStore.searchResults = []
    return
  }
  debounceTimer = setTimeout(() => usersStore.searchUsers(value), 250)
})

const results = () =>
  usersStore.searchResults.filter(
    (u) => !props.excludeUids.includes(u.uid) && !invitedUids.value.includes(u.uid),
  )

const addPlayer = (u: { uid: string; displayName?: string | null; email?: string }) => {
  if (atCap.value) return
  invitedNames.value[u.uid] = u.displayName || u.email || 'Player'
  invitedUids.value = [...invitedUids.value, u.uid]
  term.value = ''
  showDropdown.value = false
}

const removePlayer = (uid: string) => {
  invitedUids.value = invitedUids.value.filter((id) => id !== uid)
  delete invitedNames.value[uid]
}

const addGuest = () => {
  if (atCap.value) return
  const name = term.value.trim()
  if (!name) return
  const guest: TournamentGuest = {
    id: `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    name,
  }
  guests.value = [...guests.value, guest]
  term.value = ''
  showDropdown.value = false
}

const removeGuest = (id: string) => {
  guests.value = guests.value.filter((g) => g.id !== id)
}

const onBlur = () => {
  setTimeout(() => (showDropdown.value = false), 150)
}
</script>

<template>
  <div class="roster-fields">
    <div class="form-section">
      <div class="roster-label-row">
        <label class="field-label">Invite players &amp; guests</label>
        <span class="roster-count" :class="{ 'roster-count--full': atCap }">
          {{ atCap ? 'Roster full' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left` }}
        </span>
      </div>

      <div v-if="invitedUids.length || guests.length" class="roster-chips">
        <div v-for="uid in invitedUids" :key="uid" class="roster-chip">
          <span class="chip-name">{{ invitedNames[uid] ?? uid }}</span>
          <span class="chip-tag">invited</span>
          <button class="chip-clear" type="button" aria-label="Remove" @click="removePlayer(uid)">
            ×
          </button>
        </div>
        <div v-for="g in guests" :key="g.id" class="roster-chip roster-chip--guest">
          <span class="chip-name">{{ g.name }}</span>
          <span class="chip-tag">guest</span>
          <button class="chip-clear" type="button" aria-label="Remove" @click="removeGuest(g.id)">
            ×
          </button>
        </div>
      </div>

      <div class="picker-input-wrap">
        <input
          v-model="term"
          type="text"
          class="picker-input"
          :disabled="atCap"
          placeholder="Search a player or type a guest name…"
          @focus="showDropdown = true"
          @blur="onBlur"
        />
        <div v-if="showDropdown && term.trim() && !atCap" class="picker-dropdown">
          <button
            v-for="u in results()"
            :key="u.uid"
            class="picker-option"
            type="button"
            @mousedown.prevent="addPlayer(u)"
          >
            <span class="option-row">
              <span class="option-name">{{ u.displayName || u.email }}</span>
              <span class="option-ntrp">NTRP {{ formatNtrp(u.rating) }}</span>
            </span>
            <span v-if="u.displayName && u.email" class="option-email">{{ u.email }}</span>
          </button>
          <button class="picker-option picker-option--guest" type="button" @mousedown.prevent="addGuest">
            + Add "{{ term.trim() }}" as guest
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roster-fields {
  display: flex;
  flex-direction: column;
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

.roster-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.roster-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 6px 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-subtle);
}

.roster-chip--guest {
  border-style: dashed;
}

.chip-name {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.chip-clear {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s;
}

.chip-clear:hover {
  background: var(--color-border);
}

.picker-input-wrap {
  position: relative;
}

.picker-input {
  height: 36px;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 10px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  transition: border-color 0.15s;
}

.picker-input:focus {
  border-color: var(--color-accent);
}

.picker-input:disabled {
  background: var(--color-bg-soft);
  cursor: not-allowed;
}

.picker-dropdown {
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
  max-height: 220px;
  overflow-y: auto;
}

.picker-option {
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

.picker-option:hover {
  background: var(--color-bg-soft);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.option-name {
  font-size: 13px;
  color: var(--color-text);
}

.option-ntrp {
  margin-left: auto;
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-faint);
  flex-shrink: 0;
}

.option-email {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.picker-option--guest {
  color: var(--color-accent);
  font-weight: 600;
  font-size: 13px;
  border-top: 1px solid var(--color-bg-soft);
}
</style>
