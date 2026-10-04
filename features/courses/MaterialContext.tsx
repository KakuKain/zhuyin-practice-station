"use client";
import { createContext, useContext } from "react";
import { builtinCatalog, type CatalogLesson } from "./materials";
export const MaterialContext = createContext<readonly CatalogLesson[]>(builtinCatalog);
export function useCatalog() {
  return useContext(MaterialContext);
}
export function useCatalogLesson(index: number) {
  return useCatalog().find((lesson) => lesson.index === index) ?? builtinCatalog[0];
}
