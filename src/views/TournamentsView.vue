<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentsStore } from '@/stores/tournaments'
import type { Tournament } from '@/stores/tournaments'
import { useAuthStore } from '@/stores/auth'
import { useClubsStore } from '@/stores/clubs'
import { courtLabel } from '@/utils/courts'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'

const router = useRouter()
const authStore = useAuthStore()
const tournamentsStore = useTournamentsStore()
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

const publicTournaments = computed(() =>
  tournamentsStore.tournaments.filter((t) => t.visibility === 'public'),
)
// "Mine" = organizing it or an accepted participant in it (not just created).
const myTournaments = computed(() => {
  const uid = authStore.user?.uid
  if (!uid) return []
  return tournamentsStore.tournaments.filter(
    (t) => t.createdBy === uid || t.participantUids.includes(uid),
  )
})

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
  ' · ' +
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const statusLabel = (t: Tournament) =>
  ({ draft: 'Draft', upcoming: 'Upcoming', live: 'Live', completed: 'Completed', cancelled: 'Cancelled' })[
    t.status
  ]

const participantCount = (t: Tournament) => t.participantUids.length + t.guests.length
const myRole = (t: Tournament) => (t.createdBy === authStore.user?.uid ? 'Organizer' : 'Playing')

const goCreate = () => router.push('/tournaments/new')
const openTournament = (id: string) => router.push(`/tournaments/${id}`)
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Tournaments</h1>
          <button class="btn-primary" @click="goCreate">
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
            Create Tournament
          </button>
        </div>

        <div v-if="tournamentsStore.loading" class="loading-state">Loading…</div>

        <template v-else>
          <div class="section">
            <div class="section-title">My Tournaments</div>
            <div v-if="myTournaments.length === 0" class="empty-desc">
              You haven't created or joined a tournament yet.
            </div>
            <div v-else class="cards">
              <div
                v-for="t in myTournaments"
                :key="t.id"
                class="tournament-card"
                @click="openTournament(t.id)"
              >
                <div class="card-top">
                  <span class="card-name">{{ t.name }}</span>
                  <span class="status-pill" :class="`status-pill--${t.status}`">{{
                    statusLabel(t)
                  }}</span>
                </div>
                <span class="card-date">{{ formatDate(t.scheduledAt) }}</span>
                <span v-if="t.court" class="card-court">{{ courtLabel(t.court) }}</span>
                <div class="card-bottom-row">
                  <span class="card-count">{{ participantCount(t) }} / {{ t.maxParticipants }} players</span>
                  <span class="card-role-tag">{{ myRole(t) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Public Tournaments</div>
            <div v-if="publicTournaments.length === 0" class="empty-desc">
              No public tournaments yet.
            </div>
            <div v-else class="cards">
              <div
                v-for="t in publicTournaments"
                :key="t.id"
                class="tournament-card"
                @click="openTournament(t.id)"
              >
                <div class="card-top">
                  <span class="card-name">{{ t.name }}</span>
                  <span class="status-pill" :class="`status-pill--${t.status}`">{{
                    statusLabel(t)
                  }}</span>
                </div>
                <span class="card-date">{{ formatDate(t.scheduledAt) }}</span>
                <span v-if="t.court" class="card-court">{{ courtLabel(t.court) }}</span>
                <span class="card-count">{{ participantCount(t) }} / {{ t.maxParticipants }} players</span>
              </div>
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
  gap: 28px;
}

.page-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  padding: 9px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.loading-state {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.tournament-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.tournament-card:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-name {
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  font-weight: normal;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-date {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  color: var(--color-text-subtle);
}

.card-court {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-faint);
}

.card-count {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
}

.card-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.card-role-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 2px 6px;
  text-transform: uppercase;
  flex-shrink: 0;
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
