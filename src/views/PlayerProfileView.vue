<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import type { PreferredSide } from '@/stores/users'
import { formatNtrp } from '@/utils/ntrp'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const usersStore = useUsersStore()

const mobileMenuOpen = ref(false)

const uid = computed(() => route.params.uid as string)
const isMe = computed(() => uid.value === authStore.user?.uid)

// usersStore.allUsers is kept live app-wide (see App.vue)
const profile = computed(() => usersStore.allUsers.find((u) => u.uid === uid.value) ?? null)

const displayName = computed(
  () => profile.value?.displayName || profile.value?.email?.split('@')[0] || 'Player',
)

const ntrpText = computed(() => (profile.value ? `NTRP ${formatNtrp(profile.value.rating)}` : ''))

const globalRatingText = computed(() => {
  const p = profile.value
  if (!p) return ''
  return p.matchesPlayed > 0
    ? `Rating ${p.rating} · ${p.matchesPlayed} matches · ${p.wins}W / ${p.losses}L`
    : `Rating ${p.rating} · no standalone matches yet`
})

const preferredSideLabel = (side?: PreferredSide) => {
  if (side === 'left') return 'Left'
  if (side === 'right') return 'Right'
  return ''
}

const preferredSideText = computed(() => {
  const label = preferredSideLabel(profile.value?.preferredSide)
  return label ? `Preferred side: ${label}` : ''
})

const memberSince = computed(() => {
  const t = profile.value?.createdAt
  if (!t) return ''
  return new Date(t).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar mode="back" back-to="/matches" @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <button class="btn-back" @click="router.back()">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <div v-if="!usersStore.allUsersLoaded" class="loading-state">Loading…</div>

        <div v-else-if="!profile" class="empty-area">
          <p class="empty-desc">Player not found.</p>
        </div>

        <div v-else class="panel">
          <div class="profile-body">
            <PlayerAvatar
              class="profile-avatar"
              :name="displayName"
              :photoUrl="profile.photoUrl"
              :backgroundId="profile.avatarBackground"
              :size="72"
            />
            <div class="profile-info">
              <span class="profile-name">{{ displayName }}</span>
              <span class="profile-ntrp">{{ ntrpText }}</span>
              <span v-if="memberSince" class="profile-since">Member since {{ memberSince }}</span>
              <span v-if="globalRatingText" class="profile-rating">{{ globalRatingText }}</span>
              <span class="profile-rating-hint">Based on matches played without a club</span>
              <span v-if="preferredSideText" class="profile-side">{{ preferredSideText }}</span>
            </div>
          </div>
          <template v-if="isMe">
            <div class="panel-divider"></div>
            <div class="panel-actions">
              <router-link to="/settings" class="link-edit"
                >Edit your profile in Settings →</router-link
              >
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

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.btn-back:hover {
  color: var(--color-text);
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
  overflow: hidden;
  max-width: 480px;
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

.profile-body {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 20px;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.profile-name {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  font-weight: normal;
  color: var(--color-text);
}

.profile-ntrp {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
}

.profile-since {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-subtle);
  margin-top: 2px;
}

.profile-rating {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 6px;
}

.profile-rating-hint {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--color-text-faint);
}

.profile-side {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.panel-actions {
  padding: 14px 20px;
}

.link-edit {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.link-edit:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .content {
    padding: 20px 16px;
  }
  .panel {
    max-width: 100%;
  }
}
</style>
