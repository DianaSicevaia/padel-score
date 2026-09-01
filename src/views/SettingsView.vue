<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import type { PreferredSide, Gender, ContactVisibility } from '@/stores/users'
import { AVATAR_BACKGROUNDS } from '@/utils/avatarBackgrounds'
import { NTRP_OPTIONS, formatNtrp, ntrpToRating } from '@/utils/ntrp'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileTopBar from '@/components/layout/MobileTopBar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import PlayerAvatar from '@/components/shared/PlayerAvatar.vue'
import ContactIcon from '@/components/shared/ContactIcon.vue'
import InfoTooltip from '@/components/shared/InfoTooltip.vue'
import ifeellikeitImg from '@/assets/ifeellikeit.webp'

const authStore = useAuthStore()
const usersStore = useUsersStore()
const router = useRouter()

const mobileMenuOpen = ref(false)

const user = computed(() => authStore.user)

// ── Global (site-wide) rating — from matches played without a club ──
// usersStore.allUsers is kept live app-wide (see App.vue).
const globalProfile = computed(
  () => usersStore.allUsers.find((u) => u.uid === authStore.user?.uid) ?? null,
)

const globalRatingText = computed(() => {
  const p = globalProfile.value
  if (!p) return ''
  return p.matchesPlayed > 0
    ? `Rating ${p.rating} · ${p.matchesPlayed} matches · ${p.wins}W / ${p.losses}L`
    : `Rating ${p.rating} · no standalone matches yet`
})

const suggestedNtrpText = computed(() => {
  const p = globalProfile.value
  if (!p) return ''
  return `Suggested NTRP ${formatNtrp(p.suggestedRating ?? p.rating)}`
})

const realNtrpText = computed(() =>
  globalProfile.value ? `Platform calculated NTRP ${formatNtrp(globalProfile.value.rating)}` : '',
)

const preferredSideLabel = (side?: PreferredSide) => {
  if (side === 'left') return 'Left'
  if (side === 'right') return 'Right'
  return ''
}

const preferredSideText = computed(() => {
  const label = preferredSideLabel(globalProfile.value?.preferredSide)
  return label ? `Preferred side: ${label}` : ''
})

const genderLabel = (g?: Gender) => {
  if (g === 'male') return 'Male'
  if (g === 'female') return 'Female'
  return ''
}

const genderText = computed(() => genderLabel(globalProfile.value?.gender))

const hasContactInfo = computed(
  () =>
    !!globalProfile.value?.contactTelegram ||
    !!globalProfile.value?.contactWhatsapp ||
    !!globalProfile.value?.contactPhone,
)

const displayName = computed(() => {
  if (!user.value) return 'Player'
  return user.value.displayName || user.value.email?.split('@')[0] || 'Player'
})

const memberSince = computed(() => {
  const t = user.value?.metadata.creationTime
  if (!t) return ''
  return new Date(t).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const logout = async () => {
  await authStore.logout()
  router.push('/')
}

// ── Edit profile ───────────────────────────────────
const isEditing = ref(false)
const editName = ref('')
const editPreferredSide = ref<PreferredSide | null>(null)
const editAvatarBackground = ref<string | null>(null)
const editGender = ref<Gender | null>(null)
const editEmailHidden = ref(false)
const editContactTelegram = ref('')
const editContactWhatsapp = ref('')
const editContactPhone = ref('')
const editContactVisibility = ref<ContactVisibility>('private')
const saving = ref(false)
const saveError = ref('')

const startEdit = () => {
  editName.value = displayName.value
  editPreferredSide.value = globalProfile.value?.preferredSide ?? null
  editAvatarBackground.value = globalProfile.value?.avatarBackground ?? null
  editGender.value = globalProfile.value?.gender ?? null
  editEmailHidden.value = globalProfile.value?.emailHidden ?? false
  editContactTelegram.value = globalProfile.value?.contactTelegram ?? ''
  editContactWhatsapp.value = globalProfile.value?.contactWhatsapp ?? ''
  editContactPhone.value = globalProfile.value?.contactPhone ?? ''
  editContactVisibility.value = globalProfile.value?.contactVisibility ?? 'private'
  saveError.value = ''
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveProfile = async () => {
  if (!editName.value.trim()) {
    saveError.value = 'Please enter a display name.'
    return
  }
  if (!authStore.user) return
  saving.value = true
  saveError.value = ''
  try {
    await Promise.all([
      authStore.updateUserProfile({ displayName: editName.value.trim() }),
      usersStore.updatePreferredSide(authStore.user.uid, editPreferredSide.value),
      usersStore.updateAvatarBackground(authStore.user.uid, editAvatarBackground.value),
      usersStore.updateGender(authStore.user.uid, editGender.value),
      usersStore.updateEmailHidden(authStore.user.uid, editEmailHidden.value),
      usersStore.updateContactInfo(authStore.user.uid, {
        telegram: editContactTelegram.value,
        whatsapp: editContactWhatsapp.value,
        phone: editContactPhone.value,
        visibility: editContactVisibility.value,
      }),
    ])
    // usersStore.allUsers (and so globalProfile) updates live once the write lands.
    isEditing.value = false
  } catch {
    saveError.value = 'Failed to save profile. Please try again.'
  } finally {
    saving.value = false
  }
}

// ── NTRP correction ─────────────────────────────────
// Kept separate from the main profile edit above: this rewrites the
// underlying rating directly, so it should only happen on a deliberate
// action (e.g. "I've kept playing elsewhere and my level has moved since I
// registered"), never as a side effect of saving an unrelated field.
const isEditingNtrp = ref(false)
const editNtrp = ref(2.5)
const savingNtrp = ref(false)
const ntrpError = ref('')

const startEditNtrp = () => {
  const p = globalProfile.value
  editNtrp.value = p ? Number(formatNtrp(p.suggestedRating ?? p.rating)) : 2.5
  ntrpError.value = ''
  isEditingNtrp.value = true
}

const cancelEditNtrp = () => {
  isEditingNtrp.value = false
}

const saveNtrp = async () => {
  if (!authStore.user) return
  savingNtrp.value = true
  ntrpError.value = ''
  try {
    await usersStore.updateSuggestedRating(authStore.user.uid, ntrpToRating(editNtrp.value))
    isEditingNtrp.value = false
  } catch {
    ntrpError.value = 'Failed to update your rating. Please try again.'
  } finally {
    savingNtrp.value = false
  }
}
</script>

<template>
  <div class="page">
    <SidebarNav :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <div class="main">
      <MobileTopBar @menu-click="mobileMenuOpen = true" />

      <!-- Content -->
      <div class="content">
        <div class="page-hdr">
          <h1 class="page-title">Settings</h1>
        </div>

        <!-- Profile panel -->
        <div class="panel">
          <div class="panel-hdr">
            <span class="panel-title">Profile</span>
            <button v-if="!isEditing" class="btn-edit" @click="startEdit">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </button>
          </div>
          <div class="panel-divider"></div>

          <!-- View mode -->
          <div v-if="!isEditing" class="profile-body">
            <PlayerAvatar
              class="profile-avatar"
              :name="displayName"
              :photoUrl="user?.photoURL"
              :backgroundId="globalProfile?.avatarBackground"
              :size="72"
            />
            <div class="profile-info">
              <span class="profile-name">{{ displayName }}</span>
              <span class="profile-email"
                >{{ user?.email ?? '—' }}
                <span v-if="globalProfile?.emailHidden" class="hidden-tag">hidden from others</span>
              </span>
              <span v-if="memberSince" class="profile-since">Member since {{ memberSince }}</span>
              <div v-if="hasContactInfo" class="contact-summary">
                <span v-if="globalProfile?.contactTelegram" class="contact-line"
                  ><ContactIcon type="telegram" :size="14" />{{
                    globalProfile.contactTelegram
                  }}</span
                >
                <span v-if="globalProfile?.contactWhatsapp" class="contact-line"
                  ><ContactIcon type="whatsapp" :size="14" />{{
                    globalProfile.contactWhatsapp
                  }}</span
                >
                <span v-if="globalProfile?.contactPhone" class="contact-line"
                  ><ContactIcon type="phone" :size="14" />{{ globalProfile.contactPhone }}</span
                >
                <span class="hidden-tag">{{
                  globalProfile?.contactVisibility === 'public'
                    ? 'visible to everyone'
                    : 'visible to your club members only'
                }}</span>
              </div>
              <span v-if="suggestedNtrpText" class="profile-ntrp-row">
                <span class="profile-ntrp profile-ntrp--suggested">{{ suggestedNtrpText }}</span>
                <InfoTooltip label="What is Suggested NTRP?">
                  <p class="ntrp-info-text">A self-assessment. Basically:</p>
                  <img :src="ifeellikeitImg" alt="Я так чувствую" class="ntrp-info-img" />
                </InfoTooltip>
                <button
                  v-if="!isEditingNtrp"
                  type="button"
                  class="btn-adjust-ntrp"
                  @click="startEditNtrp"
                >
                  Adjust
                </button>
              </span>
              <div v-if="isEditingNtrp" class="ntrp-edit-row">
                <select v-model.number="editNtrp" class="ntrp-select">
                  <option v-for="n in NTRP_OPTIONS" :key="n" :value="n">{{ n.toFixed(1) }}</option>
                </select>
                <button class="btn-sm-primary btn-sm-tiny" :disabled="savingNtrp" @click="saveNtrp">
                  {{ savingNtrp ? '…' : 'Save' }}
                </button>
                <button
                  class="btn-sm-ghost btn-sm-tiny"
                  :disabled="savingNtrp"
                  @click="cancelEditNtrp"
                >
                  Cancel
                </button>
              </div>
              <p v-if="ntrpError" class="add-error">{{ ntrpError }}</p>
              <p class="ntrp-suggested-hint">Self-reported — set by the player, not verified.</p>
              <span v-if="realNtrpText" class="profile-ntrp profile-ntrp--real">{{
                realNtrpText
              }}</span>
              <p class="ntrp-suggested-hint">Computed from your match &amp; tournament results.</p>
              <span v-if="globalRatingText" class="profile-rating">{{ globalRatingText }}</span>
              <span v-if="globalProfile" class="profile-rating-hint"
                >Based on matches played without a club</span
              >
              <span v-if="preferredSideText" class="profile-side">{{ preferredSideText }}</span>
              <span v-if="genderText" class="profile-side">{{ genderText }}</span>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="profile-edit-body">
            <div class="profile-edit-avatar-col">
              <PlayerAvatar
                class="profile-avatar"
                :name="displayName"
                :photoUrl="user?.photoURL"
                :backgroundId="editAvatarBackground"
                :size="72"
              />
              <div v-if="!user?.photoURL" class="bg-swatches">
                <button
                  v-for="bg in AVATAR_BACKGROUNDS"
                  :key="bg.id"
                  type="button"
                  class="bg-swatch"
                  :class="{ 'bg-swatch--active': editAvatarBackground === bg.id }"
                  :style="{ backgroundImage: `url(${bg.src})` }"
                  :title="bg.label"
                  :aria-label="bg.label"
                  @click="editAvatarBackground = bg.id"
                ></button>
              </div>
            </div>
            <div class="edit-fields">
              <label class="field-label">Display name</label>
              <input
                v-model="editName"
                class="field-input"
                maxlength="60"
                placeholder="Your name"
                @keyup.enter="saveProfile"
              />

              <label class="checkbox-row field-label--spaced">
                <input type="checkbox" v-model="editEmailHidden" />
                Hide my email from other players
              </label>

              <label class="field-label field-label--spaced">Preferred side</label>
              <div class="side-toggle">
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editPreferredSide === 'left' }]"
                  @click="editPreferredSide = 'left'"
                >
                  Left
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editPreferredSide === 'right' }]"
                  @click="editPreferredSide = 'right'"
                >
                  Right
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editPreferredSide === null }]"
                  @click="editPreferredSide = null"
                >
                  No preference
                </button>
              </div>

              <label class="field-label field-label--spaced">Gender</label>
              <div class="side-toggle">
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editGender === 'male' }]"
                  @click="editGender = 'male'"
                >
                  Male
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editGender === 'female' }]"
                  @click="editGender = 'female'"
                >
                  Female
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editGender === null }]"
                  @click="editGender = null"
                >
                  Not specified
                </button>
              </div>

              <label class="field-label field-label--spaced"
                >Contact info <span class="optional-tag">optional</span></label
              >
              <div class="field-input-icon-wrap">
                <ContactIcon type="telegram" :size="16" class="field-input-icon" />
                <input
                  v-model="editContactTelegram"
                  class="field-input field-input--icon"
                  maxlength="60"
                  placeholder="Telegram — e.g. @username"
                />
              </div>
              <div class="field-input-icon-wrap">
                <ContactIcon type="whatsapp" :size="16" class="field-input-icon" />
                <input
                  v-model="editContactWhatsapp"
                  class="field-input field-input--icon"
                  maxlength="60"
                  placeholder="WhatsApp number"
                />
              </div>
              <div class="field-input-icon-wrap">
                <ContactIcon type="phone" :size="16" class="field-input-icon" />
                <input
                  v-model="editContactPhone"
                  class="field-input field-input--icon"
                  maxlength="30"
                  placeholder="Phone number"
                />
              </div>
              <div class="side-toggle">
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editContactVisibility === 'private' }]"
                  @click="editContactVisibility = 'private'"
                >
                  Club members only
                </button>
                <button
                  type="button"
                  :class="['side-tab', { 'side-tab--active': editContactVisibility === 'public' }]"
                  @click="editContactVisibility = 'public'"
                >
                  Public
                </button>
              </div>
              <p class="field-hint">
                {{
                  editContactVisibility === 'public'
                    ? 'Anyone can see this contact info on your profile.'
                    : 'Only players who share a club with you can see this contact info.'
                }}
              </p>

              <p v-if="saveError" class="add-error">{{ saveError }}</p>
              <div class="edit-actions">
                <button class="btn-sm-primary" :disabled="saving" @click="saveProfile">
                  {{ saving ? '…' : 'Save' }}
                </button>
                <button class="btn-sm-ghost" :disabled="saving" @click="cancelEdit">Cancel</button>
              </div>
            </div>
          </div>

          <div class="panel-divider"></div>

          <div class="panel-actions">
            <button class="btn-logout" @click="logout">
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
              Log out
            </button>
          </div>
        </div>
      </div>
      <!-- end .content -->

      <MobileBottomNav active="profile" />
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
  gap: 24px;
}

/* ── PAGE HEADER ── */
.page-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: var(--color-text);
  margin: 0;
}

/* ── PANEL ── */
.panel {
  background: var(--color-white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 480px;
}

.panel-hdr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
}

.panel-title {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  color: var(--color-text);
  font-weight: normal;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 6px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.btn-edit:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.panel-divider {
  height: 1px;
  background: var(--color-bg-soft);
}

/* ── PROFILE ── */
.profile-body {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 20px;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* ── PROFILE EDIT ── */
.profile-edit-body {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px 20px;
}

.profile-edit-avatar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.bg-swatches {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.bg-swatch {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid transparent;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  padding: 0;
  transition:
    border-color 0.15s,
    transform 0.1s;
}

.bg-swatch:hover {
  transform: scale(1.08);
}

.bg-swatch--active {
  border-color: var(--color-accent);
}

.edit-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.field-label {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--color-accent);
}

.field-label--spaced {
  margin-top: 6px;
}

.optional-tag {
  color: var(--color-text-faint);
  font-weight: 500;
  text-transform: none;
}

.field-hint {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.hidden-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-muted);
  border-radius: 4px;
  padding: 1px 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.contact-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}

.contact-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-strong);
}

.contact-line svg {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.field-input-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-input-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.field-input--icon {
  padding-left: 36px;
  width: 100%;
  box-sizing: border-box;
}

.side-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border-radius: 8px;
}

.side-tab {
  flex: 1;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.side-tab--active {
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.side-tab:hover:not(.side-tab--active) {
  color: var(--color-text-hover);
}

.add-error {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-danger);
  margin: 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-sm-primary {
  height: 36px;
  padding: 0 16px;
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-sm-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-sm-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm-ghost {
  height: 36px;
  padding: 0 12px;
  background: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s;
}

.btn-sm-ghost:hover:not(:disabled) {
  color: var(--color-text);
}

.btn-sm-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-name {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  font-weight: normal;
  color: var(--color-text);
}

.profile-email {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--color-text-strong);
  word-break: break-all;
}

.profile-since {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--color-text-subtle);
  margin-top: 2px;
}

.profile-ntrp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.profile-ntrp {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-accent);
}

.profile-ntrp--suggested {
  color: #b5720a;
}

.profile-ntrp--real {
  color: var(--color-accent);
  margin-top: 8px;
}

.ntrp-suggested-hint {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--color-text-faint);
  margin: 0;
}

.ntrp-info-text {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text);
  margin: 0 0 8px;
}

.ntrp-info-img {
  display: block;
  width: 100%;
  border-radius: 6px;
}

.btn-adjust-ntrp {
  background: none;
  border: none;
  padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  text-decoration: underline dotted;
}

.btn-adjust-ntrp:hover {
  color: var(--color-accent);
}

.ntrp-edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.ntrp-select {
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-white);
  outline: none;
  cursor: pointer;
}

.ntrp-select:focus {
  border-color: var(--color-accent);
}

.btn-sm-tiny {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
}

.profile-rating {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 6px;
}

.profile-rating-hint {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--color-text-faint);
}

.profile-side {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* ── ACTIONS ── */
.panel-actions {
  padding: 16px 20px;
}

.btn-logout {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--color-danger-alt);
  border: 1.5px solid #e8b4b0;
  border-radius: 999px;
  padding: 9px 20px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn-logout:hover {
  background: #fdf1f0;
  border-color: var(--color-danger-alt);
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: 100svh;
    height: 100vh;
  }

  .content {
    padding: 20px 16px;
  }

  .panel {
    max-width: 100%;
  }
}
</style>
