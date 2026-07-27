<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import type { StandaloneParticipant } from '@/stores/matches'

const props = defineProps<{
  modelValue: StandaloneParticipant | null
  excludeUids: string[]
  label: string
  allowOpen?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: StandaloneParticipant | null]
}>()

const usersStore = useUsersStore()
const authStore = useAuthStore()
const term = ref('')
const showDropdown = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const myUid = computed(() => authStore.user?.uid)
const myName = computed(
  () => authStore.user?.displayName || authStore.user?.email?.split('@')[0] || 'Me',
)
const canAddSelf = computed(() => !!myUid.value && !props.excludeUids.includes(myUid.value))

const addSelf = () => {
  if (!myUid.value) return
  emit('update:modelValue', { uid: myUid.value, name: myName.value })
  term.value = ''
  showDropdown.value = false
}

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

const leaveOpen = () => {
  emit('update:modelValue', { name: 'Open slot', isOpen: true })
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
    <div class="picker-label-row">
      <span class="picker-label">{{ label }}</span>
      <button v-if="!modelValue && canAddSelf" class="btn-add-self" type="button" @click="addSelf">
        Add yourself
      </button>
    </div>

    <div v-if="modelValue" class="picker-chip" :class="{ 'picker-chip--open': modelValue.isOpen }">
      <span class="chip-name">{{ modelValue.isOpen ? 'Open — anyone can join' : modelValue.name }}</span>
      <span v-if="!modelValue.uid && !modelValue.isOpen" class="chip-guest-tag">guest</span>
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
      <button v-if="allowOpen" class="btn-leave-open" type="button" @mousedown.prevent="leaveOpen">
        Leave this slot open
      </button>
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

.picker-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.picker-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-add-self {
  background: none;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  cursor: pointer;
}

.btn-add-self:hover {
  text-decoration: underline;
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

.picker-chip--open {
  border-style: dashed;
  border-color: var(--color-accent-border);
  background: var(--color-accent-bg);
}

.picker-chip--open .chip-name {
  color: var(--color-accent);
  font-weight: 600;
}

.btn-leave-open {
  margin-top: 6px;
  background: none;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  text-decoration: underline dotted;
}

.btn-leave-open:hover {
  color: var(--color-accent);
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
