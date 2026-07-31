<script setup lang="ts">
import { computed } from 'vue'
import { avatarBackgroundById, avatarBackgroundFor } from '@/utils/avatarBackgrounds'

const props = withDefaults(
  defineProps<{
    name: string
    photoUrl?: string | null
    backgroundId?: string | null
    id?: string
    size?: number
  }>(),
  { size: 28 },
)

const initial = computed(() => props.name.trim()[0]?.toUpperCase() ?? '?')

// Priority: their own photo, then a court texture they picked for themselves,
// then a stable pseudo-random one (guests and players who never chose one) —
// same player, same texture, every time.
const fallbackBackground = computed(
  () => avatarBackgroundById(props.backgroundId) ?? avatarBackgroundFor(props.id || props.name),
)
</script>

<template>
  <div
    class="player-avatar"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.max(10, size * 0.4)}px`,
      ...(photoUrl ? {} : { backgroundImage: `url(${fallbackBackground})` }),
    }"
  >
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="player-avatar-img" />
    <span v-else class="player-avatar-initial">{{ initial }}</span>
  </div>
</template>

<style scoped>
.player-avatar {
  border-radius: 999px;
  background-color: var(--color-bg-muted);
  background-size: cover;
  background-position: center;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.player-avatar-initial {
  color: var(--color-white);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.player-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
