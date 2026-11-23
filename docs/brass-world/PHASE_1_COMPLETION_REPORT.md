# The Calder Marches — Phase 1 completion report

**Status: Phase 1 geography is frozen as `calder-marches-geography-v1.0.0` (23 November 2026).**

The owner approved the Phase 1.2 composition and the final-freeze task authorized canonical coordinates, selecting Option A for Ironhaven's river interface. The final baseline preserves the original fictional world, antique industrial atlas, subtle 2.5D direction, all 12 settlements, five regions, and the shared Day/Night geography.

## Final freeze

The [canonical source](design-source/world.json) is the single coordinate and topology authority. It contains 227 globally unique IDs, 42 nodes, 10 corridors (three rivers, three canals, three railways, and one separate water-interface corridor), and 29 segments (11 river, six canal, 11 rail, one connector). It records 12 crossing structures and 13 physical spans: nine bridges, two viaducts, and one aqueduct.

The [Day/Night comparison](GEOGRAPHY_COMPARISON_V1_0_0.png), [water topology](WATER_NETWORK_V1_0_0.svg), and [railway topology](RAIL_NETWORK_V1_0_0.svg) are generated from the canonical source. The [automated validator](design-source/validate_frozen_geography.py) passed; machine-readable results and the checks are in [GEOGRAPHY_VALIDATION_REPORT.json](GEOGRAPHY_VALIDATION_REPORT.json). The [freeze manifest](GEOGRAPHY_FREEZE_MANIFEST.json) pins the approved artifacts with SHA-256 values.

## Owner decision recorded

Option A is implemented: `node-river-calder-below-weaver` is a separate point immediately downstream of `junction-river-weaver-calder`. The explicit `canal-interface-ironhaven-01` segment reaches that downstream point from Ironhaven's canal basin; `lock-ironhaven-river` belongs to that connector. The natural Weaver–Calder confluence does not connect the canal.

## Remaining work and limits

No owner decisions remain for the Phase 1 geography freeze. Engineering values intentionally remain unassigned: lock lift/chamber dimensions, water levels and reservoir volumes, canal/rail gradients, flood design levels, and clearance envelopes. These require later engineering input and do not block the cartographic baseline.

No Blender reconstruction, production GLB, React component, application/authentication, tournament, or Supabase work was started for this freeze. Phase 1.1 and Phase 1.2 artifacts and completion reports remain preserved as historical records.

## Reproduction

From the repository root, run:

```sh
python3 docs/brass-world/design-source/render_frozen_baseline.py
python3 docs/brass-world/design-source/render_frozen_topology.py
python3 docs/brass-world/design-source/validate_frozen_geography.py
python3 docs/brass-world/design-source/create_freeze_manifest.py
```

The commands regenerate preview plates, topology diagrams, validation output, and the artifact hash manifest.
