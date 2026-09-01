<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

withDefaults(defineProps<{ label?: string }>(), { label: 'More info' })

const PANEL_WIDTH = 220
const VIEWPORT_MARGIN = 12

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

// Positions the panel with a fixed viewport-relative left/top instead of
// CSS `left: 0` off the button
const positionPanel = () => {
  const btn = rootEl.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
  const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft))
  panelStyle.value = { top: `${rect.bottom + 6}px`, left: `${left}px` }
}

const toggle = async () => {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    positionPanel()
  }
}

const close = () => {
  open.value = false
}

const onDocClick = (e: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <span ref="rootEl" class="info-tooltip">
    <button
      type="button"
      class="info-tooltip-btn"
      :aria-expanded="open"
      :aria-label="label"
      @click.stop="toggle"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" class="info-tooltip-panel" :style="panelStyle" @click.stop>
        <slot />
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.info-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  line-height: 0;
}

.info-tooltip-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text-faint);
  cursor: pointer;
  transition: color 0.15s;
}

.info-tooltip-btn:hover {
  color: var(--color-accent);
}
</style>

<style>
.info-tooltip-panel {
  position: fixed;
  z-index: 200;
  width: 220px;
  max-width: calc(100vw - 24px);
  background: var(--color-white);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  padding: 10px;
  cursor: default;
  box-sizing: border-box;
}
</style>
