import {
  builtinMaterialId,
  validateMaterials,
  type CustomLesson,
  type Material,
  type MaterialsState,
} from "./materials";

export function updateMaterial(
  state: MaterialsState,
  id: string,
  patch: Pick<Material, "name" | "publisher" | "grade" | "semester">,
) {
  if (!state.materials.some((item) => item.id === id && !item.archived))
    throw new Error("找不到這組教材。");
  return validateMaterials({
    ...state,
    materials: state.materials.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  });
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function moveLesson(
  state: MaterialsState,
  materialId: string,
  index: number,
  direction: -1 | 1,
) {
  return validateMaterials({
    ...state,
    materials: state.materials.map((material) => {
      if (material.id !== materialId) return material;
      const visible = material.lessons.filter((lesson) => !lesson.archived);
      const from = visible.findIndex((lesson) => lesson.index === index);
      const reordered = moveItem(visible, from, from + direction);
      return {
        ...material,
        lessons: [...reordered, ...material.lessons.filter((lesson) => lesson.archived)],
      };
    }),
  });
}

export function archiveMaterial(state: MaterialsState, id: string, archived: boolean) {
  return validateMaterials({
    ...state,
    activeId: archived && state.activeId === id ? builtinMaterialId : state.activeId,
    materials: state.materials.map((material) =>
      material.id === id ? { ...material, archived } : material,
    ),
  });
}
export function archiveLesson(
  state: MaterialsState,
  materialId: string,
  index: number,
  archived: boolean,
) {
  return validateMaterials({
    ...state,
    materials: state.materials.map((material) =>
      material.id !== materialId
        ? material
        : {
            ...material,
            lessons: material.lessons.map((lesson) =>
              lesson.index === index ? { ...lesson, archived } : lesson,
            ),
          },
    ),
  });
}

export function replaceLesson(
  state: MaterialsState,
  materialId: string,
  index: number,
  patch: Pick<CustomLesson, "title" | "terms">,
) {
  const material = state.materials.find((item) => item.id === materialId && !item.archived);
  const old = material?.lessons.find((item) => item.index === index && !item.archived);
  if (!old || !material) throw new Error("找不到這一課。");
  const contentChanged = JSON.stringify(old.terms) !== JSON.stringify(patch.terms);
  if (contentChanged && material.lessons.length >= 50)
    throw new Error("教材已達 50 個課次版本，請另建教材。");
  const nextIndex = state.nextIndex;
  const lesson = {
    ...old,
    ...patch,
    ...(contentChanged ? { index: nextIndex, revisionOf: old.index } : {}),
  };
  const lessons = material.lessons.flatMap((item) =>
    item.index !== index
      ? [item]
      : contentChanged
        ? [lesson, { ...old, archived: true }]
        : [lesson],
  );
  return {
    state: validateMaterials({
      ...state,
      nextIndex: contentChanged ? nextIndex + 1 : state.nextIndex,
      materials: state.materials.map((item) =>
        item.id === materialId ? { ...item, lessons } : item,
      ),
    }),
    contentChanged,
  };
}

export function moveMaterial(state: MaterialsState, id: string, direction: -1 | 1) {
  const visible = state.materials.filter((material) => !material.archived);
  const from = visible.findIndex((material) => material.id === id);
  return validateMaterials({
    ...state,
    materials: [
      ...moveItem(visible, from, from + direction),
      ...state.materials.filter((material) => material.archived),
    ],
  });
}
