import assert from "node:assert/strict";
import test from "node:test";
import {
  answeredQuestions,
  resumeOnStartMs,
  validateListeningRound,
} from "../../features/listening/listening-round-storage";
import { buildListeningSession } from "../../features/listening/listening-data";
import { ownsStorageKey, storageKeys } from "../../lib/storage/storage-keys";

const questions = buildListeningSession(4);
const round = () => ({
  version: 1,
  lessonIndex: 4,
  savedAt: 1,
  questions,
  index: 2,
  phase: "active",
  drafts: { 0: [[[{ x: 10, y: 10, width: 2 }]]], 1: [[]] },
  batchNeedsReview: [1, 99],
});

test("an unfinished round survives a reload with its order, position and answers", () => {
  const saved = validateListeningRound(JSON.parse(JSON.stringify(round())))!;
  assert.deepEqual(saved.questions, questions);
  assert.equal(saved.index, 2);
  assert.deepEqual(saved.batchNeedsReview, [1]);
  assert.equal(answeredQuestions(saved), 1);
  assert.ok(ownsStorageKey(storageKeys.listeningRound), "device backup keeps it");
  assert.ok(resumeOnStartMs >= 60 * 60 * 1000);
});

test("damaged or foreign rounds are ignored instead of opening a broken screen", () => {
  for (const patch of [
    { version: 2 },
    { index: questions.length },
    { phase: "review" },
    { questions: [] },
    { drafts: { 0: [[[{ x: 200, y: 0 }]]] } },
    { drafts: { [questions.length]: [] } },
  ])
    assert.equal(validateListeningRound({ ...round(), ...patch }), null, JSON.stringify(patch));
});
