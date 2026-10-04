import type { ListenCategory, ListeningQuestion, ListeningSeed, ListeningSettings } from "../types";
import { exercises, firstListeningQuestions } from "../courses/course-data";
import { legacyCircledVocabulary } from "../courses/legacy-circled-vocabulary";
import type { CircledTerm } from "../courses/circled-vocabulary";
import { builtinCatalog, type CatalogLesson } from "../courses/materials";
import { combinedRhymeExample } from "../symbols/combined-rhyme-audio";

export const listeningSettingsStorageKey = "zhuyin-listening-settings-v1";

export const defaultListeningSettings: ListeningSettings = {
  repeatCount: 2,
  intervalSeconds: 8,
  answerTime: "standard",
};

export const audioPlaybackRate = 0.76;

export const zhuyinPlaybackRate = 1;

export const audioTailDelayMs = 650;

export const extraWordQuestions: Record<number, readonly ListeningSeed[]> = {
  0: [
    {
      category: "words",
      answer: "ㄉㄧˋ|ㄧ",
      audioText: "第一",
      distractors: ["ㄉㄧˋ|ㄇㄧ", "ㄆㄠˇ|ㄧ"],
    },
  ],
  1: [
    {
      category: "words",
      answer: "ㄉㄜˊ|ㄧˋ",
      audioText: "得意",
      distractors: ["ㄉㄜˊ|ㄜˊ", "ㄈㄨ|ㄧˋ"],
    },
  ],
  2: [
    {
      category: "words",
      answer: "ㄆㄠˋ|ㄗㄠˇ",
      audioText: "泡澡",
      distractors: ["ㄆㄠˊ|ㄗㄠˇ", "ㄆㄠˋ|ㄗㄠˋ"],
    },
    {
      category: "words",
      answer: "ㄅㄢˋ|ㄌㄨˋ",
      audioText: "半路",
      distractors: ["ㄅㄢˋ|ㄌㄧˊ", "ㄏㄜˊ|ㄌㄨˋ"],
    },
    {
      category: "words",
      answer: "ㄩˋ|ㄉㄠˋ",
      audioText: "遇到",
      distractors: ["ㄩˋ|ㄗㄠˇ", "ㄑㄩˋ|ㄉㄠˋ"],
    },
    {
      category: "words",
      answer: "ㄓㄨˊ|ㄔㄠˊ",
      audioText: "築巢",
      distractors: ["ㄓㄨˊ|ㄗㄠˇ", "ㄔㄠˊ|ㄓㄨˊ"],
    },
  ],
  3: [
    {
      category: "words",
      answer: "ㄅㄟ|˙ㄓㄜ",
      audioText: "背著",
      distractors: ["ㄅㄟˋ|˙ㄓㄜ", "ㄅㄟ|ㄕㄨ"],
    },
    {
      category: "words",
      answer: "ㄌㄚ|ㄕㄡˇ",
      audioText: "拉手",
      distractors: ["ㄌㄚ|ㄕㄨ", "ㄕㄡˇ|ㄌㄚ"],
    },
  ],
};

export function shuffleItems<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function questionId(question: ListeningSeed): string {
  return `${question.category}:${question.audioText}`;
}

export function listeningAudioUrl(text: string): string {
  const example = combinedRhymeExample(text);
  if (example) return example.audioUrl;
  return dictationAudioUrl(text);
}

// Exam playback uses reading-only clips, never dictionary attribute narration.
export function dictationAudioUrl(text: string): string {
  const filename = [...text].map((character) => character.codePointAt(0)!.toString(16)).join("-");
  // These 37 clips changed source in v44; the query bypasses older browser caches.
  return `/listening-audio/${filename}.m4a${/^[\u3105-\u3129]$/.test(text) ? "?v=44" : ""}`;
}

export function questionSeedsForLesson(
  lessonIndex: number,
  catalog: readonly CatalogLesson[] = builtinCatalog,
): Record<ListenCategory, ListeningSeed[]> {
  const lesson = catalog.find((item) => item.index === lessonIndex);
  if (!lesson) return { symbols: [], characters: [], words: [] };
  const terms = lesson.terms;
  const symbols: ListeningSeed[] = lesson.symbols.map((symbol) => ({
    category: "symbols",
    answer: symbol,
    audioText: symbol,
    distractors: lesson.symbols.filter((other) => other !== symbol).slice(0, 2),
  }));
  // Exam prompts stay intact: only explicitly listed single characters become
  // character questions; whole words and sentences are never split.
  const singleTerms = terms.filter((term) => term.syllables.length === 1);
  const uniqueSounds = [...new Set(singleTerms.map((term) => term.syllables[0]))];
  const characters: ListeningSeed[] = singleTerms.map((term) => ({
    category: "characters",
    answer: term.syllables[0],
    audioText: term.text,
    distractors: uniqueSounds.filter((sound) => sound !== term.syllables[0]).slice(0, 2),
  }));
  const wordSounds = [...new Set(terms.flatMap((term) => term.syllables))];
  const words: ListeningSeed[] = terms
    .filter((term) => term.syllables.length > 1)
    .map((term) => {
      const answer = [...term.syllables];
      const alternative = (original: string) =>
        wordSounds.find((sound) => sound !== original) ?? original;
      return {
        category: "words",
        audioText: term.text,
        answer: answer.join("|"),
        distractors: [
          [alternative(answer[0]), ...answer.slice(1)].join("|"),
          [...answer.slice(0, -1), alternative(answer[answer.length - 1])].join("|"),
        ],
      };
    });
  return { symbols, characters, words };
}

export function makeQuestion(seed: ListeningSeed): ListeningQuestion {
  return {
    ...seed,
    id: questionId(seed),
    choices: shuffleItems([seed.answer, ...seed.distractors]),
  };
}

export function customListeningSeed(term: CircledTerm): ListeningSeed {
  const first = term.syllables[0];
  const base = first.replace(/[˙ˊˇˋ]/g, "");
  const alternatives = [base, `${base}ˊ`, `${base}ˇ`, `${base}ˋ`, `˙${base}`]
    .filter((reading) => reading !== first)
    .slice(0, 2);
  return {
    category: term.syllables.length > 1 ? "words" : "characters",
    audioText: term.text,
    answer: term.syllables.join("|"),
    distractors: alternatives.map((reading) => [reading, ...term.syllables.slice(1)].join("|")),
  };
}

export function buildListeningSession(
  lessonIndex: number,
  catalog: readonly CatalogLesson[] = builtinCatalog,
): ListeningQuestion[] {
  const lesson = catalog.find((item) => item.index === lessonIndex);
  if (!lesson) return [];
  const seeds = lesson.terms.map(customListeningSeed);
  const symbols =
    lesson.custom || lesson.listeningOnly
      ? []
      : shuffleItems(questionSeedsForLesson(lessonIndex, catalog).symbols).slice(0, 4);
  return [
    ...symbols,
    ...shuffleItems(seeds.filter((seed) => seed.category === "characters")),
    ...shuffleItems(seeds.filter((seed) => seed.category === "words")),
  ].map(makeQuestion);
}

export function findQuestionSeed(
  lessonIndex: number,
  id: string,
  catalog: readonly CatalogLesson[] = builtinCatalog,
): ListeningSeed | undefined {
  const lesson = catalog.find((item) => item.index === lessonIndex);
  if (lesson) {
    const term = lesson.terms.find(
      (term) => id === `${term.syllables.length > 1 ? "words" : "characters"}:${term.text}`,
    );
    if (term) return customListeningSeed(term);
    if (lesson.custom || lesson.listeningOnly) return undefined;
  }
  const pools = questionSeedsForLesson(lessonIndex, catalog);
  const current = [...pools.symbols, ...pools.characters, ...pools.words].find(
    (question) => questionId(question) === id,
  );
  if (current) return current;
  // Previously saved questions remain available even when they are outside
  // the teacher's new exam range; they no longer appear in fresh sessions.
  const legacyTerm = legacyCircledVocabulary[lessonIndex]?.find(
    (term) => id === `${term.syllables.length > 1 ? "words" : "characters"}:${term.text}`,
  );
  if (legacyTerm) return customListeningSeed(legacyTerm);
  const exercise = exercises[lessonIndex];
  if (!exercise) return undefined;
  const legacyCharacter = exercise.lines
    .flat()
    .find((item) => id === `characters:${item.character}`);
  if (legacyCharacter) {
    const sounds = [...new Set(exercise.lines.flat().map((item) => item.zhuyin))];
    return {
      category: "characters",
      audioText: legacyCharacter.character,
      answer: legacyCharacter.zhuyin,
      distractors: sounds.filter((sound) => sound !== legacyCharacter.zhuyin).slice(0, 2),
    };
  }
  return [...exercise.questions, ...(extraWordQuestions[lessonIndex] ?? [])].find(
    (question) => questionId(question) === id,
  );
}

export const fallbackListeningQuestion: ListeningQuestion = {
  ...firstListeningQuestions[0],
  id: "symbols:ㄅ",
  choices: ["ㄅ", "ㄆ", "ㄇ"],
};

export const listenCategoryLabels: Record<ListenCategory, string> = {
  symbols: "注音符號",
  characters: "生字",
  words: "語詞",
};

export function sectionPosition(questions: readonly ListeningQuestion[], index: number) {
  const category = questions[index]?.category;
  return {
    index: Math.max(
      0,
      questions.slice(0, index).filter((question) => question.category === category).length,
    ),
    total: Math.max(1, questions.filter((question) => question.category === category).length),
  };
}

export const legacySavedQuestionIndexes: Record<number, readonly number[]> = {
  0: [4, 5, 7],
  2: [4, 5, 6],
};

export function listeningSectionLabel(questions: readonly ListeningQuestion[], index: number) {
  const category = questions[index]?.category;
  if (!category) return "聽寫";
  const categories = [...new Set(questions.map((question) => question.category))];
  const ordinal = ["一", "二", "三"][categories.indexOf(category)];
  return `第${ordinal}大題 · ${listenCategoryLabels[category]}`;
}
