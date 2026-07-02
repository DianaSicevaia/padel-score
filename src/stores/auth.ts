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
    async register(email: string, password: string) {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      localStorage.setItem('loginAt', String(Date.now()))
      this.user = credential.user
      await this.createUserProfile(credential.user)
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

    async createUserProfile(user: User) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoURL,
          createdAt: Date.now(),
        },
        {
          merge: true,
        },
      )
    },

    async resetPassword(email: string) {
      await sendPasswordResetEmail(auth, email)
    },
  },
})
