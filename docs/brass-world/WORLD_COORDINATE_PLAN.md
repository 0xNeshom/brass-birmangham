# The Calder Marches — coordinate plan

**Phase 1 · Convention proposed, coordinates pending owner approval**

## Geographic reference frame

Use the inner trim rectangle of the landscape 3:2 map, excluding page margins, title panels, and decorative outer frame. North is up. Position uses normalized `[u, v]`, with u increasing east and v increasing south.

| Trim corner | Coordinate |
| --- | --- |
| Top left | (0, 0) |
| Top right | (1, 0) |
| Bottom left | (0, 1) |
| Bottom right | (1, 1) |

Draft map illustration placements are for composition review. They carry no canonical coordinate values. Paper, terrain, and decorations can bleed past trim in render assets. Anchors and route vertices stay inside it.

When implementing, preserve the physical aspect ratio. For a rendered trim of width W and height H, with W/H = 3/2, map to Blender's horizontal XY plane as `((u - .5)W, (.5 - v)H, z)`. For a Three.js Y-up world, use `((u - .5)W, elevation, (v - .5)H)`. North points toward negative Z in the browser. Elevation is a separate scene value and does not enter normalized geometry. Keep reference fixtures at the four corners and center to catch exporter flips.

## Data ownership and anchors

| Record | Stable reference and geometry |
| --- | --- |
| Region | Durable slug and boundary polygon. Boundary edges follow terrain or watershed features. |
| City | Slug from the [city registry](WORLD_CITY_REGISTRY.md). Geographic anchor at the settlement center. Label placement can use a separate offset. |
| Industry | Own ID, category, city or region reference, footprint or point, and marker role. |
| Route | Own segment ID and mode. Endpoint node IDs and an ordered polyline. A mapped crossing is independent of a transfer node. |
| Landmark | Own ID and point or footprint. Can reference a bridge, lock, confluence, station, or port. |
| Camera anchor | Own ID and a target reference into the map. Store framing intent and optional offsets per approved view. Resolve the target from geographic data when a renderer consumes it. |

Separate registries own their own records. Shared map geometry has a revision ID. Both Day and Night styles reference the same revision. Asset IDs are independent of geography and can provide variant-specific materials. Define these records during implementation after review. No application types, production manifests, or camera code are part of this phase.

## Coordinate sign-off

1. Approve the trim, composition, city hierarchy, and networks in the [concept presentation](WORLD_CONCEPT_PRESENTATION.pdf).
2. Freeze a dated approved map revision. Pin city anchors, confluences, route nodes, crossings, and major landmarks on a common overlay using the same trim rectangle.
3. Trace routes and close region polygons. Preserve explicit endpoints and distinguish a crossing from a transfer. Compare an annotated overlay at overview scale and at individual junctions.
4. Check bounds, unique IDs, references, polygon closure, route endpoints, and aspect ratio. Verify that Day and Night overlays agree and that each renderer places the four test corners and center consistently.
5. Obtain a separate sign-off on the recorded coordinates, then publish them with the map revision. If geography changes, version the affected records and update both visual variants together.

See [geography](WORLD_GEOGRAPHY_SPEC.md), [routes](WORLD_ROUTE_DESIGN.md), and [world design](WORLD_DESIGN_SPEC.md).
