from __future__ import annotations

import math
from typing import Any

from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Polygon
from shapely.ops import unary_union

from .mesh import rounded_rect


def _slot_width(settings: dict[str, Any], thickness: float) -> float:
    return max(0.8, thickness + settings["fingerClearance"] - 2.0 * settings["kerf"])


def _tab_width(settings: dict[str, Any]) -> float:
    return max(2.0, settings["fingerWidth"])


def _rect(x: float, y: float, w: float, h: float, r: float = 0.0) -> Polygon:
    return affinity.translate(rounded_rect(w, h, r), xoff=x, yoff=y)


def _slot(cx: float, cy: float, w: float, h: float) -> Polygon:
    return _rect(cx - w / 2.0, cy - h / 2.0, w, h, min(w, h) * 0.2)


def _skadis_slots(width: float, height: float, margin: float = 12.0) -> list[Polygon]:
    holes: list[Polygon] = []
    pitch = 40.0
    cols = max(1, int((width - 2 * margin) / pitch) + 1)
    rows = max(1, int((height - 2 * margin) / pitch) + 1)
    start_x = (width - (cols - 1) * pitch) / 2.0
    start_y = (height - (rows - 1) * pitch) / 2.0
    for row in range(rows):
        shift = 20.0 if row % 2 else 0.0
        for col in range(cols):
            x = start_x + col * pitch + shift
            y = start_y + row * pitch
            if margin <= x <= width - margin and margin <= y <= height - margin:
                holes.append(_slot(x, y, 5.0, 15.0))
    return holes


def _honeycomb(width: float, height: float, radius: float = 4.2) -> list[Polygon]:
    holes: list[Polygon] = []
    dx = radius * math.sqrt(3)
    dy = radius * 1.5
    row = 0
    y = radius + 4
    while y < height - 4:
        x = radius + 4 + (dx / 2 if row % 2 else 0)
        while x < width - 4:
            points = [
                (x + radius * math.cos(math.radians(60 * i + 30)), y + radius * math.sin(math.radians(60 * i + 30)))
                for i in range(6)
            ]
            holes.append(Polygon(points))
            x += dx
        y += dy
        row += 1
    return holes


def _dogbones(poly: Polygon, radius: float) -> Polygon:
    if radius <= 0.05:
        return poly
    out = poly
    for interior in poly.interiors:
        for x, y in list(interior.coords)[:-1]:
            out = out.union(PointBuffer(x, y, radius))
    return out


def PointBuffer(x: float, y: float, radius: float) -> Polygon:
    points = [
        (x + radius * math.cos(math.radians(a)), y + radius * math.sin(math.radians(a)))
        for a in range(0, 360, 18)
    ]
    return Polygon(points)


def _apply_holes(poly: Polygon, holes: list[Polygon]) -> Polygon:
    inside = [hole for hole in holes if not hole.is_empty and poly.contains(hole)]
    if not inside:
        return poly
    return poly.difference(unary_union(inside))


def _panel_parts(settings: dict[str, Any]) -> list[dict[str, Any]]:
    width = settings["width"]
    depth = settings["depth"]
    side = settings["sideThickness"]
    t = settings["laserThickness"]
    panel_t = settings["panelThickness"]
    back_h = settings["backHeight"]
    levels = [level for level in settings["levelConfigs"] if level["enabled"]]
    top_h = max((level["height"] for level in levels), default=200.0) + 40.0
    parts: list[dict[str, Any]] = []

    base = rounded_rect(width, depth, settings["baseRadius"])
    base_holes: list[Polygon] = []
    if settings["strapSlots"]:
        for x in (width * 0.18, width * 0.82):
            for y in (8.0, depth - 14.0):
                base_holes.append(_rect(x - 11.0, y, 22.0, 6.0, 2.0))
    if settings["ballast"]:
        base_holes.append(_rect(width * 0.28, depth * 0.36, width * 0.44, depth * 0.28, 8.0))
    for side_x in (0.0, width - t):
        for y in (20.0, depth / 2.0 - 12.0, depth - 32.0):
            base_holes.append(_rect(side_x - 1.0, y, t + 2.0, 24.0, 0.8))
    base = _apply_holes(base, base_holes)
    parts.append({"id": "laser-base", "name": "Base", "layer": "cut", "polygons": [base]})

    side_profile = rounded_rect(depth, top_h, 5.0)
    side_tabs: list[Polygon] = []
    slot_t = settings["laserThickness"] + settings["fingerClearance"]
    for y in (20.0, depth / 2.0 - 12.0, depth - 32.0):
        side_tabs.append(_rect(y, -12.0, 24.0, 12.0, 1.0))
    side_profile = side_profile.union(unary_union(side_tabs))
    rear_slot = _rect(depth - settings["panelThickness"] - 1.0, 14.0, settings["panelThickness"] + 1.0, top_h - 18.0, 0.5)
    side_profile = side_profile.difference(rear_slot)
    side_cuts: list[LineString] = []
    side_scores: list[LineString] = []
    arm_len = 36.0
    arm_width = 36.0
    for level in levels:
        z0 = level["height"] - settings["laserThickness"]
        z1 = z0 + arm_len
        for y0 in (26.0, depth - 62.0):
            y1 = y0 + arm_width
            side_cuts.append(LineString([(y0, z0), (y0, z1), (y1, z1), (y1, z0)]))
            side_scores.append(LineString([(y0, z0), (y1, z0)]))
    side_parts = [
        {
            "id": "laser-side-a",
            "name": "Lateral A",
            "layer": "cut",
            "polygons": [side_profile],
            "cuts": side_cuts,
            "scores": side_scores,
        },
        {
            "id": "laser-side-b",
            "name": "Lateral B",
            "layer": "cut",
            "polygons": [affinity.scale(side_profile, xfact=-1, yfact=1, origin=(depth / 2, 0))],
            "cuts": [affinity.scale(line, xfact=-1, yfact=1, origin=(depth / 2, 0)) for line in side_cuts],
            "scores": [affinity.scale(line, xfact=-1, yfact=1, origin=(depth / 2, 0)) for line in side_scores],
        },
    ]
    parts.extend(side_parts)

    panel_cols = max(1, int(settings.get("panelSplit", 1)))
    panel_rows = max(1, int(settings.get("panelRows", 2)))
    inner_w = width - 2 * side - 2 * settings["clearance"]
    piece_w = (inner_w - 3.0 * (panel_cols - 1)) / panel_cols
    piece_h = (back_h - 3.0 * (panel_rows - 1)) / panel_rows
    for row in range(panel_rows):
        for col in range(panel_cols):
            back_poly = rounded_rect(piece_w, piece_h, 3.0)
            back_holes: list[Polygon] = []
            if settings["backPanel"] == "skadis":
                back_holes = _skadis_slots(piece_w, piece_h)
            elif settings["backPanel"] == "honeycomb":
                back_holes = _honeycomb(piece_w, piece_h)
            back_poly = _apply_holes(back_poly, back_holes)
            parts.append({"id": f"laser-back-{row + 1}-{col + 1}", "name": f"Panel {row + 1}.{col + 1}", "layer": "cut", "polygons": [back_poly]})

    for index, level in enumerate(levels):
        shelf_w = inner_w
        shelf_d = level["depth"]
        shelf = rounded_rect(shelf_w, shelf_d, 3.0)
        shelf_holes: list[Polygon] = []
        if level["type"] == "pegboard":
            shelf_holes = _skadis_slots(shelf_w, shelf_d, margin=8.0)
        elif level["type"] == "rail":
            shelf_holes.append(_rect(shelf_w * 0.12, shelf_d * 0.3, shelf_w * 0.76, 5.0, 2.0))
        divider_count = max(2, int(round(shelf_w / settings["dividerSpacing"])))
        divider_slots = []
        for divider_index in range(1, divider_count):
            divider_x = divider_index * shelf_w / divider_count
            divider_slots.append(_rect(divider_x - (settings["laserThickness"] + settings["fingerClearance"]) / 2.0, 10.0, settings["laserThickness"] + settings["fingerClearance"], 8.0, 0.4))
            divider_slots.append(_rect(divider_x - (settings["laserThickness"] + settings["fingerClearance"]) / 2.0, shelf_d - 18.0, settings["laserThickness"] + settings["fingerClearance"], 8.0, 0.4))
        shelf_holes.extend(divider_slots)
        shelf = _apply_holes(shelf, shelf_holes)
        parts.append({"id": f"laser-shelf-{index + 1}", "name": level["name"], "layer": "cut", "polygons": [shelf]})
        divider_h = max(12.0, settings["lipHeight"] * 0.62)
        divider_w = shelf_d - 20.0
        divider = rounded_rect(divider_w, divider_h, 1.5)
        divider = affinity.translate(divider, xoff=0.0, yoff=8.0)
        tab_w = settings["laserThickness"] + settings["fingerClearance"]
        divider = unary_union([
            divider,
            _rect(10.0, 0.0, tab_w, 10.0, 0.5),
            _rect(divider_w - 10.0 - tab_w, 0.0, tab_w, 10.0, 0.5),
        ])
        for divider_index in range(1, divider_count):
            parts.append({"id": f"laser-divider-{index + 1}-{divider_index}", "name": f"Divisor {index + 1}.{divider_index}", "layer": "cut", "polygons": [divider]})
        if level["lip"] and level["lipHeight"] > 0:
            lip_h = level["lipHeight"]
            lip = _rect(0.0, 0.0, inner_w, lip_h, 2.0)
            lip_holes = []
            tab_w = _tab_width(settings)
            gap = (inner_w - tab_w * 4.0) / 5.0
            for tab_index in range(4):
                x = gap + tab_index * (tab_w + gap)
                lip_holes.append(_rect(x, 0.0, tab_w, 3.5, 1.0))
            lip = _apply_holes(lip, lip_holes)
            parts.append({"id": f"laser-lip-{index + 1}", "name": f"Labio {index + 1}", "layer": "cut", "polygons": [lip]})

    if settings["cornerBrackets"]:
        leg = settings["cornerLeg"]
        thick = max(2.0, side * 0.75)
        fl = Polygon([(0, 0), (leg, 0), (leg, thick), (thick, thick), (thick, leg), (0, leg)])
        fl = _apply_holes(fl, [_slot(leg * 0.62, thick / 2.0, 6.0, 3.0)])
        for index in range(4):
            pieces = [affinity.rotate(fl, index * 90, origin=(0, 0))]
            parts.append({"id": f"laser-corner-{index + 1}", "name": f"Escuadra {index + 1}", "layer": "cut", "polygons": pieces})

    if settings["panelJoiners"]:
        joiner = _rect(0, 0, 34.0, 26.0, 5.0)
        joiner = _apply_holes(joiner, [_slot(12.0, 13.0, 6.0, 3.0), _slot(22.0, 13.0, 6.0, 3.0)])
        parts.append({"id": "laser-panel-joiner", "name": "Unión de panel", "layer": "cut", "polygons": [joiner]})

    if settings["transport"] and settings["transportLid"]:
        lid_w = width
        lid_d = depth
        rim = 34.0
        lid_top = _rect(0, 0, lid_w, lid_d, 4.0)
        lid_top = _apply_holes(lid_top, _skadis_slots(lid_w * 0.8, lid_d * 0.3, margin=4.0) if False else [])
        parts.append({"id": "laser-lid-top", "name": "Tapa de transporte", "layer": "cut", "polygons": [lid_top]})
        strips = [
            ("laser-lid-front", _rect(0, 0, lid_w, rim)),
            ("laser-lid-back", _rect(0, 0, lid_w, rim)),
            ("laser-lid-left", _rect(0, 0, lid_d, rim)),
            ("laser-lid-right", _rect(0, 0, lid_d, rim)),
        ]
        lid_names = {
            "laser-lid-front": "Tapa · frente",
            "laser-lid-back": "Tapa · trasera",
            "laser-lid-left": "Tapa · lateral izq.",
            "laser-lid-right": "Tapa · lateral der.",
        }
        for part_id, poly in strips:
            parts.append({"id": part_id, "name": lid_names.get(part_id, part_id), "layer": "cut", "polygons": [poly]})

    if settings.get("sign"):
        sign = _rect(0, 0, 104.0, 42.0, 6.0)
        sign = _apply_holes(sign, [_rect(12.0, 11.0, 80.0, 20.0, 3.0)])
        parts.append({"id": "laser-sign", "name": "Cartel de papel", "layer": "cut", "polygons": [sign]})

    if settings.get("testCoupons", True):
        hook = _rect(0, 0, 104.0, 56.0, 4.0)
        hook = _apply_holes(hook, [_slot(32.0, 28.0, 5.0, 15.0), _slot(72.0, 28.0, 5.0, 15.0)])
        parts.append({"id": "laser-hook-test", "name": "Prueba de gancho SKÅDIS", "layer": "cut", "polygons": [hook]})
        kerf = _rect(0, 0, 150.0, 34.0, 3.0)
        slots = []
        for index in range(5):
            slot_w = settings["laserThickness"] - 0.2 + index * 0.1
            slots.append(_rect(10.0 + index * 27.0, 8.0, slot_w, 18.0, 0.5))
        kerf = _apply_holes(kerf, slots)
        parts.append({"id": "laser-kerf-test", "name": "Galga de kerf y encaje", "layer": "cut", "polygons": [kerf]})

    if settings["livingHinge"]:
        hinge_h = max(18.0, settings["hingeRows"] * settings["hingeRowSpacing"] + 10.0)
        strip = _rect(0, 0, width - 2 * side, hinge_h, 2.0)
        slots: list[Polygon] = []
        row_count = settings["hingeRows"]
        slot_len = settings["hingeSlot"]
        bridge = settings["hingeBridge"]
        row_step = settings["hingeRowSpacing"]
        for row in range(row_count):
            y = 5.0 + row * row_step
            x = (row % 2) * (slot_len + bridge) / 2.0
            while x < strip.bounds[2] - slot_len:
                slots.append(_rect(x, y, slot_len, max(0.35, 0.35), 0.15))
                x += slot_len + bridge
        strip = _apply_holes(strip, [slot for slot in slots if strip.contains(slot)])
        parts.append({"id": "laser-living-hinge", "name": "Bisagra viva", "layer": "cut", "polygons": [strip]})

    return parts


def _prepare_polygon(poly: Polygon) -> Polygon:
    if poly.is_empty:
        return poly
    if poly.geom_type == "MultiPolygon":
        pieces = [p for p in poly.geoms if not p.is_empty]
        return unary_union(pieces)
    return poly


def _bounds(poly: Polygon) -> tuple[float, float, float, float]:
    min_x, min_y, max_x, max_y = poly.bounds
    return max_x - min_x, max_y - min_y, min_x, min_y


def _rotate_to_fit(poly: Polygon, max_w: float, max_h: float) -> Polygon:
    w, h, _, _ = _bounds(poly)
    if (w > max_w or h > max_h) and (h <= max_w and w <= max_h):
        return affinity.rotate(poly, 90, origin="center")
    return poly


class _Sheet:
    def __init__(self, width: float, height: float) -> None:
        self.width = width
        self.height = height
        self.margin = 6.0
        self.gap = 6.0
        self.cursor_x = self.margin
        self.cursor_y = self.margin
        self.row_h = 0.0
        self.parts: list[dict[str, Any]] = []

    def place(self, poly: Polygon, part: dict[str, Any]) -> Polygon | None:
        w, h, _, _ = _bounds(poly)
        if w > self.width - 2 * self.margin or h > self.height - 2 * self.margin:
            return None
        if self.cursor_x + w > self.width - self.margin:
            self.cursor_x = self.margin
            self.cursor_y += self.row_h + self.gap
            self.row_h = 0.0
        if self.cursor_y + h > self.height - self.margin:
            return None
        min_x, min_y, _, _ = poly.bounds
        placed = affinity.translate(poly, xoff=self.cursor_x - min_x, yoff=self.cursor_y - min_y)
        self.parts.append({**part, "polygons": [placed], "sheet_x": self.cursor_x, "sheet_y": self.cursor_y})
        self.cursor_x += w + self.gap
        self.row_h = max(self.row_h, h)
        return placed


def _svg(sheets: list[_Sheet]) -> list[dict[str, Any]]:
    colors = {"cut": "#cf3e4d", "score": "#2e6fa8", "engrave": "#4b4b4b"}
    fills = {"cut": "#f7dede", "score": "none", "engrave": "none"}
    out: list[dict[str, Any]] = []
    for sheet_index, sheet in enumerate(sheets, start=1):
        lines = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{sheet.width:.2f}mm" height="{sheet.height:.2f}mm" viewBox="0 0 {sheet.width:.2f} {sheet.height:.2f}">',
            f'<rect width="{sheet.width:.2f}" height="{sheet.height:.2f}" fill="#fdfaf3"/>',
            '<g fill="none" stroke-width="0.34" stroke-linecap="round" stroke-linejoin="round">',
        ]
        for layer in ("engrave", "score", "cut"):
            group = [part for part in sheet.parts if part["layer"] == layer]
            if not group:
                continue
            lines.append(f'<g id="{layer}" stroke="{colors[layer]}">')
            for part in group:
                for poly in part["polygons"]:
                    rings = [poly.exterior] + list(poly.interiors)
                    for ring in rings:
                        coords = list(ring.coords)
                        path = "M " + " L ".join(f"{x:.3f} {sheet.height - y:.3f}" for x, y in coords) + " Z"
                        lines.append(f'<path d="{path}" fill="{fills[layer]}" fill-rule="evenodd"/>')
                for line in part.get("cuts", []):
                    coords = list(line.coords)
                    path = "M " + " L ".join(f"{x:.3f} {sheet.height - y:.3f}" for x, y in coords)
                    lines.append(f'<path d="{path}" fill="none"/>')
            lines.append("</g>")
        score_lines = []
        for part in sheet.parts:
            for line in part.get("scores", []):
                coords = list(line.coords)
                path = "M " + " L ".join(f"{x:.3f} {sheet.height - y:.3f}" for x, y in coords)
                score_lines.append(f'<path d="{path}" fill="none"/>')
        if score_lines:
            lines.append(f'<g id="score" stroke="{colors["score"]}">')
            lines.extend(score_lines)
            lines.append("</g>")
        lines.append("</g>")
        for part in sheet.parts:
            x = part["sheet_x"] + 2.0
            y = sheet.height - part["sheet_y"] - 4.0
            lines.append(f'<text x="{x:.2f}" y="{y:.2f}" font-family="sans-serif" font-size="5.5" fill="#8f8577">{part["name"]}</text>')
        lines.append("</svg>")
        out.append(
            {
                "index": sheet_index,
                "width": sheet.width,
                "height": sheet.height,
                "svg": "\n".join(lines),
                "parts": [part["name"] for part in sheet.parts],
            }
        )
    return out


def _dxf(sheet: _Sheet) -> str:
    colors = {"cut": 1, "score": 5, "engrave": 8}
    lines = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"]
    for part in sheet.parts:
        layer = part["layer"]
        for poly in part["polygons"]:
            for ring in [poly.exterior] + list(poly.interiors):
                coords = list(ring.coords)
                lines.extend(["0", "POLYLINE", "8", layer.upper(), "62", str(colors[layer]), "66", "1", "70", "1"])
                for x, y in coords:
                    lines.extend(["0", "VERTEX", "8", layer.upper(), "10", f"{x:.4f}", "20", f"{y:.4f}", "30", "0.0"])
                lines.extend(["0", "SEQEND"])
            for line in part.get("cuts", []):
                coords = list(line.coords)
                lines.extend(["0", "POLYLINE", "8", "CUT", "62", "1", "66", "1", "70", "0"])
                for x, y in coords:
                    lines.extend(["0", "VERTEX", "8", "CUT", "10", f"{x:.4f}", "20", f"{y:.4f}", "30", "0.0"])
                lines.extend(["0", "SEQEND"])
            for line in part.get("scores", []):
                coords = list(line.coords)
                lines.extend(["0", "POLYLINE", "8", "SCORE", "62", "5", "66", "1", "70", "0"])
                for x, y in coords:
                    lines.extend(["0", "VERTEX", "8", "SCORE", "10", f"{x:.4f}", "20", f"{y:.4f}", "30", "0.0"])
                lines.extend(["0", "SEQEND"])
    lines.extend(["0", "ENDSEC", "0", "EOF"])
    return "\n".join(lines)


def build_laser(settings: dict[str, Any], preview_parts: list[dict[str, Any]]) -> dict[str, Any]:
    raw = _panel_parts(settings)
    max_w = settings["sheetWidth"]
    max_h = settings["sheetHeight"]
    sheets: list[_Sheet] = []
    overflow: list[str] = []
    ordered = sorted(raw, key=lambda item: max(_bounds(poly)[1] for poly in item["polygons"]), reverse=True)
    for part in ordered:
        polygons = [poly for poly in (_prepare_polygon(poly) for poly in part["polygons"]) if not poly.is_empty]
        split_polys: list[Polygon] = []
        for poly in polygons:
            if isinstance(poly, MultiPolygon):
                split_polys.extend(poly.geoms)
            else:
                split_polys.append(poly)
        for poly in split_polys:
            rotated = _rotate_to_fit(poly, max_w - 12.0, max_h - 12.0)
            placed = False
            for sheet in sheets:
                if sheet.place(rotated, part) is not None:
                    placed = True
                    break
            if not placed:
                sheet = _Sheet(max_w, max_h)
                if sheet.place(rotated, part) is not None:
                    sheets.append(sheet)
                else:
                    overflow.append(part["name"])
                    if not sheets:
                        sheets.append(_Sheet(max_w, max_h))
    if not sheets:
        sheets = [_Sheet(max_w, max_h)]
    svg_sheets = _svg(sheets)
    for index, sheet in enumerate(sheets):
        svg_sheets[index]["dxf"] = _dxf(sheet)
    return {
        "sheets": svg_sheets,
        "part_count": len(raw),
        "overflow": overflow,
        "thickness": settings["laserThickness"],
        "kerf": settings["kerf"],
        "livingHinge": settings["livingHinge"],
        "printedKit": settings["includePrintedKit"],
    }
