<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

const handleError = (e: unknown) => {
  if (e instanceof Error) {
    error.value = e.message
  } else {
    error.value = 'Unknown error'
  }
}

const login = async () => {
  try {
    error.value = ''
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
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
  <div class="login-page">
    <div class="brand-panel">
      <div class="logo-row">
        <span class="logo-icon">P</span>
        <span class="logo-text">Padel Club</span>
      </div>

      <div class="center-content">
        <h2 class="tagline">Your Padel<br />Community<br />Starts Here</h2>
        <p class="description">
          Connect with players, create clubs, track match scores, and climb the standings. Your next
          game is just a tap away.
        </p>
      </div>

      <div class="stats-area">
        <span class="stats-caption"
          >this is a pet project for my friends who play padel tennis. Enjoy =)</span
        >
      </div>
    </div>

    <div class="form-panel">
      <div class="form-container">
        <div class="form-header">
          <h1 class="form-title">Welcome Back</h1>
          <p class="form-subtitle">Sign in to your Padel Club account</p>
        </div>

        <div class="field">
          <label class="field-label">EMAIL</label>
          <input v-model="email" type="email" placeholder="you@example.com" class="field-input" />
        </div>

        <div class="field">
          <div class="password-label-row">
            <label class="field-label">PASSWORD</label>
            <RouterLink to="/forgot-password" class="forgot-link forgot-link--desktop"
              >Forgot password?</RouterLink
            >
          </div>
          <input v-model="password" type="password" placeholder="••••••••" class="field-input" />
          <RouterLink to="/forgot-password" class="forgot-link forgot-link--mobile"
            >Forgot password?</RouterLink
          >
        </div>

        <div class="sign-in-section">
          <p v-if="error" class="error-message">{{ error }}</p>
          <button class="sign-in-btn" @click="login">Sign In</button>
        </div>

        <div class="divider-row">
          <div class="divider-line"></div>
          <span class="divider-text">OR</span>
          <div class="divider-line"></div>
        </div>

        <div class="social-buttons">
          <button class="social-btn" @click="loginWithGoogle">
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
            <span class="btn-label-short">Google</span>
            <span class="btn-label-long">Continue with Google</span>
          </button>
        </div>

        <div class="signup-row">
          <span class="signup-text">Don't have an account?</span>
          <RouterLink to="/register" class="signup-link">Sign up</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.brand-panel {
  flex: 0 0 50%;
  background:
    linear-gradient(rgba(22, 55, 100, 0.55), rgba(22, 55, 100, 0.55)),
    url('../assets/padel-court-blue.png') center / cover;
  padding: 80px 64px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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

.center-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tagline {
  font-family: 'Anton', sans-serif;
  font-size: 48px;
  color: var(--color-white);
  font-weight: normal;
  line-height: 1.1;
  margin: 0;
}

.description {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.67);
  line-height: 1.6;
  max-width: 420px;
  margin: 0;
}

.stats-caption {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.67);
}

.form-panel {
  flex: 1;
  background: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 96px;
}

.form-container {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
}

.field-input {
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg-soft);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.field-input::placeholder {
  color: var(--color-text-muted);
}

.field-input:focus {
  border-color: var(--color-primary);
}

.password-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-primary);
  text-decoration: none;
}
.forgot-link:hover,
.forgot-link:focus {
  color: var(--color-accent);
}

.sign-in-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-message {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-danger);
}

.sign-in-btn {
  height: 48px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 999px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}

.sign-in-btn:hover {
  background: var(--color-primary-hover);
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

.social-buttons {
  display: flex;
  gap: 12px;
}

.social-btn {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-white);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s;
}

.social-btn:hover {
  background: var(--color-bg-soft);
}

.signup-row {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.signup-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
}

.signup-link {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.forgot-link--mobile {
  display: none;
}

.btn-label-long {
  display: none;
}

@media (max-width: 640px) {
  .login-page {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .brand-panel {
    flex: none;
    padding: 48px 24px 40px;
    justify-content: flex-start;
    gap: 24px;
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

  .tagline {
    font-size: 28px;
  }

  .description {
    font-size: 13px;
    line-height: 1.4;
    max-width: none;
  }

  .stats-area {
    display: none;
  }

  .form-panel {
    flex: 1;
    padding: 32px 24px;
    align-items: stretch;
    justify-content: flex-start;
  }

  .form-container {
    width: 100%;
    gap: 24px;
  }

  .form-header {
    gap: 4px;
  }

  .form-title {
    font-size: 24px;
  }

  .field-input {
    height: 44px;
  }

  .forgot-link--desktop {
    display: none;
  }

  .forgot-link--mobile {
    display: block;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: var(--color-primary);
    text-decoration: none;
  }

  .social-buttons {
    flex-direction: column;
    gap: 10px;
  }

  .social-btn {
    font-size: 14px;
    gap: 10px;
  }

  .btn-label-short {
    display: none;
  }

  .btn-label-long {
    display: inline;
  }
}
</style>
