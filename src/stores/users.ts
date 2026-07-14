import { defineStore } from 'pinia'
import { collection, getDocs, getDoc, doc, updateDoc, setDoc } from 'firebase/firestore'
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
  }
}

interface UsersState {
  allUsers: UserProfile[]
  allUsersLoaded: boolean
  searchResults: UserProfile[]
  searchLoading: boolean
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    allUsers: [],
    allUsersLoaded: false,
    searchResults: [],
    searchLoading: false,
  }),

  actions: {
    async ensureAllUsersLoaded() {
      if (this.allUsersLoaded) return
      const snapshot = await getDocs(collection(db, 'users'))
      this.allUsers = snapshot.docs.map((d) => normalizeUser(d.id, d.data() as RawUserData))
      this.allUsersLoaded = true
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

    async fetchOwnProfile(uid: string): Promise<UserProfile | null> {
      const snap = await getDoc(doc(db, 'users', uid))
      if (!snap.exists()) return null
      const profile = normalizeUser(uid, snap.data() as RawUserData)
      const idx = this.allUsers.findIndex((u) => u.uid === uid)
      if (idx !== -1) this.allUsers[idx] = profile
      return profile
    },

    async updatePreferredSide(uid: string, side: PreferredSide | null) {
      await setDoc(doc(db, 'users', uid), { preferredSide: side }, { merge: true })
      const idx = this.allUsers.findIndex((u) => u.uid === uid)
      if (idx !== -1)
        this.allUsers[idx] = { ...this.allUsers[idx]!, preferredSide: side ?? undefined }
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
