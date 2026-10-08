import { isListeningAnswerComplete } from "./listening-policy";
import type { AppController } from "../usePracticeApp";
import { InkPreview } from "../../components/AppChrome";
import { AnswerDisplay } from "../../components/Zhuyin";
import { FavoriteButton } from "../../components/ReviewActions";
import { listeningSectionLabel } from "./listening-data";

export function ListeningBatchReview({ app }: { app: AppController }) {
  return (
    <section className="listening-batch-review">
      <h1>整輪檢查</h1>
      <p>對照答案，標記需要補強的題目。</p>
      {app.listeningQuestions.map((question, index) => {
        const cells = app.listeningDrafts[index] ?? [];
        const complete = isListeningAnswerComplete(question.answer, cells);
        const pending = !complete || app.batchNeedsReview.includes(index);
        const saved = app.practiceState.savedQuestions.some(
          (item) =>
            item.lessonIndex === app.selectedLesson &&
            item.questionId === question.id &&
            item.isFavorite,
        );
        return (
          <article className="listening-review-card" key={question.id}>
            <h2>
              第 {index + 1} 題 · {listeningSectionLabel(app.listeningQuestions, index)}
            </h2>
            <div className="listening-review-comparison">
              <div className="listening-review-column">
                <span className="listening-review-label">作答</span>
                {question.answer.split("|").map((_, cellIndex) => (
                  <div
                    className="listening-review-cell"
                    key={cellIndex}
                    aria-label={`第 ${cellIndex + 1} 字作答`}
                  >
                    {cells[cellIndex]?.length ? (
                      <InkPreview strokes={cells[cellIndex]} />
                    ) : (
                      <span>未作答</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="listening-review-column">
                <span className="listening-review-label">答案</span>
                {question.answer.split("|").map((syllable, cellIndex) => (
                  <div className="listening-review-cell listening-answer-cell" key={cellIndex}>
                    <AnswerDisplay
                      answer={syllable}
                      literalSymbols={question.category === "symbols"}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="listening-review-controls">
              <button
                type="button"
                aria-pressed={pending}
                disabled={!complete}
                onClick={() => app.toggleBatchNeedsReview(index)}
              >
                {pending ? "✓ 需要補強" : "需要補強"}
              </button>
              <button
                type="button"
                onClick={() => app.speak(question.audioText, { pronunciation: question.answer })}
              >
                重聽
              </button>
              <button type="button" onClick={() => app.goToListeningQuestion(index)}>
                修改作答
              </button>
              <FavoriteButton
                saved={saved}
                onToggle={() => app.toggleBatchFavorite(question.id)}
                iconOnly
                ariaLabel={`收藏第 ${index + 1} 題`}
              />
            </div>
          </article>
        );
      })}
      <button className="listening-review-finish" type="button" onClick={app.finishBatchReview}>
        完成檢查
      </button>
    </section>
  );
}
