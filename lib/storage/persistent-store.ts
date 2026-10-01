import type { StateSetter } from "../../features/types";

export type StorageSnapshot<T> = { value: T; error: boolean };

// Browser storage is an external system, not an effect-driven React state mirror.
// The server snapshot is stable; subscribe hydrates before any write can happen.
export function createPersistentStore<T>(
  key: string,
  initialValue: T,
  read: (storage: Storage) => T,
  validate: (raw: unknown) => T,
) {
  const serverSnapshot: StorageSnapshot<T> = { value: initialValue, error: false };
  let snapshot = serverSnapshot;
  let hydrated = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const hydrate = () => {
    if (hydrated) return;
    hydrated = true;
    try {
      snapshot = { value: read(window.localStorage), error: false };
    } catch {
      snapshot = { value: initialValue, error: true };
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    try {
      snapshot = {
        value: event.newValue === null ? initialValue : validate(JSON.parse(event.newValue)),
        error: false,
      };
    } catch {
      snapshot = { ...snapshot, error: true };
    }
    emit();
  };
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      hydrate();
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    setValue: ((action) => {
      hydrate();
      const value =
        typeof action === "function" ? (action as (previous: T) => T)(snapshot.value) : action;
      if (value === snapshot.value) return;
      snapshot = { value, error: snapshot.error };
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        snapshot = { value, error: false };
      } catch {
        snapshot = { value, error: true };
      }
      emit();
    }) satisfies StateSetter<T>,
  };
}
