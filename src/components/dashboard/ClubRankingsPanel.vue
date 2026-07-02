<script setup lang="ts">
import { ref } from 'vue'
import type { RankEntry } from '@/types/dashboard'
import type { Match } from '@/stores/matches'
import type { Club } from '@/stores/clubs'

const props = defineProps<{
  rankEntries: RankEntry[]
  upcomingMatches: Match[]
  clubs: Club[]
}>()

const emit = defineEmits<{
  'match-click': [clubId: string]
}>()

const hoveredRankId = ref<string | null>(null)
const tooltipStyle = ref({ top: '0px', left: '0px' })

const onRankMouseEnter = (e: MouseEvent, key: string) => {
  hoveredRankId.value = key
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right / 2}px`,
  }
}

const upcomingClubName = (cid: string) => props.clubs.find((c) => c.id === cid)?.name ?? ''

const formatUpcoming = (ts: number) => {
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

const teamLabel = (names?: string[], ids?: string[]) =>
  names?.join(' & ') ?? ids?.join(' & ') ?? '—'
</script>

<template>
  <div class="panel lb-panel">
    <!-- Header -->
    <div class="panel-hdr">
      <span class="panel-title">Club Rankings</span>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="trophy-icon"
        aria-hidden="true"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    </div>

    <div class="panel-divider"></div>

    <!-- Rankings list -->
    <div class="rankings-list">
      <div v-if="rankEntries.length === 0" class="rank-empty">No players yet</div>
      <div
        v-for="(entry, i) in rankEntries"
        :key="entry.key"
        :class="['rank-item', { 'rank-item--current': entry.isMe }]"
        @mouseenter="onRankMouseEnter($event, entry.key)"
        @mouseleave="hoveredRankId = null"
      >
        <span class="rank-num">#{{ i + 1 }}</span>
        <div class="rank-avatar">{{ entry.name[0]?.toUpperCase() ?? '?' }}</div>
        <div class="rank-info">
          <div class="rank-name-row">
            <span class="rank-name">{{ entry.name }}</span>
            <span v-if="entry.isMe" class="rank-you">You</span>
          </div>
          <span class="rank-record">{{ entry.wins }}W — {{ entry.losses }}L</span>
        </div>
        <span class="rank-pts">{{ entry.wins }}</span>

        <Teleport to="body">
          <div v-if="hoveredRankId === entry.key" class="rank-tooltip" :style="tooltipStyle">
            <div class="rank-tooltip-name">{{ entry.name }}</div>
            <div class="rank-tooltip-divider"></div>
            <div class="rank-tooltip-row">
              <span>Matches Played</span>
              <span class="rank-tooltip-val">{{ entry.matchesPlayed }}</span>
            </div>
            <div class="rank-tooltip-row">
              <span>Wins</span>
              <span class="rank-tooltip-val">{{ entry.wins }}</span>
            </div>
            <div class="rank-tooltip-row">
              <span>Losses</span>
              <span class="rank-tooltip-val">{{ entry.losses }}</span>
            </div>
            <div class="rank-tooltip-row">
              <span>Win Rate</span>
              <span class="rank-tooltip-val">{{
                entry.matchesPlayed
                  ? Math.round((entry.wins / entry.matchesPlayed) * 100) + '%'
                  : '—'
              }}</span>
            </div>
            <div class="rank-tooltip-row">
              <span>Rating</span>
              <span class="rank-tooltip-val">{{ entry.rating }}</span>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Upcoming matches -->
    <div class="panel-divider"></div>
    <div class="next-match-section">
      <h3 class="next-match-title">Upcoming Matches</h3>
      <template v-if="upcomingMatches.length === 0">
        <p class="upcoming-empty">No upcoming matches scheduled.</p>
      </template>
      <template v-else>
        <div
          v-for="match in upcomingMatches"
          :key="match.id"
          class="upcoming-item"
          @click="emit('match-click', match.clubId)"
        >
          <div class="upcoming-teams">
            <span class="upcoming-team">{{ teamLabel(match.teamANames, match.teamA) }}</span>
            <div class="vs-badge">VS</div>
            <span class="upcoming-team">{{ teamLabel(match.teamBNames, match.teamB) }}</span>
          </div>
          <div class="upcoming-meta">
            <svg
              width="12"
              height="12"
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
            <span>{{ formatUpcoming(match.scheduledAt!) }}</span>
            <span v-if="upcomingClubName(match.clubId)" class="upcoming-club">{{
              upcomingClubName(match.clubId)
            }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.panel-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  flex-shrink: 0;
}

.panel-title {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: #111111;
  font-weight: normal;
}

.trophy-icon {
  color: #1f4d82;
}

.panel-divider {
  height: 1px;
  background: #cbccc9;
  flex-shrink: 0;
}

.lb-panel {
  width: 100%;
}

/* ── Rankings ── */
.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 8px;
  position: relative;
  cursor: default;
}

.rank-item:hover {
  background: #f7f8f5;
}

.rank-item--current,
.rank-item--current:hover {
  background: #f2f3f0;
}

.rank-empty {
  padding: 20px 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #aaaaaa;
  text-align: center;
}

.rank-num {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #666666;
  width: 28px;
  flex-shrink: 0;
}

.rank-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #1f4d82;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 14px;
  color: #ffffff;
  font-weight: normal;
  flex-shrink: 0;
}

.rank-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.rank-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rank-name {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #111111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-you {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #1f4d82;
  background: #e8eff8;
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.rank-record {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: #666666;
}

.rank-pts {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: #1f4d82;
  font-weight: normal;
  flex-shrink: 0;
}

/* ── Tooltip ── */
.rank-tooltip {
  position: fixed;
  transform: translate(0, -50%);
  z-index: 9999;
  background: #1a1a1a;
  color: #ffffff;
  border-radius: 10px;
  padding: 12px 16px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
}

.rank-tooltip-name {
  font-family: 'Anton', sans-serif;
  font-size: 15px;
  color: #ffffff;
  font-weight: normal;
}

.rank-tooltip-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.rank-tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.rank-tooltip-val {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

/* ── Upcoming matches ── */
.next-match-section {
  padding: 12px 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.next-match-title {
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  color: #111111;
  font-weight: normal;
  margin: 0;
}

.upcoming-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-top: 1px solid #eeeeee;
  cursor: pointer;
}

.upcoming-item:hover {
  background: #f9f9f9;
  margin: 0 -8px;
  padding: 10px 8px;
  border-radius: 6px;
}

.upcoming-teams {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.upcoming-team {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #111111;
  text-align: center;
}

.vs-badge {
  background: #1f4d82;
  color: #ffffff;
  border-radius: 999px;
  padding: 4px 12px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}

.upcoming-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.upcoming-meta svg {
  color: #666666;
  flex-shrink: 0;
}

.upcoming-meta span {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: #666666;
}

.upcoming-club {
  font-family: 'Inter', sans-serif !important;
  font-size: 11px !important;
  color: #1f4d82 !important;
  font-weight: 500;
}

.upcoming-club::before {
  content: '·';
  margin-right: 6px;
  color: #aaaaaa;
}

.upcoming-empty {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #aaaaaa;
  text-align: center;
  margin: 4px 0 0;
}

@media (max-width: 768px) {
  .panel-title {
    font-size: 16px;
  }
}
</style>
