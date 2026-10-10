import { ProgressiveImage } from "../../components/ProgressiveImage";

import { ShowMsg } from "../../components/ShowMsg";

import type { AppController } from "../usePracticeApp";
import { listenCategoryLabels, listeningSectionLabel } from "./listening-data";
import { ArrowLeft, SpeakerHigh } from "@phosphor-icons/react";
import { FavoriteButton, ReviewActions } from "../../components/ReviewActions";
import { useCatalogLesson } from "../courses/MaterialContext";
import { AnswerDisplay } from "../../components/Zhuyin";
import { AppHeader, LoadingOverlay, ResourceNotice } from "../../components/AppChrome";
import { ListeningBatchReview } from "./ListeningBatchReview";
import { ListeningCanvas } from "./ListeningCanvas";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { answeredQuestions } from "./listening-round-storage";

export function ListeningScreen({ app }: { app: AppController }) {
  const {
    audioError,
    audioLoading,
    confirmLeaveFocus,
    currentQuestion,
    currentQuestionSaved,
    deferRemediation,
    finishListening,
    handleParentDecision,
    hasCompleteInk,
    isWordQuestion,
    leaveFocus,
    listenExitOpen,
    listenMessage,
    listenPhase,
    listeningSettings,
    loadingMessage,
    resourceError,
    replayQuestion,
    retryMessage,
    secondsLeft,
    listeningQuestions,
    sectionQuestionIndex,
    sectionQuestionCount,
    singleQuestionPractice,
    selectRemediation,
    setListenExitOpen,
    setListenPhase,
    setRetryMessage,
    startListening,
    submitRetryWriting,
    toggleCurrentQuestionSaved,
    wordLength,
  } = app;

  const choiceAnswers = currentQuestion.choices;
  const catalogLesson = useCatalogLesson(app.selectedLesson);
  return (
    <main className={`focus-shell phase-${listenPhase}`}>
      {listenPhase === "ready" || listenPhase === "batch_review" ? (
        <AppHeader onCourses={leaveFocus} onBack={leaveFocus} backLabel="返回" />
      ) : (
        <header className="listening-focus-header">
          <button type="button" className="listening-header-back" onClick={leaveFocus}>
            <ArrowLeft size={20} aria-hidden="true" />
            <span>返回</span>
          </button>
          <h1 tabIndex={-1}>
            <span>
              {singleQuestionPractice ? "單題重練" : "聽寫"} ·{" "}
              {listenCategoryLabels[currentQuestion.category]}
            </span>
            <small>
              {singleQuestionPractice
                ? ""
                : `${app.listenIndex + 1} / ${listeningQuestions.length} 題`}
              {isWordQuestion ? `${singleQuestionPractice ? "" : " · "}${wordLength} 字` : ""}
              {singleQuestionPractice && (listenPhase === "active" || listenPhase === "retry")
                ? ` ${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`
                : ""}
            </small>
          </h1>
          {(listenPhase === "active" || listenPhase === "retry") && (
            <button type="button" className="listening-header-replay" onClick={replayQuestion}>
              <SpeakerHigh size={20} aria-hidden="true" />
              再聽一次
            </button>
          )}
        </header>
      )}
      <div className="focus-content">
        <ResourceNotice failed={resourceError} />
        <p className="visually-hidden" aria-live="polite">
          {listenMessage}
        </p>
        {listenPhase === "ready" ? (
          <>
            <div className="listen-ready-progress">
              <span>
                {catalogLesson.listeningOnly
                  ? catalogLesson.title
                  : `第${catalogLesson.number}課 · ${catalogLesson.title}`}
              </span>
              <strong
                aria-label={`第 ${sectionQuestionIndex + 1} 題，共 ${sectionQuestionCount} 題`}
              >
                第 {sectionQuestionIndex + 1} 題 / {sectionQuestionCount}
              </strong>
            </div>
            <div className="listen-ready-card">
              <div className="listen-ready-context">
                <span className="listen-ready-category">
                  {singleQuestionPractice
                    ? "單題重練"
                    : listeningSectionLabel(listeningQuestions, app.listenIndex)}
                </span>
                <h1>聽一聽，寫注音</h1>
              </div>
              <div className="listen-ready-stage">
                <button
                  type="button"
                  className="listen-start-button"
                  onClick={startListening}
                  aria-label="開始聽"
                >
                  <ProgressiveImage
                    className="listen-start-art"
                    src="course-art/listening-play-button-watercolor-v1.webp"
                    width={640}
                    height={640}
                    alt=""
                    draggable={false}
                    fetchPriority="high"
                  />
                </button>
                {!catalogLesson.custom && (
                  <ProgressiveImage
                    className="listen-ready-art"
                    src={
                      catalogLesson.listeningOnly
                        ? "course-art/review-sleeping-cat-watercolor-v2.webp"
                        : app.selectedLesson === 7
                          ? "course-art/radish-story.webp"
                          : catalogLesson.artwork
                            ? `course-art/${catalogLesson.artwork}-watercolor.webp`
                            : "course-art/lesson-watercolor-paper.webp"
                    }
                    alt=""
                  />
                )}
              </div>
              <p className="listen-ready-summary">
                播放 {listeningSettings.repeatCount} 次 · 間隔 {listeningSettings.intervalSeconds}{" "}
                秒
              </p>
            </div>
          </>
        ) : listenPhase === "batch_review" ? (
          <ListeningBatchReview app={app} />
        ) : (
          <ListeningCanvas key={currentQuestion.id} app={app} />
        )}
        {audioError && (
          <ShowMsg error message="音訊無法播放。請檢查音量或網路，再按「再聽一次」。" />
        )}
        {listenPhase === "active" && !singleQuestionPractice && (
          <div className="listening-navigation">
            <button
              type="button"
              disabled={app.listenIndex === 0}
              onClick={() => app.goToListeningQuestion(app.listenIndex - 1)}
            >
              上一題
            </button>
            <button type="button" onClick={app.nextListeningAnswer}>
              {app.listenIndex === listeningQuestions.length - 1 ? "全部寫完，開始檢查" : "下一題"}
            </button>
            <button type="button" onClick={app.openBatchReview}>
              結束作答並檢查
            </button>
          </div>
        )}
        {listenPhase === "active" && singleQuestionPractice && (
          <button
            type="button"
            className="early-submit-button"
            onClick={() => finishListening(true)}
          >
            提早交卷
          </button>
        )}
        {listenPhase === "review" && (
          <div className="parent-review">
            <div className="answer-reveal">
              <span>正確答案</span>
              <AnswerDisplay
                answer={currentQuestion.answer}
                literalSymbols={currentQuestion.category === "symbols"}
              />
            </div>
            <p>
              {hasCompleteInk
                ? "請家長檢查。"
                : isWordQuestion
                  ? `${wordLength} 格尚未全部完成。`
                  : "尚未作答。"}
            </p>
            <ReviewActions
              correctDisabled={!hasCompleteInk}
              onCorrect={() => handleParentDecision("correct")}
              onRetry={() => handleParentDecision("needs_review")}
            />
            <FavoriteButton saved={currentQuestionSaved} onToggle={toggleCurrentQuestionSaved} />
          </div>
        )}
        {listenPhase === "remediation_offer" && (
          <div className="remediation-offer">
            <strong>這題已加入待補強</strong>

            <div>
              <button
                type="button"
                onClick={() => {
                  setListenPhase("choice");
                  setRetryMessage("");
                }}
              >
                現在補強
              </button>
              <button type="button" onClick={deferRemediation}>
                稍後再練
              </button>
            </div>
          </div>
        )}
        {listenPhase === "choice" && (
          <div className={`choice-panel ${isWordQuestion ? "is-word" : ""}`}>
            <div className="choice-options">
              {choiceAnswers.map((answer) => (
                <button type="button" key={answer} onClick={() => selectRemediation(answer)}>
                  <AnswerDisplay
                    answer={answer}
                    literalSymbols={currentQuestion.category === "symbols"}
                  />
                </button>
              ))}
            </div>
            <p>
              {retryMessage ||
                (isWordQuestion
                  ? "選出你剛剛聽到的完整語詞注音。"
                  : currentQuestion.category === "symbols"
                    ? "選出你剛剛聽到的注音符號。"
                    : "選出你剛剛聽到的完整音節。")}
            </p>
            <button type="button" className="remediation-later" onClick={deferRemediation}>
              稍後再練這題
            </button>
          </div>
        )}
        {listenPhase === "retry_ready" && (
          <button type="button" className="remediation-later" onClick={deferRemediation}>
            稍後再練這題
          </button>
        )}
        {listenPhase === "retry" && (
          <div className="retry-actions">
            <button
              type="button"
              className="retry-submit"
              disabled={!hasCompleteInk}
              onClick={submitRetryWriting}
            >
              寫好了 <span>→</span>
            </button>
            <button type="button" className="remediation-later" onClick={deferRemediation}>
              稍後再練
            </button>
          </div>
        )}
      </div>
      {/* A replay or a cached clip starts at once: no flash, and the child keeps writing. */}
      {(loadingMessage || audioLoading) && (
        <LoadingOverlay label={loadingMessage ?? "聲音準備中…"} delayed={!loadingMessage} />
      )}
      {app.resumeRound && (
        <ConfirmDialog
          id="listen-resume"
          eyebrow="上次的聽寫"
          title="要繼續上次的聽寫嗎？"
          primaryLabel="繼續聽寫"
          onPrimary={app.continueSavedRound}
          secondaryLabel="重新開始"
          onSecondary={app.discardSavedRound}
        >
          上次寫到第 {app.resumeRound.index + 1} 題，已寫 {answeredQuestions(app.resumeRound)} /{" "}
          {app.resumeRound.questions.length} 題。重新開始會清除這些筆跡。
        </ConfirmDialog>
      )}
      {listenExitOpen && (
        <ConfirmDialog
          id="listen-exit"
          eyebrow="聽寫練習"
          title="要先離開聽寫嗎？"
          primaryLabel="繼續練習"
          onPrimary={() => setListenExitOpen(false)}
          secondaryLabel="結束本輪"
          onSecondary={confirmLeaveFocus}
        >
          {singleQuestionPractice && (listenPhase === "active" || listenPhase === "retry")
            ? "倒數已暫停。"
            : ""}
          離開後，這一輪未完成的進度與筆跡不會保留；已收藏與待補強的題目仍會留下。
        </ConfirmDialog>
      )}
    </main>
  );
}
