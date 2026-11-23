# The Calder Marches — Route Design

Status — Phase 1 final topology and coordinates frozen in `calder-marches-geography-v1.0.0`. These connections describe geography and establish no game rules. The Phase 1.2 registry remains the historical review snapshot.

Related documents — [Geography](WORLD_GEOGRAPHY_SPEC.md), [cities](WORLD_CITY_REGISTRY.md), [industries](WORLD_INDUSTRY_REGISTRY.md), [coordinate plan](WORLD_COORDINATE_PLAN.md).

## River system

The three river corridors have canonical schematic geometry in [design-source/world.json](design-source/world.json); their numeric elevations remain later engineering work. Day and Night use exactly the same transport identities and connections.

| River ID | Direction and places | Junctions and navigation role |
| --- | --- | --- |
| `river-calder` | Northern moor east of Blackridge, south through Calderwick and Ironhaven, then east through Greyhaven to Rivermouth’s tidal inlet | Weaver joins at Ironhaven. Mere joins on the lower floodplain west of Greyhaven. Upper falls prevent a continuous barge passage. The lower river remains flood-prone and tidal near its mouth |
| `river-weaver` | Western hills through Millbrook and Westford, then east to Ironhaven | Enters the Calder at `junction-weaver-calder`. Mill leats take and return water within Millbrook’s valley. The canal runs beside the valley rather than replacing the river |
| `river-mere` | Southwest headwater meadows through Dunmere, east across lowlands, then north east of Ashbourne | Joins the Calder at `junction-mere-calder`, downstream of Ironhaven. It drains away from the southern canal summit and supplies the lowlands |

The two river confluences are natural network nodes. Their stable IDs are `junction-river-weaver-calder` and `junction-river-mere-calder`. Canal junctions and railway junctions have separate identities and may be nearby without sharing the same point.

## Canal corridors

| Canal ID and name | Settlement sequence | Engineering logic and named features |
| --- | --- | --- |
| `canal-weaver` · Weaver Navigation | Millbrook — Westford — Ironhaven | A contour canal follows the Weaver’s usable valley side. `lock-weaver-flight` lowers boats below the millpond reach between Millbrook and Westford. `basin-westford` provides a goods wharf. A towpath bridge over a feeder stream is `bridge-weaver-towpath`. Ends at Ironhaven’s basin |
| `canal-lower-calder` · Lower Calder Cut | Ironhaven — Greyhaven — Rivermouth | A controlled lateral canal lies on the lower river’s south terrace. `basin-greyhaven` is a warehouse interchange. `lock-greyhaven-control` separates water levels on either side of the narrowing. `lock-rivermouth-sea` isolates canal water from tide. The canal crosses the north-turning Mere at `aqueduct-mere` before Greyhaven |
| `canal-southern` · Southern Supply Canal | Ashbourne — Foundry Vale — Ironhaven | Ashbourne terminal and Foundry Vale form a managed upper pound, fed by a small reservoir on the southern shoulder of the basin. `lock-foundry-flight` descends north toward Ironhaven. `basin-ashbourne` collects farm goods. The line remains above the Mere drainage floor and does not climb the upland scarp |

All three canals meet at `node-junction-canal-ironhaven-basin` (infrastructure ID `junction-canal-ironhaven-basin`), an engineered basin beside the river confluence. River access has an interface lock, `lock-ironhaven-river`, rather than an unregulated opening into the flood-prone Calder. Local warehouse arms are contained within their named basins and add no new city-to-city connection.

The southern canal’s reservoir, `reservoir-foundry`, captures a small local hillside catchment and includes a spillway returning downstream to the basin. Its purpose is lock-water supply. It does not divert the Mere uphill. Exact water balance and lock count are later engineering details.

## Railway corridors

| Rail ID and name | Settlement sequence | Junctions, stations and structures |
| --- | --- | --- |
| `rail-basin-trunk` · Basin & Coast Railway | Westford — Ironhaven — Copperfield — Greyhaven — Rivermouth | Follows the dry Weaver terrace, crosses the Calder at `viaduct-ironhaven`, and climbs gradually through the Copperfield saddle before descending to raised eastern yards. Crosses the lower canal at `bridge-greyhaven-rail`. Terminates at Rivermouth goods and passenger station above the sea-lock |
| `rail-coal-feeder` · Northern Mineral Line | Brackenford — Blackridge — Calderwick — Ironhaven | Brackenford’s shelf line joins Blackridge sidings. The route descends through the Calder gap using broad curves. `viaduct-calderwick` spans the river at the gap to reach the basin approach. It meets the trunk at Ironhaven |
| `rail-southern-arc` · Southern Counties Line | Westford — Dunmere — Ashbourne — Foundry Vale — Ironhaven | A broad lowland arc follows firm ground around wet meadows. `bridge-dunmere-rail` crosses the Mere east of Dunmere. The route skirts the hillside reservoir and reaches the capital along Foundry Vale’s east terrace |

Rail junction infrastructure IDs are `junction-rail-westford` and `junction-rail-ironhaven`, attached to graph nodes `node-junction-rail-westford` and `node-junction-rail-ironhaven`. Each listed city has one station or goods stop named `station-{city-id}`. District sidings terminate within the relevant yard. Greyhaven’s rail/canal intersection is a bridge and freight interchange, without a physical rail junction or a direct water connection.

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

## Phase 1.2 canonical topology and IDs

The original city names, corridors, and settlement sequence are retained. The [frozen source registry](design-source/world.json) gives nodes, corridors, segments, structures, spans, locks, stations, junctions and transfers globally unique IDs. Display names and drawing codes are labels, never identity keys. The [frozen water diagram](WATER_NETWORK_V1_0_0.svg) and [rail diagram](RAIL_NETWORK_V1_0_0.svg) show explicit endpoints independently of geography. A shared node ID means the network connects there; a crossing code does not.

### Directed river segment registry

| Segment | From → to, downstream |
| --- | --- |
| `river-calder-01` | `node-river-source-calder` → `node-river-reach-calderwick` |
| `river-calder-02` | `node-river-reach-calderwick` → `junction-river-weaver-calder` |
| `river-calder-03` | `junction-river-weaver-calder` → `node-river-calder-below-weaver` |
| `river-calder-04` | `node-river-calder-below-weaver` → `junction-river-mere-calder` |
| `river-calder-05` | `junction-river-mere-calder` → `node-river-reach-greyhaven` |
| `river-calder-06` | `node-river-reach-greyhaven` → `node-river-estuary-rivermouth` |
| `river-weaver-01` | `node-river-source-weaver` → `node-river-reach-millbrook` |
| `river-weaver-02` | `node-river-reach-millbrook` → `node-river-reach-westford` |
| `river-weaver-03` | `node-river-reach-westford` → `junction-river-weaver-calder` |
| `river-mere-01` | `node-river-source-mere` → `node-river-reach-dunmere` |
| `river-mere-02` | `node-river-reach-dunmere` → `junction-river-mere-calder` |

Sources denote the northern moor, western hills, and southwestern meadows respectively. Calderwick, Millbrook, Westford, Dunmere and Greyhaven reach nodes identify adjacent river reaches. They are separate from settlement or transport anchors. Weaver and Mere terminate at explicit Calder confluences. Every river segment flows to the Rivermouth estuary. The Mere turns north east of Ashbourne, crossing beneath the lower cut before joining the Calder.

### Canal segment registry

| Segment | Explicit endpoint node IDs | Infrastructure placement |
| --- | --- | --- |
| `canal-weaver-01` | `node-canal-millbrook-wharf` ↔ `node-canal-westford-basin` | Weaver lock flight below the millpond reach. Towpath bridge crosses a registered local mill-feeder feature |
| `canal-weaver-02` | `node-canal-westford-basin` ↔ `node-junction-canal-ironhaven-basin` | Westford basin at west endpoint; east endpoint is the capital canal junction |
| `canal-lower-calder-01` | `node-junction-canal-ironhaven-basin` ↔ `node-canal-greyhaven-basin` | Mere aqueduct before Greyhaven; Greyhaven rail bridge on western approach |
| `canal-lower-calder-02` | `node-canal-greyhaven-basin` ↔ `node-canal-rivermouth-dock` | Control lock east of Greyhaven basin. Sea lock links the terminal to the tidal inlet |
| `canal-southern-01` | `node-canal-ashbourne-terminal` ↔ `node-canal-foundry-basin` | Shared upper pound, supplied by reservoir-foundry on the hillside |
| `canal-southern-02` | `node-canal-foundry-basin` ↔ `node-junction-canal-ironhaven-basin` | Foundry lock flight descends toward capital basin |

All three canals join at `node-junction-canal-ironhaven-basin`. Their river outlet is a separate seventh waterway segment, `canal-interface-ironhaven-01`, from that basin to `node-river-calder-below-weaver`; `lock-ironhaven-river` lies on the connector. Rivermouth has its separate sea-lock interface. No other contact between river and canal strokes creates navigation access.

### Railway segment registry

| Segment | Explicit endpoint node IDs |
| --- | --- |
| `rail-basin-trunk-01` | `node-junction-rail-westford` ↔ `node-junction-rail-ironhaven` |
| `rail-basin-trunk-02` | `node-junction-rail-ironhaven` ↔ `node-rail-station-copperfield` |
| `rail-basin-trunk-03` | `node-rail-station-copperfield` ↔ `node-rail-station-greyhaven` |
| `rail-basin-trunk-04` | `node-rail-station-greyhaven` ↔ `node-rail-station-rivermouth` |
| `rail-coal-feeder-01` | `node-rail-station-brackenford` ↔ `node-rail-station-blackridge` |
| `rail-coal-feeder-02` | `node-rail-station-blackridge` ↔ `node-rail-station-calderwick` |
| `rail-coal-feeder-03` | `node-rail-station-calderwick` ↔ `node-junction-rail-ironhaven` |
| `rail-southern-arc-01` | `node-junction-rail-westford` ↔ `node-rail-station-dunmere` |
| `rail-southern-arc-02` | `node-rail-station-dunmere` ↔ `node-rail-station-ashbourne` |
| `rail-southern-arc-03` | `node-rail-station-ashbourne` ↔ `node-rail-station-foundry-vale` |
| `rail-southern-arc-04` | `node-rail-station-foundry-vale` ↔ `node-junction-rail-ironhaven` |

Each of the eleven rail-served cities has a station or goods-stop record. Westford and Ironhaven junctions are explicit nodes shared by their incident segments. Millbrook’s access is through the Weaver canal, not a railway station. Cargo handling between rail yards and canal quays is recorded as separate freight-interchange entities at Westford, Ironhaven, Ashbourne, Foundry Vale, Greyhaven and Rivermouth. This handling is distinct from any direct vehicle connection or water opening.

### Crossing and interchange register

| Infrastructure | Above | Below | Meaning |
| --- | --- | --- | --- |
| viaduct-calderwick | rail-coal-feeder-03 | river-calder-02 | Rail spans river just downstream of Calderwick. No transfer |
| viaduct-ironhaven | rail-basin-trunk-02 | river-calder-04 | Rail crosses Calder east of capital confluence. No transfer |
| bridge-greyhaven-rail | rail-basin-trunk-03 | canal-lower-calder-01 | Rail spans canal on western Greyhaven approach. Freight transfer occurs at the basin/yard, separate from this span |
| bridge-dunmere-rail (B2a/B2b) | rail-southern-arc-02 | river-mere-02 | Two spans across the river meander east of Dunmere. No transfer |
| aqueduct-mere | canal-lower-calder-01 | river-mere-02 | Canal remains continuous above the north-turning Mere. No water interchange |
| bridge-westford-weaver-rail | rail-southern-arc-01 | river-weaver-02 | Rail spans Weaver just upstream of Westford. No transfer |
| bridge-mere-trunk | rail-basin-trunk-03 | river-mere-02 | Eastern trunk spans Mere south of the lower confluence. No transfer |
| bridge-westford-calder-trunk (B5) | rail-basin-trunk-01 | river-calder-02 | Trunk spans Calder on western capital approach; no transfer |
| bridge-capital-calder-feeder (B6) | rail-coal-feeder-03 | river-calder-02 | Feeder spans Calder again near capital; no transfer |
| bridge-capital-weaver-southern (B7) | rail-southern-arc-04 | river-weaver-03 | Southern line spans Weaver at capital approach; no transfer |
| bridge-westford-canal-southern (B8) | rail-southern-arc-01 | canal-weaver-01 | Southern line spans canal after Westford; no transfer |
| bridge-capital-canal-southern (B9) | rail-southern-arc-04 | canal-weaver-02 | Southern line spans western canal arm; no transfer |
| bridge-weaver-towpath | Towpath on canal-weaver-01 | Local mill feeder | Pedestrian bridge. The canal does not cross the main Weaver here |

The refined composition requires two additional spans on the retained corridors. The southern railway leaves the north Weaver terrace just upstream of Westford, requiring bridge-westford-weaver-rail. The eastern trunk crosses the north-turning Mere before Greyhaven, requiring bridge-mere-trunk. These infrastructure additions preserve all intercity endpoint pairs. The Mere bends south of Ashbourne before turning north east of Foundry Vale, keeping the southern upper canal pound on its own shelf.

Final intersection review adds five spans on retained approaches to Westford and Ironhaven, plus a second span of the Dunmere bridge around a river meander. There are twelve named main-network crossing structures and thirteen physical spans. The matching diagram codes are recorded in the frozen registry. Future geographic changes must resolve new intersections explicitly and be published as a versioned revision. Junctions are marked only at shared same-mode nodes. A rail/river crossing, a rail/canal bridge, and a canal aqueduct each preserve their separate paths.

See the [Phase 1.2 connectivity validation](PHASE_1_2_CONNECTIVITY_VALIDATION.md) for uniqueness, referential integrity, flow, junction, crossing, map-parity checks, and remaining decisions. Phase 1.1 files are retained as a historical snapshot.

### Dedicated junction nodes

Ironhaven and Westford settlement anchors remain separate from transport junction nodes. The Weaver and Lower Calder canals connect to `node-junction-canal-ironhaven-basin`; the basin infrastructure record is `basin-ironhaven`. The rail trunk and feeder connect to `node-junction-rail-ironhaven`; the trunk and southern arc connect at `node-junction-rail-westford`. Each junction record lists its incident segment IDs. Co-location with a named city is explicit through `near_settlement`; the graph does not infer a connection from proximity.

The owner resolved this in the final-freeze request using Option A. `node-river-calder-below-weaver` is a distinct node on the Calder immediately downstream of `junction-river-weaver-calder`. `canal-interface-ironhaven-01` connects the Ironhaven basin to that node, and `lock-ironhaven-river` is registered on the connector. The natural confluence remains unchanged and does not connect the canal. The lock's hydraulic dimensions and operation are deferred engineering values. Detailed endpoints are in the [frozen water diagram](WATER_NETWORK_V1_0_0.svg) and [connectivity report](GEOGRAPHY_CONNECTIVITY_VALIDATION.md).

### Crossing code reconciliation

| Drawing code | Structure ID | Physical span ID | Type |
| --- | --- | --- | --- |
| V1 | `viaduct-calderwick` | `span-viaduct-calderwick-01` | Railway viaduct |
| V2 | `viaduct-ironhaven` | `span-viaduct-ironhaven-01` | Railway viaduct |
| B1 | `bridge-greyhaven-rail` | `span-bridge-greyhaven-rail-01` | Railway bridge |
| B2a | `bridge-dunmere-rail` | `span-bridge-dunmere-rail-01` | First span of one bridge structure |
| B2b | `bridge-dunmere-rail` | `span-bridge-dunmere-rail-02` | Second span of the same structure |
| B3 | `bridge-westford-weaver-rail` | `span-bridge-westford-weaver-rail-01` | Railway bridge |
| B4 | `bridge-mere-trunk` | `span-bridge-mere-trunk-01` | Railway bridge |
| B5 | `bridge-westford-calder-trunk` | `span-bridge-westford-calder-trunk-01` | Railway bridge |
| B6 | `bridge-capital-calder-feeder` | `span-bridge-capital-calder-feeder-01` | Railway bridge |
| B7 | `bridge-capital-weaver-southern` | `span-bridge-capital-weaver-southern-01` | Railway bridge |
| B8 | `bridge-westford-canal-southern` | `span-bridge-westford-canal-southern-01` | Railway bridge |
| B9 | `bridge-capital-canal-southern` | `span-bridge-capital-canal-southern-01` | Railway bridge |
| A1 | `aqueduct-mere` | `span-aqueduct-mere-01` | Canal aqueduct |

There are **12 main crossing structures and 13 spans**: nine bridge structures with ten spans, two viaducts with two spans, and one aqueduct with one span. B2 is the bridge structure grouping; B2a and B2b are its two physical codes. The local pedestrian `bridge-weaver-towpath` crosses `feature-local-mill-feeder` and is excluded from the 12/13 intercity-crossing count.
