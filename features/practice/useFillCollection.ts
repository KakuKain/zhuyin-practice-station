import { useEffect, useRef, useState } from "react";
import { builtinCatalog, type CatalogLesson } from "../courses/materials";
import { usePersistentState } from "../../lib/storage/usePersistentState";
import type { FillFavorite, StateSetter, SyllableItem } from "../types";
import {
  fillFavoriteKey,
  fillFavoritesStorageKey,
  readFillFavorites,
  validatedFillFavorites,
} from "./practice-storage";
import { updateFillCollection } from "./fill-collection-state";

export function useFillCollection(
  lessonIndex: number,
  items: SyllableItem[],
  setNotice: StateSetter<string>,
  catalog: CatalogLesson[] = builtinCatalog,
) {
  const catalogRef = useRef(catalog);
  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);
  const [fillFavorites, setFillFavorites, favoritesStorageError] = usePersistentState<
    FillFavorite[]
  >(
    fillFavoritesStorageKey,
    [],
    (storage) => readFillFavorites(storage, catalogRef.current, true),
    (raw) => validatedFillFavorites(raw, catalogRef.current, true),
  );
  const [unfavoriteFillUndo, setUnfavoriteFillUndo] = useState<FillFavorite | null>(null);
  const toggleFillFavorite = (index: number) => {
    const target: FillFavorite = {
      lessonIndex,
      ...items[index],
      positions: [index],
      status: "review_later",
      isFavorite: true,
    };
    const key = fillFavoriteKey(target);
    setFillFavorites((current) => {
      const existing = current.find((item) => fillFavoriteKey(item) === key);
      if (!existing || existing.isFavorite === false)
        return updateFillCollection(
          current,
          { ...target, positions: existing?.positions ?? target.positions },
          { isFavorite: true },
        );
      const positions = existing.positions.includes(index)
        ? existing.positions.filter((position) => position !== index)
        : [...existing.positions, index].sort((a, b) => a - b);
      return positions.length
        ? current.map((item) => (fillFavoriteKey(item) === key ? { ...item, positions } : item))
        : updateFillCollection(current, existing, { isFavorite: false });
    });
  };
  const unfavoriteFill = (favorite: FillFavorite) => {
    setFillFavorites((current) => updateFillCollection(current, favorite, { isFavorite: false }));
    setUnfavoriteFillUndo(favorite);
    setNotice(`已取消收藏「${favorite.character}」；待補強仍會保留。`);
  };
  const markFillMastered = (favorite: FillFavorite) => {
    setFillFavorites((current) => updateFillCollection(current, favorite, { status: "mastered" }));
    setUnfavoriteFillUndo(null);
    setNotice(`家長已確認「${favorite.character}」掌握，已移出待補強；收藏仍會保留。`);
  };
  const saveFillFavorite = (favorite: FillFavorite) => {
    setFillFavorites((current) => updateFillCollection(current, favorite, { isFavorite: true }));
    setUnfavoriteFillUndo(null);
  };
  const undoFillUnfavorite = () => {
    if (!unfavoriteFillUndo) return;
    setFillFavorites((current) =>
      updateFillCollection(current, unfavoriteFillUndo, { isFavorite: true }),
    );
    setUnfavoriteFillUndo(null);
    setNotice("已恢復收藏。");
  };
  return {
    fillFavorites,
    setFillFavorites,
    favoritesStorageError,
    toggleFillFavorite,
    unfavoriteFill,
    saveFillFavorite,
    markFillMastered,
    unfavoriteFillUndo,
    setUnfavoriteFillUndo,
    undoFillUnfavorite,
  };
}
