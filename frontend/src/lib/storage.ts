// Tiny localStorage helpers guarded for SSR and quota or parse failures.

const PREFIX = "portal-visualizer:";
const STORAGE_EVENT = "portal-visualizer:storage-change";

export function readLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(buildStorageKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(buildStorageKey(key), JSON.stringify(value));
    dispatchStorageChange(key);
  } catch {
    // Ignore quota or serialization errors, cache is best-effort.
  }
}

export function subscribeLocal(
  key: string,
  onStoreChange: () => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const storageKey = buildStorageKey(key);
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === storageKey) {
      onStoreChange();
    }
  };
  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string }>).detail;
    if (!detail?.key || detail.key === key) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomEvent as EventListener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomEvent as EventListener);
  };
}

function buildStorageKey(key: string) {
  return PREFIX + key;
}

function dispatchStorageChange(key: string) {
  window.dispatchEvent(
    new CustomEvent(STORAGE_EVENT, {
      detail: { key },
    })
  );
}
