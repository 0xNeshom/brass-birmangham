/** Test-only fixtures. Never use as production fallback data. */
import type { PlayerSlot, Tournament } from "./tournament";

export function makeTournament(podiums: PlayerSlot[][] = []): Tournament {
  return {
    id: "test-tournament", groupId: "test-group", title: "Test Tournament", version: 1,
    createdAt: "2026-01-01T00:00:00.000Z", completedAt: podiums.length === 10 ? "2026-01-02T00:00:00.000Z" : null,
    players: [{ slot: 1, name: "Ada" }, { slot: 2, name: "Bea" }, { slot: 3, name: "Cy" }],
    matches: Array.from({ length: 10 }, (_, index) => ({ number: index + 1,
      placements: podiums[index] ? [...podiums[index]] : null,
      playedAt: podiums[index] ? "2026-01-02T00:00:00.000Z" : null })),
  };
}
