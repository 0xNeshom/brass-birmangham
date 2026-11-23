# The Calder Marches — Visual Language

Design proposal v1 • 23 November 2026 • Awaiting project-owner approval

The Marches is an industrial survey atlas drawn on a broad sheet of parchment. The visual focus is the river basin and its settlements, with modest engraved structures showing how work follows terrain. The composition uses a north-up, landscape 3:2 trim. Day and Night share the same coastline, terrain outlines, city centers, transport geometry, label anchors and landmark footprints.

Read this with [World Design](WORLD_DESIGN_SPEC.md), [Geography](WORLD_GEOGRAPHY_SPEC.md), [Routes](WORLD_ROUTE_DESIGN.md), [Coordinate Plan](WORLD_COORDINATE_PLAN.md), and the [concept presentation](WORLD_CONCEPT_PRESENTATION.pdf). Presentation drawings are proposed composition and artistic references. Their page coordinates do not establish canonical world data.

## Palette and material roles

| Token | Hex | Day use | Night use |
| --- | --- | --- | --- |
| Parchment | #D7C39A | Main paper field | Small exposed paper areas and subdued marginalia |
| Ivory | #E5D6B7 | Clear label grounds and gentle highlights | City labels and essential information |
| Aged Brass | #A17A43 | Border, title ornament, city rings | Muted frame and unlit metal |
| Forest Green | #405444 | Forest hatching, regional washes | Sparse green-black terrain traces |
| Walnut | #554334 | City type, contours and rails | Timber and relief shadow |
| Charcoal | #292A27 | Deep ink in small text | Main paper field, retaining visible grain |
| Copper | #9A6547 | Foundry details and small accents | Rail ink, markers and industrial metal |
| Slate | #8B9690 | Water highlight and muted secondary detail | Contours and subdued geographical lettering |

Paper texture remains low amplitude so it never resembles stains over information. Apply an engraved edge and sparse corner wear rather than yellowing every pixel. Forests use clustered short hatches that reveal open paths. Water has a pale central field and darker banks. A narrow deep teal ink, #315D5B in Day and #8BABA1 in Night, separates canal marks from river banks. Use charcoal type on clear Day paper and ivory type on Night paper. Brass and copper are accents rather than the sole ink for small labels.

## Typography and hierarchy

Use Cinzel Medium for the atlas title and regional capitals, Libre Baskerville for city names and geographic names, and Barlow for small information labels. These roles connect the atlas to the application's existing Libre Baskerville and Barlow families. Cinzel is a proposed future asset and requires its font file and license to be recorded before production. The concept presentation may use an available serif substitute and must disclose the substitution.

| Role | Treatment at a 1500 × 1000 design view | Placement rule |
| --- | --- | --- |
| Atlas title | Cinzel Medium, 34 px, modest tracking | Upper margin within a compact title cartouche |
| Region | Cinzel Medium, 18 px, spaced capitals | Broad open terrain, never over a city label |
| City | Libre Baskerville Regular, 18–22 px | Stable external label with a quiet paper ground |
| River and terrain | Libre Baskerville Italic, 15–17 px | Follow a gentle curve without reversing reading direction |
| Industry and information | Barlow Medium, 15–16 px | Short terms in the legend or close view |
| Numerical labels | Barlow with tabular numerals, 16 px | Upright, clear ground, minimum three-digit allowance |

These are design-view targets, not fixed browser font sizes. At overview, all twelve city names must remain readable. When the entire map is scaled into a phone viewport, retain short region names and selected city names and provide readable labels through the future detail view. Never shrink essential content until it becomes decoration. Geographic names remain text assets separate from texture art, allowing future accessible equivalents and localization.

## Cartographic grammar

| Feature | Appearance | Meaning and separation |
| --- | --- | --- |
| Main river and tributaries | Two solid banks, cool fill, subtle flow chevrons at selected bends | Continuous natural drainage, gradually widening downstream |
| Canal | Narrow teal dashed line with short perpendicular lock ticks | Engineered water corridor. A lock flight carries a small stepped bracket |
| Railway | Walnut twin rail or dash-dot center with sparse sleepers in Day, copper in Night | Independent land transport. A crossing alone never implies a station or connection |
| City | Clear circular anchor with an engraved town silhouette beside it | All cities share the same anchor shape. Importance changes silhouette size, not anchor position |
| Commercial location | Small open diamond beside its warehouse or market | Trade focus attached to a city, distinct from the city anchor |
| Industry | Compact outlined plaque with a unique pictogram | Coal pick, iron furnace, textile spool, brewery barrel, manufacturing gear, commercial crate |
| Canal junction | Small open square where canal strokes actually meet | Distinct from a water crossing or a bridge |
| Railway junction | Three short converging rail strokes with a small node | Node only where service corridors join |
| Bridge | Paired short abutments and a gap in the lower feature's stroke | Explicitly records over/under order in future data |
| Region edge | Broken, low-contrast hatch transition | Region is a terrain district, not an administrative wall |
| Elevation | Fine contours with small uphill hachures | Northern uplands receive the densest contour language |

Use a single eight-point compass rose in the upper-left margin and a restrained north arrow. A double ruled border and small original corner flourishes frame the sheet. Decorative copperworks tools may appear in the title cartouche only. The legend occupies a lower margin outside the geography. Reserve unprinted space around river confluences, western farms and southern lowlands. There are no peripheral scoring tracks or copied board frames.

Every geographical crossing must be resolved in the route registry. Canal locks and wharves are local infrastructure. They do not imply rules, capacity, prices or playable actions. Engraving density varies by terrain, while symbols and line patterns remain consistent across regions.

## Two treatments of one geography

| Layer | Day | Night |
| --- | --- | --- |
| Paper | Warm parchment with ivory raised fibers | Inked charcoal paper with muted walnut fibers and a faint copper edge |
| Terrain | Muted green woods and warm ochre contour washes | Slate contours with deep green terrain masses and larger clear areas around labels |
| Industrial relief | Brass edge catches and cool, short engraving shadows | Copper edge catches with isolated warm furnace and window points |
| City anchors | Walnut outlines, parchment centers, brass importance rings | Ivory outlines, charcoal centers, copper rings with a warm dot at major works |
| Water | Light slate fill, teal banks | Dark water with pale slate banks and selective warm reflected marks |
| Routes | Dark walnut rails and teal dashed canals | Copper rails and pale teal canals, both visible independently of light pools |
| Shadows | Soft, shallow offset toward the lower right | Slightly longer, soft shadow from the same general upper-left direction |
| Decoration | Brass compass and green hatching | Copper compass and ivory marginal marks with reduced decorative density |

Night is authored from separate material and ink choices. It preserves every city and route even in unlit terrain. Illumination is limited to Ironhaven's works, Copperfield's furnaces, Greyhaven's warehouses and Rivermouth's docks, with a few small town windows. No broad bloom, emissive route tracing or flickering labels. The light spots supplement the printed marks and do not carry information by themselves.

## Restrained 2.5D hierarchy

Define the future board width as W. Values below are visual budgets awaiting a production scale check. Heights are measured above the printed paper surface and apply equally to Day and Night.

| Level | Content | Proposed maximum height |
| --- | --- | --- |
| 1 | Flat paper and thin board substrate | Surface at 0, substrate thickness about 0.006W below it |
| 2 | Contours, vegetation hatching, river banks, route engraving | Relief no greater than 0.0008W |
| 3 | City medallions and industry plaques | 0.002–0.004W |
| 4 | Selected bridges, mill fronts, furnace profiles, docks and major landmarks | 0.006–0.010W, below nearby label sightlines |
| 5 | Selection outline and focus wash | Thin overlay around a footprint, no displacement of geography |

Show architecture as an engraved silhouette extruded by a small amount. Keep roads, water and most terrain in the paper surface. The overview must read as an atlas before individual structures become visible. Future camera tests must confirm that bridges and factory profiles do not hide neighboring labels or route strokes. Selection uses a copper or brass perimeter and a short fade. A reduced-motion treatment changes state without animation.

## Review requirements

The project owner approves the full Day and Night sheets side by side, plus a close view of Ironhaven's confluence and a depth sample. Review all twelve labels at overview scale, distinguish river/canal/rail patterns in grayscale, and trace bridge crossings without guessing. Confirm that Night preserves the hierarchy of the Day sheet and that decorative structures leave routes and labels legible. Geography approval precedes exact coordinate capture and production asset work.
