import { defineStore } from 'pinia'
import { watch } from 'vue'
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'

export type PreferredSide = 'left' | 'right'

export interface UserProfile {
  uid: string
  email?: string
  displayName?: string | null
  photoUrl?: string | null
  rating: number
  matchesPlayed: number
  wins: number
  losses: number
  createdAt: number
  preferredSide?: PreferredSide
  avatarBackground?: string
}

interface RawUserData {
  email?: string
  displayName?: string | null
  photoUrl?: string | null
  rating?: number
  matchesPlayed?: number
  wins?: number
  losses?: number
  createdAt?: number
  preferredSide?: PreferredSide | null
  avatarBackground?: string | null
}

export const START_RATING = 1000

function normalizeUser(uid: string, data: RawUserData): UserProfile {
  return {
    uid,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    rating: data.rating ?? START_RATING,
    matchesPlayed: data.matchesPlayed ?? 0,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    createdAt: data.createdAt ?? 0,
    preferredSide: data.preferredSide ?? undefined,
    avatarBackground: data.avatarBackground ?? undefined,
  }
}

interface UsersState {
  allUsers: UserProfile[]
  allUsersLoaded: boolean
  searchResults: UserProfile[]
  searchLoading: boolean
}

let unsubscribeAllUsers: Unsubscribe | null = null

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    allUsers: [],
    allUsersLoaded: false,
    searchResults: [],
    searchLoading: false,
  }),

  actions: {
    // Live-subscribes to the whole users collection (used app-wide for
    // avatars, ratings, search). Meant to be started once, globally, from
    // App.vue; call the returned unsubscribe on logout.
    subscribeAll(): Unsubscribe {
      if (!unsubscribeAllUsers) {
        this.allUsersLoaded = false
        unsubscribeAllUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          this.allUsers = snapshot.docs.map((d) => normalizeUser(d.id, d.data() as RawUserData))
          this.allUsersLoaded = true
        })
      }
      return () => {
        unsubscribeAllUsers?.()
        unsubscribeAllUsers = null
        this.allUsersLoaded = false
      }
    },

    // Fallback for code paths that might run before App.vue's global
    // subscription has started (e.g. very first render) — idempotent, and
    // resolves once the first snapshot has populated the cache.
    async ensureAllUsersLoaded() {
      if (this.allUsersLoaded) return
      this.subscribeAll()
      await new Promise<void>((resolve) => {
        const stop = watch(
          () => this.allUsersLoaded,
          (loaded) => {
            if (loaded) {
              stop()
              resolve()
            }
          },
          { immediate: true },
        )
      })
    },

    async searchUsers(term: string) {
      this.searchLoading = true
      try {
        await this.ensureAllUsersLoaded()
        const t = term.trim().toLowerCase()
        this.searchResults = !t
          ? []
          : this.allUsers
              .filter(
                (u) =>
                  u.displayName?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t),
              )
              .slice(0, 20)
      } finally {
        this.searchLoading = false
      }
    },

    async getUsersByUid(uids: string[]): Promise<UserProfile[]> {
      await this.ensureAllUsersLoaded()
      return uids
        .map((uid) => this.allUsers.find((u) => u.uid === uid))
        .filter((u): u is UserProfile => !!u)
    },

    async updatePreferredSide(uid: string, side: PreferredSide | null) {
      await setDoc(doc(db, 'users', uid), { preferredSide: side }, { merge: true })
      const idx = this.allUsers.findIndex((u) => u.uid === uid)
      if (idx !== -1)
        this.allUsers[idx] = { ...this.allUsers[idx]!, preferredSide: side ?? undefined }
    },

    // Lets a user pick one of the fixed court-texture backgrounds for when
    // they don't have a profile photo — not a photo upload, just a choice
    // among a fixed set.
    async updateAvatarBackground(uid: string, backgroundId: string | null) {
      await setDoc(doc(db, 'users', uid), { avatarBackground: backgroundId }, { merge: true })
      const idx = this.allUsers.findIndex((u) => u.uid === uid)
      if (idx !== -1)
        this.allUsers[idx] = { ...this.allUsers[idx]!, avatarBackground: backgroundId ?? undefined }
    },

    async applyMatchResult(
      updates: {
        uid: string
        rating: number
        matchesPlayed: number
        wins: number
        losses: number
      }[],
    ) {
      for (const u of updates) {
        await updateDoc(doc(db, 'users', u.uid), {
          rating: u.rating,
          matchesPlayed: u.matchesPlayed,
          wins: u.wins,
          losses: u.losses,
        })
        const idx = this.allUsers.findIndex((usr) => usr.uid === u.uid)
        if (idx !== -1) this.allUsers[idx] = { ...this.allUsers[idx]!, ...u }
      }
    },
  },
})
