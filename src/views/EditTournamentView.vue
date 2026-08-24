<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsStore } from '@/stores/tournaments'
import { useAuthStore } from '@/stores/auth'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import TournamentForm from '@/components/tournaments/TournamentForm.vue'

const route = useRoute()
const router = useRouter()
const tournamentsStore = useTournamentsStore()
const authStore = useAuthStore()
const mobileMenuOpen = ref(false)

const tournamentId = computed(() => route.params.id as string)
const tournament = computed(() =>
  tournamentsStore.tournaments.find((t) => t.id === tournamentId.value),
)
const canEdit = computed(
  () =>
    !!tournament.value &&
    tournament.value.createdBy === authStore.user?.uid &&
    (tournament.value.status === 'draft' || tournament.value.status === 'upcoming'),
)

let unsub: (() => void) | null = null
onMounted(() => {
  if (authStore.user) unsub = tournamentsStore.subscribeTournaments(authStore.user.uid)
})
onUnmounted(() => unsub?.())

const goBack = () => router.push(`/tournaments/${tournamentId.value}`)
const onSaved = () => router.push(`/tournaments/${tournamentId.value}`)
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <div v-if="tournamentsStore.loading" class="loading-state">Loading…</div>

        <div v-else-if="!tournament" class="empty-area">
          <p class="empty-desc">Tournament not found.</p>
        </div>

        <div v-else-if="!canEdit" class="empty-area">
          <p class="empty-desc">This tournament can no longer be edited.</p>
          <button class="btn-sm-ghost" @click="goBack">Back to Tournament</button>
        </div>

        <template v-else>
          <div class="page-hdr">
            <h1 class="page-title">Edit Tournament</h1>
            <p class="page-subtitle">Update details before the tournament starts.</p>
          </div>

          <div class="panel">
            <TournamentForm :initial="tournament" @cancel="goBack" @saved="onSaved" />
          </div>
        </template>
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

.loading-state {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--color-text-muted);
}

.empty-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.empty-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

.btn-sm-ghost {
  height: 36px;
  padding: 0 12px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-sm-ghost:hover {
  color: var(--color-text);
}

.page-hdr {
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

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 640px;
  padding: 4px;
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
}
</style>
