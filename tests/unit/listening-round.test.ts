import test from "node:test";
import assert from "node:assert/strict";
import { isListeningAnswerComplete } from "../../features/listening/listening-policy";
import { listeningSectionLabel } from "../../features/listening/listening-data";
import type { ListeningQuestion, InkStroke } from "../../features/types";
const stroke: InkStroke = [{ x: 10, y: 20 }];
test("batch review never accepts an empty or partially written word", () => {
  assert.equal(isListeningAnswerComplete("ㄅ", []), false);
  assert.equal(isListeningAnswerComplete("ㄅ", [[]]), false);
  assert.equal(isListeningAnswerComplete("ㄅ|ㄆ", [[stroke], []]), false);
  assert.equal(isListeningAnswerComplete("ㄅ|ㄆ", [[stroke], [stroke]]), true);
});
test("section numbers follow the actual question categories without skipping", () => {
  const questions = [{ category: "symbols" }, { category: "words" }] as ListeningQuestion[];
  assert.equal(listeningSectionLabel(questions, 1), "第二大題 · 語詞");
  assert.equal(
    listeningSectionLabel([{ category: "words" }] as ListeningQuestion[], 0),
    "第一大題 · 語詞",
  );
});
