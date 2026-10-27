import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { BuildPart, BuildResult, ViewMode } from "../types";

export interface Viewport3DHandle {
  fit: () => void;
  view: (kind: "iso" | "front" | "side" | "top" | "folded") => void;
  screenshot: () => string | null;
}

interface Props {
  build: BuildResult | null;
  viewMode: ViewMode;
  foldProgress: number;
  explodeAmount: number;
  showBed: boolean;
  showGrid: boolean;
  showEdges: boolean;
  wireframe: boolean;
  xray: boolean;
  autoRotate: boolean;
  bedWidth?: number;
  bedDepth?: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

interface PartObject {
  part: BuildPart;
  holder: THREE.Group;
  open: THREE.Matrix4;
  folded: THREE.Matrix4;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments | null;
}

function matrixFromArray(values: number[]): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  if (values.length === 16) matrix.set(...(values as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]));
  return matrix;
}

function lerpMatrix(open: THREE.Matrix4, folded: THREE.Matrix4, t: number, offset: THREE.Vector3): THREE.Matrix4 {
  const aPos = new THREE.Vector3();
  const bPos = new THREE.Vector3();
  const aQuat = new THREE.Quaternion();
  const bQuat = new THREE.Quaternion();
  const aScale = new THREE.Vector3();
  const bScale = new THREE.Vector3();
  open.decompose(aPos, aQuat, aScale);
  folded.decompose(bPos, bQuat, bScale);
  const position = aPos.clone().lerp(bPos, t).add(offset);
  const quat = aQuat.clone().slerp(bQuat, t);
  const scale = aScale.clone().lerp(bScale, t);
  return new THREE.Matrix4().compose(position, quat, scale);
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material?.dispose();
    }
  });
}

export const Viewport3D = forwardRef<Viewport3DHandle, Props>(function Viewport3D(
  {
    build,
    viewMode,
    foldProgress,
    explodeAmount,
    showBed,
    showGrid,
    showEdges,
    wireframe,
    xray,
    autoRotate,
    bedWidth = 256,
    bedDepth = 256,
    selectedId,
    onSelect,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const bedRef = useRef<THREE.Group | null>(null);
  const partsRef = useRef<PartObject[]>([]);
  const selectedRef = useRef<string | null>(null);
  const fitRef = useRef<() => void>(() => undefined);
  const rafRef = useRef(0);
  const buildRef = useRef<BuildResult | null>(build);
  const selectRef = useRef(onSelect);
  const autoRotateRef = useRef(autoRotate);

  useEffect(() => {
    buildRef.current = build;
  }, [build]);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8e2d6");
    scene.fog = new THREE.Fog("#e8e2d6", 900, 2400);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 6000);
    camera.position.set(380, 320, 460);
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
    controls.target.set(0, 120, 0);
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.minDistance = 40;
    controls.maxDistance = 2600;
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xfff7e9, 0x737b7c, 1.45);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(420, 620, 360);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -520;
    key.shadow.camera.right = 520;
    key.shadow.camera.top = 520;
    key.shadow.camera.bottom = -520;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 2000;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcde3e1, 0.9);
    fill.position.set(-360, 220, -280);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000),
      new THREE.MeshStandardMaterial({ color: 0xefe9de, roughness: 0.96, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.35;
    floor.receiveShadow = true;
    scene.add(floor);

    const group = new THREE.Group();
    group.rotation.x = -Math.PI / 2;
    scene.add(group);
    modelRef.current = group;

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
    const onPointerDown = (event: PointerEvent) => {
      if (!selectRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(group.children, true);
      const hit = hits.find((item) => item.object.userData.partId);
      selectRef.current(hit ? String(hit.object.userData.partId) : null);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.autoRotate = autoRotateRef.current;
      controls.autoRotateSpeed = 1.2;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const fit = () => {
      const settings = buildRef.current?.settings;
      const width = settings?.width ?? 220;
      const depth = settings?.depth ?? 220;
      const height = settings?.backHeight || (settings ? settings.baseHeight + settings.backHeight : 260);
      const extent = Math.max(width, depth, height, 120);
      controls.target.set(width / 2, height * 0.46, -depth * 0.5);
      const distance = extent * 1.75;
      camera.position.set(width / 2 + distance * 0.72, height * 0.82 + extent * 0.32, -depth / 2 + distance * 0.82);
      controls.update();
    };
    fitRef.current = fit;
    fit();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      disposeObject(group);
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const oldBed = bedRef.current;
    if (oldBed) {
      scene.remove(oldBed);
      disposeObject(oldBed);
      bedRef.current = null;
    }
    if (!showBed) return;
    const group = new THREE.Group();
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(bedWidth, 2.4, bedDepth),
      new THREE.MeshStandardMaterial({ color: 0x3d474b, roughness: 0.78, metalness: 0.08 }),
    );
    plate.position.y = -1.2;
    plate.receiveShadow = true;
    group.add(plate);
    if (showGrid) {
      const points: number[] = [];
      const step = 10;
      for (let x = -bedWidth / 2; x <= bedWidth / 2 + 0.01; x += step) points.push(x, 0.02, -bedDepth / 2, x, 0.02, bedDepth / 2);
      for (let z = -bedDepth / 2; z <= bedDepth / 2 + 0.01; z += step) points.push(-bedWidth / 2, 0.02, z, bedWidth / 2, 0.02, z);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x9fb0ae, transparent: true, opacity: 0.35 })));
    }
    group.position.set(bedWidth / 2, 0, -bedDepth / 2);
    scene.add(group);
    bedRef.current = group;
  }, [showBed, showGrid, bedWidth, bedDepth]);

  useEffect(() => {
    const scene = sceneRef.current;
    const old = modelRef.current;
    if (!scene || !old) return;
    for (const child of [...old.children]) {
      old.remove(child);
      disposeObject(child);
    }
    partsRef.current = [];
    if (!build) return;
    const loader = new STLLoader();
    for (const part of build.parts) {
      try {
        const binary = atob(part.stl_b64 || "");
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        const geometry = loader.parse(bytes.buffer);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(part.color),
          roughness: 0.62,
          metalness: 0.03,
          transparent: xray,
          opacity: xray ? 0.28 : 1,
          wireframe,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.partId = part.id;
        const holder = new THREE.Group();
        holder.matrixAutoUpdate = false;
        holder.add(mesh);
        let edges: THREE.LineSegments | null = null;
        if (showEdges) {
          edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry, 32),
            new THREE.LineBasicMaterial({ color: 0x3d4f54, transparent: true, opacity: 0.32 }),
          );
          edges.userData.partId = part.id;
          holder.add(edges);
        }
        old.add(holder);
        partsRef.current.push({
          part,
          holder,
          open: matrixFromArray(part.open_matrix),
          folded: matrixFromArray(part.fold_matrix),
          mesh,
          edges,
        });
      } catch (error) {
        console.error("No se pudo cargar la pieza", part.name, error);
      }
    }
    fitRef.current();
  }, [build, showEdges, wireframe, xray]);

  useEffect(() => {
    const selected = selectedId || null;
    selectedRef.current = selected;
    for (const object of partsRef.current) {
      const material = object.mesh.material as THREE.MeshStandardMaterial;
      const isSelected = object.part.id === selected;
      material.emissive = new THREE.Color(isSelected ? 0x7a3e2b : 0x000000);
      material.emissiveIntensity = isSelected ? 0.34 : 0;
      material.needsUpdate = true;
    }
  }, [selectedId]);

  useEffect(() => {
    for (const object of partsRef.current) {
      object.holder.visible = !object.part.transport_only || viewMode === "transport";
      const offset = new THREE.Vector3();
      if (viewMode === "exploded") {
        offset.set(object.part.explode[0], object.part.explode[1], object.part.explode[2]).multiplyScalar(explodeAmount);
      }
      const progress = viewMode === "open" || viewMode === "exploded" ? 0 : foldProgress;
      object.holder.matrix.copy(lerpMatrix(object.open, object.folded, progress, offset));
      object.holder.matrixWorldNeedsUpdate = true;
    }
  }, [viewMode, foldProgress, explodeAmount, build]);

  useImperativeHandle(ref, () => ({
    fit: () => fitRef.current(),
    view: (kind) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const settings = buildRef.current?.settings;
      if (!camera || !controls || !settings) return;
      const height = Math.max(settings.backHeight || 260, 160);
      const extent = Math.max(settings.width, settings.depth, height);
      const target = new THREE.Vector3(settings.width / 2, height * 0.46, -settings.depth * 0.5);
      const distance = extent * 1.8;
      if (kind === "front") camera.position.set(target.x, height * 0.52, target.z + distance);
      else if (kind === "side") camera.position.set(target.x + distance, height * 0.52, target.z);
      else if (kind === "top") camera.position.set(target.x + 0.01, distance * 1.2, target.z + 0.01);
      else if (kind === "folded") camera.position.set(target.x + distance * 0.7, height * 0.3, target.z + distance * 0.68);
      else camera.position.set(target.x + distance * 0.72, height * 0.82 + extent * 0.32, target.z + distance * 0.82);
      controls.target.copy(target);
      controls.update();
    },
    screenshot: () => {
      const renderer = rendererRef.current;
      return renderer ? renderer.domElement.toDataURL("image/png") : null;
    },
  }), [build]);

  return <div className="viewport-canvas" ref={containerRef} />;
});

export default Viewport3D;
