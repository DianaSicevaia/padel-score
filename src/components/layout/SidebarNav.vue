<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  if (authStore.user) void notificationsStore.fetchNotifications(authStore.user.uid)
})

const displayName = computed(() => {
  const user = authStore.user
  if (!user) return 'Player'
  return user.displayName || user.email?.split('@')[0] || 'Player'
})

const initials = computed(() => {
  const name = displayName.value
  const parts = name.trim().split(/[\s._-]+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})
</script>

<template>
  <aside class="sidebar">
    <div class="sb-logo">
      <div class="sb-logo-icon">P</div>
      <span class="sb-logo-text">Padel Club</span>
    </div>

    <div class="sb-divider"></div>

    <nav class="sb-nav">
      <a
        class="sb-nav-item"
        :class="{ 'sb-nav-item--active': route.path === '/dashboard' }"
        @click="router.push('/dashboard')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
        Dashboard
      </a>
      <a
        class="sb-nav-item"
        :class="{ 'sb-nav-item--active': route.path === '/matches' }"
        @click="router.push('/matches')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
        Matches
      </a>
      <a
        class="sb-nav-item"
        :class="{ 'sb-nav-item--active': route.path === '/my-club' }"
        @click="router.push('/my-club')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        My Club
      </a>
      <a
        class="sb-nav-item"
        :class="{ 'sb-nav-item--active': route.path === '/notifications' }"
        @click="router.push('/notifications')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Notifications
        <span v-if="notificationsStore.unreadCount > 0" class="sb-nav-badge">{{
          notificationsStore.unreadCount
        }}</span>
      </a>
      <a class="sb-nav-item">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
        Leaderboard
      </a>
      <a class="sb-nav-item">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Schedule
      </a>
      <a class="sb-nav-item" :class="{ 'sb-nav-item--active': route.path === '/settings' }" @click="router.push('/settings')">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
        Settings
      </a>
    </nav>

    <div class="sb-spacer"></div>

    <div class="sb-user">
      <div class="sb-user-avatar">{{ initials }}</div>
      <div class="sb-user-info">
        <span class="sb-user-name">{{ displayName }}</span>
        <span class="sb-user-role">Club Captain</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--color-white);
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
}

.sb-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
}

.sb-logo-icon {
  width: 36px;
  height: 36px;
  background: var(--color-accent);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-white);
  font-weight: normal;
  flex-shrink: 0;
}

.sb-logo-text {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: var(--color-text);
  font-weight: normal;
}

.sb-divider {
  height: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}

.sb-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 12px;
}

.sb-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}

.sb-nav-badge {
  margin-left: auto;
  background: var(--color-danger);
  color: var(--color-white);
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 7px;
  flex-shrink: 0;
}

.sb-nav-item svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.sb-nav-item:hover {
  background: var(--color-bg-soft);
}

.sb-nav-item--active {
  background: var(--color-primary);
  color: var(--color-white);
  font-weight: 600;
}

.sb-nav-item--active svg {
  color: var(--color-white);
}

.sb-nav-item--active:hover {
  background: var(--color-primary-hover);
}

.sb-spacer {
  flex: 1;
}

.sb-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--color-bg-soft);
  margin-top: 4px;
}

.sb-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--color-bg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  flex-shrink: 0;
}

.sb-user-name {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  display: block;
}

.sb-user-role {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
  display: block;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
