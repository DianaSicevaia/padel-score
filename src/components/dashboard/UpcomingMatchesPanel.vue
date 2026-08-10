<script setup lang="ts">
import type { Match } from '@/stores/matches'
import type { Club } from '@/stores/clubs'
import router from '@/router'

const props = defineProps<{
  upcomingMatches: Match[]
  clubs: Club[]
}>()

const emit = defineEmits<{
  'match-click': [clubId: string | undefined]
}>()

const upcomingClubName = (cid: string | undefined) =>
  cid ? (props.clubs.find((c) => c.id === cid)?.name ?? '') : ''

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
  <div class="panel um-panel">
    <div class="panel-hdr">
      <span class="panel-title">Upcoming Matches</span>
      <button class="btn-schedule" aria-label="Schedule" @click="router.push('/schedule')">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="calendar-icon"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    </div>

    <div class="panel-divider"></div>

    <div class="next-match-section">
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
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.um-panel {
  width: 100%;
  height: 100%;
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
  color: var(--color-text);
  font-weight: normal;
}

.calendar-icon {
  color: var(--color-primary);
}

.panel-divider {
  height: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}

.next-match-section {
  padding: 12px 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 380px;
  overflow-y: auto;
}

.upcoming-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-top: 1px solid #eeeeee;
  cursor: pointer;
}

.upcoming-item:first-child {
  border-top: none;
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
  color: var(--color-text);
  text-align: center;
}

.vs-badge {
  background: var(--color-primary);
  color: var(--color-white);
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
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.upcoming-meta span {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}

.upcoming-club {
  font-family: 'Inter', sans-serif !important;
  font-size: 11px !important;
  color: var(--color-primary) !important;
  font-weight: 500;
}

.upcoming-club::before {
  content: '·';
  margin-right: 6px;
  color: var(--color-text-faint);
}

.upcoming-empty {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-faint);
  text-align: center;
  margin: 4px 0 0;
}

.btn-schedule {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

@media (max-width: 768px) {
  .panel-title {
    font-size: 16px;
  }
}
</style>
