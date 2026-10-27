import type { AppSettings, CatalogItem, LevelConfig, SystemCard } from "../types";

export const SYSTEM_CARDS: SystemCard[] = [
  {
    id: "keychain",
    label: "Llaveros",
    description: "Tres bandejas con contenedores extraíbles.",
    icon: "KeyRound",
    accent: "#d9694f",
    defaults: { width: 170, depth: 160, levels: 3, levelSpacing: 50, shelfDepth: 140, lipHeight: 16, trayTilt: 10, backPanel: "none", hooks: 0 },
  },
  {
    id: "stickers",
    label: "Pegatinas y tarjetas",
    description: "Bandejas inclinadas y vacías para producto plano.",
    icon: "Sticker",
    accent: "#c58a3d",
    defaults: { width: 180, depth: 140, levels: 3, levelSpacing: 60, shelfDepth: 110, lipHeight: 12, trayTilt: 15, backPanel: "none", hooks: 0 },
  },
  {
    id: "jewelry",
    label: "Joyería",
    description: "Insertos de anillos, pendientes y collares.",
    icon: "Gem",
    accent: "#a56cad",
    defaults: { width: 170, depth: 150, levels: 3, levelSpacing: 50, shelfDepth: 120, lipHeight: 14, trayTilt: 8, backPanel: "none", hooks: 0 },
  },
  {
    id: "coasters",
    label: "Posavasos",
    description: "Bandejas con raíles para posavasos.",
    icon: "CircleDot",
    accent: "#4f8f83",
    defaults: { width: 180, depth: 150, levels: 3, levelSpacing: 55, shelfDepth: 125, lipHeight: 12, trayTilt: 6, backPanel: "none", hooks: 0 },
  },
  {
    id: "bookmarks",
    label: "Marcapáginas",
    description: "Tres bandejas con cuatro divisores.",
    icon: "BookMarked",
    accent: "#5f7fa8",
    defaults: { width: 170, depth: 150, levels: 3, levelSpacing: 48, shelfDepth: 120, lipHeight: 12, trayTilt: 12, backPanel: "none", hooks: 0 },
  },
  {
    id: "pens",
    label: "Bolígrafos",
    description: "Tres bandejas con inserto de seis bolígrafos.",
    icon: "PenTool",
    accent: "#b3644f",
    defaults: { width: 180, depth: 150, levels: 3, levelSpacing: 55, shelfDepth: 120, lipHeight: 14, trayTilt: 0, backPanel: "none", hooks: 0 },
  },
  {
    id: "mixed",
    label: "Sistema mixto",
    description: "Contenedores, divisores y bandejas inclinadas.",
    icon: "LayoutGrid",
    accent: "#6c7f88",
    defaults: { width: 180, depth: 150, levels: 3, levelSpacing: 52, shelfDepth: 120, lipHeight: 12, trayTilt: 10, backPanel: "none", hooks: 0 },
  },
];

export const CATALOG_GROUPS: { id: string; label: string; description: string }[] = [
  { id: "estructura", label: "Estructura", description: "Pies y uniones del flat-pack." },
  { id: "accesorios", label: "Accesorios", description: "Ganchos, cartel y contenedores." },
  { id: "transporte", label: "Transporte", description: "Caja cerrada y asa." },
];

export const CATALOG: CatalogItem[] = [
  { key: "feet", label: "Pies", description: "Apoyos de la base.", group: "estructura", kind: "bool", icon: "Footprints" },
  { key: "sign", label: "Cartel", description: "Placa con hueco para etiqueta de papel.", group: "accesorios", kind: "bool", icon: "Signpost" },
  { key: "containerLids", label: "Tapas de contenedor", description: "Tapan los contenedores individuales.", group: "accesorios", kind: "bool", icon: "Package" },
  { key: "hooks", label: "Ganchos", description: "Ganchos SKÅDIS si activas panel.", group: "accesorios", kind: "count", defaultCount: 3, min: 0, max: 20, icon: "Anchor" },
  { key: "transport", label: "Caja de transporte", description: "Caja cerrada para el flat-pack.", group: "transporte", kind: "bool", icon: "Luggage" },
  { key: "transportHandle", label: "Asa", description: "Asa de la caja.", group: "transporte", kind: "bool", icon: "Hand" },
];

export const INSERT_OPTIONS = [
  { value: "none", label: "Compartimentos" },
  { value: "bin1", label: "1 compartimento" },
  { value: "bin2", label: "2 compartimentos" },
  { value: "bin3", label: "3 compartimentos" },
  { value: "bookmark4", label: "Marcapáginas 4" },
  { value: "pen6", label: "Bolígrafos 6" },
  { value: "rings", label: "Conos de anillos" },
  { value: "earringCards", label: "Tarjetas de pendientes" },
  { value: "bracelet", label: "Pulseras" },
  { value: "necklace", label: "Collares" },
  { value: "honeycomb", label: "Panel de miel" },
  { value: "coasterRail", label: "Raíl de posavasos" },
  { value: "cardRail", label: "Raíl de tarjetas" },
];

export const SHELF_TYPES = [
  { value: "flat", label: "Bandeja" },
  { value: "sloped", label: "Inclinada" },
  { value: "pegboard", label: "SKÅDIS" },
  { value: "rail", label: "Raíl" },
];

export const BACK_PANELS = [
  { value: "none", label: "Sin panel" },
  { value: "plain", label: "Liso" },
  { value: "skadis", label: "SKÅDIS" },
  { value: "honeycomb", label: "Panal" },
  { value: "branding", label: "Marca" },
];

export const PRINTERS = [
  { id: "a1mini", label: "Bambu A1 Mini", width: 180, depth: 180, height: 180 },
  { id: "generic220", label: "Genérica 220", width: 220, depth: 220, height: 220 },
  { id: "a1", label: "A1 / P1S / X1C", width: 256, depth: 256, height: 256 },
  { id: "h2d", label: "H2D / H2S", width: 350, depth: 320, height: 325 },
  { id: "custom", label: "Personalizada", width: 256, depth: 256, height: 256 },
];

export const MATERIALS = [
  { id: "pla", label: "PLA" },
  { id: "petg", label: "PETG" },
  { id: "asa", label: "ASA" },
];

export const LASER_MATERIALS = [
  { id: "plywood3", label: "Contrachapado 3 mm", thickness: 3, kerf: 0.15 },
  { id: "plywood4", label: "Contrachapado 4 mm", thickness: 4, kerf: 0.16 },
  { id: "plywood6", label: "Contrachapado 6 mm", thickness: 6, kerf: 0.18 },
  { id: "mdf3", label: "MDF 3 mm", thickness: 3, kerf: 0.18 },
  { id: "mdf4", label: "MDF 4 mm", thickness: 4, kerf: 0.2 },
  { id: "acrylic3", label: "Acrílico 3 mm", thickness: 3, kerf: 0.2 },
];

export const SHEETS = [
  { id: "a4", label: "A4", width: 297, height: 210 },
  { id: "a3", label: "A3", width: 420, height: 297 },
  { id: "laser600", label: "600 × 400", width: 600, height: 400 },
  { id: "laser900", label: "900 × 600", width: 900, height: 600 },
  { id: "custom", label: "Personalizada", width: 600, height: 400 },
];

export const DEFAULT_COLORS: Record<string, string> = {
  base: "#5d6b73",
  frame: "#efe9df",
  shelf: "#f1b8c2",
  panel: "#f3efe6",
  hook: "#e9897e",
  bin: "#c7d8c9",
  price: "#e8c98e",
  transport: "#8fa9b3",
  accessory: "#c9a7c7",
  corner: "#e9897e",
};

export function makeLevels(count: number, spacing: number, depth: number, taper: number, lip: number): LevelConfig[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `level-${index + 1}`,
    name: `Nivel ${index + 1}`,
    enabled: true,
    type: "flat",
    height: spacing * (index + 1),
    gap: spacing,
    depth: Math.round(depth * Math.pow(taper, index) * 10) / 10,
    angle: 0,
    lip: true,
    lipHeight: lip,
    insert: "none",
    style: "dividers",
    containers: 2,
    color: "shelf",
  }));
}

export const DEFAULT_SETTINGS: AppSettings = {
  mode: "3d",
  system: "keychain",
  width: 170,
  depth: 160,
  levels: 3,
  levelSpacing: 50,
  shelfDepth: 140,
  shelfTaper: 1,
  addBase: true,
  addRear: true,
  addFront: true,
  addLocks: true,
  baseHeight: 3,
  baseRadius: 5,
  sideThickness: 4,
  postDepth: 30,
  panelThickness: 3,
  shelfThickness: 2.4,
  lipHeight: 16,
  lipThickness: 2.4,
  dividerSpacing: 32,
  dividerThickness: 1.6,
  trayRadius: 3,
  trayTilt: 10,
  frontLipRatio: 0.72,
  pinDiameter: 4.2,
  lidHeight: 38,
  backPanel: "none",
  backHeight: 0,
  panelSplit: 1,
  panelRows: 2,
  panelMargin: 8,
  foldMode: "zfold",
  foldAngle: 60,
  transport: true,
  transportLid: true,
  transportHandle: true,
  stackable: true,
  ballast: false,
  strapSlots: false,
  feet: true,
  cornerBrackets: false,
  cornerInset: 22,
  cornerLeg: 34,
  cornerRadius: 7,
  cornerScrew: 3.2,
  cornerType: "l",
  panelJoiners: true,
  shelfBrackets: false,
  railEnds: false,
  wallMounts: false,
  hooks: 0,
  hookType: "skadis",
  hookLength: 42,
  hookSpacing: 80,
  hookRows: 1,
  hookLocks: false,
  wirePitch: 40,
  wireDiameter: 3,
  bins: 0,
  binLids: false,
  priceTags: 0,
  letters: 0,
  letterText: "DISPLAYNIAN",
  sign: false,
  signText: "DISPLAYNIAN",
  testCoupons: true,
  autoSplit: true,
  containerLids: true,
  awning: false,
  accessoryTray: false,
  insert: "none",
  levelConfigs: makeLevels(3, 50, 140, 1, 34).map((level, index) => ({
    ...level,
    style: "containers",
    containers: index === 2 ? 1 : 2,
  })),
  disabledParts: [],
  partColors: {},
  partScales: {},
  printer: "a1",
  bedWidth: 256,
  bedDepth: 256,
  bedHeight: 256,
  nozzle: 0.4,
  layerHeight: 0.2,
  walls: 3,
  infill: 15,
  clearance: 0.3,
  joinery: "pin",
  material: "pla",
  laserMaterial: "plywood3",
  laserThickness: 3,
  kerf: 0.15,
  sheet: "laser600",
  sheetWidth: 600,
  sheetHeight: 400,
  fingerWidth: 7,
  fingerClearance: 0.12,
  dogbone: 3,
  livingHinge: false,
  hingeRows: 5,
  hingeSlot: 18,
  hingeBridge: 2.4,
  hingeRowSpacing: 3,
  laserFold: "flatpack",
  includePrintedKit: false,
  colors: { ...DEFAULT_COLORS },
};

const SYSTEM_LEVELS: Record<string, { style: string; containers: number; insert: string }[]> = {
  keychain: [{ style: "containers", containers: 2, insert: "none" }, { style: "containers", containers: 2, insert: "none" }, { style: "containers", containers: 1, insert: "none" }],
  stickers: [{ style: "empty", containers: 1, insert: "none" }, { style: "empty", containers: 1, insert: "none" }, { style: "empty", containers: 1, insert: "none" }],
  jewelry: [{ style: "dividers", containers: 1, insert: "rings" }, { style: "dividers", containers: 1, insert: "earringCards" }, { style: "dividers", containers: 1, insert: "necklace" }],
  coasters: [{ style: "dividers", containers: 1, insert: "coasterRail" }, { style: "dividers", containers: 1, insert: "coasterRail" }, { style: "dividers", containers: 1, insert: "coasterRail" }],
  bookmarks: [{ style: "dividers", containers: 1, insert: "bookmark4" }, { style: "dividers", containers: 1, insert: "bookmark4" }, { style: "dividers", containers: 1, insert: "bookmark4" }],
  pens: [{ style: "dividers", containers: 1, insert: "pen6" }, { style: "dividers", containers: 1, insert: "pen6" }, { style: "dividers", containers: 1, insert: "pen6" }],
  mixed: [{ style: "containers", containers: 2, insert: "none" }, { style: "dividers", containers: 1, insert: "cardRail" }, { style: "containers", containers: 1, insert: "none" }],
};

export function applySystem(settings: AppSettings, system: string): AppSettings {
  const card = SYSTEM_CARDS.find((item) => item.id === system);
  if (!card) return settings;
  const count = Number(card.defaults.levels ?? settings.levels);
  const baseLevels = makeLevels(
    count,
    Number(card.defaults.levelSpacing ?? settings.levelSpacing),
    Number(card.defaults.shelfDepth ?? settings.shelfDepth),
    settings.shelfTaper,
    Number(card.defaults.lipHeight ?? settings.lipHeight),
  );
  const variants = SYSTEM_LEVELS[system] || [];
  const levelConfigs = baseLevels.map((level, index) => ({ ...level, ...(variants[index] || {}) }));
  return {
    ...settings,
    ...card.defaults,
    system,
    levelConfigs,
    insert: "none",
  };
}

export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const source = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  const levels = Math.max(1, Math.min(6, Math.round(Number(source.levels) || 4)));
  const levelConfigs = Array.isArray(source.levelConfigs) && source.levelConfigs.length
    ? source.levelConfigs.slice(0, levels).map((level, index) => ({
        ...DEFAULT_SETTINGS.levelConfigs[0],
        ...level,
        id: level.id || `level-${index + 1}`,
        name: level.name || `Nivel ${index + 1}`,
      }))
    : makeLevels(levels, Number(source.levelSpacing) || 50, Number(source.shelfDepth) || 140, Number(source.shelfTaper) || 1, Number(source.lipHeight) || 34);
  while (levelConfigs.length < levels) {
    levelConfigs.push({ ...makeLevels(levels, Number(source.levelSpacing) || 50, Number(source.shelfDepth) || 140, Number(source.shelfTaper) || 1, Number(source.lipHeight) || 34)[levelConfigs.length] });
  }
  return {
    ...source,
    levels,
    levelConfigs,
    disabledParts: Array.isArray(source.disabledParts) ? source.disabledParts : [],
    partColors: source.partColors || {},
    partScales: source.partScales || {},
    colors: { ...DEFAULT_COLORS, ...(source.colors || {}) },
  };
}
