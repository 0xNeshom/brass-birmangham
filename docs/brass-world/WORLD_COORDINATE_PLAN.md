# The Calder Marches — coordinate plan

**Phase 1 final freeze · `calder-marches-geography-v1.0.0` · 23 November 2026**

## Geographic reference frame

Use the complete approved 1800 × 1200 landscape plate as the geographic frame, including the map area beneath the title and legend. Coordinates are normalized `[u, v]`, with u increasing east and v increasing south. North is up. This is the frozen convention for this revision; margins and typography are presentation only and do not move map coordinates.

| Trim corner | Coordinate |
| --- | --- |
| Top left | (0, 0) |
| Top right | (1, 0) |
| Bottom left | (0, 1) |
| Bottom right | (1, 1) |

The single source of canonical positions, route geometry, terrain polygons, and feature placement is [design-source/world.json](design-source/world.json). Pixel coordinates from the approved Phase 1.2 artwork were transformed using `u = x / 1800`, `v = y / 1200`, rounded to eight decimal places. The approved composition is preserved; Option A adds a separate Calder node immediately downstream of the Weaver confluence and an explicit connector corridor to it. The historical Phase 1.2 artifacts remain unchanged.

When implementing, preserve the physical aspect ratio. For the full geographic frame of width W and height H, with W/H = 3/2, map to Blender's horizontal XY plane as `((u - .5)W, (.5 - v)H, z)`. For a Three.js Y-up world, use `((u - .5)W, elevation, (v - .5)H)`. North points toward negative Z in the browser. Elevation is a separate scene value and does not enter normalized geometry. Keep reference fixtures at the four corners and center to catch exporter flips.

## Data ownership and anchors

| Record | Stable reference and geometry |
| --- | --- |
| Region | Durable slug and boundary polygon. Boundary edges follow terrain or watershed features. |
| City | Slug from the [city registry](WORLD_CITY_REGISTRY.md). Geographic anchor at the settlement center. Label placement can use a separate offset. |
| Industry | Own ID, category, city or region reference, footprint or point, and marker role. |
| Route | Globally unique segment ID and mode. Both endpoint node IDs and an ordered polyline. A mapped crossing is independent of a transfer node. |
| Junction | Globally unique node ID and junction record ID, with explicit incident segment IDs. Co-location with a settlement uses a settlement reference; proximity never joins networks. |
| Landmark | Own globally unique ID and point or footprint. Can reference a bridge, lock, confluence, station, or port. |
| Camera anchor | Own ID and a target reference into the map. Store framing intent and optional offsets per approved view. Resolve the target from geographic data when a renderer consumes it. |

All geography records use globally unique IDs in the shared source. City labels, infrastructure, river/canal/rail networks, physical spans, and local features are separate entities; spatial proximity does not join networks. Both Day and Night use the same geometry hash, `b1408922756834220b8f30dcaee83dc3652f386097b99c6520aacb90092cb116`. Variant-specific materials are allowed, but variant-specific coordinates are not. No application types, production manifests, or camera code are part of this phase.

## Coordinate sign-off

The owner approved the Phase 1.2 composition and selected the separate downstream node (Option A) in the Phase 1 final-freeze request. Coordinates are now canonical for v1.0.0. Validation is automated by [validate_frozen_geography.py](design-source/validate_frozen_geography.py), with machine results in [GEOGRAPHY_VALIDATION_REPORT.json](GEOGRAPHY_VALIDATION_REPORT.json). The [freeze manifest](GEOGRAPHY_FREEZE_MANIFEST.json) pins source, diagrams, previews, and validation artifacts by SHA-256.

For each crossing, both segments, the over/under order, structure, and span are registered. Crossings are physical only and do not create transfers. The Ironhaven natural confluence, canal basin, downstream river node, lock, and railway junction are distinct records. Hydraulic calculations, lock lift and chamber dimensions, water levels/volumes, route gradients, flood setbacks, and structural clearance remain engineering work; no values for these were invented in this design freeze.

See [geography](WORLD_GEOGRAPHY_SPEC.md), [routes](WORLD_ROUTE_DESIGN.md), and [world design](WORLD_DESIGN_SPEC.md).
