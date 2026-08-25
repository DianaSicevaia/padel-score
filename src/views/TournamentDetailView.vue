<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsStore } from '@/stores/tournaments'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useClubsStore } from '@/stores/clubs'
import { courtLabel, courtAddress } from '@/utils/courts'
import { matchesPerPlayer, formatMatchesPerPlayer, MIN_PARTICIPANTS } from '@/utils/tournamentRules'
import { isTournamentFullyScored } from '@/utils/tournamentStandings'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'
import TournamentRoundsPanel from '@/components/tournaments/TournamentRoundsPanel.vue'
import TournamentLeaderboardTable from '@/components/tournaments/TournamentLeaderboardTable.vue'

const route = useRoute()
const router = useRouter()
const tournamentsStore = useTournamentsStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()
const clubsStore = useClubsStore()
const mobileMenuOpen = ref(false)

let unsub: (() => void) | null = null
onMounted(() => {
  if (authStore.user) {
    unsub = tournamentsStore.subscribeTournaments(
      authStore.user.uid,
      clubsStore.clubs.map((c) => c.id),
    )
  }
})
onUnmounted(() => unsub?.())

const tournamentId = computed(() => route.params.id as string)
const tournament = computed(() =>
  tournamentsStore.tournaments.find((t) => t.id === tournamentId.value),
)

const currentUid = computed(() => authStore.user?.uid ?? null)
// For a club tournament, edit rights belong to owner and managers.
// Standalone tournaments still belong only to whoever created them.
const isOrganizer = computed(() => {
  if (!tournament.value || !currentUid.value) return false
  if (tournament.value.clubId) {
    const club = clubsStore.clubs.find((c) => c.id === tournament.value!.clubId)
    return !!club && (club.ownerId === currentUid.value || club.adminIds.includes(currentUid.value))
  }
  return tournament.value.createdBy === currentUid.value
})
const isParticipant = computed(
  () =>
    !!tournament.value &&
    !!currentUid.value &&
    tournament.value.participantUids.includes(currentUid.value),
)
// Once a tournament is completed or cancelled, its roster and details are frozen.
const isEditableStatus = computed(
  () => tournament.value?.status === 'draft' || tournament.value?.status === 'upcoming',
)
const canLeave = computed(() => isParticipant.value && !isOrganizer.value && isEditableStatus.value)
const canManageRoster = computed(() => isOrganizer.value && isEditableStatus.value)
const canEdit = computed(() => isOrganizer.value && isEditableStatus.value)
const canCancel = computed(() => isOrganizer.value && isEditableStatus.value)
const canDelete = computed(() => isOrganizer.value)

const organizerName = computed(() => {
  if (!tournament.value) return ''
  const organizer = usersStore.allUsers.find((u) => u.uid === tournament.value!.createdBy)
  return organizer?.displayName || organizer?.email || 'Organizer'
})

const participants = computed(() => {
  if (!tournament.value) return []
  return tournament.value.participantUids.map((uid) => {
    const p = usersStore.allUsers.find((u) => u.uid === uid)
    return {
      id: uid,
      name: p?.displayName || p?.email || 'Player',
      photoUrl: p?.photoUrl,
      backgroundId: p?.avatarBackground,
    }
  })
})

const guestEntries = computed(() =>
  tournament.value ? tournament.value.guests.map((g) => ({ id: g.id, name: g.name })) : [],
)

const rosterNameMap = computed(() => {
  const map = new Map<string, string>()
  for (const p of participants.value) map.set(p.id, p.name)
  for (const g of guestEntries.value) map.set(g.id, g.name)
  return map
})
const nameOf = (id: string) => rosterNameMap.value.get(id) ?? 'Player'

const canStart = computed(() => isOrganizer.value && tournament.value?.status === 'upcoming')
const canFinish = computed(
  () =>
    isOrganizer.value &&
    tournament.value?.status === 'live' &&
    isTournamentFullyScored(tournament.value),
)

const statusLabel = computed(() =>
  tournament.value
    ? {
        draft: 'Draft',
        upcoming: 'Upcoming',
        live: 'Live',
        completed: 'Completed',
        cancelled: 'Cancelled',
      }[tournament.value.status]
    : '',
)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
  ' · ' +
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const pointsLabel = computed(() =>
  tournament.value
    ? tournament.value.pointsPerRound === 'unlimited'
      ? 'No limit'
      : `${tournament.value.pointsPerRound} pts`
    : '',
)

const sitOutLabel = computed(() => {
  if (!tournament.value) return ''
  const opt = tournament.value.sitOutOption
  if (opt === 'none') return '0 pts'
  if (opt === 'third') return '1/3'
  if (opt === 'half') return '1/2'
  return `${tournament.value.sitOutCustomValue ?? 0} pts`
})

const matchesPerPlayerLabel = computed(() =>
  tournament.value
    ? formatMatchesPerPlayer(
        matchesPerPlayer(
          tournament.value.rounds,
          tournament.value.courtsInPlay,
          tournament.value.maxParticipants,
        ),
      )
    : '',
)

const goBack = () => router.push('/tournaments')
const goEdit = () => router.push(`/tournaments/${tournamentId.value}/edit`)

const actionPending = ref(false)

const leaveTournament = async () => {
  if (!currentUid.value || !confirm('Leave this tournament?')) return
  actionPending.value = true
  try {
    await tournamentsStore.removeParticipant(tournamentId.value, currentUid.value)
  } finally {
    actionPending.value = false
  }
}

const removeParticipant = async (uid: string, name: string) => {
  if (!confirm(`Remove ${name} from this tournament?`)) return
  actionPending.value = true
  try {
    await tournamentsStore.removeParticipant(tournamentId.value, uid)
  } finally {
    actionPending.value = false
  }
}

const removeGuest = async (guestId: string, name: string) => {
  if (!confirm(`Remove ${name} from this tournament?`)) return
  actionPending.value = true
  try {
    await tournamentsStore.removeGuest(tournamentId.value, guestId)
  } finally {
    actionPending.value = false
  }
}

const cancelTournament = async () => {
  if (!confirm('Cancel this tournament? It will stay visible but marked as cancelled.')) return
  actionPending.value = true
  try {
    await tournamentsStore.cancelTournament(tournamentId.value)
  } finally {
    actionPending.value = false
  }
}

const startTournament = async () => {
  if (!tournament.value) return
  const rosterIds = [
    ...tournament.value.participantUids,
    ...tournament.value.guests.map((g) => g.id),
  ]
  if (rosterIds.length < MIN_PARTICIPANTS) {
    alert(`Need at least ${MIN_PARTICIPANTS} participants to start.`)
    return
  }
  if (
    !confirm(
      `Start the tournament with ${rosterIds.length} players? The roster locks in once started.`,
    )
  ) {
    return
  }
  actionPending.value = true
  try {
    await tournamentsStore.startTournament(tournamentId.value, rosterIds)
  } finally {
    actionPending.value = false
  }
}

const finishTournament = async () => {
  if (!confirm('Finish the tournament and show the final leaderboard?')) return
  actionPending.value = true
  try {
    await tournamentsStore.completeTournament(tournamentId.value)
  } finally {
    actionPending.value = false
  }
}

const deleteTournament = async () => {
  if (!confirm('Permanently delete this tournament? This cannot be undone.')) return
  actionPending.value = true
  try {
    await tournamentsStore.deleteTournament(tournamentId.value)
    goBack()
  } finally {
    actionPending.value = false
  }
}
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <div v-if="tournamentsStore.loading" class="loading-state">Loading…</div>

        <div v-else-if="!tournament" class="empty-area">
          <p class="empty-desc">Tournament not found.</p>
          <button class="btn-sm-ghost" @click="goBack">Back to Tournaments</button>
        </div>

        <template v-else>
          <div class="page-hdr">
            <button class="btn-back" type="button" @click="goBack">← Tournaments</button>
          </div>

          <div class="panel detail-panel">
            <div class="detail-top">
              <h1 class="tournament-name">{{ tournament.name }}</h1>
              <span class="status-pill" :class="`status-pill--${tournament.status}`">{{
                statusLabel
              }}</span>
            </div>
            <p v-if="tournament.description" class="tournament-desc">
              {{ tournament.description }}
            </p>
            <span class="tournament-organizer">Organized by {{ organizerName }}</span>

            <div v-if="isOrganizer || canLeave" class="action-bar">
              <button
                v-if="canStart"
                class="btn-accent"
                :disabled="actionPending"
                @click="startTournament"
              >
                Start Tournament
              </button>
              <button
                v-if="canFinish"
                class="btn-accent"
                :disabled="actionPending"
                @click="finishTournament"
              >
                Finish Tournament
              </button>
              <button v-if="canEdit" class="btn-sm-ghost" :disabled="actionPending" @click="goEdit">
                Edit
              </button>
              <button
                v-if="canCancel"
                class="btn-sm-ghost"
                :disabled="actionPending"
                @click="cancelTournament"
              >
                Cancel Tournament
              </button>
              <button
                v-if="canDelete"
                class="btn-sm-ghost btn-sm-ghost--danger"
                :disabled="actionPending"
                @click="deleteTournament"
              >
                Delete Tournament
              </button>
              <button
                v-if="canLeave"
                class="btn-sm-ghost btn-sm-ghost--danger"
                :disabled="actionPending"
                @click="leaveTournament"
              >
                Leave Tournament
              </button>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Format</span>
                <span class="detail-value">Classic Americano</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Match type</span>
                <span class="detail-value">{{
                  tournament.matchFormat === 'friendly' ? 'Friendly' : 'Competitive'
                }}</span>
                <span v-if="tournament.matchFormat === 'competitive'" class="detail-sub">{{
                  tournament.clubId ? 'Affects club rating' : 'Affects global rating'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">When</span>
                <span class="detail-value">{{ formatDate(tournament.scheduledAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Court</span>
                <span class="detail-value">{{ courtLabel(tournament.court) }}</span>
                <span v-if="tournament.court" class="detail-sub">{{
                  courtAddress(tournament.court)
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Participants</span>
                <span class="detail-value"
                  >{{ tournament.participantUids.length + tournament.guests.length }} /
                  {{ tournament.maxParticipants }}</span
                >
              </div>
              <div class="detail-item">
                <span class="detail-label">Courts in play</span>
                <span class="detail-value">{{ tournament.courtsInPlay }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Rounds</span>
                <span class="detail-value">{{ tournament.rounds }}</span>
                <span class="detail-sub">≈{{ matchesPerPlayerLabel }} matches per player</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Points per round</span>
                <span class="detail-value">{{ pointsLabel }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sit-out points</span>
                <span class="detail-value">{{ sitOutLabel }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Leaderboard sort</span>
                <span class="detail-value">{{
                  tournament.leaderboardSort === 'wins' ? 'By wins' : 'By points'
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Visibility</span>
                <span class="detail-value">{{
                  tournament.visibility === 'private' ? 'Private' : 'Public'
                }}</span>
              </div>
            </div>

            <div class="roster-section">
              <span class="detail-label">Roster</span>
              <div class="roster-list">
                <div v-for="p in participants" :key="p.id" class="roster-entry">
                  <PlayerAvatar
                    :name="p.name"
                    :photoUrl="p.photoUrl"
                    :backgroundId="p.backgroundId"
                    :id="p.id"
                    :size="28"
                  />
                  <span class="roster-name">{{ p.name }}</span>
                  <button
                    v-if="canManageRoster && p.id !== tournament.createdBy"
                    class="roster-remove-btn"
                    type="button"
                    :disabled="actionPending"
                    aria-label="Remove"
                    @click="removeParticipant(p.id, p.name)"
                  >
                    ×
                  </button>
                </div>
                <div v-for="g in guestEntries" :key="g.id" class="roster-entry">
                  <PlayerAvatar :name="g.name" :id="g.id" :size="28" />
                  <span class="roster-name">{{ g.name }}</span>
                  <span v-if="!tournament.clubId" class="roster-guest-tag">guest</span>
                  <button
                    v-if="canManageRoster"
                    class="roster-remove-btn"
                    type="button"
                    :disabled="actionPending"
                    aria-label="Remove"
                    @click="removeGuest(g.id, g.name)"
                  >
                    ×
                  </button>
                </div>
                <span v-if="participants.length + guestEntries.length === 0" class="empty-desc"
                  >No one has joined yet.</span
                >
              </div>
            </div>

            <div v-if="tournament.status === 'completed'" class="leaderboard-section">
              <span class="detail-label">Leaderboard</span>
              <TournamentLeaderboardTable :tournament="tournament" :name-of="nameOf" />
            </div>

            <div v-if="tournament.schedule && tournament.schedule.length" class="rounds-section">
              <span class="detail-label">Rounds</span>
              <TournamentRoundsPanel
                :tournament="tournament"
                :name-of="nameOf"
                :can-score="isOrganizer && tournament.status === 'live'"
              />
            </div>

            <div v-else class="pairings-placeholder">
              Rounds will appear here once the tournament starts.
            </div>
          </div>
        </template>
      </div>

      <MobileBottomNav />
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
  gap: 16px;
}

.loading-state {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

.empty-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

.page-hdr {
  display: flex;
  align-items: center;
}

.btn-back {
  background: none;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-back:hover {
  color: var(--color-text);
}

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 720px;
}

.detail-panel {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tournament-name {
  font-family: 'Anton', sans-serif;
  font-size: 24px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.tournament-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.tournament-organizer {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-faint);
}

.action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-sm-ghost--danger {
  color: var(--color-danger-text);
  border-color: var(--color-danger-bg-hover);
}

.btn-sm-ghost--danger:hover {
  color: var(--color-danger);
}

.btn-accent {
  height: 36px;
  padding: 0 16px;
  background: var(--color-accent);
  color: var(--color-white);
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-accent:hover:not(:disabled) {
  filter: brightness(0.9);
}

.btn-accent:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.leaderboard-section,
.rounds-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px solid var(--color-bg-soft);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  padding-top: 6px;
  border-top: 1px solid var(--color-bg-soft);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.detail-sub {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--color-text-faint);
}

.roster-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--color-bg-soft);
}

.roster-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg-subtle);
  border-radius: 999px;
  padding: 4px 10px 4px 4px;
}

.roster-name {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text);
}

.roster-guest-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
}

.roster-remove-btn {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s;
}

.roster-remove-btn:hover:not(:disabled) {
  background: var(--color-danger-bg-hover);
  color: var(--color-danger-text);
}

.roster-remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pairings-placeholder {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  color: var(--color-text-faint);
  background: var(--color-bg-soft);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}

.status-pill {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 3px 8px;
  flex-shrink: 0;
  white-space: nowrap;
}

.status-pill--draft {
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
}

.status-pill--upcoming {
  color: #1a6ab0;
  background: var(--color-bg-info);
}

.status-pill--live {
  color: #b0631a;
  background: #fff4e8;
}

.status-pill--completed {
  color: #1a7a3c;
  background: #f0faf3;
}

.status-pill--cancelled {
  color: var(--color-danger-text);
  background: var(--color-danger-bg-hover);
}

.btn-sm-ghost {
  height: 36px;
  padding: 0 12px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-sm-ghost:hover {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .content {
    padding: 20px 16px;
  }
}
</style>
