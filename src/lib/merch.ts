import * as THREE from "three";
import type { AppSettings, LevelConfig } from "../types";

const PALETTE = [
  "#e9897e",
  "#f2b8c6",
  "#9c6bd6",
  "#7fb7a8",
  "#e7c26c",
  "#8fa9b3",
  "#d9694f",
  "#c9a7c7",
  "#f3efe6",
  "#b7a4e8",
];

export interface ShelfLayout {
  index: number;
  level: LevelConfig;
  x: number;
  y: number;
  width: number;
  depth: number;
  z: number;
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFor(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function material(color: string, roughness = 0.68): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });
}

function addMesh(group: THREE.Group, geometry: THREE.BufferGeometry, color: string) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function box(group: THREE.Group, width: number, depth: number, height: number, color: string, x = 0, y = 0, z = 0) {
  const mesh = addMesh(group, new THREE.BoxGeometry(width, depth, height), color);
  mesh.position.set(x, y, z);
  return mesh;
}

function keychain(rng: () => number, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const width = 14 + rng() * 8;
  const height = 18 + rng() * 10;
  box(group, width, 1.8, height, color, 0, 0, height / 2);
  box(group, width * 0.62, 0.5, height * 0.5, accent, 0, -1.15, height * 0.52);
  const ring = addMesh(group, new THREE.TorusGeometry(2.6, 0.65, 6, 16), "#9aa4a8");
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0, height + 1.4);
  return group;
}

function cardStack(rng: () => number, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const count = 3 + Math.floor(rng() * 3);
  for (let index = 0; index < count; index += 1) {
    const mesh = box(group, 32 + rng() * 10, 24 + rng() * 8, 0.7, index === count - 1 ? accent : color, 0, 0, 0.35 + index * 0.82);
    mesh.rotation.z = (rng() - 0.5) * 0.18;
  }
  return group;
}

function cardStanding(rng: () => number, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const height = 18 + rng() * 10;
  box(group, 12 + rng() * 5, 0.6, height, color, 0, 0, height / 2);
  box(group, 6, 0.3, 6, accent, 0, -0.5, height * 0.58);
  const left = addMesh(group, new THREE.SphereGeometry(1.1, 8, 8), accent);
  left.position.set(-2.2, -0.6, height * 0.28);
  const right = addMesh(group, new THREE.SphereGeometry(1.1, 8, 8), accent);
  right.position.set(2.2, -0.6, height * 0.28);
  return group;
}

function coaster(flat: boolean, color: string): THREE.Group {
  const group = new THREE.Group();
  const mesh = addMesh(group, new THREE.CylinderGeometry(27, 27, 4, 24), color);
  if (flat) {
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = 2;
  } else {
    mesh.position.z = 27;
  }
  const ring = addMesh(group, new THREE.TorusGeometry(12, 0.7, 5, 20), "#ffffff");
  if (flat) ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0, flat ? 4.2 : 27);
  return group;
}

function bookmark(rng: () => number, color: string): THREE.Group {
  const group = new THREE.Group();
  const height = 42 + rng() * 16;
  const mesh = box(group, 10 + rng() * 4, 0.5, height, color, 0, 0, height / 2);
  mesh.rotation.z = (rng() - 0.5) * 0.1;
  box(group, 4, 0.3, 5, "#fff8ee", 0, -0.45, height * 0.78);
  return group;
}

function pen(rng: () => number, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const length = 88 + rng() * 24;
  const body = addMesh(group, new THREE.CylinderGeometry(2.3, 2.3, length, 10), color);
  body.rotation.x = Math.PI / 2;
  body.position.z = length / 2;
  const cap = addMesh(group, new THREE.CylinderGeometry(2.7, 2.7, 14, 10), accent);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = length - 7;
  const tip = addMesh(group, new THREE.ConeGeometry(1.2, 5, 8), "#6f777b");
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -1.5;
  return group;
}

function ring(rng: () => number, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const torus = addMesh(group, new THREE.TorusGeometry(4.5 + rng() * 2, 1.1, 6, 18), color);
  torus.rotation.x = Math.PI / 2;
  torus.position.z = 1.2;
  const gem = addMesh(group, new THREE.OctahedronGeometry(1.8 + rng(), 0), accent);
  gem.position.z = 2.1;
  return group;
}

function necklace(rng: () => number, color: string, accent: string): THREE.Group {
  const group = new THREE.Group();
  const chain = addMesh(group, new THREE.TorusGeometry(13 + rng() * 4, 0.55, 5, 28), "#b9a27c");
  chain.rotation.x = Math.PI / 2;
  chain.position.z = 14;
  const pendant = addMesh(group, new THREE.CircleGeometry(4.5, 16), color);
  pendant.position.set(0, -0.2, 1.5);
  const gem = addMesh(group, new THREE.OctahedronGeometry(2.4, 0), accent);
  gem.position.set(0, -0.6, 3.2);
  return group;
}

function smallItem(rng: () => number, color: string, accent: string): THREE.Group {
  const kind = Math.floor(rng() * 4);
  if (kind === 0) return keychain(rng, color, accent);
  if (kind === 1) return cardStanding(rng, color, accent);
  if (kind === 2) return ring(rng, color, accent);
  return bookmark(rng, color);
}

type ItemKind = "keychain" | "cards" | "jewelry" | "coasters" | "bookmarks" | "pens" | "mixed";

function itemKind(system: string, level: LevelConfig): ItemKind {
  if (level.insert === "pen6") return "pens";
  if (level.insert === "coasterRail") return "coasters";
  if (level.insert === "bookmark4") return "bookmarks";
  if (level.insert === "rings" || level.insert === "earringCards" || level.insert === "necklace" || level.insert === "bracelet") return "jewelry";
  if (level.insert === "cardRail") return "cards";
  if (system === "stickers") return "cards";
  if (system === "jewelry") return "jewelry";
  if (system === "coasters") return "coasters";
  if (system === "bookmarks") return "bookmarks";
  if (system === "pens") return "pens";
  if (system === "mixed") return "mixed";
  return "keychain";
}

function makeItem(kind: ItemKind, rng: () => number, color: string, accent: string): THREE.Group {
  if (kind === "cards") return cardStack(rng, color, accent);
  if (kind === "jewelry") {
    const roll = rng();
    if (roll < 0.38) return ring(rng, color, accent);
    if (roll < 0.7) return necklace(rng, color, accent);
    return cardStanding(rng, color, accent);
  }
  if (kind === "coasters") return coaster(true, color);
  if (kind === "bookmarks") return bookmark(rng, color);
  if (kind === "pens") return pen(rng, color, accent);
  if (kind === "mixed") return smallItem(rng, color, accent);
  return keychain(rng, color, accent);
}

export function shelfLayouts(settings: AppSettings): ShelfLayout[] {
  const levels = settings.levelConfigs.slice(0, settings.levels);
  const active = levels.filter((level) => level.enabled);
  const linkT = settings.sideThickness;
  const clearance = settings.clearance;
  const pitch = linkT + settings.pinDiameter + 4 + 2 * clearance;
  const trayX = pitch + linkT + clearance;
  const trayW = settings.width - 2 * trayX;
  const trayDepth = Math.max(40, Math.min(settings.shelfDepth, settings.depth - 18));
  let z = settings.baseHeight;
  const out: ShelfLayout[] = [];
  for (let index = 0; index < active.length; index += 1) {
    const level = active[index];
    if (index > 0) z += Math.max(24, level.gap || settings.levelSpacing);
    out.push({
      index,
      level,
      x: trayX,
      y: 6 - index * settings.cantileverStep,
      width: trayW,
      depth: trayDepth,
      z,
    });
  }
  return out;
}

function addContainerMerch(
  group: THREE.Group,
  settings: AppSettings,
  layout: ShelfLayout,
  merchLevel: number,
  seed: number,
) {
  const wall = settings.shelfThickness;
  const level = layout.level;
  const count = Math.max(1, Math.round(level.containers || 1));
  const inner = layout.width - 2 * wall - 6;
  const gap = 3;
  const width = (inner - (count - 1) * gap) / count;
  const depth = layout.depth * 0.78;
  const height = Math.max(10, Math.min(settings.lipHeight * 0.68, settings.lipHeight - 6));
  const cwall = Math.max(1.8, wall * 0.8);
  const base = layout.z + wall + (settings.containerLids ? height + 5 : cwall + 1);
  const rng = randomFor(seed);
  for (let index = 0; index < count; index += 1) {
    const cx = layout.x + wall + 3 + index * (width + gap) + width / 2;
    const cy = layout.y + (layout.depth - depth) / 2 + depth / 2;
    const pieces = merchLevel >= 2 ? 2 : 1;
    for (let piece = 0; piece < pieces; piece += 1) {
      const item = smallItem(rng, PALETTE[Math.floor(rng() * PALETTE.length)], PALETTE[Math.floor(rng() * PALETTE.length)]);
      const scale = Math.min(0.62, Math.max(0.4, width / 58));
      item.scale.setScalar(scale);
      item.position.set(
        cx + (piece - (pieces - 1) / 2) * Math.min(22, width * 0.35),
        cy,
        base,
      );
      item.rotation.z = (rng() - 0.5) * 0.5;
      group.add(item);
    }
  }
}

function addInsertMerch(
  group: THREE.Group,
  settings: AppSettings,
  layout: ShelfLayout,
  merchLevel: number,
  seed: number,
): boolean {
  const rng = randomFor(seed);
  const innerX = layout.x + settings.shelfThickness + 2;
  const innerY = layout.y + settings.shelfThickness + 2;
  const innerW = layout.width - 2 * settings.shelfThickness - 4;
  const innerD = layout.depth - 2 * settings.shelfThickness - 4;
  const base = layout.z + settings.shelfThickness;
  const accent = PALETTE[Math.floor(rng() * PALETTE.length)];
  if (layout.level.insert === "pen6") {
    for (let index = 0; index < 6; index += 1) {
      const item = pen(rng, PALETTE[(index + 2) % PALETTE.length], accent);
      item.position.set(innerX + (index + 0.5) * innerW / 6, innerY + innerD / 2, base);
      group.add(item);
    }
    return true;
  }
  if (layout.level.insert === "coasterRail") {
    for (let index = 0; index < 4; index += 1) {
      const item = coaster(false, PALETTE[(index + 4) % PALETTE.length]);
      item.position.set(innerX + (index + 0.5) * innerW / 4, innerY + innerD / 2, base);
      group.add(item);
    }
    return true;
  }
  if (layout.level.insert === "bookmark4") {
    for (let index = 0; index < 4; index += 1) {
      const item = bookmark(rng, PALETTE[(index + 1) % PALETTE.length]);
      item.position.set(innerX + (index + 0.5) * innerW / 4, innerY + innerD / 2, base);
      group.add(item);
    }
    return true;
  }
  if (layout.level.insert === "rings") {
    const count = Math.max(3, Math.floor(innerW / 48));
    for (let index = 0; index < count; index += 1) {
      const item = ring(rng, PALETTE[(index + 3) % PALETTE.length], accent);
      item.position.set(innerX + (index + 0.5) * innerW / count, innerY + innerD * 0.48, base + 2);
      group.add(item);
    }
    return true;
  }
  if (layout.level.insert === "earringCards") {
    const count = merchLevel >= 2 ? 4 : 2;
    for (let index = 0; index < count; index += 1) {
      const item = cardStanding(rng, PALETTE[(index + 5) % PALETTE.length], accent);
      item.position.set(innerX + (index + 0.5) * innerW / count, innerY + innerD * 0.55, base);
      group.add(item);
    }
    return true;
  }
  if (layout.level.insert === "necklace") {
    const count = merchLevel >= 2 ? 3 : 2;
    for (let index = 0; index < count; index += 1) {
      const item = necklace(rng, PALETTE[(index + 6) % PALETTE.length], accent);
      item.position.set(innerX + (index + 0.5) * innerW / count, innerY + innerD * 0.6, base);
      group.add(item);
    }
    return true;
  }
  return false;
}

export function buildUnitMerch(
  settings: AppSettings,
  system: string,
  merchLevel: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "merch";
  if (merchLevel <= 0) return group;
  const layouts = shelfLayouts(settings);
  layouts.forEach((layout, layoutIndex) => {
    const seed = hashSeed(`${system}-${layoutIndex}-${layout.level.insert}-${layout.level.style}`);
    if (layout.level.style === "containers") {
      addContainerMerch(group, settings, layout, merchLevel, seed);
      return;
    }
    if (addInsertMerch(group, settings, layout, merchLevel, seed)) return;
    const kind = itemKind(system, layout.level);
    const count = Math.min(
      kind === "coasters" ? 3 : kind === "pens" ? 4 : 8,
      merchLevel === 1 ? 3 : merchLevel === 2 ? 5 : 8,
    );
    const cols = count <= 2 ? 2 : count <= 4 ? 2 : count <= 6 ? 3 : 4;
    const rows = Math.max(1, Math.ceil(count / cols));
    const innerX = layout.x + settings.shelfThickness + 4;
    const innerY = layout.y + settings.shelfThickness + 3;
    const innerW = layout.width - 2 * settings.shelfThickness - 8;
    const innerD = layout.depth - 2 * settings.shelfThickness - 6;
    const base = layout.z + settings.shelfThickness;
    const rng = randomFor(seed);
    for (let index = 0; index < count; index += 1) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = innerX + (col + 0.5) * innerW / cols + (rng() - 0.5) * 8;
      const y = innerY + (row + 0.5) * innerD / rows + (rng() - 0.5) * 6;
      const color = PALETTE[Math.floor(rng() * PALETTE.length)];
      const accent = PALETTE[Math.floor(rng() * PALETTE.length)];
      const item = makeItem(kind, rng, color, accent);
      item.position.set(x, y, base);
      item.rotation.z = kind === "pens" ? 0 : (rng() - 0.5) * 0.5;
      group.add(item);
    }
  });
  return group;
}

export function tagMerch(group: THREE.Group, unitId: string) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.userData.unitId = unitId;
  });
}
