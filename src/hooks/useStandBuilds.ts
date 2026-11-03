import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings, BuildResult, StandUnit } from "../types";
import { standBuildSettings } from "../lib/stand";

interface Job {
  id: string;
  signature: string;
  settings: AppSettings;
}

interface CacheEntry {
  signature: string;
  build: BuildResult;
}

export function useStandBuilds(
  build: (settings: AppSettings) => Promise<BuildResult>,
  ready: boolean,
  units: StandUnit[],
  active: boolean,
) {
  const [builds, setBuilds] = useState<Record<string, BuildResult>>({});
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const cacheRef = useRef(new Map<string, CacheEntry>());
  const jobsRef = useRef<Job[]>([]);
  const activeRef = useRef(active);
  const runningRef = useRef(false);
  const rerunRef = useRef(false);
  const pendingRef = useRef(new Set<string>());
  const buildRef = useRef(build);

  useEffect(() => {
    buildRef.current = build;
  }, [build]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const jobs = useMemo(() => units.filter((unit) => !unit.hidden).map((unit) => {
    const settings = standBuildSettings(unit.settings);
    return {
      id: unit.id,
      signature: JSON.stringify(settings),
      settings,
    };
  }), [units]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    const ids = new Set(units.map((unit) => unit.id));
    for (const id of Array.from(cacheRef.current.keys())) {
      if (!ids.has(id)) cacheRef.current.delete(id);
    }
    setBuilds((current) => {
      const next: Record<string, BuildResult> = {};
      for (const unit of units) {
        if (current[unit.id]) next[unit.id] = current[unit.id];
      }
      const changed = Object.keys(next).length !== Object.keys(current).length;
      return changed ? next : current;
    });
  }, [units]);

  const runQueue = useCallback(async () => {
    if (!ready || !activeRef.current) return;
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;
    try {
      for (;;) {
        if (!activeRef.current) break;
        const job = jobsRef.current.find((item) => {
          const cached = cacheRef.current.get(item.id);
          return (!cached || cached.signature !== item.signature) && !pendingRef.current.has(item.id);
        });
        if (!job) break;
        pendingRef.current.add(job.id);
        setPendingIds(Array.from(pendingRef.current));
        try {
          const result = await buildRef.current(job.settings);
          const currentJob = jobsRef.current.find((item) => item.id === job.id);
          if (!currentJob || currentJob.signature !== job.signature) continue;
          cacheRef.current.set(job.id, { signature: job.signature, build: result });
          setBuilds((current) => ({ ...current, [job.id]: result }));
          setError("");
        } catch (caught) {
          setError(String((caught as { message?: string })?.message || caught));
        } finally {
          pendingRef.current.delete(job.id);
          setPendingIds(Array.from(pendingRef.current));
        }
      }
    } finally {
      runningRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        window.setTimeout(() => { void runQueue(); }, 40);
      }
    }
  }, [ready]);

  useEffect(() => {
    if (!active || !ready) return;
    const timer = window.setTimeout(() => { void runQueue(); }, 300);
    return () => window.clearTimeout(timer);
  }, [active, ready, jobs, runQueue]);

  const progress = useMemo(() => {
    const total = units.filter((unit) => !unit.hidden).length;
    const done = units.filter((unit) => Boolean(builds[unit.id]) && !pendingIds.includes(unit.id)).length;
    return { done: Math.min(done, total), total };
  }, [builds, pendingIds, units]);

  return {
    builds,
    pendingIds,
    building: pendingIds.length > 0,
    error,
    progress,
    retry: runQueue,
  };
}
