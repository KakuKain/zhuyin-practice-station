"use client";
import { usePersistentState } from "../../lib/storage/usePersistentState";
import {
  materialsStorageKey,
  initialMaterials,
  readMaterials,
  validateMaterials,
  buildCatalog,
  type MaterialsState,
} from "./materials";
import { useCallback, useMemo, type SetStateAction } from "react";
export function useMaterials() {
  const [materialsState, saveMaterials, materialsStorageError] = usePersistentState(
    materialsStorageKey,
    initialMaterials,
    readMaterials,
    validateMaterials,
    { protectUnreadData: true },
  );
  const setMaterialsState = useCallback(
    (action: SetStateAction<MaterialsState>) =>
      saveMaterials((current) =>
        validateMaterials(typeof action === "function" ? action(current) : action),
      ),
    [saveMaterials],
  );
  const catalog = useMemo(() => buildCatalog(materialsState), [materialsState]);
  return { materialsState, setMaterialsState, materialsStorageError, catalog };
}
