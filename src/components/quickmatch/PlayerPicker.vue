<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUsersStore } from '@/stores/users'
import type { StandaloneParticipant } from '@/stores/matches'

const props = defineProps<{
  modelValue: StandaloneParticipant | null
  excludeUids: string[]
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: StandaloneParticipant | null]
}>()

const usersStore = useUsersStore()
const term = ref('')
const showDropdown = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(term, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!value.trim()) {
    usersStore.searchResults = []
    return
  }
  debounceTimer = setTimeout(() => usersStore.searchUsers(value), 250)
})

const results = () =>
  usersStore.searchResults.filter((u) => !props.excludeUids.includes(u.uid))

const selectUser = (u: { uid: string; displayName?: string | null; email?: string }) => {
  emit('update:modelValue', { uid: u.uid, name: u.displayName || u.email || 'Player' })
  term.value = ''
  showDropdown.value = false
}

const addGuest = () => {
  const name = term.value.trim()
  if (!name) return
  emit('update:modelValue', { name })
  term.value = ''
  showDropdown.value = false
}

const clear = () => emit('update:modelValue', null)

const onBlur = () => {
  setTimeout(() => (showDropdown.value = false), 150)
}
</script>

<template>
  <div class="player-picker">
    <span class="picker-label">{{ label }}</span>

    <div v-if="modelValue" class="picker-chip">
      <span class="chip-name">{{ modelValue.name }}</span>
      <span v-if="!modelValue.uid" class="chip-guest-tag">guest</span>
      <button class="chip-clear" type="button" aria-label="Remove" @click="clear">×</button>
    </div>

    <div v-else class="picker-input-wrap">
      <input
        v-model="term"
        type="text"
        class="picker-input"
        placeholder="Search player or type a name…"
        @focus="showDropdown = true"
        @blur="onBlur"
      />
      <div v-if="showDropdown && term.trim()" class="picker-dropdown">
        <button
          v-for="u in results()"
          :key="u.uid"
          class="picker-option"
          type="button"
          @mousedown.prevent="selectUser(u)"
        >
          <span class="option-name">{{ u.displayName || u.email }}</span>
          <span v-if="u.displayName && u.email" class="option-email">{{ u.email }}</span>
        </button>
        <button class="picker-option picker-option--guest" type="button" @mousedown.prevent="addGuest">
          + Add "{{ term.trim() }}" as guest
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.picker-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.option-name {
  font-size: 13px;
  color: var(--color-text);
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

.picker-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-subtle);
}

.chip-name {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-guest-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}

.chip-clear {
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
  flex-shrink: 0;
  transition: background 0.15s;
}

.chip-clear:hover {
  background: var(--color-border);
}
</style>
