<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import { usePlayersStore } from '@/stores/players'
import { useAuthStore } from '@/stores/auth'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import TournamentForm from '@/components/tournaments/TournamentForm.vue'

const route = useRoute()
const router = useRouter()
const clubsStore = useClubsStore()
const playersStore = usePlayersStore()
const authStore = useAuthStore()
const mobileMenuOpen = ref(false)

const clubId = computed(() => (route.query.clubId as string) || undefined)
const club = computed(() =>
  clubId.value ? clubsStore.clubs.find((c) => c.id === clubId.value) : undefined,
)
// Only the club owner or a delegated manager may start a tournament for
// their club.
const canManage = computed(
  () =>
    !!club.value &&
    (club.value.ownerId === authStore.user?.uid ||
      club.value.adminIds.includes(authStore.user?.uid ?? '')),
)
const myPlayer = computed(
  () => playersStore.players.find((p) => p.uid === authStore.user?.uid) ?? null,
)

let unsubPlayers: (() => void) | null = null
onMounted(() => {
  if (clubId.value) unsubPlayers = playersStore.subscribePlayers(clubId.value)
})
onUnmounted(() => unsubPlayers?.())

const backTarget = computed(() => (clubId.value ? `/clubs/${clubId.value}` : '/tournaments'))
const goBack = () => router.push(backTarget.value)
const onSaved = () => router.push(backTarget.value)
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Create Tournament</h1>
          <p class="page-subtitle">
            {{
              clubId
                ? "Set up an Americano tournament for your club — roster is picked from the club's players."
                : 'Set up an Americano tournament — invite players, add guests, and publish or save it as a draft.'
            }}
          </p>
        </div>

        <div v-if="clubId && !club" class="notice">Loading club…</div>
        <div v-else-if="clubId && !canManage" class="notice">
          Only the club owner or a manager can create a tournament for this club.
        </div>

        <div v-else class="panel">
          <TournamentForm
            :club-id="clubId"
            :club-players="playersStore.players"
            :my-club-player-id="myPlayer?.id"
            :my-club-player-name="myPlayer?.name"
            @cancel="goBack"
            @saved="onSaved"
          />
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

.notice {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
}

.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 640px;
  min-height: 200px;
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
