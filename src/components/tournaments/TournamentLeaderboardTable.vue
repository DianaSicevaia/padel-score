<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament } from '@/stores/tournaments'
import { computeStandings } from '@/utils/tournamentStandings'

const props = defineProps<{
  tournament: Tournament
  nameOf: (id: string) => string
}>()

const standings = computed(() => computeStandings(props.tournament))
</script>

<template>
  <div class="leaderboard">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="col-idx">#</th>
          <th class="col-name">Player</th>
          <th class="col-num">P</th>
          <th class="col-num">W-T-L</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(s, i) in standings" :key="s.id">
          <td class="col-idx">{{ i + 1 }}</td>
          <td class="col-name">{{ nameOf(s.id) }}</td>
          <td class="col-num">{{ s.points }}</td>
          <td class="col-num">{{ s.wins }}-{{ s.ties }}-{{ s.losses }}</td>
        </tr>
      </tbody>
    </table>
    <p class="leaderboard-hint">P: Points · W-T-L: Wins-Ties-Losses</p>
  </div>
</template>

<style scoped>
.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table th {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border-light);
}

.leaderboard-table td {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  padding: 8px;
  border-bottom: 1px solid var(--color-bg-soft);
}

.col-idx {
  width: 32px;
  font-family: 'Geist Mono', monospace;
  color: var(--color-text-muted);
}

.col-num {
  width: 80px;
  font-family: 'Geist Mono', monospace;
  font-weight: 600;
}

.leaderboard-hint {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--color-text-faint);
  margin: 0;
}
</style>
