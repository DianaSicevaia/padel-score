<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubsStore } from '@/stores/clubs'
import { useMatchesStore } from '@/stores/matches'
import { useRouter } from 'vue-router'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import DashboardStatsRow from '@/components/dashboard/DashboardStatsRow.vue'
import ClubRankingsPanel from '@/components/dashboard/ClubRankingsPanel.vue'
import NewMatchModal from '@/components/dashboard/NewMatchModal.vue'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Player } from '@/stores/players'
import type { RankEntry } from '@/types/dashboard'

const authStore = useAuthStore()
const clubsStore = useClubsStore()
const matchesStore = useMatchesStore()
const router = useRouter()

const currentUid = computed(() => authStore.user?.uid ?? null)

const displayName = computed(() => {
  const user = authStore.user
  if (!user) return 'Player'
  return user.displayName || user.email?.split('@')[0] || 'Player'
})

const initials = computed(() => {
  const name = displayName.value
  const parts = name.trim().split(/[\s._-]+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

// ── New Match modal ────────────────────────────────
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

// ── Match data ─────────────────────────────────────
const myPlayers = ref<Player[]>([])
const allClubPlayers = ref<Player[]>([])

function weekStart(d: Date): number {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

onMounted(async () => {
  if (!authStore.user) return
  await clubsStore.fetchMyClubs()
  const uid = authStore.user.uid
  const clubIds = clubsStore.clubs.map((c) => c.id)

  const fetches: Promise<unknown>[] = [
    getDocs(query(collection(db, 'players'), where('uid', '==', uid))).then((snap) => {
      myPlayers.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }))
    }),
    matchesStore.fetchAllMatches(clubIds),
  ]

  if (clubIds.length) {
    fetches.push(
      getDocs(query(collection(db, 'players'), where('clubId', 'in', clubIds))).then((snap) => {
        allClubPlayers.value = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }))
          .filter((p) => !p.deletedAt)
      }),
    )
  }

  await Promise.all(fetches)
})

const myPlayerIds = computed(() => new Set(myPlayers.value.map((p) => p.id)))

const myMatches = computed(() => {
  const ids = myPlayerIds.value
  if (!ids.size) return []
  return matchesStore.allMatches.filter(
    (m) => m.teamA.some((id) => ids.has(id)) || m.teamB.some((id) => ids.has(id)),
  )
})

const totalWins = computed(() => myPlayers.value.reduce((s, p) => s + p.wins, 0))
const totalLosses = computed(() => myPlayers.value.reduce((s, p) => s + p.losses, 0))
const winRate = computed(() => {
  const total = totalWins.value + totalLosses.value
  if (!total) return '—'
  return Math.round((totalWins.value / total) * 100) + '%'
})

const thisWeekStart = computed(() => weekStart(new Date()))
const lastWeekStart = computed(() => thisWeekStart.value - 7 * 24 * 60 * 60 * 1000)

const isFirstWeek = computed(() => {
  const ct = authStore.user?.metadata.creationTime
  if (!ct) return true
  return new Date(ct).getTime() >= lastWeekStart.value
})

const matchesThisWeek = computed(
  () => myMatches.value.filter((m) => m.createdAt >= thisWeekStart.value).length,
)
const matchesLastWeek = computed(
  () =>
    myMatches.value.filter(
      (m) => m.createdAt >= lastWeekStart.value && m.createdAt < thisWeekStart.value,
    ).length,
)

const matchesPlayedChange = computed((): string | null => {
  if (isFirstWeek.value) return null
  const diff = matchesThisWeek.value - matchesLastWeek.value
  if (diff === 0) return null
  return diff > 0 ? `+${diff} this week` : `${diff} this week`
})

const rankEntries = computed((): RankEntry[] => {
  const map = new Map<string, RankEntry>()
  for (const p of allClubPlayers.value) {
    const key = p.uid ?? `player_${p.id}`
    const e = map.get(key)
    if (e) {
      e.wins += p.wins
      e.losses += p.losses
      e.matchesPlayed += p.matchesPlayed
      e.rating += p.rating
    } else {
      map.set(key, {
        key,
        name: p.name,
        wins: p.wins,
        losses: p.losses,
        matchesPlayed: p.matchesPlayed,
        rating: p.rating,
        isMe: !!currentUid.value && p.uid === currentUid.value,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || b.matchesPlayed - a.matchesPlayed)
})

const myRank = computed(() => {
  if (!currentUid.value) return null
  const idx = rankEntries.value.findIndex((r) => r.isMe)
  return idx >= 0 ? idx + 1 : null
})

const _initRankData = (): { current: number; prev: number | null } | null => {
  try {
    return JSON.parse(localStorage.getItem('rankData') ?? 'null')
  } catch {
    return null
  }
}
const rankData = ref<{ current: number; prev: number | null } | null>(_initRankData())

watch(myRank, (rank) => {
  if (rank === null) return
  const cur = rankData.value
  if (!cur || cur.current !== rank) {
    const next = { current: rank, prev: cur?.current ?? null }
    rankData.value = next
    localStorage.setItem('rankData', JSON.stringify(next))
  }
})

const rankChangeText = computed((): string | null => {
  const data = rankData.value
  if (!data?.prev || data.prev === data.current) return null
  const diff = data.prev - data.current
  const n = Math.abs(diff)
  return diff > 0
    ? `Up ${n} position${n !== 1 ? 's' : ''}`
    : `Down ${n} position${n !== 1 ? 's' : ''}`
})

// ── Upcoming matches ──────────────────────────────
const myUpcomingMatches = computed(() => {
  const ids = myPlayerIds.value
  if (!ids.size) return []
  return matchesStore.allMatches
    .filter(
      (m) =>
        m.scheduledAt &&
        !m.winnerTeam &&
        (m.teamA.some((id) => ids.has(id)) || m.teamB.some((id) => ids.has(id))),
    )
    .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))
})

// ── Points ────────────────────────────────────────
const pointsForMatches = (matches: typeof myMatches.value) => {
  const ids = myPlayerIds.value
  return matches
    .filter((m) => m.winnerTeam)
    .reduce((sum, m) => {
      const onTeamA = m.teamA.some((id) => ids.has(id))
      return sum + (m.sets ?? []).reduce((s, set) => s + (onTeamA ? set.scoreA : set.scoreB), 0)
    }, 0)
}

const totalPointsThisWeek = computed(() =>
  pointsForMatches(myMatches.value.filter((m) => m.createdAt >= thisWeekStart.value)),
)

const totalPointsLastWeek = computed(() =>
  pointsForMatches(
    myMatches.value.filter(
      (m) => m.createdAt >= lastWeekStart.value && m.createdAt < thisWeekStart.value,
    ),
  ),
)

const totalPointsChange = computed((): string | null => {
  if (isFirstWeek.value) return null
  const diff = totalPointsThisWeek.value - totalPointsLastWeek.value
  if (diff === 0) return null
  return diff > 0 ? `+${diff} vs last week` : `${diff} vs last week`
})

const stats = computed(() => [
  {
    label: 'MATCHES PLAYED',
    value: String(myMatches.value.length || 0),
    change: matchesPlayedChange.value,
  },
  { label: 'WIN RATE', value: winRate.value, change: null as string | null },
  {
    label: 'CLUB RANKING',
    value: myRank.value !== null ? `#${myRank.value}` : '—',
    change: rankChangeText.value,
  },
  {
    label: 'TOTAL POINTS',
    value: totalPointsThisWeek.value > 0 ? String(totalPointsThisWeek.value) : '—',
    change: totalPointsChange.value,
  },
])
</script>

<template>
  <div class="dashboard">
    <SidebarNav />

    <div class="main">
      <!-- Mobile top bar -->
      <header class="m-topbar">
        <button class="m-topbar-btn" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="m-topbar-logo">
          <div class="m-logo-icon">P</div>
          <span class="m-logo-text">Padel Club</span>
        </div>
        <button class="m-topbar-btn" aria-label="Notifications">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </header>

      <!-- Scrollable content -->
      <div class="content">
        <!-- Desktop page header -->
        <div class="page-hdr">
          <div class="page-hdr-text">
            <h1 class="page-title">Welcome back, {{ displayName }}</h1>
            <p class="page-subtitle">Here's what's happening with your padel game</p>
          </div>
          <div class="page-hdr-actions">
            <button class="btn-primary" @click="showNewMatchModal = true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Match
            </button>
            <button class="btn-notif" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile welcome -->
        <div class="m-welcome">
          <div class="m-welcome-text">
            <h1 class="page-title">Welcome back, {{ displayName }}</h1>
            <p class="m-welcome-sub">Your padel stats at a glance</p>
          </div>
          <div class="m-avatar">{{ initials }}</div>
        </div>

        <!-- Stats grid -->
        <DashboardStatsRow :stats="stats" />

        <!-- Mobile New Match button -->
        <button class="m-btn-primary" @click="showNewMatchModal = true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Match
        </button>

        <!-- Club Rankings + Upcoming Matches -->
        <ClubRankingsPanel
          :rankEntries="rankEntries"
          :upcomingMatches="myUpcomingMatches"
          :clubs="clubsStore.clubs"
          @match-click="(clubId) => clubId && router.push(`/clubs/${clubId}`)"
        />
      </div>

      <!-- Mobile bottom nav -->
      <nav class="m-bottom-nav">
        <button class="m-nav-item m-nav-item--active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>
        <button class="m-nav-item" @click="router.push('/matches')">
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
/* ── LAYOUT ── */
.dashboard {
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
  width: 100%;
  gap: 16px;
}

.page-hdr-text {
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

.page-hdr-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

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
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-notif {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--color-white);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-muted);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: background 0.15s;
  flex-shrink: 0;
}

.btn-notif:hover {
  background: var(--color-bg-soft);
}

/* Mobile welcome - hidden on desktop */
.m-welcome {
  display: none;
}

.m-btn-primary {
  display: none;
}

/* ── MOBILE ── */
.m-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .page-hdr {
    display: none;
  }

  .m-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: var(--color-white);
    flex-shrink: 0;
  }

  .m-topbar-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
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

  .m-welcome {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .m-welcome-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .page-title {
    font-size: 22px;
  }

  .m-welcome-sub {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0;
  }

  .m-avatar {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: var(--color-bg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  .m-btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    background: var(--color-primary);
    color: var(--color-white);
    border: none;
    border-radius: 999px;
    padding: 12px 0;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .m-btn-primary:hover {
    background: var(--color-primary-hover);
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
