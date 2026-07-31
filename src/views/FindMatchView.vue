<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMatchesStore, OPEN_SLOT_ID } from '@/stores/matches'
import type { Match } from '@/stores/matches'
import { useUsersStore } from '@/stores/users'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import TeamRoster from '@/components/shared/TeamRoster.vue'
import type { RosterPlayer } from '@/components/shared/TeamRoster.vue'

const authStore = useAuthStore()
const matchesStore = useMatchesStore()
const usersStore = useUsersStore()

const joiningKey = ref<string | null>(null)
const joinError = ref('')

let unsubOpenMatches: (() => void) | null = null

onMounted(() => {
  // usersStore.allUsers is kept live app-wide (see App.vue), so player
  // photos resolve automatically once loaded.
  if (authStore.user) unsubOpenMatches = matchesStore.subscribeOpenMatches(authStore.user.uid)
})

onUnmounted(() => {
  unsubOpenMatches?.()
})

const myName = computed(
  () => authStore.user?.displayName || authStore.user?.email?.split('@')[0] || 'Me',
)

// Find a Match only lists standalone (no-club) matches, so team entries are
// always uids/guest-ids/the open-slot sentinel — safe to resolve directly.
const teamRoster = (m: Match, side: 'A' | 'B'): RosterPlayer[] => {
  const ids = side === 'A' ? m.teamA : m.teamB
  const names = side === 'A' ? m.teamANames : m.teamBNames
  return ids.map((id, i) => {
    const name = names?.[i] ?? id
    const isOpen = id === OPEN_SLOT_ID
    const isGuest = id.startsWith('guest-')
    const profile = !isOpen && !isGuest ? usersStore.allUsers.find((u) => u.uid === id) : undefined
    const pending = !!m.pendingUids?.includes(id)
    return {
      id,
      name,
      photoUrl: profile?.photoUrl,
      backgroundId: profile?.avatarBackground,
      pending,
      isOpen,
    }
  })
}

const hasOpenSide = (m: Match, side: 'A' | 'B') =>
  (side === 'A' ? m.teamA : m.teamB).includes(OPEN_SLOT_ID)

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

const join = async (match: Match, side: 'A' | 'B') => {
  if (!authStore.user) return
  joiningKey.value = `${match.id}-${side}`
  joinError.value = ''
  try {
    await matchesStore.joinOpenSlot(match.id, side, authStore.user.uid, myName.value)
  } catch {
    // The live subscription will reconcile the list on its own shortly.
    joinError.value = 'This slot was just taken — try another match.'
  } finally {
    joiningKey.value = null
  }
}
</script>

<template>
  <div class="page">
    <SidebarNav />

    <div class="main">
      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Find a Match</h1>
          <p class="page-subtitle">Join a scheduled match that still has an open slot.</p>
        </div>

        <p v-if="joinError" class="join-error">{{ joinError }}</p>

        <div v-if="matchesStore.openLoading" class="loading-state">Loading…</div>

        <div v-else-if="matchesStore.openMatches.length === 0" class="empty-area">
          <p class="empty-desc">
            No open matches right now. Check back later, or
            <router-link to="/matches/new" class="empty-link">schedule your own</router-link>.
          </p>
        </div>

        <div v-else class="panel">
          <template v-for="(match, i) in matchesStore.openMatches" :key="match.id">
            <div v-if="i > 0" class="panel-divider"></div>
            <div class="match-row">
              <div class="match-teams">
                <TeamRoster class="find-roster" :players="teamRoster(match, 'A')" align="start" />
                <div class="vs-badge">VS</div>
                <TeamRoster class="find-roster" :players="teamRoster(match, 'B')" align="end" />
              </div>
              <div class="match-meta">
                <span class="match-date">{{ formatDate(match.scheduledAt!) }}</span>
                <div class="join-actions">
                  <button
                    v-if="hasOpenSide(match, 'A')"
                    class="btn-join"
                    :disabled="joiningKey === `${match.id}-A`"
                    title="Join Team A"
                    @click="join(match, 'A')"
                  >
                    + Join Team A
                  </button>
                  <button
                    v-if="hasOpenSide(match, 'B')"
                    class="btn-join"
                    :disabled="joiningKey === `${match.id}-B`"
                    title="Join Team B"
                    @click="join(match, 'B')"
                  >
                    + Join Team B
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  height: 100vh;
  background: var(--color-bg-soft);
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-hdr {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.join-error {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-danger);
  margin: 0;
}

.loading-state {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

.empty-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  text-align: center;
  max-width: 340px;
}

.empty-link {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: underline;
}

.empty-link:hover {
  color: var(--color-primary);
}

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 640px;
  overflow: hidden;
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

.match-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 20px;
}

.match-teams {
  display: flex;
  align-items: center;
  gap: 12px;
}

.find-roster {
  flex: 1;
  min-width: 0;
}

.vs-badge {
  background: var(--color-primary);
  color: var(--color-white);
  border-radius: 999px;
  padding: 4px 12px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.match-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.match-date {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.join-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-join {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px dashed var(--color-accent-border);
  border-radius: 999px;
  padding: 5px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-join:hover:not(:disabled) {
  background: var(--color-accent-border);
}

.btn-join:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .content {
    padding: 20px 16px;
  }
  .panel {
    max-width: 100%;
  }
}
</style>
