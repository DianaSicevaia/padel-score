<script setup lang="ts">
defineProps<{
  stats: { label: string; value: string; change: string | null }[]
}>()
</script>

<template>
  <div class="stats-row">
    <div v-for="stat in stats" :key="stat.label" class="stat-card">
      <span class="stat-label">{{ stat.label }}</span>
      <div class="stat-bottom">
        <span class="stat-value">{{ stat.value }}</span>
        <span v-if="stat.change" class="stat-change">{{ stat.change }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: var(--color-white);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

.stat-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
}

.stat-bottom {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.stat-value {
  font-family: 'Anton', sans-serif;
  font-size: 36px;
  color: var(--color-text);
  font-weight: normal;
  line-height: 1;
}

.stat-change {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #004d1a;
  padding-bottom: 3px;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 10px;
  }

  .stat-change {
    font-size: 11px;
  }
}
</style>
