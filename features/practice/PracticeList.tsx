"use client";

import type { AppController } from "../usePracticeApp";
import { SectionHeading } from "../../components/AppChrome";
import { fillFavoriteKey, fillLocation } from "./practice-storage";
import { ArrowRight, Headphones, PencilLine, SpeakerHigh, Star } from "@phosphor-icons/react";
import { lessonNumerals, lessons } from "../courses/course-data";
import { findQuestionSeed, listenCategoryLabels } from "../listening/listening-data";

export function PracticeList({
  app,
}: {
  app: Pick<
    AppController,
    | "fillFavorites"
    | "openFillFavorite"
    | "openLesson"
    | "openSavedQuestion"
    | "practiceNotice"
    | "practiceState"
    | "removeFillFavorite"
    | "removeQuestion"
    | "speak"
    | "storageError"
  >;
}) {
  const {
    fillFavorites,
    openFillFavorite,
    openLesson,
    openSavedQuestion,
    practiceNotice,
    practiceState,
    removeFillFavorite,
    removeQuestion,
    speak,
    storageError,
  } = app;
  return (
    <section className="page-section practice-page">
      <SectionHeading
        eyebrow="YOUR PRACTICE"
        title="練習紀錄"
        description="收藏與待補強，隨時重練。"
      />
      {storageError && (
        <p className="practice-storage-error" role="alert">
          這個瀏覽器目前無法儲存收藏；關閉頁面後，紀錄可能會消失。
        </p>
      )}
      {practiceNotice && (
        <p className="practice-notice" role="status">
          {practiceNotice}
        </p>
      )}
      <div className="section-title-row">
        <h2>課文默寫 · 錯字收藏</h2>
        <span className="list-count">{fillFavorites.length} 個注音</span>
      </div>
      {fillFavorites.length ? (
        <div className="saved-question-list fill-favorite-list">
          {fillFavorites.map((favorite) => (
            <div className="saved-question fill-favorite" key={fillFavoriteKey(favorite)}>
              <span className="saved-question-icon">
                <PencilLine size={24} weight="duotone" aria-hidden="true" />
              </span>
              <div className="saved-question-copy">
                <strong>
                  第{lessonNumerals[favorite.lessonIndex]}課 · {lessons[favorite.lessonIndex].title}{" "}
                  · {favorite.character}
                </strong>
                <small>
                  {fillLocation(favorite.lessonIndex, favorite.positions[0])}
                  {favorite.positions.length > 1
                    ? ` 等 ${favorite.positions.length} 格`
                    : ""} · {favorite.status === "needs_rewrite" ? "待重寫" : "待複習"}
                </small>
              </div>
              <div className="saved-question-actions">
                <button
                  type="button"
                  className="saved-start"
                  onClick={() => openFillFavorite(favorite)}
                >
                  重練注音
                </button>
                <button
                  type="button"
                  className="saved-remove"
                  onClick={() => removeFillFavorite(favorite)}
                  aria-label={`取消收藏${favorite.character}`}
                  title="取消收藏"
                >
                  <Star size={19} weight="fill" aria-hidden="true" />
                  <span>取消收藏</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-reinforce">
          <span>
            <PencilLine size={28} weight="duotone" aria-hidden="true" />
          </span>
          <strong>目前沒有課文錯字收藏</strong>
          <small>家長檢查默寫時標記「需要重寫」，就會自動加入這裡。</small>
        </div>
      )}
      <div className="section-title-row practice-list-heading">
        <h2>聽寫 · 待補強與收藏</h2>
        <span className="list-count">
          {practiceState.savedQuestions.filter((item) => item.needsPractice).length} 題待補強
        </span>
      </div>
      {practiceState.savedQuestions.length ? (
        <div className="saved-question-list">
          {[...practiceState.savedQuestions]
            .sort((a, b) => Number(Boolean(b.needsPractice)) - Number(Boolean(a.needsPractice)))
            .map(({ lessonIndex, questionId, needsPractice }, savedIndex) => {
              const question = findQuestionSeed(lessonIndex, questionId);
              if (!question) return null;
              return (
                <div className="saved-question" key={`${lessonIndex}-${questionId}`}>
                  <span className="saved-question-icon">
                    <Headphones size={24} weight="duotone" aria-hidden="true" />
                  </span>
                  <div className="saved-question-copy">
                    <strong>
                      第{lessonNumerals[lessonIndex]}課 · {listenCategoryLabels[question.category]}
                    </strong>
                    <small>
                      {lessons[lessonIndex].title} · {needsPractice ? "待補強" : "已收藏"} · 題目{" "}
                      {savedIndex + 1}
                    </small>
                  </div>
                  <div className="saved-question-actions">
                    <button
                      type="button"
                      onClick={() => speak(question.audioText)}
                      aria-label={`播放第${lessonNumerals[lessonIndex]}課收藏題目 ${savedIndex + 1}`}
                    >
                      <SpeakerHigh size={18} aria-hidden="true" /> 播放
                    </button>
                    <button
                      type="button"
                      className="saved-start"
                      onClick={() => openSavedQuestion(lessonIndex, questionId)}
                    >
                      重練這題
                    </button>
                    <button
                      type="button"
                      className="saved-remove"
                      onClick={() => removeQuestion(lessonIndex, questionId)}
                      aria-label={`取消收藏第${lessonNumerals[lessonIndex]}課題目`}
                      title="取消收藏"
                    >
                      <Star size={19} weight="fill" aria-hidden="true" />
                      <span>取消收藏</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="empty-reinforce">
          <span>
            <Headphones size={28} weight="duotone" aria-hidden="true" />
          </span>
          <strong>目前沒有待補強或收藏題目</strong>
          <small>聽寫時按「需要補強」會先記下題目，之後可以再練。</small>
        </div>
      )}
      <div className="practice-list">
        <div className="section-title-row">
          <h2>最近練習</h2>
          <span className="list-count">
            {practiceState.recentLesson === null ? "0 個紀錄" : "1 個紀錄"}
          </span>
        </div>
        {practiceState.recentLesson === null ? (
          <p className="practice-no-recent">還沒有練習紀錄，先選一課開始吧。</p>
        ) : (
          <button
            className="practice-row"
            type="button"
            onClick={() => openLesson(practiceState.recentLesson!)}
          >
            <span className="practice-row-icon">
              {String(practiceState.recentLesson + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>
                第{lessonNumerals[practiceState.recentLesson]}課・
                {lessons[practiceState.recentLesson].title}
              </strong>
              <small>回到課程</small>
            </span>
            <span className="journey-arrow" aria-hidden="true">
              <ArrowRight size={21} weight="bold" />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
