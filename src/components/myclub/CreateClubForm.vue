<script setup lang="ts">
import { ref } from 'vue'
import { useClubsStore } from '@/stores/clubs'

const emit = defineEmits<{
  cancel: []
  saved: []
}>()

const clubsStore = useClubsStore()

const clubName = ref('')
const creating = ref(false)
const createError = ref('')

const submit = async () => {
  if (!clubName.value.trim()) {
    createError.value = 'Please enter a club name.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await clubsStore.createClub(clubName.value.trim())
    emit('saved')
  } catch {
    createError.value = 'Failed to create club. Please try again.'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="create-card">
    <h2 class="create-title">Create a new club</h2>
    <div class="field">
      <label class="field-label">CLUB NAME</label>
      <input
        v-model="clubName"
        class="field-input"
        placeholder="e.g. Madrid Padel FC"
        maxlength="60"
        autofocus
        @keyup.enter="submit"
      />
    </div>
    <p v-if="createError" class="error-msg">{{ createError }}</p>
    <div class="form-actions">
      <button class="btn-primary" :disabled="creating" @click="submit">
        {{ creating ? 'Creating…' : 'Create Club' }}
      </button>
      <button class="btn-ghost" :disabled="creating" @click="emit('cancel')">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.create-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 28px 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}

.create-title {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: #111111;
  font-weight: normal;
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: #666666;
  letter-spacing: 1px;
}

.field-input {
  height: 48px;
  border: 1px solid #cbccc9;
  border-radius: 8px;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #111111;
  background: #f2f3f0;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: #34217c;
}

.error-msg {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #d93c15;
  margin: 0;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

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
}

.btn-primary:hover:not(:disabled) {
  background: #2a1a63;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #666666;
  cursor: pointer;
  padding: 10px 0;
  transition: color 0.15s;
}

.btn-ghost:hover:not(:disabled) {
  color: #111111;
}

.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .create-card {
    padding: 20px;
    max-width: 100%;
  }
}
</style>
