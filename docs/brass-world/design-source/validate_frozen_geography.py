"""Validate and report the frozen Calder Marches geography baseline."""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design-source" / "world.json"
REPORT = ROOT / "GEOGRAPHY_VALIDATION_REPORT.json"


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def points(value):
    if isinstance(value, dict) and "x" in value and "y" in value:
        yield value
    elif isinstance(value, list):
        for child in value:
            yield from points(child)
    elif isinstance(value, dict):
        for child in value.values():
            yield from points(child)


def main() -> None:
    data = json.loads(SOURCE.read_text())
    ids: dict[str, str] = {}
    entity_lists = ("cities", "regions", "labels", "industries", "nodes", "corridors", "segments", "crossings", "infrastructure", "freight_interchanges", "features", "terrain_features", "landmarks")
    for key in entity_lists:
        for entity in data[key]:
            ident = entity.get("id")
            require(isinstance(ident, str) and ident, f"Missing stable ID: {key}")
            require(ident not in ids, f"Duplicate global ID {ident}: {ids.get(ident)} and {key}")
            ids[ident] = key
    require(data["world"]["id"] not in ids, f"Duplicate global ID {data['world']['id']}")
    ids[data["world"]["id"]] = "world"
    for structure in data["crossings"]:
        for span in structure["spans"]:
            ident = span.get("id")
            require(ident and ident not in ids, f"Missing or duplicate global span ID: {ident}")
            ids[ident] = "spans"

    nodes = {x["id"]: x for x in data["nodes"]}
    corridors = {x["id"]: x for x in data["corridors"]}
    segments = {x["id"]: x for x in data["segments"]}
    cities = {x["id"]: x for x in data["cities"]}
    regions = {x["id"]: x for x in data["regions"]}
    require(len(cities) == 12, "Expected exactly 12 settlements")
    require(len(regions) == 5, "Expected exactly five approved regions")
    require({c["region_id"] for c in cities.values()} == set(regions), "Settlement region memberships differ from approved regions")
    require(all(c["region_id"] in regions and c["id"] in regions[c["region_id"]]["settlement_ids"] for c in cities.values()), "City and region registries disagree")

    for entity in data.values():
        for p in points(entity):
            require(0 <= p["x"] <= 1 and 0 <= p["y"] <= 1, f"Out-of-frame coordinate {p}")
    for segment in segments.values():
        require(segment["start_node"] in nodes and segment["end_node"] in nodes, f"Unknown endpoint on {segment['id']}")
        require(segment["start_node"] != segment["end_node"], f"Self-loop on {segment['id']}")
        require(len(segment["geometry"]) >= 2, f"Missing polyline on {segment['id']}")
        for endpoint, node_key, edge in ((segment["geometry"][0], "start_node", "start"), (segment["geometry"][-1], "end_node", "end")):
            pos = nodes[segment[node_key]]["position"]
            require(abs(endpoint["x"] - pos["x"]) < 1e-7 and abs(endpoint["y"] - pos["y"]) < 1e-7, f"{edge} geometry mismatch on {segment['id']}")
        require(segment["corridor"] in corridors, f"Unknown corridor on {segment['id']}")
    for node in nodes.values():
        if "near_settlement" in node:
            ref = node["near_settlement"]
            require(ref in nodes and nodes[ref]["kind"] == "settlement", f"Invalid near-settlement reference on {node['id']}")
    for city in cities.values():
        sid = f"node-settlement-{city['id']}"
        require(sid in nodes and nodes[sid]["kind"] == "settlement" and nodes[sid]["position"] == city["position"], f"Settlement anchor differs from city record: {city['id']}")
    for label in data["labels"]:
        require(label["target_id"] in ids, f"Label target is not registered: {label['id']}")
    for industry in data["industries"]:
        require(industry["city_id"] in cities, f"Industry city reference is invalid: {industry['id']}")
    for c in corridors.values():
        ordered = [segments[sid] for sid in c["segments"]]
        require(all(s["corridor"] == c["id"] for s in ordered), f"Wrong segment membership: {c['id']}")
        require(all(a["end_node"] == b["start_node"] for a, b in zip(ordered, ordered[1:])), f"Disconnected corridor sequence: {c['id']}")
        require(c["nodes"] == [ordered[0]["start_node"], *[s["end_node"] for s in ordered]], f"Corridor node sequence mismatch: {c['id']}")
        require(c["geometry_ref"] == c["segments"], f"Geometry references mismatch: {c['id']}")
        if c["network_type"] == "river":
            require(all(s["network_type"] == "river" and s.get("directed") is True for s in ordered), f"River flow metadata invalid: {c['id']}")
            require(c["source"] == ordered[0]["start_node"] and c["destination"] == ordered[-1]["end_node"], f"River terminals mismatch: {c['id']}")
    require(sum(c["network_type"] == "river" for c in corridors.values()) == 3, "Expected three rivers")
    require(sum(c["network_type"] == "canal" for c in corridors.values()) == 3 and sum(c["network_type"] == "water-interface" for c in corridors.values()) == 1, "Expected three existing canals plus one separate approved outlet corridor")
    require(sum(c["network_type"] == "rail" for c in corridors.values()) == 3, "Expected three railway corridors")
    require(sum(s["network_type"] == "river" for s in segments.values()) == 11, "Expected 11 river segments")
    require(sum(s["network_type"] == "canal" for s in segments.values()) == 6, "Expected 6 canal segments")
    require(sum(s["network_type"] == "rail" for s in segments.values()) == 11, "Expected 11 railway segments")
    require(sum(s["network_type"] == "water-interface" for s in segments.values()) == 1, "Expected one explicit outlet connector")

    # Canal and railway corridor node graphs must join only at shared, explicitly named nodes.
    for mode in ("canal", "rail"):
        route_corridors = [c for c in corridors.values() if c["network_type"] == mode]
        graph = defaultdict(set)
        for c in route_corridors:
            for a, b in zip(c["nodes"], c["nodes"][1:]): graph[a].add(b); graph[b].add(a)
        remaining = set(graph)
        components = 0
        while remaining:
            components += 1; pending = [remaining.pop()]
            while pending:
                for neighbor in graph[pending.pop()]:
                    if neighbor in remaining: remaining.remove(neighbor); pending.append(neighbor)
        require(components == 1, f"{mode.title()} corridors are not explicitly connected ({components} components)")

    # Directed main rivers form an acyclic network; tributaries terminate at their named confluences.
    redges = [s for s in segments.values() if s["network_type"] == "river"]
    adj = defaultdict(list); indegree = {n: 0 for n in nodes}
    for s in redges:
        adj[s["start_node"]].append(s["end_node"]); indegree[s["end_node"]] += 1
    q = deque(n for n, d in indegree.items() if d == 0); seen = 0
    while q:
        n = q.popleft(); seen += 1
        for nxt in adj[n]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0: q.append(nxt)
    require(seen == len(nodes), "River flow contains a cycle")
    river_corridors = {c["id"]: c for c in corridors.values() if c["network_type"] == "river"}
    for c in river_corridors.values():
        for confluence in c.get("confluences", []):
            n = confluence["node_id"]
            require(n in nodes and nodes[n]["kind"] == "confluence", f"Invalid confluence on {c['id']}")
            if "receives" in confluence:
                trib = river_corridors[confluence["receives"]]
                require(trib["destination"] == n, f"Tributary endpoint mismatch at {n}")

    # Canals and rail lines are explicit route families; crossings do not create nodes/transfers.
    crossings = {x["id"]: x for x in data["crossings"]}
    span_codes = []
    for crossing in crossings.values():
        require(crossing["above"] in segments and crossing["below"] in segments, f"Unresolved crossing segment on {crossing['id']}")
        require(crossing.get("network_junction") is False, f"Physical crossing is accidentally a junction: {crossing['id']}")
        above = segments[crossing["above"]]["network_type"]
        below = segments[crossing["below"]]["network_type"]
        if crossing["structure_kind"] in {"bridge", "viaduct"}:
            require(above == "rail" and below in {"river", "canal"}, f"Bridge/viaduct over-under order invalid: {crossing['id']}")
        if crossing["structure_kind"] == "aqueduct":
            require(above == "canal" and below == "river", f"Aqueduct over-under order invalid: {crossing['id']}")
        for span in crossing["spans"]:
            require(span["structure_id"] == crossing["id"] and span["above"] == crossing["above"] and span["below"] == crossing["below"], f"Span references disagree: {span['id']}")
            require(span["physical_crossing"] is True and span["network_transfer"] is False, f"Crossing transfer semantics invalid: {span['id']}")
            span_codes.append(span["drawing_code"])
    require(sorted(span_codes) == sorted(["B1", "B2a", "B2b", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "V1", "V2", "A1"]), "Crossing codes/spans do not reconcile")
    require((len(crossings), sum(x["structure_kind"] == "bridge" for x in crossings.values()), sum(x["structure_kind"] == "viaduct" for x in crossings.values()), sum(x["structure_kind"] == "aqueduct" for x in crossings.values()), len(span_codes)) == (12, 9, 2, 1, 13), "Structure/span counts inconsistent")
    for item in data["infrastructure"]:
        require("position" in item, f"Infrastructure lacks a canonical position: {item['id']}")
        for k in ("on_segment", "from_segment", "to_segment"):
            if k in item: require(item[k] in segments, f"Unresolved {k} on {item['id']}")
        for k in ("node_id", "from_node", "to_node"):
            if k in item: require(item[k] in nodes, f"Unresolved {k} on {item['id']}")
    lock = next(x for x in data["infrastructure"] if x["id"] == "lock-ironhaven-river")
    connector = segments["canal-interface-ironhaven-01"]
    require(lock["on_segment"] == connector["id"] and lock["to_node"] == "node-river-calder-below-weaver", "Approved lock outlet does not use the separate downstream Calder node")
    calder = river_corridors["river-calder"]
    require(calder["nodes"].index(lock["to_node"]) == calder["nodes"].index("junction-river-weaver-calder") + 1, "Outlet is not immediately downstream of the Weaver confluence")
    require(lock["from_node"] == "node-junction-canal-ironhaven-basin" and lock["from_node"] in corridors["canal-weaver"]["nodes"] and lock["from_node"] in corridors["canal-lower-calder"]["nodes"] and lock["from_node"] in corridors["canal-southern"]["nodes"], "Ironhaven outlet does not begin at the explicit three-canal basin junction")

    # Every listed transfer keeps co-located modes explicit and non-through.
    for tr in data["freight_interchanges"]:
        require(all(n in nodes for n in tr["network_nodes"]) and tr["through_vehicle_connection"] is False, f"Bad freight interchange: {tr['id']}")
    served = set()
    for corridor in corridors.values():
        if corridor["network_type"] not in {"canal", "rail"}: continue
        for node_id in corridor["nodes"]:
            node = nodes[node_id]
            if node["kind"] == "settlement": served.add(node_id.removeprefix("node-settlement-"))
            if node.get("near_settlement"): served.add(node["near_settlement"].removeprefix("node-settlement-"))
    require(served == set(cities), f"Canal/rail settlement access is incomplete: {sorted(set(cities) - served)}")
    require(data["world"]["shared_geography"] is True and data["world"]["environments"] == ["day", "night"], "Day/Night parity is not declared")

    payload = {k: data[k] for k in ("cities", "regions", "nodes", "corridors", "segments", "crossings", "infrastructure", "freight_interchanges", "features", "terrain_features", "landmarks")}
    geometry_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    from PIL import Image
    day = Image.open(ROOT / "GEOGRAPHY_DAY_V1_0_0.png").convert("RGB")
    night = Image.open(ROOT / "GEOGRAPHY_NIGHT_V1_0_0.png").convert("RGB")
    pair = Image.open(ROOT / "GEOGRAPHY_COMPARISON_V1_0_0.png").convert("RGB")
    require(day.size == (1800, 1200) and night.size == day.size and pair.size == (3600, 1200), "Frozen preview dimensions differ")
    require(pair.crop((0, 0, 1800, 1200)).tobytes() == day.tobytes(), "Comparison Day panel differs from standalone render")
    require(pair.crop((1800, 0, 3600, 1200)).tobytes() == night.tobytes(), "Comparison Night panel differs from standalone render")
    result = {"status": "PASS", "baseline_id": data["baseline_id"], "freeze_date": data["freeze_date"], "source": "design-source/world.json", "geometry_sha256": geometry_hash, "global_unique_ids": len(ids), "counts": {"settlements": len(cities), "regions": len(regions), "nodes": len(nodes), "corridors": len(corridors), "segments": len(segments), "river_segments": 11, "canal_segments": 6, "rail_segments": 11, "water_interface_segments": 1, "crossing_structures": len(crossings), "bridge_structures": 9, "viaducts": 2, "aqueducts": 1, "spans": len(span_codes), "terrain_features": len(data["terrain_features"])}, "checks": ["global ID uniqueness", "normalized coordinate bounds", "city/node anchors and labels/industries references", "endpoint and ordered corridor continuity", "canal and rail connectivity with all settlements served", "river flow acyclicity and confluence terminals", "crossing references, over-under order, and non-transfer semantics", "B1-B9/V1-V2/A1 structure/span counts", "approved separate Ironhaven downstream lock outlet", "explicit freight interchanges", "shared Day/Night source geometry", "standalone/comparison render dimensions and exact panel parity"]}
    REPORT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"PASS: {len(ids)} unique IDs; 12 settlements; 5 regions; 29 network segments; 12 crossing structures / 13 spans; geometry SHA-256 {geometry_hash}")


if __name__ == "__main__":
    main()
