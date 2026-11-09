import { nameKey } from "./name-key";

export type PlayerSlot = 1 | 2 | 3;

export interface Player {
  slot: PlayerSlot;
  name: string;
}

export interface Match {
  number: number;
  placements: PlayerSlot[] | null;
  playedAt: string | null;
}

export interface Tournament {
  id: string;
  groupId: string;
  title: string;
  version: number;
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
  average: number | null;
  rank: number;
  /** Cumulative points, starting at match zero; no future results. */
  progression: number[];
}

export const MATCH_COUNT = 10;
export const PLAYER_SLOTS: readonly PlayerSlot[] = [1, 2, 3];

/** Position is one-based. */
export function pointsForPosition(position: number): number {
  if (!Number.isInteger(position) || position < 1 || position > 3) {
    throw new Error("Finishing position must be 1, 2, or 3.");
  }
  return [10, 5, 0][position - 1];
}

export function validateNames(names: string[]): string[] {
  if (names.length !== 3 || Array.from(names).some((name) => typeof name !== "string")) {
    throw new Error("Exactly three player names are required.");
  }
  const trimmed = names.map((name) => name.trim());
  if (trimmed.some((name) => !name || Array.from(name).length > 40)) {
    throw new Error("Player names must contain between 1 and 40 characters.");
  }
  const folded = trimmed.map(nameKey);
  if (new Set(folded).size !== 3) {
    throw new Error("Player names must be unique, ignoring case.");
  }
  return trimmed;
}

export function validatePlacements(
  placements: unknown,
  players: readonly (Player | PlayerSlot)[] = PLAYER_SLOTS,
): PlayerSlot[] {
  const slots = players.map((player) => typeof player === "number" ? player : player.slot);
  if (slots.length !== 3 || new Set(slots).size !== 3 || slots.some((slot) => !PLAYER_SLOTS.includes(slot))) {
    throw new Error("A tournament must have exactly three player slots.");
  }
  if (!Array.isArray(placements) || placements.length !== 3 ||
      Array.from(placements).some((slot) => !slots.includes(slot)) || new Set(placements).size !== 3) {
    throw new Error("Select every tournament player exactly once.");
  }
  return [...placements] as PlayerSlot[];
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

export function progression(tournament: Tournament, slot: PlayerSlot): number[] {
  if (!tournament.players.some((player) => player.slot === slot)) {
    throw new Error("Player does not belong to this tournament.");
  }
  const totals = [0];
  for (const match of playedMatches(tournament)) {
    const placements = validatePlacements(match.placements, tournament.players);
    totals.push(totals[totals.length - 1] + pointsForPosition(placements.indexOf(slot) + 1));
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
    for (const match of matches) {
      const placements = validatePlacements(match.placements, tournament.players);
      const position = placements.indexOf(player.slot);
      if (position === 0) firsts++;
      if (position === 1) seconds++;
      if (position === 2) thirds++;
    }
    const points = firsts * 10 + seconds * 5;
    return { ...player, points, firsts, seconds, thirds, average: matches.length ? points / matches.length : null,
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
  validatePlacements(placements, tournament.players);
  const match = tournament.matches.find((candidate) => candidate.number === number);
  if (!match) throw new Error("Match does not belong to this tournament.");
  if (match.placements === null && number !== completedCount(tournament) + 1) {
    throw new Error("Matches must be played sequentially.");
  }
}
