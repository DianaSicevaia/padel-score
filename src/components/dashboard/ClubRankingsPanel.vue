<script setup lang="ts">
import { ref } from 'vue'
import type { RankEntry } from '@/types/dashboard'

defineProps<{
  rankEntries: RankEntry[]
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

.trophy-icon {
  color: var(--color-primary);
}

.panel-divider {
  height: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}

.lb-panel {
  width: 100%;
  height: 100%;
}

/* ── Rankings ── */
.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: 380px;
  overflow-y: auto;
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
  background: var(--color-bg-soft);
}

.rank-empty {
  padding: 20px 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-faint);
  text-align: center;
}

.rank-num {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
  width: 28px;
  flex-shrink: 0;
}

.rank-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 14px;
  color: var(--color-white);
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
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-you {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary);
  background: #e8eff8;
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.rank-record {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}

.rank-pts {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: var(--color-primary);
  font-weight: normal;
  flex-shrink: 0;
}

/* ── Tooltip ── */
.rank-tooltip {
  position: fixed;
  transform: translate(0, -50%);
  z-index: 9999;
  background: #1a1a1a;
  color: var(--color-white);
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
  color: var(--color-white);
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
  color: var(--color-white);
}

@media (max-width: 768px) {
  .panel-title {
    font-size: 16px;
  }
}
</style>
