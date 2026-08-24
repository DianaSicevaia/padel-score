import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'
import { useClubsStore } from '@/stores/clubs'

export type NotificationType =
  | 'club_invite'
  | 'match_invite'
  | 'match_joined'
  | 'match_left'
  | 'tournament_invite'
// 'info' is for notices that don't need a response (match_joined/match_left)
// unlike 'pending', they're excluded from the unread/action-needed badge.
export type NotificationStatus = 'pending' | 'accepted' | 'declined' | 'info'

export interface AppNotification {
  id: string
  uid: string
  type: NotificationType
  status: NotificationStatus
  clubId?: string
  clubName: string
  matchId?: string
  matchLabel?: string
  tournamentId?: string
  scheduledAt?: number
  createdAt: number
  respondedAt?: number
  actorName?: string
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
    // Live-subscribes to this user's notifications (bell badge + list).
    // Meant to be started once, globally, from App.vue.
    subscribeNotifications(uid: string): Unsubscribe {
      this.loading = true
      const q = query(collection(db, 'notifications'), where('uid', '==', uid))
      return onSnapshot(q, (snapshot) => {
        this.notifications = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
        this.loading = false
      })
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

    async createTournamentInviteNotifications(
      uids: string[],
      tournamentId: string,
      tournamentName: string,
      scheduledAt: number,
    ) {
      await Promise.all(
        uids.map((uid) => {
          const data: Omit<AppNotification, 'id'> = {
            uid,
            type: 'tournament_invite',
            status: 'pending',
            clubName: '',
            tournamentId,
            matchLabel: tournamentName,
            scheduledAt,
            createdAt: Date.now(),
          }
          return addDoc(collection(db, 'notifications'), data)
        }),
      )
    },

    // Informational notice for the match organizer - someone joined or left
    // an open slot on their match. No accept/decline; nothing to respond to.
    async createMatchRosterNotification(
      uid: string,
      type: 'match_joined' | 'match_left',
      matchId: string,
      matchLabel: string,
      scheduledAt: number,
      actorName: string,
    ) {
      const data: Omit<AppNotification, 'id'> = {
        uid,
        type,
        status: 'info',
        clubName: '',
        matchId,
        matchLabel,
        scheduledAt,
        actorName,
        createdAt: Date.now(),
      }
      await addDoc(collection(db, 'notifications'), data)
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
        // The match may have been deleted (e.g. cancelled from the club) before this was accepted.
        try {
          const matchRef = doc(db, 'matches', n.matchId)
          const snap = await getDoc(matchRef)
          if (snap.exists()) {
            const data = snap.data() as { pendingUids?: string[] }
            const pendingUids = (data.pendingUids ?? []).filter((u) => u !== n.uid)
            await updateDoc(matchRef, {
              pendingUids,
              ...(pendingUids.length ? {} : { status: deleteField() }),
            })
          }
        } catch {
          /* match no longer exists */
        }
      } else if (n.type === 'tournament_invite' && n.tournamentId) {
        try {
          const tournamentRef = doc(db, 'tournaments', n.tournamentId)
          const snap = await getDoc(tournamentRef)
          if (snap.exists()) {
            const data = snap.data() as { pendingUids?: string[]; participantUids?: string[] }
            const pendingUids = (data.pendingUids ?? []).filter((u) => u !== n.uid)
            const participantUids = Array.from(new Set([...(data.participantUids ?? []), n.uid]))
            await updateDoc(tournamentRef, { pendingUids, participantUids })
          }
        } catch {
          /* tournament no longer exists */
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
        // Declining a match invite frees up that slot (rather than cancelling
        // the whole match) — 'open' is the sentinel used for unclaimed slots,
        // matching OPEN_SLOT_ID in stores/matches.ts.
        try {
          const matchRef = doc(db, 'matches', n.matchId)
          const snap = await getDoc(matchRef)
          if (snap.exists()) {
            const data = snap.data() as {
              teamA: string[]
              teamB: string[]
              teamANames?: string[]
              teamBNames?: string[]
              participantUids?: string[]
              pendingUids?: string[]
            }
            const teamA = [...data.teamA]
            const teamB = [...data.teamB]
            const teamANames = [...(data.teamANames ?? teamA)]
            const teamBNames = [...(data.teamBNames ?? teamB)]
            let changed = false
            const idxA = teamA.indexOf(n.uid)
            if (idxA !== -1) {
              teamA[idxA] = 'open'
              teamANames[idxA] = 'Open slot'
              changed = true
            }
            const idxB = teamB.indexOf(n.uid)
            if (idxB !== -1) {
              teamB[idxB] = 'open'
              teamBNames[idxB] = 'Open slot'
              changed = true
            }
            if (changed) {
              const participantUids = (data.participantUids ?? []).filter((u) => u !== n.uid)
              const pendingUids = (data.pendingUids ?? []).filter((u) => u !== n.uid)
              await updateDoc(matchRef, {
                teamA,
                teamB,
                teamANames,
                teamBNames,
                participantUids,
                pendingUids,
                hasOpenSlot: true,
                ...(pendingUids.length ? {} : { status: deleteField() }),
              })
            }
          }
        } catch {
          /* match no longer exists */
        }
      } else if (n.type === 'tournament_invite' && n.tournamentId) {
        try {
          const tournamentRef = doc(db, 'tournaments', n.tournamentId)
          const snap = await getDoc(tournamentRef)
          if (snap.exists()) {
            const data = snap.data() as { pendingUids?: string[] }
            const pendingUids = (data.pendingUids ?? []).filter((u) => u !== n.uid)
            await updateDoc(tournamentRef, { pendingUids })
          }
        } catch {
          /* tournament no longer exists */
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
