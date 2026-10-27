export type Mode = "3d" | "laser";
export type ViewMode = "open" | "fold" | "transport" | "exploded";

export interface LevelConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
  height: number;
  gap: number;
  depth: number;
  angle: number;
  lip: boolean;
  lipHeight: number;
  insert: string;
  style: string;
  containers: number;
  color: string;
}

export interface AppSettings {
  [key: string]: any;
  mode: Mode;
  system: string;
  width: number;
  depth: number;
  levels: number;
  levelSpacing: number;
  shelfDepth: number;
  shelfTaper: number;
  addBase: boolean;
  addRear: boolean;
  addFront: boolean;
  addLocks: boolean;
  baseHeight: number;
  baseRadius: number;
  sideThickness: number;
  postDepth: number;
  panelThickness: number;
  shelfThickness: number;
  lipHeight: number;
  lipThickness: number;
  dividerSpacing: number;
  dividerThickness: number;
  trayRadius: number;
  trayTilt: number;
  cantileverStep: number;
  cantileverClosedGap: number;
  frontLipRatio: number;
  pinDiameter: number;
  lidHeight: number;
  backPanel: string;
  backHeight: number;
  panelSplit: number;
  panelRows: number;
  panelMargin: number;
  foldMode: string;
  foldAngle: number;
  transport: boolean;
  transportLid: boolean;
  transportHandle: boolean;
  stackable: boolean;
  ballast: boolean;
  strapSlots: boolean;
  feet: boolean;
  cornerBrackets: boolean;
  cornerInset: number;
  cornerLeg: number;
  cornerRadius: number;
  cornerScrew: number;
  cornerType: string;
  panelJoiners: boolean;
  shelfBrackets: boolean;
  railEnds: boolean;
  wallMounts: boolean;
  hooks: number;
  hookType: string;
  hookLength: number;
  hookSpacing: number;
  hookRows: number;
  hookLocks: boolean;
  wirePitch: number;
  wireDiameter: number;
  bins: number;
  binLids: boolean;
  priceTags: number;
  letters: number;
  letterText: string;
  sign: boolean;
  signText: string;
  testCoupons: boolean;
  autoSplit: boolean;
  containerLids: boolean;
  awning: boolean;
  accessoryTray: boolean;
  insert: string;
  levelConfigs: LevelConfig[];
  disabledParts: string[];
  partColors: Record<string, string>;
  partScales: Record<string, number>;
  printer: string;
  bedWidth: number;
  bedDepth: number;
  bedHeight: number;
  nozzle: number;
  layerHeight: number;
  walls: number;
  infill: number;
  clearance: number;
  joinery: string;
  material: string;
  laserMaterial: string;
  laserThickness: number;
  kerf: number;
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  fingerWidth: number;
  fingerClearance: number;
  dogbone: number;
  livingHinge: boolean;
  hingeRows: number;
  hingeSlot: number;
  hingeBridge: number;
  hingeRowSpacing: number;
  laserFold: string;
  includePrintedKit: boolean;
  colors: Record<string, string>;
}

export interface FoldPoseTray {
  kind: "tray";
  gaps: number[];
  angles: number[];
  offset: number;
}

export interface FoldPoseLink {
  kind: "link";
  gaps_prev: number[];
  angles_prev: number[];
  angle: number;
  gap: number;
  pivot: [number, number, number];
  offset: number;
}

export type FoldPose = FoldPoseTray | FoldPoseLink;

export interface PartBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface BuildPart {
  id: string;
  name: string;
  group: string;
  category: string;
  color: string;
  stl_b64: string;
  bounds: PartBounds;
  dimensions: { width: number; depth: number; height: number };
  volume: number;
  triangles: number;
  open_matrix: number[];
  fold_matrix: number[];
  transport_only: boolean;
  fold_hide?: boolean;
  fold_pose?: FoldPose | null;
  explode: number[];
}

export interface PrintCheck {
  level: "ok" | "info" | "warn" | "error" | string;
  title: string;
  detail: string;
  code: string;
}

export interface BomItem {
  name: string;
  quantity: number;
  detail: string;
}

export interface LaserSheet {
  index: number;
  width: number;
  height: number;
  svg: string;
  dxf: string;
  parts: string[];
}

export interface LaserResult {
  sheets: LaserSheet[];
  part_count: number;
  overflow: string[];
  thickness: number;
  kerf: number;
  livingHinge: boolean;
  printedKit: boolean;
}

export interface BuildResult {
  ok: boolean;
  mode: Mode;
  version: string;
  settings: AppSettings;
  parts: BuildPart[];
  checks: PrintCheck[];
  bom: BomItem[];
  build_ms: number;
  material_grams: number;
  dimensions: {
    width: number;
    depth: number;
    height: number;
    foldedDepth: number;
    foldedHeight: number;
    levels: number;
  };
  laser?: LaserResult;
  error?: string;
}

export interface SystemCard {
  id: string;
  label: string;
  description: string;
  icon: string;
  accent: string;
  defaults: Partial<AppSettings>;
}

export interface CatalogItem {
  key: string;
  label: string;
  description: string;
  group: string;
  kind: "bool" | "count";
  defaultCount?: number;
  min?: number;
  max?: number;
  icon: string;
}
