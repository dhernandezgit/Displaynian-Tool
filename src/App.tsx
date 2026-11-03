import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Expand,
  Eye,
  FoldHorizontal,
  Grid3X3,
  HelpCircle,
  Layers,
  LayoutGrid,
  Luggage,
  Maximize2,
  Moon,
  PanelLeft,
  Plus,
  Printer,
  Redo2,
  Rotate3D,
  RotateCw,
  Save,
  Scissors,
  Search,
  Sun,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { usePythonEngine } from "./hooks/usePythonEngine";
import { useStandBuilds } from "./hooks/useStandBuilds";
import type { AppSettings, BuildResult, LaserSheet, LevelConfig, StandPlan, StandTemplate, StandUnit, ViewMode, Workspace } from "./types";
import {
  APP_VERSION,
  applySystemPreserving,
  DEFAULT_SETTINGS,
  normalizeSettings,
  patchSettings,
  SYSTEM_CARDS,
} from "./lib/defaults";
import {
  addStandUnit,
  applyStandTemplate,
  deleteStandUnit,
  duplicateStandUnit,
  makeStandPlan,
  moveStandUnit,
  normalizeStandPlan,
  rotateStandPlan,
  rotateStandUnit,
  selectedStandUnit,
  standBuildSettings,
  standChecks,
  standCsv,
  standSummary,
  systemAccent,
  systemLabel,
} from "./lib/stand";
import { downloadBase64, downloadText } from "./lib/download";
import DesignPanel from "./components/DesignPanel";
import CatalogPanel from "./components/CatalogPanel";
import ManufacturingPanel from "./components/ManufacturingPanel";
import PartInspector from "./components/PartInspector";
import StandPanel from "./components/StandPanel";
import StandInspector from "./components/StandInspector";
import { StandViewport, type StandViewportHandle } from "./components/StandViewport";
import { Viewport3D, type Viewport3DHandle } from "./components/Viewport3D";
import SheetPreview from "./components/SheetPreview";
import ExportDialog, { type ExportKind } from "./components/ExportDialog";
import ChecksDialog from "./components/ChecksDialog";
import HelpDialog from "./components/HelpDialog";
import StatusBar from "./components/StatusBar";
import Logo from "./components/Logo";

const SETTINGS_KEY = "displaynian-settings-v6";
const STAND_KEY = "displaynian-stand-v1";
const WORKSPACE_KEY = "displaynian-workspace";
const THEME_KEY = "displaynian-theme";
const PROJECT_NAME_KEY = "displaynian-project-name";

function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (raw && typeof raw === "object") return normalizeSettings(raw);
  } catch { /* ignore */ }
  return normalizeSettings(DEFAULT_SETTINGS);
}

function loadStand(settings: AppSettings): StandPlan {
  try {
    const raw = JSON.parse(localStorage.getItem(STAND_KEY) || "null");
    if (raw && typeof raw === "object") return normalizeStandPlan(raw, settings);
  } catch { /* ignore */ }
  return makeStandPlan(settings);
}

function initialWorkspace(): Workspace {
  try {
    return localStorage.getItem(WORKSPACE_KEY) === "stand" ? "stand" : "display";
  } catch {
    return "display";
  }
}

function initialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  return "light";
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function App() {
  const engine = usePythonEngine();
  const { ready: engineReady, build: engineBuild, export3mf, exportStlZip, exportObj, exportLaserZip, exportStand3mf, exportStandObj } = engine;
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [stand, setStand] = useState<StandPlan>(() => loadStand(settings));
  const standBuilds = useStandBuilds(engineBuild, engineReady, stand.units, workspace === "stand");
  const standSelected = selectedStandUnit(stand);
  const [build, setBuild] = useState<BuildResult | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"stand" | "design" | "catalog" | "make">(workspace === "stand" ? "stand" : "design");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [foldProgress, setFoldProgress] = useState(0);
  const [explodeAmount, setExplodeAmount] = useState(80);
  const [showBed, setShowBed] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showEdges, setShowEdges] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [exportOpen, setExportOpen] = useState(false);
  const [checksOpen, setChecksOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [projectName, setProjectName] = useState(() => {
    try { return localStorage.getItem(PROJECT_NAME_KEY) || "mi-display"; } catch { return "mi-display"; }
  });
  const [search, setSearch] = useState("");
  const viewportRef = useRef<Viewport3DHandle>(null);
  const standViewportRef = useRef<StandViewportHandle>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const buildSeq = useRef(0);
  const settingsRef = useRef(settings);
  const standRef = useRef(stand);
  const standPast = useRef<StandPlan[]>([]);
  const standFuture = useRef<StandPlan[]>([]);
  const dragSnapshot = useRef<StandPlan | null>(null);
  const [, bumpHistory] = useState(0);
  const toastTimer = useRef(0);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { standRef.current = stand; }, [stand]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(STAND_KEY, JSON.stringify(stand)); } catch { /* ignore */ }
  }, [stand]);

  useEffect(() => {
    try { localStorage.setItem(WORKSPACE_KEY, workspace); } catch { /* ignore */ }
  }, [workspace]);

  useEffect(() => {
    try { localStorage.setItem(PROJECT_NAME_KEY, projectName); } catch { /* ignore */ }
  }, [projectName]);

  useEffect(() => {
    if (workspace !== "stand") return;
    const timer = window.setTimeout(() => standViewportRef.current?.fit(), 120);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (event: PointerEvent) => {
      if (addMenuRef.current?.contains(event.target as Node)) return;
      setAddMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [addMenuOpen]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3800);
  }, []);

  const runBuild = useCallback(async (next: AppSettings) => {
    if (!engineReady) return;
    const sequence = ++buildSeq.current;
    setBuilding(true);
    setBuildError("");
    try {
      const result = await engineBuild(next);
      if (sequence !== buildSeq.current) return;
      setBuild(result);
      setSelectedId((current) => (current && result.parts.some((part) => part.id === current) ? current : null));
    } catch (error) {
      if (sequence !== buildSeq.current) return;
      const message = String((error as { message?: string })?.message || error);
      setBuildError(message);
      notify(message);
    } finally {
      if (sequence === buildSeq.current) setBuilding(false);
    }
  }, [engineBuild, engineReady, notify]);

  useEffect(() => {
    if (!engineReady || workspace !== "display") return;
    const timer = window.setTimeout(() => runBuild(settingsRef.current), 280);
    return () => window.clearTimeout(timer);
  }, [engineReady, workspace, settings, runBuild]);

  useEffect(() => {
    if (!toast) return;
    return () => window.clearTimeout(toastTimer.current);
  }, [toast]);

  useEffect(() => {
    setFoldProgress(viewMode === "open" || viewMode === "exploded" ? 0 : 1);
  }, [viewMode]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => patchSettings(current, patch));
  }, []);

  const updateLevel = useCallback((index: number, patch: Partial<LevelConfig>) => {
    setSettings((current) => {
      const levelConfigs = current.levelConfigs.map((level, levelIndex) => (levelIndex === index ? { ...level, ...patch } : level));
      return { ...current, levelConfigs };
    });
  }, []);

  const chooseSystem = useCallback((system: string) => {
    setSettings((current) => applySystemPreserving(current, system));
    notify(`${SYSTEM_CARDS.find((card) => card.id === system)?.label || system} aplicado`);
  }, [notify]);

  const commitStand = useCallback((updater: StandPlan | ((current: StandPlan) => StandPlan)) => {
    setStand((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (next === current) return current;
      standPast.current.push(current);
      if (standPast.current.length > 80) standPast.current.shift();
      standFuture.current = [];
      return next;
    });
    bumpHistory((value) => value + 1);
  }, []);

  const patchStandPlan = useCallback((patch: Partial<StandPlan>) => {
    const record = "grid" in patch || "cols" in patch || "rows" in patch || "merchLevel" in patch;
    const applyPatch = (current: StandPlan) => {
      const cols = Math.max(1, Math.min(14, Math.round(Number(patch.cols ?? current.cols))));
      const rows = Math.max(1, Math.min(10, Math.round(Number(patch.rows ?? current.rows))));
      const grid = Math.max(150, Math.min(600, Number(patch.grid ?? current.grid)));
      const next: StandPlan = {
        ...current,
        ...patch,
        cols,
        rows,
        grid,
        units: current.units.map((unit) => ({
          ...unit,
          cellX: Math.max(0, Math.min(cols - 1, unit.cellX)),
          cellZ: Math.max(0, Math.min(rows - 1, unit.cellZ)),
        })),
      };
      return next;
    };
    if (record) commitStand(applyPatch);
    else setStand(applyPatch);
  }, [commitStand]);

  const selectStandUnit = useCallback((id: string | null) => {
    setStand((current) => (current.selectedId === id ? current : { ...current, selectedId: id }));
  }, []);

  const updateStandUnit = useCallback((id: string, patch: Partial<StandUnit>) => {
    setStand((current) => ({
      ...current,
      units: current.units.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)),
    }));
  }, []);

  const patchStandUnitSettings = useCallback((id: string, patch: Partial<AppSettings>) => {
    setStand((current) => ({
      ...current,
      units: current.units.map((unit) => (
        unit.id === id
          ? { ...unit, settings: patchSettings(unit.settings, patch), system: String(patch.system ?? unit.system) }
          : unit
      )),
    }));
  }, []);

  const patchStandUnitLevel = useCallback((id: string, index: number, patch: Partial<LevelConfig>) => {
    setStand((current) => ({
      ...current,
      units: current.units.map((unit) => {
        if (unit.id !== id) return unit;
        const levelConfigs = unit.settings.levelConfigs.map((level, levelIndex) => (
          levelIndex === index ? { ...level, ...patch } : level
        ));
        return { ...unit, settings: { ...unit.settings, levelConfigs } };
      }),
    }));
  }, []);

  const chooseStandSystem = useCallback((system: string) => {
    setStand((current) => {
      const unit = selectedStandUnit(current);
      if (!unit) return current;
      const settings = normalizeSettings({
        ...applySystemPreserving(unit.settings, system),
        mode: "3d",
        transport: false,
        transportLid: false,
        transportHandle: false,
      });
      return {
        ...current,
        units: current.units.map((item) => (item.id === unit.id ? { ...item, system, settings } : item)),
      };
    });
    notify(`${systemLabel(system)} aplicado al módulo`);
  }, [notify]);

  const activeUnit = workspace === "stand" ? standSelected : null;
  const editorSettings = activeUnit ? activeUnit.settings : settings;
  const patchEditorSettings = useCallback((patch: Partial<AppSettings>) => {
    if (workspace === "stand") {
      if (!standSelected) return;
      patchStandUnitSettings(standSelected.id, patch);
    } else {
      updateSettings(patch);
    }
  }, [patchStandUnitSettings, standSelected, updateSettings, workspace]);
  const chooseEditorSystem = useCallback((system: string) => {
    if (workspace === "stand") {
      if (!standSelected) {
        notify("Selecciona un módulo para cambiar su sistema");
        return;
      }
      chooseStandSystem(system);
    } else {
      chooseSystem(system);
    }
  }, [chooseStandSystem, chooseSystem, notify, standSelected, workspace]);
  const updateEditorLevel = useCallback((index: number, patch: Partial<LevelConfig>) => {
    if (workspace === "stand") {
      if (!standSelected) return;
      patchStandUnitLevel(standSelected.id, index, patch);
    } else {
      updateLevel(index, patch);
    }
  }, [patchStandUnitLevel, standSelected, updateLevel, workspace]);

  const addModule = useCallback((system: string) => {
    const base = standSelected?.settings || settingsRef.current;
    commitStand((current) => addStandUnit(current, base, system));
    setAddMenuOpen(false);
    notify(`${systemLabel(system)} añadido al stand`);
  }, [commitStand, notify, standSelected?.settings]);

  const duplicateModule = useCallback(() => {
    if (!standSelected) return;
    commitStand(duplicateStandUnit);
    notify("Módulo duplicado");
  }, [commitStand, notify, standSelected]);

  const rotateModule = useCallback(() => {
    if (!standSelected) return;
    commitStand(rotateStandUnit);
  }, [commitStand, standSelected]);

  const deleteModule = useCallback(() => {
    if (!standSelected) return;
    commitStand(deleteStandUnit);
    notify("Módulo eliminado");
  }, [commitStand, notify, standSelected]);

  const applyTemplate = useCallback((template: StandTemplate) => {
    const base = standSelected?.settings || settingsRef.current;
    commitStand((current) => applyStandTemplate(current, template, base));
    setTab("stand");
    setMobileSidebarOpen(false);
    window.setTimeout(() => standViewportRef.current?.fit(), 120);
    notify(`Plantilla «${template.label}» aplicada`);
  }, [commitStand, notify, standSelected?.settings]);

  const rotateWholeStand = useCallback(() => {
    commitStand(rotateStandPlan);
    window.setTimeout(() => standViewportRef.current?.fit(), 80);
  }, [commitStand]);

  const undoStand = useCallback(() => {
    const previous = standPast.current.pop();
    if (!previous) return;
    setStand((current) => {
      standFuture.current.push(current);
      return previous;
    });
    bumpHistory((value) => value + 1);
    window.setTimeout(() => standViewportRef.current?.fit(), 60);
  }, []);

  const redoStand = useCallback(() => {
    const next = standFuture.current.pop();
    if (!next) return;
    setStand((current) => {
      standPast.current.push(current);
      return next;
    });
    bumpHistory((value) => value + 1);
    window.setTimeout(() => standViewportRef.current?.fit(), 60);
  }, []);

  const handleStandDragStart = useCallback(() => {
    dragSnapshot.current = standRef.current;
  }, []);

  const handleStandMove = useCallback((id: string, cellX: number, cellZ: number) => {
    setStand((current) => moveStandUnit(current, id, cellX, cellZ));
  }, []);

  const handleStandDragEnd = useCallback(() => {
    const snapshot = dragSnapshot.current;
    dragSnapshot.current = null;
    if (!snapshot) return;
    setStand((current) => {
      const changed = current.units.some((unit, index) => {
        const before = snapshot.units[index];
        return !before || unit.id !== before.id || unit.cellX !== before.cellX || unit.cellZ !== before.cellZ;
      });
      if (!changed) return current;
      standPast.current.push(snapshot);
      if (standPast.current.length > 80) standPast.current.shift();
      standFuture.current = [];
      return current;
    });
    bumpHistory((value) => value + 1);
    window.setTimeout(() => standViewportRef.current?.fit(), 60);
  }, []);

  const canUndo = standPast.current.length > 0;
  const canRedo = standFuture.current.length > 0;
  const standCheckList = useMemo(() => standChecks(stand, standBuilds.builds), [stand, standBuilds.builds]);
  const standInfo = useMemo(() => standSummary(stand, standBuilds.builds), [stand, standBuilds.builds]);

  const switchWorkspace = useCallback((next: Workspace) => {
    setWorkspace(next);
    setTab(next === "stand" ? "stand" : "design");
    setAddMenuOpen(false);
    setMobileSidebarOpen(false);
    if (next === "stand") {
      setSelectedId(null);
      window.setTimeout(() => standViewportRef.current?.fit(), 120);
    }
  }, []);

  useEffect(() => {
    if (workspace !== "stand") return;
    const isEditable = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      if (command && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoStand();
        else undoStand();
        return;
      }
      if (command && key === "y") {
        event.preventDefault();
        redoStand();
        return;
      }
      if (command && key === "d") {
        event.preventDefault();
        duplicateModule();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteModule();
        return;
      }
      if (key === "r") {
        rotateModule();
        return;
      }
      if (key === "f") {
        standViewportRef.current?.fit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteModule, duplicateModule, redoStand, rotateModule, undoStand, workspace]);

  const exportProject = useCallback(() => {
    const payload = {
      app: "Displaynian",
      version: APP_VERSION,
      name: projectName,
      workspace,
      exportedAt: new Date().toISOString(),
      settings,
      stand,
    };
    downloadText(JSON.stringify(payload, null, 2), `${projectName || "displaynian"}.displaynian.json`, "application/json");
    notify("Proyecto guardado");
  }, [notify, projectName, settings, stand, workspace]);

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const raw = data?.settings || data;
      const next = normalizeSettings(raw);
      setSettings(next);
      if (data?.stand) setStand(normalizeStandPlan(data.stand, next));
      standPast.current = [];
      standFuture.current = [];
      bumpHistory((value) => value + 1);
      const nextWorkspace: Workspace = data?.workspace === "stand" ? "stand" : data?.workspace === "display" ? "display" : workspace;
      setWorkspace(nextWorkspace);
      setProjectName(String(data?.name || file.name.replace(/\.displaynian(\.json)?$/i, "") || "mi-display"));
      notify("Proyecto importado");
      setTab(nextWorkspace === "stand" ? "stand" : "design");
      window.setTimeout(() => standViewportRef.current?.fit(), 120);
    } catch (error) {
      notify(`No se pudo importar: ${String((error as Error).message || error)}`);
    }
  };

  const handleExport = async (kind: ExportKind) => {
    setExportBusy(true);
    try {
      if (kind === "project") {
        exportProject();
        setExportOpen(false);
        return;
      }
      if (kind === "mockup") {
        const image = workspace === "stand" ? standViewportRef.current?.screenshot() : viewportRef.current?.screenshot();
        if (image) downloadDataUrl(image, `${projectName || "displaynian"}-${workspace === "stand" ? "stand-" : ""}mockup.png`);
        notify("Mockup descargado");
        setExportOpen(false);
        return;
      }
      if (kind === "standcsv") {
        downloadText(standCsv(stand, standBuilds.builds), `${projectName || "displaynian"}-stand.csv`, "text/csv;charset=utf-8");
        notify("Plan del stand exportado");
        setExportOpen(false);
        return;
      }
      if (kind === "stand3mf" || kind === "standobj") {
        const payload = {
          grid: stand.grid,
          units: stand.units.map((unit) => ({
            id: unit.id,
            name: unit.name,
            settings: standBuildSettings(unit.settings),
            cellX: unit.cellX,
            cellZ: unit.cellZ,
            rotation: unit.rotation,
            hidden: unit.hidden,
          })),
        };
        const result = kind === "stand3mf" ? await exportStand3mf(payload) : await exportStandObj(payload);
        if (!result?.ok) throw new Error(result?.error || "No se pudo generar el stand");
        downloadBase64(
          result.data_b64,
          `${projectName || "displaynian"}-stand.${kind === "stand3mf" ? "3mf" : "obj"}`,
          kind === "stand3mf" ? "application/vnd.ms-3mfdocument" : "text/plain",
        );
        notify("Stand exportado");
        setExportOpen(false);
        return;
      }
      if (!build) throw new Error("La geometría todavía no está lista.");
      if (kind === "3mf") {
        const result = await export3mf(settings);
        if (!result?.ok) throw new Error(result?.error || "No se pudo generar el 3MF");
        downloadBase64(result.data_b64, `${projectName || "displaynian"}.3mf`, "application/vnd.ms-3mfdocument");
      } else if (kind === "stlzip") {
        const result = await exportStlZip(settings);
        if (!result?.ok) throw new Error(result?.error || "No se pudo generar el ZIP");
        downloadBase64(result.data_b64, `${projectName || "displaynian"}-stl.zip`, "application/zip");
      } else if (kind === "obj") {
        const result = await exportObj(settings);
        if (!result?.ok) throw new Error(result?.error || "No se pudo generar el OBJ");
        downloadBase64(result.data_b64, `${projectName || "displaynian"}.obj`, "text/plain");
      } else if (kind === "laserzip") {
        const result = await exportLaserZip(settings);
        if (!result?.ok) throw new Error(result?.error || "No se pudo generar el ZIP láser");
        downloadBase64(result.data_b64, `${projectName || "displaynian"}-laser.zip`, "application/zip");
      }
      notify("Exportación lista");
      setExportOpen(false);
    } catch (error) {
      notify(String((error as Error).message || error));
    } finally {
      setExportBusy(false);
    }
  };

  const downloadSheet = (sheet: LaserSheet, format: "svg" | "dxf") => {
    const content = format === "svg" ? sheet.svg : sheet.dxf;
    const type = format === "svg" ? "image/svg+xml;charset=utf-8" : "application/dxf";
    downloadText(content, `${projectName || "displaynian"}-hoja-${sheet.index}.${format}`, type);
  };

  const visibleChecks = useMemo(() => {
    if (workspace === "stand") {
      return {
        warnings: standCheckList.filter((check) => check.level === "warn").length,
        errors: 0,
        ok: standCheckList.filter((check) => check.level === "ok").length,
      };
    }
    if (!build) return { warnings: 0, errors: 0, ok: 0 };
    return {
      warnings: build.checks.filter((check) => check.level === "warn").length,
      errors: build.checks.filter((check) => check.level === "error").length,
      ok: build.checks.filter((check) => check.level === "ok").length,
    };
  }, [build, standCheckList, workspace]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const term = search.toLowerCase();
    if (workspace === "stand") {
      return stand.units.filter((unit) => `${unit.name} ${systemLabel(unit.system)}`.toLowerCase().includes(term));
    }
    return build?.parts.filter((part) => `${part.name} ${part.group} ${part.category}`.toLowerCase().includes(term)) || [];
  }, [build, search, stand.units, workspace]);

  const modeLabel = workspace === "stand" ? "Planificador de stand" : settings.mode === "3d" ? "Impresión 3D" : "Corte láser";
  const showSheets = workspace === "display" && settings.mode === "laser" && Boolean(build?.laser);
  const notifyCount = workspace === "stand" ? standCheckList.filter((check) => check.level === "warn").length : visibleChecks.warnings + visibleChecks.errors;

  return (
    <div className={`app-shell ${mobileSidebarOpen ? "sidebar-open" : ""}`}>
      <header className="topbar">
        <Logo />
        <button type="button" className="icon-button mobile-only" title="Panel" onClick={() => setMobileSidebarOpen((value) => !value)}>
          <PanelLeft size={17} />
        </button>
        <div className="workspace-switch" role="group" aria-label="Espacio de trabajo">
          <button type="button" className={workspace === "display" ? "is-active" : ""} onClick={() => switchWorkspace("display")}>
            <Box size={15} /> Expositor
          </button>
          <button type="button" className={workspace === "stand" ? "is-active" : ""} onClick={() => switchWorkspace("stand")}>
            <LayoutGrid size={15} /> Stand
          </button>
        </div>
        {workspace === "display" ? (
          <div className="mode-switch" role="group" aria-label="Modo de fabricación">
            <button
              type="button"
              className={settings.mode === "3d" ? "is-active" : ""}
              onClick={() => {
                updateSettings({ mode: "3d" });
              }}
            >
              <Printer size={15} /> 3D
            </button>
            <button
              type="button"
              className={settings.mode === "laser" ? "is-active" : ""}
              onClick={() => {
                updateSettings({ mode: "laser" });
                setTab("make");
                setViewMode("open");
              }}
            >
              <Scissors size={15} /> Láser
            </button>
          </div>
        ) : null}
        <label className="project-name">
          <span>Proyecto</span>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
        </label>
        <div className="top-actions">
          <button type="button" className="top-button" onClick={() => importRef.current?.click()}><Upload size={15} /> Importar</button>
          <button type="button" className="top-button" onClick={exportProject}><Save size={15} /> Guardar</button>
          <button type="button" className="primary-button" onClick={() => setExportOpen(true)}><Download size={15} /> Exportar</button>
          <button type="button" className="icon-button" onClick={() => setChecksOpen(true)} title="Comprobaciones">
            <span className="notify-dot" data-count={notifyCount}><CheckCircle2 size={17} /></span>
          </button>
          <button type="button" className="icon-button" onClick={() => setHelpOpen(true)} title="Ayuda"><HelpCircle size={17} /></button>
          <button type="button" className="icon-button" onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))} title="Tema">
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".json,.displaynian,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleImport(file);
            event.target.value = "";
          }}
        />
      </header>

      <div className="subbar">
        {workspace === "stand" ? (
          <>
            <span className="subbar-system"><LayoutGrid size={14} /> Stand</span>
            <span>{stand.units.length} módulos</span>
            <span>{standInfo.footprint}</span>
            <span>{standInfo.material >= 1000 ? `${(standInfo.material / 1000).toFixed(1)} kg` : `${standInfo.material.toFixed(0)} g`}</span>
            <span>{modeLabel}</span>
          </>
        ) : (
          <>
            <span className="subbar-system"><Layers size={14} /> {SYSTEM_CARDS.find((card) => card.id === settings.system)?.label || settings.system}</span>
            <span>{settings.levels} bandejas</span>
            <span>{settings.width.toFixed(0)} × {settings.depth.toFixed(0)} mm</span>
            <span>{modeLabel}</span>
          </>
        )}
        <span className="subbar-flex" />
        <div className="search-box">
          <Search size={14} />
          <input placeholder={workspace === "stand" ? "Buscar módulo…" : "Buscar pieza…"} value={search} onChange={(event) => setSearch(event.target.value)} />
          {search ? <button type="button" onClick={() => setSearch("")}><X size={13} /></button> : null}
        </div>
        <button type="button" className="mini-button" onClick={() => setChecksOpen(true)}>
          {visibleChecks.errors ? "Errores" : visibleChecks.warnings ? `${visibleChecks.warnings} aviso(s)` : workspace === "stand" ? "Stand OK" : "Preflight OK"}
        </button>
      </div>

      {search && filtered ? (
        <div className="search-results">
          {filtered.length ? (
            workspace === "stand" ? (
              (filtered as StandUnit[]).slice(0, 8).map((unit) => (
                <button key={unit.id} type="button" onClick={() => { selectStandUnit(unit.id); setTab("design"); setSearch(""); }}>
                  <span className="part-swatch" style={{ background: systemAccent(unit.system) }} /> {unit.name} <small>{systemLabel(unit.system)}</small>
                </button>
              ))
            ) : (
              (filtered as BuildResult["parts"]).slice(0, 8).map((part) => (
                <button key={part.id} type="button" onClick={() => { setSelectedId(part.id); setSearch(""); }}>
                  <span className="part-swatch" style={{ background: part.color }} /> {part.name} <small>{part.group}</small>
                </button>
              ))
            )
          ) : <span>Sin resultados</span>}
        </div>
      ) : null}

      <main className={`workspace ${workspace === "stand" ? "is-stand" : ""}`}>
        {mobileSidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label="Cerrar panel" onClick={() => setMobileSidebarOpen(false)} /> : null}
        <aside className="sidebar">
          <div className={`sidebar-tabs ${workspace === "stand" ? "has-stand" : ""}`}>
            {workspace === "stand" ? (
              <button type="button" className={tab === "stand" ? "is-active" : ""} onClick={() => { setTab("stand"); setMobileSidebarOpen(false); }}><LayoutGrid size={15} /> Stand</button>
            ) : null}
            <button type="button" className={tab === "design" ? "is-active" : ""} onClick={() => { setTab("design"); setMobileSidebarOpen(false); }}><PanelLeft size={15} /> Diseño</button>
            <button type="button" className={tab === "catalog" ? "is-active" : ""} onClick={() => { setTab("catalog"); setMobileSidebarOpen(false); }}><Box size={15} /> Catálogo</button>
            <button type="button" className={tab === "make" ? "is-active" : ""} onClick={() => { setTab("make"); setMobileSidebarOpen(false); }}><Printer size={15} /> Fabricar</button>
          </div>
          <div className="sidebar-scroll">
            {workspace === "stand" && tab === "stand" ? (
              <StandPanel
                plan={stand}
                builds={standBuilds.builds}
                selected={standSelected}
                canUndo={canUndo}
                canRedo={canRedo}
                onAdd={addModule}
                onSelect={selectStandUnit}
                onToggleHidden={(id) => {
                  const unit = stand.units.find((item) => item.id === id);
                  if (unit) updateStandUnit(id, { hidden: !unit.hidden });
                }}
                onDuplicate={duplicateModule}
                onRotate={rotateModule}
                onDelete={deleteModule}
                onApplyTemplate={applyTemplate}
                onRotateStand={rotateWholeStand}
                onFit={() => standViewportRef.current?.fit()}
                onUndo={undoStand}
                onRedo={redoStand}
                onPatchPlan={patchStandPlan}
                onEdit={() => setTab("design")}
              />
            ) : null}
            {tab === "design" ? (
              workspace === "stand" && !activeUnit ? (
                <div className="panel-empty">
                  <span><LayoutGrid size={26} /></span>
                  <h3>Selecciona un módulo</h3>
                  <p>Haz clic en un expositor del stand o añade uno nuevo para editar sus medidas, niveles y contenido.</p>
                  <button type="button" className="primary-button" onClick={() => setTab("stand")}>Ir a Stand</button>
                </div>
              ) : (
                <DesignPanel settings={editorSettings} onPatch={patchEditorSettings} onSystem={chooseEditorSystem} onLevel={updateEditorLevel} />
              )
            ) : null}
            {tab === "catalog" ? (
              workspace === "stand" && !activeUnit ? (
                <div className="panel-empty">
                  <span><Box size={26} /></span>
                  <h3>Sin módulo activo</h3>
                  <p>Selecciona un módulo para editar sus accesorios.</p>
                  <button type="button" className="primary-button" onClick={() => setTab("stand")}>Ir a Stand</button>
                </div>
              ) : (
                <CatalogPanel settings={editorSettings} onPatch={patchEditorSettings} />
              )
            ) : null}
            {tab === "make" ? (
              workspace === "stand" && !activeUnit ? (
                <div className="panel-empty">
                  <span><Printer size={26} /></span>
                  <h3>Sin módulo activo</h3>
                  <p>Selecciona un módulo para ajustar su impresión.</p>
                  <button type="button" className="primary-button" onClick={() => setTab("stand")}>Ir a Stand</button>
                </div>
              ) : (
                <ManufacturingPanel settings={editorSettings} onPatch={patchEditorSettings} />
              )
            ) : null}
          </div>
        </aside>

        <section className="stage">
          <div className="stage-toolbar">
            {workspace === "stand" ? (
              <>
                <div className="view-modes stand-actions">
                  <button type="button" className="is-accent" onClick={() => setAddMenuOpen((value) => !value)}><Plus size={15} /> Añadir</button>
                  <button type="button" onClick={undoStand} disabled={!canUndo} title="Deshacer"><Undo2 size={15} /></button>
                  <button type="button" onClick={redoStand} disabled={!canRedo} title="Rehacer"><Redo2 size={15} /></button>
                </div>
                <span className="toolbar-sep" />
                <button type="button" className="icon-button" title="Duplicar (Ctrl+D)" disabled={!standSelected} onClick={duplicateModule}><Copy size={16} /></button>
                <button type="button" className="icon-button" title="Girar 90° (R)" disabled={!standSelected} onClick={rotateModule}><RotateCw size={16} /></button>
                <button type="button" className="icon-button" title="Eliminar (Supr)" disabled={!standSelected} onClick={deleteModule}><Trash2 size={16} /></button>
                <span className="toolbar-sep" />
                <button type="button" className="icon-button" title="Centrar y encajar" onClick={() => standViewportRef.current?.fit()}><Maximize2 size={16} /></button>
                <button type="button" className="icon-button" title="Vista isométrica" onClick={() => standViewportRef.current?.view("iso")}><Camera size={16} /></button>
                <button type="button" className="icon-button" title="Vista frontal" onClick={() => standViewportRef.current?.view("front")}><Eye size={16} /></button>
                <button type="button" className="icon-button" title="Vista superior" onClick={() => standViewportRef.current?.view("top")}><Grid3X3 size={16} /></button>
                <span className="toolbar-sep" />
                <button type="button" className={`icon-button ${stand.showGrid ? "is-on" : ""}`} title="Rejilla" onClick={() => patchStandPlan({ showGrid: !stand.showGrid })}><Grid3X3 size={16} /></button>
                <button type="button" className={`icon-button ${stand.showMerch ? "is-on" : ""}`} title="Merch" onClick={() => patchStandPlan({ showMerch: !stand.showMerch })}><Layers size={16} /></button>
                <button type="button" className={`icon-button ${stand.showLabels ? "is-on" : ""}`} title="Etiquetas" onClick={() => patchStandPlan({ showLabels: !stand.showLabels })}><PanelLeft size={16} /></button>
              </>
            ) : !showSheets ? (
              <>
                <div className="view-modes">
                  <button type="button" className={viewMode === "open" ? "is-active" : ""} onClick={() => setViewMode("open")} title="Abierto"><Box size={15} /> Montado</button>
                  <button type="button" className={viewMode === "fold" ? "is-active" : ""} onClick={() => setViewMode("fold")} title="Plegado"><FoldHorizontal size={15} /> Plegado</button>
                  <button type="button" className={viewMode === "transport" ? "is-active" : ""} onClick={() => setViewMode("transport")} title="Transporte"><Luggage size={15} /> Transporte</button>
                  <button type="button" className={viewMode === "exploded" ? "is-active" : ""} onClick={() => setViewMode("exploded")} title="Despiece"><Expand size={15} /> Despiece</button>
                </div>
                <span className="toolbar-sep" />
                <button type="button" className="icon-button" title="Vista isométrica" onClick={() => viewportRef.current?.view("iso")}><Camera size={16} /></button>
                <button type="button" className="icon-button" title="Encajar" onClick={() => viewportRef.current?.fit()}><Maximize2 size={16} /></button>
                <button type="button" className={`icon-button ${showEdges ? "is-on" : ""}`} title="Aristas" onClick={() => setShowEdges((value) => !value)}><Eye size={16} /></button>
                <button type="button" className={`icon-button ${wireframe ? "is-on" : ""}`} title="Malla" onClick={() => setWireframe((value) => !value)}><Rotate3D size={16} /></button>
                <button type="button" className={`icon-button ${xray ? "is-on" : ""}`} title="Rayos X" onClick={() => setXray((value) => !value)}><Layers size={16} /></button>
                <button type="button" className={`icon-button ${showBed ? "is-on" : ""}`} title="Cama" onClick={() => setShowBed((value) => !value)}><Printer size={16} /></button>
                <button type="button" className={`icon-button ${showGrid ? "is-on" : ""}`} title="Cuadrícula" onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={16} /></button>
                <button type="button" className={`icon-button ${autoRotate ? "is-on" : ""}`} title="Girar" onClick={() => setAutoRotate((value) => !value)}><Rotate3D size={16} /></button>
              </>
            ) : null}
          </div>

          {workspace === "stand" && addMenuOpen ? (
            <div className="stand-add-menu" ref={addMenuRef}>
              <div className="stand-add-head"><strong>Añadir módulo</strong><small>Elige un expositor</small></div>
              <div className="stand-add-grid">
                {SYSTEM_CARDS.map((card) => (
                  <button key={card.id} type="button" style={{ "--accent": card.accent } as React.CSSProperties} onClick={() => addModule(card.id)}>
                    <span className="system-dot" /> {card.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!showSheets && workspace === "display" && viewMode === "exploded" ? (
            <div className="fold-strip">
              <span>Separación</span>
              <input type="range" min={0} max={200} step={1} value={explodeAmount} onChange={(event) => setExplodeAmount(Number(event.target.value))} />
              <b>{explodeAmount}</b>
            </div>
          ) : null}

          <div className="stage-body">
            {workspace === "stand" ? (
              <StandViewport
                ref={standViewportRef}
                plan={stand}
                builds={standBuilds.builds}
                onSelect={selectStandUnit}
                onMove={handleStandMove}
                onDragStart={handleStandDragStart}
                onDragEnd={handleStandDragEnd}
              />
            ) : showSheets && build?.laser ? (
              <SheetPreview laser={build.laser} onDownload={downloadSheet} />
            ) : (
              <Viewport3D
                ref={viewportRef}
                build={build}
                viewMode={viewMode}
                foldProgress={foldProgress}
                explodeAmount={explodeAmount}
                showBed={showBed}
                showGrid={showGrid}
                showEdges={showEdges}
                wireframe={wireframe}
                xray={xray}
                autoRotate={autoRotate}
                bedWidth={settings.bedWidth}
                bedDepth={settings.bedDepth}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
            {workspace === "stand" && !stand.units.length ? (
              <div className="stand-empty-overlay">
                <span><LayoutGrid size={30} /></span>
                <h3>Tu stand está vacío</h3>
                <p>Añade un expositor o empieza con una plantilla. Todo se guarda solo.</p>
                <button type="button" className="primary-button" onClick={() => setTab("stand")}>Añadir módulo</button>
              </div>
            ) : null}
            {workspace === "stand" && standBuilds.building ? (
              <div className="build-chip"><span className="spinner" /> Generando módulos… {standBuilds.progress.done}/{standBuilds.progress.total || stand.units.length}</div>
            ) : null}
            {workspace === "display" && building ? <div className="build-chip"><span className="spinner" /> Generando geometría…</div> : null}
            {!engineReady ? (
              <div className="engine-overlay">
                <div className="engine-card">
                  <span className="engine-logo"><Box size={26} /></span>
                  <h2>Preparando Displaynian</h2>
                  <p>{engine.progressText}</p>
                  <div className="engine-progress"><span style={{ width: `${(engine.progressStep / 5) * 100}%` }} /></div>
                  {engine.engineError ? (
                    <>
                      <p className="engine-error">{engine.engineError}</p>
                      <button type="button" className="primary-button" onClick={engine.restart}>Reintentar</button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
            {workspace === "stand" && standBuilds.error ? (
              <div className="error-chip">
                {standBuilds.error}
                <button type="button" className="error-chip-action" onClick={() => void standBuilds.retry()}>Reintentar</button>
              </div>
            ) : null}
            {workspace === "display" && buildError ? <div className="error-chip">{buildError}</div> : null}
          </div>
          <div className="stage-hint">
            {workspace === "stand"
              ? "Arrastra los módulos para colocarlos en la rejilla. R gira, Ctrl+D duplica y Supr borra. El mockup incluye el merch decorativo."
              : showSheets
                ? "Láser: SVG y DXF por hoja. Mide espesor y kerf antes de cortar."
                : viewMode === "open"
                  ? "Montado: bandejas escalonadas unidas por brazos ranurados y pasadores."
                  : viewMode === "fold"
                    ? "Plegado: brazos en vertical y bandejas apiladas; el panel se guarda encima."
                    : viewMode === "transport"
                      ? "Transporte: caja cerrada con todas las piezas dentro."
                      : "Despiece: piezas separadas para revisar el montaje."}
          </div>
        </section>

        <aside className="rightbar">
          {workspace === "stand" ? (
            <StandInspector
              plan={stand}
              builds={standBuilds.builds}
              selected={standSelected}
              canUndo={canUndo}
              canRedo={canRedo}
              onEdit={() => setTab("design")}
              onDuplicate={duplicateModule}
              onRotate={rotateModule}
              onDelete={deleteModule}
              onToggleMerch={() => {
                if (standSelected) updateStandUnit(standSelected.id, { merch: !standSelected.merch });
              }}
              onToggleHidden={() => {
                if (standSelected) updateStandUnit(standSelected.id, { hidden: !standSelected.hidden });
              }}
              onRename={(name) => {
                if (standSelected) updateStandUnit(standSelected.id, { name: name.slice(0, 48) });
              }}
              onUndo={undoStand}
              onRedo={redoStand}
              onFit={() => standViewportRef.current?.fit()}
            />
          ) : (
            <PartInspector
              build={build}
              settings={settings}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onPatch={updateSettings}
            />
          )}
        </aside>
      </main>

      <StatusBar
        ready={engineReady}
        build={workspace === "display" ? build : null}
        progress={engine.progressText}
        message={workspace === "stand" ? (standBuilds.building ? "Calculando módulos…" : "") : building ? "Actualizando…" : ""}
        standMode={workspace === "stand"}
        standInfo={standInfo}
      />
      {toast ? <div className="toast">{toast}</div> : null}
      <ExportDialog
        open={exportOpen}
        build={build}
        standMode={workspace === "stand"}
        stand={stand}
        standBuilds={standBuilds.builds}
        busy={exportBusy}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
      />
      <ChecksDialog
        open={checksOpen}
        build={build}
        standMode={workspace === "stand"}
        standChecks={standCheckList}
        onClose={() => setChecksOpen(false)}
      />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
