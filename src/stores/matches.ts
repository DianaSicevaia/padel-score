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
  deleteField,
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
import { ELO_K, ELO_START_RATING, expectedScore, outcomeActual } from '@/utils/elo'
import type { MatchOutcome } from '@/utils/elo'

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

// 'friendly' matches are recorded but never touch anyone's rating/W-L record.
// 'competitive' matches always do; 'ranked' vs 'open' is purely a label for
// now (who the organizer is hoping to attract), not an enforced join filter.
export type MatchFormat = 'competitive' | 'friendly'
export type CompetitiveScope = 'ranked' | 'open'

// Same as competitiveScope: a label for who the organizer is hoping to play
// with, not an enforced join filter.
export type GenderPreference = 'mixed' | 'men' | 'women'

export interface ScheduleDetails {
  durationMinutes?: number
  matchFormat?: MatchFormat
  competitiveScope?: CompetitiveScope
  rankMin?: number
  rankMax?: number
  city?: string
  court?: string
  genderPreference?: GenderPreference
}

export interface Match extends ScheduleDetails {
  id: string
  clubId?: string
  teamA: string[]
  teamB: string[]
  teamANames?: string[]
  teamBNames?: string[]
  sets?: MatchSet[]
  scoreA: number
  scoreB: number
  winnerTeam?: 'A' | 'B' | 'draw'
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

const START_RATING = ELO_START_RATING

// Draws don't move wins/losses, only matchesPlayed and rating (see
// utils/elo.ts for the actual formula, shared with tournament scoring).
function computeEloUpdates(
  players: Player[],
  myAvg: number,
  oppAvg: number,
  outcome: MatchOutcome,
) {
  const exp = expectedScore(myAvg, oppAvg)
  const actual = outcomeActual(outcome)
  return players.map((p) => ({
    id: p.id,
    rating: Math.max(100, Math.round((p.rating || START_RATING) + ELO_K * (actual - exp))),
    matchesPlayed: p.matchesPlayed + 1,
    wins: p.wins + (outcome === 'win' ? 1 : 0),
    losses: p.losses + (outcome === 'loss' ? 1 : 0),
  }))
}

function outcomeForSide(winnerTeam: 'A' | 'B' | 'draw', side: 'A' | 'B'): MatchOutcome {
  if (winnerTeam === 'draw') return 'draw'
  return winnerTeam === side ? 'win' : 'loss'
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

// Firestore rejects `undefined` field values, so strip any unset optional
// schedule details before writing.
function cleanDetails(details?: ScheduleDetails): ScheduleDetails {
  if (!details) return {}
  return Object.fromEntries(
    Object.entries(details).filter(([, v]) => v !== undefined),
  ) as ScheduleDetails
}

export function buildScheduleDetails(input: {
  durationMinutes: number
  matchFormat: MatchFormat
  competitiveScope: CompetitiveScope
  rankMin: number
  rankMax: number
  city: string
  court: string
  genderPreference: GenderPreference
}): ScheduleDetails {
  const isRanked = input.matchFormat === 'competitive' && input.competitiveScope === 'ranked'
  return cleanDetails({
    durationMinutes: input.durationMinutes,
    matchFormat: input.matchFormat,
    ...(input.matchFormat === 'competitive' ? { competitiveScope: input.competitiveScope } : {}),
    ...(isRanked ? { rankMin: input.rankMin, rankMax: input.rankMax } : {}),
    ...(input.city ? { city: input.city } : {}),
    ...(input.court ? { court: input.court } : {}),
    ...(input.genderPreference !== 'mixed' ? { genderPreference: input.genderPreference } : {}),
  })
}

// Old snapshots stored player name as playerId — resolve by id first, then by name
function resolveSnapshotUpdates(before: MatchPlayerSnapshot[], players: Player[]) {
  return before.flatMap((s) => {
    const player =
      players.find((p) => p.id === s.playerId) ?? players.find((p) => p.name === s.playerId)
    if (!player) return []
    return [
      {
        id: player.id,
        rating: s.rating,
        matchesPlayed: s.matchesPlayed,
        wins: s.wins,
        losses: s.losses,
      },
    ]
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
      winnerOverride?: 'A' | 'B' | 'draw',
      matchFormat?: MatchFormat,
    ) {
      const isFriendly = matchFormat === 'friendly'
      const usersStore = useUsersStore()
      const allParticipants = [...teamA, ...teamB]
      const uids = allParticipants.map((p) => p.uid).filter((u): u is string => !!u)
      const userProfiles = await usersStore.getUsersByUid(uids)
      const ratingOf = (p: StandaloneParticipant) =>
        (p.uid ? userProfiles.find((u) => u.uid === p.uid)?.rating : undefined) ?? USER_START_RATING

      const genGuestId = () =>
        `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
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
      const winnerTeam: 'A' | 'B' | 'draw' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

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

      // Friendly matches are recorded (for history) but never touch anyone's
      // rating or W/L record.
      const statsUpdates = isFriendly
        ? []
        : [
            ...computeEloUpdates(registeredA, avgA, avgB, outcomeForSide(winnerTeam, 'A')),
            ...computeEloUpdates(registeredB, avgB, avgA, outcomeForSide(winnerTeam, 'B')),
          ]

      const before: MatchPlayerSnapshot[] = isFriendly
        ? []
        : [...registeredA, ...registeredB].map((p) => ({
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
        createdBy: creatorUid,
        ...(matchFormat ? { matchFormat } : {}),
      }

      await addDoc(collection(db, 'matches'), matchData)

      const uidUpdates = statsUpdates.map((u) => ({
        uid: u.id,
        rating: u.rating,
        matchesPlayed: u.matchesPlayed,
        wins: u.wins,
        losses: u.losses,
      }))
      if (uidUpdates.length) await usersStore.applyMatchResult(uidUpdates)
    },

    async updateStandaloneMatch(
      matchId: string,
      teamA: StandaloneParticipant[],
      teamB: StandaloneParticipant[],
      sets: MatchSet[],
      winnerOverride?: 'A' | 'B' | 'draw',
      matchFormat?: MatchFormat,
    ) {
      const match = this.standaloneMatches.find((m) => m.id === matchId)
      if (!match) return

      const usersStore = useUsersStore()
      const isFriendly = matchFormat === 'friendly'

      if (match.before?.length) {
        const restoreUpdates = match.before.map((s) => ({
          uid: s.playerId,
          rating: s.rating,
          matchesPlayed: s.matchesPlayed,
          wins: s.wins,
          losses: s.losses,
        }))
        await usersStore.applyMatchResult(restoreUpdates)
      }

      const allParticipants = [...teamA, ...teamB]
      const uids = allParticipants.map((p) => p.uid).filter((u): u is string => !!u)
      const userProfiles = await usersStore.getUsersByUid(uids)
      const ratingOf = (p: StandaloneParticipant) =>
        (p.uid ? userProfiles.find((u) => u.uid === p.uid)?.rating : undefined) ?? USER_START_RATING

      const genGuestId = () =>
        `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
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
      const winnerTeam: 'A' | 'B' | 'draw' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

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

      const statsUpdates = isFriendly
        ? []
        : [
            ...computeEloUpdates(registeredA, avgA, avgB, outcomeForSide(winnerTeam, 'A')),
            ...computeEloUpdates(registeredB, avgB, avgA, outcomeForSide(winnerTeam, 'B')),
          ]

      const before: MatchPlayerSnapshot[] = isFriendly
        ? []
        : [...registeredA, ...registeredB].map((p) => ({
            playerId: p.id,
            rating: p.rating,
            matchesPlayed: p.matchesPlayed,
            wins: p.wins,
            losses: p.losses,
          }))

      const participantUids = Array.from(
        new Set([...uids, ...(match.createdBy ? [match.createdBy] : [])]),
      )

      await updateDoc(doc(db, 'matches', matchId), {
        teamA: teamAIds,
        teamB: teamBIds,
        teamANames,
        teamBNames,
        sets,
        scoreA,
        scoreB,
        winnerTeam,
        before,
        participantUids,
        ...(matchFormat ? { matchFormat } : {}),
      })

      const uidUpdates = statsUpdates.map((u) => ({
        uid: u.id,
        rating: u.rating,
        matchesPlayed: u.matchesPlayed,
        wins: u.wins,
        losses: u.losses,
      }))
      if (uidUpdates.length) await usersStore.applyMatchResult(uidUpdates)

      const idx = this.standaloneMatches.findIndex((m) => m.id === matchId)
      if (idx !== -1) {
        this.standaloneMatches[idx] = {
          ...this.standaloneMatches[idx]!,
          teamA: teamAIds,
          teamB: teamBIds,
          teamANames,
          teamBNames,
          sets,
          scoreA,
          scoreB,
          winnerTeam,
          before,
          participantUids,
          ...(matchFormat ? { matchFormat } : {}),
        }
      }
    },

    // Deletes an already-played standalone (no-club) match and undoes the
    // rating/W-L effect it had, mirroring deleteMatch's club-side behavior.
    async deleteStandaloneMatch(matchId: string) {
      const match = this.standaloneMatches.find((m) => m.id === matchId)
      if (!match) return

      const usersStore = useUsersStore()

      if (match.before?.length) {
        const restoreUpdates = match.before.map((s) => ({
          uid: s.playerId,
          rating: s.rating,
          matchesPlayed: s.matchesPlayed,
          wins: s.wins,
          losses: s.losses,
        }))
        await usersStore.applyMatchResult(restoreUpdates)
      }

      await deleteDoc(doc(db, 'matches', matchId))
      this.standaloneMatches = this.standaloneMatches.filter((m) => m.id !== matchId)
      this.openMatches = this.openMatches.filter((m) => m.id !== matchId)
    },

    async createMatch(
      clubId: string,
      teamA: string[],
      teamB: string[],
      sets: MatchSet[],
      winnerOverride?: 'A' | 'B' | 'draw',
      matchFormat?: MatchFormat,
    ) {
      const isFriendly = matchFormat === 'friendly'
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
      const winnerTeam: 'A' | 'B' | 'draw' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

      // Friendly matches are recorded (for history) but never touch anyone's
      // rating or W/L record.
      const statsUpdates = isFriendly
        ? []
        : [
            ...computeEloUpdates(playersA, avgA, avgB, outcomeForSide(winnerTeam, 'A')),
            ...computeEloUpdates(playersB, avgB, avgA, outcomeForSide(winnerTeam, 'B')),
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
        before: isFriendly ? [] : before,
        ...(participantUids.length ? { participantUids } : {}),
        ...(matchFormat ? { matchFormat } : {}),
      }

      await addDoc(collection(db, 'matches'), matchData)

      if (statsUpdates.length) await playersStore.applyMatchResult(statsUpdates)
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
      winnerOverride?: 'A' | 'B' | 'draw',
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
      const winnerTeam: 'A' | 'B' | 'draw' = winnerOverride ?? (scoreA > scoreB ? 'A' : 'B')

      const statsUpdates = [
        ...computeEloUpdates(playersA, avgA, avgB, outcomeForSide(winnerTeam, 'A')),
        ...computeEloUpdates(playersB, avgB, avgA, outcomeForSide(winnerTeam, 'B')),
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
      details?: ScheduleDetails,
    ) {
      const playersStore = usePlayersStore()
      const authStore = useAuthStore()
      const resolve = (id: string) => playersStore.players.find((p) => p.id === id)
      const teamANames = teamAIds.map((id) => resolve(id)?.name ?? id)
      const teamBNames = teamBIds.map((id) => resolve(id)?.name ?? id)

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
        ...cleanDetails(details),
      }

      const docRef = await addDoc(collection(db, 'matches'), matchData)

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
      details?: ScheduleDetails,
    ) {
      const genGuestId = () =>
        `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      const idOf = (p: StandaloneParticipant) => (p.isOpen ? OPEN_SLOT_ID : (p.uid ?? genGuestId()))
      const nameOf = (p: StandaloneParticipant) => (p.isOpen ? 'Open slot' : p.name)

      const teamAIds = teamA.map(idOf)
      const teamBIds = teamB.map(idOf)
      const teamANames = teamA.map(nameOf)
      const teamBNames = teamB.map(nameOf)

      const allParticipants = [...teamA, ...teamB]
      const allUids = allParticipants.map((p) => p.uid).filter((u): u is string => !!u)
      const participantUids = Array.from(new Set([...allUids, creatorUid]))
      const inviteeUids = Array.from(new Set(allUids.filter((uid) => uid !== creatorUid)))
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
        ...cleanDetails(details),
        ...(inviteeUids.length ? { status: 'pending' as const, pendingUids: inviteeUids } : {}),
      }

      const docRef = await addDoc(collection(db, 'matches'), matchData)

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

        if (stillOpen.createdBy && stillOpen.createdBy !== joinerUid) {
          const label = `${(stillOpen.teamANames ?? stillOpen.teamA).join(' & ')} vs ${(stillOpen.teamBNames ?? stillOpen.teamB).join(' & ')}`
          await useNotificationsStore().createMatchRosterNotification(
            stillOpen.createdBy,
            'match_joined',
            matchId,
            label,
            stillOpen.scheduledAt ?? Date.now(),
            joinerName,
          )
        }
      }
    },

    // Vacates a claimed slot — either the match creator removing a player who
    // self-joined (didn't like the look of their profile), or a player
    // removing themselves after joining by mistake. `actorUid` is whoever
    // triggered the removal; `targetUid` is whoever's slot gets vacated.
    // Mirrors declineNotification's own-choice version of this, rather than
    // cancelling the whole match.
    async removeFromSlot(matchId: string, targetUid: string, actorUid: string) {
      const matchRef = doc(db, 'matches', matchId)
      const snap = await getDoc(matchRef)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Match, 'id'>

      const teamA = [...data.teamA]
      const teamB = [...data.teamB]
      const teamANames = [...(data.teamANames ?? teamA)]
      const teamBNames = [...(data.teamBNames ?? teamB)]
      let changed = false
      let removedName = ''

      const idxA = teamA.indexOf(targetUid)
      if (idxA !== -1) {
        removedName = teamANames[idxA] ?? ''
        teamA[idxA] = OPEN_SLOT_ID
        teamANames[idxA] = 'Open slot'
        changed = true
      }
      const idxB = teamB.indexOf(targetUid)
      if (idxB !== -1) {
        removedName = teamBNames[idxB] ?? ''
        teamB[idxB] = OPEN_SLOT_ID
        teamBNames[idxB] = 'Open slot'
        changed = true
      }
      if (!changed) return

      const participantUids = (data.participantUids ?? []).filter((u) => u !== targetUid)
      const pendingUids = (data.pendingUids ?? []).filter((u) => u !== targetUid)
      const updates = {
        teamA,
        teamB,
        teamANames,
        teamBNames,
        participantUids,
        pendingUids,
        hasOpenSlot: true,
        ...(pendingUids.length ? {} : { status: deleteField() }),
      }
      await updateDoc(matchRef, updates)

      const updated = { id: matchId, ...data, ...updates } as Match
      for (const arr of [this.matches, this.standaloneMatches]) {
        const idx = arr.findIndex((m) => m.id === matchId)
        if (idx !== -1) arr[idx] = updated
      }
      const openIdx = this.openMatches.findIndex((m) => m.id === matchId)
      if (openIdx !== -1) this.openMatches[openIdx] = updated

      // Only notify the organizer when someone left on their own — if the
      // organizer did the removing, they already know.
      const isSelfLeave = actorUid === targetUid
      if (isSelfLeave && data.createdBy && data.createdBy !== targetUid) {
        const label = `${teamANames.join(' & ')} vs ${teamBNames.join(' & ')}`
        await useNotificationsStore().createMatchRosterNotification(
          data.createdBy,
          'match_left',
          matchId,
          label,
          data.scheduledAt ?? Date.now(),
          removedName || 'A player',
        )
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
