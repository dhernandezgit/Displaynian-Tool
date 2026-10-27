from __future__ import annotations

import math
from typing import Any, Callable

import numpy as np
from shapely import affinity
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

from .mesh import (
    Mesh,
    box,
    cylinder,
    extrude_polygon,
    extrude_x,
    extrude_y,
    matrix_rotate_x,
    matrix_rotate_y,
    matrix_scale,
    matrix_translate,
    rounded_rect,
)
from .foldable import (
    _container_lid_mesh,
    _container_mesh,
    _difference,
    _hook_mesh,
    _insert_mesh,
    _panel_mesh,
    _sign_mesh,
    _t,
    _vertical,
)


def _levels(settings: dict[str, Any]) -> list[dict[str, Any]]:
    levels = [dict(level) for level in settings["levelConfigs"][: settings["levels"]]]
    while len(levels) < settings["levels"]:
        levels.append(dict(settings["levelConfigs"][-1]))
    return levels


def _level_heights(settings: dict[str, Any], levels: list[dict[str, Any]]) -> list[float]:
    base = settings["baseHeight"]
    heights: list[float] = []
    z = base
    for index, level in enumerate(levels):
        z += max(12.0, float(level.get("gap", settings["levelSpacing"])))
        heights.append(z)
    return heights


def _side_profile(settings: dict[str, Any], levels: list[dict[str, Any]], heights: list[float], board_h: float) -> tuple[Polygon, list[float]]:
    depth = settings["depth"]
    side = settings["sideThickness"]
    tray_t = settings["shelfThickness"]
    clearance = settings["clearance"]
    tray_d = min(settings["shelfDepth"], depth - 25.0)
    tilt = math.radians(settings.get("trayTilt", 10.0))
    top = heights[-1] + tray_d * math.sin(tilt) + settings["lipHeight"] + 10.0
    mast = 26.0
    profile = rounded_rect(depth, top, 4.0)
    if settings["backPanel"] != "none":
        profile = profile.union(_t(rounded_rect(mast, board_h, 3.0), depth - mast, 0.0))
    slots = []
    for z in heights:
        slot = rounded_rect(tray_d + 22.0, tray_t + clearance, 0.6)
        slot = affinity.translate(slot, -6.0, z - (tray_t + clearance) / 2.0)
        slot = affinity.rotate(slot, math.degrees(tilt), origin=(0.0, z))
        slots.append(slot)
    profile = _difference(profile, slots)
    if settings["backPanel"] != "none":
        panel_slot = rounded_rect(settings["panelThickness"] + clearance, board_h + 2.0, 0.4)
        panel_slot = affinity.translate(panel_slot, depth - settings["panelThickness"] - clearance, -1.0)
        profile = _difference(profile, [panel_slot])
    tabs = []
    for y in (22.0, depth / 2.0 - 12.0, depth - 46.0):
        tabs.append(_t(rounded_rect(24.0, 12.0, 1.0), y, -12.0))
    profile = profile.union(unary_union(tabs))
    return profile, heights


def _base_mesh(settings: dict[str, Any]) -> Mesh:
    width = settings["width"]
    depth = settings["depth"]
    side = settings["sideThickness"]
    clearance = settings["clearance"]
    base = rounded_rect(width, depth, settings["baseRadius"])
    slots = []
    for x in (0.0, width - side - clearance):
        for y in (22.0, depth / 2.0 - 12.0, depth - 46.0):
            slots.append(_t(rounded_rect(side + clearance + 2.0, 24.0, 1.0), x - 1.0, y))
    return extrude_polygon(_difference(base, slots), 0.0, settings["baseHeight"])


def _tray_mesh(settings: dict[str, Any], width: float, depth: float) -> Mesh:
    plate = rounded_rect(width, depth, 3.0)
    return extrude_polygon(plate, 0.0, settings["shelfThickness"])


def _lip_mesh(settings: dict[str, Any], width: float) -> Mesh:
    lip_h = settings["lipHeight"]
    lip_t = settings["lipThickness"]
    tab = 8.0
    profile = rounded_rect(width, lip_h, 2.0)
    profile = affinity.translate(profile, 0.0, tab)
    tabs = []
    for x in (width * 0.22, width * 0.78):
        tabs.append(_t(rounded_rect(10.0, tab + 1.0, 1.0), x - 5.0, 0.0))
    profile = profile.union(unary_union(tabs))
    return extrude_y(profile, lip_t, lip_t)


def _tray_holes(settings: dict[str, Any], width: float) -> list[Polygon]:
    tab = 8.0
    return [_t(rounded_rect(10.0 + settings["clearance"], tab + settings["clearance"], 0.8), x - 5.0, 0.0) for x in (width * 0.22, width * 0.78)]


def _case_mesh(settings: dict[str, Any], height: float) -> Mesh:
    width = settings["width"]
    depth = settings["depth"]
    wall = settings["shelfThickness"]
    radius = settings["baseRadius"] + 2.0
    outer = rounded_rect(width, depth, radius)
    inner = _t(rounded_rect(width - 2 * wall, depth - 2 * wall, max(1.0, radius - wall)), wall, wall)
    mesh = extrude_polygon(outer.difference(inner), 0.0, max(wall, height - wall))
    mesh = mesh.append(extrude_polygon(outer, max(wall, height - wall), wall))
    return mesh


def _flat_transform(part: str, settings: dict[str, Any], index: int, heights: list[float]) -> np.ndarray:
    width = settings["width"]
    depth = settings["depth"]
    base = settings["baseHeight"]
    side = settings["sideThickness"]
    large = index * 4.0
    if part == "side-left":
        m = matrix_rotate_y(90.0, (0.0, 0.0, 0.0))
        return matrix_translate([0.0, 0.0, base + large]) @ m
    if part == "side-right":
        m = matrix_rotate_y(-90.0, (width, 0.0, 0.0))
        return matrix_translate([0.0, 0.0, base + large]) @ m
    if part == "board":
        m = matrix_rotate_x(-90.0, (0.0, depth, 0.0))
        return matrix_translate([0.0, 0.0, base + 2 * side + large]) @ m
    if part == "tray":
        return matrix_translate([0.0, 0.0, base + 2 * side + large])
    return matrix_translate([0.0, 0.0, base + 2 * side + large])


def build_parts(settings: dict[str, Any], add_part: Callable[..., None]) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    width = settings["width"]
    depth = settings["depth"]
    side = settings["sideThickness"]
    tray_d = min(settings["shelfDepth"], depth - 25.0)
    tray_t = settings["shelfThickness"]
    tilt = settings.get("trayTilt", 10.0)
    tilt_matrix = matrix_rotate_x(tilt, (0.0, 0.0, 0.0))
    levels = _levels(settings)
    heights = _level_heights(settings, levels)
    board_h = (heights[-1] + tray_d * math.sin(math.radians(tilt)) + settings["lipHeight"] + 80.0) if settings["backPanel"] != "none" else heights[-1] + settings["lipHeight"] + 30.0

    def emit(part_id: str, name: str, group: str, mesh: Mesh, color: str, category: str, open_matrix: np.ndarray | None = None, fold_matrix: np.ndarray | None = None, transport_only: bool = False, explode: tuple[float, float, float] | None = None) -> None:
        add_part(parts, part_id, name, group, mesh, color, settings, open_matrix, fold_matrix, transport_only, category, explode)

    base = _base_mesh(settings)
    emit("base", "Base", "base", base, "base", "structure", fold_matrix=matrix_translate([0, 0, 0]))
    if settings.get("feet", True):
        for index, (x, y) in enumerate([(14.0, 14.0), (width - 14.0, 14.0), (14.0, depth - 14.0), (width - 14.0, depth - 14.0)], start=1):
            emit(f"foot-{index}", f"Pata {index}", "base", cylinder(x, y, -2.0, 9.0, 2.0, 28), "base", "hardware")

    profile, _ = _side_profile(settings, levels, heights, board_h)
    left = extrude_x(profile, 0.0, side)
    right = extrude_x(profile, width - side, side)
    emit("side-left", "Lateral izquierdo", "structure", left, "frame", "structure", fold_matrix=_flat_transform("side-left", settings, 0, heights), explode=(-40, 0, 0))
    emit("side-right", "Lateral derecho", "structure", right, "frame", "structure", fold_matrix=_flat_transform("side-right", settings, 1, heights), explode=(40, 0, 0))

    for index, (level, z) in enumerate(zip(levels, heights)):
        if not level["enabled"]:
            continue
        open_matrix = matrix_translate([0.0, 0.0, z]) @ tilt_matrix
        tray = _tray_mesh(settings, width, tray_d)
        tray = _difference(tray, _tray_holes(settings, width)) if False else tray
        emit(
            f"tray-{index + 1}",
            level["name"],
            f"tray-{index + 1}",
            tray,
            "shelf",
            "shelf",
            open_matrix=open_matrix,
            fold_matrix=_flat_transform("tray", settings, index, heights),
            explode=(0, 0, 18 + index * 12),
        )
        lip_w = width - 2 * side - 2 * settings["clearance"]
        lip = _lip_mesh(settings, lip_w)
        lip = lip.translated((side + settings["clearance"], 0.0, tray_t))
        emit(
            f"tray-{index + 1}-lip",
            f"Labio {index + 1}",
            f"tray-{index + 1}",
            lip,
            "shelf",
            "shelf",
            open_matrix=open_matrix,
            fold_matrix=_flat_transform("tray", settings, index, heights),
            explode=(0, 0, 30 + index * 12),
        )
        if level.get("style") == "dividers":
            for extra_name, extra_mesh in _insert_mesh(settings, level, width - 2 * side, tray_d, settings["lipHeight"]):
                emit(
                    f"tray-{index + 1}-{extra_name}",
                    f"{level['name']} · {extra_name}",
                    f"tray-{index + 1}",
                    extra_mesh.translated((side, 0.0, tray_t)),
                    "accessory",
                    "insert",
                    open_matrix=open_matrix,
                    fold_matrix=_flat_transform("tray", settings, index, heights),
                )
        if level.get("style") == "containers":
            count = max(1, int(level.get("containers", 2)))
            inner = width - 2 * side - 8.0
            cgap = 3.0
            cw = (inner - (count - 1) * cgap) / count
            cd = tray_d * 0.78
            ch = max(20.0, settings["lipHeight"] * 1.05)
            cwall = max(1.8, settings["shelfThickness"] * 0.8)
            for container_index in range(count):
                cx = side + 4.0 + container_index * (cw + cgap)
                cy = (tray_d - cd) / 2.0
                container = _container_mesh(settings, cw, cd, ch, cwall).translated((cx, cy, tray_t))
                emit(
                    f"tray-{index + 1}-container-{container_index + 1}",
                    f"{level['name']} · contenedor {container_index + 1}",
                    f"tray-{index + 1}",
                    container,
                    "bin",
                    "container",
                    open_matrix=open_matrix,
                    fold_matrix=_flat_transform("tray", settings, index, heights),
                )
                if settings.get("containerLids", True):
                    lid = _container_lid_mesh(cw, cd, cwall).translated((cx - 0.75, cy - 0.75, tray_t + ch))
                    emit(
                        f"tray-{index + 1}-container-{container_index + 1}-lid",
                        f"{level['name']} · tapa {container_index + 1}",
                        f"tray-{index + 1}",
                        lid,
                        "bin",
                        "container",
                        open_matrix=open_matrix,
                        fold_matrix=_flat_transform("tray", settings, index, heights),
                    )

    if settings["backPanel"] != "none":
        panel_w = width
        cols = max(1, int(settings["panelSplit"]))
        rows = max(1, int(settings["panelRows"]))
        pw = (panel_w - 3.0 * (cols - 1)) / cols
        ph = (board_h - 3.0 * (rows - 1)) / rows
        for row in range(rows):
            for col in range(cols):
                piece = _panel_mesh(settings, pw, ph)
                x = col * (pw + 3.0)
                z = settings["baseHeight"] + row * (ph + 3.0)
                piece = _vertical(piece, depth, z).translated((x, 0.0, 0.0))
                emit(
                    f"board-{row + 1}-{col + 1}",
                    f"Panel {row + 1}.{col + 1}",
                    "panel",
                    piece,
                    "panel",
                    "panel",
                    fold_matrix=_flat_transform("board", settings, row * cols + col, heights),
                    explode=(0, 0, 30 + row * 10),
                )
        if settings.get("sign"):
            sign = _sign_mesh(settings)
            sign = _vertical(sign, depth - settings["panelThickness"] - 2.0, board_h - 48.0).translated((width / 2.0 - 52.0, 0.0, 0.0))
            emit("sign", "Cartel", "panel", sign, "accessory", "accessory", fold_matrix=_flat_transform("board", settings, 0, heights))
        if settings["hooks"] > 0:
            rows_h = max(1, int(settings["hookRows"]))
            cols_h = max(1, math.ceil(settings["hooks"] / rows_h))
            start_z = board_h - 42.0
            for index in range(settings["hooks"]):
                row = index // cols_h
                col = index % cols_h
                x = (col + 0.5) * width / cols_h
                z = start_z - row * 46.0
                hook = _hook_mesh(settings).translated((x, depth - settings["panelThickness"] - 2.0, z))
                emit(f"hook-{index + 1}", f"Gancho {index + 1}", "hooks", hook, "hook", "hook", fold_matrix=_flat_transform("board", settings, 0, heights))

    if settings.get("transport", True) and settings.get("transportLid", True):
        stack = settings["baseHeight"] + 2 * side + tray_t * max(1, settings["levels"]) + settings["panelThickness"] * max(1, settings["panelRows"]) + 30.0
        case = _case_mesh(settings, max(60.0, stack + 12.0)).translated((0.0, 0.0, settings["baseHeight"]))
        emit("transport-case", "Caja de transporte", "transport", case, "transport", "transport", transport_only=True)
        if settings.get("transportHandle", True):
            handle = box(-42.0, -8.0, 0.0, 84.0, 16.0, 8.0)
            for x in (-36.0, 26.0):
                handle = handle.append(box(x, -8.0, -14.0, 10.0, 16.0, 14.0))
            handle = handle.translated((width / 2.0, depth / 2.0, settings["baseHeight"] + max(60.0, stack + 12.0)))
            emit("transport-handle", "Asa de transporte", "transport", handle, "transport", "transport", transport_only=True)
    return parts
