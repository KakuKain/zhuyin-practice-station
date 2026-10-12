import { usePersistentState } from "../../lib/storage/usePersistentState";
import {
  materialsStorageKey,
  initialMaterials,
  readMaterials,
  validateMaterials,
  buildCatalog,
  builtinMaterialId,
  type MaterialsState,
} from "./materials";
import { useCallback, useMemo, type SetStateAction } from "react";
import {
  activeChildId,
  mainChildId,
  updateChild,
  useChildProfiles,
} from "../../lib/storage/child-profiles";

/** A child's own material while it is still available, otherwise the family's choice. */
export function withChildMaterial(state: MaterialsState, materialId?: string): MaterialsState {
  const available =
    materialId === builtinMaterialId ||
    state.materials.some((item) => item.id === materialId && !item.archived);
  return materialId && available && materialId !== state.activeId
    ? { ...state, activeId: materialId }
    : state;
}

/**
 * Materials are shared by the family; which one is open belongs to each child. Choosing one
 * records it on the child, and only the first child's choice also moves the family default.
 */
export function useMaterials() {
  const [storedMaterials, saveMaterials, materialsStorageError] = usePersistentState(
    materialsStorageKey,
    initialMaterials,
    readMaterials,
    validateMaterials,
    { protectUnreadData: true },
  );
  const profiles = useChildProfiles();
  const materialId = profiles.children.find((child) => child.id === profiles.activeId)?.materialId;
  const materialsState = useMemo(
    () => withChildMaterial(storedMaterials, materialId),
    [storedMaterials, materialId],
  );
  const setMaterialsState = useCallback(
    (action: SetStateAction<MaterialsState>) =>
      saveMaterials((stored) => {
        const current = withChildMaterial(stored, materialId);
        const next = validateMaterials(typeof action === "function" ? action(current) : action);
        if (next.activeId === current.activeId) return next;
        const childId = activeChildId();
        updateChild(childId, { materialId: next.activeId });
        return childId === mainChildId
          ? next
          : validateMaterials({ ...next, activeId: stored.activeId });
      }),
    [saveMaterials, materialId],
  );
  const catalog = useMemo(() => buildCatalog(materialsState), [materialsState]);
  /** What a child who never chose a material sees. */
  const familyMaterialId = storedMaterials.activeId;
  return { materialsState, setMaterialsState, materialsStorageError, catalog, familyMaterialId };
}
