import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Camera,
  CheckCircle2,
  ChevronDown,
  Download,
  Expand,
  Eye,
  FoldHorizontal,
  Grid3X3,
  HelpCircle,
  Layers,
  Luggage,
  Maximize2,
  Moon,
  PanelLeft,
  Printer,
  Rotate3D,
  Save,
  Scissors,
  Search,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { usePythonEngine } from "./hooks/usePythonEngine";
import type { AppSettings, BuildResult, LaserSheet, LevelConfig, ViewMode } from "./types";
import { applySystem, DEFAULT_SETTINGS, makeLevels, normalizeSettings, SYSTEM_CARDS } from "./lib/defaults";
import { downloadBase64, downloadText } from "./lib/download";
import DesignPanel from "./components/DesignPanel";
import CatalogPanel from "./components/CatalogPanel";
import ManufacturingPanel from "./components/ManufacturingPanel";
import PartInspector from "./components/PartInspector";
import { Viewport3D, type Viewport3DHandle } from "./components/Viewport3D";
import SheetPreview from "./components/SheetPreview";
import ExportDialog, { type ExportKind } from "./components/ExportDialog";
import ChecksDialog from "./components/ChecksDialog";
import HelpDialog from "./components/HelpDialog";
import StatusBar from "./components/StatusBar";
import Logo from "./components/Logo";

const SETTINGS_KEY = "displaynian-settings-v5";
const THEME_KEY = "displaynian-theme";
const PROJECT_NAME_KEY = "displaynian-project-name";

function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (raw && typeof raw === "object") return normalizeSettings(raw);
  } catch { /* ignore */ }
  return normalizeSettings(DEFAULT_SETTINGS);
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
  const { ready: engineReady, build: engineBuild, export3mf, exportStlZip, exportObj, exportLaserZip } = engine;
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [build, setBuild] = useState<BuildResult | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"design" | "catalog" | "make">("design");
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [foldProgress, setFoldProgress] = useState(0);
  const [explodeAmount, setExplodeAmount] = useState(80);
  const [showBed, setShowBed] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showEdges, setShowEdges] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [centerTab, setCenterTab] = useState<"3d" | "sheets">("3d");
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
  const importRef = useRef<HTMLInputElement | null>(null);
  const buildSeq = useRef(0);
  const settingsRef = useRef(settings);
  const toastTimer = useRef(0);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(PROJECT_NAME_KEY, projectName); } catch { /* ignore */ }
  }, [projectName]);

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
    if (!engineReady) return;
    const timer = window.setTimeout(() => runBuild(settingsRef.current), 280);
    return () => window.clearTimeout(timer);
  }, [engineReady, settings, runBuild]);

  useEffect(() => {
    if (!toast) return;
    return () => window.clearTimeout(toastTimer.current);
  }, [toast]);

  useEffect(() => {
    setFoldProgress(viewMode === "open" || viewMode === "exploded" ? 0 : 1);
  }, [viewMode]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.levels !== undefined) {
        const count = Math.max(1, Math.min(6, Math.round(Number(patch.levels) || 1)));
        const existing = current.levelConfigs;
        const base = makeLevels(count, current.levelSpacing, current.shelfDepth, current.shelfTaper, current.lipHeight);
        next.levels = count;
        next.levelConfigs = base.map((level, index) => ({
          ...level,
          ...(existing[index] || {}),
          height: existing[index]?.height ?? level.height,
          depth: Math.min(existing[index]?.depth ?? level.depth, next.depth - 8),
        }));
      }
      if (patch.depth !== undefined) {
        next.levelConfigs = next.levelConfigs.map((level) => ({ ...level, depth: Math.min(level.depth, next.depth - 8) }));
      }
      if (patch.levelSpacing !== undefined) {
        next.levelConfigs = next.levelConfigs.map((level) => ({ ...level, gap: patch.levelSpacing as number }));
      }
      if (patch.mode === "laser") {
        next.laserThickness = current.laserThickness || 3;
      }
      return next;
    });
  }, []);

  const updateLevel = useCallback((index: number, patch: Partial<LevelConfig>) => {
    setSettings((current) => {
      const levelConfigs = current.levelConfigs.map((level, levelIndex) => (levelIndex === index ? { ...level, ...patch } : level));
      return { ...current, levelConfigs };
    });
  }, []);

  const chooseSystem = useCallback((system: string) => {
    setSettings((current) => {
      const next = applySystem(current, system);
      return {
        ...next,
        mode: current.mode,
        printer: current.printer,
        bedWidth: current.bedWidth,
        bedDepth: current.bedDepth,
        bedHeight: current.bedHeight,
        material: current.material,
        laserMaterial: current.laserMaterial,
        laserThickness: current.laserThickness,
        kerf: current.kerf,
        sheet: current.sheet,
        sheetWidth: current.sheetWidth,
        sheetHeight: current.sheetHeight,
        partColors: current.partColors,
        partScales: current.partScales,
        disabledParts: current.disabledParts,
        colors: current.colors,
      };
    });
    notify(`${SYSTEM_CARDS.find((card) => card.id === system)?.label || system} aplicado`);
  }, [notify]);

  const exportProject = useCallback(() => {
    const payload = {
      app: "Displaynian",
      version: "0.1.0",
      name: projectName,
      exportedAt: new Date().toISOString(),
      settings,
    };
    downloadText(JSON.stringify(payload, null, 2), `${projectName || "displaynian"}.displaynian.json`, "application/json");
    notify("Proyecto guardado");
  }, [notify, projectName, settings]);

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const raw = data?.settings || data;
      const next = normalizeSettings(raw);
      setSettings(next);
      setProjectName(String(data?.name || file.name.replace(/\.displaynian(\.json)?$/i, "") || "mi-display"));
      notify("Proyecto importado");
      setTab("design");
    } catch (error) {
      notify(`No se pudo importar: ${String((error as Error).message || error)}`);
    }
  };

  const handleExport = async (kind: ExportKind) => {
    if (!build) return;
    setExportBusy(true);
    try {
      if (kind === "project") {
        exportProject();
        setExportOpen(false);
        return;
      }
      if (kind === "mockup") {
        const image = viewportRef.current?.screenshot();
        if (image) downloadDataUrl(image, `${projectName || "displaynian"}-mockup.png`);
        notify("Mockup descargado");
        setExportOpen(false);
        return;
      }
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
    if (!build) return { warnings: 0, errors: 0, ok: 0 };
    return {
      warnings: build.checks.filter((check) => check.level === "warn").length,
      errors: build.checks.filter((check) => check.level === "error").length,
      ok: build.checks.filter((check) => check.level === "ok").length,
    };
  }, [build]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const term = search.toLowerCase();
    return build?.parts.filter((part) => `${part.name} ${part.group} ${part.category}`.toLowerCase().includes(term)) || [];
  }, [build, search]);

  const modeLabel = settings.mode === "3d" ? "Impresión 3D" : "Corte láser";
  const showSheets = settings.mode === "laser" && Boolean(build?.laser);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <div className="mode-switch" role="group" aria-label="Modo de fabricación">
          <button
            type="button"
            className={settings.mode === "3d" ? "is-active" : ""}
            onClick={() => {
              updateSettings({ mode: "3d" });
              setCenterTab("3d");
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
              setCenterTab("sheets");
              setViewMode("open");
            }}
          >
            <Scissors size={15} /> Láser
          </button>
        </div>
        <label className="project-name">
          <span>Proyecto</span>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
        </label>
        <div className="top-actions">
          <button type="button" className="top-button" onClick={() => importRef.current?.click()}><Upload size={15} /> Importar</button>
          <button type="button" className="top-button" onClick={exportProject}><Save size={15} /> Guardar</button>
          <button type="button" className="primary-button" onClick={() => setExportOpen(true)}><Download size={15} /> Exportar</button>
          <button type="button" className="icon-button" onClick={() => setChecksOpen(true)} title="Comprobaciones">
            <span className="notify-dot" data-count={visibleChecks.warnings + visibleChecks.errors}><CheckCircle2 size={17} /></span>
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
        <span className="subbar-system"><Layers size={14} /> {SYSTEM_CARDS.find((card) => card.id === settings.system)?.label || settings.system}</span>
        <span>{settings.levels} bandejas</span>
        <span>{settings.width.toFixed(0)} × {settings.depth.toFixed(0)} mm</span>
        <span>{modeLabel}</span>
        <span className="subbar-flex" />
        <div className="search-box">
          <Search size={14} />
          <input placeholder="Buscar pieza…" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search ? <button type="button" onClick={() => setSearch("")}><X size={13} /></button> : null}
        </div>
        <button type="button" className="mini-button" onClick={() => setChecksOpen(true)}>
          {visibleChecks.errors ? "Errores" : visibleChecks.warnings ? `${visibleChecks.warnings} aviso(s)` : "Preflight OK"}
        </button>
      </div>

      {search && filtered ? (
        <div className="search-results">
          {filtered.length ? filtered.slice(0, 8).map((part) => (
            <button key={part.id} type="button" onClick={() => { setSelectedId(part.id); setSearch(""); }}>
              <span className="part-swatch" style={{ background: part.color }} /> {part.name} <small>{part.group}</small>
            </button>
          )) : <span>Sin resultados</span>}
        </div>
      ) : null}

      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button type="button" className={tab === "design" ? "is-active" : ""} onClick={() => setTab("design")}><PanelLeft size={15} /> Diseño</button>
            <button type="button" className={tab === "catalog" ? "is-active" : ""} onClick={() => setTab("catalog")}><Box size={15} /> Catálogo</button>
            <button type="button" className={tab === "make" ? "is-active" : ""} onClick={() => setTab("make")}><Printer size={15} /> Fabricar</button>
          </div>
          <div className="sidebar-scroll">
            {tab === "design" ? <DesignPanel settings={settings} onPatch={updateSettings} onSystem={chooseSystem} onLevel={updateLevel} /> : null}
            {tab === "catalog" ? <CatalogPanel settings={settings} onPatch={updateSettings} /> : null}
            {tab === "make" ? <ManufacturingPanel settings={settings} onPatch={updateSettings} /> : null}
          </div>
        </aside>

        <section className="stage">
          <div className="stage-toolbar">
            {!showSheets ? (
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

          {!showSheets && viewMode === "exploded" ? (
            <div className="fold-strip">
              <span>Separación</span>
              <input type="range" min={0} max={200} step={1} value={explodeAmount} onChange={(event) => setExplodeAmount(Number(event.target.value))} />
              <b>{explodeAmount}</b>
            </div>
          ) : null}

          <div className="stage-body">
            {showSheets && build?.laser ? (
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
            {building ? <div className="build-chip"><span className="spinner" /> Generando geometría…</div> : null}
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
            {buildError ? <div className="error-chip">{buildError}</div> : null}
          </div>
          <div className="stage-hint">
            {showSheets
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
          <PartInspector
            build={build}
            settings={settings}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPatch={updateSettings}
          />
        </aside>
      </main>

      <StatusBar ready={engineReady} build={build} progress={engine.progressText} message={building ? "Actualizando…" : ""} />
      {toast ? <div className="toast">{toast}</div> : null}
      <ExportDialog open={exportOpen} build={build} busy={exportBusy} onClose={() => setExportOpen(false)} onExport={handleExport} />
      <ChecksDialog open={checksOpen} build={build} onClose={() => setChecksOpen(false)} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
