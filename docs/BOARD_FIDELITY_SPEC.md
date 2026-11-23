# Brass Birmingham — Board Fidelity Specification

**Document:** BOARD_FIDELITY_SPEC.md  
**Project:** Brass Birmingham Interactive World  
**Status:** Active — Phase 1  
**Scope:** Day and Night board reconstruction  
**Authority:** Canonical board preservation specification

---

## 1. Purpose

This document defines the requirements for accurately reconstructing both sides of the original Brass Birmingham board for an interactive 2.5D web environment.

The reconstructed board will become the visual foundation of the application.

The primary objective is visual and geographical fidelity, not artistic reinterpretation.

Every original city name, position, connection, industry space, symbol, track, and printed board element must be preserved.

This specification applies to:

- Reference image acquisition.
- Image processing.
- Coordinate extraction.
- Board data modeling.
- Blender scene construction.
- GLB export.
- Three.js rendering.
- Future visual enhancements.

All implementation decisions must comply with this document.

## 2. Core Principles

### 2.1 Original board is the source of truth

The original physical board or an authorized, verified digital reference is the authoritative source.

No generated artwork, AI reconstruction, approximate map, or unofficial interpretation may replace missing original information.

### 2.2 Fidelity before aesthetics

Visual enhancements must never compromise the accuracy of the original board.

When an aesthetic decision conflicts with fidelity, fidelity takes priority.

### 2.3 Data and rendering separation

The board's geography must be stored independently from Blender and React components.

Blender and Three.js consume the board data. They must not become independent sources of geographical truth.

### 2.4 Reproducibility

The board must be reproducible from its source assets, manifests, and Blender scripts.

Manual modifications must be documented and must not silently replace canonical data.

## 3. Supported Board Sides

Both official board sides are supported:

- Day
- Night

Each side must have its own:

- Reference image.
- Asset provenance.
- Element inventory.
- City coordinate manifest.
- Industry coordinate manifest.
- Connection graph.
- Board-element manifest.
- Blender scene.
- Validation report.

Shared TypeScript schemas and rendering components should be used wherever possible.

Never assume that an element's coordinates or appearance are identical across both sides without verification.

## 4. Source Authority and Provenance

Every source asset must have documented provenance.

Recommended source hierarchy:

1. Verified physical Brass Birmingham board.
2. Authorized high-resolution publisher artwork.
3. Official publisher documentation.
4. Verified supplementary board photographs.
5. Community references used only when their identity and accuracy can be established.

Potential source:

https://roxley.com/products/brass-birmingham

Every acquired asset must document:

- Source URL or physical acquisition method.
- Board edition.
- Board side.
- Original resolution.
- Acquisition date.
- Copyright holder, if known.
- License or permission status.
- SHA-256 checksum.
- Image processing history.

Community image availability does not imply permission for redistribution or commercial use.

If an asset's licensing is unclear, mark it as `restricted` until resolved.

Do not silently use restricted assets in a public production deployment.

## 5. Board Element Inventory

The following categories must be inventoried independently for both sides.

### 5.1 Geographical elements

- Cities.
- City labels.
- City boundaries.
- City spaces.
- City-related symbols.

### 5.2 Industry elements

- Cotton mill spaces.
- Coal mine spaces.
- Iron works spaces.
- Brewery spaces.
- Manufactured goods spaces.
- Industry symbols and values.

### 5.3 Transportation elements

- Canal routes.
- Railway routes.
- Connection endpoints.
- Route symbols.
- Transportation-related printed elements.

### 5.4 Commercial elements

- Merchant locations.
- Merchant symbols.
- Merchant-related spaces.
- Associated board elements.

### 5.5 Tracks and markets

- Income track.
- Victory point track.
- Resource markets.
- Resource values.
- Printed numerical indicators.

### 5.6 Decorative and structural elements

- Board borders.
- Section headings.
- Decorative illustrations.
- Printed text.
- Background artwork.
- Other original printed details.

No category may be omitted merely because it is not immediately relevant to tournament functionality.

## 6. Fidelity Rules

### 6.1 Text preservation

All original city names and printed text must remain unchanged.

Do not:

- Translate names.
- Rename cities.
- Correct original typography.
- Replace original labels with generated text.
- Invent unreadable text.

When text cannot be verified, mark it as unresolved.

### 6.2 Position preservation

Every element must retain its relative position on the board.

Coordinates must be derived from the normalized reference image.

Do not estimate positions from memory or from unrelated board photographs.

### 6.3 Connection preservation

Every canal and railway connection must have verified endpoints.

Connection topology must be validated independently from visual appearance.

Do not infer a playable connection simply because two locations appear close together.

### 6.4 Symbol preservation

All original symbols, numbers, and industry indicators must be represented accurately.

Do not substitute visually similar but semantically different symbols.

### 6.5 Visual preservation

The original board artwork must remain intact as the authoritative visual layer.

Additional 3D geometry must not obscure or replace original printed information.

## 7. Coordinate System

Use normalized image coordinates.

Coordinate origin:

- Top-left: `(0, 0)`
- Top-right: `(1, 0)`
- Bottom-left: `(0, 1)`
- Bottom-right: `(1, 1)`

Every position must be independent of source image resolution.

### 7.1 Coordinate conversion

For an image of width `W` and height `H`:

```ts
const pixelX = normalizedX * W;
const pixelY = normalizedY * H;
```

For conversion into a centered Three.js board coordinate system:

```ts
const worldX = (normalizedX - 0.5) * boardWidth;
const worldZ = (0.5 - normalizedY) * boardHeight;
```

The board should lie on the XZ plane, with Y representing elevation.

### 7.2 Coordinate types

```ts
type NormalizedPoint = {
  x: number;
  y: number;
};

type BoardSide = "day" | "night";

type VerificationStatus =
  | "unverified"
  | "verified"
  | "rejected";
```

### 7.3 Precision

Store coordinates with sufficient decimal precision.

Do not round coordinates during extraction.

Every manually verified coordinate must be traceable to its original reference.

## 8. Canonical Board Data

Board data must be independent from rendering.

Recommended structure:

```text
brass-world/
  data/
    shared/
      board-types.ts

    day/
      cities.json
      industries.json
      connections.json
      board-elements.json

    night/
      cities.json
      industries.json
      connections.json
      board-elements.json
```

### 8.1 City schema

```ts
type BoardCity = {
  id: string;
  name: string;
  side: BoardSide;
  position: NormalizedPoint;
  verification: VerificationStatus;
  sourceReference: string;
};
```

### 8.2 Industry schema

```ts
type BoardIndustry = {
  id: string;
  type: string;
  side: BoardSide;
  polygon: NormalizedPoint[];
  verification: VerificationStatus;
};
```

### 8.3 Connection schema

```ts
type BoardConnection = {
  id: string;
  side: BoardSide;
  from: string;
  to: string;
  type: "canal" | "railway";
  geometry: NormalizedPoint[];
  verification: VerificationStatus;
};
```

### 8.4 Element schema

Additional board elements must have stable IDs, categories, normalized geometry, and verification metadata.

IDs must remain stable across application updates.

## 9. Image Asset Requirements

Maintain separate source and production assets.

Recommended structure:

```text
public/assets/brass/
  source/
    day/
    night/

  master/
    day-board-master.png
    night-board-master.png

  web/
    day-overview.webp
    night-overview.webp
    day-2k.webp
    night-2k.webp
    day-4k.webp
    night-4k.webp

  validation/
    day/
    night/
```

### Requirements

- Preserve the original source image.
- Never overwrite source images during processing.
- Correct perspective distortion when necessary.
- Preserve aspect ratio.
- Avoid unnecessary cropping.
- Avoid generative image reconstruction.
- Avoid destructive compression.
- Document every transformation.

The master image must remain the canonical texture source.

## 10. Blender Scene Requirements

Maintain an editable Blender master scene.

Recommended collections:

```text
BOARD
  Board_Base
  Board_Surface
  Board_Border

ANCHORS
  Cities
  Industries
  Connections
  UI_Elements

TERRAIN
  Base_Depth

LIGHTING
  Key_Light
  Fill_Light
  Ambient

CAMERAS
  Overview
  Reference
```

### Requirements

- Preserve the original board aspect ratio.
- Apply the verified master image as the board texture.
- Use shallow physical board thickness.
- Create named Empty objects for interaction anchors.
- Keep anchor positions synchronized with canonical manifests.
- Use consistent world-coordinate conventions.
- Use an orthographic reference camera.
- Avoid decorative 3D additions during Phase 1.

The Day and Night scenes must follow identical structural conventions.

## 11. Rendering and Export Requirements

Required deliverables:

- Editable Blender master scene.
- Day GLB.
- Night GLB.
- Original master images.
- Board manifests.
- Coordinate schema.
- Preview renders.

Exported GLB files must preserve:

- Geometry.
- Material assignments.
- Texture references or embedded textures.
- Correct scale.
- Correct orientation.
- Named objects and interaction anchors where required.

Verify each exported asset by reopening it in an independent viewer or loading it through a test Three.js scene.

## 12. Validation Requirements

Validation must be performed independently for Day and Night.

### 12.1 Image validation

- Board boundaries match.
- Aspect ratio matches.
- No unintended stretching.
- No missing sections.
- No unintended color changes.
- No missing printed information.

### 12.2 Element validation

- Complete city inventory.
- Complete industry inventory.
- Complete route inventory.
- Complete merchant inventory.
- Complete printed-element inventory.

### 12.3 Coordinate validation

Every city and industry position must be visually checked against the canonical reference.

Every connection must have verified endpoints.

### 12.4 Visual comparison

Generate:

- Reference image.
- Blender render.
- 50% opacity overlay.
- Difference map.

Visual similarity metrics may be used as supporting evidence, but cannot independently prove semantic correctness.

### 12.5 Export validation

- Blender scene opens.
- GLB loads.
- Textures render.
- Geometry has the correct dimensions.
- Anchor coordinates remain consistent.
- No missing materials or textures.

## 13. Allowed Modifications

During Phase 1:

- Perspective correction.
- Image normalization.
- Lossless image preparation.
- Shallow board thickness.
- Board border geometry.
- Named interaction anchors.
- Lighting adjustments that preserve artwork appearance.

## 14. Forbidden Modifications

During Phase 1:

- Changing city names.
- Moving printed elements.
- Inventing connections.
- Removing board elements.
- Replacing original artwork.
- Generating missing details with AI.
- Adding decorative factories or buildings.
- Adding animated trains.
- Changing industry symbols.
- Reinterpreting the original geography.

Future 2.5D effects must be implemented as separate visual layers.

## 15. Acceptance Criteria

Phase 1 cannot be marked complete unless all of the following are satisfied:

| Requirement | Acceptance |
|---|---|
| Day reference | Verified |
| Night reference | Verified |
| Asset provenance | Documented |
| Usage permissions | Documented |
| City names | 100% verified |
| City coordinates | 100% verified |
| Industry inventory | Complete and verified |
| Connection endpoints | 100% verified |
| Board elements | Complete inventory |
| Blender scenes | Successfully rendered |
| GLB exports | Successfully loaded |
| Visual comparison | Reviewed |
| Critical discrepancies | Zero unresolved |

Any unavailable or unverifiable information must be explicitly reported.

Do not claim complete fidelity while unresolved discrepancies remain.

## 16. Change Management

Any modification affecting canonical board data requires:

1. Identification of the affected element.
2. Reference evidence.
3. Explanation of the proposed modification.
4. Validation against the source.
5. Updated manifest.
6. Updated validation report.

Do not silently overwrite verified coordinates or source assets.

All changes to board data must be traceable.

## 17. Future 2.5D Compatibility

This specification must remain compatible with future implementation of:

- React Three Fiber.
- Three.js.
- Cinematic camera transitions.
- Clickable city locations.
- Interactive industry elements.
- Contextual application panels.
- Day/Night switching.
- World-based navigation.

The canonical board data must remain independent of the application navigation system.

## 18. Final Principle

The goal is not to create a board inspired by Brass Birmingham.

The goal is to create a faithful, digitally reconstructed Brass Birmingham board that can become an interactive 2.5D environment.

Visual quality, animation, lighting, and immersion are important, but none of them justify compromising the original board's identity, geography, or game elements.