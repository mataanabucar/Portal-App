"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { buildCardItems } from "@/lib/merge";
import { readLocal, writeLocal } from "@/lib/storage";
import type {
  DashboardCacheRecord,
  DashboardCardItem,
  DashboardRequest,
  DashboardResponse,
} from "@/lib/types";

const LOCAL_CACHE_KEY = "dashboard-response";
const HEALTH_INTERVAL_MS = 800;
const MIN_CONNECTION_CHECK_MS = 450;

export interface UseDashboardResult {
  data: DashboardResponse | undefined;
  items: DashboardCardItem[];
  error: Error | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  isBackendReady: boolean;
  isCheckingConnection: boolean;
  loadingProgress: number;
  loadingLabel: string;
  refresh: () => Promise<DashboardResponse | undefined>;
  refreshWithRequest: (
    nextReq: DashboardRequest
  ) => Promise<DashboardResponse | undefined>;
}

export function useDashboard(req: DashboardRequest = {}): UseDashboardResult {
  const [data, setData] = useState<DashboardResponse | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(12);
  const [loadingLabel, setLoadingLabel] = useState("STARTING...");
  const cancelRef = useRef(false);
  const requestRef = useRef(req);

  useEffect(() => {
    requestRef.current = req;
  }, [req]);

  // On mount: restore saved queue state first. Only fetch fresh data if there
  // is no stored dashboard payload anywhere.
  useEffect(() => {
    cancelRef.current = false;

    async function startup() {
      const connectionCheckStartedAt = Date.now();
      const localCached = readLocal<DashboardResponse>(LOCAL_CACHE_KEY);
      const hasLocalCache = Boolean(localCached);

      if (localCached) {
        setData(localCached);
        setError(undefined);
        setInitializing(false);
      }

      setLoadingProgress(24);
      setLoadingLabel("CHECKING CONNECTION...");

      while (!cancelRef.current) {
        try {
          await api.health();
          if (!cancelRef.current) {
            const elapsed = Date.now() - connectionCheckStartedAt;
            const remainingDelay = Math.max(
              0,
              MIN_CONNECTION_CHECK_MS - elapsed
            );

            if (remainingDelay > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, remainingDelay)
              );
            }

            if (!cancelRef.current) {
              setBackendReady(true);
              setCheckingConnection(false);
            }
          }
          break;
        } catch {
          await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
        }
      }

      if (cancelRef.current) return;

      if (hasLocalCache) {
        return;
      }

      try {
        setLoadingProgress(52);
        setLoadingLabel("CHECKING SAVED QUEUE...");
        const cachedRecord = await api.dashboardCache();
        if (cachedRecord?.payload && !cancelRef.current) {
          writeLocal(LOCAL_CACHE_KEY, cachedRecord.payload);
          setData(cachedRecord.payload);
          setError(undefined);
          setLoadingProgress(100);
          setLoadingLabel("QUEUE READY");
          await settleLoading(cancelRef);
          return;
        }

        const stopTrickle = startProgressTrickle(setLoadingProgress, setLoadingLabel);
        const activeRequest = requestRef.current;
        try {
          const fresh = await api.dashboard(activeRequest);
          stopTrickle();
          if (!cancelRef.current) {
            await persistDashboardCache(fresh, activeRequest);
            setData(fresh);
            setError(undefined);
            setLoadingProgress(100);
            setLoadingLabel("QUEUE READY");
            await settleLoading(cancelRef);
          }
        } catch (innerErr) {
          stopTrickle();
          throw innerErr;
        }
      } catch (err) {
        if (!cancelRef.current) {
          // Fall back to local cache silently — surface the error only if
          // there's nothing to show at all.
          const cached = readLocal<DashboardResponse>(LOCAL_CACHE_KEY);
          if (cached) {
            setData(cached);
          } else {
            setError(err as Error);
          }
        }
      } finally {
        if (!cancelRef.current) setInitializing(false);
      }
    }

    startup();

    return () => {
      cancelRef.current = true;
    };
  }, []);

  const runRefresh = async (
    nextReq?: DashboardRequest
  ): Promise<DashboardResponse | undefined> => {
    if (!backendReady) {
      return undefined;
    }

    const activeRequest = nextReq ?? requestRef.current;
    requestRef.current = activeRequest;
    setRefreshing(true);
    setError(undefined);

    const stopTrickle = startProgressTrickle(setLoadingProgress, setLoadingLabel);

    try {
      const fresh = await api.dashboard(activeRequest);
      stopTrickle();
      await persistDashboardCache(fresh, activeRequest);
      setData(fresh);
      setLoadingProgress(100);
      setLoadingLabel("QUEUE READY");
      await settleLoading();
      return fresh;
    } catch (err) {
      stopTrickle();
      setError(err as Error);
      return undefined;
    } finally {
      setRefreshing(false);
    }
  };

  const refresh = () => {
    return runRefresh();
  };

  const refreshWithRequest = (nextReq: DashboardRequest) => {
    return runRefresh(nextReq);
  };

  const items = data ? buildCardItems(data) : [];

  return {
    data,
    items,
    error,
    isLoading: initializing || refreshing,
    isRefreshing: refreshing,
    isBackendReady: backendReady,
    isCheckingConnection: checkingConnection,
    loadingProgress,
    loadingLabel,
    refresh,
    refreshWithRequest,
  };
}

async function persistDashboardCache(
  payload: DashboardResponse,
  req: DashboardRequest
) {
  writeLocal(LOCAL_CACHE_KEY, payload);

  try {
    const healthPayload = await api.health();
    const cacheRecord: DashboardCacheRecord = {
      cachedAt: new Date().toISOString(),
      healthPayload,
      payload,
      controls: buildCacheControls(req),
    };
    await api.saveDashboardCache(cacheRecord);
  } catch {
    // Best-effort persistence. The in-browser cache is already updated.
  }
}

function buildCacheControls(req: DashboardRequest) {
  const controls: DashboardCacheRecord["controls"] = {};

  if (typeof req.includeSummary === "boolean") {
    controls.includeSummary = req.includeSummary;
  }

  if (typeof req.parserTestchat === "boolean") {
    controls.parserTestchat = req.parserTestchat;
  }

  if (typeof req.focus === "string") {
    controls.focus = req.focus;
  }

  if (typeof req.parserFocus === "string") {
    controls.parserFocus = req.parserFocus;
  }

  if (typeof req.summaryTone === "string") {
    controls.summaryTone = req.summaryTone;
  }

  return Object.keys(controls).length > 0 ? controls : undefined;
}

function settleLoading(cancelRef?: { current: boolean }) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      if (!cancelRef || !cancelRef.current) {
        resolve();
        return;
      }

      resolve();
    }, 180);
  });
}

const TRICKLE_PHASES = [
  { delay: 0,     progress: 48, label: "FETCHING PORTAL..." },
  { delay: 2500,  progress: 56, label: "READING ITEMS..." },
  { delay: 6000,  progress: 63, label: "PARSING CONTENT..." },
  { delay: 11000, progress: 70, label: "AI PROCESSING..." },
  { delay: 18000, progress: 77, label: "GENERATING SUMMARIES..." },
  { delay: 27000, progress: 83, label: "ALMOST THERE..." },
  { delay: 40000, progress: 89, label: "FINISHING UP..." },
  { delay: 58000, progress: 93, label: "STILL WORKING..." },
] as const;

function startProgressTrickle(
  setProgress: (p: number) => void,
  setLabel: (l: string) => void,
): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const phase of TRICKLE_PHASES) {
    const timer = setTimeout(() => {
      if (!cancelled) {
        setProgress(phase.progress);
        setLabel(phase.label);
      }
    }, phase.delay);
    timers.push(timer);
  }

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}
