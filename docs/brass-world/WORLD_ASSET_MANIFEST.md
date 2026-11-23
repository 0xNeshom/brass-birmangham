# The Calder Marches — World Asset Manifest

Design proposal v1 • 23 November 2026 • Production assets pending geographical and visual approval

This register defines reusable asset families for the original Calder Marches atlas. It covers planned work and the Phase 1 concept outputs. It does not certify production geometry or rights to assets that have not been created or acquired. [Visual Language](VISUAL_LANGUAGE.md), [City Registry](WORLD_CITY_REGISTRY.md), [Industry Registry](WORLD_INDUSTRY_REGISTRY.md) and [Coordinate Plan](WORLD_COORDINATE_PLAN.md) define their use.

## Phase 1 design deliverables

| Identifier | Artifact | Status and authority |
| --- | --- | --- |
| concept-presentation-v1 | [World Concept Presentation](WORLD_CONCEPT_PRESENTATION.pdf) | Original proposed composition, visual treatments and depth examples. Owner review artifact. Page positions are provisional |
| concept-geography-v1 | [World Geography Preview](WORLD_GEOGRAPHY_PREVIEW.png) | 1800 × 1200 overview from the presentation. Original schematic illustration for review |
| design-world-v1 | [World Design Specification](WORLD_DESIGN_SPEC.md) | Creative scope, history and approval criteria |
| design-geography-v1 | [World Geography Specification](WORLD_GEOGRAPHY_SPEC.md) | Proposed terrain and settlement relationships |
| design-cities-v1 | [World City Registry](WORLD_CITY_REGISTRY.md) | Twelve stable city identifiers with proposed identities |
| design-industry-v1 | [World Industry Registry](WORLD_INDUSTRY_REGISTRY.md) | Economic and pictogram families, with no scoring semantics |
| design-routes-v1 | [World Route Design](WORLD_ROUTE_DESIGN.md) | Proposed river, canal and rail corridors |
| design-coordinates-v1 | [World Coordinate Plan](WORLD_COORDINATE_PLAN.md) | Future normalized coordinate convention and approval gate |
| design-visual-v1 | [Visual Language](VISUAL_LANGUAGE.md) | Original atlas styling and shallow depth budgets |

The presentation and drawings must identify any generated artistic imagery as a concept reference. A generated image cannot supply authoritative names, endpoints or coordinates. The design registries and owner-approved composition will establish those facts in a later phase.

## Planned reusable production assets

| Asset family and proposed identifier | Contents | Shared geometry and variant treatment | Future delivery and status |
| --- | --- | --- | --- |
| paper-board | Thin 3:2 atlas sheet, original border and gentle edge wear | Shared dimensions and UV convention. Day and Night paper surfaces separately authored | Editable source, lossless surface masters and compressed runtime derivatives. Planned |
| terrain-uplands | Contours, rock hachures, moor texture and mine spoil engraving | Shared terrain footprints. Green/walnut Day inks, slate/charcoal Night inks | Vector master plus limited relief if approved. Planned |
| terrain-fields-woods | Field boundaries, pasture marks, orchard and woodland clusters | Shared extents with independently tuned ink density per variant | Reusable original vector motifs. Planned |
| water-basin | Main Calder, Weaver and Mere banks and fill | Shared path geometry. Separate Day/Night water inks | Vector source and optional shallow river inset. Planned |
| transport-canal | Canal strokes, wharves, lock ticks and junctions | Shared corridor centerlines and infrastructure IDs | Reusable symbols tied to future route records. Planned |
| transport-rail | Rails, sleepers, stations, junctions and viaduct strokes | Shared corridor centerlines. Walnut Day and copper Night treatment | Reusable original vector kit and selected shallow relief. Planned |
| city-anchor | Circle anchor, town engraving and optional importance ring | Shared city ID and position. Separate surface/ink materials | Reusable anchor source with city-specific silhouettes. Planned |
| industry-markers | Pick, furnace, spool, barrel, gear and crate plaques | Shared category IDs, unique pictogram per industry | Original vector masters and shallow plaques. Planned |
| landmark-mill | Low engraved mill frontage and waterwheel profile | Millbrook family, smaller reuse where geography permits | Editable low-relief source. Planned |
| landmark-foundry | Furnace profile, chimney grouping and casting shed | Ironhaven, Copperfield and Foundry Vale variants | Editable low-relief source with optional Night light mask. Planned |
| landmark-commerce | Crane, warehouse, market hall and dock profiles | Greyhaven, Rivermouth and Ashbourne variants | Editable low-relief source. Planned |
| landmark-crossings | Masonry bridge, rail viaduct and lock flight | Placement comes from approved crossing records | Editable low-relief source. Planned |
| atlas-ornament | Compass, cartouche, corner flourishes and legend samples | Shared original design with brass Day and copper Night inks | Vector master. Planned |
| labels | City, region, river, route and information typography | Shared semantic text and anchors, variant colors | Text retained separately from art. Planned |
| focus-overlay | City perimeter, district wash and route focus stroke | Same geographical footprint with Day/Night contrast choices | Future rendering specification. Planned |

## Fonts and provenance

The planned families are Cinzel Medium for title/region display, Libre Baskerville for geographical labels and city names, and Barlow for information and numbers. Existing application font choices do not establish which font binaries are included in a future deliverable. Record the exact family, version, source URL, file checksum, copyright notice, license and embedding/subsetting terms with every acquired font file. The presentation author must record any substitute in its colophon. No additional npm dependency is required by this design task.

All terrain, architecture, symbols, ornament and map composition are to be created for this fictional world. Original Brass Birmingham board photographs and artwork are excluded from this asset set. The historical [Asset Acquisition Report](ASSET_ACQUISITION_REPORT.md) documents an earlier investigation and remains background evidence rather than an asset source for this direction.

For each future source asset, retain its stable identifier, author or tool, creation date, original editable path, intended use, variant coverage, license or ownership record, SHA-256, revision, and approval state. For generated artistic references retain the prompt and tool and label their role as concept art. Approval of a geography drawing does not automatically approve every visual material or model.

## Organization and future acceptance

Use one approved geography revision for both environments. Surface art is keyed by semantic family and variant rather than duplicating city or connection data. Reusable bridge and industry assets refer to stable record IDs. Their dimensions and rendering transforms belong to a future asset record, while their world positions belong to the geography registries. This allows Blender and React Three Fiber to consume the same design without either tool becoming the authority for city placement.

At the production handoff, verify source and derivative checksums, font notices, original authorship records, shared Day/Night footprints, readable labels and route crossings, and shallow height budgets. The initial atlas must load with its essential information intact before optional relief or light layers. Phase 1 approval covers composition, city distribution, transport, visual language and both environment treatments. Blender reconstruction has not started in this task.
