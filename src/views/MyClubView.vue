<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import CreateClubForm from '@/components/myclub/CreateClubForm.vue'
import ClubListPanel from '@/components/myclub/ClubListPanel.vue'

const router = useRouter()
const route = useRoute()
const clubsStore = useClubsStore()

const showForm = ref(false)
const mobileMenuOpen = ref(false)

const openForm = () => {
  showForm.value = true
}
const closeForm = () => {
  showForm.value = false
}

onMounted(() => {
  // clubsStore.clubs is kept live app-wide (see App.vue).
  if (route.query.create === '1') {
    openForm()
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <!-- Content -->
      <div class="content">
        <div class="page-hdr">
          <div class="page-hdr-text">
            <h1 class="page-title">My Club</h1>
            <p class="page-subtitle">Manage your clubs</p>
          </div>
          <button v-if="!showForm" class="btn-primary" @click="openForm">
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Club
          </button>
        </div>

        <!-- Loading -->
        <div v-if="clubsStore.loading" class="loading-state">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="spinner"
            aria-hidden="true"
          >
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
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
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

      <MobileBottomNav active="club" />
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
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

/* ── LOADING ── */
.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
  background: var(--color-bg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.empty-title {
  font-family: 'Anton', sans-serif;
  font-size: 24px;
  color: var(--color-text);
  font-weight: normal;
  margin: 0;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

/* ── BUTTON ── */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary);
  color: var(--color-white);
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
  background: var(--color-primary-hover);
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .content {
    padding: 20px 16px;
    gap: 20px;
  }

  .page-title {
    font-size: 22px;
  }
}
</style>
