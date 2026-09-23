/**
 * Safe localStorage utilities with quota protection and automatic cleanup.
 * Prevents QuotaExceededError from crashing the application.
 */

const OBSOLETE_OR_LARGE_KEY_PREFIXES = [
  'consultor_roi_regional_clients',
  'consultor_roi_infoped_records',
  'consultor_roi_visits_synced_v1',
  'consultor_roi_visits_synced_v2',
  'consultor_roi_visits_synced_v3',
  'consultor_roi_visits_synced_v4',
  'consultor_roi_visits_synced_v5',
  'consultor_roi_visits_synced_v6',
  'consultor_roi_visits_synced_v7',
  'consultor_roi_visits_synced_v8',
  'consultor_roi_visits_synced_v9',
  'consultor_roi_visits_synced_v10',
  'consultor_roi_visits_synced_v11',
  'consultor_roi_visits_synced_v12',
  'consultor_roi_visits_synced_v13',
];

/**
 * Free up storage by purging old or large payloads
 */
export function cleanStorageQuota(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && OBSOLETE_OR_LARGE_KEY_PREFIXES.some(prefix => k.startsWith(prefix))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (err) {
        // ignore
      }
    });
  } catch (e) {
    console.warn('Storage cleanup notice:', e);
  }
}

/**
 * Safely read and parse a JSON item from localStorage
 */
export function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (e) {
    console.warn(`safeGetStorage failed for "${key}":`, e);
    return fallback;
  }
}

/**
 * Safely write a value to localStorage with QuotaExceeded protection
 */
export function safeSetStorage(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.warn(`safeSetStorage: quota limit reached for "${key}". Purging stale cache...`);
    cleanStorageQuota();
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (retryError) {
      console.warn(`safeSetStorage: could not persist "${key}" to localStorage. Running in-memory safely.`, retryError);
      return false;
    }
  }
}

export function safeRemoveStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`safeRemoveStorage failed for "${key}":`, e);
  }
}
