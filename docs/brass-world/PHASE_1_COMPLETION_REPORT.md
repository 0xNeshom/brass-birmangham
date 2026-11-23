# The Calder Marches — Phase 1 completion report

**Status: design package prepared for review. Phase 1 approval is pending.**

The Calder Marches is an original fictional industrial province. This package presents the proposed design for owner approval before the 2D geography is frozen. No Blender reconstruction has started.

## Review artifacts

| Artifact | Question it answers |
| --- | --- |
| [Concept presentation](WORLD_CONCEPT_PRESENTATION.pdf) and [geography preview](WORLD_GEOGRAPHY_PREVIEW.png) | Does the basin read clearly at a glance, and do Day and Night feel like two editions of the same atlas? |
| [World design](WORLD_DESIGN_SPEC.md) and [geography](WORLD_GEOGRAPHY_SPEC.md) | Do the terrain, settlement sequence, and regional economies explain the composition? |
| [City registry](WORLD_CITY_REGISTRY.md) and [industry registry](WORLD_INDUSTRY_REGISTRY.md) | Are the twelve identities distinct and do their industries fit the landscape? |
| [Route design](WORLD_ROUTE_DESIGN.md) and [coordinate plan](WORLD_COORDINATE_PLAN.md) | Are corridors, crossings, and transfers legible? Can the approved design become a shared data source? |
| [Visual language](VISUAL_LANGUAGE.md) and [asset manifest](WORLD_ASSET_MANIFEST.md) | Do the atlas lettering, inks, symbols, materials, and relief describe a consistent world? |

## Design review checklist

| Criterion | Status |
| --- | --- |
| World identity and industrial history | Documented |
| All twelve city names and identities | All supplied names retained. Proposed identities await owner approval |
| Five regions and industrial distribution | Documented |
| River, canal, and railway systems | Documented independently, with confluences and transfers called out |
| Geographical composition | Presented as a schematic for approval |
| Visual language, Day and Night concepts, and restrained relief | Documented and presented |
| All required design documents and concept presentation | Included in this package |
| No unresolved geographical contradictions | Checked at schematic scale for city placement, drainage direction, separation of river and canals, and route continuity. Exact gradients and engineering locations are later surveys |
| Canonical coordinates | Intentionally deferred until the owner approves the layout |

The original reconstruction track is retained in its earlier documents. The Calder Marches has independent geography and a shared Day/Night topology. Stable IDs, normalized trim coordinates, and separate city, industry, route, and landmark records let the future renderers share one source of truth. No app code, database schema, or 3D assets were produced for this phase.

## Owner decision

Review the presentation first, then the registries for detail. Approve or request revisions to these five items as a single checkpoint:

1. The 3:2 north-up composition and its five zone boundaries.
2. The twelve city identities, distribution, and relative importance.
3. The river system, canal corridors, rail corridors, and major transfers.
4. The antique atlas visual language and shallow depth hierarchy.
5. The Day and Night treatments with shared geography.

After approval, freeze a map revision and record its canonical coordinates using the coordinate plan. Phase 2 and Blender reconstruction are gated on owner approval.
