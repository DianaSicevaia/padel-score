<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useClubsStore } from '@/stores/clubs'
import type { Club } from '@/stores/clubs'
import { useMatchesStore } from '@/stores/matches'
import type { Match } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import NewMatchModal from '@/components/dashboard/NewMatchModal.vue'
import MatchesUpcomingSection from '@/components/matches/MatchesUpcomingSection.vue'
import MatchesCompletedGroup from '@/components/matches/MatchesCompletedGroup.vue'

const router = useRouter()
const clubsStore = useClubsStore()
const matchesStore = useMatchesStore()
const authStore = useAuthStore()
const usersStore = useUsersStore()

// Clubs the user isn't a member of, but is directly invited to play a match
// in (fetched on demand so those matches can still show a real club name).
const externalClubs = ref<Record<string, Club>>({})
const myClubIds = computed(() => new Set(clubsStore.clubs.map((c) => c.id)))

// matches.standaloneMatches is fetched by participation (participantUids),
// so it also contains matches from clubs the user IS a member of — those are
// already covered by allMatches, so only keep the ones not covered there.
const participantMatches = computed(() =>
  matchesStore.standaloneMatches.filter((m) => !m.clubId || !myClubIds.value.has(m.clubId)),
)

watch(participantMatches, async (matches) => {
  const missingIds = Array.from(
    new Set(
      matches
        .map((m) => m.clubId)
        .filter((id): id is string => !!id && !myClubIds.value.has(id) && !externalClubs.value[id]),
    ),
  )
  await Promise.all(
    missingIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'clubs', id))
      if (snap.exists()) externalClubs.value[id] = { id: snap.id, ...(snap.data() as Omit<Club, 'id'>) }
    }),
  )
})

const clubFor = (clubId: string | undefined): Club | undefined =>
  clubId ? externalClubs.value[clubId] : undefined

function groupByClub(matches: Match[]): { club?: Club; matches: Match[] }[] {
  const map = new Map<string, { club?: Club; matches: Match[] }>()
  for (const m of matches) {
    const key = m.clubId ?? '__standalone__'
    if (!map.has(key)) map.set(key, { club: clubFor(m.clubId), matches: [] })
    map.get(key)!.matches.push(m)
  }
  return [...map.values()]
}

const showNewMatchModal = ref(false)

const selectClubForMatch = (clubId: string) => {
  showNewMatchModal.value = false
  router.push({ path: `/clubs/${clubId}`, query: { newMatch: '1' } })
}

const goCreateClub = () => {
  showNewMatchModal.value = false
  router.push({ path: '/my-club', query: { create: '1' } })
}

const goCreateStandalone = () => {
  showNewMatchModal.value = false
  router.push('/matches/new')
}

onMounted(async () => {
  if (!clubsStore.clubs.length) await clubsStore.fetchMyClubs()
  const fetches: Promise<unknown>[] = [matchesStore.fetchAllMatches(clubsStore.clubs.map((c) => c.id))]
  if (authStore.user) fetches.push(matchesStore.fetchStandaloneMatches(authStore.user.uid))
  await Promise.all(fetches)

  // Warm the profile cache so standalone match rows can show real photos.
  const uids = Array.from(
    new Set(
      matchesStore.standaloneMatches.filter((m) => !m.clubId).flatMap((m) => m.participantUids ?? []),
    ),
  )
  if (uids.length) void usersStore.getUsersByUid(uids)
})

const isLoading = computed(
  () => clubsStore.loading || matchesStore.allLoading || matchesStore.standaloneLoading,
)

const participantCompleted = computed(() => participantMatches.value.filter((m) => !!m.winnerTeam))

// Groups (by club, plus one "without a club" group) ordered by the most recent
// match in each group — allMatches/standaloneMatches are already sorted by
// createdAt desc, so each group's first match is its most recent one.
const groupedMatches = computed(() => {
  const clubGroups = clubsStore.clubs
    .map((club) => ({
      club: club as Club | undefined,
      matches: matchesStore.allMatches.filter((m) => m.clubId === club.id && m.winnerTeam),
    }))
    .filter((g) => g.matches.length > 0)

  const groups = [...clubGroups, ...groupByClub(participantCompleted.value)]
  return groups.sort((a, b) => (b.matches[0]?.createdAt ?? 0) - (a.matches[0]?.createdAt ?? 0))
})

const participantScheduled = computed(() =>
  participantMatches.value.filter((m) => m.scheduledAt && !m.winnerTeam && m.status !== 'cancelled'),
)

const groupedScheduled = computed(() => {
  const clubGroups = clubsStore.clubs
    .map((club) => ({
      club: club as Club | undefined,
      matches: matchesStore.allMatches.filter(
        (m) => m.clubId === club.id && m.scheduledAt && !m.winnerTeam && m.status !== 'cancelled',
      ),
    }))
    .filter((g) => g.matches.length > 0)

  return [...clubGroups, ...groupByClub(participantScheduled.value)]
})

const totalCount = computed(
  () =>
    matchesStore.allMatches.filter((m) => !!m.winnerTeam).length + participantCompleted.value.length,
)

const goToClubForPlayNow = (match: Match) => {
  if (match.clubId) {
    router.push({ path: `/clubs/${match.clubId}`, query: { playNow: match.id } })
  } else {
    router.push({ path: '/matches/new', query: { playNow: match.id } })
  }
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
        <div
          v-else-if="groupedMatches.length === 0 && groupedScheduled.length === 0"
          class="empty-area"
        >
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
            :currentUid="authStore.user?.uid ?? null"
            @play-now="goToClubForPlayNow"
            @club-click="(id) => router.push(`/clubs/${id}`)"
          />

          <!-- Completed matches, most recently played club/group first -->
          <MatchesCompletedGroup
            v-for="group in groupedMatches"
            :key="group.club?.id ?? 'standalone'"
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
    @create-standalone="goCreateStandalone"
  />
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
  color: var(--color-text);
  margin: 0;
}

.total-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
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
  color: var(--color-text-muted);
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
    background: var(--color-white);
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
    background: var(--color-primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Anton', sans-serif;
    font-size: 14px;
    color: var(--color-white);
    font-weight: normal;
  }

  .m-logo-text {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    color: var(--color-text);
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
    background: var(--color-white);
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
    color: var(--color-text-muted);
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 400;
  }

  .m-nav-item--active {
    color: var(--color-accent);
    font-weight: 600;
  }
}
</style>
