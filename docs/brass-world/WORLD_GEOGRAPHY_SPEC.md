# The Calder Marches — Geography Specification

Status — Phase 1 final geography freeze complete. Canonical coordinates and topology are recorded in [design-source/world.json](design-source/world.json), revision `calder-marches-geography-v1.0.0`. The approved Phase 1.2 composition and identity are retained. See the [freeze report](PHASE_1_FINAL_FREEZE_REPORT.md) and [validation output](GEOGRAPHY_VALIDATION_REPORT.json).

Related documents — [World design](WORLD_DESIGN_SPEC.md), [city registry](WORLD_CITY_REGISTRY.md), [industry registry](WORLD_INDUSTRY_REGISTRY.md), [route design](WORLD_ROUTE_DESIGN.md), [coordinate plan](WORLD_COORDINATE_PLAN.md).

## Basin and settlement history

The province occupies a broad river basin opening east into a tidal inlet. The northern watershed is high, wet moorland cut by coal-bearing scarps. Western tributary valleys descend more gently through pasture. The basin floor widens around Ironhaven before narrowing at Greyhaven and opening again into Rivermouth’s estuary. Southern land is a low, rolling agricultural shelf drained by the Mere. A low ridge behind Copperfield separates the industrial basin from the eastern floodplain.

Settlement began at reliable crossings and mill streams. Calderwick controlled the northern crossing, Millbrook used the Weaver’s fall for mills, and Ironhaven grew at the confluence of the Calder and Weaver. Northern coal and local ironstone supported Ironhaven’s furnaces. Foundry Vale developed downstream of the older residential core, with space for furnace yards and settling ponds. Canals later moved bulk cargo around shallow river reaches. Railway construction followed broader valley benches, crossed the Copperfield saddle, and connected the coalfield without forcing barges into the uplands.

Rivermouth is the only sea-facing settlement. Greyhaven is its inland consolidation point. The word “Marches” refers to the province’s former border jurisdiction, expressed through old toll crossings and parish boundaries. It does not imply a second unexplained coastline or a fortified frontier around every city.

## Overall composition

Use a landscape atlas sheet with east to the right and north at the top. The land descends from the north and northwest toward the east. The northern upland silhouette occupies the upper third, with a break at Calderwick. Millbrook and Westford occupy the western side, Ironhaven sits near the visual center, and the eastern canal corridor leads the eye toward the estuary. Dunmere and Ashbourne balance the lower edge.

The lower Calder bends through open flood meadow between Ironhaven and Greyhaven. Keep that meadow, a patch of northern moor, and the southwest farmland comparatively empty. They provide separation between the busiest line bundles and room for regional labels. Geography continues visually into the map frame at the watershed, western road and eastern estuary. The frame is the atlas crop, rather than a physical wall around the province.

### Phase 1.2 targeted atlas refinements

The [refined composition](PHASE_1_2_GEOGRAPHY.png) retains the north-up 3:2 frame and the original placement hierarchy. The [Day/Night comparison](PHASE_1_2_DAY_NIGHT.png) uses one shared geometry source. The Ironhaven title is lifted into the open basin area; its double-ring marker separates the capital from the single-ring settlement markers. Region captions are kept away from the busiest route bundles while settlement, terrain and route geometry remain fixed.

| Area | Terrain and land cover | Settlement footprint and water edge |
| --- | --- | --- |
| Northern Uplands | Close contours trace the Brackenford shelf and Blackridge scarp. A gap narrows toward Calderwick. Woodland sits on lower sheltered slopes, with open moor above | Small pit and spoil clusters remain outside the valley floor. Calderwick sits near the river crossing, with the viaduct distinct from the settlement |
| Western Textile District | Softer contours follow the Weaver valley. Trees cluster along valley shoulders and mark the edge of open pasture | Millbrook grows along the mill reach. Westford occupies a longer terrace around its wharf and railway approach |
| Central Industrial Basin | The basin opens at the Weaver confluence. Copperfield's saddle and the Foundry Vale bench give the surrounding works firmer ground | Ironhaven has a compact civic core and distinct works, rail yard and canal basin. Foundry Vale spreads along the southern approach. Flood meadow east of the capital stays open |
| Eastern Canal District | The Calder broadens into an estuary beyond the Greyhaven narrowing. Flood meadows, reeds and tidal margins separate the river from the engineered cut | Greyhaven's warehouses occupy a raised inland terrace. Rivermouth has a sheltered dock basin beside its sea lock, with shipping frontage on the tidal inlet |
| Southern Lowlands | Wide contour spacing, hedged fields and scattered orchards surround the Mere. Wet meadow marks the tributary's floor | Dunmere is compact on the meadow edge. Ashbourne extends along the grain market and canal terminus. The Foundry reservoir supports the canal on higher ground |

### Terrain symbols and labels

The nested line symbols are **schematic elevation contours**, not mines, ore deposits, or geological targets. Inner rings indicate higher ground; close spacing indicates a steeper slope. Short inward hachures reinforce slope direction. They are canonical 2D geometry for v1.0.0, but do not encode surveyed heights or numeric gradients. A later engineered terrain surface may refine them without changing this frozen cartographic meaning.

Day and Night use the same contour paths, forest footprints, riverbanks, fields, city anchors and network paths. Day renders warm parchment and muted green relief with aged brass accents. Night uses charcoal parchment, deeper slate-green terrain, copper infrastructure, subdued shadow pools and selective amber lights at works and docks. The amber light is a material/emission treatment and adds no settlement, route or structure. See the [paired preview](PHASE_1_2_DAY_NIGHT.png).

Shared land cover, industrial footprints, shorelines, and transport geometry define both plates. Day uses warm parchment and muted green washes. Night uses dark terrain washes, copper infrastructure, and local light and reflection at works and docks. The light marks are illustrative and add no new infrastructure.

## Regional zones

| Region and stable ID | Bounds and terrain | Major cities | Resources and economy | Transport and visual expression |
| --- | --- | --- | --- | --- |
| Northern Uplands · `northern-uplands` | Northern watershed to the scarp foot at Calderwick. Brackenford occupies the northwest shelf, Blackridge the deeper northern coal basin | Brackenford, Blackridge, Calderwick | Coal seams, building stone and upland water. Extraction dominates, with handling yards at Calderwick | A rail feeder descends via the Calder gap. Pack roads serve short steep links. Tight engraved contours, heather marks, spoil tips and exposed rock |
| Western Textile District · `western-textile-district` | Weaver valley and western pasture, bounded east by the Ironhaven confluence and south by the low Mere divide | Millbrook, Westford | Water power, wool and later imported cotton. Millbrook processes cloth while Westford transfers it | Weaver towpath canal and an established road occupy the valley floor. Rail uses a higher bench. Woven field patterns, mill leats and long roofs |
| Central Industrial Basin · `central-industrial-basin` | Wide middle Calder bowl, Copperfield’s low eastern saddle, and the tributary valley of Foundry Vale | Ironhaven, Copperfield, Foundry Vale | Coal brought from the north, local ironstone and limestone, metalworking and machines | Interchange of canal basins and separate railway yards. Dense but bounded engraving, soot-gray works and brass civic roofs |
| Eastern Canal District · `eastern-canal-district` | Lower Calder floodplain from east of Ironhaven to the tidal inlet | Greyhaven, Rivermouth | Water access, clay, warehousing, coastal imports and exports | A controlled lateral canal bypasses variable river levels. Basins, lock gates and long quays characterize the strip. Reed hatching and low contours surround it |
| Southern Lowlands · `southern-lowlands` | Rolling agricultural shelf south of the industrial basin, drained by the Mere | Dunmere, Ashbourne | Barley, pasture, brewing water, grain markets and light manufacture | A canal terminates at Ashbourne. A southern railway arc connects farms, markets and foundries. Orchard dots, open fields, green hedges and pale roads |

These are cartographic regions with transition belts. Their boundaries do not imply toll rules or movement restrictions. Copperfield remains within the industrial basin despite its raised terrain. Calderwick belongs to the Uplands as its gateway, while physically occupying the scarp foot.

## Water and grade constraints

The Calder flows south from moorland east of Blackridge through Calderwick to Ironhaven, then east through Greyhaven to Rivermouth. The Weaver flows from the western hills through Millbrook and Westford and joins the Calder at Ironhaven. The Mere drains Dunmere eastward across the southern lowlands, passes south of Ashbourne and turns north east of Foundry Vale before entering the lower Calder west of Greyhaven. This keeps the Mere on the lowland floor and separates it from the southern canal's approach to Ashbourne.

The upper Calder and Weaver are shallow and interrupted by falls. They supply mills and canal water, with navigation assigned to engineered canals. The lower Calder is tidal near Rivermouth and flood-prone upstream. Its parallel canal is a distinct controlled waterway with locks at the river interfaces. Rail approaches use benches above the floodplain and viaducts at the two broad river crossings. Numeric elevations, flood levels, and structure clearances are engineering inputs outside the frozen cartographic coordinates.

## Composition consistency review

- All twelve candidate names retain their requested roles and regional bearings.
- Every commercial center has a stated water or land transport reason for existing.
- Northern coal reaches the industrial basin along the valley gap. No contour canal climbs to Blackridge.
- The Mere remains a gravity-fed drainage system. The southern canal is an engineered branch with a documented lock flight and summit supply.
- Crossings carry explicit bridge, aqueduct, or junction identities in the route design. A visual intersection alone does not create a network connection.
- Day and Night change material and illumination treatment while using this single geographical proposal.

The final freeze validator reports no unresolved topology or coordinate-reference issue. Detailed grade and curvature engineering remains deferred; the map's route positions are canonical, and future adjustments must create a versioned geography revision.
