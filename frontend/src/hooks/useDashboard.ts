"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { buildCardItems } from "@/lib/merge";
import { readLocal, writeLocal } from "@/lib/storage";
import type {
  DashboardCardItem,
  DashboardRequest,
  DashboardResponse,
} from "@/lib/types";

const LOCAL_CACHE_KEY = "dashboard-response";
const HEALTH_INTERVAL_MS = 800;

export interface UseDashboardResult {
  data: DashboardResponse | undefined;
  items: DashboardCardItem[];
  error: Error | undefined;
  isLoading: boolean;
  refresh: () => void;
}

export function useDashboard(req: DashboardRequest = {}): UseDashboardResult {
  const [data, setData] = useState<DashboardResponse | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cancelRef = useRef(false);

  // On mount: poll health until backend is up, then fetch fresh queue.
  useEffect(() => {
    cancelRef.current = false;

    async function startup() {
      // Wait for backend to respond
      while (!cancelRef.current) {
        try {
          await api.health();
          break;
        } catch {
          await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
        }
      }

      if (cancelRef.current) return;

      // Fetch fresh queue
      try {
        const fresh = await api.dashboard(req);
        if (!cancelRef.current) {
          writeLocal(LOCAL_CACHE_KEY, fresh);
          setData(fresh);
          setError(undefined);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    setRefreshing(true);
    setError(undefined);

    api
      .dashboard(req)
      .then((fresh) => {
        writeLocal(LOCAL_CACHE_KEY, fresh);
        setData(fresh);
      })
      .catch((err: Error) => setError(err))
      .finally(() => setRefreshing(false));
  };

  const items = data ? buildCardItems(data) : [];

  return {
    data,
    items,
    error,
    isLoading: initializing || refreshing,
    refresh,
  };
}
