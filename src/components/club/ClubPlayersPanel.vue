<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { usePlayersStore } from '@/stores/players'
import { useClubsStore } from '@/stores/clubs'
import { useAuthStore } from '@/stores/auth'
import type { Player } from '@/stores/players'

const props = defineProps<{
  clubId: string
  currentUid: string | null
  myPlayer: Player | null
  isOwner: boolean
}>()

const playersStore = usePlayersStore()
const clubsStore = useClubsStore()
const authStore = useAuthStore()

const playerInitial = (p: Player) => p.name[0]?.toUpperCase() ?? '?'
const playerStats = (p: Player): string => {
  const parts: string[] = []
  if (p.matchesPlayed > 0) parts.push(`${p.matchesPlayed} matches · ${p.wins}W / ${p.losses}L`)
  if (p.rating > 0) parts.push(`Rating ${p.rating}`)
  return parts.join(' · ')
}

// ── Add player dropdown ────────────────────────────
const showAddMenu = ref(false)
const addMenuRef = ref<HTMLElement | null>(null)

const handleMenuOutsideClick = (e: MouseEvent) => {
  if (!addMenuRef.value?.contains(e.target as Node)) showAddMenu.value = false
}

watch(showAddMenu, (open) => {
  if (open) document.addEventListener('mousedown', handleMenuOutsideClick)
  else document.removeEventListener('mousedown', handleMenuOutsideClick)
})

onUnmounted(() => document.removeEventListener('mousedown', handleMenuOutsideClick))

// ── Add self ───────────────────────────────────────
const addSelf = async () => {
  if (!props.isOwner || !authStore.user || props.myPlayer) return
  const name = authStore.user.displayName || authStore.user.email?.split('@')[0] || 'Me'
  try {
    await playersStore.createPlayer(props.clubId, name, authStore.user.uid)
  } catch {
    /* silent */
  }
}

// ── Guest add form ─────────────────────────────────
const showAddForm = ref(false)
const newPlayerName = ref('')
const addError = ref('')
const adding = ref(false)

const openAdd = () => {
  if (!props.isOwner) return
  showSelectPicker.value = false
  showEmailForm.value = false
  newPlayerName.value = ''
  addError.value = ''
  showAddForm.value = true
}

const cancelAdd = () => {
  showAddForm.value = false
  addError.value = ''
}

const submitAdd = async () => {
  if (!props.isOwner) return
  if (!newPlayerName.value.trim()) {
    addError.value = 'Please enter a player name.'
    return
  }
  adding.value = true
  addError.value = ''
  try {
    await playersStore.createPlayer(props.clubId, newPlayerName.value)
    newPlayerName.value = ''
    showAddForm.value = false
  } catch {
    addError.value = 'Failed to add player. Please try again.'
  } finally {
    adding.value = false
  }
}

// ── Email invite ───────────────────────────────────
const showEmailForm = ref(false)
const inviteEmail = ref('')
const inviteError = ref('')
const inviting = ref(false)

const openEmailForm = () => {
  if (!props.isOwner) return
  showAddForm.value = false
  showSelectPicker.value = false
  cancelEdit()
  inviteEmail.value = ''
  inviteError.value = ''
  showEmailForm.value = true
}

const closeEmailForm = () => {
  showEmailForm.value = false
  inviteEmail.value = ''
  inviteError.value = ''
}

const submitEmailInvite = async () => {
  if (!props.isOwner) return
  if (!inviteEmail.value.trim()) {
    inviteError.value = 'Enter an email address.'
    return
  }
  inviting.value = true
  inviteError.value = ''
  try {
    const result = await playersStore.addPlayerByEmail(props.clubId, inviteEmail.value)
    if (result === 'not_found') inviteError.value = 'No account found with that email.'
    else if (result === 'already_added') inviteError.value = 'That player is already in this club.'
    else closeEmailForm()
  } catch {
    inviteError.value = 'Could not find user. Check the email and try again.'
  } finally {
    inviting.value = false
  }
}

// ── Select picker ──────────────────────────────────
const showSelectPicker = ref(false)
const selectSearch = ref('')
const loadingSelectable = ref(false)

const otherClubs = computed(() => clubsStore.clubs.filter((c) => c.id !== props.clubId))
const filteredSelectablePlayers = computed(() => {
  const q = selectSearch.value.toLowerCase().trim()
  const seen = new Set<string>()
  return playersStore.selectablePlayers.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false
    const key = p.uid ?? p.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})
const currentPlayerNames = computed(
  () => new Set(playersStore.players.map((p) => p.name.toLowerCase().trim())),
)
const isAlreadyAdded = (p: Player) => currentPlayerNames.value.has(p.name.toLowerCase().trim())
const clubName = (cid: string) => clubsStore.clubs.find((c) => c.id === cid)?.name ?? 'Other Club'

const openSelectPicker = async () => {
  if (!props.isOwner) return
  showAddForm.value = false
  showEmailForm.value = false
  cancelEdit()
  selectSearch.value = ''
  showSelectPicker.value = true
  loadingSelectable.value = true
  try {
    await playersStore.fetchSelectablePlayers(otherClubs.value.map((c) => c.id))
  } finally {
    loadingSelectable.value = false
  }
}

const handleSelectPlayer = async (p: Player) => {
  if (!props.isOwner) return
  await playersStore.createPlayer(props.clubId, p.name)
  showSelectPicker.value = false
}

// ── Edit player ────────────────────────────────────
const editingId = ref<string | null>(null)
const editName = ref('')

const startEdit = (p: Player) => {
  if (!props.isOwner) return
  editingId.value = p.id
  editName.value = p.name
}

const cancelEdit = () => {
  editingId.value = null
  editName.value = ''
}

const submitEdit = async (p: Player) => {
  if (!props.isOwner) return
  if (!editName.value.trim()) {
    cancelEdit()
    return
  }
  try {
    await playersStore.updatePlayer(p.id, { name: editName.value })
    cancelEdit()
  } catch {
    /* silent */
  }
}

// ── Delete player ──────────────────────────────────
const deletingId = ref<string | null>(null)

const handleDelete = async (p: Player) => {
  if (!props.isOwner) return
  if (!confirm(`Remove "${p.name}" from this club?`)) return
  deletingId.value = p.id
  try {
    await playersStore.deletePlayer(p)
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div
    v-if="playersStore.players.length > 0 || showAddForm || showSelectPicker || showEmailForm"
    class="panel players-panel"
  >
    <div class="panel-hdr">
      <span class="panel-title">Players</span>
      <span class="count-badge">{{ playersStore.players.length }}</span>
      <div v-if="isOwner" class="hdr-actions">
        <button v-if="!myPlayer" class="btn-outline" @click="addSelf">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            <line x1="12" y1="3" x2="12" y2="1" />
          </svg>
          Add Yourself
        </button>
        <div ref="addMenuRef" class="add-player-wrap">
          <button class="btn-primary" @click="showAddMenu = !showAddMenu">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Player
            <svg
              class="add-menu-chevron"
              :class="{ 'add-menu-chevron--open': showAddMenu }"
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="showAddMenu" class="add-player-menu">
            <button class="add-menu-item" @click="(openAdd(), (showAddMenu = false))">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Guest player
            </button>
            <button class="add-menu-item" @click="(openEmailForm(), (showAddMenu = false))">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Add by email
            </button>
            <button class="add-menu-item" @click="(openSelectPicker(), (showAddMenu = false))">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
              Select player
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Select picker -->
    <template v-if="showSelectPicker">
      <div class="panel-divider"></div>
      <div class="select-picker">
        <div class="select-toolbar">
          <input
            v-model="selectSearch"
            class="field-input-sm"
            placeholder="Search players…"
            autofocus
          />
          <button class="btn-sm-ghost" @click="showSelectPicker = false">Cancel</button>
        </div>
        <div v-if="loadingSelectable" class="select-feedback">Loading…</div>
        <template v-else>
          <div v-if="filteredSelectablePlayers.length === 0" class="select-feedback">
            No players available from other clubs.
          </div>
          <template v-else>
            <div class="panel-divider"></div>
            <div
              v-for="p in filteredSelectablePlayers"
              :key="p.id"
              class="select-player-row"
              :class="{ 'select-player-row--taken': isAlreadyAdded(p) }"
              @click="!isAlreadyAdded(p) && handleSelectPlayer(p)"
            >
              <div class="player-avatar" :class="{ 'player-avatar--muted': isAlreadyAdded(p) }">
                {{ playerInitial(p) }}
              </div>
              <div class="player-info">
                <span class="player-name">{{ p.name }}</span>
                <span class="player-stats">{{ clubName(p.clubId) }}</span>
              </div>
              <span v-if="isAlreadyAdded(p)" class="select-taken-badge">Selected</span>
              <span v-else class="select-add-hint">+ Add</span>
            </div>
          </template>
        </template>
      </div>
    </template>

    <!-- Email invite form -->
    <template v-if="showEmailForm">
      <div class="panel-divider"></div>
      <div class="add-row add-row--email">
        <input
          v-model="inviteEmail"
          class="field-input-sm"
          type="email"
          placeholder="friend@email.com"
          autofocus
          @keyup.enter="submitEmailInvite"
          @keyup.esc="closeEmailForm"
        />
        <button class="btn-sm-primary" :disabled="inviting" @click="submitEmailInvite">
          {{ inviting ? '…' : 'Add' }}
        </button>
        <button class="btn-sm-ghost" :disabled="inviting" @click="closeEmailForm">Cancel</button>
      </div>
      <p v-if="inviteError" class="add-error">{{ inviteError }}</p>
    </template>

    <!-- Guest add form -->
    <template v-if="showAddForm">
      <div class="panel-divider"></div>
      <div class="add-row">
        <input
          v-model="newPlayerName"
          class="field-input-sm"
          placeholder="Player name…"
          autofocus
          maxlength="60"
          @keyup.enter="submitAdd"
          @keyup.esc="cancelAdd"
        />
        <button class="btn-sm-primary" :disabled="adding" @click="submitAdd">
          {{ adding ? '…' : 'Add' }}
        </button>
        <button class="btn-sm-ghost" :disabled="adding" @click="cancelAdd">Cancel</button>
      </div>
      <p v-if="addError" class="add-error">{{ addError }}</p>
    </template>

    <!-- Player rows -->
    <template v-for="player in playersStore.players" :key="player.id">
      <div class="panel-divider"></div>
      <div v-if="editingId !== player.id" class="player-row">
        <div class="player-avatar" :class="{ 'player-avatar--me': player.uid === currentUid }">
          {{ playerInitial(player) }}
        </div>
        <div class="player-info">
          <div class="player-name-row">
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.uid === currentUid" class="you-badge">You</span>
            <span v-else-if="player.uid" class="linked-badge">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span v-if="player.status === 'requested'" class="requested-badge">requested</span>
          </div>
          <span v-if="playerStats(player)" class="player-stats">{{ playerStats(player) }}</span>
        </div>
        <div v-if="isOwner" class="player-actions">
          <button class="btn-icon" title="Edit player" @click="startEdit(player)">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
          <button
            class="btn-icon btn-icon-danger"
            :disabled="deletingId === player.id"
            title="Delete player"
            @click="handleDelete(player)"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      <div v-else class="player-row player-row--edit">
        <div class="player-avatar">{{ playerInitial(player) }}</div>
        <input
          v-model="editName"
          class="field-input-sm"
          autofocus
          maxlength="60"
          @keyup.enter="submitEdit(player)"
          @keyup.esc="cancelEdit"
        />
        <div class="player-actions">
          <button class="btn-icon btn-icon-confirm" title="Save" @click="submitEdit(player)">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <button class="btn-icon" title="Cancel" @click="cancelEdit">
            <svg
              width="15"
              height="15"
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
        </div>
      </div>
    </template>
  </div>

  <!-- Empty state -->
  <div v-else class="empty-area">
    <div class="empty-state">
      <div class="empty-icon">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <h2 class="empty-title">No players yet</h2>
      <p class="empty-desc">
        {{
          isOwner
            ? 'Add players to start building your club roster.'
            : 'The club owner hasn’t added any players yet.'
        }}
      </p>
      <button v-if="isOwner" class="btn-primary" @click="openAdd">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Player
      </button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  max-width: 640px;
  min-height: 200px;
}

.players-panel {
  width: 100%;
  min-height: 30%;
}

.panel-hdr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
}

.panel-title {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: var(--color-text);
  font-weight: normal;
}

.count-badge {
  background: var(--color-bg-muted);
  color: var(--color-text-muted);
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 8px;
}

.hdr-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

/* ── Player rows ── */
.player-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  transition: background 0.12s;
}

.player-row:hover {
  background: var(--color-bg-subtle);
}

.player-row--edit {
  background: var(--color-bg-subtle);
  padding: 10px 20px;
}

.player-row--edit:hover {
  background: var(--color-bg-subtle);
}

.player-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  color: var(--color-white);
  font-weight: normal;
  flex-shrink: 0;
}

.player-avatar--me {
  background: var(--color-accent);
}

.player-avatar--muted {
  background: var(--color-text-faint);
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.player-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.player-name {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.you-badge {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.03em;
}

.linked-badge {
  color: var(--color-text-subtle);
  display: flex;
  align-items: center;
}

.requested-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.player-stats {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}

.player-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

/* ── Add row ── */
.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-bg-subtle);
}

.add-row--email {
  gap: 8px;
}

.add-error {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-danger);
  padding: 0 20px 8px;
  margin: 0;
}

/* ── Select picker ── */
.select-picker {
  background: var(--color-bg-subtle);
}

.select-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
}

.select-feedback {
  padding: 12px 20px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-subtle);
  text-align: center;
}

.select-player-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.12s;
}

.select-player-row:hover:not(.select-player-row--taken) {
  background: var(--color-bg-soft);
}

.select-player-row--taken {
  cursor: default;
  opacity: 0.6;
}

.select-player-row:hover .select-add-hint {
  opacity: 1;
}

.select-add-hint {
  margin-left: auto;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.select-taken-badge {
  margin-left: auto;
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 999px;
  padding: 2px 10px;
  flex-shrink: 0;
}

/* ── Add player dropdown ── */
.add-player-wrap {
  position: relative;
}

.add-menu-chevron {
  transition: transform 0.15s;
  flex-shrink: 0;
}

.add-menu-chevron--open {
  transform: rotate(180deg);
}

.add-player-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-bg-muted);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  min-width: 190px;
  z-index: 200;
  overflow: hidden;
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  text-align: left;
  transition: background 0.1s;
}

.add-menu-item + .add-menu-item {
  border-top: 1px solid var(--color-bg-soft);
}

.add-menu-item:hover {
  background: var(--color-bg-hover);
}

.add-menu-item svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* ── Empty state ── */
.empty-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 340px;
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.empty-title {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: var(--color-text);
  font-weight: normal;
  margin: 0;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

/* ── Buttons ── */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--color-accent);
  border: 1.5px solid var(--color-border);
  border-radius: 999px;
  padding: 9px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-outline:hover {
  border-color: var(--color-accent);
  background: rgba(52, 33, 124, 0.04);
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

.btn-icon-confirm:hover:not(:disabled) {
  background: #dfe6e1;
  color: #004d1a;
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.field-input-sm {
  flex: 1;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  min-width: 0;
  transition: border-color 0.15s;
}

.field-input-sm:focus {
  border-color: var(--color-accent);
}

@media (max-width: 768px) {
  .panel {
    max-width: 100%;
  }
}
</style>
