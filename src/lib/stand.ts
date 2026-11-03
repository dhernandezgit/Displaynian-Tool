import type {
  AppSettings,
  BuildResult,
  StandCheck,
  StandPlan,
  StandRotation,
  StandTemplate,
  StandUnit,
} from "../types";
import { applySystemPreserving, normalizeSettings, SYSTEM_CARDS } from "./defaults";

export const STAND_VERSION = 1;
export const DEFAULT_GRID = 300;
export const GRID_OPTIONS = [
  { value: 200, label: "20 cm" },
  { value: 300, label: "30 cm" },
  { value: 400, label: "40 cm" },
  { value: 500, label: "50 cm" },
  { value: 600, label: "60 cm" },
];
export const MERCH_LEVELS = [
  { value: 0, label: "Sin merch" },
  { value: 1, label: "Ligero" },
  { value: 2, label: "Medio" },
  { value: 3, label: "Lleno" },
];

export const STAND_TEMPLATES: StandTemplate[] = [
  {
    id: "solo",
    label: "Escaparate",
    description: "Un solo expositor para empezar.",
    icon: "Store",
    grid: 300,
    cols: 1,
    rows: 1,
    units: [{ system: "keychain", cellX: 0, cellZ: 0 }],
  },
  {
    id: "duo",
    label: "Dúo",
    description: "Dos módulos cara al público.",
    icon: "Columns2",
    grid: 300,
    cols: 2,
    rows: 1,
    units: [
      { system: "keychain", cellX: 0, cellZ: 0 },
      { system: "stickers", cellX: 1, cellZ: 0 },
    ],
  },
  {
    id: "wall",
    label: "Pared",
    description: "Cuatro módulos en línea continua.",
    icon: "Rows3",
    grid: 300,
    cols: 4,
    rows: 1,
    units: [
      { system: "keychain", cellX: 0, cellZ: 0 },
      { system: "stickers", cellX: 1, cellZ: 0 },
      { system: "jewelry", cellX: 2, cellZ: 0 },
      { system: "mixed", cellX: 3, cellZ: 0 },
    ],
  },
  {
    id: "corner",
    label: "Rincón",
    description: "Tres módulos al frente y dos en el lateral.",
    icon: "CornerDownRight",
    grid: 300,
    cols: 4,
    rows: 4,
    units: [
      { system: "keychain", cellX: 0, cellZ: 3 },
      { system: "stickers", cellX: 1, cellZ: 3 },
      { system: "jewelry", cellX: 2, cellZ: 3 },
      { system: "coasters", cellX: 3, cellZ: 2, rotation: 270 },
      { system: "bookmarks", cellX: 3, cellZ: 1, rotation: 270 },
    ],
  },
  {
    id: "island",
    label: "Isla",
    description: "Seis módulos alrededor de una isla.",
    icon: "SquareDashed",
    grid: 300,
    cols: 4,
    rows: 4,
    units: [
      { system: "keychain", cellX: 1, cellZ: 3 },
      { system: "stickers", cellX: 2, cellZ: 3 },
      { system: "jewelry", cellX: 1, cellZ: 0, rotation: 180 },
      { system: "coasters", cellX: 2, cellZ: 0, rotation: 180 },
      { system: "bookmarks", cellX: 0, cellZ: 1, rotation: 90 },
      { system: "pens", cellX: 3, cellZ: 1, rotation: 270 },
    ],
  },
  {
    id: "market",
    label: "Mercado",
    description: "Ocho módulos en dos filas enfrentadas.",
    icon: "LayoutGrid",
    grid: 300,
    cols: 5,
    rows: 3,
    units: [
      { system: "keychain", cellX: 0, cellZ: 2 },
      { system: "stickers", cellX: 1, cellZ: 2 },
      { system: "jewelry", cellX: 2, cellZ: 2 },
      { system: "mixed", cellX: 3, cellZ: 2 },
      { system: "coasters", cellX: 0, cellZ: 0, rotation: 180 },
      { system: "bookmarks", cellX: 1, cellZ: 0, rotation: 180 },
      { system: "pens", cellX: 2, cellZ: 0, rotation: 180 },
      { system: "keychain", cellX: 3, cellZ: 0, rotation: 180 },
    ],
  },
];

export function systemLabel(system: string): string {
  return SYSTEM_CARDS.find((card) => card.id === system)?.label || system;
}

export function systemAccent(system: string): string {
  return SYSTEM_CARDS.find((card) => card.id === system)?.accent || "#d94f6a";
}

function makeId(prefix = "unit"): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${random}`;
}

export function createStandUnit(
  base: AppSettings,
  system: string,
  cellX: number,
  cellZ: number,
  index: number,
  rotation: StandRotation = 0,
): StandUnit {
  const settings = normalizeSettings({
    ...applySystemPreserving(base, system),
    mode: "3d",
    transport: false,
    transportLid: false,
    transportHandle: false,
  });
  return {
    id: makeId(),
    name: `${systemLabel(system)} ${index + 1}`,
    system,
    settings,
    cellX,
    cellZ,
    rotation,
    merch: true,
    hidden: false,
  };
}

export function standBuildSettings(settings: AppSettings): AppSettings {
  return normalizeSettings({
    ...settings,
    mode: "3d",
    transport: false,
    transportLid: false,
    transportHandle: false,
  });
}

export function makeStandPlan(base: AppSettings): StandPlan {
  const unit = createStandUnit(base, base.system || "keychain", 0, 0, 0);
  return {
    version: STAND_VERSION,
    grid: DEFAULT_GRID,
    cols: 1,
    rows: 1,
    units: [unit],
    selectedId: unit.id,
    showGrid: true,
    showMerch: true,
    showLabels: true,
    merchLevel: 2,
  };
}

function normalizeRotation(value: unknown): StandRotation {
  const number = Number(value);
  if (number === 90 || number === 180 || number === 270) return number;
  return 0;
}

export function normalizeStandPlan(raw: unknown, fallback: AppSettings): StandPlan {
  const source = raw && typeof raw === "object" ? (raw as Partial<StandPlan>) : {};
  const cols = Math.max(1, Math.min(14, Math.round(Number(source.cols) || 1)));
  const rows = Math.max(1, Math.min(10, Math.round(Number(source.rows) || 1)));
  const grid = Math.max(150, Math.min(600, Number(source.grid) || DEFAULT_GRID));
  const seen = new Set<string>();
  const units: StandUnit[] = [];
  for (const item of Array.isArray(source.units) ? source.units : []) {
    if (!item || typeof item !== "object") continue;
    let id = String((item as StandUnit).id || makeId());
    if (seen.has(id)) id = makeId();
    seen.add(id);
    const settings = normalizeSettings((item as StandUnit).settings || fallback);
    const system = SYSTEM_CARDS.some((card) => card.id === (item as StandUnit).system)
      ? String((item as StandUnit).system)
      : settings.system;
    units.push({
      id,
      name: String((item as StandUnit).name || systemLabel(system)).slice(0, 48),
      system,
      settings: { ...settings, system, mode: "3d", transport: false },
      cellX: Math.max(0, Math.min(cols - 1, Math.round(Number((item as StandUnit).cellX) || 0))),
      cellZ: Math.max(0, Math.min(rows - 1, Math.round(Number((item as StandUnit).cellZ) || 0))),
      rotation: normalizeRotation((item as StandUnit).rotation),
      merch: (item as StandUnit).merch !== false,
      hidden: Boolean((item as StandUnit).hidden),
    });
  }
  const selectedId = units.some((unit) => unit.id === source.selectedId)
    ? String(source.selectedId)
    : units[0]?.id || null;
  return {
    version: STAND_VERSION,
    grid,
    cols,
    rows,
    units,
    selectedId,
    showGrid: source.showGrid !== false,
    showMerch: source.showMerch !== false,
    showLabels: source.showLabels !== false,
    merchLevel: Math.max(0, Math.min(3, Math.round(Number(source.merchLevel ?? 2)))),
  };
}

export function selectedStandUnit(plan: StandPlan): StandUnit | null {
  return plan.units.find((unit) => unit.id === plan.selectedId) || null;
}

export function firstFreeCell(plan: StandPlan): { cellX: number; cellZ: number } | null {
  const occupied = new Set(plan.units.map((unit) => `${unit.cellX}:${unit.cellZ}`));
  for (let z = plan.rows - 1; z >= 0; z -= 1) {
    for (let x = 0; x < plan.cols; x += 1) {
      if (!occupied.has(`${x}:${z}`)) return { cellX: x, cellZ: z };
    }
  }
  return null;
}

function growPlan(plan: StandPlan): { plan: StandPlan; cell: { cellX: number; cellZ: number } } | null {
  if (plan.cols < 14) {
    const next = { ...plan, cols: plan.cols + 1 };
    return { plan: next, cell: { cellX: next.cols - 1, cellZ: 0 } };
  }
  if (plan.rows < 10) {
    const next = { ...plan, rows: plan.rows + 1 };
    return { plan: next, cell: { cellX: 0, cellZ: next.rows - 1 } };
  }
  return null;
}

export function addStandUnit(plan: StandPlan, base: AppSettings, system: string): StandPlan {
  let next = plan;
  let cell = firstFreeCell(plan);
  if (!cell) {
    const grown = growPlan(plan);
    if (!grown) return plan;
    next = grown.plan;
    cell = grown.cell;
  }
  const unit = createStandUnit(base, system, cell.cellX, cell.cellZ, plan.units.length);
  return { ...next, units: [...next.units, unit], selectedId: unit.id };
}

export function duplicateStandUnit(plan: StandPlan): StandPlan {
  const selected = selectedStandUnit(plan);
  if (!selected) return plan;
  let next = plan;
  let cell = firstFreeCell(plan);
  if (!cell) {
    const grown = growPlan(plan);
    if (!grown) return plan;
    next = grown.plan;
    cell = grown.cell;
  }
  const copy: StandUnit = {
    ...selected,
    id: makeId(),
    name: `${selected.name} · copia`,
    settings: normalizeSettings(selected.settings),
    cellX: cell.cellX,
    cellZ: cell.cellZ,
    rotation: selected.rotation,
    hidden: false,
  };
  return { ...next, units: [...next.units, copy], selectedId: copy.id };
}

export function rotateStandUnit(plan: StandPlan): StandPlan {
  const selected = selectedStandUnit(plan);
  if (!selected) return plan;
  const rotation = ((selected.rotation + 90) % 360) as StandRotation;
  return {
    ...plan,
    units: plan.units.map((unit) => (unit.id === selected.id ? { ...unit, rotation } : unit)),
  };
}

export function moveStandUnit(plan: StandPlan, id: string, cellX: number, cellZ: number): StandPlan {
  return {
    ...plan,
    units: plan.units.map((unit) => (
      unit.id === id
        ? {
            ...unit,
            cellX: Math.max(0, Math.min(plan.cols - 1, cellX)),
            cellZ: Math.max(0, Math.min(plan.rows - 1, cellZ)),
          }
        : unit
    )),
  };
}

export function deleteStandUnit(plan: StandPlan): StandPlan {
  const selected = selectedStandUnit(plan);
  if (!selected) return plan;
  const units = plan.units.filter((unit) => unit.id !== selected.id);
  return { ...plan, units, selectedId: units[0]?.id || null };
}

export function rotateStandPlan(plan: StandPlan): StandPlan {
  const units = plan.units.map((unit) => ({
    ...unit,
    cellX: plan.rows - 1 - unit.cellZ,
    cellZ: unit.cellX,
    rotation: ((unit.rotation + 90) % 360) as StandRotation,
  }));
  return { ...plan, cols: plan.rows, rows: plan.cols, units };
}

export function applyStandTemplate(plan: StandPlan, template: StandTemplate, base: AppSettings): StandPlan {
  const fallback = selectedStandUnit(plan)?.settings || base;
  const units = template.units.map((item, index) => {
    const unit = createStandUnit(fallback, item.system, item.cellX, item.cellZ, index, item.rotation || 0);
    return { ...unit, name: `${systemLabel(item.system)} ${index + 1}` };
  });
  return {
    ...plan,
    grid: template.grid,
    cols: template.cols,
    rows: template.rows,
    units,
    selectedId: units[0]?.id || null,
    showMerch: true,
  };
}

export function updateStandUnitSettings(plan: StandPlan, id: string, patch: Partial<AppSettings>): StandPlan {
  return {
    ...plan,
    units: plan.units.map((unit) => (
      unit.id === id ? { ...unit, settings: { ...unit.settings, ...patch }, system: String(patch.system ?? unit.system) } : unit
    )),
  };
}

export function unitFootprint(unit: StandUnit): { width: number; depth: number } {
  const width = Math.max(20, Number(unit.settings.width) || 170);
  const depth = Math.max(20, Number(unit.settings.depth) || 140);
  return unit.rotation === 90 || unit.rotation === 270
    ? { width: depth, depth: width }
    : { width, depth };
}

export function unitCenter(plan: StandPlan, unit: StandUnit): { x: number; z: number } {
  return {
    x: (unit.cellX + 0.5) * plan.grid,
    z: (unit.cellZ + 0.5) * plan.grid,
  };
}

export function unitRect(plan: StandPlan, unit: StandUnit) {
  const footprint = unitFootprint(unit);
  const center = unitCenter(plan, unit);
  return {
    minX: center.x - footprint.width / 2,
    maxX: center.x + footprint.width / 2,
    minZ: center.z - footprint.depth / 2,
    maxZ: center.z + footprint.depth / 2,
  };
}

export function estimatedUnitHeight(unit: StandUnit): number {
  const settings = unit.settings;
  const levels = settings.levelConfigs.filter((level) => level.enabled).length || settings.levels;
  const open = settings.baseHeight + Math.max(0, levels - 1) * Math.max(24, settings.levelSpacing) + settings.lipHeight;
  const panel = settings.backPanel !== "none" ? settings.baseHeight + settings.backHeight : 0;
  return Math.max(open, panel, 80);
}

export function standSummary(plan: StandPlan, builds: Record<string, BuildResult>) {
  const visible = plan.units.filter((unit) => !unit.hidden);
  const material = visible.reduce((total, unit) => total + (builds[unit.id]?.material_grams || 0), 0);
  const height = visible.reduce(
    (max, unit) => Math.max(max, builds[unit.id]?.dimensions.height || estimatedUnitHeight(unit)),
    0,
  );
  const pieces = visible.reduce((total, unit) => total + (builds[unit.id]?.parts.length || 0), 0);
  return {
    modules: visible.length,
    hidden: plan.units.length - visible.length,
    footprint: `${(plan.cols * plan.grid / 10).toFixed(0)} × ${(plan.rows * plan.grid / 10).toFixed(0)} cm`,
    material,
    height,
    pieces,
  };
}

export function standChecks(plan: StandPlan, builds: Record<string, BuildResult>): StandCheck[] {
  const checks: StandCheck[] = [];
  const visible = plan.units.filter((unit) => !unit.hidden);
  if (!plan.units.length) {
    checks.push({ level: "info", title: "Stand vacío", detail: "Añade un módulo o elige una plantilla para empezar." });
    return checks;
  }
  if (!visible.length) {
    checks.push({ level: "warn", title: "Todos ocultos", detail: "Activa la visibilidad de algún módulo para verlo en el stand." });
  }
  const standWidth = plan.cols * plan.grid;
  const standDepth = plan.rows * plan.grid;
  const outside: string[] = [];
  const overlaps: string[] = [];
  for (let index = 0; index < visible.length; index += 1) {
    const unit = visible[index];
    const rect = unitRect(plan, unit);
    if (rect.minX < -1 || rect.maxX > standWidth + 1 || rect.minZ < -1 || rect.maxZ > standDepth + 1) {
      outside.push(unit.name);
    }
    for (let otherIndex = index + 1; otherIndex < visible.length; otherIndex += 1) {
      const other = visible[otherIndex];
      const otherRect = unitRect(plan, other);
      const overlapX = Math.min(rect.maxX, otherRect.maxX) - Math.max(rect.minX, otherRect.minX);
      const overlapZ = Math.min(rect.maxZ, otherRect.maxZ) - Math.max(rect.minZ, otherRect.minZ);
      if (overlapX > 1 && overlapZ > 1) overlaps.push(`${unit.name} / ${other.name}`);
    }
  }
  if (outside.length) {
    checks.push({ level: "warn", title: "Módulo fuera del stand", detail: `${outside.slice(0, 3).join(", ")}. Amplía el stand o muévelo.` });
  } else {
    checks.push({ level: "ok", title: "Todo dentro del stand", detail: `Huella de ${(standWidth / 10).toFixed(0)} × ${(standDepth / 10).toFixed(0)} cm.` });
  }
  if (overlaps.length) {
    checks.push({ level: "warn", title: "Módulos solapados", detail: `${overlaps.slice(0, 3).join(", ")}. Sepáralos una celda.` });
  } else {
    checks.push({ level: "ok", title: "Sin solapes", detail: "Cada módulo tiene su espacio y se puede abrir." });
  }
  const wide = visible.filter((unit) => unitFootprint(unit).width > plan.grid + 1 || unitFootprint(unit).depth > plan.grid + 1);
  if (wide.length) {
    checks.push({ level: "info", title: "Módulos anchos", detail: `${wide.length} módulo(s) ocupan más de una celda. Revisa la separación.` });
  }
  if (visible.length > 10) {
    checks.push({ level: "info", title: "Stand grande", detail: "Muchos módulos pueden tardar más en generarse y moverse." });
  }
  const missing = visible.filter((unit) => !builds[unit.id]);
  if (missing.length) {
    checks.push({ level: "info", title: "Generando módulos", detail: `Faltan ${missing.length} módulo(s) por calcular.` });
  }
  return checks;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function standCsv(plan: StandPlan, builds: Record<string, BuildResult>): string {
  const rows = [
    "nombre,sistema,celda_x,celda_z,rotacion,visible,ancho_mm,fondo_mm,alto_mm,niveles,gramos",
  ];
  for (const unit of plan.units) {
    const build = builds[unit.id];
    const width = build?.dimensions.width ?? unit.settings.width;
    const depth = build?.dimensions.depth ?? unit.settings.depth;
    const height = build?.dimensions.height ?? estimatedUnitHeight(unit);
    rows.push(
      [
        csvCell(unit.name),
        csvCell(systemLabel(unit.system)),
        unit.cellX,
        unit.cellZ,
        unit.rotation,
        unit.hidden ? "no" : "si",
        width.toFixed(0),
        depth.toFixed(0),
        height.toFixed(0),
        unit.settings.levels,
        (build?.material_grams || 0).toFixed(0),
      ].join(","),
    );
  }
  return `${rows.join("\n")}\n`;
}
