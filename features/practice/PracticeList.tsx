"use client";

import type { AppController } from "../usePracticeApp";
import { SectionHeading } from "../../components/AppChrome";
import { fillFavoriteKey, fillLocation } from "./practice-storage";
import { ArrowRight, Headphones, PencilLine, SpeakerHigh, X } from "@phosphor-icons/react";
import { FavoriteButton } from "../../components/ReviewActions";
import { LessonLabel } from "../../components/LessonTitle";
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
    | "saveFillFavorite"
    | "removeQuestion"
    | "toggleSavedQuestion"
    | "unfavoriteUndo"
    | "unfavoriteFillUndo"
    | "undoFillUnfavorite"
    | "setUnfavoriteFillUndo"
    | "setUnfavoriteUndo"
    | "setPracticeNotice"
    | "undoUnfavorite"
    | "setView"
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
    saveFillFavorite,
    toggleSavedQuestion,
    unfavoriteUndo,
    unfavoriteFillUndo,
    undoFillUnfavorite,
    setUnfavoriteFillUndo,
    setUnfavoriteUndo,
    setPracticeNotice,
    undoUnfavorite,
    setView,
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
        <div className="practice-notice" role="status">
          <button
            type="button"
            className="notice-dismiss"
            aria-label="關閉提示"
            onClick={() => {
              setPracticeNotice("");
              setUnfavoriteUndo(null);
              setUnfavoriteFillUndo(null);
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <p>{practiceNotice}</p>
          {(unfavoriteUndo || unfavoriteFillUndo) && (
            <button
              type="button"
              onClick={unfavoriteFillUndo ? undoFillUnfavorite : undoUnfavorite}
            >
              復原取消收藏
            </button>
          )}
        </div>
      )}
      <div className="section-title-row">
        <h2>課文默寫 · 待補強與收藏</h2>
        <span className="list-count">
          {fillFavorites.filter((item) => item.status === "needs_rewrite").length} 題待補強
        </span>
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
                  <LessonLabel lessonIndex={favorite.lessonIndex} /> · {favorite.character}
                </strong>
                <small>
                  {fillLocation(favorite.lessonIndex, favorite.positions[0])}
                  {favorite.positions.length > 1
                    ? ` 等 ${favorite.positions.length} 格`
                    : ""} ·{" "}
                  {favorite.status === "needs_rewrite"
                    ? "待補強"
                    : favorite.status === "mastered"
                      ? "已掌握"
                      : "待複習"}
                  {favorite.isFavorite !== false ? " · 已收藏" : ""}
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
                <FavoriteButton
                  className="saved-remove"
                  saved={favorite.isFavorite !== false}
                  ariaLabel={`${favorite.isFavorite !== false ? "取消收藏" : "收藏"}${favorite.character}`}
                  label={favorite.isFavorite !== false ? "取消收藏" : "收藏這題"}
                  onToggle={() => {
                    if (favorite.isFavorite !== false) removeFillFavorite(favorite);
                    else saveFillFavorite(favorite);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-reinforce">
          <span>
            <PencilLine size={28} weight="duotone" aria-hidden="true" />
          </span>
          <strong>目前沒有默寫待補強或收藏題目</strong>
          <small>家長檢查時點黃色星星可收藏；重練時標記需要補強，會保留這題。</small>
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
            .map(({ lessonIndex, questionId, needsPractice, isFavorite }) => {
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
                      {lessons[lessonIndex].title} · {question.audioText} ·{" "}
                      {needsPractice ? "待補強" : "已收藏"}
                      {needsPractice && isFavorite ? " · 已收藏" : ""}
                    </small>
                  </div>
                  <div className="saved-question-actions">
                    <button
                      type="button"
                      onClick={() => speak(question.audioText)}
                      aria-label={`播放第${lessonNumerals[lessonIndex]}課 ${question.audioText}`}
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
                    <FavoriteButton
                      className="saved-remove"
                      saved={isFavorite}
                      onToggle={() => {
                        setUnfavoriteFillUndo(null);
                        toggleSavedQuestion(lessonIndex, questionId, isFavorite);
                      }}
                      ariaLabel={`${isFavorite ? "取消收藏" : "收藏"}第${lessonNumerals[lessonIndex]}課 ${question.audioText}`}
                      label={isFavorite ? "取消收藏" : "收藏這題"}
                    />
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
          <button type="button" className="secondary-button" onClick={() => setView("courses")}>
            前往課程
          </button>
        </div>
      )}
      <div className="practice-list">
        <div className="section-title-row">
          <h2>最近完成的練習</h2>
          <span className="list-count">{practiceState.history.length} 個紀錄</span>
        </div>
        {practiceState.history.length === 0 ? (
          <p className="practice-no-recent">完成家長檢查後，這裡會留下練習時間與成果。</p>
        ) : (
          practiceState.history.map((session) => (
            <button
              key={session.id}
              className="practice-row"
              type="button"
              onClick={() => openLesson(session.lessonIndex)}
            >
              <span className="practice-row-icon">
                {String(session.lessonIndex + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>
                  第{lessonNumerals[session.lessonIndex]}課・
                  {lessons[session.lessonIndex].title}
                </strong>
                <small>
                  {new Date(session.completedAt).toLocaleString("zh-TW", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}{" "}
                  ·{" "}
                  {session.mode === "fill"
                    ? "課文默寫"
                    : session.mode === "single"
                      ? "單題重練"
                      : "聽寫"}
                </small>
                <small>
                  已作答 {session.answeredUnits} 格 · 答對 {session.correctUnits} 格 · 待補強{" "}
                  {session.pendingQuestions} 題
                </small>
              </span>
              <span className="journey-arrow" aria-hidden="true">
                <ArrowRight size={21} weight="bold" />
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
