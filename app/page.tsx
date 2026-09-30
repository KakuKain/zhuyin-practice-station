"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, Gear, Headphones, Info, MusicNotes, PencilLine, Play, Question, SpeakerHigh, Star, Timer } from "@phosphor-icons/react";
import { circledVocabulary } from "./circled-vocabulary";

type View = "courses" | "practice" | "more" | "lesson" | "fill" | "fill-practice" | "listen" | "result";
type ListenPhase = "ready" | "active" | "review" | "remediation_offer" | "choice" | "retry_ready" | "retry";
type ParentResult = "correct" | "needs_review" | null;
type PreviewMode = "annotated" | "zhuyin";
type SyllableItem = { character: string; zhuyin: string };
type ListenCategory = "symbols" | "characters" | "words";
type ListeningSeed = { category: ListenCategory; answer: string; audioText: string; distractors: readonly string[] };
type ListeningQuestion = ListeningSeed & { id: string; choices: readonly string[] };
type LessonExercise = { lines: readonly (readonly SyllableItem[])[]; questions: readonly ListeningSeed[] };
type InkPoint = { x: number; y: number };
type InkStroke = InkPoint[];
type FillDraft = { version: 1; lessonIndex: number; savedAt: number; strokes: Record<number, InkStroke[]>; pendingCells: Record<number, InkStroke[]>; needsRetry: number[]; reviewOpen: boolean };
type SavedQuestion = { lessonIndex: number; questionId: string; needsPractice?: boolean };
type FillFavorite = { lessonIndex: number; character: string; zhuyin: string; positions: number[]; status: "needs_rewrite" | "review_later" };
type PracticeState = { savedQuestions: SavedQuestion[]; recentLesson: number | null; completedSessions: number };
type ListeningSettings = { repeatCount: 1 | 2 | 3; intervalSeconds: 5 | 8 | 10 };
type MorePanel = "home" | "help" | "listening" | "versions";
const practiceStorageKey = "zhuyin-practice-state-v3";
const fillFavoritesStorageKey = "zhuyin-fill-favorites-v1";
const fillDraftStorageKey = (lessonIndex: number) => `zhuyin-fill-draft-v1-${lessonIndex}`;
const fillDraftCookieKey = (lessonIndex: number) => `zhuyin_fill_draft_${lessonIndex}`;
const validInkStrokes = (value: unknown): value is InkStroke[] => Array.isArray(value) && value.length <= 200 && value.every((stroke) => Array.isArray(stroke) && stroke.length > 0 && stroke.length <= 2000 && stroke.every((point) => point && typeof point.x === "number" && typeof point.y === "number" && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100));

function readFillDraft(lessonIndex: number, cellCount: number): FillDraft | null {
  try {
    const raw = window.localStorage.getItem(fillDraftStorageKey(lessonIndex));
    if (!raw) return null;
    const draft: FillDraft = JSON.parse(raw);
    if (draft?.version !== 1 || draft.lessonIndex !== lessonIndex || !draft.strokes || typeof draft.strokes !== "object" || Array.isArray(draft.strokes)) return null;
    if (!Object.entries(draft.strokes).every(([key, strokes]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < cellCount && validInkStrokes(strokes))) return null;
    if (!draft.pendingCells || typeof draft.pendingCells !== "object" || Array.isArray(draft.pendingCells) || !Object.entries(draft.pendingCells).every(([key, strokes]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < cellCount && validInkStrokes(strokes))) return null;
    if (!Array.isArray(draft.needsRetry) || !draft.needsRetry.every((index) => Number.isInteger(index) && index >= 0 && index < cellCount) || typeof draft.reviewOpen !== "boolean") return null;
    // An interrupted save can leave a completed cell in both collections.
    // The duplicate pending copy must not mask the completed preview.
    for (const [key, pending] of Object.entries(draft.pendingCells)) {
      if (draft.strokes[Number(key)] && JSON.stringify(draft.strokes[Number(key)]) === JSON.stringify(pending)) delete draft.pendingCells[Number(key)];
    }
    return Object.keys(draft.strokes).length || Object.keys(draft.pendingCells).length ? draft : null;
  } catch { return null; }
}

function writeFillDraft(draft: FillDraft) {
  window.localStorage.setItem(fillDraftStorageKey(draft.lessonIndex), JSON.stringify(draft));
  document.cookie = `${fillDraftCookieKey(draft.lessonIndex)}=1; Max-Age=2592000; Path=/; SameSite=Lax`;
}

function clearFillDraft(lessonIndex: number) {
  window.localStorage.removeItem(fillDraftStorageKey(lessonIndex));
  document.cookie = `${fillDraftCookieKey(lessonIndex)}=; Max-Age=0; Path=/; SameSite=Lax`;
}
const listeningSettingsStorageKey = "zhuyin-listening-settings-v1";
const defaultListeningSettings: ListeningSettings = { repeatCount: 2, intervalSeconds: 8 };
const previousPracticeStorageKey = "zhuyin-practice-state-v2";
const firstPracticeStorageKey = "zhuyin-practice-state-v1";
const lessonNumerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

const lessons = [
  { title: "貓咪", lines: ["咪咪咪", "咪咪咪", "逼", "貓咪弟弟", "跑第一"], symbols: ["ㄅ", "ㄆ", "ㄇ", "ㄉ", "ㄧ", "ㄠ"] },
  { title: "鵝寶寶", lines: ["鵝鵝鵝", "鵝鵝鵝", "哈哈哈", "好得意", "孵出", "五隻鵝寶寶"], symbols: ["ㄈ", "ㄏ", "ㄓ", "ㄔ", "ㄨ", "ㄚ", "ㄜ"] },
  { title: "河馬和河狸", lines: ["河馬要去泡澡", "半路遇到河狸", "喔", "河狸", "忙著築巢"], symbols: ["ㄌ", "ㄑ", "ㄗ", "ㄩ", "ㄛ", "ㄢ", "ㄤ"] },
  { title: "笑嘻嘻", lines: ["背著書包", "手拉手", "背著書包", "笑嘻嘻", "一二一", "好歡喜"], symbols: ["ㄒ", "ㄕ", "ㄟ", "ㄡ", "ㄦ", "ㄧㄠ", "ㄨㄢ"] },
  { title: "翹翹板", lines: ["好朋友", "一起來玩", "翹翹板", "上上下下", "高高低低", "好像小鳥", "飛飛飛"], symbols: ["ㄋ", "ㄍ", "ㄞ", "ㄥ", "ㄧㄚ", "ㄧㄡ", "ㄧㄤ"] },
  { title: "謝謝老師", lines: ["我要送老師", "一朵小紅花", "謝謝老師", "教我讀書", "也謝謝老師", "教我畫畫"], symbols: ["ㄐ", "ㄙ", "ㄝ", "ㄧㄝ", "ㄨㄚ", "ㄨㄛ", "ㄨㄥ"] },
  { title: "龜兔賽跑", lines: ["烏龜兔子來比賽", "看誰跑得快", "兔子領先", "哈哈笑", "樹下睡午覺", "烏龜落後", "不氣餒", "跟在後面", "追追追"], symbols: ["ㄊ", "ㄎ", "ㄣ", "ㄧㄢ", "ㄧㄥ", "ㄨㄞ", "ㄨㄟ"] },
  { title: "拔蘿蔔", lines: ["菜園裡", "長出大蘿蔔", "兔子拔不動", "大家快快來", "大象拉著黃牛", "黃牛拉著浣熊", "浣熊拉著兔子", "嘿喲嘿喲", "好熱鬧", "捲起袖子", "大家一起拔蘿蔔"], symbols: ["ㄖ", "ㄘ", "ㄧㄛ", "ㄨㄤ", "ㄩㄢ", "ㄩㄥ"] },
  { title: "動物狂歡會", lines: ["山崖下", "動物狂歡會", "大家開心來慶祝", "小熊滾大球", "馴鹿敲大鼓", "孔雀變魔術", "青蛙大合唱", "嘓嘓嘓 咚咚咚", "大家的表演", "真精彩"], symbols: ["ㄧㄞ", "ㄧㄣ", "ㄨㄣ", "ㄩㄝ", "ㄩㄣ"] },
] as const;
const courseArtwork = ["cat", "swan-riding-family", "river", "happy", "seesaw", "teacher", "race", "radish", "festival"] as const;

// The font's first alternate reading is selected with IVS U+E01E1 in both preview modes.
const previewPronunciationVariants: Record<number, Record<number, Record<number, string>>> = {
  0: { 3: { 3: "\u{E01E1}" } }, // 貓咪弟弟：第二個「弟」讀輕聲
  1: { 5: { 4: "\u{E01E1}" } }, // 五隻鵝寶寶：第二個「寶」依課本讀輕聲
  3: { 0: { 0: "\u{E01E1}" }, 2: { 0: "\u{E01E1}" } }, // 背著書包：背讀ㄅㄟ
  4: { 1: { 0: "\u{E01E2}" } }, // 一起：一讀ㄧˋ
  5: { 1: { 0: "\u{E01E2}" }, 2: { 1: "\u{E01E1}" }, 4: { 2: "\u{E01E1}" } }, // 一朵、謝謝
  6: { 0: { 3: "\u{E01E1}" }, 1: { 3: "\u{E01E1}" }, 2: { 1: "\u{E01E1}" }, 4: { 4: "\u{E01E1}" }, 6: { 0: "\u{E01E1}" } }, // 子、得、覺、不
  7: { 1: { 0: "\u{E01E1}", 4: "\u{E01E1}" }, 2: { 1: "\u{E01E1}", 3: "\u{E01E1}" }, 6: { 5: "\u{E01E1}" }, 9: { 3: "\u{E01E1}" }, 10: { 2: "\u{E01E2}", 6: "\u{E01E1}" } }, // 長、蔔、子、不、一
};

const firstLessonLines = [
  [{ character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }],
  [{ character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }, { character: "咪", zhuyin: "ㄇㄧ" }],
  [{ character: "逼", zhuyin: "ㄅㄧ" }],
  [{ character: "貓", zhuyin: "ㄇㄠ" }, { character: "咪", zhuyin: "ㄇㄧ" }, { character: "弟", zhuyin: "ㄉㄧˋ" }, { character: "弟", zhuyin: "˙ㄉㄧ" }],
  [{ character: "跑", zhuyin: "ㄆㄠˇ" }, { character: "第", zhuyin: "ㄉㄧˋ" }, { character: "一", zhuyin: "ㄧ" }],
] as const;
const secondLessonLines = [
  [{ character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }],
  [{ character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }, { character: "鵝", zhuyin: "ㄜˊ" }],
  [{ character: "哈", zhuyin: "ㄏㄚ" }, { character: "哈", zhuyin: "ㄏㄚ" }, { character: "哈", zhuyin: "ㄏㄚ" }],
  [{ character: "好", zhuyin: "ㄏㄠˇ" }, { character: "得", zhuyin: "ㄉㄜˊ" }, { character: "意", zhuyin: "ㄧˋ" }],
  [{ character: "孵", zhuyin: "ㄈㄨ" }, { character: "出", zhuyin: "ㄔㄨ" }],
  [{ character: "五", zhuyin: "ㄨˇ" }, { character: "隻", zhuyin: "ㄓ" }, { character: "鵝", zhuyin: "ㄜˊ" }, { character: "寶", zhuyin: "ㄅㄠˇ" }, { character: "寶", zhuyin: "˙ㄅㄠ" }],
] as const;
const thirdLessonLines = [
  [{ character: "河", zhuyin: "ㄏㄜˊ" }, { character: "馬", zhuyin: "ㄇㄚˇ" }, { character: "要", zhuyin: "ㄧㄠˋ" }, { character: "去", zhuyin: "ㄑㄩˋ" }, { character: "泡", zhuyin: "ㄆㄠˋ" }, { character: "澡", zhuyin: "ㄗㄠˇ" }],
  [{ character: "半", zhuyin: "ㄅㄢˋ" }, { character: "路", zhuyin: "ㄌㄨˋ" }, { character: "遇", zhuyin: "ㄩˋ" }, { character: "到", zhuyin: "ㄉㄠˋ" }, { character: "河", zhuyin: "ㄏㄜˊ" }, { character: "狸", zhuyin: "ㄌㄧˊ" }],
  [{ character: "喔", zhuyin: "ㄛ" }],
  [{ character: "河", zhuyin: "ㄏㄜˊ" }, { character: "狸", zhuyin: "ㄌㄧˊ" }],
  [{ character: "忙", zhuyin: "ㄇㄤˊ" }, { character: "著", zhuyin: "˙ㄓㄜ" }, { character: "築", zhuyin: "ㄓㄨˊ" }, { character: "巢", zhuyin: "ㄔㄠˊ" }],
] as const;
const fourthLessonLines = [
  [{ character: "背", zhuyin: "ㄅㄟ" }, { character: "著", zhuyin: "˙ㄓㄜ" }, { character: "書", zhuyin: "ㄕㄨ" }, { character: "包", zhuyin: "ㄅㄠ" }],
  [{ character: "手", zhuyin: "ㄕㄡˇ" }, { character: "拉", zhuyin: "ㄌㄚ" }, { character: "手", zhuyin: "ㄕㄡˇ" }],
  [{ character: "背", zhuyin: "ㄅㄟ" }, { character: "著", zhuyin: "˙ㄓㄜ" }, { character: "書", zhuyin: "ㄕㄨ" }, { character: "包", zhuyin: "ㄅㄠ" }],
  [{ character: "笑", zhuyin: "ㄒㄧㄠˋ" }, { character: "嘻", zhuyin: "ㄒㄧ" }, { character: "嘻", zhuyin: "ㄒㄧ" }],
  [{ character: "一", zhuyin: "ㄧ" }, { character: "二", zhuyin: "ㄦˋ" }, { character: "一", zhuyin: "ㄧ" }],
  [{ character: "好", zhuyin: "ㄏㄠˇ" }, { character: "歡", zhuyin: "ㄏㄨㄢ" }, { character: "喜", zhuyin: "ㄒㄧˇ" }],
] as const;

function annotateLessonLines(lines: readonly string[], pronunciations: readonly (readonly string[])[]): SyllableItem[][] {
  if (lines.length !== pronunciations.length) throw new Error("課文行數與注音行數不一致");
  return lines.map((line, lineIndex) => {
    const characters = Array.from(line).filter((character) => character.trim() !== "");
    const sounds = pronunciations[lineIndex];
    if (characters.length !== sounds.length) throw new Error(`第 ${lineIndex + 1} 行的課文與注音格數不一致`);
    return characters.map((character, index) => ({ character, zhuyin: sounds[index] }));
  });
}

const fifthLessonLines = annotateLessonLines(lessons[4].lines, [
  ["ㄏㄠˇ", "ㄆㄥˊ", "ㄧㄡˇ"],
  ["ㄧˋ", "ㄑㄧˇ", "ㄌㄞˊ", "ㄨㄢˊ"],
  ["ㄑㄧㄠˋ", "ㄑㄧㄠˋ", "ㄅㄢˇ"],
  ["ㄕㄤˋ", "ㄕㄤˋ", "ㄒㄧㄚˋ", "ㄒㄧㄚˋ"],
  ["ㄍㄠ", "ㄍㄠ", "ㄉㄧ", "ㄉㄧ"],
  ["ㄏㄠˇ", "ㄒㄧㄤˋ", "ㄒㄧㄠˇ", "ㄋㄧㄠˇ"],
  ["ㄈㄟ", "ㄈㄟ", "ㄈㄟ"],
]);
const sixthLessonLines = annotateLessonLines(lessons[5].lines, [
  ["ㄨㄛˇ", "ㄧㄠˋ", "ㄙㄨㄥˋ", "ㄌㄠˇ", "ㄕ"],
  ["ㄧˋ", "ㄉㄨㄛˇ", "ㄒㄧㄠˇ", "ㄏㄨㄥˊ", "ㄏㄨㄚ"],
  ["ㄒㄧㄝˋ", "˙ㄒㄧㄝ", "ㄌㄠˇ", "ㄕ"],
  ["ㄐㄧㄠˋ", "ㄨㄛˇ", "ㄉㄨˊ", "ㄕㄨ"],
  ["ㄧㄝˇ", "ㄒㄧㄝˋ", "˙ㄒㄧㄝ", "ㄌㄠˇ", "ㄕ"],
  ["ㄐㄧㄠˋ", "ㄨㄛˇ", "ㄏㄨㄚˋ", "ㄏㄨㄚˋ"],
]);
const seventhLessonLines = annotateLessonLines(lessons[6].lines, [
  ["ㄨ", "ㄍㄨㄟ", "ㄊㄨˋ", "˙ㄗ", "ㄌㄞˊ", "ㄅㄧˇ", "ㄙㄞˋ"],
  ["ㄎㄢˋ", "ㄕㄟˊ", "ㄆㄠˇ", "˙ㄉㄜ", "ㄎㄨㄞˋ"],
  ["ㄊㄨˋ", "˙ㄗ", "ㄌㄧㄥˇ", "ㄒㄧㄢ"],
  ["ㄏㄚ", "ㄏㄚ", "ㄒㄧㄠˋ"],
  ["ㄕㄨˋ", "ㄒㄧㄚˋ", "ㄕㄨㄟˋ", "ㄨˇ", "ㄐㄧㄠˋ"],
  ["ㄨ", "ㄍㄨㄟ", "ㄌㄨㄛˋ", "ㄏㄡˋ"],
  ["ㄅㄨˊ", "ㄑㄧˋ", "ㄋㄟˇ"],
  ["ㄍㄣ", "ㄗㄞˋ", "ㄏㄡˋ", "ㄇㄧㄢˋ"],
  ["ㄓㄨㄟ", "ㄓㄨㄟ", "ㄓㄨㄟ"],
]);
const eighthLessonLines = annotateLessonLines(lessons[7].lines, [
  ["ㄘㄞˋ", "ㄩㄢˊ", "ㄌㄧˇ"],
  ["ㄓㄤˇ", "ㄔㄨ", "ㄉㄚˋ", "ㄌㄨㄛˊ", "˙ㄅㄛ"],
  ["ㄊㄨˋ", "˙ㄗ", "ㄅㄚˊ", "ㄅㄨˊ", "ㄉㄨㄥˋ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "ㄎㄨㄞˋ", "ㄎㄨㄞˋ", "ㄌㄞˊ"],
  ["ㄉㄚˋ", "ㄒㄧㄤˋ", "ㄌㄚ", "˙ㄓㄜ", "ㄏㄨㄤˊ", "ㄋㄧㄡˊ"],
  ["ㄏㄨㄤˊ", "ㄋㄧㄡˊ", "ㄌㄚ", "˙ㄓㄜ", "ㄨㄢˇ", "ㄒㄩㄥˊ"],
  ["ㄨㄢˇ", "ㄒㄩㄥˊ", "ㄌㄚ", "˙ㄓㄜ", "ㄊㄨˋ", "˙ㄗ"],
  ["ㄏㄟ", "ㄧㄛ", "ㄏㄟ", "ㄧㄛ"],
  ["ㄏㄠˇ", "ㄖㄜˋ", "ㄋㄠˋ"],
  ["ㄐㄩㄢˇ", "ㄑㄧˇ", "ㄒㄧㄡˋ", "˙ㄗ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "ㄧˋ", "ㄑㄧˇ", "ㄅㄚˊ", "ㄌㄨㄛˊ", "˙ㄅㄛ"],
]);
const ninthLessonLines = annotateLessonLines(lessons[8].lines, [
  ["ㄕㄢ", "ㄧㄞˊ", "ㄒㄧㄚˋ"],
  ["ㄉㄨㄥˋ", "ㄨˋ", "ㄎㄨㄤˊ", "ㄏㄨㄢ", "ㄏㄨㄟˋ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "ㄎㄞ", "ㄒㄧㄣ", "ㄌㄞˊ", "ㄑㄧㄥˋ", "ㄓㄨˋ"],
  ["ㄒㄧㄠˇ", "ㄒㄩㄥˊ", "ㄍㄨㄣˇ", "ㄉㄚˋ", "ㄑㄧㄡˊ"],
  ["ㄒㄩㄣˊ", "ㄌㄨˋ", "ㄑㄧㄠ", "ㄉㄚˋ", "ㄍㄨˇ"],
  ["ㄎㄨㄥˇ", "ㄑㄩㄝˋ", "ㄅㄧㄢˋ", "ㄇㄛˊ", "ㄕㄨˋ"],
  ["ㄑㄧㄥ", "ㄨㄚ", "ㄉㄚˋ", "ㄏㄜˊ", "ㄔㄤˋ"],
  ["ㄍㄨㄛ", "ㄍㄨㄛ", "ㄍㄨㄛ", "ㄉㄨㄥ", "ㄉㄨㄥ", "ㄉㄨㄥ"],
  ["ㄉㄚˋ", "ㄐㄧㄚ", "˙ㄉㄜ", "ㄅㄧㄠˇ", "ㄧㄢˇ"],
  ["ㄓㄣ", "ㄐㄧㄥ", "ㄘㄞˇ"],
]);

function wordQuestion(audioText: string, answer: string, distractors: readonly [string, string]): ListeningSeed {
  return { category: "words", audioText, answer, distractors };
}
const fifthListeningQuestions = [
  wordQuestion("朋友", "ㄆㄥˊ|ㄧㄡˇ", ["ㄆㄥˊ|ㄧㄡ", "ㄆㄥˋ|ㄧㄡˇ"]),
  wordQuestion("一起", "ㄧˋ|ㄑㄧˇ", ["ㄧ|ㄑㄧˇ", "ㄧˋ|ㄑㄧ"]),
  wordQuestion("翹翹", "ㄑㄧㄠˋ|ㄑㄧㄠˋ", ["ㄑㄧㄠˊ|ㄑㄧㄠˋ", "ㄑㄧㄠˋ|ㄑㄧㄠˊ"]),
  wordQuestion("小鳥", "ㄒㄧㄠˇ|ㄋㄧㄠˇ", ["ㄒㄧㄠˇ|ㄋㄧㄠˋ", "ㄒㄧㄠˋ|ㄋㄧㄠˇ"]),
];
const sixthListeningQuestions = [
  wordQuestion("老師", "ㄌㄠˇ|ㄕ", ["ㄌㄠˋ|ㄕ", "ㄌㄠˇ|ㄕˋ"]),
  wordQuestion("紅花", "ㄏㄨㄥˊ|ㄏㄨㄚ", ["ㄏㄨㄥˊ|ㄏㄨㄚˋ", "ㄏㄨㄥˋ|ㄏㄨㄚ"]),
  wordQuestion("謝謝", "ㄒㄧㄝˋ|˙ㄒㄧㄝ", ["ㄒㄧㄝˋ|ㄒㄧㄝˋ", "ㄒㄧㄝˋ|ㄒㄧㄝ"]),
  wordQuestion("讀書", "ㄉㄨˊ|ㄕㄨ", ["ㄉㄨˋ|ㄕㄨ", "ㄉㄨˊ|ㄕㄨˋ"]),
];
const seventhListeningQuestions = [
  wordQuestion("烏龜", "ㄨ|ㄍㄨㄟ", ["ㄨˋ|ㄍㄨㄟ", "ㄨ|ㄍㄨㄟˋ"]),
  wordQuestion("兔子", "ㄊㄨˋ|˙ㄗ", ["ㄊㄨˋ|ㄗˇ", "ㄊㄨˊ|˙ㄗ"]),
  wordQuestion("比賽", "ㄅㄧˇ|ㄙㄞˋ", ["ㄅㄧˋ|ㄙㄞˋ", "ㄅㄧˇ|ㄙㄞ"]),
  wordQuestion("午覺", "ㄨˇ|ㄐㄧㄠˋ", ["ㄨˇ|ㄐㄩㄝˊ", "ㄨˋ|ㄐㄧㄠˋ"]),
];
const eighthListeningQuestions = [
  wordQuestion("菜園", "ㄘㄞˋ|ㄩㄢˊ", ["ㄘㄞˊ|ㄩㄢˊ", "ㄘㄞˋ|ㄩㄢˇ"]),
  wordQuestion("蘿蔔", "ㄌㄨㄛˊ|˙ㄅㄛ", ["ㄌㄨㄛˊ|ㄅㄛˊ", "ㄌㄨㄛˋ|˙ㄅㄛ"]),
  wordQuestion("黃牛", "ㄏㄨㄤˊ|ㄋㄧㄡˊ", ["ㄏㄨㄤˊ|ㄋㄧㄡˇ", "ㄏㄨㄤˋ|ㄋㄧㄡˊ"]),
  wordQuestion("浣熊", "ㄨㄢˇ|ㄒㄩㄥˊ", ["ㄏㄨㄢˋ|ㄒㄩㄥˊ", "ㄨㄢˇ|ㄒㄩㄥˇ"]),
];
const ninthListeningQuestions = [
  wordQuestion("山崖", "ㄕㄢ|ㄧㄞˊ", ["ㄕㄢ|ㄧㄚˊ", "ㄕㄢˋ|ㄧㄞˊ"]),
  wordQuestion("動物", "ㄉㄨㄥˋ|ㄨˋ", ["ㄉㄨㄥ|ㄨˋ", "ㄉㄨㄥˋ|ㄨˇ"]),
  wordQuestion("馴鹿", "ㄒㄩㄣˊ|ㄌㄨˋ", ["ㄒㄩㄣˋ|ㄌㄨˋ", "ㄒㄩㄣˊ|ㄌㄨˇ"]),
  wordQuestion("精彩", "ㄐㄧㄥ|ㄘㄞˇ", ["ㄐㄧㄥˋ|ㄘㄞˇ", "ㄐㄧㄥ|ㄘㄞˋ"]),
];

const firstListeningQuestions = [
  { category: "symbols", answer: "ㄅ", audioText: "ㄅ", distractors: ["ㄆ", "ㄇ"] },
  { category: "symbols", answer: "ㄆ", audioText: "ㄆ", distractors: ["ㄅ", "ㄉ"] },
  { category: "symbols", answer: "ㄇ", audioText: "ㄇ", distractors: ["ㄅ", "ㄆ"] },
  { category: "symbols", answer: "ㄉ", audioText: "ㄉ", distractors: ["ㄇ", "ㄅ"] },
  { category: "characters", answer: "ㄇㄠ", audioText: "貓", distractors: ["ㄇㄧ", "ㄆㄠˇ"] },
  { category: "characters", answer: "ㄇㄧ", audioText: "咪", distractors: ["ㄇㄠ", "ㄅㄧ"] },
  { category: "characters", answer: "ㄉㄧˋ", audioText: "弟", distractors: ["˙ㄉㄧ", "ㄧ"] },
  { category: "characters", answer: "ㄆㄠˇ", audioText: "跑", distractors: ["ㄆㄠˊ", "ㄆㄠˋ"] },
  { category: "words", answer: "ㄇㄠ|ㄇㄧ", audioText: "貓咪", distractors: ["ㄇㄠ|ㄇㄠ", "ㄇㄧ|ㄇㄧ"] },
  { category: "words", answer: "ㄉㄧˋ|˙ㄉㄧ", audioText: "弟弟", distractors: ["ㄉㄧˋ|ㄉㄧˋ", "˙ㄉㄧ|ㄉㄧˋ"] },
] as const;
const secondListeningQuestions = [
  { category: "symbols", answer: "ㄈ", audioText: "ㄈ", distractors: ["ㄏ", "ㄓ"] },
  { category: "symbols", answer: "ㄏ", audioText: "ㄏ", distractors: ["ㄈ", "ㄔ"] },
  { category: "symbols", answer: "ㄓ", audioText: "ㄓ", distractors: ["ㄔ", "ㄏ"] },
  { category: "symbols", answer: "ㄔ", audioText: "ㄔ", distractors: ["ㄓ", "ㄈ"] },
  { category: "characters", answer: "ㄜˊ", audioText: "鵝", distractors: ["ㄅㄠˇ", "ㄏㄚ"] },
  { category: "characters", answer: "ㄅㄠˇ", audioText: "寶", distractors: ["˙ㄅㄠ", "ㄏㄠˇ"] },
  { category: "characters", answer: "ㄈㄨ", audioText: "孵", distractors: ["ㄔㄨ", "ㄨˇ"] },
  { category: "characters", answer: "ㄧˋ", audioText: "意", distractors: ["ㄧ", "ㄜˊ"] },
  { category: "words", answer: "ㄅㄠˇ|˙ㄅㄠ", audioText: "寶寶", distractors: ["ㄅㄠˇ|ㄅㄠˇ", "˙ㄅㄠ|ㄅㄠˇ"] },
  { category: "words", answer: "ㄈㄨ|ㄔㄨ", audioText: "孵出", distractors: ["ㄈㄨ|ㄈㄨ", "ㄔㄨ|ㄈㄨ"] },
] as const;
const thirdListeningQuestions = [
  { category: "symbols", answer: "ㄌ", audioText: "ㄌ", distractors: ["ㄑ", "ㄗ"] },
  { category: "symbols", answer: "ㄑ", audioText: "ㄑ", distractors: ["ㄌ", "ㄩ"] },
  { category: "symbols", answer: "ㄗ", audioText: "ㄗ", distractors: ["ㄌ", "ㄑ"] },
  { category: "symbols", answer: "ㄩ", audioText: "ㄩ", distractors: ["ㄗ", "ㄑ"] },
  { category: "characters", answer: "ㄑㄩˋ", audioText: "去", distractors: ["ㄑㄩ", "ㄑㄩˇ"] },
  { category: "characters", answer: "ㄗㄠˇ", audioText: "澡", distractors: ["ㄗㄠ", "ㄗㄠˋ"] },
  { category: "characters", answer: "ㄔㄠˊ", audioText: "巢", distractors: ["ㄔㄠ", "ㄔㄠˇ"] },
  { category: "characters", answer: "ㄏㄜˊ", audioText: "河", distractors: ["ㄌㄧˊ", "ㄇㄚˇ"] },
  { category: "words", answer: "ㄏㄜˊ|ㄇㄚˇ", audioText: "河馬", distractors: ["ㄏㄜˊ|ㄌㄧˊ", "ㄇㄚˇ|ㄏㄜˊ"] },
  { category: "words", answer: "ㄏㄜˊ|ㄌㄧˊ", audioText: "河狸", distractors: ["ㄏㄜˊ|ㄇㄚˇ", "ㄌㄧˊ|ㄏㄜˊ"] },
] as const;
const fourthListeningQuestions = [
  { category: "symbols", answer: "ㄒ", audioText: "ㄒ", distractors: ["ㄕ", "ㄟ"] },
  { category: "symbols", answer: "ㄕ", audioText: "ㄕ", distractors: ["ㄒ", "ㄦ"] },
  { category: "symbols", answer: "ㄟ", audioText: "ㄟ", distractors: ["ㄡ", "ㄦ"] },
  { category: "symbols", answer: "ㄡ", audioText: "ㄡ", distractors: ["ㄟ", "ㄦ"] },
  { category: "characters", answer: "ㄅㄟ", audioText: "背", distractors: ["ㄅㄟˋ", "ㄅㄠ"] },
  { category: "characters", answer: "ㄕㄨ", audioText: "書", distractors: ["ㄕㄡˇ", "ㄕㄨˋ"] },
  { category: "characters", answer: "ㄒㄧㄠˋ", audioText: "笑", distractors: ["ㄒㄧ", "ㄒㄧㄠ"] },
  { category: "characters", answer: "ㄏㄨㄢ", audioText: "歡", distractors: ["ㄏㄨㄢˊ", "ㄏㄠˇ"] },
  { category: "words", answer: "ㄕㄨ|ㄅㄠ", audioText: "書包", distractors: ["ㄕㄡˇ|ㄅㄠ", "ㄕㄨ|ㄅㄟ"] },
  { category: "words", answer: "ㄏㄨㄢ|ㄒㄧˇ", audioText: "歡喜", distractors: ["ㄏㄨㄢ|ㄒㄧ", "ㄏㄠˇ|ㄒㄧˇ"] },
] as const;

const exercises: Record<number, LessonExercise> = {
  0: { lines: firstLessonLines, questions: firstListeningQuestions },
  1: { lines: secondLessonLines, questions: secondListeningQuestions },
  2: { lines: thirdLessonLines, questions: thirdListeningQuestions },
  3: { lines: fourthLessonLines, questions: fourthListeningQuestions },
  4: { lines: fifthLessonLines, questions: fifthListeningQuestions },
  5: { lines: sixthLessonLines, questions: sixthListeningQuestions },
  6: { lines: seventhLessonLines, questions: seventhListeningQuestions },
  7: { lines: eighthLessonLines, questions: eighthListeningQuestions },
  8: { lines: ninthLessonLines, questions: ninthListeningQuestions },
};

const siteReleaseNotes = [
  ["0.1.0-beta.1", "首個公開測試版", "收錄一至九課，提供直式課文預覽、逐格手寫默寫與家長檢查；聽寫會隨機抽題，並支援間隔重播、補強和錯題收藏。單個注音符號使用教育部錄音。"],
] as const;

function fillFavoriteKey(item: Pick<FillFavorite, "lessonIndex" | "character" | "zhuyin">): string {
  return `${item.lessonIndex}:${item.character}:${item.zhuyin}`;
}

function fillLocation(lessonIndex: number, position: number): string {
  const lines = exercises[lessonIndex].lines;
  let start = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (position < start + lines[lineIndex].length) return `第 ${lineIndex + 1} 行第 ${position - start + 1} 格`;
    start += lines[lineIndex].length;
  }
  return "課文";
}

function validatedFillFavorites(raw: unknown): FillFavorite[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, FillFavorite>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<FillFavorite>;
    const lessonIndex = candidate.lessonIndex;
    if (typeof lessonIndex !== "number" || !Number.isInteger(lessonIndex) || !exercises[lessonIndex]) continue;
    const lessonItems = exercises[lessonIndex].lines.flat();
    const positions = Array.isArray(candidate.positions) ? candidate.positions.filter((position): position is number => typeof position === "number" && Number.isInteger(position) && lessonItems[position]?.character === candidate.character && lessonItems[position]?.zhuyin === candidate.zhuyin) : [];
    if (!positions.length || typeof candidate.character !== "string" || typeof candidate.zhuyin !== "string") continue;
    const key = fillFavoriteKey({ lessonIndex, character: candidate.character, zhuyin: candidate.zhuyin });
    const existing = result.get(key);
    result.set(key, { lessonIndex, character: candidate.character, zhuyin: candidate.zhuyin, positions: [...new Set([...(existing?.positions ?? []), ...positions])].sort((a, b) => a - b), status: candidate.status === "needs_rewrite" || existing?.status === "needs_rewrite" ? "needs_rewrite" : "review_later" });
  }
  return [...result.values()];
}

const extraWordQuestions: Record<number, readonly ListeningSeed[]> = {
  0: [{ category: "words", answer: "ㄉㄧˋ|ㄧ", audioText: "第一", distractors: ["ㄉㄧˋ|ㄇㄧ", "ㄆㄠˇ|ㄧ"] }],
  1: [{ category: "words", answer: "ㄉㄜˊ|ㄧˋ", audioText: "得意", distractors: ["ㄉㄜˊ|ㄜˊ", "ㄈㄨ|ㄧˋ"] }],
  2: [
    { category: "words", answer: "ㄆㄠˋ|ㄗㄠˇ", audioText: "泡澡", distractors: ["ㄆㄠˊ|ㄗㄠˇ", "ㄆㄠˋ|ㄗㄠˋ"] },
    { category: "words", answer: "ㄅㄢˋ|ㄌㄨˋ", audioText: "半路", distractors: ["ㄅㄢˋ|ㄌㄧˊ", "ㄏㄜˊ|ㄌㄨˋ"] },
    { category: "words", answer: "ㄩˋ|ㄉㄠˋ", audioText: "遇到", distractors: ["ㄩˋ|ㄗㄠˇ", "ㄑㄩˋ|ㄉㄠˋ"] },
    { category: "words", answer: "ㄓㄨˊ|ㄔㄠˊ", audioText: "築巢", distractors: ["ㄓㄨˊ|ㄗㄠˇ", "ㄔㄠˊ|ㄓㄨˊ"] },
  ],
  3: [
    { category: "words", answer: "ㄅㄟ|˙ㄓㄜ", audioText: "背著", distractors: ["ㄅㄟˋ|˙ㄓㄜ", "ㄅㄟ|ㄕㄨ"] },
    { category: "words", answer: "ㄌㄚ|ㄕㄡˇ", audioText: "拉手", distractors: ["ㄌㄚ|ㄕㄨ", "ㄕㄡˇ|ㄌㄚ"] },
  ],
};

function shuffleItems<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function questionId(question: ListeningSeed): string {
  return `${question.category}:${question.audioText}`;
}

function listeningAudioUrl(text: string): string {
  const filename = [...text].map((character) => character.codePointAt(0)!.toString(16)).join("-");
  // These 37 clips changed source in v44; the query bypasses older browser caches.
  return `/listening-audio/${filename}.m4a${/^[\u3105-\u3129]$/.test(text) ? "?v=44" : ""}`;
}

function questionSeedsForLesson(lessonIndex: number): Record<ListenCategory, ListeningSeed[]> {
  const lesson = lessons[lessonIndex] ?? lessons[0];
  const terms = circledVocabulary[lessonIndex] ?? circledVocabulary[0];
  const symbols: ListeningSeed[] = lesson.symbols.map((symbol) => ({
    category: "symbols", answer: symbol, audioText: symbol,
    distractors: lesson.symbols.filter((other) => other !== symbol).slice(0, 2),
  }));
  const seenCharacters = new Map<string, SyllableItem>();
  for (const term of terms) {
    Array.from(term.text).forEach((character, index) => {
      if (!seenCharacters.has(character)) seenCharacters.set(character, { character, zhuyin: term.syllables[index] });
    });
  }
  // Neutral-tone and sandhi readings need their surrounding word; do not ask
  // children to identify them from an isolated character recording.
  const uniqueCharacters = [...seenCharacters.values()]
    .filter((item) => !item.zhuyin.startsWith("˙") && !(item.character === "一" && item.zhuyin !== "ㄧ") && !(item.character === "不" && item.zhuyin === "ㄅㄨˊ"));
  const uniqueSounds = [...new Set(uniqueCharacters.map((item) => item.zhuyin))];
  const characters: ListeningSeed[] = uniqueCharacters.map((item) => ({
    category: "characters", answer: item.zhuyin, audioText: item.character,
    distractors: uniqueSounds.filter((sound) => sound !== item.zhuyin).slice(0, 2),
  }));
  const wordSounds = [...new Set(terms.flatMap((term) => term.syllables))];
  const words: ListeningSeed[] = terms.filter((term) => term.syllables.length > 1).map((term) => {
    const answer = [...term.syllables];
    const alternative = (original: string) => wordSounds.find((sound) => sound !== original) ?? original;
    return {
      category: "words", audioText: term.text, answer: answer.join("|"),
      distractors: [
        [alternative(answer[0]), ...answer.slice(1)].join("|"),
        [...answer.slice(0, -1), alternative(answer[answer.length - 1])].join("|"),
      ],
    };
  });
  return { symbols, characters, words };
}

function makeQuestion(seed: ListeningSeed): ListeningQuestion {
  return { ...seed, id: questionId(seed), choices: shuffleItems([seed.answer, ...seed.distractors]) };
}

function buildListeningSession(lessonIndex: number): ListeningQuestion[] {
  const pools = questionSeedsForLesson(lessonIndex);
  return [
    ...shuffleItems(pools.symbols).slice(0, 4),
    ...shuffleItems(pools.characters).slice(0, 4),
    ...shuffleItems(pools.words).slice(0, 2),
  ].map(makeQuestion);
}

function findQuestionSeed(lessonIndex: number, id: string): ListeningSeed | undefined {
  const pools = questionSeedsForLesson(lessonIndex);
  const current = [...pools.symbols, ...pools.characters, ...pools.words].find((question) => questionId(question) === id);
  if (current) return current;
  // Previously saved questions remain available even when they are outside
  // the teacher's new exam range; they no longer appear in fresh sessions.
  const exercise = exercises[lessonIndex];
  if (!exercise) return undefined;
  const legacyCharacter = exercise.lines.flat().find((item) => id === `characters:${item.character}`);
  if (legacyCharacter) {
    const sounds = [...new Set(exercise.lines.flat().map((item) => item.zhuyin))];
    return { category: "characters", audioText: legacyCharacter.character, answer: legacyCharacter.zhuyin, distractors: sounds.filter((sound) => sound !== legacyCharacter.zhuyin).slice(0, 2) };
  }
  return [...exercise.questions, ...(extraWordQuestions[lessonIndex] ?? [])].find((question) => questionId(question) === id);
}

const fallbackListeningQuestion: ListeningQuestion = { ...firstListeningQuestions[0], id: "symbols:ㄅ", choices: ["ㄅ", "ㄆ", "ㄇ"] };

// This font draws the complete vertical syllable (including its tone) from a
// representative Han character. Rendering individual Bopomofo characters would
// discard the font's built-in tone placement.
const syllableGlyphs: Record<string, string> = {
  ...Object.fromEntries([firstLessonLines, secondLessonLines, thirdLessonLines, fourthLessonLines, fifthLessonLines, sixthLessonLines, seventhLessonLines, eighthLessonLines, ninthLessonLines].flat(2).map(({ character, zhuyin }) => [zhuyin, character])),
  ...Object.fromEntries(circledVocabulary.flatMap((terms) => terms.flatMap((term) => Array.from(term.text).map((character, index) => [term.syllables[index], character])))),
  "ㄅㄟ": "背\u{E01E1}",
  "ㄅㄟˋ": "背",
  "ㄧㄠ": "腰",
  "ㄨㄢ": "彎",
  "˙ㄅㄠ": "寶\u{E01E1}",
  "˙ㄇㄚ": "媽\u{E01E1}",
  "˙ㄒㄧㄝ": "謝\u{E01E1}",
  "˙ㄗ": "子\u{E01E1}",
  "˙ㄉㄜ": "得\u{E01E1}",
  "˙ㄅㄛ": "蔔\u{E01E1}",
  "ㄐㄧㄠˋ": "覺\u{E01E1}",
  "ㄅㄨˊ": "不\u{E01E1}",
  "ㄓㄤˇ": "長\u{E01E1}",
  "ㄧˋ": "一\u{E01E2}",
  "ㄧㄛ": "唷",
  "ㄇㄠˊ": "毛",
  "ㄇㄠˇ": "卯",
  "ㄇㄧˊ": "迷",
  "ㄇㄧˇ": "米",
  "ㄆㄠˊ": "袍",
  "ㄆㄠˋ": "泡",
  "ㄑㄩ": "區",
  "ㄑㄩˇ": "取",
  "ㄗㄠ": "遭",
  "ㄗㄠˋ": "造",
  "ㄔㄠ": "超",
  "ㄔㄠˇ": "炒",
};

function ZhuyinStack({ text, literalSymbol = false }: { text: string; literalSymbol?: boolean }) {
  const isSymbol = literalSymbol && /^[\u3105-\u3129]+$/.test(text);
  return (
    <span className="zhuyin-stack" aria-label={text}>
      <span className={`zhuyin-glyph ${text === "˙ㄉㄧ" ? "is-neutral-di" : ""} ${isSymbol ? "is-symbol" : ""} ${isSymbol && text.length > 1 ? "is-symbol-combination" : ""}`} aria-hidden="true">{isSymbol ? text : syllableGlyphs[text] ?? text}</span>
    </span>
  );
}

function AnswerDisplay({ answer, literalSymbols = false }: { answer: string; literalSymbols?: boolean }) {
  return <span className={`answer-display ${answer.includes("|") ? "is-word" : ""}`}>{answer.split("|").map((syllable, index) => <ZhuyinStack text={syllable} literalSymbol={literalSymbols} key={`${index}-${syllable}`} />)}</span>;
}

const listenCategoryLabels: Record<ListenCategory, string> = { symbols: "第一大題 · 注音符號", characters: "第二大題 · 生字", words: "第三大題 · 語詞" };
const legacySavedQuestionIndexes: Record<number, readonly number[]> = { 0: [4, 5, 7], 2: [4, 5, 6] };

function InkPreview({ strokes }: { strokes: InkStroke[] }) {
  return <svg viewBox="0 0 100 100" className="ink-preview" aria-hidden="true">{strokes.map((stroke, index) => stroke.length === 1
    ? <circle key={index} cx={stroke[0].x} cy={stroke[0].y} r=".75" />
    : <polyline key={index} points={stroke.map((point) => `${point.x},${point.y}`).join(" ")} />)}</svg>;
}

function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span>ㄅ</span>
      <i />
    </span>
  );
}

function AppHeader({ onCourses, onBack, backLabel }: { onCourses: () => void; onBack?: () => void; backLabel?: string }) {
  return (
    <header className={`app-header ${onBack ? "has-back" : ""}`}>
      {onBack && <button className="header-back" type="button" onClick={onBack}><ArrowLeft size={18} weight="bold" aria-hidden="true" /><span>{backLabel}</span></button>}
      <button className="brand-button" type="button" onClick={onCourses} aria-label="前往課程">
        <Logo />
        <span>
          <strong>注音小練習</strong>
          <small>一年級學習站</small>
        </span>
      </button>
      {!onBack && <div className="header-chip"><span className="status-dot" /> 不用登入也能練</div>}
    </header>
  );
}

function BottomNav({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  const items = [
    { id: "courses" as View, Icon: BookOpenText, label: "課程" },
    { id: "practice" as View, Icon: PencilLine, label: "練習" },
    { id: "more" as View, Icon: Gear, label: "更多" },
  ];

  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {items.map((item) => (
        <button key={item.id} type="button" className={active === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
          <span className="nav-icon" aria-hidden="true"><item.Icon size={22} weight={active === item.id ? "fill" : "regular"} /></span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("courses");
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("annotated");
  const [previewPage, setPreviewPage] = useState(0);
  const [previewColumns, setPreviewColumns] = useState(6);
  const [playingSymbol, setPlayingSymbol] = useState<string | null>(null);
  const previewColumnsRef = useRef(6);
  const previewPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewWheelAtRef = useRef(0);
  const [fillStrokes, setFillStrokes] = useState<Record<number, InkStroke[]>>({});
  const [fillPendingCells, setFillPendingCells] = useState<Record<number, InkStroke[]>>({});
  const [fillDraftReady, setFillDraftReady] = useState(false);
  const [fillResumeDraft, setFillResumeDraft] = useState<FillDraft | null>(null);
  const [fillExitTarget, setFillExitTarget] = useState<View | null>(null);
  const [activeFillCell, setActiveFillCell] = useState<number | null>(null);
  const [fillReviewOpen, setFillReviewOpen] = useState(false);
  const [fillNeedsRetry, setFillNeedsRetry] = useState<number[]>([]);
  const [fillParentChecked, setFillParentChecked] = useState(false);
  const [fillHasInk, setFillHasInk] = useState(false);
  const [fillIsDirty, setFillIsDirty] = useState(false);
  const [fillFavorites, setFillFavorites] = useState<FillFavorite[]>([]);
  const [fillFavoritesLoaded, setFillFavoritesLoaded] = useState(false);
  const [fillPracticeTarget, setFillPracticeTarget] = useState<FillFavorite | null>(null);
  const [fillPracticePhase, setFillPracticePhase] = useState<"writing" | "review">("writing");
  const [fillPracticeStrokes, setFillPracticeStrokes] = useState<InkStroke[]>([]);
  const [listenIndex, setListenIndex] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<ListeningQuestion[]>([]);
  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");
  const [listenExitOpen, setListenExitOpen] = useState(false);
  const [fillPracticeExitOpen, setFillPracticeExitOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [playCount, setPlayCount] = useState(0);
  const [listenMessage, setListenMessage] = useState("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  const [audioError, setAudioError] = useState(false);
  const [wordInk, setWordInk] = useState<boolean[]>([]);
  const [retryMessage, setRetryMessage] = useState("");
  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0 });
  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);
  const [practiceState, setPracticeState] = useState<PracticeState>({ savedQuestions: [], recentLesson: null, completedSessions: 0 });
  const [practiceLoaded, setPracticeLoaded] = useState(false);
  const [listeningSettings, setListeningSettings] = useState<ListeningSettings>(defaultListeningSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [morePanel, setMorePanel] = useState<MorePanel>("home");
  const [storageError, setStorageError] = useState(false);
  const [practiceNotice, setPracticeNotice] = useState("");
  const [singleQuestionPractice, setSingleQuestionPractice] = useState(false);
  const [completedFillLessons, setCompletedFillLessons] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const listeningPointerIdRef = useRef<number | null>(null);
  const listeningActiveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef<HTMLAudioElement>(null);
  const fillCanvasRef = useRef<HTMLCanvasElement>(null);
  const fillDraftRef = useRef<InkStroke[]>([]);
  const fillActiveStrokeRef = useRef<InkStroke | null>(null);
  const fillPointerIdRef = useRef<number | null>(null);
  const persistFillRef = useRef<() => void>(() => {});
  const timerRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const repeatTimeoutRef = useRef<number | null>(null);
  const repeatRemainingRef = useRef(0);
  const autoRepeatEnabledRef = useRef(false);
  const playbackTokenRef = useRef(0);
  const playbackEndedRef = useRef<() => void>(() => {});

  const exercise = exercises[selectedLesson] ?? exercises[0];
  const lessonLines = exercise.lines;
  const lessonItems = lessonLines.flat();
  const fillLineStarts = lessonLines.map((_, lineIndex) => lessonLines.slice(0, lineIndex).reduce((count, line) => count + line.length, 0));
  const writtenCount = lessonItems.filter((_, index) => fillStrokes[index]?.length).length;
  const fillComplete = writtenCount === lessonItems.length;
  const hasFillDraft = writtenCount > 0 || Object.keys(fillPendingCells).length > 0 || (view === "fill" && fillDraftRef.current.length > 0);
  const listeningQuestions = sessionQuestions;
  const currentQuestion = listeningQuestions[listenIndex] ?? fallbackListeningQuestion;
  const isWordQuestion = currentQuestion.category === "words";
  const wordLength = currentQuestion.answer.split("|").length;
  const questionDuration = isWordQuestion ? Math.max(30, wordLength * 12) : 30;
  const hasCompleteInk = isWordQuestion ? wordInk.length === wordLength && wordInk.every(Boolean) : hasInk;
  const sectionQuestionIndex = listenIndex - (currentQuestion.category === "symbols" ? 0 : currentQuestion.category === "characters" ? 4 : 8);
  const sectionProgress = singleQuestionPractice ? "收藏題目重練" : isWordQuestion ? `第 ${sectionQuestionIndex + 1} 詞 / 2 · ${wordLength} 字` : `第 ${sectionQuestionIndex + 1} 小題 / 4`;
  const sessionWritingUnits = listeningQuestions.reduce((count, question) => count + question.answer.split("|").length, 0);
  const isFocusMode = view === "listen";
  const lesson = lessons[selectedLesson];
  const previewPageCount = Math.ceil(lesson.lines.length / previewColumns);
  const previewVisibleLines = lesson.lines.slice(previewPage * previewColumns, (previewPage + 1) * previewColumns);
  const lessonNumber = lessonNumerals[selectedLesson];
  const currentQuestionSaved = practiceState.savedQuestions.some((item) => item.lessonIndex === selectedLesson && item.questionId === currentQuestion.id);
  const pendingSessionCount = reviewedIndexes.filter((index) => practiceState.savedQuestions.some((item) => item.lessonIndex === selectedLesson && item.questionId === listeningQuestions[index]?.id && item.needsPractice)).length;

  const persistFillDraft = (includeCanvas = false) => {
    if (view !== "fill" || !fillDraftReady || fillResumeDraft) return;
    try {
      if (fillParentChecked) { clearFillDraft(selectedLesson); return; }
      const pendingCells = { ...fillPendingCells };
      if (includeCanvas && activeFillCell !== null) {
        const strokes = [...fillDraftRef.current, ...(fillActiveStrokeRef.current?.length ? [fillActiveStrokeRef.current] : [])];
        if (strokes.length) pendingCells[activeFillCell] = strokes;
      }
      if (!Object.keys(fillStrokes).length && !Object.keys(pendingCells).length) { clearFillDraft(selectedLesson); return; }
      writeFillDraft({ version: 1, lessonIndex: selectedLesson, savedAt: Date.now(), strokes: fillStrokes, pendingCells, needsRetry: fillNeedsRetry, reviewOpen: fillReviewOpen });
    } catch { setStorageError(true); }
  };
  persistFillRef.current = () => persistFillDraft(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 700px)");
    const updateColumns = () => {
      const next = media.matches ? 8 : 6;
      const previous = previewColumnsRef.current;
      if (next === previous) return;
      previewColumnsRef.current = next;
      setPreviewPage((page) => Math.floor(page * previous / next));
      setPreviewColumns(next);
    };
    updateColumns();
    media.addEventListener("change", updateColumns);
    return () => media.removeEventListener("change", updateColumns);
  }, []);

  useEffect(() => {
    if (view === "fill" && fillDraftReady && !fillResumeDraft) persistFillDraft();
  }, [view, fillDraftReady, fillResumeDraft, fillStrokes, fillPendingCells, fillNeedsRetry, fillReviewOpen, fillParentChecked, selectedLesson]);

  useEffect(() => {
    const flush = () => persistFillRef.current();
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") flush(); };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (view !== "fill" || !fillDraftReady || fillResumeDraft || fillParentChecked || (!hasFillDraft && !fillActiveStrokeRef.current?.length)) return;
      flush();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [view, fillDraftReady, fillResumeDraft, fillParentChecked, hasFillDraft]);

  useEffect(() => {
    if (!fillResumeDraft && !fillExitTarget && !listenExitOpen && !fillPracticeExitOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (fillExitTarget) setFillExitTarget(null);
        if (listenExitOpen) setListenExitOpen(false);
        if (fillPracticeExitOpen) setFillPracticeExitOpen(false);
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".fill-dialog button"));
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fillResumeDraft, fillExitTarget, listenExitOpen, fillPracticeExitOpen]);

  useEffect(() => {
    try {
      const current = window.localStorage.getItem(practiceStorageKey);
      const previous = current ? null : window.localStorage.getItem(previousPracticeStorageKey);
      const stored = current ?? previous ?? window.localStorage.getItem(firstPracticeStorageKey);
      if (stored) {
        const parsed: { savedQuestions?: Array<{ lessonIndex?: number; questionId?: string; questionIndex?: number; needsPractice?: boolean }>; recentLesson?: number | null; completedSessions?: number } = JSON.parse(stored);
        const savedQuestions = (Array.isArray(parsed.savedQuestions) ? parsed.savedQuestions : []).flatMap((item): SavedQuestion[] => {
          if (typeof item?.lessonIndex !== "number" || !lessons[item.lessonIndex]) return [];
          let id = item.questionId;
          if (!current) {
            const legacyIndex = typeof item.questionIndex === "number" ? (previous ? item.questionIndex : legacySavedQuestionIndexes[item.lessonIndex]?.[item.questionIndex]) : undefined;
            const legacyQuestion = legacyIndex === undefined ? undefined : exercises[item.lessonIndex]?.questions[legacyIndex];
            id = legacyQuestion ? questionId(legacyQuestion) : undefined;
          }
          return typeof id === "string" && findQuestionSeed(item.lessonIndex, id) ? [{ lessonIndex: item.lessonIndex, questionId: id, needsPractice: Boolean(item.needsPractice) }] : [];
        });
        setPracticeState({
          savedQuestions: savedQuestions.filter((item, index) => savedQuestions.findIndex((other) => other.lessonIndex === item.lessonIndex && other.questionId === item.questionId) === index),
          recentLesson: typeof parsed.recentLesson === "number" && lessons[parsed.recentLesson] ? parsed.recentLesson : null,
          completedSessions: typeof parsed.completedSessions === "number" && Number.isFinite(parsed.completedSessions) ? Math.max(0, parsed.completedSessions) : 0,
        });
      }
    } catch { setStorageError(true); }
    setPracticeLoaded(true);
  }, []);

  useEffect(() => {
    if (!practiceLoaded) return;
    try { window.localStorage.setItem(practiceStorageKey, JSON.stringify(practiceState)); } catch { setStorageError(true); }
  }, [practiceLoaded, practiceState]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(fillFavoritesStorageKey);
      if (stored) setFillFavorites(validatedFillFavorites(JSON.parse(stored)));
    } catch { setStorageError(true); }
    setFillFavoritesLoaded(true);
  }, []);

  useEffect(() => {
    if (!fillFavoritesLoaded) return;
    try { window.localStorage.setItem(fillFavoritesStorageKey, JSON.stringify(fillFavorites)); } catch { setStorageError(true); }
  }, [fillFavoritesLoaded, fillFavorites]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(listeningSettingsStorageKey);
      if (stored) {
        const parsed: Partial<ListeningSettings> = JSON.parse(stored);
        setListeningSettings({
          repeatCount: parsed.repeatCount === 1 || parsed.repeatCount === 2 || parsed.repeatCount === 3 ? parsed.repeatCount : 2,
          intervalSeconds: parsed.intervalSeconds === 5 || parsed.intervalSeconds === 8 || parsed.intervalSeconds === 10 ? parsed.intervalSeconds : 8,
        });
      }
    } catch { setStorageError(true); }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    try { window.localStorage.setItem(listeningSettingsStorageKey, JSON.stringify(listeningSettings)); } catch { setStorageError(true); }
  }, [settingsLoaded, listeningSettings]);

  const saveQuestion = (lessonIndex: number, id: string, needsPractice = false) => {
    setPracticeState((current) => {
      const existing = current.savedQuestions.find((item) => item.lessonIndex === lessonIndex && item.questionId === id);
      if (existing) return needsPractice && !existing.needsPractice
        ? { ...current, savedQuestions: current.savedQuestions.map((item) => item === existing ? { ...item, needsPractice: true } : item) }
        : current;
      return { ...current, savedQuestions: [...current.savedQuestions, { lessonIndex, questionId: id, needsPractice }] };
    });
  };

  const markQuestionPracticed = (lessonIndex: number, id: string) => {
    setPracticeState((current) => ({ ...current, savedQuestions: current.savedQuestions.map((item) => item.lessonIndex === lessonIndex && item.questionId === id ? { ...item, needsPractice: false } : item) }));
  };

  const removeQuestion = (lessonIndex: number, id: string) => {
    setPracticeState((current) => ({ ...current, savedQuestions: current.savedQuestions.filter((item) => item.lessonIndex !== lessonIndex || item.questionId !== id) }));
    setPracticeNotice("已取消收藏，這題不會再顯示在練習頁。 ");
  };

  const toggleCurrentQuestionSaved = () => {
    if (currentQuestionSaved) removeQuestion(selectedLesson, currentQuestion.id);
    else saveQuestion(selectedLesson, currentQuestion.id);
  };

  const openLesson = (index: number) => {
    setSelectedLesson(index);
    setPreviewMode("annotated");
    setPreviewPage(0);
    setPlayingSymbol(null);
    setPracticeState((current) => ({ ...current, recentLesson: index }));
    setView("lesson");
  };

  const clearListenTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (repeatTimeoutRef.current !== null) window.clearTimeout(repeatTimeoutRef.current);
    repeatTimeoutRef.current = null;
    repeatRemainingRef.current = 0;
    autoRepeatEnabledRef.current = false;
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const stopPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    if (repeatTimeoutRef.current !== null) window.clearTimeout(repeatTimeoutRef.current);
    repeatTimeoutRef.current = null;
    const audio = playbackRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    const audio = playbackRef.current;
    if (!audio) { setAudioError(true); if (view === "practice") setPracticeNotice("音訊無法播放，請重新整理後再試。"); return; }
    stopPlayback();
    const playbackToken = playbackTokenRef.current;
    setAudioError(false);
    const isZhuyinPrompt = /^[\u3105-\u3129]+$/.test(text);
    // Keep one natural reading per clip; the listening timer controls repeats.
    // Slowing only the symbol clips lets children hear the complete sound.
    audio.playbackRate = isZhuyinPrompt ? 0.84 : 1;
    audio.src = listeningAudioUrl(text);
    audio.play().catch(() => {
      if (playbackToken !== playbackTokenRef.current) return;
      if (isZhuyinPrompt) {
        setAudioError(true);
        if (view === "practice") setPracticeNotice("注音讀音無法播放，請重新整理後再試。");
        return;
      }
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "zh-TW";
        utterance.rate = 0.82;
        utterance.onend = () => {
          if (playbackToken === playbackTokenRef.current) {
            setPlayingSymbol(null);
            playbackEndedRef.current();
          }
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setAudioError(true);
        if (view === "practice") setPracticeNotice("音訊無法播放，請檢查音量或網路後再試。");
      }
    });
  }, [stopPlayback, view]);

  const playPreviewSymbol = (symbol: string) => {
    autoRepeatEnabledRef.current = false;
    setPlayingSymbol(symbol);
    speak(symbol);
  };

  playbackEndedRef.current = () => {
    if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
    const nextPlay = listeningSettings.repeatCount - repeatRemainingRef.current + 1;
    setListenMessage(`等待 ${listeningSettings.intervalSeconds} 秒後播放第 ${nextPlay} 次，可以繼續寫。`);
    repeatTimeoutRef.current = window.setTimeout(() => {
      repeatTimeoutRef.current = null;
      if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
      repeatRemainingRef.current -= 1;
      setPlayCount((current) => current + 1);
      setListenMessage(`第 ${nextPlay} 次播放中，可以繼續寫。`);
      speak(currentQuestion.audioText);
    }, listeningSettings.intervalSeconds * 1000);
  };

  const resetListeningQuestion = (index = 0) => {
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setListenIndex(index);
    setListenPhase("ready");
    setSecondsLeft(30);
    setPlayCount(0);
    setHasInk(false);
    setWordInk([]);
    setAudioError(false);
    setRetryMessage("");
    setListenMessage("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  };

  const openListening = () => {
    setSessionQuestions(buildListeningSession(selectedLesson));
    resetListeningQuestion(0);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    setSingleQuestionPractice(false);
    setView("listen");
  };

  const openSavedQuestion = (lessonIndex: number, id: string) => {
    const seed = findQuestionSeed(lessonIndex, id);
    if (!seed) return;
    setSelectedLesson(lessonIndex);
    setSessionQuestions([makeQuestion(seed)]);
    setSingleQuestionPractice(true);
    setPracticeNotice("");
    resetListeningQuestion(0);
    setView("listen");
  };

  const openFill = () => {
    const draft = readFillDraft(selectedLesson, lessonItems.length);
    setFillStrokes({});
    setFillPendingCells({});
    setActiveFillCell(null);
    setFillReviewOpen(false);
    setFillNeedsRetry([]);
    setFillParentChecked(false);
    setFillHasInk(false);
    fillDraftRef.current = [];
    setFillResumeDraft(draft);
    setFillDraftReady(!draft);
    setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
    setView("fill");
  };

  const resumeFillDraft = () => {
    if (!fillResumeDraft) return;
    setFillStrokes(fillResumeDraft.strokes);
    setFillPendingCells(fillResumeDraft.pendingCells);
    setFillNeedsRetry(fillResumeDraft.needsRetry);
    setFillReviewOpen(fillResumeDraft.reviewOpen);
    setActiveFillCell(null);
    setFillResumeDraft(null);
    setFillDraftReady(true);
  };

  const restartFillDraft = () => {
    try { clearFillDraft(selectedLesson); } catch { setStorageError(true); }
    setFillStrokes({});
    setFillPendingCells({});
    setFillNeedsRetry([]);
    setFillReviewOpen(false);
    setActiveFillCell(null);
    fillDraftRef.current = [];
    setFillResumeDraft(null);
    setFillDraftReady(true);
  };

  const openFillReview = () => {
    setFillReviewOpen(true);
  };

  const toggleFillFavorite = (index: number) => {
    const item = lessonItems[index];
    const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
    setFillFavorites((current) => {
      const existing = current.find((favorite) => fillFavoriteKey(favorite) === key);
      if (!existing) return [...current, { lessonIndex: selectedLesson, character: item.character, zhuyin: item.zhuyin, positions: [index], status: "review_later" }];
      const positions = existing.positions.includes(index) ? existing.positions.filter((position) => position !== index) : [...existing.positions, index].sort((a, b) => a - b);
      if (!positions.length) return current.filter((favorite) => fillFavoriteKey(favorite) !== key);
      return current.map((favorite) => fillFavoriteKey(favorite) === key ? { ...favorite, positions } : favorite);
    });
  };

  const rewriteFillCell = (index: number) => {
    setFillNeedsRetry((current) => current.includes(index) ? current : [...current, index]);
    openFillCell(index);
  };

  const openFillFavorite = (favorite: FillFavorite) => {
    setFillPracticeTarget(favorite);
    setSelectedLesson(favorite.lessonIndex);
    setFillPracticePhase("writing");
    setFillPracticeStrokes([]);
    setFillHasInk(false);
    setFillIsDirty(false);
    setPracticeNotice("");
    setView("fill-practice");
  };

  const removeFillFavorite = (favorite: FillFavorite, mastered = false) => {
    const key = fillFavoriteKey(favorite);
    setFillFavorites((current) => current.filter((item) => fillFavoriteKey(item) !== key));
    setPracticeNotice(mastered ? `家長已確認「${favorite.character}」掌握，已移出錯字收藏。` : `已取消收藏「${favorite.character}」。`);
    setFillPracticeTarget(null);
    setView("practice");
  };

  const leaveFocus = () => {
    if (listenPhase === "active" || listenPhase === "retry") {
      clearListenTimers();
      stopPlayback();
      setListenExitOpen(true);
      return;
    }
    confirmLeaveFocus();
  };

  const confirmLeaveFocus = () => {
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    setView(singleQuestionPractice ? "practice" : "lesson");
    setListenPhase("ready");
  };

  const finishListening = useCallback((early = false) => {
    clearListenTimers();
    stopPlayback();
    setSecondsLeft(0);
    setListenPhase("review");
    setListenMessage(early ? "已交卷，請家長一起看看。" : "時間到，請把平板交給家長一起看看。");
  }, [clearListenTimers, stopPlayback]);

  useEffect(() => {
    if (listenExitOpen || (listenPhase !== "active" && listenPhase !== "retry")) return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const timeUp = window.setTimeout(() => finishListening(), secondsLeft * 1000);
    timeoutRefs.current = [timeUp];

    return clearListenTimers;
  }, [clearListenTimers, finishListening, listenIndex, listenPhase, questionDuration, listenExitOpen]);

  useEffect(() => {
    if (view !== "listen" || (listenPhase !== "active" && listenPhase !== "retry")) return;
    const canvases = (currentQuestion.category === "words" ? wordCanvasRefs.current : [canvasRef.current]).filter((canvas): canvas is HTMLCanvasElement => canvas !== null);
    const sizeCanvas = (canvas: HTMLCanvasElement, preserveInk: boolean) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (preserveInk && canvas.width === width && canvas.height === height) return;
      const previous = document.createElement("canvas");
      if (preserveInk) {
        previous.width = canvas.width;
        previous.height = canvas.height;
        previous.getContext("2d")?.drawImage(canvas, 0, 0);
        const pointerId = listeningPointerIdRef.current;
        const activeCanvas = listeningActiveCanvasRef.current;
        listeningPointerIdRef.current = null;
        listeningActiveCanvasRef.current = null;
        if (pointerId !== null && activeCanvas?.hasPointerCapture(pointerId)) activeCanvas.releasePointerCapture(pointerId);
        setIsDrawing(false);
      }
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 4;
      context.strokeStyle = "#27463f";
      if (preserveInk && previous.width && previous.height) context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, rect.width, rect.height);
    };
    const resize = () => canvases.forEach((canvas) => sizeCanvas(canvas, true));
    canvases.forEach((canvas) => sizeCanvas(canvas, false));
    const observer = new ResizeObserver(resize);
    canvases.forEach((canvas) => observer.observe(canvas));
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [view, listenPhase, listenIndex, currentQuestion.category]);

  useEffect(() => () => { clearListenTimers(); stopPlayback(); }, [clearListenTimers, stopPlayback]);

  const startListening = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    setListenPhase("active");
    setSecondsLeft(questionDuration);
    setPlayCount(1);
    setHasInk(false);
    setWordInk([]);
    setListenMessage("第一次播放中，Canvas 已開放，可以邊聽邊寫。 ");
    speak(currentQuestion.audioText);
  };

  const startRetryWriting = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    setHasInk(false);
    setWordInk([]);
    setListenPhase("retry");
    setSecondsLeft(questionDuration);
    setPlayCount((current) => current + 1);
    setListenMessage("題目正在播放，請重新寫一次；需要時可按重播。 ");
    speak(currentQuestion.audioText);
  };

  const replayQuestion = () => {
    setPlayCount((current) => current + 1);
    speak(currentQuestion.audioText);
  };

  const clearCanvas = () => {
    for (const canvas of [canvasRef.current, ...wordCanvasRefs.current]) {
      const context = canvas?.getContext("2d");
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    setWordInk([]);
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (listenPhase !== "active" && listenPhase !== "retry") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    listeningPointerIdRef.current = event.pointerId;
    listeningActiveCanvasRef.current = event.currentTarget;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    if (isWordQuestion) {
      const wordIndex = Number(event.currentTarget.dataset.wordIndex);
      setWordInk((current) => Array.from({ length: wordLength }, (_, index) => index === wordIndex || Boolean(current[index])));
    }
    setHasInk(true);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    listeningPointerIdRef.current = null;
    listeningActiveCanvasRef.current = null;
    setIsDrawing(false);
  };

  const fillLineForCell = (index: number) => fillLineStarts.findIndex((start, lineIndex) => index >= start && index < start + lessonLines[lineIndex].length);

  const openFillCell = (index: number) => {
    setFillReviewOpen(false);
    setActiveFillCell(index);
  };

  useEffect(() => {
    const isPracticeWriting = view === "fill-practice" && fillPracticePhase === "writing" && fillPracticeTarget !== null;
    if (!isPracticeWriting && (view !== "fill" || activeFillCell === null)) return;
    const canvas = fillCanvasRef.current;
    if (!canvas) return;
    const saved = isPracticeWriting ? [] : fillPendingCells[activeFillCell!] ?? (fillNeedsRetry.includes(activeFillCell!) ? [] : fillStrokes[activeFillCell!] ?? []);
    let initialized = false;
    const redraw = (resetDraft: boolean) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const initialize = resetDraft || !initialized;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (!initialize && canvas.width === width && canvas.height === height) return;
      if (!initialize && fillActiveStrokeRef.current?.length) {
        fillDraftRef.current.push(fillActiveStrokeRef.current);
        fillActiveStrokeRef.current = null;
        const pointerId = fillPointerIdRef.current;
        fillPointerIdRef.current = null;
        if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
        setFillHasInk(true);
      }
      if (initialize) {
        fillDraftRef.current = saved.map((stroke) => stroke.map((point) => ({ ...point })));
        fillActiveStrokeRef.current = null;
        fillPointerIdRef.current = null;
        setFillHasInk(saved.length > 0);
        setFillIsDirty(false);
      }
      canvas.width = width;
      canvas.height = height;
      initialized = true;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.strokeStyle = "#17324f";
      context.fillStyle = "#17324f";
      context.lineWidth = Math.max(3, rect.width * .009);
      context.lineCap = "round";
      context.lineJoin = "round";
      for (const stroke of fillDraftRef.current) {
        if (!stroke.length) continue;
        context.beginPath();
        context.moveTo(stroke[0].x * rect.width / 100, stroke[0].y * rect.height / 100);
        if (stroke.length === 1) {
          context.arc(stroke[0].x * rect.width / 100, stroke[0].y * rect.height / 100, context.lineWidth / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          for (const point of stroke.slice(1)) context.lineTo(point.x * rect.width / 100, point.y * rect.height / 100);
          context.stroke();
        }
      }
    };
    redraw(true);
    const resize = () => redraw(false);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [view, activeFillCell, fillStrokes, fillNeedsRetry, fillPracticePhase, fillPracticeTarget]);

  const fillPoint = (event: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  };

  const beginFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    fillPointerIdRef.current = event.pointerId;
    setFillIsDirty(true);
    if (view === "fill" && fillParentChecked) {
      setFillParentChecked(false);
      setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
    }
    const point = fillPoint(event);
    fillActiveStrokeRef.current = [point];
    const context = event.currentTarget.getContext("2d");
    const rect = event.currentTarget.getBoundingClientRect();
    if (context) {
      context.beginPath();
      context.arc(point.x * rect.width / 100, point.y * rect.height / 100, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(point.x * rect.width / 100, point.y * rect.height / 100);
    }
  };

  const moveFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== event.pointerId || !fillActiveStrokeRef.current) return;
    event.preventDefault();
    const point = fillPoint(event);
    fillActiveStrokeRef.current.push(point);
    const rect = event.currentTarget.getBoundingClientRect();
    const context = event.currentTarget.getContext("2d");
    if (context) {
      context.lineTo(point.x * rect.width / 100, point.y * rect.height / 100);
      context.stroke();
    }
  };

  const endFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== event.pointerId) return;
    // A quick mouse or pen flick may have no final pointermove event. Keep its
    // pointerup position so the saved miniature matches the stroke on canvas.
    if (event.type === "pointerup" && fillActiveStrokeRef.current?.length) {
      const last = fillActiveStrokeRef.current[fillActiveStrokeRef.current.length - 1];
      const point = fillPoint(event);
      if (Math.hypot(point.x - last.x, point.y - last.y) > .05) {
        fillActiveStrokeRef.current.push(point);
        const context = event.currentTarget.getContext("2d");
        const rect = event.currentTarget.getBoundingClientRect();
        if (context) {
          context.lineTo(point.x * rect.width / 100, point.y * rect.height / 100);
          context.stroke();
        }
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (fillActiveStrokeRef.current?.length) fillDraftRef.current.push(fillActiveStrokeRef.current);
    fillActiveStrokeRef.current = null;
    fillPointerIdRef.current = null;
    setFillHasInk(fillDraftRef.current.length > 0);
    if (view === "fill" && activeFillCell !== null) {
      setFillPendingCells((current) => ({ ...current, [activeFillCell]: fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))) }));
      persistFillRef.current();
    }
  };

  const clearFillDrawing = () => {
    const canvas = fillCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    fillDraftRef.current = [];
    if (view === "fill" && activeFillCell !== null) setFillPendingCells((current) => { const next = { ...current }; delete next[activeFillCell]; return next; });
    setFillHasInk(false);
    setFillIsDirty(true);
  };

  const saveFillDrawing = () => {
    if (activeFillCell === null || !fillDraftRef.current.length) return;
    const index = activeFillCell;
    const lineIndex = fillLineForCell(index);
    const wasFilled = Boolean(fillStrokes[index]?.length);
    const next = { ...fillStrokes, [index]: fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))) };
    const pending = { ...fillPendingCells };
    delete pending[index];
    const remainingRetry = fillNeedsRetry.filter((item) => item !== index);
    try {
      writeFillDraft({ version: 1, lessonIndex: selectedLesson, savedAt: Date.now(), strokes: next, pendingCells: pending, needsRetry: remainingRetry, reviewOpen: false });
    } catch { setStorageError(true); }
    fillDraftRef.current = [];
    setFillStrokes(next);
    setFillPendingCells(pending);
    setActiveFillCell(null);
    setFillParentChecked(false);
    setCompletedFillLessons((current) => current.filter((item) => item !== selectedLesson));
    setFillNeedsRetry(remainingRetry);
    if (fillNeedsRetry.includes(index)) {
      const item = lessonItems[index];
      const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
      if (!remainingRetry.some((position) => lessonItems[position].character === item.character && lessonItems[position].zhuyin === item.zhuyin)) {
        setFillFavorites((current) => current.map((favorite) => fillFavoriteKey(favorite) === key ? { ...favorite, status: "review_later" } : favorite));
      }
    }
    if (wasFilled) {
      if (remainingRetry.length) setActiveFillCell(remainingRetry[0]);
      else if (Object.keys(next).length === lessonItems.length) openFillReview();
      return;
    }
    const lineStart = fillLineStarts[lineIndex];
    const nextEmpty = lessonLines[lineIndex].findIndex((_, offset) => !next[lineStart + offset]?.length);
    if (nextEmpty >= 0) setActiveFillCell(lineStart + nextEmpty);
    else if (Object.keys(next).length === lessonItems.length) openFillReview();
    else {
      const nextUnwritten = lessonItems.findIndex((_, itemIndex) => !next[itemIndex]?.length);
      if (nextUnwritten >= 0) setActiveFillCell(nextUnwritten);
    }
  };

  const leaveFillCell = () => {
    if (fillDraftRef.current.length && activeFillCell !== null) {
      setFillPendingCells((current) => ({ ...current, [activeFillCell]: fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))) }));
      persistFillRef.current();
    }
    setActiveFillCell(null);
  };

  const goToNextQuestion = () => {
    if (listenIndex >= listeningQuestions.length - 1) {
      setPracticeState((current) => ({ ...current, completedSessions: current.completedSessions + 1 }));
      setView("result");
      clearListenTimers();
      return;
    }
    resetListeningQuestion(listenIndex + 1);
  };

  const handleParentDecision = (result: Exclude<ParentResult, null>) => {
    if (result === "correct") {
      markQuestionPracticed(selectedLesson, currentQuestion.id);
      if (singleQuestionPractice) {
        setPracticeNotice("這題練完了！可以再練一次，或取消收藏。 ");
        setView("practice");
        clearListenTimers();
      } else {
        setSessionScore((current) => ({ ...current, listeningCorrect: current.listeningCorrect + currentQuestion.answer.split("|").length }));
        goToNextQuestion();
      }
    } else {
      setReviewedIndexes((current) => current.includes(listenIndex) ? current : [...current, listenIndex]);
      saveQuestion(selectedLesson, currentQuestion.id, true);
      setListenPhase("remediation_offer");
      setListenMessage("已加入待補強，可以現在練，也可以稍後再練。 ");
    }
  };

  const deferRemediation = () => {
    if (singleQuestionPractice) {
      setPracticeNotice("這題還在待補強清單，之後可以再練。");
      setView("practice");
      clearListenTimers();
    } else goToNextQuestion();
  };

  const selectRemediation = (answer: string) => {
    if (answer !== currentQuestion.answer) {
      setRetryMessage("再聽聽看，這個選項還不是剛剛聽到的內容。 ");
      return;
    }
    setRetryMessage("你選對了！請再寫一次。 ");
    clearCanvas();
    setListenPhase("retry_ready");
    setListenMessage("選對了！按下再聽一次並重寫，聽到聲音後開始寫。 ");
  };

  const submitRetryWriting = () => {
    if (!hasCompleteInk) return;
    clearListenTimers();
    stopPlayback();
    setSecondsLeft(0);
    setListenPhase("review");
    setListenMessage("這是補強後的手寫答案，請家長再次判定。 ");
  };

  const navigate = (next: View) => {
    if (view === "fill" && next !== "fill" && !fillParentChecked && hasFillDraft) {
      persistFillRef.current();
      setFillExitTarget(next);
      return;
    }
    if (next !== "listen") clearListenTimers();
    if (next === "more") setMorePanel("home");
    setView(next);
  };

  const leaveFill = () => {
    if (!fillExitTarget) return;
    persistFillRef.current();
    const target = fillExitTarget;
    setFillExitTarget(null);
    if (target === "more") setMorePanel("home");
    setView(target);
  };

  const renderFillDialog = () => {
    if (fillResumeDraft) return <div className="fill-dialog-backdrop"><div className="fill-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fill-resume-title" aria-describedby="fill-resume-description"><span className="fill-dialog-icon" aria-hidden="true"><PencilLine size={29} weight="duotone" /></span><h2 id="fill-resume-title">要繼續上次的默寫嗎？</h2><p id="fill-resume-description">第{lessonNumber}課「{lesson.title}」的筆跡已保存在這台裝置。</p><button className="fill-dialog-primary" type="button" autoFocus onClick={resumeFillDraft}>繼續默寫</button><button className="fill-dialog-secondary" type="button" onClick={restartFillDraft}>重新開始</button></div></div>;
    if (fillExitTarget) return <div className="fill-dialog-backdrop"><div className="fill-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fill-exit-title" aria-describedby="fill-exit-description"><span className="fill-dialog-icon" aria-hidden="true"><PencilLine size={29} weight="duotone" /></span><h2 id="fill-exit-title">要先離開默寫嗎？</h2><p id="fill-exit-description">{storageError ? "這台裝置目前無法保存筆跡，離開後可能會消失。" : "目前寫好的內容已自動保存。下次進來，可以繼續寫。"}</p><button className="fill-dialog-primary" type="button" autoFocus onClick={() => setFillExitTarget(null)}>留下繼續寫</button><button className="fill-dialog-secondary" type="button" onClick={leaveFill}>{storageError ? "仍要離開" : "儲存並離開"}</button></div></div>;
    return null;
  };

  const renderCourses = () => (
    <section className="page-section course-journey">
      <div className="journey-heading">
        <div className="journey-heading-copy"><h1>選擇課程</h1><p>跟著注音，一步一步探索吧！</p></div>
        <img src="/course-art/course-journey-hero-v2.png" alt="" aria-hidden="true" />
      </div>
      <div className="journey-list">
        {lessons.map((item, index) => {
          const isRecent = practiceState.recentLesson === index;
          return <div className={`journey-step journey-step-${index % 3}`} key={item.title} id={`course-lesson-${index + 1}`}>
            <span className="journey-station" aria-hidden="true">{index === 0 && <img className="journey-flag-scene" src="/course-art/course-flag-grass-v1.png" alt="" />}{index + 1}</span>
            <button className="journey-card" type="button" onClick={() => openLesson(index)} aria-label={`第${lessonNumerals[index]}課，${item.title}${isRecent ? "，上次練習" : ""}`}>
              <span className="journey-card-copy"><small>第{lessonNumerals[index]}課</small><strong>{item.title}</strong>{isRecent && <em>上次練習</em>}</span>
              <img className="journey-art" src={`/course-art/${courseArtwork[index]}-watercolor.png`} alt="" aria-hidden="true" loading={index > 3 ? "lazy" : "eager"} />
              <span className="journey-arrow" aria-hidden="true"><ArrowRight size={23} weight="bold" /></span>
            </button>
          </div>;
        })}
      </div>
      <div className="journey-footer" aria-hidden="true"><img src="/course-art/course-journey-footer-sign-v2.png" alt="" /></div>
    </section>
  );

  const renderLesson = () => (
    <section className="page-section lesson-page">
      <div className={`lesson-heading${selectedLesson === 7 ? " is-radish" : ""}`}><div><span className="eyebrow">LESSON {String(selectedLesson + 1).padStart(2, "0")}</span><h1>{lesson.title}</h1></div><img className="lesson-heading-art" src={selectedLesson === 7 ? "/course-art/radish-story.png" : `/course-art/${courseArtwork[selectedLesson]}-watercolor.png`} alt="" /></div>
      {exercises[selectedLesson] && <div className="mode-grid">
        <button className="mode-card fill-mode" type="button" onClick={openFill}><span className="mode-icon" aria-hidden="true"><PencilLine size={28} weight="duotone" /></span><span className="lesson-mode-copy"><small>第一關</small><strong>課文默寫</strong></span><span className="lesson-mode-cta">開始 <ArrowRight size={19} weight="bold" aria-hidden="true" /></span></button>
        <button className="mode-card listen-mode" type="button" onClick={openListening}><span className="mode-icon" aria-hidden="true"><Headphones size={28} weight="duotone" /></span><span className="lesson-mode-copy"><small>第二關</small><strong>聽寫</strong></span><span className="lesson-mode-cta">開始 <ArrowRight size={19} weight="bold" aria-hidden="true" /></span></button>
      </div>}
      <div className="lesson-curriculum">
        <div className="lesson-curriculum-heading">
          <strong>課文</strong>
          <div className="lesson-preview-switch" role="group" aria-label="課文顯示方式">
            <button type="button" aria-pressed={previewMode === "annotated"} onClick={() => setPreviewMode("annotated")}>國字＋注音</button>
            <button type="button" aria-pressed={previewMode === "zhuyin"} onClick={() => setPreviewMode("zhuyin")}>純注音</button>
          </div>
        </div>
        <div className={`lesson-text-lines ${previewMode === "zhuyin" ? "is-zhuyin-only" : ""}`} dir="rtl" aria-label={`${lesson.title}課文，第 ${previewPage + 1} 頁，共 ${previewPageCount} 頁，由右向左閱讀`} style={{ "--preview-columns": previewColumns, "--preview-max-chars": Math.max(...lesson.lines.map((line) => Array.from(line).length)) } as React.CSSProperties}
          onPointerDown={(event) => {
            previewPointerStartRef.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { previewPointerStartRef.current = null; }}
          onPointerUp={(event) => {
            const start = previewPointerStartRef.current;
            previewPointerStartRef.current = null;
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
            setPreviewPage((page) => Math.max(0, Math.min(previewPageCount - 1, page + (dx > 0 ? 1 : -1))));
          }}
          onWheel={(event) => {
            if (Math.abs(event.deltaX) < 35 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.3 || Date.now() - previewWheelAtRef.current < 450) return;
            previewWheelAtRef.current = Date.now();
            setPreviewPage((page) => Math.max(0, Math.min(previewPageCount - 1, page + (event.deltaX < 0 ? 1 : -1))));
          }}>
          {previewVisibleLines.map((line, pageLineIndex) => {
            const lineIndex = previewPage * previewColumns + pageLineIndex;
            return <div className="lesson-text-line" dir="ltr" key={lineIndex}>{Array.from(line).map((char, charIndex) => <span key={charIndex}>{char}{previewPronunciationVariants[selectedLesson]?.[lineIndex]?.[charIndex] ?? ""}</span>)}</div>;
          })}
        </div>
        {previewPageCount > 1 && <div className="lesson-page-controls" aria-label="課文翻頁">
          <div className="lesson-page-action"><button type="button" className="lesson-page-circle" onClick={() => setPreviewPage((page) => Math.min(previewPageCount - 1, page + 1))} disabled={previewPage >= previewPageCount - 1} aria-label="下一頁"><ArrowLeft size={27} weight="bold" aria-hidden="true" /></button><small>下一頁</small></div>
          <div className="lesson-page-position"><div className="lesson-page-dots" aria-hidden="true">{Array.from({ length: previewPageCount }, (_, index) => <i className={index === previewPage ? "is-current" : ""} key={index} />)}</div><span className="lesson-page-counter" aria-live="polite">第 {previewPage + 1} / {previewPageCount} 頁</span></div>
          <div className="lesson-page-action"><button type="button" className="lesson-page-circle" onClick={() => setPreviewPage((page) => Math.max(0, page - 1))} disabled={previewPage === 0} aria-label="上一頁"><ArrowRight size={27} weight="bold" aria-hidden="true" /></button><small>上一頁</small></div>
        </div>}
        <div className="lesson-curriculum-heading"><strong>注音符號</strong></div>
        <div className="lesson-symbols" dir="rtl" aria-label="本課注音符號，點選可聽發音">{lesson.symbols.map((symbol) => <button type="button" className={`${symbol.length > 1 ? "is-combination " : ""}${playingSymbol === symbol ? "is-playing" : ""}`} key={symbol} onClick={() => playPreviewSymbol(symbol)} aria-label={`播放注音符號 ${symbol}`}><span>{symbol}</span><SpeakerHigh size={15} weight="fill" aria-hidden="true" /></button>)}</div>
      </div>
      <div className="lesson-meadow-footer" aria-hidden="true" />
      {!exercises[selectedLesson] && <p className="lesson-upcoming">這一課的課文默寫與聽寫練習準備中。</p>}
    </section>
  );

  const renderFillBlank = () => (
    <section className={`page-section fill-page ${fillParentChecked ? "is-complete" : ""}`}>
      <div className="fill-story-heading">
        <div className="fill-story-copy"><span className="fill-story-kicker">第{lessonNumber}課 · 課文默寫</span><h1>{lesson.title}</h1><p className="fill-sheet-help">{fillParentChecked ? "家長已檢查。修改任何一格後，需要再檢查一次。" : "先寫完整篇，再請家長對照答案。"}{fillNeedsRetry.length > 0 && `有 ${fillNeedsRetry.length} 格待重寫。`}</p></div>
        <img className="fill-story-art" src={selectedLesson === 7 ? "/course-art/radish-story.png" : `/course-art/${courseArtwork[selectedLesson]}-watercolor.png`} alt="" />
      </div>
      <div className="fill-status-line"><span>{fillParentChecked ? "家長已檢查" : `已寫 ${writtenCount} / ${lessonItems.length} 格`}</span>{lessonLines.length > 5 && <small>左右滑動看其他行</small>}</div>
      {storageError && <p className="fill-storage-error" role="alert">這台裝置目前無法保存默寫；請先不要關閉頁面，檢查瀏覽器的儲存設定。</p>}
      <div className="zhuyin-sheet">
        <div className={`syllable-row ${lessonLines.length > 5 ? "has-many-lines" : ""}`} dir="rtl" aria-label="課文直排注音，從右向左閱讀">
          {lessonLines.map((line, lineIndex) => {
            const lineStart = fillLineStarts[lineIndex];
            return <div className="syllable-column" role="group" aria-label={`第 ${lineIndex + 1} 行`} key={lineIndex}>
              <span className="fill-line-label">第{lineIndex + 1}行</span>
              {line.map((_, itemIndex) => {
                const index = lineStart + itemIndex;
                return <button className={`syllable-cell fill-cell ${fillStrokes[index]?.length ? "is-filled" : "is-target"} ${fillPendingCells[index]?.length ? "is-in-progress" : ""} ${fillNeedsRetry.includes(index) ? "is-needs-retry" : ""}`} key={index} type="button" aria-label={`第 ${lineIndex + 1} 行第 ${itemIndex + 1} 格，${fillPendingCells[index]?.length ? "尚未完成，繼續寫注音" : fillNeedsRetry.includes(index) ? "待重寫" : fillStrokes[index]?.length ? "修改注音" : "寫注音"}`} onClick={() => openFillCell(index)}>{fillPendingCells[index]?.length ? <InkPreview strokes={fillPendingCells[index]} /> : fillStrokes[index]?.length ? <InkPreview strokes={fillStrokes[index]} /> : <span className="fill-cell-plus" aria-hidden="true">＋</span>}</button>;
              })}
            </div>;
          })}
        </div>
        <img className="fill-pencil-art" src="/course-art/blue-watercolor-pencil.png" alt="" />
      </div>
      {!fillComplete && <button className="fill-begin-button" type="button" onClick={() => openFillCell(lessonItems.findIndex((_, index) => !fillStrokes[index]?.length))}>{writtenCount ? "從下一格繼續" : "從第一格開始"} <ArrowRight size={19} aria-hidden="true" /></button>}
      {fillComplete && !fillParentChecked && <div className="fill-check-actions">{fillNeedsRetry.length > 0 && <button type="button" className="fill-begin-button" onClick={() => openFillCell(fillNeedsRetry[0])}>重寫待補強的 {fillNeedsRetry.length} 格 <ArrowRight size={19} aria-hidden="true" /></button>}<button type="button" className="fill-begin-button" onClick={openFillReview}>請家長檢查 <ArrowRight size={19} aria-hidden="true" /></button></div>}
      {fillParentChecked && <div className="completion-banner"><span>✓</span><p><strong>家長檢查完成！</strong><small>全部注音都已對照；也可以點格子修改。</small></p><button type="button" className="primary-button" onClick={openListening}>進入聽寫 <span>→</span></button></div>}
      {!fillParentChecked && <p className="fill-parent-cue">完成後請家長檢查</p>}
    </section>
  );

  const renderFillWriting = () => {
    if (activeFillCell === null) return null;
    const lineIndex = fillLineForCell(activeFillCell);
    const position = activeFillCell - fillLineStarts[lineIndex] + 1;
    return <main className="fill-focus-shell">
      <header className="fill-focus-header"><button type="button" onClick={leaveFillCell}><ArrowLeft size={19} aria-hidden="true" /> 回到課文</button><strong>第 {lineIndex + 1} 行 · 第 {position} 格</strong><span>{writtenCount} / {lessonItems.length}</span></header>
      <div className="fill-focus-body"><div className="fill-focus-intro"><div><span className="writing-kicker">第{lessonNumber}課 · {lesson.title}</span><h1>寫出完整注音</h1><p>記得寫聲調，寫好後按「完成這格」。</p></div><img src={selectedLesson === 7 ? "/course-art/radish-story.png" : `/course-art/${courseArtwork[selectedLesson]}-watercolor.png`} alt="" /></div><div className="fill-writing-grid"><canvas ref={fillCanvasRef} onPointerDown={beginFillDrawing} onPointerMove={moveFillDrawing} onPointerUp={endFillDrawing} onPointerCancel={endFillDrawing} aria-label={`第 ${lineIndex + 1} 行第 ${position} 格手寫區`} /></div><div className="fill-writing-actions"><button type="button" className="fill-clear-button" onClick={clearFillDrawing}>清除重寫</button><button type="button" className="fill-save-button" disabled={!fillHasInk} onClick={saveFillDrawing}>完成這格 <ArrowRight size={19} aria-hidden="true" /></button></div></div>
    </main>;
  };

  const renderFillReview = () => {
    if (!fillReviewOpen) return null;
    const confirmFillReview = () => {
      if (fillNeedsRetry.length) return;
      setFillReviewOpen(false);
      setFillParentChecked(true);
      setCompletedFillLessons((current) => current.includes(selectedLesson) ? current : [...current, selectedLesson]);
    };
    const savedCount = fillFavorites.filter((favorite) => favorite.lessonIndex === selectedLesson).reduce((count, favorite) => count + favorite.positions.length, 0);
    return <main className="fill-focus-shell fill-review-shell">
      <header className="fill-focus-header"><button type="button" onClick={() => setFillReviewOpen(false)}><ArrowLeft size={19} aria-hidden="true" /> 回到課文</button><strong>家長檢查</strong><img className="fill-review-corner" src="/course-art/review-corner-leaves-watercolor-v2.png" alt="" /></header>
      <div className="fill-review-body">
        <div className="fill-review-intro"><div><h1>第{lessonNumber}課 · {lesson.title}</h1><small>已寫 {lessonItems.length} / {lessonItems.length} 格 · 已收藏 {savedCount} 格{fillNeedsRetry.length ? ` · ${fillNeedsRetry.length} 格待重寫` : ""}</small></div><img src={selectedLesson === 0 ? "/course-art/review-sleeping-cat-watercolor-v2.png" : selectedLesson === 7 ? "/course-art/radish-story.png" : `/course-art/${courseArtwork[selectedLesson]}-watercolor.png`} alt="" /></div>
        <div className="fill-compare-list">{lessonLines.map((line, lineIndex) => <section className="fill-review-line" key={lineIndex} aria-label={`第 ${lineIndex + 1} 行`}>
          <h2>第 {lineIndex + 1} 行</h2>
          {line.map((item, offset) => {
            const index = fillLineStarts[lineIndex] + offset;
            const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
            const saved = fillFavorites.some((favorite) => fillFavoriteKey(favorite) === key && favorite.positions.includes(index));
            const needsRetry = fillNeedsRetry.includes(index);
            return <div className={`fill-compare-row ${saved ? "is-saved" : ""} ${needsRetry ? "is-needs-retry" : ""}`} key={index}>
              <span className="fill-compare-number">{offset + 1}</span>
              <div className="fill-compare-sample"><div className="fill-compare-ink"><InkPreview strokes={fillStrokes[index] ?? []} /></div><small>孩子筆跡</small></div>
              <div className="fill-compare-sample"><div className="fill-compare-answer"><ZhuyinStack text={item.zhuyin} /></div><small>正確注音</small></div>
              <button type="button" className="fill-favorite-toggle" aria-label={`${saved ? "取消收藏" : "收藏"}第 ${lineIndex + 1} 行第 ${offset + 1} 格`} aria-pressed={saved} onClick={() => toggleFillFavorite(index)}><Star size={25} weight={saved ? "fill" : "regular"} aria-hidden="true" /></button>
              <button type="button" className="fill-rewrite-cell" onClick={() => rewriteFillCell(index)} aria-label={`重寫第 ${lineIndex + 1} 行第 ${offset + 1} 格`}><PencilLine size={18} aria-hidden="true" /><span>重寫這格</span></button>
            </div>;
          })}
        </section>)}</div>
        <div className="fill-review-footer">{fillNeedsRetry.length > 0 && <p role="status">請先點上方對應的「重寫這格」，完成後再確認檢查。</p>}<div className="fill-review-actions"><button type="button" onClick={() => setFillReviewOpen(false)}>稍後檢查</button><button type="button" disabled={fillNeedsRetry.length > 0} onClick={confirmFillReview}>完成檢查 <ArrowRight size={19} aria-hidden="true" /></button></div></div>
      </div>
    </main>;
  };

  const renderFillPractice = () => {
    if (!fillPracticeTarget) return null;
    const favorite = fillPracticeTarget;
    const location = fillLocation(favorite.lessonIndex, favorite.positions[0]);
    return <main className="fill-focus-shell fill-practice-shell">
      <header className="fill-focus-header"><button type="button" onClick={() => { if (fillPracticePhase === "writing" && fillIsDirty) { setFillPracticeExitOpen(true); return; } setView("practice"); }}><ArrowLeft size={19} aria-hidden="true" /> 回到練習</button><strong>錯字重練</strong><span>第{lessonNumerals[favorite.lessonIndex]}課</span></header>
      {fillPracticePhase === "writing" ? <div className="fill-focus-body"><div className="fill-practice-prompt"><small>{lessons[favorite.lessonIndex].title} · {location}</small><h1>寫出「{favorite.character}」的注音</h1><p>寫好後交給家長檢查，正確答案會在下一頁顯示。</p></div><div className="fill-writing-grid"><canvas ref={fillCanvasRef} onPointerDown={beginFillDrawing} onPointerMove={moveFillDrawing} onPointerUp={endFillDrawing} onPointerCancel={endFillDrawing} aria-label={`${favorite.character}注音手寫區`} /></div><div className="fill-writing-actions"><button type="button" className="fill-clear-button" onClick={clearFillDrawing}>清除重寫</button><button type="button" className="fill-save-button" disabled={!fillHasInk} onClick={() => { if (!fillDraftRef.current.length) return; setFillPracticeStrokes(fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point })))); setFillPracticePhase("review"); }}>請家長檢查 <ArrowRight size={19} aria-hidden="true" /></button></div></div> : <div className="fill-review-body fill-practice-review"><h1>請家長一起檢查</h1><p>{lessons[favorite.lessonIndex].title} · {location} ·「{favorite.character}」</p><div className="fill-practice-compare"><div><small>孩子寫的</small><div className="fill-compare-ink"><InkPreview strokes={fillPracticeStrokes} /></div></div><div><small>正確注音</small><div className="fill-compare-answer"><ZhuyinStack text={favorite.zhuyin} /></div></div></div><div className="fill-review-actions"><button type="button" onClick={() => { setFillPracticePhase("writing"); setFillPracticeStrokes([]); setFillHasInk(false); }}>再寫一次</button><button type="button" onClick={() => removeFillFavorite(favorite, true)}>已掌握 · 移出收藏</button></div><button type="button" className="fill-practice-defer" onClick={() => { setFillFavorites((current) => current.map((item) => fillFavoriteKey(item) === fillFavoriteKey(favorite) ? { ...item, status: "review_later" } : item)); setPracticeNotice("已保留在錯字收藏，下次可以再練。"); setView("practice"); }}>稍後再練，保留收藏</button></div>}
      {fillPracticeExitOpen && <div className="fill-dialog-backdrop"><div className="fill-dialog" role="alertdialog" aria-modal="true" aria-labelledby="practice-exit-title" aria-describedby="practice-exit-description"><span className="fill-dialog-icon" aria-hidden="true"><PencilLine size={29} weight="duotone" /></span><h2 id="practice-exit-title">這格還沒寫完</h2><p id="practice-exit-description">現在離開會失去這次筆跡；錯字收藏仍會保留，可以之後再練。</p><button className="fill-dialog-primary" type="button" autoFocus onClick={() => setFillPracticeExitOpen(false)}>繼續寫</button><button className="fill-dialog-secondary" type="button" onClick={() => { setFillPracticeExitOpen(false); setView("practice"); }}>離開這格</button></div></div>}
    </main>;
  };

  const renderPractice = () => (
    <section className="page-section practice-page">
      <SectionHeading eyebrow="YOUR PRACTICE" title="練習紀錄" description="收藏與待補強，隨時重練。" />
      {storageError && <p className="practice-storage-error" role="alert">這個瀏覽器目前無法儲存收藏；關閉頁面後，紀錄可能會消失。</p>}
      {practiceNotice && <p className="practice-notice" role="status">{practiceNotice}</p>}
      <div className="section-title-row"><h2>課文默寫 · 錯字收藏</h2><span className="list-count">{fillFavorites.length} 個注音</span></div>
      {fillFavorites.length ? <div className="saved-question-list fill-favorite-list">{fillFavorites.map((favorite) => <div className="saved-question fill-favorite" key={fillFavoriteKey(favorite)}>
        <span className="saved-question-icon"><PencilLine size={24} weight="duotone" aria-hidden="true" /></span>
        <div className="saved-question-copy"><strong>第{lessonNumerals[favorite.lessonIndex]}課 · {lessons[favorite.lessonIndex].title} · {favorite.character}</strong><small>{fillLocation(favorite.lessonIndex, favorite.positions[0])}{favorite.positions.length > 1 ? ` 等 ${favorite.positions.length} 格` : ""} · {favorite.status === "needs_rewrite" ? "待重寫" : "待複習"}</small></div>
        <div className="saved-question-actions"><button type="button" className="saved-start" onClick={() => openFillFavorite(favorite)}>重練注音</button><button type="button" className="saved-remove" onClick={() => removeFillFavorite(favorite)}>取消收藏</button></div>
      </div>)}</div> : <div className="empty-reinforce"><span><PencilLine size={28} weight="duotone" aria-hidden="true" /></span><strong>目前沒有課文錯字收藏</strong><small>家長檢查默寫時標記「需要重寫」，就會自動加入這裡。</small></div>}
      <div className="section-title-row practice-list-heading"><h2>聽寫 · 待補強與收藏</h2><span className="list-count">{practiceState.savedQuestions.filter((item) => item.needsPractice).length} 題待補強</span></div>
      {practiceState.savedQuestions.length ? <div className="saved-question-list">
        {[...practiceState.savedQuestions].sort((a, b) => Number(Boolean(b.needsPractice)) - Number(Boolean(a.needsPractice))).map(({ lessonIndex, questionId, needsPractice }, savedIndex) => {
          const question = findQuestionSeed(lessonIndex, questionId);
          if (!question) return null;
          return <div className="saved-question" key={`${lessonIndex}-${questionId}`}>
            <span className="saved-question-icon"><Headphones size={24} weight="duotone" aria-hidden="true" /></span>
            <div className="saved-question-copy"><strong>第{lessonNumerals[lessonIndex]}課 · {listenCategoryLabels[question.category]}</strong><small>{lessons[lessonIndex].title} · {needsPractice ? "待補強" : "已收藏"} · 題目 {savedIndex + 1}</small></div>
            <div className="saved-question-actions">
              <button type="button" onClick={() => speak(question.audioText)} aria-label={`播放第${lessonNumerals[lessonIndex]}課收藏題目 ${savedIndex + 1}`}><SpeakerHigh size={18} aria-hidden="true" /> 播放</button>
              <button type="button" className="saved-start" onClick={() => openSavedQuestion(lessonIndex, questionId)}>重練這題</button>
              <button type="button" className="saved-remove" onClick={() => removeQuestion(lessonIndex, questionId)}>取消收藏</button>
            </div>
          </div>;
        })}
      </div> : <div className="empty-reinforce"><span><Headphones size={28} weight="duotone" aria-hidden="true" /></span><strong>目前沒有待補強或收藏題目</strong><small>聽寫時按「需要補強」會先記下題目，之後可以再練。</small></div>}
      <div className="practice-list"><div className="section-title-row"><h2>最近練習</h2><span className="list-count">{practiceState.recentLesson === null ? "0 個紀錄" : "1 個紀錄"}</span></div>
        {practiceState.recentLesson === null ? <p className="practice-no-recent">還沒有練習紀錄，先選一課開始吧。</p> : <button className="practice-row" type="button" onClick={() => openLesson(practiceState.recentLesson!)}><span className="practice-row-icon">{String(practiceState.recentLesson + 1).padStart(2, "0")}</span><span><strong>第{lessonNumerals[practiceState.recentLesson]}課・{lessons[practiceState.recentLesson].title}</strong><small>回到課程</small></span><span className="journey-arrow" aria-hidden="true"><ArrowRight size={21} weight="bold" /></span></button>}
      </div>
    </section>
  );

  const renderMore = () => {
    if (morePanel === "home") return <section className="page-section more-page">
      <h1 className="more-title"><span>更多</span></h1>
      <div className="more-group"><h2>練習設定</h2><div className="more-settings-list">
        <button type="button" onClick={() => setMorePanel("listening")}><span className="more-row-icon blue"><MusicNotes size={21} aria-hidden="true" /></span><span><strong>聽寫設定</strong><small>播放 {listeningSettings.repeatCount} 次 · 間隔 {listeningSettings.intervalSeconds} 秒</small></span><span className="more-arrow" aria-hidden="true"><ArrowRight size={21} weight="bold" /></span></button>
      </div></div>
      <div className="more-group"><h2>資訊與協助</h2><div className="more-settings-list">
        <button type="button" onClick={() => setMorePanel("help")}><span className="more-row-icon green"><Question size={21} aria-hidden="true" /></span><span><strong>使用說明</strong><small>課文默寫、聽寫與錯題重練</small></span><span className="more-arrow" aria-hidden="true"><ArrowRight size={21} weight="bold" /></span></button>
        <button type="button" onClick={() => setMorePanel("versions")}><span className="more-row-icon orange"><Info size={21} aria-hidden="true" /></span><span><strong>版本</strong><small>目前 {siteReleaseNotes[0][0]} · Beta 測試版</small></span><span className="more-arrow" aria-hidden="true"><ArrowRight size={21} weight="bold" /></span></button>
      </div></div>
      <p className="more-device-note">練習紀錄與設定只存在目前的裝置，不需要登入。</p>
    </section>;

    return <section className="page-section more-page more-detail-page">
      <button type="button" className="more-back" onClick={() => setMorePanel("home")}><ArrowLeft size={19} aria-hidden="true" /> 更多</button>
      {morePanel === "listening" && <div id="listening-settings" className="more-detail-content"><h1>聽寫設定</h1><p className="more-detail-intro">一般題 30 秒；較長的圈詞會有更多書寫時間。設定只留在這台裝置。</p><div className="more-setting-group"><fieldset><legend>每題播放幾次</legend><div className="settings-options">{([1, 2, 3] as const).map((count) => <button type="button" key={count} aria-pressed={listeningSettings.repeatCount === count} onClick={() => setListeningSettings((current) => ({ ...current, repeatCount: count }))}>{count} 次</button>)}</div></fieldset><fieldset><legend>唸完後，隔多久再唸</legend><div className="settings-options">{([5, 8, 10] as const).map((seconds) => <button type="button" key={seconds} aria-pressed={listeningSettings.intervalSeconds === seconds} onClick={() => setListeningSettings((current) => ({ ...current, intervalSeconds: seconds }))}>{seconds} 秒</button>)}</div></fieldset></div><p className="more-detail-footnote">作答時可按「再聽一次」；這不會改變上方設定。</p></div>}
      {morePanel === "help" && <div className="more-detail-content"><h1>使用說明</h1><div className="help-steps"><section><span>01</span><div><h2>選一課開始</h2><p>每課有課文默寫與聽寫。可以先看課文預覽，再選要練的方式。</p></div></section><section><span>02</span><div><h2>課文默寫</h2><p>點空格寫完整注音。整篇完成後請家長對照；標記需要重寫的字會留在練習頁。</p></div></section><section><span>03</span><div><h2>聽寫與補強</h2><p>按「開始聽」播放題目，寫完交給家長檢查。需要補強的題目可現在練，也可稍後從練習頁重練。</p></div></section></div><button type="button" className="more-primary-link" onClick={() => setView("courses")}>前往課程 <ArrowRight size={18} aria-hidden="true" /></button></div>}
      {morePanel === "versions" && <div className="more-detail-content"><h1>版本</h1><p className="more-detail-intro">網站目前仍在 Beta 測試階段，版本依 SemVer 格式記錄。開發過程中的細項更新可在 <a href="https://github.com/KakuKain/zhuyin-practice-station/commits/main/" target="_blank" rel="noopener noreferrer">GitHub 提交紀錄</a>查看。</p><div className="version-list">{siteReleaseNotes.map(([version, title, description], index) => <details key={version} open={index === 0}><summary><span>{version}</span><strong>{title}</strong><span className="version-chevron">⌄</span></summary><p>{description}</p></details>)}</div><p className="more-audio-credit">單個注音符號讀音來源：<a href="https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/" target="_blank" rel="noopener noreferrer">教育部《國語注音符號手冊》</a>，依 <a href="https://creativecommons.org/licenses/by/4.0/deed.zh_TW" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> 授權使用；網站已轉為 M4A 並調整播放速度。</p></div>}
    </section>;
  };

  const renderResult = () => (
    <section className="page-section result-page">
      <div className="result-celebration"><span className="result-spark">✦</span><div className="result-check">✓</div><span className="result-spark right">✦</span></div>
      <span className="eyebrow">PRACTICE COMPLETE</span><h1>練習完成！</h1><p className="result-intro">今天的第{lessonNumber}課，你已經往前走了一小步。</p>
      <div className="result-card"><div><span className="result-icon fill"><PencilLine size={22} weight="duotone" /></span><span><strong>課文默寫</strong><small>直式注音格 · {completedFillLessons.includes(selectedLesson) ? "已完成" : "尚未練習"}</small></span><b>{completedFillLessons.includes(selectedLesson) ? "✓" : "—"}</b></div><div><span className="result-icon listen"><Headphones size={22} weight="duotone" /></span><span><strong>聽寫</strong><small>三大題 · {sessionScore.listeningCorrect} / {sessionWritingUnits} 格完成</small></span><b>✓</b></div></div>
      <div className="result-note"><span>☼</span><p><strong>待補強：{pendingSessionCount} 題</strong><small>{pendingSessionCount ? "題目已留在「練習」，可以稍後單題重練。" : "這次沒有待補強的題目；收藏的題目仍可在「練習」重練。"}</small></p></div>
      <div className="result-actions"><button className="primary-button" type="button" onClick={openListening}>再練一次 <span>↻</span></button><button className="secondary-button" type="button" onClick={() => setView("practice")}>查看收藏</button><button className="secondary-button" type="button" onClick={() => setView("lesson")}>回到課次</button></div>
    </section>
  );

  const renderListeningCanvas = () => (
    <div className={`canvas-zone ${isWordQuestion ? "is-word" : ""} ${isWordQuestion && wordLength > 2 ? "is-long-word" : ""} ${["review", "remediation_offer", "choice", "retry_ready"].includes(listenPhase) ? "is-locked" : ""}`}>
      <div className="canvas-surface">
        {isWordQuestion ? <div className="word-canvas-stack" aria-label={`語詞 ${wordLength} 格田字格`}>
          {Array.from({ length: wordLength }, (_, index) => <div className="canvas-paper word-paper" key={index}>
            <span className="word-paper-label" aria-hidden="true">第 {index + 1} 字</span>
            <canvas ref={(element) => { wordCanvasRefs.current[index] = element; }} data-word-index={index} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} onPointerLeave={endDrawing} aria-label={`語詞第 ${index + 1} 字田字格手寫區`} />
          </div>)}
        </div> : <div className="canvas-paper"><canvas ref={canvasRef} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} onPointerLeave={endDrawing} aria-label="田字格手寫區" /></div>}
        {listenPhase === "choice" && <div className="canvas-replay-overlay"><button type="button" className="canvas-replay-button" onClick={replayQuestion} aria-label="再播放一次題目"><Play size={30} weight="fill" aria-hidden="true" /></button><span>點一下，再聽一次</span></div>}
        {listenPhase === "retry_ready" && <div className="canvas-replay-overlay retry-ready-overlay"><strong>答對了！再聽一次，重新寫。</strong><button type="button" onClick={startRetryWriting}><Play size={22} weight="fill" aria-hidden="true" /> 再聽一次並重寫</button></div>}
      </div>
      <div className="canvas-toolbar"><span>{isWordQuestion ? "依序每格寫一個字的注音" : "田字格"}</span><button type="button" onClick={clearCanvas} disabled={listenPhase !== "active" && listenPhase !== "retry"}>清除</button></div>
    </div>
  );

  const renderFocusMode = () => {
    const choiceAnswers = currentQuestion.choices;
    return (
    <main className={`focus-shell phase-${listenPhase}`}>
      <audio ref={playbackRef} onEnded={() => { setPlayingSymbol(null); playbackEndedRef.current(); }} preload="none" hidden aria-hidden="true" />
      <header className="focus-topbar"><button type="button" className="focus-exit" onClick={leaveFocus}>← <span>離開</span></button><div className="focus-question"><strong>{listenCategoryLabels[currentQuestion.category]}</strong><small>{sectionProgress}</small></div><div className="focus-meta"><span className={secondsLeft <= 8 && (listenPhase === "active" || listenPhase === "retry") ? "urgent" : ""}><Timer size={14} weight="bold" /> {listenPhase === "retry_ready" ? "待重寫" : listenPhase === "review" || listenPhase === "choice" ? "已交卷" : `${String(Math.floor((listenPhase === "ready" ? questionDuration : secondsLeft) / 60)).padStart(2, "0")}:${String((listenPhase === "ready" ? questionDuration : secondsLeft) % 60).padStart(2, "0")}`}</span><span aria-label={`已播放 ${playCount} 次`}><SpeakerHigh size={14} weight="bold" /> {playCount} 次</span></div></header>
      <div className="focus-content">
        <p className="sr-only" aria-live="polite">{listenMessage}</p>
        {listenPhase === "ready" ? <div className="listen-ready-card"><div className="listen-ready-heading"><div><span className="writing-kicker">第{lessonNumber}課 · {lesson.title}</span><span className="listen-ready-icon"><Headphones size={31} weight="duotone" aria-hidden="true" /></span><h1>準備聽寫</h1></div><img className="listen-ready-art" src={selectedLesson === 7 ? "/course-art/radish-story.png" : `/course-art/${courseArtwork[selectedLesson]}-watercolor.png`} alt="" /></div><p>{isWordQuestion ? "聽一個圈詞，每格寫一個字的注音。" : "聽題目，在田字格寫下完整注音。"}</p><div className="listen-ready-summary"><span>播放 <strong>{listeningSettings.repeatCount} 次</strong></span><span>間隔 <strong>{listeningSettings.intervalSeconds} 秒</strong></span><span>作答 <strong>{questionDuration} 秒</strong></span></div><button type="button" className="listen-start-button" onClick={startListening}><span className="play-circle"><Play size={17} weight="fill" /></span><span><strong>開始聽</strong><small>按下後播放，並開始倒數</small></span><b><ArrowRight size={19} /></b></button></div> : renderListeningCanvas()}
        {audioError && <p className="audio-error" role="alert">音訊無法播放。請檢查音量或網路，再按「再聽一次」。</p>}
        {(listenPhase === "active" || listenPhase === "retry") && <button type="button" className="listen-replay-button" onClick={replayQuestion}><SpeakerHigh size={18} aria-hidden="true" /> 再聽一次</button>}
        {listenPhase === "active" && <button type="button" className="early-submit-button" onClick={() => finishListening(true)}>提早交卷</button>}
        {listenPhase === "review" && <div className="parent-review"><div className="answer-reveal"><span>正確答案</span><AnswerDisplay answer={currentQuestion.answer} literalSymbols={currentQuestion.category === "symbols"} /></div><p>{hasCompleteInk ? "請家長依照孩子的手寫內容判定。" : isWordQuestion ? `${wordLength} 格都寫完後，才可以判定答對；也可以選需要補強。` : "還沒有手寫內容；可以先按「需要補強」再練一次。"}</p><div className="review-actions"><button type="button" className="review-correct" disabled={!hasCompleteInk} onClick={() => handleParentDecision("correct")}>✓ 答對</button><button type="button" className="review-retry" onClick={() => handleParentDecision("needs_review")}>↻ 需要補強</button></div><button type="button" className={`review-save ${currentQuestionSaved ? "is-saved" : ""}`} aria-pressed={currentQuestionSaved} onClick={toggleCurrentQuestionSaved}>{currentQuestionSaved ? "★ 已收藏 · 取消收藏" : "☆ 收藏這題，之後再練"}</button></div>}
        {listenPhase === "remediation_offer" && <div className="remediation-offer"><strong>這題已加入待補強</strong><p>可以現在練，也可以先做下一題；稍後會留在「練習」。</p><div><button type="button" onClick={() => { setListenPhase("choice"); setRetryMessage(""); }}>現在補強</button><button type="button" onClick={deferRemediation}>稍後再練</button></div></div>}
        {listenPhase === "choice" && <div className={`choice-panel ${isWordQuestion ? "is-word" : ""}`}><div className="choice-options">{choiceAnswers.map((answer) => <button type="button" key={answer} onClick={() => selectRemediation(answer)}><AnswerDisplay answer={answer} literalSymbols={currentQuestion.category === "symbols"} /></button>)}</div><p>{retryMessage || (isWordQuestion ? "選出你剛剛聽到的完整語詞注音。" : "選出你剛剛聽到的完整音節。")}</p><button type="button" className="remediation-later" onClick={deferRemediation}>稍後再練這題</button></div>}
        {listenPhase === "retry_ready" && <button type="button" className="remediation-later" onClick={deferRemediation}>稍後再練這題</button>}
        {listenPhase === "retry" && <div className="retry-actions"><button type="button" className="retry-submit" disabled={!hasCompleteInk} onClick={submitRetryWriting}>我寫好了，請家長看看 <span>→</span></button><button type="button" className="remediation-later" onClick={deferRemediation}>稍後再練</button></div>}
      </div>
      {listenExitOpen && <div className="fill-dialog-backdrop"><div className="fill-dialog" role="alertdialog" aria-modal="true" aria-labelledby="listen-exit-title" aria-describedby="listen-exit-description"><span className="fill-dialog-icon" aria-hidden="true"><Headphones size={29} weight="duotone" /></span><h2 id="listen-exit-title">要先離開聽寫嗎？</h2><p id="listen-exit-description">倒數已暫停。繼續作答時可按「再聽一次」；離開後這一題的筆跡不會保留。</p><button className="fill-dialog-primary" type="button" autoFocus onClick={() => setListenExitOpen(false)}>繼續作答</button><button className="fill-dialog-secondary" type="button" onClick={confirmLeaveFocus}>離開本題</button></div></div>}
    </main>
    );
  };

  const renderMain = () => {
    switch (view) {
      case "courses": return renderCourses();
      case "practice": return renderPractice();
      case "more": return renderMore();
      case "lesson": return renderLesson();
      case "fill": return renderFillBlank();
      case "result": return renderResult();
      default: return renderCourses();
    }
  };

  if (isFocusMode) return renderFocusMode();
  if (view === "fill-practice") return renderFillPractice();
  if (view === "fill" && activeFillCell !== null) return <>{renderFillWriting()}{renderFillDialog()}</>;
  if (view === "fill" && fillReviewOpen) return <>{renderFillReview()}{renderFillDialog()}</>;

  return (
    <div className={`app-shell is-${view}`}>
      <audio ref={playbackRef} onEnded={() => { setPlayingSymbol(null); playbackEndedRef.current(); }} preload="none" hidden aria-hidden="true" />
      <AppHeader onCourses={() => navigate("courses")} onBack={view === "lesson" ? () => navigate("courses") : view === "fill" ? () => navigate("lesson") : undefined} backLabel={view === "fill" ? `回到第${lessonNumber}課` : "回到課程"} />
      <main className="main-content">{renderMain()}</main>
      <BottomNav active={view === "lesson" || view === "fill" || view === "result" ? "courses" : view} onNavigate={navigate} />
      {view === "fill" && renderFillDialog()}
    </div>
  );
}
