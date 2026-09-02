<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import type { UserProfile, Gender, PreferredSide } from '@/stores/users'
import { formatNtrp, ntrpToRating, NTRP_OPTIONS } from '@/utils/ntrp'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'

const router = useRouter()
const usersStore = useUsersStore()

const mobileMenuOpen = ref(false)

const TOP_DEFAULT = 10
const PAGE_SIZE = 15

onMounted(() => {
  usersStore.ensureAllUsersLoaded()
})

// ── Search + filters ────────────────────────────────
const searchTerm = ref('')
const sortBy = ref<'rating' | 'name'>('rating')
const genderFilter = ref<Gender | 'all'>('all')
const sideFilter = ref<PreferredSide | 'none' | 'all'>('all')
const ntrpMin = ref<number | null>(null)
const ntrpMax = ref<number | null>(null)

const resetFilters = () => {
  searchTerm.value = ''
  sortBy.value = 'rating'
  genderFilter.value = 'all'
  sideFilter.value = 'all'
  ntrpMin.value = null
  ntrpMax.value = null
}

const hasActiveFilters = computed(
  () =>
    !!searchTerm.value.trim() ||
    genderFilter.value !== 'all' ||
    sideFilter.value !== 'all' ||
    ntrpMin.value !== null ||
    ntrpMax.value !== null ||
    sortBy.value !== 'rating',
)

// don't leak a hidden email as a display name, just fall back to "Player".
const nameFor = (u: UserProfile) =>
  u.displayName || (u.emailHidden ? '' : u.email?.split('@')[0]) || 'Player'

const filteredPlayers = computed(() => {
  const t = searchTerm.value.trim().toLowerCase()
  const minRating = ntrpMin.value !== null ? ntrpToRating(ntrpMin.value) : null
  const maxRating = ntrpMax.value !== null ? ntrpToRating(ntrpMax.value) : null

  const list = usersStore.allUsers.filter((u) => {
    if (t) {
      const matchesName = nameFor(u).toLowerCase().includes(t)
      const matchesEmail = !!u.email?.toLowerCase().includes(t)
      if (!matchesName && !matchesEmail) return false
    }
    if (genderFilter.value !== 'all' && u.gender !== genderFilter.value) return false
    if (sideFilter.value === 'none' && u.preferredSide) return false
    if (
      sideFilter.value !== 'all' &&
      sideFilter.value !== 'none' &&
      u.preferredSide !== sideFilter.value
    )
      return false
    if (minRating !== null && u.rating < minRating) return false
    if (maxRating !== null && u.rating > maxRating) return false
    return true
  })

  return list.sort((a, b) =>
    sortBy.value === 'name' ? nameFor(a).localeCompare(nameFor(b)) : b.rating - a.rating,
  )
})

// ── Lazy reveal ─────────────────────────────────────
const visibleCount = ref(TOP_DEFAULT)
const visiblePlayers = computed(() => filteredPlayers.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredPlayers.value.length)

// Any change to search/filters/sort restarts the reveal window at the top.
watch([searchTerm, sortBy, genderFilter, sideFilter, ntrpMin, ntrpMax], () => {
  visibleCount.value = TOP_DEFAULT
})

const loadMore = () => {
  visibleCount.value += PAGE_SIZE
}

const sentinelEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) loadMore()
    },
    { rootMargin: '200px' },
  )
  if (sentinelEl.value) observer.observe(sentinelEl.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(sentinelEl, (el) => {
  if (!observer) return
  observer.disconnect()
  if (el) observer.observe(el)
})

const preferredSideLabel = (side?: PreferredSide) => {
  if (side === 'left') return 'Left'
  if (side === 'right') return 'Right'
  return ''
}

const genderLabel = (g?: Gender) => {
  if (g === 'male') return 'Male'
  if (g === 'female') return 'Female'
  return ''
}

const goToProfile = (uid: string) => router.push(`/players/${uid}`)
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Players</h1>
          <p class="page-subtitle">Every player on Padel Club, ranked by rating.</p>
        </div>

        <div class="filters-panel">
          <input
            v-model="searchTerm"
            class="search-input"
            type="text"
            placeholder="Search by name or email…"
          />

          <div class="filter-group">
            <span class="filter-label">Sort</span>
            <div class="tab-row">
              <button
                type="button"
                :class="['tab', { 'tab--active': sortBy === 'rating' }]"
                @click="sortBy = 'rating'"
              >
                Rating
              </button>
              <button
                type="button"
                :class="['tab', { 'tab--active': sortBy === 'name' }]"
                @click="sortBy = 'name'"
              >
                Name (A–Z)
              </button>
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">Gender</span>
            <div class="tab-row">
              <button
                type="button"
                :class="['tab', { 'tab--active': genderFilter === 'all' }]"
                @click="genderFilter = 'all'"
              >
                All
              </button>
              <button
                type="button"
                :class="['tab', { 'tab--active': genderFilter === 'male' }]"
                @click="genderFilter = 'male'"
              >
                Male
              </button>
              <button
                type="button"
                :class="['tab', { 'tab--active': genderFilter === 'female' }]"
                @click="genderFilter = 'female'"
              >
                Female
              </button>
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">Preferred side</span>
            <div class="tab-row">
              <button
                type="button"
                :class="['tab', { 'tab--active': sideFilter === 'all' }]"
                @click="sideFilter = 'all'"
              >
                All
              </button>
              <button
                type="button"
                :class="['tab', { 'tab--active': sideFilter === 'left' }]"
                @click="sideFilter = 'left'"
              >
                Left
              </button>
              <button
                type="button"
                :class="['tab', { 'tab--active': sideFilter === 'right' }]"
                @click="sideFilter = 'right'"
              >
                Right
              </button>
              <button
                type="button"
                :class="['tab', { 'tab--active': sideFilter === 'none' }]"
                @click="sideFilter = 'none'"
              >
                No preference
              </button>
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-label">NTRP range</span>
            <div class="ntrp-range">
              <select v-model="ntrpMin" class="ntrp-select">
                <option :value="null">Min</option>
                <option v-for="n in NTRP_OPTIONS" :key="n" :value="n">{{ n.toFixed(1) }}</option>
              </select>
              <span class="ntrp-range-sep">–</span>
              <select v-model="ntrpMax" class="ntrp-select">
                <option :value="null">Max</option>
                <option v-for="n in NTRP_OPTIONS" :key="n" :value="n">{{ n.toFixed(1) }}</option>
              </select>
            </div>
          </div>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn-clear-filters"
            @click="resetFilters"
          >
            Clear filters
          </button>
        </div>

        <div v-if="!usersStore.allUsersLoaded" class="loading-state">Loading…</div>

        <div v-else-if="filteredPlayers.length === 0" class="empty-area">
          <p class="empty-desc">No players match your search.</p>
        </div>

        <template v-else>
          <div class="panel">
            <div
              v-for="(p, i) in visiblePlayers"
              :key="p.uid"
              class="player-row"
              @click="goToProfile(p.uid)"
            >
              <span v-if="sortBy === 'rating'" class="player-rank">{{ i + 1 }}</span>
              <PlayerAvatar
                :name="nameFor(p)"
                :photoUrl="p.photoUrl"
                :backgroundId="p.avatarBackground"
                :id="p.uid"
                :size="40"
              />
              <div class="player-info">
                <span class="player-name">{{ nameFor(p) }}</span>
                <span class="player-meta">
                  NTRP {{ formatNtrp(p.rating) }} · Rating {{ p.rating }}
                  <template v-if="genderLabel(p.gender)"> · {{ genderLabel(p.gender) }}</template>
                  <template v-if="preferredSideLabel(p.preferredSide)">
                    · {{ preferredSideLabel(p.preferredSide) }}</template
                  >
                </span>
              </div>
            </div>
          </div>

          <div ref="sentinelEl" class="sentinel"></div>
          <p v-if="hasMore" class="loading-more">Loading more…</p>
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

.filters-panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}

.search-input {
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 14px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--color-accent);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
  width: fit-content;
}

.tab {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.tab--active {
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab:hover:not(.tab--active) {
  color: var(--color-text-hover);
}

.ntrp-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ntrp-select {
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 10px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  cursor: pointer;
}

.ntrp-select:focus {
  border-color: var(--color-accent);
}

.ntrp-range-sep {
  color: var(--color-text-faint);
}

.btn-clear-filters {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  cursor: pointer;
  text-decoration: underline dotted;
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
  padding: 40px 0;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 640px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--color-bg-soft);
}

.player-row:last-child {
  border-bottom: none;
}

.player-row:hover {
  background: #fafafa;
}

.player-rank {
  width: 20px;
  flex-shrink: 0;
  text-align: right;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-faint);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.player-name {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-meta {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sentinel {
  height: 1px;
}

.loading-more {
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-faint);
  margin: 0;
}

@media (max-width: 768px) {
  .content {
    padding: 20px 16px;
  }

  .filters-panel {
    max-width: 100%;
  }

  .panel {
    max-width: 100%;
  }
}
</style>
