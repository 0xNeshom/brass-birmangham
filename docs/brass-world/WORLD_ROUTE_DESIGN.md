# The Calder Marches — Route Design

Status — Phase 1 geographical network proposal. Corridors and crossing identities are defined for owner review. Route geometry, grades, normalized coordinates and final footprints await composition approval. These connections describe geography and establish no game rules.

Related documents — [Geography](WORLD_GEOGRAPHY_SPEC.md), [cities](WORLD_CITY_REGISTRY.md), [industries](WORLD_INDUSTRY_REGISTRY.md), [coordinate plan](WORLD_COORDINATE_PLAN.md).

## River system

| River ID | Direction and places | Junctions and navigation role |
| --- | --- | --- |
| `river-calder` | Northern moor east of Blackridge, south through Calderwick and Ironhaven, then east through Greyhaven to Rivermouth’s tidal inlet | Weaver joins at Ironhaven. Mere joins on the lower floodplain west of Greyhaven. Upper falls prevent a continuous barge passage. The lower river remains flood-prone and tidal near its mouth |
| `river-weaver` | Western hills through Millbrook and Westford, then east to Ironhaven | Enters the Calder at `junction-weaver-calder`. Mill leats take and return water within Millbrook’s valley. The canal runs beside the valley rather than replacing the river |
| `river-mere` | Southwest headwater meadows through Dunmere, east across lowlands, then north east of Ashbourne | Joins the Calder at `junction-mere-calder`, downstream of Ironhaven. It drains away from the southern canal summit and supplies the lowlands |

The two river confluences are natural junctions. Canal junctions and railway junctions have separate identities and may be nearby without sharing the same point.

## Canal corridors

| Canal ID and name | Settlement sequence | Engineering logic and named features |
| --- | --- | --- |
| `canal-weaver` · Weaver Navigation | Millbrook — Westford — Ironhaven | A contour canal follows the Weaver’s usable valley side. `lock-weaver-flight` lowers boats below the millpond reach between Millbrook and Westford. `basin-westford` provides a goods wharf. A towpath bridge over a feeder stream is `bridge-weaver-towpath`. Ends at Ironhaven’s basin |
| `canal-lower-calder` · Lower Calder Cut | Ironhaven — Greyhaven — Rivermouth | A controlled lateral canal lies on the lower river’s south terrace. `basin-greyhaven` is a warehouse interchange. `lock-greyhaven-control` separates water levels on either side of the narrowing. `lock-rivermouth-sea` isolates canal water from tide. The canal crosses the north-turning Mere at `aqueduct-mere` before Greyhaven |
| `canal-southern` · Southern Supply Canal | Ashbourne — Foundry Vale — Ironhaven | Ashbourne terminal and Foundry Vale form a managed upper pound, fed by a small reservoir on the southern shoulder of the basin. `lock-foundry-flight` descends north toward Ironhaven. `basin-ashbourne` collects farm goods. The line remains above the Mere drainage floor and does not climb the upland scarp |

All three canals meet at `junction-ironhaven-basin`, an engineered basin beside the river confluence. River access has an interface lock, `lock-ironhaven-river`, rather than an unregulated opening into the flood-prone Calder. Local warehouse arms are contained within their named basins and add no new city-to-city connection.

The southern canal’s reservoir, `reservoir-foundry`, captures a small local hillside catchment and includes a spillway returning downstream to the basin. Its purpose is lock-water supply. It does not divert the Mere uphill. Exact water balance and lock count are later engineering details.

## Railway corridors

| Rail ID and name | Settlement sequence | Junctions, stations and structures |
| --- | --- | --- |
| `rail-basin-trunk` · Basin & Coast Railway | Westford — Ironhaven — Copperfield — Greyhaven — Rivermouth | Follows the dry Weaver terrace, crosses the Calder at `viaduct-ironhaven`, and climbs gradually through the Copperfield saddle before descending to raised eastern yards. Crosses the lower canal at `bridge-greyhaven-rail`. Terminates at Rivermouth goods and passenger station above the sea-lock |
| `rail-coal-feeder` · Northern Mineral Line | Brackenford — Blackridge — Calderwick — Ironhaven | Brackenford’s shelf line joins Blackridge sidings. The route descends through the Calder gap using broad curves. `viaduct-calderwick` spans the river at the gap to reach the basin approach. It meets the trunk at Ironhaven |
| `rail-southern-arc` · Southern Counties Line | Westford — Dunmere — Ashbourne — Foundry Vale — Ironhaven | A broad lowland arc follows firm ground around wet meadows. `bridge-dunmere-rail` crosses the Mere east of Dunmere. The route skirts the hillside reservoir and reaches the capital along Foundry Vale’s east terrace |

Rail junction identities are `junction-westford-rail` and `junction-ironhaven-rail`. Each listed city has one station or goods stop named `station-{city-id}`. District sidings terminate within the relevant yard. Greyhaven’s rail/canal intersection is a bridge and freight interchange, without a physical rail junction or a direct water connection.

## Proposed intercity segment inventory

Each sequence below is a geographical edge between consecutive named settlements. Prefixes keep rail, canal and river identities separate even where the pair is shared.

| Network | Segment endpoint pairs |
| --- | --- |
| Weaver canal | Millbrook–Westford; Westford–Ironhaven |
| Lower Calder canal | Ironhaven–Greyhaven; Greyhaven–Rivermouth |
| Southern canal | Ashbourne–Foundry Vale; Foundry Vale–Ironhaven |
| Basin trunk rail | Westford–Ironhaven; Ironhaven–Copperfield; Copperfield–Greyhaven; Greyhaven–Rivermouth |
| Coal feeder rail | Brackenford–Blackridge; Blackridge–Calderwick; Calderwick–Ironhaven |
| Southern arc rail | Westford–Dunmere; Dunmere–Ashbourne; Ashbourne–Foundry Vale; Foundry Vale–Ironhaven |

The proposal has six intercity canal segments and eleven intercity railway segments. Two river confluences and the engineered canal interfaces are represented separately. None of the routes are inferred from proximity. The Northern Mineral Line and Southern Counties Line share only the intended capital junction with each other. The southern arc also meets the trunk at Westford, creating one useful alternative circuit around the central basin.

## Crossings, clearance and visual hierarchy

Canals follow water-level constraints, while rail lines take longer bends to maintain manageable grades. Depict locks only on canals and viaducts only where the rail crosses a watercourse or valley. Draw the aqueduct with a continuous canal water surface over the Mere. At ordinary rail crossings of canals, the rail bridge and the canal underneath remain visually continuous and independent.

Keep the long eastern canal and railway separated on opposite terraces where possible. At Ironhaven, reserve space for the river confluence, canal basin and rail yard as three distinct clusters. Use simple bridge breaks and line halos at intersections. A cartographic crossing conveys vertical order, not a playable interchange. Route polylines should be reviewed for collisions after canonical coordinates are approved.

## Review outcome

Rail directly serves eleven cities. Millbrook moves its freight along the Weaver Navigation to Westford for rail transfer. The canal serves seven cities: Millbrook, Westford, Ironhaven, Greyhaven, Rivermouth, Foundry Vale, and Ashbourne. Brackenford and Blackridge remain extraction settlements served by rail, Calderwick is the scarp-foot rail gateway, Copperfield occupies rail-accessible raised ground, and Dunmere uses the southern railway and local carts. This uneven access is intentional geography.

The routes form a connected regional rail system and a connected canal system. Detailed surveyed geometry remains a later approval stage. Day and Night retain exactly these proposed transport identities and connections.
