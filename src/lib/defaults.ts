import type { AppSettings, CatalogItem, LevelConfig, SystemCard } from "../types";

export const SYSTEM_CARDS: SystemCard[] = [
  {
    id: "keychain",
    label: "Llaveros",
    description: "Bandejas finas con compartimentos, enlaces y panel SKÅDIS.",
    icon: "KeyRound",
    accent: "#d9694f",
    defaults: { width: 220, depth: 190, levels: 4, levelSpacing: 58, shelfDepth: 160, lipHeight: 38, backPanel: "skadis", hooks: 3 },
  },
  {
    id: "stickers",
    label: "Pegatinas y tarjetas",
    description: "Bandejas amplias y poco profundas para producto plano.",
    icon: "Sticker",
    accent: "#c58a3d",
    defaults: { width: 220, depth: 190, levels: 4, levelSpacing: 58, shelfDepth: 166, lipHeight: 34, backPanel: "plain", hooks: 0 },
  },
  {
    id: "jewelry",
    label: "Joyería",
    description: "Insertos de anillos, pendientes, pulseras y collares.",
    icon: "Gem",
    accent: "#a56cad",
    defaults: { width: 220, depth: 190, levels: 4, levelSpacing: 58, shelfDepth: 160, lipHeight: 38, backPanel: "honeycomb", hooks: 3 },
  },
  {
    id: "coasters",
    label: "Posavasos",
    description: "Bandejas con raíles y topes para posavasos.",
    icon: "CircleDot",
    accent: "#4f8f83",
    defaults: { width: 220, depth: 190, levels: 3, levelSpacing: 62, shelfDepth: 166, lipHeight: 32, backPanel: "plain", hooks: 0 },
  },
  {
    id: "bookmarks",
    label: "Marcapáginas",
    description: "Bandejas con divisores de cuatro compartimentos.",
    icon: "BookMarked",
    accent: "#5f7fa8",
    defaults: { width: 220, depth: 190, levels: 4, levelSpacing: 56, shelfDepth: 158, lipHeight: 34, backPanel: "plain", hooks: 2 },
  },
  {
    id: "pens",
    label: "Bolígrafos",
    description: "Bandejas con inserto de seis bolígrafos.",
    icon: "PenTool",
    accent: "#b3644f",
    defaults: { width: 220, depth: 190, levels: 3, levelSpacing: 62, shelfDepth: 160, lipHeight: 42, backPanel: "skadis", hooks: 3 },
  },
  {
    id: "mixed",
    label: "Sistema mixto",
    description: "Combina bandejas, insertos, panel y ganchos.",
    icon: "LayoutGrid",
    accent: "#6c7f88",
    defaults: { width: 220, depth: 190, levels: 4, levelSpacing: 58, shelfDepth: 160, lipHeight: 38, backPanel: "skadis", hooks: 3 },
  },
];

export const CATALOG_GROUPS: { id: string; label: string; description: string }[] = [
  { id: "estructura", label: "Estructura", description: "Base, enlaces, panel y uniones." },
  { id: "accesorios", label: "Accesorios", description: "Ganchos, insertos y detalles." },
  { id: "transporte", label: "Transporte", description: "Tapa, asa y plegado." },
];

export const CATALOG: CatalogItem[] = [
  { key: "addBase", label: "Base", description: "Placa fina con patas.", group: "estructura", kind: "bool", icon: "Square" },
  { key: "addRear", label: "Panel trasero", description: "Panel SKÅDIS, liso o panal.", group: "estructura", kind: "bool", icon: "PanelRight" },
  { key: "addFront", label: "Enlaces de plegado", description: "Cuatro enlaces por nivel con pasadores.", group: "estructura", kind: "bool", icon: "Link2" },
  { key: "panelJoiners", label: "Uniones de panel", description: "Refuerzan paneles partidos.", group: "estructura", kind: "bool", icon: "Link" },
  { key: "feet", label: "Pies", description: "Apoyos de la base.", group: "estructura", kind: "bool", icon: "Footprints" },
  { key: "sign", label: "Cartel", description: "Placa con hueco para una etiqueta de papel.", group: "accesorios", kind: "bool", icon: "Signpost" },
  { key: "hooks", label: "Ganchos", description: "Ganchos SKÅDIS o de rejilla.", group: "accesorios", kind: "count", defaultCount: 3, min: 0, max: 20, icon: "Anchor" },
  { key: "transport", label: "Plegado", description: "Activa la vista y la tapa de transporte.", group: "transporte", kind: "bool", icon: "FoldHorizontal" },
  { key: "transportLid", label: "Tapa", description: "Cubre la pila plegada.", group: "transporte", kind: "bool", icon: "Luggage" },
  { key: "transportHandle", label: "Asa", description: "Hueco de asa en la tapa.", group: "transporte", kind: "bool", icon: "Hand" },
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
    depth: Math.round(depth * Math.pow(taper, index) * 10) / 10,
    angle: 0,
    lip: true,
    lipHeight: lip,
    insert: "none",
    color: "shelf",
  }));
}

export const DEFAULT_SETTINGS: AppSettings = {
  mode: "3d",
  system: "keychain",
  width: 220,
  depth: 190,
  levels: 4,
  levelSpacing: 58,
  shelfDepth: 160,
  shelfTaper: 1,
  addBase: true,
  addRear: true,
  addFront: true,
  addLocks: true,
  baseHeight: 4,
  baseRadius: 6,
  sideThickness: 4,
  postDepth: 30,
  panelThickness: 3,
  shelfThickness: 2.4,
  lipHeight: 38,
  lipThickness: 2.4,
  dividerSpacing: 38,
  dividerThickness: 1.8,
  trayRadius: 3,
  frontLipRatio: 0.72,
  pinDiameter: 4.2,
  lidHeight: 42,
  backPanel: "skadis",
  backHeight: 0,
  panelSplit: 1,
  panelRows: 2,
  panelMargin: 8,
  foldMode: "zfold",
  foldAngle: 68,
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
  hooks: 3,
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
  awning: false,
  accessoryTray: false,
  insert: "none",
  levelConfigs: makeLevels(4, 58, 160, 1, 38),
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

export function applySystem(settings: AppSettings, system: string): AppSettings {
  const card = SYSTEM_CARDS.find((item) => item.id === system);
  if (!card) return settings;
  const next: AppSettings = {
    ...settings,
    ...card.defaults,
    system,
    levelConfigs: makeLevels(
      Number(card.defaults.levels ?? settings.levels),
      Number(card.defaults.levelSpacing ?? settings.levelSpacing),
      Number(card.defaults.shelfDepth ?? settings.shelfDepth),
      settings.shelfTaper,
      Number(card.defaults.lipHeight ?? settings.lipHeight),
    ),
    insert: "none",
  };
  return next;
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
    : makeLevels(levels, Number(source.levelSpacing) || 58, Number(source.shelfDepth) || 160, Number(source.shelfTaper) || 1, Number(source.lipHeight) || 38);
  while (levelConfigs.length < levels) {
    levelConfigs.push({ ...makeLevels(levels, Number(source.levelSpacing) || 58, Number(source.shelfDepth) || 160, Number(source.shelfTaper) || 1, Number(source.lipHeight) || 38)[levelConfigs.length] });
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
