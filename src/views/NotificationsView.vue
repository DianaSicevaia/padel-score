<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import type { AppNotification } from '@/stores/notifications'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'

// notificationsStore.notifications is kept live app-wide (see App.vue).
const notificationsStore = useNotificationsStore()

const mobileMenuOpen = ref(false)
const respondingId = ref<string | null>(null)

const sorted = computed(() =>
  [...notificationsStore.notifications].sort((a, b) => b.createdAt - a.createdAt),
)

const title = (n: AppNotification) =>
  n.type === 'club_invite'
    ? `Invited to join ${n.clubName}`
    : n.clubId
      ? `Match invite in ${n.clubName}`
      : 'Match invite'

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
  ' · ' +
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const accept = async (n: AppNotification) => {
  respondingId.value = n.id
  try {
    await notificationsStore.acceptNotification(n)
  } finally {
    respondingId.value = null
  }
}

const decline = async (n: AppNotification) => {
  respondingId.value = n.id
  try {
    await notificationsStore.declineNotification(n)
  } finally {
    respondingId.value = null
  }
}
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Notifications</h1>
        </div>

        <div v-if="notificationsStore.loading" class="loading-state">Loading…</div>

        <div v-else-if="sorted.length === 0" class="empty-area">
          <p class="empty-desc">No notifications yet.</p>
        </div>

        <div v-else class="panel">
          <template v-for="(n, i) in sorted" :key="n.id">
            <div v-if="i > 0" class="panel-divider"></div>
            <div class="notif-row">
              <div class="notif-icon" :class="{ 'notif-icon--match': n.type === 'match_invite' }">
                <svg
                  v-if="n.type === 'club_invite'"
                  width="16"
                  height="16"
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
                <svg
                  v-else
                  width="16"
                  height="16"
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
              </div>
              <div class="notif-info">
                <span class="notif-title">{{ title(n) }}</span>
                <span v-if="n.matchLabel" class="notif-sub">{{ n.matchLabel }}</span>
                <span class="notif-date">{{ formatDate(n.scheduledAt ?? n.createdAt) }}</span>
              </div>
              <div v-if="n.status === 'pending'" class="notif-actions">
                <button class="btn-sm-primary" :disabled="respondingId === n.id" @click="accept(n)">
                  Accept
                </button>
                <button class="btn-sm-ghost" :disabled="respondingId === n.id" @click="decline(n)">
                  Decline
                </button>
              </div>
              <span v-else class="status-pill" :class="`status-pill--${n.status}`">{{
                n.status
              }}</span>
            </div>
          </template>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  height: 100vh;
  background: var(--color-bg-soft);
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-hdr {
  display: flex;
  align-items: center;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.loading-state {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

.empty-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 640px;
  overflow: hidden;
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

.notif-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-icon--match {
  background: var(--color-bg-info);
  color: var(--color-primary);
}

.notif-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.notif-sub {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
}

.notif-date {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-faint);
}

.notif-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-sm-primary {
  height: 32px;
  padding: 0 14px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-sm-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-sm-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm-ghost {
  height: 32px;
  padding: 0 12px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.btn-sm-ghost:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.btn-sm-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-pill {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
  border-radius: 999px;
  padding: 4px 10px;
  flex-shrink: 0;
}

.status-pill--accepted {
  color: #1a7a3c;
  background: #f0faf3;
}

.status-pill--declined {
  color: var(--color-danger-text);
  background: var(--color-danger-bg-hover);
}

@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .content {
    padding: 20px 16px;
  }
  .panel {
    max-width: 100%;
  }
}
</style>
