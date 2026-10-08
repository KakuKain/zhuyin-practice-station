import { lessons, exercises, courseArtwork, lessonNumerals } from "./course-data";
import { circledVocabulary, reviewVocabulary, type CircledTerm } from "./circled-vocabulary";
import type { LessonExercise, SyllableItem } from "../types";
import { createZhuyinExercise, type LessonContent } from "./lesson-content";
import { storageKeys } from "../../lib/storage/storage-keys";

export const materialsStorageKey = storageKeys.materials;
export const builtinMaterialId = "kang-hsuan-grade1-semester1";
export type CustomLesson = {
  index: number;
  title: string;
  terms: CircledTerm[];
  archived?: boolean;
  revisionOf?: number;
};
export type Material = {
  id: string;
  name: string;
  publisher: string;
  grade: string;
  semester: string;
  lessons: CustomLesson[];
  archived?: boolean;
};
export type MaterialsState = {
  version: 1;
  activeId: string;
  nextIndex: number;
  materials: Material[];
};
export type CatalogLesson = {
  index: number;
  number: string;
  title: string;
  lines: readonly string[];
  symbols: readonly string[];
  terms: readonly CircledTerm[];
  exercise: LessonExercise;
  artwork?: string;
  materialName: string;
  custom: boolean;
  listeningOnly?: boolean;
  reviewRange?: string;
  archived?: boolean;
  content: LessonContent;
};
export const initialMaterials: MaterialsState = {
  version: 1,
  activeId: builtinMaterialId,
  nextIndex: 9,
  materials: [],
};
export const builtinMaterialName = "康軒一年級上";
const titleReadings = [
  ["ㄇㄠ", "ㄇㄧ"],
  ["ㄜˊ", "ㄅㄠˇ", "˙ㄅㄠ"],
  ["ㄏㄜˊ", "ㄇㄚˇ", "ㄏㄢˋ", "ㄏㄜˊ", "ㄌㄧˊ"],
  ["ㄒㄧㄠˋ", "ㄒㄧ", "ㄒㄧ"],
  ["ㄑㄧㄠ", "ㄑㄧㄠ", "ㄅㄢˇ"],
  ["ㄒㄧㄝˋ", "˙ㄒㄧㄝ", "ㄌㄠˇ", "ㄕ"],
  ["ㄍㄨㄟ", "ㄊㄨˋ", "ㄙㄞˋ", "ㄆㄠˇ"],
  ["ㄅㄚˊ", "ㄌㄨㄛˊ", "˙ㄅㄛ"],
  ["ㄉㄨㄥˋ", "ㄨˋ", "ㄎㄨㄤˊ", "ㄏㄨㄢ", "ㄏㄨㄟˋ"],
];
// Append to storage order so existing body ink and favorite positions remain stable.
export const builtinLessons: CatalogLesson[] = lessons.map((lesson, index) => ({
  ...lesson,
  index,
  number: lessonNumerals[index],
  terms: circledVocabulary[index],
  content: {
    textLines: lesson.lines,
    readingLines: exercises[index].lines,
    terms: circledVocabulary[index],
    symbols: lesson.symbols,
  },
  exercise: createZhuyinExercise(
    {
      textLines: lesson.lines,
      readingLines: [
        ...exercises[index].lines,
        Array.from(lesson.title, (character, i) => ({
          character,
          zhuyin: titleReadings[index][i],
        })),
      ],
      terms: circledVocabulary[index],
      symbols: lesson.symbols,
    },
    exercises[index].questions,
  ),
  artwork: courseArtwork[index],
  materialName: builtinMaterialName,
  custom: false,
}));
// Negative review identities leave all existing lesson and imported-material IDs intact.
export const builtinReviews: CatalogLesson[] = reviewVocabulary.map((terms, index) => {
  const number = ["一", "二", "三"][index];
  const content: LessonContent = { textLines: [], readingLines: [], terms, symbols: [] };
  return {
    index: -(index + 1),
    number,
    title: `複習${number}`,
    lines: [],
    symbols: [],
    terms,
    content,
    exercise: createZhuyinExercise(content),
    materialName: builtinMaterialName,
    custom: false,
    listeningOnly: true,
    reviewRange: `第${index * 3 + 1}～${index * 3 + 3}課`,
  };
});
export const builtinCatalog: CatalogLesson[] = builtinLessons.flatMap((lesson, index) =>
  (index + 1) % 3 === 0 ? [lesson, builtinReviews[Math.floor(index / 3)]] : [lesson],
);
export const validSyllable = (text: string) => /^(?:˙[ㄅ-ㄩ]{1,3}|[ㄅ-ㄩ]{1,3}[ˊˇˋ]?)$/.test(text);
export function validateTerms(raw: unknown): CircledTerm[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100)
    throw new Error("每課請放入 1～100 個字詞。");
  const terms: CircledTerm[] = raw.map((value) => {
    if (!value || typeof value !== "object") throw new Error("題庫字詞格式不正確。");
    const { text, syllables } = value as CircledTerm;
    if (
      typeof text !== "string" ||
      !/^[\p{Script=Han}]{1,8}$/u.test(text) ||
      !Array.isArray(syllables) ||
      syllables.length !== Array.from(text).length ||
      !syllables.every((s) => typeof s === "string" && validSyllable(s))
    )
      throw new Error("每個字詞需要對應的完整注音；每詞最多 8 個字。");
    return { text, syllables: [...syllables] };
  });
  if (terms.reduce((count, term) => count + term.syllables.length, 0) > 200)
    throw new Error("每課最多 200 個字，請分成兩課。");
  if (new Set(terms.map((term) => term.text)).size !== terms.length)
    throw new Error("同一課有重複字詞，請先合併。");
  return terms;
}
const shortText = (value: unknown, max = 60): string => {
  if (typeof value !== "string" || value.length > max)
    throw new Error("教材文字格式不正確或過長。");
  return value.trim();
};
export function validateMaterials(raw: unknown): MaterialsState {
  if (!raw || typeof raw !== "object") throw new Error("教材檔案格式不正確。");
  const value = raw as MaterialsState;
  if (value.version !== 1 || !Array.isArray(value.materials) || value.materials.length > 30)
    throw new Error("不支援這個教材檔案。");
  const indexes = new Set<number>();
  const ids = new Set<string>();
  const materials = value.materials.map((item) => {
    if (!item || typeof item !== "object") throw new Error("教材格式不正確。");
    const id = shortText(item.id, 100);
    const name = shortText(item.name);
    if (
      !id ||
      id === builtinMaterialId ||
      ids.has(id) ||
      !name ||
      !Array.isArray(item.lessons) ||
      item.lessons.length < 1 ||
      item.lessons.length > 50
    )
      throw new Error("教材名稱或課次格式不正確。");
    ids.add(id);
    return {
      id,
      name,
      publisher: shortText(item.publisher),
      grade: shortText(item.grade),
      semester: shortText(item.semester),
      ...(item.archived === true ? { archived: true } : {}),
      lessons: item.lessons.map((lesson) => {
        if (!lesson || typeof lesson !== "object") throw new Error("課次格式不正確。");
        if (!Number.isSafeInteger(lesson.index) || lesson.index < 9 || indexes.has(lesson.index))
          throw new Error("課次編號格式不正確。");
        indexes.add(lesson.index);
        const title = shortText(lesson.title);
        if (!title) throw new Error("請填寫課名。");
        return {
          index: lesson.index,
          title,
          terms: validateTerms(lesson.terms),
          ...(lesson.archived === true ? { archived: true } : {}),
          ...(Number.isSafeInteger(lesson.revisionOf) && (lesson.revisionOf ?? 0) >= 9
            ? { revisionOf: lesson.revisionOf }
            : {}),
        };
      }),
    };
  });
  return {
    version: 1,
    materials,
    activeId: materials.some((item) => item.id === value.activeId && !item.archived)
      ? value.activeId
      : builtinMaterialId,
    nextIndex: Math.max(
      9,
      Number.isSafeInteger(value.nextIndex) ? value.nextIndex : 9,
      ...[...indexes].map((index) => index + 1),
    ),
  };
}
export function readMaterials(storage: Storage): MaterialsState {
  const raw = storage.getItem(materialsStorageKey);
  return raw ? validateMaterials(JSON.parse(raw)) : initialMaterials;
}
export function buildCatalog(state: MaterialsState): CatalogLesson[] {
  return [
    ...builtinCatalog,
    ...state.materials.flatMap((material) =>
      material.lessons.map((lesson) => {
        const lines: SyllableItem[][] = lesson.terms.map((term) =>
          Array.from(term.text, (character, i) => ({ character, zhuyin: term.syllables[i] })),
        );
        const content: LessonContent = {
          textLines: lesson.terms.map((term) => term.text),
          readingLines: lines,
          terms: lesson.terms,
          symbols: [],
        };
        return {
          ...lesson,
          number: String(
            material.lessons
              .filter((item) => !item.archived)
              .findIndex((item) => item.index === lesson.index) + 1 ||
              material.lessons.findIndex((item) => item.index === lesson.index) + 1,
          ),
          lines: lesson.terms.map((term) => term.text),
          symbols: [],
          content,
          exercise: createZhuyinExercise(content),
          archived: material.archived || lesson.archived,
          materialName: material.name,
          custom: true,
        };
      }),
    ),
  ];
}
export function storedCatalog(storage?: Storage): CatalogLesson[] {
  try {
    return buildCatalog(readMaterials(storage ?? window.localStorage));
  } catch {
    return builtinCatalog;
  }
}
export function catalogExercises(catalog = storedCatalog()): Record<number, LessonExercise> {
  return Object.fromEntries(catalog.map((lesson) => [lesson.index, lesson.exercise]));
}
const knownReadings = new Map<string, string>();
for (const lesson of builtinCatalog)
  for (const item of lesson.exercise.lines.flat())
    if (!knownReadings.has(item.character)) knownReadings.set(item.character, item.zhuyin);
for (const lesson of builtinCatalog)
  for (const term of lesson.terms) knownReadings.set(term.text, term.syllables.join(" "));
export type ImportRow = { text: string; reading: string; included: boolean };
export function parseWordList(text: string): ImportRow[] {
  if (text.length > 20000) throw new Error("內容太長，請分批貼上。");
  const entries = text
    .split(/[\n、，,；;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!entries.length || entries.length > 100)
    throw new Error("請貼上 1～100 個字詞，以換行或頓號分隔。");
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const match = entry.match(/^([\p{Script=Han}]{1,8})(?:\s*[（(]?\s*([ㄅ-ㄩ˙ˊˇˋ\s|]+)[）)]?)?$/u);
    if (!match) throw new Error(`「${entry.slice(0, 20)}」無法解析，請每行放一個字詞，最多 8 字。`);
    if (seen.has(match[1])) return [];
    seen.add(match[1]);
    const explicit = match[2]?.trim().replaceAll("|", " ");
    const reading =
      explicit ??
      knownReadings.get(match[1]) ??
      Array.from(match[1], (char) => knownReadings.get(char) ?? "").join(" ");
    return [{ text: match[1], reading, included: true }];
  });
}
export function rowsToTerms(rows: ImportRow[]): CircledTerm[] {
  return validateTerms(
    rows
      .filter((row) => row.included)
      .map((row) => ({
        text: row.text,
        syllables: row.reading
          .trim()
          .split(/[\s|]+/)
          .map((s) => (s.endsWith("˙") ? `˙${s.slice(0, -1)}` : s)),
      })),
  );
}
export function appendImportedMaterials(
  state: MaterialsState,
  imported: Material[],
): MaterialsState {
  if (state.materials.length + imported.length > 30) throw new Error("最多可儲存 30 組教材。");
  let nextIndex = Math.max(
    state.nextIndex,
    9,
    ...state.materials.flatMap((m) => m.lessons.map((l) => l.index + 1)),
  );
  const materials = imported.map((material) => ({
    ...material,
    id: crypto.randomUUID(),
    lessons: material.lessons.map((lesson) => ({ ...lesson, index: nextIndex++ })),
  }));
  return {
    ...state,
    nextIndex,
    activeId: materials[0]?.id ?? state.activeId,
    materials: [...state.materials, ...materials],
  };
}
export function parseMaterialFile(text: string): Material[] {
  const value = JSON.parse(text);
  if (
    value?.format !== "zhuyin-materials" ||
    value.version !== 1 ||
    !Array.isArray(value.materials) ||
    !value.materials.length
  )
    throw new Error("請選擇本站匯出的題庫 JSON 檔。");
  return validateMaterials({ version: 1, activeId: builtinMaterialId, materials: value.materials })
    .materials;
}
export function serializeMaterialFile(material: Material): string {
  const materials = validateMaterials({
    version: 1,
    activeId: material.id,
    materials: [material],
  }).materials;
  return JSON.stringify({ format: "zhuyin-materials", version: 1, materials }, null, 2);
}
