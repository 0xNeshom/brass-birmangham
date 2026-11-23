# The Calder Marches — world design

**Phase 1 · Design proposal for project-owner review**

The Calder Marches is a fictional inland industrial province that drains into a tidal estuary. Its atlas depicts the same country in daylight and after dark. The 2.5D world will eventually give the existing tournament app a persistent sense of place. The map is a geographical and visual design, with no game rules attached to its routes, industries, or trade.

## How the province grew

- **River settlements came first.** The Calder cuts south through the elevated coal country and turns east across the basin. Houses and mills cluster on stable terraces above its tributaries. Calderwick grew at the first reliable upland crossing. Ironhaven grew where the western Weaver meets the Calder, at the point where the upland corridor widens into the basin.
- **Bulk industry followed the water.** The west’s Textile District grew from mill power and a farming hinterland. Northern coal came down the valley to Ironhaven. Foundry Vale occupies a broad bench south of the capital, with room for casting sheds and sidings. Copperfield sits on a firmer eastern terrace, suited to iron finishing and machine shops. Its name is a place name, with no implication of a local copper mine.
- **Engineered canals made the basin navigable.** A western mill canal and a southern lock flight meet the lower canal at Ironhaven. The lower cut bypasses the Calder’s shallows and reaches the tidal basin at Rivermouth through Greyhaven’s warehouses. The natural river and the cut remain separate features.
- **Rail connected mines, works, and wider markets.** Westford became the western rail junction. A separate northern feeder carries coal down the upland valley. The eastern trunk runs on firmer ground through Copperfield to the port, while the southern line reaches agricultural and commercial settlements on the lowlands’ higher margins.

## The atlas

Use a north-up 3:2 trim frame and a west-to-east visual sweep. The broken upland ridge gives way to the basin confluence, a braided industrial corridor, and an open estuary. The capital anchors the composition. Regional centers are smaller, and mines, fields, reedbeds, and the outer slopes deliberately leave room around the route lines.

The visual identity is antique Victorian cartography. Engraved landscape marks, paper grain, original industrial vignettes, and restrained brass and copper ornament make it read as a printed atlas. Relief is concentrated on a few bridges and landmarks. Day and Night share the geography, figure positions, and labels. They use separately authored inks, surfaces, and light cues.

## Scope and dependencies

The current application uses Next.js with React, an existing Three.js scene layer, and a design system built around Libre Baskerville and Barlow. The atlas can use distinct lettering inside its border while keeping application UI typography consistent. Later rendering can consume the same world data in React Three Fiber or Blender. Phase 1 records design intent and introduces no runtime integration.

The [legacy board fidelity specification](../BOARD_FIDELITY_SPEC.md) and [acquisition report](ASSET_ACQUISITION_REPORT.md) concern the earlier published-board track. The conflict is substantive: those documents require fidelity to two published faces, while this brief requires original geography and one shared layout. They remain reference records for that earlier scope. This specification governs The Calder Marches, and no layout or texture carries forward from the earlier track. No MASTER_ROADMAP.md, prior WORLD_DESIGN_SPEC.md, or WORLD_ARCHITECTURE.md was present at inspection.

## Review set

- [Geography](WORLD_GEOGRAPHY_SPEC.md), [cities](WORLD_CITY_REGISTRY.md), [industry](WORLD_INDUSTRY_REGISTRY.md), and [routes](WORLD_ROUTE_DESIGN.md)
- [Coordinate plan](WORLD_COORDINATE_PLAN.md), [visual language](VISUAL_LANGUAGE.md), and [asset manifest](WORLD_ASSET_MANIFEST.md)
- [Visual presentation](WORLD_CONCEPT_PRESENTATION.pdf) and [geography preview](WORLD_GEOGRAPHY_PREVIEW.png)
- [Completion and approval report](PHASE_1_COMPLETION_REPORT.md)
