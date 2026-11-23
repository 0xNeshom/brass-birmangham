# The Calder Marches — Phase 1.1 connectivity validation

**23 November 2026 · Proposed topology checked, coordinate approval pending**

Input is [PHASE_1_1_TOPOLOGY.json](PHASE_1_1_TOPOLOGY.json). This is the explicit design registry for Phase 1.1. Its records contain no canonical geometry. Corridor sequences preserve the preceding design’s six canal and eleven railway intercity links. The [route specification](WORLD_ROUTE_DESIGN.md) describes the same segment and infrastructure IDs.

## Checks performed

A Python standard-library checker loaded the JSON, checked unique segment IDs and valid non-identical endpoint IDs, walked connected components separately for each mode, topologically sorted the directed river graph, and checked each corridor sequence against its segment endpoint records.

| Check | Result |
| --- | --- |
| City inventory and regional membership | 12 unique cities, each in exactly one of the five regions |
| River graph | 10 directed segments, 11 river nodes, one connected drainage basin |
| River direction | Acyclic graph. Only outlet is estuary-rivermouth. Three headwaters and two confluences are explicit |
| Canal graph | 6 intercity segments, 7 settlements, one connected network |
| Railway graph | 11 intercity segments, 11 settlements, one connected network and one independent circuit |
| All corridor endpoints | Match the consecutive named nodes or settlements in each corridor |
| Crossings | Twelve named main-network structures contain thirteen spans and reference valid segment pairs and explicitly prohibit transfer at the span |
| River/canal interfaces | Two named interface locks, separate from intercity edge counts |
| City coverage across canal and rail | All 12 settlements have at least one listed transport mode |
| Canonical coordinates | Absent by design, pending review of the refined composition |

Composition review identified two extra required bridge spans, at Westford over the Weaver and on the eastern trunk over the Mere. Both are now explicit crossing records. A final geometric intersection pass also identifies five capital/Westford approach crossings and a second Dunmere meander span. These are recorded as B5–B9 and B2a/B2b, preserving the same segment endpoints. The six canal and eleven rail intercity endpoint pairs are preserved.

The graph checks passed. They establish logical connectivity and referential consistency. They do not establish gradients, water balance, bridge clearance, route length, or absence of geometrical intersections in later polylines.

## City service inventory

| Settlement | Canal | Rail | River adjacency |
| --- | --- | --- | --- |
| Ironhaven | Weaver, Lower Calder, Southern | Basin trunk, Northern feeder, Southern arc | Calder–Weaver confluence |
| Copperfield | — | Basin trunk | Raised saddle beside basin |
| Millbrook | Weaver | Freight transfer via Westford | Weaver reach |
| Blackridge | — | Northern feeder | Above Calder headwater valley |
| Westford | Weaver | Basin trunk, Southern arc | Weaver reach |
| Rivermouth | Lower Calder, sea-lock interface | Basin trunk | Calder tidal inlet |
| Foundry Vale | Southern | Southern arc | Basin side valley |
| Ashbourne | Southern terminal | Southern arc | Mere passes to its east |
| Greyhaven | Lower Calder | Basin trunk | Lower Calder reach |
| Brackenford | — | Northern feeder | Upland feeder drainage |
| Dunmere | — | Southern arc | Mere reach |
| Calderwick | — | Northern feeder | Calder reach |

“River adjacency” describes landscape placement, with no automatic navigation edge. The explicit river graph and interface locks determine the proposed water relationships.

## Infrastructure and drawing review

Each station, basin, lock, reservoir, aqueduct, bridge and viaduct has a named record or crossing entry in the registry. Railway junctions are Westford and Ironhaven. The three canals meet at the capital basin. Freight handling interfaces are recorded at six canal/rail settlements. Different networks do not gain connections from their proximity on the map.

The two topology SVGs are abstract endpoint diagrams with keyed infrastructure notes. Repeated node IDs identify shared junctions, and arrowheads show river flow. Their page positions are illustrative. Day and Night must use the same geographic paths, crossing order, city anchors and terrain footprints. Final map geometry equality is checked by the composition author and recorded with those visual artifacts.

## Remaining approval and engineering limits

The owner must approve the revised city distribution, terrain, lower Calder bend, infrastructure placements and Day/Night composition before canonical coordinates are captured. Bridge and lock positions are relative locations on named segments. The proposed southern upper pound requires a later reservoir supply and water-level check. Refinement of curves must preserve the registered endpoints and explicit over/under relationships.

No critical logical connectivity discrepancy remains in this registry. Geometric verification against an approved coordinate overlay remains the next checkpoint. Blender reconstruction has not started.
