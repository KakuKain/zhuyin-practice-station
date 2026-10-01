"use client";

import type { AppController } from "../usePracticeApp";
import { listenCategoryLabels } from "./listening-data";
import { Clock, Headphones, PencilLine, SpeakerHigh, Timer } from "@phosphor-icons/react";
import { FavoriteButton, ReviewActions } from "../../components/ReviewActions";
import { courseArtwork } from "../courses/course-data";
import { FocusHeader } from "../../components/FocusHeader";
import { listeningPhaseLabel } from "./listening-policy";
import { AnswerDisplay } from "../../components/Zhuyin";
import { LoadingOverlay, ResourceNotice } from "../../components/AppChrome";
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
    resourceError,
    playCount,
    playbackRef,
    questionDuration,
    replayQuestion,
    retryMessage,
    secondsLeft,
    sectionProgress,
    sectionQuestionIndex,
    sectionQuestionCount,
    singleQuestionPractice,
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
      <FocusHeader
        onBack={leaveFocus}
        backLabel={singleQuestionPractice ? "回到練習" : "回到課文預覽"}
        lessonIndex={selectedLesson}
        stage={`${listenCategoryLabels[currentQuestion.category]} · ${listeningPhaseLabel(listenPhase)}`}
        progress={sectionProgress}
        heading={listenPhase !== "ready"}
        status={
          listenPhase !== "ready" ? (
            <>
              <span
                className={
                  secondsLeft <= 8 && (listenPhase === "active" || listenPhase === "retry")
                    ? "urgent"
                    : ""
                }
              >
                <Timer size={14} weight="bold" />{" "}
                {listenPhase === "active" || listenPhase === "retry"
                  ? `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : listeningPhaseLabel(listenPhase)}
              </span>
              <span aria-label={`已播放 ${playCount} 次`}>
                <SpeakerHigh size={14} weight="bold" /> {playCount} 次
              </span>
            </>
          ) : undefined
        }
      />
      <div className="focus-content">
        <ResourceNotice failed={resourceError} />
        <p className="sr-only" aria-live="polite">
          {listenMessage}
        </p>
        {listenPhase === "ready" ? (
          <>
            <div
              className="listen-ready-progress"
              aria-label={`第 ${sectionQuestionIndex + 1} 小題，共 ${sectionQuestionCount} 題`}
            >
              <div
                className={`listen-progress-dots ${sectionQuestionCount === 1 ? "is-single" : ""}`}
                style={{ "--question-count": sectionQuestionCount } as React.CSSProperties}
                aria-hidden="true"
              >
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
              <strong>{sectionProgress}</strong>
            </div>
            <div className="listen-ready-card">
              <div className="listen-ready-context">
                <span className="listen-ready-category">
                  {listenCategoryLabels[currentQuestion.category]}
                </span>
                <h1>準備聽寫</h1>
              </div>
              <p>
                {isWordQuestion
                  ? "聽一個語詞，每格寫一個字的注音。"
                  : currentQuestion.category === "symbols"
                    ? "聽題目，在田字格寫下聽到的注音符號。"
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
                  <img
                    className="listen-start-art"
                    src="/course-art/listening-play-button-watercolor-v1.webp"
                    width={640}
                    height={640}
                    alt=""
                    draggable={false}
                    fetchPriority="high"
                  />
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
              {listenPhase === "active" || listenPhase === "retry" ? "倒數已暫停。" : ""}
              離開後，這一輪未完成的進度與筆跡不會保留；已收藏與待補強的題目仍會留下。
            </p>
            <button
              className="fill-dialog-primary"
              type="button"
              autoFocus
              onClick={() => setListenExitOpen(false)}
            >
              繼續練習
            </button>
            <button className="fill-dialog-secondary" type="button" onClick={confirmLeaveFocus}>
              結束本輪
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
