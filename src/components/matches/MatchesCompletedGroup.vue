<script setup lang="ts">
import { ref } from 'vue'
import { OPEN_SLOT_ID } from '@/stores/matches'
import type { Match } from '@/stores/matches'
import type { Club } from '@/stores/clubs'
import { useUsersStore } from '@/stores/users'
import TeamRoster from '@/components/shared/TeamRoster.vue'
import type { RosterPlayer } from '@/components/shared/TeamRoster.vue'

defineProps<{
  club?: Club
  matches: Match[]
}>()

const emit = defineEmits<{
  'club-click': [clubId: string]
}>()

const usersStore = useUsersStore()
const expandedMatchIds = ref(new Set<string>())

const toggleSetsDetail = (matchId: string) => {
  const next = new Set(expandedMatchIds.value)
  if (next.has(matchId)) next.delete(matchId)
  else next.add(matchId)
  expandedMatchIds.value = next
}

// Club-match team entries are club-roster ids (not uids), so photo/invite
// lookups only resolve for standalone (no-club) matches.
const teamRoster = (m: Match, side: 'A' | 'B'): RosterPlayer[] => {
  const ids = side === 'A' ? m.teamA : m.teamB
  const names = side === 'A' ? m.teamANames : m.teamBNames
  return ids.map((id, i) => {
    const name = names?.[i] ?? id
    if (m.clubId) return { id, name }
    const isOpen = id === OPEN_SLOT_ID
    const isGuest = id.startsWith('guest-')
    const profile = !isOpen && !isGuest ? usersStore.allUsers.find((u) => u.uid === id) : undefined
    return {
      id,
      name,
      photoUrl: profile?.photoUrl,
      backgroundId: profile?.avatarBackground,
      rating: profile?.rating,
      linkUid: profile?.uid,
      isOpen,
    }
  })
}

const displaySets = (m: Match) =>
  m.sets && m.sets.length > 0 ? m.sets : [{ scoreA: m.scoreA, scoreB: m.scoreB }]

const setsWon = (m: Match) => {
  const sets = displaySets(m)
  return {
    a: sets.filter((s) => s.scoreA > s.scoreB).length,
    b: sets.filter((s) => s.scoreB > s.scoreA).length,
  }
}

// undefined (rather than false) for a draw, so neither side gets dimmed as
// a "loser" - a draw isn't a loss for either team.
const winnerFlag = (m: Match, side: 'A' | 'B'): boolean | undefined =>
  m.winnerTeam === 'draw' ? undefined : m.winnerTeam === side
const summaryPillClass = (m: Match, side: 'A' | 'B') =>
  m.winnerTeam === 'draw' ? 'sp-draw' : m.winnerTeam === side ? 'sp-win' : 'sp-lose'
const setPillClass = (mine: number, other: number) =>
  mine > other ? 'sp-win' : mine < other ? 'sp-lose' : 'sp-draw'

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
</script>

<template>
  <div class="club-group">
    <div class="group-hdr">
      <div v-if="club" class="club-avatar">{{ club.name[0]?.toUpperCase() }}</div>
      <div v-else class="club-avatar club-avatar--none">⚡</div>
      <span
        class="group-club-name"
        :class="{ 'group-club-name--static': !club }"
        @click="club && emit('club-click', club.id)"
        >{{ club ? club.name : 'Without a club' }}</span
      >
      <span class="count-badge">{{ matches.length }}</span>
    </div>

    <div class="panel">
      <template v-for="(match, i) in matches" :key="match.id">
        <div v-if="i > 0" class="panel-divider"></div>
        <div class="match-row">
          <div class="match-row-main">
            <div class="match-teams">
              <TeamRoster
                class="team-roster"
                :players="teamRoster(match, 'A')"
                align="start"
                :avatarSize="22"
                :winner="winnerFlag(match, 'A')"
              />
              <div class="match-score-block">
                <template v-if="displaySets(match).length > 1">
                  <button
                    class="match-score-summary"
                    :class="{ 'match-score-summary--open': expandedMatchIds.has(match.id) }"
                    type="button"
                    @click.stop="toggleSetsDetail(match.id)"
                  >
                    <span :class="summaryPillClass(match, 'A')">{{ setsWon(match).a }}</span>
                    <span class="sp-sep">:</span>
                    <span :class="summaryPillClass(match, 'B')">{{ setsWon(match).b }}</span>
                    <svg
                      class="score-chevron"
                      :class="{ 'score-chevron--open': expandedMatchIds.has(match.id) }"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </template>
                <template v-else>
                  <span v-for="s in displaySets(match)" :key="s.scoreA" class="set-pill">
                    <span :class="setPillClass(s.scoreA, s.scoreB)">{{ s.scoreA }}</span>
                    <span class="sp-sep">:</span>
                    <span :class="setPillClass(s.scoreB, s.scoreA)">{{ s.scoreB }}</span>
                  </span>
                </template>
              </div>
              <TeamRoster
                class="team-roster"
                :players="teamRoster(match, 'B')"
                align="end"
                :avatarSize="22"
                :winner="winnerFlag(match, 'B')"
              />
            </div>
            <span class="match-date">{{ formatDate(match.createdAt) }}</span>
          </div>
          <div
            v-if="displaySets(match).length > 1 && expandedMatchIds.has(match.id)"
            class="sets-detail"
          >
            <div v-for="(s, si) in displaySets(match)" :key="si" class="sets-detail-item">
              <span class="sets-detail-num">{{ si + 1 }}</span>
              <span :class="setPillClass(s.scoreA, s.scoreB)">{{ s.scoreA }}</span>
              <span class="sp-sep">:</span>
              <span :class="setPillClass(s.scoreB, s.scoreA)">{{ s.scoreB }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
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

.match-row {
  display: flex;
  flex-direction: column;
}

.match-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  gap: 16px;
}

.match-teams {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.team-roster {
  flex: 1;
  min-width: 0;
}

.match-score-block {
  flex-shrink: 0;
}

.match-score-summary {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 6px;
  transition: background 0.12s;
}

.match-score-summary:hover,
.match-score-summary--open {
  background: var(--color-bg-soft);
}

.score-chevron {
  color: var(--color-border);
  margin-left: 3px;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.score-chevron--open {
  transform: rotate(180deg);
}

.set-pill {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 1px;
}

.sp-win {
  color: var(--color-text);
}

.sp-lose {
  color: var(--color-border);
}

.sp-draw {
  color: var(--color-text-subtle);
}

.sp-sep {
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  color: var(--color-bg-muted);
  margin: 0 1px;
}

.sets-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 20px 10px;
  border-top: 1px solid var(--color-bg-soft);
}

.sets-detail-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Anton', sans-serif;
  font-size: 16px;
}

.sets-detail-num {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-faintest);
  width: 14px;
  text-align: right;
}

.match-date {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-subtle);
  white-space: nowrap;
  flex-shrink: 0;
  width: 12ch;
  text-align: right;
}

@media (max-width: 768px) {
  .club-group {
    max-width: 100%;
  }

  .match-row {
    padding: 10px 16px;
  }

  .match-row-main {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .match-date {
    width: auto;
    text-align: center;
  }
}
</style>
