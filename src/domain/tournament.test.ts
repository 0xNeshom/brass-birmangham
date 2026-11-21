import { describe, expect, it } from "vitest";
import { completedCount, pointsForPosition, progression, standings, tournamentStatus, validateMatchParticipants, validateMatchSave, validateNames, validatePlacements, winnerSlots, type PlayerSlot } from "./tournament";
import { makeTournament } from "./testing";

const permutations: PlayerSlot[][] = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];

describe("scoring and statistics", () => {
  it.each(permutations.map((podium) => [podium]))("scores podium %j", (podium) => {
    const tournament = makeTournament([podium]);
    expect(validatePlacements(podium, tournament.players)).toEqual(podium);
    const result = standings(tournament);
    expect(result.map((standing) => standing.slot)).toEqual(podium);
    expect(result.map((standing) => standing.points)).toEqual([10, 5, 0]);
    expect(result.map((standing) => standing.average)).toEqual([10, 5, 0]);
    expect(result.map((standing) => [standing.firsts, standing.seconds, standing.thirds])).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  });

  it("uses null averages and shared ranks before play", () => {
    const tournament = makeTournament();
    expect(standings(tournament).map((standing) => [standing.points, standing.average, standing.rank, standing.progression])).toEqual([[0, null, 1, [0]], [0, null, 1, [0]], [0, null, 1, [0]]]);
    expect(tournamentStatus(tournament)).toBe("Not Started");
    expect(winnerSlots(tournament)).toEqual([]);
  });

  it("keeps every total in bounds and conserves 15 points per match", () => {
    for (let count = 0; count <= 10; count++) {
      const tournament = makeTournament(Array.from({ length: count }, () => [1, 2, 3]));
      const result = standings(tournament);
      expect(result.reduce((sum, standing) => sum + standing.points, 0)).toBe(15 * count);
      expect(result.every((standing) => standing.points >= 0 && standing.points <= 100)).toBe(true);
      expect(progression(tournament, 1)).toEqual(Array.from({ length: count + 1 }, (_, index) => index * 10));
      expect(completedCount(tournament)).toBe(count);
    }
  });

  it("breaks equal points by firsts", () => {
    const result = standings(makeTournament([[1, 3, 2], [3, 2, 1], [3, 2, 1]]));
    expect(result.map(({ slot, points, rank }) => ({ slot, points, rank }))).toEqual([{ slot: 3, points: 25, rank: 1 }, { slot: 1, points: 10, rank: 2 }, { slot: 2, points: 10, rank: 3 }]);
    expect(result.find((standing) => standing.slot === 1)?.average).toBeCloseTo(10 / 3);
  });

  it("shares ranks and declares shared winners only after ten matches", () => {
    const podiums: PlayerSlot[][] = [[1, 2, 3], [1, 2, 3], [1, 2, 3], [2, 1, 3], [2, 1, 3], [2, 1, 3], [1, 3, 2], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
    const nine = makeTournament(podiums.slice(0, 9));
    expect(tournamentStatus(nine)).toBe("In Progress");
    expect(winnerSlots(nine)).toEqual([]);
    const ten = makeTournament(podiums);
    expect(tournamentStatus(ten)).toBe("Completed");
    expect(standings(ten).map((standing) => standing.rank)).toEqual([1, 1, 3]);
    expect(winnerSlots(ten)).toEqual([1, 2]);
  });

  it("recomputes all statistics after a historical correction without mutating input", () => {
    const original = makeTournament(Array.from({ length: 10 }, () => [1, 2, 3]));
    const before = structuredClone(original);
    standings(original);
    expect(original).toEqual(before);
    original.matches[0].placements = [3, 2, 1];
    const result = standings(original);
    expect(result.map((standing) => standing.points)).toEqual([90, 50, 10]);
    expect(result[0].firsts).toBe(9);
    expect(result[0].thirds).toBe(1);
    expect(result[0].average).toBe(9);
    expect(result[0].progression).toEqual([0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(winnerSlots(original)).toEqual([1]);
  });

  it("rejects invalid scoring positions and foreign progression slots", () => {
    expect([1, 2, 3].map((position) => pointsForPosition(position))).toEqual([10, 5, 0]);
    for (const value of [0, 4, -1, 1.5, NaN]) expect(() => pointsForPosition(value)).toThrow();
    expect(() => progression(makeTournament(), 4 as PlayerSlot)).toThrow();
  });
});

describe("input and mutation validation", () => {
  it("uses locale-independent full Unicode casefold for name uniqueness", () => {
    for (const names of [["ΟΣ", "ος", "Cy"], ["ΟΣ", "οσ", "Cy"], ["İ", "i̇", "Cy"], ["ß", "ss", "Cy"]]) {
      expect(() => validateNames(names)).toThrow(/unique/);
    }
    expect(validateNames(["İ", "i", "Cy"])).toEqual(["İ", "i", "Cy"]);
  });
  it("trims Unicode names and enforces case-insensitive uniqueness and character bounds", () => {
    expect(validateNames([" Ada ", "بهرام", "Zoë"])).toEqual(["Ada", "بهرام", "Zoë"]);
    expect(validateNames(["😀".repeat(40), "Bea", "Cy"])[0]).toHaveLength(80);
    for (const names of [[], ["Ada", "Bea"], ["Ada", "Bea", "Cy", "Dee"], [" ", "Bea", "Cy"], ["Ada", " ada ", "Cy"], ["é", "e\u0301", "Cy"], ["a".repeat(41), "Bea", "Cy"]]) {
      expect(() => validateNames(names)).toThrow();
    }
  });

  it.each([null, undefined, {}, [], [1, 2], [1, 2, 3, 1], [1, 1, 3], [1, 2, 4], ["1", 2, 3]])("rejects incomplete, duplicate, or foreign podium %j", (value) => {
    expect(() => validatePlacements(value)).toThrow();
  });

  it("copies valid podiums and rejects invalid player rosters", () => {
    const podium: PlayerSlot[] = [1, 2, 3];
    expect(validatePlacements(podium)).not.toBe(podium);
    expect(() => validatePlacements(podium, [1, 2])).toThrow();
    expect(() => validatePlacements(podium, [1, 1, 3])).toThrow();
    const sparsePodium = [1, 2];
    sparsePodium.length = 3;
    expect(() => validatePlacements(sparsePodium)).toThrow();
    const sparseNames = ["Ada", "Bea"];
    sparseNames.length = 3;
    expect(() => validateNames(sparseNames)).toThrow();
  });

  it("accepts the next match and prior corrections, rejecting skipped, invalid and stale saves", () => {
    const tournament = makeTournament([[1, 2, 3], [2, 3, 1]]);
    expect(() => validateMatchSave(tournament, 3, [3, 2, 1], 1)).not.toThrow();
    expect(() => validateMatchSave(tournament, 1, [3, 2, 1], 1)).not.toThrow();
    expect(() => validateMatchSave(tournament, 4, [1, 2, 3], 1)).toThrow(/sequential/);
    expect(() => validateMatchSave(tournament, 3, [1, 2, 3], 0)).toThrow(/conflict/);
    expect(() => validateMatchSave(tournament, 3, [1, 1, 3], 1)).toThrow();
    for (const number of [0, 11, 1.5, NaN]) expect(() => validateMatchSave(tournament, number, [1, 2, 3], 1)).toThrow();
    expect(() => validateMatchSave(makeTournament(Array.from({ length: 10 }, () => [1, 2, 3])), 10, [3, 2, 1], 1)).not.toThrow();
    expect(() => validateMatchSave({ ...tournament, matches: [] }, 1, [1, 2, 3], 1)).toThrow(/belong/);
  });
});

describe("v2 four-player tournaments", () => {
  const four: PlayerSlot[] = [1, 2, 3, 4];

  it("scores the four placements 10, 5, 0, 0 and rejects invalid positions", () => {
    expect([1, 2, 3, 4].map((position) => pointsForPosition(position, 2))).toEqual([10, 5, 0, 0]);
    for (const value of [0, 5, -1, 1.5, NaN]) expect(() => pointsForPosition(value, 2)).toThrow();
    const tournament = makeTournament([four], { rulesVersion: 2 });
    expect(standings(tournament).map(({ slot, points, firsts, seconds, thirds, fourths, average }) => ({ slot, points, firsts, seconds, thirds, fourths, average }))).toEqual([
      { slot: 1, points: 10, firsts: 1, seconds: 0, thirds: 0, fourths: 0, average: 10 },
      { slot: 2, points: 5, firsts: 0, seconds: 1, thirds: 0, fourths: 0, average: 5 },
      { slot: 3, points: 0, firsts: 0, seconds: 0, thirds: 1, fourths: 0, average: 0 },
      { slot: 4, points: 0, firsts: 0, seconds: 0, thirds: 0, fourths: 1, average: 0 },
    ]);
    expect(standings(tournament).reduce((total, standing) => total + standing.points, 0)).toBe(15);
    const perfect = makeTournament(Array.from({ length: 10 }, () => [...four]), { rulesVersion: 2 });
    expect(standings(perfect).find(({ slot }) => slot === 1)?.points).toBe(100);
  });

  it("allows an unlimited roster and scores only appearances in averages", () => {
    const players = Array.from({ length: 6 }, (_, index) => ({ slot: index + 1, name: `Player ${index + 1}` }));
    const participants: PlayerSlot[][] = [four, [2, 3, 5, 6]];
    const tournament = makeTournament([[1, 2, 3, 4], [2, 3, 5, 6]], { rulesVersion: 2, players, participants });
    const result = standings(tournament);
    const p1 = result.find(({ slot }) => slot === 1)!;
    const p2 = result.find(({ slot }) => slot === 2)!;
    const p5 = result.find(({ slot }) => slot === 5)!;
    expect(tournament.players).toHaveLength(6);
    expect(p1).toMatchObject({ points: 10, appearances: 1, average: 10 });
    expect(p2).toMatchObject({ points: 15, appearances: 2, average: 7.5 });
    expect(p5).toMatchObject({ points: 0, appearances: 1, average: 0 });
    expect(progression(tournament, 1)).toEqual([0, 10, 10]);
  });

  it("requires four distinct roster members for each match and validates result completeness", () => {
    const tournament = makeTournament([], { rulesVersion: 2, players: Array.from({ length: 5 }, (_, index) => ({ slot: index + 1, name: `Player ${index + 1}`, ...(index === 4 ? { leftAt: "2026-02-01T00:00:00.000Z" } : {}) })) });
    expect(validateMatchParticipants(four, tournament.players)).toEqual(four);
    for (const invalid of [null, [1, 2, 3], [1, 2, 3, 3], [1, 2, 3, 6], [1, 2, 3, 5]]) {
      expect(() => validateMatchParticipants(invalid, tournament.players)).toThrow();
    }
    expect(() => validatePlacements([1, 2, 3], tournament.players, 2)).toThrow();
    expect(() => validatePlacements([1, 2, 3, 3], tournament.players, 2)).toThrow();
    tournament.matches[0].participants = null;
    expect(() => validateMatchSave(tournament, 1, four, 1)).toThrow(/Select exactly four/);
  });

  it("supports sequential v2 results, corrections, and tie resolution through second places", () => {
    const tournament = makeTournament([four, [2, 1, 3, 4]], { rulesVersion: 2 });
    tournament.matches[1].placements = null;
    expect(() => validateMatchSave(tournament, 3, four, 1)).toThrow(/sequential/);
    tournament.matches[1].placements = [2, 1, 3, 4];
    expect(() => validateMatchSave(tournament, 2, [2, 2, 3, 4], 1)).toThrow();
    expect(() => validateMatchSave(tournament, 1, [2, 1, 3, 4], 1)).not.toThrow();
    const corrected = standings(tournament);
    expect(corrected.filter(({ rank }) => rank === 1).map(({ slot, points, firsts, seconds }) => ({ slot, points, firsts, seconds }))).toEqual([
      { slot: 1, points: 15, firsts: 1, seconds: 1 },
      { slot: 2, points: 15, firsts: 1, seconds: 1 },
    ]);
    const tie = makeTournament([[1, 2, 3, 4], [2, 1, 3, 4], [1, 2, 3, 4], [2, 1, 3, 4], [1, 2, 3, 4], [2, 1, 3, 4], [1, 2, 3, 4], [2, 1, 3, 4], [1, 2, 3, 4], [2, 1, 3, 4]], { rulesVersion: 2 });
    expect(winnerSlots(tie)).toEqual([1, 2]);
  });
});
