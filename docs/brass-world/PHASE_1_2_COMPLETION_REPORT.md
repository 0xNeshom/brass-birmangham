# The Calder Marches — Phase 1.2 completion report

**Status: integrity validation complete; final geography approval and canonical coordinates pending.**

Phase 1.2 preserved the approved fictional world, antique industrial atlas direction, shared Day/Night geography, all twelve settlements and all five regions. It refined the existing composition without renaming cities or changing the world identity.

## Deliverables

- [Phase 1.2 topology registry](PHASE_1_2_TOPOLOGY.json) with 119 globally unique IDs, explicit graph nodes and endpoint sequences, 27 network segments, separate junctions, locks, transfers, structures and span entities.
- [Water topology diagram](PHASE_1_2_WATER_TOPOLOGY.svg) and [railway topology diagram](PHASE_1_2_RAIL_TOPOLOGY.svg), regenerated from the registry.
- [Refined Day geography](PHASE_1_2_GEOGRAPHY.png), [Night geography](PHASE_1_2_NIGHT.png) and [side-by-side comparison](PHASE_1_2_DAY_NIGHT.png). The Day/Night geometry fingerprint is unchanged; only material, light and atmosphere treatments differ.
- [Automated topology validator](design-source/validate_topology.py), [composition intersection checker](design-source/check_phase_1_2_composition.py) and [connectivity validation report](PHASE_1_2_CONNECTIVITY_VALIDATION.md).
- Incremental updates to the geography, route, coordinate and asset specifications. Phase 1.1 artifacts remain as historical snapshots.

The map changes are limited to a more legible Ironhaven label, a double-ring capital marker, adjusted region caption placement, and irregular elevation contours with an explicit legend. The contours represent schematic terrain height, not mining symbols, and carry no surveyed elevations.

## Validation summary

- 12 cities, each assigned to one of five regions.
- 10 directed river, 6 canal and 11 railway segments; all endpoints resolve to explicit nodes.
- 2 river confluences, 1 canal junction and 2 railway junctions represented with stable IDs.
- 12 main physical crossing structures and 13 spans: 9 bridges (10 spans), 2 viaducts and 1 aqueduct. B2 is one bridge structure; B2a and B2b are its two span codes.
- All 13 illustrated cross-mode intersections map to registry spans and corridor pairs.
- Day and Night previews use identical shared geometry and the comparison pixels match their standalone source plates.

The [connectivity report](PHASE_1_2_CONNECTIVITY_VALIDATION.md) records the exact checks and limits. No final canonical coordinates have been assigned.

## Unresolved decisions for the owner

1. Choose whether the Ironhaven canal-to-river lock sits at the Weaver–Calder confluence or at a new Calder node just downstream.
2. Approve the Phase 1.2 geography and all proposed crossing placements so canonical coordinates can be assigned.
3. Confirm that lock counts/levels and reservoir supply calculations should be deferred to the coordinate and engineering pass.

Blender reconstruction, GLB production and application implementation remain blocked until the revised geography is approved. No application, tournament or Supabase functionality was changed.
