<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    photoUrl?: string | null
    size?: number
  }>(),
  { size: 28 },
)

const initial = computed(() => props.name.trim()[0]?.toUpperCase() ?? '?')
</script>

<template>
  <div
    class="player-avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size * 0.4)}px` }"
  >
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="player-avatar-img" />
    <span v-else>{{ initial }}</span>
  </div>
</template>

<style scoped>
.player-avatar {
  border-radius: 999px;
  background: var(--color-bg-muted);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.player-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
