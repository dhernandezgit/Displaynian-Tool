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
    assert 30 <= len(result["parts"]) <= 70
    assert result["dimensions"]["width"] == pytest.approx(170, abs=1)
    assert result["dimensions"]["depth"] > _settings()["depth"]
    assert result["dimensions"]["levels"] == 3
    tray = next(part for part in result["parts"] if part["id"] == "tray-1")
    assert tray["dimensions"]["height"] == pytest.approx(18, abs=1)
    assert result["dimensions"]["foldedHeight"] < result["dimensions"]["height"]
    assert not any(part["id"].startswith("side-") for part in result["parts"])
    assert any(part["id"].startswith("link-1-izq") for part in result["parts"])
    assert any(part["id"].startswith("pin-1-inferior-izq") for part in result["parts"])
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
    assert not any(part["id"] == "base" for part in result["parts"])
    assert any(part["id"].startswith("link-") for part in result["parts"])
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
    assert settings["levelConfigs"][0]["height"] == pytest.approx(3)
    assert settings["levelConfigs"][1]["height"] == pytest.approx(53)
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
    assert panel["dimensions"]["depth"] > 95
    assert panel["dimensions"]["height"] == pytest.approx(3, abs=0.5)


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
    ring = outer.difference(hole)
    mesh = extrude_polygon(ring, 0, 5)
    assert mesh.bounds["max"][2] == pytest.approx(5)
    assert mesh.volume() == pytest.approx(ring.area * 5, rel=2e-2)


def test_sign_and_laser_test_coupons():
    result = engine.build({"settings": _settings(sign=True, signText="MI MARCA", backPanel="skadis")})
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


def test_cantilever_a1_mini_preset_fits():
    settings = normalize_settings(_settings(width=150, depth=120, shelfDepth=95, levels=3, levelSpacing=45, lipHeight=18, cantileverStep=24, cantileverClosedGap=22, printer="a1mini", bedWidth=180, bedDepth=180, bedHeight=180))
    result = engine.build({"settings": settings})
    assert not any(check["code"] == "bed-fit" and check["level"] == "warn" for check in result["checks"])
    assert any(part["id"] == "transport-case" for part in result["parts"])


def test_laser_side_arms_have_cut_and_score_lines():
    from displaynian import laser
    from displaynian.params import normalize_settings

    settings = normalize_settings(_settings(mode="laser"))
    parts = laser._panel_parts(settings)
    sides = [part for part in parts if part["id"] in {"laser-side-a", "laser-side-b"}]
    assert len(sides) == 2
    for side in sides:
        assert side["cuts"]
        assert side["scores"]
        assert all(len(line.coords) == 2 for line in side["scores"])


def test_per_level_gap_and_containers():
    from displaynian.params import normalize_settings
    settings = normalize_settings(_settings(levels=3))
    settings["levelConfigs"] = [
        {**settings["levelConfigs"][0], "id": "l1", "name": "Nivel 1", "gap": 0, "style": "containers", "containers": 3},
        {**settings["levelConfigs"][1], "id": "l2", "name": "Nivel 2", "gap": 72, "style": "containers", "containers": 2},
        {**settings["levelConfigs"][2], "id": "l3", "name": "Nivel 3", "gap": 40, "style": "empty"},
    ]
    result = engine.build({"settings": settings})
    ids = [part["id"] for part in result["parts"]]
    assert any("tray-2" in part_id and "container-1" in part_id for part_id in ids)
    assert any("tray-1" in part_id and "container-3" in part_id for part_id in ids)
    assert not any("tray-3" in part_id and "container" in part_id for part_id in ids)


def test_default_is_compact_and_transport_case_is_closed():
    from displaynian.params import normalize_settings
    settings = normalize_settings(_settings())
    result = engine.build({"settings": settings})
    ids = {part["id"]: part for part in result["parts"]}
    assert result["dimensions"]["width"] == pytest.approx(170, abs=1)
    assert "transport-case" in ids
    assert ids["transport-case"]["transport_only"] is True
    assert not any(part["group"] == "panel" for part in result["parts"])
    assert not any(part["category"] == "hook" for part in result["parts"])
    assert result["material_grams"] < 1000


def test_per_level_gap_moves_trays():
    from displaynian.params import normalize_settings
    settings = normalize_settings(_settings())
    settings["levelConfigs"][1]["gap"] = 72
    settings["levelConfigs"][2]["gap"] = 40
    result = engine.build({"settings": settings})
    trays = {part["id"]: part for part in result["parts"] if part["id"].startswith("tray-") and part["id"].endswith(tuple("123"))}
    z1 = trays["tray-1"]["open_matrix"][11]
    z2 = trays["tray-2"]["open_matrix"][11]
    z3 = trays["tray-3"]["open_matrix"][11]
    assert z2 - z1 == pytest.approx(72, abs=1)
    assert z3 - z2 == pytest.approx(40, abs=1)


def test_cantilever_links_alternate_lanes_and_transport_cover_fits():
    result = engine.build({"settings": _settings()})
    links = [part for part in result["parts"] if part["id"].startswith("link-")]
    assert len(links) == 8
    first = np.asarray(next(part for part in links if part["id"] == "link-1-izq-del")["fold_matrix"], dtype=float).reshape(4, 4)
    second = np.asarray(next(part for part in links if part["id"] == "link-2-izq-del")["fold_matrix"], dtype=float).reshape(4, 4)
    rear = np.asarray(next(part for part in links if part["id"] == "link-1-izq-tras")["fold_matrix"], dtype=float).reshape(4, 4)
    assert abs(first[0, 3] - second[0, 3]) > 5
    assert abs(first[1, 3] - rear[1, 3]) > 50
    case = next(part for part in result["parts"] if part["id"] == "transport-case")
    case_top = case["bounds"]["max"][2]
    folded_top = 0.0
    for part in result["parts"]:
        if part.get("transport_only") or part.get("fold_hide"):
            continue
        _, high = engine._matrix_bounds(part, "fold_matrix")
        folded_top = max(folded_top, high[2])
    assert case_top >= folded_top
    assert result["dimensions"]["foldedHeight"] < result["dimensions"]["height"]


def test_cantilever_link_is_flat_for_printing():
    result = engine.build({"settings": _settings()})
    link = next(part for part in result["parts"] if part["id"] == "link-1-izq-del")
    assert link["dimensions"]["height"] == pytest.approx(_settings()["sideThickness"], abs=0.2)
    assert link["dimensions"]["width"] > 20
    assert link["dimensions"]["depth"] > link["dimensions"]["width"]


def test_system_presets_change_cantilever_geometry():
    keychain = normalize_settings({"system": "keychain"})
    stickers = normalize_settings({"system": "stickers"})
    assert keychain["cantileverStep"] != stickers["cantileverStep"]
    assert keychain["lipHeight"] != stickers["lipHeight"]
    assert keychain["shelfDepth"] != stickers["shelfDepth"]


def test_mechanism_clearance_and_adaptive_fold():
    default = engine.build({"settings": _settings()})
    assert any(check["code"] == "clearance" and check["level"] == "ok" for check in default["checks"])
    deep = engine.build({"settings": _settings(levels=4)})
    assert any(check["code"] == "link-clearance" for check in deep["checks"])
    assert any(check["code"] == "clearance" and check["level"] == "ok" for check in deep["checks"])
