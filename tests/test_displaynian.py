from __future__ import annotations

import base64
import io
import json
import struct
import zipfile

import numpy as np
import pytest

from displaynian import engine
from displaynian.mesh import Mesh, box, extrude_polygon, rounded_rect
from displaynian.params import DEFAULT_SETTINGS, SYSTEM_PRESETS, normalize_settings


def _settings(**overrides):
    values = dict(DEFAULT_SETTINGS)
    values.update(overrides)
    return values


def _mesh_from_part(part):
    data = base64.b64decode(part["stl_b64"])
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


def test_default_3d_build_is_complete():
    result = engine.build({"settings": _settings()})
    assert result["ok"]
    assert result["mode"] == "3d"
    assert 30 <= len(result["parts"]) <= 80
    assert result["dimensions"]["width"] == pytest.approx(220, abs=1)
    assert result["dimensions"]["levels"] == 4
    tray = next(part for part in result["parts"] if part["id"] == "tray-1")
    assert tray["dimensions"]["height"] == pytest.approx(38, abs=1)
    assert result["dimensions"]["foldedHeight"] < result["dimensions"]["height"]
    assert sum(1 for part in result["parts"] if part["id"].startswith("link-")) == 12
    assert sum(1 for part in result["parts"] if part["id"].startswith("pin-")) == 24
    assert any(check["code"] == "bed-fit" for check in result["checks"])
    assert result["material_grams"] > 0
    assert result["bom"]


@pytest.mark.parametrize("system", list(SYSTEM_PRESETS))
def test_every_system_builds(system):
    result = engine.build({"settings": _settings(system=system)})
    assert result["ok"]
    assert len(result["parts"]) > 0


def test_all_structural_modules_can_be_disabled():
    result = engine.build(
        {
            "settings": _settings(
                addBase=False,
                addRear=False,
                addFront=False,
                addLocks=False,
                hooks=0,
                bins=0,
                priceTags=0,
                letters=0,
                sign=False,
                awning=False,
                cornerBrackets=False,
                panelJoiners=False,
                shelfBrackets=False,
                railEnds=False,
                wallMounts=False,
            )
        }
    )
    assert result["ok"]
    assert all(part["group"].startswith("tray-") or part["group"] in {"transport", "base"} for part in result["parts"])
    assert any(check["code"] == "structure-off" for check in result["checks"])


def test_laser_mode_generates_sheets_and_layers():
    result = engine.build({"settings": _settings(mode="laser", includePrintedKit=True, hooks=4)})
    assert result["ok"]
    assert result["laser"] is not None
    sheets = result["laser"]["sheets"]
    assert sheets
    assert result["laser"]["overflow"] == []
    for sheet in sheets:
        assert sheet["svg"].startswith("<svg")
        assert "ENTITIES" in sheet["dxf"]
        assert sheet["width"] > 0 and sheet["height"] > 0


def test_living_hinge_is_present_when_enabled():
    result = engine.build({"settings": _settings(mode="laser", livingHinge=True, laserFold="livingHinge", includePrintedKit=True)})
    assert result["laser"]["livingHinge"] is True
    assert any("Bisagra viva" in name for sheet in result["laser"]["sheets"] for name in sheet["parts"])


def test_part_override_color_and_scale():
    first = engine.build({"settings": _settings()})
    part = first["parts"][0]
    changed = engine.build(
        {
            "settings": _settings(
                partColors={part["id"]: "#ff0000"},
                partScales={part["id"]: 1.2},
            )
        }
    )
    target = next(item for item in changed["parts"] if item["id"] == part["id"])
    assert target["color"] == "#ff0000"
    assert target["dimensions"]["width"] > part["dimensions"]["width"]


def test_disabled_part_is_filtered():
    first = engine.build({"settings": _settings()})
    target = first["parts"][0]["id"]
    second = engine.build({"settings": _settings(disabledParts=[target])})
    assert all(part["id"] != target for part in second["parts"])


def test_export_3mf_contains_model_and_objects():
    result = engine.export_3mf({"settings": _settings()})
    assert result["ok"]
    archive = zipfile.ZipFile(io.BytesIO(base64.b64decode(result["data_b64"])))
    assert "3D/3dmodel.model" in archive.namelist()
    model = archive.read("3D/3dmodel.model").decode("utf-8")
    assert "<build>" in model
    assert "Displaynian" in model


def test_export_stl_zip_and_obj():
    stl = engine.export_stl_zip({"settings": _settings()})
    assert stl["ok"]
    archive = zipfile.ZipFile(io.BytesIO(base64.b64decode(stl["data_b64"])))
    assert "piezas.csv" in archive.namelist()
    assert any(name.endswith(".stl") for name in archive.namelist())
    obj = engine.export_obj({"settings": _settings()})
    assert obj["ok"]
    text = base64.b64decode(obj["data_b64"]).decode("utf-8")
    assert text.startswith("o ")
    assert "\nv " in text and "\nf " in text


def test_export_laser_zip_with_kit():
    result = engine.build({"settings": _settings(mode="laser", includePrintedKit=True)})
    payload = json.dumps({"settings": {**result["settings"], "includePrintedKit": True}})
    from displaynian import webapi

    packed = json.loads(webapi.export_laser_zip(payload))
    assert packed["ok"]
    archive = zipfile.ZipFile(io.BytesIO(base64.b64decode(packed["data_b64"])))
    names = archive.namelist()
    assert any(name.endswith(".svg") for name in names)
    assert any(name.endswith(".dxf") for name in names)
    assert any(name.startswith("kit/") and name.endswith(".stl") for name in names)


def test_normalize_levels_are_preserved_and_clamped():
    settings = normalize_settings(_settings(levels=5, levelSpacing=50))
    assert settings["levels"] == 5
    assert len(settings["levelConfigs"]) == 5
    assert settings["levelConfigs"][0]["height"] == pytest.approx(50)
    clamped = normalize_settings(_settings(levels=99))
    assert clamped["levels"] == 6


def test_fold_matrices_are_finite_and_different():
    result = engine.build({"settings": _settings()})
    movable = [part for part in result["parts"] if part["fold_matrix"] != part["open_matrix"]]
    assert movable
    for part in result["parts"]:
        assert all(np.isfinite(part["fold_matrix"]))
        assert all(np.isfinite(part["open_matrix"]))


def test_skadis_slot_grid_has_expected_pitch():
    result = engine.build({"settings": _settings(backPanel="skadis", panelSplit=1)})
    panel = next(part for part in result["parts"] if part["group"] == "panel" and "Panel" in part["name"])
    assert panel["dimensions"]["width"] > 150
    assert panel["dimensions"]["height"] > 100


def test_box_mesh_is_closed():
    mesh = box(0, 0, 0, 10, 20, 30)
    edges = {}
    for face in mesh.faces:
        for a, b in ((face[0], face[1]), (face[1], face[2]), (face[2], face[0])):
            key = tuple(sorted((int(a), int(b))))
            edges[key] = edges.get(key, 0) + 1
    assert all(value == 2 for value in edges.values())
    assert mesh.volume() == pytest.approx(6000, rel=2e-3)


def test_extrusion_supports_holes():
    outer = rounded_rect(40, 30, 4)
    hole = rounded_rect(10, 8, 2)
    mesh = extrude_polygon(outer.difference(hole), 0, 5)
    assert mesh.volume() > 0
    assert mesh.bounds["max"][2] == pytest.approx(5)


def test_sign_and_laser_test_coupons():
    result = engine.build({"settings": _settings(sign=True, signText="MI MARCA")})
    assert any(part["id"] == "sign" for part in result["parts"])
    laser = engine.build({"settings": _settings(mode="laser", testCoupons=True, sign=True)})
    names = [name for sheet in laser["laser"]["sheets"] for name in sheet["parts"]]
    assert any("Prueba de gancho" in name for name in names)
    assert any("Galga de kerf" in name for name in names)
    assert any("Cartel" in name for name in names)


def test_wide_and_narrow_variants_build():
    for width in (230, 340):
        result = engine.build({"settings": _settings(width=width, panelSplit=2 if width > 256 else 1)})
        assert result["ok"]
        assert result["parts"]
        assert result["dimensions"]["width"] == pytest.approx(width)
