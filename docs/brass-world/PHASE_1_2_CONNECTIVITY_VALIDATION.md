# The Calder Marches — Phase 1.2 connectivity validation

**23 November 2026 · Registry integrity passed · map and exact infrastructure placement await owner approval**

The canonical proposed registry is [PHASE_1_2_TOPOLOGY.json](PHASE_1_2_TOPOLOGY.json). From the repository root, regenerate the review artifacts and run the checks with:

```sh
python3 docs/brass-world/design-source/render_phase_1_2.py
python3 docs/brass-world/design-source/check_phase_1_2_composition.py
python3 docs/brass-world/design-source/render_phase_1_2_topology.py
python3 docs/brass-world/design-source/validate_topology.py
```

The registry and source contain no canonical coordinates.

## Validation results

| Check | Result |
| --- | --- |
| Global stable IDs | **119 unique IDs**, including nodes, corridors, segments, structures, individual spans, infrastructure, interchanges and local features. Duplicate IDs fail the checker. |
| Settlements and regions | **12 cities** each in exactly one of the **5 approved regions**. All 12 are explicitly served by a canal or railway corridor. |
| Network segments | **27** segments: 10 river, 6 canal, 11 railway. Every segment has two existing, distinct endpoint nodes and belongs to exactly one corridor. |
| River direction | River segments are ordered source-to-destination, tributaries terminate at named confluences, and the directed river graph is acyclic. |
| Canal topology | Every canal corridor lists its node sequence and segment endpoints. The three corridors meet only at `node-junction-canal-ironhaven-basin`; the two river interfaces are separate lock records. |
| Railway topology | All three railway corridors list their node sequences. `node-junction-rail-westford` and `node-junction-rail-ironhaven` list their incident segments explicitly. |
| Crossings vs. junctions | Physical crossings reference existing segment IDs, carry explicit over/under order, and set network transfer false. Junctions are same-mode nodes with incident edges, not visual crossings. |
| Diagram intersection coverage | The composition checker finds **13** cross-mode intersections. Each drawing code maps to a structure span and the declared corridor pair; unregistered intersections fail. |
| Bridges and spans | **12 main structures / 13 physical spans**: 9 bridge structures with 10 spans, 2 railway viaducts, and 1 canal aqueduct. B2a and B2b are the separate span IDs for one B2 structure. |
| Day/Night | Renderer uses the same geometry object and fingerprint. The comparison image halves are pixel-identical to the two standalone exports. Both are 1800 × 1200; the comparison is 3600 × 1200. |

## Network interpretation

City anchors and junction nodes are separate records. At Ironhaven and Westford, the network junction has an explicit `near_settlement` reference. This records co-location without merging a transport node with the city identity. The diagrams show stable IDs and endpoints; their row positions are schematic and carry no map coordinates.

Bridges, viaducts and the Mere aqueduct are physical grade-separated crossings. They do not create transfers. The six rail/canal freight-handling records are separate land-side logistics. The towpath bridge crosses `feature-local-mill-feeder`, a named local stream feature excluded from intercity river topology.

## Unresolved owner decisions

1. **Ironhaven river lock:** choose whether the canal outlet is at the Weaver–Calder confluence node or on a new Calder reach immediately downstream. The registry currently attaches it to the confluence and flags the wording mismatch; no downstream node was invented.
2. **Map freeze:** approve the revised Phase 1.2 Day/Night composition, including the explicit elevation-contour interpretation, Ironhaven label and capital marker, region captions, river bend and all 13 span placements, before assigning canonical coordinates.
3. **Engineering detail:** confirm lock counts and levels, reservoir supply and water balance, and exact lock/structure locations during the coordinate/engineering pass. These are not inferred by this topology validation.

## Limits

The checker verifies IDs, references, logical endpoint order, river direction, explicit transfer semantics, named junction incidence, and that the 13 drawn cross-mode intersections correspond to registry codes and corridor pairs. It does not establish stream gradients, flood elevations, bridge clearance, hydraulic capacity, or engineering feasibility. Route polylines between city/junction nodes still require tracing against the owner-approved coordinate overlay. Blender reconstruction and production assets remain gated on geography approval.
