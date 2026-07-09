import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  limit,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useClubsStore } from '@/stores/clubs'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

export interface Player {
  id: string
  clubId: string
  name: string
  uid?: string
  status?: 'requested'
  rating: number
  matchesPlayed: number
  wins: number
  losses: number
  createdAt: number
  deletedAt?: number
}

interface PlayersState {
  players: Player[]
  selectablePlayers: Player[]
  loading: boolean
}

const hasAdditionalData = (p: Player): boolean =>
  p.rating > 0 || p.matchesPlayed > 0 || p.wins > 0 || p.losses > 0

export const usePlayersStore = defineStore('players', {
  state: (): PlayersState => ({
    players: [],
    selectablePlayers: [],
    loading: false,
  }),

  actions: {
    async fetchPlayers(clubId: string) {
      this.loading = true
      this.players = []
      try {
        const q = query(collection(db, 'players'), where('clubId', '==', clubId))
        const snapshot = await getDocs(q)
        this.players = snapshot.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }))
          .filter(p => !p.deletedAt)
      } finally {
        this.loading = false
      }
    },

    async createPlayer(clubId: string, name: string, uid?: string) {
      const authStore = useAuthStore()
      const isSelf = !uid || uid === authStore.user?.uid
      const now = Date.now()
      const data: Omit<Player, 'id'> = {
        clubId,
        name: name.trim(),
        ...(uid ? { uid } : {}),
        ...(uid && !isSelf ? { status: 'requested' as const } : {}),
        rating: 0,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        createdAt: now,
      }
      const docRef = await addDoc(collection(db, 'players'), data)
      this.players.push({ id: docRef.id, ...data })

      if (uid && isSelf) {
        await useClubsStore().addMember(clubId, uid)
      } else if (uid && !isSelf) {
        const clubName = useClubsStore().clubs.find((c) => c.id === clubId)?.name ?? 'a club'
        await useNotificationsStore().createClubInviteNotification(uid, clubId, clubName)
      }
    },

    async addPlayerByEmail(clubId: string, email: string): Promise<'ok' | 'not_found' | 'already_added'> {
      const normalized = email.trim().toLowerCase()
      const q = query(collection(db, 'users'), where('email', '==', normalized), limit(1))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return 'not_found'

      const userDoc = snapshot.docs[0]!
      const uid = userDoc.id
      const userData = userDoc.data() as { email?: string; displayName?: string | null }

      if (this.players.some(p => p.uid === uid)) return 'already_added'

      const name = userData.displayName || normalized.split('@')[0] || normalized
      await this.createPlayer(clubId, name, uid)
      return 'ok'
    },

    async updatePlayer(id: string, updates: { name: string }) {
      await updateDoc(doc(db, 'players', id), updates)
      const idx = this.players.findIndex(p => p.id === id)
      if (idx !== -1) this.players[idx] = { ...this.players[idx]!, ...updates }
    },

    async deletePlayer(player: Player) {
      if (hasAdditionalData(player)) {
        await updateDoc(doc(db, 'players', player.id), { deletedAt: Date.now() })
      } else {
        await deleteDoc(doc(db, 'players', player.id))
      }
      this.players = this.players.filter(p => p.id !== player.id)
    },

    async applyMatchResult(updates: { id: string; rating: number; matchesPlayed: number; wins: number; losses: number }[]) {
      for (const u of updates) {
        await updateDoc(doc(db, 'players', u.id), {
          rating: u.rating,
          matchesPlayed: u.matchesPlayed,
          wins: u.wins,
          losses: u.losses,
        })
        const idx = this.players.findIndex(p => p.id === u.id)
        if (idx !== -1) this.players[idx] = { ...this.players[idx]!, ...u }
      }
    },

    async fetchSelectablePlayers(otherClubIds: string[]) {
      if (!otherClubIds.length) {
        this.selectablePlayers = []
        return
      }
      const q = query(collection(db, 'players'), where('clubId', 'in', otherClubIds))
      const snapshot = await getDocs(q)
      this.selectablePlayers = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }))
        .filter(p => !p.deletedAt)
    },
  },
})
