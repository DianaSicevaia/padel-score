import { defineStore } from 'pinia'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'

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

    async applyMatchResult(
      updates: { uid: string; rating: number; matchesPlayed: number; wins: number; losses: number }[],
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
