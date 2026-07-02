<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import CreateClubForm from '@/components/myclub/CreateClubForm.vue'
import ClubListPanel from '@/components/myclub/ClubListPanel.vue'

const router = useRouter()
const route = useRoute()
const clubsStore = useClubsStore()

const showForm = ref(false)

const openForm = () => { showForm.value = true }
const closeForm = () => { showForm.value = false }

onMounted(async () => {
  await clubsStore.fetchMyClubs()
  if (route.query.create === '1') {
    openForm()
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div class="page">
    <SidebarNav />

    <div class="main">
      <!-- Mobile top bar -->
      <header class="m-topbar">
        <button class="m-topbar-btn" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="m-topbar-logo">
          <div class="m-logo-icon">P</div>
          <span class="m-logo-text">Padel Club</span>
        </div>
        <button class="m-topbar-btn" aria-label="Notifications">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </header>

      <!-- Content -->
      <div class="content">
        <div class="page-hdr">
          <div class="page-hdr-text">
            <h1 class="page-title">My Club</h1>
            <p class="page-subtitle">Manage your clubs</p>
          </div>
          <button v-if="!showForm" class="btn-primary" @click="openForm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Club
          </button>
        </div>

        <!-- Loading -->
        <div v-if="clubsStore.loading" class="loading-state">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading...
        </div>

        <template v-else>
          <!-- Create form -->
          <CreateClubForm v-if="showForm" @cancel="closeForm" @saved="closeForm" />

          <!-- Empty state -->
          <div v-if="clubsStore.clubs.length === 0 && !showForm" class="empty-area">
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 class="empty-title">You don't have a club yet</h2>
              <p class="empty-desc">Create a club to manage matches, players, and standings.</p>
            </div>
          </div>

          <!-- Club list -->
          <ClubListPanel v-if="clubsStore.clubs.length > 0" :clubs="clubsStore.clubs" />
        </template>
      </div>

      <!-- Mobile bottom nav -->
      <nav class="m-bottom-nav">
        <button class="m-nav-item" @click="router.push('/dashboard')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>
        <button class="m-nav-item" @click="router.push('/matches')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span>Matches</span>
        </button>
        <button class="m-nav-item m-nav-item--active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Club</span>
        </button>
        <button class="m-nav-item" @click="router.push('/settings')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
  gap: 16px;
}

.page-hdr-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: #111111;
  margin: 0;
}

.page-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* ── LOADING ── */
.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: #666666;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 0.9s linear infinite;
  flex-shrink: 0;
}

/* ── EMPTY ── */
.empty-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 360px;
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #e7e8e5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
}

.empty-title {
  font-family: 'Anton', sans-serif;
  font-size: 24px;
  color: #111111;
  font-weight: normal;
  margin: 0;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
  margin: 0;
}

/* ── BUTTON ── */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1f4d82;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-primary:hover {
  background: #2a1a63;
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

  .m-topbar-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: #111111;
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
    gap: 20px;
  }

  .page-title {
    font-size: 22px;
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
