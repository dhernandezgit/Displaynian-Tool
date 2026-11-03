import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { BuildResult, StandPlan, StandUnit } from "../types";
import { buildUnitMerch, tagMerch } from "../lib/merch";
import { estimatedUnitHeight, standBuildSettings, systemAccent, systemLabel, unitCenter, unitFootprint } from "../lib/stand";

export interface StandViewportHandle {
  fit: () => void;
  view: (kind: "iso" | "front" | "side" | "top") => void;
  screenshot: () => string | null;
}

interface Props {
  plan: StandPlan;
  builds: Record<string, BuildResult>;
  onSelect: (id: string | null) => void;
  onMove: (id: string, cellX: number, cellZ: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

interface UnitObject {
  outer: THREE.Group;
  inner: THREE.Group;
  height: number;
}

interface LabelObject {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
}

interface DragState {
  pointerId: number;
  unitId: string;
  startX: number;
  startY: number;
  startCellX: number;
  startCellZ: number;
  dragging: boolean;
}

function matrixFromArray(values: number[]): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  if (values.length === 16) {
    matrix.set(...(values as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]));
  }
  return matrix;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.LineLoop) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach((item) => item.dispose());
      else child.material?.dispose();
    }
    if (child instanceof THREE.Sprite) {
      child.material?.map?.dispose();
      child.material?.dispose();
    }
  });
}

function frameFor(plan: StandPlan, builds: Record<string, BuildResult>, aspect: number, fov: number) {
  const standWidth = plan.cols * plan.grid;
  const standDepth = plan.rows * plan.grid;
  const visible = plan.units.filter((unit) => !unit.hidden);
  const heights = visible.map((unit) => builds[unit.id]?.dimensions.height || estimatedUnitHeight(unit));
  const maxHeight = Math.max(280, ...heights);
  let minX = 0;
  let maxX = standWidth;
  let minZ = 0;
  let maxZ = standDepth;
  if (visible.length) {
    let lowX = Number.POSITIVE_INFINITY;
    let highX = Number.NEGATIVE_INFINITY;
    let lowZ = Number.POSITIVE_INFINITY;
    let highZ = Number.NEGATIVE_INFINITY;
    for (const unit of visible) {
      const footprint = unitFootprint(unit);
      const center = unitCenter(plan, unit);
      lowX = Math.min(lowX, center.x - footprint.width / 2);
      highX = Math.max(highX, center.x + footprint.width / 2);
      lowZ = Math.min(lowZ, center.z - footprint.depth / 2);
      highZ = Math.max(highZ, center.z + footprint.depth / 2);
    }
    const margin = plan.grid * 0.7;
    minX = Math.max(0, lowX - margin);
    maxX = Math.min(standWidth, highX + margin);
    minZ = Math.max(0, lowZ - margin);
    maxZ = Math.min(standDepth, highZ + margin);
  }
  const width = Math.max(80, maxX - minX);
  const depth = Math.max(80, maxZ - minZ);
  const radius = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2 + (maxHeight * 0.55) ** 2);
  const vertical = THREE.MathUtils.degToRad(fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(0.2, aspect));
  const distance = Math.max(180, radius / Math.max(0.2, Math.sin(Math.min(vertical, horizontal) / 2)) * 1.12);
  const center = new THREE.Vector3((minX + maxX) / 2, maxHeight * 0.42, (minZ + maxZ) / 2);
  return { center, distance, maxHeight, standWidth, standDepth };
}

function makeLabel(name: string, subtitle: string, accent: string, selected: boolean): LabelObject {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 144;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255, 247, 242, 0.96)";
    context.strokeStyle = accent;
    context.lineWidth = selected ? 8 : 4;
    context.beginPath();
    context.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 26);
    context.fill();
    context.stroke();
    context.fillStyle = "#5e4a64";
    context.font = "700 38px ui-sans-serif, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(name.length > 22 ? `${name.slice(0, 21)}…` : name, canvas.width / 2, 58);
    context.fillStyle = "#8f7186";
    context.font = "500 28px ui-sans-serif, system-ui, sans-serif";
    context.fillText(subtitle, canvas.width / 2, 102);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(140, 39, 1);
  sprite.renderOrder = 30;
  return { sprite, texture, material };
}

export const StandViewport = forwardRef<StandViewportHandle, Props>(function StandViewport(
  { plan, builds, onSelect, onMove, onDragStart, onDragEnd },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const floorRootRef = useRef<THREE.Group | null>(null);
  const labelRootRef = useRef<THREE.Group | null>(null);
  const selectionRef = useRef<THREE.LineLoop | null>(null);
  const unitObjectsRef = useRef(new Map<string, UnitObject>());
  const loadedKeysRef = useRef(new Map<string, string>());
  const labelObjectsRef = useRef(new Map<string, LabelObject>());
  const rafRef = useRef(0);
  const planRef = useRef(plan);
  const buildsRef = useRef(builds);
  const callbacksRef = useRef({ onSelect, onMove, onDragStart, onDragEnd });
  const dragRef = useRef<DragState | null>(null);
  const backgroundRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const fitRef = useRef<() => void>(() => undefined);
  const selectionMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);

  planRef.current = plan;
  buildsRef.current = builds;
  callbacksRef.current = { onSelect, onMove, onDragStart, onDragEnd };

  const geometryKey = useMemo(() => [
    plan.merchLevel,
    plan.showMerch ? 1 : 0,
    plan.units.map((unit) => {
      const build = builds[unit.id];
      return `${unit.id}:${unit.system}:${build?.build_ms ?? "x"}:${build?.parts.length ?? 0}:${unit.settings.width}:${unit.settings.depth}:${unit.merch ? 1 : 0}`;
    }).join("|"),
  ].join("~"), [builds, plan.merchLevel, plan.showMerch, plan.units]);

  const labelKey = useMemo(() => [
    plan.showLabels,
    plan.units.map((unit) => {
      const build = builds[unit.id];
      return `${unit.id}:${unit.name}:${unit.system}:${unit.hidden ? 1 : 0}:${build?.dimensions.height ?? 0}:${unit.id === plan.selectedId ? 1 : 0}`;
    }).join("|"),
  ].join("~"), [builds, plan.selectedId, plan.showLabels, plan.units]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4e3ea");
    scene.fog = new THREE.Fog("#f4e3ea", 3200, 9000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20000);
    camera.position.set(900, 800, 1200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(600, 200, 600);
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = 0.08;
    controls.minDistance = 120;
    controls.maxDistance = 12000;
    controlsRef.current = controls;

    const hemisphere = new THREE.HemisphereLight(0xfff7e9, 0x7a7078, 1.4);
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(1200, 1800, 1400);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -1600;
    key.shadow.camera.right = 1600;
    key.shadow.camera.top = 1600;
    key.shadow.camera.bottom = -1600;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 6000;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcde3e1, 0.85);
    fill.position.set(-1400, 900, -1200);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(12000, 12000),
      new THREE.MeshStandardMaterial({ color: 0xf9ecf1, roughness: 0.97, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.6;
    ground.receiveShadow = true;
    scene.add(ground);

    const modelRoot = new THREE.Group();
    modelRoot.rotation.x = 0;
    scene.add(modelRoot);
    modelRootRef.current = modelRoot;

    const floorRoot = new THREE.Group();
    scene.add(floorRoot);
    floorRootRef.current = floorRoot;

    const labelRoot = new THREE.Group();
    scene.add(labelRoot);
    labelRootRef.current = labelRoot;

    const selectionGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
    ]);
    const selectionMaterial = new THREE.LineBasicMaterial({ color: 0xd94f6a, transparent: true, opacity: 0.9 });
    selectionMaterialRef.current = selectionMaterial;
    const selection = new THREE.LineLoop(selectionGeometry, selectionMaterial);
    selection.position.y = 0.3;
    selection.visible = false;
    scene.add(selection);
    selectionRef.current = selection;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const floorPoint = new THREE.Vector3();

    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const findUnit = (object: THREE.Object3D | null): StandUnit | null => {
      let current: THREE.Object3D | null = object;
      while (current) {
        const id = current.userData.unitId;
        if (id) {
          const unit = planRef.current.units.find((item) => item.id === id && !item.hidden);
          if (unit) return unit;
        }
        current = current.parent;
      }
      return null;
    };

    const pickUnit = (event: PointerEvent): StandUnit | null => {
      setPointer(event);
      const roots = Array.from(unitObjectsRef.current.values())
        .filter((object) => object.outer.visible)
        .map((object) => object.outer);
      const labels = labelRootRef.current?.children.filter((child) => child.visible) || [];
      const hits = raycaster.intersectObjects([...roots, ...labels], true);
      for (const hit of hits) {
        const unit = findUnit(hit.object);
        if (unit) return unit;
      }
      return null;
    };

    const cellFromPointer = (event: PointerEvent): { cellX: number; cellZ: number } | null => {
      setPointer(event);
      if (!raycaster.ray.intersectPlane(plane, floorPoint)) return null;
      const current = planRef.current;
      const cellX = Math.floor(floorPoint.x / current.grid);
      const cellZ = Math.floor(floorPoint.z / current.grid);
      if (cellX < 0 || cellZ < 0 || cellX >= current.cols || cellZ >= current.rows) return null;
      return { cellX, cellZ };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const unit = pickUnit(event);
      if (unit) {
        backgroundRef.current = null;
        dragRef.current = {
          pointerId: event.pointerId,
          unitId: unit.id,
          startX: event.clientX,
          startY: event.clientY,
          startCellX: unit.cellX,
          startCellZ: unit.cellZ,
          dragging: false,
        };
        callbacksRef.current.onSelect(unit.id);
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        renderer.domElement.style.cursor = "grabbing";
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      backgroundRef.current = { x: event.clientX, y: event.clientY, moved: false };
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (!drag.dragging && distance > 4) {
          drag.dragging = true;
          callbacksRef.current.onDragStart();
        }
        if (drag.dragging) {
          const cell = cellFromPointer(event);
          if (cell && (cell.cellX !== drag.startCellX || cell.cellZ !== drag.startCellZ)) {
            drag.startCellX = cell.cellX;
            drag.startCellZ = cell.cellZ;
            callbacksRef.current.onMove(drag.unitId, cell.cellX, cell.cellZ);
          }
          event.preventDefault();
        }
        return;
      }
      if (backgroundRef.current) {
        if (Math.hypot(event.clientX - backgroundRef.current.x, event.clientY - backgroundRef.current.y) > 5) {
          backgroundRef.current.moved = true;
        }
        return;
      }
      const unit = pickUnit(event);
      renderer.domElement.style.cursor = unit ? "grab" : "default";
    };

    const finishDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        if (drag.dragging) callbacksRef.current.onDragEnd();
        dragRef.current = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = "default";
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
        return;
      }
      const background = backgroundRef.current;
      if (background) {
        backgroundRef.current = null;
        if (!background.moved) callbacksRef.current.onSelect(null);
      }
    };

    const onPointerUp = (event: PointerEvent) => finishDrag(event);
    const onPointerCancel = (event: PointerEvent) => finishDrag(event);
    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const fit = () => {
      const frame = frameFor(planRef.current, buildsRef.current, camera.aspect, camera.fov);
      const direction = new THREE.Vector3(0.45, 0.55, 1.0).normalize();
      camera.position.copy(frame.center).addScaledVector(direction, frame.distance);
      controls.target.copy(frame.center);
      controls.update();
    };
    fitRef.current = fit;
    fit();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      disposeObject(modelRoot);
      disposeObject(floorRoot);
      disposeObject(labelRoot);
      selection.geometry.dispose();
      selectionMaterial.dispose();
      controls.dispose();
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const root = floorRootRef.current;
    const scene = sceneRef.current;
    if (!root || !scene) return;
    disposeObject(root);
    root.clear();
    const standWidth = plan.cols * plan.grid;
    const standDepth = plan.rows * plan.grid;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(standWidth, 2, standDepth),
      new THREE.MeshStandardMaterial({ color: 0xf1ddc6, roughness: 0.94, metalness: 0 }),
    );
    slab.position.set(standWidth / 2, -1, standDepth / 2);
    slab.receiveShadow = true;
    root.add(slab);
    if (plan.showGrid) {
      const major: number[] = [];
      const minor: number[] = [];
      const step = plan.grid / 3;
      for (let x = 0; x <= standWidth + 0.01; x += step) {
        const target = Math.abs(x / plan.grid - Math.round(x / plan.grid)) < 0.001 ? major : minor;
        target.push(x, 0.08, 0, x, 0.08, standDepth);
      }
      for (let z = 0; z <= standDepth + 0.01; z += step) {
        const target = Math.abs(z / plan.grid - Math.round(z / plan.grid)) < 0.001 ? major : minor;
        target.push(0, 0.08, z, standWidth, 0.08, z);
      }
      if (minor.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(minor, 3));
        root.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xc8a88e, transparent: true, opacity: 0.32 })));
      }
      if (major.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(major, 3));
        root.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xa97e63, transparent: true, opacity: 0.55 })));
      }
    }
  }, [plan.cols, plan.grid, plan.rows, plan.showGrid]);

  useEffect(() => {
    const root = modelRootRef.current;
    if (!root) return;
    const loader = new STLLoader();
    const unitKey = (unit: StandUnit, build: BuildResult | undefined) => (
      `${unit.system}:${build?.build_ms ?? "x"}:${build?.parts.length ?? 0}:${unit.settings.width}:${unit.settings.depth}:${unit.merch ? 1 : 0}:${plan.showMerch ? 1 : 0}:${plan.merchLevel}`
    );
    const currentIds = new Set(plan.units.map((unit) => unit.id));
    for (const id of Array.from(unitObjectsRef.current.keys())) {
      const unit = plan.units.find((item) => item.id === id);
      const object = unitObjectsRef.current.get(id);
      if (!unit || !object || !currentIds.has(id) || loadedKeysRef.current.get(id) !== unitKey(unit, builds[id])) {
        if (object) {
          root.remove(object.outer);
          disposeObject(object.outer);
        }
        unitObjectsRef.current.delete(id);
        loadedKeysRef.current.delete(id);
      }
    }
    for (const unit of plan.units) {
      const build = builds[unit.id];
      const key = unitKey(unit, build);
      if (unitObjectsRef.current.has(unit.id) && loadedKeysRef.current.get(unit.id) === key) continue;
      const settings = build?.settings || standBuildSettings(unit.settings);
      const outer = new THREE.Group();
      outer.userData.unitId = unit.id;
      const inner = new THREE.Group();
      inner.rotation.x = -Math.PI / 2;
      inner.position.set(-settings.width / 2, 0, settings.depth / 2);
      outer.add(inner);
      let height = estimatedUnitHeight(unit);
      if (build) {
        height = build.dimensions.height;
        for (const part of build.parts) {
          if (part.transport_only) continue;
          try {
            const binary = atob(part.stl_b64 || "");
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            const geometry = loader.parse(bytes.buffer);
            geometry.computeVertexNormals();
            const mesh = new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: new THREE.Color(part.color),
                roughness: 0.62,
                metalness: 0.03,
                side: THREE.DoubleSide,
              }),
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.unitId = unit.id;
            const holder = new THREE.Group();
            holder.matrixAutoUpdate = false;
            holder.matrix.copy(matrixFromArray(part.open_matrix));
            holder.add(mesh);
            inner.add(holder);
          } catch (error) {
            console.error("No se pudo cargar la pieza", part.name, error);
          }
        }
      } else {
        const height3d = estimatedUnitHeight(unit);
        const ghost = new THREE.Mesh(
          new THREE.BoxGeometry(settings.width, settings.depth, height3d),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(systemAccent(unit.system)),
            transparent: true,
            opacity: 0.16,
            roughness: 0.8,
            side: THREE.DoubleSide,
          }),
        );
        ghost.position.set(settings.width / 2, settings.depth / 2, height3d / 2);
        ghost.userData.unitId = unit.id;
        inner.add(ghost);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(settings.width, settings.depth, height3d)),
          new THREE.LineBasicMaterial({ color: systemAccent(unit.system), transparent: true, opacity: 0.6 }),
        );
        edges.position.copy(ghost.position);
        inner.add(edges);
      }
      if (plan.showMerch && unit.merch && plan.merchLevel > 0) {
        const merch = buildUnitMerch(settings, unit.system, plan.merchLevel);
        tagMerch(merch, unit.id);
        inner.add(merch);
      }
      const center = unitCenter(plan, unit);
      outer.position.set(center.x, 0, center.z);
      outer.rotation.y = THREE.MathUtils.degToRad(unit.rotation);
      outer.visible = !unit.hidden;
      outer.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.userData.unitId) child.userData.unitId = unit.id;
      });
      root.add(outer);
      unitObjectsRef.current.set(unit.id, { outer, inner, height });
      loadedKeysRef.current.set(unit.id, key);
    }
  }, [builds, geometryKey]);

  useEffect(() => {
    for (const [id, object] of unitObjectsRef.current) {
      const unit = plan.units.find((item) => item.id === id);
      if (!unit) continue;
      const center = unitCenter(plan, unit);
      object.outer.position.set(center.x, 0, center.z);
      object.outer.rotation.y = THREE.MathUtils.degToRad(unit.rotation);
      object.outer.visible = !unit.hidden;
    }
    const selection = selectionRef.current;
    const material = selectionMaterialRef.current;
    const selected = plan.units.find((unit) => unit.id === plan.selectedId);
    if (selection && material) {
      if (selected && !selected.hidden) {
        const rect = unitFootprint(selected);
        const center = unitCenter(plan, selected);
        selection.position.set(center.x, 0.3, center.z);
        selection.scale.set(rect.width + 18, 1, rect.depth + 18);
        selection.visible = true;
        material.color.set(systemAccent(selected.system));
      } else {
        selection.visible = false;
      }
    }
    for (const [id, label] of labelObjectsRef.current) {
      const unit = plan.units.find((item) => item.id === id);
      if (!unit || !plan.showLabels || unit.hidden) {
        label.sprite.visible = false;
        continue;
      }
      const center = unitCenter(plan, unit);
      const object = unitObjectsRef.current.get(id);
      const height = object?.height || estimatedUnitHeight(unit);
      label.sprite.visible = true;
      label.sprite.position.set(center.x, height + 28, center.z);
    }
  }, [plan]);

  useEffect(() => {
    const root = labelRootRef.current;
    if (!root) return;
    disposeObject(root);
    root.clear();
    labelObjectsRef.current.clear();
    if (!plan.showLabels) return;
    for (const unit of plan.units) {
      if (unit.hidden) continue;
      const label = makeLabel(unit.name, systemLabel(unit.system), systemAccent(unit.system), unit.id === plan.selectedId);
      const center = unitCenter(plan, unit);
      const object = unitObjectsRef.current.get(unit.id);
      const height = object?.height || builds[unit.id]?.dimensions.height || estimatedUnitHeight(unit);
      label.sprite.position.set(center.x, height + 28, center.z);
      label.sprite.userData.unitId = unit.id;
      root.add(label.sprite);
      labelObjectsRef.current.set(unit.id, label);
    }
  }, [builds, labelKey]);

  useEffect(() => {
    fitRef.current();
  }, [plan.cols, plan.grid, plan.rows, plan.units.length]);

  useImperativeHandle(ref, () => ({
    fit: () => fitRef.current(),
    view: (kind) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const frame = frameFor(planRef.current, buildsRef.current, camera.aspect, camera.fov);
      if (kind === "front") camera.position.set(frame.center.x, frame.center.y + frame.maxHeight * 0.25, frame.center.z + frame.distance);
      else if (kind === "side") camera.position.set(frame.center.x + frame.distance, frame.center.y + frame.maxHeight * 0.25, frame.center.z);
      else if (kind === "top") camera.position.set(frame.center.x + 0.01, frame.center.y + frame.distance * 1.2, frame.center.z + 0.01);
      else {
        const direction = new THREE.Vector3(0.45, 0.55, 1.0).normalize();
        camera.position.copy(frame.center).addScaledVector(direction, frame.distance);
      }
      controls.target.copy(frame.center);
      controls.update();
    },
    screenshot: () => {
      const renderer = rendererRef.current;
      return renderer ? renderer.domElement.toDataURL("image/png") : null;
    },
  }), []);

  return <div className="viewport-canvas stand-canvas" ref={containerRef} />;
});

export default StandViewport;
