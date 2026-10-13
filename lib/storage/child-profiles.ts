import { useSyncExternalStore } from "react";
import {
  childChosenSessionKey,
  childScopedKeys,
  childStorageKey,
  isChildId,
  isLessonRecordKey,
  mainChildId,
  splitChildKey,
  storageKeys,
} from "./storage-keys";

export const childAvatars = {
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
  bear: "🐻",
  panda: "🐼",
  fox: "🦊",
  frog: "🐸",
  tiger: "🐯",
  monkey: "🐵",
  penguin: "🐧",
  chick: "🐥",
  koala: "🐨",
} as const;
export type ChildAvatar = keyof typeof childAvatars;
export type ChildProfile = {
  id: string;
  name: string;
  avatar: ChildAvatar;
  /** The material this child practises; unset follows the family's last choice. */
  materialId?: string;
  /** The subject the course list shows: 注音 unless the child last chose 數學. */
  subject?: "zhuyin" | "math";
};
export type ChildProfiles = { version: 1; activeId: string; children: ChildProfile[] };

export const maxChildren = 6;
export const maxChildNameLength = 8;
const initialProfiles: ChildProfiles = {
  version: 1,
  activeId: mainChildId,
  children: [{ id: mainChildId, name: "", avatar: "cat" }],
};

/** Lenient: unknown avatars become the cat, bad entries are dropped, one child always exists. */
export function validateChildProfiles(raw: unknown): ChildProfiles {
  const value = raw && typeof raw === "object" ? (raw as Partial<ChildProfiles>) : {};
  const children: ChildProfile[] = [];
  for (const item of Array.isArray(value.children) ? value.children : []) {
    if (!item || !isChildId(item.id) || children.some((child) => child.id === item.id)) continue;
    children.push({
      id: item.id,
      name: typeof item.name === "string" ? item.name.trim().slice(0, maxChildNameLength) : "",
      avatar: item.avatar in childAvatars ? item.avatar : "cat",
      ...(typeof item.materialId === "string" && item.materialId.length <= 80
        ? { materialId: item.materialId }
        : {}),
      ...(item.subject === "math" ? { subject: "math" as const } : {}),
    });
  }
  if (!children.length) return initialProfiles;
  const activeId = children.some((child) => child.id === value.activeId)
    ? value.activeId!
    : children[0].id;
  return { version: 1, activeId, children: children.slice(0, maxChildren) };
}

let state: ChildProfiles | null = null;
const listeners = new Set<() => void>();

function read(): ChildProfiles {
  try {
    const raw = window.localStorage.getItem(storageKeys.children);
    return raw ? validateChildProfiles(JSON.parse(raw)) : initialProfiles;
  } catch {
    return initialProfiles;
  }
}

export function childProfiles(): ChildProfiles {
  if (typeof window === "undefined") return initialProfiles;
  return (state ??= read());
}

function save(next: ChildProfiles) {
  state = next;
  try {
    window.localStorage.setItem(storageKeys.children, JSON.stringify(next));
  } catch {
    // The choice still applies to this session.
  }
  for (const listener of listeners) listener();
}

const onStorage = (event: StorageEvent) => {
  if (event.key !== null && event.key !== storageKeys.children) return;
  state = read();
  for (const listener of listeners) listener();
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useChildProfiles() {
  return useSyncExternalStore(subscribe, childProfiles, () => initialProfiles);
}

export const activeChildId = () => childProfiles().activeId;
export const activeChild = () =>
  childProfiles().children.find((child) => child.id === activeChildId())!;
/** This key for the child practising now. */
export const childKey = (key: string) => childStorageKey(key, activeChildId());

function markChosen() {
  try {
    window.sessionStorage.setItem(childChosenSessionKey, "1");
  } catch {
    // Without session storage the picker simply asks again after a reload.
  }
}

/** With two or more children, each app session starts by asking who is practising. */
export function needsChildChoice() {
  if (childProfiles().children.length < 2) return false;
  try {
    return window.sessionStorage.getItem(childChosenSessionKey) === null;
  } catch {
    return true;
  }
}

export function chooseChild(id: string) {
  const profiles = childProfiles();
  if (!profiles.children.some((child) => child.id === id)) return;
  markChosen();
  if (profiles.activeId !== id) save({ ...profiles, activeId: id });
}

export function addChild(name: string, avatar: ChildAvatar, materialId?: string) {
  const profiles = childProfiles();
  if (profiles.children.length >= maxChildren) return null;
  let number = 2;
  while (profiles.children.some((child) => child.id === `k${number}`)) number++;
  const id = `k${number}`;
  // The parent is adding a child, not handing the tablet over: keep whoever is practising.
  markChosen();
  save({
    ...profiles,
    children: [
      ...profiles.children,
      {
        id,
        name: name.trim().slice(0, maxChildNameLength),
        avatar,
        ...(materialId ? { materialId } : {}),
      },
    ],
  });
  return id;
}

export function updateChild(
  id: string,
  change: Partial<Pick<ChildProfile, "name" | "avatar" | "materialId" | "subject">>,
) {
  const profiles = childProfiles();
  save({
    ...profiles,
    children: profiles.children.map((child) =>
      child.id === id
        ? {
            ...child,
            ...(change.name !== undefined
              ? { name: change.name.trim().slice(0, maxChildNameLength) }
              : {}),
            ...(change.avatar !== undefined ? { avatar: change.avatar } : {}),
            ...(change.materialId !== undefined ? { materialId: change.materialId } : {}),
            ...(change.subject !== undefined ? { subject: change.subject } : {}),
          }
        : child,
    ),
  });
}

/** Every stored key holding this child's own records, including the first child's old versions. */
export function childRecordKeys(id: string, storage: Storage = window.localStorage) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)!;
    const { key: shared, childId } = splitChildKey(key);
    if (childId !== id) continue;
    const legacyPractice =
      id === mainChildId &&
      [storageKeys.practiceV3, storageKeys.practiceV2, storageKeys.practiceV1].includes(
        key as typeof storageKeys.practiceV1,
      );
    if (childScopedKeys.has(shared) || isLessonRecordKey(key) || legacyPractice) keys.push(key);
  }
  return keys;
}

/** Removes a child and their records; the last remaining child cannot be removed. */
export function removeChild(id: string, storage: Storage = window.localStorage) {
  const profiles = childProfiles();
  if (profiles.children.length < 2 || !profiles.children.some((child) => child.id === id))
    return false;
  for (const key of childRecordKeys(id, storage)) storage.removeItem(key);
  const children = profiles.children.filter((child) => child.id !== id);
  save({
    ...profiles,
    children,
    activeId: profiles.activeId === id ? children[0].id : profiles.activeId,
  });
  return true;
}

/** Tests and a restored backup start from what is stored. */
export function resetChildProfilesCache() {
  state = null;
}

export { childStorageKey, mainChildId };
