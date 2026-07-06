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
} from 'firebase/firestore'
import { db } from '@/firebase'
import { usePlayersStore } from '@/stores/players'
import type { Player } from '@/stores/players'
import { useUsersStore, START_RATING as USER_START_RATING } from '@/stores/users'

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
}

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
}

interface MatchesState {
  matches: Match[]
  allMatches: Match[]
  standaloneMatches: Match[]
  loading: boolean
  allLoading: boolean
  standaloneLoading: boolean
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
    loading: false,
    allLoading: false,
    standaloneLoading: false,
  }),

  actions: {
    async fetchMatches(clubId: string) {
      this.loading = true
      this.matches = []
      try {
        const q = query(collection(db, 'matches'), where('clubId', '==', clubId))
        const snapshot = await getDocs(q)
        this.matches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
      } finally {
        this.loading = false
      }
    },

    async fetchAllMatches(clubIds: string[]) {
      if (!clubIds.length) {
        this.allMatches = []
        return
      }
      this.allLoading = true
      this.allMatches = []
      try {
        const q = query(collection(db, 'matches'), where('clubId', 'in', clubIds))
        const snapshot = await getDocs(q)
        this.allMatches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
      } finally {
        this.allLoading = false
      }
    },

    async fetchStandaloneMatches(uid: string) {
      this.standaloneLoading = true
      this.standaloneMatches = []
      try {
        const q = query(collection(db, 'matches'), where('participantUids', 'array-contains', uid))
        const snapshot = await getDocs(q)
        this.standaloneMatches = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
      } finally {
        this.standaloneLoading = false
      }
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
      const resolve = (id: string) => playersStore.players.find((p) => p.id === id)
      const teamANames = teamAIds.map(id => resolve(id)?.name ?? id)
      const teamBNames = teamBIds.map(id => resolve(id)?.name ?? id)
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
      }
      const docRef = await addDoc(collection(db, 'matches'), matchData)
      this.matches.unshift({ id: docRef.id, ...matchData })
    },

    async updateMatchSchedule(matchId: string, scheduledAt: number) {
      await updateDoc(doc(db, 'matches', matchId), { scheduledAt })
      const idx = this.matches.findIndex((m) => m.id === matchId)
      if (idx !== -1) this.matches[idx] = { ...this.matches[idx]!, scheduledAt }
    },

    async cancelScheduledMatch(matchId: string) {
      await deleteDoc(doc(db, 'matches', matchId))
      this.matches = this.matches.filter((m) => m.id !== matchId)
    },
  },
})
