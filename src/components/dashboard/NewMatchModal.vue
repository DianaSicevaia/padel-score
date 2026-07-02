<script setup lang="ts">
import type { Club } from '@/stores/clubs'

defineProps<{
  show: boolean
  clubs: Club[]
}>()

const emit = defineEmits<{
  close: []
  'select-club': [clubId: string]
  'create-club': []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-hdr">
          <h2 id="modal-title" class="modal-title">Record a Match</h2>
          <button class="modal-close" aria-label="Close" @click="emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <template v-if="clubs.length > 0">
          <p class="modal-sub">Select a club to record the match in</p>
          <div class="modal-clubs">
            <button
              v-for="club in clubs"
              :key="club.id"
              class="modal-club-row"
              @click="emit('select-club', club.id)"
            >
              <div class="modal-club-avatar">{{ club.name[0]?.toUpperCase() }}</div>
              <span class="modal-club-name">{{ club.name }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
          <div class="modal-divider"></div>
        </template>

        <p v-else class="modal-sub">You have no clubs yet. Create one first.</p>

        <button class="modal-create-club" @click="emit('create-club')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create new club
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
}

.modal-title {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  font-weight: normal;
  color: #111111;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}

.modal-close:hover {
  background: #f2f3f0;
  color: #111111;
}

.modal-sub {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #888888;
  margin: 0;
  padding: 0 20px 12px;
}

.modal-clubs {
  display: flex;
  flex-direction: column;
}

.modal-club-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  color: #111111;
}

.modal-club-row:hover {
  background: #f7f7f5;
}

.modal-club-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #1f4d82;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  color: #ffffff;
  font-weight: normal;
  flex-shrink: 0;
}

.modal-club-name {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-club-row svg {
  color: #cbccc9;
  flex-shrink: 0;
}

.modal-divider {
  height: 1px;
  background: #f2f3f0;
  margin: 4px 0;
}

.modal-create-club {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #34217c;
  text-align: left;
  transition: background 0.12s;
  width: 100%;
}

.modal-create-club:hover {
  background: #f2f0fa;
}
</style>
