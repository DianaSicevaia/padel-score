<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import { useMatchesStore } from '@/stores/matches'
import type { Match } from '@/stores/matches'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import NewMatchModal from '@/components/dashboard/NewMatchModal.vue'
import MatchesUpcomingSection from '@/components/matches/MatchesUpcomingSection.vue'
import MatchesCompletedGroup from '@/components/matches/MatchesCompletedGroup.vue'

const router = useRouter()
const clubsStore = useClubsStore()
const matchesStore = useMatchesStore()

const showNewMatchModal = ref(false)

const selectClubForMatch = (clubId: string) => {
  showNewMatchModal.value = false
  router.push({ path: `/clubs/${clubId}`, query: { newMatch: '1' } })
}

const goCreateClub = () => {
  showNewMatchModal.value = false
  router.push({ path: '/my-club', query: { create: '1' } })
}

onMounted(async () => {
  if (!clubsStore.clubs.length) await clubsStore.fetchMyClubs()
  await matchesStore.fetchAllMatches(clubsStore.clubs.map((c) => c.id))
})

const isLoading = computed(() => clubsStore.loading || matchesStore.allLoading)

const groupedMatches = computed(() =>
  clubsStore.clubs
    .map((club) => ({
      club,
      matches: matchesStore.allMatches.filter((m) => m.clubId === club.id && m.winnerTeam),
    }))
    .filter((g) => g.matches.length > 0),
)

const groupedScheduled = computed(() =>
  clubsStore.clubs
    .map((club) => ({
      club,
      matches: matchesStore.allMatches.filter(
        (m) => m.clubId === club.id && m.scheduledAt && !m.winnerTeam,
      ),
    }))
    .filter((g) => g.matches.length > 0),
)

const totalCount = computed(() => matchesStore.allMatches.filter((m) => !!m.winnerTeam).length)

const goToClubForPlayNow = (match: Match) => {
  router.push({ path: `/clubs/${match.clubId}`, query: { playNow: match.id } })
}
</script>

<template>
  <div class="page">
    <SidebarNav />

    <div class="main">
      <!-- Mobile top bar -->
      <header class="m-topbar">
        <div class="m-topbar-logo">
          <div class="m-logo-icon">P</div>
          <span class="m-logo-text">Padel Club</span>
        </div>
      </header>

      <!-- Content -->
      <div class="content">
        <div class="page-hdr">
          <div class="page-hdr-left">
            <h1 class="page-title">Matches</h1>
            <span v-if="totalCount > 0" class="total-badge">{{ totalCount }} total</span>
          </div>
          <button class="btn-primary" @click="showNewMatchModal = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Match
          </button>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading…
        </div>

        <!-- Empty state -->
        <div v-else-if="groupedMatches.length === 0 && groupedScheduled.length === 0" class="empty-area">
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <h2 class="empty-title">No matches yet</h2>
            <p class="empty-desc">Go to a club and record your first match.</p>
            <button class="btn-primary" @click="router.push('/my-club')">Go to My Clubs</button>
          </div>
        </div>

        <template v-else>
          <!-- Upcoming scheduled matches -->
          <MatchesUpcomingSection
            v-if="groupedScheduled.length > 0"
            :groups="groupedScheduled"
            @play-now="goToClubForPlayNow"
            @club-click="(id) => router.push(`/clubs/${id}`)"
          />

          <!-- Completed matches by club -->
          <MatchesCompletedGroup
            v-for="group in groupedMatches"
            :key="group.club.id"
            :club="group.club"
            :matches="group.matches"
            @club-click="(id) => router.push(`/clubs/${id}`)"
          />
        </template>
      </div>

      <!-- Mobile bottom nav -->
      <nav class="m-bottom-nav">
        <button class="m-nav-item" @click="router.push('/dashboard')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>
        <button class="m-nav-item m-nav-item--active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span>Matches</span>
        </button>
        <button class="m-nav-item" @click="router.push('/my-club')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Club</span>
        </button>
        <button class="m-nav-item" @click="router.push('/settings')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  </div>

  <NewMatchModal
    :show="showNewMatchModal"
    :clubs="clubsStore.clubs"
    @close="showNewMatchModal = false"
    @select-club="selectClubForMatch"
    @create-club="goCreateClub"
  />
</template>

<style scoped>
.page {
  display: flex;
  height: 100vh;
  background: #f2f3f0;
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

.m-topbar {
  display: none;
}

.m-bottom-nav {
  display: none;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── PAGE HEADER ── */
.page-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-hdr-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: #111111;
  margin: 0;
}

.total-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #666666;
  background: #e7e8e5;
  border-radius: 999px;
  padding: 3px 10px;
}

/* ── LOADING / EMPTY ── */
.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: #666666;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 0.9s linear infinite;
  flex-shrink: 0;
}

.empty-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
  background: #e7e8e5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
}

.empty-title {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: #111111;
  font-weight: normal;
  margin: 0;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
  margin: 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1f4d82;
  color: #ffffff;
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
  background: #163b66;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .m-topbar {
    display: flex;
    align-items: center;
    padding: 14px 20px;
    background: #ffffff;
    flex-shrink: 0;
  }

  .m-topbar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .m-logo-icon {
    width: 28px;
    height: 28px;
    background: #1f4d82;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Anton', sans-serif;
    font-size: 14px;
    color: #ffffff;
    font-weight: normal;
  }

  .m-logo-text {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    color: #111111;
    font-weight: normal;
  }

  .content {
    padding: 20px 16px;
    gap: 20px;
  }

  .m-bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 10px 0;
    background: #ffffff;
    box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
  }

  .m-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 16px;
    background: none;
    border: none;
    cursor: pointer;
    color: #666666;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 400;
  }

  .m-nav-item--active {
    color: #34217c;
    font-weight: 600;
  }
}
</style>
