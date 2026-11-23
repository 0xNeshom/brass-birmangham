"""Create a deterministic SHA-256 inventory of the Phase 1 frozen artifacts."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "design-source/world.json",
    "design-source/render_frozen_baseline.py",
    "design-source/render_frozen_topology.py",
    "design-source/validate_frozen_geography.py",
    "design-source/create_freeze_manifest.py",
    "design-source/GEOGRAPHY_V1_0_0_EQUIVALENCE.txt",
    "WORLD_GEOGRAPHY_SPEC.md",
    "WORLD_ROUTE_DESIGN.md",
    "WORLD_COORDINATE_PLAN.md",
    "WORLD_ASSET_MANIFEST.md",
    "PHASE_1_COMPLETION_REPORT.md",
    "PHASE_1_FINAL_FREEZE_REPORT.md",
    "GEOGRAPHY_CONNECTIVITY_VALIDATION.md",
    "GEOGRAPHY_VALIDATION_REPORT.json",
    "GEOGRAPHY_DAY_V1_0_0.png",
    "GEOGRAPHY_NIGHT_V1_0_0.png",
    "GEOGRAPHY_COMPARISON_V1_0_0.png",
    "WATER_NETWORK_V1_0_0.svg",
    "RAIL_NETWORK_V1_0_0.svg",
]
items = []
for rel in FILES:
    path = ROOT / rel
    content = path.read_bytes()
    items.append({"path": rel, "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)})
manifest = {
    "manifest_version": "1.0.0",
    "baseline_id": "calder-marches-geography-v1.0.0",
    "freeze_date": "2026-11-23",
    "authority": "design-source/world.json",
    "geometry_sha256": json.loads((ROOT / "GEOGRAPHY_VALIDATION_REPORT.json").read_text())["geometry_sha256"],
    "artifacts": items,
}
(ROOT / "GEOGRAPHY_FREEZE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"PASS: manifest records {len(items)} artifacts")
