<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import type { PreferredSide } from '@/stores/users'
import { AVATAR_BACKGROUNDS } from '@/utils/avatarBackgrounds'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'

const authStore = useAuthStore()
const usersStore = useUsersStore()
const router = useRouter()

const user = computed(() => authStore.user)

// ── Global (site-wide) rating — from matches played without a club ──
// usersStore.allUsers is kept live app-wide (see App.vue).
const globalProfile = computed(
  () => usersStore.allUsers.find((u) => u.uid === authStore.user?.uid) ?? null,
)

const globalRatingText = computed(() => {
  const p = globalProfile.value
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
  const label = preferredSideLabel(globalProfile.value?.preferredSide)
  return label ? `Preferred side: ${label}` : ''
})

const displayName = computed(() => {
  if (!user.value) return 'Player'
  return user.value.displayName || user.value.email?.split('@')[0] || 'Player'
})

const memberSince = computed(() => {
  const t = user.value?.metadata.creationTime
  if (!t) return ''
  return new Date(t).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const logout = async () => {
  await authStore.logout()
  router.push('/')
}

// ── Edit profile ───────────────────────────────────
const isEditing = ref(false)
const editName = ref('')
const editPreferredSide = ref<PreferredSide | null>(null)
const editAvatarBackground = ref<string | null>(null)
const saving = ref(false)
const saveError = ref('')

const startEdit = () => {
  editName.value = displayName.value
  editPreferredSide.value = globalProfile.value?.preferredSide ?? null
  editAvatarBackground.value = globalProfile.value?.avatarBackground ?? null
  saveError.value = ''
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveProfile = async () => {
  if (!editName.value.trim()) {
    saveError.value = 'Please enter a display name.'
    return
  }
  if (!authStore.user) return
  saving.value = true
  saveError.value = ''
  try {
    await Promise.all([
      authStore.updateUserProfile({ displayName: editName.value.trim() }),
      usersStore.updatePreferredSide(authStore.user.uid, editPreferredSide.value),
      usersStore.updateAvatarBackground(authStore.user.uid, editAvatarBackground.value),
    ])
    // usersStore.allUsers (and so globalProfile) updates live once the write lands.
    isEditing.value = false
  } catch {
    saveError.value = 'Failed to save profile. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <SidebarNav />

    <div class="main">
      <!-- Mobile top bar -->
      <header class="m-topbar">
        <div class="m-topbar-logo">
          <div class="m-logo-icon">P</div>
          <span class="m-logo-text">Padel Club</span>
        </div>
      </header>

      <!-- Content -->
      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Settings</h1>
        </div>

        <!-- Profile panel -->
        <div class="panel">
          <div class="panel-hdr">
            <span class="panel-title">Profile</span>
            <button v-if="!isEditing" class="btn-edit" @click="startEdit">
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
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </button>
          </div>
          <div class="panel-divider"></div>

          <!-- View mode -->
          <div v-if="!isEditing" class="profile-body">
            <PlayerAvatar
              class="profile-avatar"
              :name="displayName"
              :photoUrl="user?.photoURL"
              :backgroundId="globalProfile?.avatarBackground"
              :size="72"
            />
            <div class="profile-info">
              <span class="profile-name">{{ displayName }}</span>
              <span class="profile-email">{{ user?.email ?? '—' }}</span>
              <span v-if="memberSince" class="profile-since">Member since {{ memberSince }}</span>
              <span v-if="globalRatingText" class="profile-rating">{{ globalRatingText }}</span>
              <span v-if="globalProfile" class="profile-rating-hint">Based on matches played without a club</span>
              <span v-if="preferredSideText" class="profile-side">{{ preferredSideText }}</span>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="profile-edit-body">
            <div class="profile-edit-avatar-col">
              <PlayerAvatar
                class="profile-avatar"
                :name="displayName"
                :photoUrl="user?.photoURL"
                :backgroundId="editAvatarBackground"
                :size="72"
              />
              <div v-if="!user?.photoURL" class="bg-swatches">
                <button
                  v-for="bg in AVATAR_BACKGROUNDS"
                  :key="bg.id"
                  type="button"
                  class="bg-swatch"
                  :class="{ 'bg-swatch--active': editAvatarBackground === bg.id }"
                  :style="{ backgroundImage: `url(${bg.src})` }"
                  :title="bg.label"
                  :aria-label="bg.label"
                  @click="editAvatarBackground = bg.id"
                ></button>
              </div>
            </div>
            <div class="edit-fields">
              <label class="field-label">Display name</label>
              <input
                v-model="editName"
                class="field-input"
                maxlength="60"
                placeholder="Your name"
                @keyup.enter="saveProfile"
              />

              <label class="field-label field-label--spaced">Preferred side</label>
              <div class="side-toggle">
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editPreferredSide === 'left' }]"
                  @click="editPreferredSide = 'left'"
                >
                  Left
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editPreferredSide === 'right' }]"
                  @click="editPreferredSide = 'right'"
                >
                  Right
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editPreferredSide === null }]"
                  @click="editPreferredSide = null"
                >
                  No preference
                </button>
              </div>

              <p v-if="saveError" class="add-error">{{ saveError }}</p>
              <div class="edit-actions">
                <button class="btn-sm-primary" :disabled="saving" @click="saveProfile">
                  {{ saving ? '…' : 'Save' }}
                </button>
                <button class="btn-sm-ghost" :disabled="saving" @click="cancelEdit">Cancel</button>
              </div>
            </div>
          </div>

          <div class="panel-divider"></div>

          <div class="panel-actions">
            <button class="btn-logout" @click="logout">
              <svg
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      </div>
      <!-- end .content -->

      <!-- Mobile bottom nav -->
      <nav class="m-bottom-nav">
        <button class="m-nav-item" @click="router.push('/dashboard')">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>
        <button class="m-nav-item" @click="router.push('/matches')">
          <svg
            width="22"
            height="22"
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
          <span>Matches</span>
        </button>
        <button class="m-nav-item" @click="router.push('/my-club')">
          <svg
            width="22"
            height="22"
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
          <span>Club</span>
        </button>
        <button class="m-nav-item m-nav-item--active">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>
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

.m-topbar {
  display: none;
}
.m-bottom-nav {
  display: none;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── PAGE HEADER ── */
.page-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

/* ── PANEL ── */
.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 480px;
}

.panel-hdr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
}

.panel-title {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: var(--color-text);
  font-weight: normal;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 6px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.btn-edit:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

/* ── PROFILE ── */
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

/* ── PROFILE EDIT ── */
.profile-edit-body {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px 20px;
}

.profile-edit-avatar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.bg-swatches {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.bg-swatch {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid transparent;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s, transform 0.1s;
}

.bg-swatch:hover {
  transform: scale(1.08);
}

.bg-swatch--active {
  border-color: var(--color-accent);
}

.edit-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.field-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--color-accent);
}

.field-label--spaced {
  margin-top: 6px;
}

.side-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
}

.side-tab {
  flex: 1;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.side-tab--active {
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.side-tab:hover:not(.side-tab--active) {
  color: var(--color-text-hover);
}

.add-error {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-danger);
  margin: 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-sm-primary {
  height: 36px;
  padding: 0 16px;
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
  height: 36px;
  padding: 0 12px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s;
}

.btn-sm-ghost:hover:not(:disabled) {
  color: var(--color-text);
}

.btn-sm-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-name {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  font-weight: normal;
  color: var(--color-text);
}

.profile-email {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-strong);
  word-break: break-all;
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

/* ── ACTIONS ── */
.panel-actions {
  padding: 16px 20px;
}

.btn-logout {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--color-danger-alt);
  border: 1.5px solid #e8b4b0;
  border-radius: 999px;
  padding: 9px 20px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn-logout:hover {
  background: #fdf1f0;
  border-color: var(--color-danger-alt);
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .m-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: var(--color-white);
    flex-shrink: 0;
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

  .content {
    padding: 20px 16px;
  }

  .panel {
    max-width: 100%;
  }

  .m-bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 10px 0;
    background: var(--color-white);
    box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
  }

  .m-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 16px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 400;
  }

  .m-nav-item--active {
    color: var(--color-accent);
    font-weight: 600;
  }
}
</style>
