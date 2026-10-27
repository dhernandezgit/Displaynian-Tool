from __future__ import annotations

import base64
import csv
import io
import json
import zipfile
from typing import Any

from . import __version__
from . import engine
from .params import (
    BACK_PANEL_TYPES,
    DEFAULT_SETTINGS,
    INSERT_TYPES,
    LASER_PROFILES,
    MATERIAL_PROFILES,
    PRINTER_PROFILES,
    SHEET_PROFILES,
    SYSTEM_PRESETS,
)


def _json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def bootstrap(_payload: str = "{}") -> str:
    return _json(
        {
            "ok": True,
            "version": __version__,
            "systems": [
                {"id": key, **value}
                for key, value in SYSTEM_PRESETS.items()
            ],
            "printers": [
                {"id": key, **value}
                for key, value in PRINTER_PROFILES.items()
            ],
            "materials": [
                {"id": key, **value}
                for key, value in MATERIAL_PROFILES.items()
            ],
            "laserMaterials": [
                {"id": key, **value}
                for key, value in LASER_PROFILES.items()
            ],
            "sheets": [
                {"id": key, **value}
                for key, value in SHEET_PROFILES.items()
            ],
            "inserts": INSERT_TYPES,
            "backPanels": BACK_PANEL_TYPES,
            "defaults": DEFAULT_SETTINGS,
        }
    )


def build(payload: str) -> str:
    try:
        return _json(engine.build(json.loads(payload)))
    except Exception as error:
        return _json({"ok": False, "error": str(error)})


def export_3mf(payload: str) -> str:
    try:
        return _json(engine.export_3mf(json.loads(payload)))
    except Exception as error:
        return _json({"ok": False, "error": str(error)})


def export_stl_zip(payload: str) -> str:
    try:
        return _json(engine.export_stl_zip(json.loads(payload)))
    except Exception as error:
        return _json({"ok": False, "error": str(error)})


def export_obj(payload: str) -> str:
    try:
        return _json(engine.export_obj(json.loads(payload)))
    except Exception as error:
        return _json({"ok": False, "error": str(error)})


def export_laser_zip(payload: str) -> str:
    try:
        data = json.loads(payload)
        result = engine.build(data)
        if not result.get("laser"):
            return _json({"ok": False, "error": "El proyecto no está en modo láser."})
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for sheet in result["laser"]["sheets"]:
                archive.writestr(f"hoja-{sheet['index']}.svg", sheet["svg"])
                archive.writestr(f"hoja-{sheet['index']}.dxf", sheet["dxf"])
            if result["settings"].get("includePrintedKit"):
                kit_settings = {**data.get("settings", data), "mode": "3d"}
                kit = engine.build({"settings": kit_settings})
                kit_categories = {"hook", "insert", "accessory", "hardware"}
                for part in kit["parts"]:
                    if part["category"] in kit_categories:
                        archive.writestr(f"kit/{part['id']}.stl", base64.b64decode(part["stl_b64"]))
                archive.writestr(
                    "kit/LEEME.txt",
                    "Kit impreso para Displaynian. Contiene ganchos, inserts, accesorios y herrajes.\n",
                )
            rows = io.StringIO()
            writer = csv.writer(rows)
            writer.writerow(["id", "nombre", "grupo", "volumen_mm3", "triangulos"])
            for part in result["parts"]:
                writer.writerow([part["id"], part["name"], part["group"], f"{part['volume']:.1f}", part["triangles"]])
            archive.writestr("piezas.csv", rows.getvalue())
            archive.writestr(
                "ajustes.json",
                json.dumps(result["settings"], indent=2, ensure_ascii=False),
            )
        return _json(
            {
                "ok": True,
                "data_b64": base64.b64encode(buffer.getvalue()).decode("ascii"),
                "name": "displaynian-laser.zip",
            }
        )
    except Exception as error:
        return _json({"ok": False, "error": str(error)})
