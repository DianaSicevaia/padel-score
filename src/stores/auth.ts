import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile,
} from 'firebase/auth'

import { auth, db } from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'

interface AuthState {
  user: User | null
  initialized: boolean
}

const SESSION_MS = 24 * 60 * 60 * 1000
let sessionTimer: ReturnType<typeof setTimeout> | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    async register(email: string, password: string, initialRating: number) {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      localStorage.setItem('loginAt', String(Date.now()))
      this.user = credential.user
      await this.createUserProfile(credential.user, initialRating)
      this.scheduleExpiry()
    },

    async login(email: string, password: string) {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      localStorage.setItem('loginAt', String(Date.now()))
      this.user = credential.user
      this.scheduleExpiry()
    },

    async logout() {
      if (sessionTimer) {
        clearTimeout(sessionTimer)
        sessionTimer = null
      }
      await signOut(auth)
      localStorage.removeItem('loginAt')
      this.user = null
    },

    // Check expiry on app start (called from main.ts after init resolves).
    // Also schedules auto-logout for the remaining time.
    checkExpiry() {
      if (!this.user) return

      const loginAt = Number(localStorage.getItem('loginAt') ?? 0)
      if (!loginAt || Date.now() - loginAt >= SESSION_MS) {
        void this.logout()
        return
      }

      this.scheduleExpiry()
    },

    scheduleExpiry() {
      const loginAt = Number(localStorage.getItem('loginAt') ?? 0)
      if (!loginAt) return

      const remaining = SESSION_MS - (Date.now() - loginAt)
      if (sessionTimer) clearTimeout(sessionTimer)
      sessionTimer = remaining > 0 ? setTimeout(() => void this.logout(), remaining) : null
    },

    init() {
      return new Promise<void>((resolve) => {
        onAuthStateChanged(auth, (user) => {
          this.user = user
          this.initialized = true
          resolve()
        })
      })
    },

    async loginWithGoogle() {
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      localStorage.setItem('loginAt', String(Date.now()))
      this.user = credential.user
      await this.createUserProfile(credential.user)
      this.scheduleExpiry()
    },

    // initialRating is only passed for brand-new email/password sign-ups
    // (from the NTRP picker on the register form)
    // Ommited for Google sign-in, which calls this on every login and would otherwise
    // clobber a rating already earned through match play.
    async createUserProfile(user: User, initialRating?: number) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoURL,
          createdAt: Date.now(),
          ...(initialRating !== undefined ? { rating: initialRating } : {}),
        },
        {
          merge: true,
        },
      )
    },

    async resetPassword(email: string) {
      await sendPasswordResetEmail(auth, email)
    },

    async updateUserProfile(updates: { displayName?: string }) {
      if (!auth.currentUser) throw new Error('Not authenticated')

      await updateAuthProfile(auth.currentUser, {
        ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
      })

      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        {
          ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
        },
        { merge: true },
      )

      // Firebase mutates auth.currentUser in place, so reassign a new object
      // reference here to make sure Vue picks up the change.
      this.user = auth.currentUser ? ({ ...auth.currentUser } as User) : null
    },
  },
})
