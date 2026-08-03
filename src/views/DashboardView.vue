<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubsStore } from '@/stores/clubs'
import { useMatchesStore } from '@/stores/matches'
import { useNotificationsStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import DashboardStatsRow from '@/components/dashboard/DashboardStatsRow.vue'
import ClubRankingsPanel from '@/components/dashboard/ClubRankingsPanel.vue'
import UpcomingMatchesPanel from '@/components/dashboard/UpcomingMatchesPanel.vue'
import NewMatchModal from '@/components/dashboard/NewMatchModal.vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Player } from '@/stores/players'
import type { RankEntry } from '@/types/dashboard'

const authStore = useAuthStore()
const clubsStore = useClubsStore()
const matchesStore = useMatchesStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()

const mobileMenuOpen = ref(false)

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

let unsubMyPlayers: (() => void) | null = null
let unsubStandaloneMatches: (() => void) | null = null
let unsubAllMatches: (() => void) | null = null
let unsubClubPlayers: (() => void) | null = null

onMounted(() => {
  if (!authStore.user) return
  const uid = authStore.user.uid

  // clubsStore.clubs is kept live app-wide (see App.vue).
  unsubMyPlayers = onSnapshot(
    query(collection(db, 'players'), where('uid', '==', uid)),
    (snap) => {
      myPlayers.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }))
    },
  )

  // Matches I'm invited to but haven't (yet) formally joined the club for.
  unsubStandaloneMatches = matchesStore.subscribeStandaloneMatches(uid)

  // Re-subscribe to club-scoped matches/players whenever the set of clubs
  // I belong to changes (e.g. a new club invite gets accepted).
  watch(
    () => clubsStore.clubs.map((c) => c.id).join(','),
    () => {
      const clubIds = clubsStore.clubs.map((c) => c.id)

      unsubAllMatches?.()
      unsubAllMatches = matchesStore.subscribeAllMatches(clubIds)

      unsubClubPlayers?.()
      if (clubIds.length) {
        unsubClubPlayers = onSnapshot(
          query(collection(db, 'players'), where('clubId', 'in', clubIds)),
          (snap) => {
            allClubPlayers.value = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }))
              .filter((p) => !p.deletedAt)
          },
        )
      } else {
        allClubPlayers.value = []
        unsubClubPlayers = null
      }
    },
    { immediate: true },
  )
})

onUnmounted(() => {
  unsubMyPlayers?.()
  unsubStandaloneMatches?.()
  unsubAllMatches?.()
  unsubClubPlayers?.()
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
// Merge club-scoped matches (from clubs I'm a member of) with matches I'm a
// direct participant in (e.g. invited to play in a club I haven't joined yet).
const myUpcomingMatches = computed(() => {
  const ids = myPlayerIds.value
  const uid = currentUid.value

  const byId = new Map<string, (typeof matchesStore.allMatches)[number]>()
  for (const m of matchesStore.allMatches) byId.set(m.id, m)
  for (const m of matchesStore.standaloneMatches) if (!byId.has(m.id)) byId.set(m.id, m)

  return [...byId.values()]
    .filter((m) => {
      if (!m.scheduledAt || m.winnerTeam || m.status === 'cancelled') return false
      return m.clubId
        ? m.teamA.some((id) => ids.has(id)) || m.teamB.some((id) => ids.has(id))
        : !!uid && !!m.participantUids?.includes(uid)
    })
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
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

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
            <button class="btn-notif" aria-label="Notifications" @click="router.push('/notifications')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span v-if="notificationsStore.unreadCount > 0" class="notif-dot"></span>
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
        <div class="dashboard-panels-row">
          <ClubRankingsPanel :rankEntries="rankEntries" />
          <UpcomingMatchesPanel
            :upcomingMatches="myUpcomingMatches"
            :clubs="clubsStore.clubs"
            @match-click="(clubId) => clubId && router.push(`/clubs/${clubId}`)"
          />
        </div>
      </div>

      <MobileBottomNav active="home" />
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

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.dashboard-panels-row {
  display: flex;
  align-items: stretch;
  gap: 20px;
}

.dashboard-panels-row > * {
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .dashboard-panels-row {
    flex-direction: column;
  }
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
  position: relative;
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

.notif-dot {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-danger);
  border: 1.5px solid var(--color-white);
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
@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .page-hdr {
    display: none;
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
}
</style>
