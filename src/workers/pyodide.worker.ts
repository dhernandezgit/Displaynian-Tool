/// <reference lib="webworker" />

const CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/";
let py: any = null;
let ready = false;

function send(message: Record<string, unknown>) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
}

function progress(text: string, step?: number) {
  send({ type: "progress", text, step });
}

async function boot(zipUrl: string) {
  if (ready) {
    send({ type: "ready" });
    return;
  }
  progress("Cargando Python en el navegador (WebAssembly)…", 1);
  const mod = await import(/* @vite-ignore */ `${CDN}pyodide.mjs`);
  py = await mod.loadPyodide({ indexURL: CDN });
  progress("Cargando NumPy y Shapely…", 2);
  await py.loadPackage(["numpy", "shapely"]);
  progress("Descargando el motor Displaynian…", 3);
  const response = await fetch(zipUrl, { cache: "no-cache" });
  if (!response.ok) throw new Error(`No se pudo descargar el motor (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  py.FS.writeFile("/displaynian.zip", bytes);
  progress("Preparando el motor…", 4);
  await py.runPythonAsync(`
import zipfile, sys, os
os.makedirs("/motor", exist_ok=True)
with zipfile.ZipFile("/displaynian.zip") as z:
    z.extractall("/motor")
sys.path.insert(0, "/motor")
`);
  ready = true;
  progress("Motor listo", 5);
  send({ type: "ready" });
}

async function call(name: string, payload: unknown) {
  py.globals.set("_payload", JSON.stringify(payload));
  const result = await py.runPythonAsync(
    `from displaynian import webapi\nwebapi.${name}(_payload)`,
  );
  return JSON.parse(result);
}

async function handle(data: Record<string, any>) {
  try {
    if (data.type === "init") {
      await boot(String(data.zipUrl));
      return;
    }
    if (!ready || !py) throw new Error("El motor de Python todavía no está listo.");
    if (data.type === "bootstrap") {
      const result = await call("bootstrap", data.payload || {});
      send({ type: "result", id: data.id, data: result });
    } else if (data.type === "build") {
      const result = await call("build", data.payload);
      send({ type: "result", id: data.id, data: result });
    } else if (data.type === "export3mf") {
      const result = await call("export_3mf", data.payload);
      send({ type: "result", id: data.id, data: result });
    } else if (data.type === "exportStlZip") {
      const result = await call("export_stl_zip", data.payload);
      send({ type: "result", id: data.id, data: result });
    } else if (data.type === "exportObj") {
      const result = await call("export_obj", data.payload);
      send({ type: "result", id: data.id, data: result });
    } else if (data.type === "exportLaserZip") {
      const result = await call("export_laser_zip", data.payload);
      send({ type: "result", id: data.id, data: result });
    }
  } catch (error) {
    const message = String((error as { message?: string })?.message || error);
    if (data.type === "init") {
      send({ type: "fatal", error: message });
    } else {
      send({ type: "error", id: data.id, error: message });
    }
  }
}

let queue: Promise<void> = Promise.resolve();
self.onmessage = (event: MessageEvent) => {
  const data = (event.data || {}) as Record<string, any>;
  queue = queue.then(() => handle(data));
};
