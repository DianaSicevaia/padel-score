import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useClubsStore } from '@/stores/clubs'

export type NotificationType = 'club_invite' | 'match_invite'
export type NotificationStatus = 'pending' | 'accepted' | 'declined'

export interface AppNotification {
  id: string
  uid: string
  type: NotificationType
  status: NotificationStatus
  clubId?: string
  clubName: string
  matchId?: string
  matchLabel?: string
  scheduledAt?: number
  createdAt: number
  respondedAt?: number
}

interface NotificationsState {
  notifications: AppNotification[]
  loading: boolean
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    notifications: [],
    loading: false,
  }),

  getters: {
    unreadCount: (state) => state.notifications.filter((n) => n.status === 'pending').length,
  },

  actions: {
    async fetchNotifications(uid: string) {
      this.loading = true
      try {
        const q = query(collection(db, 'notifications'), where('uid', '==', uid))
        const snapshot = await getDocs(q)
        this.notifications = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
      } finally {
        this.loading = false
      }
    },

    async createClubInviteNotification(uid: string, clubId: string, clubName: string) {
      const data: Omit<AppNotification, 'id'> = {
        uid,
        type: 'club_invite',
        status: 'pending',
        clubId,
        clubName,
        createdAt: Date.now(),
      }
      await addDoc(collection(db, 'notifications'), data)
    },

    async createMatchInviteNotifications(
      uids: string[],
      clubId: string | undefined,
      clubName: string,
      matchId: string,
      matchLabel: string,
      scheduledAt: number,
    ) {
      await Promise.all(
        uids.map((uid) => {
          const data: Omit<AppNotification, 'id'> = {
            uid,
            type: 'match_invite',
            status: 'pending',
            ...(clubId ? { clubId } : {}),
            clubName,
            matchId,
            matchLabel,
            scheduledAt,
            createdAt: Date.now(),
          }
          return addDoc(collection(db, 'notifications'), data)
        }),
      )
    },

    async acceptNotification(n: AppNotification) {
      if (n.type === 'club_invite' && n.clubId) {
        const q = query(
          collection(db, 'players'),
          where('clubId', '==', n.clubId),
          where('uid', '==', n.uid),
        )
        const snap = await getDocs(q)
        await Promise.all(
          snap.docs.map((d) => updateDoc(doc(db, 'players', d.id), { status: deleteField() })),
        )
        await useClubsStore().addMember(n.clubId, n.uid)
      } else if (n.type === 'match_invite' && n.matchId) {
        const matchId = n.matchId
        const q = query(
          collection(db, 'notifications'),
          where('matchId', '==', matchId),
          where('type', '==', 'match_invite'),
        )
        const snap = await getDocs(q)
        const stillPending = snap.docs.some(
          (d) => d.id !== n.id && (d.data() as AppNotification).status === 'pending',
        )
        if (!stillPending) {
          // The match may have been deleted (e.g. cancelled from the club) before this was accepted.
          try {
            await updateDoc(doc(db, 'matches', matchId), { status: deleteField() })
          } catch {
            /* match no longer exists */
          }
        }
      }
      await this.setNotificationStatus(n.id, 'accepted')
    },

    async declineNotification(n: AppNotification) {
      if (n.type === 'club_invite' && n.clubId) {
        const q = query(
          collection(db, 'players'),
          where('clubId', '==', n.clubId),
          where('uid', '==', n.uid),
        )
        const snap = await getDocs(q)
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'players', d.id))))
      } else if (n.type === 'match_invite' && n.matchId) {
        try {
          await updateDoc(doc(db, 'matches', n.matchId), { status: 'cancelled' })
        } catch {
          /* match no longer exists */
        }
      }
      await this.setNotificationStatus(n.id, 'declined')
    },

    async setNotificationStatus(id: string, status: 'accepted' | 'declined') {
      const respondedAt = Date.now()
      await updateDoc(doc(db, 'notifications', id), { status, respondedAt })
      const idx = this.notifications.findIndex((n) => n.id === id)
      if (idx !== -1) this.notifications[idx] = { ...this.notifications[idx]!, status, respondedAt }
    },
  },
})
