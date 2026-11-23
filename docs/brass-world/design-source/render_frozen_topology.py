"""Render topology diagrams directly from the canonical frozen world source."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD = json.loads((ROOT / "design-source" / "world.json").read_text())
NODES = {x["id"]: x for x in WORLD["nodes"]}
SEGMENTS = {x["id"]: x for x in WORLD["segments"]}
CORRIDORS = {x["id"]: x for x in WORLD["corridors"]}
CITIES = {x["id"]: x["display_name"] for x in WORLD["cities"]}
COLORS = {"river": "#438caa", "canal": "#237a72", "water-interface": "#d18b39", "rail": "#956144"}


def render(family, filename, title, subtitle):
    if family == "water":
        selected = [c for c in WORLD["corridors"] if c["network_type"] in {"river", "canal", "water-interface"}]
    else:
        selected = [c for c in WORLD["corridors"] if c["network_type"] == "rail"]
    wanted = {sid for c in selected for sid in c["segments"]}
    nodes_used = {n for sid in wanted for n in (SEGMENTS[sid]["start_node"], SEGMENTS[sid]["end_node"])}
    width, height, left, top, mapw, maph = 1500, 940, 55, 110, 860, 570

    def xy(p): return left + p["x"] * mapw, top + p["y"] * maph
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
           '<rect width="100%" height="100%" fill="#f6f1e4"/>',
           f'<text x="55" y="48" font-family="serif" font-size="30" fill="#332d25">{title}</text>',
           f'<text x="55" y="77" font-family="sans-serif" font-size="15" fill="#5a5349">{subtitle}</text>',
           f'<rect x="{left}" y="{top}" width="{mapw}" height="{maph}" fill="#e8e1d0" stroke="#81745f"/>']
    for corridor in selected:
        kind = corridor["network_type"]
        for sid in corridor["segments"]:
            seg = SEGMENTS[sid]
            points = " ".join(f'{x:.1f},{y:.1f}' for x, y in (xy(p) for p in seg["geometry"]))
            dash = ' stroke-dasharray="8 5"' if kind == "canal" else ''
            out.append(f'<polyline points="{points}" fill="none" stroke="{COLORS[kind]}" stroke-width="{"4" if kind != "rail" else "3"}"{dash}/>' )
            mx, my = xy(seg["geometry"][len(seg["geometry"])//2])
            out.append(f'<title>{sid}: {seg["start_node"]} to {seg["end_node"]}</title>')
            out.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="2.4" fill="{COLORS[kind]}"/>')
    for nid in nodes_used:
        node = NODES[nid]; x, y = xy(node["position"])
        color = "#4d4032" if node["kind"] in {"settlement", "rail-station"} else "#fffaf0"
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{color}" stroke="#302b24" stroke-width="1.5"><title>{nid} ({node["kind"]})</title></circle>')
        if nid.startswith("node-settlement-"):
            city = nid.removeprefix("node-settlement-")
            out.append(f'<text x="{x+8:.1f}" y="{y-7:.1f}" font-family="sans-serif" font-size="12" fill="#302b24">{CITIES.get(city, city)}</text>')
    # The right panel provides a complete machine-ID endpoint listing; no edge is inferred from proximity.
    panelx, panelw = 965, 490
    out.append(f'<text x="{panelx}" y="115" font-family="serif" font-size="21" fill="#332d25">Corridors and ordered segments</text>')
    y = 148
    for c in selected:
        kind = c["network_type"]
        out.append(f'<text x="{panelx}" y="{y}" font-family="sans-serif" font-size="16" font-weight="bold" fill="{COLORS[kind]}">{c["id"]} · {kind}</text>'); y += 22
        for sid in c["segments"]:
            s = SEGMENTS[sid]
            out.append(f'<text x="{panelx+12}" y="{y}" font-family="monospace" font-size="11.5" fill="#352f28">{sid}: {s["start_node"]} → {s["end_node"]}</text>'); y += 16
        if c.get("confluences"):
            for cf in c["confluences"]:
                desc = f'receives {cf["receives"]}' if "receives" in cf else f'joins {cf["joins"]}'
                out.append(f'<text x="{panelx+12}" y="{y}" font-family="sans-serif" font-size="11" fill="#5a5349">{cf["node_id"]}: {desc}</text>'); y += 15
        y += 8
    if family == "water":
        lock = next(x for x in WORLD["infrastructure"] if x["id"] == "lock-ironhaven-river")
        out.append(f'<text x="{panelx}" y="845" font-family="sans-serif" font-size="13" font-weight="bold" fill="#8a5726">Outlet lock {lock["id"]} → {lock["to_node"]}</text>')
        out.append(f'<text x="{panelx}" y="865" font-family="sans-serif" font-size="12" fill="#5a5349">Connector: {lock["on_segment"]}; distinct from natural Weaver confluence</text>')
    else:
        out.append(f'<text x="{panelx}" y="845" font-family="sans-serif" font-size="13" fill="#5a5349">Crossings remain grade-separated: physical spans create no transfer edges.</text>')
    out.append('<text x="55" y="715" font-family="sans-serif" font-size="13" fill="#51493e">Map positions use the canonical normalized 3:2 board frame. Lines show only registered segments.</text>')
    out.append(f'<text x="55" y="745" font-family="sans-serif" font-size="14" fill="#51493e">Frozen baseline: {WORLD["baseline_id"]} · north up · Day/Night share identical geometry</text>')
    out.append('</svg>')
    (ROOT / filename).write_text("\n".join(out) + "\n")


render("water", "WATER_NETWORK_V1_0_0.svg", "Calder Marches · Water topology", "Rivers, canals and the separately authorized Ironhaven canal-to-Calder outlet")
render("rail", "RAIL_NETWORK_V1_0_0.svg", "Calder Marches · Railway topology", "Three registered railway corridors; overpasses and transfers are separate records")
