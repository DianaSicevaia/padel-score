import { defineStore } from 'pinia'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

export interface Club {
  id: string
  name: string
  ownerId: string
  adminIds: string[]
  memberIds?: string[]
  createdAt: number
  deletedAt?: number
}

interface ClubsState {
  clubs: Club[]
  loading: boolean
}

export const useClubsStore = defineStore('clubs', {
  state: (): ClubsState => ({
    clubs: [],
    loading: false,
  }),

  actions: {
    // Live-subscribes to clubs the user owns or is a member of, merging both
    // listeners into `clubs`. Call the returned unsubscribe on unmount.
    subscribeMyClubs(): Unsubscribe {
      const authStore = useAuthStore()
      if (!authStore.user) return () => {}
      const uid = authStore.user.uid

      this.loading = true
      let owned: Club[] = []
      let member: Club[] = []
      let ownedReady = false
      let memberReady = false

      const merge = () => {
        const seen = new Set<string>()
        const merged: Club[] = []
        for (const c of [...owned, ...member]) {
          if (!seen.has(c.id)) {
            seen.add(c.id)
            merged.push(c)
          }
        }
        this.clubs = merged.filter((c) => !c.deletedAt)
        if (ownedReady && memberReady) this.loading = false
      }

      const unsubOwned = onSnapshot(
        query(collection(db, 'clubs'), where('ownerId', '==', uid)),
        (snap) => {
          owned = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) }))
          ownedReady = true
          merge()
        },
      )
      const unsubMember = onSnapshot(
        query(collection(db, 'clubs'), where('memberIds', 'array-contains', uid)),
        (snap) => {
          member = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Club, 'id'>) }))
          memberReady = true
          merge()
        },
      )

      return () => {
        unsubOwned()
        unsubMember()
      }
    },

    async createClub(name: string) {
      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('Not authenticated')

      const now = Date.now()
      const data = {
        name: name.trim(),
        ownerId: authStore.user.uid,
        adminIds: [] as string[],
        memberIds: [] as string[],
        createdAt: now,
      }
      const docRef = await addDoc(collection(db, 'clubs'), data)
      this.clubs.push({ id: docRef.id, ...data })
    },

    async addMember(clubId: string, uid: string) {
      await updateDoc(doc(db, 'clubs', clubId), { memberIds: arrayUnion(uid) })
      const club = this.clubs.find(c => c.id === clubId)
      if (club) {
        club.memberIds = [...(club.memberIds ?? []), uid].filter((v, i, a) => a.indexOf(v) === i)
      }
    },

    async deleteClub(id: string) {
      await updateDoc(doc(db, 'clubs', id), { deletedAt: Date.now() })
      this.clubs = this.clubs.filter(c => c.id !== id)
    },
  },
})
