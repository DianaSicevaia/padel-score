<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import type { Club } from '@/stores/clubs'

const props = defineProps<{
  clubs: Club[]
  currentUid: string | null
}>()

const router = useRouter()
const clubsStore = useClubsStore()

const deletingId = ref<string | null>(null)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const isOwner = (club: Club) => !!props.currentUid && club.ownerId === props.currentUid

const handleDelete = async (club: Club) => {
  if (!confirm(`Delete "${club.name}"? This action cannot be undone.`)) return
  deletingId.value = club.id
  try {
    await clubsStore.deleteClub(club.id)
  } finally {
    deletingId.value = null
  }
}

const handleLeave = async (club: Club) => {
  if (!props.currentUid) return
  if (!confirm(`Leave "${club.name}"?`)) return
  deletingId.value = club.id
  try {
    await clubsStore.leaveClub(club.id, props.currentUid)
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="clubs-panel">
    <div
      v-for="club in clubs"
      :key="club.id"
      class="club-row"
      @click="router.push('/clubs/' + club.id)"
    >
      <div class="club-row-avatar">{{ club.name[0]?.toUpperCase() ?? '?' }}</div>
      <div class="club-row-info">
        <span class="club-row-name">{{ club.name }}</span>
        <span class="club-row-meta">Created {{ formatDate(club.createdAt) }}</span>
      </div>
      <button
        v-if="isOwner(club)"
        class="btn-icon btn-icon-danger"
        :disabled="deletingId === club.id"
        title="Delete club"
        @click.stop="handleDelete(club)"
      >
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
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
      <button
        v-else
        class="btn-icon btn-icon-danger"
        :disabled="deletingId === club.id"
        title="Leave club"
        @click.stop="handleLeave(club)"
      >
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
      </button>
    </div>
  </div>
</template>

<style scoped>
.clubs-panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 640px;
}

.club-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--color-bg-soft);
}

.club-row:last-child {
  border-bottom: none;
}

.club-row:hover {
  background: #fafafa;
}

.club-row-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-white);
  font-weight: normal;
  flex-shrink: 0;
}

.club-row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.club-row-name {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.club-row-meta {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}

.btn-icon:hover:not(:disabled) {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.btn-icon-danger:hover:not(:disabled) {
  background: var(--color-danger-bg-hover);
  color: var(--color-danger-text);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .clubs-panel {
    max-width: 100%;
  }
}
</style>
