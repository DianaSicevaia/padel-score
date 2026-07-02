<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SidebarNav from '@/components/layout/SidebarNav.vue'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

const displayName = computed(() => {
  if (!user.value) return 'Player'
  return user.value.displayName || user.value.email?.split('@')[0] || 'Player'
})

const initials = computed(() => {
  const name = displayName.value
  const parts = name.trim().split(/[\s._-]+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return name.slice(0, 2).toUpperCase()
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
          </div>
          <div class="panel-divider"></div>

          <div class="profile-body">
            <div class="profile-avatar">
              <img
                v-if="user?.photoURL"
                :src="user.photoURL"
                :alt="displayName"
                class="avatar-img"
              />
              <span v-else class="avatar-initials">{{ initials }}</span>
            </div>
            <div class="profile-info">
              <span class="profile-name">{{ displayName }}</span>
              <span class="profile-email">{{ user?.email ?? '—' }}</span>
              <span v-if="memberSince" class="profile-since">Member since {{ memberSince }}</span>
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
  background: #f2f3f0;
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
  color: #111111;
  margin: 0;
}

/* ── PANEL ── */
.panel {
  background: #ffffff;
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
  color: #111111;
  font-weight: normal;
}

.panel-divider {
  height: 1px;
  background: #f2f3f0;
}

/* ── PROFILE ── */
.profile-body {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 20px;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #1f4d82;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  color: #ffffff;
  font-weight: normal;
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
  color: #111111;
}

.profile-email {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #444444;
  word-break: break-all;
}

.profile-since {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: #888888;
  margin-top: 2px;
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
  color: #c0392b;
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
  border-color: #c0392b;
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
    background: #ffffff;
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
    background: #1f4d82;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Anton', sans-serif;
    font-size: 14px;
    color: #ffffff;
    font-weight: normal;
  }

  .m-logo-text {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    color: #111111;
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
    background: #ffffff;
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
    color: #666666;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 400;
  }

  .m-nav-item--active {
    color: #34217c;
    font-weight: 600;
  }
}
</style>
