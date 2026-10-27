import type { AppSettings, CatalogItem, LevelConfig, SystemCard } from "../types";

export const SYSTEM_CARDS: SystemCard[] = [
  {
    id: "keychain",
    label: "Llaveros",
    description: "Panel SKÅDIS, ganchos, bandejas y letras.",
    icon: "KeyRound",
    accent: "#d9694f",
    defaults: { width: 220, depth: 220, levels: 3, levelSpacing: 64, shelfDepth: 158, backPanel: "skadis", hooks: 8, bins: 2, priceTags: 4, letters: 0 },
  },
  {
    id: "stickers",
    label: "Pegatinas y tarjetas",
    description: "Niveles profundos para producto plano.",
    icon: "Sticker",
    accent: "#c58a3d",
    defaults: { width: 220, depth: 220, levels: 3, levelSpacing: 64, shelfDepth: 168, backPanel: "plain", hooks: 0, bins: 0, priceTags: 6 },
  },
  {
    id: "jewelry",
    label: "Joyería",
    description: "Conos, tarjetas, pulseras y collares.",
    icon: "Gem",
    accent: "#a56cad",
    defaults: { width: 220, depth: 220, levels: 3, levelSpacing: 70, shelfDepth: 165, backPanel: "honeycomb", hooks: 6, bins: 0, priceTags: 4 },
  },
  {
    id: "coasters",
    label: "Posavasos",
    description: "Raíles, topes y tapa de transporte.",
    icon: "CircleDot",
    accent: "#4f8f83",
    defaults: { width: 220, depth: 210, levels: 3, levelSpacing: 66, shelfDepth: 160, backPanel: "plain", hooks: 0, bins: 0, priceTags: 2 },
  },
  {
    id: "bookmarks",
    label: "Marcapáginas",
    description: "Cuatro compartimentos por nivel.",
    icon: "BookMarked",
    accent: "#5f7fa8",
    defaults: { width: 220, depth: 210, levels: 3, levelSpacing: 66, shelfDepth: 155, backPanel: "plain", hooks: 2, bins: 0, priceTags: 3 },
  },
  {
    id: "pens",
    label: "Bolígrafos",
    description: "Insertos de 6 bolígrafos y herramientas.",
    icon: "PenTool",
    accent: "#b3644f",
    defaults: { width: 220, depth: 210, levels: 3, levelSpacing: 70, shelfDepth: 160, backPanel: "skadis", hooks: 6, bins: 1, priceTags: 2 },
  },
  {
    id: "mixed",
    label: "Sistema mixto",
    description: "Combina niveles, ganchos e inserts.",
    icon: "LayoutGrid",
    accent: "#6c7f88",
    defaults: { width: 230, depth: 220, levels: 3, levelSpacing: 64, shelfDepth: 165, backPanel: "skadis", hooks: 8, bins: 2, priceTags: 4, letters: 4 },
  },
];

export const CATALOG_GROUPS: { id: string; label: string; description: string }[] = [
  { id: "estructura", label: "Estructura", description: "Base, marcos, bloqueos y esquinas." },
  { id: "panel", label: "Panel trasero", description: "SKÅDIS, panal, liso o marca." },
  { id: "niveles", label: "Niveles e inserts", description: "Bandejas, labios e insertos." },
  { id: "accesorios", label: "Accesorios", description: "Ganchos, bandejas, precios y letras." },
  { id: "transporte", label: "Transporte", description: "Tapa, asa, lastre y correas." },
];

export const CATALOG: CatalogItem[] = [
  { key: "addBase", label: "Base", description: "Placa inferior con ranuras y lastre.", group: "estructura", kind: "bool", icon: "Square" },
  { key: "addRear", label: "Marco trasero", description: "Postes y panel de fondo.", group: "estructura", kind: "bool", icon: "PanelRight" },
  { key: "addFront", label: "Marco delantero", description: "Patas y raíles de los niveles.", group: "estructura", kind: "bool", icon: "PanelLeft" },
  { key: "addLocks", label: "Bloqueos de raíl", description: "Fijan abierto y cerrado.", group: "estructura", kind: "bool", icon: "Lock" },
  { key: "cornerBrackets", label: "Esquinas", description: "Escuadras configurables para encajar paneles.", group: "estructura", kind: "bool", icon: "CornerDownRight" },
  { key: "panelJoiners", label: "Clips de unión", description: "Unen paneles partidos y refuerzan esquinas.", group: "estructura", kind: "bool", icon: "Link" },
  { key: "shelfBrackets", label: "Escuadras de bandeja", description: "Soportes triangulares bajo cada nivel.", group: "estructura", kind: "bool", icon: "Triangle" },
  { key: "railEnds", label: "Topes de raíl", description: "Evitan que las bandejas se deslicen.", group: "estructura", kind: "bool", icon: "CircleStop" },
  { key: "wallMounts", label: "Colgadores de pared", description: "Ojales para colgar el panel.", group: "estructura", kind: "bool", icon: "PictureInPicture" },
  { key: "hooks", label: "Ganchos", description: "SKÅDIS, rejilla o combinados.", group: "accesorios", kind: "count", defaultCount: 8, min: 0, max: 40, icon: "Anchor" },
  { key: "hookLocks", label: "Seguros de gancho", description: "Bloquean los ganchos en el panel.", group: "accesorios", kind: "bool", icon: "LockKeyhole" },
  { key: "bins", label: "Bandejas", description: "Organizadores con tapa opcional.", group: "accesorios", kind: "count", defaultCount: 2, min: 0, max: 10, icon: "Package" },
  { key: "priceTags", label: "Portaprecios", description: "Con hueco para papel de 50 × 18 mm.", group: "accesorios", kind: "count", defaultCount: 4, min: 0, max: 24, icon: "Tag" },
  { key: "binLids", label: "Tapas de bandeja", description: "Cierran los organizadores para transportar.", group: "accesorios", kind: "bool", icon: "Package" },
  { key: "letters", label: "Letras", description: "Set A–Z + Ä, Ö, Ü para clasificar.", group: "accesorios", kind: "count", defaultCount: 0, min: 0, max: 30, icon: "Type" },
  { key: "sign", label: "Cartel superior", description: "Placa con texto y soportes.", group: "accesorios", kind: "bool", icon: "Signpost" },
  { key: "awning", label: "Toldo", description: "Lamas inclinadas tipo mercado.", group: "accesorios", kind: "bool", icon: "Store" },
  { key: "transport", label: "Plegado", description: "Activa la mecánica de plegado.", group: "transporte", kind: "bool", icon: "FoldHorizontal" },
  { key: "transportLid", label: "Tapa de transporte", description: "Cubre el display plegado.", group: "transporte", kind: "bool", icon: "Luggage" },
  { key: "stackable", label: "Apilable", description: "Varios displays plegados en torre.", group: "transporte", kind: "bool", icon: "Layers" },
  { key: "transportHandle", label: "Asa", description: "Asa impresa para llevar.", group: "transporte", kind: "bool", icon: "Hand" },
  { key: "ballast", label: "Hueco de lastre", description: "Arena, arandelas o metal.", group: "transporte", kind: "bool", icon: "Weight" },
  { key: "strapSlots", label: "Ranuras de correa", description: "Correas de velcro de 20 mm.", group: "transporte", kind: "bool", icon: "Cable" },
  { key: "feet", label: "Patas", description: "Apoyos antideslizantes.", group: "transporte", kind: "bool", icon: "Footprints" },
];

export const INSERT_OPTIONS = [
  { value: "none", label: "Sin inserto" },
  { value: "bookmark4", label: "Marcapáginas 4" },
  { value: "pen6", label: "Bolígrafos 6" },
  { value: "rings", label: "Conos de anillos" },
  { value: "earringCards", label: "Tarjetas de pendientes" },
  { value: "bracelet", label: "Pulseras" },
  { value: "necklace", label: "Collares" },
  { value: "honeycomb", label: "Panel de miel" },
  { value: "coasterRail", label: "Raíl de posavasos" },
  { value: "cardRail", label: "Raíl de tarjetas" },
  { value: "bin1", label: "Bandeja 1" },
  { value: "bin2", label: "Bandeja 2" },
  { value: "bin3", label: "Bandeja 3" },
];

export const SHELF_TYPES = [
  { value: "flat", label: "Plana" },
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
  frame: "#e9e4da",
  shelf: "#f3efe7",
  panel: "#d7e0e6",
  hook: "#e4a15d",
  bin: "#c7d8c9",
  price: "#f4d8a8",
  transport: "#7f8f98",
  accessory: "#c9a7c7",
  corner: "#b7c4cc",
};

export function makeLevels(count: number, spacing: number, baseDepth: number, taper: number, lip: number): LevelConfig[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `level-${index + 1}`,
    name: `Nivel ${index + 1}`,
    enabled: true,
    type: "flat",
    height: spacing * (index + 1),
    depth: Math.round(baseDepth * Math.pow(taper, index) * 10) / 10,
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
  depth: 220,
  levels: 3,
  levelSpacing: 64,
  shelfDepth: 158,
  shelfTaper: 0.9,
  addBase: true,
  addRear: true,
  addFront: true,
  addLocks: true,
  baseHeight: 8,
  baseRadius: 8,
  sideThickness: 10,
  postDepth: 26,
  panelThickness: 6,
  shelfThickness: 6,
  lipHeight: 12,
  lipThickness: 3,
  backPanel: "skadis",
  backHeight: 0,
  panelSplit: 1,
  panelMargin: 18,
  foldMode: "zfold",
  foldAngle: 82,
  transport: true,
  transportLid: true,
  transportHandle: true,
  stackable: true,
  ballast: true,
  strapSlots: true,
  feet: true,
  cornerBrackets: true,
  cornerInset: 22,
  cornerLeg: 34,
  cornerRadius: 7,
  cornerScrew: 3.2,
  panelJoiners: true,
  shelfBrackets: true,
  railEnds: true,
  wallMounts: false,
  hooks: 8,
  hookType: "skadis",
  hookLength: 42,
  hookSpacing: 80,
  hookRows: 2,
  hookLocks: true,
  wirePitch: 40,
  wireDiameter: 3,
  bins: 2,
  binLids: true,
  priceTags: 4,
  letters: 0,
  letterText: "DISPLAYNIAN",
  sign: true,
  awning: false,
  accessoryTray: true,
  insert: "none",
  levelConfigs: makeLevels(3, 64, 158, 0.9, 12),
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
  infill: 18,
  clearance: 0.28,
  joinery: "hybrid",
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
      settings.lipHeight,
    ),
    insert: "none",
  };
  return next;
}

export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const source = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  const levels = Math.max(1, Math.min(6, Math.round(Number(source.levels) || 3)));
  const levelConfigs = Array.isArray(source.levelConfigs) && source.levelConfigs.length
    ? source.levelConfigs.slice(0, levels).map((level, index) => ({
        ...DEFAULT_SETTINGS.levelConfigs[0],
        ...level,
        id: level.id || `level-${index + 1}`,
        name: level.name || `Nivel ${index + 1}`,
      }))
    : makeLevels(levels, Number(source.levelSpacing) || 64, Number(source.shelfDepth) || 158, Number(source.shelfTaper) || 0.9, Number(source.lipHeight) || 12);
  while (levelConfigs.length < levels) {
    levelConfigs.push({
      ...makeLevels(levels, Number(source.levelSpacing) || 64, Number(source.shelfDepth) || 158, Number(source.shelfTaper) || 0.9, Number(source.lipHeight) || 12)[levelConfigs.length],
    });
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
