from __future__ import annotations

import math
from typing import Any, Callable

import numpy as np
from shapely import affinity
from shapely.geometry import MultiPolygon, Point, Polygon
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


def _t(poly: Polygon, x: float, y: float) -> Polygon:
    return affinity.translate(poly, xoff=x, yoff=y)


def _skadis_holes(width: float, height: float, margin: float = 12.0) -> list[Polygon]:
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
                holes.append(_t(rounded_rect(5.0, 15.0, 2.5), x - 2.5, y - 7.5))
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
            holes.append(
                Polygon(
                    [
                        (x + radius * math.cos(math.radians(60 * i + 30)), y + radius * math.sin(math.radians(60 * i + 30)))
                        for i in range(6)
                    ]
                )
            )
            x += dx
        y += dy
        row += 1
    return holes


def _difference(poly: Polygon, holes: list[Polygon]) -> Polygon:
    valid = [hole for hole in holes if not hole.is_empty and poly.contains(hole)]
    if not valid:
        return poly
    return poly.difference(unary_union(valid))


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


def _tray_mesh(settings: dict[str, Any], depth: float) -> Mesh:
    width = settings["width"]
    link_t = settings["sideThickness"]
    wall = settings["shelfThickness"]
    height = settings["lipHeight"]
    radius = settings["trayRadius"]
    clearance = settings["clearance"]
    tray_w = width - 2.0 * (link_t + clearance)
    tray_d = depth
    front_h = height * settings["frontLipRatio"]
    pin_front = 22.0
    pin_rear = tray_d - 22.0
    pin_z = height * 0.54
    pin_r = settings["pinDiameter"] / 2.0 + 0.15
    mesh = extrude_polygon(rounded_rect(tray_w, tray_d, radius), 0.0, wall)
    side = rounded_rect(tray_d, height, radius)
    side = _difference(
        side,
        [
            Point(pin_front, pin_z).buffer(pin_r, resolution=24),
            Point(pin_rear, pin_z).buffer(pin_r, resolution=24),
        ],
    )
    mesh = mesh.append(extrude_x(side, 0.0, wall))
    mesh = mesh.append(extrude_x(side, tray_w - wall, wall))
    front = extrude_y(rounded_rect(tray_w, front_h, radius), wall, wall)
    back = extrude_y(rounded_rect(tray_w, height, radius), tray_d, wall)
    mesh = mesh.append(front).append(back)
    compartment = max(2, int(round((tray_w - 2.0 * wall) / settings["dividerSpacing"])))
    divider_h = max(8.0, (height - wall) * 0.62)
    for index in range(1, compartment):
        x = wall + index * (tray_w - 2.0 * wall) / compartment
        profile = rounded_rect(tray_d - 2.0 * wall, divider_h, min(1.2, divider_h / 4.0))
        mesh = mesh.append(
            extrude_x(profile, x - settings["dividerThickness"] / 2.0, settings["dividerThickness"])
            .translated((0.0, wall, wall))
        )
    return mesh


def _link_mesh(settings: dict[str, Any], spacing: float) -> Mesh:
    width = settings["postDepth"]
    length = spacing + 20.0
    radius = min(8.0, width / 2.0 - 0.1)
    profile = rounded_rect(width, length, radius)
    bottom = Point(width / 2.0, 10.0).buffer(settings["pinDiameter"] / 2.0 + 0.25, resolution=24)
    slot_w = settings["pinDiameter"] + 0.7
    slot = _t(rounded_rect(slot_w, 13.0, slot_w / 2.0), width / 2.0 - slot_w / 2.0, spacing + 10.0 - 6.5)
    light = _t(rounded_rect(width * 0.34, max(8.0, length * 0.22), 4.0), width * 0.33, length * 0.5)
    profile = profile.difference(bottom).difference(slot).difference(light)
    return extrude_x(profile, 0.0, settings["sideThickness"])


def _pin_mesh(settings: dict[str, Any]) -> Mesh:
    diameter = settings["pinDiameter"]
    length = settings["sideThickness"] + settings["clearance"] + settings["shelfThickness"] + 1.8
    head = cylinder(0.0, 0.0, -1.6, diameter / 2.0 + 2.0, 1.6, 32)
    shaft = cylinder(0.0, 0.0, 0.0, diameter / 2.0, length, 32)
    tip = cylinder(0.0, 0.0, length - 1.0, diameter / 2.0 - 0.5, 1.0, 24)
    mesh = head.append(shaft).append(tip)
    return mesh.transformed(matrix_rotate_y(90.0))


def _panel_mesh(settings: dict[str, Any], width: float, height: float) -> Mesh:
    poly = rounded_rect(width, height, 3.0)
    kind = settings["backPanel"]
    holes: list[Polygon] = []
    if kind == "skadis":
        holes = _skadis_holes(width, height, margin=10.0)
    elif kind == "honeycomb":
        holes = _honeycomb_holes(width, height, radius=4.0)
    elif kind == "branding":
        holes = [_t(rounded_rect(width - 16.0, height - 22.0, 5.0), 8.0, 11.0)]
    poly = _difference(poly, holes)
    return extrude_polygon(poly, 0.0, settings["panelThickness"])


def _rail_mesh(settings: dict[str, Any], panel_w: float) -> Mesh:
    depth = 12.0
    height = 11.0
    wall = 2.0
    outer = rounded_rect(depth, height, 3.0)
    inner = _t(rounded_rect(depth - 2.0 * wall, height - wall, 1.0), wall, wall)
    return extrude_x(outer.difference(inner), 0.0, panel_w)


def _lid_mesh(settings: dict[str, Any]) -> Mesh:
    width = settings["width"] + 4.0
    depth = min(settings["depth"] + 4.0, settings["shelfDepth"] + 10.0)
    height = settings["lidHeight"]
    wall = settings["shelfThickness"]
    radius = settings["trayRadius"] + 1.0
    outer = rounded_rect(width, depth, radius)
    inner = _t(rounded_rect(width - 2.0 * wall, depth - 2.0 * wall, max(1.0, radius - wall)), wall, wall)
    mesh = extrude_polygon(outer.difference(inner), 0.0, height - wall)
    top = outer
    if settings["transportHandle"]:
        handle = _t(rounded_rect(min(90.0, width * 0.42), 18.0, 9.0), width / 2.0 - min(90.0, width * 0.42) / 2.0, depth * 0.40)
        top = top.difference(handle)
    mesh = mesh.append(extrude_polygon(top, height - wall, wall))
    return mesh


def _sign_mesh(settings: dict[str, Any]) -> Mesh:
    width = 104.0
    height = 42.0
    plate = rounded_rect(width, height, 6.0)
    slot = _t(rounded_rect(width - 24.0, 20.0, 3.0), 12.0, 11.0)
    plate = plate.difference(slot)
    mesh = extrude_polygon(plate, 0.0, settings["panelThickness"])
    for index, x in enumerate((12.0, width - 18.0), start=1):
        mesh = mesh.append(box(x, height - 2.0, 0.0, 6.0, 2.0, 8.0))
    return mesh


def _hook_mesh(settings: dict[str, Any]) -> Mesh:
    length = settings["hookLength"]
    panel_t = settings["panelThickness"]
    plate = box(-24.0, 0.0, -8.0, 48.0, 3.0, 16.0)
    for x in (-20.0, 20.0):
        plate = plate.append(box(x - 2.15, 0.0, -4.5, 4.3, panel_t + 1.2, 9.0))
        plate = plate.append(box(x - 4.5, panel_t, -4.5, 9.0, 1.8, 9.0))
    arm_profile = Polygon(
        [
            (0.0, -2.5),
            (-length, -2.5),
            (-length, 6.0),
            (-length + 6.0, 10.0),
            (-length + 6.0, 4.0),
            (-4.0, 4.0),
            (-4.0, 2.5),
            (0.0, 2.5),
        ]
    )
    return plate.append(extrude_polygon(arm_profile, 0.0, 7.0))


def _insert_mesh(settings: dict[str, Any], level: dict[str, Any], width: float, depth: float, height: float) -> list[tuple[str, Mesh]]:
    kind = level["insert"]
    if kind == "none":
        return []
    items: list[tuple[str, Mesh]] = []
    if kind in {"bin1", "bin2", "bin3", "bookmark4"}:
        count = {"bin1": 1, "bin2": 2, "bin3": 3, "bookmark4": 4}[kind]
        inner = width / count
        for index in range(1, count):
            items.append(
                (
                    f"divider-{index}",
                    extrude_x(rounded_rect(depth - 4.0, height * 0.72, 1.0), index * inner - 0.9, 1.8).translated((0.0, 2.0, 1.0)),
                )
            )
    elif kind == "pen6":
        plate = rounded_rect(width - 6.0, depth - 6.0, 4.0)
        holes = []
        for index in range(6):
            cx = 3.0 + (index + 0.5) * (width - 6.0) / 6.0
            holes.append(Point(cx, depth / 2.0).buffer(12.0, resolution=24))
        plate = _difference(plate, holes)
        items.append(("pen-plate", extrude_polygon(plate, height * 0.55, 3.0).translated((3.0, 3.0, 0.0))))
    elif kind in {"rings", "bracelet"}:
        count = max(3, int(width / 48.0))
        for index in range(count):
            cx = (index + 0.5) * width / count
            if kind == "rings":
                items.append((f"cone-{index}", _cone(cx, depth * 0.45, height * 0.05, 16.0, height * 0.55)))
            else:
                items.append((f"bar-{index}", cylinder(cx, depth * 0.4, 2.0, 8.0, height * 0.55, 28)))
    elif kind in {"earringCards", "necklace", "honeycomb"}:
        plate = rounded_rect(width - 6.0, height * 0.82, 3.0)
        if kind == "honeycomb":
            plate = _difference(plate, _honeycomb_holes(width - 6.0, height * 0.82, radius=4.0))
        items.append(("card-panel", extrude_y(plate, depth - 8.0, 3.0).translated((3.0, 0.0, 4.0))))
    elif kind in {"coasterRail", "cardRail"}:
        for index, y in enumerate((4.0, depth - 6.0), start=1):
            items.append((f"rail-{index}", box(0.0, y, 0.0, width, 2.0, 10.0)))
    return items


def _cone(cx: float, cy: float, z: float, radius: float, height: float) -> Mesh:
    steps = 32
    vertices = []
    faces = []
    for index in range(steps):
        angle = math.tau * index / steps
        vertices.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle), z))
    tip = len(vertices)
    vertices.append((cx, cy, z + height))
    center = len(vertices)
    vertices.append((cx, cy, z))
    for index in range(steps):
        nxt = (index + 1) % steps
        faces.append((index, nxt, tip))
        faces.append((center, nxt, index))
    return Mesh(np.asarray(vertices), np.asarray(faces, dtype=np.int64)).merged().oriented()


def build_parts(
    settings: dict[str, Any],
    add_part: Callable[..., None],
) -> list[dict[str, Any]]:
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
        fold_hide: bool = False,
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
            None,
            fold_hide,
        )

    width = settings["width"]
    depth = settings["depth"]
    levels = max(1, int(settings["levels"]))
    spacing = settings["levelSpacing"]
    base_h = settings["baseHeight"]
    link_t = settings["sideThickness"]
    clearance = settings["clearance"]
    tray_depth = min(settings["shelfDepth"], depth - 24.0)
    tray_y = 7.0
    tray_x = link_t + clearance
    tray_w = width - 2.0 * (link_t + clearance)
    tray_h = settings["lipHeight"]
    pin_front = 22.0
    pin_rear = tray_depth - 22.0
    pin_z = tray_h * 0.54
    tray_levels = [level for level in settings["levelConfigs"][:levels]]
    while len(tray_levels) < levels:
        tray_levels.append(settings["levelConfigs"][-1])

    if settings["addBase"]:
        base = rounded_rect(width, depth, settings["baseRadius"])
        emit("base", "Base", "base", extrude_polygon(base, 0.0, base_h), "base", "structure")
        if settings["feet"]:
            for index, (x, y) in enumerate(
                [(16.0, 16.0), (width - 16.0, 16.0), (16.0, depth - 16.0), (width - 16.0, depth - 16.0)],
                start=1,
            ):
                emit(f"foot-{index}", f"Pata {index}", "base", cylinder(x, y, -2.5, 9.0, 2.5, 28), "base", "hardware")

    theta = math.radians(settings["foldAngle"])
    tray_fold: list[tuple[float, float]] = [(0.0, 0.0)]
    for index in range(1, levels):
        angle = theta if (index - 1) % 2 == 0 else -theta
        previous = tray_fold[-1]
        tray_fold.append(
            (
                previous[0] - spacing * math.sin(angle),
                previous[1] + spacing * math.cos(angle),
            )
        )
    fold_y_offset = max(0.0, -min(item[0] for item in tray_fold) * 0.5 + 2.0)
    tray_fold = [(0.0, 0.0)] + [(item[0] + fold_y_offset, item[1]) for item in tray_fold[1:]]

    for index, level in enumerate(tray_levels):
        z = base_h + index * spacing
        mesh = _tray_mesh(settings, tray_depth)
        mesh = mesh.translated((tray_x, tray_y, z))
        if side_ok := True:
            pass
        if level["enabled"]:
            fold = matrix_translate([0.0, tray_fold[index][0], tray_fold[index][1] - index * spacing])
            emit(f"tray-{index + 1}", level["name"], f"tray-{index + 1}", mesh, "shelf", "shelf", fold_matrix=fold)
            for extra_name, extra_mesh in _insert_mesh(settings, level, tray_w, tray_depth, tray_h):
                emit(
                    f"tray-{index + 1}-{extra_name}",
                    f"{level['name']} · {extra_name}",
                    f"tray-{index + 1}",
                    extra_mesh.translated((tray_x, tray_y, z)),
                    "accessory",
                    "insert",
                    fold_matrix=fold,
                )

    link_count = 0
    pin_count = 0
    if settings["addFront"]:
        for gap in range(levels - 1):
            angle = theta if gap % 2 == 0 else -theta
            z_low = base_h + gap * spacing
            for side_name, x in (("izq", 0.0), ("der", width - link_t)):
                for position, pin_y in (("del", pin_front), ("tras", pin_rear)):
                    link = _link_mesh(settings, spacing)
                    link = link.translated((x, tray_y + pin_y - settings["postDepth"] / 2.0, z_low + pin_z - 10.0))
                    pivot = (0.0, tray_y + pin_y, z_low + pin_z)
                    fold = matrix_translate([0.0, tray_fold[gap][0], tray_fold[gap][1] - gap * spacing]) @ matrix_rotate_x(math.degrees(angle), pivot)
                    link_count += 1
                    emit(
                        f"link-{gap + 1}-{side_name}-{position}",
                        f"Enlace {gap + 1} {side_name} {position}",
                        f"link-{gap + 1}",
                        link,
                        "frame",
                        "joint",
                        fold_matrix=fold,
                        fold_hide=True,
                    )
            for side_name, x in (("der", width), ("izq", 0.0)):
                for position, pin_y in (("del", pin_front), ("tras", pin_rear)):
                    for level_index in (gap, gap + 1):
                        pin = _pin_mesh(settings)
                        if side_name == "der":
                            pin = pin.transformed(matrix_scale([-1.0, 1.0, 1.0], (width / 2.0, 0.0, 0.0)))
                        pin = pin.translated((0.0, tray_y + pin_y, base_h + level_index * spacing + pin_z))
                        pin_count += 1
                        emit(
                            f"pin-{gap + 1}-{side_name}-{position}-{level_index + 1}",
                            f"Pasador {pin_count}",
                            "pins",
                            pin,
                            "corner",
                            "hardware",
                            fold_matrix=matrix_translate([0.0, tray_fold[level_index][0], tray_fold[level_index][1] - level_index * spacing]),
                        )

    panel_w = width - 2.0 * link_t - 4.0
    current_panel_rows = max(1, int(settings["panelRows"]))
    panel_h = settings["backHeight"]
    panel_cols = max(1, int(settings["panelSplit"]))
    panel_x0 = link_t + 2.0
    panel_z0 = base_h + 2.0
    panel_y = depth - settings["panelThickness"]
    stack_top = base_h + tray_fold[-1][1] + tray_h
    panel_pieces = []
    if settings["addRear"] and settings["backPanel"] != "none":
        piece_w = (panel_w - 3.0 * (panel_cols - 1)) / panel_cols
        piece_h = (panel_h - 3.0 * (current_panel_rows - 1)) / current_panel_rows
        for row in range(current_panel_rows):
            for col in range(panel_cols):
                piece = _panel_mesh(settings, piece_w, piece_h)
                x = panel_x0 + col * (piece_w + 3.0)
                z = panel_z0 + row * (piece_h + 3.0)
                piece = _vertical(piece, depth, z).translated((x, 0.0, 0.0))
                rotation = matrix_rotate_x(90.0, (0.0, depth, base_h))
                y_shift = 6.0 - depth + z + piece_h - base_h
                z_shift = stack_top + 4.0 + row * (settings["panelThickness"] + 1.5) - base_h
                fold = matrix_translate([0.0, y_shift, z_shift]) @ rotation
                panel_pieces.append(fold)
                emit(
                    f"panel-{row + 1}-{col + 1}",
                    f"Panel {row + 1}.{col + 1}",
                    "panel",
                    piece,
                    "panel",
                    "panel",
                    fold_matrix=fold,
                )
        emit(
            "panel-rail",
            "Raíl inferior del panel",
            "panel",
            _rail_mesh(settings, panel_w + 4.0).translated((panel_x0 - 2.0, depth - 13.0, base_h)),
            "corner",
            "hardware",
        )
        for index, x in enumerate((panel_x0 + 8.0, panel_x0 + panel_w - 20.0), start=1):
            clip = box(x, depth - 12.0, panel_z0 + panel_h * 0.55, 12.0, 12.0, 22.0)
            clip = clip.append(box(x - 3.0, depth - 15.0, panel_z0 + panel_h * 0.55 + 8.0, 18.0, 18.0, 5.0))
            emit(
                f"panel-clip-{index}",
                f"Clip superior {index}",
                "panel",
                clip,
                "corner",
                "hardware",
                fold_matrix=panel_pieces[-1] if panel_pieces else None,
            )
        if settings["panelJoiners"] and (current_panel_rows > 1 or panel_cols > 1):
            for index in range(max(current_panel_rows - 1, panel_cols - 1)):
                z = panel_z0 + (index + 1) * panel_h / current_panel_rows
                joiner = box(panel_x0 + 6.0, depth - 1.5, z - 14.0, panel_w - 12.0, 3.0, 28.0)
                emit(
                    f"panel-joiner-{index + 1}",
                    f"Unión de panel {index + 1}",
                    "panel",
                    joiner,
                    "corner",
                    "hardware",
                    fold_matrix=panel_pieces[min(index, len(panel_pieces) - 1)] if panel_pieces else None,
                )

    sign_fold = panel_pieces[-1] if panel_pieces else None
    if settings.get("sign") and settings["addRear"] and settings["backPanel"] != "none":
        sign = _sign_mesh(settings)
        sign = _vertical(sign, depth, 0.0).translated((width / 2.0 - 52.0, 0.0, panel_z0 + panel_h - 10.0))
        emit("sign", "Cartel con inserción de papel", "panel", sign, "accessory", "accessory", fold_matrix=sign_fold)

    if settings["hooks"] > 0 and settings["addRear"] and settings["backPanel"] != "none":
        rows = max(1, int(settings["hookRows"]))
        cols = max(1, math.ceil(settings["hooks"] / rows))
        start_z = panel_z0 + panel_h - 18.0
        made = 0
        for row in range(rows):
            for col in range(cols):
                if made >= settings["hooks"]:
                    break
                made += 1
                x = panel_x0 + (col + 0.5) * panel_w / cols
                z = start_z - row * 46.0
                hook = _hook_mesh(settings).translated((x, panel_y - settings["panelThickness"] - 2.0, z))
                emit(
                    f"hook-{made}",
                    f"Gancho {made}",
                    "hooks",
                    hook,
                    "hook",
                    "hook",
                    fold_matrix=panel_pieces[-1] if panel_pieces else None,
                )

    if settings["transport"] and settings["transportLid"]:
        lid = _lid_mesh(settings)
        open_z = base_h + (levels - 1) * spacing + tray_h + 2.0
        lid = lid.translated((-2.0, tray_y - 4.0, open_z))
        fold = matrix_translate([0.0, 0.0, stack_top + current_panel_rows * (settings["panelThickness"] + 1.5) + 2.0 - open_z])
        emit("lid", "Tapa de transporte", "transport", lid, "transport", "transport", fold_matrix=fold)

    return parts
