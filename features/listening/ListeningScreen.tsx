"use client";

import type { AppController } from "../usePracticeApp";
import { listenCategoryLabels } from "./listening-data";
import {
  Clock,
  Headphones,
  PencilLine,
  Play,
  SpeakerHigh,
  Star,
  Timer,
} from "@phosphor-icons/react";
import { courseArtwork } from "../courses/course-data";
import { AnswerDisplay } from "../../components/Zhuyin";
import { LoadingOverlay } from "../../components/AppChrome";
import { ListeningCanvas } from "./ListeningCanvas";

export function ListeningScreen({ app }: { app: AppController }) {
  const {
    audioError,
    audioLoading,
    confirmLeaveFocus,
    currentQuestion,
    currentQuestionSaved,
    deferRemediation,
    finishListening,
    finishPlayback,
    handleParentDecision,
    hasCompleteInk,
    isWordQuestion,
    leaveFocus,
    listenExitOpen,
    listenMessage,
    listenPhase,
    listeningSettings,
    loadingMessage,
    playCount,
    playbackRef,
    questionDuration,
    replayQuestion,
    retryMessage,
    secondsLeft,
    sectionProgress,
    sectionQuestionIndex,
    sectionQuestionCount,
    selectRemediation,
    selectedLesson,
    setListenExitOpen,
    setListenPhase,
    setRetryMessage,
    startListening,
    submitRetryWriting,
    toggleCurrentQuestionSaved,
    wordLength,
  } = app;

  const choiceAnswers = currentQuestion.choices;
  return (
    <main className={`focus-shell phase-${listenPhase}`}>
      <audio ref={playbackRef} onEnded={finishPlayback} preload="none" hidden aria-hidden="true" />
      {listenPhase === "ready" && (
        <button type="button" className="listen-ready-exit" onClick={leaveFocus}>
          離開
        </button>
      )}
      <header className="focus-topbar">
        <button type="button" className="focus-exit" onClick={leaveFocus}>
          ← <span>離開</span>
        </button>
        <div className="focus-question">
          <strong>{listenCategoryLabels[currentQuestion.category]}</strong>
          <small>{sectionProgress}</small>
        </div>
        <div className="focus-meta">
          <span
            className={
              secondsLeft <= 8 && (listenPhase === "active" || listenPhase === "retry")
                ? "urgent"
                : ""
            }
          >
            <Timer size={14} weight="bold" />{" "}
            {listenPhase === "retry_ready"
              ? "待重寫"
              : listenPhase === "review" || listenPhase === "choice"
                ? "已交卷"
                : `${String(Math.floor((listenPhase === "ready" ? questionDuration : secondsLeft) / 60)).padStart(2, "0")}:${String((listenPhase === "ready" ? questionDuration : secondsLeft) % 60).padStart(2, "0")}`}
          </span>
          <span aria-label={`已播放 ${playCount} 次`}>
            <SpeakerHigh size={14} weight="bold" /> {playCount} 次
          </span>
        </div>
      </header>
      <div className="focus-content">
        <p className="sr-only" aria-live="polite">
          {listenMessage}
        </p>
        {listenPhase === "ready" ? (
          <>
            <div
              className="listen-ready-progress"
              aria-label={`第 ${sectionQuestionIndex + 1} 小題，共 ${sectionQuestionCount} 題`}
            >
              <div className="listen-progress-dots" aria-hidden="true">
                {Array.from({ length: sectionQuestionCount }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index === sectionQuestionIndex
                        ? "is-active"
                        : index < sectionQuestionIndex
                          ? "is-done"
                          : ""
                    }
                  />
                ))}
              </div>
              <strong>
                第 {sectionQuestionIndex + 1} 小題 / {sectionQuestionCount}
              </strong>
            </div>
            <div className="listen-ready-card">
              <div className="listen-ready-context">
                <h1>準備聽寫</h1>
              </div>
              <p>
                {isWordQuestion
                  ? "聽一個圈詞，每格寫一個字的注音。"
                  : "聽題目，在田字格寫下完整注音。"}
              </p>
              <small className="listen-audio-note">播放後會留一小段空白，準備好就按下開始。</small>
              <div className="listen-ready-stage">
                <button
                  type="button"
                  className="listen-start-button"
                  onClick={startListening}
                  aria-label="開始聽"
                >
                  <span className="play-circle">
                    <Play size={42} weight="fill" aria-hidden="true" />
                  </span>
                  <strong>開始聽</strong>
                </button>
                <img
                  className="listen-ready-art"
                  src={
                    selectedLesson === 7
                      ? "/course-art/radish-story.webp"
                      : `/course-art/${courseArtwork[selectedLesson]}-watercolor.webp`
                  }
                  alt=""
                />
              </div>
              <div className="listen-ready-summary">
                <span>
                  <Headphones size={30} weight="duotone" aria-hidden="true" />
                  <small>播放</small>
                  <strong>{listeningSettings.repeatCount} 次</strong>
                </span>
                <span>
                  <Clock size={30} weight="duotone" aria-hidden="true" />
                  <small>間隔</small>
                  <strong>{listeningSettings.intervalSeconds} 秒</strong>
                </span>
                <span>
                  <PencilLine size={30} weight="duotone" aria-hidden="true" />
                  <small>作答</small>
                  <strong>{questionDuration} 秒</strong>
                </span>
              </div>
            </div>
          </>
        ) : (
          <ListeningCanvas app={app} />
        )}
        {audioError && (
          <p className="audio-error" role="alert">
            音訊無法播放。請檢查音量或網路，再按「再聽一次」。
          </p>
        )}
        {(listenPhase === "active" || listenPhase === "retry") && (
          <button type="button" className="listen-replay-button" onClick={replayQuestion}>
            <SpeakerHigh size={18} aria-hidden="true" /> 再聽一次
          </button>
        )}
        {listenPhase === "active" && (
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
                ? "請家長依照孩子的手寫內容判定。"
                : isWordQuestion
                  ? `${wordLength} 格都寫完後，才可以判定答對；也可以選需要補強。`
                  : "還沒有手寫內容；可以先按「需要補強」再練一次。"}
            </p>
            <div className="review-actions">
              <button
                type="button"
                className="review-correct"
                disabled={!hasCompleteInk}
                onClick={() => handleParentDecision("correct")}
              >
                ✓ 答對
              </button>
              <button
                type="button"
                className="review-retry"
                onClick={() => handleParentDecision("needs_review")}
              >
                ↻ 需要補強
              </button>
            </div>
            <button
              type="button"
              className={`review-save ${currentQuestionSaved ? "is-saved" : ""}`}
              aria-pressed={currentQuestionSaved}
              onClick={toggleCurrentQuestionSaved}
            >
              <Star
                size={17}
                weight={currentQuestionSaved ? "fill" : "regular"}
                aria-hidden="true"
              />
              {currentQuestionSaved ? "已收藏 · 取消收藏" : "收藏這題，之後再練"}
            </button>
          </div>
        )}
        {listenPhase === "remediation_offer" && (
          <div className="remediation-offer">
            <strong>這題已加入待補強</strong>
            <p>可以現在練，也可以先做下一題；稍後會留在「練習」。</p>
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
                (isWordQuestion ? "選出你剛剛聽到的完整語詞注音。" : "選出你剛剛聽到的完整音節。")}
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
              我寫好了，請家長看看 <span>→</span>
            </button>
            <button type="button" className="remediation-later" onClick={deferRemediation}>
              稍後再練
            </button>
          </div>
        )}
      </div>
      {(loadingMessage || audioLoading) && (
        <LoadingOverlay label={loadingMessage ?? "聲音準備中…"} />
      )}
      {listenExitOpen && (
        <div className="fill-dialog-backdrop">
          <div
            className="fill-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="listen-exit-title"
            aria-describedby="listen-exit-description"
          >
            <span className="fill-dialog-eyebrow">聽寫練習</span>
            <h2 id="listen-exit-title">要先離開聽寫嗎？</h2>
            <p id="listen-exit-description">
              倒數已暫停。繼續作答時可按「再聽一次」；離開後這一題的筆跡不會保留。
            </p>
            <button
              className="fill-dialog-primary"
              type="button"
              autoFocus
              onClick={() => setListenExitOpen(false)}
            >
              繼續作答
            </button>
            <button className="fill-dialog-secondary" type="button" onClick={confirmLeaveFocus}>
              離開本題
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
