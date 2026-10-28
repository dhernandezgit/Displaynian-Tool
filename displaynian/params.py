from __future__ import annotations

import copy
import math
from typing import Any

SYSTEM_PRESETS: dict[str, dict[str, Any]] = {
    "keychain": {
        "label": "Llaveros y colgantes",
        "description": "Tres bandejas cantilever con contenedores extraíbles.",
        "width": 170.0,
        "depth": 140.0,
        "levels": 3,
        "levelSpacing": 50.0,
        "shelfDepth": 115.0,
        "lipHeight": 18.0,
        "trayTilt": 0.0,
        "cantileverStep": 28.0,
        "cantileverClosedGap": 24.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
    "stickers": {
        "label": "Pegatinas, postales y tarjetas",
        "description": "Bandejas amplias y poco profundas para producto plano.",
        "width": 180.0,
        "depth": 140.0,
        "levels": 3,
        "levelSpacing": 58.0,
        "shelfDepth": 110.0,
        "lipHeight": 16.0,
        "trayTilt": 0.0,
        "cantileverStep": 26.0,
        "cantileverClosedGap": 22.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
    "jewelry": {
        "label": "Joyería",
        "description": "Bandejas con insertos de anillos, pendientes, pulseras y collares.",
        "width": 170.0,
        "depth": 145.0,
        "levels": 3,
        "levelSpacing": 50.0,
        "shelfDepth": 115.0,
        "lipHeight": 20.0,
        "trayTilt": 0.0,
        "cantileverStep": 24.0,
        "cantileverClosedGap": 26.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
    "coasters": {
        "label": "Posavasos",
        "description": "Bandejas con raíles y topes para posavasos.",
        "width": 180.0,
        "depth": 150.0,
        "levels": 3,
        "levelSpacing": 54.0,
        "shelfDepth": 120.0,
        "lipHeight": 16.0,
        "trayTilt": 0.0,
        "cantileverStep": 22.0,
        "cantileverClosedGap": 22.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
    "bookmarks": {
        "label": "Marcapáginas",
        "description": "Tres bandejas con cuatro divisores.",
        "width": 170.0,
        "depth": 145.0,
        "levels": 3,
        "levelSpacing": 48.0,
        "shelfDepth": 110.0,
        "lipHeight": 18.0,
        "trayTilt": 0.0,
        "cantileverStep": 22.0,
        "cantileverClosedGap": 24.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
    "pens": {
        "label": "Bolígrafos",
        "description": "Tres bandejas con inserto de seis bolígrafos.",
        "width": 180.0,
        "depth": 150.0,
        "levels": 3,
        "levelSpacing": 56.0,
        "shelfDepth": 115.0,
        "lipHeight": 22.0,
        "trayTilt": 0.0,
        "cantileverStep": 22.0,
        "cantileverClosedGap": 28.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
    "mixed": {
        "label": "Sistema mixto",
        "description": "Contenedores, divisores y bandejas con paso cantilever.",
        "width": 180.0,
        "depth": 155.0,
        "levels": 3,
        "levelSpacing": 52.0,
        "shelfDepth": 120.0,
        "lipHeight": 22.0,
        "trayTilt": 0.0,
        "cantileverStep": 24.0,
        "cantileverClosedGap": 28.0,
        "backPanel": "none",
        "hooks": 0,
        "bins": 0,
        "priceTags": 0,
        "letters": 0,
        "transport": True,
    },
}

PRINTER_PROFILES: dict[str, dict[str, Any]] = {
    "a1mini": {"label": "Bambu Lab A1 Mini", "width": 180.0, "depth": 180.0, "height": 180.0},
    "generic220": {"label": "Genérica 220 × 220", "width": 220.0, "depth": 220.0, "height": 220.0},
    "a1": {"label": "Bambu Lab A1 / P1S / X1C", "width": 256.0, "depth": 256.0, "height": 256.0},
    "h2d": {"label": "Bambu Lab H2D / H2S", "width": 350.0, "depth": 320.0, "height": 325.0},
    "custom": {"label": "Personalizada", "width": 256.0, "depth": 256.0, "height": 256.0},
}

MATERIAL_PROFILES: dict[str, dict[str, Any]] = {
    "pla": {"label": "PLA", "density": 1.24, "young": 3200.0, "allow": 28.0},
    "petg": {"label": "PETG", "density": 1.27, "young": 2100.0, "allow": 22.0},
    "asa": {"label": "ASA", "density": 1.07, "young": 2200.0, "allow": 24.0},
}

LASER_PROFILES: dict[str, dict[str, Any]] = {
    "plywood3": {"label": "Contrachapado 3 mm", "thickness": 3.0, "kerf": 0.15, "livingHinge": True},
    "plywood4": {"label": "Contrachapado 4 mm", "thickness": 4.0, "kerf": 0.16, "livingHinge": True},
    "plywood6": {"label": "Contrachapado 6 mm", "thickness": 6.0, "kerf": 0.18, "livingHinge": False},
    "mdf3": {"label": "MDF 3 mm", "thickness": 3.0, "kerf": 0.18, "livingHinge": True},
    "mdf4": {"label": "MDF 4 mm", "thickness": 4.0, "kerf": 0.20, "livingHinge": False},
    "acrylic3": {"label": "Acrílico 3 mm", "thickness": 3.0, "kerf": 0.20, "livingHinge": False},
}

SHEET_PROFILES: dict[str, dict[str, Any]] = {
    "a4": {"label": "A4 (297 × 210)", "width": 297.0, "height": 210.0},
    "a3": {"label": "A3 (420 × 297)", "width": 420.0, "height": 297.0},
    "laser600": {"label": "Láser 600 × 400", "width": 600.0, "height": 400.0},
    "laser900": {"label": "Láser 900 × 600", "width": 900.0, "height": 600.0},
    "custom": {"label": "Personalizada", "width": 600.0, "height": 400.0},
}

INSERT_TYPES = [
    "none",
    "bookmark4",
    "pen6",
    "rings",
    "earringCards",
    "bracelet",
    "necklace",
    "honeycomb",
    "coasterRail",
    "cardRail",
    "bin1",
    "bin2",
    "bin3",
]

BACK_PANEL_TYPES = ["none", "plain", "skadis", "honeycomb", "branding"]
SHELF_TYPES = ["flat", "sloped", "pegboard", "rail"]
HOOK_TYPES = ["skadis", "wire", "combo"]
JOINERY_TYPES = ["pin", "snap", "chicago", "hybrid"]
FOLD_MODES = ["zfold", "accordion"]

DEFAULT_SETTINGS: dict[str, Any] = {
    "version": 1,
    "mode": "3d",
    "system": "keychain",
    "width": 170.0,
    "depth": 140.0,
    "levels": 3,
    "levelSpacing": 50.0,
    "shelfDepth": 115.0,
    "shelfTaper": 1.0,
    "addBase": True,
    "addRear": True,
    "addFront": True,
    "addLocks": True,
    "baseHeight": 3.0,
    "baseRadius": 5.0,
    "sideThickness": 4.0,
    "postDepth": 30.0,
    "panelThickness": 3.0,
    "shelfThickness": 2.4,
    "lipHeight": 18.0,
    "lipThickness": 2.4,
    "dividerSpacing": 32.0,
    "dividerThickness": 1.6,
    "trayRadius": 3.0,
    "trayTilt": 0.0,
    "cantileverStep": 28.0,
    "cantileverClosedGap": 24.0,
    "frontLipRatio": 0.72,
    "pinDiameter": 4.2,
    "lidHeight": 38.0,
    "backPanel": "none",
    "backHeight": 0.0,
    "panelSplit": 1,
    "panelRows": 2,
    "panelMargin": 8.0,
    "foldMode": "zfold",
    "foldAngle": 60.0,
    "transport": True,
    "transportLid": True,
    "transportHandle": True,
    "stackable": True,
    "ballast": False,
    "strapSlots": False,
    "feet": True,
    "cornerBrackets": False,
    "cornerInset": 22.0,
    "cornerLeg": 34.0,
    "cornerRadius": 7.0,
    "cornerScrew": 3.2,
    "cornerType": "l",
    "panelJoiners": True,
    "shelfBrackets": False,
    "railEnds": False,
    "wallMounts": False,
    "hooks": 0,
    "hookType": "skadis",
    "hookLength": 42.0,
    "hookSpacing": 80.0,
    "hookRows": 1,
    "hookLocks": False,
    "wirePitch": 40.0,
    "wireDiameter": 3.0,
    "bins": 0,
    "binLids": True,
    "priceTags": 0,
    "letters": 0,
    "letterText": "DISPLAYNIAN",
    "sign": True,
    "awning": False,
    "accessoryTray": True,
    "insert": "none",
    "levelConfigs": [],
    "disabledParts": [],
    "partColors": {},
    "partScales": {},
    "printer": "a1",
    "bedWidth": 256.0,
    "bedDepth": 256.0,
    "bedHeight": 256.0,
    "nozzle": 0.4,
    "layerHeight": 0.2,
    "walls": 3,
    "infill": 18.0,
    "clearance": 0.28,
    "joinery": "pin",
    "material": "pla",
    "laserMaterial": "plywood3",
    "laserThickness": 3.0,
    "kerf": 0.15,
    "sheet": "laser600",
    "sheetWidth": 600.0,
    "sheetHeight": 400.0,
    "fingerWidth": 7.0,
    "fingerClearance": 0.12,
    "dogbone": 3.0,
    "livingHinge": False,
    "hingeRows": 5,
    "hingeSlot": 18.0,
    "hingeBridge": 2.4,
    "hingeRowSpacing": 3.0,
    "laserFold": "flatpack",
    "includePrintedKit": False,
    "colors": {
        "base": "#5d6b73",
        "frame": "#e9e4da",
        "shelf": "#f3efe7",
        "panel": "#d7e0e6",
        "hook": "#e4a15d",
        "bin": "#c7d8c9",
        "price": "#f4d8a8",
        "transport": "#7f8f98",
        "accessory": "#c9a7c7",
        "corner": "#b7c4cc",
    },
}


def _number(value: Any, default: float, low: float, high: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return max(low, min(high, number))


def _integer(value: Any, default: int, low: int, high: int) -> int:
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))


def _boolean(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() not in {"0", "false", "no", "off", ""}
    if value is None:
        return default
    return bool(value)


def _choice(value: Any, options: list[str], default: str) -> str:
    text = str(value)
    return text if text in options else default


def _level_defaults(index: int, settings: dict[str, Any]) -> dict[str, Any]:
    depth = settings["shelfDepth"] * (settings["shelfTaper"] ** index)
    return {
        "id": f"level-{index + 1}",
        "name": f"Nivel {index + 1}",
        "enabled": True,
        "type": "flat",
        "height": settings["levelSpacing"] * (index + 1),
        "gap": settings["levelSpacing"],
        "depth": depth,
        "angle": 0.0,
        "lip": True,
        "lipHeight": settings["lipHeight"],
        "insert": "none",
        "style": "containers",
        "containers": 2,
        "color": "shelf",
    }


def normalize_settings(raw: dict[str, Any] | None) -> dict[str, Any]:
    raw = raw if isinstance(raw, dict) else {}
    system = _choice(raw.get("system"), list(SYSTEM_PRESETS), "keychain")
    preset = SYSTEM_PRESETS[system]
    settings = copy.deepcopy(DEFAULT_SETTINGS)
    settings.update(preset)
    settings.update({key: value for key, value in raw.items() if key not in {"colors", "levelConfigs"}})
    settings["colors"] = {**DEFAULT_SETTINGS["colors"], **(raw.get("colors") if isinstance(raw.get("colors"), dict) else {})}
    settings["system"] = system
    settings["mode"] = _choice(settings.get("mode"), ["3d", "laser"], "3d")
    settings["width"] = _number(settings.get("width"), 170.0, 120.0, 900.0)
    settings["depth"] = _number(settings.get("depth"), 140.0, 120.0, 600.0)
    settings["levels"] = _integer(settings.get("levels"), 4, 1, 6)
    settings["levelSpacing"] = _number(settings.get("levelSpacing"), 50.0, 30.0, 160.0)
    settings["shelfDepth"] = _number(settings.get("shelfDepth"), 115.0, 60.0, settings["depth"] - 16.0)
    settings["shelfTaper"] = _number(settings.get("shelfTaper"), 1.0, 0.55, 1.0)
    settings["addBase"] = _boolean(settings.get("addBase"), True)
    settings["addRear"] = _boolean(settings.get("addRear"), True)
    settings["addFront"] = _boolean(settings.get("addFront"), True)
    settings["addLocks"] = _boolean(settings.get("addLocks"), True)
    settings["baseHeight"] = _number(settings.get("baseHeight"), 4.0, 2.0, 30.0)
    settings["baseRadius"] = _number(settings.get("baseRadius"), 6.0, 0.0, 40.0)
    settings["sideThickness"] = _number(settings.get("sideThickness"), 4.0, 2.0, 24.0)
    settings["postDepth"] = _number(settings.get("postDepth"), 30.0, 8.0, 80.0)
    settings["panelThickness"] = _number(settings.get("panelThickness"), 3.0, 1.5, 20.0)
    settings["shelfThickness"] = _number(settings.get("shelfThickness"), 2.4, 1.2, 20.0)
    settings["lipHeight"] = _number(settings.get("lipHeight"), 18.0, 16.0, 60.0)
    settings["lipThickness"] = _number(settings.get("lipThickness"), 2.4, 1.0, 12.0)
    settings["dividerSpacing"] = _number(settings.get("dividerSpacing"), 32.0, 18.0, 120.0)
    settings["dividerThickness"] = _number(settings.get("dividerThickness"), 1.6, 0.8, 6.0)
    settings["trayRadius"] = _number(settings.get("trayRadius"), 3.0, 0.0, 20.0)
    settings["trayTilt"] = _number(settings.get("trayTilt"), 0.0, 0.0, 20.0)
    settings["cantileverStep"] = _number(settings.get("cantileverStep"), 28.0, 8.0, 70.0)
    settings["cantileverClosedGap"] = _number(settings.get("cantileverClosedGap"), 24.0, 12.0, 80.0)
    settings["frontLipRatio"] = _number(settings.get("frontLipRatio"), 0.72, 0.3, 1.0)
    settings["pinDiameter"] = _number(settings.get("pinDiameter"), 4.2, 2.0, 10.0)
    settings["lidHeight"] = _number(settings.get("lidHeight"), 38.0, 16.0, 160.0)
    settings["backPanel"] = _choice(settings.get("backPanel"), BACK_PANEL_TYPES, "skadis")
    settings["backHeight"] = _number(settings.get("backHeight"), 0.0, 0.0, 900.0)
    settings["panelSplit"] = _integer(settings.get("panelSplit"), 1, 1, 6)
    settings["panelRows"] = _integer(settings.get("panelRows"), 2, 1, 6)
    settings["panelMargin"] = _number(settings.get("panelMargin"), 18.0, 4.0, 80.0)
    settings["foldMode"] = _choice(settings.get("foldMode"), FOLD_MODES, "zfold")
    settings["foldAngle"] = _number(settings.get("foldAngle"), 60.0, 30.0, 85.0)
    settings["transport"] = _boolean(settings.get("transport"), True)
    settings["transportLid"] = _boolean(settings.get("transportLid"), True)
    settings["transportHandle"] = _boolean(settings.get("transportHandle"), True)
    settings["stackable"] = _boolean(settings.get("stackable"), True)
    settings["ballast"] = _boolean(settings.get("ballast"), True)
    settings["strapSlots"] = _boolean(settings.get("strapSlots"), True)
    settings["feet"] = _boolean(settings.get("feet"), True)
    settings["cornerBrackets"] = _boolean(settings.get("cornerBrackets"), True)
    settings["cornerInset"] = _number(settings.get("cornerInset"), 22.0, 6.0, 80.0)
    settings["cornerLeg"] = _number(settings.get("cornerLeg"), 34.0, 12.0, 90.0)
    settings["cornerRadius"] = _number(settings.get("cornerRadius"), 7.0, 0.0, 25.0)
    settings["cornerScrew"] = _number(settings.get("cornerScrew"), 3.2, 1.0, 10.0)
    settings["cornerType"] = _choice(settings.get("cornerType"), ["l", "u", "flat", "tri"], "l")
    settings["panelJoiners"] = _boolean(settings.get("panelJoiners"), True)
    settings["shelfBrackets"] = _boolean(settings.get("shelfBrackets"), True)
    settings["railEnds"] = _boolean(settings.get("railEnds"), True)
    settings["wallMounts"] = _boolean(settings.get("wallMounts"), False)
    settings["hooks"] = _integer(settings.get("hooks"), 3, 0, 40)
    settings["hookType"] = _choice(settings.get("hookType"), HOOK_TYPES, "skadis")
    settings["hookLength"] = _number(settings.get("hookLength"), 42.0, 12.0, 100.0)
    settings["hookSpacing"] = _number(settings.get("hookSpacing"), 80.0, 20.0, 160.0)
    settings["hookRows"] = _integer(settings.get("hookRows"), 1, 1, 4)
    settings["hookLocks"] = _boolean(settings.get("hookLocks"), True)
    settings["wirePitch"] = _number(settings.get("wirePitch"), 40.0, 15.0, 120.0)
    settings["wireDiameter"] = _number(settings.get("wireDiameter"), 3.0, 1.0, 10.0)
    settings["bins"] = _integer(settings.get("bins"), 2, 0, 12)
    settings["binLids"] = _boolean(settings.get("binLids"), True)
    settings["priceTags"] = _integer(settings.get("priceTags"), 4, 0, 40)
    settings["letters"] = _integer(settings.get("letters"), 0, 0, 40)
    settings["letterText"] = str(settings.get("letterText") or "DISPLAYNIAN")[:24]
    settings["sign"] = _boolean(settings.get("sign"), False)
    settings["signText"] = str(settings.get("signText") or "DISPLAYNIAN")[:24]
    settings["testCoupons"] = _boolean(settings.get("testCoupons"), True)
    settings["autoSplit"] = _boolean(settings.get("autoSplit"), True)
    settings["containerLids"] = _boolean(settings.get("containerLids"), True)
    settings["awning"] = _boolean(settings.get("awning"), False)
    settings["accessoryTray"] = _boolean(settings.get("accessoryTray"), True)
    settings["insert"] = _choice(settings.get("insert"), INSERT_TYPES, "none")
    settings["printer"] = _choice(settings.get("printer"), list(PRINTER_PROFILES), "a1")
    profile = PRINTER_PROFILES[settings["printer"]]
    if settings["printer"] != "custom":
        settings["bedWidth"] = profile["width"]
        settings["bedDepth"] = profile["depth"]
        settings["bedHeight"] = profile["height"]
    settings["bedWidth"] = _number(settings.get("bedWidth"), 256.0, 80.0, 1200.0)
    settings["bedDepth"] = _number(settings.get("bedDepth"), 256.0, 80.0, 1200.0)
    settings["bedHeight"] = _number(settings.get("bedHeight"), 256.0, 80.0, 1200.0)
    settings["nozzle"] = _number(settings.get("nozzle"), 0.4, 0.2, 1.2)
    settings["layerHeight"] = _number(settings.get("layerHeight"), 0.2, 0.08, 0.6)
    settings["walls"] = _integer(settings.get("walls"), 3, 1, 12)
    settings["infill"] = _number(settings.get("infill"), 18.0, 0.0, 100.0)
    settings["clearance"] = _number(settings.get("clearance"), 0.28, 0.05, 1.0)
    settings["joinery"] = _choice(settings.get("joinery"), JOINERY_TYPES, "hybrid")
    settings["material"] = _choice(settings.get("material"), list(MATERIAL_PROFILES), "pla")
    settings["laserMaterial"] = _choice(settings.get("laserMaterial"), list(LASER_PROFILES), "plywood3")
    laser = LASER_PROFILES[settings["laserMaterial"]]
    settings["laserThickness"] = _number(settings.get("laserThickness"), laser["thickness"], 1.5, 12.0)
    settings["kerf"] = _number(settings.get("kerf"), laser["kerf"], 0.0, 0.8)
    settings["sheet"] = _choice(settings.get("sheet"), list(SHEET_PROFILES), "laser600")
    sheet = SHEET_PROFILES[settings["sheet"]]
    if settings["sheet"] != "custom":
        settings["sheetWidth"] = sheet["width"]
        settings["sheetHeight"] = sheet["height"]
    settings["sheetWidth"] = _number(settings.get("sheetWidth"), 600.0, 100.0, 2000.0)
    settings["sheetHeight"] = _number(settings.get("sheetHeight"), 400.0, 100.0, 2000.0)
    settings["fingerWidth"] = _number(settings.get("fingerWidth"), 7.0, 3.0, 30.0)
    settings["fingerClearance"] = _number(settings.get("fingerClearance"), 0.12, 0.0, 0.6)
    settings["dogbone"] = _number(settings.get("dogbone"), 3.0, 0.0, 12.0)
    settings["livingHinge"] = _boolean(settings.get("livingHinge"), False)
    settings["hingeRows"] = _integer(settings.get("hingeRows"), 5, 2, 20)
    settings["hingeSlot"] = _number(settings.get("hingeSlot"), 18.0, 6.0, 40.0)
    settings["hingeBridge"] = _number(settings.get("hingeBridge"), 2.4, 0.8, 8.0)
    settings["hingeRowSpacing"] = _number(settings.get("hingeRowSpacing"), 3.0, 1.0, 10.0)
    settings["laserFold"] = _choice(settings.get("laserFold"), ["flatpack", "livingHinge"], "flatpack")
    settings["includePrintedKit"] = _boolean(settings.get("includePrintedKit"), False)

    defaults = [_level_defaults(index, settings) for index in range(settings["levels"])]
    raw_levels = raw.get("levelConfigs") if isinstance(raw.get("levelConfigs"), list) else []
    levels: list[dict[str, Any]] = []
    for index, base in enumerate(defaults):
        item = dict(base)
        if index < len(raw_levels) and isinstance(raw_levels[index], dict):
            item.update(raw_levels[index])
        item["id"] = str(item.get("id") or base["id"])
        item["name"] = str(item.get("name") or base["name"])[:40]
        item["enabled"] = _boolean(item.get("enabled"), True)
        item["type"] = _choice(item.get("type"), SHELF_TYPES, "flat")
        item["height"] = _number(item.get("height"), base["height"], 20.0, 1200.0)
        item["gap"] = _number(item.get("gap"), base["gap"], 24.0, 160.0)
        item["style"] = _choice(item.get("style"), ["dividers", "containers", "empty"], "dividers")
        item["containers"] = _integer(item.get("containers"), 2, 1, 5)
        item["depth"] = _number(item.get("depth"), base["depth"], 40.0, settings["depth"] - 10.0)
        item["angle"] = _number(item.get("angle"), 0.0, -20.0, 30.0)
        item["lip"] = _boolean(item.get("lip"), True)
        item["lipHeight"] = _number(item.get("lipHeight"), settings["lipHeight"], 0.0, 80.0)
        item["insert"] = _choice(item.get("insert"), INSERT_TYPES, "none")
        item["color"] = str(item.get("color") or "shelf")
        levels.append(item)
    cumulative = settings["baseHeight"]
    for index, level in enumerate(levels):
        if index > 0:
            cumulative += level["gap"]
        level["height"] = cumulative
    settings["levelConfigs"] = levels
    settings["disabledParts"] = [str(value) for value in (settings.get("disabledParts") or [])]
    settings["partColors"] = {
        str(key): str(value)
        for key, value in (settings.get("partColors") or {}).items()
        if str(value).startswith("#")
    }
    settings["partScales"] = {
        str(key): max(0.2, min(3.0, float(value)))
        for key, value in (settings.get("partScales") or {}).items()
        if isinstance(value, (int, float))
    }
    settings["backHeight"] = settings["backHeight"] or min(
        650.0,
        settings["baseHeight"] + sum(level.get("gap", settings["levelSpacing"]) for level in settings["levelConfigs"][1:]) + settings["lipHeight"] + 80.0,
    )
    return settings


def apply_system_preset(settings: dict[str, Any], system: str) -> dict[str, Any]:
    if system not in SYSTEM_PRESETS:
        return normalize_settings(settings)
    raw = dict(settings)
    raw.update(SYSTEM_PRESETS[system])
    raw["system"] = system
    raw.pop("levelConfigs", None)
    return normalize_settings(raw)
