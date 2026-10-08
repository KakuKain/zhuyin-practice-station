import { useState, useSyncExternalStore } from "react";
import { createPersistentStore } from "./persistent-store";

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  read: (storage: Storage) => T,
  validate: (raw: unknown) => T,
  options?: { protectUnreadData?: boolean },
) {
  const [store] = useState(() => createPersistentStore(key, initialValue, read, validate, options));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return [snapshot.value, store.setValue, snapshot.error] as const;
}
