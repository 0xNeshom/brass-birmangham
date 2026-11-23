"""Validate Phase 1.2 network identity, references, flow, and drawing parity."""
from __future__ import annotations

import json
import runpy
from collections import defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "PHASE_1_2_TOPOLOGY.json"
COMPOSITION = ROOT / "design-source" / "PHASE_1_2_COMPOSITION_CHECK.json"
RENDERER = ROOT / "design-source" / "render_phase_1_2.py"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> None:
    data = json.loads(REGISTRY.read_text())
    composition = json.loads(COMPOSITION.read_text())
    entities: dict[str, dict] = {}
    collections = ("nodes", "corridors", "segments", "crossings", "infrastructure", "freight_interchanges", "features")
    for collection in collections:
        for item in data.get(collection, []):
            entity_id = item.get("id")
            require(isinstance(entity_id, str) and entity_id, f"Missing ID in {collection}: {item}")
            require(entity_id not in entities, f"Duplicate global ID: {entity_id}")
            entities[entity_id] = item
    for crossing in data["crossings"]:
        for span in crossing.get("spans", []):
            entity_id = span.get("id")
            require(isinstance(entity_id, str) and entity_id, f"Missing span ID in {crossing['id']}")
            require(entity_id not in entities, f"Duplicate global ID: {entity_id}")
            entities[entity_id] = span

    nodes = {n["id"]: n for n in data["nodes"]}
    corridors = {c["id"]: c for c in data["corridors"]}
    segments = {s["id"]: s for s in data["segments"]}
    features = {f["id"]: f for f in data["features"]}
    require(len(data["cities"]) == 12 and len(set(data["cities"])) == 12, "City inventory must contain 12 unique settlements")
    require(set(data["regions"]) == {"northern-uplands", "western-textile-district", "central-industrial-basin", "eastern-canal-district", "southern-lowlands"}, "Five approved regions missing or renamed")
    memberships = [city for cities in data["regions"].values() for city in cities]
    require(set(memberships) == set(data["cities"]) and len(memberships) == 12, "Each settlement must occur in exactly one region")
    require(set(data["settlement_nodes"]) == set(data["cities"]), "Settlement-to-node registry is incomplete")
    for city, node_id in data["settlement_nodes"].items():
        require(node_id in nodes and nodes[node_id]["kind"] == "settlement", f"Invalid settlement node for {city}")

    for segment in data["segments"]:
        require(segment["from"] in nodes and segment["to"] in nodes, f"Invalid endpoint on {segment['id']}")
        require(segment["from"] != segment["to"], f"Self-loop segment: {segment['id']}")
        require(segment["corridor"] in corridors, f"Unknown corridor on {segment['id']}")
        require(segment["mode"] == corridors[segment["corridor"]]["mode"], f"Mode/corridor mismatch on {segment['id']}")
        require(segment["id"].startswith(segment["mode"] + "-"), f"Segment ID lacks its network prefix: {segment['id']}")
    for node in nodes.values():
        if "near_settlement" in node:
            require(node["near_settlement"] in nodes and nodes[node["near_settlement"]]["kind"] == "settlement", f"Bad near_settlement on {node['id']}")

    require(sum(c["mode"] == "river" for c in data["corridors"]) == 3, "Expected three river corridors")
    require(sum(c["mode"] == "canal" for c in data["corridors"]) == 3, "Expected three canal corridors")
    require(sum(c["mode"] == "rail" for c in data["corridors"]) == 3, "Expected three railway corridors")

    for corridor in data["corridors"]:
        ids = corridor["segments"]
        require(ids and all(x in segments for x in ids), f"Missing segment in {corridor['id']}")
        ordered = [segments[x] for x in ids]
        require(set(ids) == {s["id"] for s in data["segments"] if s["corridor"] == corridor["id"]}, f"Corridor segment membership is incomplete: {corridor['id']}")
        require(all(x["corridor"] == corridor["id"] for x in ordered), f"Segment assigned to wrong corridor: {corridor['id']}")
        require(all(x["id"].startswith(corridor["id"] + "-") for x in ordered), f"Segment ID lacks explicit corridor prefix: {corridor['id']}")
        if corridor["mode"] == "river":
            require(corridor["source"] in nodes and corridor["destination"] in nodes, f"Missing river terminals: {corridor['id']}")
            require(len(corridor["nodes"]) == len(ordered) + 1, f"River node/segment count mismatch: {corridor['id']}")
            for i, segment in enumerate(ordered):
                require(segment["directed"] and segment["from"] == corridor["nodes"][i] and segment["to"] == corridor["nodes"][i + 1], f"Broken downstream order: {segment['id']}")
            require(ordered[0]["from"] == corridor["source"] and ordered[-1]["to"] == corridor["destination"], f"River source/destination mismatch: {corridor['id']}")
        else:
            sequence = corridor["settlements"]
            require(sequence[0] == corridor["start"] and sequence[-1] == corridor["end"], f"Corridor terminal mismatch: {corridor['id']}")
            sequence_nodes = corridor.get("nodes", [data["settlement_nodes"][x] for x in sequence])
            require(len(sequence_nodes) == len(ordered) + 1, f"Node/segment count mismatch: {corridor['id']}")
            for i, segment in enumerate(ordered):
                require(segment["from"] == sequence_nodes[i] and segment["to"] == sequence_nodes[i + 1], f"Broken endpoint sequence: {segment['id']}")
    # Directed river graph must be acyclic, and each named confluence must be the receiving endpoint.
    river_segments = [s for s in data["segments"] if s["mode"] == "river"]
    adjacency: dict[str, list[str]] = defaultdict(list)
    indegree = {n: 0 for n in nodes}
    for segment in river_segments:
        adjacency[segment["from"]].append(segment["to"])
        indegree[segment["to"]] += 1
    queue = deque(n for n, degree in indegree.items() if degree == 0)
    visited = 0
    while queue:
        node = queue.popleft(); visited += 1
        for target in adjacency[node]:
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)
    require(visited == len(nodes), "River directions contain a cycle")
    river_corridors = {c["id"]: c for c in data["corridors"] if c["mode"] == "river"}
    for corridor in river_corridors.values():
        for confluence in corridor.get("confluences", []):
            require(confluence["id"] in nodes and nodes[confluence["id"]]["kind"] == "confluence", f"Invalid confluence in {corridor['id']}")
            if "receives" in confluence:
                tributary = confluence["receives"]
                require(tributary in river_corridors, f"Unknown tributary at {confluence['id']}")
                trib = river_corridors[tributary]
                require(trib["destination"] == confluence["id"], f"Tributary does not terminate at confluence {confluence['id']}")
            else:
                joined = confluence["joins"]
                require(joined in river_corridors and confluence["id"] in river_corridors[joined]["nodes"], f"Main river does not receive tributary at {confluence['id']}")

    for crossing in data["crossings"]:
        require(crossing["above"] in segments and crossing["below"] in segments, f"Crossing references missing segment: {crossing['id']}")
        above, below = segments[crossing["above"]], segments[crossing["below"]]
        require(above["mode"] != below["mode"], f"Crossing conflates same-mode network edges: {crossing['id']}")
        if crossing["structure_kind"] in {"bridge", "viaduct"}:
            require(above["mode"] == "rail" and below["mode"] in {"river", "canal"}, f"Rail bridge/viaduct has invalid over/under modes: {crossing['id']}")
        if crossing["structure_kind"] == "aqueduct":
            require(above["mode"] == "canal" and below["mode"] == "river", f"Aqueduct has invalid waterway order: {crossing['id']}")
        require(crossing.get("network_junction") is False, f"Physical crossing marked as junction: {crossing['id']}")
        span_codes = []
        for span in crossing.get("spans", []):
            require(span["structure_id"] == crossing["id"], f"Span parent mismatch: {span['id']}")
            require(span["above"] == crossing["above"] and span["below"] == crossing["below"], f"Span edge mismatch: {span['id']}")
            require(span.get("physical_crossing") is True and span.get("network_transfer") is False, f"Crossing semantics missing: {span['id']}")
            span_codes.append(span["drawing_code"])
        require(len(span_codes) == len(set(span_codes)), f"Repeated drawing code in {crossing['id']}")

    for item in data["infrastructure"]:
        if "on_segment" in item:
            require(item["on_segment"] in segments, f"Invalid infrastructure segment: {item['id']}")
        if "at_settlement" in item:
            require(item["at_settlement"] in data["cities"], f"Unknown settlement for {item['id']}")
            attached_node = item.get("node_id") or item.get("from_node")
            require(attached_node in nodes, f"Invalid node for {item['id']}")
            location_node = nodes[attached_node]
            colocated = location_node.get("near_settlement") == data["settlement_nodes"][item["at_settlement"]]
            require(attached_node == data["settlement_nodes"][item["at_settlement"]] or colocated, f"Node is not registered at {item['at_settlement']}: {item['id']}")
        if "to_node" in item:
            require(item["to_node"] in nodes, f"Invalid destination node: {item['id']}")
        if item.get("kind") == "station":
            rail_nodes = {node_id for corridor in data["corridors"] if corridor["mode"] == "rail" for node_id in corridor["nodes"]}
            require(item.get("node_id") in rail_nodes, f"Station is not attached to a rail node: {item['id']}")
        if "feeds_corridor" in item:
            require(item["feeds_corridor"] in corridors and corridors[item["feeds_corridor"]]["mode"] == "canal", f"Invalid supply corridor: {item['id']}")
        if "from_corridor" in item:
            require(item["from_corridor"] in corridors, f"Invalid source corridor: {item['id']}")
        if "from_corridors" in item:
            require(all(x in corridors for x in item["from_corridors"]), f"Invalid source corridor: {item['id']}")
        if "from_node" in item:
            require(item["from_node"] in nodes, f"Invalid source node: {item['id']}")
        if item.get("kind") == "interface-lock":
            source_corridors = item.get("from_corridors", [item.get("from_corridor")])
            source_corridors = [x for x in source_corridors if x]
            require(source_corridors and all(x in corridors for x in source_corridors), f"Interface lock has no valid canal source: {item['id']}")
            require(item.get("from_node") in nodes and item.get("to_node") in nodes, f"Interface lock endpoints are incomplete: {item['id']}")
            for corridor_id in source_corridors:
                require(item["from_node"] in corridors[corridor_id].get("nodes", []), f"Interface lock is not attached to {corridor_id}: {item['id']}")
        if item.get("kind") in {"rail-junction", "canal-junction"}:
            require(item.get("node_id") in nodes, f"Junction lacks a valid shared node: {item['id']}")
            expected_kind = "rail-junction" if item["kind"] == "rail-junction" else "canal-junction"
            require(nodes[item["node_id"]]["kind"] == expected_kind, f"Junction node kind mismatch: {item['id']}")
            incident = item.get("incident_segments", [])
            require(len(incident) >= 2 and all(x in segments for x in incident), f"Junction incidence invalid: {item['id']}")
            expected_mode = "rail" if item["kind"] == "rail-junction" else "canal"
            require(all(segments[x]["mode"] == expected_mode and item["node_id"] in {segments[x]["from"], segments[x]["to"]} for x in incident), f"Junction connects unrelated edges: {item['id']}")
        if item.get("crosses_feature"):
            require(item["crosses_feature"] in features, f"Unregistered local feature at {item['id']}")
            require(item.get("network_transfer") is False, f"Local crossing creates network transfer: {item['id']}")
    for transfer in data["freight_interchanges"]:
        require(transfer["at_settlement"] in data["cities"] and transfer["node_id"] == data["settlement_nodes"][transfer["at_settlement"]], f"Invalid transfer location: {transfer['id']}")
        require(transfer["modes"] == ["rail", "canal"] and transfer["through_vehicle_connection"] is False, f"Transfer semantics changed: {transfer['id']}")

    for mode in ("canal", "rail"):
        edges = [s for s in data["segments"] if s["mode"] == mode]
        graph: dict[str, set[str]] = defaultdict(set)
        for edge in edges:
            graph[edge["from"]].add(edge["to"]); graph[edge["to"]].add(edge["from"])
        remaining = set(graph)
        components = 0
        while remaining:
            components += 1
            pending = [remaining.pop()]
            while pending:
                for neighbor in graph[pending.pop()]:
                    if neighbor in remaining:
                        remaining.remove(neighbor); pending.append(neighbor)
        require(components == 1, f"{mode.title()} topology has {components} disconnected components")

    served = set()
    for corridor in data["corridors"]:
        if corridor["mode"] not in {"canal", "rail"}:
            continue
        for node_id in corridor["nodes"]:
            node = nodes[node_id]
            if node["kind"] == "settlement":
                served.add(node_id.removeprefix("node-settlement-"))
            if node.get("near_settlement"):
                served.add(node["near_settlement"].removeprefix("node-settlement-"))
    require(served == set(data["cities"]), f"Transport topology does not explicitly serve each city: {sorted(set(data['cities']) - served)}")

    # Every independent river/canal/rail intersection found in the illustrated polylines must have a keyed span.
    renderer = runpy.run_path(str(RENDERER))
    geography = renderer["GEOGRAPHY"]
    require(len(geography["cities"]) == 12 and len(geography["regions"]) == 5, "Illustration lost a settlement or region")
    require(composition["geometry_sha256"], "Missing shared Day/Night geometry fingerprint")
    codes = [s["drawing_code"] for c in data["crossings"] for s in c.get("spans", [])]
    drawn_codes = [x["code"] for x in composition["crossings"]]
    require(len(codes) == 13 and len(set(codes)) == 13, "Crossing registry must contain 13 uniquely coded spans")
    require(set(codes) == set(drawn_codes) and len(drawn_codes) == 13, "Registry and illustrated crossing codes differ")
    path_index = {"rail-basin-trunk": 0, "rail-coal-feeder": 1, "rail-southern-arc": 2,
                  "river-calder": 0, "river-weaver": 1, "river-mere": 2,
                  "canal-weaver": 0, "canal-lower-calder": 1, "canal-southern": 2}
    code_to_span = {s["drawing_code"]: s for c in data["crossings"] for s in c.get("spans", [])}
    for crossing in composition["crossings"]:
        span = code_to_span[crossing["code"]]
        ids = [span["above"], span["below"]]
        require(set(crossing.get("segments", [])) == set(ids), f"Drawing code {crossing['code']} is attached to the wrong canonical segments")
        pairs = {segments[x]["corridor"] for x in ids}
        expected_paths = {"rails": None, "rivers": None, "canals": None}
        for corridor_id in pairs:
            mode = corridors[corridor_id]["mode"]
            family = {"rail": "rails", "river": "rivers", "canal": "canals"}[mode]
            expected_paths[family] = path_index[corridor_id]
        require(crossing["paths"][1] == expected_paths[crossing["paths"][0]] and crossing["paths"][3] == expected_paths[crossing["paths"][2]], f"Drawing code {crossing['code']} is attached to the wrong corridors")

    bridge_structures = [c for c in data["crossings"] if c["structure_kind"] == "bridge"]
    viaducts = [c for c in data["crossings"] if c["structure_kind"] == "viaduct"]
    aqueducts = [c for c in data["crossings"] if c["structure_kind"] == "aqueduct"]
    spans = [s for c in data["crossings"] for s in c["spans"]]
    require((len(data["crossings"]), len(bridge_structures), len(viaducts), len(aqueducts), len(spans)) == (12, 9, 2, 1, 13), "Crossing structure/span counts inconsistent")
    from PIL import Image
    day = Image.open(ROOT / "PHASE_1_2_GEOGRAPHY.png").convert("RGB")
    night = Image.open(ROOT / "PHASE_1_2_NIGHT.png").convert("RGB")
    pair = Image.open(ROOT / "PHASE_1_2_DAY_NIGHT.png").convert("RGB")
    require(day.size == (1800, 1200) and night.size == day.size and pair.size == (3600, 1200), "Day/Night preview dimensions changed")
    require(pair.crop((0, 0, 1800, 1200)).tobytes() == day.tobytes(), "Comparison Day panel differs from standalone plate")
    require(pair.crop((1800, 0, 3600, 1200)).tobytes() == night.tobytes(), "Comparison Night panel differs from standalone plate")
    print(f"PASS: {len(entities)} unique global IDs; 12 settlements / 5 regions; {len(segments)} segments; {len(spans)} registered spans; river flow, endpoint references, junctions, transfers, and map codes valid.")


if __name__ == "__main__":
    main()
