<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import { usePlayersStore } from '@/stores/players'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import { useMatchesStore } from '@/stores/matches'
import type { Match } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import ClubPlayersPanel from '@/components/club/ClubPlayersPanel.vue'
import MatchForm from '@/components/club/MatchForm.vue'
import MatchRow from '@/components/club/MatchRow.vue'
import ScheduledMatchRow from '@/components/club/ScheduledMatchRow.vue'

const route = useRoute()
const router = useRouter()
const clubsStore = useClubsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const authStore = useAuthStore()

const currentUid = computed(() => authStore.user?.uid ?? null)
const myPlayer = computed(() =>
  currentUid.value ? (playersStore.players.find((p) => p.uid === currentUid.value) ?? null) : null,
)

const clubId = computed(() => route.params.id as string)
const club = computed(() => clubsStore.clubs.find((c) => c.id === clubId.value))
const isLoading = computed(() => clubsStore.loading || playersStore.loading || matchesStore.loading)
const canCreateMatch = computed(() => playersStore.players.length >= 2)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// ── Match form state ───────────────────────────────
const showMatchForm = ref(false)
const formEditingMatch = ref<Match | null>(null)
const formInitialTeamA = ref<string[]>([])
const formInitialTeamB = ref<string[]>([])

const openMatchForm = (match?: Match) => {
  formEditingMatch.value = match ?? null
  formInitialTeamA.value = []
  formInitialTeamB.value = []
  showMatchForm.value = true
}

const closeMatchForm = () => {
  showMatchForm.value = false
  formEditingMatch.value = null
  formInitialTeamA.value = []
  formInitialTeamB.value = []
}

// ── Match actions ──────────────────────────────────
const deletingMatchId = ref<string | null>(null)

const handleDeleteMatch = async (matchId: string) => {
  if (!confirm('Delete this match? Player ratings will be restored to before this match.')) return
  deletingMatchId.value = matchId
  try {
    await matchesStore.deleteMatch(matchId)
  } finally {
    deletingMatchId.value = null
  }
}

const handlePlayNow = async (match: Match) => {
  await matchesStore.cancelScheduledMatch(match.id)
  formEditingMatch.value = null
  formInitialTeamA.value = [...match.teamA]
  formInitialTeamB.value = [...match.teamB]
  showMatchForm.value = true
}

const handleCancelSchedule = async (matchId: string) => {
  if (!confirm('Cancel this scheduled match?')) return
  await matchesStore.cancelScheduledMatch(matchId)
}

const scheduledMatches = computed(() =>
  matchesStore.matches.filter((m) => m.scheduledAt && !m.winnerTeam),
)
const completedMatches = computed(() => matchesStore.matches.filter((m) => !!m.winnerTeam))

// ── Bootstrap ──────────────────────────────────────
let unsubPlayers: (() => void) | null = null
let unsubMatches: (() => void) | null = null

onMounted(async () => {
  // clubsStore.clubs is kept live app-wide (see App.vue) — no fetch needed here.
  unsubPlayers = playersStore.subscribePlayers(clubId.value)
  unsubMatches = matchesStore.subscribeMatches(clubId.value)

  if (route.query.newMatch === '1') {
    openMatchForm()
    router.replace({ params: route.params, query: {} })
  }
  if (route.query.playNow) {
    const matchId = route.query.playNow as string
    const m = await matchesStore.fetchMatchById(matchId)
    if (m) await handlePlayNow(m)
    router.replace({ params: route.params, query: {} })
  }
})

onUnmounted(() => {
  unsubPlayers?.()
  unsubMatches?.()
})
</script>

<template>
  <div class="page">
    <SidebarNav />

    <div class="main">
      <MobileTopBar mode="back" back-to="/my-club" />

      <div class="content">
        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="spinner"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading…
        </div>

        <!-- Club not found -->
        <template v-else-if="!club">
          <div class="not-found">
            <p>Club not found.</p>
            <button class="btn-ghost-back" @click="router.push('/my-club')">
              ← Back to My Clubs
            </button>
          </div>
        </template>

        <!-- Club content -->
        <template v-else>
          <!-- Page header -->
          <div class="page-hdr">
            <div class="page-hdr-left">
              <button class="btn-back" @click="router.push('/my-club')">
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
                  <path d="m15 18-6-6 6-6" />
                </svg>
                My Clubs
              </button>
              <div class="club-header">
                <div class="club-header-avatar">{{ club.name[0]?.toUpperCase() }}</div>
                <div>
                  <h1 class="page-title">{{ club.name }}</h1>
                  <p class="page-subtitle">Owner · Created {{ formatDate(club.createdAt) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Players panel -->
          <ClubPlayersPanel :clubId="clubId" :currentUid="currentUid" :myPlayer="myPlayer" />

          <!-- Matches panel -->
          <div class="panel matches-panel">
            <div class="panel-hdr">
              <span class="panel-title">Matches</span>
              <span class="count-badge">{{ completedMatches.length }}</span>
              <button
                class="btn-sm-primary panel-hdr-btn"
                :disabled="
                  (!canCreateMatch && !formEditingMatch) || (showMatchForm && !formEditingMatch)
                "
                :title="
                  !canCreateMatch && !formEditingMatch
                    ? 'Need at least 2 players to record a match'
                    : ''
                "
                @click="openMatchForm()"
              >
                + New Match
              </button>
            </div>

            <!-- Match form -->
            <template v-if="showMatchForm">
              <div class="panel-divider"></div>
              <MatchForm
                :clubId="clubId"
                :players="playersStore.players"
                :myPlayerId="myPlayer?.id"
                :editingMatch="formEditingMatch"
                :initialTeamA="formInitialTeamA"
                :initialTeamB="formInitialTeamB"
                @cancel="closeMatchForm"
                @saved="closeMatchForm"
              />
            </template>

            <!-- Scheduled matches -->
            <template v-if="scheduledMatches.length > 0">
              <div class="panel-divider"></div>
              <div class="upcoming-header">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Upcoming
              </div>
              <template v-for="match in scheduledMatches" :key="match.id">
                <div class="panel-divider"></div>
                <ScheduledMatchRow
                  :match="match"
                  :players="playersStore.players"
                  :currentUid="currentUid"
                  @play-now="handlePlayNow"
                  @cancel-match="handleCancelSchedule"
                />
              </template>
              <div class="panel-divider"></div>
              <div class="completed-header">Results</div>
            </template>

            <!-- Completed match rows -->
            <template v-for="match in completedMatches" :key="match.id">
              <div class="panel-divider"></div>
              <MatchRow
                :match="match"
                :isDeleting="deletingMatchId === match.id"
                :isEditing="formEditingMatch?.id === match.id"
                :players="playersStore.players"
                @edit="openMatchForm"
                @delete="handleDeleteMatch"
              />
            </template>

            <!-- No matches yet -->
            <template v-if="completedMatches.length === 0 && !showMatchForm">
              <div class="panel-divider"></div>
              <div class="matches-empty">No matches recorded yet.</div>
            </template>
          </div>
        </template>
      </div>
      <!-- end .content -->

      <MobileBottomNav active="club" />
    </div>
  </div>
</template>

<style scoped>
/* ── LAYOUT ── */
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
  gap: 24px;
}

/* ── STATES ── */
.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 0.9s linear infinite;
  flex-shrink: 0;
}

.not-found {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* ── PAGE HEADER ── */
.page-hdr {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-hdr-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.btn-back:hover {
  color: var(--color-accent);
}

.btn-ghost-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
}

.club-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.club-header-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 26px;
  color: var(--color-white);
  font-weight: normal;
  flex-shrink: 0;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 26px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 2px 0 0;
}

/* ── PANEL ── */
.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  max-width: 640px;
}

.matches-panel {
  width: 100%;
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

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

.panel-hdr-btn {
  margin-left: auto;
  height: 30px;
  padding: 0 14px;
  font-size: 12px;
}

.matches-empty {
  padding: 14px 20px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-subtle);
}

/* ── BUTTONS ── */
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

/* ── UPCOMING / COMPLETED LABELS ── */
.upcoming-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px 6px;
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.completed-header {
  padding: 6px 20px 4px;
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .content {
    padding: 20px 16px;
    gap: 20px;
  }

  .page-hdr {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .page-title {
    font-size: 22px;
  }

  .panel {
    max-width: 100%;
  }

  .btn-back {
    display: none;
  }
}
</style>
