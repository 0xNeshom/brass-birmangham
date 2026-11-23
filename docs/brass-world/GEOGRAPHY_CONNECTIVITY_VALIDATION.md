# Phase 1 final geography connectivity validation

**Result: PASS · baseline `calder-marches-geography-v1.0.0` · 23 November 2026**

The final source is [design-source/world.json](design-source/world.json). The validator [writes detailed machine-readable results](GEOGRAPHY_VALIDATION_REPORT.json); rerun it with `python3 docs/brass-world/design-source/validate_frozen_geography.py`.

## Network inventory

| Network | Corridors | Segments | Integrity |
| --- | ---: | ---: | --- |
| Rivers | 3 | 11 | Source-to-destination direction is ordered; named tributaries terminate at explicit confluence nodes; directed graph is acyclic |
| Canals | 3 | 6 | Three named canal systems retain explicit segment endpoints and ordered nodes |
| Railways | 3 | 11 | Three named railway corridors have explicit ordered segment endpoints |
| Canal/river interface | 1 | 1 | Separate connector from Ironhaven basin to the downstream Calder node |

All segment endpoints refer to registered nodes, endpoint coordinates match segment geometry, and segments join in the same order as their corridor registry. All normalized geometry lies in the frozen 3:2 frame. Freight transfers remain explicit co-located records and are not inferred from map proximity.

## Ironhaven outlet decision

The approved Option A is implemented. The natural confluence `junction-river-weaver-calder` remains intact. The canal outlet reaches the distinct node `node-river-calder-below-weaver` by `canal-interface-ironhaven-01`, with `lock-ironhaven-river` attached to that segment. This node is immediately downstream of the Weaver confluence on the Calder. The connection does not pass through the natural confluence.

## Bridges, junctions, and parity

There are 12 main crossing structures: nine bridges, two viaducts, and one aqueduct, with 13 physical spans. Codes reconcile as B1, B2a, B2b, B3–B9, V1, V2, and A1. Each span identifies both segments and over/under order; physical crossings have no network transfer. Same-mode junctions and freight interchanges are registered separately.

Day and Night are rendered from the same frozen geometry source and carry fingerprint `b1408922756834220b8f30dcaee83dc3652f386097b99c6520aacb90092cb116`. Standalone previews are 1800 × 1200; the comparison is 3600 × 1200 and its panels are pixel-identical to the standalone images.

## Deferred engineering inputs

No topology or owner decision remains open for the freeze. Lock lift and chamber dimensions, hydraulic balance, water levels and reservoir volume, route gradients, flood levels, and vertical clearances remain unassigned engineering inputs.
