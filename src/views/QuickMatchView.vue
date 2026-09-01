<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import QuickMatchForm from '@/components/quickmatch/QuickMatchForm.vue'
import { useMatchesStore, OPEN_SLOT_ID } from '@/stores/matches'
import type { StandaloneParticipant, MatchFormat, MatchSet } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const matchesStore = useMatchesStore()
const authStore = useAuthStore()

const goBack = () => router.push('/matches')
const onSaved = () => router.push('/matches')

const initialTeamA = ref<StandaloneParticipant[]>([])
const initialTeamB = ref<StandaloneParticipant[]>([])
const initialMatchFormat = ref<MatchFormat | undefined>(undefined)
const editMatchId = ref<string | undefined>(undefined)
const initialSets = ref<MatchSet[] | undefined>(undefined)
const initialWinner = ref<'A' | 'B' | 'draw' | undefined>(undefined)
const loadError = ref('')

const pageTitle = computed(() =>
  editMatchId.value ? 'Edit match' : 'Match without a club',
)

const toParticipants = (ids: string[], names?: string[]): StandaloneParticipant[] =>
  ids.map((id, i) => ({
    ...(id === OPEN_SLOT_ID || id.startsWith('guest-') ? {} : { uid: id }),
    name: names?.[i] ?? id,
  }))

onMounted(async () => {
  const playNowId = route.query.playNow as string | undefined
  const editId = route.query.editMatch as string | undefined

  if (playNowId) {
    const match = await matchesStore.fetchMatchById(playNowId)
    // Can't record a score while a slot is still unclaimed.
    if (!match || match.hasOpenSlot) return
    await matchesStore.cancelScheduledMatch(match.id)
    initialTeamA.value = toParticipants(match.teamA, match.teamANames)
    initialTeamB.value = toParticipants(match.teamB, match.teamBNames)
    initialMatchFormat.value = match.matchFormat
    router.replace({ path: '/matches/new' })
    return
  }

  if (editId) {
    const match = await matchesStore.fetchMatchById(editId)
    if (!match || match.clubId || match.createdBy !== authStore.user?.uid) {
      loadError.value = "This match can't be edited."
      return
    }
    initialTeamA.value = toParticipants(match.teamA, match.teamANames)
    initialTeamB.value = toParticipants(match.teamB, match.teamBNames)
    initialMatchFormat.value = match.matchFormat
    initialSets.value =
      match.sets && match.sets.length > 0
        ? match.sets
        : [{ scoreA: match.scoreA, scoreB: match.scoreB }]
    initialWinner.value = match.winnerTeam === 'draw' ? 'draw' : match.winnerTeam
    editMatchId.value = editId
  }
})
</script>

<template>
  <div class="page">
    <SidebarNav />

    <div class="main">
      <MobileTopBar mode="back" back-to="/matches" />

      <div class="content">
        <div class="page-hdr">
          <button class="btn-back" @click="goBack">
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
            Matches
          </button>
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">
            {{
              editMatchId
                ? 'Update the teams, sets, or result.'
                : "Record a match with players who already have a profile, or add guests who don't."
            }}
          </p>
        </div>

        <p v-if="loadError" class="load-error">{{ loadError }}</p>
        <div v-else class="panel">
          <QuickMatchForm
            :initialTeamA="initialTeamA"
            :initialTeamB="initialTeamB"
            :initialMatchFormat="initialMatchFormat"
            :editMatchId="editMatchId"
            :initialSets="initialSets"
            :initialWinner="initialWinner"
            @cancel="goBack"
            @saved="onSaved"
          />
        </div>
      </div>
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
  gap: 8px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
  width: fit-content;
}

.btn-back:hover {
  color: var(--color-accent);
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 26px;
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

.load-error {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-danger);
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
