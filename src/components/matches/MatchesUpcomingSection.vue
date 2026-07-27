<script setup lang="ts">
import { OPEN_SLOT_ID } from '@/stores/matches'
import type { Match } from '@/stores/matches'
import type { Club } from '@/stores/clubs'
import { useUsersStore } from '@/stores/users'
import TeamRoster from '@/components/shared/TeamRoster.vue'
import type { RosterPlayer } from '@/components/shared/TeamRoster.vue'

const props = defineProps<{
  groups: { club?: Club; matches: Match[] }[]
  currentUid: string | null
}>()

const emit = defineEmits<{
  'play-now': [match: Match]
  'club-click': [clubId: string]
}>()

const usersStore = useUsersStore()

// Club-match team entries are club-roster ids (not uids), so photo/invite
// lookups only resolve for standalone (no-club) matches.
const teamRoster = (m: Match, side: 'A' | 'B'): RosterPlayer[] => {
  const ids = side === 'A' ? m.teamA : m.teamB
  const names = side === 'A' ? m.teamANames : m.teamBNames
  return ids.map((id, i) => {
    const name = names?.[i] ?? id
    const isOpen = id === OPEN_SLOT_ID
    if (m.clubId) return { id, name, isOpen }
    const isGuest = id.startsWith('guest-')
    const photoUrl =
      !isOpen && !isGuest ? usersStore.allUsers.find((u) => u.uid === id)?.photoUrl : undefined
    const pending = !!m.pendingUids?.includes(id)
    return { id, name, photoUrl, pending, isOpen }
  })
}

const canPlayNow = (m: Match) => !m.createdBy || m.createdBy === props.currentUid
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

    <div v-for="group in groups" :key="group.club?.id ?? 'standalone'" class="club-group">
      <div class="group-hdr">
        <div v-if="group.club" class="club-avatar">{{ group.club.name[0]?.toUpperCase() }}</div>
        <div v-else class="club-avatar club-avatar--none">⚡</div>
        <span
          class="group-club-name"
          :class="{ 'group-club-name--static': !group.club }"
          @click="group.club && emit('club-click', group.club.id)"
          >{{ group.club ? group.club.name : 'Without a club' }}</span
        >
        <span class="count-badge">{{ group.matches.length }}</span>
      </div>
      <div class="panel">
        <template v-for="(match, i) in group.matches" :key="match.id">
          <div v-if="i > 0" class="panel-divider"></div>
          <div class="upcoming-match-row">
            <div class="upcoming-teams">
              <TeamRoster class="upcoming-roster" :players="teamRoster(match, 'A')" align="start" :avatarSize="24" />
              <div class="upcoming-vs">VS</div>
              <TeamRoster class="upcoming-roster" :players="teamRoster(match, 'B')" align="end" :avatarSize="24" />
            </div>
            <div class="upcoming-right">
              <span class="match-date">
                {{ new Date(match.scheduledAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                ·
                {{ new Date(match.scheduledAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }}
              </span>
              <span v-if="match.status === 'pending'" class="pending-badge">Awaiting confirmation</span>
              <span v-else-if="match.hasOpenSlot" class="pending-badge">Open slot</span>
              <button v-else-if="canPlayNow(match)" class="btn-play-now" @click="emit('play-now', match)">▶ Play now</button>
              <span v-else class="pending-badge">Organizer only</span>
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

.group-club-name--static {
  cursor: default;
}

.group-club-name--static:hover {
  color: var(--color-text);
}

.club-avatar--none {
  background: var(--color-text-muted);
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

.upcoming-roster {
  flex: 1;
  min-width: 0;
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

.pending-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}

.btn-play-now:hover {
  background: var(--color-primary-hover-alt);
}

@media (max-width: 768px) {
  .club-group {
    max-width: 100%;
  }
}
</style>
