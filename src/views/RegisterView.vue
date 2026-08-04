<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { NTRP_OPTIONS, ntrpToRating } from '@/utils/ntrp'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const ntrp = ref(3.5)
const error = ref('')

const handleError = (e: unknown) => {
  if (e instanceof Error) {
    error.value = e.message
  } else {
    error.value = 'Unknown error'
  }
}

const register = async () => {
  try {
    error.value = ''
    await authStore.register(email.value, password.value, ntrpToRating(ntrp.value))
    await router.push('/dashboard')
  } catch (e: unknown) {
    handleError(e)
  }
}

const loginWithGoogle = async () => {
  try {
    error.value = ''
    await authStore.loginWithGoogle()
    await router.push('/dashboard')
  } catch (e: unknown) {
    handleError(e)
  }
}
</script>

<template>
  <div class="register-page">
    <!-- Left panel -->
    <div class="brand-panel">
      <div class="logo-row">
        <span class="logo-icon">P</span>
        <span class="logo-text">Padel Club</span>
      </div>

      <p class="brand-desc-mobile">Join the padel community</p>

      <div class="brand-spacer"></div>

      <div class="brand-body">
        <div class="brand-text">
          <h2 class="tagline">Join the<br />Padel<br />Community</h2>
          <p class="brand-desc">
            Create your club, challenge others, and track every match. Your padel journey starts
            here.
          </p>
        </div>

        <ul class="features">
          <li class="feature-item">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Create &amp; manage your club</span>
          </li>
          <li class="feature-item">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Track match scores in real-time</span>
          </li>
          <li class="feature-item">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Compete in club leaderboards</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right panel -->
    <div class="form-panel">
      <div class="form-container">
        <div class="form-header">
          <h1 class="form-title">Create Account</h1>
          <p class="form-subtitle">Fill in your details to get started</p>
        </div>

        <div class="field">
          <label class="field-label">EMAIL</label>
          <div class="input-wrapper">
            <svg
              class="input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 4-10 9L2 4" />
            </svg>
            <input
              v-model="email"
              type="email"
              placeholder="alex@example.com"
              class="field-input"
            />
          </div>
        </div>

        <div class="field">
          <label class="field-label">PASSWORD</label>
          <div class="input-wrapper">
            <svg
              class="input-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              v-model="password"
              type="password"
              placeholder="Create a password"
              class="field-input"
            />
            <svg
              class="input-icon input-icon--right"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
              />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
        </div>

        <div class="field">
          <label class="field-label">YOUR NTRP LEVEL</label>
          <select v-model.number="ntrp" class="field-select">
            <option v-for="n in NTRP_OPTIONS" :key="n" :value="n">{{ n.toFixed(1) }}</option>
          </select>
          <p class="field-hint">
            Not sure? 3.5 is a solid recreational-player default — you can adjust it later in
            Settings.
          </p>
        </div>

        <div class="submit-section">
          <p v-if="error" class="error-message">{{ error }}</p>
          <button class="create-btn" @click="register">Create Account</button>
        </div>

        <div class="divider-row">
          <div class="divider-line"></div>
          <span class="divider-text">OR</span>
          <div class="divider-line"></div>
        </div>

        <button class="google-btn" @click="loginWithGoogle">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
            />
            <path
              fill="#34A853"
              d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
            />
            <path
              fill="#FBBC05"
              d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
            />
            <path
              fill="#EA4335"
              d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
            />
          </svg>
          <span>Google</span>
        </button>

        <div class="signin-row">
          <span class="signin-text">Already have an account?</span>
          <RouterLink to="/" class="signin-link">Sign In</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ─── Left panel ─────────────────────────────────── */

.brand-panel {
  flex: 0 0 560px;
  background:
    linear-gradient(rgba(100, 25, 22, 0.55), rgba(100, 25, 22, 0.55)),
    url('../assets/padel-court-brick.png') center / cover;
  padding: 60px 56px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.125);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: var(--color-white);
  font-weight: normal;
}

.logo-text {
  font-family: 'Anton', sans-serif;
  font-size: 24px;
  color: var(--color-white);
  font-weight: normal;
}

.brand-spacer {
  flex: 1;
}

.brand-body {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tagline {
  font-family: 'Anton', sans-serif;
  font-size: 44px;
  color: var(--color-white);
  font-weight: normal;
  line-height: 1.05;
  margin: 0;
}

.brand-desc {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.73);
  line-height: 1.5;
  margin: 0;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.feature-item svg {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.6);
}

.brand-desc-mobile {
  display: none;
}

/* ─── Right panel ─────────────────────────────────── */

.form-panel {
  flex: 1;
  background: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 80px;
}

.form-container {
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.form-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-title {
  font-family: 'Anton', sans-serif;
  font-size: 32px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

.form-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-muted);
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
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-white);
  padding: 12px 14px;
  box-sizing: border-box;
}

.input-wrapper:focus-within {
  border-color: var(--color-danger-strong);
}

.input-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.input-icon--right {
  margin-left: auto;
}

.field-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  min-width: 0;
}

.field-input::placeholder {
  color: var(--color-text-muted);
}

.field-select {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-white);
  padding: 12px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-select:focus {
  border-color: var(--color-danger-strong);
}

.field-hint {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.4;
}

.submit-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-message {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-danger);
}

.create-btn {
  width: 100%;
  background: var(--color-danger-strong);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  padding: 14px 0;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s;
}

.create-btn:hover {
  filter: brightness(0.85);
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.divider-text {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}

.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 12px 0;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s;
}

.google-btn:hover {
  background: var(--color-bg-soft);
}

.signin-row {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.signin-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
}

.signin-link {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger-strong);
  text-decoration: none;
}

/* ─── Mobile ≤ 640px ──────────────────────────────── */

@media (max-width: 640px) {
  .register-page {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .brand-panel {
    flex: none;
    padding: 32px 24px 28px;
    gap: 8px;
    align-items: center;
    text-align: center;
  }

  .logo-row {
    gap: 8px;
  }

  .logo-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    font-size: 16px;
  }

  .logo-text {
    font-size: 20px;
  }

  .brand-spacer {
    display: none;
  }

  .brand-body {
    display: none;
  }

  .brand-desc-mobile {
    display: block;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.67);
    margin: 0;
  }

  .form-panel {
    flex: 1;
    padding: 28px 24px;
    align-items: stretch;
    justify-content: flex-start;
  }

  .form-container {
    width: 100%;
    gap: 20px;
  }

  .form-title {
    font-size: 26px;
  }

  .field-label {
    font-size: 10px;
  }

  .input-wrapper {
    padding: 11px 12px;
    gap: 8px;
  }

  .input-icon {
    width: 16px;
    height: 16px;
  }

  .field-input {
    font-size: 13px;
  }

  .create-btn {
    padding: 13px 0;
    font-size: 14px;
  }

  .google-btn {
    padding: 11px 0;
    font-size: 12px;
  }

  .signin-text,
  .signin-link {
    font-size: 12px;
  }

  .signin-row {
    gap: 5px;
  }
}
</style>
