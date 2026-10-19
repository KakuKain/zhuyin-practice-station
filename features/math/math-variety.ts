import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";

/**
 * Rounds that do not repeat themselves (the parent asked for both): the kinds of question come in
 * a different order each time, and the numbers and pictures avoid what the last round of the
 * same lesson showed.
 */

/** How many rounds to build before keeping the one least like the last. */
export const roundCandidates = 400;

const numberFields = new Set(["target", "parts", "numbers", "counts", "place", "count"]);
const pictureFields = new Set(["icon", "icons", "thing", "picture", "color", "colors"]);

/**
 * What a child would notice repeating: each question's numbers together, with its kind (「7 分成
 * 3 和幾」 again, or 數一數 3 again), and each main picture, colour or thing. A row of six
 * different pictures for 排在第幾個 and the colours of 找圖形's shapes are only there to choose
 * from, so they do not count.
 */
export function roundTraits(questions: readonly { kind: string }[]): string[] {
  const traits = new Set<string>();
  for (const question of questions) {
    const numbers: number[] = [];
    const visit = (value: unknown, field: string) => {
      if (Array.isArray(value)) {
        if (field !== "icons" || value.length <= 2) value.forEach((item) => visit(item, field));
      } else if (value && typeof value === "object") {
        if (field !== "pieces") for (const [key, child] of Object.entries(value)) visit(child, key);
      } else if (typeof value === "number" && numberFields.has(field)) numbers.push(value);
      else if (pictureFields.has(field) || (typeof value === "string" && field === "target"))
        traits.add(`${field === "color" || field === "colors" ? "color" : "picture"}:${value}`);
    };
    visit(question, "");
    if (numbers.length) traits.add(`${question.kind}:${numbers.join(",")}`);
  }
  return [...traits];
}

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * The same questions in another order. A question that refers to the one before it (「點第三個」
 * after 「點三個」) stays right after it.
 */
export function mixOrder<Question extends { kind: string }>(
  questions: readonly Question[],
  random = Math.random,
  follows: (question: Question) => boolean = (question) => question.kind === "nth",
): Question[] {
  const blocks: Question[][] = [];
  for (const question of questions)
    if (blocks.length && follows(question)) blocks[blocks.length - 1].push(question);
    else blocks.push([question]);
  return shuffle(blocks, random).flat();
}

/** Of several rounds, the one sharing the fewest traits with the last round, in a new order. */
export function variedRound<Question extends { kind: string }>(
  build: () => Question[],
  last: readonly string[],
  random = Math.random,
): Question[] {
  const seen = new Set(last);
  let best: Question[] = build();
  let bestShared = Infinity;
  for (let attempt = 0; attempt < roundCandidates; attempt++) {
    const round = attempt ? build() : best;
    const shared = roundTraits(round).filter((trait) => seen.has(trait)).length;
    if (shared < bestShared) [best, bestShared] = [round, shared];
    if (!shared) break;
  }
  return mixOrder(best, random);
}

type RecentRounds = Record<string, string[]>;

function readRecent(): RecentRounds {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(childKey(storageKeys.mathRecent)) ?? "{}",
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every((trait) => typeof trait === "string"),
      ),
    );
  } catch {
    return {};
  }
}

/**
 * A new round for this child, unlike the last one of the same lesson, and remembered so the next
 * one is unlike it in turn.
 */
export function newVariedRound<Question extends { kind: string }>(
  lessonId: number,
  build: () => Question[],
): Question[] {
  const recent = readRecent();
  const round = variedRound(build, recent[lessonId] ?? []);
  try {
    window.localStorage.setItem(
      childKey(storageKeys.mathRecent),
      JSON.stringify({ ...recent, [lessonId]: roundTraits(round) }),
    );
  } catch {
    // Only variety is lost: the next round may repeat this one.
  }
  return round;
}
