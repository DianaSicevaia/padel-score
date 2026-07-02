import { defineStore } from 'pinia'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore'
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
    async fetchMyClubs() {
      const authStore = useAuthStore()
      if (!authStore.user) return

      this.loading = true
      try {
        const uid = authStore.user.uid

        const [ownedSnap, memberSnap] = await Promise.all([
          getDocs(query(collection(db, 'clubs'), where('ownerId', '==', uid))),
          getDocs(query(collection(db, 'clubs'), where('memberIds', 'array-contains', uid))),
        ])

        const seen = new Set<string>()
        const clubs: Club[] = []
        for (const snap of [ownedSnap, memberSnap]) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) {
              seen.add(d.id)
              clubs.push({ id: d.id, ...(d.data() as Omit<Club, 'id'>) })
            }
          }
        }
        this.clubs = clubs.filter(c => !c.deletedAt)
      } finally {
        this.loading = false
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
