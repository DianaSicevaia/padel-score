<script setup lang="ts">
import type { Match } from '@/stores/matches'
import type { Club } from '@/stores/clubs'

defineProps<{
  groups: { club: Club; matches: Match[] }[]
}>()

const emit = defineEmits<{
  'play-now': [match: Match]
  'club-click': [clubId: string]
}>()

const teamDisplay = (m: Match, side: 'A' | 'B') => {
  const names = side === 'A' ? m.teamANames : m.teamBNames
  return names?.join(' & ') ?? (side === 'A' ? m.teamA : m.teamB).join(' & ')
}
</script>

<template>
  <div class="upcoming-section">
    <div class="upcoming-section-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      Upcoming
    </div>

    <div v-for="group in groups" :key="group.club.id" class="club-group">
      <div class="group-hdr">
        <div class="club-avatar">{{ group.club.name[0]?.toUpperCase() }}</div>
        <span class="group-club-name" @click="emit('club-click', group.club.id)">{{ group.club.name }}</span>
        <span class="count-badge">{{ group.matches.length }}</span>
      </div>
      <div class="panel">
        <template v-for="(match, i) in group.matches" :key="match.id">
          <div v-if="i > 0" class="panel-divider"></div>
          <div class="upcoming-match-row">
            <div class="upcoming-teams">
              <span class="team-name">{{ teamDisplay(match, 'A') }}</span>
              <div class="upcoming-vs">VS</div>
              <span class="team-name">{{ teamDisplay(match, 'B') }}</span>
            </div>
            <div class="upcoming-right">
              <span class="match-date">
                {{ new Date(match.scheduledAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                ·
                {{ new Date(match.scheduledAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }}
              </span>
              <button class="btn-play-now" @click="emit('play-now', match)">▶ Play now</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upcoming-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upcoming-section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.club-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 680px;
}

.group-hdr {
  display: flex;
  align-items: center;
  gap: 10px;
}

.club-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 15px;
  color: var(--color-white);
  font-weight: normal;
  flex-shrink: 0;
}

.group-club-name {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: var(--color-text);
  font-weight: normal;
  cursor: pointer;
  transition: color 0.15s;
}

.group-club-name:hover {
  color: var(--color-accent);
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

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

.upcoming-match-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--color-bg-info);
}

.upcoming-teams {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.team-name {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-subtle);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-vs {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-faint);
  flex-shrink: 0;
}

.upcoming-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.match-date {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-subtle);
  white-space: nowrap;
}

.btn-play-now {
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-play-now:hover {
  background: var(--color-primary-hover-alt);
}

@media (max-width: 768px) {
  .club-group {
    max-width: 100%;
  }

  .team-name {
    font-size: 12px;
  }
}
</style>
