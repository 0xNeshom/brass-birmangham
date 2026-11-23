"""Render abstract, endpoint-explicit water and railway topology diagrams."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "PHASE_1_2_TOPOLOGY.json").read_text())
OUT_WATER = ROOT / "PHASE_1_2_WATER_TOPOLOGY.svg"
OUT_RAIL = ROOT / "PHASE_1_2_RAIL_TOPOLOGY.svg"
COLORS = {"river": "#607e86", "canal": "#315d5b", "rail": "#694830"}
MODE_LABELS = {"river": "RIVER", "canal": "CANAL", "rail": "RAILWAY"}
SEGMENTS = {s["id"]: s for s in DATA["segments"]}
NODES = {n["id"]: n for n in DATA["nodes"]}
CITY_LABELS = {"ironhaven":"Ironhaven","copperfield":"Copperfield","millbrook":"Millbrook","blackridge":"Blackridge","westford":"Westford","rivermouth":"Rivermouth","foundry-vale":"Foundry Vale","ashbourne":"Ashbourne","greyhaven":"Greyhaven","brackenford":"Brackenford","dunmere":"Dunmere","calderwick":"Calderwick"}


def esc(s):
    return html.escape(str(s), quote=True)


def start(width, height, title, subtitle):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
            '<rect width="100%" height="100%" fill="#e5d6b7"/>',
            '<style>text{font-family:Georgia,serif;fill:#292a27}.small{font:14px Arial,sans-serif}.id{font:11px Arial,sans-serif;fill:#594f42}.edge{font:13px Arial,sans-serif}</style>',
            '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#607e86"/></marker></defs>',
            f'<text x="42" y="48" font-size="30">{esc(title)}</text>',
            f'<text x="42" y="78" class="small">{esc(subtitle)}</text>']


def node_caption(node_id):
    n = NODES[node_id]
    if n["kind"] == "settlement":
        slug = node_id.removeprefix("node-settlement-")
        return CITY_LABELS[slug], node_id
    if n.get("near_settlement"):
        slug = n["near_settlement"].removeprefix("node-settlement-")
        return CITY_LABELS[slug] + " " + n["kind"].replace("-", " "), node_id
    return n["kind"].replace("-", " "), node_id


def draw_corridor(parts, corridor, y, width, mode):
    ids = corridor.get("nodes") or [DATA["settlement_nodes"][c] for c in corridor["settlements"]]
    n = len(ids)
    xs = [110 + i * (width - 220) / max(1, n - 1) for i in range(n)]
    color = COLORS[mode]
    for i, sid in enumerate(corridor["segments"]):
        x1, x2 = xs[i] + 10, xs[i + 1] - 10
        dash = ' stroke-dasharray="10 7"' if mode == "canal" else ""
        marker = ' marker-end="url(#arrow)"' if mode == "river" else ""
        parts.append(f'<path d="M{x1:.1f} {y} H{x2:.1f}" stroke="{color}" stroke-width="4" fill="none"{dash}{marker}/>')
        parts.append(f'<text x="{(x1+x2)/2:.1f}" y="{y-10}" text-anchor="middle" class="edge">{esc(sid)}</text>')
    for i, node_id in enumerate(ids):
        x = xs[i]
        parts.append(f'<circle cx="{x:.1f}" cy="{y}" r="9" fill="#e5d6b7" stroke="{color}" stroke-width="3"/>')
        title, stable = node_caption(node_id)
        parts.append(f'<text x="{x:.1f}" y="{y+31}" text-anchor="middle" font-size="15">{esc(title)}</text>')
        parts.append(f'<text x="{x:.1f}" y="{y+48}" text-anchor="middle" class="id">{esc(stable)}</text>')


def render_water():
    width, height = 1800, 1700
    parts = start(width, height, "The Calder Marches · River and canal topology", "Stable node and segment IDs · exact logical endpoints · schematic rows have no map coordinates")
    corridors = [c for c in DATA["corridors"] if c["mode"] in {"river", "canal"}]
    y = 145
    for corridor in corridors:
        mode = corridor["mode"]
        parts.append(f'<text x="42" y="{y-35}" font-size="19" fill="{COLORS[mode]}">{MODE_LABELS[mode]} · {esc(corridor["id"])}</text>')
        draw_corridor(parts, corridor, y, width, mode)
        y += 205
    parts.append(f'<text x="42" y="{y-12}" font-size="20">Interfaces, locks and transfer semantics</text>')
    for item in DATA["infrastructure"]:
        if item["kind"] in {"interface-lock", "lock", "lock-flight"}:
            line = f'{item["id"]} · {item.get("on_segment", item.get("from_corridor", "canal interface"))} · {item["position_description"]}'
            parts.append(f'<text x="55" y="{y+20}" class="small">{esc(line)}</text>'); y += 27
    parts.append(f'<text x="42" y="{y+15}" class="small">Rail/canal freight handling is registered separately; river proximity does not create navigation links.</text>')
    parts.append(f'<text x="42" y="{y+44}" class="small">Coordinates remain provisional. Shared endpoint node IDs represent logical continuity; no proximity-derived links.</text>')
    parts.append("</svg>")
    OUT_WATER.write_text("\n".join(parts))


def render_rail():
    width, height = 1800, 1240
    parts = start(width, height, "The Calder Marches · Railway topology", "Three explicit corridors · stable segment and node IDs · line crossings remain grade-separated unless marked as a junction")
    corridors = [c for c in DATA["corridors"] if c["mode"] == "rail"]
    y = 160
    for corridor in corridors:
        parts.append(f'<text x="42" y="{y-42}" font-size="19" fill="{COLORS["rail"]}">{esc(corridor["id"])}</text>')
        draw_corridor(parts, corridor, y, width, "rail")
        y += 185
    parts.append('<text x="42" y="735" font-size="20">Rail junctions and crossing structures</text>')
    junctions = [i for i in DATA["infrastructure"] if i.get("kind") == "rail-junction"]
    for j in junctions:
        text = f'{j["id"]} at {j["node_id"]}: ' + ", ".join(j["incident_segments"])
        parts.append(f'<text x="55" y="{770 + 26*junctions.index(j)}" class="small">{esc(text)}</text>')
    y0 = 830
    for i, crossing in enumerate(DATA["crossings"]):
        codes = ", ".join(s["drawing_code"] for s in crossing["spans"])
        text = f'{codes} · {crossing["id"]} · {crossing["above"]} over {crossing["below"]} · no transfer'
        parts.append(f'<text x="55" y="{y0+24*i}" class="small">{esc(text)}</text>')
    parts.append(f'<text x="42" y="{y0+24*len(DATA["crossings"])+30}" class="small">12 main crossing structures / 13 physical spans (9 bridges, 2 viaducts, 1 aqueduct). Towpath bridge is a local pedestrian feature.</text>')
    parts.append(f'<text x="42" y="{y0+24*len(DATA["crossings"])+56}" class="small">Crossing symbols show vertical order only. A shared node creates railway transfer only at the two registered junctions.</text>')
    parts.append("</svg>")
    OUT_RAIL.write_text("\n".join(parts))


if __name__ == "__main__":
    render_water()
    render_rail()
