import { defineStore } from 'pinia'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase'
import type { MatchFormat } from '@/stores/matches'
import { useNotificationsStore } from '@/stores/notifications'
import { usePlayersStore } from '@/stores/players'
import { useUsersStore } from '@/stores/users'
import { generateSchedule } from '@/utils/tournamentScheduler'
import type { ScheduledRound } from '@/utils/tournamentScheduler'
import {
  roundsMin,
  roundsMax,
  roundsStep,
  roundsDefault,
  maxCourtsForParticipants,
} from '@/utils/tournamentRules'
import { computeTournamentRatingUpdates } from '@/utils/tournamentRatings'
import { ELO_START_RATING } from '@/utils/elo'

export type TournamentFormat = 'classic-americano' // only option for now, extensible
export type LeaderboardSort = 'points' | 'wins'
export type TournamentVisibility = 'public' | 'private'
// 'live' = schedule generated, rounds being played and scored.
export type TournamentStatus = 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled'
export type SitOutOption = 'none' | 'third' | 'half' | 'custom'

export interface TournamentGuest {
  id: string
  name: string
}

export interface TournamentMatchup {
  court: number
  team1: [string, string]
  team2: [string, string]
  score1?: number
  score2?: number
}

export interface TournamentRound {
  index: number
  matchups: TournamentMatchup[]
  sitOutIds: string[]
}

export interface Tournament {
  id: string
  name: string
  description?: string
  // When set, this is a club-scoped tournament: roster is drawn exclusively
  // from that club's player list (no invite flow — organizer picks players
  // directly, same trust model as club matches), and competitive results
  // update each player's club rating instead of their global user rating.
  clubId?: string
  format: TournamentFormat
  matchFormat: MatchFormat
  scheduledAt: number
  endAt?: number
  city: string
  court: string
  courtsInPlay: number
  maxParticipants: number
  rounds: number
  pointsPerRound: number | 'unlimited'
  sitOutOption: SitOutOption
  sitOutCustomValue?: number
  leaderboardSort: LeaderboardSort
  visibility: TournamentVisibility
  status: TournamentStatus
  createdBy: string
  creatorParticipates: boolean
  participantUids: string[]
  guests: TournamentGuest[]
  pendingUids: string[]
  createdAt: number
  schedule?: TournamentRound[]
}

export interface CreateTournamentPayload {
  name: string
  description?: string
  clubId?: string
  format: TournamentFormat
  matchFormat: MatchFormat
  scheduledAt: number
  endAt?: number
  city: string
  court: string
  courtsInPlay: number
  maxParticipants: number
  rounds: number
  pointsPerRound: number | 'unlimited'
  sitOutOption: SitOutOption
  sitOutCustomValue?: number
  leaderboardSort: LeaderboardSort
  visibility: TournamentVisibility
  creatorParticipates: boolean
  invitedUids: string[]
  guests: TournamentGuest[]
}

export type UpdateTournamentPayload = Omit<
  CreateTournamentPayload,
  'invitedUids' | 'guests' | 'clubId'
>

interface TournamentsState {
  tournaments: Tournament[]
  loading: boolean
}

export const useTournamentsStore = defineStore('tournaments', {
  state: (): TournamentsState => ({
    tournaments: [],
    loading: false,
  }),

  actions: {
    // Live-subscribes to every public tournament, this user's own (including
    // private drafts), any tournament they've been accepted into as a
    // participant and every tournament that belongs to a club they're in are
    // merged the same way clubs.ts merges owned+member clubs.
    // The view derives "Public" vs "My Tournaments" sections client-side
    // from this one array. `clubIds` is capped at 10 (Firestore 'in' limit).
    subscribeTournaments(uid: string, clubIds: string[] = []): Unsubscribe {
      this.loading = true
      let pub: Tournament[] = []
      let mine: Tournament[] = []
      let playing: Tournament[] = []
      let clubs: Tournament[] = []
      let pubReady = false
      let mineReady = false
      let playingReady = false
      let clubsReady = !clubIds.length

      const merge = () => {
        const seen = new Set<string>()
        const merged: Tournament[] = []
        for (const t of [...pub, ...mine, ...playing, ...clubs]) {
          if (!seen.has(t.id)) {
            seen.add(t.id)
            merged.push(t)
          }
        }
        this.tournaments = merged.sort((a, b) => b.createdAt - a.createdAt)
        if (pubReady && mineReady && playingReady && clubsReady) this.loading = false
      }

      const unsubPublic = onSnapshot(
        query(collection(db, 'tournaments'), where('visibility', '==', 'public')),
        (snap) => {
          pub = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) }))
          pubReady = true
          merge()
        },
      )
      const unsubMine = onSnapshot(
        query(collection(db, 'tournaments'), where('createdBy', '==', uid)),
        (snap) => {
          mine = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) }))
          mineReady = true
          merge()
        },
      )
      const unsubPlaying = onSnapshot(
        query(collection(db, 'tournaments'), where('participantUids', 'array-contains', uid)),
        (snap) => {
          playing = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) }))
          playingReady = true
          merge()
        },
      )
      const unsubClubs = clubIds.length
        ? onSnapshot(
            query(collection(db, 'tournaments'), where('clubId', 'in', clubIds.slice(0, 10))),
            (snap) => {
              clubs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tournament, 'id'>) }))
              clubsReady = true
              merge()
            },
          )
        : null

      return () => {
        unsubPublic()
        unsubMine()
        unsubPlaying()
        unsubClubs?.()
      }
    },

    async createTournament(
      payload: CreateTournamentPayload,
      status: 'draft' | 'upcoming',
      creatorUid: string,
    ) {
      // Club tournaments skip the invite/accept flow entirely.
      // The roster is picked directly from the club's player list.
      // `participantUids` stays empty;
      const isClub = !!payload.clubId
      const participantUids = isClub ? [] : payload.creatorParticipates ? [creatorUid] : []
      const now = Date.now()
      const data: Omit<Tournament, 'id'> = {
        name: payload.name,
        ...(payload.description ? { description: payload.description } : {}),
        ...(payload.clubId ? { clubId: payload.clubId } : {}),
        format: payload.format,
        matchFormat: payload.matchFormat,
        scheduledAt: payload.scheduledAt,
        ...(payload.endAt ? { endAt: payload.endAt } : {}),
        city: payload.city,
        court: payload.court,
        courtsInPlay: payload.courtsInPlay,
        maxParticipants: payload.maxParticipants,
        rounds: payload.rounds,
        pointsPerRound: payload.pointsPerRound,
        sitOutOption: payload.sitOutOption,
        ...(payload.sitOutOption === 'custom' && payload.sitOutCustomValue !== undefined
          ? { sitOutCustomValue: payload.sitOutCustomValue }
          : {}),
        leaderboardSort: payload.leaderboardSort,
        visibility: payload.visibility,
        status,
        createdBy: creatorUid,
        creatorParticipates: payload.creatorParticipates,
        participantUids,
        guests: payload.guests,
        pendingUids: isClub ? [] : payload.invitedUids,
        createdAt: now,
      }

      const docRef = await addDoc(collection(db, 'tournaments'), data)

      if (!isClub && payload.invitedUids.length) {
        await useNotificationsStore().createTournamentInviteNotifications(
          payload.invitedUids,
          docRef.id,
          payload.name,
          payload.scheduledAt,
        )
      }
    },

    // Shared by both "leave" (self) and organizer-initiated "kick"
    // the Firestore mutation is identical either way, only the calling UI differs.
    async removeParticipant(tournamentId: string, uid: string) {
      const ref = doc(db, 'tournaments', tournamentId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Tournament, 'id'>
      const participantUids = (data.participantUids ?? []).filter((u) => u !== uid)
      await updateDoc(ref, { participantUids })
      const idx = this.tournaments.findIndex((t) => t.id === tournamentId)
      if (idx !== -1) this.tournaments[idx] = { ...this.tournaments[idx]!, participantUids }
    },

    async removeGuest(tournamentId: string, guestId: string) {
      const ref = doc(db, 'tournaments', tournamentId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Tournament, 'id'>
      const guests = (data.guests ?? []).filter((g) => g.id !== guestId)
      await updateDoc(ref, { guests })
      const idx = this.tournaments.findIndex((t) => t.id === tournamentId)
      if (idx !== -1) this.tournaments[idx] = { ...this.tournaments[idx]!, guests }
    },

    // Only meaningful while the tournament hasn't started (draft/upcoming)
    // enforced by the views that expose the Edit action, not re-checked here.
    // `myClubPlayer` is only needed (and only used) when editing a club
    // tournament — the organizer's own club Player id/name, so toggling
    // "I'm playing" can add/remove their `guests` entry the same way it
    // adds/removes a uid for a standalone tournament.
    async updateTournament(
      tournamentId: string,
      payload: UpdateTournamentPayload,
      status: 'draft' | 'upcoming',
      creatorUid: string,
      myClubPlayer?: { id: string; name: string },
    ) {
      const ref = doc(db, 'tournaments', tournamentId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Tournament, 'id'>

      // Toggling "I'm playing" during an edit adds/removes the organizer's
      // own entry from the roster, same as it does at creation time.
      let participantUids = data.participantUids ?? []
      let guests = data.guests ?? []
      if (data.clubId && myClubPlayer) {
        const isIn = guests.some((g) => g.id === myClubPlayer.id)
        if (payload.creatorParticipates && !isIn) {
          guests = [...guests, { id: myClubPlayer.id, name: myClubPlayer.name }]
        } else if (!payload.creatorParticipates && isIn) {
          guests = guests.filter((g) => g.id !== myClubPlayer.id)
        }
      } else {
        if (payload.creatorParticipates && !participantUids.includes(creatorUid)) {
          participantUids = [...participantUids, creatorUid]
        } else if (!payload.creatorParticipates && participantUids.includes(creatorUid)) {
          participantUids = participantUids.filter((u) => u !== creatorUid)
        }
      }

      const updates = {
        name: payload.name,
        description: payload.description ? payload.description : deleteField(),
        format: payload.format,
        matchFormat: payload.matchFormat,
        scheduledAt: payload.scheduledAt,
        endAt: payload.endAt ? payload.endAt : deleteField(),
        city: payload.city,
        court: payload.court,
        courtsInPlay: payload.courtsInPlay,
        maxParticipants: payload.maxParticipants,
        rounds: payload.rounds,
        pointsPerRound: payload.pointsPerRound,
        sitOutOption: payload.sitOutOption,
        sitOutCustomValue:
          payload.sitOutOption === 'custom' && payload.sitOutCustomValue !== undefined
            ? payload.sitOutCustomValue
            : deleteField(),
        leaderboardSort: payload.leaderboardSort,
        visibility: payload.visibility,
        creatorParticipates: payload.creatorParticipates,
        participantUids,
        guests,
        status,
      }
      await updateDoc(ref, updates)
    },

    // Locks in the roster at this moment, generates the round schedule, and
    // moves the tournament into 'live'. `rosterIds` is passed in by the
    // caller (participantUids + guest ids) rather than looked up here, since
    // guest ids live only on the tournament doc itself, already in hand.
    // courtsInPlay/rounds are re-derived from the *actual* roster size in
    // case fewer people joined than the configured maxParticipants, so the
    // stored values always describe the schedule that was really generated.
    async startTournament(tournamentId: string, rosterIds: string[]) {
      const ref = doc(db, 'tournaments', tournamentId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Tournament, 'id'>

      const n = rosterIds.length
      const effectiveCourts = Math.min(data.courtsInPlay, maxCourtsForParticipants(n))
      const step = roundsStep(n, effectiveCourts)
      const min = roundsMin(n, effectiveCourts)
      const max = roundsMax(n, effectiveCourts)
      const effectiveRounds =
        data.rounds >= min && data.rounds <= max && data.rounds % step === 0
          ? data.rounds
          : roundsDefault(n, effectiveCourts)

      const schedule = generateSchedule(
        rosterIds,
        effectiveRounds,
        effectiveCourts,
      ) as ScheduledRound[]
      const updates = {
        schedule,
        courtsInPlay: effectiveCourts,
        rounds: effectiveRounds,
        status: 'live' as const,
      }
      await updateDoc(ref, updates)
      const idx = this.tournaments.findIndex((t) => t.id === tournamentId)
      if (idx !== -1) this.tournaments[idx] = { ...this.tournaments[idx]!, ...updates }
    },

    async submitMatchScore(
      tournamentId: string,
      roundIndex: number,
      court: number,
      score1: number,
      score2: number,
    ) {
      const ref = doc(db, 'tournaments', tournamentId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Tournament, 'id'>
      const schedule = (data.schedule ?? []).map((round) =>
        round.index !== roundIndex
          ? round
          : {
              ...round,
              matchups: round.matchups.map((m) =>
                m.court !== court ? m : { ...m, score1, score2 },
              ),
            },
      )
      await updateDoc(ref, { schedule })
      const idx = this.tournaments.findIndex((t) => t.id === tournamentId)
      if (idx !== -1) this.tournaments[idx] = { ...this.tournaments[idx]!, schedule }
    },

    // Competitive results move rating — club-scoped for a club tournament
    // (every participant's `guests` entry is really a club Player.id, so
    // updates land on their club rating only), or the global user rating
    // for a standalone tournament (registered participants only, guests
    // have no account to update). Friendly tournaments never
    // touch rating, same as friendly matches.
    async completeTournament(tournamentId: string) {
      const ref = doc(db, 'tournaments', tournamentId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const data = snap.data() as Omit<Tournament, 'id'>

      if (data.matchFormat === 'competitive' && data.schedule?.length) {
        if (data.clubId) {
          await this.applyClubTournamentRatings(data.clubId, data.schedule)
        } else {
          await this.applyStandaloneTournamentRatings(data.participantUids ?? [], data.schedule)
        }
      }

      await updateDoc(ref, { status: 'completed' })
      const idx = this.tournaments.findIndex((t) => t.id === tournamentId)
      if (idx !== -1) this.tournaments[idx] = { ...this.tournaments[idx]!, status: 'completed' }
    },

    async applyClubTournamentRatings(clubId: string, schedule: TournamentRound[]) {
      const playerIds = new Set<string>()
      for (const round of schedule) {
        for (const m of round.matchups) {
          m.team1.forEach((id) => playerIds.add(id))
          m.team2.forEach((id) => playerIds.add(id))
        }
      }
      if (!playerIds.size) return

      const snap = await getDocs(query(collection(db, 'players'), where('clubId', '==', clubId)))
      const startingRatings = new Map<string, number>()
      for (const d of snap.docs) {
        if (!playerIds.has(d.id)) continue
        const rating = (d.data() as { rating?: number }).rating
        startingRatings.set(d.id, rating || ELO_START_RATING)
      }

      const updates = computeTournamentRatingUpdates(schedule, startingRatings)
      if (updates.length) await usePlayersStore().applyMatchResult(updates)
    },

    async applyStandaloneTournamentRatings(participantUids: string[], schedule: TournamentRound[]) {
      if (!participantUids.length) return
      const usersStore = useUsersStore()
      const profiles = await usersStore.getUsersByUid(participantUids)
      const startingRatings = new Map(profiles.map((u) => [u.uid, u.rating || ELO_START_RATING]))

      // Guests appear in the schedule (they still count toward each
      // matchup's opponent strength) but have no account to persist a
      // rating update to, so only keep results for actual registered uids.
      const updates = computeTournamentRatingUpdates(schedule, startingRatings)
        .filter((u) => participantUids.includes(u.id))
        .map((u) => ({
          uid: u.id,
          rating: u.rating,
          matchesPlayed: u.matchesPlayed,
          wins: u.wins,
          losses: u.losses,
        }))
      if (updates.length) await usersStore.applyMatchResult(updates)
    },

    async cancelTournament(tournamentId: string) {
      await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'cancelled' })
      const idx = this.tournaments.findIndex((t) => t.id === tournamentId)
      if (idx !== -1) this.tournaments[idx] = { ...this.tournaments[idx]!, status: 'cancelled' }
    },

    async deleteTournament(tournamentId: string) {
      await deleteDoc(doc(db, 'tournaments', tournamentId))
      this.tournaments = this.tournaments.filter((t) => t.id !== tournamentId)
    },
  },
})
