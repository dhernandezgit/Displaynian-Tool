from __future__ import annotations

import math
from typing import Any, Callable

import numpy as np
from shapely import affinity
from shapely.geometry import LineString, Point
from shapely.ops import unary_union

from .mesh import (
    Mesh,
    box,
    cylinder,
    extrude_polygon,
    matrix_rotate_x,
    matrix_scale,
    matrix_translate,
    rounded_rect,
)
from .foldable import (
    _container_lid_mesh,
    _container_mesh,
    _handle_bridge,
    _hook_mesh,
    _insert_mesh,
    _panel_mesh,
    _pin_mesh,
    _sign_mesh,
    _transport_case_mesh,
    _tray_mesh,
)


LINK_ORIENTATION = np.array(
    [
        [0.0, 0.0, 1.0, 0.0],
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ],
    dtype=float,
)


def _vertical_matrix(y_front: float, z0: float) -> np.ndarray:
    return np.array(
        [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, -1.0, y_front],
            [0.0, 1.0, 0.0, z0],
            [0.0, 0.0, 0.0, 1.0],
        ],
        dtype=float,
    )


def _active_levels(settings: dict[str, Any]) -> list[tuple[int, dict[str, Any]]]:
    levels = [dict(level) for level in settings["levelConfigs"][: settings["levels"]]]
    while len(levels) < settings["levels"]:
        levels.append(dict(settings["levelConfigs"][-1]))
    return [(index, level) for index, level in enumerate(levels) if level.get("enabled", True)]


def _y_layout(settings: dict[str, Any], tray_depth: float) -> tuple[tuple[float, float, float, float], float]:
    margin = min(5.0, tray_depth * 0.05)
    gap = 3.0 if tray_depth >= 80.0 else 2.0
    band = max(8.0, (tray_depth - 2.0 * margin - 3.0 * gap) / 4.0)
    centers = tuple(margin + band / 2.0 + index * (band + gap) for index in range(4))
    width = min(settings["postDepth"], max(9.0, band - 2.0))
    return centers, width


def _x_layout(settings: dict[str, Any]) -> tuple[tuple[float, float], float, float]:
    link_t = settings["sideThickness"]
    head = settings["pinDiameter"] + 4.0
    pitch = link_t + head + 2.0 * settings["clearance"]
    tray_x = pitch + link_t + settings["clearance"]
    return (0.0, pitch), tray_x, settings["width"] - 2.0 * tray_x


def _link_mesh(settings: dict[str, Any], slot_low: float, slot_high: float, width: float) -> Mesh:
    pin_r = settings["pinDiameter"] / 2.0 + settings["clearance"] * 0.5
    slot_r = settings["pinDiameter"] / 2.0 + settings["clearance"]
    bottom = 5.0
    top = 4.0
    length = max(20.0, slot_high + top + bottom)
    profile = rounded_rect(width, length, min(7.0, width / 2.0 - 0.2))
    profile = affinity.translate(profile, xoff=-width / 2.0, yoff=-bottom)
    pivot = Point(0.0, 0.0).buffer(pin_r, resolution=24)
    slot = LineString([(0.0, max(0.0, slot_low)), (0.0, max(0.0, slot_high))]).buffer(
        slot_r,
        cap_style=1,
        quad_segs=8,
    )
    profile = profile.difference(unary_union([pivot, slot]))
    return extrude_polygon(profile, 0.0, settings["sideThickness"])


def _pin_local(
    settings: dict[str, Any],
    tray_w: float,
    tray_x: float,
    lane_start: float,
    lane_y: float,
    pin_z: float,
    side: str,
) -> Mesh:
    length = tray_x - lane_start + settings["shelfThickness"] + 1.8
    pin = _pin_mesh(settings, length).translated((-tray_x + lane_start, lane_y, pin_z))
    if side == "der":
        pin = pin.transformed(matrix_scale([-1.0, 1.0, 1.0], (tray_w / 2.0, 0.0, 0.0)))
    return pin


def build_parts(settings: dict[str, Any], add_part: Callable[..., None]) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []

    def emit(
        part_id: str,
        name: str,
        group: str,
        mesh: Mesh,
        color: str,
        category: str,
        open_matrix: np.ndarray | None = None,
        fold_matrix: np.ndarray | None = None,
        transport_only: bool = False,
        explode: tuple[float, float, float] | None = None,
    ) -> None:
        add_part(
            parts,
            part_id,
            name,
            group,
            mesh,
            color,
            settings,
            open_matrix,
            fold_matrix,
            transport_only,
            category,
            explode,
        )

    width = settings["width"]
    depth = settings["depth"]
    base_h = settings["baseHeight"]
    link_t = settings["sideThickness"]
    clearance = settings["clearance"]
    wall_t = settings["shelfThickness"]
    lip_h = settings["lipHeight"]
    step = settings["cantileverStep"]
    tray_y = 6.0
    tray_depth = max(40.0, min(settings["shelfDepth"], depth - 18.0))
    lane_starts, tray_x, tray_w = _x_layout(settings)
    z_low = max(5.0, lip_h * 0.26)
    z_high = min(lip_h - 4.4, lip_h * 0.74)
    pin_lanes, link_width = _y_layout(settings, tray_depth)
    active = _active_levels(settings)
    closed_gap = max(settings["cantileverClosedGap"], lip_h + wall_t + 1.5)
    dz_pin = z_high - z_low
    gaps = [max(24.0, level.get("gap", settings["levelSpacing"])) for _, level in active[1:]]
    if len(active) >= 4 and gaps:
        for _ in range(2):
            longest = max(max(math.hypot(step, gap + dz_pin) for gap in gaps), closed_gap + dz_pin)
            closed_gap = max(closed_gap, (longest + 11.0) / 2.0)

    anchor_centers = (tray_w * 0.28, tray_w * 0.72)
    anchor_y = tray_depth * 0.38
    anchor_holes = []
    anchor_tabs = []
    if active and active[0][0] == 0:
        for center_x in anchor_centers:
            anchor_holes.append(
                affinity.translate(rounded_rect(10.8, 6.8, 1.2), xoff=center_x - 5.4, yoff=anchor_y - 3.4)
            )
            anchor_tabs.append((tray_x + center_x - 5.0, tray_y + anchor_y - 3.0))
    if settings["addBase"]:
        base = extrude_polygon(rounded_rect(width, depth, settings["baseRadius"]), 0.0, base_h)
        for tab_x, tab_y in anchor_tabs:
            base = base.append(box(tab_x, tab_y, base_h, 10.0, 6.0, 1.8))
        emit("base", "Base", "base", base, "base", "structure")
        if settings["feet"]:
            for index, (x, y) in enumerate(
                [
                    (16.0, 16.0),
                    (width - 16.0, 16.0),
                    (16.0, depth - 16.0),
                    (width - 16.0, depth - 16.0),
                ],
                start=1,
            ):
                emit(f"foot-{index}", f"Pata {index}", "base", cylinder(x, y, -2.5, 9.0, 2.5, 28), "base", "hardware")

    if not active:
        return parts

    open_z: list[float] = []
    fold_z: list[float] = []
    open_y: list[float] = []
    cumulative = base_h
    for index, (_, level) in enumerate(active):
        if index > 0:
            cumulative += max(24.0, level.get("gap", settings["levelSpacing"]))
        open_z.append(cumulative)
        fold_z.append(base_h + index * closed_gap)
        open_y.append(tray_y - index * step)

    tray_open: list[np.ndarray] = []
    tray_fold: list[np.ndarray] = []
    for index, (level_index, level) in enumerate(active):
        open_matrix = matrix_translate([tray_x, open_y[index], open_z[index]])
        fold_matrix = matrix_translate([tray_x, tray_y, fold_z[index]])
        tray_open.append(open_matrix)
        tray_fold.append(fold_matrix)
        group = f"tray-{level_index + 1}"
        style = level.get("style", "dividers")
        tray = _tray_mesh(
            settings,
            tray_depth,
            tray_w,
            bottom_holes=anchor_holes if index == 0 else None,
            dividers=style == "dividers",
            pin_ys=pin_lanes,
            pin_zs=(z_low, z_high),
        )
        emit(
            f"tray-{level_index + 1}",
            level["name"],
            group,
            tray,
            level.get("color", "shelf"),
            "shelf",
            open_matrix,
            fold_matrix,
            explode=(0.0, 0.0, 14.0 + index * 10.0),
        )
        if style == "containers":
            count = max(1, int(level.get("containers", 2)))
            inner = tray_w - 2.0 * wall_t - 6.0
            cgap = 3.0
            cw = (inner - (count - 1) * cgap) / count
            cd = tray_depth * 0.78
            ch = max(10.0, min(lip_h * 0.68, lip_h - 6.0))
            cwall = max(1.8, wall_t * 0.8)
            if cw > 12.0:
                for container_index in range(count):
                    cx = wall_t + 3.0 + container_index * (cw + cgap)
                    cy = (tray_depth - cd) / 2.0
                    cz = wall_t
                    container = _container_mesh(settings, cw, cd, ch, cwall).translated((cx, cy, cz))
                    emit(
                        f"tray-{level_index + 1}-container-{container_index + 1}",
                        f"{level['name']} · contenedor {container_index + 1}",
                        group,
                        container,
                        "bin",
                        "container",
                        open_matrix,
                        fold_matrix,
                    )
                    if settings.get("containerLids", True):
                        lid = _container_lid_mesh(cw, cd, cwall).translated((cx - 0.75, cy - 0.75, cz + ch))
                        emit(
                            f"tray-{level_index + 1}-container-{container_index + 1}-lid",
                            f"{level['name']} · tapa {container_index + 1}",
                            group,
                            lid,
                            "bin",
                            "container",
                            open_matrix,
                            fold_matrix,
                        )
        elif style == "dividers":
            for extra_name, extra_mesh in _insert_mesh(settings, level, tray_w - 4.0, tray_depth - 4.0, lip_h):
                emit(
                    f"tray-{level_index + 1}-{extra_name}",
                    f"{level['name']} · {extra_name}",
                    group,
                    extra_mesh.translated((2.0, 2.0, wall_t)),
                    "accessory",
                    "insert",
                    open_matrix,
                    fold_matrix,
                )

    gap_count = max(0, len(active) - 1)
    link_tops: list[float] = []
    for gap_index in range(gap_count):
        gap = gaps[gap_index]
        rise = gap + dz_pin
        d_open = math.hypot(step, rise)
        d_closed = closed_gap + dz_pin
        slot_low = min(d_open, d_closed)
        slot_high = max(d_open, d_closed)
        link_tops.append(slot_high + 4.0)
        theta = math.degrees(math.atan2(step, rise))
        lane_start = lane_starts[gap_index % 2]
        pair = (pin_lanes[0], pin_lanes[3]) if gap_index % 2 == 0 else (pin_lanes[1], pin_lanes[2])
        for side, x0 in (("izq", lane_start), ("der", width - lane_start - link_t)):
            for position, lane_y in (("del", pair[0]), ("tras", pair[1])):
                link = _link_mesh(settings, slot_low, slot_high, link_width)
                open_matrix = (
                    matrix_translate([x0, open_y[gap_index] + lane_y, open_z[gap_index] + z_low])
                    @ matrix_rotate_x(theta)
                    @ LINK_ORIENTATION
                )
                fold_matrix = matrix_translate([x0, tray_y + lane_y, fold_z[gap_index] + z_low]) @ LINK_ORIENTATION
                emit(
                    f"link-{gap_index + 1}-{side}-{position}",
                    f"Brazo {gap_index + 1} {side} {position}",
                    f"link-{gap_index + 1}",
                    link,
                    "frame",
                    "joint",
                    open_matrix,
                    fold_matrix,
                    explode=(0.0, 0.0, 20.0 + gap_index * 8.0),
                )
                for tray_index, pin_z, label in (
                    (gap_index, z_low, "inferior"),
                    (gap_index + 1, z_high, "superior"),
                ):
                    pin = _pin_local(settings, tray_w, tray_x, lane_start, lane_y, pin_z, side)
                    emit(
                        f"pin-{gap_index + 1}-{label}-{side}-{position}",
                        f"Pasador {gap_index + 1} {label} {side} {position}",
                        "pins",
                        pin,
                        "corner",
                        "hardware",
                        tray_open[tray_index],
                        tray_fold[tray_index],
                    )

    fold_top = max(fold_z[index] + lip_h for index in range(len(active)))
    for gap_index, link_top in enumerate(link_tops):
        fold_top = max(fold_top, fold_z[gap_index] + z_low + link_top)

    panel_top = fold_top + 3.0
    panel_depth_needed = depth
    if settings["addRear"] and settings["backPanel"] != "none":
        panel_w = width - 2.0 * link_t - 1.0
        panel_x0 = link_t + 0.5
        rows = max(1, int(settings["panelRows"]))
        cols = max(1, int(settings["panelSplit"]))
        panel_h = settings["backHeight"]
        piece_w = (panel_w - 3.0 * (cols - 1)) / cols
        piece_h = (panel_h - 3.0 * (rows - 1)) / rows
        vertical = _vertical_matrix(depth, 0.0)
        fold_y = 4.0
        panel_depth_needed = max(panel_depth_needed, fold_y + piece_h + 4.0)
        for row in range(rows):
            for col in range(cols):
                piece = _panel_mesh(settings, piece_w, piece_h)
                x = panel_x0 + col * (piece_w + 3.0)
                z = base_h + row * (piece_h + 3.0)
                open_matrix = matrix_translate([x, 0.0, z]) @ vertical
                fold_matrix = matrix_translate([x, fold_y, panel_top + row * (settings["panelThickness"] + 1.2)])
                emit(
                    f"panel-{row + 1}-{col + 1}",
                    f"Panel {row + 1}.{col + 1}",
                    "panel",
                    piece,
                    "panel",
                    "panel",
                    open_matrix,
                    fold_matrix,
                    explode=(0.0, 0.0, 28.0 + row * 8.0),
                )
        for index, x in enumerate((panel_x0, panel_x0 + panel_w - 12.0), start=1):
            clip = box(x, depth - settings["panelThickness"] - 5.0, base_h, 12.0, 7.0, 16.0)
            emit(
                f"panel-clip-{index}",
                f"Clip de panel {index}",
                "panel",
                clip,
                "corner",
                "hardware",
            )
        if settings.get("sign"):
            sign = _sign_mesh(settings)
            open_matrix = matrix_translate([width / 2.0 - 52.0, 0.0, base_h + panel_h - 48.0]) @ _vertical_matrix(
                depth - settings["panelThickness"] - 2.0,
                0.0,
            )
            fold_matrix = matrix_translate([width / 2.0 - 52.0, fold_y, panel_top + rows * (settings["panelThickness"] + 1.2) + 2.0])
            emit("sign", "Cartel", "panel", sign, "accessory", "accessory", open_matrix, fold_matrix)
        if settings["hooks"] > 0:
            hook_rows = max(1, int(settings["hookRows"]))
            hook_cols = max(1, math.ceil(settings["hooks"] / hook_rows))
            for index in range(settings["hooks"]):
                row = index // hook_cols
                col = index % hook_cols
                x = (col + 0.5) * width / hook_cols
                z = base_h + panel_h - (96.0 if settings.get("sign") else 30.0) - row * 46.0
                hook = _hook_mesh(settings)
                open_matrix = matrix_translate([x, depth - settings["panelThickness"] - 2.0, z])
                fold_matrix = matrix_translate(
                    [x, fold_y + 4.0, panel_top + rows * (settings["panelThickness"] + 1.2) + 6.0 + index * 9.0]
                ) @ matrix_rotate_x(90.0)
                emit(f"hook-{index + 1}", f"Gancho {index + 1}", "hooks", hook, "hook", "hook", open_matrix, fold_matrix)
            panel_top += 8.0 + settings["hooks"] * 9.0
        panel_top += rows * (settings["panelThickness"] + 1.2)
    fold_top = max(fold_top, panel_top)

    if settings["transport"] and settings["transportLid"]:
        case_depth = max(depth, panel_depth_needed)
        case_h = max(60.0, fold_top - base_h + 10.0)
        case_width = width + 2.0 * wall_t + 4.0
        case = _transport_case_mesh(settings, case_width, case_depth, case_h).translated(
            (-(case_width - width) / 2.0, 0.0, base_h)
        )
        emit("transport-case", "Caja de transporte", "transport", case, "transport", "transport", transport_only=True)
        if settings["transportHandle"]:
            handle = _handle_bridge(settings, min(110.0, width * 0.62))
            handle = handle.translated((width / 2.0, case_depth / 2.0, base_h + case_h))
            emit("transport-handle", "Asa de transporte", "transport", handle, "transport", "transport", transport_only=True)

    return parts
