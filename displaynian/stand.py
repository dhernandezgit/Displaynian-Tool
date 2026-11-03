from __future__ import annotations

import base64
import math
from typing import Any

import numpy as np

from . import engine
from .mesh import Mesh, mesh_to_obj, three_mf_bytes


def _rotation_z(angle_degrees: float) -> np.ndarray:
    angle = math.radians(angle_degrees)
    cosine = math.cos(angle)
    sine = math.sin(angle)
    return np.array(
        [
            [cosine, -sine, 0.0, 0.0],
            [sine, cosine, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ],
        dtype=float,
    )


def _stand_meshes(payload: dict[str, Any]) -> list[tuple[str, Mesh, str]]:
    grid = max(150.0, min(600.0, float(payload.get("grid") or 300.0)))
    raw_units = payload.get("units") if isinstance(payload.get("units"), list) else []
    meshes: list[tuple[str, Mesh, str]] = []
    for unit in raw_units:
        if not isinstance(unit, dict) or unit.get("hidden"):
            continue
        settings = dict(unit.get("settings") or {})
        settings["mode"] = "3d"
        settings["transport"] = False
        settings["transportLid"] = False
        settings["transportHandle"] = False
        result = engine.build({"settings": settings})
        actual = result["settings"]
        cell_x = max(0, int(round(float(unit.get("cellX", 0)))))
        cell_z = max(0, int(round(float(unit.get("cellZ", 0)))))
        rotation = float(unit.get("rotation", 0)) % 360.0
        prefix = str(unit.get("name") or actual.get("system") or "Módulo")
        offset_x = cell_x * grid + grid / 2.0 - actual["width"] / 2.0
        offset_z = cell_z * grid + grid / 2.0 - actual["depth"] / 2.0
        for part in result["parts"]:
            if part.get("transport_only") or part.get("fold_hide"):
                continue
            mesh = engine._assembled_mesh(part, "open_matrix")
            if abs(rotation) > 0.01:
                mesh = mesh.transformed(_rotation_z(rotation))
            mesh = mesh.translated((offset_x, offset_z, 0.0))
            meshes.append((f"{prefix} · {part['name']}", mesh, part["color"]))
    return meshes


def export_stand_3mf(payload: dict[str, Any]) -> dict[str, Any]:
    meshes = _stand_meshes(payload)
    if not meshes:
        return {"ok": False, "error": "No hay módulos visibles para exportar."}
    data = three_mf_bytes(meshes, "Displaynian stand")
    return {
        "ok": True,
        "data_b64": base64.b64encode(data).decode("ascii"),
        "name": "displaynian-stand.3mf",
    }


def export_stand_obj(payload: dict[str, Any]) -> dict[str, Any]:
    meshes = _stand_meshes(payload)
    if not meshes:
        return {"ok": False, "error": "No hay módulos visibles para exportar."}
    data = mesh_to_obj([(name, mesh) for name, mesh, _ in meshes])
    return {
        "ok": True,
        "data_b64": base64.b64encode(data).decode("ascii"),
        "name": "displaynian-stand.obj",
    }
