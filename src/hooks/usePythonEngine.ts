import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings, BuildResult } from "../types";

type Status = "loading" | "ready" | "error";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: number;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type });
}

export function base64Blob(value: string, type: string): Blob {
  return bytesToBlob(base64ToBytes(value), type);
}

const REQUEST_TIMEOUT_MS = 240_000;

export function usePythonEngine() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);
  const readyRef = useRef(false);
  const [bootKey, setBootKey] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [progressText, setProgressText] = useState("Preparando el motor Python…");
  const [progressStep, setProgressStep] = useState(0);
  const [engineError, setEngineError] = useState("");

  const rejectAll = useCallback((message: string) => {
    for (const [, item] of pending.current) {
      window.clearTimeout(item.timer);
      item.reject(new Error(message));
    }
    pending.current.clear();
  }, []);

  useEffect(() => {
    setStatus("loading");
    setEngineError("");
    setProgressText("Preparando el motor Python…");
    setProgressStep(0);
    readyRef.current = false;
    const worker = new Worker(new URL("../workers/pyodide.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === "progress") {
        setProgressText(String(data.text || ""));
        setProgressStep(Number(data.step || 0));
        return;
      }
      if (data.type === "ready") {
        readyRef.current = true;
        setStatus("ready");
        setProgressText("Motor listo");
        setProgressStep(5);
        setEngineError("");
        return;
      }
      if (data.type === "fatal") {
        readyRef.current = false;
        setStatus("error");
        setEngineError(String(data.error || "No se pudo iniciar el motor Python."));
        rejectAll(String(data.error || "No se pudo iniciar el motor Python."));
        return;
      }
      if (data.type === "result" || data.type === "error") {
        const item = pending.current.get(Number(data.id));
        if (!item) return;
        pending.current.delete(Number(data.id));
        window.clearTimeout(item.timer);
        if (data.type === "result") item.resolve(data.data);
        else item.reject(new Error(String(data.error || "Error del motor Python")));
      }
    };
    worker.onerror = (event) => {
      const message = event.message || "No se pudo iniciar el motor Python.";
      readyRef.current = false;
      setStatus("error");
      setEngineError(message);
      rejectAll(message);
    };
    const zipUrl = new URL("displaynian.zip", document.baseURI).href;
    worker.postMessage({ type: "init", zipUrl });
    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
      rejectAll("El motor Python se reinició.");
    };
  }, [bootKey, rejectAll]);

  const restart = useCallback(() => {
    setEngineError("");
    setBootKey((value) => value + 1);
  }, []);

  const request = useCallback((type: string, payload: unknown): Promise<any> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error("El motor no está iniciado."));
    if (!readyRef.current) return Promise.reject(new Error("El motor Python todavía está cargando. Espera un momento."));
    const id = nextId.current++;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        pending.current.delete(id);
        reject(new Error("El motor ha tardado demasiado en responder. Prueba con menos piezas o reinicia el motor."));
      }, REQUEST_TIMEOUT_MS);
      pending.current.set(id, { resolve, reject, timer });
      worker.postMessage({ type, id, payload });
    });
  }, []);

  const build = useCallback(async (settings: AppSettings): Promise<BuildResult> => {
    const result = await request("build", { settings });
    if (!result.ok) throw new Error(result.error || "No se pudo generar el display.");
    return result as BuildResult;
  }, [request]);

  const export3mf = useCallback(async (settings: AppSettings) => request("export3mf", { settings }), [request]);
  const exportStlZip = useCallback(async (settings: AppSettings) => request("exportStlZip", { settings }), [request]);
  const exportObj = useCallback(async (settings: AppSettings) => request("exportObj", { settings }), [request]);
  const exportLaserZip = useCallback(async (settings: AppSettings) => request("exportLaserZip", { settings }), [request]);

  return {
    status,
    ready: status === "ready",
    progressText,
    progressStep,
    engineError,
    restart,
    build,
    export3mf,
    exportStlZip,
    exportObj,
    exportLaserZip,
  };
}
