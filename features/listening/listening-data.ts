import type {
  ListenCategory,
  ListeningQuestion,
  ListeningSeed,
  ListeningSettings,
  SyllableItem,
} from "../types";
import { exercises, firstListeningQuestions, lessons } from "../courses/course-data";
import { circledVocabulary } from "../courses/circled-vocabulary";

export const listeningSettingsStorageKey = "zhuyin-listening-settings-v1";

export const defaultListeningSettings: ListeningSettings = { repeatCount: 2, intervalSeconds: 8 };

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
  const filename = [...text].map((character) => character.codePointAt(0)!.toString(16)).join("-");
  // These 37 clips changed source in v44; the query bypasses older browser caches.
  return `/listening-audio/${filename}.m4a${/^[\u3105-\u3129]$/.test(text) ? "?v=44" : ""}`;
}

export function questionSeedsForLesson(
  lessonIndex: number,
): Record<ListenCategory, ListeningSeed[]> {
  const lesson = lessons[lessonIndex] ?? lessons[0];
  const terms = circledVocabulary[lessonIndex] ?? circledVocabulary[0];
  const symbols: ListeningSeed[] = lesson.symbols.map((symbol) => ({
    category: "symbols",
    answer: symbol,
    audioText: symbol,
    distractors: lesson.symbols.filter((other) => other !== symbol).slice(0, 2),
  }));
  const seenCharacters = new Map<string, SyllableItem>();
  for (const term of terms) {
    Array.from(term.text).forEach((character, index) => {
      if (!seenCharacters.has(character))
        seenCharacters.set(character, { character, zhuyin: term.syllables[index] });
    });
  }
  // Neutral-tone and sandhi readings need their surrounding word; do not ask
  // children to identify them from an isolated character recording.
  const uniqueCharacters = [...seenCharacters.values()].filter(
    (item) =>
      !item.zhuyin.startsWith("˙") &&
      !(item.character === "一" && item.zhuyin !== "ㄧ") &&
      !(item.character === "不" && item.zhuyin === "ㄅㄨˊ"),
  );
  const uniqueSounds = [...new Set(uniqueCharacters.map((item) => item.zhuyin))];
  const characters: ListeningSeed[] = uniqueCharacters.map((item) => ({
    category: "characters",
    answer: item.zhuyin,
    audioText: item.character,
    distractors: uniqueSounds.filter((sound) => sound !== item.zhuyin).slice(0, 2),
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

export function buildListeningSession(lessonIndex: number): ListeningQuestion[] {
  const pools = questionSeedsForLesson(lessonIndex);
  return [
    ...shuffleItems(pools.symbols).slice(0, 4),
    ...shuffleItems(pools.characters).slice(0, 4),
    ...shuffleItems(pools.words).slice(0, 2),
  ].map(makeQuestion);
}

export function findQuestionSeed(lessonIndex: number, id: string): ListeningSeed | undefined {
  const pools = questionSeedsForLesson(lessonIndex);
  const current = [...pools.symbols, ...pools.characters, ...pools.words].find(
    (question) => questionId(question) === id,
  );
  if (current) return current;
  // Previously saved questions remain available even when they are outside
  // the teacher's new exam range; they no longer appear in fresh sessions.
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
  symbols: "第一大題 · 注音符號",
  characters: "第二大題 · 生字",
  words: "第三大題 · 語詞",
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
