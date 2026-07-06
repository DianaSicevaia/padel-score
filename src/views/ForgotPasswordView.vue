<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const submit = async () => {
  if (!email.value.trim()) {
    error.value = 'Please enter your email address.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authStore.resetPassword(email.value.trim())
    success.value = true
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- Left panel -->
    <div class="brand-panel">
      <div class="logo-row">
        <span class="logo-icon">P</span>
        <span class="logo-text">Padel Club</span>
      </div>

      <p class="brand-desc-mobile">Reset your password</p>

      <div class="brand-spacer"></div>

      <div class="brand-body">
        <div class="brand-text">
          <h2 class="tagline">Forgot Your<br />Password?</h2>
          <p class="brand-desc">
            No worries — enter your email and we'll send you a link to get back into your account.
          </p>
        </div>

        <ul class="features">
          <li class="feature-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Reset link sent to your inbox</span>
          </li>
          <li class="feature-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Link expires after 1 hour</span>
          </li>
          <li class="feature-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Your account stays secure</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right panel -->
    <div class="form-panel">
      <div class="form-container">

        <!-- Success state -->
        <template v-if="success">
          <div class="success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              <path d="m16 19 2 2 4-4" />
            </svg>
          </div>
          <div class="form-header">
            <h1 class="form-title">Check your email</h1>
            <p class="form-subtitle">
              We sent a password reset link to<br />
              <strong>{{ email }}</strong>
            </p>
          </div>
          <p class="success-hint">Didn't get it? Check your spam folder or try again.</p>
          <button class="submit-btn" @click="success = false; email = ''">Send another link</button>
          <div class="back-row">
            <RouterLink to="/" class="back-link">← Back to Sign In</RouterLink>
          </div>
        </template>

        <!-- Form state -->
        <template v-else>
          <div class="form-header">
            <h1 class="form-title">Reset Password</h1>
            <p class="form-subtitle">Enter your email and we'll send you a reset link</p>
          </div>

          <div class="field">
            <label class="field-label">EMAIL</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 4-10 9L2 4" />
              </svg>
              <input
                v-model="email"
                type="email"
                placeholder="alex@example.com"
                class="field-input"
                @keyup.enter="submit"
              />
            </div>
          </div>

          <div class="submit-section">
            <p v-if="error" class="error-message">{{ error }}</p>
            <button class="submit-btn" :disabled="loading" @click="submit">
              {{ loading ? 'Sending…' : 'Send Reset Link' }}
            </button>
          </div>

          <div class="back-row">
            <RouterLink to="/" class="back-link">← Back to Sign In</RouterLink>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── Left panel ── */
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

/* ── Right panel ── */
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
  line-height: 1.5;
}

.form-subtitle strong {
  color: var(--color-text);
  font-weight: 600;
}

/* ── Field ── */
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
  color: #999999;
}

/* ── Submit ── */
.submit-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-message {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-danger);
  margin: 0;
}

.submit-btn {
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

.submit-btn:hover:not(:disabled) {
  filter: brightness(0.85);
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Back link ── */
.back-row {
  display: flex;
  justify-content: center;
}

.back-link {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger-strong);
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

/* ── Success state ── */
.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: #f0faf3;
  border: 1.5px solid #b8dfc4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a7a3c;
}

.success-hint {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-subtle);
  margin: 0;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .page {
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

  .submit-btn {
    padding: 13px 0;
    font-size: 14px;
  }
}
</style>
