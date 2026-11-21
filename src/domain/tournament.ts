import { nameKey } from "./name-key";

/** A tournament-local roster slot. Legacy tournaments use 1–3; v2 rosters are unbounded. */
export type PlayerSlot = number;
export type RulesVersion = 1 | 2;

export interface Player {
  slot: PlayerSlot;
  name: string;
  /** Present for v2 roster snapshots; legacy slots intentionally have no inferred Auth identity. */
  memberId?: string | null;
  joinedAt?: string;
  leftAt?: string | null;
}

export interface Match {
  number: number;
  /** For v2, the four roster slots selected for this match, even before a result is saved. */
  participants?: PlayerSlot[] | null;
  placements: PlayerSlot[] | null;
  playedAt: string | null;
}

export interface Tournament {
  id: string;
  groupId: string;
  title: string;
  version: number;
  /** Missing on pre-refactor snapshots, which are interpreted as legacy v1. */
  rulesVersion?: RulesVersion;
  createdAt: string;
  completedAt: string | null;
  players: Player[];
  matches: Match[];
}

export type TournamentSnapshot = Tournament;

export interface Standing {
  slot: PlayerSlot;
  name: string;
  points: number;
  firsts: number;
  seconds: number;
  thirds: number;
  fourths: number;
  appearances: number;
  average: number | null;
  rank: number;
  /** Cumulative points, starting at match zero; no future results. */
  progression: number[];
}

export const MATCH_COUNT = 10;
export const LEGACY_PLAYER_SLOTS: readonly PlayerSlot[] = [1, 2, 3];
export const MATCH_PARTICIPANT_COUNT = 4;
export const LEAGUE_SCORING: Readonly<Record<number, number>> = { 1: 10, 2: 5, 3: 0, 4: 0 };

export function rulesVersion(tournament: Tournament): RulesVersion {
  return tournament.rulesVersion ?? 1;
}

/** Position is one-based. */
export function pointsForPosition(position: number, version: RulesVersion = 1): number {
  const maximum = version === 1 ? 3 : 4;
  if (!Number.isInteger(position) || position < 1 || position > maximum) {
    throw new Error(`Finishing position must be between 1 and ${maximum}.`);
  }
  return LEAGUE_SCORING[position];
}

export function validateNames(names: string[]): string[] {
  if (names.length !== 3) {
    throw new Error("Exactly three legacy player names are required.");
  }
  return cleanUniqueNames(names);
}

export function validateRosterNames(names: string[]): string[] {
  return cleanUniqueNames(names);
}

function cleanUniqueNames(names: string[]): string[] {
  if (Array.from(names).some((name) => typeof name !== "string")) throw new Error("Player names must be text.");
  const trimmed = names.map((name) => name.trim());
  if (trimmed.some((name) => !name || Array.from(name).length > 40)) {
    throw new Error("Player names must contain between 1 and 40 characters.");
  }
  const folded = trimmed.map(nameKey);
  if (new Set(folded).size !== trimmed.length) {
    throw new Error("Player names must be unique, ignoring case.");
  }
  return trimmed;
}

export function validatePlacements(
  placements: unknown,
  players: readonly (Player | PlayerSlot)[] = LEGACY_PLAYER_SLOTS,
  version: RulesVersion = 1,
): PlayerSlot[] {
  const slots = players.map((player) => typeof player === "number" ? player : player.slot);
  const matchSize = version === 1 ? 3 : MATCH_PARTICIPANT_COUNT;
  if ((version === 1 ? slots.length !== matchSize : slots.length < matchSize) || new Set(slots).size !== slots.length || slots.some((slot) => !Number.isInteger(slot) || slot < 1 || (version === 1 && !LEGACY_PLAYER_SLOTS.includes(slot)))) {
    throw new Error(version === 1 ? "A legacy tournament must have exactly three player slots." : "The tournament roster must contain four or more distinct player slots.");
  }
  if (!Array.isArray(placements) || placements.length !== matchSize ||
      Array.from(placements).some((slot) => !slots.includes(slot)) || new Set(placements).size !== matchSize) {
    throw new Error(`Select exactly ${matchSize} distinct match participants.`);
  }
  return [...placements] as PlayerSlot[];
}

export function validateMatchParticipants(participants: unknown, players: readonly (Player | PlayerSlot)[]): PlayerSlot[] {
  const slots = players.filter((player) => typeof player === "number" || player.leftAt == null)
    .map((player) => typeof player === "number" ? player : player.slot);
  if (slots.length < MATCH_PARTICIPANT_COUNT || new Set(slots).size !== slots.length ||
      !Array.isArray(participants) || participants.length !== MATCH_PARTICIPANT_COUNT ||
      participants.some((slot) => !slots.includes(slot)) || new Set(participants).size !== MATCH_PARTICIPANT_COUNT) {
    throw new Error("Select exactly four distinct players from the tournament roster.");
  }
  return [...participants] as PlayerSlot[];
}

export function completedCount(tournament: Tournament): number {
  return tournament.matches.filter((match) => match.placements !== null).length;
}

export function tournamentStatus(tournament: Tournament): "Not Started" | "In Progress" | "Completed" {
  const count = completedCount(tournament);
  return count === MATCH_COUNT ? "Completed" : count === 0 ? "Not Started" : "In Progress";
}

function playedMatches(tournament: Tournament): Match[] {
  return tournament.matches.filter((match) => match.placements !== null).sort((a, b) => a.number - b.number);
}

function playedPlacements(tournament: Tournament, match: Match): PlayerSlot[] {
  if (rulesVersion(tournament) === 2) {
    const participants = validateMatchParticipants(match.participants, tournament.players);
    return validatePlacements(match.placements, participants, 2);
  }
  return validatePlacements(match.placements, tournament.players, 1);
}

export function progression(tournament: Tournament, slot: PlayerSlot): number[] {
  if (!tournament.players.some((player) => player.slot === slot)) {
    throw new Error("Player does not belong to this tournament.");
  }
  const totals = [0];
  for (const match of playedMatches(tournament)) {
    const placements = playedPlacements(tournament, match);
    const position = placements.indexOf(slot);
    totals.push(totals[totals.length - 1] + (position < 0 ? 0 : pointsForPosition(position + 1, rulesVersion(tournament))));
  }
  return totals;
}

function compareResults(a: Standing, b: Standing): number {
  return b.points - a.points || b.firsts - a.firsts || b.seconds - a.seconds;
}

export function standings(tournament: Tournament): Standing[] {
  const matches = playedMatches(tournament);
  const results = tournament.players.map((player): Standing => {
    let firsts = 0;
    let seconds = 0;
    let thirds = 0;
    let fourths = 0;
    let appearances = 0;
    for (const match of matches) {
      const placements = playedPlacements(tournament, match);
      const position = placements.indexOf(player.slot);
      if (position < 0) continue;
      appearances++;
      if (position === 0) firsts++;
      if (position === 1) seconds++;
      if (position === 2) thirds++;
      if (position === 3) fourths++;
    }
    const points = firsts * 10 + seconds * 5;
    return { ...player, points, firsts, seconds, thirds, fourths, appearances, average: appearances ? points / appearances : null,
      rank: 0, progression: progression(tournament, player.slot) };
  }).sort((a, b) => compareResults(a, b) || a.slot - b.slot);
  results.forEach((result, index) => {
    result.rank = index > 0 && compareResults(result, results[index - 1]) === 0 ? results[index - 1].rank : index + 1;
  });
  return results;
}

export function winnerSlots(tournament: Tournament): PlayerSlot[] {
  return completedCount(tournament) === MATCH_COUNT ? standings(tournament).filter((result) => result.rank === 1).map((result) => result.slot) : [];
}

/** Validate a save without mutating the snapshot. Existing results can always be corrected. */
export function validateMatchSave(
  tournament: Tournament,
  number: number,
  placements: unknown,
  expectedVersion: number,
): void {
  if (expectedVersion !== tournament.version) throw new Error("Tournament version conflict. Refresh and try again.");
  if (!Number.isInteger(number) || number < 1 || number > MATCH_COUNT) throw new Error("Match number must be between 1 and 10.");
  const match = tournament.matches.find((candidate) => candidate.number === number);
  if (!match) throw new Error("Match does not belong to this tournament.");
  const format = rulesVersion(tournament);
  const participants = format === 1 ? tournament.players : validateMatchParticipants(match.participants, tournament.players);
  if (format === 2 && !participants) throw new Error("Select four participants before saving the result.");
  validatePlacements(placements, participants ?? tournament.players, format);
  if (match.placements === null && number !== completedCount(tournament) + 1) {
    throw new Error("Matches must be played sequentially.");
  }
}
