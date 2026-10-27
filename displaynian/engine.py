from __future__ import annotations

import base64
import io
import math
import time
import zipfile
from typing import Any, Iterable

import numpy as np
from shapely import affinity
from shapely.geometry import MultiPolygon, Point, Polygon, box as sbox
from shapely.ops import unary_union

from . import __version__
from .mesh import (
    Mesh,
    box,
    cone,
    cylinder,
    extrude_polygon,
    matrix_array,
    matrix_rotate_x,
    matrix_scale,
    matrix_translate,
    mesh_to_obj,
    mesh_to_stl,
    rounded_rect,
    three_mf_bytes,
)
from .params import (
    BACK_PANEL_TYPES,
    INSERT_TYPES,
    LASER_PROFILES,
    MATERIAL_PROFILES,
    PRINTER_PROFILES,
    SHEET_PROFILES,
    SYSTEM_PRESETS,
    normalize_settings,
)

IDENTITY = np.eye(4)
EPS = 1e-6


def _t(poly: Polygon, x: float, y: float) -> Polygon:
    return affinity.translate(poly, xoff=x, yoff=y)


def _slot(cx: float, cy: float, width: float = 5.0, height: float = 15.0) -> Polygon:
    return _t(rounded_rect(width, height, width / 2.0), cx - width / 2.0, cy - height / 2.0)


def _hex(cx: float, cy: float, radius: float = 4.2) -> Polygon:
    points = [
        (cx + radius * math.cos(math.radians(60 * i + 30)), cy + radius * math.sin(math.radians(60 * i + 30)))
        for i in range(6)
    ]
    return Polygon(points)


def _vertical(mesh: Mesh, y_front: float, z0: float) -> Mesh:
    matrix = np.array(
        [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, -1.0, y_front],
            [0.0, 1.0, 0.0, z0],
            [0.0, 0.0, 0.0, 1.0],
        ],
        dtype=float,
    )
    return mesh.transformed(matrix)


def _holes_in(poly: Polygon, holes: Iterable[Polygon]) -> Polygon:
    valid = [hole for hole in holes if not hole.is_empty and poly.contains(hole)]
    if not valid:
        return poly
    return poly.difference(unary_union(valid))


def _skadis_slots(width: float, height: float, margin: float = 14.0) -> list[Polygon]:
    holes: list[Polygon] = []
    pitch = 40.0
    offset = 20.0
    cols = max(1, int((width - 2 * margin) / pitch) + 1)
    rows = max(1, int((height - 2 * margin) / pitch) + 1)
    start_x = (width - (cols - 1) * pitch) / 2.0
    start_y = (height - (rows - 1) * pitch) / 2.0
    for row in range(rows):
        shift = offset if row % 2 else 0.0
        for col in range(cols):
            x = start_x + col * pitch + shift
            y = start_y + row * pitch
            if margin <= x <= width - margin and margin <= y <= height - margin:
                holes.append(_slot(x, y))
    return holes


def _honeycomb_holes(width: float, height: float, radius: float = 4.2) -> list[Polygon]:
    holes: list[Polygon] = []
    dx = radius * math.sqrt(3)
    dy = radius * 1.5
    row = 0
    y = radius + 4
    while y < height - 4:
        x = radius + 4 + (dx / 2.0 if row % 2 else 0.0)
        while x < width - 4:
            holes.append(_hex(x, y, radius))
            x += dx
        y += dy
        row += 1
    return holes


def _font() -> dict[str, list[str]]:
    return {
        "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
        "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
        "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
        "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
        "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
        "G": ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
        "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
        "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
        "J": ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
        "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
        "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
        "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
        "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
        "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
        "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
        "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
        "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
        "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
        "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
        "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
        "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
        "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
        "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
        "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
        "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
        "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
        "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
        "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
        "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
        "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
        "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
        "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
        "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
        ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
        " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
        "Ä": ["01010", "00000", "01110", "10001", "11111", "10001", "10001"],
        "Ö": ["01010", "00000", "01110", "10001", "10001", "10001", "01110"],
        "Ü": ["01010", "00000", "10001", "10001", "10001", "10001", "01110"],
    }


def _text_mesh(text: str, cell: float, depth: float, height: float) -> Mesh:
    glyphs = _font()
    result = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    cursor = 0.0
    for character in text.upper():
        rows = glyphs.get(character, glyphs[" "])
        for row_index, row in enumerate(rows):
            for col_index, value in enumerate(row):
                if value == "1":
                    x = cursor + col_index * cell
                    y = (6 - row_index) * cell
                    result = result.append(box(x, y, 0.0, cell * 0.92, cell * 0.92, height))
        cursor += 6.0 * cell
    return result


def _part(
    parts: list[dict[str, Any]],
    part_id: str,
    name: str,
    group: str,
    mesh: Mesh,
    color_key: str,
    settings: dict[str, Any],
    open_matrix: np.ndarray | None = None,
    fold_matrix: np.ndarray | None = None,
    transport_only: bool = False,
    category: str = "structure",
    explode: tuple[float, float, float] | None = None,
    fold_hide: bool = False,
    fold_pose: dict[str, Any] | None = None,
) -> None:
    if mesh.empty or part_id in settings["disabledParts"]:
        return
    scale = float(settings["partScales"].get(part_id, 1.0))
    if abs(scale - 1.0) > 1e-4:
        bounds = mesh.bounds
        center = [
            (bounds["min"][0] + bounds["max"][0]) / 2.0,
            (bounds["min"][1] + bounds["max"][1]) / 2.0,
            (bounds["min"][2] + bounds["max"][2]) / 2.0,
        ]
        mesh = mesh.transformed(matrix_scale([scale, scale, scale], center))
    color = settings["partColors"].get(part_id) or settings["colors"].get(color_key) or "#b9c2c7"
    bounds = mesh.bounds
    parts.append(
        {
            "id": part_id,
            "name": name,
            "group": group,
            "category": category,
            "color": color,
            "mesh": mesh,
            "bounds": bounds,
            "volume": mesh.volume(),
            "triangles": mesh.triangles,
            "open_matrix": matrix_array(open_matrix if open_matrix is not None else IDENTITY),
            "fold_matrix": matrix_array(fold_matrix if fold_matrix is not None else IDENTITY),
            "transport_only": transport_only,
            "fold_hide": fold_hide,
            "fold_pose": fold_pose,
            "explode": list(explode or (0.0, 0.0, 0.0)),
        }
    )


def _rear_matrix(settings: dict[str, Any]) -> np.ndarray:
    angle = settings["foldAngle"] if settings["foldMode"] == "zfold" else settings["foldAngle"] * 0.55
    return matrix_rotate_x(angle, (0.0, settings["depth"], settings["baseHeight"]))


def _front_matrix(settings: dict[str, Any]) -> np.ndarray:
    angle = -settings["foldAngle"] if settings["foldMode"] == "zfold" else -settings["foldAngle"] * 0.55
    return matrix_rotate_x(angle, (0.0, 0.0, settings["baseHeight"]))


def _shelf_fold(settings: dict[str, Any], index: int, depth: float, z: float) -> np.ndarray:
    target = (
        settings["baseHeight"]
        + settings["panelThickness"]
        + 10.0
        + index * (settings["shelfThickness"] + 5.0)
    )
    return matrix_translate([0.0, settings["depth"] * 0.5 - depth * 0.5, target - z])


def _base(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    width = settings["width"]
    depth = settings["depth"]
    height = settings["baseHeight"]
    radius = settings["baseRadius"]
    poly = rounded_rect(width, depth, radius)
    holes: list[Polygon] = []
    if settings["strapSlots"]:
        for x in (width * 0.18, width * 0.82):
            for y in (8.0, depth - 16.0):
                holes.append(_t(rounded_rect(22.0, 8.0, 3.0), x - 11.0, y))
    if settings["ballast"]:
        holes.append(_t(rounded_rect(width * 0.44, depth * 0.28, 10.0), width * 0.28, depth * 0.36))
    base_poly = _holes_in(poly, holes)
    _part(parts, "base", "Base", "base", extrude_polygon(base_poly, 0.0, height), "base", settings, category="structure")
    if settings["ballast"]:
        cover = _t(rounded_rect(width * 0.47, depth * 0.31, 12.0), width * 0.265, depth * 0.345)
        cover = _holes_in(cover, [])
        _part(
            parts,
            "ballast-cover",
            "Tapa de lastre",
            "base",
            extrude_polygon(cover, height - 1.2, 3.0),
            "base",
            settings,
            category="hardware",
        )
    if settings["feet"]:
        for index, (x, y) in enumerate(
            [
                (18.0, 18.0),
                (width - 18.0, 18.0),
                (18.0, depth - 18.0),
                (width - 18.0, depth - 18.0),
            ],
            start=1,
        ):
            _part(
                parts,
                f"foot-{index}",
                f"Pata {index}",
                "base",
                cylinder(x, y, -4.0, 13.0, 4.5, 36),
                "base",
                settings,
                category="hardware",
            )
    if settings["strapSlots"]:
        for index, y in enumerate((14.0, depth - 14.0), start=1):
            _part(
                parts,
                f"strap-anchor-{index}",
                f"Anclaje de correa {index}",
                "base",
                box(width * 0.16, y - 3.0, height - 1.0, width * 0.68, 6.0, 3.0),
                "corner",
                settings,
                category="hardware",
            )


def _rear(settings: dict[str, Any], parts: list[dict[str, Any]]) -> float:
    width = settings["width"]
    depth = settings["depth"]
    height = settings["baseHeight"]
    side = settings["sideThickness"]
    post = settings["postDepth"]
    panel_t = settings["panelThickness"]
    back_h = settings["backHeight"]
    rear = _rear_matrix(settings)
    for side_name, x in (("izquierdo", 0.0), ("derecho", width - side)):
        _part(
            parts,
            f"rear-post-{side_name}",
            f"Poste trasero {side_name}",
            "rear",
            box(x, depth - post, height, side, post, back_h + 18.0),
            "frame",
            settings,
            fold_matrix=rear,
            category="structure",
        )
    brace_h = 18.0
    _part(
        parts,
        "rear-brace-bottom",
        "Travesaño trasero inferior",
        "rear",
        box(side, depth - post + 2.0, height + 4.0, width - 2 * side, 8.0, brace_h),
        "frame",
        settings,
        fold_matrix=rear,
        category="structure",
    )
    _part(
        parts,
        "rear-brace-top",
        "Travesaño trasero superior",
        "rear",
        box(side, depth - post + 2.0, height + back_h - 8.0, width - 2 * side, 8.0, brace_h),
        "frame",
        settings,
        fold_matrix=rear,
        category="structure",
    )
    panel_x = side
    panel_w = width - 2 * side
    panel_h = back_h
    split = max(1, settings["panelSplit"])
    gap = 4.0 if split > 1 else 0.0
    piece_w = (panel_w - gap * (split - 1)) / split
    joins_created = 0
    for index in range(split):
        x = panel_x + index * (piece_w + gap)
        poly = rounded_rect(piece_w, panel_h, 4.0)
        kind = settings["backPanel"]
        holes: list[Polygon] = []
        if kind == "skadis":
            holes = _skadis_slots(piece_w, panel_h, margin=14.0)
        elif kind == "honeycomb":
            holes = _honeycomb_holes(piece_w, panel_h, radius=4.2)
        elif kind == "branding":
            holes = [
                _t(rounded_rect(piece_w - 18.0, panel_h - 26.0, 8.0), 9.0, 13.0),
            ]
        poly = _holes_in(poly, holes)
        _part(
            parts,
            f"back-panel-{index + 1}",
            f"Panel trasero {index + 1}",
            "rear",
            _vertical(extrude_polygon(_t(poly, x, 0.0), 0.0, panel_t), depth, height),
            "panel",
            settings,
            fold_matrix=rear,
            category="panel",
        )
        if split > 1 and index < split - 1 and settings["panelJoiners"]:
            for z_index, z in enumerate((height + 35.0, height + panel_h - 45.0), start=1):
                joins_created += 1
                clip = rounded_rect(34.0, 26.0, 6.0)
                clip = _holes_in(
                    clip,
                    [
                        _t(Polygon([(12 - 2.1, 13 - 2.1), (12 + 2.1, 13 - 2.1), (12 + 2.1, 13 + 2.1), (12 - 2.1, 13 + 2.1)]), 0, 0),
                        _t(Polygon([(22 - 2.1, 13 - 2.1), (22 + 2.1, 13 - 2.1), (22 + 2.1, 13 + 2.1), (22 - 2.1, 13 + 2.1)]), 0, 0),
                    ],
                )
                _part(
                    parts,
                    f"panel-joiner-{index + 1}-{z_index}",
                    f"Unión de panel {index + 1}.{z_index}",
                    "rear",
                    _vertical(extrude_polygon(_t(clip, x + piece_w - 17.0, 0.0), 0.0, 24.0), depth - panel_t - 4.0, height + 35.0),
                    "corner",
                    settings,
                        fold_matrix=rear,
                    category="hardware",
                )
    if settings["backPanel"] == "branding":
        _part(
            parts,
            "branding-plate",
            "Placa de marca",
            "rear",
            box(width * 0.32, depth - panel_t - 3.0, height + back_h * 0.42, width * 0.36, 3.0, back_h * 0.3),
            "accessory",
            settings,
            fold_matrix=rear,
            category="panel",
        )
    if settings["wallMounts"]:
        for index, x in enumerate((width * 0.25, width * 0.75), start=1):
            mount = rounded_rect(24.0, 40.0, 5.0)
            mount = _holes_in(
                mount,
                [
                    _slot(12.0, 27.0, 5.0, 13.0),
                ],
            )
            _part(
                parts,
                f"wall-mount-{index}",
                f"Colgador de pared {index}",
                "rear",
                _vertical(extrude_polygon(_t(mount, x - 12.0, 0.0), 0.0, 8.0), depth - panel_t - 4.0, height + back_h * 0.35),
                "corner",
                settings,
                fold_matrix=rear,
                category="hardware",
            )
    return panel_h


def _front(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    width = settings["width"]
    depth = settings["depth"]
    base_h = settings["baseHeight"]
    side = settings["sideThickness"]
    front = _front_matrix(settings)
    max_level = max((level["height"] for level in settings["levelConfigs"] if level["enabled"]), default=0.0)
    leg_width = side
    top_y = min(depth * 0.48, settings["shelfDepth"] * 0.82)
    top_z = max(base_h + 60.0, max_level + 30.0)
    profile = Polygon(
        [
            (0.0, 0.0),
            (leg_width + 12.0, 0.0),
            (top_y + leg_width, top_z),
            (top_y, top_z),
        ]
    )
    lightening = []
    for index, fraction in enumerate((0.35, 0.55), start=1):
        cx = 9.0 + fraction * top_y
        cz = base_h + fraction * top_z
        lightening.append(Point(cx, cz).buffer(max(5.0, leg_width * 0.22), resolution=16))
    profile = _holes_in(profile, lightening)
    for side_name, x in (("izquierdo", 0.0), ("derecho", width - leg_width)):
        _part(
            parts,
            f"front-leg-{side_name}",
            f"Pata delantera {side_name}",
            "front",
            extrude_polygon(profile, 0.0, leg_width).transformed(
                np.array(
                    [
                        [0, 0, 1, x],
                        [1, 0, 0, 0],
                        [0, 1, 0, 0],
                        [0, 0, 0, 1],
                    ],
                    dtype=float,
                )
            ),
            "frame",
            settings,
            fold_matrix=front,
            category="structure",
        )
    for index, level in enumerate(settings["levelConfigs"]):
        if not level["enabled"]:
            continue
        z = level["height"]
        rail_depth = level["depth"]
        for side_name, x in (("izquierdo", 0.0), ("derecho", width - side)):
            _part(
                parts,
                f"front-rail-{index + 1}-{side_name}",
                f"Raíl delantero {index + 1} {side_name}",
                "front",
                box(x, 4.0, z - 7.0, side, rail_depth, 12.0),
                "frame",
                settings,
                fold_matrix=front,
                category="structure",
            )
        _part(
            parts,
            f"front-tie-{index + 1}",
            f"Travesaño delantero {index + 1}",
            "front",
            box(side, 8.0, z - 6.0, width - 2 * side, 8.0, 10.0),
            "frame",
            settings,
            fold_matrix=front,
            category="structure",
        )
    _part(
        parts,
        "front-top-bar",
        "Barra superior delantera",
        "front",
        box(side, top_y * 0.4, top_z - 8.0, width - 2 * side, 16.0, 16.0),
        "frame",
        settings,
        fold_matrix=front,
        category="structure",
    )
    if settings["railEnds"]:
        for index, level in enumerate(settings["levelConfigs"]):
            for side_name, x in (("izq", 0.0), ("der", width - side)):
                _part(
                    parts,
                    f"rail-end-{index + 1}-{side_name}",
                    f"Tope de raíl {index + 1} {side_name}",
                    "front",
                    box(min(width - side, max(0.0, x - 1.0)), level["depth"] - 1.0, level["height"] - 10.0, side + 2.0, 5.0, 18.0),
                    "corner",
                    settings,
                    fold_matrix=front,
                    category="hardware",
                )


def _shelf_insert(
    settings: dict[str, Any],
    level: dict[str, Any],
    index: int,
    x: float,
    y: float,
    z: float,
    width: float,
    depth: float,
    open_matrix: np.ndarray | None,
    fold: np.ndarray,
    parts: list[dict[str, Any]],
) -> None:
    insert = level["insert"]
    if insert == "none":
        return
    base_z = z + settings["shelfThickness"]
    prefix = f"level-{index + 1}-insert"
    name = f"Insert {index + 1}"
    if insert.startswith("bin"):
        count = int(insert[-1])
        cell = width / count
        outer = rounded_rect(width, depth * 0.72, 6.0)
        hole = _t(rounded_rect(width - 5.0, depth * 0.72 - 5.0, 4.0), 2.5, 2.5)
        wall = outer.difference(hole)
        bin_mesh = extrude_polygon(wall, base_z, 32.0)
        bin_mesh = bin_mesh.append(extrude_polygon(hole.buffer(0.0), base_z, 2.5))
        for divider in range(1, count):
            bin_mesh = bin_mesh.append(box(x + divider * cell - 1.2, y, base_z + 2.5, 2.4, depth * 0.72, 30.0))
        _part(
            parts,
            f"{prefix}-bin-{count}",
            f"Bandeja {count} compartimentos",
            f"shelf-{index + 1}",
            bin_mesh.translated((x, y, 0.0)),
            "bin",
            settings,
            open_matrix=open_matrix,
            fold_matrix=fold,
            category="insert",
        )
    elif insert == "bookmark4":
        count = 4
        cell = width / count
        tray = rounded_rect(width, depth, 5.0)
        tray = _holes_in(tray, [_t(rounded_rect(width - 4.0, depth - 4.0, 4.0), 2.0, 2.0)])
        mesh = extrude_polygon(tray, base_z, 18.0)
        mesh = mesh.append(extrude_polygon(rounded_rect(width - 4.0, depth - 4.0, 4.0), base_z, 2.0))
        for divider in range(1, count):
            mesh = mesh.append(box(x + divider * cell - 1.2, y, base_z + 2.0, 2.4, depth, 16.0))
        _part(
            parts,
            f"{prefix}-bookmark4",
            "Marcapáginas 4 huecos",
            f"shelf-{index + 1}",
            mesh.translated((x, y, 0.0)),
            "bin",
            settings,
            open_matrix=open_matrix,
            fold_matrix=fold,
            category="insert",
        )
    elif insert == "pen6":
        count = 6
        cell = width / count
        plate = rounded_rect(width, depth, 8.0)
        holes = [
            _t(Polygon([(cx + 14 * math.cos(math.radians(a)), cy + 14 * math.sin(math.radians(a))) for a in range(0, 360, 24)]), 0, 0)
            for cx, cy in [(cell * (i + 0.5), depth * 0.5) for i in range(count)]
        ]
        plate = _holes_in(plate, holes)
        _part(
            parts,
            f"{prefix}-pen6",
            "Portabolígrafos 6",
            f"shelf-{index + 1}",
            extrude_polygon(plate, base_z + 22.0, 5.0).translated((x, y, 0.0)),
            "bin",
            settings,
            open_matrix=open_matrix,
            fold_matrix=fold,
            category="insert",
        )
    elif insert in {"rings", "earringCards", "bracelet", "necklace", "honeycomb", "coasterRail", "cardRail"}:
        if insert == "rings":
            mesh = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
            count = max(3, int(width / 48.0))
            for ring_index in range(count):
                cx = x + (ring_index + 0.5) * width / count
                mesh = mesh.append(cone(cx, y + depth * 0.45, base_z, 18.0, 42.0, 40))
            _part(
                parts,
                f"{prefix}-rings",
                "Conos de anillos",
                f"shelf-{index + 1}",
                mesh,
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )
        elif insert == "earringCards":
            plate = rounded_rect(width, depth, 6.0)
            holes = []
            cols = max(3, int(width / 42.0))
            rows = max(2, int(depth / 52.0))
            for row in range(rows):
                for col in range(cols):
                    cx = x + 18.0 + col * (width - 36.0) / max(1, cols - 1)
                    cy = y + 18.0 + row * (depth - 36.0) / max(1, rows - 1)
                    holes.append(_t(rounded_rect(4.0, 14.0, 2.0), cx - 2.0, cy - 7.0))
            plate = _holes_in(plate, [affinity.translate(h, -x, -y) for h in holes])
            _part(
                parts,
                f"{prefix}-earring-cards",
                "Panel de tarjetas de pendientes",
                f"shelf-{index + 1}",
                extrude_polygon(plate, base_z, 6.0).translated((x, y, 0.0)),
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )
        elif insert == "bracelet":
            mesh = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
            count = max(3, int(width / 52.0))
            for brace_index in range(count):
                cx = x + (brace_index + 0.5) * width / count
                mesh = mesh.append(cylinder(cx, y + depth * 0.42, base_z, 11.0, 64.0, 32))
                mesh = mesh.append(box(cx - 16.0, y + depth * 0.42 - 4.0, base_z + 30.0, 32.0, 8.0, 8.0))
            _part(
                parts,
                f"{prefix}-bracelet",
                "Expositor de pulseras",
                f"shelf-{index + 1}",
                mesh,
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )
        elif insert == "necklace":
            plate = rounded_rect(width, depth, 6.0)
            notches = [
                _t(rounded_rect(6.0, 16.0, 3.0), 14.0 + i * (width - 28.0) / 5.0 - 3.0, depth - 13.0)
                for i in range(6)
            ]
            plate = _holes_in(plate, notches)
            _part(
                parts,
                f"{prefix}-necklace",
                "Panel de collares",
                f"shelf-{index + 1}",
                extrude_polygon(plate, base_z, 6.0).translated((x, y, 0.0)),
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )
        elif insert == "honeycomb":
            poly = rounded_rect(width, depth, 6.0)
            poly = _holes_in(poly, _honeycomb_holes(width, depth, radius=4.2))
            _part(
                parts,
                f"{prefix}-honeycomb",
                "Panel de miel",
                f"shelf-{index + 1}",
                extrude_polygon(poly, base_z + 30.0, 6.0).translated((x, y, 0.0)),
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )
        elif insert == "coasterRail":
            mesh = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
            mesh = mesh.append(box(x, y, base_z, width, 6.0, 24.0))
            mesh = mesh.append(box(x, y + depth - 6.0, base_z, width, 6.0, 24.0))
            for index_rail in range(1, 4):
                mesh = mesh.append(box(x, y + index_rail * depth / 4.0, base_z, width, 3.0, 10.0))
            _part(
                parts,
                f"{prefix}-coaster-rail",
                "Raíles de posavasos",
                f"shelf-{index + 1}",
                mesh,
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )
        else:
            mesh = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
            mesh = mesh.append(box(x, y, base_z, width, 4.0, 22.0))
            mesh = mesh.append(box(x, y + depth - 4.0, base_z, width, 4.0, 22.0))
            _part(
                parts,
                f"{prefix}-card-rail",
                "Raíl de tarjetas",
                f"shelf-{index + 1}",
                mesh,
                "accessory",
                settings,
                open_matrix=open_matrix,
                fold_matrix=fold,
                category="insert",
            )


def _shelves(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    width = settings["width"]
    side = settings["sideThickness"]
    shelf_t = settings["shelfThickness"]
    lip_t = settings["lipThickness"]
    for index, level in enumerate(settings["levelConfigs"]):
        if not level["enabled"]:
            continue
        inner_w = width - 2 * side - 1.0
        x = side + 0.5
        depth = level["depth"]
        y = max(4.0, min(settings["depth"] - depth - settings["panelThickness"] - 6.0, settings["depth"] * 0.42 - depth * 0.5))
        z = level["height"]
        fold = _shelf_fold(settings, index, depth, z)
        angle = -level["angle"]
        open_matrix = matrix_rotate_x(angle, (0.0, y, z)) if abs(angle) > 0.01 else None
        poly = rounded_rect(inner_w, depth, 4.0)
        if level["type"] == "pegboard":
            poly = _holes_in(poly, _skadis_slots(inner_w, depth, margin=10.0))
        elif level["type"] == "rail":
            poly = _holes_in(poly, [_t(rounded_rect(inner_w * 0.7, 5.0, 2.5), inner_w * 0.15, depth * 0.3)])
        shelf_mesh = extrude_polygon(poly, z, shelf_t)
        if level["lip"] and level["lipHeight"] > 0:
            shelf_mesh = shelf_mesh.append(
                box(x, y, z, inner_w, lip_t, level["lipHeight"])
            )
            lip_top = level["lipHeight"] * 0.72
            shelf_mesh = shelf_mesh.append(box(x, y, z + lip_top, inner_w, lip_t * 0.7, 2.0))
        for edge_index, edge_x in enumerate((x, x + inner_w - 3.0), start=1):
            shelf_mesh = shelf_mesh.append(box(edge_x, y, z, 3.0, depth, 8.0))
        _part(
            parts,
            f"shelf-{index + 1}",
            level["name"],
            f"shelf-{index + 1}",
            shelf_mesh,
            level["color"],
            settings,
            open_matrix=open_matrix,
            fold_matrix=fold,
            category="shelf",
        )
        if settings["shelfBrackets"]:
            bracket_profile = Polygon([(0.0, 0.0), (18.0, 0.0), (0.0, 18.0)])
            for side_name, bx in (("izq", x + 4.0), ("der", x + inner_w - 22.0)):
                _part(
                    parts,
                    f"shelf-bracket-{index + 1}-{side_name}",
                    f"Escuadra de bandeja {index + 1} {side_name}",
                    f"shelf-{index + 1}",
                    extrude_polygon(_t(bracket_profile, bx, y + depth - 22.0), z - 18.0, 4.0),
                    "corner",
                    settings,
                    open_matrix=open_matrix,
                    fold_matrix=fold,
                    category="hardware",
                )
        _shelf_insert(settings, level, index, x + 2.0, y + 2.0, z, inner_w - 4.0, depth - 4.0, open_matrix, fold, parts)


def _hook_skadis(length: float, panel_t: float, settings: dict[str, Any]) -> Mesh:
    mesh = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    mesh = mesh.append(box(-28.0, 0.0, -15.0, 56.0, 4.0, 30.0))
    for x in (-20.0, 20.0):
        mesh = mesh.append(box(x - 2.15, 0.0, -6.0, 4.3, panel_t + 1.5, 12.0))
        mesh = mesh.append(box(x - 4.5, panel_t, -6.0, 9.0, 2.4, 12.0))
    profile = Polygon(
        [
            (0.0, -3.5),
            (-length, -3.5),
            (-length, 10.0),
            (-length + 8.0, 15.0),
            (-length + 8.0, 7.0),
            (-5.0, 7.0),
            (-5.0, 3.5),
            (0.0, 3.5),
        ]
    )
    mesh = mesh.append(extrude_polygon(profile, 0.0, 9.0))
    if settings["hookLength"] > 55.0:
        mesh = mesh.append(box(-length + 6.0, -4.0, -8.0, 3.0, 8.0, 10.0))
    return mesh


def _hook_wire(length: float, pitch: float, wire: float, settings: dict[str, Any]) -> Mesh:
    clearance = max(0.2, settings["clearance"] * 0.8)
    radius = max(1.2, wire / 2.0 + clearance)
    outer = rounded_rect(radius * 4.0 + 8.0, radius * 4.0 + 8.0, 5.0)
    outer = _t(outer, -outer.bounds[2] / 2.0, -outer.bounds[3] / 2.0)
    inner = Point(0.0, 0.0).buffer(radius, resolution=28)
    opening = _t(rounded_rect(radius * 1.3, radius * 2.0 + 8.0, 2.0), -radius * 0.65, -radius * 2.0 - 4.0)
    clamp = outer.difference(inner).difference(opening)
    mesh = extrude_polygon(clamp, -6.0, 12.0).transformed(
        np.array(
            [
                [0, 0, 1, 0],
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 0, 1],
            ],
            dtype=float,
        )
    )
    arm = rounded_rect(12.0, max(8.0, length), 4.0)
    arm = _t(arm, -6.0, -max(8.0, length) + radius * 0.4)
    mesh = mesh.append(extrude_polygon(arm, -3.0, 6.0).transformed(
        np.array(
            [
                [0, 0, 1, 0],
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 0, 1],
            ],
            dtype=float,
        )
    ))
    tip = box(-6.0, -length + 2.0, 2.0, 12.0, 8.0, 14.0)
    return mesh.append(tip)


def _hooks(settings: dict[str, Any], parts: list[dict[str, Any]], panel_h: float) -> None:
    if settings["hooks"] <= 0 or settings["backPanel"] == "none":
        return
    width = settings["width"]
    side = settings["sideThickness"]
    panel_t = settings["panelThickness"]
    panel_w = width - 2 * side
    rows = max(1, settings["hookRows"])
    cols = max(1, math.ceil(settings["hooks"] / rows))
    margin = 34.0
    pitch = min(settings["hookSpacing"], max(20.0, (panel_w - 2 * margin) / max(1, cols - 1)))
    start_x = width / 2.0 if cols == 1 else margin + 28.0
    start_z = settings["baseHeight"] + panel_h * 0.72
    rear = _rear_matrix(settings)
    made = 0
    for row in range(rows):
        for col in range(cols):
            if made >= settings["hooks"]:
                break
            made += 1
            x = start_x + col * pitch
            x = min(width - margin, max(margin, x))
            z = start_z - row * max(42.0, panel_h * 0.22)
            z = max(settings["baseHeight"] + 40.0, min(settings["baseHeight"] + panel_h - 24.0, z))
            if settings["hookType"] in {"skadis", "combo"}:
                mesh = _hook_skadis(settings["hookLength"], panel_t, settings)
            else:
                mesh = _hook_wire(settings["hookLength"], settings["wirePitch"], settings["wireDiameter"], settings)
            mesh = mesh.translated((x, settings["depth"] - panel_t - 3.0, z))
            _part(
                parts,
                f"hook-{made}",
                f"Gancho {made}",
                "rear",
                mesh,
                "hook",
                settings,
                fold_matrix=rear,
                category="hook",
            )
            if settings["hookLocks"] and settings["hookType"] in {"skadis", "combo"}:
                for lock_x in (-20.0, 20.0):
                    _part(
                        parts,
                        f"hook-lock-{made}-{int(lock_x + 21)}",
                        f"Seguro de gancho {made}",
                        "rear",
                        box(lock_x - 3.0, panel_t - 0.4, -5.0, 6.0, 4.0, 10.0).translated(
                            (x, settings["depth"] - panel_t - 3.0, z)
                        ),
                        "corner",
                        settings,
                        fold_matrix=rear,
                        category="hardware",
                    )
            if settings["priceTags"] >= made and made % 2 == 1:
                tag = _price_tag_mesh()
                _part(
                    parts,
                    f"hook-price-{made}",
                    f"Portaprecios de gancho {made}",
                    "rear",
                    tag.translated((x, settings["depth"] - panel_t - settings["hookLength"] - 4.0, z - 18.0)),
                    "price",
                    settings,
                    fold_matrix=rear,
                    category="accessory",
                )


def _price_tag_mesh() -> Mesh:
    mesh = Mesh(np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64))
    mesh = mesh.append(box(-16.0, 0.0, 0.0, 32.0, 10.0, 4.0))
    plate = Polygon([(0.0, 0.0), (32.0, 0.0), (32.0, 24.0), (0.0, 24.0)])
    plate = _holes_in(plate, [_t(rounded_rect(24.0, 15.0, 2.0), 4.0, 4.0)])
    mesh = mesh.append(extrude_polygon(plate, 0.0, 2.4).transformed(matrix_rotate_x(-24.0, (0.0, 0.0, 4.0))))
    return mesh


def _bins(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    if settings["bins"] <= 0:
        return
    count = settings["bins"]
    for index in range(count):
        level = settings["levelConfigs"][index % max(1, settings["levels"])]
        if not level["enabled"]:
            continue
        depth = min(level["depth"] - 8.0, 90.0)
        inner = settings["width"] - 2 * settings["sideThickness"] - 20.0
        cols = max(1, int(inner // 96.0))
        width = min(130.0, inner / cols - 8.0)
        column = (index // max(1, settings["levels"])) % cols
        x = settings["sideThickness"] + 10.0 + column * (width + 8.0)
        y = 10.0
        z = level["height"] + settings["shelfThickness"]
        outer = rounded_rect(width, depth, 6.0)
        inner = _t(rounded_rect(width - 5.0, depth - 5.0, 4.0), 2.5, 2.5)
        mesh = extrude_polygon(outer.difference(inner), z, 42.0)
        mesh = mesh.append(extrude_polygon(inner, z, 2.5))
        mesh = mesh.append(box(x + width / 2.0 - 1.2, y + 2.5, z + 2.5, 2.4, depth - 5.0, 40.0))
        fold = _shelf_fold(settings, index % max(1, settings["levels"]), depth, level["height"])
        _part(
            parts,
            f"bin-{index + 1}",
            f"Bandeja organizadora {index + 1}",
            f"shelf-{(index % max(1, settings['levels'])) + 1}",
            mesh.translated((x, y, 0.0)),
            "bin",
            settings,
            fold_matrix=fold,
            category="accessory",
        )
        if settings["binLids"]:
            lid = rounded_rect(width + 1.0, depth + 1.0, 6.0)
            lip = _t(rounded_rect(width - 5.0, depth - 5.0, 4.0), 2.5, 2.5)
            _part(
                parts,
                f"bin-lid-{index + 1}",
                f"Tapa de bandeja {index + 1}",
                f"shelf-{(index % max(1, settings['levels'])) + 1}",
                extrude_polygon(lid.difference(lip), z + 42.0, 4.0).translated((x, y, 0.0)),
                "bin",
                settings,
                fold_matrix=fold,
                category="accessory",
            )


def _price_tags(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    if settings["priceTags"] <= 0:
        return
    for index in range(settings["priceTags"]):
        level = settings["levelConfigs"][index % max(1, settings["levels"])]
        if not level["enabled"]:
            continue
        x = settings["width"] * (0.22 + 0.14 * (index % 4))
        y = 12.0
        z = level["height"] + level["lipHeight"] + settings["lipThickness"]
        fold = _shelf_fold(settings, index % max(1, settings["levels"]), level["depth"], level["height"])
        _part(
            parts,
            f"price-tag-{index + 1}",
            f"Portaprecios {index + 1}",
            f"shelf-{(index % max(1, settings['levels'])) + 1}",
            _price_tag_mesh().translated((x, y, z)),
            "price",
            settings,
            fold_matrix=fold,
            category="accessory",
        )


def _letters(settings: dict[str, Any], parts: list[dict[str, Any]], panel_h: float) -> None:
    if settings["letters"] <= 0:
        return
    rear = _rear_matrix(settings)
    chars = [character for character in settings["letterText"].upper() if character.strip()]
    if not chars:
        chars = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ")
    count = min(settings["letters"], len(alphabet))
    cell = 3.2
    for index in range(count):
        character = alphabet[index]
        plate = rounded_rect(30.0, 42.0, 5.0)
        plate = _holes_in(plate, [_t(rounded_rect(4.0, 6.0, 2.0), 13.0, 3.0)])
        mesh = extrude_polygon(plate, 0.0, 2.6)
        text = _text_mesh(character, cell, 0.8, 1.2)
        if not text.empty:
            text_bounds = text.bounds
            text_w = text_bounds["max"][0] - text_bounds["min"][0]
            text_h = text_bounds["max"][1] - text_bounds["min"][1]
            mesh = mesh.append(text.translated((15.0 - text_w / 2.0, 10.0 - text_h / 2.0, 2.6)))
        x = 12.0 + index * 34.0
        z = settings["baseHeight"] + panel_h - 52.0
        _part(
            parts,
            f"letter-{character}",
            f"Letra {character}",
            "rear",
            _vertical(mesh, settings["depth"] - settings["panelThickness"] - 4.0, z).translated((x, 0.0, 0.0)),
            "price",
            settings,
            fold_matrix=rear,
            category="accessory",
        )


def _sign(settings: dict[str, Any], parts: list[dict[str, Any]], panel_h: float) -> None:
    if not settings["sign"]:
        return
    rear = _rear_matrix(settings)
    text = (settings["letterText"] or "DISPLAYNIAN")[:16]
    cell = 3.0
    text_mesh = _text_mesh(text, cell, 0.8, 1.6)
    if text_mesh.empty:
        return
    text_bounds = text_mesh.bounds
    text_w = text_bounds["max"][0] - text_bounds["min"][0]
    text_h = text_bounds["max"][1] - text_bounds["min"][1]
    sign_w = max(120.0, text_w + 24.0)
    sign_h = max(38.0, text_h + 16.0)
    plate = rounded_rect(sign_w, sign_h, 7.0)
    mesh = extrude_polygon(plate, 0.0, 2.8)
    mesh = mesh.append(text_mesh.translated(((sign_w - text_w) / 2.0, (sign_h - text_h) / 2.0, 2.8)))
    x = (settings["width"] - sign_w) / 2.0
    z = settings["baseHeight"] + panel_h + 4.0
    _part(
        parts,
        "top-sign",
        "Cartel superior",
        "rear",
        _vertical(mesh, settings["depth"] - settings["panelThickness"] - 6.0, z).translated((x, 0.0, 0.0)),
        "accessory",
        settings,
        fold_matrix=rear,
        category="sign",
    )
    for index, post_x in enumerate((x + 12.0, x + sign_w - 18.0), start=1):
        _part(
            parts,
            f"sign-post-{index}",
            f"Soporte de cartel {index}",
            "rear",
            box(post_x, settings["depth"] - settings["panelThickness"] - 4.0, z - 30.0, 6.0, 8.0, 32.0),
            "corner",
            settings,
            fold_matrix=rear,
            category="hardware",
        )


def _awning(settings: dict[str, Any], parts: list[dict[str, Any]], panel_h: float) -> None:
    if not settings["awning"]:
        return
    rear = _rear_matrix(settings)
    count = max(3, int(settings["width"] / 90.0))
    slat_w = settings["width"] / count
    for index in range(count):
        x = index * slat_w
        mesh = box(x + 2.0, 0.0, 0.0, slat_w - 4.0, 58.0, 4.0)
        mesh = mesh.transformed(matrix_rotate_x(-18.0, (0.0, 0.0, 0.0)))
        _part(
            parts,
            f"awning-{index + 1}",
            f"Toldo {index + 1}",
            "rear",
            mesh.translated((0.0, settings["depth"] - settings["panelThickness"] - 12.0, settings["baseHeight"] + panel_h + 18.0)),
            "accessory" if index % 2 == 0 else "price",
            settings,
            fold_matrix=rear,
            category="sign",
        )
    _part(
        parts,
        "awning-rail",
        "Raíl de toldo",
        "rear",
        box(0.0, settings["depth"] - settings["panelThickness"] - 16.0, settings["baseHeight"] + panel_h + 14.0, settings["width"], 8.0, 8.0),
        "corner",
        settings,
        fold_matrix=rear,
        category="sign",
    )


def _corners(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    if not settings["cornerBrackets"]:
        return
    leg = settings["cornerLeg"]
    inset = settings["cornerInset"]
    thick = max(3.0, settings["sideThickness"] - 2.0)
    screw_radius = max(1.0, settings["cornerScrew"] / 2.0)
    kind = settings["cornerType"]
    if kind == "u":
        poly = rounded_rect(leg, leg, min(4.0, leg / 3.0))
        poly = poly.difference(_t(rounded_rect(leg - thick * 2.0, leg - thick * 2.0, 3.0), thick, thick))
        holes = [
            Point(thick / 2.0, leg * 0.68).buffer(screw_radius, resolution=20),
            Point(leg - thick / 2.0, leg * 0.68).buffer(screw_radius, resolution=20),
        ]
        poly = _holes_in(poly, holes)
    elif kind == "flat":
        poly = rounded_rect(leg, leg, min(6.0, leg / 4.0))
        holes = [
            Point(leg * 0.28, leg * 0.28).buffer(screw_radius, resolution=20),
            Point(leg * 0.72, leg * 0.28).buffer(screw_radius, resolution=20),
            Point(leg * 0.28, leg * 0.72).buffer(screw_radius, resolution=20),
            Point(leg * 0.72, leg * 0.72).buffer(screw_radius, resolution=20),
        ]
        poly = _holes_in(poly, holes)
    elif kind == "tri":
        poly = Polygon([(0.0, 0.0), (leg, 0.0), (0.0, leg)])
        holes = [
            Point(leg * 0.2, leg * 0.2).buffer(screw_radius, resolution=20),
            Point(leg * 0.58, leg * 0.16).buffer(screw_radius, resolution=20),
        ]
        poly = _holes_in(poly, holes)
    else:
        horizontal = rounded_rect(leg, thick, min(3.0, thick / 2.0))
        vertical = rounded_rect(thick, leg, min(3.0, thick / 2.0))
        poly = unary_union([horizontal, vertical])
        holes = [
            Point(leg * 0.66, thick / 2.0).buffer(screw_radius, resolution=20),
            Point(thick / 2.0, leg * 0.66).buffer(screw_radius, resolution=20),
        ]
        poly = _holes_in(poly, holes)
    spots = [
        (inset, inset, 0.0),
        (settings["width"] - inset - leg, inset, 90.0),
        (settings["width"] - inset - leg, settings["depth"] - inset - leg, 180.0),
        (inset, settings["depth"] - inset - leg, 270.0),
    ]
    for index, (x, y, rotation) in enumerate(spots, start=1):
        piece = affinity.rotate(poly, rotation, origin=(0, 0), use_radians=False)
        piece = affinity.translate(piece, xoff=x, yoff=y)
        _part(
            parts,
            f"corner-bracket-{index}",
            f"Esquina {index}",
            "base",
            extrude_polygon(piece, settings["baseHeight"], thick),
            "corner",
            settings,
            category="hardware",
        )
    if settings["panelJoiners"]:
        for index, x in enumerate((settings["width"] * 0.28, settings["width"] * 0.72), start=1):
            _part(
                parts,
                f"panel-clip-{index}",
                f"Clip de panel {index}",
                "rear",
                box(x - 18.0, settings["depth"] - settings["panelThickness"] - 10.0, settings["baseHeight"] + 12.0, 36.0, 10.0, 10.0),
                "corner",
                settings,
                fold_matrix=_rear_matrix(settings),
                category="hardware",
            )


def _locks(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    front = _front_matrix(settings)
    if not settings["transport"]:
        return
    for index, x in enumerate((settings["sideThickness"] * 0.2, settings["width"] - settings["sideThickness"] * 1.2), start=1):
        mesh = box(x, 18.0, settings["baseHeight"] + 20.0, 8.0, 72.0, 16.0)
        mesh = mesh.append(box(x - 3.0, 78.0, settings["baseHeight"] + 16.0, 14.0, 8.0, 24.0))
        _part(
            parts,
            f"rail-lock-{index}",
            f"Bloqueo de raíl {index}",
            "front",
            mesh,
            "corner",
            settings,
            fold_matrix=front,
            category="hardware",
        )


def _dowels(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    if settings["joinery"] not in {"dowel", "hybrid"}:
        return
    count = 8
    for index in range(count):
        x = settings["width"] * 0.18 + (index % 4) * 18.0
        y = settings["depth"] * 0.84 + (index // 4) * 18.0
        _part(
            parts,
            f"dowel-{index + 1}",
            f"Pasador {index + 1}",
            "base",
            cylinder(x, y, settings["baseHeight"], 3.0, 34.0, 28),
            "corner",
            settings,
            category="hardware",
        )


def _transport(settings: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    if not settings["transport"]:
        return
    levels = settings["levels"]
    stack_h = (
        settings["baseHeight"]
        + settings["panelThickness"]
        + 16.0
        + levels * (settings["shelfThickness"] + 5.0)
    )
    lid_h = 26.0
    width = settings["width"]
    depth = settings["depth"]
    if settings["transportLid"]:
        outer = rounded_rect(width, depth, settings["baseRadius"])
        inner = _t(rounded_rect(width - 12.0, depth - 12.0, max(2.0, settings["baseRadius"] - 5.0)), 6.0, 6.0)
        lid = outer.difference(inner)
        mesh = extrude_polygon(lid, stack_h, lid_h)
        mesh = mesh.append(box(0.0, 0.0, stack_h + lid_h - 3.0, width, depth, 3.0))
        _part(
            parts,
            "transport-lid",
            "Tapa de transporte",
            "transport",
            mesh,
            "transport",
            settings,
            transport_only=True,
            category="transport",
        )
    if settings["transportHandle"]:
        handle_z = stack_h + lid_h + 3.0
        mesh = box(width * 0.32, depth * 0.45, handle_z, 44.0, 10.0, 7.0)
        mesh = mesh.append(box(width * 0.32, depth * 0.45, handle_z, 7.0, 10.0, 30.0))
        mesh = mesh.append(box(width * 0.32 + 37.0, depth * 0.45, handle_z, 7.0, 10.0, 30.0))
        _part(
            parts,
            "transport-handle",
            "Asa de transporte",
            "transport",
            mesh,
            "transport",
            settings,
            transport_only=True,
            category="transport",
        )
    if settings["transportHandle"]:
        _part(
            parts,
            "transport-handle-grip",
            "Empuñadura",
            "transport",
            box(width * 0.32 + 4.0, depth * 0.45 - 2.0, handle_z + 26.0, 36.0, 14.0, 10.0),
            "transport",
            settings,
            transport_only=True,
            category="transport",
        )
    if settings["stackable"] and settings["transportLid"]:
        for index, (x, y) in enumerate(
            [
                (14.0, 14.0),
                (width - 34.0, 14.0),
                (14.0, depth - 34.0),
                (width - 34.0, depth - 34.0),
            ],
            start=1,
        ):
            _part(
                parts,
                f"stack-pad-{index}",
                f"Apoyo de apilado {index}",
                "transport",
                box(x, y, stack_h + lid_h + 3.0, 20.0, 20.0, 5.0),
                "corner",
                settings,
                transport_only=True,
                category="transport",
            )


def _bom(settings: dict[str, Any], parts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    links = sum(1 for part in parts if part["id"].startswith("link-"))
    pins = sum(1 for part in parts if part["id"].startswith("pin-"))
    trays = sum(1 for part in parts if part["id"].startswith("tray-") and part["category"] == "shelf")
    panels = sum(1 for part in parts if part["id"].startswith("panel-") and part["category"] == "panel")
    hooks = sum(1 for part in parts if part["category"] == "hook")
    if links:
        items.append({"name": "Enlaces de plegado", "quantity": links, "detail": f"{settings['postDepth']:.0f} mm"})
    if pins:
        items.append({"name": "Pasadores impresos", "quantity": pins, "detail": f"Ø{settings['pinDiameter']:.1f} mm"})
    if trays:
        items.append({"name": "Bandejas", "quantity": trays, "detail": f"{settings['lipHeight']:.0f} mm alto"})
    if panels:
        items.append({"name": "Paneles traseros", "quantity": panels, "detail": f"{settings['panelThickness']:.1f} mm"})
    containers = sum(1 for part in parts if "-container-" in part["id"] and not part["id"].endswith("-lid"))
    if containers:
        items.append({"name": "Contenedores individuales", "quantity": containers, "detail": "Extraíbles"})
        lids = sum(1 for part in parts if part["id"].endswith("-lid"))
        if lids:
            items.append({"name": "Tapas de contenedor", "quantity": lids, "detail": "Extraíbles"})
    splices = sum(1 for part in parts if "splice" in part["id"])
    if splices:
        items.append({"name": "Tornillos M3 × 10 + tuercas", "quantity": splices * 4, "detail": "Uniones de base/bandeja"})
    if hooks:
        items.append({"name": "Ganchos", "quantity": hooks, "detail": settings["hookType"]})
    if settings["panelJoiners"] and panels > 1:
        items.append({"name": "Uniones de panel", "quantity": max(2, panels - 1), "detail": "Paneles partidos"})
    if settings["feet"]:
        items.append({"name": "Pies", "quantity": 4, "detail": "Base"})
    if settings["transportLid"]:
        cases = sum(1 for part in parts if part["id"].startswith("transport-case"))
        items.append({"name": "Caja de transporte", "quantity": max(1, cases), "detail": "Con asa" if settings["transportHandle"] else "Sin asa"})
    return items


def _matrix_bounds(part: dict[str, Any], key: str) -> tuple[list[float], list[float]]:
    values = np.asarray(part[key], dtype=float).reshape(4, 4)
    low = np.asarray(part["bounds"]["min"], dtype=float)
    high = np.asarray(part["bounds"]["max"], dtype=float)
    corners = np.array(
        [
            [x, y, z, 1.0]
            for x in (low[0], high[0])
            for y in (low[1], high[1])
            for z in (low[2], high[2])
        ]
    )
    transformed = (corners @ values.T)[:, :3]
    return transformed.min(axis=0).tolist(), transformed.max(axis=0).tolist()


def _checks(settings: dict[str, Any], parts: list[dict[str, Any]]) -> list[dict[str, str]]:
    checks: list[dict[str, str]] = []

    def add(level: str, title: str, detail: str, code: str) -> None:
        checks.append({"level": level, "title": title, "detail": detail, "code": code})

    if not parts:
        add("error", "Sin piezas", "Activa la estructura o algún accesorio para generar el display.", "empty")
        return checks
    sized = [
        (part["bounds"]["max"][0] - part["bounds"]["min"][0], part["bounds"]["max"][1] - part["bounds"]["min"][1], part["bounds"]["max"][2] - part["bounds"]["min"][2], part["name"], part["id"])
        for part in parts
    ]
    max_part = max(sized, key=lambda item: max(item[0], item[1], item[2])) if sized else (0.0, 0.0, 0.0, "", "")
    max_x, max_y, max_z, max_name, _ = max_part
    if settings["mode"] == "3d":
        too_big = []
        for width, depth, height, name, _ in sized:
            if width > settings["bedWidth"] + 0.5 or depth > settings["bedDepth"] + 0.5 or height > settings["bedHeight"] + 0.5:
                too_big.append(name)
        if too_big:
            add("warn", "Pieza mayor que la cama", f"{len(too_big)} pieza(s) no caben: {', '.join(too_big[:4])}. Divide paneles o reduce medidas.", "bed-fit")
        else:
            add("ok", "Cabe en la cama", f"Pieza mayor: {max_name} ({max_x:.0f} × {max_y:.0f} × {max_z:.0f} mm).", "bed-fit")
        if settings["shelfThickness"] < settings["nozzle"] * 2.4:
            add("warn", "Paredes demasiado finas", "La bandeja necesita al menos 2,4 líneas de pared para ser rígida. Sube el grosor o usa boquilla menor.", "thin-wall")
        else:
            add("ok", "Paredes imprimibles", f"Bandeja de {settings['shelfThickness']:.1f} mm con boquilla {settings['nozzle']:.1f} mm.", "thin-wall")
        if settings["dividerThickness"] < settings["nozzle"] * 1.8:
            add("warn", "Divisores finos", "Los divisores de menos de 1,8 mm pueden romperse al desmoldar. Sube el grosor.", "divider-thin")
        panel_w = (settings["width"] - 2 * settings["sideThickness"] - 4) / max(1, settings["panelSplit"])
        panel_h = settings["backHeight"] / max(1, settings["panelRows"])
        if panel_w > settings["bedWidth"] or panel_h > settings["bedDepth"]:
            add("warn", "Panel sin dividir", f"El panel queda en {panel_w:.0f} × {panel_h:.0f} mm. Sube columnas o filas del panel.", "panel-split")
        else:
            add("ok", "Panel imprimible", f"Panel en {panel_w:.0f} × {panel_h:.0f} mm por pieza.", "panel-split")
        height = settings["baseHeight"] + settings["backHeight"]
        footprint = settings["width"] * settings["depth"]
        if height > 1.8 * min(settings["width"], settings["depth"]):
            add("warn", "Riesgo de vuelco", "El display es alto para su huella. Baja la altura, añade lastre o usa correas.", "stability")
        else:
            add("ok", "Estabilidad razonable", "Huella y altura dentro de la proporción recomendada.", "stability")
        if settings["addFront"] and settings["levels"] > 1:
            expected_links = (settings["levels"] - 1) * 4
            links = sum(1 for part in parts if part["id"].startswith("link-"))
            if links < expected_links:
                add("warn", "Faltan enlaces", f"Se esperaban {expected_links} enlaces y hay {links}.", "links")
            else:
                add("ok", "Enlaces completos", f"{links} enlaces y {sum(1 for part in parts if part['id'].startswith('pin-'))} pasadores.", "links")
        if settings["pinDiameter"] < 3.5:
            add("warn", "Pasador fino", "Un pasador de menos de 3,5 mm puede romperse al plegar. Sube el diámetro.", "pin")
        level_configs = settings.get("levelConfigs", [])
        tight = [level["gap"] for level in level_configs[1:] if level.get("enabled", True) and level.get("gap", settings["levelSpacing"]) < settings["lipHeight"] + 6.0]
        if tight:
            add("warn", "Niveles demasiado juntos", f"Hay {len(tight)} nivel(es) con menos de {settings['lipHeight'] + 6:.0f} mm. Las bandejas pueden chocar al plegar.", "level-gap")
        if any(level.get("style") == "containers" for level in level_configs):
            add("ok", "Contenedores individuales", "Las bandejas usan cajas extraíbles en lugar de separadores.", "containers")
        tray_splits = max(1, int(np.ceil((settings["width"] - 2 * settings["sideThickness"] - 2 * settings["clearance"]) / max(80.0, settings["bedWidth"] - 8.0)))) if settings.get("autoSplit", True) else 1
        base_splits = max(1, int(np.ceil(settings["width"] / max(80.0, settings["bedWidth"] - 8.0)))) if settings.get("autoSplit", True) else 1
        case_splits = max(1, int(np.ceil(settings["width"] / max(80.0, settings["bedWidth"] - 8.0)))) if settings.get("autoSplit", True) else 1
        if settings.get("autoSplit", True) and max(tray_splits, base_splits, case_splits) > 1:
            add("info", "Piezas divididas", f"Bandejas ×{tray_splits}, base ×{base_splits}, caja ×{case_splits}. Usa las placas de unión y tornillos M3.", "auto-split")
        if settings["hooks"] > 0:
            capacity = max(1, int((settings["backHeight"] - 40) / 42.0) * max(1, int((settings["width"] - 40) / 40.0)))
            if settings["hooks"] > capacity:
                add("warn", "Demasiados ganchos", f"El panel admite aproximadamente {capacity} ganchos.", "hook-capacity")
            else:
                add("ok", "Ganchos colocados", f"{settings['hooks']} ganchos sobre el panel.", "hook-capacity")
        if not settings["addBase"] or not settings["addFront"] or not settings["addRear"]:
            add("warn", "Estructura incompleta", "Has desactivado base, enlaces o panel. El display puede no sostenerse solo.", "structure-off")
    else:
        add("ok", "Modo láser", "El modo láser genera paneles 2D y deja los enlaces/pasadores como kit impreso opcional.", "laser")
        if settings["livingHinge"] and settings["laserThickness"] > 4.0:
            add("warn", "Bisagra viva gruesa", "La bisagra viva es fiable en chapa de 3–4 mm; para 6 mm usa el kit de bisagras impresas.", "hinge-thickness")
        if settings["laserThickness"] <= 4.0:
            add("ok", "Alas plegables", "Los laterales llevan alas con línea de plegado para sostener las bandejas.", "laser-arms")
        else:
            add("warn", "Alas plegables gruesas", "En chapa de más de 4 mm, las alas pueden agrietarse. Usa 3–4 mm o un kit de escuadras impresas.", "laser-arms")
        if settings["kerf"] <= 0:
            add("warn", "Kerf sin definir", "Mide el kerf real y ajusta el encaje antes de cortar.", "kerf")
        else:
            add("ok", "Kerf configurado", f"Compensación de {settings['kerf']:.2f} mm; corta una galga de prueba.", "kerf")
        add("info", "Espesor real", "Mide el material con calibre; el espesor nominal suele variar.", "thickness")
    return checks


def _wire_parts(parts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    material = "pla"
    density = 1.24
    for part in parts:
        mesh: Mesh = part.pop("mesh")
        if mesh.empty:
            continue
        bounds = part["bounds"]
        out.append(
            {
                **part,
                "stl_b64": base64.b64encode(mesh.stl_bytes()).decode("ascii"),
                "dimensions": {
                    "width": bounds["max"][0] - bounds["min"][0],
                    "depth": bounds["max"][1] - bounds["min"][1],
                    "height": bounds["max"][2] - bounds["min"][2],
                },
            }
        )
    return out


def _assemble(settings: dict[str, Any]) -> list[dict[str, Any]]:
    from .foldable import build_parts

    return build_parts(settings, _part)


def _laser_preview_settings(settings: dict[str, Any]) -> dict[str, Any]:
    thickness = max(1.5, float(settings["laserThickness"]))
    preview = {
        **settings,
        "sideThickness": thickness,
        "postDepth": max(12.0, thickness * 4.0),
        "panelThickness": thickness,
        "shelfThickness": thickness,
        "baseHeight": max(3.0, thickness),
        "lipThickness": min(3.0, thickness),
        "addLocks": False,
        "foldAngle": min(80.0, settings["foldAngle"]),
    }
    if not settings["includePrintedKit"]:
        preview.update(
            {
                "hooks": 0,
                "bins": 0,
                "priceTags": 0,
                "letters": 0,
                "sign": False,
                "awning": False,
                "cornerBrackets": False,
                "panelJoiners": False,
                "shelfBrackets": False,
                "railEnds": False,
                "wallMounts": False,
            }
        )
    return preview


def build(payload: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    settings = normalize_settings(payload.get("settings") if isinstance(payload, dict) else payload)
    parts = _assemble(settings if settings["mode"] == "3d" else _laser_preview_settings(settings))
    checks = _checks(settings, parts)
    wire = _wire_parts(parts)
    total_volume = sum(part["volume"] for part in wire)
    material = MATERIAL_PROFILES[settings["material"]]
    shell_factor = 0.58 + settings["infill"] / 100.0 * 0.42
    grams = total_volume / 1000.0 * material["density"] * shell_factor
    height = max((part["bounds"]["max"][2] for part in wire), default=0.0)
    depth_open = settings["depth"]
    folded_low = [1e9, 1e9, 1e9]
    folded_high = [-1e9, -1e9, -1e9]
    for part in wire:
        if part.get("fold_hide"):
            continue
        low, high = _matrix_bounds(part, "fold_matrix")
        for index in range(3):
            folded_low[index] = min(folded_low[index], low[index])
            folded_high[index] = max(folded_high[index], high[index])
    folded_depth = folded_high[1] - folded_low[1]
    folded_height = folded_high[2] - folded_low[2]
    laser = None
    if settings["mode"] == "laser":
        from .laser import build_laser

        laser = build_laser(settings, wire)
        grams = 0.0
    return {
        "ok": True,
        "mode": settings["mode"],
        "version": __version__,
        "settings": settings,
        "parts": wire,
        "checks": checks,
        "bom": _bom(settings, wire),
        "build_ms": (time.perf_counter() - started) * 1000.0,
        "material_grams": grams,
        "dimensions": {
            "width": settings["width"],
            "depth": depth_open,
            "height": max(height, settings["baseHeight"] + settings["backHeight"]),
            "foldedDepth": folded_depth,
            "foldedHeight": folded_height,
            "levels": settings["levels"],
        },
        "laser": laser,
    }


def _mesh_from_stl_b64(value: str) -> Mesh:
    import struct

    data = base64.b64decode(value)
    count = struct.unpack("<I", data[80:84])[0]
    record = np.frombuffer(
        data[84:],
        dtype=np.dtype(
            [
                ("n", "<f4", (3,)),
                ("a", "<f4", (3,)),
                ("b", "<f4", (3,)),
                ("c", "<f4", (3,)),
                ("x", "<u2"),
            ]
        ),
        count=count,
    )
    vertices = np.stack([record["a"], record["b"], record["c"]], axis=1).reshape(-1, 3)
    faces = np.arange(len(vertices), dtype=np.int64).reshape(-1, 3)
    return Mesh(vertices, faces).merged()


def export_3mf(payload: dict[str, Any]) -> dict[str, Any]:
    result = build(payload)
    parts = result["parts"]
    meshes: list[tuple[str, Mesh, str]] = []
    for part in parts:
        meshes.append((part["name"], _mesh_from_stl_b64(part["stl_b64"]), part["color"]))
    data = three_mf_bytes(meshes, "Displaynian")
    return {"ok": True, "data_b64": base64.b64encode(data).decode("ascii"), "name": "displaynian.3mf"}


def _label_svg(settings: dict[str, Any]) -> str:
    from xml.sax.saxutils import escape

    text = escape(str(settings.get("signText") or "DISPLAYNIAN")[:24])
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="20mm" viewBox="0 0 80 20">'
        '<rect width="80" height="20" fill="#ffffff"/>'
        f'<text x="40" y="12.5" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#111111">{text}</text>'
        "</svg>"
    )


def export_stl_zip(payload: dict[str, Any]) -> dict[str, Any]:
    result = build(payload)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for part in result["parts"]:
            archive.writestr(f"{part['id']}.stl", base64.b64decode(part["stl_b64"]))
        lines = ["id,name,quantity,volume_mm3,triangles"]
        for part in result["parts"]:
            lines.append(f"{part['id']},{part['name'].replace(',', ' ')},1,{part['volume']:.1f},{part['triangles']}")
        archive.writestr("piezas.csv", "\n".join(lines) + "\n")
        archive.writestr("cartel.svg", _label_svg(result["settings"]))
    return {"ok": True, "data_b64": base64.b64encode(buffer.getvalue()).decode("ascii"), "name": "displaynian-stl.zip"}


def export_obj(payload: dict[str, Any]) -> dict[str, Any]:
    result = build(payload)
    meshes: list[tuple[str, Mesh]] = []
    for part in result["parts"]:
        meshes.append((part["name"], _mesh_from_stl_b64(part["stl_b64"])))
    obj = mesh_to_obj(meshes)
    return {"ok": True, "data_b64": base64.b64encode(obj).decode("ascii"), "name": "displaynian.obj"}
