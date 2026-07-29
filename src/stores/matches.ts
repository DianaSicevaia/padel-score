import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  runTransaction,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'
import { usePlayersStore } from '@/stores/players'
import type { Player } from '@/stores/players'
import { useUsersStore, START_RATING as USER_START_RATING } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useClubsStore } from '@/stores/clubs'
import { useNotificationsStore } from '@/stores/notifications'

export interface MatchPlayerSnapshot {
  playerId: string
  rating: number
  matchesPlayed: number
  wins: number
  losses: number
}

export interface MatchSet {
  scoreA: number
  scoreB: number
}

export interface StandaloneParticipant {
  uid?: string
  name: string
  isOpen?: boolean
}

export const OPEN_SLOT_ID = 'open'

export interface Match {
  id: string
  clubId?: string
  teamA: string[]
  teamB: string[]
  teamANames?: string[]
  teamBNames?: string[]
  sets?: MatchSet[]
  scoreA: number
  scoreB: number
  winnerTeam?: 'A' | 'B'
  scheduledAt?: number
  createdAt: number
  before?: MatchPlayerSnapshot[]
  participantUids?: string[]
  status?: 'pending' | 'cancelled'
  createdBy?: string
  hasOpenSlot?: boolean
  pendingUids?: string[]
}

interface MatchesState {
  matches: Match[]
  allMatches: Match[]
  standaloneMatches: Match[]
  openMatches: Match[]
  loading: boolean
  allLoading: boolean
  standaloneLoading: boolean
  openLoading: boolean
}

const K = 32
const START_RATING = 1000

function expectedScore(myAvg: number, oppAvg: number): number {
  return 1 / (1 + Math.pow(10, (oppAvg - myAvg) / 400))
}

function computeEloUpdates(players: Player[], myAvg: number, oppAvg: number, won: boolean) {
  const exp = expectedScore(myAvg, oppAvg)
  const actual = won ? 1 : 0
  return players.map((p) => ({
    id: p.id,
    rating: Math.max(100, Math.round((p.rating || START_RATING) + K * (actual - exp))),
    matchesPlayed: p.matchesPlayed + 1,
    wins: p.wins + (won ? 1 : 0),
    losses: p.losses + (won ? 0 : 1),
  }))
}

function snapshotPlayers(players: Player[]): MatchPlayerSnapshot[] {
  return players.map((p) => ({
    playerId: p.id,
    rating: p.rating,
    matchesPlayed: p.matchesPlayed,
    wins: p.wins,
    losses: p.losses,
  }))
}

// Old snapshots stored player name as playerId — resolve by id first, then by name
function resolveSnapshotUpdates(
  before: MatchPlayerSnapshot[],
  players: Player[],
) {
  return before.flatMap((s) => {
    const player = players.find((p) => p.id === s.playerId) ?? players.find((p) => p.name === s.playerId)
    if (!player) return []
    return [{ id: player.id, rating: s.rating, matchesPlayed: s.matchesPlayed, wins: s.wins, losses: s.losses }]
  })
}

export const useMatchesStore = defineStore('matches', {
  state: (): MatchesState => ({
    matches: [],
    allMatches: [],
    standaloneMatches: [],
    openMatches: [],
    loading: false,
    allLoading: false,
    standaloneLoading: false,
    openLoading: false,
  }),

  actions: {
    // Live-subscribes to a single club's matches.
    subscribeMatches(clubId: string): Unsubscribe {
      this.loading = true
      const q = query(collection(db, 'matches'), where('clubId', '==', clubId))
      return onSnapshot(q, (snapshot) => {
        this.matches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
        this.loading = false
      })
    },

    // Live-subscribes to matches across every club the user belongs to.
    subscribeAllMatches(clubIds: string[]): Unsubscribe {
      if (!clubIds.length) {
        this.allMatches = []
        return () => {}
      }
      this.allLoading = true
      const q = query(collection(db, 'matches'), where('clubId', 'in', clubIds))
      return onSnapshot(q, (snapshot) => {
        this.allMatches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
        this.allLoading = false
      })
    },

    // Live-subscribes to matches the user directly participates in (used for
    // standalone/no-club matches, and matches in clubs they haven't joined).
    subscribeStandaloneMatches(uid: string): Unsubscribe {
      this.standaloneLoading = true
      const q = query(collection(db, 'matches'), where('participantUids', 'array-contains', uid))
      return onSnapshot(q, (snapshot) => {
        this.standaloneMatches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
        this.standaloneLoading = false
      })
    },

    // One-off lookup for a single match by id (e.g. the "Play now" flow,
    // which just needs a snapshot to prefill a form, not a live view).
    async fetchMatchById(matchId: string): Promise<Match | null> {
      const snap = await getDoc(doc(db, 'matches', matchId))
      return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Match, 'id'>) } : null
    },

    async createStandaloneMatch(
      teamA: StandaloneParticipant[],
      teamB: StandaloneParticipant[],
      sets: MatchSet[],
      creatorUid: string,
      winnerOverride?: 'A' | 'B',
    ) {
      const usersStore = useUsersStore()
      const allParticipants = [...teamA, ...teamB]
      const uids = allParticipants.map((p) => p.uid).filter((u): u is string => !!u)
      const userProfiles = await usersStore.getUsersByUid(uids)
      const ratingOf = (p: StandaloneParticipant) =>
        (p.uid ? userProfiles.find((u) => u.uid === p.uid)?.rating : undefined) ?? USER_START_RATING

      const genGuestId = () => `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const idOf = (p: StandaloneParticipant) => p.uid ?? genGuestId()

      const teamAIds = teamA.map(idOf)
      const teamBIds = teamB.map(idOf)
      const teamANames = teamA.map((p) => p.name)
      const teamBNames = teamB.map((p) => p.name)

      const avgRating = (arr: StandaloneParticipant[]) =>
        arr.reduce((s, p) => s + ratingOf(p), 0) / arr.length
      const avgA = avgRating(teamA)
      const avgB = avgRating(teamB)
      const scoreA = sets.filter((s) => s.scoreA > s.scoreB).length
      const scoreB = sets.filter((s) => s.scoreB > s.scoreA).length
      const winnerTeam: 'A' | 'B' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

      const toPseudoPlayer = (p: StandaloneParticipant): Player => {
        const profile = p.uid ? userProfiles.find((u) => u.uid === p.uid) : undefined
        return {
          id: p.uid ?? '',
          clubId: '',
          name: p.name,
          rating: profile?.rating ?? USER_START_RATING,
          matchesPlayed: profile?.matchesPlayed ?? 0,
          wins: profile?.wins ?? 0,
          losses: profile?.losses ?? 0,
          createdAt: 0,
        }
      }

      const registeredA = teamA.filter((p) => p.uid).map(toPseudoPlayer)
      const registeredB = teamB.filter((p) => p.uid).map(toPseudoPlayer)

      const statsUpdates = [
        ...computeEloUpdates(registeredA, avgA, avgB, winnerTeam === 'A'),
        ...computeEloUpdates(registeredB, avgB, avgA, winnerTeam === 'B'),
      ]

      const before: MatchPlayerSnapshot[] = [...registeredA, ...registeredB].map((p) => ({
        playerId: p.id,
        rating: p.rating,
        matchesPlayed: p.matchesPlayed,
        wins: p.wins,
        losses: p.losses,
      }))

      const participantUids = Array.from(new Set([...uids, creatorUid]))

      const now = Date.now()
      const matchData: Omit<Match, 'id'> = {
        teamA: teamAIds,
        teamB: teamBIds,
        teamANames,
        teamBNames,
        sets,
        scoreA,
        scoreB,
        winnerTeam,
        createdAt: now,
        before,
        participantUids,
      }

      const docRef = await addDoc(collection(db, 'matches'), matchData)
      this.standaloneMatches.unshift({ id: docRef.id, ...matchData })

      const uidUpdates = statsUpdates.map((u) => ({
        uid: u.id,
        rating: u.rating,
        matchesPlayed: u.matchesPlayed,
        wins: u.wins,
        losses: u.losses,
      }))
      if (uidUpdates.length) await usersStore.applyMatchResult(uidUpdates)
    },

    async createMatch(
      clubId: string,
      teamA: string[],
      teamB: string[],
      sets: MatchSet[],
      winnerOverride?: 'A' | 'B',
    ) {
      const playersStore = usePlayersStore()
      const resolve = (id: string) => playersStore.players.find((p) => p.id === id)!

      const playersA = teamA.map(resolve)
      const playersB = teamB.map(resolve)
      const avgRating = (arr: Player[]) =>
        arr.reduce((s, p) => s + (p.rating || START_RATING), 0) / arr.length

      const before = snapshotPlayers([...playersA, ...playersB])
      const teamANames = playersA.map((p) => p.name)
      const teamBNames = playersB.map((p) => p.name)

      const avgA = avgRating(playersA)
      const avgB = avgRating(playersB)
      const scoreA = sets.filter((s) => s.scoreA > s.scoreB).length
      const scoreB = sets.filter((s) => s.scoreB > s.scoreA).length
      const winnerTeam: 'A' | 'B' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

      const statsUpdates = [
        ...computeEloUpdates(playersA, avgA, avgB, winnerTeam === 'A'),
        ...computeEloUpdates(playersB, avgB, avgA, winnerTeam === 'B'),
      ]

      const participantUids = Array.from(
        new Set([...playersA, ...playersB].map((p) => p.uid).filter((u): u is string => !!u)),
      )

      const now = Date.now()
      const matchData: Omit<Match, 'id'> = {
        clubId,
        teamA,
        teamB,
        teamANames,
        teamBNames,
        sets,
        scoreA,
        scoreB,
        winnerTeam,
        createdAt: now,
        before,
        ...(participantUids.length ? { participantUids } : {}),
      }

      const docRef = await addDoc(collection(db, 'matches'), matchData)
      this.matches.unshift({ id: docRef.id, ...matchData })

      await playersStore.applyMatchResult(statsUpdates)
    },

    async deleteMatch(matchId: string) {
      const match = this.matches.find((m) => m.id === matchId)
      if (!match) return

      const playersStore = usePlayersStore()

      if (match.before) {
        const restoreUpdates = resolveSnapshotUpdates(match.before, playersStore.players)
        if (restoreUpdates.length) await playersStore.applyMatchResult(restoreUpdates)
      }

      await deleteDoc(doc(db, 'matches', matchId))
      this.matches = this.matches.filter((m) => m.id !== matchId)
    },

    async updateMatch(
      matchId: string,
      teamA: string[],
      teamB: string[],
      sets: MatchSet[],
      winnerOverride?: 'A' | 'B',
    ) {
      const match = this.matches.find((m) => m.id === matchId)
      if (!match) return

      const playersStore = usePlayersStore()

      if (match.before) {
        const restoreUpdates = resolveSnapshotUpdates(match.before, playersStore.players)
        if (restoreUpdates.length) await playersStore.applyMatchResult(restoreUpdates)
      }

      const resolve = (id: string) => playersStore.players.find((p) => p.id === id)!
      const playersA = teamA.map(resolve)
      const playersB = teamB.map(resolve)

      const before = snapshotPlayers([...playersA, ...playersB])
      const teamANames = playersA.map((p) => p.name)
      const teamBNames = playersB.map((p) => p.name)

      const avgRating = (arr: Player[]) =>
        arr.reduce((s, p) => s + (p.rating || START_RATING), 0) / arr.length
      const avgA = avgRating(playersA)
      const avgB = avgRating(playersB)
      const scoreA = sets.filter((s) => s.scoreA > s.scoreB).length
      const scoreB = sets.filter((s) => s.scoreB > s.scoreA).length
      const winnerTeam: 'A' | 'B' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

      const statsUpdates = [
        ...computeEloUpdates(playersA, avgA, avgB, winnerTeam === 'A'),
        ...computeEloUpdates(playersB, avgB, avgA, winnerTeam === 'B'),
      ]

      const participantUids = Array.from(
        new Set([...playersA, ...playersB].map((p) => p.uid).filter((u): u is string => !!u)),
      )

      await updateDoc(doc(db, 'matches', matchId), {
        teamA,
        teamB,
        teamANames,
        teamBNames,
        sets,
        scoreA,
        scoreB,
        winnerTeam,
        before,
        participantUids,
      })

      await playersStore.applyMatchResult(statsUpdates)

      const idx = this.matches.findIndex((m) => m.id === matchId)
      if (idx !== -1) {
        this.matches[idx] = {
          ...this.matches[idx]!,
          teamA,
          teamB,
          teamANames,
          teamBNames,
          sets,
          scoreA,
          scoreB,
          winnerTeam,
          participantUids,
          before,
        }
      }
    },

    async createScheduledMatch(
      clubId: string,
      teamAIds: string[],
      teamBIds: string[],
      scheduledAt: number,
    ) {
      const playersStore = usePlayersStore()
      const authStore = useAuthStore()
      const resolve = (id: string) => playersStore.players.find((p) => p.id === id)
      const teamANames = teamAIds.map(id => resolve(id)?.name ?? id)
      const teamBNames = teamBIds.map(id => resolve(id)?.name ?? id)

      const currentUid = authStore.user?.uid
      const resolvedPlayers = [...teamAIds, ...teamBIds]
        .map(resolve)
        .filter((p): p is Player => !!p?.uid)
      const inviteeUids = Array.from(
        new Set(resolvedPlayers.filter((p) => p.uid !== currentUid).map((p) => p.uid!)),
      )
      const participantUids = Array.from(new Set(resolvedPlayers.map((p) => p.uid!)))

      const now = Date.now()
      const matchData: Omit<Match, 'id'> = {
        clubId,
        teamA: teamAIds,
        teamB: teamBIds,
        teamANames,
        teamBNames,
        sets: [],
        scoreA: 0,
        scoreB: 0,
        scheduledAt,
        createdAt: now,
        ...(participantUids.length ? { participantUids } : {}),
        ...(inviteeUids.length ? { status: 'pending' as const, pendingUids: inviteeUids } : {}),
        ...(currentUid ? { createdBy: currentUid } : {}),
      }
      const docRef = await addDoc(collection(db, 'matches'), matchData)
      this.matches.unshift({ id: docRef.id, ...matchData })

      if (inviteeUids.length) {
        const clubName = useClubsStore().clubs.find((c) => c.id === clubId)?.name ?? 'a club'
        await useNotificationsStore().createMatchInviteNotifications(
          inviteeUids,
          clubId,
          clubName,
          docRef.id,
          `${teamANames.join(' & ')} vs ${teamBNames.join(' & ')}`,
          scheduledAt,
        )
      }
    },

    async createStandaloneScheduledMatch(
      teamA: StandaloneParticipant[],
      teamB: StandaloneParticipant[],
      scheduledAt: number,
      creatorUid: string,
    ) {
      const genGuestId = () => `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const idOf = (p: StandaloneParticipant) => (p.isOpen ? OPEN_SLOT_ID : (p.uid ?? genGuestId()))
      const nameOf = (p: StandaloneParticipant) => (p.isOpen ? 'Open slot' : p.name)

      const teamAIds = teamA.map(idOf)
      const teamBIds = teamB.map(idOf)
      const teamANames = teamA.map(nameOf)
      const teamBNames = teamB.map(nameOf)

      const allParticipants = [...teamA, ...teamB]
      const allUids = allParticipants.map((p) => p.uid).filter((u): u is string => !!u)
      const participantUids = Array.from(new Set([...allUids, creatorUid]))
      const inviteeUids = Array.from(
        new Set(allUids.filter((uid) => uid !== creatorUid)),
      )
      const hasOpenSlot = [...teamAIds, ...teamBIds].includes(OPEN_SLOT_ID)

      const now = Date.now()
      const matchData: Omit<Match, 'id'> = {
        teamA: teamAIds,
        teamB: teamBIds,
        teamANames,
        teamBNames,
        sets: [],
        scoreA: 0,
        scoreB: 0,
        scheduledAt,
        createdAt: now,
        participantUids,
        createdBy: creatorUid,
        hasOpenSlot,
        ...(inviteeUids.length ? { status: 'pending' as const, pendingUids: inviteeUids } : {}),
      }
      const docRef = await addDoc(collection(db, 'matches'), matchData)
      this.standaloneMatches.unshift({ id: docRef.id, ...matchData })

      if (inviteeUids.length) {
        await useNotificationsStore().createMatchInviteNotifications(
          inviteeUids,
          undefined,
          'a standalone match',
          docRef.id,
          `${teamANames.join(' & ')} vs ${teamBNames.join(' & ')}`,
          scheduledAt,
        )
      }
    },

    // Live-subscribes to matches anyone can still join.
    subscribeOpenMatches(excludeUid?: string): Unsubscribe {
      this.openLoading = true
      const q = query(collection(db, 'matches'), where('hasOpenSlot', '==', true))
      return onSnapshot(q, (snapshot) => {
        const now = Date.now()
        this.openMatches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .filter(
            (m) =>
              !!m.scheduledAt &&
              m.scheduledAt > now &&
              !m.winnerTeam &&
              m.status !== 'cancelled' &&
              (!excludeUid || !m.participantUids?.includes(excludeUid)),
          )
          .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))
        this.openLoading = false
      })
    },

    async joinOpenSlot(matchId: string, side: 'A' | 'B', joinerUid: string, joinerName: string) {
      const matchRef = doc(db, 'matches', matchId)
      let updated: Match | null = null

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef)
        if (!snap.exists()) throw new Error('Match not found')
        const data = snap.data() as Omit<Match, 'id'>

        const teamKey = side === 'A' ? 'teamA' : 'teamB'
        const namesKey = side === 'A' ? 'teamANames' : 'teamBNames'
        const team = [...data[teamKey]]
        const names = [...(data[namesKey] ?? team)]
        const idx = team.indexOf(OPEN_SLOT_ID)
        if (idx === -1) throw new Error('No open slot on that side')

        team[idx] = joinerUid
        names[idx] = joinerName
        const participantUids = Array.from(new Set([...(data.participantUids ?? []), joinerUid]))
        const hasOpenSlot = [
          ...(side === 'A' ? team : data.teamA),
          ...(side === 'B' ? team : data.teamB),
        ].includes(OPEN_SLOT_ID)

        const updates = {
          [teamKey]: team,
          [namesKey]: names,
          participantUids,
          hasOpenSlot,
        }
        tx.update(matchRef, updates)
        updated = { id: matchId, ...data, ...updates } as Match
      })

      if (updated) {
        const stillOpen: Match = updated
        if (stillOpen.hasOpenSlot) {
          const idx = this.openMatches.findIndex((m) => m.id === matchId)
          if (idx !== -1) this.openMatches[idx] = stillOpen
        } else {
          this.openMatches = this.openMatches.filter((m) => m.id !== matchId)
        }
        for (const arr of [this.matches, this.standaloneMatches]) {
          const idx = arr.findIndex((m) => m.id === matchId)
          if (idx !== -1) arr[idx] = stillOpen
        }
      }
    },

    async updateMatchSchedule(matchId: string, scheduledAt: number) {
      await updateDoc(doc(db, 'matches', matchId), { scheduledAt })
      for (const arr of [this.matches, this.standaloneMatches]) {
        const idx = arr.findIndex((m) => m.id === matchId)
        if (idx !== -1) arr[idx] = { ...arr[idx]!, scheduledAt }
      }
    },

    async cancelScheduledMatch(matchId: string) {
      await deleteDoc(doc(db, 'matches', matchId))
      this.matches = this.matches.filter((m) => m.id !== matchId)
      this.standaloneMatches = this.standaloneMatches.filter((m) => m.id !== matchId)
    },
  },
})
