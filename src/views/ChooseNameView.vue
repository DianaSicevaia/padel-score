<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const name = ref(authStore.user?.displayName || '')
const saving = ref(false)
const error = ref('')

const save = async () => {
  if (!name.value.trim()) {
    error.value = 'Please enter a name.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await authStore.updateUserProfile({ displayName: name.value.trim() })
    await router.push('/dashboard')
  } catch {
    error.value = 'Failed to save. Please try again.'
  } finally {
    saving.value = false
  }
}

const skip = () => router.push('/dashboard')
</script>

<template>
  <div class="welcome-page">
    <div class="welcome-card">
      <div class="logo-row">
        <span class="logo-icon">P</span>
        <span class="logo-text">Padel Club</span>
      </div>

      <h1 class="welcome-title">What should we call you?</h1>
      <p class="welcome-desc">
        This is the name other players will see and search for when adding you to matches, clubs,
        and tournaments. You can change it later in Settings.
      </p>

      <input
        v-model="name"
        class="field-input"
        maxlength="60"
        placeholder="Your name"
        autofocus
        @keyup.enter="save"
      />
      <p v-if="error" class="error-message">{{ error }}</p>

      <div class="actions">
        <button class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? '…' : 'Save & continue' }}
        </button>
        <button class="btn-skip" :disabled="saving" @click="skip">Skip for now</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-bg-soft);
  padding: 24px;
  box-sizing: border-box;
}

.welcome-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-white);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--color-accent);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-white);
  font-weight: normal;
}

.logo-text {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-text);
  font-weight: normal;
}

.welcome-title {
  font-family: 'Anton', sans-serif;
  font-size: 26px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.welcome-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

.field-input {
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: var(--color-text);
  background: var(--color-bg-soft);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--color-primary);
}

.error-message {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-danger);
  margin: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.btn-primary {
  height: 48px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-skip {
  height: 40px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-skip:hover:not(:disabled) {
  color: var(--color-text);
}

.btn-skip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
