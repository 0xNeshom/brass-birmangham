/** Test-only fixtures. Never use as production fallback data. */
import type { Player, PlayerSlot, RulesVersion, Tournament } from "./tournament";

export function makeTournament(podiums: PlayerSlot[][] = [], options: { rulesVersion?: RulesVersion; players?: Player[]; participants?: PlayerSlot[][] } = {}): Tournament {
  const version = options.rulesVersion ?? 1;
  const players = options.players ?? (version === 1
    ? [{ slot: 1, name: "Ada" }, { slot: 2, name: "Bea" }, { slot: 3, name: "Cy" }]
    : [{ slot: 1, name: "Ada" }, { slot: 2, name: "Bea" }, { slot: 3, name: "Cy" }, { slot: 4, name: "Dee" }]);
  return {
    id: "test-tournament", groupId: "test-group", title: "Test Tournament", version: 1,
    ...(version === 2 ? { rulesVersion: version } : {}),
    createdAt: "2026-01-01T00:00:00.000Z", completedAt: podiums.length === 10 ? "2026-01-02T00:00:00.000Z" : null,
    players,
    matches: Array.from({ length: 10 }, (_, index) => ({ number: index + 1,
      placements: podiums[index] ? [...podiums[index]] : null,
      ...(version === 2 ? { participants: [...(options.participants?.[index] ?? (players.length >= 4 ? players.slice(0, 4).map((player) => player.slot) : []))] } : {}),
      playedAt: podiums[index] ? "2026-01-02T00:00:00.000Z" : null })),
  };
}
