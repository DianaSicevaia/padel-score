<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'

withDefaults(defineProps<{ mode?: 'menu' | 'back'; backTo?: string }>(), {
  mode: 'menu',
  backTo: '/dashboard',
})

const emit = defineEmits<{ 'menu-click': [] }>()

const router = useRouter()
// notificationsStore.notifications is kept live app-wide (see App.vue).
const notificationsStore = useNotificationsStore()
</script>

<template>
  <header class="m-topbar">
    <button
      v-if="mode === 'menu'"
      class="m-topbar-btn"
      aria-label="Menu"
      @click="emit('menu-click')"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <button v-else class="m-topbar-btn" aria-label="Back" @click="router.push(backTo)">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>

    <div class="m-topbar-logo">
      <div class="m-logo-icon">P</div>
      <span class="m-logo-text">Padel Club</span>
    </div>

    <button class="m-topbar-btn" aria-label="Notifications" @click="router.push('/notifications')">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="notificationsStore.unreadCount > 0" class="notif-dot"></span>
    </button>
  </header>
</template>

<style scoped>
.m-topbar {
  display: none;
}

@media (max-width: 768px) {
  .m-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: var(--color-white);
    flex-shrink: 0;
  }

  .m-topbar-btn {
    position: relative;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .m-topbar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .m-logo-icon {
    width: 28px;
    height: 28px;
    background: var(--color-primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Anton', sans-serif;
    font-size: 14px;
    color: var(--color-white);
    font-weight: normal;
  }

  .m-logo-text {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    color: var(--color-text);
    font-weight: normal;
  }

  .notif-dot {
    position: absolute;
    top: 9px;
    right: 10px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--color-danger);
    border: 1.5px solid var(--color-white);
  }
}
</style>
