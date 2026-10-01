import type { FillFavorite } from "../types";
import { fillFavoriteKey } from "./practice-storage";

export function updateFillCollection(
  current: FillFavorite[],
  target: FillFavorite,
  patch: Partial<Pick<FillFavorite, "isFavorite" | "status">>,
): FillFavorite[] {
  const key = fillFavoriteKey(target);
  const previous = current.find((item) => fillFavoriteKey(item) === key);
  const next = { ...target, ...previous, isFavorite: previous?.isFavorite !== false, ...patch };
  return [...current.filter((item) => fillFavoriteKey(item) !== key), next].filter(
    (item) => item.isFavorite !== false || item.status === "needs_rewrite",
  );
}
