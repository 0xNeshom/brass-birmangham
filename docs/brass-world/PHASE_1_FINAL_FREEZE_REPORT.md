# Brass World — Phase 1 final geography freeze

**Status:** Complete  
**Baseline:** `calder-marches-geography-v1.0.0`  
**Freeze date:** 23 November 2026

## Result

The approved Phase 1.2 composition and the original Calder Marches identity are frozen with canonical coordinates. All 12 settlements and five regions remain present. Day and Night share the same source geometry and geometry SHA-256 `b1408922756834220b8f30dcaee83dc3652f386097b99c6520aacb90092cb116`.

Canonical source: [design-source/world.json](design-source/world.json). Human connectivity review: [GEOGRAPHY_CONNECTIVITY_VALIDATION.md](GEOGRAPHY_CONNECTIVITY_VALIDATION.md). Machine report: [GEOGRAPHY_VALIDATION_REPORT.json](GEOGRAPHY_VALIDATION_REPORT.json). Artifact hashes: [GEOGRAPHY_FREEZE_MANIFEST.json](GEOGRAPHY_FREEZE_MANIFEST.json).

## Validated inventory

| Item | Count |
| --- | ---: |
| Globally unique IDs | 227 |
| Settlements / regions | 12 / 5 |
| Nodes | 42 |
| Corridors | 10: 3 river, 3 canal, 3 rail, 1 water-interface |
| Segments | 29: 11 river, 6 canal, 11 rail, 1 water-interface |
| Main crossing structures | 12: 9 bridges, 2 viaducts, 1 aqueduct |
| Physical spans | 13: B1–B9 including B2a/B2b, V1, V2, A1 |

The validator confirms unique IDs, in-bounds normalized coordinates, valid nodes, geometry-to-endpoint matches, ordered corridor continuity, acyclic river flow and confluence terminals, explicit crossings without accidental transfers, correct structure/span counts, and Day/Night preview parity. The water and rail diagrams show each corridor's ordered segment endpoints.

## Owner's outlet choice

Option A was selected and applied: `node-river-calder-below-weaver` is separate from the natural Weaver–Calder confluence and lies immediately downstream on the Calder. New connector `canal-interface-ironhaven-01` connects the Ironhaven basin to that downstream point. `lock-ironhaven-river` is attached to the connector, not to the natural confluence. Existing named canal networks and approved city coordinates are preserved.

## Reproduction and outcome

Run these commands from the repository root:

```sh
python3 docs/brass-world/design-source/render_frozen_baseline.py
python3 docs/brass-world/design-source/render_frozen_topology.py
python3 docs/brass-world/design-source/validate_frozen_geography.py
python3 docs/brass-world/design-source/create_freeze_manifest.py
```

**Observed result:** both render scripts completed; the automated validator printed `PASS: 227 unique IDs; 12 settlements; 5 regions; 29 network segments; 12 crossing structures / 13 spans`; manifest generation recorded all frozen artifacts. See [GEOGRAPHY_VALIDATION_REPORT.json](GEOGRAPHY_VALIDATION_REPORT.json) for the full check list and fingerprint.

## Unresolved decisions

No owner decisions remain for Phase 1 geography. Later engineering must supply numeric water levels and reservoir volume, lock lift/chamber dimensions, canal and rail gradients, flood design levels, and bridge/aqueduct clearance envelopes. The current contours are schematic elevation marks, not survey data.

Blender reconstruction, GLB production, and application work remain outside this completed task. Phase 1.1 and Phase 1.2 documents and images remain preserved as historical snapshots.
